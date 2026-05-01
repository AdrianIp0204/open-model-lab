import { describe, expect, it } from "vitest";
import {
  buildPressureHydrostaticSeries,
  describePressureHydrostaticState,
  samplePressureHydrostaticState,
} from "@/lib/physics";

describe("pressure-hydrostatic helpers", () => {
  it("raises only the hydrostatic part when the probe moves deeper", () => {
    const shallow = samplePressureHydrostaticState({
      force: 720,
      area: 0.15,
      density: 1000,
      gravity: 9.8,
      depth: 1,
    });
    const deep = samplePressureHydrostaticState({
      force: 720,
      area: 0.15,
      density: 1000,
      gravity: 9.8,
      depth: 2,
    });

    expect(deep.surfacePressure).toBeCloseTo(shallow.surfacePressure, 6);
    expect(deep.hydrostaticPressure).toBeCloseTo(shallow.hydrostaticPressure * 2, 6);
    expect(deep.totalPressure).toBeGreaterThan(shallow.totalPressure);
  });

  it("lowers the surface contribution when the same force is spread over more area", () => {
    const narrow = samplePressureHydrostaticState({
      force: 720,
      area: 0.12,
      density: 1000,
      gravity: 9.8,
      depth: 1,
    });
    const wide = samplePressureHydrostaticState({
      force: 720,
      area: 0.3,
      density: 1000,
      gravity: 9.8,
      depth: 1,
    });

    expect(wide.hydrostaticPressure).toBeCloseTo(narrow.hydrostaticPressure, 6);
    expect(wide.surfacePressure).toBeLessThan(narrow.surfacePressure);
    expect(wide.totalPressure).toBeLessThan(narrow.totalPressure);
  });

  it("builds the expected static response graph groups", () => {
    const series = buildPressureHydrostaticSeries({
      force: 720,
      area: 0.15,
      density: 1000,
      gravity: 9.8,
      depth: 1,
    });

    expect(series["pressure-depth"]).toHaveLength(3);
    expect(series["pressure-density"]).toHaveLength(3);
    expect(series["pressure-force"]).toHaveLength(3);
    expect(series["pressure-area"]).toHaveLength(3);
    expect(series["pressure-depth"][0]?.points.length).toBeGreaterThan(80);
  });

  it("describes the pressure story as surface plus hydrostatic contributions", () => {
    const description = describePressureHydrostaticState({
      force: 720,
      area: 0.15,
      density: 1200,
      gravity: 9.8,
      depth: 2,
    });

    expect(description).toContain("surface force");
    expect(description).toContain("hydrostatic");
    expect(description).toContain("pressure gradient");
    expect(description).toMatch(/buoyancy|fluid above the probe/i);
  });
});
