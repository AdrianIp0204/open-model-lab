"use client";

import { useMemo } from "react";
import {
  buildEscapeVelocityTrajectory,
  ESCAPE_VELOCITY_STAGE_MAX_RADIUS,
  formatMeasurement,
  formatNumber,
  sampleEscapeVelocityState,
  type ConceptSimulationSource,
  type EscapeVelocityState,
  type EscapeVelocityTrajectory,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import {
  CompareLegend,
  resolveCompareScene,
  SimulationPreviewBadge,
} from "./primitives/compare";
import { SvgArrow } from "./primitives/electric-stage";
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

type EscapeVelocitySimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type EscapeFrame = {
  trajectory: EscapeVelocityTrajectory;
  snapshot: EscapeVelocityState;
  visitedMaxRadius: number;
};

const WIDTH = 900;
const HEIGHT = 360;
const AXIS_LEFT = 88;
const AXIS_RIGHT = 610;
const SINGLE_TRACK_Y = 192;
const PRIMARY_TRACK_Y = 152;
const SECONDARY_TRACK_Y = 232;
const TICK_RADII = [0, 2, 4, 6, 8, 10, 12] as const;
const CARD_WIDTH = 236;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;

function projectRadius(radius: number) {
  return (
    AXIS_LEFT +
    (Math.min(radius, ESCAPE_VELOCITY_STAGE_MAX_RADIUS) / ESCAPE_VELOCITY_STAGE_MAX_RADIUS) *
      (AXIS_RIGHT - AXIS_LEFT)
  );
}

function sourceRadius(sourceMass: number) {
  return 16 + Math.min(14, sourceMass * 2.4);
}

function vectorLength(value: number, maxLength: number, scale: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return maxLength * Math.tanh(value / scale);
}

function buildFrame(source: SimulationParams, time: number): EscapeFrame {
  const trajectory = buildEscapeVelocityTrajectory(source);
  const snapshot = sampleEscapeVelocityState(source, time, trajectory);
  const visitedSampleCount = Math.min(
    trajectory.samples.length,
    Math.max(1, Math.floor(time / Math.max(trajectory.timeStep, 1e-6)) + 2),
  );
  const visitedMaxRadius = Math.max(
    ...trajectory.samples
      .slice(0, visitedSampleCount)
      .map((sample) => sample.radius),
    trajectory.params.launchRadius,
  );

  return {
    trajectory,
    snapshot,
    visitedMaxRadius,
  };
}

function formatStatus(snapshot: EscapeVelocityState) {
  if (snapshot.totalEnergy > 0.02) {
    return "Escapes";
  }

  if (Math.abs(snapshot.totalEnergy) <= 0.02) {
    return "Threshold launch";
  }

  if (snapshot.radialVelocity < -0.02) {
    return "Returning";
  }

  return "High but bound";
}

function formatTrend(snapshot: EscapeVelocityState) {
  if (snapshot.totalEnergy > 0.02) {
    return "Positive total energy means the object keeps moving outward without a finite turnaround radius.";
  }

  if (Math.abs(snapshot.totalEnergy) <= 0.02) {
    return "The total-energy line sits on zero, so the speed keeps fading without needing to reverse.";
  }

  if (snapshot.radialVelocity < -0.02) {
    return "The launch already turned around because its total energy stayed negative.";
  }

  return "It can climb very high, but the negative total energy still guarantees a return.";
}

function formatTurnaround(snapshot: EscapeVelocityState) {
  if (snapshot.turnaroundRadius === null) {
    return "No finite turnaround radius.";
  }

  if (snapshot.turnaroundRadius > ESCAPE_VELOCITY_STAGE_MAX_RADIUS) {
    return `Predicted turnaround: ${formatMeasurement(snapshot.turnaroundRadius, "m")} (beyond stage).`;
  }

  return `Predicted turnaround: ${formatMeasurement(snapshot.turnaroundRadius, "m")}.`;
}

type TrackRenderProps = {
  frame: EscapeFrame;
  y: number;
  dashed?: boolean;
  showTicks?: boolean;
  showLaunchMarker: boolean;
  showTurnaroundMarker: boolean;
  showVelocityVector: boolean;
  showGravityVector: boolean;
  showTrail: boolean;
  focusedOverlayId?: string | null;
};

function renderTrack({
  frame,
  y,
  dashed,
  showTicks,
  showLaunchMarker,
  showTurnaroundMarker,
  showVelocityVector,
  showGravityVector,
  showTrail,
  focusedOverlayId,
}: TrackRenderProps) {
  const axisOpacity = dashed ? 0.56 : 1;
  const launchX = projectRadius(frame.trajectory.params.launchRadius);
  const currentX = projectRadius(frame.snapshot.radius);
  const visitedMaxX = projectRadius(frame.visitedMaxRadius);
  const turnaroundX =
    frame.snapshot.turnaroundRadius === null
      ? null
      : projectRadius(frame.snapshot.turnaroundRadius);
  const showTurnaroundBeyondStage =
    frame.snapshot.turnaroundRadius !== null &&
    frame.snapshot.turnaroundRadius > ESCAPE_VELOCITY_STAGE_MAX_RADIUS;
  const velocityArrowLength = vectorLength(frame.snapshot.speed, 78, 2.2);
  const gravityArrowLength = vectorLength(frame.snapshot.gravityAcceleration, 72, 2.5);
  const velocityDirection = frame.snapshot.radialVelocity >= 0 ? 1 : -1;
  const velocityEndX = currentX + velocityDirection * velocityArrowLength;
  const gravityEndX = currentX - gravityArrowLength;
  const launchOpacity = resolveOverlayOpacity(focusedOverlayId, "launchMarker", 0.38);
  const turnaroundOpacity = resolveOverlayOpacity(
    focusedOverlayId,
    "turnaroundMarker",
    0.38,
  );
  const velocityOpacity = resolveOverlayOpacity(focusedOverlayId, "velocityVector", 0.38);
  const gravityOpacity = resolveOverlayOpacity(focusedOverlayId, "gravityVector", 0.38);
  const trailOpacity = resolveOverlayOpacity(focusedOverlayId, "trail", 0.3);

  return (
    <g opacity={axisOpacity}>
      <line
        x1={AXIS_LEFT}
        x2={AXIS_RIGHT}
        y1={y}
        y2={y}
        stroke="rgba(15,28,36,0.3)"
        strokeWidth="2.8"
      />
      {showTicks
        ? TICK_RADII.map((tick) => {
            const x = projectRadius(tick);

            return (
              <g key={`tick-${tick}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={y - 10}
                  y2={y + 10}
                  stroke="rgba(15,28,36,0.14)"
                />
                <text
                  x={x}
                  y={y + 26}
                  textAnchor="middle"
                  className="fill-ink-500 text-[10px] font-semibold"
                >
                  {tick} m
                </text>
              </g>
            );
          })
        : null}
      <circle
        cx={AXIS_LEFT}
        cy={y}
        r={sourceRadius(frame.trajectory.params.sourceMass)}
        fill={dashed ? "rgba(255,255,255,0.85)" : "rgba(15,28,36,0.12)"}
        stroke="rgba(15,28,36,0.8)"
        strokeWidth="2.8"
        strokeDasharray={dashed ? "8 6" : undefined}
      />
      <text
        x={AXIS_LEFT}
        y={y + 4}
        textAnchor="middle"
        className="fill-ink-950 text-[12px] font-semibold"
      >
        M
      </text>
      {showLaunchMarker ? (
        <g opacity={launchOpacity}>
          <line
            x1={launchX}
            x2={launchX}
            y1={y - 30}
            y2={y + 30}
            stroke={dashed ? "rgba(15,28,36,0.5)" : "#f0ab3c"}
            strokeWidth="2.4"
            strokeDasharray="7 6"
          />
          <text
            x={launchX}
            y={y - 36}
            textAnchor="middle"
            className="fill-amber-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
          >
            launch
          </text>
        </g>
      ) : null}
      {showTrail ? (
        <line
          x1={Math.min(launchX, visitedMaxX)}
          x2={Math.max(launchX, visitedMaxX)}
          y1={y}
          y2={y}
          stroke={dashed ? "rgba(15,28,36,0.44)" : "#1d6f9f"}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={dashed ? "7 6" : undefined}
          opacity={trailOpacity}
        />
      ) : null}
      {showTurnaroundMarker && turnaroundX !== null && !showTurnaroundBeyondStage ? (
        <g opacity={turnaroundOpacity}>
          <line
            x1={turnaroundX}
            x2={turnaroundX}
            y1={y - 28}
            y2={y + 28}
            stroke={dashed ? "rgba(15,28,36,0.55)" : "#f16659"}
            strokeWidth="2.2"
            strokeDasharray="4 5"
          />
          <text
            x={turnaroundX}
            y={y + 42}
            textAnchor="middle"
            className="fill-coral-700 text-[10px] font-semibold"
          >
            r_turn
          </text>
        </g>
      ) : showTurnaroundMarker && showTurnaroundBeyondStage ? (
        <g opacity={turnaroundOpacity}>
          <line
            x1={AXIS_RIGHT}
            x2={AXIS_RIGHT + 18}
            y1={y - 12}
            y2={y - 12}
            stroke={dashed ? "rgba(15,28,36,0.55)" : "#f16659"}
            strokeWidth="2.2"
          />
          <line
            x1={AXIS_RIGHT + 18}
            x2={AXIS_RIGHT + 18}
            y1={y - 18}
            y2={y - 6}
            stroke={dashed ? "rgba(15,28,36,0.55)" : "#f16659"}
            strokeWidth="2.2"
          />
          <text
            x={AXIS_RIGHT - 4}
            y={y - 22}
            textAnchor="end"
            className="fill-coral-700 text-[10px] font-semibold"
          >
            r_turn beyond view
          </text>
        </g>
      ) : null}
      {showVelocityVector ? (
        <>
          <SvgArrow
            x1={currentX}
            y1={y - 20}
            x2={velocityEndX}
            y2={y - 20}
            stroke="#4ea6df"
            strokeWidth={focusedOverlayId === "velocityVector" ? 4.8 : 3.8}
            opacity={velocityOpacity}
          />
          <text
            x={velocityDirection >= 0 ? velocityEndX + 8 : velocityEndX - 8}
            y={y - 26}
            textAnchor={velocityDirection >= 0 ? "start" : "end"}
            className="fill-sky-700 text-[11px] font-semibold"
          >
            v
          </text>
        </>
      ) : null}
      {showGravityVector ? (
        <>
          <SvgArrow
            x1={currentX}
            y1={y + 20}
            x2={gravityEndX}
            y2={y + 20}
            stroke="#1ea6a2"
            strokeWidth={focusedOverlayId === "gravityVector" ? 4.8 : 3.8}
            opacity={gravityOpacity}
          />
          <text
            x={gravityEndX - 8}
            y={y + 16}
            textAnchor="end"
            className="fill-teal-700 text-[11px] font-semibold"
          >
            g
          </text>
        </>
      ) : null}
      <circle
        cx={currentX}
        cy={y}
        r="10"
        fill={dashed ? "rgba(255,255,255,0.95)" : "#0f1c24"}
        stroke={dashed ? "rgba(15,28,36,0.6)" : "#f4f2eb"}
        strokeWidth="2.4"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <text
        x={currentX}
        y={y + 4}
        textAnchor="middle"
        className={dashed ? "fill-ink-700 text-[10px] font-semibold" : "fill-white text-[10px] font-semibold"}
      >
        m
      </text>
      <text
        x={currentX + 14}
        y={y - 12}
        className="fill-ink-700 text-[11px] font-semibold"
      >
        r = {formatNumber(frame.snapshot.radius)} m
      </text>
    </g>
  );
}

export function EscapeVelocitySimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: EscapeVelocitySimulationProps) {
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  const activeFrame = useMemo(() => buildFrame(params, displayTime), [displayTime, params]);
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
      liveLabel: "Live launch",
    });
  const primaryTrackY = compareEnabled ? PRIMARY_TRACK_Y : SINGLE_TRACK_Y;
  const showLaunchMarker = overlayValues?.launchMarker ?? true;
  const showTurnaroundMarker = overlayValues?.turnaroundMarker ?? true;
  const showVelocityVector = overlayValues?.velocityVector ?? true;
  const showGravityVector = overlayValues?.gravityVector ?? true;
  const showTrail = overlayValues?.trail ?? true;
  const previewBadge = graphPreview?.kind === "time" ? (
    <SimulationPreviewBadge tone="sky">
      preview t = {formatNumber(displayTime)} s
    </SimulationPreviewBadge>
  ) : null;
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? "Setup A")}: M {formatNumber(frameA!.trajectory.params.sourceMass)} kg / r0{" "}
        {formatNumber(frameA!.trajectory.params.launchRadius)} m
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: M {formatNumber(frameB!.trajectory.params.sourceMass)} kg / r0{" "}
        {formatNumber(frameB!.trajectory.params.launchRadius)} m
      </span>
    </div>
  ) : null;
  const metricRows = [
    {
      label: "M_source",
      value: formatMeasurement(primaryFrame.trajectory.params.sourceMass, "kg"),
    },
    {
      label: "r_launch",
      value: formatMeasurement(primaryFrame.trajectory.params.launchRadius, "m"),
    },
    { label: "v_0", value: formatMeasurement(primaryFrame.snapshot.launchSpeed, "m/s") },
    {
      label: "v_esc(r_0)",
      value: formatMeasurement(primaryFrame.snapshot.launchEscapeSpeed, "m/s"),
    },
    {
      label: "v_c(r_0)",
      value: formatMeasurement(primaryFrame.snapshot.launchCircularSpeed, "m/s"),
    },
    { label: "r_now", value: formatMeasurement(primaryFrame.snapshot.radius, "m") },
    { label: "v_now", value: formatMeasurement(primaryFrame.snapshot.speed, "m/s") },
    { label: "E / m", value: formatNumber(primaryFrame.snapshot.totalEnergy) },
  ];

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(15,28,36,0.08),rgba(241,102,89,0.12))]"
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
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.56)" />
        <rect
          x={44}
          y={46}
          width={AXIS_RIGHT - 10}
          height={HEIGHT - 92}
          rx="24"
          fill="rgba(255,253,247,0.9)"
        />
        {renderTrack({
          frame: primaryFrame,
          y: primaryTrackY,
          showTicks: true,
          showLaunchMarker,
          showTurnaroundMarker,
          showVelocityVector,
          showGravityVector,
          showTrail,
          focusedOverlayId,
        })}
        {secondaryFrame
          ? renderTrack({
              frame: secondaryFrame,
              y: SECONDARY_TRACK_Y,
              dashed: true,
              showLaunchMarker,
              showTurnaroundMarker,
              showVelocityVector,
              showGravityVector,
              showTrail,
              focusedOverlayId,
            })
          : null}
        <text
          x={AXIS_LEFT}
          y={58}
          className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
        >
          radial launch axis
        </text>
        {compareEnabled ? (
          <>
            <text
              x={AXIS_LEFT + 14}
              y={PRIMARY_TRACK_Y - 34}
              className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
            >
              {primaryLabel}
            </text>
            <text
              x={AXIS_LEFT + 14}
              y={SECONDARY_TRACK_Y - 34}
              className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
            >
              {secondaryLabel}
            </text>
          </>
        ) : null}
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Launch state"
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={[
            `${formatStatus(primaryFrame.snapshot)}: ${formatTrend(primaryFrame.snapshot)}`,
            "At the same radius, v_esc = sqrt(2) v_c in the displayed G = 1 units.",
            formatTurnaround(primaryFrame.snapshot),
          ]}
        />
      </svg>
    </SimulationSceneCard>
  );
}
