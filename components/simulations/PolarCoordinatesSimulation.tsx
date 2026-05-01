"use client";

import { useRef } from "react";
import { useLocale } from "next-intl";
import {
  clamp,
  degToRad,
  formatMeasurement,
  formatNumber,
  resolvePolarCoordinatesViewport,
  samplePolarCoordinatesState,
  POLAR_COORDINATES_RADIUS_MAX,
  POLAR_COORDINATES_RADIUS_MIN,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import type { AppLocale } from "@/i18n/routing";
import { copyText, getVariantLabel } from "@/lib/i18n/copy-text";
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

type PolarCoordinatesSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type DragTarget = "point";

const WIDTH = 920;
const HEIGHT = 392;
const PLANE_X = 24;
const PLANE_Y = 28;
const POLAR_CARD_X = 578;
const POLAR_CARD_Y = 28;
const POLAR_CARD_WIDTH = 292;
const CARTESIAN_CARD_X = POLAR_CARD_X;
const CARTESIAN_CARD_Y = 190;
const CARTESIAN_CARD_WIDTH = POLAR_CARD_WIDTH;

function buildPlaneConfig(maxAbsCoordinate: number): CartesianPlaneConfig {
  return {
    width: 520,
    height: 320,
    paddingLeft: 44,
    paddingRight: 18,
    paddingTop: 18,
    paddingBottom: 34,
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

  return focusedOverlayId === overlayId ? 1 : 0.32;
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

function buildArcPath(
  centerX: number,
  centerY: number,
  radius: number,
  angleDeg: number,
) {
  if (radius <= 0 || Math.abs(angleDeg) <= 0.02) {
    return null;
  }

  const endRad = degToRad(angleDeg);
  const start = {
    x: centerX + radius,
    y: centerY,
  };
  const end = {
    x: centerX + radius * Math.cos(endRad),
    y: centerY - radius * Math.sin(endRad),
  };
  const largeArcFlag = angleDeg > 180 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function roundToTenth(value: number) {
  return Number(value.toFixed(1));
}

function normalizeAngleDeg(angleDeg: number) {
  const wrapped = ((angleDeg % 360) + 360) % 360;
  return Number((Math.abs(wrapped) < 0.0001 ? 0 : wrapped).toFixed(1));
}

function nudgeAngle(angleDeg: number, delta: number) {
  return normalizeAngleDeg(angleDeg + delta);
}

function nudgeRadius(radius: number, delta: number) {
  return roundToTenth(
    clamp(radius + delta, POLAR_COORDINATES_RADIUS_MIN, POLAR_COORDINATES_RADIUS_MAX),
  );
}

function buildPreviewSource(source: SimulationParams, preview: GraphStagePreview | null | undefined) {
  if (
    !preview ||
    preview.kind !== "response" ||
    (preview.graphId !== "coordinate-sweep" && preview.graphId !== "angle-recovery")
  ) {
    return source;
  }

  return {
    ...source,
    angleDeg: preview.point.x,
  };
}

function resolvePreviewLabel(preview: GraphStagePreview | null | undefined, locale: AppLocale) {
  if (
    !preview ||
    preview.kind !== "response" ||
    (preview.graphId !== "coordinate-sweep" && preview.graphId !== "angle-recovery")
  ) {
    return null;
  }

  return `${copyText(locale, "preview theta =", "預覽 θ =")} ${formatNumber(preview.point.x)} deg`;
}

function resolveAngleFromCoordinates(x: number, y: number) {
  const raw = (Math.atan2(y, x) * 180) / Math.PI;
  return normalizeAngleDeg(raw < 0 ? raw + 360 : raw);
}

export function PolarCoordinatesSimulation({
  concept,
  params,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: PolarCoordinatesSimulationProps) {
  const locale = useLocale() as AppLocale;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const previewedParams =
    compare && previewedSetup === "b" ? compare.setupB : compare?.setupA ?? params;
  const primaryParams = buildPreviewSource(previewedParams, graphPreview);
  const secondaryParams =
    compare && previewedSetup === "b" ? compare.setupA : compare?.setupB ?? null;
  const primary = samplePolarCoordinatesState(primaryParams);
  const secondary = secondaryParams ? samplePolarCoordinatesState(secondaryParams) : null;
  const primaryLabel = compare
    ? previewedSetup === "b"
      ? compare.labelB ?? getVariantLabel(locale, "variant")
      : compare.labelA ?? getVariantLabel(locale, "baseline")
    : getVariantLabel(locale, "live");
  const secondaryLabel = compare
    ? previewedSetup === "b"
      ? compare.labelA ?? getVariantLabel(locale, "baseline")
      : compare.labelB ?? getVariantLabel(locale, "variant")
    : null;
  const previewLabel = resolvePreviewLabel(graphPreview, locale);
  const viewport = resolvePolarCoordinatesViewport(
    secondaryParams ? [primaryParams, secondaryParams] : [primaryParams],
  );
  const plane = buildPlaneConfig(viewport.maxAbsCoordinate);
  const origin = {
    x: projectCartesianX(plane, 0),
    y: projectCartesianY(plane, 0),
  };
  const primaryPoint = {
    x: projectCartesianX(plane, primary.x),
    y: projectCartesianY(plane, primary.y),
  };
  const secondaryPoint = secondary
    ? {
        x: projectCartesianX(plane, secondary.x),
        y: projectCartesianY(plane, secondary.y),
      }
    : null;
  const radiusSweep = overlayValues?.radiusSweep ?? true;
  const coordinateGuides = overlayValues?.coordinateGuides ?? true;
  const angleArc = overlayValues?.angleArc ?? true;
  const primaryRadiusPx = Math.abs(projectCartesianX(plane, primary.radius) - origin.x);
  const secondaryRadiusPx = secondary
    ? Math.abs(projectCartesianX(plane, secondary.radius) - origin.x)
    : null;
  const regionLabel =
    locale === "zh-HK"
      ? primary.regionLabel === "Positive x-axis"
        ? "正 x 軸"
        : primary.regionLabel === "Negative x-axis"
          ? "負 x 軸"
          : primary.regionLabel === "Positive y-axis"
            ? "正 y 軸"
            : primary.regionLabel === "Negative y-axis"
              ? "負 y 軸"
              : primary.regionLabel === "Quadrant I"
                ? "第一象限"
                : primary.regionLabel === "Quadrant II"
                  ? "第二象限"
                  : primary.regionLabel === "Quadrant III"
                    ? "第三象限"
                    : "第四象限"
      : primary.regionLabel;
  const xSignLabel =
    locale === "zh-HK"
      ? primary.xSign === "positive"
        ? "正"
        : primary.xSign === "negative"
          ? "負"
          : "零"
      : primary.xSign;
  const ySignLabel =
    locale === "zh-HK"
      ? primary.ySign === "positive"
        ? "正"
        : primary.ySign === "negative"
          ? "負"
          : "零"
      : primary.ySign;
  const anglePath = buildArcPath(origin.x, origin.y, Math.max(primaryRadiusPx * 0.38, 24), primary.angleDeg);
  const secondaryAnglePath =
    secondary && secondaryRadiusPx !== null
      ? buildArcPath(origin.x, origin.y, Math.max(secondaryRadiusPx * 0.54, 32), secondary.angleDeg)
      : null;
  const polarRows = [
    { label: "r", value: formatNumber(primary.radius) },
    { label: copyText(locale, "theta", "θ"), value: formatMeasurement(primary.angleDeg, "deg") },
    { label: copyText(locale, "theta (rad)", "θ（rad）"), value: formatNumber(primary.angleRad) },
    { label: copyText(locale, "region", "區域"), value: regionLabel },
    { label: "cos(theta)", value: formatNumber(primary.cosTheta) },
    { label: "sin(theta)", value: formatNumber(primary.sinTheta) },
  ];
  const cartesianRows = [
    { label: "x", value: formatNumber(primary.x) },
    { label: "y", value: formatNumber(primary.y) },
    { label: copyText(locale, "x sign", "x 符號"), value: xSignLabel },
    { label: copyText(locale, "y sign", "y 符號"), value: ySignLabel },
    { label: copyText(locale, "ref angle", "參考角"), value: formatMeasurement(primary.referenceAngleDeg, "deg") },
  ];
  const polarNotes = [
    copyText(locale, "The radius sets how far the point sits from the origin without changing the angle itself.", "半徑只決定點離原點有多遠，不會改變角度本身。"),
    copyText(locale, "The same theta determines the quadrant and the component signs.", "同一個 θ 會決定所在象限與分量符號。"),
  ];
  const cartesianNotes = [
    copyText(locale, `The same point sits at (${formatNumber(primary.x)}, ${formatNumber(primary.y)}).`, `同一個點位於 (${formatNumber(primary.x)}, ${formatNumber(primary.y)})。`),
    copyText(locale, "x comes from r cos(theta), and y comes from r sin(theta).", "x 來自 r cos(theta)，而 y 來自 r sin(theta)。"),
  ];

  const drag = useSvgPointerDrag({
    svgRef,
    width: WIDTH,
    height: HEIGHT,
    onDrag: (_target: DragTarget, location) => {
      const localX = location.svgX - PLANE_X;
      const localY = location.svgY - PLANE_Y;
      const x = invertCartesianX(plane, localX);
      const y = invertCartesianY(plane, localY);
      const nextRadius = roundToTenth(
        clamp(Math.hypot(x, y), POLAR_COORDINATES_RADIUS_MIN, POLAR_COORDINATES_RADIUS_MAX),
      );
      const nextAngle = resolveAngleFromCoordinates(x, y);

      setParam("radius", nextRadius);
      setParam("angleDeg", nextAngle);
    },
  });

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(78,166,223,0.1),rgba(30,166,162,0.12))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{copyText(locale, "Polar coordinates on the plane", "平面上的極座標")}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              {copyText(
                locale,
                "Keep one point in polar and Cartesian view at the same time so changing r and theta still feels like one geometric move on one plane.",
                "同時保留極座標與笛卡兒視圖中的同一個點，讓改變 r 和 θ 仍然像是在同一平面上的單一幾何移動。",
              )}
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
              {copyText(locale, "Drag the point or use radius and angle", "拖動點，或使用半徑與角度控制")}
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
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.54)" />
        <g transform={`translate(${PLANE_X} ${PLANE_Y})`}>
          <CartesianPlane config={plane} xLabel="x" yLabel="y" />
          {radiusSweep ? (
            <circle
              cx={origin.x}
              cy={origin.y}
              r={primaryRadiusPx}
              fill="none"
              stroke="rgba(15,28,36,0.18)"
              strokeDasharray="7 6"
              opacity={overlayOpacity(focusedOverlayId, "radiusSweep")}
            />
          ) : null}
          {secondary && secondaryRadiusPx !== null && radiusSweep ? (
            <circle
              cx={origin.x}
              cy={origin.y}
              r={secondaryRadiusPx}
              fill="none"
              stroke="rgba(241,102,89,0.28)"
              strokeDasharray="9 7"
            />
          ) : null}
          {secondaryAnglePath ? (
            <path
              d={secondaryAnglePath}
              fill="none"
              stroke="rgba(241,102,89,0.48)"
              strokeWidth="3"
              strokeDasharray="8 6"
            />
          ) : null}
          {secondaryPoint ? (
            <>
              <line
                x1={origin.x}
                y1={origin.y}
                x2={secondaryPoint.x}
                y2={secondaryPoint.y}
                stroke="rgba(241,102,89,0.58)"
                strokeWidth="3"
                strokeDasharray="8 6"
              />
              <circle
                cx={secondaryPoint.x}
                cy={secondaryPoint.y}
                r="7"
                fill="rgba(241,102,89,0.16)"
                stroke="rgba(241,102,89,0.72)"
                strokeWidth="2.5"
              />
            </>
          ) : null}
          <line
            x1={origin.x}
            y1={origin.y}
            x2={primaryPoint.x}
            y2={primaryPoint.y}
            stroke="#1ea6a2"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {coordinateGuides ? (
            <g opacity={overlayOpacity(focusedOverlayId, "coordinateGuides")}>
              <line
                x1={origin.x}
                y1={primaryPoint.y}
                x2={primaryPoint.x}
                y2={primaryPoint.y}
                stroke="rgba(78,166,223,0.68)"
                strokeWidth="2.5"
                strokeDasharray="7 5"
              />
              <line
                x1={primaryPoint.x}
                y1={origin.y}
                x2={primaryPoint.x}
                y2={primaryPoint.y}
                stroke="rgba(30,166,162,0.68)"
                strokeWidth="2.5"
                strokeDasharray="7 5"
              />
              <text
                x={primaryPoint.x}
                y={origin.y + 24}
                textAnchor="middle"
                className="fill-teal-700 text-[11px] font-semibold"
              >
                x
              </text>
              <text
                x={origin.x - 12}
                y={primaryPoint.y - 10}
                textAnchor="end"
                className="fill-sky-700 text-[11px] font-semibold"
              >
                y
              </text>
            </g>
          ) : null}
          {angleArc && anglePath ? (
            <>
              <path
                d={anglePath}
                fill="none"
                stroke="#f0ab3c"
                strokeWidth="4"
                strokeLinecap="round"
                opacity={overlayOpacity(focusedOverlayId, "angleArc")}
              />
              <text
                x={origin.x + Math.max(primaryRadiusPx * 0.3, 28)}
                y={origin.y - 16}
                className="fill-amber-700 text-[12px] font-semibold uppercase tracking-[0.14em]"
                opacity={overlayOpacity(focusedOverlayId, "angleArc")}
              >
                {copyText(locale, "theta", "θ")}
              </text>
            </>
          ) : null}
          <g
            role="button"
            aria-label={copyText(locale, "Draggable polar point", "可拖動的極座標點")}
            tabIndex={0}
            onPointerDown={(event) =>
              drag.startDrag(event.pointerId, "point", event.clientX, event.clientY)
            }
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                setParam("angleDeg", nudgeAngle(primary.angleDeg, -5));
              }

              if (event.key === "ArrowRight") {
                event.preventDefault();
                setParam("angleDeg", nudgeAngle(primary.angleDeg, 5));
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                setParam("radius", nudgeRadius(primary.radius, 0.1));
              }

              if (event.key === "ArrowDown") {
                event.preventDefault();
                setParam("radius", nudgeRadius(primary.radius, -0.1));
              }
            }}
          >
            <circle
              cx={primaryPoint.x}
              cy={primaryPoint.y}
              r="11"
              fill="#1ea6a2"
              stroke="rgba(255,255,255,0.92)"
              strokeWidth="3"
            />
            <circle
              cx={primaryPoint.x}
              cy={primaryPoint.y}
              r="17"
              fill="transparent"
              stroke="transparent"
              strokeWidth="12"
            />
          </g>
          <text
            x={primaryPoint.x + 10}
            y={primaryPoint.y - 10}
            className="fill-teal-700 text-[11px] font-semibold"
          >
            P
          </text>
          <text
            x={(origin.x + primaryPoint.x) / 2 + 8}
            y={(origin.y + primaryPoint.y) / 2 - 8}
            className="fill-teal-700 text-[11px] font-semibold"
          >
            r
          </text>
        </g>
        <SimulationReadoutCard
          x={POLAR_CARD_X}
          y={POLAR_CARD_Y}
          width={POLAR_CARD_WIDTH}
          title={copyText(locale, "Polar readout", "極座標讀數")}
          setupLabel={primaryLabel}
          rows={polarRows}
          noteLines={polarNotes}
        />
        <SimulationReadoutCard
          x={CARTESIAN_CARD_X}
          y={CARTESIAN_CARD_Y}
          width={CARTESIAN_CARD_WIDTH}
          title={copyText(locale, "Cartesian readout", "笛卡兒讀數")}
          rows={cartesianRows}
          noteLines={cartesianNotes}
        />
      </svg>
    </section>
  );
}
