"use client";

import {
  formatMeasurement,
  formatNumber,
  sampleRadioactivityHalfLifeState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
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

type RadioactivityHalfLifeSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 980;
const HEIGHT = 628;
const BENCH_LEFT = 40;
const BENCH_WIDTH = 664;
const CARD_WIDTH = 226;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const ROW_HEIGHT = 206;
const SINGLE_ROW_TOP = 178;
const COMPARE_ROW_TOP: Record<GraphSeriesSetupId, number> = {
  a: 86,
  b: 322,
};
const TRAY_X = BENCH_LEFT + 24;
const TRAY_WIDTH = 262;
const TRAY_HEIGHT = 148;
const CUE_X = TRAY_X + TRAY_WIDTH + 28;
const CUE_WIDTH = 306;
const BAR_WIDTH = CUE_WIDTH - 40;
const TRACK_WIDTH = CUE_WIDTH - 48;

function formatPercent(value: number) {
  return `${formatNumber(value * 100, 1)}%`;
}

function buildFrame(source: SimulationParams, time: number, graphPreview?: GraphStagePreview | null) {
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  return sampleRadioactivityHalfLifeState(source, displayTime);
}

function buildSetupSummary(frame: ReturnType<typeof sampleRadioactivityHalfLifeState>) {
  return `N0 ${frame.sampleSize} / T1/2 ${formatNumber(frame.halfLifeSeconds)} s`;
}

function renderSampleTray(
  frame: ReturnType<typeof sampleRadioactivityHalfLifeState>,
  rowTop: number,
  options: {
    overlayValues?: Record<string, boolean>;
    focusedOverlayId?: string | null;
    muted?: boolean;
  },
) {
  const trayY = rowTop + 36;
  const rowCount = Math.max(...frame.particles.map((particle) => particle.row), 0) + 1;
  const columnCount = Math.max(...frame.particles.map((particle) => particle.column), 0) + 1;
  const cellWidth = (TRAY_WIDTH - 28) / Math.max(columnCount, 1);
  const cellHeight = (TRAY_HEIGHT - 28) / Math.max(rowCount, 1);
  const radius = Math.max(3.5, Math.min(8.6, Math.min(cellWidth, cellHeight) * 0.33));
  const trayOpacity = options.muted ? 0.4 : 1;
  const recentDecayOpacity = resolveOverlayOpacity(
    options.focusedOverlayId,
    "recentDecays",
    0.32,
  );

  return (
    <g opacity={trayOpacity}>
      <text
        x={TRAY_X}
        y={trayY - 14}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        sample tray
      </text>
      <rect
        x={TRAY_X}
        y={trayY}
        width={TRAY_WIDTH}
        height={TRAY_HEIGHT}
        rx="24"
        fill="rgba(255,253,247,0.88)"
        stroke="rgba(15,28,36,0.08)"
        strokeWidth="1.5"
      />
      {frame.particles.map((particle) => {
        const x = TRAY_X + 14 + cellWidth * (particle.column + 0.5);
        const y = trayY + 14 + cellHeight * (particle.row + 0.5);

        return (
          <g key={`nucleus-${particle.index}`}>
            {options.overlayValues?.recentDecays && particle.recentlyDecayed ? (
              <circle
                cx={x}
                cy={y}
                r={radius + 4.2}
                fill="none"
                stroke="rgba(241,102,89,0.48)"
                strokeWidth="2.2"
                opacity={recentDecayOpacity}
              />
            ) : null}
            <circle
              cx={x}
              cy={y}
              r={radius}
              fill={
                particle.decayed
                  ? "rgba(143,154,168,0.34)"
                  : "rgba(30,166,162,0.9)"
              }
              stroke={
                particle.decayed
                  ? "rgba(95,109,122,0.42)"
                  : "rgba(15,28,36,0.2)"
              }
              strokeWidth="1.2"
            />
            {particle.decayed ? (
              <circle
                cx={x}
                cy={y}
                r={radius * 0.42}
                fill="rgba(255,247,240,0.9)"
              />
            ) : (
              <circle
                cx={x}
                cy={y}
                r={radius * 0.3}
                fill="rgba(255,255,255,0.74)"
              />
            )}
          </g>
        );
      })}
      <text x={TRAY_X + 16} y={trayY + TRAY_HEIGHT + 20} className="fill-ink-600 text-[10px]">
        Undecayed nuclei stay filled. Decayed nuclei fade to an empty center.
      </text>
    </g>
  );
}

function renderExpectationBars(
  frame: ReturnType<typeof sampleRadioactivityHalfLifeState>,
  rowTop: number,
  options: {
    overlayValues?: Record<string, boolean>;
    focusedOverlayId?: string | null;
    muted?: boolean;
  },
) {
  const panelY = rowTop + 34;
  const actualBarY = panelY + 40;
  const expectedBarY = actualBarY + 34;
  const showSampleVsExpected = options.overlayValues?.sampleVsExpected ?? true;
  const barOpacity = showSampleVsExpected
    ? resolveOverlayOpacity(options.focusedOverlayId, "sampleVsExpected", 0.34)
    : 0;
  const actualWidth = BAR_WIDTH * frame.actualFraction;
  const expectedWidth = BAR_WIDTH * frame.expectedFraction;

  return (
    <g opacity={options.muted ? 0.4 : 1}>
      <text
        x={CUE_X}
        y={panelY - 12}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        actual vs expected
      </text>
      <rect
        x={CUE_X}
        y={panelY}
        width={CUE_WIDTH}
        height="86"
        rx="22"
        fill="rgba(255,253,247,0.88)"
        stroke="rgba(15,28,36,0.08)"
        strokeWidth="1.5"
      />
      <text x={CUE_X + 18} y={actualBarY - 8} className="fill-ink-600 text-[10px] font-semibold">
        actual remaining
      </text>
      <rect
        x={CUE_X + 18}
        y={actualBarY}
        width={BAR_WIDTH}
        height="12"
        rx="6"
        fill="rgba(226,232,240,0.76)"
      />
      {showSampleVsExpected ? (
        <rect
          x={CUE_X + 18}
          y={actualBarY}
          width={actualWidth}
          height="12"
          rx="6"
          fill="rgba(30,166,162,0.92)"
          opacity={barOpacity}
        />
      ) : null}
      <text x={CUE_X + CUE_WIDTH - 18} y={actualBarY - 8} textAnchor="end" className="fill-ink-800 text-[11px] font-semibold">
        {frame.actualRemainingCount} / {frame.sampleSize}
      </text>
      <text x={CUE_X + 18} y={expectedBarY - 8} className="fill-ink-600 text-[10px] font-semibold">
        expected remaining
      </text>
      <rect
        x={CUE_X + 18}
        y={expectedBarY}
        width={BAR_WIDTH}
        height="12"
        rx="6"
        fill="rgba(226,232,240,0.76)"
      />
      {showSampleVsExpected ? (
        <rect
          x={CUE_X + 18}
          y={expectedBarY}
          width={expectedWidth}
          height="12"
          rx="6"
          fill="none"
          stroke="rgba(241,102,89,0.9)"
          strokeWidth="2"
          strokeDasharray="5 4"
          opacity={barOpacity}
        />
      ) : null}
      <text x={CUE_X + CUE_WIDTH - 18} y={expectedBarY - 8} textAnchor="end" className="fill-ink-800 text-[11px] font-semibold">
        {formatNumber(frame.expectedRemainingCount, 1)}
      </text>
      <text x={CUE_X + 18} y={panelY + 74} className="fill-ink-600 text-[10px]">
        actual - expected = {frame.deviationCount >= 0 ? "+" : ""}
        {formatNumber(frame.deviationCount, 1)} nuclei
      </text>
      <text x={CUE_X + CUE_WIDTH - 18} y={panelY + 74} textAnchor="end" className="fill-ink-600 text-[10px]">
        spread = {formatPercent(frame.deviationFraction)}
      </text>
    </g>
  );
}

function renderHalfLifeTrack(
  frame: ReturnType<typeof sampleRadioactivityHalfLifeState>,
  rowTop: number,
  options: {
    overlayValues?: Record<string, boolean>;
    focusedOverlayId?: string | null;
    muted?: boolean;
  },
) {
  const trackY = rowTop + 150;
  const trackLeft = CUE_X + 24;
  const trackRight = trackLeft + TRACK_WIDTH;
  const showMarkers = options.overlayValues?.halfLifeMarkers ?? true;
  const markerOpacity = showMarkers
    ? resolveOverlayOpacity(options.focusedOverlayId, "halfLifeMarkers", 0.34)
    : 0;
  const markerTimes = [0, ...frame.halfLifeMarkersSeconds];
  const currentX =
    trackLeft + (frame.timeSeconds / Math.max(frame.maxTimeSeconds, 1e-6)) * TRACK_WIDTH;

  return (
    <g opacity={options.muted ? 0.4 : 1}>
      <text
        x={CUE_X}
        y={trackY - 18}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        half-life checkpoints
      </text>
      <line
        x1={trackLeft}
        x2={trackRight}
        y1={trackY}
        y2={trackY}
        stroke="rgba(31,51,66,0.28)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {showMarkers
        ? markerTimes.map((markerTimeSeconds, index) => {
            const x =
              trackLeft + (markerTimeSeconds / Math.max(frame.maxTimeSeconds, 1e-6)) * TRACK_WIDTH;
            const expectedFraction = Math.pow(0.5, index);

            return (
              <g key={`marker-${index}`} opacity={markerOpacity}>
                <line
                  x1={x}
                  x2={x}
                  y1={trackY - 10}
                  y2={trackY + 10}
                  stroke="rgba(78,166,223,0.5)"
                  strokeWidth="1.8"
                />
                <text
                  x={x}
                  y={trackY - 14}
                  textAnchor="middle"
                  className="fill-sky-700 text-[9px] font-semibold"
                >
                  {index === 0 ? "0" : `${index}T1/2`}
                </text>
                <text x={x} y={trackY + 22} textAnchor="middle" className="fill-ink-500 text-[9px]">
                  {formatPercent(expectedFraction)}
                </text>
              </g>
            );
          })
        : null}
      <circle cx={currentX} cy={trackY} r="5.2" fill="rgba(240,171,60,0.95)" stroke="rgba(15,28,36,0.18)" />
      <text x={currentX} y={trackY + 38} textAnchor="middle" className="fill-amber-700 text-[10px] font-semibold">
        now
      </text>
    </g>
  );
}

