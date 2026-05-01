"use client";

import {
  AIR_COLUMN_MAX_LENGTH,
  clamp,
  formatMeasurement,
  formatNumber,
  getAirColumnAntinodePositions,
  getAirColumnNodePositions,
  getAirColumnPressureAntinodePositions,
  getAirColumnPressureNodePositions,
  resolveAirColumnResonanceParams,
  sampleAirColumnDisplacement,
  sampleAirColumnModeShape,
  sampleAirColumnPressureCue,
  sampleAirColumnPressureEnvelope,
  sampleAirColumnResonanceState,
  sampleRange,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import { SimulationReadoutSummary } from "./SimulationReadoutSummary";
import { SimulationAxisDragSurface } from "./primitives/SimulationAxisDragSurface";
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

type AirColumnResonanceSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type AirColumnFrame = {
  params: ReturnType<typeof resolveAirColumnResonanceParams>;
  snapshot: ReturnType<typeof sampleAirColumnResonanceState>;
};

type RowOptions = {
  label: string;
  compareBadge?: string | null;
  interactive?: boolean;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  muted?: boolean;
  onAdjustProbe?: (probeX: number) => void;
};

const WIDTH = 820;
const HEIGHT = 356;
const LEFT_X = 120;
const TUBE_WIDTH = 438;
const TUBE_HEIGHT = 64;
const PIXELS_PER_METER = TUBE_WIDTH / AIR_COLUMN_MAX_LENGTH;
const CARD_WIDTH = 222;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const ROW_HALF_HEIGHT = 82;
const SINGLE_ROW_CENTER = 178;
const COMPARE_ROW_CENTERS: Record<GraphSeriesSetupId, number> = {
  a: 110,
  b: 246,
};
const PARTICLE_POSITIONS = sampleRange(0, AIR_COLUMN_MAX_LENGTH, 25);
const PRESSURE_POSITIONS = sampleRange(0, AIR_COLUMN_MAX_LENGTH, 33);
const AXIS_TICKS = sampleRange(0, AIR_COLUMN_MAX_LENGTH, 7);
const AMPLITUDE_GUIDE_SCALE = 280;

function xFromPhysical(position: number) {
  return LEFT_X + position * PIXELS_PER_METER;
}

function physicalXFromStage(stageX: number, length: number) {
  return clamp((stageX - LEFT_X) / PIXELS_PER_METER, 0, length);
}

function yFromGuide(value: number, baselineY: number) {
  return baselineY - value * AMPLITUDE_GUIDE_SCALE;
}

function buildFrame(
  source: SimulationParams,
  time: number,
  previewProbeX?: number,
): AirColumnFrame {
  const params = resolveAirColumnResonanceParams(source);

  return {
    params,
    snapshot: sampleAirColumnResonanceState(params, time, previewProbeX),
  };
}

function pressureFill(normalizedPressure: number) {
  const strength = Math.abs(normalizedPressure);
  const alpha = 0.08 + strength * 0.24;

  if (normalizedPressure >= 0) {
    return `rgba(241, 102, 89, ${alpha.toFixed(3)})`;
  }

  return `rgba(78, 166, 223, ${alpha.toFixed(3)})`;
}

function renderTubeShell(frame: AirColumnFrame, rowCenter: number) {
  const actualRightX = xFromPhysical(frame.params.length);
  const top = rowCenter - TUBE_HEIGHT / 2;
  const wallOpacity = frame.params.closedEnd ? 1 : 0.35;

  return (
    <g pointerEvents="none">
      <rect
        x={LEFT_X - 6}
        y={top - 8}
        width="12"
        height={TUBE_HEIGHT + 16}
        rx="6"
        fill="rgba(15,28,36,0.88)"
        opacity={wallOpacity}
      />
      <line
        x1={actualRightX}
        x2={actualRightX}
        y1={top - 8}
        y2={top + TUBE_HEIGHT + 8}
        stroke="rgba(15,28,36,0.22)"
        strokeDasharray="4 6"
        strokeWidth="1.4"
      />
      <text
        x={LEFT_X}
        y={top - 14}
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        {frame.params.closedEnd ? "closed wall" : "open end"}
      </text>
      <text
        x={actualRightX}
        y={top - 14}
        textAnchor="end"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        open end
      </text>
    </g>
  );
}

function renderPressureRibbon(frame: AirColumnFrame, rowCenter: number) {
  const top = rowCenter - TUBE_HEIGHT / 2;
  const cellWidth = Math.max((frame.params.length * PIXELS_PER_METER) / PRESSURE_POSITIONS.length, 10);

  return (
    <g pointerEvents="none">
      {PRESSURE_POSITIONS.filter((position) => position <= frame.params.length + 1e-6).map(
        (position, index) => {
          const pressure = sampleAirColumnPressureCue(frame.params, position, frame.snapshot.time);
          const normalizedPressure =
            pressure / Math.max(frame.snapshot.amplitude, 1e-6);
          const x = xFromPhysical(position) - cellWidth / 2;

          return (
            <rect
              key={`pressure-${index}`}
              x={x}
              y={top}
              width={cellWidth + 1}
              height={TUBE_HEIGHT}
              fill={pressureFill(normalizedPressure)}
            />
          );
        },
      )}
    </g>
  );
}

function renderParticles(frame: AirColumnFrame, rowCenter: number) {
  return (
    <g pointerEvents="none">
      {PARTICLE_POSITIONS.filter((position) => position <= frame.params.length + 1e-6).map(
        (position, index) => {
          const displacement = sampleAirColumnDisplacement(
            frame.params,
            position,
            frame.snapshot.time,
          );
          const displacedPosition = clamp(position + displacement, 0, frame.params.length);
          const cx = xFromPhysical(displacedPosition);

          return (
            <circle
              key={`particle-${index}`}
              cx={cx}
              cy={rowCenter}
              r={index % 3 === 0 ? 6.1 : 5.5}
              fill="rgba(15,28,36,0.82)"
              stroke="rgba(255,253,247,0.92)"
              strokeWidth="1.6"
            />
          );
        },
      )}
    </g>
  );
}

function renderProbe(
  frame: AirColumnFrame,
  rowCenter: number,
  interactive: boolean,
  onAdjustProbe?: (probeX: number) => void,
) {
  const probeEquilibriumX = xFromPhysical(frame.snapshot.probeX);
  const probeActualX = xFromPhysical(
    clamp(
      frame.snapshot.probeX + frame.snapshot.probeDisplacement,
      0,
      frame.params.length,
    ),
  );
  const top = rowCenter - ROW_HALF_HEIGHT;
  const bottom = rowCenter + ROW_HALF_HEIGHT;
  const actualRightX = xFromPhysical(frame.params.length);

  return (
    <>
      {interactive ? (
        <SimulationAxisDragSurface
          axis="x"
          svgWidth={WIDTH}
          svgHeight={HEIGHT}
          value={frame.snapshot.probeX}
          region={{
            x: LEFT_X,
            y: top,
            width: actualRightX - LEFT_X,
            height: bottom - top,
          }}
          ariaLabel={`Move probe position, current x ${formatNumber(frame.snapshot.probeX)} meters`}
          cursor="ew-resize"
          step={0.02}
          resolveValue={(stageX) => physicalXFromStage(stageX, frame.params.length)}
          onChange={(nextValue) => onAdjustProbe?.(nextValue)}
          homeValue={0}
          endValue={frame.params.length}
        />
      ) : null}
      <line
        x1={probeEquilibriumX}
        x2={probeEquilibriumX}
        y1={rowCenter - TUBE_HEIGHT / 2 - 20}
        y2={rowCenter + TUBE_HEIGHT / 2 + 22}
        stroke="rgba(15,28,36,0.18)"
        strokeDasharray="5 5"
      />
      <line
        x1={probeEquilibriumX}
        x2={probeActualX}
        y1={rowCenter - 22}
        y2={rowCenter - 22}
        stroke="#4ea6df"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle
        cx={probeActualX}
        cy={rowCenter}
        r="8.5"
        fill="#f16659"
        stroke="rgba(255,253,247,0.96)"
        strokeWidth="2.4"
      />
      <text
        x={probeEquilibriumX}
        y={rowCenter + TUBE_HEIGHT / 2 + 36}
        textAnchor="middle"
        className="fill-coral-700 text-[11px] font-semibold"
      >
        probe parcel
      </text>
    </>
  );
}

function renderRuler(frame: AirColumnFrame, rowCenter: number) {
  const rulerY = rowCenter + ROW_HALF_HEIGHT + 16;
  const actualRightX = xFromPhysical(frame.params.length);

  return (
    <g pointerEvents="none">
      <line
        x1={LEFT_X}
        x2={xFromPhysical(AIR_COLUMN_MAX_LENGTH)}
        y1={rulerY}
        y2={rulerY}
        stroke="rgba(15,28,36,0.12)"
        strokeWidth="1.5"
      />
      <line
        x1={LEFT_X}
        x2={actualRightX}
        y1={rulerY}
        y2={rulerY}
        stroke="rgba(30,166,162,0.45)"
        strokeWidth="3"
      />
      {AXIS_TICKS.map((tick) => {
        const x = xFromPhysical(tick);

        return (
          <g key={`tick-${tick}`}>
            <line
              x1={x}
              x2={x}
              y1={rulerY - 6}
              y2={rulerY + 6}
              stroke="rgba(15,28,36,0.18)"
              strokeWidth="1.2"
            />
            <text
              x={x}
              y={rulerY + 20}
              textAnchor="middle"
              className="fill-ink-500 text-[10px] font-semibold"
            >
              {formatNumber(tick)} m
            </text>
          </g>
        );
      })}
      <text
        x={LEFT_X}
        y={rulerY - 10}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        tube length
      </text>
    </g>
  );
}

function renderBoundaryRulesOverlay(
  frame: AirColumnFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "boundaryRules", 0.45);
  const leftX = LEFT_X;
  const rightX = xFromPhysical(frame.params.length);
  const top = rowCenter - TUBE_HEIGHT / 2 - 16;
  const bottom = rowCenter + TUBE_HEIGHT / 2 + 18;
  const leftLabel = frame.params.closedEnd
    ? "closed end: motion node, pressure antinode"
    : "open end: motion antinode, pressure node";

  return (
    <g pointerEvents="none" opacity={opacity}>
      <line
        x1={leftX}
        x2={leftX}
        y1={top}
        y2={bottom}
        stroke="#4ea6df"
        strokeDasharray="5 5"
        strokeWidth={focusedOverlayId === "boundaryRules" ? "2.6" : "2"}
      />
      <line
        x1={rightX}
        x2={rightX}
        y1={top}
        y2={bottom}
        stroke="#f0ab3c"
        strokeDasharray="5 5"
        strokeWidth={focusedOverlayId === "boundaryRules" ? "2.6" : "2"}
      />
      <text
        x={leftX}
        y={top - 8}
        className="fill-sky-700 text-[10px] font-semibold uppercase tracking-[0.12em]"
      >
        {leftLabel}
      </text>
      <text
        x={rightX}
        y={top - 8}
        textAnchor="end"
        className="fill-amber-700 text-[10px] font-semibold uppercase tracking-[0.12em]"
      >
        open end: motion antinode, pressure node
      </text>
    </g>
  );
}

