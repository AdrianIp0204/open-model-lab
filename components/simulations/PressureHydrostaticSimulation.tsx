"use client";

import {
  formatMeasurement,
  formatNumber,
  PRESSURE_HYDROSTATIC_MAX_AREA,
  PRESSURE_HYDROSTATIC_MAX_DEPTH,
  PRESSURE_HYDROSTATIC_MIN_AREA,
  PRESSURE_HYDROSTATIC_MIN_DEPTH,
  samplePressureHydrostaticState,
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

type PressureHydrostaticSimulationProps = {
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
const TANK_X = 58;
const TANK_Y = 68;
const TANK_WIDTH = 552;
const TANK_HEIGHT = 278;
const FLUID_TOP = 104;
const FLUID_BOTTOM = TANK_Y + TANK_HEIGHT - 18;
const FLUID_HEIGHT = FLUID_BOTTOM - FLUID_TOP;
const PISTON_HEIGHT = 28;
const CARD_WIDTH = 240;
const CARD_X = WIDTH - CARD_WIDTH - 22;
const CARD_Y = 22;
const PROBE_X = TANK_X + TANK_WIDTH * 0.64;

function measureChipWidth(text: string) {
  return Math.max(80, text.length * 6.6 + 18);
}

function drawChip(options: {
  x: number;
  y: number;
  text: string;
  tone?: "teal" | "coral" | "amber" | "sky" | "ink";
  dashed?: boolean;
}) {
  const { x, y, text, tone = "ink", dashed = false } = options;
  const palette = {
    teal: {
      fill: "rgba(30,166,162,0.14)",
      stroke: "rgba(21,122,118,0.28)",
      text: "#157a76",
    },
    coral: {
      fill: "rgba(241,102,89,0.14)",
      stroke: "rgba(177,66,52,0.28)",
      text: "#9f3a2c",
    },
    amber: {
      fill: "rgba(240,171,60,0.16)",
      stroke: "rgba(184,112,0,0.3)",
      text: "#8e5800",
    },
    sky: {
      fill: "rgba(78,166,223,0.14)",
      stroke: "rgba(29,111,159,0.28)",
      text: "#1d6f9f",
    },
    ink: {
      fill: "rgba(255,255,255,0.92)",
      stroke: "rgba(15,28,36,0.14)",
      text: "#0f1c24",
    },
  }[tone];
  const width = measureChipWidth(text);

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        x={-width / 2}
        y="-12"
        width={width}
        height="24"
        rx="12"
        fill={palette.fill}
        stroke={palette.stroke}
        strokeDasharray={dashed ? "5 4" : undefined}
      />
      <text
        x="0"
        y="4"
        textAnchor="middle"
        className="text-[10px] font-semibold"
        fill={palette.text}
      >
        {text}
      </text>
    </g>
  );
}

function drawArrow(options: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  dashed?: boolean;
  opacity?: number;
  strokeWidth?: number;
}) {
  const { x1, y1, x2, y2, color, dashed = false, opacity = 1, strokeWidth = 2.8 } = options;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);

  if (length < 1e-6) {
    return null;
  }

  const ux = dx / length;
  const uy = dy / length;
  const headSize = 9;
  const leftX = x2 - ux * headSize - uy * headSize * 0.55;
  const leftY = y2 - uy * headSize + ux * headSize * 0.55;
  const rightX = x2 - ux * headSize + uy * headSize * 0.55;
  const rightY = y2 - uy * headSize - ux * headSize * 0.55;

  return (
    <g opacity={opacity}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={dashed ? "6 4" : undefined}
      />
      <path
        d={`M ${x2} ${y2} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`}
        fill={color}
      />
    </g>
  );
}

function buildPreviewSource(
  source: SimulationParams,
  preview: GraphStagePreview | null | undefined,
) {
  if (!preview || preview.kind !== "response") {
    return source;
  }

  if (preview.graphId === "pressure-depth") {
    return {
      ...source,
      depth: preview.point.x,
    };
  }

  if (preview.graphId === "pressure-density") {
    return {
      ...source,
      density: preview.point.x,
    };
  }

  if (preview.graphId === "pressure-force") {
    return {
      ...source,
      force: preview.point.x,
    };
  }

  if (preview.graphId === "pressure-area") {
    return {
      ...source,
      area: preview.point.x,
    };
  }

  return source;
}

