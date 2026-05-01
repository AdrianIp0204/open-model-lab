import { describe, expect, it } from "vitest";
import { getConceptBySlug } from "@/lib/content";
import { localizeConceptContent } from "@/lib/i18n/concept-content";
import { resolveSimulationUiHints } from "@/lib/physics";
import { buildSimulationUiRolloutReport } from "../../scripts/report-simulation-ui-rollout.mjs";
import {
  DISCLOSURE_REPRESENTATIVE_CASES,
  getRepresentativeCasesByCategory,
} from "../helpers/concept-disclosure-fixtures";

describe("resolveSimulationUiHints", () => {
  it("keeps the representative configured pages aligned with their intended first-load bench surface", () => {
    for (const expectation of DISCLOSURE_REPRESENTATIVE_CASES) {
      const concept = getConceptBySlug(expectation.slug);
      const resolved = resolveSimulationUiHints({
        ...concept.simulation,
        graphs: concept.graphs,
      });

      expect(resolved.initialGraphId).toBe(expectation.activeGraphId);
      expect(resolved.primaryGraphIds).toEqual(expectation.primaryGraphIds);
      expect(resolved.primaryControlIds).toEqual(expectation.primaryControlIds);
      expect(resolved.primaryPresetIds).toEqual(expectation.primaryPresetIds);

      const starterSource =
        resolved.starterExploreTasks[0] ??
        concept.noticePrompts.items[0]?.text ??
        "";

      expect(starterSource).toContain(expectation.firstTaskSubstring);
    }
  });

  it("hard-fails the published zero-backlog state while still supporting a fallback branch for future regressions", () => {
    const report = buildSimulationUiRolloutReport();
    const fallbackSlug = report.remaining[0]?.slug;

    if (!fallbackSlug) {
      expect(report.remainingCount).toBe(0);
      expect(report.missingBothCount).toBe(0);
      expect(report.fullyConfiguredCount).toBe(report.publishedConceptCount);
      expect(report.effectiveEnFullyConfiguredCount).toBe(report.publishedConceptCount);
      return;
    }

    const concept = localizeConceptContent(getConceptBySlug(fallbackSlug), "en");
    const resolved = resolveSimulationUiHints({
      ...concept.simulation,
      graphs: concept.graphs,
    });

    expect(resolved.initialGraphId).toBe(concept.graphs[0]?.id);
    expect(resolved.primaryGraphIds).toBeUndefined();
    expect(resolved.primaryControlIds).toBeUndefined();
    expect(resolved.primaryPresetIds).toBeUndefined();
    expect(resolved.starterExploreTasks).toEqual([]);
    expect(resolved.invalidInitialGraphId).toBeNull();
    expect(resolved.invalidPrimaryGraphIds).toEqual([]);
    expect(resolved.invalidPrimaryControlIds).toEqual([]);
    expect(resolved.invalidPrimaryPresetIds).toEqual([]);
  });

  it("preserves authored simulation.ui hints through optimized English overlays on representative overlay-backed pages", () => {
    const representativeCategories = getRepresentativeCasesByCategory();
    const expectations = [
      representativeCategories["single-control-single-graph"],
      representativeCategories["dual-control"],
      representativeCategories["dual-graph"],
      representativeCategories["math-guided-start"],
    ];

    for (const expectation of expectations) {
      const resolvedContent = localizeConceptContent(getConceptBySlug(expectation.slug), "en");
      const resolvedUi = resolveSimulationUiHints({
        ...resolvedContent.simulation,
        graphs: resolvedContent.graphs,
      });

      expect(resolvedUi.initialGraphId).toBe(expectation.activeGraphId);
      expect(resolvedUi.primaryGraphIds).toEqual(expectation.primaryGraphIds);
      expect(resolvedUi.primaryControlIds).toEqual(expectation.primaryControlIds);
    }
  });

  it("preserves authored order, de-duplicates duplicates, and reports invalid ids safely", () => {
    const concept = getConceptBySlug("simple-harmonic-motion");
    const resolved = resolveSimulationUiHints({
      ...concept.simulation,
      ui: {
        initialGraphId: "not-a-graph",
        primaryGraphIds: ["velocity", "velocity", "not-a-graph", "energy"],
        primaryControlIds: ["omega", "amplitude", "omega", "not-a-control", "phase"],
        primaryPresetIds: ["phase-shifted", "phase-shifted", "not-a-preset", "calm-start"],
        starterExploreTasks: ["First", "Second"],
      },
      graphs: concept.graphs,
    });

    expect(resolved.initialGraphId).toBe(concept.graphs[0]?.id);
    expect(resolved.primaryGraphIds).toEqual(["velocity", "energy"]);
    expect(resolved.primaryControlIds).toEqual(["omega", "amplitude", "phase"]);
    expect(resolved.primaryPresetIds).toEqual(["phase-shifted", "calm-start"]);
    expect(resolved.starterExploreTasks).toEqual(["First", "Second"]);
    expect(resolved.invalidInitialGraphId).toBe("not-a-graph");
    expect(resolved.invalidPrimaryGraphIds).toEqual(["not-a-graph"]);
    expect(resolved.invalidPrimaryControlIds).toEqual(["not-a-control"]);
    expect(resolved.invalidPrimaryPresetIds).toEqual(["not-a-preset"]);
  });

  it("keeps the simplified overlay defaults aligned with the authored first-load state", () => {
    expect(getConceptBySlug("simple-harmonic-motion").simulation.defaults.motionTrail).toBe(false);
    expect(getConceptBySlug("simple-harmonic-motion").simulation.defaults.velocityVector).toBe(false);

    expect(
      getConceptBySlug("derivative-as-slope-local-rate-of-change").simulation.defaults.deltaX,
    ).toBe(1.1);
    expect(
      getConceptBySlug("derivative-as-slope-local-rate-of-change").simulation.defaults.slopeGuide,
    ).toBe(false);

    expect(
      getConceptBySlug("dynamic-equilibrium-le-chateliers-principle").simulation.defaults.balanceBars,
    ).toBe(false);

    expect(
      getConceptBySlug("depth-first-search-and-backtracking-paths").simulation.defaults.adjacencyCue,
    ).toBe(false);
  });
});
