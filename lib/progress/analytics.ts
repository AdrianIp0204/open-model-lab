import type { AchievementStats } from "@/lib/achievements";
import type { AppLocale } from "@/i18n/routing";
import {
  getConceptDisplayTitle,
  getStarterTrackDisplayTitle,
  getTopicDisplayTitle,
} from "@/lib/i18n/content";
import {
  getTopicPath,
  type ConceptRecommendation,
  type GuidedCollectionSummary,
  type StarterTrackSummary,
  type SubjectDiscoverySummary,
  type TopicDiscoverySummary,
  type ConceptSummary as BaseConceptSummary,
} from "@/lib/content";
import {
  getCompletedChallengeCount,
  getConceptProgressSummary,
  selectContinueLearning,
  type ConceptProgressSummary,
  type ProgressSnapshot,
} from "./model";
import { localizeShareHref } from "@/lib/share-links";
import { getNextRecommendedConcept, selectCurrentTrack } from "./continue-learning-state";
import {
  buildPremiumAdaptiveReviewSummary,
  type PremiumAdaptiveReviewSummary,
} from "./premium-adaptive-review";
import {
  buildPremiumCheckpointHistoryView,
  type PremiumCheckpointHistoryView,
  type ProgressHistoryStore,
} from "./history";
import { selectAdaptiveReviewQueue } from "./review-queue";
import { buildTopicStarterTrackRecommendations } from "./track-recommendations";
import { getStarterTrackPrimaryAction } from "./tracks";

const DEFAULT_ANALYTICS_LOCALE: AppLocale = "en";

export type LearningAnalyticsConceptSummary = BaseConceptSummary & {
  recommendedNext?: ConceptRecommendation[];
};

export type LearningAnalyticsMetric = {
  label: string;
  value: string;
  note: string;
};

export type LearningAnalyticsTopicInsight = {
  topicSlug: string;
  title: string;
  statusLabel: "Strongest" | "Building" | "Needs work";
  reasons: string[];
  href: string;
};

export type LearningAnalyticsNextStep = {
  id: string;
  title: string;
  why: string;
  href: string;
  actionLabel: string;
};

export type LearningAnalyticsCoverageItem = {
  topicSlug: string;
  title: string;
  activityLabel: string;
  detail: string;
  progressRatio: number;
};

export type PremiumLearningAnalytics = {
  hasRecordedProgress: boolean;
  usageSnapshot: {
    achievementMetrics: LearningAnalyticsMetric[];
    progressMetrics: LearningAnalyticsMetric[];
  };
  checkpointHistory: PremiumCheckpointHistoryView;
  strengths: LearningAnalyticsTopicInsight[];
  needsWork: LearningAnalyticsTopicInsight[];
  adaptiveReview: PremiumAdaptiveReviewSummary;
  nextSteps: LearningAnalyticsNextStep[];
  coverage: LearningAnalyticsCoverageItem[];
  methodologyNote: string;
};

type TopicAggregate = {
  topic: TopicDiscoverySummary;
  conceptProgress: ConceptProgressSummary[];
  startedCount: number;
  completedCount: number;
  solidCount: number;
  shakyCount: number;
  practicedCount: number;
  completedQuickTestCount: number;
  solvedChallengeConceptCount: number;
  missedCheckCount: number;
  unfinishedCount: number;
  reviewPressureCount: number;
  startedChallengeCount: number;
  activityCount: number;
  strengthScore: number;
  needsWorkScore: number;
};

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatHours(value: number, locale: AppLocale) {
  const formatted = value.toFixed(Number.isInteger(value) || value >= 10 ? 0 : 1);
  return locale === "zh-HK" ? `${formatted} 小時` : `${formatted} hours`;
}

function formatInteger(value: number) {
  return `${Math.floor(value)}`;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return values.filter((value, index, allValues): value is string => {
    return Boolean(value) && allValues.indexOf(value) === index;
  });
}

function buildTopicByConceptSlug(topics: TopicDiscoverySummary[]) {
  const topicByConceptSlug = new Map<string, TopicDiscoverySummary>();

  for (const topic of topics) {
    for (const concept of topic.concepts) {
      topicByConceptSlug.set(concept.slug, topic);
    }
  }

  return topicByConceptSlug;
}

