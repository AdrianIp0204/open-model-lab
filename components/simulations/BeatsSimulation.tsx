"use client";

import {
  BEATS_MAX_AMPLITUDE,
  clamp,
  formatMeasurement,
  formatNumber,
  sampleBeatsState,
  sampleRange,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
  resolveBeatsParams,
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

type BeatsSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type BeatsFrame = {
  params: ReturnType<typeof resolveBeatsParams>;
  snapshot: ReturnType<typeof sampleBeatsState>;
};

type RowLayout = {
  top: number;
  bottom: number;
  sourceScopeY: number;
  sourceScopeHeight: number;
  sumScopeY: number;
  sumScopeHeight: number;
};

const WIDTH = 860;
const HEIGHT = 358;
const CONTENT_RIGHT = 626;
const DRIVER_X = 82;
const SCOPE_X = 152;
const SCOPE_WIDTH = 390;
const LISTENER_X = 576;
const CARD_WIDTH = 196;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const TRACE_SAMPLE_COUNT = 181;
const SINGLE_ROW_CENTER = 176;
const COMPARE_ROW_CENTERS: Record<GraphSeriesSetupId, number> = {
  a: 98,
  b: 238,
};

function buildFrame(source: SimulationParams, time: number): BeatsFrame {
  const params = resolveBeatsParams(source);

  return {
    params,
    snapshot: sampleBeatsState(params, time),
  };
}

function resolveWindowSpan(frame: BeatsFrame) {
  const beatWindow =
    frame.snapshot.beatFrequency > 0.001 ? 1.3 / frame.snapshot.beatFrequency : 0;
  const carrierWindow = 4 / Math.max(frame.snapshot.averageFrequency, 0.1);

  return clamp(Math.max(beatWindow, carrierWindow, 2.2), 2.2, 6);
}

function buildRowLayout(rowCenter: number, compact: boolean): RowLayout {
  const sourceScopeHeight = compact ? 34 : 42;
  const sumScopeHeight = compact ? 52 : 66;
  const sourceScopeY = rowCenter - (compact ? 54 : 66);
  const sumScopeY = rowCenter - (compact ? 6 : 0);
  const top = sourceScopeY - 24;
  const bottom = sumScopeY + sumScopeHeight + 26;

  return {
    top,
    bottom,
    sourceScopeY,
    sourceScopeHeight,
    sumScopeY,
    sumScopeHeight,
  };
}

function xFromTime(timeValue: number, startTime: number, span: number) {
  return SCOPE_X + ((timeValue - startTime) / span) * SCOPE_WIDTH;
}

function yFromValue(
  value: number,
  centerY: number,
  amplitudeBound: number,
  halfHeight: number,
) {
  return centerY - (value / Math.max(amplitudeBound, Number.EPSILON)) * halfHeight;
}

function buildTracePath(
  startTime: number,
  endTime: number,
  sample: (timeValue: number) => number,
  yResolver: (value: number) => number,
) {
  return sampleRange(startTime, endTime, TRACE_SAMPLE_COUNT)
    .map((timeValue, index) => {
      const x = xFromTime(timeValue, startTime, endTime - startTime);
      const y = yResolver(sample(timeValue));

      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildEnvelopePath(
  frame: BeatsFrame,
  startTime: number,
  endTime: number,
  centerY: number,
  halfHeight: number,
  direction: 1 | -1,
) {
  const amplitudeBound = Math.max(frame.params.amplitude * 2, 0.01);

  return sampleRange(startTime, endTime, TRACE_SAMPLE_COUNT)
    .map((timeValue, index) => {
      const x = xFromTime(timeValue, startTime, endTime - startTime);
      const envelope = sampleBeatsState(frame.params, timeValue).envelopeAmplitude * direction;
      const y = yFromValue(envelope, centerY, amplitudeBound, halfHeight);

      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function renderFrequencyBadges(
  frame: BeatsFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "differenceGuide", 0.36);

  return (
    <g pointerEvents="none">
      {[
        {
          label: "Source A",
          value: frame.params.frequencyA,
          x: 42,
          y: rowCenter - 46,
          fill: "rgba(30,166,162,0.14)",
          stroke: "rgba(30,166,162,0.28)",
          textClassName: "fill-teal-700 text-[11px] font-semibold",
        },
        {
          label: "Source B",
          value: frame.params.frequencyB,
          x: 42,
          y: rowCenter + 14,
          fill: "rgba(78,166,223,0.14)",
          stroke: "rgba(78,166,223,0.28)",
          textClassName: "fill-sky-700 text-[11px] font-semibold",
        },
      ].map((badge) => (
        <g key={`${badge.label}-${rowCenter}`}>
          <rect
            x={badge.x}
            y={badge.y}
            width="88"
            height="38"
            rx="16"
            fill={badge.fill}
            stroke={badge.stroke}
            strokeWidth="1.6"
          />
          <text x={badge.x + 12} y={badge.y + 15} className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]">
            {badge.label}
          </text>
          <text x={badge.x + 12} y={badge.y + 29} className={badge.textClassName}>
            {formatMeasurement(badge.value, "Hz")}
          </text>
        </g>
      ))}
      <g opacity={opacity}>
        <text x={SCOPE_X + 12} y={rowCenter - 76} className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]">
          delta f = {formatMeasurement(frame.snapshot.frequencyDifference, "Hz")}
        </text>
        <text x={SCOPE_X + 12} y={rowCenter - 62} className="fill-amber-700 text-[11px] font-semibold">
          f_beat = |f_2 - f_1| = {formatMeasurement(frame.snapshot.beatFrequency, "Hz")}
        </text>
      </g>
    </g>
  );
}

function renderDriver(
  frame: BeatsFrame,
  rowCenter: number,
  source: "a" | "b",
) {
  const y = source === "a" ? rowCenter - 22 : rowCenter + 32;
  const displacement =
    source === "a" ? frame.snapshot.sourceADisplacement : frame.snapshot.sourceBDisplacement;
  const diaphragmX = DRIVER_X + displacement / Math.max(frame.params.amplitude, 0.01) * 7;
  const color = source === "a" ? "#1ea6a2" : "#4ea6df";

  return (
    <g pointerEvents="none">
      <rect
        x={DRIVER_X - 20}
        y={y - 18}
        width="38"
        height="36"
        rx="16"
        fill="rgba(255,255,255,0.85)"
        stroke="rgba(15,28,36,0.12)"
        strokeWidth="1.6"
      />
      <path
        d={`M ${DRIVER_X - 6} ${y - 10} L ${DRIVER_X + 6} ${y - 10} L ${DRIVER_X + 12} ${y - 6} L ${DRIVER_X + 12} ${y + 6} L ${DRIVER_X + 6} ${y + 10} L ${DRIVER_X - 6} ${y + 10} Z`}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
      />
      <line
        x1={diaphragmX}
        x2={diaphragmX}
        y1={y - 8}
        y2={y + 8}
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </g>
  );
}

function renderListener(
  frame: BeatsFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const cueOpacity = resolveOverlayOpacity(focusedOverlayId, "loudnessCue", 0.38);
  const radius = 14 + frame.snapshot.loudnessCue * 12;

  return (
    <g pointerEvents="none">
      <circle
        cx={LISTENER_X}
        cy={rowCenter}
        r={radius}
        fill="rgba(241,102,89,0.14)"
        stroke="#f16659"
        strokeWidth="2.2"
      />
      <circle
        cx={LISTENER_X}
        cy={rowCenter}
        r="10"
        fill="#f16659"
        stroke="rgba(255,253,247,0.96)"
        strokeWidth="2.2"
      />
      <g opacity={cueOpacity}>
        <circle
          cx={LISTENER_X}
          cy={rowCenter}
          r={radius + 8}
          fill="none"
          stroke="rgba(240,171,60,0.55)"
          strokeWidth="1.8"
          strokeDasharray="6 6"
        />
        <text
          x={LISTENER_X}
          y={rowCenter + radius + 24}
          textAnchor="middle"
          className="fill-amber-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
        >
          {frame.snapshot.loudnessLabel}
        </text>
      </g>
    </g>
  );
}

function renderWaveScopes(
  frame: BeatsFrame,
  rowCenter: number,
  compact: boolean,
  overlayValues?: Record<string, boolean>,
  focusedOverlayId?: string | null,
) {
  const layout = buildRowLayout(rowCenter, compact);
  const windowSpan = resolveWindowSpan(frame);
  const startTime = frame.snapshot.time - windowSpan / 2;
  const endTime = frame.snapshot.time + windowSpan / 2;
  const sourceCenterY = layout.sourceScopeY + layout.sourceScopeHeight / 2;
  const sumCenterY = layout.sumScopeY + layout.sumScopeHeight / 2;
  const sourceHalfHeight = layout.sourceScopeHeight / 2 - 6;
  const sumHalfHeight = layout.sumScopeHeight / 2 - 8;
  const showEnvelopeGuide = overlayValues?.envelopeGuide ?? true;
  const envelopeOpacity = resolveOverlayOpacity(focusedOverlayId, "envelopeGuide", 0.38);
  const sourceBound = Math.max(frame.params.amplitude, BEATS_MAX_AMPLITUDE * 0.15);
  const resultantBound = Math.max(frame.params.amplitude * 2, 0.12);
  const currentX = xFromTime(frame.snapshot.time, startTime, windowSpan);
  const currentSourceAY = yFromValue(
    frame.snapshot.sourceADisplacement,
    sourceCenterY,
    sourceBound,
    sourceHalfHeight,
  );
  const currentSourceBY = yFromValue(
    frame.snapshot.sourceBDisplacement,
    sourceCenterY,
    sourceBound,
    sourceHalfHeight,
  );
  const currentResultantY = yFromValue(
    frame.snapshot.resultantDisplacement,
    sumCenterY,
    resultantBound,
    sumHalfHeight,
  );

  return (
    <g pointerEvents="none">
      <rect
        x={SCOPE_X}
        y={layout.sourceScopeY}
        width={SCOPE_WIDTH}
        height={layout.sourceScopeHeight}
        rx="18"
        fill="rgba(255,255,255,0.86)"
        stroke="rgba(15,28,36,0.12)"
        strokeWidth="1.6"
      />
      <rect
        x={SCOPE_X}
        y={layout.sumScopeY}
        width={SCOPE_WIDTH}
        height={layout.sumScopeHeight}
        rx="20"
        fill="rgba(255,255,255,0.9)"
        stroke="rgba(15,28,36,0.12)"
        strokeWidth="1.6"
      />
      <text x={SCOPE_X + 14} y={layout.sourceScopeY - 8} className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]">
        source phases
      </text>
      <text x={SCOPE_X + 14} y={layout.sumScopeY - 8} className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]">
        resultant and envelope
      </text>
      <line
        x1={SCOPE_X}
        x2={SCOPE_X + SCOPE_WIDTH}
        y1={sourceCenterY}
        y2={sourceCenterY}
        stroke="rgba(15,28,36,0.08)"
        strokeDasharray="4 6"
      />
      <line
        x1={SCOPE_X}
        x2={SCOPE_X + SCOPE_WIDTH}
        y1={sumCenterY}
        y2={sumCenterY}
        stroke="rgba(15,28,36,0.08)"
        strokeDasharray="4 6"
      />
      <path
        d={buildTracePath(
          startTime,
          endTime,
          (timeValue) => sampleBeatsState(frame.params, timeValue).sourceADisplacement,
          (value) => yFromValue(value, sourceCenterY, sourceBound, sourceHalfHeight),
        )}
        fill="none"
        stroke="#1ea6a2"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d={buildTracePath(
          startTime,
          endTime,
          (timeValue) => sampleBeatsState(frame.params, timeValue).sourceBDisplacement,
          (value) => yFromValue(value, sourceCenterY, sourceBound, sourceHalfHeight),
        )}
        fill="none"
        stroke="#4ea6df"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d={buildTracePath(
          startTime,
          endTime,
          (timeValue) => sampleBeatsState(frame.params, timeValue).resultantDisplacement,
          (value) => yFromValue(value, sumCenterY, resultantBound, sumHalfHeight),
        )}
        fill="none"
        stroke="#f16659"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {showEnvelopeGuide ? (
        <>
          <path
            d={buildEnvelopePath(
              frame,
              startTime,
              endTime,
              sumCenterY,
              sumHalfHeight,
              1,
            )}
            fill="none"
            stroke="rgba(240,171,60,0.74)"
            strokeWidth="2.2"
            strokeDasharray="6 6"
            opacity={envelopeOpacity}
          />
          <path
            d={buildEnvelopePath(
              frame,
              startTime,
              endTime,
              sumCenterY,
              sumHalfHeight,
              -1,
            )}
            fill="none"
            stroke="rgba(240,171,60,0.74)"
            strokeWidth="2.2"
            strokeDasharray="6 6"
            opacity={envelopeOpacity}
          />
        </>
      ) : null}
      <line
        x1={currentX}
        x2={currentX}
        y1={layout.sourceScopeY - 6}
        y2={layout.sumScopeY + layout.sumScopeHeight + 8}
        stroke="rgba(15,28,36,0.26)"
        strokeDasharray="5 5"
        strokeWidth="1.8"
      />
      <circle cx={currentX} cy={currentSourceAY} r="4.5" fill="#1ea6a2" />
      <circle cx={currentX} cy={currentSourceBY} r="4.5" fill="#4ea6df" />
      <circle
        cx={currentX}
        cy={currentResultantY}
        r="5.5"
        fill="#f16659"
        stroke="rgba(255,253,247,0.96)"
        strokeWidth="1.8"
      />
      <text
        x={currentX}
        y={layout.sumScopeY + layout.sumScopeHeight + 18}
        textAnchor="middle"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        now
      </text>
    </g>
  );
}

function renderWaveRow(
  frame: BeatsFrame,
  rowCenter: number,
  options: {
    label: string;
    compareBadge?: string;
    compact: boolean;
    overlayValues?: Record<string, boolean>;
    focusedOverlayId?: string | null;
    muted?: boolean;
  },
) {
  const layout = buildRowLayout(rowCenter, options.compact);

  return (
    <g opacity={options.muted ? 0.34 : 1}>
      <rect
        x={24}
        y={layout.top}
        width={CONTENT_RIGHT - 24}
        height={layout.bottom - layout.top}
        rx="24"
        fill="rgba(255,253,247,0.82)"
        stroke="rgba(15,28,36,0.08)"
        strokeWidth="1.5"
      />
      <text x={42} y={layout.top - 8} className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]">
        {options.label}
      </text>
      {options.compareBadge ? (
        <text
          x={CONTENT_RIGHT - 18}
          y={layout.top - 8}
          textAnchor="end"
          className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
        >
          {options.compareBadge}
        </text>
      ) : null}
      {renderFrequencyBadges(frame, rowCenter, options.focusedOverlayId)}
      {renderDriver(frame, rowCenter, "a")}
      {renderDriver(frame, rowCenter, "b")}
      {renderWaveScopes(
        frame,
        rowCenter,
        options.compact,
        options.overlayValues,
        options.focusedOverlayId,
      )}
      {renderListener(frame, rowCenter, options.focusedOverlayId)}
    </g>
  );
}

function formatBeatPeriodValue(value: number) {
  return Number.isFinite(value) ? formatMeasurement(value, "s") : "steady";
}

export function BeatsSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: BeatsSimulationProps) {
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  const activeFrame = buildFrame(params, displayTime);
  const compareAFrame = compare ? buildFrame(compare.setupA, displayTime) : null;
  const compareBFrame = compare ? buildFrame(compare.setupB, displayTime) : null;
  const { compareEnabled, previewedSetup, primaryFrame, primaryLabel, secondaryLabel } =
    resolveCompareScene({
      compare,
      graphPreview,
      activeFrame,
      frameA: compareAFrame,
      frameB: compareBFrame,
      liveLabel: "Live setup",
    });
  const previewBadge = graphPreview?.kind === "time" ? (
    <SimulationPreviewBadge tone="teal">
      preview t = {formatNumber(displayTime)} s
    </SimulationPreviewBadge>
  ) : null;
  const metricRows = [
    { label: "A", value: formatMeasurement(primaryFrame.params.amplitude, "m") },
    { label: "f1", value: formatMeasurement(primaryFrame.params.frequencyA, "Hz") },
    { label: "f2", value: formatMeasurement(primaryFrame.params.frequencyB, "Hz") },
    {
      label: "delta f",
      value: formatMeasurement(primaryFrame.snapshot.frequencyDifference, "Hz"),
    },
    {
      label: "f_beat",
      value: formatMeasurement(primaryFrame.snapshot.beatFrequency, "Hz"),
    },
    {
      label: "T_beat",
      value: formatBeatPeriodValue(primaryFrame.snapshot.beatPeriod),
    },
    {
      label: "envelope",
      value: formatMeasurement(primaryFrame.snapshot.envelopeAmplitude, "m"),
    },
    {
      label: "cue",
      value: formatNumber(primaryFrame.snapshot.loudnessCue),
    },
  ];
  const noteLines = [
    `Carrier frequency f_avg = ${formatMeasurement(primaryFrame.snapshot.averageFrequency, "Hz")}.`,
    primaryFrame.snapshot.beatFrequency <= 0.001
      ? "Equal source frequencies remove the slow loud-soft envelope, so the superposition stays steady instead of beating."
      : `The loudness pulse repeats every ${formatBeatPeriodValue(primaryFrame.snapshot.beatPeriod)} because the frequency split is ${formatMeasurement(primaryFrame.snapshot.frequencyDifference, "Hz")}.`,
    primaryFrame.snapshot.frequencyDifference >= 0.7
      ? "This is still honest superposition, but the split is getting large enough that the clean single-beat listening picture starts to break down."
      : "This bounded bench stays in the nearby-frequency regime where one swelling and fading sound is a useful perception model.",
  ];

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(30,166,162,0.1),rgba(240,171,60,0.08))]"
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
                compact: true,
                overlayValues,
                focusedOverlayId,
                muted: previewedSetup === "b",
              })}
              {renderWaveRow(compareBFrame!, COMPARE_ROW_CENTERS.b, {
                label: compare?.labelB ?? "Setup B",
                compareBadge: compare?.activeTarget === "b" ? "editing" : "locked",
                compact: true,
                overlayValues,
                focusedOverlayId,
                muted: previewedSetup === "a",
              })}
            </>
          ) : (
            renderWaveRow(activeFrame, SINGLE_ROW_CENTER, {
              label: "Live beat bench",
              compact: false,
              overlayValues,
              focusedOverlayId,
            })
          )}
          <SimulationReadoutCard
            x={CARD_X}
            y={CARD_Y}
            width={CARD_WIDTH}
            title="Beat state"
            setupLabel={compareEnabled ? primaryLabel : undefined}
            rows={metricRows}
            noteLines={noteLines}
          />
        </svg>
        <SimulationReadoutSummary
          title="Beat state"
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={noteLines}
          className="mx-3 mb-3 mt-0 md:hidden"
        />
      </div>
    </SimulationSceneCard>
  );
}
