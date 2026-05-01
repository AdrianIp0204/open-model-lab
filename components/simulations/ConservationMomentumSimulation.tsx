"use client";

import {
  CONSERVATION_MOMENTUM_TOTAL_TIME,
  CONSERVATION_MOMENTUM_TRACK_MAX_X,
  CONSERVATION_MOMENTUM_TRACK_MIN_X,
  formatMeasurement,
  formatNumber,
  resolveConservationMomentumExtents,
  sampleConservationMomentumState,
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

type ConservationMomentumSimulationProps = {
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
const HEIGHT = 360;
const STAGE_LEFT = 42;
const STAGE_RIGHT = 626;
const STAGE_TOP = 40;
const STAGE_BOTTOM = HEIGHT - 42;
const TRACK_Y = 232;
const TIMELINE_X = 82;
const TIMELINE_Y = 84;
const TIMELINE_WIDTH = 486;
const TIMELINE_HEIGHT = 18;
const CARD_WIDTH = 232;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;

function toNumber(value: number | boolean | string | undefined, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

function resolveFrame(source: SimulationParams, time: number) {
  return sampleConservationMomentumState(
    {
      massA: toNumber(source.massA, 1.2),
      massB: toNumber(source.massB, 1.8),
      systemVelocity: toNumber(source.systemVelocity, 0),
      interactionForce: toNumber(source.interactionForce, 1.8),
      interactionDuration: toNumber(source.interactionDuration, 0.5),
    },
    time,
  );
}

function mapTrackX(position: number) {
  const ratio =
    (position - CONSERVATION_MOMENTUM_TRACK_MIN_X) /
    (CONSERVATION_MOMENTUM_TRACK_MAX_X - CONSERVATION_MOMENTUM_TRACK_MIN_X);
  return STAGE_LEFT + 24 + ratio * (STAGE_RIGHT - STAGE_LEFT - 48);
}

function mapTimelineX(time: number) {
  return TIMELINE_X + (time / CONSERVATION_MOMENTUM_TOTAL_TIME) * TIMELINE_WIDTH;
}

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.34;
}

function renderTimeline(options: {
  frame: ReturnType<typeof resolveFrame>;
  time: number;
  label: string;
  focusedOverlayId?: string | null;
  overlayValues?: Record<string, boolean>;
  dashed?: boolean;
  offsetY?: number;
}) {
  const {
    frame,
    time,
    label,
    focusedOverlayId,
    overlayValues,
    dashed = false,
    offsetY = 0,
  } = options;
  const showForcePair = overlayValues?.forcePair ?? true;
  const startX = mapTimelineX(frame.interactionStart);
  const endX = mapTimelineX(frame.interactionEnd);
  const currentX = mapTimelineX(time);
  const opacity = dashed ? 0.56 : 1;
  const stroke = dashed ? "rgba(15,28,36,0.42)" : "rgba(15,28,36,0.7)";

  return (
    <g opacity={opacity} transform={`translate(0 ${offsetY})`}>
      <rect
        x={TIMELINE_X}
        y={TIMELINE_Y}
        width={TIMELINE_WIDTH}
        height={TIMELINE_HEIGHT}
        rx="9"
        fill="rgba(255,253,247,0.96)"
        stroke="rgba(15,28,36,0.1)"
        strokeDasharray={dashed ? "6 5" : undefined}
      />
      <rect
        x={startX}
        y={TIMELINE_Y - 1}
        width={Math.max(10, endX - startX)}
        height={TIMELINE_HEIGHT + 2}
        rx="10"
        fill="rgba(240,171,60,0.2)"
        stroke="rgba(184,112,0,0.36)"
        strokeWidth={focusedOverlayId === "forcePair" ? "2.4" : "1.4"}
        strokeDasharray={dashed ? "6 5" : undefined}
        opacity={overlayWeight(focusedOverlayId, "forcePair")}
      />
      <line
        x1={currentX}
        x2={currentX}
        y1={TIMELINE_Y - 10}
        y2={TIMELINE_Y + TIMELINE_HEIGHT + 10}
        stroke={stroke}
        strokeWidth={dashed ? "2" : "2.5"}
        strokeDasharray={dashed ? "5 4" : undefined}
      />
      <text
        x={TIMELINE_X}
        y={TIMELINE_Y - 10}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.18em]"
      >
        {label}
      </text>
      <text
        x={TIMELINE_X + TIMELINE_WIDTH}
        y={TIMELINE_Y - 10}
        textAnchor="end"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.18em]"
      >
        isolated interaction window
      </text>
      {showForcePair ? (
        <text
          x={(startX + endX) / 2}
          y={TIMELINE_Y + 33}
          textAnchor="middle"
          className="fill-ink-600 text-[11px]"
          opacity={overlayWeight(focusedOverlayId, "forcePair")}
        >
          F_A = {formatMeasurement(-frame.interactionForce, "N")}, F_B ={" "}
          {formatMeasurement(frame.interactionForce, "N")}
        </text>
      ) : null}
    </g>
  );
}

