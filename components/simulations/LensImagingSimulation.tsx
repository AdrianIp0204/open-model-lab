"use client";

import { useState } from "react";
import {
  clamp,
  formatMeasurement,
  formatNumber,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
  LENS_IMAGING_MAX_OBJECT_DISTANCE,
  LENS_IMAGING_MAX_OBJECT_HEIGHT,
  LENS_IMAGING_MIN_OBJECT_DISTANCE,
  resolveLensImagingParams,
  sampleLensImagingState,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import { SimulationReadoutSummary } from "./SimulationReadoutSummary";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type LensImagingSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type LensFrame = {
  params: ReturnType<typeof resolveLensImagingParams>;
  snapshot: ReturnType<typeof sampleLensImagingState>;
};

const WIDTH = 820;
const HEIGHT = 320;
const AXIS_LEFT = 92;
const AXIS_RIGHT = 610;
const AXIS_Y = 184;
const WORLD_LEFT = -4.25;
const WORLD_RIGHT = 4.25;
const PIXELS_PER_METER = (AXIS_RIGHT - AXIS_LEFT) / (WORLD_RIGHT - WORLD_LEFT);
const HEIGHT_SCALE = 56;
const LENS_X = worldToX(0);
const LENS_HALF_HEIGHT = 92;
const CARD_WIDTH = 228;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const LABEL_OFFSET_Y = 14;

function worldToX(position: number) {
  return AXIS_LEFT + (position - WORLD_LEFT) * PIXELS_PER_METER;
}

function worldToY(value: number) {
  return AXIS_Y - value * HEIGHT_SCALE;
}

function stageXToObjectDistance(stageX: number) {
  const worldX = WORLD_LEFT + ((stageX - AXIS_LEFT) / (AXIS_RIGHT - AXIS_LEFT)) * (WORLD_RIGHT - WORLD_LEFT);
  return clamp(-worldX, LENS_IMAGING_MIN_OBJECT_DISTANCE, LENS_IMAGING_MAX_OBJECT_DISTANCE);
}

function buildFrame(
  source: SimulationParams,
  objectDistanceOverride?: number,
): LensFrame {
  const params = resolveLensImagingParams({
    ...source,
    objectDistance:
      objectDistanceOverride === undefined ? source.objectDistance : objectDistanceOverride,
  });

  return {
    params,
    snapshot: sampleLensImagingState(params),
  };
}

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.38;
}

function formatInfinity(value: number) {
  return value < 0 ? "-\u221e" : "\u221e";
}

function formatMagnification(value: number) {
  if (!Number.isFinite(value)) {
    return formatInfinity(value);
  }

  return formatNumber(value);
}

function formatImageDistance(value: number) {
  if (!Number.isFinite(value)) {
    return formatInfinity(value);
  }

  return formatMeasurement(value, "m");
}

function imageSummary(snapshot: LensFrame["snapshot"]) {
  return `${snapshot.imageType}, ${snapshot.orientation}, ${snapshot.sizeRelation}`;
}

function imageDisplayPosition(imageDistance: number) {
  if (!Number.isFinite(imageDistance)) {
    return imageDistance > 0 ? WORLD_RIGHT : WORLD_LEFT;
  }

  return clamp(imageDistance, WORLD_LEFT + 0.2, WORLD_RIGHT - 0.2);
}

function buildOffscaleImageLabel(snapshot: LensFrame["snapshot"]) {
  if (!Number.isFinite(snapshot.imageDistance)) {
    return `${snapshot.imageType} image at ${formatInfinity(snapshot.imageDistance)}`;
  }

  return `${snapshot.imageType} image beyond scale`;
}

