"use client";

import { useLocale } from "next-intl";
import {
  POLARIZATION_MAX_ANGLE,
  POLARIZATION_MIN_ANGLE,
  clamp,
  formatMeasurement,
  formatNumber,
  resolvePolarizationParams,
  samplePolarizationState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import type { AppLocale } from "@/i18n/routing";
import {
  copyText,
  getCompareBadgeLabel,
  getCompareSetupLabel,
  localizeKnownCompareText,
} from "@/lib/i18n/copy-text";
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

type PolarizationSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type PolarizationFrame = {
  params: ReturnType<typeof resolvePolarizationParams>;
  snapshot: ReturnType<typeof samplePolarizationState>;
};

const WIDTH = 860;
const HEIGHT = 392;
const SOURCE_X = 146;
const POLARIZER_X = 374;
const DETECTOR_X = 602;
const ROW_RADIUS = 56;
const SINGLE_ROW_CENTER = 192;
const COMPARE_ROW_CENTERS: Record<GraphSeriesSetupId, number> = {
  a: 118,
  b: 276,
};
const CARD_WIDTH = 224;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;

function getPolarizationCopy(locale: AppLocale) {
  return {
    mixedInput: copyText(locale, "mixed input", "混合輸入"),
    linearInput: copyText(locale, "linear input", "線偏振輸入"),
    filteredOutput: copyText(locale, "filtered output", "濾後輸出"),
    beamDirection: copyText(locale, "beam direction", "光束方向"),
    transverseCrossSectionNote: copyText(
      locale,
      "oscillation orientation lives in the transverse cross-section",
      "振動方向位於橫向截面內",
    ),
    firstPolarizerHalfPower: copyText(
      locale,
      "first polarizer averages to half power",
      "第一片偏振片平均只讓一半強度通過",
    ),
    input: copyText(locale, "input", "輸入"),
    axis: copyText(locale, "axis", "偏振軸"),
    axisShort: copyText(locale, "axis", "軸"),
    blocked: copyText(locale, "blocked", "被阻擋"),
    detectorFraction: copyText(locale, "detector fraction", "探測器比例"),
    transmitted: copyText(locale, "transmitted", "通過"),
    detector: copyText(locale, "detector", "探測器"),
    polarizerAxis: copyText(locale, "polarizer axis", "偏振軸"),
    noFixedAxis: copyText(locale, "no fixed axis", "沒有固定軸向"),
    thetaIn: copyText(locale, "theta_in", "θ_in"),
    thetaP: copyText(locale, "theta_p", "θ_p"),
    previewAxis: copyText(locale, "preview axis =", "預覽軸角 ="),
    polarizerState: copyText(locale, "Polarizer state", "偏振片狀態"),
    liveBench: copyText(locale, "Live polarization bench", "即時偏振實驗台"),
    liveSetup: copyText(locale, "Live setup", "即時設定"),
    sceneDescription: copyText(
      locale,
      "A transverse cross-section view keeps the input orientation, polarizer axis, and detector brightness on the same compact bench.",
      "橫向截面視圖把輸入方向、偏振軸與探測器亮度放在同一個緊湊實驗台上。",
    ),
    unpolarized: copyText(locale, "unpolarized", "非偏振"),
    linear: copyText(locale, "linear", "線偏振"),
    mixed: copyText(locale, "mixed", "混合"),
    average: copyText(locale, "avg.", "平均"),
    angleDifference: copyText(locale, "delta theta", "Δθ"),
    idealHalfIntensityNote: copyText(
      locale,
      "An ideal first polarizer passes half the intensity on average.",
      "理想的第一片偏振片平均會讓一半強度通過。",
    ),
    outputAlongAxisNote: copyText(
      locale,
      "The output still leaves linearly polarized along the axis.",
      "輸出仍會沿偏振軸成為線偏振。",
    ),
    outputOrientationResetNote: copyText(
      locale,
      "The output orientation is reset to the polarizer axis.",
      "輸出方向會重設為偏振軸方向。",
    ),
    projectionPrefix: copyText(
      locale,
      "Current angle difference:",
      "目前角度差對應：",
    ),
  };
}

type PolarizationCopy = ReturnType<typeof getPolarizationCopy>;

function localizeProjectionLabel(locale: AppLocale, label: string) {
  switch (label) {
    case "angle-independent half-intensity baseline":
      return copyText(locale, label, "與角度無關的半強度基線");
    case "aligned transmission":
      return copyText(locale, label, "對齊傳輸");
    case "half-power projection":
      return copyText(locale, label, "半功率投影");
    case "crossed suppression":
      return copyText(locale, label, "交叉抑制");
    case "partial projection":
      return copyText(locale, label, "部分投影");
    default:
      return label;
  }
}

function localizeBrightnessLabel(locale: AppLocale, label: string) {
  switch (label) {
    case "bright":
      return copyText(locale, label, "明亮");
    case "nearly dark":
      return copyText(locale, label, "接近全暗");
    case "half-bright":
      return copyText(locale, label, "半亮");
    case "mostly bright":
      return copyText(locale, label, "偏亮");
    case "dim":
      return copyText(locale, label, "偏暗");
    default:
      return label;
  }
}

function normalizePolarizationAngle(angle: number) {
  const wrapped = angle % 180;
  return wrapped < 0 ? wrapped + 180 : wrapped;
}

function angleVector(angle: number, length: number) {
  const radians = (normalizePolarizationAngle(angle) * Math.PI) / 180;
  return {
    x: Math.sin(radians) * length,
    y: -Math.cos(radians) * length,
  };
}

function buildFrame(
  source: SimulationParams,
  previewPolarizerAngle?: number,
): PolarizationFrame {
  const params = resolvePolarizationParams({
    ...source,
    ...(previewPolarizerAngle !== undefined ? { polarizerAngle: previewPolarizerAngle } : {}),
  });

  return {
    params,
    snapshot: samplePolarizationState(params),
  };
}

function renderOrientationLine({
  cx,
  cy,
  angle,
  length,
  stroke,
  strokeWidth,
  opacity = 1,
  dashed = false,
}: {
  cx: number;
  cy: number;
  angle: number;
  length: number;
  stroke: string;
  strokeWidth: number;
  opacity?: number;
  dashed?: boolean;
}) {
  const vector = angleVector(angle, length);

  return (
    <line
      x1={cx - vector.x}
      y1={cy - vector.y}
      x2={cx + vector.x}
      y2={cy + vector.y}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray={dashed ? "5 5" : undefined}
      opacity={opacity}
    />
  );
}

function renderUnpolarizedBundle(cx: number, cy: number, length: number) {
  const sampleAngles = [0, 24, 48, 72, 96, 120, 144];

  return sampleAngles.map((angle, index) => (
    <g key={`${cx}-${cy}-${angle}`}>
      {renderOrientationLine({
        cx,
        cy,
        angle,
        length: length - (index % 3) * 3,
        stroke: "#6b7280",
        strokeWidth: 4.2 - (index % 2) * 0.8,
        opacity: 0.18 + (index % 3) * 0.08,
      })}
    </g>
  ));
}

function renderBeamTube({
  startX,
  endX,
  centerY,
  tone,
  opacity,
  label,
}: {
  startX: number;
  endX: number;
  centerY: number;
  tone: string;
  opacity: number;
  label: string;
}) {
  return (
    <g opacity={opacity}>
      <path
        d={`M ${startX} ${centerY - 18} L ${endX} ${centerY - 18} L ${endX + 12} ${centerY} L ${endX} ${centerY + 18} L ${startX} ${centerY + 18} Z`}
        fill={tone}
        stroke="rgba(15,28,36,0.08)"
      />
      <text
        x={(startX + endX) / 2}
        y={centerY + 4}
        textAnchor="middle"
        className="fill-white text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        {label}
      </text>
    </g>
  );
}

function renderTransverseGuide(
  rowCenter: number,
  copy: PolarizationCopy,
  focusedOverlayId?: string | null,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "transverseGuide", 0.42);

  return (
    <g pointerEvents="none" opacity={opacity}>
      <line
        x1={SOURCE_X - 54}
        x2={DETECTOR_X + 34}
        y1={rowCenter - 84}
        y2={rowCenter - 84}
        stroke="rgba(78,166,223,0.62)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <polygon
        points={`${DETECTOR_X + 34},${rowCenter - 84} ${DETECTOR_X + 24},${rowCenter - 89} ${DETECTOR_X + 24},${rowCenter - 79}`}
        fill="#4ea6df"
      />
      <text
        x={SOURCE_X - 54}
        y={rowCenter - 96}
        className="fill-sky-700 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        {copy.beamDirection}
      </text>
      <text
        x={SOURCE_X - 14}
        y={rowCenter + ROW_RADIUS + 24}
        textAnchor="middle"
        className="fill-ink-500 text-[10px]"
      >
        {copy.transverseCrossSectionNote}
      </text>
    </g>
  );
}

