import { describe, expect, it } from "vitest";
import { normalizeProgressSnapshot } from "@/lib/progress";
import { getConceptBySlug } from "@/lib/content";
import {
  getPublishedConceptTestCatalog,
  getPublishedPackTestCatalog,
  getPublishedTopicTestCatalog,
} from "@/lib/test-hub";
import {
  buildConceptStandaloneFollowUpActions,
  buildPackStandaloneFollowUpActions,
  buildTopicStandaloneFollowUpActions,
} from "@/lib/test-hub/standalone-follow-up";

describe("standalone assessment follow-up actions", () => {
  it("returns raw concept follow-up links for the locale-aware Link", () => {
    const snapshot = normalizeProgressSnapshot({ version: 1, concepts: {} });
    const concept = getConceptBySlug("basic-circuits");
    const entry = getPublishedConceptTestCatalog().entries.find(
      (candidate) => candidate.conceptSlug === concept.slug,
    );

    expect(entry).toBeTruthy();

    const actions = buildConceptStandaloneFollowUpActions({
      concept,
      entry: entry!,
      snapshot,
      locale: "zh-HK",
      labels: {
        nextTest: "Next test",
        reviewConcept: "Review concept",
        backToHub: "Back to Test Hub",
        relatedConcept: (title) => `Related concept: ${title}`,
        topicMilestone: (title) => `Topic milestone: ${title}`,
        packFollowOn: (title) => `Follow-on pack: ${title}`,
      },
    });

    expect(actions.every((action) => !action.href.startsWith("/zh-HK/"))).toBe(true);
    expect(actions.some((action) => action.href === "/tests")).toBe(true);
    expect(actions.some((action) => action.href === "/concepts/basic-circuits#interactive-lab")).toBe(true);
  });

  it("returns raw topic follow-up links for the locale-aware Link", () => {
    const snapshot = normalizeProgressSnapshot({ version: 1, concepts: {} });
    const entry = getPublishedTopicTestCatalog().entries.find(
      (candidate) => candidate.topicSlug === "circuits",
    );

    expect(entry).toBeTruthy();

    const actions = buildTopicStandaloneFollowUpActions({
      entry: entry!,
      snapshot,
      locale: "zh-HK",
      labels: {
        reviewTopic: "Review topic",
        reviewIncludedConcepts: "Review included concepts",
        backToHub: "Back to Test Hub",
        nextTopicTest: "Next topic test",
        followOnPack: (title) => `Follow-on pack: ${title}`,
      },
    });

    expect(actions.every((action) => !action.href.startsWith("/zh-HK/"))).toBe(true);
    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: "/tests/topics/circuits#topic-test-included-concepts" }),
        expect.objectContaining({ href: "/concepts/topics/circuits" }),
        expect.objectContaining({ href: "/tests" }),
      ]),
    );
  });

  it("returns raw pack follow-up links for the locale-aware Link", () => {
    const snapshot = normalizeProgressSnapshot({ version: 1, concepts: {} });
    const entry = getPublishedPackTestCatalog().entries.find(
      (candidate) => candidate.packSlug === "physics-connected-models",
    );

    expect(entry).toBeTruthy();

    const actions = buildPackStandaloneFollowUpActions({
      entry: entry!,
      snapshot,
      locale: "zh-HK",
      labels: {
        reviewSubject: "Review subject",
        reviewIncludedTopics: "Review included topics",
        backToHub: "Back to Test Hub",
        nextPack: "Next pack",
      },
    });

    expect(actions.every((action) => !action.href.startsWith("/zh-HK/"))).toBe(true);
    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: "/tests/packs/physics-connected-models#pack-test-included-topics",
        }),
        expect.objectContaining({ href: "/concepts/subjects/physics" }),
        expect.objectContaining({ href: "/tests" }),
      ]),
    );
  });
});
