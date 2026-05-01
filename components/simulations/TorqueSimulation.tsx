"use client";

import {
  TORQUE_BAR_LENGTH,
  TORQUE_MOMENT_OF_INERTIA,
  TORQUE_TOTAL_TIME,
  formatMeasurement,
  formatNumber,
  sampleTorqueState,
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

type TorqueSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam?: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 900;
const HEIGHT = 360;
const STAGE_LEFT = 28;
const STAGE_RIGHT = 632;
const STAGE_TOP = 34;
const STAGE_BOTTOM = HEIGHT - 34;
const PIVOT_X = 118;
const PIVOT_Y = 210;
const BAR_SCALE = 184;
const FORCE_SCALE = 24;
const CARD_WIDTH = 232;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;

function toNumber(value: number | boolean | string | undefined, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

function resolveFrame(source: SimulationParams, time: number) {
  return sampleTorqueState(
    {
      forceMagnitude: toNumber(source.forceMagnitude, 2),
      forceAngle: toNumber(source.forceAngle, 90),
      applicationDistance: toNumber(source.applicationDistance, TORQUE_BAR_LENGTH),
    },
    time,
  );
}

function polarPoint(originX: number, originY: number, radius: number, angleRad: number) {
  return {
    x: originX + radius * Math.cos(angleRad),
    y: originY - radius * Math.sin(angleRad),
  };
}

function arrowHeadPoints(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  size = 10,
) {
  const angle = Math.atan2(endY - startY, endX - startX);
  const left = angle + Math.PI * 0.82;
  const right = angle - Math.PI * 0.82;

  return `${endX},${endY} ${endX + Math.cos(left) * size},${endY + Math.sin(left) * size} ${endX + Math.cos(right) * size},${endY + Math.sin(right) * size}`;
}

function lineEndpointsThroughPoint(
  x: number,
  y: number,
  angleRad: number,
  backward: number,
  forward: number,
) {
  return {
    start: polarPoint(x, y, backward, angleRad + Math.PI),
    end: polarPoint(x, y, forward, angleRad),
  };
}

function projectPivotToLine(
  pointX: number,
  pointY: number,
  angleRad: number,
) {
  const dx = Math.cos(angleRad);
  const dy = -Math.sin(angleRad);
  const toPivotX = PIVOT_X - pointX;
  const toPivotY = PIVOT_Y - pointY;
  const projection = toPivotX * dx + toPivotY * dy;

  return {
    x: pointX + dx * projection,
    y: pointY + dy * projection,
  };
}

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.34;
}

function directionText(label: ReturnType<typeof resolveFrame>["turningDirectionLabel"]) {
  switch (label) {
    case "counterclockwise":
      return "counterclockwise";
    case "clockwise":
      return "clockwise";
    default:
      return "almost no";
  }
}

function buildStageNote(frame: ReturnType<typeof resolveFrame>) {
  if (Math.abs(frame.torque) <= 0.05) {
    return "The line of action is almost passing through the pivot, so the same-sized push has almost no turning effect.";
  }

  if (Math.abs(frame.forceAngle) < 30 || Math.abs(Math.abs(frame.forceAngle) - 180) < 30) {
    return "A lot of the force points along the bar, so very little of it is available to twist the pivot.";
  }

  if (frame.applicationDistance < 0.7) {
    return "The push is close to the pivot, so even a clean perpendicular push builds only a modest torque.";
  }

  return "The handle-length push keeps a large moment arm, so the same perpendicular force produces a stronger twist.";
}

function renderArrow(options: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  strokeWidth: number;
  dashed?: boolean;
  opacity?: number;
}) {
  const { startX, startY, endX, endY, color, strokeWidth, dashed, opacity = 1 } = options;

  return (
    <g opacity={opacity}>
      <line
        x1={startX}
        x2={endX}
        y1={startY}
        y2={endY}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <polygon points={arrowHeadPoints(startX, startY, endX, endY)} fill={color} />
    </g>
  );
}

