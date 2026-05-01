"use client";

import { useRef } from "react";
import {
  clamp,
  formatMeasurement,
  formatNumber,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
  MIRRORS_MAX_OBJECT_DISTANCE,
  MIRRORS_MAX_OBJECT_HEIGHT,
  MIRRORS_MIN_OBJECT_DISTANCE,
  resolveMirrorsParams,
  sampleMirrorsState,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import { CompareLegend, resolveCompareScene, SimulationPreviewBadge } from "./primitives/compare";
import { resolveOverlayOpacity } from "./primitives/overlay";
import {
  formatOpticsImageDistance,
  formatOpticsMagnification,
  type AxisStageLayout,
  OpticsArrow,
  OpticsAxisStage,
  projectAxisX,
  projectAxisY,
  stageXToObjectDistance as resolveStageXToObjectDistance,
} from "./primitives/optics-axis";
import { SimulationSceneCard } from "./primitives/scene-card";
import { useSvgPointerDrag } from "./primitives/useSvgPointerDrag";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type MirrorsSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type MirrorFrame = {
  params: ReturnType<typeof resolveMirrorsParams>;
  snapshot: ReturnType<typeof sampleMirrorsState>;
};

const WIDTH = 820;
const HEIGHT = 332;
const AXIS_LEFT = 92;
const AXIS_RIGHT = 610;
const AXIS_Y = 186;
const WORLD_LEFT = -4.25;
const WORLD_RIGHT = 4.25;
const HEIGHT_SCALE = 56;
const AXIS_LAYOUT: AxisStageLayout = {
  width: WIDTH,
  height: HEIGHT,
  axisLeft: AXIS_LEFT,
  axisRight: AXIS_RIGHT,
  axisY: AXIS_Y,
  worldLeft: WORLD_LEFT,
  worldRight: WORLD_RIGHT,
  heightScale: HEIGHT_SCALE,
};
const MIRROR_X = projectAxisX(AXIS_LAYOUT, 0);
const MIRROR_HALF_HEIGHT = 94;
const CARD_WIDTH = 232;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const LABEL_OFFSET_Y = 14;

function worldToX(position: number) {
  return projectAxisX(AXIS_LAYOUT, position);
}

function worldToY(value: number) {
  return projectAxisY(AXIS_LAYOUT, value);
}

function stageXToObjectDistance(stageX: number) {
  return resolveStageXToObjectDistance(
    AXIS_LAYOUT,
    stageX,
    MIRRORS_MIN_OBJECT_DISTANCE,
    MIRRORS_MAX_OBJECT_DISTANCE,
  );
}

function imageWorldPosition(imageDistance: number) {
  if (!Number.isFinite(imageDistance)) {
    return imageDistance > 0 ? WORLD_LEFT : WORLD_RIGHT;
  }

  return clamp(-imageDistance, WORLD_LEFT + 0.2, WORLD_RIGHT - 0.2);
}

function buildFrame(source: SimulationParams, objectDistanceOverride?: number): MirrorFrame {
  const params = resolveMirrorsParams({
    ...source,
    objectDistance:
      objectDistanceOverride === undefined ? source.objectDistance : objectDistanceOverride,
  });

  return {
    params,
    snapshot: sampleMirrorsState(params),
  };
}

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  return resolveOverlayOpacity(focusedOverlayId, overlayId, 0.38);
}

function formatMagnification(value: number) {
  return formatOpticsMagnification(value);
}

function formatImageDistance(value: number) {
  return formatOpticsImageDistance(value);
}

function formatSignedFocal(frame: MirrorFrame) {
  if (!frame.snapshot.curved) {
    return "\u221e";
  }

  return frame.snapshot.concave
    ? formatMeasurement(frame.snapshot.focalLength, "m")
    : `-${formatMeasurement(frame.snapshot.focalLength, "m")}`;
}

