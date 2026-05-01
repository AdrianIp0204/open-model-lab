import { describe, expect, it } from "vitest";
import { getConceptBySlug } from "@/lib/content";
import {
  resolveConceptPageGuidance,
  resolveConceptPageGuidanceDiagnostics,
} from "@/lib/content/concept-page-guidance";

describe("resolveConceptPageGuidance", () => {
  it("prefers starter explore tasks when they are authored", () => {
    const concept = getConceptBySlug("simple-harmonic-motion");
    const guidance = resolveConceptPageGuidance(concept);

    expect(guidance).not.toBeNull();
    expect(guidance?.source).toBe("starter-task");
    expect(guidance?.action).toContain("Change the amplitude");
    expect(guidance?.detail).toContain("mass is fastest as it passes equilibrium");
    expect(guidance?.hints.map((hint) => hint.label)).toEqual(
      expect.arrayContaining([
        "Velocity over time",
        "Play / pause",
        "Timeline scrub",
      ]),
    );
    expect(resolveConceptPageGuidanceDiagnostics(guidance)).toMatchObject({
      hasConcreteAction: true,
      hasConcreteDetail: true,
      hasDynamicToolHint: true,
      hasHiddenHint: true,
    });
  });

  it("builds a concrete action from related controls and graphs when the first prompt is only observational", () => {
    const concept = getConceptBySlug("breadth-first-search-and-layered-frontiers");
    const guidance = resolveConceptPageGuidance(concept);

    expect(guidance).not.toBeNull();
    expect(guidance?.source).toBe("notice-prompt");
    expect(guidance?.action).toBe(
      "Change start node with Current depth versus deepest claimed depth open.",
    );
    expect(guidance?.detail).toContain("Breadth-first search settles the shallow layer");
    expect(guidance?.hints.map((hint) => hint.label)).toEqual(
      expect.arrayContaining([
        "Start node",
        "Visited nodes versus frontier size",
        "Current depth versus deepest claimed depth",
      ]),
    );
    expect(guidance?.hints.some((hint) => hint.hidden)).toBe(true);
  });

  it("keeps a concrete prompt action when the first notice prompt already gives one", () => {
    const concept = getConceptBySlug("graph-transformations");
    const guidance = resolveConceptPageGuidance(concept);

    expect(guidance).not.toBeNull();
    expect(guidance?.source).toBe("notice-prompt");
    expect(guidance?.action).toContain("Change only the horizontal shift");
    expect(guidance?.detail).toContain("Watch the vertex keep the same height");
  });

  it("falls back to the featured setup summary before the key takeaway", () => {
    const concept = structuredClone(getConceptBySlug("graph-transformations"));
    concept.simulation.ui = {
      ...concept.simulation.ui,
      starterExploreTasks: undefined,
    };
    concept.noticePrompts.items = [];

    const guidance = resolveConceptPageGuidance(concept);

    expect(guidance).not.toBeNull();
    expect(guidance?.source).toBe("featured-setup");
    expect(guidance?.action).toContain("stretched graph");
    expect(guidance?.detail).toContain("Watch the vertex keep the same height");
    expect(guidance?.hints.map((hint) => hint.label)).toEqual(
      expect.arrayContaining([
        "Stretch upward",
        "Vertex height vs vertical scale",
        "Reference curve",
        "Hover graph",
      ]),
    );
    expect(guidance?.hints.some((hint) => hint.kind === "preset" && hint.hidden)).toBe(true);
  });

  it("falls back to the key takeaway when richer guidance fields are missing", () => {
    const concept = structuredClone(getConceptBySlug("graph-transformations"));
    concept.simulation.ui = {
      ...concept.simulation.ui,
      starterExploreTasks: undefined,
    };
    concept.noticePrompts.items = [];
    if (concept.pageFramework) {
      concept.pageFramework.featuredSetups = [];
      delete concept.pageFramework.entryGuidance;
    }

    const guidance = resolveConceptPageGuidance(concept);

    expect(guidance).not.toBeNull();
    expect(guidance?.source).toBe("key-takeaway");
    expect(guidance?.action).toContain("Track one landmark on the base graph");
    expect(guidance?.detail).toContain("inside and outside changes");
  });

  it("applies authored entry-guidance overrides without inventing new hint targets", () => {
    const concept = structuredClone(getConceptBySlug("reaction-rate-collision-theory"));
    concept.pageFramework = {
      ...concept.pageFramework,
      entryGuidance: {
        firstAction:
          "Raise temperature with Rate versus temperature open, then compare successful collisions with total collisions.",
        watchFor:
          "Watch the success curve climb faster than the all-collision cue once more particles clear the barrier.",
        hints: [
          { kind: "control", id: "temperature" },
          { kind: "graph", id: "rate-temperature" },
          { kind: "tool", id: "graph-preview" },
        ],
      },
    };

    const guidance = resolveConceptPageGuidance(concept);

    expect(guidance).not.toBeNull();
    expect(guidance?.action).toContain("Raise temperature");
    expect(guidance?.detail).toContain("success curve climb faster");
    expect(guidance?.usedOverrides).toEqual({
      firstAction: true,
      watchFor: true,
      hints: true,
    });
    expect(guidance?.hints.map((hint) => hint.id)).toEqual([
      "temperature",
      "rate-temperature",
      "graph-preview",
      "compare",
    ]);
  });

  it("falls back to generated hints when authored hint overrides reference unavailable targets", () => {
    const concept = structuredClone(getConceptBySlug("reaction-rate-collision-theory"));
    concept.pageFramework = {
      ...concept.pageFramework,
      entryGuidance: {
        hints: [
          { kind: "control", id: "missing-control" },
          { kind: "graph", id: "missing-graph" },
        ],
      },
    };

    const guidance = resolveConceptPageGuidance(concept);

    expect(guidance).not.toBeNull();
    expect(guidance?.usedOverrides.hints).toBe(false);
    expect(guidance?.hints.map((hint) => hint.label)).toEqual(
      expect.arrayContaining([
        "Rate vs concentration",
        "Hover graph",
      ]),
    );
  });
});
