import { describe, expect, it } from "vitest";
import { getConceptBySlug } from "@/lib/content";
import { resolveLiveWorkedExample } from "@/lib/learning/liveWorkedExamples";

describe("limits and continuity worked examples", () => {
  it("resolves the one-sided example against the live removable-hole bench state", () => {
    const concept = getConceptBySlug("limits-and-continuity-approaching-a-value");
    const oneSidedExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "compare-the-one-sided-values",
    );

    expect(oneSidedExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        caseIndex: 1,
        approachDistance: 0.12,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "one-sided-approach",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "removable-hole",
    };

    const resolved = resolveLiveWorkedExample(concept.slug, oneSidedExample!, state);

    expect(resolved.prompt).toContain("Removable hole");
    expect(resolved.resultContent).toContain("0.86");
    expect(resolved.resultContent).toContain("0.94");
    expect(resolved.steps[2]?.content).toMatch(/same finite height/i);
    expect(resolved.interpretation).toMatch(/finite two-sided limit/i);
  });

  it("keeps the live continuity example explicit for jump and blow-up behavior", () => {
    const concept = getConceptBySlug("limits-and-continuity-approaching-a-value");
    const continuityExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "limit-versus-the-actual-point",
    );

    expect(continuityExample).toBeTruthy();

    const jumpResolved = resolveLiveWorkedExample(concept.slug, continuityExample!, {
      slug: concept.slug,
      params: {
        caseIndex: 2,
        approachDistance: 0.18,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "one-sided-approach",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "jump-split",
    });
    const blowUpResolved = resolveLiveWorkedExample(concept.slug, continuityExample!, {
      slug: concept.slug,
      params: {
        caseIndex: 3,
        approachDistance: 0.1,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "one-sided-approach",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "vertical-blow-up",
    });

    expect(jumpResolved.resultContent).toContain("\\text{no single finite limit}");
    expect(jumpResolved.resultContent).toContain("0.15");
    expect(jumpResolved.interpretation).toMatch(/no single two-sided limit/i);

    expect(blowUpResolved.resultContent).toContain("\\text{no finite two-sided limit}");
    expect(blowUpResolved.resultContent).toContain("\\text{undefined}");
    expect(blowUpResolved.interpretation).toMatch(/does not settle toward a finite height/i);
  });
});
