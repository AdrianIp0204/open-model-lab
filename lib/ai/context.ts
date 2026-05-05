import type { AppLocale } from "@/i18n/routing";
import type { ConceptContent } from "@/lib/content";
import type { ConceptPageRuntimeSnapshot } from "@/lib/learning/conceptPageRuntime";
import type { ConceptSimulationSource, ControlValue } from "@/lib/physics";
import type { AiLearningContext } from "./types";

type AiContextConcept = Pick<
  ConceptContent,
  | "id"
  | "slug"
  | "title"
  | "summary"
  | "subject"
  | "difficulty"
  | "prerequisites"
  | "pageIntro"
  | "v2"
  | "sections"
  | "equations"
  | "simulation"
  | "graphs"
  | "accessibility"
>;

type BuildAiLearningContextInput = {
  concept: AiContextConcept;
  simulationSource?: ConceptSimulationSource;
  runtimeSnapshot?: ConceptPageRuntimeSnapshot | null;
  locale?: AppLocale | AiLearningContext["language"];
  learningFlow?: AiLearningContext["learningFlow"];
};

function normalizeLanguage(
  locale: BuildAiLearningContextInput["locale"],
): AiLearningContext["language"] {
  if (locale === "zh-HK" || locale === "zh-TW" || locale === "auto") {
    return locale;
  }

  return "en";
}

function normalizeSubject(subject: string): AiLearningContext["page"]["subject"] {
  const normalized = subject.toLowerCase();

  if (normalized.includes("chem")) {
    return "chemistry";
  }

  if (normalized.includes("math")) {
    return "math";
  }

  if (normalized.includes("bio")) {
    return "biology";
  }

  return "physics";
}

function normalizeLevel(difficulty: string): AiLearningContext["page"]["level"] {
  const normalized = difficulty.toLowerCase();

  if (normalized.includes("advanced")) {
    return "advanced";
  }

  if (normalized.includes("intermediate")) {
    return "intermediate";
  }

  return "beginner";
}

function compactTextList(values: Array<string | null | undefined>, fallback: string) {
  const compacted = values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return compacted.length ? Array.from(new Set(compacted)) : [fallback];
}

function buildLearningObjectives(concept: AiContextConcept) {
  const v2Objectives =
    concept.v2?.guidedSteps.flatMap((step) => [
      step.goal,
      step.doThis,
      step.notice,
    ]) ?? [];

  return compactTextList(
    [
      ...v2Objectives,
      concept.pageIntro?.definition,
      concept.pageIntro?.keyTakeaway,
      concept.summary,
    ],
    concept.summary,
  ).slice(0, 10);
}

function buildFormulaList(concept: AiContextConcept) {
  const formulas = concept.equations.map((equation) =>
    `${equation.label}: ${equation.latex}`.trim(),
  );

  return formulas.length ? formulas : undefined;
}

function cloneControlValues(values: Record<string, ControlValue>) {
  return Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, ControlValue] => {
      const value = entry[1];

      return (
        typeof value === "number" ||
        typeof value === "string" ||
        typeof value === "boolean"
      );
    }),
  );
}

function buildDefaultOverlayValues(concept: AiContextConcept) {
  return Object.fromEntries(
    (concept.simulation.overlays ?? []).map((overlay) => [overlay.id, overlay.defaultOn]),
  );
}

function getDefaultFocusedOverlayId(
  concept: AiContextConcept,
  overlayValues: Record<string, boolean>,
) {
  return (
    (concept.simulation.overlays ?? []).find((overlay) => overlayValues[overlay.id])?.id ??
    concept.simulation.overlays?.[0]?.id ??
    null
  );
}

function mapRuntimeMode(
  runtimeSnapshot: ConceptPageRuntimeSnapshot | null | undefined,
): NonNullable<AiLearningContext["simulation"]>["selectedMode"] {
  if (runtimeSnapshot?.interactionMode === "compare") {
    return "compare";
  }

  return "explore";
}

export function buildAiLearningContext({
  concept,
  simulationSource,
  runtimeSnapshot = null,
  locale = "en",
  learningFlow,
}: BuildAiLearningContextInput): AiLearningContext {
  const sourceSimulation = simulationSource?.simulation ?? {
    ...concept.simulation,
    graphs: concept.graphs,
    accessibility: {
      simulationDescription:
        concept.accessibility?.simulationDescription.paragraphs.join(" ") ?? "",
      graphSummary: concept.accessibility?.graphSummary.paragraphs.join(" ") ?? "",
    },
  };
  const controls = cloneControlValues(
    runtimeSnapshot?.params ?? sourceSimulation.defaults,
  );
  const overlayValues = runtimeSnapshot?.overlayValues ?? buildDefaultOverlayValues(concept);
  const activeGraphId =
    runtimeSnapshot?.activeGraphId ??
    sourceSimulation.ui?.initialGraphId ??
    sourceSimulation.graphs[0]?.id ??
    null;
  const activeGraph =
    sourceSimulation.graphs.find((graph) => graph.id === activeGraphId) ??
    sourceSimulation.graphs[0] ??
    null;

  return {
    language: normalizeLanguage(locale),
    page: {
      slug: concept.slug,
      title: concept.title,
      subject: normalizeSubject(concept.subject),
      level: normalizeLevel(concept.difficulty),
      learningObjectives: buildLearningObjectives(concept),
      keyIdeas: compactTextList(concept.sections.keyIdeas, concept.summary),
      formulas: buildFormulaList(concept),
      prerequisites: concept.prerequisites ?? [],
    },
    simulation: {
      id: simulationSource?.id ?? concept.id,
      controls,
      currentState: {
        activeGraphId,
        time: runtimeSnapshot?.time ?? 0,
        activePresetId: runtimeSnapshot?.activePresetId ?? null,
        activeCompareTarget: runtimeSnapshot?.activeCompareTarget ?? null,
        focusedOverlayId:
          runtimeSnapshot?.focusedOverlayId ??
          getDefaultFocusedOverlayId(concept, overlayValues),
        overlayValues,
      },
      graphState: activeGraph
        ? {
            activeGraphId: activeGraph.id,
            label: activeGraph.label,
            xLabel: activeGraph.xLabel,
            yLabel: activeGraph.yLabel,
            series: activeGraph.series,
            description: activeGraph.description ?? null,
          }
        : undefined,
      selectedMode: mapRuntimeMode(runtimeSnapshot),
    },
    learningFlow: learningFlow ?? {
      completedSteps: [],
    },
  };
}
