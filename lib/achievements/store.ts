import {
  isDevAccountHarnessFixtureUserId,
  readDevAccountHarnessAchievements,
  updateDevAccountHarnessAchievements,
} from "@/lib/account/dev-harness";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";

const USER_ACHIEVEMENT_STATS_TABLE = "user_achievement_stats";
const USER_ACHIEVEMENT_PROGRESS_KEYS_TABLE = "user_achievement_progress_keys";
const USER_EARNED_ACHIEVEMENTS_TABLE = "user_earned_achievements";
const USER_REWARD_UNLOCKS_TABLE = "user_reward_unlocks";
const USER_ACHIEVEMENT_ACTIVE_SESSIONS_TABLE = "user_achievement_active_sessions";

export type AchievementProgressRecordType = "concept" | "question" | "challenge" | "track";

export type AchievementStatsRow = {
  user_id: string;
  concept_visit_count: number;
  question_answer_count: number;
  distinct_challenge_completion_count: number;
  distinct_track_completion_count: number;
  active_study_seconds: number;
  created_at: string;
  updated_at: string;
};

export type AchievementProgressKeyRow = {
  user_id: string;
  record_type: AchievementProgressRecordType;
  record_key: string;
  concept_slug: string | null;
  challenge_id: string | null;
  track_slug: string | null;
  qualified_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type EarnedAchievementRow = {
  user_id: string;
  achievement_key: string;
  achievement_kind: "milestone" | "challenge" | "track";
  category_key: string;
  metadata: Record<string, unknown>;
  earned_at: string;
};

export type RewardUnlockRow = {
  user_id: string;
  reward_key: string;
  status: "unlocked" | "claimed" | "expired" | "used" | "already-used";
  unlock_reason: string | null;
  metadata: Record<string, unknown>;
  unlocked_at: string;
  expires_at: string;
  claimed_at: string | null;
  claim_checkout_session_id: string | null;
  claim_coupon_id: string | null;
  claim_price_id: string | null;
  used_at: string | null;
  used_subscription_id: string | null;
};

export type AchievementActiveSessionRow = {
  user_id: string;
  session_id: string;
  concept_slug: string;
  last_heartbeat_slot: number | null;
  interaction_count: number;
  active_study_seconds: number;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};

function buildEmptyStatsRow(userId: string): AchievementStatsRow {
  const now = new Date().toISOString();

  return {
    user_id: userId,
    concept_visit_count: 0,
    question_answer_count: 0,
    distinct_challenge_completion_count: 0,
    distinct_track_completion_count: 0,
    active_study_seconds: 0,
    created_at: now,
    updated_at: now,
  };
}

function achievementStatsRowsMatch(
  left: AchievementStatsRow | null | undefined,
  right: AchievementStatsRow | null | undefined,
) {
  return (
    Boolean(left) &&
    Boolean(right) &&
    left!.user_id === right!.user_id &&
    left!.concept_visit_count === right!.concept_visit_count &&
    left!.question_answer_count === right!.question_answer_count &&
    left!.distinct_challenge_completion_count ===
      right!.distinct_challenge_completion_count &&
    left!.distinct_track_completion_count === right!.distinct_track_completion_count &&
    left!.active_study_seconds === right!.active_study_seconds &&
    left!.updated_at === right!.updated_at
  );
}

export async function getAchievementStatsRow(userId: string) {
  if (isDevAccountHarnessFixtureUserId(userId)) {
    const state = await readDevAccountHarnessAchievements(userId);
    return state.stats;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from(USER_ACHIEVEMENT_STATS_TABLE)
    .select(
      "user_id, concept_visit_count, question_answer_count, distinct_challenge_completion_count, distinct_track_completion_count, active_study_seconds, created_at, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle<AchievementStatsRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function ensureAchievementStatsRow(userId: string) {
  const existing = await getAchievementStatsRow(userId);

  if (existing) {
    return existing;
  }

  return saveAchievementStatsRow(buildEmptyStatsRow(userId));
}

export async function getAchievementStatsRowForAuthenticatedUser(
  userId: string,
  cookieHeader: string | null,
) {
  if (isDevAccountHarnessFixtureUserId(userId)) {
    const state = await readDevAccountHarnessAchievements(userId);
    return state.stats;
  }

  const supabase = createSupabaseServerClient({ cookieHeader });
  const { data, error } = await supabase
    .from(USER_ACHIEVEMENT_STATS_TABLE)
    .select(
      "user_id, concept_visit_count, question_answer_count, distinct_challenge_completion_count, distinct_track_completion_count, active_study_seconds, created_at, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle<AchievementStatsRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function saveAchievementStatsRow(row: AchievementStatsRow) {
  if (isDevAccountHarnessFixtureUserId(row.user_id)) {
    await updateDevAccountHarnessAchievements(row.user_id, (state) => {
      state.stats = row;
    });
    return row;
  }

  const supabase = createSupabaseServiceRoleClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(USER_ACHIEVEMENT_STATS_TABLE)
    .upsert({
      ...row,
      updated_at: now,
      created_at: row.created_at ?? now,
    })
    .select(
      "user_id, concept_visit_count, question_answer_count, distinct_challenge_completion_count, distinct_track_completion_count, active_study_seconds, created_at, updated_at",
    )
    .single<AchievementStatsRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveAchievementStatsRowIfCurrentMatches(input: {
  currentRow: AchievementStatsRow;
  nextRow: AchievementStatsRow;
}) {
  if (isDevAccountHarnessFixtureUserId(input.currentRow.user_id)) {
    let updated: AchievementStatsRow | null = null;

    await updateDevAccountHarnessAchievements(input.currentRow.user_id, (state) => {
      if (!achievementStatsRowsMatch(state.stats, input.currentRow)) {
        return;
      }

      updated = {
        ...input.nextRow,
      };
      state.stats = updated;
    });

    return updated;
  }

  const supabase = createSupabaseServiceRoleClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(USER_ACHIEVEMENT_STATS_TABLE)
    .update({
      ...input.nextRow,
      updated_at: now,
      created_at: input.nextRow.created_at ?? input.currentRow.created_at ?? now,
    })
    .eq("user_id", input.currentRow.user_id)
    .eq("concept_visit_count", input.currentRow.concept_visit_count)
    .eq("question_answer_count", input.currentRow.question_answer_count)
    .eq(
      "distinct_challenge_completion_count",
      input.currentRow.distinct_challenge_completion_count,
    )
    .eq("distinct_track_completion_count", input.currentRow.distinct_track_completion_count)
    .eq("active_study_seconds", input.currentRow.active_study_seconds)
    .eq("updated_at", input.currentRow.updated_at)
    .select(
      "user_id, concept_visit_count, question_answer_count, distinct_challenge_completion_count, distinct_track_completion_count, active_study_seconds, created_at, updated_at",
    )
    .maybeSingle<AchievementStatsRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function getAchievementProgressKeyRow(
  userId: string,
  recordType: AchievementProgressRecordType,
  recordKey: string,
) {
  if (isDevAccountHarnessFixtureUserId(userId)) {
    const state = await readDevAccountHarnessAchievements(userId);
    return state.progressKeys[`${recordType}::${recordKey}`] ?? null;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from(USER_ACHIEVEMENT_PROGRESS_KEYS_TABLE)
    .select(
      "user_id, record_type, record_key, concept_slug, challenge_id, track_slug, qualified_at, metadata, created_at, updated_at",
    )
    .eq("user_id", userId)
    .eq("record_type", recordType)
    .eq("record_key", recordKey)
    .maybeSingle<AchievementProgressKeyRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function countQualifiedAchievementProgressKeyRows(
  userId: string,
  recordType: AchievementProgressRecordType,
) {
  if (isDevAccountHarnessFixtureUserId(userId)) {
    const state = await readDevAccountHarnessAchievements(userId);

    return Object.values(state.progressKeys).filter(
      (row) => row.record_type === recordType && Boolean(row.qualified_at),
    ).length;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { count, error } = await supabase
    .from(USER_ACHIEVEMENT_PROGRESS_KEYS_TABLE)
    .select("record_key", {
      count: "exact",
      head: true,
    })
    .eq("user_id", userId)
    .eq("record_type", recordType)
    .not("qualified_at", "is", null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function saveAchievementProgressKeyRow(row: AchievementProgressKeyRow) {
  if (isDevAccountHarnessFixtureUserId(row.user_id)) {
    await updateDevAccountHarnessAchievements(row.user_id, (state) => {
      state.progressKeys[`${row.record_type}::${row.record_key}`] = row;
    });
    return row;
  }

  const supabase = createSupabaseServiceRoleClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(USER_ACHIEVEMENT_PROGRESS_KEYS_TABLE)
    .upsert({
      ...row,
      metadata: row.metadata ?? {},
      updated_at: now,
      created_at: row.created_at ?? now,
    })
    .select(
      "user_id, record_type, record_key, concept_slug, challenge_id, track_slug, qualified_at, metadata, created_at, updated_at",
    )
    .single<AchievementProgressKeyRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function insertAchievementProgressKeyRow(row: AchievementProgressKeyRow) {
  if (isDevAccountHarnessFixtureUserId(row.user_id)) {
    let inserted: AchievementProgressKeyRow | null = null;

    await updateDevAccountHarnessAchievements(row.user_id, (state) => {
      const key = `${row.record_type}::${row.record_key}`;

      if (state.progressKeys[key]) {
        return;
      }

      inserted = {
        ...row,
        metadata: row.metadata ?? {},
      };
      state.progressKeys[key] = inserted;
    });

    return inserted;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from(USER_ACHIEVEMENT_PROGRESS_KEYS_TABLE)
    .insert({
      ...row,
      metadata: row.metadata ?? {},
    })
    .select(
      "user_id, record_type, record_key, concept_slug, challenge_id, track_slug, qualified_at, metadata, created_at, updated_at",
    )
    .single<AchievementProgressKeyRow>();

  if (!error) {
    return data;
  }

  if ((error as { code?: string }).code === "23505") {
    return null;
  }

  throw error;
}

export async function saveAchievementProgressKeyMetadataRow(row: AchievementProgressKeyRow) {
  if (isDevAccountHarnessFixtureUserId(row.user_id)) {
    let updated: AchievementProgressKeyRow | null = null;

    await updateDevAccountHarnessAchievements(row.user_id, (state) => {
      const key = `${row.record_type}::${row.record_key}`;
      const existing = state.progressKeys[key];

      updated = {
        ...row,
        qualified_at: existing?.qualified_at ?? row.qualified_at ?? null,
        metadata: row.metadata ?? {},
        created_at: existing?.created_at ?? row.created_at,
      };
      state.progressKeys[key] = updated;
    });

    return updated;
  }

  const supabase = createSupabaseServiceRoleClient();
  const now = new Date().toISOString();
  const updatePayload = {
    concept_slug: row.concept_slug,
    challenge_id: row.challenge_id,
    track_slug: row.track_slug,
    metadata: row.metadata ?? {},
    updated_at: now,
  };
  const { data, error } = await supabase
    .from(USER_ACHIEVEMENT_PROGRESS_KEYS_TABLE)
    .update(updatePayload)
    .eq("user_id", row.user_id)
    .eq("record_type", row.record_type)
    .eq("record_key", row.record_key)
    .select(
      "user_id, record_type, record_key, concept_slug, challenge_id, track_slug, qualified_at, metadata, created_at, updated_at",
    )
    .maybeSingle<AchievementProgressKeyRow>();

  if (error) {
    throw error;
  }

  if (data) {
    return data;
  }

  const inserted = await insertAchievementProgressKeyRow({
    ...row,
    qualified_at: null,
    metadata: row.metadata ?? {},
    updated_at: now,
    created_at: row.created_at ?? now,
  });

  if (inserted) {
    return inserted;
  }

  const { data: retried, error: retryError } = await supabase
    .from(USER_ACHIEVEMENT_PROGRESS_KEYS_TABLE)
    .update(updatePayload)
    .eq("user_id", row.user_id)
    .eq("record_type", row.record_type)
    .eq("record_key", row.record_key)
    .select(
      "user_id, record_type, record_key, concept_slug, challenge_id, track_slug, qualified_at, metadata, created_at, updated_at",
    )
    .single<AchievementProgressKeyRow>();

  if (retryError) {
    throw retryError;
  }

  return retried;
}

export async function qualifyAchievementProgressKeyRowIfPending(row: AchievementProgressKeyRow) {
  if (isDevAccountHarnessFixtureUserId(row.user_id)) {
    let updated: AchievementProgressKeyRow | null = null;

    await updateDevAccountHarnessAchievements(row.user_id, (state) => {
      const key = `${row.record_type}::${row.record_key}`;
      const existing = state.progressKeys[key];

      if (!existing || existing.qualified_at) {
        return;
      }

      updated = {
        ...existing,
        concept_slug: row.concept_slug,
        challenge_id: row.challenge_id,
        track_slug: row.track_slug,
        qualified_at: row.qualified_at,
        metadata: row.metadata ?? existing.metadata ?? {},
        updated_at: row.updated_at,
      };
      state.progressKeys[key] = updated;
    });

    return updated;
  }

  const supabase = createSupabaseServiceRoleClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(USER_ACHIEVEMENT_PROGRESS_KEYS_TABLE)
    .update({
      concept_slug: row.concept_slug,
      challenge_id: row.challenge_id,
      track_slug: row.track_slug,
      qualified_at: row.qualified_at,
      metadata: row.metadata ?? {},
      updated_at: now,
    })
    .eq("user_id", row.user_id)
    .eq("record_type", row.record_type)
    .eq("record_key", row.record_key)
    .is("qualified_at", null)
    .select(
      "user_id, record_type, record_key, concept_slug, challenge_id, track_slug, qualified_at, metadata, created_at, updated_at",
    )
    .maybeSingle<AchievementProgressKeyRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function getEarnedAchievementRows(userId: string) {
  if (isDevAccountHarnessFixtureUserId(userId)) {
    const state = await readDevAccountHarnessAchievements(userId);

    return Object.values(state.earnedAchievementsByKey).sort((left, right) =>
      left.earned_at.localeCompare(right.earned_at),
    );
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from(USER_EARNED_ACHIEVEMENTS_TABLE)
    .select("user_id, achievement_key, achievement_kind, category_key, metadata, earned_at")
    .eq("user_id", userId)
    .order("earned_at", { ascending: true })
    .returns<EarnedAchievementRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getEarnedAchievementRowsForAuthenticatedUser(
  userId: string,
  cookieHeader: string | null,
) {
  if (isDevAccountHarnessFixtureUserId(userId)) {
    const state = await readDevAccountHarnessAchievements(userId);

    return Object.values(state.earnedAchievementsByKey).sort((left, right) =>
      left.earned_at.localeCompare(right.earned_at),
    );
  }

  const supabase = createSupabaseServerClient({ cookieHeader });
  const { data, error } = await supabase
    .from(USER_EARNED_ACHIEVEMENTS_TABLE)
    .select("user_id, achievement_key, achievement_kind, category_key, metadata, earned_at")
    .eq("user_id", userId)
    .order("earned_at", { ascending: true })
    .returns<EarnedAchievementRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function insertEarnedAchievementRow(row: EarnedAchievementRow) {
  if (isDevAccountHarnessFixtureUserId(row.user_id)) {
    let inserted = false;

    await updateDevAccountHarnessAchievements(row.user_id, (state) => {
      if (state.earnedAchievementsByKey[row.achievement_key]) {
        return;
      }

      state.earnedAchievementsByKey[row.achievement_key] = {
        ...row,
        metadata: row.metadata ?? {},
      };
      inserted = true;
    });

    return inserted;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from(USER_EARNED_ACHIEVEMENTS_TABLE).insert({
    ...row,
    metadata: row.metadata ?? {},
  });

  if (!error) {
    return true;
  }

  if ((error as { code?: string }).code === "23505") {
    return false;
  }

  throw error;
}

export async function getRewardUnlockRow(userId: string, rewardKey: string) {
  if (isDevAccountHarnessFixtureUserId(userId)) {
    const state = await readDevAccountHarnessAchievements(userId);
    return state.rewardsByKey[rewardKey] ?? null;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from(USER_REWARD_UNLOCKS_TABLE)
    .select(
      "user_id, reward_key, status, unlock_reason, metadata, unlocked_at, expires_at, claimed_at, claim_checkout_session_id, claim_coupon_id, claim_price_id, used_at, used_subscription_id",
    )
    .eq("user_id", userId)
    .eq("reward_key", rewardKey)
    .maybeSingle<RewardUnlockRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function getRewardUnlockRowForAuthenticatedUser(
  userId: string,
  rewardKey: string,
  cookieHeader: string | null,
) {
  if (isDevAccountHarnessFixtureUserId(userId)) {
    const state = await readDevAccountHarnessAchievements(userId);
    return state.rewardsByKey[rewardKey] ?? null;
  }

  const supabase = createSupabaseServerClient({ cookieHeader });
  const { data, error } = await supabase
    .from(USER_REWARD_UNLOCKS_TABLE)
    .select(
      "user_id, reward_key, status, unlock_reason, metadata, unlocked_at, expires_at, claimed_at, claim_checkout_session_id, claim_coupon_id, claim_price_id, used_at, used_subscription_id",
    )
    .eq("user_id", userId)
    .eq("reward_key", rewardKey)
    .maybeSingle<RewardUnlockRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function saveRewardUnlockRow(row: RewardUnlockRow) {
  if (isDevAccountHarnessFixtureUserId(row.user_id)) {
    await updateDevAccountHarnessAchievements(row.user_id, (state) => {
      state.rewardsByKey[row.reward_key] = {
        ...row,
        metadata: row.metadata ?? {},
      };
    });
    return row;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from(USER_REWARD_UNLOCKS_TABLE)
    .upsert({
      ...row,
      metadata: row.metadata ?? {},
    })
    .select(
      "user_id, reward_key, status, unlock_reason, metadata, unlocked_at, expires_at, claimed_at, claim_checkout_session_id, claim_coupon_id, claim_price_id, used_at, used_subscription_id",
    )
    .single<RewardUnlockRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function reserveRewardUnlockRow(input: {
  userId: string;
  rewardKey: string;
  claimedAt: string;
}) {
  if (isDevAccountHarnessFixtureUserId(input.userId)) {
    let updated: RewardUnlockRow | null = null;

    await updateDevAccountHarnessAchievements(input.userId, (state) => {
      const existing = state.rewardsByKey[input.rewardKey];

      if (
        !existing ||
        existing.status !== "unlocked" ||
        existing.expires_at <= input.claimedAt
      ) {
        return;
      }

      updated = {
        ...existing,
        status: "claimed",
        claimed_at: input.claimedAt,
        claim_checkout_session_id: null,
        claim_coupon_id: null,
        claim_price_id: null,
      };
      state.rewardsByKey[input.rewardKey] = updated;
    });

    return updated;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from(USER_REWARD_UNLOCKS_TABLE)
    .update({
      status: "claimed",
      claimed_at: input.claimedAt,
      claim_checkout_session_id: null,
      claim_coupon_id: null,
      claim_price_id: null,
    })
    .eq("user_id", input.userId)
    .eq("reward_key", input.rewardKey)
    .eq("status", "unlocked")
    .gt("expires_at", input.claimedAt)
    .select(
      "user_id, reward_key, status, unlock_reason, metadata, unlocked_at, expires_at, claimed_at, claim_checkout_session_id, claim_coupon_id, claim_price_id, used_at, used_subscription_id",
    )
    .maybeSingle<RewardUnlockRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function attachRewardCheckoutSessionToClaimRow(input: {
  userId: string;
  rewardKey: string;
  checkoutSessionId: string;
  couponId: string;
  priceId: string;
}) {
  if (isDevAccountHarnessFixtureUserId(input.userId)) {
    let updated: RewardUnlockRow | null = null;

    await updateDevAccountHarnessAchievements(input.userId, (state) => {
      const existing = state.rewardsByKey[input.rewardKey];

      if (
        !existing ||
        existing.status !== "claimed" ||
        (existing.claim_checkout_session_id &&
          existing.claim_checkout_session_id !== input.checkoutSessionId)
      ) {
        return;
      }

      updated = {
        ...existing,
        claim_checkout_session_id: input.checkoutSessionId,
        claim_coupon_id: input.couponId,
        claim_price_id: input.priceId,
      };
      state.rewardsByKey[input.rewardKey] = updated;
    });

    return updated;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from(USER_REWARD_UNLOCKS_TABLE)
    .update({
      claim_checkout_session_id: input.checkoutSessionId,
      claim_coupon_id: input.couponId,
      claim_price_id: input.priceId,
    })
    .eq("user_id", input.userId)
    .eq("reward_key", input.rewardKey)
    .eq("status", "claimed")
    .or(
      `claim_checkout_session_id.is.null,claim_checkout_session_id.eq.${input.checkoutSessionId}`,
    )
    .select(
      "user_id, reward_key, status, unlock_reason, metadata, unlocked_at, expires_at, claimed_at, claim_checkout_session_id, claim_coupon_id, claim_price_id, used_at, used_subscription_id",
    )
    .maybeSingle<RewardUnlockRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function releaseRewardUnlockClaimRow(input: {
  userId: string;
  rewardKey: string;
  checkoutSessionId?: string | null;
}) {
  if (isDevAccountHarnessFixtureUserId(input.userId)) {
    let updated: RewardUnlockRow | null = null;

    await updateDevAccountHarnessAchievements(input.userId, (state) => {
      const existing = state.rewardsByKey[input.rewardKey];

      if (
        !existing ||
        existing.status !== "claimed" ||
        (input.checkoutSessionId &&
          existing.claim_checkout_session_id !== input.checkoutSessionId)
      ) {
        return;
      }

      updated = {
        ...existing,
        status: "unlocked",
        claimed_at: null,
        claim_checkout_session_id: null,
        claim_coupon_id: null,
        claim_price_id: null,
      };
      state.rewardsByKey[input.rewardKey] = updated;
    });

    return updated;
  }

  const supabase = createSupabaseServiceRoleClient();
  let query = supabase
    .from(USER_REWARD_UNLOCKS_TABLE)
    .update({
      status: "unlocked",
      claimed_at: null,
      claim_checkout_session_id: null,
      claim_coupon_id: null,
      claim_price_id: null,
    })
    .eq("user_id", input.userId)
    .eq("reward_key", input.rewardKey)
    .eq("status", "claimed");

  if (input.checkoutSessionId) {
    query = query.eq("claim_checkout_session_id", input.checkoutSessionId);
  }

  const { data, error } = await query
    .select(
      "user_id, reward_key, status, unlock_reason, metadata, unlocked_at, expires_at, claimed_at, claim_checkout_session_id, claim_coupon_id, claim_price_id, used_at, used_subscription_id",
    )
    .maybeSingle<RewardUnlockRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function markRewardUnlockUsedRow(input: {
  userId: string;
  rewardKey: string;
  usedAt: string;
  subscriptionId: string | null;
}) {
  if (isDevAccountHarnessFixtureUserId(input.userId)) {
    let updated: RewardUnlockRow | null = null;

    await updateDevAccountHarnessAchievements(input.userId, (state) => {
      const existing = state.rewardsByKey[input.rewardKey];

      if (!existing || !["claimed", "unlocked"].includes(existing.status)) {
        return;
      }

      updated = {
        ...existing,
        status: "used",
        used_at: input.usedAt,
        used_subscription_id: input.subscriptionId,
      };
      state.rewardsByKey[input.rewardKey] = updated;
    });

    return updated;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from(USER_REWARD_UNLOCKS_TABLE)
    .update({
      status: "used",
      used_at: input.usedAt,
      used_subscription_id: input.subscriptionId,
    })
    .eq("user_id", input.userId)
    .eq("reward_key", input.rewardKey)
    .in("status", ["claimed", "unlocked"])
    .select(
      "user_id, reward_key, status, unlock_reason, metadata, unlocked_at, expires_at, claimed_at, claim_checkout_session_id, claim_coupon_id, claim_price_id, used_at, used_subscription_id",
    )
    .maybeSingle<RewardUnlockRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function getAchievementActiveSessionRow(userId: string, sessionId: string) {
  if (isDevAccountHarnessFixtureUserId(userId)) {
    const state = await readDevAccountHarnessAchievements(userId);
    return state.activeSessionsById[sessionId] ?? null;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from(USER_ACHIEVEMENT_ACTIVE_SESSIONS_TABLE)
    .select(
      "user_id, session_id, concept_slug, last_heartbeat_slot, interaction_count, active_study_seconds, last_seen_at, created_at, updated_at",
    )
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .maybeSingle<AchievementActiveSessionRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function sumAchievementActiveStudySeconds(userId: string) {
  if (isDevAccountHarnessFixtureUserId(userId)) {
    const state = await readDevAccountHarnessAchievements(userId);

    return Object.values(state.activeSessionsById)
      .filter((row) => row.user_id === userId)
      .reduce((total, row) => total + row.active_study_seconds, 0);
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from(USER_ACHIEVEMENT_ACTIVE_SESSIONS_TABLE)
    .select("active_study_seconds")
    .eq("user_id", userId)
    .returns<Array<Pick<AchievementActiveSessionRow, "active_study_seconds">>>();

  if (error) {
    throw error;
  }

  return (data ?? []).reduce((total, row) => total + row.active_study_seconds, 0);
}

export async function saveAchievementActiveSessionRow(row: AchievementActiveSessionRow) {
  if (isDevAccountHarnessFixtureUserId(row.user_id)) {
    await updateDevAccountHarnessAchievements(row.user_id, (state) => {
      state.activeSessionsById[row.session_id] = row;
    });
    return row;
  }

  const supabase = createSupabaseServiceRoleClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(USER_ACHIEVEMENT_ACTIVE_SESSIONS_TABLE)
    .upsert({
      ...row,
      updated_at: now,
      last_seen_at: row.last_seen_at ?? now,
      created_at: row.created_at ?? now,
    })
    .select(
      "user_id, session_id, concept_slug, last_heartbeat_slot, interaction_count, active_study_seconds, last_seen_at, created_at, updated_at",
    )
    .single<AchievementActiveSessionRow>();

  if (error) {
    throw error;
  }

  return data;
}
