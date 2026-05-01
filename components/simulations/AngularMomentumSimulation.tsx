"use client";

import {
  ANGULAR_MOMENTUM_MAX_RADIUS,
  ANGULAR_MOMENTUM_PUCK_COUNT,
  ANGULAR_MOMENTUM_REFERENCE_RADIUS,
  ANGULAR_MOMENTUM_TOTAL_TIME,
  formatMeasurement,
  formatNumber,
  sampleAngularMomentumState,
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

type AngularMomentumSimulationProps = {
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
const CENTER_X = 228;
const CENTER_Y = 194;
const ROTOR_SCALE = 126;
const CARD_WIDTH = 234;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;

function toNumber(value: number | boolean | string | undefined, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

function resolveFrame(source: SimulationParams, time: number) {
  return sampleAngularMomentumState(
    {
      massRadius: toNumber(source.massRadius, 0.55),
      angularSpeed: toNumber(source.angularSpeed, 2.4),
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

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.34;
}

function pathFromAngles(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarPoint(centerX, centerY, radius, startAngle);
  const end = polarPoint(centerX, centerY, radius, endAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
  const sweepFlag = endAngle < startAngle ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
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

function distributionText(
  label: ReturnType<typeof resolveFrame>["distributionLabel"],
) {
  switch (label) {
    case "compact":
      return "compact layout";
    case "spread":
      return "wide layout";
    default:
      return "mid-radius layout";
  }
}

function buildStageNote(frame: ReturnType<typeof resolveFrame>) {
  if (frame.massRadius <= 0.32) {
    return "The mass is packed close to the axis here, so a modest angular momentum already corresponds to a fast spin.";
  }

  if (frame.massRadius >= 0.92) {
    return "The mass sits far from the axis here, so the same angular momentum would show up as a much slower spin.";
  }

  return "As the same mass moves outward, the moment of inertia rises and the same angular momentum would require less angular speed.";
}

function renderMomentumSwirl(color: string, muted = false) {
  const radius = 54;
  const path = pathFromAngles(CENTER_X, CENTER_Y, radius, Math.PI * 0.08, -Math.PI * 1.2);
  const arrowStart = polarPoint(CENTER_X, CENTER_Y, radius, -Math.PI * 0.97);
  const arrowEnd = polarPoint(CENTER_X, CENTER_Y, radius, -Math.PI * 1.2);

  return (
    <g opacity={muted ? 0.55 : 1}>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeDasharray={muted ? "8 6" : undefined}
      />
      <polygon points={arrowHeadPoints(arrowStart.x, arrowStart.y, arrowEnd.x, arrowEnd.y)} fill={color} />
    </g>
  );
}

function renderTangentialVelocityArrow(
  frame: ReturnType<typeof resolveFrame>,
  focusedOverlayId?: string | null,
  muted = false,
) {
  const emphasis = overlayWeight(focusedOverlayId, "tangentialSpeed");
  const rotorRadius = frame.massRadius * ROTOR_SCALE;
  const arrowAngle = frame.rotationAngle + Math.PI / 3;
  const start = polarPoint(CENTER_X, CENTER_Y, rotorRadius, arrowAngle);
  const arrowLength = Math.max(28, Math.min(76, 26 + frame.tangentialSpeed * 18));
  const endX = start.x - Math.sin(arrowAngle) * arrowLength;
  const endY = start.y - Math.cos(arrowAngle) * arrowLength;

  return (
    <g opacity={emphasis * (muted ? 0.48 : 1)}>
      <line
        x1={start.x}
        x2={endX}
        y1={start.y}
        y2={endY}
        stroke={muted ? "rgba(78,166,223,0.36)" : "#4ea6df"}
        strokeWidth={focusedOverlayId === "tangentialSpeed" ? "3.4" : "2.8"}
        strokeLinecap="round"
        strokeDasharray={muted ? "8 6" : undefined}
      />
      <polygon points={arrowHeadPoints(start.x, start.y, endX, endY, 11)} fill={muted ? "rgba(78,166,223,0.42)" : "#4ea6df"} />
      <text
        x={endX + 10}
        y={endY - 10}
        className="fill-sky-700 text-[11px] font-semibold"
      >
        v = {formatNumber(frame.tangentialSpeed)} m/s
      </text>
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
  const rotorRadius = frame.massRadius * ROTOR_SCALE;
  const radiusGuideWeight = overlayWeight(focusedOverlayId, "radiusGuide");
  const equalMassWeight = overlayWeight(focusedOverlayId, "equalMassMarkers");
  const sameLWeight = overlayWeight(focusedOverlayId, "sameLReference");
  const showRadiusGuide = overlayValues?.radiusGuide ?? true;
  const showEqualMassMarkers = overlayValues?.equalMassMarkers ?? false;
  const showSameLReference = overlayValues?.sameLReference ?? true;
  const showTangentialSpeed = overlayValues?.tangentialSpeed ?? true;
  const spokeAngles = Array.from(
    { length: ANGULAR_MOMENTUM_PUCK_COUNT },
    (_, index) => frame.rotationAngle + (index * Math.PI * 2) / ANGULAR_MOMENTUM_PUCK_COUNT,
  );
  const rotorColor = muted ? "rgba(15,28,36,0.32)" : "#0f1c24";
  const puckFill = muted ? "rgba(240,171,60,0.2)" : "rgba(240,171,60,0.9)";
  const puckStroke = muted ? "rgba(255,255,255,0.68)" : "rgba(255,255,255,0.92)";

  return (
    <g opacity={muted ? 0.66 : 1}>
      {showSameLReference ? (
        <g opacity={sameLWeight}>
          <circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={ANGULAR_MOMENTUM_REFERENCE_RADIUS * ROTOR_SCALE}
            fill="none"
            stroke={muted ? "rgba(30,166,162,0.26)" : "rgba(30,166,162,0.62)"}
            strokeWidth={focusedOverlayId === "sameLReference" ? "3" : "2"}
            strokeDasharray={dashed ? "9 7" : "6 6"}
          />
          <text
            x={CENTER_X - 42}
            y={CENTER_Y + ANGULAR_MOMENTUM_REFERENCE_RADIUS * ROTOR_SCALE + 22}
            className="fill-teal-700 text-[11px] font-semibold"
          >
            {"same L -> omega = "}
            {formatNumber(frame.referenceAngularSpeed)}
            {" rad/s"}
          </text>
        </g>
      ) : null}

      {showRadiusGuide ? (
        <g opacity={radiusGuideWeight}>
          <circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={rotorRadius}
            fill="none"
            stroke={muted ? "rgba(240,171,60,0.22)" : "rgba(240,171,60,0.74)"}
            strokeWidth={focusedOverlayId === "radiusGuide" ? "3.1" : "2.2"}
            strokeDasharray={dashed ? "9 7" : "5 5"}
          />
          <line
            x1={CENTER_X}
            x2={CENTER_X + rotorRadius}
            y1={CENTER_Y}
            y2={CENTER_Y}
            stroke={muted ? "rgba(240,171,60,0.22)" : "#f0ab3c"}
            strokeWidth={focusedOverlayId === "radiusGuide" ? "3" : "2"}
          />
          <text
            x={CENTER_X + rotorRadius / 2 + 8}
            y={CENTER_Y - 10}
            className="fill-amber-700 text-[11px] font-semibold"
          >
            r = {formatNumber(frame.massRadius)} m
          </text>
        </g>
      ) : null}

      {spokeAngles.map((angle, index) => {
        const puck = polarPoint(CENTER_X, CENTER_Y, rotorRadius, angle);
        const hubTip = polarPoint(CENTER_X, CENTER_Y, Math.max(18, rotorRadius - 18), angle);

        return (
          <g key={`${label}-${index}`}>
            <line
              x1={CENTER_X}
              x2={hubTip.x}
              y1={CENTER_Y}
              y2={hubTip.y}
              stroke={rotorColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={dashed ? "9 7" : undefined}
            />
            <circle
              cx={puck.x}
              cy={puck.y}
              r="13"
              fill={puckFill}
              stroke={puckStroke}
              strokeWidth="3"
            />
          </g>
        );
      })}

      {showTangentialSpeed ? renderTangentialVelocityArrow(frame, focusedOverlayId, muted) : null}

      {showEqualMassMarkers ? (
        <g opacity={equalMassWeight}>
          {spokeAngles.slice(0, 3).map((angle, index) => {
            const puck = polarPoint(CENTER_X, CENTER_Y, rotorRadius, angle);

            return (
              <text
                key={`mass-tag-${index}`}
                x={puck.x + 16}
                y={puck.y - 12}
                className="fill-amber-700 text-[10px] font-semibold"
              >
                1 kg
              </text>
            );
          })}
          <text
            x={STAGE_LEFT + 20}
            y={STAGE_BOTTOM - 36}
            className="fill-amber-700 text-[11px] font-semibold"
          >
            same six equal masses, same total mass
          </text>
        </g>
      ) : null}

      <circle cx={CENTER_X} cy={CENTER_Y} r="28" fill="rgba(15,28,36,0.92)" />
      <circle cx={CENTER_X} cy={CENTER_Y} r="12" fill="rgba(255,255,255,0.88)" />

      {renderMomentumSwirl(muted ? "rgba(30,166,162,0.36)" : "#1ea6a2", muted)}

      <text
        x={CENTER_X + 58}
        y={CENTER_Y - 34}
        className="fill-teal-700 text-[11px] font-semibold"
      >
        L = {formatNumber(frame.angularMomentum)} kg m^2/s
      </text>
      <text
        x={CENTER_X + 58}
        y={CENTER_Y - 18}
        className="fill-sky-700 text-[11px] font-semibold"
      >
        omega = {formatNumber(frame.angularSpeed)} rad/s
      </text>
      <text
        x={CENTER_X + ANGULAR_MOMENTUM_MAX_RADIUS * ROTOR_SCALE + 36}
        y={CENTER_Y + 6}
        className="fill-ink-600 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        {label}
      </text>
    </g>
  );
}

export function AngularMomentumSimulation({
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: AngularMomentumSimulationProps) {
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const previewedMassRadius =
    graphPreview?.kind === "response" &&
    (graphPreview.graphId === "momentum-map" || graphPreview.graphId === "conserved-spin-map")
      ? graphPreview.point.x
      : null;
  const previewedAngularSpeed =
    graphPreview?.kind === "response" && graphPreview.graphId === "conserved-spin-map"
      ? graphPreview.point.y
      : null;
  const primaryParamsRaw =
    compare && previewedSetup === "b" ? compare.setupB : compare?.setupA ?? params;
  const secondaryParamsRaw =
    compare && previewedSetup === "b" ? compare.setupA : compare?.setupB ?? null;
  const primaryParams = {
    ...primaryParamsRaw,
    ...(previewedMassRadius !== null ? { massRadius: previewedMassRadius } : {}),
    ...(previewedAngularSpeed !== null ? { angularSpeed: previewedAngularSpeed } : {}),
  };
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
  const endFrameA = compare ? resolveFrame(compare.setupA, ANGULAR_MOMENTUM_TOTAL_TIME) : null;
  const endFrameB = compare ? resolveFrame(compare.setupB, ANGULAR_MOMENTUM_TOTAL_TIME) : null;
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
        {(compare.labelA ?? "Setup A")}: L = {formatMeasurement(endFrameA?.angularMomentum ?? 0, "kg m^2/s")},
        {" "}omega = {formatMeasurement(endFrameA?.angularSpeed ?? 0, "rad/s")}
      </span>
      <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold text-ink-700">
        {(compare.labelB ?? "Setup B")}: L = {formatMeasurement(endFrameB?.angularMomentum ?? 0, "kg m^2/s")},
        {" "}omega = {formatMeasurement(endFrameB?.angularSpeed ?? 0, "rad/s")}
      </span>
    </div>
  ) : null;
  const sameAngularMomentum =
    compare &&
    endFrameA &&
    endFrameB &&
    Math.abs(endFrameA.angularMomentum - endFrameB.angularMomentum) <= 0.2;
  const sameAngularSpeed =
    compare && endFrameA && endFrameB && Math.abs(endFrameA.angularSpeed - endFrameB.angularSpeed) <= 0.08;
  const compareMessage = compare
    ? sameAngularMomentum
      ? "Same angular momentum can hide behind very different spin rates when the mass layout changes."
      : sameAngularSpeed
        ? "Keeping the same spin rate while moving mass outward raises angular momentum because the moment of inertia grew."
        : "Changing radius and spin together can either preserve angular momentum or create a new one, depending on the combination."
    : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">{previewBadge}</div>
        {compareLegend}
      </div>
      {compareBadges}
      <div className="rounded-[28px] border border-line bg-paper p-3 shadow-[0_20px_60px_-36px_rgba(15,28,36,0.45)]">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label="Angular momentum rotor simulation"
        >
          <defs>
            <linearGradient id="angularMomentumStage" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,251,240,0.98)" />
              <stop offset="100%" stopColor="rgba(247,250,252,0.98)" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width={WIDTH} height={HEIGHT} rx="30" fill="url(#angularMomentumStage)" />
          <rect
            x={STAGE_LEFT}
            y={STAGE_TOP}
            width={STAGE_RIGHT - STAGE_LEFT}
            height={STAGE_BOTTOM - STAGE_TOP}
            rx="26"
            fill="rgba(255,255,255,0.7)"
            stroke="rgba(15,28,36,0.08)"
          />
          <circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={ANGULAR_MOMENTUM_MAX_RADIUS * ROTOR_SCALE + 18}
            fill="rgba(255,253,247,0.72)"
            stroke="rgba(15,28,36,0.06)"
          />

          {secondaryFrame
            ? renderSetup({
                frame: secondaryFrame,
                label: secondaryLabel ?? "Setup B",
                overlayValues,
                focusedOverlayId,
                muted: true,
                dashed: true,
              })
            : null}
          {renderSetup({
            frame: primaryFrame,
            label: primaryLabel,
            overlayValues,
            focusedOverlayId,
          })}

          <SimulationReadoutCard
            x={CARD_X}
            y={CARD_Y}
            width={CARD_WIDTH}
            title="Rotational state"
            setupLabel={compare ? primaryLabel : null}
            rows={[
              {
                label: "Mass radius",
                value: formatMeasurement(primaryFrame.massRadius, "m"),
              },
              {
                label: "Angular speed",
                value: formatMeasurement(primaryFrame.angularSpeed, "rad/s"),
              },
              {
                label: "Moment of inertia",
                value: formatMeasurement(primaryFrame.momentOfInertia, "kg m^2"),
              },
              {
                label: "Angular momentum",
                value: formatMeasurement(primaryFrame.angularMomentum, "kg m^2/s"),
              },
              {
                label: "Rim speed",
                value: formatMeasurement(primaryFrame.tangentialSpeed, "m/s"),
              },
              {
                label: "Angle at t",
                value: formatMeasurement(primaryFrame.rotationAngle, "rad"),
              },
            ]}
            noteLines={[
              `${distributionText(primaryFrame.distributionLabel)} at t = ${formatNumber(primaryFrame.displayTime)} s`,
              `same L at r = ${formatNumber(primaryFrame.compactReferenceRadius)} m -> omega = ${formatNumber(primaryFrame.referenceAngularSpeed)} rad/s`,
            ]}
          />

          <text
            x={STAGE_LEFT + 18}
            y={STAGE_TOP + 24}
            className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
          >
            Angular momentum bench
          </text>
          <text
            x={STAGE_LEFT + 18}
            y={STAGE_TOP + 44}
            className="fill-ink-700 text-[12px]"
          >
            Same mass, adjustable radius, and live same-L reference
          </text>
        </svg>
      </div>
      <div className="flex flex-wrap items-start gap-3 text-sm text-ink-700">
        <p className="max-w-3xl">{buildStageNote(primaryFrame)}</p>
        {compareMessage ? <p className="max-w-3xl font-medium text-ink-800">{compareMessage}</p> : null}
      </div>
    </div>
  );
}
