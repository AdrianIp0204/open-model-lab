"use client";

import {
  formatNumber,
  mapRange,
  sampleBuffersNeutralizationState,
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

type BuffersNeutralizationSimulationProps = {
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

  if (preview.graphId === "ph-vs-acid" || preview.graphId === "buffer-remaining-vs-acid") {
    return { ...source, acidAmount: preview.point.x };
  }

  return source;
}

function resolvePreviewLabel(preview: GraphStagePreview | null | undefined) {
  if (!preview || preview.kind !== "response") {
    return null;
  }

  if (preview.graphId === "ph-vs-acid" || preview.graphId === "buffer-remaining-vs-acid") {
    return `preview acid = ${formatNumber(preview.point.x)}`;
  }

  return null;
}

function drawPhScale(x: number, y: number, height: number, pH: number, focusedOverlayId?: string | null) {
  const markerY = y + height - mapRange(pH, 0, 14, 0, height);

  return (
    <g opacity={overlayOpacity(focusedOverlayId, "phScale")}>
      <text
        x={x}
        y={y - 10}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        pH scale
      </text>
      <defs>
        <linearGradient id="buffer-ph-scale-gradient" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(78,166,223,0.92)" />
          <stop offset="50%" stopColor="rgba(240,171,60,0.72)" />
          <stop offset="100%" stopColor="rgba(241,102,89,0.92)" />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width="18" height={height} rx="9" fill="url(#buffer-ph-scale-gradient)" />
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

function drawBufferMeter(
  x: number,
  y: number,
  width: number,
  height: number,
  reserve: number,
  capacity: number,
  focusedOverlayId?: string | null,
) {
  const fraction = capacity <= 0 ? 0 : reserve / capacity;
  const fillWidth = width * fraction;

  return (
    <g opacity={overlayOpacity(focusedOverlayId, "bufferReserve")}>
      <text
        x={x}
        y={y - 10}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        Buffer reserve
      </text>
      <rect x={x} y={y} width={width} height={height} rx={height / 2} fill="rgba(15,28,36,0.08)" />
      <rect x={x} y={y} width={fillWidth} height={height} rx={height / 2} fill="rgba(30,166,162,0.7)" />
      <text x={x} y={y + height + 16} className="fill-ink-700 text-[10px] font-semibold">
        reserve {formatNumber(reserve)}
      </text>
      <text x={x + width - 2} y={y + height + 16} textAnchor="end" className="fill-ink-500 text-[10px] font-semibold">
        capacity {formatNumber(capacity)}
      </text>
    </g>
  );
}

export function BuffersNeutralizationSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: BuffersNeutralizationSimulationProps) {
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const liveFrame = sampleBuffersNeutralizationState(buildPreviewSource(params, graphPreview));
  const frameA = compare
    ? sampleBuffersNeutralizationState(buildPreviewSource(compare.setupA, previewedSetup === "a" ? graphPreview : null))
    : null;
  const frameB = compare
    ? sampleBuffersNeutralizationState(buildPreviewSource(compare.setupB, previewedSetup === "b" ? graphPreview : null))
    : null;
  const primary = compare ? (previewedSetup === "b" ? frameB! : frameA!) : liveFrame;
  const secondary = compare ? (previewedSetup === "b" ? frameA! : frameB!) : null;
  const primaryLabel = compare
    ? previewedSetup === "b"
      ? compare.labelB ?? "Variant"
      : compare.labelA ?? "Baseline"
    : "Live";
  const secondaryLabel = compare
    ? previewedSetup === "b"
      ? compare.labelA ?? "Baseline"
      : compare.labelB ?? "Variant"
    : null;
  const previewLabel = resolvePreviewLabel(graphPreview);
  const overlayState = {
    characterMix: overlayValues?.characterMix ?? true,
    phScale: overlayValues?.phScale ?? true,
    particleMotion: overlayValues?.particleMotion ?? true,
    bufferReserve: overlayValues?.bufferReserve ?? true,
  };
  const loopTime = Number.isFinite(time) ? time % 18 : 0;
  const readoutRows = [
    { label: "acid", value: formatNumber(primary.acidAmount) },
    { label: "base", value: formatNumber(primary.baseAmount) },
    { label: "buffer", value: formatNumber(primary.bufferAmount) },
    { label: "water", value: formatNumber(primary.waterVolume) },
    { label: "neutralized", value: formatNumber(primary.neutralizedAmount) },
    { label: "reserve", value: formatNumber(primary.bufferRemaining) },
    { label: "pH", value: formatNumber(primary.pH) },
  ];
  const noteLines = [
    primary.bufferRemaining > 0 && Math.abs(primary.pH - 7) < 0.8
      ? "The buffer is still absorbing the acid-base mismatch, so the pH stays near the middle while reserve is quietly being spent."
      : primary.bufferRemaining <= 0
        ? "The buffer reserve is spent, so the remaining acid-base mismatch now pushes the pH away from neutral."
        : "Some direct neutralization has happened, but the buffer is no longer keeping the pH tightly anchored.",
    "Adding water softens the shift, but it does not create neutralization or refill the buffer reserve.",
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(30,166,162,0.12),rgba(241,102,89,0.1))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              Keep acid, base, buffer reserve, and the pH strip on one bench so direct
              neutralization and buffered resistance feel like different moves, not one slogan.
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
            title="buffer bench"
            subtitle={`${secondaryLabel} ghost`}
            time={loopTime}
            agitation={0.78 + Math.abs(secondary.pH - 7) * 0.05}
            reactantCount={secondary.hydroniumCount}
            productCount={secondary.hydroxideCount}
            reactantAmount={secondary.acidShare * 10}
            productAmount={secondary.baseShare * 10}
            reactantLabel="H+ character"
            productLabel="OH- character"
            reactantTone="coral"
            productTone="sky"
            showMotionCue={overlayState.particleMotion}
            showMixtureBars={overlayState.characterMix}
            focusedOverlayId={focusedOverlayId}
            motionOverlayId="particleMotion"
            mixtureOverlayId="characterMix"
            chips={[
              {
                label: `reserve ${formatNumber(secondary.bufferRemaining)}`,
                tone: "teal",
                dashed: true,
              },
              {
                label: `pH ${formatNumber(secondary.pH)}`,
                tone: "ink",
                dashed: true,
              },
            ]}
            footerText="Ghost setup for compare mode."
            muted
            dashed
          />
        ) : null}

        <ChemistryVessel
          x={BENCH_X}
          y={BENCH_Y}
          width={BENCH_WIDTH}
          height={BENCH_HEIGHT}
          title="buffer bench"
          subtitle={`${primaryLabel}: buffer reserve can hold the pH near the middle even while neutralization and chemical change are still happening.`}
          time={loopTime}
          agitation={0.78 + Math.abs(primary.pH - 7) * 0.05}
          reactantCount={primary.hydroniumCount}
          productCount={primary.hydroxideCount}
          reactantAmount={primary.acidShare * 10}
          productAmount={primary.baseShare * 10}
          reactantLabel="H+ character"
          productLabel="OH- character"
          reactantTone="coral"
          productTone="sky"
          showMotionCue={overlayState.particleMotion}
          showMixtureBars={overlayState.characterMix}
          focusedOverlayId={focusedOverlayId}
          motionOverlayId="particleMotion"
          mixtureOverlayId="characterMix"
          legendItems={[
            { label: "H+ character", tone: "coral" },
            { label: "OH- character", tone: "sky" },
          ]}
          chips={[
            {
              label: `neutralized ${formatNumber(primary.neutralizedAmount)}`,
              tone: "amber",
            },
            {
              label: `reserve ${formatNumber(primary.bufferRemaining)}`,
              tone: "teal",
            },
          ]}
          footerText="Near-neutral pH can mean the buffer is absorbing the push, not that nothing changed."
        />

        {overlayState.phScale ? drawPhScale(BENCH_X + BENCH_WIDTH - 4, BENCH_Y + 52, 210, primary.pH, focusedOverlayId) : null}
        {overlayState.bufferReserve
          ? drawBufferMeter(BENCH_X + BENCH_WIDTH - 76, BENCH_Y + 286, 132, 12, primary.bufferRemaining, primary.bufferAmount, focusedOverlayId)
          : null}

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="buffer readout"
          setupLabel={primaryLabel}
          rows={readoutRows}
          noteLines={noteLines}
        />
      </svg>
    </section>
  );
}
