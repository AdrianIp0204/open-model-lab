import { expect, test, type Page } from "@playwright/test";
import {
  ASSESSMENT_SESSION_STORAGE_KEY,
  ASSESSMENT_SESSION_STORAGE_VERSION,
  buildAssessmentSessionStorageEntryKey,
  buildConceptAssessmentSessionDescriptor,
  buildPackAssessmentSessionDescriptor,
  buildTopicAssessmentSessionDescriptor,
  getPersistedAssessmentSessionMatch,
  normalizeAssessmentSessionStoreSnapshot,
} from "@/lib/assessment-sessions";
import { getConceptBySlug } from "@/lib/content";
import { PROGRESS_STORAGE_KEY } from "@/lib/progress";
import { buildConceptQuizSession } from "@/lib/quiz";
import {
  buildPackTestSession,
  buildTopicTestSession,
  getPublishedPackTestCatalog,
  getPublishedTopicTestCatalog,
} from "@/lib/test-hub";
import {
  expandFullTestCatalogIfAvailable,
  gotoAndExpectOk,
  installBrowserGuards,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

type AssessmentSessionLike = {
  questions: Array<{
    instanceId: string;
    kind?: string;
    givens?: Array<{ label: string; value: string }>;
    choices: Array<{ id: string; label: string }>;
    correctChoiceId: string;
  }>;
};

let browserGuard: BrowserGuard;

test.describe.configure({ timeout: 120000 });

function normalizeText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

async function waitForHubSummaryReady(page: Page) {
  await expect(page.getByTestId("test-hub-completed-count")).not.toHaveText("\u2014");
  await expect(page.getByTestId("test-hub-clean-count")).not.toHaveText("\u2014");
  await expect(page.getByTestId("test-hub-remaining-count")).not.toHaveText("\u2014");
  await expandFullTestCatalogIfAvailable(page);
}

async function startAssessmentFromHub(
  page: Page,
  cardTestId: string,
  actionLabel: string,
  expectedUrl: RegExp,
) {
  await expandFullTestCatalogIfAvailable(page);
  const card = page.getByTestId(cardTestId);
  const link = card.getByRole("link", { name: actionLabel });
  await expect(card).toBeVisible();
  await Promise.all([page.waitForURL(expectedUrl), link.click()]);
}

async function answerQuestion(page: Page, choiceId: string) {
  await page.getByTestId(`quiz-choice-${choiceId}`).click();
}

async function advanceThroughQuestions(
  page: Page,
  session: AssessmentSessionLike,
  targetIndex: number,
) {
  for (let index = 0; index < targetIndex; index += 1) {
    const question = session.questions[index]!;
    await answerQuestion(page, question.correctChoiceId);
    await page.getByRole("button", { name: /next question/i }).click();
  }
}

async function captureQuestionStageText(page: Page) {
  return normalizeText(await page.getByTestId("quiz-question-stage").textContent());
}

async function expectQuestionStageForSessionQuestion(
  page: Page,
  session: AssessmentSessionLike,
  index: number,
  expectedSelectedChoiceId: string,
) {
  const question = session.questions[index]!;
  const stage = page.getByTestId("quiz-question-stage");
  await expect(stage).toBeVisible();
  const selectedChoice = page.getByTestId(`quiz-choice-${expectedSelectedChoiceId}`);
  await expect(selectedChoice).toHaveAttribute("aria-pressed", "true");

  for (const given of question.givens ?? []) {
    await expect(stage.getByText(given.label, { exact: true })).toBeVisible();
    await expect(
      stage
        .getByText(new RegExp(given.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
        .first(),
    ).toBeVisible();
  }
}

async function finishAssessmentFromAnsweredQuestion(
  page: Page,
  session: AssessmentSessionLike,
  answeredQuestionIndex: number,
) {
  await page
    .getByRole("button", {
      name:
        answeredQuestionIndex === session.questions.length - 1
          ? /finish round/i
          : /next question/i,
    })
    .click();

  for (let index = answeredQuestionIndex + 1; index < session.questions.length; index += 1) {
    const question = session.questions[index]!;
    await answerQuestion(page, question.correctChoiceId);
    await page
      .getByRole("button", {
        name: index === session.questions.length - 1 ? /finish round/i : /next question/i,
      })
      .click();
  }

  await expect(page.getByRole("heading", { name: "Try Again" })).toBeVisible();
  await page.getByRole("button", { name: "Try Again" }).click();
  const retryQuestion = session.questions[answeredQuestionIndex]!;
  await answerQuestion(page, retryQuestion.correctChoiceId);
  await page.getByRole("button", { name: /finish round/i }).click();
}

function findQuestionIndexForResume(session: AssessmentSessionLike) {
  const generatedIndex = session.questions.findIndex(
    (question) => question.kind === "generated" && (question.givens?.length ?? 0) > 0,
  );

  if (generatedIndex >= 0) {
    return generatedIndex;
  }

  return 0;
}

async function seedLocalStorage(page: Page, input: Record<string, unknown>) {
  await page.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  }, input);
}

async function expectPersistedSessionRecord(page: Page, storageKey: string) {
  await expect
    .poll(async () => {
      const raw = await page.evaluate((key) => window.localStorage.getItem(key), ASSESSMENT_SESSION_STORAGE_KEY);
      if (!raw) {
        return false;
      }

      const parsed = JSON.parse(raw) as { sessions?: Record<string, unknown> };
      return Object.prototype.hasOwnProperty.call(parsed.sessions ?? {}, storageKey);
    })
    .toBe(true);
}

async function readPersistedSessionMatch(
  page: Page,
  descriptor: Parameters<typeof getPersistedAssessmentSessionMatch>[1],
) {
  const raw = await page.evaluate((key) => window.localStorage.getItem(key), ASSESSMENT_SESSION_STORAGE_KEY);
  const snapshot = normalizeAssessmentSessionStoreSnapshot(raw ? JSON.parse(raw) : null);
  return getPersistedAssessmentSessionMatch(snapshot, descriptor);
}

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
  await setHarnessSession(page, "signed-out");
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("resumes a concept test exactly from /tests and clears the resumable state after completion", async ({
  page,
}) => {
  const concept = getConceptBySlug("escape-velocity");
  const conceptDescriptor = buildConceptAssessmentSessionDescriptor(concept, "en");
  const conceptStorageKey = buildAssessmentSessionStorageEntryKey(conceptDescriptor);
  const session = buildConceptQuizSession(concept, {
    seed: `${concept.slug}:en:quiz-attempt:1`,
    locale: "en",
  });
  const targetIndex = findQuestionIndexForResume(session);
  const targetQuestion = session.questions[targetIndex]!;
  const wrongChoice = targetQuestion.choices.find(
    (choice) => choice.id !== targetQuestion.correctChoiceId,
  )!;

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);

  await startAssessmentFromHub(
    page,
    "test-hub-card-concept-escape-velocity",
    "Start concept test",
    /\/(?:[a-zA-Z-]+\/)?tests\/concepts\/escape-velocity$/,
  );
  await expect(page.getByTestId("standalone-concept-test-page")).toBeVisible();
  await expect(page.getByTestId("quiz-question-stage")).toBeVisible();
  await advanceThroughQuestions(page, session, targetIndex);
  await answerQuestion(page, wrongChoice.id);
  await expectPersistedSessionRecord(page, conceptStorageKey);
  const stageSnapshot = await captureQuestionStageText(page);

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);
  await expectPersistedSessionRecord(page, conceptStorageKey);
  expect(await readPersistedSessionMatch(page, conceptDescriptor)).toMatchObject({
    status: "resume",
  });
  const suggestionCard = page.getByTestId("test-hub-suggestion-concept-escape-velocity");
  await expect(suggestionCard).toBeVisible();
  await expect(suggestionCard).toContainText("Continue your in-progress test");
  const resumeLink = suggestionCard.getByRole("link", { name: "Resume concept test" });
  await expect(resumeLink).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?tests\/concepts\/escape-velocity$/,
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForHubSummaryReady(page);
  await expect(page.getByTestId("test-hub-suggestion-concept-escape-velocity")).toContainText(
    "Resume concept test",
  );

  await Promise.all([
    page.waitForURL(/\/(?:[a-zA-Z-]+\/)?tests\/concepts\/escape-velocity$/),
    page
      .getByTestId("test-hub-suggestion-concept-escape-velocity")
      .getByRole("link", { name: "Resume concept test" })
      .click(),
  ]);

  await expectQuestionStageForSessionQuestion(
    page,
    session,
    targetIndex,
    wrongChoice.id,
  );
  expect(await captureQuestionStageText(page)).toBe(stageSnapshot);

  await finishAssessmentFromAnsweredQuestion(page, session, targetIndex);
  await expect(page.getByTestId("quiz-completion")).toBeVisible();
  await page
    .getByTestId("quiz-completion")
    .getByRole("link", { name: "Back to Test Hub" })
    .click({ force: true });
  await expect(page).toHaveURL(/\/(?:[a-zA-Z-]+\/)?tests$/);
  await waitForHubSummaryReady(page);
  await expect(
    page.getByTestId("test-hub-suggestion-concept-escape-velocity").getByRole("link", {
      name: "Resume concept test",
    }),
  ).toHaveCount(0);
  await expect(
    page.getByTestId("test-hub-card-concept-escape-velocity").getByRole("link", {
      name: "Retake concept test",
    }),
  ).toBeVisible();
});

