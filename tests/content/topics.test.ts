import { describe, expect, it } from "vitest";
import {
  getTopicDiscoverySummaries,
  getTopicDiscoverySummaryBySlug,
  getTopicPath,
  getTopicSlug,
  getTopicTitle,
} from "@/lib/content";

describe("topic discovery helpers", () => {
  it("derives topic summaries from the canonical catalog order", () => {
    const topics = getTopicDiscoverySummaries();

    expect(topics.map((topic) => topic.slug)).toEqual([
      "mechanics",
      "gravity-and-orbits",
      "oscillations",
      "waves",
      "sound",
      "fluids",
      "thermodynamics",
      "electricity",
      "circuits",
      "magnetism",
      "electromagnetism",
      "optics",
      "mirrors-and-lenses",
      "modern-physics",
      "functions",
      "calculus",
      "vectors",
      "complex-numbers-and-parametric-motion",
      "rates-and-equilibrium",
      "stoichiometry-and-yield",
      "solutions-and-ph",
      "algorithms-and-search",
    ]);

    expect(getTopicDiscoverySummaryBySlug("mechanics")).toMatchObject({
      title: "Mechanics",
      conceptCount: 11,
      subject: "Physics",
    });
    expect(getTopicDiscoverySummaryBySlug("gravity-and-orbits")).toMatchObject({
      title: "Gravity and Orbits",
      conceptCount: 5,
    });
    expect(getTopicDiscoverySummaryBySlug("oscillations")).toMatchObject({
      title: "Oscillations",
      conceptCount: 3,
    });
    expect(getTopicDiscoverySummaryBySlug("waves")).toMatchObject({
      title: "Waves",
      conceptCount: 4,
    });
    expect(getTopicDiscoverySummaryBySlug("sound")).toMatchObject({
      title: "Sound",
      conceptCount: 4,
    });
    expect(getTopicDiscoverySummaryBySlug("electricity")).toMatchObject({
      title: "Electricity",
      conceptCount: 3,
    });
    expect(getTopicDiscoverySummaryBySlug("circuits")).toMatchObject({
      title: "Circuits",
      conceptCount: 7,
    });
    expect(getTopicDiscoverySummaryBySlug("magnetism")).toMatchObject({
      title: "Magnetism",
      conceptCount: 2,
    });
    expect(getTopicDiscoverySummaryBySlug("electromagnetism")).toMatchObject({
      title: "Electromagnetism",
      conceptCount: 3,
    });
    expect(getTopicDiscoverySummaryBySlug("optics")).toMatchObject({
      title: "Optics",
      conceptCount: 7,
    });
    expect(getTopicDiscoverySummaryBySlug("mirrors-and-lenses")).toMatchObject({
      title: "Mirrors and Lenses",
      conceptCount: 3,
    });
  });

  it("resolves taxonomy ownership, starter-track alignment, and legacy aliases through the canonical registry", () => {
    expect(getTopicSlug("Simple Topic")).toBe("simple-topic");
    expect(getTopicPath("Simple Topic")).toBe("/concepts/topics/simple-topic");
    expect(getTopicSlug("Resonance")).toBe("oscillations");
    expect(getTopicPath("Resonance")).toBe("/concepts/topics/oscillations");
    expect(getTopicTitle("Resonance")).toBe("Oscillations");
    expect(getTopicSlug("oscillations-and-waves")).toBe("waves");

    expect(
      getTopicDiscoverySummaryBySlug("mechanics").starterTracks.map((track) => track.slug),
    ).toEqual(["motion-and-circular-motion", "rotational-mechanics"]);
    expect(
      getTopicDiscoverySummaryBySlug("gravity-and-orbits").starterTracks.map(
        (track) => track.slug,
      ),
    ).toEqual(["gravity-and-orbits"]);
    expect(
      getTopicDiscoverySummaryBySlug("oscillations").starterTracks.map((track) => track.slug),
    ).toEqual(["oscillations-and-energy"]);
    expect(
      getTopicDiscoverySummaryBySlug("waves").starterTracks.map((track) => track.slug),
    ).toEqual(["waves"]);
    expect(
      getTopicDiscoverySummaryBySlug("sound").starterTracks.map((track) => track.slug),
    ).toEqual(["sound-and-acoustics", "waves"]);
    expect(
      getTopicDiscoverySummaryBySlug("circuits").starterTracks.map((track) => track.slug),
    ).toEqual(["electricity"]);
    expect(
      getTopicDiscoverySummaryBySlug("magnetism").starterTracks.map((track) => track.slug),
    ).toEqual(["magnetic-fields"]);
    expect(
      getTopicDiscoverySummaryBySlug("electromagnetism").recommendedStarterTracks.map(
        (track) => track.slug,
      ),
    ).toEqual(["magnetic-fields"]);
    expect(
      getTopicDiscoverySummaryBySlug("mirrors-and-lenses").starterTracks.map(
        (track) => track.slug,
      ),
    ).toEqual([]);

    expect(
      getTopicDiscoverySummaryBySlug("electricity").featuredConcepts.map(
        (concept) => concept.slug,
      ),
    ).toEqual([
      "electric-fields",
      "electric-potential",
      "capacitance-and-stored-electric-energy",
    ]);
    expect(
      getTopicDiscoverySummaryBySlug("circuits").featuredConcepts.map((concept) => concept.slug),
    ).toEqual(["basic-circuits", "series-parallel-circuits"]);
    expect(
      getTopicDiscoverySummaryBySlug("magnetism").relatedTopics.map((topic) => topic.slug),
    ).toEqual(["circuits", "electromagnetism"]);
    expect(
      getTopicDiscoverySummaryBySlug("optics").relatedTopics.map((topic) => topic.slug),
    ).toEqual(["electromagnetism", "waves", "mirrors-and-lenses"]);
    expect(
      getTopicDiscoverySummaryBySlug("modern-physics").relatedTopics.map(
        (topic) => topic.slug,
      ),
    ).toEqual(["optics", "electromagnetism", "waves"]);
  });
});
