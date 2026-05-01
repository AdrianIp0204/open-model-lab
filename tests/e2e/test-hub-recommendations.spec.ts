import { expect, test, type Page } from "@playwright/test";
import { getConceptBySlug } from "@/lib/content";
import { buildConceptQuizSession } from "@/lib/quiz";
import {
  expandFullTestCatalogIfAvailable,
  gotoAndExpectOk,
  installBrowserGuards,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

type AssessmentSessionLike = {
  questions: Array<{
    choices: Array<{ id: string }>;
    correctChoiceId: string;
  }>;
};

let browserGuard: BrowserGuard;

async function seedLocalSnapshot(page: Page, snapshot: unknown) {
  await page.addInitScript((value) => {
    window.localStorage.setItem("physica.local-progress.v1", JSON.stringify(value));
  }, snapshot);
}

async function waitForHubSummaryReady(page: Page, timeout = 15000) {
  await expect(page.getByTestId("test-hub-completed-count")).not.toHaveText("\u2014", { timeout });
  await expect(page.getByTestId("test-hub-clean-count")).not.toHaveText("\u2014", { timeout });
  await expect(page.getByTestId("test-hub-remaining-count")).not.toHaveText("\u2014", { timeout });
  await expandFullTestCatalogIfAvailable(page);
}

async function completeAssessmentWithSingleRetry(
  page: Page,
  session: AssessmentSessionLike,
  missQuestionIndex = 0,
) {
  const missedQuestion = session.questions[missQuestionIndex]!;
  const wrongChoice = missedQuestion.choices.find(
    (choice) => choice.id !== missedQuestion.correctChoiceId,
  )!;

  for (let index = 0; index < session.questions.length; index += 1) {
    const question = session.questions[index]!;
    const choiceId =
      index === missQuestionIndex
        ? wrongChoice.id
        : question.correctChoiceId;

    await page.getByTestId(`quiz-choice-${choiceId}`).click();
    await page
      .getByRole("button", {
        name: index === session.questions.length - 1 ? "Finish round" : "Next question",
      })
      .click();
  }

  await expect(page.getByRole("heading", { name: "Try Again" })).toBeVisible();
  await page.getByRole("button", { name: "Try Again" }).click();
  await page.getByTestId(`quiz-choice-${missedQuestion.correctChoiceId}`).click();
  await page.getByRole("button", { name: "Finish round" }).click();
}

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
  await setHarnessSession(page, "signed-out");
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("recent concept study changes the suggested tests on /tests", async ({ page }) => {
  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);
  await expect(
    page.getByTestId("test-hub-suggestion-concept-basic-circuits"),
  ).toHaveCount(0);

  await gotoAndExpectOk(page, "/concepts/basic-circuits");
  await expect(
    page.getByRole("heading", { name: "Basic Circuits", level: 1 }),
  ).toBeVisible();
  await page.waitForFunction(() => {
    const raw = window.localStorage.getItem("physica.local-progress.v1");

    if (!raw) {
      return false;
    }

    try {
      const snapshot = JSON.parse(raw);
      return Boolean(snapshot?.concepts?.["basic-circuits"]?.lastVisitedAt);
    } catch {
      return false;
    }
  });

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page, 20000);

  const suggestionCard = page.getByTestId("test-hub-suggestion-concept-basic-circuits");
  await expect(suggestionCard).toBeVisible();
  await expect(suggestionCard).toContainText("Based on concepts you studied recently");
  await expect(
    suggestionCard.getByRole("link", { name: "Start concept test" }),
  ).toHaveAttribute("href", /\/(?:[a-zA-Z-]+\/)?tests\/concepts\/basic-circuits$/);
});

test("recent test activity with an exact concept session surfaces a resume suggestion on /tests", async ({ page }) => {
  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);
  await expect(
    page.getByTestId("test-hub-suggestion-concept-basic-circuits"),
  ).toHaveCount(0);

  await gotoAndExpectOk(page, "/concepts/basic-circuits?phase=check#quick-test");
  await expect(
    page.getByRole("heading", { name: "Basic Circuits", level: 1 }),
  ).toBeVisible();
  await page.locator('[data-testid^="quiz-choice-"]').first().click();

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);

  const suggestionCard = page.getByTestId("test-hub-suggestion-concept-basic-circuits");
  await expect(suggestionCard).toBeVisible();
  await expect(suggestionCard).toContainText("Continue your in-progress test");
  await expect(
    suggestionCard.getByRole("link", { name: "Resume concept test" }),
  ).toHaveAttribute("href", /\/(?:[a-zA-Z-]+\/)?tests\/concepts\/basic-circuits$/);
});

