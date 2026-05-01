import { describe, expect, it } from "vitest";
import {
  ANONYMOUS_SAVED_COMPARE_SETUPS_SCOPE,
  mergeSavedCompareSetupsSnapshots,
  normalizeSavedCompareSetupsLocalCache,
} from "@/lib/saved-compare-setups";

describe("saved compare setups model", () => {
  it("deduplicates identical concept-state compare entries and keeps the newer metadata", () => {
    const merged = mergeSavedCompareSetupsSnapshots(
      {
        version: "v1",
        items: [
          {
            id: "2f1d16df-bcb2-4b94-8665-bd191a2d50fa",
            conceptId: "concept-projectile-motion",
            conceptSlug: "projectile-motion",
            conceptTitle: "Projectile Motion",
            title: "Earth vs moon arc",
            stateParam: "v1.same-compare-state",
            publicExperimentParam: "v1.earth-moon-card",
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
      {
        version: "v1",
        items: [
          {
            id: "15dc55e7-ce52-47e8-9eae-6af6355fe945",
            conceptId: "concept-projectile-motion",
            conceptSlug: "projectile-motion",
            conceptTitle: "Projectile Motion",
            title: "Earth vs moon arc review",
            stateParam: "v1.same-compare-state",
            publicExperimentParam: null,
            setupALabel: "Earth shot",
            setupBLabel: "Moon hop",
            sourceType: "manual",
            createdAt: "2026-04-05T08:02:00.000Z",
            updatedAt: "2026-04-05T08:05:00.000Z",
            lastOpenedAt: "2026-04-05T08:07:00.000Z",
          },
        ],
        tombstones: [],
      },
    );

    expect(merged.snapshot.items).toHaveLength(1);
    expect(merged.snapshot.items[0]).toMatchObject({
      conceptSlug: "projectile-motion",
      title: "Earth vs moon arc review",
      stateParam: "v1.same-compare-state",
      updatedAt: "2026-04-05T08:05:00.000Z",
      lastOpenedAt: "2026-04-05T08:07:00.000Z",
    });
    expect(merged.summary.dedupedDuplicateCount).toBe(1);
  });

  it("lets newer tombstones remove stale compare setups without resurrecting them", () => {
    const merged = mergeSavedCompareSetupsSnapshots(
      {
        version: "v1",
        items: [],
        tombstones: [
          {
            fingerprint: "projectile-motion::v1.earth-vs-moon",
            deletedAt: "2026-04-05T09:00:00.000Z",
          },
        ],
      },
      {
        version: "v1",
        items: [
          {
            id: "0f65cb7d-8018-4300-947b-9eae8128d95e",
            conceptId: "concept-projectile-motion",
            conceptSlug: "projectile-motion",
            conceptTitle: "Projectile Motion",
            title: "Earth vs moon arc",
            stateParam: "v1.earth-vs-moon",
            publicExperimentParam: null,
            setupALabel: "Earth shot",
            setupBLabel: "Moon hop",
            sourceType: "manual",
            createdAt: "2026-04-05T08:10:00.000Z",
            updatedAt: "2026-04-05T08:20:00.000Z",
            lastOpenedAt: null,
          },
        ],
        tombstones: [],
      },
    );

    expect(merged.snapshot.items).toEqual([]);
    expect(merged.snapshot.tombstones).toHaveLength(1);
    expect(merged.summary.deletedByTombstoneCount).toBe(1);
  });

  it("keeps scoped local cache entries under the anonymous compare scope", () => {
    const cache = normalizeSavedCompareSetupsLocalCache({
      version: "v1",
      scopedSnapshots: {
        [ANONYMOUS_SAVED_COMPARE_SETUPS_SCOPE]: {
          version: "v1",
          items: [
            {
              id: "9ec8acba-c088-4236-b71c-77ad79c35dd2",
              conceptId: "concept-reaction-rate",
              conceptSlug: "reaction-rate-collision-theory",
              conceptTitle: "Reaction Rate / Collision Theory",
              title: "Catalyzed threshold vs baseline",
              stateParam: "v1.catalyzed-threshold-compare",
              publicExperimentParam: "v1.chem-card",
              setupALabel: "Baseline",
              setupBLabel: "Catalyzed",
              sourceType: "preset-derived",
              createdAt: "2026-04-05T08:00:00.000Z",
              updatedAt: "2026-04-05T08:00:00.000Z",
              lastOpenedAt: null,
            },
          ],
          tombstones: [],
        },
      },
    });

    expect(cache).toEqual({
      version: "v1",
      scopedSnapshots: {
        [ANONYMOUS_SAVED_COMPARE_SETUPS_SCOPE]: {
          version: "v1",
          items: [
            expect.objectContaining({
              conceptSlug: "reaction-rate-collision-theory",
              title: "Catalyzed threshold vs baseline",
            }),
          ],
          tombstones: [],
        },
      },
    });
  });
});
