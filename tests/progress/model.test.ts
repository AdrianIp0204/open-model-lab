import { describe, expect, it } from "vitest";
import {
  createEmptyProgressSnapshot,
  deriveConceptMasteryState,
  deriveConceptProgressStatus,
  getChallengeProgressState,
  getConceptResurfacingCue,
  getConceptProgressRecord,
  getConceptProgressSummary,
  normalizeProgressSnapshot,
  selectContinueLearning,
  selectReviewQueue,
} from "@/lib/progress";

describe("progress model", () => {
  it("derives deterministic concept statuses from bounded facts", () => {
    expect(deriveConceptProgressStatus(null)).toBe("not-started");
    expect(
      deriveConceptProgressStatus({
        slug: "simple-harmonic-motion",
        firstVisitedAt: "2026-03-25T10:00:00.000Z",
      }),
    ).toBe("started");
    expect(
      deriveConceptProgressStatus({
        slug: "simple-harmonic-motion",
        firstVisitedAt: "2026-03-25T10:00:00.000Z",
        completedQuickTestAt: "2026-03-25T10:05:00.000Z",
      }),
    ).toBe("practiced");
    expect(
      deriveConceptProgressStatus({
        slug: "simple-harmonic-motion",
        usedChallengeModeAt: "2026-03-25T10:07:00.000Z",
      }),
    ).toBe("practiced");
    expect(
      deriveConceptProgressStatus({
        slug: "simple-harmonic-motion",
        manualCompletedAt: "2026-03-25T10:10:00.000Z",
      }),
    ).toBe("completed");
  });

  it("derives bounded mastery states from the saved learning signals", () => {
    expect(deriveConceptMasteryState(null)).toBe("new");
    expect(
      deriveConceptMasteryState({
        slug: "simple-harmonic-motion",
        usedPredictionModeAt: "2026-03-25T10:05:00.000Z",
      }),
    ).toBe("practiced");
    expect(
      deriveConceptMasteryState({
        slug: "simple-harmonic-motion",
        completedQuickTestAt: "2026-03-25T10:05:00.000Z",
      }),
    ).toBe("shaky");
    expect(
      deriveConceptMasteryState({
        slug: "simple-harmonic-motion",
        completedChallenges: {
          "shm-ch-period-sprint": "2026-03-25T10:10:00.000Z",
          "shm-ch-phase-check": "2026-03-25T10:12:00.000Z",
        },
      }),
    ).toBe("solid");
    expect(
      deriveConceptMasteryState({
        slug: "simple-harmonic-motion",
        completedQuickTestAt: "2026-03-25T10:05:00.000Z",
        manualCompletedAt: "2026-03-25T10:15:00.000Z",
      }),
    ).toBe("solid");
  });

  it("normalizes invalid or mismatched stored data safely", () => {
    expect(normalizeProgressSnapshot(null)).toEqual(createEmptyProgressSnapshot());
    expect(
      normalizeProgressSnapshot({
        version: 999,
        concepts: {
          "simple-harmonic-motion": {
            slug: "simple-harmonic-motion",
            firstVisitedAt: "2026-03-25T10:00:00.000Z",
          },
        },
      }),
    ).toEqual(createEmptyProgressSnapshot());
  });

  it("normalizes completed challenge maps when they are present", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "simple-harmonic-motion": {
          slug: "simple-harmonic-motion",
          completedChallenges: {
            "shm-ch-period-sprint": "2026-03-25T10:10:00.000Z",
          },
        },
      },
    });

    expect(snapshot.concepts["simple-harmonic-motion"]?.completedChallenges).toEqual({
      "shm-ch-period-sprint": "2026-03-25T10:10:00.000Z",
    });
  });

  it("normalizes topic test progress records when they are present", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {},
      topicTests: {
        circuits: {
          slug: "circuits",
          completedAt: "2026-04-15T10:10:00.000Z",
          attemptCount: 2,
          lastIncorrectCount: 1,
          lastQuestionCount: 10,
        },
      },
    });

    expect(snapshot.topicTests?.circuits).toEqual({
      slug: "circuits",
      completedAt: "2026-04-15T10:10:00.000Z",
      attemptCount: 2,
      lastIncorrectCount: 1,
      lastQuestionCount: 10,
    });
  });

  it("normalizes pack test progress records when they are present", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {},
      packTests: {
        "physics-connected-models": {
          slug: "physics-connected-models",
          completedAt: "2026-04-16T08:00:00.000Z",
          attemptCount: 2,
          lastIncorrectCount: 1,
          lastQuestionCount: 16,
        },
      },
    });

    expect(snapshot.packTests?.["physics-connected-models"]).toEqual({
      slug: "physics-connected-models",
      completedAt: "2026-04-16T08:00:00.000Z",
      attemptCount: 2,
      lastIncorrectCount: 1,
      lastQuestionCount: 16,
    });
  });

  it("tracks exact started challenge state without treating every challenge in the concept as active", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "projectile-motion": {
          slug: "projectile-motion",
          usedChallengeModeAt: "2026-03-25T10:00:00.000Z",
          startedChallenges: {
            "pm-ch-flat-far-shot": "2026-03-25T10:01:00.000Z",
          },
        },
      },
    });
    const record = snapshot.concepts["projectile-motion"];

    expect(getChallengeProgressState(record, "pm-ch-flat-far-shot")).toBe("started");
    expect(getChallengeProgressState(record, "pm-ch-apex-freeze")).toBe("to-try");
  });

  it("resolves concept progress by canonical id when the slug lookup misses", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "old-simple-harmonic-motion": {
          conceptId: "concept-shm",
          slug: "old-simple-harmonic-motion",
          firstVisitedAt: "2026-03-25T10:00:00.000Z",
        },
      },
    });

    expect(
      getConceptProgressRecord(snapshot, {
        id: "concept-shm",
        slug: "simple-harmonic-motion",
      }),
    ).toMatchObject({
      conceptId: "concept-shm",
      slug: "old-simple-harmonic-motion",
    });
  });

  it("selects the most recent unfinished concept for continue learning", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "simple-harmonic-motion": {
          conceptId: "concept-shm",
          slug: "simple-harmonic-motion",
          firstVisitedAt: "2026-03-25T08:00:00.000Z",
          lastVisitedAt: "2026-03-25T08:10:00.000Z",
        },
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          firstVisitedAt: "2026-03-25T09:00:00.000Z",
          usedPredictionModeAt: "2026-03-25T09:15:00.000Z",
        },
        "damping-resonance": {
          conceptId: "concept-damping-resonance",
          slug: "damping-resonance",
          manualCompletedAt: "2026-03-25T10:00:00.000Z",
        },
      },
    });

    const result = selectContinueLearning(snapshot, [
      {
        id: "concept-shm",
        slug: "simple-harmonic-motion",
        title: "Simple Harmonic Motion",
      },
      {
        id: "concept-damping-resonance",
        slug: "damping-resonance",
        title: "Damping / Resonance",
      },
      {
        id: "concept-projectile-motion",
        slug: "projectile-motion",
        title: "Projectile Motion",
      },
    ]);

    expect(result.primary?.concept.slug).toBe("projectile-motion");
    expect(result.recent.map((item) => item.concept.slug)).toContain("damping-resonance");
  });

  it("builds a bounded review queue from stale and low-confidence local signals", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "vectors-components": {
          conceptId: "concept-vectors-components",
          slug: "vectors-components",
          firstVisitedAt: "2026-03-22T08:00:00.000Z",
          lastVisitedAt: "2026-03-22T08:10:00.000Z",
        },
        "simple-harmonic-motion": {
          conceptId: "concept-shm",
          slug: "simple-harmonic-motion",
          firstVisitedAt: "2026-03-18T08:00:00.000Z",
          lastVisitedAt: "2026-03-18T08:10:00.000Z",
        },
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          manualCompletedAt: "2026-03-22T09:00:00.000Z",
        },
        "damping-resonance": {
          conceptId: "concept-damping-resonance",
          slug: "damping-resonance",
          manualCompletedAt: "2026-03-01T10:00:00.000Z",
          completedQuickTestAt: "2026-03-01T09:55:00.000Z",
        },
      },
    });

    const result = selectReviewQueue(
      snapshot,
      [
        {
          id: "concept-vectors-components",
          slug: "vectors-components",
          title: "Vectors and Components",
        },
        {
          id: "concept-shm",
          slug: "simple-harmonic-motion",
          title: "Simple Harmonic Motion",
        },
        {
          id: "concept-projectile-motion",
          slug: "projectile-motion",
          title: "Projectile Motion",
        },
        {
          id: "concept-damping-resonance",
          slug: "damping-resonance",
          title: "Damping / Resonance",
        },
      ],
      3,
      {
        now: new Date("2026-03-27T12:00:00.000Z"),
      },
    );

    expect(result.map((item) => item.concept.slug)).toEqual([
      "projectile-motion",
      "simple-harmonic-motion",
      "damping-resonance",
    ]);
    expect(result[0]?.reasonKind).toBe("confidence");
    expect(result[1]?.reasonKind).toBe("unfinished");
    expect(result[2]?.reasonKind).toBe("stale");
    expect(result.map((item) => item.concept.slug)).not.toContain("vectors-components");
  });

  it("surfaces repeated quick-test misses as a revisit cue before lighter signals", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          completedQuickTestAt: "2026-03-26T09:00:00.000Z",
          quickTestAttemptCount: 2,
          quickTestLastIncorrectCount: 2,
          quickTestMissStreak: 2,
          quickTestLastMissedAt: "2026-03-26T09:00:00.000Z",
        },
      },
    });

    const summary = getConceptProgressSummary(snapshot, {
      id: "concept-projectile-motion",
      slug: "projectile-motion",
      title: "Projectile Motion",
    });
    const cue = getConceptResurfacingCue(summary, {
      now: new Date("2026-03-27T12:00:00.000Z"),
    });

    expect(cue).toMatchObject({
      reasonKind: "missed-checks",
      actionLabel: "Retry quick test",
    });
    expect(cue?.reason).toMatch(/missed questions 2 times in a row/i);
  });

  it("surfaces unfinished challenge work as its own revisit cue", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          usedChallengeModeAt: "2026-03-26T09:00:00.000Z",
          startedChallenges: {
            "pm-ch-flat-far-shot": "2026-03-26T09:02:00.000Z",
          },
        },
      },
    });

    const summary = getConceptProgressSummary(snapshot, {
      id: "concept-projectile-motion",
      slug: "projectile-motion",
      title: "Projectile Motion",
    });
    const cue = getConceptResurfacingCue(summary, {
      now: new Date("2026-03-27T12:00:00.000Z"),
    });

    expect(cue).toMatchObject({
      reasonKind: "challenge",
      actionLabel: "Continue challenge",
    });
    expect(cue?.reason).toMatch(/challenge run is already started/i);
  });
});
