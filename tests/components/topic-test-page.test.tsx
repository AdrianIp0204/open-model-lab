// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildTopicAssessmentSessionDescriptor,
  resetAssessmentSessionStoreForTests,
  saveAssessmentSession,
} from "@/lib/assessment-sessions";
import { TopicTestPage } from "@/components/tests/TopicTestPage";
import { getTopicDiscoverySummaryBySlug } from "@/lib/content";
import { localConceptProgressStore, recordTopicTestStarted } from "@/lib/progress";
import {
  buildTopicTestSession,
  getPublishedPackTestCatalog,
  getPublishedTopicTestCatalog,
} from "@/lib/test-hub";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function promptLead(prompt: string) {
  return prompt.split("\n")[0] ?? prompt;
}

function getAnswerButtons() {
  return screen.getAllByRole("button").filter((button) => button.hasAttribute("aria-pressed"));
}

async function clickChoice(
  user: ReturnType<typeof userEvent.setup>,
  question: { choices: Array<{ id: string; label: string }> },
  choiceId: string,
) {
  const choiceIndex = question.choices.findIndex((choice) => choice.id === choiceId);

  if (choiceIndex === -1) {
    throw new Error(`Missing choice "${choiceId}".`);
  }

  await user.click(getAnswerButtons()[choiceIndex]!);
}

