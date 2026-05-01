"use client";

import { useLocale } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import { localizeKnownCompareText } from "@/lib/i18n/copy-text";
import {
  DYNAMIC_EQUILIBRIUM_TOTAL_TIME,
  formatNumber,
  sampleDynamicEquilibriumState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
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

type DynamicEquilibriumSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 910;
const HEIGHT = 420;
const BENCH_X = 24;
const BENCH_Y = 28;
const BENCH_WIDTH = 620;
const BENCH_HEIGHT = 330;
const CARD_X = 676;
const CARD_Y = 28;
const CARD_WIDTH = 214;

function buildPreviewSource(
  source: SimulationParams,
  preview: GraphStagePreview | null | undefined,
) {
  if (!preview || preview.kind !== "response") {
    return source;
  }

  if (preview.graphId === "equilibrium-share") {
    return {
      ...source,
      productFavor: preview.point.x,
    };
  }

  return source;
}

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

function resolveFrame(
  source: SimulationParams,
  displayTime: number,
  preview: GraphStagePreview | null | undefined,
) {
  return sampleDynamicEquilibriumState(
    buildPreviewSource(source, preview),
    displayTime,
  );
}

function resolvePreviewLabelForLocale(
  preview: GraphStagePreview | null | undefined,
  locale: AppLocale,
) {
  if (!preview) {
    return null;
  }

  if (preview.kind === "response" && preview.graphId === "equilibrium-share") {
    return copyText(locale, `preview favor = ${formatNumber(preview.point.x)}`, `預覽偏向值 = ${formatNumber(preview.point.x)}`);
  }

  if (preview.kind === "time") {
    return copyText(locale, `preview t = ${formatNumber(preview.time)} s`, `預覽 t = ${formatNumber(preview.time)} s`);
  }

  return null;
}

export function DynamicEquilibriumSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: DynamicEquilibriumSimulationProps) {
  const locale = useLocale() as AppLocale;
  const compareEnabled = Boolean(compare);
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const displayTime =
    graphPreview?.kind === "time"
      ? graphPreview.time
      : Math.min(time, DYNAMIC_EQUILIBRIUM_TOTAL_TIME);
  const liveFrame = resolveFrame(params, displayTime, graphPreview);
  const frameA = compare
    ? resolveFrame(
        compare.setupA,
        displayTime,
        previewedSetup === "a" ? graphPreview : null,
      )
    : null;
  const frameB = compare
    ? resolveFrame(
        compare.setupB,
        displayTime,
        previewedSetup === "b" ? graphPreview : null,
      )
    : null;
  const primaryFrame = compare
    ? previewedSetup === "a"
      ? frameA!
      : frameB!
    : liveFrame;
  const secondaryFrame = compare
    ? previewedSetup === "a"
      ? frameB!
      : frameA!
    : null;
  const primaryLabel = compare
    ? previewedSetup === "a"
      ? compare.labelA ?? localizeKnownCompareText(locale, "Setup A")
      : compare.labelB ?? localizeKnownCompareText(locale, "Setup B")
    : localizeKnownCompareText(locale, "Live");
  const secondaryLabel = compare
    ? previewedSetup === "a"
      ? compare.labelB ?? localizeKnownCompareText(locale, "Setup B")
      : compare.labelA ?? localizeKnownCompareText(locale, "Setup A")
    : null;
  const previewLabel = resolvePreviewLabelForLocale(graphPreview, locale);
  const overlayState = {
    dynamicExchange: overlayValues?.dynamicExchange ?? true,
    balanceBars: overlayValues?.balanceBars ?? true,
    targetBand: overlayValues?.targetBand ?? true,
  };
  const readoutRows = [
    { label: "R now", value: formatNumber(primaryFrame.currentReactantAmount) },
    { label: "P now", value: formatNumber(primaryFrame.currentProductAmount) },
    { label: "fwd", value: `${formatNumber(primaryFrame.forwardRate)}/s` },
    { label: "rev", value: `${formatNumber(primaryFrame.reverseRate)}/s` },
    { label: "|gap|", value: formatNumber(primaryFrame.rateGap) },
    { label: "P eq share", value: `${formatNumber(primaryFrame.equilibriumProductShare * 100)}%` },
  ];
  const noteLines = [
    primaryFrame.rateGap <= 0.12
      ? copyText(locale, "The rates are almost matched, but both are still non-zero. That is why equilibrium here is dynamic rather than stopped.", "正向與逆向速率幾乎相同，但兩者仍然不是零。這就是為什麼這裡的平衡是動態的，而不是完全停止。")
      : primaryFrame.netRate > 0
        ? copyText(locale, "Forward change is still winning, so the mixture is shifting toward more products.", "正向變化仍然較強，因此混合物正往較多生成物移動。")
        : copyText(locale, "Reverse change is still winning, so the mixture is shifting back toward more reactants.", "逆向變化仍然較強，因此混合物正往較多反應物回移。"),
    primaryFrame.productFavor >= 1.2
      ? copyText(locale, "The current conditions favor products once the system settles.", "目前條件在穩定後會偏向生成物。")
      : primaryFrame.productFavor <= 0.9
        ? copyText(locale, "The current conditions favor reactants once the system settles.", "目前條件在穩定後會偏向反應物。")
        : copyText(locale, "The current conditions only lean gently, so the settled mixture stays fairly mixed.", "目前條件只輕微偏向一側，因此穩定後的混合物仍然相當平均。"),
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(78,166,223,0.12),rgba(30,166,162,0.12))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              {copyText(
                locale,
                "Keep the reversible particle swap, the forward-versus-reverse rates, and the shift toward a new balance on one shared chemistry bench.",
                "把可逆粒子交換、正逆反應速率，以及朝向新平衡移動的過程都放在同一個共用化學實驗台上觀察。",
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
            {compareEnabled ? (
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
              <span className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-coral-700">
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

        {secondaryFrame ? (
          <ChemistryVessel
            x={BENCH_X + 12}
            y={BENCH_Y + 10}
            width={BENCH_WIDTH}
            height={BENCH_HEIGHT}
            title={copyText(locale, "Reversible bench", "可逆實驗台")}
            subtitle={`${secondaryLabel} ${copyText(locale, "ghost", "殘影")}`}
            time={displayTime}
            agitation={0.9 + secondaryFrame.forwardRate / 4.8}
            reactantCount={secondaryFrame.reactantParticleCount}
            productCount={secondaryFrame.productParticleCount}
            reactantAmount={secondaryFrame.currentReactantAmount}
            productAmount={secondaryFrame.currentProductAmount}
            reactantTone="teal"
            productTone="coral"
            showMixtureBars={overlayState.targetBand}
            showPulseCue={overlayState.dynamicExchange}
            successPulseCount={Math.max(3, Math.round(secondaryFrame.forwardRate * 2))}
            attemptPulseCount={Math.max(3, Math.round(secondaryFrame.reverseRate * 2))}
            successPulseTone="sky"
            attemptPulseTone="amber"
            showBalanceBars={overlayState.balanceBars}
            forwardRate={secondaryFrame.forwardRate}
            reverseRate={secondaryFrame.reverseRate}
            focusedOverlayId={focusedOverlayId}
            mixtureOverlayId="targetBand"
            pulseOverlayId="dynamicExchange"
            balanceOverlayId="balanceBars"
            chips={[
              {
                label: `${copyText(locale, "eq share", "平衡比例")} ${formatNumber(secondaryFrame.equilibriumProductShare * 100)}%`,
                tone: "coral",
                dashed: true,
              },
            ]}
            footerText={copyText(locale, "Ghost setup for compare mode.", "比較模式的殘影設定。")}
            muted
            dashed
          />
        ) : null}

        <ChemistryVessel
          x={BENCH_X}
          y={BENCH_Y}
          width={BENCH_WIDTH}
          height={BENCH_HEIGHT}
          title={copyText(locale, "Reversible bench", "可逆實驗台")}
          subtitle={`${primaryLabel}: ${copyText(locale, "even at equilibrium, particles keep changing both ways.", "即使在平衡時，粒子仍然會持續雙向交換。")}`}
          time={displayTime}
          agitation={0.9 + primaryFrame.forwardRate / 4.8}
          reactantCount={primaryFrame.reactantParticleCount}
          productCount={primaryFrame.productParticleCount}
          reactantAmount={primaryFrame.currentReactantAmount}
          productAmount={primaryFrame.currentProductAmount}
          reactantTone="teal"
          productTone="coral"
          showMotionCue={false}
          showMixtureBars={overlayState.targetBand}
          showPulseCue={overlayState.dynamicExchange}
          successPulseCount={Math.max(3, Math.round(primaryFrame.forwardRate * 2.2))}
          attemptPulseCount={Math.max(3, Math.round(primaryFrame.reverseRate * 2.2))}
          successPulseTone="sky"
          attemptPulseTone="amber"
          showBalanceBars={overlayState.balanceBars}
          forwardRate={primaryFrame.forwardRate}
          reverseRate={primaryFrame.reverseRate}
          focusedOverlayId={focusedOverlayId}
          mixtureOverlayId="targetBand"
          pulseOverlayId="dynamicExchange"
          balanceOverlayId="balanceBars"
          legendItems={[
            { label: copyText(locale, "Reactants", "反應物"), tone: "teal" },
            { label: copyText(locale, "Products", "生成物"), tone: "coral" },
            { label: copyText(locale, "Forward rate", "正向速率"), tone: "sky" },
            { label: copyText(locale, "Reverse rate", "逆向速率"), tone: "amber" },
          ]}
          chips={[
            {
              label: `${copyText(locale, "now", "目前")} ${formatNumber(primaryFrame.currentProductShare * 100)}% ${copyText(locale, "products", "生成物")}`,
              tone: "sky",
            },
            {
              label: `${copyText(locale, "target", "目標")} ${formatNumber(primaryFrame.equilibriumProductShare * 100)}% ${copyText(locale, "products", "生成物")}`,
              tone: "coral",
            },
          ]}
          footerText={copyText(locale, "Change the mixture or the product-favor slider, then watch the path to the new balance rather than treating equilibrium as a stop sign.", "改變混合物或生成物偏向滑桿，然後觀察系統走向新平衡的路徑，而不是把平衡當成停止標誌。")}
        />

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel} ${copyText(locale, "equilibrium readout", "平衡讀數")}` : copyText(locale, "Equilibrium readout", "平衡讀數")}
          setupLabel={primaryLabel}
          rows={readoutRows}
          noteLines={noteLines}
        />
      </svg>
    </section>
  );
}
