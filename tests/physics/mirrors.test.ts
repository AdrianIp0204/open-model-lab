import { describe, expect, it } from "vitest";
import {
  buildMirrorsSeries,
  describeMirrorsState,
  sampleMirrorsState,
} from "@/lib/physics";

describe("mirror helpers", () => {
  it("keeps plane-mirror images virtual, upright, and the same size", () => {
    const snapshot = sampleMirrorsState({
      curved: false,
      concave: true,
      focalLength: 0.8,
      objectDistance: 1.4,
      objectHeight: 1,
    });

    expect(snapshot.regime).toBe("plane");
    expect(snapshot.imageDistance).toBeCloseTo(-1.4, 6);
    expect(snapshot.imageType).toBe("virtual");
    expect(snapshot.orientation).toBe("upright");
    expect(snapshot.sizeRelation).toBe("same-size");
    expect(snapshot.magnification).toBeCloseTo(1, 6);
  });

  it("resolves concave real and convex virtual cases from one mirror model", () => {
    const concaveReal = sampleMirrorsState({
      curved: true,
      concave: true,
      focalLength: 0.8,
      objectDistance: 2.4,
      objectHeight: 1,
    });
    const convexVirtual = sampleMirrorsState({
      curved: true,
      concave: false,
      focalLength: 0.8,
      objectDistance: 1.8,
      objectHeight: 1,
    });

    expect(concaveReal.imageDistance).toBeCloseTo(1.2, 6);
    expect(concaveReal.magnification).toBeCloseTo(-0.5, 6);
    expect(concaveReal.imageType).toBe("real");
    expect(concaveReal.orientation).toBe("inverted");

    expect(convexVirtual.imageDistance).toBeLessThan(0);
    expect(convexVirtual.imageType).toBe("virtual");
    expect(convexVirtual.orientation).toBe("upright");
    expect(convexVirtual.magnification).toBeGreaterThan(0);
    expect(convexVirtual.magnification).toBeLessThan(1);
  });

  it("builds the expected graph branches and describes the focus limit honestly", () => {
    const planeSeries = buildMirrorsSeries({
      curved: false,
      concave: true,
      focalLength: 0.8,
      objectDistance: 1.4,
      objectHeight: 1,
    });
    const concaveSeries = buildMirrorsSeries({
      curved: true,
      concave: true,
      focalLength: 0.8,
      objectDistance: 2.4,
      objectHeight: 1,
    });
    const description = describeMirrorsState({
      curved: true,
      concave: true,
      focalLength: 0.8,
      objectDistance: 0.8,
      objectHeight: 1,
    });

    expect(planeSeries["image-map"]).toHaveLength(1);
    expect(planeSeries.magnification).toHaveLength(1);
    expect(concaveSeries["image-map"]).toHaveLength(2);
    expect(concaveSeries.magnification).toHaveLength(2);
    expect(description).toContain("concave mirror");
    expect(description).toContain("\u221e");
  });
});
