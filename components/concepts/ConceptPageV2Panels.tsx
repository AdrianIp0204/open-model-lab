"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import { localizeShareHref } from "@/lib/share-links";
import { RichMathText } from "./MathFormula";

export const conceptPageV2CurrentStepCardId = "concept-v2-current-step-card";
export const conceptPageV2CurrentStepHeadingId = "concept-v2-current-step-heading";
export const conceptPageV2WrapUpHashId = "concept-v2-wrap-up";

export type ConceptPageV2EquationSnapshot = {
  id: string;
  label: string;
  latex: string;
  meaning: string;
  readAloud?: string | null;
};

export type ConceptPageV2Prerequisite = {
  slug: string;
  title: string;
};

export type ConceptPageV2SimulationPreview = {
  title: string;
  description: string;
};

export type ConceptPageV2RevealItem = {
  id: string;
  kind: "control" | "graph" | "overlay" | "tool" | "section";
  label: string;
  tone?: "core" | "new" | "secondary";
};

export type ConceptPageV2InlineCheckViewModel = {
  eyebrow: string;
  title: string;
  prompt: string;
  supportingText?: string | null;
  choices?: string[];
};

export type ConceptPageV2StepViewModel = {
  id: string;
  label: string;
  summary?: string | null;
  goal: string;
  doThis: string;
  notice: string;
  explain: string;
  revealItems: ConceptPageV2RevealItem[];
  inlineCheck?: ConceptPageV2InlineCheckViewModel | null;
};

export type ConceptPageV2WrapUpViewModel = {
  learned: string[];
  misconception?: {
    myth: string;
    correction: string | null;
  } | null;
  testHref?: string | null;
  reviewHref?: string | null;
  nextConcepts: Array<{
    slug: string;
    title: string;
    reasonLabel?: string | null;
  }>;
  freePlayHref: string;
  challengeHref?: string | null;
  workedExamplesHref?: string | null;
};

type ConceptPageV2Copy = {
  startHereLabel: string;
  whyItMattersLabel: string;
  estimatedTimeLabel: string;
  prerequisitesLabel: string;
  noPrerequisites: string;
  simulationPreviewLabel: string;
  equationSnapshotLabel: string;
  equationReadAloudLabel: string;
  equationCountLabel: (values: { count: number }) => string;
  equationDisclosureLabel: string;
  startLearning: string;
  lessonFlowLabel: string;
  lessonPreviewDisclosureLabel: string;
  lessonPreviewDisclosureDescription: string;
  contextDisclosureLabel: string;
  contextDisclosureDescription: string;
  lessonStepCountLabel?: (values: { count: number }) => string;
  currentStepLabel: string;
  upcomingStepLabel: string;
  actLabel: string;
  observeLabel: string;
  explainLabel: string;
  nowAvailableLabel: string;
  revealOverflowLabel: (values: { count: number }) => string;
  quickCheckLabel: string;
  previousStep: string;
  nextStep: string;
  lessonCompleteLabel: string;
  lessonCompleteDescription: string;
  wrapUpLabel: string;
  referenceLabel: string;
  deeperReferenceNote: string;
  conceptTestLabel: string;
  conceptTestDescription: string;
  reviewBenchLabel: string;
  reviewBenchDescription: string;
  nextConceptsLabel: string;
  nextConceptsDescription: string;
  practiceActionsLabel: string;
  practiceActionsDescription: string;
  practiceOptionLabel: string;
  morePracticeOptionsLabel: string;
  moreReadNextOptionsLabel: string;
  showMoreOptionsLabel: string;
  hideMoreOptionsLabel: string;
  referenceDisclosureLabel: string;
  recommendedActionLabel: string;
  freePlayLabel: string;
  freePlayDescription: string;
  challengeLabel: string;
  challengeDescription: string;
  workedExamplesLabel: string;
  workedExamplesDescription: string;
  keyTakeawayLabel: string;
  wrapUpTitle: string;
  commonMisconceptionLabel: string;
  revealKinds: {
    control: string;
    graph: string;
    overlay: string;
    tool: string;
    section: string;
  };
};

const conceptPageV2TapTargetClass = "min-h-11";
const conceptPageV2CompactDisclosureTargetClass = "min-h-11";

const revealToneClasses: Record<
  NonNullable<ConceptPageV2RevealItem["tone"]>,
  string
> = {
  core: "border-ink-950/12 bg-white/92 text-ink-800",
  new: "border-teal-600/30 bg-teal-500/12 text-teal-800",
  secondary: "border-sky-600/24 bg-sky-500/10 text-sky-800",
};

function ConceptPageV2Disclosure({
  testId,
  className,
  summaryClassName,
  summaryAriaLabel,
  summaryAriaDescribedBy,
  summaryCollapsedAriaPrefix,
  summaryExpandedAriaPrefix,
  contentClassName,
  contentAriaLabelledBy,
  contentAriaDescribedBy,
  summary,
  children,
}: {
  testId?: string;
  className: string;
  summaryClassName: string;
  summaryAriaLabel?: string;
  summaryAriaDescribedBy?: string;
  summaryCollapsedAriaPrefix?: string;
  summaryExpandedAriaPrefix?: string;
  contentClassName: string;
  contentAriaLabelledBy?: string;
  contentAriaDescribedBy?: string;
  summary: ReactNode;
  children: ReactNode;
}) {
  const disclosureId = useId();
  const summaryId = `${disclosureId}-summary`;
  const contentId = `${disclosureId}-content`;
  const [isOpen, setIsOpen] = useState(false);
  const handleSummaryKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const details = event.currentTarget.parentElement;

    if (!(details instanceof HTMLDetailsElement)) {
      return;
    }

    event.preventDefault();
    const nextOpenState = !details.open;
    details.open = nextOpenState;
    setIsOpen(nextOpenState);
  };
  const resolvedSummaryAriaLabel = summaryAriaLabel
    ? [isOpen ? summaryExpandedAriaPrefix : summaryCollapsedAriaPrefix, summaryAriaLabel]
        .filter(Boolean)
        .join(": ")
    : undefined;

  return (
    <details
      data-testid={testId}
      suppressHydrationWarning
      className={className}
      onToggle={(event) => {
        setIsOpen(event.currentTarget.open);
      }}
    >
      <summary
        id={summaryId}
        aria-label={resolvedSummaryAriaLabel}
        aria-describedby={summaryAriaDescribedBy}
        aria-controls={contentId}
        aria-expanded={isOpen}
        className={summaryClassName}
        onKeyDown={handleSummaryKeyDown}
      >
        {summary}
      </summary>
      <div
        id={contentId}
        role="region"
        aria-labelledby={contentAriaLabelledBy ?? summaryId}
        aria-describedby={contentAriaDescribedBy}
        className={contentClassName}
      >
        {children}
      </div>
    </details>
  );
}

function renderRevealKindLabel(
  kind: ConceptPageV2RevealItem["kind"],
  copy: Pick<ConceptPageV2Copy, "revealKinds">,
) {
  switch (kind) {
    case "graph":
      return copy.revealKinds.graph;
    case "overlay":
      return copy.revealKinds.overlay;
    case "tool":
      return copy.revealKinds.tool;
    case "section":
      return copy.revealKinds.section;
    case "control":
    default:
      return copy.revealKinds.control;
  }
}

function resolveLessonRailState(
  steps: readonly ConceptPageV2StepViewModel[],
  activeStepId: string,
) {
  const matchedActiveIndex = steps.findIndex((step) => step.id === activeStepId);
  const activeIndex = matchedActiveIndex >= 0 ? matchedActiveIndex : 0;
  const activeStep = (steps[activeIndex] ?? steps[0])!;
  const previousStep = activeIndex > 0 ? steps[activeIndex - 1] : null;
  const nextStep = activeIndex < steps.length - 1 ? steps[activeIndex + 1] : null;

  return {
    activeIndex,
    activeStep,
    previousStep,
    nextStep,
    detailRows: [
      { label: "act", value: activeStep.doThis },
      { label: "observe", value: activeStep.notice },
      { label: "explain", value: activeStep.explain },
    ] as const,
  };
}

