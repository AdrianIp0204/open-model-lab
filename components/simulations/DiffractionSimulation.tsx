"use client";

import {
  clamp,
  DIFFRACTION_SCREEN_HALF_HEIGHT,
  DIFFRACTION_WAVE_SPEED,
  formatMeasurement,
  formatNumber,
  sampleDiffractionPattern,
  sampleDiffractionState,
  sampleRange,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
  resolveDiffractionParams,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
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

type DiffractionSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type DiffractionFrame = {
  params: ReturnType<typeof resolveDiffractionParams>;
  snapshot: ReturnType<typeof sampleDiffractionState>;
};

const WIDTH = 760;
const HEIGHT = 324;
const BARRIER_X = 270;
const BARRIER_WIDTH = 24;
const SCREEN_X = 530;
const SCREEN_WIDTH = 18;
const BASELINE_PROBE_X = SCREEN_X + SCREEN_WIDTH + 18;
const CARD_WIDTH = 188;
const CARD_X = WIDTH - CARD_WIDTH - 14;
const CARD_Y = HEIGHT - 92;
const ROW_SCALE = 20;
const PROBE_OFFSET_SCALE = 18;
const SPATIAL_SCALE = 38;
const SCREEN_SEGMENTS = 76;
const SINGLE_ROW_CENTER = 176;
const COMPARE_ROW_CENTERS: Record<GraphSeriesSetupId, number> = {
  a: 104,
  b: 236,
};

function mixColor(start: [number, number, number], end: [number, number, number], amount: number) {
  return start.map((channel, index) =>
    Math.round(channel + (end[index] - channel) * amount),
  ) as [number, number, number];
}

function toRgbString([red, green, blue]: [number, number, number]) {
  return `rgb(${red}, ${green}, ${blue})`;
}

function intensityColor(intensity: number) {
  const safeIntensity = clamp(intensity, 0, 1);
  const shadow: [number, number, number] = [14, 28, 36];
  const glow: [number, number, number] = [240, 171, 60];
  const highlight: [number, number, number] = [255, 246, 220];

  return toRgbString(
    safeIntensity < 0.65
      ? mixColor(shadow, glow, safeIntensity / 0.65)
      : mixColor(glow, highlight, (safeIntensity - 0.65) / 0.35),
  );
}

function rowTop(rowCenter: number) {
  return rowCenter - DIFFRACTION_SCREEN_HALF_HEIGHT * ROW_SCALE;
}

function rowBottom(rowCenter: number) {
  return rowCenter + DIFFRACTION_SCREEN_HALF_HEIGHT * ROW_SCALE;
}

function stageYFromPhysical(physicalY: number, rowCenter: number) {
  return rowCenter - physicalY * ROW_SCALE;
}

function physicalYFromStage(stageY: number, rowCenter: number) {
  return clamp(
    (rowCenter - stageY) / ROW_SCALE,
    -DIFFRACTION_SCREEN_HALF_HEIGHT,
    DIFFRACTION_SCREEN_HALF_HEIGHT,
  );
}

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  return resolveOverlayOpacity(focusedOverlayId, overlayId, 0.42);
}

function buildFrame(
  source: SimulationParams,
  time: number,
  previewProbeY?: number,
): DiffractionFrame {
  const params = resolveDiffractionParams(source);
  return {
    params,
    snapshot: sampleDiffractionState(params, time, previewProbeY),
  };
}

function resolveWavefrontHalfAngle(frame: DiffractionFrame) {
  if (frame.snapshot.firstMinimumAngleRad !== null) {
    return clamp(frame.snapshot.firstMinimumAngleRad * 1.18, 0.26, 1.02);
  }

  return clamp(0.32 + frame.snapshot.wavelengthToSlitRatio * 0.32, 0.32, 1.02);
}