function buildUsageSnapshot(input: {
  achievementStats: AchievementStats;
  conceptProgress: ConceptProgressSummary[];
}, locale: AppLocale) {
  const startedCount = input.conceptProgress.filter((item) => item.status !== "not-started").length;
  const completedCount = input.conceptProgress.filter((item) => item.status === "completed").length;
  const solvedChallengeConceptCount = input.conceptProgress.filter(
    (item) => getCompletedChallengeCount(item.record) > 0,
  ).length;
  const completedQuickTestCount = input.conceptProgress.filter(
    (item) => Boolean(item.record?.completedQuickTestAt),
  ).length;
  const predictionUsageCount = input.conceptProgress.filter(
    (item) => Boolean(item.record?.usedPredictionModeAt),
  ).length;
  const compareUsageCount = input.conceptProgress.filter(
    (item) => Boolean(item.record?.usedCompareModeAt),
  ).length;
  const workedExampleUsageCount = input.conceptProgress.filter(
    (item) => Boolean(item.record?.engagedWorkedExampleAt),
  ).length;

  return {
    achievementMetrics: [
      {
        label: locale === "zh-HK" ? "概念造訪" : "Concept visits",
        value: formatInteger(input.achievementStats.conceptVisitCount),
        note:
          locale === "zh-HK"
            ? "由伺服器支援、具實際意義的概念參與次數。"
            : "Server-backed meaningful concept engagements.",
      },
      {
        label: locale === "zh-HK" ? "已回答題目" : "Questions answered",
        value: formatInteger(input.achievementStats.questionAnswerCount),
        note:
          locale === "zh-HK"
            ? "針對獨特小測題目首次提交的答案。"
            : "First submitted answers for unique quick-test questions.",
      },
      {
        label: locale === "zh-HK" ? "挑戰完成" : "Challenge completions",
        value: formatInteger(input.achievementStats.distinctChallengeCompletionCount),
        note:
          locale === "zh-HK"
            ? "這個帳戶上已儲存的不同挑戰模式解答。"
            : "Distinct challenge-mode solves saved on this account.",
      },
      {
        label: locale === "zh-HK" ? "路線完成" : "Track completions",
        value: formatInteger(input.achievementStats.distinctTrackCompletionCount),
        note:
          locale === "zh-HK"
            ? "已完整完成的不同入門路線。"
            : "Distinct starter tracks fully completed.",
      },
      {
        label: locale === "zh-HK" ? "主動學習時間" : "Active study hours",
        value: formatHours(input.achievementStats.activeStudySeconds / 3600, locale),
        note:
          locale === "zh-HK"
            ? "只計算看得見且有互動的已登入學習時間。"
            : "Visible, engaged signed-in study time only.",
      },
    ],
    progressMetrics: [
      {
        label: locale === "zh-HK" ? "已開始概念" : "Concepts started",
        value: formatInteger(startedCount),
        note:
          locale === "zh-HK"
            ? "這個帳戶上已有已儲存進度的概念。"
            : "Concepts with saved progress on this account.",
      },
      {
        label: locale === "zh-HK" ? "已完成概念" : "Concepts completed",
        value: formatInteger(completedCount),
        note:
          locale === "zh-HK"
            ? "在已儲存進度中被標記為完成的概念。"
            : "Concepts marked complete in saved progress.",
      },
      {
        label: locale === "zh-HK" ? "有挑戰解答的概念" : "Solved challenge concepts",
        value: formatInteger(solvedChallengeConceptCount),
        note:
          locale === "zh-HK"
            ? "至少已有一個已儲存挑戰解答的概念。"
            : "Concepts with at least one saved challenge solve.",
      },
      {
        label: locale === "zh-HK" ? "已完成小測概念" : "Quick-test concepts",
        value: formatInteger(completedQuickTestCount),
        note:
          locale === "zh-HK"
            ? "已完成小測的概念。"
            : "Concepts with a finished quick test.",
      },
      {
        label: locale === "zh-HK" ? "學習工具使用次數" : "Study-tool touches",
        value: formatInteger(
          predictionUsageCount + compareUsageCount + workedExampleUsageCount,
        ),
        note:
          locale === "zh-HK"
            ? `預測 ${predictionUsageCount} 次、比較 ${compareUsageCount} 次、範例演算 ${workedExampleUsageCount} 次。`
            : `Prediction ${predictionUsageCount}, Compare ${compareUsageCount}, Worked examples ${workedExampleUsageCount}.`,
      },
    ],
  };
}

