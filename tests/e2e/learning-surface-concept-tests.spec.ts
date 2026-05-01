import { expect, test, type Page } from "@playwright/test";
import { getConceptBySlug } from "@/lib/content";
import { buildConceptQuizSession } from "@/lib/quiz";
import {
  gotoAndExpectOk,
  installBrowserGuards,
  seedLocalProgressSnapshot,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

let browserGuard: BrowserGuard;

async function answerQuestion(page: Page, choiceId: string) {
  await page.getByTestId(`quiz-choice-${choiceId}`).click();
}

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
  await setHarnessSession(page, "signed-out");
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("home continue-learning surface keeps concept review primary and opens the standalone concept test as a secondary CTA", async ({
  page,
}) => {
  await seedLocalProgressSnapshot(page, {
    version: 1,
    concepts: {
      "vectors-components": {
        conceptId: "concept-vectors-components",
        slug: "vectors-components",
        firstVisitedAt: "2026-04-18T08:00:00.000Z",
        lastVisitedAt: "2026-04-18T08:05:00.000Z",
      },
    },
    topicTests: {},
    packTests: {},
  });

  await gotoAndExpectOk(page, "/");
  await expect(page.getByRole("heading", { name: /resume saved work or take the next bounded step/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /resume concept|continue concept/i })).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?concepts\/vectors-components$/,
  );

  const testCta = page.getByTestId("home-primary-test-cta-vectors-components");
  await expect(testCta).toHaveText("Take test");
  await testCta.click();

  await expect(page).toHaveURL(/\/(?:[a-zA-Z-]+\/)?tests\/concepts\/vectors-components$/);
  await expect(page.getByTestId("standalone-concept-test-page")).toBeVisible();
});

test("starter-track concept steps expose Resume test and restore exact state on the standalone concept-test route", async ({
  page,
}) => {
  const concept = getConceptBySlug("simple-harmonic-motion");
  const session = buildConceptQuizSession(concept, {
    seed: `${concept.slug}:en:quiz-attempt:1`,
    locale: "en",
  });
  const wrongChoice = session.questions[0]!.choices.find(
    (choice) => choice.id !== session.questions[0]!.correctChoiceId,
  )!;

  await gotoAndExpectOk(page, "/concepts/simple-harmonic-motion#quick-test");
  await expect(page.getByTestId("quiz-question-stage")).toBeVisible();
  await answerQuestion(page, wrongChoice.id);

  await gotoAndExpectOk(page, "/tracks/oscillations-and-energy");
  await expect(
    page.getByRole("heading", { name: /oscillations and energy/i, level: 1 }),
  ).toBeVisible();
  await expect(page.getByTestId("track-primary-cta")).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?concepts\/simple-harmonic-motion$/,
  );

  const testCta = page.getByTestId("starter-track-test-cta-simple-harmonic-motion");
  await expect(testCta).toHaveText("Resume test");
  await expect(testCta).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?tests\/concepts\/simple-harmonic-motion$/,
  );
  await Promise.all([
    page.waitForURL(/\/(?:[a-zA-Z-]+\/)?tests\/concepts\/simple-harmonic-motion$/),
    testCta.click(),
  ]);

  await expect(page.getByTestId("standalone-concept-test-page")).toBeVisible();
  await expect(page.getByTestId(`quiz-choice-${wrongChoice.id}`)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
