"use client";

import { useMemo, useRef } from "react";
import {
  clamp,
  derivativeSlopeCurve,
  formatNumber,
  mapRange,
  resolveDerivativeSlopeParams,
  sampleDerivativeSlopeState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { sampleRange } from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import { useSvgPointerDrag } from "./primitives/useSvgPointerDrag";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type DerivativeSlopeSimulationProps = {
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
const PLOT_LEFT = 56;
const PLOT_RIGHT = 642;
const PLOT_TOP = 28;
const PLOT_BOTTOM = 304;
const DOMAIN_MIN = -3.8;
const DOMAIN_MAX = 3.8;
const Y_MIN = -6.6;
const Y_MAX = 6.6;
const CARD_WIDTH = 192;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const GRID_TICKS = [-3, -1, 0, 1, 3];

function buildPath(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) => {
      const svgX = mapRange(point.x, DOMAIN_MIN, DOMAIN_MAX, PLOT_LEFT, PLOT_RIGHT);
      const svgY = mapRange(point.y, Y_MIN, Y_MAX, PLOT_BOTTOM, PLOT_TOP);
      return `${index === 0 ? "M" : "L"} ${svgX.toFixed(2)} ${svgY.toFixed(2)}`;
    })
    .join(" ");
}

function projectX(x: number) {
  return mapRange(x, DOMAIN_MIN, DOMAIN_MAX, PLOT_LEFT, PLOT_RIGHT);
}

function projectY(y: number) {
  return mapRange(y, Y_MIN, Y_MAX, PLOT_BOTTOM, PLOT_TOP);
}

function svgXToDomain(svgX: number) {
  return mapRange(svgX, PLOT_LEFT, PLOT_RIGHT, DOMAIN_MIN, DOMAIN_MAX);
}

function overlayOpacity(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.35;
}

