"use client";

import { useRef } from "react";
import {
  clamp,
  formatMeasurement,
  formatNumber,
  sampleStaticEquilibriumCentreOfMassState,
  STATIC_EQUILIBRIUM_MAX_CARGO_POSITION,
  STATIC_EQUILIBRIUM_MAX_SUPPORT_CENTER,
  STATIC_EQUILIBRIUM_MIN_CARGO_POSITION,
  STATIC_EQUILIBRIUM_MIN_SUPPORT_CENTER,
  STATIC_EQUILIBRIUM_PLANK_HALF_LENGTH,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import { CompareLegend, resolveCompareScene, SimulationPreviewBadge } from "./primitives/compare";
import { resolveOverlayOpacity } from "./primitives/overlay";
import { SimulationSceneCard } from "./primitives/scene-card";
import { SvgCalloutBand, type SvgCalloutBandItem } from "./primitives/svg-callout-band";
import { useSvgPointerDrag } from "./primitives/useSvgPointerDrag";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type StaticEquilibriumCentreOfMassSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 860;
const HEIGHT = 360;
const STAGE_LEFT = 42;
const STAGE_RIGHT = 598;
const WORLD_MIN_X = -2.6;
const WORLD_MAX_X = 2.6;
const PLANK_TOP = 104;
const PLANK_HEIGHT = 18;
const PLANK_BOTTOM = PLANK_TOP + PLANK_HEIGHT;
const SUPPORT_CONTACT_Y = 164;
const SUPPORT_BASE_TOP = 214;
const SUPPORT_BASE_BOTTOM = 282;
const SUPPORT_BASE_WIDTH = 92;
const CARD_WIDTH = 224;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const HANDLE_KEYBOARD_STEP = 0.05;

function roundTo(value: number, precision = 2) {
  return Number(value.toFixed(precision));
}

function projectX(value: number) {
  return (
    STAGE_LEFT +
    ((value - WORLD_MIN_X) / (WORLD_MAX_X - WORLD_MIN_X)) * (STAGE_RIGHT - STAGE_LEFT)
  );
}

function invertX(svgX: number) {
  return (
    WORLD_MIN_X +
    ((svgX - STAGE_LEFT) / Math.max(STAGE_RIGHT - STAGE_LEFT, 1)) * (WORLD_MAX_X - WORLD_MIN_X)
  );
}

function arrowHeadPoints(startX: number, startY: number, endX: number, endY: number, size = 10) {
  const angle = Math.atan2(endY - startY, endX - startX);
  const left = angle + Math.PI * 0.82;
  const right = angle - Math.PI * 0.82;

  return `${endX},${endY} ${endX + Math.cos(left) * size},${endY + Math.sin(left) * size} ${endX + Math.cos(right) * size},${endY + Math.sin(right) * size}`;
}

function renderArrow(options: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  strokeWidth: number;
  opacity?: number;
  dashed?: boolean;
}) {
  const { startX, startY, endX, endY, color, strokeWidth, opacity = 1, dashed = false } = options;

  return (
    <g opacity={opacity}>
      <line
        x1={startX}
        x2={endX}
        y1={startY}
        y2={endY}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={dashed ? "8 6" : undefined}
      />
      <polygon points={arrowHeadPoints(startX, startY, endX, endY)} fill={color} />
    </g>
  );
}

function buildFrame(
  source: SimulationParams,
  preview?:
    | {
        cargoPosition?: number;
        supportCenter?: number;
      }
    | undefined,
) {
  return sampleStaticEquilibriumCentreOfMassState(source, preview);
}

function buildPreviewLabel(
  preview: GraphStagePreview | null | undefined,
  previewCargoPosition: number | undefined,
  previewSupportCenter: number | undefined,
) {
  if (!preview) {
    return null;
  }

  if (preview.graphId === "cargo-stability") {
    return (
      <SimulationPreviewBadge tone="sky">
        preview cargo x = {formatMeasurement(previewCargoPosition ?? 0, "m")}
      </SimulationPreviewBadge>
    );
  }

  return (
    <SimulationPreviewBadge tone="sky">
      preview support x = {formatMeasurement(previewSupportCenter ?? 0, "m")}
    </SimulationPreviewBadge>
  );
}