function renderArrow(options: {
  x: number;
  height: number;
  label: string;
  stroke: string;
  fill: string;
  dashed?: boolean;
  opacity?: number;
  labelPosition?: "above" | "below";
}) {
  const topY = worldToY(options.height);
  const baseY = AXIS_Y;
  const arrowDirection = options.height >= 0 ? -1 : 1;
  const headY = topY + arrowDirection * 12;
  const labelY =
    options.labelPosition === "below"
      ? Math.max(topY, baseY) + LABEL_OFFSET_Y
      : Math.min(topY, baseY) - LABEL_OFFSET_Y;

  return (
    <g opacity={options.opacity ?? 1}>
      <line
        x1={options.x}
        x2={options.x}
        y1={baseY}
        y2={topY}
        stroke={options.stroke}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={options.dashed ? "10 8" : undefined}
      />
      <line
        x1={options.x}
        x2={options.x - 9}
        y1={topY}
        y2={headY}
        stroke={options.stroke}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={options.dashed ? "10 8" : undefined}
      />
      <line
        x1={options.x}
        x2={options.x + 9}
        y1={topY}
        y2={headY}
        stroke={options.stroke}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={options.dashed ? "10 8" : undefined}
      />
      <circle
        cx={options.x}
        cy={baseY}
        r="4"
        fill={options.fill}
        opacity={options.dashed ? 0.65 : 0.95}
      />
      <text
        x={options.x}
        y={labelY}
        textAnchor="middle"
        className="fill-ink-700 text-[11px] font-semibold"
      >
        {options.label}
      </text>
    </g>
  );
}

function renderOffscaleImageMarker(options: {
  snapshot: LensFrame["snapshot"];
  dashed?: boolean;
  opacity?: number;
}) {
  const side = options.snapshot.imageDistance < 0 ? "left" : "right";
  const x = worldToX(side === "right" ? WORLD_RIGHT - 0.12 : WORLD_LEFT + 0.12);
  const textX = side === "right" ? x - 16 : x + 16;
  const textAnchor = side === "right" ? "end" : "start";
  const direction = side === "right" ? 1 : -1;
  const strokeDasharray = options.dashed ? "10 8" : "8 7";

  return (
    <g opacity={options.opacity ?? 1} pointerEvents="none">
      <line
        x1={x}
        x2={x}
        y1={AXIS_Y - 70}
        y2={AXIS_Y + 70}
        stroke="#f16659"
        strokeWidth="2.6"
        strokeDasharray={strokeDasharray}
      />
      <line
        x1={x}
        x2={x + direction * 10}
        y1={AXIS_Y - 70}
        y2={AXIS_Y - 82}
        stroke="#f16659"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
      />
      <line
        x1={x}
        x2={x + direction * 10}
        y1={AXIS_Y + 70}
        y2={AXIS_Y + 82}
        stroke="#f16659"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
      />
      <text
        x={textX}
        y={AXIS_Y - 94}
        textAnchor={textAnchor}
        className="fill-coral-700 text-[11px] font-semibold"
      >
        {buildOffscaleImageLabel(options.snapshot)}
      </text>
    </g>
  );
}

function renderLensBody(
  converging: boolean,
  options?: {
    dashed?: boolean;
    muted?: boolean;
    label?: string | null;
  },
) {
  const top = AXIS_Y - LENS_HALF_HEIGHT;
  const bottom = AXIS_Y + LENS_HALF_HEIGHT;
  const innerWidth = converging ? 8 : 3;
  const outerWidth = converging ? 18 : 14;
  const left = LENS_X - innerWidth;
  const right = LENS_X + innerWidth;
  const outerLeft = LENS_X - outerWidth;
  const outerRight = LENS_X + outerWidth;
  const controlOffset = converging ? 22 : -18;
  const dashed = options?.dashed ?? false;
  const opacity = options?.muted ? 0.56 : 1;

  return (
    <g pointerEvents="none" opacity={opacity}>
      <path
        d={`M ${left} ${top} C ${outerLeft} ${top + 18}, ${outerLeft} ${bottom - 18}, ${left} ${bottom} L ${right} ${bottom} C ${outerRight} ${bottom - 18}, ${outerRight} ${top + 18}, ${right} ${top} Z`}
        fill={dashed ? "rgba(78,166,223,0.07)" : "rgba(78,166,223,0.16)"}
        stroke="rgba(78,166,223,0.65)"
        strokeWidth="2.5"
        strokeDasharray={dashed ? "9 7" : undefined}
      />
      {!converging ? (
        <>
          <path
            d={`M ${LENS_X - 1} ${top + 8} C ${LENS_X + controlOffset} ${AXIS_Y - 48}, ${LENS_X + controlOffset} ${AXIS_Y + 48}, ${LENS_X - 1} ${bottom - 8}`}
            fill="none"
            stroke="rgba(78,166,223,0.28)"
            strokeWidth="2"
            strokeDasharray={dashed ? "9 7" : undefined}
          />
          <path
            d={`M ${LENS_X + 1} ${top + 8} C ${LENS_X - controlOffset} ${AXIS_Y - 48}, ${LENS_X - controlOffset} ${AXIS_Y + 48}, ${LENS_X + 1} ${bottom - 8}`}
            fill="none"
            stroke="rgba(78,166,223,0.28)"
            strokeWidth="2"
            strokeDasharray={dashed ? "9 7" : undefined}
          />
        </>
      ) : null}
      {options?.label ? (
        <text
          x={LENS_X}
          y={AXIS_Y - LENS_HALF_HEIGHT - 10}
          textAnchor="middle"
          className="fill-sky-700 text-[11px] font-semibold uppercase tracking-[0.16em]"
        >
          {options.label}
        </text>
      ) : null}
    </g>
  );
}

