"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { WorkedExampleAccessMode } from "@/lib/account/entitlements";
import type { ConceptContent, ConceptWorkedExample } from "@/lib/content";
import {
  resolveLiveWorkedExample,
  type ResolvedWorkedExample,
} from "@/lib/learning/liveWorkedExamples";
import { resolveSupplementalLiveWorkedExample } from "@/lib/learning/supplementalWorkedExamples";
import { formatDisplayUnit } from "@/lib/physics";
import { recordWorkedExampleEngaged } from "@/lib/progress";
import { InlineFormula, RichMathText } from "./MathFormula";
import {
  useConceptLearningBridge,
  useLiveWorkedExampleSnapshot,
} from "./ConceptLearningBridge";
import { getVariableTone } from "./variable-tones";

type LiveWorkedExampleSectionProps = {
  concept: Pick<ConceptContent, "slug" | "title" | "sections" | "variableLinks">;
  mode?: WorkedExampleAccessMode;
  sectionTitle?: string;
};

type WorkedExampleSnapshot = NonNullable<
  ReturnType<typeof useLiveWorkedExampleSnapshot>
>;

type WorkedExampleBodyProps = {
  concept: LiveWorkedExampleSectionProps["concept"];
  activeExample: ConceptWorkedExample;
  appliedCurrentExample: boolean;
  isFrozen: boolean;
  liveAccess: boolean;
  mode: WorkedExampleAccessMode;
  onApplyExampleState: (example: ConceptWorkedExample) => void;
  onFreezeToCurrentState: () => void;
  onReturnToLiveState: () => void;
  snapshot: ReturnType<typeof useLiveWorkedExampleSnapshot>;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function describeSnapshotSource(
  mode: WorkedExampleAccessMode,
  dependsOnTime: boolean | undefined,
  source: WorkedExampleSnapshot,
  t: ReturnType<typeof useTranslations<"LiveWorkedExampleSection">>,
) {
  const badges = [];

  if (dependsOnTime) {
    if (mode === "frozen") {
      badges.push(t("badges.frozenAt", { time: source.time.toFixed(2) }));
    } else if (source.timeSource === "inspect") {
      badges.push(t("badges.pausedAt", { time: source.time.toFixed(2) }));
    } else if (source.timeSource === "preview") {
      badges.push(t("badges.previewAt", { time: source.time.toFixed(2) }));
    } else {
      badges.push(t("badges.liveAt", { time: source.time.toFixed(2) }));
    }
  } else {
    badges.push(
      mode === "frozen"
        ? t("badges.usingFrozenParameters")
        : t("badges.followingCurrentParameters"),
    );
  }

  if (source.interactionMode === "compare" && source.activeCompareTarget) {
    badges.push(
      t("badges.usingSetup", { target: source.activeCompareTarget.toUpperCase() }),
    );
  }

  return badges;
}

function findExample(
  items: LiveWorkedExampleSectionProps["concept"]["sections"]["workedExamples"]["items"],
  id: string | null,
) {
  return items.find((item) => item.id === id) ?? items[0] ?? null;
}

const workedExampleTokenPattern = /\{\{[a-zA-Z0-9_-]+\}\}/;

function isStaticWorkedExample(example: ConceptWorkedExample) {
  return [
    example.prompt,
    ...example.steps.map((step) => step.template),
    example.resultTemplate,
    example.interpretationTemplate,
  ]
    .filter((template): template is string => Boolean(template))
    .every((template) => !workedExampleTokenPattern.test(template));
}

function isMissingWorkedExampleBuilderError(error: unknown) {
  return error instanceof Error && /Missing live worked-example builder/i.test(error.message);
}

function resolveStaticWorkedExample(example: ConceptWorkedExample): ResolvedWorkedExample {
  return {
    prompt: example.prompt,
    steps: example.steps.map((step) => ({
      id: step.id,
      label: step.label,
      content: step.template,
    })),
    resultLabel: example.resultLabel,
    resultContent: example.resultTemplate,
    interpretation: example.interpretationTemplate,
    variableValues: Object.fromEntries(
      example.variables.map((variable) => [variable.id, variable.valueKey]),
    ),
  };
}

function WorkedExampleSectionBody({
  concept,
  activeExample,
  appliedCurrentExample,
  isFrozen,
  liveAccess,
  mode,
  onApplyExampleState,
  onFreezeToCurrentState,
  onReturnToLiveState,
  snapshot,
}: WorkedExampleBodyProps) {
  const t = useTranslations("LiveWorkedExampleSection");
  const locale = useLocale();
  const resolved = useMemo(() => {
    if (!snapshot) {
      return null;
    }

    try {
      return resolveLiveWorkedExample(concept.slug, activeExample, snapshot, locale);
    } catch (error) {
      if (isMissingWorkedExampleBuilderError(error)) {
        const supplementalResolution = resolveSupplementalLiveWorkedExample(
          concept.slug,
          activeExample,
          snapshot,
        );

        if (supplementalResolution) {
          return supplementalResolution;
        }

        if (isStaticWorkedExample(activeExample)) {
          return resolveStaticWorkedExample(activeExample);
        }
      }

      throw error;
    }
  }, [activeExample, concept.slug, locale, snapshot]);

  const sourceBadges = snapshot
    ? describeSnapshotSource(mode, activeExample.dependsOnTime, snapshot, t)
    : [];

  if (!resolved || !snapshot) {
    return (
      <div className="pt-4">
        <div className="animate-pulse space-y-3" aria-label={t("loadingAria")}>
          <div className="flex flex-wrap gap-2">
            <div className="h-7 w-28 rounded-full bg-paper-strong" />
            <div className="h-7 w-36 rounded-full bg-paper-strong" />
          </div>
          <div className="h-8 w-3/4 rounded-2xl bg-paper-strong" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-24 rounded-[20px] border border-line bg-paper-strong"
              />
            ))}
          </div>
          <div className="h-28 rounded-[22px] border border-line bg-paper-strong" />
          <div className="h-24 rounded-[24px] border border-amber-500/25 bg-amber-500/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={joinClasses(
            "rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-[0.18em]",
            isFrozen
              ? "border-ink-950/20 bg-ink-950/8 text-ink-800"
              : "border-teal-500/25 bg-teal-500/10 text-teal-700",
          )}
        >
          {isFrozen ? t("badges.frozenValues") : t("badges.liveValues")}
        </span>
        {sourceBadges.map((badge) => (
          <span
            key={badge}
            className="rounded-full border border-line bg-paper-strong px-3 py-1 font-mono text-xs text-ink-600"
          >
            {badge}
          </span>
        ))}
        {liveAccess && appliedCurrentExample ? (
          <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 font-mono text-xs text-teal-700">
            {t("badges.exampleStateApplied")}
          </span>
        ) : null}
      </div>

      <RichMathText
        as="h3"
        content={resolved.prompt}
        className="mt-4 text-xl font-semibold text-ink-950"
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {activeExample.variables.map((variable) => {
          const linkedVariable = variable.variableId
            ? concept.variableLinks.find((item) => item.id === variable.variableId)
            : null;
          const tone = linkedVariable ? getVariableTone(linkedVariable.tone) : null;

          return (
            <div
              key={variable.id}
              className={joinClasses(
                "rounded-[20px] border px-4 py-3",
                tone ? `${tone.badge} ${tone.border}` : "border-line bg-paper-strong",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-white/65 bg-white/85 px-3 py-1 text-sm font-semibold text-ink-950">
                  <InlineFormula expression={variable.symbol} />
                </span>
                <span className="text-sm font-semibold text-ink-950">
                  {linkedVariable?.label ?? variable.label}
                </span>
              </div>
              <p className="mt-3 font-mono text-sm text-ink-800">
                {resolved.variableValues[variable.id] ?? t("notAvailable")}
                {variable.unit ? ` ${formatDisplayUnit(variable.unit)}` : ""}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 space-y-3">
        {resolved.steps.map((step) => (
          <div
            key={step.id}
            className="rounded-[22px] border border-line bg-paper-strong px-4 py-4"
          >
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-500">
              {step.label}
            </p>
            <RichMathText
              as="div"
              content={step.content}
              className="mt-2 text-sm leading-6 text-ink-800"
            />
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[24px] border border-amber-500/30 bg-amber-500/10 px-4 py-4">
        <p className="text-sm font-semibold text-ink-950">{resolved.resultLabel}</p>
        <RichMathText
          as="div"
          content={resolved.resultContent}
          className="mt-2 text-base font-semibold text-ink-950"
        />
        {resolved.interpretation ? (
          <RichMathText
            as="div"
            content={resolved.interpretation}
            className="mt-3 text-sm leading-6 text-ink-700"
          />
        ) : null}
      </div>

      {liveAccess ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {activeExample.applyAction ? (
            <button
              type="button"
              onClick={() => onApplyExampleState(activeExample)}
              className="inline-flex items-center justify-center rounded-full border border-teal-500/25 bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600"
            >
              {activeExample.applyAction.label ?? t("actions.applyExampleState")}
            </button>
          ) : null}
          {isFrozen ? (
            <button
              type="button"
              onClick={onReturnToLiveState}
              className="inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90"
            >
              {t("actions.useCurrentState")}
            </button>
          ) : (
            <button
              type="button"
              onClick={onFreezeToCurrentState}
              className="inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90"
            >
              {t("actions.lockCurrentValues")}
            </button>
          )}
        </div>
      ) : null}

      {liveAccess && activeExample.applyAction?.observationHint && appliedCurrentExample ? (
        <div className="mt-4 rounded-[22px] border border-teal-500/25 bg-teal-500/10 px-4 py-4">
          <p className="text-sm font-semibold text-ink-950">{t("observeNow")}</p>
          <RichMathText
            as="div"
            content={activeExample.applyAction.observationHint}
            className="mt-2 text-sm leading-6 text-ink-700"
          />
        </div>
      ) : null}
    </div>
  );
}

function FrozenWorkedExampleSectionBody(
  props: Omit<WorkedExampleBodyProps, "snapshot"> & {
    initialSnapshot: WorkedExampleSnapshot;
  },
) {
  const [snapshot] = useState(props.initialSnapshot);

  return <WorkedExampleSectionBody {...props} snapshot={snapshot} />;
}

export function LiveWorkedExampleSection({
  concept,
  mode = "live",
  sectionTitle,
}: LiveWorkedExampleSectionProps) {
  const t = useTranslations("LiveWorkedExampleSection");
  const { applyWorkedExampleAction, clearWorkedExampleAction } = useConceptLearningBridge();
  const liveSnapshot = useLiveWorkedExampleSnapshot();
  const liveAccess = mode === "live";
  const [activeExampleId, setActiveExampleId] = useState(
    concept.sections.workedExamples.items[0]?.id ?? null,
  );
  const [frozenSnapshot, setFrozenSnapshot] = useState<typeof liveSnapshot>(null);
  const [appliedExampleId, setAppliedExampleId] = useState<string | null>(null);

  const activeExample = findExample(concept.sections.workedExamples.items, activeExampleId);
  const activeExampleIndex = concept.sections.workedExamples.items.findIndex(
    (item) => item.id === activeExample?.id,
  );
  const liveModeSnapshot = frozenSnapshot ?? liveSnapshot;
  const isFrozen = !liveAccess || frozenSnapshot !== null;

  useEffect(() => () => clearWorkedExampleAction(), [clearWorkedExampleAction]);

  if (!activeExample) {
    return null;
  }

  const sectionLabel = liveAccess
    ? sectionTitle ?? concept.sections.workedExamples.title ?? t("sectionLabel.live")
    : t("sectionLabel.frozen");
  const heading = liveAccess
    ? t("heading.live")
    : t("heading.frozen");
  const appliedCurrentExample = appliedExampleId === activeExample.id;

  function freezeToCurrentState() {
    if (!liveAccess || !liveSnapshot) {
      return;
    }

    recordWorkedExampleEngaged({
      slug: concept.slug,
      title: concept.title,
    });
    setFrozenSnapshot(liveSnapshot);
  }

  function returnToLiveState() {
    if (!liveAccess) {
      return;
    }

    setFrozenSnapshot(null);
  }

  function applyExampleState(example: ConceptWorkedExample) {
    if (!liveAccess || !example.applyAction) {
      return;
    }

    recordWorkedExampleEngaged({
      slug: concept.slug,
      title: concept.title,
    });
    setFrozenSnapshot(null);
    applyWorkedExampleAction(example.applyAction);
    setAppliedExampleId(example.id);
  }

  return (
    <section className="lab-panel p-5 md:p-6">
      <div className="flex flex-col gap-3 border-b border-line pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <p className="lab-label">{sectionLabel}</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-950">{heading}</h2>
          </div>
          {liveAccess ? (
            <div className="inline-flex items-center rounded-full border border-line bg-paper-strong p-1">
              <button
                type="button"
                aria-pressed={!isFrozen}
                onClick={returnToLiveState}
                className={joinClasses(
                  "rounded-full px-3 py-1.5 text-sm font-semibold transition",
                  !isFrozen
                    ? "bg-teal-500 text-white"
                    : "text-ink-700 hover:bg-white/85",
                )}
              >
                {t("tabs.live")}
              </button>
              <button
                type="button"
                aria-pressed={isFrozen}
                onClick={freezeToCurrentState}
                disabled={!liveSnapshot}
                className={joinClasses(
                  "rounded-full px-3 py-1.5 text-sm font-semibold transition",
                  isFrozen
                    ? "bg-ink-950 text-white"
                    : "text-ink-700 hover:bg-white/85",
                  !liveSnapshot && "cursor-not-allowed opacity-45",
                )}
              >
                {t("tabs.frozen")}
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-900">
              {t("frozenWalkthrough")}
            </div>
          )}
        </div>
        {concept.sections.workedExamples.intro ? (
          <RichMathText
            as="div"
            content={concept.sections.workedExamples.intro}
            className="max-w-3xl text-sm leading-6 text-ink-700"
          />
        ) : null}
        {!liveAccess ? (
          <div className="rounded-[20px] border border-amber-500/25 bg-amber-500/10 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-3xl text-sm leading-6 text-ink-800">
                {t("premiumNotice.description")}
              </p>
              <Link
                href="/pricing#compare"
                className="inline-flex items-center justify-center rounded-full bg-ink-950 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition hover:opacity-90"
                style={{ color: "var(--paper-strong)" }}
              >
                {t("premiumNotice.action")}
              </Link>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {concept.sections.workedExamples.items.length > 1 ? (
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
              {t("progress.exampleCounter", {
                current: activeExampleIndex + 1,
                total: concept.sections.workedExamples.items.length,
              })}
            </span>
          ) : null}
          {concept.sections.workedExamples.items.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === activeExample.id}
              onClick={() => {
                recordWorkedExampleEngaged({
                  slug: concept.slug,
                  title: concept.title,
                });
                clearWorkedExampleAction();
                setAppliedExampleId(null);
                setActiveExampleId(item.id);
              }}
              className={joinClasses(
                "rounded-full border px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                item.id === activeExample.id
                  ? "border-teal-500/35 bg-teal-500 text-white"
                  : "border-line bg-paper-strong text-ink-700 hover:border-teal-500/35",
              )}
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>

      {liveAccess ? (
        <WorkedExampleSectionBody
          concept={concept}
          activeExample={activeExample}
          appliedCurrentExample={appliedCurrentExample}
          isFrozen={isFrozen}
          liveAccess={liveAccess}
          mode={mode}
          onApplyExampleState={applyExampleState}
          onFreezeToCurrentState={freezeToCurrentState}
          onReturnToLiveState={returnToLiveState}
          snapshot={liveModeSnapshot}
        />
      ) : liveSnapshot ? (
        <FrozenWorkedExampleSectionBody
          concept={concept}
          activeExample={activeExample}
          appliedCurrentExample={appliedCurrentExample}
          initialSnapshot={liveSnapshot}
          isFrozen={isFrozen}
          liveAccess={liveAccess}
          mode={mode}
          onApplyExampleState={applyExampleState}
          onFreezeToCurrentState={freezeToCurrentState}
          onReturnToLiveState={returnToLiveState}
        />
      ) : (
        <WorkedExampleSectionBody
          concept={concept}
          activeExample={activeExample}
          appliedCurrentExample={appliedCurrentExample}
          isFrozen={isFrozen}
          liveAccess={liveAccess}
          mode={mode}
          onApplyExampleState={applyExampleState}
          onFreezeToCurrentState={freezeToCurrentState}
          onReturnToLiveState={returnToLiveState}
          snapshot={null}
        />
      )}
    </section>
  );
}
