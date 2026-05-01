// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  type FreeTierProgressRecapSummary,
} from "@/lib/progress";
import { FreeTierProgressRecapPanel } from "@/components/progress/FreeTierProgressRecapPanel";

const populatedSummary: FreeTierProgressRecapSummary = {
  hasRecordedProgress: true,
  completedChallengeCount: 2,
  completedCheckpointCount: 1,
  recentCompletions: [],
  nextPrompts: [
    {
      id: "next-track",
      kind: "track",
      title: "Motion and Circular Motion",
      note: "Projectile Motion already has progress, but Vectors and Components is still the next guided step.",
      actionLabel: "Continue with Vectors",
      href: "/tracks/motion-and-circular-motion",
      subjectTitle: "Physics",
    },
  ],
  subjectMomentum: [],
};

describe("FreeTierProgressRecapPanel", () => {
  it("keeps dark prompt CTAs on the shared on-dark foreground contract", () => {
    render(
      <FreeTierProgressRecapPanel
        summary={populatedSummary}
        progressDateSource="local"
        progressSourceLabel="Saved local progress"
      />,
    );

    expect(
      screen.getByRole("link", { name: "Continue track" }),
    ).toHaveClass("bg-ink-950", "text-paper-strong");
  });

  it("keeps the empty-state browse CTA on the same dark foreground contract", () => {
    render(
      <FreeTierProgressRecapPanel
        summary={{
          ...populatedSummary,
          hasRecordedProgress: false,
          completedChallengeCount: 0,
          completedCheckpointCount: 0,
          nextPrompts: [],
        }}
        progressDateSource="local"
        progressSourceLabel="Saved local progress"
      />,
    );

    expect(
      screen.getByRole("link", { name: "Browse concepts" }),
    ).toHaveClass("bg-ink-950", "text-paper-strong");
  });
});
