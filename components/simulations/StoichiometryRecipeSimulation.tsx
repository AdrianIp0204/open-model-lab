"use client";

import { useLocale } from "next-intl";
import {
  buildChemistryParticles,
  formatNumber,
  sampleStoichiometryRecipeState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import type { AppLocale } from "@/i18n/routing";
import { copyText, getCompareSetupLabel, getVariantLabel } from "@/lib/i18n/copy-text";
import { SimulationReadoutCard } from "./SimulationReadoutCard";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type StoichiometryRecipeSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 920;
const HEIGHT = 420;
const BENCH_X = 24;
const BENCH_Y = 30;
const BENCH_WIDTH = 630;
const BENCH_HEIGHT = 320;
const CARD_X = 682;
const CARD_Y = 30;
const CARD_WIDTH = 214;

function overlayOpacity(
  focusedOverlayId: string | null | undefined,
  overlayId: string | undefined,
) {
  if (!overlayId || !focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.3;
}

function buildPreviewSource(
  source: SimulationParams,
  preview: GraphStagePreview | null | undefined,
) {
  if (!preview || preview.kind !== "response") {
    return source;
  }

  if (preview.graphId === "batches-vs-reactant-a") {
    return {
      ...source,
      reactantAAmount: Math.round(preview.point.x),
      percentYield: 100,
    };
  }

  if (preview.graphId === "batches-vs-reactant-b") {
    return {
      ...source,
      reactantBAmount: Math.round(preview.point.x),
      percentYield: 100,
    };
  }

  if (preview.graphId === "yield-vs-percent") {
    return {
      ...source,
      percentYield: Math.round(preview.point.x),
    };
  }

  return source;
}

function resolvePreviewLabel(
  preview: GraphStagePreview | null | undefined,
  locale: AppLocale,
) {
  if (!preview || preview.kind !== "response") {
    return null;
  }

  if (preview.graphId === "batches-vs-reactant-a") {
    return `${copyText(locale, "preview A =", "預覽 A =")} ${Math.round(preview.point.x)}`;
  }

  if (preview.graphId === "batches-vs-reactant-b") {
    return `${copyText(locale, "preview B =", "預覽 B =")} ${Math.round(preview.point.x)}`;
  }

  if (preview.graphId === "yield-vs-percent") {
    return `${copyText(locale, "preview yield =", "預覽產率 =")} ${Math.round(preview.point.x)}%`;
  }

  return null;
}

function resolveFrame(
  source: SimulationParams,
  preview: GraphStagePreview | null | undefined,
) {
  return sampleStoichiometryRecipeState(buildPreviewSource(source, preview));
}

function drawPill(
  x: number,
  y: number,
  label: string,
  {
    fill,
    stroke,
    text,
    dashed,
  }: {
    fill: string;
    stroke: string;
    text: string;
    dashed?: boolean;
  },
) {
  const width = Math.max(88, label.length * 6.4 + 18);

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        x={-width / 2}
        y="-12"
        width={width}
        height="24"
        rx="12"
        fill={fill}
        stroke={stroke}
        strokeDasharray={dashed ? "6 4" : undefined}
      />
      <text
        x="0"
        y="4"
        textAnchor="middle"
        className="text-[10px] font-semibold"
        fill={text}
      >
        {label}
      </text>
    </g>
  );
}

function renderTrayParticles(
  particles: ReturnType<typeof buildChemistryParticles>,
  {
    offsetX,
    offsetY,
    fill,
    stroke,
    shape = "circle",
    ghost = false,
  }: {
    offsetX: number;
    offsetY: number;
    fill: string;
    stroke: string;
    shape?: "circle" | "square";
    ghost?: boolean;
  },
) {
  return particles.map((particle) => {
    const px = offsetX + particle.x;
    const py = offsetY + particle.y;

    return (
      <g key={`${shape}-${particle.id}`}>
        <line
          x1={px - particle.streakX}
          y1={py - particle.streakY}
          x2={px}
          y2={py}
          stroke={fill}
          strokeOpacity={ghost ? 0.2 : 0.34}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={ghost ? "4 4" : undefined}
        />
        {shape === "square" ? (
          <rect
            x={px - particle.radius * 0.78}
            y={py - particle.radius * 0.78}
            width={particle.radius * 1.56}
            height={particle.radius * 1.56}
            rx="2.4"
            fill={fill}
            fillOpacity={ghost ? 0.42 : 0.9}
            stroke={stroke}
            strokeOpacity={0.24}
            strokeDasharray={ghost ? "4 3" : undefined}
          />
        ) : (
          <circle
            cx={px}
            cy={py}
            r={particle.radius * 0.78}
            fill={fill}
            fillOpacity={ghost ? 0.42 : 0.9}
            stroke={stroke}
            strokeOpacity={0.24}
            strokeDasharray={ghost ? "4 3" : undefined}
          />
        )}
      </g>
    );
  });
}

function SupplyTray({
  x,
  y,
  width,
  height,
  title,
  subtitle,
  particles,
  amountLabel,
  supportLabel,
  leftoverLabel,
  focusedOverlayId,
  overlayValues,
  overlayId,
  fill,
  stroke,
  borderTone,
  limitingLabel,
  ghost = false,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle: string;
  particles: ReturnType<typeof buildChemistryParticles>;
  amountLabel: string;
  supportLabel: string;
  leftoverLabel: string;
  focusedOverlayId?: string | null;
  overlayValues: {
    recipeCard: boolean;
    limitingCue: boolean;
    yieldGap: boolean;
  };
  overlayId?: string;
  fill: string;
  stroke: string;
  borderTone: string;
  limitingLabel?: string | null;
  ghost?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        width={width}
        height={height}
        rx="24"
        fill={ghost ? "rgba(255,255,255,0.44)" : "rgba(255,255,255,0.92)"}
        stroke={ghost ? "rgba(15,28,36,0.16)" : "rgba(15,28,36,0.1)"}
        strokeDasharray={ghost ? "8 6" : undefined}
      />
      {overlayValues.limitingCue && limitingLabel ? (
        <g opacity={overlayOpacity(focusedOverlayId, overlayId)}>
          <rect
            x="6"
            y="6"
            width={width - 12}
            height={height - 12}
            rx="20"
            fill="none"
            stroke={borderTone}
            strokeWidth="2.4"
            strokeDasharray={ghost ? "8 6" : undefined}
          />
          {drawPill(width - 50, 24, limitingLabel, {
            fill: "rgba(240,171,60,0.14)",
            stroke: "rgba(184,112,0,0.3)",
            text: "#8e5800",
            dashed: ghost,
          })}
        </g>
      ) : null}

      <text
        x="18"
        y="24"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.18em]"
      >
        {title}
      </text>
      <text x="18" y="46" className="fill-ink-950 text-[14px] font-semibold">
        {subtitle}
      </text>

      <rect
        x="16"
        y="60"
        width={width - 32}
        height={height - 114}
        rx="18"
        fill={ghost ? "rgba(248,251,252,0.48)" : "rgba(248,251,252,0.96)"}
        stroke="rgba(15,28,36,0.08)"
        strokeDasharray={ghost ? "8 6" : undefined}
      />
      {renderTrayParticles(particles, {
        offsetX: 22,
        offsetY: 66,
        fill,
        stroke,
        ghost,
      })}

      <text x="18" y={height - 40} className="fill-ink-500 text-[10px] font-semibold">
        {amountLabel}
      </text>
      <text x="18" y={height - 24} className="fill-ink-700 text-[10px]">
        {supportLabel}
      </text>
      <text x="18" y={height - 8} className="fill-ink-700 text-[10px]">
        {leftoverLabel}
      </text>
    </g>
  );
}

