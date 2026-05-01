"use client";

import { Link } from "@/i18n/navigation";
import { Fragment } from "react";
import { useTranslations } from "next-intl";
import type { StarterTrackSummary } from "@/lib/content";
import type { AppLocale } from "@/i18n/routing";
import { trackLearningEvent } from "@/lib/analytics";
import { translateChallengeCueLabel } from "@/lib/i18n/challenge-ui";
import {
  getConceptDisplayHighlights,
  getConceptDisplaySummary,
  getConceptDisplayTitle,
  getStarterTrackDisplayHighlights,
  getStarterTrackDisplaySummary,
  getStarterTrackDisplayTitle,
  getTopicDisplayTitleFromValue,
} from "@/lib/i18n/content";
import {
  buildStarterTrackEntryDiagnostic,
  buildPrerequisiteTrackRecommendations,
  getChallengeProgressState,
  getConceptProgressRecord,
  getStarterTrackPrimaryAction,
  getStarterTrackProgressSummary,
  getStarterTrackRecapSummary,
  resolveAccountProgressSnapshot,
  type ChallengeProgressState,
  type ProgressSnapshot,
  type StarterTrackRecapFocusKind,
  useProgressSnapshot,
  useProgressSnapshotReady,
} from "@/lib/progress";
import {
  buildTrackCompletionHref,
  buildTrackRecapHref,
  buildTrackShareTargets,
  trackShareAnchorIds,
} from "@/lib/share-links";
import { formatProgressMonthDay } from "@/components/progress/dateFormatting";
import { MasteryStateBadge } from "@/components/progress/MasteryStateBadge";
import { LearningPathEntryDiagnosticPanel } from "@/components/progress/LearningPathEntryDiagnosticPanel";
import { ProgressStatusBadge } from "@/components/progress/ProgressStatusBadge";
import { PageSection } from "@/components/layout/PageSection";
import { DisclosurePanel } from "@/components/layout/DisclosurePanel";
import { ShareLinksPanel } from "@/components/share/ShareLinksPanel";
import { ConceptLearningSurfaceTestCta } from "@/components/tests/ConceptLearningSurfaceTestCta";
import { StarterTrackRecommendationList } from "./StarterTrackRecommendationList";

type StarterTrackViewMode = "guided" | "recap";

type StarterTrackDetailPageProps = {
  locale?: AppLocale;
  track: StarterTrackSummary;
  prerequisiteTracks?: StarterTrackSummary[];
  subjectPages?: Array<{ title: string; path: string }>;
  initialMode?: StarterTrackViewMode;
  initialSyncedSnapshot?: ProgressSnapshot | null;
};

const accentPanelClasses: Record<StarterTrackSummary["accent"], string> = {
  teal: "border-teal-500/25 bg-teal-500/10",
  amber: "border-amber-500/25 bg-amber-500/10",
  coral: "border-coral-500/25 bg-coral-500/10",
  sky: "border-sky-500/25 bg-sky-500/10",
  ink: "border-ink-950/15 bg-ink-950/5",
};

const accentTopClasses: Record<StarterTrackSummary["accent"], string> = {
  teal: "from-teal-500/70 via-teal-500/18 to-transparent",
  amber: "from-amber-500/70 via-amber-500/18 to-transparent",
  coral: "from-coral-500/70 via-coral-500/18 to-transparent",
  sky: "from-sky-500/70 via-sky-500/18 to-transparent",
  ink: "from-ink-950/70 via-ink-950/18 to-transparent",
};

const recapFocusClasses: Record<StarterTrackRecapFocusKind, string> = {
  priority: "border-coral-500/25 bg-coral-500/10 text-coral-700",
  next: "border-ink-950/20 bg-ink-950 text-paper-strong",
  active: "border-teal-500/25 bg-teal-500/10 text-teal-700",
  solid: "border-sky-500/25 bg-sky-500/10 text-sky-700",
  ahead: "border-line bg-paper text-ink-600",
};

const challengeDepthLabels = {
  "warm-up": "Warm-up",
  core: "Core",
  stretch: "Stretch",
} as const;

const challengeDepthClasses = {
  "warm-up": "border-line bg-paper text-ink-600",
  core: "border-sky-500/20 bg-sky-500/10 text-sky-700",
  stretch: "border-coral-500/20 bg-coral-500/10 text-coral-700",
} as const;

const challengeProgressClasses: Record<ChallengeProgressState, string> = {
  solved: "border-teal-500/25 bg-teal-500/10 text-teal-700",
  started: "border-amber-500/25 bg-amber-500/10 text-amber-700",
  "to-try": "border-line bg-paper text-ink-600",
};

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

function localizeTrackShareTargets(
  targets: ReturnType<typeof buildTrackShareTargets>,
  locale: AppLocale,
) {
  return targets.map((target) => {
    switch (target.id) {
      case "track-page":
        return {
          ...target,
          label: copyText(locale, "Track page", "路徑頁面"),
          buttonLabel: copyText(locale, "Copy track page link", "複製路徑頁面連結"),
          shareLabel: copyText(locale, "Share track page", "分享路徑頁面"),
          copiedText: copyText(locale, "Copied track page link", "已複製路徑頁面連結"),
          sharedText: copyText(locale, "Shared track page", "已分享路徑頁面"),
          ariaLabel: copyText(locale, "Copy track page link", "複製路徑頁面連結"),
        };
      case "guided-path":
        return {
          ...target,
          label: copyText(locale, "Guided path", "引導路徑"),
          ariaLabel: copyText(locale, "Copy guided path link", "複製引導路徑連結"),
        };
      case "track-recap":
        return {
          ...target,
          label: copyText(locale, "Recap mode", "重溫模式"),
          ariaLabel: copyText(locale, "Copy recap mode link", "複製重溫模式連結"),
        };
      default:
        return target;
    }
  });
}

function getChallengeProgressLabel(
  state: ChallengeProgressState,
  progressSource: "local" | "synced",
  locale: AppLocale,
) {
  if (state === "solved") {
    return progressSource === "synced"
      ? copyText(locale, "Solved in sync", "已在同步進度中解開")
      : copyText(locale, "Solved locally", "已在本機解開");
  }

  if (state === "started") {
    return progressSource === "synced"
      ? copyText(locale, "Started in sync", "已在同步進度中開始")
      : copyText(locale, "Started locally", "已在本機開始");
  }

  return copyText(locale, "Not started", "未開始");
}

