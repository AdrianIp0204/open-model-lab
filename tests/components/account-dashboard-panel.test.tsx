// @vitest-environment jsdom

import userEvent from "@testing-library/user-event";
import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACHIEVEMENT_REWARD_STUDY_HOURS_TARGET,
  type AccountAchievementDashboardSnapshot,
} from "@/lib/achievements";

const replaceMock = vi.fn();
const signOutAccountMock = vi.fn();
const useAccountSessionMock = vi.fn();
const useProgressSnapshotMock = vi.fn();
const useProgressSyncStateMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  useSearchParams: () => new URLSearchParams(globalThis.__TEST_SEARCH_PARAMS__ ?? ""),
}));

vi.mock("@/lib/account/client", () => ({
  signOutAccount: (...args: unknown[]) => signOutAccountMock(...args),
  useAccountSession: () => useAccountSessionMock(),
}));

vi.mock("@/lib/progress", async () => {
  const actual = await vi.importActual<typeof import("@/lib/progress")>(
    "@/lib/progress",
  );

  return {
    ...actual,
    useProgressSnapshot: () => useProgressSnapshotMock(),
    useProgressSyncState: () => useProgressSyncStateMock(),
  };
});

vi.mock("@/components/progress/ContinueLearningSection", () => ({
  ContinueLearningSection: () => <div>Continue learning surface</div>,
}));

vi.mock("@/components/progress/ReviewQueueSection", () => ({
  ReviewQueueSection: () => <div>Review queue surface</div>,
}));

vi.mock("@/components/progress/PremiumAdaptiveReviewPanel", () => ({
  PremiumAdaptiveReviewPanel: () => <div>Supporter adaptive review surface</div>,
}));

vi.mock("@/components/account/PremiumSubscriptionActions", () => ({
  PremiumSubscriptionActions: ({
    billingUnavailable,
  }: {
    billingUnavailable?: boolean;
  }) => <div>{billingUnavailable ? "Billing unavailable controls" : "Billing controls"}</div>,
}));

vi.mock("@/components/account/PremiumFeatureNotice", () => ({
  PremiumFeatureNotice: () => <div>Supporter notice</div>,
}));

vi.mock("@/components/account/PremiumCheckpointHistoryPanel", () => ({
  PremiumCheckpointHistoryPanel: () => <div>Supporter checkpoint history surface</div>,
}));

import { AccountDashboardPanel } from "@/components/account/AccountDashboardPanel";
import { resolveSavedStudyPlanRecord } from "@/lib/account/study-plans";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import {
  getGuidedCollectionBySlug,
  getConceptSummaries,
  getGuidedCollections,
  getStarterTracks,
} from "@/lib/content";
import { resolveGuidedCollectionAssignment } from "@/lib/guided/assignments";

function buildInitialSession(tier: "free" | "premium") {
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
          },
  };
}

function buildAchievementSnapshot(): AccountAchievementDashboardSnapshot {
  return {
    milestoneCategories: [
      {
        statKey: "concept-visits",
        title: "Concept visits",
        summaryTitle: "10 concepts milestone",
        progressLabel: "12 / 20",
        status: "earned",
        rewardRelevant: false,
      },
      {
        statKey: "question-answers",
        title: "Questions answered",
        summaryTitle: "Next: 10 questions milestone",
        progressLabel: "4 / 10",
        status: "next-up",
        rewardRelevant: false,
      },
      {
        statKey: "challenge-completions",
        title: "Challenge modes completed",
        summaryTitle: "15 challenges milestone",
        progressLabel: "17 / 30",
        status: "earned",
        rewardRelevant: true,
      },
      {
        statKey: "track-completions",
        title: "Learning tracks completed",
        summaryTitle: "Next: 1 tracks milestone",
        progressLabel: "0 / 1",
        status: "next-up",
        rewardRelevant: false,
      },
      {
        statKey: "active-study-hours",
        title: "Active study time",
        summaryTitle: "5 hours milestone",
        progressLabel: `5 / ${ACHIEVEMENT_REWARD_STUDY_HOURS_TARGET}`,
        status: "earned",
        rewardRelevant: true,
      },
    ],
  };
}

function buildCheckpointHistoryView() {
  return {
    hasRecordedProgress: true,
    hasPersistedHistory: true,
    metrics: [],
    recentEvents: [],
    timeline: [],
    stableSubjects: [],
    needsWorkSubjects: [],
    stableConcepts: [],
    needsWorkConcepts: [],
    methodologyNote: "history",
  };
}

