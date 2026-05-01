// @vitest-environment node

import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GET,
  PUT,
} from "@/app/api/account/progress/route";
import { DEV_ACCOUNT_HARNESS_COOKIE } from "@/lib/account/dev-harness";
import type { ProgressSnapshot } from "@/lib/progress";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  syncAchievementsFromTrustedProgressSnapshotMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClientMock,
}));

vi.mock("@/lib/achievements/service", () => ({
  syncAchievementsFromTrustedProgressSnapshot:
    mocks.syncAchievementsFromTrustedProgressSnapshotMock,
}));

let devHarnessStorePath: string | null = null;

function buildHarnessCookie(value: string) {
  return `${DEV_ACCOUNT_HARNESS_COOKIE}=${encodeURIComponent(value)}`;
}

async function useIsolatedDevHarnessStore() {
  devHarnessStorePath = path.join(
    process.cwd(),
    "output",
    `dev-account-progress-${crypto.randomUUID()}.json`,
  );
  vi.stubEnv("OPEN_MODEL_LAB_DEV_ACCOUNT_HARNESS_STORE_PATH", devHarnessStorePath);
}

describe("account progress route with dev account harness", () => {
  afterEach(async () => {
    vi.unstubAllEnvs();
    mocks.createSupabaseServerClientMock.mockReset();
    mocks.syncAchievementsFromTrustedProgressSnapshotMock.mockReset();

    if (devHarnessStorePath) {
      await fs.rm(devHarnessStorePath, { force: true }).catch(() => undefined);
      await fs.rm(`${devHarnessStorePath}.tmp`, { force: true }).catch(() => undefined);
      devHarnessStorePath = null;
    }
  });

  it("stores and reads synced progress for the signed-in free fixture without Supabase", async () => {
    vi.stubEnv("ENABLE_DEV_ACCOUNT_HARNESS", "true");
    await useIsolatedDevHarnessStore();
    const fixtureCookie = buildHarnessCookie("signed-in-free");
    const snapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          manualCompletedAt: "2026-04-02T11:00:00.000Z",
        },
      },
    };

    const putResponse = await PUT(
      new Request("http://localhost/api/account/progress", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: fixtureCookie,
        },
        body: JSON.stringify({
          snapshot,
        }),
      }),
    );
    const putPayload = (await putResponse.json()) as {
      snapshot: ProgressSnapshot;
      mergeSummary: {
        importedLocalConceptCount: number;
      };
    };

    expect(putResponse.status).toBe(200);
    expect(putPayload.snapshot.concepts["projectile-motion"]?.manualCompletedAt).toBe(
      "2026-04-02T11:00:00.000Z",
    );
    expect(putPayload.mergeSummary.importedLocalConceptCount).toBe(1);
    expect(mocks.createSupabaseServerClientMock).not.toHaveBeenCalled();

    const getResponse = await GET(
      new Request("http://localhost/api/account/progress", {
        headers: {
          cookie: fixtureCookie,
        },
      }),
    );
    const getPayload = (await getResponse.json()) as {
      snapshot: ProgressSnapshot;
    };

    expect(getResponse.status).toBe(200);
    expect(getPayload.snapshot.concepts["projectile-motion"]?.manualCompletedAt).toBe(
      "2026-04-02T11:00:00.000Z",
    );
    expect(mocks.createSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
