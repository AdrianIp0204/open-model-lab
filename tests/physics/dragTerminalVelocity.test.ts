import { describe, expect, it } from "vitest";
import {
  buildDragTerminalVelocitySeries,
  describeDragTerminalVelocityState,
  sampleDragTerminalVelocityState,
} from "@/lib/physics";

describe("drag-terminal-velocity helpers", () => {
  it("raises terminal speed when mass increases at fixed area and drag strength", () => {
    const light = sampleDragTerminalVelocityState({
      mass: 1.2,
      area: 0.05,
      dragStrength: 12,
    });
    const heavy = sampleDragTerminalVelocityState({
      mass: 3.6,
      area: 0.05,
      dragStrength: 12,
    });

    expect(heavy.terminalSpeed).toBeGreaterThan(light.terminalSpeed);
    expect(heavy.weightForce).toBeGreaterThan(light.weightForce);
  });

  it("lowers terminal speed when area or drag strength increases", () => {
    const compact = sampleDragTerminalVelocityState({
      mass: 2,
      area: 0.04,
      dragStrength: 10,
    });
    const wide = sampleDragTerminalVelocityState({
      mass: 2,
      area: 0.12,
      dragStrength: 10,
    });
    const thickerFluid = sampleDragTerminalVelocityState({
      mass: 2,
      area: 0.04,
      dragStrength: 20,
    });

    expect(wide.terminalSpeed).toBeLessThan(compact.terminalSpeed);
    expect(thickerFluid.terminalSpeed).toBeLessThan(compact.terminalSpeed);
  });

  it("builds the expected live and response graph groups", () => {
    const series = buildDragTerminalVelocitySeries({
      mass: 2,
      area: 0.05,
      dragStrength: 12,
    });

    expect(series["speed-history"]).toHaveLength(2);
    expect(series["force-balance"]).toHaveLength(3);
    expect(series["terminal-speed-mass"]).toHaveLength(1);
    expect(series["terminal-speed-area"]).toHaveLength(1);
    expect(series["terminal-speed-drag-strength"]).toHaveLength(1);
    expect(series["speed-history"][0]?.points.length).toBeGreaterThan(100);
  });

  it("describes the live state through drag growth and terminal balance", () => {
    const description = describeDragTerminalVelocityState(
      {
        mass: 1.2,
        area: 0.12,
        dragStrength: 18,
      },
      4,
    );

    expect(description).toMatch(/drag/i);
    expect(description).toMatch(/terminal/i);
    expect(description).toMatch(/weight/i);
  });
});