test("resumes a topic test exactly from /tests and clears the resumable state after completion", async ({
  page,
}) => {
  const entry = getPublishedTopicTestCatalog().entries.find(
    (candidate) => candidate.topicSlug === "oscillations",
  )!;
  const topicDescriptor = buildTopicAssessmentSessionDescriptor(entry, "en");
  const topicStorageKey = buildAssessmentSessionStorageEntryKey(topicDescriptor);
  const session = buildTopicTestSession(entry.topicSlug, {
    locale: "en",
    seed: `topic-test:${entry.topicSlug}:en:quiz-attempt:1`,
  });
  const targetIndex = 0;
  const targetQuestion = session.questions[targetIndex]!;
  const wrongChoice = targetQuestion.choices.find(
    (choice) => choice.id !== targetQuestion.correctChoiceId,
  )!;

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);
  await startAssessmentFromHub(
    page,
    "test-hub-card-topic-oscillations",
    "Start topic test",
    /\/(?:[a-zA-Z-]+\/)?tests\/topics\/oscillations$/,
  );
  await answerQuestion(page, wrongChoice.id);
  await expectPersistedSessionRecord(page, topicStorageKey);
  const stageSnapshot = await captureQuestionStageText(page);

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);
  await expectPersistedSessionRecord(page, topicStorageKey);
  const suggestionCard = page.getByTestId("test-hub-suggestion-topic-oscillations");
  await expect(suggestionCard).toBeVisible();
  const resumeLink = suggestionCard.getByRole("link", { name: "Resume topic test" });
  await expect(resumeLink).toHaveAttribute("href", /\/(?:[a-zA-Z-]+\/)?tests\/topics\/oscillations$/);

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForHubSummaryReady(page);
  await Promise.all([
    page.waitForURL(/\/(?:[a-zA-Z-]+\/)?tests\/topics\/oscillations$/),
    page
      .getByTestId("test-hub-suggestion-topic-oscillations")
      .getByRole("link", { name: "Resume topic test" })
      .click(),
  ]);

  await expectQuestionStageForSessionQuestion(
    page,
    session,
    targetIndex,
    wrongChoice.id,
  );
  expect(await captureQuestionStageText(page)).toBe(stageSnapshot);

  await finishAssessmentFromAnsweredQuestion(page, session, targetIndex);
  await page.getByTestId("quiz-completion").getByRole("link", { name: "Back to Test Hub" }).click();
  await expect(page).toHaveURL(/\/(?:[a-zA-Z-]+\/)?tests$/);
  await waitForHubSummaryReady(page);
  await expect(
    page.getByTestId("test-hub-suggestion-topic-oscillations").getByRole("link", {
      name: "Resume topic test",
    }),
  ).toHaveCount(0);
  await expect(
    page.getByTestId("test-hub-card-topic-oscillations").getByRole("link", {
      name: "Retake topic test",
    }),
  ).toBeVisible();
});

