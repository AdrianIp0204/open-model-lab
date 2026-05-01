import { getCatalogData, getCatalogFilePath, getCatalogLastModified } from "./content-registry";
import { getConceptSummaries } from "./loaders";
import { getStarterTracks, type StarterTrackSummary } from "./starter-tracks";
import { getTopicDiscoverySummaries, type TopicDiscoverySummary } from "./topics";
import {
  subjectCatalogSchema,
  type ConceptSummary,
  type SubjectMetadata,
} from "./schema";

export type SubjectDiscoverySummary = {
  slug: string;
  title: string;
  description: string;
  introduction: string;
  accent: SubjectMetadata["accent"];
  path: string;
  conceptCount: number;
  topicCount: number;
  starterTrackCount: number;
  bridgeTrackCount: number;
  estimatedStudyMinutes: number;
  concepts: ConceptSummary[];
  featuredConcepts: ConceptSummary[];
  topics: TopicDiscoverySummary[];
  featuredTopics: TopicDiscoverySummary[];
  starterTracks: StarterTrackSummary[];
  featuredStarterTracks: StarterTrackSummary[];
  bridgeStarterTracks: StarterTrackSummary[];
};

type SubjectDiscoveryCache = {
  all: SubjectDiscoverySummary[];
  bySlug: Map<string, SubjectDiscoverySummary>;
  byTitle: Map<string, SubjectDiscoverySummary>;
  byConceptSlug: Map<string, SubjectDiscoverySummary>;
  byTopicSlug: Map<string, SubjectDiscoverySummary>;
};

let cachedSubjectDiscovery: SubjectDiscoveryCache | null = null;

function readSubjectCatalogFromDisk(): SubjectMetadata[] {
  return subjectCatalogSchema.parse(getCatalogData("subjects")) as SubjectMetadata[];
}

function orderSubjectCatalog(entries: SubjectMetadata[]) {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => {
      const leftSequence = left.entry.sequence ?? Number.MAX_SAFE_INTEGER;
      const rightSequence = right.entry.sequence ?? Number.MAX_SAFE_INTEGER;

      if (leftSequence !== rightSequence) {
        return leftSequence - rightSequence;
      }

      return left.index - right.index;
    })
    .map(({ entry }) => entry);
}

function buildEstimatedStudyMinutes(concepts: ConceptSummary[]) {
  return concepts.reduce((sum, concept) => sum + (concept.estimatedStudyMinutes ?? 0), 0);
}

function getSubjectPathFromSlug(slug: string) {
  return `/concepts/subjects/${slug}`;
}

function getTrackSubjects(track: StarterTrackSummary) {
  return Array.from(new Set(track.concepts.map((concept) => concept.subject)));
}

function validateUniqueField(
  entries: SubjectMetadata[],
  getValue: (entry: SubjectMetadata) => string,
  label: string,
) {
  const seen = new Set<string>();

  for (const entry of entries) {
    const value = getValue(entry);

    if (seen.has(value)) {
      throw new Error(`Duplicate subject ${label} found: ${value}`);
    }

    seen.add(value);
  }
}

function validateOrderedSubjectLinks(
  entry: SubjectMetadata,
  label: string,
  values: string[] | undefined,
) {
  const seen = new Set<string>();

  for (const value of values ?? []) {
    if (seen.has(value)) {
      throw new Error(`Subject "${entry.slug}" contains duplicate ${label} "${value}".`);
    }

    seen.add(value);
  }
}

