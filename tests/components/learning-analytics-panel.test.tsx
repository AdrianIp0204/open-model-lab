// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LearningAnalyticsPanel } from "@/components/account/LearningAnalyticsPanel";
import { getLocalizedProgressSupportReason } from "@/lib/i18n/progress";
import type { PremiumLearningAnalytics } from "@/lib/progress";

const analytics: PremiumLearningAnalytics = {
  hasRecordedProgress: true,
  usageSnapshot: {
    achievementMetrics: [
      {
        label: "Concept visits",
        value: "18",
        note: "Server-backed meaningful concept engagements.",
      },
      {
        label: "Questions answered",
        value: "24",
        note: "First submitted answers for unique quick-test questions.",
      },
      {
        label: "Challenge completions",
        value: "3",
        note: "Distinct challenge-mode solves saved on this account.",
      },
      {
        label: "Track completions",
        value: "1",
        note: "Distinct starter tracks fully completed.",
      },
      {
        label: "Active study hours",
        value: "5 hours",
        note: "Visible, engaged signed-in study time only.",
      },
    ],
    progressMetrics: [
      {
        label: "Concepts started",
        value: "4",
        note: "Concepts with saved progress on this account.",
      },
      {
        label: "Concepts completed",
        value: "2",
        note: "Concepts marked complete in saved progress.",
      },
      {
        label: "Solved challenge concepts",
        value: "1",
        note: "Concepts with at least one saved challenge solve.",
      },
      {
        label: "Quick-test concepts",
        value: "3",
        note: "Concepts with a finished quick test.",
      },
      {
        label: "Study-tool touches",
        value: "2",
        note: "Prediction 1, Compare 0, Worked examples 1.",
      },
    ],
  },
  checkpointHistory: {
    hasRecordedProgress: true,
    hasPersistedHistory: true,
    metrics: [
      {
        label: "Checkpoint clears",
        value: "2",
        note: "Saved checkpoint clears in the synced Supporter history.",
      },
      {
        label: "Challenge solves",
        value: "1",
        note: "Saved non-checkpoint challenge solves across synced devices.",
      },
      {
        label: "Solid concepts",
        value: "2",
        note: "Concepts that currently have at least two stronger saved checks.",
      },
      {
        label: "History points",
        value: "3",
        note: "Bounded synced change points stored for the mastery view.",
      },
    ],
    recentEvents: [
      {
        id: "history-1",
        kind: "checkpoint-cleared",
        occurredAt: "2026-04-03T12:00:00.000Z",
        title: "Trajectory checkpoint",
        note: "Mechanics checkpoint cleared in saved sync history.",
        href: "/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode",
        conceptSlug: "projectile-motion",
        conceptTitle: "Projectile Motion",
        subjectSlug: "mechanics",
        subjectTitle: "Mechanics",
        subjectPath: "/concepts/subjects/mechanics",
        challengeId: "pm-ch-flat-far-shot",
        checkpointId: "motion-projectile-checkpoint",
        trackSlug: "mechanics-foundations",
        trackTitle: "Mechanics Foundations",
        masteryFrom: null,
        masteryTo: null,
      },
    ],
    timeline: [
      {
        recordedAt: "2026-04-03T12:00:00.000Z",
        touchedConceptCount: 4,
        completedConceptCount: 2,
        solidConceptCount: 2,
        shakyConceptCount: 1,
        practicedConceptCount: 1,
        checkpointClearCount: 2,
        solvedChallengeCount: 1,
        subjects: [],
      },
    ],
    stableSubjects: [
      {
        id: "stable:mechanics",
        subjectSlug: "mechanics",
        subjectTitle: "Mechanics",
        subjectPath: "/concepts/subjects/mechanics",
        statusLabel: "Stable",
        summary: "Mechanics is holding its stronger saved checks.",
        detail: "2 solid concepts | 2 checkpoint clears | 1 challenge solve",
      },
    ],
    needsWorkSubjects: [
      {
        id: "needs-work:oscillations-and-waves",
        subjectSlug: "oscillations-and-waves",
        subjectTitle: "Oscillations and Waves",
        subjectPath: "/concepts/subjects/oscillations-and-waves",
        statusLabel: "Needs work",
        summary: "1 concept only has one stronger saved check so far.",
        detail: "No solid gain yet | 0 checkpoint clears | 0 challenge solves",
      },
    ],
    stableConcepts: [
      {
        id: "stable:projectile-motion",
        conceptSlug: "projectile-motion",
        title: "Projectile Motion",
        href: "/concepts/projectile-motion",
        masteryState: "solid",
        statusLabel: "Stable",
        summary: "This concept is currently stable in saved progress.",
        detail: "Saved evidence now looks stable across stronger checks.",
        lastActivityAt: "2026-04-03T12:00:00.000Z",
      },
    ],
    needsWorkConcepts: [
      {
        id: "needs-work:wave-interference",
        conceptSlug: "wave-interference",
        title: "Wave Interference",
        href: "/concepts/wave-interference",
        masteryState: "practiced",
        statusLabel: "Building",
        summary: "Practice is saved, but stronger checks are still missing.",
        detail: "Practice activity is saved, but no finished checks are stored yet.",
        lastActivityAt: "2026-04-03T10:15:00.000Z",
      },
    ],
    methodologyNote:
      "This Supporter view stays bounded on purpose. It reuses the synced progress snapshot, then stores a compact cross-device checkpoint, challenge, and mastery history each time new saved progress lands. It does not invent hidden scoring or a separate analytics backend.",
  },
  strengths: [
    {
      topicSlug: "mechanics",
      title: "Mechanics",
      statusLabel: "Strongest",
      reasons: [
        "2 concepts already look solid.",
        "Solved challenges are saved on 1 concept.",
      ],
      href: "/concepts/topics/mechanics",
    },
  ],
  needsWork: [
    {
      topicSlug: "oscillations-and-waves",
      title: "Oscillations and Waves",
      statusLabel: "Needs work",
      reasons: [
        "2 concepts from this topic are already in the review queue.",
        "1 concept still has challenge work open without a saved solve.",
      ],
      href: "/concepts/topics/oscillations-and-waves",
    },
  ],
  adaptiveReview: {
    hasRecordedProgress: true,
    methodologyNote:
      "Supporter keeps this review layer higher-resolution on purpose: recent checkpoint, challenge, and entry-diagnostic outcomes are ranked first, then the existing review queue fills any remaining slots from the same canonical progress snapshot.",
    items: [
      {
        id: "wave-interference:challenge:challenge",
        concept: {
          slug: "wave-interference",
          title: "Wave Interference",
        },
        reasonKind: "challenge",
        reasonLabel: "Challenge follow-up",
        outcomeKind: "challenge",
        outcomeLabel: "Challenge outcome",
        whyChosen:
          "A challenge run is already started here, but no solve is saved yet. No finished quick test is saved yet.",
        supportReasons: [
          "1 challenge start is still open without a saved solve.",
        ],
        progressStatus: "practiced",
        masteryState: "practiced",
        lastActivityAt: "2026-04-03T10:15:00.000Z",
        primaryAction: {
          href: "/concepts/wave-interference?challenge=wi-ch-find-dark-band#challenge-mode",
          label: "Continue challenge",
          kind: "challenge",
          note: "Jump back into the saved challenge run that still does not have a solve.",
        },
        secondaryAction: {
          href: "/concepts/wave-interference",
          label: "Review concept",
          kind: "concept",
          note: "Practice activity is saved, but no finished checks are stored yet.",
        },
        trackContext: null,
        remediationSuggestions: [
          {
            id: "guided-collection-wave-interference",
            kind: "guided-collection",
            title: "Resume Waves evidence loop",
            note:
              "Waves evidence loop keeps Wave Interference inside a compact authored sequence that reuses the existing topic, track, and challenge surfaces.",
            action: {
              href: "/guided/waves-evidence-loop",
              label: "Resume Waves evidence loop",
              kind: "guided-collection",
              note:
                "Waves evidence loop keeps Wave Interference inside a compact authored sequence that reuses the existing topic, track, and challenge surfaces.",
            },
          },
        ],
      },
    ],
  },
  nextSteps: [
    {
      id: "continue:wave-interference",
      title: "Wave Interference",
      why: "This is still the clearest concept to resume from saved progress.",
      href: "/concepts/wave-interference",
      actionLabel: "Resume concept",
    },
  ],
  coverage: [
    {
      topicSlug: "mechanics",
      title: "Mechanics",
      activityLabel: "2 concepts started",
      detail: "2 concepts completed | 2 concepts solid",
      progressRatio: 1,
    },
  ],
  methodologyNote:
    "These analytics come from saved progress, synced checkpoint and mastery history, review-queue priorities, starter-track context, authored recommended-next links, and server-backed achievement counters. They do not use hidden scoring.",
};