function resolveFrame(
  source: SimulationParams,
  graphPreview?: GraphStagePreview | null,
) {
  return samplePressureHydrostaticState(buildPreviewSource(source, graphPreview));
}

function resolveProbeY(depth: number) {
  const ratio =
    (depth - PRESSURE_HYDROSTATIC_MIN_DEPTH) /
    (PRESSURE_HYDROSTATIC_MAX_DEPTH - PRESSURE_HYDROSTATIC_MIN_DEPTH);
  return FLUID_TOP + ratio * FLUID_HEIGHT;
}

function resolvePistonWidth(area: number) {
  const ratio =
    (area - PRESSURE_HYDROSTATIC_MIN_AREA) /
    (PRESSURE_HYDROSTATIC_MAX_AREA - PRESSURE_HYDROSTATIC_MIN_AREA);
  return 158 + ratio * 208;
}

function resolvePreviewBadge(preview: GraphStagePreview | null | undefined) {
  if (!preview || preview.kind !== "response") {
    return null;
  }

  if (preview.graphId === "pressure-depth") {
    return `preview h = ${formatMeasurement(preview.point.x, "m")}`;
  }

  if (preview.graphId === "pressure-density") {
    return `preview rho = ${formatMeasurement(preview.point.x, "kg/m^3")}`;
  }

  if (preview.graphId === "pressure-force") {
    return `preview F = ${formatMeasurement(preview.point.x, "N")}`;
  }

  if (preview.graphId === "pressure-area") {
    return `preview A = ${formatMeasurement(preview.point.x, "m^2")}`;
  }

  return null;
}

