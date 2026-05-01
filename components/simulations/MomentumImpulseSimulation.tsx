"use client";

import {
  MOMENTUM_IMPULSE_TOTAL_TIME,
  MOMENTUM_IMPULSE_TRACK_MAX_X,
  MOMENTUM_IMPULSE_TRACK_MIN_X,
  formatMeasurement,
  formatNumber,
  resolveMomentumImpulseExtents,
  sampleMomentumImpulseState,
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

type MomentumImpulseSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 860;
const HEIGHT = 340;
const STAGE_LEFT = 44;
const STAGE_RIGHT = 612;
const STAGE_TOP = 40;
const STAGE_BOTTOM = HEIGHT - 42;
const TRACK_Y = 226;
const TIMELINE_X = 82;
const TIMELINE_Y = 82;
const TIMELINE_WIDTH = 474;
const TIMELINE_HEIGHT = 18;
const CARD_WIDTH = 228;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;

function toNumber(value: number | boolean | string | undefined, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

function resolveFrame(source: SimulationParams, time: number) {
  return sampleMomentumImpulseState(
    {
      mass: toNumber(source.mass, 1.5),
      initialVelocity: toNumber(source.initialVelocity, 0.5),
      force: toNumber(source.force, 3),
      pulseDuration: toNumber(source.pulseDuration, 0.4),
    },
    time,
  );
}

function mapTrackX(position: number) {
  const ratio =
    (position - MOMENTUM_IMPULSE_TRACK_MIN_X) /
    (MOMENTUM_IMPULSE_TRACK_MAX_X - MOMENTUM_IMPULSE_TRACK_MIN_X);
  return STAGE_LEFT + 24 + ratio * (STAGE_RIGHT - STAGE_LEFT - 48);
}

function mapTimelineX(time: number) {
  return TIMELINE_X + (time / MOMENTUM_IMPULSE_TOTAL_TIME) * TIMELINE_WIDTH;
}

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.34;
}

function pulseWindowLabel(frame: ReturnType<typeof resolveFrame>) {
  if (frame.force > 0.02) {
    return "rightward pulse";
  }

  if (frame.force < -0.02) {
    return "leftward pulse";
  }

  return "zero-force window";
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
  const showPulseWindow = overlayValues?.pulseWindow ?? true;
  const showForceArrow = overlayValues?.forceArrow ?? true;
  const startX = mapTimelineX(frame.pulseStart);
  const endX = mapTimelineX(frame.pulseEnd);
  const currentX = mapTimelineX(time);
  const opacity = dashed ? 0.55 : 1;
  const stroke = dashed ? "rgba(15,28,36,0.4)" : "rgba(15,28,36,0.7)";

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
      {showPulseWindow ? (
        <rect
          x={startX}
          y={TIMELINE_Y - 1}
          width={Math.max(10, endX - startX)}
          height={TIMELINE_HEIGHT + 2}
          rx="10"
          fill={frame.force >= 0 ? "rgba(240,171,60,0.22)" : "rgba(78,166,223,0.2)"}
          stroke={frame.force >= 0 ? "rgba(184,112,0,0.42)" : "rgba(29,111,159,0.36)"}
          strokeWidth={focusedOverlayId === "pulseWindow" ? "2.4" : "1.4"}
          strokeDasharray={dashed ? "6 5" : undefined}
          opacity={overlayWeight(focusedOverlayId, "pulseWindow")}
        />
      ) : null}
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
        {pulseWindowLabel(frame)}
      </text>
      {showForceArrow ? (
        <text
          x={(startX + endX) / 2}
          y={TIMELINE_Y + 33}
          textAnchor="middle"
          className="fill-ink-600 text-[11px]"
          opacity={overlayWeight(focusedOverlayId, "forceArrow")}
        >
          F = {formatMeasurement(frame.force, "N")}
        </text>
      ) : null}
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
    Math.abs(frame.initialMomentum),
    Math.abs(frame.momentum),
    Math.abs(frame.finalMomentum),
    0.4,
  );
  const scale = 92 / maxMagnitude;
  const lineOpacity = overlayWeight(focusedOverlayId, "momentumBars");
  const fillOpacity = dashed ? 0.38 : 0.92;

  const rows = [
    { label: "p_i", value: frame.initialMomentum, tone: "#4ea6df" },
    { label: "p(t)", value: frame.momentum, tone: "#1ea6a2" },
    { label: "p_f", value: frame.finalMomentum, tone: "#f0ab3c" },
  ];

  return (
    <g transform={`translate(${x} ${y})`} opacity={lineOpacity}>
      <text x="0" y="-8" className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]">
        {label}
      </text>
      <line x1="100" x2="100" y1="0" y2="62" stroke="rgba(15,28,36,0.14)" strokeDasharray="4 4" />
      {rows.map((row, index) => {
        const yOffset = 16 + index * 18;
        const width = Math.abs(row.value) * scale;
        const direction = row.value >= 0 ? 1 : -1;

        return (
          <g key={row.label} opacity={fillOpacity}>
            <text x="0" y={yOffset + 4} className="fill-ink-600 text-[10px] font-semibold">
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
            <text x="206" y={yOffset + 4} textAnchor="end" className="fill-ink-950 text-[11px] font-semibold">
              {formatMeasurement(row.value, "kg m/s")}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function renderTrackTicks() {
  const ticks = [-8, -4, 0, 4, 8];

  return ticks.map((tick) => {
    const x = mapTrackX(tick);

    return (
      <g key={tick}>
        <line x1={x} x2={x} y1={TRACK_Y - 16} y2={TRACK_Y + 16} stroke="rgba(15,28,36,0.14)" />
        <text x={x} y={TRACK_Y + 34} textAnchor="middle" className="fill-ink-500 text-[11px] font-medium">
          {tick}
        </text>
      </g>
    );
  });
}

function renderCart(options: {
  frame: ReturnType<typeof resolveFrame>;
  label: string;
  muted?: boolean;
  dashed?: boolean;
  focusedOverlayId?: string | null;
  overlayValues?: Record<string, boolean>;
}) {
  const {
    frame,
    label,
    muted = false,
    dashed = false,
    focusedOverlayId,
    overlayValues,
  } = options;
  const x = mapTrackX(frame.position);
  const cartWidth = 44 + frame.mass * 12;
  const cartHeight = 24 + frame.mass * 4;
  const fill = muted ? "rgba(255,255,255,0.9)" : "rgba(255,253,247,0.98)";
  const stroke = muted ? "rgba(15,28,36,0.42)" : "#0f1c24";
  const showForceArrow = overlayValues?.forceArrow ?? true;
  const arrowOpacity = overlayWeight(focusedOverlayId, "forceArrow");
  const forceScale = Math.min(60, Math.abs(frame.force) * 18);
  const arrowDirection = frame.force >= 0 ? 1 : -1;
  const arrowBaseX = x;
  const arrowEndX = x + arrowDirection * forceScale;
  const velocityScale = Math.max(-1, Math.min(1, frame.velocity / 4.5));
  const velocityArrowX = x + velocityScale * 48;

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
        fill={muted ? "rgba(78,166,223,0.14)" : "rgba(30,166,162,0.12)"}
        stroke={muted ? "rgba(29,111,159,0.2)" : "rgba(21,122,118,0.2)"}
        strokeDasharray={dashed ? "8 5" : undefined}
      />
      <circle cx={x - cartWidth / 4} cy={TRACK_Y + 2} r="8" fill="rgba(15,28,36,0.8)" />
      <circle cx={x + cartWidth / 4} cy={TRACK_Y + 2} r="8" fill="rgba(15,28,36,0.8)" />
      <text x={x} y={TRACK_Y - cartHeight / 2 + 4} textAnchor="middle" className="fill-ink-950 text-[12px] font-semibold">
        {formatMeasurement(frame.mass, "kg")}
      </text>
      <text x={x} y={TRACK_Y - cartHeight - 18} textAnchor="middle" className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]">
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
      {showForceArrow && Math.abs(frame.force) > 0.02 ? (
        <g opacity={arrowOpacity}>
          <line
            x1={arrowBaseX}
            x2={arrowEndX}
            y1={TRACK_Y - cartHeight - 32}
            y2={TRACK_Y - cartHeight - 32}
            stroke={frame.force >= 0 ? "#f0ab3c" : "#f16659"}
            strokeWidth={focusedOverlayId === "forceArrow" ? "5" : "4"}
            strokeLinecap="round"
            strokeDasharray={dashed ? "8 5" : undefined}
          />
          <polygon
            points={
              frame.force >= 0
                ? `${arrowEndX},${TRACK_Y - cartHeight - 32} ${arrowEndX - 10},${TRACK_Y - cartHeight - 38} ${arrowEndX - 10},${TRACK_Y - cartHeight - 26}`
                : `${arrowEndX},${TRACK_Y - cartHeight - 32} ${arrowEndX + 10},${TRACK_Y - cartHeight - 38} ${arrowEndX + 10},${TRACK_Y - cartHeight - 26}`
            }
            fill={frame.force >= 0 ? "#f0ab3c" : "#f16659"}
          />
        </g>
      ) : null}
    </g>
  );
}

export function MomentumImpulseSimulation({
  concept,
  params,
  time,
  compare,
  graphPreview,
  overlayValues,
  focusedOverlayId,
}: MomentumImpulseSimulationProps) {
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
        {(compare?.labelA ?? "Setup A")}: J = {formatMeasurement(frameA?.totalImpulse ?? 0, "N s")}, p_f = {formatMeasurement(frameA?.finalMomentum ?? 0, "kg m/s")}
      </span>
      <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold text-ink-700">
        {(compare?.labelB ?? "Setup B")}: J = {formatMeasurement(frameB?.totalImpulse ?? 0, "N s")}, p_f = {formatMeasurement(frameB?.finalMomentum ?? 0, "kg m/s")}
      </span>
    </div>
  ) : null;
  const extents = resolveMomentumImpulseExtents(
    compare ? [compare.setupA, compare.setupB] : [params],
  );
  const sameImpulse =
    compareEnabled &&
    secondaryFrame &&
    Math.abs(primaryFrame.totalImpulse - secondaryFrame.totalImpulse) <= 0.04;
  const sameImpulseNote = sameImpulse
    ? "Equal impulse does not require equal force. A taller short pulse and a lower longer pulse can move momentum by the same amount."
    : "Impulse is the signed area in the pulse window, so changing force or duration changes how much momentum the cart gains or loses.";
  const stateNote = primaryFrame.forceActive
    ? `Force is on now, so momentum is changing at ${formatMeasurement(primaryFrame.currentForce, "N")} over time.`
    : primaryFrame.pulseElapsed <= 0
      ? "Before the pulse starts, the cart coasts with its initial momentum."
      : "After the pulse ends, the momentum graph flattens because the net force has returned to zero.";
  const metricRows = [
    { label: "t", value: formatMeasurement(displayTime, "s") },
    { label: "x", value: formatMeasurement(primaryFrame.position, "m") },
    { label: "v", value: formatMeasurement(primaryFrame.velocity, "m/s") },
    { label: "p", value: formatMeasurement(primaryFrame.momentum, "kg m/s") },
    { label: "J", value: formatMeasurement(primaryFrame.impulse, "N s") },
    { label: "delta p", value: formatMeasurement(primaryFrame.deltaMomentum, "kg m/s") },
    { label: "F", value: formatMeasurement(primaryFrame.currentForce, "N") },
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(240,171,60,0.12),rgba(78,166,223,0.08))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              One cart, one timed force pulse, and three linked graphs are enough to keep
              momentum, impulse, and force-over-time honest without building a full collision
              sandbox.
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
            {renderCart({
              frame: secondaryFrame,
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
              x: STAGE_LEFT + 266,
              y: 142,
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

        <text
          x={STAGE_LEFT + 16}
          y={STAGE_TOP + 24}
          className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
        >
          Track position
        </text>
        <line x1={STAGE_LEFT + 22} x2={STAGE_RIGHT - 18} y1={TRACK_Y} y2={TRACK_Y} stroke="rgba(15,28,36,0.24)" strokeWidth="4" />
        <line x1={STAGE_LEFT + 22} x2={STAGE_LEFT + 22} y1={TRACK_Y - 18} y2={TRACK_Y + 18} stroke="rgba(15,28,36,0.12)" />
        <line x1={STAGE_RIGHT - 18} x2={STAGE_RIGHT - 18} y1={TRACK_Y - 18} y2={TRACK_Y + 18} stroke="rgba(15,28,36,0.12)" />
        {renderTrackTicks()}
        <text x={STAGE_RIGHT - 18} y={TRACK_Y + 54} textAnchor="end" className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]">
          x (m)
        </text>
        <text x={STAGE_LEFT + 18} y={TRACK_Y - 42} className="fill-ink-600 text-[12px]">
          Current setups stay within about ±{formatNumber(extents.maxAbsPosition)} m on the fixed
          ±9 m track, so compare mode never cheats by changing the scale.
        </text>

        {renderCart({
          frame: primaryFrame,
          label: primaryLabel,
          focusedOverlayId,
          overlayValues,
        })}
        {renderMomentumBars({
          frame: primaryFrame,
          focusedOverlayId,
          overlayValues,
          label: `${primaryLabel} momentum bars`,
          x: STAGE_LEFT + 266,
          y: 112,
        })}

        <text
          x={STAGE_LEFT + 18}
          y={STAGE_BOTTOM - 18}
          className="fill-ink-600 text-[12px]"
        >
          {sameImpulseNote}
        </text>

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel} pulse state` : "Pulse state"}
          rows={metricRows}
          noteLines={[stateNote, "The accumulated impulse and change in momentum should match row by row."]}
        />
      </svg>
    </section>
  );
}
