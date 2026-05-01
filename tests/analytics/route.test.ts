import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/analytics/route";

describe("analytics route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("forwards whitelisted learning events and strips unexpected payload fields", async () => {
    vi.stubEnv("ANALYTICS_WEBHOOK_URL", "https://example.com/analytics");
    vi.stubEnv("ANALYTICS_WEBHOOK_TOKEN", "analytics-token");

    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));

    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/analytics", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "feedback_submitted",
          payload: {
            pagePath: "/contact",
            pageTitle: "Contact",
            pageKind: "contact",
            feedbackCategory: "bug",
            surface: "page",
            message: "This should never reach the webhook.",
            contact: "teacher@example.com",
          },
        }),
      }),
    );

    const payload = (await response.json()) as {
      accepted: boolean;
      delivery: string;
      requestId: string;
    };

    expect(response.status).toBe(202);
    expect(payload).toMatchObject({
      accepted: true,
      delivery: "webhook",
      requestId: expect.any(String),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;

    expect(url).toBe("https://example.com/analytics");
    expect(init).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer analytics-token",
          "content-type": "application/json",
          "x-open-model-lab-analytics-source": "open-model-lab-learning-signals",
        }),
      }),
    );
    expect(body).toMatchObject({
      requestId: payload.requestId,
      source: "open-model-lab-learning-signals",
      event: "feedback_submitted",
      payload: {
        pagePath: "/contact",
        pageKind: "contact",
        feedbackCategory: "bug",
        surface: "page",
      },
      privacy: {
        personalData: "excluded",
      },
    });
    expect(body.payload).not.toHaveProperty("message");
    expect(body.payload).not.toHaveProperty("contact");
  });

  it("accepts events without forwarding when analytics is not configured", async () => {
    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/analytics", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "page_discovery",
          payload: {
            pagePath: "/concepts",
            pageKind: "concepts",
          },
        }),
      }),
    );

    const payload = (await response.json()) as {
      accepted: boolean;
      delivery: string;
    };

    expect(response.status).toBe(202);
    expect(payload).toMatchObject({
      accepted: true,
      delivery: "disabled",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed analytics payloads before forwarding", async () => {
    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/analytics", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "unknown-event",
          payload: {
            pagePath: "/concepts",
          },
        }),
      }),
    );

    const payload = (await response.json()) as {
      accepted: boolean;
      code: string;
    };

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      accepted: false,
      code: "invalid_payload",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
