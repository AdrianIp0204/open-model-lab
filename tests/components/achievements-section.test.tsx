// @vitest-environment jsdom

import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AchievementsSection } from "@/components/account/AchievementsSection";
import {
  ACHIEVEMENT_REWARD_STUDY_HOURS_TARGET,
  type AccountAchievementOverview,
} from "@/lib/achievements";

const mocks = vi.hoisted(() => ({
  useAccountAchievementOverviewMock: vi.fn(),
  startStripeHostedBillingActionMock: vi.fn(),
}));
const REWARD_REGION_NAME = "One-time Supporter starter reward";

vi.mock("@/lib/achievements/client", () => ({
  useAccountAchievementOverview: (...args: unknown[]) =>
    mocks.useAccountAchievementOverviewMock(...args),
}));

vi.mock("@/lib/billing/client", () => ({
  startStripeHostedBillingAction: (...args: unknown[]) =>
    mocks.startStripeHostedBillingActionMock(...args),
}));

function buildOverview(
  reward: AccountAchievementOverview["reward"],
): AccountAchievementOverview {
  return {
    stats: {
      conceptVisitCount: 12,
      questionAnswerCount: 40,
      distinctChallengeCompletionCount: 4,
      distinctTrackCompletionCount: 1,
      activeStudySeconds: 16_200,
    },
    milestoneGroups: [
      {
        statKey: "concept-visits",
        title: "Concept visits",
        description: "Concept pages you stayed with long enough to count as real study.",
        unitLabel: "concepts",
        currentValue: 12,
        nextMilestone: {
          statKey: "concept-visits",
          currentValue: 12,
          nextTarget: 20,
          progressRatio: 0.6,
        },
        items: [
          {
            key: "milestone:concept-visits:10",
            kind: "milestone",
            title: "10 concepts milestone",
            description: "Reached the 10 mark for concept visits.",
            earned: true,
            earnedAt: "2026-04-03T00:00:00.000Z",
            categoryKey: "milestone:concept-visits",
          },
        ],
      },
      {
        statKey: "challenge-completions",
        title: "Challenge modes completed",
        description: "Distinct challenge-mode solves across the concept catalog.",
        unitLabel: "challenges",
        currentValue: 4,
        nextMilestone: {
          statKey: "challenge-completions",
          currentValue: 4,
          nextTarget: 5,
          progressRatio: 0.8,
        },
        items: [
          {
            key: "milestone:challenge-completions:1",
            kind: "milestone",
            title: "1 challenge milestone",
            description: "Complete 1 distinct challenge mode.",
            earned: true,
            earnedAt: "2026-04-03T00:00:00.000Z",
            categoryKey: "milestone:challenge-completions",
          },
        ],
      },
      {
        statKey: "active-study-hours",
        title: "Active study time",
        description: "Active study time recorded from visible, engaged sessions.",
        unitLabel: "hours",
        currentValue: 4.5,
        nextMilestone: {
          statKey: "active-study-hours",
          currentValue: 4.5,
          nextTarget: 5,
          progressRatio: 0.9,
        },
        items: [
          {
            key: "milestone:active-study-hours:1",
            kind: "milestone",
            title: "1 hour milestone",
            description: "Study actively for 1 hour.",
            earned: true,
            earnedAt: "2026-04-03T00:00:00.000Z",
            categoryKey: "milestone:active-study-hours",
          },
        ],
      },
      {
        statKey: "question-answers",
        title: "Questions answered",
        description: "Count the first submitted answer for each unique question version.",
        unitLabel: "questions",
        currentValue: 40,
        nextMilestone: {
          statKey: "question-answers",
          currentValue: 40,
          nextTarget: 50,
          progressRatio: 0.8,
        },
        items: [
          {
            key: "milestone:question-answers:10",
            kind: "milestone",
            title: "10 questions milestone",
            description: "Answer 10 unique quick-test questions.",
            earned: true,
            earnedAt: "2026-04-03T00:00:00.000Z",
            categoryKey: "milestone:question-answers",
          },
        ],
      },
      {
        statKey: "track-completions",
        title: "Learning tracks completed",
        description: "Distinct starter tracks fully cleared through their authored flow.",
        unitLabel: "tracks",
        currentValue: 1,
        nextMilestone: {
          statKey: "track-completions",
          currentValue: 1,
          nextTarget: 3,
          progressRatio: 1 / 3,
        },
        items: [
          {
            key: "milestone:track-completions:1",
            kind: "milestone",
            title: "1 tracks milestone",
            description: "Reached the 1 mark for learning tracks completed.",
            earned: true,
            earnedAt: "2026-04-03T00:00:00.000Z",
            categoryKey: "milestone:track-completions",
          },
        ],
      },
    ],
    namedGroups: [
      {
        key: "challenge-completions",
        title: "Challenge completion badges",
        description: "One badge for each distinct challenge mode you complete.",
        items: Array.from({ length: 7 }, (_, index) => ({
          key: `challenge:test:${index}`,
          kind: "challenge" as const,
          title: `Challenge badge ${index + 1}`,
          description: "Complete a distinct challenge mode.",
          earned: index < 4,
          earnedAt: index < 4 ? "2026-04-03T00:00:00.000Z" : null,
          categoryKey: "challenge-completions",
        })),
      },
      {
        key: "track-completions",
        title: "Learning track badges",
        description: "One badge for each starter track you fully complete.",
        items: [],
      },
    ],
    reward,
  };
}

