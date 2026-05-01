"use client";

import {
  formatMeasurement,
  sampleInternalResistanceTerminalVoltageState,
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

type InternalResistanceTerminalVoltageSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 920;
const HEIGHT = 390;
const STAGE_LEFT = 40;
const STAGE_TOP = 34;
const STAGE_RIGHT = 610;
const STAGE_BOTTOM = HEIGHT - 34;
const CARD_WIDTH = 236;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const BATTERY_X = 108;
const TOP_WIRE_Y = 114;
const BOTTOM_WIRE_Y = 274;
const INTERNAL_RESISTOR_X = 212;
const LOAD_RESISTOR_X = 420;
const RESISTOR_WIDTH = 108;
const RESISTOR_HEIGHT = 30;
const POWER_BAR_LEFT = STAGE_LEFT + 70;
const POWER_BAR_RIGHT = STAGE_RIGHT - 82;
const POWER_BAR_WIDTH = POWER_BAR_RIGHT - POWER_BAR_LEFT;
const POWER_BAR_LOAD_Y = STAGE_BOTTOM - 70;
const POWER_BAR_INTERNAL_Y = STAGE_BOTTOM - 34;

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.34;
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
  tone?: "teal" | "amber" | "coral" | "sky" | "ink";
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
    coral: {
      fill: "rgba(241,102,89,0.14)",
      stroke: "rgba(177,66,52,0.32)",
      text: "#9f3a2c",
    },
    sky: {
      fill: "rgba(78,166,223,0.14)",
      stroke: "rgba(29,111,159,0.32)",
      text: "#1d6f9f",
    },
    ink: {
      fill: "rgba(255,255,255,0.9)",
      stroke: "rgba(15,28,36,0.16)",
      text: "#0f1c24",
    },
  };
  const palette = toneMap[tone];
  const width = Math.max(78, text.length * 6.7 + 22);

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
      <text x="0" y="4" textAnchor="middle" className="text-[10px] font-semibold" fill={palette.text}>
        {text}
      </text>
    </g>
  );
}

function renderBattery(muted = false, dashed = false) {
  const midY = (TOP_WIRE_Y + BOTTOM_WIRE_Y) / 2;
  const positivePlateY = midY - 22;
  const negativePlateY = midY + 22;
  const stroke = muted ? "rgba(15,28,36,0.42)" : "#0f1c24";

  return (
    <g opacity={muted ? 0.56 : 1}>
      <line x1={BATTERY_X} x2={BATTERY_X} y1={TOP_WIRE_Y} y2={positivePlateY - 12} stroke={stroke} strokeWidth="3" strokeDasharray={dashed ? "7 5" : undefined} />
      <line x1={BATTERY_X} x2={BATTERY_X} y1={negativePlateY + 12} y2={BOTTOM_WIRE_Y} stroke={stroke} strokeWidth="3" strokeDasharray={dashed ? "7 5" : undefined} />
      <line x1={BATTERY_X - 12} x2={BATTERY_X + 12} y1={positivePlateY} y2={positivePlateY} stroke={stroke} strokeWidth="4" />
      <line x1={BATTERY_X - 7} x2={BATTERY_X + 7} y1={negativePlateY} y2={negativePlateY} stroke={stroke} strokeWidth="4" />
      <text x={BATTERY_X - 18} y={positivePlateY + 4} textAnchor="end" className="fill-ink-500 text-[10px] font-semibold">
        +
      </text>
      <text x={BATTERY_X - 18} y={negativePlateY + 4} textAnchor="end" className="fill-ink-500 text-[10px] font-semibold">
        -
      </text>
    </g>
  );
}

