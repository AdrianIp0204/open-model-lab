import { getChallengeCatalogEntries, type ChallengeCatalogEntry } from "./challenges";
import { getConceptBySlug, getConceptSummaries } from "./loaders";
import { resolveConceptQuizDefinition } from "@/lib/quiz";
import { buildConceptQuickTestHref } from "@/lib/test-hub";
import type {
  ConceptSummary,
  LearningPathEntryDiagnosticMetadata,
  LearningPathEntryDiagnosticProbeMetadata,
} from "./schema";

function buildQuickTestHref(conceptSlug: string) {
  return buildConceptQuickTestHref(conceptSlug);
}

function buildChallengeHref(conceptSlug: string, challengeId: string) {
  const search = new URLSearchParams({ challenge: challengeId }).toString();
  return `/concepts/${conceptSlug}?${search}#challenge-mode`;
}

export type ResolvedLearningPathEntryDiagnosticQuickTestProbe = Omit<
  Extract<LearningPathEntryDiagnosticProbeMetadata, { kind: "quick-test" }>,
  "conceptSlug"
> & {
  concept: ConceptSummary;
  href: string;
  questionCount: number;
};

export type ResolvedLearningPathEntryDiagnosticChallengeProbe = Omit<
  Extract<LearningPathEntryDiagnosticProbeMetadata, { kind: "challenge" }>,
  "conceptSlug"
> & {
  concept: ConceptSummary;
  href: string;
  challengeTitle: ChallengeCatalogEntry["title"];
  prompt: ChallengeCatalogEntry["prompt"];
  depth: ChallengeCatalogEntry["depth"];
  checkCount: ChallengeCatalogEntry["checkCount"];
  hintCount: ChallengeCatalogEntry["hintCount"];
  cueLabels: ChallengeCatalogEntry["cueLabels"];
  usesCompare: ChallengeCatalogEntry["usesCompare"];
  usesInspect: ChallengeCatalogEntry["usesInspect"];
};

export type ResolvedLearningPathEntryDiagnosticProbe =
  | ResolvedLearningPathEntryDiagnosticQuickTestProbe
  | ResolvedLearningPathEntryDiagnosticChallengeProbe;

export type ResolvedLearningPathEntryDiagnostic = Omit<
  LearningPathEntryDiagnosticMetadata,
  "probes" | "skipToConcept" | "skipToStepId"
> & {
  probes: ResolvedLearningPathEntryDiagnosticProbe[];
};

export function resolveLearningPathEntryDiagnostic(
  metadata: LearningPathEntryDiagnosticMetadata,
  ownerLabel: string,
) {
  const conceptsBySlug = new Map(getConceptSummaries().map((concept) => [concept.slug, concept]));

  return {
    title: metadata.title,
    summary: metadata.summary,
    probes: metadata.probes.map((probe) => {
      const concept = conceptsBySlug.get(probe.conceptSlug);

      if (!concept) {
        throw new Error(
          `${ownerLabel} entry diagnostic references missing published concept "${probe.conceptSlug}".`,
        );
      }

      if (probe.kind === "quick-test") {
        const conceptContent = getConceptBySlug(probe.conceptSlug);

        return {
          ...probe,
          concept,
          href: buildQuickTestHref(probe.conceptSlug),
          questionCount: resolveConceptQuizDefinition(conceptContent).questionCount,
        } satisfies ResolvedLearningPathEntryDiagnosticQuickTestProbe;
      }

      const conceptContent = getConceptBySlug(probe.conceptSlug);
      const challengeEntry = getChallengeCatalogEntries(
        conceptContent.challengeMode,
        conceptContent.variableLinks,
      ).find((entry) => entry.id === probe.challengeId);

      if (!challengeEntry) {
        throw new Error(
          `${ownerLabel} entry diagnostic probe "${probe.id}" references missing challenge "${probe.challengeId}" in concept "${probe.conceptSlug}".`,
        );
      }

      return {
        ...probe,
        concept,
        href: buildChallengeHref(probe.conceptSlug, probe.challengeId),
        challengeTitle: challengeEntry.title,
        prompt: challengeEntry.prompt,
        depth: challengeEntry.depth,
        checkCount: challengeEntry.checkCount,
        hintCount: challengeEntry.hintCount,
        cueLabels: challengeEntry.cueLabels,
        usesCompare: challengeEntry.usesCompare,
        usesInspect: challengeEntry.usesInspect,
      } satisfies ResolvedLearningPathEntryDiagnosticChallengeProbe;
    }),
  } satisfies ResolvedLearningPathEntryDiagnostic;
}
