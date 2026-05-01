"use client";

import {
  DE_BROGLIE_LOOP_CIRCUMFERENCE_NM,
  DE_BROGLIE_MAX_MOMENTUM_SCALED,
  DE_BROGLIE_MIN_MOMENTUM_SCALED,
  formatMeasurement,
  formatNumber,
  resolveDeBroglieMatterWavesParams,
  resolveDeBroglieSpeedFromMomentumScaled,
  sampleDeBroglieMatterWavesState,
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

type DeBroglieMatterWavesSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 960;
const HEIGHT = 540;
const CARD_WIDTH = 234;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 20;
const ROW_LEFT = 42;
const ROW_RIGHT = 700;
const SINGLE_ROW_CENTER = 286;
const ROW_HALF_HEIGHT = 102;
const COMPARE_ROW_CENTERS: Record<GraphSeriesSetupId, number> = {
  a: 192,
  b: 390,
};
const LOCAL_LEFT = 82;
const LOCAL_RIGHT = 350;
const LOOP_LEFT = 422;
const LOOP_RIGHT = 690;
const LOOP_CENTER_X = 556;
const LOOP_RADIUS = 74;
const LOOP_SEAM_GAP = 0.52;

function buildFrame(
  source: SimulationParams,
  graphPreview?: GraphStagePreview | null,
) {
  const resolved = resolveDeBroglieMatterWavesParams(source);

  if (!graphPreview || graphPreview.kind !== "response") {
    return sampleDeBroglieMatterWavesState(resolved);
  }

  const previewMomentum = Math.min(
    Math.max(graphPreview.point.x, DE_BROGLIE_MIN_MOMENTUM_SCALED),
    DE_BROGLIE_MAX_MOMENTUM_SCALED,
  );

  return sampleDeBroglieMatterWavesState({
    ...resolved,
    speedMms: resolveDeBroglieSpeedFromMomentumScaled(
      previewMomentum,
      resolved.massMultiple,
    ),
  });
}

function buildWavePath(
  left: number,
  right: number,
  centerY: number,
  cycles: number,
  amplitude: number,
) {
  const width = right - left;
  const samples = 160;
  let path = "";

  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const x = left + width * t;
    const y = centerY - amplitude * Math.sin(t * Math.PI * 2 * cycles);
    path += `${index === 0 ? "M" : " L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }

  return path;
}

function buildLoopWavePath(
  centerX: number,
  centerY: number,
  baseRadius: number,
  fitCount: number,
  amplitude: number,
) {
  const samples = 220;
  let path = "";
  let startPoint = { x: 0, y: 0 };
  let endPoint = { x: 0, y: 0 };

  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const angle = LOOP_SEAM_GAP / 2 + t * (Math.PI * 2 - LOOP_SEAM_GAP);
    const phase = t * Math.PI * 2 * fitCount;
    const radius = baseRadius + amplitude * Math.sin(phase);
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    if (index === 0) {
      startPoint = { x, y };
    }

    if (index === samples) {
      endPoint = { x, y };
    }

    path += `${index === 0 ? "M" : " L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }

  return { path, startPoint, endPoint };
}

function renderLocalWave(
  frame: ReturnType<typeof sampleDeBroglieMatterWavesState>,
  rowCenter: number,
  options: {
    focusedOverlayId?: string | null;
    overlayValues?: Record<string, boolean>;
    muted?: boolean;
  },
) {
  const top = rowCenter - 66;
  const bottom = rowCenter + 66;
  const waveY = rowCenter - 4;
  const width = LOCAL_RIGHT - LOCAL_LEFT;
  const showWavelengthGuide = options.overlayValues?.wavelengthGuide ?? true;
  const showMomentumLink = options.overlayValues?.momentumLink ?? true;
  const wavelengthOpacity = resolveOverlayOpacity(
    options.focusedOverlayId,
    "wavelengthGuide",
    0.42,
  );
  const momentumOpacity = resolveOverlayOpacity(
    options.focusedOverlayId,
    "momentumLink",
    0.42,
  );
  const amplitude = 22;
  const wavePath = buildWavePath(
    LOCAL_LEFT + 12,
    LOCAL_RIGHT - 12,
    waveY,
    frame.localCyclesOnStrip,
    amplitude,
  );
  const wavelengthWidth = width * (frame.wavelengthNm / frame.stripLengthNm);
  const guideStart = LOCAL_LEFT + 20;
  const guideEnd = Math.min(LOCAL_RIGHT - 20, guideStart + wavelengthWidth);
  const guideTruncated = wavelengthWidth > width - 40;

  return (
    <g opacity={options.muted ? 0.34 : 1}>
      <text
        x={LOCAL_LEFT}
        y={top - 14}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        local matter-wave spacing
      </text>
      <rect
        x={LOCAL_LEFT - 12}
        y={top}
        width={LOCAL_RIGHT - LOCAL_LEFT + 24}
        height={bottom - top}
        rx="22"
        fill="rgba(255,253,247,0.84)"
        stroke="rgba(15,28,36,0.08)"
      />
      <line
        x1={LOCAL_LEFT + 12}
        x2={LOCAL_RIGHT - 12}
        y1={waveY}
        y2={waveY}
        stroke="rgba(49,80,99,0.14)"
        strokeWidth="2"
      />
      <path
        d={wavePath}
        fill="none"
        stroke="#4ea6df"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <text
        x={LOCAL_LEFT + 14}
        y={bottom - 18}
        className="fill-ink-500 text-[10px]"
      >
        0.6 nm path window
      </text>
      {showWavelengthGuide ? (
        <g opacity={wavelengthOpacity}>
          <line
            x1={guideStart}
            x2={guideEnd}
            y1={top + 22}
            y2={top + 22}
            stroke="#1ea6a2"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <line
            x1={guideStart}
            x2={guideStart}
            y1={top + 14}
            y2={top + 30}
            stroke="#1ea6a2"
            strokeWidth="2"
          />
          <line
            x1={guideEnd}
            x2={guideEnd}
            y1={top + 14}
            y2={top + 30}
            stroke="#1ea6a2"
            strokeWidth="2"
          />
          {guideTruncated ? (
            <SvgArrow
              x1={guideEnd - 18}
              y1={top + 22}
              x2={guideEnd + 2}
              y2={top + 22}
              stroke="#1ea6a2"
              strokeWidth={2}
              dashed
            />
          ) : null}
          <text
            x={(guideStart + guideEnd) / 2}
            y={top + 10}
            textAnchor="middle"
            className="fill-teal-700 text-[10px] font-semibold"
          >
            lambda = {formatMeasurement(frame.wavelengthNm, "nm")}
          </text>
        </g>
      ) : null}
      {showMomentumLink ? (
        <g opacity={momentumOpacity}>
          <SvgArrow
            x1={LOCAL_LEFT + 18}
            y1={bottom - 34}
            x2={LOCAL_LEFT + 18 + (width - 56) * (frame.momentumScaled / DE_BROGLIE_MAX_MOMENTUM_SCALED)}
            y2={bottom - 34}
            stroke="#f16659"
            strokeWidth={3}
          />
          <text
            x={LOCAL_LEFT + 18}
            y={bottom - 42}
            className="fill-coral-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
          >
            p = mv
          </text>
          <text
            x={LOCAL_LEFT + 18}
            y={bottom - 20}
            className="fill-ink-600 text-[10px]"
          >
            p = {formatNumber(frame.momentumScaled)} x10^-24 kg m/s
          </text>
        </g>
      ) : null}
    </g>
  );
}

function renderLoopFit(
  frame: ReturnType<typeof sampleDeBroglieMatterWavesState>,
  rowCenter: number,
  options: {
    focusedOverlayId?: string | null;
    overlayValues?: Record<string, boolean>;
    muted?: boolean;
  },
) {
  const top = rowCenter - 74;
  const bottom = rowCenter + 74;
  const centerY = rowCenter;
  const showWholeNumberFit = options.overlayValues?.wholeNumberFit ?? true;
  const fitOpacity = resolveOverlayOpacity(
    options.focusedOverlayId,
    "wholeNumberFit",
    0.42,
  );
  const { path, startPoint, endPoint } = buildLoopWavePath(
    LOOP_CENTER_X,
    centerY,
    LOOP_RADIUS,
    frame.fitCount,
    12,
  );

  return (
    <g opacity={options.muted ? 0.34 : 1}>
      <text
        x={LOOP_LEFT}
        y={top - 14}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        fixed Bohr-like loop
      </text>
      <rect
        x={LOOP_LEFT - 12}
        y={top}
        width={LOOP_RIGHT - LOOP_LEFT + 24}
        height={bottom - top}
        rx="22"
        fill="rgba(255,253,247,0.84)"
        stroke="rgba(15,28,36,0.08)"
      />
      <circle
        cx={LOOP_CENTER_X}
        cy={centerY}
        r={LOOP_RADIUS}
        fill="none"
        stroke="rgba(49,80,99,0.16)"
        strokeWidth="2.2"
        strokeDasharray="5 5"
      />
      <path
        d={path}
        fill="none"
        stroke={frame.isNearWholeNumberFit ? "#1ea6a2" : "#4ea6df"}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <circle cx={startPoint.x} cy={startPoint.y} r="4.8" fill="#1ea6a2" />
      <circle cx={endPoint.x} cy={endPoint.y} r="4.8" fill="#f16659" />
      <text
        x={LOOP_CENTER_X}
        y={bottom - 18}
        textAnchor="middle"
        className="fill-ink-500 text-[10px]"
      >
        loop circumference L = {formatMeasurement(DE_BROGLIE_LOOP_CIRCUMFERENCE_NM, "nm")}
      </text>
      {showWholeNumberFit ? (
        <g opacity={fitOpacity}>
          <rect
            x={LOOP_LEFT + 6}
            y={top + 12}
            width="182"
            height="56"
            rx="16"
            fill="rgba(255,253,247,0.94)"
            stroke="rgba(15,28,36,0.08)"
          />
          <text
            x={LOOP_LEFT + 18}
            y={top + 31}
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
          >
            whole-number fit
          </text>
          <text
            x={LOOP_LEFT + 18}
            y={top + 46}
            className="fill-teal-700 text-[11px] font-semibold"
          >
            N = L / lambda = {formatNumber(frame.fitCount)}
          </text>
          <text
            x={LOOP_LEFT + 18}
            y={top + 60}
            className="fill-ink-600 text-[10px]"
          >
            {frame.isNearWholeNumberFit
              ? `close to n = ${frame.nearestWholeFit}`
              : `nearest n = ${frame.nearestWholeFit}, mismatch ${formatNumber(frame.fitErrorAbs)}`}
          </text>
        </g>
      ) : null}
    </g>
  );
}

function renderRow(
  frame: ReturnType<typeof sampleDeBroglieMatterWavesState>,
  rowCenter: number,
  options: {
    label: string;
    compareBadge?: string;
    overlayValues?: Record<string, boolean>;
    focusedOverlayId?: string | null;
    muted?: boolean;
  },
) {
  const top = rowCenter - ROW_HALF_HEIGHT;
  const bottom = rowCenter + ROW_HALF_HEIGHT;

  return (
    <g opacity={options.muted ? 0.34 : 1}>
      <rect
        x={ROW_LEFT}
        y={top}
        width={ROW_RIGHT - ROW_LEFT}
        height={bottom - top}
        rx="24"
        fill="rgba(255,253,247,0.88)"
        stroke="rgba(15,28,36,0.08)"
        strokeWidth="1.5"
      />
      <text
        x={ROW_LEFT + 16}
        y={top + 20}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        {options.label}
      </text>
      <text
        x={ROW_RIGHT - 18}
        y={top + 20}
        textAnchor="end"
        className="fill-ink-600 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        {options.compareBadge ??
          (frame.isNearWholeNumberFit ? "cleaner fit" : "seam mismatch")}
      </text>
      {renderLocalWave(frame, rowCenter, options)}
      {renderLoopFit(frame, rowCenter, options)}
    </g>
  );
}

function buildPreviewBadge(graphPreview: GraphStagePreview | null) {
  if (!graphPreview || graphPreview.kind !== "response") {
    return null;
  }

  return (
    <SimulationPreviewBadge tone="sky">
      preview p = {formatNumber(graphPreview.point.x)} x10^-24
    </SimulationPreviewBadge>
  );
}

function formatCompareSummary(frame: ReturnType<typeof sampleDeBroglieMatterWavesState>) {
  return `lambda ${formatNumber(frame.wavelengthNm)} nm / N ${formatNumber(frame.fitCount)}`;
}

export function DeBroglieMatterWavesSimulation({
  concept,
  params,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: DeBroglieMatterWavesSimulationProps) {
  const activeFrame = buildFrame(params, graphPreview);
  const frameA = compare
    ? buildFrame(compare.setupA, graphPreview?.setup === "a" ? graphPreview : null)
    : null;
  const frameB = compare
    ? buildFrame(compare.setupB, graphPreview?.setup === "b" ? graphPreview : null)
    : null;
  const { compareEnabled, previewedSetup, primaryFrame, primaryLabel, secondaryLabel } =
    resolveCompareScene({
      compare,
      graphPreview,
      activeFrame,
      frameA,
      frameB,
      liveLabel: "Live setup",
    });
  const previewBadge = buildPreviewBadge(graphPreview ?? null);
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? "Setup A")}: {formatCompareSummary(frameA!)}
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: {formatCompareSummary(frameB!)}
      </span>
    </div>
  ) : null;
  const metricRows = [
    { label: "mass", value: `${formatNumber(primaryFrame.massMultiple)} m_e` },
    { label: "speed", value: formatMeasurement(primaryFrame.speedMms, "Mm/s") },
    {
      label: "p",
      value: `${formatNumber(primaryFrame.momentumScaled)} x10^-24 kg m/s`,
    },
    { label: "lambda", value: formatMeasurement(primaryFrame.wavelengthNm, "nm") },
    {
      label: "v/c",
      value: formatNumber(primaryFrame.speedFractionC),
    },
    {
      label: "L",
      value: formatMeasurement(primaryFrame.loopCircumferenceNm, "nm"),
    },
    { label: "N", value: formatNumber(primaryFrame.fitCount) },
    {
      label: "nearest n",
      value: formatNumber(primaryFrame.nearestWholeFit),
    },
  ];
  const noteLines = [
    "This bench keeps a non-relativistic de Broglie link: larger momentum means smaller wavelength.",
    primaryFrame.isNearWholeNumberFit
      ? `The loop is close to a whole-number fit, so about ${primaryFrame.nearestWholeFit} wavelengths close the seam.`
      : `The loop is between whole-number fits, so the seam misses by about ${formatMeasurement(primaryFrame.seamMismatchNm, "nm")}.`,
    "The whole-number loop cue is a bounded bridge toward quantum behavior, not a full wavefunction model.",
  ];

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(78,166,223,0.14),rgba(30,166,162,0.1),rgba(241,102,89,0.08))]"
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
          {compareBadges}
        </>
      }
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
      >
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.48)" />
        {compareEnabled ? (
          <>
            {renderRow(frameA!, COMPARE_ROW_CENTERS.a, {
              label: compare?.labelA ?? "Setup A",
              compareBadge: compare?.activeTarget === "a" ? "editing" : "locked",
              overlayValues,
              focusedOverlayId,
              muted: previewedSetup === "b",
            })}
            {renderRow(frameB!, COMPARE_ROW_CENTERS.b, {
              label: compare?.labelB ?? "Setup B",
              compareBadge: compare?.activeTarget === "b" ? "editing" : "locked",
              overlayValues,
              focusedOverlayId,
              muted: previewedSetup === "a",
            })}
          </>
        ) : (
          renderRow(activeFrame, SINGLE_ROW_CENTER, {
            label: "Live matter-wave bench",
            overlayValues,
            focusedOverlayId,
          })
        )}
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Matter-wave state"
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={noteLines}
        />
      </svg>
    </SimulationSceneCard>
  );
}
