import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import type { NextResponse } from "next/server";
import {
  ACHIEVEMENT_REWARD_DISCOUNT_PERCENT,
  ACHIEVEMENT_REWARD_EXPIRY_DAYS,
  ACHIEVEMENT_REWARD_KEY,
  getAchievementDefinition,
  getMilestoneAchievementDefinitions,
} from "@/lib/achievements";
import {
  getStripeBillingPortalConfigDiagnostics,
  getStripeBillingConfig,
  getStripeCheckoutConfigDiagnostics,
} from "@/lib/billing/env";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import { deriveSavedContinueLearningState } from "@/lib/account/progress-sync";
import type { AccountSession, AccountUserSummary } from "@/lib/account/model";
import {
  getConceptBySlug,
  getConceptSummaries,
  getStarterTrackBySlug,
  getStarterTracks,
  getSubjectDiscoverySummaries,
} from "@/lib/content";
import {
  createEmptyProgressSnapshot,
  normalizeProgressSnapshot,
  type ProgressSnapshot,
} from "@/lib/progress/model";
import {
  createEmptyProgressHistoryStore,
  normalizeProgressHistoryStore,
  updateProgressHistoryStore,
  type ProgressHistoryStore,
} from "@/lib/progress/history";
import {
  mergeProgressSnapshots,
  summarizeProgressMerge,
  type ProgressMergeSummary,
} from "@/lib/progress/sync";
import type {
  AchievementActiveSessionRow,
  AchievementProgressKeyRow,
  AchievementStatsRow,
  EarnedAchievementRow,
  RewardUnlockRow,
} from "@/lib/achievements/store";

const DEV_ACCOUNT_HARNESS_STORE_VERSION = 2;
const defaultDevAccountHarnessStorePath = path.join(
  os.homedir(),
  ".open-model-lab",
  "dev-account-harness.json",
);

export const DEV_ACCOUNT_HARNESS_COOKIE = "open-model-lab-dev-account";

export const devAccountHarnessStateSchema = z.enum([
  "signed-out",
  "signed-in-free",
  "signed-in-premium",
]);

export type DevAccountHarnessState = z.infer<typeof devAccountHarnessStateSchema>;

export const devAccountHarnessRewardStateSchema = z.enum([
  "locked",
  "unlocked",
  "claimed",
  "expired",
]);

export type DevAccountHarnessRewardState = z.infer<
  typeof devAccountHarnessRewardStateSchema
>;

type DevAccountHarnessAchievementState = {
  stats: AchievementStatsRow | null;
  progressKeys: Record<string, AchievementProgressKeyRow>;
  earnedAchievementsByKey: Record<string, EarnedAchievementRow>;
  rewardsByKey: Record<string, RewardUnlockRow>;
  activeSessionsById: Record<string, AchievementActiveSessionRow>;
};

type DevAccountHarnessStore = {
  version: typeof DEV_ACCOUNT_HARNESS_STORE_VERSION;
  progressByUserId: Record<
    string,
    {
      snapshot: ProgressSnapshot;
      history?: ProgressHistoryStore;
      updatedAt: string;
    }
  >;
  achievementsByUserId: Record<string, DevAccountHarnessAchievementState>;
};

type DevAccountHarnessSessionResolution = {
  active: boolean;
  session: AccountSession | null;
  state: DevAccountHarnessState | null;
};

type DevAccountHarnessStoredProgressResult = {
  snapshot: ProgressSnapshot;
  history: ProgressHistoryStore;
  updatedAt: string;
  continueLearningState: ReturnType<typeof deriveSavedContinueLearningState>;
};

type DevAccountHarnessProgressMergeResult = DevAccountHarnessStoredProgressResult & {
  mergeSummary: ProgressMergeSummary;
};

export type DevAccountHarnessAchievementSeedInput = {
  conceptVisitCount: number;
  questionAnswerCount: number;
  distinctChallengeCompletionCount: number;
  distinctTrackCompletionCount: number;
  activeStudyHours: number;
  challengeCompletionKeys: string[];
  trackSlugs: string[];
  rewardState: DevAccountHarnessRewardState;
};

