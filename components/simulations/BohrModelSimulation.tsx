"use client";

import { useLocale } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import {
  BOHR_MODEL_SPECTRUM_MAX_NM,
  BOHR_MODEL_SPECTRUM_MIN_NM,
  formatMeasurement,
  formatNumber,
  sampleBohrModelState,
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

type BohrModelSimulationProps = {
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
const CARD_WIDTH = 214;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 20;
const ROW_LEFT = 40;
const ROW_RIGHT = 708;
const ROW_HALF_HEIGHT = 100;
const SINGLE_ROW_CENTER = 284;
const COMPARE_ROW_CENTERS: Record<GraphSeriesSetupId, number> = {
  a: 188,
  b: 388,
};
const RADIUS_LEFT = 62;
const RADIUS_RIGHT = 232;
const NUCLEUS_X = RADIUS_LEFT + 28;
const LADDER_LEFT = 266;
const LADDER_RIGHT = 436;
const STRIP_LEFT = 474;
const STRIP_RIGHT = 690;
const STRIP_HEIGHT = 58;

function spectrumX(wavelengthNm: number) {
  return (
    STRIP_LEFT +
    ((wavelengthNm - BOHR_MODEL_SPECTRUM_MIN_NM) /
      (BOHR_MODEL_SPECTRUM_MAX_NM - BOHR_MODEL_SPECTRUM_MIN_NM)) *
      (STRIP_RIGHT - STRIP_LEFT)
  );
}

function buildFrame(
  source: SimulationParams,
  time: number,
  graphPreview?: GraphStagePreview | null,
) {
  const previewWavelengthNm =
    graphPreview?.kind === "response" && graphPreview.graphId === "series-spectrum"
      ? graphPreview.point.x
      : undefined;

  return sampleBohrModelState(source, time, previewWavelengthNm);
}

function renderRadiusMap(
  frame: ReturnType<typeof sampleBohrModelState>,
  rowCenter: number,
  options: {
    focusedOverlayId?: string | null;
    overlayValues?: Record<string, boolean>;
    muted?: boolean;
    isZhHk?: boolean;
  },
) {
  const top = rowCenter - 74;
  const rowHeight = 18;
  const maxRadius = frame.levels[frame.levels.length - 1]?.radiusA0 ?? 36;
  const showRadiusRule = options.overlayValues?.radiusRule ?? true;
  const ruleOpacity = resolveOverlayOpacity(options.focusedOverlayId, "radiusRule", 0.42);
  const panelOpacity = options.muted ? 0.36 : 1;

  return (
    <g opacity={panelOpacity}>
      <text
        x={RADIUS_LEFT}
        y={top - 14}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        {options.isZhHk ? "半徑圖" : "radius map"}
      </text>
      <rect
        x={RADIUS_LEFT - 10}
        y={top - 4}
        width={RADIUS_RIGHT - RADIUS_LEFT + 18}
        height={frame.levels.length * rowHeight + 26}
        rx="20"
        fill="rgba(255,253,247,0.82)"
        stroke="rgba(15,28,36,0.08)"
      />
      <circle cx={NUCLEUS_X - 10} cy={top + 43} r="8.5" fill="#f16659" opacity="0.9" />
      <text
        x={NUCLEUS_X - 10}
        y={top + 47}
        textAnchor="middle"
        className="fill-white text-[9px] font-semibold uppercase tracking-[0.08em]"
      >
        p
      </text>
      {frame.levels.map((level, index) => {
        const y = top + 18 + index * rowHeight;
        const endX = NUCLEUS_X + (level.radiusA0 / Math.max(maxRadius, 1e-6)) * 112;
        const isUpper = level.n === frame.activeTransition.fromLevel;
        const isLower = level.n === frame.activeTransition.toLevel;
        const stroke = isUpper ? "#f16659" : isLower ? "#1ea6a2" : "rgba(49,80,99,0.82)";
        const opacity = isUpper || isLower ? 1 : 0.5;

        return (
          <g key={`radius-${level.n}`}>
            <line
              x1={NUCLEUS_X}
              x2={endX}
              y1={y}
              y2={y}
              stroke={stroke}
              strokeWidth={isUpper || isLower ? 3 : 2}
              strokeLinecap="round"
              opacity={opacity}
            />
            <circle cx={endX} cy={y} r={isUpper || isLower ? 4 : 2.8} fill={stroke} />
            <text
              x={RADIUS_LEFT + 8}
              y={y + 3}
              className="fill-ink-700 text-[10px] font-semibold uppercase tracking-[0.12em]"
            >
              n = {level.n}
            </text>
            <text
              x={RADIUS_RIGHT - 4}
              y={y + 3}
              textAnchor="end"
              className="fill-ink-500 text-[9px]"
            >
              {formatMeasurement(level.radiusA0, "a0")}
            </text>
          </g>
        );
      })}
      {showRadiusRule ? (
        <g pointerEvents="none" opacity={ruleOpacity}>
          <rect
            x={RADIUS_LEFT + 8}
            y={top + frame.levels.length * rowHeight + 4}
            width="150"
            height="36"
            rx="14"
            fill="rgba(255,253,247,0.94)"
            stroke="rgba(15,28,36,0.08)"
          />
          <text
            x={RADIUS_LEFT + 20}
            y={top + frame.levels.length * rowHeight + 19}
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
          >
            {options.isZhHk ? "r_n 與 n^2 成正比" : "r_n scales as n^2"}
          </text>
          <text x={RADIUS_LEFT + 20} y={top + frame.levels.length * rowHeight + 33} className="fill-ink-600 text-[10px]">
            {options.isZhHk ? "更高的允許軌道會迅速向外展開。" : "Higher allowed orbits spread outward quickly."}
          </text>
        </g>
      ) : null}
    </g>
  );
}

function renderEnergyLadder(
  frame: ReturnType<typeof sampleBohrModelState>,
  rowCenter: number,
  options: {
    muted?: boolean;
    isZhHk?: boolean;
  },
) {
  const top = rowCenter - 72;
  const bottom = rowCenter + 72;
  const panelOpacity = options.muted ? 0.36 : 1;
  const levelY = (energyEv: number) =>
    bottom - ((energyEv + 13.6) / 13.6) * (bottom - top);

  return (
    <g opacity={panelOpacity}>
      <text
        x={LADDER_LEFT}
        y={top - 16}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        {options.isZhHk ? "能級階梯" : "energy ladder"}
      </text>
      <rect
        x={LADDER_LEFT - 10}
        y={top - 6}
        width={LADDER_RIGHT - LADDER_LEFT + 18}
        height={bottom - top + 16}
        rx="20"
        fill="rgba(255,253,247,0.82)"
        stroke="rgba(15,28,36,0.08)"
      />
      {frame.levels.map((level, index) => {
        const y = levelY(level.energyEv);
        const isUpper = level.n === frame.activeTransition.fromLevel;
        const isLower = level.n === frame.activeTransition.toLevel;
        const stroke = isUpper ? "#f16659" : isLower ? "#1ea6a2" : "rgba(49,80,99,0.92)";

        return (
          <g key={`level-${index + 1}`}>
            <line
              x1={LADDER_LEFT + 20}
              x2={LADDER_RIGHT - 18}
              y1={y}
              y2={y}
              stroke={stroke}
              strokeWidth={isUpper || isLower ? 3.2 : 2.5}
              strokeLinecap="round"
              opacity={isUpper || isLower ? 1 : 0.68}
            />
            <text
              x={LADDER_LEFT + 8}
              y={y + 4}
              className="fill-ink-700 text-[10px] font-semibold uppercase tracking-[0.12em]"
            >
              n = {level.n}
            </text>
            <text
              x={LADDER_RIGHT - 4}
              y={y + 4}
              textAnchor="end"
              className="fill-ink-500 text-[9px]"
            >
              {formatMeasurement(level.energyEv, "eV")}
            </text>
          </g>
        );
      })}
      <SvgArrow
        x1={LADDER_RIGHT - 28}
        y1={levelY(frame.excitationMode ? frame.lowerEnergyEv : frame.upperEnergyEv)}
        x2={LADDER_RIGHT - 28}
        y2={levelY(frame.excitationMode ? frame.upperEnergyEv : frame.lowerEnergyEv)}
        stroke={frame.activeTransition.lineColorHex}
        strokeWidth={3}
      />
    </g>
  );
}

function renderSeriesStrip(
  frame: ReturnType<typeof sampleBohrModelState>,
  rowCenter: number,
  options: {
    focusedOverlayId?: string | null;
    overlayValues?: Record<string, boolean>;
    muted?: boolean;
    isZhHk?: boolean;
  },
) {
  const stripTop = rowCenter - 18;
  const stripBottom = stripTop + STRIP_HEIGHT;
  const stripMidY = (stripTop + stripBottom) / 2;
  const labelsOpacity = resolveOverlayOpacity(options.focusedOverlayId, "lineLabels", 0.42);
  const familyOpacity = resolveOverlayOpacity(options.focusedOverlayId, "seriesFamily", 0.42);
  const showLineLabels = options.overlayValues?.lineLabels ?? true;
  const showSeriesFamily = options.overlayValues?.seriesFamily ?? true;
  const panelOpacity = options.muted ? 0.36 : 1;
  const visibleLeft = spectrumX(380);
  const visibleRight = spectrumX(750);
  const limitX = spectrumX(frame.seriesLimitWavelengthNm);

  return (
    <g opacity={panelOpacity}>
      <text
        x={STRIP_LEFT}
        y={stripTop - 18}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        {options.isZhHk ? "氫譜線圖" : "hydrogen line map"}
      </text>
      <rect
        x={STRIP_LEFT}
        y={stripTop}
        width={STRIP_RIGHT - STRIP_LEFT}
        height={STRIP_HEIGHT}
        rx="18"
        fill="rgba(16,24,33,0.96)"
        stroke="rgba(15,28,36,0.1)"
      />
      <rect
        x={visibleLeft}
        y={stripTop}
        width={visibleRight - visibleLeft}
        height={STRIP_HEIGHT}
        rx="18"
        fill="url(#bohr-visible-band)"
        opacity="0.18"
      />
      <text x={STRIP_LEFT} y={stripBottom + 16} className="fill-ink-500 text-[10px]">
        UV
      </text>
      <text
        x={(visibleLeft + visibleRight) / 2}
        y={stripBottom + 16}
        textAnchor="middle"
        className="fill-ink-500 text-[10px]"
      >
        {options.isZhHk ? "可見光" : "visible"}
      </text>
      <text
        x={STRIP_RIGHT}
        y={stripBottom + 16}
        textAnchor="end"
        className="fill-ink-500 text-[10px]"
      >
        IR
      </text>
      {frame.seriesTransitions.map((transition) => {
        const x = spectrumX(transition.wavelengthNm);
        const isActive = transition.id === frame.activeTransition.id;
        const lineHeight = 16 + transition.lineWeight * 24;

        return (
          <line
            key={transition.id}
            x1={x}
            x2={x}
            y1={stripMidY - lineHeight / 2}
            y2={stripMidY + lineHeight / 2}
            stroke={transition.lineColorHex}
            strokeWidth={isActive ? 4.5 : 3}
            strokeLinecap="round"
            opacity={isActive ? 1 : 0.74}
          />
        );
      })}
      {showSeriesFamily ? (
        <g pointerEvents="none" opacity={familyOpacity}>
          <line
            x1={limitX}
            x2={limitX}
            y1={stripTop - 8}
            y2={stripBottom + 8}
            stroke="rgba(30,166,162,0.52)"
            strokeDasharray="4 4"
            strokeWidth="1.8"
          />
          <rect
            x={STRIP_LEFT + 10}
            y={stripBottom + 28}
            width="188"
            height="40"
            rx="14"
            fill="rgba(255,253,247,0.94)"
            stroke="rgba(15,28,36,0.08)"
          />
          <text
            x={STRIP_LEFT + 22}
            y={stripBottom + 44}
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
          >
            {options.isZhHk
              ? `${localizeBohrSeries(frame.seriesName, true)}`
              : `${frame.seriesName} series`}
          </text>
          <text x={STRIP_LEFT + 22} y={stripBottom + 58} className="fill-ink-600 text-[10px]">
            {options.isZhHk
              ? `譜線向 ${formatMeasurement(frame.seriesLimitWavelengthNm, "nm")} 擠近`
              : `lines crowd toward ${formatMeasurement(frame.seriesLimitWavelengthNm, "nm")}`}
          </text>
        </g>
      ) : null}
      {showLineLabels ? (
        <g pointerEvents="none" opacity={labelsOpacity}>
          {frame.seriesTransitions.map((transition, index) => {
            const x = spectrumX(transition.wavelengthNm);
            const labelY = index % 2 === 0 ? stripTop - 8 : stripBottom + 86;
            const label = frame.excitationMode
              ? transition.excitationLabel
              : transition.emissionLabel;

            return (
              <g key={`${transition.id}-label`}>
                <line
                  x1={x}
                  x2={x}
                  y1={index % 2 === 0 ? stripTop : stripBottom}
                  y2={labelY - (index % 2 === 0 ? -4 : 6)}
                  stroke="rgba(15,28,36,0.14)"
                  strokeDasharray="4 4"
                />
                <text
                  x={x}
                  y={labelY}
                  textAnchor="middle"
                  className="fill-ink-600 text-[9px] font-semibold"
                >
                  {label}
                </text>
                <text
                  x={x}
                  y={labelY + 10}
                  textAnchor="middle"
                  className="fill-ink-500 text-[9px]"
                >
                  {formatNumber(transition.wavelengthNm)} nm
                </text>
              </g>
            );
          })}
        </g>
      ) : null}
    </g>
  );
}

function renderTransitionLink(
  frame: ReturnType<typeof sampleBohrModelState>,
  rowCenter: number,
  options: {
    focusedOverlayId?: string | null;
    overlayValues?: Record<string, boolean>;
    muted?: boolean;
    isZhHk?: boolean;
  },
) {
  const top = rowCenter - 72;
  const bottom = rowCenter + 72;
  const ladderY = (energyEv: number) =>
    bottom - ((energyEv + 13.6) / 13.6) * (bottom - top);
  const startY = ladderY(
    frame.excitationMode ? frame.lowerEnergyEv : frame.upperEnergyEv,
  );
  const endY = ladderY(
    frame.excitationMode ? frame.upperEnergyEv : frame.lowerEnergyEv,
  );
  const ladderAnchorX = LADDER_RIGHT + 4;
  const lineX = spectrumX(frame.activeTransition.wavelengthNm);
  const stripY = rowCenter - 20;
  const photonStartX = frame.excitationMode ? lineX : ladderAnchorX;
  const photonEndX = frame.excitationMode ? ladderAnchorX : lineX;
  const photonX =
    photonStartX + (photonEndX - photonStartX) * frame.photonTravelFraction;
  const photonY =
    stripY + (((startY + endY) / 2 - stripY) * frame.photonTravelFraction);
  const reverseOpacity = resolveOverlayOpacity(
    options.focusedOverlayId,
    "reverseTransition",
    0.42,
  );
  const showReverseTransition = options.overlayValues?.reverseTransition ?? true;
  const panelOpacity = options.muted ? 0.36 : 1;

  return (
    <g opacity={panelOpacity}>
      <SvgArrow
        x1={ladderAnchorX}
        y1={(startY + endY) / 2}
        x2={lineX}
        y2={stripY}
        stroke={frame.activeTransition.lineColorHex}
        strokeWidth={2.6}
        dashed
      />
      <circle cx={photonX} cy={photonY} r="5.2" fill={frame.activeTransition.lineColorHex} />
      {showReverseTransition ? (
        <g pointerEvents="none" opacity={reverseOpacity}>
          <rect
            x={LADDER_RIGHT + 18}
            y={rowCenter - 84}
            width="176"
            height="40"
            rx="14"
            fill="rgba(255,253,247,0.94)"
            stroke="rgba(15,28,36,0.08)"
          />
          <text
            x={LADDER_RIGHT + 30}
            y={rowCenter - 68}
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
          >
            {options.isZhHk ? "反向躍遷用同一波長" : "same wavelength in reverse"}
          </text>
          <text x={LADDER_RIGHT + 30} y={rowCenter - 54} className="fill-ink-600 text-[10px]">
            {options.isZhHk
              ? `激發時同樣使用 ${formatMeasurement(frame.activeTransition.wavelengthNm, "nm")} 這個波長。`
              : `Excitation uses the same ${formatMeasurement(frame.activeTransition.wavelengthNm, "nm")}.`}
          </text>
        </g>
      ) : null}
    </g>
  );
}

function renderRow(
  frame: ReturnType<typeof sampleBohrModelState>,
  rowCenter: number,
  options: {
    label: string;
    compareBadge?: string;
    overlayValues?: Record<string, boolean>;
    focusedOverlayId?: string | null;
    muted?: boolean;
    isZhHk?: boolean;
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
        fill="rgba(255,253,247,0.86)"
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
        x={ROW_RIGHT - 16}
        y={top + 20}
        textAnchor="end"
        className="fill-ink-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        {options.compareBadge ??
          `${localizeBohrMode(frame.modeLabel, Boolean(options.isZhHk))}${options.isZhHk ? "模式" : " mode"}`}
      </text>
      {renderRadiusMap(frame, rowCenter, options)}
      {renderEnergyLadder(frame, rowCenter, options)}
      {renderSeriesStrip(frame, rowCenter, options)}
      {renderTransitionLink(frame, rowCenter, options)}
    </g>
  );
}

function buildPreviewBadge(graphPreview: GraphStagePreview | null, isZhHk: boolean) {
  if (!graphPreview || graphPreview.kind !== "response" || graphPreview.graphId !== "series-spectrum") {
    return null;
  }

  return (
    <SimulationPreviewBadge tone="sky">
      {isZhHk ? "預覽 λ =" : "preview lambda ="} {formatNumber(graphPreview.point.x)} nm
    </SimulationPreviewBadge>
  );
}

function localizeBohrMode(modeLabel: string, isZhHk: boolean) {
  if (!isZhHk) {
    return modeLabel;
  }

  if (modeLabel === "Emission") {
    return "發射";
  }

  if (modeLabel === "Excitation") {
    return "激發";
  }

  return modeLabel;
}

function localizeBohrSeries(seriesName: string, isZhHk: boolean) {
  if (!isZhHk) {
    return seriesName;
  }

  if (seriesName === "Lyman") {
    return "Lyman 系";
  }

  if (seriesName === "Balmer") {
    return "Balmer 系";
  }

  if (seriesName === "Paschen") {
    return "Paschen 系";
  }

  return seriesName;
}

function localizeBohrBand(bandLabel: string, isZhHk: boolean) {
  if (!isZhHk) {
    return bandLabel;
  }

  if (bandLabel === "Visible") {
    return "可見";
  }

  if (bandLabel === "Infrared") {
    return "紅外";
  }

  if (bandLabel === "Ultraviolet") {
    return "紫外";
  }

  return bandLabel;
}

function formatCompareSummary(
  frame: ReturnType<typeof sampleBohrModelState>,
  isZhHk: boolean,
) {
  return `${localizeBohrSeries(frame.seriesName, isZhHk)} / ${formatNumber(frame.activeTransition.wavelengthNm)} nm`;
}

export function BohrModelSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: BohrModelSimulationProps) {
  const locale = useLocale() as AppLocale;
  const isZhHk = locale === "zh-HK";
  const activeFrame = buildFrame(params, time, graphPreview);
  const frameA = compare
    ? buildFrame(compare.setupA, time, graphPreview?.setup === "a" ? graphPreview : null)
    : null;
  const frameB = compare
    ? buildFrame(compare.setupB, time, graphPreview?.setup === "b" ? graphPreview : null)
    : null;
  const { compareEnabled, previewedSetup, primaryFrame, primaryLabel, secondaryLabel } =
    resolveCompareScene({
      compare,
      graphPreview,
      activeFrame,
      frameA,
      frameB,
      liveLabel: isZhHk ? "即時設定" : "Live setup",
    });
  const previewBadge = buildPreviewBadge(graphPreview ?? null, isZhHk);
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? (isZhHk ? "設定 A" : "Setup A"))}: {formatCompareSummary(frameA!, isZhHk)}
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? (isZhHk ? "設定 B" : "Setup B"))}: {formatCompareSummary(frameB!, isZhHk)}
      </span>
    </div>
  ) : null;
  const metricRows = [
    { label: isZhHk ? "模式" : "mode", value: localizeBohrMode(primaryFrame.modeLabel, isZhHk) },
    { label: isZhHk ? "譜系" : "series", value: localizeBohrSeries(primaryFrame.seriesName, isZhHk) },
    {
      label: isZhHk ? "目前躍遷" : "active pair",
      value: primaryFrame.excitationMode
        ? primaryFrame.activeTransition.excitationLabel
        : primaryFrame.activeTransition.emissionLabel,
    },
    {
      label: "DeltaE",
      value: formatMeasurement(primaryFrame.activeTransition.energyEv, "eV"),
    },
    {
      label: "lambda",
      value: formatMeasurement(primaryFrame.activeTransition.wavelengthNm, "nm"),
    },
    { label: isZhHk ? "波段" : "band", value: localizeBohrBand(primaryFrame.activeTransition.bandLabel, isZhHk) },
    {
      label: isZhHk ? "極限" : "limit",
      value: formatMeasurement(primaryFrame.seriesLimitWavelengthNm, "nm"),
    },
    {
      label: "r_i/r_f",
      value: formatNumber(primaryFrame.radiusRatio),
    },
  ];
  const noteLines = [
    isZhHk
      ? `${localizeBohrSeries(primaryFrame.seriesName, true)} 把 n_f = ${primaryFrame.lowerLevel} 固定，較高的 n_i 會逐漸擠向 ${formatMeasurement(primaryFrame.seriesLimitWavelengthNm, "nm")}。`
      : `${primaryFrame.seriesName} keeps n_f = ${primaryFrame.lowerLevel} fixed while higher n_i values crowd toward ${formatMeasurement(primaryFrame.seriesLimitWavelengthNm, "nm")}.`,
    isZhHk
      ? `${localizeBohrMode(primaryFrame.modeLabel, true)}與其反向躍遷使用相同的 ${formatMeasurement(primaryFrame.activeTransition.wavelengthNm, "nm")} 波長。`
      : `${primaryFrame.modeLabel} uses the same ${formatMeasurement(primaryFrame.activeTransition.wavelengthNm, "nm")} as the reverse transition.`,
    isZhHk
      ? "這一頁把波耳模型保留為有界的氫原子歷史模型，而不是最終的量子描述。"
      : "This page keeps Bohr as a bounded historical hydrogen model, not the final quantum description.",
  ];

  return (
    <SimulationSceneCard
      title={concept.title}
      description={
        isZhHk
          ? "用一個有界的波耳實驗台，把氫原子的半徑縮放、量子化能級與譜線波長放在同一個畫面上。"
          : "A bounded Bohr bench keeps hydrogen radius scaling, quantized energies, and spectral-line wavelengths on one shared surface."
      }
      headerClassName="bg-[linear-gradient(135deg,rgba(245,158,11,0.14),rgba(30,166,162,0.08),rgba(99,102,241,0.08))]"
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
        <defs>
          <linearGradient id="bohr-visible-band" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="22%" stopColor="#2563eb" />
            <stop offset="44%" stopColor="#0891b2" />
            <stop offset="62%" stopColor="#16a34a" />
            <stop offset="80%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.48)" />
        {compareEnabled ? (
          <>
            {renderRow(frameA!, COMPARE_ROW_CENTERS.a, {
              label: compare?.labelA ?? (isZhHk ? "設定 A" : "Setup A"),
              compareBadge: compare?.activeTarget === "a" ? (isZhHk ? "編輯中" : "editing") : (isZhHk ? "已鎖定" : "locked"),
              overlayValues,
              focusedOverlayId,
              muted: previewedSetup === "b",
              isZhHk,
            })}
            {renderRow(frameB!, COMPARE_ROW_CENTERS.b, {
              label: compare?.labelB ?? (isZhHk ? "設定 B" : "Setup B"),
              compareBadge: compare?.activeTarget === "b" ? (isZhHk ? "編輯中" : "editing") : (isZhHk ? "已鎖定" : "locked"),
              overlayValues,
              focusedOverlayId,
              muted: previewedSetup === "a",
              isZhHk,
            })}
          </>
        ) : (
          renderRow(activeFrame, SINGLE_ROW_CENTER, {
            label: isZhHk ? "即時氫原子躍遷實驗台" : "Live hydrogen transition bench",
            overlayValues,
            focusedOverlayId,
            isZhHk,
          })
        )}
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={isZhHk ? "波耳狀態" : "Bohr state"}
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={noteLines}
        />
      </svg>
    </SimulationSceneCard>
  );
}
