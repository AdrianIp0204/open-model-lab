"use client";

import {
  clamp,
  formatMeasurement,
  formatNumber,
  lerp,
  sampleRange,
  sampleWaveInterferencePattern,
  sampleWaveInterferenceState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
  resolveWaveInterferenceParams,
  WAVE_INTERFERENCE_SCREEN_HALF_HEIGHT,
  WAVE_INTERFERENCE_SOURCE_SEPARATION,
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

type WaveInterferenceSimulationProps = {
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
  params: ReturnType<typeof resolveWaveInterferenceParams>;
  snapshot: ReturnType<typeof sampleWaveInterferenceState>;
};

const WIDTH = 760;
const HEIGHT = 312;
const SOURCE_X = 112;
const SCREEN_X = 514;
const SCREEN_WIDTH = 18;
const BASELINE_PROBE_X = SCREEN_X + SCREEN_WIDTH + 18;
const CARD_WIDTH = 198;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const ROW_SCALE = 22;
const RESULTANT_OFFSET_SCALE = 18;
const WAVE_OFFSET_SCALE = 11;
const SOURCE_OFFSET_SCALE = 9;
const PATH_SAMPLE_COUNT = 56;
const SCREEN_SEGMENTS = 72;
const SINGLE_ROW_CENTER = 170;
const COMPARE_ROW_CENTERS: Record<GraphSeriesSetupId, number> = {
  a: 102,
  b: 220,
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
  const shadow: [number, number, number] = [15, 28, 36];
  const glow: [number, number, number] = [240, 171, 60];
  const highlight: [number, number, number] = [255, 246, 220];

  return toRgbString(
    safeIntensity < 0.65
      ? mixColor(shadow, glow, safeIntensity / 0.65)
      : mixColor(glow, highlight, (safeIntensity - 0.65) / 0.35),
  );
}

function rowTop(rowCenter: number) {
  return rowCenter - WAVE_INTERFERENCE_SCREEN_HALF_HEIGHT * ROW_SCALE;
}

function rowBottom(rowCenter: number) {
  return rowCenter + WAVE_INTERFERENCE_SCREEN_HALF_HEIGHT * ROW_SCALE;
}

function stageYFromPhysical(physicalY: number, rowCenter: number) {
  return rowCenter - physicalY * ROW_SCALE;
}

function physicalYFromStage(stageY: number, rowCenter: number) {
  return clamp(
    (rowCenter - stageY) / ROW_SCALE,
    -WAVE_INTERFERENCE_SCREEN_HALF_HEIGHT,
    WAVE_INTERFERENCE_SCREEN_HALF_HEIGHT,
  );
}

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  return resolveOverlayOpacity(focusedOverlayId, overlayId, 0.42);
}

function buildFrame(
  source: SimulationParams,
  time: number,
  previewProbeY?: number,
): WaveFrame {
  const params = resolveWaveInterferenceParams(source);
  return {
    params,
    snapshot: sampleWaveInterferenceState(params, time, previewProbeY),
  };
}

function buildWavePath(frame: WaveFrame, sourceKey: "a" | "b", rowCenter: number) {
  const sourcePhysicalY =
    sourceKey === "a"
      ? WAVE_INTERFERENCE_SOURCE_SEPARATION / 2
      : -WAVE_INTERFERENCE_SOURCE_SEPARATION / 2;
  const probePhysicalY = frame.snapshot.probe.y;
  const sourceStageY = stageYFromPhysical(sourcePhysicalY, rowCenter);
  const probeStageY = stageYFromPhysical(probePhysicalY, rowCenter);
  const pathLength = sourceKey === "a" ? frame.snapshot.pathA : frame.snapshot.pathB;
  const sourcePhase = sourceKey === "a" ? 0 : frame.params.phaseOffset;
  const sourceAmplitude = sourceKey === "a" ? frame.params.amplitudeA : frame.params.amplitudeB;
  const dx = SCREEN_X - SOURCE_X;
  const dy = probeStageY - sourceStageY;
  const norm = Math.hypot(dx, dy) || 1;
  const normalX = -dy / norm;
  const normalY = dx / norm;

  return sampleRange(0, 1, PATH_SAMPLE_COUNT)
    .map((progress, index) => {
      const baseX = lerp(SOURCE_X, SCREEN_X, progress);
      const baseY = lerp(sourceStageY, probeStageY, progress);
      const travelDistance = pathLength * progress;
      const localPhase =
        frame.snapshot.wavenumber * travelDistance -
        frame.snapshot.angularFrequency * frame.snapshot.time +
        sourcePhase;
      const offset = sourceAmplitude * Math.sin(localPhase) * WAVE_OFFSET_SCALE;
      const pointX = baseX + normalX * offset;
      const pointY = baseY + normalY * offset;

      return `${index === 0 ? "M" : "L"} ${pointX.toFixed(2)} ${pointY.toFixed(2)}`;
    })
    .join(" ");
}

