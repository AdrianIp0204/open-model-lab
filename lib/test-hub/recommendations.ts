import {
  getReadNextRecommendations,
  getSubjectDiscoverySummaries,
  getTopicDiscoverySummaries,
  getTopicDiscoverySummaryForConceptSlug,
} from "@/lib/content";
import { getConceptProgressLastActivityAt, type ProgressSnapshot } from "@/lib/progress";
import type { ConceptTestCatalogEntry } from "./catalog";
import type { PackTestCatalogEntry } from "./packs";
import {
  getConceptTestProgressState,
  getPackTestProgressState,
  getTopicTestProgressState,
  type TestHubProgressState,
} from "./progress";
import type { TopicTestCatalogEntry } from "./topic-tests";

export type TestHubSuggestionReasonKind =
  | "recent-test-activity"
  | "recent-study"
  | "next-in-topic"
  | "related-concept"
  | "topic-milestone"
  | "pack-follow-on"
  | "starter";

export type TestHubSuggestionEntry =
  | ConceptTestCatalogEntry
  | TopicTestCatalogEntry
  | PackTestCatalogEntry;

type TestHubSuggestionBase = {
  id: string;
  progress: TestHubProgressState;
  reasonKind: TestHubSuggestionReasonKind;
  sourceConceptSlug?: string;
  sourceTopicSlug?: string;
};

export type TestHubSuggestion =
  | (TestHubSuggestionBase & {
      kind: "concept";
      entry: ConceptTestCatalogEntry;
    })
  | (TestHubSuggestionBase & {
      kind: "topic";
      entry: TopicTestCatalogEntry;
    })
  | (TestHubSuggestionBase & {
      kind: "pack";
      entry: PackTestCatalogEntry;
    });

type BuildPersonalizedSuggestionsInput = {
  conceptEntries: ConceptTestCatalogEntry[];
  topicEntries: TopicTestCatalogEntry[];
  packEntries: PackTestCatalogEntry[];
  snapshot: ProgressSnapshot;
  limit?: number;
};

type RecentConceptActivity = {
  conceptSlug: string;
  lastActivityAt: string;
  conceptEntry: ConceptTestCatalogEntry;
  progress: TestHubProgressState;
};

function buildSuggestionId(entry: TestHubSuggestionEntry) {
  return `suggestion:${entry.kind}:${entry.id}`;
}

function isSuggestionEntryCompleted(
  progress: TestHubProgressState,
) {
  return progress.status === "completed" && !progress.hasStartedAssessmentWithoutCompletion;
}

function collectRecentConceptActivity(
  conceptEntries: ConceptTestCatalogEntry[],
  snapshot: ProgressSnapshot,
) {
  const conceptEntryBySlug = new Map(
    conceptEntries.map((entry) => [entry.conceptSlug, entry] as const),
  );

  return Object.values(snapshot.concepts)
    .map((record) => {
      const conceptEntry = conceptEntryBySlug.get(record.slug);

      if (!conceptEntry) {
        return null;
      }

      const lastActivityAt = getConceptProgressLastActivityAt(record);

      if (!lastActivityAt) {
        return null;
      }

      return {
        conceptSlug: conceptEntry.conceptSlug,
        lastActivityAt,
        conceptEntry,
        progress: getConceptTestProgressState(snapshot, conceptEntry),
      } satisfies RecentConceptActivity;
    })
    .filter((item): item is RecentConceptActivity => Boolean(item))
    .sort((left, right) => right.lastActivityAt.localeCompare(left.lastActivityAt));
}

function buildTopicConceptEntriesMap(
  conceptEntries: ConceptTestCatalogEntry[],
) {
  const conceptEntryBySlug = new Map(
    conceptEntries.map((entry) => [entry.conceptSlug, entry] as const),
  );

  return new Map(
    getTopicDiscoverySummaries().map((topic) => [
      topic.slug,
      topic.concepts
        .map((concept) => conceptEntryBySlug.get(concept.slug))
        .filter((entry): entry is ConceptTestCatalogEntry => Boolean(entry)),
    ]),
  );
}

function getSuggestedPackForTopic(
  packEntries: PackTestCatalogEntry[],
  topicSlug: string,
) {
  return (
    packEntries.find((entry) => entry.includedTopicSlugs.includes(topicSlug)) ?? null
  );
}

function addSuggestion(
  suggestions: TestHubSuggestion[],
  seenSuggestionIds: Set<string>,
  nextSuggestion: TestHubSuggestion | null,
  limit: number,
) {
  if (!nextSuggestion || suggestions.length >= limit) {
    return;
  }

  if (seenSuggestionIds.has(nextSuggestion.id)) {
    return;
  }

  seenSuggestionIds.add(nextSuggestion.id);
  suggestions.push(nextSuggestion);
}

