"use client";

import { useLocale } from "next-intl";
import {
  SOUND_WAVES_LONGITUDINAL_STAGE_LENGTH,
  clamp,
  formatMeasurement,
  formatNumber,
  getSoundWaveCompressionCenters,
  getSoundWaveRarefactionCenters,
  resolveSoundWavesLongitudinalParams,
  sampleRange,
  sampleSoundWavesCompressionCue,
  sampleSoundWavesLongitudinalState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import type { AppLocale } from "@/i18n/routing";
import { copyText, getCompareBadgeLabel, getCompareSetupLabel } from "@/lib/i18n/copy-text";
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

type SoundWavesLongitudinalSimulationProps = {
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
  params: ReturnType<typeof resolveSoundWavesLongitudinalParams>;
  snapshot: ReturnType<typeof sampleSoundWavesLongitudinalState>;
};

const WIDTH = 820;
const HEIGHT = 344;
const LEFT_X = 116;
const TUBE_WIDTH = 470;
const RIGHT_X = LEFT_X + TUBE_WIDTH;
const PIXELS_PER_METER = TUBE_WIDTH / SOUND_WAVES_LONGITUDINAL_STAGE_LENGTH;
const TUBE_HEIGHT = 58;
const CARD_WIDTH = 228;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const DISPLACEMENT_SCALE = 108;
const ROW_HALF_HEIGHT = 82;
const SINGLE_ROW_CENTER = 174;
const COMPARE_ROW_CENTERS: Record<GraphSeriesSetupId, number> = {
  a: 106,
  b: 238,
};
const PARTICLE_POSITIONS = sampleRange(0, SOUND_WAVES_LONGITUDINAL_STAGE_LENGTH, 25);
const PRESSURE_POSITIONS = sampleRange(0, SOUND_WAVES_LONGITUDINAL_STAGE_LENGTH, 33);
const RULER_TICKS = sampleRange(0, SOUND_WAVES_LONGITUDINAL_STAGE_LENGTH, 9);

function xFromPhysical(position: number) {
  return LEFT_X + position * PIXELS_PER_METER;
}

function physicalXFromStage(stageX: number) {
  return clamp(
    (stageX - LEFT_X) / PIXELS_PER_METER,
    0,
    SOUND_WAVES_LONGITUDINAL_STAGE_LENGTH,
  );
}

function buildFrame(
  source: SimulationParams,
  time: number,
): WaveFrame {
  const params = resolveSoundWavesLongitudinalParams(source);

  return {
    params,
    snapshot: sampleSoundWavesLongitudinalState(params, time),
  };
}

function compressionFill(normalizedCompression: number) {
  const strength = Math.abs(normalizedCompression);
  const alpha = 0.1 + strength * 0.26;

  if (normalizedCompression >= 0) {
    return `rgba(241, 102, 89, ${alpha.toFixed(3)})`;
  }

  return `rgba(78, 166, 223, ${alpha.toFixed(3)})`;
}

function pickFeatureCenter(centers: number[], target: number) {
  if (!centers.length) {
    return null;
  }

  return centers.reduce((best, current) =>
    Math.abs(current - target) < Math.abs(best - target) ? current : best,
  );
}

function renderPressureRibbon(frame: WaveFrame, rowCenter: number) {
  const top = rowCenter - TUBE_HEIGHT / 2;
  const cellWidth = TUBE_WIDTH / PRESSURE_POSITIONS.length;

  return (
    <g pointerEvents="none">
      {PRESSURE_POSITIONS.map((position, index) => {
        const compression = sampleSoundWavesCompressionCue(
          frame.params,
          position,
          frame.snapshot.time,
        );
        const normalizedCompression = compression / Math.max(frame.snapshot.compressionStrength, 1e-6);
        const x = xFromPhysical(position) - cellWidth / 2;

        return (
          <rect
            key={`pressure-${index}`}
            x={x}
            y={top}
            width={cellWidth + 1}
            height={TUBE_HEIGHT}
            fill={compressionFill(normalizedCompression)}
          />
        );
      })}
    </g>
  );
}

function renderSourcePiston(frame: WaveFrame, rowCenter: number, locale: AppLocale) {
  const pistonCenterX = LEFT_X + frame.snapshot.sourceDisplacement * DISPLACEMENT_SCALE;
  const pistonWidth = 14;
  const pistonHeight = TUBE_HEIGHT + 12;

  return (
    <g pointerEvents="none">
      <rect
        x={pistonCenterX - pistonWidth / 2}
        y={rowCenter - pistonHeight / 2}
        width={pistonWidth}
        height={pistonHeight}
        rx="7"
        fill="#1ea6a2"
        stroke="rgba(255,253,247,0.96)"
        strokeWidth="2"
      />
      <text
        x={LEFT_X}
        y={rowCenter + TUBE_HEIGHT / 2 + 30}
        textAnchor="middle"
        className="fill-teal-700 text-[11px] font-semibold"
      >
        {copyText(locale, "source piston", "聲源活塞")}
      </text>
    </g>
  );
}

function renderParticles(frame: WaveFrame, rowCenter: number) {
  return (
    <g pointerEvents="none">
      {PARTICLE_POSITIONS.map((position, index) => {
        const displacement = sampleSoundWavesLongitudinalState(
          frame.params,
          frame.snapshot.time,
          position,
        ).probeDisplacement;
        const cx = xFromPhysical(position) + displacement * DISPLACEMENT_SCALE;
        const radius = index % 3 === 0 ? 6.4 : 5.7;

        return (
          <circle
            key={`particle-${index}`}
            cx={cx}
            cy={rowCenter}
            r={radius}
            fill="rgba(15,28,36,0.82)"
            stroke="rgba(255,253,247,0.92)"
            strokeWidth="1.6"
          />
        );
      })}
    </g>
  );
}

function renderProbe(
  frame: WaveFrame,
  rowCenter: number,
  interactive: boolean,
  locale: AppLocale,
  onAdjustProbe?: (probeX: number) => void,
) {
  const probeEquilibriumX = xFromPhysical(frame.snapshot.probeX);
  const probeActualX = probeEquilibriumX + frame.snapshot.probeDisplacement * DISPLACEMENT_SCALE;
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
          ariaLabel={copyText(
            locale,
            `Move probe position, current x ${formatNumber(frame.snapshot.probeX)} meters`,
            `移動探針位置，目前 x = ${formatNumber(frame.snapshot.probeX)} 米`,
          )}
          cursor="ew-resize"
          step={0.05}
          resolveValue={physicalXFromStage}
          onChange={(nextValue) => onAdjustProbe?.(nextValue)}
          homeValue={0}
          endValue={SOUND_WAVES_LONGITUDINAL_STAGE_LENGTH}
        />
      ) : null}
      <line
        x1={probeEquilibriumX}
        x2={probeEquilibriumX}
        y1={rowCenter - TUBE_HEIGHT / 2 - 18}
        y2={rowCenter + TUBE_HEIGHT / 2 + 20}
        stroke="rgba(15,28,36,0.18)"
        strokeDasharray="5 5"
      />
      <line
        x1={probeEquilibriumX}
        x2={probeActualX}
        y1={rowCenter - 18}
        y2={rowCenter - 18}
        stroke="#4ea6df"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle
        cx={probeActualX}
        cy={rowCenter}
        r="8.5"
        fill="#f16659"
        stroke="rgba(255,253,247,0.96)"
        strokeWidth="2.4"
      />
      <text
        x={probeEquilibriumX}
        y={rowCenter + TUBE_HEIGHT / 2 + 34}
        textAnchor="middle"
        className="fill-coral-700 text-[11px] font-semibold"
      >
        {copyText(locale, "probe parcel", "探針粒子")}
      </text>
    </>
  );
}

