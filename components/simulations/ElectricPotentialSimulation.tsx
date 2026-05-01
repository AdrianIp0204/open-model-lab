"use client";

import { useRef, useState } from "react";
import {
  clamp,
  ELECTRIC_POTENTIAL_MAX_SEPARATION,
  ELECTRIC_POTENTIAL_MIN_SEPARATION,
  ELECTRIC_POTENTIAL_STAGE_MAX_X,
  ELECTRIC_POTENTIAL_STAGE_MAX_Y,
  ELECTRIC_POTENTIAL_STAGE_MIN_X,
  ELECTRIC_POTENTIAL_STAGE_MIN_Y,
  formatMeasurement,
  formatNumber,
  sampleElectricPotentialState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type ElectricPotentialSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type DragTarget = "probe" | "sourceA" | "sourceB";
type ContourPoint = { x: number; y: number };
type ContourCorner = ContourPoint & { value: number };

const WIDTH = 860;
const HEIGHT = 360;
const PLOT_LEFT = 44;
const PLOT_TOP = 38;
const PLOT_RIGHT = 596;
const PLOT_BOTTOM = HEIGHT - 38;
const STAGE_WIDTH = PLOT_RIGHT - PLOT_LEFT;
const STAGE_HEIGHT = PLOT_BOTTOM - PLOT_TOP;
const ORIGIN_X = (PLOT_LEFT + PLOT_RIGHT) / 2;
const ORIGIN_Y = (PLOT_TOP + PLOT_BOTTOM) / 2;
const CARD_WIDTH = 228;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const SOURCE_MARKER_RADIUS = 16;
const POTENTIAL_MAP_COLUMNS = 24;
const POTENTIAL_MAP_ROWS = 16;
const CONTOUR_COLUMNS = 24;
const CONTOUR_ROWS = 18;
const CONTOUR_LEVELS = [-6, -3, -1.5, -0.75, 0.75, 1.5, 3, 6];

const CONTOUR_CASES: Record<number, Array<[number, number]>> = {
  0: [],
  1: [[3, 0]],
  2: [[0, 1]],
  3: [[3, 1]],
  4: [[1, 2]],
  5: [
    [3, 2],
    [0, 1],
  ],
  6: [[0, 2]],
  7: [[3, 2]],
  8: [[2, 3]],
  9: [[0, 2]],
  10: [
    [0, 3],
    [1, 2],
  ],
  11: [[1, 2]],
  12: [[1, 3]],
  13: [[0, 1]],
  14: [[3, 0]],
  15: [],
};

function roundTo(value: number, precision = 2) {
  return Number(value.toFixed(precision));
}

function worldToSvgX(x: number) {
  return (
    PLOT_LEFT +
    ((x - ELECTRIC_POTENTIAL_STAGE_MIN_X) /
      (ELECTRIC_POTENTIAL_STAGE_MAX_X - ELECTRIC_POTENTIAL_STAGE_MIN_X)) *
      STAGE_WIDTH
  );
}

function worldToSvgY(y: number) {
  return (
    PLOT_BOTTOM -
    ((y - ELECTRIC_POTENTIAL_STAGE_MIN_Y) /
      (ELECTRIC_POTENTIAL_STAGE_MAX_Y - ELECTRIC_POTENTIAL_STAGE_MIN_Y)) *
      STAGE_HEIGHT
  );
}

function svgToWorld(svgX: number, svgY: number) {
  return {
    x: clamp(
      ELECTRIC_POTENTIAL_STAGE_MIN_X +
        ((svgX - PLOT_LEFT) / Math.max(STAGE_WIDTH, 1)) *
          (ELECTRIC_POTENTIAL_STAGE_MAX_X - ELECTRIC_POTENTIAL_STAGE_MIN_X),
      ELECTRIC_POTENTIAL_STAGE_MIN_X,
      ELECTRIC_POTENTIAL_STAGE_MAX_X,
    ),
    y: clamp(
      ELECTRIC_POTENTIAL_STAGE_MIN_Y +
        ((PLOT_BOTTOM - svgY) / Math.max(STAGE_HEIGHT, 1)) *
          (ELECTRIC_POTENTIAL_STAGE_MAX_Y - ELECTRIC_POTENTIAL_STAGE_MIN_Y),
      ELECTRIC_POTENTIAL_STAGE_MIN_Y,
      ELECTRIC_POTENTIAL_STAGE_MAX_Y,
    ),
  };
}

function toSvgCoordinates(clientX: number, clientY: number, bounds: DOMRect) {
  return {
    svgX: ((clientX - bounds.left) / Math.max(bounds.width, 1)) * WIDTH,
    svgY: ((clientY - bounds.top) / Math.max(bounds.height, 1)) * HEIGHT,
  };
}

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.35;
}

