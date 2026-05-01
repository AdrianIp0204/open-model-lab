"use client";

import {
  CONTINUITY_EQUATION_MAX_MIDDLE_AREA,
  CONTINUITY_EQUATION_MIN_MIDDLE_AREA,
  CONTINUITY_EQUATION_SLICE_DURATION,
  CONTINUITY_EQUATION_STAGE_LENGTH,
  buildContinuityTravelProfile,
  formatMeasurement,
  formatNumber,
  sampleContinuityAreaAtPosition,
  sampleContinuityEquationState,
  sampleContinuityPositionFromProfile,
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

type ContinuityEquationSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type ContinuityFrame = ReturnType<typeof sampleContinuityEquationState>;

const WIDTH = 900;
const HEIGHT = 380;
const PIPE_LEFT = 72;
const PIPE_RIGHT = 620;
const PIPE_WIDTH = PIPE_RIGHT - PIPE_LEFT;
const CENTER_Y = 206;
const CARD_WIDTH = 230;
const CARD_X = WIDTH - CARD_WIDTH - 20;
const CARD_Y = 20;
const SAMPLE_COUNT = 121;
const SECTION_A_X = 0.42;
const SECTION_B_X = 1.4;
const STREAMLINE_FRACTIONS = [-0.56, -0.22, 0.22, 0.56];
const TRACER_COUNT = 6;

function stageX(position: number) {
  return PIPE_LEFT + (position / CONTINUITY_EQUATION_STAGE_LENGTH) * PIPE_WIDTH;
}

function halfHeightForArea(area: number) {
  const ratio =
    (area - CONTINUITY_EQUATION_MIN_MIDDLE_AREA) /
    (CONTINUITY_EQUATION_MAX_MIDDLE_AREA - CONTINUITY_EQUATION_MIN_MIDDLE_AREA);

  return 36 + Math.max(0, Math.min(1, ratio)) * 54;
}

function halfHeightAtPosition(source: SimulationParams, position: number) {
  return halfHeightForArea(sampleContinuityAreaAtPosition(source, position));
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

  if (preview.graphId === "speed-entry-area") {
    return {
      ...source,
      entryArea: preview.point.x,
    };
  }

  if (preview.graphId === "speed-middle-area" || preview.graphId === "flow-balance") {
    return {
      ...source,
      middleArea: preview.point.x,
    };
  }

  if (preview.graphId === "speed-flow-rate") {
    return {
      ...source,
      flowRate: preview.point.x,
    };
  }

  return source;
}

function resolvePreviewBadge(preview: GraphStagePreview | null | undefined) {
  if (!preview || preview.kind !== "response") {
    return null;
  }

  if (preview.graphId === "speed-entry-area") {
    return `preview A_A = ${formatMeasurement(preview.point.x, "m^2")}`;
  }

  if (preview.graphId === "speed-middle-area" || preview.graphId === "flow-balance") {
    return `preview A_B = ${formatMeasurement(preview.point.x, "m^2")}`;
  }

  if (preview.graphId === "speed-flow-rate") {
    return `preview Q = ${formatMeasurement(preview.point.x, "m^3/s")}`;
  }

  return null;
}

function buildPipePath(source: SimulationParams, rowCenter: number) {
  const positions = Array.from({ length: SAMPLE_COUNT }, (_, index) => {
    return (index / (SAMPLE_COUNT - 1)) * CONTINUITY_EQUATION_STAGE_LENGTH;
  });
  const top = positions
    .map((position, index) => {
      const x = stageX(position);
      const y = rowCenter - halfHeightAtPosition(source, position);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const bottom = positions
    .slice()
    .reverse()
    .map((position) => {
      const x = stageX(position);
      const y = rowCenter + halfHeightAtPosition(source, position);
      return `L ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return `${top} ${bottom} Z`;
}

function buildStreamlinePath(
  source: SimulationParams,
  rowCenter: number,
  fraction: number,
) {
  const positions = Array.from({ length: SAMPLE_COUNT }, (_, index) => {
    return (index / (SAMPLE_COUNT - 1)) * CONTINUITY_EQUATION_STAGE_LENGTH;
  });

  return positions
    .map((position, index) => {
      const x = stageX(position);
      const y = rowCenter + fraction * halfHeightAtPosition(source, position);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function renderAreaMarkers(
  frame: ContinuityFrame,
  source: SimulationParams,
  rowCenter: number,
  focusedOverlayId: string | null | undefined,
  dashed = false,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "areaMarkers", 0.4);
  const sectionAX = stageX(SECTION_A_X);
  const sectionBX = stageX(SECTION_B_X);
  const topA = rowCenter - halfHeightAtPosition(source, SECTION_A_X);
  const bottomA = rowCenter + halfHeightAtPosition(source, SECTION_A_X);
  const topB = rowCenter - halfHeightAtPosition(source, SECTION_B_X);
  const bottomB = rowCenter + halfHeightAtPosition(source, SECTION_B_X);

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
        x1={sectionBX}
        x2={sectionBX}
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
        x: sectionBX,
        y: topB - 20,
        text: `A_B = ${formatNumber(frame.middleArea)} m^2`,
        tone: "coral",
        dashed,
      })}
    </g>
  );
}

function renderSpeedArrows(
  frame: ContinuityFrame,
  rowCenter: number,
  focusedOverlayId: string | null | undefined,
  dashed = false,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "speedArrows", 0.42);
  const scale = 34;
  const sectionAX = stageX(SECTION_A_X);
  const sectionBX = stageX(SECTION_B_X);
  const entryLength = frame.entrySpeed * scale;
  const middleLength = frame.middleSpeed * scale;

  return (
    <g pointerEvents="none" opacity={opacity}>
      {drawArrow({
        x1: sectionAX - entryLength / 2,
        y1: rowCenter,
        x2: sectionAX + entryLength / 2,
        y2: rowCenter,
        color: "#1ea6a2",
        dashed,
      })}
      {drawArrow({
        x1: sectionBX - middleLength / 2,
        y1: rowCenter,
        x2: sectionBX + middleLength / 2,
        y2: rowCenter,
        color: "#f16659",
        dashed,
      })}
      {drawChip({
        x: sectionAX,
        y: rowCenter + 42,
        text: `v_A = ${formatNumber(frame.entrySpeed)} m/s`,
        tone: "teal",
        dashed,
      })}
      {drawChip({
        x: sectionBX,
        y: rowCenter + 42,
        text: `v_B = ${formatNumber(frame.middleSpeed)} m/s`,
        tone: "coral",
        dashed,
      })}
    </g>
  );
}

function renderFlowRateEquality(
  frame: ContinuityFrame,
  rowCenter: number,
  focusedOverlayId: string | null | undefined,
  dashed = false,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "flowRateEquality", 0.42);

  return (
    <g pointerEvents="none" opacity={opacity}>
      {drawChip({
        x: stageX(0.54),
        y: rowCenter - 92,
        text: `Q_A = ${formatNumber(frame.entryVolumeFlow)} m^3/s`,
        tone: "teal",
        dashed,
      })}
      {drawChip({
        x: stageX(1.4),
        y: rowCenter - 116,
        text: `Q_B = ${formatNumber(frame.middleVolumeFlow)} m^3/s`,
        tone: "amber",
        dashed,
      })}
      <text
        x={stageX(1.38)}
        y={rowCenter - 78}
        textAnchor="middle"
        className="fill-ink-600 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        A_A v_A = A_B v_B
      </text>
    </g>
  );
}

function renderSliceOverlay(
  frame: ContinuityFrame,
  source: SimulationParams,
  rowCenter: number,
  focusedOverlayId: string | null | undefined,
  dashed = false,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "flowSlices", 0.34);
  const sectionAX = stageX(SECTION_A_X);
  const sectionBX = stageX(SECTION_B_X);
  const entryHalfHeight = halfHeightAtPosition(source, SECTION_A_X) - 6;
  const middleHalfHeight = halfHeightAtPosition(source, SECTION_B_X) - 6;
  const entryLength = (frame.entrySliceLength / CONTINUITY_EQUATION_STAGE_LENGTH) * PIPE_WIDTH;
  const middleLength = (frame.middleSliceLength / CONTINUITY_EQUATION_STAGE_LENGTH) * PIPE_WIDTH;

  return (
    <g pointerEvents="none" opacity={opacity}>
      <rect
        x={sectionAX - entryLength / 2}
        y={rowCenter - entryHalfHeight}
        width={entryLength}
        height={entryHalfHeight * 2}
        rx="14"
        fill="rgba(30,166,162,0.14)"
        stroke="rgba(21,122,118,0.26)"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <rect
        x={sectionBX - middleLength / 2}
        y={rowCenter - middleHalfHeight}
        width={middleLength}
        height={middleHalfHeight * 2}
        rx="14"
        fill="rgba(241,102,89,0.14)"
        stroke="rgba(177,66,52,0.28)"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <text
        x={sectionAX}
        y={rowCenter - entryHalfHeight - 10}
        textAnchor="middle"
        className="fill-teal-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        {formatNumber(CONTINUITY_EQUATION_SLICE_DURATION)} s slice
      </text>
      <text
        x={sectionBX}
        y={rowCenter - middleHalfHeight - 10}
        textAnchor="middle"
        className="fill-coral-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        same Q, different length
      </text>
    </g>
  );
}

function renderTracerDots(
  source: SimulationParams,
  frame: ContinuityFrame,
  rowCenter: number,
  muted = false,
) {
  const profile = buildContinuityTravelProfile(source);

  return (
    <g pointerEvents="none" opacity={muted ? 0.42 : 1}>
      {STREAMLINE_FRACTIONS.flatMap((fraction, rowIndex) =>
        Array.from({ length: TRACER_COUNT }, (_, tracerIndex) => {
          const phase =
            (profile.totalTime * tracerIndex) / TRACER_COUNT + rowIndex * 0.08 * profile.totalTime;
          const position = sampleContinuityPositionFromProfile(profile, frame.time + phase);
          const x = stageX(position);
          const y = rowCenter + fraction * halfHeightAtPosition(source, position);

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
  frame: ContinuityFrame,
  source: SimulationParams,
  overlayState: Record<string, boolean>,
  focusedOverlayId: string | null | undefined,
  options?: { muted?: boolean; dashed?: boolean; offsetX?: number; offsetY?: number },
) {
  const { muted = false, dashed = false, offsetX = 0, offsetY = 0 } = options ?? {};
  const pipePath = buildPipePath(source, CENTER_Y);
  const shellStroke = muted ? "rgba(15,28,36,0.18)" : "rgba(15,28,36,0.12)";
  const fillTone = muted ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.92)";
  const geometryHeadline =
    frame.geometryLabel === "narrowing"
      ? "Smaller middle area, larger middle speed"
      : frame.geometryLabel === "widening"
        ? "Wider middle area, slower middle speed"
        : "Matching areas keep the speed nearly matched";

  return (
    <g transform={`translate(${offsetX} ${offsetY})`} opacity={muted ? 0.64 : 1}>
      <rect
        x={PIPE_LEFT - 24}
        y="58"
        width={PIPE_WIDTH + 46}
        height="256"
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
        Steady stream tube
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
          d={buildStreamlinePath(source, CENTER_Y, fraction)}
          fill="none"
          stroke={muted ? "rgba(15,28,36,0.12)" : "rgba(21,122,118,0.14)"}
          strokeWidth={fraction === 0 ? 2.2 : 1.4}
          strokeDasharray={muted ? "6 6" : undefined}
        />
      ))}

      {!muted ? renderTracerDots(source, frame, CENTER_Y) : null}

      {drawChip({
        x: stageX(SECTION_A_X),
        y: 290,
        text: "Section A",
        tone: "sky",
        dashed,
      })}
      {drawChip({
        x: stageX(SECTION_B_X),
        y: 290,
        text: "Section B",
        tone: "coral",
        dashed,
      })}

      {overlayState.areaMarkers
        ? renderAreaMarkers(frame, source, CENTER_Y, focusedOverlayId, dashed)
        : null}
      {overlayState.speedArrows
        ? renderSpeedArrows(frame, CENTER_Y, focusedOverlayId, dashed)
        : null}
      {overlayState.flowRateEquality
        ? renderFlowRateEquality(frame, CENTER_Y, focusedOverlayId, dashed)
        : null}
      {overlayState.flowSlices
        ? renderSliceOverlay(frame, source, CENTER_Y, focusedOverlayId, dashed)
        : null}

      <text x={PIPE_LEFT} y={336} className="fill-ink-600 text-[12px]">
        Same incompressible flow rate through each section means the fluid must speed up in a
        narrower region and slow down in a wider one.
      </text>
    </g>
  );
}

export function ContinuityEquationSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: ContinuityEquationSimulationProps) {
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const activeSource = buildPreviewSource(params, graphPreview);
  const sourceA = compare
    ? buildPreviewSource(compare.setupA, previewedSetup === "a" ? graphPreview : null)
    : null;
  const sourceB = compare
    ? buildPreviewSource(compare.setupB, previewedSetup === "b" ? graphPreview : null)
    : null;
  const activeFrame = sampleContinuityEquationState(activeSource, time);
  const frameA = compare
    ? sampleContinuityEquationState(sourceA ?? compare.setupA, time)
    : null;
  const frameB = compare
    ? sampleContinuityEquationState(sourceB ?? compare.setupB, time)
    : null;
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
    areaMarkers: overlayValues?.areaMarkers ?? true,
    speedArrows: overlayValues?.speedArrows ?? true,
    flowRateEquality: overlayValues?.flowRateEquality ?? true,
    flowSlices: overlayValues?.flowSlices ?? true,
  };
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? "Setup A")}: Q {formatNumber(frameA?.flowRate ?? 0)} m^3/s, v_B{" "}
        {formatNumber(frameA?.middleSpeed ?? 0)} m/s
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: Q {formatNumber(frameB?.flowRate ?? 0)} m^3/s, v_B{" "}
        {formatNumber(frameB?.middleSpeed ?? 0)} m/s
      </span>
    </div>
  ) : null;
  const geometryNote =
    primaryFrame.geometryLabel === "narrowing"
      ? "The middle section is smaller, so continuity pushes the fluid faster there."
      : primaryFrame.geometryLabel === "widening"
        ? "The middle section is wider, so the same flow rate can move through it more slowly."
        : "With nearly equal areas, both sections keep nearly the same speed.";
  const readoutRows = [
    { label: "Q", value: formatMeasurement(primaryFrame.flowRate, "m^3/s") },
    { label: "A_A", value: formatMeasurement(primaryFrame.entryArea, "m^2") },
    { label: "v_A", value: formatMeasurement(primaryFrame.entrySpeed, "m/s") },
    { label: "A_B", value: formatMeasurement(primaryFrame.middleArea, "m^2") },
    { label: "v_B", value: formatMeasurement(primaryFrame.middleSpeed, "m/s") },
    { label: "v_B / v_A", value: formatNumber(primaryFrame.speedRatio) },
  ];

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(30,166,162,0.14),rgba(78,166,223,0.12))]"
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
          title={compareEnabled ? `${primaryLabel} flow state` : "Flow state"}
          rows={readoutRows}
          noteLines={[
            geometryNote,
            `Both sections still carry Q = ${formatNumber(primaryFrame.middleVolumeFlow)} m^3/s in this steady-flow model.`,
            "This same speed-area bookkeeping is the flow piece Bernoulli later pairs with pressure changes.",
          ]}
        />
      </svg>
    </SimulationSceneCard>
  );
}
