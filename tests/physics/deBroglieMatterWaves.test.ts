import { describe, expect, it } from "vitest";
import {
  buildDeBroglieMatterWavesSeries,
  describeDeBroglieMatterWavesState,
  sampleDeBroglieMatterWavesState,
} from "@/lib/physics";

describe("de-broglie-matter-waves helpers", () => {
  it("keeps wavelength inversely tied to momentum", () => {
    const slower = sampleDeBroglieMatterWavesState({
      massMultiple: 1,
      speedMms: 2.2,
    });
    const faster = sampleDeBroglieMatterWavesState({
      massMultiple: 1,
      speedMms: 4.4,
    });

    expect(faster.momentumScaled).toBeGreaterThan(slower.momentumScaled);
    expect(faster.wavelengthNm).toBeLessThan(slower.wavelengthNm);
    expect(faster.fitCount).toBeGreaterThan(slower.fitCount);
  });

  it("keeps same-momentum swaps on about the same wavelength", () => {
    const reference = sampleDeBroglieMatterWavesState({
      massMultiple: 1,
      speedMms: 2.2,
    });
    const swapped = sampleDeBroglieMatterWavesState({
      massMultiple: 2,
      speedMms: 1.1,
    });

    expect(swapped.momentumScaled).toBeCloseTo(reference.momentumScaled, 10);
    expect(swapped.wavelengthNm).toBeCloseTo(reference.wavelengthNm, 10);
    expect(swapped.fitCount).toBeCloseTo(reference.fitCount, 10);
  });

  it("builds both matter-wave response graphs", () => {
    const series = buildDeBroglieMatterWavesSeries();

    expect(series["wavelength-momentum"]).toHaveLength(1);
    expect(series["wavelength-momentum"][0]?.id).toBe("matter-wavelength");
    expect(series["loop-fit"]).toHaveLength(1);
    expect(series["loop-fit"][0]?.id).toBe("fit-count");
    expect(series["wavelength-momentum"][0]?.points.length).toBeGreaterThan(100);
    expect(series["loop-fit"][0]?.points.length).toBeGreaterThan(100);
  });

  it("describes the bounded matter-wave bridge honestly", () => {
    const description = describeDeBroglieMatterWavesState({
      massMultiple: 1,
      speedMms: 2.2,
    });

    expect(description).toContain("de Broglie wavelength");
    expect(description).toContain("whole-number fit");
    expect(description).toContain("non-relativistic");
    expect(description).toContain("quantum behavior");
  });
});
