import type { ConceptMetadata, ConceptSummary } from "./schema";
import type { GuidedCollectionSummary } from "./guided-collections";
import type { RecommendedGoalPathSummary } from "./recommended-goal-paths";
import type { StarterTrackSummary } from "./starter-tracks";
import type { SubjectDiscoverySummary } from "./subjects";
import type { TopicDiscoverySummary } from "./topics";

export const siteSearchResultKinds = [
  "concept",
  "track",
  "topic",
  "subject",
  "guided-collection",
  "goal-path",
] as const;

export const siteSearchMatchStrengths = [
  "exact-title",
  "title-starts-with",
  "title-words",
  "keyword",
  "supporting",
] as const;

export type SiteSearchResultKind = (typeof siteSearchResultKinds)[number];
export type SiteSearchMatchStrength = (typeof siteSearchMatchStrengths)[number];

export type SiteSearchConceptMetadata = {
  aliases?: string[];
  tags?: string[];
  seoKeywords?: string[];
};

export type SiteSearchConceptMetadataBySlug = Record<
  string,
  SiteSearchConceptMetadata | undefined
>;

export type SiteSearchIndexInput = {
  subjects: SubjectDiscoverySummary[];
  topics: TopicDiscoverySummary[];
  starterTracks: StarterTrackSummary[];
  guidedCollections?: GuidedCollectionSummary[];
  recommendedGoalPaths?: RecommendedGoalPathSummary[];
  concepts: ConceptSummary[];
  conceptMetadataBySlug?: SiteSearchConceptMetadataBySlug;
};

export type SiteSearchEntry = {
  id: string;
  kind: SiteSearchResultKind;
  slug: string;
  title: string;
  href: string;
  summary: string;
  actionLabel: string;
  accent: SubjectDiscoverySummary["accent"];
  subjectSlugs: string[];
  subjectTitles: string[];
  primarySubjectSlug: string | null;
  primarySubjectTitle: string | null;
  topicSlug: string | null;
  topicSlugs: string[];
  topicTitle: string | null;
  topicTitles: string[];
  metadataChips: string[];
  keywordChips: string[];
  order: number;
  searchTerms: {
    primary: string[];
    keywords: string[];
    supporting: string[];
  };
};

export type SiteSearchIndex = {
  subjects: SubjectDiscoverySummary[];
  topics: TopicDiscoverySummary[];
  starterTracks: StarterTrackSummary[];
  guidedCollections: GuidedCollectionSummary[];
  recommendedGoalPaths: RecommendedGoalPathSummary[];
  concepts: ConceptSummary[];
  entries: SiteSearchEntry[];
  subjectOptions: Array<{
    slug: string;
    title: string;
    accent: SubjectDiscoverySummary["accent"];
    count: number;
  }>;
};

export type SiteSearchMatch = {
  entry: SiteSearchEntry;
  strength: SiteSearchMatchStrength;
  strengthLabel: string;
  score: number;
};

type ConceptTrackSearchContext = {
  titles: string[];
  highlights: string[];
  supporting: string[];
};

function getCollectionFormatLabel(format: GuidedCollectionSummary["format"]) {
  return format === "lesson-set" ? "Lesson set" : "Playlist";
}

function getGoalPathKindLabel(goalKind: RecommendedGoalPathSummary["goalKind"]) {
  switch (goalKind) {
    case "prepare-branch":
      return "Prepare for a branch";
    case "teacher-objective":
      return "Teacher objective";
    default:
      return "Build intuition";
  }
}

function getSiteSearchKindPriority(kind: SiteSearchResultKind) {
  switch (kind) {
    case "subject":
      return 0;
    case "topic":
      return 1;
    case "track":
      return 2;
    case "guided-collection":
      return 3;
    case "goal-path":
      return 4;
    default:
      return 5;
  }
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean),
    ),
  );
}

export function normalizeSiteSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeSiteSearchText(value).split(" ").filter(Boolean);
}

function buildPrimaryTerms(values: string[]) {
  return unique(values).map(normalizeSiteSearchText).filter(Boolean);
}

function buildKeywordTerms(values: string[]) {
  return unique(values).map(normalizeSiteSearchText).filter(Boolean);
}

function matchesAllTokens(values: string[], tokens: string[]) {
  if (!tokens.length) {
    return false;
  }

  const normalizedValues = values.map(normalizeSiteSearchText).filter(Boolean);

  return tokens.every((token) =>
    normalizedValues.some((value) => value.includes(token)),
  );
}

