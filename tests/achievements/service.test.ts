// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACHIEVEMENT_REWARD_STUDY_HOURS_TARGET,
  ACHIEVEMENT_REWARD_CHALLENGE_TARGET,
  ACHIEVEMENT_REWARD_KEY,
  ACHIEVEMENT_REWARD_STUDY_SECONDS_TARGET,
} from "@/lib/achievements";
import { getConceptBySlug, getStarterTrackBySlug } from "@/lib/content";
import type {
  AchievementActiveSessionRow,
  AchievementProgressKeyRow,
  AchievementStatsRow,
  EarnedAchievementRow,
  RewardUnlockRow,
} from "@/lib/achievements/store";
import type { StoredBillingProfileRow } from "@/lib/billing/store";

const achievementStore = vi.hoisted(() => {
  const state = {
    statsByUser: new Map<string, AchievementStatsRow>(),
    progressKeysByCompositeKey: new Map<string, AchievementProgressKeyRow>(),
    earnedByCompositeKey: new Map<string, EarnedAchievementRow>(),
    rewardsByCompositeKey: new Map<string, RewardUnlockRow>(),
    activeSessionsByCompositeKey: new Map<string, AchievementActiveSessionRow>(),
    billingProfilesByUser: new Map<string, StoredBillingProfileRow | Error>(),
    authenticatedBillingLookupUserIds: [] as string[],
  };

  return {
    state,
    reset() {
      state.statsByUser.clear();
      state.progressKeysByCompositeKey.clear();
      state.earnedByCompositeKey.clear();
      state.rewardsByCompositeKey.clear();
      state.activeSessionsByCompositeKey.clear();
      state.billingProfilesByUser.clear();
      state.authenticatedBillingLookupUserIds = [];
    },
    progressKey(userId: string, recordType: string, recordKey: string) {
      return `${userId}::${recordType}::${recordKey}`;
    },
    earnedKey(userId: string, achievementKey: string) {
      return `${userId}::${achievementKey}`;
    },
    rewardKey(userId: string, rewardKey: string) {
      return `${userId}::${rewardKey}`;
    },
    sessionKey(userId: string, sessionId: string) {
      return `${userId}::${sessionId}`;
    },
  };
});

