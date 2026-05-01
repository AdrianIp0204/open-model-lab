import { describe, expect, it } from "vitest";
import {
  buildStartLearningResumeSummary,
  normalizeProgressSnapshot,
} from "@/lib/progress";
import {
  getConceptSummaries,
  getStarterTracks,
  getSubjectDiscoverySummaries,
} from "@/lib/content";

describe("start-learning resume summary", () => {
  const concepts = getConceptSummaries();
  const starterTracks = getStarterTracks();
  const subjects = getSubjectDiscoverySummaries();

  it("anchors returning math activity on the unfinished concept first", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "graph-transformations": {
          conceptId: "concept-graph-transformations",
          slug: "graph-transformations",
          firstVisitedAt: "2026-04-04T08:00:00.000Z",
          lastVisitedAt: "2026-04-04T08:05:00.000Z",
          lastInteractedAt: "2026-04-04T08:05:00.000Z",
        },
      },
    });

    const summary = buildStartLearningResumeSummary(
      snapshot,
      concepts,
      starterTracks,
      subjects,
    );

    expect(summary.hasRecordedProgress).toBe(true);
    expect(summary.primaryConcept?.slug).toBe("graph-transformations");
    expect(summary.activeSubject?.slug).toBe("math");
    expect(summary.currentTrack?.track.slug).toBe("functions-and-change");
  });

  it("falls back to the authored current track when saved work is complete enough to remove a concept resume target", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "reaction-rate-collision-theory": {
          conceptId: "concept-reaction-rate-collision-theory",
          slug: "reaction-rate-collision-theory",
          manualCompletedAt: "2026-04-04T08:00:00.000Z",
          completedQuickTestAt: "2026-04-04T08:05:00.000Z",
        },
      },
    });

    const summary = buildStartLearningResumeSummary(
      snapshot,
      concepts,
      starterTracks,
      subjects,
    );

    expect(summary.primaryConcept).toBeNull();
    expect(summary.currentTrack?.track.slug).toBe("rates-and-equilibrium");
    expect(summary.currentTrack?.subject?.slug).toBe("chemistry");
    expect(summary.activeSubject?.slug).toBe("chemistry");
  });
});
