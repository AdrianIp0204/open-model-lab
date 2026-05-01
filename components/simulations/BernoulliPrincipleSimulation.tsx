"use client";

import {
  BERNOULLI_PRINCIPLE_MAX_ENTRY_AREA,
  BERNOULLI_PRINCIPLE_MAX_ENTRY_PRESSURE,
  BERNOULLI_PRINCIPLE_MIN_THROAT_AREA,
  BERNOULLI_PRINCIPLE_SLICE_DURATION,
  BERNOULLI_PRINCIPLE_STAGE_LENGTH,
  buildBernoulliTravelProfile,
  formatMeasurement,
  formatNumber,
  sampleBernoulliAreaAtPosition,
  sampleBernoulliHeightAtPosition,
  sampleBernoulliPositionFromProfile,
  sampleBernoulliPrincipleState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import { CompareLegend, resolveCompareScene, SimulationPreviewBadge } from "./primitives/compare";
import { resolveOverlayOpacity } from "./primitives/overlay";
import { SimulationSceneCard } from "./primitives/scene-card";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type BernoulliPrincipleSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type BernoulliFrame = ReturnType<typeof sampleBernoulliPrincipleState>;

const WIDTH = 940;
const HEIGHT = 410;
const PIPE_LEFT = 64;
const PIPE_RIGHT = 628;
const PIPE_WIDTH = PIPE_RIGHT - PIPE_LEFT;
const BASE_CENTER_Y = 226;
const CARD_WIDTH = 238;
const CARD_X = WIDTH - CARD_WIDTH - 20;
const CARD_Y = 20;
const SAMPLE_COUNT = 121;
const SECTION_A_X = 0.44;
const THROAT_X = 1.58;
const STREAMLINE_FRACTIONS = [-0.56, -0.22, 0.22, 0.56];
const TRACER_COUNT = 6;

function stageX(position: number) {
  return PIPE_LEFT + (position / BERNOULLI_PRINCIPLE_STAGE_LENGTH) * PIPE_WIDTH;
}

function halfHeightForArea(area: number) {
  const ratio =
    (area - BERNOULLI_PRINCIPLE_MIN_THROAT_AREA) /
    (BERNOULLI_PRINCIPLE_MAX_ENTRY_AREA - BERNOULLI_PRINCIPLE_MIN_THROAT_AREA);

  return 24 + Math.max(0, Math.min(1, ratio)) * 32;
}

function liftForHeight(height: number) {
  return Math.max(0, Math.min(1, height / 0.45)) * 76;
}

function halfHeightAtPosition(source: SimulationParams, position: number) {
  return halfHeightForArea(sampleBernoulliAreaAtPosition(source, position));
}

function centerlineYAtPosition(source: SimulationParams, position: number) {
  return BASE_CENTER_Y - liftForHeight(sampleBernoulliHeightAtPosition(source, position));
}

function measureChipWidth(text: string) {
  return Math.max(88, text.length * 6.7 + 18);
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
      stroke: "rgba(21,122,118,0.28)",
      text: "#157a76",
    },
    coral: {
      fill: "rgba(241,102,89,0.14)",
      stroke: "rgba(177,66,52,0.28)",
      text: "#9f3a2c",
    },
    amber: {
      fill: "rgba(240,171,60,0.16)",
      stroke: "rgba(184,112,0,0.28)",
      text: "#8e5800",
    },
    sky: {
      fill: "rgba(78,166,223,0.14)",
      stroke: "rgba(29,111,159,0.28)",
      text: "#1d6f9f",
    },
    ink: {
      fill: "rgba(255,255,255,0.92)",
      stroke: "rgba(15,28,36,0.14)",
      text: "#0f1c24",
    },
  }[tone];
  const width = measureChipWidth(text);

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

