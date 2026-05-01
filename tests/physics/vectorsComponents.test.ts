import { describe, expect, it } from "vitest";
import {
  VECTORS_COMPONENTS_DURATION,
  angleFromComponents,
  buildVectorsComponentsSeries,
  clampVectorsComponentsTime,
  describeVectorsComponentsState,
  magnitudeFromComponents,
  resolveVectorsComponentsViewport,
  sampleVectorsComponentsState,
} from "@/lib/physics";

describe("vectors/components helpers", () => {
  const params = {
    magnitude: 8,
    angle: 35,
  };

  it("resolves the live component state from magnitude and angle", () => {
    const state = sampleVectorsComponentsState(params, 1);

    expect(state.vx).toBeCloseTo(6.5532, 3);
    expect(state.vy).toBeCloseTo(4.5886, 3);
    expect(state.x).toBeCloseTo(state.vx, 3);
    expect(state.y).toBeCloseTo(state.vy, 3);
  });

  it("clamps inspection time to the fixed duration window", () => {
    expect(clampVectorsComponentsTime(VECTORS_COMPONENTS_DURATION + 1)).toBe(
      VECTORS_COMPONENTS_DURATION,
    );
    expect(clampVectorsComponentsTime(-1)).toBe(0);
  });

  it("builds linked path, position, and component series", () => {
    const series = buildVectorsComponentsSeries(params);

    expect(series.path[0].points.length).toBeGreaterThan(0);
    expect(series.position).toHaveLength(2);
    expect(series.components).toHaveLength(2);
  });

  it("uses stable viewport buckets for plane and component ranges", () => {
    const viewport = resolveVectorsComponentsViewport([params, { magnitude: 12, angle: 140 }]);

    expect(viewport.duration).toBe(VECTORS_COMPONENTS_DURATION);
    expect(viewport.maxAbsPosition).toBe(64);
    expect(viewport.maxAbsComponent).toBe(10);
  });

  it("describes the current vector state and round-trips geometry helpers", () => {
    expect(describeVectorsComponentsState(params, 1.5)).toContain("vector magnitude");
    expect(angleFromComponents(0, 5)).toBeCloseTo(90);
    expect(magnitudeFromComponents(3, 4)).toBeCloseTo(5);
  });
});
