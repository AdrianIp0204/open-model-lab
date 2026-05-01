// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TestHubPage } from "@/components/tests/TestHubPage";
import { createEmptyProgressSnapshot } from "@/lib/progress/model";
import type {
  ConceptTestCatalogEntry,
  PackTestCatalogEntry,
  TopicTestCatalogEntry,
} from "@/lib/test-hub";

const useProgressSnapshotMock = vi.fn();
const useProgressSnapshotReadyMock = vi.fn();

vi.mock("@/lib/progress", async () => {
  const actual = await vi.importActual<typeof import("@/lib/progress")>("@/lib/progress");

  return {
    ...actual,
    useProgressSnapshot: () => useProgressSnapshotMock(),
    useProgressSnapshotReady: () => useProgressSnapshotReadyMock(),
  };
});

const packEntries: PackTestCatalogEntry[] = [
  {
    kind: "pack",
    id: "pack-test:physics-connected-models",
    order: 0,
    packSlug: "physics-connected-models",
    subjectSlug: "physics",
    subjectTitle: "Physics",
    title: "Physics Connections Pack",
    summary: "Connect motion, oscillation, wave behavior, and orbital reasoning across one compact physics assessment.",
    questionCount: 16,
    includedTopicSlugs: ["mechanics", "oscillations", "waves", "gravity-and-orbits"],
    includedTopicTitles: ["Mechanics", "Oscillations", "Waves", "Gravity and Orbits"],
    includedTopicCount: 4,
    includedConceptSlugs: ["vectors-components", "simple-harmonic-motion"],
    includedConceptCount: 2,
    bridgeQuestionCount: 2,
    testHref: "/tests/packs/physics-connected-models",
    reviewHref: "/concepts/subjects/physics",
  },
];

const topicEntries: TopicTestCatalogEntry[] = [
  {
    kind: "topic",
    id: "topic-test:oscillations",
    order: 0,
    topicSlug: "oscillations",
    title: "Oscillations",
    summary: "Check the main oscillator ideas across the topic branch.",
    subject: "Physics",
    questionCount: 10,
    includedConceptSlugs: ["simple-harmonic-motion", "oscillation-energy", "damping-resonance"],
    includedConceptCount: 3,
    authoredQuestionCount: 1,
    bridgeQuestionCount: 1,
    testHref: "/tests/topics/oscillations",
    reviewHref: "/concepts/topics/oscillations",
  },
];

const conceptEntries: ConceptTestCatalogEntry[] = [
  {
    kind: "concept",
    id: "concept-test:simple-harmonic-motion",
    order: 0,
    conceptId: "concept-shm",
    conceptSlug: "simple-harmonic-motion",
    title: "Simple Harmonic Motion",
    shortTitle: "SHM",
    summary: "Watch one oscillator repeat cleanly.",
    subject: "Physics",
    topic: "Oscillations",
    difficulty: "Intro",
    questionCount: 5,
    testHref: "/tests/concepts/simple-harmonic-motion",
    reviewHref: "/concepts/simple-harmonic-motion#interactive-lab",
  },
];

describe("TestHubPage progress pending", () => {
  afterEach(() => {
    globalThis.__TEST_LOCALE__ = undefined;
    useProgressSnapshotMock.mockReset();
    useProgressSnapshotReadyMock.mockReset();
  });

  it("shows a neutral pending state until local progress is hydrated, even when a synced snapshot exists", () => {
    useProgressSnapshotMock.mockReturnValue(createEmptyProgressSnapshot());
    useProgressSnapshotReadyMock.mockReturnValue(false);

    render(
      <TestHubPage
        packEntries={packEntries}
        topicEntries={topicEntries}
        conceptEntries={conceptEntries}
        initialSyncedSnapshot={{
          version: 1,
          concepts: {
            "simple-harmonic-motion": {
              slug: "simple-harmonic-motion",
              completedQuickTestAt: "2026-04-15T10:00:00.000Z",
              quickTestAttemptCount: 1,
              quickTestLastIncorrectCount: 0,
            },
          },
          topicTests: {
            oscillations: {
              slug: "oscillations",
              completedAt: "2026-04-15T10:00:00.000Z",
              attemptCount: 1,
              lastIncorrectCount: 0,
              lastQuestionCount: 10,
            },
          },
          packTests: {
            "physics-connected-models": {
              slug: "physics-connected-models",
              completedAt: "2026-04-15T10:00:00.000Z",
              attemptCount: 1,
              lastIncorrectCount: 0,
              lastQuestionCount: 16,
            },
          },
        }}
      />,
    );

    expect(screen.getByTestId("test-hub-progress-pending")).toHaveTextContent(
      /checking saved progress for this test/i,
    );
    expect(screen.getByTestId("test-hub-suggestions-pending")).toHaveTextContent(
      /checking recent study and test activity before suggesting what to do next/i,
    );
    expect(screen.getByTestId("test-hub-total-count")).toHaveTextContent("—");
    expect(screen.getByTestId("test-hub-completed-count")).toHaveTextContent("—");
    expect(screen.getByTestId("test-hub-clean-count")).toHaveTextContent("—");
    expect(screen.getByTestId("test-hub-remaining-count")).toHaveTextContent("—");

    const packCard = screen.getByTestId("test-hub-card-pack-physics-connected-models");
    const topicCard = screen.getByTestId("test-hub-card-topic-oscillations");
    const conceptCard = screen.getByTestId("test-hub-card-concept-simple-harmonic-motion");

    expect(within(packCard).getByText("Checking progress")).toBeInTheDocument();
    expect(within(topicCard).getByText("Checking progress")).toBeInTheDocument();
    expect(within(conceptCard).getByText("Checking progress")).toBeInTheDocument();
    expect(within(packCard).queryByText("Completed")).not.toBeInTheDocument();
    expect(within(topicCard).queryByText("Completed")).not.toBeInTheDocument();
    expect(within(conceptCard).queryByText("Completed")).not.toBeInTheDocument();

    expect(
      within(packCard).getByRole("link", { name: "Open pack" }),
    ).toHaveAttribute("href", "/tests/packs/physics-connected-models");
    expect(
      within(topicCard).getByRole("link", { name: "Open topic test" }),
    ).toHaveAttribute("href", "/tests/topics/oscillations");
    expect(
      within(conceptCard).getByRole("link", { name: "Open concept test" }),
    ).toHaveAttribute("href", "/tests/concepts/simple-harmonic-motion");
    expect(
      screen.queryByTestId("test-hub-suggestion-concept-simple-harmonic-motion"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("test-hub-guided-track-oscillations")).toBeInTheDocument();
    expect(
      screen.getByTestId("test-hub-guided-track-next-oscillations"),
    ).toHaveAttribute("href", "/concepts/topics/oscillations");
  });
});
