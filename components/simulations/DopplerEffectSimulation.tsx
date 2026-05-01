"use client";

import {
  DOPPLER_EFFECT_MAX_OBSERVER_SPEED,
  DOPPLER_EFFECT_MAX_SOURCE_SPEED,
  DOPPLER_EFFECT_MIN_OBSERVER_SPEED,
  DOPPLER_EFFECT_STAGE_HALF_LENGTH,
  DOPPLER_EFFECT_WAVE_SPEED,
  clamp,
  formatMeasurement,
  formatNumber,
  getDopplerEffectWavefronts,
  resolveDopplerEffectParams,
  sampleDopplerEffectState,
  sampleRange,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import { SimulationReadoutSummary } from "./SimulationReadoutSummary";
import { CompareLegend, resolveCompareScene, SimulationPreviewBadge } from "./primitives/compare";
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

type DopplerEffectSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type Frame = {
  params: ReturnType<typeof resolveDopplerEffectParams>;
  snapshot: ReturnType<typeof sampleDopplerEffectState>;
  wavefronts: ReturnType<typeof getDopplerEffectWavefronts>;
};

const WIDTH = 820;
const HEIGHT = 368;
const STAGE_LEFT = 42;
const STAGE_WIDTH = 560;
const STAGE_RIGHT = STAGE_LEFT + STAGE_WIDTH;
const CARD_WIDTH = 212;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const SINGLE_ROW_CENTER = 184;
const ROW_HALF_HEIGHT = 88;
const COMPARE_ROW_CENTERS: Record<GraphSeriesSetupId, number> = {
  a: 112,
  b: 258,
};
const RULER_TICKS = sampleRange(-6, 6, 7);

function xFromWorld(position: number) {
  const normalized =
    (position + DOPPLER_EFFECT_STAGE_HALF_LENGTH) / (DOPPLER_EFFECT_STAGE_HALF_LENGTH * 2);
  return STAGE_LEFT + normalized * STAGE_WIDTH;
}

function buildFrame(
  source: SimulationParams,
  time: number,
  previewPatch?: Partial<Record<string, number | boolean>>,
): Frame {
  const params = resolveDopplerEffectParams({
    ...source,
    ...previewPatch,
  });

  return {
    params,
    snapshot: sampleDopplerEffectState(params, time),
    wavefronts: getDopplerEffectWavefronts(params, time),
  };
}

function resolvePreviewPatch(graphPreview?: GraphStagePreview | null) {
  if (!graphPreview || graphPreview.kind !== "response") {
    return null;
  }

  if (graphPreview.graphId === "source-spacing") {
    return {
      sourceSpeed: Number(
        clamp(graphPreview.point.x, 0, DOPPLER_EFFECT_MAX_SOURCE_SPEED).toFixed(2),
      ),
    };
  }

  if (graphPreview.graphId === "observer-response") {
    return {
      observerSpeed: Number(
        clamp(
          graphPreview.point.x,
          DOPPLER_EFFECT_MIN_OBSERVER_SPEED,
          DOPPLER_EFFECT_MAX_OBSERVER_SPEED,
        ).toFixed(2),
      ),
    };
  }

  return null;
}

function describeObserverMotion(frame: Frame) {
  const { observerMotionLabel, observerSpeed } = frame.snapshot;

  if (observerMotionLabel === "toward") {
    return `toward ${formatMeasurement(observerSpeed, "m/s")}`;
  }

  if (observerMotionLabel === "away") {
    return `away ${formatMeasurement(Math.abs(observerSpeed), "m/s")}`;
  }

  return "stationary";
}

function findSpacingPair(positions: number[], target: number) {
  if (positions.length < 2) {
    return null;
  }

  let bestPair: [number, number] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let index = 0; index < positions.length - 1; index += 1) {
    const left = positions[index];
    const right = positions[index + 1];
    const midpoint = (left + right) / 2;
    const score = Math.abs(midpoint - target);

    if (score < bestScore) {
      bestScore = score;
      bestPair = [left, right];
    }
  }

  return bestPair;
}

