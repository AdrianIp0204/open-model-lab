import type { ResolvedConceptPageSection } from "./concept-page-framework";
import type { ConceptPageSectionId } from "./schema";

export const conceptLearningPhaseIds = ["explore", "understand", "check"] as const;
export const conceptLearningPhaseQueryParam = "phase";

export type ConceptLearningPhaseId = (typeof conceptLearningPhaseIds)[number];

export type ConceptLearningPhaseDefinition = {
  id: ConceptLearningPhaseId;
  order: number;
  title: string;
  sectionIds: readonly ConceptPageSectionId[];
};

export type ResolvedConceptLearningPhase = {
  id: ConceptLearningPhaseId;
  order: number;
  title: string;
  sectionIds: ConceptPageSectionId[];
  sections: ResolvedConceptPageSection[];
  hasVisibleSections: boolean;
};

const DEFAULT_CONCEPT_LEARNING_PHASE_DEFINITIONS: ConceptLearningPhaseDefinition[] = [
  {
    id: "explore",
    order: 10,
    title: "Explore",
    sectionIds: ["explanation", "keyIdeas"],
  },
  {
    id: "understand",
    order: 20,
    title: "Understand",
    sectionIds: ["workedExamples", "commonMisconception", "accessibility"],
  },
  {
    id: "check",
    order: 30,
    title: "Check",
    sectionIds: ["miniChallenge", "quickTest", "readNext"],
  },
];

const sectionIdToPhaseId = new Map<ConceptPageSectionId, ConceptLearningPhaseId>(
  DEFAULT_CONCEPT_LEARNING_PHASE_DEFINITIONS.flatMap((phase) =>
    phase.sectionIds.map((sectionId) => [sectionId, phase.id] as const),
  ),
);

export function parseConceptLearningPhaseId(
  value: string | null | undefined,
): ConceptLearningPhaseId | null {
  return conceptLearningPhaseIds.includes(value as ConceptLearningPhaseId)
    ? (value as ConceptLearningPhaseId)
    : null;
}

export function getDefaultConceptLearningPhaseId(
  phases: readonly Pick<ResolvedConceptLearningPhase, "id" | "hasVisibleSections">[],
): ConceptLearningPhaseId {
  return phases.find((phase) => phase.hasVisibleSections)?.id ?? "explore";
}

export function resolveInitialConceptLearningPhaseId(input: {
  phases: readonly Pick<ResolvedConceptLearningPhase, "id" | "hasVisibleSections">[];
  hashPhaseId?: ConceptLearningPhaseId | null;
  queryPhaseId?: ConceptLearningPhaseId | null;
}): ConceptLearningPhaseId {
  return (
    input.hashPhaseId ??
    input.queryPhaseId ??
    getDefaultConceptLearningPhaseId(input.phases)
  );
}

export function resolveConceptLearningPhases(
  sections: readonly ResolvedConceptPageSection[],
): ResolvedConceptLearningPhase[] {
  const sectionsByPhaseId = new Map<ConceptLearningPhaseId, ResolvedConceptPageSection[]>(
    conceptLearningPhaseIds.map((phaseId) => [phaseId, []]),
  );

  for (const section of sections) {
    const phaseId = sectionIdToPhaseId.get(section.id);

    if (!phaseId) {
      continue;
    }

    sectionsByPhaseId.get(phaseId)?.push(section);
  }

  return DEFAULT_CONCEPT_LEARNING_PHASE_DEFINITIONS.map((phase) => {
    const phaseSections = sectionsByPhaseId.get(phase.id) ?? [];

    return {
      id: phase.id,
      order: phase.order,
      title: phase.title,
      sectionIds: [...phase.sectionIds],
      sections: [...phaseSections],
      hasVisibleSections: phaseSections.length > 0,
    };
  });
}
