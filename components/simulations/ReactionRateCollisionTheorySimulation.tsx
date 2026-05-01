"use client";

import { useLocale } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import {
  buildReactionRateCollisionBenchState,
  formatNumber,
  REACTION_RATE_TOTAL_TIME,
  sampleReactionRateCollisionTheoryState,
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

type ReactionRateCollisionTheorySimulationProps = {
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
const BENCH_FIELD_WIDTH = BENCH_WIDTH - 150;
const BENCH_FIELD_HEIGHT = BENCH_HEIGHT - 118;
const CARD_X = 664;
const CARD_Y = 28;
const CARD_WIDTH = 214;

function buildPreviewSource(
  source: SimulationParams,
  preview: GraphStagePreview | null | undefined,
) {
  if (!preview || preview.kind !== "response") {
    return source;
  }

  if (preview.graphId === "rate-temperature" || preview.graphId === "success-temperature") {
    return {
      ...source,
      temperature: preview.point.x,
    };
  }

  if (preview.graphId === "rate-concentration") {
    return {
      ...source,
      concentration: preview.point.x,
    };
  }

  return source;
}

function resolveFrame(
  source: SimulationParams,
  preview: GraphStagePreview | null | undefined,
) {
  return sampleReactionRateCollisionTheoryState(buildPreviewSource(source, preview));
}

function resolvePreviewLabel(
  preview: GraphStagePreview | null | undefined,
  isZhHk: boolean,
) {
  if (!preview || preview.kind !== "response") {
    return null;
  }

  if (preview.graphId === "rate-temperature" || preview.graphId === "success-temperature") {
    return isZhHk
      ? `預覽 T = ${formatNumber(preview.point.x)}`
      : `preview T = ${formatNumber(preview.point.x)}`;
  }

  if (preview.graphId === "rate-concentration") {
    return isZhHk
      ? `預覽濃度 = ${formatNumber(preview.point.x)}`
      : `preview conc = ${formatNumber(preview.point.x)}`;
  }

  return null;
}

export function ReactionRateCollisionTheorySimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: ReactionRateCollisionTheorySimulationProps) {
  const locale = useLocale() as AppLocale;
  const isZhHk = locale === "zh-HK";
  const compareEnabled = Boolean(compare);
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const loopTime = Number.isFinite(time) ? time % REACTION_RATE_TOTAL_TIME : 0;
  const liveFrame = resolveFrame(params, graphPreview);
  const frameA = compare
    ? resolveFrame(compare.setupA, previewedSetup === "a" ? graphPreview : null)
    : null;
  const frameB = compare
    ? resolveFrame(compare.setupB, previewedSetup === "b" ? graphPreview : null)
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
      ? compare.labelA ?? (isZhHk ? "設定 A" : "Setup A")
      : compare.labelB ?? (isZhHk ? "設定 B" : "Setup B")
    : isZhHk
      ? "即時"
      : "Live";
  const secondaryLabel = compare
    ? previewedSetup === "a"
      ? compare.labelB ?? (isZhHk ? "設定 B" : "Setup B")
      : compare.labelA ?? (isZhHk ? "設定 A" : "Setup A")
    : null;
  const previewLabel = resolvePreviewLabel(graphPreview, isZhHk);
  const primaryBench = buildReactionRateCollisionBenchState(
    primaryFrame,
    loopTime,
    BENCH_FIELD_WIDTH,
    BENCH_FIELD_HEIGHT,
  );
  const secondaryBench = secondaryFrame
    ? buildReactionRateCollisionBenchState(
        secondaryFrame,
        loopTime,
        BENCH_FIELD_WIDTH,
        BENCH_FIELD_HEIGHT,
      )
    : null;
  const readoutRows = [
    { label: "T", value: formatNumber(primaryFrame.temperature) },
    { label: isZhHk ? "濃度" : "conc", value: formatNumber(primaryFrame.concentration) },
    { label: "Ea", value: formatNumber(primaryFrame.activationEnergy) },
    { label: "Eeff", value: formatNumber(primaryFrame.effectiveActivationEnergy) },
    {
      label: isZhHk ? "總碰撞" : "all hits",
      value: `${formatNumber(primaryFrame.attemptRate)}/s`,
    },
    {
      label: isZhHk ? "成功比率" : "success",
      value: `${formatNumber(primaryFrame.successFraction * 100)}%`,
    },
    {
      label: isZhHk ? "反應速率" : "rate",
      value: `${formatNumber(primaryFrame.successfulCollisionRate)}/s`,
    },
  ];
  const noteLines = [
    isZhHk
      ? primaryFrame.successFraction >= 0.5
        ? "目前已有足夠高比例的碰撞能跨過活化門檻，所以速率上升的主因是能量條件改善，而不只是盒子變得更擠。"
        : "大部分碰撞仍然未能通過門檻，因此單靠提高濃度，多半只會帶來更多失敗碰撞。"
      : primaryFrame.successFraction >= 0.5
        ? "A large enough share of collisions now clear the activation threshold, so rate rises for an energy reason rather than a crowding reason alone."
        : "Most collisions still fail the threshold test, so raising concentration alone would mostly create more unsuccessful hits.",
    isZhHk
      ? "成功的碰撞會在實驗台上短暫顯示為成鍵的產物對，讓你分辨哪些碰撞真的形成了產物。"
      : "Successful hits stay on the bench for a moment as bonded product pairs so you can see which collisions actually formed a product.",
    primaryFrame.catalyst
      ? isZhHk
        ? "催化劑會降低有效門檻，而不需要把粒子加熱得更劇烈。"
        : "The catalyst lowers the barrier without making the particles hotter."
      : isZhHk
        ? "沒有催化劑時，只能靠加熱來提升越過門檻的成功比例。"
        : "With no catalyst, heating has to do the barrier-clearing work.",
  ];
  const overlayState = {
    energyCue: overlayValues?.energyCue ?? true,
    thresholdGate: overlayValues?.thresholdGate ?? true,
    successfulCollisions: overlayValues?.successfulCollisions ?? true,
  };

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(240,171,60,0.12),rgba(241,102,89,0.12))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{isZhHk ? "反應速率與碰撞理論" : "Reaction rate and collision theory"}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              {isZhHk
                ? "把粒子運動、活化門檻與成功碰撞速率維持在同一個實驗台上，讓化學仍然透過可見的因果鏈來學習。"
                : "Keep particle motion, activation threshold, and successful-collision rate on the same bench so chemistry still teaches through one visible cause-and-effect loop."}
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
            title={isZhHk ? "碰撞實驗台" : "Collision bench"}
            subtitle={
              secondaryLabel
                ? `${secondaryLabel}${isZhHk ? " 參考影像" : " ghost"}`
                : ""
            }
            time={loopTime}
            agitation={secondaryFrame.temperature / 3.8}
            reactantCount={secondaryFrame.reactantParticleCount}
            productCount={secondaryFrame.bondedProductPairCount}
            particles={secondaryBench?.reactantParticles}
            bondedPairs={secondaryBench?.bondedPairs}
            productLabel={isZhHk ? "生成產物比例" : "Product-forming share"}
            showMotionCue={overlayState.energyCue}
            showPulseCue={overlayState.successfulCollisions}
            attemptPulseCount={secondaryFrame.attemptPulseCount}
            showMixtureBars={overlayState.thresholdGate}
            mixtureTitle={isZhHk ? "混合比例" : "Mixture"}
            reactantAmount={(1 - secondaryFrame.successFraction) * 10}
            productAmount={secondaryFrame.successFraction * 10}
            reactantLabel={isZhHk ? "未過門檻比例" : "Below-threshold share"}
            attemptPulseTone="amber"
            focusedOverlayId={focusedOverlayId}
            motionOverlayId="energyCue"
            mixtureOverlayId="thresholdGate"
            pulseOverlayId="successfulCollisions"
            legendItems={[
              {
                label: isZhHk ? "反應物單粒子" : "Reactant singles",
                tone: "teal",
              },
              {
                label: isZhHk ? "碰撞嘗試" : "Collision attempts",
                tone: "amber",
                dashed: true,
              },
              {
                label: isZhHk ? "已成鍵產物對" : "Bonded product pairs",
                tone: "coral",
              },
            ]}
            chips={[
              {
                label: `${isZhHk ? "門檻" : "barrier"} ${formatNumber(secondaryFrame.effectiveActivationEnergy)}`,
                tone: "amber",
                dashed: true,
              },
              {
                label: `${isZhHk ? "成鍵對數" : "bonded pairs"} ${secondaryFrame.bondedProductPairCount}`,
                tone: "coral",
                dashed: true,
              },
            ]}
            footerText={
              isZhHk
                ? "這是比較模式的參考設定。珊瑚色連結粒子代表成功碰撞後短暫形成的產物對。"
                : "Ghost setup for compare mode. Coral linked pairs are brief bonded products formed by successful collisions."
            }
            muted
            dashed
          />
        ) : null}

        <ChemistryVessel
          x={BENCH_X}
          y={BENCH_Y}
          width={BENCH_WIDTH}
          height={BENCH_HEIGHT}
          title={isZhHk ? "碰撞實驗台" : "Collision bench"}
          subtitle={
            isZhHk
              ? `${primaryLabel}：碰撞次數變多並不足夠，必須有足夠碰撞能跨過門檻，反應才會明顯加快。`
              : `${primaryLabel}: more collisions are not enough unless enough of them clear the barrier.`
          }
          time={loopTime}
          agitation={primaryFrame.temperature / 3.8}
          reactantCount={primaryFrame.reactantParticleCount}
          productCount={primaryFrame.bondedProductPairCount}
          particles={primaryBench.reactantParticles}
          bondedPairs={primaryBench.bondedPairs}
          productLabel={isZhHk ? "生成產物比例" : "Product-forming share"}
          showMotionCue={overlayState.energyCue}
          showPulseCue={overlayState.successfulCollisions}
          attemptPulseCount={primaryFrame.attemptPulseCount}
          showMixtureBars={overlayState.thresholdGate}
          mixtureTitle={isZhHk ? "混合比例" : "Mixture"}
          reactantAmount={(1 - primaryFrame.successFraction) * 10}
          productAmount={primaryFrame.successFraction * 10}
          reactantLabel={isZhHk ? "未過門檻比例" : "Below-threshold share"}
          attemptPulseTone="amber"
          focusedOverlayId={focusedOverlayId}
          motionOverlayId="energyCue"
          mixtureOverlayId="thresholdGate"
          pulseOverlayId="successfulCollisions"
          legendItems={[
            {
              label: isZhHk ? "青綠色反應物單粒子" : "Teal reactant singles",
              tone: "teal",
            },
            {
              label: isZhHk ? "琥珀色碰撞環" : "Amber attempt rings",
              tone: "amber",
              dashed: true,
            },
            {
              label: isZhHk ? "已成鍵產物對" : "Bonded product pairs",
              tone: "coral",
            },
          ]}
          chips={[
            {
              label: `${isZhHk ? "平均能量" : "avg energy"} ${formatNumber(primaryFrame.averageEnergy)}`,
              tone: "sky",
            },
            {
              label: `${isZhHk ? "成鍵對數" : "bonded pairs"} ${primaryFrame.bondedProductPairCount}`,
              tone: "coral",
            },
          ]}
          footerText={
            isZhHk
              ? "青綠色粒子代表反應物，琥珀色圓環代表碰撞嘗試，珊瑚色相連粒子則代表成功越過活化門檻後形成的產物對。"
              : "Teal singles are reactants, amber rings show collision attempts, and coral linked pairs are product dimers formed when a collision clears the activation barrier."
          }
        />

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={
            compareEnabled
              ? `${primaryLabel}${isZhHk ? " 速率讀數" : " rate readout"}`
              : isZhHk
                ? "速率讀數"
                : "Rate readout"
          }
          setupLabel={primaryLabel}
          rows={readoutRows}
          noteLines={noteLines}
        />
      </svg>
    </section>
  );
}