function renderPhaseWheel(
  frame: WaveFrame,
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
  const vectorScale = radius / Math.max(frame.params.amplitudeA + frame.params.amplitudeB, 0.001);
  const sourceAEndX = centerX + frame.params.amplitudeA * vectorScale;
  const sourceAEndY = centerY;
  const sourceBEndX =
    centerX +
    Math.cos(frame.snapshot.totalPhaseDifference) * frame.params.amplitudeB * vectorScale;
  const sourceBEndY =
    centerY -
    Math.sin(frame.snapshot.totalPhaseDifference) * frame.params.amplitudeB * vectorScale;
  const resultantEndX =
    centerX + Math.cos(frame.snapshot.resultantPhase) * frame.snapshot.resultantAmplitude * vectorScale;
  const resultantEndY =
    centerY - Math.sin(frame.snapshot.resultantPhase) * frame.snapshot.resultantAmplitude * vectorScale;

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
      <text x={cardX + 14} y={cardY + 20} className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]">
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
      <line x1={centerX} x2={sourceAEndX} y1={centerY} y2={sourceAEndY} stroke="#1ea6a2" strokeWidth="4" strokeLinecap="round" />
      <line x1={centerX} x2={sourceBEndX} y1={centerY} y2={sourceBEndY} stroke="#4ea6df" strokeWidth="4" strokeLinecap="round" />
      <line x1={centerX} x2={resultantEndX} y1={centerY} y2={resultantEndY} stroke="#f16659" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx={centerX} cy={centerY} r="4" fill="#0f1c24" />
      <text x={cardX + 102} y={cardY + 38} className="fill-ink-700 text-[12px] font-semibold">
        Δφ = {formatMeasurement(frame.snapshot.wrappedPhaseDifference, "rad")}
      </text>
      <text x={cardX + 102} y={cardY + 58} className="fill-ink-700 text-[12px] font-semibold">
        Ares = {formatMeasurement(frame.snapshot.resultantAmplitude, "a.u.")}
      </text>
      <text x={cardX + 102} y={cardY + 78} className="fill-ink-500 text-[11px]">
        Source A anchors the reference. Source B rotates by the path plus source phase shift.
      </text>
    </g>
  );
}