describe("TopicTestPage", () => {
  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
    resetAssessmentSessionStoreForTests();
    globalThis.__TEST_LOCALE__ = undefined;
  });

  it("reuses the shared retry flow and surfaces topic-specific completion actions", async () => {
    const user = userEvent.setup();
    const entry = getPublishedTopicTestCatalog().entries.find(
      (candidate) => candidate.topicSlug === "circuits",
    )!;
    const topic = getTopicDiscoverySummaryBySlug(entry.topicSlug);
    const session = buildTopicTestSession(entry.topicSlug, {
      locale: "en",
      seed: `topic-test:${entry.topicSlug}:en:quiz-attempt:1`,
    });
    const bridgeQuestionIndex = session.questions.findIndex((question) =>
      question.canonicalQuestionId.includes("topic:circuits:authored:parallel-branch-removal"),
    );
    const bridgeQuestion = session.questions[bridgeQuestionIndex]!;
    const wrongChoice = bridgeQuestion.choices.find(
      (choice) => choice.id !== bridgeQuestion.correctChoiceId,
    )!;

    render(<TopicTestPage entry={entry} topic={topic} />);

    for (let index = 0; index < bridgeQuestionIndex; index += 1) {
      const question = session.questions[index]!;
      await clickChoice(user, question, question.correctChoiceId);
      await user.click(screen.getByRole("button", { name: /next question/i }));
    }

    expect(
      screen.getByRole("heading", {
        name: new RegExp(escapeRegExp(promptLead(bridgeQuestion.prompt)), "i"),
      }),
    ).toBeInTheDocument();
    await clickChoice(user, bridgeQuestion, wrongChoice.id);
    await user.click(screen.getByRole("button", { name: /next question/i }));

    for (let index = bridgeQuestionIndex + 1; index < session.questions.length; index += 1) {
      const question = session.questions[index]!;
      await clickChoice(user, question, question.correctChoiceId);
      await user.click(
        screen.getByRole("button", {
          name: index === session.questions.length - 1 ? /finish round/i : /next question/i,
        }),
      );
    }

    expect(screen.getByRole("heading", { name: "Try Again" })).toBeInTheDocument();
    const roundSummaryFollowUp = screen.getByTestId("quiz-round-summary-follow-up");
    expect(roundSummaryFollowUp).toHaveTextContent("What next");
    expect(roundSummaryFollowUp).toHaveTextContent("Review topic");
    expect(roundSummaryFollowUp).toHaveTextContent("Review included concepts");
    expect(roundSummaryFollowUp).toHaveTextContent("Back to Test Hub");
    expect(screen.getByRole("button", { name: /^Try Again$/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Try Again$/i }));
    expect(
      screen.getByRole("heading", {
        name: new RegExp(escapeRegExp(promptLead(bridgeQuestion.prompt)), "i"),
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 1")).toBeInTheDocument();

    await clickChoice(user, bridgeQuestion, bridgeQuestion.correctChoiceId);
    await user.click(screen.getByRole("button", { name: /finish round/i }));

    expect(
      screen.getByText(/you have finished every question in this topic test/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retake test/i })).toBeInTheDocument();
    const completionFollowUp = screen.getByTestId("quiz-completion-follow-up");
    expect(completionFollowUp).toHaveTextContent("What next");
    expect(
      screen
        .getAllByRole("link", { name: /review topic/i })
        .every((link) => link.getAttribute("href") === "/concepts/topics/circuits"),
    ).toBe(true);
    expect(screen.getByRole("link", { name: /review included concepts/i })).toHaveAttribute(
      "href",
      "/tests/topics/circuits#topic-test-included-concepts",
    );
    expect(
      screen
        .getAllByRole("link", { name: /back to test hub/i })
        .every((link) => link.getAttribute("href") === "/tests"),
    ).toBe(true);
    const followOnPack = getPublishedPackTestCatalog().entries.find((item) =>
      item.includedTopicSlugs.includes(entry.topicSlug),
    );
    if (followOnPack) {
      expect(
        screen.getByRole("link", {
          name: new RegExp(escapeRegExp(`Follow-on pack: ${followOnPack.title}`), "i"),
        }),
      ).toHaveAttribute("href", followOnPack.testHref);
    } else {
      expect(screen.getByRole("link", { name: /next topic test/i })).toBeInTheDocument();
    }
  }, 10_000);

  it("passes raw included-concept links to the locale-aware Link", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    const entry = getPublishedTopicTestCatalog().entries.find(
      (candidate) => candidate.topicSlug === "circuits",
    )!;
    const topic = getTopicDiscoverySummaryBySlug(entry.topicSlug);
    const firstConcept = topic.concepts[0]!;

    render(<TopicTestPage entry={entry} topic={topic} />);

    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => Boolean(href));

    expect(hrefs).toContain(`/concepts/topics/${entry.topicSlug}`);
    expect(hrefs).toContain(`/tests`);
    expect(hrefs).toContain(`/concepts/${firstConcept.slug}`);
    expect(hrefs).toContain(`/tests/concepts/${firstConcept.slug}`);
    expect(hrefs.some((href) => href.includes("/zh-HK/zh-HK/"))).toBe(false);
  });

  it("shows follow-up options after a clean topic-test completion without Try Again", async () => {
    const user = userEvent.setup();
    const entry = getPublishedTopicTestCatalog().entries.find(
      (candidate) => candidate.topicSlug === "circuits",
    )!;
    const topic = getTopicDiscoverySummaryBySlug(entry.topicSlug);
    const session = buildTopicTestSession(entry.topicSlug, {
      locale: "en",
      seed: `topic-test:${entry.topicSlug}:en:quiz-attempt:1`,
    });

    render(<TopicTestPage entry={entry} topic={topic} />);

    for (let index = 0; index < session.questions.length; index += 1) {
      const question = session.questions[index]!;
      await clickChoice(user, question, question.correctChoiceId);
      await user.click(
        screen.getByRole("button", {
          name: index === session.questions.length - 1 ? /finish round/i : /next question/i,
        }),
      );
    }

    const followUp = screen.getByTestId("quiz-completion-follow-up");
    expect(followUp).toHaveTextContent("What next");
    expect(followUp).toHaveTextContent("Review topic");
    expect(followUp).toHaveTextContent("Review included concepts");
    expect(followUp).toHaveTextContent("Back to Test Hub");
  });

  it("restores an in-progress topic test exactly after remount", async () => {
    const user = userEvent.setup();
    const entry = getPublishedTopicTestCatalog().entries.find(
      (candidate) => candidate.topicSlug === "circuits",
    )!;
    const topic = getTopicDiscoverySummaryBySlug(entry.topicSlug);
    const session = buildTopicTestSession(entry.topicSlug, {
      locale: "en",
      seed: `topic-test:${entry.topicSlug}:en:quiz-attempt:1`,
    });
    const firstQuestion = session.questions[0]!;
    const wrongChoice = firstQuestion.choices.find(
      (choice) => choice.id !== firstQuestion.correctChoiceId,
    )!;
    const rendered = render(<TopicTestPage entry={entry} topic={topic} />);

    expect(screen.getByRole("heading", {
      name: new RegExp(escapeRegExp(promptLead(firstQuestion.prompt)), "i"),
    })).toBeInTheDocument();
    await clickChoice(user, firstQuestion, wrongChoice.id);
    expect(
      getAnswerButtons()[firstQuestion.choices.findIndex((choice) => choice.id === wrongChoice.id)],
    ).toHaveAttribute("aria-pressed", "true");

    rendered.unmount();
    render(<TopicTestPage entry={entry} topic={topic} />);

    expect(screen.getByRole("heading", {
      name: new RegExp(escapeRegExp(promptLead(firstQuestion.prompt)), "i"),
    })).toBeInTheDocument();
    expect(
      getAnswerButtons()[firstQuestion.choices.findIndex((choice) => choice.id === wrongChoice.id)],
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("shows resume-aware saved-result copy when an exact topic session exists", () => {
    const entry = getPublishedTopicTestCatalog().entries.find(
      (candidate) => candidate.topicSlug === "circuits",
    )!;
    const topic = getTopicDiscoverySummaryBySlug(entry.topicSlug);
    const session = buildTopicTestSession(entry.topicSlug, {
      locale: "en",
      seed: `topic-test:${entry.topicSlug}:en:quiz-attempt:1`,
    });

    recordTopicTestStarted(entry.topicSlug);
    saveAssessmentSession(
      buildTopicAssessmentSessionDescriptor(entry, "en"),
      {
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
      },
    );

    render(<TopicTestPage entry={entry} topic={topic} />);

    expect(screen.getByTestId("topic-test-status-panel")).toHaveTextContent("Saved on this device");
    expect(screen.getByTestId("topic-test-status-panel")).toHaveTextContent(
      "Your last answer is saved on this device.",
    );
  });
});