function buildSupportPolygonPoints(frame: ReturnType<typeof buildFrame>) {
  const left = projectX(frame.supportLeftEdge);
  const right = projectX(frame.supportRightEdge);
  const center = projectX(frame.supportCenter);
  const stemHalfWidth = Math.max(18, Math.min(38, (right - left) * 0.22));

  return `${left},${SUPPORT_CONTACT_Y} ${right},${SUPPORT_CONTACT_Y} ${center + stemHalfWidth},${SUPPORT_BASE_TOP} ${center - stemHalfWidth},${SUPPORT_BASE_TOP}`;
}

function buildMarginLine(frame: ReturnType<typeof buildFrame>) {
  const anchor =
    frame.centerOfMassX < frame.supportLeftEdge
      ? frame.supportLeftEdge
      : frame.centerOfMassX > frame.supportRightEdge
        ? frame.supportRightEdge
        : Math.abs(frame.centerOfMassX - frame.supportLeftEdge) <
            Math.abs(frame.supportRightEdge - frame.centerOfMassX)
          ? frame.supportLeftEdge
          : frame.supportRightEdge;

  return {
    startX: projectX(frame.centerOfMassX),
    endX: projectX(anchor),
    anchor,
  };
}

function buildStageNote(frame: ReturnType<typeof buildFrame>) {
  if (frame.supportBalanceLabel === "balanced") {
    return "Support centre and combined centre of mass are aligned, so the left and right reactions match.";
  }

  if (frame.supportBalanceLabel === "stable") {
    return `The combined centre of mass stays ${formatMeasurement(frame.stabilityMargin, "m")} inside the support region.`;
  }

  return `One required reaction would go negative, so the plank would tip ${frame.supportBalanceLabel === "tips-left" ? "left" : "right"}.`;
}

