import {
  ACHIEVEMENT_REWARD_DISCOUNT_PERCENT,
  ACHIEVEMENT_REWARD_EXPIRY_DAYS,
  ACHIEVEMENT_REWARD_KEY,
  ACHIEVEMENT_REWARD_STUDY_HOURS_TARGET,
  ACHIEVEMENT_REWARD_STUDY_SECONDS_TARGET,
  ACHIEVEMENT_REWARD_CHALLENGE_TARGET,
  ACHIEVEMENT_MIN_VISIBLE_HOURS_PROGRESS,
  ACHIEVEMENT_STUDY_HEARTBEAT_SECONDS,
  ACHIEVEMENT_VISIT_ACTIVE_SECONDS,
  ACHIEVEMENT_VISIT_INTERACTION_COUNT,
  getAchievementDefinition,
  getMilestoneAchievementDefinitions,
  getMilestoneCatalog,
  getNamedAchievementDefinitions,
  getQuestionVersionKey,
} from "./definitions";
import type {
  AccountAchievementEvent,
  AccountAchievementDashboardSnapshot,
  AccountAchievementItemSummary,
  AccountAchievementOverview,
  AchievementDashboardMilestoneSummary,
  AchievementMilestoneGroupSummary,
  AchievementNamedGroupSummary,
  AchievementRewardSummary,
  AchievementStats,
  AchievementToastSummary,
} from "./types";
import {
  attachRewardCheckoutSessionToClaimRow,
  countQualifiedAchievementProgressKeyRows,
  ensureAchievementStatsRow,
  getAchievementStatsRowForAuthenticatedUser,
  getAchievementActiveSessionRow,
  getAchievementProgressKeyRow,
  getAchievementStatsRow,
  getEarnedAchievementRowsForAuthenticatedUser,
  getEarnedAchievementRows,
  getRewardUnlockRow,
  getRewardUnlockRowForAuthenticatedUser,
  insertAchievementProgressKeyRow,
  insertEarnedAchievementRow,
  markRewardUnlockUsedRow,
  qualifyAchievementProgressKeyRowIfPending,
  releaseRewardUnlockClaimRow,
  reserveRewardUnlockRow,
  saveAchievementActiveSessionRow,
  saveAchievementProgressKeyMetadataRow,
  saveAchievementStatsRowIfCurrentMatches,
  saveRewardUnlockRow,
  sumAchievementActiveStudySeconds,
  type AchievementProgressRecordType,
  type AchievementStatsRow,
  type EarnedAchievementRow,
  type RewardUnlockRow,
} from "./store";
import { getConceptBySlug, getStarterTrackBySlug, getStarterTracks } from "@/lib/content";
import {
  getStoredBillingProfileForAuthenticatedUser,
  getStoredBillingProfileForUser,
  type StoredBillingProfileRow,
} from "@/lib/billing/store";
import { isDevAccountHarnessFixtureUserId } from "@/lib/account/dev-harness";
import type { AccountEntitlementTier } from "@/lib/account/entitlements";
import {
  describeOptionalAccountDependencyFailure,
  shouldLogOptionalAccountDependencyFailureAsError,
} from "@/lib/account/supabase";
import type { ProgressSnapshot } from "@/lib/progress";
import { getStarterTrackProgressSummary } from "@/lib/progress";

type RewardEligibilityReason = "challenge-milestone" | "study-hours";
const ACHIEVEMENT_REWARD_CLAIM_STALE_MS = 60_000;
const ACHIEVEMENT_STATS_UPDATE_RETRY_LIMIT = 5;
const REWARD_RELEVANT_MILESTONE_STAT_KEYS = new Set<
  AchievementMilestoneGroupSummary["statKey"]
>(["challenge-completions", "active-study-hours"]);

function toAchievementStats(row: AchievementStatsRow | null): AchievementStats {
  return {
    conceptVisitCount: row?.concept_visit_count ?? 0,
    questionAnswerCount: row?.question_answer_count ?? 0,
    distinctChallengeCompletionCount: row?.distinct_challenge_completion_count ?? 0,
    distinctTrackCompletionCount: row?.distinct_track_completion_count ?? 0,
    activeStudySeconds: row?.active_study_seconds ?? 0,
  };
}

function getStatValue(stats: AchievementStats, statKey: AchievementMilestoneGroupSummary["statKey"]) {
  switch (statKey) {
    case "concept-visits":
      return stats.conceptVisitCount;
    case "question-answers":
      return stats.questionAnswerCount;
    case "challenge-completions":
      return stats.distinctChallengeCompletionCount;
    case "track-completions":
      return stats.distinctTrackCompletionCount;
    case "active-study-hours":
      return stats.activeStudySeconds / 3600;
  }
}

function getUpdatedStatsRow(
  row: AchievementStatsRow,
  patch: Partial<AchievementStats>,
): AchievementStatsRow {
  return {
    ...row,
    concept_visit_count: patch.conceptVisitCount ?? row.concept_visit_count,
    question_answer_count: patch.questionAnswerCount ?? row.question_answer_count,
    distinct_challenge_completion_count:
      patch.distinctChallengeCompletionCount ?? row.distinct_challenge_completion_count,
    distinct_track_completion_count:
      patch.distinctTrackCompletionCount ?? row.distinct_track_completion_count,
    active_study_seconds: patch.activeStudySeconds ?? row.active_study_seconds,
  };
}

