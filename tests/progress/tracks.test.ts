import { describe, expect, it } from "vitest";
import {
  getStarterTrackBySlug,
  getStarterTrackMembershipsForConcept,
} from "@/lib/content";
import { getStarterTrackCompletionContentContext } from "@/lib/content/track-completion";
import {
  createEmptyProgressSnapshot,
  getStarterTrackCompletionSummary,
  getStarterTrackMembershipAction,
  getStarterTrackPrimaryAction,
  getStarterTrackProgressSummary,
  getStarterTrackRecapSummary,
  normalizeProgressSnapshot,
} from "@/lib/progress";

describe("starter track progress", () => {
  it("derives starter track progress from existing concept progress facts", () => {
    const track = getStarterTrackBySlug("oscillations-and-energy");
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "simple-harmonic-motion": {
          conceptId: "concept-shm",
          slug: "simple-harmonic-motion",
          manualCompletedAt: "2026-03-25T08:00:00.000Z",
        },
        "oscillation-energy": {
          conceptId: "concept-oscillation-energy",
          slug: "oscillation-energy",
          usedPredictionModeAt: "2026-03-25T09:15:00.000Z",
        },
      },
    });

    const summary = getStarterTrackProgressSummary(snapshot, track);

    expect(summary.status).toBe("in-progress");
    expect(summary.completedCount).toBe(1);
    expect(summary.startedCount).toBe(2);
    expect(summary.totalCheckpoints).toBe(2);
    expect(summary.completedFlowCount).toBe(1);
    expect(summary.totalFlowCount).toBe(5);
    expect(summary.resumeConcept?.slug).toBe("oscillation-energy");
    expect(summary.nextConcept?.slug).toBe("oscillation-energy");
  });

  it("sends later-step visitors back to the track start when earlier steps are incomplete", () => {
    const membership = getStarterTrackMembershipsForConcept("standing-waves")[0];
    const summary = getStarterTrackProgressSummary(createEmptyProgressSnapshot(), membership.track);

    expect(getStarterTrackMembershipAction(membership, summary)).toMatchObject({
      href: "/concepts/simple-harmonic-motion",
      label: "Start from track beginning",
    });
  });

  it("routes completed concept members into the ready checkpoint before the next concept", () => {
    const membership = getStarterTrackMembershipsForConcept("projectile-motion")[0];
    const summary = getStarterTrackProgressSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "vectors-components": {
            conceptId: "concept-vectors-components",
            slug: "vectors-components",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
          },
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            manualCompletedAt: "2026-03-25T09:00:00.000Z",
          },
        },
      }),
      membership.track,
    );

    expect(getStarterTrackMembershipAction(membership, summary)).toMatchObject({
      href: "/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode",
      label: "Open checkpoint",
    });

    const localizedSummary = getStarterTrackProgressSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "vectors-components": {
            conceptId: "concept-vectors-components",
            slug: "vectors-components",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
          },
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            manualCompletedAt: "2026-03-25T09:00:00.000Z",
          },
        },
      }),
      membership.track,
      "zh-HK",
    );

    expect(getStarterTrackMembershipAction(membership, localizedSummary, "zh-HK")).toMatchObject({
      href: "/zh-HK/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode",
      label: "打開檢查點",
    });
  });

  it("moves fully completed final-step learners into review mode", () => {
    const membership = getStarterTrackMembershipsForConcept(
      "resonance-air-columns-open-closed-pipes",
    )[0];
    const summary = getStarterTrackProgressSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "simple-harmonic-motion": {
            conceptId: "concept-shm",
            slug: "simple-harmonic-motion",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
          },
          "wave-speed-wavelength": {
            conceptId: "concept-wave-speed-wavelength",
            slug: "wave-speed-wavelength",
            manualCompletedAt: "2026-03-25T08:30:00.000Z",
          },
          "sound-waves-longitudinal-motion": {
            conceptId: "concept-sound-waves-longitudinal-motion",
            slug: "sound-waves-longitudinal-motion",
            manualCompletedAt: "2026-03-25T08:45:00.000Z",
          },
          "pitch-frequency-loudness-intensity": {
            conceptId: "concept-pitch-frequency-loudness-intensity",
            slug: "pitch-frequency-loudness-intensity",
            manualCompletedAt: "2026-03-25T08:52:00.000Z",
          },
          beats: {
            conceptId: "concept-beats",
            slug: "beats",
            manualCompletedAt: "2026-03-25T08:54:00.000Z",
          },
          "doppler-effect": {
            conceptId: "concept-doppler-effect",
            slug: "doppler-effect",
            manualCompletedAt: "2026-03-25T08:56:00.000Z",
          },
          "wave-interference": {
            conceptId: "concept-wave-interference",
            slug: "wave-interference",
            manualCompletedAt: "2026-03-25T09:00:00.000Z",
            completedChallenges: {
              "wi-ch-find-dark-band": "2026-03-25T09:10:00.000Z",
            },
          },
          "standing-waves": {
            conceptId: "concept-standing-waves",
            slug: "standing-waves",
            manualCompletedAt: "2026-03-25T10:00:00.000Z",
            completedChallenges: {
              "sw-ch-probe-on-node": "2026-03-25T10:05:00.000Z",
            },
          },
          "resonance-air-columns-open-closed-pipes": {
            conceptId: "concept-resonance-air-columns-open-closed-pipes",
            slug: "resonance-air-columns-open-closed-pipes",
            manualCompletedAt: "2026-03-25T10:20:00.000Z",
          },
        },
      }),
      membership.track,
    );

    expect(getStarterTrackMembershipAction(membership, summary)).toMatchObject({
      href: "/tracks/waves/complete",
      label: "Track completion page",
    });
  });

  it("keeps the guided continue action on the first incomplete step", () => {
    const track = getStarterTrackBySlug("waves");
    const summary = getStarterTrackProgressSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "wave-interference": {
            conceptId: "concept-wave-interference",
            slug: "wave-interference",
            firstVisitedAt: "2026-03-25T10:00:00.000Z",
            lastVisitedAt: "2026-03-25T10:00:00.000Z",
          },
        },
      }),
      track,
    );

    expect(getStarterTrackPrimaryAction(track, summary)).toMatchObject({
      href: "/concepts/simple-harmonic-motion",
      label: "Continue with SHM",
    });
  });

  it("localizes zh-HK track action hrefs that point back into concepts", () => {
    const membership = getStarterTrackMembershipsForConcept("graph-transformations")[0];
    const summary = getStarterTrackProgressSummary(
      createEmptyProgressSnapshot(),
      membership.track,
      "zh-HK",
    );

    expect(getStarterTrackPrimaryAction(membership.track, summary, "zh-HK")).toMatchObject({
      href: expect.stringMatching(/^\/zh-HK\/concepts\//),
    });
    expect(getStarterTrackMembershipAction(membership, summary, "zh-HK")).toMatchObject({
      href: expect.stringMatching(/^\/zh-HK\/concepts\//),
    });
  });

  it("localizes zh-HK guided track notes with localized concept titles", () => {
    const track = getStarterTrackBySlug("algorithms-and-search-foundations");
    const summary = getStarterTrackProgressSummary(createEmptyProgressSnapshot(), track);

    const action = getStarterTrackPrimaryAction(track, summary, "zh-HK");

    expect(action.note).toContain("排序與演算法權衡");
    expect(action.note).not.toContain("Sorting and Algorithmic Trade-offs");
  });

  it("switches the guided primary action to a ready checkpoint before the next concept", () => {
    const track = getStarterTrackBySlug("motion-and-circular-motion");
    const summary = getStarterTrackProgressSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "vectors-components": {
            conceptId: "concept-vectors-components",
            slug: "vectors-components",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
          },
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            manualCompletedAt: "2026-03-25T09:00:00.000Z",
          },
        },
      }),
      track,
    );

    expect(summary.nextCheckpoint?.checkpoint.id).toBe("motion-projectile-checkpoint");
    expect(getStarterTrackPrimaryAction(track, summary)).toMatchObject({
      kind: "checkpoint",
      href: "/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode",
      label: "Open checkpoint",
      targetConcept: expect.objectContaining({ slug: "projectile-motion" }),
      targetCheckpoint: expect.objectContaining({ id: "motion-projectile-checkpoint" }),
    });
  });

  it("holds the electricity track on its voltage checkpoint before the first circuit step", () => {
    const track = getStarterTrackBySlug("electricity");
    const summary = getStarterTrackProgressSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "electric-fields": {
            conceptId: "concept-electric-fields",
            slug: "electric-fields",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
          },
          "electric-potential": {
            conceptId: "concept-electric-potential",
            slug: "electric-potential",
            manualCompletedAt: "2026-03-25T08:30:00.000Z",
          },
        },
      }),
      track,
    );

    expect(summary.nextCheckpoint?.checkpoint.id).toBe("electricity-voltage-bridge-checkpoint");
    expect(getStarterTrackPrimaryAction(track, summary)).toMatchObject({
      kind: "checkpoint",
      href: "/concepts/electric-potential?challenge=ep-ch-positive-midpoint-plateau#challenge-mode",
      targetConcept: expect.objectContaining({ slug: "electric-potential" }),
      targetCheckpoint: expect.objectContaining({ id: "electricity-voltage-bridge-checkpoint" }),
    });
  });

  it("holds the modern-physics track on its spectra checkpoint before matter waves", () => {
    const track = getStarterTrackBySlug("modern-physics");
    const summary = getStarterTrackProgressSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "photoelectric-effect": {
            conceptId: "concept-photoelectric-effect",
            slug: "photoelectric-effect",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
          },
          "atomic-spectra": {
            conceptId: "concept-atomic-spectra",
            slug: "atomic-spectra",
            manualCompletedAt: "2026-03-25T08:30:00.000Z",
          },
        },
      }),
      track,
    );

    expect(summary.totalConcepts).toBe(5);
    expect(summary.nextCheckpoint?.checkpoint.id).toBe("modern-physics-threshold-line-checkpoint");
    expect(getStarterTrackPrimaryAction(track, summary)).toMatchObject({
      kind: "checkpoint",
      href: "/concepts/atomic-spectra?challenge=as-ch-two-visible-emission#challenge-mode",
      targetConcept: expect.objectContaining({ slug: "atomic-spectra" }),
      targetCheckpoint: expect.objectContaining({
        id: "modern-physics-threshold-line-checkpoint",
      }),
    });
  });

  it("holds the wave-optics track on its diffraction checkpoint before double-slit interference", () => {
    const track = getStarterTrackBySlug("wave-optics");
    const summary = getStarterTrackProgressSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          polarization: {
            conceptId: "concept-polarization",
            slug: "polarization",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
          },
          diffraction: {
            conceptId: "concept-diffraction",
            slug: "diffraction",
            manualCompletedAt: "2026-03-25T08:30:00.000Z",
          },
        },
      }),
      track,
    );

    expect(summary.totalConcepts).toBe(5);
    expect(summary.totalCheckpoints).toBe(3);
    expect(summary.totalFlowCount).toBe(8);
    expect(summary.nextConcept?.slug).toBe("double-slit-interference");
    expect(summary.nextCheckpoint?.checkpoint.id).toBe("wave-optics-diffraction-checkpoint");
    expect(getStarterTrackPrimaryAction(track, summary)).toMatchObject({
      kind: "checkpoint",
      href: "/concepts/diffraction?challenge=diff-ch-find-dark-band#challenge-mode",
      targetConcept: expect.objectContaining({ slug: "diffraction" }),
      targetCheckpoint: expect.objectContaining({ id: "wave-optics-diffraction-checkpoint" }),
    });
  });

  it("holds the thermodynamics track on the gas-pressure checkpoint before heat flow", () => {
    const track = getStarterTrackBySlug("thermodynamics-and-kinetic-theory");
    const summary = getStarterTrackProgressSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "temperature-and-internal-energy": {
            conceptId: "concept-temperature-and-internal-energy",
            slug: "temperature-and-internal-energy",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
          },
          "ideal-gas-law-and-kinetic-theory": {
            conceptId: "concept-ideal-gas-law-and-kinetic-theory",
            slug: "ideal-gas-law-and-kinetic-theory",
            manualCompletedAt: "2026-03-25T08:30:00.000Z",
          },
        },
      }),
      track,
    );

    expect(summary.totalConcepts).toBe(4);
    expect(summary.totalCheckpoints).toBe(3);
    expect(summary.totalFlowCount).toBe(7);
    expect(summary.nextConcept?.slug).toBe("heat-transfer");
    expect(summary.nextCheckpoint?.checkpoint.id).toBe("thermo-gas-bridge-checkpoint");
    expect(getStarterTrackPrimaryAction(track, summary)).toMatchObject({
      kind: "checkpoint",
      href: "/concepts/ideal-gas-law-and-kinetic-theory?challenge=igkt-ch-same-pressure-different-cause#challenge-mode",
      targetConcept: expect.objectContaining({ slug: "ideal-gas-law-and-kinetic-theory" }),
      targetCheckpoint: expect.objectContaining({ id: "thermo-gas-bridge-checkpoint" }),
    });
  });

  it("holds the fluid track on the Bernoulli checkpoint before buoyancy", () => {
    const track = getStarterTrackBySlug("fluid-and-pressure");
    const summary = getStarterTrackProgressSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "pressure-and-hydrostatic-pressure": {
            conceptId: "concept-pressure-and-hydrostatic-pressure",
            slug: "pressure-and-hydrostatic-pressure",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
            completedChallenges: {
              "php-ch-hit-24-kpa-deep": "2026-03-25T08:05:00.000Z",
            },
          },
          "continuity-equation": {
            conceptId: "concept-continuity-equation",
            slug: "continuity-equation",
            manualCompletedAt: "2026-03-25T08:30:00.000Z",
          },
          "bernoullis-principle": {
            conceptId: "concept-bernoullis-principle",
            slug: "bernoullis-principle",
            manualCompletedAt: "2026-03-25T09:00:00.000Z",
          },
        },
      }),
      track,
    );

    expect(summary.totalConcepts).toBe(5);
    expect(summary.totalCheckpoints).toBe(3);
    expect(summary.totalFlowCount).toBe(8);
    expect(summary.nextConcept?.slug).toBe("buoyancy-and-archimedes-principle");
    expect(summary.nextCheckpoint?.checkpoint.id).toBe("fluids-flow-pressure-checkpoint");
    expect(getStarterTrackPrimaryAction(track, summary)).toMatchObject({
      kind: "checkpoint",
      href: "/concepts/bernoullis-principle?challenge=bp-ch-wider-b-recovers-pressure#challenge-mode",
      targetConcept: expect.objectContaining({ slug: "bernoullis-principle" }),
      targetCheckpoint: expect.objectContaining({ id: "fluids-flow-pressure-checkpoint" }),
    });
  });

  it("holds the magnetic track on its first checkpoint before the induction concept", () => {
    const track = getStarterTrackBySlug("magnetic-fields");
    const summary = getStarterTrackProgressSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "magnetic-fields": {
            conceptId: "concept-magnetic-fields",
            slug: "magnetic-fields",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
          },
        },
      }),
      track,
    );

    expect(summary.totalConcepts).toBe(3);
    expect(summary.totalCheckpoints).toBe(3);
    expect(summary.totalFlowCount).toBe(6);
    expect(summary.nextConcept?.slug).toBe("electromagnetic-induction");
    expect(summary.nextCheckpoint?.checkpoint.id).toBe("magnetic-fields-superposition-checkpoint");
    expect(getStarterTrackPrimaryAction(track, summary)).toMatchObject({
      kind: "checkpoint",
      href: "/concepts/magnetic-fields?challenge=mf-ch-build-upward-bridge#challenge-mode",
      targetConcept: expect.objectContaining({ slug: "magnetic-fields" }),
      targetCheckpoint: expect.objectContaining({
        id: "magnetic-fields-superposition-checkpoint",
      }),
    });
  });

  it("holds the functions track on its slope checkpoint before accumulation", () => {
    const track = getStarterTrackBySlug("functions-and-change");
    const summary = getStarterTrackProgressSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "graph-transformations": {
            conceptId: "concept-graph-transformations",
            slug: "graph-transformations",
            manualCompletedAt: "2026-04-02T08:00:00.000Z",
          },
          "rational-functions-asymptotes-and-behavior": {
            conceptId: "concept-rational-functions-asymptotes-and-behavior",
            slug: "rational-functions-asymptotes-and-behavior",
            manualCompletedAt: "2026-04-02T08:10:00.000Z",
            completedChallenges: {
              "rf-ch-separate-hole-from-asymptote": "2026-04-02T08:12:00.000Z",
            },
          },
          "exponential-change-growth-decay-logarithms": {
            conceptId: "concept-exponential-change-growth-decay-logarithms",
            slug: "exponential-change-growth-decay-logarithms",
            manualCompletedAt: "2026-04-02T08:15:00.000Z",
            completedChallenges: {
              "exp-ch-quarter-target-two-half-lives": "2026-04-02T08:18:00.000Z",
            },
          },
          "derivative-as-slope-local-rate-of-change": {
            conceptId: "concept-derivative-as-slope-local-rate-of-change",
            slug: "derivative-as-slope-local-rate-of-change",
            manualCompletedAt: "2026-04-02T08:30:00.000Z",
          },
        },
      }),
      track,
    );

    expect(summary.totalConcepts).toBe(6);
    expect(summary.totalCheckpoints).toBe(5);
    expect(summary.totalFlowCount).toBe(11);
    expect(summary.nextConcept?.slug).toBe("limits-and-continuity-approaching-a-value");
    expect(summary.nextCheckpoint?.checkpoint.id).toBe("functions-change-derivative-checkpoint");
    expect(getStarterTrackPrimaryAction(track, summary)).toMatchObject({
      kind: "checkpoint",
      href: "/concepts/derivative-as-slope-local-rate-of-change?challenge=ds-ch-catch-the-flat-tangent#challenge-mode",
      targetConcept: expect.objectContaining({
        slug: "derivative-as-slope-local-rate-of-change",
      }),
      targetCheckpoint: expect.objectContaining({
        id: "functions-change-derivative-checkpoint",
      }),
    });
  });

  it("holds the complex track on its inverse-angle checkpoint before parametric motion", () => {
    const track = getStarterTrackBySlug("complex-and-parametric-motion");
    const summary = getStarterTrackProgressSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "complex-numbers-on-the-plane": {
            conceptId: "concept-complex-numbers-on-the-plane",
            slug: "complex-numbers-on-the-plane",
            manualCompletedAt: "2026-04-02T08:00:00.000Z",
            completedChallenges: {
              "cnp-ch-rotate-to-positive-imaginary": "2026-04-02T08:05:00.000Z",
            },
          },
          "unit-circle-sine-cosine-from-rotation": {
            conceptId: "concept-unit-circle-sine-cosine-from-rotation",
            slug: "unit-circle-sine-cosine-from-rotation",
            manualCompletedAt: "2026-04-02T08:15:00.000Z",
            completedChallenges: {
              "ucr-ch-quadrant-two-sign-read": "2026-04-02T08:20:00.000Z",
            },
          },
          "polar-coordinates-radius-and-angle": {
            conceptId: "concept-polar-coordinates-radius-and-angle",
            slug: "polar-coordinates-radius-and-angle",
            manualCompletedAt: "2026-04-02T08:30:00.000Z",
          },
          "trig-identities-from-unit-circle-geometry": {
            conceptId: "concept-trig-identities-from-unit-circle-geometry",
            slug: "trig-identities-from-unit-circle-geometry",
            manualCompletedAt: "2026-04-02T08:40:00.000Z",
          },
          "inverse-trig-angle-from-ratio": {
            conceptId: "concept-inverse-trig-angle-from-ratio",
            slug: "inverse-trig-angle-from-ratio",
            manualCompletedAt: "2026-04-02T08:50:00.000Z",
          },
        },
      }),
      track,
    );

    expect(summary.totalConcepts).toBe(6);
    expect(summary.totalCheckpoints).toBe(4);
    expect(summary.totalFlowCount).toBe(10);
    expect(summary.nextConcept?.slug).toBe("parametric-curves-motion-from-equations");
    expect(summary.nextCheckpoint?.checkpoint.id).toBe(
      "complex-parametric-inverse-angle-checkpoint",
    );
    expect(getStarterTrackPrimaryAction(track, summary)).toMatchObject({
      kind: "checkpoint",
      href: "/concepts/inverse-trig-angle-from-ratio?challenge=iatr-ch-quadrant-two-ratio-recovery#challenge-mode",
      targetConcept: expect.objectContaining({ slug: "inverse-trig-angle-from-ratio" }),
      targetCheckpoint: expect.objectContaining({
        id: "complex-parametric-inverse-angle-checkpoint",
      }),
    });
  });

  it("holds the vectors bridge on its plane checkpoint before the motion bench", () => {
    const track = getStarterTrackBySlug("vectors-and-motion-bridge");
    const summary = getStarterTrackProgressSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "vectors-in-2d": {
            conceptId: "concept-vectors-in-2d",
            slug: "vectors-in-2d",
            manualCompletedAt: "2026-04-02T08:00:00.000Z",
          },
        },
      }),
      track,
    );

    expect(summary.totalConcepts).toBe(2);
    expect(summary.totalCheckpoints).toBe(3);
    expect(summary.totalFlowCount).toBe(5);
    expect(summary.nextConcept?.slug).toBe("vectors-components");
    expect(summary.nextCheckpoint?.checkpoint.id).toBe("vectors-bridge-combination-checkpoint");
    expect(getStarterTrackPrimaryAction(track, summary)).toMatchObject({
      kind: "checkpoint",
      href: "/concepts/vectors-in-2d?challenge=v2d-ch-near-zero-result#challenge-mode",
      targetConcept: expect.objectContaining({ slug: "vectors-in-2d" }),
      targetCheckpoint: expect.objectContaining({
        id: "vectors-bridge-combination-checkpoint",
      }),
    });
  });

  it("derives recap actions from the authored track order and saved review signals", () => {
    const track = getStarterTrackBySlug("waves");
    const progress = getStarterTrackProgressSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "simple-harmonic-motion": {
            conceptId: "concept-shm",
            slug: "simple-harmonic-motion",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
            completedQuickTestAt: "2026-03-25T08:10:00.000Z",
          },
          "wave-speed-wavelength": {
            conceptId: "concept-wave-speed-wavelength",
            slug: "wave-speed-wavelength",
            firstVisitedAt: "2026-03-25T09:00:00.000Z",
            lastVisitedAt: "2026-03-25T09:00:00.000Z",
            quickTestAttemptCount: 2,
            quickTestLastIncorrectCount: 2,
            quickTestMissStreak: 2,
            quickTestLastMissedAt: "2026-03-25T09:00:00.000Z",
          },
        },
      }),
      track,
    );

    const recap = getStarterTrackRecapSummary(track, progress);

    expect(recap.priorityCount).toBe(2);
    expect(recap.primaryStep).toMatchObject({
      concept: expect.objectContaining({ slug: "simple-harmonic-motion" }),
      focusKind: "priority",
      action: {
        href: "/concepts/simple-harmonic-motion",
        label: "Skim concept",
        kind: "concept",
      },
    });
    expect(recap.steps[0]).toMatchObject({
      concept: expect.objectContaining({ slug: "simple-harmonic-motion" }),
      focusKind: "priority",
      action: {
        href: "/concepts/simple-harmonic-motion",
        label: "Skim concept",
        kind: "concept",
      },
    });
  });

  it("builds a compact completion summary from local concept progress and existing catalogs", () => {
    const track = getStarterTrackBySlug("oscillations-and-energy");
    const completion = getStarterTrackCompletionSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "simple-harmonic-motion": {
            conceptId: "concept-shm",
            slug: "simple-harmonic-motion",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
            completedQuickTestAt: "2026-03-25T08:10:00.000Z",
          },
          "oscillation-energy": {
            conceptId: "concept-oscillation-energy",
            slug: "oscillation-energy",
            manualCompletedAt: "2026-03-25T09:00:00.000Z",
            completedChallenges: {
              "oe-ch-equal-split": "2026-03-25T09:05:00.000Z",
            },
          },
          "damping-resonance": {
            conceptId: "concept-damping-resonance",
            slug: "damping-resonance",
            manualCompletedAt: "2026-03-25T10:00:00.000Z",
            completedChallenges: {
              "dr-ch-lock-near-resonance": "2026-03-25T10:05:00.000Z",
            },
          },
        },
      }),
      track,
      getStarterTrackCompletionContentContext(track),
    );

    expect(completion.progress.status).toBe("completed");
    expect(completion.completedCheckpointCount).toBe(2);
    expect(completion.completedConcepts.map((entry) => entry.concept.slug)).toEqual([
      "simple-harmonic-motion",
      "oscillation-energy",
      "damping-resonance",
    ]);
    expect(completion.relatedTopic?.slug).toBe("oscillations");
    expect(completion.suggestedNextTrack?.slug).toBe("waves");
    expect(completion.guidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "review",
          title: "Simple Harmonic Motion",
          actionLabel: "Skim concept",
        }),
        expect.objectContaining({
          kind: "topic",
          href: "/concepts/topics/oscillations",
        }),
        expect.objectContaining({
          kind: "track",
          href: "/tracks/waves",
        }),
      ]),
    );
  });

  it("points the completed motion track toward the authored rotational follow-up", () => {
    const track = getStarterTrackBySlug("motion-and-circular-motion");
    const completion = getStarterTrackCompletionSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "vectors-components": {
            conceptId: "concept-vectors-components",
            slug: "vectors-components",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
          },
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            manualCompletedAt: "2026-03-25T08:30:00.000Z",
            completedChallenges: {
              "pm-ch-flat-far-shot": "2026-03-25T08:35:00.000Z",
            },
          },
          "uniform-circular-motion": {
            conceptId: "concept-uniform-circular-motion",
            slug: "uniform-circular-motion",
            manualCompletedAt: "2026-03-25T09:00:00.000Z",
            completedChallenges: {
              "ucm-ch-match-period-change-pull": "2026-03-25T09:05:00.000Z",
            },
          },
        },
      }),
      track,
      getStarterTrackCompletionContentContext(track),
    );

    expect(completion.progress.status).toBe("completed");
    expect(completion.suggestedNextTrack?.slug).toBe("rotational-mechanics");
    expect(completion.guidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "track",
          title: "Rotational Mechanics",
          href: "/tracks/rotational-mechanics",
          note: expect.stringMatching(
            /authored to build directly on Motion and Circular Motion/i,
          ),
        }),
      ]),
    );
  });

  it("points the completed rotational track toward the gravity branch", () => {
    const track = getStarterTrackBySlug("rotational-mechanics");
    const completion = getStarterTrackCompletionSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          torque: {
            conceptId: "concept-torque",
            slug: "torque",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
          },
          "static-equilibrium-centre-of-mass": {
            conceptId: "concept-static-equilibrium-centre-of-mass",
            slug: "static-equilibrium-centre-of-mass",
            manualCompletedAt: "2026-03-25T08:30:00.000Z",
            completedChallenges: {
              "secm-ch-balance-heavy-right-load": "2026-03-25T08:35:00.000Z",
            },
          },
          "rotational-inertia": {
            conceptId: "concept-rotational-inertia",
            slug: "rotational-inertia",
            manualCompletedAt: "2026-03-25T09:00:00.000Z",
          },
          "rolling-motion": {
            conceptId: "concept-rolling-motion",
            slug: "rolling-motion",
            manualCompletedAt: "2026-03-25T09:30:00.000Z",
            completedChallenges: {
              "rolling-motion-ch-compare-race": "2026-03-25T09:35:00.000Z",
            },
          },
          "angular-momentum": {
            conceptId: "concept-angular-momentum",
            slug: "angular-momentum",
            manualCompletedAt: "2026-03-25T10:00:00.000Z",
            completedChallenges: {
              "angular-momentum-ch-compare-same-l": "2026-03-25T10:05:00.000Z",
            },
          },
        },
      }),
      track,
      getStarterTrackCompletionContentContext(track),
    );

    expect(completion.progress.status).toBe("completed");
    expect(completion.relatedTopic?.slug).toBe("mechanics");
    expect(completion.suggestedNextTrack?.slug).toBe("gravity-and-orbits");
    expect(completion.guidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "track",
          title: "Gravity and Orbits",
          href: "/tracks/gravity-and-orbits",
        }),
      ]),
    );
  });

  it("points the completed waves track toward the bounded sound follow-up", () => {
    const track = getStarterTrackBySlug("waves");
    const completion = getStarterTrackCompletionSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "simple-harmonic-motion": {
            conceptId: "concept-shm",
            slug: "simple-harmonic-motion",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
          },
          "wave-speed-wavelength": {
            conceptId: "concept-wave-speed-wavelength",
            slug: "wave-speed-wavelength",
            manualCompletedAt: "2026-03-25T08:30:00.000Z",
          },
          "sound-waves-longitudinal-motion": {
            conceptId: "concept-sound-waves-longitudinal-motion",
            slug: "sound-waves-longitudinal-motion",
            manualCompletedAt: "2026-03-25T08:45:00.000Z",
          },
          "pitch-frequency-loudness-intensity": {
            conceptId: "concept-pitch-frequency-loudness-intensity",
            slug: "pitch-frequency-loudness-intensity",
            manualCompletedAt: "2026-03-25T08:52:00.000Z",
          },
          beats: {
            conceptId: "concept-beats",
            slug: "beats",
            manualCompletedAt: "2026-03-25T08:54:00.000Z",
          },
          "doppler-effect": {
            conceptId: "concept-doppler-effect",
            slug: "doppler-effect",
            manualCompletedAt: "2026-03-25T08:56:00.000Z",
          },
          "wave-interference": {
            conceptId: "concept-wave-interference",
            slug: "wave-interference",
            manualCompletedAt: "2026-03-25T09:00:00.000Z",
            completedChallenges: {
              "wi-ch-find-dark-band": "2026-03-25T09:10:00.000Z",
            },
          },
          "standing-waves": {
            conceptId: "concept-standing-waves",
            slug: "standing-waves",
            manualCompletedAt: "2026-03-25T10:00:00.000Z",
            completedChallenges: {
              "sw-ch-probe-on-node": "2026-03-25T10:05:00.000Z",
            },
          },
          "resonance-air-columns-open-closed-pipes": {
            conceptId: "concept-resonance-air-columns-open-closed-pipes",
            slug: "resonance-air-columns-open-closed-pipes",
            manualCompletedAt: "2026-03-25T10:20:00.000Z",
          },
        },
      }),
      track,
      getStarterTrackCompletionContentContext(track),
    );

    expect(completion.progress.status).toBe("completed");
    expect(completion.suggestedNextTrack?.slug).toBe("sound-and-acoustics");
    expect(completion.guidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "track",
          title: "Sound and Acoustics",
          href: "/tracks/sound-and-acoustics",
          note: expect.stringMatching(/build directly on Waves/i),
        }),
      ]),
    );
  });

  it("points the completed electricity track toward the bounded magnetic follow-up", () => {
    const track = getStarterTrackBySlug("electricity");
    const completion = getStarterTrackCompletionSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "electric-fields": {
            conceptId: "concept-electric-fields",
            slug: "electric-fields",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
          },
          "electric-potential": {
            conceptId: "concept-electric-potential",
            slug: "electric-potential",
            manualCompletedAt: "2026-03-25T08:30:00.000Z",
            completedChallenges: {
              "ep-ch-positive-midpoint-plateau": "2026-03-25T08:35:00.000Z",
            },
          },
          "basic-circuits": {
            conceptId: "concept-basic-circuits",
            slug: "basic-circuits",
            manualCompletedAt: "2026-03-25T09:00:00.000Z",
          },
          "power-energy-circuits": {
            conceptId: "concept-power-energy-circuits",
            slug: "power-energy-circuits",
            manualCompletedAt: "2026-03-25T09:30:00.000Z",
          },
          "series-parallel-circuits": {
            conceptId: "concept-series-parallel-circuits",
            slug: "series-parallel-circuits",
            manualCompletedAt: "2026-03-25T10:00:00.000Z",
          },
          "equivalent-resistance": {
            conceptId: "concept-equivalent-resistance",
            slug: "equivalent-resistance",
            manualCompletedAt: "2026-03-25T10:30:00.000Z",
            completedChallenges: {
              "eqr-ch-parallel-group-collapse": "2026-03-25T10:35:00.000Z",
            },
          },
        },
      }),
      track,
      getStarterTrackCompletionContentContext(track),
    );

    expect(completion.progress.status).toBe("completed");
    expect(completion.suggestedNextTrack?.slug).toBe("magnetic-fields");
    expect(completion.guidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "track",
          title: "Magnetism",
          note: expect.stringMatching(
            /authored to build directly on Electricity, so the track you just finished is already the intended setup/i,
          ),
        }),
      ]),
    );
  });

  it("points the completed functions track toward the next math plane branch", () => {
    const track = getStarterTrackBySlug("functions-and-change");
    const completion = getStarterTrackCompletionSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "graph-transformations": {
            conceptId: "concept-graph-transformations",
            slug: "graph-transformations",
            manualCompletedAt: "2026-04-02T08:00:00.000Z",
          },
          "rational-functions-asymptotes-and-behavior": {
            conceptId: "concept-rational-functions-asymptotes-and-behavior",
            slug: "rational-functions-asymptotes-and-behavior",
            manualCompletedAt: "2026-04-02T08:10:00.000Z",
            completedChallenges: {
              "rf-ch-separate-hole-from-asymptote": "2026-04-02T08:12:00.000Z",
            },
          },
          "exponential-change-growth-decay-logarithms": {
            conceptId: "concept-exponential-change-growth-decay-logarithms",
            slug: "exponential-change-growth-decay-logarithms",
            manualCompletedAt: "2026-04-02T08:15:00.000Z",
            completedChallenges: {
              "exp-ch-quarter-target-two-half-lives": "2026-04-02T08:18:00.000Z",
            },
          },
          "derivative-as-slope-local-rate-of-change": {
            conceptId: "concept-derivative-as-slope-local-rate-of-change",
            slug: "derivative-as-slope-local-rate-of-change",
            manualCompletedAt: "2026-04-02T08:30:00.000Z",
            completedChallenges: {
              "ds-ch-catch-the-flat-tangent": "2026-04-02T08:35:00.000Z",
            },
          },
          "limits-and-continuity-approaching-a-value": {
            conceptId: "concept-limits-and-continuity-approaching-a-value",
            slug: "limits-and-continuity-approaching-a-value",
            manualCompletedAt: "2026-04-02T08:45:00.000Z",
            completedChallenges: {
              "lc-ch-agreeing-sides-broken-continuity": "2026-04-02T08:50:00.000Z",
            },
          },
          "integral-as-accumulation-area": {
            conceptId: "concept-integral-as-accumulation-area",
            slug: "integral-as-accumulation-area",
            manualCompletedAt: "2026-04-02T09:00:00.000Z",
            completedChallenges: {
              "ia-ch-negative-height-positive-total": "2026-04-02T09:05:00.000Z",
            },
          },
        },
      }),
      track,
      getStarterTrackCompletionContentContext(track),
    );

    expect(completion.progress.status).toBe("completed");
    expect(completion.completedCheckpointCount).toBe(5);
    expect(completion.suggestedNextTrack?.slug).toBe("complex-and-parametric-motion");
    expect(completion.guidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "track",
          title: "Complex and Parametric Motion",
          href: "/tracks/complex-and-parametric-motion",
        }),
      ]),
    );
  });

  it("points the completed vectors bridge toward the motion track", () => {
    const track = getStarterTrackBySlug("vectors-and-motion-bridge");
    const completion = getStarterTrackCompletionSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "vectors-in-2d": {
            conceptId: "concept-vectors-in-2d",
            slug: "vectors-in-2d",
            manualCompletedAt: "2026-04-02T08:00:00.000Z",
            completedChallenges: {
              "v2d-ch-near-zero-result": "2026-04-02T08:05:00.000Z",
            },
          },
          "vectors-components": {
            conceptId: "concept-vectors-components",
            slug: "vectors-components",
            manualCompletedAt: "2026-04-02T08:30:00.000Z",
            completedChallenges: {
              "vc-ch-equal-components": "2026-04-02T08:33:00.000Z",
              "vc-ch-hit-end-point": "2026-04-02T08:35:00.000Z",
            },
          },
        },
      }),
      track,
      getStarterTrackCompletionContentContext(track),
    );

    expect(completion.progress.status).toBe("completed");
    expect(completion.completedCheckpointCount).toBe(3);
    expect(completion.suggestedNextTrack?.slug).toBe("motion-and-circular-motion");
    expect(completion.guidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "track",
          title: "Motion and Circular Motion",
          href: "/tracks/motion-and-circular-motion",
        }),
      ]),
    );
  });

  it("keeps the magnetic completion guidance compact and topic-local", () => {
    const track = getStarterTrackBySlug("magnetic-fields");
    const completion = getStarterTrackCompletionSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "magnetic-fields": {
            conceptId: "concept-magnetic-fields",
            slug: "magnetic-fields",
            manualCompletedAt: "2026-03-25T10:00:00.000Z",
            completedChallenges: {
              "mf-ch-build-upward-bridge": "2026-03-25T10:05:00.000Z",
            },
          },
          "electromagnetic-induction": {
            conceptId: "concept-electromagnetic-induction",
            slug: "electromagnetic-induction",
            manualCompletedAt: "2026-03-25T10:10:00.000Z",
            completedChallenges: {
              "emi-ch-high-flux-zero-emf": "2026-03-25T10:15:00.000Z",
            },
          },
          "magnetic-force-moving-charges-currents": {
            conceptId: "concept-magnetic-force-moving-charges-currents",
            slug: "magnetic-force-moving-charges-currents",
            manualCompletedAt: "2026-03-25T10:20:00.000Z",
            completedChallenges: {
              "mfmc-ch-charge-down-wire-up": "2026-03-25T10:25:00.000Z",
            },
          },
        },
      }),
      track,
      getStarterTrackCompletionContentContext(track),
    );

    expect(completion.progress.status).toBe("completed");
    expect(completion.completedCheckpointCount).toBe(3);
    expect(completion.completedConcepts.map((entry) => entry.concept.slug)).toEqual([
      "magnetic-fields",
      "electromagnetic-induction",
      "magnetic-force-moving-charges-currents",
    ]);
    expect(completion.relatedTopic?.slug).toBe("magnetism");
    expect(completion.relatedTopicSharedConceptCount).toBe(2);
    expect(completion.suggestedNextTrack).toBeNull();
    expect(completion.guidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "challenge",
          title: "Magnetism challenges",
          href: "/challenges?track=magnetic-fields",
          actionLabel: "Open Magnetism challenges",
        }),
        expect.objectContaining({
          kind: "topic",
          title: "Magnetism",
          href: "/concepts/topics/magnetism",
          actionLabel: "Open Magnetism",
        }),
      ]),
    );
  });
});