function resolveTrackSubjects(
  track: StarterTrackSummary,
  subjectsByTitle: Map<string, SubjectDiscoverySummary>,
) {
  const subjectTitles = unique(track.concepts.map((concept) => concept.subject));
  const subjectSummaries = subjectTitles
    .map((title) => subjectsByTitle.get(title))
    .filter((subject): subject is SubjectDiscoverySummary => Boolean(subject));

  return {
    subjectTitles,
    subjectSlugs: unique(subjectSummaries.map((subject) => subject.slug)),
    primarySubject: subjectSummaries[0] ?? null,
  };
}

function resolveEntrySubjects(
  subjectTitles: string[],
  subjectsByTitle: Map<string, SubjectDiscoverySummary>,
) {
  const subjectSummaries = unique(subjectTitles)
    .map((title) => subjectsByTitle.get(title))
    .filter((subject): subject is SubjectDiscoverySummary => Boolean(subject));

  return {
    subjectTitles: unique(subjectTitles),
    subjectSlugs: unique(subjectSummaries.map((subject) => subject.slug)),
    primarySubject: subjectSummaries[0] ?? null,
  };
}

function buildConceptTrackSearchContext(
  starterTracks: StarterTrackSummary[],
) {
  const contextByConceptSlug = new Map<string, ConceptTrackSearchContext>();

  for (const track of starterTracks) {
    for (const concept of track.concepts) {
      const existingContext = contextByConceptSlug.get(concept.slug) ?? {
        titles: [],
        highlights: [],
        supporting: [],
      };

      existingContext.titles.push(track.title);
      existingContext.highlights.push(...track.highlights);
      existingContext.supporting.push(track.summary, track.introduction);

      contextByConceptSlug.set(concept.slug, existingContext);
    }
  }

  return contextByConceptSlug;
}

function buildSubjectEntry(subject: SubjectDiscoverySummary, order: number): SiteSearchEntry {
  return {
    id: `subject-${subject.slug}`,
    kind: "subject",
    slug: subject.slug,
    title: subject.title,
    href: subject.path,
    summary: subject.description,
    actionLabel: `Open ${subject.title}`,
    accent: subject.accent,
    subjectSlugs: [subject.slug],
    subjectTitles: [subject.title],
    primarySubjectSlug: subject.slug,
    primarySubjectTitle: subject.title,
    topicSlug: null,
    topicSlugs: subject.topics.map((topic) => topic.slug),
    topicTitle: null,
    topicTitles: subject.topics.map((topic) => topic.title),
    metadataChips: [
      `${subject.topicCount} topics`,
      `${subject.conceptCount} concepts`,
      `${subject.starterTrackCount} starter tracks`,
    ],
    keywordChips: unique([
      ...subject.featuredTopics.map((topic) => topic.title),
      ...subject.featuredStarterTracks.map((track) => track.title),
      ...subject.featuredConcepts.map((concept) => concept.shortTitle ?? concept.title),
    ]).slice(0, 3),
    order,
    searchTerms: {
      primary: buildPrimaryTerms([subject.title, subject.slug]),
      keywords: buildKeywordTerms([
        ...subject.featuredTopics.map((topic) => topic.title),
        ...subject.featuredStarterTracks.map((track) => track.title),
        ...subject.featuredConcepts.map((concept) => concept.title),
        ...subject.featuredConcepts
          .map((concept) => concept.shortTitle)
          .filter((value): value is string => Boolean(value)),
      ]),
      supporting: unique([
        subject.description,
        subject.introduction,
        ...subject.topics.map((topic) => topic.title),
        ...subject.starterTracks.map((track) => track.title),
      ]),
    },
  };
}