function renderSetup(options: {
  frame: ReturnType<typeof buildFrame>;
  label: string;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  muted?: boolean;
  dashed?: boolean;
}) {
  const { frame, label, overlayValues, focusedOverlayId, muted = false, dashed = false } = options;
  const calloutPrefix = muted ? "compare" : "primary";
  const plankLeft = projectX(-STATIC_EQUILIBRIUM_PLANK_HALF_LENGTH);
  const plankRight = projectX(STATIC_EQUILIBRIUM_PLANK_HALF_LENGTH);
  const cargoX = projectX(frame.cargoPosition);
  const supportCenterX = projectX(frame.supportCenter);
  const supportLeftX = projectX(frame.supportLeftEdge);
  const supportRightX = projectX(frame.supportRightEdge);
  const centerOfMassX = projectX(frame.centerOfMassX);
  const cargoPresent = frame.cargoMass > 0.05;
  const cargoWidth = 36 + Math.min(18, frame.cargoMass * 2.5);
  const cargoHeight = cargoPresent ? 24 + Math.min(24, frame.cargoMass * 4) : 0;
  const cargoTop = PLANK_TOP - cargoHeight;
  const supportPolygonPoints = buildSupportPolygonPoints(frame);
  const marginLine = buildMarginLine(frame);
  const plankColor = muted ? "rgba(15,28,36,0.34)" : "#0f1c24";
  const plankFill = muted ? "rgba(255,255,255,0.84)" : "rgba(255,253,247,0.98)";
  const supportFill = muted ? "rgba(78,166,223,0.14)" : "rgba(78,166,223,0.18)";
  const supportStroke = muted ? "rgba(78,166,223,0.35)" : "rgba(78,166,223,0.56)";
  const cargoFill = muted ? "rgba(241,102,89,0.22)" : "rgba(241,102,89,0.86)";
  const cargoStroke = muted ? "rgba(241,102,89,0.46)" : "#f16659";
  const centerTone =
    frame.supportBalanceLabel === "stable" || frame.supportBalanceLabel === "balanced"
      ? muted
        ? "rgba(30,166,162,0.48)"
        : "#1ea6a2"
      : muted
        ? "rgba(241,102,89,0.48)"
        : "#f16659";
  const showWeightLines = overlayValues?.weightLines ?? true;
  const showCombinedCenterOfMass = overlayValues?.combinedCenterOfMass ?? true;
  const showSupportRegion = overlayValues?.supportRegion ?? true;
  const showSupportReactions = overlayValues?.supportReactions ?? false;
  const showTorqueArms = overlayValues?.torqueArms ?? false;
  const showTextAnnotations = !muted;
  const weightOpacity = resolveOverlayOpacity(focusedOverlayId, "weightLines", 0.34);
  const centerOpacity = resolveOverlayOpacity(focusedOverlayId, "combinedCenterOfMass", 0.34);
  const supportOpacity = resolveOverlayOpacity(focusedOverlayId, "supportRegion", 0.34);
  const reactionOpacity = resolveOverlayOpacity(focusedOverlayId, "supportReactions", 0.28);
  const torqueOpacity = resolveOverlayOpacity(focusedOverlayId, "torqueArms", 0.3);
  const supportCenterLineY = SUPPORT_CONTACT_Y - 14;
  const activeEdgeX =
    frame.activeSupportEdgeX === null ? null : projectX(frame.activeSupportEdgeX);
  const topCallouts: SvgCalloutBandItem[] = [];
  const supportCallouts: SvgCalloutBandItem[] = [];
  const bottomCallouts: SvgCalloutBandItem[] = [];

  if (showTextAnnotations) {
    if (showWeightLines) {
      topCallouts.push({
        id: `${calloutPrefix}-plank-weight`,
        text: "W_plank",
        anchorX: projectX(0),
        anchorY: PLANK_TOP + 18,
        tone: "ink",
        priority: 1,
        testId: "static-equilibrium-callout-plank-weight",
      });
      if (cargoPresent) {
        topCallouts.push({
          id: `${calloutPrefix}-cargo-weight`,
          text: "W_cargo",
          anchorX: cargoX,
          anchorY: cargoTop + 18,
          tone: "coral",
          priority: 2,
          testId: "static-equilibrium-callout-cargo-weight",
        });
      }
    }

    if (cargoPresent) {
      topCallouts.push({
        id: `${calloutPrefix}-cargo-position`,
        text: `cargo x ${formatMeasurement(frame.cargoPosition, "m")}`,
        anchorX: cargoX,
        anchorY: cargoTop - 2,
        tone: "coral",
        priority: 4,
        minWidth: 94,
        testId: "static-equilibrium-callout-cargo",
      });
    } else {
      topCallouts.push({
        id: `${calloutPrefix}-cargo-position`,
        text: "no cargo",
        anchorX: projectX(0),
        anchorY: PLANK_TOP - 8,
        tone: "coral",
        priority: 2,
        testId: "static-equilibrium-callout-cargo",
      });
    }

    if (showCombinedCenterOfMass) {
      topCallouts.push({
        id: `${calloutPrefix}-center-of-mass`,
        text: `x_CM ${formatMeasurement(frame.centerOfMassX, "m")}`,
        anchorX: centerOfMassX,
        anchorY: PLANK_TOP - 12,
        tone: "teal",
        priority: 5,
        minWidth: 96,
        testId: "static-equilibrium-callout-xcm",
      });
    }

    if (showSupportRegion) {
      supportCallouts.push(
        {
          id: `${calloutPrefix}-support-left`,
          text: `x_L ${formatMeasurement(frame.supportLeftEdge, "m")}`,
          anchorX: supportLeftX,
          anchorY: SUPPORT_CONTACT_Y,
          tone: "sky",
          priority: 2,
          minWidth: 84,
          testId: "static-equilibrium-callout-support-left",
        },
        {
          id: `${calloutPrefix}-support-center`,
          text: `x_s ${formatMeasurement(frame.supportCenter, "m")}`,
          anchorX: supportCenterX,
          anchorY: supportCenterLineY,
          tone: "sky",
          priority: 3,
          minWidth: 84,
          testId: "static-equilibrium-callout-support-center",
        },
        {
          id: `${calloutPrefix}-support-right`,
          text: `x_R ${formatMeasurement(frame.supportRightEdge, "m")}`,
          anchorX: supportRightX,
          anchorY: SUPPORT_CONTACT_Y,
          tone: "sky",
          priority: 2,
          minWidth: 84,
          testId: "static-equilibrium-callout-support-right",
        },
      );
    }

    if (showSupportReactions) {
      if (frame.actualLeftReaction > 0.02) {
        bottomCallouts.push({
          id: `${calloutPrefix}-reaction-left`,
          text: `R_L ${formatMeasurement(frame.actualLeftReaction, "N")}`,
          anchorX: supportLeftX,
          anchorY: SUPPORT_CONTACT_Y + 8,
          tone: "teal",
          priority: 3,
          minWidth: 92,
          testId: "static-equilibrium-callout-reaction-left",
        });
      }
      if (frame.actualRightReaction > 0.02) {
        bottomCallouts.push({
          id: `${calloutPrefix}-reaction-right`,
          text: `R_R ${formatMeasurement(frame.actualRightReaction, "N")}`,
          anchorX: supportRightX,
          anchorY: SUPPORT_CONTACT_Y + 8,
          tone: "coral",
          priority: 3,
          minWidth: 92,
          testId: "static-equilibrium-callout-reaction-right",
        });
      }
    }

    if (showTorqueArms) {
      bottomCallouts.push({
        id: `${calloutPrefix}-arm`,
        text: `arm ${formatMeasurement(Math.abs(frame.supportOffset), "m")}`,
        anchorX: (supportCenterX + centerOfMassX) / 2,
        anchorY: PLANK_BOTTOM + 34,
        tone: "amber",
        priority: 2,
        minWidth: 90,
        testId: "static-equilibrium-callout-arm",
      });
    }

    if (showSupportRegion) {
      bottomCallouts.push({
        id: `${calloutPrefix}-margin`,
        text: `margin ${formatMeasurement(frame.stabilityMargin, "m")}`,
        anchorX: (marginLine.startX + marginLine.endX) / 2,
        anchorY: PLANK_BOTTOM + 62,
        tone:
          frame.supportBalanceLabel === "stable" || frame.supportBalanceLabel === "balanced"
            ? "teal"
            : "coral",
        priority: 2,
        minWidth: 98,
        testId: "static-equilibrium-callout-margin",
      });
    }

    if (frame.supportBalanceLabel === "tips-left" || frame.supportBalanceLabel === "tips-right") {
      bottomCallouts.push({
        id: `${calloutPrefix}-tip`,
        text: `tips ${frame.supportBalanceLabel === "tips-left" ? "left" : "right"}`,
        anchorX: activeEdgeX ?? supportCenterX,
        anchorY: PLANK_BOTTOM + 4,
        tone: "coral",
        priority: 5,
        minWidth: 78,
        testId: "static-equilibrium-callout-tip",
      });
    }
  }

  return (
    <g opacity={muted ? 0.6 : 1}>
      <line
        x1={STAGE_LEFT}
        x2={STAGE_RIGHT}
        y1={SUPPORT_BASE_BOTTOM + 22}
        y2={SUPPORT_BASE_BOTTOM + 22}
        stroke="rgba(15,28,36,0.08)"
        strokeWidth="2"
      />
      <polygon
        points={supportPolygonPoints}
        fill={supportFill}
        stroke={supportStroke}
        strokeWidth="2"
        strokeDasharray={dashed ? "10 7" : undefined}
      />
      <rect
        x={supportCenterX - SUPPORT_BASE_WIDTH / 2}
        y={SUPPORT_BASE_TOP}
        width={SUPPORT_BASE_WIDTH}
        height={SUPPORT_BASE_BOTTOM - SUPPORT_BASE_TOP}
        rx="20"
        fill={muted ? "rgba(255,253,247,0.84)" : "rgba(255,253,247,0.94)"}
        stroke={supportStroke}
        strokeWidth="2"
        strokeDasharray={dashed ? "10 7" : undefined}
      />
      {showSupportRegion ? (
        <g opacity={supportOpacity}>
          <rect
            x={supportLeftX}
            y={PLANK_BOTTOM + 10}
            width={supportRightX - supportLeftX}
            height={18}
            rx="9"
            fill={
              frame.supportBalanceLabel === "stable" || frame.supportBalanceLabel === "balanced"
                ? muted
                  ? "rgba(30,166,162,0.14)"
                  : "rgba(30,166,162,0.18)"
                : muted
                  ? "rgba(241,102,89,0.12)"
                  : "rgba(241,102,89,0.18)"
            }
          />
          <line
            x1={supportLeftX}
            x2={supportRightX}
            y1={SUPPORT_CONTACT_Y}
            y2={SUPPORT_CONTACT_Y}
            stroke={supportStroke}
            strokeWidth={3}
            strokeDasharray={dashed ? "10 7" : undefined}
          />
          <line
            x1={supportCenterX}
            x2={supportCenterX}
            y1={PLANK_BOTTOM + 10}
            y2={supportCenterLineY}
            stroke="rgba(78,166,223,0.68)"
            strokeWidth="2"
            strokeDasharray={dashed ? "8 6" : "5 4"}
          />
        </g>
      ) : null}
      <rect
        x={plankLeft}
        y={PLANK_TOP}
        width={plankRight - plankLeft}
        height={PLANK_HEIGHT}
        rx="9"
        fill={plankColor}
        stroke={plankColor}
        strokeWidth="1.5"
        strokeDasharray={dashed ? "10 8" : undefined}
      />
      <rect
        x={plankLeft + 6}
        y={PLANK_TOP + 3}
        width={plankRight - plankLeft - 12}
        height={PLANK_HEIGHT - 6}
        rx="6"
        fill={plankFill}
      />
      {showTextAnnotations ? (
        <>
          <text
            x={plankLeft + 12}
            y={PLANK_TOP - 12}
            className="fill-ink-700 text-[11px] font-semibold uppercase tracking-[0.16em]"
          >
            {label}
          </text>
          <text
            x={plankLeft + 14}
            y={PLANK_BOTTOM + 24}
            className="fill-ink-500 text-[10px] font-semibold"
          >
            plank {formatNumber(frame.plankMass)} kg
          </text>
        </>
      ) : null}
      {cargoPresent ? (
        <g>
          <rect
            x={cargoX - cargoWidth / 2}
            y={cargoTop}
            width={cargoWidth}
            height={cargoHeight}
            rx="10"
            fill={cargoFill}
            stroke={cargoStroke}
            strokeWidth="2.4"
            strokeDasharray={dashed ? "8 6" : undefined}
          />
          {showTextAnnotations ? (
            <text
              x={cargoX}
              y={cargoTop + cargoHeight / 2 + 4}
              textAnchor="middle"
              className="fill-white text-[11px] font-semibold"
            >
              {formatNumber(frame.cargoMass)} kg
            </text>
          ) : null}
        </g>
      ) : null}
      {showWeightLines ? (
        <g opacity={weightOpacity}>
          {renderArrow({
            startX: projectX(0),
            startY: PLANK_TOP - 2,
            endX: projectX(0),
            endY: PLANK_TOP + 42,
            color: muted ? "rgba(15,28,36,0.38)" : "#0f1c24",
            strokeWidth: 3.4,
            dashed,
          })}
          {cargoPresent
            ? renderArrow({
                startX: cargoX,
                startY: cargoTop - 4,
                endX: cargoX,
                endY: cargoTop + 36,
                color: muted ? "rgba(241,102,89,0.44)" : "#f16659",
                strokeWidth: 3.6,
                dashed,
              })
            : null}
        </g>
      ) : null}
      {showCombinedCenterOfMass ? (
        <g opacity={centerOpacity}>
          <line
            x1={centerOfMassX}
            x2={centerOfMassX}
            y1={PLANK_TOP - 20}
            y2={SUPPORT_CONTACT_Y + 16}
            stroke={centerTone}
            strokeWidth="2.6"
            strokeDasharray={dashed ? "8 6" : "6 5"}
          />
          <circle
            cx={centerOfMassX}
            cy={PLANK_TOP - 12}
            r="7"
            fill="rgba(255,255,255,0.96)"
            stroke={centerTone}
            strokeWidth="2.6"
          />
          {renderArrow({
            startX: centerOfMassX,
            startY: PLANK_TOP - 8,
            endX: centerOfMassX,
            endY: PLANK_TOP + 48,
            color: centerTone,
            strokeWidth: 4.2,
            dashed,
          })}
        </g>
      ) : null}
      {showSupportReactions ? (
        <g opacity={reactionOpacity}>
          {frame.actualLeftReaction > 0.02
            ? renderArrow({
                startX: supportLeftX,
                startY: SUPPORT_CONTACT_Y + 6,
                endX: supportLeftX,
                endY: PLANK_BOTTOM - 2,
                color: muted ? "rgba(30,166,162,0.44)" : "#1ea6a2",
                strokeWidth: 3.8,
                dashed,
              })
            : null}
          {frame.actualRightReaction > 0.02
            ? renderArrow({
                startX: supportRightX,
                startY: SUPPORT_CONTACT_Y + 6,
                endX: supportRightX,
                endY: PLANK_BOTTOM - 2,
                color: muted ? "rgba(241,102,89,0.44)" : "#f16659",
                strokeWidth: 3.8,
                dashed,
              })
            : null}
        </g>
      ) : null}
      {showTorqueArms ? (
        <g opacity={torqueOpacity}>
          <line
            x1={supportCenterX}
            x2={centerOfMassX}
            y1={PLANK_BOTTOM + 34}
            y2={PLANK_BOTTOM + 34}
            stroke={muted ? "rgba(240,171,60,0.4)" : "#f0ab3c"}
            strokeWidth="3"
            strokeDasharray={dashed ? "8 6" : "6 5"}
          />
          <line
            x1={supportCenterX}
            x2={supportCenterX}
            y1={PLANK_BOTTOM + 26}
            y2={PLANK_BOTTOM + 42}
            stroke={muted ? "rgba(240,171,60,0.4)" : "#f0ab3c"}
            strokeWidth="2"
          />
          <line
            x1={centerOfMassX}
            x2={centerOfMassX}
            y1={PLANK_BOTTOM + 26}
            y2={PLANK_BOTTOM + 42}
            stroke={muted ? "rgba(240,171,60,0.4)" : "#f0ab3c"}
            strokeWidth="2"
          />
        </g>
      ) : null}
      {showSupportRegion ? (
        <g opacity={supportOpacity}>
          <line
            x1={marginLine.startX}
            x2={marginLine.endX}
            y1={PLANK_BOTTOM + 62}
            y2={PLANK_BOTTOM + 62}
            stroke={
              frame.supportBalanceLabel === "stable" || frame.supportBalanceLabel === "balanced"
                ? muted
                  ? "rgba(30,166,162,0.44)"
                  : "#1ea6a2"
                : muted
                  ? "rgba(241,102,89,0.4)"
                  : "#f16659"
            }
            strokeWidth="3"
            strokeDasharray={dashed ? "8 6" : "6 5"}
          />
        </g>
      ) : null}
      {showTextAnnotations ? (
        <>
          <SvgCalloutBand
            items={topCallouts}
            minX={STAGE_LEFT + 16}
            maxX={STAGE_RIGHT - 16}
            baseY={60}
            direction="up"
            maxRows={3}
          />
          <SvgCalloutBand
            items={supportCallouts}
            minX={STAGE_LEFT + 16}
            maxX={STAGE_RIGHT - 16}
            baseY={190}
            direction="down"
            maxRows={1}
          />
          <SvgCalloutBand
            items={bottomCallouts}
            minX={STAGE_LEFT + 16}
            maxX={STAGE_RIGHT - 16}
            baseY={316}
            direction="down"
            maxRows={2}
          />
        </>
      ) : null}
    </g>
  );
}

