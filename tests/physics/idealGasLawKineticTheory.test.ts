import { describe, expect, it } from "vitest";
import {
  buildIdealGasLawKineticTheorySeries,
  describeIdealGasLawKineticTheoryState,
  sampleIdealGasLawKineticTheoryState,
} from "@/lib/physics";

describe("ideal-gas-law kinetic-theory helpers", () => {
  it("doubles pressure when the same gas is compressed to about half the volume", () => {
    const baseline = sampleIdealGasLawKineticTheoryState({
      particleCount: 24,
      temperature: 3.2,
      volume: 1.6,
    });
    const compressed = sampleIdealGasLawKineticTheoryState({
      particleCount: 24,
      temperature: 3.2,
      volume: 0.8,
    });

    expect(compressed.averageSpeed).toBeCloseTo(baseline.averageSpeed, 6);
    expect(compressed.pressure).toBeCloseTo(baseline.pressure * 2, 6);
    expect(compressed.collisionRate).toBeGreaterThan(baseline.collisionRate);
  });

  it("raises pressure by heating even when the box size and particle count stay fixed", () => {
    const cool = sampleIdealGasLawKineticTheoryState({
      particleCount: 24,
      temperature: 2.4,
      volume: 1.6,
    });
    const hot = sampleIdealGasLawKineticTheoryState({
      particleCount: 24,
      temperature: 4.8,
      volume: 1.6,
    });

    expect(hot.averageSpeed).toBeGreaterThan(cool.averageSpeed);
    expect(hot.collisionRate).toBeGreaterThan(cool.collisionRate);
    expect(hot.pressure).toBeGreaterThan(cool.pressure);
  });

  it("builds the expected response graph groups", () => {
    const series = buildIdealGasLawKineticTheorySeries({
      particleCount: 24,
      temperature: 3.2,
      volume: 1.6,
    });

    expect(series["pressure-volume"]).toHaveLength(1);
    expect(series["pressure-temperature"]).toHaveLength(1);
    expect(series["pressure-particle-count"]).toHaveLength(1);
    expect(series["collision-temperature"]).toHaveLength(1);
    expect(series["pressure-volume"][0]?.points.length).toBeGreaterThan(80);
  });

  it("describes pressure as a wall-hit story rather than a detached formula", () => {
    const description = describeIdealGasLawKineticTheoryState({
      particleCount: 36,
      temperature: 3.2,
      volume: 1.6,
    });

    expect(description).toContain("36 particles");
    expect(description).toContain("wall collision rate");
    expect(description).toMatch(/pressure|crowded|walls/i);
  });
});
