"use client";

import {
  EQUIVALENT_RESISTANCE_MAX_RESISTANCE,
  EQUIVALENT_RESISTANCE_MIN_RESISTANCE,
  formatMeasurement,
  formatNumber,
  sampleEquivalentResistanceState,
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

type EquivalentResistanceSimulationProps = {
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

const WIDTH = 980;
const HEIGHT = 430;
const STAGE_LEFT = 28;
const STAGE_TOP = 24;
const STAGE_RIGHT = 632;
const STAGE_BOTTOM = HEIGHT - 24;
const PANEL_X = 656;
const PANEL_WIDTH = 298;
const REDUCTION_CARD_Y = 24;
const READOUT_Y = 150;

const BATTERY_X = 96;
const TOP_WIRE_Y = 112;
const BOTTOM_WIRE_Y = 302;
const OUTER_RESISTOR_X = 248;
const SERIES_R2_X = 408;
const SERIES_R3_X = 518;
const SERIES_RIGHT_X = 586;
const GROUP_LEFT_X = 358;
const GROUP_RIGHT_X = 576;
const PARALLEL_R2_Y = 168;
const PARALLEL_R3_Y = 240;
const GROUP_RESISTOR_X = 470;
const LOAD_WIDTH = 58;
const LOAD_HEIGHT = 22;

const SERIES_PATH: Point[] = [
  { x: BATTERY_X, y: TOP_WIRE_Y },
  { x: OUTER_RESISTOR_X - LOAD_WIDTH / 2, y: TOP_WIRE_Y },
  { x: OUTER_RESISTOR_X + LOAD_WIDTH / 2, y: TOP_WIRE_Y },
  { x: SERIES_R2_X - LOAD_WIDTH / 2, y: TOP_WIRE_Y },
  { x: SERIES_R2_X + LOAD_WIDTH / 2, y: TOP_WIRE_Y },
  { x: SERIES_R3_X - LOAD_WIDTH / 2, y: TOP_WIRE_Y },
  { x: SERIES_R3_X + LOAD_WIDTH / 2, y: TOP_WIRE_Y },
  { x: SERIES_RIGHT_X, y: TOP_WIRE_Y },
  { x: SERIES_RIGHT_X, y: BOTTOM_WIRE_Y },
  { x: BATTERY_X, y: BOTTOM_WIRE_Y },
  { x: BATTERY_X, y: TOP_WIRE_Y },
];

const PARALLEL_PATH_2: Point[] = [
  { x: BATTERY_X, y: TOP_WIRE_Y },
  { x: OUTER_RESISTOR_X - LOAD_WIDTH / 2, y: TOP_WIRE_Y },
  { x: OUTER_RESISTOR_X + LOAD_WIDTH / 2, y: TOP_WIRE_Y },
  { x: GROUP_LEFT_X, y: TOP_WIRE_Y },
  { x: GROUP_LEFT_X, y: PARALLEL_R2_Y },
  { x: GROUP_RESISTOR_X - LOAD_WIDTH / 2, y: PARALLEL_R2_Y },
  { x: GROUP_RESISTOR_X + LOAD_WIDTH / 2, y: PARALLEL_R2_Y },
  { x: GROUP_RIGHT_X, y: PARALLEL_R2_Y },
  { x: GROUP_RIGHT_X, y: BOTTOM_WIRE_Y },
  { x: BATTERY_X, y: BOTTOM_WIRE_Y },
  { x: BATTERY_X, y: TOP_WIRE_Y },
];

const PARALLEL_PATH_3: Point[] = [
  { x: BATTERY_X, y: TOP_WIRE_Y },
  { x: OUTER_RESISTOR_X - LOAD_WIDTH / 2, y: TOP_WIRE_Y },
  { x: OUTER_RESISTOR_X + LOAD_WIDTH / 2, y: TOP_WIRE_Y },
  { x: GROUP_LEFT_X, y: TOP_WIRE_Y },
  { x: GROUP_LEFT_X, y: PARALLEL_R3_Y },
  { x: GROUP_RESISTOR_X - LOAD_WIDTH / 2, y: PARALLEL_R3_Y },
  { x: GROUP_RESISTOR_X + LOAD_WIDTH / 2, y: PARALLEL_R3_Y },
  { x: GROUP_RIGHT_X, y: PARALLEL_R3_Y },
  { x: GROUP_RIGHT_X, y: BOTTOM_WIRE_Y },
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
  const base = 0.12 + powerRatio * 0.5;
  return dashed ? Math.min(base, 0.18) : clampValue(base, 0.12, 0.62);
}

function drawChip(options: {
  x: number;
  y: number;
  text: string;
  tone?: "teal" | "amber" | "sky" | "coral" | "ink";
  dashed?: boolean;
}) {
  const { x, y, text, tone = "ink", dashed } = options;
  const toneMap: Record<string, { fill: string; stroke: string; text: string }> = {
    teal: {
      fill: "rgba(30,166,162,0.14)",
      stroke: "rgba(21,122,118,0.34)",
      text: "#157a76",
    },
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
    coral: {
      fill: "rgba(241,102,89,0.14)",
      stroke: "rgba(177,66,52,0.32)",
      text: "#9f3a2c",
    },
    ink: {
      fill: "rgba(255,255,255,0.9)",
      stroke: "rgba(15,28,36,0.16)",
      text: "#0f1c24",
    },
  };
  const palette = toneMap[tone];
  const width = Math.max(80, text.length * 6.8 + 20);

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

function renderResistor(options: {
  centerX: number;
  centerY: number;
  label: string;
  resistance: number;
  powerRatio: number;
  tone: "r1" | "r2" | "r3";
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
  const palette =
    tone === "r1"
      ? {
          stroke: "#9f3a2c",
          inner: "#8a3227",
          glow: `rgba(241,102,89,${glowOpacity(powerRatio, dashed).toFixed(3)})`,
        }
      : tone === "r2"
        ? {
            stroke: "#b87000",
            inner: "#8e5800",
            glow: `rgba(240,171,60,${glowOpacity(powerRatio, dashed).toFixed(3)})`,
          }
        : {
            stroke: "#1d6f9f",
            inner: "#155c84",
            glow: `rgba(78,166,223,${glowOpacity(powerRatio, dashed).toFixed(3)})`,
          };

  return (
    <g opacity={muted ? 0.62 : 1}>
      {glowOn ? (
        <rect
          x={centerX - 42}
          y={centerY - 24}
          width="84"
          height="48"
          rx="18"
          fill={palette.glow}
        />
      ) : null}
      <rect
        x={centerX - LOAD_WIDTH / 2}
        y={centerY - LOAD_HEIGHT / 2}
        width={LOAD_WIDTH}
        height={LOAD_HEIGHT}
        rx="10"
        fill={muted ? "rgba(255,253,247,0.78)" : "rgba(255,253,247,0.92)"}
        stroke={palette.stroke}
        strokeWidth="2.4"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <path
        d={`M ${centerX - 22} ${centerY}
            l 6 -8 l 8 16 l 8 -16 l 8 16 l 8 -16 l 6 8`}
        fill="none"
        stroke={palette.inner}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x={centerX}
        y={centerY - 26}
        textAnchor="middle"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        {label}
      </text>
      <text
        x={centerX}
        y={centerY + 34}
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
  return 1.8 + ratio * 4.1;
}

function buildPreviewSource(
  source: SimulationParams,
  preview: GraphStagePreview | null | undefined,
) {
  if (!preview || preview.kind !== "response") {
    return source;
  }

  if (
    preview.graphId === "equivalent-map" ||
    preview.graphId === "current-map" ||
    preview.graphId === "voltage-share"
  ) {
    return {
      ...source,
      resistance3: clampValue(
        preview.point.x,
        EQUIVALENT_RESISTANCE_MIN_RESISTANCE,
        EQUIVALENT_RESISTANCE_MAX_RESISTANCE,
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
  return sampleEquivalentResistanceState(buildPreviewSource(source, graphPreview), time);
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
  const packetCount = Math.max(3, Math.round(3 + current * 1.5));
  const speed = 62 + current * 42;

  return (
    <g opacity={muted ? 0.28 : 0.78}>
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

function drawSeriesGroupSkeleton(options: {
  frame: ReturnType<typeof sampleEquivalentResistanceState>;
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
        x2={OUTER_RESISTOR_X - LOAD_WIDTH / 2}
        y1={TOP_WIRE_Y}
        y2={TOP_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={OUTER_RESISTOR_X + LOAD_WIDTH / 2}
        x2={SERIES_R2_X - LOAD_WIDTH / 2}
        y1={TOP_WIRE_Y}
        y2={TOP_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={SERIES_R2_X + LOAD_WIDTH / 2}
        x2={SERIES_R3_X - LOAD_WIDTH / 2}
        y1={TOP_WIRE_Y}
        y2={TOP_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={SERIES_R3_X + LOAD_WIDTH / 2}
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
      {renderResistor({
        centerX: OUTER_RESISTOR_X,
        centerY: TOP_WIRE_Y,
        label: "R1",
        resistance: frame.resistance1,
        powerRatio: frame.resistor1.powerRatio,
        tone: "r1",
        muted,
        dashed,
        glowOn,
      })}
      {renderResistor({
        centerX: SERIES_R2_X,
        centerY: TOP_WIRE_Y,
        label: "R2",
        resistance: frame.resistance2,
        powerRatio: frame.resistor2.powerRatio,
        tone: "r2",
        muted,
        dashed,
        glowOn,
      })}
      {renderResistor({
        centerX: SERIES_R3_X,
        centerY: TOP_WIRE_Y,
        label: "R3",
        resistance: frame.resistance3,
        powerRatio: frame.resistor3.powerRatio,
        tone: "r3",
        muted,
        dashed,
        glowOn,
      })}
    </g>
  );
}

function drawParallelGroupSkeleton(options: {
  frame: ReturnType<typeof sampleEquivalentResistanceState>;
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
        x2={OUTER_RESISTOR_X - LOAD_WIDTH / 2}
        y1={TOP_WIRE_Y}
        y2={TOP_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={OUTER_RESISTOR_X + LOAD_WIDTH / 2}
        x2={GROUP_LEFT_X}
        y1={TOP_WIRE_Y}
        y2={TOP_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={GROUP_LEFT_X}
        x2={GROUP_RIGHT_X}
        y1={TOP_WIRE_Y}
        y2={TOP_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={GROUP_LEFT_X}
        x2={GROUP_LEFT_X}
        y1={TOP_WIRE_Y}
        y2={BOTTOM_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={GROUP_RIGHT_X}
        x2={GROUP_RIGHT_X}
        y1={TOP_WIRE_Y}
        y2={BOTTOM_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={GROUP_RIGHT_X}
        x2={BATTERY_X}
        y1={BOTTOM_WIRE_Y}
        y2={BOTTOM_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={GROUP_LEFT_X}
        x2={GROUP_RESISTOR_X - LOAD_WIDTH / 2}
        y1={PARALLEL_R2_Y}
        y2={PARALLEL_R2_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={GROUP_RESISTOR_X + LOAD_WIDTH / 2}
        x2={GROUP_RIGHT_X}
        y1={PARALLEL_R2_Y}
        y2={PARALLEL_R2_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={GROUP_LEFT_X}
        x2={GROUP_RESISTOR_X - LOAD_WIDTH / 2}
        y1={PARALLEL_R3_Y}
        y2={PARALLEL_R3_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={GROUP_RESISTOR_X + LOAD_WIDTH / 2}
        x2={GROUP_RIGHT_X}
        y1={PARALLEL_R3_Y}
        y2={PARALLEL_R3_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      {renderBattery(TOP_WIRE_Y, BOTTOM_WIRE_Y, muted, dashed)}
      {renderResistor({
        centerX: OUTER_RESISTOR_X,
        centerY: TOP_WIRE_Y,
        label: "R1",
        resistance: frame.resistance1,
        powerRatio: frame.resistor1.powerRatio,
        tone: "r1",
        muted,
        dashed,
        glowOn,
      })}
      {renderResistor({
        centerX: GROUP_RESISTOR_X,
        centerY: PARALLEL_R2_Y,
        label: "R2",
        resistance: frame.resistance2,
        powerRatio: frame.resistor2.powerRatio,
        tone: "r2",
        muted,
        dashed,
        glowOn,
      })}
      {renderResistor({
        centerX: GROUP_RESISTOR_X,
        centerY: PARALLEL_R3_Y,
        label: "R3",
        resistance: frame.resistance3,
        powerRatio: frame.resistor3.powerRatio,
        tone: "r3",
        muted,
        dashed,
        glowOn,
      })}
    </g>
  );
}

function renderPackets(
  frame: ReturnType<typeof sampleEquivalentResistanceState>,
  displayTime: number,
  muted = false,
) {
  if (frame.groupMode === "series") {
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
        points: PARALLEL_PATH_2,
        current: frame.resistor2.current,
        time: displayTime,
        color: muted ? "rgba(240,171,60,0.28)" : "rgba(240,171,60,0.76)",
        muted,
      })}
      {renderPacketLoop({
        points: PARALLEL_PATH_3,
        current: frame.resistor3.current,
        time: displayTime,
        color: muted ? "rgba(78,166,223,0.28)" : "rgba(78,166,223,0.76)",
        muted,
      })}
    </>
  );
}

function pointsToPolyline(points: Point[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function renderPrimaryOverlays(
  frame: ReturnType<typeof sampleEquivalentResistanceState>,
  focusedOverlayId: string | null | undefined,
  overlayValues: Record<string, boolean>,
  maxCurrent: number,
) {
  const showCurrentFlow = overlayValues.currentFlow ?? true;
  const showVoltageLabels = overlayValues.voltageLabels ?? true;
  const showReductionGuide = overlayValues.reductionGuide ?? true;
  const showNodeGuide = overlayValues.nodeGuide ?? false;
  const showLoopGuide = overlayValues.loopGuide ?? false;

  return (
    <>
      {showCurrentFlow ? (
        <g opacity={overlayWeight(focusedOverlayId, "currentFlow")}>
          {frame.groupMode === "series" ? (
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
                x: 346,
                y: TOP_WIRE_Y - 56,
                text: `I_total = ${formatMeasurement(frame.totalCurrent, "A")}`,
                tone: "teal",
              })}
              {drawChip({
                x: SERIES_R2_X,
                y: BOTTOM_WIRE_Y - 34,
                text: `Q_2 = ${formatMeasurement(frame.resistor2.charge, "C")}`,
                tone: "amber",
              })}
              {drawChip({
                x: SERIES_R3_X,
                y: BOTTOM_WIRE_Y - 34,
                text: `Q_3 = ${formatMeasurement(frame.resistor3.charge, "C")}`,
                tone: "sky",
              })}
            </>
          ) : (
            <>
              {drawArrow({
                x1: BATTERY_X + 18,
                y1: TOP_WIRE_Y - 28,
                x2: GROUP_RIGHT_X - 12,
                y2: TOP_WIRE_Y - 28,
                stroke: "#1ea6a2",
                strokeWidth: currentStrokeWidth(frame.totalCurrent, maxCurrent),
              })}
              {drawArrow({
                x1: GROUP_LEFT_X + 10,
                y1: PARALLEL_R2_Y - 32,
                x2: GROUP_RIGHT_X - 10,
                y2: PARALLEL_R2_Y - 32,
                stroke: "#b87000",
                strokeWidth: currentStrokeWidth(frame.resistor2.current, maxCurrent),
              })}
              {drawArrow({
                x1: GROUP_LEFT_X + 10,
                y1: PARALLEL_R3_Y + 32,
                x2: GROUP_RIGHT_X - 10,
                y2: PARALLEL_R3_Y + 32,
                stroke: "#1d6f9f",
                strokeWidth: currentStrokeWidth(frame.resistor3.current, maxCurrent),
              })}
              {drawChip({
                x: 316,
                y: TOP_WIRE_Y - 52,
                text: `I_total = ${formatMeasurement(frame.totalCurrent, "A")}`,
                tone: "teal",
              })}
              {drawChip({
                x: GROUP_RIGHT_X + 70,
                y: PARALLEL_R2_Y,
                text: `I_2 = ${formatMeasurement(frame.resistor2.current, "A")}`,
                tone: "amber",
              })}
              {drawChip({
                x: GROUP_RIGHT_X + 70,
                y: PARALLEL_R3_Y,
                text: `I_3 = ${formatMeasurement(frame.resistor3.current, "A")}`,
                tone: "sky",
              })}
              {drawChip({
                x: GROUP_RESISTOR_X - 120,
                y: BOTTOM_WIRE_Y - 34,
                text: `Q_2 = ${formatMeasurement(frame.resistor2.charge, "C")}`,
                tone: "amber",
              })}
              {drawChip({
                x: GROUP_RESISTOR_X + 12,
                y: BOTTOM_WIRE_Y - 34,
                text: `Q_3 = ${formatMeasurement(frame.resistor3.charge, "C")}`,
                tone: "sky",
              })}
            </>
          )}
        </g>
      ) : null}

      {showVoltageLabels ? (
        <g opacity={overlayWeight(focusedOverlayId, "voltageLabels")}>
          {drawChip({
            x: BATTERY_X + 40,
            y: 194,
            text: `Battery = ${formatMeasurement(frame.voltage, "V")}`,
            tone: "teal",
          })}
          {drawChip({
            x: OUTER_RESISTOR_X,
            y: TOP_WIRE_Y + 58,
            text: `V_1 = ${formatMeasurement(frame.resistor1.voltage, "V")}`,
            tone: "coral",
          })}
          {drawChip({
            x: frame.groupMode === "series" ? 470 : GROUP_RESISTOR_X + 116,
            y: frame.groupMode === "series" ? TOP_WIRE_Y - 76 : 204,
            text: `V_group = ${formatMeasurement(frame.groupVoltage, "V")}`,
            tone: "teal",
          })}
          {drawChip({
            x: frame.groupMode === "series" ? SERIES_R3_X : GROUP_RESISTOR_X + 116,
            y: frame.groupMode === "series" ? TOP_WIRE_Y + 58 : PARALLEL_R3_Y,
            text: `V_3 = ${formatMeasurement(frame.resistor3.voltage, "V")}`,
            tone: "sky",
          })}
        </g>
      ) : null}

      {showReductionGuide ? (
        <g opacity={overlayWeight(focusedOverlayId, "reductionGuide")}>
          <rect
            x={frame.groupMode === "series" ? 352 : 340}
            y={frame.groupMode === "series" ? 72 : 124}
            width={frame.groupMode === "series" ? 202 : 248}
            height={frame.groupMode === "series" ? 82 : 148}
            rx="24"
            fill="rgba(30,166,162,0.06)"
            stroke="rgba(30,166,162,0.42)"
            strokeWidth="2"
            strokeDasharray="8 6"
          />
          {drawChip({
            x: frame.groupMode === "series" ? 452 : 464,
            y: frame.groupMode === "series" ? 56 : 110,
            text: "Reduce this grouped pair first",
            tone: "teal",
          })}
          {drawChip({
            x: frame.groupMode === "series" ? 452 : 464,
            y: frame.groupMode === "series" ? 152 : 274,
            text: `R_group = ${formatMeasurement(frame.groupEquivalentResistance, "ohm")}`,
            tone: "teal",
          })}
        </g>
      ) : null}

      {showNodeGuide ? (
        <g opacity={overlayWeight(focusedOverlayId, "nodeGuide")}>
          {frame.groupMode === "parallel" ? (
            <>
              <circle cx={GROUP_LEFT_X} cy={TOP_WIRE_Y} r="6" fill="#1ea6a2" />
              <circle cx={GROUP_RIGHT_X} cy={TOP_WIRE_Y} r="6" fill="#1ea6a2" />
              <circle cx={GROUP_LEFT_X} cy={BOTTOM_WIRE_Y} r="6" fill="#4ea6df" />
              <circle cx={GROUP_RIGHT_X} cy={BOTTOM_WIRE_Y} r="6" fill="#4ea6df" />
              {drawChip({
                x: GROUP_RESISTOR_X,
                y: TOP_WIRE_Y - 2,
                text: `${formatMeasurement(frame.groupVoltage, "V")} shared group start`,
                tone: "teal",
              })}
              {drawChip({
                x: GROUP_RESISTOR_X,
                y: TOP_WIRE_Y + 28,
                text: `I_total = I_2 + I_3 = ${formatNumber(frame.totalCurrent)} = ${formatNumber(frame.resistor2.current)} + ${formatNumber(frame.resistor3.current)}`,
                tone: "teal",
              })}
              {drawChip({
                x: GROUP_RESISTOR_X,
                y: BOTTOM_WIRE_Y + 26,
                text: "0 V shared group return",
                tone: "sky",
              })}
            </>
          ) : (
            <>
              <circle cx={SERIES_R2_X - 64} cy={TOP_WIRE_Y} r="6" fill="#1ea6a2" />
              <circle cx={SERIES_R3_X + 64} cy={TOP_WIRE_Y} r="6" fill="#4ea6df" />
              {drawChip({
                x: 456,
                y: TOP_WIRE_Y + 88,
                text: `I_1 = I_2 = I_3 = ${formatNumber(frame.totalCurrent)}`,
                tone: "amber",
              })}
            </>
          )}
        </g>
      ) : null}

      {showLoopGuide ? (
        <g opacity={overlayWeight(focusedOverlayId, "loopGuide")}>
          {frame.groupMode === "parallel" ? (
            <>
              <polyline
                points={pointsToPolyline(PARALLEL_PATH_2)}
                fill="none"
                stroke="rgba(240,171,60,0.56)"
                strokeWidth="2"
                strokeDasharray="8 6"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <polyline
                points={pointsToPolyline(PARALLEL_PATH_3)}
                fill="none"
                stroke="rgba(78,166,223,0.56)"
                strokeWidth="2"
                strokeDasharray="8 6"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {drawChip({
                x: GROUP_RESISTOR_X + 10,
                y: PARALLEL_R2_Y - 56,
                text: `Top loop: +${formatNumber(frame.voltage)} - ${formatNumber(frame.resistor1.voltage)} - ${formatNumber(frame.resistor2.voltage)} = ${formatNumber(frame.voltage - frame.resistor1.voltage - frame.resistor2.voltage)}`,
                tone: "amber",
              })}
              {drawChip({
                x: GROUP_RESISTOR_X + 10,
                y: PARALLEL_R3_Y + 56,
                text: `Bottom loop: +${formatNumber(frame.voltage)} - ${formatNumber(frame.resistor1.voltage)} - ${formatNumber(frame.resistor3.voltage)} = ${formatNumber(frame.voltage - frame.resistor1.voltage - frame.resistor3.voltage)}`,
                tone: "sky",
              })}
            </>
          ) : (
            <>
              <polyline
                points={pointsToPolyline(SERIES_PATH)}
                fill="none"
                stroke="rgba(241,102,89,0.58)"
                strokeWidth="2"
                strokeDasharray="8 6"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {drawChip({
                x: 410,
                y: TOP_WIRE_Y - 66,
                text: `Loop: +${formatNumber(frame.voltage)} - ${formatNumber(frame.resistor1.voltage)} - ${formatNumber(frame.resistor2.voltage)} - ${formatNumber(frame.resistor3.voltage)} = ${formatNumber(frame.voltage - frame.resistor1.voltage - frame.resistor2.voltage - frame.resistor3.voltage)}`,
                tone: "coral",
              })}
            </>
          )}
        </g>
      ) : null}
    </>
  );
}

function renderReductionCard(frame: ReturnType<typeof sampleEquivalentResistanceState>) {
  const groupFormula = frame.groupMode === "parallel" ? "R2 || R3" : "R2 + R3";
  const groupRuleText =
    frame.groupMode === "parallel"
      ? `R_group = (${formatNumber(frame.resistance2)} x ${formatNumber(frame.resistance3)}) / (${formatNumber(frame.resistance2)} + ${formatNumber(frame.resistance3)})`
      : `R_group = ${formatNumber(frame.resistance2)} + ${formatNumber(frame.resistance3)}`;

  return (
    <g transform={`translate(${PANEL_X} ${REDUCTION_CARD_Y})`} pointerEvents="none">
      <rect
        x="0"
        y="0"
        width={PANEL_WIDTH}
        height="108"
        rx="20"
        fill="rgba(255,253,247,0.94)"
        stroke="rgba(15,28,36,0.12)"
        strokeWidth="1.5"
      />
      <text x="16" y="22" className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]">
        Reduction path
      </text>
      <text x="16" y="44" className="fill-ink-950 text-[13px] font-semibold">
        1. Group the highlighted pair: {groupFormula}
      </text>
      <text x="16" y="62" className="fill-ink-700 text-[11px]">
        {groupRuleText} = {formatMeasurement(frame.groupEquivalentResistance, "ohm")}
      </text>
      <text x="16" y="80" className="fill-ink-950 text-[13px] font-semibold">
        2. Add R1 in series: R_eq = R1 + R_group
      </text>
      <text x="16" y="98" className="fill-ink-700 text-[11px]">
        R_eq = {formatMeasurement(frame.equivalentResistance, "ohm")}, so I_total = {formatMeasurement(frame.totalCurrent, "A")}
      </text>
    </g>
  );
}

export function EquivalentResistanceSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: EquivalentResistanceSimulationProps) {
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
        preview R3 = {formatMeasurement(graphPreview.point.x, "ohm")}
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
        {(compare?.labelA ?? "Setup A")}: {frameA?.groupMode} group, R_eq = {formatMeasurement(frameA?.equivalentResistance ?? 0, "ohm")}
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: {frameB?.groupMode} group, R_eq = {formatMeasurement(frameB?.equivalentResistance ?? 0, "ohm")}
      </span>
    </div>
  ) : null;
  const overlayState = {
    currentFlow: overlayValues?.currentFlow ?? true,
    voltageLabels: overlayValues?.voltageLabels ?? true,
    reductionGuide: overlayValues?.reductionGuide ?? true,
    nodeGuide: overlayValues?.nodeGuide ?? false,
  };
  const maxCurrent = Math.max(
    primaryFrame.totalCurrent,
    primaryFrame.resistor2.current,
    primaryFrame.resistor3.current,
    secondaryFrame?.totalCurrent ?? 0,
    secondaryFrame?.resistor2.current ?? 0,
    secondaryFrame?.resistor3.current ?? 0,
    0.5,
  );
  const reductionNote =
    primaryFrame.groupMode === "parallel"
      ? "Reduce the highlighted parallel pair first, then add R1 in series to get the total load."
      : "Reduce the highlighted series pair first, then add that result to R1 because the whole block stays in series.";
  const groupBehaviorNote =
    primaryFrame.groupMode === "parallel"
      ? "Parallel keeps one shared group voltage while the grouped branch currents split by resistance."
      : "Series keeps one group current, so the grouped voltages add back to the group drop.";
  const chargeNote =
    primaryFrame.groupMode === "parallel"
      ? "Q2 and Q3 grow at different rates because the grouped branch currents differ."
      : "Q2 and Q3 grow together because the same current crosses both grouped resistors.";
  const metricRows = [
    { label: "t", value: formatMeasurement(primaryFrame.time, "s") },
    { label: "group", value: primaryFrame.groupMode },
    { label: "R_group", value: formatMeasurement(primaryFrame.groupEquivalentResistance, "ohm") },
    { label: "R_eq", value: formatMeasurement(primaryFrame.equivalentResistance, "ohm") },
    { label: "I_total", value: formatMeasurement(primaryFrame.totalCurrent, "A") },
    { label: "V_group", value: formatMeasurement(primaryFrame.groupVoltage, "V") },
    { label: "I_2", value: formatMeasurement(primaryFrame.resistor2.current, "A") },
    { label: "I_3", value: formatMeasurement(primaryFrame.resistor3.current, "A") },
    { label: "Q_2", value: formatMeasurement(primaryFrame.resistor2.charge, "C") },
    { label: "Q_3", value: formatMeasurement(primaryFrame.resistor3.charge, "C") },
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(30,166,162,0.12),rgba(241,102,89,0.12))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              Keep one outer resistor in series with a highlighted two-resistor group, then
              reduce that group honestly before collapsing the whole circuit to one equivalent
              load.
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
            {secondaryFrame.groupMode === "series"
              ? drawSeriesGroupSkeleton({
                  frame: secondaryFrame,
                  muted: true,
                  dashed: true,
                  glowOn: false,
                })
              : drawParallelGroupSkeleton({
                  frame: secondaryFrame,
                  muted: true,
                  dashed: true,
                  glowOn: false,
                })}
            {renderPackets(secondaryFrame, time, true)}
            {drawChip({
              x: secondaryFrame.groupMode === "series" ? SERIES_RIGHT_X - 10 : GROUP_RIGHT_X + 8,
              y: 72,
              text: `${secondaryLabel} ghost`,
              tone: "ink",
              dashed: true,
            })}
          </g>
        ) : null}

        {primaryFrame.groupMode === "series"
          ? drawSeriesGroupSkeleton({ frame: primaryFrame, glowOn: true })
          : drawParallelGroupSkeleton({ frame: primaryFrame, glowOn: true })}
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
          {primaryLabel}: R1 in series with a {primaryFrame.groupMode} grouped pair
        </text>
        <text
          x={STAGE_LEFT + 18}
          y={STAGE_BOTTOM - 18}
          className="fill-ink-600 text-[12px]"
        >
          Q_total = {formatNumber(primaryFrame.totalCharge)} C after {formatNumber(primaryFrame.time)} s,
          P_total = {formatNumber(primaryFrame.totalPower)} W
        </text>

        {renderReductionCard(primaryFrame)}
        <SimulationReadoutCard
          x={PANEL_X}
          y={READOUT_Y}
          width={PANEL_WIDTH}
          title={compareEnabled ? `${primaryLabel} reduced state` : "Reduced state"}
          rows={metricRows}
          noteLines={[reductionNote, groupBehaviorNote, chargeNote]}
        />
      </svg>
    </section>
  );
}
