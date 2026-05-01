"use client";

import {
  getCircuitSymbolShapes,
  type CircuitPaletteItemType,
  type CircuitSymbolShape,
} from "@/lib/circuit-builder";

type CircuitSymbolProps = {
  type: CircuitPaletteItemType;
  className?: string;
  strokeWidth?: number;
  active?: boolean;
  openSwitch?: boolean;
  embedded?: boolean;
};

function renderShape(shape: CircuitSymbolShape, index: number, strokeWidth: number) {
  const commonProps = {
    fill: shape.fill ?? "none",
    stroke: shape.stroke ?? "currentColor",
    strokeWidth: shape.strokeWidth ?? strokeWidth,
    strokeLinecap: shape.strokeLinecap ?? "round",
    strokeLinejoin: shape.strokeLinejoin ?? "round",
  };

  switch (shape.kind) {
    case "circle":
      return (
        <circle
          key={index}
          cx={shape.cx}
          cy={shape.cy}
          r={shape.r}
          {...commonProps}
        />
      );
    case "line":
      return (
        <line
          key={index}
          x1={shape.x1}
          y1={shape.y1}
          x2={shape.x2}
          y2={shape.y2}
          {...commonProps}
        />
      );
    case "path":
      return <path key={index} d={shape.d} {...commonProps} />;
    case "rect":
      return (
        <rect
          key={index}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          rx={shape.rx}
          {...commonProps}
        />
      );
    default:
      return null;
  }
}

export function CircuitSymbol({
  type,
  className = "h-12 w-full",
  strokeWidth = 3,
  active = false,
  openSwitch = false,
  embedded = false,
}: CircuitSymbolProps) {
  const toneClass = active ? "text-teal-600" : "text-ink-950";
  const shapes = getCircuitSymbolShapes(type, { openSwitch });
  const content = <>{shapes.map((shape, index) => renderShape(shape, index, strokeWidth))}</>;

  if (embedded) {
    return <g className={toneClass}>{content}</g>;
  }

  return (
    <svg
      viewBox="-72 -48 144 96"
      aria-hidden="true"
      focusable="false"
      className={[className, toneClass].join(" ").trim()}
    >
      {content}
    </svg>
  );
}