function buildTopicAggregates(input: {
  conceptProgress: ConceptProgressSummary[];
  topicSummaries: TopicDiscoverySummary[];
  reviewQueueConceptSlugs: Set<string>;
}) {
  const topicByConceptSlug = buildTopicByConceptSlug(input.topicSummaries);
  const conceptProgressByTopicSlug = new Map<string, ConceptProgressSummary[]>();

  for (const progress of input.conceptProgress) {
    const topic = topicByConceptSlug.get(progress.concept.slug);

    if (!topic) {
      continue;
    }

    const current = conceptProgressByTopicSlug.get(topic.slug) ?? [];
    current.push(progress);
    conceptProgressByTopicSlug.set(topic.slug, current);
  }

  return input.topicSummaries.map((topic) => {
    const conceptProgress = conceptProgressByTopicSlug.get(topic.slug) ?? [];
    const startedCount = conceptProgress.filter((item) => item.status !== "not-started").length;
    const completedCount = conceptProgress.filter((item) => item.status === "completed").length;
    const solidCount = conceptProgress.filter((item) => item.mastery.state === "solid").length;
    const shakyCount = conceptProgress.filter((item) => item.mastery.state === "shaky").length;
    const practicedCount = conceptProgress.filter(
      (item) => item.mastery.state === "practiced",
    ).length;
    const completedQuickTestCount = conceptProgress.filter(
      (item) => Boolean(item.record?.completedQuickTestAt),
    ).length;
    const solvedChallengeConceptCount = conceptProgress.filter(
      (item) => getCompletedChallengeCount(item.record) > 0,
    ).length;
    const missedCheckCount = conceptProgress.filter(
      (item) => (item.record?.quickTestLastIncorrectCount ?? 0) > 0,
    ).length;
    const unfinishedCount = conceptProgress.filter((item) => item.isUnfinished).length;
    const reviewPressureCount = conceptProgress.filter((item) =>
      input.reviewQueueConceptSlugs.has(item.concept.slug),
    ).length;
    const startedChallengeCount = conceptProgress.filter(
      (item) =>
        Object.keys(item.record?.startedChallenges ?? {}).length > 0 &&
        getCompletedChallengeCount(item.record) === 0,
    ).length;
    const activityCount = conceptProgress.filter(
      (item) => item.status !== "not-started" || item.lastActivityAt,
    ).length;

    return {
      topic,
      conceptProgress,
      startedCount,
      completedCount,
      solidCount,
      shakyCount,
      practicedCount,
      completedQuickTestCount,
      solvedChallengeConceptCount,
      missedCheckCount,
      unfinishedCount,
      reviewPressureCount,
      startedChallengeCount,
      activityCount,
      strengthScore:
        solidCount * 6 +
        completedCount * 3 +
        solvedChallengeConceptCount * 3 +
        completedQuickTestCount * 2 -
        reviewPressureCount * 3 -
        missedCheckCount * 2 -
        unfinishedCount,
      needsWorkScore:
        reviewPressureCount * 4 +
        missedCheckCount * 3 +
        unfinishedCount * 2 +
        shakyCount +
        practicedCount -
        solidCount * 2 -
        completedCount,
    } satisfies TopicAggregate;
  });
}

