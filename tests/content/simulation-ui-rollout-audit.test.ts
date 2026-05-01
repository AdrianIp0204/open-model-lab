import { describe, expect, it } from "vitest";
import { getConceptBySlug } from "@/lib/content";
import { buildSimulationUiRolloutReport } from "../../scripts/report-simulation-ui-rollout.mjs";
import { DISCLOSURE_REPRESENTATIVE_CASES } from "../helpers/concept-disclosure-fixtures";

describe("simulation UI rollout audit", () => {
  it("hard-fails the zero-backlog published concept disclosure state", () => {
    const report = buildSimulationUiRolloutReport();

    expect(report.publishedConceptCount).toBeGreaterThan(0);
    expect(report.remainingCount).toBe(0);
    expect(report.missingBothCount).toBe(0);
    expect(report.missingPrimaryControlsOnlyCount).toBe(0);
    expect(report.missingPrimaryGraphsOnlyCount).toBe(0);
    expect(report.partiallyConfiguredCount).toBe(0);
    expect(report.initialGraphAlignmentIssueCount).toBe(0);
    expect(report.initialGraphAlignmentIssues).toHaveLength(0);
    expect(report.effectiveEnDisclosureMismatchCount).toBe(0);
    expect(report.effectiveEnDisclosureMismatches).toHaveLength(0);
    expect(report.effectiveEnInitialGraphAlignmentIssueCount).toBe(0);
    expect(report.effectiveEnInitialGraphAlignmentIssues).toHaveLength(0);
    expect(report.remaining).toEqual([]);
    expect(report.fullyConfiguredCount).toBe(report.publishedConceptCount);
    expect(report.effectiveEnFullyConfiguredCount).toBe(report.publishedConceptCount);
    expect(report.alignedInitialGraphCount).toBe(report.publishedConceptCount);
    expect(report.effectiveEnAlignedInitialGraphCount).toBe(report.publishedConceptCount);
  });

  it("keeps the representative disclosure sample aligned with authored page config", () => {
    for (const fixture of DISCLOSURE_REPRESENTATIVE_CASES) {
      expect(getConceptBySlug(fixture.slug).simulation.ui).toMatchObject({
        initialGraphId: fixture.activeGraphId,
        primaryGraphIds: fixture.primaryGraphIds,
        primaryControlIds: fixture.primaryControlIds,
        primaryPresetIds: fixture.primaryPresetIds,
      });
    }
  });
});
