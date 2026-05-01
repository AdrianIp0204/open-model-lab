import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAssessmentSessionStorageEntryKey,
  buildConceptAssessmentSessionDescriptor,
  localAssessmentSessionStore,
  resetAssessmentSessionStoreForTests,
} from "@/lib/assessment-sessions";
import { QuickTestSection } from "@/components/concepts/QuickTestSection";
import {
  ConceptLearningBridgeProvider,
  useConceptLearningBridge,
} from "@/components/concepts/ConceptLearningBridge";
import { getConceptBySlug } from "@/lib/content";
import { localConceptProgressStore } from "@/lib/progress";
import { buildConceptQuizSession } from "@/lib/quiz";

function QuickTestBridgeHarness({
  onApplyAction,
}: {
  onApplyAction?: (action: unknown) => void;
}) {
  const { registerQuickTestHandler } = useConceptLearningBridge();

  useEffect(() => {
    registerQuickTestHandler({
      applyAction: (action) => onApplyAction?.(action),
      clearAction: () => {},
    });

    return () => registerQuickTestHandler(null);
  }, [onApplyAction, registerQuickTestHandler]);

  return null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function promptLead(prompt: string) {
  return prompt.split("\n")[0] ?? prompt;
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

function conceptQuizProps(concept: ReturnType<typeof getConceptBySlug>) {
  return {
    id: concept.id,
    slug: concept.slug,
    title: concept.title,
    quickTest: concept.quickTest,
    sections: concept.sections,
    simulation: concept.simulation,
    graphs: concept.graphs,
    variableLinks: concept.variableLinks,
  };
}

function renderQuickTest(
  concept: ReturnType<typeof getConceptBySlug>,
  onApplyAction?: (action: unknown) => void,
  completionNav?: {
    hubHref: string;
    reviewHref: string;
    nextTest?: { href: string; title: string } | null;
  } | null,
) {
  return render(
    <ConceptLearningBridgeProvider>
      <QuickTestBridgeHarness onApplyAction={onApplyAction} />
      <QuickTestSection concept={conceptQuizProps(concept)} completionNav={completionNav} />
    </ConceptLearningBridgeProvider>,
  );
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

describe("QuickTestSection", () => {
  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
    resetAssessmentSessionStoreForTests();
    globalThis.__TEST_LOCALE__ = undefined;
  });

  it("reveals stronger feedback and can trigger a show-me action in a hybrid quiz", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("simple-harmonic-motion");
    const firstQuestion = concept.quickTest.questions[0]!;
    const wrongChoiceLabel = firstQuestion.choices.find(
      (choice) => choice.id !== firstQuestion.correctChoiceId,
    )!.label;

    renderQuickTest(concept, onApplyAction);

    expect(screen.getByText("Variable effect")).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 5")).toBeInTheDocument();
    expect(
      screen.getByText(/Use the live bench to test the result before moving on/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("quiz-answer-status")).not.toBeInTheDocument();
    expect(screen.queryByText(/Why your choice falls short/i)).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: new RegExp(escapeRegExp(wrongChoiceLabel), "i"),
      }),
    );

    expect(screen.getAllByText("Not quite")).toHaveLength(1);
    expect(screen.queryByTestId("quiz-answer-status")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Wider turning points would require a larger amplitude/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /show fast cycle/i }));
    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "fast-cycle",
        highlightedControlIds: ["omega"],
      }),
    );
    expect(screen.getByTestId("quiz-simulation-status")).toHaveTextContent(
      "Shown in the live simulation",
    );
    expect(screen.getByText(/Watch the peaks arrive sooner/i)).toBeInTheDocument();
  });

  it("completes a fully static five-question quiz cleanly", async () => {
    const user = userEvent.setup();
    const concept = getConceptBySlug("basic-circuits");

    renderQuickTest(concept, undefined, {
      hubHref: "/tests",
      reviewHref: `/concepts/${concept.slug}#interactive-lab`,
      nextTest: {
        href: "/tests/concepts/equivalent-resistance",
        title: "Equivalent Resistance",
      },
    });

    expect(screen.getByText("Question 1 of 5")).toBeInTheDocument();

    for (let index = 0; index < concept.quickTest.questions.length; index += 1) {
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

    expect(screen.getByText("Completed.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retake test/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /next test/i })).toHaveAttribute(
      "href",
      "/tests/concepts/equivalent-resistance",
    );
    expect(screen.getByRole("link", { name: /review concept/i })).toHaveAttribute(
      "href",
      `/concepts/${concept.slug}#interactive-lab`,
    );
    expect(screen.getByRole("link", { name: /back to test hub/i })).toHaveAttribute(
      "href",
      "/tests",
    );
  });

  it("replays only missed questions in the Try Again round", async () => {
    const user = userEvent.setup();
    const concept = getConceptBySlug("basic-circuits");
    const firstQuestion = concept.quickTest.questions[0]!;
    const missedPrompt = firstQuestion.prompt;
    const wrongChoice = firstQuestion.choices.find(
      (choice) => choice.id !== firstQuestion.correctChoiceId,
    )!;

    renderQuickTest(concept);

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

    expect(screen.getByRole("heading", { name: "Try Again" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Try Again$/i }));

    expect(screen.getByText("Try Again")).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 1")).toBeInTheDocument();
    expect(screen.getByText(missedPrompt)).toBeInTheDocument();
    expect(screen.queryByText(concept.quickTest.questions[1]!.prompt)).not.toBeInTheDocument();
  });

  it("passes raw completion navigation hrefs to the locale-aware Link", async () => {
    const user = userEvent.setup();
    const concept = getConceptBySlug("basic-circuits");

    globalThis.__TEST_LOCALE__ = "zh-HK";
    renderQuickTest(concept, undefined, {
      hubHref: "/tests",
      reviewHref: `/concepts/${concept.slug}#interactive-lab`,
      nextTest: {
        href: "/tests/concepts/equivalent-resistance",
        title: "Equivalent Resistance",
      },
    });

    for (let index = 0; index < concept.quickTest.questions.length; index += 1) {
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
              ? /完成這一輪/i
              : /下一題/i,
        }),
      );
    }

    const completionHrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => Boolean(href));

    expect(completionHrefs).toContain("/tests/concepts/equivalent-resistance");
    expect(completionHrefs).toContain(`/concepts/${concept.slug}#interactive-lab`);
    expect(completionHrefs).toContain("/tests");
    expect(completionHrefs.some((href) => href.includes("/zh-HK/zh-HK/"))).toBe(false);
  });

  it("localizes the Try Again round in zh-HK", async () => {
    const user = userEvent.setup();
    const concept = getConceptBySlug("basic-circuits");
    const firstQuestion = concept.quickTest.questions[0]!;
    const wrongChoice = firstQuestion.choices.find(
      (choice) => choice.id !== firstQuestion.correctChoiceId,
    )!;

    globalThis.__TEST_LOCALE__ = "zh-HK";
    renderQuickTest(concept);

    await user.click(
      screen.getByRole("button", {
        name: new RegExp(escapeRegExp(wrongChoice.label), "i"),
      }),
    );
    await user.click(screen.getByRole("button", { name: /下一題/i }));

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
              ? /完成這一輪/i
              : /下一題/i,
        }),
      );
    }

    expect(screen.getByRole("heading", { name: "再試一次" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^再試一次$/i }));

    expect(screen.getByText("第 1 / 1 題")).toBeInTheDocument();
    expect(screen.getByText(firstQuestion.prompt)).toBeInTheDocument();
  });

  it("keeps generated formula choices readable to assistive tech", async () => {
    const user = userEvent.setup();
    const concept = getConceptBySlug("oscillation-energy");
    const session = buildConceptQuizSession(concept, {
      seed: `${concept.slug}:en:quiz-attempt:1`,
      locale: "en",
    });
    const generatedIndex = session.questions.findIndex(
      (question) =>
        question.kind === "generated" &&
        question.choices.some((choice) => /K\s*=.*U\s*=.*E\s*=/.test(choice.label)),
    );

    if (generatedIndex === -1) {
      throw new Error("Expected an Oscillation Energy generated energy-split question.");
    }

    renderQuickTest(concept);

    for (let index = 0; index < generatedIndex; index += 1) {
      const question = session.questions[index]!;
      await clickChoice(user, question, question.correctChoiceId);
      await user.click(screen.getByRole("button", { name: /next question/i }));
    }

    const generatedQuestion = session.questions[generatedIndex]!;

    generatedQuestion.choices.forEach((choice) => {
      expect(screen.getByTestId(`quiz-choice-${choice.id}`)).toHaveAccessibleName(
        new RegExp(`${choice.id.toUpperCase()} .*K =.*U =.*E =`, "i"),
      );
    });
  });

  it("speaks degree notation naturally in prompt and choice names", () => {
    const concept = getConceptBySlug("vectors-components");
    const firstQuestion = concept.quickTest.questions[0]!;

    renderQuickTest(concept);

    expect(screen.getByRole("heading", { level: 2 })).toHaveAccessibleName(
      /One points at 30 degrees and the other at 60 degrees/i,
    );
    expect(screen.getByTestId(`quiz-choice-${firstQuestion.correctChoiceId}`)).toHaveAccessibleName(
      /30 degrees vector has the larger horizontal component.*60 degrees vector has the larger vertical component/i,
    );
    expect(screen.getByTestId(`quiz-choice-${firstQuestion.correctChoiceId}`)).not.toHaveAccessibleName(
      /to the power of circ/i,
    );
  });

  it("localizes generated math words in zh-HK prompt and choice names", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    const concept = getConceptBySlug("vectors-components");
    const firstQuestion = concept.quickTest.questions[0]!;

    renderQuickTest(concept);

    expect(screen.getByRole("heading", { level: 2 })).toHaveAccessibleName(/30 度.*60 度/i);
    expect(screen.getByRole("heading", { level: 2 })).not.toHaveAccessibleName(/degrees/i);
    expect(screen.getByTestId(`quiz-choice-${firstQuestion.correctChoiceId}`)).toHaveAccessibleName(
      /30 度.*60 度/i,
    );
    expect(screen.getByTestId(`quiz-choice-${firstQuestion.correctChoiceId}`)).not.toHaveAccessibleName(
      /degrees/i,
    );
  });

  it("removes TeX spacing commands from generated timing choice names", async () => {
    const user = userEvent.setup();
    const concept = getConceptBySlug("wave-speed-wavelength");
    const session = buildConceptQuizSession(concept, {
      seed: `${concept.slug}:en:quiz-attempt:1`,
      locale: "en",
    });
    const generatedIndex = session.questions.findIndex(
      (question) =>
        question.kind === "generated" &&
        question.choices.some((choice) => /\\quad/.test(choice.label)),
    );

    if (generatedIndex === -1) {
      throw new Error("Expected a Wave Speed and Wavelength generated timing question.");
    }

    renderQuickTest(concept);

    for (let index = 0; index < generatedIndex; index += 1) {
      const question = session.questions[index]!;
      await clickChoice(user, question, question.correctChoiceId);
      await user.click(screen.getByRole("button", { name: /next question/i }));
    }

    const generatedQuestion = session.questions[generatedIndex]!;
    const heading = screen.getByRole("heading", { level: 2 });

    expect(heading).toHaveTextContent("λ =");
    expect(heading).not.toHaveTextContent(/\\lambda|\\mathrm|\\,/);

    generatedQuestion.choices.forEach((choice) => {
      const button = screen.getByTestId(`quiz-choice-${choice.id}`);

      expect(button).toHaveAccessibleName(
        new RegExp(`${choice.id.toUpperCase()} .*f = .*Hz, T = .*s`, "i"),
      );
      expect(button).not.toHaveAccessibleName(/\bquad\b/i);
    });
  });

  it("keeps a generated question stable across rerender and reuses the same instance in Try Again", async () => {
    const user = userEvent.setup();
    const concept = getConceptBySlug("escape-velocity");
    const session = buildConceptQuizSession(concept, {
      seed: `${concept.slug}:en:quiz-attempt:1`,
      locale: "en",
    });
    const generatedIndex = session.questions.findIndex((question) => question.kind === "generated");
    const generatedQuestion = session.questions[generatedIndex]!;
    const wrongChoice = generatedQuestion.choices.find(
      (choice) => choice.id !== generatedQuestion.correctChoiceId,
    )!;
    const rendered = renderQuickTest(concept);

    for (let index = 0; index < generatedIndex; index += 1) {
      const question = session.questions[index]!;
      await clickChoice(user, question, question.correctChoiceId);
      await user.click(screen.getByRole("button", { name: /next question/i }));
    }

    expect(
      screen.getByRole("heading", {
        name: new RegExp(escapeRegExp(promptLead(generatedQuestion.prompt)), "i"),
      }),
    ).toBeInTheDocument();
    for (const given of generatedQuestion.givens ?? []) {
      expect(screen.getByText(given.label)).toBeInTheDocument();
      expect(
        screen.getAllByText(new RegExp(escapeRegExp(given.value), "i")).length,
      ).toBeGreaterThan(0);
    }

    rendered.rerender(
      <ConceptLearningBridgeProvider>
        <QuickTestBridgeHarness />
        <QuickTestSection concept={conceptQuizProps(concept)} />
      </ConceptLearningBridgeProvider>,
    );

    expect(
      screen.getByRole("heading", {
        name: new RegExp(escapeRegExp(promptLead(generatedQuestion.prompt)), "i"),
      }),
    ).toBeInTheDocument();

    await clickChoice(user, generatedQuestion, wrongChoice.id);
    await user.click(screen.getByRole("button", { name: /next question|finish round/i }));

    for (let index = generatedIndex + 1; index < session.questions.length; index += 1) {
      const question = session.questions[index]!;
      await clickChoice(user, question, question.correctChoiceId);
      await user.click(
        screen.getByRole("button", {
          name: index === session.questions.length - 1 ? /finish round/i : /next question/i,
        }),
      );
    }

    await user.click(screen.getByRole("button", { name: /^Try Again$/i }));
    expect(
      screen.getByRole("heading", {
        name: new RegExp(escapeRegExp(promptLead(generatedQuestion.prompt)), "i"),
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 1")).toBeInTheDocument();
    expect(
      getAnswerButtons()[generatedQuestion.choices.findIndex((choice) => choice.id === wrongChoice.id)],
    ).toBeInTheDocument();
  });

  it("restores an in-progress generated question exactly after remount", async () => {
    const user = userEvent.setup();
    const concept = getConceptBySlug("escape-velocity");
    const session = buildConceptQuizSession(concept, {
      seed: `${concept.slug}:en:quiz-attempt:1`,
      locale: "en",
    });
    const generatedIndex = session.questions.findIndex((question) => question.kind === "generated");
    const generatedQuestion = session.questions[generatedIndex]!;
    const wrongChoice = generatedQuestion.choices.find(
      (choice) => choice.id !== generatedQuestion.correctChoiceId,
    )!;
    const rendered = renderQuickTest(concept);

    for (let index = 0; index < generatedIndex; index += 1) {
      const question = session.questions[index]!;
      await clickChoice(user, question, question.correctChoiceId);
      await user.click(screen.getByRole("button", { name: /next question/i }));
    }

    const promptMatcher = new RegExp(escapeRegExp(promptLead(generatedQuestion.prompt)), "i");
    expect(screen.getByRole("heading", { name: promptMatcher })).toBeInTheDocument();
    for (const given of generatedQuestion.givens ?? []) {
      expect(screen.getByText(given.label)).toBeInTheDocument();
      expect(
        screen.getAllByText(new RegExp(escapeRegExp(given.value), "i")).length,
      ).toBeGreaterThan(0);
    }

    await clickChoice(user, generatedQuestion, wrongChoice.id);
    const selectedButton =
      getAnswerButtons()[generatedQuestion.choices.findIndex((choice) => choice.id === wrongChoice.id)]!;
    expect(selectedButton).toHaveAttribute("aria-pressed", "true");

    rendered.unmount();

    renderQuickTest(concept);

    expect(screen.getByRole("heading", { name: promptMatcher })).toBeInTheDocument();
    for (const given of generatedQuestion.givens ?? []) {
      expect(screen.getByText(given.label)).toBeInTheDocument();
      expect(
        screen.getAllByText(new RegExp(escapeRegExp(given.value), "i")).length,
      ).toBeGreaterThan(0);
    }
    const restoredSelectedButton =
      getAnswerButtons()[generatedQuestion.choices.findIndex((choice) => choice.id === wrongChoice.id)]!;
    expect(restoredSelectedButton).toHaveAttribute("aria-pressed", "true");
  });

  it("restores the retry round exactly after remount", async () => {
    const user = userEvent.setup();
    const concept = getConceptBySlug("basic-circuits");
    const firstQuestion = concept.quickTest.questions[0]!;
    const wrongChoice = firstQuestion.choices.find(
      (choice) => choice.id !== firstQuestion.correctChoiceId,
    )!;
    const rendered = renderQuickTest(concept);

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

    await user.click(screen.getByRole("button", { name: /^Try Again$/i }));
    expect(screen.getByText("Try Again")).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 1")).toBeInTheDocument();
    expect(screen.getByText(firstQuestion.prompt)).toBeInTheDocument();

    rendered.unmount();
    renderQuickTest(concept);

    expect(screen.getByText("Try Again")).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 1")).toBeInTheDocument();
    expect(screen.getByText(firstQuestion.prompt)).toBeInTheDocument();
  });

  it("clears a resumable session after full completion and explicit retake", async () => {
    const user = userEvent.setup();
    const concept = getConceptBySlug("basic-circuits");
    const descriptor = buildConceptAssessmentSessionDescriptor(concept, "en");
    const sessionKey = buildAssessmentSessionStorageEntryKey(descriptor);

    renderQuickTest(concept);

    await user.click(
      screen.getByRole("button", {
        name: new RegExp(
          escapeRegExp(getChoiceLabel(concept.quickTest.questions[0]!, concept.quickTest.questions[0]!.correctChoiceId)),
          "i",
        ),
      }),
    );
    expect(localAssessmentSessionStore.getSnapshot().sessions[sessionKey]).toBeDefined();
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

    expect(screen.getByText("Completed.")).toBeInTheDocument();
    expect(localAssessmentSessionStore.getSnapshot().sessions[sessionKey]).toBeUndefined();
    await user.click(screen.getByRole("button", { name: /retake test/i }));
    expect(screen.getByText("Question 1 of 5")).toBeInTheDocument();
    expect(localAssessmentSessionStore.getSnapshot().sessions[sessionKey]).toBeUndefined();
  });

  it("starts a fresh generated instance after a full restart", async () => {
    const user = userEvent.setup();
    const concept = getConceptBySlug("escape-velocity");
    const firstSession = buildConceptQuizSession(concept, {
      seed: `${concept.slug}:en:quiz-attempt:1`,
      locale: "en",
    });
    const secondSession = buildConceptQuizSession(concept, {
      seed: `${concept.slug}:en:quiz-attempt:2`,
      locale: "en",
    });
    const generatedIndex = firstSession.questions.findIndex((question) => question.kind === "generated");
    const firstGeneratedPrompt = firstSession.questions[generatedIndex]!.prompt;
    const secondGeneratedPrompt = secondSession.questions[generatedIndex]!.prompt;

    renderQuickTest(concept);

    for (let index = 0; index < generatedIndex; index += 1) {
      const question = firstSession.questions[index]!;
      const correctChoice = question.choices.find(
        (choice) => choice.id === question.correctChoiceId,
      )!;

      await user.click(
        screen.getByRole("button", {
          name: new RegExp(escapeRegExp(correctChoice.label), "i"),
        }),
      );
      await user.click(screen.getByRole("button", { name: /next question/i }));
    }

    expect(
      screen.getByRole("heading", {
        name: new RegExp(escapeRegExp(promptLead(firstGeneratedPrompt)), "i"),
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /restart/i }));

    for (let index = 0; index < generatedIndex; index += 1) {
      const question = secondSession.questions[index]!;
      const correctChoice = question.choices.find(
        (choice) => choice.id === question.correctChoiceId,
      )!;

      await user.click(
        screen.getByRole("button", {
          name: new RegExp(escapeRegExp(correctChoice.label), "i"),
        }),
      );
      await user.click(screen.getByRole("button", { name: /next question/i }));
    }

    expect(
      screen.getByRole("heading", {
        name: new RegExp(escapeRegExp(promptLead(secondGeneratedPrompt)), "i"),
      }),
    ).toBeInTheDocument();
    expect(secondGeneratedPrompt).not.toBe(firstGeneratedPrompt);
  });

  it("renders zh-HK shared quick-test chrome while authored answer copy can fall back", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    const concept = getConceptBySlug("simple-harmonic-motion");

    renderQuickTest(concept);

    expect(screen.getByText("變量影響")).toBeInTheDocument();
    expect(screen.getByText("第 1 / 5 題")).toBeInTheDocument();
  });
});