const DEV_ACCOUNT_HARNESS_FIXTURE_USERS = {
  "signed-in-free": {
    id: "dev-free-learner",
    email: "free.fixture@openmodellab.local",
    displayName: "Free learner",
    createdAt: "2026-04-02T00:00:00.000Z",
    lastSignedInAt: "2026-04-02T00:00:00.000Z",
  },
  "signed-in-premium": {
    id: "dev-premium-learner",
    email: "premium.fixture@openmodellab.local",
    displayName: "Supporter learner",
    createdAt: "2026-04-02T00:00:00.000Z",
    lastSignedInAt: "2026-04-02T00:00:00.000Z",
  },
} satisfies Record<Exclude<DevAccountHarnessState, "signed-out">, AccountUserSummary>;

let devAccountHarnessWriteQueue = Promise.resolve();
let cachedProgressHistoryCatalog:
  | {
      concepts: ReturnType<typeof getConceptSummaries>;
      subjects: ReturnType<typeof getSubjectDiscoverySummaries>;
      starterTracks: ReturnType<typeof getStarterTracks>;
    }
  | null = null;

function getProgressHistoryCatalog() {
  if (cachedProgressHistoryCatalog) {
    return cachedProgressHistoryCatalog;
  }

  cachedProgressHistoryCatalog = {
    concepts: getConceptSummaries(),
    subjects: getSubjectDiscoverySummaries(),
    starterTracks: getStarterTracks(),
  };

  return cachedProgressHistoryCatalog;
}

function withDevAccountHarnessStoreLock<T>(task: () => Promise<T>) {
  const nextTask = devAccountHarnessWriteQueue.then(task, task);

  devAccountHarnessWriteQueue = nextTask.then(
    () => undefined,
    () => undefined,
  );

  return nextTask;
}

function parseCookieHeaderValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const trimmedPart = part.trim();

    if (!trimmedPart) {
      continue;
    }

    const separatorIndex = trimmedPart.indexOf("=");

    if (separatorIndex < 0) {
      continue;
    }

    const cookieName = decodeURIComponent(trimmedPart.slice(0, separatorIndex));

    if (cookieName !== name) {
      continue;
    }

    return decodeURIComponent(trimmedPart.slice(separatorIndex + 1));
  }

  return null;
}

function normalizeDevAccountHarnessAchievementState(
  value: Partial<DevAccountHarnessAchievementState> | null | undefined,
) {
  return {
    stats: value?.stats ?? null,
    progressKeys:
      value?.progressKeys && typeof value.progressKeys === "object"
        ? value.progressKeys
        : {},
    earnedAchievementsByKey:
      value?.earnedAchievementsByKey &&
      typeof value.earnedAchievementsByKey === "object"
        ? value.earnedAchievementsByKey
        : {},
    rewardsByKey:
      value?.rewardsByKey && typeof value.rewardsByKey === "object"
        ? value.rewardsByKey
        : {},
    activeSessionsById:
      value?.activeSessionsById && typeof value.activeSessionsById === "object"
        ? value.activeSessionsById
        : {},
  } satisfies DevAccountHarnessAchievementState;
}

function createEmptyDevAccountHarnessStore(): DevAccountHarnessStore {
  return {
    version: DEV_ACCOUNT_HARNESS_STORE_VERSION,
    progressByUserId: {},
    achievementsByUserId: {},
  };
}

function getDevAccountHarnessStorePath() {
  return (
    process.env.OPEN_MODEL_LAB_DEV_ACCOUNT_HARNESS_STORE_PATH?.trim() ||
    defaultDevAccountHarnessStorePath
  );
}

