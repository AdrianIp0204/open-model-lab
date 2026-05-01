// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PremiumCheckpointHistoryPanel } from "@/components/account/PremiumCheckpointHistoryPanel";
import type { PremiumCheckpointHistoryView } from "@/lib/progress";

const view: PremiumCheckpointHistoryView = {
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
      id: "event-1",
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
  needsWorkSubjects: [],
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
};

describe("PremiumCheckpointHistoryPanel", () => {
  it("renders the analytics history, timeline, and mastery sections", () => {
    render(<PremiumCheckpointHistoryPanel view={view} />);

    expect(
      screen.getByRole("heading", {
        name: "Checkpoint history and trend view",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Checkpoint clears")).toBeInTheDocument();
    expect(screen.getByText("Trajectory checkpoint")).toBeInTheDocument();
    expect(
      screen.getByText("The latest checkpoint, challenge, and mastery moments"),
    ).toBeInTheDocument();
    expect(screen.getByText("Mechanics is holding its stronger saved checks.")).toBeInTheDocument();
    expect(
      screen.getByText("Practice is saved, but stronger checks are still missing."),
    ).toBeInTheDocument();
  });
});
