"use client";

import { useLocale } from "next-intl";
import {
  clamp,
  formatMeasurement,
  formatNumber,
  formatStandingWavesHarmonicLabel,
  getStandingWaveAntinodePositions,
  getStandingWaveNodePositions,
  sampleRange,
  sampleStandingWaveDisplacement,
  sampleStandingWaveModeShape,
  sampleStandingWavesState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
  resolveStandingWavesParams,
  STANDING_WAVES_MAX_LENGTH,
} from "@/lib/physics";
import type { AppLocale } from "@/i18n/routing";
import { copyText, getCompareBadgeLabel, getCompareSetupLabel } from "@/lib/i18n/copy-text";
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

type StandingWavesSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type StandingWaveFrame = {
  params: ReturnType<typeof resolveStandingWavesParams>;
  snapshot: ReturnType<typeof sampleStandingWavesState>;
};

const WIDTH = 820;
const HEIGHT = 336;
const LEFT_X = 84;
const STRING_WIDTH = 500;
const RIGHT_X = LEFT_X + STRING_WIDTH;
const STRING_PIXELS_PER_METER = STRING_WIDTH / STANDING_WAVES_MAX_LENGTH;
const CARD_WIDTH = 206;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const AMPLITUDE_SCALE = 56;
const ROW_HALF_HEIGHT = 74;
const SINGLE_ROW_CENTER = 168;
const COMPARE_ROW_CENTERS: Record<GraphSeriesSetupId, number> = {
  a: 98,
  b: 214,
};
const STRING_SAMPLE_COUNT = 181;
const AXIS_TICKS = sampleRange(0, STANDING_WAVES_MAX_LENGTH, 7);

function xFromPhysical(position: number) {
  return LEFT_X + position * STRING_PIXELS_PER_METER;
}

function physicalXFromStage(stageX: number) {
  return clamp((stageX - LEFT_X) / STRING_PIXELS_PER_METER, 0, STANDING_WAVES_MAX_LENGTH);
}

function yFromDisplacement(displacement: number, rowCenter: number) {
  return rowCenter - displacement * AMPLITUDE_SCALE;
}

function yFromScaledDisplacement(displacement: number, baselineY: number, scale: number) {
  return baselineY - displacement * scale;
}

function buildFrame(
  source: SimulationParams,
  time: number,
  previewProbeX?: number,
): StandingWaveFrame {
  const params = resolveStandingWavesParams(source);

  return {
    params,
    snapshot: sampleStandingWavesState(params, time, previewProbeX),
  };
}

