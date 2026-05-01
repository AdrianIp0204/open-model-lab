import { expect, test, type Locator, type Page } from "@playwright/test";
import { getConceptBySlug } from "@/lib/content";
import {
  buildPackTestSession,
  buildTopicTestSession,
  getNextPublishedConceptTestEntry,
  getNextPublishedPackTestEntry,
  getPublishedPackTestCatalog,
  getNextPublishedTopicTestEntry,
} from "@/lib/test-hub";
import { buildConceptQuizSession } from "@/lib/quiz";
import {
  closeOpenDisclosurePanels,
  expandFullTestCatalogIfAvailable,
  gotoAndExpectOk,
  installBrowserGuards,
  openConceptProgressDisclosure,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

type AssessmentSessionLike = {
  questions: Array<{
    prompt: string;
    choices: Array<{ id: string; label: string }>;
    correctChoiceId: string;
  }>;
};

type HubSummaryCounts = {
  total: number;
  completed: number;
  clean: number;
  remaining: number;
};

let browserGuard: BrowserGuard;

test.describe.configure({ timeout: 120000 });

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function promptLead(prompt: string) {
  return prompt.split("\n")[0] ?? prompt;
}

function getCompletionSection(page: Page) {
  return page.getByTestId("quiz-completion");
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

async function readHubSummaryCounts(page: Page): Promise<HubSummaryCounts> {
  const parseCount = async (testId: string) =>
    Number((await page.getByTestId(testId).textContent())?.trim() ?? "0");

  return {
    total: await parseCount("test-hub-total-count"),
    completed: await parseCount("test-hub-completed-count"),
    clean: await parseCount("test-hub-clean-count"),
    remaining: await parseCount("test-hub-remaining-count"),
  };
}

async function waitForHubSummaryReady(page: Page, timeout = 15000) {
  await expect(page.getByTestId("test-hub-completed-count")).not.toHaveText("\u2014", { timeout });
  await expect(page.getByTestId("test-hub-clean-count")).not.toHaveText("\u2014", { timeout });
  await expect(page.getByTestId("test-hub-remaining-count")).not.toHaveText("\u2014", { timeout });
  await expandFullTestCatalogIfAvailable(page);
}

async function startAssessmentFromHub(
  page: Page,
  cardTestId: string,
  actionLabel: string,
  expectedUrl: RegExp,
  activation: "click" | "keyboard" = "click",
) {
  await expandFullTestCatalogIfAvailable(page);
  const card = page.getByTestId(cardTestId);
  const link = card.getByRole("link", { name: actionLabel });
  await expect(card).toBeVisible();
  if (activation === "keyboard") {
    await link.focus();
    await Promise.all([
      page.waitForURL(expectedUrl),
      page.keyboard.press("Enter"),
    ]);
    return;
  }

  await Promise.all([page.waitForURL(expectedUrl), link.click()]);
}

async function completeAssessmentWithSingleRetry(
  page: Page,
  session: AssessmentSessionLike,
  missQuestionIndex = 0,
  input?: {
    onRoundSummary?: () => Promise<void>;
  },
) {
  const missedQuestion = session.questions[missQuestionIndex]!;
  const wrongChoice = missedQuestion.choices.find(
    (choice) => choice.id !== missedQuestion.correctChoiceId,
  )!;

  for (let index = 0; index < session.questions.length; index += 1) {
    const question = session.questions[index]!;
    const choice =
      index === missQuestionIndex
        ? wrongChoice
        : question.choices.find((candidate) => candidate.id === question.correctChoiceId)!;

    await page.getByTestId(`quiz-choice-${choice.id}`).click();
    await page
      .getByRole("button", {
        name: index === session.questions.length - 1 ? "Finish round" : "Next question",
      })
      .click();
  }

  await expect(page.getByRole("heading", { name: "Try Again" })).toBeVisible();
  if (input?.onRoundSummary) {
    await input.onRoundSummary();
  }
  await page.getByRole("button", { name: "Try Again" }).click();

  await expect(page.getByText("Question 1 of 1")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: new RegExp(escapeRegExp(promptLead(missedQuestion.prompt)), "i"),
    }),
  ).toBeVisible();

  const comparisonQuestion =
    session.questions[(missQuestionIndex + 1) % session.questions.length]!;
  if (comparisonQuestion.prompt !== missedQuestion.prompt) {
    await expect(
      page.getByText(new RegExp(escapeRegExp(promptLead(comparisonQuestion.prompt)), "i")),
    ).toHaveCount(0);
  }

  const correctRetryChoice = missedQuestion.choices.find(
    (choice) => choice.id === missedQuestion.correctChoiceId,
  )!;
  await page.getByTestId(`quiz-choice-${correctRetryChoice.id}`).click();
  await page.getByRole("button", { name: "Finish round" }).click();
}

