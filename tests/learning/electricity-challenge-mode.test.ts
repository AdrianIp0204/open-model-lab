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

describe("electricity challenge mode", () => {
  it("evaluates the authored electricity challenges against live simulation state", () => {
    const cases = [
      {
        conceptSlug: "electric-fields",
        challengeId: "ef-ch-build-upward-balance",
        params: {
          sourceChargeA: 2,
          sourceChargeB: 2,
          sourceSeparation: 2,
          probeX: 0,
          probeY: 1,
          testCharge: 1,
        },
        activeGraphId: "direction-scan",
        overlayValues: {
          fieldVectors: true,
          scanLine: true,
        },
      },
      {
        conceptSlug: "electric-fields",
        challengeId: "ef-ch-flip-force-not-field",
        params: {
          sourceChargeA: 2,
          sourceChargeB: 2,
          sourceSeparation: 2,
          probeX: 0,
          probeY: 1,
          testCharge: -1,
        },
        activeGraphId: "direction-scan",
        overlayValues: {
          fieldVectors: true,
          forceVector: true,
        },
      },
      {
        conceptSlug: "electric-potential",
        challengeId: "ep-ch-positive-midpoint-plateau",
        params: {
          sourceChargeA: 2,
          sourceChargeB: 2,
          sourceSeparation: 2,
          probeX: 0,
          probeY: 0,
          testCharge: 1,
        },
        activeGraphId: "field-link",
        overlayValues: {
          potentialMap: true,
          fieldArrow: true,
        },
      },
      {
        conceptSlug: "magnetic-fields",
        challengeId: "mf-ch-build-upward-bridge",
        params: {
          currentA: 2,
          currentB: -2,
          sourceSeparation: 2.4,
          probeX: 0,
          probeY: 1,
        },
        activeGraphId: "direction-scan",
        overlayValues: {
          fieldVectors: true,
          scanLine: true,
        },
      },
      {
        conceptSlug: "electromagnetic-induction",
        challengeId: "emi-ch-high-flux-zero-emf",
        params: {
          magnetStrength: 1.4,
          coilTurns: 120,
          coilArea: 1,
          speed: 0,
          startOffset: 0,
          northFacingCoil: true,
        },
        activeGraphId: "induced-response",
        overlayValues: {
          fieldBand: true,
          currentLoop: true,
        },
      },
      {
        conceptSlug: "magnetic-force-moving-charges-currents",
        challengeId: "mfmc-ch-charge-down-wire-up",
        params: {
          fieldStrength: -0.8,
          speed: 1.5,
          directionAngle: 0,
          negativeCharge: true,
          current: 2,
        },
        activeGraphId: "force",
        overlayValues: {
          motionVectors: true,
          wireForcePanel: true,
        },
      },
      {
        conceptSlug: "basic-circuits",
        challengeId: "bc-ch-full-voltage-parallel-pair",
        params: {
          voltage: 12,
          resistanceA: 6,
          resistanceB: 6,
          parallelMode: true,
        },
        activeGraphId: "voltage-share",
        overlayValues: {
          currentArrows: true,
          nodeGuide: true,
        },
      },
      {
        conceptSlug: "series-parallel-circuits",
        challengeId: "spc-ch-blue-branch-full-voltage",
        params: {
          voltage: 12,
          resistanceA: 4,
          resistanceB: 12,
          parallelMode: true,
        },
        activeGraphId: "branch-voltage",
        overlayValues: {
          voltageLabels: true,
          nodeGuide: true,
        },
      },
      {
        conceptSlug: "equivalent-resistance",
        challengeId: "eqr-ch-parallel-group-collapse",
        params: {
          voltage: 12,
          resistance1: 4,
          resistance2: 6,
          resistance3: 6,
          groupParallel: true,
        },
        activeGraphId: "equivalent-map",
        overlayValues: {
          reductionGuide: true,
        },
      },
      {
        conceptSlug: "power-energy-circuits",
        challengeId: "pec-ch-steady-eighteen-watt-load",
        params: {
          voltage: 12,
          loadResistance: 8,
        },
        activeGraphId: "power-voltage",
        overlayValues: {
          powerGlow: true,
          currentArrows: true,
        },
      },
    ] as const;

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
      expect(evaluation.matchedCount, `${testCase.conceptSlug}:${testCase.challengeId}`).toBe(
        evaluation.totalCount,
      );
    }
  });
});
