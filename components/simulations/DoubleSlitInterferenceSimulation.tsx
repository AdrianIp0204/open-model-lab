"use client";

import {
  clamp,
  DOUBLE_SLIT_INTERFERENCE_MAX_SCREEN_DISTANCE,
  DOUBLE_SLIT_INTERFERENCE_MIN_SCREEN_DISTANCE,
  DOUBLE_SLIT_INTERFERENCE_SCREEN_HALF_HEIGHT,
  DOUBLE_SLIT_INTERFERENCE_WAVE_SPEED,
  formatMeasurement,
  formatNumber,
  sampleDoubleSlitInterferencePattern,
  sampleDoubleSlitInterferenceState,
  sampleRange,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
  resolveDoubleSlitInterferenceParams,
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

type DoubleSlitInterferenceSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type DoubleSlitFrame = {
  params: ReturnType<typeof resolveDoubleSlitInterferenceParams>;
  snapshot: ReturnType<typeof sampleDoubleSlitInterferenceState>;
};

const WIDTH = 760;
const HEIGHT = 324;
const BARRIER_X = 256;
const BARRIER_WIDTH = 24;
const SCREEN_X_MIN = 486;
const SCREEN_X_MAX = 548;
const SCREEN_WIDTH = 18;
const BASELINE_PROBE_GAP = 18;
const CARD_WIDTH = 208;
const CARD_X = WIDTH - CARD_WIDTH - 16;
const CARD_Y = 16;
const ROW_SCALE = 22;
const FIELD_OFFSET_SCALE = 17;
const WAVE_OFFSET_SCALE = 10;
const SPATIAL_SCALE = 36;
const PATH_SAMPLE_COUNT = 54;
const SCREEN_SEGMENTS = 76;
const SLIT_OPENING_HEIGHT = 16;
const SINGLE_ROW_CENTER = 176;
const COMPARE_ROW_CENTERS: Record<GraphSeriesSetupId, number> = {
  a: 104,
  b: 236,
};

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

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
  return rowCenter - DOUBLE_SLIT_INTERFERENCE_SCREEN_HALF_HEIGHT * ROW_SCALE;
}

function rowBottom(rowCenter: number) {
  return rowCenter + DOUBLE_SLIT_INTERFERENCE_SCREEN_HALF_HEIGHT * ROW_SCALE;
}

function stageYFromPhysical(physicalY: number, rowCenter: number) {
  return rowCenter - physicalY * ROW_SCALE;
}

function physicalYFromStage(stageY: number, rowCenter: number) {
  return clamp(
    (rowCenter - stageY) / ROW_SCALE,
    -DOUBLE_SLIT_INTERFERENCE_SCREEN_HALF_HEIGHT,
    DOUBLE_SLIT_INTERFERENCE_SCREEN_HALF_HEIGHT,
  );
}

function stageXFromDistance(screenDistance: number) {
  const ratio =
    (screenDistance - DOUBLE_SLIT_INTERFERENCE_MIN_SCREEN_DISTANCE) /
    (DOUBLE_SLIT_INTERFERENCE_MAX_SCREEN_DISTANCE -
      DOUBLE_SLIT_INTERFERENCE_MIN_SCREEN_DISTANCE);

  return lerp(SCREEN_X_MIN, SCREEN_X_MAX, clamp(ratio, 0, 1));
}

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  return resolveOverlayOpacity(focusedOverlayId, overlayId, 0.42);
}

function buildFrame(
  source: SimulationParams,
  time: number,
  previewProbeY?: number,
): DoubleSlitFrame {
  const params = resolveDoubleSlitInterferenceParams(source);
  return {
    params,
    snapshot: sampleDoubleSlitInterferenceState(params, time, previewProbeY),
  };
}

