import { expect, test, type Locator, type Page } from "@playwright/test";
import { getConceptBySlug } from "@/lib/content";
import {
  closeOpenDisclosurePanels,
  expandFullTestCatalogIfAvailable,
  installBrowserGuards,
  resetPlaywrightHarnessProgressStore,
  seedLocalProgressSnapshot,
  seedSyncedProgressSnapshot,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

const basicCircuitsConcept = getConceptBySlug("basic-circuits");

const staleSyncedHubSnapshot = {
  version: 1,
  concepts: {},
  topicTests: {
    oscillations: {
      slug: "oscillations",
      completedAt: "2026-04-16T08:05:00.000Z",
      attemptCount: 1,
      lastIncorrectCount: 2,
      lastQuestionCount: 10,
    },
  },
  packTests: {},
} as const;

const richerLocalAssessmentSnapshot = {
  version: 1,
  concepts: {
    "basic-circuits": {
      conceptId: basicCircuitsConcept.id,
      slug: "basic-circuits",
      firstVisitedAt: "2026-04-16T08:00:00.000Z",
      lastVisitedAt: "2026-04-16T08:20:00.000Z",
      completedQuickTestAt: "2026-04-16T08:20:00.000Z",
      quickTestAttemptCount: 2,
      quickTestLastIncorrectCount: 0,
    },
  },
  topicTests: {
    oscillations: {
      slug: "oscillations",
      completedAt: "2026-04-16T08:25:00.000Z",
      attemptCount: 2,
      lastIncorrectCount: 0,
      lastQuestionCount: 10,
    },
  },
  packTests: {
    "physics-connected-models": {
      slug: "physics-connected-models",
      completedAt: "2026-04-16T08:30:00.000Z",
      attemptCount: 1,
      lastIncorrectCount: 0,
      lastQuestionCount: 16,
    },
  },
} as const;

const syncedOnlyConceptSnapshot = {
  version: 1,
  concepts: {
    "basic-circuits": {
      conceptId: basicCircuitsConcept.id,
      slug: "basic-circuits",
      firstVisitedAt: "2026-04-16T08:00:00.000Z",
      lastVisitedAt: "2026-04-16T08:18:00.000Z",
      completedQuickTestAt: "2026-04-16T08:18:00.000Z",
      quickTestAttemptCount: 1,
      quickTestLastIncorrectCount: 0,
    },
  },
  topicTests: {},
  packTests: {},
} as const;

const syncedOnlyPackSnapshot = {
  version: 1,
  concepts: {},
  topicTests: {},
  packTests: {
    "physics-connected-models": {
      slug: "physics-connected-models",
      completedAt: "2026-04-16T08:12:00.000Z",
      attemptCount: 1,
      lastIncorrectCount: 0,
      lastQuestionCount: 16,
    },
  },
} as const;

let browserGuard: BrowserGuard;

function isPendingValue(value: string | null | undefined) {
  return value === "\u2014";
}

function getConceptProgressCard(page: Page) {
  return page.getByTestId("concept-progress-card");
}

function getTopicStatusPanel(page: Page) {
  return page.getByTestId("topic-test-status-panel");
}

function getPackStatusPanel(page: Page) {
  return page.getByTestId("pack-test-status-panel");
}

async function ensureConceptProgressPanelOpen(page: Page) {
  const card = getConceptProgressCard(page);

  if (await card.isVisible()) {
    return card;
  }

  await page.getByText("Progress and next steps").click();
  await expect(card).toBeVisible();
  return card;
}

async function waitForHubSummaryReady(page: Page) {
  await expect(page.getByTestId("test-hub-total-count")).not.toHaveText("\u2014");
  await expect(page.getByTestId("test-hub-completed-count")).not.toHaveText("\u2014");
  await expect(page.getByTestId("test-hub-clean-count")).not.toHaveText("\u2014");
  await expect(page.getByTestId("test-hub-remaining-count")).not.toHaveText("\u2014");
  await expandFullTestCatalogIfAvailable(page);
}

async function expectCardCompletedState(card: Locator, retakeLabel: string) {
  await expect(card.getByRole("link", { name: retakeLabel })).toBeVisible();
  await expect(card.getByText("Completed")).toBeVisible();
  await expect(card.getByText("Perfect score on the latest run.")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  await resetPlaywrightHarnessProgressStore();
  browserGuard = await installBrowserGuards(page);
  await setHarnessSession(page, "signed-in-free");
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("keeps /tests honest when a stale synced snapshot is merged with newer local assessment progress", async ({
  page,
}) => {
  await seedSyncedProgressSnapshot(page, staleSyncedHubSnapshot);
  await seedLocalProgressSnapshot(page, richerLocalAssessmentSnapshot);

  const response = await page.goto("/tests", { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();

  const completedText = (await page.getByTestId("test-hub-completed-count").textContent())?.trim();
  const cleanText = (await page.getByTestId("test-hub-clean-count").textContent())?.trim();
  const remainingText = (await page.getByTestId("test-hub-remaining-count").textContent())?.trim();

  if (
    isPendingValue(completedText) ||
    isPendingValue(cleanText) ||
    isPendingValue(remainingText)
  ) {
    expect(isPendingValue(completedText)).toBe(true);
    expect(isPendingValue(cleanText)).toBe(true);
    expect(isPendingValue(remainingText)).toBe(true);
  } else {
    expect(completedText).toBe("3");
    expect(cleanText).toBe("3");
    expect(remainingText).not.toBe("1");
  }

  await waitForHubSummaryReady(page);

  await expect(
    page.getByTestId("test-hub-card-topic-oscillations"),
  ).not.toContainText("Latest run missed 2 questions.");
  await expect(
    page.getByTestId("test-hub-card-concept-basic-circuits"),
  ).not.toContainText("Not started");
  await expect(
    page.getByTestId("test-hub-card-pack-physics-connected-models"),
  ).not.toContainText("Not started");

  const totalTests = Number(
    ((await page.getByTestId("test-hub-total-count").textContent()) ?? "0").trim(),
  );
  await expect(page.getByTestId("test-hub-completed-count")).toHaveText("3");
  await expect(page.getByTestId("test-hub-clean-count")).toHaveText("3");
  await expect(page.getByTestId("test-hub-remaining-count")).toHaveText(
    String(Math.max(0, totalTests - 3)),
  );

  await expectCardCompletedState(
    page.getByTestId("test-hub-card-concept-basic-circuits"),
    "Retake concept test",
  );
  await expectCardCompletedState(
    page.getByTestId("test-hub-card-topic-oscillations"),
    "Retake topic test",
  );
  await expectCardCompletedState(
    page.getByTestId("test-hub-card-pack-physics-connected-models"),
    "Retake pack",
  );
});

test("keeps the direct concept quick-test route honest when synced progress exists and no local snapshot is present", async ({
  page,
}) => {
  await seedSyncedProgressSnapshot(page, syncedOnlyConceptSnapshot);

  const response = await page.goto("/concepts/basic-circuits?phase=check#quick-test", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.ok()).toBeTruthy();

  await expect(page.getByTestId("quiz-question-stage")).toBeVisible();
  await expect(page.getByTestId("challenge-mode-floating-anchor")).toHaveCount(0);
  const card = await ensureConceptProgressPanelOpen(page);
  const cardText = await card.textContent();

  expect(cardText?.includes("Start exploring and Open Model Lab will keep this concept's progress on this browser first.") ?? false).toBe(false);
  expect(cardText?.includes("No finished quick test is saved yet.") ?? false).toBe(false);

  if (cardText?.includes("Loading progress")) {
    await expect(card).toContainText("Loading progress");
  } else {
    await expect(card).toContainText(/Last activity/i);
    await expect(card).toContainText("Synced");
  }

  await expect(card).toContainText(/Last activity/i);
  await expect(card).toContainText("Synced");

  await closeOpenDisclosurePanels(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("challenge-mode-floating-anchor")).toHaveCount(0);
  const reloadedCard = await ensureConceptProgressPanelOpen(page);
  await expect(reloadedCard).toContainText(/Last activity/i, { timeout: 15000 });
  await expect(reloadedCard).toContainText("Synced", { timeout: 15000 });
});

test("keeps the direct topic-test route honest when fresher local progress should override stale synced state", async ({
  page,
}) => {
  await seedSyncedProgressSnapshot(page, staleSyncedHubSnapshot);
  await seedLocalProgressSnapshot(page, richerLocalAssessmentSnapshot);

  const response = await page.goto("/tests/topics/oscillations", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.ok()).toBeTruthy();

  const panel = getTopicStatusPanel(page);
  const panelText = await panel.textContent();

  expect(panelText?.includes("Latest run missed 2 questions.") ?? false).toBe(false);
  expect(panelText?.includes("Not started") ?? false).toBe(false);

  if (panelText?.includes("Loading progress")) {
    await expect(panel).toContainText("Loading progress");
  } else {
    await expect(panel).toContainText("Completed");
    await expect(panel).toContainText("Perfect score on the latest run.");
  }

  await expect(panel).toContainText("Completed");
  await expect(panel).toContainText("Perfect score on the latest run.");

  await page.reload({ waitUntil: "domcontentloaded" });
  const reloadedPanel = getTopicStatusPanel(page);
  await expect(reloadedPanel).toContainText("Completed");
  await expect(reloadedPanel).toContainText("Perfect score on the latest run.");
});

test("keeps the direct pack-test route honest when synced progress exists and no local snapshot is present", async ({
  page,
}) => {
  await seedSyncedProgressSnapshot(page, syncedOnlyPackSnapshot);

  const response = await page.goto("/tests/packs/physics-connected-models", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.ok()).toBeTruthy();

  const panel = getPackStatusPanel(page);
  const panelText = await panel.textContent();

  expect(panelText?.includes("Not started") ?? false).toBe(false);

  if (panelText?.includes("Loading progress")) {
    await expect(panel).toContainText("Loading progress");
  } else {
    await expect(panel).toContainText("Completed");
    await expect(panel).toContainText("Perfect score on the latest run.");
  }

  await expect(panel).toContainText("Completed");
  await expect(panel).toContainText("Perfect score on the latest run.");

  await page.reload({ waitUntil: "domcontentloaded" });
  const reloadedPanel = getPackStatusPanel(page);
  await expect(reloadedPanel).toContainText("Completed");
  await expect(reloadedPanel).toContainText("Perfect score on the latest run.");
});