function drawArrow(options: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  opacity?: number;
  dashed?: boolean;
  strokeWidth?: number;
}) {
  const { x1, y1, x2, y2, color, opacity = 1, dashed = false, strokeWidth = 3 } = options;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);

  if (length < 1e-6) {
    return null;
  }

  const ux = dx / length;
  const uy = dy / length;
  const head = 10;
  const leftX = x2 - ux * head - uy * head * 0.55;
  const leftY = y2 - uy * head + ux * head * 0.55;
  const rightX = x2 - ux * head + uy * head * 0.55;
  const rightY = y2 - uy * head - ux * head * 0.55;

  return (
    <g opacity={opacity}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <path
        d={`M ${x2} ${y2} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`}
        fill={color}
      />
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

  if (preview.graphId === "speed-throat-area" || preview.graphId === "pressure-throat-area") {
    return {
      ...source,
      throatArea: preview.point.x,
    };
  }

  if (preview.graphId === "pressure-flow-rate") {
    return {
      ...source,
      flowRate: preview.point.x,
    };
  }

  if (preview.graphId === "pressure-throat-height") {
    return {
      ...source,
      throatHeight: preview.point.x,
    };
  }

  return source;
}

function resolvePreviewBadge(preview: GraphStagePreview | null | undefined) {
  if (!preview || preview.kind !== "response") {
    return null;
  }

  if (preview.graphId === "speed-throat-area" || preview.graphId === "pressure-throat-area") {
    return `preview A_B = ${formatMeasurement(preview.point.x, "m^2")}`;
  }

  if (preview.graphId === "pressure-flow-rate") {
    return `preview Q = ${formatMeasurement(preview.point.x, "m^3/s")}`;
  }

  if (preview.graphId === "pressure-throat-height") {
    return `preview delta y = ${formatMeasurement(preview.point.x, "m")}`;
  }

  return null;
}