function buildTopicEntry(
  topic: TopicDiscoverySummary,
  subjectsByTitle: Map<string, SubjectDiscoverySummary>,
  order: number,
): SiteSearchEntry {
  const subject = subjectsByTitle.get(topic.subject) ?? null;

  return {
    id: `topic-${topic.slug}`,
    kind: "topic",
    slug: topic.slug,
    title: topic.title,
    href: `/concepts/topics/${topic.slug}`,
    summary: topic.description,
    actionLabel: `Open ${topic.title}`,
    accent: topic.accent,
    subjectSlugs: subject ? [subject.slug] : [],
    subjectTitles: [topic.subject],
    primarySubjectSlug: subject?.slug ?? null,
    primarySubjectTitle: topic.subject,
    topicSlug: topic.slug,
    topicSlugs: [topic.slug],
    topicTitle: topic.title,
    topicTitles: [topic.title],
    metadataChips: [
      topic.subject,
      `${topic.conceptCount} concepts`,
      `${topic.starterTracks.length} starter tracks`,
    ],
    keywordChips: unique([
      ...topic.subtopics,
      ...topic.featuredConcepts.map((concept) => concept.shortTitle ?? concept.title),
      ...topic.recommendedStarterTracks.map((track) => track.title),
    ]).slice(0, 3),
    order,
    searchTerms: {
      primary: buildPrimaryTerms([topic.title, topic.slug]),
      keywords: buildKeywordTerms([
        ...topic.sourceTopics,
        ...topic.subtopics,
        ...topic.featuredConcepts.map((concept) => concept.title),
        ...topic.featuredConcepts
          .map((concept) => concept.shortTitle)
          .filter((value): value is string => Boolean(value)),
        ...topic.starterTracks.map((track) => track.title),
      ]),
      supporting: unique([
        topic.description,
        topic.introduction,
        ...topic.groups.map((group) => group.title),
        ...topic.relatedTopics.map((relatedTopic) => relatedTopic.title),
      ]),
    },
  };
}

function buildTrackEntry(
  track: StarterTrackSummary,
  subjectsByTitle: Map<string, SubjectDiscoverySummary>,
  topicsByTitle: Map<string, TopicDiscoverySummary>,
  order: number,
): SiteSearchEntry {
  const trackSubjects = resolveTrackSubjects(track, subjectsByTitle);
  const topicSlugs = unique(
    track.concepts.map((concept) => topicsByTitle.get(concept.topic)?.slug ?? null),
  );
  const topicTitles = unique(track.concepts.map((concept) => concept.topic));

  return {
    id: `track-${track.slug}`,
    kind: "track",
    slug: track.slug,
    title: track.title,
    href: `/tracks/${track.slug}`,
    summary: track.summary,
    actionLabel: `Open ${track.title}`,
    accent: track.accent,
    subjectSlugs: trackSubjects.subjectSlugs,
    subjectTitles: trackSubjects.subjectTitles,
    primarySubjectSlug: trackSubjects.primarySubject?.slug ?? null,
    primarySubjectTitle: trackSubjects.primarySubject?.title ?? trackSubjects.subjectTitles[0] ?? null,
    topicSlug: null,
    topicSlugs,
    topicTitle: null,
    topicTitles,
    metadataChips: [
      trackSubjects.subjectTitles.length > 1
        ? trackSubjects.subjectTitles.join(" + ")
        : trackSubjects.subjectTitles[0] ?? "Starter track",
      `${track.concepts.length} concepts`,
      `${track.estimatedStudyMinutes} min`,
    ],
    keywordChips: unique([
      ...track.highlights,
      ...track.concepts.map((concept) => concept.shortTitle ?? concept.title),
    ]).slice(0, 3),
    order,
    searchTerms: {
      primary: buildPrimaryTerms([track.title, track.slug]),
      keywords: buildKeywordTerms([
        ...track.highlights,
        ...trackSubjects.subjectTitles,
        ...track.concepts.map((concept) => concept.title),
        ...track.concepts
          .map((concept) => concept.shortTitle)
          .filter((value): value is string => Boolean(value)),
        ...track.concepts.map((concept) => concept.topic),
      ]),
      supporting: unique([
        track.summary,
        track.introduction,
        ...track.concepts.map((concept) => concept.summary),
      ]),
    },
  };
}

