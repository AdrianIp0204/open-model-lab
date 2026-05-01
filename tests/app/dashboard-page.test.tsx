// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import zhHkMessages from "@/messages/zh-HK.json";

const mocks = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  decorateConceptSummariesMock: vi.fn(),
  getAccountAchievementDashboardSnapshotMock: vi.fn(),
  getAccountAchievementDashboardSnapshotForAuthenticatedUserMock: vi.fn(),
  getAccountSessionForCookieHeaderMock: vi.fn(),
  getGuidedCollectionsMock: vi.fn(),
  getStoredAssignmentsIndexForCookieHeaderMock: vi.fn(),
  getStoredStudyPlansIndexForCookieHeaderMock: vi.fn(),
  getPublishedConceptMetadataMock: vi.fn(),
  getConceptSummariesMock: vi.fn(),
  getStarterTracksMock: vi.fn(),
  getStoredProgressForCookieHeaderMock: vi.fn(),
  getSubjectDiscoverySummariesMock: vi.fn(),
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

vi.mock("@/components/account/AccountDashboardPanel", () => ({
  AccountDashboardPanel: ({
    leadIn,
    initialSession,
    achievementSnapshot,
    savedGuidedAssignments,
    savedStudyPlans,
    serverWarnings,
  }: {
    leadIn?: ReactNode;
    initialSession: { user: { email: string } };
    achievementSnapshot: { milestoneCategories: Array<{ statKey: string }> };
    savedGuidedAssignments?: Array<{ id: string }>;
    savedStudyPlans?: Array<{ id: string }>;
    serverWarnings?: {
      entitlementUnavailable?: boolean;
      billingUnavailable?: boolean;
      syncedProgressUnavailable?: boolean;
      achievementsUnavailable?: boolean;
    };
  }) => (
    <div>
      {leadIn}
      <div>Dashboard panel for {initialSession.user.email}</div>
      <div>Achievement snapshot categories: {achievementSnapshot.milestoneCategories.length}</div>
      <div>Saved assignments: {savedGuidedAssignments?.length ?? 0}</div>
      <div>Saved study plans: {savedStudyPlans?.length ?? 0}</div>
      {serverWarnings?.entitlementUnavailable ? (
        <div>Entitlement unavailable warning</div>
      ) : null}
      {serverWarnings?.billingUnavailable ? <div>Billing unavailable warning</div> : null}
      {serverWarnings?.syncedProgressUnavailable ? (
        <div>Synced progress unavailable warning</div>
      ) : null}
      {serverWarnings?.achievementsUnavailable ? (
        <div>Achievements unavailable warning</div>
      ) : null}
    </div>
  ),
}));

vi.mock("@/lib/achievements/service", () => ({
  getAccountAchievementDashboardSnapshot: (...args: unknown[]) =>
    mocks.getAccountAchievementDashboardSnapshotMock(...args),
  getAccountAchievementDashboardSnapshotForAuthenticatedUser: (...args: unknown[]) =>
    mocks.getAccountAchievementDashboardSnapshotForAuthenticatedUserMock(...args),
  syncAchievementsFromTrustedProgressSnapshot: (...args: unknown[]) =>
    mocks.syncAchievementsFromTrustedProgressSnapshotMock(...args),
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
}));

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

vi.mock("@/lib/account/server-store", () => ({
  getStoredAssignmentsIndexForCookieHeader: (...args: unknown[]) =>
    mocks.getStoredAssignmentsIndexForCookieHeaderMock(...args),
  getStoredStudyPlansIndexForCookieHeader: (...args: unknown[]) =>
    mocks.getStoredStudyPlansIndexForCookieHeaderMock(...args),
}));

import DashboardPage from "@/app/dashboard/DashboardRoute";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";

