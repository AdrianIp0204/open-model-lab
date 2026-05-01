import { z } from "zod";
import {
  feedbackRelayTimeoutMs,
  feedbackRelayUserAgent,
  formatFeedbackContextLabel,
  formatFeedbackWebhookPayload,
  getFeedbackCategory,
  normalizeFeedbackContext,
  previewFeedbackEmail,
  resolveFeedbackRuntimeContext,
  type FeedbackSubmission,
} from "@/lib/feedback";

const resendApiBaseUrlSchema = z.url().refine(
  (value) => value.startsWith("http://") || value.startsWith("https://"),
  "Resend API base URL must use http or https.",
);

const emailAddressSchema = z.email().max(320);

export type FeedbackDeliveryConfig =
  | {
      enabled: false;
      reason: "missing";
    }
  | {
      enabled: false;
      reason: "invalid";
      issues: string[];
    }
  | {
      enabled: true;
      provider: "resend";
      apiKey: string;
      apiBaseUrl: string;
      fromEmail: string;
      toEmails: string[];
    };

export type FeedbackDeliveryMode =
  | {
      deliveryEnabled: false;
      deliveryMode: "fallback";
      deliveryReason: "missing_config";
      fallbackEmail: string;
    }
  | {
      deliveryEnabled: false;
      deliveryMode: "fallback";
      deliveryReason: "invalid_config";
      fallbackEmail: string;
      issues: string[];
    }
  | {
      deliveryEnabled: true;
      deliveryMode: "direct";
      deliveryReason: "configured";
      fallbackEmail: string;
    };

type FeedbackDeliveryPayload = ReturnType<typeof formatFeedbackWebhookPayload>;

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractIdentityEmail(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/<([^<>]+)>/);
  const candidate = match ? match[1].trim() : trimmed;
  return emailAddressSchema.safeParse(candidate).success;
}

function parseRecipientList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("feedback_delivery_timeout")), timeoutMs);

  return {
    signal: controller.signal,
    clear() {
      clearTimeout(timeout);
    },
  };
}

function buildFeedbackDeliveryPayload(
  submission: FeedbackSubmission,
  options: {
    requestId: string;
    relayPath: string;
    pageHref?: string | null;
    pageTitle?: string | null;
    requestHost?: string | null;
    requestOrigin?: string | null;
    userAgent?: string | null;
  },
) {
  return formatFeedbackWebhookPayload(submission, options);
}

function buildFeedbackEmailSubject(payload: FeedbackDeliveryPayload) {
  const categoryLabel = payload.categoryLabel;
  const pageLabel = payload.pageLabel;
  return `Open Model Lab feedback: ${categoryLabel} | ${pageLabel}`.slice(0, 160);
}

function buildFeedbackEmailText(payload: FeedbackDeliveryPayload) {
  const lines = [
    "Open Model Lab feedback submission",
    `Request ID: ${payload.requestId}`,
    `Submitted at: ${payload.submittedAt}`,
    "",
    `Category: ${payload.categoryLabel}`,
    `Page: ${payload.pageLabel}`,
    `Page type: ${payload.page.type}`,
    `Path: ${payload.page.path}`,
    `Page URL: ${payload.page.href ?? "Not captured"}`,
    `Reply contact: ${payload.contact ?? "Not provided"}`,
    "",
    `Triage bucket: ${payload.triage.bucketKey}`,
    `Triage tags: ${payload.triage.tags.join(", ")}`,
    "",
    "Message",
    payload.message,
    "",
    "Request context",
    `Host: ${payload.request.host ?? "Unknown"}`,
    `Origin: ${payload.request.origin ?? "Unknown"}`,
    `User agent: ${payload.request.userAgent ?? "Unknown"}`,
  ];

  if (payload.runtime?.viewportWidth !== undefined && payload.runtime?.viewportHeight !== undefined) {
    lines.push(`Viewport: ${payload.runtime.viewportWidth} x ${payload.runtime.viewportHeight}`);
  }

  if (payload.runtime?.referrer) {
    lines.push(`Referrer: ${payload.runtime.referrer}`);
  }

  return lines.join("\n");
}

