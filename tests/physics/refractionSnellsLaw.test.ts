import { describe, expect, it } from "vitest";
import {
  buildRefractionSnellsLawSeries,
  describeRefractionSnellsLawState,
  sampleRefractionSnellsLawState,
} from "@/lib/physics";

describe("refraction / Snell's law helpers", () => {
  it("bends toward the normal when light enters a higher-index medium", () => {
    const snapshot = sampleRefractionSnellsLawState({
      incidentAngle: 50,
      n1: 1,
      n2: 1.5,
    });

    expect(snapshot.refractedAngle).toBeCloseTo(30.71, 2);
    expect(snapshot.bendDirection).toBe("toward-normal");
    expect(snapshot.speedRatio).toBeCloseTo(2 / 3, 6);
    expect(snapshot.totalInternalReflection).toBe(false);
  });

  it("bends away from the normal when light enters a lower-index medium", () => {
    const snapshot = sampleRefractionSnellsLawState({
      incidentAngle: 35,
      n1: 1.52,
      n2: 1,
    });

    expect(snapshot.refractedAngle).toBeCloseTo(60.67, 2);
    expect(snapshot.bendDirection).toBe("away-from-normal");
    expect(snapshot.criticalAngle).toBeCloseTo(41.14, 2);
  });

  it("detects the total-internal-reflection threshold honestly", () => {
    const snapshot = sampleRefractionSnellsLawState({
      incidentAngle: 50,
      n1: 1.52,
      n2: 1,
    });
    const description = describeRefractionSnellsLawState({
      incidentAngle: 50,
      n1: 1.52,
      n2: 1,
    });

    expect(snapshot.totalInternalReflection).toBe(true);
    expect(snapshot.refractedAngle).toBeNull();
    expect(snapshot.reflectedAngle).toBeCloseTo(50, 6);
    expect(snapshot.criticalAngle).toBeCloseTo(41.14, 2);
    expect(snapshot.criticalOffset).toBeCloseTo(8.86, 2);
    expect(description).toContain("no real refracted ray");
  });

  it("truncates response graphs at the critical-angle limit when needed", () => {
    const glassToAir = buildRefractionSnellsLawSeries({
      incidentAngle: 35,
      n1: 1.52,
      n2: 1,
    });
    const airToGlass = buildRefractionSnellsLawSeries({
      incidentAngle: 50,
      n1: 1,
      n2: 1.5,
    });
    const lastGlassToAirX =
      glassToAir["refraction-map"][0]?.points.at(-1)?.x ?? 0;
    const lastAirToGlassX = airToGlass["refraction-map"][0]?.points.at(-1)?.x ?? 0;

    expect(lastGlassToAirX).toBeCloseTo(41.14, 1);
    expect(lastAirToGlassX).toBeCloseTo(80, 6);
    expect(glassToAir["bend-map"]).toHaveLength(1);
    expect(glassToAir["transition-map"][1]?.id).toBe("critical-angle-marker");
    expect(glassToAir["transition-map"][2]?.id).toBe("reflected-angle");
  });
});