describe("DashboardPage", () => {
  afterEach(() => {
    mocks.cookiesMock.mockReset();
    mocks.decorateConceptSummariesMock.mockReset();
    mocks.getAccountAchievementDashboardSnapshotMock.mockReset();
    mocks.getAccountAchievementDashboardSnapshotForAuthenticatedUserMock.mockReset();
    mocks.getAccountSessionForCookieHeaderMock.mockReset();
    mocks.getGuidedCollectionsMock.mockReset();
    mocks.getStoredAssignmentsIndexForCookieHeaderMock.mockReset();
    mocks.getStoredStudyPlansIndexForCookieHeaderMock.mockReset();
    mocks.getPublishedConceptMetadataMock.mockReset();
    mocks.getConceptSummariesMock.mockReset();
    mocks.getStarterTracksMock.mockReset();
    mocks.getStoredProgressForCookieHeaderMock.mockReset();
    mocks.getSubjectDiscoverySummariesMock.mockReset();
    mocks.redirectMock.mockReset();
    mocks.syncAchievementsFromTrustedProgressSnapshotMock.mockReset();
  });

  it("redirects signed-out users back to the account entry page", async () => {
    mocks.cookiesMock.mockResolvedValue({
      toString: () => "sb-auth=1",
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(null);

    await expect(DashboardPage()).rejects.toThrow("redirect:/en/account");

    expect(mocks.redirectMock).toHaveBeenCalledWith("/en/account");
  });

  it("renders the signed-in dashboard with the current session", async () => {
    const session = {
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
      billing: {
        source: "none",
        status: "none",
        canStartCheckout: true,
        canManageSubscription: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      },
    };

    mocks.cookiesMock.mockResolvedValue({
      toString: () => "sb-auth=1",
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(session);
    mocks.getStoredProgressForCookieHeaderMock.mockResolvedValue(null);
    mocks.getStoredAssignmentsIndexForCookieHeaderMock.mockResolvedValue([
      { id: "assignment-1" },
    ]);
    mocks.getStoredStudyPlansIndexForCookieHeaderMock.mockResolvedValue([]);
    mocks.getConceptSummariesMock.mockReturnValue([]);
    mocks.getPublishedConceptMetadataMock.mockReturnValue([]);
    mocks.decorateConceptSummariesMock.mockReturnValue([]);
    mocks.getStarterTracksMock.mockReturnValue([]);
    mocks.getSubjectDiscoverySummariesMock.mockReturnValue([]);
    mocks.getGuidedCollectionsMock.mockReturnValue([]);
    mocks.getAccountAchievementDashboardSnapshotMock.mockResolvedValue({
      milestoneCategories: [{ statKey: "concept-visits" }],
    });

    const page = await DashboardPage();

    render(page);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Signed-in home")).toBeInTheDocument();
    expect(screen.getByText("Dashboard panel for student@example.com")).toBeInTheDocument();
    expect(screen.getByText("Achievement snapshot categories: 1")).toBeInTheDocument();
    expect(screen.getByText("Saved assignments: 1")).toBeInTheDocument();
    expect(screen.getByText("Saved study plans: 0")).toBeInTheDocument();
  });

  it("passes premium saved study plans through to the dashboard panel", async () => {
    const session = {
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
      billing: {
        source: "stripe",
        status: "active",
        canStartCheckout: false,
        canManageSubscription: true,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: "2026-05-02T00:00:00.000Z",
      },
    };

    mocks.cookiesMock.mockResolvedValue({
      toString: () => "sb-auth=1",
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(session);
    mocks.getStoredProgressForCookieHeaderMock.mockResolvedValue(null);
    mocks.getStoredAssignmentsIndexForCookieHeaderMock.mockResolvedValue([]);
    mocks.getStoredStudyPlansIndexForCookieHeaderMock.mockResolvedValue([{ id: "plan-1" }]);
    mocks.getConceptSummariesMock.mockReturnValue([]);
    mocks.getPublishedConceptMetadataMock.mockReturnValue([]);
    mocks.decorateConceptSummariesMock.mockReturnValue([]);
    mocks.getStarterTracksMock.mockReturnValue([]);
    mocks.getSubjectDiscoverySummariesMock.mockReturnValue([]);
    mocks.getGuidedCollectionsMock.mockReturnValue([]);
    mocks.getAccountAchievementDashboardSnapshotMock.mockResolvedValue({
      milestoneCategories: [{ statKey: "concept-visits" }],
    });

    const page = await DashboardPage();

    render(page);

    expect(screen.getByText("Dashboard panel for student@example.com")).toBeInTheDocument();
    expect(screen.getByText("Saved study plans: 1")).toBeInTheDocument();
  });

  it("renders the signed-in dashboard lead-in in zh-HK", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    const session = {
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
      billing: {
        source: "none",
        status: "none",
        canStartCheckout: true,
        canManageSubscription: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      },
    };

    mocks.cookiesMock.mockResolvedValue({
      toString: () => "sb-auth=1",
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(session);
    mocks.getStoredProgressForCookieHeaderMock.mockResolvedValue(null);
    mocks.getStoredAssignmentsIndexForCookieHeaderMock.mockResolvedValue([]);
    mocks.getStoredStudyPlansIndexForCookieHeaderMock.mockResolvedValue([]);
    mocks.getConceptSummariesMock.mockReturnValue([]);
    mocks.getPublishedConceptMetadataMock.mockReturnValue([]);
    mocks.decorateConceptSummariesMock.mockReturnValue([]);
    mocks.getStarterTracksMock.mockReturnValue([]);
    mocks.getSubjectDiscoverySummariesMock.mockReturnValue([]);
    mocks.getGuidedCollectionsMock.mockReturnValue([]);
    mocks.getAccountAchievementDashboardSnapshotMock.mockResolvedValue({
      milestoneCategories: [{ statKey: "concept-visits" }],
    });

    const page = await DashboardPage({ localeOverride: "zh-HK" });

    render(page);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: zhHkMessages.DashboardPage.hero.title,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(zhHkMessages.DashboardPage.hero.description)).toBeInTheDocument();
    expect(screen.getByText("Dashboard panel for student@example.com")).toBeInTheDocument();
  });

  it("degrades gracefully when synced progress cannot be loaded", async () => {
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const session = {
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
      billing: {
        source: "none",
        status: "none",
        canStartCheckout: true,
        canManageSubscription: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      },
      warnings: {
        billingUnavailable: true,
      },
    };

    mocks.cookiesMock.mockResolvedValue({
      toString: () => "sb-auth=1",
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(session);
    mocks.getStoredProgressForCookieHeaderMock.mockRejectedValue({
      code: "42P01",
      message: 'relation "user_concept_progress_snapshots" does not exist',
    });
    mocks.getStoredAssignmentsIndexForCookieHeaderMock.mockResolvedValue([]);
    mocks.getStoredStudyPlansIndexForCookieHeaderMock.mockResolvedValue([]);
    mocks.getConceptSummariesMock.mockReturnValue([]);
    mocks.getPublishedConceptMetadataMock.mockReturnValue([]);
    mocks.decorateConceptSummariesMock.mockReturnValue([]);
    mocks.getStarterTracksMock.mockReturnValue([]);
    mocks.getSubjectDiscoverySummariesMock.mockReturnValue([]);
    mocks.getGuidedCollectionsMock.mockReturnValue([]);
    mocks.getAccountAchievementDashboardSnapshotMock.mockResolvedValue({
      milestoneCategories: [{ statKey: "concept-visits" }],
    });

    const page = await DashboardPage();

    render(page);

    expect(screen.getByText("Dashboard panel for student@example.com")).toBeInTheDocument();
    expect(screen.getByText("Billing unavailable warning")).toBeInTheDocument();
    expect(screen.getByText("Synced progress unavailable warning")).toBeInTheDocument();

    consoleWarnMock.mockRestore();
  });

  it("passes entitlement fallback warnings through to the signed-in dashboard", async () => {
    const session = {
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "account-default",
      }),
      billing: {
        source: "none",
        status: "none",
        canStartCheckout: true,
        canManageSubscription: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      },
      warnings: {
        entitlementUnavailable: true,
      },
    };

    mocks.cookiesMock.mockResolvedValue({
      toString: () => "sb-auth=1",
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(session);
    mocks.getStoredProgressForCookieHeaderMock.mockResolvedValue(null);
    mocks.getStoredAssignmentsIndexForCookieHeaderMock.mockResolvedValue([]);
    mocks.getStoredStudyPlansIndexForCookieHeaderMock.mockResolvedValue([]);
    mocks.getConceptSummariesMock.mockReturnValue([]);
    mocks.getPublishedConceptMetadataMock.mockReturnValue([]);
    mocks.decorateConceptSummariesMock.mockReturnValue([]);
    mocks.getStarterTracksMock.mockReturnValue([]);
    mocks.getSubjectDiscoverySummariesMock.mockReturnValue([]);
    mocks.getGuidedCollectionsMock.mockReturnValue([]);
    mocks.getAccountAchievementDashboardSnapshotMock.mockResolvedValue({
      milestoneCategories: [{ statKey: "concept-visits" }],
    });

    const page = await DashboardPage();

    render(page);

    expect(screen.getByText("Dashboard panel for student@example.com")).toBeInTheDocument();
    expect(screen.getByText("Entitlement unavailable warning")).toBeInTheDocument();
  });

  it("syncs trusted stored progress before building the dashboard snapshot", async () => {
    const session = {
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
      billing: {
        source: "none",
        status: "none",
        canStartCheckout: true,
        canManageSubscription: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      },
    };
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
    mocks.getStoredAssignmentsIndexForCookieHeaderMock.mockResolvedValue([]);
    mocks.getStoredStudyPlansIndexForCookieHeaderMock.mockResolvedValue([]);
    mocks.getConceptSummariesMock.mockReturnValue([]);
    mocks.getPublishedConceptMetadataMock.mockReturnValue([]);
    mocks.decorateConceptSummariesMock.mockReturnValue([]);
    mocks.getStarterTracksMock.mockReturnValue([]);
    mocks.getSubjectDiscoverySummariesMock.mockReturnValue([]);
    mocks.getGuidedCollectionsMock.mockReturnValue([]);
    mocks.getAccountAchievementDashboardSnapshotMock.mockResolvedValue({
      milestoneCategories: [{ statKey: "concept-visits" }],
    });

    const page = await DashboardPage();

    render(page);

    expect(mocks.syncAchievementsFromTrustedProgressSnapshotMock).toHaveBeenCalledWith({
      userId: "user-1",
      entitlementTier: "free",
      snapshot,
    });
    expect(screen.getByText("Achievement snapshot categories: 1")).toBeInTheDocument();
  });

  it("renders the signed-in dashboard with an empty achievement fallback when the snapshot loader fails", async () => {
    const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const session = {
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
      billing: {
        source: "none",
        status: "none",
        canStartCheckout: true,
        canManageSubscription: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      },
    };

    mocks.cookiesMock.mockResolvedValue({
      toString: () => "sb-auth=1",
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(session);
    mocks.getStoredProgressForCookieHeaderMock.mockResolvedValue(null);
    mocks.getStoredAssignmentsIndexForCookieHeaderMock.mockResolvedValue([]);
    mocks.getStoredStudyPlansIndexForCookieHeaderMock.mockResolvedValue([]);
    mocks.getConceptSummariesMock.mockReturnValue([]);
    mocks.getPublishedConceptMetadataMock.mockReturnValue([]);
    mocks.decorateConceptSummariesMock.mockReturnValue([]);
    mocks.getStarterTracksMock.mockReturnValue([]);
    mocks.getSubjectDiscoverySummariesMock.mockReturnValue([]);
    mocks.getGuidedCollectionsMock.mockReturnValue([]);
    mocks.getAccountAchievementDashboardSnapshotMock.mockRejectedValue(
      new Error("achievement snapshot failed"),
    );
    mocks.getAccountAchievementDashboardSnapshotForAuthenticatedUserMock.mockRejectedValue(
      new Error("authenticated achievement snapshot failed"),
    );

    const page = await DashboardPage();

    render(page);

    expect(screen.getByText("Dashboard panel for student@example.com")).toBeInTheDocument();
    expect(screen.getByText("Achievement snapshot categories: 0")).toBeInTheDocument();
    expect(screen.getByText("Achievements unavailable warning")).toBeInTheDocument();

    consoleErrorMock.mockRestore();
  });

  it("keeps the signed-in dashboard alive when achievement sync fails for a new stored snapshot", async () => {
    const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const session = {
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
      billing: {
        source: "none",
        status: "none",
        canStartCheckout: true,
        canManageSubscription: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      },
    };
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
    mocks.getStoredAssignmentsIndexForCookieHeaderMock.mockResolvedValue([]);
    mocks.getStoredStudyPlansIndexForCookieHeaderMock.mockResolvedValue([]);
    mocks.getConceptSummariesMock.mockReturnValue([]);
    mocks.getPublishedConceptMetadataMock.mockReturnValue([]);
    mocks.decorateConceptSummariesMock.mockReturnValue([]);
    mocks.getStarterTracksMock.mockReturnValue([]);
    mocks.getSubjectDiscoverySummariesMock.mockReturnValue([]);
    mocks.getGuidedCollectionsMock.mockReturnValue([]);
    mocks.syncAchievementsFromTrustedProgressSnapshotMock.mockRejectedValue(
      new Error("achievement sync failed"),
    );
    mocks.getAccountAchievementDashboardSnapshotMock.mockResolvedValue({
      milestoneCategories: [{ statKey: "concept-visits" }],
    });

    const page = await DashboardPage();

    render(page);

    expect(screen.getByText("Dashboard panel for student@example.com")).toBeInTheDocument();
    expect(screen.getByText("Achievement snapshot categories: 1")).toBeInTheDocument();
    expect(screen.getByText("Achievements unavailable warning")).toBeInTheDocument();

    consoleErrorMock.mockRestore();
  });

  it("uses the authenticated achievement snapshot fallback when the service-role snapshot path fails", async () => {
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const session = {
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
      billing: {
        source: "none",
        status: "none",
        canStartCheckout: true,
        canManageSubscription: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      },
    };

    mocks.cookiesMock.mockResolvedValue({
      toString: () => "sb-auth=1",
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(session);
    mocks.getStoredProgressForCookieHeaderMock.mockResolvedValue(null);
    mocks.getStoredAssignmentsIndexForCookieHeaderMock.mockResolvedValue([]);
    mocks.getStoredStudyPlansIndexForCookieHeaderMock.mockResolvedValue([]);
    mocks.getConceptSummariesMock.mockReturnValue([]);
    mocks.getPublishedConceptMetadataMock.mockReturnValue([]);
    mocks.decorateConceptSummariesMock.mockReturnValue([]);
    mocks.getStarterTracksMock.mockReturnValue([]);
    mocks.getSubjectDiscoverySummariesMock.mockReturnValue([]);
    mocks.getGuidedCollectionsMock.mockReturnValue([]);
    mocks.getAccountAchievementDashboardSnapshotMock.mockRejectedValue(
      new Error("SUPABASE_SERVICE_ROLE_KEY is not set"),
    );
    mocks.getAccountAchievementDashboardSnapshotForAuthenticatedUserMock.mockResolvedValue({
      milestoneCategories: [{ statKey: "concept-visits" }],
    });

    const page = await DashboardPage();

    render(page);

    expect(
      mocks.getAccountAchievementDashboardSnapshotForAuthenticatedUserMock,
    ).toHaveBeenCalledWith({
      userId: "user-1",
      cookieHeader: "sb-auth=1",
    });
    expect(screen.getByText("Achievement snapshot categories: 1")).toBeInTheDocument();
    expect(screen.queryByText("Achievements unavailable warning")).not.toBeInTheDocument();
    expect(consoleWarnMock).toHaveBeenCalledWith(
      "[dashboard] achievement snapshot used authenticated fallback",
      expect.objectContaining({
        userId: "user-1",
        fallback: "authenticated_snapshot_read",
      }),
    );

    consoleWarnMock.mockRestore();
  });
});
