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

describe("wave speed and wavelength challenge mode", () => {
  it("evaluates the one-cycle probe lag target from live spacing and timing metrics", () => {
    const concept = getConceptBySlug("wave-speed-wavelength");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "wsw-ch-one-cycle-probe-lag",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        amplitude: 1,
        waveSpeed: 2.4,
        wavelength: 1.6,
        probeX: 1.6,
      },
      activeGraphId: "phase-map",
      overlayValues: {
        wavelengthGuide: true,
        delayGuide: true,
        distancePerPeriod: false,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the faster-wave same-spacing target from live frequency and delay metrics", () => {
    const concept = getConceptBySlug("wave-speed-wavelength");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "wsw-ch-faster-same-spacing",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        amplitude: 1,
        waveSpeed: 3.6,
        wavelength: 1.6,
        probeX: 2.4,
      },
      activeGraphId: "displacement",
      overlayValues: {
        wavelengthGuide: true,
        delayGuide: true,
        distancePerPeriod: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });
});