function formatSignedCharge(value: number) {
  if (Math.abs(value) < 0.005) {
    return "0 q";
  }

  return `${value > 0 ? "+" : ""}${formatNumber(value)} q`;
}

function formatSignedValue(value: number, label: string) {
  if (Math.abs(value) < 0.005) {
    return `${label} 0`;
  }

  return `${label} ${value > 0 ? "+" : ""}${formatNumber(value)}`;
}

function chargeColors(value: number) {
  if (value > 0.05) {
    return {
      fill: "rgba(240,171,60,0.22)",
      stroke: "#f0ab3c",
      text: "#b87000",
    };
  }

  if (value < -0.05) {
    return {
      fill: "rgba(78,166,223,0.22)",
      stroke: "#4ea6df",
      text: "#1d6f9f",
    };
  }

  return {
    fill: "rgba(15,28,36,0.12)",
    stroke: "rgba(15,28,36,0.42)",
    text: "#55636b",
  };
}

function vectorScale(magnitude: number, maxLength: number) {
  if (!Number.isFinite(magnitude) || magnitude <= 0) {
    return 0;
  }

  return maxLength * Math.tanh(magnitude / 2.4);
}

function directionLabel(x: number, y: number) {
  const horizontal = Math.abs(x) < 0.08 ? "" : x > 0 ? "right" : "left";
  const vertical = Math.abs(y) < 0.08 ? "" : y > 0 ? "up" : "down";

  if (horizontal && vertical) {
    return `${vertical}-${horizontal}`;
  }

  return horizontal || vertical || "neutral";
}

function potentialCellFill(value: number) {
  const normalized = Math.tanh(Math.abs(value) / 3.2);
  const alpha = 0.08 + normalized * 0.34;

  if (value > 0.05) {
    return `rgba(240,171,60,${alpha.toFixed(3)})`;
  }

  if (value < -0.05) {
    return `rgba(78,166,223,${alpha.toFixed(3)})`;
  }

  return "rgba(255,255,255,0.16)";
}

function contourStroke(level: number) {
  if (level > 0) {
    return "rgba(184,112,0,0.72)";
  }

  return "rgba(29,111,159,0.72)";
}

function interpolateContourPoint(start: ContourCorner, end: ContourCorner, level: number) {
  const denominator = end.value - start.value;
  const rawT = Math.abs(denominator) <= 1e-6 ? 0.5 : (level - start.value) / denominator;
  const t = clamp(rawT, 0, 1);

  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
}

function resolveContourEdgePoint(
  corners: [ContourCorner, ContourCorner, ContourCorner, ContourCorner],
  edge: number,
  level: number,
) {
  const [topLeft, topRight, bottomRight, bottomLeft] = corners;

  switch (edge) {
    case 0:
      return interpolateContourPoint(topLeft, topRight, level);
    case 1:
      return interpolateContourPoint(topRight, bottomRight, level);
    case 2:
      return interpolateContourPoint(bottomRight, bottomLeft, level);
    case 3:
      return interpolateContourPoint(bottomLeft, topLeft, level);
    default:
      return { x: topLeft.x, y: topLeft.y };
  }
}