export function validateSubjectCatalog(entries: SubjectMetadata[]): SubjectMetadata[] {
  validateUniqueField(entries, (entry) => entry.id, "id");
  validateUniqueField(entries, (entry) => entry.slug, "slug");
  validateUniqueField(entries, (entry) => entry.title, "title");

  const concepts = getConceptSummaries();
  const topics = getTopicDiscoverySummaries();
  const starterTracks = getStarterTracks();
  const conceptBySlug = new Map(concepts.map((concept) => [concept.slug, concept]));
  const topicBySlug = new Map(topics.map((topic) => [topic.slug, topic]));
  const trackBySlug = new Map(starterTracks.map((track) => [track.slug, track]));
  const subjectTitles = new Set(entries.map((entry) => entry.title));
  const conceptSubjects = new Set(concepts.map((concept) => concept.subject));
  const topicSubjects = new Set(topics.map((topic) => topic.subject));

  for (const subject of conceptSubjects) {
    if (!subjectTitles.has(subject)) {
      throw new Error(`Concept subject "${subject}" is missing from subjects catalog.`);
    }
  }

  for (const subject of topicSubjects) {
    if (!subjectTitles.has(subject)) {
      throw new Error(`Topic subject "${subject}" is missing from subjects catalog.`);
    }
  }

  for (const entry of entries) {
    validateOrderedSubjectLinks(entry, "featuredTopicSlugs", entry.featuredTopicSlugs);
    validateOrderedSubjectLinks(
      entry,
      "featuredStarterTrackSlugs",
      entry.featuredStarterTrackSlugs,
    );
    validateOrderedSubjectLinks(
      entry,
      "bridgeStarterTrackSlugs",
      entry.bridgeStarterTrackSlugs,
    );
    validateOrderedSubjectLinks(entry, "featuredConceptSlugs", entry.featuredConceptSlugs);

    const ownedConcepts = concepts.filter((concept) => concept.subject === entry.title);
    const ownedTopics = topics.filter((topic) => topic.subject === entry.title);

    if (!ownedConcepts.length) {
      throw new Error(`Subject "${entry.slug}" does not resolve any published concepts.`);
    }

    if (!ownedTopics.length) {
      throw new Error(`Subject "${entry.slug}" does not resolve any topic landing pages.`);
    }

    for (const topicSlug of entry.featuredTopicSlugs) {
      const topic = topicBySlug.get(topicSlug);

      if (!topic) {
        throw new Error(`Subject "${entry.slug}" references unknown topic "${topicSlug}".`);
      }

      if (topic.subject !== entry.title) {
        throw new Error(
          `Subject "${entry.slug}" features topic "${topicSlug}" outside ${entry.title}.`,
        );
      }
    }

    for (const conceptSlug of entry.featuredConceptSlugs) {
      const concept = conceptBySlug.get(conceptSlug);

      if (!concept) {
        throw new Error(`Subject "${entry.slug}" references unknown concept "${conceptSlug}".`);
      }

      if (concept.subject !== entry.title) {
        throw new Error(
          `Subject "${entry.slug}" features concept "${conceptSlug}" outside ${entry.title}.`,
        );
      }
    }

    for (const trackSlug of entry.featuredStarterTrackSlugs) {
      const track = trackBySlug.get(trackSlug);

      if (!track) {
        throw new Error(`Subject "${entry.slug}" references unknown starter track "${trackSlug}".`);
      }

      const trackSubjects = getTrackSubjects(track);

      if (trackSubjects.length !== 1 || trackSubjects[0] !== entry.title) {
        throw new Error(
          `Subject "${entry.slug}" can only feature subject-owned starter tracks. "${trackSlug}" resolves to ${trackSubjects.join(", ")}.`,
        );
      }
    }

    for (const trackSlug of entry.bridgeStarterTrackSlugs ?? []) {
      const track = trackBySlug.get(trackSlug);

      if (!track) {
        throw new Error(`Subject "${entry.slug}" references unknown bridge track "${trackSlug}".`);
      }

      const trackSubjects = getTrackSubjects(track);

      if (!trackSubjects.includes(entry.title) || trackSubjects.length < 2) {
        throw new Error(
          `Subject "${entry.slug}" bridge track "${trackSlug}" must include ${entry.title} and at least one other subject.`,
        );
      }
    }
  }

  return entries;
}

