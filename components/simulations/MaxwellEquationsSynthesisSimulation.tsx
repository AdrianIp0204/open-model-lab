"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  MAXWELL_EQUATIONS_SYNTHESIS_MAX_CYCLE_RATE,
  MAXWELL_EQUATIONS_SYNTHESIS_MAX_STRENGTH,
  clamp,
  formatMeasurement,
  formatNumber,
  sampleMaxwellEquationsSynthesisState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
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

type MaxwellEquationsSynthesisSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type TranslationFunction = ReturnType<typeof useTranslations>;

function strengthRatio(value: number) {
  return clamp(Math.abs(value) / MAXWELL_EQUATIONS_SYNTHESIS_MAX_STRENGTH, 0, 1);
}

function fieldTone(value: number) {
  if (value > 0.06) {
    return {
      stroke: "#f16659",
      fill: "rgba(241,102,89,0.14)",
      text: "#b5433b",
    };
  }

  if (value < -0.06) {
    return {
      stroke: "#4ea6df",
      fill: "rgba(78,166,223,0.14)",
      text: "#1d6f9f",
    };
  }

  return {
    stroke: "rgba(15,28,36,0.36)",
    fill: "rgba(15,28,36,0.08)",
    text: "#55636b",
  };
}

function circulationTone(direction: "counterclockwise" | "clockwise" | "none") {
  if (direction === "counterclockwise") {
    return "#1ea6a2";
  }

  if (direction === "clockwise") {
    return "#f0ab3c";
  }

  return "rgba(15,28,36,0.42)";
}

function overlayCardClasses(emphasized: boolean) {
  return emphasized
    ? "border-sky-500/35 bg-white shadow-[0_16px_36px_rgba(78,166,223,0.12)]"
    : "border-line bg-white/88";
}

function renderMagneticGlyph(
  value: number,
  x: number,
  y: number,
  radius = 10,
) {
  const tone = fieldTone(value);

  return (
    <g>
      <circle cx={x} cy={y} r={radius} fill="rgba(255,253,247,0.98)" stroke={tone.stroke} strokeWidth="2" />
      {value > 0.06 ? (
        <>
          <circle cx={x} cy={y} r="3.2" fill={tone.stroke} />
          <circle cx={x} cy={y} r="1.3" fill="rgba(255,253,247,0.98)" />
        </>
      ) : value < -0.06 ? (
        <>
          <line
            x1={x - 3.5}
            y1={y - 3.5}
            x2={x + 3.5}
            y2={y + 3.5}
            stroke={tone.stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1={x + 3.5}
            y1={y - 3.5}
            x2={x - 3.5}
            y2={y + 3.5}
            stroke={tone.stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : (
        <circle cx={x} cy={y} r="3.2" fill="none" stroke={tone.stroke} strokeWidth="1.8" />
      )}
    </g>
  );
}

function TangentialLoop({
  direction,
  strength,
  color,
}: {
  direction: "counterclockwise" | "clockwise" | "none";
  strength: number;
  color: string;
}) {
  const opacity = direction === "none" ? 0.4 : 1;
  const strokeWidth = 1.8 + strengthRatio(strength) * 2.2;
  const sign = direction === "clockwise" ? 1 : -1;

  return (
    <g opacity={opacity}>
      <circle
        cx="78"
        cy="52"
        r="28"
        fill="none"
        stroke="rgba(15,28,36,0.1)"
        strokeDasharray="4 5"
      />
      <SvgArrow
        x1={50}
        y1={52 + sign * 10}
        x2={50}
        y2={52 - sign * 10}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <SvgArrow
        x1={78 - sign * 10}
        y1={24}
        x2={78 + sign * 10}
        y2={24}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <SvgArrow
        x1={106}
        y1={52 - sign * 10}
        x2={106}
        y2={52 + sign * 10}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <SvgArrow
        x1={78 + sign * 10}
        y1={80}
        x2={78 - sign * 10}
        y2={80}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </g>
  );
}

function MetricLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[11px]">
      <span className="font-semibold uppercase tracking-[0.14em] text-ink-500">{label}</span>
      <span className="text-right font-semibold text-ink-900">{value}</span>
    </div>
  );
}

function CompareMetricLine({
  label,
  valueA,
  valueB,
  labelA,
  labelB,
}: {
  label: string;
  valueA: string;
  valueB: string;
  labelA: string;
  labelB: string;
}) {
  return (
    <div className="space-y-1 rounded-2xl border border-line bg-white/88 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">{label}</p>
      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full border border-sky-500/28 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
          {labelA}: {valueA}
        </span>
        <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold text-ink-700">
          {labelB}: {valueB}
        </span>
      </div>
    </div>
  );
}

function EquationCard({
  eyebrow,
  title,
  description,
  guide,
  overlayId,
  focusedOverlayId,
  guideVisible,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  guide: string;
  overlayId: string;
  focusedOverlayId?: string | null;
  guideVisible: boolean;
  children: ReactNode;
}) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, overlayId, 0.56);
  const emphasized = focusedOverlayId === overlayId;

  return (
    <section
      className={[
        "rounded-[16px] border px-2 py-2 transition-[opacity,box-shadow,border-color] duration-150 lg:rounded-[22px] lg:px-3 lg:py-3",
        overlayCardClasses(emphasized),
      ].join(" ")}
      style={{ opacity }}
    >
      <p className="lab-label">{eyebrow}</p>
      <h3 className="mt-0.5 text-[0.74rem] font-semibold leading-snug text-ink-950 sm:text-[0.8rem] lg:text-[1.02rem]">{title}</h3>
      <p className="mt-1 hidden text-xs leading-5 text-ink-700 lg:block">{description}</p>
      <div className="mt-1.5 lg:mt-3">{children}</div>
      {guideVisible ? (
        <p className="mt-3 hidden rounded-2xl bg-paper px-3 py-2 text-[11px] leading-5 text-ink-700 lg:block">
          {guide}
        </p>
      ) : null}
    </section>
  );
}

