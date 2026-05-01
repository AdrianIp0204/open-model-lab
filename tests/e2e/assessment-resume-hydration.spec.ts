import { expect, test, type Page } from "@playwright/test";
import {
  ASSESSMENT_SESSION_STORAGE_KEY,
  ASSESSMENT_SESSION_STORAGE_VERSION,
  buildAssessmentSessionStorageEntryKey,
  buildConceptAssessmentSessionDescriptor,
  buildPackAssessmentSessionDescriptor,
  buildTopicAssessmentSessionDescriptor,
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
  gotoAndExpectOk,
  installBrowserGuards,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

let browserGuard: BrowserGuard;

test.describe.configure({ timeout: 90000 });

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function promptLead(prompt: string) {
  return prompt.split("\n")[0] ?? prompt;
}

async function seedLocalStorage(page: Page, input: Record<string, unknown>) {
  await page.addInitScript((entries) => {
    const markerKey = "__open_model_lab_e2e_local_storage_seeded__";

    if (window.sessionStorage.getItem(markerKey) === "true") {
      return;
    }

    for (const [key, value] of Object.entries(entries)) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }

    window.sessionStorage.setItem(markerKey, "true");
  }, input);
}

async function waitForHubSummaryReady(page: Page) {
  await page.waitForFunction(
    () =>
      ["test-hub-completed-count", "test-hub-clean-count", "test-hub-remaining-count"].every((testId) => {
        const element = document.querySelector(`[data-testid="${testId}"]`);
        return Boolean(element && element.textContent?.trim() !== "\u2014");
      }),
    undefined,
    { timeout: 15000 },
  );
  await expect(page.getByTestId("test-hub-completed-count")).not.toHaveText(/^\s*—\s*$/);
  await expect(page.getByTestId("test-hub-clean-count")).not.toHaveText(/^\s*—\s*$/);
  await expect(page.getByTestId("test-hub-remaining-count")).not.toHaveText(/^\s*—\s*$/);
}

async function expandFullCatalogIfAvailable(page: Page) {
  const button = page.getByTestId("test-hub-show-full-catalog");

  if (await button.isVisible().catch(() => false)) {
    await button.click();
  }
}

function buildPersistedSessionRecord(input: {
  descriptor: {
    kind: "concept" | "topic" | "pack";
    assessmentId: string;
    locale: "en" | "zh-HK";
    routeHref: string;
    definitionKey: string;
    title: string;
  };
  session: {
    attemptId: string;
    seed: string;
    questions: unknown[];
  };
  flow: Record<string, unknown>;
}) {
  return {
    version: ASSESSMENT_SESSION_STORAGE_VERSION,
    kind: input.descriptor.kind,
    assessmentId: input.descriptor.assessmentId,
    locale: input.descriptor.locale,
    routeHref: input.descriptor.routeHref,
    definitionKey: input.descriptor.definitionKey,
    title: input.descriptor.title,
    createdAt: "2026-04-18T08:00:00.000Z",
    updatedAt: "2026-04-18T08:05:00.000Z",
    session: input.session,
    flow: input.flow,
  };
}

async function expectSuggestionPendingOrResume(
  page: Page,
  suggestionTestId: string,
  resumeLabel: string,
  disallowedLabel: string,
) {
  const pending = page.getByTestId("test-hub-suggestions-pending");
  const suggestion = page.getByTestId(suggestionTestId);

  if (await pending.isVisible().catch(() => false)) {
    await expect(suggestion).toHaveCount(0);
    return;
  }

  await expect(suggestion).toBeVisible();
  await expect(suggestion.getByRole("link", { name: resumeLabel })).toBeVisible();
  await expect(suggestion.getByRole("link", { name: disallowedLabel })).toHaveCount(0);
}

