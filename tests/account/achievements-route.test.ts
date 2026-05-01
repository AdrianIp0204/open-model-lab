// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";

const mocks = vi.hoisted(() => ({
  assertAchievementWritePathAvailableMock: vi.fn(),
  describeOptionalAccountDependencyFailureMock: vi.fn(),
  getAccountAchievementOverviewForAuthenticatedUserMock: vi.fn(),
  getAccountSessionForCookieHeaderMock: vi.fn(),
  getOptionalStoredProgressForCookieHeaderMock: vi.fn(),
  getStripeBillingConfigMock: vi.fn(),
  reconcileAchievementStatsFromSourceMock: vi.fn(),
  recordAccountAchievementEventMock: vi.fn(),
  shouldLogOptionalAccountDependencyFailureAsErrorMock: vi.fn(),
  syncAchievementsFromTrustedProgressSnapshotMock: vi.fn(),
}));

vi.mock("@/lib/account/supabase", () => ({
  describeOptionalAccountDependencyFailure: (...args: unknown[]) =>
    mocks.describeOptionalAccountDependencyFailureMock(...args),
  getAccountSessionForCookieHeader: (...args: unknown[]) =>
    mocks.getAccountSessionForCookieHeaderMock(...args),
  shouldLogOptionalAccountDependencyFailureAsError: (...args: unknown[]) =>
    mocks.shouldLogOptionalAccountDependencyFailureAsErrorMock(...args),
}));

vi.mock("@/lib/account/server-store", () => ({
  getOptionalStoredProgressForCookieHeader: (...args: unknown[]) =>
    mocks.getOptionalStoredProgressForCookieHeaderMock(...args),
}));

vi.mock("@/lib/achievements/service", () => ({
  assertAchievementWritePathAvailable: (...args: unknown[]) =>
    mocks.assertAchievementWritePathAvailableMock(...args),
  getAccountAchievementOverview: vi.fn(),
  getAccountAchievementOverviewForAuthenticatedUser: (...args: unknown[]) =>
    mocks.getAccountAchievementOverviewForAuthenticatedUserMock(...args),
  reconcileAchievementStatsFromSource: (...args: unknown[]) =>
    mocks.reconcileAchievementStatsFromSourceMock(...args),
  recordAccountAchievementEvent: (...args: unknown[]) =>
    mocks.recordAccountAchievementEventMock(...args),
  syncAchievementsFromTrustedProgressSnapshot: (...args: unknown[]) =>
    mocks.syncAchievementsFromTrustedProgressSnapshotMock(...args),
}));

vi.mock("@/lib/billing/env", () => ({
  getStripeBillingConfig: (...args: unknown[]) => mocks.getStripeBillingConfigMock(...args),
}));

import { GET, POST } from "@/app/api/account/achievements/route";

