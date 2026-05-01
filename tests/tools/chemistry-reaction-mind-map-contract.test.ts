import { describe, expect, it } from "vitest";
import {
  getChemistryAdjacentPathways,
  getChemistryDirectConversionsBetween,
  getChemistryReactionMindMapContent,
  getChemistryRoutesBetween,
  chemistryReactionEdges,
  chemistryReactionNodes,
} from "@/lib/tools/chemistry-reaction-mind-map";

function reagentLabel(reagent: unknown) {
  if (typeof reagent === "string") {
    return reagent;
  }

  if (reagent && typeof reagent === "object" && "name" in reagent) {
    return String((reagent as { name?: unknown }).name ?? "");
  }

  return "";
}

describe("chemistry reaction mind map data contract", () => {
  it("keeps unique node ids and required family-level fields", () => {
    const ids = chemistryReactionNodes.map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const node of chemistryReactionNodes) {
      expect(node.name.trim().length).toBeGreaterThan(0);
      expect(node.generalFormula.trim().length).toBeGreaterThan(0);
      expect(node.functionalGroup.trim().length).toBeGreaterThan(0);
      expect(node.boilingPoint.summary.trim().length).toBeGreaterThan(0);
      expect(node.solubility.summary.trim().length).toBeGreaterThan(0);
      expect(node.acidityBasicity.summary.trim().length).toBeGreaterThan(0);
      expect(node.notableProperties.length).toBeGreaterThan(0);
      expect(
        Boolean(
          ("suffix" in node.nomenclature ? node.nomenclature.suffix : undefined) ||
            ("prefix" in node.nomenclature ? node.nomenclature.prefix : undefined),
        ),
      ).toBe(true);

      for (const property of [
        node.boilingPoint,
        node.solubility,
        node.acidityBasicity,
      ]) {
        if ("representativeExample" in property && property.representativeExample) {
          expect(property.representativeExample.kind).toBe("representative-example");
          expect(property.representativeExample.text.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("keeps unique edge ids with no orphan node references", () => {
    const edgeIds = chemistryReactionEdges.map((edge) => edge.id);
    const nodeIds = new Set(chemistryReactionNodes.map((node) => node.id));

    expect(new Set(edgeIds).size).toBe(edgeIds.length);

    for (const edge of chemistryReactionEdges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
      expect(edge.label.trim().length).toBeGreaterThan(0);
      expect(edge.reactionType.trim().length).toBeGreaterThan(0);
      expect(edge.reagents.length).toBeGreaterThan(0);
      expect(edge.conditions.length).toBeGreaterThan(0);
      expect(edge.applicability.summary.trim().length).toBeGreaterThan(0);
    }
  });

  it("marks representative examples explicitly in the equation contract", () => {
    for (const edge of chemistryReactionEdges) {
      if ("representativeExample" in edge.equation) {
        expect(edge.equation.representativeExample.kind).toBe("representative-example");
        expect(edge.equation.representativeExample.text.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("requires subgroup-specific applicability on subgroup-only reaction edges", () => {
    const subgroupEdges = chemistryReactionEdges.filter((edge) =>
      [
        "alcohol-to-aldehyde-oxidation",
        "alcohol-to-ketone-oxidation",
      ].includes(edge.id),
    );

    expect(subgroupEdges.length).toBeGreaterThan(0);
    for (const edge of subgroupEdges) {
      expect(edge.applicability.kind).toBe("subgroup-specific");
      expect(edge.applicability.summary.trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps broadly applicable family routes marked as general when the pathway is not limited to one subgroup", () => {
    const generalEdges = chemistryReactionEdges.filter((edge) =>
      [
        "haloalkane-to-alcohol-hydrolysis",
        "alcohol-to-haloalkane-substitution",
        "aldehyde-to-alcohol-reduction",
        "ketone-to-alcohol-reduction",
      ].includes(edge.id),
    );

    expect(generalEdges.length).toBe(4);
    for (const edge of generalEdges) {
      expect(edge.applicability.kind).toBe("general");
      expect(edge.applicability.summary.trim().length).toBeGreaterThan(0);
    }
  });

  it("uses representative-only equations for edges where one generic family equation would be misleading", () => {
    const representativeOnlyEdges = chemistryReactionEdges.filter((edge) =>
      [
        "alkene-to-alcohol-hydration",
        "alkene-to-haloalkane-hydrohalogenation",
        "alcohol-to-haloalkane-substitution",
      ].includes(edge.id),
    );

    expect(representativeOnlyEdges.length).toBe(3);
    for (const edge of representativeOnlyEdges) {
      expect(edge.equation.mode).toBe("representative-only");
      expect("representativeExample" in edge.equation).toBe(true);
    }
  });

  it("requires explicit additional co-reactant metadata for multi-reactant family routes", () => {
    const edge = chemistryReactionEdges.find(
      (item) => item.id === "carboxylic-acid-to-ester-esterification",
    );

    expect(edge).toBeDefined();
    expect(edge?.additionalOrganicReactants?.length).toBeGreaterThan(0);
    expect(edge?.additionalOrganicReactants?.[0]).toMatch(/alcohol/i);
  });

  it("keeps intro-organic reduction routes on the current borohydride shorthand convention", () => {
    const aldehydeReduction = chemistryReactionEdges.find(
      (edge) => edge.id === "aldehyde-to-alcohol-reduction",
    );
    const ketoneReduction = chemistryReactionEdges.find(
      (edge) => edge.id === "ketone-to-alcohol-reduction",
    );

    expect(aldehydeReduction?.applicability.kind).toBe("general");
    expect(ketoneReduction?.applicability.kind).toBe("general");
    expect(reagentLabel(aldehydeReduction?.reagents[0])).toMatch(/borohydride/i);
    expect(reagentLabel(ketoneReduction?.reagents[0])).toMatch(/borohydride/i);
    expect("generic" in (aldehydeReduction?.equation ?? {})).toBe(true);
    expect("generic" in (ketoneReduction?.equation ?? {})).toBe(true);
    if (aldehydeReduction && "generic" in aldehydeReduction.equation) {
      expect(aldehydeReduction.equation.generic).toContain("2[H]");
    }
    if (ketoneReduction && "generic" in ketoneReduction.equation) {
      expect(ketoneReduction.equation.generic).toContain("2[H]");
    }
  });

  it("keeps ionic-equation and mechanism applicability explicit for every edge", () => {
    for (const edge of chemistryReactionEdges) {
      if (edge.ionicEquation.applicability === "shown") {
        expect(edge.ionicEquation.equation.trim().length).toBeGreaterThan(0);
      } else {
        expect(("note" in edge.ionicEquation ? edge.ionicEquation.note : "").trim().length).toBeGreaterThan(0);
      }

      if (edge.mechanism.applicability === "shown") {
        expect(edge.mechanism.summary.trim().length).toBeGreaterThan(0);
      } else {
        const note =
          "note" in edge.mechanism && typeof edge.mechanism.note === "string"
            ? edge.mechanism.note
            : "";
        expect(note.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("derives incoming and outgoing adjacency from the structured edge data", () => {
    const adjacency = getChemistryAdjacentPathways("alcohol");

    expect(adjacency.incoming.some((item) => item.edge.id === "alkene-to-alcohol-hydration")).toBe(
      true,
    );
    expect(
      adjacency.outgoing.some((item) => item.edge.id === "alcohol-to-aldehyde-oxidation"),
    ).toBe(true);
  });

  it("derives direct conversions between a related node pair in either direction", () => {
    const conversions = getChemistryDirectConversionsBetween("carboxylic-acid", "ester");

    expect(conversions.map((item) => item.edge.id)).toEqual(
      expect.arrayContaining([
        "carboxylic-acid-to-ester-esterification",
        "ester-to-carboxylic-acid-hydrolysis",
      ]),
    );
  });

  it("returns bounded directed routes with shortest routes first and no cycles", () => {
    const direct = chemistryReactionEdges.find((edge) => edge.id === "alkene-to-alcohol-hydration");
    const viaHalo = chemistryReactionEdges.find(
      (edge) => edge.id === "alkene-to-haloalkane-hydrohalogenation",
    );
    const hydrolysis = chemistryReactionEdges.find(
      (edge) => edge.id === "haloalkane-to-alcohol-hydrolysis",
    );
    const cycleBack = chemistryReactionEdges.find(
      (edge) => edge.id === "alcohol-to-haloalkane-substitution",
    );

    expect(direct && viaHalo && hydrolysis && cycleBack).toBeTruthy();

    const routes = getChemistryRoutesBetween("alkene", "alcohol", {
      edges: [viaHalo!, hydrolysis!, direct!, cycleBack!],
      maxEdges: 3,
      maxRoutes: 5,
    });

    expect(routes.map((route) => route.edgeIds)).toEqual([
      [direct!.id],
      [viaHalo!.id, hydrolysis!.id],
    ]);
    expect(routes.every((route) => new Set(route.nodeIds).size === route.nodeIds.length)).toBe(true);
  });

  it("derives route-level flags for subgroup-specific, co-reactant, and representative-only steps", () => {
    const routes = getChemistryRoutesBetween("alcohol", "ester");
    const route = routes.find(
      (item) =>
        item.edgeIds.join(">>") ===
        [
          "alcohol-to-aldehyde-oxidation",
          "aldehyde-to-carboxylic-acid-oxidation",
          "carboxylic-acid-to-ester-esterification",
        ].join(">>"),
    );

    expect(route).toBeDefined();
    expect(route?.includesSubgroupSpecificStep).toBe(true);
    expect(route?.includesAdditionalOrganicReactant).toBe(true);
    expect(route?.includesRepresentativeOnlyStep).toBe(false);
  });

  it("flags representative-only steps on routes that include them", () => {
    const routes = getChemistryRoutesBetween("alkene", "carboxylic-acid");
    const route = routes[0];

    expect(route).toBeDefined();
    expect(route.includesRepresentativeOnlyStep).toBe(true);
    expect(route.includesSubgroupSpecificStep).toBe(true);
  });

  it("returns no routes when start and target are the same family", () => {
    expect(getChemistryRoutesBetween("alcohol", "alcohol")).toEqual([]);
  });

  it("keeps zh-HK localized chemistry content for every current node and edge", () => {
    const english = getChemistryReactionMindMapContent("en");
    const localized = getChemistryReactionMindMapContent("zh-HK");

    expect(localized.nodes).toHaveLength(english.nodes.length);
    expect(localized.edges).toHaveLength(english.edges.length);

    for (const englishNode of english.nodes) {
      const localizedNode = localized.nodes.find((node) => node.id === englishNode.id);
      expect(localizedNode).toBeDefined();
      expect(localizedNode?.name.trim().length).toBeGreaterThan(0);
      expect(localizedNode?.boilingPoint.summary.trim().length).toBeGreaterThan(0);
      expect(localizedNode?.solubility.summary.trim().length).toBeGreaterThan(0);
      expect(localizedNode?.acidityBasicity.summary.trim().length).toBeGreaterThan(0);
      expect(localizedNode?.notableProperties.length).toBeGreaterThan(0);
      expect(localizedNode?.name).not.toBe(englishNode.name);
      expect(localizedNode?.boilingPoint.summary).not.toBe(englishNode.boilingPoint.summary);
    }

    for (const englishEdge of english.edges) {
      const localizedEdge = localized.edges.find((edge) => edge.id === englishEdge.id);
      expect(localizedEdge).toBeDefined();
      expect(localizedEdge?.label.trim().length).toBeGreaterThan(0);
      expect(localizedEdge?.reactionType.trim().length).toBeGreaterThan(0);
      expect(localizedEdge?.applicability.summary.trim().length).toBeGreaterThan(0);
      expect(localizedEdge?.reagents.length).toBeGreaterThan(0);
      expect(localizedEdge?.conditions.length).toBeGreaterThan(0);
      expect(localizedEdge?.label).not.toBe(englishEdge.label);
      expect(localizedEdge?.applicability.summary).not.toBe(englishEdge.applicability.summary);
    }
  });

  it("keeps canonical chemistry notation strings stable across locales", () => {
    const english = getChemistryReactionMindMapContent("en");
    const localized = getChemistryReactionMindMapContent("zh-HK");

    for (const englishNode of english.nodes) {
      const localizedNode = localized.nodes.find((node) => node.id === englishNode.id);
      expect(localizedNode?.generalFormula).toBe(englishNode.generalFormula);
      expect(localizedNode?.functionalGroupVisual).toBe(englishNode.functionalGroupVisual);
    }

    for (const englishEdge of english.edges) {
      const localizedEdge = localized.edges.find((edge) => edge.id === englishEdge.id);
      expect(localizedEdge?.equation).toEqual(englishEdge.equation);
    }
  });
});