function renderMotionOverlay(
  frame: WaveFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
  locale: AppLocale = "en",
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "motionDirections", 0.4);
  const probeX = xFromPhysical(frame.snapshot.probeX);
  const arrowY = rowCenter - TUBE_HEIGHT / 2 - 26;

  return (
    <g pointerEvents="none" opacity={opacity}>
      <line
        x1={probeX - 24}
        x2={probeX + 24}
        y1={rowCenter + 22}
        y2={rowCenter + 22}
        stroke="#4ea6df"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1={probeX - 24}
        x2={probeX - 16}
        y1={rowCenter + 22}
        y2={rowCenter + 16}
        stroke="#4ea6df"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1={probeX - 24}
        x2={probeX - 16}
        y1={rowCenter + 22}
        y2={rowCenter + 28}
        stroke="#4ea6df"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1={probeX + 24}
        x2={probeX + 16}
        y1={rowCenter + 22}
        y2={rowCenter + 16}
        stroke="#4ea6df"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1={probeX + 24}
        x2={probeX + 16}
        y1={rowCenter + 22}
        y2={rowCenter + 28}
        stroke="#4ea6df"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <text
        x={probeX}
        y={rowCenter + 40}
        textAnchor="middle"
        className="fill-sky-700 text-[10px] font-semibold uppercase tracking-[0.12em]"
      >
        {copyText(locale, "particles sway left-right", "粒子左右來回擺動")}
      </text>
      <line
        x1={LEFT_X + 36}
        x2={RIGHT_X - 34}
        y1={arrowY}
        y2={arrowY}
        stroke="#f0ab3c"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <line
        x1={RIGHT_X - 34}
        x2={RIGHT_X - 44}
        y1={arrowY}
        y2={arrowY - 6}
        stroke="#f0ab3c"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <line
        x1={RIGHT_X - 34}
        x2={RIGHT_X - 44}
        y1={arrowY}
        y2={arrowY + 6}
        stroke="#f0ab3c"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <text
        x={RIGHT_X - 34}
        y={arrowY - 8}
        textAnchor="end"
        className="fill-amber-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        {copyText(locale, "disturbance moves right", "擾動向右傳播")}
      </text>
    </g>
  );
}