test("resumes a pack exactly from /tests and clears the resumable state after completion", async ({
  page,
}) => {
  const entry = getPublishedPackTestCatalog().entries.find(
    (candidate) => candidate.packSlug === "physics-connected-models",
  )!;
  const packDescriptor = buildPackAssessmentSessionDescriptor(entry, "en");
  const packStorageKey = buildAssessmentSessionStorageEntryKey(packDescriptor);
  const session = buildPackTestSession(entry.packSlug, {
    locale: "en",
    seed: `pack-test:${entry.packSlug}:en:quiz-attempt:1`,
  });
  const targetIndex = 0;
  const targetQuestion = session.questions[targetIndex]!;
  const wrongChoice = targetQuestion.choices.find(
    (choice) => choice.id !== targetQuestion.correctChoiceId,
  )!;

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);
  await startAssessmentFromHub(
    page,
    "test-hub-card-pack-physics-connected-models",
    "Start pack",
    /\/(?:[a-zA-Z-]+\/)?tests\/packs\/physics-connected-models$/,
  );
  await answerQuestion(page, wrongChoice.id);
  await expectPersistedSessionRecord(page, packStorageKey);
  const stageSnapshot = await captureQuestionStageText(page);

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);
  await expectPersistedSessionRecord(page, packStorageKey);
  const suggestionCard = page.getByTestId("test-hub-suggestion-pack-physics-connected-models");
  await expect(suggestionCard).toBeVisible();
  const resumeLink = suggestionCard.getByRole("link", { name: "Resume pack" });
  await expect(resumeLink).toHaveAttribute("href", /\/(?:[a-zA-Z-]+\/)?tests\/packs\/physics-connected-models$/);

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForHubSummaryReady(page);
  await Promise.all([
    page.waitForURL(/\/(?:[a-zA-Z-]+\/)?tests\/packs\/physics-connected-models$/),
    page
      .getByTestId("test-hub-suggestion-pack-physics-connected-models")
      .getByRole("link", { name: "Resume pack" })
      .click(),
  ]);

  await expectQuestionStageForSessionQuestion(
    page,
    session,
    targetIndex,
    wrongChoice.id,
  );
  expect(await captureQuestionStageText(page)).toBe(stageSnapshot);

  await finishAssessmentFromAnsweredQuestion(page, session, targetIndex);
  await page.getByTestId("quiz-completion").getByRole("link", { name: "Back to Test Hub" }).click();
  await expect(page).toHaveURL(/\/(?:[a-zA-Z-]+\/)?tests$/);
  await waitForHubSummaryReady(page);
  await expect(
    page.getByTestId("test-hub-suggestion-pack-physics-connected-models").getByRole("link", {
      name: "Resume pack",
    }),
  ).toHaveCount(0);
  await expect(
    page.getByTestId("test-hub-card-pack-physics-connected-models").getByRole("link", {
      name: "Retake pack",
    }),
  ).toBeVisible();
});

