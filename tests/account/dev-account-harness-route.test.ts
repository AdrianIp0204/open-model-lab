// @vitest-environment node

import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/dev/account-harness/route";
import { DEV_ACCOUNT_HARNESS_COOKIE } from "@/lib/account/dev-harness";

let devHarnessStorePath: string | null = null;

async function useIsolatedDevHarnessStore() {
  devHarnessStorePath = path.join(
    process.cwd(),
    "output",
    `dev-account-route-${crypto.randomUUID()}.json`,
  );
  vi.stubEnv("OPEN_MODEL_LAB_DEV_ACCOUNT_HARNESS_STORE_PATH", devHarnessStorePath);
}

describe("dev account harness route", () => {
  afterEach(async () => {
    vi.unstubAllEnvs();

    if (devHarnessStorePath) {
      await fs.rm(devHarnessStorePath, { force: true }).catch(() => undefined);
      await fs.rm(`${devHarnessStorePath}.tmp`, { force: true }).catch(() => undefined);
      devHarnessStorePath = null;
    }
  });

  it("returns not found when the harness flag is disabled", async () => {
    const formData = new FormData();
    formData.set("state", "signed-in-free");

    const response = await POST(
      new Request("http://localhost/api/dev/account-harness", {
        method: "POST",
        body: formData,
      }),
    );
    const payload = (await response.json()) as {
      code: string;
    };

    expect(response.status).toBe(404);
    expect(payload.code).toBe("not_found");
  });

  it("sets the fixture cookie and redirects back to the requested local page", async () => {
    vi.stubEnv("ENABLE_DEV_ACCOUNT_HARNESS", "true");

    const formData = new FormData();
    formData.set("state", "signed-in-premium");
    formData.set("returnTo", "/account");

    const response = await POST(
      new Request("http://localhost/api/dev/account-harness", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/account");
    expect(response.headers.get("set-cookie")).toContain(
      `${DEV_ACCOUNT_HARNESS_COOKIE}=signed-in-premium`,
    );
  });

  it("clears the harness override when requested", async () => {
    vi.stubEnv("ENABLE_DEV_ACCOUNT_HARNESS", "true");

    const formData = new FormData();
    formData.set("state", "clear");

    const response = await POST(
      new Request("http://localhost/api/dev/account-harness", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("set-cookie")).toContain(`${DEV_ACCOUNT_HARNESS_COOKIE}=`);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("applies achievement seed actions when the harness is enabled", async () => {
    vi.stubEnv("ENABLE_DEV_ACCOUNT_HARNESS", "true");
    await useIsolatedDevHarnessStore();

    const formData = new FormData();
    formData.set("action", "seed-achievements");
    formData.set("conceptVisitCount", "12");
    formData.set("questionAnswerCount", "55");
    formData.set("distinctChallengeCompletionCount", "30");
    formData.set("distinctTrackCompletionCount", "3");
    formData.set("activeStudyHours", "20");
    formData.set("challengeCompletionKeys", "projectile-motion:pm-ch-flat-far-shot");
    formData.set("trackSlugs", "motion-and-circular-motion");
    formData.set("rewardState", "claimed");

    const response = await POST(
      new Request("http://localhost/api/dev/account-harness", {
        method: "POST",
        body: formData,
        headers: {
          cookie: `${DEV_ACCOUNT_HARNESS_COOKIE}=signed-in-free`,
        },
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/dev/account-harness");
  });
});
