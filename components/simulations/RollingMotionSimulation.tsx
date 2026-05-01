"use client";

import {
  formatMeasurement,
  formatNumber,
  sampleRollingMotionState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
  type RollingMotionSnapshot,
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

type RollingMotionSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam?: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 920;
const HEIGHT = 388;
const STAGE_LEFT = 24;
const STAGE_RIGHT = 664;
const STAGE_TOP = 26;
const STAGE_BOTTOM = HEIGHT - 24;
const CARD_WIDTH = 234;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const TRACK_PIXEL_LENGTH = 468;

function toNumber(value: number | boolean | string | undefined, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

function resolveFrame(source: SimulationParams, time: number) {
  return sampleRollingMotionState(
    {
      slopeAngle: toNumber(source.slopeAngle, 12),
      radius: toNumber(source.radius, 0.22),
      inertiaFactor: toNumber(source.inertiaFactor, 0.5),
    },
    time,
  );
}

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.34;
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

type RampGeometry = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  tangentX: number;
  tangentY: number;
  normalX: number;
  normalY: number;
};

function getRampGeometry(angleDeg: number): RampGeometry {
  const angleRad = (angleDeg * Math.PI) / 180;
  const startX = 108;
  const startY = 92;
  const deltaX = Math.cos(angleRad) * TRACK_PIXEL_LENGTH;
  const deltaY = Math.sin(angleRad) * TRACK_PIXEL_LENGTH;
  const length = Math.hypot(deltaX, deltaY);
  const tangentX = deltaX / length;
  const tangentY = deltaY / length;

  return {
    startX,
    startY,
    endX: startX + deltaX,
    endY: startY + deltaY,
    tangentX,
    tangentY,
    normalX: tangentY,
    normalY: -tangentX,
  };
}

function wheelRadiusPx(radius: number) {
  return 28 + ((radius - 0.16) / (0.4 - 0.16)) * 22;
}

function renderArrow(options: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  muted?: boolean;
  dashed?: boolean;
  width?: number;
}) {
  const { startX, startY, endX, endY, color, muted = false, dashed = false, width = 3 } = options;

  return (
    <g opacity={muted ? 0.6 : 1}>
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashed ? "8 6" : undefined}
      />
      <polygon points={arrowHeadPoints(startX, startY, endX, endY, 9)} fill={color} />
    </g>
  );
}

