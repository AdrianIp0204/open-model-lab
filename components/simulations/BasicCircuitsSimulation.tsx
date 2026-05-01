"use client";

import {
  BASIC_CIRCUITS_MAX_RESISTANCE,
  BASIC_CIRCUITS_MAX_VOLTAGE,
  BASIC_CIRCUITS_MIN_RESISTANCE,
  formatMeasurement,
  formatNumber,
  sampleBasicCircuitsState,
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

type BasicCircuitsSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 860;
const HEIGHT = 360;
const STAGE_LEFT = 42;
const STAGE_TOP = 34;
const STAGE_RIGHT = 598;
const STAGE_BOTTOM = HEIGHT - 34;
const STAGE_WIDTH = STAGE_RIGHT - STAGE_LEFT;
const STAGE_HEIGHT = STAGE_BOTTOM - STAGE_TOP;
const CARD_WIDTH = 228;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;

const BATTERY_X = 110;
const LEFT_BUS_X = 158;
const RIGHT_BUS_X = 486;
const TOP_WIRE_Y = 104;
const BOTTOM_WIRE_Y = 250;
const SERIES_RESISTOR_A_X = 244;
const SERIES_RESISTOR_B_X = 392;
const SERIES_RESISTOR_Y = 92;
const RESISTOR_WIDTH = 108;
const RESISTOR_HEIGHT = 24;
const PARALLEL_BRANCH_TOP_Y = 136;
const PARALLEL_BRANCH_BOTTOM_Y = 212;
const PARALLEL_RESISTOR_X = 258;
const NODE_TOP_Y = 88;
const NODE_BOTTOM_Y = 264;

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.34;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function powerAlpha(power: number) {
  return clamp(0.18 + Math.tanh(power / 24) * 0.42, 0.18, 0.58);
}

function resistorFill(power: number, tone: "a" | "b", dashed = false) {
  const alpha = dashed ? 0.08 : powerAlpha(power);

  return tone === "a"
    ? `rgba(240,171,60,${alpha.toFixed(3)})`
    : `rgba(78,166,223,${alpha.toFixed(3)})`;
}

function resistorStroke(tone: "a" | "b", muted = false) {
  if (tone === "a") {
    return muted ? "rgba(184,112,0,0.5)" : "#b87000";
  }

  return muted ? "rgba(29,111,159,0.5)" : "#1d6f9f";
}

function currentStrokeWidth(current: number, maxCurrent: number) {
  const ratio = maxCurrent > 0 ? current / maxCurrent : 0;
  return 1.8 + ratio * 4.2;
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

function drawChip(options: {
  x: number;
  y: number;
  text: string;
  tone?: "amber" | "sky" | "teal" | "ink";
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
    ink: {
      fill: "rgba(255,255,255,0.9)",
      stroke: "rgba(15,28,36,0.16)",
      text: "#0f1c24",
    },
  };
  const palette = toneMap[tone];
  const width = Math.max(68, text.length * 6.6 + 20);

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

function renderBattery(x: number, yTop: number, yBottom: number, muted = false, dashed = false) {
  const midY = (yTop + yBottom) / 2;
  const positivePlateY = midY - 22;
  const negativePlateY = midY + 22;
  const stroke = muted ? "rgba(15,28,36,0.46)" : "#0f1c24";

  return (
    <g opacity={muted ? 0.62 : 1}>
      <line
        x1={x}
        x2={x}
        y1={yTop}
        y2={positivePlateY - 12}
        stroke={stroke}
        strokeWidth="3"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={x}
        x2={x}
        y1={negativePlateY + 12}
        y2={yBottom}
        stroke={stroke}
        strokeWidth="3"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={x - 12}
        x2={x + 12}
        y1={positivePlateY}
        y2={positivePlateY}
        stroke={stroke}
        strokeWidth="4"
      />
      <line
        x1={x - 7}
        x2={x + 7}
        y1={negativePlateY}
        y2={negativePlateY}
        stroke={stroke}
        strokeWidth="4"
      />
      <text
        x={x - 20}
        y={positivePlateY + 4}
        textAnchor="end"
        className="fill-ink-500 text-[10px] font-semibold"
      >
        +
      </text>
      <text
        x={x - 20}
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
  x: number;
  y: number;
  label: string;
  resistance: number;
  power: number;
  tone: "a" | "b";
  muted?: boolean;
  dashed?: boolean;
}) {
  const { x, y, label, resistance, power, tone, muted = false, dashed = false } = options;

  return (
    <g opacity={muted ? 0.58 : 1}>
      <rect
        x={x}
        y={y}
        width={RESISTOR_WIDTH}
        height={RESISTOR_HEIGHT}
        rx="10"
        fill={resistorFill(power, tone, dashed)}
        stroke={resistorStroke(tone, muted)}
        strokeWidth="2.4"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <text
        x={x + RESISTOR_WIDTH / 2}
        y={y - 8}
        textAnchor="middle"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        {label}
      </text>
      <text
        x={x + RESISTOR_WIDTH / 2}
        y={y + 16}
        textAnchor="middle"
        className="fill-ink-950 text-[12px] font-semibold"
      >
        {formatMeasurement(resistance, "ohm")}
      </text>
    </g>
  );
}

function buildPreviewSource(
  source: SimulationParams,
  preview: GraphStagePreview | null | undefined,
) {
  if (!preview || preview.kind !== "response") {
    return source;
  }

  if (preview.graphId === "current-map") {
    return {
      ...source,
      voltage: clamp(preview.point.x, 0, BASIC_CIRCUITS_MAX_VOLTAGE),
    };
  }

  if (preview.graphId === "voltage-share") {
    return {
      ...source,
      resistanceB: clamp(
        preview.point.x,
        BASIC_CIRCUITS_MIN_RESISTANCE,
        BASIC_CIRCUITS_MAX_RESISTANCE,
      ),
    };
  }

  return source;
}

function drawSeriesSkeleton(options: {
  offsetX?: number;
  offsetY?: number;
  muted?: boolean;
  dashed?: boolean;
  frame: ReturnType<typeof sampleBasicCircuitsState>;
}) {
  const { offsetX = 0, offsetY = 0, muted = false, dashed = false, frame } = options;
  const stroke = muted ? "rgba(15,28,36,0.48)" : "#0f1c24";

  return (
    <g opacity={muted ? 0.58 : 1} transform={`translate(${offsetX} ${offsetY})`}>
      <line
        x1={LEFT_BUS_X}
        x2={SERIES_RESISTOR_A_X}
        y1={TOP_WIRE_Y}
        y2={TOP_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={SERIES_RESISTOR_A_X + RESISTOR_WIDTH}
        x2={SERIES_RESISTOR_B_X}
        y1={TOP_WIRE_Y}
        y2={TOP_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={SERIES_RESISTOR_B_X + RESISTOR_WIDTH}
        x2={RIGHT_BUS_X}
        y1={TOP_WIRE_Y}
        y2={TOP_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={RIGHT_BUS_X}
        x2={RIGHT_BUS_X}
        y1={TOP_WIRE_Y}
        y2={BOTTOM_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={RIGHT_BUS_X}
        x2={BATTERY_X}
        y1={BOTTOM_WIRE_Y}
        y2={BOTTOM_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      {renderBattery(BATTERY_X, TOP_WIRE_Y, BOTTOM_WIRE_Y, muted, dashed)}
      {renderResistor({
        x: SERIES_RESISTOR_A_X,
        y: SERIES_RESISTOR_Y,
        label: "Resistor A",
        resistance: frame.resistanceA,
        power: frame.branchA.power,
        tone: "a",
        muted,
        dashed,
      })}
      {renderResistor({
        x: SERIES_RESISTOR_B_X,
        y: SERIES_RESISTOR_Y,
        label: "Resistor B",
        resistance: frame.resistanceB,
        power: frame.branchB.power,
        tone: "b",
        muted,
        dashed,
      })}
    </g>
  );
}

function drawParallelSkeleton(options: {
  offsetX?: number;
  offsetY?: number;
  muted?: boolean;
  dashed?: boolean;
  frame: ReturnType<typeof sampleBasicCircuitsState>;
}) {
  const { offsetX = 0, offsetY = 0, muted = false, dashed = false, frame } = options;
  const stroke = muted ? "rgba(15,28,36,0.48)" : "#0f1c24";
  const branchLeftX = PARALLEL_RESISTOR_X;
  const branchRightX = PARALLEL_RESISTOR_X + RESISTOR_WIDTH;

  return (
    <g opacity={muted ? 0.58 : 1} transform={`translate(${offsetX} ${offsetY})`}>
      <line
        x1={LEFT_BUS_X}
        x2={RIGHT_BUS_X}
        y1={TOP_WIRE_Y}
        y2={TOP_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={RIGHT_BUS_X}
        x2={RIGHT_BUS_X}
        y1={TOP_WIRE_Y}
        y2={BOTTOM_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={RIGHT_BUS_X}
        x2={BATTERY_X}
        y1={BOTTOM_WIRE_Y}
        y2={BOTTOM_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={branchLeftX}
        x2={branchLeftX}
        y1={TOP_WIRE_Y}
        y2={BOTTOM_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={branchRightX}
        x2={branchRightX}
        y1={TOP_WIRE_Y}
        y2={BOTTOM_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      {renderBattery(BATTERY_X, TOP_WIRE_Y, BOTTOM_WIRE_Y, muted, dashed)}
      {renderResistor({
        x: PARALLEL_RESISTOR_X,
        y: PARALLEL_BRANCH_TOP_Y,
        label: "Branch A",
        resistance: frame.resistanceA,
        power: frame.branchA.power,
        tone: "a",
        muted,
        dashed,
      })}
      {renderResistor({
        x: PARALLEL_RESISTOR_X,
        y: PARALLEL_BRANCH_BOTTOM_Y,
        label: "Branch B",
        resistance: frame.resistanceB,
        power: frame.branchB.power,
        tone: "b",
        muted,
        dashed,
      })}
    </g>
  );
}

function renderPrimaryOverlays(
  frame: ReturnType<typeof sampleBasicCircuitsState>,
  focusedOverlayId: string | null | undefined,
  overlayValues: Record<string, boolean>,
  maxCurrent: number,
) {
  const showCurrentArrows = overlayValues.currentArrows ?? true;
  const showVoltageDrops = overlayValues.voltageDrops ?? true;
  const showNodeGuide = overlayValues.nodeGuide ?? false;

  return (
    <>
      {showCurrentArrows ? (
        <g opacity={overlayWeight(focusedOverlayId, "currentArrows")}>
          {frame.topology === "series" ? (
            <>
              {drawArrow({
                x1: LEFT_BUS_X + 22,
                y1: TOP_WIRE_Y - 30,
                x2: SERIES_RESISTOR_B_X + RESISTOR_WIDTH - 10,
                y2: TOP_WIRE_Y - 30,
                stroke: "#1ea6a2",
                strokeWidth: currentStrokeWidth(frame.totalCurrent, maxCurrent),
              })}
              {drawChip({
                x: 348,
                y: TOP_WIRE_Y - 54,
                text: `I_total = ${formatMeasurement(frame.totalCurrent, "A")}`,
                tone: "teal",
              })}
            </>
          ) : (
            <>
              {drawArrow({
                x1: LEFT_BUS_X + 12,
                y1: TOP_WIRE_Y - 26,
                x2: RIGHT_BUS_X - 12,
                y2: TOP_WIRE_Y - 26,
                stroke: "#1ea6a2",
                strokeWidth: currentStrokeWidth(frame.totalCurrent, maxCurrent),
              })}
              {drawArrow({
                x1: PARALLEL_RESISTOR_X + 8,
                y1: PARALLEL_BRANCH_TOP_Y - 18,
                x2: PARALLEL_RESISTOR_X + RESISTOR_WIDTH - 8,
                y2: PARALLEL_BRANCH_TOP_Y - 18,
                stroke: "#b87000",
                strokeWidth: currentStrokeWidth(frame.branchA.current, maxCurrent),
              })}
              {drawArrow({
                x1: PARALLEL_RESISTOR_X + 8,
                y1: PARALLEL_BRANCH_BOTTOM_Y + RESISTOR_HEIGHT + 18,
                x2: PARALLEL_RESISTOR_X + RESISTOR_WIDTH - 8,
                y2: PARALLEL_BRANCH_BOTTOM_Y + RESISTOR_HEIGHT + 18,
                stroke: "#1d6f9f",
                strokeWidth: currentStrokeWidth(frame.branchB.current, maxCurrent),
              })}
              {drawChip({
                x: 332,
                y: TOP_WIRE_Y - 52,
                text: `I_total = ${formatMeasurement(frame.totalCurrent, "A")}`,
                tone: "teal",
              })}
              {drawChip({
                x: 312,
                y: PARALLEL_BRANCH_TOP_Y - 42,
                text: `I_A = ${formatMeasurement(frame.branchA.current, "A")}`,
                tone: "amber",
              })}
              {drawChip({
                x: 312,
                y: PARALLEL_BRANCH_BOTTOM_Y + 62,
                text: `I_B = ${formatMeasurement(frame.branchB.current, "A")}`,
                tone: "sky",
              })}
            </>
          )}
        </g>
      ) : null}

      {showVoltageDrops ? (
        <g opacity={overlayWeight(focusedOverlayId, "voltageDrops")}>
          {drawChip({
            x: BATTERY_X + 32,
            y: 176,
            text: `Battery = ${formatMeasurement(frame.voltage, "V")}`,
            tone: "teal",
          })}
          {frame.topology === "series" ? (
            <>
              {drawChip({
                x: SERIES_RESISTOR_A_X + RESISTOR_WIDTH / 2,
                y: SERIES_RESISTOR_Y + 52,
                text: `V_A = ${formatMeasurement(frame.branchA.voltage, "V")}`,
                tone: "amber",
              })}
              {drawChip({
                x: SERIES_RESISTOR_B_X + RESISTOR_WIDTH / 2,
                y: SERIES_RESISTOR_Y + 52,
                text: `V_B = ${formatMeasurement(frame.branchB.voltage, "V")}`,
                tone: "sky",
              })}
            </>
          ) : (
            <>
              {drawChip({
                x: PARALLEL_RESISTOR_X + RESISTOR_WIDTH + 92,
                y: PARALLEL_BRANCH_TOP_Y + 12,
                text: `V_A = ${formatMeasurement(frame.branchA.voltage, "V")}`,
                tone: "amber",
              })}
              {drawChip({
                x: PARALLEL_RESISTOR_X + RESISTOR_WIDTH + 92,
                y: PARALLEL_BRANCH_BOTTOM_Y + 12,
                text: `V_B = ${formatMeasurement(frame.branchB.voltage, "V")}`,
                tone: "sky",
              })}
            </>
          )}
        </g>
      ) : null}

      {showNodeGuide ? (
        <g opacity={overlayWeight(focusedOverlayId, "nodeGuide")}>
          {frame.topology === "series" ? (
            <>
              <circle cx={LEFT_BUS_X} cy={TOP_WIRE_Y} r="6" fill="#1ea6a2" />
              <circle cx={SERIES_RESISTOR_A_X + RESISTOR_WIDTH} cy={TOP_WIRE_Y} r="6" fill="#f0ab3c" />
              <circle cx={RIGHT_BUS_X} cy={BOTTOM_WIRE_Y} r="6" fill="#4ea6df" />
              {drawChip({
                x: LEFT_BUS_X + 28,
                y: NODE_TOP_Y,
                text: `${formatMeasurement(frame.voltage, "V")} node`,
                tone: "teal",
              })}
              {drawChip({
                x: SERIES_RESISTOR_A_X + RESISTOR_WIDTH + 42,
                y: NODE_TOP_Y,
                text: `${formatMeasurement(frame.branchB.voltage, "V")} between A and B`,
                tone: "amber",
              })}
              {drawChip({
                x: RIGHT_BUS_X - 18,
                y: NODE_BOTTOM_Y,
                text: "0 V return",
                tone: "sky",
              })}
            </>
          ) : (
            <>
              <circle cx={PARALLEL_RESISTOR_X} cy={TOP_WIRE_Y} r="6" fill="#1ea6a2" />
              <circle cx={PARALLEL_RESISTOR_X + RESISTOR_WIDTH} cy={TOP_WIRE_Y} r="6" fill="#1ea6a2" />
              <circle cx={PARALLEL_RESISTOR_X} cy={BOTTOM_WIRE_Y} r="6" fill="#4ea6df" />
              <circle cx={PARALLEL_RESISTOR_X + RESISTOR_WIDTH} cy={BOTTOM_WIRE_Y} r="6" fill="#4ea6df" />
              {drawChip({
                x: 304,
                y: NODE_TOP_Y,
                text: `${formatMeasurement(frame.voltage, "V")} shared top node`,
                tone: "teal",
              })}
              {drawChip({
                x: 304,
                y: NODE_BOTTOM_Y,
                text: "0 V shared return",
                tone: "sky",
              })}
            </>
          )}
        </g>
      ) : null}
    </>
  );
}

function buildFrame(
  source: SimulationParams,
  graphPreview?: GraphStagePreview | null,
) {
  return sampleBasicCircuitsState(buildPreviewSource(source, graphPreview));
}

export function BasicCircuitsSimulation({
  concept,
  params,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: BasicCircuitsSimulationProps) {
  const compareEnabled = Boolean(compare);
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const activeFrame = buildFrame(params, graphPreview);
  const frameA = compare
    ? buildFrame(compare.setupA, previewedSetup === "a" ? graphPreview : null)
    : null;
  const frameB = compare
    ? buildFrame(compare.setupB, previewedSetup === "b" ? graphPreview : null)
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
        {graphPreview.graphId === "current-map"
          ? `preview V = ${formatMeasurement(graphPreview.point.x, "V")}`
          : `preview R_B = ${formatMeasurement(graphPreview.point.x, "ohm")}`}
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
        {(compare?.labelA ?? "Setup A")}: {frameA?.topology}, {formatMeasurement(frameA?.equivalentResistance ?? 0, "ohm")}, {formatMeasurement(frameA?.totalCurrent ?? 0, "A")}
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: {frameB?.topology}, {formatMeasurement(frameB?.equivalentResistance ?? 0, "ohm")}, {formatMeasurement(frameB?.totalCurrent ?? 0, "A")}
      </span>
    </div>
  ) : null;
  const overlayState = {
    currentArrows: overlayValues?.currentArrows ?? true,
    voltageDrops: overlayValues?.voltageDrops ?? true,
    nodeGuide: overlayValues?.nodeGuide ?? false,
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
      ? "Series mode keeps one loop current all the way around, so changing either resistor changes the same total current everywhere."
      : "Parallel mode keeps the same battery voltage across both branches, so each branch current follows its own resistance before recombining.";
  const powerNote =
    primaryFrame.brighterBranch === "balanced"
      ? "The two resistors are dissipating nearly the same power."
      : primaryFrame.brighterBranch === "a"
        ? "Resistor A is dissipating more power than resistor B."
        : "Resistor B is dissipating more power than resistor A.";
  const metricRows = [
    { label: "mode", value: primaryFrame.topology },
    { label: "V", value: formatMeasurement(primaryFrame.voltage, "V") },
    { label: "R_A", value: formatMeasurement(primaryFrame.resistanceA, "ohm") },
    { label: "R_B", value: formatMeasurement(primaryFrame.resistanceB, "ohm") },
    { label: "R_eq", value: formatMeasurement(primaryFrame.equivalentResistance, "ohm") },
    { label: "I_total", value: formatMeasurement(primaryFrame.totalCurrent, "A") },
    { label: "I_A", value: formatMeasurement(primaryFrame.branchA.current, "A") },
    { label: "I_B", value: formatMeasurement(primaryFrame.branchB.current, "A") },
    { label: "V_A", value: formatMeasurement(primaryFrame.branchA.voltage, "V") },
    { label: "V_B", value: formatMeasurement(primaryFrame.branchB.voltage, "V") },
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(240,171,60,0.12),rgba(30,166,162,0.1))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 text-xs text-ink-700">
              Keep the battery and two resistors fixed, then switch between one series
              loop and two parallel branches without turning this into an electronics
              workbench. The same readouts, overlays, compare mode, and graphs all
              come from that one bounded circuit.
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
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          rx="24"
          fill="rgba(255,253,247,0.92)"
        />
        <rect
          x={STAGE_LEFT}
          y={STAGE_TOP}
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          rx="24"
          fill="none"
          stroke="rgba(15,28,36,0.08)"
        />

        {secondaryFrame ? (
          secondaryFrame.topology === "series" ? (
            <g>
              {drawSeriesSkeleton({
                frame: secondaryFrame,
                offsetX: 12,
                offsetY: 10,
                muted: true,
                dashed: true,
              })}
              {drawChip({
                x: RIGHT_BUS_X + 18,
                y: 74,
                text: `${secondaryLabel} ghost`,
                tone: "ink",
                dashed: true,
              })}
            </g>
          ) : (
            <g>
              {drawParallelSkeleton({
                frame: secondaryFrame,
                offsetX: 12,
                offsetY: 10,
                muted: true,
                dashed: true,
              })}
              {drawChip({
                x: RIGHT_BUS_X + 18,
                y: 74,
                text: `${secondaryLabel} ghost`,
                tone: "ink",
                dashed: true,
              })}
            </g>
          )
        ) : null}

        {primaryFrame.topology === "series"
          ? drawSeriesSkeleton({ frame: primaryFrame })
          : drawParallelSkeleton({ frame: primaryFrame })}

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
          R_eq = {formatNumber(primaryFrame.equivalentResistance)} ohm, I_total = {formatNumber(primaryFrame.totalCurrent)} A, P_total = {formatNumber(primaryFrame.totalPower)} W
        </text>

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel} circuit state` : "Circuit state"}
          rows={metricRows}
          noteLines={[topologyNote, powerNote]}
        />
      </svg>
    </section>
  );
}