function addAchievementStatsDelta(
  stats: AchievementStats,
  delta: Partial<AchievementStats>,
): AchievementStats {
  return {
    conceptVisitCount: stats.conceptVisitCount + (delta.conceptVisitCount ?? 0),
    questionAnswerCount: stats.questionAnswerCount + (delta.questionAnswerCount ?? 0),
    distinctChallengeCompletionCount:
      stats.distinctChallengeCompletionCount +
      (delta.distinctChallengeCompletionCount ?? 0),
    distinctTrackCompletionCount:
      stats.distinctTrackCompletionCount + (delta.distinctTrackCompletionCount ?? 0),
    activeStudySeconds: stats.activeStudySeconds + (delta.activeStudySeconds ?? 0),
  };
}

function toToastSummary(
  achievementKey: string,
  earnedAt: string,
): AchievementToastSummary | null {
  const definition = getAchievementDefinition(achievementKey);

  if (!definition) {
    return null;
  }

  return {
    key: definition.key,
    kind: definition.kind,
    title: definition.title,
    description: definition.description,
    earnedAt,
  };
}

function buildAchievementItemSummary(
  key: string,
  earnedRowsByKey: Map<string, EarnedAchievementRow>,
): AccountAchievementItemSummary | null {
  const definition = getAchievementDefinition(key);

  if (!definition) {
    return null;
  }

  const earnedRow = earnedRowsByKey.get(key);

  return {
    key: definition.key,
    kind: definition.kind,
    title: definition.title,
    description: definition.description,
    categoryKey: definition.categoryKey,
    earned: Boolean(earnedRow),
    earnedAt: earnedRow?.earned_at ?? null,
  };
}

function sortAchievementItems(
  left: AccountAchievementItemSummary,
  right: AccountAchievementItemSummary,
) {
  if (left.earned !== right.earned) {
    return left.earned ? -1 : 1;
  }

  if (left.earnedAt && right.earnedAt && left.earnedAt !== right.earnedAt) {
    return right.earnedAt.localeCompare(left.earnedAt);
  }

  return left.title.localeCompare(right.title);
}

function createMilestoneGroups(earnedRows: EarnedAchievementRow[], stats: AchievementStats) {
  const earnedRowsByKey = new Map(
    earnedRows.map((row) => [row.achievement_key, row] as const),
  );

  return getMilestoneCatalog().map((group) => {
    const currentValue = getStatValue(stats, group.statKey);
    const nextTarget = group.targets.find((target) => currentValue < target) ?? null;
    const items = group.targets
      .map((target) => buildAchievementItemSummary(`milestone:${group.statKey}:${target}`, earnedRowsByKey))
      .filter((item): item is AccountAchievementItemSummary => Boolean(item));

    return {
      statKey: group.statKey,
      title: group.title,
      description: group.description,
      unitLabel: group.unitLabel,
      currentValue,
      nextMilestone: {
        statKey: group.statKey,
        currentValue,
        nextTarget,
        progressRatio: nextTarget ? Math.min(currentValue / nextTarget, 1) : 1,
      },
      items,
    } satisfies AchievementMilestoneGroupSummary;
  });
}

function parseMilestoneTargetFromKey(key: string | null | undefined) {
  if (!key) {
    return null;
  }

  const targetSegment = key.split(":").at(-1);
  const target = Number(targetSegment);

  if (!Number.isFinite(target)) {
    return null;
  }

  return target;
}

function formatDashboardProgressValue(
  statKey: AchievementMilestoneGroupSummary["statKey"],
  value: number,
) {
  if (statKey === "active-study-hours") {
    if (value > 0 && value < ACHIEVEMENT_MIN_VISIBLE_HOURS_PROGRESS) {
      return "<0.1";
    }

    return value.toFixed(Number.isInteger(value) || value >= 10 ? 0 : 1);
  }

  return `${Math.floor(value)}`;
}

function buildAchievementDashboardSnapshot(
  milestoneGroups: AchievementMilestoneGroupSummary[],
) {
  return {
    milestoneCategories: milestoneGroups.map((group) => {
      const highestEarnedItem = [...group.items].reverse().find((item) => item.earned) ?? null;
      const nextItem = group.items.find((item) => !item.earned) ?? null;
      const highestTarget =
        parseMilestoneTargetFromKey(highestEarnedItem?.key) ??
        parseMilestoneTargetFromKey(group.items[group.items.length - 1]?.key) ??
        Math.max(group.currentValue, 0);
      const progressTarget = group.nextMilestone.nextTarget ?? highestTarget;
      const progressValue =
        group.nextMilestone.nextTarget === null
          ? progressTarget
          : Math.min(group.currentValue, progressTarget);
      const status: AchievementDashboardMilestoneSummary["status"] =
        group.nextMilestone.nextTarget === null
          ? "maxed"
          : highestEarnedItem
            ? "earned"
            : "next-up";

      return {
        statKey: group.statKey,
        title: group.title,
        summaryTitle: highestEarnedItem?.title ?? `Next: ${nextItem?.title ?? group.title}`,
        progressLabel: `${formatDashboardProgressValue(group.statKey, progressValue)} / ${formatDashboardProgressValue(group.statKey, progressTarget)}`,
        status,
        rewardRelevant: REWARD_RELEVANT_MILESTONE_STAT_KEYS.has(group.statKey),
      } satisfies AchievementDashboardMilestoneSummary;
    }),
  } satisfies AccountAchievementDashboardSnapshot;
}