function buildSubjectSummaries(): SubjectDiscoverySummary[] {
  const conceptSummaries = getConceptSummaries();
  const topics = getTopicDiscoverySummaries();
  const starterTracks = getStarterTracks();
  const conceptBySlug = new Map(conceptSummaries.map((concept) => [concept.slug, concept]));
  const topicBySlug = new Map(topics.map((topic) => [topic.slug, topic]));
  const trackBySlug = new Map(starterTracks.map((track) => [track.slug, track]));
  const entries = orderSubjectCatalog(validateSubjectCatalog(readSubjectCatalogFromDisk()));

  return entries.map((entry) => {
    const concepts = conceptSummaries.filter((concept) => concept.subject === entry.title);
    const subjectTopics = topics.filter((topic) => topic.subject === entry.title);
    const subjectStarterTracks = starterTracks.filter((track) => {
      const trackSubjects = getTrackSubjects(track);
      return trackSubjects.length === 1 && trackSubjects[0] === entry.title;
    });
    const bridgeStarterTracks = starterTracks.filter((track) => {
      const trackSubjects = getTrackSubjects(track);
      return trackSubjects.length > 1 && trackSubjects.includes(entry.title);
    });

    return {
      slug: entry.slug,
      title: entry.title,
      description: entry.description,
      introduction: entry.introduction,
      accent: entry.accent,
      path: getSubjectPathFromSlug(entry.slug),
      conceptCount: concepts.length,
      topicCount: subjectTopics.length,
      starterTrackCount: subjectStarterTracks.length,
      bridgeTrackCount: bridgeStarterTracks.length,
      estimatedStudyMinutes: buildEstimatedStudyMinutes(concepts),
      concepts,
      featuredConcepts: entry.featuredConceptSlugs.map((slug) => {
        const concept = conceptBySlug.get(slug);

        if (!concept) {
          throw new Error(`Subject "${entry.slug}" lost concept "${slug}" while resolving.`);
        }

        return concept;
      }),
      topics: subjectTopics,
      featuredTopics: entry.featuredTopicSlugs.map((slug) => {
        const topic = topicBySlug.get(slug);

        if (!topic) {
          throw new Error(`Subject "${entry.slug}" lost topic "${slug}" while resolving.`);
        }

        return topic;
      }),
      starterTracks: subjectStarterTracks,
      featuredStarterTracks: entry.featuredStarterTrackSlugs.map((slug) => {
        const track = trackBySlug.get(slug);

        if (!track) {
          throw new Error(`Subject "${entry.slug}" lost starter track "${slug}" while resolving.`);
        }

        return track;
      }),
      bridgeStarterTracks: (entry.bridgeStarterTrackSlugs ?? []).map((slug) => {
        const track = trackBySlug.get(slug);

        if (!track) {
          throw new Error(`Subject "${entry.slug}" lost bridge track "${slug}" while resolving.`);
        }

        return track;
      }),
    };
  });
}

function getCachedSubjectDiscovery(): SubjectDiscoveryCache {
  if (cachedSubjectDiscovery) {
    return cachedSubjectDiscovery;
  }

  const summaries = buildSubjectSummaries();

  cachedSubjectDiscovery = {
    all: summaries,
    bySlug: new Map(summaries.map((subject) => [subject.slug, subject])),
    byTitle: new Map(summaries.map((subject) => [subject.title, subject])),
    byConceptSlug: new Map(
      summaries.flatMap((subject) =>
        subject.concepts.map((concept) => [concept.slug, subject] as const),
      ),
    ),
    byTopicSlug: new Map(
      summaries.flatMap((subject) =>
        subject.topics.map((topic) => [topic.slug, subject] as const),
      ),
    ),
  };

  return cachedSubjectDiscovery;
}

export function getSubjectDiscoverySummaries(): SubjectDiscoverySummary[] {
  return getCachedSubjectDiscovery().all;
}

export function getSubjectDiscoverySlugs(): string[] {
  return getSubjectDiscoverySummaries().map((subject) => subject.slug);
}

export function getSubjectDiscoverySummaryBySlug(slug: string): SubjectDiscoverySummary {
  const subject = getCachedSubjectDiscovery().bySlug.get(slug);

  if (!subject) {
    throw new Error(`Unknown subject slug: ${slug}`);
  }

  return subject;
}

export function getSubjectDiscoverySummaryByTitle(title: string): SubjectDiscoverySummary {
  const subject = getCachedSubjectDiscovery().byTitle.get(title);

  if (!subject) {
    throw new Error(`Unknown subject title: ${title}`);
  }

  return subject;
}

export function getSubjectDiscoverySummaryForConceptSlug(
  conceptSlug: string,
): SubjectDiscoverySummary {
  const subject = getCachedSubjectDiscovery().byConceptSlug.get(conceptSlug);

  if (!subject) {
    throw new Error(`Unknown concept subject for slug: ${conceptSlug}`);
  }

  return subject;
}

export function getSubjectDiscoverySummaryForTopicSlug(topicSlug: string): SubjectDiscoverySummary {
  const subject = getCachedSubjectDiscovery().byTopicSlug.get(topicSlug);

  if (!subject) {
    throw new Error(`Unknown topic subject for slug: ${topicSlug}`);
  }

  return subject;
}

export function getSubjectPath(slug: string): string {
  return getSubjectPathFromSlug(slug);
}

export function getSubjectCatalogFilePath() {
  return getCatalogFilePath("subjects");
}

export function getSubjectCatalogLastModified() {
  return getCatalogLastModified("subjects");
}
