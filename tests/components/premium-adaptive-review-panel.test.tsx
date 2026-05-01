// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PremiumAdaptiveReviewPanel } from "@/components/progress/PremiumAdaptiveReviewPanel";
import type { PremiumAdaptiveReviewSummary } from "@/lib/progress";

const summary: PremiumAdaptiveReviewSummary = {
  hasRecordedProgress: true,
  methodologyNote:
    "Supporter keeps this review layer higher-resolution on purpose: recent checkpoint, challenge, and entry-diagnostic outcomes are ranked first, then the existing review queue fills any remaining slots from the same canonical progress snapshot.",
  items: [
    {
      id: "wave-interference:challenge",
      concept: {
        slug: "wave-interference",
        title: "Wave Interference",
      },
      reasonKind: "challenge",
      reasonLabel: "Challenge follow-up",
      outcomeKind: "challenge",
      outcomeLabel: "Challenge outcome",
      whyChosen: "A challenge run is already started here.",
      supportReasons: ["1 challenge start is still open without a saved solve."],
      progressStatus: "practiced",
      masteryState: "practiced",
      lastActivityAt: "2026-04-03T10:15:00.000Z",
      primaryAction: {
        href: "/concepts/wave-interference?challenge=wi-ch-find-dark-band#challenge-mode",
        label: "Continue challenge",
        kind: "challenge",
        note: "Jump back into the saved challenge run that still does not have a solve.",
      },
      secondaryAction: null,
      trackContext: null,
      remediationSuggestions: [],
    },
  ],
};

const summaryWithTrackCue: PremiumAdaptiveReviewSummary = {
  ...summary,
  items: [
    {
      ...summary.items[0],
      id: "projectile-motion:checkpoint",
      concept: {
        slug: "projectile-motion",
        title: "Projectile Motion",
      },
      reasonKind: "checkpoint",
      reasonLabel: "Checkpoint recovery",
      outcomeKind: "checkpoint",
      outcomeLabel: "Checkpoint outcome",
      whyChosen: "This checkpoint still needs a recovery pass.",
      primaryAction: {
        href: "/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode",
        label: "Retry checkpoint",
        kind: "checkpoint",
        note: "Reopen the checkpoint and finish the recovery pass.",
      },
      trackContext: {
        trackSlug: "motion-and-circular-motion",
        trackTitle: "Motion and Circular Motion",
        note: "Stay on the motion path while you recover this checkpoint.",
        focusKind: "checkpoint",
        focusLabel: "Checkpoint ready",
        action: {
          href: "/tracks/motion-and-circular-motion?mode=recap",
          label: "Open recap",
          kind: "track-recap",
          note: "Return to the track recap.",
        },
        isPrimary: true,
      },
    },
  ],
};

describe("PremiumAdaptiveReviewPanel", () => {
  it("localizes adaptive-review outcome labels in zh-HK", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(<PremiumAdaptiveReviewPanel summary={summary} />);

    expect(screen.getByText("挑戰結果")).toBeInTheDocument();
    expect(screen.queryByText("Challenge outcome")).not.toBeInTheDocument();
  });

  it("localizes track cue titles in zh-HK review notes", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(<PremiumAdaptiveReviewPanel summary={summaryWithTrackCue} />);

    expect(screen.getByText(/運動與圓周運動/)).toBeInTheDocument();
    expect(screen.queryByText(/Motion and Circular Motion/)).not.toBeInTheDocument();
  });
});