function buildOutgoingArcPath(radius: number, rowCenter: number, halfAngle: number) {
  return sampleRange(-halfAngle, halfAngle, 48)
    .map((angle, index) => {
      const x = BARRIER_X + radius * Math.cos(angle);
      const y = rowCenter + radius * Math.sin(angle);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function renderIncomingWavefronts(frame: DiffractionFrame, rowCenter: number) {
  const travelShift =
    ((DIFFRACTION_WAVE_SPEED * frame.snapshot.time) % frame.params.wavelength) * SPATIAL_SCALE;
  const wavelengthPx = frame.params.wavelength * SPATIAL_SCALE;
  const top = rowTop(rowCenter) + 14;
  const bottom = rowBottom(rowCenter) - 14;
  const wavefronts = Array.from({ length: 6 }, (_, index) => {
    const x = BARRIER_X - 34 - travelShift - index * wavelengthPx;
    return x;
  }).filter((x) => x >= 72);

  return (
    <g opacity="0.95">
      {wavefronts.map((x, index) => (
        <line
          key={`incoming-${rowCenter}-${index}`}
          x1={x}
          x2={x}
          y1={top}
          y2={bottom}
          stroke="rgba(30,166,162,0.6)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
      <text
        x="74"
        y={top - 6}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        incoming wavefronts
      </text>
    </g>
  );
}

function renderOutgoingWavefronts(frame: DiffractionFrame, rowCenter: number) {
  const travelShift =
    ((DIFFRACTION_WAVE_SPEED * frame.snapshot.time) % frame.params.wavelength) * SPATIAL_SCALE;
  const halfAngle = resolveWavefrontHalfAngle(frame);
  const radii = Array.from({ length: 6 }, (_, index) => 30 + index * frame.params.wavelength * SPATIAL_SCALE - travelShift)
    .filter((radius) => radius > 12 && BARRIER_X + radius < SCREEN_X - 8);

  return (
    <g opacity="0.92">
      {radii.map((radius, index) => (
        <path
          key={`outgoing-${rowCenter}-${index}`}
          d={buildOutgoingArcPath(radius, rowCenter, halfAngle)}
          fill="none"
          stroke="rgba(78,166,223,0.78)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
}

function renderBarrier(frame: DiffractionFrame, rowCenter: number) {
  const top = rowTop(rowCenter) - 12;
  const bottom = rowBottom(rowCenter) + 12;
  const slitTopY = stageYFromPhysical(frame.params.slitWidth / 2, rowCenter);
  const slitBottomY = stageYFromPhysical(-frame.params.slitWidth / 2, rowCenter);

  return (
    <>
      <rect
        x={BARRIER_X - BARRIER_WIDTH / 2}
        y={top}
        width={BARRIER_WIDTH}
        height={slitTopY - top}
        rx="10"
        fill="rgba(15,28,36,0.88)"
      />
      <rect
        x={BARRIER_X - BARRIER_WIDTH / 2}
        y={slitBottomY}
        width={BARRIER_WIDTH}
        height={bottom - slitBottomY}
        rx="10"
        fill="rgba(15,28,36,0.88)"
      />
      <rect
        x={BARRIER_X - 2}
        y={slitTopY}
        width="4"
        height={slitBottomY - slitTopY}
        rx="2"
        fill="rgba(255,253,247,0.92)"
      />
    </>
  );
}

function renderSlitWidthGuide(
  frame: DiffractionFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const opacity = overlayWeight(focusedOverlayId, "slitWidthGuide");
  const guideX = BARRIER_X - 34;
  const topY = stageYFromPhysical(frame.params.slitWidth / 2, rowCenter);
  const bottomY = stageYFromPhysical(-frame.params.slitWidth / 2, rowCenter);
  const emphasized = focusedOverlayId === "slitWidthGuide";

  return (
    <g opacity={opacity}>
      <line
        x1={guideX}
        x2={guideX}
        y1={topY}
        y2={bottomY}
        stroke="rgba(240,171,60,0.88)"
        strokeWidth={emphasized ? "3" : "2"}
      />
      <line
        x1={guideX - 7}
        x2={guideX + 7}
        y1={topY}
        y2={topY}
        stroke="rgba(240,171,60,0.88)"
        strokeWidth={emphasized ? "3" : "2"}
      />
      <line
        x1={guideX - 7}
        x2={guideX + 7}
        y1={bottomY}
        y2={bottomY}
        stroke="rgba(240,171,60,0.88)"
        strokeWidth={emphasized ? "3" : "2"}
      />
      <text
        x={guideX - 12}
        y={(topY + bottomY) / 2 - 4}
        textAnchor="end"
        className="fill-amber-700 text-[11px] font-semibold"
      >
        slit width {formatMeasurement(frame.params.slitWidth, "m")}
      </text>
    </g>
  );
}

function renderEdgePaths(
  frame: DiffractionFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const opacity = overlayWeight(focusedOverlayId, "edgePaths");
  const emphasized = focusedOverlayId === "edgePaths";
  const probeStageY = stageYFromPhysical(frame.snapshot.probe.y, rowCenter);
  const slitTopY = stageYFromPhysical(frame.params.slitWidth / 2, rowCenter);
  const slitBottomY = stageYFromPhysical(-frame.params.slitWidth / 2, rowCenter);
  const strokeWidth = emphasized ? 3 : 2;

  return (
    <g opacity={opacity}>
      <line
        x1={BARRIER_X}
        x2={SCREEN_X + SCREEN_WIDTH / 2}
        y1={slitTopY}
        y2={probeStageY}
        stroke="rgba(30,166,162,0.76)"
        strokeWidth={strokeWidth}
      />
      <line
        x1={BARRIER_X}
        x2={SCREEN_X + SCREEN_WIDTH / 2}
        y1={slitBottomY}
        y2={probeStageY}
        stroke="rgba(78,166,223,0.76)"
        strokeWidth={strokeWidth}
      />
      <text
        x={BARRIER_X + 24}
        y={slitTopY - 8}
        className="fill-teal-700 text-[11px] font-semibold"
      >
        top path {formatMeasurement(frame.snapshot.topPath, "m")}
      </text>
      <text
        x={BARRIER_X + 24}
        y={slitBottomY + 20}
        className="fill-sky-700 text-[11px] font-semibold"
      >
        bottom path {formatMeasurement(frame.snapshot.bottomPath, "m")}
      </text>
      <text
        x={SCREEN_X - 10}
        y={rowTop(rowCenter) - 8}
        textAnchor="end"
        className="fill-ink-500 text-[11px] font-semibold"
      >
        edge path difference {formatMeasurement(frame.snapshot.edgePathDifference, "m")} ({formatNumber(frame.snapshot.edgePathDifferenceInWavelengths)} wavelengths)
      </text>
    </g>
  );
}

function renderFirstMinimumGuide(
  frame: DiffractionFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  if (
    frame.snapshot.firstMinimumScreenY === null ||
    frame.snapshot.firstMinimumScreenY > DIFFRACTION_SCREEN_HALF_HEIGHT
  ) {
    return null;
  }

  const opacity = overlayWeight(focusedOverlayId, "firstMinimumGuide");
  const emphasized = focusedOverlayId === "firstMinimumGuide";
  const offset = frame.snapshot.firstMinimumScreenY;
  const topY = stageYFromPhysical(offset, rowCenter);
  const bottomY = stageYFromPhysical(-offset, rowCenter);

  return (
    <g opacity={opacity}>
      {[topY, bottomY].map((y, index) => (
        <g key={`${rowCenter}-${index}`}>
          <line
            x1={BARRIER_X}
            x2={SCREEN_X + SCREEN_WIDTH / 2}
            y1={rowCenter}
            y2={y}
            stroke="rgba(241,102,89,0.72)"
            strokeDasharray="8 7"
            strokeWidth={emphasized ? "3" : "2"}
          />
          <circle
            cx={SCREEN_X + SCREEN_WIDTH / 2}
            cy={y}
            r="6"
            fill="rgba(255,253,247,0.92)"
            stroke="rgba(241,102,89,0.9)"
            strokeWidth="2"
          />
        </g>
      ))}
      <text
        x={SCREEN_X - 10}
        y={rowTop(rowCenter) + 14}
        textAnchor="end"
        className="fill-coral-700 text-[11px] font-semibold"
      >
        first dark bands about +/-{formatMeasurement(frame.snapshot.firstMinimumScreenY, "m")}
      </text>
    </g>
  );
}

function renderScreenPattern(
  frame: DiffractionFrame,
  rowCenter: number,
  options?: {
    interactive?: boolean;
    onAdjustProbe?: (probeY: number) => void;
  },
) {
  const probeStageY = stageYFromPhysical(frame.snapshot.probe.y, rowCenter);
  const baselineProbeX = BASELINE_PROBE_X;
  const probeX = baselineProbeX + frame.snapshot.probeDisplacement * PROBE_OFFSET_SCALE;
  const top = rowTop(rowCenter);
  const bottom = rowBottom(rowCenter);
  const stripHeight = bottom - top;
  const segments = sampleRange(
    -DIFFRACTION_SCREEN_HALF_HEIGHT,
    DIFFRACTION_SCREEN_HALF_HEIGHT,
    SCREEN_SEGMENTS + 1,
  );

  return (
    <>
      {segments.slice(0, -1).map((segmentStart, index) => {
        const segmentEnd = segments[index + 1];
        const centerY = (segmentStart + segmentEnd) / 2;
        const pattern = sampleDiffractionPattern(frame.params, centerY);
        const y1 = stageYFromPhysical(segmentStart, rowCenter);
        const y2 = stageYFromPhysical(segmentEnd, rowCenter);

        return (
          <rect
            key={`pattern-${rowCenter}-${index}`}
            x={SCREEN_X}
            y={Math.min(y1, y2)}
            width={SCREEN_WIDTH}
            height={Math.max(1, Math.abs(y2 - y1))}
            fill={intensityColor(pattern.normalizedIntensity)}
            opacity="0.96"
          />
        );
      })}
      <rect
        x={SCREEN_X}
        y={top}
        width={SCREEN_WIDTH}
        height={stripHeight}
        rx="10"
        fill="none"
        stroke="rgba(15,28,36,0.24)"
        strokeWidth="2"
      />
      {options?.interactive ? (
        <SimulationAxisDragSurface
          axis="y"
          svgWidth={WIDTH}
          svgHeight={HEIGHT}
          value={frame.snapshot.probe.y}
          region={{
            x: SCREEN_X - 12,
            y: top,
            width: SCREEN_WIDTH + 44,
            height: stripHeight,
          }}
          ariaLabel={`Move probe height, current y ${formatNumber(frame.snapshot.probe.y)} meters`}
          cursor="ns-resize"
          step={0.1}
          resolveValue={(svgY) => physicalYFromStage(svgY, rowCenter)}
          onChange={(nextValue) => options.onAdjustProbe?.(nextValue)}
          homeValue={0}
        />
      ) : null}
      <line
        x1={SCREEN_X + SCREEN_WIDTH}
        x2={baselineProbeX}
        y1={probeStageY}
        y2={probeStageY}
        stroke="rgba(15,28,36,0.18)"
        strokeDasharray="6 6"
      />
      <circle
        cx={SCREEN_X + SCREEN_WIDTH / 2}
        cy={probeStageY}
        r="7"
        fill="rgba(255,253,247,0.92)"
        stroke="#0f1c24"
        strokeWidth="2"
      />
      <circle
        cx={probeX}
        cy={probeStageY}
        r="8"
        fill="#f16659"
        stroke="rgba(255,255,255,0.92)"
        strokeWidth="2.5"
      />
      <text
        x={SCREEN_X - 8}
        y={bottom + 18}
        textAnchor="end"
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.12em]"
      >
        screen pattern
      </text>
      <text
        x={BASELINE_PROBE_X + 46}
        y={probeStageY + 4}
        className="fill-ink-600 text-[11px] font-semibold"
      >
        probe
      </text>
    </>
  );
}

function renderWaveRow(
  frame: DiffractionFrame,
  rowCenter: number,
  options: {
    label: string;
    compareBadge?: string;
    interactive?: boolean;
    overlayValues?: Record<string, boolean>;
    focusedOverlayId?: string | null;
    muted?: boolean;
    onAdjustProbe?: (probeY: number) => void;
  },
) {
  const rowOpacity = options.muted ? 0.76 : 1;
  const values = options.overlayValues ?? {};

  return (
    <g opacity={rowOpacity}>
      <rect
        x="56"
        y={rowTop(rowCenter) - 16}
        width="506"
        height={rowBottom(rowCenter) - rowTop(rowCenter) + 32}
        rx="24"
        fill="rgba(255,255,255,0.28)"
        stroke={options.interactive ? "rgba(78,166,223,0.24)" : "rgba(15,28,36,0.08)"}
        strokeWidth={options.interactive ? "2" : "1.5"}
      />
      <text
        x="72"
        y={rowTop(rowCenter) - 4}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.12em]"
      >
        {options.label}
        {options.compareBadge ? ` - ${options.compareBadge}` : ""}
      </text>
      {renderIncomingWavefronts(frame, rowCenter)}
      {renderOutgoingWavefronts(frame, rowCenter)}
      {renderBarrier(frame, rowCenter)}
      {values.slitWidthGuide ?? true
        ? renderSlitWidthGuide(frame, rowCenter, options.focusedOverlayId)
        : null}
      {values.edgePaths ?? true
        ? renderEdgePaths(frame, rowCenter, options.focusedOverlayId)
        : null}
      {values.firstMinimumGuide ?? false
        ? renderFirstMinimumGuide(frame, rowCenter, options.focusedOverlayId)
        : null}
      {renderScreenPattern(frame, rowCenter, {
        interactive: options.interactive,
        onAdjustProbe: options.onAdjustProbe,
      })}
    </g>
  );
}

export function DiffractionSimulation({
  concept,
  params,
  time,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: DiffractionSimulationProps) {
  const displayTime =
    graphPreview?.kind === "time" || graphPreview?.kind === "trajectory"
      ? graphPreview.time
      : time;
  const previewProbeY =
    graphPreview?.kind === "response" && graphPreview.graphId === "pattern"
      ? clamp(
          graphPreview.point.x,
          -DIFFRACTION_SCREEN_HALF_HEIGHT,
          DIFFRACTION_SCREEN_HALF_HEIGHT,
        )
      : undefined;
  const activeFrame = buildFrame(params, displayTime, previewProbeY);
  const compareAFrame = compare ? buildFrame(compare.setupA, displayTime, previewProbeY) : null;
  const compareBFrame = compare ? buildFrame(compare.setupB, displayTime, previewProbeY) : null;
  const { compareEnabled, previewedSetup, primaryFrame, primaryLabel, secondaryLabel } =
    resolveCompareScene({
      compare,
      graphPreview,
      activeFrame,
      frameA: compareAFrame,
      frameB: compareBFrame,
      liveLabel: "Live setup",
    });
  const previewBadge =
    graphPreview && (graphPreview.kind === "time" || graphPreview.kind === "trajectory") ? (
      <SimulationPreviewBadge tone="teal">
        preview {graphPreview.seriesLabel} t = {formatNumber(displayTime)} s
      </SimulationPreviewBadge>
    ) : graphPreview ? (
      <SimulationPreviewBadge>
        preview screen y = {formatMeasurement(previewProbeY ?? 0, "m")}
      </SimulationPreviewBadge>
    ) : null;
  const metricRows = [
    {
      label: "spread ratio",
      value: formatNumber(primaryFrame.snapshot.wavelengthToSlitRatio),
    },
    {
      label: "probe intensity",
      value: formatNumber(primaryFrame.snapshot.normalizedIntensity),
    },
    {
      label: "first minimum",
      value:
        primaryFrame.snapshot.firstMinimumAngleDeg === null
          ? "none"
          : formatMeasurement(primaryFrame.snapshot.firstMinimumAngleDeg, "deg"),
    },
  ];
  const readoutY = compareEnabled ? 14 : CARD_Y;

  function handleAdjustProbe(nextProbeY: number) {
    setParam("probeY", Number(nextProbeY.toFixed(2)));
  }

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(30,166,162,0.08),rgba(240,171,60,0.08))]"
      headerAside={
        <>
          {previewBadge}
          {compareEnabled ? (
            <CompareLegend primaryLabel={primaryLabel} secondaryLabel={secondaryLabel} />
          ) : (
            <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-600">
              {primaryLabel}
            </span>
          )}
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
            label: "Live pattern",
            interactive: true,
            overlayValues,
            focusedOverlayId,
            onAdjustProbe: handleAdjustProbe,
          })
        )}
        <SimulationReadoutCard
          x={CARD_X}
          y={readoutY}
          width={CARD_WIDTH}
          title="Live readout"
          variant="hud"
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
        />
      </svg>
    </SimulationSceneCard>
  );
}
