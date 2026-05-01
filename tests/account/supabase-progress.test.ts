// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  describeOptionalAccountDependencyFailure,
  getStoredProgressForCookieHeader,
  mergeStoredProgressForCookieHeader,
} from "@/lib/account/supabase";
import type { ProgressSnapshot } from "@/lib/progress";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClientMock,
}));

function createServerClientMock(options: {
  userId?: string | null;
  existingSnapshot?: ProgressSnapshot;
  existingHistory?: {
    version: number;
    events: unknown[];
    masteryTimeline: unknown[];
  } | null;
  storedUpdatedAt?: string | null;
  readWithHistoryError?: unknown;
  writeWithHistoryError?: unknown;
}) {
  const maybeSingleWithHistoryMock = vi.fn().mockResolvedValue(
    options.readWithHistoryError
      ? {
          data: null,
          error: options.readWithHistoryError,
        }
      : {
          data: options.userId
            ? {
                snapshot: options.existingSnapshot ?? { version: 1, concepts: {} },
                history: options.existingHistory ?? {
                  version: 1,
                  events: [],
                  masteryTimeline: [],
                },
                updated_at: options.storedUpdatedAt ?? "2026-03-29T10:00:00.000Z",
              }
            : null,
          error: null,
        },
  );
  const maybeSingleLegacyMock = vi.fn().mockResolvedValue({
    data: options.userId
      ? {
          snapshot: options.existingSnapshot ?? { version: 1, concepts: {} },
          updated_at: options.storedUpdatedAt ?? "2026-03-29T10:00:00.000Z",
        }
      : null,
    error: null,
  });
  const selectMock = vi.fn((columns: string) => ({
    eq: vi.fn(() => ({
      maybeSingle: columns.includes("history")
        ? maybeSingleWithHistoryMock
        : maybeSingleLegacyMock,
    })),
  }));
  const singleWithHistoryMock = vi.fn((payload?: { snapshot?: ProgressSnapshot; updated_at?: string }) =>
    Promise.resolve(
      options.writeWithHistoryError
        ? {
            data: null,
            error: options.writeWithHistoryError,
          }
        : {
            data: {
              snapshot: payload?.snapshot ?? options.existingSnapshot ?? { version: 1, concepts: {} },
              history: options.existingHistory ?? {
                version: 1,
                events: [],
                masteryTimeline: [],
              },
              updated_at: payload?.updated_at ?? options.storedUpdatedAt ?? "2026-03-29T10:00:00.000Z",
            },
            error: null,
          },
    ),
  );
  const singleLegacyMock = vi.fn((payload?: { snapshot?: ProgressSnapshot; updated_at?: string }) =>
    Promise.resolve({
      data: {
        snapshot: payload?.snapshot ?? options.existingSnapshot ?? { version: 1, concepts: {} },
        updated_at: payload?.updated_at ?? options.storedUpdatedAt ?? "2026-03-29T10:00:00.000Z",
      },
      error: null,
    }),
  );
  const upsertMock = vi.fn((payload) => ({
    select: vi.fn((columns: string) => ({
      single: () =>
        columns.includes("history")
          ? singleWithHistoryMock(payload)
          : singleLegacyMock(payload),
    })),
  }));

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: options.userId
            ? {
                id: options.userId,
                email: "student@example.com",
                created_at: "2026-03-28T00:00:00.000Z",
                last_sign_in_at: "2026-03-29T00:00:00.000Z",
                user_metadata: {},
              }
            : null,
        },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: selectMock,
      upsert: upsertMock,
    })),
    __mocks: {
      maybeSingleWithHistoryMock,
      maybeSingleLegacyMock,
      singleWithHistoryMock,
      singleLegacyMock,
      upsertMock,
    },
  };
}

