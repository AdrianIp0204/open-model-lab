import { z } from "zod";
import { getCatalogData, getCatalogFilePath } from "./content-registry";
import { getGuidedCollectionBySlug, type GuidedCollectionSummary } from "./guided-collections";
import { getConceptBySlug, getConceptSummaries } from "./loaders";
import { getStarterTrackBySlug, type StarterTrackSummary } from "./starter-tracks";
import {
  getTopicDiscoverySummaryBySlug,
  getTopicDiscoverySummaryForConceptSlug,
  type TopicDiscoverySummary,
} from "./topics";
import type { ConceptSlug, ConceptSummary } from "./schema";

const accentSchema = z.enum(["teal", "amber", "coral", "sky", "ink"]);
const kebabIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Recommended goal path ids must be kebab-case.");
const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Recommended goal path slugs must be kebab-case.");
const goalKindSchema = z.enum([
  "build-intuition",
  "prepare-branch",
  "teacher-objective",
]);

const goalStepBaseSchema = z.strictObject({
  id: kebabIdSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  purpose: z.string().min(1),
});

const topicGoalStepSchema = goalStepBaseSchema.extend({
  kind: z.literal("topic"),
  topicSlug: slugSchema,
});

const guidedCollectionGoalStepSchema = goalStepBaseSchema.extend({
  kind: z.literal("guided-collection"),
  collectionSlug: slugSchema,
});

const trackGoalStepSchema = goalStepBaseSchema.extend({
  kind: z.literal("track"),
  trackSlug: slugSchema,
});

const conceptGoalStepSchema = goalStepBaseSchema.extend({
  kind: z.literal("concept"),
  conceptSlug: slugSchema,
});

export const recommendedGoalPathStepSchema = z.discriminatedUnion("kind", [
  topicGoalStepSchema,
  guidedCollectionGoalStepSchema,
  trackGoalStepSchema,
  conceptGoalStepSchema,
]);

export const recommendedGoalPathCatalogEntrySchema = z
  .strictObject({
    id: kebabIdSchema,
    slug: slugSchema,
    goalKind: goalKindSchema,
    title: z.string().min(1),
    objective: z.string().min(1),
    summary: z.string().min(1),
    sequenceRationale: z.string().min(1),
    educatorNote: z.string().min(1).optional(),
    sequence: z.number().int().min(0).optional(),
    accent: accentSchema,
    highlights: z.array(z.string().min(1)).min(1),
    topicSlugs: z.array(slugSchema).min(1),
    steps: z.array(recommendedGoalPathStepSchema).min(2),
  })
  .superRefine((entry, ctx) => {
    const seenStepIds = new Set<string>();
    const seenTopicSlugs = new Set<string>();

    for (const [index, step] of entry.steps.entries()) {
      if (seenStepIds.has(step.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate recommended goal path step id "${step.id}".`,
          path: ["steps", index, "id"],
        });
      }

      seenStepIds.add(step.id);
    }

    for (const [index, topicSlug] of entry.topicSlugs.entries()) {
      if (seenTopicSlugs.has(topicSlug)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate recommended goal path topic slug "${topicSlug}".`,
          path: ["topicSlugs", index],
        });
      }

      seenTopicSlugs.add(topicSlug);
    }
  });

export const recommendedGoalPathCatalogSchema = z
  .array(recommendedGoalPathCatalogEntrySchema)
  .min(1);

export type RecommendedGoalPathGoalKind = z.infer<typeof goalKindSchema>;
export type RecommendedGoalPathMetadata = z.infer<
  typeof recommendedGoalPathCatalogEntrySchema
>;
export type RecommendedGoalPathStepMetadata = RecommendedGoalPathMetadata["steps"][number];

type RecommendedGoalPathResolvedStepBase = {
  id: string;
  title: string;
  summary: string;
  purpose: string;
  href: string;
  relatedConceptSlugs: ConceptSlug[];
  relatedConcepts: ConceptSummary[];
};

export type RecommendedGoalPathTopicStepSummary =
  RecommendedGoalPathResolvedStepBase & {
    kind: "topic";
    topic: TopicDiscoverySummary;
  };

export type RecommendedGoalPathGuidedCollectionStepSummary =
  RecommendedGoalPathResolvedStepBase & {
    kind: "guided-collection";
    collection: GuidedCollectionSummary;
  };

export type RecommendedGoalPathTrackStepSummary =
  RecommendedGoalPathResolvedStepBase & {
    kind: "track";
    track: StarterTrackSummary;
    prerequisiteTracks: StarterTrackSummary[];
  };

export type RecommendedGoalPathConceptStepSummary =
  RecommendedGoalPathResolvedStepBase & {
    kind: "concept";
    concept: ConceptSummary;
  };

export type RecommendedGoalPathStepSummary =
  | RecommendedGoalPathTopicStepSummary
  | RecommendedGoalPathGuidedCollectionStepSummary
  | RecommendedGoalPathTrackStepSummary
  | RecommendedGoalPathConceptStepSummary;

type RecommendedGoalPathTopicSummary = Pick<TopicDiscoverySummary, "slug" | "title"> & {
  path: string;
};

