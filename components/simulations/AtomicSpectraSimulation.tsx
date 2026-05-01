"use client";

import {
  ATOMIC_SPECTRA_SPECTRUM_MAX_NM,
  ATOMIC_SPECTRA_SPECTRUM_MIN_NM,
  formatMeasurement,
  formatNumber,
  sampleAtomicSpectraState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import {
  CompareLegend,
  resolveCompareScene,
  SimulationPreviewBadge,
} from "./primitives/compare";
import { SvgArrow } from "./primitives/electric-stage";
import { resolveOverlayOpacity } from "./primitives/overlay";
import { SimulationSceneCard } from "./primitives/scene-card";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type AtomicSpectraSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 960;
const HEIGHT = 540;
const CARD_WIDTH = 236;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 20;
const ROW_LEFT = 48;
const ROW_RIGHT = 682;
const SINGLE_ROW_CENTER = 286;
const ROW_HALF_HEIGHT = 98;
const COMPARE_ROW_CENTERS: Record<GraphSeriesSetupId, number> = {
  a: 194,
  b: 388,
};
const LADDER_LEFT = 94;
const LADDER_RIGHT = 288;
const SPECTRUM_LEFT = 332;
const SPECTRUM_RIGHT = 666;
const SPECTRUM_HEIGHT = 56;
const STRIP_VISIBLE_MIN_NM = 380;
const STRIP_VISIBLE_MAX_NM = 750;

function spectrumX(wavelengthNm: number) {
  return (
    SPECTRUM_LEFT +
    ((wavelengthNm - ATOMIC_SPECTRA_SPECTRUM_MIN_NM) /
      (ATOMIC_SPECTRA_SPECTRUM_MAX_NM - ATOMIC_SPECTRA_SPECTRUM_MIN_NM)) *
      (SPECTRUM_RIGHT - SPECTRUM_LEFT)
  );
}

function buildFrame(
  source: SimulationParams,
  time: number,
  graphPreview?: GraphStagePreview | null,
) {
  const previewWavelengthNm =
    graphPreview?.kind === "response" && graphPreview.graphId === "spectrum-lines"
      ? graphPreview.point.x
      : undefined;

  return sampleAtomicSpectraState(source, time, previewWavelengthNm);
}

function renderEnergyLadder(
  frame: ReturnType<typeof sampleAtomicSpectraState>,
  rowCenter: number,
  options: {
    focusedOverlayId?: string | null;
    overlayValues?: Record<string, boolean>;
    muted?: boolean;
  },
) {
  const levelTop = rowCenter - 64;
  const levelBottom = rowCenter + 70;
  const maxEnergy = frame.levelEnergiesEv[3] + 0.7;
  const ladderOpacity = options.muted ? 0.36 : 1;
  const showQuantizedSpacing = options.overlayValues?.quantizedSpacing ?? true;
  const quantizedOpacity = resolveOverlayOpacity(
    options.focusedOverlayId,
    "quantizedSpacing",
    0.42,
  );
  const levelY = (energyEv: number) =>
    levelBottom - (energyEv / Math.max(maxEnergy, 1e-6)) * (levelBottom - levelTop);

  return (
    <g opacity={ladderOpacity}>
      <text
        x={LADDER_LEFT}
        y={levelTop - 16}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        discrete energy levels
      </text>
      <rect
        x={LADDER_LEFT - 10}
        y={levelTop - 8}
        width={LADDER_RIGHT - LADDER_LEFT + 18}
        height={levelBottom - levelTop + 20}
        rx="20"
        fill="rgba(255,253,247,0.82)"
        stroke="rgba(15,28,36,0.08)"
      />
      {frame.levelEnergiesEv.map((energyEv, index) => {
        const y = levelY(energyEv);
        return (
          <g key={`level-${index + 1}`}>
            <line
              x1={LADDER_LEFT + 18}
              x2={LADDER_RIGHT - 18}
              y1={y}
              y2={y}
              stroke="rgba(49,80,99,0.92)"
              strokeWidth="3.4"
              strokeLinecap="round"
            />
            <text
              x={LADDER_LEFT + 6}
              y={y + 4}
              className="fill-ink-700 text-[10px] font-semibold uppercase tracking-[0.12em]"
            >
              n = {index + 1}
            </text>
            <text
              x={LADDER_RIGHT - 6}
              y={y + 4}
              textAnchor="end"
              className="fill-ink-500 text-[10px]"
            >
              {formatMeasurement(energyEv, "eV")}
            </text>
          </g>
        );
      })}
      {frame.transitions.map((transition, index) => {
        const fromY = levelY(frame.levelEnergiesEv[transition.fromLevel - 1]);
        const toY = levelY(frame.levelEnergiesEv[transition.toLevel - 1]);
        const isActive = transition.id === frame.activeTransition.id;
        const anchorX = LADDER_RIGHT - 32 - index * 7;
        const arrowStartY = frame.absorptionMode ? toY : fromY;
        const arrowEndY = frame.absorptionMode ? fromY : toY;

        return (
          <g key={transition.id}>
            <SvgArrow
              x1={anchorX}
              y1={arrowStartY}
              x2={anchorX}
              y2={arrowEndY}
              stroke={transition.lineColorHex}
              strokeWidth={isActive ? 3.2 : 2.1}
              opacity={isActive ? 1 : 0.28}
            />
          </g>
        );
      })}
      {showQuantizedSpacing ? (
        <g pointerEvents="none" opacity={quantizedOpacity}>
          <rect
            x={LADDER_LEFT + 12}
            y={levelBottom + 8}
            width="182"
            height="42"
            rx="14"
            fill="rgba(255,253,247,0.94)"
            stroke="rgba(15,28,36,0.08)"
          />
          <text
            x={LADDER_LEFT + 24}
            y={levelBottom + 24}
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
          >
            quantized spacing
          </text>
          <text x={LADDER_LEFT + 24} y={levelBottom + 38} className="fill-ink-600 text-[10px]">
            Only level gaps make lines, so nothing fills
          </text>
          <text x={LADDER_LEFT + 24} y={levelBottom + 50} className="fill-ink-600 text-[10px]">
            the spaces between allowed wavelengths.
          </text>
        </g>
      ) : null}
    </g>
  );
}

function renderSpectrumStrip(
  frame: ReturnType<typeof sampleAtomicSpectraState>,
  rowCenter: number,
  options: {
    focusedOverlayId?: string | null;
    overlayValues?: Record<string, boolean>;
    muted?: boolean;
  },
) {
  const stripTop = rowCenter - 16;
  const stripBottom = stripTop + SPECTRUM_HEIGHT;
  const stripMidY = (stripTop + stripBottom) / 2;
  const showLineLabels = options.overlayValues?.lineLabels ?? true;
  const showModeLock = options.overlayValues?.modeLock ?? true;
  const labelsOpacity = resolveOverlayOpacity(options.focusedOverlayId, "lineLabels", 0.42);
  const modeOpacity = resolveOverlayOpacity(options.focusedOverlayId, "modeLock", 0.42);
  const rowOpacity = options.muted ? 0.36 : 1;
  const visibleLeft = spectrumX(STRIP_VISIBLE_MIN_NM);
  const visibleRight = spectrumX(STRIP_VISIBLE_MAX_NM);

  return (
    <g opacity={rowOpacity}>
      <text
        x={SPECTRUM_LEFT}
        y={stripTop - 18}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        observed spectrum
      </text>
      <rect
        x={SPECTRUM_LEFT}
        y={stripTop}
        width={SPECTRUM_RIGHT - SPECTRUM_LEFT}
        height={SPECTRUM_HEIGHT}
        rx="18"
        fill={frame.absorptionMode ? "rgba(255,249,236,0.98)" : "rgba(16,24,33,0.96)"}
        stroke="rgba(15,28,36,0.1)"
      />
      <rect
        x={visibleLeft}
        y={stripTop}
        width={visibleRight - visibleLeft}
        height={SPECTRUM_HEIGHT}
        rx="18"
        fill="url(#atomic-visible-band)"
        opacity={frame.absorptionMode ? 0.34 : 0.18}
      />
      <text x={SPECTRUM_LEFT} y={stripBottom + 16} className="fill-ink-500 text-[10px]">
        UV
      </text>
      <text
        x={(visibleLeft + visibleRight) / 2}
        y={stripBottom + 16}
        textAnchor="middle"
        className="fill-ink-500 text-[10px]"
      >
        visible
      </text>
      <text
        x={SPECTRUM_RIGHT}
        y={stripBottom + 16}
        textAnchor="end"
        className="fill-ink-500 text-[10px]"
      >
        IR
      </text>
      {frame.transitions.map((transition) => {
        const x = spectrumX(transition.wavelengthNm);
        const isActive = transition.id === frame.activeTransition.id;
        const lineHeight = 14 + transition.intensity * 26;
        const notchWidth = 3.2 + transition.intensity * 3.8;

        return frame.absorptionMode ? (
          <rect
            key={transition.id}
            x={x - notchWidth / 2}
            y={stripTop + 4}
            width={notchWidth}
            height={SPECTRUM_HEIGHT - 8}
            rx="2"
            fill={isActive ? "rgba(24,38,52,0.92)" : "rgba(31,51,66,0.72)"}
          />
        ) : (
          <line
            key={transition.id}
            x1={x}
            x2={x}
            y1={stripMidY - lineHeight / 2}
            y2={stripMidY + lineHeight / 2}
            stroke={transition.lineColorHex}
            strokeWidth={isActive ? 4.4 : 3.1}
            strokeLinecap="round"
            opacity={isActive ? 1 : 0.72}
          />
        );
      })}
      {showLineLabels ? (
        <g pointerEvents="none" opacity={labelsOpacity}>
          {frame.transitions.map((transition, index) => {
            const x = spectrumX(transition.wavelengthNm);
            const labelY =
              index % 2 === 0 ? stripTop - 8 : stripBottom + 30;

            return (
              <g key={`${transition.id}-label`}>
                <line
                  x1={x}
                  x2={x}
                  y1={index % 2 === 0 ? stripTop : stripBottom}
                  y2={labelY - (index % 2 === 0 ? -4 : 6)}
                  stroke="rgba(15,28,36,0.14)"
                  strokeDasharray="4 4"
                />
                <text
                  x={x}
                  y={labelY}
                  textAnchor="middle"
                  className="fill-ink-600 text-[9px] font-semibold"
                >
                  {frame.absorptionMode
                    ? transition.absorptionLabel
                    : transition.label}
                </text>
                <text
                  x={x}
                  y={labelY + 10}
                  textAnchor="middle"
                  className="fill-ink-500 text-[9px]"
                >
                  {formatNumber(transition.wavelengthNm)} nm
                </text>
              </g>
            );
          })}
        </g>
      ) : null}
      {showModeLock ? (
        <g pointerEvents="none" opacity={modeOpacity}>
          <rect
            x={SPECTRUM_LEFT + 10}
            y={stripTop + SPECTRUM_HEIGHT + 28}
            width="196"
            height="38"
            rx="14"
            fill="rgba(255,253,247,0.94)"
            stroke="rgba(15,28,36,0.08)"
          />
          <text
            x={SPECTRUM_LEFT + 22}
            y={stripTop + SPECTRUM_HEIGHT + 43}
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
          >
            same gaps, same wavelengths
          </text>
          <text
            x={SPECTRUM_LEFT + 22}
            y={stripTop + SPECTRUM_HEIGHT + 57}
            className="fill-ink-600 text-[10px]"
          >
            Mode changes bright peaks into dark notches.
          </text>
        </g>
      ) : null}
    </g>
  );
}

function renderTransitionLink(
  frame: ReturnType<typeof sampleAtomicSpectraState>,
  rowCenter: number,
  focusedOverlayId?: string | null,
  enabled = true,
) {
  if (!enabled) {
    return null;
  }

  const opacity = resolveOverlayOpacity(focusedOverlayId, "transitionPairs", 0.42);
  const maxEnergy = frame.levelEnergiesEv[3] + 0.7;
  const levelTop = rowCenter - 64;
  const levelBottom = rowCenter + 70;
  const levelY = (energyEv: number) =>
    levelBottom - (energyEv / Math.max(maxEnergy, 1e-6)) * (levelBottom - levelTop);
  const transition = frame.activeTransition;
  const upperEnergy = frame.levelEnergiesEv[transition.fromLevel - 1];
  const lowerEnergy = frame.levelEnergiesEv[transition.toLevel - 1];
  const ladderY = (levelY(upperEnergy) + levelY(lowerEnergy)) / 2;
  const ladderX = LADDER_RIGHT + 6;
  const lineX = spectrumX(transition.wavelengthNm);
  const spectrumY = rowCenter - 18;
  const photonStartX = frame.absorptionMode ? lineX : ladderX;
  const photonEndX = frame.absorptionMode ? ladderX : lineX;
  const photonX =
    photonStartX + (photonEndX - photonStartX) * frame.photonTravelFraction;
  const photonY =
    spectrumY + (ladderY - spectrumY) * frame.photonTravelFraction;

  return (
    <g pointerEvents="none" opacity={opacity}>
      <SvgArrow
        x1={ladderX}
        y1={ladderY}
        x2={lineX}
        y2={spectrumY}
        stroke={transition.lineColorHex}
        strokeWidth={2.6}
        dashed
      />
      <circle cx={photonX} cy={photonY} r="5.2" fill={transition.lineColorHex} />
      <rect
        x={LADDER_RIGHT + 28}
        y={rowCenter - 84}
        width="166"
        height="44"
        rx="14"
        fill="rgba(255,253,247,0.94)"
        stroke="rgba(15,28,36,0.08)"
      />
      <text
        x={LADDER_RIGHT + 40}
        y={rowCenter - 66}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        active line mapping
      </text>
      <text x={LADDER_RIGHT + 40} y={rowCenter - 52} className="fill-ink-700 text-[10px]">
        {frame.absorptionMode ? transition.absorptionLabel : transition.label}
      </text>
      <text x={LADDER_RIGHT + 114} y={rowCenter - 52} className="fill-ink-500 text-[10px]">
        {formatMeasurement(transition.energyEv, "eV")}
      </text>
      <text x={LADDER_RIGHT + 40} y={rowCenter - 38} className="fill-ink-600 text-[10px]">
        {formatMeasurement(transition.wavelengthNm, "nm")} in the spectrum
      </text>
    </g>
  );
}

function renderRow(
  frame: ReturnType<typeof sampleAtomicSpectraState>,
  rowCenter: number,
  options: {
    label: string;
    compareBadge?: string;
    overlayValues?: Record<string, boolean>;
    focusedOverlayId?: string | null;
    muted?: boolean;
  },
) {
  const top = rowCenter - ROW_HALF_HEIGHT;
  const bottom = rowCenter + ROW_HALF_HEIGHT;
  const showTransitionPairs = options.overlayValues?.transitionPairs ?? true;

  return (
    <g opacity={options.muted ? 0.34 : 1}>
      <rect
        x={ROW_LEFT}
        y={top}
        width={ROW_RIGHT - ROW_LEFT}
        height={bottom - top}
        rx="24"
        fill="rgba(255,253,247,0.86)"
        stroke="rgba(15,28,36,0.08)"
        strokeWidth="1.5"
      />
      <text
        x={ROW_LEFT + 16}
        y={top + 20}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        {options.label}
      </text>
      <text
        x={ROW_RIGHT - 16}
        y={top + 20}
        textAnchor="end"
        className="fill-ink-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        {options.compareBadge ?? `${frame.modeLabel} mode`}
      </text>
      {renderEnergyLadder(frame, rowCenter, options)}
      {renderSpectrumStrip(frame, rowCenter, options)}
      {renderTransitionLink(
        frame,
        rowCenter,
        options.focusedOverlayId,
        showTransitionPairs,
      )}
    </g>
  );
}

function buildPreviewBadge(graphPreview: GraphStagePreview | null) {
  if (!graphPreview || graphPreview.kind !== "response" || graphPreview.graphId !== "spectrum-lines") {
    return null;
  }

  return (
    <SimulationPreviewBadge tone="sky">
      preview lambda = {formatNumber(graphPreview.point.x)} nm
    </SimulationPreviewBadge>
  );
}

function formatCompareSummary(frame: ReturnType<typeof sampleAtomicSpectraState>) {
  const anchorWavelength =
    frame.longestVisibleWavelengthNm ?? frame.activeTransition.wavelengthNm;

  return `${frame.modeLabel.toLowerCase()} / ${formatNumber(anchorWavelength)} nm`;
}

export function AtomicSpectraSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: AtomicSpectraSimulationProps) {
  const activeFrame = buildFrame(params, time, graphPreview);
  const frameA = compare
    ? buildFrame(compare.setupA, time, graphPreview?.setup === "a" ? graphPreview : null)
    : null;
  const frameB = compare
    ? buildFrame(compare.setupB, time, graphPreview?.setup === "b" ? graphPreview : null)
    : null;
  const { compareEnabled, previewedSetup, primaryFrame, primaryLabel, secondaryLabel } =
    resolveCompareScene({
      compare,
      graphPreview,
      activeFrame,
      frameA,
      frameB,
      liveLabel: "Live setup",
    });
  const previewBadge = buildPreviewBadge(graphPreview ?? null);
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? "Setup A")}: {formatCompareSummary(frameA!)}
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: {formatCompareSummary(frameB!)}
      </span>
    </div>
  ) : null;
  const metricRows = [
    { label: "mode", value: primaryFrame.modeLabel },
    {
      label: "active pair",
      value: primaryFrame.absorptionMode
        ? primaryFrame.activeTransition.absorptionLabel
        : primaryFrame.activeTransition.label,
    },
    {
      label: "DeltaE",
      value: formatMeasurement(primaryFrame.activeTransition.energyEv, "eV"),
    },
    {
      label: "lambda",
      value: formatMeasurement(primaryFrame.activeTransition.wavelengthNm, "nm"),
    },
    { label: "visible", value: `${primaryFrame.visibleLineCount}` },
    {
      label: "red edge",
      value:
        primaryFrame.longestVisibleWavelengthNm !== null
          ? formatMeasurement(primaryFrame.longestVisibleWavelengthNm, "nm")
          : "none",
    },
    {
      label: "blue edge",
      value:
        primaryFrame.shortestVisibleWavelengthNm !== null
          ? formatMeasurement(primaryFrame.shortestVisibleWavelengthNm, "nm")
          : "none",
    },
    {
      label: "min gap",
      value:
        primaryFrame.visibleLineCount >= 2
          ? formatMeasurement(primaryFrame.minVisibleSeparationNm, "nm")
          : "n/a",
    },
  ];
  const noteLines = [
    `${primaryFrame.modeLabel} keeps the same wavelengths but changes whether each line is bright or dark.`,
    `The current visible pattern spans ${primaryFrame.visibleLineCount} lines.`,
    "This ladder is a bounded precursor to a later Bohr-style level model.",
  ];

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(99,102,241,0.1),rgba(245,158,11,0.1),rgba(30,166,162,0.08))]"
      headerAside={
        <>
          {previewBadge}
          {compareEnabled ? (
            <CompareLegend primaryLabel={primaryLabel} secondaryLabel={secondaryLabel} />
          ) : (
            <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-600">
              {primaryLabel}
            </span>
          )}
          {compareBadges}
        </>
      }
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
      >
        <defs>
          <linearGradient id="atomic-visible-band" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="22%" stopColor="#2563eb" />
            <stop offset="44%" stopColor="#0891b2" />
            <stop offset="62%" stopColor="#16a34a" />
            <stop offset="80%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.48)" />
        {compareEnabled ? (
          <>
            {renderRow(frameA!, COMPARE_ROW_CENTERS.a, {
              label: compare?.labelA ?? "Setup A",
              compareBadge: compare?.activeTarget === "a" ? "editing" : "locked",
              overlayValues,
              focusedOverlayId,
              muted: previewedSetup === "b",
            })}
            {renderRow(frameB!, COMPARE_ROW_CENTERS.b, {
              label: compare?.labelB ?? "Setup B",
              compareBadge: compare?.activeTarget === "b" ? "editing" : "locked",
              overlayValues,
              focusedOverlayId,
              muted: previewedSetup === "a",
            })}
          </>
        ) : (
          renderRow(activeFrame, SINGLE_ROW_CENTER, {
            label: "Live line-spectrum bench",
            overlayValues,
            focusedOverlayId,
          })
        )}
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Line state"
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={noteLines}
        />
      </svg>
    </SimulationSceneCard>
  );
}
