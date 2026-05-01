import { describe, expect, it } from "vitest";
import {
  buildBuffersNeutralizationSeries,
  describeBuffersNeutralizationState,
  sampleBuffersNeutralizationState,
} from "@/lib/physics";

describe("buffers and neutralization helpers", () => {
  it("spends buffer reserve before allowing a larger pH shift", () => {
    const buffered = sampleBuffersNeutralizationState({
      acidAmount: 5.8,
      baseAmount: 3.4,
      bufferAmount: 2.8,
      waterVolume: 1.2,
    });
    const unbuffered = sampleBuffersNeutralizationState({
      acidAmount: 5.8,
      baseAmount: 3.4,
      bufferAmount: 0,
      waterVolume: 1.2,
    });

    expect(buffered.bufferRemaining).toBeGreaterThan(0);
    expect(Math.abs(buffered.pH - 7)).toBeLessThan(Math.abs(unbuffered.pH - 7));
    expect(buffered.neutralizedAmount).toBeCloseTo(unbuffered.neutralizedAmount);
  });

  it("builds one pH response graph and one reserve-response graph from the same bench state", () => {
    const series = buildBuffersNeutralizationSeries({
      acidAmount: 5.8,
      baseAmount: 4.6,
      bufferAmount: 2.4,
      waterVolume: 1.4,
    });

    expect(series["ph-vs-acid"]).toHaveLength(1);
    expect(series["buffer-remaining-vs-acid"]).toHaveLength(1);
  });

  it("describes buffer reserve as active chemistry rather than no change", () => {
    const description = describeBuffersNeutralizationState({
      acidAmount: 6.2,
      baseAmount: 3.4,
      bufferAmount: 2.8,
      waterVolume: 1.2,
    });

    expect(description).toContain("buffer reserve");
    expect(description).toContain("pH");
    expect(description).not.toContain("nothing changed");
  });
});
