"use client";

import {
  clamp,
  formatMeasurement,
  formatNumber,
  sampleRcChargingDischargingState,
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

type RcChargingDischargingSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 900;
const HEIGHT = 390;
const STAGE_LEFT = 40;
const STAGE_TOP = 34;
const STAGE_RIGHT = 610;
const STAGE_BOTTOM = HEIGHT - 34;
const CARD_WIDTH = 236;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const BATTERY_X = 96;
const SWITCH_X = 170;
const RESISTOR_X = 302;
const CAPACITOR_X = 498;
const TOP_WIRE_Y = 108;
const BOTTOM_WIRE_Y = 272;
const RESISTOR_WIDTH = 124;
const RESISTOR_HEIGHT = 30;
const CAP_PLATE_HEIGHT = 70;
const CAP_GAP = 22;
const CHARGE_BAR_X = STAGE_RIGHT - 52;
const CHARGE_BAR_TOP = STAGE_TOP + 36;
const CHARGE_BAR_HEIGHT = 118;
const ENERGY_BAR_TOP = CHARGE_BAR_TOP + 152;

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

function renderBattery(muted = false, dashed = false) {
  const midY = (TOP_WIRE_Y + BOTTOM_WIRE_Y) / 2;
  const positivePlateY = midY - 22;
  const negativePlateY = midY + 22;
  const stroke = muted ? "rgba(15,28,36,0.38)" : "#0f1c24";

  return (
    <g opacity={muted ? 0.52 : 1}>
      <line
        x1={BATTERY_X}
        x2={BATTERY_X}
        y1={TOP_WIRE_Y}
        y2={positivePlateY - 12}
        stroke={stroke}
        strokeWidth="3"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <line
        x1={BATTERY_X}
        x2={BATTERY_X}
        y1={negativePlateY + 12}
        y2={BOTTOM_WIRE_Y}
        stroke={stroke}
        strokeWidth="3"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
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

function renderResistor(options: { resistance: number; muted?: boolean; dashed?: boolean }) {
  const { resistance, muted = false, dashed = false } = options;
  const stroke = muted ? "rgba(177,66,52,0.42)" : "#b14234";

  return (
    <g opacity={muted ? 0.52 : 1}>
      <rect
        x={RESISTOR_X - RESISTOR_WIDTH / 2}
        y={TOP_WIRE_Y - RESISTOR_HEIGHT / 2}
        width={RESISTOR_WIDTH}
        height={RESISTOR_HEIGHT}
        rx="14"
        fill="rgba(255,248,240,0.92)"
        stroke={stroke}
        strokeWidth="2.4"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <path
        d={`M ${RESISTOR_X - 34} ${TOP_WIRE_Y}
            l 8 -10 l 10 20 l 10 -20 l 10 20 l 10 -20 l 8 10`}
        fill="none"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x={RESISTOR_X} y={TOP_WIRE_Y - 28} textAnchor="middle" className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]">
        Resistor R
      </text>
      <text x={RESISTOR_X} y={TOP_WIRE_Y + 42} textAnchor="middle" className="fill-ink-950 text-[12px] font-semibold">
        {formatMeasurement(resistance, "ohm")}
      </text>
    </g>
  );
}

function renderCapacitor(options: {
  fraction: number;
  capacitance: number;
  muted?: boolean;
  dashed?: boolean;
}) {
  const { fraction, capacitance, muted = false, dashed = false } = options;
  const leftPlateX = CAPACITOR_X - CAP_GAP / 2;
  const rightPlateX = CAPACITOR_X + CAP_GAP / 2;
  const topY = TOP_WIRE_Y - CAP_PLATE_HEIGHT / 2;
  const bottomY = TOP_WIRE_Y + CAP_PLATE_HEIGHT / 2;
  const markerCount = clamp(Math.round(3 + fraction * 5), 1, 8);
  const markerStep = (CAP_PLATE_HEIGHT - 18) / Math.max(markerCount - 1, 1);

  return (
    <g opacity={muted ? 0.52 : 1}>
      <line x1={leftPlateX} x2={leftPlateX} y1={topY} y2={bottomY} stroke="#b87000" strokeWidth="4" strokeDasharray={dashed ? "7 5" : undefined} />
      <line x1={rightPlateX} x2={rightPlateX} y1={topY} y2={bottomY} stroke="#1d6f9f" strokeWidth="4" strokeDasharray={dashed ? "7 5" : undefined} />
      <text x={CAPACITOR_X} y={topY - 18} textAnchor="middle" className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]">
        Capacitor C
      </text>
      <text x={CAPACITOR_X} y={bottomY + 22} textAnchor="middle" className="fill-ink-950 text-[12px] font-semibold">
        {formatMeasurement(capacitance, "F")}
      </text>
      {Array.from({ length: markerCount }, (_, index) => {
        const y = topY + 9 + index * markerStep;
        return (
          <g key={`charge-${index}`}>
            <circle cx={leftPlateX - 15} cy={y} r="7.5" fill="rgba(240,171,60,0.82)" />
            <text x={leftPlateX - 15} y={y + 3} textAnchor="middle" className="fill-white text-[10px] font-semibold">
              +
            </text>
            <circle cx={rightPlateX + 15} cy={y} r="7.5" fill="rgba(78,166,223,0.82)" />
            <text x={rightPlateX + 15} y={y + 3} textAnchor="middle" className="fill-white text-[10px] font-semibold">
              -
            </text>
          </g>
        );
      })}
    </g>
  );
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
  const width = Math.max(72, text.length * 6.7 + 22);

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

function buildFrame(source: SimulationParams, time: number) {
  return sampleRcChargingDischargingState({
    sourceVoltage: source.sourceVoltage,
    resistance: source.resistance,
    capacitance: source.capacitance,
    charging: source.charging,
  }, time);
}

function currentStrokeWidth(currentMagnitude: number, initialCurrent: number) {
  const ratio = initialCurrent > 0 ? currentMagnitude / initialCurrent : 0;
  return 1.8 + clamp(ratio, 0, 1) * 4.1;
}

function renderPackets(frame: ReturnType<typeof sampleRcChargingDischargingState>, muted = false) {
  const topStart = frame.current >= 0 ? SWITCH_X + 8 : CAPACITOR_X - 26;
  const topEnd = frame.current >= 0 ? CAPACITOR_X - 26 : SWITCH_X + 8;
  const packetCount = 6;
  const totalLength = Math.abs(topEnd - topStart);
  const speed = 42 + frame.currentFraction * 88;

  return (
    <g opacity={muted ? 0.3 : 0.82}>
      {Array.from({ length: packetCount }, (_, index) => {
        const offset = ((frame.time * speed) + (totalLength / packetCount) * index) % Math.max(totalLength, 1);
        const x = frame.current >= 0 ? topStart + offset : topStart - offset;
        return (
          <circle
            key={`packet-${index}`}
            cx={x}
            cy={TOP_WIRE_Y}
            r={muted ? 3 : 4}
            fill={muted ? "rgba(30,166,162,0.32)" : "rgba(30,166,162,0.82)"}
          />
        );
      })}
    </g>
  );
}

export function RcChargingDischargingSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: RcChargingDischargingSimulationProps) {
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  const compareEnabled = Boolean(compare);
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const liveFrame = buildFrame(params, displayTime);
  const frameA = compare ? buildFrame(compare.setupA, displayTime) : null;
  const frameB = compare ? buildFrame(compare.setupB, displayTime) : null;
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
    tauMarkers: overlayValues?.tauMarkers ?? true,
    chargeCue: overlayValues?.chargeCue ?? true,
    energyStore: overlayValues?.energyStore ?? true,
  };
  const topWireStartX = BATTERY_X + 18;
  const topWireMidX = RESISTOR_X - RESISTOR_WIDTH / 2;
  const topWireEndX = CAPACITOR_X - CAP_GAP / 2 - 18;
  const currentArrowStart = primaryFrame.current >= 0 ? SWITCH_X + 8 : CAPACITOR_X - 28;
  const currentArrowEnd = primaryFrame.current >= 0 ? CAPACITOR_X - 28 : SWITCH_X + 8;
  const currentArrowStroke = currentStrokeWidth(
    primaryFrame.currentMagnitude,
    primaryFrame.sourceVoltage / Math.max(primaryFrame.resistance, 0.001),
  );
  const tauBarLeft = STAGE_LEFT + 48;
  const tauBarRight = STAGE_RIGHT - 88;
  const tauBarWidth = tauBarRight - tauBarLeft;
  const tauBarY = STAGE_BOTTOM - 22;
  const normalizedMarker = clamp(primaryFrame.time / Math.max(primaryFrame.timeConstant * 5, 0.001), 0, 1);
  const markerX = tauBarLeft + tauBarWidth * normalizedMarker;
  const chargeFill = CHARGE_BAR_HEIGHT * primaryFrame.chargeFraction;
  const energyFill = CHARGE_BAR_HEIGHT * primaryFrame.energyFraction;
  const previewBadge =
    graphPreview?.kind === "time" ? (
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
        preview t = {formatNumber(graphPreview.time)} s
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
        {(compare?.labelA ?? "Setup A")}: tau = {formatMeasurement(frameA?.timeConstant ?? 0, "s")}
      </span>
      <span className="rounded-full border border-amber-500/30 bg-amber-500/12 px-2 py-0.5 font-semibold text-amber-800">
        {(compare?.labelB ?? "Setup B")}: tau = {formatMeasurement(frameB?.timeConstant ?? 0, "s")}
      </span>
    </div>
  ) : null;
  const metricRows = [
    { label: "mode", value: primaryFrame.mode },
    { label: "t", value: formatMeasurement(primaryFrame.time, "s") },
    { label: "tau", value: formatMeasurement(primaryFrame.timeConstant, "s") },
    { label: "V_s", value: formatMeasurement(primaryFrame.sourceVoltage, "V") },
    { label: "R", value: formatMeasurement(primaryFrame.resistance, "ohm") },
    { label: "C", value: formatMeasurement(primaryFrame.capacitance, "F") },
    { label: "V_C", value: formatMeasurement(primaryFrame.capacitorVoltage, "V") },
    { label: "I", value: formatMeasurement(primaryFrame.current, "A") },
    { label: "U", value: formatMeasurement(primaryFrame.storedEnergy, "J") },
  ];
  const noteLines = [
    primaryFrame.charging
      ? "Charging starts with the largest current and a zero capacitor voltage, then the current fades as V_C rises."
      : "Discharging starts with the capacitor already charged, then the current reverses and fades as the stored energy drains away.",
    primaryFrame.normalizedTime < 1
      ? "At one time constant, the response is partway through the change rather than complete."
      : primaryFrame.normalizedTime < 3
        ? "A few time constants in, the transient is still visible but the biggest change is already behind you."
        : "Several time constants in, the circuit is close to its final state.",
    "Larger R or larger C makes the response slower because both increase tau = RC.",
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(78,166,223,0.12),rgba(30,166,162,0.08))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              Keep one resistor-capacitor loop on screen so the capacitor voltage, current,
              stored energy, and time constant all stay tied to the same charging or discharging
              setup.
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
            {renderBattery(!secondaryFrame.charging, true)}
            {renderResistor({ resistance: secondaryFrame.resistance, muted: true, dashed: true })}
            {renderCapacitor({
              fraction: secondaryFrame.chargeFraction,
              capacitance: secondaryFrame.capacitance,
              muted: true,
              dashed: true,
            })}
            {drawChip({
              x: CAPACITOR_X,
              y: STAGE_TOP + 18,
              text: `${secondaryLabel} ghost`,
              tone: "ink",
              dashed: true,
            })}
          </g>
        ) : null}

        <line x1={topWireStartX} x2={topWireMidX} y1={TOP_WIRE_Y} y2={TOP_WIRE_Y} stroke="#0f1c24" strokeWidth="3.4" strokeLinecap="round" />
        <line x1={RESISTOR_X + RESISTOR_WIDTH / 2} x2={topWireEndX} y1={TOP_WIRE_Y} y2={TOP_WIRE_Y} stroke="#0f1c24" strokeWidth="3.4" strokeLinecap="round" />
        <line x1={CAPACITOR_X + CAP_GAP / 2} x2={CAPACITOR_X + CAP_GAP / 2} y1={TOP_WIRE_Y} y2={BOTTOM_WIRE_Y} stroke="#0f1c24" strokeWidth="3.4" strokeLinecap="round" />
        <line x1={CAPACITOR_X + CAP_GAP / 2} x2={BATTERY_X} y1={BOTTOM_WIRE_Y} y2={BOTTOM_WIRE_Y} stroke="#0f1c24" strokeWidth="3.4" strokeLinecap="round" />
        {renderBattery(!primaryFrame.charging)}
        {renderResistor({ resistance: primaryFrame.resistance })}
        {renderCapacitor({ fraction: primaryFrame.chargeFraction, capacitance: primaryFrame.capacitance })}

        <text x={STAGE_LEFT + 18} y={STAGE_TOP + 24} className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]">
          Live RC bench
        </text>
        <text x={STAGE_LEFT + 18} y={STAGE_TOP + 46} className="fill-ink-950 text-[15px] font-semibold">
          {primaryLabel}: {primaryFrame.charging ? "charging toward the source" : "discharging through the resistor"}
        </text>

        {overlayState.currentFlow ? (
          <g opacity={overlayWeight(focusedOverlayId, "currentFlow")}>
            {drawArrow({
              x1: currentArrowStart,
              y1: TOP_WIRE_Y - 26,
              x2: currentArrowEnd,
              y2: TOP_WIRE_Y - 26,
              stroke: "#1ea6a2",
              strokeWidth: currentArrowStroke,
            })}
            {drawChip({
              x: RESISTOR_X,
              y: TOP_WIRE_Y - 48,
              text: `I = ${formatMeasurement(primaryFrame.current, "A")}`,
              tone: "teal",
            })}
            {renderPackets(primaryFrame)}
          </g>
        ) : null}

        {overlayState.voltageLabels ? (
          <g opacity={overlayWeight(focusedOverlayId, "voltageLabels")}>
            {drawChip({
              x: BATTERY_X + 44,
              y: 186,
              text: `Source = ${formatMeasurement(primaryFrame.sourceVoltage, "V")}`,
              tone: "teal",
            })}
            {drawChip({
              x: RESISTOR_X,
              y: TOP_WIRE_Y + 50,
              text: `V_R = ${formatMeasurement(primaryFrame.resistorVoltage, "V")}`,
              tone: "amber",
            })}
            {drawChip({
              x: CAPACITOR_X,
              y: TOP_WIRE_Y + 50,
              text: `V_C = ${formatMeasurement(primaryFrame.capacitorVoltage, "V")}`,
              tone: "sky",
            })}
          </g>
        ) : null}

        {overlayState.tauMarkers ? (
          <g opacity={overlayWeight(focusedOverlayId, "tauMarkers")}>
            <text x={tauBarLeft} y={tauBarY - 18} className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]">
              Time marks
            </text>
            <line x1={tauBarLeft} x2={tauBarRight} y1={tauBarY} y2={tauBarY} stroke="rgba(15,28,36,0.28)" strokeWidth="2" strokeLinecap="round" />
            {[1, 2, 3, 4, 5].map((multiple) => {
              const x = tauBarLeft + (tauBarWidth * multiple) / 5;
              return (
                <g key={multiple}>
                  <line x1={x} x2={x} y1={tauBarY - 6} y2={tauBarY + 6} stroke="rgba(15,28,36,0.46)" strokeWidth="1.4" />
                  <text x={x} y={tauBarY + 20} textAnchor="middle" className="fill-ink-600 text-[10px] font-semibold">
                    {multiple}tau
                  </text>
                </g>
              );
            })}
            <circle cx={markerX} cy={tauBarY} r="5" fill="#1ea6a2" />
            {drawChip({
              x: markerX,
              y: tauBarY - 24,
              text: `t/tau = ${formatNumber(primaryFrame.normalizedTime)}`,
              tone: "ink",
            })}
          </g>
        ) : null}

        {overlayState.chargeCue ? (
          <g opacity={overlayWeight(focusedOverlayId, "chargeCue")}>
            <rect x={CHARGE_BAR_X} y={CHARGE_BAR_TOP} width="22" height={CHARGE_BAR_HEIGHT} rx="11" fill="rgba(255,255,255,0.56)" stroke="rgba(29,111,159,0.24)" />
            <rect
              x={CHARGE_BAR_X}
              y={CHARGE_BAR_TOP + (CHARGE_BAR_HEIGHT - chargeFill)}
              width="22"
              height={chargeFill}
              rx="11"
              fill="rgba(78,166,223,0.72)"
            />
            <text x={CHARGE_BAR_X + 11} y={CHARGE_BAR_TOP - 12} textAnchor="middle" className="fill-sky-800 text-[11px] font-semibold">
              Q
            </text>
          </g>
        ) : null}

        {overlayState.energyStore ? (
          <g opacity={overlayWeight(focusedOverlayId, "energyStore")}>
            <rect x={CHARGE_BAR_X} y={ENERGY_BAR_TOP} width="22" height={CHARGE_BAR_HEIGHT} rx="11" fill="rgba(255,255,255,0.56)" stroke="rgba(184,112,0,0.24)" />
            <rect
              x={CHARGE_BAR_X}
              y={ENERGY_BAR_TOP + (CHARGE_BAR_HEIGHT - energyFill)}
              width="22"
              height={energyFill}
              rx="11"
              fill="rgba(240,171,60,0.72)"
            />
            <text x={CHARGE_BAR_X + 11} y={ENERGY_BAR_TOP - 12} textAnchor="middle" className="fill-amber-800 text-[11px] font-semibold">
              U
            </text>
          </g>
        ) : null}

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel} RC state` : "RC state"}
          rows={metricRows}
          noteLines={noteLines}
        />
      </svg>
    </section>
  );
}
