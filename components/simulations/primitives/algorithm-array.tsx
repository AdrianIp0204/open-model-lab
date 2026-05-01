"use client";

type AlgorithmArrayTone = "teal" | "amber" | "coral" | "sky" | "ink";

export type AlgorithmArrayHighlight = {
  index: number;
  tone: AlgorithmArrayTone;
  outline?: boolean;
};

export type AlgorithmArrayPointer = {
  index: number;
  label: string;
  tone: AlgorithmArrayTone;
};

type AlgorithmArrayLaneProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle: string;
  values: number[];
  summaryChip?: string | null;
  highlights?: AlgorithmArrayHighlight[];
  settledIndices?: number[];
  pointers?: AlgorithmArrayPointer[];
  interval?: { start: number; end: number } | null;
  ghost?: boolean;
  showValues?: boolean;
  focusedOverlayId?: string | null;
  overlayValues?: {
    intervalWindow?: boolean;
    settledRegion?: boolean;
    pointerMarkers?: boolean;
  };
};

const toneColors: Record<
  AlgorithmArrayTone,
  { fill: string; softFill: string; stroke: string; text: string }
> = {
  teal: {
    fill: "rgba(30,166,162,0.88)",
    softFill: "rgba(30,166,162,0.14)",
    stroke: "rgba(30,166,162,0.82)",
    text: "#0f766e",
  },
  amber: {
    fill: "rgba(240,171,60,0.9)",
    softFill: "rgba(240,171,60,0.16)",
    stroke: "rgba(217,119,6,0.84)",
    text: "#b45309",
  },
  coral: {
    fill: "rgba(241,102,89,0.9)",
    softFill: "rgba(241,102,89,0.16)",
    stroke: "rgba(225,78,54,0.82)",
    text: "#c2410c",
  },
  sky: {
    fill: "rgba(78,166,223,0.88)",
    softFill: "rgba(78,166,223,0.16)",
    stroke: "rgba(3,105,161,0.82)",
    text: "#0369a1",
  },
  ink: {
    fill: "rgba(15,28,36,0.82)",
    softFill: "rgba(15,28,36,0.12)",
    stroke: "rgba(15,28,36,0.74)",
    text: "#0f172a",
  },
};

function overlayOpacity(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.3;
}

