"use client";

import {
  ROTATIONAL_INERTIA_HUB_INERTIA,
  ROTATIONAL_INERTIA_MAX_RADIUS,
  ROTATIONAL_INERTIA_PUCK_COUNT,
  ROTATIONAL_INERTIA_PUCK_MASS,
  ROTATIONAL_INERTIA_TOTAL_MASS,
  ROTATIONAL_INERTIA_TOTAL_TIME,
  formatMeasurement,
  formatNumber,
  sampleRotationalInertiaState,
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

type RotationalInertiaSimulationProps = {
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
const REFERENCE_RADIUS = 0.28;
const CARD_WIDTH = 234;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;

function toNumber(value: number | boolean | string | undefined, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

function resolveFrame(source: SimulationParams, time: number) {
  return sampleRotationalInertiaState(
    {
      appliedTorque: toNumber(source.appliedTorque, 4),
      massRadius: toNumber(source.massRadius, 0.35),
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
      return "spread-out layout";
    default:
      return "mid-radius layout";
  }
}

function buildStageNote(frame: ReturnType<typeof resolveFrame>) {
  if (frame.massRadius <= 0.32) {
    return "The same mass stays close to the axis here, so the rotor has a small moment of inertia and spins up quickly.";
  }

  if (frame.massRadius >= 0.92) {
    return "The same mass sits far from the axis here, so the rotor resists angular acceleration much more strongly.";
  }

  return "Pulling the same masses outward raises the rotational inertia smoothly, so the spin-up becomes progressively more sluggish.";
}

function renderTorqueArrow(color: string, muted = false) {
  const radius = 54;
  const path = pathFromAngles(CENTER_X, CENTER_Y, radius, Math.PI * 0.12, -Math.PI * 1.18);
  const arrowStart = polarPoint(CENTER_X, CENTER_Y, radius, -Math.PI * 0.96);
  const arrowEnd = polarPoint(CENTER_X, CENTER_Y, radius, -Math.PI * 1.18);

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
  const radiusGuidesWeight = overlayWeight(focusedOverlayId, "radiusGuides");
  const equalMassWeight = overlayWeight(focusedOverlayId, "equalMassMarkers");
  const referenceWeight = overlayWeight(focusedOverlayId, "referenceCore");
  const showRadiusGuides = overlayValues?.radiusGuides ?? true;
  const showEqualMassMarkers = overlayValues?.equalMassMarkers ?? false;
  const showReferenceCore = overlayValues?.referenceCore ?? false;
  const spokeAngles = Array.from(
    { length: ROTATIONAL_INERTIA_PUCK_COUNT },
    (_, index) => frame.rotationAngle + (index * Math.PI * 2) / ROTATIONAL_INERTIA_PUCK_COUNT,
  );
  const rotorColor = muted ? "rgba(15,28,36,0.32)" : "#0f1c24";
  const puckFill = muted ? "rgba(241,102,89,0.28)" : "rgba(241,102,89,0.94)";
  const puckStroke = muted ? "rgba(255,255,255,0.68)" : "rgba(255,255,255,0.92)";

  return (
    <g opacity={muted ? 0.66 : 1}>
      {showReferenceCore ? (
        <g opacity={referenceWeight}>
          <circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={REFERENCE_RADIUS * ROTOR_SCALE}
            fill="none"
            stroke={muted ? "rgba(78,166,223,0.32)" : "rgba(78,166,223,0.62)"}
            strokeWidth={focusedOverlayId === "referenceCore" ? "3" : "2"}
            strokeDasharray={dashed ? "9 7" : "6 6"}
          />
          {spokeAngles.map((angle, index) => {
            const referencePoint = polarPoint(
              CENTER_X,
              CENTER_Y,
              REFERENCE_RADIUS * ROTOR_SCALE,
              angle,
            );

            return (
              <circle
                key={`reference-${index}`}
                cx={referencePoint.x}
                cy={referencePoint.y}
                r="6.5"
                fill={muted ? "rgba(78,166,223,0.16)" : "rgba(78,166,223,0.28)"}
                stroke={muted ? "rgba(78,166,223,0.24)" : "rgba(78,166,223,0.5)"}
              />
            );
          })}
          <text
            x={CENTER_X - 14}
            y={CENTER_Y + REFERENCE_RADIUS * ROTOR_SCALE + 22}
            className="fill-sky-700 text-[11px] font-semibold"
          >
            compact reference
          </text>
        </g>
      ) : null}

      {showRadiusGuides ? (
        <g opacity={radiusGuidesWeight}>
          <circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={rotorRadius}
            fill="none"
            stroke={muted ? "rgba(240,171,60,0.22)" : "rgba(240,171,60,0.75)"}
            strokeWidth={focusedOverlayId === "radiusGuides" ? "3.1" : "2.2"}
            strokeDasharray={dashed ? "9 7" : "5 5"}
          />
          <line
            x1={CENTER_X}
            x2={CENTER_X + rotorRadius}
            y1={CENTER_Y}
            y2={CENTER_Y}
            stroke={muted ? "rgba(240,171,60,0.22)" : "#f0ab3c"}
            strokeWidth={focusedOverlayId === "radiusGuides" ? "3" : "2"}
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

      {showEqualMassMarkers ? (
        <g opacity={equalMassWeight}>
          {spokeAngles.slice(0, 3).map((angle, index) => {
            const puck = polarPoint(CENTER_X, CENTER_Y, rotorRadius, angle);

            return (
              <text
                key={`mass-tag-${index}`}
                x={puck.x + 16}
                y={puck.y - 12}
                className="fill-coral-700 text-[10px] font-semibold"
              >
                1 kg
              </text>
            );
          })}
          <text
            x={STAGE_LEFT + 20}
            y={STAGE_BOTTOM - 36}
            className="fill-coral-700 text-[11px] font-semibold"
          >
            same six equal masses, same total mass
          </text>
        </g>
      ) : null}

      <circle cx={CENTER_X} cy={CENTER_Y} r="28" fill="rgba(15,28,36,0.92)" />
      <circle cx={CENTER_X} cy={CENTER_Y} r="12" fill="rgba(255,255,255,0.88)" />

      {renderTorqueArrow(muted ? "rgba(30,166,162,0.36)" : "#1ea6a2", muted)}

      <text
        x={CENTER_X + 58}
        y={CENTER_Y - 34}
        className="fill-teal-700 text-[11px] font-semibold"
      >
        τ = {formatNumber(frame.appliedTorque)} N m
      </text>
      <text
        x={CENTER_X + ROTATIONAL_INERTIA_MAX_RADIUS * ROTOR_SCALE + 36}
        y={CENTER_Y + 6}
        className="fill-ink-600 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        {label}
      </text>
    </g>
  );
}

export function RotationalInertiaSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: RotationalInertiaSimulationProps) {
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const previewedMassRadius =
    graphPreview?.kind === "response" &&
    (graphPreview.graphId === "inertia-map" || graphPreview.graphId === "spin-up-map")
      ? graphPreview.point.x
      : null;
  const primaryParamsRaw =
    compare && previewedSetup === "b" ? compare.setupB : compare?.setupA ?? params;
  const secondaryParamsRaw =
    compare && previewedSetup === "b" ? compare.setupA : compare?.setupB ?? null;
  const primaryParams =
    previewedMassRadius !== null ? { ...primaryParamsRaw, massRadius: previewedMassRadius } : primaryParamsRaw;
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
  const endFrameA = compare ? resolveFrame(compare.setupA, ROTATIONAL_INERTIA_TOTAL_TIME) : null;
  const endFrameB = compare ? resolveFrame(compare.setupB, ROTATIONAL_INERTIA_TOTAL_TIME) : null;
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
        {(compare.labelA ?? "Setup A")}: I = {formatMeasurement(endFrameA?.momentOfInertia ?? 0, "kg m^2")},
        {" "}α = {formatMeasurement(endFrameA?.angularAcceleration ?? 0, "rad/s^2")}
      </span>
      <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold text-ink-700">
        {(compare.labelB ?? "Setup B")}: I = {formatMeasurement(endFrameB?.momentOfInertia ?? 0, "kg m^2")},
        {" "}α = {formatMeasurement(endFrameB?.angularAcceleration ?? 0, "rad/s^2")}
      </span>
    </div>
  ) : null;
  const sameTorque =
    compare &&
    endFrameA &&
    endFrameB &&
    Math.abs(endFrameA.appliedTorque - endFrameB.appliedTorque) <= 0.02;
  const strongerResistance =
    sameTorque &&
    endFrameA &&
    endFrameB &&
    Math.abs(endFrameA.momentOfInertia - endFrameB.momentOfInertia) >= 1.2;
  const noteLine =
    strongerResistance
      ? "Same torque and same total mass can still produce very different spin-up when one layout places more mass farther from the axis."
      : buildStageNote(primaryFrame);
  const metricRows = [
    { label: "t", value: formatMeasurement(displayTime, "s") },
    { label: "r_mass", value: formatMeasurement(primaryFrame.massRadius, "m") },
    { label: "τ", value: formatMeasurement(primaryFrame.appliedTorque, "N m") },
    { label: "I", value: formatMeasurement(primaryFrame.momentOfInertia, "kg m^2") },
    { label: "α", value: formatMeasurement(primaryFrame.angularAcceleration, "rad/s^2") },
    { label: "ω", value: formatMeasurement(primaryFrame.angularSpeed, "rad/s") },
    { label: "θ", value: formatMeasurement(primaryFrame.rotationAngle, "rad") },
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(30,166,162,0.1),rgba(240,171,60,0.08))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              Keep the same total mass and the same motor torque, then slide the equal masses
              inward or outward to see how rotational inertia alone reshapes the spin-up.
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

        <circle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={ROTATIONAL_INERTIA_MAX_RADIUS * ROTOR_SCALE}
          fill="none"
          stroke="rgba(15,28,36,0.08)"
          strokeWidth="2.2"
          strokeDasharray="8 8"
        />
        <text
          x={STAGE_LEFT + 18}
          y={STAGE_TOP + 24}
          className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
        >
          six equal masses, same total mass {formatNumber(ROTATIONAL_INERTIA_TOTAL_MASS)} kg
        </text>
        <text
          x={STAGE_RIGHT - 18}
          y={STAGE_TOP + 24}
          textAnchor="end"
          className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
        >
          α = τ / I, with hub inertia {formatNumber(ROTATIONAL_INERTIA_HUB_INERTIA)} kg m²
        </text>

        <line
          x1={STAGE_LEFT + 18}
          x2={STAGE_RIGHT - 18}
          y1={CENTER_Y + 112}
          y2={CENTER_Y + 112}
          stroke="rgba(15,28,36,0.08)"
          strokeWidth="2"
        />
        <text x={STAGE_LEFT + 18} y={CENTER_Y + 136} className="fill-ink-500 text-[11px]">
          Same torque can still produce very different angular acceleration when the mass radius changes.
        </text>

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

        <text x={STAGE_LEFT + 18} y={STAGE_BOTTOM - 18} className="fill-ink-600 text-[12px]">
          {noteLine}
        </text>

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compare ? `${primaryLabel} spin-up state` : "Spin-up state"}
          rows={metricRows}
          noteLines={[
            distributionText(primaryFrame.distributionLabel),
            `By t = ${formatNumber(ROTATIONAL_INERTIA_TOTAL_TIME)} s this setup reaches theta = ${formatMeasurement(
              resolveFrame(primaryParams, ROTATIONAL_INERTIA_TOTAL_TIME).rotationAngle,
              "rad",
            )}.`,
            `${formatNumber(ROTATIONAL_INERTIA_PUCK_COUNT)} x ${formatNumber(ROTATIONAL_INERTIA_PUCK_MASS)} kg masses on one light hub.`,
          ]}
        />
      </svg>
    </section>
  );
}