function buildConceptSuggestion(
  entry: ConceptTestCatalogEntry,
  progress: TestHubProgressState,
  reasonKind: TestHubSuggestionReasonKind,
  input?: {
    sourceConceptSlug?: string;
    sourceTopicSlug?: string;
  },
) {
  return {
    id: buildSuggestionId(entry),
    kind: "concept",
    entry,
    progress,
    reasonKind,
    sourceConceptSlug: input?.sourceConceptSlug,
    sourceTopicSlug: input?.sourceTopicSlug,
  } satisfies TestHubSuggestion;
}

function buildTopicSuggestion(
  entry: TopicTestCatalogEntry,
  progress: TestHubProgressState,
  reasonKind: TestHubSuggestionReasonKind,
  input?: {
    sourceTopicSlug?: string;
  },
) {
  return {
    id: buildSuggestionId(entry),
    kind: "topic",
    entry,
    progress,
    reasonKind,
    sourceTopicSlug: input?.sourceTopicSlug,
  } satisfies TestHubSuggestion;
}

function buildPackSuggestion(
  entry: PackTestCatalogEntry,
  progress: TestHubProgressState,
  reasonKind: TestHubSuggestionReasonKind,
  input?: {
    sourceTopicSlug?: string;
  },
) {
  return {
    id: buildSuggestionId(entry),
    kind: "pack",
    entry,
    progress,
    reasonKind,
    sourceTopicSlug: input?.sourceTopicSlug,
  } satisfies TestHubSuggestion;
}