async function readDevAccountHarnessStore() {
  try {
    const raw = await fs.readFile(getDevAccountHarnessStorePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<DevAccountHarnessStore>;

    if (
      ![1, DEV_ACCOUNT_HARNESS_STORE_VERSION].includes(Number(parsed.version ?? 0)) ||
      typeof parsed.progressByUserId !== "object" ||
      parsed.progressByUserId === null
    ) {
      return createEmptyDevAccountHarnessStore();
    }

    return {
      version: DEV_ACCOUNT_HARNESS_STORE_VERSION,
      progressByUserId: Object.fromEntries(
        Object.entries(parsed.progressByUserId).map(([userId, value]) => [
          userId,
          {
            snapshot: normalizeProgressSnapshot(value?.snapshot),
            history: normalizeProgressHistoryStore(value?.history),
            updatedAt:
              typeof value?.updatedAt === "string" && value.updatedAt
                ? value.updatedAt
                : new Date().toISOString(),
          },
        ]),
      ),
      achievementsByUserId: Object.fromEntries(
        Object.entries(parsed.achievementsByUserId ?? {}).map(([userId, value]) => [
          userId,
          normalizeDevAccountHarnessAchievementState(value),
        ]),
      ),
    } satisfies DevAccountHarnessStore;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createEmptyDevAccountHarnessStore();
    }

    throw error;
  }
}

async function writeDevAccountHarnessStore(store: DevAccountHarnessStore) {
  const storePath = getDevAccountHarnessStorePath();
  const directory = path.dirname(storePath);
  const tempPath = `${storePath}.tmp`;
  const serializedStore = JSON.stringify(store, null, 2);

  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(tempPath, serializedStore, "utf8");

  try {
    await fs.rename(tempPath, storePath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code !== "EPERM" && code !== "EXDEV") {
      throw error;
    }

    await fs.writeFile(storePath, serializedStore, "utf8");
    await fs.rm(tempPath, { force: true });
  }
}

function isTruthyFlag(value: string | undefined) {
  return /^(1|true|yes|on)$/i.test(value?.trim() ?? "");
}

function createDevAccountHarnessSession(state: Exclude<DevAccountHarnessState, "signed-out">) {
  const user = DEV_ACCOUNT_HARNESS_FIXTURE_USERS[state];
  const stripeBillingConfig = getStripeBillingConfig();
  const billing =
    state === "signed-in-premium"
      ? {
          source: "stripe" as const,
          status: "active" as const,
          canStartCheckout: false,
          canManageSubscription: true,
          cancelAtPeriodEnd: false,
          currentPeriodEnd: "2026-05-02T00:00:00.000Z",
        }
      : {
          source: "none" as const,
          status: "none" as const,
          canStartCheckout: true,
          canManageSubscription: false,
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
        };
  const checkoutConfigDiagnostics = billing.canStartCheckout
    ? getStripeCheckoutConfigDiagnostics(stripeBillingConfig)
    : null;
  const portalConfigDiagnostics = billing.canManageSubscription
    ? getStripeBillingPortalConfigDiagnostics(stripeBillingConfig)
    : null;
  const billingNotConfigured =
    !(
      checkoutConfigDiagnostics?.configured ??
      !billing.canStartCheckout
    ) ||
    !(
      portalConfigDiagnostics?.configured ??
      !billing.canManageSubscription
    );
  const billingConfigIssues = Array.from(
    new Set([
      ...(checkoutConfigDiagnostics?.issues ?? []),
      ...(portalConfigDiagnostics?.issues ?? []),
    ]),
  );

  return {
    user,
    entitlement:
      state === "signed-in-premium"
        ? resolveAccountEntitlement({
            tier: "premium",
            source: "stored",
            updatedAt: "2026-04-02T00:00:00.000Z",
          })
        : resolveAccountEntitlement({
            tier: "free",
            source: "account-default",
          }),
    billing,
    ...(billingNotConfigured
      ? {
          warnings: {
            billingNotConfigured: true,
            ...(billingConfigIssues.length > 0
              ? {
                  billingConfigIssues,
                }
              : {}),
          },
        }
      : {}),
  } satisfies AccountSession;
}

