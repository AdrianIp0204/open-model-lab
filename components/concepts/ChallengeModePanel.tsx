"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  type ConceptChallengeItem,
  type ConceptChallengeCheck,
  type ConceptChallengeMode,
  type ReadNextRecommendation,
} from "@/lib/content";
import {
  getChallengeCueLabels,
  getChallengeDepth,
} from "@/lib/content/challenges";
import { trackLearningEvent } from "@/lib/analytics";
import {
  resolveAccountProgressSnapshot,
  getCompletedChallengeCount,
  getCompletedChallengeIds,
  getConceptProgressRecord,
  getStartedChallengeIds,
  recordChallengeCompleted,
  recordChallengeStarted,
  useProgressSnapshot,
  type ProgressSnapshot,
} from "@/lib/progress";
import type { ConceptSimulationSource } from "@/lib/physics";
import { buildChallengeEntryHref, conceptShareAnchorIds } from "@/lib/share-links";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { ShareLinkButton } from "@/components/share/ShareLinkButton";
import {
  evaluateChallengeItem,
  type ChallengeRuntimeState,
} from "@/lib/learning/challengeMode";
import {
  translateChallengeCheckLabel,
  translateChallengeCueLabel,
  translateChallengeCurrentValue,
  translateChallengeStyleLabel,
} from "@/lib/i18n/challenge-ui";
import { RichMathText } from "./MathFormula";
import { useConceptAchievementTracker } from "./ConceptAchievementTracker";
import { useConceptPagePhase } from "./ConceptPagePhaseContext";

