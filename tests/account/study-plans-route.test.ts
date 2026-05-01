// @vitest-environment node

import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DELETE,
  GET,
  POST,
} from "@/app/api/account/study-plans/route";
import { MAX_SAVED_STUDY_PLANS_PER_USER } from "@/lib/account/study-plans";
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
    `account-study-plans-${crypto.randomUUID()}.json`,
  );
  vi.stubEnv("OPEN_MODEL_LAB_ACCOUNT_STORE_PATH", accountStorePath);
}

describe("account study plans route", () => {
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

  it("saves, updates, reads, and deletes ordered study plans", async () => {
    await useIsolatedAccountStore();

    const createResponse = await POST(
      new Request("http://localhost/api/account/study-plans", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: SESSION_COOKIE,
        },
        body: JSON.stringify({
          title: "Momentum reset",
          summary: "Start with a direct concept, then widen into bounded sequences.",
          entries: [
            {
              kind: "concept",
              slug: "projectile-motion",
            },
            {
              kind: "track",
              slug: "magnetic-fields",
            },
            {
              kind: "guided-collection",
              slug: "waves-evidence-loop",
            },
            {
              kind: "goal-path",
              slug: "waves-intuition",
            },
          ],
        }),
      }),
    );
    const createPayload = (await createResponse.json()) as {
      replacedExisting: boolean;
      savedPlan: {
        id: string;
        title: string;
        entries: Array<{
          kind: string;
          title: string;
        }>;
      };
      items: Array<{
        id: string;
      }>;
    };

    expect(createResponse.status).toBe(200);
    expect(createPayload.replacedExisting).toBe(false);
    expect(createPayload.savedPlan.title).toBe("Momentum reset");
    expect(createPayload.savedPlan.entries.map((entry) => entry.kind)).toEqual([
      "concept",
      "track",
      "guided-collection",
      "goal-path",
    ]);
    expect(createPayload.savedPlan.entries.map((entry) => entry.title)).toEqual([
      "Projectile Motion",
      "Magnetism",
      "Waves Evidence Loop",
      "Build wave intuition from one oscillator outward",
    ]);
    expect(createPayload.items).toHaveLength(1);

    const updateResponse = await POST(
      new Request("http://localhost/api/account/study-plans", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: SESSION_COOKIE,
        },
        body: JSON.stringify({
          id: createPayload.savedPlan.id,
          title: "Momentum reset",
          summary: "Lead with the goal path, then reuse the bounded guided loop.",
          entries: [
            {
              kind: "goal-path",
              slug: "waves-intuition",
            },
            {
              kind: "guided-collection",
              slug: "waves-evidence-loop",
            },
            {
              kind: "concept",
              slug: "projectile-motion",
            },
          ],
        }),
      }),
    );
    const updatePayload = (await updateResponse.json()) as {
      replacedExisting: boolean;
      savedPlan: {
        id: string;
        summary: string | null;
        entries: Array<{
          kind: string;
          title: string;
        }>;
      };
      items: Array<{
        id: string;
        entries: Array<{
          kind: string;
          title: string;
        }>;
      }>;
    };

    expect(updateResponse.status).toBe(200);
    expect(updatePayload.replacedExisting).toBe(true);
    expect(updatePayload.savedPlan.summary).toBe(
      "Lead with the goal path, then reuse the bounded guided loop.",
    );
    expect(updatePayload.savedPlan.entries.map((entry) => entry.kind)).toEqual([
      "goal-path",
      "guided-collection",
      "concept",
    ]);
    expect(updatePayload.savedPlan.entries.map((entry) => entry.title)).toEqual([
      "Build wave intuition from one oscillator outward",
      "Waves Evidence Loop",
      "Projectile Motion",
    ]);

    const readResponse = await GET(
      new Request("http://localhost/api/account/study-plans", {
        headers: {
          cookie: SESSION_COOKIE,
        },
      }),
    );
    const readPayload = (await readResponse.json()) as {
      items: Array<{
        id: string;
        entries: Array<{
          kind: string;
          title: string;
        }>;
      }>;
    };

    expect(readResponse.status).toBe(200);
    expect(readPayload.items).toHaveLength(1);
    expect(readPayload.items[0]?.entries.map((entry) => entry.kind)).toEqual([
      "goal-path",
      "guided-collection",
      "concept",
    ]);

    const deleteResponse = await DELETE(
      new Request("http://localhost/api/account/study-plans", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          cookie: SESSION_COOKIE,
        },
        body: JSON.stringify({
          id: createPayload.savedPlan.id,
        }),
      }),
    );
    const deletePayload = (await deleteResponse.json()) as {
      items: unknown[];
    };

    expect(deleteResponse.status).toBe(200);
    expect(deletePayload.items).toEqual([]);
  });

  it("requires premium for saved study plans", async () => {
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
      new Request("http://localhost/api/account/study-plans", {
        headers: {
          cookie: SESSION_COOKIE,
        },
      }),
    );
    const payload = (await response.json()) as {
      code: string;
    };

    expect(response.status).toBe(403);
    expect(payload.code).toBe("premium_required");
  });

  it("enforces the study plan count limit", async () => {
    await useIsolatedAccountStore();

    for (let index = 0; index < MAX_SAVED_STUDY_PLANS_PER_USER; index += 1) {
      const response = await POST(
        new Request("http://localhost/api/account/study-plans", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: SESSION_COOKIE,
          },
          body: JSON.stringify({
            title: `Study plan ${index + 1}`,
            summary: `Saved plan ${index + 1}.`,
            entries: [
              {
                kind: "concept",
                slug: "projectile-motion",
              },
            ],
          }),
        }),
      );

      expect(response.status).toBe(200);
    }

    const limitResponse = await POST(
      new Request("http://localhost/api/account/study-plans", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: SESSION_COOKIE,
        },
        body: JSON.stringify({
          title: "Overflow study plan",
          summary: "One more plan than the per-user limit allows.",
          entries: [
            {
              kind: "concept",
              slug: "projectile-motion",
            },
          ],
        }),
      }),
    );
    const limitPayload = (await limitResponse.json()) as {
      code: string;
    };

    expect(limitResponse.status).toBe(409);
    expect(limitPayload.code).toBe("study_plan_limit_reached");
  });
});
