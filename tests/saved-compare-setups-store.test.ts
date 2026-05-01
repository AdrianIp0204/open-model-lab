// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANONYMOUS_SAVED_COMPARE_SETUPS_SCOPE,
  SAVED_COMPARE_SETUPS_STORAGE_KEY,
} from "@/lib/saved-compare-setups";
import {
  deleteSavedCompareSetup,
  localSavedCompareSetupsStore,
  markSavedCompareSetupOpened,
  renameSavedCompareSetup,
  saveSavedCompareSetup,
} from "@/lib/saved-compare-setups-store";
import { encodePublicExperimentCard } from "@/lib/share-links";

describe("saved compare setups store", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T08:00:00.000Z"));
    window.localStorage.clear();
    localSavedCompareSetupsStore.resetForTests();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    localSavedCompareSetupsStore.resetForTests();
    window.localStorage.clear();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("saves a new compare setup into the anonymous local-first cache", () => {
    const result = saveSavedCompareSetup({
      conceptId: "concept-projectile-motion",
      conceptSlug: "projectile-motion",
      conceptTitle: "Projectile Motion",
      title: "Earth vs moon arc",
      stateParam: "v1.earth-vs-moon",
      publicExperimentParam: "v1.earth-vs-moon-card",
      setupALabel: "Earth shot",
      setupBLabel: "Moon hop",
      sourceType: "manual",
    });

    const stored = JSON.parse(
      window.localStorage.getItem(SAVED_COMPARE_SETUPS_STORAGE_KEY) ?? "{}",
    ) as Record<string, unknown>;

    expect(result.status).toBe("created");
    expect(result.savedSetup.title).toBe("Earth vs moon arc");
    expect(localSavedCompareSetupsStore.getSnapshot().items).toHaveLength(1);
    expect(stored).toEqual({
      version: "v1",
      scopedSnapshots: {
        [ANONYMOUS_SAVED_COMPARE_SETUPS_SCOPE]: {
          version: "v1",
          items: [
            expect.objectContaining({
              conceptSlug: "projectile-motion",
              title: "Earth vs moon arc",
              setupALabel: "Earth shot",
              setupBLabel: "Moon hop",
            }),
          ],
          tombstones: [],
        },
      },
    });
  });

  it("deduplicates exact compare saves by concept and canonical state param", () => {
    const first = saveSavedCompareSetup({
      conceptId: "concept-projectile-motion",
      conceptSlug: "projectile-motion",
      conceptTitle: "Projectile Motion",
      title: "Earth vs moon arc",
      stateParam: "v1.same-compare-state",
      publicExperimentParam: "v1.compare-card",
      setupALabel: "Earth shot",
      setupBLabel: "Moon hop",
      sourceType: "imported-from-link",
    });

    vi.setSystemTime(new Date("2026-04-05T08:05:00.000Z"));

    const second = saveSavedCompareSetup({
      conceptId: "concept-projectile-motion",
      conceptSlug: "projectile-motion",
      conceptTitle: "Projectile Motion",
      title: "Current compare scene",
      stateParam: "v1.same-compare-state",
      publicExperimentParam: null,
      setupALabel: "Earth shot",
      setupBLabel: "Moon hop",
      sourceType: "manual",
    });

    expect(first.status).toBe("created");
    expect(second.status).toBe("existing");
    expect(second.savedSetup.id).toBe(first.savedSetup.id);
    expect(second.savedSetup.title).toBe("Earth vs moon arc");
    expect(localSavedCompareSetupsStore.getSnapshot().items).toHaveLength(1);
    expect(localSavedCompareSetupsStore.getSnapshot().items[0]?.updatedAt).toBe(
      "2026-04-05T08:05:00.000Z",
    );
  });

  it("renames, marks opened, and deletes a saved compare setup while keeping a tombstone", () => {
    const saved = saveSavedCompareSetup({
      conceptId: "concept-reaction-rate",
      conceptSlug: "reaction-rate-collision-theory",
      conceptTitle: "Reaction Rate / Collision Theory",
      title: "Catalyzed threshold vs baseline",
      stateParam: "v1.chem-compare-state",
      publicExperimentParam: encodePublicExperimentCard({
        conceptSlug: "reaction-rate-collision-theory",
        title: "Catalyzed threshold vs baseline",
        prompt: "Open this catalyzed threshold compare scene.",
        kind: "saved-compare",
      }),
      setupALabel: "Baseline",
      setupBLabel: "Catalyzed",
      sourceType: "preset-derived",
    }).savedSetup;

    vi.setSystemTime(new Date("2026-04-05T08:06:00.000Z"));
    const renamed = renameSavedCompareSetup(
      saved.id,
      "Catalyzed threshold compare review",
    );
    expect(renamed?.title).toBe("Catalyzed threshold compare review");

    vi.setSystemTime(new Date("2026-04-05T08:07:00.000Z"));
    const opened = markSavedCompareSetupOpened(saved.id);
    expect(opened?.lastOpenedAt).toBe("2026-04-05T08:07:00.000Z");

    vi.setSystemTime(new Date("2026-04-05T08:08:00.000Z"));
    const removed = deleteSavedCompareSetup(saved.id);
    expect(removed?.id).toBe(saved.id);
    expect(localSavedCompareSetupsStore.getSnapshot().items).toHaveLength(0);
    expect(localSavedCompareSetupsStore.getSnapshot().tombstones).toEqual([
      {
        fingerprint: "reaction-rate-collision-theory::v1.chem-compare-state",
        deletedAt: "2026-04-05T08:08:00.000Z",
      },
    ]);
  });

  it("moves anonymous compare setups into the signed-in account scope and syncs them", async () => {
    saveSavedCompareSetup({
      conceptId: "concept-projectile-motion",
      conceptSlug: "projectile-motion",
      conceptTitle: "Projectile Motion",
      title: "Earth vs moon arc",
      stateParam: "v1.earth-vs-moon",
      publicExperimentParam: "v1.earth-vs-moon-card",
      setupALabel: "Earth shot",
      setupBLabel: "Moon hop",
      sourceType: "preset-derived",
    });

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          snapshot: {
            version: "v1",
            items: [
              {
                id: "b7433e22-af85-4be9-abd4-d0fd59353a0d",
                conceptId: "concept-projectile-motion",
                conceptSlug: "projectile-motion",
                conceptTitle: "Projectile Motion",
                title: "Earth vs moon arc",
                stateParam: "v1.earth-vs-moon",
                publicExperimentParam: "v1.earth-vs-moon-card",
                setupALabel: "Earth shot",
                setupBLabel: "Moon hop",
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

    localSavedCompareSetupsStore.enableRemoteSync({
      id: "user-1",
      email: "student@example.com",
      displayName: "Lab Student",
      createdAt: "2026-04-01T00:00:00.000Z",
      lastSignedInAt: "2026-04-05T08:00:00.000Z",
    });

    await vi.waitFor(() => {
      expect(localSavedCompareSetupsStore.getSyncState().mode).toBe("synced");
    });

    const stored = JSON.parse(
      window.localStorage.getItem(SAVED_COMPARE_SETUPS_STORAGE_KEY) ?? "{}",
    ) as {
      scopedSnapshots: Record<string, unknown>;
    };

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account/compare-setups",
      expect.objectContaining({
        method: "PUT",
      }),
    );
    expect(localSavedCompareSetupsStore.getSnapshot().items).toHaveLength(1);
    expect(localSavedCompareSetupsStore.getSyncState()).toMatchObject({
      mode: "synced",
      accountUser: expect.objectContaining({
        id: "user-1",
      }),
      lastSyncedAt: "2026-04-05T08:01:00.000Z",
    });
    expect(stored.scopedSnapshots).toEqual({
      "user-1": {
        version: "v1",
        items: [
          expect.objectContaining({
            conceptSlug: "projectile-motion",
            title: "Earth vs moon arc",
          }),
        ],
        tombstones: [],
      },
    });
  });
});
