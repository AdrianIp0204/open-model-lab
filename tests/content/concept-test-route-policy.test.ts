import { describe, expect, it } from "vitest";
import {
  buildConceptQuickTestHref,
  buildConceptReviewHref,
  buildConceptTestHref,
  getPublishedConceptTestCatalog,
} from "@/lib/test-hub";
import { buildConceptAssessmentSessionDescriptor } from "@/lib/assessment-sessions";
import { getConceptBySlug } from "@/lib/content";

describe("concept test route policy", () => {
  it("keeps test-first, learning-first, and review-first concept routes distinct", () => {
    expect(buildConceptTestHref("basic-circuits")).toBe("/tests/concepts/basic-circuits");
    expect(buildConceptQuickTestHref("basic-circuits")).toBe("/concepts/basic-circuits#quick-test");
    expect(buildConceptReviewHref("basic-circuits")).toBe("/concepts/basic-circuits#interactive-lab");
  });

  it("uses the standalone route for published concept test catalog entries", () => {
    const entry = getPublishedConceptTestCatalog().entries.find(
      (candidate) => candidate.conceptSlug === "basic-circuits",
    )!;

    expect(entry.testHref).toBe(buildConceptTestHref(entry.conceptSlug));
    expect(entry.reviewHref).toBe(buildConceptReviewHref(entry.conceptSlug));
  });

  it("keeps the shared concept assessment identity keyed to the standalone route", () => {
    const concept = getConceptBySlug("basic-circuits");
    const descriptor = buildConceptAssessmentSessionDescriptor(concept, "en");

    expect(descriptor.routeHref).toBe(buildConceptTestHref(concept.slug));
    expect(descriptor.routeHref).not.toBe(buildConceptQuickTestHref(concept.slug));
  });
});