function buildGuidedCollectionEntry(
  collection: GuidedCollectionSummary,
  subjectsByTitle: Map<string, SubjectDiscoverySummary>,
  order: number,
): SiteSearchEntry {
  const collectionSubjects = resolveEntrySubjects(
    collection.concepts.map((concept) => concept.subject),
    subjectsByTitle,
  );
  const collectionFormatLabel = getCollectionFormatLabel(collection.format);

  return {
    id: `guided-collection-${collection.slug}`,
    kind: "guided-collection",
    slug: collection.slug,
    title: collection.title,
    href: collection.path,
    summary: collection.summary,
    actionLabel: `Open ${collectionFormatLabel.toLowerCase()}`,
    accent: collection.accent,
    subjectSlugs: collectionSubjects.subjectSlugs,
    subjectTitles: collectionSubjects.subjectTitles,
    primarySubjectSlug: collectionSubjects.primarySubject?.slug ?? null,
    primarySubjectTitle:
      collectionSubjects.primarySubject?.title ??
      collectionSubjects.subjectTitles[0] ??
      null,
    topicSlug: collection.topics[0]?.slug ?? null,
    topicSlugs: collection.topics.map((topic) => topic.slug),
    topicTitle: collection.topics[0]?.title ?? null,
    topicTitles: collection.topics.map((topic) => topic.title),
    metadataChips: [
      collectionFormatLabel,
      `${collection.steps.length} steps`,
      `${collection.conceptCount} concepts`,
    ],
    keywordChips: unique([
      ...collection.highlights,
      ...collection.topics.map((topic) => topic.title),
      ...collection.relatedTracks.map((track) => track.title),
    ]).slice(0, 3),
    order,
    searchTerms: {
      primary: buildPrimaryTerms([collection.title, collection.slug]),
      keywords: buildKeywordTerms([
        collectionFormatLabel,
        ...collection.highlights,
        ...collection.topics.map((topic) => topic.title),
        ...collection.relatedTracks.map((track) => track.title),
        ...collection.concepts.map((concept) => concept.title),
        ...collection.concepts
          .map((concept) => concept.shortTitle)
          .filter((value): value is string => Boolean(value)),
      ]),
      supporting: unique([
        collection.summary,
        collection.introduction,
        collection.sequenceRationale,
        collection.educatorNote ?? "",
        ...collection.steps.map((step) => step.title),
        ...collection.steps.map((step) => step.summary),
      ]),
    },
  };
}

function buildGoalPathEntry(
  goalPath: RecommendedGoalPathSummary,
  subjectsByTitle: Map<string, SubjectDiscoverySummary>,
  order: number,
): SiteSearchEntry {
  const goalPathSubjects = resolveEntrySubjects(
    goalPath.concepts.map((concept) => concept.subject),
    subjectsByTitle,
  );
  const goalPathKindLabel = getGoalPathKindLabel(goalPath.goalKind);

  return {
    id: `goal-path-${goalPath.slug}`,
    kind: "goal-path",
    slug: goalPath.slug,
    title: goalPath.title,
    href: goalPath.path,
    summary: goalPath.summary,
    actionLabel: "Open goal path",
    accent: goalPath.accent,
    subjectSlugs: goalPathSubjects.subjectSlugs,
    subjectTitles: goalPathSubjects.subjectTitles,
    primarySubjectSlug: goalPathSubjects.primarySubject?.slug ?? null,
    primarySubjectTitle:
      goalPathSubjects.primarySubject?.title ??
      goalPathSubjects.subjectTitles[0] ??
      null,
    topicSlug: goalPath.topics[0]?.slug ?? null,
    topicSlugs: goalPath.topics.map((topic) => topic.slug),
    topicTitle: goalPath.topics[0]?.title ?? null,
    topicTitles: goalPath.topics.map((topic) => topic.title),
    metadataChips: [
      goalPathKindLabel,
      `${goalPath.steps.length} steps`,
      `${goalPath.conceptCount} concepts`,
    ],
    keywordChips: unique([
      ...goalPath.highlights,
      ...goalPath.topics.map((topic) => topic.title),
      ...goalPath.relatedTracks.map((track) => track.title),
      ...goalPath.relatedCollections.map((collection) => collection.title),
    ]).slice(0, 3),
    order,
    searchTerms: {
      primary: buildPrimaryTerms([
        goalPath.title,
        goalPath.slug,
        goalPath.objective,
      ]),
      keywords: buildKeywordTerms([
        goalPathKindLabel,
        ...goalPath.highlights,
        ...goalPath.topics.map((topic) => topic.title),
        ...goalPath.relatedTracks.map((track) => track.title),
        ...goalPath.relatedCollections.map((collection) => collection.title),
        ...goalPath.concepts.map((concept) => concept.title),
        ...goalPath.concepts
          .map((concept) => concept.shortTitle)
          .filter((value): value is string => Boolean(value)),
      ]),
      supporting: unique([
        goalPath.summary,
        goalPath.objective,
        goalPath.sequenceRationale,
        goalPath.educatorNote ?? "",
        ...goalPath.steps.map((step) => step.title),
        ...goalPath.steps.map((step) => step.summary),
      ]),
    },
  };
}