function imageSummary(snapshot: MirrorFrame["snapshot"]) {
  return `${snapshot.imageType}, ${snapshot.orientation}, ${snapshot.sizeRelation}`;
}

function renderMirrorBody(frame: MirrorFrame, options?: { dashed?: boolean; muted?: boolean; label?: string | null }) {
  const top = AXIS_Y - MIRROR_HALF_HEIGHT;
  const bottom = AXIS_Y + MIRROR_HALF_HEIGHT;
  const dashed = options?.dashed ?? false;
  const opacity = options?.muted ? 0.56 : 1;

  return (
    <g pointerEvents="none" opacity={opacity}>
      {!frame.snapshot.curved ? (
        <>
          <line x1={MIRROR_X} x2={MIRROR_X} y1={top} y2={bottom} stroke="rgba(78,166,223,0.72)" strokeWidth="6" strokeLinecap="round" strokeDasharray={dashed ? "10 8" : undefined} />
          <line x1={MIRROR_X + 8} x2={MIRROR_X + 8} y1={top + 6} y2={bottom - 6} stroke="rgba(15,28,36,0.22)" strokeWidth="3" strokeLinecap="round" strokeDasharray={dashed ? "10 8" : undefined} />
        </>
      ) : (
        <>
          <path d={`M ${MIRROR_X} ${top} Q ${frame.snapshot.concave ? MIRROR_X - 28 : MIRROR_X + 28} ${AXIS_Y} ${MIRROR_X} ${bottom}`} fill="none" stroke="rgba(78,166,223,0.74)" strokeWidth="6" strokeLinecap="round" strokeDasharray={dashed ? "10 8" : undefined} />
          <path d={`M ${MIRROR_X + 10} ${top + 8} Q ${frame.snapshot.concave ? MIRROR_X - 12 : MIRROR_X + 24} ${AXIS_Y} ${MIRROR_X + 10} ${bottom - 8}`} fill="none" stroke="rgba(15,28,36,0.18)" strokeWidth="2.8" strokeLinecap="round" strokeDasharray={dashed ? "10 8" : undefined} />
        </>
      )}
      {options?.label ? (
        <text x={MIRROR_X} y={AXIS_Y - MIRROR_HALF_HEIGHT - 10} textAnchor="middle" className="fill-sky-700 text-[11px] font-semibold uppercase tracking-[0.16em]">
          {options.label}
        </text>
      ) : null}
    </g>
  );
}

function renderFocusMarkers(frame: MirrorFrame, focusedOverlayId?: string | null, dashed = false) {
  if (!frame.snapshot.curved) {
    return null;
  }

  const opacity = overlayWeight(focusedOverlayId, "focusMarkers");
  const markers = [
    { label: "F", position: -frame.snapshot.signedFocalLength },
    { label: "C", position: -2 * frame.snapshot.signedFocalLength },
  ];

  return (
    <g opacity={opacity}>
      {markers.map((marker) => {
        const x = worldToX(marker.position);

        return (
          <g key={`${marker.label}-${marker.position}`}>
            <line x1={x} x2={x} y1={AXIS_Y - 10} y2={AXIS_Y + 10} stroke="rgba(15,28,36,0.3)" strokeWidth="2" strokeDasharray={dashed ? "8 7" : undefined} />
            <text x={x} y={AXIS_Y + 26} textAnchor="middle" className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]">
              {marker.label}
            </text>
          </g>
        );
      })}
      <text x={worldToX(-frame.snapshot.signedFocalLength)} y={AXIS_Y - 18} textAnchor="middle" className="fill-sky-700 text-[10px] font-semibold">
        f = {formatSignedFocal(frame)}
      </text>
    </g>
  );
}

