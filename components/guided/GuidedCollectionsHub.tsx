"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type {
  GuidedCollectionSummary,
  RecommendedGoalPathSummary,
} from "@/lib/content";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  getGuidedCollectionProgressSummary,
  buildRecommendedGoalPathProgressSummary,
  resolveAccountProgressSnapshot,
  useProgressSnapshot,
  type ProgressSnapshot,
} from "@/lib/progress";
import { localizeRecommendedGoalPath } from "@/lib/i18n/content";
import { DisclosurePanel } from "@/components/layout/DisclosurePanel";
import { GuidedCollectionCard } from "./GuidedCollectionCard";
import { RecommendedGoalPathList } from "./RecommendedGoalPathList";

type GuidedCollectionsHubProps = {
  guidedCollections: GuidedCollectionSummary[];
  goalPaths: RecommendedGoalPathSummary[];
  initialSyncedSnapshot?: ProgressSnapshot | null;
};

const goalPathStatusPriority = {
  "in-progress": 0,
  "not-started": 1,
  completed: 2,
} as const;

const collectionStatusPriority = {
  "in-progress": 0,
  "not-started": 1,
  completed: 2,
} as const;

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

function getGoalPathSummaryLine(
  locale: AppLocale,
  summary: ReturnType<typeof buildRecommendedGoalPathProgressSummary>,
) {
  if (summary.status === "completed") {
    return copyText(
      locale,
      `Completed ${summary.completedStepCount} of ${summary.totalSteps} steps.`,
      `已完成 ${summary.completedStepCount} / ${summary.totalSteps} 個步驟。`,
    );
  }

  if (summary.status === "in-progress") {
    return copyText(
      locale,
      `In progress with ${summary.completedStepCount} of ${summary.totalSteps} steps complete.`,
      `進行中，已完成 ${summary.completedStepCount} / ${summary.totalSteps} 個步驟。`,
    );
  }

  return copyText(
    locale,
    `${summary.totalSteps} steps across ${summary.goalPath.conceptCount} concepts.`,
    `${summary.totalSteps} 個步驟，涵蓋 ${summary.goalPath.conceptCount} 個概念。`,
  );
}

function getCollectionSummaryLine(
  locale: AppLocale,
  summary: ReturnType<typeof getGuidedCollectionProgressSummary>,
) {
  if (summary.status === "completed") {
    return copyText(
      locale,
      `Completed ${summary.completedStepCount} of ${summary.totalSteps} steps.`,
      `已完成 ${summary.completedStepCount} / ${summary.totalSteps} 個步驟。`,
    );
  }

  if (summary.status === "in-progress") {
    return copyText(
      locale,
      `In progress with ${summary.completedStepCount} of ${summary.totalSteps} steps complete.`,
      `進行中，已完成 ${summary.completedStepCount} / ${summary.totalSteps} 個步驟。`,
    );
  }

  return copyText(
    locale,
    `${summary.totalSteps} steps across ${summary.totalConcepts} concepts.`,
    `${summary.totalSteps} 個步驟，涵蓋 ${summary.totalConcepts} 個概念。`,
  );
}

