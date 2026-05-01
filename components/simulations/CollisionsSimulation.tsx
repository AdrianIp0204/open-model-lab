"use client";

import { useLocale } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import { localizeKnownCompareText } from "@/lib/i18n/copy-text";
import {
  COLLISIONS_TOTAL_TIME,
  COLLISIONS_TRACK_MAX_X,
  COLLISIONS_TRACK_MIN_X,
  formatMeasurement,
  formatNumber,
  resolveCollisionsExtents,
  sampleCollisionsState,
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

type CollisionsSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 920;
const HEIGHT = 364;
const STAGE_LEFT = 42;
const STAGE_RIGHT = 654;
const STAGE_TOP = 40;
const STAGE_BOTTOM = HEIGHT - 42;
const TRACK_Y = 236;
const TIMELINE_X = 88;
const TIMELINE_Y = 86;
const TIMELINE_WIDTH = 500;
const TIMELINE_HEIGHT = 18;
const CARD_WIDTH = 230;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;

function toNumber(value: number | boolean | string | undefined, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

function resolveFrame(source: SimulationParams, time: number) {
  return sampleCollisionsState(
    {
      massA: toNumber(source.massA, 1.2),
      massB: toNumber(source.massB, 2.2),
      speedA: toNumber(source.speedA, 1.6),
      speedB: toNumber(source.speedB, 0.7),
      elasticity: toNumber(source.elasticity, 0.8),
    },
    time,
  );
}

function mapTrackX(position: number) {
  const ratio =
    (position - COLLISIONS_TRACK_MIN_X) /
    (COLLISIONS_TRACK_MAX_X - COLLISIONS_TRACK_MIN_X);
  return STAGE_LEFT + 24 + ratio * (STAGE_RIGHT - STAGE_LEFT - 48);
}

function mapTimelineX(time: number) {
  return TIMELINE_X + (time / COLLISIONS_TOTAL_TIME) * TIMELINE_WIDTH;
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
  locale: AppLocale;
  focusedOverlayId?: string | null;
  overlayValues?: Record<string, boolean>;
  dashed?: boolean;
  offsetY?: number;
}) {
  const {
    frame,
    time,
    label,
    locale,
    focusedOverlayId,
    overlayValues,
    dashed = false,
    offsetY = 0,
  } = options;
  const showCollisionZone = overlayValues?.collisionZone ?? true;
  const collisionX = mapTimelineX(frame.collisionTime);
  const currentX = mapTimelineX(time);
  const stroke = dashed ? "rgba(15,28,36,0.4)" : "rgba(15,28,36,0.7)";

  return (
    <g transform={`translate(0 ${offsetY})`} opacity={dashed ? 0.56 : 1}>
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
      {showCollisionZone ? (
        <rect
          x={collisionX - 7}
          y={TIMELINE_Y - 2}
          width="14"
          height={TIMELINE_HEIGHT + 4}
          rx="7"
          fill="rgba(240,171,60,0.18)"
          stroke="rgba(184,112,0,0.4)"
          strokeWidth={focusedOverlayId === "collisionZone" ? "2.4" : "1.4"}
          strokeDasharray={dashed ? "6 5" : undefined}
          opacity={overlayWeight(focusedOverlayId, "collisionZone")}
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
        {copyText(locale, "collision at", "碰撞於")} {formatNumber(frame.collisionTime)} s
      </text>
    </g>
  );
}

function renderCollisionZone(options: {
  frame: ReturnType<typeof resolveFrame>;
  locale: AppLocale;
  focusedOverlayId?: string | null;
  overlayValues?: Record<string, boolean>;
  dashed?: boolean;
}) {
  const { frame, locale, focusedOverlayId, overlayValues, dashed = false } = options;
  if (!(overlayValues?.collisionZone ?? true)) {
    return null;
  }

  const left = mapTrackX(frame.contactPositionA);
  const right = mapTrackX(frame.contactPositionB);

  return (
    <g opacity={overlayWeight(focusedOverlayId, "collisionZone")}>
      <rect
        x={left - 10}
        y={TRACK_Y - 112}
        width={right - left + 20}
        height="144"
        rx="18"
        fill="rgba(240,171,60,0.08)"
        stroke={frame.collisionHighlightActive ? "rgba(184,112,0,0.5)" : "rgba(184,112,0,0.28)"}
        strokeWidth={focusedOverlayId === "collisionZone" ? "2.8" : "1.8"}
        strokeDasharray={dashed ? "8 5" : "7 5"}
      />
      <text
        x={(left + right) / 2}
        y={TRACK_Y - 120}
        textAnchor="middle"
        className="fill-amber-700 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        {copyText(locale, "collision point", "碰撞點")}
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
        y1={TRACK_Y - 112}
        y2={TRACK_Y + 18}
        stroke="rgba(78,166,223,0.48)"
        strokeWidth={focusedOverlayId === "centerOfMass" ? "2.8" : "2"}
        strokeDasharray={dashed ? "6 4" : "7 5"}
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
  const rows = [
    { label: "p_A", value: frame.momentumA, tone: "#1ea6a2" },
    { label: "p_B", value: frame.momentumB, tone: "#f16659" },
    { label: "p_tot", value: frame.totalMomentum, tone: "#0f1c24" },
  ];

  return (
    <g transform={`translate(${x} ${y})`} opacity={overlayWeight(focusedOverlayId, "momentumBars")}>
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
          <g key={row.label} opacity={dashed ? 0.38 : 0.92}>
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

function renderRelativeSpeed(options: {
  frame: ReturnType<typeof resolveFrame>;
  locale: AppLocale;
  focusedOverlayId?: string | null;
  overlayValues?: Record<string, boolean>;
}) {
  const { frame, locale, focusedOverlayId, overlayValues } = options;
  if (!(overlayValues?.relativeSpeed ?? false)) {
    return null;
  }

  const centerX = mapTrackX((frame.contactPositionA + frame.contactPositionB) / 2);
  const text = !frame.collisionOccurred
    ? `${copyText(locale, "closing speed", "接近速度")} = ${formatMeasurement(frame.relativeSpeedBefore, "m/s")}`
    : frame.sticking
      ? copyText(locale, "e = 0 so the carts leave together", "e = 0，因此兩部小車會一起離開")
      : `${copyText(locale, "separation speed", "分離速度")} = ${formatMeasurement(frame.relativeSpeedAfter, "m/s")}`;
  const caption = frame.collisionOccurred
    ? `e = ${formatNumber(frame.elasticity)}`
    : copyText(locale, "before impact", "碰撞前");

  return (
    <g opacity={overlayWeight(focusedOverlayId, "relativeSpeed")}>
      <line
        x1={centerX - 68}
        x2={centerX - 8}
        y1={TRACK_Y - 128}
        y2={TRACK_Y - 128}
        stroke="rgba(15,28,36,0.44)"
        strokeWidth="2.4"
        strokeDasharray="4 4"
        markerEnd="url(#collision-arrow-right)"
      />
      <line
        x1={centerX + 68}
        x2={centerX + 8}
        y1={TRACK_Y - 128}
        y2={TRACK_Y - 128}
        stroke="rgba(15,28,36,0.44)"
        strokeWidth="2.4"
        strokeDasharray="4 4"
        markerEnd="url(#collision-arrow-left)"
      />
      <text
        x={centerX}
        y={TRACK_Y - 140}
        textAnchor="middle"
        className="fill-ink-700 text-[11px] font-semibold"
      >
        {text}
      </text>
      <text
        x={centerX}
        y={TRACK_Y - 122}
        textAnchor="middle"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        {caption}
      </text>
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
}) {
  const { frame, cartId, label, muted = false, dashed = false } = options;
  const isA = cartId === "A";
  const tone = isA ? "#1ea6a2" : "#f16659";
  const x = mapTrackX(isA ? frame.positionA : frame.positionB);
  const velocity = isA ? frame.velocityA : frame.velocityB;
  const mass = isA ? frame.massA : frame.massB;
  const bodyWidth = 72;
  const bodyHeight = 26;
  const plateCount = Math.max(1, Math.min(4, Math.round(mass)));
  const velocityScale = Math.max(-1, Math.min(1, velocity / 3.2));
  const velocityArrowX = x + velocityScale * 54;

  return (
    <g opacity={muted ? 0.56 : 1}>
      {Array.from({ length: plateCount }).map((_, index) => (
        <rect
          key={`${cartId}-plate-${index}`}
          x={x - bodyWidth / 2 + 10 + index * 6}
          y={TRACK_Y - bodyHeight - 9 - index * 3}
          width={bodyWidth - 20 - index * 12}
          height="7"
          rx="3.5"
          fill={muted ? "rgba(15,28,36,0.1)" : `${tone}20`}
          stroke="rgba(15,28,36,0.08)"
          strokeDasharray={dashed ? "6 4" : undefined}
        />
      ))}
      <rect
        x={x - bodyWidth / 2}
        y={TRACK_Y - bodyHeight}
        width={bodyWidth}
        height={bodyHeight}
        rx="10"
        fill={muted ? "rgba(255,255,255,0.9)" : "rgba(255,253,247,0.98)"}
        stroke={muted ? "rgba(15,28,36,0.42)" : "#0f1c24"}
        strokeWidth={muted ? "2" : "2.6"}
        strokeDasharray={dashed ? "8 5" : undefined}
      />
      <circle cx={x - 18} cy={TRACK_Y + 2} r="8" fill="rgba(15,28,36,0.8)" />
      <circle cx={x + 18} cy={TRACK_Y + 2} r="8" fill="rgba(15,28,36,0.8)" />
      <text
        x={x}
        y={TRACK_Y - bodyHeight / 2 + 4}
        textAnchor="middle"
        className="fill-ink-950 text-[12px] font-semibold"
      >
        {cartId} {formatMeasurement(mass, "kg")}
      </text>
      <text
        x={x}
        y={TRACK_Y - bodyHeight - 22}
        textAnchor="middle"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        {label}
      </text>
      <line
        x1={x}
        x2={velocityArrowX}
        y1={TRACK_Y - bodyHeight - 38}
        y2={TRACK_Y - bodyHeight - 38}
        stroke={muted ? "rgba(78,166,223,0.46)" : "#4ea6df"}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "8 5" : undefined}
      />
      <polygon
        points={
          velocityScale >= 0
            ? `${velocityArrowX},${TRACK_Y - bodyHeight - 38} ${velocityArrowX - 10},${TRACK_Y - bodyHeight - 44} ${velocityArrowX - 10},${TRACK_Y - bodyHeight - 32}`
            : `${velocityArrowX},${TRACK_Y - bodyHeight - 38} ${velocityArrowX + 10},${TRACK_Y - bodyHeight - 44} ${velocityArrowX + 10},${TRACK_Y - bodyHeight - 32}`
        }
        fill={muted ? "rgba(78,166,223,0.46)" : "#4ea6df"}
      />
    </g>
  );
}

export function CollisionsSimulation({
  concept,
  params,
  time,
  compare,
  graphPreview,
  overlayValues,
  focusedOverlayId,
}: CollisionsSimulationProps) {
  const locale = useLocale() as AppLocale;
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
      ? compare.labelA ?? localizeKnownCompareText(locale, "Setup A")
      : compare.labelB ?? localizeKnownCompareText(locale, "Setup B")
    : localizeKnownCompareText(locale, "Live");
  const secondaryLabel = compare
    ? previewedSetup === "a"
      ? compare.labelB ?? localizeKnownCompareText(locale, "Setup B")
      : compare.labelA ?? localizeKnownCompareText(locale, "Setup A")
    : null;
  const previewBadge =
    graphPreview?.kind === "time" ? (
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
        {copyText(locale, "preview", "預覽")} {graphPreview.seriesLabel} t = {formatNumber(graphPreview.time)} s
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
        {(compare?.labelA ?? localizeKnownCompareText(locale, "Setup A"))}: p_tot ={" "}
        {formatMeasurement(frameA?.totalMomentum ?? 0, "kg m/s")}, K_f ={" "}
        {formatMeasurement(frameA?.finalKineticEnergy ?? 0, "J")}
      </span>
      <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold text-ink-700">
        {(compare?.labelB ?? localizeKnownCompareText(locale, "Setup B"))}: p_tot ={" "}
        {formatMeasurement(frameB?.totalMomentum ?? 0, "kg m/s")}, K_f ={" "}
        {formatMeasurement(frameB?.finalKineticEnergy ?? 0, "J")}
      </span>
    </div>
  ) : null;
  const extents = resolveCollisionsExtents(compare ? [compare.setupA, compare.setupB] : [params]);
  const sameTotalMomentum =
    compareEnabled &&
    secondaryFrame &&
    Math.abs(primaryFrame.totalMomentum - secondaryFrame.totalMomentum) <= 0.04;
  const compareNote = sameTotalMomentum
    ? copyText(locale, "Same total momentum can still lead to different rebound speeds and different kinetic-energy loss.", "即使總動量相同，反彈速度和動能損失仍然可以不同。")
    : copyText(locale, "Compare how mass, incoming speed, and elasticity reshape the rebound while each setup still keeps its own total momentum.", "比較質量、入射速度和彈性如何重塑反彈，同時每個設定仍然保留各自的總動量。");
  const stateNote = !primaryFrame.collisionOccurred
    ? copyText(locale, "Before contact, the system already has a definite total momentum and center-of-mass drift.", "接觸之前，系統已經具有明確的總動量和質心漂移。")
    : primaryFrame.sticking
      ? copyText(locale, "After a perfectly inelastic collision, the carts keep one shared velocity while total momentum stays fixed.", "完全非彈性碰撞後，兩部小車會共用同一個速度，而總動量維持不變。")
      : primaryFrame.elasticity >= 0.95
        ? copyText(locale, "After an almost elastic collision, the carts separate quickly and the total kinetic energy stays nearly unchanged.", "接近完全彈性的碰撞後，小車會快速分開，而總動能幾乎不變。")
        : copyText(locale, "After an inelastic collision, the carts separate more slowly because some kinetic energy has gone into other forms.", "非彈性碰撞後，小車分開得更慢，因為部分動能已轉成其他形式。");
  const metricRows = [
    { label: "t", value: formatMeasurement(displayTime, "s") },
    { label: "v_A", value: formatMeasurement(primaryFrame.velocityA, "m/s") },
    { label: "v_B", value: formatMeasurement(primaryFrame.velocityB, "m/s") },
    { label: "p_tot", value: formatMeasurement(primaryFrame.totalMomentum, "kg m/s") },
    { label: "K_tot", value: formatMeasurement(primaryFrame.totalKineticEnergy, "J") },
    { label: "e", value: formatNumber(primaryFrame.elasticity) },
    {
      label: "v_rel",
      value: primaryFrame.collisionOccurred
        ? formatMeasurement(primaryFrame.relativeSpeedAfter, "m/s")
        : formatMeasurement(primaryFrame.relativeSpeedBefore, "m/s"),
    },
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(240,171,60,0.12),rgba(78,166,223,0.08))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              {copyText(
                locale,
                "Two carts collide on one fixed track. Total momentum stays visible, elasticity controls how much closing speed comes back as rebound, and the energy graph distinguishes elastic from inelastic outcomes without leaving the same live state.",
                "兩部小車會在同一條固定軌道上碰撞。總動量會一直可見，彈性會控制接近速度有多少會變成反彈，而能量圖會在不離開同一個即時狀態下區分彈性與非彈性結果。",
              )}
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
        <defs>
          <marker
            id="collision-arrow-right"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(15,28,36,0.44)" />
          </marker>
          <marker
            id="collision-arrow-left"
            markerWidth="10"
            markerHeight="10"
            refX="2"
            refY="5"
            orient="auto"
          >
            <path d="M 10 0 L 0 5 L 10 10 z" fill="rgba(15,28,36,0.44)" />
          </marker>
        </defs>
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
              label: secondaryLabel ?? localizeKnownCompareText(locale, "Setup B"),
              locale,
              focusedOverlayId,
              overlayValues,
              dashed: true,
              offsetY: 30,
            })}
            {renderCollisionZone({
              frame: secondaryFrame,
              locale,
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
              label: secondaryLabel ?? localizeKnownCompareText(locale, "Setup B"),
              muted: true,
              dashed: true,
            })}
            {renderCart({
              frame: secondaryFrame,
              cartId: "B",
              label: secondaryLabel ?? localizeKnownCompareText(locale, "Setup B"),
              muted: true,
              dashed: true,
            })}
            {renderMomentumBars({
              frame: secondaryFrame,
              focusedOverlayId,
              overlayValues,
              label: `${secondaryLabel ?? localizeKnownCompareText(locale, "Setup B")} ${copyText(locale, "reference", "參考")}`,
              x: STAGE_LEFT + 300,
              y: 142,
              dashed: true,
            })}
          </>
        ) : null}

        {renderTimeline({
          frame: primaryFrame,
          time: displayTime,
          label: primaryLabel,
          locale,
          focusedOverlayId,
          overlayValues,
        })}
        {renderCollisionZone({
          frame: primaryFrame,
          locale,
          focusedOverlayId,
          overlayValues,
        })}
        {renderCenterOfMass({
          frame: primaryFrame,
          focusedOverlayId,
          overlayValues,
        })}
        {renderRelativeSpeed({
          frame: primaryFrame,
          locale,
          focusedOverlayId,
          overlayValues,
        })}

        <text
          x={STAGE_LEFT + 16}
          y={STAGE_TOP + 24}
          className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
        >
          {copyText(locale, "Track position", "軌道位置")}
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
          {copyText(
            locale,
            `Current setups stay within about +/-${formatNumber(extents.maxAbsPosition)} m on the fixed +/-6 m track, so compare mode never rescales the collision.`,
            `目前設定會維持在固定 +/-6 m 軌道上的約 +/-${formatNumber(extents.maxAbsPosition)} m 範圍內，因此比較模式不會重新縮放碰撞場景。`,
          )}
        </text>

        {renderCart({
          frame: primaryFrame,
          cartId: "A",
          label: primaryLabel,
        })}
        {renderCart({
          frame: primaryFrame,
          cartId: "B",
          label: primaryLabel,
        })}
        {primaryFrame.sticking && primaryFrame.collisionOccurred ? (
          <line
            x1={mapTrackX(primaryFrame.positionA) + 36}
            x2={mapTrackX(primaryFrame.positionB) - 36}
            y1={TRACK_Y - 14}
            y2={TRACK_Y - 14}
            stroke="rgba(240,171,60,0.8)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        ) : null}
        {renderMomentumBars({
          frame: primaryFrame,
          focusedOverlayId,
          overlayValues,
          label: `${primaryLabel} ${copyText(locale, "momentum bars", "動量條")}`,
          x: STAGE_LEFT + 300,
          y: 112,
        })}

        <text x={STAGE_LEFT + 18} y={STAGE_BOTTOM - 18} className="fill-ink-600 text-[12px]">
          {compareEnabled
            ? compareNote
            : copyText(
                locale,
                "The total momentum line stays flat across contact, while the energy graph only stays flat when the collision is elastic.",
                "總動量線在接觸前後會保持平坦，而只有在碰撞是彈性的情況下，能量圖才會同樣保持平坦。",
              )}
        </text>

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel} ${copyText(locale, "collision state", "碰撞狀態")}` : copyText(locale, "Collision state", "碰撞狀態")}
          rows={metricRows}
          noteLines={[
            stateNote,
            copyText(locale, "Compare the flat total-momentum line with the energy graph before and after contact.", "比較接觸前後保持平坦的總動量線與能量圖。"),
          ]}
        />
      </svg>
    </section>
  );
}
