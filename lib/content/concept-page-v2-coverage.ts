import type { ConceptContent } from "./schema";

export type ConceptPageV2CoverageRecord = {
  slug: string;
  title: string;
  subject: string;
  source: "authored" | "fallback";
  guidedStepCount: number;
};

export type ConceptPageV2CoverageSummary = {
  totalPublished: number;
  authoredCount: number;
  fallbackCount: number;
  authored: ConceptPageV2CoverageRecord[];
  fallback: ConceptPageV2CoverageRecord[];
  bySubject: Array<{
    subject: string;
    total: number;
    authored: number;
    fallback: number;
  }>;
};

export function hasAuthoredConceptPageV2(concept: Pick<ConceptContent, "v2">) {
  return Boolean(concept.v2?.guidedSteps?.length);
}

export function summarizeConceptPageV2Coverage(
  concepts: readonly Pick<ConceptContent, "slug" | "title" | "subject" | "v2">[],
): ConceptPageV2CoverageSummary {
  const records = concepts.map((concept) => ({
    slug: concept.slug,
    title: concept.title,
    subject: concept.subject,
    source: hasAuthoredConceptPageV2(concept) ? "authored" : "fallback",
    guidedStepCount: concept.v2?.guidedSteps?.length ?? 0,
  })) satisfies ConceptPageV2CoverageRecord[];

  const authored = records.filter((record) => record.source === "authored");
  const fallback = records.filter((record) => record.source === "fallback");
  const subjectMap = new Map<
    string,
    { subject: string; total: number; authored: number; fallback: number }
  >();

  for (const record of records) {
    const current = subjectMap.get(record.subject) ?? {
      subject: record.subject,
      total: 0,
      authored: 0,
      fallback: 0,
    };

    current.total += 1;
    if (record.source === "authored") {
      current.authored += 1;
    } else {
      current.fallback += 1;
    }

    subjectMap.set(record.subject, current);
  }

  return {
    totalPublished: records.length,
    authoredCount: authored.length,
    fallbackCount: fallback.length,
    authored,
    fallback,
    bySubject: [...subjectMap.values()].sort((left, right) =>
      left.subject.localeCompare(right.subject),
    ),
  };
}
