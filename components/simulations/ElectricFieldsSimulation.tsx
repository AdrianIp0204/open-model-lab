"use client";

import { useRef } from "react";
import { useLocale } from "next-intl";
import {
  clamp,
  ELECTRIC_FIELDS_MAX_SEPARATION,
  ELECTRIC_FIELDS_MIN_SEPARATION,
  ELECTRIC_FIELDS_STAGE_MAX_X,
  ELECTRIC_FIELDS_STAGE_MAX_Y,
  ELECTRIC_FIELDS_STAGE_MIN_X,
  ELECTRIC_FIELDS_STAGE_MIN_Y,
  formatMeasurement,
  formatNumber,
  sampleElectricFieldsState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import { CompareLegend, resolveCompareScene, SimulationPreviewBadge } from "./primitives/compare";
import {
  CartesianStageFrame,
  ChargeMarker,
  directionLabel,
  type CartesianStageLayout,
  formatSignedCharge,
  invertCartesianPoint,
  projectCartesianX,
  projectCartesianY,
  SvgArrow,
} from "./primitives/electric-stage";
import { resolveOverlayOpacity } from "./primitives/overlay";
import { SimulationSceneCard } from "./primitives/scene-card";
import { useSvgPointerDrag } from "./primitives/useSvgPointerDrag";
import type { AppLocale } from "@/i18n/routing";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type ElectricFieldsSimulationProps = {
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
const PROBE_KEYBOARD_STEP = 0.05;
const SEPARATION_KEYBOARD_STEP = 0.05;
const STAGE_LAYOUT: CartesianStageLayout = {
  width: WIDTH,
  height: HEIGHT,
  plotLeft: PLOT_LEFT,
  plotTop: PLOT_TOP,
  plotRight: PLOT_RIGHT,
  plotBottom: PLOT_BOTTOM,
  minX: ELECTRIC_FIELDS_STAGE_MIN_X,
  maxX: ELECTRIC_FIELDS_STAGE_MAX_X,
  minY: ELECTRIC_FIELDS_STAGE_MIN_Y,
  maxY: ELECTRIC_FIELDS_STAGE_MAX_Y,
};
const X_TICKS = [ELECTRIC_FIELDS_STAGE_MIN_X, -1.6, 0, 1.6, ELECTRIC_FIELDS_STAGE_MAX_X];
const Y_TICKS = [ELECTRIC_FIELDS_STAGE_MIN_Y, -1.2, 0, 1.2, ELECTRIC_FIELDS_STAGE_MAX_Y];

function getElectricFieldsCopy(locale: AppLocale) {
  if (locale === "zh-HK") {
    return {
      setupA: "設定 A",
      setupB: "設定 B",
      sourceA: "來源 A",
      sourceB: "來源 B",
      graphScanLine: "圖表掃描線",
      eNet: "淨電場",
      forceOnTestCharge: "測試電荷受力",
      probeState: "探針狀態",
      stageDescription:
        "拖動舞台上的探針即可改變採樣位置；拖動任一來源標記則會同步調整兩個來源的共同間距。電場箭頭、受力箭頭與掃描圖表都會沿用同一個受限模型。",
      dominantSourceA: "來源 A 在這裡提供較強的局部電場。",
      dominantSourceB: "來源 B 在這裡提供較強的局部電場。",
      dominantBalanced: "這裡兩個來源的電場貢獻相當接近。",
      dominantNone: "這個探針位置的兩個來源貢獻都很小。",
      zeroForce: "測試電荷為零，因此不會顯示受力箭頭。",
      alignedForce: "正測試電荷令受力方向與電場方向一致。",
      opposedForce: "負測試電荷會令受力方向與電場方向相反。",
      moveProbeAria: "移動探針，目前 x {x}、y {y}",
      adjustSourceAAria: "由來源 A 調整來源間距，目前 {separation} 米",
      adjustSourceBAria: "由來源 B 調整來源間距，目前 {separation} 米",
      fieldDirectionLabel: "電場方向：{direction}",
      previewX: "預覽 x =",
      directionRight: "向右",
      directionLeft: "向左",
      directionUp: "向上",
      directionDown: "向下",
      directionNeutral: "近乎為零",
    };
  }

  return {
    setupA: "Setup A",
    setupB: "Setup B",
    sourceA: "Source A",
    sourceB: "Source B",
    graphScanLine: "graph scan line",
    eNet: "E net",
    forceOnTestCharge: "F on q_test",
    probeState: "Probe state",
    stageDescription:
      "Drag the probe anywhere in the stage or drag either source marker to change the shared separation. The field arrows, force arrow, and scan graphs stay on the same bounded model.",
    dominantSourceA: "Source A contributes more local field here.",
    dominantSourceB: "Source B contributes more local field here.",
    dominantBalanced: "The two source contributions are closely balanced here.",
    dominantNone: "Neither source contributes much field at this probe point.",
    zeroForce: "Zero test charge means no force arrow.",
    alignedForce: "Positive test charge keeps force aligned with the field.",
    opposedForce: "Negative test charge flips the force opposite the field.",
    moveProbeAria: "Move probe, current x {x} y {y}",
    adjustSourceAAria: "Adjust source separation from source A, current {separation} meters",
    adjustSourceBAria: "Adjust source separation from source B, current {separation} meters",
    fieldDirectionLabel: "Field direction: {direction}",
    previewX: "preview x =",
    directionRight: "right",
    directionLeft: "left",
    directionUp: "up",
    directionDown: "down",
    directionNeutral: "neutral",
  };
}

function localizeFieldDirection(
  label: string,
  copy: ReturnType<typeof getElectricFieldsCopy>,
) {
  switch (label) {
    case "up-right":
      return copy.directionRight === "right" ? "up-right" : "右上";
    case "up-left":
      return copy.directionLeft === "left" ? "up-left" : "左上";
    case "down-right":
      return copy.directionRight === "right" ? "down-right" : "右下";
    case "down-left":
      return copy.directionLeft === "left" ? "down-left" : "左下";
    case "right":
      return copy.directionRight;
    case "left":
      return copy.directionLeft;
    case "up":
      return copy.directionUp;
    case "down":
      return copy.directionDown;
    case "neutral":
      return copy.directionNeutral;
    default:
      return label;
  }
}

function roundTo(value: number, precision = 2) {
  return Number(value.toFixed(precision));
}

function vectorScale(magnitude: number, maxLength: number) {
  if (!Number.isFinite(magnitude) || magnitude <= 0) {
    return 0;
  }

  return maxLength * Math.tanh(magnitude / 2.4);
}

function renderFieldGrid(
  source: SimulationParams,
  overlayOpacity: number,
) {
  const columns = 7;
  const rows = 5;
  const items = [];

  for (let row = 0; row < rows; row += 1) {
    const y =
      ELECTRIC_FIELDS_STAGE_MIN_Y +
      ((row + 0.5) / rows) *
        (ELECTRIC_FIELDS_STAGE_MAX_Y - ELECTRIC_FIELDS_STAGE_MIN_Y);

    for (let column = 0; column < columns; column += 1) {
      const x =
        ELECTRIC_FIELDS_STAGE_MIN_X +
        ((column + 0.5) / columns) *
          (ELECTRIC_FIELDS_STAGE_MAX_X - ELECTRIC_FIELDS_STAGE_MIN_X);
      const snapshot = sampleElectricFieldsState(source, { probeX: x, probeY: y });
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

function buildFrame(source: SimulationParams, previewProbeX?: number) {
  return sampleElectricFieldsState(source, {
    probeX: previewProbeX,
  });
}

export function ElectricFieldsSimulation({
  concept,
  params,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: ElectricFieldsSimulationProps) {
  const locale = useLocale() as AppLocale;
  const copy = getElectricFieldsCopy(locale);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const previewProbeX =
    graphPreview?.kind === "response"
      ? clamp(
          graphPreview.point.x,
          ELECTRIC_FIELDS_STAGE_MIN_X,
          ELECTRIC_FIELDS_STAGE_MAX_X,
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
  const showFieldGrid = overlayValues?.fieldGrid ?? true;
  const showFieldVectors = overlayValues?.fieldVectors ?? true;
  const showForceVector = overlayValues?.forceVector ?? true;
  const showScanLine = overlayValues?.scanLine ?? true;
  const primaryFieldSource = {
    sourceChargeA: primaryFrame.sourceChargeA,
    sourceChargeB: primaryFrame.sourceChargeB,
    sourceSeparation: primaryFrame.sourceSeparation,
    probeX: primaryFrame.probeX,
    probeY: primaryFrame.probeY,
    testCharge: primaryFrame.testCharge,
  };

  function commitProbePosition(nextProbeX: number, nextProbeY: number) {
    if (!canEditPrimary) {
      return;
    }

    const resolvedProbeX = roundTo(
      clamp(nextProbeX, ELECTRIC_FIELDS_STAGE_MIN_X, ELECTRIC_FIELDS_STAGE_MAX_X),
      2,
    );
    const resolvedProbeY = roundTo(
      clamp(nextProbeY, ELECTRIC_FIELDS_STAGE_MIN_Y, ELECTRIC_FIELDS_STAGE_MAX_Y),
      2,
    );

    if (resolvedProbeX !== primaryFrame.probeX) {
      setParam("probeX", resolvedProbeX);
    }

    if (resolvedProbeY !== primaryFrame.probeY) {
      setParam("probeY", resolvedProbeY);
    }
  }

  function commitSourceSeparation(nextSeparation: number) {
    if (!canEditPrimary) {
      return;
    }

    const resolvedSeparation = roundTo(
      clamp(
        nextSeparation,
        ELECTRIC_FIELDS_MIN_SEPARATION,
        ELECTRIC_FIELDS_MAX_SEPARATION,
      ),
      2,
    );

    if (resolvedSeparation !== primaryFrame.sourceSeparation) {
      setParam("sourceSeparation", resolvedSeparation);
    }
  }

  function nudgeProbe(deltaX: number, deltaY: number) {
    commitProbePosition(primaryFrame.probeX + deltaX, primaryFrame.probeY + deltaY);
  }

  function nudgeSourceSeparation(delta: number) {
    commitSourceSeparation(primaryFrame.sourceSeparation + delta);
  }

  function updateFromPointer(target: DragTarget, svgX: number, svgY: number) {
    const world = invertCartesianPoint(STAGE_LAYOUT, svgX, svgY);

    if (target === "probe") {
      commitProbePosition(world.x, world.y);
      return;
    }

    commitSourceSeparation(Math.abs(world.x) * 2);
  }
  const drag = useSvgPointerDrag<DragTarget>({
    svgRef,
    width: WIDTH,
    height: HEIGHT,
    onDrag: (target, location) => updateFromPointer(target, location.svgX, location.svgY),
  });

  const previewBadge = graphPreview?.kind === "response" ? (
    <SimulationPreviewBadge>
      {copy.previewX} {formatMeasurement(previewProbeX ?? 0, "m")}
    </SimulationPreviewBadge>
  ) : null;
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? copy.setupA)}: {formatSignedCharge(frameA!.sourceChargeA)} /{" "}
        {formatSignedCharge(frameA!.sourceChargeB)}
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? copy.setupB)}: {formatSignedCharge(frameB!.sourceChargeA)} /{" "}
        {formatSignedCharge(frameB!.sourceChargeB)}
      </span>
    </div>
  ) : null;
  const dominantText =
    primaryFrame.dominantSource === "a"
      ? copy.dominantSourceA
      : primaryFrame.dominantSource === "b"
        ? copy.dominantSourceB
        : primaryFrame.dominantSource === "balanced"
          ? copy.dominantBalanced
          : copy.dominantNone;
  const forceNote =
    primaryFrame.forceAlignment === "none"
      ? copy.zeroForce
      : primaryFrame.forceAlignment === "aligned"
        ? copy.alignedForce
        : copy.opposedForce;
  const metricRows = [
    { label: "q_A", value: formatSignedCharge(primaryFrame.sourceChargeA) },
    { label: "q_B", value: formatSignedCharge(primaryFrame.sourceChargeB) },
    { label: "q_test", value: formatSignedCharge(primaryFrame.testCharge) },
    { label: "x_p", value: formatMeasurement(primaryFrame.probeX, "m") },
    { label: "y_p", value: formatMeasurement(primaryFrame.probeY, "m") },
    { label: "E_x", value: formatNumber(primaryFrame.fieldX) },
    { label: "E_y", value: formatNumber(primaryFrame.fieldY) },
    { label: "|E|", value: formatNumber(primaryFrame.fieldMagnitude) },
    { label: "|F|", value: formatNumber(primaryFrame.forceMagnitude) },
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
  const forceLength = vectorScale(primaryFrame.forceMagnitude, 32);
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
  const primaryForceEndX =
    primaryProbeX +
    (primaryFrame.forceMagnitude > 0.001
      ? (primaryFrame.forceX / primaryFrame.forceMagnitude) * forceLength
      : 0);
  const primaryForceEndY =
    primaryProbeY -
    (primaryFrame.forceMagnitude > 0.001
      ? (primaryFrame.forceY / primaryFrame.forceMagnitude) * forceLength
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
      description={copy.stageDescription}
      headerClassName="bg-[linear-gradient(135deg,rgba(240,171,60,0.1),rgba(78,166,223,0.1))]"
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
        {showFieldGrid
          ? renderFieldGrid(primaryFieldSource, resolveOverlayOpacity(focusedOverlayId, "fieldGrid", 0.35))
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
              {copy.graphScanLine}
            </text>
          </g>
        ) : null}
        {secondaryFrame ? (
          <g opacity="0.56">
            <ChargeMarker x={secondarySourceAX!} y={secondarySourceAY!} charge={secondaryFrame.sourceChargeA} label={secondaryLabel ?? copy.setupB} radius={SOURCE_MARKER_RADIUS} dashed muted />
            <ChargeMarker x={secondarySourceBX!} y={secondarySourceBY!} charge={secondaryFrame.sourceChargeB} label="" radius={SOURCE_MARKER_RADIUS} dashed muted />
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
        <ChargeMarker x={sourceAX} y={sourceAY} charge={primaryFrame.sourceChargeA} label={copy.sourceA} radius={SOURCE_MARKER_RADIUS} />
        <ChargeMarker x={sourceBX} y={sourceBY} charge={primaryFrame.sourceChargeB} label={copy.sourceB} radius={SOURCE_MARKER_RADIUS} />
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
            <SvgArrow x1={primaryProbeX} y1={primaryProbeY} x2={sourceAContributionEnd.x} y2={sourceAContributionEnd.y} stroke="#f0ab3c" strokeWidth={2.4} />
            <SvgArrow x1={primaryProbeX} y1={primaryProbeY} x2={sourceBContributionEnd.x} y2={sourceBContributionEnd.y} stroke="#4ea6df" strokeWidth={2.4} />
            <SvgArrow x1={primaryProbeX} y1={primaryProbeY} x2={primaryFieldEndX} y2={primaryFieldEndY} stroke="#1ea6a2" strokeWidth={3.1} />
            <text
              x={primaryFieldEndX + 8}
              y={primaryFieldEndY - 6}
              className="fill-teal-700 text-[11px] font-semibold"
            >
              {copy.eNet}
            </text>
          </g>
        ) : null}
        {showForceVector && primaryFrame.forceMagnitude > 0.001 ? (
          <g opacity={resolveOverlayOpacity(focusedOverlayId, "forceVector", 0.35)}>
            <SvgArrow x1={primaryProbeX} y1={primaryProbeY} x2={primaryForceEndX} y2={primaryForceEndY} stroke="#f16659" strokeWidth={3.1} />
            <text
              x={primaryForceEndX + 8}
              y={primaryForceEndY + 12}
              className="fill-coral-700 text-[11px] font-semibold"
            >
              {copy.forceOnTestCharge}
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
          {primaryFrame.testCharge > 0.05 ? "+" : primaryFrame.testCharge < -0.05 ? "-" : "0"}
        </text>
        <text
          x={primaryProbeX + 12}
          y={primaryProbeY - 12}
          className="fill-ink-700 text-[11px] font-semibold"
        >
          q_test {formatSignedCharge(primaryFrame.testCharge)}
        </text>
        {canEditPrimary ? (
          <>
            <g
              tabIndex={0}
              role="button"
              aria-label={copy.moveProbeAria
                .replace("{x}", formatNumber(primaryFrame.probeX))
                .replace("{y}", formatNumber(primaryFrame.probeY))}
              style={{ cursor: drag.activePointerId === null ? "grab" : "grabbing" }}
              onPointerDown={(event) => {
                if (!canEditPrimary) {
                  return;
                }

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
              <circle cx={primaryProbeX} cy={primaryProbeY} r="22" fill="transparent" />
            </g>
            <g
              tabIndex={0}
              role="button"
              aria-label={copy.adjustSourceAAria.replace(
                "{separation}",
                formatNumber(primaryFrame.sourceSeparation),
              )}
              style={{ cursor: drag.activePointerId === null ? "ew-resize" : "grabbing" }}
              onPointerDown={(event) => {
                drag.startDrag(event.pointerId, "sourceA", event.clientX, event.clientY);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  nudgeSourceSeparation(-SEPARATION_KEYBOARD_STEP);
                } else if (event.key === "ArrowRight") {
                  event.preventDefault();
                  nudgeSourceSeparation(SEPARATION_KEYBOARD_STEP);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  commitSourceSeparation(ELECTRIC_FIELDS_MIN_SEPARATION);
                } else if (event.key === "End") {
                  event.preventDefault();
                  commitSourceSeparation(ELECTRIC_FIELDS_MAX_SEPARATION);
                }
              }}
            >
              <circle cx={sourceAX} cy={sourceAY} r="24" fill="transparent" />
            </g>
            <g
              tabIndex={0}
              role="button"
              aria-label={copy.adjustSourceBAria.replace(
                "{separation}",
                formatNumber(primaryFrame.sourceSeparation),
              )}
              style={{ cursor: drag.activePointerId === null ? "ew-resize" : "grabbing" }}
              onPointerDown={(event) => {
                drag.startDrag(event.pointerId, "sourceB", event.clientX, event.clientY);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  nudgeSourceSeparation(-SEPARATION_KEYBOARD_STEP);
                } else if (event.key === "ArrowRight") {
                  event.preventDefault();
                  nudgeSourceSeparation(SEPARATION_KEYBOARD_STEP);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  commitSourceSeparation(ELECTRIC_FIELDS_MIN_SEPARATION);
                } else if (event.key === "End") {
                  event.preventDefault();
                  commitSourceSeparation(ELECTRIC_FIELDS_MAX_SEPARATION);
                }
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
          title={copy.probeState}
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={[
            copy.fieldDirectionLabel.replace(
              "{direction}",
              localizeFieldDirection(
                directionLabel(primaryFrame.fieldX, primaryFrame.fieldY),
                copy,
              ),
            ),
            dominantText,
            forceNote,
          ]}
        />
        </CartesianStageFrame>
      </svg>
    </SimulationSceneCard>
  );
}