describe("account achievements route", () => {
  afterEach(() => {
    mocks.assertAchievementWritePathAvailableMock.mockReset();
    mocks.describeOptionalAccountDependencyFailureMock.mockReset();
    mocks.getAccountAchievementOverviewForAuthenticatedUserMock.mockReset();
    mocks.getAccountSessionForCookieHeaderMock.mockReset();
    mocks.getOptionalStoredProgressForCookieHeaderMock.mockReset();
    mocks.getStripeBillingConfigMock.mockReset();
    mocks.reconcileAchievementStatsFromSourceMock.mockReset();
    mocks.recordAccountAchievementEventMock.mockReset();
    mocks.shouldLogOptionalAccountDependencyFailureAsErrorMock.mockReset();
    mocks.syncAchievementsFromTrustedProgressSnapshotMock.mockReset();
    vi.restoreAllMocks();
  });

  it("returns a signed-in overview even when trusted achievement sync is temporarily unavailable", async () => {
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });
    mocks.getOptionalStoredProgressForCookieHeaderMock.mockResolvedValue({
      storedProgress: {
        snapshot: { version: 1, concepts: {} },
        updatedAt: "2026-04-03T00:00:00.000Z",
        continueLearningState: null,
      },
      unavailable: false,
    });
    mocks.syncAchievementsFromTrustedProgressSnapshotMock.mockRejectedValue(
      new Error('relation "user_achievement_stats" does not exist'),
    );
    mocks.getStripeBillingConfigMock.mockReturnValue({
      achievementRewardCouponId: "coupon_test_25_off",
    });
    mocks.describeOptionalAccountDependencyFailureMock.mockReturnValue({
      kind: "missing_relation",
      code: "42P01",
      message: 'relation "user_achievement_stats" does not exist',
      relationName: "user_achievement_stats",
    });
    mocks.shouldLogOptionalAccountDependencyFailureAsErrorMock.mockReturnValue(false);
    mocks.reconcileAchievementStatsFromSourceMock.mockResolvedValue({
      conceptVisitCount: 0,
      questionAnswerCount: 0,
      distinctChallengeCompletionCount: 0,
      distinctTrackCompletionCount: 0,
      activeStudySeconds: 0,
    });
    mocks.getAccountAchievementOverviewForAuthenticatedUserMock.mockResolvedValue({
      stats: {
        conceptVisitCount: 0,
        questionAnswerCount: 0,
        distinctChallengeCompletionCount: 0,
        distinctTrackCompletionCount: 0,
        activeStudySeconds: 0,
      },
      milestoneGroups: [],
      namedGroups: [],
      reward: {
        key: "premium-first-month-25-off",
        status: "locked",
        title: "25% off first Supporter month",
        description: "Reward description",
        reasonLabel: null,
        unlockedAt: null,
        expiresAt: null,
        claimedAt: null,
        usedAt: null,
        claimable: false,
        resumable: false,
        checkoutReady: true,
      },
    });
    mocks.assertAchievementWritePathAvailableMock.mockResolvedValue(undefined);

    const response = await GET(
      new Request("http://localhost/api/account/achievements", {
        headers: {
          cookie: "sb-auth-token=1",
        },
      }),
    );
    const payload = (await response.json()) as {
      overview: {
        stats: {
          conceptVisitCount: number;
        };
      };
    };

    expect(response.status).toBe(200);
    expect(payload.overview.stats.conceptVisitCount).toBe(0);
    expect(mocks.syncAchievementsFromTrustedProgressSnapshotMock).toHaveBeenCalled();
    expect(mocks.getAccountAchievementOverviewForAuthenticatedUserMock).toHaveBeenCalledWith({
      userId: "user-1",
      cookieHeader: "sb-auth-token=1",
      entitlementTier: "free",
      checkoutRewardConfigured: true,
    });
    expect(mocks.reconcileAchievementStatsFromSourceMock).toHaveBeenCalledWith("user-1");
    expect(mocks.assertAchievementWritePathAvailableMock).toHaveBeenCalledWith({
      userId: "user-1",
    });
    expect(consoleWarnMock).toHaveBeenCalledWith(
      "[account] achievement sync unavailable during achievements route render",
      expect.objectContaining({
        userId: "user-1",
        fallback: "read_only_achievement_overview",
      }),
    );

    consoleWarnMock.mockRestore();
  });

  it("returns a bounded 503 when the overview loader still fails", async () => {
    const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => undefined);

    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });
    mocks.getOptionalStoredProgressForCookieHeaderMock.mockResolvedValue({
      storedProgress: null,
      unavailable: false,
    });
    mocks.getStripeBillingConfigMock.mockReturnValue({
      achievementRewardCouponId: null,
    });
    mocks.describeOptionalAccountDependencyFailureMock.mockReturnValue({
      kind: "query_failed",
      code: null,
      message: "achievement overview failed",
      relationName: null,
    });
    mocks.shouldLogOptionalAccountDependencyFailureAsErrorMock.mockReturnValue(true);
    mocks.reconcileAchievementStatsFromSourceMock.mockResolvedValue({
      conceptVisitCount: 0,
      questionAnswerCount: 0,
      distinctChallengeCompletionCount: 0,
      distinctTrackCompletionCount: 0,
      activeStudySeconds: 0,
    });
    mocks.getAccountAchievementOverviewForAuthenticatedUserMock.mockRejectedValue(
      new Error("achievement overview failed"),
    );

    const response = await GET(
      new Request("http://localhost/api/account/achievements", {
        headers: {
          cookie: "sb-auth-token=1",
        },
      }),
    );
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("achievements_unavailable");
    expect(payload.error).toBe("Account achievements could not be loaded right now.");
    expect(consoleErrorMock).toHaveBeenCalledWith(
      "[account] achievements route failed",
      expect.objectContaining({
        hasCookieHeader: true,
        message: "achievement overview failed",
      }),
    );

    consoleErrorMock.mockRestore();
  });

  it("localizes named achievement copy for zh-HK overview requests", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });
    mocks.getOptionalStoredProgressForCookieHeaderMock.mockResolvedValue({
      storedProgress: null,
      unavailable: false,
    });
    mocks.getStripeBillingConfigMock.mockReturnValue({
      achievementRewardCouponId: "coupon_test_25_off",
    });
    mocks.reconcileAchievementStatsFromSourceMock.mockResolvedValue({
      conceptVisitCount: 0,
      questionAnswerCount: 0,
      distinctChallengeCompletionCount: 1,
      distinctTrackCompletionCount: 0,
      activeStudySeconds: 0,
    });
    mocks.getAccountAchievementOverviewForAuthenticatedUserMock.mockResolvedValue({
      stats: {
        conceptVisitCount: 0,
        questionAnswerCount: 0,
        distinctChallengeCompletionCount: 1,
        distinctTrackCompletionCount: 0,
        activeStudySeconds: 0,
      },
      milestoneGroups: [],
      namedGroups: [
        {
          key: "challenge-completions",
          title: "Challenge completion badges",
          description: "One badge for each distinct challenge mode you complete.",
          items: [
            {
              key: "challenge:static-equilibrium-centre-of-mass:secm-ch-balance-heavy-right-load",
              kind: "challenge",
              title: "Completed Balance the heavy right load challenge mode",
              description:
                "Solved the Balance the heavy right load challenge on Static equilibrium and centre of mass.",
              earned: true,
              earnedAt: "2026-04-03T00:00:00.000Z",
              categoryKey: "challenge-completions",
            },
          ],
        },
      ],
      reward: {
        key: "premium-first-month-25-off",
        status: "locked",
        title: "25% off first Supporter month",
        description: "Reward description",
        reasonLabel: null,
        unlockedAt: null,
        expiresAt: null,
        claimedAt: null,
        usedAt: null,
        claimable: false,
        resumable: false,
        checkoutReady: true,
      },
    });

    const response = await GET(
      new Request("http://localhost/api/account/achievements", {
        headers: {
          cookie: "sb-auth-token=1",
          "x-open-model-lab-locale": "zh-HK",
        },
      }),
    );
    const payload = (await response.json()) as {
      overview: {
        namedGroups: Array<{
          items: Array<{
            title: string;
            description: string;
          }>;
        }>;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.overview.namedGroups[0]?.items[0]?.title).toContain("挑戰模式");
    expect(payload.overview.namedGroups[0]?.items[0]?.title).not.toContain(
      "Balance the heavy right load",
    );
    expect(payload.overview.namedGroups[0]?.items[0]?.description).toContain("挑戰");
    expect(mocks.getAccountAchievementOverviewForAuthenticatedUserMock).toHaveBeenCalledWith({
      userId: "user-1",
      cookieHeader: "sb-auth-token=1",
      entitlementTier: "free",
      checkoutRewardConfigured: true,
    });
  });

  it("refuses a healthy-looking zero overview when the achievement write path is unavailable", async () => {
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });
    mocks.getOptionalStoredProgressForCookieHeaderMock.mockResolvedValue({
      storedProgress: null,
      unavailable: false,
    });
    mocks.getStripeBillingConfigMock.mockReturnValue({
      achievementRewardCouponId: "coupon_test_25_off",
    });
    mocks.reconcileAchievementStatsFromSourceMock.mockResolvedValue({
      conceptVisitCount: 0,
      questionAnswerCount: 0,
      distinctChallengeCompletionCount: 0,
      distinctTrackCompletionCount: 0,
      activeStudySeconds: 0,
    });
    mocks.getAccountAchievementOverviewForAuthenticatedUserMock.mockResolvedValue({
      stats: {
        conceptVisitCount: 0,
        questionAnswerCount: 0,
        distinctChallengeCompletionCount: 0,
        distinctTrackCompletionCount: 0,
        activeStudySeconds: 0,
      },
      milestoneGroups: [],
      namedGroups: [],
      reward: {
        key: "premium-first-month-25-off",
        status: "locked",
        title: "25% off first Supporter month",
        description: "Reward description",
        reasonLabel: null,
        unlockedAt: null,
        expiresAt: null,
        claimedAt: null,
        usedAt: null,
        claimable: false,
        resumable: false,
        checkoutReady: true,
      },
    });
    mocks.assertAchievementWritePathAvailableMock.mockRejectedValue(
      new Error("Invalid API key"),
    );
    mocks.describeOptionalAccountDependencyFailureMock.mockReturnValue({
      kind: "not_configured",
      code: null,
      message: "Invalid API key",
      relationName: null,
    });
    mocks.shouldLogOptionalAccountDependencyFailureAsErrorMock.mockReturnValue(false);

    const response = await GET(
      new Request("http://localhost/api/account/achievements", {
        headers: {
          cookie: "sb-auth-token=1",
        },
      }),
    );
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("achievements_not_configured");
    expect(payload.error).toBe("Account achievements could not be loaded right now.");
    expect(mocks.assertAchievementWritePathAvailableMock).toHaveBeenCalledWith({
      userId: "user-1",
    });
    expect(consoleWarnMock).toHaveBeenCalledWith(
      "[account] achievements route failed",
      expect.objectContaining({
        hasCookieHeader: true,
        failureKind: "not_configured",
        message: "Invalid API key",
      }),
    );

    consoleWarnMock.mockRestore();
  });

  it("reconciles stale achievement stats before returning the authenticated overview", async () => {
    const healedOverview = {
      stats: {
        conceptVisitCount: 0,
        questionAnswerCount: 4,
        distinctChallengeCompletionCount: 1,
        distinctTrackCompletionCount: 0,
        activeStudySeconds: 79,
      },
      milestoneGroups: [],
      namedGroups: [],
      reward: {
        key: "premium-first-month-25-off",
        status: "locked",
        title: "25% off first Supporter month",
        description: "Reward description",
        reasonLabel: null,
        unlockedAt: null,
        expiresAt: null,
        claimedAt: null,
        usedAt: null,
        claimable: false,
        resumable: false,
        checkoutReady: true,
      },
    };

    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });
    mocks.getOptionalStoredProgressForCookieHeaderMock.mockResolvedValue({
      storedProgress: null,
      unavailable: false,
    });
    mocks.getStripeBillingConfigMock.mockReturnValue({
      achievementRewardCouponId: "coupon_test_25_off",
    });
    mocks.reconcileAchievementStatsFromSourceMock.mockImplementation(async () => {
      healedOverview.stats.conceptVisitCount = 1;
      return {
        conceptVisitCount: 1,
        questionAnswerCount: 4,
        distinctChallengeCompletionCount: 1,
        distinctTrackCompletionCount: 0,
        activeStudySeconds: 79,
      };
    });
    mocks.getAccountAchievementOverviewForAuthenticatedUserMock.mockImplementation(async () => ({
      ...healedOverview,
      stats: { ...healedOverview.stats },
    }));

    const response = await GET(
      new Request("http://localhost/api/account/achievements", {
        headers: {
          cookie: "sb-auth-token=1",
        },
      }),
    );
    const payload = (await response.json()) as {
      overview: {
        stats: {
          conceptVisitCount: number;
          questionAnswerCount: number;
        };
      };
    };

    expect(response.status).toBe(200);
    expect(payload.overview.stats.conceptVisitCount).toBe(1);
    expect(payload.overview.stats.questionAnswerCount).toBe(4);
    expect(mocks.reconcileAchievementStatsFromSourceMock).toHaveBeenCalledWith("user-1");
    expect(mocks.assertAchievementWritePathAvailableMock).not.toHaveBeenCalled();
  });

  it("keeps dev fixture achievement overviews on seeded fixture state", async () => {
    const seededOverview = {
      stats: {
        conceptVisitCount: 3,
        questionAnswerCount: 9,
        distinctChallengeCompletionCount: 1,
        distinctTrackCompletionCount: 0,
        activeStudySeconds: 1800,
      },
      milestoneGroups: [],
      namedGroups: [],
      reward: {
        key: "premium-first-month-25-off",
        status: "locked",
        title: "25% off first Supporter month",
        description: "Reward description",
        reasonLabel: "Pinned to locked by the dev harness fixture.",
        unlockedAt: null,
        expiresAt: null,
        claimedAt: null,
        usedAt: null,
        claimable: false,
        resumable: false,
        checkoutReady: false,
      },
    };

    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "dev-free-learner",
        email: "free.fixture@openmodellab.local",
        displayName: "Free learner",
        createdAt: "2026-04-02T00:00:00.000Z",
        lastSignedInAt: "2026-04-02T00:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "account-default",
      }),
    });
    mocks.getOptionalStoredProgressForCookieHeaderMock.mockResolvedValue({
      storedProgress: {
        snapshot: { version: 1, concepts: {} },
        updatedAt: "2026-04-03T00:00:00.000Z",
        continueLearningState: null,
      },
      unavailable: false,
    });
    mocks.getStripeBillingConfigMock.mockReturnValue({
      achievementRewardCouponId: "coupon_test_25_off",
    });
    mocks.getAccountAchievementOverviewForAuthenticatedUserMock.mockResolvedValue(
      seededOverview,
    );

    const response = await GET(
      new Request("http://localhost/api/account/achievements", {
        headers: {
          cookie: "open-model-lab-dev-account=signed-in-free",
        },
      }),
    );
    const payload = (await response.json()) as {
      overview: {
        stats: {
          conceptVisitCount: number;
          distinctChallengeCompletionCount: number;
          activeStudySeconds: number;
        };
      };
    };

    expect(response.status).toBe(200);
    expect(payload.overview.stats.conceptVisitCount).toBe(3);
    expect(payload.overview.stats.distinctChallengeCompletionCount).toBe(1);
    expect(payload.overview.stats.activeStudySeconds).toBe(1800);
    expect(mocks.syncAchievementsFromTrustedProgressSnapshotMock).not.toHaveBeenCalled();
    expect(mocks.reconcileAchievementStatsFromSourceMock).not.toHaveBeenCalled();
  });

  it("returns a bounded 503 instead of a misleading zero overview when stats reconciliation fails", async () => {
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });
    mocks.getOptionalStoredProgressForCookieHeaderMock.mockResolvedValue({
      storedProgress: null,
      unavailable: false,
    });
    mocks.getStripeBillingConfigMock.mockReturnValue({
      achievementRewardCouponId: "coupon_test_25_off",
    });
    mocks.reconcileAchievementStatsFromSourceMock.mockRejectedValue(
      new Error("achievement_stats_reconciliation_conflict"),
    );
    mocks.getAccountAchievementOverviewForAuthenticatedUserMock.mockResolvedValue({
      stats: {
        conceptVisitCount: 0,
        questionAnswerCount: 0,
        distinctChallengeCompletionCount: 0,
        distinctTrackCompletionCount: 0,
        activeStudySeconds: 0,
      },
      milestoneGroups: [],
      namedGroups: [],
      reward: {
        key: "premium-first-month-25-off",
        status: "locked",
        title: "25% off first Supporter month",
        description: "Reward description",
        reasonLabel: null,
        unlockedAt: null,
        expiresAt: null,
        claimedAt: null,
        usedAt: null,
        claimable: false,
        resumable: false,
        checkoutReady: true,
      },
    });
    mocks.describeOptionalAccountDependencyFailureMock.mockReturnValue({
      kind: "query_failed",
      code: null,
      message: "achievement_stats_reconciliation_conflict",
      relationName: null,
    });
    mocks.shouldLogOptionalAccountDependencyFailureAsErrorMock.mockReturnValue(false);

    const response = await GET(
      new Request("http://localhost/api/account/achievements", {
        headers: {
          cookie: "sb-auth-token=1",
        },
      }),
    );
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("achievements_unavailable");
    expect(payload.error).toBe("Account achievements could not be loaded right now.");
    expect(mocks.assertAchievementWritePathAvailableMock).not.toHaveBeenCalled();
    expect(consoleWarnMock).toHaveBeenCalledWith(
      "[account] achievement stats reconciliation unavailable during achievements route render",
      expect.objectContaining({
        userId: "user-1",
        fallback: "authenticated_read_only_achievement_overview",
      }),
    );

    consoleWarnMock.mockRestore();
  });

  it.each([
    {
      label: "concept engagement",
      event: {
        type: "concept_engagement",
        conceptSlug: "projectile-motion",
        sessionId: "session-1",
        interactionCount: 2,
        heartbeatSlot: 101,
        sessionActiveStudySeconds: 25,
      },
    },
    {
      label: "challenge completion",
      event: {
        type: "challenge_completed",
        conceptSlug: "projectile-motion",
        challengeId: "pm-ch-flat-far-shot",
      },
    },
    {
      label: "question answer",
      event: {
        type: "question_answered",
        conceptSlug: "projectile-motion",
        questionId: "pm-qt-1",
      },
    },
    {
      label: "track completion",
      event: {
        type: "track_completed",
        trackSlug: "motion-and-circular-motion",
      },
    },
  ])("records a signed-in $label event and returns the authenticated reward summary", async ({
    event,
  }) => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });
    mocks.recordAccountAchievementEventMock.mockResolvedValue({
      newlyEarnedAchievements: [
        {
          key: "milestone:challenge-completions:1",
          kind: "milestone",
          title: "1 challenges milestone",
          description: "Reached the 1 mark for challenge modes completed.",
          earnedAt: "2026-04-03T00:00:00.000Z",
        },
      ],
      reward: null,
    });
    mocks.getStripeBillingConfigMock.mockReturnValue({
      achievementRewardCouponId: "coupon_test_25_off",
    });
    mocks.reconcileAchievementStatsFromSourceMock.mockResolvedValue({
      conceptVisitCount: 0,
      questionAnswerCount: 0,
      distinctChallengeCompletionCount: 0,
      distinctTrackCompletionCount: 0,
      activeStudySeconds: 0,
    });
    mocks.getAccountAchievementOverviewForAuthenticatedUserMock.mockResolvedValue({
      stats: {
        conceptVisitCount: 0,
        questionAnswerCount: 0,
        distinctChallengeCompletionCount: 0,
        distinctTrackCompletionCount: 0,
        activeStudySeconds: 0,
      },
      milestoneGroups: [],
      namedGroups: [],
      reward: {
        key: "premium-first-month-25-off",
        status: "locked",
        title: "25% off first Supporter month",
        description: "Reward description",
        reasonLabel: null,
        unlockedAt: null,
        expiresAt: null,
        claimedAt: null,
        usedAt: null,
        claimable: false,
        resumable: false,
        checkoutReady: true,
      },
    });

    const response = await POST(
      new Request("http://localhost/api/account/achievements", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "sb-auth-token=1",
        },
        body: JSON.stringify(event),
      }),
    );
    const payload = (await response.json()) as {
      ok: true;
      newlyEarnedAchievements: Array<{ key: string }>;
      reward: { status: string };
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.newlyEarnedAchievements).toEqual([
      expect.objectContaining({
        key: "milestone:challenge-completions:1",
      }),
    ]);
    expect(payload.reward.status).toBe("locked");
    expect(mocks.recordAccountAchievementEventMock).toHaveBeenCalledWith({
      userId: "user-1",
      entitlementTier: "free",
      event,
    });
    expect(mocks.getAccountAchievementOverviewForAuthenticatedUserMock).toHaveBeenCalledWith({
      userId: "user-1",
      cookieHeader: "sb-auth-token=1",
      entitlementTier: "free",
      checkoutRewardConfigured: true,
    });
  });

  it("localizes newly earned challenge toasts for zh-HK event responses", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });
    mocks.recordAccountAchievementEventMock.mockResolvedValue({
      newlyEarnedAchievements: [
        {
          key: "challenge:static-equilibrium-centre-of-mass:secm-ch-balance-heavy-right-load",
          kind: "challenge",
          title: "Completed Balance the heavy right load challenge mode",
          description:
            "Solved the Balance the heavy right load challenge on Static equilibrium and centre of mass.",
          earnedAt: "2026-04-03T00:00:00.000Z",
        },
      ],
      reward: null,
    });
    mocks.getStripeBillingConfigMock.mockReturnValue({
      achievementRewardCouponId: "coupon_test_25_off",
    });
    mocks.getAccountAchievementOverviewForAuthenticatedUserMock.mockResolvedValue({
      stats: {
        conceptVisitCount: 0,
        questionAnswerCount: 0,
        distinctChallengeCompletionCount: 1,
        distinctTrackCompletionCount: 0,
        activeStudySeconds: 0,
      },
      milestoneGroups: [],
      namedGroups: [],
      reward: {
        key: "premium-first-month-25-off",
        status: "locked",
        title: "25% off first Supporter month",
        description: "Reward description",
        reasonLabel: null,
        unlockedAt: null,
        expiresAt: null,
        claimedAt: null,
        usedAt: null,
        claimable: false,
        resumable: false,
        checkoutReady: true,
      },
    });

    const response = await POST(
      new Request("http://localhost/api/account/achievements", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "sb-auth-token=1",
          "x-open-model-lab-locale": "zh-HK",
        },
        body: JSON.stringify({
          type: "challenge_completed",
          conceptSlug: "static-equilibrium-centre-of-mass",
          challengeId: "secm-ch-balance-heavy-right-load",
        }),
      }),
    );
    const payload = (await response.json()) as {
      ok: true;
      newlyEarnedAchievements: Array<{
        title: string;
        description: string;
      }>;
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.newlyEarnedAchievements[0]?.title).toContain("挑戰模式");
    expect(payload.newlyEarnedAchievements[0]?.title).not.toContain(
      "Balance the heavy right load",
    );
    expect(payload.newlyEarnedAchievements[0]?.description).toContain("挑戰");
  });

  it("classifies missing service-role configuration on achievement-event writes", async () => {
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });
    mocks.recordAccountAchievementEventMock.mockRejectedValue(
      new Error("SUPABASE_SERVICE_ROLE_KEY is not set"),
    );
    mocks.describeOptionalAccountDependencyFailureMock.mockReturnValue({
      kind: "not_configured",
      code: null,
      message: "SUPABASE_SERVICE_ROLE_KEY is not set",
      relationName: null,
    });
    mocks.shouldLogOptionalAccountDependencyFailureAsErrorMock.mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost/api/account/achievements", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "sb-auth-token=1",
        },
        body: JSON.stringify({
          type: "concept_engagement",
          conceptSlug: "projectile-motion",
          sessionId: "session-1",
          interactionCount: 2,
          heartbeatSlot: 101,
          sessionActiveStudySeconds: 25,
        }),
      }),
    );
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("achievements_not_configured");
    expect(payload.error).toBe("Achievement progress could not be recorded right now.");
    expect(consoleWarnMock).toHaveBeenCalledWith(
      "[account] achievement event failed",
      expect.objectContaining({
        userId: "user-1",
        eventType: "concept_engagement",
        failureKind: "not_configured",
        message: "SUPABASE_SERVICE_ROLE_KEY is not set",
      }),
    );

    consoleWarnMock.mockRestore();
  });

  it("classifies missing achievement relations on achievement-event writes", async () => {
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });
    mocks.recordAccountAchievementEventMock.mockRejectedValue(
      new Error('relation "user_achievement_stats" does not exist'),
    );
    mocks.describeOptionalAccountDependencyFailureMock.mockReturnValue({
      kind: "missing_relation",
      code: "42P01",
      message: 'relation "user_achievement_stats" does not exist',
      relationName: "user_achievement_stats",
    });
    mocks.shouldLogOptionalAccountDependencyFailureAsErrorMock.mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost/api/account/achievements", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "sb-auth-token=1",
        },
        body: JSON.stringify({
          type: "question_answered",
          conceptSlug: "projectile-motion",
          questionId: "pm-qt-1",
        }),
      }),
    );
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("achievements_store_incomplete");
    expect(payload.error).toBe("Achievement progress could not be recorded right now.");
    expect(consoleWarnMock).toHaveBeenCalledWith(
      "[account] achievement event failed",
      expect.objectContaining({
        userId: "user-1",
        eventType: "question_answered",
        failureKind: "missing_relation",
        relationName: "user_achievement_stats",
      }),
    );

    consoleWarnMock.mockRestore();
  });
});
