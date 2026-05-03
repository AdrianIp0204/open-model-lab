"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  clamp,
  formatMeasurement,
  formatNumber,
  phaseFromDisplacement,
  resolveAngularFrequency,
  resolveSpringConstant,
  safeNumber,
  sampleShmState,
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

type SHMSimulationProps = {
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
const TRACK_Y = 150;
const DISPLACEMENT_SCALE = 58;
const MAX_VISIBLE_DISPLACEMENT = 3.2;
const SCALE_TICKS = [-3, -2, -1, 0, 1, 2, 3];
const METRICS_CARD_WIDTH = 196;
const METRICS_CARD_X = WIDTH - METRICS_CARD_WIDTH - 18;
const METRICS_CARD_Y = 18;
const ENERGY_CARD_X = 18;
const ENERGY_CARD_Y = 18;
const ENERGY_CARD_WIDTH = 212;
const MASS_HALF_WIDTH = 46;
const MASS_GUIDE_HALF_WIDTH = 50;
const MASS_AXIS_Y_OFFSET = -2;

function displacementToX(displacement: number) {
  return clamp(
    WIDTH / 2 + displacement * DISPLACEMENT_SCALE,
    WIDTH / 2 - MAX_VISIBLE_DISPLACEMENT * DISPLACEMENT_SCALE,
    WIDTH / 2 + MAX_VISIBLE_DISPLACEMENT * DISPLACEMENT_SCALE,
  );
}

function readOptionalNumber(source: SimulationParams, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

type OscillatorFrame = {
  amplitude: number;
  equilibriumShift: number;
  omega: number;
  springConstant: number;
  mass: number;
  snapshot: ReturnType<typeof sampleShmState>;
  centerX: number;
  blockX: number;
  envelope: number;
  visibleAmplitude: number;
  turningLeftX: number;
  turningRightX: number;
  relativeDisplacement: number;
};

function buildOscillatorFrame(source: SimulationParams, time: number) {
  const amplitude = Math.max(0.001, safeNumber(source.amplitude, 1));
  const equilibriumShift = safeNumber(source.equilibriumShift, 0);
  const mass = Math.max(0.001, safeNumber(source.mass, 1));
  const springConstantInput = readOptionalNumber(source, "springConstant");
  const omega = resolveAngularFrequency({
    amplitude,
    angularFrequency: readOptionalNumber(source, "omega", "angularFrequency"),
    springConstant: springConstantInput,
    mass,
    phase: safeNumber(source.phase, 0),
    equilibriumShift,
    damping: safeNumber(source.damping, 0),
  });
  const springConstant = resolveSpringConstant({
    amplitude,
    angularFrequency: readOptionalNumber(source, "omega", "angularFrequency"),
    springConstant: springConstantInput,
    mass,
    phase: safeNumber(source.phase, 0),
    equilibriumShift,
    damping: safeNumber(source.damping, 0),
  });
  const snapshot = sampleShmState(
    {
      amplitude,
      angularFrequency: readOptionalNumber(source, "omega", "angularFrequency"),
      springConstant,
      phase: safeNumber(source.phase, 0),
      equilibriumShift,
      damping: safeNumber(source.damping, 0),
      mass,
    },
    time,
  );
  const centerX = displacementToX(equilibriumShift);
  const blockX = displacementToX(snapshot.displacement);
  const damping = safeNumber(source.damping, 0);
  const envelope = damping > 0 ? Math.exp(-damping * time) : 1;
  const visibleAmplitude = amplitude * envelope;
  const turningLeftX = displacementToX(equilibriumShift - visibleAmplitude);
  const turningRightX = displacementToX(equilibriumShift + visibleAmplitude);

  return {
    amplitude,
    equilibriumShift,
    omega,
    springConstant,
    mass,
    snapshot,
    centerX,
    blockX,
    envelope,
    visibleAmplitude,
    turningLeftX,
    turningRightX,
    relativeDisplacement: snapshot.displacement - equilibriumShift,
  };
}

function renderTurningPointMarkers(
  frame: OscillatorFrame,
  laneY: number,
  stroke: string,
  options?: {
    dashed?: boolean;
    overlayOpacity?: number;
    label?: string;
  },
) {
  const overlayOpacity = options?.overlayOpacity ?? 1;

  return (
    <g pointerEvents="none" opacity={overlayOpacity}>
      {[frame.turningLeftX, frame.turningRightX].map((x, index) => (
        <g key={`${laneY}-${index}-${x}`}>
          <line
            x1={x}
            x2={x}
            y1={laneY - 56}
            y2={laneY + 56}
            stroke={stroke}
            strokeWidth="2"
            strokeDasharray={options?.dashed ? "8 6" : "6 6"}
          />
          <circle
            cx={x}
            cy={laneY}
            r="5"
            fill="rgba(255,253,247,0.96)"
            stroke={stroke}
            strokeWidth="2"
          />
          {options?.label ? (
            <text
              x={x}
              y={laneY - 66}
              textAnchor="middle"
              className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
            >
              {index === 0 ? `-${options.label}` : `+${options.label}`}
            </text>
          ) : null}
        </g>
      ))}
    </g>
  );
}

function renderEnergyBarsCard(
  frame: OscillatorFrame,
  title: string,
  totalLabel: string,
  overlayOpacity = 1,
) {
  const total = Math.max(frame.snapshot.energy.total, 0.0001);
  const kineticRatio = clamp(frame.snapshot.energy.kinetic / total, 0, 1);
  const potentialRatio = clamp(frame.snapshot.energy.potential / total, 0, 1);
  const barX = 60;
  const barWidth = ENERGY_CARD_WIDTH - 114;
  const rowHeight = 18;

  return (
    <g transform={`translate(${ENERGY_CARD_X} ${ENERGY_CARD_Y})`} pointerEvents="none" opacity={overlayOpacity}>
      <rect
        x="0"
        y="0"
        width={ENERGY_CARD_WIDTH}
        height="72"
        rx="18"
        fill="rgba(255,253,247,0.94)"
        stroke="rgba(15,28,36,0.12)"
        strokeWidth="1.5"
      />
      <text x="14" y="20" className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]">
        {title}
      </text>
      {[
        {
          id: "kinetic",
          label: "K",
          value: frame.snapshot.energy.kinetic,
          ratio: kineticRatio,
          color: "#1ea6a2",
        },
        {
          id: "potential",
          label: "U",
          value: frame.snapshot.energy.potential,
          ratio: potentialRatio,
          color: "#f0ab3c",
        },
      ].map((row, index) => {
        const y = 32 + index * rowHeight;
        return (
          <g key={row.id}>
            <text x="14" y={y + 8} className="fill-ink-700 text-[11px] font-semibold uppercase tracking-[0.16em]">
              {row.label}
            </text>
            <rect
              x={barX}
              y={y}
              width={barWidth}
              height="8"
              rx="999"
              fill="rgba(15,28,36,0.08)"
            />
            <rect
              x={barX}
              y={y}
              width={row.ratio > 0 ? Math.max(4, row.ratio * barWidth) : 0}
              height="8"
              rx="999"
              fill={row.color}
            />
            <text
              x={ENERGY_CARD_WIDTH - 12}
              y={y + 8}
              textAnchor="end"
              className="fill-ink-950 text-[11px] font-semibold"
            >
              {formatMeasurement(row.value, "J")}
            </text>
          </g>
        );
      })}
      <text x="14" y="64" className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]">
        {totalLabel}
      </text>
      <text x={ENERGY_CARD_WIDTH - 12} y="64" textAnchor="end" className="fill-ink-950 text-[11px] font-semibold">
        {formatMeasurement(frame.snapshot.energy.total, "J")}
      </text>
    </g>
  );
}

