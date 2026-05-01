"use client";

import {
  ELECTROMAGNETIC_INDUCTION_MAX_COIL_AREA,
  ELECTROMAGNETIC_INDUCTION_MAX_SPEED,
  ELECTROMAGNETIC_INDUCTION_MAX_COIL_TURNS,
  ELECTROMAGNETIC_INDUCTION_MIN_COIL_AREA,
  ELECTROMAGNETIC_INDUCTION_MIN_SPEED,
  ELECTROMAGNETIC_INDUCTION_STAGE_MAX_X,
  ELECTROMAGNETIC_INDUCTION_STAGE_MIN_X,
  ELECTROMAGNETIC_INDUCTION_TOTAL_TIME,
  formatMeasurement,
  formatNumber,
  mapRange,
  sampleElectromagneticInductionState,
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
import { resolveOverlayOpacity } from "./primitives/overlay";
import { SimulationSceneCard } from "./primitives/scene-card";
import { SvgArrow } from "./primitives/electric-stage";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type ElectromagneticInductionSimulationProps = {
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
const STAGE_LEFT = 44;
const STAGE_TOP = 34;
const STAGE_RIGHT = 586;
const STAGE_BOTTOM = HEIGHT - 34;
const STAGE_CENTER_Y = (STAGE_TOP + STAGE_BOTTOM) / 2;
const COIL_CENTER_X = 332;
const CARD_WIDTH = 224;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const GAUGE_X = CARD_X;
const GAUGE_Y = 230;
const GAUGE_WIDTH = CARD_WIDTH;
const GAUGE_HEIGHT = 110;
const MAGNET_WIDTH = 94;
const MAGNET_HEIGHT = 46;

function projectStageX(positionX: number) {
  return mapRange(
    positionX,
    ELECTROMAGNETIC_INDUCTION_STAGE_MIN_X,
    ELECTROMAGNETIC_INDUCTION_STAGE_MAX_X,
    STAGE_LEFT + 44,
    STAGE_RIGHT - 44,
  );
}

function coilRadius(area: number) {
  return mapRange(
    area,
    ELECTROMAGNETIC_INDUCTION_MIN_COIL_AREA,
    ELECTROMAGNETIC_INDUCTION_MAX_COIL_AREA,
    34,
    58,
  );
}

function turnRingCount(turns: number) {
  return Math.round(
    mapRange(turns, 40, ELECTROMAGNETIC_INDUCTION_MAX_COIL_TURNS, 3, 7),
  );
}

function motionLabel(speed: number) {
  if (speed > 0.03) {
    return "left to right";
  }

  if (speed < -0.03) {
    return "right to left";
  }

  return "stationary";
}

function fieldPalette(fieldStrength: number) {
  if (fieldStrength > 0.03) {
    return {
      stroke: "#f0ab3c",
      fill: "rgba(240,171,60,0.18)",
      soft: "rgba(240,171,60,0.12)",
      text: "#9a6200",
    };
  }

  if (fieldStrength < -0.03) {
    return {
      stroke: "#4ea6df",
      fill: "rgba(78,166,223,0.18)",
      soft: "rgba(78,166,223,0.12)",
      text: "#1d6f9f",
    };
  }

  return {
    stroke: "rgba(15,28,36,0.45)",
    fill: "rgba(15,28,36,0.12)",
    soft: "rgba(15,28,36,0.08)",
    text: "#55636b",
  };
}

function currentTone(direction: "clockwise" | "counterclockwise" | "none") {
  if (direction === "counterclockwise") {
    return "#1ea6a2";
  }

  if (direction === "clockwise") {
    return "#f16659";
  }

  return "rgba(15,28,36,0.38)";
}

function renderMagnetFaces(
  positionX: number,
  speed: number,
  northFacingCoil: boolean,
) {
  const magnetOnLeft = positionX < -0.02 || (Math.abs(positionX) <= 0.02 && speed >= 0);
  const facingPole = northFacingCoil ? "N" : "S";
  const trailingPole = northFacingCoil ? "S" : "N";

  if (magnetOnLeft) {
    return {
      leftLabel: trailingPole,
      rightLabel: facingPole,
    };
  }

  return {
    leftLabel: facingPole,
    rightLabel: trailingPole,
  };
}

function renderArrowSet(
  radius: number,
  direction: "clockwise" | "counterclockwise" | "none",
  centerX: number,
  centerY: number,
  stroke: string,
  opacity: number,
) {
  if (direction === "none") {
    return null;
  }

  const sign = direction === "counterclockwise" ? -1 : 1;
  const offset = radius + 12;

  return (
    <g opacity={opacity}>
      <SvgArrow
        x1={centerX - 18}
        y1={centerY - offset}
        x2={centerX + 18}
        y2={centerY - offset}
        stroke={stroke}
        strokeWidth={2.6}
      />
      <SvgArrow
        x1={centerX + offset}
        y1={centerY - sign * 18}
        x2={centerX + offset}
        y2={centerY + sign * 18}
        stroke={stroke}
        strokeWidth={2.6}
      />
      <SvgArrow
        x1={centerX + 18}
        y1={centerY + offset}
        x2={centerX - 18}
        y2={centerY + offset}
        stroke={stroke}
        strokeWidth={2.6}
      />
      <SvgArrow
        x1={centerX - offset}
        y1={centerY + sign * 18}
        x2={centerX - offset}
        y2={centerY - sign * 18}
        stroke={stroke}
        strokeWidth={2.6}
      />
    </g>
  );
}

export function ElectromagneticInductionSimulation({
  concept,
  params,
  time,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: ElectromagneticInductionSimulationProps) {
  void setParam;
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  const activeFrame = sampleElectromagneticInductionState(params, displayTime);
  const frameA = compare
    ? sampleElectromagneticInductionState(compare.setupA, displayTime)
    : null;
  const frameB = compare
    ? sampleElectromagneticInductionState(compare.setupB, displayTime)
    : null;
  const {
    compareEnabled,
    primaryFrame,
    secondaryFrame,
    primaryLabel,
    secondaryLabel,
  } = resolveCompareScene({
    compare,
    graphPreview,
    activeFrame,
    frameA,
    frameB,
  });
  const showFieldBand = overlayValues?.fieldBand ?? true;
  const showCoilArea = overlayValues?.coilArea ?? true;
  const showMotionCue = overlayValues?.motionCue ?? true;
  const showCurrentLoop = overlayValues?.currentLoop ?? true;
  const primaryPalette = fieldPalette(primaryFrame.fieldStrength);
  const secondaryPalette = secondaryFrame
    ? fieldPalette(secondaryFrame.fieldStrength)
    : null;
  const primaryMagnetX = projectStageX(primaryFrame.positionX);
  const secondaryMagnetX = secondaryFrame ? projectStageX(secondaryFrame.positionX) : null;
  const primaryRadius = coilRadius(primaryFrame.coilArea);
  const secondaryRadius = secondaryFrame ? coilRadius(secondaryFrame.coilArea) : null;
  const primaryTurns = turnRingCount(primaryFrame.coilTurns);
  const secondaryTurns = secondaryFrame ? turnRingCount(secondaryFrame.coilTurns) : null;
  const primaryFaces = renderMagnetFaces(
    primaryFrame.positionX,
    primaryFrame.speed,
    primaryFrame.northFacingCoil,
  );
  const secondaryFaces = secondaryFrame
    ? renderMagnetFaces(
        secondaryFrame.positionX,
        secondaryFrame.speed,
        secondaryFrame.northFacingCoil,
      )
    : null;
  const primaryMotionArrowEndX =
    primaryMagnetX +
    mapRange(
      primaryFrame.speed,
      ELECTROMAGNETIC_INDUCTION_MIN_SPEED,
      ELECTROMAGNETIC_INDUCTION_MAX_SPEED,
      -54,
      54,
    );
  const gaugeNeedleX = GAUGE_X + GAUGE_WIDTH / 2;
  const gaugeNeedleY = GAUGE_Y + 56;
  const gaugeNeedleEndX = gaugeNeedleX + primaryFrame.meterNeedle * 42;
  const gaugeNeedleEndY = gaugeNeedleY - 20;
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? "Setup A")}: emf {formatMeasurement(frameA?.emf ?? 0, "V")}
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: emf {formatMeasurement(frameB?.emf ?? 0, "V")}
      </span>
    </div>
  ) : null;
  const previewBadge = graphPreview?.kind === "time" ? (
    <SimulationPreviewBadge tone="teal">
      preview t = {formatNumber(graphPreview.time)} s
    </SimulationPreviewBadge>
  ) : null;
  const metricRows = [
    { label: "t", value: formatMeasurement(primaryFrame.time, "s") },
    { label: "x_m", value: formatMeasurement(primaryFrame.positionX, "m") },
    { label: "B_coil", value: formatMeasurement(primaryFrame.fieldStrength, "T") },
    { label: "N", value: String(primaryFrame.coilTurns) },
    { label: "A", value: formatMeasurement(primaryFrame.coilArea, "m^2") },
    { label: "dLambda/dt", value: formatMeasurement(primaryFrame.fluxChangeRate, "Wb-turn/s") },
    { label: "emf", value: formatMeasurement(primaryFrame.emf, "V") },
    { label: "I", value: formatMeasurement(primaryFrame.current, "A") },
  ];
  const noteLines = [
    `Flux is ${primaryFrame.fluxTrend}.`,
    primaryFrame.emf === 0 || Math.abs(primaryFrame.emf) < 0.03
      ? "The response is near zero because the flux linkage is nearly flat right now."
      : "The response peaks when the flux curve is steep, not when the flux itself is largest.",
    primaryFrame.currentDirection === "none"
      ? "The coil arrows collapse when the induced current is essentially zero."
      : `Stage arrows use ${primaryFrame.currentDirection} as the positive coil-current direction.`,
  ];

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(30,166,162,0.1),rgba(240,171,60,0.12))]"
      headerAside={
        <>
          <CompareLegend primaryLabel={primaryLabel} secondaryLabel={secondaryLabel} />
          {compareBadges}
          {previewBadge}
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
        <rect
          x={STAGE_LEFT}
          y={STAGE_TOP}
          width={STAGE_RIGHT - STAGE_LEFT}
          height={STAGE_BOTTOM - STAGE_TOP}
          rx="24"
          fill="rgba(255,253,247,0.92)"
        />
        <rect
          x={STAGE_LEFT}
          y={STAGE_TOP}
          width={STAGE_RIGHT - STAGE_LEFT}
          height={STAGE_BOTTOM - STAGE_TOP}
          rx="24"
          fill="none"
          stroke="rgba(15,28,36,0.08)"
        />

        <line
          x1={STAGE_LEFT + 24}
          x2={STAGE_RIGHT - 24}
          y1={STAGE_CENTER_Y}
          y2={STAGE_CENTER_Y}
          stroke="rgba(15,28,36,0.18)"
          strokeDasharray="8 6"
          strokeWidth="2"
        />
        <text
          x={STAGE_LEFT + 18}
          y={STAGE_TOP + 24}
          className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
        >
          Magnet pass
        </text>
        <text
          x={STAGE_LEFT + 18}
          y={STAGE_TOP + 46}
          className="fill-ink-950 text-[15px] font-semibold"
        >
          {primaryLabel}: {motionLabel(primaryFrame.speed)}, {primaryFrame.poleFacingLabel}
        </text>

        {secondaryFrame ? (
          <g opacity="0.54">
            {secondaryPalette ? (
              <g opacity={showFieldBand ? resolveOverlayOpacity(focusedOverlayId, "fieldBand", 0.3) : 0}>
                <rect
                  x={Math.min(secondaryMagnetX!, COIL_CENTER_X)}
                  y={STAGE_CENTER_Y - 18}
                  width={Math.abs(COIL_CENTER_X - secondaryMagnetX!)}
                  height="36"
                  rx="18"
                  fill={secondaryPalette.soft}
                />
              </g>
            ) : null}
            <rect
              x={secondaryMagnetX! - MAGNET_WIDTH / 2}
              y={STAGE_CENTER_Y - MAGNET_HEIGHT / 2}
              width={MAGNET_WIDTH}
              height={MAGNET_HEIGHT}
              rx="18"
              fill="rgba(255,255,255,0.72)"
              stroke="rgba(15,28,36,0.36)"
              strokeDasharray="8 6"
            />
            <text
              x={secondaryMagnetX!}
              y={STAGE_CENTER_Y + 4}
              textAnchor="middle"
              className="fill-ink-500 text-[11px] font-semibold"
            >
              {secondaryFaces?.leftLabel}/{secondaryFaces?.rightLabel}
            </text>
            <g fill="none" stroke="rgba(15,28,36,0.36)" strokeDasharray="8 6">
              {Array.from({ length: secondaryTurns ?? 0 }, (_, index) => (
                <circle
                  key={`secondary-turn-${index}`}
                  cx={COIL_CENTER_X}
                  cy={STAGE_CENTER_Y}
                  r={(secondaryRadius ?? primaryRadius) - index * 3}
                />
              ))}
            </g>
          </g>
        ) : null}

        {showFieldBand ? (
          <g opacity={resolveOverlayOpacity(focusedOverlayId, "fieldBand", 0.34)}>
            <rect
              x={Math.min(primaryMagnetX, COIL_CENTER_X)}
              y={STAGE_CENTER_Y - 24}
              width={Math.abs(COIL_CENTER_X - primaryMagnetX)}
              height="48"
              rx="24"
              fill={primaryPalette.fill}
            />
            <line
              x1={Math.min(primaryMagnetX, COIL_CENTER_X)}
              x2={Math.max(primaryMagnetX, COIL_CENTER_X)}
              y1={STAGE_CENTER_Y}
              y2={STAGE_CENTER_Y}
              stroke={primaryPalette.stroke}
              strokeWidth="5"
              strokeLinecap="round"
            />
            <text
              x={COIL_CENTER_X}
              y={STAGE_CENTER_Y - 34}
              textAnchor="middle"
              className="text-[11px] font-semibold"
              fill={primaryPalette.text}
            >
              B through coil = {formatMeasurement(primaryFrame.fieldStrength, "T")}
            </text>
          </g>
        ) : null}

        {showCoilArea ? (
          <g opacity={resolveOverlayOpacity(focusedOverlayId, "coilArea", 0.34)}>
            <circle
              cx={COIL_CENTER_X}
              cy={STAGE_CENTER_Y}
              r={primaryRadius - 10}
              fill={primaryPalette.soft}
              stroke="none"
            />
            <text
              x={COIL_CENTER_X}
              y={STAGE_CENTER_Y + primaryRadius + 20}
              textAnchor="middle"
              className="fill-ink-600 text-[11px] font-semibold"
            >
              coil area = {formatMeasurement(primaryFrame.coilArea, "m^2")}
            </text>
          </g>
        ) : null}

        <g fill="none" stroke={primaryPalette.stroke}>
          {Array.from({ length: primaryTurns }, (_, index) => (
            <circle
              key={`primary-turn-${index}`}
              cx={COIL_CENTER_X}
              cy={STAGE_CENTER_Y}
              r={primaryRadius - index * 3}
              strokeWidth={index === 0 ? 3 : 1.6}
            />
          ))}
        </g>
        <text
          x={COIL_CENTER_X}
          y={STAGE_CENTER_Y + 5}
          textAnchor="middle"
          className="fill-ink-950 text-[12px] font-semibold"
        >
          coil
        </text>
        <text
          x={COIL_CENTER_X}
          y={STAGE_CENTER_Y - primaryRadius - 12}
          textAnchor="middle"
          className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
        >
          N = {primaryFrame.coilTurns}
        </text>

        {showCurrentLoop
          ? renderArrowSet(
              primaryRadius,
              primaryFrame.currentDirection,
              COIL_CENTER_X,
              STAGE_CENTER_Y,
              currentTone(primaryFrame.currentDirection),
              resolveOverlayOpacity(focusedOverlayId, "currentLoop", 0.34),
            )
          : null}

        <g>
          <rect
            data-testid="electromagnetic-induction-magnet"
            x={primaryMagnetX - MAGNET_WIDTH / 2}
            y={STAGE_CENTER_Y - MAGNET_HEIGHT / 2}
            width={MAGNET_WIDTH}
            height={MAGNET_HEIGHT}
            rx="18"
            fill="rgba(255,248,240,0.92)"
            stroke="rgba(15,28,36,0.16)"
          />
          <rect
            x={primaryMagnetX - MAGNET_WIDTH / 2 + 4}
            y={STAGE_CENTER_Y - MAGNET_HEIGHT / 2 + 4}
            width={MAGNET_WIDTH / 2 - 6}
            height={MAGNET_HEIGHT - 8}
            rx="14"
            fill="rgba(241,102,89,0.86)"
          />
          <rect
            x={primaryMagnetX + 2}
            y={STAGE_CENTER_Y - MAGNET_HEIGHT / 2 + 4}
            width={MAGNET_WIDTH / 2 - 6}
            height={MAGNET_HEIGHT - 8}
            rx="14"
            fill="rgba(78,166,223,0.86)"
          />
          <text
            x={primaryMagnetX - MAGNET_WIDTH / 4}
            y={STAGE_CENTER_Y + 5}
            textAnchor="middle"
            className="fill-white text-[15px] font-semibold"
          >
            {primaryFaces.leftLabel}
          </text>
          <text
            x={primaryMagnetX + MAGNET_WIDTH / 4}
            y={STAGE_CENTER_Y + 5}
            textAnchor="middle"
            className="fill-white text-[15px] font-semibold"
          >
            {primaryFaces.rightLabel}
          </text>
        </g>

        {showMotionCue ? (
          <g opacity={resolveOverlayOpacity(focusedOverlayId, "motionCue", 0.34)}>
            <SvgArrow
              x1={primaryMagnetX}
              y1={STAGE_CENTER_Y - 48}
              x2={primaryMotionArrowEndX}
              y2={STAGE_CENTER_Y - 48}
              stroke="#0f1c24"
              strokeWidth={2.8}
            />
            <text
              x={primaryMagnetX}
              y={STAGE_CENTER_Y - 62}
              textAnchor="middle"
              className="fill-ink-600 text-[11px] font-semibold"
            >
              v = {formatMeasurement(primaryFrame.speed, "m/s")}
            </text>
            <text
              x={COIL_CENTER_X}
              y={STAGE_CENTER_Y + primaryRadius + 38}
              textAnchor="middle"
              className="fill-ink-600 text-[11px]"
            >
              dLambda/dt = {formatMeasurement(primaryFrame.fluxChangeRate, "Wb-turn/s")}
            </text>
          </g>
        ) : null}

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Live readout"
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={noteLines}
        />

        <g transform={`translate(${GAUGE_X} ${GAUGE_Y})`}>
          <rect
            x="0"
            y="0"
            width={GAUGE_WIDTH}
            height={GAUGE_HEIGHT}
            rx="20"
            fill="rgba(255,253,247,0.92)"
            stroke="rgba(15,28,36,0.12)"
          />
          <text
            x="16"
            y="24"
            className="fill-ink-700 text-[11px] font-semibold uppercase tracking-[0.16em]"
          >
            Galvanometer
          </text>
          <path
            d={`M ${GAUGE_WIDTH / 2 - 54} 74 Q ${GAUGE_WIDTH / 2} 26 ${GAUGE_WIDTH / 2 + 54} 74`}
            fill="none"
            stroke="rgba(15,28,36,0.18)"
            strokeWidth="3"
          />
          <line
            x1={GAUGE_WIDTH / 2}
            x2={gaugeNeedleEndX - GAUGE_X}
            y1="74"
            y2={gaugeNeedleEndY - GAUGE_Y}
            stroke={currentTone(primaryFrame.currentDirection)}
            strokeWidth="3.4"
            strokeLinecap="round"
          />
          <circle
            cx={GAUGE_WIDTH / 2}
            cy="74"
            r="5"
            fill="#0f1c24"
            stroke="rgba(255,255,255,0.92)"
            strokeWidth="2"
          />
          <text
            x={GAUGE_WIDTH / 2}
            y="96"
            textAnchor="middle"
            className="fill-ink-600 text-[11px]"
          >
            emf = {formatMeasurement(primaryFrame.emf, "V")}  I = {formatMeasurement(primaryFrame.current, "A")}
          </text>
          <text
            x={GAUGE_WIDTH / 2}
            y="44"
            textAnchor="middle"
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            {primaryFrame.currentDirection === "none"
              ? "no induced current"
              : `${primaryFrame.currentDirection} current`}
          </text>
        </g>

        <text
          x={STAGE_LEFT + 18}
          y={STAGE_BOTTOM - 16}
          className="fill-ink-600 text-[12px]"
        >
          The same pass sets x_m(t), B through the coil, flux linkage, emf, and current.
        </text>
        <text
          x={STAGE_RIGHT - 18}
          y={STAGE_BOTTOM - 16}
          textAnchor="end"
          className="fill-ink-500 text-[10px] font-semibold"
        >
          preview window: {formatNumber(ELECTROMAGNETIC_INDUCTION_TOTAL_TIME)} s
        </text>
      </svg>
    </SimulationSceneCard>
  );
}
