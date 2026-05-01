import { describe, expect, it } from "vitest";
import {
  getGuidedCollectionBySlug,
  getGuidedCollections,
  validateGuidedCollectionCatalog,
  type GuidedCollectionMetadata,
} from "@/lib/content";

describe("guided collections", () => {
  it("loads the shipped guided collections in canonical order", () => {
    const collections = getGuidedCollections();

    expect(collections.map((collection) => collection.slug)).toEqual([
      "waves-evidence-loop",
      "electricity-bridge-lesson-set",
      "electricity-to-magnetism-bridge",
      "functions-and-change-lesson-set",
      "vectors-to-mechanics-bridge",
      "complex-and-parametric-motion-lesson-set",
      "rates-and-equilibrium-lesson-set",
      "stoichiometry-and-yield-lesson-set",
      "solutions-and-ph-lesson-set",
      "algorithms-and-search-playlist",
    ]);
    expect(collections[0]).toMatchObject({
      format: "lesson-set",
      entryDiagnostic: {
        skipToStep: { id: "waves-extension-hub" },
      },
      trackCount: 1,
      challengeStepCount: 1,
      surfaceStepCount: 2,
    });
    expect(collections[0].steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "waves-topic-route",
          kind: "surface",
          href: "/concepts/topics/waves",
        }),
        expect.objectContaining({
          id: "waves-starter-track",
          kind: "track",
          href: "/tracks/waves",
        }),
        expect.objectContaining({
          id: "waves-dark-band-challenge",
          kind: "challenge",
          href: "/concepts/wave-interference?challenge=wi-ch-find-dark-band#challenge-mode",
          challengeTitle: "Find a dark band",
        }),
      ]),
    );
    expect(getGuidedCollectionBySlug("electricity-bridge-lesson-set").steps[1]).toMatchObject({
      kind: "concept",
      href: "/concepts/electric-fields",
      concept: { slug: "electric-fields" },
    });
    expect(getGuidedCollectionBySlug("electricity-bridge-lesson-set").entryDiagnostic).toMatchObject({
      skipToStep: { id: "electricity-starter-track" },
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
    expect(getGuidedCollectionBySlug("electricity-to-magnetism-bridge").steps[0]).toMatchObject({
      kind: "surface",
      href: "/tracks/electricity?mode=recap",
      surfaceKind: "reference",
    });
    expect(getGuidedCollectionBySlug("electricity-to-magnetism-bridge").entryDiagnostic).toMatchObject({
      skipToStep: { id: "maxwell-capstone" },
    });
    expect(getGuidedCollectionBySlug("functions-and-change-lesson-set")).toMatchObject({
      format: "lesson-set",
      entryDiagnostic: {
        skipToStep: { id: "functions-change-accumulation-checkpoint" },
      },
      trackCount: 1,
      challengeStepCount: 1,
      surfaceStepCount: 2,
    });
    expect(getGuidedCollectionBySlug("functions-and-change-lesson-set").steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "functions-topic-route",
          kind: "surface",
          href: "/concepts/topics/functions",
        }),
        expect.objectContaining({
          id: "functions-change-track",
          kind: "track",
          href: "/tracks/functions-and-change",
        }),
        expect.objectContaining({
          id: "functions-change-accumulation-checkpoint",
          kind: "challenge",
          href: "/concepts/integral-as-accumulation-area?challenge=ia-ch-negative-height-positive-total#challenge-mode",
        }),
      ]),
    );
    expect(getGuidedCollectionBySlug("vectors-to-mechanics-bridge").steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "vectors-mechanics-motion-checkpoint",
          kind: "challenge",
          href: "/concepts/vectors-components?challenge=vc-ch-hit-end-point#challenge-mode",
        }),
        expect.objectContaining({
          id: "mechanics-topic-route",
          kind: "surface",
          href: "/concepts/topics/mechanics",
        }),
      ]),
    );
    expect(getGuidedCollectionBySlug("complex-and-parametric-motion-lesson-set").entryDiagnostic).toMatchObject({
      skipToStep: { id: "complex-parametric-motion-checkpoint" },
      probes: expect.arrayContaining([
        expect.objectContaining({
          kind: "quick-test",
          concept: expect.objectContaining({ slug: "complex-numbers-on-the-plane" }),
        }),
        expect.objectContaining({
          kind: "challenge",
          concept: expect.objectContaining({ slug: "polar-coordinates-radius-and-angle" }),
          challengeId: "polar-ch-second-quadrant-xy-bridge",
        }),
      ]),
    });
    expect(getGuidedCollectionBySlug("rates-and-equilibrium-lesson-set")).toMatchObject({
      format: "lesson-set",
      entryDiagnostic: {
        skipToStep: { id: "rates-equilibrium-rebalance-capstone" },
      },
      trackCount: 1,
      challengeStepCount: 1,
      surfaceStepCount: 2,
    });
    expect(getGuidedCollectionBySlug("rates-and-equilibrium-lesson-set").steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "rates-topic-route",
          kind: "surface",
          href: "/concepts/topics/rates-and-equilibrium",
        }),
        expect.objectContaining({
          id: "rates-equilibrium-rebalance-capstone",
          kind: "challenge",
          href: "/concepts/dynamic-equilibrium-le-chateliers-principle?challenge=de-ch-disturb-then-rebalance#challenge-mode",
        }),
        expect.objectContaining({
          id: "rates-solutions-topic-handoff",
          kind: "surface",
          href: "/concepts/topics/solutions-and-ph",
        }),
      ]),
    );
    expect(getGuidedCollectionBySlug("stoichiometry-and-yield-lesson-set")).toMatchObject({
      format: "lesson-set",
      entryDiagnostic: {
        skipToStep: { id: "stoich-yield-capstone" },
      },
      trackCount: 1,
      challengeStepCount: 1,
      surfaceStepCount: 2,
    });
    expect(getGuidedCollectionBySlug("stoichiometry-and-yield-lesson-set").steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "stoich-topic-route",
          kind: "surface",
          href: "/concepts/topics/stoichiometry-and-yield",
        }),
        expect.objectContaining({
          id: "stoich-yield-capstone",
          kind: "challenge",
          href: "/concepts/percent-yield-and-reaction-extent?challenge=pyre-ch-hit-seventy-five-percent-yield#challenge-mode",
        }),
        expect.objectContaining({
          id: "stoich-solutions-topic-handoff",
          kind: "surface",
          href: "/concepts/topics/solutions-and-ph",
        }),
      ]),
    );
    expect(getGuidedCollectionBySlug("solutions-and-ph-lesson-set")).toMatchObject({
      format: "lesson-set",
      entryDiagnostic: {
        skipToStep: { id: "solutions-buffer-capstone" },
      },
      trackCount: 1,
      challengeStepCount: 1,
      surfaceStepCount: 2,
    });
    expect(getGuidedCollectionBySlug("solutions-and-ph-lesson-set").steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "solutions-topic-route",
          kind: "surface",
          href: "/concepts/topics/solutions-and-ph",
        }),
        expect.objectContaining({
          id: "solutions-buffer-capstone",
          kind: "challenge",
          href: "/concepts/buffers-and-neutralization?challenge=bn-ch-hold-near-neutral-under-acid-pulse#challenge-mode",
        }),
        expect.objectContaining({
          id: "solutions-rates-topic-handoff",
          kind: "surface",
          href: "/concepts/topics/rates-and-equilibrium",
        }),
      ]),
    );
    expect(getGuidedCollectionBySlug("algorithms-and-search-playlist")).toMatchObject({
      format: "playlist",
      entryDiagnostic: {
        skipToStep: { id: "algorithms-graph-traversal-revisit" },
      },
      trackCount: 1,
      challengeStepCount: 0,
      surfaceStepCount: 2,
    });
    expect(getGuidedCollectionBySlug("algorithms-and-search-playlist").steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "algorithms-topic-route",
          kind: "surface",
          href: "/concepts/topics/algorithms-and-search",
        }),
        expect.objectContaining({
          id: "algorithms-graph-traversal-revisit",
          kind: "concept",
          href: "/concepts/frontier-and-visited-state-on-graphs",
        }),
        expect.objectContaining({
          id: "algorithms-extension-hub",
          kind: "surface",
          href: "/challenges?track=algorithms-and-search-foundations",
          surfaceKind: "challenge-hub",
        }),
      ]),
    );
  });

  it("rejects guided collections that reference missing tracks or concepts", () => {
    const brokenCollections: GuidedCollectionMetadata[] = [
      {
        id: "guided-collection-alpha",
        slug: "alpha-guided",
        format: "lesson-set",
        title: "Alpha guided",
        summary: "Broken collection",
        introduction: "Broken intro",
        sequenceRationale: "Broken rationale",
        accent: "teal",
        highlights: ["Broken"],
        steps: [
          {
            id: "alpha-track",
            kind: "track",
            title: "Missing track",
            summary: "Broken",
            purpose: "Broken",
            trackSlug: "missing-track",
          },
        ],
      },
    ];

    expect(() => validateGuidedCollectionCatalog(brokenCollections)).toThrow(
      /Unknown starter track slug: missing-track/i,
    );
  });

  it("rejects surface steps that do not point at the expected existing route family", () => {
    const brokenCollections: GuidedCollectionMetadata[] = [
      {
        id: "guided-collection-beta",
        slug: "beta-guided",
        format: "playlist",
        title: "Beta guided",
        summary: "Broken collection",
        introduction: "Broken intro",
        sequenceRationale: "Broken rationale",
        accent: "sky",
        highlights: ["Broken"],
        steps: [
          {
            id: "beta-topic",
            kind: "surface",
            surfaceKind: "topic",
            href: "/concepts",
            title: "Broken topic surface",
            summary: "Broken",
            purpose: "Broken",
            actionLabel: "Open topic",
            relatedConceptSlugs: ["simple-harmonic-motion"],
          },
        ],
      },
    ];

    expect(() => validateGuidedCollectionCatalog(brokenCollections)).toThrow(
      /must point to a topic route/i,
    );
  });
});
