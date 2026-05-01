import { describe, expect, it } from "vitest";
import {
  buildBohrModelSeries,
  describeBohrModelState,
  sampleBohrModelState,
} from "@/lib/physics";

describe("bohr-model helpers", () => {
  it("keeps emission and reverse excitation locked to the same wavelength", () => {
    const emission = sampleBohrModelState({
      upperLevel: 3,
      lowerLevel: 2,
      excitationMode: false,
    });
    const excitation = sampleBohrModelState({
      upperLevel: 3,
      lowerLevel: 2,
      excitationMode: true,
    });

    expect(emission.activeTransition.wavelengthNm).toBeCloseTo(
      excitation.activeTransition.wavelengthNm,
      6,
    );
    expect(emission.activeTransition.energyEv).toBeCloseTo(
      excitation.activeTransition.energyEv,
      6,
    );
  });

  it("builds the expected hydrogen series spectrum graph", () => {
    const series = buildBohrModelSeries({
      upperLevel: 6,
      lowerLevel: 2,
      excitationMode: false,
    });

    expect(series["series-spectrum"]).toHaveLength(1);
    expect(series["series-spectrum"][0]?.id).toBe("series-lines");
    expect(series["series-spectrum"][0]?.points.length).toBeGreaterThan(300);
  });

  it("describes the Bohr state as a bounded historical hydrogen model", () => {
    const description = describeBohrModelState(
      {
        upperLevel: 2,
        lowerLevel: 1,
        excitationMode: true,
      },
      0.25,
    );

    expect(description).toMatch(/excitation/i);
    expect(description).toContain("ultraviolet");
    expect(description).toContain("bounded historical hydrogen model");
    expect(description).toContain("final quantum description");
  });
});