function renderFocusMarkers(
  frame: LensFrame,
  focusedOverlayId?: string | null,
  dashed = false,
) {
  const opacity = overlayWeight(focusedOverlayId, "focusMarkers");
  const focus = frame.snapshot.focalLength;
  const markers = [
    { label: "2F", position: -2 * focus },
    { label: "F", position: -focus },
    { label: "F", position: focus },
    { label: "2F", position: 2 * focus },
  ];

  return (
    <g opacity={opacity}>
      {markers.map((marker) => {
        const x = worldToX(marker.position);
        return (
          <g key={`${marker.label}-${marker.position}`}>
            <line
              x1={x}
              x2={x}
              y1={AXIS_Y - 10}
              y2={AXIS_Y + 10}
              stroke="rgba(15,28,36,0.3)"
              strokeWidth="2"
              strokeDasharray={dashed ? "8 7" : undefined}
            />
            <text
              x={x}
              y={AXIS_Y + 26}
              textAnchor="middle"
              className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
            >
              {marker.label}
            </text>
          </g>
        );
      })}
      <text
        x={worldToX(frame.snapshot.focalLength)}
        y={AXIS_Y - 18}
        textAnchor="middle"
        className="fill-sky-700 text-[10px] font-semibold"
      >
        f = {formatMeasurement(frame.snapshot.focalLength, "m")}
      </text>
    </g>
  );
}

function rayLineY(xWorld: number, throughA: { x: number; y: number }, throughB: { x: number; y: number }) {
  const dx = throughB.x - throughA.x;
  if (Math.abs(dx) < Number.EPSILON) {
    return throughB.y;
  }

  const slope = (throughB.y - throughA.y) / dx;
  return throughA.y + slope * (xWorld - throughA.x);
}

