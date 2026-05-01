import { describe, expect, it } from "vitest";
import { getConceptBySlug, type ConceptContent } from "@/lib/content";
import { evaluateChallengeItem } from "@/lib/learning/challengeMode";
import { resolveLiveWorkedExample } from "@/lib/learning/liveWorkedExamples";
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

describe("air-column resonance learning seams", () => {
  it("resolves the live worked examples against the current tube state", () => {
    const concept = getConceptBySlug("resonance-air-columns-open-closed-pipes");
    const resonanceExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "allowed-frequency",
    );
    const probeExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "probe-motion-vs-pressure",
    );

    expect(resonanceExample).toBeTruthy();
    expect(probeExample).toBeTruthy();

    const resonanceState = {
      slug: concept.slug,
      params: {
        length: 1.2,
        closedEnd: false,
        resonanceOrder: 2,
        probeX: 0.6,
        amplitude: 0.12,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "ladder",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "open-open-second",
    };
    const probeState = {
      ...resonanceState,
      params: {
        length: 1.2,
        closedEnd: true,
        resonanceOrder: 2,
        probeX: 0,
        amplitude: 0.12,
      },
      time: 0.03,
      activeGraphId: "shape",
      activePresetId: "closed-end-pressure",
    };

    const resolvedResonance = resolveLiveWorkedExample(
      concept.slug,
      resonanceExample!,
      resonanceState,
    );
    const resolvedProbe = resolveLiveWorkedExample(concept.slug, probeExample!, probeState);

    expect(resolvedResonance.resultContent).toContain("1.2");
    expect(resolvedResonance.resultContent).toContain("28.33");
    expect(resolvedResonance.interpretation).toMatch(/integer harmonic|half-wave fit/i);
    expect(resolvedProbe.interpretation).toMatch(/motion nearly disappears|pressure cue is strongest/i);
  });

  it("evaluates the air-column challenges from the live and compare states", () => {
    const concept = getConceptBySlug("resonance-air-columns-open-closed-pipes");
    const source = buildSimulationSource(concept);
    const wallItem = concept.challengeMode?.items.find(
      (entry) => entry.id === "acr-ch-closed-end-stillness",
    );
    const compareItem = concept.challengeMode?.items.find(
      (entry) => entry.id === "acr-ch-open-vs-closed-second-mode",
    );

    expect(wallItem).toBeTruthy();
    expect(compareItem).toBeTruthy();

    const wallEvaluation = evaluateChallengeItem(source, wallItem!, {
      params: {
        length: 1.2,
        closedEnd: true,
        resonanceOrder: 2,
        probeX: 0,
        amplitude: 0.12,
      },
      activeGraphId: "shape",
      overlayValues: {
        boundaryRules: true,
        pressureGuides: true,
      },
      time: 0.03,
      timeSource: "live",
      compare: null,
    });

    const compareEvaluation = evaluateChallengeItem(source, compareItem!, {
      params: {
        length: 1.2,
        closedEnd: true,
        resonanceOrder: 2,
        probeX: 0.6,
        amplitude: 0.12,
      },
      activeGraphId: "ladder",
      overlayValues: {
        boundaryRules: true,
        motionNodes: true,
      },
      time: 0,
      timeSource: "live",
      compare: {
        activeTarget: "b",
        setupA: {
          length: 1.2,
          closedEnd: false,
          resonanceOrder: 2,
          probeX: 0.6,
          amplitude: 0.12,
        },
        setupB: {
          length: 1.2,
          closedEnd: true,
          resonanceOrder: 2,
          probeX: 0.6,
          amplitude: 0.12,
        },
      },
    });

    expect(wallEvaluation.completed).toBe(true);
    expect(compareEvaluation.completed).toBe(true);
  });
});
