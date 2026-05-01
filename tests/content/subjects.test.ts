import { describe, expect, it } from "vitest";
import {
  getSubjectDiscoverySummaries,
  getSubjectDiscoverySummaryBySlug,
  getSubjectDiscoverySummaryByTitle,
  getSubjectDiscoverySummaryForConceptSlug,
  getSubjectDiscoverySummaryForTopicSlug,
} from "@/lib/content";

describe("subject discovery", () => {
  it("returns the canonical subject entry pages in catalog order", () => {
    const subjects = getSubjectDiscoverySummaries();

    expect(subjects.map((subject) => subject.slug)).toEqual([
      "physics",
      "math",
      "chemistry",
      "computer-science",
    ]);
    expect(subjects.map((subject) => subject.title)).toEqual([
      "Physics",
      "Math",
      "Chemistry",
      "Computer Science",
    ]);
  });

  it("keeps math anchored on its subject-owned topics and tracks while exposing the vector bridge separately", () => {
    const math = getSubjectDiscoverySummaryBySlug("math");

    expect(math.topics.map((topic) => topic.slug)).toEqual([
      "functions",
      "calculus",
      "vectors",
      "complex-numbers-and-parametric-motion",
    ]);
    expect(math.featuredStarterTracks.map((track) => track.slug)).toEqual([
      "functions-and-change",
      "complex-and-parametric-motion",
    ]);
    expect(math.bridgeStarterTracks.map((track) => track.slug)).toEqual([
      "vectors-and-motion-bridge",
    ]);
    expect(math.featuredConcepts.map((concept) => concept.slug)).toEqual([
      "graph-transformations",
      "rational-functions-asymptotes-and-behavior",
      "exponential-change-growth-decay-logarithms",
      "complex-numbers-on-the-plane",
      "unit-circle-sine-cosine-from-rotation",
      "polar-coordinates-radius-and-angle",
      "trig-identities-from-unit-circle-geometry",
      "inverse-trig-angle-from-ratio",
      "parametric-curves-motion-from-equations",
      "derivative-as-slope-local-rate-of-change",
      "vectors-in-2d",
      "matrix-transformations",
      "dot-product-angle-and-projection",
    ]);
  });

  it("keeps physics aligned to the split topic taxonomy without hiding the new branches", () => {
    const physics = getSubjectDiscoverySummaryBySlug("physics");

    expect(physics.topics.map((topic) => topic.slug)).toEqual([
      "mechanics",
      "gravity-and-orbits",
      "oscillations",
      "waves",
      "sound",
      "fluids",
      "thermodynamics",
      "electricity",
      "circuits",
      "magnetism",
      "electromagnetism",
      "optics",
      "mirrors-and-lenses",
      "modern-physics",
    ]);
    expect(physics.featuredTopics.map((topic) => topic.slug)).toEqual([
      "mechanics",
      "waves",
      "circuits",
    ]);
    expect(physics.featuredStarterTracks.map((track) => track.slug)).toEqual([
      "motion-and-circular-motion",
      "gravity-and-orbits",
      "electricity",
    ]);
    expect(physics.featuredConcepts.map((concept) => concept.slug)).toEqual([
      "vectors-components",
      "simple-harmonic-motion",
      "basic-circuits",
    ]);
  });

  it("keeps chemistry broad enough to expose reaction, stoichiometry, and solution branches", () => {
    const chemistry = getSubjectDiscoverySummaryBySlug("chemistry");

    expect(chemistry.topics.map((topic) => topic.slug)).toEqual([
      "rates-and-equilibrium",
      "stoichiometry-and-yield",
      "solutions-and-ph",
    ]);
    expect(chemistry.featuredStarterTracks.map((track) => track.slug)).toEqual([
      "rates-and-equilibrium",
      "stoichiometry-and-yield",
      "solutions-and-ph",
    ]);
    expect(chemistry.featuredConcepts.map((concept) => concept.slug)).toEqual([
      "reaction-rate-collision-theory",
      "dynamic-equilibrium-le-chateliers-principle",
      "stoichiometric-ratios-and-recipe-batches",
      "limiting-reagent-and-leftover-reactants",
      "percent-yield-and-reaction-extent",
      "concentration-and-dilution",
      "solubility-and-saturation",
      "acid-base-ph-intuition",
      "buffers-and-neutralization",
    ]);
  });

  it("resolves subjects from titles, concept slugs, and topic slugs", () => {
    expect(getSubjectDiscoverySummaryByTitle("Chemistry").slug).toBe("chemistry");
    expect(getSubjectDiscoverySummaryByTitle("Computer Science").slug).toBe(
      "computer-science",
    );
    expect(
      getSubjectDiscoverySummaryForConceptSlug("reaction-rate-collision-theory").title,
    ).toBe("Chemistry");
    expect(
      getSubjectDiscoverySummaryForConceptSlug("sorting-and-algorithmic-trade-offs").title,
    ).toBe("Computer Science");
    expect(getSubjectDiscoverySummaryForTopicSlug("mechanics").title).toBe("Physics");
    expect(getSubjectDiscoverySummaryForTopicSlug("algorithms-and-search").title).toBe(
      "Computer Science",
    );
  });

  it("adds the bounded computer-science pilot without spilling into a second taxonomy", () => {
    const computerScience = getSubjectDiscoverySummaryBySlug("computer-science");

    expect(computerScience.topics.map((topic) => topic.slug)).toEqual([
      "algorithms-and-search",
    ]);
    expect(computerScience.featuredStarterTracks.map((track) => track.slug)).toEqual([
      "algorithms-and-search-foundations",
    ]);
    expect(computerScience.featuredConcepts.map((concept) => concept.slug)).toEqual([
      "sorting-and-algorithmic-trade-offs",
      "binary-search-halving-the-search-space",
      "graph-representation-and-adjacency-intuition",
      "breadth-first-search-and-layered-frontiers",
    ]);
  });
});
