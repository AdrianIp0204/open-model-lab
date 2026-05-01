import { describe, expect, it } from "vitest";
import {
  getDefaultConceptLearningPhaseId,
  getConceptBySlug,
  getReadNextRecommendations,
  parseConceptLearningPhaseId,
  resolveInitialConceptLearningPhaseId,
  resolveConceptLearningPhases,
  resolveConceptPageSections,
} from "@/lib/content";

function resolvePhasesForConcept(slug: string) {
  const concept = getConceptBySlug(slug);
  const sections = resolveConceptPageSections(concept, {
    readNext: getReadNextRecommendations(concept.slug),
  });

  return resolveConceptLearningPhases(sections);
}

describe("concept learning phases", () => {
  it("groups the canonical lower-page contract into stable phases", () => {
    const phases = resolvePhasesForConcept("simple-harmonic-motion");

    expect(
      phases.map((phase) => ({
        id: phase.id,
        order: phase.order,
        title: phase.title,
        sectionIds: phase.sectionIds,
      })),
    ).toEqual([
      {
        id: "explore",
        order: 10,
        title: "Explore",
        sectionIds: ["explanation", "keyIdeas"],
      },
      {
        id: "understand",
        order: 20,
        title: "Understand",
        sectionIds: ["workedExamples", "commonMisconception", "accessibility"],
      },
      {
        id: "check",
        order: 30,
        title: "Check",
        sectionIds: ["miniChallenge", "quickTest", "readNext"],
      },
    ]);

    expect(phases.map((phase) => phase.sections.map((section) => section.id))).toEqual([
      ["explanation", "keyIdeas"],
      ["workedExamples", "commonMisconception", "accessibility"],
      ["miniChallenge", "quickTest", "readNext"],
    ]);
    expect(phases.every((phase) => phase.hasVisibleSections)).toBe(true);
  });

  it("preserves bounded lower-page overrides while keeping the phase contract stable", () => {
    const concept = structuredClone(getConceptBySlug("projectile-motion"));
    concept.pageFramework = {
      sections: [
        {
          id: "keyIdeas",
          title: "Core ideas",
        },
        {
          id: "miniChallenge",
          enabled: false,
        },
      ],
    };

    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });
    const phases = resolveConceptLearningPhases(sections);
    const explorePhase = phases.find((phase) => phase.id === "explore");
    const checkPhase = phases.find((phase) => phase.id === "check");

    expect(phases.map((phase) => phase.id)).toEqual(["explore", "understand", "check"]);
    expect(explorePhase?.sections.map((section) => section.id)).toEqual([
      "explanation",
      "keyIdeas",
    ]);
    expect(
      explorePhase?.sections.find((section) => section.id === "keyIdeas")?.title,
    ).toBe("Core ideas");
    expect(checkPhase?.sectionIds).toEqual(["miniChallenge", "quickTest", "readNext"]);
    expect(checkPhase?.sections.map((section) => section.id)).toEqual([
      "quickTest",
      "readNext",
    ]);
    expect(checkPhase?.hasVisibleSections).toBe(true);
  });

  it("keeps canonical phases even when a phase has no visible sections", () => {
    const concept = structuredClone(getConceptBySlug("simple-harmonic-motion"));
    concept.sections.workedExamples.items = [];
    concept.sections.commonMisconception.correction = [];
    concept.accessibility.simulationDescription.paragraphs = [];
    concept.accessibility.graphSummary.paragraphs = [];

    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });
    const phases = resolveConceptLearningPhases(sections);
    const understandPhase = phases.find((phase) => phase.id === "understand");

    expect(phases.map((phase) => phase.id)).toEqual(["explore", "understand", "check"]);
    expect(understandPhase?.sectionIds).toEqual([
      "workedExamples",
      "commonMisconception",
      "accessibility",
    ]);
    expect(understandPhase?.sections).toEqual([]);
    expect(understandPhase?.hasVisibleSections).toBe(false);
    expect(phases.find((phase) => phase.id === "explore")?.hasVisibleSections).toBe(true);
    expect(phases.find((phase) => phase.id === "check")?.hasVisibleSections).toBe(true);
  });

  it("defaults to the first visible phase and falls back to explore when none are visible", () => {
    const concept = structuredClone(getConceptBySlug("simple-harmonic-motion"));
    concept.sections.explanation.paragraphs = [];
    concept.sections.keyIdeas = [];

    const visibleLaterSections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });
    const laterPhases = resolveConceptLearningPhases(visibleLaterSections);

    expect(getDefaultConceptLearningPhaseId(laterPhases)).toBe("understand");

    const emptyPhases = laterPhases.map((phase) => ({
      ...phase,
      sections: [],
      hasVisibleSections: false,
    }));

    expect(getDefaultConceptLearningPhaseId(emptyPhases)).toBe("explore");
  });

  it("parses only valid stable phase ids", () => {
    expect(parseConceptLearningPhaseId("explore")).toBe("explore");
    expect(parseConceptLearningPhaseId("understand")).toBe("understand");
    expect(parseConceptLearningPhaseId("check")).toBe("check");
    expect(parseConceptLearningPhaseId("review")).toBeNull();
    expect(parseConceptLearningPhaseId("")).toBeNull();
    expect(parseConceptLearningPhaseId(null)).toBeNull();
  });

  it("resolves initial phase precedence as hash, then query, then first visible, then explore", () => {
    const phases = [
      { id: "explore" as const, hasVisibleSections: false },
      { id: "understand" as const, hasVisibleSections: true },
      { id: "check" as const, hasVisibleSections: true },
    ];

    expect(
      resolveInitialConceptLearningPhaseId({
        phases,
        hashPhaseId: "check",
        queryPhaseId: "explore",
      }),
    ).toBe("check");
    expect(
      resolveInitialConceptLearningPhaseId({
        phases,
        hashPhaseId: null,
        queryPhaseId: "explore",
      }),
    ).toBe("explore");
    expect(
      resolveInitialConceptLearningPhaseId({
        phases,
        hashPhaseId: null,
        queryPhaseId: null,
      }),
    ).toBe("understand");
    expect(
      resolveInitialConceptLearningPhaseId({
        phases: phases.map((phase) => ({
          ...phase,
          hasVisibleSections: false,
        })),
        hashPhaseId: null,
        queryPhaseId: null,
      }),
    ).toBe("explore");
  });
});
