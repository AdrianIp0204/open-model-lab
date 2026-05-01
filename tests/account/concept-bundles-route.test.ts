// @vitest-environment node

import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DELETE,
  GET,
  POST,
} from "@/app/api/account/concept-bundles/route";
import { MAX_SAVED_CONCEPT_BUNDLES_PER_COLLECTION } from "@/lib/account/concept-bundles";
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
    `account-concept-bundles-${crypto.randomUUID()}.json`,
  );
  vi.stubEnv("OPEN_MODEL_LAB_ACCOUNT_STORE_PATH", accountStorePath);
}

describe("account concept bundles route", () => {
  beforeEach(() => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "teacher@example.com",
        displayName: "Teacher",
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

  it("saves, replaces, reads, and deletes collection-scoped concept bundles", async () => {
    await useIsolatedAccountStore();

    const sessionCookie = SESSION_COOKIE;

    const createResponse = await POST(
      new Request("http://localhost/api/account/concept-bundles", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: sessionCookie,
        },
        body: JSON.stringify({
          collectionSlug: "waves-evidence-loop",
          title: "Waves core bundle",
          summary: "Keep the topic map, starter track, and dark-band checkpoint together.",
          stepIds: [
            "waves-topic-route",
            "waves-starter-track",
            "waves-dark-band-challenge",
          ],
          launchStepId: "waves-starter-track",
        }),
      }),
    );
    const createPayload = (await createResponse.json()) as {
      items: Array<{
        id: string;
      }>;
      replacedExisting: boolean;
      savedBundle: {
        id: string;
        title: string;
        launchStepId: string | null;
        stepIds: string[];
      };
    };

    expect(createResponse.status).toBe(200);
    expect(createPayload.replacedExisting).toBe(false);
    expect(createPayload.savedBundle.title).toBe("Waves core bundle");
    expect(createPayload.savedBundle.launchStepId).toBe("waves-starter-track");
    expect(createPayload.savedBundle.stepIds).toEqual([
      "waves-topic-route",
      "waves-starter-track",
      "waves-dark-band-challenge",
    ]);

    const replaceResponse = await POST(
      new Request("http://localhost/api/account/concept-bundles", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: sessionCookie,
        },
        body: JSON.stringify({
          collectionSlug: "waves-evidence-loop",
          title: "Waves core bundle",
          summary: "Tighten the bundle around the starter track and challenge.",
          stepIds: ["waves-starter-track", "waves-dark-band-challenge"],
          launchStepId: "waves-dark-band-challenge",
        }),
      }),
    );
    const replacePayload = (await replaceResponse.json()) as {
      items: Array<{
        id: string;
      }>;
      replacedExisting: boolean;
      savedBundle: {
        id: string;
        launchStepId: string | null;
        stepIds: string[];
      };
    };

    expect(replaceResponse.status).toBe(200);
    expect(replacePayload.replacedExisting).toBe(true);
    expect(replacePayload.savedBundle.launchStepId).toBe("waves-dark-band-challenge");
    expect(replacePayload.savedBundle.stepIds).toEqual([
      "waves-starter-track",
      "waves-dark-band-challenge",
    ]);

    const readResponse = await GET(
      new Request("http://localhost/api/account/concept-bundles?collection=waves-evidence-loop", {
        headers: {
          cookie: sessionCookie,
        },
      }),
    );
    const readPayload = (await readResponse.json()) as {
      items: Array<{
        id: string;
      }>;
    };

    expect(readResponse.status).toBe(200);
    expect(readPayload.items).toHaveLength(1);

    const deleteResponse = await DELETE(
      new Request("http://localhost/api/account/concept-bundles", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          cookie: sessionCookie,
        },
        body: JSON.stringify({
          collectionSlug: "waves-evidence-loop",
          id: replacePayload.savedBundle.id,
        }),
      }),
    );
    const deletePayload = (await deleteResponse.json()) as {
      items: unknown[];
    };

    expect(deleteResponse.status).toBe(200);
    expect(deletePayload.items).toEqual([]);
  });

  it("enforces the per-collection concept bundle limit", async () => {
    await useIsolatedAccountStore();

    const sessionCookie = SESSION_COOKIE;

    for (let index = 0; index < MAX_SAVED_CONCEPT_BUNDLES_PER_COLLECTION; index += 1) {
      const saveResponse = await POST(
        new Request("http://localhost/api/account/concept-bundles", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: sessionCookie,
          },
          body: JSON.stringify({
            collectionSlug: "waves-evidence-loop",
            title: `Bundle ${index + 1}`,
            summary: `Compact bundle ${index + 1}.`,
            stepIds: ["waves-starter-track"],
            launchStepId: "waves-starter-track",
          }),
        }),
      );

      expect(saveResponse.status).toBe(200);
    }

    const limitResponse = await POST(
      new Request("http://localhost/api/account/concept-bundles", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: sessionCookie,
        },
        body: JSON.stringify({
          collectionSlug: "waves-evidence-loop",
          title: "Bundle overflow",
          summary: "One more bundle than the collection limit allows.",
          stepIds: ["waves-dark-band-challenge"],
          launchStepId: "waves-dark-band-challenge",
        }),
      }),
    );
    const limitPayload = (await limitResponse.json()) as {
      code: string;
    };

    expect(limitResponse.status).toBe(409);
    expect(limitPayload.code).toBe("concept_bundle_limit_reached");
  });
});
