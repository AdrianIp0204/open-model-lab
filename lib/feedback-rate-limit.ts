const feedbackRateLimitWindowMs = 10 * 60 * 1000;
const feedbackRateLimitMaxSubmissions = 5;
const feedbackRateLimitBuckets = new Map<string, number[]>();

export function consumeFeedbackRateLimitSlot(key: string, now = Date.now()) {
  const existingTimestamps = feedbackRateLimitBuckets.get(key) ?? [];
  const recentTimestamps = existingTimestamps.filter(
    (timestamp) => now - timestamp < feedbackRateLimitWindowMs,
  );

  if (recentTimestamps.length >= feedbackRateLimitMaxSubmissions) {
    const retryAfterMs = feedbackRateLimitWindowMs - (now - recentTimestamps[0]);

    feedbackRateLimitBuckets.set(key, recentTimestamps);

    return {
      allowed: false as const,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  recentTimestamps.push(now);
  feedbackRateLimitBuckets.set(key, recentTimestamps);

  for (const [bucketKey, timestamps] of feedbackRateLimitBuckets.entries()) {
    const nextTimestamps = timestamps.filter(
      (timestamp) => now - timestamp < feedbackRateLimitWindowMs,
    );

    if (nextTimestamps.length === 0) {
      feedbackRateLimitBuckets.delete(bucketKey);
      continue;
    }

    if (nextTimestamps.length !== timestamps.length) {
      feedbackRateLimitBuckets.set(bucketKey, nextTimestamps);
    }
  }

  return {
    allowed: true as const,
  };
}

export function resetFeedbackRateLimitForTests() {
  feedbackRateLimitBuckets.clear();
}