async function expectSuggestionPendingOrContinue(
  page: Page,
  suggestionTestId: string,
  continueLabel: string,
  disallowedLabel: string,
) {
  const pending = page.getByTestId("test-hub-suggestions-pending");
  const suggestion = page.getByTestId(suggestionTestId);

  if (await pending.isVisible().catch(() => false)) {
    await expect(suggestion).toHaveCount(0);
    return;
  }

  await expect(suggestion).toBeVisible();
  await expect(suggestion.getByRole("link", { name: continueLabel })).toBeVisible();
  await expect(suggestion.getByRole("link", { name: disallowedLabel })).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
  await setHarnessSession(page, "signed-out");
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("keeps /tests honest when an exact resumable concept session exists locally", async ({ page }) => {
  const concept = getConceptBySlug("escape-velocity");
  const descriptor = buildConceptAssessmentSessionDescriptor(concept, "en");
  const storageKey = buildAssessmentSessionStorageEntryKey(descriptor);
  const session = buildConceptQuizSession(concept, {
    seed: `${concept.slug}:en:quiz-attempt:1`,
    locale: "en",
  });
  const generatedIndex = session.questions.findIndex(
    (question) => question.kind === "generated" && (question.givens?.length ?? 0) > 0,
  );
  const targetIndex = generatedIndex >= 0 ? generatedIndex : 0;
  const targetQuestion = session.questions[targetIndex]!;
  const wrongChoice = targetQuestion.choices.find(
    (choice) => choice.id !== targetQuestion.correctChoiceId,
  )!;

  await seedLocalStorage(page, {
    [PROGRESS_STORAGE_KEY]: {
      version: 1,
      concepts: {
        [concept.slug]: {
          conceptId: concept.id,
          slug: concept.slug,
          firstVisitedAt: "2026-04-18T08:00:00.000Z",
          lastVisitedAt: "2026-04-18T08:05:00.000Z",
          quickTestStartedAt: "2026-04-18T08:05:00.000Z",
        },
      },
      topicTests: {},
      packTests: {},
    },
    [ASSESSMENT_SESSION_STORAGE_KEY]: {
      version: ASSESSMENT_SESSION_STORAGE_VERSION,
      sessions: {
        [storageKey]: buildPersistedSessionRecord({
          descriptor,
          session: {
            attemptId: session.attemptId,
            seed: session.seed,
            questions: session.questions,
          },
          flow: {
            attemptNumber: 0,
            stage: "question",
            roundId: "initial",
            roundQuestionIds: session.questions.map((question) => question.instanceId),
            questionIndex: targetIndex,
            selectedChoiceId: wrongChoice.id,
            appliedQuestionId: null,
            roundAnswers: {
              [targetQuestion.instanceId]: wrongChoice.id,
            },
            initialMissedIds: [],
            finalIncorrectCount: 0,
            trackedCanonicalQuestionIds: [targetQuestion.canonicalQuestionId],
          },
        }),
      },
    },
  });

  const response = await page.goto("/tests", { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();

  const quickStartText = await page.getByTestId("test-hub-quick-start").textContent();
  expect(quickStartText?.includes("Not started") ?? false).toBe(false);
  await expectSuggestionPendingOrResume(
    page,
    "test-hub-suggestion-concept-escape-velocity",
    "Resume concept test",
    "Continue concept test path",
  );

  await waitForHubSummaryReady(page);
  await expandFullCatalogIfAvailable(page);
  const conceptCard = page.getByTestId("test-hub-card-concept-escape-velocity");
  await expect(conceptCard).toContainText("Saved on this device");
  await expect(
    page.getByTestId("test-hub-suggestion-concept-escape-velocity").getByRole("link", {
      name: "Resume concept test",
    }),
  ).toBeVisible();
});

test("keeps /tests honest when only started-at exists without an exact session", async ({ page }) => {
  const concept = getConceptBySlug("escape-velocity");

  await seedLocalStorage(page, {
    [PROGRESS_STORAGE_KEY]: {
      version: 1,
      concepts: {
        [concept.slug]: {
          conceptId: concept.id,
          slug: concept.slug,
          firstVisitedAt: "2026-04-18T08:00:00.000Z",
          lastVisitedAt: "2026-04-18T08:05:00.000Z",
          quickTestStartedAt: "2026-04-18T08:05:00.000Z",
        },
      },
      topicTests: {},
      packTests: {},
    },
  });

  const response = await page.goto("/tests", { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();

  await expectSuggestionPendingOrContinue(
    page,
    "test-hub-suggestion-concept-escape-velocity",
    "Continue concept test path",
    "Resume concept test",
  );

  await waitForHubSummaryReady(page);
  await expandFullCatalogIfAvailable(page);
  await expect(
    page.getByTestId("test-hub-suggestion-concept-escape-velocity").getByRole("link", {
      name: "Continue concept test path",
    }),
  ).toBeVisible();
  await expect(
    page.getByTestId("test-hub-card-concept-escape-velocity"),
  ).toContainText("In progress");
});

test("does not flash Resume on /tests for a stale incompatible session", async ({ page }) => {
  const concept = getConceptBySlug("basic-circuits");
  const descriptor = buildConceptAssessmentSessionDescriptor(concept, "en");
  const storageKey = buildAssessmentSessionStorageEntryKey(descriptor);
  const session = buildConceptQuizSession(concept, {
    seed: `${concept.slug}:en:quiz-attempt:1`,
    locale: "en",
  });

  await seedLocalStorage(page, {
    [PROGRESS_STORAGE_KEY]: {
      version: 1,
      concepts: {
        [concept.slug]: {
          conceptId: concept.id,
          slug: concept.slug,
          firstVisitedAt: "2026-04-18T08:00:00.000Z",
          lastVisitedAt: "2026-04-18T08:05:00.000Z",
          quickTestStartedAt: "2026-04-18T08:05:00.000Z",
        },
      },
      topicTests: {},
      packTests: {},
    },
    [ASSESSMENT_SESSION_STORAGE_KEY]: {
      version: ASSESSMENT_SESSION_STORAGE_VERSION,
      sessions: {
        [storageKey]: buildPersistedSessionRecord({
          descriptor: {
            ...descriptor,
            definitionKey: `${descriptor.definitionKey}:stale`,
          },
          session: {
            attemptId: session.attemptId,
            seed: session.seed,
            questions: session.questions,
          },
          flow: {
            attemptNumber: 0,
            stage: "question",
            roundId: "initial",
            roundQuestionIds: session.questions.map((question) => question.instanceId),
            questionIndex: 0,
            selectedChoiceId: session.questions[0]!.choices[1]!.id,
            appliedQuestionId: null,
            roundAnswers: {
              [session.questions[0]!.instanceId]: session.questions[0]!.choices[1]!.id,
            },
            initialMissedIds: [],
            finalIncorrectCount: 0,
            trackedCanonicalQuestionIds: [session.questions[0]!.canonicalQuestionId],
          },
        }),
      },
    },
  });

  const response = await page.goto("/tests", { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();

  await expectSuggestionPendingOrContinue(
    page,
    "test-hub-suggestion-concept-basic-circuits",
    "Continue concept test path",
    "Resume concept test",
  );

  await waitForHubSummaryReady(page);
  await expect(
    page.getByTestId("test-hub-suggestion-concept-basic-circuits").getByRole("link", {
      name: "Resume concept test",
    }),
  ).toHaveCount(0);
});

test("direct concept quick-test load shows pending or exact restored generated state, never a fresh incorrect state", async ({
  page,
}) => {
  const concept = getConceptBySlug("escape-velocity");
  const descriptor = buildConceptAssessmentSessionDescriptor(concept, "en");
  const storageKey = buildAssessmentSessionStorageEntryKey(descriptor);
  const session = buildConceptQuizSession(concept, {
    seed: `${concept.slug}:en:quiz-attempt:1`,
    locale: "en",
  });
  const generatedIndex = session.questions.findIndex(
    (question) => question.kind === "generated" && (question.givens?.length ?? 0) > 0,
  );
  const targetIndex = generatedIndex >= 0 ? generatedIndex : 0;
  const targetQuestion = session.questions[targetIndex]!;
  const wrongChoice = targetQuestion.choices.find(
    (choice) => choice.id !== targetQuestion.correctChoiceId,
  )!;

  await seedLocalStorage(page, {
    [PROGRESS_STORAGE_KEY]: {
      version: 1,
      concepts: {
        [concept.slug]: {
          conceptId: concept.id,
          slug: concept.slug,
          firstVisitedAt: "2026-04-18T08:00:00.000Z",
          lastVisitedAt: "2026-04-18T08:05:00.000Z",
          quickTestStartedAt: "2026-04-18T08:05:00.000Z",
        },
      },
      topicTests: {},
      packTests: {},
    },
    [ASSESSMENT_SESSION_STORAGE_KEY]: {
      version: ASSESSMENT_SESSION_STORAGE_VERSION,
      sessions: {
        [storageKey]: buildPersistedSessionRecord({
          descriptor,
          session: {
            attemptId: session.attemptId,
            seed: session.seed,
            questions: session.questions,
          },
          flow: {
            attemptNumber: 0,
            stage: "question",
            roundId: "initial",
            roundQuestionIds: session.questions.map((question) => question.instanceId),
            questionIndex: targetIndex,
            selectedChoiceId: wrongChoice.id,
            appliedQuestionId: null,
            roundAnswers: {
              [targetQuestion.instanceId]: wrongChoice.id,
            },
            initialMissedIds: [],
            finalIncorrectCount: 0,
            trackedCanonicalQuestionIds: [targetQuestion.canonicalQuestionId],
          },
        }),
      },
    },
  });

  const response = await page.goto(`/concepts/${concept.slug}?phase=check#quick-test`, {
    waitUntil: "domcontentloaded",
  });
  expect(response?.ok()).toBeTruthy();

  const loading = page.getByTestId("quiz-resume-loading");
  if (!(await loading.isVisible().catch(() => false))) {
    const stage = page.getByTestId("quiz-question-stage");
    await expect(stage).toBeVisible();
    await expect(stage).toContainText(new RegExp(escapeRegExp(promptLead(targetQuestion.prompt))));
    await expect(stage).not.toContainText(new RegExp(escapeRegExp(promptLead(session.questions[0]!.prompt))));
    await expect(page.getByTestId(`quiz-choice-${wrongChoice.id}`)).toHaveAttribute("aria-pressed", "true");
  }

  const stage = page.getByTestId("quiz-question-stage");
  await expect(stage).toContainText(new RegExp(escapeRegExp(promptLead(targetQuestion.prompt))));
  await expect(page.getByTestId(`quiz-choice-${wrongChoice.id}`)).toHaveAttribute("aria-pressed", "true");
});

test("direct standalone concept-test load stays honest when an exact session exists", async ({
  page,
}) => {
  const concept = getConceptBySlug("escape-velocity");
  const descriptor = buildConceptAssessmentSessionDescriptor(concept, "en");
  const storageKey = buildAssessmentSessionStorageEntryKey(descriptor);
  const session = buildConceptQuizSession(concept, {
    seed: `${concept.slug}:en:quiz-attempt:1`,
    locale: "en",
  });
  const generatedIndex = session.questions.findIndex(
    (question) => question.kind === "generated" && (question.givens?.length ?? 0) > 0,
  );
  const targetIndex = generatedIndex >= 0 ? generatedIndex : 0;
  const targetQuestion = session.questions[targetIndex]!;
  const wrongChoice = targetQuestion.choices.find(
    (choice) => choice.id !== targetQuestion.correctChoiceId,
  )!;

  await seedLocalStorage(page, {
    [PROGRESS_STORAGE_KEY]: {
      version: 1,
      concepts: {
        [concept.slug]: {
          conceptId: concept.id,
          slug: concept.slug,
          firstVisitedAt: "2026-04-18T08:00:00.000Z",
          lastVisitedAt: "2026-04-18T08:05:00.000Z",
          quickTestStartedAt: "2026-04-18T08:05:00.000Z",
        },
      },
      topicTests: {},
      packTests: {},
    },
    [ASSESSMENT_SESSION_STORAGE_KEY]: {
      version: ASSESSMENT_SESSION_STORAGE_VERSION,
      sessions: {
        [storageKey]: buildPersistedSessionRecord({
          descriptor,
          session: {
            attemptId: session.attemptId,
            seed: session.seed,
            questions: session.questions,
          },
          flow: {
            attemptNumber: 0,
            stage: "question",
            roundId: "initial",
            roundQuestionIds: session.questions.map((question) => question.instanceId),
            questionIndex: targetIndex,
            selectedChoiceId: wrongChoice.id,
            appliedQuestionId: null,
            roundAnswers: {
              [targetQuestion.instanceId]: wrongChoice.id,
            },
            initialMissedIds: [],
            finalIncorrectCount: 0,
            trackedCanonicalQuestionIds: [targetQuestion.canonicalQuestionId],
          },
        }),
      },
    },
  });

  const response = await page.goto(`/tests/concepts/${concept.slug}`, {
    waitUntil: "domcontentloaded",
  });
  expect(response?.ok()).toBeTruthy();

  const panel = page.getByTestId("concept-test-status-panel");
  const loading = page.getByTestId("quiz-resume-loading");
  const panelText = await panel.textContent();
  expect(panelText?.includes("Not started") ?? false).toBe(false);

  if (!(await loading.isVisible().catch(() => false))) {
    const stage = page.getByTestId("quiz-question-stage");
    await expect(stage).toBeVisible();
    await expect(stage).toContainText(new RegExp(escapeRegExp(promptLead(targetQuestion.prompt))));
    await expect(page.getByTestId(`quiz-choice-${wrongChoice.id}`)).toHaveAttribute("aria-pressed", "true");
  }

  await expect(panel).toContainText("Saved on this device");
  await expect(page.getByTestId(`quiz-choice-${wrongChoice.id}`)).toHaveAttribute("aria-pressed", "true");
});

test("direct topic test load keeps the saved-result panel honest when an exact session exists", async ({
  page,
}) => {
  const entry = getPublishedTopicTestCatalog().entries.find(
    (candidate) => candidate.topicSlug === "oscillations",
  )!;
  const descriptor = buildTopicAssessmentSessionDescriptor(entry, "en");
  const storageKey = buildAssessmentSessionStorageEntryKey(descriptor);
  const session = buildTopicTestSession(entry.topicSlug, {
    locale: "en",
    seed: `topic-test:${entry.topicSlug}:en:quiz-attempt:1`,
  });
  const wrongChoice = session.questions[0]!.choices.find(
    (choice) => choice.id !== session.questions[0]!.correctChoiceId,
  )!;

  await seedLocalStorage(page, {
    [PROGRESS_STORAGE_KEY]: {
      version: 1,
      concepts: {},
      topicTests: {
        [entry.topicSlug]: {
          slug: entry.topicSlug,
          startedAt: "2026-04-18T08:05:00.000Z",
        },
      },
      packTests: {},
    },
    [ASSESSMENT_SESSION_STORAGE_KEY]: {
      version: ASSESSMENT_SESSION_STORAGE_VERSION,
      sessions: {
        [storageKey]: buildPersistedSessionRecord({
          descriptor,
          session: {
            attemptId: session.attemptId,
            seed: session.seed,
            questions: session.questions,
          },
          flow: {
            attemptNumber: 0,
            stage: "question",
            roundId: "initial",
            roundQuestionIds: session.questions.map((question) => question.instanceId),
            questionIndex: 0,
            selectedChoiceId: wrongChoice.id,
            appliedQuestionId: null,
            roundAnswers: {
              [session.questions[0]!.instanceId]: wrongChoice.id,
            },
            initialMissedIds: [],
            finalIncorrectCount: 0,
            trackedCanonicalQuestionIds: [session.questions[0]!.canonicalQuestionId],
          },
        }),
      },
    },
  });

  const response = await page.goto(entry.testHref, { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();

  const panel = page.getByTestId("topic-test-status-panel");
  const panelText = await panel.textContent();
  expect(panelText?.includes("Not started") ?? false).toBe(false);
  if (panelText?.includes("Loading progress")) {
    await expect(panel).toContainText("Loading progress");
  }

  await expect(panel).toContainText("Saved on this device");
  await expect(page.getByTestId(`quiz-choice-${wrongChoice.id}`)).toHaveAttribute("aria-pressed", "true");
});

test("direct pack test load keeps the saved-result panel honest when an exact session exists", async ({
  page,
}) => {
  const entry = getPublishedPackTestCatalog().entries.find(
    (candidate) => candidate.packSlug === "physics-connected-models",
  )!;
  const descriptor = buildPackAssessmentSessionDescriptor(entry, "en");
  const storageKey = buildAssessmentSessionStorageEntryKey(descriptor);
  const session = buildPackTestSession(entry.packSlug, {
    locale: "en",
    seed: `pack-test:${entry.packSlug}:en:quiz-attempt:1`,
  });
  const wrongChoice = session.questions[0]!.choices.find(
    (choice) => choice.id !== session.questions[0]!.correctChoiceId,
  )!;

  await seedLocalStorage(page, {
    [PROGRESS_STORAGE_KEY]: {
      version: 1,
      concepts: {},
      topicTests: {},
      packTests: {
        [entry.packSlug]: {
          slug: entry.packSlug,
          startedAt: "2026-04-18T08:05:00.000Z",
        },
      },
    },
    [ASSESSMENT_SESSION_STORAGE_KEY]: {
      version: ASSESSMENT_SESSION_STORAGE_VERSION,
      sessions: {
        [storageKey]: buildPersistedSessionRecord({
          descriptor,
          session: {
            attemptId: session.attemptId,
            seed: session.seed,
            questions: session.questions,
          },
          flow: {
            attemptNumber: 0,
            stage: "question",
            roundId: "initial",
            roundQuestionIds: session.questions.map((question) => question.instanceId),
            questionIndex: 0,
            selectedChoiceId: wrongChoice.id,
            appliedQuestionId: null,
            roundAnswers: {
              [session.questions[0]!.instanceId]: wrongChoice.id,
            },
            initialMissedIds: [],
            finalIncorrectCount: 0,
            trackedCanonicalQuestionIds: [session.questions[0]!.canonicalQuestionId],
          },
        }),
      },
    },
  });

  const response = await page.goto(entry.testHref, { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();

  const panel = page.getByTestId("pack-test-status-panel");
  const panelText = await panel.textContent();
  expect(panelText?.includes("Not started") ?? false).toBe(false);
  if (panelText?.includes("Loading progress")) {
    await expect(panel).toContainText("Loading progress");
  }

  const loading = page.getByTestId("quiz-resume-loading");
  if (!(await loading.isVisible().catch(() => false))) {
    await expect(page.getByTestId(`quiz-choice-${wrongChoice.id}`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }

  await expect(panel).toContainText("Saved on this device");
  await expect(page.getByTestId(`quiz-choice-${wrongChoice.id}`)).toHaveAttribute("aria-pressed", "true");
});

test("direct pack retry-round load does not flash the initial round before restoring", async ({
  page,
}) => {
  const entry = getPublishedPackTestCatalog().entries.find(
    (candidate) => candidate.packSlug === "physics-connected-models",
  )!;
  const descriptor = buildPackAssessmentSessionDescriptor(entry, "en");
  const storageKey = buildAssessmentSessionStorageEntryKey(descriptor);
  const session = buildPackTestSession(entry.packSlug, {
    locale: "en",
    seed: `pack-test:${entry.packSlug}:en:quiz-attempt:1`,
  });
  const missedQuestion = session.questions[0]!;

  await seedLocalStorage(page, {
    [PROGRESS_STORAGE_KEY]: {
      version: 1,
      concepts: {},
      topicTests: {},
      packTests: {
        [entry.packSlug]: {
          slug: entry.packSlug,
          startedAt: "2026-04-18T08:05:00.000Z",
        },
      },
    },
    [ASSESSMENT_SESSION_STORAGE_KEY]: {
      version: ASSESSMENT_SESSION_STORAGE_VERSION,
      sessions: {
        [storageKey]: buildPersistedSessionRecord({
          descriptor,
          session: {
            attemptId: session.attemptId,
            seed: session.seed,
            questions: session.questions,
          },
          flow: {
            attemptNumber: 0,
            stage: "question",
            roundId: "retry",
            roundQuestionIds: [missedQuestion.instanceId],
            questionIndex: 0,
            selectedChoiceId: null,
            appliedQuestionId: null,
            roundAnswers: {},
            initialMissedIds: [missedQuestion.instanceId],
            finalIncorrectCount: 1,
            trackedCanonicalQuestionIds: [missedQuestion.canonicalQuestionId],
          },
        }),
      },
    },
  });

  const response = await page.goto(entry.testHref, { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();

  const loading = page.getByTestId("quiz-resume-loading");
  if (!(await loading.isVisible().catch(() => false))) {
    const stage = page.getByTestId("quiz-question-stage");
    const text = (await stage.textContent()) ?? "";
    expect(text.includes(`Question 1 of ${session.questions.length}`)).toBe(false);
  }

  await expect(
    page.getByTestId("quiz-question-stage").getByText("Try Again", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("quiz-question-stage")).toContainText("Question 1 of 1");
  await expect(page.getByTestId("pack-test-status-panel")).toContainText("Saved on this device");
});

test("direct retry-round load does not flash the initial round before restoring", async ({ page }) => {
  const concept = getConceptBySlug("basic-circuits");
  const descriptor = buildConceptAssessmentSessionDescriptor(concept, "en");
  const storageKey = buildAssessmentSessionStorageEntryKey(descriptor);
  const session = buildConceptQuizSession(concept, {
    seed: `${concept.slug}:en:quiz-attempt:1`,
    locale: "en",
  });
  const missedQuestion = session.questions[0]!;

  await seedLocalStorage(page, {
    [PROGRESS_STORAGE_KEY]: {
      version: 1,
      concepts: {
        [concept.slug]: {
          conceptId: concept.id,
          slug: concept.slug,
          firstVisitedAt: "2026-04-18T08:00:00.000Z",
          lastVisitedAt: "2026-04-18T08:05:00.000Z",
          quickTestStartedAt: "2026-04-18T08:05:00.000Z",
        },
      },
      topicTests: {},
      packTests: {},
    },
    [ASSESSMENT_SESSION_STORAGE_KEY]: {
      version: ASSESSMENT_SESSION_STORAGE_VERSION,
      sessions: {
        [storageKey]: buildPersistedSessionRecord({
          descriptor,
          session: {
            attemptId: session.attemptId,
            seed: session.seed,
            questions: session.questions,
          },
          flow: {
            attemptNumber: 0,
            stage: "question",
            roundId: "retry",
            roundQuestionIds: [missedQuestion.instanceId],
            questionIndex: 0,
            selectedChoiceId: null,
            appliedQuestionId: null,
            roundAnswers: {},
            initialMissedIds: [missedQuestion.instanceId],
            finalIncorrectCount: 1,
            trackedCanonicalQuestionIds: [missedQuestion.canonicalQuestionId],
          },
        }),
      },
    },
  });

  const response = await page.goto(`/concepts/${concept.slug}?phase=check#quick-test`, {
    waitUntil: "domcontentloaded",
  });
  expect(response?.ok()).toBeTruthy();

  const loading = page.getByTestId("quiz-resume-loading");
  if (!(await loading.isVisible().catch(() => false))) {
    const stage = page.getByTestId("quiz-question-stage");
    const text = (await stage.textContent()) ?? "";
    expect(text.includes("Question 1 of 5")).toBe(false);
  }

  await expect(page.getByText("Try Again")).toBeVisible();
  await expect(page.getByText("Question 1 of 1")).toBeVisible();
});

test("explicit restart clears exact resume and falls back to Continue honestly", async ({ page }) => {
  const concept = getConceptBySlug("escape-velocity");
  const descriptor = buildConceptAssessmentSessionDescriptor(concept, "en");
  const storageKey = buildAssessmentSessionStorageEntryKey(descriptor);
  const session = buildConceptQuizSession(concept, {
    seed: `${concept.slug}:en:quiz-attempt:1`,
    locale: "en",
  });
  const wrongChoice = session.questions[0]!.choices.find(
    (choice) => choice.id !== session.questions[0]!.correctChoiceId,
  )!;

  await seedLocalStorage(page, {
    [PROGRESS_STORAGE_KEY]: {
      version: 1,
      concepts: {
        [concept.slug]: {
          conceptId: concept.id,
          slug: concept.slug,
          firstVisitedAt: "2026-04-18T08:00:00.000Z",
          lastVisitedAt: "2026-04-18T08:05:00.000Z",
          quickTestStartedAt: "2026-04-18T08:05:00.000Z",
        },
      },
      topicTests: {},
      packTests: {},
    },
    [ASSESSMENT_SESSION_STORAGE_KEY]: {
      version: ASSESSMENT_SESSION_STORAGE_VERSION,
      sessions: {
        [storageKey]: buildPersistedSessionRecord({
          descriptor,
          session: {
            attemptId: session.attemptId,
            seed: session.seed,
            questions: session.questions,
          },
          flow: {
            attemptNumber: 0,
            stage: "question",
            roundId: "initial",
            roundQuestionIds: session.questions.map((question) => question.instanceId),
            questionIndex: 0,
            selectedChoiceId: wrongChoice.id,
            appliedQuestionId: null,
            roundAnswers: {
              [session.questions[0]!.instanceId]: wrongChoice.id,
            },
            initialMissedIds: [],
            finalIncorrectCount: 0,
            trackedCanonicalQuestionIds: [session.questions[0]!.canonicalQuestionId],
          },
        }),
      },
    },
  });

  await gotoAndExpectOk(page, `/concepts/${concept.slug}?phase=check#quick-test`);
  await expect(page.getByTestId(`quiz-choice-${wrongChoice.id}`)).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Restart" }).click();
  await expect(page.getByTestId(`quiz-choice-${wrongChoice.id}`)).toHaveAttribute("aria-pressed", "false");

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);
  await expandFullCatalogIfAvailable(page);
  const conceptCard = page.getByTestId("test-hub-card-concept-escape-velocity");
  await expect(conceptCard.getByRole("link", { name: "Resume concept test" })).toHaveCount(0);
  await expect(
    conceptCard,
  ).toContainText(/In progress|Loading progress/);
});