function scopeTrackProgressCopy(
  value: string,
  progressSource: "local" | "synced",
) {
  if (progressSource === "local") {
    return value;
  }

  return value
    .replaceAll("on this browser yet", "in your synced account yet")
    .replaceAll("on this browser", "in your synced account")
    .replaceAll("already saved in this browser", "already saved in your synced account")
    .replaceAll("local-first", "synced")
    .replaceAll("Local progress", "Synced progress")
    .replaceAll("local progress", "synced progress");
}

function getTrackStatusLabel(
  status: ReturnType<typeof getStarterTrackProgressSummary>["status"],
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

function getConceptLabel(title: Pick<StarterTrackSummary["concepts"][number], "shortTitle" | "title">) {
  return title.shortTitle ?? title.title;
}

function getCheckpointStatusLabel(
  status: ReturnType<typeof getStarterTrackProgressSummary>["checkpointProgress"][number]["status"],
  locale: AppLocale,
) {
  if (status === "completed") {
    return copyText(locale, "Checkpoint cleared", "檢查點已完成");
  }

  if (status === "ready") {
    return copyText(locale, "Checkpoint ready", "檢查點已就緒");
  }

  return copyText(locale, "Locked", "尚未解鎖");
}

function getCheckpointStatusClasses(
  status: ReturnType<typeof getStarterTrackProgressSummary>["checkpointProgress"][number]["status"],
) {
  if (status === "completed") {
    return "border-teal-500/25 bg-teal-500/10 text-teal-700";
  }

  if (status === "ready") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700";
  }

  return "border-line bg-paper text-ink-600";
}

function getCheckpointBridgeText(
  track: StarterTrackSummary,
  checkpoint: StarterTrackSummary["checkpoints"][number],
  locale: AppLocale,
) {
  const nextConcept = track.concepts[checkpoint.stepIndex + 1];
  const afterConceptTitle = getConceptDisplayTitle(checkpoint.afterConcept, locale);
  const nextConceptTitle = nextConcept
    ? getConceptDisplayTitle(nextConcept, locale)
    : null;

  if (nextConceptTitle) {
    return copyText(
      locale,
      `Pause here after ${afterConceptTitle} before moving into ${nextConceptTitle}.`,
      `完成 ${afterConceptTitle} 後先在這裡停一停，再進入 ${nextConceptTitle}。`,
    );
  }

  return copyText(
    locale,
    `Final checkpoint that closes the authored track after ${afterConceptTitle}.`,
    `這是完成 ${afterConceptTitle} 後、用來收束這條作者編排路徑的最後檢查點。`,
  );
}

function getStepBridgeText(track: StarterTrackSummary, index: number, locale: AppLocale) {
  const previousConcept = track.concepts[index - 1];
  const nextConcept = track.concepts[index + 1];
  const previousConceptTitle = previousConcept
    ? getConceptDisplayTitle(previousConcept, locale)
    : null;
  const nextConceptTitle = nextConcept
    ? getConceptDisplayTitle(nextConcept, locale)
    : null;

  if (!previousConceptTitle && nextConceptTitle) {
    return copyText(locale, `Start here before moving into ${nextConceptTitle}.`, `先從這裡開始，再進入 ${nextConceptTitle}。`);
  }

  if (previousConceptTitle && nextConceptTitle) {
    return copyText(locale, `Builds on ${previousConceptTitle} before setting up ${nextConceptTitle}.`, `先建立在 ${previousConceptTitle} 之上，再為 ${nextConceptTitle} 做好準備。`);
  }

  if (previousConceptTitle) {
    return copyText(locale, `Capstone step after ${previousConceptTitle}.`, `這是接在 ${previousConceptTitle} 之後的收束步驟。`);
  }

  return copyText(locale, "Single-step track.", "單一步驟路徑。");
}

function getStepActionLabel(
  isTarget: boolean,
  status: ReturnType<typeof getStarterTrackProgressSummary>["status"],
  conceptStatus: ReturnType<typeof getStarterTrackProgressSummary>["conceptProgress"][number]["status"],
  locale: AppLocale,
) {
  if (status === "completed" && isTarget) {
    return copyText(locale, "Review from here", "從這裡開始重溫");
  }

  if (isTarget) {
    return status === "not-started"
      ? copyText(locale, "Start concept", "開始概念")
      : copyText(locale, "Continue concept", "繼續概念");
  }

  if (conceptStatus === "completed") {
    return copyText(locale, "Review concept", "重溫概念");
  }

  return copyText(locale, "Open concept", "打開概念");
}

function getDifficultyLabel(difficulty: string, locale: AppLocale) {
  switch (difficulty.trim().toLowerCase()) {
    case "intro":
      return copyText(locale, "Intro", "入門");
    case "intermediate":
      return copyText(locale, "Intermediate", "中階");
    case "advanced":
      return copyText(locale, "Advanced", "進階");
    default:
      return difficulty;
  }
}

function getTrackViewHref(trackSlug: string, mode: StarterTrackViewMode) {
  return mode === "recap" ? buildTrackRecapHref(trackSlug) : `/tracks/${trackSlug}`;
}