function ProductTray({
  x,
  y,
  width,
  height,
  particles,
  actualLabel,
  theoreticalLabel,
  gapLabel,
  percentYield,
  showYieldGap,
  focusedOverlayId,
  ghost = false,
  locale,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  particles: ReturnType<typeof buildChemistryParticles>;
  actualLabel: string;
  theoreticalLabel: string;
  gapLabel: string;
  percentYield: number;
  showYieldGap: boolean;
  focusedOverlayId?: string | null;
  ghost?: boolean;
  locale: AppLocale;
}) {
  const meterX = width - 34;
  const meterY = 62;
  const meterHeight = height - 114;
  const fillHeight = meterHeight * (percentYield / 100);

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        width={width}
        height={height}
        rx="24"
        fill={ghost ? "rgba(255,255,255,0.44)" : "rgba(255,255,255,0.92)"}
        stroke={ghost ? "rgba(15,28,36,0.16)" : "rgba(15,28,36,0.1)"}
        strokeDasharray={ghost ? "8 6" : undefined}
      />
      <text
        x="18"
        y="24"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.18em]"
      >
        {copyText(locale, "Product output", "產物輸出")}
      </text>
      <text x="18" y="46" className="fill-ink-950 text-[14px] font-semibold">
        {copyText(locale, "Actual batches vs ideal output", "實際批次與理想輸出")}
      </text>

      <rect
        x="16"
        y="60"
        width={width - 56}
        height={height - 114}
        rx="18"
        fill={ghost ? "rgba(248,251,252,0.48)" : "rgba(248,251,252,0.96)"}
        stroke="rgba(15,28,36,0.08)"
        strokeDasharray={ghost ? "8 6" : undefined}
      />
      {renderTrayParticles(particles, {
        offsetX: 22,
        offsetY: 66,
        fill: "rgba(241,102,89,0.88)",
        stroke: "rgba(159,58,44,0.26)",
        shape: "square",
        ghost,
      })}

      <g opacity={showYieldGap ? overlayOpacity(focusedOverlayId, "yieldGap") : 1}>
        <rect
          x={meterX}
          y={meterY}
          width="12"
          height={meterHeight}
          rx="6"
          fill="rgba(15,28,36,0.08)"
        />
        <rect
          x={meterX}
          y={meterY + meterHeight - fillHeight}
          width="12"
          height={fillHeight}
          rx="6"
          fill="rgba(241,102,89,0.72)"
        />
        {showYieldGap ? (
          <line
            x1={meterX - 6}
            x2={meterX + 18}
            y1={meterY}
            y2={meterY}
            stroke="rgba(78,166,223,0.84)"
            strokeDasharray={ghost ? "5 5" : "4 3"}
          />
        ) : null}
      </g>

      <text x="18" y={height - 40} className="fill-ink-500 text-[10px] font-semibold">
        {actualLabel}
      </text>
      <text x="18" y={height - 24} className="fill-ink-700 text-[10px]">
        {theoreticalLabel}
      </text>
      <text x="18" y={height - 8} className="fill-ink-700 text-[10px]">
        {gapLabel}
      </text>
    </g>
  );
}

