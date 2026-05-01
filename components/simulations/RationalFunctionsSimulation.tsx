"use client";

import { useRef } from "react";
import {
  clamp,
  formatNumber,
  formatRationalFunctionsDomain,
  getRationalFunctionsBranchSummary,
  getRationalFunctionsEndBehaviorSummary,
  RATIONAL_FUNCTIONS_DISTANCE_MAX,
  RATIONAL_FUNCTIONS_DISTANCE_MIN,
  RATIONAL_FUNCTIONS_DOMAIN_MAX,
  RATIONAL_FUNCTIONS_DOMAIN_MIN,
  RATIONAL_FUNCTIONS_Y_MAX,
  RATIONAL_FUNCTIONS_Y_MIN,
  sampleRationalFunctionsCurveSegments,
  sampleRationalFunctionsState,
  type ConceptSimulationSource,
  type GraphPoint,
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

type RationalFunctionsSimulationProps = {
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
const PLOT_X = 18;
const PLOT_Y = 28;
const PLOT: CartesianPlaneConfig = {
  width: 530,
  height: 284,
  paddingLeft: 44,
  paddingRight: 16,
  paddingTop: 18,
  paddingBottom: 28,
  minX: RATIONAL_FUNCTIONS_DOMAIN_MIN,
  maxX: RATIONAL_FUNCTIONS_DOMAIN_MAX,
  minY: RATIONAL_FUNCTIONS_Y_MIN,
  maxY: RATIONAL_FUNCTIONS_Y_MAX,
  xTickStep: 1,
  yTickStep: 2,
};
const CARD_X = 566;
const CARD_Y = 124;
const CARD_WIDTH = 238;
const LEGEND_X = 580;
const LEGEND_Y = 56;

function clampPlotPoint(point: GraphPoint) {
  return {
    x: point.x,
    y: clamp(point.y, RATIONAL_FUNCTIONS_Y_MIN, RATIONAL_FUNCTIONS_Y_MAX),
  };
}

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

function overlayOpacity(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.35;
}

function openPoint(
  x: number,
  y: number,
  stroke: string,
  radius = 7,
  opacity = 1,
) {
  return (
    <circle
      cx={projectCartesianX(PLOT, x)}
      cy={projectCartesianY(PLOT, clamp(y, RATIONAL_FUNCTIONS_Y_MIN, RATIONAL_FUNCTIONS_Y_MAX))}
      r={radius}
      fill="rgba(255,253,247,0.96)"
      stroke={stroke}
      strokeWidth="2.5"
      opacity={opacity}
    />
  );
}

function filledPoint(
  x: number,
  y: number,
  fill: string,
  radius = 6,
  opacity = 1,
) {
  return (
    <circle
      cx={projectCartesianX(PLOT, x)}
      cy={projectCartesianY(PLOT, clamp(y, RATIONAL_FUNCTIONS_Y_MIN, RATIONAL_FUNCTIONS_Y_MAX))}
      r={radius}
      fill={fill}
      stroke="rgba(255,255,255,0.92)"
      strokeWidth="2"
      opacity={opacity}
    />
  );
}

function noteLines(snapshot: ReturnType<typeof sampleRationalFunctionsState>) {
  const lines = [`Domain: ${formatRationalFunctionsDomain(snapshot)}.`];

  if (snapshot.showHole && snapshot.holeX !== null && snapshot.holeValue !== null) {
    lines.push(
      `The removable hole sits at (${formatNumber(snapshot.holeX)}, ${formatNumber(snapshot.holeValue)}).`,
    );
  }

  lines.push(getRationalFunctionsBranchSummary(snapshot));
  lines.push(getRationalFunctionsEndBehaviorSummary(snapshot));
  return lines;
}

export function RationalFunctionsSimulation({
  concept,
  params,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: RationalFunctionsSimulationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const primaryTarget = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const previewDistance =
    graphPreview?.kind === "response" && graphPreview.graphId === "asymptote-response"
      ? clamp(
          graphPreview.point.x,
          RATIONAL_FUNCTIONS_DISTANCE_MIN,
          RATIONAL_FUNCTIONS_DISTANCE_MAX,
        )
      : null;
  const livePrimaryParams =
    compare && primaryTarget === "b" ? compare.setupB : compare?.setupA ?? params;
  const primaryParams =
    previewDistance === null
      ? livePrimaryParams
      : { ...livePrimaryParams, sampleDistance: previewDistance };
  const secondaryParams =
    compare && primaryTarget === "b" ? compare.setupA : compare?.setupB ?? null;
  const primarySnapshot = sampleRationalFunctionsState(primaryParams);
  const secondarySnapshot = secondaryParams
    ? sampleRationalFunctionsState(secondaryParams)
    : null;
  const primarySegments = sampleRationalFunctionsCurveSegments(primaryParams);
  const secondarySegments = secondaryParams
    ? sampleRationalFunctionsCurveSegments(secondaryParams)
    : [];
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
  const showAsymptotes = overlayValues?.asymptotes ?? true;
  const showProbeMarkers = overlayValues?.probeMarkers ?? true;
  const showIntercepts = overlayValues?.intercepts ?? true;
  const showHoleMarker = overlayValues?.holeMarker ?? true;

  const readoutRows = [
    { label: "x = h", value: formatNumber(primarySnapshot.asymptoteX) },
    { label: "y = k", value: formatNumber(primarySnapshot.horizontalAsymptoteY) },
    { label: "a", value: formatNumber(primarySnapshot.branchScale) },
    { label: "left(d)", value: formatNumber(primarySnapshot.leftProbeValue) },
    { label: "right(d)", value: formatNumber(primarySnapshot.rightProbeValue) },
    {
      label: "x-int",
      value:
        primarySnapshot.xInterceptDefined && primarySnapshot.xIntercept !== null
          ? formatNumber(primarySnapshot.xIntercept)
          : "none",
    },
    {
      label: "y-int",
      value:
        primarySnapshot.yInterceptDefined && primarySnapshot.yIntercept !== null
          ? formatNumber(primarySnapshot.yIntercept)
          : "removed",
    },
    {
      label: "hole",
      value:
        primarySnapshot.showHole &&
        primarySnapshot.holeX !== null &&
        primarySnapshot.holeValue !== null
          ? `(${formatNumber(primarySnapshot.holeX)}, ${formatNumber(primarySnapshot.holeValue)})`
          : "off",
    },
  ];

  const drag = useSvgPointerDrag({
    svgRef,
    width: WIDTH,
    height: HEIGHT,
    onDrag: (_target: "leftProbe" | "rightProbe", location) => {
      const localX = location.svgX - PLOT_X;
      const nextX = invertCartesianX(PLOT, localX);
      const nextDistance = clamp(
        Math.abs(nextX - primarySnapshot.asymptoteX),
        RATIONAL_FUNCTIONS_DISTANCE_MIN,
        RATIONAL_FUNCTIONS_DISTANCE_MAX,
      );

      setParam("sampleDistance", Number(nextDistance.toFixed(2)));
    },
  });

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(240,164,58,0.09),rgba(78,166,223,0.08))] px-3 py-2">
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
            <p>{concept.summary}</p>
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
        <g transform={`translate(${PLOT_X} ${PLOT_Y})`}>
          <CartesianPlane config={PLOT} xLabel="x" yLabel="f(x)" />
          <g transform={`translate(${LEGEND_X - PLOT_X} ${LEGEND_Y - PLOT_Y})`}>
            <line x1="0" x2="22" y1="0" y2="0" stroke="#1ea6a2" strokeWidth="3.5" />
            <text x="28" y="4" className="fill-teal-700 text-[11px] font-semibold">
              Current family
            </text>
            <line
              x1="0"
              x2="22"
              y1="18"
              y2="18"
              stroke="rgba(15,28,36,0.38)"
              strokeDasharray="8 7"
              strokeWidth="3"
            />
            <text x="28" y="22" className="fill-ink-600 text-[11px] font-semibold">
              Asymptotes
            </text>
            {secondarySnapshot ? (
              <>
                <line
                  x1="0"
                  x2="22"
                  y1="36"
                  y2="36"
                  stroke="rgba(15,28,36,0.42)"
                  strokeDasharray="10 8"
                  strokeWidth="3"
                />
                <text x="28" y="40" className="fill-ink-600 text-[11px] font-semibold">
                  {secondaryLabel} comparison
                </text>
              </>
            ) : null}
          </g>
          {showAsymptotes ? (
            <g opacity={overlayOpacity(focusedOverlayId, "asymptotes")}>
              <line
                x1={projectCartesianX(PLOT, primarySnapshot.asymptoteX)}
                x2={projectCartesianX(PLOT, primarySnapshot.asymptoteX)}
                y1={projectCartesianY(PLOT, RATIONAL_FUNCTIONS_Y_MIN)}
                y2={projectCartesianY(PLOT, RATIONAL_FUNCTIONS_Y_MAX)}
                stroke="rgba(15,28,36,0.42)"
                strokeDasharray="8 7"
                strokeWidth="2.5"
              />
              <line
                x1={projectCartesianX(PLOT, RATIONAL_FUNCTIONS_DOMAIN_MIN)}
                x2={projectCartesianX(PLOT, RATIONAL_FUNCTIONS_DOMAIN_MAX)}
                y1={projectCartesianY(PLOT, primarySnapshot.horizontalAsymptoteY)}
                y2={projectCartesianY(PLOT, primarySnapshot.horizontalAsymptoteY)}
                stroke="rgba(15,28,36,0.42)"
                strokeDasharray="8 7"
                strokeWidth="2.5"
              />
            </g>
          ) : null}
          {secondarySnapshot && showAsymptotes ? (
            <g opacity="0.68">
              <line
                x1={projectCartesianX(PLOT, secondarySnapshot.asymptoteX)}
                x2={projectCartesianX(PLOT, secondarySnapshot.asymptoteX)}
                y1={projectCartesianY(PLOT, RATIONAL_FUNCTIONS_Y_MIN)}
                y2={projectCartesianY(PLOT, RATIONAL_FUNCTIONS_Y_MAX)}
                stroke="rgba(15,28,36,0.28)"
                strokeDasharray="4 6"
                strokeWidth="2"
              />
              <line
                x1={projectCartesianX(PLOT, RATIONAL_FUNCTIONS_DOMAIN_MIN)}
                x2={projectCartesianX(PLOT, RATIONAL_FUNCTIONS_DOMAIN_MAX)}
                y1={projectCartesianY(PLOT, secondarySnapshot.horizontalAsymptoteY)}
                y2={projectCartesianY(PLOT, secondarySnapshot.horizontalAsymptoteY)}
                stroke="rgba(15,28,36,0.28)"
                strokeDasharray="4 6"
                strokeWidth="2"
              />
            </g>
          ) : null}
          {secondarySegments.map((segment) => (
            <path
              key={`secondary-${segment.id}`}
              d={buildCartesianPath(PLOT, segment.points.map(clampPlotPoint))}
              fill="none"
              stroke="rgba(15,28,36,0.44)"
              strokeDasharray="10 8"
              strokeWidth="3"
            />
          ))}
          {primarySegments.map((segment) => (
            <path
              key={segment.id}
              d={buildCartesianPath(PLOT, segment.points.map(clampPlotPoint))}
              fill="none"
              stroke="#1ea6a2"
              strokeWidth="4"
              strokeLinecap="round"
            />
          ))}
          {showProbeMarkers ? (
            <g opacity={overlayOpacity(focusedOverlayId, "probeMarkers")}>
              <line
                x1={projectCartesianX(PLOT, primarySnapshot.leftProbeX)}
                x2={projectCartesianX(PLOT, primarySnapshot.leftProbeX)}
                y1={projectCartesianY(PLOT, 0)}
                y2={projectCartesianY(
                  PLOT,
                  clamp(
                    primarySnapshot.leftProbeValue,
                    RATIONAL_FUNCTIONS_Y_MIN,
                    RATIONAL_FUNCTIONS_Y_MAX,
                  ),
                )}
                stroke="rgba(242,164,58,0.46)"
                strokeDasharray="5 5"
              />
              <line
                x1={projectCartesianX(PLOT, primarySnapshot.rightProbeX)}
                x2={projectCartesianX(PLOT, primarySnapshot.rightProbeX)}
                y1={projectCartesianY(PLOT, 0)}
                y2={projectCartesianY(
                  PLOT,
                  clamp(
                    primarySnapshot.rightProbeValue,
                    RATIONAL_FUNCTIONS_Y_MIN,
                    RATIONAL_FUNCTIONS_Y_MAX,
                  ),
                )}
                stroke="rgba(78,166,223,0.46)"
                strokeDasharray="5 5"
              />
              {filledPoint(
                primarySnapshot.leftProbeX,
                primarySnapshot.leftProbeValue,
                "#f2a43a",
                6.5,
                1,
              )}
              <circle
                cx={projectCartesianX(PLOT, primarySnapshot.leftProbeX)}
                cy={projectCartesianY(
                  PLOT,
                  clamp(
                    primarySnapshot.leftProbeValue,
                    RATIONAL_FUNCTIONS_Y_MIN,
                    RATIONAL_FUNCTIONS_Y_MAX,
                  ),
                )}
                r="14"
                fill="transparent"
                style={{ cursor: "grab" }}
                onPointerDown={(event) =>
                  drag.startDrag(event.pointerId, "leftProbe", event.clientX, event.clientY)
                }
              />
              {filledPoint(
                primarySnapshot.rightProbeX,
                primarySnapshot.rightProbeValue,
                "#4ea6df",
                6.5,
                1,
              )}
              <circle
                cx={projectCartesianX(PLOT, primarySnapshot.rightProbeX)}
                cy={projectCartesianY(
                  PLOT,
                  clamp(
                    primarySnapshot.rightProbeValue,
                    RATIONAL_FUNCTIONS_Y_MIN,
                    RATIONAL_FUNCTIONS_Y_MAX,
                  ),
                )}
                r="14"
                fill="transparent"
                style={{ cursor: "grab" }}
                onPointerDown={(event) =>
                  drag.startDrag(event.pointerId, "rightProbe", event.clientX, event.clientY)
                }
              />
            </g>
          ) : null}
          {showIntercepts ? (
            <g opacity={overlayOpacity(focusedOverlayId, "intercepts")}>
              {primarySnapshot.xInterceptDefined && primarySnapshot.xIntercept !== null
                ? filledPoint(primarySnapshot.xIntercept, 0, "#f16659", 6.5, 1)
                : null}
              {primarySnapshot.yInterceptDefined && primarySnapshot.yIntercept !== null
                ? filledPoint(0, primarySnapshot.yIntercept, "#315063", 6.5, 1)
                : null}
            </g>
          ) : null}
          {showHoleMarker &&
          primarySnapshot.showHole &&
          primarySnapshot.holeX !== null &&
          primarySnapshot.holeValue !== null ? (
            <g opacity={overlayOpacity(focusedOverlayId, "holeMarker")}>
              {openPoint(primarySnapshot.holeX, primarySnapshot.holeValue, "#f16659", 7.5, 1)}
            </g>
          ) : null}
          <text
            x={projectCartesianX(PLOT, primarySnapshot.asymptoteX)}
            y={projectCartesianY(PLOT, RATIONAL_FUNCTIONS_Y_MAX) + 16}
            textAnchor="middle"
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            x = h
          </text>
          <text
            x={projectCartesianX(PLOT, RATIONAL_FUNCTIONS_DOMAIN_MAX) - 6}
            y={projectCartesianY(PLOT, primarySnapshot.horizontalAsymptoteY) - 8}
            textAnchor="end"
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            y = k
          </text>
        </g>
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Asymptotes and intercepts"
          setupLabel={compare ? primaryLabel : null}
          rows={readoutRows}
          noteLines={noteLines(primarySnapshot)}
        />
      </svg>
    </section>
  );
}
