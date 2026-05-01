"use client";

import {
  clamp,
  formatMeasurement,
  formatNumber,
  OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM,
  sampleOpticalResolutionProfileSamples,
  sampleOpticalResolutionState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
  resolveOpticalResolutionParams,
} from "@/lib/physics";
import { SimulationReadoutCard, type SimulationReadoutRow } from "./SimulationReadoutCard";
import { SimulationReadoutSummary } from "./SimulationReadoutSummary";
import { SimulationAxisDragSurface } from "./primitives/SimulationAxisDragSurface";
import { CompareLegend, resolveCompareScene, SimulationPreviewBadge } from "./primitives/compare";
import { resolveOverlayOpacity } from "./primitives/overlay";
import { SimulationSceneCard } from "./primitives/scene-card";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type OpticalResolutionSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time?: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type OpticalResolutionFrame = {
  params: ReturnType<typeof resolveOpticalResolutionParams>;
  snapshot: ReturnType<typeof sampleOpticalResolutionState>;
  profileSamples: ReturnType<typeof sampleOpticalResolutionProfileSamples>;
};

const WIDTH = 820;
const HEIGHT = 336;
const SOURCE_X = 120;
const LENS_X = 334;
const LENS_WIDTH = 30;
const IMAGE_PLANE_X = 548;
const IMAGE_PLANE_WIDTH = 24;
const CARD_WIDTH = 228;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const SINGLE_ROW_CENTER = 176;
const COMPARE_ROW_CENTERS: Record<GraphSeriesSetupId, number> = {
  a: 104,
  b: 244,
};
const IMAGE_SCALE = 0.5;
const SOURCE_SCALE = 92;
const APERTURE_SCALE = 20;
const IMAGE_SEGMENTS = 82;

function mixColor(start: [number, number, number], end: [number, number, number], amount: number) {
  return start.map((channel, index) =>
    Math.round(channel + (end[index] - channel) * amount),
  ) as [number, number, number];
}

function toRgbString([red, green, blue]: [number, number, number]) {
  return `rgb(${red}, ${green}, ${blue})`;
}

function exposureColor(intensity: number) {
  const safeIntensity = clamp(intensity, 0, 1);
  const shadow: [number, number, number] = [17, 30, 40];
  const glow: [number, number, number] = [240, 171, 60];
  const highlight: [number, number, number] = [255, 248, 231];

  return toRgbString(
    safeIntensity < 0.65
      ? mixColor(shadow, glow, safeIntensity / 0.65)
      : mixColor(glow, highlight, (safeIntensity - 0.65) / 0.35),
  );
}

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  return resolveOverlayOpacity(focusedOverlayId, overlayId, 0.4);
}

function stageYFromImageUm(imageYUm: number, rowCenter: number) {
  return rowCenter - imageYUm * IMAGE_SCALE;
}

function imageUmFromStageY(stageY: number, rowCenter: number) {
  return clamp(
    (rowCenter - stageY) / IMAGE_SCALE,
    -OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM,
    OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM,
  );
}

function buildFrame(
  source: SimulationParams,
  probeYOverride?: number,
): OpticalResolutionFrame {
  const params = resolveOpticalResolutionParams({
    ...source,
    probeYUm: probeYOverride ?? source.probeYUm,
  });

  return {
    params,
    snapshot: sampleOpticalResolutionState(params),
    profileSamples: sampleOpticalResolutionProfileSamples(params, 161),
  };
}

function renderRowLabel(
  rowCenter: number,
  label: string,
  compareBadge?: "editing" | "locked",
) {
  return (
    <g transform={`translate(34 ${rowCenter - 94})`}>
      <rect
        x="0"
        y="0"
        width="126"
        height="24"
        rx="12"
        fill="rgba(255,253,247,0.92)"
        stroke="rgba(15,28,36,0.14)"
      />
      <text
        x="12"
        y="15"
        className="fill-ink-700 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        {label}
      </text>
      {compareBadge ? (
        <text
          x="116"
          y="15"
          textAnchor="end"
          className={
            compareBadge === "editing"
              ? "fill-teal-700 text-[9px] font-semibold uppercase tracking-[0.16em]"
              : "fill-ink-500 text-[9px] font-semibold uppercase tracking-[0.16em]"
          }
        >
          {compareBadge}
        </text>
      ) : null}
    </g>
  );
}

