// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/ai/coach/route";
import { buildAiLearningContext } from "@/lib/ai/context";
import { checkAiCoachGrounding } from "@/lib/ai/grounding";
import {
  consumeAiRateLimitSlot,
  resetAiRateLimitForTests,
} from "@/lib/ai/rate-limit";
import {
  aiCoachFallbackResponse,
  parseAiCoachResponseOrFallback,
  parseAiCoachResponseText,
  safeParseAiCoachResponseText,
} from "@/lib/ai/response";
import {
  aiCoachRequestSchema,
  aiLearningContextSchema,
} from "@/lib/ai/schema";
import type { AiCoachRequest, AiCoachResponse, AiLearningContext } from "@/lib/ai/types";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptPageRuntimeSnapshot } from "@/lib/learning/conceptPageRuntime";

const mocks = vi.hoisted(() => ({
  generateCoachResponseWithGeminiResultMock: vi.fn(),
  getAccountSessionForCookieHeaderMock: vi.fn(),
}));

vi.mock("@/lib/ai/providers/gemini", () => ({
  generateCoachResponseWithGeminiResult:
    mocks.generateCoachResponseWithGeminiResultMock,
}));

vi.mock("@/lib/account/supabase", () => ({
  getAccountSessionForCookieHeader: mocks.getAccountSessionForCookieHeaderMock,
}));

const originalEnv = {
  AI_FEATURES_ENABLED: process.env.AI_FEATURES_ENABLED,
  AI_LOGGING_ENABLED: process.env.AI_LOGGING_ENABLED,
  AI_RATE_LIMIT_MAX_REQUESTS: process.env.AI_RATE_LIMIT_MAX_REQUESTS,
  AI_RATE_LIMIT_WINDOW_SECONDS: process.env.AI_RATE_LIMIT_WINDOW_SECONDS,
};

const validContext: AiLearningContext = {
  language: "en",
  page: {
    slug: "simple-harmonic-motion",
    title: "Simple Harmonic Motion",
    subject: "physics",
    level: "beginner",
    learningObjectives: ["Connect amplitude to the size of the motion."],
    keyIdeas: ["A larger amplitude makes the turning points farther apart."],
    formulas: ["Restoring pattern: a(t) = -omega^2 x(t)"],
    prerequisites: [],
  },
  simulation: {
    id: "concept-shm",
    controls: {
      amplitude: 1.4,
      omega: 1.8,
      phase: 0,
    },
    currentState: {
      time: 0,
      activeGraphId: "displacement",
    },
    selectedMode: "explore",
  },
  learningFlow: {
    completedSteps: [],
  },
};

const validResponse: AiCoachResponse = {
  action: "Try increasing amplitude once while keeping omega fixed.",
  observe: "Watch whether the displacement peaks move farther from equilibrium.",
  question: "What do you predict will happen to the next peak?",
  citations: [
    { type: "page", label: "Connect amplitude to the size of the motion." },
    { type: "simulation", label: "amplitude control" },
  ],
};

async function postCoachRequest({
  headers,
  request = buildRequest(),
  url = "http://learning.example/api/ai/coach",
}: {
  headers?: HeadersInit;
  request?: AiCoachRequest;
  url?: string;
} = {}) {
  return POST(
    new Request(url, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    }),
  );
}

function buildRequest(overrides?: Partial<AiCoachRequest>): AiCoachRequest {
  return {
    mode: "guide",
    context: validContext,
    ...overrides,
  };
}

describe("AI coach schemas", () => {
  it("accepts a valid AI learning context", () => {
    expect(aiLearningContextSchema.parse(validContext)).toEqual(validContext);
  });

  it("rejects an invalid coach mode", () => {
    const parsed = aiCoachRequestSchema.safeParse({
      mode: "chat",
      context: validContext,
    });

    expect(parsed.success).toBe(false);
  });
});

describe("AI coach response parsing", () => {
  it("accepts valid JSON", () => {
    expect(parseAiCoachResponseText(JSON.stringify(validResponse))).toEqual(validResponse);
  });

  it("handles fenced JSON", () => {
    const parsed = parseAiCoachResponseText(
      `\`\`\`json\n${JSON.stringify(validResponse)}\n\`\`\``,
    );

    expect(parsed).toEqual(validResponse);
  });

  it("rejects malformed JSON", () => {
    expect(safeParseAiCoachResponseText("{not json").ok).toBe(false);
  });

  it("returns the safe fallback for invalid output", () => {
    const result = parseAiCoachResponseOrFallback(JSON.stringify({ action: "" }));

    expect(result.fallbackUsed).toBe(true);
    expect(result.response).toEqual(aiCoachFallbackResponse);
  });
});