export function StaticEquilibriumCentreOfMassSimulation({
  concept,
  params,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: StaticEquilibriumCentreOfMassSimulationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const previewCargoPosition =
    graphPreview?.kind === "response" && graphPreview.graphId === "cargo-stability"
      ? clamp(
          graphPreview.point.x,
          STATIC_EQUILIBRIUM_MIN_CARGO_POSITION,
          STATIC_EQUILIBRIUM_MAX_CARGO_POSITION,
        )
      : undefined;
  const previewSupportCenter =
    graphPreview?.kind === "response" && graphPreview.graphId !== "cargo-stability"
      ? clamp(
          graphPreview.point.x,
          STATIC_EQUILIBRIUM_MIN_SUPPORT_CENTER,
          STATIC_EQUILIBRIUM_MAX_SUPPORT_CENTER,
        )
      : undefined;
  const activeFrame = buildFrame(params, {
    cargoPosition: previewCargoPosition,
    supportCenter: previewSupportCenter,
  });
  const frameA = compare
    ? buildFrame(compare.setupA, {
        cargoPosition:
          graphPreview?.setup === "a" && previewCargoPosition !== undefined
            ? previewCargoPosition
            : undefined,
        supportCenter:
          graphPreview?.setup === "a" && previewSupportCenter !== undefined
            ? previewSupportCenter
            : undefined,
      })
    : null;
  const frameB = compare
    ? buildFrame(compare.setupB, {
        cargoPosition:
          graphPreview?.setup === "b" && previewCargoPosition !== undefined
            ? previewCargoPosition
            : undefined,
        supportCenter:
          graphPreview?.setup === "b" && previewSupportCenter !== undefined
            ? previewSupportCenter
            : undefined,
      })
    : null;
  const {
    compareEnabled,
    primaryFrame,
    secondaryFrame,
    primaryLabel,
    secondaryLabel,
    canEditPrimary,
  } = resolveCompareScene({
    compare,
    graphPreview,
    activeFrame,
    frameA,
    frameB,
  });

  function commitParam(param: "cargoPosition" | "supportCenter", value: number) {
    const boundedValue =
      param === "cargoPosition"
        ? clamp(
            value,
            STATIC_EQUILIBRIUM_MIN_CARGO_POSITION,
            STATIC_EQUILIBRIUM_MAX_CARGO_POSITION,
          )
        : clamp(
            value,
            STATIC_EQUILIBRIUM_MIN_SUPPORT_CENTER,
            STATIC_EQUILIBRIUM_MAX_SUPPORT_CENTER,
          );
    const roundedValue = roundTo(boundedValue);

    if (roundedValue !== primaryFrame[param]) {
      setParam(param, roundedValue);
    }
  }

  const drag = useSvgPointerDrag<"cargo" | "support">({
    svgRef,
    width: WIDTH,
    height: HEIGHT,
    onDrag: (target, location) => {
      if (!canEditPrimary) {
        return;
      }

      const worldX = roundTo(invertX(location.svgX));
      if (target === "cargo") {
        commitParam("cargoPosition", worldX);
      } else {
        commitParam("supportCenter", worldX);
      }
    },
  });

  const previewBadge = buildPreviewLabel(graphPreview, previewCargoPosition, previewSupportCenter);
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? "Setup A")}: x_CM {formatNumber(frameA!.centerOfMassX)} / margin{" "}
        {formatNumber(frameA!.stabilityMargin)}
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: x_CM {formatNumber(frameB!.centerOfMassX)} / margin{" "}
        {formatNumber(frameB!.stabilityMargin)}
      </span>
    </div>
  ) : null;
  const metricRows = [
    { label: "M_total", value: formatMeasurement(primaryFrame.totalMass, "kg") },
    { label: "x_CM", value: formatMeasurement(primaryFrame.centerOfMassX, "m") },
    {
      label: "support",
      value: `${formatNumber(primaryFrame.supportLeftEdge)} to ${formatNumber(primaryFrame.supportRightEdge)} m`,
    },
    { label: "margin", value: formatMeasurement(primaryFrame.stabilityMargin, "m") },
    { label: "R_left", value: formatMeasurement(primaryFrame.actualLeftReaction, "N") },
    { label: "R_right", value: formatMeasurement(primaryFrame.actualRightReaction, "N") },
  ];
  const torqueNote =
    primaryFrame.supportBalanceLabel === "tips-left" ||
    primaryFrame.supportBalanceLabel === "tips-right"
      ? `Tip torque about edge: ${formatMeasurement(primaryFrame.tipTorqueAboutEdge, "N m")}`
      : `Torque about support centre: ${formatMeasurement(primaryFrame.torqueAboutSupportCenter, "N m")}`;

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(30,166,162,0.12),rgba(78,166,223,0.12),rgba(15,28,36,0.08))]"
      headerAside={
        <>
          <CompareLegend primaryLabel={primaryLabel} secondaryLabel={secondaryLabel} />
          {compareBadges}
          {previewBadge}
        </>
      }
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
        style={{ touchAction: "none", userSelect: "none" }}
        onPointerMove={(event) => {
          drag.handlePointerMove(event.pointerId, event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          drag.handlePointerUp(event.pointerId);
        }}
        onPointerCancel={(event) => {
          drag.handlePointerCancel(event.pointerId);
        }}
        onLostPointerCapture={drag.handleLostPointerCapture}
      >
        <rect
          x={STAGE_LEFT}
          y="38"
          width={STAGE_RIGHT - STAGE_LEFT}
          height={SUPPORT_BASE_BOTTOM - 22}
          rx="26"
          fill="url(#static-equilibrium-background)"
          stroke="rgba(15,28,36,0.08)"
        />
        <defs>
          <linearGradient id="static-equilibrium-background" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,253,247,0.98)" />
            <stop offset="55%" stopColor="rgba(248,250,252,0.98)" />
            <stop offset="100%" stopColor="rgba(235,244,246,0.98)" />
          </linearGradient>
        </defs>
        {secondaryFrame
          ? renderSetup({
              frame: secondaryFrame,
              label: secondaryLabel ?? "Setup B",
              overlayValues,
              focusedOverlayId,
              muted: true,
              dashed: true,
            })
          : null}
        {renderSetup({
          frame: primaryFrame,
          label: primaryLabel,
          overlayValues,
          focusedOverlayId,
        })}
        {canEditPrimary ? (
          <>
            <g
              tabIndex={0}
              role="button"
              aria-label={`Move cargo, current x ${formatNumber(primaryFrame.cargoPosition)}`}
              style={{ cursor: drag.activePointerId === null ? "grab" : "grabbing" }}
              onPointerDown={(event) => {
                drag.startDrag(event.pointerId, "cargo", event.clientX, event.clientY);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  commitParam("cargoPosition", primaryFrame.cargoPosition - HANDLE_KEYBOARD_STEP);
                } else if (event.key === "ArrowRight") {
                  event.preventDefault();
                  commitParam("cargoPosition", primaryFrame.cargoPosition + HANDLE_KEYBOARD_STEP);
                }
              }}
            >
              <circle
                cx={projectX(primaryFrame.cargoPosition)}
                cy={PLANK_TOP - 34}
                r="28"
                fill="transparent"
              />
            </g>
            <g
              tabIndex={0}
              role="button"
              aria-label={`Move support region, current center ${formatNumber(primaryFrame.supportCenter)}`}
              style={{ cursor: drag.activePointerId === null ? "grab" : "grabbing" }}
              onPointerDown={(event) => {
                drag.startDrag(event.pointerId, "support", event.clientX, event.clientY);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  commitParam("supportCenter", primaryFrame.supportCenter - HANDLE_KEYBOARD_STEP);
                } else if (event.key === "ArrowRight") {
                  event.preventDefault();
                  commitParam("supportCenter", primaryFrame.supportCenter + HANDLE_KEYBOARD_STEP);
                }
              }}
            >
              <circle
                cx={projectX(primaryFrame.supportCenter)}
                cy={SUPPORT_CONTACT_Y + 20}
                r="28"
                fill="transparent"
              />
            </g>
          </>
        ) : null}
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Balance state"
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={[torqueNote, buildStageNote(primaryFrame)]}
        />
      </svg>
    </SimulationSceneCard>
  );
}