vi.mock("@/lib/achievements/store", () => ({
  getAchievementStatsRow: async (userId: string) =>
    achievementStore.state.statsByUser.get(userId) ?? null,
  getAchievementStatsRowForAuthenticatedUser: async (userId: string) =>
    achievementStore.state.statsByUser.get(userId) ?? null,
  ensureAchievementStatsRow: async (userId: string) => {
    const existing = achievementStore.state.statsByUser.get(userId);

    if (existing) {
      return existing;
    }

    const row = {
      user_id: userId,
      concept_visit_count: 0,
      question_answer_count: 0,
      distinct_challenge_completion_count: 0,
      distinct_track_completion_count: 0,
      active_study_seconds: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    achievementStore.state.statsByUser.set(userId, row);
    return row;
  },
  saveAchievementStatsRow: async (row: AchievementStatsRow) => {
    achievementStore.state.statsByUser.set(row.user_id, row);
    return row;
  },
  saveAchievementStatsRowIfCurrentMatches: async (input: {
    currentRow: AchievementStatsRow;
    nextRow: AchievementStatsRow;
  }) => {
    const existing = achievementStore.state.statsByUser.get(input.currentRow.user_id) ?? null;

    if (
      !existing ||
      existing.concept_visit_count !== input.currentRow.concept_visit_count ||
      existing.question_answer_count !== input.currentRow.question_answer_count ||
      existing.distinct_challenge_completion_count !==
        input.currentRow.distinct_challenge_completion_count ||
      existing.distinct_track_completion_count !==
        input.currentRow.distinct_track_completion_count ||
      existing.active_study_seconds !== input.currentRow.active_study_seconds ||
      existing.updated_at !== input.currentRow.updated_at
    ) {
      return null;
    }

    achievementStore.state.statsByUser.set(input.currentRow.user_id, input.nextRow);
    return input.nextRow;
  },
  countQualifiedAchievementProgressKeyRows: async (userId: string, recordType: string) =>
    Array.from(achievementStore.state.progressKeysByCompositeKey.values()).filter(
      (row) =>
        row.user_id === userId &&
        row.record_type === recordType &&
        Boolean(row.qualified_at),
    ).length,
  getAchievementProgressKeyRow: async (
    userId: string,
    recordType: string,
    recordKey: string,
  ) =>
    achievementStore.state.progressKeysByCompositeKey.get(
      achievementStore.progressKey(userId, recordType, recordKey),
    ) ?? null,
  saveAchievementProgressKeyRow: async (row: AchievementProgressKeyRow) => {
    achievementStore.state.progressKeysByCompositeKey.set(
      achievementStore.progressKey(row.user_id, row.record_type, row.record_key),
      row,
    );
    return row;
  },
  insertAchievementProgressKeyRow: async (row: AchievementProgressKeyRow) => {
    const key = achievementStore.progressKey(row.user_id, row.record_type, row.record_key);

    if (achievementStore.state.progressKeysByCompositeKey.has(key)) {
      return null;
    }

    achievementStore.state.progressKeysByCompositeKey.set(key, row);
    return row;
  },
  saveAchievementProgressKeyMetadataRow: async (row: AchievementProgressKeyRow) => {
    const key = achievementStore.progressKey(row.user_id, row.record_type, row.record_key);
    const existing = achievementStore.state.progressKeysByCompositeKey.get(key);
    const updated = {
      ...row,
      qualified_at: existing?.qualified_at ?? row.qualified_at ?? null,
      metadata: row.metadata ?? {},
      created_at: existing?.created_at ?? row.created_at,
    };

    achievementStore.state.progressKeysByCompositeKey.set(key, updated);
    return updated;
  },
  qualifyAchievementProgressKeyRowIfPending: async (row: AchievementProgressKeyRow) => {
    const key = achievementStore.progressKey(row.user_id, row.record_type, row.record_key);
    const existing = achievementStore.state.progressKeysByCompositeKey.get(key);

    if (!existing || existing.qualified_at) {
      return null;
    }

    const updated = {
      ...existing,
      concept_slug: row.concept_slug,
      challenge_id: row.challenge_id,
      track_slug: row.track_slug,
      qualified_at: row.qualified_at,
      metadata: row.metadata ?? existing.metadata,
      updated_at: row.updated_at,
    };

    achievementStore.state.progressKeysByCompositeKey.set(key, updated);
    return updated;
  },
  getEarnedAchievementRows: async (userId: string) =>
    Array.from(achievementStore.state.earnedByCompositeKey.values())
      .filter((row) => row.user_id === userId)
      .sort((left, right) => left.earned_at.localeCompare(right.earned_at)),
  getEarnedAchievementRowsForAuthenticatedUser: async (userId: string) =>
    Array.from(achievementStore.state.earnedByCompositeKey.values())
      .filter((row) => row.user_id === userId)
      .sort((left, right) => left.earned_at.localeCompare(right.earned_at)),
  insertEarnedAchievementRow: async (row: EarnedAchievementRow) => {
    const key = achievementStore.earnedKey(row.user_id, row.achievement_key);

    if (achievementStore.state.earnedByCompositeKey.has(key)) {
      return false;
    }

    achievementStore.state.earnedByCompositeKey.set(key, row);
    return true;
  },
  getRewardUnlockRow: async (userId: string, rewardKey: string) =>
    achievementStore.state.rewardsByCompositeKey.get(
      achievementStore.rewardKey(userId, rewardKey),
    ) ?? null,
  getRewardUnlockRowForAuthenticatedUser: async (userId: string, rewardKey: string) =>
    achievementStore.state.rewardsByCompositeKey.get(
      achievementStore.rewardKey(userId, rewardKey),
    ) ?? null,
  saveRewardUnlockRow: async (row: RewardUnlockRow) => {
    achievementStore.state.rewardsByCompositeKey.set(
      achievementStore.rewardKey(row.user_id, row.reward_key),
      row,
    );
    return row;
  },
  reserveRewardUnlockRow: async (input: {
    userId: string;
    rewardKey: string;
    claimedAt: string;
  }) => {
    const key = achievementStore.rewardKey(input.userId, input.rewardKey);
    const row = achievementStore.state.rewardsByCompositeKey.get(key);

    if (!row || row.status !== "unlocked" || row.expires_at <= input.claimedAt) {
      return null;
    }

    const updated = {
      ...row,
      status: "claimed" as const,
      claimed_at: input.claimedAt,
      claim_checkout_session_id: null,
      claim_coupon_id: null,
      claim_price_id: null,
    };

    achievementStore.state.rewardsByCompositeKey.set(key, updated);
    return updated;
  },
  attachRewardCheckoutSessionToClaimRow: async (input: {
    userId: string;
    rewardKey: string;
    checkoutSessionId: string;
    couponId: string;
    priceId: string;
  }) => {
    const key = achievementStore.rewardKey(input.userId, input.rewardKey);
    const row = achievementStore.state.rewardsByCompositeKey.get(key);

    if (!row || row.status !== "claimed") {
      return null;
    }

    const updated = {
      ...row,
      claim_checkout_session_id: input.checkoutSessionId,
      claim_coupon_id: input.couponId,
      claim_price_id: input.priceId,
    };

    achievementStore.state.rewardsByCompositeKey.set(key, updated);
    return updated;
  },
  releaseRewardUnlockClaimRow: async (input: {
    userId: string;
    rewardKey: string;
    checkoutSessionId?: string | null;
  }) => {
    const key = achievementStore.rewardKey(input.userId, input.rewardKey);
    const row = achievementStore.state.rewardsByCompositeKey.get(key);

    if (
      !row ||
      row.status !== "claimed" ||
      (input.checkoutSessionId && row.claim_checkout_session_id !== input.checkoutSessionId)
    ) {
      return null;
    }

    const updated = {
      ...row,
      status: "unlocked" as const,
      claimed_at: null,
      claim_checkout_session_id: null,
      claim_coupon_id: null,
      claim_price_id: null,
    };

    achievementStore.state.rewardsByCompositeKey.set(key, updated);
    return updated;
  },
  markRewardUnlockUsedRow: async (input: {
    userId: string;
    rewardKey: string;
    usedAt: string;
    subscriptionId: string | null;
  }) => {
    const key = achievementStore.rewardKey(input.userId, input.rewardKey);
    const row = achievementStore.state.rewardsByCompositeKey.get(key);

    if (!row || !["claimed", "unlocked"].includes(row.status)) {
      return null;
    }

    const updated = {
      ...row,
      status: "used" as const,
      used_at: input.usedAt,
      used_subscription_id: input.subscriptionId,
    };

    achievementStore.state.rewardsByCompositeKey.set(key, updated);
    return updated;
  },
  getAchievementActiveSessionRow: async (userId: string, sessionId: string) =>
    achievementStore.state.activeSessionsByCompositeKey.get(
      achievementStore.sessionKey(userId, sessionId),
    ) ?? null,
  sumAchievementActiveStudySeconds: async (userId: string) =>
    Array.from(achievementStore.state.activeSessionsByCompositeKey.values())
      .filter((row) => row.user_id === userId)
      .reduce((total, row) => total + row.active_study_seconds, 0),
  saveAchievementActiveSessionRow: async (row: AchievementActiveSessionRow) => {
    achievementStore.state.activeSessionsByCompositeKey.set(
      achievementStore.sessionKey(row.user_id, row.session_id),
      row,
    );
    return row;
  },
}));

vi.mock("@/lib/billing/store", () => ({
  getStoredBillingProfileForUser: async (userId: string) => {
    const value = achievementStore.state.billingProfilesByUser.get(userId);

    if (value instanceof Error) {
      throw value;
    }

    return value ?? null;
  },
  getStoredBillingProfileForAuthenticatedUser: async (userId: string) => {
    achievementStore.state.authenticatedBillingLookupUserIds.push(userId);
    const value = achievementStore.state.billingProfilesByUser.get(userId);

    if (value instanceof Error) {
      throw value;
    }

    return value ?? null;
  },
}));

import {
  attachAchievementRewardCheckoutSession,
  getAccountAchievementDashboardSnapshot,
  getAccountAchievementOverview,
  getAccountAchievementOverviewForAuthenticatedUser,
  getAchievementRewardForCheckout,
  reconcileAchievementStatsFromSource,
  recordAccountAchievementEvent,
  releaseAchievementRewardCheckoutClaim,
  reserveAchievementRewardForCheckout,
  syncAchievementsFromTrustedProgressSnapshot,
} from "@/lib/achievements/service";

function setStats(
  userId: string,
  overrides: Partial<{
    concept_visit_count: number;
    question_answer_count: number;
    distinct_challenge_completion_count: number;
    distinct_track_completion_count: number;
    active_study_seconds: number;
  }> = {},
) {
  achievementStore.state.statsByUser.set(userId, {
    user_id: userId,
    concept_visit_count: overrides.concept_visit_count ?? 0,
    question_answer_count: overrides.question_answer_count ?? 0,
    distinct_challenge_completion_count: overrides.distinct_challenge_completion_count ?? 0,
    distinct_track_completion_count: overrides.distinct_track_completion_count ?? 0,
    active_study_seconds: overrides.active_study_seconds ?? 0,
    created_at: "2026-04-03T00:00:00.000Z",
    updated_at: "2026-04-03T00:00:00.000Z",
  });
}

function seedQualifiedProgressRows(
  userId: string,
  recordType: "concept" | "question" | "challenge" | "track",
  count: number,
) {
  for (let index = 0; index < count; index += 1) {
    const recordKey = `${recordType}-${index + 1}`;

    achievementStore.state.progressKeysByCompositeKey.set(
      achievementStore.progressKey(userId, recordType, recordKey),
      {
        user_id: userId,
        record_type: recordType,
        record_key: recordKey,
        concept_slug:
          recordType === "concept" || recordType === "question" || recordType === "challenge"
            ? `concept-${index + 1}`
            : null,
        challenge_id: recordType === "challenge" ? `challenge-${index + 1}` : null,
        track_slug: recordType === "track" ? `track-${index + 1}` : null,
        qualified_at: `2026-04-03T00:${String(index).padStart(2, "0")}:00.000Z`,
        metadata: {},
        created_at: "2026-04-03T00:00:00.000Z",
        updated_at: "2026-04-03T00:00:00.000Z",
      },
    );
  }
}

function seedActiveStudySessionTotal(userId: string, activeStudySeconds: number) {
  achievementStore.state.activeSessionsByCompositeKey.set(
    achievementStore.sessionKey(userId, "session-seeded"),
    {
      user_id: userId,
      session_id: "session-seeded",
      concept_slug: "projectile-motion",
      last_heartbeat_slot: null,
      interaction_count: 0,
      active_study_seconds: activeStudySeconds,
      last_seen_at: "2026-04-03T00:00:00.000Z",
      created_at: "2026-04-03T00:00:00.000Z",
      updated_at: "2026-04-03T00:00:00.000Z",
    },
  );
}

function setEarnedAchievement(userId: string, achievementKey: string, earnedAt = "2026-04-03T00:00:00.000Z") {
  achievementStore.state.earnedByCompositeKey.set(
    achievementStore.earnedKey(userId, achievementKey),
    {
      user_id: userId,
      achievement_key: achievementKey,
      achievement_kind: "milestone",
      category_key: achievementKey.split(":")[1] ?? "milestone",
      metadata: {},
      earned_at: earnedAt,
    },
  );
}

function setRewardUnlock(
  userId: string,
  overrides: Partial<RewardUnlockRow> = {},
) {
  const row = {
    user_id: userId,
    reward_key: ACHIEVEMENT_REWARD_KEY,
    status: "unlocked" as const,
    unlock_reason: "challenge-milestone",
    metadata: {},
    unlocked_at: "2026-04-03T00:00:00.000Z",
    expires_at: "2026-04-10T00:00:00.000Z",
    claimed_at: null,
    claim_checkout_session_id: null,
    claim_coupon_id: null,
    claim_price_id: null,
    used_at: null,
    used_subscription_id: null,
    ...overrides,
  } satisfies RewardUnlockRow;

  achievementStore.state.rewardsByCompositeKey.set(
    achievementStore.rewardKey(userId, row.reward_key),
    row,
  );

  return row;
}

async function getOverview(userId: string, tier: "free" | "premium" = "free") {
  return getAccountAchievementOverview({
    userId,
    entitlementTier: tier,
    checkoutRewardConfigured: true,
  });
}

describe("achievement service", () => {
  const userId = "user-1";

  beforeEach(() => {
    achievementStore.reset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("unlocks the 10-question milestone once for a unique question version", async () => {
    const concept = getConceptBySlug("projectile-motion");
    const questionId = concept.quickTest.questions[0]?.id;

    expect(questionId).toBeTruthy();
    seedQualifiedProgressRows(userId, "question", 9);
    setStats(userId, {
      question_answer_count: 9,
    });

    const first = await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "question_answered",
        conceptSlug: concept.slug,
        questionId: questionId!,
      },
    });
    const second = await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "question_answered",
        conceptSlug: concept.slug,
        questionId: questionId!,
      },
    });
    const overview = await getOverview(userId);

    expect(first.newlyEarnedAchievements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "milestone:question-answers:10",
          title: "10 questions milestone",
        }),
      ]),
    );
    expect(second.newlyEarnedAchievements).toEqual([]);
    expect(overview.stats.questionAnswerCount).toBe(10);
    expect(
      Array.from(achievementStore.state.earnedByCompositeKey.values()).filter(
        (row) => row.user_id === userId && row.achievement_key === "milestone:question-answers:10",
      ),
    ).toHaveLength(1);
  });

  it("unlocks named challenge and track badges once per distinct completion", async () => {
    const challengeConcept = getConceptBySlug("projectile-motion");
    const challengeId = challengeConcept.challengeMode!.items[0]?.id;
    const track = getStarterTrackBySlug("motion-and-circular-motion");

    expect(challengeId).toBeTruthy();

    const firstChallenge = await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "challenge_completed",
        conceptSlug: challengeConcept.slug,
        challengeId: challengeId!,
      },
    });
    const secondChallenge = await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "challenge_completed",
        conceptSlug: challengeConcept.slug,
        challengeId: challengeId!,
      },
    });
    const firstTrack = await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "track_completed",
        trackSlug: track.slug,
      },
    });
    const secondTrack = await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "track_completed",
        trackSlug: track.slug,
      },
    });
    const overview = await getOverview(userId);

    expect(firstChallenge.newlyEarnedAchievements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: `challenge:${challengeConcept.slug}:${challengeId!}`,
        }),
      ]),
    );
    expect(secondChallenge.newlyEarnedAchievements).toEqual([]);
    expect(firstTrack.newlyEarnedAchievements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: `track:${track.slug}`,
          title: `Completed ${track.title} learning track`,
        }),
      ]),
    );
    expect(secondTrack.newlyEarnedAchievements).toEqual([]);
    expect(overview.stats.distinctChallengeCompletionCount).toBe(1);
    expect(overview.stats.distinctTrackCompletionCount).toBe(1);
  });

  it("only counts concept visits and study time after qualifying engagement and unique heartbeats", async () => {
    const firstConcept = getConceptBySlug("simple-harmonic-motion");
    const secondConcept = getConceptBySlug("projectile-motion");

    await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "concept_engagement",
        conceptSlug: firstConcept.slug,
        sessionId: "session-a",
        interactionCount: 1,
        heartbeatSlot: null,
      },
    });
    let overview = await getOverview(userId);
    expect(overview.stats.conceptVisitCount).toBe(0);
    expect(overview.stats.activeStudySeconds).toBe(0);

    await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "concept_engagement",
        conceptSlug: firstConcept.slug,
        sessionId: "session-a",
        interactionCount: 2,
        heartbeatSlot: null,
      },
    });
    overview = await getOverview(userId);
    expect(overview.stats.conceptVisitCount).toBe(1);

    await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "concept_engagement",
        conceptSlug: secondConcept.slug,
        sessionId: "session-b",
        interactionCount: 1,
        heartbeatSlot: 100,
      },
    });
    await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "concept_engagement",
        conceptSlug: secondConcept.slug,
        sessionId: "session-b",
        interactionCount: 1,
        heartbeatSlot: 100,
      },
    });
    await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "concept_engagement",
        conceptSlug: secondConcept.slug,
        sessionId: "session-b",
        interactionCount: 1,
        heartbeatSlot: 101,
      },
    });
    await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "concept_engagement",
        conceptSlug: secondConcept.slug,
        sessionId: "session-b",
        interactionCount: 1,
        heartbeatSlot: 102,
      },
    });

    overview = await getOverview(userId);
    expect(overview.stats.activeStudySeconds).toBe(45);
    expect(overview.stats.conceptVisitCount).toBe(2);
  });

  it("uses cumulative session active-study seconds without double-counting repeated flushes", async () => {
    const concept = getConceptBySlug("simple-harmonic-motion");

    await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "concept_engagement",
        conceptSlug: concept.slug,
        sessionId: "session-cumulative",
        interactionCount: 1,
        heartbeatSlot: null,
        sessionActiveStudySeconds: 12,
      },
    });
    await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "concept_engagement",
        conceptSlug: concept.slug,
        sessionId: "session-cumulative",
        interactionCount: 1,
        heartbeatSlot: null,
        sessionActiveStudySeconds: 12,
      },
    });
    await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "concept_engagement",
        conceptSlug: concept.slug,
        sessionId: "session-cumulative",
        interactionCount: 1,
        heartbeatSlot: null,
        sessionActiveStudySeconds: 25,
      },
    });
    const overview = await getOverview(userId);

    expect(overview.stats.activeStudySeconds).toBe(25);
    expect(
      achievementStore.state.activeSessionsByCompositeKey.get(
        achievementStore.sessionKey(userId, "session-cumulative"),
      )?.active_study_seconds,
    ).toBe(25);
  });

  it("qualifies a concept visit once cumulative active-study time crosses the visit threshold", async () => {
    const concept = getConceptBySlug("simple-harmonic-motion");

    await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "concept_engagement",
        conceptSlug: concept.slug,
        sessionId: "session-threshold",
        interactionCount: 1,
        heartbeatSlot: null,
        sessionActiveStudySeconds: 20,
      },
    });
    await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "concept_engagement",
        conceptSlug: concept.slug,
        sessionId: "session-threshold",
        interactionCount: 1,
        heartbeatSlot: null,
        sessionActiveStudySeconds: 46,
      },
    });
    await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "concept_engagement",
        conceptSlug: concept.slug,
        sessionId: "session-threshold",
        interactionCount: 1,
        heartbeatSlot: null,
        sessionActiveStudySeconds: 60,
      },
    });
    const overview = await getOverview(userId);
    const conceptProgress = achievementStore.state.progressKeysByCompositeKey.get(
      achievementStore.progressKey(userId, "concept", concept.slug),
    );

    expect(overview.stats.activeStudySeconds).toBe(60);
    expect(overview.stats.conceptVisitCount).toBe(1);
    expect(conceptProgress?.qualified_at).toBeTruthy();
    expect(conceptProgress?.metadata).toMatchObject({
      activeStudySeconds: 60,
      interactionCount: 1,
    });
  });

  it("keeps concept visits and unique question counts correct under concurrent concept and quick-test writes", async () => {
    const concept = getConceptBySlug("projectile-motion");
    const questionIds = concept.quickTest.questions.map((question) => question.id);

    await Promise.all([
      recordAccountAchievementEvent({
        userId,
        entitlementTier: "free",
        event: {
          type: "concept_engagement",
          conceptSlug: concept.slug,
          sessionId: "session-race",
          interactionCount: questionIds.length,
          heartbeatSlot: null,
          sessionActiveStudySeconds: 54,
        },
      }),
      ...questionIds.map((questionId) =>
        recordAccountAchievementEvent({
          userId,
          entitlementTier: "free",
          event: {
            type: "question_answered",
            conceptSlug: concept.slug,
            questionId,
          },
        }),
      ),
    ]);

    const overview = await getOverview(userId);
    const conceptProgress = achievementStore.state.progressKeysByCompositeKey.get(
      achievementStore.progressKey(userId, "concept", concept.slug),
    );
    const storedQuestionRows = Array.from(
      achievementStore.state.progressKeysByCompositeKey.values(),
    ).filter((row) => row.user_id === userId && row.record_type === "question");

    expect(conceptProgress?.qualified_at).toBeTruthy();
    expect(storedQuestionRows).toHaveLength(questionIds.length);
    expect(overview.stats.conceptVisitCount).toBe(1);
    expect(overview.stats.questionAnswerCount).toBe(questionIds.length);
    expect(
      overview.milestoneGroups.find((group) => group.statKey === "concept-visits")?.currentValue,
    ).toBe(1);
  });

  it("does not double-count a concept after it is already qualified", async () => {
    const concept = getConceptBySlug("projectile-motion");

    await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "concept_engagement",
        conceptSlug: concept.slug,
        sessionId: "session-qualified",
        interactionCount: 2,
        heartbeatSlot: null,
        sessionActiveStudySeconds: 0,
      },
    });
    await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "concept_engagement",
        conceptSlug: concept.slug,
        sessionId: "session-qualified",
        interactionCount: 4,
        heartbeatSlot: null,
        sessionActiveStudySeconds: 90,
      },
    });

    const overview = await getOverview(userId);

    expect(overview.stats.conceptVisitCount).toBe(1);
    expect(overview.stats.activeStudySeconds).toBe(90);
  });

  it("unlocks the one-time reward for free users after the 30th distinct challenge", async () => {
    const concept = getConceptBySlug("projectile-motion");
    const challengeId = concept.challengeMode!.items[0]?.id;

    expect(challengeId).toBeTruthy();
    setStats(userId, {
      distinct_challenge_completion_count: ACHIEVEMENT_REWARD_CHALLENGE_TARGET - 1,
    });

    const result = await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "challenge_completed",
        conceptSlug: concept.slug,
        challengeId: challengeId!,
      },
    });
    const overview = await getOverview(userId);

    expect(result.reward?.status).toBe("unlocked");
    expect(overview.reward.status).toBe("unlocked");
    expect(overview.reward.claimable).toBe(true);
    expect(achievementStore.state.rewardsByCompositeKey.size).toBe(1);
  });

  it("does not unlock the free-user reward while the account is premium", async () => {
    const concept = getConceptBySlug("projectile-motion");
    const challengeId = concept.challengeMode!.items[0]?.id;

    expect(challengeId).toBeTruthy();
    setStats(userId, {
      distinct_challenge_completion_count: ACHIEVEMENT_REWARD_CHALLENGE_TARGET - 1,
    });

    await recordAccountAchievementEvent({
      userId,
      entitlementTier: "premium",
      event: {
        type: "challenge_completed",
        conceptSlug: concept.slug,
        challengeId: challengeId!,
      },
    });
    const overview = await getOverview(userId, "premium");

    expect(overview.reward.claimable).toBe(false);
    expect(overview.reward.status).toBe("locked");
    expect(achievementStore.state.rewardsByCompositeKey.size).toBe(0);
  });

  it("builds a zero-progress authenticated overview without requiring a stored stats row", async () => {
    const overview = await getAccountAchievementOverviewForAuthenticatedUser({
      userId,
      cookieHeader: "sb-auth-token=1",
      entitlementTier: "free",
      checkoutRewardConfigured: true,
    });

    expect(overview.stats).toEqual({
      conceptVisitCount: 0,
      questionAnswerCount: 0,
      distinctChallengeCompletionCount: 0,
      distinctTrackCompletionCount: 0,
      activeStudySeconds: 0,
    });
    expect(overview.milestoneGroups).toHaveLength(5);
    expect(overview.namedGroups).toHaveLength(2);
    expect(overview.namedGroups.every((group) => group.items.every((item) => !item.earned))).toBe(
      true,
    );
    expect(overview.reward.status).toBe("locked");
  });

  it("reconciles stale concept and question stats from authoritative achievement rows", async () => {
    const concept = getConceptBySlug("projectile-motion");
    const questionIds = concept.quickTest.questions.map((question) => question.id);

    setStats(userId, {
      concept_visit_count: 0,
      question_answer_count: 1,
      distinct_challenge_completion_count: 1,
      active_study_seconds: 0,
    });
    achievementStore.state.progressKeysByCompositeKey.set(
      achievementStore.progressKey(userId, "concept", concept.slug),
      {
        user_id: userId,
        record_type: "concept",
        record_key: concept.slug,
        concept_slug: concept.slug,
        challenge_id: null,
        track_slug: null,
        qualified_at: "2026-04-03T00:01:00.000Z",
        metadata: {
          activeStudySeconds: 79,
          interactionCount: questionIds.length,
        },
        created_at: "2026-04-03T00:00:00.000Z",
        updated_at: "2026-04-03T00:01:00.000Z",
      },
    );
    for (const questionId of questionIds) {
      achievementStore.state.progressKeysByCompositeKey.set(
        achievementStore.progressKey(userId, "question", `${concept.slug}:${questionId}:v1`),
        {
          user_id: userId,
          record_type: "question",
          record_key: `${concept.slug}:${questionId}:v1`,
          concept_slug: concept.slug,
          challenge_id: null,
          track_slug: null,
          qualified_at: "2026-04-03T00:02:00.000Z",
          metadata: {},
          created_at: "2026-04-03T00:02:00.000Z",
          updated_at: "2026-04-03T00:02:00.000Z",
        },
      );
    }
    achievementStore.state.progressKeysByCompositeKey.set(
      achievementStore.progressKey(userId, "challenge", `${concept.slug}:pm-ch-flat-far-shot`),
      {
        user_id: userId,
        record_type: "challenge",
        record_key: `${concept.slug}:pm-ch-flat-far-shot`,
        concept_slug: concept.slug,
        challenge_id: "pm-ch-flat-far-shot",
        track_slug: null,
        qualified_at: "2026-04-03T00:03:00.000Z",
        metadata: {},
        created_at: "2026-04-03T00:03:00.000Z",
        updated_at: "2026-04-03T00:03:00.000Z",
      },
    );
    achievementStore.state.activeSessionsByCompositeKey.set(
      achievementStore.sessionKey(userId, "session-stale"),
      {
        user_id: userId,
        session_id: "session-stale",
        concept_slug: concept.slug,
        last_heartbeat_slot: null,
        interaction_count: questionIds.length,
        active_study_seconds: 79,
        last_seen_at: "2026-04-03T00:03:00.000Z",
        created_at: "2026-04-03T00:00:00.000Z",
        updated_at: "2026-04-03T00:03:00.000Z",
      },
    );

    const reconciledStats = await reconcileAchievementStatsFromSource(userId);
    const overview = await getAccountAchievementOverviewForAuthenticatedUser({
      userId,
      cookieHeader: "sb-auth-token=1",
      entitlementTier: "free",
      checkoutRewardConfigured: true,
    });

    expect(reconciledStats).toEqual({
      conceptVisitCount: 1,
      questionAnswerCount: questionIds.length,
      distinctChallengeCompletionCount: 1,
      distinctTrackCompletionCount: 0,
      activeStudySeconds: 79,
    });
    expect(overview.stats).toEqual(reconciledStats);
  });

  it("keeps badge progress renderable when optional reward context reads fail", async () => {
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    setStats(userId, {
      concept_visit_count: 6,
      distinct_challenge_completion_count: 2,
    });
    setEarnedAchievement(userId, "milestone:challenge-completions:1");
    achievementStore.state.billingProfilesByUser.set(
      userId,
      new Error('relation "user_billing_profiles" does not exist'),
    );

    const overview = await getAccountAchievementOverviewForAuthenticatedUser({
      userId,
      cookieHeader: "sb-auth-token=1",
      entitlementTier: "free",
      checkoutRewardConfigured: true,
    });

    expect(overview.stats.conceptVisitCount).toBe(6);
    expect(
      overview.milestoneGroups.find((group) => group.statKey === "challenge-completions")
        ?.currentValue,
    ).toBe(2);
    expect(overview.reward.status).toBe("temporarily-unavailable");
    expect(consoleWarnMock).toHaveBeenCalledWith(
      "[account] achievement reward context unavailable during overview render",
      expect.objectContaining({
        userId,
        fallback: "achievement_overview_without_reward_context",
      }),
    );

    consoleWarnMock.mockRestore();
  });

  it("keeps dev fixture authenticated reward reads off UUID-backed billing lookups", async () => {
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => undefined);

    for (const [fixtureUserId, entitlementTier, expectedRewardStatus] of [
      ["dev-free-learner", "free", "unlocked"],
      ["dev-premium-learner", "premium", "premium-ineligible"],
    ] as const) {
      setStats(fixtureUserId, {
        distinct_challenge_completion_count: ACHIEVEMENT_REWARD_CHALLENGE_TARGET,
      });
      setRewardUnlock(fixtureUserId);
      achievementStore.state.billingProfilesByUser.set(
        fixtureUserId,
        new Error(`invalid input syntax for type uuid: "${fixtureUserId}"`),
      );

      const overview = await getAccountAchievementOverviewForAuthenticatedUser({
        userId: fixtureUserId,
        cookieHeader: "open-model-lab-dev-account=signed-in-free",
        entitlementTier,
        checkoutRewardConfigured: true,
      });

      expect(overview.reward.status).toBe(expectedRewardStatus);
      expect(overview.reward.status).not.toBe("temporarily-unavailable");
    }

    expect(achievementStore.state.authenticatedBillingLookupUserIds).not.toContain(
      "dev-free-learner",
    );
    expect(achievementStore.state.authenticatedBillingLookupUserIds).not.toContain(
      "dev-premium-learner",
    );
    expect(consoleWarnMock).not.toHaveBeenCalled();
    expect(consoleErrorMock).not.toHaveBeenCalled();

    consoleWarnMock.mockRestore();
    consoleErrorMock.mockRestore();
  });

  it("expires an unlocked reward and keeps checkout reservation separate from reward consumption", async () => {
    achievementStore.state.rewardsByCompositeKey.set(
      achievementStore.rewardKey(userId, ACHIEVEMENT_REWARD_KEY),
      {
        user_id: userId,
        reward_key: ACHIEVEMENT_REWARD_KEY,
        status: "unlocked",
        unlock_reason: "study-hours",
        metadata: {},
        unlocked_at: "2026-03-01T00:00:00.000Z",
        expires_at: "2026-03-20T00:00:00.000Z",
        claimed_at: null,
        claim_checkout_session_id: null,
        claim_coupon_id: null,
        claim_price_id: null,
        used_at: null,
        used_subscription_id: null,
      },
    );

    let overview = await getOverview(userId);
    expect(overview.reward.status).toBe("expired");

    achievementStore.state.rewardsByCompositeKey.set(
      achievementStore.rewardKey(userId, ACHIEVEMENT_REWARD_KEY),
      {
        user_id: userId,
        reward_key: ACHIEVEMENT_REWARD_KEY,
        status: "unlocked",
        unlock_reason: "study-hours",
        metadata: {},
        unlocked_at: "2026-04-01T00:00:00.000Z",
        expires_at: "2026-04-30T00:00:00.000Z",
        claimed_at: null,
        claim_checkout_session_id: null,
        claim_coupon_id: null,
        claim_price_id: null,
        used_at: null,
        used_subscription_id: null,
      },
    );

    const rewardBeforeReserve = await getAchievementRewardForCheckout({
      userId,
      entitlementTier: "free",
    });
    const reservedReward = await reserveAchievementRewardForCheckout({
      userId,
      entitlementTier: "free",
    });
    const attachedReward = await attachAchievementRewardCheckoutSession({
      userId,
      checkoutSessionId: "cs_test_123",
      couponId: "coupon_25",
      priceId: "price_monthly",
    });
    const reusedReward = await getAchievementRewardForCheckout({
      userId,
      entitlementTier: "free",
    });
    const releasedReward = await releaseAchievementRewardCheckoutClaim({
      userId,
      checkoutSessionId: "cs_test_123",
    });
    overview = await getOverview(userId);

    expect(rewardBeforeReserve?.status).toBe("unlocked");
    expect(reservedReward?.status).toBe("claimed");
    expect(attachedReward?.claim_checkout_session_id).toBe("cs_test_123");
    expect(reusedReward?.status).toBe("claimed");
    expect(releasedReward?.status).toBe("unlocked");
    expect(overview.reward.status).toBe("unlocked");
    expect(overview.reward.claimable).toBe(true);
  });

  it("shows premium accounts as reward-ineligible even when a reward row exists", async () => {
    achievementStore.state.rewardsByCompositeKey.set(
      achievementStore.rewardKey(userId, ACHIEVEMENT_REWARD_KEY),
      {
        user_id: userId,
        reward_key: ACHIEVEMENT_REWARD_KEY,
        status: "unlocked",
        unlock_reason: "challenge-milestone",
        metadata: {},
        unlocked_at: "2026-04-01T00:00:00.000Z",
        expires_at: "2026-04-30T00:00:00.000Z",
        claimed_at: null,
        claim_checkout_session_id: null,
        claim_coupon_id: null,
        claim_price_id: null,
        used_at: null,
        used_subscription_id: null,
      },
    );

    const overview = await getOverview(userId, "premium");

    expect(overview.reward.status).toBe("premium-ineligible");
    expect(overview.reward.claimable).toBe(false);
    expect(overview.reward.resumable).toBe(false);
  });

  it("treats an unlocked reward as already unavailable after the account has Supporter history", async () => {
    achievementStore.state.rewardsByCompositeKey.set(
      achievementStore.rewardKey(userId, ACHIEVEMENT_REWARD_KEY),
      {
        user_id: userId,
        reward_key: ACHIEVEMENT_REWARD_KEY,
        status: "unlocked",
        unlock_reason: "challenge-milestone",
        metadata: {},
        unlocked_at: "2026-04-01T00:00:00.000Z",
        expires_at: "2026-04-30T00:00:00.000Z",
        claimed_at: null,
        claim_checkout_session_id: null,
        claim_coupon_id: null,
        claim_price_id: null,
        used_at: null,
        used_subscription_id: null,
      },
    );
    achievementStore.state.billingProfilesByUser.set(userId, {
      user_id: userId,
      stripe_customer_id: "cus_hist",
      stripe_subscription_id: "sub_hist",
      stripe_price_id: "price_premium",
      stripe_subscription_status: "canceled",
      stripe_subscription_cancel_at_period_end: false,
      stripe_subscription_current_period_end: null,
      stripe_last_event_created_at: "2026-04-03T00:00:00.000Z",
      updated_at: "2026-04-03T00:00:00.000Z",
    });

    const rewardForCheckout = await getAchievementRewardForCheckout({
      userId,
      entitlementTier: "free",
    });
    const overview = await getOverview(userId);

    expect(rewardForCheckout).toBeNull();
    expect(overview.reward.status).toBe("already-used");
    expect(overview.reward.claimable).toBe(false);
    expect(overview.reward.reasonLabel).toMatch(/supporter subscription history/i);
  });

  it("releases a stale claimed reward with no checkout session so the account can try again", async () => {
    achievementStore.state.rewardsByCompositeKey.set(
      achievementStore.rewardKey(userId, ACHIEVEMENT_REWARD_KEY),
      {
        user_id: userId,
        reward_key: ACHIEVEMENT_REWARD_KEY,
        status: "claimed",
        unlock_reason: "challenge-milestone",
        metadata: {},
        unlocked_at: "2026-04-01T00:00:00.000Z",
        expires_at: "2026-04-30T00:00:00.000Z",
        claimed_at: "2026-04-02T23:58:00.000Z",
        claim_checkout_session_id: null,
        claim_coupon_id: null,
        claim_price_id: null,
        used_at: null,
        used_subscription_id: null,
      },
    );

    const overview = await getOverview(userId);

    expect(overview.reward.status).toBe("unlocked");
    expect(overview.reward.claimable).toBe(true);
    expect(
      achievementStore.state.rewardsByCompositeKey.get(
        achievementStore.rewardKey(userId, ACHIEVEMENT_REWARD_KEY),
      )?.status,
    ).toBe("unlocked");
  });

  it("keeps the reward locked before the active study threshold is reached", async () => {
    seedActiveStudySessionTotal(userId, ACHIEVEMENT_REWARD_STUDY_SECONDS_TARGET - 1);

    const overview = await getOverview(userId);

    expect(overview.reward.status).toBe("locked");
    expect(achievementStore.state.rewardsByCompositeKey.size).toBe(0);
  });

  it("unlocks the reward at exactly the active study threshold", async () => {
    seedActiveStudySessionTotal(userId, ACHIEVEMENT_REWARD_STUDY_SECONDS_TARGET);

    const overview = await getOverview(userId);

    expect(overview.reward.status).toBe("unlocked");
    expect(overview.reward.reasonLabel).toMatch(
      new RegExp(`${ACHIEVEMENT_REWARD_STUDY_HOURS_TARGET} active study hours`, "i"),
    );
  });

  it("keeps the reward unlocked after study time moves beyond the threshold", async () => {
    seedActiveStudySessionTotal(userId, ACHIEVEMENT_REWARD_STUDY_SECONDS_TARGET);

    await getOverview(userId);

    seedActiveStudySessionTotal(userId, ACHIEVEMENT_REWARD_STUDY_SECONDS_TARGET + 15);

    const overview = await getOverview(userId);

    expect(overview.reward.status).toBe("unlocked");
    expect(overview.reward.claimable).toBe(true);
  });

  it("unlocks the reward from active study hours once an event pushes the server-backed total past the threshold", async () => {
    const concept = getConceptBySlug("simple-harmonic-motion");

    setStats(userId, {
      active_study_seconds: ACHIEVEMENT_REWARD_STUDY_SECONDS_TARGET - 15,
    });

    await recordAccountAchievementEvent({
      userId,
      entitlementTier: "free",
      event: {
        type: "concept_engagement",
        conceptSlug: concept.slug,
        sessionId: "session-hours",
        interactionCount: 1,
        heartbeatSlot: 200,
      },
    });
    const overview = await getOverview(userId);

    expect(overview.reward.status).toBe("unlocked");
    expect(overview.reward.reasonLabel).toMatch(
      new RegExp(`${ACHIEVEMENT_REWARD_STUDY_HOURS_TARGET} active study hours`, "i"),
    );
  });

  it("backfills trusted sync achievements without duplicating earned rows on repeated syncs", async () => {
    const first = await syncAchievementsFromTrustedProgressSnapshot({
      userId,
      entitlementTier: "free",
      snapshot: {
        version: 1,
        concepts: {
          "vectors-components": {
            conceptId: "concept-vectors-components",
            slug: "vectors-components",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
          },
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            manualCompletedAt: "2026-03-25T08:30:00.000Z",
            completedChallenges: {
              "pm-ch-flat-far-shot": "2026-03-25T08:35:00.000Z",
            },
          },
          "uniform-circular-motion": {
            conceptId: "concept-uniform-circular-motion",
            slug: "uniform-circular-motion",
            manualCompletedAt: "2026-03-25T09:00:00.000Z",
            completedChallenges: {
              "ucm-ch-match-period-change-pull": "2026-03-25T09:05:00.000Z",
            },
          },
        },
      },
    });
    const earnedCountAfterFirstSync = achievementStore.state.earnedByCompositeKey.size;

    const second = await syncAchievementsFromTrustedProgressSnapshot({
      userId,
      entitlementTier: "free",
      snapshot: {
        version: 1,
        concepts: {
          "vectors-components": {
            conceptId: "concept-vectors-components",
            slug: "vectors-components",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
          },
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            manualCompletedAt: "2026-03-25T08:30:00.000Z",
            completedChallenges: {
              "pm-ch-flat-far-shot": "2026-03-25T08:35:00.000Z",
            },
          },
          "uniform-circular-motion": {
            conceptId: "concept-uniform-circular-motion",
            slug: "uniform-circular-motion",
            manualCompletedAt: "2026-03-25T09:00:00.000Z",
            completedChallenges: {
              "ucm-ch-match-period-change-pull": "2026-03-25T09:05:00.000Z",
            },
          },
        },
      },
    });
    const overview = await getOverview(userId);

    expect(first.newlyEarnedAchievements.length).toBeGreaterThan(0);
    expect(second.newlyEarnedAchievements).toEqual([]);
    expect(achievementStore.state.earnedByCompositeKey.size).toBe(earnedCountAfterFirstSync);
    expect(overview.stats.distinctChallengeCompletionCount).toBe(2);
    expect(overview.stats.distinctTrackCompletionCount).toBe(1);
  });

  it("builds a compact dashboard snapshot from the existing milestone overview state", async () => {
    seedQualifiedProgressRows(userId, "concept", 12);
    seedQualifiedProgressRows(userId, "question", 4);
    seedQualifiedProgressRows(userId, "challenge", 17);
    seedActiveStudySessionTotal(userId, 18_000);
    setStats(userId, {
      concept_visit_count: 12,
      question_answer_count: 4,
      distinct_challenge_completion_count: 17,
      distinct_track_completion_count: 0,
      active_study_seconds: 18_000,
    });
    setEarnedAchievement(userId, "milestone:concept-visits:3");
    setEarnedAchievement(userId, "milestone:concept-visits:10");
    setEarnedAchievement(userId, "milestone:challenge-completions:1");
    setEarnedAchievement(userId, "milestone:challenge-completions:5");
    setEarnedAchievement(userId, "milestone:challenge-completions:15");
    setEarnedAchievement(userId, "milestone:active-study-hours:1");
    setEarnedAchievement(userId, "milestone:active-study-hours:5");

    const snapshot = await getAccountAchievementDashboardSnapshot({
      userId,
    });

    expect(snapshot.milestoneCategories).toEqual([
      expect.objectContaining({
        statKey: "concept-visits",
        summaryTitle: "10 concepts milestone",
        progressLabel: "12 / 20",
        status: "earned",
        rewardRelevant: false,
      }),
      expect.objectContaining({
        statKey: "question-answers",
        summaryTitle: "Next: 10 questions milestone",
        progressLabel: "4 / 10",
        status: "next-up",
        rewardRelevant: false,
      }),
      expect.objectContaining({
        statKey: "challenge-completions",
        summaryTitle: "15 challenges milestone",
        progressLabel: "17 / 30",
        status: "earned",
        rewardRelevant: true,
      }),
      expect.objectContaining({
        statKey: "track-completions",
        summaryTitle: "Next: 1 tracks milestone",
        progressLabel: "0 / 1",
        status: "next-up",
        rewardRelevant: false,
      }),
      expect.objectContaining({
        statKey: "active-study-hours",
        summaryTitle: "5 hours milestone",
        progressLabel: `5 / ${ACHIEVEMENT_REWARD_STUDY_HOURS_TARGET}`,
        status: "earned",
        rewardRelevant: true,
      }),
    ]);
  });

  it("formats low-but-real active study progress truthfully in the dashboard snapshot", async () => {
    seedActiveStudySessionTotal(userId, 38);
    setStats(userId, {
      active_study_seconds: 38,
    });

    const snapshot = await getAccountAchievementDashboardSnapshot({
      userId,
    });

    expect(
      snapshot.milestoneCategories.find((category) => category.statKey === "active-study-hours")
        ?.progressLabel,
    ).toBe("<0.1 / 1");
  });
});
