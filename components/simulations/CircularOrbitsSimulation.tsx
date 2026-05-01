"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import {
  buildCircularOrbitTrajectory,
  formatCircularOrbitStatus,
  formatCircularOrbitTrend,
  formatMeasurement,
  formatNumber,
  resolveCircularOrbitKeplerRatio,
  resolveCircularOrbitsParams,
  sampleCircularOrbitsState,
  type CircularOrbitTrajectory,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
  CIRCULAR_ORBITS_RING_RADII,
  CIRCULAR_ORBITS_STAGE_MAX_RADIUS,
} from "@/lib/physics";
import type { AppLocale } from "@/i18n/routing";
import { copyText, getCompareSetupLabel } from "@/lib/i18n/copy-text";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import {
  CompareLegend,
  resolveCompareScene,
  SimulationPreviewBadge,
} from "./primitives/compare";
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

type CircularOrbitsSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type OrbitFrame = {
  trajectory: CircularOrbitTrajectory;
  snapshot: ReturnType<typeof sampleCircularOrbitsState>;
};

const WIDTH = 880;
const HEIGHT = 360;
const STAGE_CENTER_X = 250;
const STAGE_CENTER_Y = 186;
const STAGE_RADIUS_PX = 148;
const METRICS_CARD_WIDTH = 232;
const METRICS_CARD_X = WIDTH - METRICS_CARD_WIDTH - 18;
const METRICS_CARD_Y = 18;

function toSvgPoint(x: number, y: number) {
  const scale = STAGE_RADIUS_PX / CIRCULAR_ORBITS_STAGE_MAX_RADIUS;

  return {
    x: STAGE_CENTER_X + x * scale,
    y: STAGE_CENTER_Y - y * scale,
  };
}

function toRadiusPixels(radius: number) {
  return (radius / CIRCULAR_ORBITS_STAGE_MAX_RADIUS) * STAGE_RADIUS_PX;
}

function buildTrailPath(trajectory: CircularOrbitTrajectory, time: number) {
  const sampleCount = Math.min(
    trajectory.samples.length,
    Math.max(2, Math.floor(time / Math.max(trajectory.timeStep, 1e-6)) + 2),
  );
  const trailSamples = trajectory.samples.slice(0, sampleCount);

  return trailSamples
    .map((sample, index) => {
      const point = toSvgPoint(sample.x, sample.y);
      return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
    })
    .join(" ");
}

function buildFrame(source: SimulationParams, time: number): OrbitFrame {
  const trajectory = buildCircularOrbitTrajectory(source);

  return {
    trajectory,
    snapshot: sampleCircularOrbitsState(source, time, trajectory),
  };
}

function vectorLength(value: number, maxLength: number, scale: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return maxLength * Math.tanh(value / scale);
}

