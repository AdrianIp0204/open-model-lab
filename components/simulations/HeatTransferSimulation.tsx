"use client";

import {
  formatNumber,
  sampleHeatTransferState,
  HEAT_TRANSFER_MAX_SURFACE_AREA,
  HEAT_TRANSFER_MIN_SURFACE_AREA,
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

type HeatTransferSimulationProps = {
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
const STAGE_X = 34;
const STAGE_Y = 40;
const STAGE_WIDTH = 590;
const STAGE_HEIGHT = 302;
const CARD_X = 648;
const CARD_Y = 22;
const CARD_WIDTH = 228;
const HOT_X = 102;
const HOT_Y = 136;
const HOT_WIDTH = 170;
const HOT_HEIGHT = 118;
const ROOM_X = 392;
const ROOM_Y = 86;
const ROOM_WIDTH = 200;
const ROOM_HEIGHT = 190;
const CONTACT_Y = HOT_Y + HOT_HEIGHT / 2 + 6;
const CONTACT_START_X = HOT_X + HOT_WIDTH;
const CONTACT_END_X = ROOM_X;
const SHARE_BAR_X = STAGE_X + 18;
const SHARE_BAR_Y = STAGE_Y + STAGE_HEIGHT - 36;
const SHARE_BAR_WIDTH = STAGE_WIDTH - 36;

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.28;
}

function mixChannel(start: number, end: number, amount: number) {
  return Math.round(start + (end - start) * amount);
}

function mixColor(start: [number, number, number], end: [number, number, number], amount: number) {
  const t = Math.min(1, Math.max(0, amount));
  return `rgb(${mixChannel(start[0], end[0], t)} ${mixChannel(start[1], end[1], t)} ${mixChannel(start[2], end[2], t)})`;
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
      fill: "rgba(255,255,255,0.9)",
      stroke: "rgba(15,28,36,0.16)",
      text: "#0f1c24",
    },
  }[tone];
  const width = Math.max(80, text.length * 6.6 + 18);

  return (
    <g transform={`translate(${x} ${y})`} opacity={muted ? 0.58 : 1}>
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

function interpolateQuadratic(
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
  t: number,
) {
  const oneMinusT = 1 - t;

  return {
    x:
      oneMinusT * oneMinusT * start.x +
      2 * oneMinusT * t * control.x +
      t * t * end.x,
    y:
      oneMinusT * oneMinusT * start.y +
      2 * oneMinusT * t * control.y +
      t * t * end.y,
  };
}

function renderLinearDots(options: {
  startX: number;
  endX: number;
  y: number;
  rate: number;
  time: number;
  color: string;
  dashed?: boolean;
  muted?: boolean;
}) {
  const { startX, endX, y, rate, time, color, dashed = false, muted = false } = options;
  const magnitude = Math.abs(rate);

  if (magnitude < 0.2) {
    return null;
  }

  const direction = rate >= 0 ? 1 : -1;
  const speed = 0.42 + Math.min(0.55, magnitude / 45);

  return (
    <g opacity={muted ? 0.45 : 1}>
      {Array.from({ length: 5 }, (_, index) => {
        const progress = (time * speed + index * 0.19) % 1;
        const t = direction > 0 ? progress : 1 - progress;
        const x = startX + (endX - startX) * t;

        return (
          <circle
            key={`line-dot-${index}`}
            cx={x}
            cy={y}
            r={dashed ? 4 : 4.6}
            fill={color}
            opacity={0.88 - index * 0.08}
          />
        );
      })}
    </g>
  );
}

function renderQuadraticDots(options: {
  start: { x: number; y: number };
  control: { x: number; y: number };
  end: { x: number; y: number };
  rate: number;
  time: number;
  color: string;
  muted?: boolean;
}) {
  const { start, control, end, rate, time, color, muted = false } = options;
  const magnitude = Math.abs(rate);

  if (magnitude < 0.2) {
    return null;
  }

  const direction = rate >= 0 ? 1 : -1;
  const speed = 0.35 + Math.min(0.45, magnitude / 60);

  return (
    <g opacity={muted ? 0.38 : 1}>
      {Array.from({ length: 4 }, (_, index) => {
        const progress = (time * speed + index * 0.23) % 1;
        const t = direction > 0 ? progress : 1 - progress;
        const point = interpolateQuadratic(start, control, end, t);

        return (
          <circle
            key={`curve-dot-${index}`}
            cx={point.x}
            cy={point.y}
            r={4.2}
            fill={color}
            opacity={0.88 - index * 0.1}
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

  if (preview.graphId === "contact-response") {
    return {
      ...source,
      contactQuality: preview.point.x,
    };
  }

  if (preview.graphId === "contrast-response") {
    const ambientTemperature =
      typeof source.ambientTemperature === "number" ? source.ambientTemperature : 25;

    return {
      ...source,
      hotTemperature: ambientTemperature + preview.point.x,
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
  return sampleHeatTransferState(buildPreviewSource(source, graphPreview), displayTime);
}

function renderBench(
  frame: ReturnType<typeof sampleHeatTransferState>,
  displayTime: number,
  overlayState: Record<string, boolean>,
  focusedOverlayId: string | null | undefined,
  options?: { muted?: boolean; dashed?: boolean; offsetX?: number; offsetY?: number },
) {
  const { muted = false, dashed = false, offsetX = 0, offsetY = 0 } = options ?? {};
  const hotFill = mixColor([244, 181, 76], [225, 82, 54], frame.hotTemperatureRatio);
  const hotGlow = mixColor([255, 228, 179], [249, 115, 22], frame.hotTemperatureRatio);
  const direction = frame.totalRate >= 0 ? 1 : -1;
  const patchWidth =
    46 +
    ((frame.surfaceArea - HEAT_TRANSFER_MIN_SURFACE_AREA) /
      (HEAT_TRANSFER_MAX_SURFACE_AREA - HEAT_TRANSFER_MIN_SURFACE_AREA)) *
      92;
  const contactStroke = 6 + frame.contactPathStrength * 6;
  const conductionOpacity = 0.2 + Math.min(0.75, Math.abs(frame.conductionRate) / 42);
  const convectionOpacity = 0.18 + Math.min(0.72, Math.abs(frame.convectionRate) / 34);
  const radiationOpacity = 0.18 + Math.min(0.72, Math.abs(frame.radiationRate) / 26);
  const deltaWeight = overlayWeight(focusedOverlayId, "deltaBridge");
  const pathWeight = overlayWeight(focusedOverlayId, "pathwaySplit");
  const areaWeight = overlayWeight(focusedOverlayId, "areaCue");
  const environmentWeight = overlayWeight(focusedOverlayId, "environmentCue");
  const shareConductionWidth = SHARE_BAR_WIDTH * frame.conductionShare;
  const shareConvectionWidth = SHARE_BAR_WIDTH * frame.convectionShare;
  const shareRadiationWidth = SHARE_BAR_WIDTH * frame.radiationShare;

  return (
    <g transform={`translate(${offsetX} ${offsetY})`} opacity={muted ? 0.52 : 1}>
      <rect
        x={STAGE_X}
        y={STAGE_Y}
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
        rx="26"
        fill={muted ? "rgba(255,255,255,0.54)" : "rgba(255,252,247,0.95)"}
        stroke={muted ? "rgba(15,28,36,0.16)" : "rgba(15,28,36,0.1)"}
        strokeWidth="1.4"
        strokeDasharray={dashed ? "6 5" : undefined}
      />

      <rect
        x={ROOM_X}
        y={ROOM_Y}
        width={ROOM_WIDTH}
        height={ROOM_HEIGHT}
        rx="26"
        fill={muted ? "rgba(202,229,244,0.28)" : "rgba(207,232,247,0.44)"}
        stroke="rgba(78,166,223,0.22)"
        strokeDasharray={dashed ? "6 5" : undefined}
      />
      <text x={ROOM_X + 18} y={ROOM_Y + 26} className="fill-sky-700 text-[11px] font-semibold uppercase tracking-[0.18em]">
        room and bench sink
      </text>
      <text x={ROOM_X + 18} y={ROOM_Y + 46} className="fill-ink-600 text-[12px]">
        fixed at {formatNumber(frame.ambientTemperature)} degC
      </text>

      <rect
        x={HOT_X}
        y={HOT_Y}
        width={HOT_WIDTH}
        height={HOT_HEIGHT}
        rx="26"
        fill={hotFill}
        stroke={muted ? "rgba(126,58,24,0.28)" : "rgba(126,58,24,0.34)"}
        strokeWidth="2"
        strokeDasharray={dashed ? "6 5" : undefined}
      />
      <rect
        x={HOT_X + 12}
        y={HOT_Y + 12}
        width={HOT_WIDTH - 24}
        height={HOT_HEIGHT - 24}
        rx="18"
        fill={hotGlow}
        opacity={0.22 + frame.rateMagnitudeRatio * 0.3}
      />
      <text x={HOT_X + 18} y={HOT_Y + 26} className="fill-white text-[11px] font-semibold uppercase tracking-[0.18em]">
        hot block
      </text>
      <text x={HOT_X + 18} y={HOT_Y + 48} className="fill-white/90 text-[12px]">
        energy flows only if a temperature gap exists
      </text>

      <rect
        x={CONTACT_START_X - 2}
        y={CONTACT_Y - 7}
        width={CONTACT_END_X - CONTACT_START_X + 4}
        height="14"
        rx="7"
        fill={muted ? "rgba(255,255,255,0.34)" : "rgba(255,255,255,0.68)"}
      />
      <rect
        x={CONTACT_START_X - patchWidth / 2 + 18}
        y={CONTACT_Y - 8}
        width={patchWidth}
        height="16"
        rx="8"
        fill={muted ? "rgba(30,166,162,0.14)" : "rgba(30,166,162,0.24)"}
        opacity={overlayState.areaCue ? areaWeight : 0.34}
      />
      <line
        x1={CONTACT_START_X}
        y1={CONTACT_Y}
        x2={CONTACT_END_X}
        y2={CONTACT_Y}
        stroke="rgba(30,166,162,0.72)"
        strokeWidth={contactStroke}
        strokeLinecap="round"
        strokeDasharray={dashed ? "8 6" : undefined}
        opacity={overlayState.pathwaySplit ? conductionOpacity * pathWeight : conductionOpacity * 0.65}
      />
      {renderLinearDots({
        startX: CONTACT_START_X,
        endX: CONTACT_END_X,
        y: CONTACT_Y,
        rate: frame.conductionRate,
        time: displayTime,
        color: "#157a76",
        dashed,
        muted,
      })}

      {[
        {
          id: "conv-1",
          start: { x: HOT_X + 48, y: HOT_Y + 10 },
          control: { x: HOT_X + 108, y: HOT_Y - 54 },
          end: { x: ROOM_X + 36, y: ROOM_Y + 32 },
        },
        {
          id: "conv-2",
          start: { x: HOT_X + 92, y: HOT_Y + 6 },
          control: { x: HOT_X + 164, y: HOT_Y - 64 },
          end: { x: ROOM_X + 76, y: ROOM_Y + 20 },
        },
        {
          id: "conv-3",
          start: { x: HOT_X + 138, y: HOT_Y + 12 },
          control: { x: HOT_X + 208, y: HOT_Y - 34 },
          end: { x: ROOM_X + 114, y: ROOM_Y + 42 },
        },
      ].map((path) => (
        <g key={path.id}>
          <path
            d={`M ${path.start.x} ${path.start.y} Q ${path.control.x} ${path.control.y} ${path.end.x} ${path.end.y}`}
            fill="none"
            stroke="rgba(78,166,223,0.72)"
            strokeWidth={2.4 + Math.min(4, Math.abs(frame.convectionRate) / 12)}
            strokeLinecap="round"
            strokeDasharray={dashed ? "7 5" : "12 9"}
            opacity={
              overlayState.pathwaySplit ? convectionOpacity * pathWeight : convectionOpacity * 0.65
            }
          />
          {renderQuadraticDots({
            start: path.start,
            control: path.control,
            end: path.end,
            rate: frame.convectionRate,
            time: displayTime,
            color: "#4ea6df",
            muted,
          })}
        </g>
      ))}

      {[
        {
          id: "rad-1",
          start: { x: HOT_X + HOT_WIDTH - 14, y: HOT_Y + 18 },
          control: { x: HOT_X + HOT_WIDTH + 86, y: HOT_Y - 24 },
          end: { x: ROOM_X + 138, y: ROOM_Y + 14 },
        },
        {
          id: "rad-2",
          start: { x: HOT_X + HOT_WIDTH - 10, y: HOT_Y + HOT_HEIGHT / 2 },
          control: { x: HOT_X + HOT_WIDTH + 110, y: HOT_Y + HOT_HEIGHT / 2 - 24 },
          end: { x: ROOM_X + 164, y: ROOM_Y + ROOM_HEIGHT / 2 - 18 },
        },
        {
          id: "rad-3",
          start: { x: HOT_X + HOT_WIDTH - 18, y: HOT_Y + HOT_HEIGHT - 18 },
          control: { x: HOT_X + HOT_WIDTH + 84, y: HOT_Y + HOT_HEIGHT + 34 },
          end: { x: ROOM_X + 142, y: ROOM_Y + ROOM_HEIGHT - 18 },
        },
      ].map((path) => (
        <g key={path.id}>
          <path
            d={`M ${path.start.x} ${path.start.y} Q ${path.control.x} ${path.control.y} ${path.end.x} ${path.end.y}`}
            fill="none"
            stroke="rgba(240,171,60,0.82)"
            strokeWidth={2 + Math.min(3.8, Math.abs(frame.radiationRate) / 8)}
            strokeLinecap="round"
            strokeDasharray={dashed ? "6 5" : "4 9"}
            opacity={
              overlayState.pathwaySplit ? radiationOpacity * pathWeight : radiationOpacity * 0.65
            }
          />
          {renderQuadraticDots({
            start: path.start,
            control: path.control,
            end: path.end,
            rate: frame.radiationRate,
            time: displayTime,
            color: "#f0ab3c",
            muted,
          })}
        </g>
      ))}

      {overlayState.environmentCue ? (
        <g opacity={environmentWeight}>
          <line
            x1={ROOM_X + 16}
            y1={ROOM_Y + ROOM_HEIGHT + 16}
            x2={ROOM_X + 96}
            y2={ROOM_Y + ROOM_HEIGHT + 16}
            stroke="rgba(78,166,223,0.36)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {Array.from({ length: 3 }, (_, index) => (
            <g
              key={`air-${index}`}
              transform={`translate(${ROOM_X + 36 + index * 34} ${ROOM_Y + ROOM_HEIGHT + 16})`}
            >
              <line
                x1="-10"
                y1="0"
                x2="10"
                y2="0"
                stroke="rgba(78,166,223,0.92)"
                strokeWidth={1.8 + frame.airflow * 0.5}
                strokeLinecap="round"
              />
              <path
                d="M 10 0 L 3 -4 M 10 0 L 3 4"
                fill="none"
                stroke="rgba(78,166,223,0.92)"
                strokeWidth={1.8 + frame.airflow * 0.4}
                strokeLinecap="round"
              />
            </g>
          ))}
          {drawChip({
            x: ROOM_X + 108,
            y: ROOM_Y + ROOM_HEIGHT + 42,
            text: `airflow = ${formatNumber(frame.airflow)}`,
            tone: "sky",
            dashed,
            muted,
          })}
        </g>
      ) : null}

      {overlayState.areaCue ? (
        <g opacity={areaWeight}>
          <rect
            x={HOT_X - 8}
            y={HOT_Y - 8}
            width={HOT_WIDTH + 16}
            height={HOT_HEIGHT + 16}
            rx="32"
            fill="none"
            stroke="rgba(240,171,60,0.65)"
            strokeWidth={2 + frame.surfaceArea}
            strokeDasharray="8 7"
          />
          {drawChip({
            x: HOT_X + HOT_WIDTH / 2,
            y: HOT_Y + HOT_HEIGHT + 30,
            text: `surface area = ${formatNumber(frame.surfaceArea)}`,
            tone: "amber",
            dashed,
            muted,
          })}
        </g>
      ) : null}

      {overlayState.deltaBridge ? (
        <g opacity={deltaWeight}>
          <line
            x1={HOT_X + HOT_WIDTH / 2}
            y1={STAGE_Y + 30}
            x2={ROOM_X + ROOM_WIDTH / 2}
            y2={STAGE_Y + 30}
            stroke="rgba(15,28,36,0.24)"
            strokeWidth="2"
            strokeDasharray={dashed ? "6 4" : undefined}
          />
          <path
            d={
              direction >= 0
                ? `M ${ROOM_X + ROOM_WIDTH / 2 - 12} ${STAGE_Y + 30} L ${ROOM_X + ROOM_WIDTH / 2 - 20} ${STAGE_Y + 24} M ${ROOM_X + ROOM_WIDTH / 2 - 12} ${STAGE_Y + 30} L ${ROOM_X + ROOM_WIDTH / 2 - 20} ${STAGE_Y + 36}`
                : `M ${HOT_X + HOT_WIDTH / 2 + 12} ${STAGE_Y + 30} L ${HOT_X + HOT_WIDTH / 2 + 20} ${STAGE_Y + 24} M ${HOT_X + HOT_WIDTH / 2 + 12} ${STAGE_Y + 30} L ${HOT_X + HOT_WIDTH / 2 + 20} ${STAGE_Y + 36}`
            }
            fill="none"
            stroke="rgba(15,28,36,0.44)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {drawChip({
            x: STAGE_X + STAGE_WIDTH / 2,
            y: STAGE_Y + 30,
            text:
              frame.directionLabel === "balanced"
                ? "delta T almost gone"
                : `delta T = ${formatNumber(frame.temperatureContrast)} degC`,
            tone: "ink",
            dashed,
            muted,
          })}
        </g>
      ) : null}

      {drawChip({
        x: HOT_X + HOT_WIDTH / 2,
        y: HOT_Y - 24,
        text: `T_hot = ${formatNumber(frame.hotTemperature)} degC`,
        tone: "coral",
        dashed,
        muted,
      })}
      {drawChip({
        x: ROOM_X + ROOM_WIDTH / 2,
        y: ROOM_Y - 22,
        text: `T_room = ${formatNumber(frame.ambientTemperature)} degC`,
        tone: "sky",
        dashed,
        muted,
      })}

      {overlayState.pathwaySplit ? (
        <g opacity={pathWeight}>
          <rect
            x={SHARE_BAR_X}
            y={SHARE_BAR_Y}
            width={SHARE_BAR_WIDTH}
            height="18"
            rx="9"
            fill="rgba(15,28,36,0.06)"
          />
          <rect
            x={SHARE_BAR_X}
            y={SHARE_BAR_Y}
            width={shareConductionWidth}
            height="18"
            rx="9"
            fill="rgba(30,166,162,0.58)"
          />
          <rect
            x={SHARE_BAR_X + shareConductionWidth}
            y={SHARE_BAR_Y}
            width={shareConvectionWidth}
            height="18"
            fill="rgba(78,166,223,0.56)"
          />
          <rect
            x={SHARE_BAR_X + shareConductionWidth + shareConvectionWidth}
            y={SHARE_BAR_Y}
            width={shareRadiationWidth}
            height="18"
            rx="9"
            fill="rgba(240,171,60,0.58)"
          />
          {drawChip({
            x: SHARE_BAR_X + 82,
            y: SHARE_BAR_Y + 9,
            text: `cond = ${formatNumber(frame.conductionRate)} u/s`,
            tone: "teal",
            dashed,
            muted,
          })}
          {drawChip({
            x: SHARE_BAR_X + SHARE_BAR_WIDTH / 2,
            y: SHARE_BAR_Y + 9,
            text: `conv = ${formatNumber(frame.convectionRate)} u/s`,
            tone: "sky",
            dashed,
            muted,
          })}
          {drawChip({
            x: SHARE_BAR_X + SHARE_BAR_WIDTH - 92,
            y: SHARE_BAR_Y + 9,
            text: `rad = ${formatNumber(frame.radiationRate)} u/s`,
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
        Heat is energy transfer due to temperature difference. Contact shapes conduction, moving air
        shapes convection, and radiation keeps working without contact.
      </text>
    </g>
  );
}

export function HeatTransferSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: HeatTransferSimulationProps) {
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
    ) : graphPreview?.kind === "response" && graphPreview.graphId === "contact-response" ? (
      <span className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral-700">
        preview contact = {formatNumber(graphPreview.point.x)}
      </span>
    ) : graphPreview?.kind === "response" ? (
      <span className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral-700">
        preview delta T = {formatNumber(graphPreview.point.x)} degC
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
        {(compare?.labelA ?? "Setup A")}: delta T = {formatNumber(frameA?.temperatureContrast ?? 0)} degC,
        q = {formatNumber(frameA?.totalRate ?? 0)} u/s
      </span>
      <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold text-ink-700">
        {(compare?.labelB ?? "Setup B")}: delta T = {formatNumber(frameB?.temperatureContrast ?? 0)} degC,
        q = {formatNumber(frameB?.totalRate ?? 0)} u/s
      </span>
    </div>
  ) : null;
  const overlayState = {
    deltaBridge: overlayValues?.deltaBridge ?? true,
    pathwaySplit: overlayValues?.pathwaySplit ?? true,
    areaCue: overlayValues?.areaCue ?? true,
    environmentCue: overlayValues?.environmentCue ?? true,
  };
  const noteLines = [
    primaryFrame.directionLabel === "outward"
      ? "Energy is leaving the hotter block because the room is cooler."
      : primaryFrame.directionLabel === "inward"
        ? "Energy is entering the block because the surroundings are hotter."
        : "The temperature gap is almost gone, so the net rate is close to zero.",
    primaryFrame.dominantPathway === "conduction"
      ? "Conduction dominates because the material-contact path is strong."
      : primaryFrame.dominantPathway === "convection"
        ? "Convection dominates because airflow is carrying energy away fastest."
        : primaryFrame.dominantPathway === "radiation"
          ? "Radiation dominates because the temperature contrast is large even with weak contact."
          : "No single pathway dominates; the transfer is split across the three paths.",
    `Transferred ${formatNumber(primaryFrame.totalEnergyTransferred)} u by t = ${formatNumber(primaryFrame.time)} s.`,
  ];
  const metricRows = [
    { label: "T hot", value: `${formatNumber(primaryFrame.hotTemperature)} degC` },
    { label: "T room", value: `${formatNumber(primaryFrame.ambientTemperature)} degC` },
    { label: "delta T", value: `${formatNumber(primaryFrame.temperatureContrast)} degC` },
    { label: "cond", value: `${formatNumber(primaryFrame.conductionRate)} u/s` },
    { label: "conv", value: `${formatNumber(primaryFrame.convectionRate)} u/s` },
    { label: "rad", value: `${formatNumber(primaryFrame.radiationRate)} u/s` },
    { label: "total", value: `${formatNumber(primaryFrame.totalRate)} u/s` },
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(240,171,60,0.12),rgba(78,166,223,0.12))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              One compact heat-flow bench keeps conduction, convection, radiation, and the shared
              temperature gap on the same honest state instead of splitting them into separate toy
              demos.
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
            })}
            {drawChip({
              x: STAGE_X + STAGE_WIDTH - 82,
              y: STAGE_Y + 24,
              text: `${secondaryLabel} ghost`,
              tone: "ink",
              dashed: true,
              muted: true,
            })}
          </>
        ) : null}

        {renderBench(primaryFrame, displayTime, overlayState, focusedOverlayId)}

        <text x={STAGE_X + 18} y={HEIGHT - 38} className="fill-ink-600 text-[12px]">
          {primaryLabel}: q_total = {formatNumber(primaryFrame.totalRate)} u/s, dominant path ={" "}
          {primaryFrame.dominantPathway}
        </text>

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel} heat-flow state` : "Heat-flow state"}
          rows={metricRows}
          noteLines={noteLines}
        />
      </svg>
    </section>
  );
}
