import { describe, expect, it } from "vitest";
import {
  getRecommendedGoalPaths,
  getRecommendedGoalPathsForTopic,
  validateRecommendedGoalPathCatalog,
  type RecommendedGoalPathMetadata,
} from "@/lib/content";

describe("recommended goal paths", () => {
  it("loads the shipped goal paths in authored order and resolves existing surfaces", () => {
    const goalPaths = getRecommendedGoalPaths();

    expect(goalPaths.map((goalPath) => goalPath.slug)).toEqual([
      "waves-intuition",
      "teacher-electricity-bridge",
      "prepare-for-electromagnetism",
      "functions-and-change",
      "vectors-and-motion-bridge",
      "complex-and-parametric-motion",
      "chemistry-rates-equilibrium",
      "chemistry-stoichiometry-and-yield",
      "solutions-and-ph",
      "algorithms-and-search",
    ]);
    expect(goalPaths[0]).toMatchObject({
      goalKind: "build-intuition",
      topicSlugs: ["waves"],
      relatedCollections: [
        expect.objectContaining({
          slug: "waves-evidence-loop",
          path: "/guided/waves-evidence-loop",
        }),
      ],
    });
    expect(goalPaths[2].steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "guided-collection",
          href: "/guided/electricity-to-magnetism-bridge",
        }),
        expect.objectContaining({
          kind: "track",
          href: "/tracks/magnetic-fields",
        }),
      ]),
    );
    expect(getRecommendedGoalPathsForTopic("waves").map((goalPath) => goalPath.slug)).toEqual([
      "waves-intuition",
    ]);
    expect(getRecommendedGoalPathsForTopic("electricity").map((goalPath) => goalPath.slug)).toEqual([
      "teacher-electricity-bridge",
    ]);
    expect(getRecommendedGoalPathsForTopic("circuits").map((goalPath) => goalPath.slug)).toEqual([
      "teacher-electricity-bridge",
      "prepare-for-electromagnetism",
    ]);
    expect(getRecommendedGoalPathsForTopic("magnetism").map((goalPath) => goalPath.slug)).toEqual([
      "prepare-for-electromagnetism",
    ]);
    expect(
      getRecommendedGoalPathsForTopic("electromagnetism").map((goalPath) => goalPath.slug),
    ).toEqual(["prepare-for-electromagnetism"]);
    expect(getRecommendedGoalPathsForTopic("functions").map((goalPath) => goalPath.slug)).toEqual([
      "functions-and-change",
    ]);
    expect(getRecommendedGoalPathsForTopic("vectors").map((goalPath) => goalPath.slug)).toEqual([
      "vectors-and-motion-bridge",
      "complex-and-parametric-motion",
    ]);
    expect(
      getRecommendedGoalPathsForTopic("complex-numbers-and-parametric-motion").map(
        (goalPath) => goalPath.slug,
      ),
    ).toEqual([
      "complex-and-parametric-motion",
    ]);
    expect(
      getRecommendedGoalPathsForTopic("rates-and-equilibrium").map((goalPath) => goalPath.slug),
    ).toEqual(["chemistry-rates-equilibrium", "solutions-and-ph"]);
    expect(
      getRecommendedGoalPathsForTopic("stoichiometry-and-yield").map((goalPath) => goalPath.slug),
    ).toEqual(["chemistry-stoichiometry-and-yield"]);
    expect(getRecommendedGoalPathsForTopic("solutions-and-ph").map((goalPath) => goalPath.slug)).toEqual([
      "solutions-and-ph",
    ]);
    expect(getRecommendedGoalPathsForTopic("algorithms-and-search").map((goalPath) => goalPath.slug)).toEqual([
      "algorithms-and-search",
    ]);
    expect(goalPaths[3]).toMatchObject({
      goalKind: "build-intuition",
      topicSlugs: ["functions", "calculus"],
      relatedCollections: [
        expect.objectContaining({
          slug: "functions-and-change-lesson-set",
          path: "/guided/functions-and-change-lesson-set",
        }),
      ],
      relatedTracks: [
        expect.objectContaining({
          slug: "functions-and-change",
          path: "/tracks/functions-and-change",
        }),
      ],
    });
    expect(goalPaths[3].steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "guided-collection",
          href: "/guided/functions-and-change-lesson-set",
        }),
      ]),
    );
    expect(goalPaths[4]).toMatchObject({
      goalKind: "prepare-branch",
      topicSlugs: ["vectors", "mechanics"],
      relatedCollections: [
        expect.objectContaining({
          slug: "vectors-to-mechanics-bridge",
          path: "/guided/vectors-to-mechanics-bridge",
        }),
      ],
      relatedTracks: [
        expect.objectContaining({
          slug: "vectors-and-motion-bridge",
          path: "/tracks/vectors-and-motion-bridge",
        }),
      ],
    });
    expect(goalPaths[4].steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "guided-collection",
          href: "/guided/vectors-to-mechanics-bridge",
        }),
      ]),
    );
    expect(goalPaths[5]).toMatchObject({
      goalKind: "build-intuition",
      topicSlugs: ["complex-numbers-and-parametric-motion", "vectors"],
      relatedCollections: [
        expect.objectContaining({
          slug: "complex-and-parametric-motion-lesson-set",
          path: "/guided/complex-and-parametric-motion-lesson-set",
        }),
      ],
      relatedTracks: [
        expect.objectContaining({
          slug: "complex-and-parametric-motion",
          path: "/tracks/complex-and-parametric-motion",
        }),
      ],
    });
    expect(goalPaths[5].steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "guided-collection",
          href: "/guided/complex-and-parametric-motion-lesson-set",
        }),
      ]),
    );
    expect(goalPaths[6]).toMatchObject({
      goalKind: "build-intuition",
      topicSlugs: ["rates-and-equilibrium", "thermodynamics"],
      relatedCollections: [
        expect.objectContaining({
          slug: "rates-and-equilibrium-lesson-set",
          path: "/guided/rates-and-equilibrium-lesson-set",
        }),
      ],
      relatedTracks: [
        expect.objectContaining({
          slug: "rates-and-equilibrium",
          path: "/tracks/rates-and-equilibrium",
        }),
      ],
    });
    expect(goalPaths[6].steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "guided-collection",
          href: "/guided/rates-and-equilibrium-lesson-set",
        }),
      ]),
    );
    expect(goalPaths[7]).toMatchObject({
      goalKind: "build-intuition",
      topicSlugs: ["stoichiometry-and-yield"],
      relatedCollections: [
        expect.objectContaining({
          slug: "stoichiometry-and-yield-lesson-set",
          path: "/guided/stoichiometry-and-yield-lesson-set",
        }),
      ],
      relatedTracks: [
        expect.objectContaining({
          slug: "stoichiometry-and-yield",
          path: "/tracks/stoichiometry-and-yield",
        }),
      ],
    });
    expect(goalPaths[7].steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "guided-collection",
          href: "/guided/stoichiometry-and-yield-lesson-set",
        }),
      ]),
    );
    expect(goalPaths[8]).toMatchObject({
      goalKind: "build-intuition",
      topicSlugs: ["solutions-and-ph", "rates-and-equilibrium"],
      relatedCollections: [
        expect.objectContaining({
          slug: "solutions-and-ph-lesson-set",
          path: "/guided/solutions-and-ph-lesson-set",
        }),
      ],
      relatedTracks: [
        expect.objectContaining({
          slug: "solutions-and-ph",
          path: "/tracks/solutions-and-ph",
        }),
      ],
    });
    expect(goalPaths[8].steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "guided-collection",
          href: "/guided/solutions-and-ph-lesson-set",
        }),
      ]),
    );
    expect(goalPaths[9]).toMatchObject({
      goalKind: "build-intuition",
      topicSlugs: ["algorithms-and-search"],
      relatedCollections: [
        expect.objectContaining({
          slug: "algorithms-and-search-playlist",
          path: "/guided/algorithms-and-search-playlist",
        }),
      ],
      relatedTracks: [
        expect.objectContaining({
          slug: "algorithms-and-search-foundations",
          path: "/tracks/algorithms-and-search-foundations",
        }),
      ],
    });
    expect(goalPaths[9].steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "guided-collection",
          href: "/guided/algorithms-and-search-playlist",
        }),
        expect.objectContaining({
          kind: "concept",
          href: "/concepts/frontier-and-visited-state-on-graphs",
        }),
      ]),
    );
  });

  it("rejects goal paths that reference missing collections", () => {
    const brokenGoalPaths: RecommendedGoalPathMetadata[] = [
      {
        id: "recommended-goal-alpha",
        slug: "alpha-goal",
        goalKind: "teacher-objective",
        title: "Alpha goal",
        objective: "Broken goal",
        summary: "Broken summary",
        sequenceRationale: "Broken rationale",
        accent: "sky",
        highlights: ["Broken"],
        topicSlugs: ["electricity"],
        steps: [
          {
            id: "alpha-topic",
            kind: "topic",
            topicSlug: "electricity",
            title: "Topic",
            summary: "Summary",
            purpose: "Purpose",
          },
          {
            id: "alpha-collection",
            kind: "guided-collection",
            collectionSlug: "missing-collection",
            title: "Collection",
            summary: "Summary",
            purpose: "Purpose",
          },
        ],
      },
    ];

    expect(() => validateRecommendedGoalPathCatalog(brokenGoalPaths)).toThrow(
      /Unknown guided collection slug: missing-collection/i,
    );
  });
});
