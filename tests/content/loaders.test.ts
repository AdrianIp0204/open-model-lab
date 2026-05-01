import { describe, expect, it } from "vitest";
import {
  getAllConceptMetadata,
  getAllConcepts,
  getConceptBySlug,
  getConceptCatalogMetrics,
  getConceptMetadataBySlug,
  getConceptMetadataById,
  getConceptRegistry,
  getConceptRegistryIndex,
  getConceptSlugs,
  getReadNextRecommendations,
  getConceptTopics,
  validateConceptBundle,
  validateConceptRegistry,
} from "@/lib/content";

type LoaderTestConcept = ReturnType<typeof getAllConcepts>[number];

function withoutGuidedInlineChecks(concept: LoaderTestConcept): LoaderTestConcept {
  if (!concept.v2) {
    return concept;
  }

  return {
    ...concept,
    v2: {
      ...concept.v2,
      guidedSteps: concept.v2.guidedSteps.map((step) => {
        const nextStep = { ...step };
        delete nextStep.inlineCheck;
        return nextStep;
      }),
    },
  };
}

describe("content loaders", () => {
  it("returns all shipped concepts in stable order", () => {
    const concepts = getAllConcepts();

    expect(concepts.map((concept) => concept.slug)).toEqual([
      "simple-harmonic-motion",
      "oscillation-energy",
      "wave-speed-wavelength",
      "sound-waves-longitudinal-motion",
      "pitch-frequency-loudness-intensity",
      "beats",
      "doppler-effect",
      "wave-interference",
      "standing-waves",
      "resonance-air-columns-open-closed-pipes",
      "uniform-circular-motion",
      "damping-resonance",
      "vectors-components",
      "torque",
      "static-equilibrium-centre-of-mass",
      "rotational-inertia",
      "rolling-motion",
      "angular-momentum",
      "momentum-impulse",
      "conservation-of-momentum",
      "collisions",
      "projectile-motion",
      "gravitational-fields",
      "gravitational-potential-energy",
      "pressure-and-hydrostatic-pressure",
      "continuity-equation",
      "bernoullis-principle",
      "buoyancy-and-archimedes-principle",
      "drag-and-terminal-velocity",
      "temperature-and-internal-energy",
      "ideal-gas-law-and-kinetic-theory",
      "heat-transfer",
      "specific-heat-and-phase-change",
      "circular-orbits-orbital-speed",
      "electric-fields",
      "keplers-third-law-orbital-periods",
      "electric-potential",
      "capacitance-and-stored-electric-energy",
      "escape-velocity",
      "basic-circuits",
      "light-spectrum-linkage",
      "polarization",
      "power-energy-circuits",
      "diffraction",
      "double-slit-interference",
      "refraction-snells-law",
      "series-parallel-circuits",
      "dispersion-refractive-index-color",
      "total-internal-reflection",
      "kirchhoff-loop-and-junction-rules",
      "mirrors",
      "equivalent-resistance",
      "magnetic-fields",
      "electromagnetic-induction",
      "maxwells-equations-synthesis",
      "electromagnetic-waves",
      "magnetic-force-moving-charges-currents",
      "lens-imaging",
      "rc-charging-and-discharging",
      "optical-resolution-imaging-limits",
      "photoelectric-effect",
      "internal-resistance-and-terminal-voltage",
      "atomic-spectra",
      "de-broglie-matter-waves",
      "bohr-model",
      "radioactivity-half-life",
      "graph-transformations",
      "rational-functions-asymptotes-and-behavior",
      "exponential-change-growth-decay-logarithms",
      "derivative-as-slope-local-rate-of-change",
      "limits-and-continuity-approaching-a-value",
      "optimization-maxima-minima-and-constraints",
      "integral-as-accumulation-area",
      "vectors-in-2d",
      "matrix-transformations",
      "dot-product-angle-and-projection",
      "complex-numbers-on-the-plane",
      "unit-circle-sine-cosine-from-rotation",
      "polar-coordinates-radius-and-angle",
      "parametric-curves-motion-from-equations",
      "trig-identities-from-unit-circle-geometry",
      "reaction-rate-collision-theory",
      "inverse-trig-angle-from-ratio",
      "dynamic-equilibrium-le-chateliers-principle",
      "stoichiometric-ratios-and-recipe-batches",
      "limiting-reagent-and-leftover-reactants",
      "percent-yield-and-reaction-extent",
      "concentration-and-dilution",
      "solubility-and-saturation",
      "acid-base-ph-intuition",
      "sorting-and-algorithmic-trade-offs",
      "buffers-and-neutralization",
      "binary-search-halving-the-search-space",
      "graph-representation-and-adjacency-intuition",
      "breadth-first-search-and-layered-frontiers",
      "depth-first-search-and-backtracking-paths",
      "frontier-and-visited-state-on-graphs",
    ]);
  });

  it("builds canonical metadata selectors from the catalog", () => {
    const registry = getConceptRegistryIndex();

    expect(registry.all.map((entry) => entry.id)).toEqual([
      "concept-shm",
      "concept-oscillation-energy",
      "concept-wave-speed-wavelength",
      "concept-sound-waves-longitudinal-motion",
      "concept-pitch-frequency-loudness-intensity",
      "concept-beats",
      "concept-doppler-effect",
      "concept-wave-interference",
      "concept-standing-waves",
      "concept-resonance-air-columns-open-closed-pipes",
      "concept-uniform-circular-motion",
      "concept-damping-resonance",
      "concept-vectors-components",
      "concept-torque",
      "concept-static-equilibrium-centre-of-mass",
      "concept-rotational-inertia",
      "concept-rolling-motion",
      "concept-angular-momentum",
      "concept-momentum-impulse",
      "concept-conservation-of-momentum",
      "concept-collisions",
      "concept-projectile-motion",
      "concept-gravitational-fields",
      "concept-gravitational-potential-energy",
      "concept-pressure-and-hydrostatic-pressure",
      "concept-continuity-equation",
      "concept-bernoullis-principle",
      "concept-buoyancy-and-archimedes-principle",
      "concept-drag-and-terminal-velocity",
      "concept-temperature-and-internal-energy",
      "concept-ideal-gas-law-and-kinetic-theory",
      "concept-heat-transfer",
      "concept-specific-heat-and-phase-change",
      "concept-circular-orbits-orbital-speed",
      "concept-electric-fields",
      "concept-keplers-third-law-orbital-periods",
      "concept-electric-potential",
      "concept-capacitance-and-stored-electric-energy",
      "concept-escape-velocity",
      "concept-basic-circuits",
      "concept-light-spectrum-linkage",
      "concept-polarization",
      "concept-power-energy-circuits",
      "concept-diffraction",
      "concept-double-slit-interference",
      "concept-refraction-snells-law",
      "concept-series-parallel-circuits",
      "concept-dispersion-refractive-index-color",
      "concept-total-internal-reflection",
      "concept-kirchhoff-loop-and-junction-rules",
      "concept-mirrors",
      "concept-equivalent-resistance",
      "concept-magnetic-fields",
      "concept-electromagnetic-induction",
      "concept-maxwells-equations-synthesis",
      "concept-electromagnetic-waves",
      "concept-magnetic-force-moving-charges-currents",
      "concept-lens-imaging",
      "concept-rc-charging-and-discharging",
      "concept-optical-resolution-imaging-limits",
      "concept-photoelectric-effect",
      "concept-internal-resistance-and-terminal-voltage",
      "concept-atomic-spectra",
      "concept-de-broglie-matter-waves",
      "concept-bohr-model",
      "concept-radioactivity-half-life",
      "concept-graph-transformations",
      "concept-rational-functions-asymptotes-and-behavior",
      "concept-exponential-change-growth-decay-logarithms",
      "concept-derivative-as-slope-local-rate-of-change",
      "concept-limits-and-continuity-approaching-a-value",
      "concept-optimization-maxima-minima-and-constraints",
      "concept-integral-as-accumulation-area",
      "concept-vectors-in-2d",
      "concept-matrix-transformations",
      "concept-dot-product-angle-and-projection",
      "concept-complex-numbers-on-the-plane",
      "concept-unit-circle-sine-cosine-from-rotation",
      "concept-polar-coordinates-radius-and-angle",
      "concept-parametric-curves-motion-from-equations",
      "concept-trig-identities-from-unit-circle-geometry",
      "concept-reaction-rate-collision-theory",
      "concept-inverse-trig-angle-from-ratio",
      "concept-dynamic-equilibrium-le-chateliers-principle",
      "concept-stoichiometric-ratios-and-recipe-batches",
      "concept-limiting-reagent-and-leftover-reactants",
      "concept-percent-yield-and-reaction-extent",
      "concept-concentration-and-dilution",
      "concept-solubility-and-saturation",
      "concept-acid-base-ph-intuition",
      "concept-sorting-and-algorithmic-trade-offs",
      "concept-buffers-and-neutralization",
      "concept-binary-search-halving-the-search-space",
      "concept-graph-representation-and-adjacency-intuition",
      "concept-breadth-first-search-and-layered-frontiers",
      "concept-depth-first-search-and-backtracking-paths",
      "concept-frontier-and-visited-state-on-graphs",
    ]);
    expect(getConceptTopics()).toEqual([
      "Oscillations",
      "Waves",
      "Sound",
      "Mechanics",
      "Gravity and Orbits",
      "Fluids",
      "Thermodynamics",
      "Electricity",
      "Circuits",
      "Optics",
      "Mirrors and Lenses",
      "Magnetism",
      "Electromagnetism",
      "Modern Physics",
      "Functions",
      "Calculus",
      "Vectors",
      "Complex Numbers and Parametric Motion",
      "Rates and Equilibrium",
      "Stoichiometry and Yield",
      "Solutions and pH",
      "Algorithms and Search",
    ]);
    expect(getAllConceptMetadata().map((entry) => entry.slug)).toEqual([
      "simple-harmonic-motion",
      "oscillation-energy",
      "wave-speed-wavelength",
      "sound-waves-longitudinal-motion",
      "pitch-frequency-loudness-intensity",
      "beats",
      "doppler-effect",
      "wave-interference",
      "standing-waves",
      "resonance-air-columns-open-closed-pipes",
      "uniform-circular-motion",
      "damping-resonance",
      "vectors-components",
      "torque",
      "static-equilibrium-centre-of-mass",
      "rotational-inertia",
      "rolling-motion",
      "angular-momentum",
      "momentum-impulse",
      "conservation-of-momentum",
      "collisions",
      "projectile-motion",
      "gravitational-fields",
      "gravitational-potential-energy",
      "pressure-and-hydrostatic-pressure",
      "continuity-equation",
      "bernoullis-principle",
      "buoyancy-and-archimedes-principle",
      "drag-and-terminal-velocity",
      "temperature-and-internal-energy",
      "ideal-gas-law-and-kinetic-theory",
      "heat-transfer",
      "specific-heat-and-phase-change",
      "circular-orbits-orbital-speed",
      "electric-fields",
      "keplers-third-law-orbital-periods",
      "electric-potential",
      "capacitance-and-stored-electric-energy",
      "escape-velocity",
      "basic-circuits",
      "light-spectrum-linkage",
      "polarization",
      "power-energy-circuits",
      "diffraction",
      "double-slit-interference",
      "refraction-snells-law",
      "series-parallel-circuits",
      "dispersion-refractive-index-color",
      "total-internal-reflection",
      "kirchhoff-loop-and-junction-rules",
      "mirrors",
      "equivalent-resistance",
      "magnetic-fields",
      "electromagnetic-induction",
      "maxwells-equations-synthesis",
      "electromagnetic-waves",
      "magnetic-force-moving-charges-currents",
      "lens-imaging",
      "rc-charging-and-discharging",
      "optical-resolution-imaging-limits",
      "photoelectric-effect",
      "internal-resistance-and-terminal-voltage",
      "atomic-spectra",
      "de-broglie-matter-waves",
      "bohr-model",
      "radioactivity-half-life",
      "graph-transformations",
      "rational-functions-asymptotes-and-behavior",
      "exponential-change-growth-decay-logarithms",
      "derivative-as-slope-local-rate-of-change",
      "limits-and-continuity-approaching-a-value",
      "optimization-maxima-minima-and-constraints",
      "integral-as-accumulation-area",
      "vectors-in-2d",
      "matrix-transformations",
      "dot-product-angle-and-projection",
      "complex-numbers-on-the-plane",
      "unit-circle-sine-cosine-from-rotation",
      "polar-coordinates-radius-and-angle",
      "parametric-curves-motion-from-equations",
      "trig-identities-from-unit-circle-geometry",
      "reaction-rate-collision-theory",
      "inverse-trig-angle-from-ratio",
      "dynamic-equilibrium-le-chateliers-principle",
      "stoichiometric-ratios-and-recipe-batches",
      "limiting-reagent-and-leftover-reactants",
      "percent-yield-and-reaction-extent",
      "concentration-and-dilution",
      "solubility-and-saturation",
      "acid-base-ph-intuition",
      "sorting-and-algorithmic-trade-offs",
      "buffers-and-neutralization",
      "binary-search-halving-the-search-space",
      "graph-representation-and-adjacency-intuition",
      "breadth-first-search-and-layered-frontiers",
      "depth-first-search-and-backtracking-paths",
      "frontier-and-visited-state-on-graphs",
    ]);
  });

  it("returns a concept by slug", () => {
    const concept = getConceptBySlug("uniform-circular-motion");

    expect(concept.title).toBe("Uniform Circular Motion");
    expect(concept.simulation.kind).toBe("ucm");
  });

  it("resolves the authored Faraday/Lenz title alias back to the canonical induction concept", () => {
    const concept = getConceptBySlug("faradays-law-and-lenzs-law");
    const metadata = getConceptMetadataBySlug("faradays-law-and-lenzs-law");

    expect(concept.slug).toBe("electromagnetic-induction");
    expect(concept.title).toBe("Faraday's Law and Lenz's Law");
    expect(metadata.slug).toBe("electromagnetic-induction");
    expect(getConceptSlugs({ includeAliases: true })).toContain(
      "faradays-law-and-lenzs-law",
    );
  });

  it("wires the new concept into live read-next recommendations through metadata", () => {
    expect(
      getReadNextRecommendations("simple-harmonic-motion").map((item) => item.slug),
    ).toContain("wave-interference");
    expect(
      getReadNextRecommendations("simple-harmonic-motion").map((item) => item.slug),
    ).toContain("standing-waves");
    expect(
      getReadNextRecommendations("oscillation-energy").map((item) => item.slug),
    ).toContain("standing-waves");
    expect(
      getReadNextRecommendations("wave-speed-wavelength").map((item) => item.slug),
    ).toContain("wave-interference");
    expect(
      getReadNextRecommendations("wave-speed-wavelength").map((item) => item.slug),
    ).toContain("sound-waves-longitudinal-motion");
    expect(
      getReadNextRecommendations("wave-speed-wavelength").map((item) => item.slug),
    ).toContain("standing-waves");
    expect(
      getReadNextRecommendations("sound-waves-longitudinal-motion").map((item) => item.slug),
    ).toContain("pitch-frequency-loudness-intensity");
    expect(
      getReadNextRecommendations("sound-waves-longitudinal-motion").map((item) => item.slug),
    ).toContain("beats");
    expect(
      getReadNextRecommendations("sound-waves-longitudinal-motion").map((item) => item.slug),
    ).toContain("doppler-effect");
    expect(
      getReadNextRecommendations("pitch-frequency-loudness-intensity").map((item) => item.slug),
    ).toContain("beats");
    expect(
      getReadNextRecommendations("pitch-frequency-loudness-intensity").map((item) => item.slug),
    ).toContain("wave-interference");
    expect(
      getReadNextRecommendations("pitch-frequency-loudness-intensity").map((item) => item.slug),
    ).toContain("doppler-effect");
    expect(
      getReadNextRecommendations("beats").map((item) => item.slug),
    ).toContain("doppler-effect");
    expect(
      getReadNextRecommendations("beats").map((item) => item.slug),
    ).toContain("wave-interference");
    expect(
      getReadNextRecommendations("beats").map((item) => item.slug),
    ).toContain("standing-waves");
    expect(
      getReadNextRecommendations("doppler-effect").map((item) => item.slug),
    ).toContain("wave-interference");
    expect(
      getReadNextRecommendations("doppler-effect").map((item) => item.slug),
    ).toContain("standing-waves");
    expect(
      getReadNextRecommendations("wave-interference").map((item) => item.slug),
    ).toContain("diffraction");
    expect(
      getReadNextRecommendations("wave-interference").map((item) => item.slug),
    ).toContain("double-slit-interference");
    expect(
      getReadNextRecommendations("wave-interference").map((item) => item.slug),
    ).toContain("standing-waves");
    expect(
      getReadNextRecommendations("standing-waves").map((item) => item.slug),
    ).toContain("resonance-air-columns-open-closed-pipes");
    expect(
      getReadNextRecommendations("standing-waves").map((item) => item.slug),
    ).toContain("damping-resonance");
    expect(
      getReadNextRecommendations("standing-waves").map((item) => item.slug),
    ).toContain("oscillation-energy");
    expect(
      getReadNextRecommendations("resonance-air-columns-open-closed-pipes").map((item) => item.slug),
    ).toContain("damping-resonance");
    expect(
      getReadNextRecommendations("resonance-air-columns-open-closed-pipes").map((item) => item.slug),
    ).toContain("standing-waves");
    expect(
      getReadNextRecommendations("vectors-components").map((item) => item.slug),
    ).toContain("torque");
    expect(
      getReadNextRecommendations("vectors-components").map((item) => item.slug),
    ).toContain("momentum-impulse");
    expect(
      getReadNextRecommendations("vectors-components").map((item) => item.slug),
    ).toContain("projectile-motion");
    expect(getReadNextRecommendations("torque").map((item) => item.slug)).toContain(
      "static-equilibrium-centre-of-mass",
    );
    expect(getReadNextRecommendations("torque").map((item) => item.slug)).toContain(
      "rotational-inertia",
    );
    expect(getReadNextRecommendations("torque").map((item) => item.slug)).toContain(
      "rolling-motion",
    );
    expect(
      getReadNextRecommendations("static-equilibrium-centre-of-mass").map((item) => item.slug),
    ).toContain("rotational-inertia");
    expect(
      getReadNextRecommendations("static-equilibrium-centre-of-mass").map((item) => item.slug),
    ).toContain("rolling-motion");
    expect(
      getReadNextRecommendations("static-equilibrium-centre-of-mass").map((item) => item.slug),
    ).toContain(
      "angular-momentum",
    );
    expect(
      getReadNextRecommendations("rotational-inertia").map((item) => item.slug),
    ).toContain("rolling-motion");
    expect(
      getReadNextRecommendations("rotational-inertia").map((item) => item.slug),
    ).toContain("angular-momentum");
    expect(
      getReadNextRecommendations("rolling-motion").map((item) => item.slug),
    ).toContain("angular-momentum");
    expect(
      getReadNextRecommendations("rolling-motion").map((item) => item.slug),
    ).toContain("uniform-circular-motion");
    expect(
      getReadNextRecommendations("rolling-motion").map((item) => item.slug),
    ).toContain("momentum-impulse");
    expect(
      getReadNextRecommendations("angular-momentum").map((item) => item.slug),
    ).toContain("conservation-of-momentum");
    expect(
      getReadNextRecommendations("angular-momentum").map((item) => item.slug),
    ).toContain("momentum-impulse");
    expect(
      getReadNextRecommendations("angular-momentum").map((item) => item.slug),
    ).toContain("uniform-circular-motion");
    expect(
      getReadNextRecommendations("rotational-inertia").map((item) => item.slug),
    ).toContain("momentum-impulse");
    expect(getReadNextRecommendations("momentum-impulse").map((item) => item.slug)).toContain(
      "conservation-of-momentum",
    );
    expect(getReadNextRecommendations("momentum-impulse").map((item) => item.slug)).toContain(
      "collisions",
    );
    expect(getReadNextRecommendations("momentum-impulse").map((item) => item.slug)).toContain(
      "projectile-motion",
    );
    expect(
      getReadNextRecommendations("conservation-of-momentum").map((item) => item.slug),
    ).toContain("collisions");
    expect(
      getReadNextRecommendations("conservation-of-momentum").map((item) => item.slug),
    ).toContain("projectile-motion");
    expect(
      getReadNextRecommendations("collisions").map((item) => item.slug),
    ).toContain("projectile-motion");
    expect(
      getReadNextRecommendations("collisions").map((item) => item.slug),
    ).toContain("momentum-impulse");
    expect(
      getReadNextRecommendations("uniform-circular-motion").map((item) => item.slug),
    ).toContain("circular-orbits-orbital-speed");
    expect(
      getReadNextRecommendations("complex-numbers-on-the-plane").map((item) => item.slug),
    ).toContain("unit-circle-sine-cosine-from-rotation");
    expect(
      getReadNextRecommendations("complex-numbers-on-the-plane").map((item) => item.slug),
    ).toContain("polar-coordinates-radius-and-angle");
    expect(
      getReadNextRecommendations("unit-circle-sine-cosine-from-rotation").map(
        (item) => item.slug,
      ),
    ).toContain("polar-coordinates-radius-and-angle");
    expect(
      getReadNextRecommendations("unit-circle-sine-cosine-from-rotation").map(
        (item) => item.slug,
      ),
    ).toContain("trig-identities-from-unit-circle-geometry");
    expect(
      getReadNextRecommendations("polar-coordinates-radius-and-angle").map((item) => item.slug),
    ).toContain("trig-identities-from-unit-circle-geometry");
    expect(
      getReadNextRecommendations("polar-coordinates-radius-and-angle").map((item) => item.slug),
    ).toContain("inverse-trig-angle-from-ratio");
    expect(
      getReadNextRecommendations("trig-identities-from-unit-circle-geometry").map(
        (item) => item.slug,
      ),
    ).toContain("inverse-trig-angle-from-ratio");
    expect(
      getReadNextRecommendations("inverse-trig-angle-from-ratio").map((item) => item.slug),
    ).toContain("parametric-curves-motion-from-equations");
    expect(
      getReadNextRecommendations("inverse-trig-angle-from-ratio").map((item) => item.slug),
    ).toContain("dot-product-angle-and-projection");
    expect(
      getReadNextRecommendations("unit-circle-sine-cosine-from-rotation").map(
        (item) => item.slug,
      ),
    ).toContain("uniform-circular-motion");
    expect(
      getReadNextRecommendations("parametric-curves-motion-from-equations").map(
        (item) => item.slug,
      ),
    ).toContain("vectors-in-2d");
    expect(
      getReadNextRecommendations("projectile-motion").map((item) => item.slug),
    ).toContain("vectors-components");
    expect(
      getReadNextRecommendations("projectile-motion").map((item) => item.slug),
    ).toContain("momentum-impulse");
    expect(
      getReadNextRecommendations("projectile-motion").map((item) => item.slug),
    ).toContain("gravitational-fields");
    expect(
      getReadNextRecommendations("gravitational-fields").map((item) => item.slug),
    ).toContain("gravitational-potential-energy");
    expect(
      getReadNextRecommendations("gravitational-fields").map((item) => item.slug),
    ).toContain("circular-orbits-orbital-speed");
    expect(
      getReadNextRecommendations("gravitational-fields").map((item) => item.slug),
    ).toContain("escape-velocity");
    expect(
      getReadNextRecommendations("gravitational-potential-energy").map((item) => item.slug),
    ).toContain("circular-orbits-orbital-speed");
    expect(
      getReadNextRecommendations("gravitational-potential-energy").map((item) => item.slug),
    ).toContain("escape-velocity");
    expect(
      getReadNextRecommendations("gravitational-potential-energy").map((item) => item.slug),
    ).toContain("electric-potential");
    expect(
      getReadNextRecommendations("pressure-and-hydrostatic-pressure").map((item) => item.slug),
    ).toContain("buoyancy-and-archimedes-principle");
    expect(
      getReadNextRecommendations("pressure-and-hydrostatic-pressure").map((item) => item.slug),
    ).toContain("continuity-equation");
    expect(
      getReadNextRecommendations("pressure-and-hydrostatic-pressure").map((item) => item.slug),
    ).toContain("bernoullis-principle");
    expect(
      getReadNextRecommendations("continuity-equation").map((item) => item.slug),
    ).toContain("bernoullis-principle");
    expect(
      getReadNextRecommendations("continuity-equation").map((item) => item.slug),
    ).toContain("pressure-and-hydrostatic-pressure");
    expect(
      getReadNextRecommendations("continuity-equation").map((item) => item.slug),
    ).toContain("buoyancy-and-archimedes-principle");
    expect(
      getReadNextRecommendations("bernoullis-principle").map((item) => item.slug),
    ).toContain("pressure-and-hydrostatic-pressure");
    expect(
      getReadNextRecommendations("bernoullis-principle").map((item) => item.slug),
    ).toContain("buoyancy-and-archimedes-principle");
    expect(
      getReadNextRecommendations("bernoullis-principle").map((item) => item.slug),
    ).toContain("ideal-gas-law-and-kinetic-theory");
    expect(
      getReadNextRecommendations("buoyancy-and-archimedes-principle").map((item) => item.slug),
    ).toContain("pressure-and-hydrostatic-pressure");
    expect(
      getReadNextRecommendations("buoyancy-and-archimedes-principle").map((item) => item.slug),
    ).toContain("continuity-equation");
    expect(
      getReadNextRecommendations("buoyancy-and-archimedes-principle").map((item) => item.slug),
    ).toContain("bernoullis-principle");
    expect(
      getReadNextRecommendations("drag-and-terminal-velocity").map((item) => item.slug),
    ).toContain("projectile-motion");
    expect(
      getReadNextRecommendations("drag-and-terminal-velocity").map((item) => item.slug),
    ).toContain("continuity-equation");
    expect(
      getReadNextRecommendations("drag-and-terminal-velocity").map((item) => item.slug),
    ).toContain("bernoullis-principle");
    expect(
      getReadNextRecommendations("temperature-and-internal-energy").map((item) => item.slug),
    ).toContain("ideal-gas-law-and-kinetic-theory");
    expect(
      getReadNextRecommendations("temperature-and-internal-energy").map((item) => item.slug),
    ).toContain("heat-transfer");
    expect(
      getReadNextRecommendations("temperature-and-internal-energy").map((item) => item.slug),
    ).toContain("specific-heat-and-phase-change");
    expect(
      getReadNextRecommendations("ideal-gas-law-and-kinetic-theory").map((item) => item.slug),
    ).toContain("temperature-and-internal-energy");
    expect(
      getReadNextRecommendations("ideal-gas-law-and-kinetic-theory").map((item) => item.slug),
    ).toContain("heat-transfer");
    expect(
      getReadNextRecommendations("ideal-gas-law-and-kinetic-theory").map((item) => item.slug),
    ).toContain("specific-heat-and-phase-change");
    expect(getReadNextRecommendations("heat-transfer").map((item) => item.slug)).toContain(
      "temperature-and-internal-energy",
    );
    expect(getReadNextRecommendations("heat-transfer").map((item) => item.slug)).toContain(
      "ideal-gas-law-and-kinetic-theory",
    );
    expect(getReadNextRecommendations("heat-transfer").map((item) => item.slug)).toContain(
      "specific-heat-and-phase-change",
    );
    expect(
      getReadNextRecommendations("specific-heat-and-phase-change").map((item) => item.slug),
    ).toContain("ideal-gas-law-and-kinetic-theory");
    expect(
      getReadNextRecommendations("specific-heat-and-phase-change").map((item) => item.slug),
    ).toContain("heat-transfer");
    expect(
      getReadNextRecommendations("circular-orbits-orbital-speed").map((item) => item.slug),
    ).toContain("keplers-third-law-orbital-periods");
    expect(
      getReadNextRecommendations("circular-orbits-orbital-speed").map((item) => item.slug),
    ).toContain("gravitational-potential-energy");
    expect(
      getReadNextRecommendations("keplers-third-law-orbital-periods").map((item) => item.slug),
    ).toContain("escape-velocity");
    expect(
      getReadNextRecommendations("keplers-third-law-orbital-periods").map((item) => item.slug),
    ).toContain("gravitational-potential-energy");
    expect(
      getReadNextRecommendations("circular-orbits-orbital-speed").map((item) => item.slug),
    ).toContain("escape-velocity");
    expect(
      getReadNextRecommendations("escape-velocity").map((item) => item.slug),
    ).toContain("keplers-third-law-orbital-periods");
    expect(getReadNextRecommendations("escape-velocity").map((item) => item.slug)).toContain(
      "circular-orbits-orbital-speed",
    );
    expect(getReadNextRecommendations("escape-velocity").map((item) => item.slug)).toContain(
      "gravitational-potential-energy",
    );
    expect(getReadNextRecommendations("electric-fields").map((item) => item.slug)).toContain(
      "electric-potential",
    );
    expect(getReadNextRecommendations("electric-fields").map((item) => item.slug)).toContain(
      "magnetic-fields",
    );
    expect(
      getReadNextRecommendations("electric-potential").map((item) => item.slug),
    ).toContain("capacitance-and-stored-electric-energy");
    expect(getReadNextRecommendations("basic-circuits").map((item) => item.slug)).toContain(
      "series-parallel-circuits",
    );
    expect(getReadNextRecommendations("basic-circuits").map((item) => item.slug)).toContain(
      "equivalent-resistance",
    );
    expect(getReadNextRecommendations("basic-circuits").map((item) => item.slug)).toContain(
      "power-energy-circuits",
    );
    expect(
      getReadNextRecommendations("series-parallel-circuits").map((item) => item.slug),
    ).toContain("kirchhoff-loop-and-junction-rules");
    expect(
      getReadNextRecommendations("series-parallel-circuits").map((item) => item.slug),
    ).toContain("equivalent-resistance");
    expect(
      getReadNextRecommendations("kirchhoff-loop-and-junction-rules").map((item) => item.slug),
    ).toContain("equivalent-resistance");
    expect(
      getReadNextRecommendations("kirchhoff-loop-and-junction-rules").map((item) => item.slug),
    ).toContain("power-energy-circuits");
    expect(
      getReadNextRecommendations("equivalent-resistance").map((item) => item.slug),
    ).toContain("power-energy-circuits");
    expect(
      getReadNextRecommendations("equivalent-resistance").map((item) => item.slug),
    ).toContain("basic-circuits");
    expect(getReadNextRecommendations("power-energy-circuits").map((item) => item.slug)).toContain(
      "internal-resistance-and-terminal-voltage",
    );
    expect(getReadNextRecommendations("power-energy-circuits").map((item) => item.slug)).toContain(
      "series-parallel-circuits",
    );
    expect(getReadNextRecommendations("power-energy-circuits").map((item) => item.slug)).toContain(
      "equivalent-resistance",
    );
    expect(
      getReadNextRecommendations("electric-potential").map((item) => item.slug),
    ).toContain("basic-circuits");
    expect(
      getReadNextRecommendations("capacitance-and-stored-electric-energy").map(
        (item) => item.slug,
      ),
    ).toContain("rc-charging-and-discharging");
    expect(
      getReadNextRecommendations("capacitance-and-stored-electric-energy").map(
        (item) => item.slug,
      ),
    ).toContain("basic-circuits");
    expect(
      getReadNextRecommendations("capacitance-and-stored-electric-energy").map(
        (item) => item.slug,
      ),
    ).toContain("power-energy-circuits");
    expect(
      getReadNextRecommendations("power-energy-circuits").map((item) => item.slug),
    ).not.toContain("electric-fields");
    expect(
      getReadNextRecommendations("internal-resistance-and-terminal-voltage").map(
        (item) => item.slug,
      ),
    ).toContain("power-energy-circuits");
    expect(
      getReadNextRecommendations("internal-resistance-and-terminal-voltage").map(
        (item) => item.slug,
      ),
    ).toContain("kirchhoff-loop-and-junction-rules");
    expect(
      getReadNextRecommendations("electric-potential").map((item) => item.slug),
    ).not.toContain("wave-interference");
    expect(getReadNextRecommendations("magnetic-fields").map((item) => item.slug)).toContain(
      "electromagnetic-induction",
    );
    expect(getReadNextRecommendations("magnetic-fields").map((item) => item.slug)).toContain(
      "magnetic-force-moving-charges-currents",
    );
    expect(getReadNextRecommendations("magnetic-fields").map((item) => item.slug)).toContain(
      "maxwells-equations-synthesis",
    );
    expect(
      getReadNextRecommendations("electromagnetic-induction").map((item) => item.slug),
    ).toContain("electromagnetic-waves");
    expect(
      getReadNextRecommendations("electromagnetic-induction").map((item) => item.slug),
    ).toContain("magnetic-force-moving-charges-currents");
    expect(
      getReadNextRecommendations("electromagnetic-induction").map((item) => item.slug),
    ).toContain("maxwells-equations-synthesis");
    expect(
      getReadNextRecommendations("maxwells-equations-synthesis").map((item) => item.slug),
    ).toContain("electromagnetic-waves");
    expect(
      getReadNextRecommendations("maxwells-equations-synthesis").map((item) => item.slug),
    ).toContain("light-spectrum-linkage");
    expect(
      getReadNextRecommendations("maxwells-equations-synthesis").map((item) => item.slug),
    ).toContain("magnetic-force-moving-charges-currents");
    expect(
      getReadNextRecommendations("electromagnetic-waves").map((item) => item.slug),
    ).toContain("light-spectrum-linkage");
    expect(
      getReadNextRecommendations("electromagnetic-waves").map((item) => item.slug),
    ).toContain("polarization");
    expect(
      getReadNextRecommendations("electromagnetic-waves").map((item) => item.slug),
    ).toContain("refraction-snells-law");
    expect(
      getReadNextRecommendations("light-spectrum-linkage").map((item) => item.slug),
    ).toContain("polarization");
    expect(
      getReadNextRecommendations("light-spectrum-linkage").map((item) => item.slug),
    ).toContain("diffraction");
    expect(
      getReadNextRecommendations("light-spectrum-linkage").map((item) => item.slug),
    ).toContain("refraction-snells-law");
    expect(
      getReadNextRecommendations("light-spectrum-linkage", 4).map((item) => item.slug),
    ).toContain("photoelectric-effect");
    expect(getReadNextRecommendations("polarization").map((item) => item.slug)).toContain(
      "diffraction",
    );
    expect(getReadNextRecommendations("polarization").map((item) => item.slug)).toContain(
      "refraction-snells-law",
    );
    expect(getReadNextRecommendations("polarization").map((item) => item.slug)).toContain(
      "photoelectric-effect",
    );
    expect(getReadNextRecommendations("diffraction").map((item) => item.slug)).toContain(
      "double-slit-interference",
    );
    expect(getReadNextRecommendations("diffraction").map((item) => item.slug)).toContain(
      "optical-resolution-imaging-limits",
    );
    expect(getReadNextRecommendations("diffraction").map((item) => item.slug)).toContain(
      "wave-interference",
    );
    expect(getReadNextRecommendations("diffraction", 4).map((item) => item.slug)).toContain(
      "refraction-snells-law",
    );
    expect(
      getReadNextRecommendations("electromagnetic-waves", 4).map((item) => item.slug),
    ).toContain("wave-interference");
    expect(
      getReadNextRecommendations("photoelectric-effect").map((item) => item.slug),
    ).toContain("electric-potential");
    expect(
      getReadNextRecommendations("photoelectric-effect").map((item) => item.slug),
    ).toContain("atomic-spectra");
    expect(
      getReadNextRecommendations("photoelectric-effect").map((item) => item.slug),
    ).toContain("light-spectrum-linkage");
    expect(
      getReadNextRecommendations("atomic-spectra").map((item) => item.slug),
    ).toContain("photoelectric-effect");
    expect(
      getReadNextRecommendations("atomic-spectra").map((item) => item.slug),
    ).toContain("de-broglie-matter-waves");
    expect(
      getReadNextRecommendations("atomic-spectra").map((item) => item.slug),
    ).toContain("bohr-model");
    expect(
      getReadNextRecommendations("de-broglie-matter-waves").map((item) => item.slug),
    ).toContain("bohr-model");
    expect(
      getReadNextRecommendations("de-broglie-matter-waves").map((item) => item.slug),
    ).toContain("atomic-spectra");
    expect(
      getReadNextRecommendations("de-broglie-matter-waves").map((item) => item.slug),
    ).toContain("wave-speed-wavelength");
    expect(
      getReadNextRecommendations("bohr-model").map((item) => item.slug),
    ).toContain("atomic-spectra");
    expect(
      getReadNextRecommendations("bohr-model").map((item) => item.slug),
    ).toContain("de-broglie-matter-waves");
    expect(
      getReadNextRecommendations("bohr-model").map((item) => item.slug),
    ).toContain("radioactivity-half-life");
    expect(
      getReadNextRecommendations("bohr-model").map((item) => item.slug),
    ).not.toContain("light-spectrum-linkage");
    expect(
      getReadNextRecommendations("radioactivity-half-life").map((item) => item.slug),
    ).toContain("bohr-model");
    expect(
      getReadNextRecommendations("radioactivity-half-life").map((item) => item.slug),
    ).toContain("atomic-spectra");
    expect(
      getReadNextRecommendations("radioactivity-half-life").map((item) => item.slug),
    ).toContain("photoelectric-effect");
    expect(
      getReadNextRecommendations("graph-transformations").map((item) => item.slug),
    ).toContain("exponential-change-growth-decay-logarithms");
    expect(
      getReadNextRecommendations("exponential-change-growth-decay-logarithms").map(
        (item) => item.slug,
      ),
    ).toContain("derivative-as-slope-local-rate-of-change");
    expect(
      getReadNextRecommendations("exponential-change-growth-decay-logarithms").map(
        (item) => item.slug,
      ),
    ).toContain("radioactivity-half-life");
    expect(
      getReadNextRecommendations("magnetic-force-moving-charges-currents").map(
        (item) => item.slug,
      ),
    ).toContain("uniform-circular-motion");
    expect(
      getReadNextRecommendations("magnetic-force-moving-charges-currents").map(
        (item) => item.slug,
      ),
    ).toContain("electric-fields");
    expect(
      getReadNextRecommendations("magnetic-force-moving-charges-currents").map(
        (item) => item.slug,
      ),
    ).toContain("basic-circuits");
    expect(
      getReadNextRecommendations("refraction-snells-law").map((item) => item.slug),
    ).toContain("total-internal-reflection");
    expect(
      getReadNextRecommendations("refraction-snells-law").map((item) => item.slug),
    ).toContain("diffraction");
    expect(
      getReadNextRecommendations("refraction-snells-law").map((item) => item.slug),
    ).toContain("dispersion-refractive-index-color");
    expect(
      getReadNextRecommendations("total-internal-reflection").map((item) => item.slug),
    ).toContain("mirrors");
    expect(
      getReadNextRecommendations("refraction-snells-law", 4).map((item) => item.slug),
    ).toContain("mirrors");
    expect(
      getReadNextRecommendations("refraction-snells-law", 5).map((item) => item.slug),
    ).toContain("lens-imaging");
    expect(
      getReadNextRecommendations("dispersion-refractive-index-color").map((item) => item.slug),
    ).toContain("total-internal-reflection");
    expect(
      getReadNextRecommendations("dispersion-refractive-index-color").map((item) => item.slug),
    ).toContain("lens-imaging");
    expect(getReadNextRecommendations("mirrors").map((item) => item.slug)).toContain(
      "lens-imaging",
    );
    expect(getReadNextRecommendations("mirrors").map((item) => item.slug)).toContain(
      "refraction-snells-law",
    );
    expect(
      getReadNextRecommendations("lens-imaging").map((item) => item.slug),
    ).toContain("mirrors");
    expect(
      getReadNextRecommendations("lens-imaging").map((item) => item.slug),
    ).toContain("optical-resolution-imaging-limits");
    expect(
      getReadNextRecommendations("lens-imaging").map((item) => item.slug),
    ).toContain("refraction-snells-law");
    expect(
      getReadNextRecommendations("lens-imaging", 4).map((item) => item.slug),
    ).toContain("wave-interference");
    expect(
      getReadNextRecommendations("optical-resolution-imaging-limits").map((item) => item.slug),
    ).toContain("double-slit-interference");
    expect(
      getReadNextRecommendations("optical-resolution-imaging-limits").map((item) => item.slug),
    ).toContain("lens-imaging");
    expect(
      getReadNextRecommendations("optical-resolution-imaging-limits").map((item) => item.slug),
    ).toContain("diffraction");
    expect(
      getReadNextRecommendations("sorting-and-algorithmic-trade-offs").map((item) => item.slug),
    ).toContain("graph-representation-and-adjacency-intuition");
    expect(
      getReadNextRecommendations("binary-search-halving-the-search-space")[0]?.slug,
    ).toBe("graph-representation-and-adjacency-intuition");
    expect(
      getReadNextRecommendations("graph-representation-and-adjacency-intuition")[0]?.slug,
    ).toBe("breadth-first-search-and-layered-frontiers");
    expect(
      getReadNextRecommendations("breadth-first-search-and-layered-frontiers")[0]?.slug,
    ).toBe("depth-first-search-and-backtracking-paths");
    expect(
      getReadNextRecommendations("depth-first-search-and-backtracking-paths")[0]?.slug,
    ).toBe("frontier-and-visited-state-on-graphs");
    expect(
      getReadNextRecommendations("frontier-and-visited-state-on-graphs").map(
        (item) => item.slug,
      ),
    ).toContain("sorting-and-algorithmic-trade-offs");
  });

  it("resolves metadata and catalog metrics without hardcoded component lists", () => {
    expect(getConceptMetadataById("concept-uniform-circular-motion").slug).toBe(
      "uniform-circular-motion",
    );
    expect(getConceptCatalogMetrics()).toMatchObject({
      totalConcepts: 97,
      totalTopics: 22,
    });
  });

  it("rejects broken registry recommended-next links", () => {
    const registry = getConceptRegistry().map((entry) => ({ ...entry }));
    registry[0] = {
      ...registry[0],
      recommendedNext: [{ slug: "not-real" }],
    };

    expect(() => validateConceptRegistry(registry)).toThrow(
      /recommendedNext slug/i
    );
  });

  it("rejects duplicate slugs", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) => ({
      ...concept,
    }));
    concepts[1] = {
      ...concepts[1],
      slug: "simple-harmonic-motion",
    };

    expect(() => validateConceptBundle(concepts as never, getAllConceptMetadata())).toThrow(
      /Duplicate concept slug/i
    );
  });

  it("rejects aliases that collide with an existing canonical slug", () => {
    const registry = getConceptRegistry().map((entry) => ({ ...entry }));
    registry[0] = {
      ...registry[0],
      aliases: ["electromagnetic-induction"],
    };

    expect(() => validateConceptRegistry(registry)).toThrow(/Duplicate concept alias or slug/i);
  });

  it("rejects quick-test questions with missing correct choices", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) => ({
      ...concept,
    }));
    concepts[2] = {
      ...concepts[2],
      quickTest: {
        ...concepts[2].quickTest,
        questions: [
          {
            ...concepts[2].quickTest.questions[0],
            correctChoiceId: "not-real",
          },
          ...concepts[2].quickTest.questions.slice(1),
        ],
      },
    };

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /quickTest question ".*" references missing correctChoiceId/i
    );
  });

  it("rejects quick-test wrong-answer feedback that points at unknown choices", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) => ({
      ...concept,
    }));
    concepts[0] = {
      ...concepts[0],
      quickTest: {
        ...concepts[0].quickTest,
        questions: [
          {
            ...concepts[0].quickTest.questions[0],
            selectedWrongExplanations: {
              notAChoice: "Broken reference",
            },
          },
          ...concepts[0].quickTest.questions.slice(1),
        ],
      },
    };

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /selectedWrongExplanation choice/i
    );
  });

  it("rejects quick-test show-me actions with missing graph targets", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) => ({
      ...concept,
    }));
    concepts[1] = {
      ...concepts[1],
      quickTest: {
        ...concepts[1].quickTest,
        questions: [
          {
            ...concepts[1].quickTest.questions[0],
            showMeAction: {
              ...concepts[1].quickTest.questions[0].showMeAction,
              highlightedGraphIds: ["not-a-graph"],
            },
          },
          ...concepts[1].quickTest.questions.slice(1),
        ],
      },
    };

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /showMeAction graph/i
    );
  });

  it("rejects static quick-test modes that cannot reach the five-question minimum", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) => ({
      ...concept,
    }));
    concepts[0] = withoutGuidedInlineChecks({
      ...concepts[0],
      quickTest: {
        ...concepts[0].quickTest,
        mode: "static",
        questionCount: 5,
        questions: concepts[0].quickTest.questions.slice(0, 2),
      },
    });

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /quickTest mode "static" only authors 2 questions/i,
    );
  });

  it("rejects quick-test generated templates that reference missing worked examples", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) => ({
      ...concept,
    }));
    concepts[0] = withoutGuidedInlineChecks({
      ...concepts[0],
      quickTest: {
        ...concepts[0].quickTest,
        mode: "generated",
        questionCount: 5,
        questions: [],
        templates: [
          {
            id: "broken-template",
            kind: "worked-example-result",
            exampleId: "not-a-worked-example",
          },
        ],
      },
    });

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /quickTest template "broken-template" references missing worked example/i,
    );
  });

  it("rejects worked examples that reference unknown variable links", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) => ({
      ...concept,
    }));
    concepts[0] = {
      ...concepts[0],
      sections: {
        ...concepts[0].sections,
        workedExamples: {
          ...concepts[0].sections.workedExamples,
          items: [
            {
              ...concepts[0].sections.workedExamples.items[0],
              variables: concepts[0].sections.workedExamples.items[0].variables.map(
                (variable, index) =>
                  index === 0
                    ? {
                        ...variable,
                        variableId: "not-a-variable",
                      }
                    : variable
              ),
            },
            ...concepts[0].sections.workedExamples.items.slice(1),
          ],
        },
      },
    };

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /workedExamples item ".*" references unknown variableId/i
    );
  });

  it("rejects notice prompts that reference missing graph tabs", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) => ({
      ...concept,
    }));
    concepts[0] = {
      ...concepts[0],
      noticePrompts: {
        ...concepts[0].noticePrompts,
        items: [
          {
            ...concepts[0].noticePrompts.items[0],
            conditions: {
              ...concepts[0].noticePrompts.items[0].conditions,
              graphTabs: ["not-a-graph"],
            },
          },
          ...concepts[0].noticePrompts.items.slice(1),
        ],
      },
    };

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /noticePrompts item ".*" references unknown graphTab/i
    );
  });

  it("rejects notice prompts that reference missing related controls", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) => ({
      ...concept,
    }));
    concepts[1] = {
      ...concepts[1],
      noticePrompts: {
        ...concepts[1].noticePrompts,
        items: [
          {
            ...concepts[1].noticePrompts.items[0],
            relatedControls: ["not-a-control"],
          },
          ...concepts[1].noticePrompts.items.slice(1),
        ],
      },
    };

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /noticePrompts item ".*" references unknown related control/i
    );
  });

  it("rejects simulation.ui initialGraphId values that reference missing graphs", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) => ({
      ...concept,
    }));
    concepts[0] = {
      ...concepts[0],
      simulation: {
        ...concepts[0].simulation,
        ui: {
          ...concepts[0].simulation.ui,
          initialGraphId: "not-a-graph",
        },
      },
    };

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /simulation\.ui\.initialGraphId references unknown graph/i,
    );
  });

  it("rejects simulation.ui primaryControlIds values that reference missing controls", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) => ({
      ...concept,
    }));
    concepts[0] = {
      ...concepts[0],
      simulation: {
        ...concepts[0].simulation,
        ui: {
          ...concepts[0].simulation.ui,
          primaryControlIds: ["amplitude", "not-a-control"],
        },
      },
    };

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /simulation\.ui\.primaryControlIds references unknown control/i,
    );
  });

  it("rejects simulation.ui primaryGraphIds values that reference missing graphs", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) => ({
      ...concept,
    }));
    concepts[0] = {
      ...concepts[0],
      simulation: {
        ...concepts[0].simulation,
        ui: {
          ...concepts[0].simulation.ui,
          primaryGraphIds: ["displacement", "not-a-graph"],
        },
      },
    };

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /simulation\.ui\.primaryGraphIds references unknown graph/i,
    );
  });

  it("rejects simulation.ui initialGraphId values that are not part of authored primaryGraphIds", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) => ({
      ...concept,
    }));
    concepts[0] = {
      ...concepts[0],
      simulation: {
        ...concepts[0].simulation,
        ui: {
          ...concepts[0].simulation.ui,
          initialGraphId: "displacement",
          primaryGraphIds: ["velocity"],
        },
      },
    };

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /simulation\.ui\.initialGraphId must be included in simulation\.ui\.primaryGraphIds/i,
    );
  });

  it("rejects simulation.ui primaryPresetIds values that reference missing presets", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) => ({
      ...concept,
    }));
    concepts[0] = {
      ...concepts[0],
      simulation: {
        ...concepts[0].simulation,
        ui: {
          ...concepts[0].simulation.ui,
          primaryPresetIds: ["phase-shifted", "not-a-preset"],
        },
      },
    };

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /simulation\.ui\.primaryPresetIds references unknown preset/i,
    );
  });

  it("rejects worked examples that highlight missing overlays", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) => ({
      ...concept,
    }));
    concepts[2] = {
      ...concepts[2],
      sections: {
        ...concepts[2].sections,
        workedExamples: {
          ...concepts[2].sections.workedExamples,
          items: [
            {
              ...concepts[2].sections.workedExamples.items[0],
              applyAction: {
                ...concepts[2].sections.workedExamples.items[0].applyAction,
                highlightedOverlayIds: ["not-an-overlay"],
              },
            },
            ...concepts[2].sections.workedExamples.items.slice(1),
          ],
        },
      },
    };

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /workedExamples item ".*" highlights unknown applyAction overlay/i
    );
  });

  it("rejects prediction scenarios with missing preset references", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) => ({
      ...concept,
    }));
    concepts[0] = {
      ...concepts[0],
      predictionMode: {
        ...concepts[0].predictionMode,
        items: [
          {
            ...concepts[0].predictionMode.items[0],
            apply: { presetId: "not-real" },
          },
          ...concepts[0].predictionMode.items.slice(1),
        ],
      },
    };

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /predictionMode item ".*" references missing presetId/i
    );
  });

  it("rejects prediction patches that target unknown controls", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) => ({
      ...concept,
    }));
    concepts[1] = {
      ...concepts[1],
      predictionMode: {
        ...concepts[1].predictionMode,
        items: [
          {
            ...concepts[1].predictionMode.items[0],
            apply: { patch: { notAControl: 1 } },
          },
          ...concepts[1].predictionMode.items.slice(1),
        ],
      },
    };

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /predictionMode item ".*" patches unknown control param/i
    );
  });

  it("rejects challenge-mode metrics that do not belong to the simulation kind", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) => ({
      ...concept,
    }));
    concepts[0] = {
      ...concepts[0],
      challengeMode: {
        ...concepts[0].challengeMode!,
        items: [
          {
            ...concepts[0].challengeMode!.items[0],
            checks: [
              {
                type: "metric-range" as const,
                label: "Broken metric",
                metric: "range",
                min: 0,
                max: 1,
              },
            ],
          },
          ...concepts[0].challengeMode!.items.slice(1),
        ],
      },
    };

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /unsupported metric/i
    );
  });

  it("normalizes compact challenge targets into explicit compare-metric checks", () => {
    const concept = getConceptBySlug("uniform-circular-motion");
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "ucm-ch-match-period-change-pull",
    );

    expect(item?.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "compare-metric-range",
          setup: "b",
          metric: "period",
        }),
        expect.objectContaining({
          type: "compare-metric-range",
          setup: "b",
          metric: "speed",
        }),
      ]),
    );
  });

  it("rejects compare-metric challenge checks that do not belong to the simulation kind", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) => ({
      ...concept,
    }));
    concepts[0] = {
      ...concepts[0],
      challengeMode: {
        ...concepts[0].challengeMode!,
        items: [
          {
            ...concepts[0].challengeMode!.items[0],
            setup: {
              ...concepts[0].challengeMode!.items[0].setup,
              interactionMode: "compare",
            },
            checks: [
              {
                type: "compare-metric-range" as const,
                label: "Broken compare metric",
                setup: "b",
                metric: "range",
                min: 0,
                max: 1,
              },
            ],
          },
          ...concepts[0].challengeMode!.items.slice(1),
        ],
      },
    };

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /unsupported compare metric/i
    );
  });

  it("rejects overlay guidance that points at unknown references", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) => ({
      ...concept,
    }));
    concepts[2] = {
      ...concepts[2],
      simulation: {
        ...concepts[2].simulation,
        overlays: concepts[2].simulation.overlays?.map((overlay, index) =>
          index === 0
            ? {
                ...overlay,
                relatedGraphTabs: ["not-a-graph"],
              }
            : overlay
        ),
      },
    };

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /overlay ".*" references unknown related graph tab/i
    );
  });
});
