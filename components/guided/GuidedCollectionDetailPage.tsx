"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import type {
  GuidedCollectionChallengeStepSummary,
  GuidedCollectionSummary,
} from "@/lib/content";
import type { AppLocale } from "@/i18n/routing";
import {
  buildGuidedCollectionEntryDiagnostic,
  getGuidedCollectionProgressSummary,
  resolveAccountProgressSnapshot,
  type ProgressSnapshot,
  useProgressSnapshot,
} from "@/lib/progress";
import { LearningPathEntryDiagnosticPanel } from "@/components/progress/LearningPathEntryDiagnosticPanel";
import {
  buildGuidedCollectionShareTargets,
  guidedCollectionShareAnchorIds,
} from "@/lib/share-links";
import { PageSection } from "@/components/layout/PageSection";
import { DisclosurePanel } from "@/components/layout/DisclosurePanel";
import { ShareLinksPanel } from "@/components/share/ShareLinksPanel";
import { ConceptBundleBuilder } from "./ConceptBundleBuilder";
import { formatGuidedProgressDate } from "./dateFormatting";
import type { ResolvedGuidedCollectionConceptBundle } from "@/lib/guided/concept-bundles";

type GuidedCollectionDetailPageProps = {
  locale?: AppLocale;
  collection: GuidedCollectionSummary;
  initialSyncedSnapshot?: ProgressSnapshot | null;
  activeBundle?: ResolvedGuidedCollectionConceptBundle | null;
};

const accentTopClasses: Record<GuidedCollectionSummary["accent"], string> = {
  teal: "from-teal-500/70 via-teal-500/18 to-transparent",
  amber: "from-amber-500/70 via-amber-500/18 to-transparent",
  coral: "from-coral-500/70 via-coral-500/18 to-transparent",
  sky: "from-sky-500/70 via-sky-500/18 to-transparent",
  ink: "from-ink-950/70 via-ink-950/14 to-transparent",
};

const accentPanelClasses: Record<GuidedCollectionSummary["accent"], string> = {
  teal: "border-teal-500/20 bg-teal-500/10",
  amber: "border-amber-500/20 bg-amber-500/10",
  coral: "border-coral-500/20 bg-coral-500/10",
  sky: "border-sky-500/20 bg-sky-500/10",
  ink: "border-ink-950/15 bg-ink-950/5",
};

const stepStatusClasses = {
  completed: "border-teal-500/25 bg-teal-500/10 text-teal-700",
  "in-progress": "border-amber-500/25 bg-amber-500/10 text-amber-700",
  "not-started": "border-line bg-paper-strong text-ink-700",
} as const;

const challengeDepthClasses: Record<
  GuidedCollectionChallengeStepSummary["depth"],
  string
> = {
  "warm-up": "border-line bg-paper text-ink-600",
  core: "border-sky-500/20 bg-sky-500/10 text-sky-700",
  stretch: "border-coral-500/20 bg-coral-500/10 text-coral-700",
};

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

function localizeGuidedCollectionShareTargets(
  targets: ReturnType<typeof buildGuidedCollectionShareTargets>,
  locale: AppLocale,
) {
  return targets.map((target) => {
    switch (target.id) {
      case "guided-collection-page":
        return {
          ...target,
          label: copyText(locale, "Collection page", "集合頁面"),
          buttonLabel: copyText(locale, "Copy collection page link", "複製集合頁面連結"),
          shareLabel: copyText(locale, "Share collection page", "分享集合頁面"),
          copiedText: copyText(locale, "Copied collection page link", "已複製集合頁面連結"),
          sharedText: copyText(locale, "Shared collection page", "已分享集合頁面"),
          ariaLabel: copyText(locale, "Copy collection page link", "複製集合頁面連結"),
        };
      case "guided-collection-steps":
        return {
          ...target,
          label: copyText(locale, "Ordered steps", "排序步驟"),
          ariaLabel: copyText(locale, "Copy ordered steps link", "複製排序步驟連結"),
        };
      default:
        return target;
    }
  });
}