function GaussElectricVisual({
  chargeSource,
  electricFluxDirection,
  fluxLabel,
}: {
  chargeSource: number;
  electricFluxDirection: "outward" | "inward" | "balanced";
  fluxLabel: string;
}) {
  const tone = fieldTone(chargeSource);
  const ratio = strengthRatio(chargeSource);
  const sign = electricFluxDirection === "inward" ? -1 : 1;
  const arrowLength = 14 + ratio * 12;
  const angles = [-90, -30, 30, 90, 150, 210];

  return (
    <svg viewBox="0 0 156 104" className="h-[54px] w-full sm:h-[60px] lg:h-[108px]" aria-hidden="true">
      <circle cx="78" cy="52" r="18" fill={tone.fill} stroke={tone.stroke} strokeWidth="2.5" />
      <text x="78" y="57" textAnchor="middle" className="fill-ink-950 text-[15px] font-semibold">
        {chargeSource > 0.06 ? "+" : chargeSource < -0.06 ? "-" : "0"}
      </text>
      <circle
        cx="78"
        cy="52"
        r="34"
        fill="none"
        stroke="rgba(15,28,36,0.08)"
        strokeDasharray="5 6"
      />
      {angles.map((angle) => {
        const radians = (angle * Math.PI) / 180;
        const innerRadius = 28;
        const outerRadius = innerRadius + arrowLength * sign;
        const x1 = 78 + Math.cos(radians) * innerRadius;
        const y1 = 52 + Math.sin(radians) * innerRadius;
        const x2 = 78 + Math.cos(radians) * outerRadius;
        const y2 = 52 + Math.sin(radians) * outerRadius;

        if (electricFluxDirection === "balanced") {
          return (
            <circle
              key={angle}
              cx={x1}
              cy={y1}
              r="2.6"
              fill="rgba(15,28,36,0.32)"
            />
          );
        }

        return (
          <SvgArrow
            key={angle}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={tone.stroke}
            strokeWidth={2 + ratio * 1.2}
          />
        );
      })}
      <text x="78" y="94" textAnchor="middle" className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]">
        {fluxLabel}
      </text>
    </svg>
  );
}

