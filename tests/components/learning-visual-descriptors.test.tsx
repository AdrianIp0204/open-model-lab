import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SubjectDiscoveryCard } from "@/components/concepts/SubjectDiscoveryCard";
import { ConceptTile } from "@/components/concepts/ConceptTile";
import { ToolDirectoryCard } from "@/components/tools/ToolDirectoryCard";
import { LearningVisual } from "@/components/visuals/LearningVisual";
import {
  getConceptVisualDescriptor,
  getTopicVisualDescriptor,
  getToolVisualDescriptor,
} from "@/components/visuals/learningVisualDescriptors";
import { getConceptSummaries, getSubjectDiscoverySummaries } from "@/lib/content";
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
    expect(descriptors.every((descriptor) => descriptor.fallbackKind === "topic-specific")).toBe(true);
  });

  it("maps visible math discovery concepts away from the generic fallback", () => {
    const descriptors = [
      getConceptVisualDescriptor(getConceptSummary("derivative-as-slope-local-rate-of-change")),
      getConceptVisualDescriptor(getConceptSummary("limits-and-continuity-approaching-a-value")),
      getConceptVisualDescriptor(getConceptSummary("optimization-maxima-minima-and-constraints")),
      getConceptVisualDescriptor(getConceptSummary("complex-numbers-on-the-plane")),
      getConceptVisualDescriptor(getConceptSummary("polar-coordinates-radius-and-angle")),
      getConceptVisualDescriptor(getConceptSummary("trig-identities-from-unit-circle-geometry")),
      getConceptVisualDescriptor(getConceptSummary("inverse-trig-angle-from-ratio")),
    ];

    expect(descriptors.map((descriptor) => descriptor.motif)).toEqual([
      "calculus-slope",
      "limit-approach",
      "optimization",
      "complex-plane",
      "polar-coordinates",
      "unit-circle",
      "unit-circle",
    ]);
    expect(descriptors.every((descriptor) => descriptor.isFallback === false)).toBe(true);
    expect(descriptors.every((descriptor) => descriptor.fallbackKind === "topic-specific")).toBe(true);
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
      fallbackKind: "topic-specific",
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
      fallbackKind: "topic-specific",
    });
  });

  it("keeps localized topic cards on deterministic topic-specific descriptors", () => {
    expect(
      getTopicVisualDescriptor({
        slug: "mechanics",
        title: "力學",
        subject: "物理",
        description: "以模擬讀懂運動。",
        accent: "teal",
      }),
    ).toMatchObject({
      motif: "projectile-motion",
      fallbackKind: "topic-specific",
      isFallback: false,
    });

    expect(
      getTopicVisualDescriptor({
        slug: "rates-and-equilibrium",
        title: "速率與平衡",
        subject: "化學",
        description: "觀察反應如何前進。",
        accent: "amber",
      }),
    ).toMatchObject({
      motif: "chemistry-reaction",
      fallbackKind: "topic-specific",
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
    expect(screen.getByTestId("learning-visual")).toHaveAttribute(
      "data-visual-fallback-kind",
      "topic-specific",
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
    expect(screen.getByTestId("learning-visual")).toHaveAttribute(
      "data-visual-fallback-kind",
      "topic-specific",
    );
    expect(screen.getByTestId("learning-visual").closest("a")).toHaveAttribute(
      "href",
      "/concepts/uniform-circular-motion",
    );
  });

  it("keeps tool card visuals inside the navigable card region", () => {
    render(
      <ToolDirectoryCard
        title="Circuit Builder"
        description="Build and inspect a circuit."
        href="/circuit-builder"
        ctaLabel="Open circuit builder"
        badge="Tool"
        accent="teal"
        visualKind="circuit"
      />,
    );

    expect(screen.getByTestId("learning-visual")).toHaveAttribute(
      "data-visual-motif",
      "circuit",
    );
    expect(screen.getByTestId("learning-visual").closest("a")).toHaveAttribute(
      "href",
      "/circuit-builder",
    );
  });

  it("keeps subject card visuals inside the primary subject link region", () => {
    const subject = getSubjectDiscoverySummaries()[0];

    if (!subject) {
      throw new Error("Expected at least one subject summary");
    }

    render(<SubjectDiscoveryCard subject={subject} variant="compact" />);

    expect(screen.getByTestId("learning-visual").closest("a")).toHaveAttribute(
      "href",
      subject.path,
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
    expect(screen.getByTestId("learning-visual")).toHaveAttribute(
      "data-visual-fallback-kind",
      "topic-specific",
    );
  });

  it("classifies category and generic visual fallbacks for audit reporting", () => {
    render(<LearningVisual kind="progress" tone="teal" compact />);

    expect(screen.getByTestId("learning-visual")).toHaveAttribute(
      "data-visual-fallback-kind",
      "category-specific",
    );

    render(<LearningVisual kind="concept" isFallback tone="teal" compact />);

    const visuals = screen.getAllByTestId("learning-visual");

    expect(visuals[visuals.length - 1]).toHaveAttribute(
      "data-visual-fallback-kind",
      "generic",
    );
  });
});