function buildConceptEntry(
  concept: ConceptSummary,
  metadata: SiteSearchConceptMetadata | undefined,
  trackContext: ConceptTrackSearchContext | undefined,
  subjectsByTitle: Map<string, SubjectDiscoverySummary>,
  topicsBySlug: Map<string, TopicDiscoverySummary>,
  topicsByTitle: Map<string, TopicDiscoverySummary>,
  order: number,
): SiteSearchEntry {
  const subject = subjectsByTitle.get(concept.subject) ?? null;
  const topic =
    topicsByTitle.get(concept.topic) ??
    Array.from(topicsBySlug.values()).find((candidate) =>
      candidate.concepts.some((topicConcept) => topicConcept.slug === concept.slug),
    ) ??
    null;

  return {
    id: `concept-${concept.slug}`,
    kind: "concept",
    slug: concept.slug,
    title: concept.title,
    href: `/concepts/${concept.slug}`,
    summary: concept.summary,
    actionLabel: `Open ${concept.title}`,
    accent: concept.accent,
    subjectSlugs: subject ? [subject.slug] : [],
    subjectTitles: [concept.subject],
    primarySubjectSlug: subject?.slug ?? null,
    primarySubjectTitle: concept.subject,
    topicSlug: topic?.slug ?? null,
    topicSlugs: topic ? [topic.slug] : [],
    topicTitle: concept.topic,
    topicTitles: [concept.topic],
    metadataChips: [
      concept.subject,
      concept.topic,
      concept.difficulty,
      `${concept.estimatedStudyMinutes ?? 0} min`,
    ],
    keywordChips: unique([
      ...(concept.highlights ?? []),
      ...(metadata?.tags ?? []),
      ...(metadata?.aliases ?? []),
    ]).slice(0, 3),
    order,
    searchTerms: {
      primary: buildPrimaryTerms([
        concept.title,
        concept.shortTitle ?? "",
        concept.slug.replace(/-/g, " "),
      ]),
      keywords: buildKeywordTerms([
        ...(metadata?.aliases ?? []),
        ...(metadata?.tags ?? []),
        ...(metadata?.seoKeywords ?? []),
        ...(concept.highlights ?? []),
        ...(trackContext?.titles ?? []),
        ...(trackContext?.highlights ?? []),
        concept.subject,
        concept.topic,
        concept.subtopic ?? "",
      ]),
      supporting: unique([
        concept.summary,
        concept.difficulty,
        topic?.description ?? "",
        ...(trackContext?.supporting ?? []),
      ]),
    },
  };
}

function getStrengthScore(strength: SiteSearchMatchStrength) {
  switch (strength) {
    case "exact-title":
      return 0;
    case "title-starts-with":
      return 1;
    case "title-words":
      return 2;
    case "keyword":
      return 3;
    default:
      return 4;
  }
}

function resolveMatchStrength(
  entry: SiteSearchEntry,
  normalizedQuery: string,
  tokens: string[],
): Pick<SiteSearchMatch, "strength" | "strengthLabel" | "score"> | null {
  if (!normalizedQuery || !tokens.length) {
    return null;
  }

  const primaryTerms = entry.searchTerms.primary.map(normalizeSiteSearchText);
  const keywordTerms = entry.searchTerms.keywords.map(normalizeSiteSearchText);
  const supportingTerms = entry.searchTerms.supporting.map(normalizeSiteSearchText);

  if (primaryTerms.some((value) => value === normalizedQuery)) {
    return {
      strength: "exact-title",
      strengthLabel: "Exact title",
      score: getStrengthScore("exact-title"),
    };
  }

  if (primaryTerms.some((value) => value.startsWith(normalizedQuery))) {
    return {
      strength: "title-starts-with",
      strengthLabel: "Title starts with query",
      score: getStrengthScore("title-starts-with"),
    };
  }

  if (matchesAllTokens(primaryTerms, tokens)) {
    return {
      strength: "title-words",
      strengthLabel: "Title word match",
      score: getStrengthScore("title-words"),
    };
  }

  if (
    keywordTerms.some(
      (value) => value === normalizedQuery || value.startsWith(normalizedQuery),
    ) ||
    matchesAllTokens(keywordTerms, tokens)
  ) {
    return {
      strength: "keyword",
      strengthLabel: "Keyword match",
      score: getStrengthScore("keyword"),
    };
  }

  if (matchesAllTokens([...primaryTerms, ...keywordTerms, ...supportingTerms], tokens)) {
    return {
      strength: "supporting",
      strengthLabel: "Summary match",
      score: getStrengthScore("supporting"),
    };
  }

  return null;
}