describe("LearningAnalyticsPanel", () => {
  it("renders the premium analytics sections and seeded metrics cleanly", () => {
    render(<LearningAnalyticsPanel analytics={analytics} syncedProgressUnavailable />);

    const analyticsNav = screen.getByRole("navigation", { name: "Analytics sections" });
    expect(within(analyticsNav).getByRole("link", { name: "Analytics overview" })).toHaveAttribute(
      "href",
      "#analytics-overview",
    );
    expect(within(analyticsNav).getByRole("link", { name: "Usage and progress metrics" })).toHaveAttribute(
      "href",
      "#analytics-usage",
    );
    expect(within(analyticsNav).getByRole("link", { name: "Topic coverage" })).toHaveAttribute(
      "href",
      "#analytics-coverage",
    );

    expect(
      screen.getByRole("heading", {
        name: "A denser read on the progress you have already earned.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/synced progress is unavailable right now/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Saved activity, checkpoint momentum, and review pressure",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Checkpoint history and trend view",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Trajectory checkpoint")).toBeInTheDocument();
    expect(screen.getByText("Saved momentum over time")).toBeInTheDocument();
    expect(screen.getByText("Concept visits")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    const studyToolCard = screen.getByText("Study-tool touches").closest("article");
    expect(studyToolCard).not.toBeNull();
    expect(within(studyToolCard as HTMLElement).getByText("2")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Where your current saved work looks most stable",
      }),
    ).toBeInTheDocument();
    const strengthsSection = screen
      .getByRole("heading", {
        name: "Where your current saved work looks most stable",
      })
      .closest("section");
    expect(strengthsSection).not.toBeNull();
    expect(within(strengthsSection as HTMLElement).getByText("Mechanics")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Where the current saved pattern still needs pressure",
      }),
    ).toBeInTheDocument();
    const needsWorkSection = screen
      .getByRole("heading", {
        name: "Where the current saved pattern still needs pressure",
      })
      .closest("section");
    expect(needsWorkSection).not.toBeNull();
    expect(
      within(needsWorkSection as HTMLElement).getByText("Oscillations and Waves"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Use the saved pattern to choose the clearest next move",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Why these weaker concepts were picked right now",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/chosen because:/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue challenge" })).toHaveAttribute(
      "href",
      "/concepts/wave-interference?challenge=wi-ch-find-dark-band#challenge-mode",
    );
    expect(screen.getByRole("link", { name: /resume waves evidence loop/i })).toHaveAttribute(
      "href",
      "/guided/waves-evidence-loop",
    );
    expect(screen.getByRole("link", { name: "Resume concept" })).toHaveAttribute(
      "href",
      "/concepts/wave-interference",
    );
    expect(
      screen.getByRole("heading", {
        name: "Which topics your saved work has actually touched",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "What this page is actually reading",
      }),
    ).toBeInTheDocument();
    const methodologySection = screen
      .getByRole("heading", {
        name: "What this page is actually reading",
      })
      .closest("section");
    expect(methodologySection).not.toBeNull();
    expect(
      within(methodologySection as HTMLElement).getByText(analytics.methodologyNote),
    ).toBeInTheDocument();
  });

  it("localizes saved progress notes on zh-HK analytics surfaces", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(
      <LearningAnalyticsPanel
        analytics={{
          ...analytics,
          nextSteps: [
            {
              ...analytics.nextSteps[0],
              why: "No finished quick test, solved challenge, or completion mark is saved yet.",
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByText(/尚未儲存.*快速測驗.*完成標記/u),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "No finished quick test, solved challenge, or completion mark is saved yet.",
      ),
    ).not.toBeInTheDocument();
  });

  it("localizes checkpoint recovery reasons on zh-HK analytics surfaces", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    expect(
      getLocalizedProgressSupportReason(
        "不減溶質，讓過剩消失 is already started but still needs a clean finish.",
      ),
    ).toEqual({
      key: "supportReasons.checkpointStartedNeedsFinish",
      values: { title: "不減溶質，讓過剩消失" },
    });

    render(
      <LearningAnalyticsPanel
        analytics={{
          ...analytics,
          nextSteps: [
            {
              ...analytics.nextSteps[0],
              title: "不減溶質，讓過剩消失",
              why: "不減溶質，讓過剩消失 is already started but still needs a clean finish.",
            },
          ],
        }}
      />,
    );

    const pageText = document.body.textContent ?? "";
    expect(pageText).toContain("完整收尾");
    expect(
      screen.queryByText("不減溶質，讓過剩消失 is already started but still needs a clean finish."),
    ).not.toBeInTheDocument();
  });
});