function buildStrengthReasons(topic: TopicAggregate, locale: AppLocale) {
  return uniqueStrings([
    topic.solidCount > 0
      ? locale === "zh-HK"
        ? `${topic.solidCount} 個概念已經相當穩固。`
        : `${pluralize(topic.solidCount, "concept")} already look solid.`
      : null,
    topic.solvedChallengeConceptCount > 0
      ? locale === "zh-HK"
        ? `${topic.solvedChallengeConceptCount} 個概念已儲存挑戰解答。`
        : `Solved challenges are saved on ${pluralize(topic.solvedChallengeConceptCount, "concept")}.`
      : null,
    topic.completedQuickTestCount > 0
      ? locale === "zh-HK"
        ? `${topic.completedQuickTestCount} 個概念已儲存完成的小測。`
        : `Finished quick tests are saved on ${pluralize(topic.completedQuickTestCount, "concept")}.`
      : null,
    topic.completedCount > 0
      ? locale === "zh-HK"
        ? `${topic.completedCount} 個概念已標記為完成。`
        : `${pluralize(topic.completedCount, "concept")} are already marked complete.`
      : null,
    topic.reviewPressureCount === 0 && topic.startedCount > 0
      ? locale === "zh-HK"
        ? "這個主題目前沒有任何內容在複習佇列中形成壓力。"
        : "Nothing from this topic is currently pressing in the review queue."
      : null,
  ]).slice(0, 3);
}

function buildNeedsWorkReasons(topic: TopicAggregate, locale: AppLocale) {
  return uniqueStrings([
    topic.reviewPressureCount > 0
      ? locale === "zh-HK"
        ? `${topic.reviewPressureCount} 個來自主題的概念已進入複習佇列。`
        : `${pluralize(topic.reviewPressureCount, "concept")} from this topic are already in the review queue.`
      : null,
    topic.missedCheckCount > 0
      ? locale === "zh-HK"
        ? `${topic.missedCheckCount} 個概念仍有已儲存的小測失誤。`
        : `${pluralize(topic.missedCheckCount, "concept")} still have saved quick-test misses.`
      : null,
    topic.startedChallengeCount > 0
      ? locale === "zh-HK"
        ? `${topic.startedChallengeCount} 個概念仍有未完成且未儲存解答的挑戰。`
        : `${pluralize(topic.startedChallengeCount, "concept")} still have challenge work open without a saved solve.`
      : null,
    topic.unfinishedCount > 0
      ? locale === "zh-HK"
        ? `${topic.unfinishedCount} 個概念已開始但尚未完成。`
        : `${pluralize(topic.unfinishedCount, "concept")} were started but not completed yet.`
      : null,
    topic.shakyCount > 0
      ? locale === "zh-HK"
        ? `${topic.shakyCount} 個概念目前只有一次較強檢查。`
        : `${pluralize(topic.shakyCount, "concept")} only have one stronger check so far.`
      : null,
  ]).slice(0, 3);
}

function buildTopicInsights(topics: TopicAggregate[], locale: AppLocale) {
  const strengths = topics
    .filter(
      (topic) =>
        topic.startedCount > 0 &&
        (topic.solidCount > 0 ||
          topic.completedCount > 0 ||
          topic.solvedChallengeConceptCount > 0 ||
          topic.completedQuickTestCount > 0),
    )
    .sort((left, right) => {
      if (left.strengthScore !== right.strengthScore) {
        return right.strengthScore - left.strengthScore;
      }

      if (left.startedCount !== right.startedCount) {
        return right.startedCount - left.startedCount;
      }

      return left.topic.title.localeCompare(right.topic.title);
    })
    .slice(0, 3)
    .map((topic, index) => ({
      topicSlug: topic.topic.slug,
      title: getTopicDisplayTitle(topic.topic, locale),
      statusLabel:
        index === 0 && (topic.solidCount > 0 || topic.strengthScore >= 8)
          ? "Strongest"
          : "Building",
      reasons: buildStrengthReasons(topic, locale),
      href: localizeShareHref(getTopicPath(topic.topic.slug), locale),
    } satisfies LearningAnalyticsTopicInsight));

  const needsWork = topics
    .filter(
      (topic) =>
        topic.startedCount > 0 &&
        (topic.reviewPressureCount > 0 ||
          topic.missedCheckCount > 0 ||
          topic.unfinishedCount > 0 ||
          topic.shakyCount > 0),
    )
    .sort((left, right) => {
      if (left.needsWorkScore !== right.needsWorkScore) {
        return right.needsWorkScore - left.needsWorkScore;
      }

      if (left.reviewPressureCount !== right.reviewPressureCount) {
        return right.reviewPressureCount - left.reviewPressureCount;
      }

      return left.topic.title.localeCompare(right.topic.title);
    })
    .slice(0, 3)
    .map((topic) => ({
      topicSlug: topic.topic.slug,
      title: getTopicDisplayTitle(topic.topic, locale),
      statusLabel: "Needs work",
      reasons: buildNeedsWorkReasons(topic, locale),
      href: localizeShareHref(getTopicPath(topic.topic.slug), locale),
    } satisfies LearningAnalyticsTopicInsight));

  return {
    strengths,
    needsWork,
  };
}

