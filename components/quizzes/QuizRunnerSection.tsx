"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ConceptQuickTestShowMeAction } from "@/lib/content";
import type { QuizQuestionInstance, QuizRoundId } from "@/lib/quiz";
import {
  clearAssessmentSession,
  saveAssessmentSession,
  useAssessmentSessionMatch,
  useAssessmentSessionStoreReady,
  type AssessmentSessionDescriptor,
  type PersistedQuizRunnerFlowState,
} from "@/lib/assessment-sessions";
import { RichMathText } from "@/components/concepts/MathFormula";

type QuizRunnerSession = {
  attemptId: string;
  seed: string;
  questions: QuizQuestionInstance[];
};

type QuizCompletionAction = {
  href: string;
  label: string;
  tone?: "primary" | "secondary";
};

type QuizFollowUpActionsSection = {
  title: string;
  description?: string;
  actions: QuizCompletionAction[];
};

type QuizRunnerSectionProps = {
  title: string;
  intro?: string;
  seedBase: string;
  resumeDescriptor?: AssessmentSessionDescriptor | null;
  buildSession: (input: {
    locale: "en" | "zh-HK";
    seed: string;
    attemptNumber: number;
  }) => QuizRunnerSession;
  buildRoundSummaryDescription: (input: { missedCount: number }) => string;
  buildCompletionDescription: (input: {
    finalIncorrectCount: number;
    initialMissedCount: number;
  }) => string;
  completionActions?: QuizCompletionAction[];
  supplementaryActionsSection?: QuizFollowUpActionsSection | null;
  onMeaningfulInteraction?: () => void;
  onQuestionAnswered?: (canonicalQuestionId: string) => void;
  onAttemptStarted?: (session: QuizRunnerSession) => void;
  onAttemptCompleted?: (input: {
    finalIncorrectCount: number;
    questionCount: number;
    session: QuizRunnerSession;
  }) => void;
  onShowMeAction?: (action: ConceptQuickTestShowMeAction) => void;
  onClearShowMeAction?: () => void;
};

type QuizRunnerFlowStage = "question" | "round-summary" | "complete";

type QuizRunnerFlowState = {
  attemptNumber: number;
  session: QuizRunnerSession;
  stage: QuizRunnerFlowStage;
  roundId: QuizRoundId;
  roundQuestionIds: string[];
  questionIndex: number;
  selectedChoiceId: string | null;
  appliedQuestionId: string | null;
  roundAnswers: Record<string, string>;
  initialMissedIds: string[];
  finalIncorrectCount: number;
  trackedCanonicalQuestionIds: string[];
};

function restoreFlowStateFromPersistedSession(input: {
  session: QuizRunnerSession;
  flow: PersistedQuizRunnerFlowState;
}) {
  return {
    attemptNumber: input.flow.attemptNumber,
    session: input.session,
    stage: input.flow.stage,
    roundId: input.flow.roundId,
    roundQuestionIds: input.flow.roundQuestionIds,
    questionIndex: input.flow.questionIndex,
    selectedChoiceId: input.flow.selectedChoiceId,
    appliedQuestionId: input.flow.appliedQuestionId,
    roundAnswers: input.flow.roundAnswers,
    initialMissedIds: input.flow.initialMissedIds,
    finalIncorrectCount: input.flow.finalIncorrectCount,
    trackedCanonicalQuestionIds: input.flow.trackedCanonicalQuestionIds,
  } satisfies QuizRunnerFlowState;
}

function buildPersistedFlowState(state: QuizRunnerFlowState): PersistedQuizRunnerFlowState {
  return {
    attemptNumber: state.attemptNumber,
    stage: state.stage === "complete" ? "question" : state.stage,
    roundId: state.roundId,
    roundQuestionIds: state.roundQuestionIds,
    questionIndex: state.questionIndex,
    selectedChoiceId: state.selectedChoiceId,
    appliedQuestionId: state.appliedQuestionId,
    roundAnswers: state.roundAnswers,
    initialMissedIds: state.initialMissedIds,
    finalIncorrectCount: state.finalIncorrectCount,
    trackedCanonicalQuestionIds: state.trackedCanonicalQuestionIds,
  };
}

