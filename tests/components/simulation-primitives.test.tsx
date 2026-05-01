import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CompareLegend, resolveCompareScene } from "@/components/simulations/primitives/compare";
import { resolveOverlayOpacity } from "@/components/simulations/primitives/overlay";
import { SimulationAxisDragSurface } from "@/components/simulations/primitives/SimulationAxisDragSurface";
import { SimulationReadoutCard } from "@/components/simulations/SimulationReadoutCard";

describe("simulation primitives", () => {
  it("resolves compare preview state against the hovered setup", () => {
    const resolved = resolveCompareScene({
      compare: {
        activeTarget: "b",
        labelA: "Baseline",
        labelB: "Variant",
      },
      graphPreview: { setup: "a" },
      activeFrame: "live-frame",
      frameA: "frame-a",
      frameB: "frame-b",
      liveLabel: "Live",
    });

    expect(resolved.compareEnabled).toBe(true);
    expect(resolved.previewedSetup).toBe("a");
    expect(resolved.primaryFrame).toBe("frame-a");
    expect(resolved.secondaryFrame).toBe("frame-b");
    expect(resolved.primaryLabel).toBe("Baseline");
    expect(resolved.secondaryLabel).toBe("Variant");
    expect(resolved.canEditPrimary).toBe(false);
  });

  it("renders compare-aware readout labels and compare legend pills", () => {
    render(
      <svg>
        <CompareLegend primaryLabel="Baseline" secondaryLabel="Variant" />
        <SimulationReadoutCard
          x={0}
          y={0}
          width={180}
          title="Probe state"
          setupLabel="Baseline"
          rows={[{ label: "x", value: "1.0 m" }]}
        />
      </svg>,
    );

    expect(screen.getAllByText("Baseline")).toHaveLength(2);
    expect(screen.getByText("Variant")).toBeInTheDocument();
    expect(screen.getByText("Probe state")).toBeInTheDocument();
    expect(screen.getByText("1.0 m")).toBeInTheDocument();
  });

  it("localizes compare legend and readout labels in zh-HK instead of leaking English defaults", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(
      <svg>
        <CompareLegend primaryLabel="Baseline" secondaryLabel="Variant" />
        <SimulationReadoutCard
          x={0}
          y={0}
          width={180}
          title="Probe state"
          setupLabel="Baseline"
          rows={[{ label: "x", value: "1.0 m" }]}
        />
      </svg>,
    );

    expect(screen.getAllByText("基準版本")).toHaveLength(2);
    expect(screen.getByText("變化版本")).toBeInTheDocument();
    expect(screen.queryByText("Baseline")).not.toBeInTheDocument();
    expect(screen.queryByText("Variant")).not.toBeInTheDocument();
  });

  it("applies keyboard nudges for axis drag surfaces", () => {
    const onChange = vi.fn();

    render(
      <svg>
        <SimulationAxisDragSurface
          axis="x"
          svgWidth={100}
          svgHeight={50}
          value={1}
          region={{ x: 0, y: 0, width: 100, height: 40 }}
          ariaLabel="Move probe"
          cursor="ew-resize"
          step={0.2}
          resolveValue={(svgX) => svgX / 10}
          onChange={onChange}
          homeValue={0}
          endValue={4}
        />
      </svg>,
    );

    const dragSurface = screen.getByRole("button", { name: "Move probe" });
    fireEvent.keyDown(dragSurface, { key: "ArrowRight" });
    fireEvent.keyDown(dragSurface, { key: "Home" });
    fireEvent.keyDown(dragSurface, { key: "End" });

    expect(onChange).toHaveBeenNthCalledWith(1, 1.2);
    expect(onChange).toHaveBeenNthCalledWith(2, 0);
    expect(onChange).toHaveBeenNthCalledWith(3, 4);
  });

  it("dims non-focused overlays with the configured inactive opacity", () => {
    expect(resolveOverlayOpacity(null, "nodes", 0.3)).toBe(1);
    expect(resolveOverlayOpacity("nodes", "nodes", 0.3)).toBe(1);
    expect(resolveOverlayOpacity("nodes", "antinodes", 0.3)).toBe(0.3);
  });
});
