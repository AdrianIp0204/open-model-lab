// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/ai/coach/route";
import { buildAiLearningContext } from "@/lib/ai/context";
import { checkAiCoachGrounding } from "@/lib/ai/grounding";
import {
  consumeAiRateLimitSlot,
  getAiRateLimitBucketCountForTests,
  pruneExpiredAiRateLimitBucketsForTests,
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
  MAX_AI_COACH_REQUEST_BYTES,
} from "@/lib/ai/schema";
import type { AiCoachRequest, AiCoachResponse, AiLearningContext } from "@/lib/ai/types";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import type { AccountSession } from "@/lib/account/model";
import { getDefaultAccountBillingSummary } from "@/lib/billing/model";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptPageRuntimeSnapshot } from "@/lib/learning/conceptPageRuntime";

const mocks = vi.hoisted(() => ({
  generateCoachResponseWithGeminiResultMock: vi.fn(),
  getAccountSessionForCookieHeaderMock: vi.fn(),
  getAiMonthlyTokenUsageForUserMock: vi.fn(),
  recordAiMonthlyTokenUsageForUserMock: vi.fn(),
  getAiMonthlyTokenLimitMock: vi.fn(),
  getCurrentAiUsagePeriodMock: vi.fn(),
  getAiMonthlyQuotaResetAtMock: vi.fn(),
}));

vi.mock("@/lib/ai/providers/gemini", () => ({
  generateCoachResponseWithGeminiResult:
    mocks.generateCoachResponseWithGeminiResultMock,
}));

vi.mock("@/lib/account/supabase", () => ({
  getAccountSessionForCookieHeader: mocks.getAccountSessionForCookieHeaderMock,
}));

vi.mock("@/lib/ai/token-quota", () => ({
  getAiMonthlyTokenUsageForUser: mocks.getAiMonthlyTokenUsageForUserMock,
  recordAiMonthlyTokenUsageForUser: mocks.recordAiMonthlyTokenUsageForUserMock,
  getAiMonthlyTokenLimit: mocks.getAiMonthlyTokenLimitMock,
  getCurrentAiUsagePeriod: mocks.getCurrentAiUsagePeriodMock,
  getAiMonthlyQuotaResetAt: mocks.getAiMonthlyQuotaResetAtMock,
}));

vi.mock("server-only", () => ({}));

const originalEnv = {
  AI_FEATURES_ENABLED: process.env.AI_FEATURES_ENABLED,
  AI_LOGGING_ENABLED: process.env.AI_LOGGING_ENABLED,
  AI_RATE_LIMIT_MAX_REQUESTS: process.env.AI_RATE_LIMIT_MAX_REQUESTS,
  AI_RATE_LIMIT_WINDOW_SECONDS: process.env.AI_RATE_LIMIT_WINDOW_SECONDS,
  AI_RATE_LIMIT_MAX_BUCKETS: process.env.AI_RATE_LIMIT_MAX_BUCKETS,
  AI_MONTHLY_TOKEN_LIMIT: process.env.AI_MONTHLY_TOKEN_LIMIT,
  AI_TRUST_CLOUDFLARE_CONNECTING_IP:
    process.env.AI_TRUST_CLOUDFLARE_CONNECTING_IP,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
};

function restoreEnvValue(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

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

async function postStreamedCoachBody(chunks: string[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }

      controller.close();
    },
  });

  return POST(
    new Request("http://learning.example/api/ai/coach", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" }),
  );
}

function buildRequest(overrides?: Partial<AiCoachRequest>): AiCoachRequest {
  return {
    mode: "guide",
    context: validContext,
    ...overrides,
  };
}

function buildAccountSession({
  userId = "trusted-premium-user",
  tier = "premium",
}: {
  userId?: string;
  tier?: "free" | "premium";
} = {}): AccountSession {
  const entitlement = resolveAccountEntitlement({
    tier,
    source: tier === "premium" ? "stored" : "account-default",
    updatedAt: tier === "premium" ? "2026-05-05T00:00:00.000Z" : null,
  });

  return {
    user: {
      id: userId,
      email: `${userId}@example.test`,
      displayName: "Test learner",
      createdAt: "2026-05-05T00:00:00.000Z",
      lastSignedInAt: null,
    },
    entitlement,
    billing: getDefaultAccountBillingSummary(entitlement),
  };
}

