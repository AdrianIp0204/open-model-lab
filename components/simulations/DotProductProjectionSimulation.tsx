"use client";

import { useRef } from "react";
import {
  buildDotProductProjectionPreviewState,
  clamp,
  DOT_PRODUCT_PROJECTION_COMPONENT_MAX,
  DOT_PRODUCT_PROJECTION_COMPONENT_MIN,
  formatNumber,
  resolveDotProductProjectionViewport,
  sampleDotProductProjectionState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import {
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

type DotProductProjectionSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type DragTarget = "vector-a" | "vector-b";

const WIDTH = 840;
const HEIGHT = 356;
const PLANE_X = 20;
const PLANE_Y = 24;
const CARD_X = 588;
const CARD_Y = 170;
const CARD_WIDTH = 236;

function overlayOpacity(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.34;
}

function buildPlaneConfig(maxAbsCoordinate: number): CartesianPlaneConfig {
  return {
    width: 548,
    height: 300,
    paddingLeft: 42,
    paddingRight: 16,
    paddingTop: 18,
    paddingBottom: 28,
    minX: -maxAbsCoordinate,
    maxX: maxAbsCoordinate,
    minY: -maxAbsCoordinate,
    maxY: maxAbsCoordinate,
    xTickStep: 2,
    yTickStep: 2,
  };
}

function invertCartesianX(config: CartesianPlaneConfig, svgX: number) {
  const usableWidth = config.width - config.paddingLeft - config.paddingRight;
  const clampedX = clamp(svgX, config.paddingLeft, config.width - config.paddingRight);

  return (
    config.minX +
    ((clampedX - config.paddingLeft) / Math.max(usableWidth, Number.EPSILON)) *
      (config.maxX - config.minX)
  );
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

function roundToTenth(value: number) {
  return Number(value.toFixed(1));
}

function getLineLabelPosition(start: { x: number; y: number }, end: { x: number; y: number }) {
  return {
    x: start.x + (end.x - start.x) * 0.56,
    y: start.y + (end.y - start.y) * 0.56,
  };
}

function normalizeAngleDelta(value: number) {
  let normalized = value % 360;

  if (normalized <= -180) {
    normalized += 360;
  }

  if (normalized > 180) {
    normalized -= 360;
  }

  return normalized;
}

function polarToSvgPoint(
  centerX: number,
  centerY: number,
  radius: number,
  angleDegrees: number,
) {
  const radians = (angleDegrees * Math.PI) / 180;

  return {
    x: centerX + Math.cos(radians) * radius,
    y: centerY - Math.sin(radians) * radius,
  };
}

function buildAngleArcPath(
  centerX: number,
  centerY: number,
  startAngle: number,
  endAngle: number,
  radius: number,
) {
  const delta = normalizeAngleDelta(endAngle - startAngle);
  const segments = Math.max(8, Math.ceil(Math.abs(delta) / 12));

  return Array.from({ length: segments + 1 }, (_, index) => {
    const angle = startAngle + (delta * index) / segments;
    const point = polarToSvgPoint(centerX, centerY, radius, angle);
    return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
  }).join(" ");
}

function buildRightAngleMarkerPath(
  origin: { x: number; y: number },
  angleA: number,
  signedAngleBetween: number,
  size: number,
) {
  const normalAngle = angleA + (signedAngleBetween >= 0 ? 90 : -90);
  const p1 = polarToSvgPoint(origin.x, origin.y, size, angleA);
  const p3 = polarToSvgPoint(origin.x, origin.y, size, normalAngle);

  const p2 = {
    x: p1.x + (p3.x - origin.x),
    y: p1.y + (p3.y - origin.y),
  };

  return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`;
}

export function DotProductProjectionSimulation({
  concept,
  params,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: DotProductProjectionSimulationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const primaryTarget = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const previewAngle = graphPreview?.kind === "response" ? graphPreview.point.x : null;
  const livePrimaryParams =
    compare && primaryTarget === "b" ? compare.setupB : compare?.setupA ?? params;
  const primarySnapshot =
    previewAngle === null
      ? sampleDotProductProjectionState(livePrimaryParams)
      : buildDotProductProjectionPreviewState(livePrimaryParams, previewAngle);
  const secondaryParams =
    compare && primaryTarget === "b" ? compare.setupA : compare?.setupB ?? null;
  const secondarySnapshot = secondaryParams
    ? sampleDotProductProjectionState(secondaryParams)
    : null;
  const viewport = resolveDotProductProjectionViewport(
    secondaryParams ? [livePrimaryParams, secondaryParams] : [livePrimaryParams],
  );
  const plane = buildPlaneConfig(viewport.maxAbsCoordinate);
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
  const showAngleMarker = overlayValues?.angleMarker ?? true;
  const showProjectionGuide = overlayValues?.projectionGuide ?? true;
  const dotSignClass =
    primarySnapshot.alignmentLabel === "positive"
      ? "fill-teal-700 text-[12px] font-semibold"
      : primarySnapshot.alignmentLabel === "negative"
        ? "fill-coral-700 text-[12px] font-semibold"
        : "fill-sky-700 text-[12px] font-semibold";
  const projectionClass =
    primarySnapshot.projectionScalar >= 0.08
      ? "fill-amber-700 text-[12px] font-semibold"
      : primarySnapshot.projectionScalar <= -0.08
        ? "fill-coral-700 text-[12px] font-semibold"
        : "fill-sky-700 text-[12px] font-semibold";

  const origin = {
    x: projectCartesianX(plane, 0),
    y: projectCartesianY(plane, 0),
  };
  const vectorAEnd = {
    x: projectCartesianX(plane, primarySnapshot.ax),
    y: projectCartesianY(plane, primarySnapshot.ay),
  };
  const vectorBEnd = {
    x: projectCartesianX(plane, primarySnapshot.bx),
    y: projectCartesianY(plane, primarySnapshot.by),
  };
  const projectionEnd = {
    x: projectCartesianX(plane, primarySnapshot.projectionX),
    y: projectCartesianY(plane, primarySnapshot.projectionY),
  };
  const vectorALabel = getLineLabelPosition(origin, vectorAEnd);
  const vectorBLabel = getLineLabelPosition(origin, vectorBEnd);
  const projectionLabel = getLineLabelPosition(origin, projectionEnd);
  const angleLabel = polarToSvgPoint(
    origin.x,
    origin.y,
    42,
    primarySnapshot.angleA + primarySnapshot.signedAngleBetween / 2,
  );
  const arcPath = buildAngleArcPath(
    origin.x,
    origin.y,
    primarySnapshot.angleA,
    primarySnapshot.angleA + primarySnapshot.signedAngleBetween,
    30,
  );
  const rightAngleMarkerPath =
    Math.abs(primarySnapshot.angleBetween - 90) <= 3 &&
    primarySnapshot.magnitudeA > 0.2 &&
    primarySnapshot.magnitudeB > 0.2
      ? buildRightAngleMarkerPath(
          origin,
          primarySnapshot.angleA,
          primarySnapshot.signedAngleBetween,
          12,
        )
      : null;
  const secondaryAEnd = secondarySnapshot
    ? {
        x: projectCartesianX(plane, secondarySnapshot.ax),
        y: projectCartesianY(plane, secondarySnapshot.ay),
      }
    : null;
  const secondaryBEnd = secondarySnapshot
    ? {
        x: projectCartesianX(plane, secondarySnapshot.bx),
        y: projectCartesianY(plane, secondarySnapshot.by),
      }
    : null;
  const secondaryProjectionEnd = secondarySnapshot
    ? {
        x: projectCartesianX(plane, secondarySnapshot.projectionX),
        y: projectCartesianY(plane, secondarySnapshot.projectionY),
      }
    : null;
  const readoutRows = [
    {
      label: "A",
      value: `<${formatNumber(primarySnapshot.ax)}, ${formatNumber(primarySnapshot.ay)}>`,
    },
    {
      label: "B",
      value: `<${formatNumber(primarySnapshot.bx)}, ${formatNumber(primarySnapshot.by)}>`,
    },
    {
      label: "theta",
      value: `${formatNumber(primarySnapshot.angleBetween)} deg`,
    },
    {
      label: "A dot B",
      value: formatNumber(primarySnapshot.dotProduct),
      valueClassName: dotSignClass,
    },
    {
      label: "comp_A(B)",
      value: formatNumber(primarySnapshot.projectionScalar),
      valueClassName: projectionClass,
    },
    {
      label: "proj_A(B)",
      value: `<${formatNumber(primarySnapshot.projectionX)}, ${formatNumber(primarySnapshot.projectionY)}>`,
      valueClassName: "fill-amber-700 text-[12px] font-semibold",
    },
  ];
  const noteLines =
    primarySnapshot.magnitudeA <= 0.08
      ? [
          "A is nearly zero, so the along-A direction has collapsed.",
          "A dot B = |A| * comp_A(B).",
        ]
      : primarySnapshot.alignmentLabel === "positive"
        ? [
            "Positive dot: B keeps an along-A part in A's direction.",
            "A dot B = |A| * comp_A(B).",
          ]
        : primarySnapshot.alignmentLabel === "negative"
          ? [
              "Negative dot: B points partly against A.",
              "A dot B = |A| * comp_A(B).",
            ]
          : [
              "Near-zero dot: the vectors are nearly orthogonal.",
              "The along-A projection has almost collapsed.",
            ];

  const drag = useSvgPointerDrag({
    svgRef,
    width: WIDTH,
    height: HEIGHT,
    onDrag: (target: DragTarget, location) => {
      const localX = location.svgX - PLANE_X;
      const localY = location.svgY - PLANE_Y;
      const nextX = roundToTenth(
        clamp(
          invertCartesianX(plane, localX),
          DOT_PRODUCT_PROJECTION_COMPONENT_MIN,
          DOT_PRODUCT_PROJECTION_COMPONENT_MAX,
        ),
      );
      const nextY = roundToTenth(
        clamp(
          invertCartesianY(plane, localY),
          DOT_PRODUCT_PROJECTION_COMPONENT_MIN,
          DOT_PRODUCT_PROJECTION_COMPONENT_MAX,
        ),
      );

      if (target === "vector-a") {
        setParam("ax", nextX);
        setParam("ay", nextY);
        return;
      }

      setParam("bx", nextX);
      setParam("by", nextY);
    },
  });

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(240,171,60,0.08),rgba(30,166,162,0.08))] px-3 py-2">
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
            <p>Drag A and B on the plane. The amber guide is the projection of B onto A.</p>
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
        <defs>
          <marker
            id="dot-product-a-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#1ea6a2" />
          </marker>
          <marker
            id="dot-product-b-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f16659" />
          </marker>
          <marker
            id="dot-product-projection-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f0ab3c" />
          </marker>
          <marker
            id="dot-product-ghost-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(15,28,36,0.48)" />
          </marker>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.58)" />
        <g transform={`translate(${PLANE_X} ${PLANE_Y})`}>
          <CartesianPlane
            config={plane}
            xLabel="x"
            yLabel="y"
            backgroundFill="rgba(255,255,255,0.7)"
          />
          {secondaryAEnd && secondaryBEnd ? (
            <g opacity="0.56">
              <line
                x1={origin.x}
                x2={secondaryAEnd.x}
                y1={origin.y}
                y2={secondaryAEnd.y}
                stroke="rgba(15,28,36,0.46)"
                strokeDasharray="8 7"
                strokeWidth="3"
                markerEnd="url(#dot-product-ghost-arrow)"
              />
              <line
                x1={origin.x}
                x2={secondaryBEnd.x}
                y1={origin.y}
                y2={secondaryBEnd.y}
                stroke="rgba(15,28,36,0.46)"
                strokeDasharray="8 7"
                strokeWidth="3"
                markerEnd="url(#dot-product-ghost-arrow)"
              />
              {secondaryProjectionEnd ? (
                <line
                  x1={origin.x}
                  x2={secondaryProjectionEnd.x}
                  y1={origin.y}
                  y2={secondaryProjectionEnd.y}
                  stroke="rgba(15,28,36,0.38)"
                  strokeDasharray="6 6"
                  strokeWidth="2.6"
                />
              ) : null}
            </g>
          ) : null}
          <line
            x1={origin.x}
            x2={vectorAEnd.x}
            y1={origin.y}
            y2={vectorAEnd.y}
            stroke="#1ea6a2"
            strokeWidth="4.2"
            markerEnd="url(#dot-product-a-arrow)"
          />
          <text
            x={vectorALabel.x + 10}
            y={vectorALabel.y - 10}
            className="fill-teal-700 text-[11px] font-semibold"
          >
            A
          </text>
          <line
            x1={origin.x}
            x2={vectorBEnd.x}
            y1={origin.y}
            y2={vectorBEnd.y}
            stroke="#f16659"
            strokeWidth="4"
            markerEnd="url(#dot-product-b-arrow)"
          />
          <text
            x={vectorBLabel.x + 10}
            y={vectorBLabel.y + 12}
            className="fill-coral-700 text-[11px] font-semibold"
          >
            B
          </text>
          {showProjectionGuide ? (
            <g opacity={overlayOpacity(focusedOverlayId, "projectionGuide")}>
              <line
                x1={origin.x}
                x2={projectionEnd.x}
                y1={origin.y}
                y2={projectionEnd.y}
                stroke="#f0ab3c"
                strokeWidth="4"
                markerEnd="url(#dot-product-projection-arrow)"
              />
              <line
                x1={projectionEnd.x}
                x2={vectorBEnd.x}
                y1={projectionEnd.y}
                y2={vectorBEnd.y}
                stroke="#4ea6df"
                strokeDasharray="7 6"
                strokeWidth="2.8"
              />
              <circle cx={projectionEnd.x} cy={projectionEnd.y} r="4.5" fill="#f0ab3c" />
              <text
                x={projectionLabel.x + 10}
                y={projectionLabel.y - 8}
                className="fill-amber-700 text-[11px] font-semibold"
              >
                proj_A(B)
              </text>
            </g>
          ) : null}
          {showAngleMarker ? (
            <g opacity={overlayOpacity(focusedOverlayId, "angleMarker")}>
              <path d={arcPath} fill="none" stroke="#f16659" strokeWidth="2.4" />
              <text
                x={angleLabel.x + 6}
                y={angleLabel.y - 2}
                className="fill-coral-700 text-[11px] font-semibold"
              >
                theta = {formatNumber(primarySnapshot.angleBetween)} deg
              </text>
              {rightAngleMarkerPath ? (
                <path
                  d={rightAngleMarkerPath}
                  fill="none"
                  stroke="#4ea6df"
                  strokeWidth="2.2"
                />
              ) : null}
            </g>
          ) : null}
          <circle
            cx={vectorAEnd.x}
            cy={vectorAEnd.y}
            r={drag.activePointerId === null ? 8 : 10}
            fill="#1ea6a2"
            stroke="rgba(255,255,255,0.94)"
            strokeWidth="3"
            style={{ cursor: "grab" }}
            onPointerDown={(event) =>
              drag.startDrag(event.pointerId, "vector-a", event.clientX, event.clientY)
            }
          />
          <circle
            cx={vectorBEnd.x}
            cy={vectorBEnd.y}
            r={drag.activePointerId === null ? 8 : 10}
            fill="#f16659"
            stroke="rgba(255,255,255,0.94)"
            strokeWidth="3"
            style={{ cursor: "grab" }}
            onPointerDown={(event) =>
              drag.startDrag(event.pointerId, "vector-b", event.clientX, event.clientY)
            }
          />
        </g>
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Alignment readout"
          setupLabel={primaryLabel}
          rows={readoutRows}
          noteLines={noteLines}
        />
      </svg>
    </section>
  );
}
