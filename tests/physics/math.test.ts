import { describe, expect, it } from "vitest";
import {
  clamp,
  degToRad,
  formatDisplayText,
  formatMeasurement,
  formatNumber,
  lerp,
  radToDeg,
} from "@/lib/physics";

describe("physics math helpers", () => {
  it("clamps and interpolates values", () => {
    expect(clamp(12, 0, 10)).toBe(10);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
  });

  it("converts between degrees and radians", () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI);
    expect(radToDeg(Math.PI / 2)).toBe(90);
  });

  it("formats small and large numbers cleanly", () => {
    expect(formatNumber(2.5)).toBe("2.5");
    expect(formatNumber(12345)).toMatch(/e/);
  });

  it("formats display text and measurements with readable units", () => {
    expect(formatDisplayText("theta vs Theta")).toBe("θ vs Θ");
    expect(formatDisplayText("m/s^2 and deg")).toBe("m/s² and °");
    expect(formatDisplayText("$\\alpha = \\tau/I$")).toBe("α = τ/I");
    expect(formatDisplayText("$mr^2$ and \\mathrm{N\\,m}")).toBe("mr² and N m");
    expect(formatMeasurement(45, "deg")).toBe("45°");
    expect(formatMeasurement(9.81, "m/s^2")).toBe("9.81 m/s²");
  });
});
