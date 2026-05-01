import { describe, expect, it } from "vitest";
import { resolveAccountProgressSnapshot } from "@/lib/progress/account-display";
import type { ProgressSnapshot } from "@/lib/progress";

describe("resolveAccountProgressSnapshot", () => {
  it("merges synced and local progress for display when both are present", () => {
    const localSnapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "uniform-circular-motion": {
          conceptId: "concept-uniform-circular-motion",
          slug: "uniform-circular-motion",
          firstVisitedAt: "2026-03-29T10:00:00.000Z",
        },
      },
    };
    const syncedSnapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          manualCompletedAt: "2026-03-28T10:00:00.000Z",
        },
      },
    };

    const result = resolveAccountProgressSnapshot(localSnapshot, syncedSnapshot);

    expect(result.source).toBe("merged");
    expect(Object.keys(result.snapshot.concepts)).toEqual([
      "projectile-motion",
      "uniform-circular-motion",
    ]);
  });

  it("falls back to the synced snapshot when this browser has no local progress yet", () => {
    const syncedSnapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "vectors-components": {
          conceptId: "concept-vectors-components",
          slug: "vectors-components",
          firstVisitedAt: "2026-03-29T09:00:00.000Z",
        },
      },
    };

    const result = resolveAccountProgressSnapshot(
      { version: 1, concepts: {} },
      syncedSnapshot,
    );

    expect(result.source).toBe("synced");
    expect(result.snapshot).toEqual(syncedSnapshot);
  });

  it("prefers fresher local started-assessment signals when synced progress is older", () => {
    const localSnapshot: ProgressSnapshot = {
      version: 1,
      concepts: {},
      topicTests: {
        oscillations: {
          slug: "oscillations",
          startedAt: "2026-04-18T10:00:00.000Z",
        },
      },
      packTests: {},
    };
    const syncedSnapshot: ProgressSnapshot = {
      version: 1,
      concepts: {},
      topicTests: {
        oscillations: {
          slug: "oscillations",
          completedAt: "2026-04-18T09:00:00.000Z",
          attemptCount: 1,
          lastIncorrectCount: 0,
          lastQuestionCount: 10,
        },
      },
      packTests: {},
    };

    const result = resolveAccountProgressSnapshot(localSnapshot, syncedSnapshot);

    expect(result.source).toBe("merged");
    expect(result.snapshot.topicTests?.oscillations).toMatchObject({
      startedAt: "2026-04-18T10:00:00.000Z",
      completedAt: "2026-04-18T09:00:00.000Z",
    });
  });
});
