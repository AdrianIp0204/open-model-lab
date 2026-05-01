"use client";

import { useRef } from "react";
import {
  clamp,
  evaluateExponentialChangeLogValue,
  evaluateExponentialChangeValue,
  EXPONENTIAL_CHANGE_TARGET_MAX,
  EXPONENTIAL_CHANGE_TARGET_MIN,
  EXPONENTIAL_CHANGE_TIME_MAX,
  formatNumber,
  resolveExponentialChangeParams,
  resolveExponentialChangeViewport,
  sampleExponentialChangeState,
  sampleRange,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import {
  buildCartesianPath,
  CartesianPlane,
  projectCartesianX,
  projectCartesianY,
  type CartesianPlaneConfig,
} from "./primitives/math-plane";
import { useSvgPointerDrag } from "./primitives/useSvgPointerDrag";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type ExponentialChangeSimulationProps = {
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
const MAIN_X = 18;
const MAIN_Y = 28;
const MAIN_WIDTH = 534;
const MAIN_HEIGHT = 284;
const INSET_X = 576;
const INSET_Y = 42;
const INSET_WIDTH = 248;
const INSET_HEIGHT = 116;
const CARD_X = 578;
const CARD_Y = 184;
const CARD_WIDTH = 242;

function buildMainPlaneConfig(amountMax: number): CartesianPlaneConfig {
  return {
    width: MAIN_WIDTH,
    height: MAIN_HEIGHT,
    paddingLeft: 46,
    paddingRight: 18,
    paddingTop: 18,
    paddingBottom: 30,
    minX: 0,
    maxX: EXPONENTIAL_CHANGE_TIME_MAX,
    minY: 0,
    maxY: Math.max(1, amountMax),
    xTickStep: 2,
    yTickStep: amountMax > 16 ? 4 : amountMax > 8 ? 2 : 1,
  };
}

function buildInsetPlaneConfig(logBound: number): CartesianPlaneConfig {
  return {
    width: INSET_WIDTH,
    height: INSET_HEIGHT,
    paddingLeft: 38,
    paddingRight: 14,
    paddingTop: 16,
    paddingBottom: 24,
    minX: 0,
    maxX: EXPONENTIAL_CHANGE_TIME_MAX,
    minY: -logBound,
    maxY: logBound,
    xTickStep: 2,
    yTickStep: logBound > 2.4 ? 1 : 0.5,
  };
}

function overlayOpacity(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.34;
}

function invertCartesianY(config: CartesianPlaneConfig, svgY: number) {
  const usableHeight = config.height - config.paddingTop - config.paddingBottom;
  const clampedY = clamp(svgY, config.paddingTop, config.height - config.paddingBottom);

  return (
    config.maxY -
    ((clampedY - config.paddingTop) / Math.max(usableHeight, Number.EPSILON)) *
      (config.maxY - config.minY)
  );
}

function buildPreviewTime(preview: GraphStagePreview | null | undefined) {
  if (!preview || preview.kind !== "response") {
    return null;
  }

  return clamp(preview.point.x, 0, EXPONENTIAL_CHANGE_TIME_MAX);
}

export function ExponentialChangeSimulation({
  concept,
  params,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: ExponentialChangeSimulationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const previewTime = buildPreviewTime(graphPreview);
  const primaryTarget = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const livePrimaryParams =
    compare && primaryTarget === "b" ? compare.setupB : compare?.setupA ?? params;
  const primaryParams = resolveExponentialChangeParams(livePrimaryParams);
  const secondaryParams = compare
    ? resolveExponentialChangeParams(
        primaryTarget === "b" ? compare.setupA : compare.setupB,
      )
    : null;
  const primarySnapshot = sampleExponentialChangeState(primaryParams);
  const secondarySnapshot = secondaryParams ? sampleExponentialChangeState(secondaryParams) : null;
  const viewport = resolveExponentialChangeViewport(
    secondaryParams ? [primaryParams, secondaryParams] : [primaryParams],
  );
  const mainPlane = buildMainPlaneConfig(viewport.amountMax * 1.08);
  const insetPlane = buildInsetPlaneConfig(viewport.logAbsMax * 1.12);
  const sampledTimes = sampleRange(0, EXPONENTIAL_CHANGE_TIME_MAX, 241);
  const currentPoints = sampledTimes.map((sampleTime) => ({
    x: sampleTime,
    y: evaluateExponentialChangeValue(primaryParams, sampleTime),
  }));
  const pairedPoints = sampledTimes.map((sampleTime) => ({
    x: sampleTime,
    y: primaryParams.initialValue * Math.exp(primarySnapshot.pairedRate * sampleTime),
  }));
  const secondaryPoints = secondaryParams
    ? sampledTimes.map((sampleTime) => ({
        x: sampleTime,
        y: evaluateExponentialChangeValue(secondaryParams, sampleTime),
      }))
    : [];
  const logPoints = sampledTimes.map((sampleTime) => ({
    x: sampleTime,
    y: evaluateExponentialChangeLogValue(primaryParams, sampleTime),
  }));
  const currentPath = buildCartesianPath(mainPlane, currentPoints);
  const pairedPath = buildCartesianPath(mainPlane, pairedPoints);
  const secondaryPath = secondaryPoints.length
    ? buildCartesianPath(mainPlane, secondaryPoints)
    : "";
  const logPath = buildCartesianPath(insetPlane, logPoints);
  const pairedLogPath = buildCartesianPath(
    insetPlane,
    sampledTimes.map((sampleTime) => ({
      x: sampleTime,
      y: primarySnapshot.pairedRate * sampleTime,
    })),
  );
  const previewAmount =
    previewTime === null ? null : evaluateExponentialChangeValue(primaryParams, previewTime);
  const previewLog =
    previewTime === null ? null : evaluateExponentialChangeLogValue(primaryParams, previewTime);
  const previewPoint =
    previewTime === null || previewAmount === null
      ? null
      : {
          x: projectCartesianX(mainPlane, previewTime),
          y: projectCartesianY(mainPlane, previewAmount),
        };
  const previewLogPoint =
    previewTime === null || previewLog === null
      ? null
      : {
          x: projectCartesianX(insetPlane, previewTime),
          y: projectCartesianY(insetPlane, previewLog),
        };
  const showTargetMarker = overlayValues?.targetMarker ?? true;
  const showPairedRate = overlayValues?.pairedRate ?? true;
  const showDoublingHalfLife = overlayValues?.doublingHalfLife ?? true;
  const showLogGuide = overlayValues?.logGuide ?? true;
  const cadenceTime = primarySnapshot.cadenceTime;
  const cadenceValue = primarySnapshot.cadenceValue;
  const cadenceLabel =
    primarySnapshot.cadenceKind === "doubling"
      ? "Doubling time"
      : primarySnapshot.cadenceKind === "half-life"
        ? "Half-life"
        : "Cadence";
  const cadenceAmountLabel =
    primarySnapshot.cadenceKind === "doubling"
      ? "doubling amount"
      : primarySnapshot.cadenceKind === "half-life"
        ? "half-life amount"
        : "cadence amount";
  const showCadenceGuide =
    showDoublingHalfLife &&
    cadenceTime !== null &&
    cadenceValue !== null &&
    cadenceTime <= EXPONENTIAL_CHANGE_TIME_MAX;
  const cadenceX = showCadenceGuide ? projectCartesianX(mainPlane, cadenceTime) : null;
  const cadenceY = showCadenceGuide ? projectCartesianY(mainPlane, cadenceValue) : null;
  const cadenceLabelX =
    cadenceX === null
      ? null
      : clamp(cadenceX, mainPlane.paddingLeft + 58, mainPlane.width - mainPlane.paddingRight - 58);
  const cadenceLabelY =
    cadenceY === null ? null : Math.max(mainPlane.paddingTop + 20, cadenceY - 16);
  const primaryLabel = compare
    ? primaryTarget === "b"
      ? compare.labelB ?? "Variant"
      : compare.labelA ?? "Baseline"
    : "Live";
  const secondaryLabel = compare
    ? primaryTarget === "b"
      ? compare.labelA ?? "Baseline"
      : compare.labelB ?? "Variant"
    : null;
  const previewBadge =
    previewTime === null ? null : `preview t = ${formatNumber(previewTime)}`;
  const readoutRows = [
    { label: "y0", value: formatNumber(primarySnapshot.initialValue) },
    { label: "k", value: formatNumber(primarySnapshot.rate) },
    { label: "target", value: formatNumber(primarySnapshot.targetValue) },
    { label: "ln(T / y0)", value: formatNumber(primarySnapshot.targetLogRatio) },
    {
      label: "t*",
      value:
        primarySnapshot.targetTime === null
          ? "not reached"
          : formatNumber(primarySnapshot.targetTime),
      valueClassName:
        primarySnapshot.targetTime === null
          ? "fill-coral-700 text-[12px] font-semibold"
          : undefined,
    },
    {
      label: cadenceLabel,
      value:
        cadenceTime === null ? "none" : formatNumber(cadenceTime),
      valueClassName:
        cadenceTime === null ? "fill-ink-500 text-[12px] font-semibold" : undefined,
    },
  ];
  const noteLines = primarySnapshot.targetTime === null
    ? [
        primarySnapshot.mode === "decay"
          ? "Target is unreachable with decay because it sits above the starting value."
          : primarySnapshot.mode === "growth"
            ? "Target is unreachable with growth because it sits below the starting value."
            : "A steady curve only reaches the start value itself.",
        "The log step still tells you why: ln(target / y0) points to the wrong side of time for this sign of k.",
      ]
    : [
        `${primarySnapshot.mode === "decay" ? "Decay" : "Growth"} hits the target after about ${formatNumber(primarySnapshot.targetTime)} time units.`,
        cadenceTime === null
          ? "Keep the opposite-rate curve on to compare how the same starting value can grow or decay."
          : `${cadenceLabel} is ${formatNumber(cadenceTime)}, where the amount is ${formatNumber(cadenceValue ?? 0)} after one fixed multiplicative step.`,
      ];

  const drag = useSvgPointerDrag({
    svgRef,
    width: WIDTH,
    height: HEIGHT,
    onDrag: (_target: "target", location) => {
      const localY = location.svgY - MAIN_Y;
      const nextTarget = clamp(
        invertCartesianY(mainPlane, localY),
        EXPONENTIAL_CHANGE_TARGET_MIN,
        EXPONENTIAL_CHANGE_TARGET_MAX,
      );

      setParam("targetValue", Number(nextTarget.toFixed(2)));
    },
  });

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(30,166,162,0.08),rgba(240,171,60,0.12))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              {concept.summary}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
            {compare ? (
              <>
                <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
                  {primaryLabel}
                </span>
                <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
                  {secondaryLabel}
                </span>
              </>
            ) : null}
            {previewBadge ? (
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-sky-700">
                {previewBadge}
              </span>
            ) : null}
            <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
              Drag the target line or use the sliders
            </span>
          </div>
        </div>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
        style={{ touchAction: "none", userSelect: "none" }}
        onPointerMove={(event) =>
          drag.handlePointerMove(event.pointerId, event.clientX, event.clientY)
        }
        onPointerUp={(event) => drag.handlePointerUp(event.pointerId)}
        onPointerCancel={(event) => drag.handlePointerCancel(event.pointerId)}
        onLostPointerCapture={drag.handleLostPointerCapture}
      >
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.56)" />
        <g transform={`translate(${MAIN_X} ${MAIN_Y})`}>
          <CartesianPlane config={mainPlane} xLabel="time" yLabel="amount" />
          <g transform={`translate(${mainPlane.paddingLeft + 8} ${mainPlane.paddingTop + 18})`}>
            <line x1="0" x2="22" y1="0" y2="0" stroke="#1ea6a2" strokeWidth="3.5" />
            <text x="28" y="4" className="fill-teal-700 text-[11px] font-semibold">
              Current curve
            </text>
            {compare ? (
              <>
                <line
                  x1="0"
                  x2="22"
                  y1="18"
                  y2="18"
                  stroke="rgba(15,28,36,0.5)"
                  strokeWidth="3"
                  strokeDasharray="8 6"
                />
                <text x="28" y="22" className="fill-ink-600 text-[11px] font-semibold">
                  {secondaryLabel} comparison
                </text>
              </>
            ) : showPairedRate ? (
              <>
                <line x1="0" x2="22" y1="18" y2="18" stroke="#f16659" strokeWidth="3" strokeDasharray="8 6" />
                <text x="28" y="22" className="fill-coral-700 text-[11px] font-semibold">
                  Opposite-rate curve
                </text>
              </>
            ) : null}
            <line
              x1="0"
              x2="22"
              y1="36"
              y2="36"
              stroke="#f0ab3c"
              strokeWidth="3"
              strokeDasharray="8 6"
            />
            <text x="28" y="40" className="fill-amber-700 text-[11px] font-semibold">
              Target
            </text>
          </g>
          {showTargetMarker ? (
            <line
              x1={projectCartesianX(mainPlane, 0)}
              x2={projectCartesianX(mainPlane, EXPONENTIAL_CHANGE_TIME_MAX)}
              y1={projectCartesianY(mainPlane, primarySnapshot.targetValue)}
              y2={projectCartesianY(mainPlane, primarySnapshot.targetValue)}
              stroke="#f0ab3c"
              strokeWidth="2.5"
              strokeDasharray="8 6"
              opacity={overlayOpacity(focusedOverlayId, "targetMarker")}
            />
          ) : null}
          <path d={currentPath} fill="none" stroke="#1ea6a2" strokeWidth="4" strokeLinecap="round" />
          {!compare && showPairedRate ? (
            <path
              d={pairedPath}
              fill="none"
              stroke="#f16659"
              strokeWidth="3"
              strokeDasharray="9 6"
              opacity={overlayOpacity(focusedOverlayId, "pairedRate")}
            />
          ) : null}
          {compare && secondaryPoints.length ? (
            <path
              d={secondaryPath}
              fill="none"
              stroke="rgba(15,28,36,0.52)"
              strokeWidth="3"
              strokeDasharray="9 6"
            />
          ) : null}
          {showCadenceGuide && cadenceX !== null && cadenceY !== null ? (
            <>
              <line
                x1={projectCartesianX(mainPlane, 0)}
                x2={cadenceX}
                y1={cadenceY}
                y2={cadenceY}
                stroke="#315063"
                strokeWidth="2.5"
                strokeDasharray="5 5"
                opacity={overlayOpacity(focusedOverlayId, "doublingHalfLife")}
              />
              <line
                x1={cadenceX}
                x2={cadenceX}
                y1={projectCartesianY(mainPlane, 0)}
                y2={cadenceY}
                stroke="#315063"
                strokeWidth="2.5"
                strokeDasharray="5 5"
                opacity={overlayOpacity(focusedOverlayId, "doublingHalfLife")}
              />
              <circle
                cx={cadenceX}
                cy={cadenceY}
                r="5.5"
                fill="#315063"
                stroke="white"
                strokeWidth="2"
                opacity={overlayOpacity(focusedOverlayId, "doublingHalfLife")}
              />
              {cadenceLabelX !== null && cadenceLabelY !== null ? (
                <g
                  transform={`translate(${cadenceLabelX - 58} ${cadenceLabelY - 26})`}
                  opacity={overlayOpacity(focusedOverlayId, "doublingHalfLife")}
                >
                  <rect
                    width="116"
                    height="30"
                    rx="10"
                    fill="rgba(49,80,99,0.12)"
                    stroke="rgba(49,80,99,0.28)"
                  />
                  <text
                    x="58"
                    y="12"
                    textAnchor="middle"
                    className="fill-ink-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
                  >
                    {cadenceLabel}
                  </text>
                  <text
                    x="58"
                    y="24"
                    textAnchor="middle"
                    className="fill-ink-600 text-[10px] font-medium"
                  >
                    {cadenceAmountLabel} = {formatNumber(cadenceValue)}
                  </text>
                </g>
              ) : null}
            </>
          ) : null}
          {showTargetMarker && primarySnapshot.targetInWindow ? (
            <circle
              cx={projectCartesianX(mainPlane, primarySnapshot.targetTime ?? 0)}
              cy={projectCartesianY(mainPlane, primarySnapshot.targetValue)}
              r="6.5"
              fill="#f0ab3c"
              stroke="white"
              strokeWidth="2.5"
              opacity={overlayOpacity(focusedOverlayId, "targetMarker")}
            />
          ) : null}
          {compare && showTargetMarker && secondarySnapshot?.targetInWindow ? (
            <circle
              cx={projectCartesianX(mainPlane, secondarySnapshot.targetTime ?? 0)}
              cy={projectCartesianY(mainPlane, secondarySnapshot.targetValue)}
              r="5.5"
              fill="rgba(15,28,36,0.68)"
              stroke="white"
              strokeWidth="2"
            />
          ) : null}
          {!compare && showPairedRate && showTargetMarker && primarySnapshot.pairedTargetInWindow ? (
            <circle
              cx={projectCartesianX(mainPlane, primarySnapshot.pairedTargetTime ?? 0)}
              cy={projectCartesianY(mainPlane, primarySnapshot.targetValue)}
              r="5.5"
              fill="#f16659"
              stroke="white"
              strokeWidth="2"
              opacity={overlayOpacity(focusedOverlayId, "pairedRate")}
            />
          ) : null}
          <g transform={`translate(${projectCartesianX(mainPlane, 0) + 10} ${projectCartesianY(mainPlane, primarySnapshot.targetValue) - 8})`}>
            <rect width="88" height="18" rx="9" fill="rgba(240,171,60,0.14)" stroke="rgba(240,171,60,0.35)" />
            <text x="44" y="12" textAnchor="middle" className="fill-amber-700 text-[10px] font-semibold uppercase tracking-[0.14em]">
              target = {formatNumber(primarySnapshot.targetValue)}
            </text>
          </g>
          <circle
            cx={projectCartesianX(mainPlane, EXPONENTIAL_CHANGE_TIME_MAX)}
            cy={projectCartesianY(mainPlane, evaluateExponentialChangeValue(primaryParams, EXPONENTIAL_CHANGE_TIME_MAX))}
            r="4.5"
            fill="#1ea6a2"
          />
          <circle
            cx={projectCartesianX(mainPlane, 0)}
            cy={projectCartesianY(mainPlane, primarySnapshot.initialValue)}
            r="5.5"
            fill="#315063"
            stroke="white"
            strokeWidth="2"
          />
          <circle
            cx={projectCartesianX(mainPlane, 0)}
            cy={projectCartesianY(mainPlane, primarySnapshot.targetValue)}
            r="8"
            fill="rgba(240,171,60,0.12)"
            stroke="#f0ab3c"
            strokeWidth="2.5"
            onPointerDown={(event) =>
              drag.startDrag(event.pointerId, "target", event.clientX, event.clientY)
            }
            style={{ cursor: "ns-resize" }}
          />
          {previewPoint ? (
            <>
              <line
                x1={previewPoint.x}
                x2={previewPoint.x}
                y1={projectCartesianY(mainPlane, 0)}
                y2={previewPoint.y}
                stroke="rgba(78,166,223,0.48)"
                strokeWidth="2.5"
                strokeDasharray="5 5"
              />
              <circle cx={previewPoint.x} cy={previewPoint.y} r="6" fill="#4ea6df" stroke="white" strokeWidth="2" />
            </>
          ) : null}
        </g>

        <g transform={`translate(${INSET_X} ${INSET_Y})`}>
          <CartesianPlane config={insetPlane} xLabel="time" yLabel="ln(y / y0)" />
          <path d={logPath} fill="none" stroke="#315063" strokeWidth="3.5" strokeLinecap="round" />
          {!compare && showPairedRate ? (
            <path
              d={pairedLogPath}
              fill="none"
              stroke="#f16659"
              strokeWidth="2.5"
              strokeDasharray="8 6"
              opacity={overlayOpacity(focusedOverlayId, "pairedRate")}
            />
          ) : null}
          {showLogGuide ? (
            <line
              x1={projectCartesianX(insetPlane, 0)}
              x2={projectCartesianX(insetPlane, EXPONENTIAL_CHANGE_TIME_MAX)}
              y1={projectCartesianY(insetPlane, primarySnapshot.targetLogRatio)}
              y2={projectCartesianY(insetPlane, primarySnapshot.targetLogRatio)}
              stroke="#f0ab3c"
              strokeWidth="2.5"
              strokeDasharray="8 6"
              opacity={overlayOpacity(focusedOverlayId, "logGuide")}
            />
          ) : null}
          {showLogGuide && primarySnapshot.targetInWindow ? (
            <circle
              cx={projectCartesianX(insetPlane, primarySnapshot.targetTime ?? 0)}
              cy={projectCartesianY(insetPlane, primarySnapshot.targetLogRatio)}
              r="5.5"
              fill="#f0ab3c"
              stroke="white"
              strokeWidth="2"
              opacity={overlayOpacity(focusedOverlayId, "logGuide")}
            />
          ) : null}
          {previewLogPoint ? (
            <circle
              cx={previewLogPoint.x}
              cy={previewLogPoint.y}
              r="5.5"
              fill="#4ea6df"
              stroke="white"
              strokeWidth="2"
            />
          ) : null}
          <text
            x={insetPlane.paddingLeft}
            y={insetPlane.paddingTop - 4}
            className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
          >
            Log view straightens the target question
          </text>
        </g>

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Inverse readout"
          setupLabel={compare ? primaryLabel : null}
          rows={readoutRows}
          noteLines={noteLines}
        />
      </svg>
    </section>
  );
}
