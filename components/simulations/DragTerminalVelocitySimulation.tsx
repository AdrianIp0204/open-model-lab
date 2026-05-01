"use client";

import {
  DRAG_TERMINAL_VELOCITY_MAX_AREA,
  DRAG_TERMINAL_VELOCITY_MAX_POSITION,
  DRAG_TERMINAL_VELOCITY_MAX_TIME,
  DRAG_TERMINAL_VELOCITY_MIN_AREA,
  formatMeasurement,
  formatNumber,
  sampleDragTerminalVelocityState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import {
  CompareLegend,
  resolveCompareScene,
  SimulationPreviewBadge,
} from "./primitives/compare";
import { SimulationSceneCard } from "./primitives/scene-card";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type DragTerminalVelocitySimulationProps = {
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
const HEIGHT = 430;
const STAGE_X = 44;
const STAGE_Y = 54;
const STAGE_WIDTH = 568;
const STAGE_HEIGHT = 320;
const FLUID_TOP = STAGE_Y + 40;
const FLUID_BOTTOM = STAGE_Y + STAGE_HEIGHT - 28;
const FLUID_HEIGHT = FLUID_BOTTOM - FLUID_TOP;
const RULER_X = STAGE_X + 36;
const OBJECT_CENTER_X = STAGE_X + STAGE_WIDTH * 0.56;
const CARD_X = 640;
const CARD_Y = 24;
const CARD_WIDTH = 230;

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.28;
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
      stroke: "rgba(21,122,118,0.3)",
      text: "#157a76",
    },
    coral: {
      fill: "rgba(241,102,89,0.14)",
      stroke: "rgba(177,66,52,0.3)",
      text: "#9f3a2c",
    },
    amber: {
      fill: "rgba(240,171,60,0.16)",
      stroke: "rgba(184,112,0,0.3)",
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
  const width = Math.max(92, text.length * 6.5 + 18);

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
  x: number;
  y: number;
  length: number;
  direction: "up" | "down";
  color: string;
  dashed?: boolean;
  opacity?: number;
  label?: string;
}) {
  const { x, y, length, direction, color, dashed = false, opacity = 1, label } = options;
  const sign = direction === "down" ? 1 : -1;
  const endY = y + sign * length;
  const headSize = 10;
  const leftX = x - 6;
  const rightX = x + 6;
  const baseY = endY - sign * headSize;

  return (
    <g opacity={opacity}>
      <line
        x1={x}
        y1={y}
        x2={x}
        y2={endY}
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={dashed ? "6 4" : undefined}
      />
      <path
        d={
          direction === "down"
            ? `M ${x} ${endY} L ${leftX} ${baseY} L ${rightX} ${baseY} Z`
            : `M ${x} ${endY} L ${leftX} ${baseY} L ${rightX} ${baseY} Z`
        }
        fill={color}
      />
      {label ? (
        <text
          x={x + 14}
          y={direction === "down" ? y + length / 2 + 4 : y - length / 2 + 4}
          className="text-[10px] font-semibold"
          fill={color}
        >
          {label}
        </text>
      ) : null}
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

  if (preview.graphId === "terminal-speed-mass") {
    return {
      ...source,
      mass: preview.point.x,
    };
  }

  if (preview.graphId === "terminal-speed-area") {
    return {
      ...source,
      area: preview.point.x,
    };
  }

  if (preview.graphId === "terminal-speed-drag-strength") {
    return {
      ...source,
      dragStrength: preview.point.x,
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
  return sampleDragTerminalVelocityState(
    buildPreviewSource(source, graphPreview),
    displayTime,
  );
}

function resolveBodySize(area: number) {
  const ratio =
    (area - DRAG_TERMINAL_VELOCITY_MIN_AREA) /
    (DRAG_TERMINAL_VELOCITY_MAX_AREA - DRAG_TERMINAL_VELOCITY_MIN_AREA);
  return {
    width: 38 + ratio * 56,
    height: 28 + ratio * 24,
  };
}

function resolveObjectY(position: number) {
  const ratio = Math.min(1, position / DRAG_TERMINAL_VELOCITY_MAX_POSITION);
  return FLUID_TOP + ratio * (FLUID_HEIGHT - 36);
}

function resolvePreviewBadge(preview: GraphStagePreview | null | undefined) {
  if (!preview || preview.kind !== "response") {
    return null;
  }

  if (preview.graphId === "terminal-speed-mass") {
    return `preview m = ${formatMeasurement(preview.point.x, "kg")}`;
  }

  if (preview.graphId === "terminal-speed-area") {
    return `preview A = ${formatMeasurement(preview.point.x, "m^2")}`;
  }

  if (preview.graphId === "terminal-speed-drag-strength") {
    return `preview k = ${formatNumber(preview.point.x)}`;
  }

  return null;
}

function renderBench(
  frame: ReturnType<typeof sampleDragTerminalVelocityState>,
  displayTime: number,
  overlayState: Record<string, boolean>,
  focusedOverlayId: string | null | undefined,
  options?: { muted?: boolean; dashed?: boolean; offsetX?: number; offsetY?: number },
) {
  const { muted = false, dashed = false, offsetX = 0, offsetY = 0 } = options ?? {};
  const body = resolveBodySize(frame.area);
  const objectY = resolveObjectY(frame.position);
  const massTint = 246 - frame.massRatio * 70;
  const bodyFill = `rgb(${massTint} ${198 - frame.massRatio * 35} ${88 + frame.areaRatio * 40})`;
  const wakeOpacity = (0.12 + frame.speedRatio * 0.32) * (muted ? 0.45 : 1);
  const forceWeight = overlayWeight(focusedOverlayId, "forceBalance");
  const terminalWeight = overlayWeight(focusedOverlayId, "terminalBand");
  const rulerWeight = overlayWeight(focusedOverlayId, "distanceGuide");
  const weightArrowLength = 34 + frame.massRatio * 26;
  const dragArrowLength = 12 + frame.dragFraction * 48;
  const netArrowLength = 8 + (frame.netForce / Math.max(frame.weightForce, 1e-6)) * 34;

  return (
    <g transform={`translate(${offsetX} ${offsetY})`} opacity={muted ? 0.56 : 1}>
      <rect
        x={STAGE_X}
        y={STAGE_Y}
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
        rx="28"
        fill={muted ? "rgba(255,255,255,0.54)" : "rgba(255,252,247,0.95)"}
        stroke={muted ? "rgba(15,28,36,0.16)" : "rgba(15,28,36,0.1)"}
        strokeWidth="1.5"
        strokeDasharray={dashed ? "7 5" : undefined}
      />

      <text
        x={STAGE_X}
        y={STAGE_Y - 16}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
      >
        Resistive fall bench
      </text>
      <text
        x={STAGE_X}
        y={STAGE_Y + 18}
        className="fill-ink-950 text-[15px] font-semibold"
      >
        {frame.balanceLabel === "near-terminal"
          ? "Drag is now nearly balancing weight"
          : frame.balanceLabel === "approaching-balance"
            ? "Drag is catching up as the object speeds up"
            : "The object is still in the fast-acceleration part of the fall"}
      </text>

      <rect
        x={STAGE_X + 18}
        y={FLUID_TOP}
        width={STAGE_WIDTH - 36}
        height={FLUID_HEIGHT}
        rx="24"
        fill={muted ? "rgba(78,166,223,0.12)" : "rgba(78,166,223,0.18)"}
        stroke={muted ? "rgba(29,111,159,0.2)" : "rgba(29,111,159,0.24)"}
        strokeDasharray={dashed ? "6 5" : undefined}
      />
      {Array.from({ length: 6 }, (_, index) => {
        const y = FLUID_TOP + ((index + 1) / 7) * FLUID_HEIGHT;
        const speedShift = ((displayTime * 52 + index * 34) % 130) - 65;

        return (
          <g key={`wake-${index}`} opacity={wakeOpacity}>
            <line
              x1={STAGE_X + 68 + speedShift}
              x2={STAGE_X + 188 + speedShift}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.82)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <line
              x1={STAGE_X + 274 - speedShift * 0.35}
              x2={STAGE_X + 392 - speedShift * 0.35}
              y1={y + 10}
              y2={y + 10}
              stroke="rgba(255,255,255,0.54)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </g>
        );
      })}

      {overlayState.distanceGuide ? (
        <g opacity={rulerWeight}>
          <line
            x1={RULER_X}
            x2={RULER_X}
            y1={FLUID_TOP}
            y2={FLUID_BOTTOM}
            stroke="rgba(15,28,36,0.34)"
            strokeWidth="2"
          />
          {Array.from({ length: 5 }, (_, index) => {
            const meters = (DRAG_TERMINAL_VELOCITY_MAX_POSITION / 4) * index;
            const tickY =
              FLUID_TOP + (index / 4) * (FLUID_BOTTOM - FLUID_TOP);

            return (
              <g key={`tick-${index}`}>
                <line
                  x1={RULER_X - 10}
                  x2={RULER_X + 10}
                  y1={tickY}
                  y2={tickY}
                  stroke="rgba(15,28,36,0.34)"
                  strokeWidth="1.6"
                />
                <text
                  x={RULER_X - 16}
                  y={tickY + 4}
                  textAnchor="end"
                  className="fill-ink-500 text-[10px] font-semibold"
                >
                  {formatNumber(meters)} m
                </text>
              </g>
            );
          })}
          <line
            x1={RULER_X}
            x2={OBJECT_CENTER_X - body.width / 2 - 14}
            y1={objectY}
            y2={objectY}
            stroke="rgba(21,122,118,0.42)"
            strokeWidth="2"
            strokeDasharray="6 5"
          />
          {drawChip({
            x: RULER_X + 78,
            y: objectY - 18,
            text: `y = ${formatNumber(frame.position)} m`,
            tone: "teal",
          })}
        </g>
      ) : null}

      <g>
        {overlayState.terminalBand ? (
          <g opacity={terminalWeight}>
            <circle
              cx={OBJECT_CENTER_X}
              cy={objectY}
              r={body.width / 2 + 16}
              fill="none"
              stroke="rgba(21,122,118,0.26)"
              strokeWidth="2"
              strokeDasharray="7 5"
            />
            {drawChip({
              x: OBJECT_CENTER_X,
              y: objectY - body.height / 2 - 22,
              text:
                frame.balanceLabel === "near-terminal"
                  ? `near v_t = ${formatNumber(frame.terminalSpeed)} m/s`
                  : `v_t = ${formatNumber(frame.terminalSpeed)} m/s`,
              tone: "teal",
            })}
          </g>
        ) : null}

        <rect
          data-testid="drag-terminal-velocity-object"
          x={OBJECT_CENTER_X - body.width / 2}
          y={objectY - body.height / 2}
          width={body.width}
          height={body.height}
          rx={body.height / 2}
          fill={bodyFill}
          stroke={muted ? "rgba(15,28,36,0.2)" : "rgba(15,28,36,0.18)"}
          strokeWidth="1.5"
          strokeDasharray={dashed ? "6 5" : undefined}
        />
        <rect
          x={OBJECT_CENTER_X - body.width / 2 + 8}
          y={objectY - body.height / 2 + 6}
          width={body.width - 16}
          height={body.height - 12}
          rx={(body.height - 12) / 2}
          fill="rgba(255,255,255,0.18)"
        />
        {drawChip({
          x: OBJECT_CENTER_X,
          y: objectY + body.height / 2 + 22,
          text: `v = ${formatNumber(frame.speed)} m/s`,
          tone: "sky",
          dashed,
        })}
      </g>

      {overlayState.forceBalance ? (
        <g opacity={forceWeight}>
          {drawArrow({
            x: OBJECT_CENTER_X - body.width / 2 - 34,
            y: objectY - 12,
            length: weightArrowLength,
            direction: "down",
            color: "#b45309",
            dashed,
            label: `W = ${formatNumber(frame.weightForce)} N`,
          })}
          {drawArrow({
            x: OBJECT_CENTER_X + body.width / 2 + 34,
            y: objectY + 12,
            length: dragArrowLength,
            direction: "up",
            color: "#1d6f9f",
            dashed,
            label: `F_d = ${formatNumber(frame.dragForce)} N`,
          })}
          {drawArrow({
            x: OBJECT_CENTER_X,
            y: objectY + body.height / 2 + 16,
            length: netArrowLength,
            direction: "down",
            color: "#0f1c24",
            dashed,
            opacity: 0.8,
            label: `F_net = ${formatNumber(frame.netForce)} N`,
          })}
        </g>
      ) : null}

      {overlayState.terminalBand ? (
        <g opacity={terminalWeight}>
          {drawChip({
            x: STAGE_X + STAGE_WIDTH - 122,
            y: FLUID_TOP + 24,
            text: `drag / weight = ${formatNumber(frame.dragFraction)}`,
            tone: "amber",
            dashed,
          })}
          <text
            x={STAGE_X + STAGE_WIDTH - 204}
            y={FLUID_TOP + 54}
            className="fill-ink-600 text-[11px]"
          >
            Terminal speed is where the drag arrow grows to match weight.
          </text>
        </g>
      ) : null}

      <text
        x={STAGE_X}
        y={HEIGHT - 22}
        className="fill-ink-600 text-[12px]"
      >
        The model keeps one object dropping from rest in one fluid, so drag grows with speed until
        the upward resistive force nearly balances the constant weight.
      </text>
    </g>
  );
}

export function DragTerminalVelocitySimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: DragTerminalVelocitySimulationProps) {
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const activeFrame = resolveFrame(params, time, graphPreview);
  const frameA = compare
    ? resolveFrame(compare.setupA, time, previewedSetup === "a" ? graphPreview : null)
    : null;
  const frameB = compare
    ? resolveFrame(compare.setupB, time, previewedSetup === "b" ? graphPreview : null)
    : null;
  const { compareEnabled, primaryFrame, secondaryFrame, primaryLabel, secondaryLabel } =
    resolveCompareScene({
      compare,
      graphPreview,
      activeFrame,
      frameA,
      frameB,
    });
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  const previewBadgeText = resolvePreviewBadge(graphPreview);
  const overlayState = {
    forceBalance: overlayValues?.forceBalance ?? true,
    terminalBand: overlayValues?.terminalBand ?? true,
    distanceGuide: overlayValues?.distanceGuide ?? true,
  };
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? "Setup A")}: v_t {formatNumber(frameA?.terminalSpeed ?? 0)} m/s,
        drag ratio {formatNumber(frameA?.dragFraction ?? 0)}
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: v_t {formatNumber(frameB?.terminalSpeed ?? 0)} m/s,
        gap {formatNumber(frameB?.terminalGap ?? 0)} m/s
      </span>
    </div>
  ) : null;
  const balanceNote =
    primaryFrame.balanceLabel === "near-terminal"
      ? "Drag and weight are now nearly equal, so the acceleration has almost collapsed."
      : primaryFrame.balanceLabel === "approaching-balance"
        ? "The drag force is now a large fraction of the weight, so the speed curve is flattening."
        : "Right after release the speed is still small, so drag is much weaker than the constant weight.";
  const massAreaNote =
    primaryFrame.terminalSpeed >= 6
      ? "This setup needs a relatively high speed before drag can catch the weight, which happens when the mass-to-drag-area ratio is larger."
      : "This setup settles at a lower terminal speed because drag grows quickly compared with the weight.";
  const metricRows = [
    { label: "m", value: formatMeasurement(primaryFrame.mass, "kg") },
    { label: "A", value: formatMeasurement(primaryFrame.area, "m^2") },
    { label: "k", value: formatNumber(primaryFrame.dragStrength) },
    { label: "y", value: formatMeasurement(primaryFrame.position, "m") },
    { label: "v", value: formatMeasurement(primaryFrame.speed, "m/s") },
    { label: "v_t", value: formatMeasurement(primaryFrame.terminalSpeed, "m/s") },
    { label: "F_d", value: formatMeasurement(primaryFrame.dragForce, "N") },
    { label: "F_net", value: formatMeasurement(primaryFrame.netForce, "N") },
  ];

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(240,171,60,0.16),rgba(78,166,223,0.14))]"
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
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.56)" />
        {secondaryFrame ? (
          <>
            {renderBench(secondaryFrame, displayTime, overlayState, focusedOverlayId, {
              muted: true,
              dashed: true,
              offsetX: 12,
              offsetY: 10,
            })}
            {drawChip({
              x: STAGE_X + STAGE_WIDTH - 16,
              y: STAGE_Y - 18,
              text: `${secondaryLabel} ghost`,
              tone: "ink",
              dashed: true,
            })}
          </>
        ) : null}
        {renderBench(primaryFrame, displayTime, overlayState, focusedOverlayId)}
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel} fall state` : "Fall state"}
          rows={metricRows}
          noteLines={[
            `t = ${formatNumber(displayTime)} s of ${formatNumber(DRAG_TERMINAL_VELOCITY_MAX_TIME)} s`,
            balanceNote,
            massAreaNote,
          ]}
        />
      </svg>
    </SimulationSceneCard>
  );
}