test("started topic test with an exact session surfaces a resume suggestion on /tests", async ({ page }) => {
  await gotoAndExpectOk(page, "/tests/topics/oscillations");
  await page.locator('[data-testid^="quiz-choice-"]').first().click();

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);

  const suggestionCard = page.getByTestId("test-hub-suggestion-topic-oscillations");
  await expect(suggestionCard).toBeVisible();
  await expect(suggestionCard).toContainText("Continue your in-progress test");
  const suggestionLink = suggestionCard.getByRole("link", { name: "Resume topic test" });
  await expect(suggestionLink).toHaveAttribute("href", /\/(?:[a-zA-Z-]+\/)?tests\/topics\/oscillations$/);

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForHubSummaryReady(page);
  await expect(page.getByTestId("test-hub-suggestion-topic-oscillations")).toContainText(
    "Continue your in-progress test",
  );

  const reloadedSuggestionLink = page
    .getByTestId("test-hub-suggestion-topic-oscillations")
    .getByRole("link", { name: "Resume topic test" });
  await expect(reloadedSuggestionLink).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?tests\/topics\/oscillations$/,
  );
});

test("started pack with an exact session surfaces a resume suggestion on /tests", async ({ page }) => {
  await gotoAndExpectOk(page, "/tests/packs/physics-connected-models");
  await page.locator('[data-testid^="quiz-choice-"]').first().click();

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);

  const suggestionCard = page.getByTestId("test-hub-suggestion-pack-physics-connected-models");
  await expect(suggestionCard).toBeVisible();
  await expect(suggestionCard).toContainText("Continue your in-progress test");
  const suggestionLink = suggestionCard.getByRole("link", { name: "Resume pack" });
  await expect(suggestionLink).toHaveAttribute("href", /\/(?:[a-zA-Z-]+\/)?tests\/packs\/physics-connected-models$/);

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForHubSummaryReady(page);
  await expect(page.getByTestId("test-hub-suggestion-pack-physics-connected-models")).toContainText(
    "Continue your in-progress test",
  );

  const reloadedSuggestionLink = page
    .getByTestId("test-hub-suggestion-pack-physics-connected-models")
    .getByRole("link", { name: "Resume pack" });
  await expect(reloadedSuggestionLink).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?tests\/packs\/physics-connected-models$/,
  );
});

test("guided test tracks advance after completing the current next assessment", async ({
  page,
}) => {
  const concept = getConceptBySlug("vectors-components");
  const session = buildConceptQuizSession(concept, {
    seed: `${concept.slug}:en:quiz-attempt:1`,
    locale: "en",
  });

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);

  const trackCard = page.getByTestId("test-hub-guided-track-mechanics");
  const nextAction = trackCard.getByTestId("test-hub-guided-track-next-mechanics");
  await expect(nextAction).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?tests\/concepts\/vectors-components$/,
  );

  const nextHref = await nextAction.getAttribute("href");
  if (!nextHref) {
    throw new Error("Guided track next action did not expose an href.");
  }
  await gotoAndExpectOk(page, nextHref);
  await expect(page).toHaveURL(/\/(?:[a-zA-Z-]+\/)?tests\/concepts\/vectors-components$/);
  await completeAssessmentWithSingleRetry(page, session, 0);
  await page.getByTestId("quiz-completion").getByRole("link", { name: "Back to Test Hub" }).click();
  await expect(page).toHaveURL(/\/tests$/);
  await waitForHubSummaryReady(page);

  await expect(
    page.getByTestId("test-hub-guided-track-next-mechanics"),
  ).toHaveAttribute("href", /\/(?:[a-zA-Z-]+\/)?tests\/concepts\/projectile-motion$/);
});

