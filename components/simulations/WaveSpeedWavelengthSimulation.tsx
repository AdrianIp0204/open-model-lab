"use client";

import {
  WAVE_SPEED_WAVELENGTH_STAGE_LENGTH,
  clamp,
  formatMeasurement,
  formatNumber,
  getWaveSpeedWavelengthCrestPositions,
  sampleRange,
  sampleWaveSpeedWavelengthDisplacement,
  sampleWaveSpeedWavelengthState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
  resolveWaveSpeedWavelengthParams,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import { SimulationReadoutSummary } from "./SimulationReadoutSummary";
import { SimulationAxisDragSurface } from "./primitives/SimulationAxisDragSurface";
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

type WaveSpeedWavelengthSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type WaveFrame = {
  params: ReturnType<typeof resolveWaveSpeedWavelengthParams>;
  snapshot: ReturnType<typeof sampleWaveSpeedWavelengthState>;
};

const WIDTH = 820;
const HEIGHT = 336;
const LEFT_X = 114;
const WAVE_WIDTH = 468;
const RIGHT_X = LEFT_X + WAVE_WIDTH;
const PIXELS_PER_METER = WAVE_WIDTH / WAVE_SPEED_WAVELENGTH_STAGE_LENGTH;
const SOURCE_X = LEFT_X - 44;
const CARD_WIDTH = 212;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const AMPLITUDE_SCALE = 50;
const ROW_HALF_HEIGHT = 74;
const SINGLE_ROW_CENTER = 168;
const COMPARE_ROW_CENTERS: Record<GraphSeriesSetupId, number> = {
  a: 98,
  b: 218,
};
const WAVE_SAMPLE_COUNT = 221;
const RULER_TICKS = sampleRange(0, WAVE_SPEED_WAVELENGTH_STAGE_LENGTH, 9);

function xFromPhysical(position: number) {
  return LEFT_X + position * PIXELS_PER_METER;
}

function physicalXFromStage(stageX: number) {
  return clamp((stageX - LEFT_X) / PIXELS_PER_METER, 0, WAVE_SPEED_WAVELENGTH_STAGE_LENGTH);
}

function yFromDisplacement(displacement: number, rowCenter: number) {
  return rowCenter - displacement * AMPLITUDE_SCALE;
}

function buildFrame(
  source: SimulationParams,
  time: number,
  previewProbeX?: number,
): WaveFrame {
  const params = resolveWaveSpeedWavelengthParams(source);

  return {
    params,
    snapshot: sampleWaveSpeedWavelengthState(params, time, previewProbeX),
  };
}

function buildWavePath(frame: WaveFrame, rowCenter: number) {
  return sampleRange(0, WAVE_SPEED_WAVELENGTH_STAGE_LENGTH, WAVE_SAMPLE_COUNT)
    .map((position, index) => {
      const x = xFromPhysical(position);
      const y = yFromDisplacement(
        sampleWaveSpeedWavelengthDisplacement(frame.params, position, frame.snapshot.time),
        rowCenter,
      );

      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function findWavelengthPair(frame: WaveFrame) {
  const crests = getWaveSpeedWavelengthCrestPositions(frame.params, frame.snapshot.time);

  if (!crests.length) {
    return null;
  }

  const nearestCrest = crests.reduce((best, current) =>
    Math.abs(current - frame.snapshot.probeX) < Math.abs(best - frame.snapshot.probeX)
      ? current
      : best,
  );
  const nextCandidate = nearestCrest + frame.params.wavelength;
  const previousCandidate = nearestCrest - frame.params.wavelength;

  if (nextCandidate <= WAVE_SPEED_WAVELENGTH_STAGE_LENGTH) {
    return [nearestCrest, nextCandidate] as const;
  }

  if (previousCandidate >= 0) {
    return [previousCandidate, nearestCrest] as const;
  }

  if (crests.length >= 2) {
    return [crests[0], crests[1]] as const;
  }

  return null;
}

function renderWavelengthGuide(
  frame: WaveFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const pair = findWavelengthPair(frame);

  if (!pair) {
    return null;
  }

  const opacity = resolveOverlayOpacity(focusedOverlayId, "wavelengthGuide", 0.4);
  const leftX = xFromPhysical(pair[0]);
  const rightX = xFromPhysical(pair[1]);
  const crestY = yFromDisplacement(frame.params.amplitude, rowCenter);
  const guideY = crestY - 18;

  return (
    <g pointerEvents="none" opacity={opacity}>
      <line x1={leftX} x2={leftX} y1={crestY} y2={guideY + 5} stroke="rgba(78,166,223,0.68)" strokeDasharray="4 4" />
      <line x1={rightX} x2={rightX} y1={crestY} y2={guideY + 5} stroke="rgba(78,166,223,0.68)" strokeDasharray="4 4" />
      <line x1={leftX} x2={rightX} y1={guideY} y2={guideY} stroke="#4ea6df" strokeWidth="2.2" strokeLinecap="round" />
      <line x1={leftX} x2={leftX} y1={guideY - 4} y2={guideY + 4} stroke="#4ea6df" strokeWidth="2.2" strokeLinecap="round" />
      <line x1={rightX} x2={rightX} y1={guideY - 4} y2={guideY + 4} stroke="#4ea6df" strokeWidth="2.2" strokeLinecap="round" />
      <text
        x={(leftX + rightX) / 2}
        y={guideY - 8}
        textAnchor="middle"
        className="fill-sky-700 text-[11px] font-semibold uppercase tracking-[0.14em]"
      >
        lambda = {formatMeasurement(frame.snapshot.wavelength, "m")}
      </text>
    </g>
  );
}

function renderDelayGuide(
  frame: WaveFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "delayGuide", 0.4);
  const probeX = xFromPhysical(frame.snapshot.probeX);
  const guideY = rowCenter + ROW_HALF_HEIGHT - 10;

  return (
    <g pointerEvents="none" opacity={opacity}>
      <line
        x1={LEFT_X}
        x2={probeX}
        y1={guideY}
        y2={guideY}
        stroke="rgba(15,28,36,0.2)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line x1={LEFT_X} x2={LEFT_X} y1={guideY - 5} y2={guideY + 5} stroke="rgba(15,28,36,0.34)" strokeWidth="2" />
      <line x1={probeX} x2={probeX} y1={guideY - 5} y2={guideY + 5} stroke="rgba(15,28,36,0.34)" strokeWidth="2" />
      <text
        x={(LEFT_X + probeX) / 2}
        y={guideY - 9}
        textAnchor="middle"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        x_p = {formatMeasurement(frame.snapshot.probeX, "m")}
      </text>
      <text x={LEFT_X} y={guideY + 16} className="fill-ink-500 text-[10px]">
        delay = {formatMeasurement(frame.snapshot.travelDelay, "s")}
      </text>
      <text x={probeX} y={guideY + 16} textAnchor="end" className="fill-ink-500 text-[10px]">
        lag = {formatNumber(frame.snapshot.phaseLagCycles)} cycles
      </text>
    </g>
  );
}

function renderDistancePerPeriod(
  frame: WaveFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const pair = findWavelengthPair(frame);

  if (!pair) {
    return null;
  }

  const opacity = resolveOverlayOpacity(focusedOverlayId, "distancePerPeriod", 0.4);
  const leftX = xFromPhysical(pair[0]);
  const rightX = xFromPhysical(pair[1]);
  const topY = rowCenter - ROW_HALF_HEIGHT + 12;

  return (
    <g pointerEvents="none" opacity={opacity}>
      <line x1={leftX} x2={leftX} y1={topY - 4} y2={topY + 8} stroke="rgba(240,171,60,0.72)" strokeWidth="2" strokeDasharray="4 4" />
      <line x1={rightX} x2={rightX} y1={topY - 4} y2={topY + 8} stroke="rgba(240,171,60,0.72)" strokeWidth="2" strokeDasharray="4 4" />
      <line x1={leftX} x2={rightX} y1={topY + 4} y2={topY + 4} stroke="#f0ab3c" strokeWidth="2.4" strokeLinecap="round" />
      <text
        x={(leftX + rightX) / 2}
        y={topY - 8}
        textAnchor="middle"
        className="fill-amber-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        in one T, a crest moves one lambda
      </text>
    </g>
  );
}

function renderSource(frame: WaveFrame, rowCenter: number) {
  const sourceY = yFromDisplacement(frame.snapshot.sourceDisplacement, rowCenter);

  return (
    <g pointerEvents="none">
      <line
        x1={SOURCE_X}
        x2={SOURCE_X}
        y1={rowCenter - 28}
        y2={rowCenter + 28}
        stroke="rgba(15,28,36,0.18)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1={SOURCE_X}
        x2={LEFT_X}
        y1={rowCenter}
        y2={rowCenter}
        stroke="rgba(15,28,36,0.18)"
        strokeWidth="2"
      />
      <circle
        cx={SOURCE_X}
        cy={sourceY}
        r="9"
        fill="#1ea6a2"
        stroke="rgba(255,253,247,0.96)"
        strokeWidth="2.5"
      />
      <text
        x={SOURCE_X}
        y={rowCenter + 42}
        textAnchor="middle"
        className="fill-teal-700 text-[11px] font-semibold"
      >
        source
      </text>
    </g>
  );
}

function renderProbe(
  frame: WaveFrame,
  rowCenter: number,
  interactive: boolean,
  onAdjustProbe?: (probeX: number) => void,
) {
  const probeX = xFromPhysical(frame.snapshot.probeX);
  const probeY = yFromDisplacement(frame.snapshot.probeDisplacement, rowCenter);
  const top = rowCenter - ROW_HALF_HEIGHT;
  const bottom = rowCenter + ROW_HALF_HEIGHT;

  return (
    <>
      {interactive ? (
        <SimulationAxisDragSurface
          axis="x"
          svgWidth={WIDTH}
          svgHeight={HEIGHT}
          value={frame.snapshot.probeX}
          region={{
            x: LEFT_X,
            y: top,
            width: RIGHT_X - LEFT_X,
            height: bottom - top,
          }}
          ariaLabel={`Move probe position, current x ${formatNumber(frame.snapshot.probeX)} meters`}
          cursor="ew-resize"
          step={0.05}
          resolveValue={physicalXFromStage}
          onChange={(nextValue) => onAdjustProbe?.(nextValue)}
          homeValue={0}
          endValue={WAVE_SPEED_WAVELENGTH_STAGE_LENGTH}
        />
      ) : null}
      <line
        x1={probeX}
        x2={probeX}
        y1={rowCenter}
        y2={probeY}
        stroke="rgba(15,28,36,0.2)"
        strokeDasharray="5 5"
      />
      <circle
        cx={probeX}
        cy={probeY}
        r="8.5"
        fill="#f16659"
        stroke="rgba(255,253,247,0.96)"
        strokeWidth="2.5"
      />
      <text
        x={probeX}
        y={rowCenter + 24}
        textAnchor="middle"
        className="fill-coral-700 text-[11px] font-semibold"
      >
        probe
      </text>
    </>
  );
}

function renderRuler(rowCenter: number) {
  const rulerY = rowCenter + ROW_HALF_HEIGHT + 14;

  return (
    <g pointerEvents="none">
      <line
        x1={LEFT_X}
        x2={RIGHT_X}
        y1={rulerY}
        y2={rulerY}
        stroke="rgba(15,28,36,0.12)"
        strokeWidth="1.5"
      />
      {RULER_TICKS.map((tick) => {
        const x = xFromPhysical(tick);

        return (
          <g key={`tick-${tick}`}>
            <line
              x1={x}
              x2={x}
              y1={rulerY - 6}
              y2={rulerY + 6}
              stroke="rgba(15,28,36,0.18)"
              strokeWidth="1.2"
            />
            <text
              x={x}
              y={rulerY + 20}
              textAnchor="middle"
              className="fill-ink-500 text-[10px] font-semibold"
            >
              {formatNumber(tick)} m
            </text>
          </g>
        );
      })}
      <text
        x={LEFT_X}
        y={rulerY - 10}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        medium position
      </text>
    </g>
  );
}

function renderWaveRow(
  frame: WaveFrame,
  rowCenter: number,
  options: {
    label: string;
    compareBadge?: string;
    interactive?: boolean;
    overlayValues?: Record<string, boolean>;
    focusedOverlayId?: string | null;
    muted?: boolean;
    onAdjustProbe?: (probeX: number) => void;
  },
) {
  const opacity = options.muted ? 0.32 : 1;
  const top = rowCenter - ROW_HALF_HEIGHT;
  const bottom = rowCenter + ROW_HALF_HEIGHT;
  const showWavelengthGuide = options.overlayValues?.wavelengthGuide ?? true;
  const showDelayGuide = options.overlayValues?.delayGuide ?? true;
  const showDistancePerPeriod = options.overlayValues?.distancePerPeriod ?? false;

  return (
    <g opacity={opacity}>
      <rect
        x={24}
        y={top - 18}
        width={WIDTH - 48}
        height={bottom - top + 48}
        rx="24"
        fill="rgba(255,253,247,0.8)"
        stroke={options.interactive ? "rgba(30,166,162,0.22)" : "rgba(15,28,36,0.08)"}
        strokeWidth={options.interactive ? "2" : "1.5"}
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
        x={RIGHT_X - 8}
        y={top + 12}
        textAnchor="end"
        className="fill-sky-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        crests move right
      </text>
      <line
        x1={LEFT_X}
        x2={RIGHT_X}
        y1={rowCenter}
        y2={rowCenter}
        stroke="rgba(15,28,36,0.16)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d={buildWavePath(frame, rowCenter)}
        fill="none"
        stroke="#1ea6a2"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {showWavelengthGuide
        ? renderWavelengthGuide(frame, rowCenter, options.focusedOverlayId)
        : null}
      {showDelayGuide ? renderDelayGuide(frame, rowCenter, options.focusedOverlayId) : null}
      {showDistancePerPeriod
        ? renderDistancePerPeriod(frame, rowCenter, options.focusedOverlayId)
        : null}
      {renderSource(frame, rowCenter)}
      {renderProbe(frame, rowCenter, Boolean(options.interactive), options.onAdjustProbe)}
      {renderRuler(rowCenter)}
    </g>
  );
}

export function WaveSpeedWavelengthSimulation({
  concept,
  params,
  time,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: WaveSpeedWavelengthSimulationProps) {
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  const previewProbeX =
    graphPreview?.kind === "response" && graphPreview.graphId === "phase-map"
      ? clamp(graphPreview.point.x, 0, WAVE_SPEED_WAVELENGTH_STAGE_LENGTH)
      : undefined;
  const activeFrame = buildFrame(params, displayTime, previewProbeX);
  const compareAFrame = compare ? buildFrame(compare.setupA, displayTime, previewProbeX) : null;
  const compareBFrame = compare ? buildFrame(compare.setupB, displayTime, previewProbeX) : null;
  const {
    compareEnabled,
    previewedSetup,
    primaryFrame,
    primaryLabel,
  } = resolveCompareScene({
    compare,
    graphPreview,
    activeFrame,
    frameA: compareAFrame,
    frameB: compareBFrame,
    liveLabel: "Live setup",
  });
  const previewBadge = graphPreview?.kind === "time"
    ? (
      <SimulationPreviewBadge tone="teal">
        preview t = {formatNumber(displayTime)} s
      </SimulationPreviewBadge>
    )
    : graphPreview?.kind === "response"
      ? (
        <SimulationPreviewBadge>
          preview x = {formatMeasurement(previewProbeX ?? 0, "m")}
        </SimulationPreviewBadge>
      )
      : null;
  const metricRows = [
    {
      label: "v",
      value: formatMeasurement(primaryFrame.snapshot.waveSpeed, "m/s"),
    },
    {
      label: "lambda",
      value: formatMeasurement(primaryFrame.snapshot.wavelength, "m"),
    },
    {
      label: "f",
      value: formatMeasurement(primaryFrame.snapshot.frequency, "Hz"),
    },
    {
      label: "T",
      value: formatMeasurement(primaryFrame.snapshot.period, "s"),
    },
    {
      label: "probe x",
      value: formatMeasurement(primaryFrame.snapshot.probeX, "m"),
    },
    {
      label: "probe y",
      value: formatMeasurement(primaryFrame.snapshot.probeDisplacement, "m"),
    },
  ];
  const noteLines = [
    `Delay to the probe = ${formatMeasurement(primaryFrame.snapshot.travelDelay, "s")}.`,
    `Phase lag = ${formatNumber(primaryFrame.snapshot.phaseLagCycles)} cycles (${primaryFrame.snapshot.phaseAlignmentLabel}).`,
    `One period of travel covers ${formatMeasurement(primaryFrame.snapshot.distancePerPeriod, "m")}.`,
  ];

  function handleAdjustProbe(nextProbeX: number) {
    setParam(
      "probeX",
      Number(clamp(nextProbeX, 0, WAVE_SPEED_WAVELENGTH_STAGE_LENGTH).toFixed(2)),
    );
  }

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(78,166,223,0.1),rgba(30,166,162,0.08))]"
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
                interactive: compare?.activeTarget === "a",
                overlayValues,
                focusedOverlayId,
                muted: previewedSetup === "b",
                onAdjustProbe: handleAdjustProbe,
              })}
              {renderWaveRow(compareBFrame!, COMPARE_ROW_CENTERS.b, {
                label: compare?.labelB ?? "Setup B",
                compareBadge: compare?.activeTarget === "b" ? "editing" : "locked",
                interactive: compare?.activeTarget === "b",
                overlayValues,
                focusedOverlayId,
                muted: previewedSetup === "a",
                onAdjustProbe: handleAdjustProbe,
              })}
            </>
          ) : (
            renderWaveRow(activeFrame, SINGLE_ROW_CENTER, {
              label: "Live traveling wave",
              interactive: true,
              overlayValues,
              focusedOverlayId,
              onAdjustProbe: handleAdjustProbe,
            })
          )}
          <SimulationReadoutCard
            x={CARD_X}
            y={CARD_Y}
            width={CARD_WIDTH}
            title="Wave state"
            setupLabel={compareEnabled ? primaryLabel : undefined}
            rows={metricRows}
            noteLines={noteLines}
          />
        </svg>
        <SimulationReadoutSummary
          title="Wave state"
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={noteLines}
          className="mx-3 mb-3 mt-0 md:hidden"
        />
      </div>
    </SimulationSceneCard>
  );
}
