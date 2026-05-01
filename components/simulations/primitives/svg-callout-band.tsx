"use client";

type SvgCalloutTone = "ink" | "sky" | "teal" | "coral" | "amber";

export type SvgCalloutBandItem = {
  id: string;
  text: string;
  anchorX: number;
  anchorY: number;
  tone?: SvgCalloutTone;
  minWidth?: number;
  maxWidth?: number;
  priority?: number;
  testId?: string;
};

type PositionedCallout = SvgCalloutBandItem & {
  centerX: number;
  centerY: number;
  row: number;
  width: number;
};

type SvgCalloutBandProps = {
  items: SvgCalloutBandItem[];
  minX: number;
  maxX: number;
  baseY: number;
  direction: "up" | "down";
  rowGap?: number;
  gap?: number;
  maxRows?: number;
};

type LayoutSvgCalloutBandOptions = {
  minX: number;
  maxX: number;
  baseY: number;
  direction: "up" | "down";
  rowGap?: number;
  gap?: number;
  maxRows?: number;
};

const CALLOUT_HEIGHT = 20;
const DEFAULT_GAP = 8;
const DEFAULT_ROW_GAP = 24;
const DEFAULT_MAX_ROWS = 3;

const TONE_STYLES: Record<
  SvgCalloutTone,
  {
    fill: string;
    stroke: string;
    text: string;
    leader: string;
  }
> = {
  ink: {
    fill: "rgba(255,253,247,0.96)",
    stroke: "rgba(15,28,36,0.16)",
    text: "#31424c",
    leader: "rgba(15,28,36,0.2)",
  },
  sky: {
    fill: "rgba(78,166,223,0.12)",
    stroke: "rgba(78,166,223,0.34)",
    text: "#2d7aa8",
    leader: "rgba(78,166,223,0.4)",
  },
  teal: {
    fill: "rgba(30,166,162,0.12)",
    stroke: "rgba(30,166,162,0.34)",
    text: "#167f7c",
    leader: "rgba(30,166,162,0.42)",
  },
  coral: {
    fill: "rgba(241,102,89,0.12)",
    stroke: "rgba(241,102,89,0.34)",
    text: "#c04b3d",
    leader: "rgba(241,102,89,0.42)",
  },
  amber: {
    fill: "rgba(240,171,60,0.14)",
    stroke: "rgba(184,112,0,0.32)",
    text: "#a35f04",
    leader: "rgba(184,112,0,0.36)",
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function estimateCalloutWidth(item: SvgCalloutBandItem) {
  const estimated = 22 + item.text.length * 6.15;

  return clamp(
    Math.round(estimated),
    item.minWidth ?? 54,
    item.maxWidth ?? 176,
  );
}

export function layoutSvgCalloutBand(
  items: SvgCalloutBandItem[],
  options: LayoutSvgCalloutBandOptions,
): PositionedCallout[] {
  const gap = options.gap ?? DEFAULT_GAP;
  const rowGap = options.rowGap ?? DEFAULT_ROW_GAP;
  const maxRows = Math.max(1, options.maxRows ?? DEFAULT_MAX_ROWS);
  const rows = Array.from({ length: maxRows }, () => ({ lastRight: Number.NEGATIVE_INFINITY }));
  const sorted = items
    .filter((item) => item.text.trim().length > 0)
    .slice()
    .sort((left, right) => {
      if (left.anchorX !== right.anchorX) {
        return left.anchorX - right.anchorX;
      }
      if ((left.priority ?? 0) !== (right.priority ?? 0)) {
        return (right.priority ?? 0) - (left.priority ?? 0);
      }
      return left.id.localeCompare(right.id);
    });

  return sorted.map((item) => {
    const width = estimateCalloutWidth(item);
    const halfWidth = width / 2;
    const minCenterX = options.minX + halfWidth;
    const maxCenterX = options.maxX - halfWidth;
    let resolvedRow = 0;
    let centerX = clamp(item.anchorX, minCenterX, maxCenterX);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const proposedX = Math.max(centerX, row.lastRight + gap + halfWidth);

      if (proposedX <= maxCenterX) {
        resolvedRow = rowIndex;
        centerX = proposedX;
        row.lastRight = centerX + halfWidth;
        break;
      }

      if (rowIndex === rows.length - 1) {
        resolvedRow = rowIndex;
        centerX = maxCenterX;
        row.lastRight = centerX + halfWidth;
      }
    }

    const centerY =
      options.direction === "up"
        ? options.baseY - resolvedRow * rowGap
        : options.baseY + resolvedRow * rowGap;

    return {
      ...item,
      centerX,
      centerY,
      row: resolvedRow,
      width,
    };
  });
}

function renderLeader(callout: PositionedCallout, direction: "up" | "down", leaderColor: string) {
  const boxHalfHeight = CALLOUT_HEIGHT / 2;
  const boxEdgeY = direction === "up" ? callout.centerY + boxHalfHeight : callout.centerY - boxHalfHeight;
  const elbowY = direction === "up" ? boxEdgeY + 7 : boxEdgeY - 7;

  return (
    <>
      <polyline
        points={`${callout.anchorX},${callout.anchorY} ${callout.anchorX},${elbowY} ${callout.centerX},${elbowY} ${callout.centerX},${boxEdgeY}`}
        fill="none"
        stroke={leaderColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={callout.anchorX} cy={callout.anchorY} r="2.2" fill={leaderColor} />
    </>
  );
}

export function SvgCalloutBand({
  items,
  minX,
  maxX,
  baseY,
  direction,
  rowGap,
  gap,
  maxRows,
}: SvgCalloutBandProps) {
  const positioned = layoutSvgCalloutBand(items, {
    minX,
    maxX,
    baseY,
    direction,
    rowGap,
    gap,
    maxRows,
  });

  if (!positioned.length) {
    return null;
  }

  return (
    <g pointerEvents="none">
      {positioned.map((callout) => {
        const tone = TONE_STYLES[callout.tone ?? "ink"];
        const boxLeft = callout.centerX - callout.width / 2;
        const boxTop = callout.centerY - CALLOUT_HEIGHT / 2;

        return (
          <g
            key={callout.id}
            data-callout-id={callout.id}
            data-callout-row={callout.row}
            data-callout-x={callout.centerX}
            data-callout-y={callout.centerY}
            data-testid={callout.testId}
          >
            {renderLeader(callout, direction, tone.leader)}
            <rect
              x={boxLeft}
              y={boxTop}
              width={callout.width}
              height={CALLOUT_HEIGHT}
              rx="10"
              fill={tone.fill}
              stroke={tone.stroke}
              strokeWidth="1.2"
            />
            <text
              x={callout.centerX}
              y={callout.centerY + 3.8}
              textAnchor="middle"
              fill={tone.text}
              fontSize="10.5"
              fontWeight="700"
            >
              {callout.text}
            </text>
          </g>
        );
      })}
    </g>
  );
}