function renderSingleVsSampleCue(
  frame: ReturnType<typeof sampleRadioactivityHalfLifeState>,
  rowTop: number,
  options: {
    overlayValues?: Record<string, boolean>;
    focusedOverlayId?: string | null;
    muted?: boolean;
  },
) {
  if (!(options.overlayValues?.singleVsSample ?? true)) {
    return null;
  }

  const cueY = rowTop + 172;
  const cueOpacity = resolveOverlayOpacity(options.focusedOverlayId, "singleVsSample", 0.34);

  return (
    <g opacity={options.muted ? 0.38 : cueOpacity}>
      <rect
        x={TRAY_X}
        y={cueY}
        width={TRAY_WIDTH}
        height="26"
        rx="13"
        fill="rgba(255,253,247,0.94)"
        stroke="rgba(15,28,36,0.08)"
      />
      <text x={TRAY_X + 14} y={cueY + 16} className="fill-ink-600 text-[10px]">
        One nucleus is still yes/no. The smooth curve is the sample expectation.
      </text>
    </g>
  );
}

function renderRow(
  frame: ReturnType<typeof sampleRadioactivityHalfLifeState>,
  rowTop: number,
  options: {
    label: string;
    compareBadge?: string;
    overlayValues?: Record<string, boolean>;
    focusedOverlayId?: string | null;
    muted?: boolean;
  },
) {
  return (
    <g opacity={options.muted ? 0.38 : 1}>
      <rect
        x={BENCH_LEFT}
        y={rowTop}
        width={BENCH_WIDTH}
        height={ROW_HEIGHT}
        rx="28"
        fill="rgba(255,253,247,0.82)"
        stroke="rgba(15,28,36,0.08)"
        strokeWidth="1.5"
      />
      <text
        x={BENCH_LEFT + 16}
        y={rowTop + 22}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        {options.label}
      </text>
      <text
        x={BENCH_LEFT + BENCH_WIDTH - 16}
        y={rowTop + 22}
        textAnchor="end"
        className="fill-ink-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        {options.compareBadge ?? `${formatNumber(frame.timeSeconds)} s`}
      </text>
      {renderSampleTray(frame, rowTop, options)}
      {renderExpectationBars(frame, rowTop, options)}
      {renderHalfLifeTrack(frame, rowTop, options)}
      {renderSingleVsSampleCue(frame, rowTop, options)}
    </g>
  );
}

export function RadioactivityHalfLifeSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: RadioactivityHalfLifeSimulationProps) {
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  const activeFrame = buildFrame(params, displayTime, graphPreview);
  const frameA = compare ? buildFrame(compare.setupA, displayTime) : null;
  const frameB = compare ? buildFrame(compare.setupB, displayTime) : null;
  const { compareEnabled, previewedSetup, primaryFrame, primaryLabel, secondaryLabel } =
    resolveCompareScene({
      compare,
      graphPreview,
      activeFrame,
      frameA,
      frameB,
      liveLabel: "Live setup",
    });
  const previewBadge =
    graphPreview?.kind === "time" ? (
      <SimulationPreviewBadge tone="teal">
        preview {graphPreview.seriesLabel} t = {formatNumber(graphPreview.time)} s
      </SimulationPreviewBadge>
    ) : null;
  const setupBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 font-semibold text-teal-700">
        {(compare?.labelA ?? "Setup A")}: {buildSetupSummary(frameA!)}
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: {buildSetupSummary(frameB!)}
      </span>
    </div>
  ) : null;
  const metricRows = [
    { label: "t", value: formatMeasurement(primaryFrame.timeSeconds, "s") },
    { label: "half-lives", value: formatNumber(primaryFrame.elapsedHalfLives) },
    {
      label: "actual",
      value: `${primaryFrame.actualRemainingCount} / ${primaryFrame.sampleSize}`,
    },
    {
      label: "expected",
      value: formatNumber(primaryFrame.expectedRemainingCount, 1),
    },
    { label: "actual f", value: formatPercent(primaryFrame.actualFraction) },
    { label: "expected f", value: formatPercent(primaryFrame.expectedFraction) },
    {
      label: "1-nucleus P",
      value: formatPercent(primaryFrame.survivalProbability),
    },
    {
      label: "spread",
      value: formatPercent(primaryFrame.deviationFraction),
    },
  ];
  const noteLines = [
    primaryFrame.sampleSize <= 16
      ? "Small samples stay visibly jagged because each decay is a single yes/no event."
      : "Large samples smooth out because many independent yes/no events are being averaged.",
    "A half-life halves the expected sample, not each nucleus on a fixed schedule.",
    `Recent decays visible now: ${primaryFrame.recentDecayCount}.`,
  ];

  return (
    <SimulationSceneCard
      title={concept.title}
      description="A bounded sample tray, expected-decay bars, and linked time graphs keep single-event chance and large-sample regularity on one honest bench."
      headerClassName="bg-[linear-gradient(135deg,rgba(30,166,162,0.1),rgba(240,171,60,0.12),rgba(78,166,223,0.1))]"
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
          {setupBadges}
        </>
      }
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
      >
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.48)" />
        {compareEnabled ? (
          <>
            {renderRow(frameA!, COMPARE_ROW_TOP.a, {
              label: compare?.labelA ?? "Setup A",
              compareBadge: compare?.activeTarget === "a" ? "editing" : "locked",
              overlayValues,
              focusedOverlayId,
              muted: previewedSetup === "b",
            })}
            {renderRow(frameB!, COMPARE_ROW_TOP.b, {
              label: compare?.labelB ?? "Setup B",
              compareBadge: compare?.activeTarget === "b" ? "editing" : "locked",
              overlayValues,
              focusedOverlayId,
              muted: previewedSetup === "a",
            })}
          </>
        ) : (
          renderRow(activeFrame, SINGLE_ROW_TOP, {
            label: "Live decay bench",
            overlayValues,
            focusedOverlayId,
          })
        )}
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Decay state"
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={noteLines}
        />
      </svg>
    </SimulationSceneCard>
  );
}
