import fs from "node:fs";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  baseURL,
  gotoAndExpectOk,
  installBrowserGuards,
  resetHarnessAchievements,
  seedHarnessAchievements,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

type AccountState = "signed-out" | "signed-in-free" | "signed-in-premium";
type LocaleCase = "en" | "zh-HK";

const qaArtifactDir = path.join(process.cwd(), "output", "playwright", "qa");
const accountBehaviourSummaryPath = path.join(
  qaArtifactDir,
  "account-behaviour-sweep-summary.json",
);

const viewports = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

const locales = ["en", "zh-HK"] as const;

const routeCases = [
  {
    name: "account",
    path: "/account",
    states: ["signed-out", "signed-in-free", "signed-in-premium"],
    primaryAction: (page: Page, state: AccountState) =>
      state === "signed-out"
        ? page.locator("main a[href$='/dev/account-harness']")
        : page.locator("main a[href$='/dashboard']").first(),
    ready: (page: Page) => page.locator("#account-overview").first(),
  },
  {
    name: "dashboard",
    path: "/dashboard",
    states: ["signed-in-free", "signed-in-premium"],
    primaryAction: (page: Page) => page.getByTestId("dashboard-first-primary-action"),
    ready: (page: Page) => page.getByTestId("dashboard-first-move"),
  },
  {
    name: "analytics",
    path: "/dashboard/analytics",
    states: ["signed-in-free", "signed-in-premium"],
    primaryAction: (page: Page, state: AccountState) =>
      state === "signed-in-free"
        ? page.getByTestId("analytics-locked-primary-action")
        : page.getByTestId("analytics-first-primary-action"),
    ready: (page: Page, state: AccountState) =>
      state === "signed-in-free"
        ? page.getByTestId("analytics-locked-first-move")
        : page.getByTestId("analytics-first-move"),
  },
  {
    name: "saved-setups",
    path: "/account/setups",
    states: ["signed-out", "signed-in-free", "signed-in-premium"],
    primaryAction: (page: Page) => page.locator("main a[href$='/concepts']").first(),
    ready: (page: Page) => page.locator("main").getByRole("heading").first(),
  },
  {
    name: "saved-compare-setups",
    path: "/account/compare-setups",
    states: ["signed-out", "signed-in-free", "signed-in-premium"],
    primaryAction: (page: Page) => page.locator("main a[href$='/concepts']").first(),
    ready: (page: Page) => page.locator("main").getByRole("heading").first(),
  },
  {
    name: "study-plans",
    path: "/account/study-plans",
    states: ["signed-out", "signed-in-free", "signed-in-premium"],
    primaryAction: (page: Page, state: AccountState) =>
      state === "signed-in-premium"
        ? page.getByTestId("study-plan-picker").locator("button").first()
        : page.locator("main a[href$='/guided'], main a[href*='/pricing#compare']").first(),
    ready: (page: Page) => page.locator("main").getByRole("heading").first(),
  },
] as const;

const zhHkStaleEnglishPhrases = [
  "Create account or sign in",
  "Signed in on the free tier",
  "Supporter is active for this signed-in account",
  "Dashboard sections",
  "Analytics sections",
  "Saved setup library",
  "Saved compare setup library",
  "Saved study plans",
  "Create a saved study plan",
  "Learning analytics",
] as const;

const summaryEntries: Array<{
  route: string;
  path: string;
  state: AccountState;
  locale: LocaleCase;
  viewport: string;
}> = [];

let browserGuard: BrowserGuard;

test.setTimeout(240_000);

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