test("restores a retry-round concept session exactly from /tests", async ({ page }) => {
  const concept = getConceptBySlug("basic-circuits");
  const conceptDescriptor = buildConceptAssessmentSessionDescriptor(concept, "en");
  const conceptStorageKey = buildAssessmentSessionStorageEntryKey(conceptDescriptor);
  const session = buildConceptQuizSession(concept, {
    seed: `${concept.slug}:en:quiz-attempt:1`,
    locale: "en",
  });
  const missedQuestion = session.questions[0]!;
  const wrongChoice = missedQuestion.choices.find(
    (choice) => choice.id !== missedQuestion.correctChoiceId,
  )!;

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);
  await startAssessmentFromHub(
    page,
    "test-hub-card-concept-basic-circuits",
    "Start concept test",
    /\/(?:[a-zA-Z-]+\/)?tests\/concepts\/basic-circuits$/,
  );

  await answerQuestion(page, wrongChoice.id);
  await expectPersistedSessionRecord(page, conceptStorageKey);
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

  await expect(page.getByRole("heading", { name: "Try Again" })).toBeVisible();
  await page.getByRole("button", { name: "Try Again" }).click();
  await answerQuestion(page, missedQuestion.correctChoiceId);
  await expectPersistedSessionRecord(page, conceptStorageKey);
  const retryStageSnapshot = await captureQuestionStageText(page);

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);
  await expectPersistedSessionRecord(page, conceptStorageKey);
  await expect(page.getByTestId("test-hub-suggestion-concept-basic-circuits")).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/(?:[a-zA-Z-]+\/)?tests\/concepts\/basic-circuits$/),
    page
      .getByTestId("test-hub-suggestion-concept-basic-circuits")
      .getByRole("link", { name: "Resume concept test" })
      .click(),
  ]);

  await expect(page.getByText("Try Again")).toBeVisible();
  await expect(page.getByText("Question 1 of 1")).toBeVisible();
  await expect(page.getByTestId(`quiz-choice-${missedQuestion.correctChoiceId}`)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(await captureQuestionStageText(page)).toBe(retryStageSnapshot);

  await page.getByRole("button", { name: /finish round/i }).click();
  await expect(page.getByTestId("quiz-completion")).toBeVisible();
});