test("fully completed guided tracks render completed state on /tests", async ({ page }) => {
  await seedLocalSnapshot(page, {
    version: 1,
    concepts: {
      "vectors-components": {
        conceptId: "vectors-components",
        slug: "vectors-components",
        completedQuickTestAt: "2026-04-18T08:05:00.000Z",
        quickTestAttemptCount: 1,
        quickTestLastIncorrectCount: 0,
      },
      "projectile-motion": {
        conceptId: "projectile-motion",
        slug: "projectile-motion",
        completedQuickTestAt: "2026-04-18T08:10:00.000Z",
        quickTestAttemptCount: 1,
        quickTestLastIncorrectCount: 0,
      },
      "uniform-circular-motion": {
        conceptId: "uniform-circular-motion",
        slug: "uniform-circular-motion",
        completedQuickTestAt: "2026-04-18T08:15:00.000Z",
        quickTestAttemptCount: 1,
        quickTestLastIncorrectCount: 0,
      },
      torque: {
        conceptId: "torque",
        slug: "torque",
        completedQuickTestAt: "2026-04-18T08:16:00.000Z",
        quickTestAttemptCount: 1,
        quickTestLastIncorrectCount: 0,
      },
      "static-equilibrium-centre-of-mass": {
        conceptId: "static-equilibrium-centre-of-mass",
        slug: "static-equilibrium-centre-of-mass",
        completedQuickTestAt: "2026-04-18T08:17:00.000Z",
        quickTestAttemptCount: 1,
        quickTestLastIncorrectCount: 0,
      },
      "rotational-inertia": {
        conceptId: "rotational-inertia",
        slug: "rotational-inertia",
        completedQuickTestAt: "2026-04-18T08:18:00.000Z",
        quickTestAttemptCount: 1,
        quickTestLastIncorrectCount: 0,
      },
      "rolling-motion": {
        conceptId: "rolling-motion",
        slug: "rolling-motion",
        completedQuickTestAt: "2026-04-18T08:19:00.000Z",
        quickTestAttemptCount: 1,
        quickTestLastIncorrectCount: 0,
      },
      "angular-momentum": {
        conceptId: "angular-momentum",
        slug: "angular-momentum",
        completedQuickTestAt: "2026-04-18T08:20:00.000Z",
        quickTestAttemptCount: 1,
        quickTestLastIncorrectCount: 0,
      },
      "momentum-impulse": {
        conceptId: "momentum-impulse",
        slug: "momentum-impulse",
        completedQuickTestAt: "2026-04-18T08:21:00.000Z",
        quickTestAttemptCount: 1,
        quickTestLastIncorrectCount: 0,
      },
      "conservation-of-momentum": {
        conceptId: "conservation-of-momentum",
        slug: "conservation-of-momentum",
        completedQuickTestAt: "2026-04-18T08:22:00.000Z",
        quickTestAttemptCount: 1,
        quickTestLastIncorrectCount: 0,
      },
      collisions: {
        conceptId: "collisions",
        slug: "collisions",
        completedQuickTestAt: "2026-04-18T08:23:00.000Z",
        quickTestAttemptCount: 1,
        quickTestLastIncorrectCount: 0,
      },
    },
    topicTests: {
      mechanics: {
        slug: "mechanics",
        completedAt: "2026-04-18T08:24:00.000Z",
        attemptCount: 1,
        lastIncorrectCount: 0,
        lastQuestionCount: 10,
      },
    },
    packTests: {
      "physics-connected-models": {
        slug: "physics-connected-models",
        completedAt: "2026-04-18T08:25:00.000Z",
        attemptCount: 1,
        lastIncorrectCount: 0,
        lastQuestionCount: 16,
      },
    },
  });

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);

  const trackCard = page.getByTestId("test-hub-guided-track-mechanics");
  await expect(trackCard).toContainText("Completed");
  await expect(trackCard).toContainText("Every published step in this testing path has been cleared.");
  const trackLink = trackCard.getByTestId("test-hub-guided-track-next-mechanics");
  await expect(trackLink).toHaveAttribute("href", /\/(?:[a-zA-Z-]+\/)?concepts\/topics\/mechanics$/);
  await expect(trackLink).toContainText("Open topic");

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForHubSummaryReady(page);
  await expect(page.getByTestId("test-hub-guided-track-mechanics")).toContainText(
    "Every published step in this testing path has been cleared.",
  );
});

test("nearby topic progress renders the current visible rule label", async ({
  page,
}) => {
  await seedLocalSnapshot(page, {
    version: 1,
    concepts: {
      "simple-harmonic-motion": {
        conceptId: "simple-harmonic-motion",
        slug: "simple-harmonic-motion",
        completedQuickTestAt: "2026-04-18T08:05:00.000Z",
        quickTestAttemptCount: 1,
        quickTestLastIncorrectCount: 0,
      },
      "oscillation-energy": {
        conceptId: "oscillation-energy",
        slug: "oscillation-energy",
        completedQuickTestAt: "2026-04-18T08:10:00.000Z",
        quickTestAttemptCount: 1,
        quickTestLastIncorrectCount: 0,
      },
      "damping-resonance": {
        conceptId: "damping-resonance",
        slug: "damping-resonance",
        completedQuickTestAt: "2026-04-18T08:15:00.000Z",
        quickTestAttemptCount: 1,
        quickTestLastIncorrectCount: 0,
      },
    },
    topicTests: {},
    packTests: {},
  });

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);

  const conceptSuggestion = page.getByTestId("test-hub-suggestion-concept-projectile-motion");
  await expect(conceptSuggestion).toBeVisible();
  await expect(conceptSuggestion).toContainText("Related to Damping / Resonance");
});

test("topic completion surfaces the pack follow-on suggestion with the correct rule label", async ({
  page,
}) => {
  await seedLocalSnapshot(page, {
    version: 1,
    concepts: {},
    topicTests: {
      oscillations: {
        slug: "oscillations",
        completedAt: "2026-04-18T08:15:00.000Z",
        attemptCount: 1,
        lastIncorrectCount: 0,
        lastQuestionCount: 10,
      },
    },
    packTests: {},
  });

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);

  const packSuggestion = page.getByTestId("test-hub-suggestion-pack-physics-connected-models");
  await expect(packSuggestion).toBeVisible();
  await expect(packSuggestion).toContainText("Next after Oscillations milestone");
});

test("search mode suppresses personalized and guided sections while leaving discovery active", async ({
  page,
}) => {
  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);
  await expect(page.getByRole("heading", { name: "Suggested tests" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Guided testing tracks" })).toBeVisible();

  await page.getByRole("textbox", { name: "Search tests" }).fill("sorting");

  await expect(page.getByRole("heading", { name: "Suggested tests" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Guided testing tracks" })).toHaveCount(0);
  await expect(
    page.getByTestId("test-hub-card-concept-sorting-and-algorithmic-trade-offs"),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Concept tests" })).toBeVisible();
});
