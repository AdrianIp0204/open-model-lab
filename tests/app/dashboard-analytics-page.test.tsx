// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buildPremiumLearningAnalyticsMock: vi.fn(),
  cookiesMock: vi.fn(),
  decorateConceptSummariesMock: vi.fn(),
  getAchievementStatsForUserMock: vi.fn(),
  getAccountSessionForCookieHeaderMock: vi.fn(),
  getGuidedCollectionsMock: vi.fn(),
  getPublishedConceptMetadataMock: vi.fn(),
  getConceptSummariesMock: vi.fn(),
  getStarterTracksMock: vi.fn(),
  getStoredProgressForCookieHeaderMock: vi.fn(),
  getSubjectDiscoverySummariesMock: vi.fn(),
  getTopicDiscoverySummariesMock: vi.fn(),
  redirectMock: vi.fn(),
  syncAchievementsFromTrustedProgressSnapshotMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: () => mocks.cookiesMock(),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    mocks.redirectMock(path);
    throw new Error(`redirect:${path}`);
  },
  useSearchParams: () => new URLSearchParams(globalThis.__TEST_SEARCH_PARAMS__ ?? ""),
}));

vi.mock("@/components/layout/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/layout/SectionHeading", () => ({
  SectionHeading: ({
    eyebrow,
    title,
    description,
  }: {
    eyebrow: string;
    title: string;
    description: string;
  }) => (
    <div>
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock("@/components/account/LearningAnalyticsPanel", () => ({
  LearningAnalyticsPanel: ({
    analytics,
    syncedProgressUnavailable,
    achievementsUnavailable,
    leadIn,
  }: {
    analytics: { nextSteps: Array<unknown> };
    syncedProgressUnavailable?: boolean;
    achievementsUnavailable?: boolean;
    leadIn?: ReactNode;
  }) => (
    <div>
      {leadIn}
      <div>Analytics panel for {analytics.nextSteps.length} next steps</div>
      {syncedProgressUnavailable ? <div>Synced analytics warning</div> : null}
      {achievementsUnavailable ? <div>Achievements analytics warning</div> : null}
    </div>
  ),
}));

vi.mock("@/components/account/PremiumFeatureNotice", () => ({
  PremiumFeatureNotice: () => <div>Supporter notice</div>,
}));

vi.mock("@/components/account/PremiumSubscriptionActions", () => ({
  PremiumSubscriptionActions: () => <div>Billing controls</div>,
}));

vi.mock("@/components/concepts/concept-catalog", () => ({
  decorateConceptSummaries: (...args: unknown[]) => mocks.decorateConceptSummariesMock(...args),
}));

vi.mock("@/lib/content", () => ({
  getGuidedCollections: () => mocks.getGuidedCollectionsMock(),
  getPublishedConceptMetadata: () => mocks.getPublishedConceptMetadataMock(),
  getConceptSummaries: () => mocks.getConceptSummariesMock(),
  getStarterTracks: () => mocks.getStarterTracksMock(),
  getSubjectDiscoverySummaries: () => mocks.getSubjectDiscoverySummariesMock(),
  getTopicDiscoverySummaries: () => mocks.getTopicDiscoverySummariesMock(),
}));

vi.mock("@/lib/achievements/service", () => ({
  getAchievementStatsForUser: (...args: unknown[]) => mocks.getAchievementStatsForUserMock(...args),
  syncAchievementsFromTrustedProgressSnapshot: (...args: unknown[]) =>
    mocks.syncAchievementsFromTrustedProgressSnapshotMock(...args),
}));

vi.mock("@/lib/progress", async () => {
  const actual = await vi.importActual<typeof import("@/lib/progress")>("@/lib/progress");

  return {
    ...actual,
    buildPremiumLearningAnalytics: (...args: unknown[]) =>
      mocks.buildPremiumLearningAnalyticsMock(...args),
    createEmptyProgressSnapshot: () => ({
      version: 1,
      concepts: {},
    }),
  };
});

vi.mock("@/lib/account/supabase", async () => {
  const actual = await vi.importActual<typeof import("@/lib/account/supabase")>(
    "@/lib/account/supabase",
  );

  return {
    ...actual,
    getAccountSessionForCookieHeader: (...args: unknown[]) =>
      mocks.getAccountSessionForCookieHeaderMock(...args),
    getStoredProgressForCookieHeader: (...args: unknown[]) =>
      mocks.getStoredProgressForCookieHeaderMock(...args),
  };
});

import DashboardAnalyticsPage from "@/app/dashboard/analytics/DashboardAnalyticsRoute";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";

function buildSession(tier: "free" | "premium") {
  return {
    user: {
      id: "user-1",
      email: "student@example.com",
      displayName: "Lab Student",
      createdAt: "2026-03-29T00:00:00.000Z",
      lastSignedInAt: "2026-03-29T01:00:00.000Z",
    },
    entitlement: resolveAccountEntitlement({
      tier,
      source: "stored",
      updatedAt: "2026-04-02T00:00:00.000Z",
    }),
    billing:
      tier === "premium"
        ? {
            source: "stripe",
            status: "active",
            canStartCheckout: false,
            canManageSubscription: true,
            cancelAtPeriodEnd: false,
            currentPeriodEnd: "2026-05-02T00:00:00.000Z",
          }
        : {
            source: "none",
            status: "none",
            canStartCheckout: true,
            canManageSubscription: false,
            cancelAtPeriodEnd: false,
            currentPeriodEnd: null,
          },
  };
}

describe("DashboardAnalyticsPage", () => {
  afterEach(() => {
    mocks.buildPremiumLearningAnalyticsMock.mockReset();
    mocks.cookiesMock.mockReset();
    mocks.decorateConceptSummariesMock.mockReset();
    mocks.getAchievementStatsForUserMock.mockReset();
    mocks.getAccountSessionForCookieHeaderMock.mockReset();
    mocks.getGuidedCollectionsMock.mockReset();
    mocks.getPublishedConceptMetadataMock.mockReset();
    mocks.getConceptSummariesMock.mockReset();
    mocks.getStarterTracksMock.mockReset();
    mocks.getStoredProgressForCookieHeaderMock.mockReset();
    mocks.getSubjectDiscoverySummariesMock.mockReset();
    mocks.getTopicDiscoverySummariesMock.mockReset();
    mocks.redirectMock.mockReset();
    mocks.syncAchievementsFromTrustedProgressSnapshotMock.mockReset();
  });

  it("redirects signed-out users back to the account entry page", async () => {
    mocks.cookiesMock.mockResolvedValue({
      toString: () => "sb-auth=1",
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(null);

    await expect(DashboardAnalyticsPage()).rejects.toThrow("redirect:/en/account");

    expect(mocks.redirectMock).toHaveBeenCalledWith("/en/account");
  });

  it("shows a premium-required state for signed-in free users", async () => {
    mocks.cookiesMock.mockResolvedValue({
      toString: () => "sb-auth=1",
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSession("free"));

    const page = await DashboardAnalyticsPage();

    render(page);

    expect(
      screen.getByRole("heading", { name: "Supporter analytics are optional convenience features." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Supporter notice")).toBeInTheDocument();
    expect(screen.getByText("Billing controls")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.queryByText(/Analytics panel for/i)).not.toBeInTheDocument();
    expect(mocks.getStoredProgressForCookieHeaderMock).not.toHaveBeenCalled();
  });

  it("renders the premium analytics page from the existing saved progress and achievement seams", async () => {
    const session = buildSession("premium");
    const snapshot = {
      version: 1,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
        },
      },
    };

    mocks.cookiesMock.mockResolvedValue({
      toString: () => "sb-auth=1",
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(session);
    mocks.getStoredProgressForCookieHeaderMock.mockResolvedValue({
      snapshot,
      continueLearningState: null,
    });
    mocks.getConceptSummariesMock.mockReturnValue([]);
    mocks.getPublishedConceptMetadataMock.mockReturnValue([]);
    mocks.decorateConceptSummariesMock.mockReturnValue([]);
    mocks.getStarterTracksMock.mockReturnValue([]);
    mocks.getSubjectDiscoverySummariesMock.mockReturnValue([]);
    mocks.getTopicDiscoverySummariesMock.mockReturnValue([]);
    mocks.getGuidedCollectionsMock.mockReturnValue([]);
    mocks.getAchievementStatsForUserMock.mockResolvedValue({
      conceptVisitCount: 12,
      questionAnswerCount: 40,
      distinctChallengeCompletionCount: 4,
      distinctTrackCompletionCount: 1,
      activeStudySeconds: 16_200,
    });
    mocks.buildPremiumLearningAnalyticsMock.mockReturnValue({
      hasRecordedProgress: true,
      usageSnapshot: {
        achievementMetrics: [],
        progressMetrics: [],
      },
      checkpointHistory: {
        hasRecordedProgress: false,
        hasPersistedHistory: false,
        metrics: [],
        recentEvents: [],
        timeline: [],
        stableSubjects: [],
        needsWorkSubjects: [],
        stableConcepts: [],
        needsWorkConcepts: [],
        methodologyNote: "history",
      },
      strengths: [],
      needsWork: [],
      nextSteps: [{ id: "next-step" }],
      coverage: [],
      methodologyNote: "Test note",
    });

    const page = await DashboardAnalyticsPage();

    render(page);

    expect(
      screen.getByRole("heading", {
        name: "Review your saved learning signals without leaving the real product routes.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Analytics panel for 1 next steps")).toBeInTheDocument();
    expect(mocks.syncAchievementsFromTrustedProgressSnapshotMock).toHaveBeenCalledWith({
      userId: "user-1",
      entitlementTier: "premium",
      snapshot,
    });
    expect(mocks.getAchievementStatsForUserMock).toHaveBeenCalledWith({
      userId: "user-1",
    });
    expect(mocks.buildPremiumLearningAnalyticsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot,
        achievementStats: expect.objectContaining({
          conceptVisitCount: 12,
          questionAnswerCount: 40,
        }),
        history: null,
        subjectSummaries: [],
      }),
    );
  });

  it("keeps premium analytics alive when achievement sync fails after saved progress loads", async () => {
    const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const session = buildSession("premium");
    const snapshot = {
      version: 1,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
        },
      },
    };

    mocks.cookiesMock.mockResolvedValue({
      toString: () => "sb-auth=1",
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(session);
    mocks.getStoredProgressForCookieHeaderMock.mockResolvedValue({
      snapshot,
      history: null,
      continueLearningState: null,
    });
    mocks.syncAchievementsFromTrustedProgressSnapshotMock.mockRejectedValue(
      new Error("achievement sync failed"),
    );
    mocks.getConceptSummariesMock.mockReturnValue([]);
    mocks.getPublishedConceptMetadataMock.mockReturnValue([]);
    mocks.decorateConceptSummariesMock.mockReturnValue([]);
    mocks.getStarterTracksMock.mockReturnValue([]);
    mocks.getSubjectDiscoverySummariesMock.mockReturnValue([]);
    mocks.getTopicDiscoverySummariesMock.mockReturnValue([]);
    mocks.getGuidedCollectionsMock.mockReturnValue([]);
    mocks.getAchievementStatsForUserMock.mockResolvedValue({
      conceptVisitCount: 12,
      questionAnswerCount: 40,
      distinctChallengeCompletionCount: 4,
      distinctTrackCompletionCount: 1,
      activeStudySeconds: 16_200,
    });
    mocks.buildPremiumLearningAnalyticsMock.mockReturnValue({
      hasRecordedProgress: true,
      usageSnapshot: {
        achievementMetrics: [],
        progressMetrics: [],
      },
      checkpointHistory: {
        hasRecordedProgress: false,
        hasPersistedHistory: false,
        metrics: [],
        recentEvents: [],
        timeline: [],
        stableSubjects: [],
        needsWorkSubjects: [],
        stableConcepts: [],
        needsWorkConcepts: [],
        methodologyNote: "history",
      },
      strengths: [],
      needsWork: [],
      nextSteps: [{ id: "next-step" }],
      coverage: [],
      methodologyNote: "Test note",
      adaptiveReview: {
        hasItems: false,
        items: [],
        rationale: "Test rationale",
      },
    });

    const page = await DashboardAnalyticsPage();

    render(page);

    expect(screen.getByText("Analytics panel for 1 next steps")).toBeInTheDocument();
    expect(screen.getByText("Achievements analytics warning")).toBeInTheDocument();
    expect(mocks.getAchievementStatsForUserMock).toHaveBeenCalledWith({
      userId: "user-1",
    });
    expect(consoleErrorMock).toHaveBeenCalledWith(
      "[dashboard/analytics] achievement sync unavailable during render",
      expect.objectContaining({
        userId: "user-1",
        fallback: "analytics_without_fresh_achievement_sync",
      }),
    );

    consoleErrorMock.mockRestore();
  });

  it("keeps premium analytics alive with empty achievement stats when the stats lookup fails", async () => {
    const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const session = buildSession("premium");

    mocks.cookiesMock.mockResolvedValue({
      toString: () => "sb-auth=1",
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(session);
    mocks.getStoredProgressForCookieHeaderMock.mockResolvedValue({
      snapshot: {
        version: 1,
        concepts: {},
      },
      history: null,
      continueLearningState: null,
    });
    mocks.getConceptSummariesMock.mockReturnValue([]);
    mocks.getPublishedConceptMetadataMock.mockReturnValue([]);
    mocks.decorateConceptSummariesMock.mockReturnValue([]);
    mocks.getStarterTracksMock.mockReturnValue([]);
    mocks.getSubjectDiscoverySummariesMock.mockReturnValue([]);
    mocks.getTopicDiscoverySummariesMock.mockReturnValue([]);
    mocks.getGuidedCollectionsMock.mockReturnValue([]);
    mocks.getAchievementStatsForUserMock.mockRejectedValue(
      new Error("achievement stats failed"),
    );
    mocks.buildPremiumLearningAnalyticsMock.mockReturnValue({
      hasRecordedProgress: false,
      usageSnapshot: {
        achievementMetrics: [],
        progressMetrics: [],
      },
      checkpointHistory: {
        hasRecordedProgress: false,
        hasPersistedHistory: false,
        metrics: [],
        recentEvents: [],
        timeline: [],
        stableSubjects: [],
        needsWorkSubjects: [],
        stableConcepts: [],
        needsWorkConcepts: [],
        methodologyNote: "history",
      },
      strengths: [],
      needsWork: [],
      nextSteps: [],
      coverage: [],
      methodologyNote: "Test note",
      adaptiveReview: {
        hasItems: false,
        items: [],
        rationale: "Test rationale",
      },
    });

    const page = await DashboardAnalyticsPage();

    render(page);

    expect(screen.getByText("Analytics panel for 0 next steps")).toBeInTheDocument();
    expect(screen.getByText("Achievements analytics warning")).toBeInTheDocument();
    expect(mocks.buildPremiumLearningAnalyticsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        achievementStats: {
          conceptVisitCount: 0,
          questionAnswerCount: 0,
          distinctChallengeCompletionCount: 0,
          distinctTrackCompletionCount: 0,
          activeStudySeconds: 0,
        },
      }),
    );
    expect(consoleErrorMock).toHaveBeenCalledWith(
      "[dashboard/analytics] achievement stats unavailable during render",
      expect.objectContaining({
        userId: "user-1",
        fallback: "analytics_with_empty_achievement_stats",
      }),
    );

    consoleErrorMock.mockRestore();
  });
});