function buildCoverage(topics: TopicAggregate[], locale: AppLocale) {
  const coveredTopics = topics
    .filter((topic) => topic.activityCount > 0)
    .sort((left, right) => {
      if (left.activityCount !== right.activityCount) {
        return right.activityCount - left.activityCount;
      }

      if (left.completedCount !== right.completedCount) {
        return right.completedCount - left.completedCount;
      }

      return left.topic.title.localeCompare(right.topic.title);
    })
    .slice(0, 6);
  const maxActivityCount = coveredTopics[0]?.activityCount ?? 1;

  return coveredTopics.map((topic) => ({
    topicSlug: topic.topic.slug,
    title: getTopicDisplayTitle(topic.topic, locale),
    activityLabel:
      locale === "zh-HK"
        ? `${topic.startedCount} 個概念已開始`
        : `${pluralize(topic.startedCount, "concept")} started`,
    detail: uniqueStrings([
      topic.completedCount > 0
        ? locale === "zh-HK"
          ? `${topic.completedCount} 個已完成`
          : `${pluralize(topic.completedCount, "concept")} completed`
        : null,
      topic.solidCount > 0
        ? locale === "zh-HK"
          ? `${topic.solidCount} 個穩固`
          : `${pluralize(topic.solidCount, "concept")} solid`
        : null,
      topic.reviewPressureCount > 0
        ? locale === "zh-HK"
          ? `${topic.reviewPressureCount} 個在複習中`
          : `${pluralize(topic.reviewPressureCount, "concept")} in review`
        : null,
    ]).join(locale === "zh-HK" ? " · " : " | "),
    progressRatio: Math.max(0.08, topic.activityCount / maxActivityCount),
  }));
}

