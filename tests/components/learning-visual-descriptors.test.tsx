import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConceptTile } from "@/components/concepts/ConceptTile";
import { LearningVisual } from "@/components/visuals/LearningVisual";
import {
  getConceptVisualDescriptor,
  getToolVisualDescriptor,
} from "@/components/visuals/learningVisualDescriptors";
import { getConceptSummaries } from "@/lib/content";
import { localizeConceptSummaryDisplay } from "@/lib/i18n/content";

function getConceptSummary(slug: string) {
  const concept = getConceptSummaries().find((item) => item.slug === slug);

  if (!concept) {
    throw new Error(`Missing test concept: ${slug}`);
  }

  return concept;
}

describe("learning visual descriptors", () => {
  it("maps representative concept slugs to distinct topic-specific motifs", () => {
    const descriptors = [
      getConceptVisualDescriptor(getConceptSummary("uniform-circular-motion")),
      getConceptVisualDescriptor(getConceptSummary("simple-harmonic-motion")),
      getConceptVisualDescriptor(getConceptSummary("vectors-components")),
      getConceptVisualDescriptor(getConceptSummary("torque")),
      getConceptVisualDescriptor(getConceptSummary("graph-transformations")),
      getConceptVisualDescriptor(getConceptSummary("binary-search-halving-the-search-space")),
    ];

    expect(descriptors[0]).toMatchObject({
      motif: "uniform-circular-motion",
      isFallback: false,
    });
    expect(descriptors[1]?.motif).toBe("simple-harmonic-motion");
    expect(descriptors[2]?.motif).toBe("vectors-components");
    expect(descriptors[3]?.motif).toBe("torque");
    expect(descriptors[4]?.motif).toBe("graph-transformations");
    expect(descriptors[5]?.motif).toBe("binary-search");
    expect(new Set(descriptors.map((descriptor) => descriptor.motif)).size).toBe(
      descriptors.length,
    );
  });

  it("maps tool entries to tool-specific visual motifs", () => {
    expect(
      getToolVisualDescriptor({
        title: "Circuit Builder",
        href: "/circuit-builder",
        visualKind: "circuit",
      }),
    ).toMatchObject({
      motif: "circuit",
      isFallback: false,
    });

    expect(
      getToolVisualDescriptor({
        title: "Chemistry Reaction Mind Map",
        href: "/tools/chemistry-reaction-mind-map",
        visualKind: "chemistry",
      }),
    ).toMatchObject({
      motif: "chemistry-reaction",
      isFallback: false,
    });
  });

  it("renders concept cards with the descriptor motif in English and zh-HK", () => {
    const concept = getConceptSummary("uniform-circular-motion");

    const { rerender } = render(<ConceptTile concept={concept} />);

    expect(screen.getByTestId("learning-visual")).toHaveAttribute(
      "data-visual-motif",
      "uniform-circular-motion",
    );
    expect(screen.getByTestId("learning-visual")).toHaveAttribute(
      "data-visual-fallback",
      "false",
    );

    globalThis.__TEST_LOCALE__ = "zh-HK";
    rerender(<ConceptTile concept={localizeConceptSummaryDisplay(concept, "zh-HK")} />);

    expect(screen.getByTestId("learning-visual")).toHaveAttribute(
      "data-visual-motif",
      "uniform-circular-motion",
    );
    expect(screen.getByTestId("learning-visual")).toHaveAttribute(
      "data-visual-fallback",
      "false",
    );
  });

  it("renders motif metadata on the visual primitive for browser checks", () => {
    render(
      <LearningVisual
        kind="concept"
        motif="graph-transformations"
        isFallback={false}
        tone="sky"
      />,
    );

    expect(screen.getByTestId("learning-visual")).toHaveAttribute(
      "data-visual-motif",
      "graph-transformations",
    );
  });
});