function renderEqualAngleGuide(frame: MirrorFrame, focusedOverlayId?: string | null, dashed = false) {
  const opacity = overlayWeight(focusedOverlayId, "equalAngles");
  const objectTop = { x: -frame.snapshot.objectDistance, y: frame.snapshot.objectHeight };

  return (
    <g opacity={opacity} pointerEvents="none">
      <line x1={MIRROR_X - 62} x2={MIRROR_X + 62} y1={AXIS_Y} y2={AXIS_Y} stroke="rgba(15,28,36,0.28)" strokeWidth="2" strokeDasharray={dashed ? "8 7" : "7 7"} />
      <line x1={worldToX(objectTop.x)} x2={MIRROR_X} y1={worldToY(objectTop.y)} y2={AXIS_Y} stroke="rgba(240,171,60,0.42)" strokeWidth="2" strokeDasharray={dashed ? "8 7" : "5 5"} />
      <line x1={MIRROR_X} x2={worldToX(-1.2)} y1={AXIS_Y} y2={AXIS_Y + (AXIS_Y - worldToY(objectTop.y))} stroke="rgba(240,171,60,0.32)" strokeWidth="2" strokeDasharray={dashed ? "8 7" : "5 5"} />
      <text x={MIRROR_X + 12} y={AXIS_Y - 12} className="fill-amber-700 text-[11px] font-semibold">
        theta_i = theta_r
      </text>
      <text x={MIRROR_X + 12} y={AXIS_Y + 18} className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]">
        normal at the pole
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

function renderPlaneConstructionRays(frame: MirrorFrame, options: { focusedOverlayId?: string | null; dashed?: boolean; muted?: boolean }) {
  const opacity = overlayWeight(options.focusedOverlayId, "principalRays") * (options.muted ? 0.7 : 1);
  const objectTop = { x: -frame.snapshot.objectDistance, y: frame.snapshot.objectHeight };
  const imageTop = { x: imageWorldPosition(frame.snapshot.imageDistance), y: frame.snapshot.imageHeight };
  const pole = { x: 0, y: 0 };
  const offAxisHit = { x: 0, y: frame.snapshot.objectHeight * 0.45 };
  const strokeDasharray = options.dashed ? "10 8" : undefined;
  const poleEnd = { x: WORLD_LEFT, y: rayLineY(WORLD_LEFT, pole, imageTop) };
  const offAxisEnd = { x: WORLD_LEFT, y: rayLineY(WORLD_LEFT, offAxisHit, imageTop) };

  return (
    <g opacity={opacity} pointerEvents="none">
      <line x1={worldToX(objectTop.x)} x2={worldToX(pole.x)} y1={worldToY(objectTop.y)} y2={worldToY(pole.y)} stroke="#4ea6df" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={strokeDasharray} />
      <line x1={worldToX(pole.x)} x2={worldToX(poleEnd.x)} y1={worldToY(pole.y)} y2={worldToY(poleEnd.y)} stroke="#4ea6df" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={strokeDasharray} />
      <line x1={worldToX(pole.x)} x2={worldToX(imageTop.x)} y1={worldToY(pole.y)} y2={worldToY(imageTop.y)} stroke="#4ea6df" strokeWidth="2.2" strokeDasharray="6 6" opacity="0.78" />
      <line x1={worldToX(objectTop.x)} x2={worldToX(offAxisHit.x)} y1={worldToY(objectTop.y)} y2={worldToY(offAxisHit.y)} stroke="#f0ab3c" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={strokeDasharray} />
      <line x1={worldToX(offAxisHit.x)} x2={worldToX(offAxisEnd.x)} y1={worldToY(offAxisHit.y)} y2={worldToY(offAxisEnd.y)} stroke="#f0ab3c" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={strokeDasharray} />
      <line x1={worldToX(offAxisHit.x)} x2={worldToX(imageTop.x)} y1={worldToY(offAxisHit.y)} y2={worldToY(imageTop.y)} stroke="#f0ab3c" strokeWidth="2.2" strokeDasharray="6 6" opacity="0.78" />
    </g>
  );
}

function renderCurvedConstructionRays(frame: MirrorFrame, options: { focusedOverlayId?: string | null; dashed?: boolean; muted?: boolean }) {
  const opacity = overlayWeight(options.focusedOverlayId, "principalRays") * (options.muted ? 0.7 : 1);
  const objectTop = { x: -frame.snapshot.objectDistance, y: frame.snapshot.objectHeight };
  const pole = { x: 0, y: 0 };
  const hit = { x: 0, y: frame.snapshot.objectHeight };
  const focus = { x: -frame.snapshot.signedFocalLength, y: 0 };
  const imageTop = { x: imageWorldPosition(frame.snapshot.imageDistance), y: frame.snapshot.imageHeight };
  const strokeDasharray = options.dashed ? "10 8" : undefined;
  const realImageOnStage = Number.isFinite(frame.snapshot.imageDistance) && frame.snapshot.imageDistance > 0 && imageTop.x >= WORLD_LEFT;
  const virtualImageOnStage = Number.isFinite(frame.snapshot.imageDistance) && frame.snapshot.imageDistance < 0 && imageTop.x <= WORLD_RIGHT;
  const poleEndX = realImageOnStage ? imageTop.x : WORLD_LEFT;
  const poleEndY = rayLineY(poleEndX, pole, imageTop);
  const parallelEndX = realImageOnStage ? imageTop.x : WORLD_LEFT;
  const parallelEndY = rayLineY(parallelEndX, hit, focus);

  return (
    <g opacity={opacity} pointerEvents="none">
      <line x1={worldToX(objectTop.x)} x2={worldToX(hit.x)} y1={worldToY(objectTop.y)} y2={worldToY(hit.y)} stroke="#f0ab3c" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={strokeDasharray} />
      <line x1={worldToX(hit.x)} x2={worldToX(parallelEndX)} y1={worldToY(hit.y)} y2={worldToY(parallelEndY)} stroke="#f0ab3c" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={strokeDasharray} />
      <line x1={worldToX(objectTop.x)} x2={worldToX(pole.x)} y1={worldToY(objectTop.y)} y2={worldToY(pole.y)} stroke="#4ea6df" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={strokeDasharray} />
      <line x1={worldToX(pole.x)} x2={worldToX(poleEndX)} y1={worldToY(pole.y)} y2={worldToY(poleEndY)} stroke="#4ea6df" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={strokeDasharray} />
      {virtualImageOnStage ? (
        <>
          <line x1={worldToX(hit.x)} x2={worldToX(imageTop.x)} y1={worldToY(hit.y)} y2={worldToY(imageTop.y)} stroke="#f0ab3c" strokeWidth="2.2" strokeDasharray="6 6" opacity="0.78" />
          <line x1={worldToX(pole.x)} x2={worldToX(imageTop.x)} y1={worldToY(pole.y)} y2={worldToY(imageTop.y)} stroke="#4ea6df" strokeWidth="2.2" strokeDasharray="6 6" opacity="0.78" />
        </>
      ) : null}
      {frame.snapshot.imageDistance > 0 &&
      (frame.snapshot.imageDistance > Math.abs(WORLD_LEFT) || !Number.isFinite(frame.snapshot.imageDistance)) ? (
        <text x={worldToX(WORLD_LEFT) + 6} y={AXIS_Y - 112} className="fill-coral-700 text-[11px] font-semibold">
          image beyond scale
        </text>
      ) : null}
    </g>
  );
}

function renderPrincipalRays(frame: MirrorFrame, options: { focusedOverlayId?: string | null; dashed?: boolean; muted?: boolean }) {
  return frame.snapshot.curved
    ? renderCurvedConstructionRays(frame, options)
    : renderPlaneConstructionRays(frame, options);
}

function renderDistanceGuide(frame: MirrorFrame, focusedOverlayId?: string | null, dashed = false) {
  const opacity = overlayWeight(focusedOverlayId, "distanceGuide");
  const objectX = worldToX(-frame.snapshot.objectDistance);
  const imageX = worldToX(imageWorldPosition(frame.snapshot.imageDistance));
  const objectTopY = worldToY(frame.snapshot.objectHeight);
  const imageTopY = worldToY(frame.snapshot.imageHeight);
  const objectGuideY = AXIS_Y + 36;
  const imageGuideY = AXIS_Y + 50;
  const strokeDasharray = dashed ? "10 8" : undefined;

  return (
    <g opacity={opacity} pointerEvents="none">
      <line x1={objectX} x2={MIRROR_X} y1={objectGuideY} y2={objectGuideY} stroke="rgba(15,28,36,0.22)" strokeWidth="2" strokeDasharray={strokeDasharray} />
      <line x1={MIRROR_X} x2={imageX} y1={imageGuideY} y2={imageGuideY} stroke="rgba(15,28,36,0.22)" strokeWidth="2" strokeDasharray={strokeDasharray} />
      <text x={(objectX + MIRROR_X) / 2} y={objectGuideY - 8} textAnchor="middle" className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.12em]">
        d_o = {formatMeasurement(frame.snapshot.objectDistance, "m")}
      </text>
      <text x={(imageX + MIRROR_X) / 2} y={imageGuideY + 16} textAnchor="middle" className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.12em]">
        d_i = {formatImageDistance(frame.snapshot.imageDistance)}
      </text>
      <line x1={objectX + 18} x2={objectX + 18} y1={AXIS_Y} y2={objectTopY} stroke="#1ea6a2" strokeWidth="2.6" strokeDasharray={strokeDasharray} />
      <line x1={imageX - 18} x2={imageX - 18} y1={AXIS_Y} y2={imageTopY} stroke="#f16659" strokeWidth="2.6" strokeDasharray={strokeDasharray} />
      <text x={objectX + 26} y={(AXIS_Y + objectTopY) / 2} className="fill-teal-700 text-[10px] font-semibold uppercase tracking-[0.12em]">
        h_o
      </text>
      <text x={imageX - 26} y={(AXIS_Y + imageTopY) / 2} textAnchor="end" className="fill-coral-700 text-[10px] font-semibold uppercase tracking-[0.12em]">
        h_i
      </text>
      <text x={MIRROR_X} y={AXIS_Y - 128} textAnchor="middle" className="fill-ink-700 text-[11px] font-semibold">
        m = {formatMagnification(frame.snapshot.magnification)}
      </text>
    </g>
  );
}

