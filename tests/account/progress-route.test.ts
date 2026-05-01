// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GET,
  PUT,
} from "@/app/api/account/progress/route";
import type { ProgressSnapshot } from "@/lib/progress";

const mocks = vi.hoisted(() => ({
  getStoredProgressForSessionMock: vi.fn(),
  mergeStoredProgressForSessionMock: vi.fn(),
  getAccountSessionForCookieHeaderMock: vi.fn(),
  syncAchievementsFromTrustedProgressSnapshotMock: vi.fn(),
}));

vi.mock("@/lib/account/server-store", () => ({
  getStoredProgressForSession: mocks.getStoredProgressForSessionMock,
  mergeStoredProgressForSession: mocks.mergeStoredProgressForSessionMock,
}));

vi.mock("@/lib/account/supabase", () => ({
  getAccountSessionForCookieHeader: mocks.getAccountSessionForCookieHeaderMock,
  describeOptionalAccountDependencyFailure: (error: unknown) => ({
    kind: "query_failed",
    code: error instanceof Error ? error.name : null,
    message: error instanceof Error ? error.message : null,
    relationName: null,
  }),
  shouldLogOptionalAccountDependencyFailureAsError: () => true,
}));

vi.mock("@/lib/achievements/service", () => ({
  syncAchievementsFromTrustedProgressSnapshot:
    mocks.syncAchievementsFromTrustedProgressSnapshotMock,
}));

