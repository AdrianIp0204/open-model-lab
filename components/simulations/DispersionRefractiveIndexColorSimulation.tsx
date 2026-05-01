"use client";

import {
  DISPERSION_MAX_WAVELENGTH_NM,
  DISPERSION_MIN_WAVELENGTH_NM,
  clamp,
  formatMeasurement,
  formatNumber,
  sampleDispersionRefractiveIndexColorState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import { CompareLegend, resolveCompareScene, SimulationPreviewBadge } from "./primitives/compare";
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

type DispersionRefractiveIndexColorSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type Frame = {
  params: ReturnType<typeof clampWavelengthParams>;
  snapshot: ReturnType<typeof sampleDispersionRefractiveIndexColorState>;
};

const WIDTH = 920;
const HEIGHT = 430;
const CARD_WIDTH = 248;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const PRISM_TOP = { x: 394, y: 96 };
const PRISM_LEFT = { x: 318, y: 278 };
const PRISM_RIGHT = { x: 472, y: 278 };
const ENTRY = { x: 344, y: 188 };
const INSIDE_RUN = 94;
const OUTGOING_RUN = 280;
const SPREAD_MARKER_X = 792;
const DISPLAY_DEVIATION_SCALE = 2.2;

function clampWavelengthParams(source: SimulationParams, wavelengthOverride?: number) {
  return {
    wavelengthNm:
      wavelengthOverride === undefined
        ? Number(source.wavelengthNm ?? 550)
        : clamp(wavelengthOverride, DISPERSION_MIN_WAVELENGTH_NM, DISPERSION_MAX_WAVELENGTH_NM),
    referenceIndex: Number(source.referenceIndex ?? 1.52),
    dispersionStrength: Number(source.dispersionStrength ?? 0.02),
    prismAngle: Number(source.prismAngle ?? 18),
  };
}

function buildFrame(source: SimulationParams, wavelengthOverride?: number): Frame {
  const params = clampWavelengthParams(source, wavelengthOverride);

  return {
    params,
    snapshot: sampleDispersionRefractiveIndexColorState(params),
  };
}

function formatWavelength(value: number) {
  return `${formatNumber(value)} nm`;
}

function pointForOutgoingDeviation(deviationAngle: number) {
  const slope =
    Math.tan((deviationAngle * Math.PI) / 180) * DISPLAY_DEVIATION_SCALE;
  const exit = {
    x: ENTRY.x + INSIDE_RUN,
    y: ENTRY.y + slope * (INSIDE_RUN * 0.5),
  };

  return {
    exit,
    end: {
      x: exit.x + OUTGOING_RUN,
      y: exit.y + slope * OUTGOING_RUN,
    },
  };
}

function renderPrism() {
  return (
    <g pointerEvents="none">
      <path
        d={`M ${PRISM_TOP.x} ${PRISM_TOP.y} L ${PRISM_LEFT.x} ${PRISM_LEFT.y} L ${PRISM_RIGHT.x} ${PRISM_RIGHT.y} Z`}
        fill="url(#dispersion-prism-fill)"
        stroke="rgba(15,28,36,0.16)"
        strokeWidth="2"
      />
      <text
        x={PRISM_TOP.x}
        y={PRISM_RIGHT.y + 18}
        textAnchor="middle"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        thin-prism sketch
      </text>
    </g>
  );
}

function renderBeamPath(
  frame: Frame,
  options: {
    label: string;
    color: string;
    dashed?: boolean;
    muted?: boolean;
  },
) {
  const opacity = options.muted ? 0.38 : 1;
  const strokeDasharray = options.dashed ? "8 6" : undefined;
  const path = pointForOutgoingDeviation(frame.snapshot.selectedDeviationAngle);

  return (
    <g opacity={opacity}>
      <line
        x1="92"
        x2={ENTRY.x}
        y1={ENTRY.y}
        y2={ENTRY.y}
        stroke={options.muted ? "rgba(15,28,36,0.32)" : "url(#incoming-white-beam)"}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
      />
      <line
        x1={ENTRY.x}
        x2={path.exit.x}
        y1={ENTRY.y}
        y2={path.exit.y}
        stroke={options.color}
        strokeWidth="4.4"
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
      />
      <line
        x1={path.exit.x}
        x2={path.end.x}
        y1={path.exit.y}
        y2={path.end.y}
        stroke={options.color}
        strokeWidth="4.4"
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
      />
      <circle cx={ENTRY.x} cy={ENTRY.y} r="4.6" fill={options.color} />
      <circle cx={path.exit.x} cy={path.exit.y} r="4.6" fill={options.color} />
      <text
        x={path.end.x - 8}
        y={path.end.y + (options.dashed ? 16 : -10)}
        textAnchor="end"
        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
        fill={options.color}
      >
        {options.label}
      </text>
    </g>
  );
}

function renderColorFan(frame: Frame, focusedOverlayId?: string | null, muted?: boolean) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "colorFan", 0.34) * (muted ? 0.55 : 1);
  const anchors = [frame.snapshot.red, frame.snapshot.green, frame.snapshot.violet];
  const redPath = pointForOutgoingDeviation(frame.snapshot.red.deviationAngle);
  const violetPath = pointForOutgoingDeviation(frame.snapshot.violet.deviationAngle);

  return (
    <g opacity={opacity} pointerEvents="none">
      {anchors.map((anchor) => {
        const path = pointForOutgoingDeviation(anchor.deviationAngle);

        return (
          <g key={anchor.id}>
            <line
              x1={path.exit.x}
              x2={path.end.x}
              y1={path.exit.y}
              y2={path.end.y}
              stroke={anchor.colorHex}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <text
              x={path.end.x - 16}
              y={path.end.y + (anchor.id === "red" ? -10 : anchor.id === "green" ? 5 : 18)}
              textAnchor="end"
              className="text-[10px] font-semibold uppercase tracking-[0.14em]"
              fill={anchor.colorHex}
            >
              {anchor.colorLabel}
            </text>
          </g>
        );
      })}
      <line
        x1={SPREAD_MARKER_X}
        x2={SPREAD_MARKER_X}
        y1={redPath.end.y}
        y2={violetPath.end.y}
        stroke="rgba(15,28,36,0.38)"
        strokeWidth="1.8"
        strokeDasharray="5 4"
      />
      <line
        x1={SPREAD_MARKER_X - 8}
        x2={SPREAD_MARKER_X + 8}
        y1={redPath.end.y}
        y2={redPath.end.y}
        stroke="rgba(15,28,36,0.38)"
        strokeWidth="1.8"
      />
      <line
        x1={SPREAD_MARKER_X - 8}
        x2={SPREAD_MARKER_X + 8}
        y1={violetPath.end.y}
        y2={violetPath.end.y}
        stroke="rgba(15,28,36,0.38)"
        strokeWidth="1.8"
      />
      <text
        x={SPREAD_MARKER_X + 14}
        y={(redPath.end.y + violetPath.end.y) / 2}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        delta delta ~= {formatMeasurement(frame.snapshot.spreadAngle, "deg")}
      </text>
    </g>
  );
}

