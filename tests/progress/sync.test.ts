import { describe, expect, it } from "vitest";
import {
  mergeProgressSnapshots,
  summarizeProgressMerge,
  type ProgressSnapshot,
} from "@/lib/progress";

describe("progress sync merge", () => {
  it("merges records by canonical concept id and keeps the current slug key", () => {
    const remoteSnapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "old-simple-harmonic-motion": {
          conceptId: "concept-shm",
          slug: "old-simple-harmonic-motion",
          firstVisitedAt: "2026-03-20T10:00:00.000Z",
        },
      },
    };
    const localSnapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "simple-harmonic-motion": {
          conceptId: "concept-shm",
          slug: "simple-harmonic-motion",
          manualCompletedAt: "2026-03-25T12:00:00.000Z",
          lastVisitedAt: "2026-03-25T12:00:00.000Z",
        },
      },
    };

    const mergedSnapshot = mergeProgressSnapshots(remoteSnapshot, localSnapshot);

    expect(mergedSnapshot.concepts["old-simple-harmonic-motion"]).toBeUndefined();
    expect(mergedSnapshot.concepts["simple-harmonic-motion"]).toMatchObject({
      conceptId: "concept-shm",
      slug: "simple-harmonic-motion",
      firstVisitedAt: "2026-03-20T10:00:00.000Z",
      manualCompletedAt: "2026-03-25T12:00:00.000Z",
    });
  });

  it("unions remote and local concepts without dropping challenge details", () => {
    const remoteSnapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          startedChallenges: {
            "pm-ch-flat-shot": "2026-03-20T10:00:00.000Z",
          },
        },
      },
    };
    const localSnapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "simple-harmonic-motion": {
          conceptId: "concept-shm",
          slug: "simple-harmonic-motion",
          completedChallenges: {
            "shm-ch-period-sprint": "2026-03-21T10:00:00.000Z",
          },
        },
      },
    };

    const mergedSnapshot = mergeProgressSnapshots(remoteSnapshot, localSnapshot);
    const mergeSummary = summarizeProgressMerge(
      remoteSnapshot,
      localSnapshot,
      mergedSnapshot,
    );

    expect(Object.keys(mergedSnapshot.concepts)).toEqual([
      "projectile-motion",
      "simple-harmonic-motion",
    ]);
    expect(
      mergedSnapshot.concepts["projectile-motion"]?.startedChallenges?.["pm-ch-flat-shot"],
    ).toBe("2026-03-20T10:00:00.000Z");
    expect(
      mergedSnapshot.concepts["simple-harmonic-motion"]?.completedChallenges?.[
        "shm-ch-period-sprint"
      ],
    ).toBe("2026-03-21T10:00:00.000Z");
    expect(mergeSummary).toEqual({
      localConceptCount: 1,
      remoteConceptCount: 1,
      mergedConceptCount: 2,
      importedLocalConceptCount: 1,
      importedRemoteConceptCount: 1,
    });
  });

  it("keeps the earliest started challenge timestamp and the latest completed challenge timestamp", () => {
    const remoteSnapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          usedChallengeModeAt: "2026-03-20T10:00:00.000Z",
          startedChallenges: {
            "pm-ch-flat-far-shot": "2026-03-20T10:02:00.000Z",
          },
          completedChallenges: {
            "pm-ch-flat-far-shot": "2026-03-20T10:06:00.000Z",
          },
        },
      },
    };
    const localSnapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          usedChallengeModeAt: "2026-03-21T10:00:00.000Z",
          startedChallenges: {
            "pm-ch-flat-far-shot": "2026-03-21T10:03:00.000Z",
          },
          completedChallenges: {
            "pm-ch-flat-far-shot": "2026-03-21T10:08:00.000Z",
          },
        },
      },
    };

    const mergedSnapshot = mergeProgressSnapshots(remoteSnapshot, localSnapshot);

    expect(
      mergedSnapshot.concepts["projectile-motion"]?.startedChallenges?.["pm-ch-flat-far-shot"],
    ).toBe("2026-03-20T10:02:00.000Z");
    expect(
      mergedSnapshot.concepts["projectile-motion"]?.completedChallenges?.[
        "pm-ch-flat-far-shot"
      ],
    ).toBe("2026-03-21T10:08:00.000Z");
    expect(mergedSnapshot.concepts["projectile-motion"]?.usedChallengeModeAt).toBe(
      "2026-03-21T10:00:00.000Z",
    );
  });

  it("merges topic test progress alongside concept progress", () => {
    const remoteSnapshot: ProgressSnapshot = {
      version: 1,
      concepts: {},
      topicTests: {
        circuits: {
          slug: "circuits",
          completedAt: "2026-04-14T08:00:00.000Z",
          attemptCount: 1,
          lastIncorrectCount: 2,
          lastQuestionCount: 10,
        },
      },
    };
    const localSnapshot: ProgressSnapshot = {
      version: 1,
      concepts: {},
      topicTests: {
        circuits: {
          slug: "circuits",
          completedAt: "2026-04-15T09:00:00.000Z",
          attemptCount: 2,
          lastIncorrectCount: 0,
          lastQuestionCount: 10,
        },
      },
    };

    const mergedSnapshot = mergeProgressSnapshots(remoteSnapshot, localSnapshot);

    expect(mergedSnapshot.topicTests?.circuits).toEqual({
      slug: "circuits",
      completedAt: "2026-04-15T09:00:00.000Z",
      attemptCount: 2,
      lastIncorrectCount: 0,
      lastQuestionCount: 10,
    });
  });

  it("merges pack test progress alongside concept and topic-test progress", () => {
    const remoteSnapshot: ProgressSnapshot = {
      version: 1,
      concepts: {},
      packTests: {
        "physics-connected-models": {
          slug: "physics-connected-models",
          completedAt: "2026-04-15T08:00:00.000Z",
          attemptCount: 1,
          lastIncorrectCount: 2,
          lastQuestionCount: 16,
        },
      },
    };
    const localSnapshot: ProgressSnapshot = {
      version: 1,
      concepts: {},
      packTests: {
        "physics-connected-models": {
          slug: "physics-connected-models",
          completedAt: "2026-04-16T09:00:00.000Z",
          attemptCount: 2,
          lastIncorrectCount: 0,
          lastQuestionCount: 16,
        },
      },
    };

    const mergedSnapshot = mergeProgressSnapshots(remoteSnapshot, localSnapshot);

    expect(mergedSnapshot.packTests?.["physics-connected-models"]).toEqual({
      slug: "physics-connected-models",
      completedAt: "2026-04-16T09:00:00.000Z",
      attemptCount: 2,
      lastIncorrectCount: 0,
      lastQuestionCount: 16,
    });
  });
});