function renderPrincipalRays(
  frame: LensFrame,
  options: {
    focusedOverlayId?: string | null;
    dashed?: boolean;
    muted?: boolean;
  },
) {
  const opacity = overlayWeight(options.focusedOverlayId, "principalRays") * (options.muted ? 0.7 : 1);
  const objectTop = {
    x: -frame.snapshot.objectDistance,
    y: frame.snapshot.objectHeight,
  };
  const center = { x: 0, y: 0 };
  const lensHit = { x: 0, y: frame.snapshot.objectHeight };
  const rightBoundary = WORLD_RIGHT;
  const farFocus = { x: frame.snapshot.focalLength, y: 0 };
  const nearFocus = { x: -frame.snapshot.focalLength, y: 0 };
  const imageX = frame.snapshot.imageDistance;
  const realImageOnStage =
    Number.isFinite(imageX) && imageX > 0 && imageX <= WORLD_RIGHT;
  const virtualImageOnStage =
    Number.isFinite(imageX) && imageX < 0 && imageX >= WORLD_LEFT;
  const strokeDasharray = options.dashed ? "10 8" : undefined;

  const centralRayEndX = realImageOnStage ? imageX : rightBoundary;
  const centralRayEndY = rayLineY(centralRayEndX, objectTop, center);
  const parallelRayEndX = realImageOnStage ? imageX : rightBoundary;
  const parallelRayEndY = frame.snapshot.converging
    ? rayLineY(parallelRayEndX, lensHit, farFocus)
    : rayLineY(parallelRayEndX, nearFocus, lensHit);

  return (
    <g opacity={opacity} pointerEvents="none">
      <line
        x1={worldToX(objectTop.x)}
        x2={worldToX(lensHit.x)}
        y1={worldToY(objectTop.y)}
        y2={worldToY(lensHit.y)}
        stroke="#f0ab3c"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
      />
      <line
        x1={worldToX(lensHit.x)}
        x2={worldToX(parallelRayEndX)}
        y1={worldToY(lensHit.y)}
        y2={worldToY(parallelRayEndY)}
        stroke="#f0ab3c"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
      />
      <line
        x1={worldToX(objectTop.x)}
        x2={worldToX(centralRayEndX)}
        y1={worldToY(objectTop.y)}
        y2={worldToY(centralRayEndY)}
        stroke="#4ea6df"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
      />
      {!realImageOnStage && virtualImageOnStage ? (
        <>
          <line
            x1={worldToX(lensHit.x)}
            x2={worldToX(imageX)}
            y1={worldToY(lensHit.y)}
            y2={worldToY(frame.snapshot.imageHeight)}
            stroke="#f0ab3c"
            strokeWidth="2.2"
            strokeDasharray="6 6"
            opacity="0.78"
          />
          <line
            x1={worldToX(center.x)}
            x2={worldToX(imageX)}
            y1={worldToY(center.y)}
            y2={worldToY(frame.snapshot.imageHeight)}
            stroke="#4ea6df"
            strokeWidth="2.2"
            strokeDasharray="6 6"
            opacity="0.78"
          />
        </>
      ) : null}
      <text
        x={worldToX(objectTop.x) + 6}
        y={worldToY(objectTop.y) - 10}
        className="fill-amber-700 text-[10px] font-semibold uppercase tracking-[0.12em]"
      >
        parallel ray
      </text>
      <text
        x={worldToX(-0.6)}
        y={worldToY(rayLineY(-0.6, objectTop, center)) - 12}
        className="fill-sky-700 text-[10px] font-semibold uppercase tracking-[0.12em]"
      >
        center ray
      </text>
    </g>
  );
}

function renderMagnificationGuide(
  frame: LensFrame,
  focusedOverlayId?: string | null,
  dashed = false,
) {
  const opacity = overlayWeight(focusedOverlayId, "magnificationGuide");
  const objectX = worldToX(-frame.snapshot.objectDistance);
  const imageX = worldToX(imageDisplayPosition(frame.snapshot.imageDistance));
  const objectTopY = worldToY(frame.snapshot.objectHeight);
  const imageTopY = worldToY(frame.snapshot.imageHeight);
  const guideY = AXIS_Y + 36;
  const strokeDasharray = dashed ? "10 8" : undefined;

  return (
    <g opacity={opacity} pointerEvents="none">
      <line
        x1={objectX}
        x2={LENS_X}
        y1={guideY}
        y2={guideY}
        stroke="rgba(15,28,36,0.22)"
        strokeWidth="2"
        strokeDasharray={strokeDasharray}
      />
      <line
        x1={LENS_X}
        x2={imageX}
        y1={guideY + 14}
        y2={guideY + 14}
        stroke="rgba(15,28,36,0.22)"
        strokeWidth="2"
        strokeDasharray={strokeDasharray}
      />
      <text
        x={(objectX + LENS_X) / 2}
        y={guideY - 8}
        textAnchor="middle"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.12em]"
      >
        d_o = {formatMeasurement(frame.snapshot.objectDistance, "m")}
      </text>
      <text
        x={(imageX + LENS_X) / 2}
        y={guideY + 30}
        textAnchor="middle"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.12em]"
      >
        d_i = {formatImageDistance(frame.snapshot.imageDistance)}
      </text>
      <line
        x1={objectX + 18}
        x2={objectX + 18}
        y1={AXIS_Y}
        y2={objectTopY}
        stroke="#1ea6a2"
        strokeWidth="2.6"
        strokeDasharray={strokeDasharray}
      />
      <line
        x1={imageX - 18}
        x2={imageX - 18}
        y1={AXIS_Y}
        y2={imageTopY}
        stroke="#f16659"
        strokeWidth="2.6"
        strokeDasharray={strokeDasharray}
      />
      <text
        x={objectX + 26}
        y={(AXIS_Y + objectTopY) / 2}
        className="fill-teal-700 text-[10px] font-semibold uppercase tracking-[0.12em]"
      >
        h_o
      </text>
      <text
        x={imageX - 26}
        y={(AXIS_Y + imageTopY) / 2}
        textAnchor="end"
        className="fill-coral-700 text-[10px] font-semibold uppercase tracking-[0.12em]"
      >
        h_i
      </text>
      <text
        x={LENS_X}
        y={AXIS_Y - 128}
        textAnchor="middle"
        className="fill-ink-700 text-[11px] font-semibold"
      >
        m = {formatMagnification(frame.snapshot.magnification)}
      </text>
    </g>
  );
}