function createNamedGroups(earnedRows: EarnedAchievementRow[]) {
  const earnedRowsByKey = new Map(
    earnedRows.map((row) => [row.achievement_key, row] as const),
  );
  const namedDefinitions = getNamedAchievementDefinitions();

  const challengeItems = namedDefinitions.challengeBadges
    .map((item) => buildAchievementItemSummary(item.key, earnedRowsByKey))
    .filter((item): item is AccountAchievementItemSummary => Boolean(item))
    .sort(sortAchievementItems);
  const trackItems = namedDefinitions.trackBadges
    .map((item) => buildAchievementItemSummary(item.key, earnedRowsByKey))
    .filter((item): item is AccountAchievementItemSummary => Boolean(item))
    .sort(sortAchievementItems);

  return [
    {
      key: "challenge-completions",
      title: "Challenge completion badges",
      description: "One badge for each distinct challenge mode you complete.",
      items: challengeItems,
    },
    {
      key: "track-completions",
      title: "Learning track badges",
      description: "One badge for each starter track you fully complete.",
      items: trackItems,
    },
  ] satisfies AchievementNamedGroupSummary[];
}

function hasHistoricalPremiumSubscription(profile: StoredBillingProfileRow | null) {
  if (!profile?.stripe_subscription_id) {
    return false;
  }

  return ![
    "incomplete",
    "incomplete_expired",
    null,
  ].includes(profile.stripe_subscription_status);
}

function resolveRewardEligibilityReason(stats: AchievementStats): RewardEligibilityReason | null {
  if (stats.distinctChallengeCompletionCount >= ACHIEVEMENT_REWARD_CHALLENGE_TARGET) {
    return "challenge-milestone";
  }

  if (stats.activeStudySeconds >= ACHIEVEMENT_REWARD_STUDY_SECONDS_TARGET) {
    return "study-hours";
  }

  return null;
}

function buildRewardReasonLabel(reason: RewardEligibilityReason | string | null) {
  switch (reason) {
    case "challenge-milestone":
      return "Unlocked from 30 distinct challenge-mode completions.";
    case "study-hours":
      return `Unlocked from ${ACHIEVEMENT_REWARD_STUDY_HOURS_TARGET} active study hours.`;
    default:
      return null;
  }
}

async function ensureRewardUnlockedIfEligible(input: {
  userId: string;
  entitlementTier: AccountEntitlementTier;
  stats: AchievementStats;
  billingProfile: StoredBillingProfileRow | null;
  existingReward: RewardUnlockRow | null;
}) {
  if (input.existingReward) {
    return input.existingReward;
  }

  if (input.entitlementTier !== "free" || hasHistoricalPremiumSubscription(input.billingProfile)) {
    return null;
  }

  const reason = resolveRewardEligibilityReason(input.stats);

  if (!reason) {
    return null;
  }

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + ACHIEVEMENT_REWARD_EXPIRY_DAYS);

  return saveRewardUnlockRow({
    user_id: input.userId,
    reward_key: ACHIEVEMENT_REWARD_KEY,
    status: "unlocked",
    unlock_reason: reason,
    metadata: {
      discountPercent: ACHIEVEMENT_REWARD_DISCOUNT_PERCENT,
    },
    unlocked_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    claimed_at: null,
    claim_checkout_session_id: null,
    claim_coupon_id: null,
    claim_price_id: null,
    used_at: null,
    used_subscription_id: null,
  });
}

async function releaseRewardClaimIfStale(reward: RewardUnlockRow | null) {
  if (
    !reward ||
    reward.status !== "claimed" ||
    reward.claim_checkout_session_id ||
    !reward.claimed_at
  ) {
    return reward;
  }

  if (Date.now() - new Date(reward.claimed_at).getTime() < ACHIEVEMENT_REWARD_CLAIM_STALE_MS) {
    return reward;
  }

  return (
    (await releaseRewardUnlockClaimRow({
      userId: reward.user_id,
      rewardKey: reward.reward_key,
    })) ?? reward
  );
}

async function expireRewardIfNeeded(reward: RewardUnlockRow | null) {
  if (!reward || reward.status !== "unlocked") {
    return reward;
  }

  if (new Date(reward.expires_at).getTime() > Date.now()) {
    return reward;
  }

  return saveRewardUnlockRow({
    ...reward,
    status: "expired",
  });
}

async function getAchievementRewardContext(input: {
  userId: string;
  entitlementTier: AccountEntitlementTier;
}) {
  const stats = toAchievementStats(await ensureAchievementStatsRow(input.userId));
  const billingProfile = await getBillingProfileForAchievementUser(input.userId);
  const reward = await releaseRewardClaimIfStale(
    await expireRewardIfNeeded(
      await ensureRewardUnlockedIfEligible({
        userId: input.userId,
        entitlementTier: input.entitlementTier,
        stats,
        billingProfile,
        existingReward: await getRewardUnlockRow(input.userId, ACHIEVEMENT_REWARD_KEY),
      }),
    ),
  );

  return {
    stats,
    billingProfile,
    reward,
  };
}

async function getBillingProfileForAchievementUser(userId: string) {
  if (isDevAccountHarnessFixtureUserId(userId)) {
    return null;
  }

  return getStoredBillingProfileForUser(userId);
}

function logOptionalAchievementRewardDependencyFailure(
  userId: string,
  error: unknown,
  relationName?: string,
) {
  const failure = describeOptionalAccountDependencyFailure(error, relationName);
  const log = shouldLogOptionalAccountDependencyFailureAsError(failure)
    ? console.error
    : console.warn;

  log("[account] achievement reward context unavailable during overview render", {
    userId,
    failureKind: failure.kind,
    relationName: failure.relationName,
    code: failure.code,
    message: failure.message,
    fallback: "achievement_overview_without_reward_context",
  });
}