function renderCompressionOverlay(
  frame: WaveFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
  locale: AppLocale = "en",
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "compressionBands", 0.4);
  const compressionCenter = pickFeatureCenter(
    getSoundWaveCompressionCenters(frame.params, frame.snapshot.time),
    frame.snapshot.probeX,
  );
  const rarefactionCenter = pickFeatureCenter(
    getSoundWaveRarefactionCenters(frame.params, frame.snapshot.time),
    Math.min(frame.snapshot.probeX + frame.snapshot.wavelength / 2, SOUND_WAVES_LONGITUDINAL_STAGE_LENGTH),
  );

  return (
    <g pointerEvents="none" opacity={opacity}>
      {compressionCenter !== null ? (
        <>
          <line
            x1={xFromPhysical(compressionCenter)}
            x2={xFromPhysical(compressionCenter)}
            y1={rowCenter - TUBE_HEIGHT / 2 - 2}
            y2={rowCenter - TUBE_HEIGHT / 2 - 20}
            stroke="rgba(241,102,89,0.72)"
            strokeDasharray="4 4"
            strokeWidth="1.8"
          />
          <text
            x={xFromPhysical(compressionCenter)}
            y={rowCenter - TUBE_HEIGHT / 2 - 26}
            textAnchor="middle"
            className="fill-coral-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
          >
            {copyText(locale, "compression", "壓縮")}
          </text>
        </>
      ) : null}
      {rarefactionCenter !== null ? (
        <>
          <line
            x1={xFromPhysical(rarefactionCenter)}
            x2={xFromPhysical(rarefactionCenter)}
            y1={rowCenter + TUBE_HEIGHT / 2 + 2}
            y2={rowCenter + TUBE_HEIGHT / 2 + 20}
            stroke="rgba(78,166,223,0.72)"
            strokeDasharray="4 4"
            strokeWidth="1.8"
          />
          <text
            x={xFromPhysical(rarefactionCenter)}
            y={rowCenter + TUBE_HEIGHT / 2 + 34}
            textAnchor="middle"
            className="fill-sky-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
          >
            {copyText(locale, "rarefaction", "疏鬆")}
          </text>
        </>
      ) : null}
    </g>
  );
}

