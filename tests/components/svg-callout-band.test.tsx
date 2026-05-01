import { describe, expect, it } from "vitest";
import { layoutSvgCalloutBand } from "@/components/simulations/primitives/svg-callout-band";

describe("layoutSvgCalloutBand", () => {
  it("stacks crowded callouts into additional rows instead of collapsing them onto one x position", () => {
    const positioned = layoutSvgCalloutBand(
      [
        { id: "a", text: "cargo x 0.80 m", anchorX: 180, anchorY: 110, priority: 3 },
        { id: "b", text: "x_CM 0.52 m", anchorX: 186, anchorY: 114, priority: 4 },
        { id: "c", text: "W_plank", anchorX: 176, anchorY: 124, priority: 1 },
      ],
      {
        minX: 40,
        maxX: 420,
        baseY: 60,
        direction: "up",
        maxRows: 3,
      },
    );

    expect(positioned).toHaveLength(3);
    expect(new Set(positioned.map((item) => item.row)).size).toBeGreaterThan(1);
    expect(positioned.every((item) => item.centerX >= 40 && item.centerX <= 420)).toBe(true);
  });
});