async function completeAssessmentCleanly(
  page: Page,
  session: AssessmentSessionLike,
) {
  for (let index = 0; index < session.questions.length; index += 1) {
    const question = session.questions[index]!;
    const choice = question.choices.find((candidate) => candidate.id === question.correctChoiceId)!;

    await page.getByTestId(`quiz-choice-${choice.id}`).click();
    await page
      .getByRole("button", {
        name: index === session.questions.length - 1 ? "Finish round" : "Next question",
      })
      .click();
  }
}

async function expectCardCompletedState(
  card: Locator,
  retakeLabel: string,
) {
  await expect(card.getByRole("link", { name: retakeLabel })).toBeVisible();
  await expect(card.getByText("Completed")).toBeVisible();
  await expect(card.getByText(/Perfect score on the latest run\./)).toBeVisible();
}

async function expectExpandedCardCompletedState(
  page: Page,
  cardTestId: string,
  retakeLabel: string,
) {
  await waitForHubSummaryReady(page);
  await expectCardCompletedState(page.getByTestId(cardTestId), retakeLabel);
}

async function expectImmediateHonestAssessmentStatusPanel(
  panel: Locator,
  input: {
    loadingText: string;
    completedText: string;
    falseNegativeText: string;
    cleanText: string;
  },
) {
  const panelText = await panel.textContent();
  expect(panelText?.includes(input.falseNegativeText) ?? false).toBe(false);

  if (panelText?.includes(input.loadingText)) {
    await expect(panel.getByText(input.loadingText)).toBeVisible();
    return;
  }

  await expect(panel.getByText(input.completedText)).toBeVisible();
  await expect(panel.getByText(input.cleanText)).toBeVisible();
}