function shouldPersistResumableSession(state: QuizRunnerFlowState) {
  if (state.stage === "complete") {
    return false;
  }

  return (
    state.selectedChoiceId !== null ||
    Object.keys(state.roundAnswers).length > 0 ||
    state.initialMissedIds.length > 0 ||
    state.trackedCanonicalQuestionIds.length > 0
  );
}

function createAttemptSeed(
  seedBase: string,
  locale: "en" | "zh-HK",
  attemptNumber: number,
) {
  return `${seedBase}:${locale}:quiz-attempt:${attemptNumber + 1}`;
}

function getChoiceTone(
  question: QuizQuestionInstance,
  choiceId: string,
  selectedChoiceId: string | null,
) {
  if (!selectedChoiceId) {
    return "border-line bg-paper-strong text-ink-800 hover:border-teal-500/35";
  }

  if (choiceId === question.correctChoiceId) {
    return "border-emerald-500/35 bg-emerald-500/10 text-ink-950";
  }

  if (choiceId === selectedChoiceId) {
    return "border-coral-500/35 bg-coral-500/10 text-ink-950";
  }

  return "border-line bg-paper-strong text-ink-600";
}

function formatMathForAccessibleText(content: string, locale: "en" | "zh-HK") {
  const mathWords =
    locale === "zh-HK"
      ? {
          over: "除以",
          squareRootOf: "平方根",
          degrees: "度",
          squared: "平方",
          toThePowerOf: "次方",
        }
      : {
          over: "over",
          squareRootOf: "square root of",
          degrees: "degrees",
          squared: "squared",
          toThePowerOf: "to the power of",
        };

  return content
    .replace(/\$\$?([^$]+)\$\$?/g, "$1")
    .replace(/\\tfrac\{([^{}]+)\}\{([^{}]+)\}/g, `$1 ${mathWords.over} $2`)
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, `$1 ${mathWords.over} $2`)
    .replace(/\\sqrt\{([^{}]+)\}/g, `${mathWords.squareRootOf} $1`)
    .replace(/\\mathrm\{([^{}]+)\}/g, "$1")
    .replace(/\\q?quad\b/g, " ")
    .replace(/\^\{?\\circ\}?/g, ` ${mathWords.degrees}`)
    .replace(/\\circ\b/g, ` ${mathWords.degrees}`)
    .replace(/\^2\b/g, ` ${mathWords.squared}`)
    .replace(/\^\{([^{}]+)\}/g, ` ${mathWords.toThePowerOf} $1`)
    .replace(/\^([^\s,.;]+)/g, ` ${mathWords.toThePowerOf} $1`)
    .replace(/\\[,;]/g, " ")
    .replace(/\\[a-zA-Z]+/g, (match) => match.slice(1))
    .replace(/\\/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildChoiceAccessibleLabel(
  choice: QuizQuestionInstance["choices"][number],
  locale: "en" | "zh-HK",
) {
  return `${choice.id.toUpperCase()} ${formatMathForAccessibleText(choice.label, locale)}`;
}

function buildInitialFlowState(
  seedBase: string,
  locale: "en" | "zh-HK",
  buildSession: QuizRunnerSectionProps["buildSession"],
  attemptNumber = 0,
): QuizRunnerFlowState {
  const session = buildSession({
    locale,
    seed: createAttemptSeed(seedBase, locale, attemptNumber),
    attemptNumber,
  });

  return {
    attemptNumber,
    session,
    stage: "question",
    roundId: "initial",
    roundQuestionIds: session.questions.map((question) => question.instanceId),
    questionIndex: 0,
    selectedChoiceId: null,
    appliedQuestionId: null,
    roundAnswers: {},
    initialMissedIds: [],
    finalIncorrectCount: 0,
    trackedCanonicalQuestionIds: [],
  };
}

export function QuizRunnerSection({
  title,
  intro,
  seedBase,
  resumeDescriptor = null,
  buildSession,
  buildRoundSummaryDescription,
  buildCompletionDescription,
  completionActions = [],
  supplementaryActionsSection = null,
  onMeaningfulInteraction,
  onQuestionAnswered,
  onAttemptStarted,
  onAttemptCompleted,
  onShowMeAction,
  onClearShowMeAction,
}: QuizRunnerSectionProps) {
  const t = useTranslations("QuickTestSection");
  const locale = useLocale() as "en" | "zh-HK";
  const resumeReady = useAssessmentSessionStoreReady();
  const resumeMatch = useAssessmentSessionMatch(resumeDescriptor);

  const descriptorKey = useMemo(
    () =>
      resumeDescriptor
        ? `${resumeDescriptor.kind}:${resumeDescriptor.locale}:${resumeDescriptor.assessmentId}:${resumeDescriptor.definitionKey}`
        : `fresh:${seedBase}:${locale}`,
    [locale, resumeDescriptor, seedBase],
  );

  const initialState = useMemo(() => {
    if (!resumeReady) {
      return null;
    }

    if (resumeDescriptor && resumeMatch.status === "resume") {
      return restoreFlowStateFromPersistedSession({
        session: resumeMatch.record.session,
        flow: resumeMatch.record.flow,
      });
    }

    return buildInitialFlowState(seedBase, locale, buildSession);
  }, [buildSession, locale, resumeDescriptor, resumeMatch, resumeReady, seedBase]);

  useEffect(() => () => onClearShowMeAction?.(), [onClearShowMeAction]);

  useEffect(() => {
    if (resumeDescriptor && resumeMatch.status === "stale") {
      clearAssessmentSession(resumeDescriptor);
    }
  }, [resumeDescriptor, resumeMatch]);

  if (!resumeReady || !initialState) {
    return (
      <section data-testid="quiz-resume-loading" className="lab-panel p-5 md:p-6">
        <p className="lab-label">{title}</p>
        <p className="mt-2 text-sm leading-7 text-ink-700">{t("loadingState")}</p>
      </section>
    );
  }

  return (
    <QuizRunnerSectionContent
      key={descriptorKey}
      initialState={initialState}
      title={title}
      intro={intro}
      seedBase={seedBase}
      resumeDescriptor={resumeDescriptor}
      buildSession={buildSession}
      buildRoundSummaryDescription={buildRoundSummaryDescription}
      buildCompletionDescription={buildCompletionDescription}
      completionActions={completionActions}
      supplementaryActionsSection={supplementaryActionsSection}
      onMeaningfulInteraction={onMeaningfulInteraction}
      onQuestionAnswered={onQuestionAnswered}
      onAttemptStarted={onAttemptStarted}
      onAttemptCompleted={onAttemptCompleted}
      onShowMeAction={onShowMeAction}
      onClearShowMeAction={onClearShowMeAction}
    />
  );
}

type QuizRunnerSectionContentProps = QuizRunnerSectionProps & {
  initialState: QuizRunnerFlowState;
};

function QuizRunnerSectionContent({
  title,
  intro,
  seedBase,
  resumeDescriptor = null,
  buildSession,
  buildRoundSummaryDescription,
  buildCompletionDescription,
  completionActions = [],
  supplementaryActionsSection = null,
  onMeaningfulInteraction,
  onQuestionAnswered,
  onAttemptStarted,
  onAttemptCompleted,
  onShowMeAction,
  onClearShowMeAction,
  initialState,
}: QuizRunnerSectionContentProps) {
  const t = useTranslations("QuickTestSection");
  const locale = useLocale() as "en" | "zh-HK";
  const [state, setState] = useState<QuizRunnerFlowState>(initialState);

  useEffect(() => () => onClearShowMeAction?.(), [onClearShowMeAction]);

  function syncPersistedSessionState(nextState: QuizRunnerFlowState) {
    if (!resumeDescriptor) {
      return;
    }

    if (!shouldPersistResumableSession(nextState)) {
      clearAssessmentSession(resumeDescriptor);
      return;
    }

    saveAssessmentSession(resumeDescriptor, {
      session: nextState.session,
      flow: buildPersistedFlowState(nextState),
    });
  }

  const questionsByInstanceId = new Map(
    state.session.questions.map((question) => [question.instanceId, question] as const),
  );
  const activeQuestionId = state.roundQuestionIds[state.questionIndex] ?? "";
  const question = questionsByInstanceId.get(activeQuestionId);

  if (!question) {
    return null;
  }

  const currentQuestion = question;
  const isAnswered = state.selectedChoiceId !== null;
  const isCorrect = state.selectedChoiceId === currentQuestion.correctChoiceId;
  const isLastQuestion = state.questionIndex === state.roundQuestionIds.length - 1;
  const appliedCurrentQuestion = state.appliedQuestionId === currentQuestion.instanceId;
  const selectedWrongExplanation =
    currentQuestion.kind === "static" && !isCorrect && state.selectedChoiceId
      ? currentQuestion.selectedWrongExplanations?.[state.selectedChoiceId]
      : null;
  const questionTypeLabels: Record<QuizQuestionInstance["type"], string> = {
    "variable-effect": t("answerTypes.variableEffect"),
    "graph-reading": t("answerTypes.graphReading"),
    "misconception-check": t("answerTypes.misconceptionCheck"),
    "compare-two-cases": t("answerTypes.compareCases"),
    reasoning: t("answerTypes.reasoning"),
    calculation: t("answerTypes.calculation"),
    "worked-example": t("answerTypes.workedExample"),
  };
  const showMeAction =
    currentQuestion.showMeAction && onShowMeAction
      ? currentQuestion.showMeAction
      : null;
  const hasSimulationAction = Boolean(showMeAction);

  function renderActionLinks(actions: QuizCompletionAction[]) {
    function navigateToRenderedHref(event: MouseEvent<HTMLAnchorElement>) {
      event.preventDefault();
      window.location.assign(event.currentTarget.href);
    }

    return actions.map((action) =>
      action.tone === "primary" ? (
        <Link
          key={`${action.href}:${action.label}`}
          href={action.href}
          onClick={navigateToRenderedHref}
          className="inline-flex w-full items-center justify-center rounded-full border border-ink-950 bg-ink-950 px-4 py-2.5 text-sm font-semibold text-paper-strong transition hover:bg-ink-900 sm:w-auto"
          style={{ color: "var(--paper-strong)" }}
        >
          {action.label}
        </Link>
      ) : (
        <Link
          key={`${action.href}:${action.label}`}
          href={action.href}
          onClick={navigateToRenderedHref}
          className="inline-flex w-full items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90 sm:w-auto"
        >
          {action.label}
        </Link>
      ),
    );
  }

  function renderSupplementaryActionsSection(testId: string) {
    if (!supplementaryActionsSection || supplementaryActionsSection.actions.length === 0) {
      return null;
    }

    return (
      <div
        data-testid={testId}
        className="mt-5 space-y-3 border-t border-line pt-4"
      >
        <div className="space-y-1">
          <p className="lab-label">{supplementaryActionsSection.title}</p>
          {supplementaryActionsSection.description ? (
            <p className="max-w-2xl text-sm leading-6 text-ink-700">
              {supplementaryActionsSection.description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {renderActionLinks(supplementaryActionsSection.actions)}
        </div>
      </div>
    );
  }

  function resetQuiz() {
    onMeaningfulInteraction?.();
    onClearShowMeAction?.();
    if (resumeDescriptor) {
      clearAssessmentSession(resumeDescriptor);
    }
    setState((current) =>
      buildInitialFlowState(
        seedBase,
        locale,
        buildSession,
        (current?.attemptNumber ?? 0) + 1,
      ),
    );
  }

  function answer(choiceId: string) {
    if (state.selectedChoiceId) {
      return;
    }

    if (!Object.keys(state.roundAnswers).length) {
      onAttemptStarted?.(state.session);
    }

    if (!state.trackedCanonicalQuestionIds.includes(currentQuestion.canonicalQuestionId)) {
      onQuestionAnswered?.(currentQuestion.canonicalQuestionId);
    }

    const nextState = {
      ...state,
      selectedChoiceId: choiceId,
      appliedQuestionId: null,
      roundAnswers: {
        ...state.roundAnswers,
        [currentQuestion.instanceId]: choiceId,
      },
      trackedCanonicalQuestionIds: state.trackedCanonicalQuestionIds.includes(
        currentQuestion.canonicalQuestionId,
      )
        ? state.trackedCanonicalQuestionIds
        : [...state.trackedCanonicalQuestionIds, currentQuestion.canonicalQuestionId],
    } satisfies QuizRunnerFlowState;
    syncPersistedSessionState(nextState);
    setState(nextState);
  }

  function advance() {
    if (!isAnswered) {
      return;
    }

    onMeaningfulInteraction?.();
    onClearShowMeAction?.();

    if (!isLastQuestion) {
      const nextState = {
        ...state,
        questionIndex: state.questionIndex + 1,
        selectedChoiceId: null,
        appliedQuestionId: null,
      } satisfies QuizRunnerFlowState;
      syncPersistedSessionState(nextState);
      setState(nextState);
      return;
    }

    const missedInstanceIds = state.roundQuestionIds.filter((instanceId) => {
      const roundQuestion = questionsByInstanceId.get(instanceId);
      return roundQuestion && state.roundAnswers[instanceId] !== roundQuestion.correctChoiceId;
    });

    if (state.roundId === "initial" && missedInstanceIds.length > 0) {
      const nextState = {
        ...state,
        stage: "round-summary",
        initialMissedIds: missedInstanceIds,
        finalIncorrectCount: missedInstanceIds.length,
        selectedChoiceId: null,
        appliedQuestionId: null,
      } satisfies QuizRunnerFlowState;
      syncPersistedSessionState(nextState);
      setState(nextState);
      return;
    }

    onAttemptCompleted?.({
      finalIncorrectCount: missedInstanceIds.length,
      questionCount: state.session.questions.length,
      session: state.session,
    });
    if (resumeDescriptor) {
      clearAssessmentSession(resumeDescriptor);
    }
    setState((current) => ({
      ...current,
      stage: "complete",
      finalIncorrectCount: missedInstanceIds.length,
      selectedChoiceId: null,
      appliedQuestionId: null,
    }));
  }

  function startTryAgainRound() {
    onMeaningfulInteraction?.();
    onClearShowMeAction?.();
    const nextState = {
      ...state,
      stage: "question",
      roundId: "retry",
      roundQuestionIds: state.initialMissedIds,
      questionIndex: 0,
      selectedChoiceId: null,
      appliedQuestionId: null,
      roundAnswers: {},
    } satisfies QuizRunnerFlowState;
    syncPersistedSessionState(nextState);
    setState(nextState);
  }

  function showMe() {
    if (!isAnswered || !currentQuestion.showMeAction || !onShowMeAction) {
      return;
    }

    onMeaningfulInteraction?.();
    onShowMeAction(currentQuestion.showMeAction);
    const nextState = {
      ...state,
      appliedQuestionId: currentQuestion.instanceId,
    } satisfies QuizRunnerFlowState;
    syncPersistedSessionState(nextState);
    setState(nextState);
  }

  if (state.stage === "round-summary") {
    return (
      <section data-testid="quiz-round-summary" className="lab-panel p-4 sm:p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className="lab-label">{title}</p>
          <p className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
            {t("rounds.tryAgain")}
          </p>
        </div>
        <h2 className="mt-3 text-2xl font-semibold text-ink-950">{t("roundSummary.title")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
          <div className="rounded-[20px] border border-amber-500/25 bg-amber-500/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
              {t("roundSummary.missedLabel")}
            </p>
            <p className="mt-1 text-2xl font-semibold text-ink-950">
              {state.initialMissedIds.length}
            </p>
          </div>
          <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
            <p className="text-sm font-semibold text-ink-950">
              {buildRoundSummaryDescription({ missedCount: state.initialMissedIds.length })}
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-700">
              {t("roundSummary.savedNote")}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={startTryAgainRound}
            className="inline-flex w-full items-center justify-center rounded-full border border-teal-500/25 bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:w-auto"
          >
            {t("actions.startTryAgain")}
          </button>
          <button
            type="button"
            onClick={resetQuiz}
            className="inline-flex items-center justify-center rounded-full border border-line bg-transparent px-3 py-2 text-xs font-semibold text-ink-600 transition hover:border-teal-500/35 hover:bg-white/70"
          >
            {t("actions.restartQuiz")}
          </button>
        </div>
        {renderSupplementaryActionsSection("quiz-round-summary-follow-up")}
      </section>
    );
  }

  if (state.stage === "complete") {
    const totalQuestionCount = state.session.questions.length;
    const correctCount = Math.max(0, totalQuestionCount - state.finalIncorrectCount);
    const primaryCompletionActions = completionActions.filter(
      (action) => action.tone === "primary",
    );
    const secondaryCompletionActions = completionActions.filter(
      (action) => action.tone !== "primary",
    );

    return (
      <section data-testid="quiz-completion" className="lab-panel relative z-20 p-4 sm:p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className="lab-label">{title}</p>
          <p className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
            {state.finalIncorrectCount === 0 ? t("complete.perfectBadge") : t("complete.savedBadge")}
          </p>
        </div>
        <h2 className="mt-3 text-2xl font-semibold text-ink-950">{t("complete.title")}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-700">
          {buildCompletionDescription({
            finalIncorrectCount: state.finalIncorrectCount,
            initialMissedCount: state.initialMissedIds.length,
          })}
        </p>

        <div data-testid="quiz-completion-result-summary" className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
              {t("complete.scoreLabel")}
            </p>
            <p className="mt-1 text-xl font-semibold text-ink-950">
              {t("complete.scoreValue", {
                correct: correctCount,
                total: totalQuestionCount,
              })}
            </p>
          </div>
          <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
              {t("complete.missedLabel")}
            </p>
            <p className="mt-1 text-xl font-semibold text-ink-950">
              {state.finalIncorrectCount}
            </p>
          </div>
          <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
              {t("complete.savedLabel")}
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-ink-950">
              {state.finalIncorrectCount === 0
                ? t("complete.savedClean")
                : t("complete.savedMissed", { count: state.finalIncorrectCount })}
            </p>
          </div>
        </div>

        {primaryCompletionActions.length ? (
          <div className="mt-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
              {t("complete.bestNextAction")}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {renderActionLinks(primaryCompletionActions)}
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {renderActionLinks(secondaryCompletionActions)}
          <button
            type="button"
            onClick={resetQuiz}
            data-testid="quiz-completion-retake"
            className={[
              "inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:w-auto",
              primaryCompletionActions.length
                ? "border border-line bg-paper-strong text-ink-800 hover:border-teal-500/35 hover:bg-white/90"
                : "border border-teal-500/25 bg-teal-500 text-white hover:bg-teal-600",
            ].join(" ")}
          >
            {t("actions.retakeTest")}
          </button>
        </div>
        {renderSupplementaryActionsSection("quiz-completion-follow-up")}
      </section>
    );
  }

  return (
    <section data-testid="quiz-question-stage" className="lab-panel p-4 sm:p-5 md:p-6">
      <div className="flex flex-col gap-3 border-b border-line pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="lab-label">{title}</p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 font-mono text-xs text-teal-700">
              {questionTypeLabels[currentQuestion.type]}
            </p>
            {state.roundId === "retry" ? (
              <p className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 font-mono text-xs text-amber-800">
                {t("rounds.tryAgain")}
              </p>
            ) : null}
            <p className="rounded-full border border-line bg-paper-strong px-3 py-1 font-mono text-xs text-ink-600">
              {t("progress.questionCounter", {
                current: state.questionIndex + 1,
                total: state.roundQuestionIds.length,
              })}
            </p>
            {appliedCurrentQuestion ? (
              <p
                data-testid="quiz-simulation-status"
                className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 font-mono text-xs text-teal-700"
              >
                {t("feedback.shownInSimulation")}
              </p>
            ) : null}
          </div>
        </div>
        {intro ? (
          <>
            <RichMathText
              as="div"
              content={intro}
              className="hidden text-sm leading-6 text-ink-700 sm:block"
            />
            <details className="rounded-[18px] border border-line bg-paper-strong px-3 py-2 text-sm text-ink-700 sm:hidden">
              <summary className="cursor-pointer font-semibold text-ink-900">
                {t("actions.testNotes")}
              </summary>
              <RichMathText as="div" content={intro} className="mt-2 leading-6" />
            </details>
          </>
        ) : null}
      </div>

      <div className="pt-3 sm:pt-4">
        <RichMathText
          as="h2"
          content={currentQuestion.prompt}
          ariaLabel={formatMathForAccessibleText(currentQuestion.prompt, locale)}
          className="text-lg font-semibold leading-snug text-ink-950 sm:text-xl"
        />

        {currentQuestion.givens?.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {currentQuestion.givens.map((given) => (
              <div
                key={given.id}
                className="rounded-[20px] border border-line bg-paper-strong px-4 py-3"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                  {given.label}
                </p>
                <p className="mt-2 font-mono text-sm text-ink-900">
                  {given.symbol
                    ? `${given.symbol} = ${given.value}${given.unit ? ` ${given.unit}` : ""}`
                    : `${given.value}${given.unit ? ` ${given.unit}` : ""}`}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-4 grid gap-2.5 sm:gap-2">
          {currentQuestion.choices.map((choice) => {
            const choiceTone = getChoiceTone(currentQuestion, choice.id, state.selectedChoiceId);
            const isSelected = state.selectedChoiceId === choice.id;

            return (
              <button
                key={choice.id}
                type="button"
                disabled={isAnswered}
                onClick={() => answer(choice.id)}
                data-testid={`quiz-choice-${choice.id}`}
                className={[
                  "rounded-[20px] border px-4 py-3 text-left text-sm leading-6 transition sm:py-3",
                  choiceTone,
                  isAnswered ? "cursor-default" : "hover:-translate-y-0.5",
                ].join(" ")}
                aria-label={buildChoiceAccessibleLabel(choice, locale)}
                aria-pressed={isSelected}
              >
                <span className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-white/85 font-mono text-xs text-ink-700">
                    {choice.id.toUpperCase()}
                  </span>
                  <RichMathText as="span" content={choice.label} />
                </span>
              </button>
            );
          })}
        </div>

        {isAnswered ? (
          <div
            className={[
              "mt-4 rounded-[22px] border px-4 py-4 text-sm leading-6",
              isCorrect
                ? "border-emerald-500/30 bg-emerald-500/10 text-ink-950"
                : "border-coral-500/30 bg-coral-500/10 text-ink-950",
            ].join(" ")}
            aria-live="polite"
          >
            <p className="font-semibold">
              {isCorrect ? t("feedback.correct") : t("feedback.incorrect")}
            </p>
            <RichMathText
              as="div"
              content={currentQuestion.explanation}
              className="mt-2 whitespace-pre-line text-ink-700"
            />

            {selectedWrongExplanation ? (
              <div className="mt-3 rounded-2xl border border-black/8 bg-white/65 px-3 py-3 text-ink-700">
                <p className="font-semibold text-ink-950">{t("feedback.wrongChoiceTitle")}</p>
                <RichMathText as="div" content={selectedWrongExplanation} className="mt-2" />
              </div>
            ) : null}

            {currentQuestion.showMeAction?.observationHint && appliedCurrentQuestion ? (
              <div className="mt-3 rounded-2xl border border-teal-500/20 bg-white/65 px-3 py-3 text-ink-700">
                <p className="font-semibold text-ink-950">{t("feedback.observationTitle")}</p>
                <RichMathText
                  as="div"
                  content={currentQuestion.showMeAction.observationHint}
                  className="mt-2"
                />
              </div>
            ) : null}

            {appliedCurrentQuestion ? (
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink-600">
                {t("feedback.shownInSimulation")}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-ink-600">
            {hasSimulationAction
              ? t("feedback.simulationInstructions")
              : t("feedback.instructions")}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!isAnswered}
            onClick={advance}
            className="inline-flex w-full items-center justify-center rounded-full border border-teal-500/25 bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
          >
            {isLastQuestion ? t("actions.finishRound") : t("actions.nextQuestion")}
          </button>
          {hasSimulationAction ? (
            <button
              type="button"
              disabled={!isAnswered}
              onClick={showMe}
              className="inline-flex w-full items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
            >
              {appliedCurrentQuestion
                ? t("actions.shownInSimulation")
                : showMeAction?.label ?? t("actions.showInSimulation")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={resetQuiz}
            className="inline-flex items-center justify-center rounded-full border border-transparent bg-transparent px-3 py-2 text-xs font-semibold text-ink-500 transition hover:border-line hover:bg-paper-strong hover:text-ink-800 sm:ml-auto"
          >
            {t("actions.restart")}
          </button>
        </div>
      </div>
    </section>
  );
}
