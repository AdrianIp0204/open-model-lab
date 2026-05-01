import { describe, expect, it } from "vitest";
import { getChallengeDiscoveryIndex, getConceptBySlug } from "@/lib/content";

describe("math checkpoint authoring", () => {
  it("registers one stable checkpoint challenge for the new plane, rotation, and vector concepts", () => {
    const index = getChallengeDiscoveryIndex();
    const cases = [
      {
        conceptSlug: "unit-circle-sine-cosine-from-rotation",
        challengeId: "ucr-ch-quadrant-two-sign-read",
        title: "Quadrant II sign checkpoint",
        topicSlug: "complex-numbers-and-parametric-motion",
        topicPath: "/concepts/topics/complex-numbers-and-parametric-motion",
        starterTracks: [
          expect.objectContaining({
            slug: "complex-and-parametric-motion",
            stepIndex: 1,
            totalSteps: 6,
          }),
        ],
      },
      {
        conceptSlug: "polar-coordinates-radius-and-angle",
        challengeId: "polar-ch-second-quadrant-xy-bridge",
        title: "Radius-angle to x-y checkpoint",
        topicSlug: "complex-numbers-and-parametric-motion",
        topicPath: "/concepts/topics/complex-numbers-and-parametric-motion",
        starterTracks: [
          expect.objectContaining({
            slug: "complex-and-parametric-motion",
            stepIndex: 2,
            totalSteps: 6,
          }),
        ],
      },
      {
        conceptSlug: "trig-identities-from-unit-circle-geometry",
        challengeId: "tig-ch-three-four-five-balance",
        title: "Three-four-five identity checkpoint",
        topicSlug: "complex-numbers-and-parametric-motion",
        topicPath: "/concepts/topics/complex-numbers-and-parametric-motion",
        starterTracks: [
          expect.objectContaining({
            slug: "complex-and-parametric-motion",
            stepIndex: 3,
            totalSteps: 6,
          }),
        ],
      },
      {
        conceptSlug: "inverse-trig-angle-from-ratio",
        challengeId: "iatr-ch-quadrant-two-ratio-recovery",
        title: "Quadrant II angle-from-ratio checkpoint",
        topicSlug: "complex-numbers-and-parametric-motion",
        topicPath: "/concepts/topics/complex-numbers-and-parametric-motion",
        starterTracks: [
          expect.objectContaining({
            slug: "complex-and-parametric-motion",
            stepIndex: 4,
            totalSteps: 6,
          }),
        ],
      },
      {
        conceptSlug: "vectors-components",
        challengeId: "vc-ch-equal-components",
        title: "Equal components",
        topicSlug: "mechanics",
        topicPath: "/concepts/topics/mechanics",
        starterTracks: expect.arrayContaining([
          expect.objectContaining({
            slug: "motion-and-circular-motion",
            stepIndex: 0,
            totalSteps: 3,
          }),
          expect.objectContaining({
            slug: "vectors-and-motion-bridge",
            stepIndex: 1,
            totalSteps: 2,
          }),
        ]),
      },
      {
        conceptSlug: "dot-product-angle-and-projection",
        challengeId: "dpp-ch-collapse-the-projection",
        title: "Orthogonal projection checkpoint",
        topicSlug: "vectors",
        topicPath: "/concepts/topics/vectors",
        starterTracks: [],
      },
      {
        conceptSlug: "matrix-transformations",
        challengeId: "mt-ch-build-right-shear",
        title: "Right-shear checkpoint",
        topicSlug: "vectors",
        topicPath: "/concepts/topics/vectors",
        starterTracks: [],
      },
    ] as const;

    for (const testCase of cases) {
      const concept = getConceptBySlug(testCase.conceptSlug);
      const entry = index.entries.find((item) => item.id === testCase.challengeId);

      expect(concept.challengeMode?.items.map((item) => item.id), testCase.conceptSlug).toEqual(
        expect.arrayContaining([testCase.challengeId]),
      );
      expect(
        concept.challengeMode?.items.find((item) => item.id === testCase.challengeId)?.title,
        testCase.conceptSlug,
      ).toBe(testCase.title);

      expect(entry, testCase.challengeId).toMatchObject({
        title: testCase.title,
        href: `/concepts/${testCase.conceptSlug}?challenge=${testCase.challengeId}#challenge-mode`,
        concept: {
          slug: testCase.conceptSlug,
          title: concept.title,
        },
        topic: {
          slug: testCase.topicSlug,
          path: testCase.topicPath,
        },
      });
      expect(entry?.starterTracks, testCase.challengeId).toEqual(testCase.starterTracks);
    }
  });
});