function renderScreenPattern(
  frame: WaveFrame,
  rowCenter: number,
  options?: {
    interactive?: boolean;
    overlayValues?: Record<string, boolean>;
    focusedOverlayId?: string | null;
    onAdjustProbe?: (probeY: number) => void;
  },
) {
  const values = options?.overlayValues ?? {};
  const showResultEnvelope = values.resultEnvelope ?? true;
  const showPathDifference = values.pathDifference ?? true;
  const probeStageY = stageYFromPhysical(frame.snapshot.probe.y, rowCenter);
  const baselineProbeX = BASELINE_PROBE_X;
  const probeX = baselineProbeX + frame.snapshot.resultantDisplacement * RESULTANT_OFFSET_SCALE;
  const envelopeHalfWidth = frame.snapshot.resultantAmplitude * RESULTANT_OFFSET_SCALE;
  const envelopeOpacity = overlayWeight(options?.focusedOverlayId, "resultEnvelope");
  const pathOpacity = overlayWeight(options?.focusedOverlayId, "pathDifference");
  const top = rowTop(rowCenter);
  const bottom = rowBottom(rowCenter);
  const stripHeight = bottom - top;
  const segments = sampleRange(
    -WAVE_INTERFERENCE_SCREEN_HALF_HEIGHT,
    WAVE_INTERFERENCE_SCREEN_HALF_HEIGHT,
    SCREEN_SEGMENTS + 1,
  );

  return (
    <>
      {segments.slice(0, -1).map((segmentStart, index) => {
        const segmentEnd = segments[index + 1];
        const centerY = (segmentStart + segmentEnd) / 2;
        const pattern = sampleWaveInterferencePattern(frame.params, centerY);
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
            width: SCREEN_WIDTH + 40,
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
      {showResultEnvelope ? (
        <>
          <line
            x1={baselineProbeX - envelopeHalfWidth}
            x2={baselineProbeX - envelopeHalfWidth}
            y1={probeStageY - 20}
            y2={probeStageY + 20}
            stroke="rgba(241,102,89,0.45)"
            strokeDasharray="6 6"
            strokeWidth={options?.focusedOverlayId === "resultEnvelope" ? "3" : "2"}
            opacity={envelopeOpacity}
          />
          <line
            x1={baselineProbeX + envelopeHalfWidth}
            x2={baselineProbeX + envelopeHalfWidth}
            y1={probeStageY - 20}
            y2={probeStageY + 20}
            stroke="rgba(241,102,89,0.45)"
            strokeDasharray="6 6"
            strokeWidth={options?.focusedOverlayId === "resultEnvelope" ? "3" : "2"}
            opacity={envelopeOpacity}
          />
          <text
            x={baselineProbeX}
            y={probeStageY - 26}
            textAnchor="middle"
            className={options?.focusedOverlayId === "resultEnvelope" ? "fill-coral-700 text-[11px] font-semibold" : "fill-coral-600 text-[11px] font-semibold"}
            opacity={envelopeOpacity}
          >
            Ares
          </text>
        </>
      ) : null}
      <circle cx={probeX} cy={probeStageY} r="9" fill="#f16659" stroke="rgba(255,255,255,0.92)" strokeWidth="2.5" />
      <circle cx={SCREEN_X + SCREEN_WIDTH / 2} cy={probeStageY} r="7" fill="rgba(255,253,247,0.92)" stroke="#0f1c24" strokeWidth="2" />
      {showPathDifference ? (
        <g opacity={pathOpacity}>
          <text x={SCREEN_X - 8} y={top - 8} textAnchor="end" className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]">
            Δr {formatMeasurement(frame.snapshot.pathDifference, "m")} ({formatNumber(frame.snapshot.pathDifferenceInWavelengths)} λ)
          </text>
        </g>
      ) : null}
    </>
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
    onAdjustProbe?: (probeY: number) => void;
  },
) {
  const sourceAStageY = stageYFromPhysical(WAVE_INTERFERENCE_SOURCE_SEPARATION / 2, rowCenter);
  const sourceBStageY = stageYFromPhysical(-WAVE_INTERFERENCE_SOURCE_SEPARATION / 2, rowCenter);
  const probeStageY = stageYFromPhysical(frame.snapshot.probe.y, rowCenter);
  const showPathDifference = options.overlayValues?.pathDifference ?? true;
  const rowOpacity = options.muted ? 0.78 : 1;
  const pathOpacity = overlayWeight(options.focusedOverlayId, "pathDifference");
  const activeRowTop = rowTop(rowCenter);
  const activeRowBottom = rowBottom(rowCenter);
  const sourceColors = {
    a: "#1ea6a2",
    b: "#4ea6df",
  } as const;

  return (
    <g opacity={rowOpacity}>
      <rect
        x="56"
        y={activeRowTop - 16}
        width="500"
        height={activeRowBottom - activeRowTop + 32}
        rx="24"
        fill="rgba(255,255,255,0.28)"
        stroke={options.interactive ? "rgba(78,166,223,0.24)" : "rgba(15,28,36,0.08)"}
        strokeWidth={options.interactive ? "2" : "1.5"}
      />
      <text x="72" y={activeRowTop - 4} className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]">
        {options.label}
        {options.compareBadge ? ` · ${options.compareBadge}` : ""}
      </text>
      <line x1="72" x2={SCREEN_X - 18} y1={rowCenter} y2={rowCenter} stroke="rgba(15,28,36,0.08)" strokeDasharray="4 8" />
      {[
        { key: "a" as const, sourceStageY: sourceAStageY },
        { key: "b" as const, sourceStageY: sourceBStageY },
      ].map(({ key, sourceStageY }) => {
        const displacement =
          key === "a" ? frame.snapshot.sourceADisplacement : frame.snapshot.sourceBDisplacement;

        return (
          <g key={`${rowCenter}-${key}`}>
            <path
              d={buildWavePath(frame, key, rowCenter)}
              fill="none"
              stroke={sourceColors[key]}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={SOURCE_X} cy={sourceStageY} r="14" fill="rgba(255,253,247,0.9)" stroke={sourceColors[key]} strokeWidth="3" />
            <circle cx={SOURCE_X + displacement * SOURCE_OFFSET_SCALE} cy={sourceStageY} r="6" fill={sourceColors[key]} />
            <text x={SOURCE_X - 22} y={sourceStageY + 4} className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]">
              {key === "a" ? "S1" : "S2"}
            </text>
          </g>
        );
      })}
      {showPathDifference ? (
        <g opacity={pathOpacity}>
          <text x="176" y={sourceAStageY - 18} className="fill-teal-700 text-[11px] font-semibold">
            r1 = {formatMeasurement(frame.snapshot.pathA, "m")}
          </text>
          <text x="176" y={sourceBStageY + 26} className="fill-sky-700 text-[11px] font-semibold">
            r2 = {formatMeasurement(frame.snapshot.pathB, "m")}
          </text>
        </g>
      ) : null}
      {renderScreenPattern(frame, rowCenter, {
        interactive: options.interactive,
        overlayValues: options.overlayValues,
        focusedOverlayId: options.focusedOverlayId,
        onAdjustProbe: options.onAdjustProbe,
      })}
      <text x={SCREEN_X - 6} y={activeRowBottom + 18} textAnchor="end" className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]">
        screen
      </text>
      <text x={BASELINE_PROBE_X + 44} y={probeStageY + 4} className="fill-ink-600 text-[11px] font-semibold">
        probe
      </text>
    </g>
  );
}

