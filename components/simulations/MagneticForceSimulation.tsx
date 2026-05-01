"use client";

import { useRef, useState } from "react";
import {
  clamp,
  formatMeasurement,
  formatNumber,
  MAGNETIC_FORCE_DEFAULT_DURATION,
  resolveMagneticForceViewport,
  sampleMagneticForcePath,
  sampleMagneticForceState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
  type SimulationControlSpec,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import { CompareLegend, resolveCompareScene, SimulationPreviewBadge } from "./primitives/compare";
import {
  CartesianStageFrame,
  clientPointToSvg,
  directionLabel,
  invertCartesianPoint,
  projectCartesianX,
  projectCartesianY,
  SvgArrow,
  type CartesianStageLayout,
} from "./primitives/electric-stage";
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

type MagneticForceSimulationProps = {
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
const HEIGHT = 382;
const PLOT_LEFT = 44;
const PLOT_TOP = 38;
const PLOT_RIGHT = 584;
const PLOT_BOTTOM = HEIGHT - 38;
const CARD_WIDTH = 220;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const WIRE_PANEL_X = CARD_X;
const WIRE_PANEL_Y = 208;
const WIRE_PANEL_WIDTH = CARD_WIDTH;
const WIRE_PANEL_HEIGHT = 140;
const HANDLE_TIME = 0.55;

function roundTo(value: number, precision = 1) {
  return Number(value.toFixed(precision));
}

function getNumericControl(
  controls: SimulationControlSpec[],
  param: string,
  fallback: { min: number; max: number; step: number },
) {
  const control = controls.find((item) => item.param === param);
  return {
    min: typeof control?.min === "number" ? control.min : fallback.min,
    max: typeof control?.max === "number" ? control.max : fallback.max,
    step: typeof control?.step === "number" ? control.step : fallback.step,
  };
}

function buildPathData(points: Array<{ x: number; y: number }>, layout: CartesianStageLayout) {
  if (!points.length) {
    return "";
  }

  return points
    .map((point, index) => {
      const prefix = index === 0 ? "M" : "L";
      return `${prefix} ${projectCartesianX(layout, point.x)} ${projectCartesianY(layout, point.y)}`;
    })
    .join(" ");
}

function vectorScale(magnitude: number, reference: number, maxLength: number) {
  if (!Number.isFinite(magnitude) || magnitude <= 0) {
    return 0;
  }

  return maxLength * Math.tanh(magnitude / Math.max(reference, 0.001));
}

function formatSignedField(value: number) {
  if (Math.abs(value) <= 0.01) {
    return "0 T";
  }

  return `${value > 0 ? "+" : ""}${formatNumber(value)} T`;
}

function fieldColors(fieldStrength: number) {
  if (fieldStrength > 0.02) {
    return {
      stroke: "#f0ab3c",
      fill: "rgba(240,171,60,0.18)",
      text: "#b87000",
    };
  }

  if (fieldStrength < -0.02) {
    return {
      stroke: "#4ea6df",
      fill: "rgba(78,166,223,0.18)",
      text: "#1d6f9f",
    };
  }

  return {
    stroke: "rgba(15,28,36,0.45)",
    fill: "rgba(15,28,36,0.12)",
    text: "#55636b",
  };
}

function renderFieldMarkers(
  layout: CartesianStageLayout,
  fieldStrength: number,
  overlayOpacity: number,
) {
  const color = fieldColors(fieldStrength).stroke;
  const columns = 7;
  const rows = 5;
  const markers = [];

  for (let row = 0; row < rows; row += 1) {
    const y =
      layout.minY + ((row + 0.5) / rows) * (layout.maxY - layout.minY);

    for (let column = 0; column < columns; column += 1) {
      const x =
        layout.minX + ((column + 0.5) / columns) * (layout.maxX - layout.minX);
      const svgX = projectCartesianX(layout, x);
      const svgY = projectCartesianY(layout, y);

      markers.push(
        <g key={`field-marker-${row}-${column}`} opacity={overlayOpacity}>
          <circle cx={svgX} cy={svgY} r="8" fill="rgba(255,255,255,0.72)" />
          {fieldStrength > 0.02 ? (
            <>
              <circle cx={svgX} cy={svgY} r="3.4" fill={color} />
              <circle cx={svgX} cy={svgY} r="1.5" fill="rgba(255,255,255,0.96)" />
            </>
          ) : fieldStrength < -0.02 ? (
            <>
              <line
                x1={svgX - 3.6}
                x2={svgX + 3.6}
                y1={svgY - 3.6}
                y2={svgY + 3.6}
                stroke={color}
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <line
                x1={svgX + 3.6}
                x2={svgX - 3.6}
                y1={svgY - 3.6}
                y2={svgY + 3.6}
                stroke={color}
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </>
          ) : (
            <circle cx={svgX} cy={svgY} r="3" fill="none" stroke={color} strokeWidth="1.6" />
          )}
        </g>,
      );
    }
  }

  return markers;
}

function buildCompareBadgeLabel(
  label: string,
  fieldStrength: number,
  negativeCharge: boolean,
) {
  return `${label}: ${formatSignedField(fieldStrength)}, ${negativeCharge ? "q-" : "q+"}`;
}

export function MagneticForceSimulation({
  concept,
  params,
  time,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: MagneticForceSimulationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activePointerId, setActivePointerId] = useState<number | null>(null);
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  const activeFrame = sampleMagneticForceState(params, displayTime);
  const frameA = compare ? sampleMagneticForceState(compare.setupA, displayTime) : null;
  const frameB = compare ? sampleMagneticForceState(compare.setupB, displayTime) : null;
  const {
    compareEnabled,
    previewedSetup,
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
  const primaryParams = compare
    ? previewedSetup === "a"
      ? compare.setupA
      : compare.setupB
    : params;
  const secondaryParams = compare
    ? previewedSetup === "a"
      ? compare.setupB
      : compare.setupA
    : null;
  const viewport = resolveMagneticForceViewport(
    secondaryParams ? [primaryParams, secondaryParams] : [primaryParams],
  );
  const layout: CartesianStageLayout = {
    width: WIDTH,
    height: HEIGHT,
    plotLeft: PLOT_LEFT,
    plotTop: PLOT_TOP,
    plotRight: PLOT_RIGHT,
    plotBottom: PLOT_BOTTOM,
    minX: -viewport.extent,
    maxX: viewport.extent,
    minY: -viewport.extent,
    maxY: viewport.extent,
  };
  const ticks = [-viewport.extent, -viewport.extent / 2, 0, viewport.extent / 2, viewport.extent];
  const showFieldMarkers = overlayValues?.fieldMarkers ?? true;
  const showMotionVectors = overlayValues?.motionVectors ?? true;
  const showOrbitGuide = overlayValues?.orbitGuide ?? true;
  const showWireForce = overlayValues?.wireForcePanel ?? true;
  const forceReference = Math.max(primaryFrame.speed * Math.abs(primaryFrame.fieldStrength), 1);
  const wireReference = Math.max(primaryFrame.current * Math.abs(primaryFrame.fieldStrength), 1);
  const chargeX = projectCartesianX(layout, primaryFrame.positionX);
  const chargeY = projectCartesianY(layout, primaryFrame.positionY);
  const originX = projectCartesianX(layout, 0);
  const originY = projectCartesianY(layout, 0);
  const launchHandleX = projectCartesianX(
    layout,
    primaryFrame.speed * Math.cos(primaryFrame.directionRadians) * HANDLE_TIME,
  );
  const launchHandleY = projectCartesianY(
    layout,
    primaryFrame.speed * Math.sin(primaryFrame.directionRadians) * HANDLE_TIME,
  );
  const orbitCenterX =
    primaryFrame.orbitCenterX === null
      ? null
      : projectCartesianX(layout, primaryFrame.orbitCenterX);
  const orbitCenterY =
    primaryFrame.orbitCenterY === null
      ? null
      : projectCartesianY(layout, primaryFrame.orbitCenterY);
  const secondaryChargeX =
    secondaryFrame ? projectCartesianX(layout, secondaryFrame.positionX) : null;
  const secondaryChargeY =
    secondaryFrame ? projectCartesianY(layout, secondaryFrame.positionY) : null;
  const primaryPath = sampleMagneticForcePath(primaryParams, 121);
  const primaryTraversedPath = primaryPath.filter((point) => point.time <= primaryFrame.time + 1e-6);
  const secondaryPath = secondaryParams ? sampleMagneticForcePath(secondaryParams, 121) : null;
  const secondaryTraversedPath = secondaryPath
    ? secondaryPath.filter((point) => point.time <= (secondaryFrame?.time ?? 0) + 1e-6)
    : null;
  const primaryVelocityLength = vectorScale(primaryFrame.speed, 5.2, 34);
  const primaryForceLength = vectorScale(primaryFrame.chargeForceMagnitude, forceReference, 32);
  const primaryVelocityEndX =
    chargeX +
    (primaryFrame.speed > 0.001
      ? (primaryFrame.velocityX / primaryFrame.speed) * primaryVelocityLength
      : 0);
  const primaryVelocityEndY =
    chargeY -
    (primaryFrame.speed > 0.001
      ? (primaryFrame.velocityY / primaryFrame.speed) * primaryVelocityLength
      : 0);
  const primaryForceEndX =
    chargeX +
    (primaryFrame.chargeForceMagnitude > 0.001
      ? (primaryFrame.chargeForceX / primaryFrame.chargeForceMagnitude) * primaryForceLength
      : 0);
  const primaryForceEndY =
    chargeY -
    (primaryFrame.chargeForceMagnitude > 0.001
      ? (primaryFrame.chargeForceY / primaryFrame.chargeForceMagnitude) * primaryForceLength
      : 0);
  const wirePanelCenterX = WIRE_PANEL_X + WIRE_PANEL_WIDTH / 2;
  const wirePanelCenterY = WIRE_PANEL_Y + WIRE_PANEL_HEIGHT / 2 + 8;
  const segmentHalfLength = 34;
  const currentDx = Math.cos(primaryFrame.directionRadians) * segmentHalfLength;
  const currentDy = Math.sin(primaryFrame.directionRadians) * segmentHalfLength;
  const wireForceLength = vectorScale(primaryFrame.wireForceMagnitude, wireReference, 36);
  const wireForceEndX =
    wirePanelCenterX +
    (primaryFrame.wireForceMagnitude > 0.001
      ? (primaryFrame.wireForceX / primaryFrame.wireForceMagnitude) * wireForceLength
      : 0);
  const wireForceEndY =
    wirePanelCenterY -
    (primaryFrame.wireForceMagnitude > 0.001
      ? (primaryFrame.wireForceY / primaryFrame.wireForceMagnitude) * wireForceLength
      : 0);
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {buildCompareBadgeLabel(compare?.labelA ?? "Setup A", frameA!.fieldStrength, frameA!.negativeCharge)}
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {buildCompareBadgeLabel(compare?.labelB ?? "Setup B", frameB!.fieldStrength, frameB!.negativeCharge)}
      </span>
    </div>
  ) : null;
  const previewBadge = graphPreview?.kind === "time" ? (
    <SimulationPreviewBadge tone="teal">
      preview t = {formatNumber(displayTime)} s
    </SimulationPreviewBadge>
  ) : null;
  const relationText =
    Math.abs(primaryFrame.fieldStrength) <= 0.02
      ? "Zero field leaves both forces at zero."
      : primaryFrame.negativeCharge
        ? "Negative charge flips only the charge force."
        : "Positive charge and current share the same force direction.";
  const metricRows = [
    { label: "B", value: formatSignedField(primaryFrame.fieldStrength) },
    { label: "q", value: primaryFrame.negativeCharge ? "-1" : "+1" },
    { label: "|v|", value: formatMeasurement(primaryFrame.speed, "m/s") },
    { label: "theta", value: `${formatNumber(primaryFrame.directionAngle)} deg` },
    { label: "|F_q|", value: formatNumber(primaryFrame.chargeForceMagnitude) },
    {
      label: "r",
      value:
        primaryFrame.radius === null
          ? "straight"
          : formatMeasurement(primaryFrame.radius, "m"),
    },
    { label: "I", value: formatMeasurement(primaryFrame.current, "A") },
    { label: "|F_wire|", value: formatNumber(primaryFrame.wireForceMagnitude) },
  ];
  const speedControl = getNumericControl(concept.simulation.controls, "speed", {
    min: 1,
    max: 7,
    step: 0.1,
  });
  const angleControl = getNumericControl(concept.simulation.controls, "directionAngle", {
    min: -180,
    max: 180,
    step: 1,
  });

  function updateLaunchFromClient(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg || !canEditPrimary) {
      return;
    }

    const bounds = svg.getBoundingClientRect();
    const pointer = clientPointToSvg(clientX, clientY, bounds, WIDTH, HEIGHT);
    const world = invertCartesianPoint(layout, pointer.svgX, pointer.svgY);
    const nextSpeed = clamp(
      Math.hypot(world.x, world.y) / HANDLE_TIME,
      speedControl.min,
      speedControl.max,
    );
    const nextAngle = clamp(
      (Math.atan2(world.y, world.x) * 180) / Math.PI,
      angleControl.min,
      angleControl.max,
    );

    setParam("speed", roundTo(nextSpeed, speedControl.step < 1 ? 1 : 0));
    setParam("directionAngle", roundTo(nextAngle, angleControl.step < 1 ? 1 : 0));
  }

  function stopDrag(pointerId?: number) {
    const svg = svgRef.current;

    if (svg && pointerId !== undefined && svg.hasPointerCapture(pointerId)) {
      svg.releasePointerCapture(pointerId);
    }

    setActivePointerId(null);
  }

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(30,166,162,0.11),rgba(240,171,60,0.1))]"
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
          if (activePointerId !== event.pointerId) {
            return;
          }

          updateLaunchFromClient(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          if (activePointerId === event.pointerId) {
            stopDrag(event.pointerId);
          }
        }}
        onPointerCancel={(event) => {
          if (activePointerId === event.pointerId) {
            stopDrag(event.pointerId);
          }
        }}
        onLostPointerCapture={() => setActivePointerId(null)}
      >
        <CartesianStageFrame layout={layout} xTicks={ticks} yTicks={ticks}>
          {showFieldMarkers
            ? renderFieldMarkers(
                layout,
                primaryFrame.fieldStrength,
                resolveOverlayOpacity(focusedOverlayId, "fieldMarkers", 0.34),
              )
            : null}
          <text
            x={PLOT_LEFT + 12}
            y={PLOT_TOP + 18}
            className="fill-ink-600 text-[11px] font-semibold uppercase tracking-[0.14em]"
          >
            B {primaryFrame.fieldOrientation}
          </text>
          {secondaryPath ? (
            <>
              <path
                d={buildPathData(secondaryPath, layout)}
                fill="none"
                stroke="rgba(15,28,36,0.24)"
                strokeDasharray="8 7"
                strokeWidth="2.6"
              />
              <path
                d={buildPathData(secondaryTraversedPath ?? [], layout)}
                fill="none"
                stroke="rgba(15,28,36,0.48)"
                strokeDasharray="8 7"
                strokeWidth="3"
              />
              <circle
                cx={secondaryChargeX!}
                cy={secondaryChargeY!}
                r="7"
                fill="rgba(255,255,255,0.86)"
                stroke="rgba(15,28,36,0.58)"
                strokeWidth="2.2"
                strokeDasharray="6 4"
              />
            </>
          ) : null}
          {showOrbitGuide ? (
            <g opacity={resolveOverlayOpacity(focusedOverlayId, "orbitGuide", 0.34)}>
              <path
                d={buildPathData(primaryPath, layout)}
                fill="none"
                stroke="rgba(30,166,162,0.42)"
                strokeDasharray="7 6"
                strokeWidth="2.8"
              />
              {orbitCenterX !== null && orbitCenterY !== null ? (
                <>
                  <line
                    x1={chargeX}
                    x2={orbitCenterX}
                    y1={chargeY}
                    y2={orbitCenterY}
                    stroke="rgba(15,28,36,0.2)"
                    strokeDasharray="6 5"
                    strokeWidth="2"
                  />
                  <circle
                    cx={orbitCenterX}
                    cy={orbitCenterY}
                    r="5"
                    fill="#1ea6a2"
                    stroke="rgba(255,255,255,0.96)"
                    strokeWidth="2"
                  />
                  <text
                    x={orbitCenterX + 10}
                    y={orbitCenterY - 10}
                    className="fill-teal-700 text-[11px] font-semibold"
                  >
                    center
                  </text>
                </>
              ) : null}
            </g>
          ) : null}
          <path
            d={buildPathData(primaryTraversedPath, layout)}
            fill="none"
            stroke="#1ea6a2"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {showMotionVectors ? (
            <g opacity={resolveOverlayOpacity(focusedOverlayId, "motionVectors", 0.34)}>
              <SvgArrow
                x1={chargeX}
                y1={chargeY}
                x2={primaryVelocityEndX}
                y2={primaryVelocityEndY}
                stroke="#4ea6df"
                strokeWidth={2.8}
              />
              <SvgArrow
                x1={chargeX}
                y1={chargeY}
                x2={primaryForceEndX}
                y2={primaryForceEndY}
                stroke="#f16659"
                strokeWidth={3}
              />
              <text
                x={primaryVelocityEndX + 8}
                y={primaryVelocityEndY - 6}
                className="fill-sky-700 text-[11px] font-semibold"
              >
                v
              </text>
              <text
                x={primaryForceEndX + 8}
                y={primaryForceEndY - 6}
                className="fill-coral-700 text-[11px] font-semibold"
              >
                F_q
              </text>
            </g>
          ) : null}
          <circle
            cx={originX}
            cy={originY}
            r="5"
            fill="#0f1c24"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="2"
          />
          <text
            x={originX + 10}
            y={originY - 10}
            className="fill-ink-600 text-[11px] font-semibold"
          >
            launch
          </text>
          <circle
            cx={chargeX}
            cy={chargeY}
            r="8.5"
            fill={primaryFrame.negativeCharge ? "rgba(78,166,223,0.96)" : "rgba(240,171,60,0.96)"}
            stroke="rgba(255,255,255,0.92)"
            strokeWidth="3"
          />
          <text
            x={chargeX + 12}
            y={chargeY - 12}
            className="fill-ink-700 text-[11px] font-semibold"
          >
            {primaryFrame.negativeCharge ? "q-" : "q+"}
          </text>
          <line
            x1={originX}
            x2={launchHandleX}
            y1={originY}
            y2={launchHandleY}
            stroke="rgba(15,28,36,0.4)"
            strokeDasharray="6 5"
            strokeWidth="2.2"
          />
          <circle
            cx={launchHandleX}
            cy={launchHandleY}
            r="8"
            fill="#f0ab3c"
            stroke="rgba(255,255,255,0.94)"
            strokeWidth="3"
            style={{ cursor: canEditPrimary ? "grab" : "default" }}
            onPointerDown={(event) => {
              if (!canEditPrimary) {
                return;
              }

              svgRef.current?.setPointerCapture(event.pointerId);
              setActivePointerId(event.pointerId);
              updateLaunchFromClient(event.clientX, event.clientY);
            }}
          />
          <text
            x={launchHandleX + 10}
            y={launchHandleY - 8}
            className="fill-amber-700 text-[11px] font-semibold"
          >
            drag v0
          </text>
          <SimulationReadoutCard
            x={CARD_X}
            y={CARD_Y}
            width={CARD_WIDTH}
            title="Live readout"
            setupLabel={compareEnabled ? primaryLabel : undefined}
            rows={metricRows}
            noteLines={[
              `Field: ${primaryFrame.fieldOrientation}`,
              `Charge force: ${directionLabel(primaryFrame.chargeForceX, primaryFrame.chargeForceY)}`,
              relationText,
            ]}
          />
          {showWireForce ? (
            <g opacity={resolveOverlayOpacity(focusedOverlayId, "wireForcePanel", 0.34)}>
              <rect
                x={WIRE_PANEL_X}
                y={WIRE_PANEL_Y}
                width={WIRE_PANEL_WIDTH}
                height={WIRE_PANEL_HEIGHT}
                rx="20"
                fill="rgba(255,253,247,0.92)"
                stroke="rgba(15,28,36,0.14)"
              />
              <text
                x={WIRE_PANEL_X + 16}
                y={WIRE_PANEL_Y + 24}
                className="fill-ink-700 text-[11px] font-semibold uppercase tracking-[0.14em]"
              >
                Current segment
              </text>
              <text
                x={WIRE_PANEL_X + 16}
                y={WIRE_PANEL_Y + 42}
                className="fill-ink-600 text-[11px]"
              >
                Same direction control, separate I slider
              </text>
              {secondaryFrame ? (
                <>
                  <line
                    x1={wirePanelCenterX - Math.cos(secondaryFrame.directionRadians) * segmentHalfLength}
                    x2={wirePanelCenterX + Math.cos(secondaryFrame.directionRadians) * segmentHalfLength}
                    y1={wirePanelCenterY + Math.sin(secondaryFrame.directionRadians) * segmentHalfLength}
                    y2={wirePanelCenterY - Math.sin(secondaryFrame.directionRadians) * segmentHalfLength}
                    stroke="rgba(15,28,36,0.36)"
                    strokeWidth="3"
                    strokeDasharray="8 6"
                    strokeLinecap="round"
                  />
                  <circle cx={wirePanelCenterX} cy={wirePanelCenterY} r="5" fill="rgba(15,28,36,0.36)" />
                </>
              ) : null}
              <line
                x1={wirePanelCenterX - currentDx}
                x2={wirePanelCenterX + currentDx}
                y1={wirePanelCenterY + currentDy}
                y2={wirePanelCenterY - currentDy}
                stroke="#0f1c24"
                strokeWidth="4.2"
                strokeLinecap="round"
              />
              <SvgArrow
                x1={wirePanelCenterX}
                y1={wirePanelCenterY}
                x2={wireForceEndX}
                y2={wireForceEndY}
                stroke="#f16659"
                strokeWidth={3}
              />
              <text
                x={wirePanelCenterX + currentDx + 8}
                y={wirePanelCenterY - currentDy}
                className="fill-ink-700 text-[11px] font-semibold"
              >
                I
              </text>
              <text
                x={wireForceEndX + 8}
                y={wireForceEndY - 6}
                className="fill-coral-700 text-[11px] font-semibold"
              >
                F_wire
              </text>
              <text
                x={WIRE_PANEL_X + 16}
                y={WIRE_PANEL_Y + 112}
                className="fill-ink-600 text-[11px]"
              >
                {primaryFrame.negativeCharge
                  ? "q- flips relative to the wire force."
                  : "q+ matches the wire-force side."}
              </text>
              <text
                x={WIRE_PANEL_X + 16}
                y={WIRE_PANEL_Y + 128}
                className="fill-ink-500 text-[10px] font-semibold"
              >
                preview window: {formatNumber(Math.max(primaryFrame.duration, MAGNETIC_FORCE_DEFAULT_DURATION))} s
              </text>
            </g>
          ) : null}
        </CartesianStageFrame>
      </svg>
    </SimulationSceneCard>
  );
}
