"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import type { WorkedExampleAccessMode } from "@/lib/account/entitlements";
import type { AppLocale } from "@/i18n/routing";
import type {
  ConceptContent,
  ReadNextRecommendation,
  ResolvedConceptPageV2,
} from "@/lib/content";
import {
  conceptLearningPhaseQueryParam,
  conceptPageV2LessonHashId,
  getConceptPageV2StepHashId,
  parseConceptLearningPhaseId,
  resolveConceptPageV2,
  resolveConceptPageV2StepIdFromHash,
  resolveConceptPageV2StepIdFromLegacyPhase,
} from "@/lib/content";
import type { ResolvedConceptPageSection } from "@/lib/content/concept-page-framework";
import { conceptShareAnchorIds } from "@/lib/share-links";
import { ConceptPagePhaseProvider } from "./ConceptPagePhaseContext";
import { ConceptPageSections } from "./ConceptPageSections";
import {
  ConceptPageV2EquationSnapshotCard,
  ConceptPageV2LessonRail,
  ConceptPageV2LessonSupport,
  ConceptPageV2SecondarySection,
  ConceptPageV2StartHere,
  ConceptPageV2WrapUp,
  conceptPageV2CurrentStepHeadingId,
  conceptPageV2WrapUpHashId,
} from "./ConceptPageV2Panels";

type ConceptPageV2ShellProps = {
  concept: ConceptContent;
  readNext: ReadNextRecommendation[];
  sections: ResolvedConceptPageSection[];
  workedExampleMode?: WorkedExampleAccessMode;
  model?: ResolvedConceptPageV2;
  hideStartHere?: boolean;
  titleContextContent?: ReactNode;
  statusContent?: ReactNode;
  liveLabContent?: ReactNode;
  supportRail?: ReactNode;
  afterPhasedSections?: ReactNode;
  phaseOwnedAnchorIds?: Partial<Record<"explore" | "understand" | "check", readonly string[]>>;
};

function scrollToAnchor(anchorId: string, options?: { offsetPx?: number }) {
  if (typeof document === "undefined") {
    return false;
  }

  const element = document.getElementById(anchorId);

  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const elementTop = element.getBoundingClientRect().top + window.scrollY;
  const targetTop = Math.max(0, elementTop + (options?.offsetPx ?? 0));

  window.scrollTo({
    top: targetTop,
    behavior: prefersReducedMotion ? "auto" : "smooth",
  });

  if (typeof element.focus === "function") {
    element.focus({ preventScroll: true });
  }

  return true;
}

function replaceUrlHash(hashId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete(conceptLearningPhaseQueryParam);
  url.hash = `#${hashId.replace(/^#/, "")}`;
  window.history.replaceState(window.history.state, "", url);
}

function syncUrlToStep(stepId: string, preserveHashId?: string | null) {
  replaceUrlHash(preserveHashId ?? getConceptPageV2StepHashId(stepId));
}

