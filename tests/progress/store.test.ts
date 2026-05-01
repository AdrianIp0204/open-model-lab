// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  forceProgressSync,
  localConceptProgressStore,
  markConceptCompleted,
  PROGRESS_STORAGE_KEY,
  recordChallengeCompleted,
  recordChallengeStarted,
  recordConceptVisit,
  recordPackTestStarted,
  recordQuickTestCompleted,
  recordQuickTestStarted,
  recordTopicTestStarted,
  resetConceptProgress,
} from "@/lib/progress";

describe("local progress store", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("persists normalized progress in localStorage", () => {
    recordConceptVisit({
      id: "concept-shm",
      slug: "simple-harmonic-motion",
      title: "Simple Harmonic Motion",
    });
    markConceptCompleted({
      id: "concept-shm",
      slug: "simple-harmonic-motion",
      title: "Simple Harmonic Motion",
    });

    localConceptProgressStore.resetForTests();

    const snapshot = localConceptProgressStore.getSnapshot();

    expect(snapshot.concepts["simple-harmonic-motion"]).toMatchObject({
      conceptId: "concept-shm",
      slug: "simple-harmonic-motion",
    });
    expect(snapshot.concepts["simple-harmonic-motion"]?.manualCompletedAt).toBeTruthy();
    expect(window.localStorage.getItem(PROGRESS_STORAGE_KEY)).toContain(
      "\"simple-harmonic-motion\"",
    );
  });

  it("resets a single concept record without breaking the rest of the store", () => {
    recordConceptVisit({
      id: "concept-shm",
      slug: "simple-harmonic-motion",
      title: "Simple Harmonic Motion",
    });
    recordConceptVisit({
      id: "concept-projectile-motion",
      slug: "projectile-motion",
      title: "Projectile Motion",
    });

    resetConceptProgress({ slug: "simple-harmonic-motion" });

    const snapshot = localConceptProgressStore.getSnapshot();

    expect(snapshot.concepts["simple-harmonic-motion"]).toBeUndefined();
    expect(snapshot.concepts["projectile-motion"]).toBeTruthy();
  });

  it("updates an existing record by canonical id when the slug key changes", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "old-simple-harmonic-motion": {
            conceptId: "concept-shm",
            slug: "old-simple-harmonic-motion",
            firstVisitedAt: "2026-03-25T10:00:00.000Z",
          },
        },
      }),
    );

    localConceptProgressStore.resetForTests();

    recordConceptVisit({
      id: "concept-shm",
      slug: "simple-harmonic-motion",
      title: "Simple Harmonic Motion",
    });

    const snapshot = localConceptProgressStore.getSnapshot();

    expect(snapshot.concepts["old-simple-harmonic-motion"]).toBeUndefined();
    expect(snapshot.concepts["simple-harmonic-motion"]).toMatchObject({
      conceptId: "concept-shm",
      slug: "simple-harmonic-motion",
    });
  });

  it("stores completed challenge ids inside the concept record", () => {
    recordChallengeCompleted(
      {
        id: "concept-shm",
        slug: "simple-harmonic-motion",
        title: "Simple Harmonic Motion",
      },
      "shm-ch-period-sprint",
    );

    const snapshot = localConceptProgressStore.getSnapshot();

    expect(snapshot.concepts["simple-harmonic-motion"]?.completedChallenges).toMatchObject({
      "shm-ch-period-sprint": expect.any(String),
    });
  });

  it("stores exact started challenge ids inside the concept record", () => {
    recordChallengeStarted(
      {
        id: "concept-shm",
        slug: "simple-harmonic-motion",
        title: "Simple Harmonic Motion",
      },
      "shm-ch-phase-check",
    );

    const snapshot = localConceptProgressStore.getSnapshot();

    expect(snapshot.concepts["simple-harmonic-motion"]?.startedChallenges).toMatchObject({
      "shm-ch-phase-check": expect.any(String),
    });
  });

  it("stores lightweight quick-test miss tracking inside the concept record", () => {
    recordQuickTestCompleted(
      {
        id: "concept-shm",
        slug: "simple-harmonic-motion",
        title: "Simple Harmonic Motion",
      },
      {
        incorrectAnswers: 2,
        totalQuestions: 4,
      },
    );

    const snapshot = localConceptProgressStore.getSnapshot();

    expect(snapshot.concepts["simple-harmonic-motion"]).toMatchObject({
      quickTestAttemptCount: 1,
      quickTestLastIncorrectCount: 2,
      quickTestMissStreak: 1,
      quickTestLastMissedAt: expect.any(String),
    });
  });

  it("stores explicit started-at signals for concept, topic, and pack assessments", () => {
    recordQuickTestStarted({
      id: "concept-shm",
      slug: "simple-harmonic-motion",
      title: "Simple Harmonic Motion",
    });
    recordTopicTestStarted("oscillations");
    recordPackTestStarted("physics-connected-models");

    const snapshot = localConceptProgressStore.getSnapshot();

    expect(snapshot.concepts["simple-harmonic-motion"]?.quickTestStartedAt).toBeTruthy();
    expect(snapshot.topicTests?.oscillations?.startedAt).toBeTruthy();
    expect(snapshot.packTests?.["physics-connected-models"]?.startedAt).toBeTruthy();
  });

  it("recovers from an error state after a later successful sync retry", async () => {
    recordConceptVisit({
      id: "concept-projectile-motion",
      slug: "projectile-motion",
      title: "Projectile Motion",
    });

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: "progress_sync_failed",
          error:
            "Account progress could not be synced right now. Local progress in this browser still works, and you can retry in a moment.",
        }),
        {
          status: 500,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );

    localConceptProgressStore.enableRemoteSync({
      id: "user-1",
      email: "student@example.com",
      displayName: "Lab Student",
      createdAt: "2026-04-01T00:00:00.000Z",
      lastSignedInAt: "2026-04-05T08:00:00.000Z",
    });

    await vi.waitFor(() => {
      expect(localConceptProgressStore.getSyncState().mode).toBe("error");
    });

    expect(localConceptProgressStore.getSyncState().errorMessage).toMatch(
      /could not be synced right now/i,
    );

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          snapshot: {
            version: 1,
            concepts: {
              "projectile-motion": {
                conceptId: "concept-projectile-motion",
                slug: "projectile-motion",
                firstVisitedAt: "2026-04-08T00:00:00.000Z",
              },
            },
          },
          history: {
            version: 1,
            events: [],
            masteryTimeline: [],
          },
          updatedAt: "2026-04-08T00:01:00.000Z",
          mergeSummary: {
            localConceptCount: 1,
            remoteConceptCount: 0,
            mergedConceptCount: 1,
            importedLocalConceptCount: 1,
            importedRemoteConceptCount: 0,
          },
          continueLearningState: null,
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );

    await forceProgressSync();

    await vi.waitFor(() => {
      expect(localConceptProgressStore.getSyncState().mode).toBe("synced");
    });

    expect(localConceptProgressStore.getSyncState()).toMatchObject({
      mode: "synced",
      lastSyncedAt: "2026-04-08T00:01:00.000Z",
      errorMessage: null,
      lastMergeSummary: {
        importedLocalConceptCount: 1,
      },
    });
  });
});