function RecipeBench({
  x,
  y,
  width,
  height,
  title,
  subtitle,
  frame,
  time,
  overlayValues,
  focusedOverlayId,
  ghost = false,
  locale,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle: string;
  frame: ReturnType<typeof sampleStoichiometryRecipeState>;
  time: number;
  overlayValues: {
    recipeCard: boolean;
    limitingCue: boolean;
    yieldGap: boolean;
  };
  focusedOverlayId?: string | null;
  ghost?: boolean;
  locale: AppLocale;
}) {
  const trayWidth = 174;
  const trayHeight = 198;
  const productTrayWidth = 214;
  const trayY = 96;
  const trayAX = 18;
  const trayBX = 210;
  const productTrayX = 398;
  const aParticles = buildChemistryParticles({
    reactantCount: frame.reactantAParticleCount,
    time,
    agitation: 0.56,
    width: trayWidth - 32,
    height: trayHeight - 114,
  });
  const bParticles = buildChemistryParticles({
    reactantCount: frame.reactantBParticleCount,
    time: time + 1.6,
    agitation: 0.62,
    width: trayWidth - 32,
    height: trayHeight - 114,
  });
  const productParticles = buildChemistryParticles({
    reactantCount: 0,
    productCount: frame.productParticleCount,
    time: time + 3.2,
    agitation: 0.44,
    width: productTrayWidth - 56,
    height: trayHeight - 114,
  });

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        width={width}
        height={height}
        rx="30"
        fill={ghost ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.94)"}
        stroke={ghost ? "rgba(15,28,36,0.18)" : "rgba(15,28,36,0.1)"}
        strokeDasharray={ghost ? "8 6" : undefined}
      />
      <text
        x="20"
        y="24"
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
      >
        {title}
      </text>
      <text x="20" y="48" className="fill-ink-950 text-[15px] font-semibold">
        {subtitle}
      </text>

      {overlayValues.recipeCard ? (
        <g opacity={overlayOpacity(focusedOverlayId, "recipeCard")}>
          <rect
            x="150"
            y="16"
            width="324"
            height="56"
            rx="20"
            fill={ghost ? "rgba(255,253,247,0.42)" : "rgba(255,253,247,0.96)"}
            stroke="rgba(15,28,36,0.1)"
            strokeDasharray={ghost ? "8 6" : undefined}
          />
          <text
            x="168"
            y="38"
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            {copyText(locale, "Recipe card", "配方卡")}
          </text>
          <text x="168" y="58" className="fill-ink-950 text-[16px] font-semibold">
            {frame.recipeA} A + {frame.recipeB} B -&gt;{" "}
            {copyText(locale, "1 product batch", "1 批產物")}
          </text>
          {drawPill(
            418,
            45,
            locale === "zh-HK"
              ? `最多 ${formatNumber(frame.theoreticalBatches)} 批`
              : `max ${formatNumber(frame.theoreticalBatches)} batches`,
            {
            fill: "rgba(78,166,223,0.12)",
            stroke: "rgba(78,166,223,0.26)",
            text: "#1d6f9f",
            dashed: ghost,
          },
          )}
        </g>
      ) : null}

      <SupplyTray
        x={trayAX}
        y={trayY}
        width={trayWidth}
        height={trayHeight}
        title={copyText(locale, "Reactant A", "反應物 A")}
        subtitle={copyText(locale, "Recipe packets available", "可用配方份數")}
        particles={aParticles}
        amountLabel={
          locale === "zh-HK"
            ? `工作台上有 ${formatNumber(frame.reactantAAmount)} 份 A`
            : `${formatNumber(frame.reactantAAmount)} A on the bench`
        }
        supportLabel={
          locale === "zh-HK"
            ? `可支援 ${formatNumber(frame.maxBatchesFromA)} 批`
            : `supports ${formatNumber(frame.maxBatchesFromA)} batches`
        }
        leftoverLabel={
          locale === "zh-HK"
            ? `反應後剩餘：${formatNumber(frame.leftoverReactantA)} 份 A`
            : `left after run: ${formatNumber(frame.leftoverReactantA)} A`
        }
        focusedOverlayId={focusedOverlayId}
        overlayValues={overlayValues}
        overlayId="limitingCue"
        fill="rgba(30,166,162,0.88)"
        stroke="rgba(21,122,118,0.24)"
        borderTone="rgba(30,166,162,0.72)"
        limitingLabel={
          frame.limitingReagent === "reactant-a"
            ? copyText(locale, "limiting", "限制試劑")
            : null
        }
        ghost={ghost}
      />

      <SupplyTray
        x={trayBX}
        y={trayY}
        width={trayWidth}
        height={trayHeight}
        title={copyText(locale, "Reactant B", "反應物 B")}
        subtitle={copyText(locale, "Recipe packets available", "可用配方份數")}
        particles={bParticles}
        amountLabel={
          locale === "zh-HK"
            ? `工作台上有 ${formatNumber(frame.reactantBAmount)} 份 B`
            : `${formatNumber(frame.reactantBAmount)} B on the bench`
        }
        supportLabel={
          locale === "zh-HK"
            ? `可支援 ${formatNumber(frame.maxBatchesFromB)} 批`
            : `supports ${formatNumber(frame.maxBatchesFromB)} batches`
        }
        leftoverLabel={
          locale === "zh-HK"
            ? `反應後剩餘：${formatNumber(frame.leftoverReactantB)} 份 B`
            : `left after run: ${formatNumber(frame.leftoverReactantB)} B`
        }
        focusedOverlayId={focusedOverlayId}
        overlayValues={overlayValues}
        overlayId="limitingCue"
        fill="rgba(240,171,60,0.88)"
        stroke="rgba(142,88,0,0.24)"
        borderTone="rgba(240,171,60,0.72)"
        limitingLabel={
          frame.limitingReagent === "reactant-b"
            ? copyText(locale, "limiting", "限制試劑")
            : null
        }
        ghost={ghost}
      />

      <ProductTray
        x={productTrayX}
        y={trayY}
        width={productTrayWidth}
        height={trayHeight}
        particles={productParticles}
        actualLabel={
          locale === "zh-HK"
            ? `實際輸出：${formatNumber(frame.actualProductAmount)} 批`
            : `actual output: ${formatNumber(frame.actualProductAmount)} batches`
        }
        theoreticalLabel={
          locale === "zh-HK"
            ? `理想輸出：${formatNumber(frame.theoreticalProductAmount)} 批`
            : `ideal output: ${formatNumber(frame.theoreticalProductAmount)} batches`
        }
        gapLabel={
          locale === "zh-HK"
            ? `產率差距：${formatNumber(frame.yieldGap)} 批`
            : `yield gap: ${formatNumber(frame.yieldGap)} batches`
        }
        percentYield={frame.percentYield}
        showYieldGap={overlayValues.yieldGap}
        focusedOverlayId={focusedOverlayId}
        ghost={ghost}
        locale={locale}
      />

      {overlayValues.limitingCue && frame.limitingReagent === "balanced" ? (
        <g opacity={overlayOpacity(focusedOverlayId, "limitingCue")}>
          {drawPill(width / 2, height - 24, copyText(locale, "balanced supplies", "供應平衡"), {
            fill: "rgba(78,166,223,0.12)",
            stroke: "rgba(78,166,223,0.26)",
            text: "#1d6f9f",
            dashed: ghost,
          })}
        </g>
      ) : null}
    </g>
  );
}

