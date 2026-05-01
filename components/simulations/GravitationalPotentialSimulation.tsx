"use client";

import { useRef } from "react";
import {
  clamp,
  formatMeasurement,
  formatNumber,
  GRAVITATIONAL_POTENTIAL_MIN_SAMPLE_DISTANCE,
  GRAVITATIONAL_POTENTIAL_STAGE_MAX_X,
  GRAVITATIONAL_POTENTIAL_STAGE_MAX_Y,
  GRAVITATIONAL_POTENTIAL_STAGE_MIN_X,
  GRAVITATIONAL_POTENTIAL_STAGE_MIN_Y,
  sampleGravitationalPotentialState,
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
import {
  CartesianStageFrame,
  directionLabel,
  invertCartesianPoint,
  projectCartesianX,
  projectCartesianY,
  type CartesianStageLayout,
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

type GravitationalPotentialSimulationProps = {
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
const PLOT_LEFT = 44;
const PLOT_TOP = 38;
const PLOT_RIGHT = 596;
const PLOT_BOTTOM = HEIGHT - 38;
const CARD_WIDTH = 222;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const PROBE_KEYBOARD_STEP = 0.05;
const POTENTIAL_MAP_COLUMNS = 24;
const POTENTIAL_MAP_ROWS = 16;
const DISTANCE_RING_RADII = [1, 2, 3] as const;
const POTENTIAL_LEVELS = [0.5, 0.8, 1.2, 2, 3] as const;
const STAGE_LAYOUT: CartesianStageLayout = {
  width: WIDTH,
  height: HEIGHT,
  plotLeft: PLOT_LEFT,
  plotTop: PLOT_TOP,
  plotRight: PLOT_RIGHT,
  plotBottom: PLOT_BOTTOM,
  minX: GRAVITATIONAL_POTENTIAL_STAGE_MIN_X,
  maxX: GRAVITATIONAL_POTENTIAL_STAGE_MAX_X,
  minY: GRAVITATIONAL_POTENTIAL_STAGE_MIN_Y,
  maxY: GRAVITATIONAL_POTENTIAL_STAGE_MAX_Y,
};
const X_TICKS = [
  GRAVITATIONAL_POTENTIAL_STAGE_MIN_X,
  -1.6,
  0,
  1.6,
  GRAVITATIONAL_POTENTIAL_STAGE_MAX_X,
];
const Y_TICKS = [
  GRAVITATIONAL_POTENTIAL_STAGE_MIN_Y,
  -1.2,
  0,
  1.2,
  GRAVITATIONAL_POTENTIAL_STAGE_MAX_Y,
];

function roundTo(value: number, precision = 2) {
  return Number(value.toFixed(precision));
}

function vectorScale(magnitude: number, maxLength: number) {
  if (!Number.isFinite(magnitude) || magnitude <= 0) {
    return 0;
  }

  return maxLength * Math.tanh(magnitude / 2.3);
}

function resolveMassMarkerRadius(sourceMass: number) {
  return 18 + Math.min(12, sourceMass * 2.8);
}

function formatMass(value: number) {
  return `${formatNumber(value)} kg`;
}

function potentialCellFill(value: number) {
  const normalized = Math.tanh(Math.abs(value) / 2.4);
  const alpha = 0.05 + normalized * 0.34;
  return `rgba(29,111,159,${alpha.toFixed(3)})`;
}

function renderPotentialMap(
  sourceMass: number,
  overlayOpacity: number,
) {
  const stageWidth = STAGE_LAYOUT.plotRight - STAGE_LAYOUT.plotLeft;
  const stageHeight = STAGE_LAYOUT.plotBottom - STAGE_LAYOUT.plotTop;
  const cellWidth = stageWidth / POTENTIAL_MAP_COLUMNS;
  const cellHeight = stageHeight / POTENTIAL_MAP_ROWS;
  const items = [];

  for (let row = 0; row < POTENTIAL_MAP_ROWS; row += 1) {
    const y =
      GRAVITATIONAL_POTENTIAL_STAGE_MAX_Y -
      ((row + 0.5) / POTENTIAL_MAP_ROWS) *
        (GRAVITATIONAL_POTENTIAL_STAGE_MAX_Y - GRAVITATIONAL_POTENTIAL_STAGE_MIN_Y);

    for (let column = 0; column < POTENTIAL_MAP_COLUMNS; column += 1) {
      const x =
        GRAVITATIONAL_POTENTIAL_STAGE_MIN_X +
        ((column + 0.5) / POTENTIAL_MAP_COLUMNS) *
          (GRAVITATIONAL_POTENTIAL_STAGE_MAX_X - GRAVITATIONAL_POTENTIAL_STAGE_MIN_X);
      const snapshot = sampleGravitationalPotentialState({
        sourceMass,
        testMass: 1,
        probeX: x,
        probeY: y,
      });

      items.push(
        <rect
          key={`potential-cell-${row}-${column}`}
          x={STAGE_LAYOUT.plotLeft + column * cellWidth}
          y={STAGE_LAYOUT.plotTop + row * cellHeight}
          width={cellWidth + 0.5}
          height={cellHeight + 0.5}
          fill={potentialCellFill(snapshot.potential)}
          opacity={overlayOpacity}
        />,
      );
    }
  }

  return items;
}

function renderDistanceRings(cx: number, cy: number, overlayOpacity: number) {
  return (
    <g opacity={overlayOpacity}>
      {DISTANCE_RING_RADII.map((radius) => {
        const pixelRadius = Math.abs(projectCartesianX(STAGE_LAYOUT, radius) - cx);

        return (
          <g key={`distance-ring-${radius}`}>
            <circle
              cx={cx}
              cy={cy}
              r={pixelRadius}
              fill="none"
              stroke="rgba(15,28,36,0.18)"
              strokeDasharray="8 7"
              strokeWidth="1.7"
            />
            <text
              x={projectCartesianX(STAGE_LAYOUT, radius) - 8}
              y={cy - 8}
              className="fill-ink-500 text-[10px] font-semibold"
            >
              {radius} m
            </text>
          </g>
        );
      })}
    </g>
  );
}

function renderPotentialContours(
  sourceMass: number,
  cx: number,
  cy: number,
  overlayOpacity: number,
) {
  return (
    <g opacity={overlayOpacity}>
      {POTENTIAL_LEVELS.map((magnitude) => {
        const radius = sourceMass / magnitude;
        if (
          radius < GRAVITATIONAL_POTENTIAL_MIN_SAMPLE_DISTANCE ||
          radius > GRAVITATIONAL_POTENTIAL_STAGE_MAX_X + 0.2
        ) {
          return null;
        }

        const pixelRadius = Math.abs(projectCartesianX(STAGE_LAYOUT, radius) - cx);
        const labelX = cx + pixelRadius * 0.7;
        const labelY = cy - pixelRadius * 0.7;

        return (
          <g key={`potential-contour-${magnitude}`}>
            <circle
              cx={cx}
              cy={cy}
              r={pixelRadius}
              fill="none"
              stroke="rgba(29,111,159,0.72)"
              strokeWidth={magnitude >= 2 ? 1.9 : 1.35}
            />
            <text
              x={labelX}
              y={labelY}
              className="fill-sky-700 text-[10px] font-semibold"
            >
              phi = -{formatNumber(magnitude)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function buildFrame(source: SimulationParams, previewProbeX?: number) {
  return previewProbeX === undefined
    ? sampleGravitationalPotentialState(source)
    : sampleGravitationalPotentialState(source, {
        probeX: previewProbeX,
      });
}

export function GravitationalPotentialSimulation({
  concept,
  params,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: GravitationalPotentialSimulationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const previewProbeX =
    graphPreview?.kind === "response"
      ? clamp(
          graphPreview.point.x,
          GRAVITATIONAL_POTENTIAL_STAGE_MIN_X,
          GRAVITATIONAL_POTENTIAL_STAGE_MAX_X,
        )
      : undefined;
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const activeFrame = buildFrame(params, previewProbeX);
  const frameA =
    compare ? buildFrame(compare.setupA, previewedSetup === "a" ? previewProbeX : undefined) : null;
  const frameB =
    compare ? buildFrame(compare.setupB, previewedSetup === "b" ? previewProbeX : undefined) : null;
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
  const showPotentialMap = overlayValues?.potentialMap ?? true;
  const showPotentialContours = overlayValues?.potentialContours ?? true;
  const showFieldArrow = overlayValues?.fieldArrow ?? true;
  const showForceArrow = overlayValues?.forceArrow ?? true;
  const showDistanceRings = overlayValues?.distanceRings ?? true;
  const showScanLine = overlayValues?.scanLine ?? true;

  function commitProbePosition(nextProbeX: number, nextProbeY: number) {
    if (!canEditPrimary) {
      return;
    }

    const resolvedProbeX = roundTo(
      clamp(nextProbeX, GRAVITATIONAL_POTENTIAL_STAGE_MIN_X, GRAVITATIONAL_POTENTIAL_STAGE_MAX_X),
      2,
    );
    const resolvedProbeY = roundTo(
      clamp(nextProbeY, GRAVITATIONAL_POTENTIAL_STAGE_MIN_Y, GRAVITATIONAL_POTENTIAL_STAGE_MAX_Y),
      2,
    );

    if (resolvedProbeX !== primaryFrame.probeX) {
      setParam("probeX", resolvedProbeX);
    }

    if (resolvedProbeY !== primaryFrame.probeY) {
      setParam("probeY", resolvedProbeY);
    }
  }

  function nudgeProbe(deltaX: number, deltaY: number) {
    commitProbePosition(primaryFrame.probeX + deltaX, primaryFrame.probeY + deltaY);
  }

  const drag = useSvgPointerDrag<"probe">({
    svgRef,
    width: WIDTH,
    height: HEIGHT,
    onDrag: (_, location) => {
      const world = invertCartesianPoint(STAGE_LAYOUT, location.svgX, location.svgY);
      commitProbePosition(world.x, world.y);
    },
  });

  const previewBadge = graphPreview?.kind === "response" ? (
    <SimulationPreviewBadge tone="sky">
      preview x = {formatMeasurement(previewProbeX ?? 0, "m")}
    </SimulationPreviewBadge>
  ) : null;
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? "Setup A")}: phi {formatNumber(frameA!.potential)} / U{" "}
        {formatNumber(frameA!.potentialEnergy)}
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: phi {formatNumber(frameB!.potential)} / U{" "}
        {formatNumber(frameB!.potentialEnergy)}
      </span>
    </div>
  ) : null;
  const metricRows = [
    { label: "M_source", value: formatMass(primaryFrame.sourceMass) },
    { label: "m_test", value: formatMass(primaryFrame.testMass) },
    { label: "x_p", value: formatMeasurement(primaryFrame.probeX, "m") },
    { label: "y_p", value: formatMeasurement(primaryFrame.probeY, "m") },
    { label: "r", value: formatMeasurement(primaryFrame.effectiveDistance, "m") },
    { label: "phi", value: formatNumber(primaryFrame.potential) },
    { label: "U", value: formatNumber(primaryFrame.potentialEnergy) },
    { label: "|g|", value: formatNumber(primaryFrame.fieldMagnitude) },
    { label: "|F|", value: formatNumber(primaryFrame.forceMagnitude) },
  ];
  const sourceX = projectCartesianX(STAGE_LAYOUT, 0);
  const sourceY = projectCartesianY(STAGE_LAYOUT, 0);
  const sourceRadius = resolveMassMarkerRadius(primaryFrame.sourceMass);
  const secondarySourceRadius = secondaryFrame
    ? resolveMassMarkerRadius(secondaryFrame.sourceMass)
    : null;
  const primaryProbeX = projectCartesianX(STAGE_LAYOUT, primaryFrame.probeX);
  const primaryProbeY = projectCartesianY(STAGE_LAYOUT, primaryFrame.probeY);
  const secondaryProbeX = secondaryFrame
    ? projectCartesianX(STAGE_LAYOUT, secondaryFrame.probeX)
    : null;
  const secondaryProbeY = secondaryFrame
    ? projectCartesianY(STAGE_LAYOUT, secondaryFrame.probeY)
    : null;
  const fieldVectorLength = vectorScale(primaryFrame.fieldMagnitude, 58);
  const forceVectorLength = vectorScale(primaryFrame.forceMagnitude, 58);
  const primaryFieldEndX =
    primaryProbeX +
    (primaryFrame.fieldMagnitude > 0.001
      ? (primaryFrame.fieldX / primaryFrame.fieldMagnitude) * fieldVectorLength
      : 0);
  const primaryFieldEndY =
    primaryProbeY -
    (primaryFrame.fieldMagnitude > 0.001
      ? (primaryFrame.fieldY / primaryFrame.fieldMagnitude) * fieldVectorLength
      : 0);
  const primaryForceEndX =
    primaryProbeX +
    (primaryFrame.forceMagnitude > 0.001
      ? (primaryFrame.forceX / primaryFrame.forceMagnitude) * forceVectorLength
      : 0);
  const primaryForceEndY =
    primaryProbeY -
    (primaryFrame.forceMagnitude > 0.001
      ? (primaryFrame.forceY / primaryFrame.forceMagnitude) * forceVectorLength
      : 0);
  const slopeNote =
    Math.abs(primaryFrame.probeY) <= 0.05
      ? "On the horizontal scan line, g_x matches -dphi/dx."
      : "The field arrow points toward more negative phi and cuts across the contour circles.";
  const potentialNote =
    primaryFrame.distance + 0.01 < primaryFrame.effectiveDistance
      ? "The probe is inside the bounded minimum sample radius, so the displayed well depth is clipped for readability near the source."
      : primaryFrame.effectiveDistance >= 2
        ? "Farther from the source, phi rises toward zero while staying negative because zero is set at infinity."
        : "Closer to the source, phi becomes more negative and the well deepens quickly.";
  const energyNote =
    primaryFrame.testMass >= 2
      ? "Changing only m_test makes U and F larger in magnitude without changing phi or g."
      : "For positive mass, U keeps the same negative sign as phi in this one-source gravity well.";

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(29,111,159,0.12),rgba(15,28,36,0.08))]"
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
          {showPotentialMap
            ? renderPotentialMap(
                primaryFrame.sourceMass,
                resolveOverlayOpacity(focusedOverlayId, "potentialMap", 0.35),
              )
            : null}
          {showPotentialContours
            ? renderPotentialContours(
                primaryFrame.sourceMass,
                sourceX,
                sourceY,
                resolveOverlayOpacity(focusedOverlayId, "potentialContours", 0.35),
              )
            : null}
          {showDistanceRings
            ? renderDistanceRings(
                sourceX,
                sourceY,
                resolveOverlayOpacity(focusedOverlayId, "distanceRings", 0.4),
              )
            : null}
          {showScanLine ? (
            <g opacity={resolveOverlayOpacity(focusedOverlayId, "scanLine", 0.35)}>
              <line
                x1={PLOT_LEFT + 4}
                x2={PLOT_RIGHT - 4}
                y1={primaryProbeY}
                y2={primaryProbeY}
                stroke="rgba(78,166,223,0.72)"
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
              <circle
                cx={sourceX}
                cy={sourceY}
                r={secondarySourceRadius!}
                fill="none"
                stroke="rgba(15,28,36,0.52)"
                strokeDasharray="8 6"
                strokeWidth="2.4"
              />
              <line
                x1={sourceX}
                x2={secondaryProbeX!}
                y1={sourceY}
                y2={secondaryProbeY!}
                stroke="rgba(15,28,36,0.42)"
                strokeWidth="1.8"
                strokeDasharray="7 5"
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
          <circle
            cx={sourceX}
            cy={sourceY}
            r={sourceRadius}
            fill="rgba(15,28,36,0.12)"
            stroke="#0f1c24"
            strokeWidth="2.8"
          />
          <text
            x={sourceX}
            y={sourceY + 4}
            textAnchor="middle"
            className="fill-ink-950 text-[12px] font-semibold"
          >
            M
          </text>
          <text
            x={sourceX}
            y={sourceY - sourceRadius - 10}
            textAnchor="middle"
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
          >
            source mass
          </text>
          <text
            x={sourceX}
            y={sourceY + sourceRadius + 18}
            textAnchor="middle"
            className="fill-ink-600 text-[10px] font-semibold"
          >
            {formatMass(primaryFrame.sourceMass)}
          </text>
          {showFieldArrow ? (
            <g opacity={resolveOverlayOpacity(focusedOverlayId, "fieldArrow", 0.35)}>
              <line
                x1={sourceX}
                x2={primaryProbeX}
                y1={sourceY}
                y2={primaryProbeY}
                stroke="rgba(15,28,36,0.38)"
                strokeWidth="1.8"
                strokeDasharray="6 5"
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
                g downhill
              </text>
            </g>
          ) : null}
          {showForceArrow && primaryFrame.forceMagnitude > 0.001 ? (
            <g opacity={resolveOverlayOpacity(focusedOverlayId, "forceArrow", 0.35)}>
              <SvgArrow
                x1={primaryProbeX}
                y1={primaryProbeY}
                x2={primaryForceEndX}
                y2={primaryForceEndY}
                stroke="#f16659"
                strokeWidth={3.1}
              />
              <text
                x={primaryForceEndX + 8}
                y={primaryForceEndY + 12}
                className="fill-coral-700 text-[11px] font-semibold"
              >
                F on m_test
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
            x={primaryProbeX}
            y={primaryProbeY + 4}
            textAnchor="middle"
            className="fill-ink-950 text-[10px] font-semibold"
          >
            m
          </text>
          <text
            x={primaryProbeX + 12}
            y={primaryProbeY - 12}
            className="fill-ink-700 text-[11px] font-semibold"
          >
            phi {formatNumber(primaryFrame.potential)}
          </text>
          {canEditPrimary ? (
            <g
              tabIndex={0}
              role="button"
              aria-label={`Move probe, current x ${formatNumber(primaryFrame.probeX)} y ${formatNumber(primaryFrame.probeY)}`}
              style={{ cursor: drag.activePointerId === null ? "grab" : "grabbing" }}
              onPointerDown={(event) => {
                drag.startDrag(event.pointerId, "probe", event.clientX, event.clientY);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  nudgeProbe(-PROBE_KEYBOARD_STEP, 0);
                } else if (event.key === "ArrowRight") {
                  event.preventDefault();
                  nudgeProbe(PROBE_KEYBOARD_STEP, 0);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  nudgeProbe(0, PROBE_KEYBOARD_STEP);
                } else if (event.key === "ArrowDown") {
                  event.preventDefault();
                  nudgeProbe(0, -PROBE_KEYBOARD_STEP);
                }
              }}
            >
              <circle cx={primaryProbeX} cy={primaryProbeY} r="24" fill="transparent" />
            </g>
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
              slopeNote,
              potentialNote,
              energyNote,
            ]}
          />
        </CartesianStageFrame>
      </svg>
    </SimulationSceneCard>
  );
}
