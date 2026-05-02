import fs from "node:fs/promises";
import path from "node:path";
import {
  expect,
  type APIResponse,
  type ConsoleMessage,
  type Page,
} from "@playwright/test";

const configuredPort = process.env.PLAYWRIGHT_PORT ?? "3100";
export const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${configuredPort}`;
const devHarnessStorePath = path.join(
  process.cwd(),
  "output",
  "playwright",
  "dev-account-harness.json",
);

const benignConsoleMessagePatterns = [
  /AdSense head tag doesn't support data-nscript attribute\./i,
  /Download the React DevTools/i,
  /Failed to load resource: the server responded with a status of 401 \(Unauthorized\)/i,
  /webpack-hmr/i,
  /WebSocket connection to .*_next\/webpack-hmr/i,
] as const;

const hydrationMessagePatterns = [
  /hydration/i,
  /did not match/i,
  /server html/i,
  /text content does not match/i,
  /An error occurred during hydration/i,
  /There was an error while hydrating/i,
] as const;

export type BrowserGuard = {
  allowIssue: (pattern: RegExp) => void;
  assertNoActionableIssues: () => void;
};

export type HarnessAchievementSeed = Partial<{
  conceptVisitCount: number;
  questionAnswerCount: number;
  distinctChallengeCompletionCount: number;
  distinctTrackCompletionCount: number;
  activeStudyHours: number;
  rewardState: "locked" | "unlocked" | "claimed" | "expired";
  challengeCompletionKeys: string[];
  trackSlugs: string[];
}>;

function isBenignConsoleMessage(message: ConsoleMessage, text: string) {
  if (message.type() !== "warning" && message.type() !== "error") {
    return false;
  }

  return benignConsoleMessagePatterns.some((pattern) => pattern.test(text));
}

export async function installBrowserGuards(page: Page): Promise<BrowserGuard> {
  const issues: string[] = [];
  const allowedIssuePatterns: RegExp[] = [];

  await page.route(
    /^https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: "",
      });
    },
  );

  page.on("pageerror", (error) => {
    issues.push(`[pageerror] ${error.message}`);
  });

  page.on("console", (message) => {
    const text = message.text();

    if (isBenignConsoleMessage(message, text)) {
      return;
    }

    if (
      message.type() === "error" ||
      hydrationMessagePatterns.some((pattern) => pattern.test(text))
    ) {
      issues.push(`[console.${message.type()}] ${text}`);
    }
  });

  page.on("response", (response) => {
    try {
      const url = new URL(response.url());

      if (url.origin !== baseURL || response.status() < 500) {
        return;
      }

      issues.push(`[response ${response.status()}] ${url.pathname}`);
    } catch {
      // Ignore invalid response URLs from browser internals.
    }
  });

  return {
    allowIssue(pattern: RegExp) {
      allowedIssuePatterns.push(pattern);
    },
    assertNoActionableIssues() {
      const actionableIssues = issues.filter(
        (issue) => !allowedIssuePatterns.some((pattern) => pattern.test(issue)),
      );

      expect(actionableIssues, actionableIssues.join("\n")).toEqual([]);
    },
  };
}

async function expectHarnessRedirect(response: APIResponse, action: string) {
  if (response.status() === 303) {
    return;
  }

  const payload = await response.text().catch(() => "");

  throw new Error(
    `Dev account harness ${action} failed with ${response.status()}. ` +
      `Make sure Playwright started the harness-enabled dev server. ` +
      (payload ? `Response: ${payload}` : ""),
  );
}

export async function setHarnessSession(
  page: Page,
  state: "signed-in-free" | "signed-in-premium" | "signed-out",
) {
  const response = await page.context().request.post(`${baseURL}/api/dev/account-harness`, {
    form: {
      action: "set-session",
      state,
      returnTo: "/dev/account-harness",
    },
    maxRedirects: 0,
  });

  await expectHarnessRedirect(response, "set-session");
}

export async function seedLocalProgressSnapshot(page: Page, snapshot: unknown) {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    {
      key: "physica.local-progress.v1",
      value: snapshot,
    },
  );
}

export async function resetPlaywrightHarnessProgressStore() {
  await fs.rm(devHarnessStorePath, { force: true }).catch(() => undefined);
  await fs.rm(`${devHarnessStorePath}.tmp`, { force: true }).catch(() => undefined);
}

export async function seedSyncedProgressSnapshot(page: Page, snapshot: unknown) {
  const response = await page.context().request.put(`${baseURL}/api/account/progress`, {
    data: {
      snapshot,
    },
  });

  expect(response.ok(), "Expected synced progress seed request to succeed.").toBeTruthy();
  return response;
}

export async function resetHarnessAchievements(page: Page) {
  const response = await page.context().request.post(`${baseURL}/api/dev/account-harness`, {
    form: {
      action: "reset-achievements",
      returnTo: "/dev/account-harness",
    },
    maxRedirects: 0,
  });

  await expectHarnessRedirect(response, "reset-achievements");
}

export async function seedHarnessAchievements(
  page: Page,
  seed: HarnessAchievementSeed = {},
) {
  const response = await page.context().request.post(`${baseURL}/api/dev/account-harness`, {
    form: {
      action: "seed-achievements",
      returnTo: "/dev/account-harness",
      conceptVisitCount: `${seed.conceptVisitCount ?? 0}`,
      questionAnswerCount: `${seed.questionAnswerCount ?? 0}`,
      distinctChallengeCompletionCount: `${seed.distinctChallengeCompletionCount ?? 0}`,
      distinctTrackCompletionCount: `${seed.distinctTrackCompletionCount ?? 0}`,
      activeStudyHours: `${seed.activeStudyHours ?? 0}`,
      rewardState: seed.rewardState ?? "locked",
      challengeCompletionKeys: (seed.challengeCompletionKeys ?? []).join("\n"),
      trackSlugs: (seed.trackSlugs ?? []).join("\n"),
    },
    maxRedirects: 0,
  });

  await expectHarnessRedirect(response, "seed-achievements");
}

export async function gotoAndExpectOk(page: Page, pathname: string) {
  const response = await page.goto(pathname, {
    waitUntil: "domcontentloaded",
  });

  expect(response, `No document response was returned for ${pathname}.`).not.toBeNull();
  expect(response?.ok(), `${pathname} returned ${response?.status()}.`).toBeTruthy();

  return response;
}

export async function closeOpenDisclosurePanels(page: Page) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const summary = page.locator("details[open] > summary").first();

    if (!(await summary.isVisible().catch(() => false))) {
      break;
    }

    await summary.click({ force: true });
  }

  await page.locator("details[open]").evaluateAll((elements) => {
    for (const element of elements) {
      (element as HTMLDetailsElement).open = false;
    }
  });
}

export async function openConceptProgressDisclosure(page: Page) {
  const trigger = page.getByTestId("concept-progress-disclosure-trigger");
  const disclosure = page.locator("details").filter({ has: trigger }).first();

  await trigger.scrollIntoViewIfNeeded();
  await expect(trigger).toBeVisible();

  const isOpen = await disclosure.evaluate((element) =>
    (element as HTMLDetailsElement).open,
  );

  if (!isOpen) {
    await trigger.click();
  }

  await expect(disclosure).toHaveJSProperty("open", true);
}

export async function expandFullTestCatalogIfAvailable(page: Page) {
  const button = page.getByTestId("test-hub-show-full-catalog").first();

  await button.waitFor({ state: "visible", timeout: 2000 }).catch(() => undefined);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (!(await button.isVisible().catch(() => false))) {
      return;
    }

    await button
      .evaluate((element: HTMLElement) => {
        element.click();
      })
      .catch(async () => {
        await button.click({ force: true });
      });
    await page.waitForTimeout(250);
  }

  await button.waitFor({ state: "hidden", timeout: 5000 }).catch(() => undefined);
}
