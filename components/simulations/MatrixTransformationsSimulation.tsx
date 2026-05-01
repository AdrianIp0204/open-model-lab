"use client";

import { useRef } from "react";
import { useLocale } from "next-intl";
import {
  buildMatrixGridLine,
  clamp,
  formatNumber,
  MATRIX_TRANSFORMATIONS_BLEND_MAX,
  MATRIX_TRANSFORMATIONS_BLEND_MIN,
  MATRIX_TRANSFORMATIONS_GRID_EXTENT,
  MATRIX_TRANSFORMATIONS_PROBE_POINT,
  MATRIX_TRANSFORMATIONS_SAMPLE_SHAPE,
  MATRIX_TRANSFORMATIONS_UNIT_SQUARE,
  MATRIX_TRANSFORMATIONS_ENTRY_MAX,
  MATRIX_TRANSFORMATIONS_ENTRY_MIN,
  resolveMatrixTransformationsViewport,
  sampleMatrixTransformationsState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import type { AppLocale } from "@/i18n/routing";
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

type MatrixTransformationsSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type DragTarget = "basis-1" | "basis-2";

const WIDTH = 890;
const HEIGHT = 372;
const PLANE_X = 20;
const PLANE_Y = 22;
const CARD_X = 634;
const CARD_Y = 22;
const CARD_WIDTH = 236;

function getMatrixTransformationsCopy(locale: AppLocale) {
  if (locale === "zh-HK") {
    return {
      title: "矩陣變換",
      description:
        "直接拖曳 e1 與 e2 的像，或直接編輯矩陣元素。網格、單位正方形與樣本三角形都服從同一個 2×2 平面作用。",
      preview: "預覽 t =",
      variant: "變化版本",
      baseline: "基準版本",
      live: "即時",
      columnChip: "各欄就是 e1 與 e2 的像",
      readoutTitle: "矩陣作用",
      orientationFlipped: "方向已翻轉：這個作用包含一次反射。",
      orientationKept: "方向保持：這個作用尚未把平面反射過去。",
      shearStrong: "非對角元素令網格傾斜，因此這個作用包含剪切。",
      shearSmall: "非對角元素仍然很小，因此這個作用主要是拉伸或壓縮。",
    };
  }

  return {
    title: "Matrix transformations",
    description:
      "Drag the images of e1 and e2 or edit the matrix entries directly. The grid, the unit square, and the sample triangle all follow the same 2 by 2 action on the plane.",
    preview: "Preview t =",
    variant: "Variant",
    baseline: "Baseline",
    live: "Live",
    columnChip: "columns = images of e1 and e2",
    readoutTitle: "Matrix action",
    orientationFlipped: "Orientation flipped: this action includes a reflection.",
    orientationKept: "Orientation kept: this action has not reflected the plane.",
    shearStrong: "Off-axis entries lean the grid, so the action includes shear.",
    shearSmall: "Off-axis entries stay small, so the action is mostly stretch or compression.",
  };
}

function buildPlaneConfig(maxAbsCoordinate: number): CartesianPlaneConfig {
  return {
    width: 590,
    height: 320,
    paddingLeft: 44,
    paddingRight: 18,
    paddingTop: 18,
    paddingBottom: 30,
    minX: -maxAbsCoordinate,
    maxX: maxAbsCoordinate,
    minY: -maxAbsCoordinate,
    maxY: maxAbsCoordinate,
    xTickStep: 1,
    yTickStep: 1,
  };
}

function overlayOpacity(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.34;
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

function buildClosedPath(config: CartesianPlaneConfig, points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) => {
      const prefix = index === 0 ? "M" : "L";
      return `${prefix} ${projectCartesianX(config, point.x)} ${projectCartesianY(config, point.y)}`;
    })
    .concat("Z")
    .join(" ");
}

function formatPair(x: number, y: number) {
  return `<${formatNumber(x)}, ${formatNumber(y)}>`;
}