function renderProjectionGuide(
  frame: PolarizationFrame,
  rowCenter: number,
  copy: PolarizationCopy,
  focusedOverlayId?: string | null,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "projectionGuide", 0.42);
  const boxX = POLARIZER_X - 76;
  const boxY = rowCenter + 66;

  return (
    <g pointerEvents="none" opacity={opacity}>
      <rect
        x={boxX}
        y={boxY}
        width="152"
        height="68"
        rx="18"
        fill="rgba(255,253,247,0.94)"
        stroke="rgba(15,28,36,0.08)"
      />
      {frame.snapshot.unpolarized ? (
        <>
          {renderUnpolarizedBundle(POLARIZER_X - 30, boxY + 34, 14)}
          {renderOrientationLine({
            cx: POLARIZER_X + 32,
            cy: boxY + 34,
            angle: frame.snapshot.outputAngle,
            length: 18,
            stroke: "#1ea6a2",
            strokeWidth: 4.4,
          })}
          <text
            x={POLARIZER_X}
            y={boxY + 18}
            textAnchor="middle"
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
          >
            {copy.firstPolarizerHalfPower}
          </text>
        </>
      ) : (
        <>
          {renderOrientationLine({
            cx: POLARIZER_X - 34,
            cy: boxY + 34,
            angle: frame.snapshot.inputAngle,
            length: 18,
            stroke: "#4ea6df",
            strokeWidth: 4,
          })}
          {renderOrientationLine({
            cx: POLARIZER_X + 8,
            cy: boxY + 34,
            angle: frame.snapshot.outputAngle,
            length: 18,
            stroke: "#1ea6a2",
            strokeWidth: 4.4,
          })}
          {renderOrientationLine({
            cx: POLARIZER_X + 50,
            cy: boxY + 34,
            angle: frame.snapshot.blockedAngle,
            length: 18,
            stroke: "#f97316",
            strokeWidth: 3.6,
            dashed: true,
          })}
          <text
            x={POLARIZER_X}
            y={boxY + 18}
            textAnchor="middle"
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
          >
            {copy.angleDifference} = {formatMeasurement(frame.snapshot.angleDifference, "deg")}
          </text>
        </>
      )}
      <text x={POLARIZER_X - 34} y={boxY + 58} textAnchor="middle" className="fill-sky-700 text-[10px]">
        {copy.input}
      </text>
      <text x={POLARIZER_X + 8} y={boxY + 58} textAnchor="middle" className="fill-teal-700 text-[10px]">
        {copy.axis}
      </text>
      <text x={POLARIZER_X + 50} y={boxY + 58} textAnchor="middle" className="fill-coral-700 text-[10px]">
        {copy.blocked}
      </text>
    </g>
  );
}

