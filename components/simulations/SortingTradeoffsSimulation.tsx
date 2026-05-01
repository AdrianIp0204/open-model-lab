"use client";

import {
  formatNumber,
  sampleSortingTradeoffsState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import { AlgorithmArrayLane } from "./primitives/algorithm-array";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type SortingTradeoffsSimulationProps = {
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

export function SortingTradeoffsSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: SortingTradeoffsSimulationProps) {
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const previewTime = resolvePreviewTime(time, graphPreview);
  const primaryParams =
    compare && previewedSetup === "b" ? compare.setupB : compare?.setupA ?? params;
  const secondaryParams =
    compare && previewedSetup === "b" ? compare.setupA : compare?.setupB ?? null;
  const primary = sampleSortingTradeoffsState(primaryParams, previewTime);
  const secondary = secondaryParams
    ? sampleSortingTradeoffsState(secondaryParams, previewTime)
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
    settledRegion: overlayValues?.settledRegion !== false,
    pointerMarkers: overlayValues?.pointerMarkers !== false,
  };
  const readoutRows = [
    { label: "algorithm", value: primary.algorithmLabel },
    { label: "pattern", value: primary.patternLabel },
    { label: "size", value: formatNumber(primary.arraySize, 0) },
    { label: "comparisons", value: formatNumber(primary.comparisons, 0) },
    { label: "writes", value: formatNumber(primary.writeCount, 0) },
    { label: "disorder left", value: formatNumber(primary.inversionsRemaining, 0) },
  ];
  const noteLines = [
    primary.stepLabel,
    primary.statusLine,
    compare
      ? "The same paused time is applied to both saved scenes."
      : "Change the algorithm or the input order, then watch the step pattern change.",
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(15,28,36,0.08),rgba(78,166,223,0.12))] px-3 py-2">
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
          height={secondary ? 148 : 212}
          title={secondary ? primaryLabel : "Live array"}
          subtitle={`${primary.algorithmLabel} on ${primary.patternLabel.toLowerCase()} input`}
          summaryChip={`C ${primary.comparisons} | W ${primary.writeCount}`}
          values={primary.values}
          highlights={primary.highlights}
          settledIndices={primary.settledIndices}
          pointers={primary.pointers}
          interval={primary.interval}
          focusedOverlayId={focusedOverlayId}
          overlayValues={overlayState}
        />
        {secondary ? (
          <AlgorithmArrayLane
            x={24}
            y={222}
            width={628}
            height={148}
            title={secondaryLabel ?? "Variant"}
            subtitle={`${secondary.algorithmLabel} on ${secondary.patternLabel.toLowerCase()} input`}
            summaryChip={`C ${secondary.comparisons} | W ${secondary.writeCount}`}
            values={secondary.values}
            highlights={secondary.highlights}
            settledIndices={secondary.settledIndices}
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
          title="Sorting readout"
          setupLabel={primaryLabel}
          rows={readoutRows}
          noteLines={noteLines}
        />
      </svg>
    </section>
  );
}