function drawArrow(options: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth?: number;
  dashed?: boolean;
  opacity?: number;
}) {
  const { x1, y1, x2, y2, stroke, strokeWidth = 3, dashed, opacity = 1 } = options;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);

  if (length <= 0.01) {
    return null;
  }

  const ux = dx / length;
  const uy = dy / length;
  const head = Math.min(10, Math.max(6, length * 0.28));
  const leftX = x2 - ux * head - uy * head * 0.55;
  const leftY = y2 - uy * head + ux * head * 0.55;
  const rightX = x2 - ux * head + uy * head * 0.55;
  const rightY = y2 - uy * head - ux * head * 0.55;

  return (
    <g opacity={opacity}>
      <line
        x1={x1}
        x2={x2}
        y1={y1}
        y2={y2}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={dashed ? "8 6" : undefined}
      />
      <polygon points={`${x2},${y2} ${leftX},${leftY} ${rightX},${rightY}`} fill={stroke} />
    </g>
  );
}

function renderPotentialMap(source: SimulationParams, overlayOpacity: number) {
  const cellWidth = STAGE_WIDTH / POTENTIAL_MAP_COLUMNS;
  const cellHeight = STAGE_HEIGHT / POTENTIAL_MAP_ROWS;
  const items = [];

  for (let row = 0; row < POTENTIAL_MAP_ROWS; row += 1) {
    const y =
      ELECTRIC_POTENTIAL_STAGE_MAX_Y -
      ((row + 0.5) / POTENTIAL_MAP_ROWS) *
        (ELECTRIC_POTENTIAL_STAGE_MAX_Y - ELECTRIC_POTENTIAL_STAGE_MIN_Y);

    for (let column = 0; column < POTENTIAL_MAP_COLUMNS; column += 1) {
      const x =
        ELECTRIC_POTENTIAL_STAGE_MIN_X +
        ((column + 0.5) / POTENTIAL_MAP_COLUMNS) *
          (ELECTRIC_POTENTIAL_STAGE_MAX_X - ELECTRIC_POTENTIAL_STAGE_MIN_X);
      const snapshot = sampleElectricPotentialState(source, { probeX: x, probeY: y });

      items.push(
        <rect
          key={`potential-cell-${row}-${column}`}
          x={PLOT_LEFT + column * cellWidth}
          y={PLOT_TOP + row * cellHeight}
          width={cellWidth + 0.5}
          height={cellHeight + 0.5}
          fill={potentialCellFill(snapshot.potential)}
          opacity={overlayOpacity}
        />,
      );
    }
  }

  return items;
}