type RecommendedGoalPathTrackSummary = Pick<
  StarterTrackSummary,
  "slug" | "title" | "accent" | "estimatedStudyMinutes"
> & {
  path: string;
};

type RecommendedGoalPathCollectionSummary = Pick<
  GuidedCollectionSummary,
  "slug" | "title" | "accent" | "estimatedStudyMinutes" | "format"
> & {
  path: string;
};

export type RecommendedGoalPathSummary = Omit<
  RecommendedGoalPathMetadata,
  "steps"
> & {
  path: string;
  steps: RecommendedGoalPathStepSummary[];
  topics: RecommendedGoalPathTopicSummary[];
  relatedTracks: RecommendedGoalPathTrackSummary[];
  relatedCollections: RecommendedGoalPathCollectionSummary[];
  conceptSlugs: ConceptSlug[];
  concepts: ConceptSummary[];
  conceptCount: number;
  estimatedStudyMinutes: number;
};

let cachedRecommendedGoalPaths: RecommendedGoalPathSummary[] | null = null;
let cachedRecommendedGoalPathBySlug: Map<string, RecommendedGoalPathSummary> | null = null;

function readRecommendedGoalPathsFromDisk(): RecommendedGoalPathMetadata[] {
  return recommendedGoalPathCatalogSchema.parse(
    getCatalogData("recommendedGoalPaths"),
  ) as RecommendedGoalPathMetadata[];
}