function buildFeedbackEmailHtml(payload: FeedbackDeliveryPayload) {
  const rows = [
    ["Request ID", payload.requestId],
    ["Submitted at", payload.submittedAt],
    ["Category", payload.categoryLabel],
    ["Page", payload.pageLabel],
    ["Page type", payload.page.type],
    ["Path", payload.page.path],
    ["Page URL", payload.page.href ?? "Not captured"],
    ["Reply contact", payload.contact ?? "Not provided"],
    ["Triage bucket", payload.triage.bucketKey],
    ["Triage tags", payload.triage.tags.join(", ")],
    ["Host", payload.request.host ?? "Unknown"],
    ["Origin", payload.request.origin ?? "Unknown"],
    ["User agent", payload.request.userAgent ?? "Unknown"],
    ...(payload.runtime?.viewportWidth !== undefined && payload.runtime?.viewportHeight !== undefined
      ? [["Viewport", `${payload.runtime.viewportWidth} x ${payload.runtime.viewportHeight}`]]
      : []),
    ...(payload.runtime?.referrer ? [["Referrer", payload.runtime.referrer]] : []),
  ];

  const escapedMessage = escapeHtml(payload.message).replace(/\n/g, "<br />");

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f7f5ee;color:#17212a;font-family:Arial,sans-serif;">
    <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #e0ddd2;border-radius:20px;padding:24px;">
      <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#5f6f79;">Open Model Lab feedback</p>
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;color:#17212a;">${escapeHtml(payload.categoryLabel)} for ${escapeHtml(payload.pageLabel)}</h1>
      <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.6;">
        <tbody>
          ${rows
            .map(
              ([label, value]) => `<tr>
            <td style="padding:6px 12px 6px 0;vertical-align:top;font-weight:600;color:#17212a;white-space:nowrap;">${escapeHtml(label)}</td>
            <td style="padding:6px 0;color:#425663;">${escapeHtml(value)}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
      <div style="margin-top:20px;padding:16px;border:1px solid #e0ddd2;border-radius:16px;background:#fbfaf5;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#5f6f79;">Message</p>
        <p style="margin:0;font-size:14px;line-height:1.7;color:#17212a;">${escapedMessage}</p>
      </div>
    </div>
  </body>
</html>`;
}

export function getFeedbackReplyToAddress(contact: string | null | undefined) {
  const normalizedContact = normalizeOptionalText(contact);

  if (!normalizedContact) {
    return null;
  }

  const parsedEmail = emailAddressSchema.safeParse(normalizedContact);
  return parsedEmail.success ? parsedEmail.data : null;
}

export function getFeedbackDeliveryConfig(): FeedbackDeliveryConfig {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const fromEmail = process.env.FEEDBACK_FROM_EMAIL?.trim() ?? "";
  const toEmails = parseRecipientList(process.env.FEEDBACK_TO_EMAIL);
  const apiBaseUrl =
    process.env.FEEDBACK_RESEND_API_BASE_URL?.trim() || "https://api.resend.com";

  if (!apiKey && !fromEmail && toEmails.length === 0) {
    return {
      enabled: false,
      reason: "missing",
    };
  }

  const issues: string[] = [];

  if (!apiKey) {
    issues.push("RESEND_API_KEY is missing.");
  }

  if (!fromEmail) {
    issues.push("FEEDBACK_FROM_EMAIL is missing.");
  } else if (!extractIdentityEmail(fromEmail)) {
    issues.push("FEEDBACK_FROM_EMAIL must be a valid email address or display-name identity.");
  }

  if (toEmails.length === 0) {
    issues.push("FEEDBACK_TO_EMAIL is missing.");
  } else if (toEmails.some((email) => !emailAddressSchema.safeParse(email).success)) {
    issues.push("FEEDBACK_TO_EMAIL must contain valid email addresses.");
  }

  if (!resendApiBaseUrlSchema.safeParse(apiBaseUrl).success) {
    issues.push("FEEDBACK_RESEND_API_BASE_URL must be a valid http or https URL.");
  }

  if (issues.length > 0) {
    return {
      enabled: false,
      reason: "invalid",
      issues,
    };
  }

  return {
    enabled: true,
    provider: "resend",
    apiKey,
    apiBaseUrl,
    fromEmail,
    toEmails,
  };
}

export function createFeedbackNotificationDraft(
  submission: FeedbackSubmission,
  options: {
    requestId: string;
    relayPath: string;
    pageHref?: string | null;
    pageTitle?: string | null;
    requestHost?: string | null;
    requestOrigin?: string | null;
    userAgent?: string | null;
  },
) {
  const payload = buildFeedbackDeliveryPayload(submission, options);

  return {
    payload,
    subject: buildFeedbackEmailSubject(payload),
    text: buildFeedbackEmailText(payload),
    html: buildFeedbackEmailHtml(payload),
    replyTo: getFeedbackReplyToAddress(submission.contact),
  };
}

export async function sendFeedbackNotificationEmail(
  config: Extract<FeedbackDeliveryConfig, { enabled: true }>,
  draft: ReturnType<typeof createFeedbackNotificationDraft>,
  options: {
    requestId: string;
  },
) {
  const timeout = createTimeoutSignal(feedbackRelayTimeoutMs);

  try {
    const response = await fetch(`${config.apiBaseUrl.replace(/\/+$/, "")}/emails`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
        "idempotency-key": options.requestId,
        "user-agent": feedbackRelayUserAgent,
        "x-open-model-lab-feedback-id": options.requestId,
      },
      body: JSON.stringify({
        from: config.fromEmail,
        to: config.toEmails,
        subject: draft.subject,
        text: draft.text,
        html: draft.html,
        ...(draft.replyTo ? { reply_to: draft.replyTo } : {}),
      }),
      cache: "no-store",
      signal: timeout.signal,
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      return {
        ok: false as const,
        status: response.status,
        statusText: response.statusText,
        body: responseText.slice(0, 400),
      };
    }

    const payload = (await response.json().catch(() => null)) as { id?: string } | null;

    return {
      ok: true as const,
      messageId: typeof payload?.id === "string" ? payload.id : null,
    };
  } finally {
    timeout.clear();
  }
}

export function describeFeedbackDeliveryMode(): FeedbackDeliveryMode {
  const config = getFeedbackDeliveryConfig();

  if (!config.enabled) {
    if (config.reason === "invalid") {
      return {
        deliveryEnabled: false,
        deliveryMode: "fallback",
        deliveryReason: "invalid_config",
        fallbackEmail: previewFeedbackEmail,
        issues: [...config.issues],
      };
    }

    return {
      deliveryEnabled: false,
      deliveryMode: "fallback",
      deliveryReason: "missing_config",
      fallbackEmail: previewFeedbackEmail,
    };
  }

  return {
    deliveryEnabled: true,
    deliveryMode: "direct",
    deliveryReason: "configured",
    fallbackEmail: previewFeedbackEmail,
  } as const;
}

export function buildFeedbackNotificationSummary(submission: FeedbackSubmission) {
  const category = getFeedbackCategory(submission.category);
  const context = normalizeFeedbackContext(submission.context);
  const runtime = resolveFeedbackRuntimeContext(submission.runtime, {
    pageTitle: context.pageTitle,
  });

  return {
    categoryLabel: category.label,
    pageLabel: formatFeedbackContextLabel(context),
    replyTo: getFeedbackReplyToAddress(submission.contact),
    pageHref: runtime?.pageHref ?? null,
  };
}
