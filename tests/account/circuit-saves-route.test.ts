// @vitest-environment node

import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DELETE,
  GET,
  PATCH,
  POST,
} from "@/app/api/account/circuit-saves/route";
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
    `account-circuit-saves-${crypto.randomUUID()}.json`,
  );
  vi.stubEnv("OPEN_MODEL_LAB_ACCOUNT_STORE_PATH", accountStorePath);
}

function buildPremiumSession(userId = "user-1") {
  return {
    user: {
      id: userId,
      email: `${userId}@example.com`,
      displayName: "Circuit User",
      createdAt: "2026-03-29T00:00:00.000Z",
      lastSignedInAt: "2026-03-29T01:00:00.000Z",
    },
    entitlement: resolveAccountEntitlement({
      tier: "premium",
      source: "stored",
      updatedAt: "2026-04-02T00:00:00.000Z",
    }),
  };
}

function buildDraft(title = "Cross-device LDR bench") {
  return {
    title,
    document: {
      version: 1,
      view: { zoom: 0.78, offsetX: 120, offsetY: 82 },
      environment: { temperatureC: 40, lightLevelPercent: 90 },
      components: [
        {
          id: "battery-1",
          label: "Battery 1",
          type: "battery",
          x: 240,
          y: 320,
          rotation: 90,
          properties: { voltage: 9 },
        },
        {
          id: "ldr-1",
          label: "Light-dependent resistor 1",
          type: "ldr",
          x: 620,
          y: 224,
          rotation: 90,
          properties: {
            baseResistance: 900,
            manualResistance: 420,
            useAmbientLight: true,
          },
        },
      ],
      wires: [
        {
          id: "w1",
          from: { componentId: "battery-1", terminal: "a" },
          to: { componentId: "ldr-1", terminal: "a" },
        },
      ],
    },
  };
}

describe("account circuit saves route", () => {
  beforeEach(() => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildPremiumSession());
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

  it("saves, updates, lists, renames, and deletes account-saved circuits", async () => {
    await useIsolatedAccountStore();

    const createResponse = await POST(
      new Request("http://localhost/api/account/circuit-saves", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: SESSION_COOKIE,
        },
        body: JSON.stringify(buildDraft()),
      }),
    );
    const createPayload = (await createResponse.json()) as {
      savedCircuit: { id: string; title: string; document: { environment: { lightLevelPercent: number } } };
      items: Array<{ id: string; title: string }>;
      replacedExisting: boolean;
    };

    expect(createResponse.status).toBe(200);
    expect(createPayload.replacedExisting).toBe(false);
    expect(createPayload.savedCircuit.title).toBe("Cross-device LDR bench");
    expect(createPayload.savedCircuit.document.environment.lightLevelPercent).toBe(90);
    expect(createPayload.items).toHaveLength(1);

    const updateResponse = await POST(
      new Request("http://localhost/api/account/circuit-saves", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: SESSION_COOKIE,
        },
        body: JSON.stringify({
          ...buildDraft("Cross-device LDR bench"),
          id: createPayload.savedCircuit.id,
          document: {
            ...buildDraft().document,
            environment: { temperatureC: 55, lightLevelPercent: 100 },
          },
        }),
      }),
    );
    const updatePayload = (await updateResponse.json()) as {
      replacedExisting: boolean;
      savedCircuit: { document: { environment: { lightLevelPercent: number } } };
    };

    expect(updateResponse.status).toBe(200);
    expect(updatePayload.replacedExisting).toBe(true);
    expect(updatePayload.savedCircuit.document.environment.lightLevelPercent).toBe(100);

    const readResponse = await GET(
      new Request("http://localhost/api/account/circuit-saves", {
        headers: {
          cookie: SESSION_COOKIE,
        },
      }),
    );
    const readPayload = (await readResponse.json()) as {
      items: Array<{ id: string; title: string; document: { environment: { lightLevelPercent: number } } }>;
    };

    expect(readResponse.status).toBe(200);
    expect(readPayload.items).toHaveLength(1);
    expect(readPayload.items[0]?.document.environment.lightLevelPercent).toBe(100);

    const renameResponse = await PATCH(
      new Request("http://localhost/api/account/circuit-saves", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: SESSION_COOKIE,
        },
        body: JSON.stringify({
          id: createPayload.savedCircuit.id,
          title: "Renamed LDR bench",
        }),
      }),
    );
    const renamePayload = (await renameResponse.json()) as {
      savedCircuit: { title: string };
      items: Array<{ title: string }>;
    };

    expect(renameResponse.status).toBe(200);
    expect(renamePayload.savedCircuit.title).toBe("Renamed LDR bench");
    expect(renamePayload.items[0]?.title).toBe("Renamed LDR bench");

    const deleteResponse = await DELETE(
      new Request("http://localhost/api/account/circuit-saves", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          cookie: SESSION_COOKIE,
        },
        body: JSON.stringify({
          id: createPayload.savedCircuit.id,
        }),
      }),
    );
    const deletePayload = (await deleteResponse.json()) as { items: unknown[] };

    expect(deleteResponse.status).toBe(200);
    expect(deletePayload.items).toEqual([]);
  });

  it("requires authentication and premium capability", async () => {
    await useIsolatedAccountStore();

    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValueOnce(null);
    const unauthorizedResponse = await GET(
      new Request("http://localhost/api/account/circuit-saves"),
    );
    const unauthorizedPayload = (await unauthorizedResponse.json()) as { code: string };
    expect(unauthorizedResponse.status).toBe(401);
    expect(unauthorizedPayload.code).toBe("unauthorized");

    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValueOnce({
      ...buildPremiumSession(),
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });
    const premiumResponse = await GET(
      new Request("http://localhost/api/account/circuit-saves", {
        headers: { cookie: SESSION_COOKIE },
      }),
    );
    const premiumPayload = (await premiumResponse.json()) as { code: string };
    expect(premiumResponse.status).toBe(403);
    expect(premiumPayload.code).toBe("premium_required");
  });

  it("enforces ownership by user id", async () => {
    await useIsolatedAccountStore();

    const createResponse = await POST(
      new Request("http://localhost/api/account/circuit-saves", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: SESSION_COOKIE,
        },
        body: JSON.stringify(buildDraft()),
      }),
    );
    const createPayload = (await createResponse.json()) as {
      savedCircuit: { id: string };
    };

    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildPremiumSession("user-2"));

    const readResponse = await GET(
      new Request("http://localhost/api/account/circuit-saves", {
        headers: {
          cookie: SESSION_COOKIE,
        },
      }),
    );
    const readPayload = (await readResponse.json()) as { items: unknown[] };
    expect(readResponse.status).toBe(200);
    expect(readPayload.items).toEqual([]);

    const renameResponse = await PATCH(
      new Request("http://localhost/api/account/circuit-saves", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: SESSION_COOKIE,
        },
        body: JSON.stringify({
          id: createPayload.savedCircuit.id,
          title: "Hijack attempt",
        }),
      }),
    );
    const renamePayload = (await renameResponse.json()) as { code: string };
    expect(renameResponse.status).toBe(404);
    expect(renamePayload.code).toBe("saved_circuit_not_found");
  });
});
