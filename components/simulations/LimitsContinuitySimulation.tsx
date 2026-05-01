"use client";

import { useRef } from "react";
import {
  clamp,
  formatNumber,
  LIMITS_CONTINUITY_DISTANCE_MAX,
  LIMITS_CONTINUITY_DISTANCE_MIN,
  LIMITS_CONTINUITY_DOMAIN_MAX,
  LIMITS_CONTINUITY_DOMAIN_MIN,
  sampleLimitsContinuityCurveSegments,
  sampleLimitsContinuityState,
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

type LimitsContinuitySimulationProps = {
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
  minX: LIMITS_CONTINUITY_DOMAIN_MIN,
  maxX: LIMITS_CONTINUITY_DOMAIN_MAX,
  minY: -6.4,
  maxY: 6.4,
  xTickStep: 1,
  yTickStep: 2,
};
const CARD_X = 568;
const CARD_Y = 170;
const CARD_WIDTH = 232;
const LEGEND_X = 584;
const LEGEND_Y = 58;

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

function noteLinesForCase(snapshot: ReturnType<typeof sampleLimitsContinuityState>) {
  switch (snapshot.caseKey) {
    case "continuous":
      return [
        "Both sides are closing in on the same height.",
        "The filled point matches that limiting value.",
      ];
    case "removable-hole":
      return [
        "Both sides are closing in on the same height.",
        "The point at x = 0 sits somewhere else, so continuity breaks.",
      ];
    case "jump":
      return [
        "The left and right sides head toward different heights.",
        "No single two-sided limit can be read from this target.",
      ];
    case "blow-up":
      return [
        "The values grow without bound near the target.",
        "There is no finite two-sided limit or defined point at x = 0.",
      ];
  }
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
      cy={projectCartesianY(PLOT, y)}
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
      cy={projectCartesianY(PLOT, y)}
      r={radius}
      fill={fill}
      stroke="rgba(255,255,255,0.92)"
      strokeWidth="2"
      opacity={opacity}
    />
  );
}

