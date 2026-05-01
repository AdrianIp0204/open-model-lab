import { describe, expect, it } from "vitest";
import { getConceptBySlug, getTopicDiscoverySummaryForConceptSlug } from "@/lib/content";

const expectedMoves = [
  ["circular-orbits-orbital-speed", "Mechanics", "gravity-and-orbits"],
  ["gravitational-fields", "Mechanics", "gravity-and-orbits"],
  ["gravitational-potential-energy", "Mechanics", "gravity-and-orbits"],
  ["keplers-third-law-orbital-periods", "Mechanics", "gravity-and-orbits"],
  ["escape-velocity", "Mechanics", "gravity-and-orbits"],
  ["basic-circuits", "Electricity", "circuits"],
  ["power-energy-circuits", "Electricity", "circuits"],
  ["series-parallel-circuits", "Electricity", "circuits"],
  ["equivalent-resistance", "Electricity", "circuits"],
  ["magnetic-fields", "Electromagnetism", "magnetism"],
  ["magnetic-force-moving-charges-currents", "Electromagnetism", "magnetism"],
  ["mirrors", "Optics", "mirrors-and-lenses"],
  ["lens-imaging", "Optics", "mirrors-and-lenses"],
  ["optical-resolution-imaging-limits", "Optics", "mirrors-and-lenses"],
  ["wave-speed-wavelength", "Oscillations", "waves"],
  ["doppler-effect", "Oscillations", "waves"],
  ["wave-interference", "Oscillations", "waves"],
  ["standing-waves", "Oscillations", "waves"],
  ["beats", "Oscillations", "sound"],
  ["pitch-frequency-loudness-intensity", "Oscillations", "sound"],
  ["sound-waves-longitudinal-motion", "Oscillations", "sound"],
  ["resonance-air-columns-open-closed-pipes", "Oscillations", "sound"],
  ["damping-resonance", "Resonance", "oscillations"],
  ["uniform-circular-motion", "Oscillations", "mechanics"],
] as const;

describe("physics topic taxonomy", () => {
  it("moves the affected concepts into the new canonical topic branches", () => {
    for (const [slug, oldTopic, expectedTopicSlug] of expectedMoves) {
      const concept = getConceptBySlug(slug);
      const topic = getTopicDiscoverySummaryForConceptSlug(slug);

      expect(
        concept.topic,
        `${slug} should no longer stay under ${oldTopic}.`,
      ).not.toBe(oldTopic);
      expect(topic.slug).toBe(expectedTopicSlug);
    }
  });

  it("keeps the new capacitance concept inside the electricity branch", () => {
    const concept = getConceptBySlug("capacitance-and-stored-electric-energy");
    const topic = getTopicDiscoverySummaryForConceptSlug("capacitance-and-stored-electric-energy");

    expect(concept.topic).toBe("Electricity");
    expect(topic.slug).toBe("electricity");
  });

  it("keeps the new Kirchhoff concept inside the circuits branch", () => {
    const concept = getConceptBySlug("kirchhoff-loop-and-junction-rules");
    const topic = getTopicDiscoverySummaryForConceptSlug("kirchhoff-loop-and-junction-rules");

    expect(concept.topic).toBe("Circuits");
    expect(topic.slug).toBe("circuits");
  });

  it("keeps the new RC concept inside the circuits branch", () => {
    const concept = getConceptBySlug("rc-charging-and-discharging");
    const topic = getTopicDiscoverySummaryForConceptSlug("rc-charging-and-discharging");

    expect(concept.topic).toBe("Circuits");
    expect(topic.slug).toBe("circuits");
  });

  it("keeps the new internal-resistance concept inside the circuits branch", () => {
    const concept = getConceptBySlug("internal-resistance-and-terminal-voltage");
    const topic = getTopicDiscoverySummaryForConceptSlug("internal-resistance-and-terminal-voltage");

    expect(concept.topic).toBe("Circuits");
    expect(topic.slug).toBe("circuits");
  });
});
