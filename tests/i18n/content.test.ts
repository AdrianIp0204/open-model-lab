// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  getConceptBySlug,
  getGuidedCollections,
  getRecommendedGoalPaths,
  getStarterTracks,
} from "@/lib/content";
import {
  getConceptDisplayHighlights,
  getConceptDisplayRecommendedNextReasonLabel,
  getConceptDisplayShortTitle,
  getConceptDisplaySummary,
  getConceptDisplayTitle,
  getGoalPathDisplayTitle,
  getGuidedCollectionDisplayTitle,
  getStarterTrackDisplayTitle,
  getSubjectDisplayTitleFromValue,
  getTopicDisplayTitleFromValue,
} from "@/lib/i18n/content";
import { localizeConceptContent } from "@/lib/i18n/concept-content";

describe("localized content overlays", () => {
  it("overlays translated concept display fields while preserving canonical ids", () => {
    const concept = getConceptBySlug("vectors-components");
    const localizedConcept = localizeConceptContent(concept, "zh-HK");

    expect(localizedConcept.slug).toBe(concept.slug);
    expect(localizedConcept.id).toBe(concept.id);
    expect(localizedConcept.title).not.toBe(concept.title);
    expect(getConceptDisplayTitle(concept, "zh-HK")).toBe(localizedConcept.title);
    expect(getConceptDisplayShortTitle(concept, "zh-HK")).toBe(localizedConcept.shortTitle);
    expect(getConceptDisplaySummary(concept, "zh-HK")).toBe(localizedConcept.summary);
    expect(getConceptDisplayHighlights(concept, "zh-HK")).toEqual(localizedConcept.highlights);
  });

  it("broadly localizes the most visible public zh-HK concept cards and authored fields", () => {
    for (const slug of [
      "vectors-components",
      "projectile-motion",
      "uniform-circular-motion",
      "simple-harmonic-motion",
      "graph-transformations",
      "rational-functions-asymptotes-and-behavior",
      "exponential-change-growth-decay-logarithms",
      "complex-numbers-on-the-plane",
    ]) {
      const concept = getConceptBySlug(slug);
      const localizedConcept = localizeConceptContent(concept, "zh-HK");

      expect(localizedConcept.title).not.toBe(concept.title);
      expect(localizedConcept.summary).not.toBe(concept.summary);
      expect(localizedConcept.highlights).not.toEqual(concept.highlights);
      expect(localizedConcept.topic).not.toBe(concept.topic);
      expect(localizedConcept.subtopic).not.toBe(concept.subtopic);
      expect(localizedConcept.recommendedNext?.[0]?.reasonLabel).not.toBe(
        concept.recommendedNext?.[0]?.reasonLabel,
      );
    }
  });

  it("falls back to english when the active locale has no concept overlay bundle", () => {
    const concept = getConceptBySlug("derivative-as-slope-local-rate-of-change");
    const localizedConcept = localizeConceptContent(concept, "en");

    expect(localizedConcept.title).toBe(concept.title);
    expect(localizedConcept.summary).toBe(concept.summary);
    expect(localizedConcept.highlights).toEqual(concept.highlights);
  });

  it("resolves translated catalog shard labels from canonical values and preserves unknown inputs", () => {
    expect(getSubjectDisplayTitleFromValue("Physics", "zh-HK")).toBe("物理");
    expect(getSubjectDisplayTitleFromValue("No matching subject", "zh-HK")).toBe(
      "No matching subject",
    );

    expect(getTopicDisplayTitleFromValue("Mechanics", "zh-HK")).toBe("力學");
    expect(getTopicDisplayTitleFromValue("No matching topic", "zh-HK")).toBe(
      "No matching topic",
    );
  });

  it("loads the sharded starter-track, guided-collection, and goal-path overlays", () => {
    const starterTrack = getStarterTracks().find(
      (candidate) => candidate.slug === "motion-and-circular-motion",
    );
    const guidedCollection = getGuidedCollections().find(
      (candidate) => candidate.slug === "vectors-to-mechanics-bridge",
    );
    const goalPath = getRecommendedGoalPaths().find(
      (candidate) => candidate.slug === "algorithms-and-search",
    );

    if (!starterTrack || !guidedCollection || !goalPath) {
      throw new Error("Expected translated catalog fixtures to exist in the canonical catalogs.");
    }

    expect(getStarterTrackDisplayTitle(starterTrack, "zh-HK")).toBe("運動與圓周運動");
    expect(getGuidedCollectionDisplayTitle(guidedCollection, "zh-HK")).toBe("向量到力學橋接");
    expect(getGoalPathDisplayTitle(goalPath, "zh-HK")).toBe(
      "用演算法與搜尋建立電腦科學直覺",
    );
  });

  it("keeps recommended-next reason labels aligned with the locale shard when the slug matches", () => {
    const concept = getConceptBySlug("simple-harmonic-motion");
    const recommendation = concept.recommendedNext?.[0];

    if (!recommendation) {
      throw new Error("Expected simple-harmonic-motion to expose at least one recommendation.");
    }

    expect(
      getConceptDisplayRecommendedNextReasonLabel(concept, recommendation, "zh-HK"),
    ).toBe(
      localizeConceptContent(concept, "zh-HK").recommendedNext?.find(
        (candidate) => candidate?.slug === recommendation.slug,
      )?.reasonLabel,
    );

    expect(
      getConceptDisplayRecommendedNextReasonLabel(
        concept,
        {
          slug: "not-a-real-recommendation",
          reasonLabel: "English fallback",
        },
        "zh-HK",
      ),
    ).toBe("English fallback");
  });
});