function renderBench(
  frame: ReturnType<typeof samplePressureHydrostaticState>,
  overlayState: Record<string, boolean>,
  focusedOverlayId: string | null | undefined,
  options?: { muted?: boolean; dashed?: boolean; offsetX?: number; offsetY?: number },
) {
  const { muted = false, dashed = false, offsetX = 0, offsetY = 0 } = options ?? {};
  const probeY = resolveProbeY(frame.depth);
  const pistonWidth = resolvePistonWidth(frame.area);
  const pistonX = TANK_X + TANK_WIDTH / 2 - pistonWidth / 2;
  const pressureArrowLength = 16 + frame.totalPressureRatio * 34;
  const surfaceArrowLength = 26 + frame.surfacePressureRatio * 26;
  const densityTint = 0.16 + frame.densityRatio * 0.14;
  const shellStroke = muted ? "rgba(15,28,36,0.18)" : "rgba(15,28,36,0.12)";
  const fillTone = muted ? "rgba(255,255,255,0.44)" : "rgba(255,255,255,0.92)";

  return (
    <g transform={`translate(${offsetX} ${offsetY})`} opacity={muted ? 0.6 : 1}>
      <rect
        x={TANK_X - 18}
        y={TANK_Y - 18}
        width={TANK_WIDTH + 40}
        height={TANK_HEIGHT + 34}
        rx="28"
        fill={fillTone}
        stroke={shellStroke}
        strokeDasharray={dashed ? "8 6" : undefined}
      />
      <text
        x={TANK_X}
        y={TANK_Y - 28}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
      >
        Fluid bench
      </text>
      <text
        x={TANK_X}
        y={TANK_Y - 8}
        className="fill-ink-950 text-[15px] font-semibold"
      >
        {frame.dominantContribution === "hydrostatic"
          ? "Depth is setting most of the pressure here"
          : frame.dominantContribution === "surface"
            ? "The piston load is still the larger contribution"
            : "Surface load and depth are both easy to read"}
      </text>

      <path
        d={[
          `M ${TANK_X} ${TANK_Y + 10}`,
          `L ${TANK_X} ${FLUID_BOTTOM}`,
          `L ${TANK_X + TANK_WIDTH} ${FLUID_BOTTOM}`,
          `L ${TANK_X + TANK_WIDTH} ${TANK_Y + 10}`,
        ].join(" ")}
        fill="none"
        stroke={shellStroke}
        strokeWidth="3"
        strokeDasharray={dashed ? "8 6" : undefined}
      />
      <rect
        x={TANK_X + 2}
        y={FLUID_TOP}
        width={TANK_WIDTH - 4}
        height={FLUID_HEIGHT + 4}
        rx="0"
        fill={`rgba(78,166,223,${muted ? densityTint * 0.45 : densityTint})`}
      />
      {Array.from({ length: 6 }, (_, index) => {
        const y = FLUID_TOP + ((index + 1) / 7) * FLUID_HEIGHT;
        const opacity = (0.08 + index * 0.04) * (muted ? 0.5 : 1);
        return (
          <line
            key={`fluid-band-${index}`}
            x1={TANK_X + 10}
            x2={TANK_X + TANK_WIDTH - 10}
            y1={y}
            y2={y}
            stroke={`rgba(15,28,36,${opacity})`}
            strokeWidth="1.6"
            strokeDasharray="10 8"
          />
        );
      })}
      <line
        x1={TANK_X + 2}
        x2={TANK_X + TANK_WIDTH - 2}
        y1={FLUID_TOP}
        y2={FLUID_TOP}
        stroke={muted ? "rgba(21,122,118,0.28)" : "rgba(21,122,118,0.5)"}
        strokeWidth="3"
        strokeDasharray={dashed ? "7 4" : undefined}
      />

      <rect
        x={pistonX}
        y={FLUID_TOP - PISTON_HEIGHT}
        width={pistonWidth}
        height={PISTON_HEIGHT}
        rx="10"
        fill={muted ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.96)"}
        stroke={muted ? "rgba(15,28,36,0.2)" : "rgba(15,28,36,0.14)"}
        strokeDasharray={dashed ? "6 4" : undefined}
      />
      <rect
        x={pistonX + 18}
        y={FLUID_TOP - PISTON_HEIGHT - 12}
        width={Math.max(42, pistonWidth - 36)}
        height="12"
        rx="6"
        fill={muted ? "rgba(15,28,36,0.08)" : "rgba(15,28,36,0.1)"}
      />

      {(overlayState.surfaceLoad ?? true) ? (
        <g opacity={resolveOverlayOpacity(focusedOverlayId, "surfaceLoad", 0.34)}>
          {drawArrow({
            x1: TANK_X + TANK_WIDTH / 2,
            y1: FLUID_TOP - PISTON_HEIGHT - 38 - surfaceArrowLength,
            x2: TANK_X + TANK_WIDTH / 2,
            y2: FLUID_TOP - PISTON_HEIGHT - 10,
            color: muted ? "rgba(241,102,89,0.42)" : "#f16659",
            dashed,
          })}
          {drawChip({
            x: TANK_X + TANK_WIDTH / 2,
            y: FLUID_TOP - PISTON_HEIGHT - 54 - surfaceArrowLength,
            text: `F = ${formatNumber(frame.force)} N`,
            tone: "coral",
            dashed,
          })}
          <line
            x1={pistonX}
            x2={pistonX + pistonWidth}
            y1={FLUID_TOP + 16}
            y2={FLUID_TOP + 16}
            stroke={muted ? "rgba(78,166,223,0.34)" : "rgba(78,166,223,0.66)"}
            strokeWidth="2"
            strokeDasharray={dashed ? "6 4" : undefined}
          />
          <line
            x1={pistonX}
            x2={pistonX}
            y1={FLUID_TOP + 11}
            y2={FLUID_TOP + 21}
            stroke={muted ? "rgba(78,166,223,0.34)" : "rgba(78,166,223,0.66)"}
            strokeWidth="2"
          />
          <line
            x1={pistonX + pistonWidth}
            x2={pistonX + pistonWidth}
            y1={FLUID_TOP + 11}
            y2={FLUID_TOP + 21}
            stroke={muted ? "rgba(78,166,223,0.34)" : "rgba(78,166,223,0.66)"}
            strokeWidth="2"
          />
          {drawChip({
            x: TANK_X + TANK_WIDTH / 2,
            y: FLUID_TOP + 34,
            text: `A = ${formatNumber(frame.area)} m^2`,
            tone: "sky",
            dashed,
          })}
        </g>
      ) : null}

      {(overlayState.sameDepthLine ?? true) ? (
        <g opacity={resolveOverlayOpacity(focusedOverlayId, "sameDepthLine", 0.34)}>
          <line
            x1={TANK_X + 12}
            x2={TANK_X + TANK_WIDTH - 12}
            y1={probeY}
            y2={probeY}
            stroke={muted ? "rgba(30,166,162,0.3)" : "rgba(30,166,162,0.62)"}
            strokeWidth="2"
            strokeDasharray="8 6"
          />
          <text
            x={TANK_X + 16}
            y={probeY - 10}
            className="fill-teal-700 text-[11px] font-semibold"
          >
            same depth
          </text>
          {drawChip({
            x: TANK_X + 98,
            y: probeY + 18,
            text: `same P at this depth`,
            tone: "teal",
            dashed,
          })}
        </g>
      ) : null}

      {(overlayState.depthGuide ?? true) ? (
        <g opacity={resolveOverlayOpacity(focusedOverlayId, "depthGuide", 0.34)}>
          <line
            x1={TANK_X + TANK_WIDTH + 18}
            x2={TANK_X + TANK_WIDTH + 18}
            y1={FLUID_TOP}
            y2={probeY}
            stroke={muted ? "rgba(15,28,36,0.28)" : "rgba(15,28,36,0.58)"}
            strokeWidth="2.4"
            strokeDasharray="6 5"
          />
          <line
            x1={TANK_X + TANK_WIDTH + 10}
            x2={TANK_X + TANK_WIDTH + 26}
            y1={FLUID_TOP}
            y2={FLUID_TOP}
            stroke={muted ? "rgba(15,28,36,0.28)" : "rgba(15,28,36,0.58)"}
            strokeWidth="2.4"
          />
          <line
            x1={TANK_X + TANK_WIDTH + 10}
            x2={TANK_X + TANK_WIDTH + 26}
            y1={probeY}
            y2={probeY}
            stroke={muted ? "rgba(15,28,36,0.28)" : "rgba(15,28,36,0.58)"}
            strokeWidth="2.4"
          />
          {drawChip({
            x: TANK_X + TANK_WIDTH + 92,
            y: (FLUID_TOP + probeY) / 2,
            text: `h = ${formatNumber(frame.depth)} m`,
            tone: "ink",
            dashed,
          })}
        </g>
      ) : null}

      {(overlayState.pressureArrows ?? true) ? (
        <g opacity={resolveOverlayOpacity(focusedOverlayId, "pressureArrows", 0.34)}>
          {drawArrow({
            x1: PROBE_X,
            y1: probeY,
            x2: PROBE_X,
            y2: probeY - pressureArrowLength,
            color: muted ? "rgba(21,122,118,0.42)" : "#157a76",
            dashed,
            strokeWidth: 2.6,
          })}
          {drawArrow({
            x1: PROBE_X,
            y1: probeY,
            x2: PROBE_X,
            y2: probeY + pressureArrowLength,
            color: muted ? "rgba(21,122,118,0.42)" : "#157a76",
            dashed,
            strokeWidth: 2.6,
          })}
          {drawArrow({
            x1: PROBE_X,
            y1: probeY,
            x2: PROBE_X - pressureArrowLength,
            y2: probeY,
            color: muted ? "rgba(21,122,118,0.42)" : "#157a76",
            dashed,
            strokeWidth: 2.6,
          })}
          {drawArrow({
            x1: PROBE_X,
            y1: probeY,
            x2: PROBE_X + pressureArrowLength,
            y2: probeY,
            color: muted ? "rgba(21,122,118,0.42)" : "#157a76",
            dashed,
            strokeWidth: 2.6,
          })}
          {drawChip({
            x: PROBE_X,
            y: probeY - pressureArrowLength - 18,
            text: `P = ${formatNumber(frame.totalPressure)} kPa`,
            tone: "teal",
            dashed,
          })}
        </g>
      ) : null}

      <circle
        cx={PROBE_X}
        cy={probeY}
        r="9"
        fill="rgba(255,255,255,0.98)"
        stroke={muted ? "rgba(15,28,36,0.42)" : "#0f1c24"}
        strokeWidth="2.5"
        strokeDasharray={dashed ? "5 4" : undefined}
      />
      <circle
        cx={PROBE_X}
        cy={probeY}
        r="3.5"
        fill={muted ? "rgba(15,28,36,0.32)" : "rgba(15,28,36,0.76)"}
      />
      {drawChip({
        x: TANK_X + 96,
        y: FLUID_BOTTOM + 16,
        text: `rho = ${formatNumber(frame.density)} kg/m^3`,
        tone: "amber",
        dashed,
      })}
      {drawChip({
        x: TANK_X + 292,
        y: FLUID_BOTTOM + 16,
        text: `g = ${formatNumber(frame.gravity)} m/s^2`,
        tone: "sky",
        dashed,
      })}
      {drawChip({
        x: TANK_X + 498,
        y: FLUID_BOTTOM + 16,
        text: `dP/dh = ${formatNumber(frame.pressureGradient)} kPa/m`,
        tone: "ink",
        dashed,
      })}

      <text
        x={TANK_X}
        y={HEIGHT - 20}
        className="fill-ink-600 text-[12px]"
      >
        Same depth means the same fluid pressure. Deeper, denser, or stronger-gravity fluid gives a
        larger hydrostatic contribution.
      </text>
    </g>
  );
}