function renderSetup(
  frame: MirrorFrame,
  options: {
    label: string;
    interactive?: boolean;
    overlayValues?: Record<string, boolean>;
    focusedOverlayId?: string | null;
    dashed?: boolean;
    muted?: boolean;
    onAdjustObjectDistance?: (objectDistance: number) => void;
    activePointerId: number | null;
    onStartDrag?: (pointerId: number, clientX: number, clientY: number) => void;
  },
) {
  const objectX = worldToX(-frame.snapshot.objectDistance);
  const imageX = worldToX(imageWorldPosition(frame.snapshot.imageDistance));
  const opacity = options.muted ? 0.6 : 1;

  return (
    <g opacity={opacity}>
      {options.overlayValues?.focusMarkers ?? true ? renderFocusMarkers(frame, options.focusedOverlayId, options.dashed) : null}
      {options.overlayValues?.equalAngles ?? true ? renderEqualAngleGuide(frame, options.focusedOverlayId, options.dashed) : null}
      {options.overlayValues?.principalRays ?? true ? renderPrincipalRays(frame, { focusedOverlayId: options.focusedOverlayId, dashed: options.dashed, muted: options.muted }) : null}
      {options.overlayValues?.distanceGuide ?? false ? renderDistanceGuide(frame, options.focusedOverlayId, options.dashed) : null}
      <OpticsArrow
        x={objectX}
        height={frame.snapshot.objectHeight}
        axisY={AXIS_Y}
        projectY={worldToY}
        label={options.label}
        stroke="#1ea6a2"
        fill="#1ea6a2"
        labelOffsetY={LABEL_OFFSET_Y}
        dashed={options.dashed}
        opacity={opacity}
      />
      <OpticsArrow
        x={imageX}
        height={frame.snapshot.imageHeight}
        axisY={AXIS_Y}
        projectY={worldToY}
        label={frame.snapshot.imageType === "virtual" ? "virtual image" : "real image"}
        stroke="#f16659"
        fill="#f16659"
        labelOffsetY={LABEL_OFFSET_Y}
        dashed={options.dashed || frame.snapshot.imageType === "virtual"}
        opacity={frame.snapshot.imageType === "virtual" ? opacity * 0.82 : opacity}
        labelPosition={frame.snapshot.imageHeight < 0 || frame.snapshot.imageType === "virtual" ? "below" : "above"}
      />
      {options.interactive ? (
        <g
          tabIndex={0}
          role="button"
          aria-label={`Move object distance, current ${formatNumber(frame.snapshot.objectDistance)} meters`}
          style={{ cursor: options.activePointerId === null ? "ew-resize" : "grabbing" }}
          onPointerDown={(event) => {
            if (!options.onAdjustObjectDistance || !options.onStartDrag) {
              return;
            }

            options.onStartDrag(event.pointerId, event.clientX, event.clientY);
          }}
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
              options.onAdjustObjectDistance(MIRRORS_MAX_OBJECT_DISTANCE);
            } else if (event.key === "End") {
              event.preventDefault();
              options.onAdjustObjectDistance(MIRRORS_MIN_OBJECT_DISTANCE);
            }
          }}
        >
          <rect x={objectX - 22} y={worldToY(MIRRORS_MAX_OBJECT_HEIGHT) - 18} width="44" height={AXIS_Y - worldToY(MIRRORS_MAX_OBJECT_HEIGHT) + 26} fill="transparent" />
        </g>
      ) : null}
    </g>
  );
}