async function getAuthenticatedAchievementRewardContext(input: {
  userId: string;
  cookieHeader: string | null;
}) {
  if (isDevAccountHarnessFixtureUserId(input.userId)) {
    return {
      billingProfile: null,
      reward: await getRewardUnlockRowForAuthenticatedUser(
        input.userId,
        ACHIEVEMENT_REWARD_KEY,
        input.cookieHeader,
      ),
      unavailable: false,
    };
  }

  let billingProfile: StoredBillingProfileRow | null = null;
  let reward = null;
  let unavailable = false;

  try {
    billingProfile = await getStoredBillingProfileForAuthenticatedUser(
      input.userId,
      input.cookieHeader,
    );
  } catch (error) {
    unavailable = true;
    logOptionalAchievementRewardDependencyFailure(
      input.userId,
      error,
      "user_billing_profiles",
    );
  }

  try {
    reward = await getRewardUnlockRowForAuthenticatedUser(
      input.userId,
      ACHIEVEMENT_REWARD_KEY,
      input.cookieHeader,
    );
  } catch (error) {
    unavailable = true;
    logOptionalAchievementRewardDependencyFailure(
      input.userId,
      error,
      "user_reward_unlocks",
    );
  }

  return {
    billingProfile,
    reward,
    unavailable,
  };
}

function buildRewardSummary(input: {
  reward: RewardUnlockRow | null;
  stats: AchievementStats;
  entitlementTier: AccountEntitlementTier;
  billingProfile: StoredBillingProfileRow | null;
  checkoutReady: boolean;
  temporarilyUnavailable?: boolean;
}) {
  if (input.temporarilyUnavailable) {
    return {
      key: ACHIEVEMENT_REWARD_KEY,
      status: "temporarily-unavailable",
      title: "25% off first Supporter month",
      description:
        "Badge progress loaded, but the one-time Supporter reward could not be checked on this request.",
      reasonLabel:
        "Try again from this account in a moment. Achievement counters are still loading normally.",
      unlockedAt: null,
      expiresAt: null,
      claimedAt: null,
      usedAt: null,
      claimable: false,
      resumable: false,
      checkoutReady: false,
    } satisfies AchievementRewardSummary;
  }

  const rewardReason = resolveRewardEligibilityReason(input.stats);
  const reward = input.reward;
  const historicalPremium = hasHistoricalPremiumSubscription(input.billingProfile);

  if (historicalPremium && !reward) {
    return {
      key: ACHIEVEMENT_REWARD_KEY,
      status: "already-used",
      title: "25% off first Supporter month",
      description:
        "This first-month reward is only available before an account has already had Supporter.",
      reasonLabel: "This account already has Supporter subscription history.",
      unlockedAt: null,
      expiresAt: null,
      claimedAt: null,
      usedAt: null,
      claimable: false,
      resumable: false,
      checkoutReady: false,
    } satisfies AchievementRewardSummary;
  }

  if (!reward) {
    return {
      key: ACHIEVEMENT_REWARD_KEY,
      status: "locked",
      title: "25% off first Supporter month",
      description:
        "Unlock a one-time 25% discount on the first month of Supporter by hitting a big achievement milestone while free.",
      reasonLabel: buildRewardReasonLabel(rewardReason),
      unlockedAt: null,
      expiresAt: null,
      claimedAt: null,
      usedAt: null,
      claimable: false,
      resumable: false,
      checkoutReady: false,
    } satisfies AchievementRewardSummary;
  }

  const baseSummary = {
    key: ACHIEVEMENT_REWARD_KEY,
    title: "25% off first Supporter month",
    description:
      "The discount applies server-side to the first month of the current monthly Supporter plan and never stacks with another offer.",
    reasonLabel: buildRewardReasonLabel(reward.unlock_reason),
    unlockedAt: reward.unlocked_at,
    expiresAt: reward.expires_at,
    claimedAt: reward.claimed_at,
    usedAt: reward.used_at,
  };

  if (historicalPremium && !["used", "already-used"].includes(reward.status)) {
    return {
      ...baseSummary,
      status: "already-used",
      reasonLabel: "This account already has Supporter subscription history.",
      claimable: false,
      resumable: false,
      checkoutReady: false,
    } satisfies AchievementRewardSummary;
  }

  if (reward.metadata?.devHarnessState === "locked") {
    return {
      ...baseSummary,
      status: "locked",
      reasonLabel: "Pinned to locked by the dev harness fixture.",
      claimable: false,
      resumable: false,
      checkoutReady: false,
    } satisfies AchievementRewardSummary;
  }

  if (reward.status === "used") {
    return {
      ...baseSummary,
      status: "used",
      claimable: false,
      resumable: false,
      checkoutReady: false,
    } satisfies AchievementRewardSummary;
  }

  if (reward.status === "claimed") {
    return {
      ...baseSummary,
      status: input.entitlementTier === "free" ? "claimed" : "premium-ineligible",
      claimable: false,
      resumable: input.entitlementTier === "free" && Boolean(reward.claim_checkout_session_id),
      checkoutReady: Boolean(reward.claim_checkout_session_id),
    } satisfies AchievementRewardSummary;
  }

  if (reward.status === "expired") {
    return {
      ...baseSummary,
      status: "expired",
      claimable: false,
      resumable: false,
      checkoutReady: false,
    } satisfies AchievementRewardSummary;
  }

  if (reward.status === "already-used") {
    return {
      ...baseSummary,
      status: "already-used",
      claimable: false,
      resumable: false,
      checkoutReady: false,
    } satisfies AchievementRewardSummary;
  }

  if (input.entitlementTier !== "free") {
    return {
      ...baseSummary,
      status: "premium-ineligible",
      claimable: false,
      resumable: false,
      checkoutReady: false,
    } satisfies AchievementRewardSummary;
  }

  if (!input.checkoutReady) {
    return {
      ...baseSummary,
      status: "unavailable",
      claimable: false,
      resumable: false,
      checkoutReady: false,
    } satisfies AchievementRewardSummary;
  }

  return {
    ...baseSummary,
    status: "unlocked",
    claimable: true,
    resumable: false,
    checkoutReady: true,
  } satisfies AchievementRewardSummary;
}