function localizePath(locale: LocaleCase, pathname: string) {
  return locale === "en" ? pathname : `/zh-HK${pathname}`;
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const viewportWidth = root.clientWidth;
    const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth ?? 0);

    return {
      viewportWidth,
      scrollWidth,
      overflowBy: scrollWidth - viewportWidth,
    };
  });

  expect(overflow.overflowBy, `${label} has horizontal overflow: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(2);
}

async function expectNoObviousTextClipping(page: Page, label: string) {
  const failures = await page
    .locator("main :is(h1,h2,h3,a,button,label span,p[role='alert'],p[role='status'],div[role='alert'],div[role='status'])")
    .evaluateAll((elements) =>
      elements.flatMap((element) => {
        const htmlElement = element as HTMLElement;
        const style = window.getComputedStyle(htmlElement);
        const rect = htmlElement.getBoundingClientRect();
        const visible =
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) !== 0 &&
          rect.width > 0 &&
          rect.height > 0;

        if (!visible || style.webkitLineClamp !== "none") {
          return [];
        }

        const clipped =
          htmlElement.scrollWidth > htmlElement.clientWidth + 1 ||
          htmlElement.scrollHeight > htmlElement.clientHeight + 1;

        return clipped
          ? [
              {
                text: (htmlElement.innerText || htmlElement.textContent || "").trim().slice(0, 120),
                tag: htmlElement.tagName.toLowerCase(),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                scrollWidth: htmlElement.scrollWidth,
                scrollHeight: htmlElement.scrollHeight,
                clientWidth: htmlElement.clientWidth,
                clientHeight: htmlElement.clientHeight,
              },
            ]
          : [];
      }),
    );

  expect(failures, `${label} has clipped visible text`).toEqual([]);
}

async function expectPrimaryActionUsable(locator: Locator, label: string) {
  await expect(locator, `${label} is missing its primary next action`).toBeVisible();
  await expect(locator, `${label} primary next action should be enabled`).toBeEnabled();

  const box = await locator.boundingBox();
  expect(box, `${label} primary next action has no bounding box`).not.toBeNull();
  expect(Math.round(box?.width ?? 0), `${label} primary next action width`).toBeGreaterThanOrEqual(44);
  expect(Math.round(box?.height ?? 0), `${label} primary next action height`).toBeGreaterThanOrEqual(44);
}

async function expectNoStaleEnglishLeakage(page: Page, label: string) {
  for (const phrase of zhHkStaleEnglishPhrases) {
    await expect(
      page.locator("main").getByText(phrase, { exact: true }),
      `${label} leaked stale English phrase "${phrase}"`,
    ).toHaveCount(0);
  }
}

async function runCoreLayoutAssertions(page: Page, label: string) {
  await expectNoHorizontalOverflow(page, label);
  await expectNoObviousTextClipping(page, label);
}

async function resetSavedStudyPlans(page: Page) {
  const response = await page.context().request.get(`${baseURL}/api/account/study-plans`);

  if (!response.ok()) {
    return;
  }

  const payload = (await response.json()) as {
    items?: Array<{ id: string }>;
  };

  for (const item of payload.items ?? []) {
    await page.context().request.delete(`${baseURL}/api/account/study-plans`, {
      data: { id: item.id },
    });
  }
}

test("OML-QA-066 sweeps account route shape across account state, locale, and responsive layout", async ({
  page,
}) => {
  fs.mkdirSync(qaArtifactDir, { recursive: true });

  for (const routeCase of routeCases) {
    for (const state of routeCase.states) {
      await setHarnessSession(page, state);

      if (state === "signed-in-free" || state === "signed-in-premium") {
        await resetHarnessAchievements(page);
        await seedHarnessAchievements(page, {
          conceptVisitCount: 3,
          questionAnswerCount: 8,
          distinctChallengeCompletionCount: 2,
          activeStudyHours: 0.4,
          rewardState: "locked",
        });
      }

      if (routeCase.name === "study-plans" && state === "signed-in-premium") {
        await resetSavedStudyPlans(page);
      }

      for (const locale of locales) {
        for (const viewport of viewports) {
          await page.setViewportSize({
            width: viewport.width,
            height: viewport.height,
          });

          const pathToVisit = localizePath(locale, routeCase.path);
          const label = `${routeCase.name}/${state}/${locale}/${viewport.name}`;

          await gotoAndExpectOk(page, pathToVisit);
          await expect(routeCase.ready(page, state), `${label} ready marker`).toBeVisible({
            timeout: 15_000,
          });
          await expectPrimaryActionUsable(routeCase.primaryAction(page, state), label);
          await runCoreLayoutAssertions(page, label);

          if (locale === "zh-HK") {
            await expectNoStaleEnglishLeakage(page, label);
          }

          summaryEntries.push({
            route: routeCase.name,
            path: pathToVisit,
            state,
            locale,
            viewport: viewport.name,
          });
        }
      }
    }
  }

  fs.writeFileSync(
    accountBehaviourSummaryPath,
    JSON.stringify(
      {
        ok: true,
        checks: [
          "horizontal-overflow",
          "obvious-text-clipping",
          "primary-action-present-enabled-44px",
          "zh-HK-stale-account-English-leakage",
          "browser-guards",
        ],
        entries: summaryEntries,
      },
      null,
      2,
    ),
    "utf8",
  );
});

test("OML-QA-066 keeps live auth pending, success, error, and valid-button states usable", async ({
  page,
}) => {
  let magicLinkResolve: () => void = () => undefined;
  const magicLinkPending = new Promise<void>((resolve) => {
    magicLinkResolve = resolve;
  });

  await page.route("**/api/account/session", async (route) => {
    const request = route.request();

    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: null,
          entitlement: null,
          authMode: "supabase",
        }),
      });
      return;
    }

    const body = request.postDataJSON() as Record<string, unknown>;

    if (body.action === "magic-link") {
      await magicLinkPending;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          message: "Check your inbox and spam for a sign-in link.",
        }),
      });
      return;
    }

    if (body.action === "password-sign-in") {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          code: "invalid_credentials",
          error: "Incorrect email or password",
        }),
      });
      return;
    }

    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        code: "unexpected_request",
        error: "Unexpected request",
      }),
    });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await gotoAndExpectOk(page, "/account");

  const emailLinkInput = page.getByLabel("Email for sign-in link");
  const emailLinkButton = page.getByRole("button", { name: "Create account or send link" });
  const passwordEmailInput = page.getByLabel("Email for password sign-in");
  const passwordInput = page.getByLabel("Password", { exact: true });
  const passwordButton = page.getByRole("button", { name: "Sign in with password" });
  const resetButton = page.getByRole("button", { name: "Send password-reset email" });

  await emailLinkInput.fill("student@example.com");
  await passwordEmailInput.fill("student@example.com");
  await passwordInput.fill("wrong-password");

  await expect(emailLinkButton).toBeEnabled();
  await expect(passwordButton).toBeEnabled();
  await expect(resetButton).toBeEnabled();

  await emailLinkButton.click();
  await expect(page.getByRole("status").filter({ hasText: "Requesting a fresh email link" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sending account link..." })).toBeDisabled();

  magicLinkResolve();
  await expect(page.getByText("Check your inbox and spam for a sign-in link.")).toBeVisible();
  await runCoreLayoutAssertions(page, "auth/success/mobile");

  await passwordButton.click();
  await expect(page.getByRole("alert").filter({ hasText: "Incorrect email or password" })).toBeVisible();
  await expect(passwordButton).toBeEnabled();
  await runCoreLayoutAssertions(page, "auth/error/mobile");
});

test("OML-QA-066 keeps sync retry, reward variants, and study-plan search states covered", async ({
  page,
}) => {
  fs.mkdirSync(qaArtifactDir, { recursive: true });

  browserGuard.allowIssue(/\[response 503\] \/api\/account\/progress/);
  browserGuard.allowIssue(/Failed to load resource: the server responded with a status of 503/i);

  await page.route("**/api/account/progress", async (route) => {
    if (route.request().method() === "PUT") {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Progress sync failed during OML-QA-066 retry coverage.",
        }),
      });
      return;
    }

    await route.fallback();
  });

  await setHarnessSession(page, "signed-in-free");
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoAndExpectOk(page, "/account");
  const syncNow = page.getByRole("button", { name: "Sync now" }).first();
  await syncNow.click();
  await expect(
    page.getByText("Progress sync failed during OML-QA-066 retry coverage."),
  ).toBeVisible();
  await expect(syncNow).toBeEnabled();
  await runCoreLayoutAssertions(page, "sync-error-retry/free-phone");

  await page.unroute("**/api/account/progress");

  for (const rewardState of ["unlocked", "claimed", "expired"] as const) {
    await setHarnessSession(page, "signed-in-free");
    await resetHarnessAchievements(page);
    await seedHarnessAchievements(page, {
      distinctChallengeCompletionCount: 30,
      activeStudyHours: 10,
      rewardState,
    });
    await page.setViewportSize({ width: 820, height: 1180 });
    await gotoAndExpectOk(page, "/account");
    await expect(
      page.getByRole("region", { name: "One-time Supporter starter reward" }),
    ).toContainText(new RegExp(rewardState, "i"));
    await runCoreLayoutAssertions(page, `reward-${rewardState}/tablet`);
  }

  await setHarnessSession(page, "signed-in-premium");
  await resetSavedStudyPlans(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoAndExpectOk(page, "/account/study-plans");

  await expect(page.getByTestId("study-plan-picker-results")).toBeVisible();
  await page.getByTestId("study-plan-picker-search").fill("projectile");
  await expect(page.getByTestId("study-plan-picker-option-concept:projectile-motion")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add item" })).toBeEnabled();

  await page.getByTestId("study-plan-picker-search").fill("no-matching-account-sweep-item");
  await expect(page.getByTestId("study-plan-picker-empty")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add item" })).toBeDisabled();
  await runCoreLayoutAssertions(page, "study-plan-search-empty/phone");
});