describe("AI coach grounding", () => {
  it("accepts known formulas and controls", () => {
    const result = checkAiCoachGrounding({
      request: {
        mode: "guide",
        context: {
          ...validContext,
          page: {
            ...validContext.page,
            formulas: ["Ohm relationship: I = V / R"],
          },
        },
      },
      response: {
        action: "Try increasing voltage while resistance stays fixed.",
        observe: "Watch I = V / R in the current readout.",
        question: "What should happen to current?",
        citations: [
          { type: "formula", label: "I = V / R" },
          { type: "simulation", label: "amplitude control" },
        ],
      },
    });

    expect(result.ok).toBe(true);
  });

  it("rejects unknown formula citations", () => {
    const result = checkAiCoachGrounding({
      request: buildRequest(),
      response: {
        ...validResponse,
        citations: [{ type: "formula", label: "F = ma" }],
      },
    });

    expect(result.ok).toBe(false);
  });

  it("rejects unknown simulation control citations", () => {
    const result = checkAiCoachGrounding({
      request: buildRequest(),
      response: {
        ...validResponse,
        citations: [{ type: "simulation", label: "voltage control" }],
      },
    });

    expect(result.ok).toBe(false);
  });
});

describe("AI coach rate limiter", () => {
  beforeEach(() => {
    resetAiRateLimitForTests();
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "2";
    process.env.AI_RATE_LIMIT_WINDOW_SECONDS = "60";
  });

  afterEach(() => {
    resetAiRateLimitForTests();
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = originalEnv.AI_RATE_LIMIT_MAX_REQUESTS;
    process.env.AI_RATE_LIMIT_WINDOW_SECONDS =
      originalEnv.AI_RATE_LIMIT_WINDOW_SECONDS;
  });

  it("blocks excessive requests inside the window", () => {
    expect(consumeAiRateLimitSlot("learner-1", 1_000).allowed).toBe(true);
    expect(consumeAiRateLimitSlot("learner-1", 1_001).allowed).toBe(true);

    const blocked = consumeAiRateLimitSlot("learner-1", 1_002);

    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBe(60);
    }
  });
});

describe("AI learning context builder", () => {
  it("maps concept content and runtime state into the AI-safe context", () => {
    const concept = getConceptBySlug("simple-harmonic-motion");
    const runtimeSnapshot: ConceptPageRuntimeSnapshot = {
      slug: concept.slug,
      title: concept.title,
      topic: concept.topic,
      params: {
        amplitude: 1.7,
        omega: 1.2,
      },
      time: 1.5,
      timeSource: "inspect",
      activeGraphId: concept.graphs[0].id,
      interactionMode: "compare",
      activeCompareTarget: "a",
      activePresetId: "wide-amplitude",
      overlayValues: {},
      focusedOverlayId: null,
      compare: null,
      featureAvailability: {
        prediction: true,
        compare: true,
        challenge: true,
        guidedOverlays: true,
        noticePrompts: true,
        workedExamples: true,
        quickTest: true,
      },
    };

    const context = buildAiLearningContext({
      concept,
      runtimeSnapshot,
      locale: "en",
    });

    expect(context.page.slug).toBe("simple-harmonic-motion");
    expect(context.page.subject).toBe("physics");
    expect(context.page.level).toBe("beginner");
    expect(context.page.learningObjectives.length).toBeGreaterThan(0);
    expect(context.page.keyIdeas.length).toBeGreaterThan(0);
    expect(context.simulation?.controls.amplitude).toBe(1.7);
    expect(context.simulation?.currentState.time).toBe(1.5);
    expect(context.simulation?.selectedMode).toBe("compare");
  });
});