function renderSourcePair(frame: OpticalResolutionFrame, rowCenter: number) {
  const halfSeparation = (frame.params.separationMrad * SOURCE_SCALE) / 2;
  const pointAY = rowCenter - halfSeparation;
  const pointBY = rowCenter + halfSeparation;
  const apertureHalfHeight = (frame.params.apertureMm * APERTURE_SCALE) / 2;
  const lensTopY = rowCenter - apertureHalfHeight;
  const lensBottomY = rowCenter + apertureHalfHeight;

  return (
    <>
      <g opacity="0.86">
        <line
          x1={SOURCE_X + 16}
          x2={LENS_X - 10}
          y1={pointAY}
          y2={lensTopY}
          stroke="rgba(30,166,162,0.44)"
          strokeWidth="2.4"
        />
        <line
          x1={SOURCE_X + 16}
          x2={LENS_X - 10}
          y1={pointAY}
          y2={lensBottomY}
          stroke="rgba(30,166,162,0.44)"
          strokeWidth="2.4"
        />
        <line
          x1={SOURCE_X + 16}
          x2={LENS_X - 10}
          y1={pointBY}
          y2={lensTopY}
          stroke="rgba(241,102,89,0.44)"
          strokeWidth="2.4"
        />
        <line
          x1={SOURCE_X + 16}
          x2={LENS_X - 10}
          y1={pointBY}
          y2={lensBottomY}
          stroke="rgba(241,102,89,0.44)"
          strokeWidth="2.4"
        />
      </g>
      <circle cx={SOURCE_X} cy={pointAY} r="7" fill="rgba(30,166,162,0.95)" />
      <circle cx={SOURCE_X} cy={pointBY} r="7" fill="rgba(241,102,89,0.95)" />
      <text
        x={SOURCE_X - 26}
        y={rowCenter - 64}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        distant pair
      </text>
      <text x={SOURCE_X - 20} y={pointAY + 4} className="fill-paper text-[10px] font-semibold">
        A
      </text>
      <text x={SOURCE_X - 20} y={pointBY + 4} className="fill-paper text-[10px] font-semibold">
        B
      </text>
    </>
  );
}

function renderLens(frame: OpticalResolutionFrame, rowCenter: number) {
  const apertureHeight = frame.params.apertureMm * APERTURE_SCALE;
  const topY = rowCenter - 90;
  const bottomY = rowCenter + 90;
  const apertureTopY = rowCenter - apertureHeight / 2;
  const apertureBottomY = rowCenter + apertureHeight / 2;

  return (
    <>
      <rect
        x={LENS_X - LENS_WIDTH / 2}
        y={topY}
        width={LENS_WIDTH}
        height={apertureTopY - topY}
        rx="12"
        fill="rgba(78,166,223,0.78)"
      />
      <rect
        x={LENS_X - LENS_WIDTH / 2}
        y={apertureBottomY}
        width={LENS_WIDTH}
        height={bottomY - apertureBottomY}
        rx="12"
        fill="rgba(78,166,223,0.78)"
      />
      <rect
        x={LENS_X - LENS_WIDTH / 2}
        y={topY}
        width={LENS_WIDTH}
        height={bottomY - topY}
        rx="12"
        fill="none"
        stroke="rgba(15,28,36,0.32)"
        strokeWidth="2"
      />
      <rect
        x={LENS_X - 3}
        y={apertureTopY}
        width="6"
        height={apertureBottomY - apertureTopY}
        rx="3"
        fill="rgba(255,253,247,0.94)"
      />
      <text
        x={LENS_X}
        y={rowCenter - 104}
        textAnchor="middle"
        className="fill-sky-700 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        finite aperture
      </text>
    </>
  );
}

function renderApertureGuide(
  frame: OpticalResolutionFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const opacity = overlayWeight(focusedOverlayId, "apertureGuide");
  const guideX = LENS_X - 42;
  const apertureHeight = frame.params.apertureMm * APERTURE_SCALE;
  const topY = rowCenter - apertureHeight / 2;
  const bottomY = rowCenter + apertureHeight / 2;

  return (
    <g opacity={opacity}>
      <line
        x1={guideX}
        x2={guideX}
        y1={topY}
        y2={bottomY}
        stroke="rgba(30,166,162,0.9)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <line x1={guideX - 8} x2={guideX + 8} y1={topY} y2={topY} stroke="rgba(30,166,162,0.9)" strokeWidth="2.4" />
      <line
        x1={guideX - 8}
        x2={guideX + 8}
        y1={bottomY}
        y2={bottomY}
        stroke="rgba(30,166,162,0.9)"
        strokeWidth="2.4"
      />
      <text
        x={guideX - 12}
        y={rowCenter + 4}
        textAnchor="end"
        className="fill-teal-700 text-[11px] font-semibold"
      >
        D = {formatMeasurement(frame.snapshot.apertureMm, "mm")}
      </text>
    </g>
  );
}