export function GuidedCollectionsHub({
  guidedCollections,
  goalPaths,
  initialSyncedSnapshot = null,
}: GuidedCollectionsHubProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("GuidedCollectionsPage");
  const localSnapshot = useProgressSnapshot();
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const snapshot = progressDisplay.snapshot;

  const goalPathSummaries = useMemo(
    () =>
      goalPaths
        .map((goalPath) =>
          buildRecommendedGoalPathProgressSummary(
            snapshot,
            localizeRecommendedGoalPath(goalPath, locale),
            locale,
          ),
        )
        .sort((left, right) => {
          const statusDelta =
            goalPathStatusPriority[left.status] - goalPathStatusPriority[right.status];

          if (statusDelta !== 0) {
            return statusDelta;
          }

          const leftActivity = left.lastActivityAt ?? "";
          const rightActivity = right.lastActivityAt ?? "";

          if (leftActivity !== rightActivity) {
            return rightActivity.localeCompare(leftActivity);
          }

          return (left.goalPath.sequence ?? Number.MAX_SAFE_INTEGER) -
            (right.goalPath.sequence ?? Number.MAX_SAFE_INTEGER);
        }),
    [goalPaths, locale, snapshot],
  );

  const collectionSummaries = useMemo(
    () =>
      guidedCollections
        .map((collection) => getGuidedCollectionProgressSummary(snapshot, collection, locale))
        .sort((left, right) => {
          const statusDelta =
            collectionStatusPriority[left.status] - collectionStatusPriority[right.status];

          if (statusDelta !== 0) {
            return statusDelta;
          }

          const leftActivity = left.lastActivityAt ?? "";
          const rightActivity = right.lastActivityAt ?? "";

          if (leftActivity !== rightActivity) {
            return rightActivity.localeCompare(leftActivity);
          }

          return (left.collection.sequence ?? Number.MAX_SAFE_INTEGER) -
            (right.collection.sequence ?? Number.MAX_SAFE_INTEGER);
        }),
    [guidedCollections, locale, snapshot],
  );

  const primaryGoalPath = goalPathSummaries[0] ?? null;
  const featuredCollection =
    (primaryGoalPath?.goalPath.relatedCollections[0]
      ? collectionSummaries.find(
          (summary) =>
            summary.collection.slug === primaryGoalPath.goalPath.relatedCollections[0]?.slug,
        ) ?? null
      : null) ??
    collectionSummaries[0] ??
    null;

  const lessonSets = collectionSummaries.filter(
    (summary) => summary.collection.format === "lesson-set",
  );
  const playlists = collectionSummaries.filter(
    (summary) => summary.collection.format === "playlist",
  );

  return (
    <section className="space-y-6 sm:space-y-7">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <article className="page-hero-surface p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="lab-label">{t("hero.eyebrow")}</span>
              <span className="progress-pill text-sm">
                {copyText(
                  locale,
                  progressDisplay.source === "merged"
                    ? "Local + synced progress"
                    : progressDisplay.source === "synced"
                      ? "Synced progress"
                      : "Local-first progress",
                  progressDisplay.source === "merged"
                    ? "本機 + 同步進度"
                    : progressDisplay.source === "synced"
                      ? "同步進度"
                      : "本機優先進度",
                )}
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="max-w-4xl text-[2.15rem] font-semibold leading-[0.98] text-ink-950 sm:text-[2.85rem]">
                {t("hero.title")}
              </h1>
              <p className="max-w-3xl text-base leading-7 text-ink-700 sm:text-lg sm:leading-8">
                {t("hero.description")}
              </p>
            </div>

            {primaryGoalPath ? (
              <div className="rounded-[26px] border border-sky-500/20 bg-sky-500/10 p-4 sm:p-5">
                <p className="lab-label">
                  {copyText(
                    locale,
                    primaryGoalPath.status === "in-progress"
                      ? "Continue the guided path already in motion"
                      : "Recommended guided start",
                    primaryGoalPath.status === "in-progress"
                      ? "繼續目前已在進行中的引導路徑"
                      : "建議的引導起步路徑",
                  )}
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-ink-950">
                  {primaryGoalPath.goalPath.title}
                </h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={primaryGoalPath.primaryAction.href}
                    className="cta-primary"
                    data-testid="guided-primary-cta"
                  >
                    {primaryGoalPath.primaryAction.label}
                  </Link>
                  <Link href="#guided-browser" className="cta-secondary">
                    {copyText(locale, "Browse all collections", "瀏覽所有集合")}
                  </Link>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-700">
                  {primaryGoalPath.primaryActionNote}
                </p>
                <p className="mt-2 hidden text-sm leading-6 text-ink-600 sm:block">
                  {getGoalPathSummaryLine(locale, primaryGoalPath)}
                </p>
              </div>
            ) : null}
          </div>
        </article>

        <aside className="page-band p-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="lab-label">
                {copyText(locale, "Featured collection", "精選集合")}
              </p>
              <h2 className="text-2xl font-semibold text-ink-950">
                {copyText(
                  locale,
                  "Open one compact collection when you want the sequence picked for you.",
                  "當你想直接沿著一個已選好的順序學下去時，就先打開這個精選集合。",
                )}
              </h2>
              <p className="text-sm leading-6 text-ink-700">
                {copyText(
                  locale,
                  "Collections stay short on purpose. They frame the next few moves without turning the product into a second course shell.",
                  "這些集合刻意保持短小，只負責把接下來幾步講清楚，而不會把產品變成另一套課程外殼。",
                )}
              </p>
            </div>

            {featuredCollection ? (
              <GuidedCollectionCard
                collection={featuredCollection.collection}
                variant="guided-hub"
                statusNote={getCollectionSummaryLine(locale, featuredCollection)}
              />
            ) : null}
          </div>
        </aside>
      </section>

      <section>
        <DisclosurePanel
          title={copyText(locale, "Goal-based guided paths", "按目標整理的引導路徑")}
          summary={copyText(
            locale,
            "Keep the first scan short, then open the authored paths only when you need a clearer objective.",
            "先把第一眼要看的內容縮短；當你真的需要更明確的學習目標時，再展開這些作者編排好的路徑。",
          )}
        >
          <div className="space-y-4">
            <RecommendedGoalPathList
              goalPaths={goalPathSummaries.slice(0, 3).map((summary) => summary.goalPath)}
              initialSyncedSnapshot={initialSyncedSnapshot}
              variant="guided-hub"
            />

            {goalPathSummaries.length > 3 ? (
              <details className="rounded-[22px] border border-line bg-paper px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-semibold text-ink-900">
                  {copyText(
                    locale,
                    `Show ${goalPathSummaries.length - 3} more guided paths`,
                    `顯示另外 ${goalPathSummaries.length - 3} 條引導路徑`,
                  )}
                </summary>
                <div className="mt-4">
                  <RecommendedGoalPathList
                    goalPaths={goalPathSummaries.slice(3).map((summary) => summary.goalPath)}
                    initialSyncedSnapshot={initialSyncedSnapshot}
                    variant="guided-hub"
                  />
                </div>
              </details>
            ) : null}
          </div>
        </DisclosurePanel>
      </section>

      <section id="guided-browser">
        <DisclosurePanel
          title={copyText(locale, "Guided collections by format", "按格式整理的引導集合")}
          summary={copyText(
            locale,
            "Lesson sets and playlists stay grouped so the page reads like a guided entry point instead of a flat CMS export.",
            "把課程集與播放清單分開呈現，這個頁面就會更像一個清楚的引導入口，而不是平鋪直敘的內容匯出頁。",
          )}
        >
          <div className="space-y-6">
            {[
              {
                key: "lesson-set",
                title: copyText(locale, "Lesson sets", "課程集"),
                summary: copyText(
                  locale,
                  "Use these when you want a short authored sequence with one obvious next move at each step.",
                  "如果你想沿著一個短而明確的作者順序前進，而且每一步都只有一個清楚的下一步，就先看這些課程集。",
                ),
                items: lessonSets,
              },
              {
                key: "playlist",
                title: copyText(locale, "Playlists", "播放清單"),
                summary: copyText(
                  locale,
                  "Use these when you want a looser bundle of related simulations without the full topic-map overhead.",
                  "如果你想用一組相關模擬做較輕量的探索，而不需要完整主題地圖的前置負擔，就先看這些播放清單。",
                ),
                items: playlists,
              },
            ]
              .filter((group) => group.items.length > 0)
              .map((group) => (
                <div key={group.key} className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold text-ink-950">{group.title}</h3>
                    <p className="text-sm leading-6 text-ink-700">{group.summary}</p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    {group.items.slice(0, 2).map((summary) => (
                      <GuidedCollectionCard
                        key={summary.collection.slug}
                        collection={summary.collection}
                        variant="guided-hub"
                        statusNote={getCollectionSummaryLine(locale, summary)}
                      />
                    ))}
                  </div>

                  {group.items.length > 2 ? (
                    <details className="rounded-[22px] border border-line bg-paper px-4 py-3">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-ink-900">
                        {copyText(
                          locale,
                          `Show ${group.items.length - 2} more ${group.title.toLowerCase()}`,
                          `顯示另外 ${group.items.length - 2} 個${group.title}`,
                        )}
                      </summary>
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        {group.items.slice(2).map((summary) => (
                          <GuidedCollectionCard
                            key={summary.collection.slug}
                            collection={summary.collection}
                            variant="guided-hub"
                            statusNote={getCollectionSummaryLine(locale, summary)}
                          />
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
              ))}
          </div>
        </DisclosurePanel>
      </section>
    </section>
  );
}
