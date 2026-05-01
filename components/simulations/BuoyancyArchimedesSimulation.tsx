"use client";

import { useLocale } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import {
  BUOYANCY_ARCHIMEDES_MAX_BOTTOM_DEPTH,
  BUOYANCY_ARCHIMEDES_MAX_FLUID_DENSITY,
  BUOYANCY_ARCHIMEDES_MAX_GRAVITY,
  BUOYANCY_ARCHIMEDES_MIN_BOTTOM_DEPTH,
  formatMeasurement,
  formatNumber,
  sampleBuoyancyArchimedesState,
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

type BuoyancyArchimedesSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 940;
const HEIGHT = 430;
const TANK_X = 52;
const TANK_Y = 70;
const TANK_WIDTH = 448;
const TANK_HEIGHT = 292;
const FLUID_TOP = 106;
const FLUID_BOTTOM = TANK_Y + TANK_HEIGHT - 20;
const FLUID_HEIGHT = FLUID_BOTTOM - FLUID_TOP;
const OBJECT_SCALE = FLUID_HEIGHT / BUOYANCY_ARCHIMEDES_MAX_BOTTOM_DEPTH;
const OBJECT_HEIGHT_PX = OBJECT_SCALE;
const OBJECT_WIDTH_PX = 102;
const OBJECT_X = TANK_X + TANK_WIDTH * 0.45 - OBJECT_WIDTH_PX / 2;
const COLUMN_X = TANK_X + TANK_WIDTH + 34;
const COLUMN_WIDTH = 74;
const COLUMN_Y = FLUID_TOP + 36;
const COLUMN_HEIGHT = OBJECT_HEIGHT_PX;
const CARD_WIDTH = 250;
const CARD_X = WIDTH - CARD_WIDTH - 22;
const CARD_Y = 22;
const MAX_PRESSURE_KPA =
  (BUOYANCY_ARCHIMEDES_MAX_FLUID_DENSITY *
    BUOYANCY_ARCHIMEDES_MAX_GRAVITY *
    BUOYANCY_ARCHIMEDES_MAX_BOTTOM_DEPTH) /
  1000;

function measureChipWidth(text: string) {
  return Math.max(84, text.length * 6.8 + 18);
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

  if (preview.graphId === "force-depth") {
    return {
      ...source,
      bottomDepth: preview.point.x,
    };
  }

  if (preview.graphId === "force-fluid-density") {
    return {
      ...source,
      fluidDensity: preview.point.x,
    };
  }

  if (preview.graphId === "required-fraction-object-density") {
    return {
      ...source,
      objectDensity: preview.point.x,
    };
  }

  return source;
}

function resolveFrame(
  source: SimulationParams,
  graphPreview?: GraphStagePreview | null,
) {
  return sampleBuoyancyArchimedesState(buildPreviewSource(source, graphPreview));
}

function resolveBottomY(bottomDepth: number) {
  const ratio =
    (bottomDepth - BUOYANCY_ARCHIMEDES_MIN_BOTTOM_DEPTH) /
    (BUOYANCY_ARCHIMEDES_MAX_BOTTOM_DEPTH - BUOYANCY_ARCHIMEDES_MIN_BOTTOM_DEPTH);
  return FLUID_TOP + ratio * FLUID_HEIGHT;
}

function resolvePreviewBadge(
  preview: GraphStagePreview | null | undefined,
  isZhHk: boolean,
) {
  if (!preview || preview.kind !== "response") {
    return null;
  }

  if (preview.graphId === "force-depth") {
    return isZhHk
      ? `預覽底部深度 = ${formatMeasurement(preview.point.x, "m")}`
      : `preview bottom depth = ${formatMeasurement(preview.point.x, "m")}`;
  }

  if (preview.graphId === "force-fluid-density") {
    return isZhHk
      ? `預覽 ρ_fluid = ${formatMeasurement(preview.point.x, "kg/m^3")}`
      : `preview rho_fluid = ${formatMeasurement(preview.point.x, "kg/m^3")}`;
  }

  if (preview.graphId === "required-fraction-object-density") {
    return isZhHk
      ? `預覽 ρ_obj = ${formatMeasurement(preview.point.x, "kg/m^3")}`
      : `preview rho_obj = ${formatMeasurement(preview.point.x, "kg/m^3")}`;
  }

  return null;
}

function formatSupportLabel(
  frame: ReturnType<typeof sampleBuoyancyArchimedesState>,
  isZhHk: boolean,
) {
  if (frame.supportState === "balanced") {
    return "0 N";
  }

  if (frame.supportState === "upward-support") {
    return isZhHk
      ? `${formatNumber(frame.supportForce)} N 向上`
      : `${formatNumber(frame.supportForce)} N up`;
  }

  return isZhHk
    ? `${formatNumber(Math.abs(frame.supportForce))} N 向下`
    : `${formatNumber(Math.abs(frame.supportForce))} N down`;
}

function renderBench(
  frame: ReturnType<typeof sampleBuoyancyArchimedesState>,
  overlayState: Record<string, boolean>,
  focusedOverlayId: string | null | undefined,
  isZhHk: boolean,
  options?: { muted?: boolean; dashed?: boolean; offsetX?: number; offsetY?: number },
) {
  const { muted = false, dashed = false, offsetX = 0, offsetY = 0 } = options ?? {};
  const bottomY = resolveBottomY(frame.bottomDepth);
  const topY = bottomY - OBJECT_HEIGHT_PX;
  const submergedHeightPx = frame.submergedHeight * OBJECT_SCALE;
  const submergedTopY = bottomY - submergedHeightPx;
  const equilibriumY = resolveBottomY(frame.equilibriumBottomDepthClamped);
  const buoyantArrowLength = 34 + frame.buoyantForceRatio * 38;
  const weightArrowLength = 34 + frame.weightRatio * 38;
  const supportArrowLength = 26 + frame.netForceRatio * 30;
  const topPressureArrowLength = 10 + (frame.topPressure / MAX_PRESSURE_KPA) * 22;
  const bottomPressureArrowLength = 10 + (frame.bottomPressure / MAX_PRESSURE_KPA) * 22;
  const fillTone = muted ? "rgba(255,255,255,0.46)" : "rgba(255,255,255,0.94)";
  const shellStroke = muted ? "rgba(15,28,36,0.18)" : "rgba(15,28,36,0.12)";

  return (
    <g transform={`translate(${offsetX} ${offsetY})`} opacity={muted ? 0.62 : 1}>
      <rect
        x={TANK_X - 18}
        y={TANK_Y - 18}
        width={TANK_WIDTH + 192}
        height={TANK_HEIGHT + 38}
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
        {isZhHk ? "浮力實驗台" : "Buoyancy bench"}
      </text>
      <text
        x={TANK_X}
        y={TANK_Y - 8}
        className="fill-ink-950 text-[15px] font-semibold"
      >
        {frame.supportState === "balanced"
          ? isZhHk
            ? "在這個深度，重力與浮力已經平衡"
            : "Weight and buoyancy are balanced at this depth"
          : frame.supportState === "downward-hold"
            ? isZhHk
              ? "要維持這個深度，需要向下施力固定"
              : "This depth needs a downward hold to stay put"
            : isZhHk
              ? "在這個深度，仍需要向上支撐"
              : "This depth still needs upward support"}
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
        fill={muted ? "rgba(78,166,223,0.12)" : "rgba(78,166,223,0.18)"}
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
        stroke={muted ? "rgba(21,122,118,0.28)" : "rgba(21,122,118,0.52)"}
        strokeWidth="3"
        strokeDasharray={dashed ? "7 4" : undefined}
      />

      <rect
        x={OBJECT_X}
        y={topY}
        width={OBJECT_WIDTH_PX}
        height={OBJECT_HEIGHT_PX}
        rx="18"
        fill={muted ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.98)"}
        stroke={muted ? "rgba(15,28,36,0.26)" : "rgba(15,28,36,0.18)"}
        strokeWidth="2.6"
        strokeDasharray={dashed ? "6 4" : undefined}
      />
      <rect
        x={OBJECT_X + 8}
        y={submergedTopY}
        width={OBJECT_WIDTH_PX - 16}
        height={submergedHeightPx}
        rx="14"
        fill={muted ? "rgba(30,166,162,0.14)" : "rgba(30,166,162,0.2)"}
      />
      <rect
        x={OBJECT_X + 16}
        y={topY + 18}
        width={OBJECT_WIDTH_PX - 32}
        height="18"
        rx="9"
        fill={muted ? "rgba(15,28,36,0.06)" : "rgba(15,28,36,0.08)"}
      />
      {drawChip({
        x: OBJECT_X + OBJECT_WIDTH_PX / 2,
        y: topY + 56,
        text: `rho_obj = ${formatNumber(frame.objectDensity)} kg/m^3`,
        tone: "coral",
        dashed,
      })}

      {(overlayState.equilibriumLine ?? true) ? (
        <g opacity={resolveOverlayOpacity(focusedOverlayId, "equilibriumLine", 0.34)}>
          {frame.canFloat ? (
            <>
              <line
                x1={TANK_X + 12}
                x2={TANK_X + TANK_WIDTH - 12}
                y1={equilibriumY}
                y2={equilibriumY}
                stroke={muted ? "rgba(240,171,60,0.34)" : "rgba(240,171,60,0.62)"}
                strokeWidth="2"
                strokeDasharray="8 6"
              />
              <text
                x={TANK_X + 16}
                y={equilibriumY - 10}
                className="fill-amber-700 text-[11px] font-semibold"
              >
                {isZhHk ? "自由漂浮平衡" : "free-float balance"}
              </text>
              {drawChip({
                x: TANK_X + 176,
                y: equilibriumY + 18,
                text: isZhHk
                  ? `需要浸沒全高的 ${formatNumber(frame.requiredSubmergedFraction)}`
                  : `needs ${formatNumber(frame.requiredSubmergedFraction)} of full height`,
                tone: "amber",
                dashed,
              })}
            </>
          ) : (
            drawChip({
              x: TANK_X + 212,
              y: FLUID_BOTTOM - 26,
              text: isZhHk ? "即使完全浸沒仍然不足夠" : "full submersion still is not enough",
              tone: "amber",
              dashed,
            })
          )}
        </g>
      ) : null}

      {(overlayState.displacedFluid ?? true) ? (
        <g opacity={resolveOverlayOpacity(focusedOverlayId, "displacedFluid", 0.34)}>
          <rect
            x={COLUMN_X}
            y={COLUMN_Y}
            width={COLUMN_WIDTH}
            height={COLUMN_HEIGHT}
            rx="18"
            fill={muted ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.96)"}
            stroke={muted ? "rgba(15,28,36,0.22)" : "rgba(15,28,36,0.16)"}
            strokeDasharray={dashed ? "6 4" : undefined}
          />
          <rect
            x={COLUMN_X + 8}
            y={COLUMN_Y + COLUMN_HEIGHT - submergedHeightPx}
            width={COLUMN_WIDTH - 16}
            height={submergedHeightPx}
            rx="14"
            fill={muted ? "rgba(78,166,223,0.2)" : "rgba(78,166,223,0.28)"}
          />
          <line
            x1={COLUMN_X + 10}
            x2={COLUMN_X + COLUMN_WIDTH - 10}
            y1={COLUMN_Y + COLUMN_HEIGHT - submergedHeightPx}
            y2={COLUMN_Y + COLUMN_HEIGHT - submergedHeightPx}
            stroke={muted ? "rgba(21,122,118,0.3)" : "rgba(21,122,118,0.56)"}
            strokeWidth="2"
            strokeDasharray="7 5"
          />
          <text
            x={COLUMN_X - 4}
            y={COLUMN_Y - 14}
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            {isZhHk ? "排開流體" : "Displaced fluid"}
          </text>
          {drawChip({
            x: COLUMN_X + COLUMN_WIDTH / 2,
            y: COLUMN_Y + COLUMN_HEIGHT + 20,
            text: `V_disp = ${formatNumber(frame.displacedVolume)} m^3`,
            tone: "sky",
            dashed,
          })}
          {drawChip({
            x: COLUMN_X + COLUMN_WIDTH / 2,
            y: COLUMN_Y - 4,
            text: isZhHk
              ? `同重流體 => ${formatNumber(frame.buoyantForce)} N`
              : `same fluid weight => ${formatNumber(frame.buoyantForce)} N`,
            tone: "teal",
            dashed,
          })}
        </g>
      ) : null}

      {(overlayState.forceBalance ?? true) ? (
        <g opacity={resolveOverlayOpacity(focusedOverlayId, "forceBalance", 0.34)}>
          {drawArrow({
            x1: OBJECT_X + OBJECT_WIDTH_PX / 2,
            y1: topY - weightArrowLength - 12,
            x2: OBJECT_X + OBJECT_WIDTH_PX / 2,
            y2: topY - 8,
            color: muted ? "rgba(241,102,89,0.42)" : "#f16659",
            dashed,
          })}
          {drawChip({
            x: OBJECT_X + OBJECT_WIDTH_PX / 2,
            y: topY - weightArrowLength - 28,
            text: `W = ${formatNumber(frame.weight)} N`,
            tone: "coral",
            dashed,
          })}
          {drawArrow({
            x1: OBJECT_X + OBJECT_WIDTH_PX / 2,
            y1: bottomY + 8,
            x2: OBJECT_X + OBJECT_WIDTH_PX / 2,
            y2: bottomY + buoyantArrowLength + 12,
            color: muted ? "rgba(21,122,118,0.42)" : "#157a76",
            dashed,
          })}
          {drawChip({
            x: OBJECT_X + OBJECT_WIDTH_PX / 2,
            y: bottomY + buoyantArrowLength + 28,
            text: `F_b = ${formatNumber(frame.buoyantForce)} N`,
            tone: "teal",
            dashed,
          })}
          {frame.supportState !== "balanced"
            ? drawArrow({
                x1: OBJECT_X + OBJECT_WIDTH_PX + 36,
                y1: topY + OBJECT_HEIGHT_PX / 2,
                x2: OBJECT_X + OBJECT_WIDTH_PX + 36,
                y2:
                  topY +
                  OBJECT_HEIGHT_PX / 2 +
                  (frame.supportState === "upward-support"
                    ? -supportArrowLength
                    : supportArrowLength),
                color: muted ? "rgba(15,28,36,0.34)" : "#0f1c24",
                dashed,
                strokeWidth: 2.4,
              })
            : null}
          {frame.supportState !== "balanced"
            ? drawChip({
                x: OBJECT_X + OBJECT_WIDTH_PX + 94,
                y: topY + OBJECT_HEIGHT_PX / 2,
                text:
                  frame.supportState === "upward-support"
                    ? isZhHk
                      ? `${formatNumber(frame.supportForce)} N 向上`
                      : `${formatNumber(frame.supportForce)} N up`
                    : isZhHk
                      ? `${formatNumber(Math.abs(frame.supportForce))} N 向下`
                      : `${formatNumber(Math.abs(frame.supportForce))} N down`,
                tone: "ink",
                dashed,
              })
            : null}
        </g>
      ) : null}

      {(overlayState.pressureDifference ?? false) ? (
        <g opacity={resolveOverlayOpacity(focusedOverlayId, "pressureDifference", 0.34)}>
          {drawArrow({
            x1: OBJECT_X - topPressureArrowLength - 14,
            y1: submergedTopY,
            x2: OBJECT_X - 6,
            y2: submergedTopY,
            color: muted ? "rgba(29,111,159,0.36)" : "#1d6f9f",
            dashed,
            strokeWidth: 2.4,
          })}
          {drawArrow({
            x1: OBJECT_X - bottomPressureArrowLength - 14,
            y1: bottomY - 2,
            x2: OBJECT_X - 6,
            y2: bottomY - 2,
            color: muted ? "rgba(29,111,159,0.36)" : "#1d6f9f",
            dashed,
            strokeWidth: 2.4,
          })}
          {drawChip({
            x: OBJECT_X - 96,
            y: submergedTopY - 16,
            text: isZhHk
              ? `上方 = ${formatNumber(frame.topPressure)} kPa`
              : `top = ${formatNumber(frame.topPressure)} kPa`,
            tone: "sky",
            dashed,
          })}
          {drawChip({
            x: OBJECT_X - 108,
            y: bottomY + 20,
            text: isZhHk
              ? `下方 = ${formatNumber(frame.bottomPressure)} kPa`
              : `bottom = ${formatNumber(frame.bottomPressure)} kPa`,
            tone: "sky",
            dashed,
          })}
          {drawChip({
            x: OBJECT_X + OBJECT_WIDTH_PX / 2,
            y: bottomY - OBJECT_HEIGHT_PX / 2,
            text: `Delta P = ${formatNumber(frame.pressureDifference)} kPa`,
            tone: "ink",
            dashed,
          })}
        </g>
      ) : null}

      {drawChip({
        x: TANK_X + 118,
        y: FLUID_BOTTOM + 18,
        text: `rho_fluid = ${formatNumber(frame.fluidDensity)} kg/m^3`,
        tone: "amber",
        dashed,
      })}
      {drawChip({
        x: TANK_X + 326,
        y: FLUID_BOTTOM + 18,
        text: `g = ${formatNumber(frame.gravity)} m/s^2`,
        tone: "ink",
        dashed,
      })}
      {drawChip({
        x: TANK_X + 502,
        y: FLUID_BOTTOM + 18,
        text: isZhHk
          ? `浸沒比例 = 全高的 ${formatNumber(frame.submergedFraction)}`
          : `submerged = ${formatNumber(frame.submergedFraction)} of full height`,
        tone: "teal",
        dashed,
      })}

      <text
        x={TANK_X}
        y={HEIGHT - 20}
        className="fill-ink-600 text-[12px]"
      >
        {isZhHk
          ? "浮力跟隨排開流體而變。一旦整個方塊完全浸沒，再放得更深只會改變壓力讀數，不會改變排開體積。"
          : "Buoyant force tracks displaced fluid. Once the full block is under the surface, deeper placement changes the pressures but not the displaced volume."}
      </text>
    </g>
  );
}

export function BuoyancyArchimedesSimulation({
  concept,
  params,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: BuoyancyArchimedesSimulationProps) {
  const locale = useLocale() as AppLocale;
  const isZhHk = locale === "zh-HK";
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
  const previewBadgeText = resolvePreviewBadge(graphPreview, isZhHk);
  const overlayState = {
    forceBalance: overlayValues?.forceBalance ?? true,
    displacedFluid: overlayValues?.displacedFluid ?? true,
    equilibriumLine: overlayValues?.equilibriumLine ?? true,
    pressureDifference: overlayValues?.pressureDifference ?? false,
  };
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? (isZhHk ? "設定 A" : "Setup A"))}: Fb {formatNumber(frameA?.buoyantForce ?? 0)} N, W{" "}
        {formatNumber(frameA?.weight ?? 0)} N
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? (isZhHk ? "設定 B" : "Setup B"))}: Fb {formatNumber(frameB?.buoyantForce ?? 0)} N, Vdisp{" "}
        {formatNumber(frameB?.displacedVolume ?? 0)} m^3
      </span>
    </div>
  ) : null;
  const balanceNote =
    primaryFrame.supportState === "balanced"
      ? isZhHk
        ? "這個狀態已經平衡，所以方塊毋須額外支撐也能停留在這裡。"
        : "This state is already balanced, so the block could stay here without extra support."
      : primaryFrame.supportState === "downward-hold"
        ? isZhHk
          ? "在這個深度，方塊的浮力過大，若沒有向下固定便無法停留。"
          : "At this depth the block is too buoyant to stay here without a downward hold."
        : isZhHk
          ? "在這個深度，方塊重量仍大於浮力，所以仍需要向上支撐。"
          : "At this depth the block still needs upward support because its weight is larger than the buoyant force.";
  const immersionNote = primaryFrame.fullySubmerged
    ? isZhHk
      ? "再放得更深會同時提高上下兩端的壓力讀數，但不會改變壓差或浮力。"
      : "Going deeper now raises both pressure readings but not the pressure difference or buoyant force."
    : isZhHk
      ? "讓方塊浸沒更多會排開更多流體，並增加浮力。"
      : "Submerging more of the block would displace more fluid and increase the buoyant force.";
  const metricRows = [
    { label: "rho_obj", value: formatMeasurement(primaryFrame.objectDensity, "kg/m^3") },
    { label: "rho_fluid", value: formatMeasurement(primaryFrame.fluidDensity, "kg/m^3") },
    { label: isZhHk ? "底部深度" : "bottom", value: formatMeasurement(primaryFrame.bottomDepth, "m") },
    { label: isZhHk ? "h_sub" : "h_sub", value: formatMeasurement(primaryFrame.submergedHeight, "m") },
    { label: "V_disp", value: formatMeasurement(primaryFrame.displacedVolume, "m^3") },
    { label: "W", value: formatMeasurement(primaryFrame.weight, "N") },
    { label: "F_b", value: formatMeasurement(primaryFrame.buoyantForce, "N") },
    { label: isZhHk ? "支撐" : "Support", value: formatSupportLabel(primaryFrame, isZhHk) },
  ];

  return (
    <SimulationSceneCard
      title={concept.title}
      description={
        isZhHk
          ? "把物體密度與流體密度對照，再把同一個方塊移得更深或更淺，讓浸沒體積、排開流體提示與受力平衡始終連在同一個靜態流體模型上。"
          : "Match object density against fluid density, then move the same block deeper or shallower. The submerged volume, displaced-fluid cue, and force balance stay tied to one static fluid model."
      }
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
            {renderBench(secondaryFrame, overlayState, focusedOverlayId, isZhHk, {
              muted: true,
              dashed: true,
              offsetX: 12,
              offsetY: 10,
            })}
            {drawChip({
              x: TANK_X + TANK_WIDTH - 12,
              y: TANK_Y - 22,
              text: `${secondaryLabel}${isZhHk ? " 參考影像" : " ghost"}`,
              tone: "ink",
              dashed: true,
            })}
          </>
        ) : null}
        {renderBench(primaryFrame, overlayState, focusedOverlayId, isZhHk)}
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel}${isZhHk ? " 浮力狀態" : " buoyancy state"}` : isZhHk ? "浮力狀態" : "Buoyancy state"}
          rows={metricRows}
          noteLines={[
            balanceNote,
            isZhHk
              ? "阿基米德原理：浮力等於排開流體的重量。"
              : "Archimedes' principle: the buoyant force equals the weight of the displaced fluid.",
            immersionNote,
          ]}
        />
      </svg>
    </SimulationSceneCard>
  );
}
