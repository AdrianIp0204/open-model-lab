import { type AppLocale } from "@/i18n/routing";
import { getStarterTracks } from "@/lib/content";
import { getStarterTrackDisplayTitle } from "@/lib/i18n/content";
import { getLocalizedChallengeDiscoveryIndex } from "@/lib/i18n/challenge-discovery";
import type {
  AccountAchievementItemSummary,
  AccountAchievementOverview,
  AchievementStatKey,
  AchievementToastSummary,
} from "./types";

const localizedChallengeAchievementCache = new Map<
  AppLocale,
  Map<string, { title: string; description: string }>
>();
const localizedTrackAchievementCache = new Map<
  AppLocale,
  Map<string, { title: string; description: string }>
>();

const milestoneCopyByStatKey = {
  "concept-visits": {
    titleUnit: { en: "concepts", "zh-HK": "個概念" },
    subject: { en: "concept visits", "zh-HK": "概念造訪" },
  },
  "question-answers": {
    titleUnit: { en: "questions", "zh-HK": "題" },
    subject: { en: "questions answered", "zh-HK": "已回答題目" },
  },
  "challenge-completions": {
    titleUnit: { en: "challenges", "zh-HK": "個挑戰" },
    subject: { en: "challenge modes completed", "zh-HK": "已完成挑戰模式" },
  },
  "track-completions": {
    titleUnit: { en: "tracks", "zh-HK": "條路線" },
    subject: { en: "learning tracks completed", "zh-HK": "已完成學習路線" },
  },
  "active-study-hours": {
    titleUnit: { en: "hours", "zh-HK": "小時" },
    subject: { en: "active study time", "zh-HK": "主動學習時間" },
  },
} satisfies Record<
  AchievementStatKey,
  {
    titleUnit: Record<AppLocale, string>;
    subject: Record<AppLocale, string>;
  }
>;

function parseMilestoneKey(key: string) {
  const match = key.match(/^milestone:([^:]+):(\d+)$/);

  if (!match) {
    return null;
  }

  return {
    statKey: match[1] as AchievementStatKey,
    target: Number(match[2]),
  };
}

function buildLocalizedMilestoneCopy(
  key: string,
  locale: AppLocale,
): { title: string; description: string } | null {
  const parsed = parseMilestoneKey(key);

  if (!parsed) {
    return null;
  }

  const copy = milestoneCopyByStatKey[parsed.statKey];

  if (!copy) {
    return null;
  }

  if (locale === "zh-HK") {
    return {
      title: `${parsed.target} ${copy.titleUnit["zh-HK"]}里程碑`,
      description: `已達到${copy.subject["zh-HK"]}的 ${parsed.target} 門檻。`,
    };
  }

  return {
    title: `${parsed.target} ${copy.titleUnit.en} milestone`,
    description: `Reached the ${parsed.target} mark for ${copy.subject.en}.`,
  };
}

function buildLocalizedChallengeAchievementCache(
  locale: AppLocale,
): Map<string, { title: string; description: string }> {
  const cached = localizedChallengeAchievementCache.get(locale);

  if (cached) {
    return cached;
  }

  const challengeMap = new Map<string, { title: string; description: string }>();

  for (const entry of getLocalizedChallengeDiscoveryIndex(locale).entries) {
    const achievementKey = `challenge:${entry.concept.slug}:${entry.id}`;
    challengeMap.set(
      achievementKey,
      locale === "zh-HK"
        ? {
            title: `完成「${entry.title}」挑戰模式`,
            description: `已在「${entry.concept.title}」完成「${entry.title}」挑戰。`,
          }
        : {
            title: `Completed ${entry.title} challenge mode`,
            description: `Solved the ${entry.title} challenge on ${entry.concept.title}.`,
          },
    );
  }

  localizedChallengeAchievementCache.set(locale, challengeMap);
  return challengeMap;
}

function buildLocalizedTrackAchievementCache(
  locale: AppLocale,
): Map<string, { title: string; description: string }> {
  const cached = localizedTrackAchievementCache.get(locale);

  if (cached) {
    return cached;
  }

  const trackMap = new Map<string, { title: string; description: string }>();

  for (const track of getStarterTracks()) {
    const localizedTitle = getStarterTrackDisplayTitle(track, locale);
    trackMap.set(
      `track:${track.slug}`,
      locale === "zh-HK"
        ? {
            title: `完成「${localizedTitle}」入門路徑`,
            description: `已完成「${localizedTitle}」的完整編排學習流程。`,
          }
        : {
            title: `Completed ${localizedTitle} learning track`,
            description: `Finished the full authored flow for ${localizedTitle}.`,
          },
    );
  }

  localizedTrackAchievementCache.set(locale, trackMap);
  return trackMap;
}

function localizeAchievementItemSummary<
  T extends AccountAchievementItemSummary | AchievementToastSummary,
>(item: T, locale: AppLocale): T {
  if (locale === "en") {
    return item;
  }

  if (item.kind === "milestone") {
    const localizedMilestoneCopy = buildLocalizedMilestoneCopy(item.key, locale);

    if (localizedMilestoneCopy) {
      return {
        ...item,
        ...localizedMilestoneCopy,
      };
    }
  }

  if (item.kind === "challenge") {
    const localizedChallengeCopy = buildLocalizedChallengeAchievementCache(locale).get(item.key);

    if (localizedChallengeCopy) {
      return {
        ...item,
        ...localizedChallengeCopy,
      };
    }
  }

  if (item.kind === "track") {
    const localizedTrackCopy = buildLocalizedTrackAchievementCache(locale).get(item.key);

    if (localizedTrackCopy) {
      return {
        ...item,
        ...localizedTrackCopy,
      };
    }
  }

  return item;
}

export function localizeAchievementOverview(
  overview: AccountAchievementOverview,
  locale: AppLocale,
): AccountAchievementOverview {
  if (locale === "en") {
    return overview;
  }

  return {
    ...overview,
    milestoneGroups: overview.milestoneGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => localizeAchievementItemSummary(item, locale)),
    })),
    namedGroups: overview.namedGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => localizeAchievementItemSummary(item, locale)),
    })),
  };
}

export function localizeAchievementToasts(
  toasts: AchievementToastSummary[],
  locale: AppLocale,
): AchievementToastSummary[] {
  if (locale === "en") {
    return toasts;
  }

  return toasts.map((toast) => localizeAchievementItemSummary(toast, locale));
}