function renderIntensityGuide(
  frame: PolarizationFrame,
  rowCenter: number,
  copy: PolarizationCopy,
  focusedOverlayId?: string | null,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "intensityGuide", 0.42);
  const meterX = DETECTOR_X - 62;
  const meterY = rowCenter + 72;
  const meterWidth = 124;
  const transmittedWidth = meterWidth * frame.snapshot.transmittedIntensityFraction;

  return (
    <g pointerEvents="none" opacity={opacity}>
      <rect
        x={meterX}
        y={meterY}
        width={meterWidth}
        height="16"
        rx="8"
        fill="rgba(15,28,36,0.08)"
      />
      <rect
        x={meterX}
        y={meterY}
        width={transmittedWidth}
        height="16"
        rx="8"
        fill="#1ea6a2"
      />
      <text
        x={DETECTOR_X}
        y={meterY - 10}
        textAnchor="middle"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        {copy.detectorFraction} {formatNumber(frame.snapshot.transmittedIntensityFraction)}
      </text>
      <text x={meterX} y={meterY + 30} className="fill-teal-700 text-[10px]">
        {copy.transmitted} {formatNumber(frame.snapshot.transmittedIntensityFraction * 100)}%
      </text>
      <text
        x={meterX + meterWidth}
        y={meterY + 30}
        textAnchor="end"
        className="fill-coral-700 text-[10px]"
      >
        {copy.blocked} {formatNumber(frame.snapshot.blockedIntensityFraction * 100)}%
      </text>
    </g>
  );
}

