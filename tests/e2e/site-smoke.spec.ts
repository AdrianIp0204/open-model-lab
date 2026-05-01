import { expect, test } from "@playwright/test";
import {
  gotoAndExpectOk,
  installBrowserGuards,
  resetHarnessAchievements,
  seedHarnessAchievements,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

const publicRouteExpectations = [
  {
    pathname: "/",
    heading: "Learn science by changing live simulations.",
  },
  {
    pathname: "/concepts",
    heading: "Search first, then keep the matching concepts in view.",
  },
  {
    pathname: "/tests",
    heading: "Pick a test and start.",
  },
  {
    pathname: "/tests/packs/physics-connected-models",
    heading: "Physics Connections Pack",
  },
  {
    pathname: "/tests/topics/circuits",
    heading: "Circuits topic test",
  },
  {
    pathname: "/concepts/topics",
    heading: "Use topic pages when concepts should feel situated, not flat.",
  },
  {
    pathname: "/guided",
    heading: "Follow a short path when you want the order chosen for you.",
  },
  {
    pathname: "/tracks/motion-and-circular-motion",
    heading: "Motion and Circular Motion",
  },
  {
    pathname: "/challenges",
    heading: "Pick a bounded task, then open the exact concept bench that can solve it.",
  },
] as const;

let browserGuard: BrowserGuard;

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("renders the main public discovery routes without browser-breaking issues", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await setHarnessSession(page, "signed-out");

  for (const route of publicRouteExpectations) {
    await gotoAndExpectOk(page, route.pathname);
    await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
  }
});

