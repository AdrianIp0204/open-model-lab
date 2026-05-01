"use client";

import type { ReactNode } from "react";
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

function loopLabel(direction: "counterclockwise" | "clockwise" | "none") {
  if (direction === "counterclockwise") {
    return "counterclockwise";
  }

  if (direction === "clockwise") {
    return "clockwise";
  }

  return "near zero";
}

function chargeLabel(direction: "outward" | "inward" | "balanced") {
  if (direction === "outward") {
    return "outward flux";
  }

  if (direction === "inward") {
    return "inward flux";
  }

  return "balanced flux";
}

function waveCueLabel(
  state: "strong" | "partial" | "absent" | "misaligned",
) {
  if (state === "strong") {
    return "strong light cue";
  }

  if (state === "partial") {
    return "partial light cue";
  }

  if (state === "misaligned") {
    return "misaligned field cue";
  }

  return "no light cue";
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
        "rounded-[22px] border px-3 py-3 transition-[opacity,box-shadow,border-color] duration-150",
        overlayCardClasses(emphasized),
      ].join(" ")}
      style={{ opacity }}
    >
      <p className="lab-label">{eyebrow}</p>
      <h3 className="mt-1 text-[1.02rem] font-semibold text-ink-950">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-ink-700">{description}</p>
      <div className="mt-3">{children}</div>
      {guideVisible ? (
        <p className="mt-3 rounded-2xl bg-paper px-3 py-2 text-[11px] leading-5 text-ink-700">
          {guide}
        </p>
      ) : null}
    </section>
  );
}

function GaussElectricVisual({
  chargeSource,
  electricFluxDirection,
}: {
  chargeSource: number;
  electricFluxDirection: "outward" | "inward" | "balanced";
}) {
  const tone = fieldTone(chargeSource);
  const ratio = strengthRatio(chargeSource);
  const sign = electricFluxDirection === "inward" ? -1 : 1;
  const arrowLength = 14 + ratio * 12;
  const angles = [-90, -30, 30, 90, 150, 210];

  return (
    <svg viewBox="0 0 156 104" className="h-[108px] w-full" aria-hidden="true">
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
        {chargeLabel(electricFluxDirection)}
      </text>
    </svg>
  );
}

function GaussMagneticVisual({
  closedLoopStrength,
}: {
  closedLoopStrength: number;
}) {
  const loopStroke = 2 + strengthRatio(closedLoopStrength) * 2.6;

  return (
    <svg viewBox="0 0 156 104" className="h-[108px] w-full" aria-hidden="true">
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
        net = 0
      </text>
      <text x="78" y="94" textAnchor="middle" className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]">
        closed B loops
      </text>
    </svg>
  );
}

function AmpereMaxwellVisual({
  conductionCurrent,
  electricChangeInstant,
  bCirculationDirection,
  bCirculation,
}: {
  conductionCurrent: number;
  electricChangeInstant: number;
  bCirculationDirection: "counterclockwise" | "clockwise" | "none";
  bCirculation: number;
}) {
  const currentToneColor = fieldTone(conductionCurrent).stroke;
  const displacementToneColor = fieldTone(electricChangeInstant).stroke;
  const currentArrowLength = 14 + strengthRatio(conductionCurrent) * 20;
  const currentSign = conductionCurrent >= 0 ? -1 : 1;
  const displacementHeight = 12 + strengthRatio(electricChangeInstant) * 26;

  return (
    <svg viewBox="0 0 156 104" className="h-[108px] w-full" aria-hidden="true">
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
        {loopLabel(bCirculationDirection)}
      </text>
    </svg>
  );
}

function FaradayVisual({
  magneticFluxChange,
  eCirculationDirection,
  eCirculation,
}: {
  magneticFluxChange: number;
  eCirculationDirection: "counterclockwise" | "clockwise" | "none";
  eCirculation: number;
}) {
  return (
    <svg viewBox="0 0 156 104" className="h-[108px] w-full" aria-hidden="true">
      <TangentialLoop
        direction={eCirculationDirection}
        strength={eCirculation}
        color={circulationTone(eCirculationDirection)}
      />
      {renderMagneticGlyph(magneticFluxChange, 78, 52, 12)}
      <text x="78" y="16" textAnchor="middle" className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]">
        changing B
      </text>
      <text x="78" y="94" textAnchor="middle" className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]">
        {loopLabel(eCirculationDirection)}
      </text>
    </svg>
  );
}

