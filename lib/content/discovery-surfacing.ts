import type { ConceptSummary } from "./schema";
import type { GuidedCollectionSummary } from "./guided-collections";
import type { RecommendedGoalPathSummary } from "./recommended-goal-paths";
import type { StarterTrackSummary } from "./starter-tracks";
import type { SubjectDiscoverySummary } from "./subjects";
import type { TopicDiscoverySummary } from "./topics";

export type ExpandedSubjectSpotlight = {
  subject: SubjectDiscoverySummary;
  starterTrack: StarterTrackSummary | null;
  featuredTopic: TopicDiscoverySummary | null;
  featuredConcept: ConceptSummary | null;
  guidedCollection: GuidedCollectionSummary | null;
  goalPath: RecommendedGoalPathSummary | null;
};

function getExpandedSubjects(
  subjects: SubjectDiscoverySummary[],
  limit: number | undefined,
) {
  const expandedSubjects = subjects.slice(1);

  if (typeof limit !== "number") {
    return expandedSubjects;
  }

  return expandedSubjects.slice(0, limit);
}

function getSubjectTopicSlugSet(subject: SubjectDiscoverySummary) {
  return new Set(subject.topics.map((topic) => topic.slug));
}

function collectionTouchesSubject(
  collection: GuidedCollectionSummary,
  subject: SubjectDiscoverySummary,
  subjectTopicSlugs: Set<string>,
) {
  return (
    collection.concepts.some((concept) => concept.subject === subject.title) ||
    collection.topics.some((topic) => subjectTopicSlugs.has(topic.slug))
  );
}

function collectionIsOwnedBySubject(
  collection: GuidedCollectionSummary,
  subject: SubjectDiscoverySummary,
) {
  return collection.concepts.every((concept) => concept.subject === subject.title);
}

function goalPathTouchesSubject(
  goalPath: RecommendedGoalPathSummary,
  subject: SubjectDiscoverySummary,
  subjectTopicSlugs: Set<string>,
) {
  return (
    goalPath.concepts.some((concept) => concept.subject === subject.title) ||
    goalPath.topicSlugs.some((topicSlug) => subjectTopicSlugs.has(topicSlug))
  );
}

function goalPathIsOwnedBySubject(
  goalPath: RecommendedGoalPathSummary,
  subject: SubjectDiscoverySummary,
) {
  return goalPath.concepts.every((concept) => concept.subject === subject.title);
}

function pickGuidedCollection(
  subject: SubjectDiscoverySummary,
  guidedCollections: GuidedCollectionSummary[],
  subjectTopicSlugs: Set<string>,
) {
  const candidates = guidedCollections.filter((collection) =>
    collectionTouchesSubject(collection, subject, subjectTopicSlugs),
  );

  return (
    candidates.find(
      (collection) =>
        collectionIsOwnedBySubject(collection, subject) &&
        collection.topics.some((topic) => subjectTopicSlugs.has(topic.slug)),
    ) ??
    candidates.find((collection) =>
      collection.topics.some((topic) => subjectTopicSlugs.has(topic.slug)),
    ) ??
    candidates.find((collection) => collectionIsOwnedBySubject(collection, subject)) ??
    candidates[0] ??
    null
  );
}

function pickGoalPath(
  subject: SubjectDiscoverySummary,
  recommendedGoalPaths: RecommendedGoalPathSummary[],
  subjectTopicSlugs: Set<string>,
) {
  const candidates = recommendedGoalPaths.filter((goalPath) =>
    goalPathTouchesSubject(goalPath, subject, subjectTopicSlugs),
  );

  return (
    candidates.find(
      (goalPath) =>
        goalPathIsOwnedBySubject(goalPath, subject) &&
        goalPath.topicSlugs.some((topicSlug) => subjectTopicSlugs.has(topicSlug)),
    ) ??
    candidates.find((goalPath) =>
      goalPath.topicSlugs.some((topicSlug) => subjectTopicSlugs.has(topicSlug)),
    ) ??
    candidates.find((goalPath) => goalPathIsOwnedBySubject(goalPath, subject)) ??
    candidates[0] ??
    null
  );
}

export function buildExpandedSubjectSpotlights(options: {
  subjects: SubjectDiscoverySummary[];
  guidedCollections: GuidedCollectionSummary[];
  recommendedGoalPaths: RecommendedGoalPathSummary[];
  limit?: number;
}): ExpandedSubjectSpotlight[] {
  return getExpandedSubjects(options.subjects, options.limit).map((subject) => {
    const subjectTopicSlugs = getSubjectTopicSlugSet(subject);

    return {
      subject,
      starterTrack: subject.featuredStarterTracks[0] ?? subject.starterTracks[0] ?? null,
      featuredTopic: subject.featuredTopics[0] ?? subject.topics[0] ?? null,
      featuredConcept: subject.featuredConcepts[0] ?? subject.concepts[0] ?? null,
      guidedCollection: pickGuidedCollection(
        subject,
        options.guidedCollections,
        subjectTopicSlugs,
      ),
      goalPath: pickGoalPath(
        subject,
        options.recommendedGoalPaths,
        subjectTopicSlugs,
      ),
    };
  });
}
