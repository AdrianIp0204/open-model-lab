import {
  getConceptBySlug,
  getReadNextRecommendations,
  getTopicDiscoverySummaryForConceptSlug,
  type ConceptContent,
} from "@/lib/content";
import type { AppLocale } from "@/i18n/routing";
import {
  getConceptDisplayShortTitle,
  getConceptDisplayTitle,
} from "@/lib/i18n/content";
import type { ProgressSnapshot } from "@/lib/progress";
import {
  getConceptTestProgressState,
  getPackTestProgressState,
  type TestHubProgressState,
  getTopicTestProgressState,
} from "./progress";
import {
  getNextPublishedConceptTestEntry,
  getPublishedConceptTestEntryBySlug,
  type ConceptTestCatalogEntry,
} from "./catalog";
import {
  getNextPublishedPackTestEntry,
  getPublishedPackTestCatalog,
  type PackTestCatalogEntry,
} from "./packs";
import {
  getNextPublishedTopicTestEntry,
  getPublishedTopicTestCatalog,
  type TopicTestCatalogEntry,
} from "./topic-tests";

export type StandaloneAssessmentFollowUpAction = {
  href: string;
  label: string;
  tone?: "primary" | "secondary";
};

function isFinishedAssessmentState(input: TestHubProgressState) {
  return input.status === "completed" && !input.hasStartedAssessmentWithoutCompletion;
}

function addUniqueAction(
  actions: StandaloneAssessmentFollowUpAction[],
  seenHrefs: Set<string>,
  action: StandaloneAssessmentFollowUpAction | null,
) {
  if (!action || seenHrefs.has(action.href)) {
    return;
  }

  seenHrefs.add(action.href);
  actions.push(action);
}

export function buildConceptStandaloneFollowUpActions(input: {
  concept: Pick<ConceptContent, "slug">;
  entry: ConceptTestCatalogEntry;
  snapshot: ProgressSnapshot;
  locale: AppLocale;
  labels: {
    nextTest: string;
    reviewConcept: string;
    backToHub: string;
    relatedConcept: (title: string) => string;
    topicMilestone: (title: string) => string;
    packFollowOn: (title: string) => string;
  };
}) {
  const topic = getTopicDiscoverySummaryForConceptSlug(input.concept.slug);
  const nextConceptEntry = getNextPublishedConceptTestEntry(input.concept.slug);
  const realTopicEntry =
    getPublishedTopicTestCatalog().entries.find(
      (candidate) => candidate.topicSlug === topic.slug,
    ) ?? null;
  const topicProgress = realTopicEntry
    ? getTopicTestProgressState(input.snapshot, realTopicEntry)
    : null;
  const packEntry =
    getPublishedPackTestCatalog().entries.find((candidate) =>
      candidate.includedTopicSlugs.includes(topic.slug),
    ) ?? null;
  const packProgress = packEntry
    ? getPackTestProgressState(input.snapshot, packEntry)
    : null;
  const topicConceptEntries = topic.concepts
    .map((concept) => getPublishedConceptTestEntryBySlug(concept.slug))
    .filter((entry): entry is ConceptTestCatalogEntry => Boolean(entry));
  const completedConceptCount = topicConceptEntries.filter((entry) =>
    isFinishedAssessmentState(getConceptTestProgressState(input.snapshot, entry)),
  ).length;
  const milestoneThreshold = Math.max(2, Math.ceil(topicConceptEntries.length / 2));
  const relatedConceptEntry =
    getReadNextRecommendations(input.concept.slug, 3)
      .map((recommendation) => getPublishedConceptTestEntryBySlug(recommendation.slug))
      .find(
        (entry): entry is ConceptTestCatalogEntry =>
          entry !== null &&
          entry.conceptSlug !== nextConceptEntry?.conceptSlug &&
          !isFinishedAssessmentState(getConceptTestProgressState(input.snapshot, entry)),
      ) ?? null;

  const actions: StandaloneAssessmentFollowUpAction[] = [];
  const seenHrefs = new Set<string>();

  if (
    packEntry &&
    packProgress &&
    !isFinishedAssessmentState(packProgress) &&
    topicProgress?.status === "completed"
  ) {
    addUniqueAction(actions, seenHrefs, {
      href: packEntry.testHref,
      label: input.labels.packFollowOn(packEntry.title),
      tone: "primary",
    });
  }

  if (
    realTopicEntry &&
    topicProgress &&
    topicProgress.status !== "completed" &&
    completedConceptCount >= milestoneThreshold
  ) {
    addUniqueAction(actions, seenHrefs, {
      href: realTopicEntry.testHref,
      label: input.labels.topicMilestone(realTopicEntry.title),
      tone: actions.length === 0 ? "primary" : "secondary",
    });
  }

  if (
    nextConceptEntry &&
    !isFinishedAssessmentState(getConceptTestProgressState(input.snapshot, nextConceptEntry))
  ) {
    addUniqueAction(actions, seenHrefs, {
      href: nextConceptEntry.testHref,
      label: input.labels.nextTest,
      tone: actions.length === 0 ? "primary" : "secondary",
    });
  }

  if (relatedConceptEntry) {
    const relatedConcept = getConceptBySlug(relatedConceptEntry.conceptSlug);
    addUniqueAction(actions, seenHrefs, {
      href: relatedConceptEntry.testHref,
      label: input.labels.relatedConcept(
        getConceptDisplayShortTitle(relatedConcept, input.locale) ??
          getConceptDisplayTitle(relatedConcept, input.locale),
      ),
      tone: actions.length === 0 ? "primary" : "secondary",
    });
  }

  addUniqueAction(actions, seenHrefs, {
    href: input.entry.reviewHref,
    label: input.labels.reviewConcept,
  });
  addUniqueAction(actions, seenHrefs, {
    href: "/tests",
    label: input.labels.backToHub,
  });

  return actions;
}