export function isDevAccountHarnessEnabled() {
  return process.env.NODE_ENV !== "production" && isTruthyFlag(process.env.ENABLE_DEV_ACCOUNT_HARNESS);
}

export function parseDevAccountHarnessState(value: string | null | undefined) {
  const parsedState = devAccountHarnessStateSchema.safeParse(value);

  return parsedState.success ? parsedState.data : null;
}

export function getDevAccountHarnessStateFromCookieHeader(cookieHeader: string | null) {
  return parseDevAccountHarnessState(
    parseCookieHeaderValue(cookieHeader, DEV_ACCOUNT_HARNESS_COOKIE),
  );
}

export function resolveDevAccountHarnessSession(
  cookieHeader: string | null,
): DevAccountHarnessSessionResolution {
  if (!isDevAccountHarnessEnabled()) {
    return {
      active: false,
      session: null,
      state: null,
    };
  }

  const state = getDevAccountHarnessStateFromCookieHeader(cookieHeader);

  if (!state) {
    return {
      active: false,
      session: null,
      state: null,
    };
  }

  if (state === "signed-out") {
    return {
      active: true,
      session: null,
      state,
    };
  }

  return {
    active: true,
    session: createDevAccountHarnessSession(state),
    state,
  };
}

export function setDevAccountHarnessStateCookie(
  response: NextResponse,
  state: DevAccountHarnessState,
) {
  response.cookies.set(DEV_ACCOUNT_HARNESS_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearDevAccountHarnessStateCookie(response: NextResponse) {
  response.cookies.set(DEV_ACCOUNT_HARNESS_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });
}

export function describeDevAccountHarnessState(state: DevAccountHarnessState | null) {
  switch (state) {
    case "signed-out":
      return "Signed-out fixture";
    case "signed-in-free":
      return "Signed-in free fixture";
    case "signed-in-premium":
      return "Signed-in Supporter fixture";
    default:
      return "Real auth / no override";
  }
}

export function isDevAccountHarnessFixtureUserId(userId: string) {
  return Object.values(DEV_ACCOUNT_HARNESS_FIXTURE_USERS).some(
    (fixtureUser) => fixtureUser.id === userId,
  );
}

function cloneDevAccountHarnessAchievementState(
  state: DevAccountHarnessAchievementState,
): DevAccountHarnessAchievementState {
  return {
    stats: state.stats ? { ...state.stats } : null,
    progressKeys: { ...state.progressKeys },
    earnedAchievementsByKey: { ...state.earnedAchievementsByKey },
    rewardsByKey: { ...state.rewardsByKey },
    activeSessionsById: { ...state.activeSessionsById },
  };
}

export async function readDevAccountHarnessAchievements(userId: string) {
  return withDevAccountHarnessStoreLock(async () => {
    const store = await readDevAccountHarnessStore();
    return normalizeDevAccountHarnessAchievementState(store.achievementsByUserId[userId]);
  });
}

export async function updateDevAccountHarnessAchievements(
  userId: string,
  updater: (state: DevAccountHarnessAchievementState) => void,
) {
  return withDevAccountHarnessStoreLock(async () => {
    const store = await readDevAccountHarnessStore();
    const nextState = cloneDevAccountHarnessAchievementState(
      normalizeDevAccountHarnessAchievementState(store.achievementsByUserId[userId]),
    );

    updater(nextState);
    store.achievementsByUserId[userId] = nextState;
    await writeDevAccountHarnessStore(store);

    return nextState;
  });
}

function buildDevAccountHarnessAchievementStatsRow(input: {
  userId: string;
  nowIso: string;
  conceptVisitCount: number;
  questionAnswerCount: number;
  distinctChallengeCompletionCount: number;
  distinctTrackCompletionCount: number;
  activeStudySeconds: number;
}) {
  return {
    user_id: input.userId,
    concept_visit_count: input.conceptVisitCount,
    question_answer_count: input.questionAnswerCount,
    distinct_challenge_completion_count: input.distinctChallengeCompletionCount,
    distinct_track_completion_count: input.distinctTrackCompletionCount,
    active_study_seconds: input.activeStudySeconds,
    created_at: input.nowIso,
    updated_at: input.nowIso,
  } satisfies AchievementStatsRow;
}

function parseDevHarnessChallengeCompletionKey(value: string) {
  const [conceptSlug, challengeId] = value.split(":");

  if (!conceptSlug || !challengeId) {
    throw new Error(`invalid_challenge_completion_key:${value}`);
  }

  const concept = getConceptBySlug(conceptSlug);
  const challenge = concept.challengeMode?.items.find((item) => item.id === challengeId);

  if (!challenge) {
    throw new Error(`unknown_challenge_completion_key:${value}`);
  }

  return {
    conceptSlug,
    challengeId,
  };
}

function buildDevAccountHarnessRewardRow(input: {
  userId: string;
  rewardState: DevAccountHarnessRewardState;
  nowIso: string;
}) {
  const unlockedAt = input.nowIso;
  const expiresAt = new Date(unlockedAt);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + ACHIEVEMENT_REWARD_EXPIRY_DAYS);

  if (input.rewardState === "locked") {
    return {
      user_id: input.userId,
      reward_key: ACHIEVEMENT_REWARD_KEY,
      status: "already-used",
      unlock_reason: null,
      metadata: {
        discountPercent: ACHIEVEMENT_REWARD_DISCOUNT_PERCENT,
        devHarnessState: "locked",
      },
      unlocked_at: unlockedAt,
      expires_at: unlockedAt,
      claimed_at: null,
      claim_checkout_session_id: null,
      claim_coupon_id: null,
      claim_price_id: null,
      used_at: null,
      used_subscription_id: null,
    } satisfies RewardUnlockRow;
  }

  if (input.rewardState === "expired") {
    return {
      user_id: input.userId,
      reward_key: ACHIEVEMENT_REWARD_KEY,
      status: "expired",
      unlock_reason: "challenge-milestone",
      metadata: {
        discountPercent: ACHIEVEMENT_REWARD_DISCOUNT_PERCENT,
      },
      unlocked_at: unlockedAt,
      expires_at: new Date(Date.now() - 60_000).toISOString(),
      claimed_at: null,
      claim_checkout_session_id: null,
      claim_coupon_id: null,
      claim_price_id: null,
      used_at: null,
      used_subscription_id: null,
    } satisfies RewardUnlockRow;
  }

  if (input.rewardState === "claimed") {
    return {
      user_id: input.userId,
      reward_key: ACHIEVEMENT_REWARD_KEY,
      status: "claimed",
      unlock_reason: "challenge-milestone",
      metadata: {
        discountPercent: ACHIEVEMENT_REWARD_DISCOUNT_PERCENT,
      },
      unlocked_at: unlockedAt,
      expires_at: expiresAt.toISOString(),
      claimed_at: unlockedAt,
      claim_checkout_session_id: "cs_dev_harness_reward_claimed",
      claim_coupon_id: null,
      claim_price_id: null,
      used_at: null,
      used_subscription_id: null,
    } satisfies RewardUnlockRow;
  }

  return {
    user_id: input.userId,
    reward_key: ACHIEVEMENT_REWARD_KEY,
    status: "unlocked",
    unlock_reason: "challenge-milestone",
    metadata: {
      discountPercent: ACHIEVEMENT_REWARD_DISCOUNT_PERCENT,
    },
    unlocked_at: unlockedAt,
    expires_at: expiresAt.toISOString(),
    claimed_at: null,
    claim_checkout_session_id: null,
    claim_coupon_id: null,
    claim_price_id: null,
    used_at: null,
    used_subscription_id: null,
  } satisfies RewardUnlockRow;
}