function GaussMagneticVisual({
  closedLoopStrength,
  netZeroLabel,
  closedLoopLabel,
}: {
  closedLoopStrength: number;
  netZeroLabel: string;
  closedLoopLabel: string;
}) {
  const loopStroke = 2 + strengthRatio(closedLoopStrength) * 2.6;

  return (
    <svg viewBox="0 0 156 104" className="h-[54px] w-full sm:h-[60px] lg:h-[108px]" aria-hidden="true">
      <circle cx="78" cy="52" r="32" fill="rgba(255,253,247,0.96)" stroke="rgba(15,28,36,0.14)" />
      <path
        d="M 26 52 C 44 20, 112 20, 130 52"
        fill="none"
        stroke="#4ea6df"
        strokeWidth={loopStroke}
        strokeLinecap="round"
      />
      <path
        d="M 130 52 C 112 84, 44 84, 26 52"
        fill="none"
        stroke="#4ea6df"
        strokeWidth={loopStroke}
        strokeLinecap="round"
      />
      {renderMagneticGlyph(closedLoopStrength, 56, 36, 8.5)}
      {renderMagneticGlyph(-closedLoopStrength, 100, 68, 8.5)}
      <text x="78" y="57" textAnchor="middle" className="fill-ink-950 text-[12px] font-semibold">
        {netZeroLabel}
      </text>
      <text x="78" y="94" textAnchor="middle" className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]">
        {closedLoopLabel}
      </text>
    </svg>
  );
}

function AmpereMaxwellVisual({
  conductionCurrent,
  electricChangeInstant,
  bCirculationDirection,
  bCirculation,
  loopText,
}: {
  conductionCurrent: number;
  electricChangeInstant: number;
  bCirculationDirection: "counterclockwise" | "clockwise" | "none";
  bCirculation: number;
  loopText: string;
}) {
  const currentToneColor = fieldTone(conductionCurrent).stroke;
  const displacementToneColor = fieldTone(electricChangeInstant).stroke;
  const currentArrowLength = 14 + strengthRatio(conductionCurrent) * 20;
  const currentSign = conductionCurrent >= 0 ? -1 : 1;
  const displacementHeight = 12 + strengthRatio(electricChangeInstant) * 26;

  return (
    <svg viewBox="0 0 156 104" className="h-[54px] w-full sm:h-[60px] lg:h-[108px]" aria-hidden="true">
      <TangentialLoop
        direction={bCirculationDirection}
        strength={bCirculation}
        color={circulationTone(bCirculationDirection)}
      />
      <circle cx="78" cy="52" r="14" fill="rgba(255,253,247,0.96)" stroke="rgba(15,28,36,0.14)" />
      <SvgArrow
        x1={78}
        y1={52 + currentSign * currentArrowLength}
        x2={78}
        y2={52 - currentSign * currentArrowLength}
        stroke={currentToneColor}
        strokeWidth={3}
      />
      <line
        x1={118}
        x2={118}
        y1={52 - displacementHeight}
        y2={52 + displacementHeight}
        stroke={displacementToneColor}
        strokeWidth="3"
        strokeDasharray="7 5"
        strokeLinecap="round"
      />
      <text x="78" y="16" textAnchor="middle" className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]">
        I_enc
      </text>
      <text x="118" y="16" textAnchor="middle" className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]">
        dPhi_E/dt
      </text>
      <text x="78" y="94" textAnchor="middle" className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]">
        {loopText}
      </text>
    </svg>
  );
}

function FaradayVisual({
  magneticFluxChange,
  eCirculationDirection,
  eCirculation,
  magneticChangeLabel,
  loopText,
}: {
  magneticFluxChange: number;
  eCirculationDirection: "counterclockwise" | "clockwise" | "none";
  eCirculation: number;
  magneticChangeLabel: string;
  loopText: string;
}) {
  return (
    <svg viewBox="0 0 156 104" className="h-[54px] w-full sm:h-[60px] lg:h-[108px]" aria-hidden="true">
      <TangentialLoop
        direction={eCirculationDirection}
        strength={eCirculation}
        color={circulationTone(eCirculationDirection)}
      />
      {renderMagneticGlyph(magneticFluxChange, 78, 52, 12)}
      <text x="78" y="16" textAnchor="middle" className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]">
        {magneticChangeLabel}
      </text>
      <text x="78" y="94" textAnchor="middle" className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]">
        {loopText}
      </text>
    </svg>
  );
}