describe("AchievementsSection", () => {
  afterEach(() => {
    globalThis.__TEST_LOCALE__ = undefined;
    mocks.useAccountAchievementOverviewMock.mockReset();
    mocks.startStripeHostedBillingActionMock.mockReset();
  });

  it("shows explicit reward unlock routes and current progress in the locked state", () => {
    mocks.useAccountAchievementOverviewMock.mockReturnValue({
      initialized: true,
      loading: false,
      overview: buildOverview({
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
        checkoutReady: false,
      }),
      errorMessage: null,
    });

    render(<AchievementsSection />);

    const reward = screen.getByRole("region", { name: REWARD_REGION_NAME });
    expect(reward).toHaveTextContent(
      new RegExp(
        `either 30 distinct challenge modes or ${ACHIEVEMENT_REWARD_STUDY_HOURS_TARGET} active study hours`,
        "i",
      ),
    );
    expect(reward).toHaveTextContent(/you do not need both/i);
    expect(within(reward).getByText("Challenge modes")).toBeInTheDocument();
    expect(within(reward).getByText("4 / 30")).toBeInTheDocument();
    expect(within(reward).getByText("Active study hours")).toBeInTheDocument();
    expect(
      within(reward).getByText(`4.5 / ${ACHIEVEMENT_REWARD_STUDY_HOURS_TARGET}`),
    ).toBeInTheDocument();

    expect(screen.getAllByText("Unlocks reward")).toHaveLength(2);
    expect(
      within(screen.getByRole("region", { name: "Challenge modes completed" })).getByText(
        "Unlocks reward",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Active study time" })).getByText(
        "Unlocks reward",
      ),
    ).toBeInTheDocument();
  });

  it("shows the unlocked reward state with a locale-aware checkout CTA for eligible free users", async () => {
    const user = userEvent.setup();
    globalThis.__TEST_LOCALE__ = "zh-HK";
    mocks.useAccountAchievementOverviewMock.mockReturnValue({
      initialized: true,
      loading: false,
      overview: buildOverview({
        key: "premium-first-month-25-off",
        status: "unlocked",
        title: "25% off first Supporter month",
        description: "Reward description",
        reasonLabel: "Unlocked from 30 distinct challenge-mode completions.",
        unlockedAt: "2026-04-03T00:00:00.000Z",
        expiresAt: "2026-04-17T00:00:00.000Z",
        claimedAt: null,
        usedAt: null,
        claimable: true,
        resumable: false,
        checkoutReady: true,
      }),
      errorMessage: null,
    });

    render(<AchievementsSection />);

    expect(screen.getAllByRole("region").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /支持者方案/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /支持者方案/ }));

    expect(mocks.startStripeHostedBillingActionMock).toHaveBeenCalledWith(
      "/api/billing/checkout",
      "zh-HK",
    );
  });

  it("renders claimed and expired reward states clearly", () => {
    mocks.useAccountAchievementOverviewMock.mockReturnValue({
      initialized: true,
      loading: false,
      overview: buildOverview({
        key: "premium-first-month-25-off",
        status: "claimed",
        title: "25% off first Supporter month",
        description: "Reward description",
        reasonLabel: `Unlocked from ${ACHIEVEMENT_REWARD_STUDY_HOURS_TARGET} active study hours.`,
        unlockedAt: "2026-04-03T00:00:00.000Z",
        expiresAt: "2026-04-17T00:00:00.000Z",
        claimedAt: "2026-04-03T00:05:00.000Z",
        usedAt: null,
        claimable: false,
        resumable: false,
        checkoutReady: false,
      }),
      errorMessage: null,
    });

    const { rerender } = render(<AchievementsSection />);

    expect(screen.getByText("Claimed")).toBeInTheDocument();
    expect(screen.getByText(/discounted checkout was already reserved/i)).toBeInTheDocument();

    mocks.useAccountAchievementOverviewMock.mockReturnValue({
      initialized: true,
      loading: false,
      overview: buildOverview({
        key: "premium-first-month-25-off",
        status: "expired",
        title: "25% off first Supporter month",
        description: "Reward description",
        reasonLabel: `Unlocked from ${ACHIEVEMENT_REWARD_STUDY_HOURS_TARGET} active study hours.`,
        unlockedAt: "2026-04-03T00:00:00.000Z",
        expiresAt: "2026-04-10T00:00:00.000Z",
        claimedAt: null,
        usedAt: null,
        claimable: false,
        resumable: false,
        checkoutReady: false,
      }),
      errorMessage: null,
    });

    rerender(<AchievementsSection />);

    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByText(/expired on/i)).toBeInTheDocument();
  });

  it("renders the used reward state without a checkout CTA", () => {
    mocks.useAccountAchievementOverviewMock.mockReturnValue({
      initialized: true,
      loading: false,
      overview: buildOverview({
        key: "premium-first-month-25-off",
        status: "used",
        title: "25% off first Supporter month",
        description: "Reward description",
        reasonLabel: `Unlocked from ${ACHIEVEMENT_REWARD_STUDY_HOURS_TARGET} active study hours.`,
        unlockedAt: "2026-04-03T00:00:00.000Z",
        expiresAt: "2026-04-17T00:00:00.000Z",
        claimedAt: "2026-04-03T00:05:00.000Z",
        usedAt: "2026-04-04T00:00:00.000Z",
        claimable: false,
        resumable: false,
        checkoutReady: false,
      }),
      errorMessage: null,
    });

    render(<AchievementsSection />);

    expect(screen.getByText("Used")).toBeInTheDocument();
    expect(screen.getByText(/already used on/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Supporter/i })).not.toBeInTheDocument();
  });

  it("does not show a reward CTA for premium-ineligible accounts and collapses long badge lists", async () => {
    const user = userEvent.setup();
    mocks.useAccountAchievementOverviewMock.mockReturnValue({
      initialized: true,
      loading: false,
      overview: buildOverview({
        key: "premium-first-month-25-off",
        status: "premium-ineligible",
        title: "25% off first Supporter month",
        description: "Reward description",
        reasonLabel: "Unlocked from 30 distinct challenge-mode completions.",
        unlockedAt: "2026-04-03T00:00:00.000Z",
        expiresAt: "2026-04-17T00:00:00.000Z",
        claimedAt: null,
        usedAt: null,
        claimable: false,
        resumable: false,
        checkoutReady: false,
      }),
      errorMessage: null,
    });

    render(<AchievementsSection />);

    expect(screen.getByText("Supporter active")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Supporter/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show 1 more badges" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show 1 more badges" }));

    expect(screen.getByRole("button", { name: "Show fewer badges" })).toBeInTheDocument();
    expect(screen.getByText("Challenge badge 7")).toBeInTheDocument();
    expect(screen.getByText("No badges are available in this group yet.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show fewer badges" }));

    expect(screen.getByRole("button", { name: "Show 1 more badges" })).toBeInTheDocument();
  });

  it("does not show a reward CTA when the account already has Supporter history", () => {
    mocks.useAccountAchievementOverviewMock.mockReturnValue({
      initialized: true,
      loading: false,
      overview: buildOverview({
        key: "premium-first-month-25-off",
        status: "already-used",
        title: "25% off first Supporter month",
        description: "Reward description",
        reasonLabel: "This account already has Supporter subscription history.",
        unlockedAt: "2026-04-03T00:00:00.000Z",
        expiresAt: "2026-04-17T00:00:00.000Z",
        claimedAt: null,
        usedAt: null,
        claimable: false,
        resumable: false,
        checkoutReady: false,
      }),
      errorMessage: null,
    });

    render(<AchievementsSection />);

    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByText(/supporter subscription history/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Supporter/i })).not.toBeInTheDocument();
  });

  it("renders a proper zero-progress state instead of the unavailable fallback", () => {
    mocks.useAccountAchievementOverviewMock.mockReturnValue({
      initialized: true,
      loading: false,
      overview: {
        stats: {
          conceptVisitCount: 0,
          questionAnswerCount: 0,
          distinctChallengeCompletionCount: 0,
          distinctTrackCompletionCount: 0,
          activeStudySeconds: 0,
        },
        milestoneGroups: [
          {
            statKey: "challenge-completions",
            title: "Challenge modes completed",
            description: "Distinct challenge-mode solves across the concept catalog.",
            unitLabel: "challenges",
            currentValue: 0,
            nextMilestone: {
              statKey: "challenge-completions",
              currentValue: 0,
              nextTarget: 1,
              progressRatio: 0,
            },
            items: [],
          },
        ],
        namedGroups: [
          {
            key: "track-completions",
            title: "Learning track badges",
            description: "One badge for each starter track you fully complete.",
            items: [],
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
          checkoutReady: false,
        },
      },
      errorMessage: null,
    });

    render(<AchievementsSection />);

    expect(screen.getByRole("heading", { name: "Badges and study milestones" })).toBeInTheDocument();
    expect(screen.getByText("0 / 1 challenges")).toBeInTheDocument();
    expect(screen.getByText("No badges are available in this group yet.")).toBeInTheDocument();
    expect(
      screen.queryByText("Achievement progress is temporarily unavailable."),
    ).not.toBeInTheDocument();
  });

  it("keeps the learning-tracks zero-state progress rail visibly rendered", () => {
    const overview = buildOverview({
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
      checkoutReady: false,
    });

    overview.stats.distinctTrackCompletionCount = 0;
    overview.milestoneGroups = overview.milestoneGroups.map((group) =>
      group.statKey === "track-completions"
        ? {
            ...group,
            currentValue: 0,
            nextMilestone: {
              ...group.nextMilestone,
              currentValue: 0,
              nextTarget: 1,
              progressRatio: 0,
            },
            items: group.items.map((item) => ({
              ...item,
              earned: false,
              earnedAt: null,
            })),
          }
        : group,
    );

    mocks.useAccountAchievementOverviewMock.mockReturnValue({
      initialized: true,
      loading: false,
      overview,
      errorMessage: null,
    });

    render(<AchievementsSection />);

    const trackGroup = screen.getByRole("region", { name: "Learning tracks completed" });
    const rail = trackGroup.querySelector('[data-achievement-progress-rail="track-completions"]');

    expect(trackGroup).toHaveTextContent("0 / 1 tracks");
    expect(rail).not.toBeNull();
    expect(rail).toHaveClass("border");
    expect(rail).toHaveClass("bg-paper");
  });

  it("keeps the badge section visible when reward progress is only temporarily unavailable", () => {
    mocks.useAccountAchievementOverviewMock.mockReturnValue({
      initialized: true,
      loading: false,
      overview: buildOverview({
        key: "premium-first-month-25-off",
        status: "temporarily-unavailable",
        title: "25% off first Supporter month",
        description: "Reward description",
        reasonLabel: "Try again from this account in a moment.",
        unlockedAt: null,
        expiresAt: null,
        claimedAt: null,
        usedAt: null,
        claimable: false,
        resumable: false,
        checkoutReady: false,
      }),
      errorMessage: null,
    });

    render(<AchievementsSection />);

    expect(screen.getByText("Temporarily unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(/reward could not be checked on this request/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Badges and study milestones" })).toBeInTheDocument();
  });

  it("shows low-but-real active study time without rounding it down to zero", () => {
    const overview = buildOverview({
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
      checkoutReady: false,
    });

    overview.stats.activeStudySeconds = 38;
    overview.milestoneGroups = overview.milestoneGroups.map((group) =>
      group.statKey === "active-study-hours"
        ? {
            ...group,
            currentValue: 38 / 3600,
            nextMilestone: {
              ...group.nextMilestone,
              currentValue: 38 / 3600,
              nextTarget: 1,
              progressRatio: 38 / 3600,
            },
          }
        : group,
    );

    mocks.useAccountAchievementOverviewMock.mockReturnValue({
      initialized: true,
      loading: false,
      overview,
      errorMessage: null,
    });

    render(<AchievementsSection />);

    expect(
      screen.getByRole("region", { name: REWARD_REGION_NAME }),
    ).toHaveTextContent(new RegExp(`<0\\.1 / ${ACHIEVEMENT_REWARD_STUDY_HOURS_TARGET}`, "i"));
    expect(screen.getByRole("region", { name: "Active study time" })).toHaveTextContent(
      /<0\.1 hours/i,
    );
    expect(screen.getByRole("region", { name: "Active study time" })).toHaveTextContent(
      /<0\.1 \/ 1 hours/i,
    );
  });

  it("shows the unavailable state instead of rendering a healthy zero overview when the request fails", () => {
    mocks.useAccountAchievementOverviewMock.mockReturnValue({
      initialized: true,
      loading: false,
      overview: null,
      errorMessage: "Account achievements could not be loaded right now.",
    });

    render(<AchievementsSection />);

    expect(
      screen.getByRole("heading", {
        name: "Achievement progress is temporarily unavailable.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Account achievements could not be loaded right now."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Badges and study milestones" }),
    ).not.toBeInTheDocument();
  });
});