export function AlgorithmArrayLane({
  x,
  y,
  width,
  height,
  title,
  subtitle,
  values,
  summaryChip,
  highlights = [],
  settledIndices = [],
  pointers = [],
  interval = null,
  ghost = false,
  showValues = true,
  focusedOverlayId,
  overlayValues,
}: AlgorithmArrayLaneProps) {
  const cardOpacity = ghost ? 0.62 : 1;
  const panelFill = ghost ? "rgba(255,255,255,0.54)" : "rgba(255,255,255,0.92)";
  const panelStroke = ghost ? "rgba(15,28,36,0.16)" : "rgba(15,28,36,0.12)";
  const laneLeft = x + 18;
  const laneRight = x + width - 18;
  const laneTop = y + 58;
  const laneBottom = y + height - 26;
  const laneWidth = laneRight - laneLeft;
  const laneHeight = laneBottom - laneTop;
  const cellWidth = laneWidth / Math.max(values.length, 1);
  const barMaxHeight = laneHeight - 30;
  const maxValue = Math.max(...values, 1);
  const settledSet = new Set(settledIndices);
  const highlightMap = new Map<number, AlgorithmArrayHighlight[]>();
  const pointerGroups = new Map<number, AlgorithmArrayPointer[]>();

  for (const highlight of highlights) {
    const group = highlightMap.get(highlight.index) ?? [];
    group.push(highlight);
    highlightMap.set(highlight.index, group);
  }

  for (const pointer of pointers) {
    const group = pointerGroups.get(pointer.index) ?? [];
    group.push(pointer);
    pointerGroups.set(pointer.index, group);
  }

  return (
    <g opacity={cardOpacity}>
      <g transform={`translate(${x} ${y})`}>
        <rect
          width={width}
          height={height}
          rx="24"
          fill={panelFill}
          stroke={panelStroke}
          strokeDasharray={ghost ? "9 7" : undefined}
        />
        <text
          x="18"
          y="24"
          className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
        >
          {title}
        </text>
        <text x="18" y="46" className="fill-ink-950 text-[14px] font-semibold">
          {subtitle}
        </text>
        {summaryChip ? (
          <g transform={`translate(${width - 18} 19)`}>
            <rect
              x={-(Math.max(84, summaryChip.length * 6 + 22))}
              y="-10"
              width={Math.max(84, summaryChip.length * 6 + 22)}
              height="20"
              rx="10"
              fill="rgba(15,28,36,0.08)"
              stroke="rgba(15,28,36,0.12)"
            />
            <text
              x={-(Math.max(84, summaryChip.length * 6 + 22) / 2)}
              y="4"
              textAnchor="middle"
              className="fill-ink-700 text-[9px] font-semibold uppercase tracking-[0.14em]"
            >
              {summaryChip}
            </text>
          </g>
        ) : null}
      </g>

      {overlayValues?.intervalWindow !== false && interval ? (
        <rect
          x={laneLeft + cellWidth * interval.start + 2}
          y={laneTop - 6}
          width={Math.max(18, cellWidth * (interval.end - interval.start + 1) - 4)}
          height={laneHeight + 8}
          rx="18"
          fill="rgba(78,166,223,0.1)"
          stroke="rgba(78,166,223,0.24)"
          opacity={overlayOpacity(focusedOverlayId, "intervalWindow")}
        />
      ) : null}

      {values.map((value, index) => {
        const cellX = laneLeft + cellWidth * index;
        const barHeight = (value / Math.max(maxValue, 1)) * barMaxHeight;
        const barY = laneBottom - 18 - barHeight;
        const labelX = cellX + cellWidth / 2;
        const highlightsForIndex = highlightMap.get(index) ?? [];
        const settled = settledSet.has(index);
        const primaryHighlight = highlightsForIndex[0] ?? null;
        const primaryTone = primaryHighlight ? toneColors[primaryHighlight.tone] : null;

        return (
          <g key={`algorithm-array-cell-${index}`}>
            {overlayValues?.settledRegion !== false && settled ? (
              <rect
                x={cellX + 2}
                y={laneTop + 8}
                width={Math.max(14, cellWidth - 4)}
                height={laneHeight - 18}
                rx="16"
                fill="rgba(30,166,162,0.1)"
                opacity={overlayOpacity(focusedOverlayId, "settledRegion")}
              />
            ) : null}
            <rect
              x={cellX + 4}
              y={laneBottom - 18}
              width={Math.max(12, cellWidth - 8)}
              height="2"
              rx="1"
              fill="rgba(15,28,36,0.14)"
            />
            <rect
              x={cellX + 6}
              y={barY}
              width={Math.max(10, cellWidth - 12)}
              height={Math.max(12, barHeight)}
              rx="10"
              fill={
                primaryHighlight && !primaryHighlight.outline
                  ? primaryTone?.fill
                  : settled
                    ? "rgba(30,166,162,0.68)"
                    : ghost
                      ? "rgba(78,166,223,0.36)"
                      : "rgba(78,166,223,0.76)"
              }
              stroke={
                primaryHighlight && primaryHighlight.outline
                  ? primaryTone?.stroke
                  : "rgba(15,28,36,0.12)"
              }
              strokeWidth={primaryHighlight && primaryHighlight.outline ? 2 : 1}
              strokeDasharray={ghost ? "6 4" : undefined}
            />
            {showValues ? (
              <text
                x={labelX}
                y={laneBottom}
                textAnchor="middle"
                className="fill-ink-600 text-[10px] font-semibold"
              >
                {value}
              </text>
            ) : null}
            <text
              x={labelX}
              y={laneTop + laneHeight + 12}
              textAnchor="middle"
              className="fill-ink-400 text-[9px] font-semibold uppercase tracking-[0.12em]"
            >
              {index}
            </text>
          </g>
        );
      })}

      {overlayValues?.pointerMarkers !== false
        ? Array.from(pointerGroups.entries()).map(([index, markers]) => {
            const pointerX = laneLeft + cellWidth * index + cellWidth / 2;

            return markers.map((pointer, markerIndex) => {
              const tone = toneColors[pointer.tone];
              const bubbleWidth = Math.max(42, pointer.label.length * 6 + 20);
              const bubbleY = laneTop - 22 - markerIndex * 22;

              return (
                <g
                  key={`algorithm-array-pointer-${index}-${pointer.label}-${markerIndex}`}
                  opacity={overlayOpacity(focusedOverlayId, "pointerMarkers")}
                >
                  <line
                    x1={pointerX}
                    x2={pointerX}
                    y1={bubbleY + 9}
                    y2={laneTop + 4}
                    stroke={tone.stroke}
                    strokeWidth="1.8"
                    strokeDasharray="4 4"
                  />
                  <rect
                    x={pointerX - bubbleWidth / 2}
                    y={bubbleY - 10}
                    width={bubbleWidth}
                    height="20"
                    rx="10"
                    fill={tone.softFill}
                    stroke={tone.stroke}
                  />
                  <text
                    x={pointerX}
                    y={bubbleY + 4}
                    textAnchor="middle"
                    className="text-[9px] font-semibold uppercase tracking-[0.12em]"
                    style={{ fill: tone.text }}
                  >
                    {pointer.label}
                  </text>
                </g>
              );
            });
          })
        : null}
    </g>
  );
}
