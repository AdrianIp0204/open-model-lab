"use client";

import { useLocale } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import {
  formatNumber,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { sampleSolubilitySaturationState } from "@/lib/physics/solubilitySaturation";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import { ChemistryVessel } from "./primitives/chemistry-vessel";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type SolubilitySaturationSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 900;
const HEIGHT = 420;
const BENCH_X = 24;
const BENCH_Y = 28;
const BENCH_WIDTH = 612;
const BENCH_HEIGHT = 330;
const CARD_X = 662;
const CARD_Y = 28;
const CARD_WIDTH = 214;

function overlayOpacity(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.3;
}

function buildPreviewSource(source: SimulationParams, preview: GraphStagePreview | null | undefined) {
  if (!preview || preview.kind !== "response") {
    return source;
  }

  if (preview.graphId === "dissolved-vs-solute" || preview.graphId === "excess-vs-solute") {
    return { ...source, soluteAmount: preview.point.x };
  }

  if (preview.graphId === "capacity-vs-solvent") {
    return { ...source, solventVolume: preview.point.x };
  }

  if (preview.graphId === "saturation-vs-limit") {
    return { ...source, solubilityLimit: preview.point.x };
  }

  return source;
}

function resolvePreviewLabel(
  preview: GraphStagePreview | null | undefined,
  isZhHk: boolean,
) {
  if (!preview || preview.kind !== "response") {
    return null;
  }

  if (preview.graphId === "dissolved-vs-solute") {
    return isZhHk
      ? `預覽溶質 = ${formatNumber(preview.point.x)}`
      : `preview solute = ${formatNumber(preview.point.x)}`;
  }

  if (preview.graphId === "excess-vs-solute") {
    return isZhHk
      ? `預覽溶質 = ${formatNumber(preview.point.x)}`
      : `preview solute = ${formatNumber(preview.point.x)}`;
  }

  if (preview.graphId === "capacity-vs-solvent") {
    return isZhHk
      ? `預覽體積 = ${formatNumber(preview.point.x)}`
      : `preview volume = ${formatNumber(preview.point.x)}`;
  }

  if (preview.graphId === "saturation-vs-limit") {
    return isZhHk
      ? `預覽上限 = ${formatNumber(preview.point.x)}`
      : `preview limit = ${formatNumber(preview.point.x)}`;
  }

  return null;
}

function drawSaturationGauge(
  x: number,
  y: number,
  width: number,
  snapshot: ReturnType<typeof sampleSolubilitySaturationState>,
  focusedOverlayId?: string | null,
  isZhHk?: boolean,
) {
  const trackWidth = width - 22;
  const capacityShare = Math.min(snapshot.dissolvedFraction, 1);
  const overflowShare =
    snapshot.excessAmount > 0 ? Math.min(snapshot.excessAmount / Math.max(snapshot.capacity, 0.001), 0.34) : 0;
  const dissolvedWidth = trackWidth * capacityShare;
  const excessWidth = trackWidth * overflowShare;

  return (
    <g opacity={overlayOpacity(focusedOverlayId, "saturationGauge")}>
      <rect x={x} y={y} width={width} height="110" rx="18" fill="rgba(255,255,255,0.88)" stroke="rgba(15,28,36,0.12)" />
      <text x={x + 14} y={y + 20} className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]">
        {isZhHk ? "飽和度量尺" : "Saturation gauge"}
      </text>
      <text x={x + 14} y={y + 40} className="fill-ink-950 text-[13px] font-semibold">
        {snapshot.saturated
          ? isZhHk
            ? "已達上限"
            : "At the limit"
          : isZhHk
            ? "仍有溶解空間"
            : "Room left to dissolve"}
      </text>
      <rect x={x + 12} y={y + 54} width={trackWidth} height="14" rx="7" fill="rgba(15,28,36,0.08)" />
      <rect x={x + 12} y={y + 54} width={dissolvedWidth} height="14" rx="7" fill="rgba(30,166,162,0.78)" />
      {snapshot.saturated ? (
        <rect
          x={x + 12 + dissolvedWidth}
          y={y + 54}
          width={Math.max(excessWidth, 10)}
          height="14"
          rx="7"
          fill="rgba(240,171,60,0.88)"
        />
      ) : null}
      <line
        x1={x + 12 + trackWidth}
        x2={x + 12 + trackWidth}
        y1={y + 50}
        y2={y + 72}
        stroke="rgba(15,28,36,0.72)"
        strokeWidth="2"
      />
      <text x={x + 12 + trackWidth} y={y + 88} textAnchor="end" className="fill-ink-700 text-[10px] font-semibold">
        {isZhHk ? "上限" : "limit"} {formatNumber(snapshot.capacity)}
      </text>
      <text x={x + 14} y={y + 102} className="fill-ink-500 text-[10px]">
        {isZhHk
          ? `已溶解 ${formatNumber(snapshot.soluteAmount)} 單位中的 ${formatNumber(snapshot.dissolvedAmount)}。`
          : `Dissolved ${formatNumber(snapshot.dissolvedAmount)} of ${formatNumber(snapshot.soluteAmount)} units.`}
      </text>
    </g>
  );
}

