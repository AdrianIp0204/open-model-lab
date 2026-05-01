"use client";

import { useLocale } from "next-intl";
import {
  formatNumber,
  mapRange,
  sampleAcidBasePhState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import type { AppLocale } from "@/i18n/routing";
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

type AcidBasePhSimulationProps = {
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
const HEIGHT = 410;
const BENCH_X = 26;
const BENCH_Y = 28;
const BENCH_WIDTH = 608;
const BENCH_HEIGHT = 320;
const CARD_X = 664;
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

  if (preview.graphId === "ph-vs-acid") {
    return { ...source, acidAmount: preview.point.x };
  }

  if (preview.graphId === "ph-vs-base") {
    return { ...source, baseAmount: preview.point.x };
  }

  return source;
}

function getAcidBasePhCopy(locale: AppLocale) {
  if (locale === "zh-HK") {
    return {
      previewAcid: "預覽酸量",
      previewBase: "預覽鹼量",
      baseline: "基準",
      variant: "變化",
      live: "即時",
      headerTitle: "酸鹼與 pH 直覺",
      headerDescription:
        "把 H+ 特性、OH- 特性和 pH 試紙放在同一個有界實驗台上，讓 pH 讀數成為可見混合狀態的一部分，而不是死記硬背的數字。",
      benchTitle: "pH 實驗台",
      benchSubtitle: "刻度會隨 H+ 和 OH- 特性偏離中性而即時變動。",
      ghostSuffix: "參考影像",
      hCharacter: "H+ 特性",
      ohCharacter: "OH- 特性",
      acid: "酸",
      base: "鹼",
      water: "水",
      hShare: "H+ 比例",
      ohShare: "OH- 比例",
      scaleTitle: "pH 刻度",
      readoutTitle: "pH 讀數",
      compareGhostFooter: "這是比較模式中的參考設定。",
      liveFooter:
        "pH 較低代表 H+ 特性較強；pH 較高則代表 OH- 特性較強。中性會停留在刻度中段附近。",
      acidicNote: "這杯溶液明顯偏酸，因為 H+ 特性仍然強於 OH- 特性。",
      basicNote: "這杯溶液明顯偏鹼，因為 OH- 特性已主導整體混合。",
      neutralNote: "這杯溶液接近中性，因為酸與鹼的特性仍然相當接近。",
      waterNote: "加入更多水會減弱兩邊的極端程度，但不會單靠稀釋就把酸性翻成鹼性。",
      mixtureTitle: "混合狀態",
    };
  }

  return {
    previewAcid: "preview acid",
    previewBase: "preview base",
    baseline: "Baseline",
    variant: "Variant",
    live: "Live",
    headerTitle: "Acid-base and pH intuition",
    headerDescription:
      "Keep H+ character, OH- character, and the pH strip on one bounded bench so pH reads like a meaningful scale instead of a memorized number line.",
    benchTitle: "pH bench",
    benchSubtitle: "the scale shifts as the H+ and OH- character pull away from neutral.",
    ghostSuffix: "ghost",
    hCharacter: "H+ character",
    ohCharacter: "OH- character",
    acid: "acid",
    base: "base",
    water: "water",
    hShare: "H+ share",
    ohShare: "OH- share",
    scaleTitle: "pH scale",
    readoutTitle: "pH readout",
    compareGhostFooter: "Ghost setup for compare mode.",
    liveFooter:
      "Lower pH means stronger H+ character. Higher pH means stronger OH- character. Neutral stays near the middle.",
    acidicNote:
      "This beaker is clearly acidic because the H+ character still outweighs the OH- character.",
    basicNote: "This beaker is clearly basic because the OH- character dominates the mixture.",
    neutralNote: "This beaker sits near neutral because the acid and base character stay close together.",
    waterNote: "Adding water softens the extremes, but it does not flip acidic to basic by itself.",
    mixtureTitle: "Mixture",
  };
}

function resolvePreviewLabel(
  preview: GraphStagePreview | null | undefined,
  copy: ReturnType<typeof getAcidBasePhCopy>,
) {
  if (!preview || preview.kind !== "response") {
    return null;
  }

  if (preview.graphId === "ph-vs-acid") {
    return `${copy.previewAcid} = ${formatNumber(preview.point.x)}`;
  }

  if (preview.graphId === "ph-vs-base") {
    return `${copy.previewBase} = ${formatNumber(preview.point.x)}`;
  }

  return null;
}

function drawPhScale(
  x: number,
  y: number,
  height: number,
  pH: number,
  scaleTitle: string,
  focusedOverlayId?: string | null,
) {
  const markerY = y + height - mapRange(pH, 0, 14, 0, height);

  return (
    <g opacity={overlayOpacity(focusedOverlayId, "phScale")}>
      <text
        x={x}
        y={y - 10}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        {scaleTitle}
      </text>
      <defs>
        <linearGradient id="ph-scale-gradient" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(78,166,223,0.92)" />
          <stop offset="50%" stopColor="rgba(240,171,60,0.72)" />
          <stop offset="100%" stopColor="rgba(241,102,89,0.92)" />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width="18" height={height} rx="9" fill="url(#ph-scale-gradient)" />
      {[2, 4, 7, 10, 12].map((value) => {
        const tickY = y + height - mapRange(value, 0, 14, 0, height);
        return (
          <g key={value}>
            <line x1={x + 18} x2={x + 28} y1={tickY} y2={tickY} stroke="rgba(15,28,36,0.32)" />
            <text x={x + 34} y={tickY + 4} className="fill-ink-700 text-[10px] font-semibold">
              {value}
            </text>
          </g>
        );
      })}
      <line x1={x - 6} x2={x + 24} y1={markerY} y2={markerY} stroke="rgba(15,28,36,0.9)" strokeWidth="2.2" />
      <text x={x + 36} y={markerY - 8} className="fill-ink-950 text-[11px] font-semibold">
        pH {formatNumber(pH)}
      </text>
    </g>
  );
}

export function AcidBasePhSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: AcidBasePhSimulationProps) {
  const locale = useLocale() as AppLocale;
  const copy = getAcidBasePhCopy(locale);
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const loopTime = Number.isFinite(time) ? time % 18 : 0;
  const liveFrame = sampleAcidBasePhState(buildPreviewSource(params, graphPreview));
  const frameA = compare
    ? sampleAcidBasePhState(buildPreviewSource(compare.setupA, previewedSetup === "a" ? graphPreview : null))
    : null;
  const frameB = compare
    ? sampleAcidBasePhState(buildPreviewSource(compare.setupB, previewedSetup === "b" ? graphPreview : null))
    : null;
  const primary = compare ? (previewedSetup === "b" ? frameB! : frameA!) : liveFrame;
  const secondary = compare ? (previewedSetup === "b" ? frameA! : frameB!) : null;
  const primaryLabel = compare
    ? previewedSetup === "b"
      ? compare.labelB ?? copy.variant
      : compare.labelA ?? copy.baseline
    : copy.live;
  const secondaryLabel = compare
    ? previewedSetup === "b"
      ? compare.labelA ?? copy.baseline
      : compare.labelB ?? copy.variant
    : null;
  const previewLabel = resolvePreviewLabel(graphPreview, copy);
  const overlayState = {
    characterMix: overlayValues?.characterMix ?? true,
    phScale: overlayValues?.phScale ?? true,
    particleMotion: overlayValues?.particleMotion ?? true,
  };
  const readoutRows = [
    { label: copy.acid, value: formatNumber(primary.acidAmount) },
    { label: copy.base, value: formatNumber(primary.baseAmount) },
    { label: copy.water, value: formatNumber(primary.waterVolume) },
    { label: "pH", value: formatNumber(primary.pH) },
    { label: copy.hShare, value: `${formatNumber(primary.acidShare * 100)}%` },
    { label: copy.ohShare, value: `${formatNumber(primary.baseShare * 100)}%` },
  ];
  const noteLines = [
    primary.pH < 6
      ? copy.acidicNote
      : primary.pH > 8
        ? copy.basicNote
        : copy.neutralNote,
    copy.waterNote,
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(241,102,89,0.1),rgba(78,166,223,0.1))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{copy.headerTitle}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              {copy.headerDescription}
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
        className="h-auto w-full overflow-visible"
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
            title={copy.benchTitle}
            subtitle={`${secondaryLabel} ${copy.ghostSuffix}`}
            time={loopTime}
            agitation={0.8 + Math.abs(secondary.pH - 7) * 0.04}
            reactantCount={secondary.hydroniumCount}
            productCount={secondary.hydroxideCount}
            reactantAmount={secondary.acidShare * 10}
            productAmount={secondary.baseShare * 10}
            reactantLabel={copy.hCharacter}
            productLabel={copy.ohCharacter}
            reactantTone="coral"
            productTone="sky"
            showMotionCue={overlayState.particleMotion}
            showMixtureBars={overlayState.characterMix}
            mixtureTitle={copy.mixtureTitle}
            focusedOverlayId={focusedOverlayId}
            motionOverlayId="particleMotion"
            mixtureOverlayId="characterMix"
            chips={[
              {
                label: `pH ${formatNumber(secondary.pH)}`,
                tone: "ink",
                dashed: true,
              },
            ]}
            footerText={copy.compareGhostFooter}
            muted
            dashed
          />
        ) : null}

        <ChemistryVessel
          x={BENCH_X}
          y={BENCH_Y}
          width={BENCH_WIDTH}
          height={BENCH_HEIGHT}
          title={copy.benchTitle}
          subtitle={`${primaryLabel}：${copy.benchSubtitle}`}
          time={loopTime}
          agitation={0.8 + Math.abs(primary.pH - 7) * 0.04}
          reactantCount={primary.hydroniumCount}
          productCount={primary.hydroxideCount}
          reactantAmount={primary.acidShare * 10}
          productAmount={primary.baseShare * 10}
          reactantLabel={copy.hCharacter}
          productLabel={copy.ohCharacter}
          reactantTone="coral"
          productTone="sky"
          showMotionCue={overlayState.particleMotion}
          showMixtureBars={overlayState.characterMix}
          mixtureTitle={copy.mixtureTitle}
          focusedOverlayId={focusedOverlayId}
          motionOverlayId="particleMotion"
          mixtureOverlayId="characterMix"
          legendItems={[
            { label: copy.hCharacter, tone: "coral" },
            { label: copy.ohCharacter, tone: "sky" },
          ]}
          chips={[
            {
              label: `${copy.acid} ${formatNumber(primary.acidCharacter)}`,
              tone: "coral",
            },
            {
              label: `${copy.base} ${formatNumber(primary.baseCharacter)}`,
              tone: "sky",
            },
          ]}
          footerText={copy.liveFooter}
        />

        {overlayState.phScale
          ? drawPhScale(
              BENCH_X + BENCH_WIDTH - 4,
              BENCH_Y + 52,
              210,
              primary.pH,
              copy.scaleTitle,
              focusedOverlayId,
            )
          : null}

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={copy.readoutTitle}
          setupLabel={primaryLabel}
          rows={readoutRows}
          noteLines={noteLines}
        />
      </svg>
    </section>
  );
}