export function StarterTrackDetailPage({
  locale = "en",
  track,
  prerequisiteTracks = [],
  subjectPages = [],
  initialMode = "guided",
  initialSyncedSnapshot = null,
}: StarterTrackDetailPageProps) {
  const challengeUi = useTranslations("ChallengeUi");
  const localSnapshot = useProgressSnapshot();
  const progressReady = useProgressSnapshotReady();
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const usingSyncedSnapshot = progressDisplay.source !== "local";
  const progressSource: "local" | "synced" =
    progressDisplay.source === "local" ? "local" : "synced";
  const snapshot = progressDisplay.snapshot;
  const progress = getStarterTrackProgressSummary(snapshot, track, locale);
  const recap = getStarterTrackRecapSummary(track, progress, locale);
  const primaryAction = getStarterTrackPrimaryAction(track, progress, locale);
  const lastActiveLabel = formatProgressMonthDay(
    progress.lastActivityAt,
    progressSource,
  );
  const progressPercent = progress.totalFlowCount
    ? Math.round((progress.completedFlowCount / progress.totalFlowCount) * 100)
    : 0;
  const prerequisiteRecommendations = buildPrerequisiteTrackRecommendations(
    snapshot,
    track,
    prerequisiteTracks,
    locale,
  );
  const entryDiagnostic = buildStarterTrackEntryDiagnostic(
    snapshot,
    track,
    prerequisiteTracks,
    locale,
  );
  const shareTargets = localizeTrackShareTargets(
    buildTrackShareTargets(track.slug, locale),
    locale,
  );
  const displayTrackTitle = getStarterTrackDisplayTitle(track, locale);
  const displayTrackSummary = getStarterTrackDisplaySummary(track, locale);
  const displayTrackHighlights = getStarterTrackDisplayHighlights(track, locale);
  const completionHref = buildTrackCompletionHref(track.slug);
  const isRecapMode = initialMode === "recap";
  const guidedPrimaryHref = progress.status === "completed" ? completionHref : primaryAction.href;
  const guidedPrimaryLabel =
    progress.status === "completed"
      ? copyText(locale, "Open completion page", "打開完成頁面")
      : primaryAction.label;
  const guidedPrimaryNote =
    progress.status === "completed"
      ? track.checkpoints.length
        ? usingSyncedSnapshot
          ? "You have completed every concept and cleared every checkpoint in this track in your synced account. Use the completion page for a compact reflection, then drop back into recap or concept review when you want."
          : "You have completed every concept and cleared every checkpoint in this track on this browser. Use the completion page for a compact reflection, then drop back into recap or concept review when you want."
        : usingSyncedSnapshot
          ? "You have completed every concept in this track in your synced account. Use the completion page for a compact reflection, then drop back into recap or concept review when you want."
          : "You have completed every concept in this track on this browser. Use the completion page for a compact reflection, then drop back into recap or concept review when you want."
      : primaryAction.note;
  const heroSecondaryHref = isRecapMode
    ? `/tracks/${track.slug}`
    : getTrackViewHref(track.slug, "recap");
  const heroSecondaryLabel = isRecapMode
    ? copyText(locale, "Open full track", "打開完整路徑")
    : copyText(locale, "Use recap mode", "使用重溫模式");
  const primaryTargetConceptSlug = primaryAction.targetConcept?.slug ?? track.concepts[0]?.slug ?? null;
  const checkpointNumberById = new Map(
    progress.checkpointProgress.map((item, index) => [item.checkpoint.id, index + 1]),
  );
  const entryDiagnosticEvidenceNote = usingSyncedSnapshot
    ? copyText(locale, "Uses the synced quick tests, checkpoint challenges, and track history already saved in your account.", "使用你帳戶中已同步保存的快速測驗、檢查點挑戰和路徑紀錄。")
    : copyText(locale, "Uses the same local-first quick tests, checkpoint challenges, and track history already saved in this browser.", "使用這個瀏覽器中已保存、以本機優先為主的快速測驗、檢查點挑戰和路徑紀錄。");
  const primarySubjectPage = subjectPages.length === 1 ? subjectPages[0] : null;
  const progressSummaryText = isRecapMode
    ? copyText(
        locale,
        `${recap.priorityCount} revisit now, ${recap.activeCount} active, ${recap.solidCount} solid, ${recap.aheadCount} already ahead.`,
        `${recap.priorityCount} 個需要立即重溫，${recap.activeCount} 個進行中，${recap.solidCount} 個穩固，${recap.aheadCount} 個已走在前面。`,
      )
    : track.checkpoints.length
      ? copyText(
          locale,
          `${progress.completedCount} of ${progress.totalConcepts} concepts and ${progress.completedCheckpointCount} of ${progress.totalCheckpoints} checkpoints complete.`,
          `${progress.completedCount} / ${progress.totalConcepts} 個概念與 ${progress.completedCheckpointCount} / ${progress.totalCheckpoints} 個檢查點已完成。`,
        )
      : copyText(
          locale,
          `${progress.completedCount} of ${progress.totalConcepts} concepts complete.`,
          `${progress.completedCount} / ${progress.totalConcepts} 個概念已完成。`,
        );
  const progressBreakdownSummary = isRecapMode
    ? copyText(
        locale,
        "Open the recap breakdown when you need the detailed revisit counts.",
        "當你需要更詳細的重溫計數時，再展開重溫細節。",
      )
    : copyText(
        locale,
        "Open the detailed counts only when you need the full track breakdown.",
        "只有當你需要完整的路徑細項時，再展開詳細計數。",
      );

  function trackTrackEngagement(source: string, targetConceptSlug: string | null) {
    if (!targetConceptSlug) {
      return;
    }

    const action =
      progress.status === "completed"
        ? "review"
        : progress.status === "not-started"
          ? "start"
          : "continue";

    trackLearningEvent(
      progress.status === "not-started" ? "track_started" : "track_continued",
      {
        pagePath: `/tracks/${track.slug}`,
        pageTitle: displayTrackTitle,
        pageKind: "track",
        trackSlug: track.slug,
        trackTitle: displayTrackTitle,
        status: progress.status,
        action,
        targetConceptSlug,
        source,
      },
    );
  }

  return (
    <section className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-600">
        <Link
          href="/"
          className="rounded-full border border-line bg-paper-strong px-3 py-1 transition-colors hover:border-ink-950/20 hover:text-ink-950"
        >
          {copyText(locale, "Home", "首頁")}
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href="/concepts"
          className="rounded-full border border-line bg-paper-strong px-3 py-1 transition-colors hover:border-ink-950/20 hover:text-ink-950"
        >
          {copyText(locale, "Concepts", "概念庫")}
        </Link>
        {primarySubjectPage ? (
          <>
            <span aria-hidden="true">/</span>
            <Link
              href={primarySubjectPage.path}
              className="rounded-full border border-line bg-paper-strong px-3 py-1 transition-colors hover:border-ink-950/20 hover:text-ink-950"
            >
              {primarySubjectPage.title}
            </Link>
          </>
        ) : null}
        <span aria-hidden="true">/</span>
        <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-ink-950">
          {displayTrackTitle}
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="lab-label">
            {isRecapMode
              ? copyText(locale, "Track recap", "路徑重溫")
              : copyText(locale, "Starter track", "入門路徑")}
          </p>
          <p className="hidden text-sm leading-6 text-ink-700 sm:block">
            {scopeTrackProgressCopy(
              isRecapMode
                ? copyText(locale, "Compact review built from the authored track order and the same local-first concept progress already saved in this browser.", "根據作者編排的路徑順序，以及這個瀏覽器中已保存、以本機優先為主的概念進度而建立的精簡重溫。")
                : copyText(locale, "Follow the authored sequence, or switch to recap mode for a faster review of the same path.", "按照作者編排的順序前進，或切換到重溫模式，以更快方式回看同一路徑。"),
              progressSource,
            )}
          </p>
        </div>
        <div
          className="inline-flex rounded-full border border-line bg-paper-strong p-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink-600"
          role="tablist"
          aria-label={copyText(locale, "Track view mode", "路徑檢視模式")}
        >
          <Link
            href={getTrackViewHref(track.slug, "guided")}
            role="tab"
            aria-selected={!isRecapMode}
            className={[
              "rounded-full px-3 py-1.5 transition",
              !isRecapMode ? "bg-teal-500 text-white shadow-sm" : "hover:text-ink-900",
            ].join(" ")}
          >
            {copyText(locale, "Full track", "完整路徑")}
          </Link>
          <Link
            href={getTrackViewHref(track.slug, "recap")}
            role="tab"
            aria-selected={isRecapMode}
            className={[
              "rounded-full px-3 py-1.5 transition",
              isRecapMode ? "bg-teal-500 text-white shadow-sm" : "hover:text-ink-900",
            ].join(" ")}
          >
            {copyText(locale, "Recap mode", "重溫模式")}
          </Link>
        </div>
      </div>

      <PageSection id="track-overview" as="div" className="grid gap-4 lg:grid-cols-[1.06fr_0.94fr] xl:grid-cols-[1.12fr_0.88fr]">
        <article className="page-hero-surface relative overflow-hidden p-5 sm:p-6">
          <div
            className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[track.accent]}`}
          />

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="lab-label">
                {isRecapMode
                  ? copyText(locale, "Track recap", "路徑重溫")
                  : copyText(locale, "Starter track", "入門路徑")}
              </span>
              <span className="progress-pill text-sm">
                {copyText(
                  locale,
                  `${track.estimatedStudyMinutes} min`,
                  `${track.estimatedStudyMinutes} 分鐘`,
                )}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[2.15rem] font-semibold leading-[0.98] text-ink-950 sm:text-[3rem]">
                  {displayTrackTitle}
                </h1>
                {usingSyncedSnapshot ? (
                  <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                    {copyText(locale, "Synced across devices", "跨裝置同步")}
                  </span>
                ) : null}
                <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-600">
                  {getTrackStatusLabel(progress.status, locale)}
                </span>
                {lastActiveLabel ? (
                  <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-600">
                    {copyText(locale, `Last active ${lastActiveLabel}`, `最近活動 ${lastActiveLabel}`)}
                  </span>
                ) : null}
              </div>
              <div className="order-1 flex flex-wrap gap-3 pt-1">
                <Link
                  href={isRecapMode ? recap.primaryStep?.action.href ?? primaryAction.href : guidedPrimaryHref}
                  onClick={
                    isRecapMode
                      ? () =>
                          trackTrackEngagement(
                            "track-recap-primary-action",
                            recap.primaryStep?.concept.slug ?? primaryTargetConceptSlug,
                          )
                      : progress.status === "completed"
                        ? undefined
                        : () =>
                            trackTrackEngagement(
                              "track-primary-action",
                              primaryTargetConceptSlug,
                            )
                  }
                  className="cta-primary"
                  data-testid="track-primary-cta"
                >
                  {isRecapMode
                    ? recap.primaryStep?.action.label ?? copyText(locale, "Open recap", "æ‰“é–‹é‡æº«")
                    : guidedPrimaryLabel}
                </Link>
                <Link href={heroSecondaryHref} className="cta-secondary">
                  {heroSecondaryLabel}
                </Link>
              </div>
              <p className="order-2 max-w-3xl overflow-hidden text-base leading-6 text-ink-800 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4] sm:text-lg sm:leading-8 sm:[display:block] sm:[-webkit-line-clamp:unset]">{displayTrackSummary}</p>
              <p className="order-3 hidden max-w-3xl text-base leading-7 text-ink-700 sm:block">
                {scopeTrackProgressCopy(isRecapMode ? recap.intro : track.introduction, progressSource)}
              </p>
            </div>

            <div className="hidden flex-wrap gap-2 sm:flex">
              {displayTrackHighlights.slice(0, 2).map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-700"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </article>

        <aside className="page-band p-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="lab-label">
                {isRecapMode
                  ? copyText(locale, "Fast review", "快速重溫")
                  : usingSyncedSnapshot
                    ? copyText(locale, "Synced track progress", "同步路徑進度")
                    : copyText(locale, "Local track progress", "本機路徑進度")}
              </p>
              <h2 className="text-2xl font-semibold text-ink-950">
                {isRecapMode
                  ? copyText(locale, "Review the important ideas fast.", "快速重溫重要概念。")
                  : copyText(locale, "Keep the path moving in sequence.", "按順序推進這條路徑。")}
              </h2>
              <p className="hidden text-sm leading-6 text-ink-700 sm:block">
                {isRecapMode
                  ? usingSyncedSnapshot
                    ? copyText(locale, "Recap mode is derived from the current track order, synced mastery state, quick-test misses, solved challenges, and last activity already saved in your account.", "重溫模式會根據目前路徑順序、你帳戶中已同步保存的掌握狀態、快速測驗失分、已解挑戰和最近活動來整理。")
                    : copyText(locale, "Recap mode is derived from the current track order, local mastery state, quick-test misses, solved challenges, and last activity already saved on this browser.", "重溫模式會根據目前路徑順序、這個瀏覽器中已保存的掌握狀態、快速測驗失分、已解挑戰和最近活動來整理。")
                  : usingSyncedSnapshot
                    ? copyText(locale, "This page reads the existing synced account progress for the signed-in learner, and the guided path still reuses the same canonical concept records instead of adding a separate track store.", "此頁會讀取已登入學習者現有的同步帳戶進度，而引導路徑仍然重用同一套標準概念紀錄，不會再另外建立一個獨立路徑儲存。")
                    : copyText(locale, "This page reads the existing local-first concept progress already stored in this browser, and signed-in sync reuses those same concept records instead of adding a separate track store.", "此頁會讀取這個瀏覽器中已保存、以本機優先為主的概念進度，而登入同步也會重用同一套概念紀錄，不會再另外建立一個獨立路徑儲存。")}
              </p>
            </div>

            <div className={`rounded-[24px] border p-4 ${accentPanelClasses[track.accent]}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink-950">
                  {copyText(locale, `${progress.completedFlowCount} / ${progress.totalFlowCount} moments complete`, `${progress.completedFlowCount} / ${progress.totalFlowCount} 個進度節點已完成`)}
                </p>
                <p className="text-sm text-ink-600">{progressPercent}%</p>
              </div>

              <div className="progress-track mt-3">
                <div
                  className="progress-value bg-ink-950 transition-[width]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <p className="mt-3 text-sm leading-6 text-ink-700">{progressSummaryText}</p>

              <details className="mt-4 rounded-[20px] border border-line/80 bg-paper-strong/90 px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-semibold text-ink-900">
                  {isRecapMode
                    ? copyText(locale, "Show recap breakdown", "顯示重溫細節")
                    : copyText(locale, "Show progress breakdown", "顯示進度細節")}
                </summary>
                <p className="mt-2 text-xs leading-5 text-ink-600">{progressBreakdownSummary}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-600">
                  {isRecapMode ? (
                    <>
                      <span className="rounded-full border border-line bg-paper px-3 py-1">
                        {copyText(locale, `${recap.priorityCount} revisit now`, `${recap.priorityCount} 個需要立即重溫`)}
                      </span>
                      <span className="rounded-full border border-line bg-paper px-3 py-1">
                        {copyText(locale, `${recap.activeCount} active`, `${recap.activeCount} 個進行中`)}
                      </span>
                      <span className="rounded-full border border-line bg-paper px-3 py-1">
                        {copyText(locale, `${recap.solidCount} solid`, `${recap.solidCount} 個穩固`)}
                      </span>
                      <span className="rounded-full border border-line bg-paper px-3 py-1">
                        {copyText(locale, `${recap.aheadCount} ahead`, `${recap.aheadCount} 個已走在前面`)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="rounded-full border border-line bg-paper px-3 py-1">
                        {copyText(locale, `${progress.startedCount} started`, `${progress.startedCount} 個已開始`)}
                      </span>
                      <span className="rounded-full border border-line bg-paper px-3 py-1">
                        {copyText(locale, `${progress.totalFlowCount - progress.completedFlowCount} remaining`, `${progress.totalFlowCount - progress.completedFlowCount} 個未完成`)}
                      </span>
                      <span className="rounded-full border border-line bg-paper px-3 py-1">
                        {copyText(locale, `${track.concepts.length} concepts`, `${track.concepts.length} 個概念`)}
                      </span>
                      {track.checkpoints.length ? (
                        <span className="rounded-full border border-line bg-paper px-3 py-1">
                          {copyText(locale, `${track.checkpoints.length} checkpoints`, `${track.checkpoints.length} 個檢查點`)}
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
              </details>
            </div>

            <div className="rounded-[24px] border border-line bg-paper-strong p-4">
              <p className="text-sm font-semibold text-ink-950">
                {isRecapMode
                  ? scopeTrackProgressCopy(recap.primaryStep?.note ?? recap.intro, progressSource)
                  : guidedPrimaryNote}
              </p>
              <div className="mt-4 hidden flex-wrap gap-3">
                <Link
                  href={isRecapMode ? recap.primaryStep?.action.href ?? primaryAction.href : guidedPrimaryHref}
                  onClick={
                    isRecapMode
                      ? () =>
                          trackTrackEngagement(
                            "track-recap-primary-action",
                            recap.primaryStep?.concept.slug ?? primaryTargetConceptSlug,
                          )
                      : progress.status === "completed"
                        ? undefined
                        : () =>
                            trackTrackEngagement(
                              "track-primary-action",
                              primaryTargetConceptSlug,
                            )
                  }
                  className="cta-primary"
                >
                  {isRecapMode
                    ? recap.primaryStep?.action.label ?? copyText(locale, "Open recap", "打開重溫")
                    : guidedPrimaryLabel}
                </Link>
                <Link href={heroSecondaryHref} className="cta-secondary">
                  {heroSecondaryLabel}
                </Link>
              </div>
            </div>

            <details className="rounded-[24px] border border-line bg-paper-strong p-4">
              <summary className="cursor-pointer list-none text-left">
                <span className="lab-label">
                  {copyText(locale, "Track details", "路徑細節")}
                </span>
                <span className="mt-2 block text-lg font-semibold text-ink-950">
                  {copyText(locale, "Open prep suggestions and shareable links only when you need them.", "只有當你需要更完整的路徑背景時，再展開前置建議與可分享連結。")}
                </span>
              </summary>

              <div className="mt-4 space-y-4">
            {prerequisiteRecommendations.length ? (
              <div className="rounded-[24px] border border-line bg-paper-strong p-4">
                <div className="space-y-2">
                  <p className="lab-label">{copyText(locale, "Recommended prep", "建議預備")}</p>
                  <h3 className="text-lg font-semibold text-ink-950">
                    {copyText(locale, "Use the earlier track when this branch still feels abrupt.", "如果這條分支仍然顯得突兀，先用較早的路徑鋪墊。")}
                  </h3>
                  <p className="text-sm leading-6 text-ink-700">
                    {copyText(locale, "Nothing is hard-gated here. These prerequisite cues come from the starter-track catalog and the ", "這裡沒有硬性鎖定。這些前置提示來自入門路徑目錄，以及")}
                    {usingSyncedSnapshot
                      ? copyText(locale, "same synced progress already saved in your account.", "你帳戶中已保存的同步進度。")
                      : copyText(locale, "same local-first progress already saved in this browser.", "這個瀏覽器中已保存、以本機優先為主的進度。")}
                  </p>
                </div>

                <div className="mt-4">
                  <StarterTrackRecommendationList
                    recommendations={prerequisiteRecommendations}
                    variant="track-details"
                  />
                </div>
              </div>
            ) : null}

            <ShareLinksPanel
              items={shareTargets}
              pageTitle={displayTrackTitle}
              title={copyText(locale, "Shareable links", "可分享連結")}
              description={
                isRecapMode
                  ? copyText(locale, "Copy the track page, guided path, or recap entry without carrying any saved progress.", "複製路徑頁面、引導路徑或重溫入口，而不帶任何已保存的進度。")
                  : copyText(locale, "Copy the track page, jump to the guided path, or open recap mode without carrying any saved progress.", "複製路徑頁面、跳到引導路徑或打開重溫模式，而不帶任何已保存的進度。")
              }
              variant="compact"
            />
              </div>
            </details>
          </div>
        </aside>
      </PageSection>

      {!isRecapMode && entryDiagnostic ? (
        <PageSection id="track-entry-diagnostic" as="div">
          <LearningPathEntryDiagnosticPanel
            diagnostic={entryDiagnostic}
            evidenceNote={entryDiagnosticEvidenceNote}
          />
        </PageSection>
      ) : null}

      <PageSection id="track-guidance" as="section">
        <DisclosurePanel
          title={
            isRecapMode
              ? copyText(locale, "About recap mode", "關於重溫模式")
              : copyText(locale, "About this track", "關於這條路徑")
          }
          summary={
            isRecapMode
              ? copyText(locale, "Keep the authored order, then open the extra explanation only when you need to understand how recap is choosing the next review move.", "保留原本的作者編排順序，只有當你真的想知道重溫模式如何挑出下一個複習動作時，再展開這些說明。")
              : copyText(locale, "Keep the first scan focused on the next lesson. Open the authored rationale and shared-framework notes only when you need them.", "先把第一眼的重點留給下一課。只有當你需要了解作者編排理由或共用框架說明時，再展開這些內容。")
          }
        >
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="lab-panel p-6">
          <p className="lab-label">
            {isRecapMode
              ? copyText(locale, "How it works", "運作方式")
              : copyText(locale, "Why this order", "為何這樣排序")}
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-ink-950">
            {isRecapMode
              ? copyText(locale, "Same authored sequence, lighter revisit.", "同一條作者編排的順序，以較輕量方式重溫。")
              : copyText(locale, "The sequence is authored to keep the model honest.", "這個順序由作者編排，用來保持學習模型誠實。")}
          </h2>
          <p className="mt-3 text-sm leading-6 text-ink-700">
            {isRecapMode
              ? copyText(locale, "Recap mode does not invent a second curriculum. It keeps the existing starter-track order, then changes the prompt and suggested action with the current mastery and progress signals.", "重溫模式不會另外發明第二套課程。它保留現有的入門路徑順序，再根據目前的掌握與進度訊號，改寫提示與建議動作。")
              : track.sequenceRationale}
          </p>
        </article>

        <article className="lab-panel p-6">
          <p className="lab-label">
            {isRecapMode
              ? copyText(locale, "Keep using concept pages", "繼續使用概念頁")
              : copyText(locale, "Shared concept pages", "共享概念頁")}
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-ink-950">
            {isRecapMode
              ? copyText(locale, "Quick tests, challenge mode, worked examples, and read-next stay where they already live.", "快速測驗、挑戰模式、實作範例與下一步建議都保留在原本所在的位置。")
              : copyText(locale, "Each step opens the same simulation-first framework.", "每一步都會打開同一套模擬優先的框架。")}
          </h2>
          <p className="mt-3 text-sm leading-6 text-ink-700">
            {isRecapMode
              ? copyText(locale, "Recap links only jump you to the most useful surface for a fast review. The simulation-first concept pages still carry the real teaching work and keep the guided path intact.", "重溫連結只會把你帶到最適合快速回顧的頁面。真正的教學工作仍然留在模擬優先的概念頁上，並保持整條引導路徑完整。")
              : copyText(locale, "Compare mode, prediction mode, quick test, worked examples, guided overlays, challenge mode, and read-next cues stay on the concept pages. The track only decides the guided order and the next recommended stop.", "比較模式、預測模式、快速測驗、實作範例、引導提示、挑戰模式與下一步提示都保留在概念頁上。這條路徑只負責決定引導順序與下一個建議停靠點。")}
          </p>
        </article>
          </div>
        </DisclosurePanel>
      </PageSection>

      {isRecapMode ? (
        <PageSection id="track-recap-steps" as="section" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="lab-label">{copyText(locale, "Recap steps", "重溫步驟")}</p>
              <h2 className="text-2xl font-semibold text-ink-950">
                {copyText(locale, "Revisit the track in the same authored order.", "按照同一條作者編排的順序重溫這條路徑。")}
              </h2>
            </div>
            <p className="text-sm text-ink-600">
              {copyText(locale, "Focus badges and button targets come from the current mastery and progress signals.", "焦點徽章與按鈕目標都來自目前的掌握與進度訊號。")}
              {track.checkpoints.length
                ? copyText(locale, " The next ready checkpoint still stays in the loop.", " 下一個已就緒的檢查點仍然會保留在流程中。")
                : ""}
            </p>
          </div>

          <ol className="grid gap-4">
            {recap.steps.map((step, index) => {
              const actionIsPrimary = step.focusKind === "priority" || step.isNextGuidedStep;

              return (
                <li key={step.concept.slug}>
                  <article
                    className={[
                      "lab-panel p-5 sm:p-6",
                      actionIsPrimary ? "border-ink-950/20 bg-paper-strong shadow-sm" : "",
                    ].join(" ")}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink-950 text-sm font-semibold text-paper-strong">
                            {index + 1}
                          </span>
                          <ProgressStatusBadge status={step.progress.status} compact />
                          <MasteryStateBadge state={step.progress.mastery.state} compact />
                          <span
                            className={[
                              "rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                              recapFocusClasses[step.focusKind],
                            ].join(" ")}
                          >
                            {step.focusLabel}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-2xl font-semibold text-ink-950">
                            <Link
                              href={`/concepts/${step.concept.slug}`}
                              onClick={() =>
                                trackTrackEngagement("track-recap-step-title", step.concept.slug)
                              }
                              className="transition-colors hover:text-teal-700"
                            >
                              {getConceptDisplayTitle(step.concept, locale)}
                            </Link>
                          </h3>
                          <p className="max-w-3xl text-sm leading-6 text-ink-700">
                            {scopeTrackProgressCopy(step.note, progressSource)}
                          </p>
                          <p className="text-sm text-ink-600">{getStepBridgeText(track, index, locale)}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {getConceptDisplayHighlights(step.concept, locale)
                            .slice(0, 2)
                            .map((item) => (
                              <span
                                key={item}
                                className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700"
                              >
                                {item}
                              </span>
                            ))}
                          {step.supportReasons
                            .filter((reason) => reason !== step.note)
                            .slice(0, 2)
                            .map((reason) => (
                              <span
                                key={reason}
                                className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-ink-700"
                              >
                                {reason}
                              </span>
                            ))}
                          {step.concept.estimatedStudyMinutes ? (
                            <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700">
                              {copyText(
                                locale,
                                `${step.concept.estimatedStudyMinutes} min`,
                                `${step.concept.estimatedStudyMinutes} 分鐘`,
                              )}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-3">
                        {step.action.kind !== "concept" ? (
                          <Link
                            href={`/concepts/${step.concept.slug}`}
                            className="motion-link inline-flex text-sm font-semibold text-ink-700 underline underline-offset-4 transition-colors hover:text-ink-950"
                          >
                            {copyText(locale, "Open concept", "打開概念")}
                          </Link>
                        ) : null}
                        <Link
                          href={step.action.href}
                          onClick={() =>
                            trackTrackEngagement("track-recap-step-action", step.concept.slug)
                          }
                          className={[
                            "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
                            actionIsPrimary
                              ? "bg-ink-950 text-paper-strong hover:opacity-90"
                              : "border border-line bg-paper-strong text-ink-900 hover:border-ink-950/20 hover:bg-white",
                          ].join(" ")}
                        >
                          {step.action.label}
                        </Link>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </PageSection>
      ) : (
        <PageSection
          id={trackShareAnchorIds.guidedPath}
          as="section"
          className="space-y-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="lab-label">{copyText(locale, "Guided path", "引導路徑")}</p>
              
              <h2 className="text-2xl font-semibold text-ink-950">
                {track.checkpoints.length
                  ? copyText(locale, "Follow the concepts and checkpoint moments in order.", "按順序走過概念與檢查點。")
                  : copyText(locale, "Follow the concepts in order, or review any finished step.", "按順序走過概念，或重溫任何已完成的步驟。")}
              </h2>
            </div>
            <p className="text-sm text-ink-600">
              {track.checkpoints.length
                ? copyText(locale, "Checkpoint cards reuse the authored challenge entries already living on the concept pages.", "檢查點卡片會重用已經存在於概念頁中的作者編排挑戰入口。")
                : copyText(locale, "The highlighted step is the current guided recommendation.", "高亮顯示的步驟就是目前的引導建議。")}
            </p>
          </div>

          <ol className="grid gap-4">
            {track.concepts.map((concept, index) => {
              const conceptProgress = progress.conceptProgress[index];
              const conceptIsTarget =
                primaryAction.kind !== "checkpoint" &&
                concept.slug === primaryAction.targetConcept?.slug;
              const checkpointsAfterConcept = progress.checkpointProgress.filter(
                (item) => item.checkpoint.stepIndex === index,
              );

              return (
                <Fragment key={concept.slug}>
                  <li>
                    <article
                      className={[
                        "lab-panel p-5 sm:p-6",
                        conceptIsTarget ? "border-ink-950/20 bg-paper-strong shadow-sm" : "",
                      ].join(" ")}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink-950 text-sm font-semibold text-paper-strong">
                              {index + 1}
                            </span>
                            <ProgressStatusBadge status={conceptProgress.status} compact />
                            <MasteryStateBadge state={conceptProgress.mastery.state} compact />
                            {conceptIsTarget ? (
                              <span className="rounded-full border border-ink-950/20 bg-ink-950 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-paper-strong">
                                {progress.status === "completed"
                                  ? copyText(locale, "Review start", "重溫起點")
                                  : progress.status === "not-started"
                                    ? copyText(locale, "Start here", "從這裡開始")
                                    : copyText(locale, "Next guided step", "下一個引導步驟")}
                              </span>
                            ) : null}
                          </div>

                          <div className="space-y-2">
                            <h3 className="text-2xl font-semibold text-ink-950">
                              <Link
                                href={`/concepts/${concept.slug}`}
                                onClick={() =>
                                  trackTrackEngagement("track-guided-step-title", concept.slug)
                                }
                                className="transition-colors hover:text-teal-700"
                              >
                                {getConceptDisplayTitle(concept, locale)}
                              </Link>
                            </h3>
                            <p className="max-w-3xl text-sm leading-6 text-ink-700">
                              {getConceptDisplaySummary(concept, locale)}
                            </p>
                            <p className="text-sm text-ink-600">{getStepBridgeText(track, index, locale)}</p>
                            {conceptProgress.status !== "not-started" ? (
                              <p className="text-sm text-ink-600">
                                {scopeTrackProgressCopy(
                                  conceptProgress.mastery.note,
                                  progressSource,
                                )}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700">
                              {getTopicDisplayTitleFromValue(concept.topic, locale)}
                            </span>
                            <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700">
                              {getDifficultyLabel(concept.difficulty, locale)}
                            </span>
                            {concept.estimatedStudyMinutes ? (
                              <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700">
                                {copyText(
                                  locale,
                                  `${concept.estimatedStudyMinutes} min`,
                                  `${concept.estimatedStudyMinutes} 分鐘`,
                                )}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-3">
                          <Link
                            href={`/concepts/${concept.slug}`}
                            onClick={() =>
                              trackTrackEngagement("track-guided-step-action", concept.slug)
                            }
                            className={[
                              "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
                              conceptIsTarget
                                ? "bg-ink-950 text-paper-strong hover:opacity-90"
                                : "border border-line bg-paper-strong text-ink-900 hover:border-ink-950/20 hover:bg-white",
                            ].join(" ")}
                          >
                            {getStepActionLabel(
                              conceptIsTarget,
                              progress.status,
                              conceptProgress.status,
                              locale,
                            )}
                          </Link>
                          {conceptIsTarget || conceptProgress.status !== "not-started" ? (
                            <ConceptLearningSurfaceTestCta
                              conceptSlug={concept.slug}
                              snapshot={snapshot}
                              progressReady={progressReady}
                              className="inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:border-ink-950/20 hover:bg-white"
                              testId={`starter-track-test-cta-${concept.slug}`}
                            />
                          ) : null}
                        </div>
                      </div>
                    </article>
                  </li>

                  {checkpointsAfterConcept.map((checkpointProgress) => {
                    const checkpoint = checkpointProgress.checkpoint;
                    const challengeRecord = getConceptProgressRecord(
                      snapshot,
                      checkpoint.challenge.concept,
                    );
                    const challengeState = getChallengeProgressState(
                      challengeRecord,
                      checkpoint.challenge.challengeId,
                    );
                    const checkpointNumber = checkpointNumberById.get(checkpoint.id) ?? 0;
                    const isTarget = checkpoint.id === primaryAction.targetCheckpoint?.id;
                    const primaryHref =
                      checkpointProgress.status === "locked"
                        ? `/concepts/${checkpoint.afterConcept.slug}`
                        : checkpointProgress.action.href;
                    const primaryLabel =
                      checkpointProgress.status === "locked"
                        ? copyText(
                            locale,
                            `Return to ${getConceptLabel(checkpoint.afterConcept)}`,
                            `回到 ${getConceptLabel(checkpoint.afterConcept)}`,
                          )
                        : checkpointProgress.action.label;

                    return (
                      <li key={checkpoint.id}>
                        <article
                          className={[
                            "lab-panel border-dashed p-5 sm:p-6",
                            isTarget ? "border-ink-950/20 bg-paper-strong shadow-sm" : "",
                          ].join(" ")}
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
                                  {copyText(locale, `Checkpoint ${checkpointNumber}`, `檢查點 ${checkpointNumber}`)}
                                </span>
                                <span
                                  className={[
                                    "rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                                    getCheckpointStatusClasses(checkpointProgress.status),
                                  ].join(" ")}
                                >
                                  {getCheckpointStatusLabel(checkpointProgress.status, locale)}
                                </span>
                                <span
                                  className={[
                                    "rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                                    challengeProgressClasses[challengeState],
                                  ].join(" ")}
                                >
                                  {getChallengeProgressLabel(challengeState, progressSource, locale)}
                                </span>
                                {isTarget ? (
                                  <span className="rounded-full border border-ink-950/20 bg-ink-950 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-paper-strong">
                                    {copyText(locale, "Next guided moment", "下一個引導節點")}
                                  </span>
                                ) : null}
                              </div>

                              <div className="space-y-2">
                                <h3 className="text-xl font-semibold text-ink-950">
                                  {checkpoint.title}
                                </h3>
                                <p className="max-w-3xl text-sm leading-6 text-ink-700">
                                  {checkpoint.summary}
                                </p>
                                <p className="max-w-3xl text-sm leading-6 text-ink-600">
                                  {scopeTrackProgressCopy(
                                    checkpointProgress.note,
                                    progressSource,
                                  )}
                                </p>
                                <p className="text-sm text-ink-600">
                                  {getCheckpointBridgeText(track, checkpoint, locale)}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {checkpoint.concepts.map((checkpointConcept) => (
                                  <span
                                    key={`${checkpoint.id}-${checkpointConcept.slug}`}
                                    className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700"
                                  >
                                    {getConceptLabel(checkpointConcept)}
                                  </span>
                                ))}
                                <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs text-ink-700">
                                  {copyText(locale, `${checkpoint.challenge.checkCount} checks`, `${checkpoint.challenge.checkCount} 個檢查`)}
                                </span>
                                <span
                                  className={[
                                    "rounded-full border px-3 py-1 text-xs",
                                    challengeDepthClasses[checkpoint.challenge.depth],
                                  ].join(" ")}
                                >
                                  {copyText(
                                    locale,
                                    challengeDepthLabels[checkpoint.challenge.depth],
                                    checkpoint.challenge.depth === "warm-up"
                                      ? "熱身"
                                      : checkpoint.challenge.depth === "core"
                                        ? "核心"
                                        : "延伸",
                                  )}
                                </span>
                                {checkpoint.challenge.usesCompare ? (
                                  <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs text-ink-700">
                                    {copyText(locale, "Compare", "比較")}
                                  </span>
                                ) : null}
                                {checkpoint.challenge.usesInspect ? (
                                  <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs text-ink-700">
                                    {copyText(locale, "Inspect time", "檢視時間")}
                                  </span>
                                ) : null}
                                {checkpoint.challenge.cueLabels
                                  .filter(
                                    (label) =>
                                      label !== "Compare mode" &&
                                      label !== "Inspect time",
                                  )
                                  .slice(0, 2)
                                  .map((label) => (
                                    <span
                                      key={`${checkpoint.id}-${label}`}
                                      className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700"
                                    >
                                      {translateChallengeCueLabel(label, challengeUi)}
                                    </span>
                                  ))}
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-3">
                              <Link
                                href={primaryHref}
                                onClick={() =>
                                  trackTrackEngagement(
                                    "track-guided-checkpoint-action",
                                    checkpoint.challenge.concept.slug,
                                  )
                                }
                                className={[
                                  "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
                                  isTarget
                                    ? "bg-ink-950 text-paper-strong hover:opacity-90"
                                    : "border border-line bg-paper-strong text-ink-900 hover:border-ink-950/20 hover:bg-white",
                                ].join(" ")}
                              >
                                {primaryLabel}
                              </Link>
                              <Link
                                href={`/concepts/${checkpoint.challenge.concept.slug}`}
                                onClick={() =>
                                  trackTrackEngagement(
                                    "track-guided-checkpoint-concept",
                                    checkpoint.challenge.concept.slug,
                                  )
                                }
                                className="motion-link inline-flex text-sm font-semibold text-ink-700 underline underline-offset-4 transition-colors hover:text-ink-950"
                              >
                                {copyText(locale, "Open concept", "打開概念")}
                              </Link>
                            </div>
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </Fragment>
              );
            })}
          </ol>
        </PageSection>
      )}
    </section>
  );
}
