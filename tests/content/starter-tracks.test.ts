import { describe, expect, it } from "vitest";
import {
  getStarterTrackMembershipsForConcept,
  getStarterTrackDiscoveryHighlights,
  getStarterTracks,
  validateStarterTrackCatalog,
  type StarterTrackMetadata,
} from "@/lib/content";

describe("starter track catalog", () => {
  it("loads the shipped starter tracks in canonical order", () => {
    const tracks = getStarterTracks();

    expect(tracks.map((track) => track.slug)).toEqual([
      "motion-and-circular-motion",
      "rotational-mechanics",
      "gravity-and-orbits",
      "oscillations-and-energy",
      "fluid-and-pressure",
      "waves",
      "thermodynamics-and-kinetic-theory",
      "electricity",
      "magnetic-fields",
      "sound-and-acoustics",
      "wave-optics",
      "modern-physics",
      "functions-and-change",
      "complex-and-parametric-motion",
      "vectors-and-motion-bridge",
      "rates-and-equilibrium",
      "stoichiometry-and-yield",
      "solutions-and-ph",
      "algorithms-and-search-foundations",
    ]);

    expect(tracks[0].concepts.map((concept) => concept.slug)).toEqual([
      "vectors-components",
      "projectile-motion",
      "uniform-circular-motion",
    ]);
    expect(tracks[0].checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
      "motion-projectile-checkpoint",
      "motion-circular-checkpoint",
    ]);
    expect(tracks[0].entryDiagnostic).toMatchObject({
      title: "Check the motion foundations first",
      skipToConcept: { slug: "uniform-circular-motion" },
      probes: expect.arrayContaining([
        expect.objectContaining({
          kind: "quick-test",
          concept: expect.objectContaining({ slug: "vectors-components" }),
        }),
        expect.objectContaining({
          kind: "challenge",
          concept: expect.objectContaining({ slug: "projectile-motion" }),
          challengeId: "pm-ch-flat-far-shot",
        }),
      ]),
    });
    expect(tracks[0].checkpoints[0]).toMatchObject({
      afterConcept: { slug: "projectile-motion" },
      challenge: {
        challengeId: "pm-ch-flat-far-shot",
        concept: { slug: "projectile-motion" },
        title: "Flat long shot",
        depth: "core",
      },
    });
    expect(tracks[1]).toMatchObject({
      title: "Rotational Mechanics",
      discoveryHighlight: true,
      prerequisiteTrackSlugs: ["motion-and-circular-motion"],
      recommendedNextTrackSlugs: ["gravity-and-orbits"],
    });
    expect(tracks[1].concepts.map((concept) => concept.slug)).toEqual([
      "torque",
      "static-equilibrium-centre-of-mass",
      "rotational-inertia",
      "rolling-motion",
      "angular-momentum",
    ]);
    expect(tracks[1].entryDiagnostic).toMatchObject({
      skipToConcept: { slug: "rotational-inertia" },
      probes: expect.arrayContaining([
        expect.objectContaining({
          kind: "quick-test",
          concept: expect.objectContaining({ slug: "torque" }),
        }),
        expect.objectContaining({
          kind: "challenge",
          concept: expect.objectContaining({ slug: "static-equilibrium-centre-of-mass" }),
          challengeId: "secm-ch-balance-heavy-right-load",
        }),
      ]),
    });
    expect(tracks[1].checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
      "rotational-balance-checkpoint",
      "rotational-rolling-checkpoint",
      "rotational-angular-momentum-checkpoint",
    ]);
    expect(tracks[1].checkpoints[0]).toMatchObject({
      afterConcept: { slug: "static-equilibrium-centre-of-mass" },
      challenge: {
        challengeId: "secm-ch-balance-heavy-right-load",
        concept: { slug: "static-equilibrium-centre-of-mass" },
        title: "Balance the heavy right load",
      },
    });
    expect(tracks[1].checkpoints[1]).toMatchObject({
      afterConcept: { slug: "rolling-motion" },
      challenge: {
        challengeId: "rolling-motion-ch-compare-race",
        concept: { slug: "rolling-motion" },
        title: "Same ramp, different finish",
      },
    });
    expect(tracks[1].checkpoints[2]).toMatchObject({
      afterConcept: { slug: "angular-momentum" },
      challenge: {
        challengeId: "angular-momentum-ch-compare-same-l",
        concept: { slug: "angular-momentum" },
        title: "Same L, different spin",
      },
    });
    expect(tracks[2]).toMatchObject({
      title: "Gravity and Orbits",
      heroTrack: true,
      prerequisiteTrackSlugs: ["motion-and-circular-motion"],
    });
    expect(tracks[2].concepts.map((concept) => concept.slug)).toEqual([
      "gravitational-fields",
      "gravitational-potential-energy",
      "circular-orbits-orbital-speed",
      "keplers-third-law-orbital-periods",
      "escape-velocity",
    ]);
    expect(tracks[2].entryDiagnostic).toMatchObject({
      skipToConcept: { slug: "circular-orbits-orbital-speed" },
      probes: expect.arrayContaining([
        expect.objectContaining({
          kind: "quick-test",
          concept: expect.objectContaining({ slug: "gravitational-fields" }),
        }),
        expect.objectContaining({
          kind: "challenge",
          concept: expect.objectContaining({ slug: "gravitational-potential-energy" }),
          challengeId: "gp-ch-half-potential-quarter-field",
        }),
      ]),
    });
    expect(tracks[2].checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
      "gravity-potential-bridge-checkpoint",
      "gravity-kepler-year-checkpoint",
      "gravity-escape-threshold-checkpoint",
    ]);
    expect(tracks[2].checkpoints[0]).toMatchObject({
      afterConcept: { slug: "gravitational-potential-energy" },
      challenge: {
        challengeId: "gp-ch-half-potential-quarter-field",
        concept: { slug: "gravitational-potential-energy" },
        title: "Half the potential, quarter the field",
      },
    });
    expect(tracks[2].checkpoints[1]).toMatchObject({
      afterConcept: { slug: "keplers-third-law-orbital-periods" },
      challenge: {
        challengeId: "ktl-ch-inner-vs-outer-years",
        concept: { slug: "keplers-third-law-orbital-periods" },
        title: "Inner year vs outer year",
      },
    });
    expect(tracks[2].checkpoints[2]).toMatchObject({
      afterConcept: { slug: "escape-velocity" },
      challenge: {
        challengeId: "ev-ch-remove-turnaround",
        concept: { slug: "escape-velocity" },
        title: "Remove the finite turnaround",
      },
    });
    expect(tracks[3].estimatedStudyMinutes).toBeGreaterThan(0);
    expect(tracks[4].concepts.map((concept) => concept.slug)).toEqual([
      "pressure-and-hydrostatic-pressure",
      "continuity-equation",
      "bernoullis-principle",
      "buoyancy-and-archimedes-principle",
      "drag-and-terminal-velocity",
    ]);
    expect(tracks[4]).toMatchObject({
      title: "Fluid and Pressure",
      discoveryHighlight: true,
    });
    expect(tracks[4].entryDiagnostic).toMatchObject({
      skipToConcept: { slug: "buoyancy-and-archimedes-principle" },
      probes: expect.arrayContaining([
        expect.objectContaining({
          kind: "quick-test",
          concept: expect.objectContaining({ slug: "pressure-and-hydrostatic-pressure" }),
        }),
        expect.objectContaining({
          kind: "quick-test",
          concept: expect.objectContaining({ slug: "continuity-equation" }),
        }),
        expect.objectContaining({
          kind: "challenge",
          concept: expect.objectContaining({ slug: "bernoullis-principle" }),
          challengeId: "bp-ch-wider-b-recovers-pressure",
        }),
      ]),
    });
    expect(tracks[4].checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
      "fluids-hydrostatic-checkpoint",
      "fluids-flow-pressure-checkpoint",
      "fluids-terminal-speed-checkpoint",
    ]);
    expect(tracks[4].checkpoints[1]).toMatchObject({
      afterConcept: { slug: "bernoullis-principle" },
      challenge: {
        challengeId: "bp-ch-wider-b-recovers-pressure",
        concept: { slug: "bernoullis-principle" },
        title: "Same entry state, wider B recovers pressure",
      },
    });
    expect(tracks[4].checkpoints[2]).toMatchObject({
      afterConcept: { slug: "drag-and-terminal-velocity" },
      challenge: {
        challengeId: "dtv-ch-freeze-near-terminal",
        concept: { slug: "drag-and-terminal-velocity" },
        title: "Catch the near-terminal moment",
      },
    });
    expect(tracks[5].concepts.map((concept) => concept.slug)).toEqual([
      "simple-harmonic-motion",
      "wave-speed-wavelength",
      "sound-waves-longitudinal-motion",
      "pitch-frequency-loudness-intensity",
      "beats",
      "doppler-effect",
      "wave-interference",
      "standing-waves",
      "resonance-air-columns-open-closed-pipes",
    ]);
    expect(tracks[5].sequenceRationale).toMatch(/air-column resonance|open and closed/i);
    expect(tracks[5].highlights).toContain("Pitch vs loudness");
    expect(tracks[5].highlights).toContain("Open vs closed pipes");
    expect(tracks[5].recommendedNextTrackSlugs).toEqual(["sound-and-acoustics"]);
    expect(tracks[6].title).toBe("Thermodynamics and Kinetic Theory");
    expect(tracks[6].concepts.map((concept) => concept.slug)).toEqual([
      "temperature-and-internal-energy",
      "ideal-gas-law-and-kinetic-theory",
      "heat-transfer",
      "specific-heat-and-phase-change",
    ]);
    expect(tracks[6].entryDiagnostic).toMatchObject({
      skipToConcept: { slug: "heat-transfer" },
      probes: expect.arrayContaining([
        expect.objectContaining({
          kind: "quick-test",
          concept: expect.objectContaining({ slug: "temperature-and-internal-energy" }),
        }),
        expect.objectContaining({
          kind: "challenge",
          concept: expect.objectContaining({ slug: "ideal-gas-law-and-kinetic-theory" }),
          challengeId: "igkt-ch-same-pressure-different-cause",
        }),
      ]),
    });
    expect(tracks[6].checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
      "thermo-gas-bridge-checkpoint",
      "thermo-heat-flow-checkpoint",
      "thermo-heating-curve-checkpoint",
    ]);
    expect(tracks[6].checkpoints[0]).toMatchObject({
      afterConcept: { slug: "ideal-gas-law-and-kinetic-theory" },
      challenge: {
        challengeId: "igkt-ch-same-pressure-different-cause",
        concept: { slug: "ideal-gas-law-and-kinetic-theory" },
        title: "Match pressure with a different microscopic story",
      },
    });
    expect(tracks[6].checkpoints[1]).toMatchObject({
      afterConcept: { slug: "heat-transfer" },
      challenge: {
        challengeId: "ht-ch-slower-same-contrast",
        concept: { slug: "heat-transfer" },
        title: "Same contrast, slower loss",
      },
    });
    expect(tracks[6].checkpoints[2]).toMatchObject({
      afterConcept: { slug: "specific-heat-and-phase-change" },
      challenge: {
        challengeId: "shpc-ch-catch-the-real-shelf",
        concept: { slug: "specific-heat-and-phase-change" },
        title: "Catch the real shelf",
      },
    });
    expect(tracks[7].concepts.map((concept) => concept.slug)).toEqual([
      "electric-fields",
      "electric-potential",
      "basic-circuits",
      "power-energy-circuits",
      "series-parallel-circuits",
      "equivalent-resistance",
    ]);
    expect(tracks[7].checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
      "electricity-voltage-bridge-checkpoint",
      "electricity-reduction-checkpoint",
    ]);
    expect(tracks[7].checkpoints[0]).toMatchObject({
      afterConcept: { slug: "electric-potential" },
      challenge: {
        challengeId: "ep-ch-positive-midpoint-plateau",
        concept: { slug: "electric-potential" },
        title: "Positive midpoint plateau",
      },
    });
    expect(tracks[7].recommendedNextTrackSlugs).toEqual(["magnetic-fields"]);
    expect(tracks[7].entryDiagnostic).toMatchObject({
      skipToConcept: { slug: "basic-circuits" },
      probes: expect.arrayContaining([
        expect.objectContaining({
          kind: "quick-test",
          concept: expect.objectContaining({ slug: "electric-fields" }),
        }),
        expect.objectContaining({
          kind: "challenge",
          concept: expect.objectContaining({ slug: "electric-potential" }),
          challengeId: "ep-ch-positive-midpoint-plateau",
        }),
      ]),
    });
    expect(tracks[8].title).toBe("Magnetism");
    expect(tracks[8].concepts.map((concept) => concept.slug)).toEqual([
      "magnetic-fields",
      "electromagnetic-induction",
      "magnetic-force-moving-charges-currents",
    ]);
    expect(tracks[8].prerequisiteTrackSlugs).toEqual(["electricity"]);
    expect(tracks[8].entryDiagnostic).toMatchObject({
      skipToConcept: { slug: "magnetic-force-moving-charges-currents" },
      probes: expect.arrayContaining([
        expect.objectContaining({
          kind: "challenge",
          concept: expect.objectContaining({ slug: "magnetic-fields" }),
          challengeId: "mf-ch-build-upward-bridge",
        }),
        expect.objectContaining({
          kind: "challenge",
          concept: expect.objectContaining({ slug: "electromagnetic-induction" }),
          challengeId: "emi-ch-high-flux-zero-emf",
        }),
      ]),
    });
    expect(tracks[8].checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
      "magnetic-fields-superposition-checkpoint",
      "magnetic-induction-faraday-lenz-checkpoint",
      "magnetic-force-direction-checkpoint",
    ]);
    expect(tracks[8].checkpoints[0]).toMatchObject({
      afterConcept: { slug: "magnetic-fields" },
      challenge: {
        challengeId: "mf-ch-build-upward-bridge",
        concept: { slug: "magnetic-fields" },
        title: "Build the upward magnetic field",
      },
    });
    expect(tracks[8].checkpoints[1]).toMatchObject({
      afterConcept: { slug: "electromagnetic-induction" },
      challenge: {
        challengeId: "emi-ch-high-flux-zero-emf",
        concept: { slug: "electromagnetic-induction" },
        title: "High flux, zero emf",
      },
    });
    expect(tracks[8].checkpoints[2]).toMatchObject({
      afterConcept: { slug: "magnetic-force-moving-charges-currents" },
      challenge: {
        challengeId: "mfmc-ch-charge-down-wire-up",
        concept: { slug: "magnetic-force-moving-charges-currents" },
        title: "Charge down, wire up",
      },
    });
    expect(tracks[9]).toMatchObject({
      title: "Sound and Acoustics",
      discoveryHighlight: true,
      prerequisiteTrackSlugs: ["waves"],
    });
    expect(tracks[9].concepts.map((concept) => concept.slug)).toEqual([
      "sound-waves-longitudinal-motion",
      "pitch-frequency-loudness-intensity",
      "beats",
      "doppler-effect",
      "resonance-air-columns-open-closed-pipes",
    ]);
    expect(tracks[9].entryDiagnostic).toMatchObject({
      skipToConcept: { slug: "beats" },
      probes: expect.arrayContaining([
        expect.objectContaining({
          kind: "quick-test",
          concept: expect.objectContaining({ slug: "sound-waves-longitudinal-motion" }),
        }),
        expect.objectContaining({
          kind: "challenge",
          concept: expect.objectContaining({ slug: "pitch-frequency-loudness-intensity" }),
          challengeId: "pfli-ch-louder-same-pitch",
        }),
      ]),
    });
    expect(tracks[9].checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
      "sound-acoustics-pitch-checkpoint",
      "sound-acoustics-doppler-checkpoint",
      "sound-acoustics-air-column-checkpoint",
    ]);
    expect(tracks[9].checkpoints[2]).toMatchObject({
      afterConcept: { slug: "resonance-air-columns-open-closed-pipes" },
      challenge: {
        challengeId: "acr-ch-open-vs-closed-second-mode",
        concept: { slug: "resonance-air-columns-open-closed-pipes" },
        title: "Same slider, different harmonic family",
      },
    });
    expect(tracks[10]).toMatchObject({
      title: "Wave Optics",
      discoveryHighlight: true,
      prerequisiteTrackSlugs: ["waves"],
      recommendedNextTrackSlugs: ["modern-physics"],
    });
    expect(tracks[10].concepts.map((concept) => concept.slug)).toEqual([
      "polarization",
      "diffraction",
      "double-slit-interference",
      "dispersion-refractive-index-color",
      "optical-resolution-imaging-limits",
    ]);
    expect(tracks[10].entryDiagnostic).toMatchObject({
      skipToConcept: { slug: "dispersion-refractive-index-color" },
      probes: expect.arrayContaining([
        expect.objectContaining({
          kind: "quick-test",
          concept: expect.objectContaining({ slug: "polarization" }),
        }),
        expect.objectContaining({
          kind: "challenge",
          concept: expect.objectContaining({ slug: "diffraction" }),
          challengeId: "diff-ch-find-dark-band",
        }),
        expect.objectContaining({
          kind: "challenge",
          concept: expect.objectContaining({ slug: "double-slit-interference" }),
          challengeId: "dsi-ch-find-first-dark",
        }),
      ]),
    });
    expect(tracks[10].checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
      "wave-optics-diffraction-checkpoint",
      "wave-optics-double-slit-checkpoint",
      "wave-optics-resolution-checkpoint",
    ]);
    expect(tracks[10].checkpoints[0]).toMatchObject({
      afterConcept: { slug: "diffraction" },
      challenge: {
        challengeId: "diff-ch-find-dark-band",
        concept: { slug: "diffraction" },
        title: "Find the first dark band",
      },
    });
    expect(tracks[10].checkpoints[1]).toMatchObject({
      afterConcept: { slug: "double-slit-interference" },
      challenge: {
        challengeId: "dsi-ch-find-first-dark",
        concept: { slug: "double-slit-interference" },
        title: "Find the first dark fringe",
      },
    });
    expect(tracks[10].checkpoints[2]).toMatchObject({
      afterConcept: { slug: "optical-resolution-imaging-limits" },
      challenge: {
        challengeId: "or-ch-hit-rayleigh-threshold",
        concept: { slug: "optical-resolution-imaging-limits" },
        title: "Hit the Rayleigh threshold",
      },
    });
    expect(tracks[11]).toMatchObject({
      title: "Modern Physics",
      discoveryHighlight: true,
    });
    expect(tracks[11].concepts.map((concept) => concept.slug)).toEqual([
      "photoelectric-effect",
      "atomic-spectra",
      "de-broglie-matter-waves",
      "bohr-model",
      "radioactivity-half-life",
    ]);
    expect(tracks[11].entryDiagnostic).toMatchObject({
      skipToConcept: { slug: "bohr-model" },
      probes: expect.arrayContaining([
        expect.objectContaining({
          kind: "quick-test",
          concept: expect.objectContaining({ slug: "photoelectric-effect" }),
        }),
        expect.objectContaining({
          kind: "challenge",
          concept: expect.objectContaining({ slug: "atomic-spectra" }),
          challengeId: "as-ch-two-visible-emission",
        }),
        expect.objectContaining({
          kind: "challenge",
          concept: expect.objectContaining({ slug: "de-broglie-matter-waves" }),
          challengeId: "dbmw-ch-one-fit",
        }),
      ]),
    });
    expect(tracks[11].checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
      "modern-physics-threshold-line-checkpoint",
      "modern-physics-wave-fit-checkpoint",
      "modern-physics-half-life-checkpoint",
    ]);
    expect(tracks[11].checkpoints[0]).toMatchObject({
      afterConcept: { slug: "atomic-spectra" },
      challenge: {
        challengeId: "as-ch-two-visible-emission",
        concept: { slug: "atomic-spectra" },
        title: "Keep only two visible emission lines",
      },
    });
    expect(tracks[11].checkpoints[1]).toMatchObject({
      afterConcept: { slug: "de-broglie-matter-waves" },
      challenge: {
        challengeId: "dbmw-ch-one-fit",
        concept: { slug: "de-broglie-matter-waves" },
        title: "Find the one-fit electron",
      },
    });
    expect(tracks[11].checkpoints[2]).toMatchObject({
      afterConcept: { slug: "radioactivity-half-life" },
      challenge: {
        challengeId: "rhl-ch-half-life-checkpoint",
        concept: { slug: "radioactivity-half-life" },
        title: "Land on the one-half-life checkpoint",
      },
    });
    expect(tracks[12]).toMatchObject({
      title: "Functions and Change",
      discoveryHighlight: true,
      recommendedNextTrackSlugs: [
        "complex-and-parametric-motion",
        "vectors-and-motion-bridge",
      ],
      entryDiagnostic: {
        skipToConcept: { slug: "derivative-as-slope-local-rate-of-change" },
        probes: expect.arrayContaining([
          expect.objectContaining({
            kind: "quick-test",
            concept: expect.objectContaining({ slug: "graph-transformations" }),
          }),
          expect.objectContaining({
            kind: "challenge",
            concept: expect.objectContaining({
              slug: "rational-functions-asymptotes-and-behavior",
            }),
            challengeId: "rf-ch-separate-hole-from-asymptote",
          }),
          expect.objectContaining({
            kind: "quick-test",
            concept: expect.objectContaining({
              slug: "exponential-change-growth-decay-logarithms",
            }),
          }),
        ]),
      },
    });
    expect(tracks[12].entryDiagnostic?.probes).toHaveLength(3);
    expect(tracks[12].checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
      "functions-change-rational-checkpoint",
      "functions-change-exponential-checkpoint",
      "functions-change-derivative-checkpoint",
      "functions-change-limits-checkpoint",
      "functions-change-accumulation-checkpoint",
    ]);
    expect(tracks[12].checkpoints[0]).toMatchObject({
      afterConcept: { slug: "rational-functions-asymptotes-and-behavior" },
      challenge: {
        challengeId: "rf-ch-separate-hole-from-asymptote",
        concept: { slug: "rational-functions-asymptotes-and-behavior" },
        title: "Domain-break checkpoint",
      },
    });
    expect(tracks[12].checkpoints[1]).toMatchObject({
      afterConcept: { slug: "exponential-change-growth-decay-logarithms" },
      challenge: {
        challengeId: "exp-ch-quarter-target-two-half-lives",
        concept: { slug: "exponential-change-growth-decay-logarithms" },
        title: "Quarter-target checkpoint",
      },
    });
    expect(tracks[12].checkpoints[2]).toMatchObject({
      afterConcept: { slug: "derivative-as-slope-local-rate-of-change" },
      challenge: {
        challengeId: "ds-ch-catch-the-flat-tangent",
        concept: { slug: "derivative-as-slope-local-rate-of-change" },
        title: "Catch the flat tangent",
      },
    });
    expect(tracks[12].checkpoints[3]).toMatchObject({
      afterConcept: { slug: "limits-and-continuity-approaching-a-value" },
      challenge: {
        challengeId: "lc-ch-agreeing-sides-broken-continuity",
        concept: { slug: "limits-and-continuity-approaching-a-value" },
        title: "Continuity classification checkpoint",
      },
    });
    expect(tracks[12].checkpoints[4]).toMatchObject({
      afterConcept: { slug: "integral-as-accumulation-area" },
      challenge: {
        challengeId: "ia-ch-negative-height-positive-total",
        concept: { slug: "integral-as-accumulation-area" },
        title: "Negative height, positive total",
      },
    });
    expect(tracks[12].concepts.map((concept) => concept.slug)).toEqual([
      "graph-transformations",
      "rational-functions-asymptotes-and-behavior",
      "exponential-change-growth-decay-logarithms",
      "derivative-as-slope-local-rate-of-change",
      "limits-and-continuity-approaching-a-value",
      "integral-as-accumulation-area",
    ]);
    expect(tracks[13]).toMatchObject({
      title: "Complex and Parametric Motion",
      recommendedNextTrackSlugs: ["vectors-and-motion-bridge"],
      entryDiagnostic: {
        skipToConcept: { slug: "trig-identities-from-unit-circle-geometry" },
        probes: expect.arrayContaining([
          expect.objectContaining({
            kind: "quick-test",
            concept: expect.objectContaining({ slug: "complex-numbers-on-the-plane" }),
          }),
          expect.objectContaining({
            kind: "challenge",
            concept: expect.objectContaining({
              slug: "unit-circle-sine-cosine-from-rotation",
            }),
            challengeId: "ucr-ch-quadrant-two-sign-read",
          }),
          expect.objectContaining({
            kind: "challenge",
            concept: expect.objectContaining({
              slug: "polar-coordinates-radius-and-angle",
            }),
            challengeId: "polar-ch-second-quadrant-xy-bridge",
          }),
        ]),
      },
    });
    expect(tracks[13].entryDiagnostic?.probes).toHaveLength(3);
    expect(tracks[13].checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
      "complex-parametric-complex-checkpoint",
      "complex-parametric-unit-circle-checkpoint",
      "complex-parametric-inverse-angle-checkpoint",
      "complex-parametric-motion-checkpoint",
    ]);
    expect(tracks[13].checkpoints[0]).toMatchObject({
      afterConcept: { slug: "complex-numbers-on-the-plane" },
      challenge: {
        challengeId: "cnp-ch-rotate-to-positive-imaginary",
        concept: { slug: "complex-numbers-on-the-plane" },
        title: "Rotate onto the positive imaginary axis",
      },
    });
    expect(tracks[13].checkpoints[1]).toMatchObject({
      afterConcept: { slug: "unit-circle-sine-cosine-from-rotation" },
      challenge: {
        challengeId: "ucr-ch-quadrant-two-sign-read",
        concept: { slug: "unit-circle-sine-cosine-from-rotation" },
        title: "Quadrant II sign checkpoint",
      },
    });
    expect(tracks[13].checkpoints[2]).toMatchObject({
      afterConcept: { slug: "inverse-trig-angle-from-ratio" },
      challenge: {
        challengeId: "iatr-ch-quadrant-two-ratio-recovery",
        concept: { slug: "inverse-trig-angle-from-ratio" },
        title: "Quadrant II angle-from-ratio checkpoint",
      },
    });
    expect(tracks[13].checkpoints[3]).toMatchObject({
      afterConcept: { slug: "parametric-curves-motion-from-equations" },
      challenge: {
        challengeId: "pcm-ch-tall-fast-near-axis",
        concept: { slug: "parametric-curves-motion-from-equations" },
        title: "Tall, fast, and near the axis",
      },
    });
    expect(tracks[13].concepts.map((concept) => concept.slug)).toEqual([
      "complex-numbers-on-the-plane",
      "unit-circle-sine-cosine-from-rotation",
      "polar-coordinates-radius-and-angle",
      "trig-identities-from-unit-circle-geometry",
      "inverse-trig-angle-from-ratio",
      "parametric-curves-motion-from-equations",
    ]);
    expect(tracks[14]).toMatchObject({
      title: "Vectors and Motion Bridge",
      discoveryHighlight: true,
      recommendedNextTrackSlugs: ["motion-and-circular-motion"],
      entryDiagnostic: {
        skipToConcept: { slug: "vectors-components" },
        probes: expect.arrayContaining([
          expect.objectContaining({
            kind: "quick-test",
            concept: expect.objectContaining({ slug: "vectors-in-2d" }),
          }),
          expect.objectContaining({
            kind: "quick-test",
            concept: expect.objectContaining({ slug: "vectors-components" }),
          }),
          expect.objectContaining({
            kind: "challenge",
            concept: expect.objectContaining({ slug: "vectors-components" }),
            challengeId: "vc-ch-equal-components",
          }),
        ]),
      },
    });
    expect(tracks[14].entryDiagnostic?.probes).toHaveLength(3);
    expect(tracks[14].checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
      "vectors-bridge-combination-checkpoint",
      "vectors-bridge-components-checkpoint",
      "vectors-bridge-motion-checkpoint",
    ]);
    expect(tracks[14].checkpoints[0]).toMatchObject({
      afterConcept: { slug: "vectors-in-2d" },
      challenge: {
        challengeId: "v2d-ch-near-zero-result",
        concept: { slug: "vectors-in-2d" },
        title: "Near-zero resultant",
      },
    });
    expect(tracks[14].checkpoints[1]).toMatchObject({
      afterConcept: { slug: "vectors-components" },
      challenge: {
        challengeId: "vc-ch-equal-components",
        concept: { slug: "vectors-components" },
        title: "Equal components",
      },
    });
    expect(tracks[14].checkpoints[2]).toMatchObject({
      afterConcept: { slug: "vectors-components" },
      challenge: {
        challengeId: "vc-ch-hit-end-point",
        concept: { slug: "vectors-components" },
        title: "Hit the endpoint",
      },
    });
    expect(tracks[14].concepts.map((concept) => concept.slug)).toEqual([
      "vectors-in-2d",
      "vectors-components",
    ]);
    expect(tracks[15]).toMatchObject({
      title: "Rates and Equilibrium",
      discoveryHighlight: true,
      recommendedNextTrackSlugs: [
        "stoichiometry-and-yield",
        "solutions-and-ph",
        "thermodynamics-and-kinetic-theory",
      ],
      entryDiagnostic: {
        skipToConcept: { slug: "dynamic-equilibrium-le-chateliers-principle" },
        probes: expect.arrayContaining([
          expect.objectContaining({
            kind: "quick-test",
            concept: expect.objectContaining({ slug: "reaction-rate-collision-theory" }),
          }),
          expect.objectContaining({
            kind: "challenge",
            concept: expect.objectContaining({
              slug: "dynamic-equilibrium-le-chateliers-principle",
            }),
            challengeId: "de-ch-disturb-then-rebalance",
          }),
        ]),
      },
    });
    expect(tracks[15].checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
      "chemistry-rate-checkpoint",
      "chemistry-equilibrium-checkpoint",
    ]);
    expect(tracks[15].checkpoints[0]).toMatchObject({
      afterConcept: { slug: "reaction-rate-collision-theory" },
      challenge: {
        challengeId: "rrct-ch-more-success-not-just-more-hits",
        concept: { slug: "reaction-rate-collision-theory" },
        title: "More success, not just more hits",
      },
    });
    expect(tracks[15].checkpoints[1]).toMatchObject({
      afterConcept: { slug: "dynamic-equilibrium-le-chateliers-principle" },
      challenge: {
        challengeId: "de-ch-disturb-then-rebalance",
        concept: { slug: "dynamic-equilibrium-le-chateliers-principle" },
        title: "Disturb, then rebalance",
      },
    });
    expect(tracks[15].concepts.map((concept) => concept.slug)).toEqual([
      "reaction-rate-collision-theory",
      "dynamic-equilibrium-le-chateliers-principle",
    ]);
    expect(tracks[16]).toMatchObject({
      title: "Stoichiometry and Yield",
      recommendedNextTrackSlugs: ["solutions-and-ph", "rates-and-equilibrium"],
      entryDiagnostic: {
        skipToConcept: { slug: "percent-yield-and-reaction-extent" },
        probes: expect.arrayContaining([
          expect.objectContaining({
            kind: "quick-test",
            concept: expect.objectContaining({
              slug: "stoichiometric-ratios-and-recipe-batches",
            }),
          }),
          expect.objectContaining({
            kind: "challenge",
            concept: expect.objectContaining({
              slug: "limiting-reagent-and-leftover-reactants",
            }),
            challengeId: "lr-ch-make-b-the-limiting-reagent",
          }),
        ]),
      },
    });
    expect(tracks[16].checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
      "stoich-limiting-checkpoint",
      "stoich-yield-checkpoint",
    ]);
    expect(tracks[16].checkpoints[0]).toMatchObject({
      afterConcept: { slug: "limiting-reagent-and-leftover-reactants" },
      challenge: {
        challengeId: "lr-ch-make-b-the-limiting-reagent",
        concept: { slug: "limiting-reagent-and-leftover-reactants" },
        title: "Make B limit first",
      },
    });
    expect(tracks[16].checkpoints[1]).toMatchObject({
      afterConcept: { slug: "percent-yield-and-reaction-extent" },
      challenge: {
        challengeId: "pyre-ch-hit-seventy-five-percent-yield",
        concept: { slug: "percent-yield-and-reaction-extent" },
        title: "Hit 75% yield on a matched run",
      },
    });
    expect(tracks[16].concepts.map((concept) => concept.slug)).toEqual([
      "stoichiometric-ratios-and-recipe-batches",
      "limiting-reagent-and-leftover-reactants",
      "percent-yield-and-reaction-extent",
    ]);
    expect(tracks[17]).toMatchObject({
      title: "Solutions and pH",
      recommendedNextTrackSlugs: [
        "stoichiometry-and-yield",
        "rates-and-equilibrium",
        "thermodynamics-and-kinetic-theory",
      ],
      entryDiagnostic: {
        skipToConcept: { slug: "acid-base-ph-intuition" },
        probes: expect.arrayContaining([
          expect.objectContaining({
            kind: "quick-test",
            concept: expect.objectContaining({ slug: "concentration-and-dilution" }),
          }),
          expect.objectContaining({
            kind: "challenge",
            concept: expect.objectContaining({ slug: "solubility-and-saturation" }),
            challengeId: "ss-ch-dissolve-excess-without-removing-solute",
          }),
        ]),
      },
    });
    expect(tracks[17].checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
      "solutions-ph-dilution-checkpoint",
      "solutions-ph-saturation-checkpoint",
      "solutions-ph-neutral-checkpoint",
      "solutions-ph-buffer-checkpoint",
    ]);
    expect(tracks[17].checkpoints[0]).toMatchObject({
      afterConcept: { slug: "concentration-and-dilution" },
      challenge: {
        challengeId: "cd-ch-dilute-without-losing-solute",
        concept: { slug: "concentration-and-dilution" },
        title: "Dilute without losing solute",
      },
    });
    expect(tracks[17].checkpoints[1]).toMatchObject({
      afterConcept: { slug: "solubility-and-saturation" },
      challenge: {
        challengeId: "ss-ch-dissolve-excess-without-removing-solute",
        concept: { slug: "solubility-and-saturation" },
        title: "Dissolve the excess without removing solute",
      },
    });
    expect(tracks[17].checkpoints[2]).toMatchObject({
      afterConcept: { slug: "acid-base-ph-intuition" },
      challenge: {
        challengeId: "abph-ch-land-near-neutral",
        concept: { slug: "acid-base-ph-intuition" },
        title: "Land near neutral",
      },
    });
    expect(tracks[17].checkpoints[3]).toMatchObject({
      afterConcept: { slug: "buffers-and-neutralization" },
      challenge: {
        challengeId: "bn-ch-hold-near-neutral-under-acid-pulse",
        concept: { slug: "buffers-and-neutralization" },
        title: "Hold near neutral under an acid pulse",
      },
    });
    expect(tracks[17].concepts.map((concept) => concept.slug)).toEqual([
      "concentration-and-dilution",
      "solubility-and-saturation",
      "acid-base-ph-intuition",
      "buffers-and-neutralization",
    ]);
    expect(tracks[18]).toMatchObject({
      title: "Algorithms and Search Foundations",
      accent: "ink",
      entryDiagnostic: {
        skipToConcept: { slug: "graph-representation-and-adjacency-intuition" },
        probes: expect.arrayContaining([
          expect.objectContaining({
            kind: "quick-test",
            concept: expect.objectContaining({
              slug: "sorting-and-algorithmic-trade-offs",
            }),
          }),
          expect.objectContaining({
            kind: "challenge",
            concept: expect.objectContaining({
              slug: "binary-search-halving-the-search-space",
            }),
            challengeId: "bsh-ch-find-far-right-fast",
          }),
        ]),
      },
    });
    expect(tracks[18].checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
      "algorithms-search-sorting-checkpoint",
      "algorithms-search-binary-checkpoint",
    ]);
    expect(tracks[18].checkpoints[0]).toMatchObject({
      afterConcept: { slug: "sorting-and-algorithmic-trade-offs" },
      challenge: {
        challengeId: "sat-ch-use-nearly-sorted-insertion",
        concept: { slug: "sorting-and-algorithmic-trade-offs" },
        title: "Use insertion where it pays off",
      },
    });
    expect(tracks[18].checkpoints[1]).toMatchObject({
      afterConcept: { slug: "binary-search-halving-the-search-space" },
      challenge: {
        challengeId: "bsh-ch-find-far-right-fast",
        concept: { slug: "binary-search-halving-the-search-space" },
        title: "Find a far-right target fast",
      },
    });
    expect(tracks[18].concepts.map((concept) => concept.slug)).toEqual([
      "sorting-and-algorithmic-trade-offs",
      "binary-search-halving-the-search-space",
      "graph-representation-and-adjacency-intuition",
      "breadth-first-search-and-layered-frontiers",
      "depth-first-search-and-backtracking-paths",
      "frontier-and-visited-state-on-graphs",
    ]);
  });

  it("resolves concept memberships from the canonical track catalog", () => {
    expect(
      getStarterTrackMembershipsForConcept("simple-harmonic-motion").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["oscillations-and-energy", "waves"]);
    expect(
      getStarterTrackMembershipsForConcept("sound-waves-longitudinal-motion").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["waves", "sound-and-acoustics"]);
    expect(
      getStarterTrackMembershipsForConcept("photoelectric-effect").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["modern-physics"]);
    expect(
      getStarterTrackMembershipsForConcept("graph-transformations").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["functions-and-change"]);
    expect(
      getStarterTrackMembershipsForConcept("exponential-change-growth-decay-logarithms").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["functions-and-change"]);
    expect(
      getStarterTrackMembershipsForConcept("integral-as-accumulation-area").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["functions-and-change"]);
    expect(
      getStarterTrackMembershipsForConcept("limits-and-continuity-approaching-a-value").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["functions-and-change"]);
    expect(
      getStarterTrackMembershipsForConcept("complex-numbers-on-the-plane").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["complex-and-parametric-motion"]);
    expect(
      getStarterTrackMembershipsForConcept("unit-circle-sine-cosine-from-rotation").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["complex-and-parametric-motion"]);
    expect(
      getStarterTrackMembershipsForConcept("polar-coordinates-radius-and-angle").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["complex-and-parametric-motion"]);
    expect(
      getStarterTrackMembershipsForConcept("parametric-curves-motion-from-equations").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["complex-and-parametric-motion"]);
    expect(
      getStarterTrackMembershipsForConcept("vectors-in-2d").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["vectors-and-motion-bridge"]);
    expect(
      getStarterTrackMembershipsForConcept("vectors-components").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["motion-and-circular-motion", "vectors-and-motion-bridge"]);
    expect(
      getStarterTrackMembershipsForConcept("reaction-rate-collision-theory").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["rates-and-equilibrium"]);
    expect(
      getStarterTrackMembershipsForConcept("dynamic-equilibrium-le-chateliers-principle").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["rates-and-equilibrium"]);
    expect(
      getStarterTrackMembershipsForConcept("stoichiometric-ratios-and-recipe-batches").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["stoichiometry-and-yield"]);
    expect(
      getStarterTrackMembershipsForConcept("limiting-reagent-and-leftover-reactants").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["stoichiometry-and-yield"]);
    expect(
      getStarterTrackMembershipsForConcept("percent-yield-and-reaction-extent").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["stoichiometry-and-yield"]);
    expect(
      getStarterTrackMembershipsForConcept("concentration-and-dilution").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["solutions-and-ph"]);
    expect(
      getStarterTrackMembershipsForConcept("acid-base-ph-intuition").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["solutions-and-ph"]);
    expect(
      getStarterTrackMembershipsForConcept("sorting-and-algorithmic-trade-offs").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["algorithms-and-search-foundations"]);
    expect(
      getStarterTrackMembershipsForConcept("binary-search-halving-the-search-space").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["algorithms-and-search-foundations"]);
    expect(
      getStarterTrackMembershipsForConcept("graph-representation-and-adjacency-intuition").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["algorithms-and-search-foundations"]);
    expect(
      getStarterTrackMembershipsForConcept("frontier-and-visited-state-on-graphs").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["algorithms-and-search-foundations"]);
    expect(
      getStarterTrackMembershipsForConcept("polarization").map((membership) => membership.track.slug),
    ).toEqual(["wave-optics"]);
    expect(
      getStarterTrackMembershipsForConcept("torque").map((membership) => membership.track.slug),
    ).toEqual(["rotational-mechanics"]);

    expect(getStarterTrackMembershipsForConcept("projectile-motion")[0]).toMatchObject({
      stepIndex: 1,
      totalSteps: 3,
      previousConcept: { slug: "vectors-components" },
      nextConcept: { slug: "uniform-circular-motion" },
    });
    expect(getStarterTrackMembershipsForConcept("gravitational-potential-energy")[0]).toMatchObject({
      track: { slug: "gravity-and-orbits" },
      stepIndex: 1,
      totalSteps: 5,
      previousConcept: { slug: "gravitational-fields" },
      nextConcept: { slug: "circular-orbits-orbital-speed" },
    });
    expect(
      getStarterTrackMembershipsForConcept("pressure-and-hydrostatic-pressure")[0],
    ).toMatchObject({
      track: { slug: "fluid-and-pressure" },
      stepIndex: 0,
      totalSteps: 5,
      previousConcept: null,
      nextConcept: { slug: "continuity-equation" },
    });
    expect(getStarterTrackMembershipsForConcept("equivalent-resistance")[0]).toMatchObject({
      track: { slug: "electricity" },
      stepIndex: 5,
      totalSteps: 6,
      previousConcept: { slug: "series-parallel-circuits" },
      nextConcept: null,
    });
    expect(
      getStarterTrackMembershipsForConcept("specific-heat-and-phase-change")[0],
    ).toMatchObject({
      track: { slug: "thermodynamics-and-kinetic-theory" },
      stepIndex: 3,
      totalSteps: 4,
      previousConcept: { slug: "heat-transfer" },
      nextConcept: null,
    });
    expect(getStarterTrackMembershipsForConcept("angular-momentum")[0]).toMatchObject({
      track: { slug: "rotational-mechanics" },
      stepIndex: 4,
      totalSteps: 5,
      previousConcept: { slug: "rolling-motion" },
      nextConcept: null,
    });
    expect(getStarterTrackMembershipsForConcept("magnetic-fields")[0]).toMatchObject({
      track: { slug: "magnetic-fields" },
      stepIndex: 0,
      totalSteps: 3,
      previousConcept: null,
      nextConcept: { slug: "electromagnetic-induction" },
    });
    expect(getStarterTrackMembershipsForConcept("electromagnetic-induction")[0]).toMatchObject({
      track: { slug: "magnetic-fields" },
      stepIndex: 1,
      totalSteps: 3,
      previousConcept: { slug: "magnetic-fields" },
      nextConcept: { slug: "magnetic-force-moving-charges-currents" },
    });
    expect(
      getStarterTrackMembershipsForConcept("magnetic-force-moving-charges-currents")[0],
    ).toMatchObject({
      track: { slug: "magnetic-fields" },
      stepIndex: 2,
      totalSteps: 3,
      previousConcept: { slug: "electromagnetic-induction" },
      nextConcept: null,
    });
    expect(getStarterTrackMembershipsForConcept("bohr-model")[0]).toMatchObject({
      track: { slug: "modern-physics" },
      stepIndex: 3,
      totalSteps: 5,
      previousConcept: { slug: "de-broglie-matter-waves" },
      nextConcept: { slug: "radioactivity-half-life" },
    });
    expect(getStarterTrackMembershipsForConcept("optical-resolution-imaging-limits")[0]).toMatchObject({
      track: { slug: "wave-optics" },
      stepIndex: 4,
      totalSteps: 5,
      previousConcept: { slug: "dispersion-refractive-index-color" },
      nextConcept: null,
    });
    expect(getStarterTrackMembershipsForConcept("radioactivity-half-life")[0]).toMatchObject({
      track: { slug: "modern-physics" },
      stepIndex: 4,
      totalSteps: 5,
      previousConcept: { slug: "bohr-model" },
      nextConcept: null,
    });
    expect(
      getStarterTrackMembershipsForConcept("graph-transformations")[0],
    ).toMatchObject({
      track: { slug: "functions-and-change" },
      stepIndex: 0,
      totalSteps: 6,
      previousConcept: null,
      nextConcept: { slug: "rational-functions-asymptotes-and-behavior" },
    });
    expect(
      getStarterTrackMembershipsForConcept("exponential-change-growth-decay-logarithms")[0],
    ).toMatchObject({
      track: { slug: "functions-and-change" },
      stepIndex: 2,
      totalSteps: 6,
      previousConcept: { slug: "rational-functions-asymptotes-and-behavior" },
      nextConcept: { slug: "derivative-as-slope-local-rate-of-change" },
    });
    expect(
      getStarterTrackMembershipsForConcept("limits-and-continuity-approaching-a-value")[0],
    ).toMatchObject({
      track: { slug: "functions-and-change" },
      stepIndex: 4,
      totalSteps: 6,
      previousConcept: { slug: "derivative-as-slope-local-rate-of-change" },
      nextConcept: { slug: "integral-as-accumulation-area" },
    });
    expect(
      getStarterTrackMembershipsForConcept("integral-as-accumulation-area")[0],
    ).toMatchObject({
      track: { slug: "functions-and-change" },
      stepIndex: 5,
      totalSteps: 6,
      previousConcept: { slug: "limits-and-continuity-approaching-a-value" },
      nextConcept: null,
    });
    expect(getStarterTrackMembershipsForConcept("vectors-in-2d")[0]).toMatchObject({
      track: { slug: "vectors-and-motion-bridge" },
      stepIndex: 0,
      totalSteps: 2,
      previousConcept: null,
      nextConcept: { slug: "vectors-components" },
    });
    expect(getStarterTrackMembershipsForConcept("reaction-rate-collision-theory")[0]).toMatchObject({
      track: { slug: "rates-and-equilibrium" },
      stepIndex: 0,
      totalSteps: 2,
      previousConcept: null,
      nextConcept: { slug: "dynamic-equilibrium-le-chateliers-principle" },
    });
    expect(
      getStarterTrackMembershipsForConcept("dynamic-equilibrium-le-chateliers-principle")[0],
    ).toMatchObject({
      track: { slug: "rates-and-equilibrium" },
      stepIndex: 1,
      totalSteps: 2,
      previousConcept: { slug: "reaction-rate-collision-theory" },
      nextConcept: null,
    });
    expect(
      getStarterTrackMembershipsForConcept("stoichiometric-ratios-and-recipe-batches")[0],
    ).toMatchObject({
      track: { slug: "stoichiometry-and-yield" },
      stepIndex: 0,
      totalSteps: 3,
      previousConcept: null,
      nextConcept: { slug: "limiting-reagent-and-leftover-reactants" },
    });
    expect(
      getStarterTrackMembershipsForConcept("percent-yield-and-reaction-extent")[0],
    ).toMatchObject({
      track: { slug: "stoichiometry-and-yield" },
      stepIndex: 2,
      totalSteps: 3,
      previousConcept: { slug: "limiting-reagent-and-leftover-reactants" },
      nextConcept: null,
    });
    expect(
      getStarterTrackMembershipsForConcept("sorting-and-algorithmic-trade-offs")[0],
    ).toMatchObject({
      track: { slug: "algorithms-and-search-foundations" },
      stepIndex: 0,
      totalSteps: 6,
      previousConcept: null,
      nextConcept: { slug: "binary-search-halving-the-search-space" },
    });
    expect(
      getStarterTrackMembershipsForConcept("binary-search-halving-the-search-space")[0],
    ).toMatchObject({
      track: { slug: "algorithms-and-search-foundations" },
      stepIndex: 1,
      totalSteps: 6,
      previousConcept: { slug: "sorting-and-algorithmic-trade-offs" },
      nextConcept: { slug: "graph-representation-and-adjacency-intuition" },
    });
    expect(
      getStarterTrackMembershipsForConcept("graph-representation-and-adjacency-intuition")[0],
    ).toMatchObject({
      track: { slug: "algorithms-and-search-foundations" },
      stepIndex: 2,
      totalSteps: 6,
      previousConcept: { slug: "binary-search-halving-the-search-space" },
      nextConcept: { slug: "breadth-first-search-and-layered-frontiers" },
    });
    expect(
      getStarterTrackMembershipsForConcept("frontier-and-visited-state-on-graphs")[0],
    ).toMatchObject({
      track: { slug: "algorithms-and-search-foundations" },
      stepIndex: 5,
      totalSteps: 6,
      previousConcept: { slug: "depth-first-search-and-backtracking-paths" },
      nextConcept: null,
    });
  });

  it("rejects starter tracks that reference missing concepts", () => {
    const brokenTracks: StarterTrackMetadata[] = [
      {
        id: "starter-track-alpha",
        slug: "alpha-track",
        title: "Alpha track",
        summary: "Broken track",
        introduction: "Broken intro",
        sequenceRationale: "Broken rationale",
        sequence: 10,
        accent: "teal",
        highlights: ["Alpha"],
        conceptSlugs: ["simple-harmonic-motion", "not-a-concept"],
      },
    ];

    expect(() => validateStarterTrackCatalog(brokenTracks)).toThrow(/Unknown concept slug/i);
  });

  it("rejects checkpoints that try to pull in future concepts", () => {
    const brokenTracks: StarterTrackMetadata[] = [
      {
        id: "starter-track-alpha",
        slug: "alpha-track",
        title: "Alpha track",
        summary: "Broken track",
        introduction: "Broken intro",
        sequenceRationale: "Broken rationale",
        sequence: 10,
        accent: "teal",
        highlights: ["Alpha"],
        conceptSlugs: ["simple-harmonic-motion", "oscillation-energy"],
        checkpoints: [
          {
            id: "alpha-checkpoint",
            title: "Alpha checkpoint",
            summary: "Broken checkpoint",
            afterConcept: "simple-harmonic-motion",
            conceptSlugs: ["oscillation-energy"],
            challenge: {
              conceptSlug: "simple-harmonic-motion",
              challengeId: "shm-ch-period-sprint",
            },
          },
        ],
      },
    ];

    expect(() => validateStarterTrackCatalog(brokenTracks)).toThrow(/future concept/i);
  });

  it("rejects track-to-track references that point at missing starter tracks", () => {
    const brokenTracks: StarterTrackMetadata[] = [
      {
        id: "starter-track-alpha",
        slug: "alpha-track",
        title: "Alpha track",
        summary: "Broken track",
        introduction: "Broken intro",
        sequenceRationale: "Broken rationale",
        sequence: 10,
        accent: "teal",
        highlights: ["Alpha"],
        conceptSlugs: ["simple-harmonic-motion", "oscillation-energy"],
        recommendedNextTrackSlugs: ["missing-track"],
      },
      {
        id: "starter-track-beta",
        slug: "beta-track",
        title: "Beta track",
        summary: "Helper track",
        introduction: "Helper intro",
        sequenceRationale: "Helper rationale",
        sequence: 20,
        accent: "sky",
        highlights: ["Beta"],
        conceptSlugs: ["vectors-components", "projectile-motion"],
      },
    ];

    expect(() => validateStarterTrackCatalog(brokenTracks)).toThrow(
      /unknown starter track "missing-track" in recommendedNextTrackSlugs/i,
    );
  });

  it("rejects catalogs that try to feature more than one hero track", () => {
    const brokenTracks: StarterTrackMetadata[] = [
      {
        id: "starter-track-alpha",
        slug: "alpha-track",
        title: "Alpha track",
        summary: "Alpha",
        introduction: "Alpha intro",
        sequenceRationale: "Alpha rationale",
        sequence: 10,
        heroTrack: true,
        accent: "teal",
        highlights: ["Alpha"],
        conceptSlugs: ["vectors-components", "projectile-motion"],
      },
      {
        id: "starter-track-beta",
        slug: "beta-track",
        title: "Beta track",
        summary: "Beta",
        introduction: "Beta intro",
        sequenceRationale: "Beta rationale",
        sequence: 20,
        heroTrack: true,
        accent: "sky",
        highlights: ["Beta"],
        conceptSlugs: ["simple-harmonic-motion", "oscillation-energy"],
      },
    ];

    expect(() => validateStarterTrackCatalog(brokenTracks)).toThrow(/only one starter track can set heroTrack/i);
  });

  it("highlights the hero and hero-concept tracks for home discovery surfaces", () => {
    expect(getStarterTrackDiscoveryHighlights()).toEqual([
      expect.objectContaining({ slug: "gravity-and-orbits" }),
      expect.objectContaining({ slug: "rotational-mechanics" }),
      expect.objectContaining({ slug: "fluid-and-pressure" }),
      expect.objectContaining({ slug: "sound-and-acoustics" }),
    ]);

    expect(getStarterTrackDiscoveryHighlights(5)).toEqual([
      expect.objectContaining({ slug: "gravity-and-orbits" }),
      expect.objectContaining({ slug: "rotational-mechanics" }),
      expect.objectContaining({ slug: "fluid-and-pressure" }),
      expect.objectContaining({ slug: "sound-and-acoustics" }),
      expect.objectContaining({ slug: "wave-optics" }),
    ]);

    expect(getStarterTrackDiscoveryHighlights(6)).toEqual([
      expect.objectContaining({ slug: "gravity-and-orbits" }),
      expect.objectContaining({ slug: "rotational-mechanics" }),
      expect.objectContaining({ slug: "fluid-and-pressure" }),
      expect.objectContaining({ slug: "sound-and-acoustics" }),
      expect.objectContaining({ slug: "wave-optics" }),
      expect.objectContaining({ slug: "modern-physics" }),
    ]);

    expect(getStarterTrackDiscoveryHighlights(12)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: "rates-and-equilibrium" }),
      ]),
    );
  });
});