async function expectImmediateHonestConceptProgressCard(
  card: Locator,
  input: {
    loadingText: string;
    positiveText: RegExp;
    falseNegativeText: string;
    staleQuickTestText: string;
  },
) {
  const cardText = await card.textContent();
  expect(cardText?.includes(input.falseNegativeText) ?? false).toBe(false);
  expect(cardText?.includes(input.staleQuickTestText) ?? false).toBe(false);

  if (cardText?.includes(input.loadingText)) {
    await expect(card).toContainText(input.loadingText);
    return;
  }

  await expect(card).toContainText(input.positiveText);
}

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
  await setHarnessSession(page, "signed-out");
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("completes a concept assessment journey from the hub and persists the resulting state", async ({
  page,
}) => {
  const concept = getConceptBySlug("basic-circuits");
  const conceptSession = buildConceptQuizSession(concept, {
    seed: `${concept.slug}:en:quiz-attempt:1`,
    locale: "en",
  });

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);
  const initialSummary = await readHubSummaryCounts(page);

  await startAssessmentFromHub(
    page,
    "test-hub-card-concept-basic-circuits",
    "Start concept test",
    /\/(?:[a-zA-Z-]+\/)?tests\/concepts\/basic-circuits$/,
    "keyboard",
  );
  await expect(page.getByTestId("standalone-concept-test-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: `${concept.title} concept test` })).toBeVisible();
  await expect(page.getByText("Question 1 of 5")).toBeVisible();

  await completeAssessmentWithSingleRetry(page, conceptSession, 0);

  const completionSection = getCompletionSection(page);
  await expect(completionSection.getByTestId("quiz-completion-retake")).toBeVisible();
  await expect(
    completionSection.getByRole("link", { name: "Review concept" }),
  ).toHaveAttribute("href", /\/concepts\/basic-circuits#interactive-lab$/);

  const nextConcept = getNextPublishedConceptTestEntry(concept.slug)!;
  await expect(
    completionSection.getByRole("link", { name: "Next test" }),
  ).toHaveAttribute("href", new RegExp(`${escapeRegExp(nextConcept.testHref)}$`));

  await expect(
    completionSection.getByRole("link", { name: "Back to Test Hub" }),
  ).toHaveAttribute("href", /\/(?:[a-zA-Z-]+\/)?tests$/);
  await completionSection.getByRole("link", { name: "Back to Test Hub" }).click({
    force: true,
  });
  await expect(page).toHaveURL(/\/(?:[a-zA-Z-]+\/)?tests$/);
  await waitForHubSummaryReady(page);

  const conceptCard = page.getByTestId("test-hub-card-concept-basic-circuits");
  await expectCardCompletedState(conceptCard, "Retake concept test");

  const updatedSummary = await readHubSummaryCounts(page);
  expect(updatedSummary.total).toBe(initialSummary.total);
  expect(updatedSummary.completed).toBe(initialSummary.completed + 1);
  expect(updatedSummary.clean).toBe(initialSummary.clean + 1);
  expect(updatedSummary.remaining).toBe(initialSummary.remaining - 1);

  await page.reload();
  await expectExpandedCardCompletedState(page, "test-hub-card-concept-basic-circuits", "Retake concept test");
});

test("completes a topic assessment journey from the hub, clicks Back to Test Hub, and keeps progress visible after reload", async ({
  page,
}) => {
  const topicSlug = "oscillations";
  const topicSession = buildTopicTestSession(topicSlug, {
    locale: "en",
    seed: `topic-test:${topicSlug}:en:quiz-attempt:1`,
  });

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);
  const initialSummary = await readHubSummaryCounts(page);

  await startAssessmentFromHub(
    page,
    "test-hub-card-topic-oscillations",
    "Start topic test",
    /\/(?:[a-zA-Z-]+\/)?tests\/topics\/oscillations$/,
  );
  await expect(page.getByRole("heading", { name: "Oscillations topic test" })).toBeVisible();
  await expect(page.getByText("Question 1 of 10")).toBeVisible();

  await completeAssessmentWithSingleRetry(page, topicSession, 0);

  const completionSection = getCompletionSection(page);
  await expect(
    completionSection.getByRole("link", { name: "Review topic" }).first(),
  ).toHaveAttribute("href", /\/(?:[a-zA-Z-]+\/)?concepts\/topics\/oscillations$/);
  await expect(
    completionSection.getByRole("link", { name: "Review included concepts" }),
  ).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?tests\/topics\/oscillations#topic-test-included-concepts$/,
  );

  await completionSection.getByRole("link", { name: "Back to Test Hub" }).click();
  await expect(page).toHaveURL(/\/(?:[a-zA-Z-]+\/)?tests$/);
  await expectExpandedCardCompletedState(page, "test-hub-card-topic-oscillations", "Retake topic test");

  const updatedSummary = await readHubSummaryCounts(page);
  expect(updatedSummary.completed).toBe(initialSummary.completed + 1);
  expect(updatedSummary.clean).toBe(initialSummary.clean + 1);
  expect(updatedSummary.remaining).toBe(initialSummary.remaining - 1);

  await page.reload();
  await expectExpandedCardCompletedState(page, "test-hub-card-topic-oscillations", "Retake topic test");
});

test("topic completion next CTA actually navigates to the next topic test", async ({
  page,
}) => {
  const topicSlug = "oscillations";
  const topicSession = buildTopicTestSession(topicSlug, {
    locale: "en",
    seed: `topic-test:${topicSlug}:en:quiz-attempt:1`,
  });

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);

  await startAssessmentFromHub(
    page,
    "test-hub-card-topic-oscillations",
    "Start topic test",
    /\/(?:[a-zA-Z-]+\/)?tests\/topics\/oscillations$/,
  );
  await completeAssessmentWithSingleRetry(page, topicSession, 0);

  const completionSection = getCompletionSection(page);
  const followOnPack = getPublishedPackTestCatalog().entries.find((entry) =>
    entry.includedTopicSlugs.includes(topicSlug),
  );

  if (followOnPack) {
    await completionSection
      .getByRole("link", {
        name: new RegExp(escapeRegExp(`Follow-on pack: ${followOnPack.title}`), "i"),
      })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/[a-zA-Z-]+${escapeRegExp(followOnPack.testHref)}$|${escapeRegExp(followOnPack.testHref)}$`),
    );
    await expect(page.getByRole("heading", { name: followOnPack.title })).toBeVisible();
  } else {
    const nextTopic = getNextPublishedTopicTestEntry(topicSlug)!;
    await completionSection.getByRole("link", { name: "Next topic test" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/[a-zA-Z-]+${escapeRegExp(nextTopic.testHref)}$|${escapeRegExp(nextTopic.testHref)}$`),
    );
    await expect(
      page.getByRole("heading", { name: `${nextTopic.title} topic test` }),
    ).toBeVisible();
  }
});

