import { expect, test, type Page } from "@playwright/test";
import { getConceptBySlug } from "@/lib/content";
import { buildConceptQuizSession } from "@/lib/quiz";
import { getPublishedConceptTestCatalog } from "@/lib/test-hub";
import {
  expandFullTestCatalogIfAvailable,
  gotoAndExpectOk,
  installBrowserGuards,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

let browserGuard: BrowserGuard;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function promptLead(prompt: string) {
  return prompt.split("\n")[0] ?? prompt;
}

async function answerQuestion(page: Page, choiceId: string) {
  await page.getByTestId(`quiz-choice-${choiceId}`).click();
}

async function completeAssessmentCleanly(
  page: Page,
  session: ReturnType<typeof buildConceptQuizSession>,
) {
  for (let index = 0; index < session.questions.length; index += 1) {
    const question = session.questions[index]!;
    await answerQuestion(page, question.correctChoiceId);
    await page
      .getByRole("button", {
        name: index === session.questions.length - 1 ? /finish round/i : /next question/i,
      })
      .click();
  }
}

async function advanceThroughQuestions(
  page: Page,
  session: ReturnType<typeof buildConceptQuizSession>,
  targetIndex: number,
) {
  for (let index = 0; index < targetIndex; index += 1) {
    const question = session.questions[index]!;
    await answerQuestion(page, question.correctChoiceId);
    await page.getByRole("button", { name: /next question/i }).click();
  }
}

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
  await setHarnessSession(page, "signed-out");
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("restores a standalone-started concept test on the inline concept-page quick test", async ({
  page,
}) => {
  const concept = getConceptBySlug("escape-velocity");
  const entry = getPublishedConceptTestCatalog().entries.find(
    (candidate) => candidate.conceptSlug === concept.slug,
  )!;
  const session = buildConceptQuizSession(concept, {
    seed: `${concept.slug}:en:quiz-attempt:1`,
    locale: "en",
  });
  const generatedIndex = session.questions.findIndex((question) => question.kind === "generated");
  const targetIndex = generatedIndex >= 0 ? generatedIndex : 0;
  const targetQuestion = session.questions[targetIndex]!;
  const wrongChoice = targetQuestion.choices.find(
    (choice) => choice.id !== targetQuestion.correctChoiceId,
  )!;

  await gotoAndExpectOk(page, entry.testHref);
  await expect(page.getByTestId("standalone-concept-test-page")).toBeVisible();
  await advanceThroughQuestions(page, session, targetIndex);
  await answerQuestion(page, wrongChoice.id);

  await gotoAndExpectOk(page, `/concepts/${concept.slug}#quick-test`);
  await expect(page.getByTestId("quiz-question-stage")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: new RegExp(escapeRegExp(promptLead(targetQuestion.prompt)), "i"),
    }),
  ).toBeVisible();
  await expect(page.getByTestId(`quiz-choice-${wrongChoice.id}`)).toHaveAttribute("aria-pressed", "true");
});

test("restores an inline concept-page quick test on the standalone concept-test page", async ({
  page,
}) => {
  const concept = getConceptBySlug("escape-velocity");
  const entry = getPublishedConceptTestCatalog().entries.find(
    (candidate) => candidate.conceptSlug === concept.slug,
  )!;
  const session = buildConceptQuizSession(concept, {
    seed: `${concept.slug}:en:quiz-attempt:1`,
    locale: "en",
  });
  const generatedIndex = session.questions.findIndex((question) => question.kind === "generated");
  const targetIndex = generatedIndex >= 0 ? generatedIndex : 0;
  const targetQuestion = session.questions[targetIndex]!;
  const wrongChoice = targetQuestion.choices.find(
    (choice) => choice.id !== targetQuestion.correctChoiceId,
  )!;

  await gotoAndExpectOk(page, `/concepts/${concept.slug}#quick-test`);
  await expect(page.getByTestId("quiz-question-stage")).toBeVisible();
  await advanceThroughQuestions(page, session, targetIndex);
  await answerQuestion(page, wrongChoice.id);

  await gotoAndExpectOk(page, entry.testHref);
  await expect(page.getByTestId("standalone-concept-test-page")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: new RegExp(escapeRegExp(promptLead(targetQuestion.prompt)), "i"),
    }),
  ).toBeVisible();
  await expect(page.getByTestId(`quiz-choice-${wrongChoice.id}`)).toHaveAttribute("aria-pressed", "true");
});

test("shares completed concept-test state between the inline and standalone surfaces", async ({
  page,
}) => {
  const concept = getConceptBySlug("basic-circuits");
  const entry = getPublishedConceptTestCatalog().entries.find(
    (candidate) => candidate.conceptSlug === concept.slug,
  )!;
  const session = buildConceptQuizSession(concept, {
    seed: `${concept.slug}:en:quiz-attempt:1`,
    locale: "en",
  });

  await gotoAndExpectOk(page, `/concepts/${concept.slug}#quick-test`);
  await expect(page.getByTestId("quiz-question-stage")).toBeVisible();

  for (let index = 0; index < session.questions.length; index += 1) {
    const question = session.questions[index]!;
    await answerQuestion(page, question.correctChoiceId);
    await page
      .getByRole("button", {
        name: index === session.questions.length - 1 ? /finish round/i : /next question/i,
      })
      .click();
  }

  await expect(page.getByTestId("quiz-completion")).toBeVisible();

  await gotoAndExpectOk(page, entry.testHref);
  await expect(page.getByTestId("standalone-concept-test-page")).toBeVisible();
  await expect(page.getByTestId("concept-test-status-panel")).toContainText("Completed");
  await expect(page.getByTestId("concept-test-status-panel")).toContainText("Perfect score on the latest run.");
  await expect(
    page.getByRole("link", { name: "Review concept" }),
  ).toHaveAttribute("href", new RegExp(`/(?:[a-zA-Z-]+/)?concepts/${concept.slug}#interactive-lab$`));
});