function renderSetup(
  frame: LensFrame,
  options: {
    label: string;
    interactive?: boolean;
    overlayValues?: Record<string, boolean>;
    focusedOverlayId?: string | null;
    dashed?: boolean;
    muted?: boolean;
    onAdjustObjectDistance?: (objectDistance: number) => void;
    activePointerId: number | null;
    setActivePointerId: (pointerId: number | null) => void;
  },
) {
  const objectX = worldToX(-frame.snapshot.objectDistance);
  const imageX = worldToX(imageDisplayPosition(frame.snapshot.imageDistance));
  const opacity = options.muted ? 0.6 : 1;

  return (
    <g opacity={opacity}>
      {options.overlayValues?.focusMarkers ?? true
        ? renderFocusMarkers(frame, options.focusedOverlayId, options.dashed)
        : null}
      {options.overlayValues?.principalRays ?? true
        ? renderPrincipalRays(frame, {
            focusedOverlayId: options.focusedOverlayId,
            dashed: options.dashed,
            muted: options.muted,
          })
        : null}
      {options.overlayValues?.magnificationGuide ?? false
        ? renderMagnificationGuide(frame, options.focusedOverlayId, options.dashed)
        : null}
      {renderArrow({
        x: objectX,
        height: frame.snapshot.objectHeight,
        label: options.label,
        stroke: "#1ea6a2",
        fill: "#1ea6a2",
        dashed: options.dashed,
        opacity,
      })}
      {frame.snapshot.imageDistanceOffscale
        ? renderOffscaleImageMarker({
            snapshot: frame.snapshot,
            dashed: options.dashed || frame.snapshot.imageType === "virtual",
            opacity: frame.snapshot.imageType === "virtual" ? opacity * 0.82 : opacity,
          })
        : renderArrow({
            x: imageX,
            height: frame.snapshot.imageHeight,
            label: frame.snapshot.imageType === "virtual" ? "virtual image" : "real image",
            stroke: "#f16659",
            fill: "#f16659",
            dashed: options.dashed || frame.snapshot.imageType === "virtual",
            opacity: frame.snapshot.imageType === "virtual" ? opacity * 0.82 : opacity,
            labelPosition:
              frame.snapshot.imageHeight < 0 || frame.snapshot.imageType === "virtual"
                ? "below"
                : "above",
          })}
      {options.interactive ? (
        <g
          tabIndex={0}
          role="button"
          aria-label={`Move object distance, current ${formatNumber(frame.snapshot.objectDistance)} meters`}
          style={{ cursor: options.activePointerId === null ? "ew-resize" : "grabbing" }}
          onPointerDown={(event) => {
            const svg = event.currentTarget.ownerSVGElement;
            if (!svg || !options.onAdjustObjectDistance) {
              return;
            }

            event.currentTarget.setPointerCapture(event.pointerId);
            options.setActivePointerId(event.pointerId);
            const bounds = svg.getBoundingClientRect();
            const svgX = ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * WIDTH;
            options.onAdjustObjectDistance(stageXToObjectDistance(svgX));
          }}
          onPointerMove={(event) => {
            if (options.activePointerId !== event.pointerId || !options.onAdjustObjectDistance) {
              return;
            }

            const svg = event.currentTarget.ownerSVGElement;
            if (!svg) {
              return;
            }

            const bounds = svg.getBoundingClientRect();
            const svgX = ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * WIDTH;
            options.onAdjustObjectDistance(stageXToObjectDistance(svgX));
          }}
          onPointerUp={(event) => {
            if (options.activePointerId === event.pointerId) {
              event.currentTarget.releasePointerCapture(event.pointerId);
              options.setActivePointerId(null);
            }
          }}
          onPointerCancel={(event) => {
            if (options.activePointerId === event.pointerId) {
              event.currentTarget.releasePointerCapture(event.pointerId);
              options.setActivePointerId(null);
            }
          }}
          onLostPointerCapture={() => options.setActivePointerId(null)}
          onKeyDown={(event) => {
            if (!options.onAdjustObjectDistance) {
              return;
            }

            const step = 0.05;

            if (event.key === "ArrowLeft") {
              event.preventDefault();
              options.onAdjustObjectDistance(frame.snapshot.objectDistance + step);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              options.onAdjustObjectDistance(frame.snapshot.objectDistance - step);
            } else if (event.key === "Home") {
              event.preventDefault();
              options.onAdjustObjectDistance(LENS_IMAGING_MAX_OBJECT_DISTANCE);
            } else if (event.key === "End") {
              event.preventDefault();
              options.onAdjustObjectDistance(LENS_IMAGING_MIN_OBJECT_DISTANCE);
            }
          }}
        >
          <rect
            x={objectX - 22}
            y={worldToY(LENS_IMAGING_MAX_OBJECT_HEIGHT) - 18}
            width="44"
            height={AXIS_Y - worldToY(LENS_IMAGING_MAX_OBJECT_HEIGHT) + 26}
            fill="transparent"
          />
        </g>
      ) : null}
    </g>
  );
}

