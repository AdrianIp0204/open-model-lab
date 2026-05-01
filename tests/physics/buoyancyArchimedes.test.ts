import { describe, expect, it } from "vitest";
import {
  buildBuoyancyArchimedesSeries,
  describeBuoyancyArchimedesState,
  sampleBuoyancyArchimedesState,
} from "@/lib/physics";

describe("buoyancy-archimedes helpers", () => {
  it("raises buoyant force with submerged volume before full submersion", () => {
    const shallow = sampleBuoyancyArchimedesState({
      objectDensity: 650,
      fluidDensity: 1000,
      gravity: 9.8,
      bottomDepth: 0.4,
    });
    const deeper = sampleBuoyancyArchimedesState({
      objectDensity: 650,
      fluidDensity: 1000,
      gravity: 9.8,
      bottomDepth: 0.8,
    });

    expect(deeper.weight).toBeCloseTo(shallow.weight, 6);
    expect(deeper.displacedVolume).toBeGreaterThan(shallow.displacedVolume);
    expect(deeper.buoyantForce).toBeGreaterThan(shallow.buoyantForce);
  });

  it("keeps buoyant force fixed once the full block is submerged in the same fluid", () => {
    const justSubmerged = sampleBuoyancyArchimedesState({
      objectDensity: 1000,
      fluidDensity: 1000,
      gravity: 9.8,
      bottomDepth: 1,
    });
    const deeper = sampleBuoyancyArchimedesState({
      objectDensity: 1000,
      fluidDensity: 1000,
      gravity: 9.8,
      bottomDepth: 1.45,
    });

    expect(justSubmerged.fullySubmerged).toBe(true);
    expect(deeper.fullySubmerged).toBe(true);
    expect(deeper.displacedVolume).toBeCloseTo(justSubmerged.displacedVolume, 6);
    expect(deeper.buoyantForce).toBeCloseTo(justSubmerged.buoyantForce, 6);
    expect(deeper.bottomPressure).toBeGreaterThan(justSubmerged.bottomPressure);
  });

  it("builds the expected static response graph groups", () => {
    const series = buildBuoyancyArchimedesSeries({
      objectDensity: 650,
      fluidDensity: 1000,
      gravity: 9.8,
      bottomDepth: 0.65,
    });

    expect(series["force-depth"]).toHaveLength(2);
    expect(series["force-fluid-density"]).toHaveLength(2);
    expect(series["required-fraction-object-density"]).toHaveLength(2);
    expect(series["force-depth"][0]?.points.length).toBeGreaterThan(80);
  });

  it("describes buoyancy as displaced-fluid weight plus force balance", () => {
    const description = describeBuoyancyArchimedesState({
      objectDensity: 650,
      fluidDensity: 1000,
      gravity: 9.8,
      bottomDepth: 0.65,
    });

    expect(description).toContain("Archimedes");
    expect(description).toMatch(/displaced fluid/i);
    expect(description).toMatch(/buoyant force/i);
  });
});