async function awardAchievementKeys(input: {
  userId: string;
  achievementKeys: string[];
  existingEarnedRows: EarnedAchievementRow[];
}) {
  const earnedRowsByKey = new Map(
    input.existingEarnedRows.map((row) => [row.achievement_key, row] as const),
  );
  const toasts: AchievementToastSummary[] = [];

  for (const key of input.achievementKeys) {
    if (earnedRowsByKey.has(key)) {
      continue;
    }

    const definition = getAchievementDefinition(key);

    if (!definition) {
      continue;
    }

    const earnedAt = new Date().toISOString();
    const inserted = await insertEarnedAchievementRow({
      user_id: input.userId,
      achievement_key: key,
      achievement_kind: definition.kind,
      category_key: definition.categoryKey,
      metadata: {},
      earned_at: earnedAt,
    });

    if (!inserted) {
      continue;
    }

    const row = {
      user_id: input.userId,
      achievement_key: key,
      achievement_kind: definition.kind,
      category_key: definition.categoryKey,
      metadata: {},
      earned_at: earnedAt,
    } satisfies EarnedAchievementRow;
    input.existingEarnedRows.push(row);
    earnedRowsByKey.set(key, row);
    const toast = toToastSummary(key, earnedAt);

    if (toast) {
      toasts.push(toast);
    }
  }

  return toasts;
}

function getMilestoneKeysToAward(stats: AchievementStats, earnedRows: EarnedAchievementRow[]) {
  const existingKeys = new Set(earnedRows.map((row) => row.achievement_key));

  return getMilestoneAchievementDefinitions()
    .filter((definition) => getStatValue(stats, definition.statKey) >= definition.target)
    .map((definition) => definition.key)
    .filter((key) => !existingKeys.has(key));
}