function renderEnergyOverlay(
  rowCenter: number,
  focusedOverlayId?: string | null,
  locale: AppLocale = "en",
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "energyTransfer", 0.4);
  const baseY = rowCenter - TUBE_HEIGHT / 2 - 44;

  return (
    <g pointerEvents="none" opacity={opacity}>
      {sampleRange(LEFT_X + 24, RIGHT_X - 24, 8).map((x, index) => (
        <g key={`energy-arrow-${index}`}>
          <line
            x1={x}
            x2={x + 26}
            y1={baseY}
            y2={baseY}
            stroke="rgba(30,166,162,0.76)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1={x + 26}
            x2={x + 18}
            y1={baseY}
            y2={baseY - 5}
            stroke="rgba(30,166,162,0.76)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1={x + 26}
            x2={x + 18}
            y1={baseY}
            y2={baseY + 5}
            stroke="rgba(30,166,162,0.76)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      ))}
      <text
        x={RIGHT_X}
        y={baseY - 10}
        textAnchor="end"
        className="fill-teal-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        {copyText(locale, "energy is carried through the medium", "能量沿介質向前傳遞")}
      </text>
    </g>
  );
}

function renderRuler(rowCenter: number, locale: AppLocale) {
  const rulerY = rowCenter + TUBE_HEIGHT / 2 + 16;

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
        {copyText(locale, "medium position", "介質位置")}
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
    locale: AppLocale;
  },
) {
  const opacity = options.muted ? 0.32 : 1;
  const top = rowCenter - ROW_HALF_HEIGHT;
  const bottom = rowCenter + ROW_HALF_HEIGHT;
  const showMotionDirections = options.overlayValues?.motionDirections ?? true;
  const showCompressionBands = options.overlayValues?.compressionBands ?? true;
  const showEnergyTransfer = options.overlayValues?.energyTransfer ?? false;

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
      <rect
        x={LEFT_X}
        y={rowCenter - TUBE_HEIGHT / 2}
        width={TUBE_WIDTH}
        height={TUBE_HEIGHT}
        rx="22"
        fill="rgba(255,255,255,0.88)"
        stroke="rgba(15,28,36,0.12)"
        strokeWidth="2"
      />
      {renderPressureRibbon(frame, rowCenter)}
      {renderParticles(frame, rowCenter)}
      {renderSourcePiston(frame, rowCenter, options.locale)}
      {renderProbe(frame, rowCenter, Boolean(options.interactive), options.locale, options.onAdjustProbe)}
      {showMotionDirections
        ? renderMotionOverlay(frame, rowCenter, options.focusedOverlayId, options.locale)
        : null}
      {showCompressionBands
        ? renderCompressionOverlay(frame, rowCenter, options.focusedOverlayId, options.locale)
        : null}
      {showEnergyTransfer ? renderEnergyOverlay(rowCenter, options.focusedOverlayId, options.locale) : null}
      {renderRuler(rowCenter, options.locale)}
    </g>
  );
}

