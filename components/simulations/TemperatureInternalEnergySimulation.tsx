"use client";

import {
  formatNumber,
  sampleTemperatureInternalEnergyState,
  TEMPERATURE_INTERNAL_ENERGY_MAX_PARTICLE_COUNT,
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

type TemperatureInternalEnergySimulationProps = {
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
const HEIGHT = 410;
const STAGE_X = 42;
const STAGE_Y = 42;
const STAGE_WIDTH = 568;
const STAGE_HEIGHT = 288;
const CARD_WIDTH = 236;
const CARD_X = WIDTH - CARD_WIDTH - 20;
const CARD_Y = 20;
const BOX_X = STAGE_X + 20;
const BOX_Y = STAGE_Y + 38;
const BOX_WIDTH = STAGE_WIDTH - 40;
const BOX_HEIGHT = STAGE_HEIGHT - 78;
const BAR_X = BOX_X;
const BAR_WIDTH = BOX_WIDTH;
const ENERGY_BAR_Y = STAGE_Y + STAGE_HEIGHT - 28;
const PHASE_BAR_Y = ENERGY_BAR_Y - 32;

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.3;
}

function fract(value: number) {
  return value - Math.floor(value);
}

function reflectCoordinate(value: number, span: number) {
  const period = span * 2;
  const wrapped = ((value % period) + period) % period;

  return wrapped <= span ? wrapped : period - wrapped;
}

function buildPreviewSource(
  source: SimulationParams,
  preview: GraphStagePreview | null | undefined,
) {
  if (!preview || preview.kind !== "response") {
    return source;
  }

  if (preview.graphId === "amount-internal-energy" || preview.graphId === "amount-heating-rate") {
    return {
      ...source,
      particleCount: Math.round(preview.point.x),
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
  return sampleTemperatureInternalEnergyState(
    buildPreviewSource(source, graphPreview),
    displayTime,
  );
}

function drawChip(options: {
  x: number;
  y: number;
  text: string;
  tone?: "teal" | "coral" | "amber" | "sky" | "ink";
  dashed?: boolean;
}) {
  const { x, y, text, tone = "ink", dashed = false } = options;
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
  const width = Math.max(76, text.length * 6.6 + 18);

  return (
    <g transform={`translate(${x} ${y})`}>
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

function renderParticles(
  frame: ReturnType<typeof sampleTemperatureInternalEnergyState>,
  displayTime: number,
  options?: {
    muted?: boolean;
    dashed?: boolean;
    showMotionVectors?: boolean;
    focusedOverlayId?: string | null;
  },
) {
  const { muted = false, dashed = false, showMotionVectors = false, focusedOverlayId = null } =
    options ?? {};
  const radius = 7 - ((frame.particleCount - 8) / (TEMPERATURE_INTERNAL_ENERGY_MAX_PARTICLE_COUNT - 8)) * 2.6;
  const speedScale = 26 + frame.temperatureRatio * 72;
  const thermalColor = muted ? "rgba(78,166,223,0.35)" : "rgba(78,166,223,0.86)";
  const vectorOpacity = overlayWeight(focusedOverlayId, "motionVectors");

  return (
    <g opacity={muted ? 0.46 : 1}>
      {Array.from({ length: frame.particleCount }, (_, index) => {
        const seedA = fract(Math.sin((index + 1) * 12.9898) * 43758.5453);
        const seedB = fract(Math.sin((index + 1) * 78.233) * 12645.782);
        const directionX = seedA > 0.5 ? 1 : -1;
        const directionY = seedB > 0.4 ? 1 : -1;
        const velocityX = speedScale * (0.45 + seedA * 0.9) * directionX;
        const velocityY = speedScale * (0.35 + seedB * 0.8) * directionY;
        const x =
          BOX_X +
          18 +
          reflectCoordinate(seedA * (BOX_WIDTH - 36) + displayTime * velocityX, BOX_WIDTH - 36);
        const y =
          BOX_Y +
          18 +
          reflectCoordinate(seedB * (BOX_HEIGHT - 36) + displayTime * velocityY, BOX_HEIGHT - 36);
        const streakLength = 10 + frame.temperatureRatio * 14;
        const vx = (velocityX / Math.max(Math.abs(velocityX) + Math.abs(velocityY), 1)) * streakLength;
        const vy = (velocityY / Math.max(Math.abs(velocityX) + Math.abs(velocityY), 1)) * streakLength;
        const stroke = muted ? "rgba(30,166,162,0.28)" : "rgba(30,166,162,0.62)";

        return (
          <g key={`particle-${index}`}>
            {showMotionVectors && index < Math.min(frame.particleCount, 14) ? (
              <line
                x1={x - vx}
                x2={x}
                y1={y - vy}
                y2={y}
                stroke={stroke}
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity={vectorOpacity}
                strokeDasharray={dashed ? "5 4" : undefined}
              />
            ) : null}
            <circle
              cx={x}
              cy={y}
              r={radius}
              fill={thermalColor}
              stroke={muted ? "rgba(15,28,36,0.18)" : "rgba(15,28,36,0.22)"}
              strokeDasharray={dashed ? "4 3" : undefined}
            />
            <circle
              cx={x}
              cy={y}
              r={radius * 0.42}
              fill={muted ? "rgba(255,255,255,0.46)" : "rgba(255,255,255,0.78)"}
            />
          </g>
        );
      })}
    </g>
  );
}

function renderBench(
  frame: ReturnType<typeof sampleTemperatureInternalEnergyState>,
  displayTime: number,
  overlayState: Record<string, boolean>,
  focusedOverlayId: string | null | undefined,
  options?: { muted?: boolean; dashed?: boolean; offsetX?: number; offsetY?: number },
) {
  const { muted = false, dashed = false, offsetX = 0, offsetY = 0 } = options ?? {};
  const borderColor = muted ? "rgba(15,28,36,0.18)" : "rgba(15,28,36,0.1)";
  const fill = muted ? "rgba(255,255,255,0.36)" : "rgba(255,255,255,0.92)";
  const totalBarWidth = BAR_WIDTH * frame.internalEnergyRatio;
  const thermalWidth =
    totalBarWidth * (frame.thermalKineticEnergy / Math.max(frame.internalEnergy, 0.0001));
  const bondWidth = totalBarWidth - thermalWidth;

  return (
    <g transform={`translate(${offsetX} ${offsetY})`}>
      <rect
        x={STAGE_X}
        y={STAGE_Y}
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
        rx="26"
        fill={fill}
        stroke={borderColor}
        strokeDasharray={dashed ? "8 6" : undefined}
      />
      <rect
        x={BOX_X}
        y={BOX_Y}
        width={BOX_WIDTH}
        height={BOX_HEIGHT}
        rx="22"
        fill={muted ? "rgba(248,248,248,0.4)" : "rgba(247,251,252,0.9)"}
        stroke={muted ? "rgba(15,28,36,0.14)" : "rgba(15,28,36,0.08)"}
        strokeDasharray={dashed ? "8 5" : undefined}
      />
      <text
        x={STAGE_X + 18}
        y={STAGE_Y + 24}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
      >
        Particle bench
      </text>
      <text
        x={STAGE_X + 18}
        y={STAGE_Y + 46}
        className="fill-ink-950 text-[15px] font-semibold"
      >
        {frame.stageLabel}
      </text>

      {renderParticles(frame, displayTime, {
        muted,
        dashed,
        showMotionVectors: overlayState.motionVectors ?? true,
        focusedOverlayId,
      })}

      {(overlayState.particleCounter ?? true) ? (
        <g opacity={overlayWeight(focusedOverlayId, "particleCounter")}>
          {drawChip({
            x: BOX_X + 84,
            y: BOX_Y + 22,
            text: `N = ${frame.particleCount}`,
            tone: "amber",
            dashed,
          })}
          {drawChip({
            x: BOX_X + 222,
            y: BOX_Y + 22,
            text: `K_avg = ${formatNumber(frame.averageKineticEnergy)} u`,
            tone: "sky",
            dashed,
          })}
          {drawChip({
            x: BOX_X + BOX_WIDTH - 78,
            y: BOX_Y + 22,
            text: `T = ${formatNumber(frame.temperature)}`,
            tone: "teal",
            dashed,
          })}
        </g>
      ) : null}

      {(overlayState.phaseShelf ?? true) && frame.phaseShelfAvailable ? (
        <g opacity={overlayWeight(focusedOverlayId, "phaseShelf")}>
          <text
            x={BAR_X}
            y={PHASE_BAR_Y - 8}
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            Phase-change progress
          </text>
          <rect
            x={BAR_X}
            y={PHASE_BAR_Y}
            width={BAR_WIDTH}
            height="14"
            rx="7"
            fill="rgba(15,28,36,0.06)"
          />
          <rect
            x={BAR_X}
            y={PHASE_BAR_Y}
            width={BAR_WIDTH * frame.phaseProgress}
            height="14"
            rx="7"
            fill="rgba(240,171,60,0.46)"
          />
          {drawChip({
            x: BAR_X + BAR_WIDTH - 94,
            y: PHASE_BAR_Y + 7,
            text: `${Math.round(frame.phaseProgress * 100)}% through shelf`,
            tone: "amber",
            dashed,
          })}
        </g>
      ) : null}

      {(overlayState.energySplit ?? true) ? (
        <g opacity={overlayWeight(focusedOverlayId, "energySplit")}>
          <text
            x={BAR_X}
            y={ENERGY_BAR_Y - 8}
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            Internal energy split
          </text>
          <rect
            x={BAR_X}
            y={ENERGY_BAR_Y}
            width={BAR_WIDTH}
            height="16"
            rx="8"
            fill="rgba(15,28,36,0.06)"
          />
          <rect
            x={BAR_X}
            y={ENERGY_BAR_Y}
            width={thermalWidth}
            height="16"
            rx="8"
            fill="rgba(78,166,223,0.42)"
          />
          <rect
            x={BAR_X + thermalWidth}
            y={ENERGY_BAR_Y}
            width={Math.max(0, bondWidth)}
            height="16"
            rx="8"
            fill="rgba(240,171,60,0.44)"
          />
          {drawChip({
            x: BAR_X + 96,
            y: ENERGY_BAR_Y + 8,
            text: `K_total = ${formatNumber(frame.thermalKineticEnergy)} u`,
            tone: "sky",
            dashed,
          })}
          {drawChip({
            x: BAR_X + BAR_WIDTH - 88,
            y: ENERGY_BAR_Y + 8,
            text: `U = ${formatNumber(frame.internalEnergy)} u`,
            tone: "coral",
            dashed,
          })}
        </g>
      ) : null}

      <text
        x={STAGE_X + 18}
        y={STAGE_Y + STAGE_HEIGHT - 12}
        className="fill-ink-600 text-[12px]"
      >
        Average particle motion sets temperature. Total particle count and bond store set how much
        internal energy that same temperature represents.
      </text>
    </g>
  );
}

export function TemperatureInternalEnergySimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: TemperatureInternalEnergySimulationProps) {
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
        preview t = {formatNumber(graphPreview.time)} s
      </span>
    ) : graphPreview?.kind === "response" ? (
      <span className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral-700">
        preview N = {Math.round(graphPreview.point.x)}
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
        {(compare?.labelA ?? "Setup A")}: T = {formatNumber(frameA?.temperature ?? 0)}, U ={" "}
        {formatNumber(frameA?.internalEnergy ?? 0)} u
      </span>
      <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold text-ink-700">
        {(compare?.labelB ?? "Setup B")}: T = {formatNumber(frameB?.temperature ?? 0)}, U ={" "}
        {formatNumber(frameB?.internalEnergy ?? 0)} u
      </span>
    </div>
  ) : null;
  const overlayState = {
    motionVectors: overlayValues?.motionVectors ?? true,
    energySplit: overlayValues?.energySplit ?? true,
    phaseShelf: overlayValues?.phaseShelf ?? true,
    particleCounter: overlayValues?.particleCounter ?? true,
  };
  const noteLines = [
    primaryFrame.stageLabel === "phase-change shelf"
      ? "Internal energy is still rising while temperature stays near the shelf."
      : "Temperature tracks the average kinetic energy per particle in this bounded model.",
    primaryFrame.particleCount >= 24
      ? "More particles at the same temperature mean more total internal energy."
      : "Fewer particles can share the same temperature while carrying less total internal energy.",
  ];
  const metricRows = [
    { label: "N", value: String(primaryFrame.particleCount) },
    { label: "T", value: formatNumber(primaryFrame.temperature) },
    { label: "K_avg", value: `${formatNumber(primaryFrame.averageKineticEnergy)} u` },
    { label: "K_total", value: `${formatNumber(primaryFrame.thermalKineticEnergy)} u` },
    { label: "bond", value: `${formatNumber(primaryFrame.bondEnergy)} u` },
    { label: "U", value: `${formatNumber(primaryFrame.internalEnergy)} u` },
    {
      label: "dT/dt",
      value: `${formatNumber(primaryFrame.temperatureRate)} T/s`,
    },
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(30,166,162,0.1),rgba(240,171,60,0.12))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              One bounded particle box keeps temperature, internal energy, amount of substance, and
              a simple phase-change shelf on the same honest bench instead of splitting them into
              separate widgets.
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
              offsetX: 12,
              offsetY: 10,
            })}
            {drawChip({
              x: STAGE_X + STAGE_WIDTH - 74,
              y: STAGE_Y + 24,
              text: `${secondaryLabel} ghost`,
              tone: "ink",
              dashed: true,
            })}
          </>
        ) : null}

        {renderBench(primaryFrame, displayTime, overlayState, focusedOverlayId)}

        <text
          x={STAGE_X + 18}
          y={HEIGHT - 18}
          className="fill-ink-600 text-[12px]"
        >
          {primaryLabel}: T = {formatNumber(primaryFrame.temperature)}, U ={" "}
          {formatNumber(primaryFrame.internalEnergy)} u, phase progress ={" "}
          {Math.round(primaryFrame.phaseProgress * 100)}%
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