export function buildTopicStandaloneFollowUpActions(input: {
  entry: TopicTestCatalogEntry;
  snapshot: ProgressSnapshot;
  locale: AppLocale;
  labels: {
    reviewTopic: string;
    reviewIncludedConcepts: string;
    backToHub: string;
    nextTopicTest: string;
    followOnPack: (title: string) => string;
  };
}) {
  const actions: StandaloneAssessmentFollowUpAction[] = [];
  const seenHrefs = new Set<string>();
  const topicProgress = getTopicTestProgressState(input.snapshot, input.entry);
  const followOnPack =
    getPublishedPackTestCatalog().entries.find((candidate) =>
      candidate.includedTopicSlugs.includes(input.entry.topicSlug),
    ) ?? null;
  const followOnPackProgress = followOnPack
    ? getPackTestProgressState(input.snapshot, followOnPack)
    : null;
  const nextTopicTest = getNextPublishedTopicTestEntry(input.entry.topicSlug);

  if (
    followOnPack &&
    followOnPackProgress &&
    !isFinishedAssessmentState(followOnPackProgress) &&
    topicProgress.status === "completed"
  ) {
    addUniqueAction(actions, seenHrefs, {
      href: followOnPack.testHref,
      label: input.labels.followOnPack(followOnPack.title),
      tone: "primary",
    });
  } else if (
    nextTopicTest &&
    !isFinishedAssessmentState(getTopicTestProgressState(input.snapshot, nextTopicTest))
  ) {
    addUniqueAction(actions, seenHrefs, {
      href: nextTopicTest.testHref,
      label: input.labels.nextTopicTest,
      tone: "primary",
    });
  }

  addUniqueAction(actions, seenHrefs, {
    href: `${input.entry.testHref}#topic-test-included-concepts`,
    label: input.labels.reviewIncludedConcepts,
  });
  addUniqueAction(actions, seenHrefs, {
    href: input.entry.reviewHref,
    label: input.labels.reviewTopic,
  });
  addUniqueAction(actions, seenHrefs, {
    href: "/tests",
    label: input.labels.backToHub,
  });

  return actions;
}

export function buildPackStandaloneFollowUpActions(input: {
  entry: PackTestCatalogEntry;
  snapshot: ProgressSnapshot;
  locale: AppLocale;
  labels: {
    reviewSubject: string;
    reviewIncludedTopics: string;
    backToHub: string;
    nextPack: string;
  };
}) {
  const actions: StandaloneAssessmentFollowUpAction[] = [];
  const seenHrefs = new Set<string>();
  const nextPack = getNextPublishedPackEntryIfUnfinished(input.snapshot, input.entry.packSlug);

  if (nextPack) {
    addUniqueAction(actions, seenHrefs, {
      href: nextPack.testHref,
      label: input.labels.nextPack,
      tone: "primary",
    });
  }

  addUniqueAction(actions, seenHrefs, {
    href: `${input.entry.testHref}#pack-test-included-topics`,
    label: input.labels.reviewIncludedTopics,
  });
  addUniqueAction(actions, seenHrefs, {
    href: input.entry.reviewHref,
    label: input.labels.reviewSubject,
  });
  addUniqueAction(actions, seenHrefs, {
    href: "/tests",
    label: input.labels.backToHub,
  });

  return actions;
}

function getNextPublishedPackEntryIfUnfinished(
  snapshot: ProgressSnapshot,
  packSlug: string,
) {
  const nextPack = getNextPublishedPackTestEntry(packSlug);

  if (!nextPack) {
    return null;
  }

  return isFinishedAssessmentState(getPackTestProgressState(snapshot, nextPack))
    ? null
    : nextPack;
}