function renderBenchAxis(rowCenter: number) {
  const axisY = rowCenter + 22;

  return (
    <g pointerEvents="none">
      <line
        x1={STAGE_LEFT}
        x2={STAGE_RIGHT}
        y1={axisY}
        y2={axisY}
        stroke="rgba(15,28,36,0.18)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {RULER_TICKS.map((tick) => {
        const x = xFromWorld(tick);

        return (
          <g key={`tick-${tick}`}>
            <line
              x1={x}
              x2={x}
              y1={axisY - 6}
              y2={axisY + 6}
              stroke="rgba(15,28,36,0.18)"
              strokeWidth="1.2"
            />
            <text
              x={x}
              y={axisY + 22}
              textAnchor="middle"
              className="fill-ink-500 text-[10px] font-semibold"
            >
              {formatNumber(tick)} m
            </text>
          </g>
        );
      })}
      <text
        x={STAGE_LEFT}
        y={axisY - 12}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        medium axis
      </text>
    </g>
  );
}

function renderWavefronts(frame: Frame, rowCenter: number, rowId: string) {
  const clipId = `doppler-clip-${rowId}`;
  const axisY = rowCenter + 22;

  return (
    <g pointerEvents="none">
      <defs>
        <clipPath id={clipId}>
          <rect
            x={STAGE_LEFT}
            y={rowCenter - ROW_HALF_HEIGHT + 8}
            width={STAGE_WIDTH}
            height={ROW_HALF_HEIGHT * 2 - 28}
            rx="28"
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {frame.wavefronts.map((wavefront, index) => {
          const ageRatio = (index + 1) / Math.max(frame.wavefronts.length, 1);
          const strokeOpacity = 0.12 + ageRatio * 0.22;

          return (
            <circle
              key={`wavefront-${index}`}
              cx={xFromWorld(wavefront.sourceX)}
              cy={axisY}
              r={
                (wavefront.radius / (DOPPLER_EFFECT_STAGE_HALF_LENGTH * 2)) * STAGE_WIDTH
              }
              fill="none"
              stroke={`rgba(78,166,223,${strokeOpacity.toFixed(3)})`}
              strokeWidth="2.1"
            />
          );
        })}
      </g>
        {frame.snapshot.frontAxisPositions.map((position, index) => (
          <circle
            key={`front-marker-${index}`}
            cx={xFromWorld(position)}
            cy={axisY - 8}
            r="3.2"
            fill={
              frame.snapshot.observerAhead ? "rgba(241,102,89,0.9)" : "rgba(241,102,89,0.36)"
            }
          />
        ))}
        {frame.snapshot.backAxisPositions.map((position, index) => (
          <circle
            key={`back-marker-${index}`}
            cx={xFromWorld(position)}
            cy={axisY + 8}
            r="3.2"
            fill={
              frame.snapshot.observerAhead ? "rgba(78,166,223,0.36)" : "rgba(78,166,223,0.9)"
            }
          />
        ))}
    </g>
  );
}

function renderSource(frame: Frame, rowCenter: number) {
  const sourceX = xFromWorld(frame.snapshot.sourceX);
  const axisY = rowCenter + 22;

  return (
    <g pointerEvents="none">
      <circle
        cx={sourceX}
        cy={axisY}
        r="11"
        fill="#1ea6a2"
        stroke="rgba(255,253,247,0.96)"
        strokeWidth="2.8"
      />
      <circle
        cx={sourceX}
        cy={axisY}
        r="19"
        fill="none"
        stroke="rgba(30,166,162,0.18)"
        strokeWidth="2"
      />
      <text
        x={sourceX}
        y={axisY + 38}
        textAnchor="middle"
        className="fill-teal-700 text-[11px] font-semibold"
      >
        source
      </text>
    </g>
  );
}

function renderObserver(frame: Frame, rowCenter: number) {
  const observerX = xFromWorld(frame.snapshot.observerX);
  const axisY = rowCenter + 22;

  return (
    <g pointerEvents="none">
      <circle
        cx={observerX}
        cy={axisY}
        r="10"
        fill="#f16659"
        stroke="rgba(255,253,247,0.96)"
        strokeWidth="2.8"
      />
      <text
        x={observerX}
        y={axisY - 18}
        textAnchor="middle"
        className="fill-coral-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        {frame.snapshot.observerSideLabel}
      </text>
      <text
        x={observerX}
        y={axisY + 38}
        textAnchor="middle"
        className="fill-coral-700 text-[11px] font-semibold"
      >
        observer
      </text>
    </g>
  );
}

