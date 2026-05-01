import type { ConceptContent, ConceptSlug } from "@/lib/content";
import type { ControlValue } from "@/lib/physics";
import { hasConceptQuizSupport } from "@/lib/quiz";
import type {
  ResolvedConceptSimulationState,
  ShareableConceptCompareState,
} from "@/lib/share-links";
import type { LiveWorkedExampleState } from "./liveWorkedExamples";

export type ConceptPageRuntimeSnapshot = LiveWorkedExampleState & {
  title: string;
  topic: string;
  overlayValues: Record<string, boolean>;
  focusedOverlayId: string | null;
  compare?: ShareableConceptCompareState | null;
  featureAvailability: {
    prediction: boolean;
    compare: boolean;
    challenge?: boolean;
    guidedOverlays: boolean;
    noticePrompts: boolean;
    workedExamples: boolean;
    quickTest: boolean;
  };
};

function cloneParams(params: Record<string, ControlValue>) {
  return { ...params };
}

export function buildInitialConceptPageRuntimeSnapshot(
  concept: Pick<
    ConceptContent,
    | "id"
    | "slug"
    | "title"
    | "topic"
    | "graphs"
    | "quickTest"
    | "predictionMode"
    | "challengeMode"
    | "noticePrompts"
    | "sections"
    | "simulation"
  >,
  initialSimulationState: ResolvedConceptSimulationState | null = null,
): ConceptPageRuntimeSnapshot {
  const overlayValues = Object.fromEntries(
    (concept.simulation.overlays ?? []).map((overlay) => [overlay.id, overlay.defaultOn]),
  );
  const effectiveOverlayValues = {
    ...(initialSimulationState?.overlayValues ?? overlayValues),
  };
  const focusedOverlayId =
    initialSimulationState?.focusedOverlayId ??
    (concept.simulation.overlays ?? []).find((overlay) => effectiveOverlayValues[overlay.id])?.id ??
    concept.simulation.overlays?.[0]?.id ??
    null;
  const activeCompareSetup = initialSimulationState?.compare
    ? initialSimulationState.compare.activeTarget === "a"
      ? initialSimulationState.compare.setupA
      : initialSimulationState.compare.setupB
    : null;

  return {
    slug: concept.slug as ConceptSlug,
    title: concept.title,
    topic: concept.topic,
    params: cloneParams(activeCompareSetup?.params ?? initialSimulationState?.params ?? concept.simulation.defaults),
    time: initialSimulationState?.inspectTime ?? 0,
    timeSource: initialSimulationState?.inspectTime != null ? "inspect" : "live",
    activeGraphId: initialSimulationState?.activeGraphId ?? concept.graphs[0]?.id ?? null,
    interactionMode: initialSimulationState?.compare ? "compare" : "explore",
    activeCompareTarget: initialSimulationState?.compare?.activeTarget ?? null,
    activePresetId: activeCompareSetup?.activePresetId ?? initialSimulationState?.activePresetId ?? null,
    overlayValues: effectiveOverlayValues,
    focusedOverlayId,
    compare: initialSimulationState?.compare
      ? {
          activeTarget: initialSimulationState.compare.activeTarget,
          setupA: {
            label: initialSimulationState.compare.setupA.label,
            params: cloneParams(initialSimulationState.compare.setupA.params),
            activePresetId: initialSimulationState.compare.setupA.activePresetId,
          },
          setupB: {
            label: initialSimulationState.compare.setupB.label,
            params: cloneParams(initialSimulationState.compare.setupB.params),
            activePresetId: initialSimulationState.compare.setupB.activePresetId,
          },
        }
      : null,
    featureAvailability: {
      prediction: concept.predictionMode.items.length > 0,
      compare: true,
      challenge: (concept.challengeMode?.items.length ?? 0) > 0,
      guidedOverlays: (concept.simulation.overlays ?? []).length > 0,
      noticePrompts: concept.noticePrompts.items.length > 0,
      workedExamples: concept.sections.workedExamples.items.length > 0,
      quickTest: hasConceptQuizSupport(concept),
    },
  };
}
