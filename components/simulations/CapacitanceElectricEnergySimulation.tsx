"use client";

import {
  clamp,
  formatNumber,
  sampleCapacitanceElectricEnergyState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
  CAPACITANCE_ELECTRIC_ENERGY_MAX_AREA,
  CAPACITANCE_ELECTRIC_ENERGY_MAX_SEPARATION,
  CAPACITANCE_ELECTRIC_ENERGY_MAX_VOLTAGE,
  CAPACITANCE_ELECTRIC_ENERGY_MIN_AREA,
  CAPACITANCE_ELECTRIC_ENERGY_MIN_SEPARATION,
  CAPACITANCE_ELECTRIC_ENERGY_MIN_VOLTAGE,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type CapacitanceElectricEnergySimulationProps = {
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
const STAGE_RIGHT = 590;
const STAGE_TOP = 40;
const STAGE_BOTTOM = HEIGHT - 40;
const STAGE_WIDTH = STAGE_RIGHT - STAGE_LEFT;
const STAGE_HEIGHT = STAGE_BOTTOM - STAGE_TOP;
const STAGE_CENTER_X = STAGE_LEFT + STAGE_WIDTH * 0.56;
const STAGE_CENTER_Y = STAGE_TOP + STAGE_HEIGHT / 2;
const CARD_WIDTH = 232;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const BATTERY_X = STAGE_LEFT + 64;
const BATTERY_TOP = STAGE_CENTER_Y - 44;
const BATTERY_BOTTOM = STAGE_CENTER_Y + 44;
const MAX_ENERGY_BAR_HEIGHT = 124;

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.34;
}

function drawArrow(options: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth?: number;
  opacity?: number;
  dashed?: boolean;
}) {
  const { x1, y1, x2, y2, stroke, strokeWidth = 3, opacity = 1, dashed } = options;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);

  if (length <= 0.01) {
    return null;
  }

  const ux = dx / length;
  const uy = dy / length;
  const head = Math.min(10, Math.max(6, length * 0.3));
  const leftX = x2 - ux * head - uy * head * 0.55;
  const leftY = y2 - uy * head + ux * head * 0.55;
  const rightX = x2 - ux * head + uy * head * 0.55;
  const rightY = y2 - uy * head - ux * head * 0.55;

  return (
    <g opacity={opacity}>
      <line
        x1={x1}
        x2={x2}
        y1={y1}
        y2={y2}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={dashed ? "8 6" : undefined}
      />
      <polygon points={`${x2},${y2} ${leftX},${leftY} ${rightX},${rightY}`} fill={stroke} />
    </g>
  );
}

function gapFromSeparation(separation: number) {
  const normalized =
    (separation - CAPACITANCE_ELECTRIC_ENERGY_MIN_SEPARATION) /
    (CAPACITANCE_ELECTRIC_ENERGY_MAX_SEPARATION - CAPACITANCE_ELECTRIC_ENERGY_MIN_SEPARATION);

  return 86 + normalized * 154;
}

function plateHeightFromArea(area: number) {
  const normalized =
    (area - CAPACITANCE_ELECTRIC_ENERGY_MIN_AREA) /
    (CAPACITANCE_ELECTRIC_ENERGY_MAX_AREA - CAPACITANCE_ELECTRIC_ENERGY_MIN_AREA);

  return 96 + normalized * 104;
}

function plateChargeMarkerCount(chargeMagnitude: number) {
  return clamp(Math.round(chargeMagnitude / 9) + 3, 3, 8);
}

function fieldArrowCount(fieldStrength: number) {
  return clamp(Math.round(fieldStrength / 2.2) + 3, 3, 7);
}

function energyBarHeight(storedEnergy: number) {
  const normalized = Math.min(storedEnergy / 180, 1);
  return 18 + normalized * (MAX_ENERGY_BAR_HEIGHT - 18);
}

function buildFrame(source: SimulationParams, previewVoltage?: number) {
  return sampleCapacitanceElectricEnergyState({
    plateArea: Number(source.plateArea ?? 2.4),
    plateSeparation: Number(source.plateSeparation ?? 1.4),
    batteryVoltage: previewVoltage ?? Number(source.batteryVoltage ?? 6),
  });
}