function getCollectionStatusLabel(
  status: ReturnType<typeof getGuidedCollectionProgressSummary>["status"],
  locale: AppLocale,
) {
  if (status === "completed") {
    return copyText(locale, "Completed", "已完成");
  }

  if (status === "in-progress") {
    return copyText(locale, "In progress", "進行中");
  }

  return copyText(locale, "Not started", "未開始");
}

function getStepKindLabel(
  step: GuidedCollectionSummary["steps"][number],
  locale: AppLocale,
) {
  switch (step.kind) {
    case "concept":
      return copyText(locale, "Concept", "概念");
    case "track":
      return copyText(locale, "Starter track", "入門路徑");
    case "challenge":
      return copyText(locale, "Challenge", "挑戰");
    case "surface":
      switch (step.surfaceKind) {
        case "topic":
          return copyText(locale, "Topic page", "主題頁");
        case "challenge-hub":
          return copyText(locale, "Open challenges", "打開挑戰");
        default:
          return copyText(locale, "Reference surface", "參考頁面");
      }
    default:
      return copyText(locale, "Step", "步驟");
  }
}

function getChallengeDepthLabel(
  depth: GuidedCollectionChallengeStepSummary["depth"],
  locale: AppLocale,
) {
  switch (depth) {
    case "warm-up":
      return copyText(locale, "Warm-up", "熱身");
    case "core":
      return copyText(locale, "Core", "核心");
    default:
      return copyText(locale, "Stretch", "延伸");
  }
}

function getCollectionFormatLabel(
  format: GuidedCollectionSummary["format"],
  locale: AppLocale,
) {
  return format === "lesson-set"
    ? copyText(locale, "Lesson set", "課程集")
    : copyText(locale, "Playlist", "播放清單");
}

function getCollectionProgressSummaryLine(
  progress: ReturnType<typeof getGuidedCollectionProgressSummary>,
  locale: AppLocale,
) {
  if (progress.status === "completed") {
    return copyText(
      locale,
      `Completed ${progress.completedStepCount} of ${progress.totalSteps} steps across ${progress.totalConcepts} concepts.`,
      `已完成 ${progress.totalSteps} 個步驟，涵蓋 ${progress.totalConcepts} 個概念。`,
    );
  }

  if (progress.status === "in-progress") {
    return copyText(
      locale,
      `${progress.completedStepCount} of ${progress.totalSteps} steps are complete, and the next authored step is ready to continue.`,
      `已完成 ${progress.completedStepCount} / ${progress.totalSteps} 個步驟，下一個作者編排好的步驟已準備好接續。`,
    );
  }

  return copyText(
    locale,
    `${progress.totalSteps} steps across ${progress.totalConcepts} concepts, with one clear first move.`,
    `共 ${progress.totalSteps} 個步驟、涵蓋 ${progress.totalConcepts} 個概念，而且第一步會保持清楚。`,
  );
}

function getStepMetaItems(
  step: GuidedCollectionSummary["steps"][number],
  locale: AppLocale,
) {
  const items: string[] = [];

  if (step.estimatedMinutes) {
    items.push(
      copyText(locale, `${step.estimatedMinutes} min`, `${step.estimatedMinutes} 分鐘`),
    );
  }

  switch (step.kind) {
    case "challenge":
      items.push(getChallengeDepthLabel(step.depth, locale));
      items.push(
        copyText(
          locale,
          `${step.checkCount} ${step.checkCount === 1 ? "check" : "checks"}`,
          `${step.checkCount} 個檢查`,
        ),
      );
      break;
    case "track":
      items.push(
        copyText(
          locale,
          `${step.track.concepts.length} concepts`,
          `${step.track.concepts.length} 個概念`,
        ),
      );
      if (step.track.checkpoints.length) {
        items.push(
          copyText(
            locale,
            `${step.track.checkpoints.length} checkpoints`,
            `${step.track.checkpoints.length} 個檢查點`,
          ),
        );
      }
      break;
    case "surface":
      items.push(
        copyText(
          locale,
          `${step.relatedConcepts.length} linked concepts`,
          `${step.relatedConcepts.length} 個相關概念`,
        ),
      );
      break;
    default:
      break;
  }

  return items.slice(0, 3);
}

