type AiRateLimitBucket = {
  count: number;
  resetAt: number;
};

export type AiRateLimitDecision =
  | {
      allowed: true;
      remaining: number;
      resetAt: number;
    }
  | {
      allowed: false;
      remaining: 0;
      resetAt: number;
      retryAfterSeconds: number;
    };

const DEFAULT_MAX_REQUESTS = 20;
const DEFAULT_WINDOW_SECONDS = 600;
const buckets = new Map<string, AiRateLimitBucket>();

function readPositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getAiRateLimitConfig() {
  return {
    maxRequests: readPositiveInteger(
      process.env.AI_RATE_LIMIT_MAX_REQUESTS,
      DEFAULT_MAX_REQUESTS,
    ),
    windowSeconds: readPositiveInteger(
      process.env.AI_RATE_LIMIT_WINDOW_SECONDS,
      DEFAULT_WINDOW_SECONDS,
    ),
  };
}

export function consumeAiRateLimitSlot(
  key: string,
  now = Date.now(),
): AiRateLimitDecision {
  const { maxRequests, windowSeconds } = getAiRateLimitConfig();
  const normalizedKey = key.trim() || "anonymous";
  const existing = buckets.get(normalizedKey);

  if (!existing || existing.resetAt <= now) {
    buckets.set(normalizedKey, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });

    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - 1),
      resetAt: now + windowSeconds * 1000,
    };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - existing.count),
    resetAt: existing.resetAt,
  };
}

export function resetAiRateLimitForTests() {
  buckets.clear();
}
