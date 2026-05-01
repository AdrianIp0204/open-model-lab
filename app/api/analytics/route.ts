import { NextResponse } from "next/server";
import {
  analyticsRelaySource,
  analyticsRelayTimeoutMs,
  analyticsRelayUserAgent,
  analyticsSubmissionSchema,
} from "@/lib/analytics";

type AnalyticsErrorCode =
  | "invalid_json"
  | "invalid_payload"
  | "webhook_rejected"
  | "webhook_timeout"
  | "webhook_network_error";

function getAnalyticsWebhookConfig() {
  const rawUrl = process.env.ANALYTICS_WEBHOOK_URL?.trim();

  if (!rawUrl) {
    return { status: "missing" } as const;
  }

  try {
    const url = new URL(rawUrl);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { status: "invalid", value: rawUrl } as const;
    }

    return {
      status: "configured",
      url: url.toString(),
      token: process.env.ANALYTICS_WEBHOOK_TOKEN?.trim() || null,
    } as const;
  } catch {
    return { status: "invalid", value: rawUrl } as const;
  }
}

function buildAcceptedResponse(
  delivery: "disabled" | "webhook",
  requestId?: string,
) {
  return NextResponse.json(
    {
      accepted: true,
      delivery,
      ...(requestId ? { requestId } : {}),
    },
    { status: 202 },
  );
}

function buildErrorResponse(code: AnalyticsErrorCode, status: number, details?: unknown) {
  return NextResponse.json(
    {
      accepted: false,
      code,
      ...(details ? { details } : {}),
    },
    { status },
  );
}

function isAbortLikeError(error: unknown) {
  return error instanceof Error && (
    error.name === "AbortError" || error.name === "TimeoutError"
  );
}

async function readWebhookResponseText(response: Response) {
  const text = await response.text().catch(() => "");

  if (!text) {
    return "";
  }

  return text.slice(0, 300);
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return buildErrorResponse("invalid_json", 400);
  }

  const parsed = analyticsSubmissionSchema.safeParse(payload);

  if (!parsed.success) {
    return buildErrorResponse("invalid_payload", 400, {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const webhook = getAnalyticsWebhookConfig();

  if (webhook.status === "missing") {
    return buildAcceptedResponse("disabled");
  }

  if (webhook.status === "invalid") {
    console.error("[analytics] invalid webhook config", {
      value: webhook.value,
    });
    return buildAcceptedResponse("disabled");
  }

  const requestId = crypto.randomUUID();

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        accept: "application/json, text/plain;q=0.9, */*;q=0.8",
        "content-type": "application/json",
        "user-agent": analyticsRelayUserAgent,
        "x-open-model-lab-analytics-id": requestId,
        "x-open-model-lab-analytics-source": analyticsRelaySource,
        ...(webhook.token ? { authorization: `Bearer ${webhook.token}` } : {}),
      },
      body: JSON.stringify({
        requestId,
        source: analyticsRelaySource,
        capturedAt: new Date().toISOString(),
        schemaVersion: 1,
        event: parsed.data.name,
        payload: parsed.data.payload,
        privacy: {
          personalData: "excluded",
          persistentIdentifiers: "none",
          cookies: "not used by application analytics",
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(analyticsRelayTimeoutMs),
    });

    if (!response.ok) {
      console.error("[analytics] webhook rejected event", {
        requestId,
        status: response.status,
        statusText: response.statusText,
        body: await readWebhookResponseText(response),
      });

      return buildErrorResponse("webhook_rejected", 502);
    }
  } catch (error) {
    if (isAbortLikeError(error)) {
      console.error("[analytics] webhook timed out", {
        requestId,
        timeoutMs: analyticsRelayTimeoutMs,
        error,
      });

      return buildErrorResponse("webhook_timeout", 504);
    }

    console.error("[analytics] webhook delivery failed", {
      requestId,
      error,
    });

    return buildErrorResponse("webhook_network_error", 502);
  }

  return buildAcceptedResponse("webhook", requestId);
}