export function DerivativeSlopeSimulation({
  concept,
  params,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: DerivativeSlopeSimulationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const primaryTarget = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const primaryParams =
    compare && primaryTarget === "b" ? compare.setupB : compare?.setupA ?? params;
  const secondaryParams =
    compare && primaryTarget === "b" ? compare.setupA : compare?.setupB ?? null;
  const primarySnapshot = sampleDerivativeSlopeState(primaryParams);
  const secondarySnapshot = secondaryParams
    ? sampleDerivativeSlopeState(secondaryParams)
    : null;
  const curvePath = useMemo(
    () =>
      buildPath(
        sampleRange(DOMAIN_MIN, DOMAIN_MAX, 241).map((x) => ({
          x,
          y: derivativeSlopeCurve(x),
        })),
      ),
    [],
  );
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
  const showTangentLine = overlayValues?.tangentLine ?? true;
  const showSlopeGuide = overlayValues?.slopeGuide ?? true;
  const showDeltaGuide = overlayValues?.deltaGuide ?? true;

  const readoutRows = useMemo(
    () => [
      { label: "x", value: formatNumber(primarySnapshot.pointX) },
      { label: "f(x)", value: formatNumber(primarySnapshot.pointY) },
      { label: "f'(x)", value: formatNumber(primarySnapshot.slope) },
      { label: "delta x", value: formatNumber(primarySnapshot.deltaX) },
      { label: "secant", value: formatNumber(primarySnapshot.secantSlope) },
    ],
    [primarySnapshot],
  );

  const drag = useSvgPointerDrag({
    svgRef,
    width: WIDTH,
    height: HEIGHT,
    onDrag: (target: "point" | "secant", location) => {
      const nextX = clamp(svgXToDomain(location.svgX), DOMAIN_MIN, DOMAIN_MAX);

      if (target === "point") {
        setParam("pointX", Number(nextX.toFixed(2)));
        return;
      }

      const resolved = resolveDerivativeSlopeParams(primaryParams);
      const nextDeltaX = clamp(nextX - resolved.pointX, 0.15, 2);
      setParam("deltaX", Number(nextDeltaX.toFixed(2)));
    },
  });

  function tangentLine(snapshot: typeof primarySnapshot) {
    const leftY = snapshot.pointY + snapshot.slope * (DOMAIN_MIN - snapshot.pointX);
    const rightY = snapshot.pointY + snapshot.slope * (DOMAIN_MAX - snapshot.pointX);

    return {
      x1: projectX(DOMAIN_MIN),
      y1: projectY(leftY),
      x2: projectX(DOMAIN_MAX),
      y2: projectY(rightY),
    };
  }

  function secantLine(snapshot: typeof primarySnapshot) {
    return {
      x1: projectX(snapshot.pointX),
      y1: projectY(snapshot.pointY),
      x2: projectX(snapshot.secantX),
      y2: projectY(snapshot.secantY),
    };
  }

  const primaryTangent = tangentLine(primarySnapshot);
  const secondaryTangent = secondarySnapshot ? tangentLine(secondarySnapshot) : null;
  const primarySecant = secantLine(primarySnapshot);
  const secondarySecant = secondarySnapshot ? secantLine(secondarySnapshot) : null;

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(240,171,60,0.08),rgba(78,166,223,0.08))] px-3 py-2">
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
            <p>Drag the curve point or secant handle to inspect how local slope changes.</p>
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
        {GRID_TICKS.map((tick) => (
          <g key={`grid-${tick}`}>
            <line
              x1={projectX(tick)}
              x2={projectX(tick)}
              y1={PLOT_TOP}
              y2={PLOT_BOTTOM}
              stroke="rgba(15,28,36,0.08)"
            />
            <line
              x1={PLOT_LEFT}
              x2={PLOT_RIGHT}
              y1={projectY(tick)}
              y2={projectY(tick)}
              stroke="rgba(15,28,36,0.08)"
            />
            <text
              x={projectX(tick)}
              y={PLOT_BOTTOM + 16}
              textAnchor="middle"
              className="fill-ink-500 text-[11px]"
            >
              {formatNumber(tick)}
            </text>
            {tick !== 0 ? (
              <text
                x={PLOT_LEFT - 10}
                y={projectY(tick) + 4}
                textAnchor="end"
                className="fill-ink-500 text-[11px]"
              >
                {formatNumber(tick)}
              </text>
            ) : null}
          </g>
        ))}
        <line
          x1={PLOT_LEFT}
          x2={PLOT_RIGHT}
          y1={projectY(0)}
          y2={projectY(0)}
          stroke="rgba(15,28,36,0.34)"
          strokeWidth="2"
        />
        <line
          x1={projectX(0)}
          x2={projectX(0)}
          y1={PLOT_TOP}
          y2={PLOT_BOTTOM}
          stroke="rgba(15,28,36,0.34)"
          strokeWidth="2"
        />
        <g transform={`translate(${PLOT_LEFT + 12} ${PLOT_TOP + 18})`}>
          <line x1="0" x2="22" y1="0" y2="0" stroke="#315063" strokeWidth="3.5" />
          <text x="28" y="4" className="fill-ink-600 text-[11px] font-semibold">
            Curve
          </text>
          {showTangentLine ? (
            <>
              <line x1="0" x2="22" y1="18" y2="18" stroke="#1ea6a2" strokeWidth="3.5" />
              <text x="28" y="22" className="fill-teal-700 text-[11px] font-semibold">
                Tangent slope
              </text>
            </>
          ) : null}
          {primarySnapshot.showSecant ? (
            <>
              <line x1="0" x2="22" y1="36" y2="36" stroke="#f16659" strokeWidth="3.2" />
              <text x="28" y="40" className="fill-coral-700 text-[11px] font-semibold">
                Secant slope
              </text>
            </>
          ) : null}
        </g>
        <path
          d={curvePath}
          fill="none"
          stroke="#315063"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {secondaryTangent ? (
          <line
            x1={secondaryTangent.x1}
            y1={secondaryTangent.y1}
            x2={secondaryTangent.x2}
            y2={secondaryTangent.y2}
            stroke="rgba(15,28,36,0.45)"
            strokeDasharray="10 8"
            strokeWidth="3"
          />
        ) : null}
        {showTangentLine ? (
          <g opacity={overlayOpacity(focusedOverlayId, "tangentLine")}>
            <line
              x1={primaryTangent.x1}
              y1={primaryTangent.y1}
              x2={primaryTangent.x2}
              y2={primaryTangent.y2}
              stroke="#1ea6a2"
              strokeWidth="3.5"
            />
            <text
              x={PLOT_RIGHT - 8}
              y={projectY(primarySnapshot.pointY + primarySnapshot.slope * (DOMAIN_MAX - primarySnapshot.pointX)) - 8}
              textAnchor="end"
              className="fill-teal-700 text-[11px] font-semibold"
            >
              tangent slope
            </text>
          </g>
        ) : null}
        {showDeltaGuide && secondarySecant ? (
          <line
            x1={secondarySecant.x1}
            y1={secondarySecant.y1}
            x2={secondarySecant.x2}
            y2={secondarySecant.y2}
            stroke="rgba(15,28,36,0.4)"
            strokeDasharray="10 8"
            strokeWidth="3"
          />
        ) : null}
        {showDeltaGuide && primarySnapshot.showSecant ? (
          <g opacity={overlayOpacity(focusedOverlayId, "deltaGuide")}>
            <line
              x1={primarySecant.x1}
              y1={primarySecant.y1}
              x2={primarySecant.x2}
              y2={primarySecant.y2}
              stroke="#f16659"
              strokeWidth="3.2"
            />
            <text
              x={(primarySecant.x1 + primarySecant.x2) / 2}
              y={(primarySecant.y1 + primarySecant.y2) / 2 - 10}
              textAnchor="middle"
              className="fill-coral-700 text-[11px] font-semibold"
            >
              average slope
            </text>
          </g>
        ) : null}
        {showSlopeGuide ? (
          <g opacity={overlayOpacity(focusedOverlayId, "slopeGuide")}>
            <line
              x1={projectX(primarySnapshot.pointX)}
              x2={projectX(primarySnapshot.secantX)}
              y1={projectY(primarySnapshot.pointY)}
              y2={projectY(primarySnapshot.pointY)}
              stroke="rgba(78,166,223,0.84)"
              strokeDasharray="7 6"
              strokeWidth="2.5"
            />
            <line
              x1={projectX(primarySnapshot.secantX)}
              x2={projectX(primarySnapshot.secantX)}
              y1={projectY(primarySnapshot.pointY)}
              y2={projectY(primarySnapshot.secantY)}
              stroke="rgba(240,171,60,0.84)"
              strokeDasharray="7 6"
              strokeWidth="2.5"
            />
            <text
              x={(projectX(primarySnapshot.pointX) + projectX(primarySnapshot.secantX)) / 2}
              y={projectY(primarySnapshot.pointY) - 10}
              textAnchor="middle"
              className="fill-sky-700 text-[11px] font-semibold"
            >
              delta x = {formatNumber(primarySnapshot.deltaX)}
            </text>
            <text
              x={projectX(primarySnapshot.secantX) + 10}
              y={(projectY(primarySnapshot.pointY) + projectY(primarySnapshot.secantY)) / 2}
              className="fill-amber-700 text-[11px] font-semibold"
            >
              delta y = {formatNumber(primarySnapshot.secantY - primarySnapshot.pointY)}
            </text>
          </g>
        ) : null}
        {secondarySnapshot ? (
          <circle
            cx={projectX(secondarySnapshot.pointX)}
            cy={projectY(secondarySnapshot.pointY)}
            r="6"
            fill="rgba(15,28,36,0.45)"
          />
        ) : null}
        <circle
          cx={projectX(primarySnapshot.pointX)}
          cy={projectY(primarySnapshot.pointY)}
          r={drag.activePointerId === null ? 8 : 10}
          fill="#1ea6a2"
          stroke="rgba(255,255,255,0.94)"
          strokeWidth="3"
          style={{ cursor: "grab" }}
          onPointerDown={(event) =>
            drag.startDrag(event.pointerId, "point", event.clientX, event.clientY)
          }
        />
        {primarySnapshot.showSecant ? (
          <circle
            cx={projectX(primarySnapshot.secantX)}
            cy={projectY(primarySnapshot.secantY)}
            r="7"
            fill="#f16659"
            stroke="rgba(255,255,255,0.94)"
            strokeWidth="3"
            style={{ cursor: "grab" }}
            onPointerDown={(event) =>
              drag.startDrag(event.pointerId, "secant", event.clientX, event.clientY)
            }
          />
        ) : null}
        <text
          x={projectX(primarySnapshot.pointX)}
          y={projectY(primarySnapshot.pointY) - 14}
          textAnchor="middle"
          className="fill-teal-700 text-[11px] font-semibold"
        >
          {primaryLabel}
        </text>
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Local rate"
          setupLabel={primaryLabel}
          rows={readoutRows}
          noteLines={[
            Math.abs(primarySnapshot.slope) <= 0.08
              ? "The tangent is nearly flat here."
              : primarySnapshot.slope > 0
                ? "Positive slope means the curve is rising locally."
                : "Negative slope means the curve is falling locally.",
            primarySnapshot.showSecant
              ? "The secant gives the average rate over this interval. Shrink delta x to bring it closer to the tangent slope."
              : "Turn the secant back on to compare average and instantaneous rate.",
          ]}
        />
      </svg>
    </section>
  );
}
