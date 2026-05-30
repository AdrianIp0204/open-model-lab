"use client";

type SimulationAxisDragSurfaceProps = {
  axis: "x" | "y";
  svgWidth: number;
  svgHeight: number;
  value: number;
  region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  ariaLabel: string;
  cursor: string;
  step: number;
  resolveValue: (svgCoordinate: number) => number;
  onChange: (nextValue: number) => void;
  homeValue?: number;
  endValue?: number;
};

const MIN_TOUCH_REGION_SIZE = 136;

function expandRegionToTouchFloor(region: SimulationAxisDragSurfaceProps["region"]) {
  const width = Math.max(region.width, MIN_TOUCH_REGION_SIZE);
  const height = Math.max(region.height, MIN_TOUCH_REGION_SIZE);

  return {
    x: region.x - (width - region.width) / 2,
    y: region.y - (height - region.height) / 2,
    width,
    height,
  };
}

export function SimulationAxisDragSurface({
  axis,
  svgWidth,
  svgHeight,
  value,
  region,
  ariaLabel,
  cursor,
  step,
  resolveValue,
  onChange,
  homeValue,
  endValue,
}: SimulationAxisDragSurfaceProps) {
  const hitRegion = expandRegionToTouchFloor(region);

  function updateFromPointer(clientX: number, clientY: number, ownerSvg: SVGSVGElement) {
    const bounds = ownerSvg.getBoundingClientRect();
    const coordinate =
      axis === "x"
        ? ((clientX - bounds.left) / Math.max(bounds.width, 1)) * svgWidth
        : ((clientY - bounds.top) / Math.max(bounds.height, 1)) * svgHeight;

    onChange(resolveValue(coordinate));
  }

  return (
    <g
      tabIndex={0}
      role="button"
      aria-label={ariaLabel}
      style={{ cursor }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const ownerSvg = event.currentTarget.ownerSVGElement;

        if (!ownerSvg) {
          return;
        }

        updateFromPointer(event.clientX, event.clientY, ownerSvg);
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
          return;
        }

        const ownerSvg = event.currentTarget.ownerSVGElement;

        if (!ownerSvg) {
          return;
        }

        updateFromPointer(event.clientX, event.clientY, ownerSvg);
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onKeyDown={(event) => {
        if (axis === "x" && event.key === "ArrowLeft") {
          event.preventDefault();
          onChange(value - step);
          return;
        }

        if (axis === "x" && event.key === "ArrowRight") {
          event.preventDefault();
          onChange(value + step);
          return;
        }

        if (axis === "y" && event.key === "ArrowUp") {
          event.preventDefault();
          onChange(value + step);
          return;
        }

        if (axis === "y" && event.key === "ArrowDown") {
          event.preventDefault();
          onChange(value - step);
          return;
        }

        if (event.key === "Home" && homeValue !== undefined) {
          event.preventDefault();
          onChange(homeValue);
          return;
        }

        if (event.key === "End" && endValue !== undefined) {
          event.preventDefault();
          onChange(endValue);
        }
      }}
    >
      <rect
        x={hitRegion.x}
        y={hitRegion.y}
        width={hitRegion.width}
        height={hitRegion.height}
        fill="transparent"
      />
    </g>
  );
}
