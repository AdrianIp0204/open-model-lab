"use client";

import {
  LIGHT_SPECTRUM_MAGNETIC_DISPLAY_SCALE,
  LIGHT_SPECTRUM_STAGE_WINDOW,
  clamp,
  formatNumber,
  getLightSpectrumBand,
  lightSpectrumBands,
  resolveLightSpectrumLinkageParams,
  resolveLightSpectrumRailPosition,
  sampleLightSpectrumDisplayElectricField,
  sampleLightSpectrumLinkageState,
  formatSpectrumFrequency,
  formatSpectrumWavelength,
  formatSpeedFractionOfC,
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

type LightSpectrumLinkageSimulationProps = {
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
  params: ReturnType<typeof resolveLightSpectrumLinkageParams>;
  snapshot: ReturnType<typeof sampleLightSpectrumLinkageState>;
};

const WIDTH = 940;
const HEIGHT = 510;
const SPECTRUM_LEFT_X = 74;
const SPECTRUM_RIGHT_X = 626;
const SPECTRUM_TOP_Y = 74;
const SPECTRUM_HEIGHT = 26;
const WAVE_LEFT_X = 92;
const WAVE_WIDTH = 520;
const WAVE_RIGHT_X = WAVE_LEFT_X + WAVE_WIDTH;
const CARD_WIDTH = 246;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 20;
const SINGLE_ROW_CENTER = 286;
const COMPARE_ROW_CENTERS: Record<GraphSeriesSetupId, number> = {
  a: 206,
  b: 374,
};
const ROW_HALF_HEIGHT = 76;
const ELECTRIC_OFFSET = 26;
const MAGNETIC_OFFSET = 50;
const FIELD_SCALE = 28;
const WAVE_SAMPLE_COUNT = 241;

function xFromDisplay(position: number) {
  return WAVE_LEFT_X + (position / LIGHT_SPECTRUM_STAGE_WINDOW) * WAVE_WIDTH;
}

function displayPositionFromStage(stageX: number) {
  return clamp(
    ((stageX - WAVE_LEFT_X) / WAVE_WIDTH) * LIGHT_SPECTRUM_STAGE_WINDOW,
    0,
    LIGHT_SPECTRUM_STAGE_WINDOW,
  );
}

function xFromSpectrum(logWavelength: number) {
  const normalized = resolveLightSpectrumRailPosition(logWavelength);
  return SPECTRUM_LEFT_X + normalized * (SPECTRUM_RIGHT_X - SPECTRUM_LEFT_X);
}

function yFromElectric(value: number, rowCenter: number) {
  return rowCenter - ELECTRIC_OFFSET - value * FIELD_SCALE;
}

function yFromMagnetic(value: number, rowCenter: number) {
  return rowCenter + MAGNETIC_OFFSET - value * FIELD_SCALE;
}

function buildFrame(source: SimulationParams, time: number, probeCyclesOverride?: number): Frame {
  const params = resolveLightSpectrumLinkageParams(source);

  return {
    params,
    snapshot: sampleLightSpectrumLinkageState(params, time, probeCyclesOverride),
  };
}

function buildElectricPath(frame: Frame, rowCenter: number) {
  const points = Array.from({ length: WAVE_SAMPLE_COUNT }, (_, index) => {
    const position = (index / (WAVE_SAMPLE_COUNT - 1)) * LIGHT_SPECTRUM_STAGE_WINDOW;
    return {
      x: xFromDisplay(position),
      y: yFromElectric(
        sampleLightSpectrumDisplayElectricField(frame.params, position, frame.snapshot.time),
        rowCenter,
      ),
    };
  });

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
}

function buildMagneticPath(frame: Frame, rowCenter: number) {
  const points = Array.from({ length: WAVE_SAMPLE_COUNT }, (_, index) => {
    const position = (index / (WAVE_SAMPLE_COUNT - 1)) * LIGHT_SPECTRUM_STAGE_WINDOW;
    const electric = sampleLightSpectrumDisplayElectricField(frame.params, position, frame.snapshot.time);
    return {
      x: xFromDisplay(position),
      y: yFromMagnetic(
        electric * frame.snapshot.mediumIndex * LIGHT_SPECTRUM_MAGNETIC_DISPLAY_SCALE,
        rowCenter,
      ),
    };
  });

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
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
        stroke="#f59e0b"
        strokeWidth="2.4"
      />
      {fieldValue > 0.03 ? (
        <>
          <circle cx={x} cy={y} r="3" fill="#f59e0b" />
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

function renderSpectrumRail(
  frames: Array<{
    frame: Frame;
    label: string;
    setup?: GraphSeriesSetupId;
    muted?: boolean;
  }>,
  options: {
    focusedOverlayId?: string | null;
    overlayValues?: Record<string, boolean>;
  },
) {
  const showVisibleWindow = options.overlayValues?.visibleWindow ?? true;
  const visibleOpacity = resolveOverlayOpacity(options.focusedOverlayId, "visibleWindow", 0.42);
  const railWidth = SPECTRUM_RIGHT_X - SPECTRUM_LEFT_X;

  return (
    <g>
      <text
        x={SPECTRUM_LEFT_X}
        y={SPECTRUM_TOP_Y - 18}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        electromagnetic spectrum
      </text>
      <rect
        x={SPECTRUM_LEFT_X}
        y={SPECTRUM_TOP_Y}
        width={railWidth}
        height={SPECTRUM_HEIGHT}
        rx="13"
        fill="rgba(255,253,247,0.84)"
        stroke="rgba(15,28,36,0.1)"
      />
      {lightSpectrumBands.map((band) => {
        const segmentLeft = xFromSpectrum(band.minLogWavelength);
        const segmentRight = xFromSpectrum(band.maxLogWavelength);
        const segmentWidth = Math.max(14, segmentRight - segmentLeft);
        const visibleFill =
          band.id === "visible"
            ? "url(#visible-spectrum-gradient)"
            : band.railColor;

        return (
          <g key={band.id}>
            <rect
              x={segmentLeft}
              y={SPECTRUM_TOP_Y}
              width={segmentWidth}
              height={SPECTRUM_HEIGHT}
              rx="13"
              fill={visibleFill}
              opacity={band.id === "visible" ? 0.98 : 0.82}
            />
            <text
              x={segmentLeft + segmentWidth / 2}
              y={SPECTRUM_TOP_Y + SPECTRUM_HEIGHT + 16}
              textAnchor="middle"
              className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.12em]"
            >
              {band.shortLabel}
            </text>
          </g>
        );
      })}
      {showVisibleWindow ? (
        <g opacity={visibleOpacity}>
          <rect
            x={xFromSpectrum(getLightSpectrumBand("visible").minLogWavelength)}
            y={SPECTRUM_TOP_Y - 6}
            width={
              xFromSpectrum(getLightSpectrumBand("visible").maxLogWavelength) -
              xFromSpectrum(getLightSpectrumBand("visible").minLogWavelength)
            }
            height={SPECTRUM_HEIGHT + 12}
            rx="16"
            fill="none"
            stroke="rgba(249,115,22,0.92)"
            strokeWidth="2.2"
            strokeDasharray="5 4"
          />
          <text
            x={
              (xFromSpectrum(getLightSpectrumBand("visible").minLogWavelength) +
                xFromSpectrum(getLightSpectrumBand("visible").maxLogWavelength)) /
              2
            }
            y={SPECTRUM_TOP_Y - 10}
            textAnchor="middle"
            className="fill-coral-700 text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            visible window
          </text>
        </g>
      ) : null}
      {frames.map(({ frame, label, setup, muted }) => {
        const x = xFromSpectrum(frame.snapshot.logWavelength);
        const band = getLightSpectrumBand(frame.snapshot.bandId);
        const markerFill =
          frame.snapshot.visibleColorHex ??
          band.accentColor;
        const yBase = setup === "b" ? SPECTRUM_TOP_Y + SPECTRUM_HEIGHT + 30 : SPECTRUM_TOP_Y - 10;
        const textAnchor = setup === "b" ? "middle" : "middle";
        const opacity = muted ? 0.34 : 1;

        return (
          <g key={label} opacity={opacity}>
            <line
              x1={x}
              x2={x}
              y1={SPECTRUM_TOP_Y + SPECTRUM_HEIGHT / 2}
              y2={yBase}
              stroke={markerFill}
              strokeWidth="2.4"
              strokeDasharray={setup === "b" ? "5 4" : undefined}
            />
            <circle
              cx={x}
              cy={SPECTRUM_TOP_Y + SPECTRUM_HEIGHT / 2}
              r="6.8"
              fill={markerFill}
              stroke="rgba(255,253,247,0.96)"
              strokeWidth="2"
            />
            <text
              x={x}
              y={setup === "b" ? yBase + 12 : yBase - 6}
              textAnchor={textAnchor}
              className="fill-ink-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
            >
              {label}
            </text>
            <text
              x={x}
              y={setup === "b" ? yBase + 26 : yBase - 20}
              textAnchor={textAnchor}
              className="fill-ink-500 text-[10px]"
            >
              {frame.snapshot.isVisible
                ? `${frame.snapshot.visibleColorLabel} / ${formatSpectrumWavelength(frame.snapshot.vacuumWavelengthMeters)}`
                : `${band.shortLabel} / ${formatSpectrumWavelength(frame.snapshot.vacuumWavelengthMeters)}`}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function renderMediumCompression(
  frame: Frame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "mediumCompression", 0.42);
  const originX = WAVE_RIGHT_X - 170;
  const originY = rowCenter - 68;

  return (
    <g pointerEvents="none" opacity={opacity}>
      <rect
        x={originX}
        y={originY}
        width="158"
        height="64"
        rx="16"
        fill="rgba(255,253,247,0.92)"
        stroke="rgba(15,28,36,0.08)"
      />
      <text
        x={originX + 12}
        y={originY + 18}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        medium link
      </text>
      <text x={originX + 12} y={originY + 34} className="fill-sky-700 text-[10px] font-semibold">
        lambda_0 = {formatSpectrumWavelength(frame.snapshot.vacuumWavelengthMeters)}
      </text>
      <text x={originX + 12} y={originY + 48} className="fill-coral-700 text-[10px] font-semibold">
        lambda_m = {formatSpectrumWavelength(frame.snapshot.mediumWavelengthMeters)}
      </text>
      <text x={originX + 12} y={originY + 60} className="fill-ink-500 text-[10px]">
        v = {formatSpeedFractionOfC(frame.snapshot.phaseVelocityFractionC)}
      </text>
    </g>
  );
}

function renderProbeDelay(
  frame: Frame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "probeDelay", 0.42);
  const probeX = xFromDisplay(frame.snapshot.probeCycles * frame.snapshot.displayMediumWavelength);
  const guideY = rowCenter + ROW_HALF_HEIGHT - 4;

  return (
    <g pointerEvents="none" opacity={opacity}>
      <line
        x1={WAVE_LEFT_X}
        x2={probeX}
        y1={guideY}
        y2={guideY}
        stroke="rgba(15,28,36,0.22)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1={WAVE_LEFT_X}
        x2={WAVE_LEFT_X}
        y1={guideY - 5}
        y2={guideY + 5}
        stroke="rgba(15,28,36,0.3)"
        strokeWidth="2"
      />
      <line
        x1={probeX}
        x2={probeX}
        y1={guideY - 5}
        y2={guideY + 5}
        stroke="rgba(15,28,36,0.3)"
        strokeWidth="2"
      />
      <text
        x={(WAVE_LEFT_X + probeX) / 2}
        y={guideY - 8}
        textAnchor="middle"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        probe = {formatNumber(frame.snapshot.probeCycles)} lambda_m
      </text>
      <text x={WAVE_LEFT_X} y={guideY + 15} className="fill-ink-500 text-[10px]">
        x = {formatSpectrumWavelength(frame.snapshot.probeDistanceMeters)}
      </text>
      <text x={probeX} y={guideY + 15} textAnchor="end" className="fill-ink-500 text-[10px]">
        delay = {formatNumber(frame.snapshot.travelDelaySeconds)} s
      </text>
    </g>
  );
}

function renderFieldTriad(
  frame: Frame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "fieldTriad", 0.42);
  const probeX = xFromDisplay(frame.snapshot.probeCycles * frame.snapshot.displayMediumWavelength);
  const originX = probeX > WAVE_RIGHT_X - 120 ? probeX - 76 : probeX + 44;
  const originY = rowCenter + 6;
  const electricSign = frame.snapshot.electricField >= 0 ? -1 : 1;

  return (
    <g pointerEvents="none" opacity={opacity}>
      <rect
        x={originX - 28}
        y={originY - 42}
        width="116"
        height="84"
        rx="18"
        fill="rgba(255,253,247,0.92)"
        stroke="rgba(15,28,36,0.1)"
      />
      <SvgArrow
        x1={originX}
        y1={originY}
        x2={originX + 36}
        y2={originY}
        stroke="#4ea6df"
        strokeWidth={2.5}
      />
      <SvgArrow
        x1={originX}
        y1={originY}
        x2={originX}
        y2={originY + electricSign * 28}
        stroke="#19a59c"
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
        y={originY - 24}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        E x B points right
      </text>
      <text x={originX - 14} y={originY + 28} className="fill-ink-500 text-[10px]">
        {frame.snapshot.magneticDirectionLabel}
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
    interactive?: boolean;
    overlayValues?: Record<string, boolean>;
    focusedOverlayId?: string | null;
    muted?: boolean;
    onAdjustProbeCycles?: (probeCycles: number) => void;
  },
) {
  const opacity = options.muted ? 0.34 : 1;
  const top = rowCenter - ROW_HALF_HEIGHT;
  const bottom = rowCenter + ROW_HALF_HEIGHT;
  const probeDisplayX = xFromDisplay(frame.snapshot.probeCycles * frame.snapshot.displayMediumWavelength);
  const electricY = yFromElectric(frame.snapshot.electricField, rowCenter);
  const magneticY = yFromMagnetic(frame.snapshot.magneticField, rowCenter);
  const showMediumCompression = options.overlayValues?.mediumCompression ?? true;
  const showProbeDelay = options.overlayValues?.probeDelay ?? true;
  const showFieldTriad = options.overlayValues?.fieldTriad ?? true;
  const bandChipColor =
    frame.snapshot.visibleColorHex ??
    getLightSpectrumBand(frame.snapshot.bandId).accentColor;

  return (
    <g opacity={opacity}>
      <rect
        x={38}
        y={top - 18}
        width={WIDTH - 76}
        height={bottom - top + 44}
        rx="22"
        fill="rgba(255,253,247,0.82)"
        stroke={options.interactive ? "rgba(78,166,223,0.22)" : "rgba(15,28,36,0.08)"}
        strokeWidth={options.interactive ? "2" : "1.5"}
      />
      <text
        x={56}
        y={top - 2}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        {options.label}
      </text>
      {options.compareBadge ? (
        <text
          x={WAVE_RIGHT_X - 2}
          y={top - 2}
          textAnchor="end"
          className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
        >
          {options.compareBadge}
        </text>
      ) : null}
      <rect
        x={WAVE_LEFT_X}
        y={top + 6}
        width={WAVE_WIDTH}
        height={bottom - top - 12}
        rx="18"
        fill={frame.snapshot.visibleColorHex ? `${frame.snapshot.visibleColorHex}14` : "rgba(78,166,223,0.06)"}
      />
      <line
        x1={WAVE_LEFT_X}
        x2={WAVE_RIGHT_X}
        y1={rowCenter - ELECTRIC_OFFSET}
        y2={rowCenter - ELECTRIC_OFFSET}
        stroke="rgba(25,165,156,0.18)"
        strokeWidth="2"
      />
      <line
        x1={WAVE_LEFT_X}
        x2={WAVE_RIGHT_X}
        y1={rowCenter + MAGNETIC_OFFSET}
        y2={rowCenter + MAGNETIC_OFFSET}
        stroke="rgba(245,158,11,0.18)"
        strokeWidth="2"
      />
      <text
        x={WAVE_LEFT_X - 58}
        y={rowCenter - ELECTRIC_OFFSET + 4}
        className="fill-teal-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        E
      </text>
      <text
        x={WAVE_LEFT_X - 58}
        y={rowCenter + MAGNETIC_OFFSET + 4}
        className="fill-amber-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        B
      </text>
      <path
        d={buildElectricPath(frame, rowCenter)}
        fill="none"
        stroke="#19a59c"
        strokeWidth="3.3"
        strokeLinecap="round"
      />
      <path
        d={buildMagneticPath(frame, rowCenter)}
        fill="none"
        stroke="#f59e0b"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1={probeDisplayX}
        x2={probeDisplayX}
        y1={rowCenter - ELECTRIC_OFFSET}
        y2={rowCenter + MAGNETIC_OFFSET}
        stroke="rgba(15,28,36,0.18)"
        strokeDasharray="5 5"
      />
      <circle
        cx={probeDisplayX}
        cy={electricY}
        r="8"
        fill="#19a59c"
        stroke="rgba(255,253,247,0.96)"
        strokeWidth="2.4"
      />
      {renderMagneticGlyph({
        x: probeDisplayX,
        y: magneticY,
        fieldValue: frame.snapshot.magneticField,
      })}
      <text
        x={WAVE_LEFT_X}
        y={bottom + 12}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        display sketch keeps wavelength order readable while the spectrum rail above keeps the real band scale
      </text>
      <g transform={`translate(${WAVE_LEFT_X} ${top + 10})`}>
        <rect
          x="0"
          y="0"
          width="118"
          height="20"
          rx="10"
          fill={bandChipColor}
          opacity="0.14"
        />
        <text
          x="10"
          y="13"
          className="fill-ink-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
        >
          {frame.snapshot.isVisible
            ? `${frame.snapshot.visibleColorLabel} visible`
            : getLightSpectrumBand(frame.snapshot.bandId).shortLabel}
        </text>
      </g>
      {showMediumCompression
        ? renderMediumCompression(frame, rowCenter, options.focusedOverlayId)
        : null}
      {showProbeDelay ? renderProbeDelay(frame, rowCenter, options.focusedOverlayId) : null}
      {showFieldTriad ? renderFieldTriad(frame, rowCenter, options.focusedOverlayId) : null}
      {options.interactive ? (
        <SimulationAxisDragSurface
          axis="x"
          svgWidth={WIDTH}
          svgHeight={HEIGHT}
          value={frame.snapshot.probeCycles}
          region={{
            x: WAVE_LEFT_X,
            y: top,
            width: WAVE_WIDTH,
            height: bottom - top + 26,
          }}
          ariaLabel={`Move probe spacing, current ${formatNumber(frame.snapshot.probeCycles)} wavelengths`}
          cursor="ew-resize"
          step={0.05}
          resolveValue={(stageX) =>
            clamp(
              displayPositionFromStage(stageX) / Math.max(frame.snapshot.displayMediumWavelength, 1e-6),
              0.25,
              2,
            )
          }
          onChange={(nextValue) => options.onAdjustProbeCycles?.(nextValue)}
          homeValue={0.25}
          endValue={2}
        />
      ) : null}
    </g>
  );
}

export function LightSpectrumLinkageSimulation({
  concept,
  params,
  time,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: LightSpectrumLinkageSimulationProps) {
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  const activeFrame = buildFrame(params, displayTime);
  const frameA = compare ? buildFrame(compare.setupA, displayTime) : null;
  const frameB = compare ? buildFrame(compare.setupB, displayTime) : null;
  const { compareEnabled, previewedSetup, primaryFrame, primaryLabel } = resolveCompareScene({
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
        {(compare?.labelA ?? "Setup A")}: {formatSpectrumWavelength(frameA!.snapshot.vacuumWavelengthMeters)} / n {formatNumber(frameA!.snapshot.mediumIndex)}
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: {formatSpectrumWavelength(frameB!.snapshot.vacuumWavelengthMeters)} / n {formatNumber(frameB!.snapshot.mediumIndex)}
      </span>
    </div>
  ) : null;
  const metricRows = [
    {
      label: "band",
      value: primaryFrame.snapshot.isVisible
        ? `${primaryFrame.snapshot.visibleColorLabel} visible`
        : getLightSpectrumBand(primaryFrame.snapshot.bandId).shortLabel,
    },
    {
      label: "lambda_0",
      value: formatSpectrumWavelength(primaryFrame.snapshot.vacuumWavelengthMeters),
    },
    {
      label: "f",
      value: formatSpectrumFrequency(primaryFrame.snapshot.frequencyHz),
    },
    {
      label: "n",
      value: formatNumber(primaryFrame.snapshot.mediumIndex),
    },
    {
      label: "v",
      value: formatSpeedFractionOfC(primaryFrame.snapshot.phaseVelocityFractionC),
    },
    {
      label: "lambda_m",
      value: formatSpectrumWavelength(primaryFrame.snapshot.mediumWavelengthMeters),
    },
    {
      label: "probe",
      value: `${formatNumber(primaryFrame.snapshot.probeCycles)} lambda_m`,
    },
    {
      label: "E_p",
      value: formatNumber(primaryFrame.snapshot.electricField),
    },
    {
      label: "B_p",
      value: formatNumber(primaryFrame.snapshot.magneticField),
    },
  ];
  const noteLines = [
    `Actual period = ${formatNumber(primaryFrame.snapshot.periodSeconds)} s.`,
    `Path delay = ${formatNumber(primaryFrame.snapshot.travelDelaySeconds)} s.`,
    `Frequency stays fixed while lambda_m changes with n.`,
  ];

  function handleAdjustProbeCycles(nextProbeCycles: number) {
    setParam("probeCycles", Number(clamp(nextProbeCycles, 0.25, 2).toFixed(2)));
  }

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(78,166,223,0.1),rgba(249,115,22,0.08),rgba(25,165,156,0.08))]"
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
        <defs>
          <linearGradient id="visible-spectrum-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="20%" stopColor="#2563eb" />
            <stop offset="40%" stopColor="#0891b2" />
            <stop offset="58%" stopColor="#16a34a" />
            <stop offset="76%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.48)" />
        {renderSpectrumRail(
          compareEnabled
            ? [
                {
                  frame: frameA!,
                  label: compare?.labelA ?? "Setup A",
                  setup: "a",
                  muted: previewedSetup === "b",
                },
                {
                  frame: frameB!,
                  label: compare?.labelB ?? "Setup B",
                  setup: "b",
                  muted: previewedSetup === "a",
                },
              ]
            : [{ frame: activeFrame, label: "Live setup" }],
          { focusedOverlayId, overlayValues },
        )}
        {compareEnabled ? (
          <>
            {renderWaveRow(frameA!, COMPARE_ROW_CENTERS.a, {
              label: compare?.labelA ?? "Setup A",
              compareBadge: compare?.activeTarget === "a" ? "editing" : "locked",
              interactive: compare?.activeTarget === "a",
              overlayValues,
              focusedOverlayId,
              muted: previewedSetup === "b",
              onAdjustProbeCycles: handleAdjustProbeCycles,
            })}
            {renderWaveRow(frameB!, COMPARE_ROW_CENTERS.b, {
              label: compare?.labelB ?? "Setup B",
              compareBadge: compare?.activeTarget === "b" ? "editing" : "locked",
              interactive: compare?.activeTarget === "b",
              overlayValues,
              focusedOverlayId,
              muted: previewedSetup === "a",
              onAdjustProbeCycles: handleAdjustProbeCycles,
            })}
          </>
        ) : (
          renderWaveRow(activeFrame, SINGLE_ROW_CENTER, {
            label: "Live light field pair",
            interactive: true,
            overlayValues,
            focusedOverlayId,
            onAdjustProbeCycles: handleAdjustProbeCycles,
          })
        )}
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Light state"
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={noteLines}
        />
      </svg>
    </SimulationSceneCard>
  );
}
