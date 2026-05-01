import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PUT } from "@/app/api/account/saved-setups/route";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";

const mocks = vi.hoisted(() => ({
  getAccountSessionForCookieHeaderMock: vi.fn(),
}));

vi.mock("@/lib/account/supabase", () => ({
  getAccountSessionForCookieHeader: mocks.getAccountSessionForCookieHeaderMock,
  getStoredProgressForCookieHeader: vi.fn(),
  mergeStoredProgressForCookieHeader: vi.fn(),
}));

let accountStorePath: string | null = null;
const SESSION_COOKIE = "sb-auth-token=1";

async function useIsolatedAccountStore() {
  accountStorePath = path.join(
    process.cwd(),
    "output",
    `account-saved-setups-${crypto.randomUUID()}.json`,
  );
  vi.stubEnv("OPEN_MODEL_LAB_ACCOUNT_STORE_PATH", accountStorePath);
}

describe("account saved setups route", () => {
  beforeEach(() => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    mocks.getAccountSessionForCookieHeaderMock.mockReset();

    if (accountStorePath) {
      await fs.rm(accountStorePath, { force: true }).catch(() => undefined);
      await fs.rm(`${accountStorePath}.tmp`, { force: true }).catch(() => undefined);
      accountStorePath = null;
    }
  });

  it("merges, deduplicates, and reads synced saved setups", async () => {
    await useIsolatedAccountStore();

    const firstResponse = await PUT(
      new Request("http://localhost/api/account/saved-setups", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: SESSION_COOKIE,
        },
        body: JSON.stringify({
          snapshot: {
            version: "v2",
            items: [
              {
                id: "d2a85698-3c5f-46fe-ad18-cf93177bd5fc",
                conceptId: "concept-graph-transformations",
                conceptSlug: "graph-transformations",
                conceptTitle: "Graph Transformations",
                title: "Reflect and shift right",
                stateParam: "v1.same-state",
                publicExperimentParam: "v1.card-a",
                sourceType: "preset-derived",
                createdAt: "2026-04-05T08:00:00.000Z",
                updatedAt: "2026-04-05T08:00:00.000Z",
                lastOpenedAt: null,
              },
            ],
            tombstones: [],
          },
        }),
      }),
    );

    expect(firstResponse.status).toBe(200);

    const secondResponse = await PUT(
      new Request("http://localhost/api/account/saved-setups", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: SESSION_COOKIE,
        },
        body: JSON.stringify({
          snapshot: {
            version: "v2",
            items: [
              {
                id: "0f7cf789-d445-49b3-8ad4-bb3f0f6ef1b0",
                conceptId: "concept-graph-transformations",
                conceptSlug: "graph-transformations",
                conceptTitle: "Graph Transformations",
                title: "Reflect and shift right review",
                stateParam: "v1.same-state",
                publicExperimentParam: null,
                sourceType: "manual",
                createdAt: "2026-04-05T08:04:00.000Z",
                updatedAt: "2026-04-05T08:05:00.000Z",
                lastOpenedAt: "2026-04-05T08:06:00.000Z",
              },
            ],
            tombstones: [],
          },
        }),
      }),
    );
    const secondPayload = (await secondResponse.json()) as {
      snapshot: {
        items: Array<{
          title: string;
          stateParam: string | null;
          lastOpenedAt: string | null;
        }>;
      };
      mergeSummary: {
        dedupedDuplicateCount: number;
      };
    };

    expect(secondResponse.status).toBe(200);
    expect(secondPayload.snapshot.items).toHaveLength(1);
    expect(secondPayload.snapshot.items[0]).toMatchObject({
      title: "Reflect and shift right review",
      stateParam: "v1.same-state",
      lastOpenedAt: "2026-04-05T08:06:00.000Z",
    });
    expect(secondPayload.mergeSummary.dedupedDuplicateCount).toBe(1);

    const readResponse = await GET(
      new Request("http://localhost/api/account/saved-setups", {
        headers: {
          cookie: SESSION_COOKIE,
        },
      }),
    );
    const readPayload = (await readResponse.json()) as {
      snapshot: {
        items: Array<{
          title: string;
        }>;
      };
    };

    expect(readResponse.status).toBe(200);
    expect(readPayload.snapshot.items).toHaveLength(1);
    expect(readPayload.snapshot.items[0]?.title).toBe("Reflect and shift right review");
  });

  it("keeps tombstone deletes from resurrecting stale saved setups", async () => {
    await useIsolatedAccountStore();

    const createResponse = await PUT(
      new Request("http://localhost/api/account/saved-setups", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: SESSION_COOKIE,
        },
        body: JSON.stringify({
          snapshot: {
            version: "v2",
            items: [
              {
                id: "a19c7f61-e693-4ec6-b188-d93d596af67d",
                conceptId: "concept-projectile-motion",
                conceptSlug: "projectile-motion",
                conceptTitle: "Projectile Motion",
                title: "Earth shot",
                stateParam: "v1.earth-shot",
                publicExperimentParam: "v1.card",
                sourceType: "preset-derived",
                createdAt: "2026-04-05T08:00:00.000Z",
                updatedAt: "2026-04-05T08:00:00.000Z",
                lastOpenedAt: null,
              },
            ],
            tombstones: [],
          },
        }),
      }),
    );

    expect(createResponse.status).toBe(200);

    const deleteResponse = await PUT(
      new Request("http://localhost/api/account/saved-setups", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: SESSION_COOKIE,
        },
        body: JSON.stringify({
          snapshot: {
            version: "v2",
            items: [],
            tombstones: [
              {
                fingerprint: "projectile-motion::v1.earth-shot",
                deletedAt: "2026-04-05T09:00:00.000Z",
              },
            ],
          },
        }),
      }),
    );
    const deletePayload = (await deleteResponse.json()) as {
      snapshot: {
        items: unknown[];
        tombstones: Array<{
          fingerprint: string;
        }>;
      };
      mergeSummary: {
        deletedByTombstoneCount: number;
      };
    };

    expect(deleteResponse.status).toBe(200);
    expect(deletePayload.snapshot.items).toEqual([]);
    expect(deletePayload.snapshot.tombstones).toEqual([
      expect.objectContaining({
        fingerprint: "projectile-motion::v1.earth-shot",
      }),
    ]);
    expect(deletePayload.mergeSummary.deletedByTombstoneCount).toBe(1);
  });

  it("rejects invalid payloads", async () => {
    await useIsolatedAccountStore();

    const response = await PUT(
      new Request("http://localhost/api/account/saved-setups", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: SESSION_COOKIE,
        },
        body: JSON.stringify({}),
      }),
    );
    const payload = (await response.json()) as {
      code: string;
    };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("invalid_payload");
  });

  it("returns premium required for signed-in free accounts", async () => {
    await useIsolatedAccountStore();

    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });

    const response = await GET(
      new Request("http://localhost/api/account/saved-setups", {
        headers: {
          cookie: SESSION_COOKIE,
        },
      }),
    );
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(403);
    expect(payload.code).toBe("premium_required");
    expect(payload.error).toMatch(/exact-state setups synced across devices/i);
  });
});
