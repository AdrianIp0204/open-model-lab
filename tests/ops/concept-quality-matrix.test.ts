// @vitest-environment node

import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

async function importQualityMatrixModule() {
  return import(
    pathToFileURL(path.resolve(process.cwd(), "scripts/concept-quality-matrix-core.mjs")).href
  );
}

function makeViewportAudit(overrides: Record<string, unknown> = {}) {
  return {
    viewport: { name: "phone-390x844", width: 390, height: 844 },
    route: { attempted: true, ok: true, status: 200 },
    h1: { visible: true, text: "Simple Harmonic Motion", matchesTitle: true },
    positions: {
      scene: { visible: true, y: 180 },
      cue: { visible: true, y: 120 },
      controls: { visible: true, y: 500 },
      graphs: { visible: true, y: 640 },
      lessonRail: { visible: true, y: 220 },
    },
    metrics: {
      horizontalOverflowPx: 0,
      visibleClippingCount: 0,
      tinyTouchTargetCount: 0,
      localizedLeakCount: 0,
      visibleSupportSurfaceCount: 2,
    },
    interaction: { status: "passed" },
    issues: [],
    ...overrides,
  };
}

describe("concept quality matrix classifier", () => {
  it("marks a clean viewport audit as passed", async () => {
    const { buildConceptQualityReport } = await importQualityMatrixModule();
    const report = buildConceptQualityReport({
      generatedAt: "fixture",
      command: "fixture",
      catalogCount: 1,
      viewports: [{ name: "phone-390x844", width: 390, height: 844 }],
      rows: [
        {
          slug: "simple-harmonic-motion",
          title: "Simple Harmonic Motion",
          viewportAudits: [makeViewportAudit()],
        },
      ],
    });

    expect(report.summary.byStatus.passed).toBe(1);
    expect(report.rows[0].reviewStatus).toBe("passed");
  });

  it("fails the strict gate on a seeded shared-layout regression", async () => {
    const { assertConceptQualityGate, buildConceptQualityReport } =
      await importQualityMatrixModule();
    const report = buildConceptQualityReport({
      generatedAt: "fixture",
      command: "fixture",
      catalogCount: 1,
      viewports: [{ name: "phone-390x844", width: 390, height: 844 }],
      rows: [
        {
          slug: "seeded-overflow",
          title: "Seeded Overflow",
          viewportAudits: [
            makeViewportAudit({
              metrics: {
                horizontalOverflowPx: 80,
                visibleClippingCount: 1,
                tinyTouchTargetCount: 1,
                localizedLeakCount: 0,
                visibleSupportSurfaceCount: 3,
              },
              issues: [
                {
                  code: "page_horizontal_overflow",
                  severity: "error",
                  detail: "Fixture overflow.",
                },
                {
                  code: "tiny_touch_target",
                  severity: "warning",
                  detail: "Fixture tiny target.",
                },
              ],
            }),
          ],
        },
      ],
    });

    expect(report.rows[0].reviewStatus).toBe("needs shared fix");
    expect(() => assertConceptQualityGate(report)).toThrow(/seeded-overflow/);
  });

  it("renders a concise markdown matrix with required review statuses", async () => {
    const { buildConceptQualityReport, renderConceptQualityMatrixMarkdown } =
      await importQualityMatrixModule();
    const report = buildConceptQualityReport({
      generatedAt: "fixture",
      command: "fixture",
      catalogCount: 1,
      viewports: [{ name: "phone-390x844", width: 390, height: 844 }],
      rows: [
        {
          slug: "simple-harmonic-motion",
          title: "Simple Harmonic Motion",
          viewportAudits: [makeViewportAudit()],
        },
      ],
    });
    const markdown = renderConceptQualityMatrixMarkdown(report);

    expect(markdown).toContain("not reviewed");
    expect(markdown).toContain("needs shared fix");
    expect(markdown).toContain("needs content rewrite");
    expect(markdown).toContain("needs simulation visual fix");
    expect(markdown).toContain("passed");
    expect(markdown).toContain("simple-harmonic-motion");
  });

  it("tracks real interaction attempts separately from skipped decorative fields", async () => {
    const {
      assertRepresentativeInteractionCoverage,
      buildConceptQualityReport,
    } = await importQualityMatrixModule();
    const decorativeReport = buildConceptQualityReport({
      generatedAt: "fixture",
      command: "fixture",
      catalogCount: 1,
      viewports: [{ name: "phone-390x844", width: 390, height: 844 }],
      rows: [
        {
          slug: "decorative-interaction-field",
          title: "Decorative Interaction Field",
          viewportAudits: [
            makeViewportAudit({ interaction: { status: "not-run" } }),
            makeViewportAudit({ interaction: { status: "skipped" } }),
          ],
        },
      ],
    });

    expect(decorativeReport.summary.interactions.attempted).toBe(0);
    expect(decorativeReport.summary.interactions.byStatus["not-run"]).toBe(1);
    expect(decorativeReport.summary.interactions.byStatus.skipped).toBe(1);
    expect(() => assertRepresentativeInteractionCoverage(decorativeReport)).toThrow(
      /Representative interaction coverage failed/,
    );

    const attemptedReport = buildConceptQualityReport({
      generatedAt: "fixture",
      command: "fixture",
      catalogCount: 1,
      viewports: [{ name: "phone-390x844", width: 390, height: 844 }],
      rows: [
        {
          slug: "real-interaction",
          title: "Real Interaction",
          viewportAudits: [makeViewportAudit({ interaction: { status: "passed" } })],
        },
      ],
    });

    expect(attemptedReport.summary.interactions.attempted).toBe(1);
    expect(() => assertRepresentativeInteractionCoverage(attemptedReport)).not.toThrow();
  });
});
