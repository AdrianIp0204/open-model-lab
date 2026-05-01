import { describe, expect, it } from "vitest";
import { getConceptBySlug, type ConceptContent } from "@/lib/content";
import { evaluateChallengeItem } from "@/lib/learning/challengeMode";
import type { ConceptSimulationSource } from "@/lib/physics";

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

describe("magnetism challenge mode", () => {
  it("evaluates the expanded magnetism challenge entries against live compare and inspect state", () => {
    const cases = [
      {
        conceptSlug: "magnetic-fields",
        challengeId: "mf-ch-compare-lift-and-cancel",
        runtime: {
          params: {
            currentA: 2,
            currentB: 2,
            sourceSeparation: 2.4,
            probeX: 0,
            probeY: 0,
          },
          activeGraphId: "direction-scan",
          overlayValues: {
            fieldVectors: true,
          },
          time: 0,
          timeSource: "live" as const,
          compare: {
            activeTarget: "b" as const,
            setupA: {
              currentA: 2,
              currentB: -2,
              sourceSeparation: 2.4,
              probeX: 0,
              probeY: 1,
            },
            setupB: {
              currentA: 2,
              currentB: 2,
              sourceSeparation: 2.4,
              probeX: 0,
              probeY: 0,
            },
          },
        },
      },
      {
        conceptSlug: "electromagnetic-induction",
        challengeId: "emi-ch-oppose-rising-flux",
        runtime: {
          params: {
            magnetStrength: 1.4,
            coilTurns: 120,
            coilArea: 1,
            speed: 1.2,
            startOffset: 2.6,
            northFacingCoil: true,
          },
          activeGraphId: "field-flux",
          overlayValues: {
            fieldBand: true,
            currentLoop: true,
          },
          time: 1.8,
          timeSource: "inspect" as const,
          compare: null,
        },
      },
      {
        conceptSlug: "magnetic-force-moving-charges-currents",
        challengeId: "mfmc-ch-faster-wider-arc",
        runtime: {
          params: {
            fieldStrength: 1.6,
            speed: 6.4,
            directionAngle: 0,
            negativeCharge: false,
            current: 2,
          },
          activeGraphId: "force",
          overlayValues: {
            orbitGuide: true,
            wireForcePanel: true,
          },
          time: 0,
          timeSource: "live" as const,
          compare: {
            activeTarget: "b" as const,
            setupA: {
              fieldStrength: 1.6,
              speed: 4.5,
              directionAngle: 0,
              negativeCharge: false,
              current: 2,
            },
            setupB: {
              fieldStrength: 1.6,
              speed: 6.4,
              directionAngle: 0,
              negativeCharge: false,
              current: 2,
            },
          },
        },
      },
    ] as const;

    for (const testCase of cases) {
      const concept = getConceptBySlug(testCase.conceptSlug);
      const source = buildSimulationSource(concept);
      const item = concept.challengeMode?.items.find((entry) => entry.id === testCase.challengeId);

      expect(item, `${testCase.conceptSlug}:${testCase.challengeId}`).toBeTruthy();

      const evaluation = evaluateChallengeItem(source, item!, testCase.runtime);

      expect(evaluation.completed, `${testCase.conceptSlug}:${testCase.challengeId}`).toBe(true);
      expect(evaluation.matchedCount, `${testCase.conceptSlug}:${testCase.challengeId}`).toBe(
        evaluation.totalCount,
      );
    }
  });
});