function renderRow(
  frame: PolarizationFrame,
  rowCenter: number,
  locale: AppLocale,
  copy: PolarizationCopy,
  options: {
    label: string;
    compareBadge?: string;
    overlayValues?: Record<string, boolean>;
    focusedOverlayId?: string | null;
    muted?: boolean;
  },
) {
  const opacity = options.muted ? 0.36 : 1;
  const showTransverseGuide = options.overlayValues?.transverseGuide ?? true;
  const showProjectionGuide = options.overlayValues?.projectionGuide ?? true;
  const showIntensityGuide = options.overlayValues?.intensityGuide ?? true;
  const outputOpacity = 0.2 + frame.snapshot.transmittedIntensityFraction * 0.8;

  return (
    <g opacity={opacity}>
      <rect
        x="24"
        y={rowCenter - 104}
        width={WIDTH - 48}
        height="208"
        rx="24"
        fill="rgba(255,253,247,0.84)"
        stroke="rgba(15,28,36,0.08)"
      />
      <text
        x="42"
        y={rowCenter - 82}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        {options.label}
      </text>
      {options.compareBadge ? (
        <text
          x={WIDTH - 42}
          y={rowCenter - 82}
          textAnchor="end"
          className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.18em]"
        >
          {options.compareBadge}
        </text>
      ) : null}
      {renderBeamTube({
        startX: SOURCE_X + ROW_RADIUS + 8,
        endX: POLARIZER_X - 48,
        centerY: rowCenter,
        tone: "rgba(78,166,223,0.84)",
        opacity: 0.54 + (frame.snapshot.inputAmplitude - 0.7) * 0.45,
        label: frame.snapshot.unpolarized ? copy.mixedInput : copy.linearInput,
      })}
      {renderBeamTube({
        startX: POLARIZER_X + 52,
        endX: DETECTOR_X - 48,
        centerY: rowCenter,
        tone: "rgba(30,166,162,0.92)",
        opacity: outputOpacity,
        label: copy.filteredOutput,
      })}

      <circle
        cx={SOURCE_X}
        cy={rowCenter}
        r={ROW_RADIUS}
        fill="rgba(255,255,255,0.9)"
        stroke="rgba(78,166,223,0.34)"
        strokeWidth="2"
      />
      <circle
        cx={POLARIZER_X}
        cy={rowCenter}
        r={ROW_RADIUS}
        fill="rgba(255,255,255,0.94)"
        stroke="rgba(15,28,36,0.12)"
        strokeWidth="1.6"
      />
      <circle
        cx={DETECTOR_X}
        cy={rowCenter}
        r={ROW_RADIUS}
        fill="rgba(255,255,255,0.9)"
        stroke="rgba(30,166,162,0.28)"
        strokeWidth="2"
      />

      {frame.snapshot.unpolarized
        ? renderUnpolarizedBundle(SOURCE_X, rowCenter, 26)
        : renderOrientationLine({
            cx: SOURCE_X,
            cy: rowCenter,
            angle: frame.snapshot.inputAngle,
            length: 26,
            stroke: "#4ea6df",
            strokeWidth: 5,
          })}
      {renderOrientationLine({
        cx: POLARIZER_X,
        cy: rowCenter,
        angle: frame.snapshot.outputAngle,
        length: 28,
        stroke: "#1f2937",
        strokeWidth: 5,
      })}
      {renderOrientationLine({
        cx: DETECTOR_X,
        cy: rowCenter,
        angle: frame.snapshot.outputAngle,
        length: 10 + frame.snapshot.transmittedFieldAmplitude * 18,
        stroke: "#1ea6a2",
        strokeWidth: 5,
        opacity: outputOpacity,
      })}

      <rect
        x={POLARIZER_X - 14}
        y={rowCenter - 74}
        width="28"
        height="148"
        rx="14"
        fill="rgba(15,28,36,0.06)"
        stroke="rgba(15,28,36,0.12)"
      />

      <text x={SOURCE_X} y={rowCenter - 70} textAnchor="middle" className="fill-sky-700 text-[10px] font-semibold uppercase tracking-[0.14em]">
        {copy.input}
      </text>
      <text x={POLARIZER_X} y={rowCenter - 70} textAnchor="middle" className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]">
        {copy.polarizerAxis}
      </text>
      <text x={DETECTOR_X} y={rowCenter - 70} textAnchor="middle" className="fill-teal-700 text-[10px] font-semibold uppercase tracking-[0.14em]">
        {copy.detector}
      </text>

      <text x={SOURCE_X} y={rowCenter + 78} textAnchor="middle" className="fill-ink-500 text-[10px]">
        {frame.snapshot.unpolarized
          ? copy.noFixedAxis
          : `${copy.thetaIn} = ${formatMeasurement(frame.snapshot.inputAngle, "deg")}`}
      </text>
      <text x={POLARIZER_X} y={rowCenter + 78} textAnchor="middle" className="fill-ink-500 text-[10px]">
        {copy.thetaP} = {formatMeasurement(frame.snapshot.polarizerAngle, "deg")}
      </text>
      <text x={DETECTOR_X} y={rowCenter + 78} textAnchor="middle" className="fill-ink-500 text-[10px]">
        {localizeBrightnessLabel(locale, frame.snapshot.brightnessLabel)}
      </text>

      {showTransverseGuide
        ? renderTransverseGuide(rowCenter, copy, options.focusedOverlayId)
        : null}
      {showProjectionGuide
        ? renderProjectionGuide(frame, rowCenter, copy, options.focusedOverlayId)
        : null}
      {showIntensityGuide
        ? renderIntensityGuide(frame, rowCenter, copy, options.focusedOverlayId)
        : null}
    </g>
  );
}