function renderSystemBoundary(options: {
  frame: ReturnType<typeof resolveFrame>;
  label: string;
  focusedOverlayId?: string | null;
  overlayValues?: Record<string, boolean>;
  dashed?: boolean;
}) {
  const { frame, label, focusedOverlayId, overlayValues, dashed = false } = options;
  if (!(overlayValues?.systemBoundary ?? true)) {
    return null;
  }

  const left = Math.min(mapTrackX(frame.positionA), mapTrackX(frame.positionB)) - 44;
  const right = Math.max(mapTrackX(frame.positionA), mapTrackX(frame.positionB)) + 44;

  return (
    <g opacity={overlayWeight(focusedOverlayId, "systemBoundary")}>
      <rect
        x={left}
        y={TRACK_Y - 118}
        width={right - left}
        height="146"
        rx="26"
        fill="rgba(78,166,223,0.06)"
        stroke="rgba(78,166,223,0.42)"
        strokeWidth={focusedOverlayId === "systemBoundary" ? "2.4" : "1.6"}
        strokeDasharray={dashed ? "8 6" : "9 7"}
      />
      <text
        x={(left + right) / 2}
        y={TRACK_Y - 126}
        textAnchor="middle"
        className="fill-sky-700 text-[10px] font-semibold uppercase tracking-[0.18em]"
      >
        {label}
      </text>
    </g>
  );
}

function renderCenterOfMass(options: {
  frame: ReturnType<typeof resolveFrame>;
  focusedOverlayId?: string | null;
  overlayValues?: Record<string, boolean>;
  dashed?: boolean;
}) {
  const { frame, focusedOverlayId, overlayValues, dashed = false } = options;
  if (!(overlayValues?.centerOfMass ?? true)) {
    return null;
  }

  const x = mapTrackX(frame.centerOfMassPosition);

  return (
    <g opacity={overlayWeight(focusedOverlayId, "centerOfMass")}>
      <line
        x1={x}
        x2={x}
        y1={TRACK_Y - 110}
        y2={TRACK_Y + 20}
        stroke="rgba(78,166,223,0.48)"
        strokeDasharray={dashed ? "6 4" : "7 5"}
        strokeWidth={focusedOverlayId === "centerOfMass" ? "2.8" : "2"}
      />
      <circle
        cx={x}
        cy={TRACK_Y - 82}
        r="9"
        fill="rgba(78,166,223,0.18)"
        stroke="#4ea6df"
        strokeWidth="2"
        strokeDasharray={dashed ? "6 4" : undefined}
      />
      <text
        x={x}
        y={TRACK_Y - 106}
        textAnchor="middle"
        className="fill-sky-700 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        CM
      </text>
    </g>
  );
}