function buildWavePath(
  frame: DoubleSlitFrame,
  slitKey: "upper" | "lower",
  rowCenter: number,
  screenX: number,
) {
  const sourcePhysicalY =
    slitKey === "upper" ? frame.params.slitSeparation / 2 : -frame.params.slitSeparation / 2;
  const sourceStageY = stageYFromPhysical(sourcePhysicalY, rowCenter);
  const probeStageY = stageYFromPhysical(frame.snapshot.probe.y, rowCenter);
  const pathLength = slitKey === "upper" ? frame.snapshot.upperPath : frame.snapshot.lowerPath;
  const dx = screenX - BARRIER_X;
  const dy = probeStageY - sourceStageY;
  const norm = Math.hypot(dx, dy) || 1;
  const normalX = -dy / norm;
  const normalY = dx / norm;

  return sampleRange(0, 1, PATH_SAMPLE_COUNT)
    .map((progress, index) => {
      const baseX = lerp(BARRIER_X, screenX, progress);
      const baseY = lerp(sourceStageY, probeStageY, progress);
      const travelDistance = pathLength * progress;
      const localPhase =
        frame.snapshot.wavenumber * travelDistance -
        frame.snapshot.angularFrequency * frame.snapshot.time;
      const offset = Math.sin(localPhase) * WAVE_OFFSET_SCALE;
      const pointX = baseX + normalX * offset;
      const pointY = baseY + normalY * offset;

      return `${index === 0 ? "M" : "L"} ${pointX.toFixed(2)} ${pointY.toFixed(2)}`;
    })
    .join(" ");
}

