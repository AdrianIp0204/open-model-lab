import { describe, expect, it } from "vitest";
import { getAllConcepts } from "@/lib/content/loaders";
import {
  hasAuthoredConceptPageV2,
  summarizeConceptPageV2Coverage,
} from "@/lib/content/concept-page-v2-coverage";

const migratedSlugs = [
  "angular-momentum",
  "rolling-motion",
  "rotational-inertia",
  "torque",
  "wave-speed-wavelength",
  "momentum-impulse",
  "derivative-as-slope-local-rate-of-change",
  "integral-as-accumulation-area",
  "concentration-and-dilution",
  "solubility-and-saturation",
  "graph-representation-and-adjacency-intuition",
  "breadth-first-search-and-layered-frontiers",
  "depth-first-search-and-backtracking-paths",
] as const;

describe("concept page v2 coverage", () => {
  it("classifies authored V2 concepts from the live published catalog", () => {
    const summary = summarizeConceptPageV2Coverage(getAllConcepts());

    expect(summary.totalPublished).toBeGreaterThan(0);
    expect(summary.authoredCount).toBeGreaterThanOrEqual(migratedSlugs.length);
    expect(summary.fallbackCount).toBeGreaterThan(0);

    for (const slug of migratedSlugs) {
      const record = summary.authored.find((entry) => entry.slug === slug);
      expect(record, `Expected ${slug} to be explicit authored V2.`).toBeTruthy();
      expect(record?.guidedStepCount).toBeGreaterThanOrEqual(3);
    }

    const fallbackRecord = summary.fallback.find(
      (entry) => entry.slug === "reaction-rate-collision-theory",
    );
    expect(fallbackRecord).toBeTruthy();
  });

  it("treats guidedSteps as the explicit V2 authoring signal", () => {
    expect(hasAuthoredConceptPageV2({ v2: undefined })).toBe(false);
    expect(hasAuthoredConceptPageV2({ v2: { guidedSteps: [] } as never })).toBe(false);
    expect(
      hasAuthoredConceptPageV2({
        v2: {
          guidedSteps: [
            {
              id: "see-it",
              title: "See it",
              goal: "Goal",
              doThis: "Do this",
              notice: "Notice this",
              explain: "Explain this",
            },
          ],
        } as never,
      }),
    ).toBe(true);
  });
});
