import { NextResponse } from "next/server";
import {
  aiCoachRequestSchema,
  MAX_AI_COACH_REQUEST_BYTES,
} from "@/lib/ai/schema";
import { consumeAiRateLimitSlot } from "@/lib/ai/rate-limit";
import {
  generateCoachResponseWithGeminiResult,
  type GeminiCoachGenerationResult,
} from "@/lib/ai/providers/gemini";
import {
  getAiMonthlyQuotaResetAt,
  getAiMonthlyTokenLimit,
  getAiMonthlyTokenUsageForUser,
  getCurrentAiUsagePeriod,
  recordAiMonthlyTokenUsageForUser,
} from "@/lib/ai/token-quota";
import { hasAccountEntitlementCapability } from "@/lib/account/entitlements";
import { getAccountSessionForCookieHeader } from "@/lib/account/supabase";
import type { AccountSession } from "@/lib/account/model";

type AiCoachErrorCode =
  | "ai_features_disabled"
  | "ai_auth_required"
  | "ai_premium_required"
  | "ai_monthly_quota_exceeded"
  | "invalid_json"
  | "invalid_payload"
  | "rate_limited"
  | "ai_quota_storage_unavailable"
  | "ai_quota_record_failed"
  | "ai_provider_unconfigured"
  | "ai_provider_unavailable";

function buildAiCoachErrorResponse({
  code,
  error,
  requestId,
  retryAfterSeconds,
  status,
  fieldErrors,
  details,
}: {
  code: AiCoachErrorCode;
  error: string;
  requestId: string;
  retryAfterSeconds?: number;
  status: number;
  fieldErrors?: Record<string, string[] | undefined>;
  details?: Record<string, unknown>;
}) {
  return NextResponse.json(
    {
      code,
      error,
      requestId,
      ...(fieldErrors ? { fieldErrors } : {}),
      ...(details ? { details } : {}),
    },
    {
      status,
      headers: retryAfterSeconds
        ? {
            "retry-after": String(retryAfterSeconds),
            "x-ai-request-id": requestId,
          }
        : {
            "x-ai-request-id": requestId,
          },
    },
  );
}

function isAiFeatureEnabled() {
  return process.env.AI_FEATURES_ENABLED === "true";
}

function isAiLoggingEnabled() {
  return process.env.AI_LOGGING_ENABLED === "true";
}

function isAiCoachRequestBodyTooLarge(request: Request) {
  const contentLength = request.headers.get("content-length");

  if (!contentLength) {
    return false;
  }

  const parsed = Number.parseInt(contentLength, 10);

  return Number.isFinite(parsed) && parsed > MAX_AI_COACH_REQUEST_BYTES;
}

async function getServerAccountSessionForAiRequest(request: Request) {
  try {
    return await getAccountSessionForCookieHeader(request.headers.get("cookie"));
  } catch {
    // Auth/vendor config can be absent in local previews. The AI coach is still
    // signed-in Premium only, so a failed server session lookup resolves as no
    // authenticated AI access instead of falling back to client-controlled fields.
    return null;
  }
}

function getPremiumAiRateLimitKey(session: AccountSession) {
  // Deliberately ignore client-supplied context.userId and mutable network
  // headers. The AI endpoint is Premium-only, so the server-resolved account id
  // is the only identity used for quota and short-window rate limiting.
  return `user:${session.user.id}`;
}

function getProviderErrorForRoute(result: GeminiCoachGenerationResult): {
  code: AiCoachErrorCode;
  reason: string;
} | null {
  if (result.failureCode === "provider_unconfigured") {
    return {
      code: "ai_provider_unconfigured",
      reason: "provider_unconfigured",
    };
  }

  if (result.failureCode === "provider_unavailable") {
    return {
      code: "ai_provider_unavailable",
      reason: "provider_unavailable",
    };
  }

  return null;
}

