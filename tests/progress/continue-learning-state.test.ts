import { describe, expect, it } from "vitest";
import { getConceptBySlug, getConceptSummaries, getStarterTrackBySlug } from "@/lib/content";
import { localizeConceptSummaryDisplay } from "@/lib/i18n/content";
import {
  getNextRecommendedConcept,
  normalizeProgressSnapshot,
  selectCurrentTrack,
} from "@/lib/progress";

describe("current track selection", () => {
  it("can keep the shared vectors progress anchored to the math bridge when that path has the stronger in-sequence coverage", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "vectors-in-2d": {
          conceptId: "concept-vectors-in-2d",
          slug: "vectors-in-2d",
          manualCompletedAt: "2026-04-02T09:00:00.000Z",
          completedChallenges: {
            "v2d-ch-near-zero-result": "2026-04-02T09:05:00.000Z",
          },
        },
        "vectors-components": {
          conceptId: "concept-vectors-components",
          slug: "vectors-components",
          manualCompletedAt: "2026-04-02T10:00:00.000Z",
          lastVisitedAt: "2026-04-02T10:05:00.000Z",
        },
      },
    });

    const currentTrack = selectCurrentTrack(snapshot, [
      getStarterTrackBySlug("motion-and-circular-motion"),
      getStarterTrackBySlug("vectors-and-motion-bridge"),
    ]);

    expect(currentTrack?.track.slug).toBe("vectors-and-motion-bridge");
  });

  it("localizes zh-HK recommended-next notes from localized concept overlays", () => {
    const localizedConcepts = getConceptSummaries().map((concept) =>
      localizeConceptSummaryDisplay(concept, "zh-HK"),
    );
    const conceptsBySlug = new Map(localizedConcepts.map((concept) => [concept.slug, concept]));
    const currentConceptSummary = conceptsBySlug.get("simple-harmonic-motion");
    const currentConcept = currentConceptSummary
      ? {
          ...currentConceptSummary,
          recommendedNext: getConceptBySlug("simple-harmonic-motion").recommendedNext,
        }
      : null;
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "simple-harmonic-motion": {
          conceptId: currentConceptSummary?.id ?? "concept-simple-harmonic-motion",
          slug: "simple-harmonic-motion",
          lastVisitedAt: "2026-04-02T09:00:00.000Z",
        },
      },
    });

    const recommendation = getNextRecommendedConcept(
      currentConcept ?? null,
      conceptsBySlug,
      snapshot,
      "zh-HK",
    );

    expect(recommendation?.concept.slug).toBe("oscillation-energy");
    expect(recommendation?.note).toBe("直接延伸到能量交換，來自「簡諧運動」。");
  });
});