describe("AI coach route", () => {
  beforeEach(() => {
    resetAiRateLimitForTests();
    process.env.AI_FEATURES_ENABLED = "true";
    process.env.AI_LOGGING_ENABLED = "false";
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "20";
    process.env.AI_RATE_LIMIT_WINDOW_SECONDS = "600";
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(null);
    mocks.generateCoachResponseWithGeminiResultMock.mockResolvedValue({
      response: validResponse,
      fallbackUsed: false,
      attempts: 1,
    });
  });

  afterEach(() => {
    resetAiRateLimitForTests();
    mocks.generateCoachResponseWithGeminiResultMock.mockReset();
    mocks.getAccountSessionForCookieHeaderMock.mockReset();
    process.env.AI_FEATURES_ENABLED = originalEnv.AI_FEATURES_ENABLED;
    process.env.AI_LOGGING_ENABLED = originalEnv.AI_LOGGING_ENABLED;
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = originalEnv.AI_RATE_LIMIT_MAX_REQUESTS;
    process.env.AI_RATE_LIMIT_WINDOW_SECONDS =
      originalEnv.AI_RATE_LIMIT_WINDOW_SECONDS;
  });

  it("returns 400 for invalid payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/ai/coach", {
        method: "POST",
        body: JSON.stringify({
          mode: "chat",
          context: validContext,
        }),
      }),
    );
    const payload = (await response.json()) as { code: string };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("invalid_payload");
    expect(mocks.generateCoachResponseWithGeminiResultMock).not.toHaveBeenCalled();
  });

  it("returns 503 when AI features are disabled", async () => {
    process.env.AI_FEATURES_ENABLED = "false";

    const response = await POST(
      new Request("http://localhost/api/ai/coach", {
        method: "POST",
        body: JSON.stringify(buildRequest()),
      }),
    );
    const payload = (await response.json()) as { code: string };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("ai_features_disabled");
    expect(mocks.generateCoachResponseWithGeminiResultMock).not.toHaveBeenCalled();
  });

  it("ignores client-supplied context.userId when rate limiting", async () => {
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "1";

    const firstResponse = await postCoachRequest({
      request: buildRequest({
        context: {
          ...validContext,
          userId: "client-claimed-user-1",
        },
      }),
    });
    const secondResponse = await postCoachRequest({
      request: buildRequest({
        context: {
          ...validContext,
          userId: "client-claimed-user-2",
        },
      }),
    });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(429);
    expect(mocks.generateCoachResponseWithGeminiResultMock).toHaveBeenCalledTimes(1);
  });

  it("does not let spoofed forwarding headers or user-agent rotation bypass host fallback", async () => {
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "1";

    const firstResponse = await postCoachRequest({
      headers: {
        "user-agent": "rotating-agent-1",
        "x-forwarded-for": "198.51.100.10",
      },
    });
    const secondResponse = await postCoachRequest({
      headers: {
        "user-agent": "rotating-agent-2",
        "x-forwarded-for": "203.0.113.20",
      },
    });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(429);
    expect(mocks.generateCoachResponseWithGeminiResultMock).toHaveBeenCalledTimes(1);
  });

  it("uses cf-connecting-ip as the trusted signed-out network key", async () => {
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "1";

    const firstResponse = await postCoachRequest({
      headers: {
        "cf-connecting-ip": "203.0.113.10",
        "x-forwarded-for": "198.51.100.1",
      },
    });
    const secondResponse = await postCoachRequest({
      headers: {
        "cf-connecting-ip": "203.0.113.10",
        "x-forwarded-for": "198.51.100.2",
      },
    });
    const thirdResponse = await postCoachRequest({
      headers: {
        "cf-connecting-ip": "203.0.113.11",
        "x-forwarded-for": "198.51.100.2",
      },
    });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(429);
    expect(thirdResponse.status).toBe(200);
    expect(mocks.generateCoachResponseWithGeminiResultMock).toHaveBeenCalledTimes(2);
  });

  it("uses server-resolved signed-in user identity before body userId or Cloudflare IP", async () => {
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "1";
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "trusted-session-user",
      },
    });

    const firstResponse = await postCoachRequest({
      headers: {
        cookie: "sb-auth-token=1",
        "cf-connecting-ip": "203.0.113.10",
      },
      request: buildRequest({
        context: {
          ...validContext,
          userId: "client-claimed-user-1",
        },
      }),
    });
    const secondResponse = await postCoachRequest({
      headers: {
        cookie: "sb-auth-token=1",
        "cf-connecting-ip": "203.0.113.11",
      },
      request: buildRequest({
        context: {
          ...validContext,
          userId: "client-claimed-user-2",
        },
      }),
    });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(429);
    expect(mocks.getAccountSessionForCookieHeaderMock).toHaveBeenCalledWith("sb-auth-token=1");
    expect(mocks.generateCoachResponseWithGeminiResultMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to trusted network identity when server session lookup fails", async () => {
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "1";
    mocks.getAccountSessionForCookieHeaderMock.mockRejectedValue(new Error("auth unavailable"));

    const firstResponse = await postCoachRequest({
      headers: {
        "cf-connecting-ip": "203.0.113.10",
      },
    });
    const secondResponse = await postCoachRequest({
      headers: {
        "cf-connecting-ip": "203.0.113.10",
      },
    });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(429);
    expect(mocks.generateCoachResponseWithGeminiResultMock).toHaveBeenCalledTimes(1);
  });
});
