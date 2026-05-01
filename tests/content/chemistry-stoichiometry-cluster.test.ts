import { describe, expect, it } from "vitest";
import {
  getConceptBySlug,
  getReadNextRecommendations,
  getStarterTrackBySlug,
  getStarterTrackMembershipsForConcept,
  getTopicDiscoverySummaryBySlug,
} from "@/lib/content";

describe("chemistry stoichiometry cluster wiring", () => {
  it("threads the stoichiometry concepts through the new chemistry topic and starter track", () => {
    const ratios = getConceptBySlug("stoichiometric-ratios-and-recipe-batches");
    const limiting = getConceptBySlug("limiting-reagent-and-leftover-reactants");
    const yieldConcept = getConceptBySlug("percent-yield-and-reaction-extent");
    const topic = getTopicDiscoverySummaryBySlug("stoichiometry-and-yield");
    const track = getStarterTrackBySlug("stoichiometry-and-yield");

    expect(ratios.topic).toBe("Stoichiometry and Yield");
    expect(limiting.prerequisites).toEqual(["stoichiometric-ratios-and-recipe-batches"]);
    expect(yieldConcept.prerequisites).toEqual(["limiting-reagent-and-leftover-reactants"]);
    expect(ratios.simulation.kind).toBe("stoichiometry-recipe");
    expect(limiting.simulation.kind).toBe("stoichiometry-recipe");
    expect(yieldConcept.simulation.kind).toBe("stoichiometry-recipe");
    expect(topic.featuredConcepts.map((concept) => concept.slug)).toEqual([
      "stoichiometric-ratios-and-recipe-batches",
      "limiting-reagent-and-leftover-reactants",
      "percent-yield-and-reaction-extent",
    ]);
    expect(track.concepts.map((concept) => concept.slug)).toEqual([
      "stoichiometric-ratios-and-recipe-batches",
      "limiting-reagent-and-leftover-reactants",
      "percent-yield-and-reaction-extent",
    ]);
    expect(track.checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
      "stoich-limiting-checkpoint",
      "stoich-yield-checkpoint",
    ]);
  });

  it("keeps the authored stoichiometry surfaces challenge-ready on the shared recipe bench", () => {
    const ratios = getConceptBySlug("stoichiometric-ratios-and-recipe-batches");
    const limiting = getConceptBySlug("limiting-reagent-and-leftover-reactants");
    const yieldConcept = getConceptBySlug("percent-yield-and-reaction-extent");

    expect(ratios.pageFramework?.featuredSetups?.map((setup) => setup.id)).toEqual([
      "matched-two-three-recipe",
      "three-to-two-recipe",
    ]);
    expect(limiting.pageFramework?.featuredSetups?.map((setup) => setup.id)).toEqual([
      "a-limiting-window",
      "b-limiting-window",
    ]);
    expect(yieldConcept.pageFramework?.featuredSetups?.map((setup) => setup.id)).toEqual([
      "partial-yield-window",
      "full-yield-window",
    ]);
    expect(limiting.challengeMode?.items[0]).toMatchObject({
      id: "lr-ch-make-b-the-limiting-reagent",
      setup: {
        graphId: "batches-vs-reactant-b",
      },
    });
    const yieldChallenge = yieldConcept.challengeMode?.items[0];
    expect(yieldChallenge).toMatchObject({
      id: "pyre-ch-hit-seventy-five-percent-yield",
      setup: {
        presetId: "matched-two-three",
        graphId: "yield-vs-percent",
      },
    });
    expect(yieldChallenge?.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "param-range", param: "reactantAAmount", min: 10, max: 10 }),
        expect.objectContaining({ type: "param-range", param: "reactantBAmount", min: 15, max: 15 }),
        expect.objectContaining({ type: "param-range", param: "percentYield", min: 75, max: 75 }),
      ]),
    );
    expect(yieldConcept.noticePrompts?.items.map((item) => item.id)).toEqual([
      "pyre-notice-theoretical-stays-fixed",
      "pyre-notice-gap-grows",
    ]);
  });

  it("keeps read-next and track membership moving through the stoichiometry branch before widening to solutions", () => {
    expect(getReadNextRecommendations("stoichiometric-ratios-and-recipe-batches")[0]).toMatchObject(
      {
        slug: "limiting-reagent-and-leftover-reactants",
        reasonKind: "curated",
      },
    );
    expect(getReadNextRecommendations("limiting-reagent-and-leftover-reactants")[0]).toMatchObject({
      slug: "percent-yield-and-reaction-extent",
      reasonKind: "curated",
    });
    expect(getReadNextRecommendations("percent-yield-and-reaction-extent")[0]).toMatchObject({
      slug: "concentration-and-dilution",
      reasonKind: "curated",
    });
    expect(
      getStarterTrackMembershipsForConcept("percent-yield-and-reaction-extent").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["stoichiometry-and-yield"]);
  });
});
