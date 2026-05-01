import { getTopicDiscoverySummaries } from "@/lib/content";
import type { ProgressSnapshot } from "@/lib/progress";
import type { ConceptTestCatalogEntry } from "./catalog";
import type { PackTestCatalogEntry } from "./packs";
import {
  getConceptTestProgressState,
  getPackTestProgressState,
  getTopicTestProgressState,
  type TestHubProgressState,
} from "./progress";
import type { TopicTestCatalogEntry } from "./topic-tests";

export type GuidedTestTrackStepEntry =
  | ConceptTestCatalogEntry
  | TopicTestCatalogEntry
  | PackTestCatalogEntry;

type GuidedTestTrackStepBase = {
  id: string;
  progress: TestHubProgressState;
  isCompleted: boolean;
  isCurrent: boolean;
};

export type GuidedTestTrackStep =
  | (GuidedTestTrackStepBase & {
      kind: "concept";
      entry: ConceptTestCatalogEntry;
    })
  | (GuidedTestTrackStepBase & {
      kind: "topic";
      entry: TopicTestCatalogEntry;
    })
  | (GuidedTestTrackStepBase & {
      kind: "pack";
      entry: PackTestCatalogEntry;
    });

export type GuidedTestTrack = {
  id: string;
  topicSlug: string;
  topicTitle: string;
  subject: string;
  conceptCount: number;
  totalSteps: number;
  completedStepCount: number;
  steps: GuidedTestTrackStep[];
  nextStep: GuidedTestTrackStep | null;
  milestoneStep: GuidedTestTrackStep | null;
  packStep: GuidedTestTrackStep | null;
};

type BuildGuidedTestTracksInput = {
  conceptEntries: ConceptTestCatalogEntry[];
  topicEntries: TopicTestCatalogEntry[];
  packEntries: PackTestCatalogEntry[];
  snapshot: ProgressSnapshot;
};

function isGuidedTestTrack(track: GuidedTestTrack | null): track is GuidedTestTrack {
  return Boolean(track);
}

function isCompleted(progress: TestHubProgressState) {
  return progress.status === "completed" && !progress.hasStartedAssessmentWithoutCompletion;
}

function getRelevantPackForTopic(
  packEntries: PackTestCatalogEntry[],
  topicSlug: string,
) {
  return (
    packEntries.find((entry) => entry.includedTopicSlugs.includes(topicSlug)) ?? null
  );
}

export function buildGuidedTestTracks({
  conceptEntries,
  topicEntries,
  packEntries,
  snapshot,
}: BuildGuidedTestTracksInput): GuidedTestTrack[] {
  const conceptEntryBySlug = new Map(
    conceptEntries.map((entry) => [entry.conceptSlug, entry] as const),
  );
  const topicEntryBySlug = new Map(
    topicEntries.map((entry) => [entry.topicSlug, entry] as const),
  );
  const tracks: Array<GuidedTestTrack | null> = getTopicDiscoverySummaries().map((topic) => {
      const orderedConceptSteps = topic.concepts
        .map((concept) => conceptEntryBySlug.get(concept.slug))
        .filter((entry): entry is ConceptTestCatalogEntry => Boolean(entry))
        .map((entry) => {
          const progress = getConceptTestProgressState(snapshot, entry);

          return {
            id: `guided-track-step:${entry.id}`,
            kind: "concept" as const,
            entry,
            progress,
            isCompleted: isCompleted(progress),
            isCurrent: false,
          } satisfies GuidedTestTrackStep;
        });
      const milestoneEntry = topicEntryBySlug.get(topic.slug);
      const milestoneStep = milestoneEntry
        ? (() => {
            const progress = getTopicTestProgressState(snapshot, milestoneEntry);

            return {
              id: `guided-track-step:${milestoneEntry.id}`,
              kind: "topic" as const,
              entry: milestoneEntry,
              progress,
              isCompleted: isCompleted(progress),
              isCurrent: false,
            } satisfies GuidedTestTrackStep;
          })()
        : null;
      const packEntry = getRelevantPackForTopic(packEntries, topic.slug);
      const packStep = packEntry
        ? (() => {
            const progress = getPackTestProgressState(snapshot, packEntry);

            return {
              id: `guided-track-step:${packEntry.id}`,
              kind: "pack" as const,
              entry: packEntry,
              progress,
              isCompleted: isCompleted(progress),
              isCurrent: false,
            } satisfies GuidedTestTrackStep;
          })()
        : null;

      const steps: GuidedTestTrackStep[] = [
        ...orderedConceptSteps,
        ...(milestoneStep ? [milestoneStep] : []),
        ...(packStep ? [packStep] : []),
      ];

      if (!steps.length || !milestoneStep) {
        return null;
      }

      const nextStep = steps.find((step) => !step.isCompleted) ?? null;
      const completedStepCount = steps.filter((step) => step.isCompleted).length;

      const track: GuidedTestTrack = {
        id: `guided-test-track:${topic.slug}`,
        topicSlug: topic.slug,
        topicTitle: topic.title,
        subject: topic.subject,
        conceptCount: orderedConceptSteps.length,
        totalSteps: steps.length,
        completedStepCount,
        steps: steps.map((step) => ({
          ...step,
          isCurrent: nextStep ? step.id === nextStep.id : false,
        })),
        nextStep:
          nextStep
            ? {
                ...nextStep,
                isCurrent: true,
              }
            : null,
        milestoneStep,
        packStep,
      } satisfies GuidedTestTrack;

      return track;
    });

  return tracks.filter(isGuidedTestTrack);
}