export function LimitsContinuitySimulation({
  concept,
  params,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: LimitsContinuitySimulationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const primaryTarget = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const previewDistance =
    graphPreview?.kind === "response"
      ? clamp(
          graphPreview.point.x,
          LIMITS_CONTINUITY_DISTANCE_MIN,
          LIMITS_CONTINUITY_DISTANCE_MAX,
        )
      : null;
  const livePrimaryParams =
    compare && primaryTarget === "b" ? compare.setupB : compare?.setupA ?? params;
  const primaryParams =
    previewDistance === null
      ? livePrimaryParams
      : { ...livePrimaryParams, approachDistance: previewDistance };
  const secondaryParams =
    compare && primaryTarget === "b" ? compare.setupA : compare?.setupB ?? null;
  const primarySnapshot = sampleLimitsContinuityState(primaryParams);
  const secondarySnapshot = secondaryParams
    ? sampleLimitsContinuityState(secondaryParams)
    : null;
  const primarySegments = sampleLimitsContinuityCurveSegments(primaryParams);
  const secondarySegments = secondaryParams
    ? sampleLimitsContinuityCurveSegments(secondaryParams)
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
  const showSampleMarkers = overlayValues?.sampleMarkers ?? true;
  const showLimitGuide = overlayValues?.limitGuide ?? true;
  const showActualPoint = overlayValues?.actualPoint ?? true;

  const readoutRows = [
    { label: "case", value: primarySnapshot.caseLabel },
    { label: "continuity", value: primarySnapshot.continuityLabel },
    { label: "h", value: formatNumber(primarySnapshot.approachDistance) },
    { label: "left", value: formatNumber(primarySnapshot.leftValue) },
    { label: "right", value: formatNumber(primarySnapshot.rightValue) },
    {
      label: "limit",
      value:
        primarySnapshot.finiteLimitValue !== null
          ? formatNumber(primarySnapshot.finiteLimitValue)
          : primarySnapshot.caseKey === "jump"
            ? "no single L"
            : "no finite L",
    },
    {
      label: "f(0)",
      value:
        primarySnapshot.actualDefined && primarySnapshot.actualValue !== null
          ? formatNumber(primarySnapshot.actualValue)
          : "undefined",
    },
  ];

  const drag = useSvgPointerDrag({
    svgRef,
    width: WIDTH,
    height: HEIGHT,
    onDrag: (_target: "leftSample" | "rightSample", location) => {
      const localX = location.svgX - PLOT_X;
      const nextX = invertCartesianX(PLOT, localX);
      const nextDistance = clamp(
        Math.abs(nextX),
        LIMITS_CONTINUITY_DISTANCE_MIN,
        LIMITS_CONTINUITY_DISTANCE_MAX,
      );

      setParam("approachDistance", Number(nextDistance.toFixed(2)));
    },
  });

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(78,166,223,0.09),rgba(30,166,114,0.08))] px-3 py-2">
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
            <p>Drag either sample point or use the case and distance controls.</p>
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
          <text
            x={projectCartesianX(PLOT, 0)}
            y={projectCartesianY(PLOT, PLOT.maxY) + 18}
            textAnchor="middle"
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            target x = 0
          </text>
          <line
            x1={projectCartesianX(PLOT, 0)}
            x2={projectCartesianX(PLOT, 0)}
            y1={projectCartesianY(PLOT, PLOT.minY)}
            y2={projectCartesianY(PLOT, PLOT.maxY)}
            stroke="rgba(15,28,36,0.18)"
            strokeDasharray="8 7"
          />
          {showLimitGuide && primarySnapshot.finiteLimitValue !== null ? (
            <line
              x1={projectCartesianX(PLOT, PLOT.minX)}
              x2={projectCartesianX(PLOT, PLOT.maxX)}
              y1={projectCartesianY(PLOT, primarySnapshot.finiteLimitValue)}
              y2={projectCartesianY(PLOT, primarySnapshot.finiteLimitValue)}
              stroke="rgba(30,166,114,0.8)"
              strokeDasharray="7 6"
              strokeWidth="2.5"
              opacity={overlayOpacity(focusedOverlayId, "limitGuide")}
            />
          ) : null}
          {secondarySegments.map((segment) => (
            <path
              key={`secondary-${segment.id}`}
              d={buildCartesianPath(PLOT, segment.points)}
              fill="none"
              stroke="rgba(15,28,36,0.42)"
              strokeDasharray="10 8"
              strokeWidth="3"
            />
          ))}
          {primarySegments.map((segment) => (
            <path
              key={segment.id}
              d={buildCartesianPath(PLOT, segment.points)}
              fill="none"
              stroke="#1ea6a2"
              strokeWidth="4"
              strokeLinecap="round"
            />
          ))}
          {secondarySnapshot && showActualPoint && secondarySnapshot.actualDefined && secondarySnapshot.actualValue !== null
            ? filledPoint(0, secondarySnapshot.actualValue, "rgba(15,28,36,0.42)", 5, 0.7)
            : null}
          {secondarySnapshot && showSampleMarkers ? (
            <g opacity={0.45}>
              <line
                x1={projectCartesianX(PLOT, secondarySnapshot.leftX)}
                x2={projectCartesianX(PLOT, 0)}
                y1={projectCartesianY(PLOT, secondarySnapshot.leftValue)}
                y2={projectCartesianY(PLOT, secondarySnapshot.leftValue)}
                stroke="rgba(15,28,36,0.45)"
                strokeDasharray="7 6"
              />
              <line
                x1={projectCartesianX(PLOT, secondarySnapshot.rightX)}
                x2={projectCartesianX(PLOT, 0)}
                y1={projectCartesianY(PLOT, secondarySnapshot.rightValue)}
                y2={projectCartesianY(PLOT, secondarySnapshot.rightValue)}
                stroke="rgba(15,28,36,0.45)"
                strokeDasharray="7 6"
              />
              {filledPoint(
                secondarySnapshot.leftX,
                secondarySnapshot.leftValue,
                "rgba(15,28,36,0.52)",
                4,
                0.75,
              )}
              {filledPoint(
                secondarySnapshot.rightX,
                secondarySnapshot.rightValue,
                "rgba(15,28,36,0.52)",
                4,
                0.75,
              )}
            </g>
          ) : null}
          {showSampleMarkers ? (
            <g opacity={overlayOpacity(focusedOverlayId, "sampleMarkers")}>
              <line
                x1={projectCartesianX(PLOT, primarySnapshot.leftX)}
                x2={projectCartesianX(PLOT, 0)}
                y1={projectCartesianY(PLOT, primarySnapshot.leftValue)}
                y2={projectCartesianY(PLOT, primarySnapshot.leftValue)}
                stroke="rgba(242,164,58,0.8)"
                strokeDasharray="7 6"
              />
              <line
                x1={projectCartesianX(PLOT, primarySnapshot.rightX)}
                x2={projectCartesianX(PLOT, 0)}
                y1={projectCartesianY(PLOT, primarySnapshot.rightValue)}
                y2={projectCartesianY(PLOT, primarySnapshot.rightValue)}
                stroke="rgba(78,166,223,0.8)"
                strokeDasharray="7 6"
              />
              <g
                onPointerDown={(event) =>
                  drag.startDrag(
                    event.pointerId,
                    "leftSample",
                    event.clientX,
                    event.clientY,
                  )
                }
              >
                {filledPoint(primarySnapshot.leftX, primarySnapshot.leftValue, "#f2a43a")}
              </g>
              <g
                onPointerDown={(event) =>
                  drag.startDrag(
                    event.pointerId,
                    "rightSample",
                    event.clientX,
                    event.clientY,
                  )
                }
              >
                {filledPoint(primarySnapshot.rightX, primarySnapshot.rightValue, "#4ea6df")}
              </g>
            </g>
          ) : null}
          {showActualPoint ? (
            <g opacity={overlayOpacity(focusedOverlayId, "actualPoint")}>
              {primarySnapshot.caseKey === "removable-hole" && primarySnapshot.finiteLimitValue !== null
                ? openPoint(0, primarySnapshot.finiteLimitValue, "#1ea672")
                : null}
              {primarySnapshot.caseKey === "jump" && primarySnapshot.leftLimitValue !== null
                ? openPoint(0, primarySnapshot.leftLimitValue, "#f2a43a")
                : null}
              {primarySnapshot.caseKey === "jump" && primarySnapshot.rightLimitValue !== null
                ? openPoint(0, primarySnapshot.rightLimitValue, "#4ea6df")
                : null}
              {primarySnapshot.actualDefined && primarySnapshot.actualValue !== null
                ? filledPoint(0, primarySnapshot.actualValue, "#f16659")
                : (
                  <text
                    x={projectCartesianX(PLOT, 0) + 12}
                    y={projectCartesianY(PLOT, PLOT.maxY) - 12}
                    className="fill-coral-700 text-[11px] font-semibold"
                  >
                    f(0) undefined
                  </text>
                )}
            </g>
          ) : null}
        </g>
        <g transform={`translate(${LEGEND_X} ${LEGEND_Y})`}>
          <text className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]">
            Visual cues
          </text>
          <line x1="0" x2="24" y1="18" y2="18" stroke="#1ea6a2" strokeWidth="4" />
          <text x="32" y="22" className="fill-ink-700 text-[11px]">
            Active graph
          </text>
          <circle cx="12" cy="40" r="6" fill="#f2a43a" stroke="rgba(255,255,255,0.92)" strokeWidth="2" />
          <text x="32" y="44" className="fill-ink-700 text-[11px]">
            From the left
          </text>
          <circle cx="12" cy="62" r="6" fill="#4ea6df" stroke="rgba(255,255,255,0.92)" strokeWidth="2" />
          <text x="32" y="66" className="fill-ink-700 text-[11px]">
            From the right
          </text>
          <line x1="0" x2="24" y1="84" y2="84" stroke="#1ea672" strokeWidth="2.5" strokeDasharray="7 6" />
          <text x="32" y="88" className="fill-ink-700 text-[11px]">
            Finite limit
          </text>
          <circle cx="12" cy="106" r="6" fill="#f16659" stroke="rgba(255,255,255,0.92)" strokeWidth="2" />
          <text x="32" y="110" className="fill-ink-700 text-[11px]">
            Actual f(0)
          </text>
          {secondarySnapshot ? (
            <>
              <line
                x1="0"
                x2="24"
                y1="128"
                y2="128"
                stroke="rgba(15,28,36,0.42)"
                strokeWidth="3"
                strokeDasharray="10 8"
              />
              <text x="32" y="132" className="fill-ink-700 text-[11px]">
                {secondaryLabel} curve
              </text>
            </>
          ) : null}
        </g>
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Approach readout"
          setupLabel={compare ? primaryLabel : null}
          rows={readoutRows}
          noteLines={noteLinesForCase(primarySnapshot)}
        />
      </svg>
    </section>
  );
}