function renderArrow(
  x1: number,
  x2: number,
  y: number,
  color: string,
) {
  const arrowDirection = x2 >= x1 ? 1 : -1;

  return (
    <g>
      <line
        x1={x1}
        x2={x2}
        y1={y}
        y2={y}
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <line
        x1={x2}
        x2={x2 - 10 * arrowDirection}
        y1={y}
        y2={y - 6}
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <line
        x1={x2}
        x2={x2 - 10 * arrowDirection}
        y1={y}
        y2={y + 6}
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </g>
  );
}

function renderStillMarker(x: number, y: number, color: string) {
  return (
    <line
      x1={x - 12}
      x2={x + 12}
      y1={y}
      y2={y}
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  );
}

function renderMotionOverlay(
  frame: Frame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "motionVectors", 0.42);
  const sourceX = xFromWorld(frame.snapshot.sourceX);
  const observerX = xFromWorld(frame.snapshot.observerX);
  const topY = rowCenter - 36;
  const sourceMoving = frame.snapshot.sourceSpeed >= 0.03;
  const observerMoving = Math.abs(frame.snapshot.observerActualVelocity) >= 0.03;
  const sourceArrowEnd = xFromWorld(
    clamp(
      frame.snapshot.sourceX + frame.snapshot.sourceSpeed * 1.8,
      -DOPPLER_EFFECT_STAGE_HALF_LENGTH,
      DOPPLER_EFFECT_STAGE_HALF_LENGTH,
    ),
  );
  const observerArrowEnd = xFromWorld(
    clamp(
      frame.snapshot.observerX + frame.snapshot.observerActualVelocity * 1.8,
      -DOPPLER_EFFECT_STAGE_HALF_LENGTH,
      DOPPLER_EFFECT_STAGE_HALF_LENGTH,
    ),
  );

  return (
    <g pointerEvents="none" opacity={opacity}>
      {sourceMoving
        ? renderArrow(sourceX, sourceArrowEnd, topY, "#1ea6a2")
        : renderStillMarker(sourceX, topY, "#1ea6a2")}
      <text
        x={(sourceX + sourceArrowEnd) / 2}
        y={topY - 10}
        textAnchor="middle"
        className="fill-teal-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        {sourceMoving ? "source motion" : "source still"}
      </text>
      {observerMoving
        ? renderArrow(observerX, observerArrowEnd, topY + 20, "#f16659")
        : renderStillMarker(observerX, topY + 20, "#f16659")}
      <text
        x={(observerX + observerArrowEnd) / 2}
        y={topY + 10}
        textAnchor="middle"
        className="fill-coral-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        {observerMoving ? `observer ${frame.snapshot.observerMotionLabel}` : "observer still"}
      </text>
    </g>
  );
}

function renderSpacingBracket(
  x1: number,
  x2: number,
  y: number,
  color: string,
  label: string,
  value: string,
) {
  return (
    <g>
      <line x1={x1} x2={x2} y1={y} y2={y} stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <line x1={x1} x2={x1} y1={y - 5} y2={y + 5} stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <line x1={x2} x2={x2} y1={y - 5} y2={y + 5} stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <text
        x={(x1 + x2) / 2}
        y={y - 8}
        textAnchor="middle"
        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
        fill={color}
      >
        {label}: {value}
      </text>
    </g>
  );
}

function renderSpacingOverlay(
  frame: Frame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "frontBackSpacing", 0.42);
  const frontPair = findSpacingPair(
    frame.snapshot.frontAxisPositions,
    frame.snapshot.sourceX + frame.snapshot.frontSpacing * 1.25,
  );
  const backPair = findSpacingPair(
    frame.snapshot.backAxisPositions,
    frame.snapshot.sourceX - frame.snapshot.backSpacing * 1.25,
  );
  const axisY = rowCenter + 22;

  return (
    <g pointerEvents="none" opacity={opacity}>
      {frontPair
        ? renderSpacingBracket(
            xFromWorld(frontPair[0]),
            xFromWorld(frontPair[1]),
            axisY - 34,
            "#f16659",
            "front lambda",
            formatMeasurement(frame.snapshot.frontSpacing, "m"),
          )
        : null}
      {backPair
        ? renderSpacingBracket(
            xFromWorld(backPair[0]),
            xFromWorld(backPair[1]),
            axisY + 42,
            "#4ea6df",
            "rear lambda",
            formatMeasurement(frame.snapshot.backSpacing, "m"),
          )
        : null}
    </g>
  );
}

