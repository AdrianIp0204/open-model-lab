"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";
import {
  angleFromVector,
  clampProjectileTime,
  clamp,
  formatMeasurement,
  formatNumber,
  resolveProjectileParams,
  resolveProjectileViewport,
  sampleProjectileState,
  speedFromVector,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import { CompareLegend, resolveCompareScene, SimulationPreviewBadge } from "./primitives/compare";
import { resolveOverlayOpacity } from "./primitives/overlay";
import { SimulationSceneCard } from "./primitives/scene-card";
import { useSvgPointerDrag } from "./primitives/useSvgPointerDrag";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type ProjectileSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 760;
const HEIGHT = 264;
const GROUND_Y = 202;
const ORIGIN_X = 110;
const TRAJECTORY_WIDTH = 430;
const TRAJECTORY_HEIGHT = 148;
const VECTOR_SCALE = 6.1;
const MIN_ANGLE = 5;
const MAX_ANGLE = 85;
const MIN_SPEED = 6;
const MAX_SPEED = 24;
const METRICS_CARD_WIDTH = 176;
const METRICS_CARD_X = WIDTH - METRICS_CARD_WIDTH - 20;
const METRICS_CARD_Y = 16;

function roundTo(value: number, precision = 1) {
  return Number(value.toFixed(precision));
}

type PlotLayout = {
  scale: number;
};

function resolvePlotLayout(maxRange: number, maxHeight: number): PlotLayout {
  const safeRange = Math.max(maxRange, 1);
  const safeHeight = Math.max(maxHeight, 1);
  return {
    scale: Math.min(TRAJECTORY_WIDTH / safeRange, TRAJECTORY_HEIGHT / safeHeight),
  };
}

function toSvgPoint(x: number, y: number, layout: PlotLayout) {
  return {
    svgX: ORIGIN_X + x * layout.scale,
    svgY: GROUND_Y - y * layout.scale,
  };
}

function resolveProjectileFrame(source: SimulationParams, time: number) {
  const projectileParams = resolveProjectileParams({
    speed: typeof source.speed === "number" ? source.speed : undefined,
    launchSpeed: typeof source.launchSpeed === "number" ? source.launchSpeed : undefined,
    angle: typeof source.angle === "number" ? source.angle : undefined,
    launchAngle: typeof source.launchAngle === "number" ? source.launchAngle : undefined,
    gravity: typeof source.gravity === "number" ? source.gravity : undefined,
    launchHeight: typeof source.launchHeight === "number" ? source.launchHeight : undefined,
  });
  const displayTime = clampProjectileTime(projectileParams, time);
  const state = sampleProjectileState(projectileParams, displayTime);
  const launchRad = (projectileParams.launchAngle * Math.PI) / 180;
  const vectorLength = clamp(
    projectileParams.launchSpeed * VECTOR_SCALE,
    MIN_SPEED * VECTOR_SCALE,
    MAX_SPEED * VECTOR_SCALE,
  );
  const handleX = ORIGIN_X + Math.cos(launchRad) * vectorLength;
  const handleY = GROUND_Y - Math.sin(launchRad) * vectorLength;
  const apexTime = Math.max(0, (projectileParams.launchSpeed * Math.sin(launchRad)) / projectileParams.gravity);
  const apexSnapshot = sampleProjectileState(projectileParams, apexTime);

  return {
    projectileParams,
    displayTime,
    state,
    launchRad,
    vectorLength,
    handleX,
    handleY,
    apexSnapshot,
  };
}

export function ProjectileSimulation({
  concept,
  params,
  time,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: ProjectileSimulationProps) {
  const t = useTranslations("ProjectileSimulation");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const displayTime = graphPreview?.kind === "time" || graphPreview?.kind === "trajectory" ? graphPreview.time : time;
  const activeFrame = resolveProjectileFrame(params, displayTime);
  const compareAFrame = compare ? resolveProjectileFrame(compare.setupA, displayTime) : null;
  const compareBFrame = compare ? resolveProjectileFrame(compare.setupB, displayTime) : null;
  const { compareEnabled, primaryFrame, secondaryFrame, primaryLabel, secondaryLabel } =
    resolveCompareScene({
      compare,
      graphPreview,
      activeFrame,
      frameA: compareAFrame,
      frameB: compareBFrame,
      liveLabel: t("labels.live"),
    });
  const activeLabel = primaryLabel;
  const compareLabel = secondaryLabel ?? "";
  const previewBadge =
    graphPreview && (graphPreview.kind === "time" || graphPreview.kind === "trajectory") ? (
      <SimulationPreviewBadge tone="sky">
        {t("preview.time", {
          label: graphPreview.seriesLabel,
          time: formatNumber(displayTime),
        })}
      </SimulationPreviewBadge>
    ) : graphPreview ? (
      <SimulationPreviewBadge>
        {t("preview.default", { label: graphPreview.seriesLabel })}
      </SimulationPreviewBadge>
    ) : null;
  const viewport = resolveProjectileViewport(
    secondaryFrame
      ? [primaryFrame.projectileParams, secondaryFrame.projectileParams]
      : [primaryFrame.projectileParams],
  );
  const plotLayout = resolvePlotLayout(viewport.maxRange, viewport.maxHeight);
  const plotRightX = ORIGIN_X + viewport.maxRange * plotLayout.scale;
  const plotTopY = GROUND_Y - viewport.maxHeight * plotLayout.scale;
  const rangeTicks = Array.from({ length: 5 }, (_, index) => (viewport.maxRange * index) / 4);
  const heightTicks = Array.from({ length: 5 }, (_, index) => (viewport.maxHeight * index) / 4);
  const points = Array.from({ length: 120 }, (_, index) => {
    const sampleTime = (primaryFrame.state.timeOfFlight * index) / 119;
    const snapshot = sampleProjectileState(primaryFrame.projectileParams, sampleTime);
    return toSvgPoint(snapshot.x, Math.max(0, snapshot.y), plotLayout);
  });
  const comparePoints = secondaryFrame
    ? Array.from({ length: 120 }, (_, index) => {
        const sampleTime = (secondaryFrame.state.timeOfFlight * index) / 119;
        const snapshot = sampleProjectileState(secondaryFrame.projectileParams, sampleTime);
        return toSvgPoint(snapshot.x, Math.max(0, snapshot.y), plotLayout);
      })
    : null;
  const current = toSvgPoint(Math.max(0, primaryFrame.state.x), Math.max(0, primaryFrame.state.y), plotLayout);
  const compareCurrent = secondaryFrame
    ? toSvgPoint(Math.max(0, secondaryFrame.state.x), Math.max(0, secondaryFrame.state.y), plotLayout)
    : null;
  const showVectors = overlayValues?.velocityVector ?? true;
  const showComponents = overlayValues?.componentVectors ?? true;
  const showApexMarker = overlayValues?.apexMarker ?? true;
  const showRangeMarker = overlayValues?.rangeMarker ?? true;
  const apexPoint = toSvgPoint(primaryFrame.apexSnapshot.x, Math.max(0, primaryFrame.apexSnapshot.y), plotLayout);
  const compareApexPoint = secondaryFrame
    ? toSvgPoint(secondaryFrame.apexSnapshot.x, Math.max(0, secondaryFrame.apexSnapshot.y), plotLayout)
    : null;
  const overlayWeight = (overlayId: string) =>
    resolveOverlayOpacity(focusedOverlayId, overlayId, 0.42);
  const metricRows = [
    { label: t("metrics.range"), value: formatMeasurement(primaryFrame.state.range, "m") },
    { label: t("metrics.maxHeight"), value: formatMeasurement(primaryFrame.state.maxHeight, "m") },
    {
      label: t("metrics.flightTime"),
      value: formatMeasurement(primaryFrame.state.timeOfFlight, "s"),
    },
    {
      label: t("metrics.launchAngle"),
      value: formatMeasurement(primaryFrame.projectileParams.launchAngle, "deg"),
    },
  ];

  function updateLaunchFromSvg(svgX: number, svgY: number) {
    const dx = clamp(svgX - ORIGIN_X, 6, MAX_SPEED * VECTOR_SCALE);
    const dy = clamp(GROUND_Y - svgY, 0, MAX_SPEED * VECTOR_SCALE);
    const nextAngle = clamp(angleFromVector(dx, dy), MIN_ANGLE, MAX_ANGLE);
    const nextSpeed = clamp(speedFromVector(dx, dy) / VECTOR_SCALE, MIN_SPEED, MAX_SPEED);

    setParam("angle", roundTo(nextAngle, 1));
    setParam("speed", roundTo(nextSpeed, 1));
  }

  function adjustLaunch(deltaAngle: number, deltaSpeed: number) {
    setParam("angle", roundTo(clamp(activeFrame.projectileParams.launchAngle + deltaAngle, MIN_ANGLE, MAX_ANGLE), 1));
    setParam("speed", roundTo(clamp(activeFrame.projectileParams.launchSpeed + deltaSpeed, MIN_SPEED, MAX_SPEED), 1));
  }
  const drag = useSvgPointerDrag<"launch">({
    svgRef,
    width: WIDTH,
    height: HEIGHT,
    onDrag: (_target, location) => updateLaunchFromSvg(location.svgX, location.svgY),
  });

  return (
    <SimulationSceneCard
      title={t("header.title")}
      description={t("header.description", {
        target: compareEnabled ? primaryLabel : t("header.launchVector"),
      })}
      headerClassName="bg-[linear-gradient(135deg,rgba(78,166,223,0.08),rgba(241,102,89,0.05))]"
      headerAside={
        <>
          <CompareLegend primaryLabel={activeLabel} secondaryLabel={compareEnabled ? compareLabel : null} />
          {previewBadge}
        </>
      }
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
        style={{ touchAction: "none", userSelect: "none" }}
        onPointerMove={(event) => {
          drag.handlePointerMove(event.pointerId, event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          drag.handlePointerUp(event.pointerId);
        }}
        onPointerCancel={(event) => {
          drag.handlePointerCancel(event.pointerId);
        }}
        onLostPointerCapture={drag.handleLostPointerCapture}
      >
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.5)" />
        <line x1="60" x2="700" y1={GROUND_Y} y2={GROUND_Y} stroke="rgba(15,28,36,0.2)" strokeWidth="3" />
        {rangeTicks.map((tick) => {
          const x = ORIGIN_X + tick * plotLayout.scale;
          return (
            <g key={`projectile-range-${tick}`}>
              <line
                x1={x}
                x2={x}
                y1={plotTopY}
                y2={GROUND_Y}
                stroke={tick === 0 ? "rgba(15,28,36,0.18)" : "rgba(15,28,36,0.08)"}
                strokeDasharray={tick === 0 ? "10 8" : "4 10"}
                strokeWidth={tick === 0 ? "2" : "1.5"}
              />
              <line x1={x} x2={x} y1={GROUND_Y} y2={GROUND_Y + 7} stroke="rgba(15,28,36,0.28)" strokeWidth="1.5" />
              <text x={x} y={GROUND_Y + 22} textAnchor="middle" className="fill-ink-500 text-[11px] font-medium">
                {formatNumber(tick)}
              </text>
            </g>
          );
        })}
        {heightTicks.map((tick) => {
          const y = GROUND_Y - tick * plotLayout.scale;
          return (
            <g key={`projectile-height-${tick}`}>
              <line
                x1={ORIGIN_X}
                x2={plotRightX}
                y1={y}
                y2={y}
                stroke={tick === 0 ? "rgba(15,28,36,0.18)" : "rgba(15,28,36,0.08)"}
                strokeDasharray={tick === 0 ? "10 8" : "4 10"}
                strokeWidth={tick === 0 ? "2" : "1.5"}
              />
              <line x1={ORIGIN_X - 7} x2={ORIGIN_X} y1={y} y2={y} stroke="rgba(15,28,36,0.28)" strokeWidth="1.5" />
              <text x={ORIGIN_X - 12} y={y + 4} textAnchor="end" className="fill-ink-500 text-[11px] font-medium">
                {formatNumber(tick)}
              </text>
            </g>
          );
        })}
        <text x={plotRightX} y={GROUND_Y + 40} textAnchor="end" className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]">
          {t("axes.distance")}
        </text>
        <text x="28" y={plotTopY + 14} className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]">
          {t("axes.height")}
        </text>
        {compareEnabled && comparePoints ? (
          <path
            d={comparePoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.svgX.toFixed(2)} ${point.svgY.toFixed(2)}`).join(" ")}
            fill="none"
            stroke="#4ea6df"
            strokeDasharray="10 8"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.92"
          />
        ) : null}
        <path
          d={points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.svgX.toFixed(2)} ${point.svgY.toFixed(2)}`).join(" ")}
          fill="none"
          stroke="#1ea6a2"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {showRangeMarker ? (
          <>
            <line
              x1={ORIGIN_X}
              x2={toSvgPoint(primaryFrame.state.range, 0, plotLayout).svgX}
              y1={GROUND_Y + 18}
              y2={GROUND_Y + 18}
              stroke="rgba(15,28,36,0.2)"
              strokeWidth="2"
              strokeDasharray="8 8"
              strokeOpacity={overlayWeight("rangeMarker")}
            />
            <line
              x1={toSvgPoint(primaryFrame.state.range, 0, plotLayout).svgX}
              x2={toSvgPoint(primaryFrame.state.range, 0, plotLayout).svgX}
              y1={GROUND_Y + 6}
              y2={GROUND_Y + 28}
              stroke="#f0ab3c"
              strokeWidth={focusedOverlayId === "rangeMarker" ? "4" : "3"}
              strokeOpacity={overlayWeight("rangeMarker")}
            />
          </>
        ) : null}
        {showApexMarker ? (
          <>
            <circle cx={apexPoint.svgX} cy={apexPoint.svgY} r={focusedOverlayId === "apexMarker" ? "9" : "8"} fill="#f16659" fillOpacity={overlayWeight("apexMarker")} />
            <text x={apexPoint.svgX + 14} y={apexPoint.svgY - 8} className={`text-[12px] font-semibold ${focusedOverlayId === "apexMarker" ? "fill-coral-700" : "fill-coral-600"}`}>
              {t("markers.apex")}
            </text>
          </>
        ) : null}
        {compareEnabled && secondaryFrame && compareCurrent ? (
          <g pointerEvents="none">
            <circle cx={compareCurrent.svgX} cy={compareCurrent.svgY} r="18" fill="rgba(15,28,36,0.08)" stroke="rgba(78,166,223,0.72)" strokeDasharray="8 8" strokeWidth="3" strokeOpacity={overlayWeight("velocityVector")} />
            <circle cx={compareCurrent.svgX} cy={compareCurrent.svgY} r="7" fill="#f4f2eb" stroke="rgba(78,166,223,0.72)" strokeWidth="2" strokeOpacity={overlayWeight("velocityVector")} />
            <line
              x1={ORIGIN_X}
              x2={secondaryFrame.handleX}
              y1={GROUND_Y}
              y2={secondaryFrame.handleY}
              stroke="rgba(78,166,223,0.8)"
              strokeDasharray="8 8"
              strokeWidth="4"
              strokeLinecap="round"
              strokeOpacity={overlayWeight("velocityVector")}
            />
            <circle cx={secondaryFrame.handleX} cy={secondaryFrame.handleY} r={focusedOverlayId === "velocityVector" ? "12" : "11"} fill="rgba(244,242,235,0.95)" stroke="rgba(78,166,223,0.72)" strokeWidth="3" strokeOpacity={overlayWeight("velocityVector")} />
            <text x={compareCurrent.svgX + 14} y={compareCurrent.svgY - 12} className={`text-[12px] font-semibold ${focusedOverlayId === "velocityVector" ? "fill-sky-600" : "fill-sky-500"}`}>
              {secondaryLabel}
            </text>
          </g>
        ) : null}
        <circle cx={current.svgX} cy={current.svgY} r="20" fill="#0f1c24" stroke="#f0ab3c" strokeWidth="4" />
        <circle cx={current.svgX} cy={current.svgY} r="8" fill="#f4f2eb" />
        <g
          tabIndex={0}
          role="button"
          aria-label={t("aria.launchVector", { label: activeLabel })}
          onPointerDown={(event) => {
            event.preventDefault();
            drag.startDrag(event.pointerId, "launch", event.clientX, event.clientY);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              adjustLaunch(-1, -0.5);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              adjustLaunch(1, 0.5);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              adjustLaunch(1.5, 0.5);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              adjustLaunch(-1.5, -0.5);
            }
          }}
          style={{ cursor: drag.activePointerId === null ? "grab" : "grabbing" }}
        >
          <line
            x1={ORIGIN_X}
            x2={primaryFrame.handleX}
            y1={GROUND_Y}
            y2={primaryFrame.handleY}
            stroke="rgba(240,171,60,0.001)"
            strokeWidth="28"
            strokeLinecap="round"
            opacity={overlayWeight("velocityVector")}
          />
          <circle cx={primaryFrame.handleX} cy={primaryFrame.handleY} r="22" fill="rgba(240,171,60,0.001)" fillOpacity={overlayWeight("velocityVector")} />
          <circle cx={ORIGIN_X} cy={GROUND_Y} r="14" fill="#f16659" />
          <line
            x1={ORIGIN_X}
            x2={primaryFrame.handleX}
            y1={GROUND_Y}
            y2={primaryFrame.handleY}
            stroke="#f0ab3c"
            strokeWidth={focusedOverlayId === "velocityVector" ? "6" : "5"}
            strokeLinecap="round"
            strokeOpacity={overlayWeight("velocityVector")}
          />
          <circle cx={primaryFrame.handleX} cy={primaryFrame.handleY} r={focusedOverlayId === "velocityVector" ? "13" : "12"} fill="#f4f2eb" stroke="#f0ab3c" strokeWidth="3" strokeOpacity={overlayWeight("velocityVector")} />
          <polygon
            points={`${
              primaryFrame.handleX + Math.cos(primaryFrame.launchRad) * 14
            },${primaryFrame.handleY - Math.sin(primaryFrame.launchRad) * 14} ${
              primaryFrame.handleX - Math.cos(primaryFrame.launchRad) * 7 - Math.sin(primaryFrame.launchRad) * 6
            },${primaryFrame.handleY + Math.sin(primaryFrame.launchRad) * 7 - Math.cos(primaryFrame.launchRad) * 6} ${
              primaryFrame.handleX - Math.cos(primaryFrame.launchRad) * 7 + Math.sin(primaryFrame.launchRad) * 6
            },${primaryFrame.handleY + Math.sin(primaryFrame.launchRad) * 7 + Math.cos(primaryFrame.launchRad) * 6}`}
            fill="#f0ab3c"
          />
          {compareEnabled ? (
            <text x={primaryFrame.handleX + 14} y={primaryFrame.handleY - 14} className={`text-[12px] font-semibold ${focusedOverlayId === "velocityVector" ? "fill-amber-700" : "fill-amber-600"}`}>
              {primaryLabel}
            </text>
          ) : null}
        </g>
        {showVectors ? (
          <>
            <line
              x1={current.svgX}
              x2={current.svgX + primaryFrame.state.vx * 12}
              y1={current.svgY}
              y2={current.svgY}
              stroke="#4ea6df"
              strokeWidth="4"
              strokeLinecap="round"
              strokeOpacity={overlayWeight("velocityVector")}
            />
            <polygon
              points={`${current.svgX + primaryFrame.state.vx * 12 + 10},${current.svgY} ${
                current.svgX + primaryFrame.state.vx * 12 - 4
              },${current.svgY - 8} ${current.svgX + primaryFrame.state.vx * 12 - 4},${current.svgY + 8}`}
              fill="#4ea6df"
              fillOpacity={overlayWeight("velocityVector")}
            />
            <line
              x1={current.svgX}
              x2={current.svgX}
              y1={current.svgY}
              y2={current.svgY - primaryFrame.state.vy * 12}
              stroke="#f16659"
              strokeWidth="4"
              strokeLinecap="round"
              strokeOpacity={overlayWeight("velocityVector")}
            />
            <polygon
              points={`${current.svgX},${current.svgY - primaryFrame.state.vy * 12 - 10} ${current.svgX - 8},${current.svgY - primaryFrame.state.vy * 12 + 4} ${current.svgX + 8},${current.svgY - primaryFrame.state.vy * 12 + 4}`}
              fill="#f16659"
              fillOpacity={overlayWeight("velocityVector")}
            />
          </>
        ) : null}
        {showComponents ? (
          <>
            <line x1="124" x2="252" y1="62" y2="62" stroke="#4ea6df" strokeWidth={focusedOverlayId === "componentVectors" ? "5" : "4"} strokeLinecap="round" strokeOpacity={overlayWeight("componentVectors")} />
            <text x="268" y="66" className={`text-[12px] ${focusedOverlayId === "componentVectors" ? "fill-sky-600 font-semibold" : "fill-ink-500"}`}>
              vx {formatMeasurement(primaryFrame.state.vx, "m/s")}
            </text>
            <line x1="124" x2="124" y1="92" y2="20" stroke="#f16659" strokeWidth={focusedOverlayId === "componentVectors" ? "5" : "4"} strokeLinecap="round" strokeOpacity={overlayWeight("componentVectors")} />
            <text x="140" y="26" className={`text-[12px] ${focusedOverlayId === "componentVectors" ? "fill-coral-700 font-semibold" : "fill-ink-500"}`}>
              vy {formatMeasurement(primaryFrame.state.vy, "m/s")}
            </text>
          </>
        ) : null}
        <SimulationReadoutCard
          x={METRICS_CARD_X}
          y={METRICS_CARD_Y}
          width={METRICS_CARD_WIDTH}
          title={t("readout.title")}
          setupLabel={compareEnabled ? activeLabel : undefined}
          rows={metricRows}
          noteLines={[
            t("readout.note", {
              time: formatNumber(displayTime),
            }),
          ]}
        />
        {compareEnabled && compareCurrent ? (
          <>
            <text x={compareCurrent.svgX + 12} y={compareCurrent.svgY - 14} className={`text-[12px] font-semibold ${focusedOverlayId === "velocityVector" ? "fill-sky-600" : "fill-sky-500"}`}>
              {compareLabel}
            </text>
            <text x={compareApexPoint ? compareApexPoint.svgX + 14 : compareCurrent.svgX + 12} y={compareApexPoint ? compareApexPoint.svgY - 8 : compareCurrent.svgY - 26} className={`text-[12px] font-semibold ${focusedOverlayId === "apexMarker" ? "fill-sky-600" : "fill-sky-500"}`}>
              {t("markers.apex")}
            </text>
          </>
        ) : null}
      </svg>
    </SimulationSceneCard>
  );
}