function buildWavePath(
  frame: StandingWaveFrame,
  baselineY: number,
  kind: "standing" | "left" | "right" = "standing",
  scale = AMPLITUDE_SCALE,
) {
  return sampleRange(0, frame.params.length, STRING_SAMPLE_COUNT)
    .map((position, index) => {
      const displacement =
        kind === "standing"
          ? sampleStandingWaveDisplacement(frame.params, position, frame.snapshot.time)
          : 0.5 *
            frame.params.amplitude *
            Math.sin(
              frame.snapshot.waveNumber * position +
                (kind === "left" ? -1 : 1) *
                  frame.snapshot.angularFrequency *
                  frame.snapshot.time,
            );
      const x = xFromPhysical(position);
      const y = yFromScaledDisplacement(displacement, baselineY, scale);

      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function renderRuler(rowCenter: number, actualLength: number, locale: AppLocale) {
  const rulerY = rowCenter + ROW_HALF_HEIGHT + 14;
  const actualRightX = xFromPhysical(actualLength);

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
      <line
        x1={LEFT_X}
        x2={actualRightX}
        y1={rulerY}
        y2={rulerY}
        stroke="rgba(30,166,162,0.45)"
        strokeWidth="3"
      />
      {AXIS_TICKS.map((tick) => {
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
        {copyText(locale, "string length", "弦長")}
      </text>
    </g>
  );
}

function renderNodes(
  frame: StandingWaveFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
  locale: AppLocale = "en",
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "nodes", 0.38);
  const radius = focusedOverlayId === "nodes" ? 5.5 : 4.25;

  return (
    <g pointerEvents="none" opacity={opacity}>
      {getStandingWaveNodePositions(frame.params).map((position, index) => (
        <g key={`node-${index}-${position}`}>
          <circle
            cx={xFromPhysical(position)}
            cy={rowCenter}
            r={radius}
            fill="#0f1c24"
            stroke="rgba(255,253,247,0.96)"
            strokeWidth="2"
          />
        </g>
      ))}
      <text
        x={LEFT_X}
        y={rowCenter - ROW_HALF_HEIGHT + 8}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        {copyText(locale, "nodes stay fixed", "節點保持固定")}
      </text>
    </g>
  );
}

function renderAntinodes(
  frame: StandingWaveFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
  locale: AppLocale = "en",
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "antinodes", 0.38);
  const strokeWidth = focusedOverlayId === "antinodes" ? 2.5 : 1.8;

  return (
    <g pointerEvents="none" opacity={opacity}>
      <path
        d={sampleRange(0, frame.params.length, STRING_SAMPLE_COUNT)
          .map((position, index) => {
            const x = xFromPhysical(position);
            const y = yFromDisplacement(sampleStandingWaveModeShape(frame.params, position), rowCenter);

            return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
          })
          .join(" ")}
        fill="none"
        stroke="rgba(240,171,60,0.55)"
        strokeDasharray="7 7"
        strokeWidth={strokeWidth}
      />
      {getStandingWaveAntinodePositions(frame.params).map((position, index) => {
        const y = yFromDisplacement(sampleStandingWaveModeShape(frame.params, position), rowCenter);
        return (
          <g key={`antinode-${index}-${position}`}>
            <line
              x1={xFromPhysical(position)}
              x2={xFromPhysical(position)}
              y1={rowCenter}
              y2={y}
              stroke="rgba(240,171,60,0.42)"
              strokeDasharray="5 5"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={xFromPhysical(position)}
              cy={y}
              r={focusedOverlayId === "antinodes" ? 5 : 4}
              fill="#f0ab3c"
              stroke="rgba(255,253,247,0.96)"
              strokeWidth="2"
            />
          </g>
        );
      })}
      <text
        x={LEFT_X + 168}
        y={rowCenter - ROW_HALF_HEIGHT + 8}
        className="fill-amber-700 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        {copyText(locale, "antinodes set the largest swing", "腹點決定最大振幅")}
      </text>
    </g>
  );
}

function renderComponentWaves(
  frame: StandingWaveFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
  locale: AppLocale = "en",
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "componentWaves", 0.38);
  const upperBaseline = rowCenter - ROW_HALF_HEIGHT + 22;
  const lowerBaseline = upperBaseline + 18;
  const miniScale = 12;
  const stringRightX = xFromPhysical(frame.params.length);

  return (
    <g pointerEvents="none" opacity={opacity}>
      <line
        x1={LEFT_X}
        x2={stringRightX}
        y1={upperBaseline}
        y2={upperBaseline}
        stroke="rgba(15,28,36,0.12)"
        strokeDasharray="4 6"
      />
      <path
        d={buildWavePath(frame, upperBaseline, "left", miniScale)}
        fill="none"
        stroke="rgba(30,166,162,0.48)"
        strokeDasharray="6 6"
        strokeWidth={focusedOverlayId === "componentWaves" ? "2.4" : "1.8"}
      />
      <line
        x1={LEFT_X}
        x2={stringRightX}
        y1={lowerBaseline}
        y2={lowerBaseline}
        stroke="rgba(15,28,36,0.12)"
        strokeDasharray="4 6"
      />
      <path
        d={buildWavePath(frame, lowerBaseline, "right", miniScale)}
        fill="none"
        stroke="rgba(78,166,223,0.48)"
        strokeDasharray="6 6"
        strokeWidth={focusedOverlayId === "componentWaves" ? "2.4" : "1.8"}
      />
      <text
        x={LEFT_X}
        y={upperBaseline - 10}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        {copyText(locale, "equal waves moving both ways interfere into the standing pattern", "兩列等幅反向行波互相干涉，形成駐波")}
      </text>
      <text
        x={LEFT_X}
        y={upperBaseline + 4}
        className="fill-teal-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        {copyText(locale, "right-moving component", "向右行進分量")}
      </text>
      <text
        x={LEFT_X}
        y={lowerBaseline + 4}
        className="fill-sky-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        {copyText(locale, "left-moving component", "向左行進分量")}
      </text>
    </g>
  );
}

function renderProbe(
  frame: StandingWaveFrame,
  rowCenter: number,
  interactive: boolean,
  locale: AppLocale,
  onAdjustProbe?: (probeX: number) => void,
) {
  const probeX = xFromPhysical(frame.snapshot.probeX);
  const probeY = yFromDisplacement(frame.snapshot.probeDisplacement, rowCenter);
  const stringRightX = xFromPhysical(frame.params.length);
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
            width: Math.max(0, stringRightX - LEFT_X),
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
          endValue={frame.params.length}
        />
      ) : null}
      <line
        x1={probeX}
        x2={probeX}
        y1={rowCenter}
        y2={probeY}
        stroke="rgba(15,28,36,0.18)"
        strokeDasharray="5 5"
      />
      <circle
        cx={probeX}
        cy={probeY}
        r="8.5"
        fill="#f16659"
        stroke="rgba(255,253,247,0.96)"
        strokeWidth="2.5"
      />
      <text
        x={probeX}
        y={rowCenter + 24}
        textAnchor="middle"
        className="fill-coral-700 text-[11px] font-semibold"
      >
        {copyText(locale, "probe", "探針")}
      </text>
    </>
  );
}

