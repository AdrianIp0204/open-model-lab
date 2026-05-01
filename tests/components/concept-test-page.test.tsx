// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildConceptAssessmentSessionDescriptor,
  resetAssessmentSessionStoreForTests,
  saveAssessmentSession,
} from "@/lib/assessment-sessions";
import {
  ConceptLearningBridgeProvider,
  useConceptLearningBridge,
} from "@/components/concepts/ConceptLearningBridge";
import { ConceptTestPage } from "@/components/tests/ConceptTestPage";
import { getConceptBySlug } from "@/lib/content";
import { localizeConceptContent } from "@/lib/i18n/concept-content";
import {
  localConceptProgressStore,
  recordQuickTestStarted,
} from "@/lib/progress";
import { buildConceptQuizSession } from "@/lib/quiz";
import { getPublishedConceptTestCatalog } from "@/lib/test-hub";

function QuickTestBridgeHarness() {
  const { registerQuickTestHandler } = useConceptLearningBridge();

  useEffect(() => {
    registerQuickTestHandler({
      applyAction: () => {},
      clearAction: () => {},
    });

    return () => registerQuickTestHandler(null);
  }, [registerQuickTestHandler]);

  return null;
}

function renderConceptTestPage(
  concept: ReturnType<typeof getConceptBySlug>,
  entry: ReturnType<typeof getPublishedConceptTestCatalog>["entries"][number],
) {
  return render(
    <ConceptLearningBridgeProvider>
      <QuickTestBridgeHarness />
      <ConceptTestPage concept={concept} entry={entry} />
    </ConceptLearningBridgeProvider>,
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function promptLead(prompt: string) {
  return prompt.split("\n")[0] ?? prompt;
}

function getAnswerButtons() {
  return screen.getAllByRole("button").filter((button) => button.hasAttribute("aria-pressed"));
}

function getChoiceLabel(
  question: { choices: Array<{ id: string; label: string }> },
  choiceId: string,
) {
  const choice = question.choices.find((item) => item.id === choiceId);

  if (!choice) {
    throw new Error(`Missing choice "${choiceId}".`);
  }

  return choice.label;
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

describe("ConceptTestPage", () => {
  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
    resetAssessmentSessionStoreForTests();
    globalThis.__TEST_LOCALE__ = undefined;
  });

  it("renders a standalone concept-test surface with focused navigation", () => {
    const concept = getConceptBySlug("basic-circuits");
    const entry = getPublishedConceptTestCatalog().entries.find(
      (candidate) => candidate.conceptSlug === concept.slug,
    )!;

    renderConceptTestPage(concept, entry);

    expect(screen.getByTestId("standalone-concept-test-page")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Basic Circuits concept test" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review concept" })).toHaveAttribute(
      "href",
      "/concepts/basic-circuits#interactive-lab",
    );
    expect(screen.getByRole("link", { name: "Back to Test Hub" })).toHaveAttribute(
      "href",
      "/tests",
    );
    expect(
      screen.getByText(/Choose an answer to check your thinking, then use the feedback before moving on/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Use the live bench to test the result before moving on/i),
    ).not.toBeInTheDocument();
  });

  it("uses localized concept quick-test copy on localized standalone routes", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    const concept = localizeConceptContent(
      getConceptBySlug("sound-waves-longitudinal-motion"),
      "zh-HK",
    );
    const entry = getPublishedConceptTestCatalog().entries.find(
      (candidate) => candidate.conceptSlug === concept.slug,
    )!;

    renderConceptTestPage(concept, entry);

    expect(screen.getAllByText(/使用連在一起的粒子和壓力視圖/).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", {
        name: /哪個敘述最能描述此聲波模型中，介質粒子的運動和波的傳播有甚麼不同/u,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Which statement best describes the difference between parcel motion/i),
    ).not.toBeInTheDocument();
  });

  it("shows shared resume-aware saved-result copy when a concept session exists", () => {
    const concept = getConceptBySlug("basic-circuits");
    const entry = getPublishedConceptTestCatalog().entries.find(
      (candidate) => candidate.conceptSlug === concept.slug,
    )!;
    const session = buildConceptQuizSession(concept, {
      seed: `${concept.slug}:en:quiz-attempt:1`,
      locale: "en",
    });

    recordQuickTestStarted({
      id: concept.id,
      slug: concept.slug,
      title: concept.title,
    });
    saveAssessmentSession(
      buildConceptAssessmentSessionDescriptor(concept, "en"),
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

    renderConceptTestPage(concept, entry);

    expect(screen.getByTestId("concept-test-status-panel")).toHaveTextContent("Saved on this device");
    expect(screen.getByTestId("concept-test-status-panel")).toHaveTextContent(
      "Your last answer is saved on this device.",
    );
  });

  it("restores an in-progress standalone concept test after remount", async () => {
    const user = userEvent.setup();
    const concept = getConceptBySlug("escape-velocity");
    const entry = getPublishedConceptTestCatalog().entries.find(
      (candidate) => candidate.conceptSlug === concept.slug,
    )!;
    const session = buildConceptQuizSession(concept, {
      seed: `${concept.slug}:en:quiz-attempt:1`,
      locale: "en",
    });
    const generatedIndex = session.questions.findIndex((question) => question.kind === "generated");
    const targetQuestion = session.questions[generatedIndex]!;
    const wrongChoice = targetQuestion.choices.find(
      (choice) => choice.id !== targetQuestion.correctChoiceId,
    )!;
    const rendered = renderConceptTestPage(concept, entry);

    for (let index = 0; index < generatedIndex; index += 1) {
      const question = session.questions[index]!;
      await clickChoice(user, question, question.correctChoiceId);
      await user.click(screen.getByRole("button", { name: /next question/i }));
    }

    expect(
      screen.getByRole("heading", {
        name: new RegExp(escapeRegExp(promptLead(targetQuestion.prompt)), "i"),
      }),
    ).toBeInTheDocument();
    await clickChoice(user, targetQuestion, wrongChoice.id);

    rendered.unmount();
    renderConceptTestPage(concept, entry);

    expect(
      screen.getByRole("heading", {
        name: new RegExp(escapeRegExp(promptLead(targetQuestion.prompt)), "i"),
      }),
    ).toBeInTheDocument();
    expect(
      getAnswerButtons()[targetQuestion.choices.findIndex((choice) => choice.id === wrongChoice.id)],
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("renders generated givens with readable symbols on the standalone surface", async () => {
    const user = userEvent.setup();
    const concept = getConceptBySlug("simple-harmonic-motion");
    const entry = getPublishedConceptTestCatalog().entries.find(
      (candidate) => candidate.conceptSlug === concept.slug,
    )!;
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
      throw new Error("Expected generated SHM question with omega/phi givens.");
    }

    renderConceptTestPage(concept, entry);

    for (let index = 0; index < generatedIndex; index += 1) {
      const question = session.questions[index]!;
      await clickChoice(user, question, question.correctChoiceId);
      await user.click(screen.getByRole("button", { name: /next question/i }));
    }

    expect(screen.getByTestId("quiz-question-stage")).toHaveTextContent(/[ωϕφ]/);
    expect(screen.queryByText(/\\omega/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\\phi/)).not.toBeInTheDocument();
  });

  it("passes raw hero action hrefs to the locale-aware Link", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    const concept = getConceptBySlug("basic-circuits");
    const entry = getPublishedConceptTestCatalog().entries.find(
      (candidate) => candidate.conceptSlug === concept.slug,
    )!;

    renderConceptTestPage(concept, entry);

    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => Boolean(href));

    expect(hrefs).toContain("/concepts/basic-circuits#interactive-lab");
    expect(hrefs).toContain("/tests");
    expect(hrefs.some((href) => href.includes("/zh-HK/zh-HK/"))).toBe(false);
  });

  it("shows multiple grounded follow-up options after a clean standalone completion", async () => {
    const user = userEvent.setup();
    const concept = getConceptBySlug("basic-circuits");
    const entry = getPublishedConceptTestCatalog().entries.find(
      (candidate) => candidate.conceptSlug === concept.slug,
    )!;
    const session = buildConceptQuizSession(concept, {
      seed: `${concept.slug}:en:quiz-attempt:1`,
      locale: "en",
    });

    renderConceptTestPage(concept, entry);

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
    expect(followUp).toBeInTheDocument();
    expect(followUp).toHaveTextContent("What next");
    expect(followUp).toHaveTextContent("Review concept");
    expect(followUp).toHaveTextContent("Back to Test Hub");
    expect(screen.getByRole("link", { name: /^Next test$/i })).toHaveAttribute(
      "href",
      "/tests/concepts/power-energy-circuits",
    );
  });

  it("keeps Try Again primary while still showing follow-up options on the standalone surface", async () => {
    const user = userEvent.setup();
    const concept = getConceptBySlug("basic-circuits");
    const entry = getPublishedConceptTestCatalog().entries.find(
      (candidate) => candidate.conceptSlug === concept.slug,
    )!;
    const firstQuestion = concept.quickTest.questions[0]!;
    const wrongChoice = firstQuestion.choices.find(
      (choice) => choice.id !== firstQuestion.correctChoiceId,
    )!;

    renderConceptTestPage(concept, entry);

    await user.click(
      screen.getByRole("button", {
        name: new RegExp(escapeRegExp(wrongChoice.label), "i"),
      }),
    );
    await user.click(screen.getByRole("button", { name: /next question/i }));

    for (let index = 1; index < concept.quickTest.questions.length; index += 1) {
      const question = concept.quickTest.questions[index]!;
      const correctChoiceLabel = getChoiceLabel(question, question.correctChoiceId);

      await user.click(
        screen.getByRole("button", {
          name: new RegExp(escapeRegExp(correctChoiceLabel), "i"),
        }),
      );
      await user.click(
        screen.getByRole("button", {
          name:
            index === concept.quickTest.questions.length - 1
              ? /finish round/i
              : /next question/i,
        }),
      );
    }

    expect(screen.getByRole("button", { name: /^Try Again$/i })).toBeInTheDocument();
    const followUp = screen.getByTestId("quiz-round-summary-follow-up");
    expect(followUp).toBeInTheDocument();
    expect(followUp).toHaveTextContent("What next");
    expect(followUp).toHaveTextContent("Review concept");
    expect(followUp).toHaveTextContent("Back to Test Hub");
    expect(screen.getByRole("link", { name: /^Next test$/i })).toHaveAttribute(
      "href",
      "/tests/concepts/power-energy-circuits",
    );
  });
});
