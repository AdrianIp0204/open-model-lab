import { describe, expect, it } from "vitest";
import {
  getChallengeCueLabels,
  getChallengeDepth,
  getChallengeDiscoveryIndex,
  getConceptBySlug,
} from "@/lib/content";

describe("magnetism challenge expansion", () => {
  it("adds compact authored challenge coverage across the magnetism concepts", () => {
    const magneticFields = getConceptBySlug("magnetic-fields").challengeMode?.items ?? [];
    const induction = getConceptBySlug("electromagnetic-induction").challengeMode?.items ?? [];
    const magneticForce =
      getConceptBySlug("magnetic-force-moving-charges-currents").challengeMode?.items ?? [];

    expect(magneticFields.map((item) => item.id)).toEqual(
      expect.arrayContaining(["mf-ch-build-upward-bridge", "mf-ch-compare-lift-and-cancel"]),
    );
    expect(induction.map((item) => item.id)).toEqual(
      expect.arrayContaining(["emi-ch-high-flux-zero-emf", "emi-ch-oppose-rising-flux"]),
    );
    expect(magneticForce.map((item) => item.id)).toEqual(
      expect.arrayContaining(["mfmc-ch-charge-down-wire-up", "mfmc-ch-faster-wider-arc"]),
    );

    expect(magneticFields).toHaveLength(2);
    expect(induction).toHaveLength(2);
    expect(magneticForce).toHaveLength(2);

    const compareFieldItem = magneticFields.find(
      (item) => item.id === "mf-ch-compare-lift-and-cancel",
    );
    const inspectInductionItem = induction.find((item) => item.id === "emi-ch-oppose-rising-flux");
    const compareForceItem = magneticForce.find((item) => item.id === "mfmc-ch-faster-wider-arc");

    expect(getChallengeDepth(compareFieldItem!)).toBe("stretch");
    expect(getChallengeDepth(inspectInductionItem!)).toBe("stretch");
    expect(getChallengeDepth(compareForceItem!)).toBe("stretch");

    expect(getChallengeCueLabels(compareFieldItem!)).toEqual(
      expect.arrayContaining(["Compare mode", "Graph-linked"]),
    );
    expect(getChallengeCueLabels(inspectInductionItem!)).toEqual(
      expect.arrayContaining(["Inspect time", "Graph-linked"]),
    );
    expect(getChallengeCueLabels(compareForceItem!)).toEqual(
      expect.arrayContaining(["Compare mode", "Graph-linked"]),
    );
  });

  it("surfaces the new magnetism entries in the existing challenge discovery index", () => {
    const index = getChallengeDiscoveryIndex();
    const cases = [
      {
        id: "mf-ch-compare-lift-and-cancel",
        href: "/concepts/magnetic-fields?challenge=mf-ch-compare-lift-and-cancel#challenge-mode",
        conceptSlug: "magnetic-fields",
        topicSlug: "magnetism",
        topicPath: "/concepts/topics/magnetism",
        stepIndex: 0,
        cueLabel: "Compare mode",
      },
      {
        id: "emi-ch-oppose-rising-flux",
        href: "/concepts/electromagnetic-induction?challenge=emi-ch-oppose-rising-flux#challenge-mode",
        conceptSlug: "electromagnetic-induction",
        topicSlug: "electromagnetism",
        topicPath: "/concepts/topics/electromagnetism",
        stepIndex: 1,
        cueLabel: "Inspect time",
      },
      {
        id: "mfmc-ch-faster-wider-arc",
        href: "/concepts/magnetic-force-moving-charges-currents?challenge=mfmc-ch-faster-wider-arc#challenge-mode",
        conceptSlug: "magnetic-force-moving-charges-currents",
        topicSlug: "magnetism",
        topicPath: "/concepts/topics/magnetism",
        stepIndex: 2,
        cueLabel: "Compare mode",
      },
    ] as const;

    for (const testCase of cases) {
      const entry = index.entries.find((candidate) => candidate.id === testCase.id);

      expect(entry).toMatchObject({
        href: testCase.href,
        depth: "stretch",
        concept: {
          slug: testCase.conceptSlug,
        },
        topic: {
          slug: testCase.topicSlug,
          path: testCase.topicPath,
        },
      });
      expect(entry?.starterTracks).toEqual([
        expect.objectContaining({
          slug: "magnetic-fields",
          stepIndex: testCase.stepIndex,
          totalSteps: 3,
        }),
      ]);
      expect(entry?.cueLabels).toEqual(expect.arrayContaining([testCase.cueLabel]));
    }
  });
});
