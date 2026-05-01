"use client";

import {
  buildChemistryParticles,
  formatNumber,
  sampleConcentrationDilutionState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type ConcentrationDilutionSimulationProps = {
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
const HEIGHT = 400;
const BENCH_X = 32;
const BENCH_Y = 30;
const BENCH_WIDTH = 600;
const BENCH_HEIGHT = 312;
const CARD_X = 668;
const CARD_Y = 30;
const CARD_WIDTH = 210;

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

  if (preview.graphId === "concentration-vs-solvent") {
    return { ...source, solventVolume: preview.point.x };
  }

  if (preview.graphId === "concentration-vs-solute") {
    return { ...source, soluteAmount: preview.point.x };
  }

  return source;
}

function resolvePreviewLabel(preview: GraphStagePreview | null | undefined) {
  if (!preview || preview.kind !== "response") {
    return null;
  }

  if (preview.graphId === "concentration-vs-solvent") {
    return `preview volume = ${formatNumber(preview.point.x)}`;
  }

  if (preview.graphId === "concentration-vs-solute") {
    return `preview solute = ${formatNumber(preview.point.x)}`;
  }

  return null;
}

function DilutionBeaker({
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
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle: string;
  frame: ReturnType<typeof sampleConcentrationDilutionState>;
  time: number;
  overlayValues: {
    densityCue: boolean;
    amountVolumeGuide: boolean;
    particleMotion: boolean;
  };
  focusedOverlayId?: string | null;
  ghost?: boolean;
}) {
  const beakerX = x + 26;
  const beakerY = y + 56;
  const beakerWidth = width - 160;
  const beakerHeight = height - 92;
  const fillHeight = beakerHeight * frame.fillFraction;
  const liquidTop = beakerY + beakerHeight - fillHeight;
  const particles = buildChemistryParticles({
    reactantCount: frame.particleCount,
    time,
    agitation: 0.55 + frame.particleDensity * 0.6,
    width: beakerWidth - 20,
    height: Math.max(fillHeight - 16, 48),
  });
  const densityBarHeight = beakerHeight;
  const densityBarFill = Math.max(14, densityBarHeight * Math.min(frame.particleDensity, 1));

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        width={width}
        height={height}
        rx="26"
        fill={ghost ? "rgba(255,255,255,0.46)" : "rgba(255,255,255,0.92)"}
        stroke={ghost ? "rgba(15,28,36,0.18)" : "rgba(15,28,36,0.1)"}
        strokeDasharray={ghost ? "8 6" : undefined}
      />
      <text
        x="18"
        y="24"
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
      >
        {title}
      </text>
      <text x="18" y="46" className="fill-ink-950 text-[15px] font-semibold">
        {subtitle}
      </text>

      <rect
        x={beakerX}
        y={beakerY}
        width={beakerWidth}
        height={beakerHeight}
        rx="26"
        fill={ghost ? "rgba(248,251,252,0.44)" : "rgba(248,251,252,0.94)"}
        stroke={ghost ? "rgba(15,28,36,0.16)" : "rgba(15,28,36,0.08)"}
        strokeDasharray={ghost ? "8 6" : undefined}
      />
      <rect
        x={beakerX + 10}
        y={liquidTop}
        width={beakerWidth - 20}
        height={fillHeight}
        rx="22"
        fill={ghost ? "rgba(78,166,223,0.15)" : "rgba(78,166,223,0.22)"}
      />

      {overlayValues.amountVolumeGuide ? (
        <g opacity={overlayOpacity(focusedOverlayId, "amountVolumeGuide")}>
          <line
            x1={beakerX + beakerWidth + 18}
            x2={beakerX + beakerWidth + 18}
            y1={beakerY}
            y2={beakerY + beakerHeight}
            stroke="rgba(15,28,36,0.22)"
            strokeDasharray="5 5"
          />
          <line
            x1={beakerX + beakerWidth + 8}
            x2={beakerX + beakerWidth + 28}
            y1={liquidTop}
            y2={liquidTop}
            stroke="rgba(15,28,36,0.42)"
          />
          <text
            x={beakerX + beakerWidth + 38}
            y={liquidTop + 4}
            className="fill-ink-700 text-[10px] font-semibold"
          >
            volume {formatNumber(frame.solventVolume)}
          </text>
        </g>
      ) : null}

      {overlayValues.densityCue ? (
        <g opacity={overlayOpacity(focusedOverlayId, "densityCue")}>
          <rect
            x={beakerX + beakerWidth + 66}
            y={beakerY}
            width="14"
            height={densityBarHeight}
            rx="7"
            fill="rgba(15,28,36,0.08)"
          />
          <rect
            x={beakerX + beakerWidth + 66}
            y={beakerY + densityBarHeight - densityBarFill}
            width="14"
            height={densityBarFill}
            rx="7"
            fill="rgba(30,166,162,0.74)"
          />
          <text
            x={beakerX + beakerWidth + 88}
            y={beakerY + 14}
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            density
          </text>
          <text
            x={beakerX + beakerWidth + 88}
            y={beakerY + 32}
            className="fill-ink-950 text-[12px] font-semibold"
          >
            {formatNumber(frame.concentration)}
          </text>
        </g>
      ) : null}

      <g opacity={overlayOpacity(focusedOverlayId, "particleMotion")}>
        {particles.map((particle) => {
          const px = beakerX + 10 + particle.x;
          const py = liquidTop + 8 + particle.y;

          return (
            <g key={particle.id}>
              {overlayValues.particleMotion ? (
                <line
                  x1={px - particle.streakX}
                  y1={py - particle.streakY}
                  x2={px}
                  y2={py}
                  stroke="rgba(30,166,162,0.36)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeDasharray={ghost ? "4 4" : undefined}
                />
              ) : null}
              <circle
                cx={px}
                cy={py}
                r={particle.radius * 0.82}
                fill={ghost ? "rgba(30,166,162,0.42)" : "rgba(30,166,162,0.86)"}
                stroke="rgba(15,28,36,0.16)"
                strokeDasharray={ghost ? "4 3" : undefined}
              />
            </g>
          );
        })}
      </g>

      <text x="18" y={height - 34} className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]">
        Solute
      </text>
      <text x="18" y={height - 16} className="fill-ink-950 text-[12px] font-semibold">
        {formatNumber(frame.soluteAmount)} units
      </text>
      <text x="122" y={height - 34} className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]">
        Concentration
      </text>
      <text x="122" y={height - 16} className="fill-ink-950 text-[12px] font-semibold">
        {formatNumber(frame.concentration)} per volume
      </text>
    </g>
  );
}

