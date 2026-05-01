import type {
  ConceptMetadata,
  ConceptRecommendation,
  ConceptSummary as BaseConceptSummary,
} from "@/lib/content";

export type ConceptSummary = BaseConceptSummary & {
  prerequisites?: ConceptMetadata["prerequisites"];
  tags?: ConceptMetadata["tags"];
  recommendedNext?: ConceptRecommendation[];
};
export type ConceptSubject = ConceptSummary["subject"];
export type ConceptTopic = ConceptSummary["topic"];
export type ConceptDifficulty = ConceptSummary["difficulty"];
export type ConceptAccent = ConceptSummary["accent"];
export type CountedConceptFilterOption<Value extends string> = {
  value: "All" | Value;
  count: number;
};

type DecorateConceptSummariesOptions = {
  conceptMetadata?: Array<
    Pick<ConceptMetadata, "slug" | "prerequisites" | "tags" | "recommendedNext">
  >;
};

function compareBySequence(left: BaseConceptSummary, right: BaseConceptSummary) {
  const leftSequence = left.sequence ?? Number.MAX_SAFE_INTEGER;
  const rightSequence = right.sequence ?? Number.MAX_SAFE_INTEGER;

  if (leftSequence !== rightSequence) {
    return leftSequence - rightSequence;
  }

  return left.title.localeCompare(right.title);
}

export function decorateConceptSummaries(
  concepts: BaseConceptSummary[],
  options: DecorateConceptSummariesOptions = {},
): ConceptSummary[] {
  const metadataBySlug = new Map(
    (options.conceptMetadata ?? []).map((metadata) => [metadata.slug, metadata]),
  );

  return concepts.map((concept) => {
    const metadata = metadataBySlug.get(concept.slug);

    return {
      ...concept,
      prerequisites: metadata?.prerequisites,
      tags: metadata?.tags,
      recommendedNext: metadata?.recommendedNext,
    };
  });
}

export function getTopicFilters(
  concepts: BaseConceptSummary[],
  subject: "All" | ConceptSubject = "All",
): Array<"All" | ConceptTopic> {
  return [
    "All",
    ...Array.from(
      new Set(
        concepts
          .filter((concept) => subject === "All" || concept.subject === subject)
          .map((concept) => concept.topic),
      ),
    ),
  ];
}

export function getSubjectFilters(
  concepts: BaseConceptSummary[],
): Array<"All" | ConceptSubject> {
  return ["All", ...Array.from(new Set(concepts.map((concept) => concept.subject)))];
}

export function getSubjectFilterOptions(
  concepts: BaseConceptSummary[],
): Array<CountedConceptFilterOption<ConceptSubject>> {
  const countsBySubject = new Map<ConceptSubject, number>();

  for (const concept of concepts) {
    countsBySubject.set(
      concept.subject,
      (countsBySubject.get(concept.subject) ?? 0) + 1,
    );
  }

  return getSubjectFilters(concepts).map((value) => ({
    value,
    count: value === "All" ? concepts.length : (countsBySubject.get(value) ?? 0),
  }));
}

export function getTopicFilterOptions(
  concepts: BaseConceptSummary[],
  subject: "All" | ConceptSubject = "All",
): Array<CountedConceptFilterOption<ConceptTopic>> {
  const scopedConcepts = concepts.filter(
    (concept) => subject === "All" || concept.subject === subject,
  );
  const countsByTopic = new Map<ConceptTopic, number>();

  for (const concept of scopedConcepts) {
    countsByTopic.set(concept.topic, (countsByTopic.get(concept.topic) ?? 0) + 1);
  }

  return getTopicFilters(concepts, subject).map((value) => ({
    value,
    count: value === "All" ? scopedConcepts.length : (countsByTopic.get(value) ?? 0),
  }));
}

export function getFeaturedConcepts(
  concepts: BaseConceptSummary[],
  limit = 3,
): ConceptSummary[] {
  const ordered = [...concepts].sort(compareBySequence);
  const heroConcepts = ordered.filter((concept) => concept.heroConcept);
  const introConcepts = ordered.filter(
    (concept) => !concept.heroConcept && concept.difficulty === "Intro",
  );
  const remainingConcepts = ordered.filter(
    (concept) => !concept.heroConcept && concept.difficulty !== "Intro",
  );

  return [...heroConcepts, ...introConcepts, ...remainingConcepts].slice(0, limit);
}

export function getQuickStartConcept(
  concepts: BaseConceptSummary[],
): ConceptSummary | null {
  return getFeaturedConcepts(concepts, 1)[0] ?? null;
}
