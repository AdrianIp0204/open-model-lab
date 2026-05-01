"use client";

import {
  SERIES_PARALLEL_CIRCUITS_MAX_RESISTANCE,
  SERIES_PARALLEL_CIRCUITS_MIN_RESISTANCE,
  formatMeasurement,
  formatNumber,
  sampleSeriesParallelCircuitsState,
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

type SeriesParallelCircuitsSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type Point = {
  x: number;
  y: number;
};

const WIDTH = 880;
const HEIGHT = 408;
const STAGE_LEFT = 32;
const STAGE_TOP = 28;
const STAGE_RIGHT = 620;
const STAGE_BOTTOM = HEIGHT - 28;
const CARD_WIDTH = 232;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;

const BATTERY_X = 100;
const TOP_WIRE_Y = 108;
const BOTTOM_WIRE_Y = 292;
const SERIES_RIGHT_X = 520;
const PARALLEL_LEFT_RAIL_X = 240;
const PARALLEL_RIGHT_RAIL_X = 506;
const LOAD_RADIUS = 28;
const SERIES_LOAD_A_X = 286;
const SERIES_LOAD_B_X = 418;
const PARALLEL_LOAD_X = 372;
const PARALLEL_BRANCH_A_Y = 160;
const PARALLEL_BRANCH_B_Y = 236;

const SERIES_PATH: Point[] = [
  { x: BATTERY_X, y: TOP_WIRE_Y },
  { x: SERIES_LOAD_A_X - LOAD_RADIUS, y: TOP_WIRE_Y },
  { x: SERIES_LOAD_A_X + LOAD_RADIUS, y: TOP_WIRE_Y },
  { x: SERIES_LOAD_B_X - LOAD_RADIUS, y: TOP_WIRE_Y },
  { x: SERIES_LOAD_B_X + LOAD_RADIUS, y: TOP_WIRE_Y },
  { x: SERIES_RIGHT_X, y: TOP_WIRE_Y },
  { x: SERIES_RIGHT_X, y: BOTTOM_WIRE_Y },
  { x: BATTERY_X, y: BOTTOM_WIRE_Y },
  { x: BATTERY_X, y: TOP_WIRE_Y },
];

const PARALLEL_PATH_A: Point[] = [
  { x: BATTERY_X, y: TOP_WIRE_Y },
  { x: PARALLEL_LEFT_RAIL_X, y: TOP_WIRE_Y },
  { x: PARALLEL_LEFT_RAIL_X, y: PARALLEL_BRANCH_A_Y },
  { x: PARALLEL_LOAD_X - LOAD_RADIUS, y: PARALLEL_BRANCH_A_Y },
  { x: PARALLEL_LOAD_X + LOAD_RADIUS, y: PARALLEL_BRANCH_A_Y },
  { x: PARALLEL_RIGHT_RAIL_X, y: PARALLEL_BRANCH_A_Y },
  { x: PARALLEL_RIGHT_RAIL_X, y: BOTTOM_WIRE_Y },
  { x: BATTERY_X, y: BOTTOM_WIRE_Y },
  { x: BATTERY_X, y: TOP_WIRE_Y },
];

const PARALLEL_PATH_B: Point[] = [
  { x: BATTERY_X, y: TOP_WIRE_Y },
  { x: PARALLEL_LEFT_RAIL_X, y: TOP_WIRE_Y },
  { x: PARALLEL_LEFT_RAIL_X, y: PARALLEL_BRANCH_B_Y },
  { x: PARALLEL_LOAD_X - LOAD_RADIUS, y: PARALLEL_BRANCH_B_Y },
  { x: PARALLEL_LOAD_X + LOAD_RADIUS, y: PARALLEL_BRANCH_B_Y },
  { x: PARALLEL_RIGHT_RAIL_X, y: PARALLEL_BRANCH_B_Y },
  { x: PARALLEL_RIGHT_RAIL_X, y: BOTTOM_WIRE_Y },
  { x: BATTERY_X, y: BOTTOM_WIRE_Y },
  { x: BATTERY_X, y: TOP_WIRE_Y },
];

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.34;
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function glowOpacity(powerRatio: number, dashed = false) {
  const base = 0.12 + powerRatio * 0.52;
  return dashed ? Math.min(base, 0.18) : clampValue(base, 0.12, 0.64);
}

function drawChip(options: {
  x: number;
  y: number;
  text: string;
  tone?: "amber" | "sky" | "teal" | "coral" | "ink";
  dashed?: boolean;
}) {
  const { x, y, text, tone = "ink", dashed } = options;
  const toneMap: Record<string, { fill: string; stroke: string; text: string }> = {
    amber: {
      fill: "rgba(240,171,60,0.16)",
      stroke: "rgba(184,112,0,0.36)",
      text: "#8e5800",
    },
    sky: {
      fill: "rgba(78,166,223,0.14)",
      stroke: "rgba(29,111,159,0.32)",
      text: "#1d6f9f",
    },
    teal: {
      fill: "rgba(30,166,162,0.14)",
      stroke: "rgba(21,122,118,0.34)",
      text: "#157a76",
    },
    coral: {
      fill: "rgba(241,102,89,0.14)",
      stroke: "rgba(177,66,52,0.3)",
      text: "#9f3a2c",
    },
    ink: {
      fill: "rgba(255,255,255,0.9)",
      stroke: "rgba(15,28,36,0.16)",
      text: "#0f1c24",
    },
  };
  const palette = toneMap[tone];
  const width = Math.max(72, text.length * 6.7 + 20);

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        x={-width / 2}
        y={-12}
        width={width}
        height="24"
        rx="12"
        fill={palette.fill}
        stroke={palette.stroke}
        strokeDasharray={dashed ? "6 4" : undefined}
      />
      <text
        x="0"
        y="4"
        textAnchor="middle"
        className="text-[10px] font-semibold"
        fill={palette.text}
      >
        {text}
      </text>
    </g>
  );
}