function renderImageStrip(
  frame: OpticalResolutionFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const stripX = IMAGE_PLANE_X - IMAGE_PLANE_WIDTH / 2;
  const stripTopY = stageYFromImageUm(OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM, rowCenter);
  const segmentHeight =
    (OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM * 2 * IMAGE_SCALE) / IMAGE_SEGMENTS;

  return (
    <>
      <rect
        x={stripX - 8}
        y={stripTopY - 10}
        width={IMAGE_PLANE_WIDTH + 16}
        height={OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM * 2 * IMAGE_SCALE + 20}
        rx="18"
        fill="rgba(15,28,36,0.05)"
      />
      <text
        x={IMAGE_PLANE_X}
        y={rowCenter - 106}
        textAnchor="middle"
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        image plane
      </text>
      {Array.from({ length: IMAGE_SEGMENTS }, (_, index) => {
        const amount = index / Math.max(IMAGE_SEGMENTS - 1, 1);
        const imageYUm =
          OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM -
          amount * OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM * 2;
        const sample =
          frame.profileSamples.find(
            (point) => Math.abs(point.imageYUm - imageYUm) <= 1.5,
          ) ?? frame.profileSamples[index]!;

        return (
          <rect
            key={`strip-${rowCenter}-${index}`}
            x={stripX}
            y={stripTopY + index * segmentHeight}
            width={IMAGE_PLANE_WIDTH}
            height={segmentHeight + 0.8}
            fill={exposureColor(sample.normalizedCombinedExposure)}
            opacity={focusedOverlayId === "componentProfiles" ? 0.92 : 0.98}
          />
        );
      })}
      <rect
        x={stripX}
        y={stripTopY}
        width={IMAGE_PLANE_WIDTH}
        height={OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM * 2 * IMAGE_SCALE}
        rx="12"
        fill="none"
        stroke="rgba(15,28,36,0.2)"
        strokeWidth="1.6"
      />
    </>
  );
}

function renderComponentProfileGuide(
  frame: OpticalResolutionFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const opacity = overlayWeight(focusedOverlayId, "componentProfiles");
  const pointAY = stageYFromImageUm(frame.snapshot.pointACenterUm, rowCenter);
  const pointBY = stageYFromImageUm(frame.snapshot.pointBCenterUm, rowCenter);

  return (
    <g opacity={opacity}>
      <line
        x1={LENS_X + 22}
        x2={IMAGE_PLANE_X + 28}
        y1={pointAY}
        y2={pointAY}
        stroke="rgba(30,166,162,0.86)"
        strokeWidth="2"
        strokeDasharray="7 6"
      />
      <line
        x1={LENS_X + 22}
        x2={IMAGE_PLANE_X + 28}
        y1={pointBY}
        y2={pointBY}
        stroke="rgba(241,102,89,0.86)"
        strokeWidth="2"
        strokeDasharray="7 6"
      />
      <text x={IMAGE_PLANE_X + 34} y={pointAY + 4} className="fill-teal-700 text-[10px] font-semibold">
        A center
      </text>
      <text x={IMAGE_PLANE_X + 34} y={pointBY + 4} className="fill-coral-700 text-[10px] font-semibold">
        B center
      </text>
    </g>
  );
}

function renderRayleighGuide(
  frame: OpticalResolutionFrame,
  rowCenter: number,
  focusedOverlayId?: string | null,
) {
  const opacity = overlayWeight(focusedOverlayId, "rayleighGuide");
  const pointAY = stageYFromImageUm(frame.snapshot.pointACenterUm, rowCenter);
  const pointBY = stageYFromImageUm(frame.snapshot.pointBCenterUm, rowCenter);
  const pointAFirstMinimumY = stageYFromImageUm(
    frame.snapshot.pointACenterUm + frame.snapshot.airyRadiusUm,
    rowCenter,
  );
  const pointBFirstMinimumY = stageYFromImageUm(
    frame.snapshot.pointBCenterUm - frame.snapshot.airyRadiusUm,
    rowCenter,
  );

  return (
    <g opacity={opacity}>
      <line
        x1={IMAGE_PLANE_X - 34}
        x2={IMAGE_PLANE_X + 34}
        y1={pointAY}
        y2={pointAY}
        stroke="rgba(30,166,162,0.9)"
        strokeWidth="2"
      />
      <line
        x1={IMAGE_PLANE_X - 34}
        x2={IMAGE_PLANE_X + 34}
        y1={pointBY}
        y2={pointBY}
        stroke="rgba(241,102,89,0.9)"
        strokeWidth="2"
      />
      <line
        x1={IMAGE_PLANE_X + 42}
        x2={IMAGE_PLANE_X + 42}
        y1={pointAFirstMinimumY}
        y2={pointAY}
        stroke="rgba(240,171,60,0.92)"
        strokeWidth="2.2"
        strokeDasharray="6 5"
      />
      <line
        x1={IMAGE_PLANE_X + 42}
        x2={IMAGE_PLANE_X + 42}
        y1={pointBY}
        y2={pointBFirstMinimumY}
        stroke="rgba(240,171,60,0.92)"
        strokeWidth="2.2"
        strokeDasharray="6 5"
      />
      <text
        x={IMAGE_PLANE_X + 52}
        y={rowCenter + 4}
        className="fill-amber-700 text-[10px] font-semibold"
      >
        r_R ~ {formatMeasurement(frame.snapshot.airyRadiusUm, "um")}
      </text>
    </g>
  );
}

