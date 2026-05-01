import { expect, test } from "@playwright/test";
import { getConceptBySlug } from "@/lib/content";
import { buildConceptQuizSession } from "@/lib/quiz";
import { gotoAndExpectOk, installBrowserGuards, setHarnessSession, type BrowserGuard } from "./helpers";

let browserGuard: BrowserGuard;

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
  await setHarnessSession(page, "signed-out");
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("keeps retry flow bounded to missed quiz questions on a real concept page", async ({
  page,
}) => {
  const concept = getConceptBySlug("basic-circuits");
  const session = buildConceptQuizSession(concept, {
    seed: `${concept.slug}:en:quiz-attempt:1`,
    locale: "en",
  });
  const firstQuestion = session.questions[0]!;
  const wrongChoice = firstQuestion.choices.find(
    (choice) => choice.id !== firstQuestion.correctChoiceId,
  )!;

  await gotoAndExpectOk(page, "/concepts/basic-circuits#quick-test");
  await expect(
    page.getByRole("heading", { name: concept.title, level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Question 1 of 5")).toBeVisible();

  await page.getByRole("button", { name: wrongChoice.label }).click();
  await page.getByRole("button", { name: "Next question" }).click();

  for (let index = 1; index < session.questions.length; index += 1) {
    const question = session.questions[index]!;
    const correctChoice = question.choices.find(
      (choice) => choice.id === question.correctChoiceId,
    )!;

    await page.getByRole("button", { name: correctChoice.label }).click();
    await page
      .getByRole("button", {
        name: index === session.questions.length - 1 ? "Finish round" : "Next question",
      })
      .click();
  }

  await expect(page.getByRole("heading", { name: "Try Again" })).toBeVisible();
  await page.getByRole("button", { name: "Try Again" }).click();

  await expect(page.getByText("Question 1 of 1")).toBeVisible();
  const quizStage = page.getByTestId("quiz-question-stage");
  await expect(quizStage).toContainText(firstQuestion.prompt);
  await expect(quizStage).not.toContainText(concept.quickTest.questions[1]!.prompt);

  const correctRetryChoice = firstQuestion.choices.find(
    (choice) => choice.id === firstQuestion.correctChoiceId,
  )!;
  await page.getByRole("button", { name: correctRetryChoice.label }).click();
  await page.getByRole("button", { name: "Finish round" }).click();

  await expect(page.getByRole("heading", { name: "Completed." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Test Hub" })).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?tests$/,
  );
  await expect(page.getByRole("link", { name: "Review concept" })).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?concepts\/basic-circuits#interactive-lab$/,
  );
  await expect(page.getByRole("link", { name: "Next test" })).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?tests\/concepts\/power-energy-circuits$/,
  );
});
