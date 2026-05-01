import { resolveConceptPageSections } from "./concept-page-framework";
import {
  getAllConceptMetadata,
  getAllConcepts,
  getConceptLastModified,
} from "./loaders";
import { resolveReadNextFromRegistry, type ReadNextRecommendation } from "./read-next";
import { getStarterTrackMembershipsForConcept, getStarterTracks } from "./starter-tracks";
import type { ConceptContent, ConceptMetadata, StarterTrackMetadata } from "./schema";
import { resolveConceptQuizDefinition } from "@/lib/quiz";

export type AuthorPreviewConceptEntry = {
  id: string;
  slug: string;
  title: string;
  topic: string;
  subtopic?: string;
  difficulty: string;
  published: boolean;
  status: string;
  simulationKind: ConceptContent["simulation"]["kind"];
  contentFile: string;
  sequence?: number;
  publicHref: string | null;
  previewHref: string;
  lastModified: string;
  authoredRecommendedNextSlugs: string[];
  previewReadNext: ReadNextRecommendation[];
  prerequisiteSlugs: string[];
  relatedSlugs: string[];
  starterTrackSlugs: string[];
  sectionOrder: string[];
  sectionSlots: Array<{ id: string; slot: string; title: string }>;
  counts: {
    equations: number;
    controls: number;
    presets: number;
    overlays: number;
    graphs: number;
    noticePrompts: number;
    predictionItems: number;
    challengeItems: number;
    workedExamples: number;
    quickTestQuestions: number;
  };
};

export type AuthorPreviewTrackEntry = {
  id: string;
  slug: string;
  title: string;
  publicHref: string;
  accent: StarterTrackMetadata["accent"];
  estimatedStudyMinutes: number;
  conceptSlugs: string[];
  conceptPreviewHrefs: string[];
};

export type AuthorPreviewIndex = {
  generatedAt: string;
  summary: {
    conceptCount: number;
    publishedConceptCount: number;
    draftConceptCount: number;
    trackCount: number;
    totalChallengeItems: number;
    totalWorkedExamples: number;
    totalQuickTestQuestions: number;
  };
  concepts: AuthorPreviewConceptEntry[];
  starterTracks: AuthorPreviewTrackEntry[];
};

function buildPreviewRegistry(
  metadataEntries: ConceptMetadata[],
  currentSlug: string,
) {
  return metadataEntries.map((entry) =>
    entry.slug === currentSlug ? { ...entry, published: true } : entry,
  );
}

function buildPreviewReadNext(
  metadataEntries: ConceptMetadata[],
  concept: ConceptContent,
) {
  return resolveReadNextFromRegistry(buildPreviewRegistry(metadataEntries, concept.slug), concept.slug);
}

export function getAuthorPreviewIndex(): AuthorPreviewIndex {
  const metadataEntries = getAllConceptMetadata();
  const concepts = getAllConcepts({ includeUnpublished: true });
  const starterTracks = getStarterTracks();

  const conceptEntries = concepts.map((concept) => {
    const previewReadNext = buildPreviewReadNext(metadataEntries, concept);
    const sections = resolveConceptPageSections(concept, { readNext: previewReadNext });

    return {
      id: concept.id,
      slug: concept.slug,
      title: concept.title,
      topic: concept.topic,
      subtopic: concept.subtopic,
      difficulty: concept.difficulty,
      published: concept.published,
      status: concept.status ?? (concept.published ? "published" : "draft"),
      simulationKind: concept.simulation.kind,
      contentFile: concept.contentFile,
      sequence: concept.sequence,
      publicHref: concept.published ? `/concepts/${concept.slug}` : null,
      previewHref: `/author-preview/concepts/${concept.slug}`,
      lastModified: getConceptLastModified(concept.slug).toISOString(),
      authoredRecommendedNextSlugs: (concept.recommendedNext ?? []).map((item) => item.slug),
      previewReadNext,
      prerequisiteSlugs: concept.prerequisites ?? [],
      relatedSlugs: concept.related ?? [],
      starterTrackSlugs: getStarterTrackMembershipsForConcept(concept.slug).map(
        (membership) => membership.track.slug,
      ),
      sectionOrder: sections.map((section) => section.id),
      sectionSlots: sections.map((section) => ({
        id: section.id,
        slot: section.slot,
        title: section.title,
      })),
      counts: {
        equations: concept.equations.length,
        controls: concept.simulation.controls.length,
        presets: concept.simulation.presets.length,
        overlays: concept.simulation.overlays?.length ?? 0,
        graphs: concept.graphs.length,
        noticePrompts: concept.noticePrompts.items.length,
        predictionItems: concept.predictionMode.items.length,
        challengeItems: concept.challengeMode?.items.length ?? 0,
        workedExamples: concept.sections.workedExamples.items.length,
        quickTestQuestions: resolveConceptQuizDefinition(concept).questionCount,
      },
    } satisfies AuthorPreviewConceptEntry;
  });

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      conceptCount: conceptEntries.length,
      publishedConceptCount: conceptEntries.filter((concept) => concept.published).length,
      draftConceptCount: conceptEntries.filter((concept) => !concept.published).length,
      trackCount: starterTracks.length,
      totalChallengeItems: conceptEntries.reduce(
        (sum, concept) => sum + concept.counts.challengeItems,
        0,
      ),
      totalWorkedExamples: conceptEntries.reduce(
        (sum, concept) => sum + concept.counts.workedExamples,
        0,
      ),
      totalQuickTestQuestions: conceptEntries.reduce(
        (sum, concept) => sum + concept.counts.quickTestQuestions,
        0,
      ),
    },
    concepts: conceptEntries,
    starterTracks: starterTracks.map((track) => ({
      id: track.id,
      slug: track.slug,
      title: track.title,
      publicHref: `/tracks/${track.slug}`,
      accent: track.accent,
      estimatedStudyMinutes: track.estimatedStudyMinutes,
      conceptSlugs: [...track.conceptSlugs],
      conceptPreviewHrefs: track.conceptSlugs.map(
        (conceptSlug) => `/author-preview/concepts/${conceptSlug}`,
      ),
    })),
  };
}