function renderWaveRow(
  frame: StandingWaveFrame,
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
  const stringRightX = xFromPhysical(frame.params.length);
  const top = rowCenter - ROW_HALF_HEIGHT;
  const bottom = rowCenter + ROW_HALF_HEIGHT;
  const rowOpacity = options.muted ? 0.76 : 1;
  const showNodes = options.overlayValues?.nodes ?? true;
  const showAntinodes = options.overlayValues?.antinodes ?? true;
  const showComponentWaves = options.overlayValues?.componentWaves ?? false;

  return (
    <g opacity={rowOpacity}>
      <rect
        x={52}
        y={top - 16}
        width={536}
        height={bottom - top + 38}
        rx="24"
        fill="rgba(255,255,255,0.28)"
        stroke={options.interactive ? "rgba(30,166,162,0.24)" : "rgba(15,28,36,0.08)"}
        strokeWidth={options.interactive ? "2" : "1.5"}
      />
      <text
        x={68}
        y={top - 2}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
      >
        {options.label}
        {options.compareBadge ? ` - ${options.compareBadge}` : ""}
      </text>
      <line
        x1={LEFT_X}
        x2={RIGHT_X}
        y1={rowCenter}
        y2={rowCenter}
        stroke="rgba(15,28,36,0.14)"
        strokeDasharray="4 7"
      />
      {showComponentWaves
        ? renderComponentWaves(frame, rowCenter, options.focusedOverlayId, options.locale)
        : null}
      {showAntinodes ? renderAntinodes(frame, rowCenter, options.focusedOverlayId, options.locale) : null}
      <path
        d={buildWavePath(frame, rowCenter)}
        fill="none"
        stroke="#f16659"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showNodes ? renderNodes(frame, rowCenter, options.focusedOverlayId, options.locale) : null}
      <line
        x1={LEFT_X}
        x2={LEFT_X}
        y1={rowCenter - 12}
        y2={rowCenter + 12}
        stroke="#0f1c24"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line
        x1={stringRightX}
        x2={stringRightX}
        y1={rowCenter - 12}
        y2={rowCenter + 12}
        stroke="#0f1c24"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {renderProbe(frame, rowCenter, Boolean(options.interactive), options.locale, options.onAdjustProbe)}
      {renderRuler(rowCenter, frame.params.length, options.locale)}
    </g>
  );
}