function orderRecommendedGoalPaths(entries: RecommendedGoalPathMetadata[]) {
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

export function validateRecommendedGoalPathCatalog(
  entries: RecommendedGoalPathMetadata[],
) {
  const pathIds = new Set<string>();
  const pathSlugs = new Set<string>();

  for (const entry of entries) {
    if (pathIds.has(entry.id)) {
      throw new Error(`Duplicate recommended goal path id found: ${entry.id}`);
    }

    if (pathSlugs.has(entry.slug)) {
      throw new Error(`Duplicate recommended goal path slug found: ${entry.slug}`);
    }

    pathIds.add(entry.id);
    pathSlugs.add(entry.slug);
  }

  for (const entry of entries) {
    for (const topicSlug of entry.topicSlugs) {
      getTopicDiscoverySummaryBySlug(topicSlug);
    }

    for (const step of entry.steps) {
      if (step.kind === "topic") {
        getTopicDiscoverySummaryBySlug(step.topicSlug);
        continue;
      }

      if (step.kind === "guided-collection") {
        getGuidedCollectionBySlug(step.collectionSlug);
        continue;
      }

      if (step.kind === "track") {
        getStarterTrackBySlug(step.trackSlug);
        continue;
      }

      getConceptBySlug(step.conceptSlug);
    }
  }

  return orderRecommendedGoalPaths(entries);
}

function buildTopicLink(topic: Pick<TopicDiscoverySummary, "slug" | "title">) {
  return {
    slug: topic.slug,
    title: topic.title,
    path: `/concepts/topics/${topic.slug}`,
  } satisfies RecommendedGoalPathTopicSummary;
}

function buildTrackLink(track: StarterTrackSummary) {
  return {
    slug: track.slug,
    title: track.title,
    accent: track.accent,
    estimatedStudyMinutes: track.estimatedStudyMinutes,
    path: `/tracks/${track.slug}`,
  } satisfies RecommendedGoalPathTrackSummary;
}

function buildCollectionLink(collection: GuidedCollectionSummary) {
  return {
    slug: collection.slug,
    title: collection.title,
    accent: collection.accent,
    estimatedStudyMinutes: collection.estimatedStudyMinutes,
    format: collection.format,
    path: collection.path,
  } satisfies RecommendedGoalPathCollectionSummary;
}

function loadRecommendedGoalPaths(): RecommendedGoalPathSummary[] {
  const entries = validateRecommendedGoalPathCatalog(readRecommendedGoalPathsFromDisk());
  const conceptsBySlug = new Map(getConceptSummaries().map((concept) => [concept.slug, concept]));

  return entries.map((entry) => {
    const conceptSlugSet = new Set<ConceptSlug>();
    const topicMap = new Map<string, RecommendedGoalPathTopicSummary>();
    const trackMap = new Map<string, RecommendedGoalPathTrackSummary>();
    const collectionMap = new Map<string, RecommendedGoalPathCollectionSummary>();

    for (const topicSlug of entry.topicSlugs) {
      const topic = getTopicDiscoverySummaryBySlug(topicSlug);
      topicMap.set(topic.slug, buildTopicLink(topic));
    }

    const steps = entry.steps.map((step) => {
      if (step.kind === "topic") {
        const topic = getTopicDiscoverySummaryBySlug(step.topicSlug);

        for (const concept of topic.concepts) {
          conceptSlugSet.add(concept.slug);
        }

        topicMap.set(topic.slug, buildTopicLink(topic));

        return {
          kind: "topic",
          id: step.id,
          title: step.title,
          summary: step.summary,
          purpose: step.purpose,
          href: `/concepts/topics/${topic.slug}`,
          relatedConceptSlugs: topic.concepts.map((concept) => concept.slug),
          relatedConcepts: topic.concepts,
          topic,
        } satisfies RecommendedGoalPathTopicStepSummary;
      }

      if (step.kind === "guided-collection") {
        const collection = getGuidedCollectionBySlug(step.collectionSlug);

        for (const concept of collection.concepts) {
          conceptSlugSet.add(concept.slug);
        }

        collection.topics.forEach((topic) => {
          topicMap.set(topic.slug, buildTopicLink(topic));
        });

        collection.relatedTracks.forEach((track) => {
          const resolvedTrack = getStarterTrackBySlug(track.slug);
          trackMap.set(resolvedTrack.slug, buildTrackLink(resolvedTrack));
        });

        collectionMap.set(collection.slug, buildCollectionLink(collection));

        return {
          kind: "guided-collection",
          id: step.id,
          title: step.title,
          summary: step.summary,
          purpose: step.purpose,
          href: collection.path,
          relatedConceptSlugs: collection.conceptSlugs,
          relatedConcepts: collection.concepts,
          collection,
        } satisfies RecommendedGoalPathGuidedCollectionStepSummary;
      }

      if (step.kind === "track") {
        const track = getStarterTrackBySlug(step.trackSlug);
        const prerequisiteTracks = (track.prerequisiteTrackSlugs ?? []).map((trackSlug) =>
          getStarterTrackBySlug(trackSlug),
        );

        for (const concept of track.concepts) {
          conceptSlugSet.add(concept.slug);
          const topic = getTopicDiscoverySummaryForConceptSlug(concept.slug);
          topicMap.set(topic.slug, buildTopicLink(topic));
        }

        trackMap.set(track.slug, buildTrackLink(track));
        prerequisiteTracks.forEach((prerequisiteTrack) => {
          trackMap.set(prerequisiteTrack.slug, buildTrackLink(prerequisiteTrack));
        });

        return {
          kind: "track",
          id: step.id,
          title: step.title,
          summary: step.summary,
          purpose: step.purpose,
          href: `/tracks/${track.slug}`,
          relatedConceptSlugs: track.conceptSlugs,
          relatedConcepts: track.concepts,
          track,
          prerequisiteTracks,
        } satisfies RecommendedGoalPathTrackStepSummary;
      }

      const concept = conceptsBySlug.get(step.conceptSlug);

      if (!concept) {
        throw new Error(
          `Recommended goal path "${entry.slug}" references missing published concept "${step.conceptSlug}".`,
        );
      }

      conceptSlugSet.add(concept.slug);
      const topic = getTopicDiscoverySummaryForConceptSlug(concept.slug);
      topicMap.set(topic.slug, buildTopicLink(topic));

      return {
        kind: "concept",
        id: step.id,
        title: step.title,
        summary: step.summary,
        purpose: step.purpose,
        href: `/concepts/${concept.slug}`,
        relatedConceptSlugs: [concept.slug],
        relatedConcepts: [concept],
        concept,
      } satisfies RecommendedGoalPathConceptStepSummary;
    });

    const concepts = [...conceptSlugSet].map((conceptSlug) => {
      const concept = conceptsBySlug.get(conceptSlug);

      if (!concept) {
        throw new Error(
          `Recommended goal path "${entry.slug}" references missing published concept "${conceptSlug}".`,
        );
      }

      return concept;
    });

    return {
      ...entry,
      path: `/guided#goal-${entry.slug}`,
      steps,
      topics: Array.from(topicMap.values()),
      relatedTracks: Array.from(trackMap.values()),
      relatedCollections: Array.from(collectionMap.values()),
      conceptSlugs: concepts.map((concept) => concept.slug),
      concepts,
      conceptCount: concepts.length,
      estimatedStudyMinutes: concepts.reduce(
        (sum, concept) => sum + (concept.estimatedStudyMinutes ?? 0),
        0,
      ),
    } satisfies RecommendedGoalPathSummary;
  });
}

function buildRecommendedGoalPathCache() {
  if (!cachedRecommendedGoalPaths || !cachedRecommendedGoalPathBySlug) {
    cachedRecommendedGoalPaths = loadRecommendedGoalPaths();
    cachedRecommendedGoalPathBySlug = new Map(
      cachedRecommendedGoalPaths.map((goalPath) => [goalPath.slug, goalPath]),
    );
  }

  return {
    all: cachedRecommendedGoalPaths,
    bySlug: cachedRecommendedGoalPathBySlug,
  };
}

export function getRecommendedGoalPaths() {
  return buildRecommendedGoalPathCache().all;
}

export function getRecommendedGoalPathBySlug(slug: string) {
  const goalPath = buildRecommendedGoalPathCache().bySlug.get(slug);

  if (!goalPath) {
    throw new Error(`Unknown recommended goal path slug: ${slug}`);
  }

  return goalPath;
}

export function getRecommendedGoalPathsForTopic(topicSlug: string) {
  return getRecommendedGoalPaths().filter((goalPath) => goalPath.topicSlugs.includes(topicSlug));
}

export function getRecommendedGoalPathCatalogFilePath() {
  return getCatalogFilePath("recommendedGoalPaths");
}
