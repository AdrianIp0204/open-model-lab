import { describe, expect, it } from "vitest";
import { getGuidedCollectionBySlug, getStarterTrackBySlug } from "@/lib/content";
import { normalizeProgressSnapshot, selectAdaptiveReviewQueue } from "@/lib/progress";

describe("adaptive review queue", () => {
  it("can hand stale completed concepts back through recap mode when a track review is the clearest re-entry", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "vectors-components": {
          conceptId: "concept-vectors-components",
          slug: "vectors-components",
          firstVisitedAt: "2026-03-27T09:00:00.000Z",
          lastVisitedAt: "2026-03-27T09:05:00.000Z",
        },
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          manualCompletedAt: "2026-03-01T09:00:00.000Z",
          completedQuickTestAt: "2026-03-01T09:05:00.000Z",
          lastVisitedAt: "2026-03-01T09:05:00.000Z",
        },
      },
    });

    const queue = selectAdaptiveReviewQueue(
      snapshot,
      [
        {
          id: "concept-vectors-components",
          slug: "vectors-components",
          title: "Vectors and Components",
        },
        {
          id: "concept-projectile-motion",
          slug: "projectile-motion",
          title: "Projectile Motion",
        },
      ],
      [getStarterTrackBySlug("motion-and-circular-motion")],
      2,
      {
        now: new Date("2026-03-29T12:00:00.000Z"),
      },
    );

    expect(queue[0]?.concept.slug).toBe("projectile-motion");
    expect(queue[0]?.reasonKind).toBe("stale");
    expect(queue[0]?.primaryAction).toMatchObject({
      kind: "concept",
      href: "/concepts/projectile-motion",
    });
    expect(queue[0]?.secondaryAction).toMatchObject({
      kind: "track-recap",
      href: "/tracks/motion-and-circular-motion?mode=recap",
    });
  });

  it("surfaces an uncleared ready checkpoint before weaker concept-only cues", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "vectors-components": {
          conceptId: "concept-vectors-components",
          slug: "vectors-components",
          manualCompletedAt: "2026-03-20T09:00:00.000Z",
        },
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          manualCompletedAt: "2026-03-21T09:00:00.000Z",
        },
        "uniform-circular-motion": {
          conceptId: "concept-uniform-circular-motion",
          slug: "uniform-circular-motion",
          firstVisitedAt: "2026-03-25T09:00:00.000Z",
          lastVisitedAt: "2026-03-25T09:10:00.000Z",
        },
      },
    });

    const queue = selectAdaptiveReviewQueue(
      snapshot,
      [
        {
          id: "concept-vectors-components",
          slug: "vectors-components",
          title: "Vectors and Components",
        },
        {
          id: "concept-projectile-motion",
          slug: "projectile-motion",
          title: "Projectile Motion",
        },
        {
          id: "concept-uniform-circular-motion",
          slug: "uniform-circular-motion",
          title: "Uniform Circular Motion",
        },
      ],
      [getStarterTrackBySlug("motion-and-circular-motion")],
      2,
      {
        locale: "zh-HK",
        now: new Date("2026-03-29T12:00:00.000Z"),
      },
    );

    expect(queue[0]?.concept.slug).toBe("projectile-motion");
    expect(queue[0]?.reasonKind).toBe("checkpoint");
    expect(queue[0]?.primaryAction).toMatchObject({
      kind: "checkpoint",
      href: "/zh-HK/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode",
    });
    expect(queue[0]?.reason).toMatch(/still open even though later motion and circular motion work has already started/i);
  });

  it("prefers the in-sequence math bridge context for shared vectors when earlier bridge work is already complete", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "vectors-in-2d": {
          conceptId: "concept-vectors-in-2d",
          slug: "vectors-in-2d",
          manualCompletedAt: "2026-04-02T09:00:00.000Z",
          completedChallenges: {
            "v2d-ch-near-zero-result": "2026-04-02T09:05:00.000Z",
          },
        },
        "vectors-components": {
          conceptId: "concept-vectors-components",
          slug: "vectors-components",
          manualCompletedAt: "2026-04-02T10:00:00.000Z",
          lastVisitedAt: "2026-04-02T10:05:00.000Z",
        },
      },
    });

    const queue = selectAdaptiveReviewQueue(
      snapshot,
      [
        {
          id: "concept-vectors-in-2d",
          slug: "vectors-in-2d",
          title: "Vectors in 2D",
        },
        {
          id: "concept-vectors-components",
          slug: "vectors-components",
          title: "Vectors and Components",
        },
      ],
      [
        getStarterTrackBySlug("motion-and-circular-motion"),
        getStarterTrackBySlug("vectors-and-motion-bridge"),
      ],
      1,
      {
        now: new Date("2026-04-03T12:00:00.000Z"),
      },
    );

    expect(queue[0]?.concept.slug).toBe("vectors-components");
    expect(queue[0]?.trackContext).toMatchObject({
      trackSlug: "vectors-and-motion-bridge",
      focusKind: "checkpoint",
      action: {
        kind: "checkpoint",
        href: "/concepts/vectors-components?challenge=vc-ch-equal-components#challenge-mode",
      },
    });
  });

  it("can surface entry-diagnostic recovery when a starter probe is not settled yet", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "wave-interference": {
          conceptId: "concept-wave-interference",
          slug: "wave-interference",
          manualCompletedAt: "2026-03-27T09:00:00.000Z",
          lastVisitedAt: "2026-03-27T09:05:00.000Z",
        },
      },
    });

    const queue = selectAdaptiveReviewQueue(
      snapshot,
      [
        {
          id: "concept-wave-interference",
          slug: "wave-interference",
          title: "Wave Interference",
        },
      ],
      [getStarterTrackBySlug("waves")],
      1,
      {
        now: new Date("2026-03-29T12:00:00.000Z"),
      },
    );

    expect(queue[0]?.concept.slug).toBe("wave-interference");
    expect(queue[0]?.reasonKind).toBe("diagnostic");
    expect(queue[0]?.primaryAction).toMatchObject({
      kind: "challenge",
      href: "/concepts/wave-interference?challenge=wi-ch-find-dark-band#challenge-mode",
    });
    expect(queue[0]?.reason).toMatch(/entry diagnostic/i);
  });

  it("preserves locale in entry-diagnostic recovery actions", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "wave-interference": {
          conceptId: "concept-wave-interference",
          slug: "wave-interference",
          manualCompletedAt: "2026-03-27T09:00:00.000Z",
          lastVisitedAt: "2026-03-27T09:05:00.000Z",
        },
      },
    });

    const queue = selectAdaptiveReviewQueue(
      snapshot,
      [
        {
          id: "concept-wave-interference",
          slug: "wave-interference",
          title: "Wave Interference",
        },
      ],
      [getStarterTrackBySlug("waves")],
      1,
      {
        now: new Date("2026-03-29T12:00:00.000Z"),
        locale: "zh-HK",
      },
    );

    expect(queue[0]?.primaryAction).toMatchObject({
      kind: "challenge",
      href: "/zh-HK/concepts/wave-interference?challenge=wi-ch-find-dark-band#challenge-mode",
    });
  });

  it("adds prerequisite remediation alongside the existing recap follow-up when quick-test weakness points back to an earlier bridge", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "vectors-components": {
          conceptId: "concept-vectors-components",
          slug: "vectors-components",
          firstVisitedAt: "2026-03-28T09:00:00.000Z",
          lastVisitedAt: "2026-03-28T11:05:00.000Z",
        },
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          completedQuickTestAt: "2026-03-27T10:00:00.000Z",
          quickTestAttemptCount: 2,
          quickTestLastIncorrectCount: 2,
          quickTestMissStreak: 2,
          quickTestLastMissedAt: "2026-03-27T10:00:00.000Z",
        },
      },
    });
    const concepts = [
      {
        id: "concept-vectors-components",
        slug: "vectors-components",
        title: "Vectors and Components",
        shortTitle: "Vectors",
      },
      {
        id: "concept-projectile-motion",
        slug: "projectile-motion",
        title: "Projectile Motion",
        shortTitle: "Projectile",
        prerequisites: ["vectors-components"],
      },
    ];

    const queue = selectAdaptiveReviewQueue(
      snapshot,
      concepts,
      [getStarterTrackBySlug("motion-and-circular-motion")],
      1,
      {
        allConcepts: concepts,
        now: new Date("2026-03-29T12:00:00.000Z"),
      },
    );

    expect(queue[0]?.remediationSuggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "prerequisite-concept",
          action: expect.objectContaining({
            href: "/concepts/vectors-components",
          }),
        }),
      ]),
    );
  });

  it("preserves locale in prerequisite remediation links", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "vectors-components": {
          conceptId: "concept-vectors-components",
          slug: "vectors-components",
          firstVisitedAt: "2026-03-28T09:00:00.000Z",
          lastVisitedAt: "2026-03-28T11:05:00.000Z",
        },
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          completedQuickTestAt: "2026-03-27T10:00:00.000Z",
          quickTestAttemptCount: 2,
          quickTestLastIncorrectCount: 2,
          quickTestMissStreak: 2,
          quickTestLastMissedAt: "2026-03-27T10:00:00.000Z",
        },
      },
    });
    const concepts = [
      {
        id: "concept-vectors-components",
        slug: "vectors-components",
        title: "Vectors and Components",
        shortTitle: "Vectors",
      },
      {
        id: "concept-projectile-motion",
        slug: "projectile-motion",
        title: "Projectile Motion",
        shortTitle: "Projectile",
        prerequisites: ["vectors-components"],
      },
    ];

    const queue = selectAdaptiveReviewQueue(
      snapshot,
      concepts,
      [getStarterTrackBySlug("motion-and-circular-motion")],
      1,
      {
        allConcepts: concepts,
        locale: "zh-HK",
        now: new Date("2026-03-29T12:00:00.000Z"),
      },
    );

    expect(queue[0]?.remediationSuggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "prerequisite-concept",
          action: expect.objectContaining({
            href: "/zh-HK/concepts/vectors-components",
          }),
        }),
      ]),
    );
  });

  it("can suggest a compact guided collection when a diagnostic cue needs a bounded reset", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "wave-interference": {
          conceptId: "concept-wave-interference",
          slug: "wave-interference",
          manualCompletedAt: "2026-03-27T09:00:00.000Z",
          lastVisitedAt: "2026-03-27T09:05:00.000Z",
        },
      },
    });
    const concepts = [
      {
        id: "concept-wave-interference",
        slug: "wave-interference",
        title: "Wave Interference",
      },
    ];

    const queue = selectAdaptiveReviewQueue(
      snapshot,
      concepts,
      [getStarterTrackBySlug("waves")],
      1,
      {
        allConcepts: concepts,
        guidedCollections: [getGuidedCollectionBySlug("waves-evidence-loop")],
        now: new Date("2026-03-29T12:00:00.000Z"),
      },
    );

    expect(queue[0]?.remediationSuggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "guided-collection",
          action: expect.objectContaining({
            href: "/guided/waves-evidence-loop",
          }),
        }),
      ]),
    );
  });

  it("preserves locale in guided collection bundle remediation links", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "simple-harmonic-motion": {
          conceptId: "concept-shm",
          slug: "simple-harmonic-motion",
          firstVisitedAt: "2026-03-29T10:00:00.000Z",
          lastVisitedAt: "2026-03-29T10:05:00.000Z",
        },
        "electric-potential": {
          conceptId: "concept-electric-potential",
          slug: "electric-potential",
          completedQuickTestAt: "2026-03-26T09:00:00.000Z",
          quickTestAttemptCount: 2,
          quickTestLastIncorrectCount: 2,
          quickTestMissStreak: 2,
          quickTestLastMissedAt: "2026-03-26T09:00:00.000Z",
        },
      },
    });
    const concepts = [
      {
        id: "concept-shm",
        slug: "simple-harmonic-motion",
        title: "Simple Harmonic Motion",
        shortTitle: "SHM",
      },
      {
        id: "concept-electric-fields",
        slug: "electric-fields",
        title: "Electric Fields",
        shortTitle: "E-fields",
      },
      {
        id: "concept-electric-potential",
        slug: "electric-potential",
        title: "Electric Potential",
        shortTitle: "Potential",
        prerequisites: ["electric-fields"],
      },
    ];

    const queue = selectAdaptiveReviewQueue(
      snapshot,
      concepts,
      [getStarterTrackBySlug("electricity")],
      1,
      {
        allConcepts: concepts,
        guidedCollections: [getGuidedCollectionBySlug("electricity-bridge-lesson-set")],
        locale: "zh-HK",
        now: new Date("2026-03-29T12:00:00.000Z"),
      },
    );

    expect(queue[0]?.remediationSuggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "guided-collection-bundle",
          action: expect.objectContaining({
            href: expect.stringMatching(
              /^\/zh-HK\/guided\/electricity-bridge-lesson-set\?bundle=v1\.[A-Za-z0-9_-]+#concept-bundle$/,
            ),
          }),
        }),
      ]),
    );
  });

  it("can switch from a full collection page to a compact concept bundle when that keeps the recovery path tighter", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "simple-harmonic-motion": {
          conceptId: "concept-shm",
          slug: "simple-harmonic-motion",
          firstVisitedAt: "2026-03-29T10:00:00.000Z",
          lastVisitedAt: "2026-03-29T10:05:00.000Z",
        },
        "electric-potential": {
          conceptId: "concept-electric-potential",
          slug: "electric-potential",
          completedQuickTestAt: "2026-03-26T09:00:00.000Z",
          quickTestAttemptCount: 2,
          quickTestLastIncorrectCount: 2,
          quickTestMissStreak: 2,
          quickTestLastMissedAt: "2026-03-26T09:00:00.000Z",
        },
      },
    });
    const concepts = [
      {
        id: "concept-shm",
        slug: "simple-harmonic-motion",
        title: "Simple Harmonic Motion",
        shortTitle: "SHM",
      },
      {
        id: "concept-electric-fields",
        slug: "electric-fields",
        title: "Electric Fields",
        shortTitle: "E-fields",
      },
      {
        id: "concept-electric-potential",
        slug: "electric-potential",
        title: "Electric Potential",
        shortTitle: "Potential",
        prerequisites: ["electric-fields"],
      },
    ];

    const queue = selectAdaptiveReviewQueue(
      snapshot,
      concepts,
      [getStarterTrackBySlug("electricity")],
      1,
      {
        allConcepts: concepts,
        guidedCollections: [getGuidedCollectionBySlug("electricity-bridge-lesson-set")],
        now: new Date("2026-03-29T12:00:00.000Z"),
      },
    );

    expect(queue[0]?.reasonKind).toBe("missed-checks");
    expect(queue[0]?.remediationSuggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "guided-collection-bundle",
          title: "Open Electric Potential focus bundle",
          action: expect.objectContaining({
            label: "Open focus bundle",
            href: expect.stringMatching(
              /^\/guided\/electricity-bridge-lesson-set\?bundle=v1\.[A-Za-z0-9_-]+#concept-bundle$/,
            ),
          }),
        }),
      ]),
    );
  });
});