export function WaveInterferenceSimulation({
  concept,
  params,
  time,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: WaveInterferenceSimulationProps) {
  const displayTime =
    graphPreview?.kind === "time" || graphPreview?.kind === "trajectory"
      ? graphPreview.time
      : time;
  const previewProbeY =
    graphPreview?.kind === "response" && graphPreview.graphId === "pattern"
      ? clamp(
          graphPreview.point.x,
          -WAVE_INTERFERENCE_SCREEN_HALF_HEIGHT,
          WAVE_INTERFERENCE_SCREEN_HALF_HEIGHT,
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
      label: "path diff",
      value: formatMeasurement(primaryFrame.snapshot.pathDifference, "m"),
    },
    {
      label: "phase diff",
      value: formatMeasurement(primaryFrame.snapshot.wrappedPhaseDifference, "rad"),
    },
    {
      label: "Ares",
      value: formatMeasurement(primaryFrame.snapshot.resultantAmplitude, "a.u."),
    },
    {
      label: "intensity",
      value: formatNumber(primaryFrame.snapshot.normalizedIntensity),
    },
  ];
  const noteLines = [
    `${primaryFrame.snapshot.interferenceLabel} at the current probe.`,
    `λ = ${formatMeasurement(primaryFrame.params.wavelength, "m")}, T = ${formatMeasurement(primaryFrame.snapshot.period, "s")}`,
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
            label: "Live interference",
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
          title="Probe state"
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={noteLines}
        />
      </svg>
    </SimulationSceneCard>
  );
}