test("falls back safely when an incompatible saved session exists and still uses the standalone concept-test route", async ({
  page,
}) => {
  const concept = getConceptBySlug("basic-circuits");
  const descriptor = buildConceptAssessmentSessionDescriptor(concept, "en");
  const validSession = buildConceptQuizSession(concept, {
    seed: `${concept.slug}:en:quiz-attempt:1`,
    locale: "en",
  });
  const storageKey = buildAssessmentSessionStorageEntryKey(descriptor);

  await seedLocalStorage(page, {
    [PROGRESS_STORAGE_KEY]: {
      version: 1,
      concepts: {
        [concept.slug]: {
          conceptId: concept.id,
          slug: concept.slug,
          firstVisitedAt: "2026-04-18T08:00:00.000Z",
          lastVisitedAt: "2026-04-18T08:01:00.000Z",
          quickTestStartedAt: "2026-04-18T08:01:00.000Z",
        },
      },
      topicTests: {},
      packTests: {},
    },
    [ASSESSMENT_SESSION_STORAGE_KEY]: {
      version: ASSESSMENT_SESSION_STORAGE_VERSION,
      sessions: {
        [storageKey]: {
          version: ASSESSMENT_SESSION_STORAGE_VERSION,
          kind: descriptor.kind,
          assessmentId: descriptor.assessmentId,
          locale: descriptor.locale,
          routeHref: descriptor.routeHref,
          definitionKey: `${descriptor.definitionKey}:stale`,
          title: descriptor.title,
          createdAt: "2026-04-18T08:01:00.000Z",
          updatedAt: "2026-04-18T08:01:00.000Z",
          session: {
            attemptId: validSession.attemptId,
            seed: validSession.seed,
            questions: validSession.questions,
          },
          flow: {
            attemptNumber: 0,
            stage: "question",
            roundId: "initial",
            roundQuestionIds: validSession.questions.map((question) => question.instanceId),
            questionIndex: 0,
            selectedChoiceId: validSession.questions[0]!.choices[1]!.id,
            appliedQuestionId: null,
            roundAnswers: {
              [validSession.questions[0]!.instanceId]: validSession.questions[0]!.choices[1]!.id,
            },
            initialMissedIds: [],
            finalIncorrectCount: 0,
            trackedCanonicalQuestionIds: [validSession.questions[0]!.canonicalQuestionId],
          },
        },
      },
    },
  });

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);
  const suggestionCard = page.getByTestId("test-hub-suggestion-concept-basic-circuits");
  await expect(suggestionCard).toBeVisible();
  const continueLink = suggestionCard.getByRole("link", { name: "Continue concept test path" });
  await expect(continueLink).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?tests\/concepts\/basic-circuits$/,
  );
  await expect(suggestionCard.getByRole("link", { name: "Resume concept test" })).toHaveCount(0);

  await Promise.all([
    page.waitForURL(/\/(?:[a-zA-Z-]+\/)?tests\/concepts\/basic-circuits$/),
    continueLink.click(),
  ]);
  await expect(page.getByText("Question 1 of 5")).toBeVisible();
  await expect(page.getByTestId(`quiz-choice-${validSession.questions[0]!.choices[1]!.id}`)).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect
    .poll(async () => {
      const raw = await page.evaluate((key) => window.localStorage.getItem(key), ASSESSMENT_SESSION_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : { sessions: {} };
      return Object.prototype.hasOwnProperty.call(parsed.sessions ?? {}, storageKey);
    })
    .toBe(false);
});
