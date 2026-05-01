"use client";

import {
  PHOTOELECTRIC_EFFECT_MAX_COLLECTOR_VOLTAGE,
  PHOTOELECTRIC_EFFECT_MAX_FREQUENCY_PHz,
  PHOTOELECTRIC_EFFECT_MIN_COLLECTOR_VOLTAGE,
  PHOTOELECTRIC_EFFECT_MIN_FREQUENCY_PHz,
  TAU,
  clamp,
  formatMeasurement,
  formatNumber,
  getPhotoelectricBand,
  photoelectricEffectBands,
  resolvePhotoelectricFrequencyRailPosition,
  samplePhotoelectricEffectState,
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

type PhotoelectricEffectSimulationProps = {
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
const CARD_WIDTH = 236;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 20;
const ROW_LEFT = 48;
const ROW_RIGHT = 670;
const RAIL_LEFT = 122;
const RAIL_RIGHT = 526;
const LAMP_X = 118;
const EMITTER_X = 248;
const COLLECTOR_X = 514;
const PLATE_TOP_OFFSET = 40;
const PLATE_HEIGHT = 108;
const PLATE_WIDTH = 18;
const SINGLE_ROW_CENTER = 286;
const COMPARE_ROW_CENTERS: Record<GraphSeriesSetupId, number> = {
  a: 200,
  b: 382,
};
const ROW_HALF_HEIGHT = 96;

function railXFromFrequency(frequencyPHz: number) {
  return (
    RAIL_LEFT +
    resolvePhotoelectricFrequencyRailPosition(frequencyPHz) * (RAIL_RIGHT - RAIL_LEFT)
  );
}

function railXFromVoltage(collectorVoltage: number) {
  const clamped = clamp(
    collectorVoltage,
    PHOTOELECTRIC_EFFECT_MIN_COLLECTOR_VOLTAGE,
    PHOTOELECTRIC_EFFECT_MAX_COLLECTOR_VOLTAGE,
  );
  return (
    EMITTER_X + 14 +
    ((clamped - PHOTOELECTRIC_EFFECT_MIN_COLLECTOR_VOLTAGE) /
      (PHOTOELECTRIC_EFFECT_MAX_COLLECTOR_VOLTAGE - PHOTOELECTRIC_EFFECT_MIN_COLLECTOR_VOLTAGE)) *
      (COLLECTOR_X - EMITTER_X - 28)
  );
}

function resolvePreviewParams(
  source: SimulationParams,
  graphPreview?: GraphStagePreview | null,
) {
  if (!graphPreview || graphPreview.kind !== "response") {
    return source;
  }

  switch (graphPreview.graphId) {
    case "energy-balance":
      return {
        ...source,
        frequencyPHz: clamp(
          graphPreview.point.x,
          PHOTOELECTRIC_EFFECT_MIN_FREQUENCY_PHz,
          PHOTOELECTRIC_EFFECT_MAX_FREQUENCY_PHz,
        ),
      };
    case "collector-sweep":
      return {
        ...source,
        collectorVoltage: clamp(
          graphPreview.point.x,
          PHOTOELECTRIC_EFFECT_MIN_COLLECTOR_VOLTAGE,
          PHOTOELECTRIC_EFFECT_MAX_COLLECTOR_VOLTAGE,
        ),
      };
    case "intensity-sweep":
      return {
        ...source,
        intensity: clamp(graphPreview.point.x, 0.2, 1.8),
      };
    default:
      return source;
  }
}

function buildFrame(
  source: SimulationParams,
  time: number,
  graphPreview?: GraphStagePreview | null,
) {
  return samplePhotoelectricEffectState(resolvePreviewParams(source, graphPreview), time);
}

function renderFrequencyRail(
  frame: ReturnType<typeof samplePhotoelectricEffectState>,
  rowCenter: number,
  options: {
    interactive?: boolean;
    focusedOverlayId?: string | null;
    onAdjustFrequency?: (frequencyPHz: number) => void;
  },
) {
  const railY = rowCenter - ROW_HALF_HEIGHT + 18;
  const markerX = railXFromFrequency(frame.frequencyPHz);
  const thresholdX = railXFromFrequency(
    clamp(
      frame.thresholdFrequencyPHz,
      PHOTOELECTRIC_EFFECT_MIN_FREQUENCY_PHz,
      PHOTOELECTRIC_EFFECT_MAX_FREQUENCY_PHz,
    ),
  );
  const thresholdOpacity = resolveOverlayOpacity(
    options.focusedOverlayId,
    "thresholdGate",
    0.42,
  );

  return (
    <g>
      <text
        x={RAIL_LEFT}
        y={railY - 12}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        light frequency
      </text>
      <rect
        x={RAIL_LEFT}
        y={railY}
        width={RAIL_RIGHT - RAIL_LEFT}
        height="20"
        rx="10"
        fill="rgba(255,253,247,0.92)"
        stroke="rgba(15,28,36,0.1)"
      />
      {photoelectricEffectBands.map((band) => {
        const left = railXFromFrequency(band.minFrequencyPHz);
        const right = railXFromFrequency(band.maxFrequencyPHz);

        return (
          <g key={band.id}>
            <rect
              x={left}
              y={railY}
              width={Math.max(14, right - left)}
              height="20"
              rx="10"
              fill={band.railColor}
              opacity="0.82"
            />
            <text
              x={(left + right) / 2}
              y={railY + 34}
              textAnchor="middle"
              className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
            >
              {band.id === "visible" ? "visible" : band.label}
            </text>
          </g>
        );
      })}
      <g opacity={thresholdOpacity}>
        <line
          x1={thresholdX}
          x2={thresholdX}
          y1={railY - 12}
          y2={railY + 22}
          stroke="#f16659"
          strokeWidth="2"
          strokeDasharray="5 4"
        />
        <text
          x={thresholdX}
          y={railY - 16}
          textAnchor="middle"
          className="fill-coral-700 text-[10px] font-semibold uppercase tracking-[0.16em]"
        >
          f0
        </text>
      </g>
      <line
        x1={markerX}
        x2={markerX}
        y1={railY - 10}
        y2={railY + 20}
        stroke={frame.beamColorHex}
        strokeWidth="2.4"
      />
      <circle
        cx={markerX}
        cy={railY + 10}
        r="7"
        fill={frame.beamColorHex}
        stroke="rgba(255,253,247,0.96)"
        strokeWidth="2"
      />
      <text
        x={markerX}
        y={railY - 24}
        textAnchor="middle"
        className="fill-ink-700 text-[10px] font-semibold"
      >
        {formatMeasurement(frame.frequencyPHz, "PHz")}
      </text>
      {options.interactive ? (
        <SimulationAxisDragSurface
          axis="x"
          svgWidth={WIDTH}
          svgHeight={HEIGHT}
          value={frame.frequencyPHz}
          region={{
            x: RAIL_LEFT,
            y: railY - 18,
            width: RAIL_RIGHT - RAIL_LEFT,
            height: 56,
          }}
          ariaLabel={`Move light frequency, current ${formatNumber(frame.frequencyPHz)} PHz`}
          cursor="ew-resize"
          step={0.02}
          resolveValue={(stageX) =>
            clamp(
              PHOTOELECTRIC_EFFECT_MIN_FREQUENCY_PHz +
                ((stageX - RAIL_LEFT) / Math.max(RAIL_RIGHT - RAIL_LEFT, 1)) *
                  (PHOTOELECTRIC_EFFECT_MAX_FREQUENCY_PHz -
                    PHOTOELECTRIC_EFFECT_MIN_FREQUENCY_PHz),
              PHOTOELECTRIC_EFFECT_MIN_FREQUENCY_PHz,
              PHOTOELECTRIC_EFFECT_MAX_FREQUENCY_PHz,
            )
          }
          onChange={(nextValue) => options.onAdjustFrequency?.(Number(nextValue.toFixed(2)))}
          homeValue={PHOTOELECTRIC_EFFECT_MIN_FREQUENCY_PHz}
          endValue={PHOTOELECTRIC_EFFECT_MAX_FREQUENCY_PHz}
        />
      ) : null}
    </g>
  );
}

function renderBiasGauge(
  frame: ReturnType<typeof samplePhotoelectricEffectState>,
  rowCenter: number,
  options: {
    interactive?: boolean;
    focusedOverlayId?: string | null;
    onAdjustCollectorVoltage?: (collectorVoltage: number) => void;
  },
) {
  const gaugeY = rowCenter + ROW_HALF_HEIGHT - 10;
  const markerX = railXFromVoltage(frame.collectorVoltage);
  const stoppingX = railXFromVoltage(-frame.stoppingPotential);
  const stoppingOpacity = resolveOverlayOpacity(
    options.focusedOverlayId,
    "stoppingField",
    0.42,
  );
  const markerTone =
    frame.collectorVoltage >= 0 ? "#1ea6a2" : frame.collectorCurrent > 0 ? "#f59e0b" : "#f16659";

  return (
    <g>
      <text
        x={EMITTER_X}
        y={gaugeY - 14}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        collector voltage
      </text>
      <line
        x1={EMITTER_X + 14}
        x2={COLLECTOR_X - 14}
        y1={gaugeY}
        y2={gaugeY}
        stroke="rgba(15,28,36,0.22)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1={railXFromVoltage(0)}
        x2={railXFromVoltage(0)}
        y1={gaugeY - 8}
        y2={gaugeY + 8}
        stroke="rgba(15,28,36,0.26)"
        strokeWidth="2"
      />
      <text
        x={EMITTER_X + 14}
        y={gaugeY + 18}
        className="fill-ink-500 text-[10px]"
      >
        -4.5 V
      </text>
      <text
        x={railXFromVoltage(0)}
        y={gaugeY + 18}
        textAnchor="middle"
        className="fill-ink-500 text-[10px]"
      >
        0
      </text>
      <text
        x={COLLECTOR_X - 14}
        y={gaugeY + 18}
        textAnchor="end"
        className="fill-ink-500 text-[10px]"
      >
        +1.5 V
      </text>
      <g opacity={stoppingOpacity}>
        <line
          x1={stoppingX}
          x2={stoppingX}
          y1={gaugeY - 10}
          y2={gaugeY + 10}
          stroke="#f16659"
          strokeWidth="2"
          strokeDasharray="5 4"
        />
        <text
          x={stoppingX}
          y={gaugeY - 14}
          textAnchor="middle"
          className="fill-coral-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
        >
          -Vstop
        </text>
      </g>
      <circle
        cx={markerX}
        cy={gaugeY}
        r="7.5"
        fill={markerTone}
        stroke="rgba(255,253,247,0.96)"
        strokeWidth="2"
      />
      <text
        x={markerX}
        y={gaugeY - 14}
        textAnchor="middle"
        className="fill-ink-700 text-[10px] font-semibold"
      >
        {formatMeasurement(frame.collectorVoltage, "V")}
      </text>
      {options.interactive ? (
        <SimulationAxisDragSurface
          axis="x"
          svgWidth={WIDTH}
          svgHeight={HEIGHT}
          value={frame.collectorVoltage}
          region={{
            x: EMITTER_X + 14,
            y: gaugeY - 18,
            width: COLLECTOR_X - EMITTER_X - 28,
            height: 42,
          }}
          ariaLabel={`Move collector voltage, current ${formatNumber(frame.collectorVoltage)} V`}
          cursor="ew-resize"
          step={0.1}
          resolveValue={(stageX) =>
            clamp(
              PHOTOELECTRIC_EFFECT_MIN_COLLECTOR_VOLTAGE +
                ((stageX - (EMITTER_X + 14)) /
                  Math.max(COLLECTOR_X - EMITTER_X - 28, 1)) *
                  (PHOTOELECTRIC_EFFECT_MAX_COLLECTOR_VOLTAGE -
                    PHOTOELECTRIC_EFFECT_MIN_COLLECTOR_VOLTAGE),
              PHOTOELECTRIC_EFFECT_MIN_COLLECTOR_VOLTAGE,
              PHOTOELECTRIC_EFFECT_MAX_COLLECTOR_VOLTAGE,
            )
          }
          onChange={(nextValue) =>
            options.onAdjustCollectorVoltage?.(Number(nextValue.toFixed(2)))
          }
          homeValue={PHOTOELECTRIC_EFFECT_MIN_COLLECTOR_VOLTAGE}
          endValue={PHOTOELECTRIC_EFFECT_MAX_COLLECTOR_VOLTAGE}
        />
      ) : null}
    </g>
  );
}

function renderElectronPackets(
  frame: ReturnType<typeof samplePhotoelectricEffectState>,
  rowCenter: number,
  muted?: boolean,
) {
  if (!frame.aboveThreshold) {
    return null;
  }

  const gapWidth = COLLECTOR_X - EMITTER_X - PLATE_WIDTH;
  const availableCount = Math.max(2, Math.round(3 + frame.saturationCurrent * 2.2));
  const collectedCount = Math.round(availableCount * frame.currentFraction);
  const returnedCount = Math.max(0, availableCount - collectedCount);

  return (
    <>
      {Array.from({ length: collectedCount }, (_, index) => {
        const phase =
          (frame.time * frame.packetSpeedFactor * 0.72 + index / Math.max(collectedCount, 1)) % 1;
        const x = EMITTER_X + PLATE_WIDTH + 8 + phase * (gapWidth - 30);
        const y = rowCenter - 14 + Math.sin(phase * Math.PI) * 18 - index * 0.4;

        return (
          <circle
            key={`forward-${index}`}
            cx={x}
            cy={y}
            r="3.8"
            fill={frame.beamColorHex}
            opacity={muted ? 0.38 : 0.92}
          />
        );
      })}
      {Array.from({ length: returnedCount }, (_, index) => {
        const phase =
          (frame.time * (0.6 + frame.intensityFraction * 0.55) + index / Math.max(returnedCount, 1)) %
          1;
        const turnDistance =
          (0.26 + 0.5 * (1 - frame.currentFraction)) * (gapWidth - 40);
        const x = EMITTER_X + PLATE_WIDTH + 10 + Math.sin(phase * Math.PI) * turnDistance;
        const y = rowCenter + 18 + Math.sin(phase * TAU) * 7 + index * 0.8;

        return (
          <circle
            key={`return-${index}`}
            cx={x}
            cy={y}
            r="3.6"
            fill="#f16659"
            opacity={muted ? 0.28 : 0.72}
          />
        );
      })}
    </>
  );
}

function renderRow(
  frame: ReturnType<typeof samplePhotoelectricEffectState>,
  rowCenter: number,
  options: {
    label: string;
    compareBadge?: string;
    interactive?: boolean;
    overlayValues?: Record<string, boolean>;
    focusedOverlayId?: string | null;
    muted?: boolean;
    onAdjustFrequency?: (frequencyPHz: number) => void;
    onAdjustCollectorVoltage?: (collectorVoltage: number) => void;
  },
) {
  const top = rowCenter - ROW_HALF_HEIGHT;
  const bottom = rowCenter + ROW_HALF_HEIGHT;
  const showThreshold = options.overlayValues?.thresholdGate ?? true;
  const showIntensity = options.overlayValues?.intensityFlux ?? true;
  const showStopping = options.overlayValues?.stoppingField ?? true;
  const showEnergyBudget = options.overlayValues?.energyBudget ?? true;
  const thresholdOpacity = resolveOverlayOpacity(
    options.focusedOverlayId,
    "thresholdGate",
    0.42,
  );
  const intensityOpacity = resolveOverlayOpacity(
    options.focusedOverlayId,
    "intensityFlux",
    0.42,
  );
  const stoppingOpacity = resolveOverlayOpacity(
    options.focusedOverlayId,
    "stoppingField",
    0.42,
  );
  const budgetOpacity = resolveOverlayOpacity(
    options.focusedOverlayId,
    "energyBudget",
    0.42,
  );
  const opacity = options.muted ? 0.34 : 1;
  const beamOpacity = 0.18 + frame.intensityFraction * 0.45;
  const band = getPhotoelectricBand(frame.bandId);
  const collectorStroke =
    frame.collectorVoltage >= 0
      ? "#1ea6a2"
      : frame.collectorCurrent > 0
        ? "#f59e0b"
        : "#f16659";

  return (
    <g opacity={opacity}>
      <rect
        x={ROW_LEFT}
        y={top}
        width={ROW_RIGHT - ROW_LEFT}
        height={bottom - top}
        rx="24"
        fill="rgba(255,253,247,0.86)"
        stroke={options.interactive ? "rgba(78,166,223,0.22)" : "rgba(15,28,36,0.08)"}
        strokeWidth={options.interactive ? "2" : "1.5"}
      />
      <text
        x={ROW_LEFT + 16}
        y={top + 20}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        {options.label}
      </text>
      {options.compareBadge ? (
        <text
          x={ROW_RIGHT - 18}
          y={top + 20}
          textAnchor="end"
          className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
        >
          {options.compareBadge}
        </text>
      ) : null}

      {renderFrequencyRail(frame, rowCenter, {
        interactive: options.interactive,
        focusedOverlayId: options.focusedOverlayId,
        onAdjustFrequency: options.onAdjustFrequency,
      })}

      <circle
        cx={LAMP_X}
        cy={rowCenter}
        r="26"
        fill={frame.beamColorHex}
        opacity={0.18 + frame.intensityFraction * 0.2}
      />
      <circle
        cx={LAMP_X}
        cy={rowCenter}
        r="14"
        fill="rgba(255,253,247,0.96)"
        stroke={frame.beamColorHex}
        strokeWidth="3"
      />
      <polygon
        points={`${LAMP_X + 16},${rowCenter - 24} ${EMITTER_X},${rowCenter - 40} ${EMITTER_X},${rowCenter + 40} ${LAMP_X + 16},${rowCenter + 24}`}
        fill={frame.beamColorHex}
        opacity={beamOpacity}
      />
      <rect
        x={EMITTER_X}
        y={rowCenter - PLATE_TOP_OFFSET}
        width={PLATE_WIDTH}
        height={PLATE_HEIGHT}
        rx="8"
        fill="rgba(63,77,88,0.9)"
      />
      <rect
        x={COLLECTOR_X}
        y={rowCenter - PLATE_TOP_OFFSET}
        width={PLATE_WIDTH}
        height={PLATE_HEIGHT}
        rx="8"
        fill="rgba(255,253,247,0.94)"
        stroke={collectorStroke}
        strokeWidth="2.6"
      />
      <text
        x={LAMP_X}
        y={rowCenter - 40}
        textAnchor="middle"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        lamp
      </text>
      <text
        x={EMITTER_X + PLATE_WIDTH / 2}
        y={rowCenter - 52}
        textAnchor="middle"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        metal
      </text>
      <text
        x={COLLECTOR_X + PLATE_WIDTH / 2}
        y={rowCenter - 52}
        textAnchor="middle"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        collector
      </text>

      <g transform={`translate(${LAMP_X - 30} ${rowCenter + 34})`}>
        <rect
          x="0"
          y="0"
          width="102"
          height="22"
          rx="11"
          fill={band.accentColor}
          opacity="0.14"
        />
        <text
          x="51"
          y="14"
          textAnchor="middle"
          className="fill-ink-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
        >
          {frame.visibleColorLabel
            ? `${frame.visibleColorLabel} light`
            : band.label}
        </text>
      </g>

      {showThreshold ? (
        <g opacity={thresholdOpacity}>
          <rect
            x={EMITTER_X - 8}
            y={rowCenter - 56}
            width="32"
            height={Math.max(26, frame.workFunctionEv * 12)}
            rx="12"
            fill="rgba(241,102,89,0.12)"
            stroke="rgba(241,102,89,0.32)"
            strokeDasharray="5 4"
          />
          <text
            x={EMITTER_X + 8}
            y={rowCenter - 62}
            textAnchor="middle"
            className="fill-coral-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
          >
            phi
          </text>
        </g>
      ) : null}

      {renderElectronPackets(frame, rowCenter, options.muted)}

      {!frame.aboveThreshold ? (
        <text
          x={EMITTER_X + 44}
          y={rowCenter + 4}
          className="fill-coral-700 text-[12px] font-semibold"
        >
          hf below phi: no emitted electrons
        </text>
      ) : null}

      {showIntensity ? (
        <g opacity={intensityOpacity}>
          <rect
            x={ROW_LEFT + 16}
            y={bottom - 46}
            width="150"
            height="30"
            rx="15"
            fill="rgba(255,253,247,0.92)"
            stroke="rgba(15,28,36,0.08)"
          />
          <text
            x={ROW_LEFT + 28}
            y={bottom - 26}
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
          >
            intensity
          </text>
          <text
            x={ROW_LEFT + 140}
            y={bottom - 26}
            textAnchor="end"
            className="fill-amber-700 text-[11px] font-semibold"
          >
            {formatMeasurement(frame.intensity, "arb.")}
          </text>
          <text
            x={ROW_LEFT + 170}
            y={bottom - 26}
            className="fill-ink-500 text-[10px]"
          >
            changes count, not KE
          </text>
        </g>
      ) : null}

      {showStopping ? (
        <g opacity={stoppingOpacity}>
          <SvgArrow
            x1={EMITTER_X + 34}
            y1={rowCenter + 46}
            x2={
              frame.collectorVoltage >= 0
                ? COLLECTOR_X - 14
                : EMITTER_X + 46
            }
            y2={rowCenter + 46}
            stroke={collectorStroke}
            strokeWidth={3}
            dashed={frame.collectorVoltage < 0}
          />
          <text
            x={(EMITTER_X + COLLECTOR_X) / 2}
            y={rowCenter + 42}
            textAnchor="middle"
            className="fill-ink-700 text-[10px] font-semibold"
          >
            {frame.collectorAssistLabel}
          </text>
          <text
            x={(EMITTER_X + COLLECTOR_X) / 2}
            y={rowCenter + 56}
            textAnchor="middle"
            className="fill-ink-500 text-[10px]"
          >
            Vstop = {formatMeasurement(frame.stoppingPotential, "V")}
          </text>
        </g>
      ) : null}

      {showEnergyBudget ? (
        <g opacity={budgetOpacity}>
          <rect
            x={ROW_RIGHT - 214}
            y={top + 34}
            width="190"
            height="62"
            rx="16"
            fill="rgba(255,253,247,0.94)"
            stroke="rgba(15,28,36,0.08)"
          />
          <text
            x={ROW_RIGHT - 200}
            y={top + 54}
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            energy budget
          </text>
          <text
            x={ROW_RIGHT - 200}
            y={top + 70}
            className="fill-sky-700 text-[11px] font-semibold"
          >
            hf = {formatMeasurement(frame.photonEnergyEv, "eV")}
          </text>
          <text
            x={ROW_RIGHT - 200}
            y={top + 84}
            className="fill-coral-700 text-[11px] font-semibold"
          >
            phi = {formatMeasurement(frame.workFunctionEv, "eV")}
          </text>
          <text
            x={ROW_RIGHT - 200}
            y={top + 98}
            className="fill-teal-700 text-[11px] font-semibold"
          >
            Kmax = {formatMeasurement(frame.maxKineticEnergyEv, "eV")}
          </text>
        </g>
      ) : null}

      {renderBiasGauge(frame, rowCenter, {
        interactive: options.interactive,
        focusedOverlayId: options.focusedOverlayId,
        onAdjustCollectorVoltage: options.onAdjustCollectorVoltage,
      })}
    </g>
  );
}

function buildPreviewBadge(preview: GraphStagePreview | null) {
  if (!preview || preview.kind !== "response") {
    return null;
  }

  if (preview.graphId === "energy-balance") {
    return <SimulationPreviewBadge tone="sky">preview f = {formatNumber(preview.point.x)} PHz</SimulationPreviewBadge>;
  }

  if (preview.graphId === "collector-sweep") {
    return <SimulationPreviewBadge tone="coral">preview Vc = {formatNumber(preview.point.x)} V</SimulationPreviewBadge>;
  }

  return (
    <SimulationPreviewBadge tone="teal">
      preview intensity = {formatNumber(preview.point.x)}
    </SimulationPreviewBadge>
  );
}

export function PhotoelectricEffectSimulation({
  concept,
  params,
  time,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: PhotoelectricEffectSimulationProps) {
  const activeFrame = buildFrame(params, time, graphPreview);
  const frameA = compare
    ? buildFrame(
        compare.setupA,
        time,
        graphPreview?.setup === "a" ? graphPreview : null,
      )
    : null;
  const frameB = compare
    ? buildFrame(
        compare.setupB,
        time,
        graphPreview?.setup === "b" ? graphPreview : null,
      )
    : null;
  const {
    compareEnabled,
    previewedSetup,
    primaryFrame,
    primaryLabel,
    secondaryLabel,
  } = resolveCompareScene({
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
        {(compare?.labelA ?? "Setup A")}: {formatMeasurement(frameA!.frequencyPHz, "PHz")} / Icol{" "}
        {formatNumber(frameA!.collectorCurrent)}
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: {formatMeasurement(frameB!.frequencyPHz, "PHz")} / Icol{" "}
        {formatNumber(frameB!.collectorCurrent)}
      </span>
    </div>
  ) : null;
  const metricRows = [
    {
      label: "band",
      value: primaryFrame.visibleColorLabel
        ? `${primaryFrame.visibleColorLabel} light`
        : primaryFrame.bandLabel,
    },
    { label: "hf", value: formatMeasurement(primaryFrame.photonEnergyEv, "eV") },
    { label: "phi", value: formatMeasurement(primaryFrame.workFunctionEv, "eV") },
    { label: "Kmax", value: formatMeasurement(primaryFrame.maxKineticEnergyEv, "eV") },
    { label: "Vstop", value: formatMeasurement(primaryFrame.stoppingPotential, "V") },
    { label: "Iavail", value: formatMeasurement(primaryFrame.saturationCurrent, "arb.") },
    { label: "Icol", value: formatMeasurement(primaryFrame.collectorCurrent, "arb.") },
    { label: "Vc", value: formatMeasurement(primaryFrame.collectorVoltage, "V") },
  ];
  const noteLines = [
    `Threshold f0 = ${formatMeasurement(primaryFrame.thresholdFrequencyPHz, "PHz")}.`,
    primaryFrame.aboveThreshold
      ? "Above threshold, intensity changes count while frequency sets electron energy."
      : "Below threshold, no brightness increase can eject electrons in this model.",
    primaryFrame.collectorAssistLabel,
  ];

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(99,102,241,0.12),rgba(245,158,11,0.1),rgba(30,166,162,0.08))]"
      headerAside={
        <>
          {previewBadge}
          {compareEnabled ? (
            <CompareLegend
              primaryLabel={primaryLabel}
              secondaryLabel={secondaryLabel}
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
            {renderRow(frameA!, COMPARE_ROW_CENTERS.a, {
              label: compare?.labelA ?? "Setup A",
              compareBadge: compare?.activeTarget === "a" ? "editing" : "locked",
              interactive: compare?.activeTarget === "a",
              overlayValues,
              focusedOverlayId,
              muted: previewedSetup === "b",
              onAdjustFrequency: (frequencyPHz) => setParam("frequencyPHz", frequencyPHz),
              onAdjustCollectorVoltage: (collectorVoltage) =>
                setParam("collectorVoltage", collectorVoltage),
            })}
            {renderRow(frameB!, COMPARE_ROW_CENTERS.b, {
              label: compare?.labelB ?? "Setup B",
              compareBadge: compare?.activeTarget === "b" ? "editing" : "locked",
              interactive: compare?.activeTarget === "b",
              overlayValues,
              focusedOverlayId,
              muted: previewedSetup === "a",
              onAdjustFrequency: (frequencyPHz) => setParam("frequencyPHz", frequencyPHz),
              onAdjustCollectorVoltage: (collectorVoltage) =>
                setParam("collectorVoltage", collectorVoltage),
            })}
          </>
        ) : (
          renderRow(activeFrame, SINGLE_ROW_CENTER, {
            label: "Live photoelectric bench",
            interactive: true,
            overlayValues,
            focusedOverlayId,
            onAdjustFrequency: (frequencyPHz) => setParam("frequencyPHz", frequencyPHz),
            onAdjustCollectorVoltage: (collectorVoltage) =>
              setParam("collectorVoltage", collectorVoltage),
          })
        )}
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Emission state"
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={noteLines}
        />
      </svg>
    </SimulationSceneCard>
  );
}