type ChallengeModePanelProps = {
  concept: {
    id?: string;
    slug: string;
    title: string;
  };
  simulationSource: ConceptSimulationSource;
  challengeMode: ConceptChallengeMode;
  runtime: ChallengeRuntimeState;
  readNext?: ReadNextRecommendation[];
  initialSyncedSnapshot?: ProgressSnapshot | null;
  onApplySetup: (item: ConceptChallengeItem) => void;
  initialItemId?: string | null;
  activeItemId?: string | null;
  onActiveItemChange?: (itemId: string) => void;
  buildShareHref?: (challengeId: string) => string;
  displayMode?: "default" | "floating-reminder";
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const challengeDepthClasses = {
  "warm-up": "border-line bg-paper text-ink-600",
  core: "border-sky-500/20 bg-sky-500/10 text-sky-700",
  stretch: "border-coral-500/20 bg-coral-500/10 text-coral-700",
} as const;

function isRequirementCheck(check: ConceptChallengeCheck) {
  return (
    check.type === "graph-active" ||
    check.type === "overlay-active" ||
    check.type === "time-source" ||
    check.type === "time-range" ||
    check.type === "compare-active"
  );
}

function hasActionableSuggestedStart(item: ConceptChallengeItem | null) {
  const setup = item?.setup;

  if (!setup) {
    return false;
  }

  return Boolean(
    setup.presetId ||
      setup.graphId ||
      setup.interactionMode ||
      setup.inspectTime !== undefined ||
      (setup.overlayIds?.length ?? 0) > 0 ||
      Object.keys(setup.patch ?? {}).length > 0,
  );
}

export function ChallengeModePanel({
  concept,
  simulationSource,
  challengeMode,
  runtime,
  readNext = [],
  initialSyncedSnapshot = null,
  onApplySetup,
  initialItemId = null,
  activeItemId: controlledActiveItemId,
  onActiveItemChange,
  buildShareHref,
  displayMode = "default",
}: ChallengeModePanelProps) {
  const t = useTranslations("ChallengeModePanel");
  const challengeUi = useTranslations("ChallengeUi");
  const locale = useLocale() as AppLocale;
  const resolvedInitialItemId =
    challengeMode.items.find((item) => item.id === initialItemId)?.id ??
    challengeMode.items[0]?.id ??
    null;
  const [uncontrolledActiveItemId, setUncontrolledActiveItemId] = useState(resolvedInitialItemId);
  const [reminderExpanded, setReminderExpanded] = useState(true);
  const [revealedHints, setRevealedHints] = useState<Record<string, number>>({});
  const [revealedGuides, setRevealedGuides] = useState<Record<string, boolean>>({});
  const localSnapshot = useProgressSnapshot();
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const conceptPagePhase = useConceptPagePhase();
  const { markMeaningfulInteraction, trackChallengeCompleted } = useConceptAchievementTracker();
  const progressSource: "local" | "synced" =
    progressDisplay.source === "local" ? "local" : "synced";
  const challengeDepthLabels = {
    "warm-up": t("depth.warmUp"),
    core: t("depth.core"),
    stretch: t("depth.stretch"),
  } as const;
  const progressSnapshot = progressDisplay.snapshot;
  const progressRecord = getConceptProgressRecord(progressSnapshot, concept);
  const challengeIds = challengeMode.items.map((item) => item.id);
  const completedChallengeIds = getCompletedChallengeIds(progressRecord);
  const completedChallengeIdSet = new Set(completedChallengeIds);
  const startedChallengeIds = getStartedChallengeIds(progressRecord, challengeIds);
  const startedChallengeIdSet = new Set(startedChallengeIds);
  const completedCount = getCompletedChallengeCount(
    progressRecord,
    challengeIds,
  );
  const startedCount = startedChallengeIds.length;
  const activeItemId =
    controlledActiveItemId === undefined
      ? uncontrolledActiveItemId
      : controlledActiveItemId;
  const setActiveItemId = onActiveItemChange ?? setUncontrolledActiveItemId;
  const activeItem =
    challengeMode.items.find((item) => item.id === activeItemId) ?? challengeMode.items[0] ?? null;
  const evaluation = activeItem ? evaluateChallengeItem(simulationSource, activeItem, runtime) : null;
  const revealedHintCount = activeItem ? revealedHints[activeItem.id] ?? 0 : 0;
  const visibleHints = activeItem?.hints?.slice(0, revealedHintCount) ?? [];
  const revealedGuide = activeItem ? (revealedGuides[activeItem.id] ?? false) : false;
  const solvedBefore = activeItem ? completedChallengeIdSet.has(activeItem.id) : false;
  const startedBefore = activeItem ? startedChallengeIdSet.has(activeItem.id) : false;
  const isSolved = Boolean(evaluation?.completed || solvedBefore);
  const hasSuggestedStart = hasActionableSuggestedStart(activeItem);
  const activeDepth = activeItem ? getChallengeDepth(activeItem) : "core";
  const activeCueLabels = activeItem ? getChallengeCueLabels(activeItem) : [];
  const graphLabels = new Map(
    simulationSource.simulation.graphs.map((graph) => [graph.id, graph.label]),
  );
  const overlayLabels = new Map(
    (simulationSource.simulation.overlays ?? []).map((overlay) => [overlay.id, overlay.label]),
  );
  const requirementLabels = activeItem
    ? activeItem.checks
        .filter(isRequirementCheck)
        .map((check) =>
          translateChallengeCheckLabel(check, challengeUi, {
            graphLabels,
            overlayLabels,
          }),
        )
    : [];
  const targetLabels = activeItem
    ? activeItem.checks
        .filter((check) => !isRequirementCheck(check))
        .map((check) =>
          translateChallengeCheckLabel(check, challengeUi, {
            graphLabels,
            overlayLabels,
          }),
        )
    : [];
  const startedChallengeIdsRef = useRef<Set<string>>(new Set());
  const trackedCompletedChallengeIdsRef = useRef<Set<string>>(new Set());
  const trackedDeepLinkChallengeIdsRef = useRef<Set<string>>(new Set());
  const nextPendingItem =
    challengeMode.items.find(
      (item) => activeItem && item.id !== activeItem.id && !completedChallengeIdSet.has(item.id),
    ) ?? null;
  const nextRecommendation = readNext[0] ?? null;
  const isFloatingReminder = displayMode === "floating-reminder";

  const trackChallengeStart = useCallback(
    (challengeId: string, source: string) => {
      if (startedChallengeIdsRef.current.has(challengeId)) {
        return;
      }

      startedChallengeIdsRef.current.add(challengeId);
      trackLearningEvent("challenge_started", {
        pagePath: `/concepts/${concept.slug}`,
        pageTitle: concept.title,
        pageKind: "concept",
        conceptId: concept.id,
        conceptSlug: concept.slug,
        conceptTitle: concept.title,
        challengeId,
        source,
      });
    },
    [concept.id, concept.slug, concept.title],
  );

  const markChallengeStarted = useCallback(
    (challengeId: string, source: string) => {
      trackChallengeStart(challengeId, source);
      markMeaningfulInteraction();
      recordChallengeStarted(concept, challengeId);
    },
    [concept, markMeaningfulInteraction, trackChallengeStart],
  );

  useEffect(() => {
    if (isFloatingReminder) {
      return;
    }

    if (!initialItemId || !activeItem || activeItem.id !== resolvedInitialItemId) {
      return;
    }

    if (trackedDeepLinkChallengeIdsRef.current.has(activeItem.id)) {
      return;
    }

    trackedDeepLinkChallengeIdsRef.current.add(activeItem.id);
    markChallengeStarted(activeItem.id, "deep-link");
  }, [activeItem, initialItemId, isFloatingReminder, markChallengeStarted, resolvedInitialItemId]);

  useEffect(() => {
    if (isFloatingReminder) {
      return;
    }

    if (!activeItem || !evaluation?.completed || solvedBefore) {
      return;
    }

    recordChallengeCompleted(concept, activeItem.id);
    trackChallengeCompleted(activeItem.id);

    if (startedChallengeIdsRef.current.has(activeItem.id)) {
      if (trackedCompletedChallengeIdsRef.current.has(activeItem.id)) {
        return;
      }

      trackedCompletedChallengeIdsRef.current.add(activeItem.id);
      trackLearningEvent("challenge_completed", {
        pagePath: `/concepts/${concept.slug}`,
        pageTitle: concept.title,
        pageKind: "concept",
        conceptId: concept.id,
        conceptSlug: concept.slug,
        conceptTitle: concept.title,
        challengeId: activeItem.id,
        source: "challenge-evaluation",
      });
    }
  }, [activeItem, concept, evaluation?.completed, isFloatingReminder, solvedBefore, trackChallengeCompleted]);
  const returnToSetup = useCallback(() => {
    const setupRegion = document.getElementById(conceptShareAnchorIds.liveBench);

    if (!(setupRegion instanceof HTMLElement)) {
      return;
    }

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setupRegion.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
    setupRegion.focus({ preventScroll: true });
  }, []);

  if (!activeItem || !evaluation) {
    return null;
  }

  const challengeEntryHref = buildShareHref
    ? buildShareHref(activeItem.id)
    : buildChallengeEntryHref(concept.slug, activeItem.id, locale);

  function resetChallengeSupport(itemId: string) {
    setRevealedHints((current) => ({
      ...current,
      [itemId]: 0,
    }));
    setRevealedGuides((current) => ({
      ...current,
      [itemId]: false,
    }));
  }

  function revealNextHint() {
    if (!activeItem.hints?.length) {
      return;
    }

    markChallengeStarted(activeItem.id, "hint");
    setRevealedHints((current) => ({
      ...current,
      [activeItem.id]: Math.min(
        (current[activeItem.id] ?? 0) + 1,
        activeItem.hints?.length ?? 0,
      ),
    }));
  }

  function applySetup() {
    if (!hasSuggestedStart) {
      return;
    }

    markChallengeStarted(activeItem.id, "suggested-start");
    onApplySetup(activeItem);

    if (conceptPagePhase?.activePhaseId === "check" && conceptPagePhase.returnToSetupArea) {
      conceptPagePhase.returnToSetupArea({ phaseId: "explore" });
      return;
    }
  }

  function toggleGuide() {
    markChallengeStarted(activeItem.id, "explanation");
    setRevealedGuides((current) => ({
      ...current,
      [activeItem.id]: !current[activeItem.id],
    }));
  }

  function retryChallenge() {
    markChallengeStarted(activeItem.id, "retry");
    resetChallengeSupport(activeItem.id);

    if (hasSuggestedStart) {
      onApplySetup(activeItem);
    }
  }

  function openNextChallenge() {
    if (!nextPendingItem) {
      return;
    }

    markChallengeStarted(nextPendingItem.id, "open-next");
    setActiveItemId(nextPendingItem.id);
  }

  const pendingChecks = evaluation.checks.filter((check) => !check.passed);
  const reminderChecks = pendingChecks.length ? pendingChecks : evaluation.checks;
  const remainingCount = pendingChecks.length;

  if (isFloatingReminder) {
    return (
      <section
        data-testid="challenge-mode-floating-panel"
        data-display-mode="floating-reminder"
        role="region"
        aria-label={t("sections.requirements")}
        className="pointer-events-auto w-full max-w-[28rem] rounded-[20px] border border-amber-500/25 bg-paper/96 px-3 py-2.5 shadow-[0_14px_32px_rgba(15,28,36,0.16)] backdrop-blur-sm sm:px-3.5"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="lab-label">{t("sections.requirements")}</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-ink-950">
              {activeItem.title}
            </p>
            <p className="text-[0.72rem] leading-5 text-ink-600">
              {remainingCount
                ? `${t("checks.pending")} ${remainingCount} / ${evaluation.totalCount}`
                : `${t("checks.matched")} ${evaluation.totalCount} / ${evaluation.totalCount}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReminderExpanded((current) => !current)}
            aria-expanded={reminderExpanded}
            aria-controls={`${activeItem.id}-challenge-reminder`}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90"
          >
            {reminderExpanded ? t("actions.hideTasks") : t("actions.showTasks")}
          </button>
        </div>

        {reminderExpanded ? (
          <div
            id={`${activeItem.id}-challenge-reminder`}
            data-testid="challenge-mode-reminder-body"
            className="mt-2.5 space-y-1.5"
          >
            {reminderChecks.map((check, index) => {
              const sourceIndex = evaluation.checks.indexOf(check);
              const sourceCheck = activeItem.checks[sourceIndex];

              return (
                <div
                  key={`${activeItem.id}-floating-check-${index}`}
                  data-testid="challenge-mode-reminder-item"
                  className={joinClasses(
                    "flex items-start gap-2 rounded-2xl border px-3 py-2 text-xs leading-5",
                    check.passed
                      ? "border-emerald-500/30 bg-emerald-500/8 text-ink-900"
                      : "border-line bg-white/78 text-ink-700",
                  )}
                >
                  <span
                    className={joinClasses(
                      "mt-0.5 inline-flex min-w-[4.3rem] items-center justify-center rounded-full px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em]",
                      check.passed
                        ? "bg-emerald-500/14 text-emerald-700"
                        : "bg-paper text-ink-500",
                    )}
                  >
                    {check.passed ? t("checks.matched") : t("checks.pending")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <RichMathText
                      as="div"
                      content={translateChallengeCheckLabel(sourceCheck, challengeUi, {
                        graphLabels,
                        overlayLabels,
                      })}
                      className="min-w-0"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="lab-panel p-3.5 md:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div className="max-w-3xl">
          <p className="lab-label">{challengeMode.title ?? t("title")}</p>
          <p className="mt-1 text-sm leading-6 text-ink-700">
            {challengeMode.intro ?? t("intro")}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ShareLinkButton
            href={challengeEntryHref}
            label={t("share.copy")}
            shareLabel={t("share.share")}
            shareTitle={t("share.title", { title: concept.title })}
            preferWebShare
            copiedText={t("share.copied")}
            sharedText={t("share.shared")}
            ariaLabel={t("share.aria")}
            className="inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-700 transition hover:border-teal-500/35 hover:bg-white/90"
          />
          <div className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-700">
            {t("summary.solvedCount", {
              count: completedCount,
            })}
            {startedCount
              ? ` - ${t("summary.startedCount", { count: startedCount })}`
              : ""}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {challengeMode.items.map((item) => {
          const active = item.id === activeItem.id;
          const solved = completedChallengeIdSet.has(item.id);
          const started = startedChallengeIdSet.has(item.id);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                markChallengeStarted(item.id, "challenge-selector");
                setActiveItemId(item.id);
              }}
              className={joinClasses(
                "rounded-full border px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                active
                  ? "border-teal-500/35 bg-teal-500 text-white"
                  : "border-line bg-paper-strong text-ink-700 hover:border-teal-500/35",
              )}
            >
              {item.title}
              {solved ? ` ${t("states.solved")}` : started ? ` ${t("states.started")}` : ""}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-[22px] border border-line bg-paper-strong p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-teal-700">
              {translateChallengeStyleLabel(activeItem.style, challengeUi)}
            </span>
            <span
              className={joinClasses(
                "rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em]",
                challengeDepthClasses[activeDepth],
              )}
            >
              {challengeDepthLabels[activeDepth]}
            </span>
            {isSolved ? (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                {t("states.solved")}
              </span>
            ) : startedBefore ? (
              <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-amber-700">
                {t("states.started")}
              </span>
            ) : null}
            {visibleHints.length ? (
              <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-amber-800">
                {t("support.hintsShown", {
                  current: visibleHints.length,
                  total: activeItem.hints?.length ?? visibleHints.length,
                })}
              </span>
            ) : null}
            {revealedGuide ? (
              <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-sky-800">
                {t("support.explanationOpen")}
              </span>
            ) : null}
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
            {t("summary.checks", {
              count: evaluation.totalCount,
            })}
          </p>
        </div>

        <h3 className="mt-3 text-xl font-semibold text-ink-950">{activeItem.title}</h3>
        <RichMathText
          as="div"
          content={activeItem.prompt}
          className="mt-2 text-sm leading-6 text-ink-700"
        />

        {activeCueLabels.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeCueLabels.map((label) => (
              <span
                key={`${activeItem.id}-${label}`}
                className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700"
              >
                {translateChallengeCueLabel(label, challengeUi)}
              </span>
            ))}
          </div>
        ) : null}

        {activeItem.setup?.note ? (
          <div className="mt-3 rounded-2xl border border-line bg-white/70 px-3 py-3 text-sm leading-6 text-ink-700">
            <p className="font-semibold text-ink-950">{t("sections.suggestedStart")}</p>
            <RichMathText as="div" content={activeItem.setup.note} className="mt-2" />
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          {evaluation.checks.map((check, index) => {
            const sourceCheck = activeItem.checks[index];

            return (
            <div
              key={`${activeItem.id}-check-${index}`}
              className={joinClasses(
                "flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-3 text-sm leading-6",
                check.passed
                  ? "border-emerald-500/30 bg-emerald-500/8 text-ink-900"
                  : "border-line bg-white/70 text-ink-700",
              )}
            >
              <span
                className={joinClasses(
                  "inline-flex min-w-[5rem] items-center justify-center rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                  check.passed
                    ? "bg-emerald-500/14 text-emerald-700"
                    : "bg-paper text-ink-500",
                )}
              >
                {check.passed ? t("checks.matched") : t("checks.pending")}
              </span>
              <RichMathText
                as="div"
                content={translateChallengeCheckLabel(sourceCheck, challengeUi, {
                  graphLabels,
                  overlayLabels,
                })}
                className="min-w-0 flex-1"
              />
              {check.currentValue ? (
                <span className="rounded-full border border-line bg-paper px-2.5 py-1 font-mono text-xs text-ink-600">
                  {translateChallengeCurrentValue(sourceCheck, check.currentValue, challengeUi)}
                </span>
              ) : null}
            </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {hasSuggestedStart ? (
            <button
              type="button"
              onClick={applySetup}
              className="inline-flex items-center justify-center rounded-full border border-teal-500/25 bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600"
            >
              {t("actions.applySuggestedStart")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={returnToSetup}
            aria-controls={conceptShareAnchorIds.liveBench}
            className="inline-flex items-center justify-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            {t("actions.backToSetup")}
          </button>
          {activeItem.hints?.length ? (
            <button
              type="button"
              onClick={revealNextHint}
              disabled={revealedHintCount >= activeItem.hints.length}
              className="inline-flex items-center justify-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {revealedHintCount >= activeItem.hints.length
                ? t("actions.allHintsShown")
                : t("actions.showHintProgress", {
                    current: revealedHintCount + 1,
                    total: activeItem.hints.length,
                  })}
            </button>
          ) : null}
          <button
            type="button"
            onClick={toggleGuide}
            className="inline-flex items-center justify-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90"
          >
            {revealedGuide ? t("actions.hideExplanation") : t("actions.revealExplanation")}
          </button>
          {(startedBefore || visibleHints.length || revealedGuide) && (
            <button
              type="button"
              onClick={retryChallenge}
              className="inline-flex items-center justify-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90"
            >
              {hasSuggestedStart
                ? t("actions.retryFromSuggestedStart")
                : t("actions.retryChallenge")}
            </button>
          )}
        </div>

        {visibleHints.length ? (
          <div className="mt-4 space-y-2">
            {visibleHints.map((hint, index) => (
              <div
                key={`${activeItem.id}-hint-${index}`}
                className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-3 text-sm leading-6 text-ink-800"
              >
                <p className="font-semibold text-ink-950">{t("sections.hint", { index: index + 1 })}</p>
                <RichMathText as="div" content={hint} className="mt-2" />
              </div>
            ))}
          </div>
        ) : null}

        {revealedGuide ? (
          <div className="mt-4 rounded-[22px] border border-sky-500/20 bg-sky-500/10 px-4 py-4 text-sm leading-6 text-ink-900">
            <p className="font-semibold text-ink-950">{t("sections.explanationReveal")}</p>
            {requirementLabels.length ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {t("sections.requirements")}
                </p>
                <ul className="space-y-2">
                  {requirementLabels.map((label, index) => (
                    <li key={`${activeItem.id}-requirement-${index}`} className="rounded-2xl border border-line bg-white/70 px-3 py-2.5">
                      <RichMathText as="div" content={label} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {targetLabels.length ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {t("sections.targets")}
                </p>
                <ul className="space-y-2">
                  {targetLabels.map((label, index) => (
                    <li key={`${activeItem.id}-target-${index}`} className="rounded-2xl border border-line bg-white/70 px-3 py-2.5">
                      <RichMathText as="div" content={label} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {activeItem.hints?.length ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {t("sections.coachingNotes")}
                </p>
                <ul className="space-y-2">
                  {activeItem.hints.map((hint, index) => (
                    <li key={`${activeItem.id}-guide-hint-${index}`} className="rounded-2xl border border-line bg-white/70 px-3 py-2.5">
                      <RichMathText as="div" content={hint} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                {t("sections.completionProves")}
              </p>
              <RichMathText as="div" content={activeItem.successMessage} className="mt-2" />
            </div>
          </div>
        ) : null}

        {isSolved ? (
          <div className="mt-4 rounded-[22px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm leading-6 text-ink-900">
            <p className="font-semibold text-ink-950">
              {evaluation.completed
                ? t("solved.title")
                : progressSource === "synced"
                  ? t("solved.previouslySynced")
                  : t("solved.previouslyLocal")}
            </p>
            <RichMathText as="div" content={activeItem.successMessage} className="mt-2" />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={retryChallenge}
                className="inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
              >
                {hasSuggestedStart
                  ? t("actions.retryFromSuggestedStart")
                  : t("actions.retryChallenge")}
              </button>
              {nextPendingItem || nextRecommendation ? (
                <>
                  {nextPendingItem ? (
                    <button
                      type="button"
                      onClick={openNextChallenge}
                      className="inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
                    >
                      {t("actions.openNextChallenge")}
                    </button>
                  ) : null}
                  {nextRecommendation ? (
                    <Link
                      href={`/concepts/${nextRecommendation.slug}`}
                      className="inline-flex text-sm font-semibold text-ink-950 underline decoration-teal-500 decoration-2 underline-offset-4"
                    >
                      {t("actions.readNext", { title: nextRecommendation.title })}
                    </Link>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-ink-600">
            {t("checklistNote")}
          </p>
        )}
      </div>
    </section>
  );
}