function WaveBridgeVisual({
  electricChangeInstant,
  magneticFluxChange,
  waveSignedCue,
  waveStateLabel,
  lightCueLabel,
  waveCueText,
}: {
  electricChangeInstant: number;
  magneticFluxChange: number;
  waveSignedCue: number;
  waveStateLabel: "strong" | "partial" | "absent" | "misaligned";
  lightCueLabel: string;
  waveCueText: string;
}) {
  const electricTone = fieldTone(electricChangeInstant).stroke;
  const bridgeTone =
    waveStateLabel === "misaligned"
      ? "#f16659"
      : waveStateLabel === "absent"
        ? "rgba(15,28,36,0.34)"
        : "#1ea6a2";
  const bridgeOpacity =
    waveStateLabel === "strong" ? 1 : waveStateLabel === "partial" ? 0.78 : 0.48;
  const eHeight = 16 + strengthRatio(electricChangeInstant) * 22;
  const propagationLength = 58 + strengthRatio(waveSignedCue) * 34;

  return (
    <svg viewBox="0 0 328 106" className="h-[58px] w-full sm:h-[64px] lg:h-[112px]" aria-hidden="true">
      <rect x="8" y="10" width="312" height="86" rx="24" fill="rgba(255,253,247,0.98)" stroke="rgba(15,28,36,0.1)" />
      <SvgArrow
        x1={54}
        y1={76}
        x2={54}
        y2={76 - eHeight}
        stroke={electricTone}
        strokeWidth={3}
      />
      <text x="54" y="28" textAnchor="middle" className="fill-teal-700 text-[10px] font-semibold uppercase tracking-[0.14em]">
        dE/dt
      </text>
      {renderMagneticGlyph(magneticFluxChange, 124, 54, 12)}
      <text x="124" y="28" textAnchor="middle" className="fill-sky-700 text-[10px] font-semibold uppercase tracking-[0.14em]">
        dB/dt
      </text>
      <SvgArrow
        x1={174}
        y1={54}
        x2={174 + propagationLength}
        y2={54}
        stroke={bridgeTone}
        strokeWidth={3.2}
        opacity={bridgeOpacity}
      />
      <path
        d="M 178 74 C 194 60, 210 88, 226 74 S 258 60, 274 74"
        fill="none"
        stroke={bridgeTone}
        strokeWidth="3"
        strokeLinecap="round"
        opacity={bridgeOpacity}
      />
      <text x="244" y="30" textAnchor="middle" className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]">
        {lightCueLabel}
      </text>
      <text x="244" y="89" textAnchor="middle" className="fill-ink-700 text-[11px] font-semibold">
        {waveCueText}
      </text>
    </svg>
  );
}

function resolveLoopText(
  t: TranslationFunction,
  direction: "counterclockwise" | "clockwise" | "none",
) {
  if (direction === "counterclockwise") return t("loop.counterclockwise");
  if (direction === "clockwise") return t("loop.clockwise");
  return t("loop.nearZero");
}

function resolveChargeText(
  t: TranslationFunction,
  direction: "outward" | "inward" | "balanced",
) {
  if (direction === "outward") return t("charge.outwardFlux");
  if (direction === "inward") return t("charge.inwardFlux");
  return t("charge.balancedFlux");
}

function resolveWaveCueText(
  t: TranslationFunction,
  state: "strong" | "partial" | "absent" | "misaligned",
) {
  if (state === "strong") return t("wave.strongLightCue");
  if (state === "partial") return t("wave.partialLightCue");
  if (state === "misaligned") return t("wave.misalignedFieldCue");
  return t("wave.noLightCue");
}