export function MatrixTransformationsSimulation({
  concept,
  params,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: MatrixTransformationsSimulationProps) {
  const locale = useLocale() as AppLocale;
  const copy = getMatrixTransformationsCopy(locale);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const primaryTarget = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const previewBlend =
    graphPreview?.kind === "response"
      ? clamp(graphPreview.point.x, MATRIX_TRANSFORMATIONS_BLEND_MIN, MATRIX_TRANSFORMATIONS_BLEND_MAX)
      : null;
  const livePrimaryParams =
    compare && primaryTarget === "b" ? compare.setupB : compare?.setupA ?? params;
  const primaryParams =
    previewBlend === null ? livePrimaryParams : { ...livePrimaryParams, blend: previewBlend };
  const secondaryParams =
    compare && primaryTarget === "b" ? compare.setupA : compare?.setupB ?? null;
  const primary = sampleMatrixTransformationsState(primaryParams);
  const secondary = secondaryParams ? sampleMatrixTransformationsState(secondaryParams) : null;
  const viewport = resolveMatrixTransformationsViewport(
    secondaryParams ? [primaryParams, secondaryParams] : [primaryParams],
  );
  const plane = buildPlaneConfig(viewport.maxAbsCoordinate);
  const previewLabel =
    graphPreview?.kind === "response" ? `${copy.preview} ${formatNumber(graphPreview.point.x)}` : null;
  const primaryLabel = compare
    ? primaryTarget === "b"
      ? compare.labelB ?? copy.variant
      : compare.labelA ?? copy.baseline
    : copy.live;
  const secondaryLabel = compare
    ? primaryTarget === "b"
      ? compare.labelA ?? copy.baseline
      : compare.labelB ?? copy.variant
    : null;
  const showReferenceGrid = overlayValues?.referenceGrid ?? true;
  const showBasisVectors = overlayValues?.basisVectors ?? true;
  const showUnitSquare = overlayValues?.unitSquare ?? true;
  const showSampleShape = overlayValues?.sampleShape ?? true;
  const origin = {
    x: projectCartesianX(plane, 0),
    y: projectCartesianY(plane, 0),
  };
  const basis1End = {
    x: projectCartesianX(plane, primary.basis1X),
    y: projectCartesianY(plane, primary.basis1Y),
  };
  const basis2End = {
    x: projectCartesianX(plane, primary.basis2X),
    y: projectCartesianY(plane, primary.basis2Y),
  };
  const probeBase = {
    x: projectCartesianX(plane, MATRIX_TRANSFORMATIONS_PROBE_POINT.x),
    y: projectCartesianY(plane, MATRIX_TRANSFORMATIONS_PROBE_POINT.y),
  };
  const probeImage = {
    x: projectCartesianX(plane, primary.probeX),
    y: projectCartesianY(plane, primary.probeY),
  };
  const secondaryBasis1End = secondary
    ? {
        x: projectCartesianX(plane, secondary.basis1X),
        y: projectCartesianY(plane, secondary.basis1Y),
      }
    : null;
  const secondaryBasis2End = secondary
    ? {
        x: projectCartesianX(plane, secondary.basis2X),
        y: projectCartesianY(plane, secondary.basis2Y),
      }
    : null;
  const readoutRows = [
    { label: "M e1", value: formatPair(primary.basis1X, primary.basis1Y) },
    { label: "M e2", value: formatPair(primary.basis2X, primary.basis2Y) },
    { label: "M p", value: formatPair(primary.probeX, primary.probeY) },
    { label: "|M e1|", value: formatNumber(primary.basis1Length) },
    { label: "|M e2|", value: formatNumber(primary.basis2Length) },
  ];
  const shearStrength = Math.max(Math.abs(primary.m12), Math.abs(primary.m21));
  const noteLines = [
    `M = [[${formatNumber(primary.m11)}, ${formatNumber(primary.m12)}], [${formatNumber(primary.m21)}, ${formatNumber(primary.m22)}]]`,
    primary.orientationFlipped ? copy.orientationFlipped : copy.orientationKept,
    shearStrength >= 0.18 ? copy.shearStrong : copy.shearSmall,
  ];

  const transformedGridLines = Array.from(
    { length: MATRIX_TRANSFORMATIONS_GRID_EXTENT * 2 + 1 },
    (_, index) => index - MATRIX_TRANSFORMATIONS_GRID_EXTENT,
  ).flatMap((value) => [
    {
      id: `vertical-${value}`,
      axis: value === 0,
      points: buildMatrixGridLine(
        primary,
        { x: value, y: -MATRIX_TRANSFORMATIONS_GRID_EXTENT },
        { x: value, y: MATRIX_TRANSFORMATIONS_GRID_EXTENT },
      ),
    },
    {
      id: `horizontal-${value}`,
      axis: value === 0,
      points: buildMatrixGridLine(
        primary,
        { x: -MATRIX_TRANSFORMATIONS_GRID_EXTENT, y: value },
        { x: MATRIX_TRANSFORMATIONS_GRID_EXTENT, y: value },
      ),
    },
  ]);

  const drag = useSvgPointerDrag({
    svgRef,
    width: WIDTH,
    height: HEIGHT,
    onDrag: (target: DragTarget, location) => {
      const localX = location.svgX - PLANE_X;
      const localY = location.svgY - PLANE_Y;
      const nextX = roundToTenth(
        clamp(invertCartesianX(plane, localX), MATRIX_TRANSFORMATIONS_ENTRY_MIN, MATRIX_TRANSFORMATIONS_ENTRY_MAX),
      );
      const nextY = roundToTenth(
        clamp(invertCartesianY(plane, localY), MATRIX_TRANSFORMATIONS_ENTRY_MIN, MATRIX_TRANSFORMATIONS_ENTRY_MAX),
      );

      if (target === "basis-1") {
        setParam("m11", nextX);
        setParam("m21", nextY);
        return;
      }

      setParam("m12", nextX);
      setParam("m22", nextY);
    },
  });

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(78,166,223,0.1),rgba(30,166,162,0.08))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{copy.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              {copy.description}
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
            {previewLabel ? (
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-sky-700">
                {previewLabel}
              </span>
            ) : null}
            <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
              {copy.columnChip}
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
        <defs>
          <marker
            id="matrix-basis-1-arrow"
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
            id="matrix-basis-2-arrow"
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
            id="matrix-probe-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#4ea6df" />
          </marker>
        </defs>
        <g transform={`translate(${PLANE_X} ${PLANE_Y})`}>
          <CartesianPlane config={plane} xLabel="x" yLabel="y" />
          {showReferenceGrid ? (
            <>
              <path
                d={buildClosedPath(plane, [...MATRIX_TRANSFORMATIONS_UNIT_SQUARE])}
                fill="none"
                stroke="rgba(240,171,60,0.5)"
                strokeDasharray="6 5"
                strokeWidth="2"
                opacity={overlayOpacity(focusedOverlayId, "unitSquare")}
              />
              <path
                d={buildClosedPath(plane, [...MATRIX_TRANSFORMATIONS_SAMPLE_SHAPE])}
                fill="none"
                stroke="rgba(49,80,99,0.52)"
                strokeDasharray="7 6"
                strokeWidth="2"
                opacity={overlayOpacity(focusedOverlayId, "sampleShape")}
              />
            </>
          ) : null}
          {transformedGridLines.map((line) => (
            <line
              key={line.id}
              x1={projectCartesianX(plane, line.points[0].x)}
              y1={projectCartesianY(plane, line.points[0].y)}
              x2={projectCartesianX(plane, line.points[1].x)}
              y2={projectCartesianY(plane, line.points[1].y)}
              stroke={line.axis ? "rgba(78,166,223,0.44)" : "rgba(78,166,223,0.2)"}
              strokeWidth={line.axis ? 2.4 : 1.5}
            />
          ))}
          {secondary && showUnitSquare ? (
            <path
              d={buildClosedPath(plane, secondary.transformedUnitSquare)}
              fill="none"
              stroke="rgba(15,28,36,0.45)"
              strokeDasharray="8 6"
              strokeWidth="2.4"
            />
          ) : null}
          {showUnitSquare ? (
            <path
              d={buildClosedPath(plane, primary.transformedUnitSquare)}
              fill="rgba(240,171,60,0.14)"
              stroke="#f0ab3c"
              strokeWidth="2.6"
              opacity={overlayOpacity(focusedOverlayId, "unitSquare")}
            />
          ) : null}
          {secondary && showSampleShape ? (
            <path
              d={buildClosedPath(plane, secondary.transformedSampleShape)}
              fill="none"
              stroke="rgba(15,28,36,0.42)"
              strokeDasharray="8 6"
              strokeWidth="2.4"
            />
          ) : null}
          {showSampleShape ? (
            <path
              d={buildClosedPath(plane, primary.transformedSampleShape)}
              fill="rgba(241,102,89,0.16)"
              stroke="#f16659"
              strokeWidth="2.8"
              opacity={overlayOpacity(focusedOverlayId, "sampleShape")}
            />
          ) : null}
          {showBasisVectors ? (
            <g opacity={overlayOpacity(focusedOverlayId, "basisVectors")}>
              <line
                x1={origin.x}
                y1={origin.y}
                x2={projectCartesianX(plane, 1)}
                y2={projectCartesianY(plane, 0)}
                stroke="rgba(49,80,99,0.38)"
                strokeDasharray="7 6"
                strokeWidth="2.2"
              />
              <line
                x1={origin.x}
                y1={origin.y}
                x2={projectCartesianX(plane, 0)}
                y2={projectCartesianY(plane, 1)}
                stroke="rgba(49,80,99,0.38)"
                strokeDasharray="7 6"
                strokeWidth="2.2"
              />
              {secondaryBasis1End && secondaryBasis2End ? (
                <>
                  <line
                    x1={origin.x}
                    y1={origin.y}
                    x2={secondaryBasis1End.x}
                    y2={secondaryBasis1End.y}
                    stroke="rgba(15,28,36,0.45)"
                    strokeDasharray="8 6"
                    strokeWidth="3"
                  />
                  <line
                    x1={origin.x}
                    y1={origin.y}
                    x2={secondaryBasis2End.x}
                    y2={secondaryBasis2End.y}
                    stroke="rgba(15,28,36,0.45)"
                    strokeDasharray="8 6"
                    strokeWidth="3"
                  />
                </>
              ) : null}
              <line
                x1={origin.x}
                y1={origin.y}
                x2={basis1End.x}
                y2={basis1End.y}
                stroke="#1ea6a2"
                strokeWidth="4"
                markerEnd="url(#matrix-basis-1-arrow)"
              />
              <line
                x1={origin.x}
                y1={origin.y}
                x2={basis2End.x}
                y2={basis2End.y}
                stroke="#f16659"
                strokeWidth="4"
                markerEnd="url(#matrix-basis-2-arrow)"
              />
              <text x={basis1End.x + 10} y={basis1End.y - 8} className="fill-teal-700 text-[11px] font-semibold">
                M e1
              </text>
              <text x={basis2End.x + 10} y={basis2End.y - 8} className="fill-coral-700 text-[11px] font-semibold">
                M e2
              </text>
              <circle
                cx={basis1End.x}
                cy={basis1End.y}
                r={drag.activePointerId === null ? 8 : 10}
                fill="#1ea6a2"
                stroke="rgba(255,255,255,0.94)"
                strokeWidth="3"
                style={{ cursor: "grab" }}
                onPointerDown={(event) =>
                  drag.startDrag(event.pointerId, "basis-1", event.clientX, event.clientY)
                }
              />
              <circle
                cx={basis2End.x}
                cy={basis2End.y}
                r={drag.activePointerId === null ? 8 : 10}
                fill="#f16659"
                stroke="rgba(255,255,255,0.94)"
                strokeWidth="3"
                style={{ cursor: "grab" }}
                onPointerDown={(event) =>
                  drag.startDrag(event.pointerId, "basis-2", event.clientX, event.clientY)
                }
              />
            </g>
          ) : null}
          <circle cx={probeBase.x} cy={probeBase.y} r="4.5" fill="rgba(49,80,99,0.4)" />
          <line
            x1={origin.x}
            y1={origin.y}
            x2={probeImage.x}
            y2={probeImage.y}
            stroke="#4ea6df"
            strokeWidth="3.2"
            strokeDasharray="6 4"
            markerEnd="url(#matrix-probe-arrow)"
          />
          <circle cx={probeImage.x} cy={probeImage.y} r="6" fill="#4ea6df" />
          <text x={probeImage.x + 10} y={probeImage.y - 8} className="fill-sky-700 text-[11px] font-semibold">
            M p
          </text>
        </g>
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={copy.readoutTitle}
          setupLabel={primaryLabel}
          rows={readoutRows}
          noteLines={noteLines}
        />
      </svg>
    </section>
  );
}
