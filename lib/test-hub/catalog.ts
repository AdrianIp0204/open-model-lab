import {
  getAllConcepts,
  type ConceptContent,
  type ConceptDifficulty,
} from "@/lib/content";
import { conceptShareAnchorIds } from "@/lib/share-links";
import { hasConceptQuizSupport, resolveConceptQuizDefinition } from "@/lib/quiz";

export type TestCatalogEntryKind = "concept" | "topic" | "pack";

export type ConceptTestCatalogEntry = {
  kind: "concept";
  id: string;
  order: number;
  conceptId: string;
  conceptSlug: string;
  title: string;
  shortTitle?: string;
  summary: string;
  subject: string;
  topic: string;
  difficulty: ConceptDifficulty;
  questionCount: number;
  testHref: string;
  reviewHref: string;
};

export type TestCatalogEntry = ConceptTestCatalogEntry;

export type TestCatalog = {
  entries: TestCatalogEntry[];
  nextByConceptSlug: Map<string, ConceptTestCatalogEntry | null>;
};

export function buildConceptTestHref(slug: string) {
  return `/tests/concepts/${slug}`;
}

export function buildConceptQuickTestHref(slug: string) {
  return `/concepts/${slug}#${conceptShareAnchorIds.quickTest}`;
}

export function buildConceptReviewHref(slug: string) {
  return `/concepts/${slug}#${conceptShareAnchorIds.interactiveLab}`;
}

export function buildConceptTestCatalogEntriesFromConcepts(
  concepts: Array<
    Pick<
      ConceptContent,
      | "id"
      | "slug"
      | "title"
      | "shortTitle"
      | "summary"
      | "subject"
      | "topic"
      | "difficulty"
      | "published"
      | "quickTest"
      | "sections"
      | "simulation"
    >
  >,
) {
  return concepts
    .filter((concept) => concept.published && hasConceptQuizSupport(concept))
    .map(
      (concept, index) =>
        ({
          kind: "concept",
          id: `concept-test:${concept.slug}`,
          order: index,
          conceptId: concept.id,
          conceptSlug: concept.slug,
          title: concept.title,
          shortTitle: concept.shortTitle,
          summary: concept.summary,
          subject: concept.subject,
          topic: concept.topic,
          difficulty: concept.difficulty,
          questionCount: resolveConceptQuizDefinition(concept).questionCount,
          testHref: buildConceptTestHref(concept.slug),
          reviewHref: buildConceptReviewHref(concept.slug),
        }) satisfies ConceptTestCatalogEntry,
    );
}

export function buildTestCatalog(entries: ConceptTestCatalogEntry[]): TestCatalog {
  const nextByConceptSlug = new Map<string, ConceptTestCatalogEntry | null>();

  entries.forEach((entry, index) => {
    const sameTopicNext =
      entries.slice(index + 1).find((candidate) => candidate.topic === entry.topic) ?? null;
    const nextEntry = sameTopicNext ?? entries[index + 1] ?? null;
    nextByConceptSlug.set(entry.conceptSlug, nextEntry);
  });

  return {
    entries,
    nextByConceptSlug,
  };
}

export function getPublishedConceptTestCatalog() {
  return buildTestCatalog(buildConceptTestCatalogEntriesFromConcepts(getAllConcepts()));
}

export function getPublishedConceptTestEntryBySlug(conceptSlug: string) {
  return (
    getPublishedConceptTestCatalog().entries.find(
      (entry) => entry.conceptSlug === conceptSlug,
    ) ?? null
  );
}

export function getNextPublishedConceptTestEntry(conceptSlug: string) {
  return getPublishedConceptTestCatalog().nextByConceptSlug.get(conceptSlug) ?? null;
}

export function groupConceptTestCatalogEntriesBySubject(
  entries: ConceptTestCatalogEntry[],
) {
  const groups = new Map<string, ConceptTestCatalogEntry[]>();

  for (const entry of entries) {
    const current = groups.get(entry.subject) ?? [];
    current.push(entry);
    groups.set(entry.subject, current);
  }

  return [...groups.entries()].map(([subject, subjectEntries]) => ({
    subject,
    entries: subjectEntries,
  }));
}