export function LensImagingSimulation({
  concept,
  params,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: LensImagingSimulationProps) {
  const [activePointerId, setActivePointerId] = useState<number | null>(null);
  const previewObjectDistance =
    graphPreview?.kind === "response"
      ? clamp(
          graphPreview.point.x,
          LENS_IMAGING_MIN_OBJECT_DISTANCE,
          LENS_IMAGING_MAX_OBJECT_DISTANCE,
        )
      : undefined;
  const compareEnabled = Boolean(compare);
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const activeFrame = buildFrame(params, previewObjectDistance);
  const frameA = compare
    ? buildFrame(compare.setupA, previewedSetup === "a" ? previewObjectDistance : undefined)
    : null;
  const frameB = compare
    ? buildFrame(compare.setupB, previewedSetup === "b" ? previewObjectDistance : undefined)
    : null;
  const primaryFrame = compare
    ? previewedSetup === "a"
      ? frameA!
      : frameB!
    : activeFrame;
  const secondaryFrame = compare
    ? previewedSetup === "a"
      ? frameB!
      : frameA!
    : null;
  const primaryLabel = compare
    ? previewedSetup === "a"
      ? compare?.labelA ?? "Setup A"
      : compare?.labelB ?? "Setup B"
    : "object";
  const secondaryLabel = compare
    ? previewedSetup === "a"
      ? compare?.labelB ?? "Setup B"
      : compare?.labelA ?? "Setup A"
    : null;
  const canEditPrimary =
    !compare ||
    !graphPreview ||
    previewedSetup === compare.activeTarget;
  const previewBadge = graphPreview?.kind === "response" ? (
    <span className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral-700">
      preview d_o = {formatMeasurement(previewObjectDistance ?? 0, "m")}
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
  const compareLensFamiliesDiffer = Boolean(
    compareEnabled &&
      frameA &&
      frameB &&
      frameA.snapshot.converging !== frameB.snapshot.converging,
  );
  const compareLensFamilyBadges = compareLensFamiliesDiffer ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? "Setup A")}: {frameA?.snapshot.converging ? "converging" : "diverging"} lens
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: {frameB?.snapshot.converging ? "converging" : "diverging"} lens
      </span>
    </div>
  ) : null;
  const metricRows = [
    {
      label: "lens",
      value: primaryFrame.snapshot.converging ? "converging" : "diverging",
    },
    {
      label: "f",
      value: primaryFrame.snapshot.converging
        ? formatMeasurement(primaryFrame.snapshot.focalLength, "m")
        : `-${formatMeasurement(primaryFrame.snapshot.focalLength, "m")}`,
    },
    {
      label: "d_o",
      value: formatMeasurement(primaryFrame.snapshot.objectDistance, "m"),
    },
    {
      label: "d_i",
      value: formatImageDistance(primaryFrame.snapshot.imageDistance),
    },
    {
      label: "m",
      value: formatMagnification(primaryFrame.snapshot.magnification),
    },
  ];
  const noteLines = [
    imageSummary(primaryFrame.snapshot),
    primaryFrame.snapshot.canProjectOntoScreen
      ? "Real image can land on a screen."
      : "Virtual image is found by extending the rays backward.",
    primaryFrame.snapshot.imageDistanceOffscale
      ? "Near the focal condition, the image runs beyond the visible scale."
      : "",
  ].filter(Boolean);

  function handleAdjustObjectDistance(nextDistance: number) {
    setParam(
      "objectDistance",
      Number(
        clamp(
          nextDistance,
          LENS_IMAGING_MIN_OBJECT_DISTANCE,
          LENS_IMAGING_MAX_OBJECT_DISTANCE,
        ).toFixed(2),
      ),
    );
  }

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(78,166,223,0.1),rgba(30,166,162,0.06))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 text-xs text-ink-700">
              Drag the object arrow or use the controls. The ray diagram, signed distances,
              and response graphs stay on the same thin-lens model.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {compareLegend}
            {compareLensFamilyBadges}
            {previewBadge}
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
        >
          <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.48)" />
          <rect
            x="28"
            y="24"
            width={WIDTH - 56}
            height={HEIGHT - 48}
            rx="24"
            fill="rgba(255,253,247,0.72)"
            stroke="rgba(15,28,36,0.08)"
            strokeWidth="1.5"
          />
          <line
            x1={AXIS_LEFT}
            x2={AXIS_RIGHT}
            y1={AXIS_Y}
            y2={AXIS_Y}
            stroke="rgba(15,28,36,0.24)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <text
            x={AXIS_RIGHT}
            y={AXIS_Y + 32}
            textAnchor="end"
            className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
          >
            principal axis
          </text>
          {compareLensFamiliesDiffer && secondaryFrame
            ? renderLensBody(secondaryFrame.snapshot.converging, {
                dashed: true,
                muted: true,
              })
            : null}
          {renderLensBody(primaryFrame.snapshot.converging, {
            label: primaryFrame.snapshot.converging ? "Converging lens" : "Diverging lens",
          })}
          {secondaryFrame
            ? renderSetup(secondaryFrame, {
                label: secondaryLabel ?? "Setup B",
                overlayValues,
                focusedOverlayId,
                dashed: true,
                muted: true,
                activePointerId,
                setActivePointerId,
              })
            : null}
          {renderSetup(primaryFrame, {
            label: primaryLabel,
            interactive: canEditPrimary,
            overlayValues,
            focusedOverlayId,
            activePointerId,
            setActivePointerId,
            onAdjustObjectDistance: handleAdjustObjectDistance,
          })}
          <SimulationReadoutCard
            x={CARD_X}
            y={CARD_Y}
            width={CARD_WIDTH}
            title={compareEnabled ? `${primaryLabel} state` : "Lens state"}
            rows={metricRows}
            noteLines={noteLines}
          />
        </svg>
        <SimulationReadoutSummary
          title={compareEnabled ? `${primaryLabel} state` : "Lens state"}
          rows={metricRows}
          noteLines={noteLines}
          className="mx-3 mb-3 mt-0 md:hidden"
        />
      </div>
    </section>
  );
}