export function StandingWavesSimulation({
  concept,
  params,
  time,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: StandingWavesSimulationProps) {
  const locale = useLocale() as AppLocale;
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  const previewProbeX =
    graphPreview?.kind === "response" && graphPreview.graphId === "shape"
      ? clamp(graphPreview.point.x, 0, STANDING_WAVES_MAX_LENGTH)
      : undefined;
  const activeFrame = buildFrame(params, displayTime, previewProbeX);
  const compareAFrame = compare ? buildFrame(compare.setupA, displayTime, previewProbeX) : null;
  const compareBFrame = compare ? buildFrame(compare.setupB, displayTime, previewProbeX) : null;
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
  const previewBadge = graphPreview?.kind === "time"
    ? (
      <SimulationPreviewBadge tone="teal">
        {copyText(locale, "preview t =", "預覽 t =")} {formatNumber(displayTime)} s
      </SimulationPreviewBadge>
    )
    : graphPreview?.kind === "response"
      ? (
        <SimulationPreviewBadge>
          {copyText(locale, "preview x =", "預覽 x =")} {formatMeasurement(previewProbeX ?? 0, "m")}
        </SimulationPreviewBadge>
      )
      : null;
  const metricRows = [
    {
      label: copyText(locale, "harmonic", "諧波"),
      value: formatStandingWavesHarmonicLabel(primaryFrame.snapshot.modeNumber, locale),
      valueClassName: "fill-ink-950 text-[11px] font-semibold",
    },
    {
      label: copyText(locale, "lambda", "λ"),
      value: formatMeasurement(primaryFrame.snapshot.wavelength, "m"),
    },
    {
      label: copyText(locale, "frequency", "頻率"),
      value: formatMeasurement(primaryFrame.snapshot.frequency, "Hz"),
    },
    {
      label: copyText(locale, "probe x", "探針 x"),
      value: formatMeasurement(primaryFrame.snapshot.probeX, "m"),
    },
    {
      label: copyText(locale, "probe y", "探針 y"),
      value: formatMeasurement(primaryFrame.snapshot.probeDisplacement, "m"),
    },
  ];
  const probeRegionLabel =
    primaryFrame.snapshot.probeRegionLabel === "node"
      ? copyText(locale, "a node", "一個節點")
      : primaryFrame.snapshot.probeRegionLabel === "antinode"
        ? copyText(locale, "an antinode", "一個腹點")
        : copyText(locale, "an in-between point", "節點與腹點之間");
  const noteLines = [
    locale === "zh-HK"
      ? `目前弦上有 ${primaryFrame.snapshot.nodePositions.length} 個節點和 ${primaryFrame.snapshot.antinodePositions.length} 個腹點。`
      : `${primaryFrame.snapshot.nodePositions.length} nodes and ${primaryFrame.snapshot.antinodePositions.length} antinodes on the current string.`,
    locale === "zh-HK"
      ? `探針包絡線 = ${formatMeasurement(primaryFrame.snapshot.probeEnvelope, "m")}；位置在${probeRegionLabel}。`
      : `Probe envelope = ${formatMeasurement(primaryFrame.snapshot.probeEnvelope, "m")} at ${probeRegionLabel}.`,
  ];

  function handleAdjustProbe(nextProbeX: number) {
    setParam("probeX", Number(clamp(nextProbeX, 0, STANDING_WAVES_MAX_LENGTH).toFixed(2)));
  }

  return (
    <SimulationSceneCard
      title={concept.title}
      description={copyText(
        locale,
        "Fixed ends, one live probe, and optional traveling-wave overlays keep nodes, antinodes, and interference on the same compact stage.",
        "固定兩端、一個即時探針和可選的行波疊加，讓節點、腹點與干涉保持在同一個緊湊舞台上。",
      )}
      headerClassName="bg-[linear-gradient(135deg,rgba(30,166,162,0.08),rgba(240,171,60,0.08))]"
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
            label: copyText(locale, "Live standing wave", "即時駐波"),
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
          title={copyText(locale, "Probe state", "探針狀態")}
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={noteLines}
        />
      </svg>
    </SimulationSceneCard>
  );
}