function buildNextSteps(input: {
  snapshot: ProgressSnapshot;
  concepts: LearningAnalyticsConceptSummary[];
  starterTracks: StarterTrackSummary[];
  topicSummaries: TopicDiscoverySummary[];
  guidedCollections: GuidedCollectionSummary[];
  weakestTopic: LearningAnalyticsTopicInsight | null;
  locale: AppLocale;
}) {
  const steps: LearningAnalyticsNextStep[] = [];
  const seenHrefs = new Set<string>();
  const conceptsBySlug = new Map(input.concepts.map((concept) => [concept.slug, concept] as const));
  const continueLearning = selectContinueLearning(input.snapshot, input.concepts, 2);
  const currentConcept =
    conceptsBySlug.get(continueLearning.primary?.concept.slug ?? "") ?? null;
  const primaryResurfacingCue = currentConcept
    ? getConceptProgressSummary(input.snapshot, currentConcept)
    : null;
  const reviewQueue = selectAdaptiveReviewQueue(
    input.snapshot,
    input.concepts,
    input.starterTracks,
    input.concepts.length,
    {
      allConcepts: input.concepts,
      guidedCollections: input.guidedCollections,
      locale: input.locale,
    },
  );
  const currentTrack = selectCurrentTrack(input.snapshot, input.starterTracks, input.locale);
  const currentTrackAction = currentTrack
    ? getStarterTrackPrimaryAction(currentTrack.track, currentTrack.progress, input.locale)
    : null;
  const nextRecommendation = getNextRecommendedConcept(
    currentConcept,
    conceptsBySlug,
    input.snapshot,
    input.locale,
  );
  const topicBySlug = new Map(input.topicSummaries.map((topic) => [topic.slug, topic] as const));
  const topicByConceptSlug = buildTopicByConceptSlug(input.topicSummaries);
  const weakestTopicSummary = input.weakestTopic
    ? topicBySlug.get(input.weakestTopic.topicSlug) ?? null
    : currentConcept
      ? topicByConceptSlug.get(currentConcept.slug) ?? null
      : null;
  const topicTrackRecommendation = weakestTopicSummary
    ? buildTopicStarterTrackRecommendations(input.snapshot, weakestTopicSummary, {
        actionableOnly: true,
        excludeTrackSlugs: currentTrack ? [currentTrack.track.slug] : [],
      }, input.locale)[0] ?? null
    : null;

  function addStep(step: LearningAnalyticsNextStep | null) {
    if (!step || seenHrefs.has(step.href) || steps.length >= 4) {
      return;
    }

    seenHrefs.add(step.href);
    steps.push(step);
  }

  addStep(
    continueLearning.primary
      ? {
          id: `continue:${continueLearning.primary.concept.slug}`,
          title: getConceptDisplayTitle(
            {
              slug: continueLearning.primary.concept.slug,
              title:
                continueLearning.primary.concept.title ??
                continueLearning.primary.concept.slug,
            },
            input.locale,
          ),
          why:
            primaryResurfacingCue?.mastery.note ??
            (input.locale === "zh-HK"
              ? "這仍然是最適合從已儲存進度接續的概念。"
              : "This is still the clearest concept to resume from saved progress."),
          href: localizeShareHref(`/concepts/${continueLearning.primary.concept.slug}`, input.locale),
          actionLabel: input.locale === "zh-HK" ? "繼續概念" : "Resume concept",
        }
      : null,
  );

  addStep(
    reviewQueue[0]
      ? {
          id: `review:${reviewQueue[0].concept.slug}`,
          title: getConceptDisplayTitle(reviewQueue[0].concept, input.locale),
          why: reviewQueue[0].reason,
          href: reviewQueue[0].primaryAction.href,
          actionLabel: reviewQueue[0].primaryAction.label,
        }
      : null,
  );

  addStep(
    nextRecommendation
      ? {
          id: `recommended:${nextRecommendation.concept.slug}`,
          title: getConceptDisplayTitle(nextRecommendation.concept, input.locale),
          why: nextRecommendation.note,
          href: localizeShareHref(`/concepts/${nextRecommendation.concept.slug}`, input.locale),
          actionLabel:
            input.locale === "zh-HK" ? "打開推薦概念" : "Open recommended concept",
        }
      : null,
  );

  addStep(
    currentTrack && currentTrackAction
      ? {
          id: `track:${currentTrack.track.slug}`,
          title: getStarterTrackDisplayTitle(currentTrack.track, input.locale),
          why: currentTrackAction.note,
          href: currentTrackAction.href,
          actionLabel: currentTrackAction.label,
        }
      : null,
  );

  addStep(
    topicTrackRecommendation
      ? {
          id: `topic-track:${topicTrackRecommendation.track.slug}`,
          title: getStarterTrackDisplayTitle(topicTrackRecommendation.track, input.locale),
          why: topicTrackRecommendation.note,
          href: topicTrackRecommendation.href,
          actionLabel: topicTrackRecommendation.actionLabel,
        }
      : null,
  );

  if (steps.length) {
    return steps;
  }

  return [
    {
      id: "fallback:concepts",
      title: input.locale === "zh-HK" ? "瀏覽概念" : "Browse concepts",
      why:
        input.locale === "zh-HK"
          ? "分析頁會在有已儲存進度後逐步補齊。先從任何概念開始，建立真實訊號。"
          : "Analytics fill in after saved progress exists. Start with any concept to seed real signals.",
      href: localizeShareHref("/concepts", input.locale),
      actionLabel: input.locale === "zh-HK" ? "瀏覽概念" : "Browse concepts",
    },
    {
      id: "fallback:topics",
      title: input.locale === "zh-HK" ? "瀏覽主題頁" : "Browse topic pages",
      why:
        input.locale === "zh-HK"
          ? "當你想從較大的切入點開始時，主題頁會把相關概念放在一起。"
          : "Topic pages keep related concepts together when you want a broader starting point.",
      href: localizeShareHref("/concepts/topics", input.locale),
      actionLabel: input.locale === "zh-HK" ? "查看主題" : "View topics",
    },
    {
      id: "fallback:challenges",
      title: input.locale === "zh-HK" ? "打開挑戰" : "Open challenges",
      why:
        input.locale === "zh-HK"
          ? "挑戰嘗試與解答會為之後的分析累積更強的已儲存檢查。"
          : "Challenge attempts and solves add stronger saved checks for later analytics.",
      href: localizeShareHref("/challenges", input.locale),
      actionLabel: input.locale === "zh-HK" ? "打開挑戰" : "Open challenges",
    },
  ];
}

