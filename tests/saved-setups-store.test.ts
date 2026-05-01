import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANONYMOUS_SAVED_SETUPS_SCOPE,
  SAVED_SETUPS_STORAGE_KEY,
} from "@/lib/saved-setups";
import {
  deleteSavedSetup,
  localSavedSetupsStore,
  markSavedSetupOpened,
  renameSavedSetup,
  saveSavedSetup,
} from "@/lib/saved-setups-store";
import { encodePublicExperimentCard, resolvePublicExperimentCard } from "@/lib/share-links";

describe("saved setups store", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T08:00:00.000Z"));
    window.localStorage.clear();
    localSavedSetupsStore.resetForTests();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    localSavedSetupsStore.resetForTests();
    window.localStorage.clear();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("saves a new exact setup into the anonymous local-first cache", () => {
    const result = saveSavedSetup({
      conceptId: "concept-projectile-motion",
      conceptSlug: "projectile-motion",
      conceptTitle: "Projectile Motion",
      title: "Default live bench",
      stateParam: null,
      publicExperimentParam: "v1.fake-experiment",
      sourceType: "manual",
    });

    const stored = JSON.parse(
      window.localStorage.getItem(SAVED_SETUPS_STORAGE_KEY) ?? "{}",
    ) as Record<string, unknown>;

    expect(result.status).toBe("created");
    expect(result.savedSetup.title).toBe("Default live bench");
    expect(localSavedSetupsStore.getSnapshot().items).toHaveLength(1);
    expect(stored).toEqual({
      version: "v2",
      scopedSnapshots: {
        [ANONYMOUS_SAVED_SETUPS_SCOPE]: {
          version: "v2",
          items: [
            expect.objectContaining({
              conceptSlug: "projectile-motion",
              title: "Default live bench",
              publicExperimentParam: "v1.fake-experiment",
            }),
          ],
          tombstones: [],
        },
      },
    });
  });

  it("deduplicates exact saves by concept and canonical state param", () => {
    const first = saveSavedSetup({
      conceptId: "concept-graph-transformations",
      conceptSlug: "graph-transformations",
      conceptTitle: "Graph Transformations",
      title: "Reflect and shift right",
      stateParam: "v1.same-state",
      publicExperimentParam: "v1.featured-link",
      sourceType: "imported-from-link",
    });

    vi.setSystemTime(new Date("2026-04-05T08:05:00.000Z"));

    const second = saveSavedSetup({
      conceptId: "concept-graph-transformations",
      conceptSlug: "graph-transformations",
      conceptTitle: "Graph Transformations",
      title: "Current setup",
      stateParam: "v1.same-state",
      publicExperimentParam: null,
      sourceType: "manual",
    });

    expect(first.status).toBe("created");
    expect(second.status).toBe("existing");
    expect(second.savedSetup.id).toBe(first.savedSetup.id);
    expect(second.savedSetup.title).toBe("Reflect and shift right");
    expect(localSavedSetupsStore.getSnapshot().items).toHaveLength(1);
    expect(localSavedSetupsStore.getSnapshot().items[0]?.updatedAt).toBe(
      "2026-04-05T08:05:00.000Z",
    );
  });

  it("renames, marks opened, and deletes a saved setup while keeping a tombstone", () => {
    const saved = saveSavedSetup({
      conceptId: "concept-reaction-rate",
      conceptSlug: "reaction-rate-collision-theory",
      conceptTitle: "Reaction Rate / Collision Theory",
      title: "Catalyzed threshold",
      stateParam: "v1.chem-state",
      publicExperimentParam: encodePublicExperimentCard({
        conceptSlug: "reaction-rate-collision-theory",
        title: "Catalyzed threshold",
        prompt: "Open this catalyzed threshold setup.",
        kind: "live-setup",
      }),
      sourceType: "preset-derived",
    }).savedSetup;

    vi.setSystemTime(new Date("2026-04-05T08:06:00.000Z"));
    const renamed = renameSavedSetup(saved.id, "Catalyzed threshold run");
    expect(renamed?.title).toBe("Catalyzed threshold run");
    expect(
      resolvePublicExperimentCard(
        renamed?.publicExperimentParam ?? undefined,
        "reaction-rate-collision-theory",
      )?.title,
    ).toBe("Catalyzed threshold run");

    vi.setSystemTime(new Date("2026-04-05T08:07:00.000Z"));
    const opened = markSavedSetupOpened(saved.id);
    expect(opened?.lastOpenedAt).toBe("2026-04-05T08:07:00.000Z");

    vi.setSystemTime(new Date("2026-04-05T08:08:00.000Z"));
    const removed = deleteSavedSetup(saved.id);
    expect(removed?.id).toBe(saved.id);
    expect(localSavedSetupsStore.getSnapshot().items).toHaveLength(0);
    expect(localSavedSetupsStore.getSnapshot().tombstones).toEqual([
      {
        fingerprint: "reaction-rate-collision-theory::v1.chem-state",
        deletedAt: "2026-04-05T08:08:00.000Z",
      },
    ]);
  });

  it("moves anonymous saved setups into the signed-in account scope and syncs them", async () => {
    saveSavedSetup({
      conceptId: "concept-projectile-motion",
      conceptSlug: "projectile-motion",
      conceptTitle: "Projectile Motion",
      title: "Earth shot",
      stateParam: "v1.earth-shot",
      publicExperimentParam: "v1.earth-card",
      sourceType: "preset-derived",
    });

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          snapshot: {
            version: "v2",
            items: [
              {
                id: "b7433e22-af85-4be9-abd4-d0fd59353a0d",
                conceptId: "concept-projectile-motion",
                conceptSlug: "projectile-motion",
                conceptTitle: "Projectile Motion",
                title: "Earth shot",
                stateParam: "v1.earth-shot",
                publicExperimentParam: "v1.earth-card",
                sourceType: "preset-derived",
                createdAt: "2026-04-05T08:00:00.000Z",
                updatedAt: "2026-04-05T08:00:00.000Z",
                lastOpenedAt: null,
              },
            ],
            tombstones: [],
          },
          updatedAt: "2026-04-05T08:01:00.000Z",
          mergeSummary: {
            localSetupCount: 1,
            remoteSetupCount: 0,
            mergedSetupCount: 1,
            importedLocalSetupCount: 1,
            importedRemoteSetupCount: 0,
            dedupedDuplicateCount: 0,
            deletedByTombstoneCount: 0,
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );

    localSavedSetupsStore.enableRemoteSync({
      id: "user-1",
      email: "student@example.com",
      displayName: "Lab Student",
      createdAt: "2026-04-01T00:00:00.000Z",
      lastSignedInAt: "2026-04-05T08:00:00.000Z",
    });

    await vi.waitFor(() => {
      expect(localSavedSetupsStore.getSyncState().mode).toBe("synced");
    });

    const stored = JSON.parse(
      window.localStorage.getItem(SAVED_SETUPS_STORAGE_KEY) ?? "{}",
    ) as {
      scopedSnapshots: Record<string, unknown>;
    };

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account/saved-setups",
      expect.objectContaining({
        method: "PUT",
      }),
    );
    expect(localSavedSetupsStore.getSnapshot().items).toHaveLength(1);
    expect(localSavedSetupsStore.getSyncState()).toMatchObject({
      mode: "synced",
      accountUser: expect.objectContaining({
        id: "user-1",
      }),
      lastSyncedAt: "2026-04-05T08:01:00.000Z",
    });
    expect(stored.scopedSnapshots).toEqual({
      "user-1": {
        version: "v2",
        items: [
          expect.objectContaining({
            conceptSlug: "projectile-motion",
            title: "Earth shot",
          }),
        ],
        tombstones: [],
      },
    });
  });
});