function renderSetup(options: {
  frame: ReturnType<typeof resolveFrame>;
  label: string;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  muted?: boolean;
  dashed?: boolean;
}) {
  const { frame, label, overlayValues, focusedOverlayId, muted = false, dashed = false } = options;
  const barAngle = frame.rotationAngle;
  const forceDirection = barAngle + frame.forceAngleRad;
  const barEnd = polarPoint(PIVOT_X, PIVOT_Y, TORQUE_BAR_LENGTH * BAR_SCALE, barAngle);
  const applicationPoint = polarPoint(
    PIVOT_X,
    PIVOT_Y,
    frame.applicationDistance * BAR_SCALE,
    barAngle,
  );
  const forceTip = polarPoint(
    applicationPoint.x,
    applicationPoint.y,
    frame.forceMagnitude * FORCE_SCALE,
    forceDirection,
  );
  const lineOfAction = lineEndpointsThroughPoint(
    applicationPoint.x,
    applicationPoint.y,
    forceDirection,
    260,
    260,
  );
  const momentArmFoot = projectPivotToLine(applicationPoint.x, applicationPoint.y, forceDirection);
  const momentArmWeight = overlayWeight(focusedOverlayId, "momentArm");
  const lineWeight = overlayWeight(focusedOverlayId, "lineOfAction");
  const perpendicularWeight = overlayWeight(focusedOverlayId, "perpendicularComponent");
  const barStroke = muted ? "rgba(15,28,36,0.38)" : "#0f1c24";
  const barFill = muted ? "rgba(255,255,255,0.82)" : "rgba(255,253,247,0.98)";
  const forceColor = muted ? "rgba(241,102,89,0.52)" : "#f16659";
  const showLineOfAction = overlayValues?.lineOfAction ?? false;
  const showPerpendicularComponent = overlayValues?.perpendicularComponent ?? true;
  const showMomentArm = overlayValues?.momentArm ?? true;
  const perpendicularDirection =
    barAngle + (frame.forcePerpendicular >= 0 ? Math.PI / 2 : -Math.PI / 2);
  const perpendicularTip = polarPoint(
    applicationPoint.x,
    applicationPoint.y,
    Math.abs(frame.forcePerpendicular) * FORCE_SCALE,
    perpendicularDirection,
  );
  const parallelTip = polarPoint(
    applicationPoint.x,
    applicationPoint.y,
    Math.abs(frame.forceParallel) * FORCE_SCALE,
    barAngle + (frame.forceParallel >= 0 ? 0 : Math.PI),
  );
  const angleLabelPoint = polarPoint(applicationPoint.x, applicationPoint.y, 44, forceDirection);

  return (
    <g opacity={muted ? 0.58 : 1}>
      {showLineOfAction ? (
        <g opacity={lineWeight}>
          <line
            x1={lineOfAction.start.x}
            x2={lineOfAction.end.x}
            y1={lineOfAction.start.y}
            y2={lineOfAction.end.y}
            stroke={muted ? "rgba(78,166,223,0.35)" : "rgba(78,166,223,0.7)"}
            strokeWidth={focusedOverlayId === "lineOfAction" ? "3" : "2"}
            strokeDasharray={dashed ? "9 7" : "7 6"}
          />
          <text
            x={lineOfAction.end.x - 4}
            y={lineOfAction.end.y - 8}
            textAnchor="end"
            className="fill-sky-700 text-[11px] font-semibold"
          >
            line of action
          </text>
        </g>
      ) : null}

      {showMomentArm ? (
        <g opacity={momentArmWeight}>
          <line
            x1={PIVOT_X}
            x2={momentArmFoot.x}
            y1={PIVOT_Y}
            y2={momentArmFoot.y}
            stroke={muted ? "rgba(240,171,60,0.35)" : "#f0ab3c"}
            strokeWidth={focusedOverlayId === "momentArm" ? "3.2" : "2.4"}
            strokeDasharray={dashed ? "7 6" : "5 5"}
          />
          {Math.abs(frame.momentArmMagnitude) > 0.02 ? (
            <text
              x={(PIVOT_X + momentArmFoot.x) / 2 + 8}
              y={(PIVOT_Y + momentArmFoot.y) / 2 - 6}
              className="fill-amber-700 text-[11px] font-semibold"
            >
              r_perp = {formatNumber(frame.momentArmMagnitude)} m
            </text>
          ) : (
            <text
              x={PIVOT_X + 12}
              y={PIVOT_Y - 18}
              className="fill-amber-700 text-[11px] font-semibold"
            >
              moment arm ~ 0
            </text>
          )}
        </g>
      ) : null}

      {showPerpendicularComponent ? (
        <g opacity={perpendicularWeight}>
          {renderArrow({
            startX: applicationPoint.x,
            startY: applicationPoint.y,
            endX: perpendicularTip.x,
            endY: perpendicularTip.y,
            color: muted ? "rgba(240,171,60,0.42)" : "#f0ab3c",
            strokeWidth: focusedOverlayId === "perpendicularComponent" ? 4.6 : 3.6,
            dashed,
          })}
          <line
            x1={applicationPoint.x}
            x2={parallelTip.x}
            y1={applicationPoint.y}
            y2={parallelTip.y}
            stroke="rgba(15,28,36,0.22)"
            strokeWidth="2"
            strokeDasharray="6 5"
          />
          <text
            x={perpendicularTip.x + 10}
            y={perpendicularTip.y - 8}
            className="fill-amber-700 text-[11px] font-semibold"
          >
            F_perp = {formatNumber(frame.forcePerpendicular)} N
          </text>
        </g>
      ) : null}

      <line
        x1={PIVOT_X}
        x2={barEnd.x}
        y1={PIVOT_Y}
        y2={barEnd.y}
        stroke={barStroke}
        strokeWidth="18"
        strokeLinecap="round"
        strokeDasharray={dashed ? "10 8" : undefined}
      />
      <line
        x1={PIVOT_X}
        x2={barEnd.x}
        y1={PIVOT_Y}
        y2={barEnd.y}
        stroke={barFill}
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray={dashed ? "10 8" : undefined}
      />
      <circle
        cx={applicationPoint.x}
        cy={applicationPoint.y}
        r="7"
        fill={muted ? "rgba(15,28,36,0.46)" : "#0f1c24"}
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="2.5"
      />
      {renderArrow({
        startX: applicationPoint.x,
        startY: applicationPoint.y,
        endX: forceTip.x,
        endY: forceTip.y,
        color: forceColor,
        strokeWidth: 4.6,
        dashed,
      })}
      <text
        x={forceTip.x + 10}
        y={forceTip.y - 8}
        className="fill-coral-700 text-[11px] font-semibold"
      >
        F = {formatNumber(frame.forceMagnitude)} N
      </text>
      <text
        x={angleLabelPoint.x + 8}
        y={angleLabelPoint.y + 4}
        className="fill-coral-700 text-[11px] font-semibold"
      >
        phi = {formatNumber(frame.forceAngle)} deg
      </text>
      <text
        x={barEnd.x + 8}
        y={barEnd.y + (barEnd.y < PIVOT_Y ? -4 : 14)}
        className="fill-ink-600 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        {label}
      </text>
    </g>
  );
}