describe("account progress route", () => {
  afterEach(() => {
    mocks.getStoredProgressForSessionMock.mockReset();
    mocks.mergeStoredProgressForSessionMock.mockReset();
    mocks.getAccountSessionForCookieHeaderMock.mockReset();
    mocks.syncAchievementsFromTrustedProgressSnapshotMock.mockReset();
  });

  it("returns unauthorized when no synced progress is available for the current session", async () => {
    mocks.getStoredProgressForSessionMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/account/progress"),
    );
    const payload = (await response.json()) as {
      code: string;
    };

    expect(response.status).toBe(401);
    expect(payload.code).toBe("unauthorized");
  });

  it("returns the stored account-linked snapshot for signed-in free sessions", async () => {
    mocks.getStoredProgressForSessionMock.mockResolvedValue({
      snapshot: {
        version: 1,
        concepts: {
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            manualCompletedAt: "2026-03-29T10:00:00.000Z",
          },
        },
      },
      history: {
        version: 1,
        events: [],
        masteryTimeline: [],
      },
      updatedAt: "2026-03-29T10:00:00.000Z",
      continueLearningState: null,
    });

    const response = await GET(
      new Request("http://localhost/api/account/progress"),
    );
    const payload = (await response.json()) as {
      snapshot: ProgressSnapshot;
    };

    expect(response.status).toBe(200);
    expect(payload.snapshot.concepts["projectile-motion"]?.manualCompletedAt).toBe(
      "2026-03-29T10:00:00.000Z",
    );
  });

  it("returns the stored account-linked snapshot for signed-in premium sessions", async () => {
    mocks.getStoredProgressForSessionMock.mockResolvedValue({
      snapshot: {
        version: 1,
        concepts: {
          "vectors-components": {
            conceptId: "concept-vectors-components",
            slug: "vectors-components",
            manualCompletedAt: "2026-03-30T10:00:00.000Z",
          },
        },
      },
      history: {
        version: 1,
        events: [],
        masteryTimeline: [],
      },
      updatedAt: "2026-03-30T10:00:00.000Z",
      continueLearningState: null,
    });

    const response = await GET(
      new Request("http://localhost/api/account/progress"),
    );
    const payload = (await response.json()) as {
      snapshot: ProgressSnapshot;
    };

    expect(response.status).toBe(200);
    expect(payload.snapshot.concepts["vectors-components"]?.manualCompletedAt).toBe(
      "2026-03-30T10:00:00.000Z",
    );
  });

  it("returns the merged synced snapshot from the existing server-store seam", async () => {
    const snapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          manualCompletedAt: "2026-03-29T10:00:00.000Z",
        },
      },
    };

    mocks.mergeStoredProgressForSessionMock.mockResolvedValue({
      snapshot,
      history: {
        version: 1,
        events: [],
        masteryTimeline: [],
      },
      updatedAt: "2026-03-29T10:00:00.000Z",
      mergeSummary: {
        localConceptCount: 1,
        remoteConceptCount: 0,
        mergedConceptCount: 1,
        importedLocalConceptCount: 1,
        importedRemoteConceptCount: 0,
      },
      continueLearningState: null,
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "user-1",
      },
      entitlement: {
        tier: "free",
      },
    });

    const response = await PUT(
      new Request("http://localhost/api/account/progress", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: "account=session",
        },
        body: JSON.stringify({
          snapshot,
        }),
      }),
    );
    const payload = (await response.json()) as {
      mergeSummary: {
        importedLocalConceptCount: number;
      };
      history: {
        version: number;
      };
      snapshot: ProgressSnapshot;
    };

    expect(response.status).toBe(200);
    expect(payload.mergeSummary.importedLocalConceptCount).toBe(1);
    expect(payload.history.version).toBe(1);
    expect(payload.snapshot.concepts["projectile-motion"]?.manualCompletedAt).toBe(
      "2026-03-29T10:00:00.000Z",
    );
    expect(mocks.syncAchievementsFromTrustedProgressSnapshotMock).toHaveBeenCalledWith({
      userId: "user-1",
      entitlementTier: "free",
      snapshot,
    });
  });

  it("returns the merged synced snapshot for signed-in premium sessions", async () => {
    const snapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "vectors-components": {
          conceptId: "concept-vectors-components",
          slug: "vectors-components",
          manualCompletedAt: "2026-03-30T10:00:00.000Z",
        },
      },
    };

    mocks.mergeStoredProgressForSessionMock.mockResolvedValue({
      snapshot,
      history: {
        version: 1,
        events: [],
        masteryTimeline: [],
      },
      updatedAt: "2026-03-30T10:00:00.000Z",
      mergeSummary: {
        localConceptCount: 1,
        remoteConceptCount: 0,
        mergedConceptCount: 1,
        importedLocalConceptCount: 1,
        importedRemoteConceptCount: 0,
      },
      continueLearningState: null,
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "user-2",
      },
      entitlement: {
        tier: "premium",
      },
    });

    const response = await PUT(
      new Request("http://localhost/api/account/progress", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: "account=session",
        },
        body: JSON.stringify({
          snapshot,
        }),
      }),
    );
    const payload = (await response.json()) as {
      snapshot: ProgressSnapshot;
      mergeSummary: {
        importedLocalConceptCount: number;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.snapshot.concepts["vectors-components"]?.manualCompletedAt).toBe(
      "2026-03-30T10:00:00.000Z",
    );
    expect(payload.mergeSummary.importedLocalConceptCount).toBe(1);
    expect(mocks.syncAchievementsFromTrustedProgressSnapshotMock).toHaveBeenCalledWith({
      userId: "user-2",
      entitlementTier: "premium",
      snapshot,
    });
  });

  it("still returns merged progress when achievement sync fails after the merge succeeds", async () => {
    const snapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          manualCompletedAt: "2026-03-29T10:00:00.000Z",
        },
      },
    };

    mocks.mergeStoredProgressForSessionMock.mockResolvedValue({
      snapshot,
      history: {
        version: 1,
        events: [],
        masteryTimeline: [],
      },
      updatedAt: "2026-03-29T10:00:00.000Z",
      mergeSummary: {
        localConceptCount: 1,
        remoteConceptCount: 0,
        mergedConceptCount: 1,
        importedLocalConceptCount: 1,
        importedRemoteConceptCount: 0,
      },
      continueLearningState: null,
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "user-1",
      },
      entitlement: {
        tier: "free",
      },
    });
    mocks.syncAchievementsFromTrustedProgressSnapshotMock.mockRejectedValue(
      new Error("achievement store unavailable"),
    );

    const response = await PUT(
      new Request("http://localhost/api/account/progress", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: "account=session",
        },
        body: JSON.stringify({
          snapshot,
        }),
      }),
    );
    const payload = (await response.json()) as {
      snapshot: ProgressSnapshot;
      mergeSummary: {
        importedLocalConceptCount: number;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.snapshot.concepts["projectile-motion"]?.manualCompletedAt).toBe(
      "2026-03-29T10:00:00.000Z",
    );
    expect(payload.mergeSummary.importedLocalConceptCount).toBe(1);
  });

  it("still returns merged progress when the post-merge session lookup fails", async () => {
    const snapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          manualCompletedAt: "2026-03-29T10:00:00.000Z",
        },
      },
    };

    mocks.mergeStoredProgressForSessionMock.mockResolvedValue({
      snapshot,
      history: {
        version: 1,
        events: [],
        masteryTimeline: [],
      },
      updatedAt: "2026-03-29T10:00:00.000Z",
      mergeSummary: {
        localConceptCount: 1,
        remoteConceptCount: 0,
        mergedConceptCount: 1,
        importedLocalConceptCount: 1,
        importedRemoteConceptCount: 0,
      },
      continueLearningState: null,
    });
    mocks.getAccountSessionForCookieHeaderMock.mockRejectedValue(
      new Error("session reload unavailable"),
    );

    const response = await PUT(
      new Request("http://localhost/api/account/progress", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: "account=session",
        },
        body: JSON.stringify({
          snapshot,
        }),
      }),
    );
    const payload = (await response.json()) as {
      snapshot: ProgressSnapshot;
      mergeSummary: {
        importedLocalConceptCount: number;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.snapshot.concepts["projectile-motion"]?.manualCompletedAt).toBe(
      "2026-03-29T10:00:00.000Z",
    );
    expect(payload.mergeSummary.importedLocalConceptCount).toBe(1);
  });

  it("rejects invalid sync payloads before the store seam runs", async () => {
    const response = await PUT(
      new Request("http://localhost/api/account/progress", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      }),
    );
    const payload = (await response.json()) as {
      code: string;
    };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("invalid_payload");
    expect(mocks.mergeStoredProgressForSessionMock).not.toHaveBeenCalled();
  });

  it("returns a bounded failure when account progress loading throws", async () => {
    mocks.getStoredProgressForSessionMock.mockRejectedValue(new Error("store unavailable"));

    const response = await GET(
      new Request("http://localhost/api/account/progress"),
    );
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(500);
    expect(payload.code).toBe("progress_load_failed");
    expect(payload.error).toMatch(/local progress in this browser still works/i);
  });

  it("returns a bounded failure when syncing account progress throws", async () => {
    mocks.mergeStoredProgressForSessionMock.mockRejectedValue(new Error("store unavailable"));

    const response = await PUT(
      new Request("http://localhost/api/account/progress", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          snapshot: {
            version: 1,
            concepts: {},
          },
        }),
      }),
    );
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(500);
    expect(payload.code).toBe("progress_sync_failed");
    expect(payload.error).toMatch(/retry in a moment/i);
  });
});