export function ConceptPageV2Shell({
  concept,
  readNext,
  workedExampleMode = "live",
  model: providedModel,
  hideStartHere = false,
  titleContextContent,
  statusContent,
  liveLabContent,
  supportRail,
  afterPhasedSections,
}: ConceptPageV2ShellProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("ConceptPage");
  const model = useMemo(
    () =>
      providedModel ??
      resolveConceptPageV2(concept, {
        locale,
        readNext,
      }),
    [concept, locale, providedModel, readNext],
  );
  const copy = useMemo(
    () => ({
      lessonFlowLabel: t("v2.lessonFlowLabel"),
      lessonStepCountLabel: (values: { count: number }) =>
        t("v2.lessonStepCountLabel", values),
      currentStepLabel: t("v2.currentStepLabel"),
      upcomingStepLabel: t("v2.upcomingStepLabel"),
      actLabel: t("v2.actLabel"),
      observeLabel: t("v2.observeLabel"),
      explainLabel: t("v2.explainLabel"),
      nowAvailableLabel: t("v2.nowAvailableLabel"),
      revealOverflowLabel: (values: { count: number }) =>
        t("v2.revealOverflowLabel", values),
      quickCheckLabel: t("v2.quickCheckLabel"),
      previousStep: t("v2.previousStep"),
      nextStep: t("v2.nextStep"),
      lessonCompleteLabel: t("v2.lessonCompleteLabel"),
      lessonCompleteDescription: t("v2.lessonCompleteDescription"),
      startHereLabel: t("v2.startHereLabel"),
      whyItMattersLabel: t("v2.whyItMattersLabel"),
      estimatedTimeLabel: t("v2.estimatedTimeLabel"),
      prerequisitesLabel: t("v2.prerequisitesLabel"),
      noPrerequisites: t("v2.noPrerequisites"),
      simulationPreviewLabel: t("v2.simulationPreviewLabel"),
      equationSnapshotLabel: t("v2.equationSnapshotLabel"),
      equationReadAloudLabel: t("v2.equationReadAloudLabel"),
      equationCountLabel: (values: { count: number }) =>
        t("v2.equationCountLabel", values),
      equationDisclosureLabel: t("v2.equationDisclosureLabel"),
      startLearning: t("v2.startLearning"),
      wrapUpLabel: t("v2.wrapUpLabel"),
      conceptTestLabel: t("v2.conceptTestLabel"),
      conceptTestDescription: t("v2.conceptTestDescription"),
      reviewBenchLabel: t("v2.reviewBenchLabel"),
      reviewBenchDescription: t("v2.reviewBenchDescription"),
      nextConceptsLabel: t("v2.nextConceptsLabel"),
      nextConceptsDescription: t("v2.nextConceptsDescription"),
      practiceActionsLabel: t("v2.practiceActionsLabel"),
      practiceActionsDescription: t("v2.practiceActionsDescription"),
      practiceOptionLabel: t("v2.practiceOptionLabel"),
      morePracticeOptionsLabel: t("v2.morePracticeOptionsLabel"),
      moreReadNextOptionsLabel: t("v2.moreReadNextOptionsLabel"),
      showMoreOptionsLabel: t("v2.showMoreOptionsLabel"),
      hideMoreOptionsLabel: t("v2.hideMoreOptionsLabel"),
      referenceDisclosureLabel: t("v2.referenceDisclosureLabel"),
      recommendedActionLabel: t("v2.recommendedActionLabel"),
      freePlayLabel: t("v2.freePlayLabel"),
      freePlayDescription: t("v2.freePlayDescription"),
      challengeLabel: t("v2.challengeLabel"),
      challengeDescription: t("v2.challengeDescription"),
      workedExamplesLabel: t("v2.workedExamplesLabel"),
      workedExamplesDescription: t("v2.workedExamplesDescription"),
      commonMisconceptionLabel: t("v2.commonMisconceptionLabel"),
      referenceLabel: t("v2.referenceLabel"),
      referenceTitle: t("v2.referenceTitle"),
      referenceDescription: t("v2.referenceDescription"),
      deeperReferenceNote: t("v2.deeperReferenceNote"),
      keyTakeawayLabel: t("v2.keyTakeawayLabel"),
      wrapUpTitle: t("v2.wrapUpTitle"),
      lessonPreviewDisclosureLabel: t("v2.lessonPreviewDisclosureLabel"),
      lessonPreviewDisclosureDescription: t("v2.lessonPreviewDisclosureDescription"),
      contextDisclosureLabel: t("v2.contextDisclosureLabel"),
      contextDisclosureDescription: t("v2.contextDisclosureDescription"),
      revealKinds: {
        control: t("v2.revealKinds.control"),
        graph: t("v2.revealKinds.graph"),
        overlay: t("v2.revealKinds.overlay"),
        tool: t("v2.revealKinds.tool"),
        section: t("v2.revealKinds.section"),
      },
    }),
    [t],
  );
  const [activeStepId, setActiveStepId] = useState(model.steps[0]?.id ?? "");
  const activeStepIdRef = useRef(activeStepId);
  const focusTimeoutRef = useRef<number | null>(null);
  const pendingFocusTargetRef = useRef<"bench" | "step" | null>(null);

  useEffect(() => {
    activeStepIdRef.current = activeStepId;
  }, [activeStepId]);

  const runFocusGuidedTarget = useCallback((target: "bench" | "step") => {
    if (typeof window === "undefined") {
      return;
    }

    if (focusTimeoutRef.current !== null) {
      window.clearTimeout(focusTimeoutRef.current);
    }

    let attempt = 0;
    const focusTarget = () => {
      focusTimeoutRef.current = null;

      if (target === "step" && scrollToAnchor(conceptPageV2CurrentStepHeadingId)) {
        return;
      }

      const benchOffsetPx =
        typeof window !== "undefined" && window.innerWidth >= 1280 ? 260 : 0;

      if (
        scrollToAnchor(conceptShareAnchorIds.liveBench, {
          offsetPx: benchOffsetPx,
        })
      ) {
        return;
      }

      if (target === "bench" && attempt < 6) {
        attempt += 1;
        focusTimeoutRef.current = window.setTimeout(focusTarget, 220);
        return;
      }

      scrollToAnchor(conceptPageV2LessonHashId);
    };

    focusTimeoutRef.current = window.setTimeout(focusTarget, 0);
  }, []);

  const queueFocusGuidedTarget = useCallback(
    (target: "bench" | "step", nextStepId?: string) => {
      if (focusTimeoutRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }

      if (nextStepId && nextStepId !== activeStepIdRef.current) {
        pendingFocusTargetRef.current = target;
        return;
      }

      pendingFocusTargetRef.current = null;
      runFocusGuidedTarget(target);
    },
    [runFocusGuidedTarget],
  );

  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const target = pendingFocusTargetRef.current;

    if (!target) {
      return;
    }

    pendingFocusTargetRef.current = null;
    runFocusGuidedTarget(target);
  }, [activeStepId, runFocusGuidedTarget]);

  useEffect(() => {
    if (!model.steps.length || typeof window === "undefined") {
      return;
    }

    const syncFromLocation = () => {
      const url = new URL(window.location.href);
      const hashId = url.hash.replace(/^#/, "");
      const hashStepId = resolveConceptPageV2StepIdFromHash(model, hashId);
      const queryPhaseId = parseConceptLearningPhaseId(
        url.searchParams.get(conceptLearningPhaseQueryParam),
      );
      const preserveHashId =
        hashId === conceptShareAnchorIds.quickTest ||
        hashId === conceptShareAnchorIds.challengeMode ||
        hashId === conceptShareAnchorIds.readNext ||
        hashId === conceptShareAnchorIds.workedExamples
          ? hashId
          : null;
      const resolvedStepId =
        hashStepId ??
        resolveConceptPageV2StepIdFromLegacyPhase(model, queryPhaseId) ??
        model.steps[0]?.id ??
        "";

      setActiveStepId(resolvedStepId);

      if (queryPhaseId) {
        syncUrlToStep(resolvedStepId, preserveHashId);
      }

      if (!preserveHashId && (hashStepId || queryPhaseId)) {
        queueFocusGuidedTarget("step", resolvedStepId);
      }
    };

    syncFromLocation();
    window.addEventListener("hashchange", syncFromLocation);
    window.addEventListener("popstate", syncFromLocation);

    return () => {
      window.removeEventListener("hashchange", syncFromLocation);
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, [model, queueFocusGuidedTarget]);

  const activeStep =
    model.steps.find((step) => step.id === activeStepId) ?? model.steps[0] ?? null;

  const handleSelectStep = useCallback(
    (stepId: string, options?: { focusLab?: boolean }) => {
      setActiveStepId(stepId);
      syncUrlToStep(stepId);

      if (options?.focusLab) {
        queueFocusGuidedTarget("bench", stepId);
        return;
      }

      queueFocusGuidedTarget("step", stepId);
    },
    [queueFocusGuidedTarget],
  );

  const handleReturnToSetupArea = useCallback(
    (options?: { phaseId?: "explore" | "understand" | "check" }) => {
      const resolvedStepId = resolveConceptPageV2StepIdFromLegacyPhase(
        model,
        options?.phaseId,
      );

      if (resolvedStepId) {
        setActiveStepId(resolvedStepId);
        syncUrlToStep(resolvedStepId, conceptShareAnchorIds.liveBench);
        queueFocusGuidedTarget("bench", resolvedStepId);
        return;
      }

      queueFocusGuidedTarget("bench");
    },
    [model, queueFocusGuidedTarget],
  );

  const handleCompleteLesson = useCallback(() => {
    replaceUrlHash(conceptPageV2WrapUpHashId);
    scrollToAnchor(conceptPageV2WrapUpHashId);
  }, []);

  const lessonRail = activeStep ? (
    <ConceptPageV2LessonRail
      steps={model.steps}
      activeStepId={activeStep.id}
      copy={copy}
      onSelectStep={(stepId) => {
        handleSelectStep(stepId);
      }}
      onPreviousStep={() => {
        const currentIndex = model.steps.findIndex((step) => step.id === activeStep.id);
        const previousStep = currentIndex > 0 ? model.steps[currentIndex - 1] : null;

        if (previousStep) {
          handleSelectStep(previousStep.id);
        }
      }}
      onNextStep={() => {
        const currentIndex = model.steps.findIndex((step) => step.id === activeStep.id);
        const nextStep =
          currentIndex >= 0 && currentIndex < model.steps.length - 1
            ? model.steps[currentIndex + 1]
            : null;

        if (nextStep) {
          handleSelectStep(nextStep.id);
        }
      }}
      onCompleteLesson={handleCompleteLesson}
    />
  ) : null;
  const lessonSupport = activeStep ? (
    <ConceptPageV2LessonSupport
      steps={model.steps}
      activeStepId={activeStep.id}
      copy={copy}
      onSelectStep={(stepId) => {
        handleSelectStep(stepId);
      }}
      onCompleteLesson={handleCompleteLesson}
    />
  ) : null;

  const startHereContent = !hideStartHere ? (
    <div data-testid="concept-v2-hero-start" className="min-w-0">
      <ConceptPageV2StartHere
        title={model.title}
        intuition={model.intuition}
        whyItMatters={model.whyItMatters}
        estimatedTime={
          model.estimatedMinutes
            ? t("v2.estimatedMinutes", { count: model.estimatedMinutes })
            : null
        }
        prerequisites={model.prerequisites}
        simulationPreview={model.simulationPreview}
        keyTakeaway={model.keyTakeaway}
        equations={model.equationSnapshot}
        equationSnapshotNote={model.equationSnapshotNote}
        lessonSteps={model.steps}
        copy={{
          ...copy,
          startHereLabel: t("v2.postLabContextLabel"),
          startLearning: t("v2.returnToBenchLabel"),
        }}
        showTitle={!titleContextContent}
        showEquationSnapshot={false}
        onStartLearning={() => {
          if (model.steps[0]) {
            handleSelectStep(model.steps[0].id, { focusLab: true });
          }
        }}
      />
    </div>
  ) : null;

  return (
    <section data-testid="concept-page-v2-shell" className="mt-2.5 space-y-3 lg:mt-3">
      {titleContextContent ? (
        <div className="page-band p-2.5 sm:p-3 lg:p-3.5">
          <div
            data-testid="concept-v2-hero-grid"
            className="grid gap-3"
          >
            <div data-testid="concept-v2-hero-main" className="min-w-0">
              <div data-testid="concept-v2-hero-title" className="min-w-0">
                <Fragment>{titleContextContent}</Fragment>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <section
        id={conceptPageV2LessonHashId}
        data-testid="concept-v2-guided-live-lab"
        aria-label={copy.lessonFlowLabel}
        tabIndex={-1}
        className="scroll-mt-24 space-y-4"
      >
        <ConceptPagePhaseProvider
          activePhaseId={activeStep?.focusPhase ?? null}
          returnToSetupArea={handleReturnToSetupArea}
          guidedStepCard={lessonRail}
          guidedStepSupport={lessonSupport}
          guidedReveal={activeStep?.reveal ?? null}
        >
          {liveLabContent}
        </ConceptPagePhaseProvider>
      </section>

      {startHereContent || statusContent ? (
        <div data-testid="concept-v2-post-lab-context" className="grid gap-3">
          {startHereContent}
          {statusContent ? (
            <div data-testid="concept-v2-hero-status" className="min-w-0">
              <Fragment>{statusContent}</Fragment>
            </div>
          ) : null}
        </div>
      ) : null}

      <ConceptPageV2WrapUp wrapUp={model.wrapUp} copy={copy}>
        {model.wrapUpSections.length ? (
          <ConceptPageSections
            concept={concept}
            readNext={readNext}
            sections={model.wrapUpSections}
            workedExampleMode={workedExampleMode}
          />
        ) : null}
      </ConceptPageV2WrapUp>

      {model.referenceSections.length || model.equationSnapshot.length ? (
        <ConceptPageV2SecondarySection
          testId="concept-v2-reference"
          eyebrow={copy.referenceLabel}
          title={copy.referenceTitle}
          description={copy.referenceDescription}
          note={copy.deeperReferenceNote}
          actionLabel={copy.referenceDisclosureLabel}
        >
          <div className="space-y-4">
            {model.equationSnapshot.length ? (
              <ConceptPageV2EquationSnapshotCard
                key="reference-equation-snapshot"
                equations={model.equationSnapshot}
                note={model.equationSnapshotNote}
                copy={copy}
                compact
              />
            ) : null}
            {model.referenceSections.length ? (
              <ConceptPageSections
                concept={concept}
                readNext={readNext}
                sections={model.referenceSections}
                workedExampleMode={workedExampleMode}
              />
            ) : null}
          </div>
        </ConceptPageV2SecondarySection>
      ) : null}

      {supportRail ? supportRail : null}
      {afterPhasedSections}
    </section>
  );
}
