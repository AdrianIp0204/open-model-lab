"use client";

import {
  ELECTROMAGNETIC_WAVES_MAGNETIC_DISPLAY_SCALE,
  ELECTROMAGNETIC_WAVES_STAGE_LENGTH,
  clamp,
  formatMeasurement,
  formatNumber,
  getElectromagneticWaveCrestPositions,
  resolveElectromagneticWavesParams,
  sampleElectromagneticWaveElectricField,
  sampleElectromagneticWavesState,
  sampleRange,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import { SimulationAxisDragSurface } from "./primitives/SimulationAxisDragSurface";
import {
  CompareLegend,
  resolveCompareScene,
  SimulationPreviewBadge,
} from "./primitives/compare";
import { resolveOverlayOpacity } from "./primitives/overlay";
import { SimulationSceneCard } from "./primitives/scene-card";
import { SvgArrow } from "./primitives/electric-stage";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type ElectromagneticWavesSimulationProps = {
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
  params: ReturnType<typeof resolveElectromagneticWavesParams>;
  snapshot: ReturnType<typeof sampleElectromagneticWavesState>;
};

const WIDTH = 860;
const HEIGHT = 392;
const LEFT_X = 116;
const WAVE_WIDTH = 470;
const RIGHT_X = LEFT_X + WAVE_WIDTH;
const PIXELS_PER_METER = WAVE_WIDTH / ELECTROMAGNETIC_WAVES_STAGE_LENGTH;
const CARD_WIDTH = 230;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const ROW_HALF_HEIGHT = 92;
const ELECTRIC_OFFSET = 34;
const MAGNETIC_OFFSET = 48;
const ELECTRIC_SCALE = 28;
const MAGNETIC_SCALE = 28;
const SINGLE_ROW_CENTER = 186;
const COMPARE_ROW_CENTERS: Record<GraphSeriesSetupId, number> = {
  a: 110,
  b: 268,
};
const WAVE_SAMPLE_COUNT = 221;
const RULER_TICKS = sampleRange(0, ELECTROMAGNETIC_WAVES_STAGE_LENGTH, 9);

function xFromPhysical(position: number) {
  return LEFT_X + position * PIXELS_PER_METER;
}

function physicalXFromStage(stageX: number) {
  return clamp((stageX - LEFT_X) / PIXELS_PER_METER, 0, ELECTROMAGNETIC_WAVES_STAGE_LENGTH);
}

function yFromElectric(value: number, rowCenter: number) {
  return rowCenter - ELECTRIC_OFFSET - value * ELECTRIC_SCALE;
}

function yFromMagnetic(value: number, rowCenter: number) {
  return rowCenter + MAGNETIC_OFFSET - value * MAGNETIC_SCALE;
}

function buildFrame(
  source: SimulationParams,
  time: number,
  previewProbeX?: number,
): WaveFrame {
  const params = resolveElectromagneticWavesParams(source);

  return {
    params,
    snapshot: sampleElectromagneticWavesState(params, time, previewProbeX),
  };
}

function buildElectricPath(frame: WaveFrame, rowCenter: number) {
  return sampleRange(0, ELECTROMAGNETIC_WAVES_STAGE_LENGTH, WAVE_SAMPLE_COUNT)
    .map((position, index) => {
      const x = xFromPhysical(position);
      const y = yFromElectric(
        sampleElectromagneticWaveElectricField(frame.params, position, frame.snapshot.time),
        rowCenter,
      );

      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildMagneticPath(frame: WaveFrame, rowCenter: number) {
  return sampleRange(0, ELECTROMAGNETIC_WAVES_STAGE_LENGTH, WAVE_SAMPLE_COUNT)
    .map((position, index) => {
      const electricValue = sampleElectromagneticWaveElectricField(
        frame.params,
        position,
        frame.snapshot.time,
      );
      const displayMagnetic =
        (electricValue / Math.max(frame.params.waveSpeed, 1e-6)) *
        ELECTROMAGNETIC_WAVES_MAGNETIC_DISPLAY_SCALE;
      const x = xFromPhysical(position);
      const y = yFromMagnetic(displayMagnetic, rowCenter);

      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function renderMagneticGlyph({
  x,
  y,
  fieldValue,
  muted = false,
}: {
  x: number;
  y: number;
  fieldValue: number;
  muted?: boolean;
}) {
  const opacity = muted ? 0.56 : 1;

  return (
    <g opacity={opacity}>
      <circle
        cx={x}
        cy={y}
        r="8.5"
        fill="rgba(255,251,244,0.96)"
        stroke="#f0ab3c"
        strokeWidth="2.4"
      />
      {fieldValue > 0.03 ? (
        <>
          <circle cx={x} cy={y} r="3" fill="#f0ab3c" />
          <circle cx={x} cy={y} r="1.2" fill="rgba(255,253,247,0.96)" />
        </>
      ) : fieldValue < -0.03 ? (
        <>
          <line
            x1={x - 3.2}
            y1={y - 3.2}
            x2={x + 3.2}
            y2={y + 3.2}
            stroke="#b87000"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1={x + 3.2}
            y1={y - 3.2}
            x2={x - 3.2}
            y2={y + 3.2}
            stroke="#b87000"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : (
        <circle cx={x} cy={y} r="2.8" fill="none" stroke="#b87000" strokeWidth="1.6" />
      )}
    </g>
  );
}

function findWavelengthPair(frame: WaveFrame) {
  const crests = getElectromagneticWaveCrestPositions(frame.params, frame.snapshot.time);

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

  if (nextCandidate <= ELECTROMAGNETIC_WAVES_STAGE_LENGTH) {
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
  const crestY = yFromElectric(frame.params.electricAmplitude, rowCenter);
  const guideY = crestY - 18;

  return (
    <g pointerEvents="none" opacity={opacity}>
      <line
        x1={leftX}
        x2={leftX}
        y1={crestY}
        y2={guideY + 5}
        stroke="rgba(78,166,223,0.68)"
        strokeDasharray="4 4"
      />
      <line
        x1={rightX}
        x2={rightX}
        y1={crestY}
        y2={guideY + 5}
        stroke="rgba(78,166,223,0.68)"
        strokeDasharray="4 4"
      />
      <line
        x1={leftX}
        x2={rightX}
        y1={guideY}
        y2={guideY}
        stroke="#4ea6df"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
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

function renderProbeGuide(
  frame: WaveFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "probeGuide", 0.4);
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
      <line
        x1={LEFT_X}
        x2={LEFT_X}
        y1={guideY - 5}
        y2={guideY + 5}
        stroke="rgba(15,28,36,0.34)"
        strokeWidth="2"
      />
      <line
        x1={probeX}
        x2={probeX}
        y1={guideY - 5}
        y2={guideY + 5}
        stroke="rgba(15,28,36,0.34)"
        strokeWidth="2"
      />
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

function renderPropagationTriad(
  frame: WaveFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "propagationTriad", 0.4);
  const probeX = xFromPhysical(frame.snapshot.probeX);
  const availableRight = RIGHT_X - probeX;
  const originX = availableRight > 120 ? probeX + 52 : probeX - 72;
  const originY = rowCenter + 4;
  const electricSign = frame.snapshot.electricField >= 0 ? -1 : 1;
  const magneticSign = frame.snapshot.magneticField >= 0 ? "out of page" : "into page";

  return (
    <g pointerEvents="none" opacity={opacity}>
      <rect
        x={originX - 26}
        y={originY - 48}
        width="118"
        height="86"
        rx="18"
        fill="rgba(255,253,247,0.92)"
        stroke="rgba(15,28,36,0.1)"
      />
      <SvgArrow
        x1={originX}
        y1={originY}
        x2={originX + 38}
        y2={originY}
        stroke="#4ea6df"
        strokeWidth={2.5}
      />
      <SvgArrow
        x1={originX}
        y1={originY}
        x2={originX}
        y2={originY + electricSign * 28}
        stroke="#1ea6a2"
        strokeWidth={2.5}
      />
      {renderMagneticGlyph({
        x: originX - 18,
        y: originY,
        fieldValue: frame.snapshot.magneticField,
      })}
      <text x={originX + 44} y={originY + 4} className="fill-sky-700 text-[10px] font-semibold">
        flow
      </text>
      <text
        x={originX + 6}
        y={originY + electricSign * 36}
        className="fill-teal-700 text-[10px] font-semibold"
      >
        E
      </text>
      <text x={originX - 28} y={originY + 4} className="fill-amber-700 text-[10px] font-semibold">
        B
      </text>
      <text
        x={originX - 14}
        y={originY - 30}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        {"E x B -> right"}
      </text>
      <text x={originX - 16} y={originY + 28} className="fill-ink-500 text-[10px]">
        {magneticSign}
      </text>
    </g>
  );
}

function renderRuler(rowCenter: number) {
  const rulerY = rowCenter + ROW_HALF_HEIGHT + 16;

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
        propagation axis
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
  const opacity = options.muted ? 0.34 : 1;
  const top = rowCenter - ROW_HALF_HEIGHT;
  const bottom = rowCenter + ROW_HALF_HEIGHT;
  const electricY = yFromElectric(frame.snapshot.electricField, rowCenter);
  const magneticY = yFromMagnetic(frame.snapshot.displayMagneticField, rowCenter);
  const probeX = xFromPhysical(frame.snapshot.probeX);
  const showWavelengthGuide = options.overlayValues?.wavelengthGuide ?? true;
  const showProbeGuide = options.overlayValues?.probeGuide ?? false;
  const showPropagationTriad = options.overlayValues?.propagationTriad ?? true;

  return (
    <g opacity={opacity}>
      <rect
        x={24}
        y={top - 18}
        width={WIDTH - 48}
        height={bottom - top + 48}
        rx="24"
        fill="rgba(255,253,247,0.82)"
        stroke={options.interactive ? "rgba(78,166,223,0.22)" : "rgba(15,28,36,0.08)"}
        strokeWidth={options.interactive ? "2" : "1.5"}
      />
      <text
        x={42}
        y={top - 2}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
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
        x={RIGHT_X - 4}
        y={top + 12}
        textAnchor="end"
        className="fill-sky-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        propagates right
      </text>
      <line
        x1={LEFT_X}
        x2={RIGHT_X}
        y1={rowCenter - ELECTRIC_OFFSET}
        y2={rowCenter - ELECTRIC_OFFSET}
        stroke="rgba(30,166,162,0.16)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1={LEFT_X}
        x2={RIGHT_X}
        y1={rowCenter + MAGNETIC_OFFSET}
        y2={rowCenter + MAGNETIC_OFFSET}
        stroke="rgba(240,171,60,0.16)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text
        x={LEFT_X - 58}
        y={rowCenter - ELECTRIC_OFFSET + 4}
        className="fill-teal-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        E_y
      </text>
      <text
        x={LEFT_X - 74}
        y={rowCenter + MAGNETIC_OFFSET + 4}
        className="fill-amber-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        B_z
      </text>
      <path
        d={buildElectricPath(frame, rowCenter)}
        fill="none"
        stroke="#1ea6a2"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d={buildMagneticPath(frame, rowCenter)}
        fill="none"
        stroke="#f0ab3c"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {showWavelengthGuide
        ? renderWavelengthGuide(frame, rowCenter, options.focusedOverlayId)
        : null}
      {showProbeGuide ? renderProbeGuide(frame, rowCenter, options.focusedOverlayId) : null}
      {showPropagationTriad
        ? renderPropagationTriad(frame, rowCenter, options.focusedOverlayId)
        : null}
      <line
        x1={probeX}
        x2={probeX}
        y1={rowCenter - ELECTRIC_OFFSET}
        y2={rowCenter + MAGNETIC_OFFSET}
        stroke="rgba(15,28,36,0.18)"
        strokeDasharray="5 5"
      />
      <circle
        cx={probeX}
        cy={electricY}
        r="8"
        fill="#1ea6a2"
        stroke="rgba(255,253,247,0.96)"
        strokeWidth="2.4"
      />
      {renderMagneticGlyph({
        x: probeX,
        y: magneticY,
        fieldValue: frame.snapshot.magneticField,
      })}
      <text
        x={probeX}
        y={bottom - 8}
        textAnchor="middle"
        className="fill-coral-700 text-[11px] font-semibold"
      >
        probe
      </text>
      {options.interactive ? (
        <SimulationAxisDragSurface
          axis="x"
          svgWidth={WIDTH}
          svgHeight={HEIGHT}
          value={frame.snapshot.probeX}
          region={{
            x: LEFT_X,
            y: top - 12,
            width: RIGHT_X - LEFT_X,
            height: bottom - top + 36,
          }}
          ariaLabel={`Move probe position, current x ${formatNumber(frame.snapshot.probeX)} meters`}
          cursor="ew-resize"
          step={0.05}
          resolveValue={physicalXFromStage}
          onChange={(nextValue) => options.onAdjustProbe?.(nextValue)}
          homeValue={0}
          endValue={ELECTROMAGNETIC_WAVES_STAGE_LENGTH}
        />
      ) : null}
      {renderRuler(rowCenter)}
      <text
        x={RIGHT_X}
        y={bottom - 6}
        textAnchor="end"
        className="fill-ink-500 text-[10px]"
      >
        B curve drawn x{ELECTROMAGNETIC_WAVES_MAGNETIC_DISPLAY_SCALE} for readability
      </text>
    </g>
  );
}

export function ElectromagneticWavesSimulation({
  concept,
  params,
  time,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: ElectromagneticWavesSimulationProps) {
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  const activeFrame = buildFrame(params, displayTime);
  const frameA = compare ? buildFrame(compare.setupA, displayTime) : null;
  const frameB = compare ? buildFrame(compare.setupB, displayTime) : null;
  const {
    compareEnabled,
    previewedSetup,
    primaryFrame,
    primaryLabel,
  } = resolveCompareScene({
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
        preview t = {formatNumber(displayTime)} s
      </SimulationPreviewBadge>
    ) : null;
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? "Setup A")}: v {formatMeasurement(frameA!.snapshot.waveSpeed, "m/s")}, lambda{" "}
        {formatMeasurement(frameA!.snapshot.wavelength, "m")}
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: v {formatMeasurement(frameB!.snapshot.waveSpeed, "m/s")}, lambda{" "}
        {formatMeasurement(frameB!.snapshot.wavelength, "m")}
      </span>
    </div>
  ) : null;
  const metricRows = [
    {
      label: "E0",
      value: formatMeasurement(primaryFrame.snapshot.electricAmplitude, "arb."),
    },
    {
      label: "B0",
      value: formatMeasurement(primaryFrame.snapshot.magneticAmplitude, "arb."),
    },
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
      label: "probe x",
      value: formatMeasurement(primaryFrame.snapshot.probeX, "m"),
    },
    {
      label: "E_p",
      value: formatMeasurement(primaryFrame.snapshot.electricField, "arb."),
    },
    {
      label: "B_p",
      value: formatMeasurement(primaryFrame.snapshot.magneticField, "arb."),
    },
  ];
  const noteLines = [
    `Probe delay = ${formatMeasurement(primaryFrame.snapshot.travelDelay, "s")}.`,
    `Phase lag = ${formatNumber(primaryFrame.snapshot.phaseLagCycles)} cycles (${primaryFrame.snapshot.phaseAlignmentLabel}).`,
    `At the probe, E is ${primaryFrame.snapshot.electricDirectionLabel} and B is ${primaryFrame.snapshot.magneticDirectionLabel}.`,
  ];

  function handleAdjustProbe(nextProbeX: number) {
    setParam(
      "probeX",
      Number(clamp(nextProbeX, 0, ELECTROMAGNETIC_WAVES_STAGE_LENGTH).toFixed(2)),
    );
  }

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(78,166,223,0.1),rgba(30,166,162,0.08),rgba(240,171,60,0.08))]"
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
            {renderWaveRow(frameA!, COMPARE_ROW_CENTERS.a, {
              label: compare?.labelA ?? "Setup A",
              compareBadge: compare?.activeTarget === "a" ? "editing" : "locked",
              interactive: compare?.activeTarget === "a",
              overlayValues,
              focusedOverlayId,
              muted: previewedSetup === "b",
              onAdjustProbe: handleAdjustProbe,
            })}
            {renderWaveRow(frameB!, COMPARE_ROW_CENTERS.b, {
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
            label: "Live coupled fields",
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
          title="Field state"
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={noteLines}
        />
      </svg>
    </SimulationSceneCard>
  );
}