function renderEquipotentialContours(source: SimulationParams, overlayOpacity: number) {
  const pointRows = Array.from({ length: CONTOUR_ROWS + 1 }, (_, row) =>
    Array.from({ length: CONTOUR_COLUMNS + 1 }, (_, column) => {
      const x =
        ELECTRIC_POTENTIAL_STAGE_MIN_X +
        (column / CONTOUR_COLUMNS) *
          (ELECTRIC_POTENTIAL_STAGE_MAX_X - ELECTRIC_POTENTIAL_STAGE_MIN_X);
      const y =
        ELECTRIC_POTENTIAL_STAGE_MAX_Y -
        (row / CONTOUR_ROWS) *
          (ELECTRIC_POTENTIAL_STAGE_MAX_Y - ELECTRIC_POTENTIAL_STAGE_MIN_Y);
      const snapshot = sampleElectricPotentialState(source, { probeX: x, probeY: y });

      return {
        x: worldToSvgX(x),
        y: worldToSvgY(y),
        value: snapshot.potential,
      } satisfies ContourCorner;
    }),
  );

  const segments = [];

  for (const level of CONTOUR_LEVELS) {
    for (let row = 0; row < CONTOUR_ROWS; row += 1) {
      for (let column = 0; column < CONTOUR_COLUMNS; column += 1) {
        const topLeft = pointRows[row]?.[column];
        const topRight = pointRows[row]?.[column + 1];
        const bottomRight = pointRows[row + 1]?.[column + 1];
        const bottomLeft = pointRows[row + 1]?.[column];

        if (!topLeft || !topRight || !bottomRight || !bottomLeft) {
          continue;
        }

        const mask =
          Number(topLeft.value >= level) |
          (Number(topRight.value >= level) << 1) |
          (Number(bottomRight.value >= level) << 2) |
          (Number(bottomLeft.value >= level) << 3);

        for (const [startEdge, endEdge] of CONTOUR_CASES[mask] ?? []) {
          const start = resolveContourEdgePoint(
            [topLeft, topRight, bottomRight, bottomLeft],
            startEdge,
            level,
          );
          const end = resolveContourEdgePoint(
            [topLeft, topRight, bottomRight, bottomLeft],
            endEdge,
            level,
          );

          segments.push(
            <line
              key={`contour-${level}-${row}-${column}-${startEdge}-${endEdge}`}
              x1={start.x}
              x2={end.x}
              y1={start.y}
              y2={end.y}
              stroke={contourStroke(level)}
              strokeWidth={Math.abs(level) >= 3 ? 1.9 : 1.35}
              strokeLinecap="round"
              opacity={overlayOpacity}
            />,
          );
        }
      }
    }
  }

  return segments;
}

function buildFrame(source: SimulationParams, previewProbeX?: number) {
  return sampleElectricPotentialState(source, {
    probeX: previewProbeX,
  });
}

function renderSourceMarker(options: {
  x: number;
  y: number;
  charge: number;
  label: string;
  dashed?: boolean;
  muted?: boolean;
}) {
  const colors = chargeColors(options.charge);

  return (
    <g opacity={options.muted ? 0.56 : 1}>
      <circle
        cx={options.x}
        cy={options.y}
        r={SOURCE_MARKER_RADIUS}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth="2.5"
        strokeDasharray={options.dashed ? "7 5" : undefined}
      />
      <text
        x={options.x}
        y={options.y + 4}
        textAnchor="middle"
        className="text-[13px] font-semibold"
        fill={colors.text}
      >
        {options.charge > 0.05 ? "+" : options.charge < -0.05 ? "-" : "0"}
      </text>
      <text
        x={options.x}
        y={options.y - 28}
        textAnchor="middle"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        {options.label}
      </text>
      <text
        x={options.x}
        y={options.y + 34}
        textAnchor="middle"
        className="fill-ink-600 text-[10px] font-semibold"
      >
        {formatSignedCharge(options.charge)}
      </text>
    </g>
  );
}