function derivePreviewVoltage(graphPreview?: GraphStagePreview | null) {
  if (!graphPreview || graphPreview.kind !== "response") {
    return undefined;
  }

  if (graphPreview.graphId !== "voltage-response") {
    return undefined;
  }

  return clamp(
    graphPreview.point.x,
    CAPACITANCE_ELECTRIC_ENERGY_MIN_VOLTAGE,
    CAPACITANCE_ELECTRIC_ENERGY_MAX_VOLTAGE,
  );
}

function renderChargeMarkers(options: {
  x: number;
  top: number;
  height: number;
  count: number;
  sign: "+" | "-";
  fill: string;
  opacity?: number;
}) {
  const step = options.height / Math.max(options.count - 1, 1);

  return Array.from({ length: options.count }, (_, index) => {
    const y = options.top + index * step;

    return (
      <g key={`${options.sign}-${index}`} opacity={options.opacity ?? 1}>
        <circle cx={options.x} cy={y} r="8.5" fill={options.fill} />
        <text
          x={options.x}
          y={y + 3}
          textAnchor="middle"
          className="fill-white text-[10px] font-semibold"
        >
          {options.sign}
        </text>
      </g>
    );
  });
}

export function CapacitanceElectricEnergySimulation({
  concept,
  params,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: CapacitanceElectricEnergySimulationProps) {
  const compareEnabled = Boolean(compare);
  const previewVoltage = derivePreviewVoltage(graphPreview);
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const activeFrame = buildFrame(params, previewVoltage);
  const frameA = compare
    ? buildFrame(compare.setupA, previewedSetup === "a" ? previewVoltage : undefined)
    : null;
  const frameB = compare
    ? buildFrame(compare.setupB, previewedSetup === "b" ? previewVoltage : undefined)
    : null;
  const primaryFrame = compare ? (previewedSetup === "a" ? frameA! : frameB!) : activeFrame;
  const secondaryFrame = compare ? (previewedSetup === "a" ? frameB! : frameA!) : null;
  const primaryLabel = compare
    ? previewedSetup === "a"
      ? compare.labelA ?? "Setup A"
      : compare.labelB ?? "Setup B"
    : "Live";
  const secondaryLabel = compare
    ? previewedSetup === "a"
      ? compare.labelB ?? "Setup B"
      : compare.labelA ?? "Setup A"
    : null;

  const primaryGap = gapFromSeparation(primaryFrame.plateSeparation);
  const primaryPlateHeight = plateHeightFromArea(primaryFrame.plateArea);
  const primaryLeftPlateX = STAGE_CENTER_X - primaryGap / 2;
  const primaryRightPlateX = STAGE_CENTER_X + primaryGap / 2;
  const primaryPlateTop = STAGE_CENTER_Y - primaryPlateHeight / 2;
  const primaryPlateBottom = STAGE_CENTER_Y + primaryPlateHeight / 2;
  const secondaryGap = secondaryFrame ? gapFromSeparation(secondaryFrame.plateSeparation) : null;
  const secondaryPlateHeight = secondaryFrame ? plateHeightFromArea(secondaryFrame.plateArea) : null;
  const secondaryLeftPlateX = secondaryGap ? STAGE_CENTER_X - secondaryGap / 2 : null;
  const secondaryRightPlateX = secondaryGap ? STAGE_CENTER_X + secondaryGap / 2 : null;
  const secondaryPlateTop =
    secondaryPlateHeight !== null ? STAGE_CENTER_Y - secondaryPlateHeight / 2 : null;
  const chargeMarkerCount = plateChargeMarkerCount(primaryFrame.chargeMagnitude);
  const fieldCount = fieldArrowCount(primaryFrame.fieldStrength);
  const showFieldRegion = overlayValues?.fieldRegion ?? true;
  const showChargeDensity = overlayValues?.chargeDensityCue ?? true;
  const showGeometryGuide = overlayValues?.geometryGuide ?? true;
  const showEnergyStore = overlayValues?.energyStore ?? true;
  const energyBar = energyBarHeight(primaryFrame.storedEnergy);
  const secondaryEnergyBar =
    secondaryFrame !== null ? energyBarHeight(secondaryFrame.storedEnergy) : null;

  const previewBadge = previewVoltage !== undefined ? (
    <span className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral-700">
      preview V = {formatNumber(previewVoltage)} V
    </span>
  ) : null;
  const compareLegend = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
        <span className="h-0 w-5 border-t-2 border-solid border-ink-900" />
        {primaryLabel}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
        <span className="h-0 w-5 border-t-2 border-dashed border-ink-900/70" />
        {secondaryLabel}
      </span>
    </div>
  ) : null;
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? "Setup A")}: C {formatNumber(frameA!.capacitance)}, U{" "}
        {formatNumber(frameA!.storedEnergy)}
      </span>
      <span className="rounded-full border border-amber-500/30 bg-amber-500/12 px-2 py-0.5 font-semibold text-amber-800">
        {(compare?.labelB ?? "Setup B")}: C {formatNumber(frameB!.capacitance)}, U{" "}
        {formatNumber(frameB!.storedEnergy)}
      </span>
    </div>
  ) : null;

  const storageNote =
    primaryFrame.batteryVoltage >= 8
      ? "At fixed geometry, charge grows linearly with V but stored energy rises much faster because voltage is squared."
      : primaryFrame.batteryVoltage <= 3
        ? "Even a lower battery voltage stores charge, but the energy reservoir stays modest."
        : "This setup keeps the linear Q = CV story and the steeper U = 1/2 CV^2 story visible at the same time.";
  const geometryNote =
    primaryFrame.plateSeparation <= 1
      ? "Close plates raise capacitance and field strength together, so the same battery stores more charge and more energy."
      : primaryFrame.plateArea >= 4
        ? "Larger facing plates raise capacitance because more opposite charge can build across the same gap."
        : "Capacitance stays geometric here: bigger facing plates and smaller separation both make the storage stronger.";
  const fieldNote =
    primaryFrame.fieldStrength >= 7
      ? "The electric field between the plates is strong because the same voltage is being dropped across a narrow gap."
      : "The field stays nearly uniform between the plates, so the charge-storage story stays tied to one bounded geometry.";

  const metricRows = [
    { label: "A", value: `${formatNumber(primaryFrame.plateArea)} area` },
    { label: "d", value: `${formatNumber(primaryFrame.plateSeparation)} m` },
    { label: "V", value: `${formatNumber(primaryFrame.batteryVoltage)} V` },
    { label: "C", value: formatNumber(primaryFrame.capacitance) },
    { label: "Q", value: formatNumber(primaryFrame.chargeMagnitude) },
    { label: "E", value: formatNumber(primaryFrame.fieldStrength) },
    { label: "U", value: formatNumber(primaryFrame.storedEnergy) },
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(240,171,60,0.12),rgba(78,166,223,0.1))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 text-xs text-ink-700">
              Keep one parallel-plate capacitor on screen so area, separation, battery voltage,
              stored charge, field strength, and stored electric energy stay in the same bounded
              picture.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {compareLegend}
            {compareBadges}
            {previewBadge}
          </div>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
      >
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.54)" />
        <rect
          x={STAGE_LEFT}
          y={STAGE_TOP}
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          rx="24"
          fill="rgba(255,252,246,0.9)"
        />
        <rect
          x={STAGE_LEFT + 16}
          y={STAGE_TOP + 16}
          width={STAGE_WIDTH - 32}
          height={STAGE_HEIGHT - 32}
          rx="20"
          fill="rgba(255,255,255,0.38)"
          stroke="rgba(15,28,36,0.06)"
        />

        <g opacity="0.9">
          <line x1={BATTERY_X} x2={BATTERY_X} y1={BATTERY_TOP} y2={BATTERY_BOTTOM} stroke="#0f1c24" strokeWidth="2" />
          <line x1={BATTERY_X - 10} x2={BATTERY_X + 10} y1={BATTERY_TOP + 12} y2={BATTERY_TOP + 12} stroke="#0f1c24" strokeWidth="4" />
          <line x1={BATTERY_X - 16} x2={BATTERY_X + 16} y1={BATTERY_BOTTOM - 12} y2={BATTERY_BOTTOM - 12} stroke="#0f1c24" strokeWidth="2.2" />
          <text x={BATTERY_X + 24} y={STAGE_CENTER_Y + 4} className="fill-ink-700 text-[11px] font-semibold">
            {formatNumber(primaryFrame.batteryVoltage)} V
          </text>
          <text x={BATTERY_X - 8} y={BATTERY_TOP - 10} textAnchor="end" className="fill-amber-700 text-[11px] font-semibold">
            +
          </text>
          <text x={BATTERY_X - 8} y={BATTERY_BOTTOM + 16} textAnchor="end" className="fill-sky-700 text-[11px] font-semibold">
            -
          </text>
        </g>

        <path
          d={`M ${BATTERY_X + 10} ${BATTERY_TOP + 12} H ${primaryLeftPlateX - 30} V ${primaryPlateTop + 10} H ${primaryLeftPlateX - 6}`}
          fill="none"
          stroke="rgba(15,28,36,0.42)"
          strokeWidth="2"
        />
        <path
          d={`M ${BATTERY_X + 16} ${BATTERY_BOTTOM - 12} H ${primaryRightPlateX + 30} V ${primaryPlateBottom - 10} H ${primaryRightPlateX + 6}`}
          fill="none"
          stroke="rgba(15,28,36,0.42)"
          strokeWidth="2"
        />

        {secondaryFrame ? (
          <g opacity="0.44">
            <rect
              x={secondaryLeftPlateX! - 6}
              y={secondaryPlateTop!}
              width="12"
              height={secondaryPlateHeight!}
              rx="6"
              fill="rgba(240,171,60,0.16)"
              stroke="rgba(184,112,0,0.48)"
              strokeWidth="2"
              strokeDasharray="7 5"
            />
            <rect
              x={secondaryRightPlateX! - 6}
              y={secondaryPlateTop!}
              width="12"
              height={secondaryPlateHeight!}
              rx="6"
              fill="rgba(78,166,223,0.16)"
              stroke="rgba(29,111,159,0.48)"
              strokeWidth="2"
              strokeDasharray="7 5"
            />
            {secondaryEnergyBar !== null ? (
              <rect
                x={STAGE_RIGHT - 56}
                y={STAGE_BOTTOM - 26 - secondaryEnergyBar}
                width="20"
                height={secondaryEnergyBar}
                rx="10"
                fill="rgba(240,171,60,0.14)"
                stroke="rgba(184,112,0,0.42)"
                strokeDasharray="7 5"
              />
            ) : null}
          </g>
        ) : null}

        {showFieldRegion ? (
          <g opacity={overlayWeight(focusedOverlayId, "fieldRegion")}>
            <rect
              x={primaryLeftPlateX + 6}
              y={primaryPlateTop + 10}
              width={Math.max(primaryRightPlateX - primaryLeftPlateX - 12, 0)}
              height={Math.max(primaryPlateHeight - 20, 0)}
              rx="18"
              fill="rgba(30,166,162,0.08)"
            />
            {Array.from({ length: fieldCount }, (_, index) => {
              const y = primaryPlateTop + 20 + (index * (primaryPlateHeight - 40)) / Math.max(fieldCount - 1, 1);
              const arrow = drawArrow({
                x1: primaryLeftPlateX + 18,
                y1: y,
                x2: primaryRightPlateX - 18,
                y2: y,
                stroke: "#1ea6a2",
                strokeWidth: 2.8,
                opacity: 0.55 + (index / Math.max(fieldCount - 1, 1)) * 0.1,
              });

              return arrow ? <g key={`field-arrow-${index}`}>{arrow}</g> : null;
            })}
            <text
              x={(primaryLeftPlateX + primaryRightPlateX) / 2}
              y={primaryPlateTop - 14}
              textAnchor="middle"
              className="fill-teal-700 text-[11px] font-semibold"
            >
              field between plates
            </text>
          </g>
        ) : null}

        <rect
          x={primaryLeftPlateX - 6}
          y={primaryPlateTop}
          width="12"
          height={primaryPlateHeight}
          rx="6"
          fill="rgba(240,171,60,0.24)"
          stroke="#b87000"
          strokeWidth="2.4"
        />
        <rect
          x={primaryRightPlateX - 6}
          y={primaryPlateTop}
          width="12"
          height={primaryPlateHeight}
          rx="6"
          fill="rgba(78,166,223,0.24)"
          stroke="#1d6f9f"
          strokeWidth="2.4"
        />
        <text
          x={primaryLeftPlateX}
          y={primaryPlateTop - 18}
          textAnchor="middle"
          className="fill-amber-800 text-[11px] font-semibold uppercase tracking-[0.16em]"
        >
          + plate
        </text>
        <text
          x={primaryRightPlateX}
          y={primaryPlateTop - 18}
          textAnchor="middle"
          className="fill-sky-800 text-[11px] font-semibold uppercase tracking-[0.16em]"
        >
          - plate
        </text>

        {showChargeDensity ? (
          <g opacity={overlayWeight(focusedOverlayId, "chargeDensityCue")}>
            {renderChargeMarkers({
              x: primaryLeftPlateX - 18,
              top: primaryPlateTop + 12,
              height: primaryPlateHeight - 24,
              count: chargeMarkerCount,
              sign: "+",
              fill: "#f0ab3c",
            })}
            {renderChargeMarkers({
              x: primaryRightPlateX + 18,
              top: primaryPlateTop + 12,
              height: primaryPlateHeight - 24,
              count: chargeMarkerCount,
              sign: "-",
              fill: "#4ea6df",
            })}
          </g>
        ) : null}

        {showGeometryGuide ? (
          <g opacity={overlayWeight(focusedOverlayId, "geometryGuide")}>
            {drawArrow({
              x1: primaryLeftPlateX + 4,
              y1: primaryPlateBottom + 28,
              x2: primaryRightPlateX - 4,
              y2: primaryPlateBottom + 28,
              stroke: "#0f1c24",
              strokeWidth: 2,
            })}
            {drawArrow({
              x1: primaryRightPlateX - 4,
              y1: primaryPlateBottom + 28,
              x2: primaryLeftPlateX + 4,
              y2: primaryPlateBottom + 28,
              stroke: "#0f1c24",
              strokeWidth: 2,
            })}
            <text
              x={(primaryLeftPlateX + primaryRightPlateX) / 2}
              y={primaryPlateBottom + 22}
              textAnchor="middle"
              className="fill-ink-700 text-[11px] font-semibold"
            >
              d = {formatNumber(primaryFrame.plateSeparation)} m
            </text>
            <line
              x1={primaryLeftPlateX - 44}
              x2={primaryLeftPlateX - 44}
              y1={primaryPlateTop}
              y2={primaryPlateBottom}
              stroke="rgba(15,28,36,0.58)"
              strokeWidth="1.6"
            />
            <line
              x1={primaryLeftPlateX - 50}
              x2={primaryLeftPlateX - 38}
              y1={primaryPlateTop}
              y2={primaryPlateTop}
              stroke="rgba(15,28,36,0.58)"
              strokeWidth="1.6"
            />
            <line
              x1={primaryLeftPlateX - 50}
              x2={primaryLeftPlateX - 38}
              y1={primaryPlateBottom}
              y2={primaryPlateBottom}
              stroke="rgba(15,28,36,0.58)"
              strokeWidth="1.6"
            />
            <text
              x={primaryLeftPlateX - 52}
              y={STAGE_CENTER_Y + 4}
              textAnchor="end"
              className="fill-ink-700 text-[11px] font-semibold"
            >
              A ≈ {formatNumber(primaryFrame.plateArea)}
            </text>
          </g>
        ) : null}

        {showEnergyStore ? (
          <g opacity={overlayWeight(focusedOverlayId, "energyStore")}>
            <rect
              x={STAGE_RIGHT - 58}
              y={STAGE_TOP + 34}
              width="24"
              height={MAX_ENERGY_BAR_HEIGHT}
              rx="12"
              fill="rgba(255,255,255,0.56)"
              stroke="rgba(184,112,0,0.28)"
            />
            <rect
              x={STAGE_RIGHT - 58}
              y={STAGE_TOP + 34 + (MAX_ENERGY_BAR_HEIGHT - energyBar)}
              width="24"
              height={energyBar}
              rx="12"
              fill="rgba(240,171,60,0.72)"
            />
            <text
              x={STAGE_RIGHT - 46}
              y={STAGE_TOP + 22}
              textAnchor="middle"
              className="fill-amber-800 text-[11px] font-semibold"
            >
              U
            </text>
            <text
              x={STAGE_RIGHT - 46}
              y={STAGE_TOP + 34 + MAX_ENERGY_BAR_HEIGHT + 18}
              textAnchor="middle"
              className="fill-ink-700 text-[11px] font-semibold"
            >
              {formatNumber(primaryFrame.storedEnergy)}
            </text>
          </g>
        ) : null}

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel} capacitor state` : "Capacitor state"}
          rows={metricRows}
          noteLines={[storageNote, geometryNote, fieldNote]}
        />
      </svg>
    </section>
  );
}