function renderMomentumBars(options: {
  frame: ReturnType<typeof resolveFrame>;
  focusedOverlayId?: string | null;
  overlayValues?: Record<string, boolean>;
  label: string;
  x: number;
  y: number;
  dashed?: boolean;
}) {
  const { frame, focusedOverlayId, overlayValues, label, x, y, dashed = false } = options;
  if (!(overlayValues?.momentumBars ?? true)) {
    return null;
  }

  const maxMagnitude = Math.max(
    Math.abs(frame.momentumA),
    Math.abs(frame.momentumB),
    Math.abs(frame.totalMomentum),
    0.4,
  );
  const scale = 92 / maxMagnitude;
  const lineOpacity = overlayWeight(focusedOverlayId, "momentumBars");
  const fillOpacity = dashed ? 0.38 : 0.92;
  const rows = [
    { label: "p_A", value: frame.momentumA, tone: "#1ea6a2" },
    { label: "p_B", value: frame.momentumB, tone: "#f16659" },
    { label: "p_tot", value: frame.totalMomentum, tone: "#0f1c24" },
  ];

  return (
    <g transform={`translate(${x} ${y})`} opacity={lineOpacity}>
      <text
        x="0"
        y="-8"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        {label}
      </text>
      <line
        x1="100"
        x2="100"
        y1="0"
        y2="62"
        stroke="rgba(15,28,36,0.14)"
        strokeDasharray="4 4"
      />
      {rows.map((row, index) => {
        const yOffset = 16 + index * 18;
        const width = Math.abs(row.value) * scale;
        const direction = row.value >= 0 ? 1 : -1;

        return (
          <g key={row.label} opacity={fillOpacity}>
            <text
              x="0"
              y={yOffset + 4}
              className="fill-ink-600 text-[10px] font-semibold"
            >
              {row.label}
            </text>
            <rect
              x={direction >= 0 ? 100 : 100 - width}
              y={yOffset - 8}
              width={Math.max(1.5, width)}
              height="12"
              rx="6"
              fill={row.tone}
              stroke="rgba(15,28,36,0.08)"
              strokeDasharray={dashed ? "6 4" : undefined}
            />
            <text
              x="206"
              y={yOffset + 4}
              textAnchor="end"
              className="fill-ink-950 text-[11px] font-semibold"
            >
              {formatMeasurement(row.value, "kg m/s")}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function renderTrackTicks() {
  const ticks = [-6, -3, 0, 3, 6];

  return ticks.map((tick) => {
    const x = mapTrackX(tick);

    return (
      <g key={tick}>
        <line
          x1={x}
          x2={x}
          y1={TRACK_Y - 16}
          y2={TRACK_Y + 16}
          stroke="rgba(15,28,36,0.14)"
        />
        <text
          x={x}
          y={TRACK_Y + 34}
          textAnchor="middle"
          className="fill-ink-500 text-[11px] font-medium"
        >
          {tick}
        </text>
      </g>
    );
  });
}

function renderCart(options: {
  frame: ReturnType<typeof resolveFrame>;
  cartId: "A" | "B";
  label: string;
  muted?: boolean;
  dashed?: boolean;
  focusedOverlayId?: string | null;
  overlayValues?: Record<string, boolean>;
}) {
  const {
    frame,
    cartId,
    label,
    muted = false,
    dashed = false,
    focusedOverlayId,
    overlayValues,
  } = options;
  const isA = cartId === "A";
  const mass = isA ? frame.massA : frame.massB;
  const position = isA ? frame.positionA : frame.positionB;
  const velocity = isA ? frame.velocityA : frame.velocityB;
  const force = isA ? frame.forceOnA : frame.forceOnB;
  const tone = isA ? "#1ea6a2" : "#f16659";
  const softTone = isA ? "rgba(30,166,162,0.12)" : "rgba(241,102,89,0.12)";
  const x = mapTrackX(position);
  const cartWidth = 40 + mass * 14;
  const cartHeight = 24 + mass * 4;
  const fill = muted ? "rgba(255,255,255,0.9)" : "rgba(255,253,247,0.98)";
  const stroke = muted ? "rgba(15,28,36,0.42)" : "#0f1c24";
  const showForcePair = overlayValues?.forcePair ?? true;
  const arrowOpacity = overlayWeight(focusedOverlayId, "forcePair");
  const forceScale = Math.min(60, Math.abs(force) * 18);
  const velocityScale = Math.max(-1, Math.min(1, velocity / 4));
  const velocityArrowX = x + velocityScale * 46;
  const forceEndX = x + Math.sign(force || 0) * forceScale;

  return (
    <g opacity={muted ? 0.58 : 1}>
      <rect
        x={x - cartWidth / 2}
        y={TRACK_Y - cartHeight}
        width={cartWidth}
        height={cartHeight}
        rx="10"
        fill={fill}
        stroke={stroke}
        strokeWidth={muted ? "2" : "2.6"}
        strokeDasharray={dashed ? "8 5" : undefined}
      />
      <rect
        x={x - cartWidth / 2 + 10}
        y={TRACK_Y - cartHeight - 8}
        width={Math.max(24, cartWidth - 20)}
        height="10"
        rx="5"
        fill={softTone}
        stroke="rgba(15,28,36,0.12)"
        strokeDasharray={dashed ? "8 5" : undefined}
      />
      <circle cx={x - cartWidth / 4} cy={TRACK_Y + 2} r="8" fill="rgba(15,28,36,0.8)" />
      <circle cx={x + cartWidth / 4} cy={TRACK_Y + 2} r="8" fill="rgba(15,28,36,0.8)" />
      <text
        x={x}
        y={TRACK_Y - cartHeight / 2 + 4}
        textAnchor="middle"
        className="fill-ink-950 text-[12px] font-semibold"
      >
        {cartId} {formatMeasurement(mass, "kg")}
      </text>
      <text
        x={x}
        y={TRACK_Y - cartHeight - 18}
        textAnchor="middle"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        {label}
      </text>
      <line
        x1={x}
        x2={velocityArrowX}
        y1={TRACK_Y - cartHeight - 6}
        y2={TRACK_Y - cartHeight - 6}
        stroke={muted ? "rgba(78,166,223,0.46)" : "#4ea6df"}
        strokeWidth="3.4"
        strokeDasharray={dashed ? "8 5" : undefined}
        strokeLinecap="round"
      />
      <polygon
        points={
          velocityScale >= 0
            ? `${velocityArrowX},${TRACK_Y - cartHeight - 6} ${velocityArrowX - 10},${TRACK_Y - cartHeight - 12} ${velocityArrowX - 10},${TRACK_Y - cartHeight}`
            : `${velocityArrowX},${TRACK_Y - cartHeight - 6} ${velocityArrowX + 10},${TRACK_Y - cartHeight - 12} ${velocityArrowX + 10},${TRACK_Y - cartHeight}`
        }
        fill={muted ? "rgba(78,166,223,0.46)" : "#4ea6df"}
      />
      {showForcePair && Math.abs(force) > 0.02 ? (
        <g opacity={arrowOpacity}>
          <line
            x1={x}
            x2={forceEndX}
            y1={TRACK_Y - cartHeight - 32}
            y2={TRACK_Y - cartHeight - 32}
            stroke={tone}
            strokeWidth={focusedOverlayId === "forcePair" ? "5" : "4"}
            strokeLinecap="round"
            strokeDasharray={dashed ? "8 5" : undefined}
          />
          <polygon
            points={
              force >= 0
                ? `${forceEndX},${TRACK_Y - cartHeight - 32} ${forceEndX - 10},${TRACK_Y - cartHeight - 38} ${forceEndX - 10},${TRACK_Y - cartHeight - 26}`
                : `${forceEndX},${TRACK_Y - cartHeight - 32} ${forceEndX + 10},${TRACK_Y - cartHeight - 38} ${forceEndX + 10},${TRACK_Y - cartHeight - 26}`
            }
            fill={tone}
          />
        </g>
      ) : null}
    </g>
  );
}

export function ConservationMomentumSimulation({
  concept,
  params,
  time,
  compare,
  graphPreview,
  overlayValues,
  focusedOverlayId,
}: ConservationMomentumSimulationProps) {
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  const compareEnabled = Boolean(compare);
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const liveFrame = resolveFrame(params, displayTime);
  const frameA = compare ? resolveFrame(compare.setupA, displayTime) : null;
  const frameB = compare ? resolveFrame(compare.setupB, displayTime) : null;
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
        {(compare?.labelA ?? "Setup A")}: p_tot ={" "}
        {formatMeasurement(frameA?.totalMomentum ?? 0, "kg m/s")}
      </span>
      <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold text-ink-700">
        {(compare?.labelB ?? "Setup B")}: p_tot ={" "}
        {formatMeasurement(frameB?.totalMomentum ?? 0, "kg m/s")}
      </span>
    </div>
  ) : null;
  const extents = resolveConservationMomentumExtents(
    compare ? [compare.setupA, compare.setupB] : [params],
  );
  const sameTotalMomentum =
    compareEnabled &&
    secondaryFrame &&
    Math.abs(primaryFrame.totalMomentum - secondaryFrame.totalMomentum) <= 0.04;
  const compareNote = sameTotalMomentum
    ? "Matching total momentum lines can hide very different momentum splits. Compare p_A and p_B, not just p_tot."
    : "Each setup keeps its own total momentum line flat. Changing mass or system speed moves the whole line without breaking conservation.";
  const stateNote = primaryFrame.interactionActive
    ? "Equal and opposite internal forces are active now, so only the individual momentum lines tilt."
    : primaryFrame.interactionElapsed <= 0
      ? "Before the push, both carts share the same system velocity and the same center-of-mass drift."
      : "After the push, the redistributed momenta persist because the system never received an external impulse.";
  const metricRows = [
    { label: "t", value: formatMeasurement(displayTime, "s") },
    { label: "x_cm", value: formatMeasurement(primaryFrame.centerOfMassPosition, "m") },
    { label: "v_cm", value: formatMeasurement(primaryFrame.centerOfMassVelocity, "m/s") },
    { label: "p_A", value: formatMeasurement(primaryFrame.momentumA, "kg m/s") },
    { label: "p_B", value: formatMeasurement(primaryFrame.momentumB, "kg m/s") },
    { label: "p_tot", value: formatMeasurement(primaryFrame.totalMomentum, "kg m/s") },
    { label: "F_int", value: formatMeasurement(primaryFrame.forceOnB, "N") },
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(30,166,162,0.12),rgba(78,166,223,0.08))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              Two carts exchange momentum through one bounded internal interaction. The
              total stays fixed, the center of mass stays honest, and compare mode never
              needs a separate collision sandbox.
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

        {compareEnabled && secondaryFrame ? (
          <>
            {renderTimeline({
              frame: secondaryFrame,
              time: displayTime,
              label: secondaryLabel ?? "Setup B",
              focusedOverlayId,
              overlayValues,
              dashed: true,
              offsetY: 30,
            })}
            {renderSystemBoundary({
              frame: secondaryFrame,
              label: `${secondaryLabel ?? "Setup B"} isolated system`,
              focusedOverlayId,
              overlayValues,
              dashed: true,
            })}
            {renderCenterOfMass({
              frame: secondaryFrame,
              focusedOverlayId,
              overlayValues,
              dashed: true,
            })}
            {renderCart({
              frame: secondaryFrame,
              cartId: "A",
              label: secondaryLabel ?? "Setup B",
              muted: true,
              dashed: true,
              focusedOverlayId,
              overlayValues,
            })}
            {renderCart({
              frame: secondaryFrame,
              cartId: "B",
              label: secondaryLabel ?? "Setup B",
              muted: true,
              dashed: true,
              focusedOverlayId,
              overlayValues,
            })}
            {renderMomentumBars({
              frame: secondaryFrame,
              focusedOverlayId,
              overlayValues,
              label: `${secondaryLabel ?? "Setup B"} reference`,
              x: STAGE_LEFT + 284,
              y: 138,
              dashed: true,
            })}
          </>
        ) : null}

        {renderTimeline({
          frame: primaryFrame,
          time: displayTime,
          label: primaryLabel,
          focusedOverlayId,
          overlayValues,
        })}
        {renderSystemBoundary({
          frame: primaryFrame,
          label: `${primaryLabel} isolated system`,
          focusedOverlayId,
          overlayValues,
        })}
        {renderCenterOfMass({
          frame: primaryFrame,
          focusedOverlayId,
          overlayValues,
        })}

        <text
          x={STAGE_LEFT + 16}
          y={STAGE_TOP + 24}
          className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
        >
          Track position
        </text>
        <line
          x1={STAGE_LEFT + 22}
          x2={STAGE_RIGHT - 18}
          y1={TRACK_Y}
          y2={TRACK_Y}
          stroke="rgba(15,28,36,0.24)"
          strokeWidth="4"
        />
        <line
          x1={STAGE_LEFT + 22}
          x2={STAGE_LEFT + 22}
          y1={TRACK_Y - 18}
          y2={TRACK_Y + 18}
          stroke="rgba(15,28,36,0.12)"
        />
        <line
          x1={STAGE_RIGHT - 18}
          x2={STAGE_RIGHT - 18}
          y1={TRACK_Y - 18}
          y2={TRACK_Y + 18}
          stroke="rgba(15,28,36,0.12)"
        />
        {renderTrackTicks()}
        <text
          x={STAGE_RIGHT - 18}
          y={TRACK_Y + 54}
          textAnchor="end"
          className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
        >
          x (m)
        </text>
        <text x={STAGE_LEFT + 18} y={TRACK_Y - 42} className="fill-ink-600 text-[12px]">
          Current setups stay within about +/-{formatNumber(extents.maxAbsPosition)} m on
          the fixed +/-8 m track, so compare mode never rescales the system.
        </text>

        {renderCart({
          frame: primaryFrame,
          cartId: "A",
          label: primaryLabel,
          focusedOverlayId,
          overlayValues,
        })}
        {renderCart({
          frame: primaryFrame,
          cartId: "B",
          label: primaryLabel,
          focusedOverlayId,
          overlayValues,
        })}
        {renderMomentumBars({
          frame: primaryFrame,
          focusedOverlayId,
          overlayValues,
          label: `${primaryLabel} momentum bars`,
          x: STAGE_LEFT + 284,
          y: 108,
        })}

        <text x={STAGE_LEFT + 18} y={STAGE_BOTTOM - 18} className="fill-ink-600 text-[12px]">
          {compareEnabled ? compareNote : "Internal forces redistribute momentum between the carts, but the isolated-system total remains unchanged."}
        </text>

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel} system state` : "System state"}
          rows={metricRows}
          noteLines={[
            stateNote,
            "Track the flat total-momentum line and the steady center-of-mass drift together.",
          ]}
        />
      </svg>
    </section>
  );
}
