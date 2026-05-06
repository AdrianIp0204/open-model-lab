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
const DEFAULT_MAX_BUCKETS = 5_000;
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
    maxBuckets: readPositiveInteger(
      process.env.AI_RATE_LIMIT_MAX_BUCKETS,
      DEFAULT_MAX_BUCKETS,
    ),
  };
}

function pruneExpiredAiRateLimitBuckets(now: number) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function enforceAiRateLimitBucketCap(maxBuckets: number, protectedKey: string) {
  if (buckets.size <= maxBuckets) {
    return;
  }

  const evictionCandidates = [...buckets.entries()]
    .filter(([key]) => key !== protectedKey)
    .sort(
      ([leftKey, leftBucket], [rightKey, rightBucket]) =>
        leftBucket.resetAt - rightBucket.resetAt || leftKey.localeCompare(rightKey),
    );

  for (const [key] of evictionCandidates) {
    if (buckets.size <= maxBuckets) {
      return;
    }

    buckets.delete(key);
  }
}

export function consumeAiRateLimitSlot(
  key: string,
  now = Date.now(),
): AiRateLimitDecision {
  const { maxRequests, windowSeconds, maxBuckets } = getAiRateLimitConfig();
  const normalizedKey = key.trim() || "anonymous";

  pruneExpiredAiRateLimitBuckets(now);

  const existing = buckets.get(normalizedKey);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowSeconds * 1000;

    buckets.set(normalizedKey, {
      count: 1,
      resetAt,
    });
    enforceAiRateLimitBucketCap(maxBuckets, normalizedKey);

    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - 1),
      resetAt,
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

export function getAiRateLimitBucketCountForTests() {
  return buckets.size;
}

export function pruneExpiredAiRateLimitBucketsForTests(now = Date.now()) {
  pruneExpiredAiRateLimitBuckets(now);
}