export function ElectricPotentialSimulation({
  concept,
  params,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: ElectricPotentialSimulationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activePointerId, setActivePointerId] = useState<number | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
  const previewProbeX =
    graphPreview?.kind === "response"
      ? clamp(
          graphPreview.point.x,
          ELECTRIC_POTENTIAL_STAGE_MIN_X,
          ELECTRIC_POTENTIAL_STAGE_MAX_X,
        )
      : undefined;
  const compareEnabled = Boolean(compare);
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const activeFrame = buildFrame(params, previewProbeX);
  const frameA = compare
    ? buildFrame(compare.setupA, previewedSetup === "a" ? previewProbeX : undefined)
    : null;
  const frameB = compare
    ? buildFrame(compare.setupB, previewedSetup === "b" ? previewProbeX : undefined)
    : null;
  const primaryFrame = compare
    ? previewedSetup === "a"
      ? frameA!
      : frameB!
    : activeFrame;
  const secondaryFrame = compare
    ? previewedSetup === "a"
      ? frameB!
      : frameA!
    : null;
  const primaryLabel = compare
    ? previewedSetup === "a"
      ? compare.labelA ?? "Setup A"
      : compare.labelB ?? "Setup B"
    : "Live";
  const secondaryLabel = compare
    ? previewedSetup === "a"
      ? compare.labelB ?? "Setup B"
      : compare.labelA ?? "Setup A"
    : null;
  const canEditPrimary = !compare || !graphPreview || previewedSetup === compare.activeTarget;
  const showPotentialMap = overlayValues?.potentialMap ?? true;
  const showEquipotentialContours = overlayValues?.equipotentialContours ?? true;
  const showFieldArrow = overlayValues?.fieldArrow ?? true;
  const showScanLine = overlayValues?.scanLine ?? true;
  const primaryPotentialSource = {
    sourceChargeA: primaryFrame.sourceChargeA,
    sourceChargeB: primaryFrame.sourceChargeB,
    sourceSeparation: primaryFrame.sourceSeparation,
    probeX: primaryFrame.probeX,
    probeY: primaryFrame.probeY,
    testCharge: primaryFrame.testCharge,
  };

  function updateFromPointer(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg || !dragTarget || !canEditPrimary) {
      return;
    }

    const bounds = svg.getBoundingClientRect();
    const pointer = toSvgCoordinates(clientX, clientY, bounds);
    const world = svgToWorld(pointer.svgX, pointer.svgY);

    if (dragTarget === "probe") {
      setParam("probeX", roundTo(world.x, 2));
      setParam("probeY", roundTo(world.y, 2));
      return;
    }

    const nextSeparation = clamp(
      Math.abs(world.x) * 2,
      ELECTRIC_POTENTIAL_MIN_SEPARATION,
      ELECTRIC_POTENTIAL_MAX_SEPARATION,
    );
    setParam("sourceSeparation", roundTo(nextSeparation, 2));
  }

  function stopDrag(pointerId?: number) {
    const svg = svgRef.current;
    if (svg && pointerId !== undefined && svg.hasPointerCapture(pointerId)) {
      svg.releasePointerCapture(pointerId);
    }

    setActivePointerId(null);
    setDragTarget(null);
  }

  const previewBadge = graphPreview?.kind === "response" ? (
    <span className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral-700">
      preview x = {formatMeasurement(previewProbeX ?? 0, "m")}
    </span>
  ) : null;
  const compareLegend = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
        <span className="h-0 w-5 border-t-2 border-solid border-ink-900" />
        {primaryLabel}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
        <span className="h-0 w-5 border-t-2 border-dashed border-ink-900/70" />
        {secondaryLabel}
      </span>
    </div>
  ) : null;
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? "Setup A")}: {formatSignedValue(frameA!.potential, "V")}
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: {formatSignedValue(frameB!.potential, "V")}
      </span>
    </div>
  ) : null;
  const potentialNote =
    primaryFrame.potentialSign === "positive"
      ? "Positive potential here means a positive test charge would have positive potential energy."
      : primaryFrame.potentialSign === "negative"
        ? "Negative potential here means a positive test charge would have negative potential energy."
        : "The net potential is close to zero because the signed source contributions nearly cancel.";
  const fieldNote =
    primaryFrame.fieldMagnitude <= 0.05
      ? "The field is nearly zero here even though the potential can still be nonzero."
      : "The field arrow points downhill on the potential landscape and cuts across equipotential contours.";
  const energyNote =
    Math.abs(primaryFrame.testCharge) <= 0.02
      ? "Zero test charge gives zero potential energy without changing the potential map."
      : primaryFrame.testCharge < 0
        ? "Negative test charge makes the potential energy change sign even though the potential itself stays fixed."
        : "Positive test charge keeps potential energy aligned with the sign of the potential.";
  const metricRows = [
    { label: "q_A", value: formatSignedCharge(primaryFrame.sourceChargeA) },
    { label: "q_B", value: formatSignedCharge(primaryFrame.sourceChargeB) },
    { label: "q_test", value: formatSignedCharge(primaryFrame.testCharge) },
    { label: "x_p", value: formatMeasurement(primaryFrame.probeX, "m") },
    { label: "y_p", value: formatMeasurement(primaryFrame.probeY, "m") },
    { label: "V_A", value: formatNumber(primaryFrame.sourceA.potential) },
    { label: "V_B", value: formatNumber(primaryFrame.sourceB.potential) },
    { label: "V", value: formatNumber(primaryFrame.potential) },
    { label: "U", value: formatNumber(primaryFrame.potentialEnergy) },
    { label: "|E|", value: formatNumber(primaryFrame.fieldMagnitude) },
  ];
  const primaryProbeX = worldToSvgX(primaryFrame.probeX);
  const primaryProbeY = worldToSvgY(primaryFrame.probeY);
  const secondaryProbeX = secondaryFrame ? worldToSvgX(secondaryFrame.probeX) : null;
  const secondaryProbeY = secondaryFrame ? worldToSvgY(secondaryFrame.probeY) : null;
  const sourceAX = worldToSvgX(primaryFrame.sourceA.x);
  const sourceAY = worldToSvgY(primaryFrame.sourceA.y);
  const sourceBX = worldToSvgX(primaryFrame.sourceB.x);
  const sourceBY = worldToSvgY(primaryFrame.sourceB.y);
  const secondarySourceAX = secondaryFrame ? worldToSvgX(secondaryFrame.sourceA.x) : null;
  const secondarySourceAY = secondaryFrame ? worldToSvgY(secondaryFrame.sourceA.y) : null;
  const secondarySourceBX = secondaryFrame ? worldToSvgX(secondaryFrame.sourceB.x) : null;
  const secondarySourceBY = secondaryFrame ? worldToSvgY(secondaryFrame.sourceB.y) : null;
  const fieldLength = vectorScale(primaryFrame.fieldMagnitude, 38);
  const primaryFieldEndX =
    primaryProbeX +
    (primaryFrame.fieldMagnitude > 0.001
      ? (primaryFrame.fieldX / primaryFrame.fieldMagnitude) * fieldLength
      : 0);
  const primaryFieldEndY =
    primaryProbeY -
    (primaryFrame.fieldMagnitude > 0.001
      ? (primaryFrame.fieldY / primaryFrame.fieldMagnitude) * fieldLength
      : 0);

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(78,166,223,0.12),rgba(30,166,162,0.1))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 text-xs text-ink-700">
              Drag the probe anywhere in the stage or drag either source marker to change the
              shared separation. Warm regions are positive potential, cool regions are negative,
              and the field arrow shows the downhill direction on that same map.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {compareLegend}
            {compareBadges}
            {previewBadge}
          </div>
        </div>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
        style={{ touchAction: "none", userSelect: "none" }}
        onPointerMove={(event) => {
          if (activePointerId !== event.pointerId) {
            return;
          }

          updateFromPointer(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          if (activePointerId === event.pointerId) {
            stopDrag(event.pointerId);
          }
        }}
        onPointerCancel={(event) => {
          if (activePointerId === event.pointerId) {
            stopDrag(event.pointerId);
          }
        }}
        onLostPointerCapture={() => stopDrag()}
      >
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.58)" />
        <rect
          x={PLOT_LEFT}
          y={PLOT_TOP}
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          rx="22"
          fill="rgba(255,253,247,0.88)"
        />
        {showPotentialMap
          ? renderPotentialMap(
              primaryPotentialSource,
              overlayWeight(focusedOverlayId, "potentialMap"),
            )
          : null}
        {[ELECTRIC_POTENTIAL_STAGE_MIN_X, -1.6, 0, 1.6, ELECTRIC_POTENTIAL_STAGE_MAX_X].map(
          (tick) => {
            const x = worldToSvgX(tick);

            return (
              <g key={`grid-x-${tick}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={PLOT_TOP}
                  y2={PLOT_BOTTOM}
                  stroke="rgba(15,28,36,0.08)"
                />
                <text
                  x={x}
                  y={PLOT_BOTTOM + 16}
                  textAnchor="middle"
                  className="fill-ink-500 text-[11px]"
                >
                  {formatNumber(tick)}
                </text>
              </g>
            );
          },
        )}
        {[ELECTRIC_POTENTIAL_STAGE_MIN_Y, -1.2, 0, 1.2, ELECTRIC_POTENTIAL_STAGE_MAX_Y].map(
          (tick) => {
            const y = worldToSvgY(tick);

            return (
              <g key={`grid-y-${tick}`}>
                <line
                  x1={PLOT_LEFT}
                  x2={PLOT_RIGHT}
                  y1={y}
                  y2={y}
                  stroke="rgba(15,28,36,0.08)"
                />
                {Math.abs(tick) > 0.001 ? (
                  <text
                    x={PLOT_LEFT - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-ink-500 text-[11px]"
                  >
                    {formatNumber(tick)}
                  </text>
                ) : null}
              </g>
            );
          },
        )}
        <line
          x1={worldToSvgX(ELECTRIC_POTENTIAL_STAGE_MIN_X)}
          x2={worldToSvgX(ELECTRIC_POTENTIAL_STAGE_MAX_X)}
          y1={ORIGIN_Y}
          y2={ORIGIN_Y}
          stroke="rgba(15,28,36,0.36)"
          strokeWidth="2.4"
        />
        <line
          x1={ORIGIN_X}
          x2={ORIGIN_X}
          y1={PLOT_TOP}
          y2={PLOT_BOTTOM}
          stroke="rgba(15,28,36,0.36)"
          strokeWidth="2.4"
        />
        <text
          x={PLOT_RIGHT - 8}
          y={ORIGIN_Y - 8}
          textAnchor="end"
          className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
        >
          x
        </text>
        <text
          x={ORIGIN_X + 8}
          y={PLOT_TOP + 14}
          className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
        >
          y
        </text>
        {showEquipotentialContours
          ? renderEquipotentialContours(
              primaryPotentialSource,
              overlayWeight(focusedOverlayId, "equipotentialContours"),
            )
          : null}
        {showScanLine ? (
          <g opacity={overlayWeight(focusedOverlayId, "scanLine")}>
            <line
              x1={PLOT_LEFT + 4}
              x2={PLOT_RIGHT - 4}
              y1={primaryProbeY}
              y2={primaryProbeY}
              stroke="rgba(78,166,223,0.7)"
              strokeWidth="2"
              strokeDasharray="8 6"
            />
            <text
              x={PLOT_LEFT + 10}
              y={primaryProbeY - 10}
              className="fill-sky-700 text-[11px] font-semibold"
            >
              graph scan line
            </text>
          </g>
        ) : null}
        {secondaryFrame ? (
          <g opacity="0.56">
            {renderSourceMarker({
              x: secondarySourceAX!,
              y: secondarySourceAY!,
              charge: secondaryFrame.sourceChargeA,
              label: secondaryLabel ?? "Setup B",
              dashed: true,
              muted: true,
            })}
            {renderSourceMarker({
              x: secondarySourceBX!,
              y: secondarySourceBY!,
              charge: secondaryFrame.sourceChargeB,
              label: "",
              dashed: true,
              muted: true,
            })}
            <circle
              cx={secondaryProbeX!}
              cy={secondaryProbeY!}
              r="8"
              fill="rgba(255,255,255,0.85)"
              stroke="rgba(15,28,36,0.52)"
              strokeWidth="2.4"
              strokeDasharray="7 5"
            />
          </g>
        ) : null}
        {renderSourceMarker({
          x: sourceAX,
          y: sourceAY,
          charge: primaryFrame.sourceChargeA,
          label: "Source A",
        })}
        {renderSourceMarker({
          x: sourceBX,
          y: sourceBY,
          charge: primaryFrame.sourceChargeB,
          label: "Source B",
        })}
        {showFieldArrow ? (
          <g opacity={overlayWeight(focusedOverlayId, "fieldArrow")}>
            {drawArrow({
              x1: primaryProbeX,
              y1: primaryProbeY,
              x2: primaryFieldEndX,
              y2: primaryFieldEndY,
              stroke: "#1ea6a2",
              strokeWidth: 3.1,
            })}
            <text
              x={primaryFieldEndX + 8}
              y={primaryFieldEndY - 6}
              className="fill-teal-700 text-[11px] font-semibold"
            >
              E downhill
            </text>
          </g>
        ) : null}
        <circle
          cx={primaryProbeX}
          cy={primaryProbeY}
          r="9"
          fill="rgba(255,255,255,0.96)"
          stroke="#0f1c24"
          strokeWidth="2.6"
        />
        <text
          x={primaryProbeX}
          y={primaryProbeY + 4}
          textAnchor="middle"
          className="fill-ink-950 text-[10px] font-semibold"
        >
          {primaryFrame.testCharge > 0.05 ? "+" : primaryFrame.testCharge < -0.05 ? "-" : "0"}
        </text>
        <text
          x={primaryProbeX + 12}
          y={primaryProbeY - 12}
          className="fill-ink-700 text-[11px] font-semibold"
        >
          {formatSignedValue(primaryFrame.potential, "V")}
        </text>
        {canEditPrimary ? (
          <>
            <g
              tabIndex={0}
              role="button"
              aria-label={`Move probe, current x ${formatNumber(primaryFrame.probeX)} y ${formatNumber(primaryFrame.probeY)}`}
              style={{ cursor: activePointerId === null ? "grab" : "grabbing" }}
              onPointerDown={(event) => {
                if (!canEditPrimary) {
                  return;
                }

                svgRef.current?.setPointerCapture(event.pointerId);
                setActivePointerId(event.pointerId);
                setDragTarget("probe");
                updateFromPointer(event.clientX, event.clientY);
              }}
            >
              <circle cx={primaryProbeX} cy={primaryProbeY} r="22" fill="transparent" />
            </g>
            <g
              tabIndex={0}
              role="button"
              aria-label={`Adjust source separation from source A, current ${formatNumber(primaryFrame.sourceSeparation)} meters`}
              style={{ cursor: activePointerId === null ? "ew-resize" : "grabbing" }}
              onPointerDown={(event) => {
                svgRef.current?.setPointerCapture(event.pointerId);
                setActivePointerId(event.pointerId);
                setDragTarget("sourceA");
                updateFromPointer(event.clientX, event.clientY);
              }}
            >
              <circle cx={sourceAX} cy={sourceAY} r="24" fill="transparent" />
            </g>
            <g
              tabIndex={0}
              role="button"
              aria-label={`Adjust source separation from source B, current ${formatNumber(primaryFrame.sourceSeparation)} meters`}
              style={{ cursor: activePointerId === null ? "ew-resize" : "grabbing" }}
              onPointerDown={(event) => {
                svgRef.current?.setPointerCapture(event.pointerId);
                setActivePointerId(event.pointerId);
                setDragTarget("sourceB");
                updateFromPointer(event.clientX, event.clientY);
              }}
            >
              <circle cx={sourceBX} cy={sourceBY} r="24" fill="transparent" />
            </g>
          </>
        ) : null}
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel} probe state` : "Probe state"}
          rows={metricRows}
          noteLines={[
            `Field direction: ${directionLabel(primaryFrame.fieldX, primaryFrame.fieldY)}`,
            potentialNote,
            fieldNote,
            energyNote,
          ]}
        />
      </svg>
    </section>
  );
}