export function StoichiometryRecipeSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: StoichiometryRecipeSimulationProps) {
  const locale = useLocale() as AppLocale;
  const compareEnabled = Boolean(compare);
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
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
      ? compare.labelA ?? getCompareSetupLabel(locale, "a")
      : compare.labelB ?? getCompareSetupLabel(locale, "b")
    : getVariantLabel(locale, "live");
  const secondaryLabel = compare
    ? previewedSetup === "a"
      ? compare.labelB ?? getCompareSetupLabel(locale, "b")
      : compare.labelA ?? getCompareSetupLabel(locale, "a")
    : null;
  const previewLabel = resolvePreviewLabel(graphPreview, locale);
  const overlayState = {
    recipeCard: overlayValues?.recipeCard ?? true,
    limitingCue: overlayValues?.limitingCue ?? true,
    yieldGap: overlayValues?.yieldGap ?? true,
  };
  const readoutRows = [
    { label: copyText(locale, "recipe", "配方"), value: `${primaryFrame.recipeA}A + ${primaryFrame.recipeB}B` },
    { label: copyText(locale, "A packets", "A 份數"), value: formatNumber(primaryFrame.reactantAAmount) },
    { label: copyText(locale, "B packets", "B 份數"), value: formatNumber(primaryFrame.reactantBAmount) },
    { label: copyText(locale, "max batches", "最多批次"), value: formatNumber(primaryFrame.theoreticalBatches) },
    {
      label: copyText(locale, "limiting", "限制試劑"),
      value:
        primaryFrame.limitingReagent === "balanced"
          ? copyText(locale, "balanced", "平衡")
          : primaryFrame.limitingReagent === "reactant-a"
            ? copyText(locale, "A first", "A 先耗盡")
            : copyText(locale, "B first", "B 先耗盡"),
    },
    {
      label: copyText(locale, "actual output", "實際輸出"),
      value:
        locale === "zh-HK"
          ? `${formatNumber(primaryFrame.actualProductAmount)} 批`
          : `${formatNumber(primaryFrame.actualProductAmount)} batches`,
    },
    {
      label: copyText(locale, "left A / B", "剩餘 A / B"),
      value: `${formatNumber(primaryFrame.leftoverReactantA)} / ${formatNumber(primaryFrame.leftoverReactantB)}`,
    },
  ];
  const noteLines = [
    primaryFrame.limitingReagent === "balanced"
      ? copyText(
          locale,
          "The available packets match the recipe closely, so neither side caps the run first.",
          "現有份數和配方相當貼近，所以兩邊都不會先限制反應。",
        )
      : primaryFrame.limitingReagent === "reactant-a"
        ? copyText(
            locale,
            "A is the gating supply, so more B alone cannot raise the batch count yet.",
            "A 是限制供應，所以單獨增加 B 暫時無法提高批次數。",
          )
        : copyText(
            locale,
            "B is the gating supply, so more A alone cannot raise the batch count yet.",
            "B 是限制供應，所以單獨增加 A 暫時無法提高批次數。",
          ),
    primaryFrame.percentYield >= 100
      ? copyText(locale, "Actual output meets the theoretical batch count.", "實際輸出已達到理論批次數。")
      : locale === "zh-HK"
        ? `產率低於理想值，所以可形成批次中只有 ${formatNumber(primaryFrame.percentYield)}% 能完成。`
        : `Yield stays below ideal, so only ${formatNumber(primaryFrame.percentYield)}% of the possible batches finish.`,
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(240,171,60,0.12),rgba(78,166,223,0.12))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{copyText(locale, "Stoichiometry recipe bench", "化學計量配方工作台")}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              {copyText(
                locale,
                "Keep the recipe card, the two reactant supplies, and the actual product output on one bench so ratios, limiting packets, and yield never drift into detached worksheet algebra.",
                "把配方卡、兩種反應物供應和實際產物輸出放在同一個工作台上，讓比例、限制份數和產率不會脫離實際情境而變成抽離的工作紙代數。",
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
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.6)" />

        {secondaryFrame ? (
          <RecipeBench
            x={BENCH_X + 10}
            y={BENCH_Y + 8}
            width={BENCH_WIDTH}
            height={BENCH_HEIGHT}
            title={copyText(locale, "Reaction recipe", "反應配方")}
            subtitle={
              locale === "zh-HK"
                ? `${secondaryLabel} 淡化對照`
                : `${secondaryLabel} ghost`
            }
            frame={secondaryFrame}
            time={time + 1.4}
            overlayValues={overlayState}
            focusedOverlayId={focusedOverlayId}
            ghost
            locale={locale}
          />
        ) : null}

        <RecipeBench
          x={BENCH_X}
          y={BENCH_Y}
          width={BENCH_WIDTH}
          height={BENCH_HEIGHT}
          title={copyText(locale, "Reaction recipe", "反應配方")}
          subtitle={
            locale === "zh-HK"
              ? `${primaryLabel}：只有當兩種供應都符合同一張配方卡時，才會形成完整批次。`
              : `${primaryLabel}: full batches only happen when both supplies satisfy the same recipe card.`
          }
          frame={primaryFrame}
          time={time}
          overlayValues={overlayState}
          focusedOverlayId={focusedOverlayId}
          locale={locale}
        />

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={copyText(locale, "Recipe readout", "配方讀數")}
          setupLabel={compareEnabled ? primaryLabel : null}
          rows={readoutRows}
          noteLines={noteLines}
        />
      </svg>
    </section>
  );
}