function formatCompareBadge(
  frame: PolarizationFrame,
  copy: PolarizationCopy,
) {
  return frame.snapshot.unpolarized
    ? `${copy.unpolarized}, ${copy.axisShort} ${formatMeasurement(frame.snapshot.polarizerAngle, "deg")}, I/I0 ${formatNumber(frame.snapshot.transmittedIntensityFraction)}`
    : `${copy.thetaIn} ${formatMeasurement(frame.snapshot.inputAngle, "deg")}, ${copy.axisShort} ${formatMeasurement(frame.snapshot.polarizerAngle, "deg")}, I/I0 ${formatNumber(frame.snapshot.transmittedIntensityFraction)}`;
}

export function PolarizationSimulation({
  concept,
  params,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: PolarizationSimulationProps) {
  const locale = useLocale() as AppLocale;
  const copy = getPolarizationCopy(locale);
  const previewPolarizerAngle =
    graphPreview?.kind === "response"
      ? clamp(graphPreview.point.x, POLARIZATION_MIN_ANGLE, POLARIZATION_MAX_ANGLE)
      : undefined;
  const activeFrame = buildFrame(params, previewPolarizerAngle);
  const compareAFrame = compare
    ? buildFrame(compare.setupA, graphPreview?.setup === "a" ? previewPolarizerAngle : undefined)
    : null;
  const compareBFrame = compare
    ? buildFrame(compare.setupB, graphPreview?.setup === "b" ? previewPolarizerAngle : undefined)
    : null;
  const { compareEnabled, previewedSetup, primaryFrame, primaryLabel, secondaryLabel } =
    resolveCompareScene({
      compare,
      graphPreview,
      activeFrame,
      frameA: compareAFrame,
      frameB: compareBFrame,
      liveLabel: copy.liveSetup,
      defaultLabelA: getCompareSetupLabel(locale, "a"),
      defaultLabelB: getCompareSetupLabel(locale, "b"),
    });
  const previewBadge = graphPreview?.kind === "response" ? (
    <SimulationPreviewBadge>
      {copy.previewAxis} {formatMeasurement(previewPolarizerAngle ?? 0, "deg")}
    </SimulationPreviewBadge>
  ) : null;
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {localizeKnownCompareText(locale, compare?.labelA ?? getCompareSetupLabel(locale, "a"))}:{" "}
        {formatCompareBadge(compareAFrame!, copy)}
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {localizeKnownCompareText(locale, compare?.labelB ?? getCompareSetupLabel(locale, "b"))}:{" "}
        {formatCompareBadge(compareBFrame!, copy)}
      </span>
    </div>
  ) : null;

  const metricRows = [
    {
      label: copy.input,
      value: primaryFrame.snapshot.unpolarized ? copy.unpolarized : copy.linear,
    },
    {
      label: copy.thetaIn,
      value: primaryFrame.snapshot.unpolarized
        ? copy.mixed
        : formatMeasurement(primaryFrame.snapshot.inputAngle, "deg"),
    },
    {
      label: copy.thetaP,
      value: formatMeasurement(primaryFrame.snapshot.polarizerAngle, "deg"),
    },
    {
      label: copy.angleDifference,
      value: primaryFrame.snapshot.unpolarized
        ? copy.average
        : formatMeasurement(primaryFrame.snapshot.angleDifference, "deg"),
    },
    {
      label: "E_out",
      value: formatMeasurement(primaryFrame.snapshot.transmittedFieldAmplitude, "arb."),
    },
    {
      label: "I / I0",
      value: formatNumber(primaryFrame.snapshot.transmittedIntensityFraction),
      valueClassName:
        primaryFrame.snapshot.transmittedIntensityFraction <= 0.08
          ? "fill-coral-700 text-[12px] font-semibold"
          : primaryFrame.snapshot.transmittedIntensityFraction >= 0.9
            ? "fill-teal-700 text-[12px] font-semibold"
            : "fill-ink-950 text-[12px] font-semibold",
    },
  ];
  const noteLines = primaryFrame.snapshot.unpolarized
    ? [
        copy.idealHalfIntensityNote,
        copy.outputAlongAxisNote,
      ]
    : [
        `${copy.projectionPrefix} ${localizeProjectionLabel(locale, primaryFrame.snapshot.projectionLabel)}.`,
        copy.outputOrientationResetNote,
      ];

  return (
    <SimulationSceneCard
      title={concept.title}
      description={copy.sceneDescription}
      headerClassName="bg-[linear-gradient(135deg,rgba(78,166,223,0.08),rgba(30,166,162,0.08),rgba(249,115,22,0.08))]"
      headerAside={
        <>
          {previewBadge}
          {compareEnabled ? (
            <CompareLegend primaryLabel={primaryLabel} secondaryLabel={secondaryLabel} />
          ) : (
            <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-600">
              {localizeKnownCompareText(locale, primaryLabel)}
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
            {renderRow(compareAFrame!, COMPARE_ROW_CENTERS.a, locale, copy, {
              label: localizeKnownCompareText(
                locale,
                compare?.labelA ?? getCompareSetupLabel(locale, "a"),
              ),
              compareBadge: getCompareBadgeLabel(
                locale,
                compare?.activeTarget === "a" ? "editing" : "locked",
              ),
              overlayValues,
              focusedOverlayId,
              muted: previewedSetup === "b",
            })}
            {renderRow(compareBFrame!, COMPARE_ROW_CENTERS.b, locale, copy, {
              label: localizeKnownCompareText(
                locale,
                compare?.labelB ?? getCompareSetupLabel(locale, "b"),
              ),
              compareBadge: getCompareBadgeLabel(
                locale,
                compare?.activeTarget === "b" ? "editing" : "locked",
              ),
              overlayValues,
              focusedOverlayId,
              muted: previewedSetup === "a",
            })}
          </>
        ) : (
          renderRow(activeFrame, SINGLE_ROW_CENTER, locale, copy, {
            label: copy.liveBench,
            overlayValues,
            focusedOverlayId,
          })
        )}

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={copy.polarizerState}
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={noteLines}
        />
      </svg>
    </SimulationSceneCard>
  );
}
