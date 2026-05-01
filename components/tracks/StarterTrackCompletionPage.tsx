"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLocale } from "next-intl";
import { AchievementCelebrationToasts } from "@/components/account/AchievementCelebrationToasts";
import { useAccountSession } from "@/lib/account/client";
import { useAchievementEvents } from "@/lib/achievements/use-achievement-events";
import type { StarterTrackSummary } from "@/lib/content";
import type { StarterTrackCompletionContentContext } from "@/lib/content/track-completion";
import {
  getConceptDisplayHighlights,
  getConceptDisplayTitle,
  getStarterTrackDisplayHighlights,
  getStarterTrackDisplaySummary,
  getStarterTrackDisplayTitle,
} from "@/lib/i18n/content";
import type { AppLocale } from "@/i18n/routing";
import {
  getStarterTrackCompletionSummary,
  getStarterTrackPrimaryAction,
  resolveAccountProgressSnapshot,
  type ProgressSnapshot,
  useProgressSnapshot,
} from "@/lib/progress";
import {
  buildTrackCompletionShareTargets,
  buildTrackRecapHref,
  localizeShareHref,
} from "@/lib/share-links";
import { MasteryStateBadge } from "@/components/progress/MasteryStateBadge";
import { ProgressStatusBadge } from "@/components/progress/ProgressStatusBadge";
import { ShareLinksPanel } from "@/components/share/ShareLinksPanel";

type StarterTrackCompletionPageProps = {
  track: StarterTrackSummary;
  completionContext: StarterTrackCompletionContentContext;
  subjectPages?: Array<{ title: string; path: string }>;
  initialSyncedSnapshot?: ProgressSnapshot | null;
};

const accentPanelClasses: Record<StarterTrackSummary["accent"], string> = {
  teal: "border-teal-500/20 bg-teal-500/10",
  amber: "border-amber-500/20 bg-amber-500/10",
  coral: "border-coral-500/20 bg-coral-500/10",
  sky: "border-sky-500/20 bg-sky-500/10",
  ink: "border-ink-950/15 bg-ink-950/5",
};

const accentTopClasses: Record<StarterTrackSummary["accent"], string> = {
  teal: "from-teal-500/70 via-teal-500/18 to-transparent",
  amber: "from-amber-500/70 via-amber-500/18 to-transparent",
  coral: "from-coral-500/70 via-coral-500/18 to-transparent",
  sky: "from-sky-500/70 via-sky-500/18 to-transparent",
  ink: "from-ink-950/70 via-ink-950/18 to-transparent",
};

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