function buildPipePath(source: SimulationParams) {
  const positions = Array.from({ length: SAMPLE_COUNT }, (_, index) => {
    return (index / (SAMPLE_COUNT - 1)) * BERNOULLI_PRINCIPLE_STAGE_LENGTH;
  });
  const top = positions
    .map((position, index) => {
      const x = stageX(position);
      const y = centerlineYAtPosition(source, position) - halfHeightAtPosition(source, position);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const bottom = positions
    .slice()
    .reverse()
    .map((position) => {
      const x = stageX(position);
      const y = centerlineYAtPosition(source, position) + halfHeightAtPosition(source, position);
      return `L ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return `${top} ${bottom} Z`;
}

function buildStreamlinePath(source: SimulationParams, fraction: number) {
  const positions = Array.from({ length: SAMPLE_COUNT }, (_, index) => {
    return (index / (SAMPLE_COUNT - 1)) * BERNOULLI_PRINCIPLE_STAGE_LENGTH;
  });

  return positions
    .map((position, index) => {
      const x = stageX(position);
      const y =
        centerlineYAtPosition(source, position) +
        fraction * halfHeightAtPosition(source, position);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function renderContinuityBridge(
  frame: BernoulliFrame,
  source: SimulationParams,
  focusedOverlayId: string | null | undefined,
  dashed = false,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "continuityBridge", 0.4);
  const sectionAX = stageX(SECTION_A_X);
  const throatX = stageX(THROAT_X);
  const topA =
    centerlineYAtPosition(source, SECTION_A_X) - halfHeightAtPosition(source, SECTION_A_X);
  const bottomA =
    centerlineYAtPosition(source, SECTION_A_X) + halfHeightAtPosition(source, SECTION_A_X);
  const topB = centerlineYAtPosition(source, THROAT_X) - halfHeightAtPosition(source, THROAT_X);
  const bottomB =
    centerlineYAtPosition(source, THROAT_X) + halfHeightAtPosition(source, THROAT_X);

  return (
    <g pointerEvents="none" opacity={opacity}>
      <line
        x1={sectionAX}
        x2={sectionAX}
        y1={topA}
        y2={bottomA}
        stroke="rgba(29,111,159,0.72)"
        strokeWidth="2.2"
        strokeDasharray={dashed ? "7 5" : "5 4"}
      />
      <line
        x1={throatX}
        x2={throatX}
        y1={topB}
        y2={bottomB}
        stroke="rgba(177,66,52,0.76)"
        strokeWidth="2.2"
        strokeDasharray={dashed ? "7 5" : "5 4"}
      />
      {drawChip({
        x: sectionAX,
        y: topA - 20,
        text: `A_A = ${formatNumber(frame.entryArea)} m^2`,
        tone: "sky",
        dashed,
      })}
      {drawChip({
        x: throatX,
        y: topB - 20,
        text: `A_B = ${formatNumber(frame.throatArea)} m^2`,
        tone: "coral",
        dashed,
      })}
      {drawChip({
        x: stageX(1.02),
        y: 108,
        text: `Q = ${formatNumber(frame.flowRate)} m^3/s`,
        tone: "teal",
        dashed,
      })}
    </g>
  );
}

function renderSpeedArrows(
  frame: BernoulliFrame,
  source: SimulationParams,
  focusedOverlayId: string | null | undefined,
  dashed = false,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "speedArrows", 0.42);
  const scale = 26;
  const sectionAY = centerlineYAtPosition(source, SECTION_A_X);
  const throatY = centerlineYAtPosition(source, THROAT_X);
  const sectionAX = stageX(SECTION_A_X);
  const throatX = stageX(THROAT_X);
  const entryLength = frame.entrySpeed * scale;
  const throatLength = frame.throatSpeed * scale;

  return (
    <g pointerEvents="none" opacity={opacity}>
      {drawArrow({
        x1: sectionAX - entryLength / 2,
        y1: sectionAY,
        x2: sectionAX + entryLength / 2,
        y2: sectionAY,
        color: "#1ea6a2",
        dashed,
      })}
      {drawArrow({
        x1: throatX - throatLength / 2,
        y1: throatY,
        x2: throatX + throatLength / 2,
        y2: throatY,
        color: "#f16659",
        dashed,
      })}
      {drawChip({
        x: sectionAX,
        y: sectionAY + 38,
        text: `v_A = ${formatNumber(frame.entrySpeed)} m/s`,
        tone: "teal",
        dashed,
      })}
      {drawChip({
        x: throatX,
        y: throatY + 38,
        text: `v_B = ${formatNumber(frame.throatSpeed)} m/s`,
        tone: "coral",
        dashed,
      })}
    </g>
  );
}

function renderPressureGauges(
  frame: BernoulliFrame,
  focusedOverlayId: string | null | undefined,
  dashed = false,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "pressureGauges", 0.4);
  const gaugeTop = 92;
  const gaugeHeight = 88;
  const gaugeWidth = 16;
  const maxPressure = BERNOULLI_PRINCIPLE_MAX_ENTRY_PRESSURE + 2;
  const entryHeight = (frame.entryPressure / maxPressure) * gaugeHeight;
  const throatHeight = Math.max(0, (frame.throatPressure / maxPressure) * gaugeHeight);
  const sectionAX = stageX(SECTION_A_X) - 26;
  const throatX = stageX(THROAT_X) + 20;

  return (
    <g pointerEvents="none" opacity={opacity}>
      <rect
        x={sectionAX}
        y={gaugeTop}
        width={gaugeWidth}
        height={gaugeHeight}
        rx="8"
        fill="rgba(255,255,255,0.78)"
        stroke="rgba(15,28,36,0.14)"
        strokeDasharray={dashed ? "6 4" : undefined}
      />
      <rect
        x={throatX}
        y={gaugeTop}
        width={gaugeWidth}
        height={gaugeHeight}
        rx="8"
        fill="rgba(255,255,255,0.78)"
        stroke="rgba(15,28,36,0.14)"
        strokeDasharray={dashed ? "6 4" : undefined}
      />
      <rect
        x={sectionAX + 2}
        y={gaugeTop + gaugeHeight - entryHeight}
        width={gaugeWidth - 4}
        height={entryHeight}
        rx="6"
        fill="rgba(78,166,223,0.72)"
      />
      <rect
        x={throatX + 2}
        y={gaugeTop + gaugeHeight - throatHeight}
        width={gaugeWidth - 4}
        height={throatHeight}
        rx="6"
        fill="rgba(241,102,89,0.72)"
      />
      {drawChip({
        x: sectionAX + gaugeWidth / 2,
        y: gaugeTop - 18,
        text: `P_A ${formatNumber(frame.entryPressure)} kPa`,
        tone: "sky",
        dashed,
      })}
      {drawChip({
        x: throatX + gaugeWidth / 2,
        y: gaugeTop - 18,
        text: `P_B ${formatNumber(frame.throatPressure)} kPa`,
        tone: "coral",
        dashed,
      })}
    </g>
  );
}

function renderEnergyBars(
  frame: BernoulliFrame,
  focusedOverlayId: string | null | undefined,
  dashed = false,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "energyBars", 0.38);
  const barWidth = 204;
  const barHeight = 18;
  const leftX = 96;
  const rightX = 344;
  const y = 312;
  const total = Math.max(frame.totalEnergyLike, 0.01);

  function renderBar(
    x: number,
    label: string,
    pressureTerm: number,
    kineticTerm: number,
    heightTerm: number,
  ) {
    const pressureWidth = (pressureTerm / total) * barWidth;
    const kineticWidth = (kineticTerm / total) * barWidth;
    const heightWidth = (heightTerm / total) * barWidth;

    return (
      <g key={label}>
        <text
          x={x}
          y={y - 10}
          className="fill-ink-600 text-[10px] font-semibold uppercase tracking-[0.14em]"
        >
          {label}
        </text>
        <rect
          x={x}
          y={y}
          width={barWidth}
          height={barHeight}
          rx="9"
          fill="rgba(255,255,255,0.76)"
          stroke="rgba(15,28,36,0.14)"
          strokeDasharray={dashed ? "6 4" : undefined}
        />
        <rect
          x={x}
          y={y}
          width={pressureWidth}
          height={barHeight}
          rx="9"
          fill="rgba(78,166,223,0.72)"
        />
        <rect
          x={x + pressureWidth}
          y={y}
          width={kineticWidth}
          height={barHeight}
          fill="rgba(30,166,162,0.72)"
        />
        <rect
          x={x + pressureWidth + kineticWidth}
          y={y}
          width={heightWidth}
          height={barHeight}
          rx={heightWidth > 0 ? 9 : 0}
          fill="rgba(240,171,60,0.72)"
        />
      </g>
    );
  }

  return (
    <g pointerEvents="none" opacity={opacity}>
      {renderBar(leftX, "Section A", frame.entryPressure, frame.entryDynamicPressure, 0)}
      {renderBar(
        rightX,
        "Throat",
        frame.throatPressure,
        frame.throatDynamicPressure,
        frame.throatHeightPressure,
      )}
      <text
        x="560"
        y={y + 6}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        Pressure
      </text>
      <rect x="618" y={y - 7} width="12" height="12" rx="6" fill="rgba(78,166,223,0.72)" />
      <text
        x="648"
        y={y + 6}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        Kinetic
      </text>
      <rect x="704" y={y - 7} width="12" height="12" rx="6" fill="rgba(30,166,162,0.72)" />
      <text
        x="732"
        y={y + 6}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        Height
      </text>
      <rect x="780" y={y - 7} width="12" height="12" rx="6" fill="rgba(240,171,60,0.72)" />
    </g>
  );
}

function renderSliceOverlay(
  frame: BernoulliFrame,
  source: SimulationParams,
  focusedOverlayId: string | null | undefined,
  dashed = false,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "flowSlices", 0.32);
  const sectionAX = stageX(SECTION_A_X);
  const throatX = stageX(THROAT_X);
  const sectionAY = centerlineYAtPosition(source, SECTION_A_X);
  const throatY = centerlineYAtPosition(source, THROAT_X);
  const entryHalfHeight = halfHeightAtPosition(source, SECTION_A_X) - 6;
  const throatHalfHeight = halfHeightAtPosition(source, THROAT_X) - 6;
  const entryLength = (frame.entrySliceLength / BERNOULLI_PRINCIPLE_STAGE_LENGTH) * PIPE_WIDTH;
  const throatLength = (frame.throatSliceLength / BERNOULLI_PRINCIPLE_STAGE_LENGTH) * PIPE_WIDTH;

  return (
    <g pointerEvents="none" opacity={opacity}>
      <rect
        x={sectionAX - entryLength / 2}
        y={sectionAY - entryHalfHeight}
        width={entryLength}
        height={entryHalfHeight * 2}
        rx="14"
        fill="rgba(30,166,162,0.14)"
        stroke="rgba(21,122,118,0.26)"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <rect
        x={throatX - throatLength / 2}
        y={throatY - throatHalfHeight}
        width={throatLength}
        height={throatHalfHeight * 2}
        rx="14"
        fill="rgba(241,102,89,0.14)"
        stroke="rgba(177,66,52,0.28)"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <text
        x={sectionAX}
        y={sectionAY - entryHalfHeight - 10}
        textAnchor="middle"
        className="fill-teal-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        {formatNumber(BERNOULLI_PRINCIPLE_SLICE_DURATION)} s slice
      </text>
      <text
        x={throatX}
        y={throatY - throatHalfHeight - 10}
        textAnchor="middle"
        className="fill-coral-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        same Q, longer throat slice
      </text>
    </g>
  );
}

function renderTracerDots(source: SimulationParams, frame: BernoulliFrame, muted = false) {
  const profile = buildBernoulliTravelProfile(source);

  return (
    <g pointerEvents="none" opacity={muted ? 0.42 : 1}>
      {STREAMLINE_FRACTIONS.flatMap((fraction, rowIndex) =>
        Array.from({ length: TRACER_COUNT }, (_, tracerIndex) => {
          const phase =
            (profile.totalTime * tracerIndex) / TRACER_COUNT + rowIndex * 0.08 * profile.totalTime;
          const position = sampleBernoulliPositionFromProfile(profile, frame.time + phase);
          const x = stageX(position);
          const y =
            centerlineYAtPosition(source, position) +
            fraction * halfHeightAtPosition(source, position);

          return (
            <circle
              key={`${fraction}-${tracerIndex}`}
              cx={x}
              cy={y}
              r={muted ? 2.6 : 3.3}
              fill={muted ? "rgba(15,28,36,0.28)" : "#1ea6a2"}
              stroke={muted ? "none" : "rgba(255,253,247,0.92)"}
              strokeWidth={muted ? 0 : 1.4}
            />
          );
        }),
      )}
    </g>
  );
}

function renderBench(
  frame: BernoulliFrame,
  source: SimulationParams,
  overlayState: Record<string, boolean>,
  focusedOverlayId: string | null | undefined,
  options?: { muted?: boolean; dashed?: boolean; offsetX?: number; offsetY?: number },
) {
  const { muted = false, dashed = false, offsetX = 0, offsetY = 0 } = options ?? {};
  const pipePath = buildPipePath(source);
  const shellStroke = muted ? "rgba(15,28,36,0.18)" : "rgba(15,28,36,0.12)";
  const fillTone = muted ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.92)";
  const geometryHeadline =
    frame.geometryLabel === "narrow-rising"
      ? "Narrower throat, faster flow, lower static pressure"
      : frame.geometryLabel === "narrow-level"
        ? "Narrower throat trades pressure for speed"
        : frame.geometryLabel === "wide-rising"
          ? "Wider throat recovers speed but still pays height"
          : frame.geometryLabel === "wide-level"
            ? "Wider throat slows the flow and recovers pressure"
            : "Matched area keeps the Bernoulli trade mild";

  return (
    <g transform={`translate(${offsetX} ${offsetY})`} opacity={muted ? 0.64 : 1}>
      <rect
        x={PIPE_LEFT - 24}
        y="58"
        width={PIPE_WIDTH + 56}
        height="286"
        rx="28"
        fill={fillTone}
        stroke={shellStroke}
        strokeDasharray={dashed ? "8 6" : undefined}
      />
      <text
        x={PIPE_LEFT}
        y="46"
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
      >
        Steady Bernoulli bench
      </text>
      <text
        x={PIPE_LEFT}
        y="66"
        className="fill-ink-950 text-[15px] font-semibold"
      >
        {geometryHeadline}
      </text>

      <path
        d={pipePath}
        fill={muted ? "rgba(78,166,223,0.08)" : "rgba(78,166,223,0.12)"}
        stroke={muted ? "rgba(15,28,36,0.2)" : "rgba(15,28,36,0.22)"}
        strokeWidth="3"
        strokeDasharray={dashed ? "8 6" : undefined}
      />

      {STREAMLINE_FRACTIONS.map((fraction, index) => (
        <path
          key={`${fraction}-${index}`}
          d={buildStreamlinePath(source, fraction)}
          fill="none"
          stroke={muted ? "rgba(15,28,36,0.12)" : "rgba(21,122,118,0.14)"}
          strokeWidth={fraction === 0 ? 2.2 : 1.4}
          strokeDasharray={muted ? "6 6" : undefined}
        />
      ))}

      {!muted ? renderTracerDots(source, frame) : null}

      {drawChip({
        x: stageX(SECTION_A_X),
        y: 286,
        text: "Section A",
        tone: "sky",
        dashed,
      })}
      {drawChip({
        x: stageX(THROAT_X),
        y: 236,
        text: "Throat B",
        tone: "coral",
        dashed,
      })}

      {overlayState.continuityBridge
        ? renderContinuityBridge(frame, source, focusedOverlayId, dashed)
        : null}
      {overlayState.speedArrows ? renderSpeedArrows(frame, source, focusedOverlayId, dashed) : null}
      {overlayState.pressureGauges ? renderPressureGauges(frame, focusedOverlayId, dashed) : null}
      {overlayState.energyBars ? renderEnergyBars(frame, focusedOverlayId, dashed) : null}
      {overlayState.flowSlices ? renderSliceOverlay(frame, source, focusedOverlayId, dashed) : null}

      <text x={PIPE_LEFT} y={372} className="fill-ink-600 text-[12px]">
        Continuity fixes where the flow speeds up. Bernoulli keeps the total budget tied to speed,
        height, and static pressure in the same bounded stream.
      </text>
    </g>
  );
}

export function BernoulliPrincipleSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: BernoulliPrincipleSimulationProps) {
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const activeSource = buildPreviewSource(params, graphPreview);
  const sourceA = compare
    ? buildPreviewSource(compare.setupA, previewedSetup === "a" ? graphPreview : null)
    : null;
  const sourceB = compare
    ? buildPreviewSource(compare.setupB, previewedSetup === "b" ? graphPreview : null)
    : null;
  const activeFrame = sampleBernoulliPrincipleState(activeSource, time);
  const frameA = compare ? sampleBernoulliPrincipleState(sourceA ?? compare.setupA, time) : null;
  const frameB = compare ? sampleBernoulliPrincipleState(sourceB ?? compare.setupB, time) : null;
  const { compareEnabled, primaryFrame, secondaryFrame, primaryLabel, secondaryLabel } =
    resolveCompareScene({
      compare,
      graphPreview,
      activeFrame,
      frameA,
      frameB,
      liveLabel: "Live",
    });
  const primarySource =
    compareEnabled && previewedSetup === "a"
      ? sourceA ?? compare?.setupA ?? activeSource
      : compareEnabled && previewedSetup === "b"
        ? sourceB ?? compare?.setupB ?? activeSource
        : activeSource;
  const secondarySource =
    compareEnabled && previewedSetup === "a"
      ? sourceB ?? compare?.setupB ?? null
      : compareEnabled && previewedSetup === "b"
        ? sourceA ?? compare?.setupA ?? null
        : null;
  const previewBadgeText = resolvePreviewBadge(graphPreview);
  const overlayState = {
    continuityBridge: overlayValues?.continuityBridge ?? true,
    speedArrows: overlayValues?.speedArrows ?? true,
    pressureGauges: overlayValues?.pressureGauges ?? true,
    energyBars: overlayValues?.energyBars ?? true,
    flowSlices: overlayValues?.flowSlices ?? false,
  };
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? "Setup A")}: P_B {formatNumber(frameA?.throatPressure ?? 0)} kPa,
        v_B {formatNumber(frameA?.throatSpeed ?? 0)} m/s
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: P_B {formatNumber(frameB?.throatPressure ?? 0)} kPa,
        v_B {formatNumber(frameB?.throatSpeed ?? 0)} m/s
      </span>
    </div>
  ) : null;
  const geometryNote =
    primaryFrame.pressureTrend === "lower"
      ? "The throat pays for its faster and/or higher flow state with lower static pressure."
      : primaryFrame.pressureTrend === "higher"
        ? "This throat runs slower, so more of the Bernoulli budget remains as static pressure."
        : "The pressure change stays mild because the throat speed and height stay close to the entry state.";
  const dominantShiftNote =
    primaryFrame.dominantPressureShift === "speed"
      ? "Most of the pressure drop here is being spent on extra speed through the narrower throat."
      : primaryFrame.dominantPressureShift === "height"
        ? "Most of the pressure drop here is paying for the higher throat elevation."
        : "Both speed change and height change are sharing the pressure drop in this state.";
  const readoutRows = [
    { label: "P_A", value: formatMeasurement(primaryFrame.entryPressure, "kPa") },
    { label: "v_A", value: formatMeasurement(primaryFrame.entrySpeed, "m/s") },
    { label: "A_B", value: formatMeasurement(primaryFrame.throatArea, "m^2") },
    { label: "v_B", value: formatMeasurement(primaryFrame.throatSpeed, "m/s") },
    { label: "P_B", value: formatMeasurement(primaryFrame.throatPressure, "kPa") },
    { label: "delta P", value: formatMeasurement(primaryFrame.pressureDrop, "kPa") },
    { label: "delta y", value: formatMeasurement(primaryFrame.throatHeight, "m") },
    { label: "Total", value: formatMeasurement(primaryFrame.totalEnergyLike, "kPa") },
  ];

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(78,166,223,0.14),rgba(30,166,162,0.12))]"
      headerAside={
        <>
          <CompareLegend primaryLabel={primaryLabel} secondaryLabel={secondaryLabel} />
          {compareBadges}
          {previewBadgeText ? (
            <SimulationPreviewBadge tone="teal">{previewBadgeText}</SimulationPreviewBadge>
          ) : null}
        </>
      }
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
      >
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.58)" />
        {secondaryFrame && secondarySource ? (
          <>
            {renderBench(secondaryFrame, secondarySource, overlayState, focusedOverlayId, {
              muted: true,
              dashed: true,
              offsetX: 12,
              offsetY: 10,
            })}
            {drawChip({
              x: PIPE_RIGHT - 18,
              y: 82,
              text: `${secondaryLabel} ghost`,
              tone: "ink",
              dashed: true,
            })}
          </>
        ) : null}
        {renderBench(primaryFrame, primarySource, overlayState, focusedOverlayId)}
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel} Bernoulli state` : "Bernoulli state"}
          rows={readoutRows}
          noteLines={[
            geometryNote,
            dominantShiftNote,
            "Continuity sets the faster throat speed; Bernoulli explains the lower static pressure.",
          ]}
        />
      </svg>
    </SimulationSceneCard>
  );
}