function renderResistor(options: {
  centerX: number;
  label: string;
  resistance: number;
  tone: "internal" | "load";
  muted?: boolean;
  dashed?: boolean;
}) {
  const { centerX, label, resistance, tone, muted = false, dashed = false } = options;
  const stroke = tone === "internal" ? "#f16659" : "#1d6f9f";

  return (
    <g opacity={muted ? 0.56 : 1}>
      <rect
        x={centerX - RESISTOR_WIDTH / 2}
        y={TOP_WIRE_Y - RESISTOR_HEIGHT / 2}
        width={RESISTOR_WIDTH}
        height={RESISTOR_HEIGHT}
        rx="14"
        fill="rgba(255,253,247,0.92)"
        stroke={stroke}
        strokeWidth="2.4"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <path
        d={`M ${centerX - 34} ${TOP_WIRE_Y}
            l 8 -10 l 10 20 l 10 -20 l 10 20 l 10 -20 l 8 10`}
        fill="none"
        stroke={stroke}
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x={centerX} y={TOP_WIRE_Y - 28} textAnchor="middle" className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]">
        {label}
      </text>
      <text x={centerX} y={TOP_WIRE_Y + 42} textAnchor="middle" className="fill-ink-950 text-[12px] font-semibold">
        {formatMeasurement(resistance, "ohm")}
      </text>
    </g>
  );
}

function buildFrame(source: SimulationParams, previewLoadResistance?: number) {
  return sampleInternalResistanceTerminalVoltageState({
    emf: source.emf,
    internalResistance: source.internalResistance,
    loadResistance: previewLoadResistance ?? source.loadResistance,
  });
}

