import { describe, expect, it } from "vitest";
import {
  buildAtomicSpectraSeries,
  describeAtomicSpectraState,
  sampleAtomicSpectraState,
} from "@/lib/physics";

describe("atomic-spectra helpers", () => {
  it("keeps emission and absorption wavelengths matched for the same gaps", () => {
    const emission = sampleAtomicSpectraState({
      gap12Ev: 1.9,
      gap23Ev: 2.6,
      gap34Ev: 2.7,
      absorptionMode: false,
    });
    const absorption = sampleAtomicSpectraState({
      gap12Ev: 1.9,
      gap23Ev: 2.6,
      gap34Ev: 2.7,
      absorptionMode: true,
    });

    expect(emission.transitions).toHaveLength(6);
    expect(absorption.transitions).toHaveLength(6);
    expect(
      emission.transitions.map((transition) => Number(transition.wavelengthNm.toFixed(6))),
    ).toEqual(
      absorption.transitions.map((transition) => Number(transition.wavelengthNm.toFixed(6))),
    );
  });

  it("builds the expected observed-spectrum graph series", () => {
    const series = buildAtomicSpectraSeries({
      gap12Ev: 1.9,
      gap23Ev: 2.6,
      gap34Ev: 2.7,
      absorptionMode: false,
    });

    expect(series["spectrum-lines"]).toHaveLength(2);
    expect(series["spectrum-lines"][0]?.id).toBe("observed-spectrum");
    expect(series["spectrum-lines"][1]?.id).toBe("continuum-reference");
    expect(series["spectrum-lines"][0]?.points.length).toBeGreaterThan(300);
  });

  it("describes discrete line behavior without inventing a continuous spectrum", () => {
    const description = describeAtomicSpectraState(
      {
        gap12Ev: 1.9,
        gap23Ev: 2.6,
        gap34Ev: 2.7,
        absorptionMode: true,
      },
      0.25,
    );

    expect(description).toContain("wavelength");
    expect(description).toContain("dark absorption line");
    expect(description).toContain("discrete");
    expect(description).toContain("allowed level differences");
  });
});