function renderTorqueCue(centerX: number, centerY: number, radius: number, color: string, muted = false) {
  const startAngle = Math.PI * 0.38;
  const endAngle = -Math.PI * 0.84;
  const start = polarPoint(centerX, centerY, radius, startAngle);
  const end = polarPoint(centerX, centerY, radius, endAngle);
  const largeArcFlag = 1;

  return (
    <g opacity={muted ? 0.6 : 1}>
      <path
        d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`}
        fill="none"
        stroke={color}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeDasharray={muted ? "8 6" : undefined}
      />
      <polygon points={arrowHeadPoints(start.x, start.y, end.x, end.y, 9)} fill={color} />
    </g>
  );
}

function renderShapeInterior(frame: RollingMotionSnapshot, centerX: number, centerY: number, radius: number, muted = false) {
  const coreFill = muted ? "rgba(78,166,223,0.18)" : "rgba(78,166,223,0.42)";
  const midFill = muted ? "rgba(30,166,162,0.16)" : "rgba(30,166,162,0.28)";
  const rimStroke = muted ? "rgba(241,102,89,0.28)" : "rgba(241,102,89,0.7)";

  if (frame.shapeId === "sphere") {
    return (
      <>
        <circle cx={centerX} cy={centerY} r={radius * 0.46} fill={coreFill} />
        <circle
          cx={centerX}
          cy={centerY}
          r={radius * 0.78}
          fill="none"
          stroke={muted ? "rgba(30,166,162,0.2)" : "rgba(30,166,162,0.44)"}
          strokeWidth="2.2"
        />
      </>
    );
  }

  if (frame.shapeId === "cylinder") {
    return <circle cx={centerX} cy={centerY} r={radius * 0.75} fill={midFill} />;
  }

  if (frame.shapeId === "hoop") {
    return (
      <circle
        cx={centerX}
        cy={centerY}
        r={radius * 0.8}
        fill="none"
        stroke={rimStroke}
        strokeWidth={radius * 0.28}
      />
    );
  }

  const distributionRadius = radius * (0.38 + 0.46 * (frame.inertiaFactor - 0.4) / 0.6);
  return (
    <>
      <circle
        cx={centerX}
        cy={centerY}
        r={distributionRadius}
        fill="none"
        stroke={rimStroke}
        strokeWidth="4.2"
      />
      <circle cx={centerX} cy={centerY} r={radius * 0.14} fill={coreFill} />
    </>
  );
}

function buildStageNote(frame: RollingMotionSnapshot) {
  if (frame.shapeId === "sphere") {
    return "The solid sphere keeps its mass closer to the axis, so less of the same downhill pull is diverted into spin and the center speeds up more strongly.";
  }

  if (frame.shapeId === "hoop") {
    return "The hoop keeps its mass near the rim, so the same incline must build more rotational motion and the center-of-mass acceleration stays smaller.";
  }

  if (frame.radius <= 0.18) {
    return "For the same shape and slope, shrinking the radius barely changes the center-of-mass acceleration, but it does make the angular speed climb faster because omega = v/r.";
  }

  if (frame.slopeAngle >= 20) {
    return "A steeper incline increases the downhill component of gravity for every shape, but the no-slip link and the energy split still stay governed by the same inertia factor.";
  }

  return "Rolling without slipping keeps translation and rotation locked together. The slope sets the available downhill pull, while the inertia factor decides how that pull splits between speeding up the center and spinning the object.";
}

function renderSetup(options: {
  frame: RollingMotionSnapshot;
  label: string;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  muted?: boolean;
  dashed?: boolean;
  laneOffset?: number;
}) {
  const {
    frame,
    label,
    overlayValues,
    focusedOverlayId,
    muted = false,
    dashed = false,
    laneOffset = 0,
  } = options;
  const geometry = getRampGeometry(frame.slopeAngle);
  const wheelRadius = wheelRadiusPx(frame.radius);
  const progressX = geometry.startX + (geometry.endX - geometry.startX) * frame.normalizedProgress;
  const progressY = geometry.startY + (geometry.endY - geometry.startY) * frame.normalizedProgress;
  const centerX = progressX + geometry.normalX * (wheelRadius + 4 + laneOffset);
  const centerY = progressY + geometry.normalY * (wheelRadius + 4 + laneOffset);
  const contactX = progressX + geometry.normalX * laneOffset;
  const contactY = progressY + geometry.normalY * laneOffset;
  const noSlipWeight = overlayWeight(focusedOverlayId, "noSlipLink");
  const energyWeight = overlayWeight(focusedOverlayId, "energySplit");
  const frictionWeight = overlayWeight(focusedOverlayId, "frictionTorque");
  const massLayoutWeight = overlayWeight(focusedOverlayId, "massLayout");
  const showNoSlip = overlayValues?.noSlipLink ?? true;
  const showEnergy = overlayValues?.energySplit ?? true;
  const showFriction = overlayValues?.frictionTorque ?? false;
  const showMassLayout = overlayValues?.massLayout ?? true;
  const strokeColor = muted ? "rgba(15,28,36,0.28)" : "#0f1c24";
  const guideColor = muted ? "rgba(78,166,223,0.2)" : "rgba(78,166,223,0.44)";
  const spokeAngle = -frame.rotationAngle;
  const spokeRadius = wheelRadius * 0.82;
  const primarySpokeStart = polarPoint(centerX, centerY, spokeRadius, Math.PI + spokeAngle);
  const primarySpokeEnd = polarPoint(centerX, centerY, spokeRadius, spokeAngle);
  const secondarySpokeStart = polarPoint(centerX, centerY, spokeRadius, Math.PI / 2 + spokeAngle);
  const secondarySpokeEnd = polarPoint(centerX, centerY, spokeRadius, -Math.PI / 2 + spokeAngle);

  return (
    <g opacity={muted ? 0.68 : 1}>
      <line
        x1={geometry.startX - 12}
        y1={geometry.startY}
        x2={geometry.endX + 10}
        y2={geometry.endY}
        stroke={strokeColor}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={dashed ? "10 8" : undefined}
      />
      <line
        x1={geometry.endX}
        y1={geometry.endY - 18}
        x2={geometry.endX}
        y2={geometry.endY + 28}
        stroke={muted ? "rgba(240,171,60,0.28)" : "rgba(240,171,60,0.82)"}
        strokeWidth="4"
        strokeDasharray={dashed ? "8 6" : undefined}
      />
      <text
        x={geometry.startX - 6}
        y={geometry.startY - 18 - laneOffset}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        theta = {formatNumber(frame.slopeAngle)} deg
      </text>
      <text
        x={geometry.endX - 16}
        y={geometry.endY + 42 + laneOffset}
        textAnchor="end"
        className="fill-amber-700 text-[11px] font-semibold"
      >
        finish gate
      </text>

      {showEnergy ? (
        <g opacity={energyWeight}>
          <rect
            x={STAGE_LEFT + 24}
            y={STAGE_BOTTOM - 58}
            width="174"
            height="16"
            rx="8"
            fill={muted ? "rgba(15,28,36,0.06)" : "rgba(15,28,36,0.08)"}
          />
          <rect
            x={STAGE_LEFT + 24}
            y={STAGE_BOTTOM - 58}
            width={174 * frame.energyTranslationFraction}
            height="16"
            rx="8"
            fill={muted ? "rgba(78,166,223,0.18)" : "rgba(78,166,223,0.7)"}
          />
          <rect
            x={STAGE_LEFT + 24 + 174 * frame.energyTranslationFraction}
            y={STAGE_BOTTOM - 58}
            width={174 * frame.energyRotationFraction}
            height="16"
            rx="8"
            fill={muted ? "rgba(240,171,60,0.14)" : "rgba(240,171,60,0.62)"}
          />
          <text
            x={STAGE_LEFT + 24}
            y={STAGE_BOTTOM - 66}
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            energy split
          </text>
          <text x={STAGE_LEFT + 24} y={STAGE_BOTTOM - 24} className="fill-sky-700 text-[10px] font-semibold">
            trans {formatNumber(frame.energyTranslationFraction * 100)}%
          </text>
          <text
            x={STAGE_LEFT + 196}
            y={STAGE_BOTTOM - 24}
            textAnchor="end"
            className="fill-amber-700 text-[10px] font-semibold"
          >
            rot {formatNumber(frame.energyRotationFraction * 100)}%
          </text>
        </g>
      ) : null}

      <circle
        cx={centerX}
        cy={centerY}
        r={wheelRadius}
        fill={muted ? "rgba(255,255,255,0.72)" : "rgba(255,253,247,0.98)"}
        stroke={strokeColor}
        strokeWidth="4"
        strokeDasharray={dashed ? "10 8" : undefined}
      />
      {renderShapeInterior(frame, centerX, centerY, wheelRadius, muted)}
      <g opacity={muted ? 0.52 : 1}>
        <line
          data-testid="rolling-primary-spoke"
          x1={primarySpokeStart.x}
          y1={primarySpokeStart.y}
          x2={primarySpokeEnd.x}
          y2={primarySpokeEnd.y}
          stroke={guideColor}
          strokeWidth="2.2"
        />
        <line
          x1={secondarySpokeStart.x}
          y1={secondarySpokeStart.y}
          x2={secondarySpokeEnd.x}
          y2={secondarySpokeEnd.y}
          stroke={guideColor}
          strokeWidth="2.2"
        />
      </g>
      <circle cx={centerX} cy={centerY} r="4.5" fill={muted ? "rgba(15,28,36,0.42)" : "#0f1c24"} />

      {showNoSlip ? (
        <g opacity={noSlipWeight}>
          <text
            x={centerX + wheelRadius + 18}
            y={centerY - 8}
            className="fill-teal-700 text-[11px] font-semibold"
          >
            v = r omega
          </text>
          <text
            x={centerX + wheelRadius + 18}
            y={centerY + 10}
            className="fill-ink-500 text-[10px]"
          >
            {formatMeasurement(frame.linearSpeed, "m/s")} = {formatMeasurement(frame.radius, "m")} x {formatMeasurement(frame.angularSpeed, "rad/s")}
          </text>
        </g>
      ) : null}

      {showFriction ? (
        <g opacity={frictionWeight}>
          {renderArrow({
            startX: contactX + geometry.tangentX * 44,
            startY: contactY + geometry.tangentY * 44,
            endX: contactX + geometry.tangentX * 4,
            endY: contactY + geometry.tangentY * 4,
            color: muted ? "rgba(240,171,60,0.4)" : "#f0ab3c",
            muted,
            dashed,
          })}
          {renderTorqueCue(
            centerX,
            centerY,
            wheelRadius * 0.54,
            muted ? "rgba(30,166,162,0.4)" : "#1ea6a2",
            muted,
          )}
          <text
            x={contactX + geometry.tangentX * 56}
            y={contactY + geometry.tangentY * 36}
            className="fill-amber-700 text-[11px] font-semibold"
          >
            f_s = {formatMeasurement(frame.staticFriction, "N")}
          </text>
        </g>
      ) : null}

      {showMassLayout ? (
        <g opacity={massLayoutWeight}>
          <text
            x={centerX - wheelRadius - 6}
            y={centerY - wheelRadius - 14}
            className="fill-coral-700 text-[11px] font-semibold"
          >
            {frame.shapeLabel}
          </text>
          <text
            x={centerX - wheelRadius - 6}
            y={centerY - wheelRadius}
            className="fill-ink-500 text-[10px]"
          >
            k = {formatNumber(frame.inertiaFactor)}
          </text>
        </g>
      ) : null}

      <text
        x={centerX}
        y={centerY + wheelRadius + 26}
        textAnchor="middle"
        className="fill-ink-600 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        {label}
      </text>
    </g>
  );
}

export function RollingMotionSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: RollingMotionSimulationProps) {
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const previewedInertiaFactor =
    graphPreview?.kind === "response" && graphPreview.graphId === "acceleration-map"
      ? graphPreview.point.x
      : null;
  const primaryParamsRaw =
    compare && previewedSetup === "b" ? compare.setupB : compare?.setupA ?? params;
  const secondaryParamsRaw =
    compare && previewedSetup === "b" ? compare.setupA : compare?.setupB ?? null;
  const primaryParams =
    previewedInertiaFactor !== null
      ? { ...primaryParamsRaw, inertiaFactor: previewedInertiaFactor }
      : primaryParamsRaw;
  const primaryFrame = resolveFrame(primaryParams, displayTime);
  const secondaryFrame = secondaryParamsRaw ? resolveFrame(secondaryParamsRaw, displayTime) : null;
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
  const compareLegend = compare ? (
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
  const compareBadges = compare ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold text-ink-700">
        {(compare.labelA ?? "Setup A")}: a = {formatMeasurement(resolveFrame(compare.setupA, 0).acceleration, "m/s^2")},
        {" "}t_bottom = {formatMeasurement(resolveFrame(compare.setupA, 0).travelTime, "s")}
      </span>
      <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold text-ink-700">
        {(compare.labelB ?? "Setup B")}: a = {formatMeasurement(resolveFrame(compare.setupB, 0).acceleration, "m/s^2")},
        {" "}t_bottom = {formatMeasurement(resolveFrame(compare.setupB, 0).travelTime, "s")}
      </span>
    </div>
  ) : null;
  const sameSlopeAndRadius =
    compare &&
    Math.abs(resolveFrame(compare.setupA, 0).slopeAngle - resolveFrame(compare.setupB, 0).slopeAngle) <= 0.05 &&
    Math.abs(resolveFrame(compare.setupA, 0).radius - resolveFrame(compare.setupB, 0).radius) <= 0.005;
  const clearlyDifferentShapes =
    compare &&
    Math.abs(
      resolveFrame(compare.setupA, 0).inertiaFactor - resolveFrame(compare.setupB, 0).inertiaFactor,
    ) >= 0.18;
  const noteLine =
    sameSlopeAndRadius && clearlyDifferentShapes
      ? "Same slope and radius can still produce different rolling times because a smaller inertia factor leaves more of the downhill pull available for center-of-mass acceleration."
      : buildStageNote(primaryFrame);
  const metricRows = [
    { label: "t", value: formatMeasurement(primaryFrame.displayTime, "s") },
    { label: "theta", value: formatMeasurement(primaryFrame.slopeAngle, "deg") },
    { label: "k", value: formatNumber(primaryFrame.inertiaFactor) },
    { label: "a_cm", value: formatMeasurement(primaryFrame.acceleration, "m/s^2") },
    { label: "v_cm", value: formatMeasurement(primaryFrame.linearSpeed, "m/s") },
    { label: "omega", value: formatMeasurement(primaryFrame.angularSpeed, "rad/s") },
    { label: "t_bottom", value: formatMeasurement(primaryFrame.travelTime, "s") },
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(30,166,162,0.1),rgba(240,171,60,0.08))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              One bounded incline keeps rolling without slipping honest: gravity pulls the same way
              for every setup, while the inertia factor decides how strongly the object translates,
              spins, and splits its energy.
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
          rx="28"
          fill="rgba(255,253,247,0.94)"
        />
        <rect
          x={STAGE_LEFT}
          y={STAGE_TOP}
          width={STAGE_RIGHT - STAGE_LEFT}
          height={STAGE_BOTTOM - STAGE_TOP}
          rx="28"
          fill="none"
          stroke="rgba(15,28,36,0.08)"
        />

        <text
          x={STAGE_LEFT + 18}
          y={STAGE_TOP + 24}
          className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
        >
          bounded no-slip model with one incline and one rigid roller
        </text>
        <text
          x={STAGE_RIGHT - 18}
          y={STAGE_TOP + 24}
          textAnchor="end"
          className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
        >
          a = g sin(theta) / (1 + k), k = I / (m r^2)
        </text>

        <line
          x1={STAGE_LEFT + 18}
          x2={STAGE_RIGHT - 18}
          y1={STAGE_BOTTOM - 78}
          y2={STAGE_BOTTOM - 78}
          stroke="rgba(15,28,36,0.08)"
          strokeWidth="2"
        />
        <text x={STAGE_LEFT + 18} y={STAGE_BOTTOM - 90} className="fill-ink-500 text-[11px]">
          Same mass, same slope, different shapes: the inertia factor is what changes how quickly the center speeds up.
        </text>

        {secondaryFrame ? (
          renderSetup({
            frame: secondaryFrame,
            label: secondaryLabel ?? "Setup B",
            overlayValues,
            focusedOverlayId,
            muted: true,
            dashed: true,
            laneOffset: 10,
          })
        ) : null}

        {renderSetup({
          frame: primaryFrame,
          label: primaryLabel,
          overlayValues,
          focusedOverlayId,
        })}

        <text x={STAGE_LEFT + 18} y={STAGE_BOTTOM - 12} className="fill-ink-600 text-[12px]">
          {noteLine}
        </text>

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compare ? `${primaryLabel} rolling state` : "Rolling state"}
          setupLabel={compare ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={[
            `${primaryFrame.shapeLabel}, r = ${formatMeasurement(primaryFrame.radius, "m")}`,
            `K_trans = ${formatMeasurement(primaryFrame.translationalEnergy, "J")}, K_rot = ${formatMeasurement(primaryFrame.rotationalEnergy, "J")}`,
            `f_s = ${formatMeasurement(primaryFrame.staticFriction, "N")}, tau = ${formatMeasurement(primaryFrame.torqueFromFriction, "N m")}`,
          ]}
        />
      </svg>
    </section>
  );
}