function localizeTrackCompletionShareTargets(
  targets: ReturnType<typeof buildTrackCompletionShareTargets>,
  locale: AppLocale,
) {
  return targets.map((target) => {
    switch (target.id) {
      case "track-completion":
        return {
          ...target,
          label: copyText(locale, "Completion page", "完成頁面"),
          ariaLabel: copyText(locale, "Copy completion page link", "複製完成頁面連結"),
        };
      case "track-page":
        return {
          ...target,
          label: copyText(locale, "Full track", "完整路徑"),
          ariaLabel: copyText(locale, "Copy full track link", "複製完整路徑連結"),
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

function formatLastActive(locale: AppLocale, value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

function getTrackStatusLabel(
  locale: AppLocale,
  status: ReturnType<typeof getStarterTrackCompletionSummary>["progress"]["status"],
) {
  if (status === "completed") {
    return copyText(locale, "Completed", "已完成");
  }

  if (status === "in-progress") {
    return copyText(locale, "In progress", "進行中");
  }

  return copyText(locale, "Not started", "未開始");
}

function getCheckpointCompletionNote(
  locale: AppLocale,
  track: StarterTrackSummary,
  checkpoint: StarterTrackSummary["checkpoints"][number],
) {
  const nextConcept = track.concepts[checkpoint.stepIndex + 1];
  const afterConceptTitle = getConceptDisplayTitle(checkpoint.afterConcept, locale);
  const nextConceptTitle = nextConcept
    ? getConceptDisplayTitle(nextConcept, locale)
    : null;

  if (nextConceptTitle) {
    return copyText(
      locale,
      `Cleared after ${afterConceptTitle} before ${nextConceptTitle}.`,
      `在 ${afterConceptTitle} 之後、${nextConceptTitle} 之前完成。`,
    );
  }

  return copyText(
    locale,
    `Final checkpoint cleared after ${afterConceptTitle}.`,
    `最後一個檢查點已在 ${afterConceptTitle} 之後完成。`,
  );
}

function scopeTrackCompletionCopy(
  value: string,
  progressSource: "local" | "synced",
) {
  if (progressSource === "local") {
    return value;
  }

  return value
    .replaceAll("on this browser", "in your synced account")
    .replaceAll("local-first", "synced")
    .replaceAll("local concept records", "synced account records");
}

export function StarterTrackCompletionPage({
  track,
  completionContext,
  subjectPages = [],
  initialSyncedSnapshot = null,
}: StarterTrackCompletionPageProps) {
  const locale = useLocale() as AppLocale;
  const localSnapshot = useProgressSnapshot();
  const session = useAccountSession();
  const signedIn = session.status === "signed-in" && Boolean(session.user);
  const { toasts, submitEvent, dismissToast } = useAchievementEvents({
    enabled: signedIn,
  });
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const { hasLocalRecordedProgress, hasSyncedRecordedProgress } = progressDisplay;
  const progressSource: "local" | "synced" =
    !hasLocalRecordedProgress && hasSyncedRecordedProgress ? "synced" : "local";
  const usingSyncedSnapshot = progressSource === "synced";
  const snapshot = progressDisplay.snapshot;
  const completion = getStarterTrackCompletionSummary(
    snapshot,
    track,
    completionContext,
    locale,
  );
  const continueAction = getStarterTrackPrimaryAction(track, completion.progress, locale);
  const displayTrackTitle = getStarterTrackDisplayTitle(track, locale);
  const displayTrackSummary = getStarterTrackDisplaySummary(track, locale);
  const displayTrackHighlights = getStarterTrackDisplayHighlights(track, locale);
  const shareTargets = localizeTrackCompletionShareTargets(
    buildTrackCompletionShareTargets(track.slug, locale),
    locale,
  );
  const completionDateLabel = formatLastActive(locale, completion.completionDate);
  const lastActiveLabel = formatLastActive(locale, completion.progress.lastActivityAt);
  const progressPercent = completion.progress.totalFlowCount
    ? Math.round(
        (completion.progress.completedFlowCount / completion.progress.totalFlowCount) * 100,
      )
    : 0;
  const remainingConcepts = track.concepts.filter(
    (_, index) => completion.progress.conceptProgress[index]?.status !== "completed",
  );
  const remainingCheckpoints = completion.progress.checkpointProgress.filter(
    (item) => item.status !== "completed",
  );
  const isComplete = completion.progress.status === "completed";
  const primarySubjectPage = subjectPages.length === 1 ? subjectPages[0] : null;

  useEffect(() => {
    if (!signedIn || !isComplete) {
      return;
    }

    void submitEvent({
      type: "track_completed",
      trackSlug: track.slug,
    });
  }, [isComplete, signedIn, submitEvent, track.slug]);

  return (
    <>
      <section className="space-y-5 sm:space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-600">
        <Link
          href={localizeShareHref("/", locale)}
          className="rounded-full border border-line bg-paper-strong px-3 py-1 transition-colors hover:border-ink-950/20 hover:text-ink-950"
        >
          {copyText(locale, "Home", "首頁")}
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={localizeShareHref("/concepts", locale)}
          className="rounded-full border border-line bg-paper-strong px-3 py-1 transition-colors hover:border-ink-950/20 hover:text-ink-950"
        >
          {copyText(locale, "Concepts", "概念庫")}
        </Link>
        <span aria-hidden="true">/</span>
        {primarySubjectPage ? (
          <>
            <Link
              href={localizeShareHref(primarySubjectPage.path, locale)}
              className="rounded-full border border-line bg-paper-strong px-3 py-1 transition-colors hover:border-ink-950/20 hover:text-ink-950"
            >
              {primarySubjectPage.title}
            </Link>
            <span aria-hidden="true">/</span>
          </>
        ) : null}
        <Link
          href={localizeShareHref(`/tracks/${track.slug}`, locale)}
          className="rounded-full border border-line bg-paper-strong px-3 py-1 transition-colors hover:border-ink-950/20 hover:text-ink-950"
        >
          {displayTrackTitle}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-ink-950">
          {copyText(locale, "Completion", "完成")}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="lab-panel relative overflow-hidden p-5 sm:p-6">
          <div
            className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[track.accent]}`}
          />

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="lab-label">{copyText(locale, "Track completion", "路徑完成")}</span>
              {usingSyncedSnapshot ? (
                <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-teal-700">
                  {copyText(locale, "Synced across devices", "已在裝置之間同步")}
                </span>
              ) : null}
              <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                {copyText(locale, `${track.concepts.length} concepts`, `${track.concepts.length} 個概念`)}
              </span>
              {subjectPages.map((subjectPage) => (
                <Link
                  key={subjectPage.path}
                  href={subjectPage.path}
                  className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500 transition-colors hover:border-ink-950/20 hover:text-ink-950"
                >
                  {subjectPage.title}
                </Link>
              ))}
              {track.checkpoints.length ? (
                <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {copyText(locale, `${track.checkpoints.length} checkpoints`, `${track.checkpoints.length} 個檢查點`)}
                </span>
              ) : null}
              <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                {copyText(locale, `${track.estimatedStudyMinutes} min`, `${track.estimatedStudyMinutes} 分鐘`)}
              </span>
              <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                {getTrackStatusLabel(locale, completion.progress.status)}
              </span>
              {completionDateLabel ? (
                <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {copyText(locale, `Finished ${completionDateLabel}`, `完成於 ${completionDateLabel}`)}
                </span>
              ) : lastActiveLabel ? (
                <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {copyText(locale, `Last active ${lastActiveLabel}`, `最近活動 ${lastActiveLabel}`)}
                </span>
              ) : null}
            </div>

            <div className="space-y-3">
              <h1 className="max-w-4xl text-[2.2rem] font-semibold leading-[1.02] text-ink-950 sm:text-[2.7rem]">
                {isComplete
                  ? copyText(locale, `${displayTrackTitle} complete`, `${displayTrackTitle} 已完成`)
                  : copyText(
                      locale,
                      `${displayTrackTitle} is still in progress`,
                      `${displayTrackTitle} 仍在進行中`,
                    )}
              </h1>
              <p className="max-w-3xl text-base leading-6 text-ink-800">{displayTrackSummary}</p>
              <p className="max-w-3xl text-sm leading-6 text-ink-700">
                {isComplete
                  ? usingSyncedSnapshot
                    ? `${completion.coverageSummary} ${copyText(locale, "This page is built from the synced account progress already saved for this learner.", "這個頁面是根據這位學習者已保存的同步帳戶進度建立。")}`
                    : `${completion.coverageSummary} ${copyText(locale, "This page is built from the existing local-first concept progress already saved in this browser.", "這個頁面是根據這個瀏覽器中已保存、以本機優先為主的概念進度建立。")}`
                  : usingSyncedSnapshot
                    ? copyText(locale, "This completion page stays public, but the completion reflection only unlocks after every concept and authored checkpoint in this track is clear in your synced account. The route still reads the same synced account records and solved challenge ids instead of inventing a separate track store.", "這個完成頁面會保持公開，但只有當這條路徑中的每個概念與作者設定的檢查點都已在你的同步帳戶中完成後，完整回顧才會解鎖。這條路徑仍會讀取同一份同步帳戶紀錄與已解開的挑戰 id，而不是另外建立一套獨立的路徑儲存。")
                    : copyText(locale, "This completion page stays public, but the completion reflection only unlocks after every concept and authored checkpoint in this track is clear on this browser. The route still reads the same local concept records and solved challenge ids, and signed-in sync keeps reusing those records instead of inventing a separate track store.", "這個完成頁面會保持公開，但只有當這條路徑中的每個概念與作者設定的檢查點都已在這個瀏覽器中完成後，完整回顧才會解鎖。這條路徑仍會讀取同一份本機概念紀錄與已解開的挑戰 id，而登入後的同步也會繼續重用這些紀錄，而不是另外建立一套獨立的路徑儲存。")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {displayTrackHighlights.map((item) => (
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

        <aside className="space-y-4">
          <section className="lab-panel p-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="lab-label">
                  {isComplete
                    ? copyText(locale, "Track reflection", "路徑回顧")
                    : copyText(locale, "Track progress", "路徑進度")}
                </p>
                <h2 className="text-2xl font-semibold text-ink-950">
                  {isComplete
                    ? copyText(locale, "Use this page to close the loop and choose one bounded next step.", "用這個頁面收束這條路徑，並選擇下一個清晰的小步。")
                    : copyText(locale, "Finish the remaining guided moments to open the full reflection.", "完成剩下的引導節點，才能打開完整回顧。")}
                </h2>
                <p className="text-sm leading-6 text-ink-700">
                  {isComplete
                    ? copyText(locale, "The summary below stays compact: concepts and checkpoints completed in this track, a few saved progress signals, and a few sensible follow-ups from the existing topic, track, and challenge surfaces.", "下面的摘要會保持精簡：這條路徑中已完成的概念與檢查點、一些已保存的進度訊號，以及從現有主題頁、路徑頁與挑戰頁延伸出的幾個合理下一步。")
                    : scopeTrackCompletionCopy(continueAction.note, progressSource)}
                </p>
              </div>

              <div className={`rounded-[24px] border p-4 ${accentPanelClasses[track.accent]}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-950">
                    {copyText(locale, "Track completion", "路徑完成")}
                  </p>
                  <p className="text-sm text-ink-600">
                    {copyText(
                      locale,
                      `${completion.progress.completedFlowCount} / ${completion.progress.totalFlowCount} complete`,
                      `已完成 ${completion.progress.completedFlowCount} / ${completion.progress.totalFlowCount}`,
                    )}
                  </p>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-strong">
                  <div
                    className="h-full rounded-full bg-ink-950 transition-[width]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div
                  className={[
                    "mt-3 grid gap-3",
                    track.checkpoints.length ? "sm:grid-cols-4" : "sm:grid-cols-3",
                  ].join(" ")}
                >
                  <div className="rounded-[20px] border border-line bg-paper-strong p-3">
                    <p className="text-lg font-semibold text-ink-950">
                      {completion.progress.completedCount}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
                      {copyText(locale, "concepts complete", "已完成概念")}
                    </p>
                  </div>
                  {track.checkpoints.length ? (
                    <div className="rounded-[20px] border border-line bg-paper-strong p-3">
                      <p className="text-lg font-semibold text-ink-950">
                        {completion.completedCheckpointCount}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
                        {copyText(locale, "checkpoints clear", "已完成檢查點")}
                      </p>
                    </div>
                  ) : null}
                  <div className="rounded-[20px] border border-line bg-paper-strong p-3">
                    <p className="text-lg font-semibold text-ink-950">
                      {completion.strongCheckConceptCount}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
                      {copyText(locale, "stronger checks", "較強檢查")}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-line bg-paper-strong p-3">
                    <p className="text-lg font-semibold text-ink-950">
                      {completion.completedChallengeCount}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
                      {copyText(locale, "challenges solved", "已解挑戰")}
                    </p>
                  </div>
                </div>

                {isComplete ? (
                  <>
                    <p className="mt-3 text-sm leading-6 text-ink-700">
                      {copyText(
                        locale,
                        `${completion.quickTestCompletedCount} quick test${completion.quickTestCompletedCount === 1 ? "" : "s"} finished across this track.`,
                        `這條路徑共有 ${completion.quickTestCompletedCount} 次快速測驗已完成。`,
                      )}
                      {track.checkpoints.length
                        ? ` ${copyText(
                            locale,
                            `${completion.completedCheckpointCount} checkpoint${completion.completedCheckpointCount === 1 ? "" : "s"} cleared in the guided path.`,
                            `引導路徑中已有 ${completion.completedCheckpointCount} 個檢查點完成。`,
                          )}`
                        : ""}
                    </p>
                    {track.checkpoints.length ? (
                      <div className="mt-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                          {copyText(locale, "Checkpoint recap", "檢查點回顧")}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {completion.progress.checkpointProgress.map((item, index) => (
                            <div
                              key={item.checkpoint.id}
                              className="rounded-[18px] border border-line bg-paper-strong p-3"
                            >
                              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                                {copyText(locale, `Checkpoint ${index + 1}`, `檢查點 ${index + 1}`)}
                              </p>
                              <p className="mt-2 text-sm font-semibold text-ink-950">
                                {item.checkpoint.title}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-ink-600">
                                {getCheckpointCompletionNote(locale, track, item.checkpoint)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : remainingConcepts.length || remainingCheckpoints.length ? (
                  <p className="mt-3 text-sm leading-6 text-ink-700">
                    {remainingConcepts.length
                      ? copyText(
                          locale,
                          `Remaining concepts: ${remainingConcepts
                            .map((concept) => getConceptDisplayTitle(concept, locale))
                            .join(", ")}.`,
                          `尚餘概念：${remainingConcepts
                            .map((concept) => getConceptDisplayTitle(concept, locale))
                            .join("、")}。`,
                        )
                      : copyText(locale, "All concepts are complete.", "所有概念都已完成。")}{" "}
                    {remainingCheckpoints.length
                      ? copyText(
                          locale,
                          `Remaining checkpoints: ${remainingCheckpoints
                            .map((item) => item.checkpoint.title)
                            .join(", ")}.`,
                          `尚餘檢查點：${remainingCheckpoints
                            .map((item) => item.checkpoint.title)
                            .join("、")}。`,
                        )
                      : ""}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={
                    isComplete
                      ? buildTrackRecapHref(track.slug, locale)
                      : localizeShareHref(continueAction.href, locale)
                  }
                  className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                  style={{ color: "var(--paper-strong)" }}
                >
                  {isComplete ? copyText(locale, "Open recap mode", "打開重溫模式") : continueAction.label}
                </Link>
                <Link
                  href={localizeShareHref(`/tracks/${track.slug}`, locale)}
                  className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-ink-950/20 hover:bg-white"
                >
                  {copyText(locale, "Open full track", "打開完整路徑")}
                </Link>
              </div>
            </div>
          </section>

          <ShareLinksPanel
            items={shareTargets}
            pageTitle={copyText(
              locale,
              `${displayTrackTitle} completion`,
              `${displayTrackTitle} 完成頁面`,
            )}
            description={copyText(locale, "Copy the completion reflection, the full track, or recap mode without carrying any saved progress.", "複製完成回顧、完整路徑或重溫模式連結，但不會帶上任何已保存的進度。")}
            variant="compact"
          />
        </aside>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="lab-label">
              {isComplete
                ? copyText(locale, "Completed concepts", "已完成概念")
                : copyText(locale, "Completed so far", "目前已完成")}
            </p>
            <h2 className="text-2xl font-semibold text-ink-950">
              {isComplete
                ? copyText(locale, "These are the concepts completed in this track.", "這些是你在這條路徑中已完成的概念。")
                : copyText(locale, "These concepts are already complete in the track.", "這些概念已經在這條路徑中完成。")}
            </h2>
          </div>
          <p className="text-sm text-ink-600">
            {usingSyncedSnapshot
              ? copyText(locale, "Status and mastery badges come from the same synced account concept records used everywhere else.", "狀態與掌握度徽章都來自系統其他地方共用的同步帳戶概念紀錄。")
              : copyText(locale, "Status and mastery badges come from the same local-first concept records used everywhere else.", "狀態與掌握度徽章都來自系統其他地方共用、以本機優先為主的概念紀錄。")}
          </p>
        </div>

        {completion.completedConcepts.length ? (
          <ol className="grid gap-4">
            {completion.completedConcepts.map((entry, index) => {
              const lastActive = formatLastActive(locale, entry.lastActivityAt);

              return (
                <li key={entry.concept.slug}>
                  <article className="lab-panel p-5 sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-sm font-semibold text-white">
                            {index + 1}
                          </span>
                          <ProgressStatusBadge status={entry.progress.status} compact />
                          <MasteryStateBadge state={entry.progress.mastery.state} compact />
                          {lastActive ? (
                            <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                              {lastActive}
                            </span>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-2xl font-semibold text-ink-950">
                            <Link
                              href={localizeShareHref(`/concepts/${entry.concept.slug}`, locale)}
                              className="transition-colors hover:text-teal-700"
                            >
                              {getConceptDisplayTitle(entry.concept, locale)}
                            </Link>
                          </h3>
                          <p className="max-w-3xl text-sm leading-6 text-ink-700">
                            {entry.progress.mastery.note}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {getConceptDisplayHighlights(entry.concept, locale)
                            .slice(0, 2)
                            .map((item) => (
                              <span
                                key={item}
                                className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700"
                              >
                                {item}
                              </span>
                            ))}
                          {entry.progress.mastery.evidence.slice(0, 3).map((item) => (
                            <span
                              key={item}
                              className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs text-ink-700"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-3">
                        <Link
                          href={localizeShareHref(`/concepts/${entry.concept.slug}`, locale)}
                          className="inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
                        >
                          {copyText(locale, "Review concept", "重溫概念")}
                        </Link>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        ) : (
          <article className="lab-panel p-5 sm:p-6">
            <p className="text-sm leading-6 text-ink-700">
              {scopeTrackCompletionCopy(
                copyText(locale, "No concepts in this track are complete yet on this browser.", "這條路徑目前在這個瀏覽器中還沒有任何已完成的概念。"),
                progressSource,
              )}
            </p>
          </article>
        )}
      </section>

      {isComplete && completion.guidance.length ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="lab-label">{copyText(locale, "Next steps", "下一步")}</p>
              <h2 className="text-2xl font-semibold text-ink-950">
                {copyText(locale, "Choose one bounded follow-up.", "選一個清晰而有界的下一步。")}
              </h2>
            </div>
            <p className="text-sm text-ink-600">
              {copyText(locale, "Each suggestion reuses the existing track order, topic pages, recap cues, or open challenges.", "每個建議都會重用現有的路徑順序、主題頁、重溫提示或尚未完成的挑戰。")}
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {completion.guidance.map((item) => (
              <article key={`${item.kind}-${item.title}`} className="lab-panel p-5">
                <p className="lab-label">{item.eyebrow}</p>
                <h3 className="mt-3 text-xl font-semibold text-ink-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink-700">{item.note}</p>
                <Link
                  href={localizeShareHref(item.href, locale)}
                  className="mt-5 inline-flex items-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                  style={{ color: "var(--paper-strong)" }}
                >
                  {item.actionLabel}
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      </section>
      <AchievementCelebrationToasts toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