function buildGuidePath(
  frame: AirColumnFrame,
  baselineY: number,
  sampler: (position: number) => number,
) {
  return sampleRange(0, frame.params.length, 181)
    .map((position, index) => {
      const x = xFromPhysical(position);
      const y = yFromGuide(sampler(position), baselineY);

      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function renderMotionNodesOverlay(
  frame: AirColumnFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "motionNodes", 0.4);
  const guideY = rowCenter - TUBE_HEIGHT / 2 - 24;
  const radius = focusedOverlayId === "motionNodes" ? 5.2 : 4.2;

  return (
    <g pointerEvents="none" opacity={opacity}>
      <path
        d={buildGuidePath(frame, guideY, (position) => sampleAirColumnModeShape(frame.params, position))}
        fill="none"
        stroke="rgba(30,166,162,0.56)"
        strokeDasharray="7 7"
        strokeWidth={focusedOverlayId === "motionNodes" ? "2.5" : "2"}
      />
      {getAirColumnNodePositions(frame.params).map((position, index) => (
        <circle
          key={`node-${index}-${position}`}
          cx={xFromPhysical(position)}
          cy={guideY}
          r={radius}
          fill="#0f1c24"
          stroke="rgba(255,253,247,0.96)"
          strokeWidth="2"
        />
      ))}
      {getAirColumnAntinodePositions(frame.params).map((position, index) => (
        <circle
          key={`antinode-${index}-${position}`}
          cx={xFromPhysical(position)}
          cy={yFromGuide(sampleAirColumnModeShape(frame.params, position), guideY)}
          r={radius}
          fill="#1ea6a2"
          stroke="rgba(255,253,247,0.96)"
          strokeWidth="2"
        />
      ))}
      <text
        x={LEFT_X}
        y={guideY - 16}
        className="fill-teal-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        parcel-motion nodes stay still while antinodes breathe most
      </text>
    </g>
  );
}

function renderPressureGuidesOverlay(
  frame: AirColumnFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const opacity = resolveOverlayOpacity(focusedOverlayId, "pressureGuides", 0.4);
  const guideY = rowCenter + TUBE_HEIGHT / 2 + 28;
  const radius = focusedOverlayId === "pressureGuides" ? 5.2 : 4.2;

  return (
    <g pointerEvents="none" opacity={opacity}>
      <path
        d={buildGuidePath(frame, guideY, (position) => sampleAirColumnPressureEnvelope(frame.params, position))}
        fill="none"
        stroke="rgba(240,171,60,0.6)"
        strokeDasharray="6 6"
        strokeWidth={focusedOverlayId === "pressureGuides" ? "2.5" : "2"}
      />
      {getAirColumnPressureNodePositions(frame.params).map((position, index) => (
        <circle
          key={`pressure-node-${index}-${position}`}
          cx={xFromPhysical(position)}
          cy={guideY}
          r={radius}
          fill="#f0ab3c"
          stroke="rgba(255,253,247,0.96)"
          strokeWidth="2"
        />
      ))}
      {getAirColumnPressureAntinodePositions(frame.params).map((position, index) => (
        <circle
          key={`pressure-antinode-${index}-${position}`}
          cx={xFromPhysical(position)}
          cy={yFromGuide(sampleAirColumnPressureEnvelope(frame.params, position), guideY)}
          r={radius}
          fill="#f16659"
          stroke="rgba(255,253,247,0.96)"
          strokeWidth="2"
        />
      ))}
      <text
        x={LEFT_X}
        y={guideY + 26}
        className="fill-amber-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        pressure nodes and antinodes swap roles with parcel motion
      </text>
    </g>
  );
}

function renderAirColumnRow(
  frame: AirColumnFrame,
  rowCenter: number,
  options: RowOptions,
) {
  const top = rowCenter - ROW_HALF_HEIGHT;
  const bottom = rowCenter + ROW_HALF_HEIGHT;
  const actualRightX = xFromPhysical(frame.params.length);
  const opacity = options.muted ? 0.38 : 1;
  const showBoundaryRules = options.overlayValues?.boundaryRules ?? true;
  const showMotionNodes = options.overlayValues?.motionNodes ?? true;
  const showPressureGuides = options.overlayValues?.pressureGuides ?? false;

  return (
    <g opacity={opacity}>
      <rect
        x={30}
        y={top - 18}
        width={WIDTH - 60}
        height={bottom - top + 50}
        rx="24"
        fill="rgba(255,253,247,0.82)"
        stroke={options.interactive ? "rgba(30,166,162,0.22)" : "rgba(15,28,36,0.08)"}
        strokeWidth={options.interactive ? "2" : "1.5"}
      />
      <text
        x={48}
        y={top - 2}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        {options.label}
      </text>
      {options.compareBadge ? (
        <text
          x={WIDTH - 42}
          y={top - 2}
          textAnchor="end"
          className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.18em]"
        >
          {options.compareBadge}
        </text>
      ) : null}
      <rect
        x={LEFT_X}
        y={rowCenter - TUBE_HEIGHT / 2}
        width={actualRightX - LEFT_X}
        height={TUBE_HEIGHT}
        rx="22"
        fill="rgba(255,255,255,0.88)"
        stroke="rgba(15,28,36,0.12)"
        strokeWidth="2"
      />
      {renderPressureRibbon(frame, rowCenter)}
      {renderTubeShell(frame, rowCenter)}
      {renderParticles(frame, rowCenter)}
      {renderProbe(frame, rowCenter, Boolean(options.interactive), options.onAdjustProbe)}
      {showBoundaryRules
        ? renderBoundaryRulesOverlay(frame, rowCenter, options.focusedOverlayId)
        : null}
      {showMotionNodes
        ? renderMotionNodesOverlay(frame, rowCenter, options.focusedOverlayId)
        : null}
      {showPressureGuides
        ? renderPressureGuidesOverlay(frame, rowCenter, options.focusedOverlayId)
        : null}
      {renderRuler(frame, rowCenter)}
    </g>
  );
}

export function AirColumnResonanceSimulation({
  concept,
  params,
  time,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: AirColumnResonanceSimulationProps) {
  const displayTime = graphPreview?.kind === "time" ? graphPreview.time : time;
  const previewProbeX =
    graphPreview?.kind === "response" && graphPreview.graphId === "shape"
      ? clamp(graphPreview.point.x, 0, AIR_COLUMN_MAX_LENGTH)
      : undefined;
  const activeFrame = buildFrame(params, displayTime, previewProbeX);
  const compareAFrame = compare
    ? buildFrame(
        compare.setupA,
        displayTime,
        graphPreview?.kind === "response" &&
          graphPreview.graphId === "shape" &&
          graphPreview.setup === "a"
          ? previewProbeX
          : undefined,
      )
    : null;
  const compareBFrame = compare
    ? buildFrame(
        compare.setupB,
        displayTime,
        graphPreview?.kind === "response" &&
          graphPreview.graphId === "shape" &&
          graphPreview.setup === "b"
          ? previewProbeX
          : undefined,
      )
    : null;
  const {
    compareEnabled,
    previewedSetup,
    primaryFrame,
    primaryLabel,
  } = resolveCompareScene({
    compare,
    graphPreview,
    activeFrame,
    frameA: compareAFrame,
    frameB: compareBFrame,
    liveLabel: "Live setup",
  });
  const previewBadge = graphPreview?.kind === "time"
    ? (
      <SimulationPreviewBadge tone="teal">
        preview t = {formatNumber(displayTime)} s
      </SimulationPreviewBadge>
    )
    : graphPreview?.kind === "response" && graphPreview.graphId === "shape"
      ? (
        <SimulationPreviewBadge>
          preview x = {formatMeasurement(previewProbeX ?? 0, "m")}
        </SimulationPreviewBadge>
      )
      : graphPreview?.kind === "response" && graphPreview.graphId === "ladder"
        ? (
          <SimulationPreviewBadge tone="sky">
            preview order = {Math.round(graphPreview.point.x)}
          </SimulationPreviewBadge>
        )
        : null;
  const metricRows = [
    {
      label: "pipe",
      value: primaryFrame.snapshot.boundaryLabel === "open-open" ? "open-open" : "closed-open",
    },
    {
      label: "mode",
      value: primaryFrame.snapshot.resonanceLabel,
      valueClassName: "fill-ink-950 text-[11px] font-semibold",
    },
    {
      label: "harmonic",
      value: primaryFrame.snapshot.harmonicLabel,
      valueClassName: "fill-ink-950 text-[11px] font-semibold",
    },
    {
      label: "lambda",
      value: formatMeasurement(primaryFrame.snapshot.wavelength, "m"),
    },
    {
      label: "frequency",
      value: formatMeasurement(primaryFrame.snapshot.frequency, "Hz"),
    },
    {
      label: "probe x",
      value: formatMeasurement(primaryFrame.snapshot.probeX, "m"),
    },
    {
      label: "parcel shift",
      value: formatMeasurement(primaryFrame.snapshot.probeDisplacement, "m"),
    },
    {
      label: "pressure cue",
      value: formatNumber(primaryFrame.snapshot.probePressureValue),
    },
  ];
  const noteLines = [
    primaryFrame.params.closedEnd
      ? `Closed-open tubes keep odd harmonic multiples only, so resonance ${primaryFrame.snapshot.resonanceLabel} is the ${primaryFrame.snapshot.harmonicLabel} on this length.`
      : "Open-open tubes allow every integer harmonic, so each resonance order steps to the next whole-number harmonic.",
    `Probe motion envelope = ${formatMeasurement(primaryFrame.snapshot.probeEnvelope, "m")} at a ${primaryFrame.snapshot.probeRegionLabel} point.`,
    `Pressure envelope = ${formatMeasurement(primaryFrame.snapshot.probePressureEnvelope, "m")} and swaps roles with the parcel-motion pattern.`,
  ];

  function handleAdjustProbe(nextProbeX: number) {
    setParam("probeX", Number(clamp(nextProbeX, 0, activeFrame.params.length).toFixed(2)));
  }

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(30,166,162,0.08),rgba(78,166,223,0.08),rgba(240,171,60,0.08))]"
      headerAside={
        <>
          {previewBadge}
          {compareEnabled ? (
            <CompareLegend
              primaryLabel={primaryLabel}
              secondaryLabel={
                previewedSetup === "a"
                  ? compare?.labelB ?? "Setup B"
                  : compare?.labelA ?? "Setup A"
              }
            />
          ) : (
            <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-600">
              {primaryLabel}
            </span>
          )}
        </>
      }
    >
      <div className="space-y-3">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
        >
          <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.5)" />
          {compareEnabled ? (
            <>
              {renderAirColumnRow(compareAFrame!, COMPARE_ROW_CENTERS.a, {
                label: compare?.labelA ?? "Setup A",
                compareBadge: compare?.activeTarget === "a" ? "editing" : "locked",
                interactive: compare?.activeTarget === "a",
                overlayValues,
                focusedOverlayId,
                muted: previewedSetup === "b",
                onAdjustProbe: handleAdjustProbe,
              })}
              {renderAirColumnRow(compareBFrame!, COMPARE_ROW_CENTERS.b, {
                label: compare?.labelB ?? "Setup B",
                compareBadge: compare?.activeTarget === "b" ? "editing" : "locked",
                interactive: compare?.activeTarget === "b",
                overlayValues,
                focusedOverlayId,
                muted: previewedSetup === "a",
                onAdjustProbe: handleAdjustProbe,
              })}
            </>
          ) : (
            renderAirColumnRow(activeFrame, SINGLE_ROW_CENTER, {
              label: "Live air column",
              interactive: true,
              overlayValues,
              focusedOverlayId,
              onAdjustProbe: handleAdjustProbe,
            })
          )}
          <SimulationReadoutCard
            x={CARD_X}
            y={CARD_Y}
            width={CARD_WIDTH}
            title="Resonance state"
            setupLabel={compareEnabled ? primaryLabel : undefined}
            rows={metricRows}
            noteLines={noteLines}
          />
        </svg>
        <SimulationReadoutSummary
          title="Resonance state"
          setupLabel={compareEnabled ? primaryLabel : undefined}
          rows={metricRows}
          noteLines={noteLines}
          className="mx-3 mb-3 mt-0 md:hidden"
        />
      </div>
    </SimulationSceneCard>
  );
}
