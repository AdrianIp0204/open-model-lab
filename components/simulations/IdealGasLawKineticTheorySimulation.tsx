"use client";

import {
  formatNumber,
  IDEAL_GAS_KINETIC_MAX_PARTICLE_COUNT,
  IDEAL_GAS_KINETIC_MAX_VOLUME,
  IDEAL_GAS_KINETIC_MIN_VOLUME,
  sampleIdealGasLawKineticTheoryState,
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

type IdealGasLawKineticTheorySimulationProps = {
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
const STAGE_WIDTH = 574;
const STAGE_HEIGHT = 294;
const CARD_WIDTH = 236;
const CARD_X = WIDTH - CARD_WIDTH - 20;
const CARD_Y = 20;
const BOX_BASE_WIDTH = 320;
const BOX_BASE_HEIGHT = 204;
const BOX_CENTER_X = STAGE_X + 260;
const BOX_CENTER_Y = STAGE_Y + 150;

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.28;
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

  if (preview.graphId === "pressure-volume") {
    return {
      ...source,
      volume: preview.point.x,
    };
  }

  if (
    preview.graphId === "pressure-temperature" ||
    preview.graphId === "collision-temperature"
  ) {
    return {
      ...source,
      temperature: preview.point.x,
    };
  }

  if (preview.graphId === "pressure-particle-count") {
    return {
      ...source,
      particleCount: Math.round(preview.point.x),
    };
  }

  return source;
}

function resolveFrame(
  source: SimulationParams,
  graphPreview?: GraphStagePreview | null,
) {
  return sampleIdealGasLawKineticTheoryState(
    buildPreviewSource(source, graphPreview),
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
  const width = Math.max(82, text.length * 6.5 + 18);

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

function resolveBoxMetrics(volume: number) {
  const volumeSpan =
    (volume - IDEAL_GAS_KINETIC_MIN_VOLUME) /
    (IDEAL_GAS_KINETIC_MAX_VOLUME - IDEAL_GAS_KINETIC_MIN_VOLUME);
  const scale = 0.78 + volumeSpan * 0.52;
  const width = BOX_BASE_WIDTH * scale;
  const height = BOX_BASE_HEIGHT * scale;

  return {
    width,
    height,
    x: BOX_CENTER_X - width / 2,
    y: BOX_CENTER_Y - height / 2,
  };
}

function renderParticles(
  frame: ReturnType<typeof sampleIdealGasLawKineticTheoryState>,
  displayTime: number,
  box: ReturnType<typeof resolveBoxMetrics>,
  options?: {
    muted?: boolean;
    dashed?: boolean;
    showSpeedCue?: boolean;
    focusedOverlayId?: string | null;
  },
) {
  const { muted = false, dashed = false, showSpeedCue = false, focusedOverlayId = null } =
    options ?? {};
  const radius =
    7 - ((frame.particleCount - 8) / (IDEAL_GAS_KINETIC_MAX_PARTICLE_COUNT - 8)) * 2.3;
  const speedScale = 18 + frame.averageSpeed * 10.5;
  const vectorOpacity = overlayWeight(focusedOverlayId, "speedCue");
  const particleFill = muted ? "rgba(78,166,223,0.34)" : "rgba(78,166,223,0.88)";

  return (
    <g opacity={muted ? 0.46 : 1}>
      {Array.from({ length: frame.particleCount }, (_, index) => {
        const seedA = fract(Math.sin((index + 1) * 12.9898) * 43758.5453);
        const seedB = fract(Math.sin((index + 1) * 78.233) * 12645.782);
        const directionX = seedA > 0.5 ? 1 : -1;
        const directionY = seedB > 0.45 ? 1 : -1;
        const velocityX = speedScale * (0.45 + seedA * 0.9) * directionX;
        const velocityY = speedScale * (0.35 + seedB * 0.8) * directionY;
        const x =
          box.x +
          16 +
          reflectCoordinate(seedA * (box.width - 32) + displayTime * velocityX, box.width - 32);
        const y =
          box.y +
          16 +
          reflectCoordinate(seedB * (box.height - 32) + displayTime * velocityY, box.height - 32);
        const streakLength = 8 + frame.speedRatio * 14;
        const speedNorm = Math.max(Math.abs(velocityX) + Math.abs(velocityY), 1);
        const vx = (velocityX / speedNorm) * streakLength;
        const vy = (velocityY / speedNorm) * streakLength;

        return (
          <g key={`particle-${index}`}>
            {showSpeedCue && index < Math.min(frame.particleCount, 16) ? (
              <line
                x1={x - vx}
                y1={y - vy}
                x2={x}
                y2={y}
                stroke={muted ? "rgba(30,166,162,0.3)" : "rgba(30,166,162,0.68)"}
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeDasharray={dashed ? "4 4" : undefined}
                opacity={vectorOpacity}
              />
            ) : null}
            <circle
              cx={x}
              cy={y}
              r={radius}
              fill={particleFill}
              stroke={muted ? "rgba(15,28,36,0.14)" : "rgba(15,28,36,0.2)"}
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

function renderWallImpactTicks(
  frame: ReturnType<typeof sampleIdealGasLawKineticTheoryState>,
  displayTime: number,
  box: ReturnType<typeof resolveBoxMetrics>,
  options?: { muted?: boolean; dashed?: boolean; focusedOverlayId?: string | null },
) {
  const { muted = false, dashed = false, focusedOverlayId = null } = options ?? {};
  const opacity = overlayWeight(focusedOverlayId, "wallHitCue");
  const tickCount = 7;

  return (
    <g opacity={opacity}>
      {Array.from({ length: tickCount }, (_, index) => {
        const phase = displayTime * (1.3 + frame.collisionRateRatio * 2.4) + index * 0.9;
        const pulse = 0.25 + 0.75 * Math.abs(Math.sin(phase));
        const y = box.y + ((index + 1) * box.height) / (tickCount + 1);
        const x = box.x + box.width + 8;
        const length = 10 + frame.collisionRateRatio * 14 * pulse;
        const stroke = muted ? "rgba(241,102,89,0.28)" : "rgba(241,102,89,0.68)";

        return (
          <line
            key={`wall-hit-${index}`}
            x1={x}
            y1={y}
            x2={x + length}
            y2={y}
            stroke={stroke}
            strokeWidth={1.8 + pulse}
            strokeLinecap="round"
            strokeDasharray={dashed ? "5 4" : undefined}
          />
        );
      })}
    </g>
  );
}

function renderBench(
  frame: ReturnType<typeof sampleIdealGasLawKineticTheoryState>,
  displayTime: number,
  overlayState: Record<string, boolean>,
  focusedOverlayId: string | null | undefined,
  options?: { muted?: boolean; dashed?: boolean; offsetX?: number; offsetY?: number },
) {
  const { muted = false, dashed = false, offsetX = 0, offsetY = 0 } = options ?? {};
  const borderColor = muted ? "rgba(15,28,36,0.18)" : "rgba(15,28,36,0.1)";
  const fill = muted ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.92)";
  const box = resolveBoxMetrics(frame.volume);
  const densityOpacity = 0.12 + frame.densityRatio * 0.3;
  const gaugeWidth = 150;
  const gaugeX = STAGE_X + STAGE_WIDTH - gaugeWidth - 22;
  const gaugeY = STAGE_Y + 60;

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
      <text
        x={STAGE_X + 18}
        y={STAGE_Y + 24}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
      >
        Ideal-gas particle box
      </text>
      <text
        x={STAGE_X + 18}
        y={STAGE_Y + 46}
        className="fill-ink-950 text-[15px] font-semibold"
      >
        {frame.pressureLabel} pressure from particle speed and wall hits
      </text>

      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        rx="24"
        fill={muted ? "rgba(246,250,252,0.44)" : "rgba(248,251,252,0.92)"}
        stroke={muted ? "rgba(15,28,36,0.14)" : "rgba(15,28,36,0.08)"}
        strokeDasharray={dashed ? "8 5" : undefined}
      />

      {(overlayState.densityCue ?? true) ? (
        <g opacity={overlayWeight(focusedOverlayId, "densityCue")}>
          <rect
            x={box.x + 5}
            y={box.y + 5}
            width={box.width - 10}
            height={box.height - 10}
            rx="20"
            fill={`rgba(240,171,60,${muted ? densityOpacity * 0.45 : densityOpacity})`}
          />
          {drawChip({
            x: box.x + box.width / 2,
            y: box.y - 16,
            text: `n = ${formatNumber(frame.density)}`,
            tone: "amber",
            dashed,
          })}
        </g>
      ) : null}

      {renderParticles(frame, displayTime, box, {
        muted,
        dashed,
        showSpeedCue: overlayState.speedCue ?? true,
        focusedOverlayId,
      })}

      {(overlayState.wallHitCue ?? true)
        ? renderWallImpactTicks(frame, displayTime, box, {
            muted,
            dashed,
            focusedOverlayId,
          })
        : null}

      {(overlayState.speedCue ?? true) ? (
        <g opacity={overlayWeight(focusedOverlayId, "speedCue")}>
          {drawChip({
            x: box.x + 88,
            y: box.y + 20,
            text: `v_avg = ${formatNumber(frame.averageSpeed)}`,
            tone: "teal",
            dashed,
          })}
        </g>
      ) : null}

      {(overlayState.pressureGauge ?? true) ? (
        <g opacity={overlayWeight(focusedOverlayId, "pressureGauge")}>
          <text
            x={gaugeX}
            y={gaugeY - 12}
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            Pressure gauge
          </text>
          <rect
            x={gaugeX}
            y={gaugeY}
            width={gaugeWidth}
            height="18"
            rx="9"
            fill="rgba(15,28,36,0.06)"
          />
          <rect
            x={gaugeX}
            y={gaugeY}
            width={gaugeWidth * frame.pressureRatio}
            height="18"
            rx="9"
            fill="rgba(241,102,89,0.52)"
          />
          {drawChip({
            x: gaugeX + gaugeWidth / 2,
            y: gaugeY + 36,
            text: `P = ${formatNumber(frame.pressure)}`,
            tone: "coral",
            dashed,
          })}
          {drawChip({
            x: gaugeX + gaugeWidth / 2,
            y: gaugeY + 64,
            text: `${formatNumber(frame.collisionRate)} hits/s`,
            tone: "sky",
            dashed,
          })}
        </g>
      ) : null}

      <text
        x={STAGE_X + 18}
        y={STAGE_Y + STAGE_HEIGHT - 24}
        className="fill-ink-600 text-[12px]"
      >
        Pressure rises when the walls are hit more often, with greater particle momentum, or both.
      </text>
    </g>
  );
}

function resolvePreviewBadge(preview: GraphStagePreview | null | undefined) {
  if (!preview || preview.kind !== "response") {
    return null;
  }

  if (preview.graphId === "pressure-volume") {
    return `preview V = ${formatNumber(preview.point.x)}`;
  }

  if (
    preview.graphId === "pressure-temperature" ||
    preview.graphId === "collision-temperature"
  ) {
    return `preview T = ${formatNumber(preview.point.x)}`;
  }

  if (preview.graphId === "pressure-particle-count") {
    return `preview N = ${Math.round(preview.point.x)}`;
  }

  return null;
}

export function IdealGasLawKineticTheorySimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: IdealGasLawKineticTheorySimulationProps) {
  const compareEnabled = Boolean(compare);
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const liveFrame = resolveFrame(params, graphPreview);
  const frameA = compare
    ? resolveFrame(compare.setupA, previewedSetup === "a" ? graphPreview : null)
    : null;
  const frameB = compare
    ? resolveFrame(compare.setupB, previewedSetup === "b" ? graphPreview : null)
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
  const previewLabel = resolvePreviewBadge(graphPreview);
  const overlayState = {
    speedCue: overlayValues?.speedCue ?? true,
    densityCue: overlayValues?.densityCue ?? true,
    wallHitCue: overlayValues?.wallHitCue ?? true,
    pressureGauge: overlayValues?.pressureGauge ?? true,
  };
  const noteLines = [
    primaryFrame.volume <= 1.1
      ? "Smaller volume keeps the same particles closer to the walls, so the hit rate rises."
      : "Larger volume gives each particle more room, so the walls are struck less often.",
    primaryFrame.temperature >= 3.8
      ? "Hotter particles move faster, so each collision transfers more momentum."
      : "Cooler particles move more slowly, so pressure changes also depend strongly on density.",
  ];
  const metricRows = [
    { label: "N", value: String(primaryFrame.particleCount) },
    { label: "T", value: formatNumber(primaryFrame.temperature) },
    { label: "V", value: formatNumber(primaryFrame.volume) },
    { label: "P", value: `${formatNumber(primaryFrame.pressure)} u` },
    { label: "n", value: formatNumber(primaryFrame.density) },
    { label: "v_avg", value: `${formatNumber(primaryFrame.averageSpeed)} u/s` },
    { label: "hits", value: `${formatNumber(primaryFrame.collisionRate)} /s` },
  ];
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
        {(compare?.labelA ?? "Setup A")}: P = {formatNumber(frameA?.pressure ?? 0)}, V ={" "}
        {formatNumber(frameA?.volume ?? 0)}, T = {formatNumber(frameA?.temperature ?? 0)}
      </span>
      <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold text-ink-700">
        {(compare?.labelB ?? "Setup B")}: P = {formatNumber(frameB?.pressure ?? 0)}, V ={" "}
        {formatNumber(frameB?.volume ?? 0)}, T = {formatNumber(frameB?.temperature ?? 0)}
      </span>
    </div>
  ) : null;

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(78,166,223,0.12),rgba(241,102,89,0.12))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              One bounded particle box keeps pressure, volume, temperature, and particle number on
              the same bench while the wall-hit picture stays visible.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {compareLegend}
            {compareBadges}
            {previewLabel ? (
              <span className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral-700">
                {previewLabel}
              </span>
            ) : null}
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
            {renderBench(secondaryFrame, time, overlayState, focusedOverlayId, {
              muted: true,
              dashed: true,
              offsetX: 12,
              offsetY: 10,
            })}
            {drawChip({
              x: STAGE_X + STAGE_WIDTH - 72,
              y: STAGE_Y + 24,
              text: `${secondaryLabel} ghost`,
              tone: "ink",
              dashed: true,
            })}
          </>
        ) : null}

        {renderBench(primaryFrame, time, overlayState, focusedOverlayId)}

        <text x={STAGE_X + 18} y={HEIGHT - 18} className="fill-ink-600 text-[12px]">
          {primaryLabel}: P = {formatNumber(primaryFrame.pressure)} u, V ={" "}
          {formatNumber(primaryFrame.volume)}, hits = {formatNumber(primaryFrame.collisionRate)}/s
        </text>

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel} gas state` : "Gas state"}
          rows={metricRows}
          noteLines={noteLines}
        />
      </svg>
    </section>
  );
}