function renderIndexGuide(frame: Frame, focusedOverlayId?: string | null) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "indexGuide", 0.38);

  return (
    <g opacity={opacity} pointerEvents="none">
      <rect
        x="74"
        y="64"
        width="214"
        height="88"
        rx="18"
        fill="rgba(255,253,247,0.93)"
        stroke="rgba(15,28,36,0.1)"
      />
      <text
        x="88"
        y="84"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        color-dependent index
      </text>
      <text x="88" y="102" className="text-[11px] font-semibold" fill={frame.snapshot.violet.colorHex}>
        violet: n ~= {formatNumber(frame.snapshot.violet.index)}
      </text>
      <text x="88" y="118" className="text-[11px] font-semibold" fill={frame.snapshot.green.colorHex}>
        green: n ~= {formatNumber(frame.snapshot.green.index)}
      </text>
      <text x="88" y="134" className="text-[11px] font-semibold" fill={frame.snapshot.red.colorHex}>
        red: n ~= {formatNumber(frame.snapshot.red.index)}
      </text>
      <text x="88" y="150" className="fill-ink-500 text-[10px]">
        shorter wavelength means larger n and larger bend
      </text>
    </g>
  );
}

function renderThinPrismGuide(frame: Frame, focusedOverlayId?: string | null) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "thinPrismGuide", 0.38);
  const path = pointForOutgoingDeviation(frame.snapshot.selectedDeviationAngle);

  return (
    <g opacity={opacity} pointerEvents="none">
      <line
        x1="92"
        x2={path.end.x}
        y1={ENTRY.y}
        y2={ENTRY.y}
        stroke="rgba(15,28,36,0.18)"
        strokeWidth="2"
        strokeDasharray="6 5"
      />
      <line
        x1={path.exit.x}
        x2={path.exit.x + 86}
        y1={path.exit.y}
        y2={path.exit.y + Math.tan((frame.snapshot.selectedDeviationAngle * Math.PI) / 180) * 86}
        stroke="rgba(240,171,60,0.72)"
        strokeWidth="2.4"
        strokeDasharray="6 5"
      />
      <text
        x={path.exit.x + 92}
        y={path.exit.y + 8}
        className="fill-amber-700 text-[11px] font-semibold"
      >
        delta ~= {formatMeasurement(frame.snapshot.selectedDeviationAngle, "deg")}
      </text>
      <text
        x="96"
        y={ENTRY.y - 12}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        thin prism: delta ~= [n(lambda) - 1] A
      </text>
    </g>
  );
}