export function InternalResistanceTerminalVoltageSimulation({
  concept,
  params,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: InternalResistanceTerminalVoltageSimulationProps) {
  const compareEnabled = Boolean(compare);
  const previewLoadResistance =
    graphPreview?.kind === "response" ? graphPreview.point.x : undefined;
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const liveFrame = buildFrame(params, previewLoadResistance);
  const frameA = compare
    ? buildFrame(compare.setupA, previewedSetup === "a" ? previewLoadResistance : undefined)
    : null;
  const frameB = compare
    ? buildFrame(compare.setupB, previewedSetup === "b" ? previewLoadResistance : undefined)
    : null;
  const primaryFrame = compare ? (previewedSetup === "a" ? frameA! : frameB!) : liveFrame;
  const secondaryFrame = compare ? (previewedSetup === "a" ? frameB! : frameA!) : null;
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
  const overlayState = {
    currentFlow: overlayValues?.currentFlow ?? true,
    voltageLabels: overlayValues?.voltageLabels ?? true,
    powerSplit: overlayValues?.powerSplit ?? true,
    idealReference: overlayValues?.idealReference ?? true,
  };

  const previewBadge =
    graphPreview?.kind === "response" ? (
      <span className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral-700">
        preview R_load = {formatMeasurement(graphPreview.point.x, "ohm")}
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
        {(compare?.labelA ?? "Setup A")}: V_terminal = {formatMeasurement(frameA?.terminalVoltage ?? 0, "V")}
      </span>
      <span className="rounded-full border border-amber-500/30 bg-amber-500/12 px-2 py-0.5 font-semibold text-amber-800">
        {(compare?.labelB ?? "Setup B")}: V_terminal = {formatMeasurement(frameB?.terminalVoltage ?? 0, "V")}
      </span>
    </div>
  ) : null;
  const metricRows = [
    { label: "E", value: formatMeasurement(primaryFrame.emf, "V") },
    { label: "r", value: formatMeasurement(primaryFrame.internalResistance, "ohm") },
    { label: "R", value: formatMeasurement(primaryFrame.loadResistance, "ohm") },
    { label: "I", value: formatMeasurement(primaryFrame.current, "A") },
    { label: "V_term", value: formatMeasurement(primaryFrame.terminalVoltage, "V") },
    { label: "Ir", value: formatMeasurement(primaryFrame.internalDrop, "V") },
    { label: "P_load", value: formatMeasurement(primaryFrame.loadPower, "W") },
    { label: "P_loss", value: formatMeasurement(primaryFrame.internalPower, "W") },
    { label: "eta", value: formatMeasurement(primaryFrame.efficiency * 100, "%") },
  ];
  const currentArrowWidth = 1.8 + Math.min(primaryFrame.current / 1.5, 1) * 4.1;
  const powerScale = Math.max(primaryFrame.loadPower + primaryFrame.internalPower, 0.001);
  const loadBarWidth = POWER_BAR_WIDTH * (primaryFrame.loadPower / powerScale);
  const internalBarWidth = POWER_BAR_WIDTH * (primaryFrame.internalPower / powerScale);

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(241,102,89,0.12),rgba(78,166,223,0.1))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              Keep one non-ideal source and one load on screen so emf, internal drop, terminal
              voltage, current, and power loss stay tied to the same one-loop circuit.
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
          <g transform="translate(8 8)" opacity="0.48">
            {renderBattery(true, true)}
            {renderResistor({
              centerX: INTERNAL_RESISTOR_X,
              label: "internal r",
              resistance: secondaryFrame.internalResistance,
              tone: "internal",
              muted: true,
              dashed: true,
            })}
            {renderResistor({
              centerX: LOAD_RESISTOR_X,
              label: "load R",
              resistance: secondaryFrame.loadResistance,
              tone: "load",
              muted: true,
              dashed: true,
            })}
            {drawChip({
              x: LOAD_RESISTOR_X,
              y: STAGE_TOP + 18,
              text: `${secondaryLabel} ghost`,
              tone: "ink",
              dashed: true,
            })}
          </g>
        ) : null}

        <line x1={BATTERY_X + 18} x2={INTERNAL_RESISTOR_X - RESISTOR_WIDTH / 2} y1={TOP_WIRE_Y} y2={TOP_WIRE_Y} stroke="#0f1c24" strokeWidth="3.4" strokeLinecap="round" />
        <line x1={INTERNAL_RESISTOR_X + RESISTOR_WIDTH / 2} x2={LOAD_RESISTOR_X - RESISTOR_WIDTH / 2} y1={TOP_WIRE_Y} y2={TOP_WIRE_Y} stroke="#0f1c24" strokeWidth="3.4" strokeLinecap="round" />
        <line x1={LOAD_RESISTOR_X + RESISTOR_WIDTH / 2} x2={STAGE_RIGHT - 36} y1={TOP_WIRE_Y} y2={TOP_WIRE_Y} stroke="#0f1c24" strokeWidth="3.4" strokeLinecap="round" />
        <line x1={STAGE_RIGHT - 36} x2={STAGE_RIGHT - 36} y1={TOP_WIRE_Y} y2={BOTTOM_WIRE_Y} stroke="#0f1c24" strokeWidth="3.4" strokeLinecap="round" />
        <line x1={STAGE_RIGHT - 36} x2={BATTERY_X} y1={BOTTOM_WIRE_Y} y2={BOTTOM_WIRE_Y} stroke="#0f1c24" strokeWidth="3.4" strokeLinecap="round" />

        {renderBattery()}
        {renderResistor({
          centerX: INTERNAL_RESISTOR_X,
          label: "internal r",
          resistance: primaryFrame.internalResistance,
          tone: "internal",
        })}
        {renderResistor({
          centerX: LOAD_RESISTOR_X,
          label: "load R",
          resistance: primaryFrame.loadResistance,
          tone: "load",
        })}

        <text x={STAGE_LEFT + 18} y={STAGE_TOP + 24} className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]">
          Non-ideal source loop
        </text>
        <text x={STAGE_LEFT + 18} y={STAGE_TOP + 46} className="fill-ink-950 text-[15px] font-semibold">
          {primaryLabel}: terminal voltage {formatMeasurement(primaryFrame.terminalVoltage, "V")} under load
        </text>

        {overlayState.currentFlow ? (
          <g opacity={overlayWeight(focusedOverlayId, "currentFlow")}>
            {drawArrow({
              x1: BATTERY_X + 30,
              y1: TOP_WIRE_Y - 28,
              x2: STAGE_RIGHT - 60,
              y2: TOP_WIRE_Y - 28,
              stroke: "#1ea6a2",
              strokeWidth: currentArrowWidth,
            })}
            {drawChip({
              x: 320,
              y: TOP_WIRE_Y - 52,
              text: `I = ${formatMeasurement(primaryFrame.current, "A")}`,
              tone: "teal",
            })}
          </g>
        ) : null}

        {overlayState.voltageLabels ? (
          <g opacity={overlayWeight(focusedOverlayId, "voltageLabels")}>
            {drawChip({
              x: BATTERY_X + 42,
              y: 184,
              text: `emf = ${formatMeasurement(primaryFrame.emf, "V")}`,
              tone: "teal",
            })}
            {drawChip({
              x: INTERNAL_RESISTOR_X,
              y: TOP_WIRE_Y + 52,
              text: `internal drop = ${formatMeasurement(primaryFrame.internalDrop, "V")}`,
              tone: "coral",
            })}
            {drawChip({
              x: LOAD_RESISTOR_X,
              y: TOP_WIRE_Y + 52,
              text: `terminal = ${formatMeasurement(primaryFrame.terminalVoltage, "V")}`,
              tone: "sky",
            })}
          </g>
        ) : null}

        {overlayState.powerSplit ? (
          <g opacity={overlayWeight(focusedOverlayId, "powerSplit")}>
            <text x={POWER_BAR_LEFT} y={POWER_BAR_LOAD_Y - 10} className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]">
              Power split
            </text>
            <rect x={POWER_BAR_LEFT} y={POWER_BAR_LOAD_Y} width={POWER_BAR_WIDTH} height="18" rx="9" fill="rgba(15,28,36,0.06)" />
          </g>
        ) : null}

        {overlayState.powerSplit ? (
          <g opacity={overlayWeight(focusedOverlayId, "powerSplit")}>
            <rect x={POWER_BAR_LEFT} y={POWER_BAR_LOAD_Y} width={loadBarWidth} height="18" rx="9" fill="rgba(30,166,162,0.72)" />
            <rect x={POWER_BAR_LEFT} y={POWER_BAR_INTERNAL_Y} width={internalBarWidth} height="18" rx="9" fill="rgba(241,102,89,0.72)" />
            {drawChip({
              x: POWER_BAR_LEFT + loadBarWidth / 2,
              y: POWER_BAR_LOAD_Y + 9,
              text: `load = ${formatMeasurement(primaryFrame.loadPower, "W")}`,
              tone: "teal",
            })}
            {drawChip({
              x: POWER_BAR_LEFT + internalBarWidth / 2,
              y: POWER_BAR_INTERNAL_Y + 9,
              text: `loss = ${formatMeasurement(primaryFrame.internalPower, "W")}`,
              tone: "coral",
            })}
          </g>
        ) : null}

        {overlayState.idealReference ? (
          <g opacity={overlayWeight(focusedOverlayId, "idealReference")}>
            {drawChip({
              x: STAGE_RIGHT - 100,
              y: STAGE_TOP + 32,
              text: `ideal-source limit: V_term -> ${formatMeasurement(primaryFrame.emf, "V")}`,
              tone: "ink",
            })}
          </g>
        ) : null}

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel} source state` : "Source state"}
          rows={metricRows}
          noteLines={[
            primaryFrame.internalResistance <= 0.3
              ? "This setup is close to the ideal-source limit, so the terminal voltage stays near the emf."
              : "Non-zero internal resistance means part of the emf is lost inside the source whenever current flows.",
            primaryFrame.loadResistance <= 2
              ? "A heavier load pulls more current, which increases both the internal voltage drop and the wasted power."
              : "A lighter load keeps the current smaller, so the terminal voltage sits closer to the emf.",
            "Ideal-source thinking is still useful, but this bench shows exactly where the simplification breaks.",
          ]}
        />
      </svg>
    </section>
  );
}
