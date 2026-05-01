"use client";

import { useMemo, useRef } from "react";
import {
  clamp,
  formatNumber,
  INTEGRAL_ACCUMULATION_BOUND_MAX,
  INTEGRAL_ACCUMULATION_BOUND_MIN,
  INTEGRAL_ACCUMULATION_DOMAIN_MAX,
  INTEGRAL_ACCUMULATION_DOMAIN_MIN,
  integralAccumulationSource,
  sampleIntegralAccumulationAreaSegments,
  sampleIntegralAccumulationState,
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

type IntegralAccumulationSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 820;
const HEIGHT = 340;
const SOURCE_X = 18;
const SOURCE_Y = 28;
const SOURCE_PLANE: CartesianPlaneConfig = {
  width: 524,
  height: 284,
  paddingLeft: 44,
  paddingRight: 16,
  paddingTop: 18,
  paddingBottom: 28,
  minX: -3.4,
  maxX: 3.4,
  minY: -2.8,
  maxY: 1.8,
  xTickStep: 1,
  yTickStep: 1,
};
const INSET_X = 566;
const INSET_Y = 44;
const INSET_PLANE: CartesianPlaneConfig = {
  width: 232,
  height: 118,
  paddingLeft: 34,
  paddingRight: 14,
  paddingTop: 16,
  paddingBottom: 24,
  minX: -3.4,
  maxX: 3.4,
  minY: -2.4,
  maxY: 2.4,
  xTickStep: 2,
  yTickStep: 1,
};
const CARD_X = 570;
const CARD_Y = 188;
const CARD_WIDTH = 228;

function invertCartesianX(config: CartesianPlaneConfig, svgX: number) {
  const usableWidth = config.width - config.paddingLeft - config.paddingRight;
  const clampedX = clamp(
    svgX,
    config.paddingLeft,
    config.width - config.paddingRight,
  );

  return (
    config.minX +
    ((clampedX - config.paddingLeft) / Math.max(usableWidth, Number.EPSILON)) *
      (config.maxX - config.minX)
  );
}

function buildAreaPath(config: CartesianPlaneConfig, points: Array<{ x: number; y: number }>) {
  if (!points.length) {
    return "";
  }

  const first = points[0];
  const last = points[points.length - 1];

  if (!first || !last) {
    return "";
  }

  return [
    `M ${projectCartesianX(config, first.x)} ${projectCartesianY(config, 0)}`,
    buildCartesianPath(config, points),
    `L ${projectCartesianX(config, last.x)} ${projectCartesianY(config, 0)}`,
    "Z",
  ].join(" ");
}

function overlayOpacity(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.35;
}

export function IntegralAccumulationSimulation({
  concept,
  params,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: IntegralAccumulationSimulationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const primaryTarget = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const previewUpperBound =
    graphPreview?.kind === "response"
      ? clamp(
          graphPreview.point.x,
          INTEGRAL_ACCUMULATION_BOUND_MIN,
          INTEGRAL_ACCUMULATION_BOUND_MAX,
        )
      : null;
  const livePrimaryParams =
    compare && primaryTarget === "b" ? compare.setupB : compare?.setupA ?? params;
  const primaryParams =
    previewUpperBound === null
      ? livePrimaryParams
      : { ...livePrimaryParams, upperBound: previewUpperBound };
  const secondaryParams =
    compare && primaryTarget === "b" ? compare.setupA : compare?.setupB ?? null;
  const primarySnapshot = sampleIntegralAccumulationState(primaryParams);
  const secondarySnapshot = secondaryParams
    ? sampleIntegralAccumulationState(secondaryParams)
    : null;
  const primaryLabel = compare
    ? primaryTarget === "b"
      ? compare.labelB ?? "B"
      : compare.labelA ?? "A"
    : "Live";
  const secondaryLabel = compare
    ? primaryTarget === "b"
      ? compare.labelA ?? "A"
      : compare.labelB ?? "B"
    : "";
  const previewBadge = graphPreview ? graphPreview.seriesLabel : null;
  const showSignedArea = overlayValues?.signedArea ?? true;
  const showBoundGuide = overlayValues?.boundGuide ?? true;
  const showAccumulationPoint = overlayValues?.accumulationPoint ?? true;
  const areaSegments = sampleIntegralAccumulationAreaSegments(primarySnapshot.upperBound);

  const sourcePath = useMemo(
    () =>
      buildCartesianPath(
        SOURCE_PLANE,
        sampleRange(
          INTEGRAL_ACCUMULATION_DOMAIN_MIN,
          INTEGRAL_ACCUMULATION_DOMAIN_MAX,
          241,
        ).map((x) => ({ x, y: integralAccumulationSource(x) })),
      ),
    [],
  );
  const accumulationPath = useMemo(
    () =>
      buildCartesianPath(
        INSET_PLANE,
        sampleRange(
          INTEGRAL_ACCUMULATION_DOMAIN_MIN,
          INTEGRAL_ACCUMULATION_DOMAIN_MAX,
          241,
        ).map((x) => ({
          x,
          y: sampleIntegralAccumulationState({ upperBound: x }).accumulatedValue,
        })),
      ),
    [],
  );

  const readoutRows = [
    { label: "x", value: formatNumber(primarySnapshot.upperBound) },
    { label: "f(x)", value: formatNumber(primarySnapshot.sourceHeight) },
    { label: "A(x)", value: formatNumber(primarySnapshot.accumulatedValue) },
    { label: "A'(x)", value: formatNumber(primarySnapshot.accumulationSlope) },
  ];

  const drag = useSvgPointerDrag({
    svgRef,
    width: WIDTH,
    height: HEIGHT,
    onDrag: (target: "bound" | "accumulation", location) => {
      const localX = target === "bound" ? location.svgX - SOURCE_X : location.svgX - INSET_X;
      const nextUpperBound = clamp(
        invertCartesianX(target === "bound" ? SOURCE_PLANE : INSET_PLANE, localX),
        INTEGRAL_ACCUMULATION_BOUND_MIN,
        INTEGRAL_ACCUMULATION_BOUND_MAX,
      );

      setParam("upperBound", Number(nextUpperBound.toFixed(2)));
    },
  });

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(30,166,162,0.08),rgba(78,166,223,0.08))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="lab-label">{concept.title}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-700">
            {compare ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
                  {primaryLabel}
                </span>
                <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
                  {secondaryLabel}
                </span>
              </div>
            ) : null}
            {previewBadge ? (
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-sky-700">
                Preview {previewBadge}
              </span>
            ) : null}
            <p>Drag the upper-bound point to grow or shrink the running total.</p>
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
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.58)" />
        <g transform={`translate(${SOURCE_X} ${SOURCE_Y})`}>
          <CartesianPlane config={SOURCE_PLANE} xLabel="x" yLabel="height" />
          <g transform={`translate(${SOURCE_PLANE.paddingLeft + 8} ${SOURCE_PLANE.paddingTop + 18})`}>
            <line x1="0" x2="22" y1="0" y2="0" stroke="#1ea6a2" strokeWidth="3.5" />
            <text x="28" y="4" className="fill-teal-700 text-[11px] font-semibold">
              Source height
            </text>
            <line x1="0" x2="22" y1="18" y2="18" stroke="rgba(78,166,223,0.78)" strokeWidth="3" />
            <text x="28" y="22" className="fill-sky-700 text-[11px] font-semibold">
              Signed area
            </text>
            {secondarySnapshot ? (
              <>
                <line
                  x1="0"
                  x2="22"
                  y1="36"
                  y2="36"
                  stroke="rgba(15,28,36,0.45)"
                  strokeDasharray="8 7"
                  strokeWidth="3"
                />
                <text x="28" y="40" className="fill-ink-600 text-[11px] font-semibold">
                  {secondaryLabel} bound
                </text>
              </>
            ) : null}
          </g>
          {showSignedArea
            ? areaSegments.map((segment, index) => (
                <path
                  key={`${segment.sign}-${index}`}
                  d={buildAreaPath(SOURCE_PLANE, segment.points)}
                  fill={
                    segment.sign === "positive"
                      ? "rgba(30,166,162,0.18)"
                      : "rgba(241,102,89,0.16)"
                  }
                  opacity={overlayOpacity(focusedOverlayId, "signedArea")}
                />
              ))
            : null}
          <path d={sourcePath} fill="none" stroke="#1ea6a2" strokeWidth="4" strokeLinecap="round" />
          {secondarySnapshot && showBoundGuide ? (
            <g opacity={0.5}>
              <line
                x1={projectCartesianX(SOURCE_PLANE, secondarySnapshot.upperBound)}
                x2={projectCartesianX(SOURCE_PLANE, secondarySnapshot.upperBound)}
                y1={projectCartesianY(SOURCE_PLANE, 0)}
                y2={projectCartesianY(SOURCE_PLANE, secondarySnapshot.sourceHeight)}
                stroke="rgba(15,28,36,0.52)"
                strokeDasharray="8 7"
                strokeWidth="2.5"
              />
              <circle
                cx={projectCartesianX(SOURCE_PLANE, secondarySnapshot.upperBound)}
                cy={projectCartesianY(SOURCE_PLANE, secondarySnapshot.sourceHeight)}
                r="5"
                fill="rgba(15,28,36,0.52)"
              />
            </g>
          ) : null}
          {showBoundGuide ? (
            <g opacity={overlayOpacity(focusedOverlayId, "boundGuide")}>
              <line
                x1={projectCartesianX(SOURCE_PLANE, primarySnapshot.upperBound)}
                x2={projectCartesianX(SOURCE_PLANE, primarySnapshot.upperBound)}
                y1={projectCartesianY(SOURCE_PLANE, 0)}
                y2={projectCartesianY(SOURCE_PLANE, primarySnapshot.sourceHeight)}
                stroke="#4ea6df"
                strokeDasharray="7 6"
                strokeWidth="2.5"
              />
              <text
                x={projectCartesianX(SOURCE_PLANE, primarySnapshot.upperBound)}
                y={projectCartesianY(SOURCE_PLANE, 0) + 18}
                textAnchor="middle"
                className="fill-sky-700 text-[11px] font-semibold"
              >
                upper bound = {formatNumber(primarySnapshot.upperBound)}
              </text>
            </g>
          ) : null}
          <circle
            cx={projectCartesianX(SOURCE_PLANE, primarySnapshot.upperBound)}
            cy={projectCartesianY(SOURCE_PLANE, primarySnapshot.sourceHeight)}
            r={drag.activePointerId === null ? 8 : 10}
            fill="#1ea6a2"
            stroke="rgba(255,255,255,0.94)"
            strokeWidth="3"
            style={{ cursor: "grab" }}
            onPointerDown={(event) =>
              drag.startDrag(event.pointerId, "bound", event.clientX, event.clientY)
            }
          />
        </g>
        <g transform={`translate(${INSET_X} ${INSET_Y})`}>
          <CartesianPlane
            config={INSET_PLANE}
            xLabel="x"
            yLabel="A(x)"
            backgroundFill="rgba(255,255,255,0.72)"
          />
          <text
            x={INSET_PLANE.paddingLeft}
            y={14}
            className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
          >
            Accumulation graph
          </text>
          <path
            d={accumulationPath}
            fill="none"
            stroke="#4ea6df"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {secondarySnapshot && showAccumulationPoint ? (
            <circle
              cx={projectCartesianX(INSET_PLANE, secondarySnapshot.upperBound)}
              cy={projectCartesianY(INSET_PLANE, secondarySnapshot.accumulatedValue)}
              r="5"
              fill="rgba(15,28,36,0.52)"
              opacity="0.5"
            />
          ) : null}
          {showAccumulationPoint ? (
            <g opacity={overlayOpacity(focusedOverlayId, "accumulationPoint")}>
              <line
                x1={projectCartesianX(INSET_PLANE, primarySnapshot.upperBound)}
                x2={projectCartesianX(INSET_PLANE, primarySnapshot.upperBound)}
                y1={projectCartesianY(INSET_PLANE, 0)}
                y2={projectCartesianY(INSET_PLANE, primarySnapshot.accumulatedValue)}
                stroke="#4ea6df"
                strokeDasharray="6 5"
                strokeWidth="2"
              />
              <circle
                cx={projectCartesianX(INSET_PLANE, primarySnapshot.upperBound)}
                cy={projectCartesianY(INSET_PLANE, primarySnapshot.accumulatedValue)}
                r={drag.activePointerId === null ? 7 : 9}
                fill="#4ea6df"
                stroke="rgba(255,255,255,0.94)"
                strokeWidth="3"
                style={{ cursor: "grab" }}
                onPointerDown={(event) =>
                  drag.startDrag(event.pointerId, "accumulation", event.clientX, event.clientY)
                }
              />
            </g>
          ) : null}
        </g>
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Running total"
          setupLabel={primaryLabel}
          rows={readoutRows}
          noteLines={[
            Math.abs(primarySnapshot.sourceHeight) <= 0.08
              ? "The source height is near zero, so the running total is almost flat here."
              : primarySnapshot.sourceHeight > 0
                ? "Positive source height means moving right adds area."
                : "Negative source height means moving right subtracts area.",
            primarySnapshot.accumulatedValue >= 0
              ? "The accumulated amount is still net positive."
              : "The accumulated amount has turned net negative.",
          ]}
        />
      </svg>
    </section>
  );
}