function renderDetector(
  frame: OpticalResolutionFrame,
  rowCenter: number,
  options: {
    interactive?: boolean;
    onAdjustProbe?: (nextProbeYUm: number) => void;
  },
) {
  const probeY = stageYFromImageUm(frame.snapshot.probeYUm, rowCenter);
  const probeX = IMAGE_PLANE_X + IMAGE_PLANE_WIDTH / 2 + 26;

  return (
    <>
      <line
        x1={IMAGE_PLANE_X + IMAGE_PLANE_WIDTH / 2 + 2}
        x2={probeX - 8}
        y1={probeY}
        y2={probeY}
        stroke="rgba(15,28,36,0.48)"
        strokeWidth="1.8"
      />
      <circle cx={probeX} cy={probeY} r="7" fill="rgba(15,28,36,0.9)" />
      <text
        x={probeX + 14}
        y={probeY + 4}
        className="fill-ink-700 text-[10px] font-semibold"
      >
        sample {formatNumber(frame.snapshot.probeExposure)}
      </text>
      {options.interactive ? (
        <SimulationAxisDragSurface
          axis="y"
          svgWidth={WIDTH}
          svgHeight={HEIGHT}
          value={frame.snapshot.probeYUm}
          region={{
            x: IMAGE_PLANE_X - 22,
            y: stageYFromImageUm(OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM, rowCenter) - 12,
            width: IMAGE_PLANE_WIDTH + 74,
            height: OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM * 2 * IMAGE_SCALE + 24,
          }}
          ariaLabel="Move detector height"
          cursor="ns-resize"
          step={2}
          resolveValue={(svgY) => imageUmFromStageY(svgY, rowCenter)}
          onChange={(nextValue) => options.onAdjustProbe?.(nextValue)}
          homeValue={0}
          endValue={OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM}
        />
      ) : null}
    </>
  );
}

function renderRow(
  frame: OpticalResolutionFrame,
  rowCenter: number,
  options: {
    label: string;
    compareBadge?: "editing" | "locked";
    overlayValues?: Record<string, boolean>;
    focusedOverlayId?: string | null;
    interactive?: boolean;
    muted?: boolean;
    onAdjustProbe?: (nextProbeYUm: number) => void;
  },
) {
  const opacity = options.muted ? 0.35 : 1;

  return (
    <g opacity={opacity}>
      {renderRowLabel(rowCenter, options.label, options.compareBadge)}
      {renderSourcePair(frame, rowCenter)}
      {renderLens(frame, rowCenter)}
      {options.overlayValues?.apertureGuide
        ? renderApertureGuide(frame, rowCenter, options.focusedOverlayId)
        : null}
      {renderImageStrip(frame, rowCenter, options.focusedOverlayId)}
      {options.overlayValues?.componentProfiles
        ? renderComponentProfileGuide(frame, rowCenter, options.focusedOverlayId)
        : null}
      {options.overlayValues?.rayleighGuide
        ? renderRayleighGuide(frame, rowCenter, options.focusedOverlayId)
        : null}
      {renderDetector(frame, rowCenter, {
        interactive: options.interactive,
        onAdjustProbe: options.onAdjustProbe,
      })}
    </g>
  );
}

