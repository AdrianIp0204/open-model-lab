import { describe, expect, it } from "vitest";
import {
  buildPhotoelectricEffectSeries,
  describePhotoelectricEffectState,
  samplePhotoelectricEffectState,
} from "@/lib/physics";

describe("photoelectric-effect helpers", () => {
  it("keeps bright sub-threshold light from ejecting electrons", () => {
    const snapshot = samplePhotoelectricEffectState(
      {
        frequencyPHz: 0.38,
        intensity: 1.6,
        workFunctionEv: 2.3,
        collectorVoltage: 0.4,
      },
      0.2,
    );

    expect(snapshot.aboveThreshold).toBe(false);
    expect(snapshot.maxKineticEnergyEv).toBe(0);
    expect(snapshot.collectorCurrent).toBe(0);
  });

  it("changes current with intensity but keeps electron energy fixed at one frequency", () => {
    const dim = samplePhotoelectricEffectState({
      frequencyPHz: 1,
      intensity: 0.45,
      workFunctionEv: 2.3,
      collectorVoltage: 0.4,
    });
    const bright = samplePhotoelectricEffectState({
      frequencyPHz: 1,
      intensity: 1.4,
      workFunctionEv: 2.3,
      collectorVoltage: 0.4,
    });

    expect(bright.maxKineticEnergyEv).toBeCloseTo(dim.maxKineticEnergyEv, 12);
    expect(bright.collectorCurrent).toBeGreaterThan(dim.collectorCurrent);
  });

  it("builds energy, collector, and intensity response graphs", () => {
    const series = buildPhotoelectricEffectSeries({
      frequencyPHz: 1,
      intensity: 1,
      workFunctionEv: 2.3,
      collectorVoltage: 0.4,
    });

    expect(series["energy-balance"]).toHaveLength(3);
    expect(series["collector-sweep"]).toHaveLength(2);
    expect(series["intensity-sweep"]).toHaveLength(2);
    expect(series["collector-sweep"][0]?.points.length).toBeGreaterThan(100);
  });

  it("describes threshold and stopping-potential behavior honestly", () => {
    const description = describePhotoelectricEffectState(
      {
        frequencyPHz: 1,
        intensity: 1,
        workFunctionEv: 2.3,
        collectorVoltage: -1.84,
      },
      0.2,
    );

    expect(description).toContain("photon energy");
    expect(description).toContain("work function");
    expect(description).toContain("stopping potential");
    expect(description).toContain("collector");
  });
});
