import type { StarterTrackSummary, TopicDiscoverySummary } from "@/lib/content";
import type { AppLocale } from "@/i18n/routing";
import {
  getStarterTrackDisplayTitle,
  getTopicDisplayTitleFromValue,
} from "@/lib/i18n/content";
import { buildTrackCompletionHref, localizeShareHref } from "@/lib/share-links";
import type { ProgressSnapshot } from "./model";
import {
  getStarterTrackPrimaryAction,
  getStarterTrackProgressSummary,
  type StarterTrackProgressSummary,
} from "./tracks";

export type StarterTrackRecommendationSummary = {
  track: StarterTrackSummary;
  progress: StarterTrackProgressSummary;
  relationshipLabel: string;
  note: string;
  href: string;
  actionLabel: string;
};

type RecommendationContext =
  | {
      kind: "prerequisite";
      title: string;
      relationshipLabel: string;
    }
  | {
      kind: "topic";
      title: string;
      relationshipLabel: string;
    };

type TopicRecommendationOptions = {
  excludeTrackSlugs?: string[];
  actionableOnly?: boolean;
};

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

function buildRecommendationAction(
  track: StarterTrackSummary,
  progress: StarterTrackProgressSummary,
  locale: AppLocale = "en",
) {
  const localizedTrackTitle = getStarterTrackDisplayTitle(track, locale);

  if (progress.status === "completed") {
    return {
      href: buildTrackCompletionHref(track.slug, locale),
      actionLabel: copyText(
        locale,
        `Review ${localizedTrackTitle}`,
        `重溫 ${localizedTrackTitle}`,
      ),
    };
  }

  return {
    href: localizeShareHref(`/tracks/${track.slug}`, locale),
    actionLabel:
      progress.status === "in-progress"
        ? copyText(
            locale,
            `Continue ${localizedTrackTitle}`,
            `繼續 ${localizedTrackTitle}`,
          )
        : copyText(
            locale,
            `Start ${localizedTrackTitle}`,
            `開始 ${localizedTrackTitle}`,
          ),
  };
}

function buildRecommendationNote(
  context: RecommendationContext,
  track: StarterTrackSummary,
  progress: StarterTrackProgressSummary,
  locale: AppLocale = "en",
) {
  const localizedTrackTitle = getStarterTrackDisplayTitle(track, locale);
  const primaryAction = getStarterTrackPrimaryAction(track, progress, locale);

  if (context.kind === "prerequisite") {
    if (progress.status === "completed") {
      return copyText(
        locale,
        `${localizedTrackTitle} is the authored prerequisite for ${context.title}. It is already complete on this browser.`,
        `${localizedTrackTitle} 是 ${context.title} 的作者編排前置路徑，而且已在這個瀏覽器中完成。`,
      );
    }

    return copyText(
      locale,
      `${localizedTrackTitle} is the authored prerequisite for ${context.title}. ${primaryAction.note}`,
      `${localizedTrackTitle} 是 ${context.title} 的作者編排前置路徑。${primaryAction.note}`,
    );
  }

  if (progress.status === "completed") {
    return copyText(
      locale,
      `${localizedTrackTitle} is an authored recommended prerequisite for ${context.title}. It is already complete on this browser.`,
      `${localizedTrackTitle} 是 ${context.title} 的作者推薦前置路徑，而且已在這個瀏覽器中完成。`,
    );
  }

  return copyText(
    locale,
    `${localizedTrackTitle} is an authored recommended prerequisite for ${context.title}. ${primaryAction.note}`,
    `${localizedTrackTitle} 是 ${context.title} 的作者推薦前置路徑。${primaryAction.note}`,
  );
}

function buildTrackRecommendation(
  snapshot: ProgressSnapshot,
  track: StarterTrackSummary,
  context: RecommendationContext,
  locale: AppLocale = "en",
): StarterTrackRecommendationSummary {
  const progress = getStarterTrackProgressSummary(snapshot, track, locale);
  const action = buildRecommendationAction(track, progress, locale);

  return {
    track,
    progress,
    relationshipLabel: context.relationshipLabel,
    note: buildRecommendationNote(context, track, progress, locale),
    href: action.href,
    actionLabel: action.actionLabel,
  };
}

export function buildPrerequisiteTrackRecommendations(
  snapshot: ProgressSnapshot,
  currentTrack: StarterTrackSummary,
  prerequisiteTracks: StarterTrackSummary[],
  locale: AppLocale = "en",
) {
  const localizedCurrentTrackTitle = getStarterTrackDisplayTitle(currentTrack, locale);

  return prerequisiteTracks.map((track) =>
    buildTrackRecommendation(
      snapshot,
      track,
      {
        kind: "prerequisite",
        title: localizedCurrentTrackTitle,
        relationshipLabel: copyText(locale, "Prerequisite track", "前置路徑"),
      },
      locale,
    ),
  );
}

export function buildTopicStarterTrackRecommendations(
  snapshot: ProgressSnapshot,
  topic: Pick<TopicDiscoverySummary, "title" | "recommendedStarterTracks">,
  options: TopicRecommendationOptions = {},
  locale: AppLocale = "en",
) {
  const excludedTrackSlugs = new Set(options.excludeTrackSlugs ?? []);
  const localizedTopicTitle = getTopicDisplayTitleFromValue(topic.title, locale);

  return topic.recommendedStarterTracks
    .filter((track) => !excludedTrackSlugs.has(track.slug))
    .map((track) =>
      buildTrackRecommendation(
        snapshot,
        track,
        {
          kind: "topic",
          title: localizedTopicTitle,
          relationshipLabel: copyText(locale, "Recommended prerequisite", "推薦前置路徑"),
        },
        locale,
      ),
    )
    .filter((recommendation) =>
      options.actionableOnly ? recommendation.progress.status !== "completed" : true,
    );
}