export function SHMSimulation({
  concept,
  params,
  time,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: SHMSimulationProps) {
  const t = useTranslations("SHMSimulation");
  const [dragging, setDragging] = useState(false);
  const displayTime = graphPreview?.kind === "time" || graphPreview?.kind === "trajectory" ? graphPreview.time : time;
  const activeFrame = buildOscillatorFrame(params, displayTime);
  const compareAFrame = compare ? buildOscillatorFrame(compare.setupA, displayTime) : null;
  const compareBFrame = compare ? buildOscillatorFrame(compare.setupB, displayTime) : null;
  const compareEnabled = Boolean(compare);
  const primaryTarget = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const primaryFrame = compare ? (primaryTarget === "a" ? compareAFrame! : compareBFrame!) : activeFrame;
  const secondaryFrame = compare
    ? primaryTarget === "a"
      ? compareBFrame!
      : compareAFrame!
    : activeFrame;
  const primaryLabel = compare
    ? primaryTarget === "a"
      ? compare.labelA ?? "A"
      : compare.labelB ?? "B"
    : t("labels.live");
  const activeLabel = primaryLabel;
  const secondaryLabel = compare
    ? primaryTarget === "a"
      ? compare.labelB ?? "B"
      : compare.labelA ?? "A"
    : "";
  const energyOverlayAvailable =
    concept.simulation.overlays?.some((overlay) => overlay.id === "energyBars") ?? false;
  const showEquilibriumLine = overlayValues?.equilibriumLine ?? true;
  const showMotionTrail = overlayValues?.motionTrail ?? true;
  const showVelocityVector = overlayValues?.velocityVector ?? true;
  const showAccelerationVector = overlayValues?.accelerationVector ?? false;
  const showTurningPoints = overlayValues?.turningPoints ?? false;
  const showEnergyBars = overlayValues?.energyBars ?? false;
  const overlayWeight = (overlayId: string) => {
    if (!focusedOverlayId) {
      return 1;
    }
    return focusedOverlayId === overlayId ? 1 : 0.42;
  };
  const activeLaneY = compareEnabled ? 102 : TRACK_Y;
  const compareLaneY = compareEnabled ? 184 : TRACK_Y;
  const previewBadge =
    graphPreview && (graphPreview.kind === "time" || graphPreview.kind === "trajectory") ? (
      <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">
        {t("preview.time", {
          label: graphPreview.seriesLabel,
          time: formatNumber(displayTime),
        })}
      </span>
    ) : graphPreview ? (
      <span className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral-700">
        {t("preview.default", { label: graphPreview.seriesLabel })}
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
  const metricRows = [
    ...(energyOverlayAvailable
      ? [
          {
            label: t("metrics.displacement"),
            value: formatMeasurement(primaryFrame.snapshot.displacement, "m"),
          },
          {
            label: t("metrics.speed"),
            value: formatMeasurement(Math.abs(primaryFrame.snapshot.velocity), "m/s"),
          },
          {
            label: t("metrics.total"),
            value: formatMeasurement(primaryFrame.snapshot.energy.total, "J"),
          },
        ]
      : [
          {
            label: t("metrics.displacement"),
            value: formatMeasurement(primaryFrame.snapshot.displacement, "m"),
          },
          {
            label: t("metrics.velocity"),
            value: formatMeasurement(primaryFrame.snapshot.velocity, "m/s"),
          },
          {
            label: t("metrics.period"),
            value: formatMeasurement((Math.PI * 2) / Math.max(primaryFrame.omega, 0.001), "s"),
          },
        ]),
  ];

  function updateFromClientX(clientX: number, bounds: DOMRect) {
    const svgX = ((clientX - bounds.left) / bounds.width) * WIDTH;
    const absoluteDisplacement = clamp(
      (svgX - WIDTH / 2) / DISPLACEMENT_SCALE,
      activeFrame.equilibriumShift - activeFrame.amplitude,
      activeFrame.equilibriumShift + activeFrame.amplitude,
    );
    const relativeDisplacement = absoluteDisplacement - activeFrame.equilibriumShift;
    const nextPhase = phaseFromDisplacement(relativeDisplacement, activeFrame.amplitude, time, activeFrame.omega);
    setParam("phase", Number(nextPhase.toFixed(3)));
  }

  function adjustPhase(delta: number) {
    const nextPhase = (safeNumber(params.phase, 0) + delta) % (Math.PI * 2);
    setParam("phase", Number((nextPhase < 0 ? nextPhase + Math.PI * 2 : nextPhase).toFixed(3)));
  }

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(30,166,162,0.08),rgba(240,171,60,0.06))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="lab-label">{concept.title}</p>
          <div className="flex flex-wrap items-center gap-3">
            {compareLegend}
            {previewBadge}
            <p className="text-xs text-ink-700">
              {t("header.instruction", {
                target: compareEnabled ? primaryLabel : t("labels.mass"),
              })}
            </p>
          </div>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
        onPointerMove={(event) => {
          if (!dragging) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          updateFromClientX(event.clientX, bounds);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => setDragging(false)}
      >
        <defs>
          <linearGradient id="shm-track" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#1ea6a2" />
            <stop offset="100%" stopColor="#f0ab3c" />
          </linearGradient>
          <linearGradient id="shm-track-compare" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#4ea6df" />
            <stop offset="100%" stopColor="#f16659" />
          </linearGradient>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.5)" />
        {SCALE_TICKS.map((tick) => {
          const x = displacementToX(tick);
          return (
            <g key={`shm-scale-${tick}`}>
              <line
                x1={x}
                x2={x}
                y1={28}
                y2={HEIGHT - 36}
                stroke={tick === 0 ? "rgba(15,28,36,0.18)" : "rgba(15,28,36,0.08)"}
                strokeDasharray={tick === 0 ? "10 8" : "4 10"}
                strokeWidth={tick === 0 ? "2" : "1.5"}
              />
              <text x={x} y={HEIGHT - 18} textAnchor="middle" className="fill-ink-500 text-[11px] font-medium">
                {tick}
              </text>
            </g>
          );
        })}
        <text x="52" y={HEIGHT - 18} className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]">
          {t("stage.scale")}
        </text>
        {compareEnabled ? (
          <>
            <line x1="40" x2={WIDTH - 40} y1={activeLaneY} y2={activeLaneY} stroke="rgba(15,28,36,0.16)" strokeWidth="3" />
            <line x1="40" x2={WIDTH - 40} y1={compareLaneY} y2={compareLaneY} stroke="rgba(15,28,36,0.16)" strokeWidth="3" />
          </>
        ) : (
          <line x1="40" x2={WIDTH - 40} y1={TRACK_Y} y2={TRACK_Y} stroke="rgba(15,28,36,0.2)" strokeWidth="3" />
        )}
        {showEnergyBars
          ? renderEnergyBarsCard(
              primaryFrame,
              compareEnabled ? t("energy.titleForLabel", { label: primaryLabel }) : t("energy.title"),
              t("energy.total"),
              overlayWeight("energyBars"),
            )
          : null}
        {compareEnabled ? (
          <>
            {showEquilibriumLine ? (
              <>
                <line x1={primaryFrame.centerX} x2={primaryFrame.centerX} y1={28} y2={HEIGHT - 116} stroke="rgba(30,166,162,0.24)" strokeDasharray="8 8" strokeOpacity={overlayWeight("equilibriumLine")} />
                <line x1={secondaryFrame.centerX} x2={secondaryFrame.centerX} y1={110} y2={HEIGHT - 24} stroke="rgba(78,166,223,0.24)" strokeDasharray="8 8" strokeOpacity={overlayWeight("equilibriumLine")} />
                <text x={primaryFrame.centerX + 10} y={36} className={`text-[12px] font-semibold ${focusedOverlayId === "equilibriumLine" ? "fill-teal-700" : "fill-teal-600"}`}>
                  {primaryLabel}
                </text>
                <text x={secondaryFrame.centerX + 10} y={118} className={`text-[12px] font-semibold ${focusedOverlayId === "equilibriumLine" ? "fill-sky-600" : "fill-sky-500"}`}>
                  {secondaryLabel}
                </text>
              </>
            ) : null}
            {showTurningPoints
              ? renderTurningPointMarkers(primaryFrame, activeLaneY, "rgba(240,171,60,0.88)", {
                  overlayOpacity: overlayWeight("turningPoints"),
                })
              : null}
            {showTurningPoints
              ? renderTurningPointMarkers(secondaryFrame, compareLaneY, "rgba(78,166,223,0.82)", {
                  dashed: true,
                  overlayOpacity: overlayWeight("turningPoints"),
                })
              : null}
            <path
              d={`M ${70} ${activeLaneY - 12} C ${110} ${activeLaneY - 40}, ${primaryFrame.centerX - 100} ${activeLaneY - 40}, ${primaryFrame.centerX - 30} ${activeLaneY - 12}`}
              fill="none"
              stroke="url(#shm-track)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d={`M ${primaryFrame.centerX - 30} ${activeLaneY - 12} C ${primaryFrame.centerX - 60} ${activeLaneY + 20}, ${primaryFrame.centerX - 90} ${activeLaneY + 35}, ${primaryFrame.centerX - 120} ${activeLaneY - 14}`}
              fill="none"
              stroke="url(#shm-track)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d={`M ${70} ${compareLaneY - 12} C ${110} ${compareLaneY - 40}, ${secondaryFrame.centerX - 100} ${compareLaneY - 40}, ${secondaryFrame.centerX - 30} ${compareLaneY - 12}`}
              fill="none"
              stroke="url(#shm-track-compare)"
              strokeWidth="5"
              strokeDasharray="8 8"
              strokeLinecap="round"
            />
            <path
              d={`M ${secondaryFrame.centerX - 30} ${compareLaneY - 12} C ${secondaryFrame.centerX - 60} ${compareLaneY + 20}, ${secondaryFrame.centerX - 90} ${compareLaneY + 35}, ${secondaryFrame.centerX - 120} ${compareLaneY - 14}`}
              fill="none"
              stroke="url(#shm-track-compare)"
              strokeWidth="5"
              strokeDasharray="8 8"
              strokeLinecap="round"
            />
            {showMotionTrail ? (
              <>
                <line
                  x1={primaryFrame.centerX}
                  x2={primaryFrame.blockX}
                  y1={activeLaneY + 44}
                  y2={activeLaneY + 44}
                  stroke="rgba(30,166,162,0.28)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeOpacity={overlayWeight("motionTrail")}
                />
                <circle cx={primaryFrame.centerX} cy={activeLaneY + 44} r={focusedOverlayId === "motionTrail" ? "9" : "8"} fill="rgba(30,166,162,0.18)" fillOpacity={overlayWeight("motionTrail")} />
                <circle cx={primaryFrame.blockX} cy={activeLaneY + 44} r={focusedOverlayId === "motionTrail" ? "9" : "8"} fill="rgba(30,166,162,0.72)" fillOpacity={overlayWeight("motionTrail")} />
                <line
                  x1={secondaryFrame.centerX}
                  x2={secondaryFrame.blockX}
                  y1={compareLaneY + 44}
                  y2={compareLaneY + 44}
                  stroke="rgba(78,166,223,0.24)"
                  strokeWidth="6"
                  strokeDasharray="8 8"
                  strokeLinecap="round"
                  strokeOpacity={overlayWeight("motionTrail")}
                />
                <circle cx={secondaryFrame.centerX} cy={compareLaneY + 44} r={focusedOverlayId === "motionTrail" ? "9" : "8"} fill="rgba(78,166,223,0.18)" fillOpacity={overlayWeight("motionTrail")} />
                <circle cx={secondaryFrame.blockX} cy={compareLaneY + 44} r={focusedOverlayId === "motionTrail" ? "9" : "8"} fill="rgba(78,166,223,0.72)" fillOpacity={overlayWeight("motionTrail")} />
              </>
            ) : null}
            <g
              tabIndex={0}
              role="button"
              aria-label={t("aria.massForLabel", { label: activeLabel })}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setDragging(true);
                const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                if (bounds) {
                  updateFromClientX(event.clientX, bounds);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                  event.preventDefault();
                  adjustPhase(-0.1);
                } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                  event.preventDefault();
                  adjustPhase(0.1);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  setParam("phase", 0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  setParam("phase", Number((Math.PI * 2).toFixed(3)));
                }
              }}
              style={{ cursor: dragging ? "grabbing" : "grab" }}
            >
              <rect
                x={primaryFrame.blockX - MASS_HALF_WIDTH}
                y={activeLaneY - 40}
                width="92"
                height="80"
                rx="22"
                fill="#0f1c24"
                stroke="#f0ab3c"
                strokeWidth="3"
              />
              <circle cx={primaryFrame.blockX} cy={activeLaneY + MASS_AXIS_Y_OFFSET} r="16" fill="#f4f2eb" />
              <line
                x1={primaryFrame.blockX - MASS_GUIDE_HALF_WIDTH}
                x2={primaryFrame.blockX + MASS_GUIDE_HALF_WIDTH}
                y1={activeLaneY + MASS_AXIS_Y_OFFSET}
                y2={activeLaneY + MASS_AXIS_Y_OFFSET}
                stroke="#f4f2eb"
                strokeWidth="3"
              />
              {showVelocityVector ? (
                <>
                  <line
                    x1={primaryFrame.blockX}
                    x2={primaryFrame.blockX + clamp(primaryFrame.snapshot.velocity * 20, -90, 90)}
                    y1={activeLaneY - 58}
                    y2={activeLaneY - 58}
                    stroke="#4ea6df"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeOpacity={overlayWeight("velocityVector")}
                  />
                  <polygon
                    points={`${
                      primaryFrame.blockX +
                      clamp(primaryFrame.snapshot.velocity * 20, -90, 90) +
                      (clamp(primaryFrame.snapshot.velocity * 20, -90, 90) >= 0 ? 10 : -10)
                    },${activeLaneY - 58} ${
                      primaryFrame.blockX + clamp(primaryFrame.snapshot.velocity * 20, -90, 90)
                    },${activeLaneY - 66} ${
                      primaryFrame.blockX + clamp(primaryFrame.snapshot.velocity * 20, -90, 90)
                    },${activeLaneY - 50}`}
                    fill="#4ea6df"
                    fillOpacity={overlayWeight("velocityVector")}
                  />
                </>
              ) : null}
              {showAccelerationVector ? (
                <>
                  <line
                    x1={primaryFrame.blockX}
                    x2={primaryFrame.blockX + clamp(primaryFrame.snapshot.acceleration * 6, -90, 90)}
                    y1={activeLaneY + 50}
                    y2={activeLaneY + 50}
                    stroke="#f16659"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeOpacity={overlayWeight("accelerationVector")}
                  />
                  <polygon
                    points={`${
                      primaryFrame.blockX +
                      clamp(primaryFrame.snapshot.acceleration * 6, -90, 90) +
                      (clamp(primaryFrame.snapshot.acceleration * 6, -90, 90) >= 0 ? 10 : -10)
                    },${activeLaneY + 50} ${
                      primaryFrame.blockX + clamp(primaryFrame.snapshot.acceleration * 6, -90, 90)
                    },${activeLaneY + 42} ${
                      primaryFrame.blockX + clamp(primaryFrame.snapshot.acceleration * 6, -90, 90)
                    },${activeLaneY + 58}`}
                    fill="#f16659"
                    fillOpacity={overlayWeight("accelerationVector")}
                  />
                </>
              ) : null}
              <text
                x={primaryFrame.blockX}
                y={activeLaneY - 84}
                textAnchor="middle"
                className="fill-sky-500 text-[12px] font-semibold"
              >
                x
              </text>
            </g>
            <g pointerEvents="none">
              <rect
                x={secondaryFrame.blockX - MASS_HALF_WIDTH}
                y={compareLaneY - 40}
                width="92"
                height="80"
                rx="22"
                fill="rgba(15,28,36,0.08)"
                stroke="rgba(78,166,223,0.7)"
                strokeDasharray="8 8"
                strokeWidth="3"
              />
              <circle
                cx={secondaryFrame.blockX}
                cy={compareLaneY + MASS_AXIS_Y_OFFSET}
                r="16"
                fill="rgba(244,242,235,0.92)"
                stroke="rgba(78,166,223,0.72)"
                strokeWidth="2"
              />
              <line
                x1={secondaryFrame.blockX - MASS_GUIDE_HALF_WIDTH}
                x2={secondaryFrame.blockX + MASS_GUIDE_HALF_WIDTH}
                y1={compareLaneY + MASS_AXIS_Y_OFFSET}
                y2={compareLaneY + MASS_AXIS_Y_OFFSET}
                stroke="rgba(244,242,235,0.92)"
                strokeWidth="3"
              />
              <text
                x={secondaryFrame.blockX}
                y={compareLaneY - 84}
                textAnchor="middle"
                className="fill-sky-500 text-[12px] font-semibold"
              >
                x
              </text>
              <text
                x={secondaryFrame.blockX + 54}
                y={compareLaneY - 46}
                className="fill-sky-500 text-[12px] font-semibold"
              >
                {secondaryLabel}
              </text>
            </g>
          </>
        ) : (
          <>
            {showEquilibriumLine ? (
              <>
                <line x1={primaryFrame.centerX} x2={primaryFrame.centerX} y1={32} y2={HEIGHT - 24} stroke="rgba(30,166,162,0.3)" strokeDasharray="8 8" strokeOpacity={overlayWeight("equilibriumLine")} />
                <text x={primaryFrame.centerX + 10} y={40} className="fill-teal-600 text-[12px] font-semibold">
                  {t("stage.equilibrium")}
                </text>
              </>
            ) : null}
            {showTurningPoints
              ? renderTurningPointMarkers(primaryFrame, TRACK_Y, "rgba(240,171,60,0.88)", {
                  overlayOpacity: overlayWeight("turningPoints"),
                  label: "A",
                })
              : null}
            <path
              d={`M ${70} ${TRACK_Y - 12} C ${110} ${TRACK_Y - 40}, ${primaryFrame.centerX - 100} ${TRACK_Y - 40}, ${primaryFrame.centerX - 30} ${TRACK_Y - 12}`}
              fill="none"
              stroke="url(#shm-track)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d={`M ${primaryFrame.centerX - 30} ${TRACK_Y - 12} C ${primaryFrame.centerX - 60} ${TRACK_Y + 20}, ${primaryFrame.centerX - 90} ${TRACK_Y + 35}, ${primaryFrame.centerX - 120} ${TRACK_Y - 14}`}
              fill="none"
              stroke="url(#shm-track)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {showMotionTrail ? (
              <>
                <line
                  x1={primaryFrame.centerX}
                  x2={primaryFrame.blockX}
                  y1={TRACK_Y + 44}
                  y2={TRACK_Y + 44}
                  stroke="rgba(30,166,162,0.28)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeOpacity={overlayWeight("motionTrail")}
                />
                <circle cx={primaryFrame.centerX} cy={TRACK_Y + 44} r={focusedOverlayId === "motionTrail" ? "9" : "8"} fill="rgba(30,166,162,0.18)" fillOpacity={overlayWeight("motionTrail")} />
                <circle cx={primaryFrame.blockX} cy={TRACK_Y + 44} r={focusedOverlayId === "motionTrail" ? "9" : "8"} fill="rgba(30,166,162,0.72)" fillOpacity={overlayWeight("motionTrail")} />
              </>
            ) : null}
            <g
              tabIndex={0}
              role="button"
              aria-label={t("aria.mass")}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setDragging(true);
                const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                if (bounds) {
                  updateFromClientX(event.clientX, bounds);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                  event.preventDefault();
                  adjustPhase(-0.1);
                } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                  event.preventDefault();
                  adjustPhase(0.1);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  setParam("phase", 0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  setParam("phase", Number((Math.PI * 2).toFixed(3)));
                }
              }}
              style={{ cursor: dragging ? "grabbing" : "grab" }}
            >
              <rect
                x={primaryFrame.blockX - MASS_HALF_WIDTH}
                y={TRACK_Y - 40}
                width="92"
                height="80"
                rx="22"
                fill="#0f1c24"
                stroke="#f0ab3c"
                strokeWidth="3"
              />
              <circle cx={primaryFrame.blockX} cy={TRACK_Y + MASS_AXIS_Y_OFFSET} r="16" fill="#f4f2eb" />
              <line
                x1={primaryFrame.blockX - MASS_GUIDE_HALF_WIDTH}
                x2={primaryFrame.blockX + MASS_GUIDE_HALF_WIDTH}
                y1={TRACK_Y + MASS_AXIS_Y_OFFSET}
                y2={TRACK_Y + MASS_AXIS_Y_OFFSET}
                stroke="#f4f2eb"
                strokeWidth="3"
              />
              {showVelocityVector ? (
                <>
                  <line
                    x1={primaryFrame.blockX}
                    x2={primaryFrame.blockX + clamp(primaryFrame.snapshot.velocity * 20, -90, 90)}
                    y1={TRACK_Y - 58}
                    y2={TRACK_Y - 58}
                    stroke="#4ea6df"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeOpacity={overlayWeight("velocityVector")}
                  />
                  <polygon
                    points={`${
                      primaryFrame.blockX +
                      clamp(primaryFrame.snapshot.velocity * 20, -90, 90) +
                      (clamp(primaryFrame.snapshot.velocity * 20, -90, 90) >= 0 ? 10 : -10)
                    },${TRACK_Y - 58} ${
                      primaryFrame.blockX + clamp(primaryFrame.snapshot.velocity * 20, -90, 90)
                    },${TRACK_Y - 66} ${
                      primaryFrame.blockX + clamp(primaryFrame.snapshot.velocity * 20, -90, 90)
                    },${TRACK_Y - 50}`}
                    fill="#4ea6df"
                    fillOpacity={overlayWeight("velocityVector")}
                  />
                </>
              ) : null}
              {showAccelerationVector ? (
                <>
                  <line
                    x1={primaryFrame.blockX}
                    x2={primaryFrame.blockX + clamp(primaryFrame.snapshot.acceleration * 6, -90, 90)}
                    y1={TRACK_Y + 50}
                    y2={TRACK_Y + 50}
                    stroke="#f16659"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeOpacity={overlayWeight("accelerationVector")}
                  />
                  <polygon
                    points={`${
                      primaryFrame.blockX +
                      clamp(primaryFrame.snapshot.acceleration * 6, -90, 90) +
                      (clamp(primaryFrame.snapshot.acceleration * 6, -90, 90) >= 0 ? 10 : -10)
                    },${TRACK_Y + 50} ${
                      primaryFrame.blockX + clamp(primaryFrame.snapshot.acceleration * 6, -90, 90)
                    },${TRACK_Y + 42} ${
                      primaryFrame.blockX + clamp(primaryFrame.snapshot.acceleration * 6, -90, 90)
                    },${TRACK_Y + 58}`}
                    fill="#f16659"
                    fillOpacity={overlayWeight("accelerationVector")}
                  />
                </>
              ) : null}
              <text
                x={primaryFrame.blockX}
                y={TRACK_Y - 84}
                textAnchor="middle"
                className="fill-sky-500 text-[12px] font-semibold"
              >
                x
              </text>
            </g>
          </>
        )}
        <SimulationReadoutCard
          x={METRICS_CARD_X}
          y={METRICS_CARD_Y}
          width={METRICS_CARD_WIDTH}
          title={compareEnabled ? t("readout.titleForLabel", { label: primaryLabel }) : t("readout.title")}
          variant="hud"
          rows={metricRows}
        />
      </svg>
    </section>
  );
}