test("completes a pack journey from the hub, clicks Back to Test Hub, and keeps pack progress visible after reload", async ({
  page,
}) => {
  const packSlug = "math-linked-representations";
  const packSession = buildPackTestSession(packSlug, {
    locale: "en",
    seed: `pack-test:${packSlug}:en:quiz-attempt:1`,
  });

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);
  const initialSummary = await readHubSummaryCounts(page);

  await startAssessmentFromHub(
    page,
    "test-hub-card-pack-math-linked-representations",
    "Start pack",
    /\/(?:[a-zA-Z-]+\/)?tests\/packs\/math-linked-representations$/,
  );
  await expect(page.getByRole("heading", { name: "Math Linked Representations Pack" })).toBeVisible();

  await completeAssessmentWithSingleRetry(page, packSession, 0);

  const completionSection = getCompletionSection(page);
  await expect(
    completionSection.getByRole("link", { name: "Review subject" }).first(),
  ).toHaveAttribute("href", /\/(?:[a-zA-Z-]+\/)?concepts\/subjects\/math$/);
  await expect(
    completionSection.getByRole("link", { name: "Review included topics" }),
  ).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?tests\/packs\/math-linked-representations#pack-test-included-topics$/,
  );

  await completionSection.getByRole("link", { name: "Back to Test Hub" }).click();
  await expect(page).toHaveURL(/\/(?:[a-zA-Z-]+\/)?tests$/);
  await expectExpandedCardCompletedState(page, "test-hub-card-pack-math-linked-representations", "Retake pack");

  const updatedSummary = await readHubSummaryCounts(page);
  expect(updatedSummary.completed).toBe(initialSummary.completed + 1);
  expect(updatedSummary.clean).toBe(initialSummary.clean + 1);
  expect(updatedSummary.remaining).toBe(initialSummary.remaining - 1);

  await page.reload();
  await expectExpandedCardCompletedState(page, "test-hub-card-pack-math-linked-representations", "Retake pack");
});