export function TorqueSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: TorqueSimulationProps) {
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  const compareEnabled = Boolean(compare);
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const primaryParams =
    compare && previewedSetup === "b" ? compare.setupB : compare?.setupA ?? params;
  const secondaryParams =
    compare && previewedSetup === "b" ? compare.setupA : compare?.setupB ?? null;
  const primaryFrame = resolveFrame(primaryParams, displayTime);
  const secondaryFrame = secondaryParams ? resolveFrame(secondaryParams, displayTime) : null;
  const primaryLabel = compare
    ? previewedSetup === "b"
      ? compare.labelB ?? "Setup B"
      : compare.labelA ?? "Setup A"
    : "Live";
  const secondaryLabel = compare
    ? previewedSetup === "b"
      ? compare.labelA ?? "Setup A"
      : compare.labelB ?? "Setup B"
    : null;
  const endFrameA = compare ? resolveFrame(compare.setupA, TORQUE_TOTAL_TIME) : null;
  const endFrameB = compare ? resolveFrame(compare.setupB, TORQUE_TOTAL_TIME) : null;
  const previewBadge =
    graphPreview?.kind === "time" ? (
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
        preview {graphPreview.seriesLabel} t = {formatNumber(graphPreview.time)} s
      </span>
    ) : graphPreview ? (
      <span className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral-700">
        preview {graphPreview.seriesLabel}
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
        {(compare?.labelA ?? "Setup A")}: tau = {formatMeasurement(endFrameA?.torque ?? 0, "N m")},
        {" "}theta_end = {formatMeasurement(endFrameA?.rotationAngle ?? 0, "rad")}
      </span>
      <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold text-ink-700">
        {(compare?.labelB ?? "Setup B")}: tau = {formatMeasurement(endFrameB?.torque ?? 0, "N m")},
        {" "}theta_end = {formatMeasurement(endFrameB?.rotationAngle ?? 0, "rad")}
      </span>
    </div>
  ) : null;
  const sameTorque =
    compareEnabled &&
    endFrameA &&
    endFrameB &&
    Math.abs(endFrameA.torque - endFrameB.torque) <= 0.06;
  const noteLine =
    compareEnabled && sameTorque
      ? "Different geometry can still land on the same torque if the product r F_perp matches."
      : buildStageNote(primaryFrame);
  const metricRows = [
    { label: "t", value: formatMeasurement(displayTime, "s") },
    { label: "r", value: formatMeasurement(primaryFrame.applicationDistance, "m") },
    { label: "phi", value: formatMeasurement(primaryFrame.forceAngle, "deg") },
    { label: "F_perp", value: formatMeasurement(primaryFrame.forcePerpendicular, "N") },
    { label: "tau", value: formatMeasurement(primaryFrame.torque, "N m") },
    { label: "alpha", value: formatMeasurement(primaryFrame.angularAcceleration, "rad/s^2") },
    { label: "omega", value: formatMeasurement(primaryFrame.angularSpeed, "rad/s") },
    { label: "theta", value: formatMeasurement(primaryFrame.rotationAngle, "rad") },
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(241,102,89,0.1),rgba(240,171,60,0.09))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              One pivoted bar, one applied force, and one fixed inertia are enough to keep lever
              arm, force direction, and turning response tied to the same honest bench.
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
          rx="26"
          fill="rgba(255,253,247,0.94)"
        />
        <rect
          x={STAGE_LEFT}
          y={STAGE_TOP}
          width={STAGE_RIGHT - STAGE_LEFT}
          height={STAGE_BOTTOM - STAGE_TOP}
          rx="26"
          fill="none"
          stroke="rgba(15,28,36,0.08)"
        />

        <text
          x={STAGE_LEFT + 18}
          y={STAGE_TOP + 24}
          className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
        >
          Fixed bar length {formatNumber(TORQUE_BAR_LENGTH)} m, fixed inertia{" "}
          {formatNumber(TORQUE_MOMENT_OF_INERTIA)} kg m^2
        </text>
        <text x={STAGE_RIGHT - 18} y={STAGE_TOP + 24} textAnchor="end" className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]">
          turning = r F_perp
        </text>

        <line
          x1={STAGE_LEFT + 18}
          x2={STAGE_RIGHT - 18}
          y1={PIVOT_Y + 80}
          y2={PIVOT_Y + 80}
          stroke="rgba(15,28,36,0.08)"
          strokeWidth="2"
        />
        <text x={STAGE_LEFT + 18} y={PIVOT_Y + 104} className="fill-ink-500 text-[11px]">
          Positive torque lifts the handle counterclockwise. Negative torque twists clockwise.
        </text>

        <polygon
          points={`${PIVOT_X - 34},${PIVOT_Y + 36} ${PIVOT_X + 34},${PIVOT_Y + 36} ${PIVOT_X},${PIVOT_Y + 6}`}
          fill="rgba(15,28,36,0.1)"
          stroke="rgba(15,28,36,0.16)"
        />
        <circle cx={PIVOT_X} cy={PIVOT_Y} r="14" fill="#0f1c24" />
        <circle cx={PIVOT_X} cy={PIVOT_Y} r="6" fill="rgba(255,255,255,0.9)" />

        {secondaryFrame ? (
          renderSetup({
            frame: secondaryFrame,
            label: secondaryLabel ?? "Setup B",
            overlayValues,
            focusedOverlayId,
            muted: true,
            dashed: true,
          })
        ) : null}

        {renderSetup({
          frame: primaryFrame,
          label: primaryLabel,
          overlayValues,
          focusedOverlayId,
        })}

        <text x={STAGE_LEFT + 18} y={STAGE_BOTTOM - 20} className="fill-ink-600 text-[12px]">
          {noteLine}
        </text>

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel} turning state` : "Turning state"}
          rows={metricRows}
          noteLines={[
            `${directionText(primaryFrame.turningDirectionLabel)} turning effect`,
            `By t = ${formatNumber(TORQUE_TOTAL_TIME)} s the same setup would reach theta = ${formatMeasurement(
              resolveFrame(primaryParams, TORQUE_TOTAL_TIME).rotationAngle,
              "rad",
            )}.`,
          ]}
        />
      </svg>
    </section>
  );
}