function buildMonthlyUsage(totalTokens = 0) {
  return {
    userId: "trusted-premium-user",
    periodYyyymm: "2026-05",
    totalTokens,
    promptTokens: 0,
    completionTokens: 0,
    thoughtsTokens: 0,
    requestCount: 0,
    updatedAt: null,
  };
}

describe("AI coach schemas", () => {
  it("accepts a valid AI learning context", () => {
    expect(aiLearningContextSchema.parse(validContext)).toEqual(validContext);
  });

  it("rejects oversized learning objective text", () => {
    const parsed = aiCoachRequestSchema.safeParse(
      buildRequest({
        context: {
          ...validContext,
          page: {
            ...validContext.page,
            learningObjectives: ["x".repeat(801)],
          },
        },
      }),
    );

    expect(parsed.success).toBe(false);
  });

  it("rejects oversized formula and key idea arrays", () => {
    const parsed = aiCoachRequestSchema.safeParse(
      buildRequest({
        context: {
          ...validContext,
          page: {
            ...validContext.page,
            keyIdeas: Array.from({ length: 17 }, (_, index) => `idea ${index}`),
            formulas: Array.from({ length: 17 }, (_, index) => `formula ${index}`),
          },
        },
      }),
    );

    expect(parsed.success).toBe(false);
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

  it("matches LaTeX fractions against plain formula text", () => {
    const result = checkAiCoachGrounding({
      request: {
        mode: "guide",
        context: {
          ...validContext,
          page: {
            ...validContext.page,
            formulas: ["Ohm relationship: I = \\frac{V}{R}"],
          },
        },
      },
      response: {
        action: "Try setting voltage while resistance stays fixed.",
        observe: "Watch whether I = V/R changes in the readout.",
        question: "What should happen to current?",
        citations: [{ type: "formula", label: "I = V/R" }],
      },
    });

    expect(result.ok).toBe(true);
  });

  it("matches common LaTeX symbols against plain symbol names", () => {
    const result = checkAiCoachGrounding({
      request: {
        mode: "guide",
        context: {
          ...validContext,
          page: {
            ...validContext.page,
            formulas: ["Restoring pattern: a(t) = -\\omega^2 x(t)"],
          },
        },
      },
      response: {
        action: "Try moving the mass away from equilibrium.",
        observe: "Watch whether a(t) = -omega^2 x(t) points back.",
        question: "What direction should the acceleration have?",
        citations: [{ type: "formula", label: "a(t) = -omega^2 x(t)" }],
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
    restoreEnvValue(
      "AI_RATE_LIMIT_MAX_REQUESTS",
      originalEnv.AI_RATE_LIMIT_MAX_REQUESTS,
    );
    restoreEnvValue(
      "AI_RATE_LIMIT_WINDOW_SECONDS",
      originalEnv.AI_RATE_LIMIT_WINDOW_SECONDS,
    );
    restoreEnvValue(
      "AI_RATE_LIMIT_MAX_BUCKETS",
      originalEnv.AI_RATE_LIMIT_MAX_BUCKETS,
    );
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

  it("prunes expired buckets when a new key is consumed", () => {
    consumeAiRateLimitSlot("learner-1", 1_000);
    consumeAiRateLimitSlot("learner-2", 1_001);

    expect(getAiRateLimitBucketCountForTests()).toBe(2);

    consumeAiRateLimitSlot("learner-3", 61_001);

    expect(getAiRateLimitBucketCountForTests()).toBe(1);
  });

  it("resets an expired bucket for the same key cleanly", () => {
    expect(consumeAiRateLimitSlot("learner-1", 1_000).allowed).toBe(true);
    expect(consumeAiRateLimitSlot("learner-1", 61_000).allowed).toBe(true);

    const nextDecision = consumeAiRateLimitSlot("learner-1", 61_001);

    expect(nextDecision.allowed).toBe(true);
    expect(getAiRateLimitBucketCountForTests()).toBe(1);
  });

  it("keeps the bucket map bounded by the configured cap", () => {
    process.env.AI_RATE_LIMIT_MAX_BUCKETS = "2";

    consumeAiRateLimitSlot("learner-1", 1_000);
    consumeAiRateLimitSlot("learner-2", 1_001);
    consumeAiRateLimitSlot("learner-3", 1_002);

    expect(getAiRateLimitBucketCountForTests()).toBe(2);

    pruneExpiredAiRateLimitBucketsForTests(61_002);

    expect(getAiRateLimitBucketCountForTests()).toBe(0);
  });
});

describe("Gemini coach provider", () => {
  function buildGeminiPayload(
    response: AiCoachResponse,
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      thoughtsTokenCount?: number;
      totalTokenCount?: number;
    },
  ) {
    return {
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(response) }],
          },
        },
      ],
      ...(usageMetadata ? { usageMetadata } : {}),
    };
  }

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.GEMINI_MODEL = "gemini-test-model";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    restoreEnvValue("GEMINI_API_KEY", originalEnv.GEMINI_API_KEY);
    restoreEnvValue("GEMINI_MODEL", originalEnv.GEMINI_MODEL);
  });

  it("retries one transient Gemini HTTP failure before returning a valid response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("temporary failure", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(buildGeminiPayload(validResponse)), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { generateCoachResponseWithGeminiResult } =
      await vi.importActual<typeof import("@/lib/ai/providers/gemini")>(
        "@/lib/ai/providers/gemini",
      );

    const result = await generateCoachResponseWithGeminiResult(buildRequest());

    expect(result.fallbackUsed).toBe(false);
    expect(result.response).toEqual(validResponse);
    expect(result.attempts).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns Gemini usage metadata when the response includes token counts", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify(
          buildGeminiPayload(validResponse, {
            promptTokenCount: 20,
            candidatesTokenCount: 30,
            thoughtsTokenCount: 4,
            totalTokenCount: 54,
          }),
        ),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { generateCoachResponseWithGeminiResult } =
      await vi.importActual<typeof import("@/lib/ai/providers/gemini")>(
        "@/lib/ai/providers/gemini",
      );

    const result = await generateCoachResponseWithGeminiResult(buildRequest());

    expect(result.fallbackUsed).toBe(false);
    expect(result.usage).toEqual({
      promptTokenCount: 20,
      candidatesTokenCount: 30,
      thoughtsTokenCount: 4,
      totalTokenCount: 54,
    });
  });

  it("accumulates usage across invalid and retried Gemini payloads", async () => {
    const invalidPayload = {
      candidates: [
        {
          content: {
            parts: [{ text: "{not-valid-json" }],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 4,
        candidatesTokenCount: 6,
        totalTokenCount: 10,
      },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(invalidPayload), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(
            buildGeminiPayload(validResponse, {
              promptTokenCount: 8,
              candidatesTokenCount: 12,
              totalTokenCount: 20,
            }),
          ),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { generateCoachResponseWithGeminiResult } =
      await vi.importActual<typeof import("@/lib/ai/providers/gemini")>(
        "@/lib/ai/providers/gemini",
      );

    const result = await generateCoachResponseWithGeminiResult(buildRequest());

    expect(result.fallbackUsed).toBe(false);
    expect(result.attempts).toBe(2);
    expect(result.usage).toEqual({
      promptTokenCount: 12,
      candidatesTokenCount: 18,
      thoughtsTokenCount: 0,
      totalTokenCount: 30,
    });
  });

  it("estimates Gemini usage when a successful response omits usage metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify(buildGeminiPayload(validResponse)), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { generateCoachResponseWithGeminiResult } =
      await vi.importActual<typeof import("@/lib/ai/providers/gemini")>(
        "@/lib/ai/providers/gemini",
      );

    const result = await generateCoachResponseWithGeminiResult(buildRequest());

    expect(result.fallbackUsed).toBe(false);
    expect(result.usage?.estimated).toBe(true);
    expect(result.usage?.totalTokenCount).toBeGreaterThan(0);
  });

  it("retries one thrown Gemini fetch failure before returning a valid response", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(buildGeminiPayload(validResponse)), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { generateCoachResponseWithGeminiResult } =
      await vi.importActual<typeof import("@/lib/ai/providers/gemini")>(
        "@/lib/ai/providers/gemini",
      );

    const result = await generateCoachResponseWithGeminiResult(buildRequest());

    expect(result.fallbackUsed).toBe(false);
    expect(result.response).toEqual(validResponse);
    expect(result.attempts).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-retryable Gemini authentication failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const { generateCoachResponseWithGeminiResult } =
      await vi.importActual<typeof import("@/lib/ai/providers/gemini")>(
        "@/lib/ai/providers/gemini",
      );

    const result = await generateCoachResponseWithGeminiResult(buildRequest());

    expect(result.fallbackUsed).toBe(true);
    expect(result.attempts).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
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

  it("maps prediction runtime mode into AI prediction context", () => {
    const concept = getConceptBySlug("simple-harmonic-motion");
    const runtimeSnapshot: ConceptPageRuntimeSnapshot = {
      slug: concept.slug,
      title: concept.title,
      topic: concept.topic,
      params: concept.simulation.defaults,
      time: 0,
      timeSource: "live",
      activeGraphId: concept.graphs[0].id,
      interactionMode: "predict",
      activeCompareTarget: null,
      activePresetId: null,
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

    expect(context.simulation?.selectedMode).toBe("prediction");
  });
});

describe("AI coach route", () => {
  beforeEach(() => {
    resetAiRateLimitForTests();
    process.env.AI_FEATURES_ENABLED = "true";
    process.env.AI_LOGGING_ENABLED = "false";
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "20";
    process.env.AI_RATE_LIMIT_WINDOW_SECONDS = "600";
    process.env.AI_RATE_LIMIT_MAX_BUCKETS = "5000";
    process.env.AI_MONTHLY_TOKEN_LIMIT = "10000000";
    delete process.env.AI_TRUST_CLOUDFLARE_CONNECTING_IP;
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildAccountSession());
    mocks.getAiMonthlyTokenUsageForUserMock.mockResolvedValue(buildMonthlyUsage(0));
    mocks.recordAiMonthlyTokenUsageForUserMock.mockResolvedValue({
      accepted: true,
      usage: buildMonthlyUsage(12),
    });
    mocks.getAiMonthlyTokenLimitMock.mockReturnValue(10_000_000);
    mocks.getCurrentAiUsagePeriodMock.mockReturnValue("2026-05");
    mocks.getAiMonthlyQuotaResetAtMock.mockReturnValue("2026-06-01T00:00:00.000Z");
    mocks.generateCoachResponseWithGeminiResultMock.mockResolvedValue({
      response: validResponse,
      fallbackUsed: false,
      attempts: 1,
      usage: {
        promptTokenCount: 5,
        candidatesTokenCount: 7,
        thoughtsTokenCount: 0,
        totalTokenCount: 12,
      },
    });
  });

  afterEach(() => {
    resetAiRateLimitForTests();
    mocks.generateCoachResponseWithGeminiResultMock.mockReset();
    mocks.getAccountSessionForCookieHeaderMock.mockReset();
    mocks.getAiMonthlyTokenUsageForUserMock.mockReset();
    mocks.recordAiMonthlyTokenUsageForUserMock.mockReset();
    mocks.getAiMonthlyTokenLimitMock.mockReset();
    mocks.getCurrentAiUsagePeriodMock.mockReset();
    mocks.getAiMonthlyQuotaResetAtMock.mockReset();
    restoreEnvValue("AI_FEATURES_ENABLED", originalEnv.AI_FEATURES_ENABLED);
    restoreEnvValue("AI_LOGGING_ENABLED", originalEnv.AI_LOGGING_ENABLED);
    restoreEnvValue(
      "AI_RATE_LIMIT_MAX_REQUESTS",
      originalEnv.AI_RATE_LIMIT_MAX_REQUESTS,
    );
    restoreEnvValue(
      "AI_RATE_LIMIT_WINDOW_SECONDS",
      originalEnv.AI_RATE_LIMIT_WINDOW_SECONDS,
    );
    restoreEnvValue(
      "AI_RATE_LIMIT_MAX_BUCKETS",
      originalEnv.AI_RATE_LIMIT_MAX_BUCKETS,
    );
    restoreEnvValue("AI_MONTHLY_TOKEN_LIMIT", originalEnv.AI_MONTHLY_TOKEN_LIMIT);
    restoreEnvValue(
      "AI_TRUST_CLOUDFLARE_CONNECTING_IP",
      originalEnv.AI_TRUST_CLOUDFLARE_CONNECTING_IP,
    );
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

  it("rejects oversized context before rate limit, quota, or Gemini", async () => {
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "1";

    const oversizedResponse = await postCoachRequest({
      request: buildRequest({
        context: {
          ...validContext,
          page: {
            ...validContext.page,
            learningObjectives: ["x".repeat(801)],
          },
        },
      }),
    });
    const oversizedPayload = (await oversizedResponse.json()) as { code: string };

    expect(oversizedResponse.status).toBe(400);
    expect(oversizedPayload.code).toBe("invalid_payload");
    expect(mocks.getAiMonthlyTokenUsageForUserMock).not.toHaveBeenCalled();
    expect(mocks.recordAiMonthlyTokenUsageForUserMock).not.toHaveBeenCalled();
    expect(mocks.generateCoachResponseWithGeminiResultMock).not.toHaveBeenCalled();

    const validResponseAfterInvalidPayload = await postCoachRequest();

    expect(validResponseAfterInvalidPayload.status).toBe(200);
  });

  it("rejects chunked oversized bodies before rate limit, quota, or Gemini", async () => {
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "1";

    const oversizedResponse = await postStreamedCoachBody([
      '{"mode":"guide","context":',
      `"${"x".repeat(MAX_AI_COACH_REQUEST_BYTES + 1)}"`,
      "}",
    ]);
    const oversizedPayload = (await oversizedResponse.json()) as { code: string };

    expect(oversizedResponse.status).toBe(400);
    expect(oversizedPayload.code).toBe("invalid_payload");
    expect(mocks.getAiMonthlyTokenUsageForUserMock).not.toHaveBeenCalled();
    expect(mocks.recordAiMonthlyTokenUsageForUserMock).not.toHaveBeenCalled();
    expect(mocks.generateCoachResponseWithGeminiResultMock).not.toHaveBeenCalled();

    const validResponseAfterInvalidPayload = await postCoachRequest();

    expect(validResponseAfterInvalidPayload.status).toBe(200);
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

  it("returns 401 for signed-out requests and does not call Gemini", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(null);

    const response = await postCoachRequest();
    const payload = (await response.json()) as { code: string };

    expect(response.status).toBe(401);
    expect(payload.code).toBe("ai_auth_required");
    expect(mocks.generateCoachResponseWithGeminiResultMock).not.toHaveBeenCalled();
    expect(mocks.getAiMonthlyTokenUsageForUserMock).not.toHaveBeenCalled();
  });

  it("returns 403 for signed-in free requests and does not call Gemini", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(
      buildAccountSession({
        userId: "trusted-free-user",
        tier: "free",
      }),
    );

    const response = await postCoachRequest();
    const payload = (await response.json()) as { code: string };

    expect(response.status).toBe(403);
    expect(payload.code).toBe("ai_premium_required");
    expect(mocks.generateCoachResponseWithGeminiResultMock).not.toHaveBeenCalled();
    expect(mocks.getAiMonthlyTokenUsageForUserMock).not.toHaveBeenCalled();
  });

  it("allows signed-in premium requests to call Gemini", async () => {
    const response = await postCoachRequest();
    const payload = (await response.json()) as AiCoachResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual(validResponse);
    expect(mocks.getAccountSessionForCookieHeaderMock).toHaveBeenCalled();
    expect(mocks.generateCoachResponseWithGeminiResultMock).toHaveBeenCalledTimes(1);
  });

  it("ignores client-supplied context.userId when rate limiting premium users", async () => {
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "1";
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(
      buildAccountSession({
        userId: "trusted-session-user",
        tier: "premium",
      }),
    );

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

  it("rate-limits premium users before monthly quota lookup or Gemini", async () => {
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "1";

    const firstResponse = await postCoachRequest();
    expect(firstResponse.status).toBe(200);

    mocks.getAiMonthlyTokenUsageForUserMock.mockClear();
    mocks.recordAiMonthlyTokenUsageForUserMock.mockClear();
    mocks.generateCoachResponseWithGeminiResultMock.mockClear();

    const secondResponse = await postCoachRequest();
    const payload = (await secondResponse.json()) as { code: string };

    expect(secondResponse.status).toBe(429);
    expect(payload.code).toBe("rate_limited");
    expect(mocks.getAiMonthlyTokenUsageForUserMock).not.toHaveBeenCalled();
    expect(mocks.recordAiMonthlyTokenUsageForUserMock).not.toHaveBeenCalled();
    expect(mocks.generateCoachResponseWithGeminiResultMock).not.toHaveBeenCalled();
  });

  it("returns a specific setup error when monthly quota storage is unavailable", async () => {
    mocks.getAiMonthlyTokenUsageForUserMock.mockRejectedValue(
      new Error("quota table unavailable"),
    );

    const response = await postCoachRequest();
    const payload = (await response.json()) as {
      code: string;
      requestId?: string;
      details?: { period?: string; resetAt?: string };
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("ai_quota_storage_unavailable");
    expect(payload.requestId).toEqual(expect.any(String));
    expect(payload.details?.period).toBe("2026-05");
    expect(payload.details?.resetAt).toBe("2026-06-01T00:00:00.000Z");
    expect(mocks.generateCoachResponseWithGeminiResultMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the monthly quota is exhausted and does not call Gemini", async () => {
    mocks.getAiMonthlyTokenUsageForUserMock.mockResolvedValue(buildMonthlyUsage(10_000_000));

    const response = await postCoachRequest();
    const payload = (await response.json()) as {
      code: string;
      details?: { period?: string; resetAt?: string };
    };

    expect(response.status).toBe(429);
    expect(payload.code).toBe("ai_monthly_quota_exceeded");
    expect(payload.details?.period).toBe("2026-05");
    expect(payload.details?.resetAt).toBe("2026-06-01T00:00:00.000Z");
    expect(mocks.generateCoachResponseWithGeminiResultMock).not.toHaveBeenCalled();
  });

  it("records Gemini usage metadata after a successful response", async () => {
    await postCoachRequest();

    expect(mocks.recordAiMonthlyTokenUsageForUserMock).toHaveBeenCalledWith({
      userId: "trusted-premium-user",
      periodYyyymm: "2026-05",
      monthlyTokenLimit: 10_000_000,
      usage: {
        promptTokenCount: 5,
        candidatesTokenCount: 7,
        thoughtsTokenCount: 0,
        totalTokenCount: 12,
      },
    });
  });

  it("records estimated Gemini usage when the provider returns an estimate", async () => {
    mocks.generateCoachResponseWithGeminiResultMock.mockResolvedValue({
      response: validResponse,
      fallbackUsed: false,
      attempts: 1,
      usage: {
        promptTokenCount: 11,
        candidatesTokenCount: 13,
        thoughtsTokenCount: 0,
        totalTokenCount: 24,
        estimated: true,
      },
    });

    await postCoachRequest();

    expect(mocks.recordAiMonthlyTokenUsageForUserMock).toHaveBeenCalledWith({
      userId: "trusted-premium-user",
      periodYyyymm: "2026-05",
      monthlyTokenLimit: 10_000_000,
      usage: {
        promptTokenCount: 11,
        candidatesTokenCount: 13,
        thoughtsTokenCount: 0,
        totalTokenCount: 24,
        estimated: true,
      },
    });
  });

  it("returns the generated response when atomic recording crosses the monthly quota", async () => {
    mocks.getAiMonthlyTokenUsageForUserMock.mockResolvedValue(
      buildMonthlyUsage(9_999_990),
    );
    mocks.recordAiMonthlyTokenUsageForUserMock.mockResolvedValue({
      accepted: false,
      usage: buildMonthlyUsage(10_000_002),
    });

    const response = await postCoachRequest();
    const payload = (await response.json()) as AiCoachResponse;

    expect(response.status).toBe(200);
    expect(response.headers.get("x-ai-monthly-quota-exceeded")).toBe("true");
    expect(response.headers.get("x-ai-monthly-quota-period")).toBe("2026-05");
    expect(response.headers.get("x-ai-monthly-quota-reset-at")).toBe(
      "2026-06-01T00:00:00.000Z",
    );
    expect(payload).toEqual(validResponse);
    expect(mocks.generateCoachResponseWithGeminiResultMock).toHaveBeenCalledTimes(1);
    expect(mocks.recordAiMonthlyTokenUsageForUserMock).toHaveBeenCalledWith({
      userId: "trusted-premium-user",
      periodYyyymm: "2026-05",
      monthlyTokenLimit: 10_000_000,
      usage: {
        promptTokenCount: 5,
        candidatesTokenCount: 7,
        thoughtsTokenCount: 0,
        totalTokenCount: 12,
      },
    });
  });

  it("returns a specific setup error when provider config is missing", async () => {
    mocks.generateCoachResponseWithGeminiResultMock.mockResolvedValue({
      response: aiCoachFallbackResponse,
      fallbackUsed: true,
      failureCode: "provider_unconfigured",
      failureReason: "Gemini API key is not configured.",
      attempts: 0,
    });

    const response = await postCoachRequest();
    const payload = (await response.json()) as { code: string; requestId?: string };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("ai_provider_unconfigured");
    expect(payload.requestId).toEqual(expect.any(String));
    expect(mocks.recordAiMonthlyTokenUsageForUserMock).not.toHaveBeenCalled();
  });

  it("returns a specific provider error when Gemini transport fails", async () => {
    mocks.generateCoachResponseWithGeminiResultMock.mockResolvedValue({
      response: aiCoachFallbackResponse,
      fallbackUsed: true,
      failureCode: "provider_unavailable",
      failureReason: "Gemini request failed.",
      attempts: 2,
    });

    const response = await postCoachRequest();
    const payload = (await response.json()) as { code: string; requestId?: string };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("ai_provider_unavailable");
    expect(payload.requestId).toEqual(expect.any(String));
    expect(mocks.recordAiMonthlyTokenUsageForUserMock).not.toHaveBeenCalled();
  });

  it("returns a specific setup error when token usage cannot be recorded", async () => {
    mocks.recordAiMonthlyTokenUsageForUserMock.mockRejectedValue(
      new Error("quota rpc unavailable"),
    );

    const response = await postCoachRequest();
    const payload = (await response.json()) as {
      code: string;
      requestId?: string;
      details?: { period?: string; resetAt?: string };
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("ai_quota_record_failed");
    expect(payload.requestId).toEqual(expect.any(String));
    expect(payload.details?.period).toBe("2026-05");
    expect(payload.details?.resetAt).toBe("2026-06-01T00:00:00.000Z");
    expect(mocks.generateCoachResponseWithGeminiResultMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the request-rate limiter on the trusted premium user id", async () => {
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "1";
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(
      buildAccountSession({
        userId: "trusted-session-user",
        tier: "premium",
      }),
    );

    const firstResponse = await postCoachRequest({
      headers: {
        "cf-connecting-ip": "203.0.113.10",
        "user-agent": "rotating-agent-1",
        "x-forwarded-for": "198.51.100.1",
      },
    });
    const secondResponse = await postCoachRequest({
      headers: {
        "cf-connecting-ip": "203.0.113.11",
        "user-agent": "rotating-agent-2",
        "x-forwarded-for": "198.51.100.2",
      },
    });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(429);
    expect(mocks.generateCoachResponseWithGeminiResultMock).toHaveBeenCalledTimes(1);
  });
});
