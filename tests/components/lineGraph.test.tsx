import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LineGraph } from "@/components/graphs";

describe("LineGraph", () => {
  it("renders a title, legend, and summary", () => {
    const { container } = render(
      <LineGraph
        title="Compare"
        xLabel="Time"
        yLabel="Displacement"
        summary="The oscillator moves around equilibrium."
        series={[
          {
            id: "setup-a",
            label: "Setup A",
            points: [
              { x: 0, y: 0 },
              { x: 1, y: 1 },
              { x: 2, y: 0 },
            ],
            color: "#1ea6a2",
          },
          {
            id: "setup-b",
            label: "Setup B",
            points: [
              { x: 0, y: 0.25 },
              { x: 1, y: 0.75 },
              { x: 2, y: 0.2 },
            ],
            color: "#f0ab3c",
            dashed: true,
          },
        ]}
      />,
    );

    expect(screen.getByRole("img", { name: /Compare/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Setup A series")).toBeInTheDocument();
    expect(screen.getByLabelText("Setup B reference series")).toBeInTheDocument();
    expect(screen.getAllByText("The oscillator moves around equilibrium.").length).toBeGreaterThan(0);
    expect(screen.getByText("Time / Displacement")).toBeInTheDocument();
    expect(container.querySelectorAll("path[stroke-dasharray]").length).toBe(1);
  });

  it("emits preview state and renders a marker while hovering", () => {
    const onPreviewChange = vi.fn();
    const { container } = render(
      <LineGraph
        title="Compare"
        xLabel="Time"
        yLabel="Displacement"
        summary="The oscillator moves around equilibrium."
        onPreviewChange={onPreviewChange}
        series={[
          {
            id: "setup-a",
            label: "Setup A",
            points: [
              { x: 0, y: 0 },
              { x: 1, y: 1 },
              { x: 2, y: 0 },
            ],
            color: "#1ea6a2",
          },
          {
            id: "setup-b",
            label: "Setup B",
            points: [
              { x: 0, y: 0.25 },
              { x: 1, y: 0.75 },
              { x: 2, y: 0.2 },
            ],
            color: "#f0ab3c",
            dashed: true,
          },
        ]}
      />,
    );

    const svg = container.querySelector("svg[role='img']") as SVGSVGElement;
    fireEvent.pointerMove(svg, {
      clientX: 380,
      clientY: 180,
      pointerId: 1,
      pointerType: "mouse",
    });

    expect(onPreviewChange).toHaveBeenCalled();
    expect(onPreviewChange.mock.calls.at(-1)?.[0]).toMatchObject({
      seriesId: "setup-a",
      seriesLabel: "Setup A",
      point: { x: 2, y: 0 },
      pointIndex: 2,
      pointCount: 3,
    });
    expect(screen.getByText("x 2, y 0")).toBeInTheDocument();
    expect(container.querySelectorAll("line[stroke-dasharray='6 6']").length).toBe(1);
    expect(container.querySelectorAll("circle[opacity='0.95']").length).toBeGreaterThanOrEqual(1);
  });

  it("supports touch scrub and clears preview on release", () => {
    const onPreviewChange = vi.fn();
    const { container } = render(
      <LineGraph
        title="Touch"
        xLabel="Frequency"
        yLabel="Amplitude"
        summary="Touch scrubbing should work."
        onPreviewChange={onPreviewChange}
        series={[
          {
            id: "response",
            label: "Response",
            points: [
              { x: 0, y: 0.2 },
              { x: 1, y: 0.9 },
              { x: 2, y: 0.4 },
            ],
            color: "#4ea6df",
          },
        ]}
      />,
    );

    const svg = container.querySelector("svg[role='img']") as SVGSVGElement;
    fireEvent.pointerDown(svg, {
      clientX: 320,
      clientY: 190,
      pointerId: 7,
      pointerType: "touch",
    });
    fireEvent.pointerMove(svg, {
      clientX: 420,
      clientY: 150,
      pointerId: 7,
      pointerType: "touch",
    });

    expect(onPreviewChange.mock.calls.some(([preview]) => preview?.seriesId === "response")).toBe(true);
    expect(within(container).getByText("x 2, y 0.4")).toBeInTheDocument();

    fireEvent.pointerUp(svg, {
      pointerId: 7,
      pointerType: "touch",
    });

    expect(onPreviewChange.mock.calls.at(-1)?.[0]).toBeNull();
  });

  it("passes setup metadata through the preview sample", () => {
    const onPreviewChange = vi.fn();
    render(
      <LineGraph
        title="Setups"
        xLabel="Time"
        yLabel="Displacement"
        summary="Setup metadata should survive the preview payload."
        onPreviewChange={onPreviewChange}
        series={[
          {
            id: "series-a",
            label: "Setup A",
            points: [
              { x: 0, y: 0 },
              { x: 1, y: 0.5 },
            ],
            color: "#1ea6a2",
            meta: { setup: "a" },
          },
        ]}
      />,
    );

    const svg = screen.getByRole("img", { name: /Setups/ });
    fireEvent.pointerMove(svg, {
      clientX: 300,
      clientY: 170,
      pointerId: 4,
      pointerType: "mouse",
    });

    expect(onPreviewChange.mock.calls.at(-1)?.[0]).toMatchObject({
      seriesId: "series-a",
      setup: "a",
    });
  });

  it("renders a controlled inspection marker without enabling hover preview", () => {
    const onPreviewChange = vi.fn();

    const { container } = render(
      <LineGraph
        title="Inspection"
        xLabel="Time"
        yLabel="Position"
        summary="Inspection mode should keep a controlled marker visible."
        previewEnabled={false}
        linkedMarker={{
          mode: "inspect",
          label: "paused t = 1.00 s",
          xValue: 1,
          activeSeriesId: "series-a",
          samples: [
            {
              seriesId: "series-a",
              label: "Setup A",
              color: "#1ea6a2",
              pointIndex: 1,
              pointCount: 3,
              point: { x: 1, y: 0.5 },
            },
          ],
        }}
        onPreviewChange={onPreviewChange}
        series={[
          {
            id: "series-a",
            label: "Setup A",
            points: [
              { x: 0, y: 0 },
              { x: 1, y: 0.5 },
              { x: 2, y: 0 },
            ],
            color: "#1ea6a2",
          },
        ]}
      />,
    );

    expect(screen.getByText(/paused t = 1.00 s/i)).toBeInTheDocument();
    const svg = container.querySelector("svg[role='img']") as SVGSVGElement;
    fireEvent.pointerMove(svg, {
      clientX: 350,
      clientY: 180,
      pointerId: 3,
      pointerType: "mouse",
    });

    expect(onPreviewChange).not.toHaveBeenCalled();
    expect(container.querySelectorAll("line[stroke-dasharray='6 6']").length).toBe(1);
  });

  it("shows explicit scale ranges when bounds are provided", () => {
    render(
      <LineGraph
        title="Scale"
        xLabel="Time (s)"
        yLabel="Displacement (m)"
        summary="Stable graph bounds should be visible."
        boundsOverride={{ minX: 0, maxX: 8, minY: -3, maxY: 3 }}
        series={[
          {
            id: "series-a",
            label: "Setup A",
            points: [
              { x: 0, y: 0 },
              { x: 1, y: 0.5 },
              { x: 2, y: 0 },
            ],
            color: "#1ea6a2",
          },
        ]}
      />,
    );

    expect(screen.getByText("Time (s): 0 to 8")).toBeInTheDocument();
    expect(screen.getByText("Displacement (m): -3 to 3")).toBeInTheDocument();
  });
});
