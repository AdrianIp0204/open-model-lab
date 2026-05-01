import { describe, expect, it } from "vitest";
import { getConceptBySlug } from "@/lib/content";
import { resolveSupplementalLiveWorkedExample } from "@/lib/learning/supplementalWorkedExamples";

describe("optimization constraints worked examples", () => {
  it("resolves the current height-and-area walkthrough from the live rectangle state", () => {
    const concept = getConceptBySlug("optimization-maxima-minima-and-constraints");
    const example = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-height-and-area",
    );

    expect(example).toBeTruthy();

    const resolved = resolveSupplementalLiveWorkedExample(concept.slug, example!, {
      slug: concept.slug,
      params: {
        width: 3.2,
      },
      time: 0,
      timeSource: "live",
      activeGraphId: "area-vs-width",
      interactionMode: "explore",
      activeCompareTarget: null,
      activePresetId: "too-narrow",
    });

    expect(resolved).toBeTruthy();
    expect(resolved?.prompt).toContain("3.2");
    expect(resolved?.variableValues.height).toBe("8.8");
    expect(resolved?.resultContent).toContain("28.16");
    expect(resolved?.interpretation).toMatch(/below the best case|move it toward the peak/i);
  });

  it("resolves the current slope walkthrough at the peak square", () => {
    const concept = getConceptBySlug("optimization-maxima-minima-and-constraints");
    const example = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-area-slope",
    );

    expect(example).toBeTruthy();

    const resolved = resolveSupplementalLiveWorkedExample(concept.slug, example!, {
      slug: concept.slug,
      params: {
        width: 6,
      },
      time: 0,
      timeSource: "live",
      activeGraphId: "area-slope",
      interactionMode: "explore",
      activeCompareTarget: null,
      activePresetId: "best-square",
    });

    expect(resolved).toBeTruthy();
    expect(resolved?.prompt).toContain("6");
    expect(resolved?.steps[1]?.content).toContain("approximately zero");
    expect(resolved?.resultContent).toContain("0");
    expect(resolved?.interpretation).toMatch(/maximum|flat/i);
  });
});