export function ConcentrationDilutionSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: ConcentrationDilutionSimulationProps) {
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const primaryParams = buildPreviewSource(
    compare && previewedSetup === "b" ? compare.setupB : compare?.setupA ?? params,
    graphPreview,
  );
  const secondaryParams =
    compare && previewedSetup === "b" ? compare.setupA : compare?.setupB ?? null;
  const primary = sampleConcentrationDilutionState(primaryParams);
  const secondary = secondaryParams ? sampleConcentrationDilutionState(secondaryParams) : null;
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
    densityCue: overlayValues?.densityCue ?? true,
    amountVolumeGuide: overlayValues?.amountVolumeGuide ?? true,
    particleMotion: overlayValues?.particleMotion ?? true,
  };
  const loopTime = Number.isFinite(time) ? time % 18 : 0;
  const readoutRows = [
    { label: "solute", value: formatNumber(primary.soluteAmount) },
    { label: "volume", value: formatNumber(primary.solventVolume) },
    { label: "conc", value: formatNumber(primary.concentration) },
    { label: "density", value: `${formatNumber(primary.particleDensity * 100)}%` },
  ];
  const noteLines = [
    "Adding solvent lowers concentration by spreading the same solute through more volume.",
    "Adding solute raises concentration even if the liquid level barely changes.",
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(78,166,223,0.1),rgba(30,166,162,0.1))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              Keep solute amount and solution volume on the same beaker so dilution reads as
              spreading the same amount out rather than making it disappear.
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
          <DilutionBeaker
            x={BENCH_X + 12}
            y={BENCH_Y + 10}
            width={BENCH_WIDTH}
            height={BENCH_HEIGHT}
            title="Solution bench"
            subtitle={`${secondaryLabel} ghost`}
            frame={secondary}
            time={loopTime}
            overlayValues={overlayState}
            focusedOverlayId={focusedOverlayId}
            ghost
          />
        ) : null}
        <DilutionBeaker
          x={BENCH_X}
          y={BENCH_Y}
          width={BENCH_WIDTH}
          height={BENCH_HEIGHT}
          title="Solution bench"
          subtitle={`${primaryLabel}: concentration means how much solute is spread through how much liquid.`}
          frame={primary}
          time={loopTime}
          overlayValues={overlayState}
          focusedOverlayId={focusedOverlayId}
        />
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Solution readout"
          setupLabel={primaryLabel}
          rows={readoutRows}
          noteLines={noteLines}
        />
      </svg>
    </section>
  );
}