function ConceptPageV2LessonPreview({
  steps,
  label,
  quickCheckLabel,
  firstStepLabel,
  wrapUpLabel,
  lessonCompleteLabel,
  nextStepLabel,
  lessonStepCountLabel,
  compact = false,
}: {
  steps: readonly Pick<
    ConceptPageV2StepViewModel,
    "id" | "label" | "summary" | "goal" | "inlineCheck"
  >[];
  label: string;
  quickCheckLabel?: string;
  firstStepLabel?: string;
  wrapUpLabel?: string;
  lessonCompleteLabel?: string;
  nextStepLabel?: string;
  lessonStepCountLabel?: (values: { count: number }) => string;
  compact?: boolean;
}) {
  const flowSummaryId = useId();

  if (!steps.length) {
    return null;
  }

  const stepCountLabel = lessonStepCountLabel?.({ count: steps.length }) ?? `${steps.length}`;
  const flowSummary = wrapUpLabel ? `${stepCountLabel} + ${wrapUpLabel}` : stepCountLabel;
  const previewStepCount = steps.length + (wrapUpLabel ? 1 : 0);
  const wrapUpPreviewAriaLabel = wrapUpLabel
    ? [nextStepLabel ? `${nextStepLabel}: ${wrapUpLabel}` : wrapUpLabel, lessonCompleteLabel]
        .filter(Boolean)
        .join(" — ")
    : undefined;
  const previewListClassName =
    "mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4";
  const stepCardClassName = compact
    ? "grid min-h-[3.85rem] grid-cols-[auto_minmax(0,1fr)] items-start gap-1.5 rounded-[12px] border px-2 py-1.5"
    : "grid min-h-[4.35rem] grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-[12px] border px-2.5 py-2";
  const wrapUpCardClassName = compact
    ? "grid min-h-[3.85rem] grid-cols-[auto_minmax(0,1fr)] items-start gap-1.5 rounded-[12px] border border-line/80 bg-white/86 px-2 py-1.5 2xl:col-span-1"
    : "grid min-h-[4.35rem] grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-[12px] border border-line/80 bg-white/86 px-2.5 py-2 sm:col-span-2 md:col-span-3 2xl:col-span-1";

  return (
    <div
      data-testid="concept-v2-start-lesson-preview"
      className={[
        "rounded-[18px] border border-line/80 bg-white/90 shadow-sm",
        compact ? "px-3 py-2.5 sm:px-3.5 sm:py-3" : "px-4 py-3.5",
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p className="lab-label min-w-0 break-words text-ink-700">{label}</p>
        <span
          id={flowSummaryId}
          className="inline-flex max-w-full min-w-0 rounded-full border border-ink-950/10 bg-white px-2.5 py-1 text-center text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-700 break-words"
        >
          {flowSummary}
        </span>
      </div>
      <ol
        aria-label={label}
        aria-describedby={flowSummaryId}
        data-testid="concept-v2-start-lesson-preview-list"
        className={previewListClassName}
      >
        {steps.map((step, index) => {
          const isFirstStep = index === 0;
          const hasQuickCheckBadge = Boolean(step.inlineCheck && quickCheckLabel);
          const stepSummaryText = step.summary || step.goal;
          const stepPreviewAriaLabel = [
            isFirstStep ? firstStepLabel : null,
            step.label,
            stepSummaryText,
            hasQuickCheckBadge ? quickCheckLabel : null,
          ]
            .filter(Boolean)
            .join(" — ");

          return (
            <li
              key={step.id}
              data-testid={isFirstStep ? "concept-v2-start-lesson-preview-first" : undefined}
              aria-label={stepPreviewAriaLabel}
              aria-posinset={index + 1}
              aria-setsize={previewStepCount}
              className={[
                stepCardClassName,
                isFirstStep
                  ? "border-teal-600/28 bg-teal-500/10"
                  : "border-line/80 bg-paper/76",
              ].join(" ")}
            >
              <span
                aria-hidden="true"
                className={[
                  "mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[0.68rem] font-semibold",
                  isFirstStep
                    ? "border-teal-600/34 bg-white text-teal-800"
                    : "border-teal-600/24 bg-white text-teal-800",
                ].join(" ")}
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                {firstStepLabel && isFirstStep ? (
                  <span className="mb-1 flex min-w-0 flex-wrap gap-1">
                    <span
                      data-testid="concept-v2-start-lesson-preview-first-badge"
                      className="inline-flex max-w-full min-w-0 rounded-full border border-teal-600/26 bg-white/92 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-teal-800 break-words"
                    >
                      {firstStepLabel}
                    </span>
                    {hasQuickCheckBadge ? (
                      <span
                        data-testid="concept-v2-start-lesson-preview-quick-check"
                        className="inline-flex max-w-full min-w-0 rounded-full border border-amber-600/26 bg-amber-500/12 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-amber-800 break-words"
                      >
                        {quickCheckLabel}
                      </span>
                    ) : null}
                  </span>
                ) : hasQuickCheckBadge ? (
                  <span className="mb-1 flex min-w-0 flex-wrap gap-1">
                    <span
                      data-testid="concept-v2-start-lesson-preview-quick-check"
                      className="inline-flex max-w-full min-w-0 rounded-full border border-amber-600/26 bg-amber-500/12 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-amber-800 break-words"
                    >
                      {quickCheckLabel}
                    </span>
                  </span>
                ) : null}
                <RichMathText
                  as="span"
                  content={step.label}
                  className="line-clamp-2 block break-words text-xs font-semibold leading-5 text-ink-800"
                />
                {stepSummaryText ? (
                  <RichMathText
                    as="span"
                    content={stepSummaryText}
                    className="mt-0.5 line-clamp-1 block break-words text-[0.72rem] leading-4 text-ink-700"
                  />
                ) : null}
              </span>
            </li>
          );
        })}
        {wrapUpLabel ? (
          <li
            data-testid="concept-v2-start-lesson-preview-wrap-up"
            aria-label={wrapUpPreviewAriaLabel}
            aria-posinset={steps.length + 1}
            aria-setsize={previewStepCount}
            className={wrapUpCardClassName}
          >
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-teal-600/30 bg-teal-500/12 text-[0.68rem] font-semibold text-teal-800"
            >
              ✓
            </span>
            <span className="min-w-0">
              <span className="mb-1 flex min-w-0 flex-wrap gap-1">
                {nextStepLabel ? (
                  <span
                    data-testid="concept-v2-start-lesson-preview-wrap-up-next-step-cue"
                    className="inline-flex max-w-full min-w-0 rounded-full border border-teal-600/20 bg-white/82 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-teal-800 break-words"
                  >
                    {nextStepLabel}
                  </span>
                ) : null}
                <span className="inline-flex max-w-full min-w-0 break-words rounded-full border border-teal-600/24 bg-white/90 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-teal-800">
                  {wrapUpLabel}
                </span>
              </span>
              {lessonCompleteLabel ? (
                <span className="mt-0.5 line-clamp-2 block break-words text-[0.72rem] font-semibold leading-4 text-ink-700">
                  {lessonCompleteLabel}
                </span>
              ) : null}
            </span>
          </li>
        ) : null}
      </ol>
    </div>
  );
}

function ConceptPageV2EquationFormulaDisplay({
  equation,
  className,
}: {
  equation: ConceptPageV2EquationSnapshot;
  className: string;
}) {
  const accessibleFormula = equation.readAloud ?? equation.latex;

  return (
    <div
      role="img"
      aria-label={`${equation.label}: ${accessibleFormula}`}
      tabIndex={0}
      className={[
        "max-w-full overflow-x-auto whitespace-nowrap rounded-[10px] pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper [scrollbar-width:thin]",
        className,
      ].join(" ")}
    >
      <RichMathText as="span" content={`$${equation.latex}$`} />
    </div>
  );
}

export function ConceptPageV2EquationSnapshotCard({
  equations,
  copy,
  compact = false,
  className,
  note,
}: {
  equations: ConceptPageV2EquationSnapshot[];
  copy: Pick<
    ConceptPageV2Copy,
    | "equationSnapshotLabel"
    | "equationReadAloudLabel"
    | "equationCountLabel"
    | "equationDisclosureLabel"
  >;
  compact?: boolean;
  className?: string;
  note?: string | null;
}) {
  const equationSnapshotHeadingId = useId();
  const equationSnapshotNoteId = useId();

  if (!equations.length) {
    return null;
  }

  if (compact) {
    const equationPreview = equations
      .slice(0, 2)
      .map((equation) => equation.label)
      .join(" · ");
    const equationCountText = copy.equationCountLabel({ count: equations.length });
    const equationDisclosureText = `${copy.equationDisclosureLabel} ${equationCountText}`;

    return (
      <section
        data-testid="concept-v2-equation-snapshot"
        aria-labelledby={equationSnapshotHeadingId}
        aria-describedby={note ? equationSnapshotNoteId : undefined}
        className={[
          "rounded-[18px] border border-line/70 bg-white/72 px-3 py-2.5 shadow-none",
          className ?? "",
        ].join(" ")}
      >
        <ConceptPageV2Disclosure
          className="group"
          summaryClassName="grid min-h-11 cursor-pointer list-none gap-2 rounded-[14px] px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center [&::-webkit-details-marker]:hidden"
          summaryAriaLabel={`${equationDisclosureText}: ${copy.equationSnapshotLabel} — ${equationPreview}`}
          summaryAriaDescribedBy={note ? equationSnapshotNoteId : undefined}
          contentClassName="mt-1"
          contentAriaDescribedBy={note ? equationSnapshotNoteId : undefined}
          summary={(
            <>
              <span className="min-w-0">
                <span
                  id={equationSnapshotHeadingId}
                  className="lab-label block text-[0.64rem] tracking-[0.12em] text-ink-700"
                >
                  {copy.equationSnapshotLabel}
                </span>
                <span className="mt-0.5 line-clamp-2 block break-words text-xs font-semibold leading-4 text-ink-900">
                  {equationPreview}
                </span>
              </span>
              <span className="inline-flex min-h-9 w-full shrink-0 items-center justify-center gap-2 rounded-full border border-ink-950/10 bg-white px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-700 shadow-sm sm:w-auto">
                <span>{equationDisclosureText}</span>
                <span aria-hidden="true" className="text-ink-500 transition-transform group-open:rotate-180 motion-reduce:transition-none">
                  ↓
                </span>
              </span>
            </>
          )}
        >
          {note ? (
            <p id={equationSnapshotNoteId} className="px-1 text-xs leading-5 text-ink-700">
              <RichMathText as="span" content={note} />
            </p>
          ) : null}
          <ol aria-labelledby={equationSnapshotHeadingId} className="mt-2 grid gap-2">
            {equations.map((equation) => (
              <li
                key={equation.id}
                className="rounded-[14px] border border-line/80 bg-paper-strong/82 px-3 py-2"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-700">
                  {equation.label}
                </p>
                <ConceptPageV2EquationFormulaDisplay
                  equation={equation}
                  className="mt-1.5 text-sm font-semibold text-ink-950"
                />
                {equation.readAloud ? (
                  <p className="mt-1.5 text-xs leading-5 text-ink-700">
                    <span className="font-semibold text-ink-900">
                      {copy.equationReadAloudLabel}:
                    </span>{" "}
                    {equation.readAloud}
                  </p>
                ) : null}
                <RichMathText
                  as="p"
                  content={equation.meaning}
                  className="mt-1.5 text-xs leading-5 text-ink-700"
                />
              </li>
            ))}
          </ol>
        </ConceptPageV2Disclosure>
      </section>
    );
  }

  return (
    <section
      data-testid="concept-v2-equation-snapshot"
      aria-labelledby={equationSnapshotHeadingId}
      aria-describedby={note ? equationSnapshotNoteId : undefined}
      className={[
        "rounded-[24px] border border-line/80 bg-white/88 px-4 py-4 shadow-sm",
        className ?? "",
      ].join(" ")}
    >
      <p id={equationSnapshotHeadingId} className="lab-label text-ink-700">
        {copy.equationSnapshotLabel}
      </p>
      {note ? (
        <p id={equationSnapshotNoteId} className="mt-1 text-sm leading-6 text-ink-700">
          <RichMathText as="span" content={note} />
        </p>
      ) : null}
      <ol aria-labelledby={equationSnapshotHeadingId} className="mt-3 grid gap-3">
        {equations.map((equation) => (
          <li
            key={equation.id}
            className="rounded-[18px] border border-line bg-paper-strong px-3.5 py-3 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-700">
              {equation.label}
            </p>
            <ConceptPageV2EquationFormulaDisplay
              equation={equation}
              className="mt-2 text-base font-semibold text-ink-950"
            />
            {equation.readAloud ? (
              <p className="mt-2 text-xs leading-5 text-ink-700">
                <span className="font-semibold text-ink-900">
                  {copy.equationReadAloudLabel}:
                </span>{" "}
                {equation.readAloud}
              </p>
            ) : null}
            <RichMathText
              as="p"
              content={equation.meaning}
              className="mt-2 text-sm leading-6 text-ink-700"
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ConceptPageV2StartHere({
  title,
  intuition,
  whyItMatters,
  estimatedTime,
  prerequisites = [],
  simulationPreview,
  keyTakeaway,
  equations,
  equationSnapshotNote,
  lessonSteps = [],
  copy,
  showTitle = true,
  showEquationSnapshot = true,
  onStartLearning,
}: {
  title: string;
  intuition: string;
  whyItMatters?: string | null;
  estimatedTime?: string | null;
  prerequisites?: readonly ConceptPageV2Prerequisite[];
  simulationPreview?: ConceptPageV2SimulationPreview | null;
  keyTakeaway?: string | null;
  equations: ConceptPageV2EquationSnapshot[];
  equationSnapshotNote?: string | null;
  lessonSteps?: readonly Pick<
    ConceptPageV2StepViewModel,
    "id" | "label" | "summary" | "goal" | "inlineCheck"
  >[];
  copy: Pick<
    ConceptPageV2Copy,
    | "startHereLabel"
    | "whyItMattersLabel"
    | "estimatedTimeLabel"
    | "prerequisitesLabel"
    | "noPrerequisites"
    | "simulationPreviewLabel"
    | "equationSnapshotLabel"
    | "equationReadAloudLabel"
    | "equationCountLabel"
    | "equationDisclosureLabel"
    | "keyTakeawayLabel"
    | "lessonFlowLabel"
    | "lessonPreviewDisclosureLabel"
    | "lessonPreviewDisclosureDescription"
    | "contextDisclosureLabel"
    | "contextDisclosureDescription"
    | "quickCheckLabel"
    | "startLearning"
    | "wrapUpLabel"
    | "lessonCompleteLabel"
  > & {
    nextStep?: string;
    lessonStepCountLabel?: (values: { count: number }) => string;
  };
  showTitle?: boolean;
  showEquationSnapshot?: boolean;
  onStartLearning: () => void;
}) {
  const locale = useLocale() as AppLocale;
  const startHereHeadingId = useId();
  const startHereDescriptionId = useId();
  const estimatedTimeId = useId();
  const prerequisitesHeadingId = useId();
  const prerequisitesContentId = useId();
  const simulationPreviewHeadingId = useId();
  const simulationPreviewDescriptionId = useId();
  const whyItMattersHeadingId = useId();
  const whyItMattersDescriptionId = useId();
  const keyTakeawayHeadingId = useId();
  const keyTakeawayDescriptionId = useId();
  const firstLessonStepDescriptionId = useId();
  const compactLayout = !showTitle || !showEquationSnapshot;
  const firstLessonStep = lessonSteps[0] ?? null;
  const firstLessonStepDescription = firstLessonStep
    ? [
        `${copy.startHereLabel}: ${copy.lessonFlowLabel}: ${firstLessonStep.label}.`,
        firstLessonStep.summary || firstLessonStep.goal,
      ]
        .filter(Boolean)
        .join(" ")
    : null;
  const hasPrerequisites = prerequisites.length > 0;
  const useCompactNoPrerequisites = compactLayout && !hasPrerequisites;
  const prerequisiteContent = hasPrerequisites ? (
    <ul
      id={prerequisitesContentId}
      aria-labelledby={prerequisitesHeadingId}
      className="mt-2 flex flex-wrap gap-1.5"
    >
      {prerequisites.map((prerequisite) => (
        <li key={prerequisite.slug}>
          <Link
            href={localizeShareHref(`/concepts/${prerequisite.slug}`, locale)}
            aria-describedby={prerequisitesHeadingId}
            className="inline-flex min-h-11 max-w-full min-w-0 items-center rounded-full border border-ink-950/10 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-ink-800 transition hover:border-teal-600/30 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            <span className="min-w-0 break-words">{prerequisite.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  ) : (
    <p
      id={prerequisitesContentId}
      className={[
        "font-semibold text-ink-900",
        useCompactNoPrerequisites
          ? "text-xs leading-5"
          : "mt-1 text-sm leading-5",
      ].join(" ")}
    >
      {copy.noPrerequisites}
    </p>
  );
  const startButtonDescriptionIds = [
    estimatedTime ? estimatedTimeId : null,
    prerequisitesHeadingId,
    prerequisitesContentId,
    simulationPreview ? simulationPreviewDescriptionId : null,
    firstLessonStepDescription ? firstLessonStepDescriptionId : null,
  ]
    .filter(Boolean)
    .join(" ");
  const startHereLabelNode = showTitle ? (
    <p id={startHereHeadingId} className="lab-label text-ink-700">{copy.startHereLabel}</p>
  ) : (
    <h2 id={startHereHeadingId} className="lab-label text-ink-700">{copy.startHereLabel}</h2>
  );
  const startHandoffLabel = `${copy.startHereLabel}: ${copy.startLearning}`;
  const startHandoff = (
    <aside
      data-testid="concept-v2-start-handoff"
      className="rounded-[20px] border border-ink-950/12 bg-white/90 p-3 shadow-sm"
      aria-label={startHandoffLabel}
    >
      {estimatedTime ? (
        <p
          id={estimatedTimeId}
          className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-700"
        >
          {copy.estimatedTimeLabel}: <span className="text-ink-950">{estimatedTime}</span>
        </p>
      ) : null}
      <button
        type="button"
        aria-describedby={startButtonDescriptionIds || undefined}
        onClick={onStartLearning}
        className="group relative z-10 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-ink-950 bg-ink-950 px-5 py-2.5 text-sm font-semibold text-paper-strong shadow-sm transition hover:bg-ink-900 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        <span>{copy.startLearning}</span>
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none">
          →
        </span>
      </button>
      {firstLessonStepDescription ? (
        <p
          id={firstLessonStepDescriptionId}
          data-testid="concept-v2-start-first-step-description"
          className="sr-only"
        >
          {firstLessonStepDescription}
        </p>
      ) : null}
      {!compactLayout && firstLessonStep ? (
        <div
          data-testid="concept-v2-start-first-step-teaser"
          className="mt-3 min-w-0 rounded-[16px] border border-teal-600/24 bg-teal-500/10 px-3 py-2"
        >
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-teal-800">
              {copy.lessonFlowLabel}
            </p>
            <span
              data-testid="concept-v2-start-first-step-badge"
              className="inline-flex max-w-full min-w-0 rounded-full border border-teal-600/26 bg-white/92 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-teal-800 break-words"
            >
              {copy.startHereLabel}
            </span>
          </div>
          <RichMathText
            as="p"
            content={firstLessonStep.label}
            className="mt-1 break-words text-sm font-semibold leading-5 text-ink-950"
          />
          {firstLessonStep.summary || firstLessonStep.goal ? (
            <RichMathText
              as="p"
              content={firstLessonStep.summary || firstLessonStep.goal}
              className="mt-0.5 line-clamp-2 break-words text-xs leading-5 text-ink-700"
            />
          ) : null}
        </div>
      ) : null}
    </aside>
  );
  const prerequisitesBlock = (
    <section
      data-testid="concept-v2-prerequisites"
      aria-labelledby={prerequisitesHeadingId}
      className={
        useCompactNoPrerequisites
          ? "inline-flex w-fit max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-line bg-white/72 px-3 py-2 shadow-sm"
          : "rounded-[18px] border border-line bg-white/90 px-3.5 py-3 shadow-sm"
      }
    >
      <h3
        id={prerequisitesHeadingId}
        className={useCompactNoPrerequisites
          ? "text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-ink-600"
          : "lab-label text-ink-700"}
      >
        {copy.prerequisitesLabel}
      </h3>
      {prerequisiteContent}
    </section>
  );
  const simulationPreviewRepeatsTitle =
    simulationPreview?.title.trim() === title.trim();
  const simulationPreviewBlock = simulationPreview ? (
    <section
      data-testid="concept-v2-simulation-preview"
      aria-labelledby={simulationPreviewHeadingId}
      aria-describedby={simulationPreviewDescriptionId}
      className="rounded-[18px] border border-sky-600/22 bg-sky-500/10 px-3.5 py-3 shadow-sm"
    >
      <h3 id={simulationPreviewHeadingId} className="lab-label text-sky-800">
        {copy.simulationPreviewLabel}
      </h3>
      {!simulationPreviewRepeatsTitle ? (
        <p className="mt-1 break-words text-sm font-semibold leading-5 text-ink-950">
          {simulationPreview.title}
        </p>
      ) : null}
      <p
        id={simulationPreviewDescriptionId}
        className="mt-1 break-words text-sm leading-5.5 text-ink-700"
      >
        {simulationPreview.description}
      </p>
    </section>
  ) : null;
  const orientationBlocks = (
    <div className={simulationPreview ? "grid gap-2 md:grid-cols-2" : "grid gap-2"}>
      {prerequisitesBlock}
      {simulationPreviewBlock}
    </div>
  );
  const supportBlockCount = Number(Boolean(whyItMatters)) + Number(Boolean(keyTakeaway));
  const supportBlocks = supportBlockCount > 0 ? (
    <dl className={supportBlockCount > 1 ? "grid gap-2 md:grid-cols-2" : "grid gap-2"}>
      {whyItMatters ? (
        <div
          role="group"
          aria-labelledby={whyItMattersHeadingId}
          aria-describedby={whyItMattersDescriptionId}
          className="min-w-0 rounded-[18px] border border-line bg-white/78 px-3.5 py-3 shadow-sm"
        >
          <dt id={whyItMattersHeadingId} className="lab-label min-w-0 break-words">
            {copy.whyItMattersLabel}
          </dt>
          <dd
            id={whyItMattersDescriptionId}
            className="mt-1 min-w-0 break-words text-sm leading-5.5 text-ink-700"
          >
            <RichMathText as="span" content={whyItMatters} />
          </dd>
        </div>
      ) : null}
      {keyTakeaway ? (
        <div
          role="group"
          aria-labelledby={keyTakeawayHeadingId}
          aria-describedby={keyTakeawayDescriptionId}
          className="min-w-0 rounded-[18px] border border-teal-500/18 bg-teal-500/8 px-3.5 py-3 shadow-sm"
        >
          <dt id={keyTakeawayHeadingId} className="lab-label min-w-0 break-words">
            {copy.keyTakeawayLabel}
          </dt>
          <dd
            id={keyTakeawayDescriptionId}
            className="mt-1 min-w-0 break-words text-sm font-semibold leading-5.5 text-ink-900"
          >
            <RichMathText as="span" content={keyTakeaway} />
          </dd>
        </div>
      ) : null}
    </dl>
  ) : null;
  const compactLessonPreview = lessonSteps.length ? (
    <ConceptPageV2Disclosure
      testId="concept-v2-start-lesson-disclosure"
      className="group rounded-[18px] border border-line/80 bg-white/86 px-3 py-2.5 shadow-sm"
      summaryClassName="min-w-0 cursor-pointer list-none rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper [&::-webkit-details-marker]:hidden"
      summaryAriaLabel={copy.lessonPreviewDisclosureLabel}
      contentClassName="mt-3 min-w-0"
      summary={(
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="lab-label block min-w-0 break-words text-ink-700">
              {copy.lessonFlowLabel}
            </span>
            <span className="mt-1 block min-w-0 break-words text-sm font-semibold leading-5 text-ink-950">
              {copy.lessonPreviewDisclosureLabel}
            </span>
            <span className="sr-only">
              {copy.lessonPreviewDisclosureDescription}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-paper-strong text-sm font-semibold text-ink-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          >
            {"\u2193"}
          </span>
        </div>
      )}
    >
      <ConceptPageV2LessonPreview
        steps={lessonSteps}
        label={copy.lessonFlowLabel}
        quickCheckLabel={copy.quickCheckLabel}
        firstStepLabel={copy.startHereLabel}
        wrapUpLabel={copy.wrapUpLabel}
        lessonCompleteLabel={copy.lessonCompleteLabel}
        nextStepLabel={copy.nextStep}
        lessonStepCountLabel={copy.lessonStepCountLabel}
        compact
      />
    </ConceptPageV2Disclosure>
  ) : null;
  const compactContext = supportBlocks ? (
    <ConceptPageV2Disclosure
      testId="concept-v2-start-context-disclosure"
      className="group rounded-[18px] border border-line/80 bg-white/78 px-3 py-2.5 shadow-sm"
      summaryClassName="min-w-0 cursor-pointer list-none rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper [&::-webkit-details-marker]:hidden"
      summaryAriaLabel={copy.contextDisclosureLabel}
      contentClassName="mt-3 min-w-0"
      summary={(
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="lab-label block min-w-0 break-words text-ink-700">
              {copy.whyItMattersLabel}
            </span>
            <span className="mt-1 block min-w-0 break-words text-sm font-semibold leading-5 text-ink-950">
              {copy.contextDisclosureLabel}
            </span>
            <span className="sr-only">
              {copy.contextDisclosureDescription}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-paper-strong text-sm font-semibold text-ink-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          >
            {"\u2193"}
          </span>
        </div>
      )}
    >
      {supportBlocks}
    </ConceptPageV2Disclosure>
  ) : null;

  if (compactLayout) {
    return (
      <section
        data-testid="concept-v2-start-here"
        aria-labelledby={startHereHeadingId}
        aria-describedby={startHereDescriptionId}
        className="rounded-[28px] border border-teal-500/18 bg-[linear-gradient(135deg,rgba(20,184,166,0.1)_0%,rgba(255,255,255,0.97)_48%,rgba(255,255,255,0.99)_100%)] px-4 py-3.5 shadow-sm ring-1 ring-white/70 sm:px-5"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,19rem)] lg:items-start">
          <div className="min-w-0 space-y-2">
            {startHereLabelNode}
            {showTitle ? (
              <h2 className="break-words text-[1.55rem] font-semibold leading-tight text-ink-950 sm:text-[1.9rem]">
                {title}
              </h2>
            ) : null}
            <RichMathText
              as="p"
              id={startHereDescriptionId}
              content={intuition}
              className="max-w-3xl break-words text-sm leading-6 text-ink-800"
            />
          </div>
          <div className="lg:col-start-2 lg:row-span-2">
            {startHandoff}
          </div>
          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            {prerequisitesBlock}
          </div>
        </div>

        <div className="mt-2.5 grid gap-2.5 lg:grid-cols-2">
          {simulationPreviewBlock ? (
            <div className="min-w-0 lg:col-span-2">{simulationPreviewBlock}</div>
          ) : null}
          {compactLessonPreview}
          {compactContext}
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="concept-v2-start-here"
      aria-labelledby={startHereHeadingId}
      aria-describedby={startHereDescriptionId}
      className="rounded-[28px] border border-teal-500/18 bg-[linear-gradient(135deg,rgba(20,184,166,0.1)_0%,rgba(255,255,255,0.97)_48%,rgba(255,255,255,0.99)_100%)] px-4 py-4 shadow-sm ring-1 ring-white/70 sm:px-5"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(16rem,22rem)]">
        <div className="space-y-3">
          {startHereLabelNode}
          <div className="space-y-2">
            {showTitle ? (
              <h2 className="break-words text-[1.7rem] font-semibold leading-tight text-ink-950 sm:text-[2.15rem]">
                {title}
              </h2>
            ) : null}
            <RichMathText
              as="p"
              id={startHereDescriptionId}
              content={intuition}
              className="max-w-3xl break-words text-sm leading-6 text-ink-800 sm:text-base sm:leading-7"
            />
          </div>
        </div>

        <div className="space-y-3 xl:col-start-2 xl:row-span-2 xl:row-start-1">
          {startHandoff}
          {showEquationSnapshot ? (
            <ConceptPageV2EquationSnapshotCard
              equations={equations}
              note={equationSnapshotNote}
              copy={{
                equationSnapshotLabel: copy.equationSnapshotLabel,
                equationReadAloudLabel: copy.equationReadAloudLabel,
                equationCountLabel: copy.equationCountLabel,
                equationDisclosureLabel: copy.equationDisclosureLabel,
              }}
            />
          ) : null}
        </div>

        <div className="space-y-3 xl:col-start-1 xl:row-start-2">
          {orientationBlocks}
          {supportBlocks}
          <ConceptPageV2LessonPreview
            steps={lessonSteps}
            label={copy.lessonFlowLabel}
            quickCheckLabel={copy.quickCheckLabel}
            firstStepLabel={copy.startHereLabel}
            wrapUpLabel={copy.wrapUpLabel}
            lessonCompleteLabel={copy.lessonCompleteLabel}
            nextStepLabel={copy.nextStep}
            lessonStepCountLabel={copy.lessonStepCountLabel}
          />
        </div>
      </div>
    </section>
  );
}

export function ConceptPageV2LessonRail({
  steps,
  activeStepId,
  copy,
  onSelectStep,
  onPreviousStep,
  onNextStep,
  onCompleteLesson,
}: {
  steps: readonly ConceptPageV2StepViewModel[];
  activeStepId: string;
  copy: Pick<
    ConceptPageV2Copy,
    | "lessonFlowLabel"
    | "currentStepLabel"
    | "upcomingStepLabel"
    | "actLabel"
    | "observeLabel"
    | "explainLabel"
    | "nowAvailableLabel"
    | "revealOverflowLabel"
    | "quickCheckLabel"
    | "previousStep"
    | "nextStep"
    | "lessonCompleteLabel"
    | "lessonCompleteDescription"
    | "wrapUpLabel"
    | "revealKinds"
  >;
  onSelectStep?: (stepId: string) => void;
  onPreviousStep: () => void;
  onNextStep: () => void;
  onCompleteLesson?: () => void;
}) {
  const nextCheckpointDescriptionId = useId();
  const completeCheckpointDescriptionId = useId();
  const stepMapDescriptionIdBase = useId();
  const railInlineCheckPromptId = useId();
  const railInlineCheckSupportingId = useId();
  const railInlineCheckLabelId = useId();
  const railInlineCheckTitleId = useId();
  const currentStepCardLabelId = useId();
  const railRevealContextId = useId();
  const railRevealHeadingId = useId();
  const railActionPathIdBase = useId();
  const activeStepMapItemRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    const activeStepMapItem = activeStepMapItemRef.current;

    if (
      !activeStepMapItem ||
      typeof window === "undefined" ||
      typeof activeStepMapItem.scrollIntoView !== "function"
    ) {
      return;
    }

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    activeStepMapItem.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [activeStepId]);

  if (!steps.length) {
    return null;
  }

  const { activeIndex, activeStep, previousStep, nextStep, detailRows } =
    resolveLessonRailState(steps, activeStepId);
  const activePosition = Math.max(activeIndex + 1, 1);
  const nextStepPrimaryReveal = nextStep?.revealItems[0] ?? null;
  const nextStepAdditionalRevealCount = Math.max(
    0,
    (nextStep?.revealItems.length ?? 0) - 1,
  );
  const progressPercent = steps.length
    ? (activePosition / steps.length) * 100
    : 0;
  const progressValueText = `${copy.currentStepLabel}: ${activePosition} / ${Math.max(
    steps.length,
    1,
  )} — ${activeStep.label}`;
  const isWrapUpReady = steps.length > 0 && activeIndex >= steps.length - 1;
  const finalWrapUpAriaLabel = `${copy.nextStep}: ${copy.wrapUpLabel} — ${copy.lessonCompleteLabel}`;
  const staticWrapUpAriaLabel = isWrapUpReady
    ? finalWrapUpAriaLabel
    : `${copy.wrapUpLabel} — ${copy.lessonCompleteLabel}`;
  const canAdvanceToWrapUp = !nextStep && isWrapUpReady && Boolean(onCompleteLesson);
  const nextNavigationAriaLabel = nextStep
    ? `${copy.nextStep}: ${nextStep.label}`
    : canAdvanceToWrapUp
      ? finalWrapUpAriaLabel
      : copy.nextStep;
  const nextNavigationLabel = nextStep?.label ?? (canAdvanceToWrapUp ? copy.wrapUpLabel : null);
  const canSelectSteps = Boolean(onSelectStep);
  const railInlineCheckDescriptionIds = activeStep.inlineCheck
    ? [
        railInlineCheckPromptId,
        activeStep.inlineCheck.supportingText ? railInlineCheckSupportingId : null,
      ]
        .filter((id): id is string => Boolean(id))
        .join(" ")
    : undefined;

  return (
    <aside
      data-testid="concept-v2-step-rail"
      data-onboarding-target="concept-phase-rail"
      className="xl:sticky xl:top-20"
    >
      <section
        id={conceptPageV2CurrentStepCardId}
        data-testid="concept-v2-current-step-card"
        aria-labelledby={`${currentStepCardLabelId} ${conceptPageV2CurrentStepHeadingId}`}
        className="rounded-[22px] border border-line/80 bg-white/90 px-4 py-3 shadow-sm"
      >
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="lab-label">{copy.lessonFlowLabel}</p>
              <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-600">
                {activePosition} / {steps.length}
              </span>
            </div>
            <RichMathText as="p" content={activeStep.label} className="break-words text-sm font-semibold leading-5 text-ink-950" />
            <div
              role="progressbar"
              aria-label={copy.lessonFlowLabel}
              aria-valuemin={1}
              aria-valuemax={Math.max(steps.length, 1)}
              aria-valuenow={activePosition}
              aria-valuetext={progressValueText}
              data-testid="concept-v2-step-progress"
              className="h-2 overflow-hidden rounded-full border border-teal-500/16 bg-paper"
            >
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,rgba(20,184,166,0.78),rgba(14,165,233,0.72))] transition-[width] duration-300 ease-out motion-reduce:transition-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="rounded-[18px] border border-line/80 bg-paper-strong/80 px-3 py-2.5">
              <p id={currentStepCardLabelId} className="lab-label">
                {copy.currentStepLabel}
                <span className="sr-only">:</span>
              </p>
              <h2
                id={conceptPageV2CurrentStepHeadingId}
                tabIndex={-1}
                className="mt-1 scroll-mt-24 break-words text-sm font-semibold leading-5 text-ink-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                <RichMathText as="span" content={activeStep.goal} />
              </h2>
              <ol
                data-testid="concept-v2-rail-action-path"
                aria-label={`${copy.currentStepLabel}: ${activeStep.goal}`}
                className="mt-2 grid gap-1.5 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3"
              >
                {detailRows.map((row, index) => {
                  const isActionCard = row.label === "act";
                  const rowLabel = isActionCard
                    ? copy.actLabel
                    : row.label === "observe"
                      ? copy.observeLabel
                      : copy.explainLabel;
                  const rowLabelId = `${railActionPathIdBase}-${row.label}-label`;
                  const rowDescriptionId = `${railActionPathIdBase}-${row.label}-description`;

                  return (
                    <li
                      key={row.label}
                      aria-labelledby={rowLabelId}
                      aria-describedby={rowDescriptionId}
                      className={[
                        "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-[14px] border px-2.5 py-2",
                        isActionCard
                          ? "border-teal-500/24 bg-teal-500/10 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset]"
                          : "border-line/80 bg-white/82",
                      ].join(" ")}
                    >
                      <span
                        aria-hidden="true"
                        className={[
                          "mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[0.66rem] font-semibold",
                          isActionCard
                            ? "border-teal-500/28 bg-white text-teal-700"
                            : "border-line bg-paper text-ink-500",
                        ].join(" ")}
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span
                          id={rowLabelId}
                          className="block text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-ink-500"
                        >
                          {rowLabel}
                        </span>
                        <span id={rowDescriptionId} className="block min-w-0">
                          <RichMathText
                            as="span"
                            content={row.value}
                            className="mt-1 line-clamp-2 block min-w-0 break-words text-xs leading-5 text-ink-700"
                          />
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
              {activeStep.revealItems.length ? (
                <div
                  data-testid="concept-v2-rail-reveal-strip"
                  role="region"
                  aria-labelledby={`${railRevealContextId} ${railRevealHeadingId}`}
                  className="mt-2 rounded-[14px] border border-teal-500/16 bg-white/76 px-2.5 py-2"
                >
                  <span id={railRevealContextId} className="sr-only">
                    {copy.currentStepLabel}:
                  </span>
                  <p
                    id={railRevealHeadingId}
                    className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-ink-500"
                  >
                    {copy.nowAvailableLabel}
                  </p>
                  <ul
                    aria-labelledby={`${railRevealContextId} ${railRevealHeadingId}`}
                    aria-live="polite"
                    className="mt-1.5 flex flex-wrap gap-1.5"
                  >
                    {activeStep.revealItems.slice(0, 4).map((item) => (
                      <li
                        key={`${item.kind}-${item.id}`}
                        className={[
                          "inline-flex max-w-full rounded-full border px-2 py-0.5 text-[0.68rem] font-medium shadow-sm",
                          revealToneClasses[item.tone ?? "core"],
                        ].join(" ")}
                      >
                        <RichMathText
                          as="span"
                          content={`${renderRevealKindLabel(item.kind, copy)}: ${item.label}`}
                          className="min-w-0 line-clamp-1 break-words"
                        />
                      </li>
                    ))}
                    {activeStep.revealItems.length > 4 ? (
                      <li
                        data-testid="concept-v2-rail-reveal-overflow"
                        className="rounded-full border border-line bg-paper px-2 py-0.5 text-[0.68rem] font-semibold text-ink-600 shadow-sm"
                      >
                        <span aria-hidden="true">
                          +{activeStep.revealItems.length - 4}
                        </span>
                        <span className="sr-only">
                          {copy.revealOverflowLabel({
                            count: activeStep.revealItems.length - 4,
                          })}
                        </span>
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
              {activeStep.inlineCheck ? (
                <div
                  data-testid="concept-v2-rail-inline-check"
                  role="region"
                  aria-labelledby={`${railInlineCheckLabelId} ${railInlineCheckTitleId}`}
                  aria-describedby={railInlineCheckDescriptionIds}
                  className="mt-2 rounded-[14px] border border-amber-500/18 bg-amber-500/9 px-2.5 py-2"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p
                      id={railInlineCheckLabelId}
                      className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-amber-700"
                    >
                      {copy.quickCheckLabel}
                      <span className="sr-only">:</span>
                    </p>
                    <span className="inline-flex max-w-full min-w-0 rounded-full border border-amber-500/18 bg-white/78 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-amber-700">
                      <RichMathText as="span" content={activeStep.inlineCheck.eyebrow} className="min-w-0 break-words" />
                    </span>
                  </div>
                  <p
                    id={railInlineCheckTitleId}
                    className="mt-1.5 line-clamp-2 break-words text-xs font-semibold leading-5 text-ink-900"
                  >
                    <RichMathText as="span" content={activeStep.inlineCheck.title} />
                  </p>
                  <p
                    id={railInlineCheckPromptId}
                    className="mt-0.5 line-clamp-2 break-words text-xs leading-5 text-ink-700"
                  >
                    <RichMathText as="span" content={activeStep.inlineCheck.prompt} />
                  </p>
                  {activeStep.inlineCheck.supportingText ? (
                    <p
                      id={railInlineCheckSupportingId}
                      className="mt-0.5 line-clamp-2 break-words text-xs leading-5 text-ink-600"
                    >
                      <RichMathText as="span" content={activeStep.inlineCheck.supportingText} />
                    </p>
                  ) : null}
                  {activeStep.inlineCheck.choices?.length ? (
                    <ol
                      data-testid="concept-v2-rail-inline-check-choices"
                      aria-labelledby={railInlineCheckTitleId}
                      aria-describedby={railInlineCheckDescriptionIds}
                      className="mt-1.5 grid gap-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"
                    >
                      {activeStep.inlineCheck.choices.map((choice, index) => (
                        <li
                          key={choice}
                          className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-1.5 rounded-[10px] border border-white/80 bg-white/82 px-2 py-1.5 text-[0.68rem] leading-4 text-ink-700 shadow-sm"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-amber-500/22 bg-amber-500/10 text-[0.58rem] font-semibold text-amber-700"
                          >
                            {index + 1}
                          </span>
                          <RichMathText
                            as="span"
                            content={choice}
                            className="min-w-0 line-clamp-2 break-words"
                          />
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5 sm:flex sm:flex-wrap xl:grid xl:grid-cols-1 xl:justify-items-end">
            <button
              type="button"
              onClick={onPreviousStep}
              disabled={!previousStep}
              aria-label={previousStep ? `${copy.previousStep}: ${previousStep.label}` : copy.previousStep}
              className={[
                "inline-flex min-w-0 flex-col items-start justify-center rounded-[18px] border border-line bg-white/90 px-3.5 py-2 text-left text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:min-w-[9rem] xl:w-full",
                conceptPageV2TapTargetClass,
              ].join(" ")}
            >
              <span>{copy.previousStep}</span>
              {previousStep ? (
                <RichMathText
                  as="span"
                  content={previousStep.label}
                  className="mt-0.5 min-w-0 line-clamp-1 break-words text-[0.72rem] font-medium leading-4 text-ink-600"
                />
              ) : null}
            </button>
            <button
              type="button"
              data-testid="concept-v2-rail-next-button"
              onClick={() => {
                if (nextStep) {
                  onNextStep();
                  return;
                }

                onCompleteLesson?.();
              }}
              disabled={!nextStep && !canAdvanceToWrapUp}
              aria-label={nextNavigationAriaLabel}
              className={[
                "inline-flex min-w-0 flex-col items-start justify-center rounded-[18px] border border-ink-950 bg-ink-950 px-3.5 py-2 text-left text-sm font-semibold text-paper-strong transition hover:bg-ink-900 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:min-w-[9rem] xl:w-full",
                conceptPageV2TapTargetClass,
              ].join(" ")}
            >
              <span>{copy.nextStep}</span>
              {nextNavigationLabel ? (
                <RichMathText
                  as="span"
                  content={nextNavigationLabel}
                  className="mt-0.5 min-w-0 line-clamp-1 break-words text-[0.72rem] font-medium leading-4 text-paper-strong/72"
                />
              ) : null}
            </button>
          </div>
        </div>

        {steps.length > 1 ? (
          <ol
            data-testid="concept-v2-step-map"
            className="mt-3 flex snap-x scroll-px-1.5 gap-1.5 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]"
            aria-label={copy.lessonFlowLabel}
          >
            {steps.map((step, index) => {
              const isActive = step.id === activeStep.id;
              const isComplete = index < activeIndex;
              const isNext = index === activeIndex + 1;

              const stepStatusLabel = isActive
                ? copy.currentStepLabel
                : isNext
                  ? copy.upcomingStepLabel
                  : isComplete
                    ? copy.previousStep
                    : null;
              const stepAriaLabelParts = [
                step.label,
                stepStatusLabel,
                step.inlineCheck ? copy.quickCheckLabel : null,
              ].filter(Boolean);
              const stepStatusAriaLabel =
                stepAriaLabelParts.length > 1
                  ? stepAriaLabelParts.join(" — ")
                  : undefined;
              const stepSummaryText = step.summary || step.goal;
              const stepDescriptionId = `${stepMapDescriptionIdBase}-${index}`;

              return (
                <li
                  key={step.id}
                  ref={isActive ? activeStepMapItemRef : undefined}
                  aria-posinset={index + 1}
                  aria-setsize={steps.length + 1}
                  className="min-w-[8.75rem] flex-1 snap-start"
                >
                  <button
                    type="button"
                    onClick={() => onSelectStep?.(step.id)}
                    disabled={!canSelectSteps}
                    aria-current={isActive ? "step" : undefined}
                    aria-label={stepStatusAriaLabel}
                    aria-describedby={stepSummaryText ? stepDescriptionId : undefined}
                    className={[
                      "group grid h-full min-h-11 w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-[14px] border px-2.5 py-2 text-left transition disabled:cursor-default disabled:hover:bg-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                      isActive
                        ? "border-teal-500/34 bg-teal-500/10 text-ink-950 shadow-sm disabled:hover:bg-teal-500/10"
                        : isComplete
                          ? "border-teal-500/22 bg-white/86 text-ink-800 hover:border-teal-500/30 hover:bg-white disabled:hover:bg-white/86"
                          : isNext
                            ? "border-sky-500/24 bg-sky-500/8 text-ink-800 hover:border-sky-500/34 hover:bg-white disabled:hover:bg-sky-500/8"
                            : "border-line bg-paper/80 text-ink-700 hover:border-teal-500/24 hover:bg-white disabled:hover:bg-paper/80",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden="true"
                      className={[
                        "mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border text-[0.72rem] font-semibold",
                        isActive || isComplete
                          ? "border-teal-500/30 bg-white text-teal-700"
                          : isNext
                            ? "border-sky-500/28 bg-white text-sky-700"
                          : "border-line bg-white/80 text-ink-500 group-hover:text-teal-700",
                      ].join(" ")}
                    >
                      {isComplete ? "✓" : index + 1}
                    </span>
                    <span className="min-w-0">
                      <RichMathText
                        as="span"
                        content={step.label}
                        className="line-clamp-2 block min-w-0 break-words text-xs font-semibold leading-5"
                      />
                      {stepSummaryText ? (
                        <span
                          id={stepDescriptionId}
                          className="mt-0.5 line-clamp-2 block min-w-0 break-words text-[0.72rem] leading-4 text-ink-600"
                        >
                          <RichMathText as="span" content={stepSummaryText} />
                        </span>
                      ) : null}
                      {isActive ? (
                        <span
                          aria-hidden="true"
                          className="mt-1 inline-flex rounded-full border border-teal-500/20 bg-white/82 px-2 py-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-teal-700"
                        >
                          {copy.currentStepLabel}
                        </span>
                      ) : isNext ? (
                        <span
                          aria-hidden="true"
                          className="mt-1 inline-flex rounded-full border border-sky-500/20 bg-white/82 px-2 py-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-sky-700"
                        >
                          {copy.upcomingStepLabel}
                        </span>
                      ) : isComplete ? (
                        <span
                          aria-hidden="true"
                          className="mt-1 inline-flex rounded-full border border-ink-950/10 bg-white/82 px-2 py-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-ink-600"
                        >
                          {copy.previousStep}
                        </span>
                      ) : null}
                      {step.inlineCheck ? (
                        <span className="mt-1 inline-flex rounded-full border border-amber-500/18 bg-amber-500/10 px-2 py-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-amber-700">
                          {copy.quickCheckLabel}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
            <li
              aria-posinset={steps.length + 1}
              aria-setsize={steps.length + 1}
              className="min-w-[8.75rem] flex-1 snap-start"
            >
              {isWrapUpReady && onCompleteLesson ? (
                <button
                  type="button"
                  onClick={onCompleteLesson}
                  data-testid="concept-v2-step-map-wrap-up"
                  aria-label={finalWrapUpAriaLabel}
                  className="grid h-full min-h-11 w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-[16px] border border-teal-500/28 bg-teal-500/10 px-3 py-2.5 text-left text-ink-950 shadow-sm transition hover:border-teal-500/38 hover:bg-teal-500/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/24 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-teal-500/30 bg-white text-[0.72rem] font-semibold text-teal-700"
                  >
                    ✓
                  </span>
                  <span className="min-w-0">
                    <span
                      data-testid="concept-v2-step-map-wrap-up-next-step-cue"
                      className="mb-1 inline-flex max-w-full min-w-0 break-words rounded-full border border-teal-500/20 bg-white/82 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-teal-700"
                    >
                      <span className="min-w-0 break-words">{copy.nextStep}</span>
                    </span>
                    <span className="block min-w-0 break-words text-xs font-semibold leading-5">
                      {copy.wrapUpLabel}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block min-w-0 break-words text-[0.72rem] leading-4 text-ink-600">
                      {copy.lessonCompleteLabel}
                    </span>
                  </span>
                </button>
              ) : (
                <div
                  data-testid="concept-v2-step-map-wrap-up"
                  role="group"
                  aria-label={staticWrapUpAriaLabel}
                  className={[
                    "grid h-full min-h-11 w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-[16px] border px-3 py-2.5 text-left",
                    isWrapUpReady
                      ? "border-teal-500/28 bg-teal-500/10 text-ink-950 shadow-sm"
                      : "border-line bg-paper/70 text-ink-700",
                  ].join(" ")}
                >
                  <span
                    aria-hidden="true"
                    className={[
                      "mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border text-[0.72rem] font-semibold",
                      isWrapUpReady
                        ? "border-teal-500/30 bg-white text-teal-700"
                        : "border-line bg-white/80 text-ink-500",
                    ].join(" ")}
                  >
                    {isWrapUpReady ? "✓" : steps.length + 1}
                  </span>
                  <span className="min-w-0">
                    {isWrapUpReady ? (
                      <span
                        data-testid="concept-v2-step-map-wrap-up-next-step-cue"
                        className="mb-1 inline-flex max-w-full min-w-0 break-words rounded-full border border-teal-500/20 bg-white/82 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-teal-700"
                      >
                        <span className="min-w-0 break-words">{copy.nextStep}</span>
                      </span>
                    ) : null}
                    <span className="block min-w-0 break-words text-xs font-semibold leading-5">
                      {copy.wrapUpLabel}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block min-w-0 break-words text-[0.72rem] leading-4 text-ink-600">
                      {copy.lessonCompleteLabel}
                    </span>
                  </span>
                </div>
              )}
            </li>
          </ol>
        ) : null}

        {nextStep ? (
          <div
            data-testid="concept-v2-next-checkpoint"
            role="region"
            aria-label={`${copy.upcomingStepLabel}: ${nextStep.label}`}
            aria-describedby={
              nextStep.summary || nextStep.goal ? nextCheckpointDescriptionId : undefined
            }
            className="mt-3 flex flex-col gap-2 rounded-[16px] border border-sky-500/18 bg-sky-500/8 px-3 py-2.5 md:flex-row md:items-center md:justify-between"
          >
            <div
              data-testid="concept-v2-next-checkpoint-preview"
              role="group"
              aria-label={`${copy.nextStep}: ${nextStep.label}`}
              aria-describedby={
                nextStep.summary || nextStep.goal ? nextCheckpointDescriptionId : undefined
              }
              className="min-w-0"
            >
              <p className="lab-label">{copy.upcomingStepLabel}</p>
              <RichMathText
                as="p"
                content={nextStep.label}
                className="mt-1 min-w-0 line-clamp-2 break-words text-xs font-semibold leading-5 text-ink-900"
              />
              <p
                id={nextCheckpointDescriptionId}
                className="mt-0.5 line-clamp-1 break-words text-xs leading-5 text-ink-700"
              >
                <RichMathText as="span" content={nextStep.summary || nextStep.goal} />
              </p>
              {nextStep.revealItems.length || nextStep.inlineCheck ? (
                <ul
                  aria-label={`${copy.upcomingStepLabel}: ${copy.nowAvailableLabel}`}
                  className="mt-1.5 flex flex-wrap gap-1.5"
                >
                  {nextStep.revealItems.length ? (
                    <>
                      <li
                        data-testid="concept-v2-next-step-reveals"
                        className="inline-flex rounded-full border border-teal-500/16 bg-white/82 px-2.5 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-teal-700"
                      >
                        {copy.nowAvailableLabel}
                      </li>
                      {nextStepPrimaryReveal ? (
                        <li
                          data-testid="concept-v2-next-step-reveal-preview"
                          className="inline-flex max-w-full rounded-full border border-line bg-white/86 px-2.5 py-1 text-[0.66rem] font-semibold text-ink-700"
                        >
                          <RichMathText
                            as="span"
                            content={`${renderRevealKindLabel(
                              nextStepPrimaryReveal.kind,
                              copy,
                            )}: ${nextStepPrimaryReveal.label}`}
                            className="min-w-0 line-clamp-1 break-words"
                          />
                        </li>
                      ) : null}
                      {nextStepAdditionalRevealCount ? (
                        <li
                          data-testid="concept-v2-next-step-reveal-overflow"
                          className="inline-flex rounded-full border border-line bg-paper px-2.5 py-1 text-[0.66rem] font-semibold text-ink-600"
                        >
                          <span aria-hidden="true">
                            +{nextStepAdditionalRevealCount}
                          </span>
                          <span className="sr-only">
                            {copy.revealOverflowLabel({
                              count: nextStepAdditionalRevealCount,
                            })}
                          </span>
                        </li>
                      ) : null}
                    </>
                  ) : null}
                  {nextStep.inlineCheck ? (
                    <li
                      data-testid="concept-v2-next-step-quick-check"
                      className="inline-flex rounded-full border border-amber-500/18 bg-white/82 px-2.5 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-amber-700"
                    >
                      {copy.quickCheckLabel}
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </div>
            {onSelectStep ? (
              <button
                type="button"
                onClick={() => onSelectStep(nextStep.id)}
                aria-label={`${copy.nextStep}: ${nextStep.label} — ${copy.upcomingStepLabel}`}
                aria-describedby={nextCheckpointDescriptionId}
                className={[
                  "group inline-flex min-w-0 items-center justify-center gap-2 rounded-full border border-sky-500/24 bg-white/90 px-3.5 py-2 text-sm font-semibold text-sky-800 shadow-sm transition hover:border-sky-500/34 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/24 focus-visible:ring-offset-2 focus-visible:ring-offset-paper md:max-w-[16rem]",
                  conceptPageV2TapTargetClass,
                ].join(" ")}
              >
                <span className="min-w-0 text-left">
                  <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-sky-700/78">
                    {copy.nextStep}
                  </span>
                  <RichMathText
                    as="span"
                    content={nextStep.label}
                    className="mt-0.5 line-clamp-1 block min-w-0 break-words"
                  />
                </span>
                <span
                  aria-hidden="true"
                  className="shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
                >
                  →
                </span>
              </button>
            ) : (
              <div
                aria-hidden="true"
                className="inline-flex min-h-11 max-w-full min-w-0 items-center justify-center rounded-full border border-line bg-white/78 px-3.5 py-2 text-sm font-semibold text-ink-600 shadow-sm"
              >
                <RichMathText as="span" content={nextStep.label} className="min-w-0 line-clamp-1 break-words" />
              </div>
            )}
          </div>
        ) : (
          <div
            data-testid="concept-v2-complete-checkpoint"
            role="region"
            aria-label={finalWrapUpAriaLabel}
            aria-describedby={completeCheckpointDescriptionId}
            className="mt-3 rounded-[18px] border border-teal-500/22 bg-teal-500/10 px-3 py-3 shadow-[0_1px_0_rgba(255,255,255,0.76)_inset]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="lab-label">{copy.lessonCompleteLabel}</p>
              <span className="rounded-full border border-teal-500/24 bg-white/82 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-teal-700">
                {copy.wrapUpLabel}
              </span>
            </div>
            <p
              id={completeCheckpointDescriptionId}
              className="mt-2 break-words text-sm leading-6 text-ink-700"
            >
              {copy.lessonCompleteDescription}
            </p>
            {onCompleteLesson ? (
              <button
                type="button"
                onClick={onCompleteLesson}
                aria-label={finalWrapUpAriaLabel}
                aria-describedby={completeCheckpointDescriptionId}
                className={[
                  "group mt-3 inline-flex items-center justify-center gap-2 rounded-full border border-teal-500/24 bg-white/88 px-3.5 py-2 text-sm font-semibold text-teal-800 shadow-sm transition hover:border-teal-500/34 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/24 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                  conceptPageV2TapTargetClass,
                ].join(" ")}
              >
                <span className="min-w-0 text-left">
                  <span
                    data-testid="concept-v2-complete-checkpoint-next-step-cue"
                    className="block min-w-0 break-words text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-teal-700/78"
                  >
                    {copy.nextStep}
                  </span>
                  <span className="mt-0.5 block min-w-0 break-words">{copy.wrapUpLabel}</span>
                </span>
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none">
                  ↓
                </span>
              </button>
            ) : null}
          </div>
        )}
      </section>
    </aside>
  );
}

export function ConceptPageV2LessonSupport({
  steps,
  activeStepId,
  copy,
  onSelectStep,
  onCompleteLesson,
}: {
  steps: readonly ConceptPageV2StepViewModel[];
  activeStepId: string;
  copy: Pick<
    ConceptPageV2Copy,
    | "actLabel"
    | "observeLabel"
    | "explainLabel"
    | "nowAvailableLabel"
    | "quickCheckLabel"
    | "currentStepLabel"
    | "upcomingStepLabel"
    | "nextStep"
    | "revealOverflowLabel"
    | "lessonCompleteLabel"
    | "lessonCompleteDescription"
    | "wrapUpLabel"
    | "revealKinds"
  >;
  onSelectStep?: (stepId: string) => void;
  onCompleteLesson?: () => void;
}) {
  const activeStepSupportHeadingId = useId();
  const activeStepSupportDescriptionId = useId();
  const supportInlineCheckPromptId = useId();
  const supportInlineCheckSupportingId = useId();
  const supportInlineCheckLabelId = useId();
  const supportInlineCheckTitleId = useId();
  const activeStepSupportLabelId = useId();
  const supportRevealContextId = useId();
  const supportRevealHeadingId = useId();
  const supportActionPathIdBase = useId();
  const nextSupportDescriptionId = useId();
  const completeSupportDescriptionId = useId();

  if (!steps.length) {
    return null;
  }

  const { activeIndex, activeStep, nextStep, detailRows } = resolveLessonRailState(steps, activeStepId);
  const activePosition = Math.max(activeIndex + 1, 1);
  const nextStepPrimaryReveal = nextStep?.revealItems[0] ?? null;
  const nextStepAdditionalRevealCount = Math.max(
    0,
    (nextStep?.revealItems.length ?? 0) - 1,
  );
  const activeSupportRevealPreviewItems = activeStep.revealItems.slice(0, 4);
  const activeSupportRevealOverflowCount = Math.max(
    0,
    activeStep.revealItems.length - activeSupportRevealPreviewItems.length,
  );
  const progressPercent = steps.length
    ? (activePosition / steps.length) * 100
    : 0;
  const progressValueText = `${copy.currentStepLabel}: ${activePosition} / ${Math.max(
    steps.length,
    1,
  )} — ${activeStep.label}`;
  const finalWrapUpAriaLabel = `${copy.nextStep}: ${copy.wrapUpLabel} — ${copy.lessonCompleteLabel}`;
  const supportInlineCheckDescriptionIds = activeStep.inlineCheck
    ? [
        supportInlineCheckPromptId,
        activeStep.inlineCheck.supportingText ? supportInlineCheckSupportingId : null,
      ]
        .filter((id): id is string => Boolean(id))
        .join(" ")
    : undefined;

  return (
    <section
      data-testid="concept-v2-step-support"
      aria-labelledby={`${activeStepSupportLabelId} ${activeStepSupportHeadingId}`}
      aria-describedby={activeStep.summary ? activeStepSupportDescriptionId : undefined}
      className="rounded-[22px] border border-line/80 bg-white/88 px-4 py-3 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={activeStepSupportLabelId} className="lab-label">
          {copy.currentStepLabel}
          <span className="sr-only">:</span>
        </p>
        <span className="flex w-full min-w-0 flex-wrap items-center justify-start gap-1.5 sm:w-auto sm:justify-end">
          <span
            data-testid="concept-v2-step-support-position"
            className="rounded-full border border-teal-500/18 bg-teal-500/8 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-teal-700"
          >
            {activePosition} / {steps.length}
          </span>
          <span className="inline-flex max-w-full min-w-0 rounded-full border border-line bg-paper px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-600">
            <RichMathText
              as="span"
              content={activeStep.label}
              className="min-w-0 line-clamp-1 break-words"
            />
          </span>
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={copy.currentStepLabel}
        aria-valuemin={1}
        aria-valuemax={Math.max(steps.length, 1)}
        aria-valuenow={activePosition}
        aria-valuetext={progressValueText}
        data-testid="concept-v2-step-support-progress"
        className="mt-2 h-1.5 overflow-hidden rounded-full border border-teal-500/14 bg-paper"
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(20,184,166,0.72),rgba(14,165,233,0.62))] transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <h3
        id={activeStepSupportHeadingId}
        className="mt-2 break-words text-base font-semibold leading-6 text-ink-950"
      >
        <RichMathText as="span" content={activeStep.goal} />
      </h3>

      {activeStep.summary ? (
        <p
          id={activeStepSupportDescriptionId}
          className="mt-2 break-words text-sm leading-6 text-ink-700"
        >
          <RichMathText as="span" content={activeStep.summary} />
        </p>
      ) : null}

      <ol
        data-testid="concept-v2-guided-action-path"
        aria-label={`${copy.currentStepLabel}: ${activeStep.goal}`}
        className="mt-3 grid gap-3 md:grid-cols-3"
      >
        {detailRows.map((row, index) => {
          const isActionCard = row.label === "act";
          const rowLabel = isActionCard
            ? copy.actLabel
            : row.label === "observe"
              ? copy.observeLabel
              : copy.explainLabel;
          const rowLabelId = `${supportActionPathIdBase}-${row.label}-label`;
          const rowDescriptionId = `${supportActionPathIdBase}-${row.label}-description`;

          return (
            <li
              key={row.label}
              aria-labelledby={rowLabelId}
              aria-describedby={rowDescriptionId}
              className={[
                "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-[18px] border px-3.5 py-3",
                isActionCard
                  ? "border-teal-500/24 bg-teal-500/10 shadow-[0_1px_0_rgba(255,255,255,0.76)_inset]"
                  : "border-line/80 bg-paper-strong",
              ].join(" ")}
            >
              <span
                aria-hidden="true"
                className={[
                  "mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                  isActionCard
                    ? "border-teal-500/28 bg-white text-teal-700"
                    : "border-line bg-white/84 text-ink-500",
                ].join(" ")}
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span id={rowLabelId} className="lab-label block">
                  {rowLabel}
                </span>
                <span id={rowDescriptionId} className="block min-w-0">
                  <RichMathText
                    as="span"
                    content={row.value}
                    className="mt-1 block min-w-0 break-words text-sm leading-6 text-ink-800"
                  />
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      {activeStep.revealItems.length ? (
        <div
          data-testid="concept-v2-step-support-reveal-strip"
          role="region"
          aria-labelledby={`${supportRevealContextId} ${supportRevealHeadingId}`}
          className="mt-3 rounded-[18px] border border-teal-500/18 bg-teal-500/8 px-3.5 py-3"
        >
          <span id={supportRevealContextId} className="sr-only">
            {copy.currentStepLabel}:
          </span>
          <p id={supportRevealHeadingId} className="lab-label">
            {copy.nowAvailableLabel}
          </p>
          <ul
            aria-labelledby={`${supportRevealContextId} ${supportRevealHeadingId}`}
            aria-live="polite"
            className="mt-2 flex flex-wrap gap-1.5"
          >
            {activeSupportRevealPreviewItems.map((item) => (
              <li
                key={`${item.kind}-${item.id}`}
                className={[
                  "inline-flex max-w-full rounded-full border px-2.5 py-1 text-[0.72rem] font-medium shadow-sm",
                  revealToneClasses[item.tone ?? "core"],
                ].join(" ")}
              >
                <RichMathText
                  as="span"
                  content={`${renderRevealKindLabel(item.kind, copy)}: ${item.label}`}
                  className="min-w-0 line-clamp-1 break-words"
                />
              </li>
            ))}
            {activeSupportRevealOverflowCount ? (
              <li
                data-testid="concept-v2-step-support-reveal-overflow"
                className="rounded-full border border-line bg-paper px-2.5 py-1 text-[0.72rem] font-semibold text-ink-600 shadow-sm"
              >
                <span aria-hidden="true">+{activeSupportRevealOverflowCount}</span>
                <span className="sr-only">
                  {copy.revealOverflowLabel({
                    count: activeSupportRevealOverflowCount,
                  })}
                </span>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {activeStep.inlineCheck ? (
        <div
          data-testid="concept-v2-inline-check"
          role="region"
          aria-labelledby={`${supportInlineCheckLabelId} ${supportInlineCheckTitleId}`}
          aria-describedby={supportInlineCheckDescriptionIds}
          className="mt-3 rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-3.5 py-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <p id={supportInlineCheckLabelId} className="lab-label">
              {copy.quickCheckLabel}
              <span className="sr-only">:</span>
            </p>
            <span className="inline-flex max-w-full min-w-0 rounded-full border border-amber-500/20 bg-white/80 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-amber-700">
              <RichMathText as="span" content={activeStep.inlineCheck.eyebrow} className="min-w-0 break-words" />
            </span>
          </div>
          <p
            id={supportInlineCheckTitleId}
            className="mt-1.5 break-words text-sm font-semibold leading-5 text-ink-900"
          >
            <RichMathText as="span" content={activeStep.inlineCheck.title} />
          </p>
          <p
            id={supportInlineCheckPromptId}
            className="mt-1 break-words text-sm leading-5 text-ink-700"
          >
            <RichMathText as="span" content={activeStep.inlineCheck.prompt} />
          </p>
          {activeStep.inlineCheck.supportingText ? (
            <p
              id={supportInlineCheckSupportingId}
              className="mt-1 break-words text-sm leading-5 text-ink-600"
            >
              <RichMathText as="span" content={activeStep.inlineCheck.supportingText} />
            </p>
          ) : null}
          {activeStep.inlineCheck.choices?.length ? (
            <ol
              data-testid="concept-v2-inline-check-choices"
              aria-labelledby={supportInlineCheckTitleId}
              aria-describedby={supportInlineCheckDescriptionIds}
              className="mt-2 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3"
            >
              {activeStep.inlineCheck.choices.map((choice, index) => (
                <li
                  key={choice}
                  className="grid min-h-11 grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-[14px] border border-white/80 bg-white/86 px-2.5 py-2 text-xs leading-5 text-ink-700 shadow-sm"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-500/22 bg-amber-500/10 text-[0.68rem] font-semibold text-amber-700"
                  >
                    {index + 1}
                  </span>
                  <RichMathText as="span" content={choice} className="min-w-0 line-clamp-2 break-words" />
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}

      {nextStep ? (
        <div
          data-testid="concept-v2-step-support-next"
          role="region"
          aria-label={`${copy.upcomingStepLabel}: ${nextStep.label}`}
          aria-describedby={
            nextStep.summary || nextStep.goal ? nextSupportDescriptionId : undefined
          }
          className="mt-3 rounded-[18px] border border-sky-500/18 bg-sky-500/8 px-3.5 py-3"
        >
          <p className="lab-label">{copy.upcomingStepLabel}</p>
          <div
            role="group"
            aria-label={`${copy.nextStep}: ${nextStep.label}`}
            aria-describedby={
              nextStep.summary || nextStep.goal ? nextSupportDescriptionId : undefined
            }
            className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-[16px] border border-white/80 bg-white/86 px-3 py-2.5 shadow-sm"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-sky-500/24 bg-sky-500/10 text-xs font-semibold text-sky-700"
            >
              {activeIndex + 2}
            </span>
            <div className="min-w-0">
              <span
                data-testid="concept-v2-step-support-next-step-cue"
                className="mb-1 inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border border-sky-500/20 bg-sky-500/8 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-sky-700"
              >
                <span className="min-w-0 break-words">{copy.nextStep}</span>
                <span aria-hidden="true" className="shrink-0">
                  →
                </span>
              </span>
              <RichMathText
                as="span"
                content={nextStep.label}
                className="line-clamp-2 block min-w-0 break-words text-sm font-semibold leading-5 text-ink-950"
              />
              {nextStep.summary || nextStep.goal ? (
                <span
                  id={nextSupportDescriptionId}
                  className="mt-0.5 line-clamp-2 block min-w-0 break-words text-xs leading-5 text-ink-600"
                >
                  <RichMathText as="span" content={nextStep.summary || nextStep.goal} />
                </span>
              ) : null}
              {nextStep.revealItems.length || nextStep.inlineCheck ? (
                <ul
                  aria-label={`${copy.upcomingStepLabel}: ${copy.nowAvailableLabel}`}
                  className="mt-2 flex flex-wrap gap-1.5"
                >
                  {nextStep.revealItems.length ? (
                    <>
                      <li
                        data-testid="concept-v2-step-support-next-reveals"
                        className="rounded-full border border-teal-500/16 bg-teal-500/8 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-teal-700"
                      >
                        {copy.nowAvailableLabel}
                      </li>
                      {nextStepPrimaryReveal ? (
                        <li
                          data-testid="concept-v2-step-support-next-reveal-preview"
                          className="inline-flex max-w-full rounded-full border border-line bg-white/86 px-2.5 py-1 text-[0.68rem] font-semibold text-ink-700"
                        >
                          <RichMathText
                            as="span"
                            content={`${renderRevealKindLabel(
                              nextStepPrimaryReveal.kind,
                              copy,
                            )}: ${nextStepPrimaryReveal.label}`}
                            className="min-w-0 line-clamp-1 break-words"
                          />
                        </li>
                      ) : null}
                      {nextStepAdditionalRevealCount ? (
                        <li
                          data-testid="concept-v2-step-support-next-reveal-overflow"
                          className="rounded-full border border-line bg-paper px-2.5 py-1 text-[0.68rem] font-semibold text-ink-600"
                        >
                          <span aria-hidden="true">
                            +{nextStepAdditionalRevealCount}
                          </span>
                          <span className="sr-only">
                            {copy.revealOverflowLabel({
                              count: nextStepAdditionalRevealCount,
                            })}
                          </span>
                        </li>
                      ) : null}
                    </>
                  ) : null}
                  {nextStep.inlineCheck ? (
                    <li
                      data-testid="concept-v2-step-support-next-quick-check"
                      className="inline-flex max-w-full min-w-0 rounded-full border border-amber-500/18 bg-amber-500/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-amber-700"
                    >
                      <span className="min-w-0 break-words">{copy.quickCheckLabel}</span>
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          </div>
          {onSelectStep ? (
            <button
              type="button"
              onClick={() => onSelectStep(nextStep.id)}
              aria-label={`${copy.nextStep}: ${nextStep.label} — ${copy.upcomingStepLabel}`}
              aria-describedby={
                nextStep.summary || nextStep.goal ? nextSupportDescriptionId : undefined
              }
              className={[
                "group mt-3 inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-full border border-sky-500/24 bg-white/90 px-3.5 py-2 text-sm font-semibold text-sky-800 shadow-sm transition hover:border-sky-500/34 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/24 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:w-auto sm:max-w-[20rem]",
                conceptPageV2TapTargetClass,
              ].join(" ")}
            >
              <span className="min-w-0 text-left">
                <span
                  data-testid="concept-v2-step-support-next-button-cue"
                  className="block min-w-0 break-words text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-sky-700/78"
                >
                  {copy.nextStep}
                </span>
                <RichMathText
                  as="span"
                  content={nextStep.label}
                  className="mt-0.5 line-clamp-1 block min-w-0 break-words text-left"
                />
              </span>
              <span aria-hidden="true" className="shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none">
                →
              </span>
            </button>
          ) : null}
        </div>
      ) : (
        <div
          data-testid="concept-v2-step-support-complete"
          role="region"
          aria-label={finalWrapUpAriaLabel}
          aria-describedby={completeSupportDescriptionId}
          className="mt-3 rounded-[18px] border border-teal-500/22 bg-teal-500/10 px-3.5 py-3 shadow-[0_1px_0_rgba(255,255,255,0.76)_inset]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="lab-label">{copy.lessonCompleteLabel}</p>
            <span className="rounded-full border border-teal-500/24 bg-white/82 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-teal-700">
              {copy.wrapUpLabel}
            </span>
          </div>
          <p
            id={completeSupportDescriptionId}
            className="mt-2 break-words text-sm leading-6 text-ink-700"
          >
            {copy.lessonCompleteDescription}
          </p>
          {onCompleteLesson ? (
            <button
              type="button"
              onClick={onCompleteLesson}
              aria-label={finalWrapUpAriaLabel}
              aria-describedby={completeSupportDescriptionId}
              className={[
                "group mt-3 inline-flex items-center justify-center gap-2 rounded-full border border-teal-500/24 bg-white/88 px-3.5 py-2 text-sm font-semibold text-teal-800 shadow-sm transition hover:border-teal-500/34 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/24 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                conceptPageV2TapTargetClass,
              ].join(" ")}
            >
              <span className="min-w-0 text-left">
                <span
                  data-testid="concept-v2-step-support-complete-next-step-cue"
                  className="block min-w-0 break-words text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-teal-700/78"
                >
                  {copy.nextStep}
                </span>
                <span className="mt-0.5 block min-w-0 break-words">{copy.wrapUpLabel}</span>
              </span>
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none">
                ↓
              </span>
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

export function ConceptPageV2SecondarySection({
  testId,
  eyebrow,
  title,
  description,
  note,
  actionLabel,
  children,
}: {
  testId?: string;
  eyebrow: string;
  title: string;
  description?: string | null;
  note?: string | null;
  actionLabel?: string | null;
  children: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const noteId = useId();
  const summaryDescriptionIds = [
    titleId,
    description ? descriptionId : null,
    note ? noteId : null,
  ]
    .filter(Boolean)
    .join(" ");
  const contentDescriptionIds = [description ? descriptionId : null, note ? noteId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <ConceptPageV2Disclosure
      testId={testId}
      className="group rounded-[26px] border border-line/80 bg-white/88 px-4 py-4 shadow-sm sm:px-5"
      summaryClassName="max-w-3xl min-w-0 cursor-pointer list-none rounded-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper [&::-webkit-details-marker]:hidden"
      summaryAriaLabel={actionLabel ?? title}
      summaryAriaDescribedBy={summaryDescriptionIds || undefined}
      contentClassName="mt-4 min-w-0"
      contentAriaLabelledBy={titleId}
      contentAriaDescribedBy={contentDescriptionIds || undefined}
      summary={(
        <>
          <p className="lab-label min-w-0 break-words">{eyebrow}</p>
          <h3 id={titleId} className="mt-2 break-words text-xl font-semibold text-ink-950">
            {title}
          </h3>
          {description ? (
            <p id={descriptionId} className="mt-2 break-words text-sm leading-6 text-ink-700">
              {description}
            </p>
          ) : null}
          {note ? (
            <p
              id={noteId}
              className="mt-2 break-words text-xs font-semibold uppercase tracking-[0.14em] text-teal-700/78"
            >
              {note}
            </p>
          ) : null}
          <span
            className={[
              "mt-3 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-line bg-paper-strong px-3.5 py-2 text-sm font-semibold text-ink-900 transition group-hover:border-ink-950/20 group-hover:bg-white",
              conceptPageV2CompactDisclosureTargetClass,
            ].join(" ")}
          >
            <span className="min-w-0 break-words text-left">{actionLabel ?? title}</span>
            <span aria-hidden="true" className="shrink-0 text-ink-500 transition-transform group-open:rotate-180 motion-reduce:transition-none">
              ↓
            </span>
          </span>
        </>
      )}
    >
      {children}
    </ConceptPageV2Disclosure>
  );
}

export const ConceptPageV2ReferenceSection = ConceptPageV2SecondarySection;

function ConceptPageV2PracticeActionLink({
  href,
  testId,
  className,
  ariaLabel,
  ariaDescribedBy,
  children,
}: {
  href: string;
  testId?: string;
  className: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  children: ReactNode;
}) {
  const props = {
    href,
    "data-testid": testId,
    className,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    children,
  };

  if (href.includes("#challenge-mode")) {
    return <a {...props} />;
  }

  return <Link {...props} />;
}

export function ConceptPageV2WrapUp({
  wrapUp,
  copy,
  children,
}: {
  wrapUp: ConceptPageV2WrapUpViewModel;
  copy: Pick<
    ConceptPageV2Copy,
    | "wrapUpLabel"
    | "conceptTestLabel"
    | "conceptTestDescription"
    | "reviewBenchLabel"
    | "reviewBenchDescription"
    | "nextConceptsLabel"
    | "nextConceptsDescription"
    | "practiceActionsLabel"
    | "practiceActionsDescription"
    | "practiceOptionLabel"
    | "morePracticeOptionsLabel"
    | "moreReadNextOptionsLabel"
    | "showMoreOptionsLabel"
    | "hideMoreOptionsLabel"
    | "recommendedActionLabel"
    | "freePlayLabel"
    | "freePlayDescription"
    | "challengeLabel"
    | "challengeDescription"
    | "workedExamplesLabel"
    | "workedExamplesDescription"
    | "wrapUpTitle"
    | "keyTakeawayLabel"
    | "commonMisconceptionLabel"
  >;
  children?: ReactNode;
}) {
  const locale = useLocale() as AppLocale;
  const wrapUpHeadingId = useId();
  const learnedListHeadingId = useId();
  const misconceptionHeadingId = useId();
  const readNextHeadingId = useId();
  const readNextDescriptionId = useId();
  const practiceActionsHeadingId = useId();
  const practiceActionsDescriptionId = useId();
  const featuredPracticeActionDescriptionId = useId();
  const highlightedChallengeActionDescriptionId = useId();
  const morePracticeActionDescriptionBaseId = useId();
  const featuredReadNextDescriptionId = useId();
  const moreReadNextDescriptionBaseId = useId();
  const morePracticeDisclosureHeadingId = useId();
  const moreReadNextDisclosureHeadingId = useId();
  const runwayPracticeHeadingId = useId();
  const runwayPracticeDescriptionId = useId();
  const runwayReadNextHeadingId = useId();
  const runwayReadNextDescriptionId = useId();
  const misconceptionMythId = useId();
  const misconceptionCorrectionId = useId();
  const practiceActions = [
    ...(wrapUp.testHref
      ? [
          {
            href: wrapUp.testHref,
            label: copy.conceptTestLabel,
            description: copy.conceptTestDescription,
            isPrimary: true,
          },
        ]
      : []),
    ...(wrapUp.reviewHref
      ? [
          {
            href: wrapUp.reviewHref,
            label: copy.reviewBenchLabel,
            description: copy.reviewBenchDescription,
            isPrimary: false,
          },
        ]
      : []),
    ...(wrapUp.workedExamplesHref
      ? [
          {
            href: wrapUp.workedExamplesHref,
            label: copy.workedExamplesLabel,
            description: copy.workedExamplesDescription,
            isPrimary: false,
          },
        ]
      : []),
    ...(wrapUp.challengeHref
      ? [
          {
            href: wrapUp.challengeHref,
            label: copy.challengeLabel,
            description: copy.challengeDescription,
            isPrimary: false,
          },
        ]
      : []),
    {
      href: wrapUp.freePlayHref,
      label: copy.freePlayLabel,
      description: copy.freePlayDescription,
      isPrimary: false,
    },
  ];
  const recommendedPracticeAction = practiceActions.find((action) => action.isPrimary) ?? null;
  const featuredPracticeAction = recommendedPracticeAction ?? practiceActions[0] ?? null;
  const secondaryPracticeActions = featuredPracticeAction
    ? practiceActions.filter((action) => action !== featuredPracticeAction)
    : [];
  const highlightedChallengeAction = secondaryPracticeActions.find(
    (action) => action.href === wrapUp.challengeHref,
  ) ?? null;
  const morePracticeActions = highlightedChallengeAction
    ? secondaryPracticeActions.filter((action) => action !== highlightedChallengeAction)
    : secondaryPracticeActions;
  const [featuredNextConcept, ...additionalNextConcepts] = wrapUp.nextConcepts;
  const morePracticePreviewLabel = morePracticeActions
    .slice(0, 2)
    .map((action) => action.label)
    .join(" · ");
  const moreReadNextPreviewLabel = additionalNextConcepts
    .slice(0, 2)
    .map((concept) => concept.title)
    .join(" · ");
  const hasFullRunwaySummary = Boolean(featuredPracticeAction && featuredNextConcept);

  return (
    <section
      id={conceptPageV2WrapUpHashId}
      data-testid="concept-v2-wrap-up"
      aria-labelledby={wrapUpHeadingId}
      tabIndex={-1}
      className="scroll-mt-24 rounded-[24px] border border-line/80 bg-white/92 px-4 py-4 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:px-5"
    >
      <div
        data-testid="concept-v2-wrap-up-runway"
        className="mb-4 border-b border-line/70 pb-4"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
          <div className="min-w-0">
            <p className="lab-label">{copy.wrapUpLabel}</p>
            <h3
              id={wrapUpHeadingId}
              className="mt-2 break-words text-xl font-semibold leading-tight text-ink-950 sm:text-2xl"
            >
              {copy.wrapUpTitle}
            </h3>
          </div>
          <dl
            className={[
              "grid min-w-0 gap-3",
              hasFullRunwaySummary ? "sm:grid-cols-2" : "sm:grid-cols-1",
            ].join(" ")}
          >
            {featuredPracticeAction ? (
              <div
                role="group"
                aria-labelledby={runwayPracticeHeadingId}
                aria-describedby={runwayPracticeDescriptionId}
                className="min-w-0 border-l-2 border-ink-950/16 pl-3"
              >
                <dt id={runwayPracticeHeadingId} className="min-w-0 break-words text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-ink-500">
                  {copy.recommendedActionLabel}
                </dt>
                <dd className="mt-1 min-w-0 space-y-0.5">
                  <span className="line-clamp-2 break-words text-sm font-semibold leading-5 text-ink-950">
                    {featuredPracticeAction.label}
                  </span>
                  <span
                    id={runwayPracticeDescriptionId}
                    className="line-clamp-1 break-words text-xs font-medium leading-5 text-ink-600"
                  >
                    {featuredPracticeAction.description}
                  </span>
                </dd>
              </div>
            ) : null}
            {featuredNextConcept ? (
              <div
                role="group"
                aria-labelledby={runwayReadNextHeadingId}
                aria-describedby={
                  featuredNextConcept.reasonLabel ? runwayReadNextDescriptionId : undefined
                }
                className="min-w-0 border-l-2 border-sky-500/24 pl-3"
              >
                <dt id={runwayReadNextHeadingId} className="min-w-0 break-words text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-teal-700">
                  {copy.nextConceptsLabel}
                </dt>
                <dd className="mt-1 min-w-0 space-y-0.5">
                  <RichMathText
                    as="span"
                    content={featuredNextConcept.title}
                    className="line-clamp-2 block break-words text-sm font-semibold leading-5 text-ink-950"
                  />
                  {featuredNextConcept.reasonLabel ? (
                    <span
                      id={runwayReadNextDescriptionId}
                      className="line-clamp-1 block break-words text-xs font-medium leading-5 text-ink-600"
                    >
                      <RichMathText as="span" content={featuredNextConcept.reasonLabel} />
                    </span>
                  ) : null}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(17rem,22rem)]">
        <div className="space-y-4">
          <div className="space-y-2.5">
            <p id={learnedListHeadingId} className="lab-label min-w-0 break-words">
              {copy.keyTakeawayLabel}
            </p>
            <ol
              data-testid="concept-v2-learned-list"
              aria-labelledby={learnedListHeadingId}
              className="grid gap-2.5"
            >
              {wrapUp.learned.map((item, index) => (
                <li
                  key={`${index}-${item}`}
                  className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-[14px] border border-line/80 bg-paper/62 px-3.5 py-3 text-sm leading-6 text-ink-800"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-teal-500/24 bg-white text-[0.72rem] font-semibold text-teal-700"
                  >
                    {index + 1}
                  </span>
                  <RichMathText as="div" content={item} className="min-w-0 break-words" />
                </li>
              ))}
            </ol>
          </div>

          {wrapUp.misconception ? (
            <section
              aria-labelledby={misconceptionHeadingId}
              aria-describedby={[
                misconceptionMythId,
                wrapUp.misconception.correction ? misconceptionCorrectionId : null,
              ]
                .filter(Boolean)
                .join(" ")}
              className="min-w-0 rounded-[20px] border border-coral-500/24 bg-coral-500/8 px-4 py-4"
            >
              <p id={misconceptionHeadingId} className="lab-label min-w-0 break-words">
                {copy.commonMisconceptionLabel}
              </p>
              <RichMathText
                as="p"
                id={misconceptionMythId}
                content={wrapUp.misconception.myth}
                className="mt-2 break-words text-sm font-semibold leading-6 text-ink-900"
              />
              {wrapUp.misconception.correction ? (
                <RichMathText
                  as="p"
                  id={misconceptionCorrectionId}
                  content={wrapUp.misconception.correction}
                  className="mt-2 break-words text-sm leading-6 text-ink-700"
                />
              ) : null}
            </section>
          ) : null}

          {children}
        </div>

        <div className="flex flex-col gap-3">
          <section
            data-testid="concept-v2-practice-actions"
            aria-labelledby={practiceActionsHeadingId}
            aria-describedby={practiceActionsDescriptionId}
            className="rounded-[20px] border border-line bg-white/88 px-4 py-4 shadow-sm"
          >
            <h4 id={practiceActionsHeadingId} className="lab-label min-w-0 break-words">{copy.practiceActionsLabel}</h4>
            <p
              id={practiceActionsDescriptionId}
              className="mt-2 break-words text-sm leading-6 text-ink-700"
            >
              {copy.practiceActionsDescription}
            </p>
            <ol
              aria-labelledby={practiceActionsHeadingId}
              aria-describedby={practiceActionsDescriptionId}
              className="mt-3 grid gap-3"
            >
              {featuredPracticeAction ? (
                <li className="min-w-0">
                  <ConceptPageV2PracticeActionLink
                    href={localizeShareHref(featuredPracticeAction.href, locale)}
                    testId="concept-v2-primary-practice-action"
                    className="group/action grid min-h-20 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-[18px] sm:grid-cols-[auto_minmax(0,1fr)_auto] border border-teal-500/24 bg-teal-500/8 px-4 py-4 text-left text-ink-950 shadow-sm transition hover:border-teal-500/36 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                    ariaLabel={`${copy.recommendedActionLabel}: ${featuredPracticeAction.label}`}
                    ariaDescribedBy={featuredPracticeActionDescriptionId}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-teal-500/28 bg-white text-sm font-semibold text-teal-700"
                    >
                      {practiceActions.indexOf(featuredPracticeAction) + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="mb-2 inline-flex max-w-full min-w-0 rounded-full border border-teal-500/20 bg-white/88 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-teal-700">
                        <span className="min-w-0 break-words">{copy.recommendedActionLabel}</span>
                      </span>
                      <span className="line-clamp-2 block break-words text-base font-semibold leading-6">
                        {featuredPracticeAction.label}
                      </span>
                      <span
                        id={featuredPracticeActionDescriptionId}
                        className="mt-1 line-clamp-2 block break-words text-sm leading-6 text-ink-700"
                      >
                        {featuredPracticeAction.description}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="mt-0.5 hidden text-lg font-semibold text-teal-700 transition-transform group-hover/action:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none sm:block"
                    >
                      →
                    </span>
                  </ConceptPageV2PracticeActionLink>
                </li>
              ) : null}
              {highlightedChallengeAction ? (
                <li className="min-w-0">
                  <ConceptPageV2PracticeActionLink
                    href={localizeShareHref(highlightedChallengeAction.href, locale)}
                    testId="concept-v2-secondary-challenge"
                    className="group/action grid min-h-16 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-[18px] border border-coral-500/22 sm:grid-cols-[auto_minmax(0,1fr)_auto] bg-coral-500/8 px-4 py-3.5 text-left text-ink-950 shadow-sm transition hover:border-coral-500/34 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                    ariaLabel={`${copy.practiceOptionLabel}: ${highlightedChallengeAction.label}`}
                    ariaDescribedBy={highlightedChallengeActionDescriptionId}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-coral-500/26 bg-white text-sm font-semibold text-coral-700"
                    >
                      {practiceActions.indexOf(highlightedChallengeAction) + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="mb-2 inline-flex max-w-full min-w-0 rounded-full border border-coral-500/20 bg-white/82 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-coral-700">
                        <span className="min-w-0 break-words">{copy.practiceOptionLabel}</span>
                      </span>
                      <span className="line-clamp-2 block break-words text-base font-semibold leading-6">
                        {highlightedChallengeAction.label}
                      </span>
                      <span
                        id={highlightedChallengeActionDescriptionId}
                        className="mt-1 line-clamp-2 block break-words text-sm leading-6 text-ink-700"
                      >
                        {highlightedChallengeAction.description}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="mt-0.5 hidden text-lg font-semibold text-coral-700 transition-transform group-hover/action:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none sm:block"
                    >
                      →
                    </span>
                  </ConceptPageV2PracticeActionLink>
                </li>
              ) : null}
            </ol>

            {morePracticeActions.length ? (
              <ConceptPageV2Disclosure
                testId="concept-v2-more-practice-options"
                className="group mt-3 rounded-[18px] border border-line bg-paper/78 px-3 py-2"
                summaryClassName="cursor-pointer list-none rounded-[14px] text-sm font-semibold text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper [&::-webkit-details-marker]:hidden"
                summaryAriaLabel={`${copy.morePracticeOptionsLabel} (${morePracticeActions.length})${morePracticePreviewLabel ? ` — ${morePracticePreviewLabel}` : ""}`}
                summaryCollapsedAriaPrefix={copy.showMoreOptionsLabel}
                summaryExpandedAriaPrefix={copy.hideMoreOptionsLabel}
                contentClassName="mt-2"
                contentAriaLabelledBy={morePracticeDisclosureHeadingId}
                summary={(
                  <span
                    className={[
                      "inline-flex min-w-0 max-w-full flex-wrap items-center gap-2",
                      conceptPageV2CompactDisclosureTargetClass,
                    ].join(" ")}
                  >
                    <span id={morePracticeDisclosureHeadingId} className="min-w-0 break-words">
                      {copy.morePracticeOptionsLabel}
                    </span>
                    <span
                      aria-hidden="true"
                      className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-ink-950/10 bg-white px-2 text-[0.68rem] font-semibold text-ink-700"
                    >
                      {morePracticeActions.length}
                    </span>
                    <span aria-hidden="true" className="shrink-0 text-ink-500 transition-transform group-open:rotate-180 motion-reduce:transition-none">
                      ↓
                    </span>
                    {morePracticePreviewLabel ? (
                      <span className="basis-full line-clamp-1 min-w-0 break-words text-xs font-medium text-ink-600 sm:basis-auto">
                        {morePracticePreviewLabel}
                      </span>
                    ) : null}
                  </span>
                )}
              >
                <ol
                  aria-label={copy.morePracticeOptionsLabel}
                  className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1"
                >
                  {morePracticeActions.map((action) => {
                    const actionPosition = practiceActions.indexOf(action) + 1;
                    const isChallengeAction = action.label === copy.challengeLabel;
                    const actionDescriptionId = `${morePracticeActionDescriptionBaseId}-${actionPosition}-description`;

                    return (
                      <li key={`${action.href}-${action.label}`} className="min-w-0">
                        <ConceptPageV2PracticeActionLink
                          href={localizeShareHref(action.href, locale)}
                          testId={isChallengeAction ? "concept-v2-secondary-challenge" : undefined}
                          className="group/action grid min-h-12 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-[18px] border border-line bg-white/90 sm:grid-cols-[auto_minmax(0,1fr)_auto] px-3.5 py-3 text-left text-ink-900 shadow-sm transition hover:border-ink-950/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                          ariaLabel={`${copy.practiceOptionLabel}: ${action.label}`}
                          ariaDescribedBy={actionDescriptionId}
                        >
                          <span
                            aria-hidden="true"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-line bg-paper text-[0.72rem] font-semibold text-ink-600"
                          >
                            {actionPosition}
                          </span>
                          <span className="min-w-0">
                            <span className="mb-1.5 inline-flex max-w-full min-w-0 rounded-full border border-ink-950/10 bg-paper/92 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-600">
                              <span className="min-w-0 break-words">{copy.practiceOptionLabel}</span>
                            </span>
                            <span className="line-clamp-2 block break-words text-sm font-semibold leading-5">
                              {action.label}
                            </span>
                            <span
                              id={actionDescriptionId}
                              className="mt-0.5 line-clamp-2 block break-words text-xs leading-5 text-ink-600"
                            >
                              {action.description}
                            </span>
                          </span>
                          <span
                            aria-hidden="true"
                            className="mt-0.5 hidden text-base font-semibold text-teal-700 transition-transform group-hover/action:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none sm:block"
                          >
                            →
                          </span>
                        </ConceptPageV2PracticeActionLink>
                      </li>
                    );
                  })}
                </ol>
              </ConceptPageV2Disclosure>
            ) : null}
          </section>

          {featuredNextConcept ? (
            <section
              data-testid="concept-v2-read-next"
              aria-labelledby={readNextHeadingId}
              aria-describedby={readNextDescriptionId}
              className="rounded-[20px] border border-line bg-white/88 px-4 py-4 shadow-sm"
            >
              <h4 id={readNextHeadingId} className="lab-label min-w-0 break-words">{copy.nextConceptsLabel}</h4>
              <p
                id={readNextDescriptionId}
                className="mt-2 break-words text-sm leading-6 text-ink-700"
              >
                {copy.nextConceptsDescription}
              </p>
              <ol
                aria-labelledby={readNextHeadingId}
                aria-describedby={readNextDescriptionId}
                className="mt-3 grid gap-2"
              >
                <li className="min-w-0">
                  <Link
                    href={localizeShareHref(`/concepts/${featuredNextConcept.slug}`, locale)}
                    data-testid="concept-v2-read-next-card"
                    aria-label={`${copy.nextConceptsLabel}: ${featuredNextConcept.title}`}
                    aria-describedby={
                      featuredNextConcept.reasonLabel ? featuredReadNextDescriptionId : undefined
                    }
                    className="group/action grid min-h-16 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-[20px] sm:grid-cols-[auto_minmax(0,1fr)_auto] border border-teal-500/22 bg-[linear-gradient(135deg,rgba(20,184,166,0.1)_0%,rgba(255,255,255,0.94)_55%,rgba(255,255,255,0.99)_100%)] px-4 py-4 text-left shadow-sm transition hover:border-teal-500/32 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-teal-500/28 bg-white text-sm font-semibold text-teal-700"
                    >
                      1
                    </span>
                    <span className="min-w-0">
                      <span className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
                        <span className="inline-flex max-w-full rounded-full border border-teal-500/22 bg-white/88 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-teal-700">
                          <span className="min-w-0 break-words">{copy.nextConceptsLabel}</span>
                        </span>
                        {featuredNextConcept.reasonLabel ? (
                          <span
                            id={featuredReadNextDescriptionId}
                            className="inline-flex max-w-full rounded-full border border-line bg-white/80 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-600"
                          >
                            <RichMathText
                              as="span"
                              content={featuredNextConcept.reasonLabel}
                              className="min-w-0 line-clamp-1 break-words"
                            />
                          </span>
                        ) : null}
                      </span>
                      <RichMathText
                        as="span"
                        content={featuredNextConcept.title}
                        className="mt-2 line-clamp-2 block break-words text-base font-semibold leading-6 text-ink-950"
                      />
                    </span>
                    <span
                      aria-hidden="true"
                      className="mt-1 hidden text-lg font-semibold text-teal-700 transition-transform group-hover/action:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none sm:block"
                    >
                      →
                    </span>
                  </Link>
                </li>
                {additionalNextConcepts.length ? (
                  <li className="min-w-0">
                    <ConceptPageV2Disclosure
                      testId="concept-v2-more-read-next-options"
                      className="group rounded-[18px] border border-line bg-paper/78 px-3 py-2"
                      summaryClassName="cursor-pointer list-none rounded-[14px] text-sm font-semibold text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper [&::-webkit-details-marker]:hidden"
                      summaryAriaLabel={`${copy.moreReadNextOptionsLabel} (${additionalNextConcepts.length})${moreReadNextPreviewLabel ? ` — ${moreReadNextPreviewLabel}` : ""}`}
                      summaryCollapsedAriaPrefix={copy.showMoreOptionsLabel}
                      summaryExpandedAriaPrefix={copy.hideMoreOptionsLabel}
                      contentClassName="mt-2"
                      contentAriaLabelledBy={moreReadNextDisclosureHeadingId}
                      summary={(
                        <span
                          className={[
                            "inline-flex min-w-0 max-w-full flex-wrap items-center gap-2",
                            conceptPageV2CompactDisclosureTargetClass,
                          ].join(" ")}
                        >
                          <span id={moreReadNextDisclosureHeadingId} className="min-w-0 break-words">
                            {copy.moreReadNextOptionsLabel}
                          </span>
                          <span
                            aria-hidden="true"
                            className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-ink-950/10 bg-white px-2 text-[0.68rem] font-semibold text-ink-700"
                          >
                            {additionalNextConcepts.length}
                          </span>
                          <span aria-hidden="true" className="shrink-0 text-ink-500 transition-transform group-open:rotate-180 motion-reduce:transition-none">
                            ↓
                          </span>
                          {moreReadNextPreviewLabel ? (
                            <RichMathText
                              as="span"
                              content={moreReadNextPreviewLabel}
                              className="basis-full line-clamp-1 min-w-0 break-words text-xs font-medium text-ink-600 sm:basis-auto"
                            />
                          ) : null}
                        </span>
                      )}
                    >
                      <ol
                        aria-label={copy.moreReadNextOptionsLabel}
                        className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1"
                      >
                        {additionalNextConcepts.map((concept, index) => {
                          const readNextPosition = index + 2;
                          const readNextDescriptionId = `${moreReadNextDescriptionBaseId}-${readNextPosition}-description`;

                          return (
                            <li key={concept.slug} className="min-w-0">
                              <Link
                                href={localizeShareHref(`/concepts/${concept.slug}`, locale)}
                                data-testid="concept-v2-read-next-card"
                                aria-label={`${copy.nextConceptsLabel}: ${concept.title}`}
                                aria-describedby={
                                  concept.reasonLabel ? readNextDescriptionId : undefined
                                }
                                className="group/action grid min-h-12 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-[18px] border border-line bg-paper sm:grid-cols-[auto_minmax(0,1fr)_auto] px-3.5 py-3 text-left transition hover:border-teal-500/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                              >
                                <span
                                  aria-hidden="true"
                                  className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-teal-500/22 bg-white/88 text-[0.72rem] font-semibold text-teal-700"
                                >
                                  {readNextPosition}
                                </span>
                                <span className="min-w-0">
                                  <span className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
                                    <span className="inline-flex max-w-full rounded-full border border-teal-500/22 bg-white/88 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-teal-700">
                                      <span className="min-w-0 break-words">{copy.nextConceptsLabel}</span>
                                    </span>
                                    {concept.reasonLabel ? (
                                      <span
                                        id={readNextDescriptionId}
                                        className="inline-flex max-w-full rounded-full border border-line bg-white/80 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-600"
                                      >
                                        <RichMathText
                                          as="span"
                                          content={concept.reasonLabel}
                                          className="min-w-0 line-clamp-1 break-words"
                                        />
                                      </span>
                                    ) : null}
                                  </span>
                                  <RichMathText
                                    as="span"
                                    content={concept.title}
                                    className="mt-2 line-clamp-2 block break-words text-sm font-semibold text-ink-950"
                                  />
                                </span>
                                <span
                                  aria-hidden="true"
                                  className="mt-1 hidden text-base font-semibold text-teal-700 transition-transform group-hover/action:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none sm:block"
                                >
                                  →
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ol>
                    </ConceptPageV2Disclosure>
                  </li>
                ) : null}
              </ol>
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}