export function DispersionRefractiveIndexColorSimulation({
  concept,
  params,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: DispersionRefractiveIndexColorSimulationProps) {
  const previewWavelength =
    graphPreview?.kind === "response"
      ? clamp(graphPreview.point.x, DISPERSION_MIN_WAVELENGTH_NM, DISPERSION_MAX_WAVELENGTH_NM)
      : undefined;
  const activeFrame = buildFrame(params, previewWavelength);
  const frameA = compare
    ? buildFrame(compare.setupA, graphPreview?.setup === "a" ? previewWavelength : undefined)
    : null;
  const frameB = compare
    ? buildFrame(compare.setupB, graphPreview?.setup === "b" ? previewWavelength : undefined)
    : null;
  const { compareEnabled, primaryFrame, secondaryFrame, primaryLabel, secondaryLabel } =
    resolveCompareScene({
      compare,
      graphPreview,
      activeFrame,
      frameA,
      frameB,
      liveLabel: "Live prism",
    });
  const previewBadge =
    graphPreview?.kind === "response" ? (
      <SimulationPreviewBadge tone="sky">
        preview lambda = {formatWavelength(previewWavelength ?? activeFrame.snapshot.wavelengthNm)}
      </SimulationPreviewBadge>
    ) : null;
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? "Setup A")}: n_ref {formatNumber(frameA!.snapshot.referenceIndex)} / D{" "}
        {formatNumber(frameA!.snapshot.dispersionStrength)} / A{" "}
        {formatMeasurement(frameA!.snapshot.prismAngle, "deg")}
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: n_ref {formatNumber(frameB!.snapshot.referenceIndex)} / D{" "}
        {formatNumber(frameB!.snapshot.dispersionStrength)} / A{" "}
        {formatMeasurement(frameB!.snapshot.prismAngle, "deg")}
      </span>
    </div>
  ) : null;

  const metricRows = [
    { label: "lambda_0", value: formatWavelength(primaryFrame.snapshot.wavelengthNm) },
    { label: "n_ref", value: formatNumber(primaryFrame.snapshot.referenceIndex) },
    { label: "D", value: formatNumber(primaryFrame.snapshot.dispersionStrength) },
    { label: "n(lambda)", value: formatNumber(primaryFrame.snapshot.selectedIndex) },
    {
      label: "delta(lambda)",
      value: formatMeasurement(primaryFrame.snapshot.selectedDeviationAngle, "deg"),
    },
    { label: "v/c", value: formatNumber(primaryFrame.snapshot.speedFractionC) },
    {
      label: "delta_v-r",
      value: formatMeasurement(primaryFrame.snapshot.spreadAngle, "deg"),
    },
    { label: "A", value: formatMeasurement(primaryFrame.snapshot.prismAngle, "deg") },
  ];
  const noteLines = [
    primaryFrame.snapshot.dispersionStrength <= 0.0005
      ? "D is near zero, so red through violet almost overlap even though the prism still bends the beam."
      : `${primaryFrame.snapshot.violet.colorLabel} leaves below ${primaryFrame.snapshot.red.colorLabel} because shorter wavelengths use the larger refractive index here.`,
    `Selected ${primaryFrame.snapshot.selectedColorLabel} ray: n(lambda) ~= ${formatNumber(primaryFrame.snapshot.selectedIndex)}.`,
    "This stage uses a bounded thin-prism approximation so the color spread and the response graphs stay tied to one compact model.",
  ];

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(78,166,223,0.1),rgba(240,171,60,0.08),rgba(241,102,89,0.08))]"
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
          <linearGradient id="dispersion-prism-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(78,166,223,0.2)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.88)" />
            <stop offset="100%" stopColor="rgba(240,171,60,0.18)" />
          </linearGradient>
          <linearGradient id="incoming-white-beam" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="35%" stopColor="#fef3c7" />
            <stop offset="68%" stopColor="#dbeafe" />
            <stop offset="100%" stopColor="#f8fafc" />
          </linearGradient>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.52)" />
        <rect x="38" y="34" width={WIDTH - 76} height={HEIGHT - 68} rx="28" fill="rgba(255,253,247,0.82)" />
        <text
          x="78"
          y="214"
          className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
        >
          incoming beam
        </text>
        {renderPrism()}
        {compareEnabled && secondaryFrame
          ? renderBeamPath(secondaryFrame, {
              label: secondaryLabel ?? "Setup B",
              color: secondaryFrame.snapshot.selectedColorHex,
              dashed: true,
              muted: true,
            })
          : null}
        {renderBeamPath(primaryFrame, {
          label: `${primaryLabel} ${primaryFrame.snapshot.selectedColorLabel}`,
          color: primaryFrame.snapshot.selectedColorHex,
        })}
        {(overlayValues?.colorFan ?? true) ? renderColorFan(primaryFrame, focusedOverlayId) : null}
        {(overlayValues?.indexGuide ?? true)
          ? renderIndexGuide(primaryFrame, focusedOverlayId)
          : null}
        {(overlayValues?.thinPrismGuide ?? false)
          ? renderThinPrismGuide(primaryFrame, focusedOverlayId)
          : null}
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Prism state"
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={noteLines}
        />
      </svg>
    </SimulationSceneCard>
  );
}