export function OpticalResolutionSimulation({
  concept,
  params,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: OpticalResolutionSimulationProps) {
  const previewProbeYUm =
    graphPreview?.kind === "response" && graphPreview.graphId === "image-profile"
      ? clamp(
          graphPreview.point.x,
          -OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM,
          OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM,
        )
      : undefined;
  const activeFrame = buildFrame(params, previewProbeYUm);
  const compareAFrame = compare ? buildFrame(compare.setupA, previewProbeYUm) : null;
  const compareBFrame = compare ? buildFrame(compare.setupB, previewProbeYUm) : null;
  const { compareEnabled, previewedSetup, primaryFrame, primaryLabel, secondaryLabel } =
    resolveCompareScene({
      compare,
      graphPreview,
      activeFrame,
      frameA: compareAFrame,
      frameB: compareBFrame,
      liveLabel: "Live setup",
    });
  const previewBadge =
    graphPreview?.kind === "response" ? (
      <SimulationPreviewBadge tone="sky">
        preview image y = {formatMeasurement(previewProbeYUm ?? 0, "um")}
      </SimulationPreviewBadge>
    ) : null;
  const metricRows: SimulationReadoutRow[] = [
    {
      label: "theta_R",
      value: formatMeasurement(primaryFrame.snapshot.rayleighLimitMrad, "mrad"),
    },
    {
      label: "Delta theta",
      value: formatMeasurement(primaryFrame.snapshot.separationMrad, "mrad"),
    },
    {
      label: "ratio",
      value: formatNumber(primaryFrame.snapshot.separationRatio),
    },
    {
      label: "dip / peak",
      value: formatNumber(primaryFrame.snapshot.centerDipRatio),
    },
    {
      label: "sample",
      value: formatNumber(primaryFrame.snapshot.probeExposure),
    },
  ];
  const noteLines = [
    primaryFrame.snapshot.resolutionLabel === "merged"
      ? "The current pair is still below the Rayleigh threshold, so the central dip has mostly filled in."
      : primaryFrame.snapshot.resolutionLabel === "threshold"
        ? "The pair is near the Rayleigh threshold, so the split is just beginning to show."
        : "The pair now sits above the Rayleigh threshold, so a distinct dip separates the peaks.",
    `Airy radius on the image plane is about ${formatMeasurement(primaryFrame.snapshot.airyRadiusUm, "um")} while the point spacing is ${formatMeasurement(primaryFrame.snapshot.imageSeparationUm, "um")}.`,
  ];

  function handleAdjustProbe(nextProbeYUm: number) {
    setParam("probeYUm", Number(nextProbeYUm.toFixed(1)));
  }

  return (
    <SimulationSceneCard
      title={concept.title}
      description={concept.summary}
      headerClassName="bg-[linear-gradient(135deg,rgba(78,166,223,0.12),rgba(240,171,60,0.1))]"
      headerAside={
        <>
          {previewBadge}
          {compareEnabled ? (
            <CompareLegend primaryLabel={primaryLabel} secondaryLabel={secondaryLabel} />
          ) : (
            <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-600">
              {primaryLabel}
            </span>
          )}
        </>
      }
    >
      <div className="bg-[radial-gradient(circle_at_top,rgba(78,166,223,0.08),rgba(255,255,255,0.85)_62%)]">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
        >
          <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.45)" />
          {compareEnabled ? (
            <>
              {renderRow(compareAFrame!, COMPARE_ROW_CENTERS.a, {
                label: compare?.labelA ?? "Setup A",
                compareBadge: compare?.activeTarget === "a" ? "editing" : "locked",
                overlayValues,
                focusedOverlayId,
                interactive: compare?.activeTarget === "a",
                muted: previewedSetup === "b",
                onAdjustProbe: handleAdjustProbe,
              })}
              {renderRow(compareBFrame!, COMPARE_ROW_CENTERS.b, {
                label: compare?.labelB ?? "Setup B",
                compareBadge: compare?.activeTarget === "b" ? "editing" : "locked",
                overlayValues,
                focusedOverlayId,
                interactive: compare?.activeTarget === "b",
                muted: previewedSetup === "a",
                onAdjustProbe: handleAdjustProbe,
              })}
            </>
          ) : (
            renderRow(activeFrame, SINGLE_ROW_CENTER, {
              label: "Live imaging bench",
              overlayValues,
              focusedOverlayId,
              interactive: true,
              onAdjustProbe: handleAdjustProbe,
            })
          )}
          <SimulationReadoutCard
            x={CARD_X}
            y={CARD_Y}
            width={CARD_WIDTH}
            title={compareEnabled ? `${primaryLabel} state` : "Resolution state"}
            rows={metricRows}
            noteLines={noteLines}
          />
        </svg>
        <SimulationReadoutSummary
          title={compareEnabled ? `${primaryLabel} state` : "Resolution state"}
          rows={metricRows}
          noteLines={noteLines}
          className="mx-3 mb-3 mt-0 md:hidden"
        />
      </div>
    </SimulationSceneCard>
  );
}
