// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildPackAssessmentSessionDescriptor,
  resetAssessmentSessionStoreForTests,
  saveAssessmentSession,
} from "@/lib/assessment-sessions";
import { PackTestPage } from "@/components/tests/PackTestPage";
import { getSubjectDiscoverySummaryBySlug, getTopicDiscoverySummaryBySlug } from "@/lib/content";
import { localConceptProgressStore, recordPackTestStarted } from "@/lib/progress";
import { buildPackTestSession, getPublishedPackTestCatalog } from "@/lib/test-hub";

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

describe("PackTestPage", () => {
  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
    resetAssessmentSessionStoreForTests();
    globalThis.__TEST_LOCALE__ = undefined;
  });

  it("reuses the shared retry flow and surfaces pack-specific completion actions", async () => {
    const user = userEvent.setup();
    const entry = getPublishedPackTestCatalog().entries.find(
      (candidate) => candidate.packSlug === "physics-connected-models",
    )!;
    const subject = getSubjectDiscoverySummaryBySlug(entry.subjectSlug);
    const includedTopics = entry.includedTopicSlugs.map((topicSlug) =>
      getTopicDiscoverySummaryBySlug(topicSlug),
    );
    const session = buildPackTestSession(entry.packSlug, {
      locale: "en",
      seed: `pack-test:${entry.packSlug}:en:quiz-attempt:1`,
    });
    const bridgeQuestionIndex = session.questions.findIndex((question) =>
      question.canonicalQuestionId.startsWith(`pack:${entry.packSlug}:authored:`),
    );
    const bridgeQuestion = session.questions[bridgeQuestionIndex]!;
    const wrongChoice = bridgeQuestion.choices.find(
      (choice) => choice.id !== bridgeQuestion.correctChoiceId,
    )!;

    render(
      <PackTestPage
        entry={entry}
        subject={subject}
        includedTopics={includedTopics}
      />,
    );

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
    expect(roundSummaryFollowUp).toHaveTextContent("Review subject");
    expect(roundSummaryFollowUp).toHaveTextContent("Review included topics");
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

    expect(screen.getByText(/you have finished every question in this pack/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retake test/i })).toBeInTheDocument();
    const followUp = screen.getByTestId("quiz-completion-follow-up");
    expect(followUp).toHaveTextContent("What next");
    expect(screen.getByRole("link", { name: /next pack/i })).toHaveAttribute(
      "href",
      "/tests/packs/math-linked-representations",
    );
    expect(
      screen
        .getAllByRole("link", { name: /review subject/i })
        .every((link) => link.getAttribute("href") === "/concepts/subjects/physics"),
    ).toBe(true);
    expect(screen.getByRole("link", { name: /review included topics/i })).toHaveAttribute(
      "href",
      "/tests/packs/physics-connected-models#pack-test-included-topics",
    );
    expect(
      screen
        .getAllByRole("link", { name: /back to test hub/i })
        .every((link) => link.getAttribute("href") === "/tests"),
    ).toBe(true);
  }, 10_000);

  it("passes raw included-topic links to the locale-aware Link", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    const entry = getPublishedPackTestCatalog().entries.find(
      (candidate) => candidate.packSlug === "physics-connected-models",
    )!;
    const subject = getSubjectDiscoverySummaryBySlug(entry.subjectSlug);
    const includedTopics = entry.includedTopicSlugs.map((topicSlug) =>
      getTopicDiscoverySummaryBySlug(topicSlug),
    );
    const firstTopic = includedTopics[0]!;

    render(
      <PackTestPage
        entry={entry}
        subject={subject}
        includedTopics={includedTopics}
      />,
    );

    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => Boolean(href));

    expect(hrefs).toContain(`/concepts/subjects/${entry.subjectSlug}`);
    expect(hrefs).toContain(`/tests`);
    expect(hrefs).toContain(`/concepts/topics/${firstTopic.slug}`);
    expect(hrefs.some((href) => href.includes("/zh-HK/zh-HK/"))).toBe(false);
  });

  it("shows follow-up options after a clean pack completion without Try Again", async () => {
    const user = userEvent.setup();
    const entry = getPublishedPackTestCatalog().entries.find(
      (candidate) => candidate.packSlug === "physics-connected-models",
    )!;
    const subject = getSubjectDiscoverySummaryBySlug(entry.subjectSlug);
    const includedTopics = entry.includedTopicSlugs.map((topicSlug) =>
      getTopicDiscoverySummaryBySlug(topicSlug),
    );
    const session = buildPackTestSession(entry.packSlug, {
      locale: "en",
      seed: `pack-test:${entry.packSlug}:en:quiz-attempt:1`,
    });

    render(
      <PackTestPage
        entry={entry}
        subject={subject}
        includedTopics={includedTopics}
      />,
    );

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
    expect(followUp).toHaveTextContent("Review subject");
    expect(followUp).toHaveTextContent("Review included topics");
    expect(followUp).toHaveTextContent("Back to Test Hub");
    expect(screen.getByRole("link", { name: /next pack/i })).toHaveAttribute(
      "href",
      "/tests/packs/math-linked-representations",
    );
  });

  it("restores an in-progress pack exactly after remount", async () => {
    const user = userEvent.setup();
    const entry = getPublishedPackTestCatalog().entries.find(
      (candidate) => candidate.packSlug === "physics-connected-models",
    )!;
    const subject = getSubjectDiscoverySummaryBySlug(entry.subjectSlug);
    const includedTopics = entry.includedTopicSlugs.map((topicSlug) =>
      getTopicDiscoverySummaryBySlug(topicSlug),
    );
    const session = buildPackTestSession(entry.packSlug, {
      locale: "en",
      seed: `pack-test:${entry.packSlug}:en:quiz-attempt:1`,
    });
    const firstQuestion = session.questions[0]!;
    const wrongChoice = firstQuestion.choices.find(
      (choice) => choice.id !== firstQuestion.correctChoiceId,
    )!;
    const rendered = render(
      <PackTestPage entry={entry} subject={subject} includedTopics={includedTopics} />,
    );

    expect(screen.getByText(/Two vectors have the same magnitude\./i)).toBeInTheDocument();
    await clickChoice(user, firstQuestion, wrongChoice.id);
    expect(
      getAnswerButtons()[firstQuestion.choices.findIndex((choice) => choice.id === wrongChoice.id)],
    ).toHaveAttribute("aria-pressed", "true");

    rendered.unmount();
    render(<PackTestPage entry={entry} subject={subject} includedTopics={includedTopics} />);

    expect(screen.getByText(/Two vectors have the same magnitude\./i)).toBeInTheDocument();
    expect(
      getAnswerButtons()[firstQuestion.choices.findIndex((choice) => choice.id === wrongChoice.id)],
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("shows resume-aware saved-result copy when an exact pack session exists", () => {
    const entry = getPublishedPackTestCatalog().entries.find(
      (candidate) => candidate.packSlug === "physics-connected-models",
    )!;
    const subject = getSubjectDiscoverySummaryBySlug(entry.subjectSlug);
    const includedTopics = entry.includedTopicSlugs.map((topicSlug) =>
      getTopicDiscoverySummaryBySlug(topicSlug),
    );
    const session = buildPackTestSession(entry.packSlug, {
      locale: "en",
      seed: `pack-test:${entry.packSlug}:en:quiz-attempt:1`,
    });

    recordPackTestStarted(entry.packSlug);
    saveAssessmentSession(
      buildPackAssessmentSessionDescriptor(entry, "en"),
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

    render(
      <PackTestPage
        entry={entry}
        subject={subject}
        includedTopics={includedTopics}
      />,
    );

    expect(screen.getByTestId("pack-test-status-panel")).toHaveTextContent("Saved on this device");
    expect(screen.getByTestId("pack-test-status-panel")).toHaveTextContent(
      "Your last answer is saved on this device.",
    );
  });
});