export function MaxwellEquationsSynthesisSimulation({
  concept,
  params,
  time,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: MaxwellEquationsSynthesisSimulationProps) {
  void setParam;
  const t = useTranslations("MaxwellEquationsSynthesisSimulation");
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  const activeFrame = sampleMaxwellEquationsSynthesisState(params, displayTime);
  const frameA = compare ? sampleMaxwellEquationsSynthesisState(compare.setupA, displayTime) : null;
  const frameB = compare ? sampleMaxwellEquationsSynthesisState(compare.setupB, displayTime) : null;
  const {
    compareEnabled,
    primaryFrame,
    primaryLabel,
    secondaryLabel,
  } = resolveCompareScene({
    compare,
    graphPreview,
    activeFrame,
    frameA,
    frameB,
    liveLabel: t("labels.liveSynthesis"),
  });
  const previewBadge = graphPreview?.kind === "time" ? (
    <SimulationPreviewBadge tone="sky">
      {t("preview.time", { time: formatNumber(displayTime) })}
    </SimulationPreviewBadge>
  ) : null;
  const primaryChargeText = resolveChargeText(t, primaryFrame.electricFluxDirection);
  const primaryBCirculationText = resolveLoopText(t, primaryFrame.bCirculationDirection);
  const primaryECirculationText = resolveLoopText(t, primaryFrame.eCirculationDirection);
  const primaryWaveCueText = resolveWaveCueText(t, primaryFrame.waveStateLabel);
  const showChargeGuide = overlayValues?.chargeSurface ?? true;
  const showNoMonopolesGuide = overlayValues?.noMonopoles ?? true;
  const showFaradayGuide = overlayValues?.faradayLoop ?? true;
  const showAmpereGuide = overlayValues?.ampereMaxwell ?? true;
  const showLightGuide = overlayValues?.lightBridge ?? true;

  return (
    <SimulationSceneCard
      title={concept.title}
      description={t("scene.description")}
      headerClassName="bg-[linear-gradient(135deg,rgba(78,166,223,0.1),rgba(30,166,162,0.08),rgba(241,102,89,0.1))]"
      headerAside={
        <>
          {previewBadge}
          <CompareLegend primaryLabel={primaryLabel} secondaryLabel={secondaryLabel} />
          <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-600">
            {primaryLabel}
          </span>
        </>
      }
      compactHeaderOnMobile
    >
      <div className="grid gap-2 p-2 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-3 lg:p-4">
        <div
          role="img"
          aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
          className="grid gap-2 lg:gap-3"
        >
          <div className="grid grid-cols-2 gap-2 lg:gap-3">
            <EquationCard
              eyebrow={t("cards.gaussE.eyebrow")}
              title={t("cards.gaussE.title")}
              description={t("cards.gaussE.description")}
              guide={t("cards.gaussE.guide")}
              overlayId="chargeSurface"
              focusedOverlayId={focusedOverlayId}
              guideVisible={showChargeGuide}
            >
              <div className="grid gap-2 lg:grid-cols-[8.5rem_minmax(0,1fr)] lg:items-center">
                <GaussElectricVisual
                  chargeSource={primaryFrame.chargeSource}
                  electricFluxDirection={primaryFrame.electricFluxDirection}
                  fluxLabel={primaryChargeText}
                />
                <div className="hidden space-y-2 lg:block">
                  <MetricLine
                    label="Qenc"
                    value={formatMeasurement(primaryFrame.chargeSource, "arb.")}
                  />
                  <MetricLine
                    label="∮ E · dA"
                    value={formatMeasurement(primaryFrame.electricFlux, "arb.")}
                  />
                  <MetricLine
                    label={t("metrics.reading")}
                    value={primaryChargeText}
                  />
                </div>
              </div>
            </EquationCard>

            <EquationCard
              eyebrow={t("cards.gaussB.eyebrow")}
              title={t("cards.gaussB.title")}
              description={t("cards.gaussB.description")}
              guide={t("cards.gaussB.guide")}
              overlayId="noMonopoles"
              focusedOverlayId={focusedOverlayId}
              guideVisible={showNoMonopolesGuide}
            >
              <div className="grid gap-2 lg:grid-cols-[8.5rem_minmax(0,1fr)] lg:items-center">
                <GaussMagneticVisual
                  closedLoopStrength={primaryFrame.closedLoopStrength}
                  netZeroLabel={t("sceneLabels.netZero")}
                  closedLoopLabel={t("sceneLabels.closedBLoops")}
                />
                <div className="hidden space-y-2 lg:block">
                  <MetricLine
                    label={t("metrics.netBFlux")}
                    value={formatMeasurement(primaryFrame.magneticNetFlux, "arb.")}
                  />
                  <MetricLine
                    label={t("metrics.closedLoops")}
                    value={formatMeasurement(primaryFrame.closedLoopStrength, "arb.")}
                  />
                  <MetricLine
                    label={t("metrics.reading")}
                    value={t("values.fieldLinesClose")}
                  />
                </div>
              </div>
            </EquationCard>

            <EquationCard
              eyebrow={t("cards.faraday.eyebrow")}
              title={t("cards.faraday.title")}
              description={t("cards.faraday.description")}
              guide={t("cards.faraday.guide")}
              overlayId="faradayLoop"
              focusedOverlayId={focusedOverlayId}
              guideVisible={showFaradayGuide}
            >
              <div className="grid gap-2 lg:grid-cols-[8.5rem_minmax(0,1fr)] lg:items-center">
                <FaradayVisual
                  magneticFluxChange={primaryFrame.magneticFluxChange}
                  eCirculationDirection={primaryFrame.eCirculationDirection}
                  eCirculation={primaryFrame.eCirculation}
                  magneticChangeLabel={t("sceneLabels.changingB")}
                  loopText={primaryECirculationText}
                />
                <div className="hidden space-y-2 lg:block">
                  <MetricLine
                    label="dPhi_B/dt"
                    value={formatMeasurement(primaryFrame.magneticFluxChange, "arb.")}
                  />
                  <MetricLine
                    label="∮ E · dl"
                    value={formatMeasurement(primaryFrame.eCirculation, "arb.")}
                  />
                  <MetricLine
                    label={t("metrics.reading")}
                    value={primaryECirculationText}
                  />
                </div>
              </div>
            </EquationCard>

            <EquationCard
              eyebrow={t("cards.ampereMaxwell.eyebrow")}
              title={t("cards.ampereMaxwell.title")}
              description={t("cards.ampereMaxwell.description")}
              guide={t("cards.ampereMaxwell.guide")}
              overlayId="ampereMaxwell"
              focusedOverlayId={focusedOverlayId}
              guideVisible={showAmpereGuide}
            >
              <div className="grid gap-2 lg:grid-cols-[8.5rem_minmax(0,1fr)] lg:items-center">
                <AmpereMaxwellVisual
                  conductionCurrent={primaryFrame.conductionCurrent}
                  electricChangeInstant={primaryFrame.electricChangeInstant}
                  bCirculationDirection={primaryFrame.bCirculationDirection}
                  bCirculation={primaryFrame.bCirculation}
                  loopText={primaryBCirculationText}
                />
                <div className="hidden space-y-2 lg:block">
                  <MetricLine
                    label="Ienc"
                    value={formatMeasurement(primaryFrame.bCurrentContribution, "arb.")}
                  />
                  <MetricLine
                    label="dPhi_E/dt"
                    value={formatMeasurement(primaryFrame.bDisplacementContribution, "arb.")}
                  />
                  <MetricLine
                    label="∮ B · dl"
                    value={formatMeasurement(primaryFrame.bCirculation, "arb.")}
                  />
                </div>
              </div>
            </EquationCard>
          </div>

          <EquationCard
            eyebrow={t("cards.unification.eyebrow")}
            title={t("cards.unification.title")}
            description={t("cards.unification.description")}
            guide={t("cards.unification.guide")}
            overlayId="lightBridge"
            focusedOverlayId={focusedOverlayId}
            guideVisible={showLightGuide}
          >
            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_12rem] lg:items-center lg:gap-3">
              <WaveBridgeVisual
                electricChangeInstant={primaryFrame.electricChangeInstant}
                magneticFluxChange={primaryFrame.magneticFluxChange}
                waveSignedCue={primaryFrame.waveSignedCue}
                waveStateLabel={primaryFrame.waveStateLabel}
                lightCueLabel={t("metrics.lightCue")}
                waveCueText={primaryWaveCueText}
              />
              <div className="hidden space-y-2 lg:block">
                <MetricLine
                  label={t("metrics.cycleRate")}
                  value={formatMeasurement(primaryFrame.cycleRate, "Hz")}
                />
                <MetricLine
                  label={t("metrics.period")}
                  value={formatMeasurement(primaryFrame.period, "s")}
                />
                <MetricLine
                  label={t("metrics.waveCue")}
                  value={`${formatMeasurement(primaryFrame.waveCueMagnitude, "arb.")} (${primaryWaveCueText})`}
                />
                <MetricLine
                  label={t("metrics.pair")}
                  value={primaryFrame.alignedFieldPair ? t("values.aligned") : t("values.notReinforcing")}
                />
              </div>
            </div>
          </EquationCard>
        </div>

        <details className="rounded-[18px] border border-line bg-white/82 px-3 py-2 lg:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink-950 [&::-webkit-details-marker]:hidden">
            <span>{t("readout.showLiveReadout")}</span>
            <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-ink-600">
              Maxwell
            </span>
          </summary>
          <div className="mt-2 space-y-2 rounded-[14px] border border-line bg-white/88 px-3 py-3">
            <MetricLine label="t" value={formatMeasurement(primaryFrame.time, "s")} />
            <MetricLine label="Qenc" value={formatMeasurement(primaryFrame.chargeSource, "arb.")} />
            <MetricLine label="Ienc" value={formatMeasurement(primaryFrame.conductionCurrent, "arb.")} />
            <MetricLine label="dPhi_E/dt" value={formatMeasurement(primaryFrame.electricChangeInstant, "arb.")} />
            <MetricLine label="dPhi_B/dt" value={formatMeasurement(primaryFrame.magneticFluxChange, "arb.")} />
            <MetricLine label={t("metrics.waveCue")} value={primaryWaveCueText} />
          </div>
        </details>

        <div className="hidden gap-3 lg:grid">
          <section className="rounded-[22px] border border-line bg-white/92 px-3 py-3">
            <p className="lab-label">{t("readout.title")}</p>
            <div className="mt-3 space-y-2">
              <MetricLine label="t" value={formatMeasurement(primaryFrame.time, "s")} />
              <MetricLine label="Qenc" value={formatMeasurement(primaryFrame.chargeSource, "arb.")} />
              <MetricLine label="Ienc" value={formatMeasurement(primaryFrame.conductionCurrent, "arb.")} />
              <MetricLine label="dPhi_E/dt" value={formatMeasurement(primaryFrame.electricChangeInstant, "arb.")} />
              <MetricLine label="dPhi_B/dt" value={formatMeasurement(primaryFrame.magneticFluxChange, "arb.")} />
              <MetricLine label="∮ B · dl" value={formatMeasurement(primaryFrame.bCirculation, "arb.")} />
              <MetricLine label="∮ E · dl" value={formatMeasurement(primaryFrame.eCirculation, "arb.")} />
            </div>
            <div className="mt-3 rounded-2xl bg-paper px-3 py-2 text-[11px] leading-5 text-ink-700">
              <p>
                {t("readout.gaussBNote", {
                  value: formatMeasurement(primaryFrame.closedLoopStrength, "arb."),
                })}
              </p>
              <p className="mt-1">
                {t("readout.ampereNote", {
                  balance: primaryFrame.ampereBalanceLabel.replace("-", " "),
                  cue: primaryWaveCueText,
                })}
              </p>
            </div>
          </section>

          {compareEnabled && frameA && frameB ? (
            <section className="rounded-[22px] border border-line bg-white/92 px-3 py-3">
              <p className="lab-label">{t("compare.title")}</p>
              <p className="mt-1 text-xs leading-5 text-ink-700">
                {t("compare.description", { label: primaryLabel })}
              </p>
              <div className="mt-3 space-y-2">
                <CompareMetricLine
                  label={t("metrics.electricFlux")}
                  valueA={formatMeasurement(frameA.electricFlux, "arb.")}
                  valueB={formatMeasurement(frameB.electricFlux, "arb.")}
                  labelA={compare?.labelA ?? t("labels.setupA")}
                  labelB={compare?.labelB ?? t("labels.setupB")}
                />
                <CompareMetricLine
                  label={t("metrics.bCirculation")}
                  valueA={formatMeasurement(frameA.bCirculation, "arb.")}
                  valueB={formatMeasurement(frameB.bCirculation, "arb.")}
                  labelA={compare?.labelA ?? t("labels.setupA")}
                  labelB={compare?.labelB ?? t("labels.setupB")}
                />
                <CompareMetricLine
                  label={t("metrics.eCirculation")}
                  valueA={formatMeasurement(frameA.eCirculation, "arb.")}
                  valueB={formatMeasurement(frameB.eCirculation, "arb.")}
                  labelA={compare?.labelA ?? t("labels.setupA")}
                  labelB={compare?.labelB ?? t("labels.setupB")}
                />
                <CompareMetricLine
                  label={t("metrics.lightCue")}
                  valueA={resolveWaveCueText(t, frameA.waveStateLabel)}
                  valueB={resolveWaveCueText(t, frameB.waveStateLabel)}
                  labelA={compare?.labelA ?? t("labels.setupA")}
                  labelB={compare?.labelB ?? t("labels.setupB")}
                />
              </div>
            </section>
          ) : (
            <section className="rounded-[22px] border border-line bg-white/92 px-3 py-3">
              <p className="lab-label">{t("synthesis.title")}</p>
              <p className="mt-2 text-[11px] leading-5 text-ink-700">
                {t("synthesis.periodNote", {
                  minimumPeriod: formatMeasurement(
                    1 / MAXWELL_EQUATIONS_SYNTHESIS_MAX_CYCLE_RATE,
                    "s",
                  ),
                  period: formatMeasurement(primaryFrame.period, "s"),
                })}
              </p>
              <p className="mt-2 text-[11px] leading-5 text-ink-700">
                {t("synthesis.layoutNote")}
              </p>
            </section>
          )}
        </div>
      </div>
    </SimulationSceneCard>
  );
}