export async function resetDevAccountHarnessAchievementsForCookieHeader(
  cookieHeader: string | null,
) {
  const resolution = resolveDevAccountHarnessSession(cookieHeader);

  if (!resolution.active) {
    return undefined;
  }

  if (!resolution.session) {
    return null;
  }

  await updateDevAccountHarnessAchievements(resolution.session.user.id, (state) => {
    state.stats = null;
    state.progressKeys = {};
    state.earnedAchievementsByKey = {};
    state.rewardsByKey = {};
    state.activeSessionsById = {};
  });

  return {
    userId: resolution.session.user.id,
  };
}

export async function seedDevAccountHarnessAchievementsForCookieHeader(input: {
  cookieHeader: string | null;
  seed: DevAccountHarnessAchievementSeedInput;
}) {
  const resolution = resolveDevAccountHarnessSession(input.cookieHeader);

  if (!resolution.active) {
    return undefined;
  }

  if (!resolution.session) {
    return null;
  }

  const userId = resolution.session.user.id;
  const nowIso = new Date().toISOString();
  const challengeCompletions = input.seed.challengeCompletionKeys.map(
    parseDevHarnessChallengeCompletionKey,
  );
  const trackSlugs = input.seed.trackSlugs.map((trackSlug) => {
    getStarterTrackBySlug(trackSlug);
    return trackSlug;
  });
  const distinctChallengeCompletionCount = Math.max(
    input.seed.distinctChallengeCompletionCount,
    challengeCompletions.length,
  );
  const distinctTrackCompletionCount = Math.max(
    input.seed.distinctTrackCompletionCount,
    trackSlugs.length,
  );
  const activeStudySeconds = Math.max(0, Math.round(input.seed.activeStudyHours * 3600));
  await updateDevAccountHarnessAchievements(userId, (state) => {
    state.stats = buildDevAccountHarnessAchievementStatsRow({
      userId,
      nowIso,
      conceptVisitCount: input.seed.conceptVisitCount,
      questionAnswerCount: input.seed.questionAnswerCount,
      distinctChallengeCompletionCount,
      distinctTrackCompletionCount,
      activeStudySeconds,
    });
    state.progressKeys = {};
    state.earnedAchievementsByKey = {};
    state.rewardsByKey = {};
    state.activeSessionsById = {};

    for (const definition of getMilestoneAchievementDefinitions()) {
      const currentValue =
        definition.statKey === "concept-visits"
          ? input.seed.conceptVisitCount
          : definition.statKey === "question-answers"
            ? input.seed.questionAnswerCount
            : definition.statKey === "challenge-completions"
              ? distinctChallengeCompletionCount
              : definition.statKey === "track-completions"
                ? distinctTrackCompletionCount
                : activeStudySeconds / 3600;

      if (currentValue < definition.target) {
        continue;
      }

      state.earnedAchievementsByKey[definition.key] = {
        user_id: userId,
        achievement_key: definition.key,
        achievement_kind: definition.kind,
        category_key: definition.categoryKey,
        metadata: {
          seededByDevHarness: true,
        },
        earned_at: nowIso,
      };
    }

    for (const completion of challengeCompletions) {
      const recordKey = `${completion.conceptSlug}:${completion.challengeId}`;
      const achievementKey = `challenge:${recordKey}`;
      const achievement = getAchievementDefinition(achievementKey);

      state.progressKeys[`challenge::${recordKey}`] = {
        user_id: userId,
        record_type: "challenge",
        record_key: recordKey,
        concept_slug: completion.conceptSlug,
        challenge_id: completion.challengeId,
        track_slug: null,
        qualified_at: nowIso,
        metadata: {
          seededByDevHarness: true,
        },
        created_at: nowIso,
        updated_at: nowIso,
      };

      if (achievement) {
        state.earnedAchievementsByKey[achievementKey] = {
          user_id: userId,
          achievement_key: achievementKey,
          achievement_kind: achievement.kind,
          category_key: achievement.categoryKey,
          metadata: {
            seededByDevHarness: true,
          },
          earned_at: nowIso,
        };
      }
    }

    for (const trackSlug of trackSlugs) {
      const achievementKey = `track:${trackSlug}`;
      const achievement = getAchievementDefinition(achievementKey);

      state.progressKeys[`track::${trackSlug}`] = {
        user_id: userId,
        record_type: "track",
        record_key: trackSlug,
        concept_slug: null,
        challenge_id: null,
        track_slug: trackSlug,
        qualified_at: nowIso,
        metadata: {
          seededByDevHarness: true,
        },
        created_at: nowIso,
        updated_at: nowIso,
      };

      if (achievement) {
        state.earnedAchievementsByKey[achievementKey] = {
          user_id: userId,
          achievement_key: achievementKey,
          achievement_kind: achievement.kind,
          category_key: achievement.categoryKey,
          metadata: {
            seededByDevHarness: true,
          },
          earned_at: nowIso,
        };
      }
    }

    const rewardRow = buildDevAccountHarnessRewardRow({
      userId,
      rewardState: input.seed.rewardState,
      nowIso,
    });

    if (rewardRow) {
      state.rewardsByKey[rewardRow.reward_key] = rewardRow;
    }
  });

  return {
    userId,
    rewardState: input.seed.rewardState,
  };
}

