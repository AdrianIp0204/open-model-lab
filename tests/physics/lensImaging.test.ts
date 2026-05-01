import { describe, expect, it } from "vitest";
import {
  buildLensImagingSeries,
  describeLensImagingState,
  sampleLensImagingState,
} from "@/lib/physics";

describe("lens imaging helpers", () => {
  it("resolves real and virtual converging-lens regimes from one thin-lens model", () => {
    const realImage = sampleLensImagingState({
      converging: true,
      focalLength: 0.8,
      objectDistance: 2.4,
      objectHeight: 1,
    });
    const virtualImage = sampleLensImagingState({
      converging: true,
      focalLength: 0.8,
      objectDistance: 0.55,
      objectHeight: 1,
    });

    expect(realImage.imageDistance).toBeCloseTo(1.2, 6);
    expect(realImage.magnification).toBeCloseTo(-0.5, 6);
    expect(realImage.imageType).toBe("real");
    expect(realImage.orientation).toBe("inverted");
    expect(realImage.regime).toBe("beyond-2f");

    expect(virtualImage.imageDistance).toBeLessThan(0);
    expect(virtualImage.magnification).toBeGreaterThan(1);
    expect(virtualImage.imageType).toBe("virtual");
    expect(virtualImage.orientation).toBe("upright");
    expect(virtualImage.regime).toBe("inside-focus");
  });

  it("keeps diverging-lens images virtual, upright, and reduced", () => {
    const snapshot = sampleLensImagingState({
      converging: false,
      focalLength: 0.8,
      objectDistance: 1.8,
      objectHeight: 1,
    });

    expect(snapshot.regime).toBe("diverging");
    expect(snapshot.imageType).toBe("virtual");
    expect(snapshot.orientation).toBe("upright");
    expect(snapshot.sizeRelation).toBe("smaller");
    expect(snapshot.magnification).toBeGreaterThan(0);
    expect(snapshot.magnification).toBeLessThan(1);
  });

  it("builds the expected graph branches and describes the focus limit honestly", () => {
    const convergingSeries = buildLensImagingSeries({
      converging: true,
      focalLength: 0.8,
      objectDistance: 2.4,
      objectHeight: 1,
    });
    const divergingSeries = buildLensImagingSeries({
      converging: false,
      focalLength: 0.8,
      objectDistance: 1.8,
      objectHeight: 1,
    });
    const description = describeLensImagingState({
      converging: true,
      focalLength: 0.8,
      objectDistance: 0.8,
      objectHeight: 1,
    });

    expect(convergingSeries["image-map"]).toHaveLength(2);
    expect(convergingSeries.magnification).toHaveLength(2);
    expect(divergingSeries["image-map"]).toHaveLength(1);
    expect(divergingSeries.magnification).toHaveLength(1);
    expect(description).toContain("converging lens");
    expect(description).toContain("\u221e");
  });

  it("applies graph-preview object-distance overrides without discarding normalized params", () => {
    const snapshot = sampleLensImagingState(
      {
        converging: false,
        focalLength: 0.8,
        objectDistance: 1.8,
        objectHeight: 3,
      },
      0.9,
    );

    expect(snapshot.objectDistance).toBeCloseTo(0.9, 6);
    expect(snapshot.objectHeight).toBeCloseTo(1.8, 6);
    expect(snapshot.imageType).toBe("virtual");
  });
});
