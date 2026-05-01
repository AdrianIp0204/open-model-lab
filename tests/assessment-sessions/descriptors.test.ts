import { describe, expect, it } from "vitest";
import {
  buildConceptAssessmentSessionDescriptor,
  buildConceptEntryAssessmentSessionDescriptor,
  buildPackAssessmentSessionDescriptor,
  buildTopicAssessmentSessionDescriptor,
} from "@/lib/assessment-sessions";
import { getConceptBySlug } from "@/lib/content";
import {
  getPublishedConceptTestCatalog,
  getPublishedPackTestCatalog,
  getPublishedTopicTestCatalog,
} from "@/lib/test-hub";

describe("assessment session descriptors", () => {
  it("keeps concept route and hub descriptors aligned", () => {
    const concept = getConceptBySlug("escape-velocity");
    const conceptEntry = getPublishedConceptTestCatalog().entries.find(
      (candidate) => candidate.conceptSlug === concept.slug,
    )!;

    expect(buildConceptEntryAssessmentSessionDescriptor(conceptEntry, "en")).toEqual(
      buildConceptAssessmentSessionDescriptor(concept, "en"),
    );
  });

  it("keeps topic descriptors stable for hub/runtime use", () => {
    const entry = getPublishedTopicTestCatalog().entries.find(
      (candidate) => candidate.topicSlug === "oscillations",
    )!;

    expect(buildTopicAssessmentSessionDescriptor(entry, "en")).toMatchObject({
      kind: "topic",
      assessmentId: "oscillations",
      routeHref: "/tests/topics/oscillations",
    });
  });

  it("keeps pack descriptors stable for hub/runtime use", () => {
    const entry = getPublishedPackTestCatalog().entries.find(
      (candidate) => candidate.packSlug === "physics-connected-models",
    )!;

    expect(buildPackAssessmentSessionDescriptor(entry, "en")).toMatchObject({
      kind: "pack",
      assessmentId: "physics-connected-models",
      routeHref: "/tests/packs/physics-connected-models",
    });
  });

  it("uses the standalone concept-test route as the canonical concept assessment identity", () => {
    const concept = getConceptBySlug("escape-velocity");

    expect(buildConceptAssessmentSessionDescriptor(concept, "en")).toMatchObject({
      kind: "concept",
      assessmentId: "escape-velocity",
      routeHref: "/tests/concepts/escape-velocity",
    });
  });
});