async function recordQualifiedProgressKey(input: {
  userId: string;
  recordType: AchievementProgressRecordType;
  recordKey: string;
  conceptSlug?: string | null;
  challengeId?: string | null;
  trackSlug?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const now = new Date().toISOString();
  const inserted = await insertAchievementProgressKeyRow({
    user_id: input.userId,
    record_type: input.recordType,
    record_key: input.recordKey,
    concept_slug: input.conceptSlug ?? null,
    challenge_id: input.challengeId ?? null,
    track_slug: input.trackSlug ?? null,
    qualified_at: now,
    metadata: input.metadata ?? {},
    created_at: now,
    updated_at: now,
  });

  return Boolean(inserted);
}

async function applyAchievementStatsDelta(
  userId: string,
  delta: Partial<AchievementStats>,
) {
  if (
    (delta.conceptVisitCount ?? 0) === 0 &&
    (delta.questionAnswerCount ?? 0) === 0 &&
    (delta.distinctChallengeCompletionCount ?? 0) === 0 &&
    (delta.distinctTrackCompletionCount ?? 0) === 0 &&
    (delta.activeStudySeconds ?? 0) === 0
  ) {
    return toAchievementStats(await ensureAchievementStatsRow(userId));
  }

  for (let attempt = 0; attempt < ACHIEVEMENT_STATS_UPDATE_RETRY_LIMIT; attempt += 1) {
    const currentRow = await ensureAchievementStatsRow(userId);
    const nextStats = addAchievementStatsDelta(toAchievementStats(currentRow), delta);
    const updatedRow = await saveAchievementStatsRowIfCurrentMatches({
      currentRow,
      nextRow: getUpdatedStatsRow(currentRow, nextStats),
    });

    if (updatedRow) {
      return toAchievementStats(updatedRow);
    }
  }

  throw new Error("achievement_stats_write_conflict");
}

async function reconcileAchievementStatsFromSource(userId: string) {
  const expectedStats = {
    conceptVisitCount: await countQualifiedAchievementProgressKeyRows(userId, "concept"),
    questionAnswerCount: await countQualifiedAchievementProgressKeyRows(userId, "question"),
    distinctChallengeCompletionCount: await countQualifiedAchievementProgressKeyRows(
      userId,
      "challenge",
    ),
    distinctTrackCompletionCount: await countQualifiedAchievementProgressKeyRows(
      userId,
      "track",
    ),
    activeStudySeconds: await sumAchievementActiveStudySeconds(userId),
  } satisfies AchievementStats;

  for (let attempt = 0; attempt < ACHIEVEMENT_STATS_UPDATE_RETRY_LIMIT; attempt += 1) {
    const currentRow = await ensureAchievementStatsRow(userId);
    const currentStats = toAchievementStats(currentRow);

    if (
      currentStats.conceptVisitCount === expectedStats.conceptVisitCount &&
      currentStats.questionAnswerCount === expectedStats.questionAnswerCount &&
      currentStats.distinctChallengeCompletionCount ===
        expectedStats.distinctChallengeCompletionCount &&
      currentStats.distinctTrackCompletionCount === expectedStats.distinctTrackCompletionCount &&
      currentStats.activeStudySeconds === expectedStats.activeStudySeconds
    ) {
      return currentStats;
    }

    const updatedRow = await saveAchievementStatsRowIfCurrentMatches({
      currentRow,
      nextRow: getUpdatedStatsRow(currentRow, expectedStats),
    });

    if (updatedRow) {
      return toAchievementStats(updatedRow);
    }
  }

  throw new Error("achievement_stats_reconciliation_conflict");
}

export async function syncAchievementsFromTrustedProgressSnapshot(input: {
  userId: string;
  entitlementTier: AccountEntitlementTier;
  snapshot: ProgressSnapshot;
}) {
  const earnedRows = await getEarnedAchievementRows(input.userId);
  const billingProfile = await getBillingProfileForAchievementUser(input.userId);
  const challengeAchievementKeys: string[] = [];
  const trackAchievementKeys: string[] = [];
  let challengeCountDelta = 0;
  let trackCountDelta = 0;

  for (const [conceptSlug, record] of Object.entries(input.snapshot.concepts)) {
    for (const challengeId of Object.keys(record.completedChallenges ?? {})) {
      const inserted = await recordQualifiedProgressKey({
        userId: input.userId,
        recordType: "challenge",
        recordKey: `${conceptSlug}:${challengeId}`,
        conceptSlug,
        challengeId,
        metadata: {},
      });

      if (inserted) {
        challengeCountDelta += 1;
        challengeAchievementKeys.push(`challenge:${conceptSlug}:${challengeId}`);
      }
    }
  }

  for (const track of getStarterTracks()) {
    if (getStarterTrackProgressSummary(input.snapshot, track).status !== "completed") {
      continue;
    }

    const inserted = await recordQualifiedProgressKey({
      userId: input.userId,
      recordType: "track",
      recordKey: track.slug,
      trackSlug: track.slug,
      metadata: {},
    });

    if (inserted) {
      trackCountDelta += 1;
      trackAchievementKeys.push(`track:${track.slug}`);
    }
  }

  const stats = await applyAchievementStatsDelta(input.userId, {
    distinctChallengeCompletionCount: challengeCountDelta,
    distinctTrackCompletionCount: trackCountDelta,
  });
  const reward = await ensureRewardUnlockedIfEligible({
    userId: input.userId,
    entitlementTier: input.entitlementTier,
    stats,
    billingProfile,
    existingReward: await getRewardUnlockRow(input.userId, ACHIEVEMENT_REWARD_KEY),
  });
  const milestoneToasts = await awardAchievementKeys({
    userId: input.userId,
    achievementKeys: getMilestoneKeysToAward(stats, earnedRows),
    existingEarnedRows: earnedRows,
  });
  const namedToasts = await awardAchievementKeys({
    userId: input.userId,
    achievementKeys: [...challengeAchievementKeys, ...trackAchievementKeys],
    existingEarnedRows: earnedRows,
  });

  return {
    challengeCountDelta,
    trackCountDelta,
    reward,
    newlyEarnedAchievements: [...namedToasts, ...milestoneToasts],
  };
}

export async function recordAccountAchievementEvent(input: {
  userId: string;
  entitlementTier: AccountEntitlementTier;
  event: AccountAchievementEvent;
}) {
  const earnedRows = await getEarnedAchievementRows(input.userId);
  const billingProfile = await getBillingProfileForAchievementUser(input.userId);
  const namedAchievementKeys: string[] = [];
  let stats = toAchievementStats(await ensureAchievementStatsRow(input.userId));

  switch (input.event.type) {
    case "question_answered": {
      getConceptBySlug(input.event.conceptSlug);
      const questionVersionKey = getQuestionVersionKey(
        input.event.conceptSlug,
        input.event.questionId,
      );

      if (!questionVersionKey) {
        throw new Error("unknown_question");
      }

      const inserted = await recordQualifiedProgressKey({
        userId: input.userId,
        recordType: "question",
        recordKey: questionVersionKey,
        conceptSlug: input.event.conceptSlug,
        metadata: {},
      });

      if (inserted) {
        stats = await applyAchievementStatsDelta(input.userId, {
          questionAnswerCount: 1,
        });
      }
      break;
    }
    case "challenge_completed": {
      getConceptBySlug(input.event.conceptSlug);
      const inserted = await recordQualifiedProgressKey({
        userId: input.userId,
        recordType: "challenge",
        recordKey: `${input.event.conceptSlug}:${input.event.challengeId}`,
        conceptSlug: input.event.conceptSlug,
        challengeId: input.event.challengeId,
        metadata: {},
      });

      if (inserted) {
        namedAchievementKeys.push(
          `challenge:${input.event.conceptSlug}:${input.event.challengeId}`,
        );
        stats = await applyAchievementStatsDelta(input.userId, {
          distinctChallengeCompletionCount: 1,
        });
      }
      break;
    }
    case "track_completed": {
      getStarterTrackBySlug(input.event.trackSlug);
      const inserted = await recordQualifiedProgressKey({
        userId: input.userId,
        recordType: "track",
        recordKey: input.event.trackSlug,
        trackSlug: input.event.trackSlug,
        metadata: {},
      });

      if (inserted) {
        namedAchievementKeys.push(`track:${input.event.trackSlug}`);
        stats = await applyAchievementStatsDelta(input.userId, {
          distinctTrackCompletionCount: 1,
        });
      }
      break;
    }
    case "concept_engagement": {
      getConceptBySlug(input.event.conceptSlug);
      const existingSession = await getAchievementActiveSessionRow(
        input.userId,
        input.event.sessionId,
      );
      const sessionActiveStudySeconds = Math.max(
        0,
        Math.floor(input.event.sessionActiveStudySeconds ?? 0),
      );
      const priorSessionActiveStudySeconds = existingSession?.active_study_seconds ?? 0;
      const heartbeatDelta =
        sessionActiveStudySeconds > 0
          ? Math.max(0, sessionActiveStudySeconds - priorSessionActiveStudySeconds)
          : input.event.heartbeatSlot !== null &&
              (existingSession?.last_heartbeat_slot === null ||
                existingSession?.last_heartbeat_slot === undefined ||
                input.event.heartbeatSlot > existingSession.last_heartbeat_slot)
            ? ACHIEVEMENT_STUDY_HEARTBEAT_SECONDS
            : 0;
      const sessionInteractionCount = Math.max(
        existingSession?.interaction_count ?? 0,
        input.event.interactionCount,
      );
      const interactionDelta = Math.max(
        0,
        input.event.interactionCount - (existingSession?.interaction_count ?? 0),
      );
      const now = new Date().toISOString();

      await saveAchievementActiveSessionRow({
        user_id: input.userId,
        session_id: input.event.sessionId,
        concept_slug: input.event.conceptSlug,
        last_heartbeat_slot:
          input.event.heartbeatSlot ?? existingSession?.last_heartbeat_slot ?? null,
        interaction_count: sessionInteractionCount,
        active_study_seconds:
          sessionActiveStudySeconds > 0
            ? Math.max(priorSessionActiveStudySeconds, sessionActiveStudySeconds)
            : priorSessionActiveStudySeconds + heartbeatDelta,
        last_seen_at: now,
        created_at: existingSession?.created_at ?? now,
        updated_at: now,
      });

      const conceptRecordKey = input.event.conceptSlug;
      const existingConceptProgress = await getAchievementProgressKeyRow(
        input.userId,
        "concept",
        conceptRecordKey,
      );
      const conceptMetadata = existingConceptProgress?.metadata ?? {};
      const priorActiveSeconds = Number(conceptMetadata.activeStudySeconds ?? 0);
      const priorInteractionCount = Number(conceptMetadata.interactionCount ?? 0);
      const nextActiveSeconds = priorActiveSeconds + heartbeatDelta;
      const nextInteractionCount = priorInteractionCount + interactionDelta;
      const qualifiesVisit =
        nextActiveSeconds >= ACHIEVEMENT_VISIT_ACTIVE_SECONDS ||
        nextInteractionCount >= ACHIEVEMENT_VISIT_INTERACTION_COUNT;
      const nextConceptMetadata = {
        ...conceptMetadata,
        activeStudySeconds: nextActiveSeconds,
        interactionCount: nextInteractionCount,
      };

      await saveAchievementProgressKeyMetadataRow({
        user_id: input.userId,
        record_type: "concept",
        record_key: conceptRecordKey,
        concept_slug: input.event.conceptSlug,
        challenge_id: null,
        track_slug: null,
        qualified_at: existingConceptProgress?.qualified_at ?? null,
        metadata: nextConceptMetadata,
        created_at: existingConceptProgress?.created_at ?? now,
        updated_at: now,
      });

      let qualifiedTransition = false;
      let nextQualifiedAt = existingConceptProgress?.qualified_at ?? null;

      if (!existingConceptProgress?.qualified_at && qualifiesVisit) {
        const qualifiedRow = await qualifyAchievementProgressKeyRowIfPending({
          user_id: input.userId,
          record_type: "concept",
          record_key: conceptRecordKey,
          concept_slug: input.event.conceptSlug,
          challenge_id: null,
          track_slug: null,
          qualified_at: now,
          metadata: nextConceptMetadata,
          created_at: existingConceptProgress?.created_at ?? now,
          updated_at: now,
        });

        qualifiedTransition = Boolean(qualifiedRow);
        nextQualifiedAt = qualifiedRow?.qualified_at ?? nextQualifiedAt;
      }

      if (!existingConceptProgress?.qualified_at && qualifiesVisit) {
        console.info("[account] concept engagement qualification evaluated", {
          userId: input.userId,
          conceptSlug: input.event.conceptSlug,
          priorActiveSeconds,
          nextActiveSeconds,
          priorInteractionCount,
          nextInteractionCount,
          priorQualifiedAt: existingConceptProgress?.qualified_at ?? null,
          nextQualifiedAt,
          conceptVisitIncremented: qualifiedTransition,
        });
      }

      stats = await applyAchievementStatsDelta(input.userId, {
        activeStudySeconds: heartbeatDelta,
        conceptVisitCount: qualifiedTransition ? 1 : 0,
      });
      break;
    }
  }

  const reward = await ensureRewardUnlockedIfEligible({
    userId: input.userId,
    entitlementTier: input.entitlementTier,
    stats,
    billingProfile,
    existingReward: await getRewardUnlockRow(input.userId, ACHIEVEMENT_REWARD_KEY),
  });
  const namedToasts = await awardAchievementKeys({
    userId: input.userId,
    achievementKeys: namedAchievementKeys,
    existingEarnedRows: earnedRows,
  });
  const milestoneToasts = await awardAchievementKeys({
    userId: input.userId,
    achievementKeys: getMilestoneKeysToAward(stats, earnedRows),
    existingEarnedRows: earnedRows,
  });

  return {
    newlyEarnedAchievements: [...namedToasts, ...milestoneToasts],
    reward,
  };
}

export async function getAccountAchievementOverview(input: {
  userId: string;
  entitlementTier: AccountEntitlementTier;
  checkoutRewardConfigured: boolean;
}) {
  await reconcileAchievementStatsFromSource(input.userId);
  const { stats, billingProfile, reward } = await getAchievementRewardContext({
    userId: input.userId,
    entitlementTier: input.entitlementTier,
  });
  const earnedRows = await getEarnedAchievementRows(input.userId);

  return {
    stats,
    milestoneGroups: createMilestoneGroups(earnedRows, stats),
    namedGroups: createNamedGroups(earnedRows),
    reward: buildRewardSummary({
      reward,
      stats,
      entitlementTier: input.entitlementTier,
      billingProfile,
      checkoutReady: input.checkoutRewardConfigured,
    }),
  } satisfies AccountAchievementOverview;
}

export async function getAccountAchievementOverviewForAuthenticatedUser(input: {
  userId: string;
  cookieHeader: string | null;
  entitlementTier: AccountEntitlementTier;
  checkoutRewardConfigured: boolean;
}) {
  const stats = toAchievementStats(
    await getAchievementStatsRowForAuthenticatedUser(input.userId, input.cookieHeader),
  );
  const earnedRows = await getEarnedAchievementRowsForAuthenticatedUser(
    input.userId,
    input.cookieHeader,
  );
  const rewardContext = await getAuthenticatedAchievementRewardContext({
    userId: input.userId,
    cookieHeader: input.cookieHeader,
  });

  return {
    stats,
    milestoneGroups: createMilestoneGroups(earnedRows, stats),
    namedGroups: createNamedGroups(earnedRows),
    reward: buildRewardSummary({
      reward: rewardContext.reward,
      stats,
      entitlementTier: input.entitlementTier,
      billingProfile: rewardContext.billingProfile,
      checkoutReady: input.checkoutRewardConfigured,
      temporarilyUnavailable: rewardContext.unavailable,
    }),
  } satisfies AccountAchievementOverview;
}

export async function getAccountAchievementDashboardSnapshot(input: {
  userId: string;
}) {
  const stats = await reconcileAchievementStatsFromSource(input.userId);
  const earnedRows = await getEarnedAchievementRows(input.userId);

  return buildAchievementDashboardSnapshot(createMilestoneGroups(earnedRows, stats));
}

export async function getAccountAchievementDashboardSnapshotForAuthenticatedUser(input: {
  userId: string;
  cookieHeader: string | null;
}) {
  const stats = toAchievementStats(
    await getAchievementStatsRowForAuthenticatedUser(input.userId, input.cookieHeader),
  );
  const earnedRows = await getEarnedAchievementRowsForAuthenticatedUser(
    input.userId,
    input.cookieHeader,
  );

  return buildAchievementDashboardSnapshot(createMilestoneGroups(earnedRows, stats));
}

export async function getAchievementStatsForUser(input: {
  userId: string;
}) {
  return reconcileAchievementStatsFromSource(input.userId);
}

export { reconcileAchievementStatsFromSource };

export async function assertAchievementWritePathAvailable(input: {
  userId: string;
}) {
  await getAchievementStatsRow(input.userId);
}

export async function getAchievementRewardForCheckout(input: {
  userId: string;
  entitlementTier: AccountEntitlementTier;
}) {
  if (input.entitlementTier !== "free") {
    return null;
  }

  const { billingProfile, reward } = await getAchievementRewardContext({
    userId: input.userId,
    entitlementTier: input.entitlementTier,
  });

  if (hasHistoricalPremiumSubscription(billingProfile)) {
    return null;
  }

  return reward;
}

export async function reserveAchievementRewardForCheckout(input: {
  userId: string;
  entitlementTier: AccountEntitlementTier;
}) {
  const reward = await getAchievementRewardForCheckout(input);

  if (!reward || reward.status !== "unlocked") {
    return null;
  }

  return reserveRewardUnlockRow({
    userId: input.userId,
    rewardKey: ACHIEVEMENT_REWARD_KEY,
    claimedAt: new Date().toISOString(),
  });
}

export async function attachAchievementRewardCheckoutSession(input: {
  userId: string;
  checkoutSessionId: string;
  couponId: string;
  priceId: string;
}) {
  return attachRewardCheckoutSessionToClaimRow({
    userId: input.userId,
    rewardKey: ACHIEVEMENT_REWARD_KEY,
    checkoutSessionId: input.checkoutSessionId,
    couponId: input.couponId,
    priceId: input.priceId,
  });
}

export async function releaseAchievementRewardCheckoutClaim(input: {
  userId: string;
  checkoutSessionId?: string | null;
}) {
  return releaseRewardUnlockClaimRow({
    userId: input.userId,
    rewardKey: ACHIEVEMENT_REWARD_KEY,
    checkoutSessionId: input.checkoutSessionId,
  });
}

export async function markAchievementRewardUsed(input: {
  userId: string;
  subscriptionId: string | null;
}) {
  const updated = await markRewardUnlockUsedRow({
    userId: input.userId,
    rewardKey: ACHIEVEMENT_REWARD_KEY,
    usedAt: new Date().toISOString(),
    subscriptionId: input.subscriptionId,
  });

  if (updated) {
    return updated;
  }

  const now = new Date().toISOString();

  return saveRewardUnlockRow({
    user_id: input.userId,
    reward_key: ACHIEVEMENT_REWARD_KEY,
    status: "used",
    unlock_reason: null,
    metadata: {
      discountPercent: ACHIEVEMENT_REWARD_DISCOUNT_PERCENT,
    },
    unlocked_at: now,
    expires_at: now,
    claimed_at: now,
    claim_checkout_session_id: null,
    claim_coupon_id: null,
    claim_price_id: null,
    used_at: now,
    used_subscription_id: input.subscriptionId,
  });
}