function renderArrivalOverlay(
  frame: Frame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "arrivalTiming", 0.42);
  const axisY = rowCenter + 22;
  const sourceX = xFromWorld(frame.snapshot.sourceX);
  const observerX = xFromWorld(frame.snapshot.observerX);
  const guideY = rowCenter - 58;

  return (
    <g pointerEvents="none" opacity={opacity}>
      <line
        x1={sourceX}
        x2={observerX}
        y1={guideY}
        y2={guideY}
        stroke="rgba(240,171,60,0.7)"
        strokeWidth="2.2"
        strokeDasharray="5 4"
        strokeLinecap="round"
      />
      <line x1={sourceX} x2={sourceX} y1={guideY - 4} y2={axisY - 12} stroke="rgba(240,171,60,0.56)" strokeWidth="1.8" />
      <line x1={observerX} x2={observerX} y1={guideY - 4} y2={axisY - 12} stroke="rgba(240,171,60,0.56)" strokeWidth="1.8" />
      <text
        x={(sourceX + observerX) / 2}
        y={guideY - 10}
        textAnchor="middle"
        className="fill-amber-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        arrivals every {formatMeasurement(frame.snapshot.observedPeriod, "s")}
      </text>
      <text
        x={observerX}
        y={axisY - 24}
        textAnchor="end"
        className="fill-amber-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        f_obs = {formatMeasurement(frame.snapshot.observedFrequency, "Hz")}
      </text>
    </g>
  );
}

function renderWaveRow(
  frame: Frame,
  rowCenter: number,
  options: {
    label: string;
    compareBadge?: string;
    overlayValues?: Record<string, boolean>;
    focusedOverlayId?: string | null;
    muted?: boolean;
    rowId: string;
  },
) {
  const top = rowCenter - ROW_HALF_HEIGHT;
  const bottom = rowCenter + ROW_HALF_HEIGHT;
  const showMotionVectors = options.overlayValues?.motionVectors ?? true;
  const showFrontBackSpacing = options.overlayValues?.frontBackSpacing ?? true;
  const showArrivalTiming = options.overlayValues?.arrivalTiming ?? true;

  return (
    <g opacity={options.muted ? 0.3 : 1}>
      <rect
        x={24}
        y={top - 18}
        width={WIDTH - 48}
        height={bottom - top + 48}
        rx="24"
        fill="rgba(255,253,247,0.82)"
        stroke="rgba(15,28,36,0.08)"
        strokeWidth="1.5"
      />
      <text x={42} y={top - 2} className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]">
        {options.label}
      </text>
      {options.compareBadge ? (
        <text
          x={WIDTH - 42}
          y={top - 2}
          textAnchor="end"
          className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.18em]"
        >
          {options.compareBadge}
        </text>
      ) : null}
      <text
        x={STAGE_LEFT}
        y={top + 14}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        wavefront circles stay in one medium; pitch changes because arrival timing changes.
      </text>
      {renderWavefronts(frame, rowCenter, options.rowId)}
      {renderSource(frame, rowCenter)}
      {renderObserver(frame, rowCenter)}
      {renderBenchAxis(rowCenter)}
      {showMotionVectors
        ? renderMotionOverlay(frame, rowCenter, options.focusedOverlayId)
        : null}
      {showFrontBackSpacing
        ? renderSpacingOverlay(frame, rowCenter, options.focusedOverlayId)
        : null}
      {showArrivalTiming
        ? renderArrivalOverlay(frame, rowCenter, options.focusedOverlayId)
        : null}
    </g>
  );
}

