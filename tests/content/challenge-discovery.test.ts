import { describe, expect, it } from "vitest";
import {
  buildChallengeTrackBrowserHref,
  getChallengeDiscoveryIndex,
  getChallengeDiscoveryMetrics,
  resolveChallengeTrackCtaTargets,
} from "@/lib/content";

describe("challenge discovery index", () => {
  it("derives challenge entries from canonical concepts, topics, and track memberships", () => {
    const index = getChallengeDiscoveryIndex();
    const projectileEntry = index.entries.find((entry) => entry.id === "pm-ch-flat-far-shot");

    expect(index.totalChallenges).toBe(index.entries.length);
    expect(projectileEntry).toMatchObject({
      title: "Flat long shot",
      depth: "core",
      href: "/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode",
      concept: {
        slug: "projectile-motion",
        title: "Projectile Motion",
      },
      topic: {
        slug: "mechanics",
        title: "Mechanics",
        path: "/concepts/topics/mechanics",
      },
    });
    expect(projectileEntry?.starterTracks).toEqual([
      expect.objectContaining({
        slug: "motion-and-circular-motion",
        stepIndex: 1,
        totalSteps: 3,
      }),
    ]);

    const electricityEntry = index.entries.find(
      (entry) => entry.id === "ep-ch-positive-midpoint-plateau",
    );

    expect(electricityEntry).toMatchObject({
      href: "/concepts/electric-potential?challenge=ep-ch-positive-midpoint-plateau#challenge-mode",
      concept: {
        slug: "electric-potential",
      },
      topic: {
        slug: "electricity",
        path: "/concepts/topics/electricity",
      },
      starterTracks: [
        expect.objectContaining({
          slug: "electricity",
          stepIndex: 1,
          totalSteps: 6,
        }),
      ],
    });

    const magneticEntry = index.entries.find(
      (entry) => entry.id === "mf-ch-build-upward-bridge",
    );

    expect(magneticEntry).toMatchObject({
      href: "/concepts/magnetic-fields?challenge=mf-ch-build-upward-bridge#challenge-mode",
      concept: {
        slug: "magnetic-fields",
      },
      topic: {
        slug: "magnetism",
        path: "/concepts/topics/magnetism",
      },
      starterTracks: [
        expect.objectContaining({
          slug: "magnetic-fields",
          stepIndex: 0,
          totalSteps: 3,
        }),
      ],
    });

    const inductionEntry = index.entries.find(
      (entry) => entry.id === "emi-ch-high-flux-zero-emf",
    );

    expect(inductionEntry).toMatchObject({
      href: "/concepts/electromagnetic-induction?challenge=emi-ch-high-flux-zero-emf#challenge-mode",
      concept: {
        slug: "electromagnetic-induction",
      },
      topic: {
        slug: "electromagnetism",
        path: "/concepts/topics/electromagnetism",
      },
      starterTracks: [
        expect.objectContaining({
          slug: "magnetic-fields",
          stepIndex: 1,
          totalSteps: 3,
        }),
      ],
    });

    const escapeEntry = index.entries.find((entry) => entry.id === "ev-ch-remove-turnaround");

    expect(escapeEntry).toMatchObject({
      href: "/concepts/escape-velocity?challenge=ev-ch-remove-turnaround#challenge-mode",
      concept: {
        slug: "escape-velocity",
      },
      topic: {
        slug: "gravity-and-orbits",
        path: "/concepts/topics/gravity-and-orbits",
      },
      starterTracks: [
        expect.objectContaining({
          slug: "gravity-and-orbits",
          stepIndex: 4,
          totalSteps: 5,
        }),
      ],
    });

    const torqueEntry = index.entries.find(
      (entry) => entry.id === "torque-ch-same-torque-new-geometry",
    );

    expect(torqueEntry).toMatchObject({
      href: "/concepts/torque?challenge=torque-ch-same-torque-new-geometry#challenge-mode",
      concept: {
        slug: "torque",
      },
      topic: {
        slug: "mechanics",
        path: "/concepts/topics/mechanics",
      },
      starterTracks: [
        expect.objectContaining({
          slug: "rotational-mechanics",
          stepIndex: 0,
          totalSteps: 5,
        }),
      ],
    });

    const thermodynamicsEntry = index.entries.find(
      (entry) => entry.id === "shpc-ch-catch-the-real-shelf",
    );

    expect(thermodynamicsEntry).toMatchObject({
      href: "/concepts/specific-heat-and-phase-change?challenge=shpc-ch-catch-the-real-shelf#challenge-mode",
      concept: {
        slug: "specific-heat-and-phase-change",
      },
      topic: {
        slug: "thermodynamics",
        path: "/concepts/topics/thermodynamics",
      },
      starterTracks: [
        expect.objectContaining({
          slug: "thermodynamics-and-kinetic-theory",
          stepIndex: 3,
          totalSteps: 4,
        }),
      ],
    });

    const bernoulliEntry = index.entries.find(
      (entry) => entry.id === "bp-ch-wider-b-recovers-pressure",
    );

    expect(bernoulliEntry).toMatchObject({
      href: "/concepts/bernoullis-principle?challenge=bp-ch-wider-b-recovers-pressure#challenge-mode",
      concept: {
        slug: "bernoullis-principle",
      },
      topic: {
        slug: "fluids",
        path: "/concepts/topics/fluids",
      },
      starterTracks: [
        expect.objectContaining({
          slug: "fluid-and-pressure",
          stepIndex: 2,
          totalSteps: 5,
        }),
      ],
    });

    const magneticForceEntry = index.entries.find(
      (entry) => entry.id === "mfmc-ch-charge-down-wire-up",
    );

    expect(magneticForceEntry).toMatchObject({
      href: "/concepts/magnetic-force-moving-charges-currents?challenge=mfmc-ch-charge-down-wire-up#challenge-mode",
      concept: {
        slug: "magnetic-force-moving-charges-currents",
      },
      topic: {
        slug: "magnetism",
        path: "/concepts/topics/magnetism",
      },
      starterTracks: [
        expect.objectContaining({
          slug: "magnetic-fields",
          stepIndex: 2,
          totalSteps: 3,
        }),
      ],
    });

    const rationalFunctionsEntry = index.entries.find(
      (entry) => entry.id === "rf-ch-separate-hole-from-asymptote",
    );

    expect(rationalFunctionsEntry).toMatchObject({
      href: "/concepts/rational-functions-asymptotes-and-behavior?challenge=rf-ch-separate-hole-from-asymptote#challenge-mode",
      concept: {
        slug: "rational-functions-asymptotes-and-behavior",
        title: "Rational Functions / Asymptotes and Behavior",
      },
      topic: {
        slug: "functions",
        path: "/concepts/topics/functions",
      },
      starterTracks: [
        expect.objectContaining({
          slug: "functions-and-change",
          stepIndex: 1,
          totalSteps: 6,
        }),
      ],
    });

    const exponentialEntry = index.entries.find(
      (entry) => entry.id === "exp-ch-quarter-target-two-half-lives",
    );

    expect(exponentialEntry).toMatchObject({
      href: "/concepts/exponential-change-growth-decay-logarithms?challenge=exp-ch-quarter-target-two-half-lives#challenge-mode",
      concept: {
        slug: "exponential-change-growth-decay-logarithms",
      },
      topic: {
        slug: "functions",
        path: "/concepts/topics/functions",
      },
      starterTracks: [
        expect.objectContaining({
          slug: "functions-and-change",
          stepIndex: 2,
          totalSteps: 6,
        }),
      ],
    });

    const derivativeEntry = index.entries.find(
      (entry) => entry.id === "ds-ch-catch-the-flat-tangent",
    );

    expect(derivativeEntry).toMatchObject({
      href: "/concepts/derivative-as-slope-local-rate-of-change?challenge=ds-ch-catch-the-flat-tangent#challenge-mode",
      concept: {
        slug: "derivative-as-slope-local-rate-of-change",
        title: "Derivative as Slope / Local Rate of Change",
      },
      topic: {
        slug: "calculus",
        path: "/concepts/topics/calculus",
      },
      starterTracks: [
        expect.objectContaining({
          slug: "functions-and-change",
          stepIndex: 3,
          totalSteps: 6,
        }),
      ],
    });

    const limitsEntry = index.entries.find(
      (entry) => entry.id === "lc-ch-agreeing-sides-broken-continuity",
    );

    expect(limitsEntry).toMatchObject({
      href: "/concepts/limits-and-continuity-approaching-a-value?challenge=lc-ch-agreeing-sides-broken-continuity#challenge-mode",
      concept: {
        slug: "limits-and-continuity-approaching-a-value",
      },
      topic: {
        slug: "calculus",
        path: "/concepts/topics/calculus",
      },
      starterTracks: [
        expect.objectContaining({
          slug: "functions-and-change",
          stepIndex: 4,
          totalSteps: 6,
        }),
      ],
    });

    const integralEntry = index.entries.find(
      (entry) => entry.id === "ia-ch-negative-height-positive-total",
    );

    expect(integralEntry).toMatchObject({
      href: "/concepts/integral-as-accumulation-area?challenge=ia-ch-negative-height-positive-total#challenge-mode",
      concept: {
        slug: "integral-as-accumulation-area",
      },
      topic: {
        slug: "calculus",
        path: "/concepts/topics/calculus",
      },
      starterTracks: [
        expect.objectContaining({
          slug: "functions-and-change",
          stepIndex: 5,
          totalSteps: 6,
        }),
      ],
    });

    const optimizationEntry = index.entries.find(
      (entry) => entry.id === "oc-ch-find-the-square-maximum",
    );

    expect(optimizationEntry).toMatchObject({
      href: "/concepts/optimization-maxima-minima-and-constraints?challenge=oc-ch-find-the-square-maximum#challenge-mode",
      concept: {
        slug: "optimization-maxima-minima-and-constraints",
      },
      topic: {
        slug: "calculus",
        path: "/concepts/topics/calculus",
      },
      starterTracks: [],
    });

    const vectorsMathEntry = index.entries.find(
      (entry) => entry.id === "v2d-ch-near-zero-result",
    );

    expect(vectorsMathEntry).toMatchObject({
      href: "/concepts/vectors-in-2d?challenge=v2d-ch-near-zero-result#challenge-mode",
      concept: {
        slug: "vectors-in-2d",
      },
      topic: {
        slug: "vectors",
        path: "/concepts/topics/vectors",
      },
      starterTracks: [
        expect.objectContaining({
          slug: "vectors-and-motion-bridge",
          stepIndex: 0,
          totalSteps: 2,
        }),
      ],
    });
  });

  it("summarizes challenge-ready topics and guided paths without inventing new curriculum data", () => {
    const index = getChallengeDiscoveryIndex();

    expect(getChallengeDiscoveryMetrics()).toEqual({
      totalChallenges: index.totalChallenges,
      totalConcepts: index.totalConcepts,
      totalTopics: index.totalTopics,
      totalTracks: index.totalTracks,
    });
    expect(index.topics.map((topic) => topic.slug)).toEqual(
      expect.arrayContaining([
        "mechanics",
        "gravity-and-orbits",
        "oscillations",
        "waves",
        "sound",
        "thermodynamics",
        "electricity",
        "circuits",
        "magnetism",
        "electromagnetism",
        "optics",
        "mirrors-and-lenses",
        "modern-physics",
        "functions",
        "calculus",
        "vectors",
      ]),
    );
    expect(index.tracks.map((track) => track.slug)).toEqual(
      expect.arrayContaining([
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
        "vectors-and-motion-bridge",
      ]),
    );
    expect(index.quickStartEntry).toBeTruthy();
  });

  it("resolves canonical first-challenge and browser targets for every guided path", () => {
    const index = getChallengeDiscoveryIndex();

    for (const track of index.tracks) {
      const targets = resolveChallengeTrackCtaTargets(index, track.slug);

      expect(targets, `Expected CTA targets for ${track.slug}.`).not.toBeNull();
      expect(targets?.browserHref).toBe(buildChallengeTrackBrowserHref(track.slug));
      expect(
        targets?.firstChallengeHref,
        `Expected a first challenge target for ${track.slug}.`,
      ).toBeTruthy();
      expect(
        index.entries.some((entry) => entry.href === targets?.firstChallengeHref),
      ).toBe(true);
    }
  });

  it("can localize guided-path browser and first-challenge targets", () => {
    const index = getChallengeDiscoveryIndex();
    const targets = resolveChallengeTrackCtaTargets(
      index,
      "motion-and-circular-motion",
      "zh-HK",
    );

    expect(buildChallengeTrackBrowserHref("motion-and-circular-motion", "zh-HK")).toBe(
      "/zh-HK/challenges?track=motion-and-circular-motion#challenge-browser",
    );
    expect(targets).toMatchObject({
      browserHref: "/zh-HK/challenges?track=motion-and-circular-motion#challenge-browser",
      firstChallengeHref:
        "/zh-HK/concepts/vectors-components?challenge=vc-ch-equal-components#challenge-mode",
    });
  });
});