test("opens the locale-wrapped standalone concept-test route from /zh-HK/tests", async ({
  page,
}) => {
  await gotoAndExpectOk(page, "/zh-HK/tests");
  await expect(page.getByText("測驗中心").first()).toBeVisible();

  await expandFullTestCatalogIfAvailable(page);

  const conceptCard = page.getByTestId("test-hub-card-concept-basic-circuits");
  await Promise.all([
    page.waitForURL(/\/zh-HK\/tests\/concepts\/basic-circuits$/, { timeout: 15_000 }),
    conceptCard.getByRole("link", { name: "開始概念測驗" }).click(),
  ]);

  await expect(page).toHaveURL(/\/zh-HK\/tests\/concepts\/basic-circuits$/);
  await expect(page.getByTestId("standalone-concept-test-page")).toBeVisible();
  await expect(page.getByRole("link", { name: "回看概念" })).toHaveAttribute(
    "href",
    "/zh-HK/concepts/basic-circuits#interactive-lab",
  );
  await expect(page.getByRole("link", { name: "返回測驗中心" })).toHaveAttribute(
    "href",
    "/zh-HK/tests",
  );

  await page.locator('[data-testid^="quiz-choice-"]').first().click();
  await expect(page.getByTestId("quiz-question-stage")).toBeVisible();
});

test("renders SHM generated givens with readable symbols on the standalone route", async ({
  page,
}) => {
  const concept = getConceptBySlug("simple-harmonic-motion");
  const session = buildConceptQuizSession(concept, {
    seed: `${concept.slug}:en:quiz-attempt:1`,
    locale: "en",
  });
  const generatedIndex = session.questions.findIndex(
    (question) =>
      question.kind === "generated" &&
      (question.givens?.some(
        (given) => given.symbol?.includes("ω") || given.symbol?.includes("φ"),
      ) ?? false),
  );

  if (generatedIndex === -1) {
    throw new Error("Expected SHM generated question with omega/phi givens.");
  }

  await gotoAndExpectOk(page, "/en/tests/concepts/simple-harmonic-motion");
  await expect(page.getByTestId("standalone-concept-test-page")).toBeVisible();
  await advanceThroughQuestions(page, session, generatedIndex);

  const stageText = (await page.getByTestId("quiz-question-stage").textContent()) ?? "";
  expect(stageText).toMatch(/[ωϕφ]/u);
  expect(stageText.includes("\\omega")).toBe(false);
  expect(stageText.includes("\\phi")).toBe(false);
});

test("shows multiple next-step options after a clean standalone concept-test completion", async ({
  page,
}) => {
  const concept = getConceptBySlug("basic-circuits");
  const entry = getPublishedConceptTestCatalog().entries.find(
    (candidate) => candidate.conceptSlug === concept.slug,
  )!;
  const session = buildConceptQuizSession(concept, {
    seed: `${concept.slug}:en:quiz-attempt:1`,
    locale: "en",
  });

  await gotoAndExpectOk(page, entry.testHref);
  await expect(page.getByTestId("standalone-concept-test-page")).toBeVisible();
  await completeAssessmentCleanly(page, session);

  const followUp = page.getByTestId("quiz-completion-follow-up");
  await expect(followUp).toBeVisible();
  await expect(followUp).toContainText("What next");
  await expect(followUp.getByRole("link", { name: /^Next test$/i })).toBeVisible();
  await expect(followUp.getByRole("link", { name: "Review concept" })).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?concepts\/basic-circuits#interactive-lab$/,
  );
  await expect(followUp.getByRole("link", { name: "Back to Test Hub" })).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?tests$/,
  );
});

test("keeps Try Again primary while still showing next-step options on the standalone route", async ({
  page,
}) => {
  const concept = getConceptBySlug("basic-circuits");
  const entry = getPublishedConceptTestCatalog().entries.find(
    (candidate) => candidate.conceptSlug === concept.slug,
  )!;
  const session = buildConceptQuizSession(concept, {
    seed: `${concept.slug}:en:quiz-attempt:1`,
    locale: "en",
  });
  const firstQuestion = session.questions[0]!;
  const wrongChoice = firstQuestion.choices.find(
    (choice) => choice.id !== firstQuestion.correctChoiceId,
  )!;

  await gotoAndExpectOk(page, entry.testHref);
  await expect(page.getByTestId("standalone-concept-test-page")).toBeVisible();

  await answerQuestion(page, wrongChoice.id);
  await page.getByRole("button", { name: /next question/i }).click();

  for (let index = 1; index < session.questions.length; index += 1) {
    const question = session.questions[index]!;
    await answerQuestion(page, question.correctChoiceId);
    await page
      .getByRole("button", {
        name: index === session.questions.length - 1 ? /finish round/i : /next question/i,
      })
      .click();
  }

  await expect(page.getByRole("button", { name: /^Try Again$/i })).toBeVisible();
  const followUp = page.getByTestId("quiz-round-summary-follow-up");
  await expect(followUp).toBeVisible();
  await expect(followUp).toContainText("What next");
  await expect(followUp.getByRole("link", { name: /^Next test$/i })).toBeVisible();
  await expect(followUp.getByRole("link", { name: "Review concept" })).toBeVisible();
  await expect(followUp.getByRole("link", { name: "Back to Test Hub" })).toBeVisible();
});