export function DopplerEffectSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: DopplerEffectSimulationProps) {
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  const previewPatch = resolvePreviewPatch(graphPreview);
  const activeFrame = buildFrame(
    params,
    displayTime,
    compare ? undefined : previewPatch ?? undefined,
  );
  const compareAFrame = compare
    ? buildFrame(
        compare.setupA,
        displayTime,
        graphPreview?.setup === "a" ? previewPatch ?? undefined : undefined,
      )
    : null;
  const compareBFrame = compare
    ? buildFrame(
        compare.setupB,
        displayTime,
        graphPreview?.setup === "b" ? previewPatch ?? undefined : undefined,
      )
    : null;
  const { compareEnabled, previewedSetup, primaryFrame, primaryLabel } =
    resolveCompareScene({
      compare,
      graphPreview,
      activeFrame,
      frameA: compareAFrame,
      frameB: compareBFrame,
      liveLabel: "Live setup",
    });
  const previewBadge =
    graphPreview?.kind === "time" ? (
      <SimulationPreviewBadge tone="teal">
        preview t = {formatNumber(displayTime)} s
      </SimulationPreviewBadge>
    ) : graphPreview?.kind === "response" && graphPreview.graphId === "source-spacing" ? (
      <SimulationPreviewBadge>
        preview v_s = {formatMeasurement(Number(previewPatch?.sourceSpeed ?? 0), "m/s")}
      </SimulationPreviewBadge>
    ) : graphPreview?.kind === "response" && graphPreview.graphId === "observer-response" ? (
      <SimulationPreviewBadge>
        preview v_o = {formatMeasurement(Number(previewPatch?.observerSpeed ?? 0), "m/s")}
      </SimulationPreviewBadge>
    ) : null;
  const metricRows = [
    {
      label: "f_s",
      value: formatMeasurement(primaryFrame.snapshot.sourceFrequency, "Hz"),
    },
    {
      label: "v_wave",
      value: formatMeasurement(DOPPLER_EFFECT_WAVE_SPEED, "m/s"),
    },
    {
      label: "v_s",
      value: formatMeasurement(primaryFrame.snapshot.sourceSpeed, "m/s"),
    },
    {
      label: "side",
      value: primaryFrame.snapshot.observerSideLabel,
    },
    {
      label: "v_o",
      value: describeObserverMotion(primaryFrame),
    },
    {
      label: "lambda_side",
      value: formatMeasurement(primaryFrame.snapshot.selectedSpacing, "m"),
    },
    {
      label: "f_obs",
      value: formatMeasurement(primaryFrame.snapshot.observedFrequency, "Hz"),
    },
    {
      label: "pitch",
      value: `${formatNumber(primaryFrame.snapshot.pitchRatio)} x`,
    },
  ];
  const noteLines = [
    `Front spacing = ${formatMeasurement(primaryFrame.snapshot.frontSpacing, "m")}; rear spacing = ${formatMeasurement(primaryFrame.snapshot.backSpacing, "m")}.`,
    `Current separation = ${formatMeasurement(primaryFrame.snapshot.currentSeparation, "m")}; travel delay = ${formatMeasurement(primaryFrame.snapshot.travelDelay, "s")}.`,
    `Source motion changes medium spacing, while observer motion changes the arrival rate on the chosen side.`,
  ];

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(30,166,162,0.1),rgba(241,102,89,0.08))]"
      headerAside={
        <>
          {previewBadge}
          {compareEnabled ? (
            <CompareLegend
              primaryLabel={primaryLabel}
              secondaryLabel={
                previewedSetup === "a"
                  ? compare?.labelB ?? "Setup B"
                  : compare?.labelA ?? "Setup A"
              }
            />
          ) : (
            <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-600">
              {primaryLabel}
            </span>
          )}
        </>
      }
    >
      <div className="space-y-3">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
        >
          <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.5)" />
          {compareEnabled ? (
            <>
              {renderWaveRow(compareAFrame!, COMPARE_ROW_CENTERS.a, {
                label: compare?.labelA ?? "Setup A",
                compareBadge: compare?.activeTarget === "a" ? "editing" : "locked",
                overlayValues,
                focusedOverlayId,
                muted: previewedSetup === "b",
                rowId: "a",
              })}
              {renderWaveRow(compareBFrame!, COMPARE_ROW_CENTERS.b, {
                label: compare?.labelB ?? "Setup B",
                compareBadge: compare?.activeTarget === "b" ? "editing" : "locked",
                overlayValues,
                focusedOverlayId,
                muted: previewedSetup === "a",
                rowId: "b",
              })}
            </>
          ) : (
            renderWaveRow(activeFrame, SINGLE_ROW_CENTER, {
              label: "Live passing-source bench",
              overlayValues,
              focusedOverlayId,
              rowId: "live",
            })
          )}
          <SimulationReadoutCard
            x={CARD_X}
            y={CARD_Y}
            width={CARD_WIDTH}
            title="Doppler state"
            setupLabel={compareEnabled ? primaryLabel : undefined}
            rows={metricRows}
            noteLines={noteLines}
          />
        </svg>
        <SimulationReadoutSummary
          title="Doppler state"
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={noteLines}
          className="mx-3 mb-3 mt-0 md:hidden"
        />
      </div>
    </SimulationSceneCard>
  );
}