export async function getDevAccountHarnessStoredProgressForCookieHeader(
  cookieHeader: string | null,
) {
  const resolution = resolveDevAccountHarnessSession(cookieHeader);

  if (!resolution.active) {
    return undefined;
  }

  if (!resolution.session) {
    return null;
  }

  return withDevAccountHarnessStoreLock(async () => {
    const store = await readDevAccountHarnessStore();
    const existingEntry = store.progressByUserId[resolution.session!.user.id];
    const snapshot = existingEntry?.snapshot ?? createEmptyProgressSnapshot();
    const history = normalizeProgressHistoryStore(existingEntry?.history);
    const updatedAt = existingEntry?.updatedAt ?? new Date().toISOString();

    return {
      snapshot,
      history,
      updatedAt,
      continueLearningState: deriveSavedContinueLearningState(snapshot, updatedAt),
    } satisfies DevAccountHarnessStoredProgressResult;
  });
}

export async function mergeDevAccountHarnessStoredProgressForCookieHeader(
  cookieHeader: string | null,
  incomingSnapshot: ProgressSnapshot,
) {
  const resolution = resolveDevAccountHarnessSession(cookieHeader);

  if (!resolution.active) {
    return undefined;
  }

  if (!resolution.session) {
    return null;
  }

  return withDevAccountHarnessStoreLock(async () => {
    const store = await readDevAccountHarnessStore();
    const existingEntry = store.progressByUserId[resolution.session!.user.id] ?? {
      snapshot: createEmptyProgressSnapshot(),
      history: createEmptyProgressHistoryStore(),
      updatedAt: new Date().toISOString(),
    };
    const mergedSnapshot = mergeProgressSnapshots(
      existingEntry.snapshot,
      incomingSnapshot,
    );
    const mergeSummary = summarizeProgressMerge(
      existingEntry.snapshot,
      incomingSnapshot,
      mergedSnapshot,
    );
    const updatedAt = new Date().toISOString();
    const historyCatalog = getProgressHistoryCatalog();
    const mergedHistory = updateProgressHistoryStore({
      previousSnapshot: existingEntry.snapshot,
      nextSnapshot: mergedSnapshot,
      previousHistory: existingEntry.history,
      concepts: historyCatalog.concepts,
      subjects: historyCatalog.subjects,
      starterTracks: historyCatalog.starterTracks,
      recordedAt: updatedAt,
    });

    store.progressByUserId[resolution.session!.user.id] = {
      snapshot: mergedSnapshot,
      history: mergedHistory,
      updatedAt,
    };
    await writeDevAccountHarnessStore(store);

    return {
      snapshot: mergedSnapshot,
      history: mergedHistory,
      updatedAt,
      mergeSummary,
      continueLearningState: deriveSavedContinueLearningState(mergedSnapshot, updatedAt),
    } satisfies DevAccountHarnessProgressMergeResult;
  });
}
