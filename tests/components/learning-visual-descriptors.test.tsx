import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SubjectDiscoveryCard } from "@/components/concepts/SubjectDiscoveryCard";
import { ConceptTile } from "@/components/concepts/ConceptTile";
import { ToolDirectoryCard } from "@/components/tools/ToolDirectoryCard";
import { LearningVisual } from "@/components/visuals/LearningVisual";
import {
  getChallengeVisualDescriptor,
  getConceptAssessmentVisualDescriptor,
  getConceptVisualDescriptor,
  getPackAssessmentVisualDescriptor,
  getTopicAssessmentVisualDescriptor,
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
      getConceptVisualDescriptor(getConceptSummary("conservation-of-momentum")),
      getConceptVisualDescriptor(getConceptSummary("collisions")),
      getConceptVisualDescriptor(getConceptSummary("rotational-inertia")),
      getConceptVisualDescriptor(getConceptSummary("circular-orbits-orbital-speed")),
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
    expect(descriptors[6]?.motif).toBe("momentum-carts");
    expect(descriptors[7]?.motif).toBe("collisions");
    expect(descriptors[8]?.motif).toBe("rotational-inertia");
    expect(descriptors[9]?.motif).toBe("orbital-speed");
    expect(new Set(descriptors.map((descriptor) => descriptor.motif)).size).toBe(
      descriptors.length,
    );
    expect(descriptors.every((descriptor) => descriptor.fallbackKind === "topic-specific")).toBe(true);
  });

  it("keeps high-repeat physics families visually distinct enough for card scanning", () => {
    expect(
      [
        "circular-orbits-orbital-speed",
        "gravitational-fields",
        "gravitational-potential-energy",
        "keplers-third-law-orbital-periods",
        "escape-velocity",
      ].map((slug) => getConceptVisualDescriptor(getConceptSummary(slug)).motif),
    ).toEqual([
      "orbital-speed",
      "gravitational-field",
      "gravitational-potential",
      "kepler-period",
      "escape-velocity",
    ]);

    expect(
      [
        "simple-harmonic-motion",
        "oscillation-energy",
        "damping-resonance",
      ].map((slug) => getConceptVisualDescriptor(getConceptSummary(slug)).motif),
    ).toEqual([
      "simple-harmonic-motion",
      "oscillation-energy",
      "damping-resonance",
    ]);

    expect(
      [
        "pressure-and-hydrostatic-pressure",
        "continuity-equation",
        "bernoullis-principle",
        "buoyancy-and-archimedes-principle",
        "drag-and-terminal-velocity",
      ].map((slug) => getConceptVisualDescriptor(getConceptSummary(slug)).motif),
    ).toEqual([
      "fluid-pressure",
      "fluid-continuity",
      "fluid-bernoulli",
      "fluid-buoyancy",
      "fluid-drag",
    ]);
  });

  it("maps challenge and assessment cards to meaningful overlays", () => {
    const circularChallenge = getChallengeVisualDescriptor({
      id: "ucm-ch-short-period-force-band",
      title: "Short-period force band",
      prompt: "Shorten the period to about $2.2\\,\\mathrm{s}$.",
      concept: getConceptSummary("uniform-circular-motion"),
      targetMetrics: ["period", "centripetalAcceleration"],
    });
    const oscillatorAssessment = getConceptAssessmentVisualDescriptor(
      getConceptSummary("simple-harmonic-motion"),
    );
    const topicAssessment = getTopicAssessmentVisualDescriptor({
      slug: "oscillations",
      title: "Oscillations",
      subject: "Physics",
      description: "Oscillators and resonance.",
    });
    const packAssessment = getPackAssessmentVisualDescriptor({
      slug: "physics-connected-models",
      title: "Physics Connections Pack",
      subject: "Physics",
      summary: "Connect motion, oscillation, waves, and orbit reasoning.",
      includedTopicSlugs: ["mechanics", "oscillations", "waves", "gravity-and-orbits"],
      includedTopicTitles: ["Mechanics", "Oscillations", "Waves", "Gravity and Orbits"],
    });
    const beatChallenge = getChallengeVisualDescriptor({
      title: "Tune slow pulses",
      prompt: "Make the beat pulses slow enough to count.",
      concept: getConceptSummary("beats"),
      cueLabels: ["slow pulses"],
    });
    const dopplerChallenge = getChallengeVisualDescriptor({
      title: "Lower behind, higher ahead",
      prompt: "Move the source so the observed pitch is lower behind and higher ahead.",
      concept: getConceptSummary("doppler-effect"),
      cueLabels: ["higher ahead"],
    });

    expect(circularChallenge).toMatchObject({
      kind: "challenge",
      motif: "uniform-circular-motion",
      overlay: "challenge",
      isFallback: false,
    });
    expect(oscillatorAssessment).toMatchObject({
      kind: "test",
      motif: "simple-harmonic-motion",
      overlay: "assessment",
      isFallback: false,
    });
    expect(topicAssessment).toMatchObject({
      kind: "test",
      motif: "simple-harmonic-motion",
      overlay: "assessment",
      isFallback: false,
    });
    expect(packAssessment).toMatchObject({
      kind: "test",
      motif: "projectile-motion",
      overlay: "assessment",
      isFallback: false,
    });
    expect(beatChallenge).toMatchObject({
      kind: "challenge",
      motif: "sound-beats",
      overlay: "challenge",
      isFallback: false,
    });
    expect(dopplerChallenge).toMatchObject({
      kind: "challenge",
      motif: "sound-doppler",
      overlay: "challenge",
      isFallback: false,
    });
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
          overlay="assessment"
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
    expect(screen.getByTestId("learning-visual")).toHaveAttribute(
      "data-visual-overlay",
      "assessment",
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