export function buildPersonalizedTestSuggestions({
  conceptEntries,
  topicEntries,
  packEntries,
  snapshot,
  limit = 5,
}: BuildPersonalizedSuggestionsInput) {
  const suggestions: TestHubSuggestion[] = [];
  const seenSuggestionIds = new Set<string>();
  const recentConceptActivity = collectRecentConceptActivity(conceptEntries, snapshot);
  const topicEntryBySlug = new Map(
    topicEntries.map((entry) => [entry.topicSlug, entry] as const),
  );
  const conceptEntryBySlug = new Map(
    conceptEntries.map((entry) => [entry.conceptSlug, entry] as const),
  );
  const topicConceptEntries = buildTopicConceptEntriesMap(conceptEntries);

  const startedConceptSuggestions = conceptEntries
    .map((entry) => ({
      kind: "concept" as const,
      entry,
      progress: getConceptTestProgressState(snapshot, entry),
    }))
    .filter((item) => item.progress.hasStartedAssessmentWithoutCompletion)
    .sort((left, right) =>
      (right.progress.startedAt ?? "").localeCompare(left.progress.startedAt ?? ""),
    );

  const startedTopicSuggestions = topicEntries
    .map((entry) => ({
      kind: "topic" as const,
      entry,
      progress: getTopicTestProgressState(snapshot, entry),
    }))
    .filter((item) => item.progress.hasStartedAssessmentWithoutCompletion)
    .sort((left, right) =>
      (right.progress.startedAt ?? "").localeCompare(left.progress.startedAt ?? ""),
    );

  const startedPackSuggestions = packEntries
    .map((entry) => ({
      kind: "pack" as const,
      entry,
      progress: getPackTestProgressState(snapshot, entry),
    }))
    .filter((item) => item.progress.hasStartedAssessmentWithoutCompletion)
    .sort((left, right) =>
      (right.progress.startedAt ?? "").localeCompare(left.progress.startedAt ?? ""),
    );

  const startedSuggestions = [
    ...startedConceptSuggestions,
    ...startedTopicSuggestions,
    ...startedPackSuggestions,
  ].sort((left, right) =>
    (right.progress.startedAt ?? "").localeCompare(left.progress.startedAt ?? ""),
  );

  for (const item of startedSuggestions) {
    const nextSuggestion =
      item.kind === "concept"
        ? buildConceptSuggestion(item.entry, item.progress, "recent-test-activity", {
            sourceConceptSlug: item.entry.conceptSlug,
          })
        : item.kind === "topic"
          ? buildTopicSuggestion(item.entry, item.progress, "recent-test-activity", {
              sourceTopicSlug: item.entry.topicSlug,
            })
          : buildPackSuggestion(item.entry, item.progress, "recent-test-activity");

    addSuggestion(suggestions, seenSuggestionIds, nextSuggestion, limit);
  }

  for (const activity of recentConceptActivity) {
    if (
      activity.progress.hasStartedAssessmentWithoutCompletion ||
      isSuggestionEntryCompleted(activity.progress)
    ) {
      continue;
    }

    addSuggestion(
      suggestions,
      seenSuggestionIds,
      buildConceptSuggestion(activity.conceptEntry, activity.progress, "recent-study", {
        sourceConceptSlug: activity.conceptSlug,
      }),
      limit,
    );
  }

  for (const activity of recentConceptActivity) {
    const topic = getTopicDiscoverySummaryForConceptSlug(activity.conceptSlug);
    const orderedTopicEntries = topicConceptEntries.get(topic.slug) ?? [];
    const currentIndex = orderedTopicEntries.findIndex(
      (entry) => entry.conceptSlug === activity.conceptSlug,
    );
    const nextTopicEntry =
      orderedTopicEntries
        .slice(Math.max(0, currentIndex + 1))
        .find((entry) => !isSuggestionEntryCompleted(getConceptTestProgressState(snapshot, entry))) ??
      orderedTopicEntries.find(
        (entry) => !isSuggestionEntryCompleted(getConceptTestProgressState(snapshot, entry)),
      );

    if (!nextTopicEntry || nextTopicEntry.conceptSlug === activity.conceptSlug) {
      continue;
    }

    addSuggestion(
      suggestions,
      seenSuggestionIds,
      buildConceptSuggestion(
        nextTopicEntry,
        getConceptTestProgressState(snapshot, nextTopicEntry),
        "next-in-topic",
        {
          sourceConceptSlug: activity.conceptSlug,
          sourceTopicSlug: topic.slug,
        },
      ),
      limit,
    );
  }

  for (const activity of recentConceptActivity) {
    for (const recommendation of getReadNextRecommendations(activity.conceptSlug, 3)) {
      const candidateEntry = conceptEntryBySlug.get(recommendation.slug);

      if (!candidateEntry) {
        continue;
      }

      const candidateProgress = getConceptTestProgressState(snapshot, candidateEntry);

      if (candidateProgress.hasStartedAssessmentWithoutCompletion || isSuggestionEntryCompleted(candidateProgress)) {
        continue;
      }

      addSuggestion(
        suggestions,
        seenSuggestionIds,
        buildConceptSuggestion(candidateEntry, candidateProgress, "related-concept", {
          sourceConceptSlug: activity.conceptSlug,
          sourceTopicSlug: getTopicDiscoverySummaryForConceptSlug(candidateEntry.conceptSlug).slug,
        }),
        limit,
      );
    }
  }

  const recentTopics = new Set<string>();

  for (const activity of recentConceptActivity) {
    const topic = getTopicDiscoverySummaryForConceptSlug(activity.conceptSlug);

    if (recentTopics.has(topic.slug)) {
      continue;
    }

    recentTopics.add(topic.slug);
    const topicEntry = topicEntryBySlug.get(topic.slug);

    if (!topicEntry) {
      continue;
    }

    const topicProgress = getTopicTestProgressState(snapshot, topicEntry);

    if (topicProgress.hasStartedAssessmentWithoutCompletion || isSuggestionEntryCompleted(topicProgress)) {
      continue;
    }

    const topicConceptEntriesForTopic = topicConceptEntries.get(topic.slug) ?? [];
    const completedConceptCount = topicConceptEntriesForTopic.filter((entry) =>
      isSuggestionEntryCompleted(getConceptTestProgressState(snapshot, entry)),
    ).length;
    const milestoneThreshold = Math.max(
      2,
      Math.ceil(topicConceptEntriesForTopic.length / 2),
    );

    if (completedConceptCount < milestoneThreshold) {
      continue;
    }

    addSuggestion(
      suggestions,
      seenSuggestionIds,
      buildTopicSuggestion(topicEntry, topicProgress, "topic-milestone", {
        sourceTopicSlug: topic.slug,
      }),
      limit,
    );
  }

  const completedTopicEntries = topicEntries
    .map((entry) => ({
      entry,
      progress: getTopicTestProgressState(snapshot, entry),
    }))
    .filter((item) => item.progress.status === "completed")
    .sort((left, right) =>
      (right.progress.completedAt ?? "").localeCompare(left.progress.completedAt ?? ""),
    );

  for (const item of completedTopicEntries) {
    const packEntry = getSuggestedPackForTopic(packEntries, item.entry.topicSlug);

    if (!packEntry) {
      continue;
    }

    const packProgress = getPackTestProgressState(snapshot, packEntry);

    if (packProgress.hasStartedAssessmentWithoutCompletion || isSuggestionEntryCompleted(packProgress)) {
      continue;
    }

    addSuggestion(
      suggestions,
      seenSuggestionIds,
      buildPackSuggestion(packEntry, packProgress, "pack-follow-on", {
        sourceTopicSlug: item.entry.topicSlug,
      }),
      limit,
    );
  }

  if (suggestions.length >= limit) {
    return suggestions.slice(0, limit);
  }

  const starterSuggestions = getSubjectDiscoverySummaries()
    .flatMap((subject) => {
      for (const topic of subject.featuredTopics) {
        const orderedTopicEntries = topicConceptEntries.get(topic.slug) ?? [];
        const starterEntry = orderedTopicEntries.find((entry) => {
          const progress = getConceptTestProgressState(snapshot, entry);
          return !progress.hasStartedAssessmentWithoutCompletion && !isSuggestionEntryCompleted(progress);
        });

        if (starterEntry) {
          return [starterEntry];
        }
      }

      return [];
    })
    .sort((left, right) => left.order - right.order);

  for (const entry of starterSuggestions) {
    addSuggestion(
      suggestions,
      seenSuggestionIds,
      buildConceptSuggestion(
        entry,
        getConceptTestProgressState(snapshot, entry),
        "starter",
      ),
      limit,
    );
  }

  return suggestions.slice(0, limit);
}
