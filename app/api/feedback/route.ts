import { NextResponse } from "next/server";
import {
  buildFeedbackMailtoHref,
  feedbackHoneypotFieldName,
  feedbackSubmissionEnvelopeSchema,
  previewFeedbackEmail,
} from "@/lib/feedback";
import { consumeFeedbackRateLimitSlot } from "@/lib/feedback-rate-limit";
import {
  createFeedbackNotificationDraft,
  describeFeedbackDeliveryMode,
  getFeedbackDeliveryConfig,
  sendFeedbackNotificationEmail,
} from "@/lib/feedback-delivery";

type FeedbackErrorCode =
  | "invalid_json"
  | "invalid_payload"
  | "delivery_not_configured"
  | "delivery_config_invalid"
  | "delivery_rejected"
  | "delivery_timeout"
  | "delivery_network_error"
  | "rate_limited";

function buildFeedbackErrorResponse({
  code,
  error,
  fallbackHref,
  requestId,
  retryAfterSeconds,
  status,
}: {
  code: FeedbackErrorCode;
  error: string;
  fallbackHref?: string;
  requestId: string;
  retryAfterSeconds?: number;
  status: number;
}) {
  return NextResponse.json(
    {
      code,
      error,
      requestId,
      fallbackEmail: previewFeedbackEmail,
      ...(fallbackHref ? { fallbackHref } : {}),
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

function getClientAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const [firstAddress] = forwardedFor.split(",");
    const normalizedAddress = firstAddress?.trim();

    if (normalizedAddress) {
      return normalizedAddress;
    }
  }

  const connectingIp =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-client-ip");

  return connectingIp?.trim() || null;
}

function getFeedbackRateLimitKey(request: Request) {
  const clientAddress = getClientAddress(request);
  const userAgent = request.headers.get("user-agent")?.trim().slice(0, 120) || "unknown-agent";

  if (clientAddress) {
    return `ip:${clientAddress}:${userAgent}`;
  }

  return `host:${new URL(request.url).host}:${userAgent}`;
}

function isAbortLikeError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "AbortError" || error.name === "TimeoutError";
}

export async function GET() {
  const deliveryMode = describeFeedbackDeliveryMode();

  console.info("[feedback] route availability checked", {
    deliveryEnabled: deliveryMode.deliveryEnabled,
    deliveryMode: deliveryMode.deliveryMode,
    deliveryReason: deliveryMode.deliveryReason,
    issueCount: "issues" in deliveryMode ? deliveryMode.issues.length : 0,
  });

  return NextResponse.json(deliveryMode);
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const requestUrl = new URL(request.url);
  console.info("[feedback] route started", {
    requestId,
    host: requestUrl.host,
  });
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    console.warn("[feedback] invalid json payload", {
      requestId,
      host: requestUrl.host,
    });

    return buildFeedbackErrorResponse({
      code: "invalid_json",
      error: "Feedback payload must be valid JSON.",
      requestId,
      status: 400,
    });
  }

  const referer = request.headers.get("referer")?.trim() || undefined;
  const userAgent = request.headers.get("user-agent");

  if (
    payload &&
    typeof payload === "object" &&
    "runtime" in payload &&
    payload.runtime &&
    typeof payload.runtime === "object" &&
    !("pageHref" in payload.runtime) &&
    referer
  ) {
    payload = {
      ...payload,
      runtime: {
        ...payload.runtime,
        pageHref: referer,
      },
    };
  } else if (payload && typeof payload === "object" && !("runtime" in payload) && referer) {
    payload = {
      ...payload,
      runtime: {
        pageHref: referer,
      },
    };
  }

  const parsed = feedbackSubmissionEnvelopeSchema.safeParse(payload);

  if (!parsed.success) {
    console.warn("[feedback] invalid feedback payload", {
      requestId,
      host: requestUrl.host,
      fieldNames: Object.keys(parsed.error.flatten().fieldErrors),
    });

    return NextResponse.json(
      {
        code: "invalid_payload" satisfies FeedbackErrorCode,
        error: "Feedback payload did not pass validation.",
        requestId,
        fallbackEmail: previewFeedbackEmail,
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const {
    [feedbackHoneypotFieldName]: honeypotValue,
    ...submission
  } = parsed.data;
  const fallbackHref = buildFeedbackMailtoHref(submission, previewFeedbackEmail);

  if (honeypotValue.trim()) {
    return NextResponse.json(
      {
        ok: true,
        delivery: "discarded",
        requestId,
      },
      { status: 202 },
    );
  }

  const rateLimitDecision = consumeFeedbackRateLimitSlot(getFeedbackRateLimitKey(request));

  if (!rateLimitDecision.allowed) {
    return buildFeedbackErrorResponse({
      code: "rate_limited",
      error: "Too many feedback notes came from this browser or network recently.",
      fallbackHref,
      requestId,
      retryAfterSeconds: rateLimitDecision.retryAfterSeconds,
      status: 429,
    });
  }

  const deliveryConfig = getFeedbackDeliveryConfig();

  if (!deliveryConfig.enabled && deliveryConfig.reason === "missing") {
    console.warn("[feedback] delivery not configured", {
      requestId,
      host: requestUrl.host,
    });

    return buildFeedbackErrorResponse({
      code: "delivery_not_configured",
      error: "Feedback delivery is not configured for this deployment.",
      fallbackHref,
      requestId,
      status: 503,
    });
  }

  if (!deliveryConfig.enabled && deliveryConfig.reason === "invalid") {
    console.error("[feedback] invalid delivery config", {
      requestId,
      issues: deliveryConfig.issues,
    });

    return buildFeedbackErrorResponse({
      code: "delivery_config_invalid",
      error: "Feedback delivery is temporarily unavailable in this deployment.",
      fallbackHref,
      requestId,
      status: 503,
    });
  }

  const draft = createFeedbackNotificationDraft(submission, {
    requestId,
    relayPath: "/api/feedback",
    pageHref: referer,
    requestHost: requestUrl.host,
    requestOrigin: requestUrl.origin,
    userAgent,
  });

  try {
    const deliveryResult = await sendFeedbackNotificationEmail(deliveryConfig, draft, {
      requestId,
    });

    if (!deliveryResult.ok) {
      console.error("[feedback] delivery provider rejected feedback", {
        requestId,
        status: deliveryResult.status,
        statusText: deliveryResult.statusText,
        body: deliveryResult.body,
      });

      return buildFeedbackErrorResponse({
        code: "delivery_rejected",
        error: "The delivery provider rejected this feedback message.",
        fallbackHref,
        requestId,
        status: 502,
      });
    }

    console.info("[feedback] route completed", {
      requestId,
      provider: "resend",
      messageId: deliveryResult.messageId,
    });

    return NextResponse.json({
      ok: true,
      delivery: "email",
      provider: "resend",
      requestId,
      messageId: deliveryResult.messageId,
    });
  } catch (error) {
    if (isAbortLikeError(error)) {
      console.error("[feedback] delivery timed out", {
        requestId,
        error,
      });

      return buildFeedbackErrorResponse({
        code: "delivery_timeout",
        error: "Feedback delivery timed out before the inbox confirmed receipt.",
        fallbackHref,
        requestId,
        status: 504,
      });
    }

    console.error("[feedback] delivery failed", {
      requestId,
      error,
    });

    return buildFeedbackErrorResponse({
      code: "delivery_network_error",
      error: "Feedback delivery failed before the message reached the inbox.",
      fallbackHref,
      requestId,
      status: 502,
    });
  }
}