test("renders pricing, signed-out account, and contact flows cleanly", async ({ page }) => {
  await setHarnessSession(page, "signed-out");

  await gotoAndExpectOk(page, "/pricing");
  await expect(
    page.getByRole("heading", {
      name: "Core learning stays free. Supporter helps keep the project running.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in first" })).toBeVisible();

  await gotoAndExpectOk(page, "/account");
  await expect(
    page.getByRole("heading", {
      name: "Signing in is optional. Supporter is a separate plan.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "25% off first Supporter month" }),
  ).toHaveCount(0);

  await gotoAndExpectOk(page, "/contact");
  await expect(
    page.getByRole("heading", {
      name: "Send feedback without an account, analytics sprawl, or a support maze.",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Feedback type")).toBeVisible();
  await expect(page.getByLabel("Reply email or handle")).toBeVisible();
  await expect(page.getByLabel("What happened")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send feedback" })).toBeVisible();
});

test("keeps About and Pricing discoverable in the footer without promoting them into primary nav", async ({
  page,
}) => {
  await setHarnessSession(page, "signed-out");

  await gotoAndExpectOk(page, "/");
  const footer = page.locator("footer");
  await footer.scrollIntoViewIfNeeded();

  await expect(footer.getByRole("link", { name: "About" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Pricing" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "About" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Pricing" })).toHaveCount(0);
});

test("keeps Guided as the active primary nav item for guided hub and detail routes", async ({
  page,
}) => {
  await setHarnessSession(page, "signed-out");
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const pathname of ["/guided", "/guided/waves-evidence-loop"]) {
    await gotoAndExpectOk(page, pathname);

    const primaryNav = page.getByRole("navigation", { name: "Primary" });
    await expect(primaryNav.getByRole("link", { name: "Guided" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(primaryNav.getByRole("link", { name: "Challenges" })).toHaveCount(1);
    await expect(primaryNav.getByRole("link", { name: "Simulations" })).toHaveCount(1);
  }
});

test("renders the signed-in free account flow and starts checkout from pricing", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await setHarnessSession(page, "signed-in-free");
  await resetHarnessAchievements(page);
  await seedHarnessAchievements(page, {
    conceptVisitCount: 12,
    questionAnswerCount: 4,
    distinctChallengeCompletionCount: 17,
    activeStudyHours: 5,
    rewardState: "locked",
  });

  await gotoAndExpectOk(page, "/dashboard");
  await expect(page.getByRole("heading", { name: "Achievement snapshot" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Learning analytics" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Unlock Supporter analytics" })).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?pricing#compare$/,
  );
  await expect(page.getByText("10 concepts milestone")).toBeVisible();
  await expect(page.getByText("Next: 10 questions milestone")).toBeVisible();
  await expect(page.getByText("15 challenges milestone")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View all badges and rewards" }),
  ).toHaveAttribute("href", /\/(?:[a-zA-Z-]+\/)?account$/);

  await gotoAndExpectOk(page, "/dashboard/analytics");
  await expect(
    page.getByRole("heading", { name: "Supporter analytics are optional convenience features." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?dashboard$/,
  );

  await gotoAndExpectOk(page, "/account");
  await expect(page.getByRole("heading", { name: "Free learner" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Badges and study milestones" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByRole("heading", { name: "One-time Supporter starter reward" }),
  ).toBeVisible();

  let checkoutCalls = 0;
  await page.route("**/api/billing/checkout", async (route) => {
    checkoutCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        url: "/account?billing=e2e-pricing-checkout",
      }),
    });
  });

  await gotoAndExpectOk(page, "/pricing");
  await expect(
    page.getByRole("link", { name: "Free learner Free tier" }),
  ).toBeVisible({ timeout: 15_000 });
  const checkoutButton = page.getByRole("button", { name: "Start Supporter checkout" });
  await expect(checkoutButton).toBeVisible({ timeout: 15_000 });
  const checkoutResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/billing/checkout") &&
      response.request().method() === "POST",
  );
  await checkoutButton.click();
  await checkoutResponse;

  await expect(page).toHaveURL(/\/account\?billing=e2e-pricing-checkout$/, {
    timeout: 15_000,
  });
  await expect(
    page.getByRole("heading", { name: "Badges and study milestones" }),
  ).toBeVisible({ timeout: 15_000 });
  expect(checkoutCalls).toBe(1);
});

test("renders the signed-in premium account flow and exposes subscription management", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await setHarnessSession(page, "signed-in-premium");
  await resetHarnessAchievements(page);
  await seedHarnessAchievements(page, {
    conceptVisitCount: 10,
    questionAnswerCount: 12,
    distinctChallengeCompletionCount: 30,
    distinctTrackCompletionCount: 3,
    activeStudyHours: 10,
    rewardState: "unlocked",
  });

  let portalCalls = 0;
  await page.route("**/api/billing/portal", async (route) => {
    portalCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        url: "/account?billing=e2e-portal-returned",
      }),
    });
  });

  await gotoAndExpectOk(page, "/account");
  await expect(
    page.getByRole("link", { name: "Supporter learner Supporter" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Supporter learner" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Badges and study milestones" }),
  ).toBeVisible();
  await expect(
    page.getByText("Supporter is active on this account and the Stripe billing state looks healthy."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Claim reward and start Supporter" }),
  ).toHaveCount(0);

  const manageButton = page.getByRole("button", { name: "Manage subscription" });
  await expect(manageButton).toBeVisible();
  const portalResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/billing/portal") &&
      response.request().method() === "POST",
  );
  await manageButton.click();
  await portalResponse;

  await expect(page).toHaveURL(/\/account\?billing=e2e-portal-returned$/, {
    timeout: 15_000,
  });
  expect(portalCalls).toBe(1);

  await gotoAndExpectOk(page, "/dashboard");
  await expect(page.getByRole("heading", { name: "Achievement snapshot" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Learning analytics" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open analytics" })).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?dashboard\/analytics$/,
  );
  await expect(page.getByText("10 concepts milestone")).toBeVisible();
  await expect(page.getByText("10 questions milestone")).toBeVisible();
  await expect(page.getByText("30 challenges milestone")).toBeVisible();
  await expect(page.getByText("3 tracks milestone")).toBeVisible();
  await expect(page.getByText("10 hours milestone")).toBeVisible();

  await gotoAndExpectOk(page, "/dashboard/analytics");
  await expect(
    page.getByRole("heading", {
      name: "Review your saved learning signals without leaving the real product routes.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Saved activity, checkpoint momentum, and review pressure" }),
  ).toBeVisible();
});
