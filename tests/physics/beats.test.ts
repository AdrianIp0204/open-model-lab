import { describe, expect, it } from "vitest";
import {
  buildBeatsSeries,
  describeBeatsState,
  sampleBeatsState,
} from "@/lib/physics";

describe("beats helpers", () => {
  it("derives the beat envelope from two nearby source frequencies", () => {
    const snapshot = sampleBeatsState(
      {
        amplitude: 0.12,
        frequencyA: 1,
        frequencyB: 1.2,
      },
      1.25,
    );

    expect(snapshot.averageFrequency).toBeCloseTo(1.1, 6);
    expect(snapshot.frequencyDifference).toBeCloseTo(0.2, 6);
    expect(snapshot.beatFrequency).toBeCloseTo(0.2, 6);
    expect(snapshot.beatPeriod).toBeCloseTo(5, 6);
    expect(snapshot.envelopeAmplitude).toBeCloseTo(0.169706, 6);
    expect(snapshot.envelopeRatio).toBeCloseTo(0.707107, 6);
    expect(snapshot.loudnessCue).toBeCloseTo(0.5, 6);
    expect(snapshot.loudnessLabel).toBe("fading");
  });

  it("removes the separate envelope cycle when the two frequencies match", () => {
    const snapshot = sampleBeatsState(
      {
        amplitude: 0.12,
        frequencyA: 1.1,
        frequencyB: 1.1,
      },
      2,
    );

    expect(snapshot.frequencyDifference).toBeCloseTo(0, 6);
    expect(snapshot.beatFrequency).toBeCloseTo(0, 6);
    expect(Number.isFinite(snapshot.beatPeriod)).toBe(false);
    expect(snapshot.envelopeRatio).toBeCloseTo(1, 6);
    expect(snapshot.loudnessLabel).toBe("steady");
  });

  it("builds linked time-domain series for the source, resultant, and envelope views", () => {
    const series = buildBeatsSeries({
      amplitude: 0.12,
      frequencyA: 1,
      frequencyB: 1.2,
    });

    expect(series.displacement).toHaveLength(3);
    expect(series.envelope).toHaveLength(2);
    expect(series.displacement[0]?.points.length).toBeGreaterThan(100);
    expect(series.envelope[0]?.points.at(0)?.y).toBeCloseTo(1, 6);
    expect(series.envelope[1]?.points.at(0)?.y).toBeCloseTo(1, 6);
  });

  it("describes the current beat state in plain language", () => {
    const description = describeBeatsState(
      {
        amplitude: 0.12,
        frequencyA: 1,
        frequencyB: 1.2,
      },
      0.5,
    );

    expect(description).toContain("beat frequency");
    expect(description).toContain("difference is");
    expect(description).toContain("loudness cue");
  });
});