export function CircularOrbitsSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: CircularOrbitsSimulationProps) {
  const locale = useLocale() as AppLocale;
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  const activeFrame = useMemo(
    () => buildFrame(params, displayTime),
    [displayTime, params],
  );
  const frameA = useMemo(
    () => (compare ? buildFrame(compare.setupA, displayTime) : null),
    [compare, displayTime],
  );
  const frameB = useMemo(
    () => (compare ? buildFrame(compare.setupB, displayTime) : null),
    [compare, displayTime],
  );
  const { compareEnabled, primaryFrame, secondaryFrame, primaryLabel, secondaryLabel } =
    resolveCompareScene({
      compare,
    graphPreview,
    activeFrame,
    frameA,
    frameB,
    liveLabel: copyText(locale, "Live orbit", "即時軌道"),
    defaultLabelA: getCompareSetupLabel(locale, "a"),
    defaultLabelB: getCompareSetupLabel(locale, "b"),
  });
  const primaryParams = resolveCircularOrbitsParams(primaryFrame.trajectory.params);
  const primaryPoint = toSvgPoint(primaryFrame.snapshot.x, primaryFrame.snapshot.y);
  const primarySourceRadius = 18 + primaryParams.sourceMass * 2.4;
  const secondaryParams = secondaryFrame
    ? resolveCircularOrbitsParams(secondaryFrame.trajectory.params)
    : null;
  const secondaryPoint = secondaryFrame
    ? toSvgPoint(secondaryFrame.snapshot.x, secondaryFrame.snapshot.y)
    : null;
  const secondarySourceRadius = secondaryParams ? 18 + secondaryParams.sourceMass * 2.4 : null;
  const showReferenceOrbit = overlayValues?.referenceOrbit ?? true;
  const showRadiusLine = overlayValues?.radiusLine ?? true;
  const showVelocityVector = overlayValues?.velocityVector ?? true;
  const showGravityVector = overlayValues?.gravityVector ?? true;
  const showTrail = overlayValues?.trail ?? true;
  const gravityLength = vectorLength(primaryFrame.snapshot.gravityAcceleration, 70, 2.2);
  const gravityRadius = Math.max(primaryFrame.snapshot.radius, 1e-6);
  const gravityEnd = toSvgPoint(
    primaryFrame.snapshot.x - (primaryFrame.snapshot.x / gravityRadius) * (gravityLength / (STAGE_RADIUS_PX / CIRCULAR_ORBITS_STAGE_MAX_RADIUS)),
    primaryFrame.snapshot.y - (primaryFrame.snapshot.y / gravityRadius) * (gravityLength / (STAGE_RADIUS_PX / CIRCULAR_ORBITS_STAGE_MAX_RADIUS)),
  );
  const velocityLength = vectorLength(primaryFrame.snapshot.speed, 86, 1.8);
  const velocitySpeed = Math.max(primaryFrame.snapshot.speed, 1e-6);
  const velocityEnd = {
    x: primaryPoint.x + (primaryFrame.snapshot.vx / velocitySpeed) * velocityLength,
    y: primaryPoint.y - (primaryFrame.snapshot.vy / velocitySpeed) * velocityLength,
  };
  const previewBadge = graphPreview?.kind === "time" ? (
    <SimulationPreviewBadge tone="sky">
      {copyText(locale, "preview t =", "預覽 t =")} {formatNumber(displayTime)} s
    </SimulationPreviewBadge>
  ) : null;
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? getCompareSetupLabel(locale, "a"))}: M {formatNumber(frameA!.trajectory.params.sourceMass)} kg / r{" "}
        {formatNumber(frameA!.trajectory.params.orbitRadius)} m / T{" "}
        {formatNumber(frameA!.snapshot.referencePeriod)} s
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? getCompareSetupLabel(locale, "b"))}: M {formatNumber(frameB!.trajectory.params.sourceMass)} kg / r{" "}
        {formatNumber(frameB!.trajectory.params.orbitRadius)} m / T{" "}
        {formatNumber(frameB!.snapshot.referencePeriod)} s
      </span>
    </div>
  ) : null;
  const keplerRatio = resolveCircularOrbitKeplerRatio(
    primaryParams.sourceMass,
    primaryParams.orbitRadius,
  );
  const metricRows = [
    { label: copyText(locale, "M_source", "來源質量"), value: formatMeasurement(primaryParams.sourceMass, "kg") },
    { label: copyText(locale, "r_ref", "參考半徑"), value: formatMeasurement(primaryParams.orbitRadius, "m") },
    { label: copyText(locale, "v / v_c", "v / v_c"), value: formatNumber(primaryParams.speedFactor, 2) },
    { label: copyText(locale, "r_now", "目前半徑"), value: formatMeasurement(primaryFrame.snapshot.radius, "m") },
    { label: copyText(locale, "v_now", "目前速度"), value: formatMeasurement(primaryFrame.snapshot.speed, "m/s") },
    { label: copyText(locale, "v_c(ref)", "v_c(參考)"), value: formatMeasurement(primaryFrame.snapshot.referenceCircularSpeed, "m/s") },
    { label: copyText(locale, "g", "g"), value: formatMeasurement(primaryFrame.snapshot.gravityAcceleration, "m/s^2") },
    {
      label: copyText(locale, "v^2 / r", "v^2 / r"),
      value: formatMeasurement(primaryFrame.snapshot.requiredCentripetalAcceleration, "m/s^2"),
    },
    {
      label: copyText(locale, "T_circ", "圓軌道週期"),
      value: formatMeasurement(primaryFrame.snapshot.referencePeriod, "s"),
    },
    {
      label: copyText(locale, "T^2 / r^3", "T^2 / r^3"),
      value: formatMeasurement(keplerRatio, "s^2/m^3"),
    },
  ];
  const referenceCircleOpacity = resolveOverlayOpacity(
    focusedOverlayId,
    "referenceOrbit",
    0.38,
  );
  const radiusLineOpacity = resolveOverlayOpacity(focusedOverlayId, "radiusLine", 0.38);
  const velocityOpacity = resolveOverlayOpacity(focusedOverlayId, "velocityVector", 0.38);
  const gravityOpacity = resolveOverlayOpacity(focusedOverlayId, "gravityVector", 0.38);
  const trailOpacity = resolveOverlayOpacity(focusedOverlayId, "trail", 0.3);

  return (
    <SimulationSceneCard
      title={concept.title}
      description={copyText(
        locale,
        "Keep the speed factor at 1.00 to match the circular-orbit condition. Move away from 1.00 to see the same gravity law bend the path inward or let it drift outward.",
        "將速度因子保持在 1.00，便會符合圓軌道條件。偏離 1.00 時，同一條重力定律就會把路徑向內拉緊或向外張開。",
      )}
      headerClassName="bg-[linear-gradient(135deg,rgba(15,28,36,0.09),rgba(78,166,223,0.12))]"
      headerAside={
        <>
          <CompareLegend primaryLabel={primaryLabel} secondaryLabel={secondaryLabel} />
          {compareBadges}
          {previewBadge}
        </>
      }
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
      >
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.5)" />
        {CIRCULAR_ORBITS_RING_RADII.map((radius) => (
          <g key={`orbit-ring-${radius}`}>
            <circle
              cx={STAGE_CENTER_X}
              cy={STAGE_CENTER_Y}
              r={toRadiusPixels(radius)}
              fill="none"
              stroke="rgba(15,28,36,0.08)"
              strokeDasharray="8 8"
              strokeWidth="1.5"
            />
            <text
              x={STAGE_CENTER_X + toRadiusPixels(radius) + 8}
              y={STAGE_CENTER_Y - 8}
              className="fill-ink-500 text-[10px] font-semibold"
            >
              {radius} m
            </text>
          </g>
        ))}
        {secondaryFrame ? (
          <>
            <circle
              cx={STAGE_CENTER_X}
              cy={STAGE_CENTER_Y}
              r={secondarySourceRadius ?? primarySourceRadius}
              fill="none"
              stroke="rgba(15,28,36,0.46)"
              strokeDasharray="8 6"
              strokeWidth="2.2"
            />
            {showReferenceOrbit ? (
              <circle
                cx={STAGE_CENTER_X}
                cy={STAGE_CENTER_Y}
                r={toRadiusPixels(secondaryFrame.trajectory.params.orbitRadius)}
                fill="none"
                stroke="rgba(15,28,36,0.5)"
                strokeDasharray="8 7"
                strokeWidth="2.4"
                opacity={referenceCircleOpacity}
              />
            ) : null}
            {showTrail ? (
              <path
                d={buildTrailPath(secondaryFrame.trajectory, displayTime)}
                fill="none"
                stroke="rgba(15,28,36,0.42)"
                strokeDasharray="8 7"
                strokeWidth="2.2"
                opacity={trailOpacity}
              />
            ) : null}
            <circle
              cx={secondaryPoint?.x ?? primaryPoint.x}
              cy={secondaryPoint?.y ?? primaryPoint.y}
              r="9"
              fill="rgba(255,255,255,0.9)"
              stroke="rgba(15,28,36,0.55)"
              strokeDasharray="8 6"
              strokeWidth="2.4"
            />
          </>
        ) : null}
        <circle
          cx={STAGE_CENTER_X}
          cy={STAGE_CENTER_Y}
          r={primarySourceRadius}
          fill="rgba(15,28,36,0.14)"
          stroke="#0f1c24"
          strokeWidth="2.8"
        />
        <text
          x={STAGE_CENTER_X}
          y={STAGE_CENTER_Y + 4}
          textAnchor="middle"
          className="fill-ink-950 text-[12px] font-semibold"
        >
          M
        </text>
        {showReferenceOrbit ? (
          <circle
            cx={STAGE_CENTER_X}
            cy={STAGE_CENTER_Y}
            r={toRadiusPixels(primaryFrame.trajectory.params.orbitRadius)}
            fill="none"
            stroke="#f16659"
            strokeDasharray="10 8"
            strokeWidth="2.8"
            opacity={referenceCircleOpacity}
          />
        ) : null}
        {showTrail ? (
          <path
            d={buildTrailPath(primaryFrame.trajectory, displayTime)}
            fill="none"
            stroke="#1ea6a2"
            strokeWidth="2.8"
            opacity={trailOpacity}
          />
        ) : null}
        {showRadiusLine ? (
          <line
            x1={STAGE_CENTER_X}
            y1={STAGE_CENTER_Y}
            x2={primaryPoint.x}
            y2={primaryPoint.y}
            stroke="#f0ab3c"
            strokeWidth="3"
            opacity={radiusLineOpacity}
          />
        ) : null}
        {showVelocityVector ? (
          <>
            <line
              x1={primaryPoint.x}
              y1={primaryPoint.y}
              x2={velocityEnd.x}
              y2={velocityEnd.y}
              stroke="#4ea6df"
              strokeWidth={focusedOverlayId === "velocityVector" ? 4.8 : 3.8}
              strokeLinecap="round"
              opacity={velocityOpacity}
            />
            <text
              x={velocityEnd.x + 8}
              y={velocityEnd.y - 6}
              className="fill-sky-700 text-[11px] font-semibold"
            >
              v
            </text>
          </>
        ) : null}
        {showGravityVector ? (
          <>
            <line
              x1={primaryPoint.x}
              y1={primaryPoint.y}
              x2={gravityEnd.x}
              y2={gravityEnd.y}
              stroke="#1ea6a2"
              strokeWidth={focusedOverlayId === "gravityVector" ? 4.8 : 3.8}
              strokeLinecap="round"
              opacity={gravityOpacity}
            />
            <text
              x={gravityEnd.x - 14}
              y={gravityEnd.y - 8}
              className="fill-teal-700 text-[11px] font-semibold"
            >
              g
            </text>
          </>
        ) : null}
        <circle
          cx={primaryPoint.x}
          cy={primaryPoint.y}
          r="10"
          fill="#0f1c24"
          stroke="#f4f2eb"
          strokeWidth="2.4"
        />
        <text
          x={primaryPoint.x + 14}
          y={primaryPoint.y - 12}
          className="fill-ink-700 text-[11px] font-semibold"
        >
          {copyText(locale, "satellite", "衛星")}
        </text>
        <SimulationReadoutCard
          x={METRICS_CARD_X}
          y={METRICS_CARD_Y}
          width={METRICS_CARD_WIDTH}
          title={copyText(locale, "Orbit state", "軌道狀態")}
          setupLabel={compareEnabled ? primaryLabel : null}
          rows={metricRows}
          noteLines={[
            `${formatCircularOrbitStatus(primaryFrame.snapshot, primaryParams.speedFactor, locale)}: ${formatCircularOrbitTrend(primaryFrame.snapshot, primaryParams.speedFactor, locale)}`,
            locale === "zh-HK"
              ? `局部速度對照：${formatNumber(primaryFrame.snapshot.speed)} 對 ${formatNumber(primaryFrame.snapshot.localCircularSpeed)} m/s。`
              : `Local speed match: ${formatNumber(primaryFrame.snapshot.speed)} vs ${formatNumber(primaryFrame.snapshot.localCircularSpeed)} m/s.`,
            copyText(locale, "Displayed units use G = 1 for one-source gravity.", "顯示單位採用單一質量源重力模型下的 G = 1。"),
          ]}
        />
      </svg>
    </SimulationSceneCard>
  );
}