test("pack completion next CTA actually navigates to the next pack", async ({
  page,
}) => {
  const packSlug = "math-linked-representations";
  const packSession = buildPackTestSession(packSlug, {
    locale: "en",
    seed: `pack-test:${packSlug}:en:quiz-attempt:1`,
  });

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);

  await startAssessmentFromHub(
    page,
    "test-hub-card-pack-math-linked-representations",
    "Start pack",
    /\/(?:[a-zA-Z-]+\/)?tests\/packs\/math-linked-representations$/,
  );
  await completeAssessmentWithSingleRetry(page, packSession, 0);

  const completionSection = getCompletionSection(page);
  const nextPack = getNextPublishedPackTestEntry(packSlug)!;
  await completionSection.getByRole("link", { name: "Next pack" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/[a-zA-Z-]+${escapeRegExp(nextPack.testHref)}$|${escapeRegExp(nextPack.testHref)}$`),
  );
  await expect(page.getByRole("heading", { name: nextPack.title })).toBeVisible();
});

test("topic clean completion shows a grounded follow-up section", async ({ page }) => {
  const topicSlug = "oscillations";
  const topicSession = buildTopicTestSession(topicSlug, {
    locale: "en",
    seed: `topic-test:${topicSlug}:en:quiz-attempt:1`,
  });

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);
  await startAssessmentFromHub(
    page,
    "test-hub-card-topic-oscillations",
    "Start topic test",
    /\/(?:[a-zA-Z-]+\/)?tests\/topics\/oscillations$/,
  );
  await completeAssessmentCleanly(page, topicSession);

  const followUp = page.getByTestId("quiz-completion-follow-up");
  await expect(followUp).toBeVisible();
  await expect(followUp).toContainText("What next");
  await expect(followUp.getByRole("link", { name: "Review topic" })).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?concepts\/topics\/oscillations$/,
  );
  await expect(
    followUp.getByRole("link", { name: "Review included concepts" }),
  ).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?tests\/topics\/oscillations#topic-test-included-concepts$/,
  );
  await expect(followUp.getByRole("link", { name: "Back to Test Hub" })).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?tests$/,
  );
});

test("topic Try Again keeps retry primary while showing follow-up options secondarily", async ({
  page,
}) => {
  const topicSlug = "oscillations";
  const topicSession = buildTopicTestSession(topicSlug, {
    locale: "en",
    seed: `topic-test:${topicSlug}:en:quiz-attempt:1`,
  });

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);
  await startAssessmentFromHub(
    page,
    "test-hub-card-topic-oscillations",
    "Start topic test",
    /\/(?:[a-zA-Z-]+\/)?tests\/topics\/oscillations$/,
  );
  await completeAssessmentWithSingleRetry(page, topicSession, 0, {
    onRoundSummary: async () => {
      const followUp = page.getByTestId("quiz-round-summary-follow-up");
      await expect(page.getByRole("button", { name: /^Try Again$/i })).toBeVisible();
      await expect(followUp).toBeVisible();
      await expect(followUp).toContainText("What next");
      await expect(followUp.getByRole("link", { name: "Review topic" })).toBeVisible();
      await expect(
        followUp.getByRole("link", { name: "Review included concepts" }),
      ).toBeVisible();
      await expect(followUp.getByRole("link", { name: "Back to Test Hub" })).toBeVisible();
    },
  });
});

test("pack clean completion shows a grounded follow-up section", async ({ page }) => {
  const packSlug = "math-linked-representations";
  const packSession = buildPackTestSession(packSlug, {
    locale: "en",
    seed: `pack-test:${packSlug}:en:quiz-attempt:1`,
  });
  const nextPack = getNextPublishedPackTestEntry(packSlug)!;

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);
  await startAssessmentFromHub(
    page,
    "test-hub-card-pack-math-linked-representations",
    "Start pack",
    /\/(?:[a-zA-Z-]+\/)?tests\/packs\/math-linked-representations$/,
  );
  await completeAssessmentCleanly(page, packSession);

  const followUp = page.getByTestId("quiz-completion-follow-up");
  await expect(followUp).toBeVisible();
  await expect(followUp).toContainText("What next");
  await expect(followUp.getByRole("link", { name: "Next pack" })).toHaveAttribute(
    "href",
    new RegExp(`/[a-zA-Z-]+${escapeRegExp(nextPack.testHref)}$|${escapeRegExp(nextPack.testHref)}$`),
  );
  await expect(followUp.getByRole("link", { name: "Review subject" })).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?concepts\/subjects\/math$/,
  );
  await expect(followUp.getByRole("link", { name: "Review included topics" })).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?tests\/packs\/math-linked-representations#pack-test-included-topics$/,
  );
  await expect(followUp.getByRole("link", { name: "Back to Test Hub" })).toHaveAttribute(
    "href",
    /\/(?:[a-zA-Z-]+\/)?tests$/,
  );
});

test("pack Try Again keeps retry primary while showing follow-up options secondarily", async ({
  page,
}) => {
  const packSlug = "math-linked-representations";
  const packSession = buildPackTestSession(packSlug, {
    locale: "en",
    seed: `pack-test:${packSlug}:en:quiz-attempt:1`,
  });

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);
  await startAssessmentFromHub(
    page,
    "test-hub-card-pack-math-linked-representations",
    "Start pack",
    /\/(?:[a-zA-Z-]+\/)?tests\/packs\/math-linked-representations$/,
  );
  await completeAssessmentWithSingleRetry(page, packSession, 0, {
    onRoundSummary: async () => {
      const followUp = page.getByTestId("quiz-round-summary-follow-up");
      await expect(page.getByRole("button", { name: /^Try Again$/i })).toBeVisible();
      await expect(followUp).toBeVisible();
      await expect(followUp).toContainText("What next");
      await expect(followUp.getByRole("link", { name: "Next pack" })).toBeVisible();
      await expect(followUp.getByRole("link", { name: "Review subject" })).toBeVisible();
      await expect(followUp.getByRole("link", { name: "Review included topics" })).toBeVisible();
      await expect(followUp.getByRole("link", { name: "Back to Test Hub" })).toBeVisible();
    },
  });
});

test("updates hub summary counts across concept, topic, and pack completions without collapsing their states", async ({
  page,
}) => {
  const concept = getConceptBySlug("basic-circuits");
  const conceptSession = buildConceptQuizSession(concept, {
    seed: `${concept.slug}:en:quiz-attempt:1`,
    locale: "en",
  });
  const topicSession = buildTopicTestSession("oscillations", {
    locale: "en",
    seed: "topic-test:oscillations:en:quiz-attempt:1",
  });
  const packSession = buildPackTestSession("chemistry-connected-systems", {
    locale: "en",
    seed: "pack-test:chemistry-connected-systems:en:quiz-attempt:1",
  });

  await gotoAndExpectOk(page, "/tests");
  await waitForHubSummaryReady(page);
  const initialSummary = await readHubSummaryCounts(page);

  await startAssessmentFromHub(
    page,
    "test-hub-card-concept-basic-circuits",
    "Start concept test",
    /\/(?:[a-zA-Z-]+\/)?tests\/concepts\/basic-circuits$/,
    "keyboard",
  );
  await completeAssessmentWithSingleRetry(page, conceptSession, 0);
  const conceptCompletion = getCompletionSection(page);
  await expect(
    conceptCompletion.getByRole("link", { name: "Back to Test Hub" }),
  ).toHaveAttribute("href", /\/(?:[a-zA-Z-]+\/)?tests$/);
  await conceptCompletion.getByRole("link", { name: "Back to Test Hub" }).click({
    force: true,
  });
  await expect(page).toHaveURL(/\/(?:[a-zA-Z-]+\/)?tests$/);
  await expectExpandedCardCompletedState(page, "test-hub-card-concept-basic-circuits", "Retake concept test");

  await startAssessmentFromHub(
    page,
    "test-hub-card-topic-oscillations",
    "Start topic test",
    /\/(?:[a-zA-Z-]+\/)?tests\/topics\/oscillations$/,
  );
  await completeAssessmentWithSingleRetry(page, topicSession, 0);
  const topicCompletion = getCompletionSection(page);
  await expect(
    topicCompletion.getByRole("link", { name: "Back to Test Hub" }),
  ).toHaveAttribute("href", /\/(?:[a-zA-Z-]+\/)?tests$/);
  await topicCompletion.getByRole("link", { name: "Back to Test Hub" }).click();
  await expect(page).toHaveURL(/\/(?:[a-zA-Z-]+\/)?tests$/);
  await expectExpandedCardCompletedState(page, "test-hub-card-concept-basic-circuits", "Retake concept test");
  await expectExpandedCardCompletedState(page, "test-hub-card-topic-oscillations", "Retake topic test");

  await startAssessmentFromHub(
    page,
    "test-hub-card-pack-chemistry-connected-systems",
    "Start pack",
    /\/(?:[a-zA-Z-]+\/)?tests\/packs\/chemistry-connected-systems$/,
  );
  await completeAssessmentWithSingleRetry(page, packSession, 0);
  const packCompletion = getCompletionSection(page);
  await expect(
    packCompletion.getByRole("link", { name: "Back to Test Hub" }),
  ).toHaveAttribute("href", /\/(?:[a-zA-Z-]+\/)?tests$/);
  await packCompletion.getByRole("link", { name: "Back to Test Hub" }).click();
  await expect(page).toHaveURL(/\/(?:[a-zA-Z-]+\/)?tests$/);
  await expectExpandedCardCompletedState(page, "test-hub-card-concept-basic-circuits", "Retake concept test");
  await expectExpandedCardCompletedState(page, "test-hub-card-topic-oscillations", "Retake topic test");
  await expectExpandedCardCompletedState(page, "test-hub-card-pack-chemistry-connected-systems", "Retake pack");

  const updatedSummary = await readHubSummaryCounts(page);
  expect(updatedSummary.completed).toBe(initialSummary.completed + 3);
  expect(updatedSummary.clean).toBe(initialSummary.clean + 3);
  expect(updatedSummary.remaining).toBe(initialSummary.remaining - 3);

  await expectExpandedCardCompletedState(page, "test-hub-card-concept-basic-circuits", "Retake concept test");
  await expectExpandedCardCompletedState(page, "test-hub-card-topic-oscillations", "Retake topic test");
  await expectExpandedCardCompletedState(page, "test-hub-card-pack-chemistry-connected-systems", "Retake pack");

  await page.reload();
  await expectExpandedCardCompletedState(page, "test-hub-card-concept-basic-circuits", "Retake concept test");
  await expectExpandedCardCompletedState(page, "test-hub-card-topic-oscillations", "Retake topic test");
  await expectExpandedCardCompletedState(page, "test-hub-card-pack-chemistry-connected-systems", "Retake pack");
  const reloadedSummary = await readHubSummaryCounts(page);
  expect(reloadedSummary).toEqual(updatedSummary);
});

test("renders locale-routed assessment surfaces for zh-HK without falling back to missing routes", async ({
  page,
}) => {
  await gotoAndExpectOk(page, "/zh-HK/tests");
  await expect(
    page.getByText("\u6e2c\u9a57\u4e2d\u5fc3").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "\u9078\u4e00\u500b\u6e2c\u9a57\uff0c\u7acb\u5373\u958b\u59cb\u3002",
      level: 1,
    }),
  ).toBeVisible();
  await expect(page.getByText("\u8de8\u4e3b\u984c\u6e2c\u9a57\u5305").first()).toBeVisible();

  await startAssessmentFromHub(
    page,
    "test-hub-card-pack-physics-connected-models",
    "\u958b\u59cb\u6e2c\u9a57\u5305",
    /\/zh-HK\/tests\/packs\/physics-connected-models$/,
  );
  await expect(
    page.getByText("\u8de8\u4e3b\u984c\u6e2c\u9a57\u5305").first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "\u56de\u5230\u5b78\u79d1" })).toBeVisible();
});

test("keeps direct-load topic-test progress honest during hydration on reload", async ({
  page,
}) => {
  await page.addInitScript((snapshot) => {
    window.localStorage.setItem("physica.local-progress.v1", JSON.stringify(snapshot));
  }, {
    version: 1,
    concepts: {},
    topicTests: {
      oscillations: {
        slug: "oscillations",
        completedAt: "2026-04-16T08:05:00.000Z",
        attemptCount: 1,
        lastIncorrectCount: 0,
        lastQuestionCount: 10,
      },
    },
    packTests: {},
  });

  const assertHonestTopicStatus = async () => {
    const panel = getTopicStatusPanel(page);
    await expectImmediateHonestAssessmentStatusPanel(panel, {
      loadingText: "Loading progress",
      completedText: "Completed",
      falseNegativeText: "Not started",
      cleanText: "Perfect score on the latest run.",
    });
  };

  const response = await page.goto("/tests/topics/oscillations", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.ok()).toBeTruthy();
  await assertHonestTopicStatus();

  await expect(getTopicStatusPanel(page).getByText("Completed")).toBeVisible();
  await expect(getTopicStatusPanel(page).getByText("Perfect score on the latest run.")).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await assertHonestTopicStatus();
});

test("keeps direct-load concept quick-test progress honest during hydration on reload", async ({
  page,
}) => {
  await page.addInitScript((snapshot) => {
    window.localStorage.setItem("physica.local-progress.v1", JSON.stringify(snapshot));
  }, {
    version: 1,
    concepts: {
      "basic-circuits": {
        conceptId: "basic-circuits",
        slug: "basic-circuits",
        firstVisitedAt: "2026-04-16T08:00:00.000Z",
        lastVisitedAt: "2026-04-16T08:05:00.000Z",
        completedQuickTestAt: "2026-04-16T08:05:00.000Z",
        quickTestAttemptCount: 1,
        quickTestLastIncorrectCount: 0,
      },
    },
    topicTests: {},
    packTests: {},
  });

  const assertHonestConceptStatus = async () => {
    const card = getConceptProgressCard(page);
    await expectImmediateHonestConceptProgressCard(card, {
      loadingText: "Loading progress",
      positiveText: /Last activity/i,
      falseNegativeText:
        "Start exploring and Open Model Lab will keep this concept's progress on this browser first.",
      staleQuickTestText: "No finished quick test is saved yet.",
    });
  };

  const response = await page.goto("/concepts/basic-circuits?phase=check#quick-test", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.ok()).toBeTruthy();
  await expect(page.getByTestId("quiz-question-stage")).toBeVisible();
  await expect(page.getByTestId("challenge-mode-floating-anchor")).toHaveCount(0);
  await openConceptProgressDisclosure(page);
  await getConceptProgressCard(page).scrollIntoViewIfNeeded();
  await assertHonestConceptStatus();

  await expect(getConceptProgressCard(page)).toContainText(/Last activity/i);

  await closeOpenDisclosurePanels(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("challenge-mode-floating-anchor")).toHaveCount(0);
  await openConceptProgressDisclosure(page);
  await getConceptProgressCard(page).scrollIntoViewIfNeeded();
  await assertHonestConceptStatus();
});

test("keeps direct-load pack progress honest during hydration on reload", async ({
  page,
}) => {
  await page.addInitScript((snapshot) => {
    window.localStorage.setItem("physica.local-progress.v1", JSON.stringify(snapshot));
  }, {
    version: 1,
    concepts: {},
    topicTests: {},
    packTests: {
      "physics-connected-models": {
        slug: "physics-connected-models",
        completedAt: "2026-04-16T08:10:00.000Z",
        attemptCount: 1,
        lastIncorrectCount: 0,
        lastQuestionCount: 16,
      },
    },
  });

  const assertHonestPackStatus = async () => {
    const panel = getPackStatusPanel(page);
    await expectImmediateHonestAssessmentStatusPanel(panel, {
      loadingText: "Loading progress",
      completedText: "Completed",
      falseNegativeText: "Not started",
      cleanText: "Perfect score on the latest run.",
    });
  };

  const response = await page.goto("/tests/packs/physics-connected-models", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.ok()).toBeTruthy();
  await assertHonestPackStatus();

  await expect(getPackStatusPanel(page).getByText("Completed")).toBeVisible();
  await expect(getPackStatusPanel(page).getByText("Perfect score on the latest run.")).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await assertHonestPackStatus();
});

test("keeps reload-time progress UI honest by showing pending or correct state, but not false-negative zero state", async ({
  page,
}) => {
  await page.addInitScript((snapshot) => {
    window.localStorage.setItem("physica.local-progress.v1", JSON.stringify(snapshot));
  }, {
    version: 1,
    concepts: {
      "basic-circuits": {
        slug: "basic-circuits",
        completedQuickTestAt: "2026-04-16T08:00:00.000Z",
        quickTestAttemptCount: 1,
        quickTestLastIncorrectCount: 0,
      },
    },
    topicTests: {
      oscillations: {
        slug: "oscillations",
        completedAt: "2026-04-16T08:05:00.000Z",
        attemptCount: 1,
        lastIncorrectCount: 0,
        lastQuestionCount: 10,
      },
    },
    packTests: {
      "physics-connected-models": {
        slug: "physics-connected-models",
        completedAt: "2026-04-16T08:10:00.000Z",
        attemptCount: 1,
        lastIncorrectCount: 0,
        lastQuestionCount: 16,
      },
    },
  });

  const assertImmediateHonestState = async () => {
    await expandFullTestCatalogIfAvailable(page);

    const completedText = (await page.getByTestId("test-hub-completed-count").textContent())?.trim();
    const cleanText = (await page.getByTestId("test-hub-clean-count").textContent())?.trim();

    expect(["\u2014", "3"]).toContain(completedText);
    expect(["\u2014", "3"]).toContain(cleanText);
    expect(
      (await page.getByTestId("test-hub-card-concept-basic-circuits").textContent())?.includes(
        "Not started",
      ) ?? false,
    ).toBe(false);
    expect(
      (await page.getByTestId("test-hub-card-topic-oscillations").textContent())?.includes(
        "Not started",
      ) ?? false,
    ).toBe(false);
    expect(
      (await page.getByTestId("test-hub-card-pack-physics-connected-models").textContent())?.includes(
        "Not started",
      ) ?? false,
    ).toBe(false);
  };

  const response = await page.goto("/tests", { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();
  await assertImmediateHonestState();

  await expectExpandedCardCompletedState(page, "test-hub-card-concept-basic-circuits", "Retake concept test");
  await expectExpandedCardCompletedState(page, "test-hub-card-topic-oscillations", "Retake topic test");
  await expectExpandedCardCompletedState(page, "test-hub-card-pack-physics-connected-models", "Retake pack");

  await page.reload({ waitUntil: "domcontentloaded" });
  await assertImmediateHonestState();
});
