import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/feedback/route";
import { resetFeedbackRateLimitForTests } from "@/lib/feedback-rate-limit";

const validPayload = {
  category: "clarity",
  message: "The graph labels on the projectile page should explain the axes more clearly.",
  contact: "teacher@example.com",
  context: {
    pageType: "concept",
    pagePath: "/concepts/projectile-motion",
    pageTitle: "Projectile Motion",
    conceptId: "concept-projectile-motion",
    conceptSlug: "projectile-motion",
    conceptTitle: "Projectile Motion",
    topicSlug: "mechanics",
    topicTitle: "Mechanics",
  },
};

function configureFeedbackEmailDelivery() {
  vi.stubEnv("RESEND_API_KEY", "re_test_feedback_key");
  vi.stubEnv("FEEDBACK_FROM_EMAIL", "Open Model Lab <feedback@openmodellab.dev>");
  vi.stubEnv("FEEDBACK_TO_EMAIL", "inbox@openmodellab.dev");
}

describe("feedback route", () => {
  afterEach(() => {
    resetFeedbackRateLimitForTests();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends validated feedback through the configured Resend delivery path", async () => {
    configureFeedbackEmailDelivery();

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          referer: "http://localhost/concepts/projectile-motion",
          "user-agent": "vitest",
          "x-forwarded-for": "203.0.113.10",
        },
        body: JSON.stringify(validPayload),
      }),
    );

    const responsePayload = (await response.json()) as {
      delivery: string;
      provider: string;
      ok: boolean;
      requestId: string;
      messageId: string | null;
    };

    expect(response.status).toBe(200);
    expect(responsePayload).toMatchObject({
      ok: true,
      delivery: "email",
      provider: "resend",
      requestId: expect.any(String),
      messageId: "email_123",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;

    expect(url).toBe("https://api.resend.com/emails");
    expect(init).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer re_test_feedback_key",
          "content-type": "application/json",
          "idempotency-key": responsePayload.requestId,
        }),
      }),
    );
    expect(body).toMatchObject({
      from: "Open Model Lab <feedback@openmodellab.dev>",
      to: ["inbox@openmodellab.dev"],
      reply_to: "teacher@example.com",
    });
    expect(String(body.subject)).toContain("Concept clarity");
    expect(String(body.subject)).toContain("Projectile Motion");
    expect(String(body.text)).toContain("Triage bucket: clarity:concept:projectile-motion");
    expect(String(body.text)).toContain("Reply contact: teacher@example.com");
    expect(String(body.html)).toContain("Projectile Motion");
  });

  it("exposes delivery availability to the client form when email delivery is configured", async () => {
    configureFeedbackEmailDelivery();
    vi.stubEnv("NEXT_PUBLIC_FEEDBACK_EMAIL", "preview@openmodellab.dev");

    vi.resetModules();
    const { GET: getRoute } = await import("@/app/api/feedback/route");

    const response = await getRoute();
    const payload = (await response.json()) as {
      deliveryEnabled: boolean;
      deliveryMode: string;
      deliveryReason: string;
      fallbackEmail: string;
    };

    expect(response.status).toBe(200);
    expect(payload.deliveryEnabled).toBe(true);
    expect(payload.deliveryMode).toBe("direct");
    expect(payload.deliveryReason).toBe("configured");
    expect(payload.fallbackEmail).toBe("preview@openmodellab.dev");
  });

  it("reports an invalid feedback delivery config truthfully without exposing secrets", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_feedback_key");
    vi.stubEnv("FEEDBACK_FROM_EMAIL", "not-an-email");
    vi.stubEnv("FEEDBACK_TO_EMAIL", "inbox@openmodellab.dev");

    vi.resetModules();
    const { GET: getRoute } = await import("@/app/api/feedback/route");

    const response = await getRoute();
    const payload = (await response.json()) as {
      deliveryEnabled: boolean;
      deliveryMode: string;
      deliveryReason: string;
      fallbackEmail: string;
      issues?: string[];
    };

    expect(response.status).toBe(200);
    expect(payload.deliveryEnabled).toBe(false);
    expect(payload.deliveryMode).toBe("fallback");
    expect(payload.deliveryReason).toBe("invalid_config");
    expect(payload.fallbackEmail).toMatch(/@/);
    expect(payload.issues).toContain(
      "FEEDBACK_FROM_EMAIL must be a valid email address or display-name identity.",
    );
    expect(JSON.stringify(payload)).not.toContain("re_test_feedback_key");
  });

  it("rejects malformed payloads before delivery is attempted", async () => {
    configureFeedbackEmailDelivery();

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...validPayload,
          message: "Too short",
        }),
      }),
    );

    const payload = (await response.json()) as {
      code: string;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("invalid_payload");
    expect(payload.error).toMatch(/did not pass validation/i);
    expect(payload.fieldErrors?.message).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a bounded configuration error with a prefilled mailto fallback when delivery is not configured", async () => {
    const response = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(validPayload),
      }),
    );

    const payload = (await response.json()) as {
      code: string;
      error: string;
      fallbackEmail: string;
      fallbackHref: string;
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("delivery_not_configured");
    expect(payload.error).toMatch(/not configured/i);
    expect(payload.fallbackEmail).toMatch(/@/);
    expect(payload.fallbackHref).toContain("mailto:");
    expect(decodeURIComponent(payload.fallbackHref)).toContain("Projectile Motion");
    expect(decodeURIComponent(payload.fallbackHref)).toContain(
      "Triage bucket: clarity:concept:projectile-motion",
    );
  });

  it("treats an invalid email-delivery config as unavailable without attempting delivery", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_feedback_key");
    vi.stubEnv("FEEDBACK_FROM_EMAIL", "not-an-email");
    vi.stubEnv("FEEDBACK_TO_EMAIL", "inbox@openmodellab.dev");

    const fetchMock = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(validPayload),
      }),
    );

    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("delivery_config_invalid");
    expect(payload.error).toMatch(/temporarily unavailable/i);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
  });

  it("returns a delivery error and preserves the mailto fallback when the provider rejects the request", async () => {
    configureFeedbackEmailDelivery();

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "validation failed" }), {
        status: 422,
        statusText: "unprocessable",
      }),
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.11",
        },
        body: JSON.stringify(validPayload),
      }),
    );

    const payload = (await response.json()) as {
      code: string;
      fallbackHref: string;
    };

    expect(response.status).toBe(502);
    expect(payload.code).toBe("delivery_rejected");
    expect(payload.fallbackHref).toContain("mailto:");
    expect(consoleError).toHaveBeenCalled();
  });

  it("returns a network error and preserves the mailto fallback when delivery throws before a response", async () => {
    configureFeedbackEmailDelivery();

    const fetchMock = vi.fn().mockRejectedValue(new TypeError("socket hang up"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.12",
        },
        body: JSON.stringify(validPayload),
      }),
    );

    const payload = (await response.json()) as {
      code: string;
      error: string;
      fallbackHref: string;
    };

    expect(response.status).toBe(502);
    expect(payload.code).toBe("delivery_network_error");
    expect(payload.error).toMatch(/failed before the message reached the inbox/i);
    expect(payload.fallbackHref).toContain("mailto:");
    expect(consoleError).toHaveBeenCalled();
  });

  it("returns a timeout-specific error when the delivery provider does not respond in time", async () => {
    configureFeedbackEmailDelivery();

    const timeoutError = Object.assign(new Error("timed out"), {
      name: "AbortError",
    });
    const fetchMock = vi.fn().mockRejectedValue(timeoutError);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.13",
        },
        body: JSON.stringify(validPayload),
      }),
    );

    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(504);
    expect(payload.code).toBe("delivery_timeout");
    expect(payload.error).toMatch(/timed out/i);
    expect(consoleError).toHaveBeenCalled();
  });

  it("silently discards submissions that fill the honeypot field", async () => {
    configureFeedbackEmailDelivery();

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...validPayload,
          website: "spam.example",
        }),
      }),
    );

    const payload = (await response.json()) as {
      ok: boolean;
      delivery: string;
    };

    expect(response.status).toBe(202);
    expect(payload).toMatchObject({
      ok: true,
      delivery: "discarded",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rate-limits repeated submissions from the same browser/network key", async () => {
    configureFeedbackEmailDelivery();

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email_rate_limit" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    for (let index = 0; index < 5; index += 1) {
      const response = await POST(
        new Request("http://localhost/api/feedback", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "203.0.113.99",
            "user-agent": "rate-limit-test",
          },
          body: JSON.stringify(validPayload),
        }),
      );

      expect(response.status).toBe(200);
    }

    const limitedResponse = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.99",
          "user-agent": "rate-limit-test",
        },
        body: JSON.stringify(validPayload),
      }),
    );

    const payload = (await limitedResponse.json()) as {
      code: string;
      error: string;
    };

    expect(limitedResponse.status).toBe(429);
    expect(payload.code).toBe("rate_limited");
    expect(payload.error).toMatch(/too many feedback notes/i);
    expect(limitedResponse.headers.get("retry-after")).toBeTruthy();
  });
});