function renderIncomingWavefronts(frame: DoubleSlitFrame, rowCenter: number) {
  const travelShift =
    ((DOUBLE_SLIT_INTERFERENCE_WAVE_SPEED * frame.snapshot.time) % frame.params.wavelength) *
    SPATIAL_SCALE;
  const wavelengthPx = frame.params.wavelength * SPATIAL_SCALE;
  const top = rowTop(rowCenter) + 14;
  const bottom = rowBottom(rowCenter) - 14;
  const wavefronts = Array.from({ length: 7 }, (_, index) => {
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

function renderBarrier(frame: DoubleSlitFrame, rowCenter: number) {
  const top = rowTop(rowCenter) - 12;
  const bottom = rowBottom(rowCenter) + 12;
  const upperCenterY = stageYFromPhysical(frame.params.slitSeparation / 2, rowCenter);
  const lowerCenterY = stageYFromPhysical(-frame.params.slitSeparation / 2, rowCenter);
  const upperTop = upperCenterY - SLIT_OPENING_HEIGHT / 2;
  const upperBottom = upperCenterY + SLIT_OPENING_HEIGHT / 2;
  const lowerTop = lowerCenterY - SLIT_OPENING_HEIGHT / 2;
  const lowerBottom = lowerCenterY + SLIT_OPENING_HEIGHT / 2;

  return (
    <>
      <rect
        x={BARRIER_X - BARRIER_WIDTH / 2}
        y={top}
        width={BARRIER_WIDTH}
        height={upperTop - top}
        rx="10"
        fill="rgba(15,28,36,0.88)"
      />
      <rect
        x={BARRIER_X - BARRIER_WIDTH / 2}
        y={upperBottom}
        width={BARRIER_WIDTH}
        height={lowerTop - upperBottom}
        rx="10"
        fill="rgba(15,28,36,0.88)"
      />
      <rect
        x={BARRIER_X - BARRIER_WIDTH / 2}
        y={lowerBottom}
        width={BARRIER_WIDTH}
        height={bottom - lowerBottom}
        rx="10"
        fill="rgba(15,28,36,0.88)"
      />
      <rect
        x={BARRIER_X - 2}
        y={upperTop}
        width="4"
        height={SLIT_OPENING_HEIGHT}
        rx="2"
        fill="rgba(255,253,247,0.92)"
      />
      <rect
        x={BARRIER_X - 2}
        y={lowerTop}
        width="4"
        height={SLIT_OPENING_HEIGHT}
        rx="2"
        fill="rgba(255,253,247,0.92)"
      />
    </>
  );
}

function renderGeometryGuide(
  frame: DoubleSlitFrame,
  rowCenter: number,
  screenX: number,
  focusedOverlayId?: string | null,
) {
  const opacity = overlayWeight(focusedOverlayId, "geometryGuide");
  const emphasized = focusedOverlayId === "geometryGuide";
  const upperY = stageYFromPhysical(frame.params.slitSeparation / 2, rowCenter);
  const lowerY = stageYFromPhysical(-frame.params.slitSeparation / 2, rowCenter);
  const guideX = BARRIER_X - 36;
  const distanceY = rowBottom(rowCenter) + 18;
  const strokeWidth = emphasized ? 3 : 2;

  return (
    <g opacity={opacity}>
      <line
        x1={guideX}
        x2={guideX}
        y1={upperY}
        y2={lowerY}
        stroke="rgba(30,166,162,0.88)"
        strokeWidth={strokeWidth}
      />
      <line
        x1={guideX - 7}
        x2={guideX + 7}
        y1={upperY}
        y2={upperY}
        stroke="rgba(30,166,162,0.88)"
        strokeWidth={strokeWidth}
      />
      <line
        x1={guideX - 7}
        x2={guideX + 7}
        y1={lowerY}
        y2={lowerY}
        stroke="rgba(30,166,162,0.88)"
        strokeWidth={strokeWidth}
      />
      <text
        x={guideX - 12}
        y={(upperY + lowerY) / 2 - 4}
        textAnchor="end"
        className="fill-teal-700 text-[11px] font-semibold"
      >
        d = {formatMeasurement(frame.params.slitSeparation, "m")}
      </text>
      <line
        x1={BARRIER_X}
        x2={screenX}
        y1={distanceY}
        y2={distanceY}
        stroke="rgba(78,166,223,0.88)"
        strokeWidth={strokeWidth}
      />
      <line
        x1={BARRIER_X}
        x2={BARRIER_X}
        y1={distanceY - 7}
        y2={distanceY + 7}
        stroke="rgba(78,166,223,0.88)"
        strokeWidth={strokeWidth}
      />
      <line
        x1={screenX}
        x2={screenX}
        y1={distanceY - 7}
        y2={distanceY + 7}
        stroke="rgba(78,166,223,0.88)"
        strokeWidth={strokeWidth}
      />
      <text
        x={(BARRIER_X + screenX) / 2}
        y={distanceY - 10}
        textAnchor="middle"
        className="fill-sky-700 text-[11px] font-semibold"
      >
        L = {formatMeasurement(frame.params.screenDistance, "m")}
      </text>
    </g>
  );
}

function renderPathDifference(
  frame: DoubleSlitFrame,
  rowCenter: number,
  screenX: number,
  focusedOverlayId?: string | null,
) {
  const opacity = overlayWeight(focusedOverlayId, "pathDifference");
  const emphasized = focusedOverlayId === "pathDifference";
  const probeStageY = stageYFromPhysical(frame.snapshot.probe.y, rowCenter);
  const upperY = stageYFromPhysical(frame.params.slitSeparation / 2, rowCenter);
  const lowerY = stageYFromPhysical(-frame.params.slitSeparation / 2, rowCenter);
  const strokeWidth = emphasized ? 3 : 2;

  return (
    <g opacity={opacity}>
      <line
        x1={BARRIER_X}
        x2={screenX + SCREEN_WIDTH / 2}
        y1={upperY}
        y2={probeStageY}
        stroke="rgba(30,166,162,0.8)"
        strokeWidth={strokeWidth}
      />
      <line
        x1={BARRIER_X}
        x2={screenX + SCREEN_WIDTH / 2}
        y1={lowerY}
        y2={probeStageY}
        stroke="rgba(78,166,223,0.8)"
        strokeWidth={strokeWidth}
      />
      <text
        x={BARRIER_X + 26}
        y={upperY - 10}
        className="fill-teal-700 text-[11px] font-semibold"
      >
        r1 = {formatMeasurement(frame.snapshot.upperPath, "m")}
      </text>
      <text
        x={BARRIER_X + 26}
        y={lowerY + 22}
        className="fill-sky-700 text-[11px] font-semibold"
      >
        r2 = {formatMeasurement(frame.snapshot.lowerPath, "m")}
      </text>
      <text
        x={screenX - 10}
        y={rowTop(rowCenter) - 8}
        textAnchor="end"
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        delta r {formatMeasurement(Math.abs(frame.snapshot.pathDifference), "m")} ({formatNumber(frame.snapshot.pathDifferenceInWavelengths)} lambda)
      </text>
    </g>
  );
}

function renderFringeSpacingGuide(
  frame: DoubleSlitFrame,
  rowCenter: number,
  screenX: number,
  focusedOverlayId?: string | null,
) {
  const opacity = overlayWeight(focusedOverlayId, "fringeSpacingGuide");
  const emphasized = focusedOverlayId === "fringeSpacingGuide";
  const centerY = rowCenter;
  const firstBright = frame.snapshot.firstBrightYApprox;
  const firstDark = frame.snapshot.firstDarkYApprox;
  const brightStageY = stageYFromPhysical(firstBright, rowCenter);
  const darkStageY = stageYFromPhysical(firstDark, rowCenter);
  const guideX = screenX + SCREEN_WIDTH + 24;
  const strokeWidth = emphasized ? 3 : 2;

  return (
    <g opacity={opacity}>
      {firstDark <= DOUBLE_SLIT_INTERFERENCE_SCREEN_HALF_HEIGHT ? (
        <>
          <line
            x1={screenX - 2}
            x2={screenX + SCREEN_WIDTH + 2}
            y1={darkStageY}
            y2={darkStageY}
            stroke="rgba(241,102,89,0.68)"
            strokeDasharray="6 6"
            strokeWidth={strokeWidth}
          />
          <text
            x={guideX + 18}
            y={darkStageY + 4}
            className="fill-coral-700 text-[11px] font-semibold"
          >
            1st dark
          </text>
        </>
      ) : null}
      {firstBright <= DOUBLE_SLIT_INTERFERENCE_SCREEN_HALF_HEIGHT ? (
        <>
          <line
            x1={guideX}
            x2={guideX}
            y1={centerY}
            y2={brightStageY}
            stroke="rgba(240,171,60,0.88)"
            strokeWidth={strokeWidth}
          />
          <line
            x1={guideX - 7}
            x2={guideX + 7}
            y1={centerY}
            y2={centerY}
            stroke="rgba(240,171,60,0.88)"
            strokeWidth={strokeWidth}
          />
          <line
            x1={guideX - 7}
            x2={guideX + 7}
            y1={brightStageY}
            y2={brightStageY}
            stroke="rgba(240,171,60,0.88)"
            strokeWidth={strokeWidth}
          />
          <text
            x={guideX + 14}
            y={(centerY + brightStageY) / 2 - 4}
            className="fill-amber-700 text-[11px] font-semibold"
          >
            delta y = {formatMeasurement(frame.snapshot.fringeSpacing, "m")}
          </text>
        </>
      ) : (
        <text
          x={guideX}
          y={rowTop(rowCenter) + 14}
          className="fill-amber-700 text-[11px] font-semibold"
        >
          {"delta y > screen"}
        </text>
      )}
    </g>
  );
}

function renderPhaseWheel(
  frame: DoubleSlitFrame,
  title: string,
  overlayOpacity = 1,
) {
  const cardX = 18;
  const cardY = 18;
  const cardWidth = 220;
  const cardHeight = 94;
  const centerX = cardX + 48;
  const centerY = cardY + 52;
  const radius = 24;
  const vectorScale = radius / 2;
  const slit1EndX = centerX + vectorScale;
  const slit1EndY = centerY;
  const slit2EndX = centerX + Math.cos(frame.snapshot.phaseDifference) * vectorScale;
  const slit2EndY = centerY - Math.sin(frame.snapshot.phaseDifference) * vectorScale;
  const resultantEndX =
    centerX +
    Math.cos(frame.snapshot.phaseDifference / 2) * frame.snapshot.resultantAmplitude * vectorScale;
  const resultantEndY =
    centerY -
    Math.sin(frame.snapshot.phaseDifference / 2) * frame.snapshot.resultantAmplitude * vectorScale;

  return (
    <g pointerEvents="none" opacity={overlayOpacity}>
      <rect
        x={cardX}
        y={cardY}
        width={cardWidth}
        height={cardHeight}
        rx="18"
        fill="rgba(255,253,247,0.95)"
        stroke="rgba(15,28,36,0.12)"
        strokeWidth="1.5"
      />
      <text
        x={cardX + 14}
        y={cardY + 20}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
      >
        {title}
      </text>
      <circle
        cx={centerX}
        cy={centerY}
        r={radius}
        fill="none"
        stroke="rgba(15,28,36,0.12)"
        strokeDasharray="6 6"
      />
      <line
        x1={centerX}
        x2={slit1EndX}
        y1={centerY}
        y2={slit1EndY}
        stroke="#1ea6a2"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line
        x1={centerX}
        x2={slit2EndX}
        y1={centerY}
        y2={slit2EndY}
        stroke="#4ea6df"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line
        x1={centerX}
        x2={resultantEndX}
        y1={centerY}
        y2={resultantEndY}
        stroke="#f16659"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <circle cx={centerX} cy={centerY} r="4" fill="#0f1c24" />
      <text x={cardX + 102} y={cardY + 38} className="fill-ink-700 text-[12px] font-semibold">
        delta phi = {formatMeasurement(Math.abs(frame.snapshot.wrappedPhaseDifference), "rad")}
      </text>
      <text x={cardX + 102} y={cardY + 58} className="fill-ink-700 text-[12px] font-semibold">
        I / I0 = {formatNumber(frame.snapshot.normalizedIntensity)}
      </text>
      <text x={cardX + 102} y={cardY + 78} className="fill-ink-500 text-[11px]">
        Equal slit phasors add head-to-tail. The angle between them comes from delta r / lambda.
      </text>
    </g>
  );
}

function renderScreenPattern(
  frame: DoubleSlitFrame,
  rowCenter: number,
  screenX: number,
  options?: {
    interactive?: boolean;
    onAdjustProbe?: (probeY: number) => void;
  },
) {
  const probeStageY = stageYFromPhysical(frame.snapshot.probe.y, rowCenter);
  const baselineProbeX = screenX + SCREEN_WIDTH + BASELINE_PROBE_GAP;
  const probeX = baselineProbeX + frame.snapshot.resultantDisplacement * FIELD_OFFSET_SCALE;
  const top = rowTop(rowCenter);
  const bottom = rowBottom(rowCenter);
  const stripHeight = bottom - top;
  const segments = sampleRange(
    -DOUBLE_SLIT_INTERFERENCE_SCREEN_HALF_HEIGHT,
    DOUBLE_SLIT_INTERFERENCE_SCREEN_HALF_HEIGHT,
    SCREEN_SEGMENTS + 1,
  );

  return (
    <>
      {segments.slice(0, -1).map((segmentStart, index) => {
        const segmentEnd = segments[index + 1];
        const centerY = (segmentStart + segmentEnd) / 2;
        const pattern = sampleDoubleSlitInterferencePattern(frame.params, centerY);
        const y1 = stageYFromPhysical(segmentStart, rowCenter);
        const y2 = stageYFromPhysical(segmentEnd, rowCenter);

        return (
          <rect
            key={`pattern-${rowCenter}-${index}`}
            x={screenX}
            y={Math.min(y1, y2)}
            width={SCREEN_WIDTH}
            height={Math.max(1, Math.abs(y2 - y1))}
            fill={intensityColor(pattern.normalizedIntensity)}
            opacity="0.96"
          />
        );
      })}
      <rect
        x={screenX}
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
            x: screenX - 12,
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
        x1={screenX + SCREEN_WIDTH}
        x2={baselineProbeX}
        y1={probeStageY}
        y2={probeStageY}
        stroke="rgba(15,28,36,0.18)"
        strokeDasharray="6 6"
      />
      <circle
        cx={screenX + SCREEN_WIDTH / 2}
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
        x={screenX - 8}
        y={bottom + 18}
        textAnchor="end"
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        screen
      </text>
      <text
        x={baselineProbeX + 44}
        y={probeStageY + 4}
        className="fill-ink-600 text-[11px] font-semibold"
      >
        probe field
      </text>
    </>
  );
}

function renderWaveRow(
  frame: DoubleSlitFrame,
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
  const screenX = stageXFromDistance(frame.params.screenDistance);
  const upperY = stageYFromPhysical(frame.params.slitSeparation / 2, rowCenter);
  const lowerY = stageYFromPhysical(-frame.params.slitSeparation / 2, rowCenter);
  const rowOpacity = options.muted ? 0.78 : 1;
  const overlays = options.overlayValues ?? {};
  const sourceColors = {
    upper: "#1ea6a2",
    lower: "#4ea6df",
  } as const;

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
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
      >
        {options.label}
        {options.compareBadge ? ` - ${options.compareBadge}` : ""}
      </text>
      <line
        x1="72"
        x2={screenX - 16}
        y1={rowCenter}
        y2={rowCenter}
        stroke="rgba(15,28,36,0.08)"
        strokeDasharray="4 8"
      />
      {renderIncomingWavefronts(frame, rowCenter)}
      {renderBarrier(frame, rowCenter)}
      {(["upper", "lower"] as const).map((slitKey) => {
        const sourceStageY = slitKey === "upper" ? upperY : lowerY;
        const displacement =
          slitKey === "upper"
            ? frame.snapshot.sourceUpperDisplacement
            : frame.snapshot.sourceLowerDisplacement;

        return (
          <g key={`${rowCenter}-${slitKey}`}>
            <path
              d={buildWavePath(frame, slitKey, rowCenter, screenX)}
              fill="none"
              stroke={sourceColors[slitKey]}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx={BARRIER_X}
              cy={sourceStageY}
              r="13"
              fill="rgba(255,253,247,0.9)"
              stroke={sourceColors[slitKey]}
              strokeWidth="3"
            />
            <circle
              cx={BARRIER_X + displacement * 8}
              cy={sourceStageY}
              r="6"
              fill={sourceColors[slitKey]}
            />
            <text
              x={BARRIER_X - 22}
              y={sourceStageY + 4}
              className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
            >
              {slitKey === "upper" ? "S1" : "S2"}
            </text>
          </g>
        );
      })}
      {overlays.geometryGuide ?? true
        ? renderGeometryGuide(frame, rowCenter, screenX, options.focusedOverlayId)
        : null}
      {overlays.pathDifference ?? true
        ? renderPathDifference(frame, rowCenter, screenX, options.focusedOverlayId)
        : null}
      {overlays.fringeSpacingGuide ?? false
        ? renderFringeSpacingGuide(frame, rowCenter, screenX, options.focusedOverlayId)
        : null}
      {renderScreenPattern(frame, rowCenter, screenX, {
        interactive: options.interactive,
        onAdjustProbe: options.onAdjustProbe,
      })}
    </g>
  );
}

export function DoubleSlitInterferenceSimulation({
  concept,
  params,
  time,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: DoubleSlitInterferenceSimulationProps) {
  const displayTime =
    graphPreview?.kind === "time" || graphPreview?.kind === "trajectory"
      ? graphPreview.time
      : time;
  const previewProbeY =
    graphPreview?.kind === "response" && graphPreview.graphId === "pattern"
      ? clamp(
          graphPreview.point.x,
          -DOUBLE_SLIT_INTERFERENCE_SCREEN_HALF_HEIGHT,
          DOUBLE_SLIT_INTERFERENCE_SCREEN_HALF_HEIGHT,
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
  const showPhaseWheel = overlayValues?.phaseWheel ?? false;
  const metricRows = [
    {
      label: "d",
      value: formatMeasurement(primaryFrame.params.slitSeparation, "m"),
    },
    {
      label: "L",
      value: formatMeasurement(primaryFrame.params.screenDistance, "m"),
    },
    {
      label: "delta r",
      value: formatMeasurement(Math.abs(primaryFrame.snapshot.pathDifference), "m"),
    },
    {
      label: "delta y",
      value: formatMeasurement(primaryFrame.snapshot.fringeSpacing, "m"),
    },
  ];
  const noteLines = [
    `${primaryFrame.snapshot.interferenceLabel} at the current probe.`,
    `${primaryFrame.snapshot.spacingLabel} fringes for the current lambda, L, and d.`,
  ];

  function handleAdjustProbe(nextProbeY: number) {
    setParam("probeY", Number(nextProbeY.toFixed(2)));
  }

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(78,166,223,0.08),rgba(240,171,60,0.08))]"
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
            label: "Live double slit",
            interactive: true,
            overlayValues,
            focusedOverlayId,
            onAdjustProbe: handleAdjustProbe,
          })
        )}
        {showPhaseWheel
          ? renderPhaseWheel(
              primaryFrame,
              compareEnabled ? `${primaryLabel} phase map` : "Phase map",
              overlayWeight(focusedOverlayId, "phaseWheel"),
            )
          : null}
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Optics state"
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={noteLines}
        />
      </svg>
    </SimulationSceneCard>
  );
}
