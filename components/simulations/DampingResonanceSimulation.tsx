"use client";

import {
  formatMeasurement,
  formatNumber,
  safeNumber,
  sampleDampingState,
  peakFrequency,
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

type DampingResonanceSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 760;
const HEIGHT = 264;
const DISPLACEMENT_SCALE = 52;
const MAX_VISIBLE_DISPLACEMENT = 3;
const EQUILIBRIUM_X = 330;
const SCALE_TICKS = [-3, -2, -1, 0, 1, 2, 3];
const METRICS_CARD_WIDTH = 198;
const METRICS_CARD_X = WIDTH - METRICS_CARD_WIDTH - 18;
const METRICS_CARD_Y = 18;

function displacementToX(displacement: number) {
  return EQUILIBRIUM_X + displacement * DISPLACEMENT_SCALE;
}

function buildDampingFrame(source: SimulationParams, time: number, previewDriveFrequency?: number) {
  const resonanceMode = Boolean(source.responseMode ?? source.resonanceMode);
  const omega0 = Math.max(0.001, safeNumber(source.naturalFrequency, 1));
  const omega = Math.max(
    0.001,
    safeNumber(previewDriveFrequency ?? source.driveFrequency, safeNumber(source.drivingFrequency, omega0)),
  );
  const damping = safeNumber(source.dampingRatio, safeNumber(source.damping, 0.2));
  const driveAmplitude = safeNumber(source.driveAmplitude, 1);
  const state = sampleDampingState(
    {
      naturalFrequency: omega0,
      drivingFrequency: omega,
      damping,
      driveAmplitude,
      resonanceMode,
      phase: safeNumber(source.phase, 0),
    },
    time,
  );
  const responsePeak = peakFrequency({
    naturalFrequency: omega0,
    drivingFrequency: omega,
    damping,
    driveAmplitude,
    resonanceMode,
  });
  const bobOffset =
    Math.max(-MAX_VISIBLE_DISPLACEMENT, Math.min(MAX_VISIBLE_DISPLACEMENT, state.displacement)) *
    DISPLACEMENT_SCALE;
  const envelopeOffset = Math.min(
    MAX_VISIBLE_DISPLACEMENT * DISPLACEMENT_SCALE - 12,
    Math.max(24, driveAmplitude * DISPLACEMENT_SCALE),
  );

  return {
    resonanceMode,
    omega0,
    omega,
    damping,
    driveAmplitude,
    state,
    responsePeak,
    bobOffset,
    envelopeOffset,
  };
}

export function DampingResonanceSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: DampingResonanceSimulationProps) {
  const displayTime = graphPreview?.kind === "time" || graphPreview?.kind === "trajectory" ? graphPreview.time : time;
  const previewDriveFrequency = graphPreview?.kind === "response" ? graphPreview.point.x : undefined;
  const activeFrame = buildDampingFrame(params, displayTime, previewDriveFrequency);
  const compareAFrame = compare ? buildDampingFrame(compare.setupA, displayTime, previewDriveFrequency) : null;
  const compareBFrame = compare ? buildDampingFrame(compare.setupB, displayTime, previewDriveFrequency) : null;
  const compareEnabled = Boolean(compare);
  const primaryTarget = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const primaryFrame = compare ? (primaryTarget === "a" ? compareAFrame! : compareBFrame!) : activeFrame;
  const secondaryFrame = compare ? (primaryTarget === "a" ? compareBFrame! : compareAFrame!) : activeFrame;
  const primaryLabel = compare
    ? primaryTarget === "a"
      ? compare.labelA ?? "A"
      : compare.labelB ?? "B"
    : "Live";
  const secondaryLabel = compare
    ? primaryTarget === "a"
      ? compare.labelB ?? "B"
      : compare.labelA ?? "A"
    : "";
  const previewBadge =
    graphPreview && (graphPreview.kind === "time" || graphPreview.kind === "trajectory") ? (
      <span className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral-700">
        preview {graphPreview.seriesLabel} t = {formatNumber(displayTime)} s
      </span>
    ) : graphPreview ? (
      <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">
        preview {graphPreview.seriesLabel} @ {formatNumber(previewDriveFrequency ?? 0)} rad/s
      </span>
    ) : null;
  const showForcingArrow = overlayValues?.forcingArrow ?? true;
  const showResponseEnvelope = overlayValues?.responseEnvelope ?? true;
  const showPeakMarker = overlayValues?.peakMarker ?? false;
  const overlayWeight = (overlayId: string) => {
    if (!focusedOverlayId) {
      return 1;
    }
    return focusedOverlayId === overlayId ? 1 : 0.42;
  };
  const compareLegend = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
        <span className="h-0 w-5 border-t-2 border-solid border-ink-900" />
        {primaryLabel}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
        <span className="h-0 w-5 border-t-2 border-dashed border-ink-900/70" />
        {secondaryLabel}
      </span>
    </div>
  ) : null;
  const metricRows = [
    {
      label: "drive ratio",
      value: `${formatNumber(primaryFrame.omega / Math.max(primaryFrame.omega0, 0.001))}x`,
    },
    {
      label: "displacement",
      value: formatMeasurement(primaryFrame.state.displacement, "a.u."),
    },
    {
      label: "response amplitude",
      value: formatMeasurement(primaryFrame.state.responseAmplitude, "a.u."),
    },
    {
      label: "phase lag",
      value: formatMeasurement(primaryFrame.state.phaseLag, "rad"),
    },
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(241,102,89,0.08),rgba(30,166,162,0.06))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 text-xs text-ink-700">
              {concept.summary}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {compareLegend}
            {previewBadge}
            <span
              className={[
                "rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em]",
                activeFrame.resonanceMode
                  ? "border-coral-500/25 bg-coral-500/10 text-coral-700"
                  : "border-teal-500/25 bg-teal-500/10 text-teal-700",
              ].join(" ")}
            >
              {activeFrame.resonanceMode ? "Response mode" : "Transient mode"}
            </span>
          </div>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
      >
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.5)" />
        {SCALE_TICKS.map((tick) => {
          const x = displacementToX(tick);
          return (
            <g key={`damping-scale-${tick}`}>
              <line
                x1={x}
                x2={x}
                y1={26}
                y2={HEIGHT - 38}
                stroke={tick === 0 ? "rgba(15,28,36,0.18)" : "rgba(15,28,36,0.08)"}
                strokeDasharray={tick === 0 ? "10 8" : "4 10"}
                strokeWidth={tick === 0 ? "2" : "1.5"}
              />
              <text x={x} y={HEIGHT - 18} textAnchor="middle" className="fill-ink-500 text-[11px] font-medium">
                {tick}
              </text>
            </g>
          );
        })}
        <text x="52" y={HEIGHT - 18} className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]">
          relative displacement (a.u.)
        </text>
        {compareEnabled ? (
          <>
            <line x1="62" x2="680" y1="112" y2="112" stroke="rgba(15,28,36,0.18)" strokeWidth="3" />
            <line x1="62" x2="680" y1="184" y2="184" stroke="rgba(15,28,36,0.18)" strokeWidth="3" />
          </>
        ) : (
          <line x1="62" x2="680" y1="148" y2="148" stroke="rgba(15,28,36,0.2)" strokeWidth="3" />
        )}
        {compareEnabled ? (
          <>
            <text x="72" y="98" className="fill-ink-500 text-[12px] font-semibold">
              {primaryLabel}
            </text>
            <text x="72" y="170" className="fill-ink-500 text-[12px] font-semibold">
              {secondaryLabel}
            </text>
          </>
        ) : null}
        {(compareEnabled
          ? [
              { frame: primaryFrame!, y: 106, label: primaryLabel, dashed: false },
              { frame: secondaryFrame!, y: 184, label: secondaryLabel, dashed: true },
            ]
          : [{ frame: activeFrame, y: 148, label: "Live", dashed: false }]
        ).map(({ frame, y, label, dashed }) => {
          const bobX = EQUILIBRIUM_X + frame.bobOffset;
          const lineStroke = dashed ? "rgba(15,28,36,0.16)" : "rgba(15,28,36,0.22)";
          const envelopeStroke = dashed ? "rgba(78,166,223,0.34)" : "rgba(241,102,89,0.45)";
          return (
            <g key={label}>
              <line x1="108" x2="108" y1={y - 88} y2={y + 76} stroke={lineStroke} strokeWidth="4" />
              <path
                d={
                  dashed
                    ? `M 108 ${y} C 136 ${y - 24}, 136 ${y + 24}, 164 ${y} C 192 ${y - 24}, 192 ${y + 24}, 220 ${y} C 248 ${y - 24}, 248 ${y + 24}, 276 ${y} C 304 ${y - 24}, 304 ${y + 24}, 332 ${y}`
                    : `M 108 ${y} C 136 ${y - 26}, 136 ${y + 26}, 164 ${y} C 192 ${y - 26}, 192 ${y + 26}, 220 ${y} C 248 ${y - 26}, 248 ${y + 26}, 276 ${y} C 304 ${y - 26}, 304 ${y + 26}, 332 ${y}`
                }
                fill="none"
                stroke={dashed ? "url(#damping-compare-track)" : "url(#damping-track)"}
                strokeWidth="5"
                strokeDasharray={dashed ? "8 8" : undefined}
                strokeLinecap="round"
              />
              {showResponseEnvelope && !frame.resonanceMode ? (
                <>
                  <path
                    d={`M 108 ${y - frame.envelopeOffset} C 150 ${y - 16 - frame.envelopeOffset}, 214 ${y - 16 - frame.envelopeOffset}, 332 ${y - frame.envelopeOffset}`}
                    fill="none"
                    stroke={envelopeStroke}
                    strokeWidth={focusedOverlayId === "responseEnvelope" ? "4" : "3"}
                    strokeDasharray="8 8"
                    strokeLinecap="round"
                    strokeOpacity={overlayWeight("responseEnvelope")}
                  />
                  <path
                    d={`M 108 ${y + frame.envelopeOffset} C 150 ${y + 16 + frame.envelopeOffset}, 214 ${y + 16 + frame.envelopeOffset}, 332 ${y + frame.envelopeOffset}`}
                    fill="none"
                    stroke={envelopeStroke}
                    strokeWidth={focusedOverlayId === "responseEnvelope" ? "4" : "3"}
                    strokeDasharray="8 8"
                    strokeLinecap="round"
                    strokeOpacity={overlayWeight("responseEnvelope")}
                  />
                </>
              ) : null}
              <circle
                cx={bobX}
                cy={y}
                r={dashed ? "26" : "28"}
                fill={dashed ? "rgba(15,28,36,0.08)" : "#0f1c24"}
                stroke={dashed ? "rgba(78,166,223,0.78)" : "#f0ab3c"}
                strokeDasharray={dashed ? "8 8" : undefined}
                strokeWidth="4"
              />
              <circle cx={bobX} cy={y} r={dashed ? "10" : "12"} fill="#f4f2eb" />
              <line x1={bobX} x2={bobX} y1={y} y2={y - 52} stroke={dashed ? "rgba(78,166,223,0.8)" : "#4ea6df"} strokeWidth="4" strokeLinecap="round" />
              <polygon
                points={`${bobX},${y - 62} ${bobX - 8},${y - 48} ${bobX + 8},${y - 48}`}
                fill={dashed ? "rgba(78,166,223,0.8)" : "#4ea6df"}
              />
              {showForcingArrow ? (
                <>
                <line
                  x1={bobX}
                  x2={bobX + 52}
                  y1={y + 42}
                  y2={y + 42}
                  stroke={dashed ? "rgba(241,102,89,0.72)" : "#f16659"}
                  strokeWidth={focusedOverlayId === "forcingArrow" ? "5" : "4"}
                  strokeLinecap="round"
                  strokeDasharray={dashed ? "8 8" : undefined}
                  strokeOpacity={overlayWeight("forcingArrow")}
                />
                <polygon
                  points={`${bobX + 62},${y + 42} ${bobX + 48},${y + 34} ${bobX + 48},${y + 50}`}
                  fill={dashed ? "rgba(241,102,89,0.72)" : "#f16659"}
                  fillOpacity={overlayWeight("forcingArrow")}
                />
              </>
            ) : null}
              {showPeakMarker && frame.resonanceMode ? (
                <>
                  <line x1="548" x2="548" y1={y - 76} y2={y + 24} stroke="rgba(240,171,60,0.5)" strokeWidth={focusedOverlayId === "peakMarker" ? "4" : "3"} strokeDasharray="8 8" strokeOpacity={overlayWeight("peakMarker")} />
                  <circle cx="548" cy={y - 38} r={focusedOverlayId === "peakMarker" ? "9" : "8"} fill="#f0ab3c" fillOpacity={overlayWeight("peakMarker")} />
                  <text x="566" y={y - 80} className={`text-[12px] font-semibold ${focusedOverlayId === "peakMarker" ? "fill-amber-700" : "fill-amber-600"}`}>
                    peak {formatMeasurement(frame.responsePeak, "rad/s")}
                  </text>
                </>
              ) : null}
              <text x={bobX + 18} y={y - 36} className="fill-ink-700 text-[12px] font-semibold">
                {label}
              </text>
            </g>
          );
        })}
        <SimulationReadoutCard
          x={METRICS_CARD_X}
          y={METRICS_CARD_Y}
          width={METRICS_CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel} state` : "Live state"}
          rows={metricRows}
          noteLines={[
            "Displacement is relative (a.u.).",
            activeFrame.resonanceMode
              ? `Peak near ${formatMeasurement(primaryFrame.responsePeak, "rad/s")}.`
              : "Envelope shrinks as damping removes energy.",
          ]}
        />
        <defs>
          <linearGradient id="damping-track" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#1ea6a2" />
            <stop offset="100%" stopColor="#f0ab3c" />
          </linearGradient>
          <linearGradient id="damping-compare-track" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#4ea6df" />
            <stop offset="100%" stopColor="#f16659" />
          </linearGradient>
        </defs>
      </svg>
    </section>
  );
}
