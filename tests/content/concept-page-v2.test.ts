import { describe, expect, it } from "vitest";
import enMessages from "@/messages/en.json";
import zhHkMessages from "@/messages/zh-HK.json";
import {
  getConceptBySlug,
  getReadNextRecommendations,
  resolveConceptPageV2,
  resolveConceptPageV2StepIdFromHash,
  resolveConceptPageV2StepIdFromLegacyPhase,
} from "@/lib/content";
import { conceptShareAnchorIds, localizeShareHref } from "@/lib/share-links";

function readPath(source: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, source);
}

describe("concept page v2 resolver", () => {
  it("prefers authored guided steps for migrated concepts", () => {
    const concept = getConceptBySlug("simple-harmonic-motion");
    const model = resolveConceptPageV2(concept, {
      locale: "en",
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(model.source).toBe("authored");
    expect(model.steps.map((step) => step.label)).toEqual([
      "See one full cycle",
      "Link the stage and graphs",
      "Explain the restoring rule",
    ]);
    expect(model.steps.map((step) => step.focusPhase)).toEqual([
      "explore",
      "understand",
      "check",
    ]);
    expect(model.wrapUp.learned.length).toBeGreaterThan(0);
    expect(model.referenceSections.map((section) => section.id)).toContain("explanation");
    expect(model.equationSnapshotNote).toBe(
      "Keep one displacement equation and one acceleration equation in sight while you read the cycle.",
    );
    expect(model.equationSnapshot[0]).toMatchObject({
      label: "Restoring pattern",
      meaning: "The position of the oscillator as a function of time.",
      readAloud:
        "position at time t equals amplitude times cosine of omega times time plus phi",
    });
    expect(model.simulationPreview.description).toBe(
      "Start by changing Amplitude, then compare the stage with the Displacement over time graph.",
    );
  });

  it("derives a fallback lesson path for non-migrated concepts", () => {
    const concept = structuredClone(getConceptBySlug("oscillation-energy"));
    concept.v2 = undefined;
    const model = resolveConceptPageV2(concept, {
      locale: "en",
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(model.source).toBe("fallback");
    expect(model.steps).toHaveLength(4);
    expect(model.steps[0].label).toBe("See the setup");
    expect(model.steps[0].revealItems.length).toBeGreaterThan(0);
    expect(model.wrapUp.reviewHref).toBe("/concepts/oscillation-energy#interactive-lab");
  });

  it("keeps query-only and hash-only concept links on the current localized route", () => {
    expect(localizeShareHref("?phase=check#challenge-mode", "zh-HK")).toBe(
      "?phase=check#challenge-mode",
    );
    expect(localizeShareHref("#live-bench", "zh-HK")).toBe("#live-bench");
  });

  it("keeps challenge wrap-up links on the current localized concept route", () => {
    const concept = getConceptBySlug("rolling-motion");
    const model = resolveConceptPageV2(concept, {
      locale: "en",
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(model.wrapUp.challengeHref).toBe(
      `/en/concepts/rolling-motion?phase=check#${conceptShareAnchorIds.challengeMode}`,
    );
  });

  it("uses authored beginner-facing wave interference steps", () => {
    const concept = getConceptBySlug("wave-interference");
    const model = resolveConceptPageV2(concept, {
      locale: "en",
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(model.source).toBe("authored");
    expect(model.steps.map((step) => step.label)).toEqual([
      "Compare one point and the screen",
      "Turn distance into phase",
      "Test cancellation limits",
    ]);
    expect(model.steps[0].explain).toContain(
      "the probe graph shows the wave moving up and down over time at one selected position",
    );
    expect(model.steps[1].inlineCheck?.title).toBe("Read a bright or dark band");
    expect(model.equationSnapshot.map((equation) => equation.id)).toEqual([
      "wave-path",
      "wave-phase",
    ]);
    expect(model.wrapUp.learned).toContain(
      "Bright and dark regions come from two waves overlapping at the same screen point, not from one wave disappearing.",
    );
  });

  it("keeps fallback wrap-up ideas from repeating the start key takeaway", () => {
    const concept = structuredClone(getConceptBySlug("vectors-components"));
    concept.v2 = undefined;
    const repeatedIdea =
      "A diagonal vector is not two separate pushes. Its horizontal and vertical components are the shadows of the same vector on each axis.";
    concept.pageIntro = {
      ...concept.pageIntro,
      keyTakeaway: repeatedIdea,
    };
    concept.sections.keyIdeas = [
      repeatedIdea,
      "Changing angle redistributes the same vector between horizontal and vertical parts.",
      "The component graphs stay linked to one straight path.",
    ];

    const model = resolveConceptPageV2(concept, {
      locale: "en",
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(model.source).toBe("fallback");
    expect(model.wrapUp.learned).toEqual([
      "Changing angle redistributes the same vector between horizontal and vertical parts.",
      "The component graphs stay linked to one straight path.",
    ]);
  });

  it("maps legacy phases and hash anchors to the closest v2 step", () => {
    const concept = getConceptBySlug("graph-transformations");
    const model = resolveConceptPageV2(concept, {
      locale: "en",
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(resolveConceptPageV2StepIdFromLegacyPhase(model, "explore")).toBe(
      "slide-the-parent-curve",
    );
    expect(resolveConceptPageV2StepIdFromLegacyPhase(model, "check")).toBe(
      "explain-a-reflection",
    );
    expect(
      resolveConceptPageV2StepIdFromHash(model, conceptShareAnchorIds.quickTest),
    ).toBe("explain-a-reflection");
  });

  it("keeps the shared v2 shell message keys present in both en and zh-HK", () => {
    const requiredPaths = [
      "ConceptPage.v2.startHereLabel",
      "ConceptPage.v2.whyItMattersLabel",
      "ConceptPage.v2.estimatedTimeLabel",
      "ConceptPage.v2.equationSnapshotLabel",
      "ConceptPage.v2.equationReadAloudLabel",
      "ConceptPage.v2.equationCountLabel",
      "ConceptPage.v2.equationDisclosureLabel",
      "ConceptPage.v2.startLearning",
      "ConceptPage.v2.lessonFlowLabel",
      "ConceptPage.v2.currentStepLabel",
      "ConceptPage.v2.actLabel",
      "ConceptPage.v2.observeLabel",
      "ConceptPage.v2.explainLabel",
      "ConceptPage.v2.nowAvailableLabel",
      "ConceptPage.v2.quickCheckLabel",
      "ConceptPage.v2.previousStep",
      "ConceptPage.v2.nextStep",
      "ConceptPage.v2.wrapUpLabel",
      "ConceptPage.v2.wrapUpTitle",
      "ConceptPage.v2.referenceLabel",
      "ConceptPage.v2.referenceTitle",
      "ConceptPage.v2.referenceDescription",
      "ConceptPage.v2.conceptTestLabel",
      "ConceptPage.v2.reviewBenchLabel",
      "ConceptPage.v2.nextConceptsLabel",
      "ConceptPage.v2.nextConceptsDescription",
      "ConceptPage.v2.practiceActionsLabel",
      "ConceptPage.v2.practiceActionsDescription",
      "ConceptPage.v2.practiceOptionLabel",
      "ConceptPage.v2.showMoreOptionsLabel",
      "ConceptPage.v2.hideMoreOptionsLabel",
      "ConceptPage.v2.freePlayLabel",
      "ConceptPage.v2.challengeLabel",
      "ConceptPage.v2.challengeDescription",
      "ConceptPage.v2.workedExamplesLabel",
      "ConceptPage.v2.workedExamplesDescription",
      "ConceptPage.v2.commonMisconceptionLabel",
      "ConceptPage.v2.revealKinds.control",
      "ConceptPage.v2.revealKinds.graph",
      "ConceptPage.v2.revealKinds.overlay",
      "ConceptPage.v2.revealKinds.tool",
      "ConceptPage.v2.revealKinds.section",
      "ConceptPage.v2.shareToolsTitle",
      "ConceptPage.v2.shareToolsDescription",
      "ConceptPage.v2.progressSupportTitle",
      "ConceptPage.v2.progressSupportDescription",
      "ConceptPage.v2.estimatedMinutes",
      "ConceptPage.v2.simulationPreview.controlAndGraphNamed",
      "ConceptPage.v2.simulationPreview.controlNamed",
      "ConceptPage.v2.simulationPreview.graphNamed",
      "ConceptPage.v2.inlineChecks.predictionEyebrow",
      "ConceptPage.v2.inlineChecks.graphEyebrow",
      "ConceptPage.v2.inlineChecks.explainEyebrow",
      "ConceptPage.v2.inlineChecks.quickCheckEyebrow",
    ];

    for (const path of requiredPaths) {
      expect(readPath(enMessages, path), `Missing en key ${path}`).toBeTruthy();
      expect(readPath(zhHkMessages, path), `Missing zh-HK key ${path}`).toBeTruthy();
    }

    expect(zhHkMessages.ConceptPage.v2.challengeDescription).not.toMatch(/lesson flow/i);
  });
});