function drawArrow(options: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth?: number;
  opacity?: number;
  dashed?: boolean;
}) {
  const { x1, y1, x2, y2, stroke, strokeWidth = 3, opacity = 1, dashed } = options;
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
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <polygon points={`${x2},${y2} ${leftX},${leftY} ${rightX},${rightY}`} fill={stroke} />
    </g>
  );
}

function renderBattery(yTop: number, yBottom: number, muted = false, dashed = false) {
  const midY = (yTop + yBottom) / 2;
  const positivePlateY = midY - 22;
  const negativePlateY = midY + 22;
  const stroke = muted ? "rgba(15,28,36,0.46)" : "#0f1c24";

  return (
    <g opacity={muted ? 0.62 : 1}>
      <line
        x1={BATTERY_X}
        x2={BATTERY_X}
        y1={yTop}
        y2={positivePlateY - 12}
        stroke={stroke}
        strokeWidth="3"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={BATTERY_X}
        x2={BATTERY_X}
        y1={negativePlateY + 12}
        y2={yBottom}
        stroke={stroke}
        strokeWidth="3"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={BATTERY_X - 12}
        x2={BATTERY_X + 12}
        y1={positivePlateY}
        y2={positivePlateY}
        stroke={stroke}
        strokeWidth="4"
      />
      <line
        x1={BATTERY_X - 7}
        x2={BATTERY_X + 7}
        y1={negativePlateY}
        y2={negativePlateY}
        stroke={stroke}
        strokeWidth="4"
      />
      <text
        x={BATTERY_X - 18}
        y={positivePlateY + 4}
        textAnchor="end"
        className="fill-ink-500 text-[10px] font-semibold"
      >
        +
      </text>
      <text
        x={BATTERY_X - 18}
        y={negativePlateY + 4}
        textAnchor="end"
        className="fill-ink-500 text-[10px] font-semibold"
      >
        -
      </text>
    </g>
  );
}