export function SoundWavesLongitudinalSimulation({
  concept,
  params,
  time,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: SoundWavesLongitudinalSimulationProps) {
  const locale = useLocale() as AppLocale;
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  const activeFrame = buildFrame(params, displayTime);
  const compareAFrame = compare ? buildFrame(compare.setupA, displayTime) : null;
  const compareBFrame = compare ? buildFrame(compare.setupB, displayTime) : null;
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
    liveLabel: copyText(locale, "Live setup", "即時設定"),
    defaultLabelA: getCompareSetupLabel(locale, "a"),
    defaultLabelB: getCompareSetupLabel(locale, "b"),
  });
  const previewBadge = graphPreview?.kind === "time" ? (
    <SimulationPreviewBadge tone="teal">
      {copyText(locale, "preview t =", "預覽 t =")} {formatNumber(displayTime)} s
    </SimulationPreviewBadge>
  ) : null;
  const metricRows = [
    {
      label: "A",
      value: formatMeasurement(primaryFrame.snapshot.amplitude, "m"),
    },
    {
      label: "v_wave",
      value: formatMeasurement(primaryFrame.snapshot.waveSpeed, "m/s"),
    },
    {
      label: copyText(locale, "lambda", "λ"),
      value: formatMeasurement(primaryFrame.snapshot.wavelength, "m"),
    },
    {
      label: copyText(locale, "f", "f"),
      value: formatMeasurement(primaryFrame.snapshot.frequency, "Hz"),
    },
    {
      label: copyText(locale, "T", "T"),
      value: formatMeasurement(primaryFrame.snapshot.period, "s"),
    },
    {
      label: copyText(locale, "I cue", "強度提示"),
      value: formatNumber(primaryFrame.snapshot.intensityCue),
    },
    {
      label: copyText(locale, "probe x", "探針 x"),
      value: formatMeasurement(primaryFrame.snapshot.probeX, "m"),
    },
    {
      label: copyText(locale, "probe shift", "探針位移"),
      value: formatMeasurement(primaryFrame.snapshot.probeDisplacement, "m"),
    },
  ];
  const noteLines = [
    locale === "zh-HK"
      ? `傳到探針的延遲 = ${formatMeasurement(primaryFrame.snapshot.travelDelay, "s")}。`
      : `Delay to the probe = ${formatMeasurement(primaryFrame.snapshot.travelDelay, "s")}.`,
    copyText(
      locale,
      "Pitch follows frequency, while the bounded loudness/intensity cue follows amplitude and the A^2 response graph.",
      "音高跟隨頻率，而受限制的音量／強度提示則跟隨振幅與 A^2 響應圖。",
    ),
    locale === "zh-HK"
      ? `局部狀態 = ${primaryFrame.snapshot.compressionLabel === "compression" ? "壓縮" : primaryFrame.snapshot.compressionLabel === "rarefaction" ? "疏鬆" : "過渡"}；壓力提示 = ${formatNumber(primaryFrame.snapshot.normalizedProbeCompression)}。`
      : `Local state = ${primaryFrame.snapshot.compressionLabel}; pressure cue = ${formatNumber(primaryFrame.snapshot.normalizedProbeCompression)}.`,
    copyText(
      locale,
      "Particles oscillate along the tube while the disturbance and energy travel to the right.",
      "粒子沿聲管左右振動，而擾動與能量則向右傳播。",
    ),
  ];

  function handleAdjustProbe(nextProbeX: number) {
    setParam(
      "probeX",
      Number(
        clamp(nextProbeX, 0, SOUND_WAVES_LONGITUDINAL_STAGE_LENGTH).toFixed(2),
      ),
    );
  }

  return (
    <SimulationSceneCard
      title={concept.title}
      description={copyText(
        locale,
        "A compact sound-wave bench keeps particle motion, compression and rarefaction, probe timing, and energy-transfer direction on one honest longitudinal-wave stage.",
        "緊湊的聲波工作台把粒子運動、壓縮與疏鬆、探針時間差，以及能量傳遞方向都放在同一個縱波舞台上。",
      )}
      headerClassName="bg-[linear-gradient(135deg,rgba(240,171,60,0.12),rgba(78,166,223,0.08))]"
      headerAside={
        <>
          {previewBadge}
          {compareEnabled ? (
            <CompareLegend
              primaryLabel={primaryLabel}
              secondaryLabel={
                previewedSetup === "a"
                  ? compare?.labelB ?? getCompareSetupLabel(locale, "b")
                  : compare?.labelA ?? getCompareSetupLabel(locale, "a")
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
                label: compare?.labelA ?? getCompareSetupLabel(locale, "a"),
                compareBadge: getCompareBadgeLabel(locale, compare?.activeTarget === "a" ? "editing" : "locked"),
                interactive: compare?.activeTarget === "a",
                overlayValues,
                focusedOverlayId,
                muted: previewedSetup === "b",
                onAdjustProbe: handleAdjustProbe,
                locale,
              })}
              {renderWaveRow(compareBFrame!, COMPARE_ROW_CENTERS.b, {
                label: compare?.labelB ?? getCompareSetupLabel(locale, "b"),
                compareBadge: getCompareBadgeLabel(locale, compare?.activeTarget === "b" ? "editing" : "locked"),
                interactive: compare?.activeTarget === "b",
                overlayValues,
                focusedOverlayId,
                muted: previewedSetup === "a",
                onAdjustProbe: handleAdjustProbe,
                locale,
              })}
            </>
          ) : (
            renderWaveRow(activeFrame, SINGLE_ROW_CENTER, {
              label: copyText(locale, "Live sound wave", "即時聲波"),
              interactive: true,
              overlayValues,
              focusedOverlayId,
              onAdjustProbe: handleAdjustProbe,
              locale,
            })
          )}
          <SimulationReadoutCard
            x={CARD_X}
            y={CARD_Y}
            width={CARD_WIDTH}
            title={copyText(locale, "Sound state", "聲波狀態")}
            setupLabel={compareEnabled ? primaryLabel : undefined}
            rows={metricRows}
            noteLines={noteLines}
          />
        </svg>
        <SimulationReadoutSummary
          title={copyText(locale, "Sound state", "聲波狀態")}
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={noteLines}
          className="mx-3 mb-3 mt-0 md:hidden"
        />
      </div>
    </SimulationSceneCard>
  );
}
