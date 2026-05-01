import { describe, expect, it } from "vitest";
import { getConceptBySlug, type ConceptContent } from "@/lib/content";
import { evaluateChallengeItem } from "@/lib/learning/challengeMode";
import type { ConceptSimulationSource, ControlValue } from "@/lib/physics";

function buildSimulationSource(concept: ConceptContent): ConceptSimulationSource {
  return {
    id: concept.id,
    title: concept.title,
    summary: concept.summary,
    slug: concept.slug,
    topic: concept.topic,
    equations: concept.equations,
    variableLinks: concept.variableLinks,
    simulation: {
      ...concept.simulation,
      kind: concept.simulation.kind,
      graphs: concept.graphs,
      accessibility: {
        simulationDescription: concept.accessibility.simulationDescription.paragraphs.join(" "),
        graphSummary: concept.accessibility.graphSummary.paragraphs.join(" "),
      },
    },
    noticePrompts: concept.noticePrompts,
    predictionMode: {
      title: concept.predictionMode.title,
      intro: concept.predictionMode.intro,
      items: concept.predictionMode.items.map((item) => ({
        id: item.id,
        prompt: item.prompt,
        changeLabel: item.changeLabel,
        choices: item.choices,
        correctChoiceId: item.correctChoiceId,
        explanation: item.explanation,
        observationHint: item.observationHint,
        scenario: {
          id: item.id,
          label: item.scenarioLabel,
          presetId: item.apply.presetId ?? item.applyPresetId,
          patch: item.apply.patch ?? item.applyPatch,
          highlightedControlIds: item.highlightedControls,
          highlightedGraphIds: item.highlightedGraphs,
          highlightedOverlayIds: item.highlightedOverlays,
        },
      })),
    },
    challengeMode: concept.challengeMode,
    featureAvailability: {
      prediction: concept.predictionMode.items.length > 0,
      compare: true,
      challenge: (concept.challengeMode?.items.length ?? 0) > 0,
      guidedOverlays: (concept.simulation.overlays ?? []).length > 0,
      noticePrompts: concept.noticePrompts.items.length > 0,
      workedExamples: concept.sections.workedExamples.items.length > 0,
      quickTest: concept.quickTest.questions.length > 0,
    },
  };
}

describe("math checkpoint challenge mode", () => {
  it("evaluates the new math checkpoints from live runtime state", () => {
    const cases = [
      {
        conceptSlug: "unit-circle-sine-cosine-from-rotation",
        challengeId: "ucr-ch-quadrant-two-sign-read",
        params: {
          angularSpeed: 0.9,
          phase: 1.7,
          projectionGuides: true,
          angleMarker: true,
          quadrantSigns: true,
          rotationTrail: true,
        } as Record<string, ControlValue>,
        activeGraphId: "projection-history",
        overlayValues: {
          projectionGuides: true,
          quadrantSigns: true,
          angleMarker: true,
        } as Record<string, boolean>,
      },
      {
        conceptSlug: "polar-coordinates-radius-and-angle",
        challengeId: "polar-ch-second-quadrant-xy-bridge",
        params: {
          radius: 3.7,
          angleDeg: 140,
          coordinateGuides: true,
          angleArc: true,
          radiusSweep: true,
        } as Record<string, ControlValue>,
        activeGraphId: "coordinate-sweep",
        overlayValues: {
          coordinateGuides: true,
          angleArc: true,
          radiusSweep: true,
        } as Record<string, boolean>,
      },
      {
        conceptSlug: "dot-product-angle-and-projection",
        challengeId: "dpp-ch-collapse-the-projection",
        params: {
          ax: 4,
          ay: 2,
          bx: -1,
          by: 2,
        } as Record<string, ControlValue>,
        activeGraphId: "dot-product-response",
        overlayValues: {
          angleMarker: true,
          projectionGuide: true,
        } as Record<string, boolean>,
      },
      {
        conceptSlug: "matrix-transformations",
        challengeId: "mt-ch-build-right-shear",
        params: {
          m11: 1,
          m12: 1,
          m21: 0,
          m22: 1,
        } as Record<string, ControlValue>,
        activeGraphId: "probe-image-blend",
        overlayValues: {
          basisVectors: true,
          unitSquare: true,
          sampleShape: true,
        } as Record<string, boolean>,
      },
    ] satisfies Array<{
      conceptSlug: string;
      challengeId: string;
      params: Record<string, ControlValue>;
      activeGraphId: string;
      overlayValues: Record<string, boolean>;
    }>;

    for (const testCase of cases) {
      const concept = getConceptBySlug(testCase.conceptSlug);
      const source = buildSimulationSource(concept);
      const item = concept.challengeMode?.items.find((entry) => entry.id === testCase.challengeId);

      expect(item, `${testCase.conceptSlug}:${testCase.challengeId}`).toBeTruthy();

      const evaluation = evaluateChallengeItem(source, item!, {
        params: testCase.params,
        activeGraphId: testCase.activeGraphId,
        overlayValues: testCase.overlayValues,
        time: 0,
        timeSource: "live",
        compare: null,
      });

      expect(evaluation.completed, `${testCase.conceptSlug}:${testCase.challengeId}`).toBe(true);
      expect(
        evaluation.matchedCount,
        `${testCase.conceptSlug}:${testCase.challengeId}`,
      ).toBe(evaluation.totalCount);
    }
  });
});