describe("AccountDashboardPanel", () => {
  beforeEach(() => {
    globalThis.__TEST_ROUTER_REPLACE__ = replaceMock;
    useProgressSnapshotMock.mockReturnValue({
      version: 1,
      concepts: {
        "projectile-motion": {},
      },
    });
    useProgressSyncStateMock.mockReturnValue({
      mode: "local",
      lastSyncedAt: null,
      errorMessage: null,
    });
  });

  afterEach(() => {
    replaceMock.mockReset();
    signOutAccountMock.mockReset();
    useAccountSessionMock.mockReset();
    useProgressSnapshotMock.mockReset();
    useProgressSyncStateMock.mockReset();
  });

  it("renders the signed-in free dashboard with upgrade and account actions", () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: buildInitialSession("free").user,
      entitlement: buildInitialSession("free").entitlement,
      billing: buildInitialSession("free").billing,
      authMode: "supabase",
      pendingAction: null,
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });

    render(
      <AccountDashboardPanel
        initialSession={buildInitialSession("free")}
        concepts={[]}
        starterTracks={[]}
        guidedCollections={[]}
        achievementSnapshot={buildAchievementSnapshot()}
      />,
    );

    expect(screen.getByText(/welcome back, lab student/i)).toBeInTheDocument();
    expect(screen.getByText(/signed in as student@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/syncs with this account across devices/i)).toBeInTheDocument();
    expect(screen.getByText("Supporter notice")).toBeInTheDocument();
    expect(screen.getByText("Billing controls")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sync now" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Account settings" })).toHaveAttribute(
      "href",
      "/account",
    );
    expect(
      screen
        .getAllByRole("link", { name: "Study plans" })
        .some((link) => link.getAttribute("href") === "/account/study-plans"),
    ).toBe(true);
    expect(screen.getByRole("heading", { name: "Achievement snapshot" })).toBeInTheDocument();
    expect(screen.getByText("10 concepts milestone")).toBeInTheDocument();
    expect(screen.getByText("Next: 10 questions milestone")).toBeInTheDocument();
    expect(screen.getByText("15 challenges milestone")).toBeInTheDocument();
    expect(screen.getByText("0 / 1")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Learning analytics" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Unlock Supporter analytics" })).toHaveAttribute(
      "href",
      "/pricing#compare",
    );
    const nav = screen.getByRole("navigation", { name: "Dashboard sections" });
    expect(within(nav).getByRole("link", { name: "Dashboard overview" })).toHaveAttribute(
      "href",
      "#dashboard-overview",
    );
    expect(within(nav).getByRole("link", { name: "Guided assignments" })).toHaveAttribute(
      "href",
      "#dashboard-guided-assignments",
    );
    expect(within(nav).getByRole("link", { name: "Continue learning" })).toHaveAttribute(
      "href",
      "#dashboard-continue-learning",
    );
    expect(
      within(nav).queryByRole("link", { name: "Adaptive review" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all badges and rewards" })).toHaveAttribute(
      "href",
      "/account",
    );
    expect(screen.getAllByText("Unlocks reward")).toHaveLength(2);
    expect(screen.queryByText("Review queue surface")).not.toBeInTheDocument();
    expect(screen.queryByText("Supporter adaptive review surface")).not.toBeInTheDocument();
  });

  it("shows a retry-needed sync label instead of an indefinite waiting state after sync errors", () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: buildInitialSession("free").user,
      entitlement: buildInitialSession("free").entitlement,
      billing: buildInitialSession("free").billing,
      authMode: "supabase",
      pendingAction: null,
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });
    useProgressSyncStateMock.mockReturnValue({
      mode: "error",
      lastSyncedAt: null,
      errorMessage: "Account progress could not be synced right now.",
    });

    render(
      <AccountDashboardPanel
        initialSession={buildInitialSession("free")}
        concepts={[]}
        starterTracks={[]}
        guidedCollections={[]}
        achievementSnapshot={buildAchievementSnapshot()}
      />,
    );

    expect(screen.getByText("Retry needed")).toBeInTheDocument();
    expect(screen.queryByText("Waiting for sync")).not.toBeInTheDocument();
  });

  it("renders the premium dashboard with review shortcuts", () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: buildInitialSession("premium").user,
      entitlement: buildInitialSession("premium").entitlement,
      billing: buildInitialSession("premium").billing,
      authMode: "supabase",
      pendingAction: null,
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });
    useProgressSyncStateMock.mockReturnValue({
      mode: "synced",
      lastSyncedAt: "2026-04-03T01:00:00.000Z",
      errorMessage: null,
    });

    render(
      <AccountDashboardPanel
        initialSession={buildInitialSession("premium")}
        concepts={[]}
        starterTracks={[]}
        guidedCollections={[]}
        achievementSnapshot={buildAchievementSnapshot()}
        initialSyncedContinueLearningState={
          {
            primaryConcept: {
              slug: "projectile-motion",
              title: "Projectile Motion",
              resumeReason: "Resume the synced concept from another device.",
              masteryNote: null,
            },
          } as never
        }
        initialCheckpointHistoryView={buildCheckpointHistoryView() as never}
      />,
    );

    expect(screen.getByText(/supporter status/i)).toBeInTheDocument();
    expect(screen.getByText("Billing controls")).toBeInTheDocument();
    expect(screen.getByText("Supporter adaptive review surface")).toBeInTheDocument();
    expect(screen.getByText("Supporter checkpoint history surface")).toBeInTheDocument();
    expect(screen.getByText("Review queue surface")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Achievement snapshot" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Learning analytics" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open analytics" })).toHaveAttribute(
      "href",
      "/dashboard/analytics",
    );
    const nav = screen.getByRole("navigation", { name: "Dashboard sections" });
    expect(within(nav).getByRole("link", { name: "Supporter checkpoint history" })).toHaveAttribute(
      "href",
      "#dashboard-checkpoint-history",
    );
    expect(within(nav).getByRole("link", { name: "Saved study plans" })).toHaveAttribute(
      "href",
      "#dashboard-study-plans",
    );
    expect(within(nav).getByRole("link", { name: "Adaptive review" })).toHaveAttribute(
      "href",
      "#dashboard-adaptive-review",
    );
    expect(within(nav).getByRole("link", { name: "Review queue" })).toHaveAttribute(
      "href",
      "#dashboard-review-queue",
    );
    expect(
      screen
        .getAllByRole("link", { name: "Study plans" })
        .some((link) => link.getAttribute("href") === "/account/study-plans"),
    ).toBe(true);
    expect(screen.getByText("5 hours milestone")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Resume synced concept" })).toHaveAttribute(
      "href",
      "/concepts/projectile-motion",
    );
  });

  it("shows the scheduled-cancellation date in the dashboard billing status", () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: buildInitialSession("premium").user,
      entitlement: buildInitialSession("premium").entitlement,
      billing: {
        source: "stripe",
        status: "canceling",
        canStartCheckout: false,
        canManageSubscription: true,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: "2026-05-02T00:00:00.000Z",
      },
      authMode: "supabase",
      pendingAction: null,
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });

    render(
      <AccountDashboardPanel
        initialSession={{
          ...buildInitialSession("premium"),
          billing: {
            source: "stripe",
            status: "canceling",
            canStartCheckout: false,
            canManageSubscription: true,
            cancelAtPeriodEnd: true,
            currentPeriodEnd: "2026-05-02T00:00:00.000Z",
          },
        }}
        concepts={[]}
        starterTracks={[]}
        guidedCollections={[]}
        achievementSnapshot={buildAchievementSnapshot()}
      />,
    );

    expect(screen.getByText("Active, cancels on May 2, 2026")).toBeInTheDocument();
  });

  it("shows bounded fallback warnings when optional billing, synced progress, or achievements data is unavailable", () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: buildInitialSession("premium").user,
      entitlement: buildInitialSession("premium").entitlement,
      billing: buildInitialSession("premium").billing,
      warnings: {
        billingUnavailable: true,
      },
      authMode: "supabase",
      pendingAction: null,
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });

    render(
      <AccountDashboardPanel
        initialSession={{
          ...buildInitialSession("premium"),
          warnings: {
            billingUnavailable: true,
          },
        }}
        concepts={[]}
        starterTracks={[]}
        guidedCollections={[]}
        achievementSnapshot={buildAchievementSnapshot()}
        serverWarnings={{
          billingUnavailable: true,
          syncedProgressUnavailable: true,
          achievementsUnavailable: true,
        }}
      />,
    );

    expect(
      screen.getByText(/some account details are temporarily unavailable/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/billing details could not be loaded/i)).toBeInTheDocument();
    expect(screen.getByText(/account progress could not be loaded/i)).toBeInTheDocument();
    expect(screen.getByText(/achievement stats or badge history could not be loaded/i)).toBeInTheDocument();
    expect(screen.getByText("Billing unavailable controls")).toBeInTheDocument();
  });

  it("keeps the achievement section usable when the dashboard gets an empty snapshot", () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: buildInitialSession("free").user,
      entitlement: buildInitialSession("free").entitlement,
      billing: buildInitialSession("free").billing,
      authMode: "supabase",
      pendingAction: null,
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });

    render(
      <AccountDashboardPanel
        initialSession={buildInitialSession("free")}
        concepts={[]}
        starterTracks={[]}
        guidedCollections={[]}
        achievementSnapshot={{ milestoneCategories: [] }}
        serverWarnings={{
          achievementsUnavailable: true,
        }}
      />,
    );

    expect(screen.getByText(/achievement snapshot is not ready yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/could not load account-backed achievement data on this request/i),
    ).toBeInTheDocument();
  });

  it("shows the entitlement fallback warning when stored account tier lookup fails", () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: buildInitialSession("free").user,
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "account-default",
      }),
      billing: buildInitialSession("free").billing,
      warnings: {
        entitlementUnavailable: true,
      },
      authMode: "supabase",
      pendingAction: null,
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });

    render(
      <AccountDashboardPanel
        initialSession={{
          ...buildInitialSession("free"),
          entitlement: resolveAccountEntitlement({
            tier: "free",
            source: "account-default",
          }),
          warnings: {
            entitlementUnavailable: true,
          },
        }}
        concepts={[]}
        starterTracks={[]}
        guidedCollections={[]}
        achievementSnapshot={buildAchievementSnapshot()}
      />,
    );

    expect(
      screen.getByText(/stored account tier could not be verified for this request/i),
    ).toBeInTheDocument();
  });

  it("surfaces free-tier checkpoint traction before the premium upsell", () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: buildInitialSession("free").user,
      entitlement: buildInitialSession("free").entitlement,
      billing: buildInitialSession("free").billing,
      authMode: "supabase",
      pendingAction: null,
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });
    useProgressSnapshotMock.mockReturnValue({
      version: 1,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          firstVisitedAt: "2026-04-03T09:00:00.000Z",
          lastVisitedAt: "2026-04-05T09:10:00.000Z",
          lastInteractedAt: "2026-04-05T09:10:00.000Z",
          completedChallenges: {
            "pm-ch-flat-far-shot": "2026-04-05T09:15:00.000Z",
          },
        },
      },
    });

    render(
      <AccountDashboardPanel
        initialSession={buildInitialSession("free")}
        concepts={getConceptSummaries()}
        starterTracks={getStarterTracks()}
        guidedCollections={getGuidedCollections()}
        achievementSnapshot={buildAchievementSnapshot()}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /recent clears, subject momentum, and the next few honest prompts/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/projectile motion checkpoint/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/physics/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /reopen checkpoint/i })).toHaveAttribute(
      "href",
      "/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode",
    );
  });

  it("surfaces saved guided assignments against the same saved learner snapshot", () => {
    const collection = getGuidedCollectionBySlug("waves-evidence-loop");
    const assignment = resolveGuidedCollectionAssignment(collection, {
      id: "a3d5c9a2-0e64-4d21-a923-1cce7ef560a7",
      title: "Wave evidence assignment",
      summary: "Track plus one interference checkpoint.",
      stepIds: ["waves-dark-band-challenge"],
      launchStepId: "waves-dark-band-challenge",
      teacherNote: "Use the challenge as the discussion handoff.",
      creatorDisplayName: "Teacher",
      createdAt: "2026-03-29T10:00:00.000Z",
      updatedAt: "2026-03-29T10:00:00.000Z",
    });

    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: buildInitialSession("free").user,
      entitlement: buildInitialSession("free").entitlement,
      billing: buildInitialSession("free").billing,
      authMode: "supabase",
      pendingAction: null,
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });
    useProgressSnapshotMock.mockReturnValue({
      version: 1,
      concepts: {
        "wave-interference": {
          conceptId: "concept-wave-interference",
          slug: "wave-interference",
          usedChallengeModeAt: "2026-03-29T10:10:00.000Z",
          startedChallenges: {
            "wi-ch-find-dark-band": "2026-03-29T10:10:00.000Z",
          },
          completedChallenges: {
            "wi-ch-find-dark-band": "2026-03-29T10:14:00.000Z",
          },
        },
      },
    });

    render(
      <AccountDashboardPanel
        initialSession={buildInitialSession("free")}
        concepts={getConceptSummaries()}
        starterTracks={getStarterTracks()}
        guidedCollections={getGuidedCollections()}
        savedGuidedAssignments={assignment ? [assignment] : []}
        achievementSnapshot={buildAchievementSnapshot()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /assigned guided collection paths/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/progress below uses saved local progress/i)).toBeInTheDocument();
    expect(screen.getByText(/wave evidence assignment/i)).toBeInTheDocument();
    expect(screen.getAllByText(/instructor note/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/use the challenge as the discussion handoff/i)).toBeInTheDocument();
    expect(screen.getByText("1 / 1 steps complete")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review assigned steps" })).toHaveAttribute(
      "href",
      "/assignments/a3d5c9a2-0e64-4d21-a923-1cce7ef560a7#assignment-steps",
    );
    expect(screen.getByRole("link", { name: "Open assignment" })).toHaveAttribute(
      "href",
      "/assignments/a3d5c9a2-0e64-4d21-a923-1cce7ef560a7",
    );
    expect(screen.getByRole("button", { name: /copy assignment page link/i })).toBeInTheDocument();
  });

  it("surfaces saved study plans through the same canonical progress snapshot", () => {
    const savedStudyPlan = resolveSavedStudyPlanRecord({
      id: "c77a6fb6-16fc-4d4d-a983-9fb1010f4e0c",
      title: "Wave bridge plan",
      summary: "Open the goal path before the focused collection handoff.",
      entries: [
        {
          kind: "goal-path",
          slug: "waves-intuition",
        },
        {
          kind: "guided-collection",
          slug: "waves-evidence-loop",
        },
      ],
      createdAt: "2026-03-29T10:00:00.000Z",
      updatedAt: "2026-03-29T10:00:00.000Z",
    });

    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: buildInitialSession("premium").user,
      entitlement: buildInitialSession("premium").entitlement,
      billing: buildInitialSession("premium").billing,
      authMode: "supabase",
      pendingAction: null,
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });
    useProgressSnapshotMock.mockReturnValue({
      version: 1,
      concepts: {
        "wave-interference": {
          conceptId: "concept-wave-interference",
          slug: "wave-interference",
          firstVisitedAt: "2026-03-29T10:05:00.000Z",
          lastVisitedAt: "2026-03-29T10:08:00.000Z",
        },
      },
    });

    render(
      <AccountDashboardPanel
        initialSession={buildInitialSession("premium")}
        concepts={getConceptSummaries()}
        starterTracks={getStarterTracks()}
        guidedCollections={getGuidedCollections()}
        savedStudyPlans={savedStudyPlan ? [savedStudyPlan] : []}
        achievementSnapshot={buildAchievementSnapshot()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /supporter custom learning paths/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/wave bridge plan/i)).toBeInTheDocument();
    expect(screen.getByText("Next action")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage study plans" })).toHaveAttribute(
      "href",
      "/account/study-plans",
    );
    expect(screen.getByRole("link", { name: "Open concepts" })).toHaveAttribute(
      "href",
      "/account/study-plans",
    );
  });

  it("signs out from the dashboard", async () => {
    const user = userEvent.setup();

    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: buildInitialSession("free").user,
      entitlement: buildInitialSession("free").entitlement,
      billing: buildInitialSession("free").billing,
      authMode: "supabase",
      pendingAction: null,
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });

    render(
      <AccountDashboardPanel
        initialSession={buildInitialSession("free")}
        concepts={[]}
        starterTracks={[]}
        guidedCollections={[]}
        achievementSnapshot={buildAchievementSnapshot()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(signOutAccountMock).toHaveBeenCalledOnce();
  });

  it("returns to account when the live session becomes signed-out", async () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-out",
      user: null,
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "anonymous-default",
      }),
      billing: null,
      authMode: "supabase",
      pendingAction: null,
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });

    render(
      <AccountDashboardPanel
        initialSession={buildInitialSession("free")}
        concepts={[]}
        starterTracks={[]}
        guidedCollections={[]}
        achievementSnapshot={buildAchievementSnapshot()}
      />,
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/account");
    });
  });
});