function WaveBridgeVisual({
  electricChangeInstant,
  magneticFluxChange,
  waveSignedCue,
  waveStateLabel,
}: {
  electricChangeInstant: number;
  magneticFluxChange: number;
  waveSignedCue: number;
  waveStateLabel: "strong" | "partial" | "absent" | "misaligned";
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
    <svg viewBox="0 0 328 106" className="h-[112px] w-full" aria-hidden="true">
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
        light cue
      </text>
      <text x="244" y="89" textAnchor="middle" className="fill-ink-700 text-[11px] font-semibold">
        {waveCueLabel(waveStateLabel)}
      </text>
    </svg>
  );
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
    liveLabel: "Live synthesis",
  });
  const previewBadge = graphPreview?.kind === "time" ? (
    <SimulationPreviewBadge tone="sky">
      preview t = {formatNumber(displayTime)} s
    </SimulationPreviewBadge>
  ) : null;
  const showChargeGuide = overlayValues?.chargeSurface ?? true;
  const showNoMonopolesGuide = overlayValues?.noMonopoles ?? true;
  const showFaradayGuide = overlayValues?.faradayLoop ?? true;
  const showAmpereGuide = overlayValues?.ampereMaxwell ?? true;
  const showLightGuide = overlayValues?.lightBridge ?? true;

  return (
    <SimulationSceneCard
      title={concept.title}
      description="One compact synthesis stage keeps the source laws, circulation laws, and light bridge on the same state instead of splitting them into disconnected formula cards."
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
    >
      <div className="grid gap-3 p-3 md:p-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div
          role="img"
          aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
          className="grid gap-3"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <EquationCard
              eyebrow="Gauss for E"
              title="Charge makes electric flux"
              description="Enclosed charge sets the net electric flux through a closed surface. Positive charge sends the field outward; negative charge pulls it inward."
              guide="Use this card to separate field sources from circulation. Charge changes the electric flux balance directly."
              overlayId="chargeSurface"
              focusedOverlayId={focusedOverlayId}
              guideVisible={showChargeGuide}
            >
              <div className="grid gap-2 md:grid-cols-[8.5rem_minmax(0,1fr)] md:items-center">
                <GaussElectricVisual
                  chargeSource={primaryFrame.chargeSource}
                  electricFluxDirection={primaryFrame.electricFluxDirection}
                />
                <div className="space-y-2">
                  <MetricLine
                    label="Qenc"
                    value={formatMeasurement(primaryFrame.chargeSource, "arb.")}
                  />
                  <MetricLine
                    label="oint E dA"
                    value={formatMeasurement(primaryFrame.electricFlux, "arb.")}
                  />
                  <MetricLine
                    label="reading"
                    value={chargeLabel(primaryFrame.electricFluxDirection)}
                  />
                </div>
              </div>
            </EquationCard>

            <EquationCard
              eyebrow="Gauss for B"
              title="Magnetic flux still balances"
              description="Magnetic field lines close on themselves. You can have stronger or weaker magnetic patterns locally, but the net magnetic flux through a closed surface stays zero."
              guide="This card is the no-monopoles reminder. Magnetic patterns can intensify without creating a net source term."
              overlayId="noMonopoles"
              focusedOverlayId={focusedOverlayId}
              guideVisible={showNoMonopolesGuide}
            >
              <div className="grid gap-2 md:grid-cols-[8.5rem_minmax(0,1fr)] md:items-center">
                <GaussMagneticVisual closedLoopStrength={primaryFrame.closedLoopStrength} />
                <div className="space-y-2">
                  <MetricLine
                    label="net B flux"
                    value={formatMeasurement(primaryFrame.magneticNetFlux, "arb.")}
                  />
                  <MetricLine
                    label="closed loops"
                    value={formatMeasurement(primaryFrame.closedLoopStrength, "arb.")}
                  />
                  <MetricLine
                    label="reading"
                    value="field lines close"
                  />
                </div>
              </div>
            </EquationCard>

            <EquationCard
              eyebrow="Faraday"
              title="Changing B makes circulating E"
              description="A changing magnetic flux does not just change a number on a graph. It creates a circulating electric field whose direction flips when the magnetic change flips."
              guide="Watch the center glyph and the ring together. The sign of dPhi_B/dt sets the E-circulation sense."
              overlayId="faradayLoop"
              focusedOverlayId={focusedOverlayId}
              guideVisible={showFaradayGuide}
            >
              <div className="grid gap-2 md:grid-cols-[8.5rem_minmax(0,1fr)] md:items-center">
                <FaradayVisual
                  magneticFluxChange={primaryFrame.magneticFluxChange}
                  eCirculationDirection={primaryFrame.eCirculationDirection}
                  eCirculation={primaryFrame.eCirculation}
                />
                <div className="space-y-2">
                  <MetricLine
                    label="dPhi_B/dt"
                    value={formatMeasurement(primaryFrame.magneticFluxChange, "arb.")}
                  />
                  <MetricLine
                    label="oint E dl"
                    value={formatMeasurement(primaryFrame.eCirculation, "arb.")}
                  />
                  <MetricLine
                    label="reading"
                    value={loopLabel(primaryFrame.eCirculationDirection)}
                  />
                </div>
              </div>
            </EquationCard>

            <EquationCard
              eyebrow="Ampere-Maxwell"
              title="Current and changing E make circulating B"
              description="Magnetic circulation is not sourced only by conduction current. Maxwell's displacement-current term means a changing electric field also feeds the same B circulation story."
              guide="Compare the two source terms: conduction current and changing electric flux. Both land on one shared B loop."
              overlayId="ampereMaxwell"
              focusedOverlayId={focusedOverlayId}
              guideVisible={showAmpereGuide}
            >
              <div className="grid gap-2 md:grid-cols-[8.5rem_minmax(0,1fr)] md:items-center">
                <AmpereMaxwellVisual
                  conductionCurrent={primaryFrame.conductionCurrent}
                  electricChangeInstant={primaryFrame.electricChangeInstant}
                  bCirculationDirection={primaryFrame.bCirculationDirection}
                  bCirculation={primaryFrame.bCirculation}
                />
                <div className="space-y-2">
                  <MetricLine
                    label="Ienc"
                    value={formatMeasurement(primaryFrame.bCurrentContribution, "arb.")}
                  />
                  <MetricLine
                    label="dPhi_E/dt"
                    value={formatMeasurement(primaryFrame.bDisplacementContribution, "arb.")}
                  />
                  <MetricLine
                    label="oint B dl"
                    value={formatMeasurement(primaryFrame.bCirculation, "arb.")}
                  />
                </div>
              </div>
            </EquationCard>
          </div>

          <EquationCard
            eyebrow="Unification"
            title="When both changes keep feeding each other, light appears"
            description="Faraday and Ampere-Maxwell are the handoff pair. If changing E and changing B are both present in the same story, the field update can keep propagating instead of dying locally."
            guide="The bridge is strongest when both changing-field terms stay active together. This is the compact intuition behind why Maxwell's equations unify electricity, magnetism, and light."
            overlayId="lightBridge"
            focusedOverlayId={focusedOverlayId}
            guideVisible={showLightGuide}
          >
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem] md:items-center">
              <WaveBridgeVisual
                electricChangeInstant={primaryFrame.electricChangeInstant}
                magneticFluxChange={primaryFrame.magneticFluxChange}
                waveSignedCue={primaryFrame.waveSignedCue}
                waveStateLabel={primaryFrame.waveStateLabel}
              />
              <div className="space-y-2">
                <MetricLine
                  label="cycle rate"
                  value={formatMeasurement(primaryFrame.cycleRate, "Hz")}
                />
                <MetricLine
                  label="period"
                  value={formatMeasurement(primaryFrame.period, "s")}
                />
                <MetricLine
                  label="wave cue"
                  value={`${formatMeasurement(primaryFrame.waveCueMagnitude, "arb.")} (${waveCueLabel(primaryFrame.waveStateLabel)})`}
                />
                <MetricLine
                  label="pair"
                  value={primaryFrame.alignedFieldPair ? "aligned" : "not reinforcing"}
                />
              </div>
            </div>
          </EquationCard>
        </div>

        <div className="grid gap-3">
          <section className="rounded-[22px] border border-line bg-white/92 px-3 py-3">
            <p className="lab-label">Live readout</p>
            <div className="mt-3 space-y-2">
              <MetricLine label="t" value={formatMeasurement(primaryFrame.time, "s")} />
              <MetricLine label="Qenc" value={formatMeasurement(primaryFrame.chargeSource, "arb.")} />
              <MetricLine label="Ienc" value={formatMeasurement(primaryFrame.conductionCurrent, "arb.")} />
              <MetricLine label="dPhi_E/dt" value={formatMeasurement(primaryFrame.electricChangeInstant, "arb.")} />
              <MetricLine label="dPhi_B/dt" value={formatMeasurement(primaryFrame.magneticFluxChange, "arb.")} />
              <MetricLine label="oint B dl" value={formatMeasurement(primaryFrame.bCirculation, "arb.")} />
              <MetricLine label="oint E dl" value={formatMeasurement(primaryFrame.eCirculation, "arb.")} />
            </div>
            <div className="mt-3 rounded-2xl bg-paper px-3 py-2 text-[11px] leading-5 text-ink-700">
              <p>
                Gauss-B stays at zero net flux while closed loops strengthen to{" "}
                {formatMeasurement(primaryFrame.closedLoopStrength, "arb.")}.
              </p>
              <p className="mt-1">
                Ampere-Maxwell is currently {primaryFrame.ampereBalanceLabel.replace("-", " ")}, and the light bridge reads {waveCueLabel(primaryFrame.waveStateLabel)}.
              </p>
            </div>
          </section>

          {compareEnabled && frameA && frameB ? (
            <section className="rounded-[22px] border border-line bg-white/92 px-3 py-3">
              <p className="lab-label">Compare summary</p>
              <p className="mt-1 text-xs leading-5 text-ink-700">
                The stage follows {primaryLabel}. The other setup stays summarized here so the field story stays synchronized instead of splitting into two unrelated states.
              </p>
              <div className="mt-3 space-y-2">
                <CompareMetricLine
                  label="electric flux"
                  valueA={formatMeasurement(frameA.electricFlux, "arb.")}
                  valueB={formatMeasurement(frameB.electricFlux, "arb.")}
                  labelA={compare?.labelA ?? "Setup A"}
                  labelB={compare?.labelB ?? "Setup B"}
                />
                <CompareMetricLine
                  label="B circulation"
                  valueA={formatMeasurement(frameA.bCirculation, "arb.")}
                  valueB={formatMeasurement(frameB.bCirculation, "arb.")}
                  labelA={compare?.labelA ?? "Setup A"}
                  labelB={compare?.labelB ?? "Setup B"}
                />
                <CompareMetricLine
                  label="E circulation"
                  valueA={formatMeasurement(frameA.eCirculation, "arb.")}
                  valueB={formatMeasurement(frameB.eCirculation, "arb.")}
                  labelA={compare?.labelA ?? "Setup A"}
                  labelB={compare?.labelB ?? "Setup B"}
                />
                <CompareMetricLine
                  label="light cue"
                  valueA={waveCueLabel(frameA.waveStateLabel)}
                  valueB={waveCueLabel(frameB.waveStateLabel)}
                  labelA={compare?.labelA ?? "Setup A"}
                  labelB={compare?.labelB ?? "Setup B"}
                />
              </div>
            </section>
          ) : (
            <section className="rounded-[22px] border border-line bg-white/92 px-3 py-3">
              <p className="lab-label">Synthesis reading</p>
              <p className="mt-2 text-[11px] leading-5 text-ink-700">
                Lowering the cycle rate lengthens the handoff period to{" "}
                {formatMeasurement(
                  1 / MAXWELL_EQUATIONS_SYNTHESIS_MAX_CYCLE_RATE,
                  "s",
                )} up to the current {formatMeasurement(primaryFrame.period, "s")} window, so the graph and stage stay on the same oscillation clock.
              </p>
              <p className="mt-2 text-[11px] leading-5 text-ink-700">
                This page keeps the four equations compact: flux laws on top, circulation laws below, and the light bridge only when the changing-field pair can keep feeding itself.
              </p>
            </section>
          )}
        </div>
      </div>
    </SimulationSceneCard>
  );
}