describe("account supabase progress adapter", () => {
  afterEach(() => {
    mocks.createSupabaseServerClientMock.mockReset();
  });

  it("returns null when there is no authenticated Supabase user", async () => {
    mocks.createSupabaseServerClientMock.mockReturnValue(
      createServerClientMock({
        userId: null,
      }),
    );

    await expect(getStoredProgressForCookieHeader(null)).resolves.toBeNull();
  });

  it("merges remote and local concept snapshots before writing the synced row back", async () => {
    const remoteSnapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
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
          manualCompletedAt: "2026-03-21T10:00:00.000Z",
        },
      },
    };
    const supabaseClient = createServerClientMock({
      userId: "user-1",
      existingSnapshot: remoteSnapshot,
      storedUpdatedAt: "2026-03-20T10:00:00.000Z",
    });

    mocks.createSupabaseServerClientMock.mockReturnValue(supabaseClient);

    const result = await mergeStoredProgressForCookieHeader(
      "sb-auth-token=1",
      localSnapshot,
    );

    expect(result).not.toBeNull();
    expect(Object.keys(result!.snapshot.concepts)).toEqual([
      "projectile-motion",
      "simple-harmonic-motion",
    ]);
    expect(result!.mergeSummary).toMatchObject({
      importedLocalConceptCount: 1,
      importedRemoteConceptCount: 1,
      mergedConceptCount: 2,
    });
    expect(supabaseClient.__mocks.upsertMock).toHaveBeenCalledOnce();
    expect(supabaseClient.__mocks.upsertMock.mock.calls[0]?.[0]).toMatchObject({
      user_id: "user-1",
      snapshot: {
        version: 1,
        concepts: {
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            firstVisitedAt: "2026-03-20T10:00:00.000Z",
          },
          "simple-harmonic-motion": {
            conceptId: "concept-shm",
            slug: "simple-harmonic-motion",
            manualCompletedAt: "2026-03-21T10:00:00.000Z",
          },
        },
      },
    });
  });

  it("classifies a missing synced-progress history column as a bounded optional dependency failure", () => {
    expect(
      describeOptionalAccountDependencyFailure({
        code: "PGRST204",
        message:
          "Could not find the 'history' column of 'user_concept_progress_snapshots' in the schema cache",
      }),
    ).toMatchObject({
      kind: "missing_column",
      relationName: "user_concept_progress_snapshots",
      columnName: "history",
    });
  });

  it("classifies an invalid Supabase API key as a bounded configuration failure", () => {
    expect(
      describeOptionalAccountDependencyFailure({
        message: "Invalid API key",
      }),
    ).toMatchObject({
      kind: "not_configured",
      relationName: null,
    });
  });

  it("falls back to snapshot-only reads when the synced-progress history column is missing", async () => {
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.createSupabaseServerClientMock.mockReturnValue(
      createServerClientMock({
        userId: "user-1",
        existingSnapshot: {
          version: 1,
          concepts: {
            "projectile-motion": {
              conceptId: "concept-projectile-motion",
              slug: "projectile-motion",
            },
          },
        },
        readWithHistoryError: {
          code: "PGRST204",
          message:
            "Could not find the 'history' column of 'user_concept_progress_snapshots' in the schema cache",
        },
      }),
    );

    const result = await getStoredProgressForCookieHeader("sb-auth-token=1");

    expect(result).toMatchObject({
      snapshot: {
        concepts: {
          "projectile-motion": {
            slug: "projectile-motion",
          },
        },
      },
      history: {
        version: 1,
        events: [],
        masteryTimeline: [],
      },
    });
    expect(consoleWarnMock).toHaveBeenCalledWith(
      "[account] synced progress history column unavailable during read",
      expect.objectContaining({
        userId: "user-1",
        columnName: "history",
        fallback: "snapshot_only_progress_read",
      }),
    );

    consoleWarnMock.mockRestore();
  });

  it("falls back to snapshot-only writes when the synced-progress history column is missing", async () => {
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const remoteSnapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
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
          manualCompletedAt: "2026-03-21T10:00:00.000Z",
        },
      },
    };
    const supabaseClient = createServerClientMock({
      userId: "user-1",
      existingSnapshot: remoteSnapshot,
      storedUpdatedAt: "2026-03-20T10:00:00.000Z",
      writeWithHistoryError: {
        code: "PGRST204",
        message:
          "Could not find the 'history' column of 'user_concept_progress_snapshots' in the schema cache",
      },
    });

    mocks.createSupabaseServerClientMock.mockReturnValue(supabaseClient);

    const result = await mergeStoredProgressForCookieHeader(
      "sb-auth-token=1",
      localSnapshot,
    );

    expect(result).not.toBeNull();
    expect(result?.snapshot.concepts["simple-harmonic-motion"]?.manualCompletedAt).toBe(
      "2026-03-21T10:00:00.000Z",
    );
    expect(result?.history).toMatchObject({
      version: 1,
      events: expect.any(Array),
      masteryTimeline: expect.any(Array),
    });
    expect(supabaseClient.__mocks.upsertMock).toHaveBeenCalledTimes(2);
    expect(consoleWarnMock).toHaveBeenCalledWith(
      "[account] synced progress history column unavailable during write",
      expect.objectContaining({
        userId: "user-1",
        columnName: "history",
        fallback: "snapshot_only_progress_write",
      }),
    );

    consoleWarnMock.mockRestore();
  });
});
