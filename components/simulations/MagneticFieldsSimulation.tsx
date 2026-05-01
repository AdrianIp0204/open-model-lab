"use client";

import { useRef } from "react";
import {
  clamp,
  formatMeasurement,
  formatNumber,
  MAGNETIC_FIELDS_MAX_SEPARATION,
  MAGNETIC_FIELDS_MIN_SEPARATION,
  MAGNETIC_FIELDS_STAGE_MAX_X,
  MAGNETIC_FIELDS_STAGE_MAX_Y,
  MAGNETIC_FIELDS_STAGE_MIN_X,
  MAGNETIC_FIELDS_STAGE_MIN_Y,
  sampleMagneticFieldsState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import { CompareLegend, resolveCompareScene, SimulationPreviewBadge } from "./primitives/compare";
import {
  CartesianStageFrame,
  directionLabel,
  type CartesianStageLayout,
  invertCartesianPoint,
  projectCartesianX,
  projectCartesianY,
  SvgArrow,
} from "./primitives/electric-stage";
import { resolveOverlayOpacity } from "./primitives/overlay";
import { SimulationSceneCard } from "./primitives/scene-card";
import { useSvgPointerDrag } from "./primitives/useSvgPointerDrag";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type MagneticFieldsSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type DragTarget = "probe" | "sourceA" | "sourceB";

const WIDTH = 860;
const HEIGHT = 360;
const PLOT_LEFT = 44;
const PLOT_TOP = 38;
const PLOT_RIGHT = 596;
const PLOT_BOTTOM = HEIGHT - 38;
const CARD_WIDTH = 218;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const SOURCE_MARKER_RADIUS = 16;
const STAGE_LAYOUT: CartesianStageLayout = {
  width: WIDTH,
  height: HEIGHT,
  plotLeft: PLOT_LEFT,
  plotTop: PLOT_TOP,
  plotRight: PLOT_RIGHT,
  plotBottom: PLOT_BOTTOM,
  minX: MAGNETIC_FIELDS_STAGE_MIN_X,
  maxX: MAGNETIC_FIELDS_STAGE_MAX_X,
  minY: MAGNETIC_FIELDS_STAGE_MIN_Y,
  maxY: MAGNETIC_FIELDS_STAGE_MAX_Y,
};
const X_TICKS = [MAGNETIC_FIELDS_STAGE_MIN_X, -1.6, 0, 1.6, MAGNETIC_FIELDS_STAGE_MAX_X];
const Y_TICKS = [MAGNETIC_FIELDS_STAGE_MIN_Y, -1.2, 0, 1.2, MAGNETIC_FIELDS_STAGE_MAX_Y];

function roundTo(value: number, precision = 2) {
  return Number(value.toFixed(precision));
}

function vectorScale(magnitude: number, maxLength: number) {
  if (!Number.isFinite(magnitude) || magnitude <= 0) {
    return 0;
  }

  return maxLength * Math.tanh(magnitude / 2.8);
}

function wireColors(current: number) {
  if (current > 0.05) {
    return {
      fill: "rgba(240,171,60,0.22)",
      stroke: "#f0ab3c",
      text: "#b87000",
    };
  }

  if (current < -0.05) {
    return {
      fill: "rgba(78,166,223,0.22)",
      stroke: "#4ea6df",
      text: "#1d6f9f",
    };
  }

  return {
    fill: "rgba(15,28,36,0.12)",
    stroke: "rgba(15,28,36,0.42)",
    text: "#55636b",
  };
}

function formatSignedCurrent(value: number) {
  if (Math.abs(value) < 0.005) {
    return "0 A";
  }

  return `${value > 0 ? "+" : ""}${formatNumber(value)} A`;
}

function formatCurrentSense(value: number) {
  if (Math.abs(value) <= 0.05) {
    return "zero current";
  }

  return value > 0 ? "out of page" : "into page";
}

function renderFieldGrid(source: SimulationParams, overlayOpacity: number) {
  const columns = 7;
  const rows = 5;
  const items = [];

  for (let row = 0; row < rows; row += 1) {
    const y =
      MAGNETIC_FIELDS_STAGE_MIN_Y +
      ((row + 0.5) / rows) *
        (MAGNETIC_FIELDS_STAGE_MAX_Y - MAGNETIC_FIELDS_STAGE_MIN_Y);

    for (let column = 0; column < columns; column += 1) {
      const x =
        MAGNETIC_FIELDS_STAGE_MIN_X +
        ((column + 0.5) / columns) *
          (MAGNETIC_FIELDS_STAGE_MAX_X - MAGNETIC_FIELDS_STAGE_MIN_X);
      const snapshot = sampleMagneticFieldsState(source, { probeX: x, probeY: y });
      const nearSource =
        snapshot.sourceA.distance < 0.42 || snapshot.sourceB.distance < 0.42;

      if (nearSource) {
        continue;
      }

      const arrowLength = vectorScale(snapshot.fieldMagnitude, 16);
      const originX = projectCartesianX(STAGE_LAYOUT, x);
      const originY = projectCartesianY(STAGE_LAYOUT, y);
      const magnitude = Math.max(snapshot.fieldMagnitude, 1e-6);
      const endX = originX + (snapshot.fieldX / magnitude) * arrowLength;
      const endY = originY - (snapshot.fieldY / magnitude) * arrowLength;

      items.push(
        <g key={`field-grid-${row}-${column}`}>
          <circle cx={originX} cy={originY} r="1.6" fill="rgba(15,28,36,0.16)" />
          <SvgArrow
            x1={originX}
            y1={originY}
            x2={endX}
            y2={endY}
            stroke="rgba(15,28,36,0.36)"
            strokeWidth={1.8}
            opacity={overlayOpacity}
          />
        </g>,
      );
    }
  }

  return items;
}

function renderLoopArrow(cx: number, cy: number, radius: number, current: number, opacity: number) {
  if (Math.abs(current) <= 0.05) {
    return null;
  }

  const color = wireColors(current).stroke;
  const x = cx + radius;

  if (current > 0) {
    return (
      <SvgArrow
        x1={x}
        y1={cy + 10}
        x2={x}
        y2={cy - 10}
        stroke={color}
        strokeWidth={2}
        opacity={opacity}
      />
    );
  }

  return (
    <SvgArrow
      x1={x}
      y1={cy - 10}
      x2={x}
      y2={cy + 10}
      stroke={color}
      strokeWidth={2}
      opacity={opacity}
    />
  );
}

function renderFieldLoops(
  cx: number,
  cy: number,
  current: number,
  overlayOpacity: number,
) {
  const color = wireColors(current).stroke;

  return (
    <g opacity={overlayOpacity}>
      {[28, 46].map((radius) => (
        <g key={`field-loop-${radius}`}>
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={color}
            strokeDasharray="7 6"
            strokeWidth="1.8"
            opacity={0.36}
          />
          {renderLoopArrow(cx, cy, radius, current, 1)}
        </g>
      ))}
    </g>
  );
}

function WireMarker({
  x,
  y,
  current,
  label,
  radius,
  dashed,
  muted,
}: {
  x: number;
  y: number;
  current: number;
  label: string;
  radius: number;
  dashed?: boolean;
  muted?: boolean;
}) {
  const colors = wireColors(current);
  const isPositive = current > 0.05;
  const isNegative = current < -0.05;

  return (
    <g opacity={muted ? 0.56 : 1}>
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth="2.5"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      {isPositive ? (
        <>
          <circle cx={x} cy={y} r="4.8" fill={colors.stroke} />
          <circle cx={x} cy={y} r="2.2" fill="rgba(255,253,247,0.96)" />
        </>
      ) : null}
      {isNegative ? (
        <>
          <line
            x1={x - 5}
            y1={y - 5}
            x2={x + 5}
            y2={y + 5}
            stroke={colors.text}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <line
            x1={x + 5}
            y1={y - 5}
            x2={x - 5}
            y2={y + 5}
            stroke={colors.text}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </>
      ) : null}
      {!isPositive && !isNegative ? (
        <circle
          cx={x}
          cy={y}
          r="5"
          fill="none"
          stroke={colors.text}
          strokeWidth="2"
        />
      ) : null}
      <text
        x={x}
        y={y - 28}
        textAnchor="middle"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        {label}
      </text>
      <text
        x={x}
        y={y + 34}
        textAnchor="middle"
        className="fill-ink-600 text-[10px] font-semibold"
      >
        {formatSignedCurrent(current)}
      </text>
    </g>
  );
}

function buildFrame(source: SimulationParams, previewProbeX?: number) {
  return sampleMagneticFieldsState(source, {
    probeX: previewProbeX,
  });
}

export function MagneticFieldsSimulation({
  concept,
  params,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: MagneticFieldsSimulationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const previewProbeX =
    graphPreview?.kind === "response"
      ? clamp(
          graphPreview.point.x,
          MAGNETIC_FIELDS_STAGE_MIN_X,
          MAGNETIC_FIELDS_STAGE_MAX_X,
        )
      : undefined;
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const activeFrame = buildFrame(params, previewProbeX);
  const frameA = compare
    ? buildFrame(compare.setupA, previewedSetup === "a" ? previewProbeX : undefined)
    : null;
  const frameB = compare
    ? buildFrame(compare.setupB, previewedSetup === "b" ? previewProbeX : undefined)
    : null;
  const { compareEnabled, primaryFrame, secondaryFrame, primaryLabel, secondaryLabel, canEditPrimary } =
    resolveCompareScene({
      compare,
      graphPreview,
      activeFrame,
      frameA,
      frameB,
    });
  const showFieldLoops = overlayValues?.fieldLoops ?? true;
  const showFieldGrid = overlayValues?.fieldGrid ?? true;
  const showFieldVectors = overlayValues?.fieldVectors ?? true;
  const showScanLine = overlayValues?.scanLine ?? true;
  const primaryFieldSource = {
    currentA: primaryFrame.currentA,
    currentB: primaryFrame.currentB,
    sourceSeparation: primaryFrame.sourceSeparation,
    probeX: primaryFrame.probeX,
    probeY: primaryFrame.probeY,
  };

  function updateFromPointer(target: DragTarget, svgX: number, svgY: number) {
    if (!canEditPrimary) {
      return;
    }

    const world = invertCartesianPoint(STAGE_LAYOUT, svgX, svgY);

    if (target === "probe") {
      setParam("probeX", roundTo(world.x, 2));
      setParam("probeY", roundTo(world.y, 2));
      return;
    }

    const nextSeparation = clamp(
      Math.abs(world.x) * 2,
      MAGNETIC_FIELDS_MIN_SEPARATION,
      MAGNETIC_FIELDS_MAX_SEPARATION,
    );
    setParam("sourceSeparation", roundTo(nextSeparation, 2));
  }

  const drag = useSvgPointerDrag<DragTarget>({
    svgRef,
    width: WIDTH,
    height: HEIGHT,
    onDrag: (target, location) => updateFromPointer(target, location.svgX, location.svgY),
  });

  const previewBadge = graphPreview?.kind === "response" ? (
    <SimulationPreviewBadge>
      preview x = {formatMeasurement(previewProbeX ?? 0, "m")}
    </SimulationPreviewBadge>
  ) : null;
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? "Setup A")}: {formatSignedCurrent(frameA!.currentA)} /{" "}
        {formatSignedCurrent(frameA!.currentB)}
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: {formatSignedCurrent(frameB!.currentA)} /{" "}
        {formatSignedCurrent(frameB!.currentB)}
      </span>
    </div>
  ) : null;
  const dominantText =
    primaryFrame.dominantSource === "a"
      ? "Wire A contributes more local field here."
      : primaryFrame.dominantSource === "b"
        ? "Wire B contributes more local field here."
        : primaryFrame.dominantSource === "balanced"
          ? "The two wire contributions are closely balanced here."
          : "Neither wire contributes much field at this probe point.";
  const circulationText = `A: ${formatCurrentSense(primaryFrame.currentA)}. B: ${formatCurrentSense(primaryFrame.currentB)}.`;
  const metricRows = [
    { label: "I_A", value: formatSignedCurrent(primaryFrame.currentA) },
    { label: "I_B", value: formatSignedCurrent(primaryFrame.currentB) },
    { label: "x_p", value: formatMeasurement(primaryFrame.probeX, "m") },
    { label: "y_p", value: formatMeasurement(primaryFrame.probeY, "m") },
    { label: "B_x", value: formatNumber(primaryFrame.fieldX) },
    { label: "B_y", value: formatNumber(primaryFrame.fieldY) },
    { label: "|B|", value: formatNumber(primaryFrame.fieldMagnitude) },
    { label: "theta_B", value: `${formatNumber(primaryFrame.fieldAngle)} deg` },
  ];
  const primaryProbeX = projectCartesianX(STAGE_LAYOUT, primaryFrame.probeX);
  const primaryProbeY = projectCartesianY(STAGE_LAYOUT, primaryFrame.probeY);
  const secondaryProbeX = secondaryFrame ? projectCartesianX(STAGE_LAYOUT, secondaryFrame.probeX) : null;
  const secondaryProbeY = secondaryFrame ? projectCartesianY(STAGE_LAYOUT, secondaryFrame.probeY) : null;
  const sourceAX = projectCartesianX(STAGE_LAYOUT, primaryFrame.sourceA.x);
  const sourceAY = projectCartesianY(STAGE_LAYOUT, primaryFrame.sourceA.y);
  const sourceBX = projectCartesianX(STAGE_LAYOUT, primaryFrame.sourceB.x);
  const sourceBY = projectCartesianY(STAGE_LAYOUT, primaryFrame.sourceB.y);
  const secondarySourceAX = secondaryFrame ? projectCartesianX(STAGE_LAYOUT, secondaryFrame.sourceA.x) : null;
  const secondarySourceAY = secondaryFrame ? projectCartesianY(STAGE_LAYOUT, secondaryFrame.sourceA.y) : null;
  const secondarySourceBX = secondaryFrame ? projectCartesianX(STAGE_LAYOUT, secondaryFrame.sourceB.x) : null;
  const secondarySourceBY = secondaryFrame ? projectCartesianY(STAGE_LAYOUT, secondaryFrame.sourceB.y) : null;
  const fieldLength = vectorScale(primaryFrame.fieldMagnitude, 34);
  const primaryFieldEndX =
    primaryProbeX +
    (primaryFrame.fieldMagnitude > 0.001
      ? (primaryFrame.fieldX / primaryFrame.fieldMagnitude) * fieldLength
      : 0);
  const primaryFieldEndY =
    primaryProbeY -
    (primaryFrame.fieldMagnitude > 0.001
      ? (primaryFrame.fieldY / primaryFrame.fieldMagnitude) * fieldLength
      : 0);
  const contributionScale = Math.max(
    primaryFrame.sourceA.fieldMagnitude,
    primaryFrame.sourceB.fieldMagnitude,
    0.2,
  );
  const sourceAContributionEnd = {
    x:
      primaryProbeX +
      (primaryFrame.sourceA.fieldMagnitude > 0.001
        ? (primaryFrame.sourceA.fieldX / primaryFrame.sourceA.fieldMagnitude) *
          vectorScale(primaryFrame.sourceA.fieldMagnitude / contributionScale, 28)
        : 0),
    y:
      primaryProbeY -
      (primaryFrame.sourceA.fieldMagnitude > 0.001
        ? (primaryFrame.sourceA.fieldY / primaryFrame.sourceA.fieldMagnitude) *
          vectorScale(primaryFrame.sourceA.fieldMagnitude / contributionScale, 28)
        : 0),
  };
  const sourceBContributionEnd = {
    x:
      primaryProbeX +
      (primaryFrame.sourceB.fieldMagnitude > 0.001
        ? (primaryFrame.sourceB.fieldX / primaryFrame.sourceB.fieldMagnitude) *
          vectorScale(primaryFrame.sourceB.fieldMagnitude / contributionScale, 28)
        : 0),
    y:
      primaryProbeY -
      (primaryFrame.sourceB.fieldMagnitude > 0.001
        ? (primaryFrame.sourceB.fieldY / primaryFrame.sourceB.fieldMagnitude) *
          vectorScale(primaryFrame.sourceB.fieldMagnitude / contributionScale, 28)
        : 0),
  };

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(240,171,60,0.1),rgba(30,166,162,0.12))]"
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
        <CartesianStageFrame layout={STAGE_LAYOUT} xTicks={X_TICKS} yTicks={Y_TICKS}>
          {showFieldLoops ? (
            <g>
              {renderFieldLoops(
                sourceAX,
                sourceAY,
                primaryFrame.currentA,
                resolveOverlayOpacity(focusedOverlayId, "fieldLoops", 0.35),
              )}
              {renderFieldLoops(
                sourceBX,
                sourceBY,
                primaryFrame.currentB,
                resolveOverlayOpacity(focusedOverlayId, "fieldLoops", 0.35),
              )}
            </g>
          ) : null}
          {showFieldGrid
            ? renderFieldGrid(
                primaryFieldSource,
                resolveOverlayOpacity(focusedOverlayId, "fieldGrid", 0.35),
              )
            : null}
          {showScanLine ? (
            <g opacity={resolveOverlayOpacity(focusedOverlayId, "scanLine", 0.35)}>
              <line
                x1={PLOT_LEFT + 4}
                x2={PLOT_RIGHT - 4}
                y1={primaryProbeY}
                y2={primaryProbeY}
                stroke="rgba(78,166,223,0.7)"
                strokeWidth="2"
                strokeDasharray="8 6"
              />
              <text
                x={PLOT_LEFT + 10}
                y={primaryProbeY - 10}
                className="fill-sky-700 text-[11px] font-semibold"
              >
                graph scan line
              </text>
            </g>
          ) : null}
          {secondaryFrame ? (
            <g opacity="0.56">
              <WireMarker
                x={secondarySourceAX!}
                y={secondarySourceAY!}
                current={secondaryFrame.currentA}
                label={secondaryLabel ?? "Setup B"}
                radius={SOURCE_MARKER_RADIUS}
                dashed
                muted
              />
              <WireMarker
                x={secondarySourceBX!}
                y={secondarySourceBY!}
                current={secondaryFrame.currentB}
                label=""
                radius={SOURCE_MARKER_RADIUS}
                dashed
                muted
              />
              <circle
                cx={secondaryProbeX!}
                cy={secondaryProbeY!}
                r="8"
                fill="rgba(255,255,255,0.85)"
                stroke="rgba(15,28,36,0.52)"
                strokeWidth="2.4"
                strokeDasharray="7 5"
              />
            </g>
          ) : null}
          <WireMarker
            x={sourceAX}
            y={sourceAY}
            current={primaryFrame.currentA}
            label="Wire A"
            radius={SOURCE_MARKER_RADIUS}
          />
          <WireMarker
            x={sourceBX}
            y={sourceBY}
            current={primaryFrame.currentB}
            label="Wire B"
            radius={SOURCE_MARKER_RADIUS}
          />
          {showFieldVectors ? (
            <g opacity={resolveOverlayOpacity(focusedOverlayId, "fieldVectors", 0.35)}>
              <line
                x1={sourceAX}
                x2={primaryProbeX}
                y1={sourceAY}
                y2={primaryProbeY}
                stroke="rgba(240,171,60,0.4)"
                strokeWidth="1.8"
                strokeDasharray="6 5"
              />
              <line
                x1={sourceBX}
                x2={primaryProbeX}
                y1={sourceBY}
                y2={primaryProbeY}
                stroke="rgba(78,166,223,0.4)"
                strokeWidth="1.8"
                strokeDasharray="6 5"
              />
              <SvgArrow
                x1={primaryProbeX}
                y1={primaryProbeY}
                x2={sourceAContributionEnd.x}
                y2={sourceAContributionEnd.y}
                stroke="#f0ab3c"
                strokeWidth={2.4}
              />
              <SvgArrow
                x1={primaryProbeX}
                y1={primaryProbeY}
                x2={sourceBContributionEnd.x}
                y2={sourceBContributionEnd.y}
                stroke="#4ea6df"
                strokeWidth={2.4}
              />
              <SvgArrow
                x1={primaryProbeX}
                y1={primaryProbeY}
                x2={primaryFieldEndX}
                y2={primaryFieldEndY}
                stroke="#1ea6a2"
                strokeWidth={3.1}
              />
              <text
                x={primaryFieldEndX + 8}
                y={primaryFieldEndY - 6}
                className="fill-teal-700 text-[11px] font-semibold"
              >
                B net
              </text>
            </g>
          ) : null}
          <circle
            cx={primaryProbeX}
            cy={primaryProbeY}
            r="9"
            fill="rgba(255,255,255,0.96)"
            stroke="#0f1c24"
            strokeWidth="2.6"
          />
          <text
            x={primaryProbeX + 12}
            y={primaryProbeY - 12}
            className="fill-ink-700 text-[11px] font-semibold"
          >
            probe
          </text>
          {canEditPrimary ? (
            <>
              <g
                tabIndex={0}
                role="button"
                aria-label={`Move probe, current x ${formatNumber(primaryFrame.probeX)} y ${formatNumber(primaryFrame.probeY)}`}
                style={{ cursor: drag.activePointerId === null ? "grab" : "grabbing" }}
                onPointerDown={(event) => {
                  if (!canEditPrimary) {
                    return;
                  }

                  drag.startDrag(event.pointerId, "probe", event.clientX, event.clientY);
                }}
              >
                <circle cx={primaryProbeX} cy={primaryProbeY} r="22" fill="transparent" />
              </g>
              <g
                tabIndex={0}
                role="button"
                aria-label={`Adjust wire separation from wire A, current ${formatNumber(primaryFrame.sourceSeparation)} meters`}
                style={{ cursor: drag.activePointerId === null ? "ew-resize" : "grabbing" }}
                onPointerDown={(event) => {
                  drag.startDrag(event.pointerId, "sourceA", event.clientX, event.clientY);
                }}
              >
                <circle cx={sourceAX} cy={sourceAY} r="24" fill="transparent" />
              </g>
              <g
                tabIndex={0}
                role="button"
                aria-label={`Adjust wire separation from wire B, current ${formatNumber(primaryFrame.sourceSeparation)} meters`}
                style={{ cursor: drag.activePointerId === null ? "ew-resize" : "grabbing" }}
                onPointerDown={(event) => {
                  drag.startDrag(event.pointerId, "sourceB", event.clientX, event.clientY);
                }}
              >
                <circle cx={sourceBX} cy={sourceBY} r="24" fill="transparent" />
              </g>
            </>
          ) : null}
          <SimulationReadoutCard
            x={CARD_X}
            y={CARD_Y}
            width={CARD_WIDTH}
            title="Probe state"
            setupLabel={compareEnabled ? primaryLabel : undefined}
            rows={metricRows}
            noteLines={[
              `Field direction: ${directionLabel(primaryFrame.fieldX, primaryFrame.fieldY)}`,
              dominantText,
              circulationText,
            ]}
          />
        </CartesianStageFrame>
      </svg>
    </SimulationSceneCard>
  );
}
