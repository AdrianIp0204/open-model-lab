import { NextResponse } from "next/server";
import { aiCoachRequestSchema } from "@/lib/ai/schema";
import { consumeAiRateLimitSlot } from "@/lib/ai/rate-limit";
import { generateCoachResponseWithGeminiResult } from "@/lib/ai/providers/gemini";
import { getAccountSessionForCookieHeader } from "@/lib/account/supabase";

type AiCoachErrorCode =
  | "ai_features_disabled"
  | "invalid_json"
  | "invalid_payload"
  | "rate_limited"
  | "coach_unavailable";

function buildAiCoachErrorResponse({
  code,
  error,
  requestId,
  retryAfterSeconds,
  status,
  fieldErrors,
}: {
  code: AiCoachErrorCode;
  error: string;
  requestId: string;
  retryAfterSeconds?: number;
  status: number;
  fieldErrors?: Record<string, string[] | undefined>;
}) {
  return NextResponse.json(
    {
      code,
      error,
      requestId,
      ...(fieldErrors ? { fieldErrors } : {}),
    },
    {
      status,
      headers: retryAfterSeconds
        ? {
            "retry-after": String(retryAfterSeconds),
          }
        : undefined,
    },
  );
}

function isAiFeatureEnabled() {
  return process.env.AI_FEATURES_ENABLED === "true";
}

function isAiLoggingEnabled() {
  return process.env.AI_LOGGING_ENABLED === "true";
}

type AiRateLimitKeyKind = "user" | "cloudflare-ip" | "host";

type TrustedAiRateLimitKey = {
  key: string;
  kind: AiRateLimitKeyKind;
};

function getTrustedClientAddress(request: Request) {
  return request.headers.get("cf-connecting-ip")?.trim() || null;
}

function getTrustedNetworkRateLimitKey(request: Request): TrustedAiRateLimitKey {
  const clientAddress = getTrustedClientAddress(request);

  if (clientAddress) {
    return {
      key: `cloudflare-ip:${clientAddress}`,
      kind: "cloudflare-ip",
    };
  }

  return {
    key: `host:${new URL(request.url).host}`,
    kind: "host",
  };
}

async function getTrustedAiRateLimitKey(request: Request): Promise<TrustedAiRateLimitKey> {
  try {
    const session = await getAccountSessionForCookieHeader(request.headers.get("cookie"));

    if (session?.user.id) {
      return {
        key: `user:${session.user.id}`,
        kind: "user",
      };
    }
  } catch {
    // Auth/vendor config can be absent in development or previews. Do not fail the
    // AI coach because session resolution failed; just fall back to network scope.
  }

  // Deliberately ignore client-supplied context.userId and spoofable proxy/client
  // headers such as x-forwarded-for, x-real-ip, x-client-ip, and user-agent.
  return getTrustedNetworkRateLimitKey(request);
}

function logAiCoachMetadata(metadata: {
  requestId: string;
  timestamp: string;
  mode?: string;
  pageSlug?: string;
  simulationId?: string;
  success: boolean;
  fallbackUsed: boolean;
  rateLimitKeyKind?: AiRateLimitKeyKind;
  validationFailureReason?: string;
  latencyMs: number;
}) {
  if (!isAiLoggingEnabled()) {
    return;
  }

  console.info("[ai-coach] request completed", metadata);
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  if (!isAiFeatureEnabled()) {
    logAiCoachMetadata({
      requestId,
      timestamp: new Date(startedAt).toISOString(),
      success: false,
      fallbackUsed: false,
      validationFailureReason: "AI features are disabled.",
      latencyMs: Date.now() - startedAt,
    });

    return buildAiCoachErrorResponse({
      code: "ai_features_disabled",
      error: "AI coach is disabled for this deployment.",
      requestId,
      status: 503,
    });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return buildAiCoachErrorResponse({
      code: "invalid_json",
      error: "AI coach payload must be valid JSON.",
      requestId,
      status: 400,
    });
  }

  const parsed = aiCoachRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return buildAiCoachErrorResponse({
      code: "invalid_payload",
      error: "AI coach payload did not pass validation.",
      requestId,
      fieldErrors: parsed.error.flatten().fieldErrors,
      status: 400,
    });
  }

  const rateLimitKey = await getTrustedAiRateLimitKey(request);
  const rateLimitDecision = consumeAiRateLimitSlot(rateLimitKey.key);

  if (!rateLimitDecision.allowed) {
    logAiCoachMetadata({
      requestId,
      timestamp: new Date(startedAt).toISOString(),
      mode: parsed.data.mode,
      pageSlug: parsed.data.context.page.slug,
      simulationId: parsed.data.context.simulation?.id,
      success: false,
      fallbackUsed: false,
      rateLimitKeyKind: rateLimitKey.kind,
      validationFailureReason: "rate_limited",
      latencyMs: Date.now() - startedAt,
    });

    return buildAiCoachErrorResponse({
      code: "rate_limited",
      error: "Too many AI coach requests came from this browser or network recently.",
      requestId,
      retryAfterSeconds: rateLimitDecision.retryAfterSeconds,
      status: 429,
    });
  }

  try {
    const result = await generateCoachResponseWithGeminiResult(parsed.data);

    logAiCoachMetadata({
      requestId,
      timestamp: new Date(startedAt).toISOString(),
      mode: parsed.data.mode,
      pageSlug: parsed.data.context.page.slug,
      simulationId: parsed.data.context.simulation?.id,
      success: !result.fallbackUsed,
      fallbackUsed: result.fallbackUsed,
      rateLimitKeyKind: rateLimitKey.kind,
      validationFailureReason: result.failureReason,
      latencyMs: Date.now() - startedAt,
    });

    return NextResponse.json(result.response, {
      headers: {
        "x-ai-request-id": requestId,
      },
    });
  } catch {
    logAiCoachMetadata({
      requestId,
      timestamp: new Date(startedAt).toISOString(),
      mode: parsed.data.mode,
      pageSlug: parsed.data.context.page.slug,
      simulationId: parsed.data.context.simulation?.id,
      success: false,
      fallbackUsed: true,
      rateLimitKeyKind: rateLimitKey.kind,
      validationFailureReason: "coach_unavailable",
      latencyMs: Date.now() - startedAt,
    });

    return buildAiCoachErrorResponse({
      code: "coach_unavailable",
      error: "The AI coach is unavailable right now.",
      requestId,
      status: 503,
    });
  }
}