function renderLoad(options: {
  centerX: number;
  centerY: number;
  label: string;
  resistance: number;
  powerRatio: number;
  tone: "a" | "b";
  muted?: boolean;
  dashed?: boolean;
  glowOn?: boolean;
}) {
  const {
    centerX,
    centerY,
    label,
    resistance,
    powerRatio,
    tone,
    muted = false,
    dashed = false,
    glowOn = true,
  } = options;
  const haloOpacity = glowOpacity(powerRatio, dashed);
  const stroke = tone === "a" ? "#b87000" : "#1d6f9f";
  const innerStroke = tone === "a" ? "#8e5800" : "#155c84";

  return (
    <g opacity={muted ? 0.62 : 1}>
      {glowOn ? (
        <>
          <ellipse
            cx={centerX}
            cy={centerY}
            rx={44}
            ry={36}
            fill={
              tone === "a"
                ? `rgba(240,171,60,${haloOpacity.toFixed(3)})`
                : `rgba(78,166,223,${haloOpacity.toFixed(3)})`
            }
          />
          <ellipse
            cx={centerX}
            cy={centerY}
            rx={30}
            ry={22}
            fill={`rgba(255,255,255,${(0.48 + powerRatio * 0.18).toFixed(3)})`}
          />
        </>
      ) : null}
      <circle
        cx={centerX}
        cy={centerY}
        r={LOAD_RADIUS}
        fill={muted ? "rgba(255,253,247,0.78)" : "rgba(255,253,247,0.92)"}
        stroke={stroke}
        strokeWidth="2.4"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <path
        d={`M ${centerX - 16} ${centerY + 2}
            C ${centerX - 12} ${centerY - 12}, ${centerX - 4} ${centerY - 12}, ${centerX} ${centerY + 2}
            C ${centerX + 4} ${centerY + 14}, ${centerX + 12} ${centerY + 14}, ${centerX + 16} ${centerY + 2}`}
        fill="none"
        stroke={innerStroke}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <rect
        x={centerX - 8}
        y={centerY + LOAD_RADIUS - 2}
        width="16"
        height="10"
        rx="3"
        fill={muted ? "rgba(15,28,36,0.2)" : "rgba(15,28,36,0.28)"}
      />
      <text
        x={centerX}
        y={centerY - 42}
        textAnchor="middle"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        {label}
      </text>
      <text
        x={centerX}
        y={centerY + 56}
        textAnchor="middle"
        className="fill-ink-950 text-[12px] font-semibold"
      >
        {formatMeasurement(resistance, "ohm")}
      </text>
    </g>
  );
}

function currentStrokeWidth(current: number, maxCurrent: number) {
  const ratio = maxCurrent > 0 ? current / maxCurrent : 0;
  return 1.8 + ratio * 4.2;
}

function buildPreviewSource(
  source: SimulationParams,
  preview: GraphStagePreview | null | undefined,
) {
  if (!preview || preview.kind !== "response") {
    return source;
  }

  if (
    preview.graphId === "branch-current" ||
    preview.graphId === "branch-voltage" ||
    preview.graphId === "load-power"
  ) {
    return {
      ...source,
      resistanceB: clampValue(
        preview.point.x,
        SERIES_PARALLEL_CIRCUITS_MIN_RESISTANCE,
        SERIES_PARALLEL_CIRCUITS_MAX_RESISTANCE,
      ),
    };
  }

  return source;
}

function buildFrame(
  source: SimulationParams,
  time: number,
  graphPreview?: GraphStagePreview | null,
) {
  return sampleSeriesParallelCircuitsState(buildPreviewSource(source, graphPreview), time);
}

function getPathLength(points: Point[]) {
  let length = 0;

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    length += Math.hypot(end.x - start.x, end.y - start.y);
  }

  return length;
}

function pointOnPath(points: Point[], distance: number) {
  const totalLength = getPathLength(points);
  const wrapped = ((distance % totalLength) + totalLength) % totalLength;
  let travelled = 0;

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);

    if (travelled + segmentLength >= wrapped) {
      const ratio = segmentLength > 0 ? (wrapped - travelled) / segmentLength : 0;
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      };
    }

    travelled += segmentLength;
  }

  return points[points.length - 1] ?? { x: 0, y: 0 };
}

function renderPacketLoop(options: {
  points: Point[];
  current: number;
  time: number;
  color: string;
  muted?: boolean;
}) {
  const { points, current, time, color, muted = false } = options;
  const totalLength = getPathLength(points);
  const packetCount = Math.max(3, Math.round(3 + current * 1.4));
  const speed = 62 + current * 40;

  return (
    <g opacity={muted ? 0.3 : 0.78}>
      {Array.from({ length: packetCount }, (_, index) => {
        const distance = time * speed + (totalLength / packetCount) * index;
        const point = pointOnPath(points, distance);

        return (
          <circle
            key={`${color}-${index}`}
            cx={point.x}
            cy={point.y}
            r={muted ? 2.8 : 3.6}
            fill={color}
          />
        );
      })}
    </g>
  );
}

