import { describe, expect, it } from "vitest";
import {
  ANONYMOUS_SAVED_SETUPS_SCOPE,
  mergeSavedSetupsSnapshots,
  normalizeSavedSetupsLocalCache,
} from "@/lib/saved-setups";

describe("saved setups model", () => {
  it("deduplicates identical concept-state entries and keeps the newer metadata", () => {
    const merged = mergeSavedSetupsSnapshots(
      {
        version: "v2",
        items: [
          {
            id: "2f1d16df-bcb2-4b94-8665-bd191a2d50fa",
            conceptId: "concept-projectile-motion",
            conceptSlug: "projectile-motion",
            conceptTitle: "Projectile Motion",
            title: "Earth shot",
            stateParam: "v1.same-state",
            publicExperimentParam: "v1.earth-card",
            sourceType: "preset-derived",
            createdAt: "2026-04-05T08:00:00.000Z",
            updatedAt: "2026-04-05T08:00:00.000Z",
            lastOpenedAt: null,
          },
        ],
        tombstones: [],
      },
      {
        version: "v2",
        items: [
          {
            id: "15dc55e7-ce52-47e8-9ee5-af6355fe9459",
            conceptId: "concept-projectile-motion",
            conceptSlug: "projectile-motion",
            conceptTitle: "Projectile Motion",
            title: "Earth shot review",
            stateParam: "v1.same-state",
            publicExperimentParam: null,
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
      title: "Earth shot review",
      stateParam: "v1.same-state",
      updatedAt: "2026-04-05T08:05:00.000Z",
      lastOpenedAt: "2026-04-05T08:07:00.000Z",
    });
    expect(merged.summary.dedupedDuplicateCount).toBe(1);
  });

  it("lets newer tombstones remove stale saved setups without resurrecting them", () => {
    const merged = mergeSavedSetupsSnapshots(
      {
        version: "v2",
        items: [],
        tombstones: [
          {
            fingerprint: "graph-transformations::v1.reflect-right",
            deletedAt: "2026-04-05T09:00:00.000Z",
          },
        ],
      },
      {
        version: "v2",
        items: [
          {
            id: "0f65cb7d-8018-4300-947b-9eae8128d95e",
            conceptId: "concept-graph-transformations",
            conceptSlug: "graph-transformations",
            conceptTitle: "Graph Transformations",
            title: "Reflect and shift right",
            stateParam: "v1.reflect-right",
            publicExperimentParam: null,
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

  it("migrates the legacy local snapshot into the anonymous scoped cache", () => {
    const cache = normalizeSavedSetupsLocalCache({
      version: "v1",
      items: [
        {
          id: "9ec8acba-c088-4236-b71c-77ad79c35dd2",
          conceptId: "concept-reaction-rate",
          conceptSlug: "reaction-rate-collision-theory",
          conceptTitle: "Reaction Rate / Collision Theory",
          title: "Catalyzed threshold",
          stateParam: "v1.catalyzed-threshold",
          publicExperimentParam: "v1.chem-card",
          sourceType: "preset-derived",
          createdAt: "2026-04-05T08:00:00.000Z",
          updatedAt: "2026-04-05T08:00:00.000Z",
          lastOpenedAt: null,
        },
      ],
    });

    expect(cache).toEqual({
      version: "v2",
      scopedSnapshots: {
        [ANONYMOUS_SAVED_SETUPS_SCOPE]: {
          version: "v2",
          items: [
            expect.objectContaining({
              conceptSlug: "reaction-rate-collision-theory",
              title: "Catalyzed threshold",
            }),
          ],
          tombstones: [],
        },
      },
    });
  });
});
