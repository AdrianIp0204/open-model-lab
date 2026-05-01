import { describe, expect, it } from "vitest";
import {
  buildDopplerEffectSeries,
  describeDopplerEffectState,
  getDopplerEffectWavefronts,
  sampleDopplerEffectState,
} from "@/lib/physics";

describe("doppler-effect helpers", () => {
  it("compresses the front spacing and stretches the rear spacing for a moving source", () => {
    const snapshot = sampleDopplerEffectState(
      {
        sourceFrequency: 1.1,
        sourceSpeed: 0.55,
        observerSpeed: 0,
        observerAhead: true,
      },
      0,
    );

    expect(snapshot.frontSpacing).toBeCloseTo(2.409091, 6);
    expect(snapshot.backSpacing).toBeCloseTo(3.409091, 6);
    expect(snapshot.selectedSpacing).toBeCloseTo(snapshot.frontSpacing, 6);
    expect(snapshot.observedFrequency).toBeCloseTo(1.328302, 6);
    expect(snapshot.pitchShiftLabel).toBe("higher");
  });

  it("lowers the heard frequency behind the source and raises it when the observer moves toward", () => {
    const behindSnapshot = sampleDopplerEffectState(
      {
        sourceFrequency: 1.1,
        sourceSpeed: 0.45,
        observerSpeed: 0,
        observerAhead: false,
      },
      0,
    );
    const movingObserverSnapshot = sampleDopplerEffectState(
      {
        sourceFrequency: 1.1,
        sourceSpeed: 0.45,
        observerSpeed: 0.25,
        observerAhead: true,
      },
      0,
    );

    expect(behindSnapshot.observedFrequency).toBeCloseTo(0.964384, 6);
    expect(behindSnapshot.pitchShiftLabel).toBe("lower");
    expect(movingObserverSnapshot.observedFrequency).toBeCloseTo(1.38, 6);
    expect(movingObserverSnapshot.travelDelay).toBeGreaterThan(0);
  });

  it("builds visible wavefronts and linked spacing / response series", () => {
    const wavefronts = getDopplerEffectWavefronts(
      {
        sourceFrequency: 1.1,
        sourceSpeed: 0.45,
        observerSpeed: 0,
        observerAhead: true,
      },
      0.8,
    );
    const series = buildDopplerEffectSeries({
      sourceFrequency: 1.1,
      sourceSpeed: 0.45,
      observerSpeed: 0,
      observerAhead: true,
    });

    expect(wavefronts.length).toBeGreaterThan(4);
    expect(series.displacement).toHaveLength(2);
    expect(series["source-spacing"]).toHaveLength(2);
    expect(series["observer-response"]).toHaveLength(2);
    expect(series["observer-response"][0]?.points.at(-1)?.y).toBeGreaterThan(1.4);
  });

  it("describes the current moving-source state in plain language", () => {
    const description = describeDopplerEffectState(
      {
        sourceFrequency: 1.1,
        sourceSpeed: 0.45,
        observerSpeed: 0.25,
        observerAhead: true,
      },
      0.4,
    );

    expect(description).toContain("front spacing");
    expect(description).toContain("rear spacing");
    expect(description).toContain("classical sound model");
  });
});