function drawSeriesSkeleton(options: {
  frame: ReturnType<typeof sampleSeriesParallelCircuitsState>;
  muted?: boolean;
  dashed?: boolean;
  glowOn?: boolean;
}) {
  const { frame, muted = false, dashed = false, glowOn = true } = options;
  const stroke = muted ? "rgba(15,28,36,0.48)" : "#0f1c24";

  return (
    <g opacity={muted ? 0.58 : 1}>
      <line
        x1={BATTERY_X}
        x2={SERIES_LOAD_A_X - LOAD_RADIUS}
        y1={TOP_WIRE_Y}
        y2={TOP_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={SERIES_LOAD_A_X + LOAD_RADIUS}
        x2={SERIES_LOAD_B_X - LOAD_RADIUS}
        y1={TOP_WIRE_Y}
        y2={TOP_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={SERIES_LOAD_B_X + LOAD_RADIUS}
        x2={SERIES_RIGHT_X}
        y1={TOP_WIRE_Y}
        y2={TOP_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={SERIES_RIGHT_X}
        x2={SERIES_RIGHT_X}
        y1={TOP_WIRE_Y}
        y2={BOTTOM_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={SERIES_RIGHT_X}
        x2={BATTERY_X}
        y1={BOTTOM_WIRE_Y}
        y2={BOTTOM_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      {renderBattery(TOP_WIRE_Y, BOTTOM_WIRE_Y, muted, dashed)}
      {renderLoad({
        centerX: SERIES_LOAD_A_X,
        centerY: TOP_WIRE_Y,
        label: "Load A",
        resistance: frame.resistanceA,
        powerRatio: frame.branchA.powerRatio,
        tone: "a",
        muted,
        dashed,
        glowOn,
      })}
      {renderLoad({
        centerX: SERIES_LOAD_B_X,
        centerY: TOP_WIRE_Y,
        label: "Load B",
        resistance: frame.resistanceB,
        powerRatio: frame.branchB.powerRatio,
        tone: "b",
        muted,
        dashed,
        glowOn,
      })}
    </g>
  );
}

function drawParallelSkeleton(options: {
  frame: ReturnType<typeof sampleSeriesParallelCircuitsState>;
  muted?: boolean;
  dashed?: boolean;
  glowOn?: boolean;
}) {
  const { frame, muted = false, dashed = false, glowOn = true } = options;
  const stroke = muted ? "rgba(15,28,36,0.48)" : "#0f1c24";

  return (
    <g opacity={muted ? 0.58 : 1}>
      <line
        x1={BATTERY_X}
        x2={PARALLEL_LEFT_RAIL_X}
        y1={TOP_WIRE_Y}
        y2={TOP_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={PARALLEL_LEFT_RAIL_X}
        x2={PARALLEL_RIGHT_RAIL_X}
        y1={TOP_WIRE_Y}
        y2={TOP_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={PARALLEL_LEFT_RAIL_X}
        x2={PARALLEL_LEFT_RAIL_X}
        y1={TOP_WIRE_Y}
        y2={BOTTOM_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={PARALLEL_RIGHT_RAIL_X}
        x2={PARALLEL_RIGHT_RAIL_X}
        y1={TOP_WIRE_Y}
        y2={BOTTOM_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={PARALLEL_RIGHT_RAIL_X}
        x2={BATTERY_X}
        y1={BOTTOM_WIRE_Y}
        y2={BOTTOM_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={PARALLEL_LEFT_RAIL_X}
        x2={PARALLEL_LOAD_X - LOAD_RADIUS}
        y1={PARALLEL_BRANCH_A_Y}
        y2={PARALLEL_BRANCH_A_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={PARALLEL_LOAD_X + LOAD_RADIUS}
        x2={PARALLEL_RIGHT_RAIL_X}
        y1={PARALLEL_BRANCH_A_Y}
        y2={PARALLEL_BRANCH_A_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={PARALLEL_LEFT_RAIL_X}
        x2={PARALLEL_LOAD_X - LOAD_RADIUS}
        y1={PARALLEL_BRANCH_B_Y}
        y2={PARALLEL_BRANCH_B_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={PARALLEL_LOAD_X + LOAD_RADIUS}
        x2={PARALLEL_RIGHT_RAIL_X}
        y1={PARALLEL_BRANCH_B_Y}
        y2={PARALLEL_BRANCH_B_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      {renderBattery(TOP_WIRE_Y, BOTTOM_WIRE_Y, muted, dashed)}
      {renderLoad({
        centerX: PARALLEL_LOAD_X,
        centerY: PARALLEL_BRANCH_A_Y,
        label: "Load A",
        resistance: frame.resistanceA,
        powerRatio: frame.branchA.powerRatio,
        tone: "a",
        muted,
        dashed,
        glowOn,
      })}
      {renderLoad({
        centerX: PARALLEL_LOAD_X,
        centerY: PARALLEL_BRANCH_B_Y,
        label: "Load B",
        resistance: frame.resistanceB,
        powerRatio: frame.branchB.powerRatio,
        tone: "b",
        muted,
        dashed,
        glowOn,
      })}
    </g>
  );
}

function renderPackets(
  frame: ReturnType<typeof sampleSeriesParallelCircuitsState>,
  displayTime: number,
  muted = false,
) {
  if (frame.topology === "series") {
    return renderPacketLoop({
      points: SERIES_PATH,
      current: frame.totalCurrent,
      time: displayTime,
      color: muted ? "rgba(30,166,162,0.32)" : "rgba(30,166,162,0.78)",
      muted,
    });
  }

  return (
    <>
      {renderPacketLoop({
        points: PARALLEL_PATH_A,
        current: frame.branchA.current,
        time: displayTime,
        color: muted ? "rgba(240,171,60,0.28)" : "rgba(240,171,60,0.76)",
        muted,
      })}
      {renderPacketLoop({
        points: PARALLEL_PATH_B,
        current: frame.branchB.current,
        time: displayTime,
        color: muted ? "rgba(78,166,223,0.28)" : "rgba(78,166,223,0.76)",
        muted,
      })}
    </>
  );
}

function renderPrimaryOverlays(
  frame: ReturnType<typeof sampleSeriesParallelCircuitsState>,
  focusedOverlayId: string | null | undefined,
  overlayValues: Record<string, boolean>,
  maxCurrent: number,
) {
  const showCurrentFlow = overlayValues.currentFlow ?? true;
  const showVoltageLabels = overlayValues.voltageLabels ?? true;
  const showNodeGuide = overlayValues.nodeGuide ?? false;
  const showBrightnessGuide = overlayValues.brightnessGuide ?? true;

  return (
    <>
      {showCurrentFlow ? (
        <g opacity={overlayWeight(focusedOverlayId, "currentFlow")}>
          {frame.topology === "series" ? (
            <>
              {drawArrow({
                x1: BATTERY_X + 18,
                y1: TOP_WIRE_Y - 32,
                x2: SERIES_RIGHT_X - 18,
                y2: TOP_WIRE_Y - 32,
                stroke: "#1ea6a2",
                strokeWidth: currentStrokeWidth(frame.totalCurrent, maxCurrent),
              })}
              {drawChip({
                x: 310,
                y: TOP_WIRE_Y - 56,
                text: `I = ${formatMeasurement(frame.totalCurrent, "A")}`,
                tone: "teal",
              })}
              {drawChip({
                x: SERIES_LOAD_A_X,
                y: BOTTOM_WIRE_Y - 34,
                text: `Q_A = ${formatMeasurement(frame.branchA.charge, "C")}`,
                tone: "amber",
              })}
              {drawChip({
                x: SERIES_LOAD_B_X,
                y: BOTTOM_WIRE_Y - 34,
                text: `Q_B = ${formatMeasurement(frame.branchB.charge, "C")}`,
                tone: "sky",
              })}
            </>
          ) : (
            <>
              {drawArrow({
                x1: BATTERY_X + 18,
                y1: TOP_WIRE_Y - 28,
                x2: PARALLEL_RIGHT_RAIL_X - 14,
                y2: TOP_WIRE_Y - 28,
                stroke: "#1ea6a2",
                strokeWidth: currentStrokeWidth(frame.totalCurrent, maxCurrent),
              })}
              {drawArrow({
                x1: PARALLEL_LEFT_RAIL_X + 10,
                y1: PARALLEL_BRANCH_A_Y - 34,
                x2: PARALLEL_RIGHT_RAIL_X - 10,
                y2: PARALLEL_BRANCH_A_Y - 34,
                stroke: "#b87000",
                strokeWidth: currentStrokeWidth(frame.branchA.current, maxCurrent),
              })}
              {drawArrow({
                x1: PARALLEL_LEFT_RAIL_X + 10,
                y1: PARALLEL_BRANCH_B_Y + 34,
                x2: PARALLEL_RIGHT_RAIL_X - 10,
                y2: PARALLEL_BRANCH_B_Y + 34,
                stroke: "#1d6f9f",
                strokeWidth: currentStrokeWidth(frame.branchB.current, maxCurrent),
              })}
              {drawChip({
                x: 300,
                y: TOP_WIRE_Y - 52,
                text: `I_total = ${formatMeasurement(frame.totalCurrent, "A")}`,
                tone: "teal",
              })}
              {drawChip({
                x: PARALLEL_RIGHT_RAIL_X + 76,
                y: PARALLEL_BRANCH_A_Y,
                text: `I_A = ${formatMeasurement(frame.branchA.current, "A")}`,
                tone: "amber",
              })}
              {drawChip({
                x: PARALLEL_RIGHT_RAIL_X + 76,
                y: PARALLEL_BRANCH_B_Y,
                text: `I_B = ${formatMeasurement(frame.branchB.current, "A")}`,
                tone: "sky",
              })}
              {drawChip({
                x: PARALLEL_LOAD_X - 126,
                y: BOTTOM_WIRE_Y - 34,
                text: `Q_A = ${formatMeasurement(frame.branchA.charge, "C")}`,
                tone: "amber",
              })}
              {drawChip({
                x: PARALLEL_LOAD_X + 6,
                y: BOTTOM_WIRE_Y - 34,
                text: `Q_B = ${formatMeasurement(frame.branchB.charge, "C")}`,
                tone: "sky",
              })}
            </>
          )}
        </g>
      ) : null}

      {showVoltageLabels ? (
        <g opacity={overlayWeight(focusedOverlayId, "voltageLabels")}>
          {drawChip({
            x: BATTERY_X + 38,
            y: 188,
            text: `Battery = ${formatMeasurement(frame.voltage, "V")}`,
            tone: "teal",
          })}
          {drawChip({
            x: frame.topology === "series" ? SERIES_LOAD_A_X : PARALLEL_LOAD_X + 114,
            y: frame.topology === "series" ? TOP_WIRE_Y + 56 : PARALLEL_BRANCH_A_Y,
            text: `V_A = ${formatMeasurement(frame.branchA.voltage, "V")}`,
            tone: "amber",
          })}
          {drawChip({
            x: frame.topology === "series" ? SERIES_LOAD_B_X : PARALLEL_LOAD_X + 114,
            y: frame.topology === "series" ? TOP_WIRE_Y + 56 : PARALLEL_BRANCH_B_Y,
            text: `V_B = ${formatMeasurement(frame.branchB.voltage, "V")}`,
            tone: "sky",
          })}
        </g>
      ) : null}

      {showNodeGuide ? (
        <g opacity={overlayWeight(focusedOverlayId, "nodeGuide")}>
          {frame.topology === "series" ? (
            <>
              <circle cx={BATTERY_X} cy={TOP_WIRE_Y} r="6" fill="#1ea6a2" />
              <circle
                cx={(SERIES_LOAD_A_X + SERIES_LOAD_B_X) / 2}
                cy={TOP_WIRE_Y}
                r="6"
                fill="#f0ab3c"
              />
              <circle cx={SERIES_RIGHT_X} cy={BOTTOM_WIRE_Y} r="6" fill="#4ea6df" />
              {drawChip({
                x: BATTERY_X + 56,
                y: TOP_WIRE_Y - 2,
                text: `${formatMeasurement(frame.voltage, "V")} start node`,
                tone: "teal",
              })}
              {drawChip({
                x: (SERIES_LOAD_A_X + SERIES_LOAD_B_X) / 2,
                y: TOP_WIRE_Y + 88,
                text: "same current path",
                tone: "amber",
              })}
              {drawChip({
                x: SERIES_RIGHT_X - 18,
                y: BOTTOM_WIRE_Y + 26,
                text: "0 V return",
                tone: "sky",
              })}
            </>
          ) : (
            <>
              <circle cx={PARALLEL_LEFT_RAIL_X} cy={TOP_WIRE_Y} r="6" fill="#1ea6a2" />
              <circle cx={PARALLEL_RIGHT_RAIL_X} cy={TOP_WIRE_Y} r="6" fill="#1ea6a2" />
              <circle cx={PARALLEL_LEFT_RAIL_X} cy={BOTTOM_WIRE_Y} r="6" fill="#4ea6df" />
              <circle cx={PARALLEL_RIGHT_RAIL_X} cy={BOTTOM_WIRE_Y} r="6" fill="#4ea6df" />
              {drawChip({
                x: PARALLEL_LOAD_X,
                y: TOP_WIRE_Y - 2,
                text: `${formatMeasurement(frame.voltage, "V")} shared top node`,
                tone: "teal",
              })}
              {drawChip({
                x: PARALLEL_LOAD_X,
                y: BOTTOM_WIRE_Y + 26,
                text: "0 V shared return",
                tone: "sky",
              })}
            </>
          )}
        </g>
      ) : null}

      {showBrightnessGuide ? (
        <g opacity={overlayWeight(focusedOverlayId, "brightnessGuide")}>
          {drawChip({
            x: frame.topology === "series" ? SERIES_LOAD_A_X : PARALLEL_LOAD_X - 114,
            y: frame.topology === "series" ? TOP_WIRE_Y - 74 : PARALLEL_BRANCH_A_Y,
            text: `P_A = ${formatMeasurement(frame.branchA.power, "W")}`,
            tone: "coral",
          })}
          {drawChip({
            x: frame.topology === "series" ? SERIES_LOAD_B_X : PARALLEL_LOAD_X - 114,
            y: frame.topology === "series" ? TOP_WIRE_Y - 74 : PARALLEL_BRANCH_B_Y,
            text: `P_B = ${formatMeasurement(frame.branchB.power, "W")}`,
            tone: "coral",
          })}
          {drawChip({
            x: frame.topology === "series" ? 346 : PARALLEL_LOAD_X,
            y: STAGE_BOTTOM - 28,
            text:
              frame.brighterLoad === "balanced"
                ? "Loads look equally bright"
                : frame.brighterLoad === "a"
                  ? "Load A is brighter"
                  : "Load B is brighter",
            tone: "coral",
          })}
        </g>
      ) : null}
    </>
  );
}

export function SeriesParallelCircuitsSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: SeriesParallelCircuitsSimulationProps) {
  const compareEnabled = Boolean(compare);
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const activeFrame = buildFrame(params, time, graphPreview);
  const frameA = compare
    ? buildFrame(compare.setupA, time, previewedSetup === "a" ? graphPreview : null)
    : null;
  const frameB = compare
    ? buildFrame(compare.setupB, time, previewedSetup === "b" ? graphPreview : null)
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
  const previewBadge =
    graphPreview?.kind === "response" ? (
      <span className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral-700">
        preview R_B = {formatMeasurement(graphPreview.point.x, "ohm")}
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
        {(compare?.labelA ?? "Setup A")}: {frameA?.topology}, I_total = {formatMeasurement(frameA?.totalCurrent ?? 0, "A")}
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: {frameB?.topology}, I_total = {formatMeasurement(frameB?.totalCurrent ?? 0, "A")}
      </span>
    </div>
  ) : null;
  const overlayState = {
    currentFlow: overlayValues?.currentFlow ?? true,
    voltageLabels: overlayValues?.voltageLabels ?? true,
    nodeGuide: overlayValues?.nodeGuide ?? false,
    brightnessGuide: overlayValues?.brightnessGuide ?? true,
  };
  const maxCurrent = Math.max(
    primaryFrame.totalCurrent,
    primaryFrame.branchA.current,
    primaryFrame.branchB.current,
    secondaryFrame?.totalCurrent ?? 0,
    secondaryFrame?.branchA.current ?? 0,
    secondaryFrame?.branchB.current ?? 0,
    0.5,
  );
  const topologyNote =
    primaryFrame.topology === "series"
      ? "Series keeps one current everywhere, so the battery voltage has to be shared across the two loads."
      : "Parallel keeps the full battery voltage on both branches, so branch current depends on branch resistance and recombines at the return.";
  const brightnessNote =
    primaryFrame.brighterLoad === "balanced"
      ? "Both loads are dissipating nearly the same power right now."
      : primaryFrame.brighterLoad === "a"
        ? "Load A is brighter because it is dissipating more power right now."
        : "Load B is brighter because it is dissipating more power right now.";
  const chargeNote =
    primaryFrame.topology === "series"
      ? "Charge through A and B grows together because the same loop current crosses both loads."
      : "Charge counters grow at different rates because the branch currents are different even though the branch voltages match.";
  const metricRows = [
    { label: "t", value: formatMeasurement(primaryFrame.time, "s") },
    { label: "mode", value: primaryFrame.topology },
    { label: "R_eq", value: formatMeasurement(primaryFrame.equivalentResistance, "ohm") },
    { label: "I_total", value: formatMeasurement(primaryFrame.totalCurrent, "A") },
    { label: "I_A", value: formatMeasurement(primaryFrame.branchA.current, "A") },
    { label: "I_B", value: formatMeasurement(primaryFrame.branchB.current, "A") },
    { label: "V_A", value: formatMeasurement(primaryFrame.branchA.voltage, "V") },
    { label: "V_B", value: formatMeasurement(primaryFrame.branchB.voltage, "V") },
    { label: "P_A", value: formatMeasurement(primaryFrame.branchA.power, "W") },
    { label: "P_B", value: formatMeasurement(primaryFrame.branchB.power, "W") },
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(30,166,162,0.12),rgba(240,171,60,0.12))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              Keep the same battery and two loads on screen, then switch only the branch
              structure. Current, voltage, brightness, compare mode, and the response
              graphs all stay tied to that one bounded circuit.
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
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
      >
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.58)" />
        <rect
          x={STAGE_LEFT}
          y={STAGE_TOP}
          width={STAGE_RIGHT - STAGE_LEFT}
          height={STAGE_BOTTOM - STAGE_TOP}
          rx="24"
          fill="rgba(255,253,247,0.92)"
        />
        <rect
          x={STAGE_LEFT}
          y={STAGE_TOP}
          width={STAGE_RIGHT - STAGE_LEFT}
          height={STAGE_BOTTOM - STAGE_TOP}
          rx="24"
          fill="none"
          stroke="rgba(15,28,36,0.08)"
        />

        {secondaryFrame ? (
          <g transform="translate(10 10)">
            {secondaryFrame.topology === "series"
              ? drawSeriesSkeleton({
                  frame: secondaryFrame,
                  muted: true,
                  dashed: true,
                  glowOn: false,
                })
              : drawParallelSkeleton({
                  frame: secondaryFrame,
                  muted: true,
                  dashed: true,
                  glowOn: false,
                })}
            {renderPackets(secondaryFrame, time, true)}
            {drawChip({
              x:
                secondaryFrame.topology === "series"
                  ? SERIES_RIGHT_X + 18
                  : PARALLEL_RIGHT_RAIL_X + 18,
              y: 74,
              text: `${secondaryLabel} ghost`,
              tone: "ink",
              dashed: true,
            })}
          </g>
        ) : null}

        {primaryFrame.topology === "series"
          ? drawSeriesSkeleton({ frame: primaryFrame, glowOn: overlayState.brightnessGuide })
          : drawParallelSkeleton({ frame: primaryFrame, glowOn: overlayState.brightnessGuide })}
        {renderPackets(primaryFrame, time)}
        {renderPrimaryOverlays(primaryFrame, focusedOverlayId, overlayState, maxCurrent)}

        <text
          x={STAGE_LEFT + 18}
          y={STAGE_TOP + 24}
          className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
        >
          Active circuit
        </text>
        <text
          x={STAGE_LEFT + 18}
          y={STAGE_TOP + 46}
          className="fill-ink-950 text-[15px] font-semibold"
        >
          {primaryLabel}: {primaryFrame.topology} mode
        </text>
        <text
          x={STAGE_LEFT + 18}
          y={STAGE_BOTTOM - 18}
          className="fill-ink-600 text-[12px]"
        >
          Q_total = {formatNumber(primaryFrame.totalCharge)} C after {formatNumber(primaryFrame.time)} s,
          P_total = {formatNumber(primaryFrame.totalPower)} W
        </text>

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel} circuit state` : "Circuit state"}
          rows={metricRows}
          noteLines={[topologyNote, brightnessNote, chargeNote]}
        />
      </svg>
    </section>
  );
}