export function PressureHydrostaticSimulation({
  concept,
  params,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: PressureHydrostaticSimulationProps) {
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const activeFrame = resolveFrame(params, graphPreview);
  const frameA = compare
    ? resolveFrame(compare.setupA, previewedSetup === "a" ? graphPreview : null)
    : null;
  const frameB = compare
    ? resolveFrame(compare.setupB, previewedSetup === "b" ? graphPreview : null)
    : null;
  const { compareEnabled, primaryFrame, secondaryFrame, primaryLabel, secondaryLabel } =
    resolveCompareScene({
      compare,
      graphPreview,
      activeFrame,
      frameA,
      frameB,
    });
  const previewBadgeText = resolvePreviewBadge(graphPreview);
  const overlayState = {
    surfaceLoad: overlayValues?.surfaceLoad ?? true,
    depthGuide: overlayValues?.depthGuide ?? true,
    pressureArrows: overlayValues?.pressureArrows ?? true,
    sameDepthLine: overlayValues?.sameDepthLine ?? true,
  };
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? "Setup A")}: total {formatNumber(frameA?.totalPressure ?? 0)} kPa,
        surface {formatNumber(frameA?.surfacePressure ?? 0)} kPa
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: total {formatNumber(frameB?.totalPressure ?? 0)} kPa,
        hydro {formatNumber(frameB?.hydrostaticPressure ?? 0)} kPa
      </span>
    </div>
  ) : null;
  const contributionNote =
    primaryFrame.dominantContribution === "hydrostatic"
      ? "Most of the probe reading is coming from the fluid column above it."
      : primaryFrame.dominantContribution === "surface"
        ? "The piston load is doing most of the work, though depth still adds linearly."
        : "Surface loading and hydrostatic gain are both contributing visibly here.";
  const depthNote =
    primaryFrame.depth >= 1.6
      ? "That top-to-bottom pressure difference is the same seed idea used later for buoyancy."
      : "Moving 1 m deeper would add another rho g of pressure without changing the sideways position.";
  const metricRows = [
    { label: "F", value: formatMeasurement(primaryFrame.force, "N") },
    { label: "A", value: formatMeasurement(primaryFrame.area, "m^2") },
    { label: "P_surface", value: formatMeasurement(primaryFrame.surfacePressure, "kPa") },
    { label: "rho", value: formatMeasurement(primaryFrame.density, "kg/m^3") },
    { label: "g", value: formatMeasurement(primaryFrame.gravity, "m/s^2") },
    { label: "h", value: formatMeasurement(primaryFrame.depth, "m") },
    { label: "P_h", value: formatMeasurement(primaryFrame.hydrostaticPressure, "kPa") },
    { label: "P_total", value: formatMeasurement(primaryFrame.totalPressure, "kPa") },
  ];

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(78,166,223,0.14),rgba(30,166,162,0.12))]"
      headerAside={
        <>
          <CompareLegend primaryLabel={primaryLabel} secondaryLabel={secondaryLabel} />
          {compareBadges}
          {previewBadgeText ? (
            <SimulationPreviewBadge tone="teal">{previewBadgeText}</SimulationPreviewBadge>
          ) : null}
        </>
      }
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
      >
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.58)" />
        {secondaryFrame ? (
          <>
            {renderBench(secondaryFrame, overlayState, focusedOverlayId, {
              muted: true,
              dashed: true,
              offsetX: 12,
              offsetY: 10,
            })}
            {drawChip({
              x: TANK_X + TANK_WIDTH - 12,
              y: TANK_Y - 22,
              text: `${secondaryLabel} ghost`,
              tone: "ink",
              dashed: true,
            })}
          </>
        ) : null}
        {renderBench(primaryFrame, overlayState, focusedOverlayId)}
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel} pressure state` : "Pressure state"}
          rows={metricRows}
          noteLines={[
            contributionNote,
            `At the same depth, the pressure arrows stay equal in every direction.`,
            depthNote,
          ]}
        />
      </svg>
    </SimulationSceneCard>
  );
}