export function buildPremiumLearningAnalytics(input: {
  snapshot: ProgressSnapshot;
  history?: ProgressHistoryStore | null;
  achievementStats: AchievementStats;
  concepts: LearningAnalyticsConceptSummary[];
  starterTracks: StarterTrackSummary[];
  subjectSummaries: SubjectDiscoverySummary[];
  topicSummaries: TopicDiscoverySummary[];
  guidedCollections?: GuidedCollectionSummary[];
  locale?: AppLocale;
}) {
  const locale = input.locale ?? DEFAULT_ANALYTICS_LOCALE;
  const conceptProgress = input.concepts.map((concept) =>
    getConceptProgressSummary(input.snapshot, concept),
  );
  const reviewQueue = selectAdaptiveReviewQueue(
    input.snapshot,
    input.concepts,
    input.starterTracks,
    input.concepts.length,
    {
      allConcepts: input.concepts,
      guidedCollections: input.guidedCollections ?? [],
    },
  );
  const topicAggregates = buildTopicAggregates({
    conceptProgress,
    topicSummaries: input.topicSummaries,
    reviewQueueConceptSlugs: new Set(reviewQueue.map((item) => item.concept.slug)),
  });
  const topicInsights = buildTopicInsights(topicAggregates, locale);

  return {
    hasRecordedProgress: conceptProgress.some((item) => item.status !== "not-started"),
    usageSnapshot: buildUsageSnapshot({
      achievementStats: input.achievementStats,
      conceptProgress,
    }, locale),
    checkpointHistory: buildPremiumCheckpointHistoryView({
      snapshot: input.snapshot,
      history: input.history,
      concepts: input.concepts,
      subjects: input.subjectSummaries,
      starterTracks: input.starterTracks,
      locale,
    }),
    strengths: topicInsights.strengths,
    needsWork: topicInsights.needsWork,
    adaptiveReview: buildPremiumAdaptiveReviewSummary({
      snapshot: input.snapshot,
      concepts: input.concepts,
      starterTracks: input.starterTracks,
      guidedCollections: input.guidedCollections ?? [],
      limit: 3,
      locale,
    }),
    nextSteps: buildNextSteps({
      snapshot: input.snapshot,
      concepts: input.concepts,
      starterTracks: input.starterTracks,
      topicSummaries: input.topicSummaries,
      guidedCollections: input.guidedCollections ?? [],
      weakestTopic: topicInsights.needsWork[0] ?? null,
      locale,
    }),
    coverage: buildCoverage(topicAggregates, locale),
    methodologyNote:
      locale === "zh-HK"
        ? "這些分析來自已儲存進度、同步檢查點與掌握度歷程、複習佇列優先次序、入門路線脈絡、作者撰寫的下一步建議，以及伺服器端成就統計。它們不使用隱藏分數。"
        : "These analytics come from saved progress, synced checkpoint and mastery history, review-queue priorities, starter-track context, authored recommended-next links, and server-backed achievement counters. They do not use hidden scoring.",
  } satisfies PremiumLearningAnalytics;
}