export function MirrorsSimulation({
  concept,
  params,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: MirrorsSimulationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const previewObjectDistance =
    graphPreview?.kind === "response"
      ? clamp(graphPreview.point.x, MIRRORS_MIN_OBJECT_DISTANCE, MIRRORS_MAX_OBJECT_DISTANCE)
      : undefined;
  const previewSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const activeFrame = buildFrame(params, previewObjectDistance);
  const frameA = compare
    ? buildFrame(compare.setupA, previewSetup === "a" ? previewObjectDistance : undefined)
    : null;
  const frameB = compare
    ? buildFrame(compare.setupB, previewSetup === "b" ? previewObjectDistance : undefined)
    : null;
  const {
    compareEnabled,
    primaryFrame,
    secondaryFrame,
    primaryLabel,
    secondaryLabel,
    canEditPrimary,
  } = resolveCompareScene({
    compare,
    graphPreview,
    activeFrame,
    frameA,
    frameB,
    liveLabel: "object",
  });
  const drag = useSvgPointerDrag<"object">({
    svgRef,
    width: WIDTH,
    height: HEIGHT,
    onDrag: (_target, location) => handleAdjustObjectDistance(stageXToObjectDistance(location.svgX)),
  });
  const compareBodiesDiffer = Boolean(
    compareEnabled &&
      frameA &&
      frameB &&
      (frameA.snapshot.curved !== frameB.snapshot.curved ||
        frameA.snapshot.concave !== frameB.snapshot.concave ||
        Math.abs(frameA.snapshot.focalLength - frameB.snapshot.focalLength) > 0.001),
  );
  const previewBadge = graphPreview?.kind === "response" ? (
    <SimulationPreviewBadge>
      preview d_o = {formatMeasurement(previewObjectDistance ?? 0, "m")}
    </SimulationPreviewBadge>
  ) : null;
  const compareMirrorFamiliesDiffer = Boolean(compareEnabled && frameA && frameB && frameA.snapshot.mirrorFamily !== frameB.snapshot.mirrorFamily);
  const compareMirrorFamilyBadges = compareMirrorFamiliesDiffer ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? "Setup A")}: {frameA?.snapshot.mirrorFamily} mirror
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? "Setup B")}: {frameB?.snapshot.mirrorFamily} mirror
      </span>
    </div>
  ) : null;
  const metricRows = [
    { label: "mirror", value: primaryFrame.snapshot.mirrorFamily },
    { label: "f", value: formatSignedFocal(primaryFrame) },
    { label: "d_o", value: formatMeasurement(primaryFrame.snapshot.objectDistance, "m") },
    { label: "d_i", value: formatImageDistance(primaryFrame.snapshot.imageDistance) },
    { label: "m", value: formatMagnification(primaryFrame.snapshot.magnification) },
  ];
  const noteLines = [
    imageSummary(primaryFrame.snapshot),
    "At the pole, the incident and reflected angles match.",
    primaryFrame.snapshot.canProjectOntoScreen ? "Real image can form in front of the mirror." : "Virtual image sits behind the mirror by backward extension.",
    primaryFrame.snapshot.imageDistanceOffscale ? "Near the focal condition, the image runs beyond the visible scale." : "",
  ].filter(Boolean);

  function handleAdjustObjectDistance(nextDistance: number) {
    setParam("objectDistance", Number(clamp(nextDistance, MIRRORS_MIN_OBJECT_DISTANCE, MIRRORS_MAX_OBJECT_DISTANCE).toFixed(2)));
  }

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(78,166,223,0.1),rgba(30,166,162,0.06))]"
      headerAside={
        <>
          <CompareLegend primaryLabel={primaryLabel} secondaryLabel={secondaryLabel} />
          {compareMirrorFamilyBadges}
          {previewBadge}
        </>
      }
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
        style={{ touchAction: "none", userSelect: "none" }}
        onPointerMove={(event) => drag.handlePointerMove(event.pointerId, event.clientX, event.clientY)}
        onPointerUp={(event) => drag.handlePointerUp(event.pointerId)}
        onPointerCancel={(event) => drag.handlePointerCancel(event.pointerId)}
        onLostPointerCapture={drag.handleLostPointerCapture}
      >
        <OpticsAxisStage layout={AXIS_LAYOUT}>
          {compareBodiesDiffer && secondaryFrame ? renderMirrorBody(secondaryFrame, { dashed: true, muted: true }) : null}
          {renderMirrorBody(primaryFrame, { label: `${primaryFrame.snapshot.mirrorFamily[0]?.toUpperCase() ?? ""}${primaryFrame.snapshot.mirrorFamily.slice(1)} mirror` })}
          {secondaryFrame
            ? renderSetup(secondaryFrame, {
                label: secondaryLabel ?? "Setup B",
                overlayValues,
                focusedOverlayId,
                dashed: true,
                muted: true,
                activePointerId: drag.activePointerId,
              })
            : null}
          {renderSetup(primaryFrame, {
            label: primaryLabel,
            interactive: canEditPrimary,
            overlayValues,
            focusedOverlayId,
            activePointerId: drag.activePointerId,
            onStartDrag: (pointerId, clientX, clientY) =>
              drag.startDrag(pointerId, "object", clientX, clientY),
            onAdjustObjectDistance: handleAdjustObjectDistance,
          })}
          <SimulationReadoutCard
            x={CARD_X}
            y={CARD_Y}
            width={CARD_WIDTH}
            title="Mirror state"
            setupLabel={compareEnabled ? primaryLabel : undefined}
            rows={metricRows}
            noteLines={noteLines}
          />
        </OpticsAxisStage>
      </svg>
    </SimulationSceneCard>
  );
}
