"use client";

import {
  formatNumber,
  sampleSpecificHeatPhaseChangeState,
  SPECIFIC_HEAT_PHASE_CHANGE_MAX_STARTING_TEMPERATURE,
  SPECIFIC_HEAT_PHASE_CHANGE_MIN_STARTING_TEMPERATURE,
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

type SpecificHeatPhaseChangeSimulationProps = {
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
const HEIGHT = 420;
const STAGE_X = 36;
const STAGE_Y = 40;
const STAGE_WIDTH = 590;
const STAGE_HEIGHT = 304;
const CARD_X = 650;
const CARD_Y = 22;
const CARD_WIDTH = 224;
const SAMPLE_X = 126;
const SAMPLE_Y = 92;
const SAMPLE_WIDTH = 190;
const SAMPLE_HEIGHT = 188;
const THERMOMETER_X = 358;
const THERMOMETER_Y = 86;
const THERMOMETER_WIDTH = 28;
const THERMOMETER_HEIGHT = 210;
const LATENT_BAR_X = STAGE_X + 18;
const LATENT_BAR_Y = STAGE_Y + STAGE_HEIGHT - 66;
const LATENT_BAR_WIDTH = STAGE_WIDTH - 36;
const ENERGY_BAR_X = STAGE_X + 18;
const ENERGY_BAR_Y = STAGE_Y + STAGE_HEIGHT - 32;
const ENERGY_BAR_WIDTH = STAGE_WIDTH - 36;

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.3;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function drawChip(options: {
  x: number;
  y: number;
  text: string;
  tone?: "teal" | "coral" | "amber" | "sky" | "ink";
  dashed?: boolean;
  muted?: boolean;
}) {
  const { x, y, text, tone = "ink", dashed = false, muted = false } = options;
  const palette = {
    teal: {
      fill: "rgba(30,166,162,0.14)",
      stroke: "rgba(21,122,118,0.32)",
      text: "#157a76",
    },
    coral: {
      fill: "rgba(241,102,89,0.14)",
      stroke: "rgba(177,66,52,0.3)",
      text: "#9f3a2c",
    },
    amber: {
      fill: "rgba(240,171,60,0.16)",
      stroke: "rgba(184,112,0,0.32)",
      text: "#8e5800",
    },
    sky: {
      fill: "rgba(78,166,223,0.14)",
      stroke: "rgba(29,111,159,0.28)",
      text: "#1d6f9f",
    },
    ink: {
      fill: "rgba(255,255,255,0.9)",
      stroke: "rgba(15,28,36,0.16)",
      text: "#0f1c24",
    },
  }[tone];
  const width = Math.max(84, text.length * 6.6 + 18);

  return (
    <g transform={`translate(${x} ${y})`} opacity={muted ? 0.6 : 1}>
      <rect
        x={-width / 2}
        y="-12"
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

function resolveThermometerY(temperature: number) {
  const ratio =
    (temperature - SPECIFIC_HEAT_PHASE_CHANGE_MIN_STARTING_TEMPERATURE) /
    (SPECIFIC_HEAT_PHASE_CHANGE_MAX_STARTING_TEMPERATURE -
      SPECIFIC_HEAT_PHASE_CHANGE_MIN_STARTING_TEMPERATURE);

  return (
    THERMOMETER_Y +
    THERMOMETER_HEIGHT -
    clamp01(ratio) * THERMOMETER_HEIGHT
  );
}

function buildPreviewSource(
  source: SimulationParams,
  preview: GraphStagePreview | null | undefined,
) {
  if (!preview || preview.kind !== "response") {
    return source;
  }

  if (preview.graphId === "specific-heat-response") {
    return {
      ...source,
      specificHeat: preview.point.x,
    };
  }

  if (preview.graphId === "latent-response") {
    return {
      ...source,
      latentHeat: preview.point.x,
    };
  }

  return source;
}

function resolveFrame(
  source: SimulationParams,
  time: number,
  graphPreview?: GraphStagePreview | null,
) {
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  return sampleSpecificHeatPhaseChangeState(
    buildPreviewSource(source, graphPreview),
    displayTime,
  );
}

function renderEnergyPackets(options: {
  direction: "heating" | "cooling" | "idle";
  magnitude: number;
  time: number;
  muted?: boolean;
  dashed?: boolean;
}) {
  const { direction, magnitude, time, muted = false, dashed = false } = options;

  if (direction === "idle" || magnitude < 0.02) {
    return null;
  }

  const forward = direction === "heating";
  const color = forward ? "#f16659" : "#4ea6df";
  const startX = SAMPLE_X - 96;
  const endX = SAMPLE_X - 12;
  const speed = 0.28 + Math.min(0.35, magnitude / 22);

  return (
    <g opacity={muted ? 0.46 : 1}>
      <line
        x1={startX}
        y1={SAMPLE_Y + SAMPLE_HEIGHT / 2}
        x2={endX}
        y2={SAMPLE_Y + SAMPLE_HEIGHT / 2}
        stroke="rgba(15,28,36,0.16)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {Array.from({ length: 4 }, (_, index) => {
        const progress = (time * speed + index * 0.22) % 1;
        const t = forward ? progress : 1 - progress;
        const x = startX + (endX - startX) * t;

        return (
          <circle
            key={`packet-${index}`}
            cx={x}
            cy={SAMPLE_Y + SAMPLE_HEIGHT / 2}
            r={5}
            fill={color}
            opacity={0.86 - index * 0.1}
            strokeDasharray={dashed ? "5 4" : undefined}
          />
        );
      })}
      <text
        x={startX - 4}
        y={SAMPLE_Y + SAMPLE_HEIGHT / 2 - 14}
        textAnchor="end"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        {forward ? "heater" : "cooler"}
      </text>
    </g>
  );
}

function renderBench(
  frame: ReturnType<typeof sampleSpecificHeatPhaseChangeState>,
  displayTime: number,
  overlayState: Record<string, boolean>,
  focusedOverlayId: string | null | undefined,
  options?: {
    muted?: boolean;
    dashed?: boolean;
    offsetX?: number;
    offsetY?: number;
    gradientId?: string;
  },
) {
  const {
    muted = false,
    dashed = false,
    offsetX = 0,
    offsetY = 0,
    gradientId = "phase-mixture-fill",
  } = options ?? {};
  const fillRatio = clamp01(frame.phaseFraction);
  const phaseLineY = resolveThermometerY(frame.phaseChangeTemperature);
  const markerY = resolveThermometerY(frame.temperature);
  const capacityWeight = overlayWeight(focusedOverlayId, "capacityCue");
  const shelfWeight = overlayWeight(focusedOverlayId, "shelfCue");
  const energyWeight = overlayWeight(focusedOverlayId, "energySplit");
  const guideWeight = overlayWeight(focusedOverlayId, "curveGuide");
  const absoluteTotal =
    Math.abs(frame.sensibleEnergyChange) + Math.abs(frame.latentEnergyChange);
  const sensibleWidth =
    absoluteTotal > 0.001
      ? ENERGY_BAR_WIDTH * (Math.abs(frame.sensibleEnergyChange) / absoluteTotal)
      : 0;
  const latentWidth = Math.max(0, ENERGY_BAR_WIDTH - sensibleWidth);
  const sampleFill =
    frame.stageLabel === "solid-like"
      ? "rgba(78,166,223,0.72)"
      : frame.stageLabel === "liquid-like"
        ? "rgba(240,171,60,0.76)"
        : `url(#${gradientId})`;

  return (
    <g transform={`translate(${offsetX} ${offsetY})`} opacity={muted ? 0.54 : 1}>
      <defs>
        <linearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(78,166,223,0.68)" />
          <stop offset={`${Math.max(0, 100 - fillRatio * 100)}%`} stopColor="rgba(78,166,223,0.68)" />
          <stop offset={`${Math.max(0, 100 - fillRatio * 100)}%`} stopColor="rgba(240,171,60,0.76)" />
          <stop offset="100%" stopColor="rgba(240,171,60,0.76)" />
        </linearGradient>
      </defs>

      <rect
        x={STAGE_X}
        y={STAGE_Y}
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
        rx="28"
        fill={muted ? "rgba(255,255,255,0.5)" : "rgba(255,252,247,0.95)"}
        stroke={muted ? "rgba(15,28,36,0.16)" : "rgba(15,28,36,0.1)"}
        strokeWidth="1.4"
        strokeDasharray={dashed ? "8 5" : undefined}
      />

      <text
        x={STAGE_X + 18}
        y={STAGE_Y + 24}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
      >
        Thermal bench
      </text>
      <text
        x={STAGE_X + 18}
        y={STAGE_Y + 46}
        className="fill-ink-950 text-[15px] font-semibold"
      >
        {frame.stageLabel}
      </text>

      {renderEnergyPackets({
        direction: frame.powerDirectionLabel,
        magnitude: Math.abs(frame.heaterPower),
        time: displayTime,
        muted,
        dashed,
      })}

      <rect
        x={SAMPLE_X}
        y={SAMPLE_Y}
        width={SAMPLE_WIDTH}
        height={SAMPLE_HEIGHT}
        rx="28"
        fill={muted ? "rgba(255,255,255,0.36)" : "rgba(247,251,252,0.94)"}
        stroke={muted ? "rgba(15,28,36,0.16)" : "rgba(15,28,36,0.12)"}
        strokeWidth="2"
        strokeDasharray={dashed ? "8 5" : undefined}
      />
      <rect
        x={SAMPLE_X + 12}
        y={SAMPLE_Y + 12}
        width={SAMPLE_WIDTH - 24}
        height={SAMPLE_HEIGHT - 24}
        rx="22"
        fill={sampleFill}
        opacity={0.95}
      />
      {frame.stageLabel === "phase-change shelf" ? (
        <line
          x1={SAMPLE_X + 12}
          x2={SAMPLE_X + SAMPLE_WIDTH - 12}
          y1={SAMPLE_Y + 12 + (1 - fillRatio) * (SAMPLE_HEIGHT - 24)}
          y2={SAMPLE_Y + 12 + (1 - fillRatio) * (SAMPLE_HEIGHT - 24)}
          stroke="rgba(255,255,255,0.95)"
          strokeWidth="2"
          strokeDasharray={dashed ? "6 4" : undefined}
        />
      ) : null}

      <text
        x={SAMPLE_X + 18}
        y={SAMPLE_Y + 24}
        className="fill-white text-[11px] font-semibold uppercase tracking-[0.18em]"
      >
        sample
      </text>
      <text
        x={SAMPLE_X + 18}
        y={SAMPLE_Y + 46}
        className="fill-white/90 text-[12px]"
      >
        same energy input can change T or phase fraction
      </text>

      <rect
        x={THERMOMETER_X}
        y={THERMOMETER_Y}
        width={THERMOMETER_WIDTH}
        height={THERMOMETER_HEIGHT}
        rx="14"
        fill="rgba(255,255,255,0.9)"
        stroke="rgba(15,28,36,0.14)"
        strokeWidth="1.5"
      />
      <rect
        x={THERMOMETER_X + 8}
        y={markerY}
        width={THERMOMETER_WIDTH - 16}
        height={THERMOMETER_Y + THERMOMETER_HEIGHT - markerY}
        rx="6"
        fill={frame.temperature >= frame.phaseChangeTemperature ? "rgba(241,102,89,0.75)" : "rgba(78,166,223,0.72)"}
      />
      <circle
        cx={THERMOMETER_X + THERMOMETER_WIDTH / 2}
        cy={THERMOMETER_Y + THERMOMETER_HEIGHT + 12}
        r="14"
        fill={frame.temperature >= frame.phaseChangeTemperature ? "rgba(241,102,89,0.8)" : "rgba(78,166,223,0.8)"}
      />

      {overlayState.curveGuide ? (
        <g opacity={guideWeight}>
          <line
            x1={SAMPLE_X + SAMPLE_WIDTH + 16}
            x2={THERMOMETER_X + THERMOMETER_WIDTH + 98}
            y1={phaseLineY}
            y2={phaseLineY}
            stroke="rgba(240,171,60,0.75)"
            strokeWidth="2"
            strokeDasharray={dashed ? "6 4" : "8 6"}
          />
          <line
            x1={SAMPLE_X}
            x2={SAMPLE_X + SAMPLE_WIDTH}
            y1={phaseLineY}
            y2={phaseLineY}
            stroke="rgba(240,171,60,0.5)"
            strokeWidth="2"
            strokeDasharray={dashed ? "6 4" : "8 6"}
          />
          {drawChip({
            x: THERMOMETER_X + 120,
            y: phaseLineY,
            text: `phase T = ${formatNumber(frame.phaseChangeTemperature)} degC`,
            tone: "amber",
            dashed,
            muted,
          })}
        </g>
      ) : null}

      {drawChip({
        x: SAMPLE_X + 48,
        y: SAMPLE_Y - 22,
        text: `m = ${formatNumber(frame.mass)} kg`,
        tone: "ink",
        dashed,
        muted,
      })}
      {drawChip({
        x: SAMPLE_X + 166,
        y: SAMPLE_Y - 22,
        text: `c = ${formatNumber(frame.specificHeat)}`,
        tone: "teal",
        dashed,
        muted,
      })}
      {drawChip({
        x: THERMOMETER_X + 16,
        y: THERMOMETER_Y - 18,
        text: `P = ${formatNumber(frame.heaterPower)} kJ/min`,
        tone: frame.powerDirectionLabel === "cooling" ? "sky" : "coral",
        dashed,
        muted,
      })}
      {drawChip({
        x: THERMOMETER_X + THERMOMETER_WIDTH + 66,
        y: markerY,
        text: `T = ${formatNumber(frame.temperature)} degC`,
        tone: "coral",
        dashed,
        muted,
      })}

      {overlayState.capacityCue ? (
        <g opacity={capacityWeight}>
          {drawChip({
            x: 474,
            y: 116,
            text: `m c = ${formatNumber(frame.thermalCapacity)} kJ/degC`,
            tone: "teal",
            dashed,
            muted,
          })}
          {drawChip({
            x: 478,
            y: 148,
            text: `dT/dt = ${formatNumber(frame.temperatureRate)} degC/min`,
            tone: "sky",
            dashed,
            muted,
          })}
          <text
            x="424"
            y="182"
            className="fill-ink-600 text-[12px]"
          >
            Larger m c means the same power changes temperature less each minute.
          </text>
        </g>
      ) : null}

      {overlayState.shelfCue ? (
        <g opacity={shelfWeight}>
          <text
            x={LATENT_BAR_X}
            y={LATENT_BAR_Y - 10}
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            Phase-change shelf
          </text>
          <rect
            x={LATENT_BAR_X}
            y={LATENT_BAR_Y}
            width={LATENT_BAR_WIDTH}
            height="16"
            rx="8"
            fill="rgba(15,28,36,0.06)"
          />
          <rect
            x={LATENT_BAR_X}
            y={LATENT_BAR_Y}
            width={LATENT_BAR_WIDTH * frame.phaseFraction}
            height="16"
            rx="8"
            fill="rgba(240,171,60,0.56)"
          />
          {drawChip({
            x: LATENT_BAR_X + 90,
            y: LATENT_BAR_Y + 8,
            text: `fraction = ${Math.round(frame.phaseFraction * 100)}%`,
            tone: "amber",
            dashed,
            muted,
          })}
          {drawChip({
            x: LATENT_BAR_X + LATENT_BAR_WIDTH - 104,
            y: LATENT_BAR_Y + 8,
            text: `mL = ${formatNumber(frame.phaseChangeEnergy)} kJ`,
            tone: "coral",
            dashed,
            muted,
          })}
        </g>
      ) : null}

      {overlayState.energySplit ? (
        <g opacity={energyWeight}>
          <text
            x={ENERGY_BAR_X}
            y={ENERGY_BAR_Y - 10}
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            Energy change split
          </text>
          <rect
            x={ENERGY_BAR_X}
            y={ENERGY_BAR_Y}
            width={ENERGY_BAR_WIDTH}
            height="16"
            rx="8"
            fill="rgba(15,28,36,0.06)"
          />
          <rect
            x={ENERGY_BAR_X}
            y={ENERGY_BAR_Y}
            width={sensibleWidth}
            height="16"
            rx="8"
            fill="rgba(78,166,223,0.56)"
          />
          <rect
            x={ENERGY_BAR_X + sensibleWidth}
            y={ENERGY_BAR_Y}
            width={latentWidth}
            height="16"
            rx="8"
            fill="rgba(240,171,60,0.56)"
          />
          {drawChip({
            x: ENERGY_BAR_X + 92,
            y: ENERGY_BAR_Y + 8,
            text: `sensible = ${formatNumber(frame.sensibleEnergyChange)} kJ`,
            tone: "sky",
            dashed,
            muted,
          })}
          {drawChip({
            x: ENERGY_BAR_X + ENERGY_BAR_WIDTH - 94,
            y: ENERGY_BAR_Y + 8,
            text: `latent = ${formatNumber(frame.latentEnergyChange)} kJ`,
            tone: "amber",
            dashed,
            muted,
          })}
        </g>
      ) : null}

      <text
        x={STAGE_X + 18}
        y={HEIGHT - 18}
        className="fill-ink-600 text-[12px]"
      >
        Heating curves are honest only when the same energy bookkeeping drives temperature,
        phase fraction, graphs, compare mode, and challenge checks together.
      </text>
    </g>
  );
}

export function SpecificHeatPhaseChangeSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: SpecificHeatPhaseChangeSimulationProps) {
  const compareEnabled = Boolean(compare);
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
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
        preview t = {formatNumber(graphPreview.time)} min
      </span>
    ) : graphPreview?.kind === "response" && graphPreview.graphId === "specific-heat-response" ? (
      <span className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral-700">
        preview c = {formatNumber(graphPreview.point.x)}
      </span>
    ) : graphPreview?.kind === "response" ? (
      <span className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral-700">
        preview L = {formatNumber(graphPreview.point.x)} kJ/kg
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
        {(compare?.labelA ?? "Setup A")}: dT = {formatNumber(frameA?.temperatureChange ?? 0)} degC,
        shelf = {Math.round((frameA?.phaseFraction ?? 0) * 100)}%
      </span>
      <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold text-ink-700">
        {(compare?.labelB ?? "Setup B")}: dT = {formatNumber(frameB?.temperatureChange ?? 0)} degC,
        shelf = {Math.round((frameB?.phaseFraction ?? 0) * 100)}%
      </span>
    </div>
  ) : null;
  const overlayState = {
    capacityCue: overlayValues?.capacityCue ?? true,
    shelfCue: overlayValues?.shelfCue ?? true,
    energySplit: overlayValues?.energySplit ?? true,
    curveGuide: overlayValues?.curveGuide ?? true,
  };
  const noteLines = [
    primaryFrame.shelfActive
      ? "Temperature is flat because the current energy is changing phase fraction."
      : primaryFrame.powerDirectionLabel === "heating"
        ? "Away from the shelf, larger m c means the same power warms the sample more slowly."
        : primaryFrame.powerDirectionLabel === "cooling"
          ? "Cooling follows the same m c logic in reverse until the shelf is reached."
          : "With nearly zero power, the state is holding steady.",
    `Shelf width = ${formatNumber(primaryFrame.phaseChangeEnergy)} kJ, so a ${formatNumber(
      Math.abs(primaryFrame.heaterPower),
    )} kJ/min source would need about ${formatNumber(primaryFrame.shelfDurationMinutes)} min to cross it.`,
  ];
  const metricRows = [
    { label: "m", value: `${formatNumber(primaryFrame.mass)} kg` },
    { label: "c", value: `${formatNumber(primaryFrame.specificHeat)} kJ/kg C` },
    { label: "P", value: `${formatNumber(primaryFrame.heaterPower)} kJ/min` },
    { label: "T", value: `${formatNumber(primaryFrame.temperature)} degC` },
    { label: "dT", value: `${formatNumber(primaryFrame.temperatureChange)} degC` },
    { label: "m c", value: `${formatNumber(primaryFrame.thermalCapacity)} kJ/C` },
    { label: "phase", value: `${Math.round(primaryFrame.phaseFraction * 100)}%` },
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(30,166,162,0.1),rgba(240,171,60,0.12))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              One compact thermal bench keeps specific heat, phase-change energy, the heating
              curve, and the current stage readout tied to the same honest energy bookkeeping.
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

        {secondaryFrame ? (
          <>
            {renderBench(secondaryFrame, displayTime, overlayState, focusedOverlayId, {
              muted: true,
              dashed: true,
              offsetX: 14,
              offsetY: 10,
              gradientId: "phase-mixture-fill-ghost",
            })}
            {drawChip({
              x: STAGE_X + STAGE_WIDTH - 86,
              y: STAGE_Y + 24,
              text: `${secondaryLabel} ghost`,
              tone: "ink",
              dashed: true,
              muted: true,
            })}
          </>
        ) : null}

        {renderBench(primaryFrame, displayTime, overlayState, focusedOverlayId, {
          gradientId: "phase-mixture-fill-live",
        })}

        <text x={STAGE_X + 18} y={HEIGHT - 38} className="fill-ink-600 text-[12px]">
          {primaryLabel}: T = {formatNumber(primaryFrame.temperature)} degC, latent share ={" "}
          {Math.round(primaryFrame.phaseFraction * 100)}%, Q ={" "}
          {formatNumber(primaryFrame.totalAddedEnergy)} kJ
        </text>

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel} thermal state` : "Thermal state"}
          rows={metricRows}
          noteLines={noteLines}
        />
      </svg>
    </section>
  );
}