export function GuidedCollectionDetailPage({
  locale = "en",
  collection,
  initialSyncedSnapshot = null,
  activeBundle = null,
}: GuidedCollectionDetailPageProps) {
  const localSnapshot = useProgressSnapshot();
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const usingSyncedSnapshot = progressDisplay.source !== "local";
  const progressSource: "local" | "synced" =
    progressDisplay.source === "local" ? "local" : "synced";
  const snapshot = progressDisplay.snapshot;
  const progress = getGuidedCollectionProgressSummary(snapshot, collection, locale);
  const entryDiagnostic = buildGuidedCollectionEntryDiagnostic(
    snapshot,
    collection,
    locale,
  );
  const shareTargets = localizeGuidedCollectionShareTargets(
    buildGuidedCollectionShareTargets(collection.slug, locale),
    locale,
  );
  const lastActiveLabel = formatGuidedProgressDate(
    progress.lastActivityAt,
    progressSource,
    locale,
  );
  const progressPercent = progress.totalSteps
    ? Math.round((progress.completedStepCount / progress.totalSteps) * 100)
    : 0;
  const nextStep = progress.status === "completed" ? null : progress.nextStep;
  const primaryAction = nextStep?.primaryAction ?? {
    href: `#${guidedCollectionShareAnchorIds.steps}`,
    label: copyText(locale, "Review ordered steps", "查看排序步驟"),
  };
  const entryDiagnosticEvidenceNote = usingSyncedSnapshot
    ? copyText(
        locale,
        "Uses the synced concept, challenge, and track facts already saved in the signed-in account.",
        "使用目前帳戶裡已同步保存的概念、挑戰與路徑進度事實。",
      )
    : copyText(
        locale,
        "Uses the same local-first concept, challenge, and track facts already saved in this browser.",
        "使用目前瀏覽器內已保存、以本機優先為主的概念、挑戰與路徑進度事實。",
      );
  const progressSummaryLine = getCollectionProgressSummaryLine(progress, locale);
  const stepNumberById = new Map(
    progress.stepProgress.map((item, index) => [item.step.id, index + 1]),
  );
  const completedSteps =
    progress.status === "completed"
      ? []
      : progress.stepProgress.filter((item) => item.status === "completed");
  const remainingSteps =
    progress.status === "completed"
      ? progress.stepProgress
      : progress.stepProgress.filter((item) => item.status !== "completed");
  const visibleRemainingSteps = remainingSteps.slice(0, 4);
  const hiddenRemainingSteps = remainingSteps.slice(4);
  const [bundleToolsOpen, setBundleToolsOpen] = useState(() => {
    if (activeBundle) {
      return true;
    }

    if (typeof window === "undefined") {
      return false;
    }

    const hash = window.location.hash.replace(/^#/, "");

    return (
      hash === guidedCollectionShareAnchorIds.bundle ||
      hash === "guided-collection-bundle-builder"
    );
  });

  useEffect(() => {
    function syncBundleToolsDisclosure() {
      const hash = window.location.hash.replace(/^#/, "");

      if (
        hash === guidedCollectionShareAnchorIds.bundle ||
        hash === "guided-collection-bundle-builder"
      ) {
        setBundleToolsOpen(true);
      }
    }
    window.addEventListener("hashchange", syncBundleToolsDisclosure);

    return () => {
      window.removeEventListener("hashchange", syncBundleToolsDisclosure);
    };
  }, []);

  const renderStepCard = (
    stepProgress: (typeof progress.stepProgress)[number],
    options: { highlightNext?: boolean } = {},
  ) => {
    const step = stepProgress.step;
    const isNextStep =
      options.highlightNext &&
      progress.status !== "completed" &&
      progress.nextStep?.step.id === step.id;
    const stepNumber = stepNumberById.get(step.id) ?? 1;
    const metaItems = getStepMetaItems(step, locale);

    return (
      <article
        className={[
          "list-row-card p-5 sm:p-6",
          isNextStep ? "border-ink-950/20 bg-paper-strong shadow-sm" : "",
        ].join(" ")}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink-950 text-sm font-semibold text-paper-strong">
                {stepNumber}
              </span>
              <span className="progress-pill text-sm">{getStepKindLabel(step, locale)}</span>
              <span
                className={[
                  "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
                  stepStatusClasses[stepProgress.status],
                ].join(" ")}
              >
                {getCollectionStatusLabel(stepProgress.status, locale)}
              </span>
              {isNextStep ? (
                <span className="rounded-full border border-ink-950/20 bg-ink-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-paper-strong">
                  {copyText(locale, "Next step", "下一步")}
                </span>
              ) : null}
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-ink-950 sm:text-2xl">
                {step.title}
              </h3>
              <p className="max-w-3xl text-base leading-7 text-ink-700">{step.summary}</p>
              <p className="max-w-3xl text-sm leading-6 text-ink-600">
                {stepProgress.note}
              </p>
            </div>

            {metaItems.length ? (
              <div className="flex flex-wrap gap-2">
                {metaItems.map((item) => (
                  <span
                    key={`${step.id}-${item}`}
                    className={[
                      "rounded-full border px-3 py-1 text-xs",
                      step.kind === "challenge" &&
                      item === getChallengeDepthLabel(step.depth, locale)
                        ? challengeDepthClasses[step.depth]
                        : "border-line bg-paper text-ink-700",
                    ].join(" ")}
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
            <Link
              href={stepProgress.primaryAction.href}
              className={isNextStep ? "cta-primary" : "cta-secondary"}
            >
              {stepProgress.primaryAction.label}
            </Link>
            {stepProgress.secondaryAction ? (
              <Link
                href={stepProgress.secondaryAction.href}
                className="motion-link inline-flex items-center text-sm font-medium text-ink-600 underline decoration-ink-300 underline-offset-4 hover:text-ink-950"
              >
                {stepProgress.secondaryAction.label}
              </Link>
            ) : null}
          </div>
        </div>
      </article>
    );
  };

  return (
    <section className="space-y-5 sm:space-y-6">
      <div className="hidden flex-wrap items-center gap-2 text-sm text-ink-600 sm:flex">
        <Link
          href="/"
          className="rounded-full border border-line bg-paper-strong px-3 py-1 transition-colors hover:border-ink-950/20 hover:text-ink-950"
        >
          {copyText(locale, "Home", "首頁")}
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href="/guided"
          className="rounded-full border border-line bg-paper-strong px-3 py-1 transition-colors hover:border-ink-950/20 hover:text-ink-950"
        >
          {copyText(locale, "Guided collections", "引導式集合")}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-ink-950">
          {collection.title}
        </span>
      </div>

      <PageSection id="guided-collection-overview" as="section" className="space-y-4">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(19rem,0.92fr)]">
          <article className="page-hero-surface relative overflow-hidden p-5 sm:p-6">
            <div
              className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[collection.accent]}`}
            />

            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="lab-label">{getCollectionFormatLabel(collection.format, locale)}</span>
                <span className="progress-pill text-sm">
                  {copyText(locale, `${collection.steps.length} steps`, `${collection.steps.length} 步`)}
                </span>
                <span className="progress-pill text-sm">
                  {copyText(locale, `${collection.conceptCount} concepts`, `${collection.conceptCount} 個概念`)}
                </span>
                {usingSyncedSnapshot ? (
                  <span className="progress-pill text-sm">
                    {copyText(locale, "Synced progress", "已同步進度")}
                  </span>
                ) : null}
              </div>

              <div className="space-y-3">
                <h1 className="max-w-4xl text-[2.15rem] font-semibold leading-[1.02] text-ink-950 sm:text-[2.7rem]">
                  {collection.title}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-ink-700 sm:text-lg sm:leading-8">
                  {collection.summary}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={primaryAction.href}
                    className="cta-primary"
                    data-testid="guided-detail-primary-cta"
                  >
                    {progress.status === "completed"
                      ? copyText(locale, "Review ordered steps", "查看排序步驟")
                      : primaryAction.label}
                  </Link>
                  <Link href="/guided" className="cta-secondary">
                    {copyText(locale, "Browse collections", "瀏覽集合")}
                  </Link>
                </div>
                <p className="hidden max-w-3xl text-sm leading-6 text-ink-600 sm:block sm:text-base sm:leading-7">
                  {collection.introduction}
                </p>
              </div>
            </div>
          </article>

          <aside className="page-band p-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="lab-label">
                  {usingSyncedSnapshot
                    ? copyText(locale, "Synced guided progress", "已同步引導進度")
                    : copyText(locale, "Local guided progress", "本機引導進度")}
                </p>
                <h2 className="text-2xl font-semibold text-ink-950">
                  {progress.status === "completed"
                    ? copyText(locale, "This path is complete.", "這條路徑已完成。")
                    : copyText(locale, "Keep the next guided move obvious.", "讓下一個引導步驟保持清楚。")}
                </h2>
                <p className="text-base leading-7 text-ink-700">{progressSummaryLine}</p>
              </div>

              <div className={`rounded-[24px] border p-4 ${accentPanelClasses[collection.accent]}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-semibold text-ink-950">
                    {copyText(locale, "Collection progress", "集合進度")}
                  </span>
                  <span className="text-ink-600">
                    {progress.completedStepCount} / {progress.totalSteps}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-strong">
                  <div
                    className="h-full rounded-full bg-ink-950 transition-[width]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="progress-pill text-sm">
                    {getCollectionStatusLabel(progress.status, locale)}
                  </span>
                  {lastActiveLabel ? (
                    <span className="progress-pill text-sm">
                      {copyText(locale, `Last active ${lastActiveLabel}`, `最近活動：${lastActiveLabel}`)}
                    </span>
                  ) : null}
                </div>
              </div>

            </div>
          </aside>
        </section>

        <DisclosurePanel
          title={copyText(locale, "About this guided path", "關於這條引導路徑")}
          summary={copyText(
            locale,
            "Open the authored rationale, highlights, and educator framing only when you need more context than the next step.",
            "只有當你需要比「下一步」更多的背景時，再展開作者編排原因、重點和教學提示。",
          )}
        >
          <div className="space-y-4">
            <p className="text-base leading-7 text-ink-700">{collection.sequenceRationale}</p>

            {collection.highlights.length ? (
              <div className="flex flex-wrap gap-2">
                {collection.highlights.slice(0, 4).map((item) => (
                  <span key={item} className="progress-pill text-sm">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}

            {collection.educatorNote ? (
              <div className={`page-band p-5 ${accentPanelClasses[collection.accent]}`}>
                <p className="lab-label">{copyText(locale, "Educator note", "教學提示")}</p>
                <p className="mt-3 text-base leading-7 text-ink-700">{collection.educatorNote}</p>
              </div>
            ) : null}
          </div>
        </DisclosurePanel>
      </PageSection>

      <PageSection
        id={guidedCollectionShareAnchorIds.steps}
        as="section"
        className="space-y-5"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="lab-label">{copyText(locale, "Guided path", "引導路徑")}</p>
            <h2 className="text-2xl font-semibold text-ink-950">
              {copyText(locale, "Follow the next steps in one authored order.", "按照作者排好的順序往下走。")}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-ink-700">
              {copyText(
                locale,
                "Each step still opens an existing topic page, concept bench, track, or challenge. This page only keeps the authored order legible.",
                "每一步都還是打開既有的主題頁、概念工作台、入門路徑或挑戰；這一頁只負責把作者編排好的順序講清楚。",
              )}
            </p>
          </div>
          <p className="text-sm text-ink-600">{progressSummaryLine}</p>
        </div>

        {nextStep ? (
          <article className={`feature-card p-5 ${accentPanelClasses[collection.accent]}`}>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="lab-label">{copyText(locale, "Next step", "下一步")}</span>
                <span className="progress-pill text-sm">
                  {getStepKindLabel(nextStep.step, locale)}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-ink-950">{nextStep.step.title}</h3>
              <p className="max-w-3xl text-sm leading-6 text-ink-700">
                {nextStep.step.purpose || nextStep.note}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href={nextStep.primaryAction.href} className="cta-primary">
                  {nextStep.primaryAction.label}
                </Link>
                {nextStep.secondaryAction ? (
                  <Link
                    href={nextStep.secondaryAction.href}
                    className="motion-link inline-flex items-center text-sm font-medium text-ink-600 underline decoration-ink-300 underline-offset-4 hover:text-ink-950"
                  >
                    {nextStep.secondaryAction.label}
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        ) : null}

        <ol className="grid gap-4">
          {visibleRemainingSteps.map((stepProgress) => (
            <li key={stepProgress.step.id}>{renderStepCard(stepProgress, { highlightNext: true })}</li>
          ))}
        </ol>

        {hiddenRemainingSteps.length ? (
          <details className="rounded-[22px] border border-line bg-paper px-4 py-3">
            <summary className="cursor-pointer list-none text-sm font-semibold text-ink-900">
              {copyText(
                locale,
                `Show ${hiddenRemainingSteps.length} later steps`,
                `顯示另外 ${hiddenRemainingSteps.length} 個後續步驟`,
              )}
            </summary>
            <ol className="mt-4 grid gap-4">
              {hiddenRemainingSteps.map((stepProgress) => (
                <li key={stepProgress.step.id}>{renderStepCard(stepProgress)}</li>
              ))}
            </ol>
          </details>
        ) : null}

        {completedSteps.length ? (
          <details className="rounded-[22px] border border-line bg-paper px-4 py-3">
            <summary className="cursor-pointer list-none text-sm font-semibold text-ink-900">
              {copyText(
                locale,
                `Show ${completedSteps.length} completed steps`,
                `顯示已完成的 ${completedSteps.length} 個步驟`,
              )}
            </summary>
            <ol className="mt-4 grid gap-4">
              {completedSteps.map((stepProgress) => (
                <li key={stepProgress.step.id}>{renderStepCard(stepProgress)}</li>
              ))}
            </ol>
          </details>
        ) : null}
      </PageSection>

      {entryDiagnostic ? (
        <PageSection id="guided-collection-entry-diagnostic" as="div">
          <DisclosurePanel
            title={copyText(locale, "Check your starting point", "檢查你的起點")}
            summary={copyText(
              locale,
              "Open the diagnostic only when you need help deciding whether to continue, restart, or skip ahead inside this path.",
              "只有當你需要判斷應該繼續、重來，還是往前跳時，再展開這個起點診斷。",
            )}
          >
            <LearningPathEntryDiagnosticPanel
              diagnostic={entryDiagnostic}
              evidenceNote={entryDiagnosticEvidenceNote}
            />
          </DisclosurePanel>
        </PageSection>
      ) : null}

      <PageSection id="guided-collection-bundle-builder" as="div">
        <details
          open={bundleToolsOpen}
          onToggle={(event) =>
            setBundleToolsOpen((event.currentTarget as HTMLDetailsElement).open)
          }
          className="group rounded-[28px] border border-line bg-paper-strong/96 p-5 shadow-surface sm:p-6"
        >
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0 space-y-2">
              <p className="lab-label">{copyText(locale, "Path tools", "路徑工具")}</p>
              <p className="text-xl font-semibold text-ink-950 sm:text-2xl">
                {copyText(locale, "Share or assign this path", "分享或指派這條路徑")}
              </p>
              <p className="max-w-2xl text-base leading-7 text-ink-700">
                {copyText(
                  locale,
                  "Copy a stable collection link or save a compact bundle only when you need to relaunch or share the sequence elsewhere.",
                  "只有當你需要重新打開這條順序，或把它分享給別人時，再複製穩定的集合連結或保存精簡組合包。",
                )}
              </p>
            </div>
            <span
              aria-hidden="true"
              className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-base font-semibold text-ink-500 transition-transform group-open:rotate-90"
            >
              &gt;
            </span>
          </summary>

          <div className="mt-5 space-y-4">
            <ShareLinksPanel
              items={shareTargets}
              pageTitle={collection.title}
              title={copyText(locale, "Share this collection", "分享這個集合")}
              description={copyText(
                locale,
                "Copy a stable collection link. Links stay public and never include saved progress or private account state.",
                "複製穩定的集合連結。連結會保持公開，不會包含已保存進度或私人帳戶狀態。",
              )}
              variant="compact"
            />
            <ConceptBundleBuilder
              locale={locale}
              collection={collection}
              snapshot={snapshot}
              usingSyncedSnapshot={usingSyncedSnapshot}
              activeBundle={activeBundle}
            />
          </div>
        </details>
      </PageSection>
    </section>
  );
}