function logAiCoachMetadata(metadata: {
  requestId: string;
  timestamp: string;
  mode?: string;
  pageSlug?: string;
  simulationId?: string;
  success: boolean;
  fallbackUsed: boolean;
  rateLimitKeyKind?: "user";
  validationFailureReason?: string;
  quotaPeriod?: string;
  usageTotalTokens?: number;
  usageEstimated?: boolean;
  usageUnavailable?: boolean;
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

  const session = await getServerAccountSessionForAiRequest(request);

  if (!session?.user?.id) {
    logAiCoachMetadata({
      requestId,
      timestamp: new Date(startedAt).toISOString(),
      success: false,
      fallbackUsed: false,
      validationFailureReason: "ai_auth_required",
      latencyMs: Date.now() - startedAt,
    });

    return buildAiCoachErrorResponse({
      code: "ai_auth_required",
      error: "Sign in with a Supporter account to use the AI coach.",
      requestId,
      status: 401,
    });
  }

  if (!hasAccountEntitlementCapability(session.entitlement, "canUseAiCoach")) {
    logAiCoachMetadata({
      requestId,
      timestamp: new Date(startedAt).toISOString(),
      success: false,
      fallbackUsed: false,
      rateLimitKeyKind: "user",
      validationFailureReason: "ai_premium_required",
      latencyMs: Date.now() - startedAt,
    });

    return buildAiCoachErrorResponse({
      code: "ai_premium_required",
      error: "AI Coach is a Supporter feature.",
      requestId,
      status: 403,
    });
  }

  let payload: unknown;

  if (isAiCoachRequestBodyTooLarge(request)) {
    return buildAiCoachErrorResponse({
      code: "invalid_payload",
      error: "AI coach payload is too large.",
      requestId,
      status: 400,
    });
  }

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

  const rateLimitDecision = consumeAiRateLimitSlot(getPremiumAiRateLimitKey(session));

  if (!rateLimitDecision.allowed) {
    logAiCoachMetadata({
      requestId,
      timestamp: new Date(startedAt).toISOString(),
      mode: parsed.data.mode,
      pageSlug: parsed.data.context.page.slug,
      simulationId: parsed.data.context.simulation?.id,
      success: false,
      fallbackUsed: false,
      rateLimitKeyKind: "user",
      validationFailureReason: "rate_limited",
      latencyMs: Date.now() - startedAt,
    });

    return buildAiCoachErrorResponse({
      code: "rate_limited",
      error: "Too many AI coach requests came from this account recently.",
      requestId,
      retryAfterSeconds: rateLimitDecision.retryAfterSeconds,
      status: 429,
    });
  }

  const quotaPeriod = getCurrentAiUsagePeriod();
  const quotaLimit = getAiMonthlyTokenLimit();
  const quotaResetAt = getAiMonthlyQuotaResetAt(quotaPeriod);

  let currentUsage;

  try {
    currentUsage = await getAiMonthlyTokenUsageForUser(session.user.id, quotaPeriod);
  } catch {
    logAiCoachMetadata({
      requestId,
      timestamp: new Date(startedAt).toISOString(),
      mode: parsed.data.mode,
      pageSlug: parsed.data.context.page.slug,
      simulationId: parsed.data.context.simulation?.id,
      success: false,
      fallbackUsed: false,
      rateLimitKeyKind: "user",
      validationFailureReason: "quota_lookup_failed",
      quotaPeriod,
      latencyMs: Date.now() - startedAt,
    });

    return buildAiCoachErrorResponse({
      code: "ai_quota_storage_unavailable",
      error: "AI Coach setup is not complete for this deployment yet.",
      requestId,
      status: 503,
      details: {
        period: quotaPeriod,
        resetAt: quotaResetAt,
      },
    });
  }

  if (currentUsage.totalTokens >= quotaLimit) {
    logAiCoachMetadata({
      requestId,
      timestamp: new Date(startedAt).toISOString(),
      mode: parsed.data.mode,
      pageSlug: parsed.data.context.page.slug,
      simulationId: parsed.data.context.simulation?.id,
      success: false,
      fallbackUsed: false,
      rateLimitKeyKind: "user",
      validationFailureReason: "ai_monthly_quota_exceeded",
      quotaPeriod,
      latencyMs: Date.now() - startedAt,
    });

    return buildAiCoachErrorResponse({
      code: "ai_monthly_quota_exceeded",
      error: "This account has reached the monthly AI Coach token limit.",
      requestId,
      status: 429,
      details: {
        period: quotaPeriod,
        limit: quotaLimit,
        totalTokens: currentUsage.totalTokens,
        resetAt: quotaResetAt,
      },
    });
  }

  try {
    const result = await generateCoachResponseWithGeminiResult(parsed.data);

    if (result.usage) {
      let quotaRecordResult;

      try {
        quotaRecordResult = await recordAiMonthlyTokenUsageForUser({
          userId: session.user.id,
          periodYyyymm: quotaPeriod,
          usage: result.usage,
          monthlyTokenLimit: quotaLimit,
        });
      } catch {
        logAiCoachMetadata({
          requestId,
          timestamp: new Date(startedAt).toISOString(),
          mode: parsed.data.mode,
          pageSlug: parsed.data.context.page.slug,
          simulationId: parsed.data.context.simulation?.id,
          success: false,
          fallbackUsed: result.fallbackUsed,
          rateLimitKeyKind: "user",
          validationFailureReason: "quota_increment_failed",
          quotaPeriod,
          usageTotalTokens: result.usage.totalTokenCount,
          usageEstimated: result.usage.estimated,
          latencyMs: Date.now() - startedAt,
        });

        return buildAiCoachErrorResponse({
          code: "ai_quota_record_failed",
          error: "AI Coach could not record usage for this request. Try again later.",
          requestId,
          status: 503,
          details: {
            period: quotaPeriod,
            resetAt: quotaResetAt,
          },
        });
      }

      if (!quotaRecordResult.accepted) {
        logAiCoachMetadata({
          requestId,
          timestamp: new Date(startedAt).toISOString(),
          mode: parsed.data.mode,
          pageSlug: parsed.data.context.page.slug,
          simulationId: parsed.data.context.simulation?.id,
          success: false,
          fallbackUsed: result.fallbackUsed,
          rateLimitKeyKind: "user",
          validationFailureReason: "ai_monthly_quota_exceeded_after_record",
          quotaPeriod,
          usageTotalTokens: result.usage.totalTokenCount,
          usageEstimated: result.usage.estimated,
          latencyMs: Date.now() - startedAt,
        });

        return buildAiCoachErrorResponse({
          code: "ai_monthly_quota_exceeded",
          error: "This account has reached the monthly AI Coach token limit.",
          requestId,
          status: 429,
          details: {
            period: quotaPeriod,
            limit: quotaLimit,
            totalTokens: quotaRecordResult.usage.totalTokens,
            resetAt: quotaResetAt,
          },
        });
      }
    }

    const providerError = getProviderErrorForRoute(result);

    if (providerError) {
      logAiCoachMetadata({
        requestId,
        timestamp: new Date(startedAt).toISOString(),
        mode: parsed.data.mode,
        pageSlug: parsed.data.context.page.slug,
        simulationId: parsed.data.context.simulation?.id,
        success: false,
        fallbackUsed: result.fallbackUsed,
        rateLimitKeyKind: "user",
        validationFailureReason: providerError.reason,
        quotaPeriod,
        usageTotalTokens: result.usage?.totalTokenCount,
        usageEstimated: result.usage?.estimated,
        usageUnavailable: !result.usage,
        latencyMs: Date.now() - startedAt,
      });

      return buildAiCoachErrorResponse({
        code: providerError.code,
        error:
          providerError.code === "ai_provider_unconfigured"
            ? "AI Coach is not configured for this deployment yet."
            : "AI Coach is unavailable right now.",
        requestId,
        status: 503,
      });
    }

    logAiCoachMetadata({
      requestId,
      timestamp: new Date(startedAt).toISOString(),
      mode: parsed.data.mode,
      pageSlug: parsed.data.context.page.slug,
      simulationId: parsed.data.context.simulation?.id,
      success: !result.fallbackUsed,
      fallbackUsed: result.fallbackUsed,
      rateLimitKeyKind: "user",
      validationFailureReason: result.failureReason,
      quotaPeriod,
      usageTotalTokens: result.usage?.totalTokenCount,
      usageEstimated: result.usage?.estimated,
      usageUnavailable: !result.usage,
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
      rateLimitKeyKind: "user",
      validationFailureReason: "provider_unavailable",
      quotaPeriod,
      usageUnavailable: true,
      latencyMs: Date.now() - startedAt,
    });

    return buildAiCoachErrorResponse({
      code: "ai_provider_unavailable",
      error: "AI Coach is unavailable right now.",
      requestId,
      status: 503,
    });
  }
}
