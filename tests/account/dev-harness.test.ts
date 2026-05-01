// @vitest-environment node

import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEV_ACCOUNT_HARNESS_COOKIE,
  readDevAccountHarnessAchievements,
  resetDevAccountHarnessAchievementsForCookieHeader,
  seedDevAccountHarnessAchievementsForCookieHeader,
  getDevAccountHarnessStoredProgressForCookieHeader,
  isDevAccountHarnessEnabled,
  mergeDevAccountHarnessStoredProgressForCookieHeader,
  resolveDevAccountHarnessSession,
} from "@/lib/account/dev-harness";
import type { ProgressSnapshot } from "@/lib/progress";

let devHarnessStorePath: string | null = null;

function buildHarnessCookie(value: string) {
  return `${DEV_ACCOUNT_HARNESS_COOKIE}=${encodeURIComponent(value)}`;
}

async function useIsolatedDevHarnessStore() {
  devHarnessStorePath = path.join(
    process.cwd(),
    "output",
    `dev-account-harness-${crypto.randomUUID()}.json`,
  );
  vi.stubEnv("OPEN_MODEL_LAB_DEV_ACCOUNT_HARNESS_STORE_PATH", devHarnessStorePath);
}

describe("dev account harness", () => {
  afterEach(async () => {
    vi.unstubAllEnvs();

    if (devHarnessStorePath) {
      await fs.rm(devHarnessStorePath, { force: true }).catch(() => undefined);
      await fs.rm(`${devHarnessStorePath}.tmp`, { force: true }).catch(() => undefined);
      devHarnessStorePath = null;
    }
  });

  it("stays disabled unless the explicit dev flag is enabled outside production", () => {
    expect(isDevAccountHarnessEnabled()).toBe(false);

    vi.stubEnv("ENABLE_DEV_ACCOUNT_HARNESS", "true");
    expect(isDevAccountHarnessEnabled()).toBe(true);

    vi.stubEnv("NODE_ENV", "production");
    expect(isDevAccountHarnessEnabled()).toBe(false);
  });

  it("resolves deterministic signed-out, free, and premium fixture sessions", () => {
    vi.stubEnv("ENABLE_DEV_ACCOUNT_HARNESS", "true");

    const signedOutResolution = resolveDevAccountHarnessSession(
      buildHarnessCookie("signed-out"),
    );
    const freeResolution = resolveDevAccountHarnessSession(
      buildHarnessCookie("signed-in-free"),
    );
    const premiumResolution = resolveDevAccountHarnessSession(
      buildHarnessCookie("signed-in-premium"),
    );

    expect(signedOutResolution).toMatchObject({
      active: true,
      state: "signed-out",
      session: null,
    });
    expect(freeResolution.session).toMatchObject({
      user: {
        id: "dev-free-learner",
        displayName: "Free learner",
      },
      entitlement: {
        tier: "free",
      },
    });
    expect(premiumResolution.session).toMatchObject({
      user: {
        id: "dev-premium-learner",
        displayName: "Supporter learner",
      },
      entitlement: {
        tier: "premium",
      },
    });
  });

  it("persists signed-in fixture progress merges without touching Supabase", async () => {
    vi.stubEnv("ENABLE_DEV_ACCOUNT_HARNESS", "true");
    await useIsolatedDevHarnessStore();

    const fixtureCookie = buildHarnessCookie("signed-in-free");
    const snapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          manualCompletedAt: "2026-04-02T10:00:00.000Z",
        },
      },
    };

    const merged = await mergeDevAccountHarnessStoredProgressForCookieHeader(
      fixtureCookie,
      snapshot,
    );
    const stored = await getDevAccountHarnessStoredProgressForCookieHeader(fixtureCookie);

    expect(merged).not.toBeNull();
    expect(merged).not.toBeUndefined();
    expect(merged?.mergeSummary.importedLocalConceptCount).toBe(1);
    expect(stored).not.toBeNull();
    expect(stored).not.toBeUndefined();
    expect(stored?.snapshot.concepts["projectile-motion"]?.manualCompletedAt).toBe(
      "2026-04-02T10:00:00.000Z",
    );
  });

  it("seeds and resets achievement state for the active fixture user", async () => {
    vi.stubEnv("ENABLE_DEV_ACCOUNT_HARNESS", "true");
    await useIsolatedDevHarnessStore();

    const fixtureCookie = buildHarnessCookie("signed-in-free");

    await seedDevAccountHarnessAchievementsForCookieHeader({
      cookieHeader: fixtureCookie,
      seed: {
        conceptVisitCount: 12,
        questionAnswerCount: 55,
        distinctChallengeCompletionCount: 30,
        distinctTrackCompletionCount: 3,
        activeStudyHours: 10,
        challengeCompletionKeys: ["projectile-motion:pm-ch-flat-far-shot"],
        trackSlugs: ["motion-and-circular-motion"],
        rewardState: "claimed",
      },
    });

    const seeded = await readDevAccountHarnessAchievements("dev-free-learner");
    expect(seeded.stats?.question_answer_count).toBe(55);
    expect(seeded.earnedAchievementsByKey["challenge:projectile-motion:pm-ch-flat-far-shot"]).toBeTruthy();
    expect(seeded.rewardsByKey["premium-first-month-25-off"]?.status).toBe("claimed");
    expect(
      seeded.rewardsByKey["premium-first-month-25-off"]?.claim_checkout_session_id,
    ).toBe("cs_dev_harness_reward_claimed");

    await resetDevAccountHarnessAchievementsForCookieHeader(fixtureCookie);

    const reset = await readDevAccountHarnessAchievements("dev-free-learner");
    expect(reset.stats).toBeNull();
    expect(Object.keys(reset.earnedAchievementsByKey)).toHaveLength(0);
    expect(Object.keys(reset.rewardsByKey)).toHaveLength(0);
  });
});