export function buildSiteSearchIndex({
  subjects,
  topics,
  starterTracks,
  guidedCollections = [],
  recommendedGoalPaths = [],
  concepts,
  conceptMetadataBySlug = {},
}: SiteSearchIndexInput): SiteSearchIndex {
  const subjectsByTitle = new Map(subjects.map((subject) => [subject.title, subject] as const));
  const topicsBySlug = new Map(topics.map((topic) => [topic.slug, topic] as const));
  const topicsByTitle = new Map(topics.map((topic) => [topic.title, topic] as const));
  const conceptTrackSearchContext = buildConceptTrackSearchContext(starterTracks);

  const subjectEntries = subjects.map((subject, index) => buildSubjectEntry(subject, index));
  const topicEntries = topics.map((topic, index) =>
    buildTopicEntry(topic, subjectsByTitle, index),
  );
  const trackEntries = starterTracks.map((track, index) =>
    buildTrackEntry(track, subjectsByTitle, topicsByTitle, index),
  );
  const guidedCollectionEntries = guidedCollections.map((collection, index) =>
    buildGuidedCollectionEntry(collection, subjectsByTitle, index),
  );
  const goalPathEntries = recommendedGoalPaths.map((goalPath, index) =>
    buildGoalPathEntry(goalPath, subjectsByTitle, index),
  );
  const conceptEntries = concepts.map((concept, index) =>
    buildConceptEntry(
      concept,
      conceptMetadataBySlug[concept.slug],
      conceptTrackSearchContext.get(concept.slug),
      subjectsByTitle,
      topicsBySlug,
      topicsByTitle,
      index,
    ),
  );
  const entries = [
    ...subjectEntries,
    ...topicEntries,
    ...trackEntries,
    ...guidedCollectionEntries,
    ...goalPathEntries,
    ...conceptEntries,
  ];

  return {
    subjects,
    topics,
    starterTracks,
    guidedCollections,
    recommendedGoalPaths,
    concepts,
    entries,
    subjectOptions: subjects.map((subject) => ({
      slug: subject.slug,
      title: subject.title,
      accent: subject.accent,
      count: entries.filter((entry) => entry.subjectSlugs.includes(subject.slug)).length,
    })),
  };
}

export function searchSiteIndex(
  index: SiteSearchIndex,
  options: {
    query: string;
    subjectSlug?: string | null;
    topicSlug?: string | null;
  },
): SiteSearchMatch[] {
  const normalizedQuery = normalizeSiteSearchText(options.query);
  const tokens = tokenize(normalizedQuery);

  if (!normalizedQuery || !tokens.length) {
    return [];
  }

  return index.entries
    .filter((entry) =>
      options.subjectSlug ? entry.subjectSlugs.includes(options.subjectSlug) : true,
    )
    .filter((entry) =>
      options.topicSlug ? entry.topicSlugs.includes(options.topicSlug) : true,
    )
    .map((entry) => {
      const strength = resolveMatchStrength(entry, normalizedQuery, tokens);

      if (!strength) {
        return null;
      }

      return {
        entry,
        ...strength,
      } satisfies SiteSearchMatch;
    })
    .filter((entry): entry is SiteSearchMatch => Boolean(entry))
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }

      const leftKindPriority = getSiteSearchKindPriority(left.entry.kind);
      const rightKindPriority = getSiteSearchKindPriority(right.entry.kind);

      if (leftKindPriority !== rightKindPriority) {
        return leftKindPriority - rightKindPriority;
      }

      if (left.entry.order !== right.entry.order) {
        return left.entry.order - right.entry.order;
      }

      return left.entry.title.localeCompare(right.entry.title);
    });
}

export function buildConceptSearchMetadataBySlug(
  metadataEntries: Pick<ConceptMetadata, "slug" | "aliases" | "tags">[],
): SiteSearchConceptMetadataBySlug {
  return Object.fromEntries(
    metadataEntries.map((entry) => [
      entry.slug,
      {
        aliases: entry.aliases ?? [],
        tags: entry.tags ?? [],
        seoKeywords: [],
      } satisfies SiteSearchConceptMetadata,
    ]),
  );
}
