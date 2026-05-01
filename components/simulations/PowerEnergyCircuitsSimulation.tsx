"use client";

import {
  POWER_ENERGY_CIRCUITS_MAX_RESISTANCE,
  POWER_ENERGY_CIRCUITS_MAX_TIME,
  POWER_ENERGY_CIRCUITS_MAX_VOLTAGE,
  POWER_ENERGY_CIRCUITS_MIN_RESISTANCE,
  formatMeasurement,
  formatNumber,
  samplePowerEnergyCircuitsState,
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

type PowerEnergyCircuitsSimulationProps = {
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
const HEIGHT = 380;
const STAGE_LEFT = 42;
const STAGE_TOP = 34;
const STAGE_RIGHT = 598;
const STAGE_BOTTOM = HEIGHT - 34;
const CARD_WIDTH = 228;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;

const LOOP_LEFT_X = 136;
const BATTERY_X = 108;
const RIGHT_BUS_X = 488;
const TOP_WIRE_Y = 106;
const BOTTOM_WIRE_Y = 254;
const TOP_START_X = BATTERY_X + 18;
const LOAD_X = 340;
const LOAD_Y = 92;
const LOAD_WIDTH = 120;
const LOAD_HEIGHT = 34;
const METER_X = 86;
const POWER_METER_Y = 286;
const ENERGY_METER_Y = 320;
const METER_WIDTH = 382;
const METER_HEIGHT = 16;

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.34;
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function glowOpacity(ratio: number, dashed = false) {
  const base = 0.12 + ratio * 0.5;
  return dashed ? Math.min(base, 0.18) : clampValue(base, 0.12, 0.62);
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
  const width = Math.max(70, text.length * 6.6 + 20);

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
  powerRatio: number;
  resistance: number;
  muted?: boolean;
  dashed?: boolean;
  glowOn?: boolean;
}) {
  const { powerRatio, resistance, muted = false, dashed = false, glowOn = true } = options;
  const haloOpacity = glowOpacity(powerRatio, dashed);
  const stroke = muted ? "rgba(177,66,52,0.46)" : "#b14234";

  return (
    <g opacity={muted ? 0.62 : 1}>
      {glowOn ? (
        <>
          <ellipse
            cx={LOAD_X + LOAD_WIDTH / 2}
            cy={LOAD_Y + LOAD_HEIGHT / 2}
            rx={74}
            ry={50}
            fill={`rgba(241,102,89,${haloOpacity.toFixed(3)})`}
          />
          <ellipse
            cx={LOAD_X + LOAD_WIDTH / 2}
            cy={LOAD_Y + LOAD_HEIGHT / 2}
            rx={50}
            ry={32}
            fill={`rgba(240,171,60,${(haloOpacity * 0.8).toFixed(3)})`}
          />
        </>
      ) : null}
      <rect
        x={LOAD_X}
        y={LOAD_Y}
        width={LOAD_WIDTH}
        height={LOAD_HEIGHT}
        rx="17"
        fill={muted ? "rgba(255,248,240,0.7)" : "rgba(255,248,240,0.92)"}
        stroke={stroke}
        strokeWidth="2.4"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <path
        d={`M ${LOAD_X + 24} ${LOAD_Y + LOAD_HEIGHT / 2}
            C ${LOAD_X + 36} ${LOAD_Y + 8}, ${LOAD_X + 52} ${LOAD_Y + LOAD_HEIGHT - 8}, ${LOAD_X + 64} ${LOAD_Y + LOAD_HEIGHT / 2}
            S ${LOAD_X + 92} ${LOAD_Y + 8}, ${LOAD_X + 100} ${LOAD_Y + LOAD_HEIGHT / 2}`}
        fill="none"
        stroke={stroke}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <text
        x={LOAD_X + LOAD_WIDTH / 2}
        y={LOAD_Y - 8}
        textAnchor="middle"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        Resistive load
      </text>
      <text
        x={LOAD_X + LOAD_WIDTH / 2}
        y={LOAD_Y + LOAD_HEIGHT + 18}
        textAnchor="middle"
        className="fill-ink-950 text-[12px] font-semibold"
      >
        {formatMeasurement(resistance, "ohm")}
      </text>
    </g>
  );
}

function currentStrokeWidth(current: number) {
  return 1.8 + clampValue(current / 2.5, 0, 1) * 4;
}

function pointOnLoop(distance: number) {
  const topLength = RIGHT_BUS_X - TOP_START_X;
  const rightLength = BOTTOM_WIRE_Y - TOP_WIRE_Y;
  const bottomLength = RIGHT_BUS_X - BATTERY_X;
  const leftLength = BOTTOM_WIRE_Y - TOP_WIRE_Y;
  const totalLength = topLength + rightLength + bottomLength + leftLength;
  const wrapped = ((distance % totalLength) + totalLength) % totalLength;

  if (wrapped <= topLength) {
    return { x: TOP_START_X + wrapped, y: TOP_WIRE_Y };
  }

  if (wrapped <= topLength + rightLength) {
    return { x: RIGHT_BUS_X, y: TOP_WIRE_Y + (wrapped - topLength) };
  }

  if (wrapped <= topLength + rightLength + bottomLength) {
    return {
      x: RIGHT_BUS_X - (wrapped - topLength - rightLength),
      y: BOTTOM_WIRE_Y,
    };
  }

  return {
    x: BATTERY_X,
    y: BOTTOM_WIRE_Y - (wrapped - topLength - rightLength - bottomLength),
  };
}

function renderChargePackets(
  frame: ReturnType<typeof samplePowerEnergyCircuitsState>,
  displayTime: number,
  muted = false,
) {
  const packetCount = 7;
  const pathLength =
    (RIGHT_BUS_X - TOP_START_X) + (RIGHT_BUS_X - BATTERY_X) + (BOTTOM_WIRE_Y - TOP_WIRE_Y) * 2;
  const speed = 130 + frame.current * 70;

  return (
    <g opacity={muted ? 0.32 : 0.78}>
      {Array.from({ length: packetCount }, (_, index) => {
        const distance = displayTime * speed + (pathLength / packetCount) * index;
        const point = pointOnLoop(distance);
        return (
          <circle
            key={`packet-${index}`}
            cx={point.x}
            cy={point.y}
            r={muted ? 3.2 : 4.2}
            fill={muted ? "rgba(30,166,162,0.32)" : "rgba(30,166,162,0.78)"}
          />
        );
      })}
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

  if (preview.graphId === "current-voltage" || preview.graphId === "power-voltage") {
    return {
      ...source,
      voltage: clampValue(preview.point.x, 0, POWER_ENERGY_CIRCUITS_MAX_VOLTAGE),
    };
  }

  if (preview.graphId === "power-resistance") {
    return {
      ...source,
      loadResistance: clampValue(
        preview.point.x,
        POWER_ENERGY_CIRCUITS_MIN_RESISTANCE,
        POWER_ENERGY_CIRCUITS_MAX_RESISTANCE,
      ),
    };
  }

  return source;
}

function resolveFrame(
  source: SimulationParams,
  time: number,
  graphPreview?: GraphStagePreview | null,
) {
  const displayTime =
    graphPreview?.kind === "time" ? graphPreview.time : time;

  return samplePowerEnergyCircuitsState(
    buildPreviewSource(source, graphPreview),
    displayTime,
  );
}

function renderLoop(
  frame: ReturnType<typeof samplePowerEnergyCircuitsState>,
  options?: { muted?: boolean; dashed?: boolean; glowOn?: boolean },
) {
  const { muted = false, dashed = false, glowOn = true } = options ?? {};
  const stroke = muted ? "rgba(15,28,36,0.48)" : "#0f1c24";

  return (
    <g opacity={muted ? 0.58 : 1}>
      <line
        x1={LOOP_LEFT_X}
        x2={LOAD_X}
        y1={TOP_WIRE_Y}
        y2={TOP_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={LOAD_X + LOAD_WIDTH}
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
        x1={BATTERY_X + 18}
        x2={LOOP_LEFT_X}
        y1={TOP_WIRE_Y}
        y2={TOP_WIRE_Y}
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      {renderBattery(TOP_WIRE_Y, BOTTOM_WIRE_Y, muted, dashed)}
      {renderLoad({
        powerRatio: frame.powerRatio,
        resistance: frame.loadResistance,
        muted,
        dashed,
        glowOn,
      })}
    </g>
  );
}

function renderMeters(
  frame: ReturnType<typeof samplePowerEnergyCircuitsState>,
  focusedOverlayId: string | null | undefined,
  overlayValues: Record<string, boolean>,
) {
  const showPowerGlow = overlayValues.powerGlow ?? true;
  const showEnergyMeter = overlayValues.energyMeter ?? true;
  const powerFillWidth = METER_WIDTH * frame.powerRatio;
  const energyFillWidth =
    METER_WIDTH * clampValue(frame.time / POWER_ENERGY_CIRCUITS_MAX_TIME, 0, 1);

  return (
    <>
      {showPowerGlow ? (
        <g opacity={overlayWeight(focusedOverlayId, "powerGlow")}>
          <text
            x={METER_X}
            y={POWER_METER_Y - 8}
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            Power rate
          </text>
          <rect
            x={METER_X}
            y={POWER_METER_Y}
            width={METER_WIDTH}
            height={METER_HEIGHT}
            rx="8"
            fill="rgba(15,28,36,0.06)"
          />
          <rect
            x={METER_X}
            y={POWER_METER_Y}
            width={powerFillWidth}
            height={METER_HEIGHT}
            rx="8"
            fill={`rgba(241,102,89,${glowOpacity(frame.powerRatio).toFixed(3)})`}
          />
          {drawChip({
            x: METER_X + METER_WIDTH - 54,
            y: POWER_METER_Y + 8,
            text: `P = ${formatMeasurement(frame.power, "W")}`,
            tone: "coral",
          })}
        </g>
      ) : null}

      {showEnergyMeter ? (
        <g opacity={overlayWeight(focusedOverlayId, "energyMeter")}>
          <text
            x={METER_X}
            y={ENERGY_METER_Y - 8}
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            Energy delivered
          </text>
          <rect
            x={METER_X}
            y={ENERGY_METER_Y}
            width={METER_WIDTH}
            height={METER_HEIGHT}
            rx="8"
            fill="rgba(15,28,36,0.06)"
          />
          <rect
            x={METER_X}
            y={ENERGY_METER_Y}
            width={energyFillWidth}
            height={METER_HEIGHT}
            rx="8"
            fill={`rgba(30,166,162,${(0.22 + frame.powerRatio * 0.46).toFixed(3)})`}
          />
          {drawChip({
            x: METER_X + METER_WIDTH - 72,
            y: ENERGY_METER_Y + 8,
            text: `E = ${formatMeasurement(frame.energy, "J")}`,
            tone: "teal",
          })}
          {drawChip({
            x: METER_X + 84,
            y: ENERGY_METER_Y + 8,
            text: `t = ${formatMeasurement(frame.time, "s")}`,
            tone: "ink",
          })}
        </g>
      ) : null}
    </>
  );
}

function renderPrimaryOverlays(
  frame: ReturnType<typeof samplePowerEnergyCircuitsState>,
  focusedOverlayId: string | null | undefined,
  overlayValues: Record<string, boolean>,
) {
  const showCurrentArrows = overlayValues.currentArrows ?? true;
  const showVoltageLabels = overlayValues.voltageLabels ?? true;

  return (
    <>
      {showCurrentArrows ? (
        <g opacity={overlayWeight(focusedOverlayId, "currentArrows")}>
          {drawArrow({
            x1: LOOP_LEFT_X + 16,
            y1: TOP_WIRE_Y - 26,
            x2: RIGHT_BUS_X - 16,
            y2: TOP_WIRE_Y - 26,
            stroke: "#1ea6a2",
            strokeWidth: currentStrokeWidth(frame.current),
          })}
          {drawChip({
            x: 312,
            y: TOP_WIRE_Y - 50,
            text: `I = ${formatMeasurement(frame.current, "A")}`,
            tone: "teal",
          })}
        </g>
      ) : null}

      {showVoltageLabels ? (
        <g opacity={overlayWeight(focusedOverlayId, "voltageLabels")}>
          {drawChip({
            x: BATTERY_X + 36,
            y: 180,
            text: `Source = ${formatMeasurement(frame.voltage, "V")}`,
            tone: "teal",
          })}
          {drawChip({
            x: LOAD_X + LOAD_WIDTH / 2,
            y: LOAD_Y + LOAD_HEIGHT + 44,
            text: `Load drop = ${formatMeasurement(frame.voltageAcrossLoad, "V")}`,
            tone: "amber",
          })}
        </g>
      ) : null}

      {renderMeters(frame, focusedOverlayId, overlayValues)}
    </>
  );
}

export function PowerEnergyCircuitsSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: PowerEnergyCircuitsSimulationProps) {
  const compareEnabled = Boolean(compare);
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const displayTime =
    graphPreview?.kind === "time" ? graphPreview.time : time;
  const liveFrame = resolveFrame(params, displayTime, graphPreview);
  const frameA = compare
    ? resolveFrame(compare.setupA, displayTime, previewedSetup === "a" ? graphPreview : null)
    : null;
  const frameB = compare
    ? resolveFrame(compare.setupB, displayTime, previewedSetup === "b" ? graphPreview : null)
    : null;
  const primaryFrame = compare
    ? previewedSetup === "a"
      ? frameA!
      : frameB!
    : liveFrame;
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
    graphPreview?.kind === "time" ? (
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
        preview {graphPreview.seriesLabel} t = {formatNumber(graphPreview.time)} s
      </span>
    ) : graphPreview?.kind === "response" ? (
      <span className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral-700">
        {graphPreview.graphId === "power-resistance"
          ? `preview R_load = ${formatMeasurement(graphPreview.point.x, "ohm")}`
          : `preview V = ${formatMeasurement(graphPreview.point.x, "V")}`}
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
      <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold text-ink-700">
        {(compare?.labelA ?? "Setup A")}: P = {formatMeasurement(frameA?.power ?? 0, "W")}, E = {formatMeasurement(frameA?.energy ?? 0, "J")}
      </span>
      <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold text-ink-700">
        {(compare?.labelB ?? "Setup B")}: P = {formatMeasurement(frameB?.power ?? 0, "W")}, E = {formatMeasurement(frameB?.energy ?? 0, "J")}
      </span>
    </div>
  ) : null;
  const overlayState = {
    currentArrows: overlayValues?.currentArrows ?? true,
    voltageLabels: overlayValues?.voltageLabels ?? true,
    powerGlow: overlayValues?.powerGlow ?? true,
    energyMeter: overlayValues?.energyMeter ?? true,
  };
  const noteLines = [
    "Power is the transfer rate right now; energy is the accumulated total P × t.",
    primaryFrame.brightnessLabel === "very bright"
      ? "This setting drives a strong load response because the source is delivering energy quickly."
      : primaryFrame.brightnessLabel === "bright"
        ? "Higher power makes the load respond more strongly even before much time has passed."
        : "At lower power, energy still accumulates over time, but the load response stays gentler.",
  ];
  const metricRows = [
    { label: "t", value: formatMeasurement(primaryFrame.time, "s") },
    { label: "V", value: formatMeasurement(primaryFrame.voltage, "V") },
    { label: "R_load", value: formatMeasurement(primaryFrame.loadResistance, "ohm") },
    { label: "I", value: formatMeasurement(primaryFrame.current, "A") },
    { label: "P", value: formatMeasurement(primaryFrame.power, "W") },
    { label: "E", value: formatMeasurement(primaryFrame.energy, "J") },
    { label: "state", value: primaryFrame.brightnessLabel },
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(241,102,89,0.1),rgba(30,166,162,0.08))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              One source, one resistive load, one honest time axis. The glow, current flow,
              power readout, and cumulative energy bar all come from the same live circuit
              state instead of from separate teaching widgets.
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
          <g transform="translate(12 10)">
            {renderLoop(secondaryFrame, { muted: true, dashed: true, glowOn: false })}
            {renderChargePackets(secondaryFrame, displayTime, true)}
            {drawChip({
              x: RIGHT_BUS_X + 14,
              y: 74,
              text: `${secondaryLabel} ghost`,
              tone: "ink",
              dashed: true,
            })}
          </g>
        ) : null}

        {renderLoop(primaryFrame, { glowOn: overlayState.powerGlow })}
        {renderChargePackets(primaryFrame, displayTime)}
        {renderPrimaryOverlays(primaryFrame, focusedOverlayId, overlayState)}

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
          {primaryLabel}: {formatMeasurement(primaryFrame.power, "W")} into the load
        </text>
        <text
          x={STAGE_LEFT + 18}
          y={STAGE_BOTTOM - 18}
          className="fill-ink-600 text-[12px]"
        >
          I = {formatNumber(primaryFrame.current)} A, P = {formatNumber(primaryFrame.power)} W,
          E = {formatNumber(primaryFrame.energy)} J after {formatNumber(primaryFrame.time)} s
        </text>

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel} circuit state` : "Circuit state"}
          rows={metricRows}
          noteLines={noteLines}
        />
      </svg>
    </section>
  );
}
