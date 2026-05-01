"use client";

import {
  formatNumber,
  sampleBinarySearchHalvingState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import {
  AlgorithmArrayLane,
  type AlgorithmArrayHighlight,
} from "./primitives/algorithm-array";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type BinarySearchHalvingSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 920;
const HEIGHT = 430;
const CARD_X = 676;
const CARD_Y = 90;
const CARD_WIDTH = 216;

function resolvePreviewTime(time: number, preview: GraphStagePreview | null | undefined) {
  if (!preview || preview.kind !== "time") {
    return time;
  }

  return preview.time;
}

function resolvePreviewLabel(preview: GraphStagePreview | null | undefined) {
  if (!preview || preview.kind !== "time") {
    return null;
  }

  return `preview t = ${formatNumber(preview.time)}`;
}

export function BinarySearchHalvingSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: BinarySearchHalvingSimulationProps) {
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const previewTime = resolvePreviewTime(time, graphPreview);
  const primaryParams =
    compare && previewedSetup === "b" ? compare.setupB : compare?.setupA ?? params;
  const secondaryParams =
    compare && previewedSetup === "b" ? compare.setupA : compare?.setupB ?? null;
  const primary = sampleBinarySearchHalvingState(primaryParams, previewTime);
  const secondary = secondaryParams
    ? sampleBinarySearchHalvingState(secondaryParams, previewTime)
    : null;
  const primaryLabel = compare
    ? previewedSetup === "b"
      ? compare.labelB ?? "Variant"
      : compare.labelA ?? "Baseline"
    : "Live";
  const secondaryLabel = compare
    ? previewedSetup === "b"
      ? compare.labelA ?? "Baseline"
      : compare.labelB ?? "Variant"
    : null;
  const previewLabel = resolvePreviewLabel(graphPreview);
  const overlayState = {
    intervalWindow: overlayValues?.intervalWindow !== false,
    settledRegion: false,
    pointerMarkers: overlayValues?.pointerMarkers !== false,
  };
  const linearLaneHighlights: AlgorithmArrayHighlight[] = primary.linearVisitedIndices.map((index) => ({
    index,
    tone: "amber" as const,
    outline: true,
  }));
  linearLaneHighlights.push({
    index: primary.targetIndex,
    tone: "coral" as const,
    outline: true,
  });
  const readoutRows = [
    { label: "target", value: formatNumber(primary.targetValue, 0) },
    { label: "checks", value: formatNumber(primary.comparisons, 0) },
    { label: "interval", value: formatNumber(primary.intervalWidth, 0) },
    { label: "linear need", value: formatNumber(primary.targetIndex + 1, 0) },
    { label: "advantage", value: formatNumber(primary.binaryLead, 0) },
    { label: "found", value: primary.found ? "yes" : "not yet" },
  ];
  const noteLines = [
    primary.stepLabel,
    primary.statusLine,
    compare
      ? "Compare how two saved search scenes shrink their intervals at the same paused time."
      : primary.linearContrast
        ? "The ghost lane shows how far a one-by-one scan would have reached by the same step count."
        : "Turn on linear contrast if you want a direct one-by-one comparison.",
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(15,28,36,0.08),rgba(30,166,162,0.12))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              {concept.summary}
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
          </div>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
      >
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.58)" />
        <AlgorithmArrayLane
          x={24}
          y={46}
          width={628}
          height={secondary ? 148 : primary.linearContrast ? 154 : 188}
          title={secondary ? primaryLabel : "Live search"}
          subtitle={`Target ${primary.targetValue} in ${primary.arraySize} ordered values`}
          summaryChip={`checks ${primary.comparisons}`}
          values={primary.values}
          highlights={primary.highlights}
          pointers={primary.pointers}
          interval={primary.interval}
          focusedOverlayId={focusedOverlayId}
          overlayValues={overlayState}
        />
        {!secondary && primary.linearContrast ? (
          <AlgorithmArrayLane
            x={24}
            y={220}
            width={628}
            height={120}
            title="Linear contrast"
            subtitle="One-by-one scanning reaches the target much more slowly"
            summaryChip={`checks ${primary.linearVisitedIndices.length}`}
            values={primary.values}
            highlights={linearLaneHighlights}
            pointers={
              primary.linearVisitedIndices.length
                ? [
                    {
                      index: primary.linearVisitedIndices.at(-1) ?? 0,
                      label: "scan",
                      tone: "amber",
                    },
                    { index: primary.targetIndex, label: "target", tone: "coral" },
                  ]
                : [{ index: 0, label: "start", tone: "amber" }]
            }
            interval={{
              start: 0,
              end:
                primary.linearVisitedIndices.length > 0
                  ? primary.linearVisitedIndices.at(-1) ?? 0
                  : 0,
            }}
            ghost
            focusedOverlayId={focusedOverlayId}
            overlayValues={{
              intervalWindow: overlayValues?.linearContrast !== false,
              settledRegion: false,
              pointerMarkers: overlayValues?.pointerMarkers !== false,
            }}
          />
        ) : null}
        {secondary ? (
          <AlgorithmArrayLane
            x={24}
            y={222}
            width={628}
            height={148}
            title={secondaryLabel ?? "Variant"}
            subtitle={`Target ${secondary.targetValue} in ${secondary.arraySize} ordered values`}
            summaryChip={`checks ${secondary.comparisons}`}
            values={secondary.values}
            highlights={secondary.highlights}
            pointers={secondary.pointers}
            interval={secondary.interval}
            ghost
            focusedOverlayId={focusedOverlayId}
            overlayValues={overlayState}
          />
        ) : null}
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Binary-search readout"
          setupLabel={primaryLabel}
          rows={readoutRows}
          noteLines={noteLines}
        />
      </svg>
    </section>
  );
}