export function SolubilitySaturationSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: SolubilitySaturationSimulationProps) {
  const locale = useLocale() as AppLocale;
  const isZhHk = locale === "zh-HK";
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const primaryParams = buildPreviewSource(
    compare && previewedSetup === "b" ? compare.setupB : compare?.setupA ?? params,
    graphPreview,
  );
  const secondaryParams = compare && previewedSetup === "b" ? compare.setupA : compare?.setupB ?? null;
  const primary = sampleSolubilitySaturationState(primaryParams);
  const secondary = secondaryParams ? sampleSolubilitySaturationState(secondaryParams) : null;
  const primaryLabel = compare
    ? previewedSetup === "b"
      ? compare.labelB ?? (isZhHk ? "變化版本" : "Variant")
      : compare.labelA ?? (isZhHk ? "基準版本" : "Baseline")
    : isZhHk
      ? "即時"
      : "Live";
  const secondaryLabel = compare
    ? previewedSetup === "b"
      ? compare.labelA ?? (isZhHk ? "基準版本" : "Baseline")
      : compare.labelB ?? (isZhHk ? "變化版本" : "Variant")
    : null;
  const previewLabel = resolvePreviewLabel(graphPreview, isZhHk);
  const overlayState = {
    saturationGauge: overlayValues?.saturationGauge ?? true,
    dissolvedCue: overlayValues?.dissolvedCue ?? true,
    excessPile: overlayValues?.excessPile ?? true,
  };
  const loopTime = Number.isFinite(time) ? time % 18 : 0;
  const readoutRows = [
    { label: isZhHk ? "溶質" : "solute", value: formatNumber(primary.soluteAmount) },
    { label: isZhHk ? "溶劑" : "solvent", value: formatNumber(primary.solventVolume) },
    { label: isZhHk ? "上限" : "limit", value: formatNumber(primary.solubilityLimit) },
    { label: isZhHk ? "容量" : "capacity", value: formatNumber(primary.capacity) },
    { label: isZhHk ? "已溶解" : "dissolved", value: formatNumber(primary.dissolvedAmount) },
    { label: isZhHk ? "過剩" : "excess", value: formatNumber(primary.excessAmount) },
    { label: isZhHk ? "濃度" : "conc", value: formatNumber(primary.concentration) },
  ];
  const noteLines = [
    primary.saturated
      ? isZhHk
        ? "已溶解量已到達目前容量上限，所以其餘部分會以過剩固體形式留下。"
        : "The dissolved amount has hit the current capacity, so the rest stays as excess solid."
      : isZhHk
        ? "已溶解量仍低於容量，所以在這些條件下還可以有更多溶質留在溶液中。"
        : "The dissolved amount is still below capacity, so more solute can stay in solution under these conditions.",
    isZhHk
      ? "濃度告訴你每單位體積溶解了多少；溶解度告訴你燒杯在飽和前最多可以溶解多少。"
      : "Concentration tells you how much is dissolved per volume. Solubility tells you how much can dissolve before the beaker saturates.",
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(240,171,60,0.12),rgba(30,166,162,0.1))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{isZhHk ? "溶解度與飽和" : "Solubility and saturation"}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              {isZhHk
                ? "把已溶解物、過剩固體與目前容量放在同一個燒杯內，讓飽和狀態呈現為可見的限制，而不是一句口號。"
                : "Keep dissolved material, excess solid, and the current capacity on one beaker so saturation reads as a limit rather than a slogan."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
            {compare ? (
              <>
                <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
                  {primaryLabel}
                </span>
                <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
                  {secondaryLabel}
                </span>
              </>
            ) : null}
            {previewLabel ? (
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-sky-700">
                {previewLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
      >
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.58)" />

        {secondary ? (
          <ChemistryVessel
            x={BENCH_X + 12}
            y={BENCH_Y + 10}
            width={BENCH_WIDTH}
            height={BENCH_HEIGHT}
            title={isZhHk ? "溶液實驗台" : "Solution bench"}
            subtitle={`${secondaryLabel}${isZhHk ? " 參考影像" : " ghost"}`}
            time={loopTime}
            agitation={0.7 + secondary.excessAmount * 0.04}
            reactantCount={secondary.dissolvedParticleCount}
            productCount={secondary.excessParticleCount}
            reactantAmount={secondary.dissolvedAmount}
            productAmount={secondary.excessAmount}
            reactantLabel={isZhHk ? "已溶解" : "Dissolved"}
            productLabel={isZhHk ? "過剩固體" : "Excess solid"}
            reactantTone="teal"
            productTone="amber"
            productShape="square"
            productDock="bottom"
            productMotionScale={0.18}
            showMotionCue={overlayState.dissolvedCue}
            showMixtureBars={overlayState.saturationGauge}
            mixtureTitle={isZhHk ? "混合比例" : "Mixture"}
            focusedOverlayId={focusedOverlayId}
            motionOverlayId="dissolvedCue"
            mixtureOverlayId="saturationGauge"
            legendItems={[
              { label: isZhHk ? "已溶解溶質" : "Dissolved solute", tone: "teal" },
              { label: isZhHk ? "過剩固體" : "Excess solid", tone: "amber" },
            ]}
            chips={[
              { label: `${isZhHk ? "容量" : "capacity"} ${formatNumber(secondary.capacity)}`, tone: "sky" },
              { label: `${isZhHk ? "過剩" : "excess"} ${formatNumber(secondary.excessAmount)}`, tone: "amber" },
            ]}
            footerText={isZhHk ? "這是比較模式的參考設定。" : "Ghost setup for compare mode."}
            muted
            dashed
          />
        ) : null}

        <ChemistryVessel
          x={BENCH_X}
          y={BENCH_Y}
          width={BENCH_WIDTH}
          height={BENCH_HEIGHT}
          title={isZhHk ? "溶液實驗台" : "Solution bench"}
          subtitle={
            primary.saturated
              ? isZhHk
                ? `${primaryLabel}：混合物已經飽和，所以多出的溶質會以固體形式留在杯中。`
                : `${primaryLabel}: the mixture is saturated, so extra solute remains visible as solid.`
              : isZhHk
                ? `${primaryLabel}：混合物仍有空間讓更多溶質溶解。`
                : `${primaryLabel}: the mixture still has room for more solute to dissolve.`
          }
          time={loopTime}
          agitation={0.7 + primary.excessAmount * 0.04}
          reactantCount={primary.dissolvedParticleCount}
          productCount={primary.excessParticleCount}
          reactantAmount={primary.dissolvedAmount}
          productAmount={primary.excessAmount}
          reactantLabel={isZhHk ? "已溶解" : "Dissolved"}
          productLabel={isZhHk ? "過剩固體" : "Excess solid"}
          reactantTone="teal"
          productTone="amber"
          productShape="square"
          productDock="bottom"
          productMotionScale={0.18}
          showMotionCue={overlayState.dissolvedCue}
          showMixtureBars={overlayState.saturationGauge}
          mixtureTitle={isZhHk ? "混合比例" : "Mixture"}
          focusedOverlayId={focusedOverlayId}
          motionOverlayId="dissolvedCue"
          mixtureOverlayId="saturationGauge"
          legendItems={[
            { label: isZhHk ? "已溶解溶質" : "Dissolved solute", tone: "teal" },
            { label: isZhHk ? "過剩固體" : "Excess solid", tone: "amber" },
          ]}
          chips={[
            { label: `${isZhHk ? "容量" : "capacity"} ${formatNumber(primary.capacity)}`, tone: "sky" },
            { label: `${isZhHk ? "已溶解" : "dissolved"} ${formatNumber(primary.dissolvedAmount)}`, tone: "teal" },
            { label: `${isZhHk ? "過剩" : "excess"} ${formatNumber(primary.excessAmount)}`, tone: "amber" },
          ]}
          footerText={
            isZhHk
              ? "已溶解的份量會受目前溶解度上限所限制。"
              : "The amount dissolved is capped by the current solubility limit."
          }
        />

        {overlayState.excessPile
          ? drawSaturationGauge(
              CARD_X - 2,
              BENCH_Y + 28,
              CARD_WIDTH + 8,
              primary,
              focusedOverlayId,
              isZhHk,
            )
          : null}

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y + 148}
          width={CARD_WIDTH}
          title={isZhHk ? "飽和讀數" : "Saturation readout"}
          setupLabel={primaryLabel}
          rows={readoutRows}
          noteLines={noteLines}
        />
      </svg>
    </section>
  );
}
