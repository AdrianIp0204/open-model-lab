"use client";

import {
  type ChemistryBondedPair,
  type ChemistryParticle,
  buildChemistryParticles,
  buildChemistryPulses,
  formatNumber,
} from "@/lib/physics";

type ChemistryVesselLegendItem = {
  label: string;
  tone?: "teal" | "coral" | "amber" | "sky" | "ink";
  dashed?: boolean;
};

type ChemistryVesselChip = {
  label: string;
  tone?: "teal" | "coral" | "amber" | "sky" | "ink";
  dashed?: boolean;
};

type ChemistryVesselTone = "teal" | "coral" | "amber" | "sky" | "ink";

type ChemistryParticleShape = "circle" | "square" | "diamond";

type ChemistryVesselProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle: string;
  time: number;
  agitation: number;
  reactantCount: number;
  productCount?: number;
  particles?: ChemistryParticle[];
  bondedPairs?: ChemistryBondedPair[];
  reactantAmount?: number;
  productAmount?: number;
  reactantLabel?: string;
  productLabel?: string;
  reactantTone?: ChemistryVesselTone;
  productTone?: ChemistryVesselTone;
  reactantShape?: ChemistryParticleShape;
  productShape?: ChemistryParticleShape;
  productDock?: "full" | "bottom";
  productMotionScale?: number;
  showMotionCue?: boolean;
  showMixtureBars?: boolean;
  showPulseCue?: boolean;
  successPulseCount?: number;
  attemptPulseCount?: number;
  successPulseTone?: ChemistryVesselTone;
  attemptPulseTone?: ChemistryVesselTone;
  showBalanceBars?: boolean;
  forwardRate?: number;
  reverseRate?: number;
  focusedOverlayId?: string | null;
  motionOverlayId?: string;
  mixtureOverlayId?: string;
  pulseOverlayId?: string;
  balanceOverlayId?: string;
  legendItems?: ChemistryVesselLegendItem[];
  chips?: ChemistryVesselChip[];
  mixtureTitle?: string;
  balanceTitle?: string;
  forwardLabel?: string;
  reverseLabel?: string;
  footerText?: string;
  muted?: boolean;
  dashed?: boolean;
};

const tonePalette = {
  teal: {
    fill: "rgba(30,166,162,0.14)",
    stroke: "rgba(21,122,118,0.32)",
    text: "#157a76",
    line: "#1ea6a2",
  },
  coral: {
    fill: "rgba(241,102,89,0.14)",
    stroke: "rgba(177,66,52,0.3)",
    text: "#9f3a2c",
    line: "#f16659",
  },
  amber: {
    fill: "rgba(240,171,60,0.16)",
    stroke: "rgba(184,112,0,0.32)",
    text: "#8e5800",
    line: "#f0ab3c",
  },
  sky: {
    fill: "rgba(78,166,223,0.14)",
    stroke: "rgba(29,111,159,0.28)",
    text: "#1d6f9f",
    line: "#4ea6df",
  },
  ink: {
    fill: "rgba(255,255,255,0.9)",
    stroke: "rgba(15,28,36,0.16)",
    text: "#0f1c24",
    line: "#0f1c24",
  },
} as const;

function overlayOpacity(
  focusedOverlayId: string | null | undefined,
  overlayId: string | undefined,
) {
  if (!overlayId || !focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.3;
}

function drawChip(x: number, y: number, chip: ChemistryVesselChip) {
  const tone = tonePalette[chip.tone ?? "ink"];
  const width = Math.max(92, chip.label.length * 6.3 + 18);

  return (
    <g key={`${chip.label}-${x}-${y}`} transform={`translate(${x} ${y})`}>
      <rect
        x={-width / 2}
        y="-12"
        width={width}
        height="24"
        rx="12"
        fill={tone.fill}
        stroke={tone.stroke}
        strokeDasharray={chip.dashed ? "6 4" : undefined}
      />
      <text
        x="0"
        y="4"
        textAnchor="middle"
        className="text-[10px] font-semibold"
        fill={tone.text}
      >
        {chip.label}
      </text>
    </g>
  );
}

function renderParticleShape(
  shape: ChemistryParticleShape,
  x: number,
  y: number,
  radius: number,
  fill: string,
  strokeDasharray?: string,
) {
  if (shape === "square") {
    return (
      <rect
        x={x - radius}
        y={y - radius}
        width={radius * 2}
        height={radius * 2}
        rx={radius * 0.28}
        fill={fill}
        stroke="rgba(15,28,36,0.18)"
        strokeDasharray={strokeDasharray}
      />
    );
  }

  if (shape === "diamond") {
    return (
      <rect
        x={x - radius * 0.82}
        y={y - radius * 0.82}
        width={radius * 1.64}
        height={radius * 1.64}
        rx={radius * 0.16}
        fill={fill}
        stroke="rgba(15,28,36,0.18)"
        strokeDasharray={strokeDasharray}
        transform={`rotate(45 ${x} ${y})`}
      />
    );
  }

  return (
    <circle
      cx={x}
      cy={y}
      r={radius}
      fill={fill}
      stroke="rgba(15,28,36,0.18)"
      strokeDasharray={strokeDasharray}
    />
  );
}

function renderParticleCore(
  shape: ChemistryParticleShape,
  x: number,
  y: number,
  radius: number,
  fill: string,
) {
  if (shape === "square") {
    return (
      <rect
        x={x - radius * 0.48}
        y={y - radius * 0.48}
        width={radius * 0.96}
        height={radius * 0.96}
        rx={radius * 0.18}
        fill={fill}
      />
    );
  }

  if (shape === "diamond") {
    return (
      <rect
        x={x - radius * 0.38}
        y={y - radius * 0.38}
        width={radius * 0.76}
        height={radius * 0.76}
        rx={radius * 0.08}
        fill={fill}
        transform={`rotate(45 ${x} ${y})`}
      />
    );
  }

  return <circle cx={x} cy={y} r={radius} fill={fill} />;
}

function renderBondedPair(
  pair: ChemistryBondedPair,
  x: number,
  y: number,
  tone: (typeof tonePalette)[ChemistryVesselTone],
  {
    showMotionCue,
    muted,
    dashed,
  }: {
    showMotionCue: boolean;
    muted: boolean;
    dashed: boolean;
  },
) {
  const centerX = x + pair.x;
  const centerY = y + pair.y;
  const halfDx = Math.cos(pair.angle) * pair.separation * 0.5;
  const halfDy = Math.sin(pair.angle) * pair.separation * 0.5;
  const leftX = centerX - halfDx;
  const leftY = centerY - halfDy;
  const rightX = centerX + halfDx;
  const rightY = centerY + halfDy;
  const hullWidth = pair.separation + pair.radius * 2.4;
  const hullHeight = pair.radius * 1.8;
  const streakOpacity = muted ? 0.2 : 0.38;
  const shellFill = muted ? `${tone.line}44` : `${tone.line}bb`;
  const coreFill = muted ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.82)";
  const bondGlow = muted ? `${tone.line}1e` : `${tone.line}36`;

  return (
    <g
      key={pair.id}
      data-chemistry-particle="bonded-product"
      data-chemistry-bonded-pair="true"
      data-chemistry-member-ids={pair.memberIds.join(",")}
    >
      {showMotionCue ? (
        <line
          x1={centerX - pair.streakX}
          y1={centerY - pair.streakY}
          x2={centerX}
          y2={centerY}
          stroke={tone.line}
          strokeOpacity={streakOpacity}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={dashed ? "4 4" : undefined}
        />
      ) : null}
      <rect
        x={centerX - hullWidth * 0.5}
        y={centerY - hullHeight * 0.5}
        width={hullWidth}
        height={hullHeight}
        rx={hullHeight * 0.5}
        fill={bondGlow}
        stroke={`${tone.line}70`}
        strokeWidth="1.4"
        strokeDasharray={dashed ? "4 3" : undefined}
        transform={`rotate(${(pair.angle * 180) / Math.PI} ${centerX} ${centerY})`}
      />
      <line
        x1={leftX}
        y1={leftY}
        x2={rightX}
        y2={rightY}
        stroke={muted ? `${tone.line}88` : `${tone.line}cc`}
        strokeWidth={Math.max(3.2, pair.radius * 0.64)}
        strokeLinecap="round"
      />
      <circle
        cx={leftX}
        cy={leftY}
        r={pair.radius}
        fill={shellFill}
        stroke="rgba(15,28,36,0.18)"
        strokeDasharray={dashed ? "4 3" : undefined}
      />
      <circle
        cx={rightX}
        cy={rightY}
        r={pair.radius}
        fill={shellFill}
        stroke="rgba(15,28,36,0.18)"
        strokeDasharray={dashed ? "4 3" : undefined}
      />
      <circle cx={leftX} cy={leftY} r={pair.radius * 0.42} fill={coreFill} />
      <circle cx={rightX} cy={rightY} r={pair.radius * 0.42} fill={coreFill} />
      <rect
        x={centerX - pair.radius * 0.26}
        y={centerY - pair.radius * 0.22}
        width={pair.radius * 0.52}
        height={pair.radius * 0.44}
        rx={pair.radius * 0.12}
        fill={coreFill}
        transform={`rotate(${(pair.angle * 180) / Math.PI} ${centerX} ${centerY})`}
      />
    </g>
  );
}

export function ChemistryVessel({
  x,
  y,
  width,
  height,
  title,
  subtitle,
  time,
  agitation,
  reactantCount,
  productCount = 0,
  particles: providedParticles,
  bondedPairs = [],
  reactantAmount,
  productAmount,
  reactantLabel = "Reactants",
  productLabel = "Products",
  reactantTone = "teal",
  productTone = "coral",
  reactantShape = "circle",
  productShape = "circle",
  productDock = "full",
  productMotionScale = 1,
  showMotionCue = false,
  showMixtureBars = false,
  showPulseCue = false,
  successPulseCount = 0,
  attemptPulseCount = 0,
  successPulseTone = "coral",
  attemptPulseTone = "amber",
  showBalanceBars = false,
  forwardRate,
  reverseRate,
  focusedOverlayId,
  motionOverlayId,
  mixtureOverlayId,
  pulseOverlayId,
  balanceOverlayId,
  legendItems,
  chips,
  mixtureTitle = "Mixture",
  balanceTitle = "Balance",
  forwardLabel = "Forward",
  reverseLabel = "Reverse",
  footerText,
  muted = false,
  dashed = false,
}: ChemistryVesselProps) {
  const vesselX = x + 18;
  const vesselY = y + 62;
  const vesselWidth = width - 150;
  const vesselHeight = height - 118;
  const effectiveReactantAmount = reactantAmount ?? reactantCount;
  const effectiveProductAmount = productAmount ?? productCount;
  const totalAmount = Math.max(effectiveReactantAmount + effectiveProductAmount, 0.001);
  const reactantShare = effectiveReactantAmount / totalAmount;
  const balanceMax = Math.max(forwardRate ?? 0, reverseRate ?? 0, 0.001);
  const reactantPalette = tonePalette[reactantTone];
  const productPalette = tonePalette[productTone];
  const successPulsePalette = tonePalette[successPulseTone];
  const attemptPulsePalette = tonePalette[attemptPulseTone];
  const particles =
    providedParticles ??
    buildChemistryParticles({
      reactantCount,
      productCount,
      time,
      agitation,
      width: vesselWidth,
      height: vesselHeight,
    });
  const successPulses = buildChemistryPulses({
    pulseCount: successPulseCount,
    time,
    width: vesselWidth,
    height: vesselHeight,
    tone: "success",
  });
  const attemptPulses = buildChemistryPulses({
    pulseCount: attemptPulseCount,
    time,
    width: vesselWidth,
    height: vesselHeight,
    tone: "attempt",
  });
  const legend =
    legendItems ??
    [
      { label: reactantLabel, tone: reactantTone },
      ...(productCount > 0 || bondedPairs.length > 0
        ? [{ label: productLabel, tone: productTone }]
        : []),
    ];

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        width={width}
        height={height}
        rx="26"
        fill={muted ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.92)"}
        stroke={muted ? "rgba(15,28,36,0.18)" : "rgba(15,28,36,0.1)"}
        strokeDasharray={dashed ? "8 6" : undefined}
      />
      <text
        x="18"
        y="24"
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
      >
        {title}
      </text>
      <text x="18" y="46" className="fill-ink-950 text-[15px] font-semibold">
        {subtitle}
      </text>

      <g transform="translate(18 0)">
        {legend.map((item, index) => {
          const tone = tonePalette[item.tone ?? "ink"];
          const lineY = 74 + index * 18;

          return (
            <g key={`${item.label}-${index}`}>
              <line
                x1="0"
                x2="22"
                y1={lineY}
                y2={lineY}
                stroke={tone.line}
                strokeWidth="3"
                strokeDasharray={item.dashed ? "7 6" : undefined}
              />
              <text x="30" y={lineY + 4} className="fill-ink-700 text-[11px] font-semibold">
                {item.label}
              </text>
            </g>
          );
        })}
      </g>

      <rect
        x={vesselX}
        y={vesselY}
        width={vesselWidth}
        height={vesselHeight}
        rx="24"
        fill={muted ? "rgba(248,251,252,0.46)" : "rgba(248,251,252,0.94)"}
        stroke={muted ? "rgba(15,28,36,0.14)" : "rgba(15,28,36,0.08)"}
        strokeDasharray={dashed ? "8 5" : undefined}
      />

      {showMixtureBars ? (
        <g opacity={overlayOpacity(focusedOverlayId, mixtureOverlayId)}>
          <text
            x={vesselX}
            y={vesselY - 16}
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            {mixtureTitle}
          </text>
          <rect
            x={vesselX}
            y={vesselY - 2}
            width={vesselWidth}
            height="12"
            rx="6"
            fill="rgba(15,28,36,0.06)"
          />
          <rect
            x={vesselX}
            y={vesselY - 2}
            width={vesselWidth * reactantShare}
            height="12"
            rx="6"
            fill={reactantPalette.fill}
          />
          <rect
            x={vesselX + vesselWidth * reactantShare}
            y={vesselY - 2}
            width={vesselWidth * (1 - reactantShare)}
            height="12"
            rx="6"
            fill={productPalette.fill}
          />
          {drawChip(vesselX + vesselWidth * 0.24, vesselY - 18, {
            label: `${reactantLabel}: ${formatNumber(effectiveReactantAmount)}`,
            tone: reactantTone,
            dashed,
          })}
          {drawChip(vesselX + vesselWidth * 0.76, vesselY - 18, {
            label: `${productLabel}: ${formatNumber(effectiveProductAmount)}`,
            tone: productTone,
            dashed,
          })}
        </g>
      ) : null}

      {showPulseCue ? (
        <g opacity={overlayOpacity(focusedOverlayId, pulseOverlayId)}>
          {attemptPulses.map((pulse) => (
            <circle
              key={pulse.id}
              cx={vesselX + pulse.x}
              cy={vesselY + pulse.y}
              r={3 + pulse.strength * 4}
              fill="none"
              stroke={`${attemptPulsePalette.line}66`}
              strokeWidth="1.8"
            />
          ))}
          {successPulses.map((pulse) => (
            <circle
              key={pulse.id}
              cx={vesselX + pulse.x}
              cy={vesselY + pulse.y}
              r={2.5 + pulse.strength * 3.4}
              fill={`${successPulsePalette.line}20`}
              stroke={`${successPulsePalette.line}99`}
              strokeWidth="1.8"
            />
          ))}
        </g>
      ) : null}

      <g opacity={overlayOpacity(focusedOverlayId, motionOverlayId)}>
        {particles.map((particle) => {
          const isProduct = particle.species === "product";
          const tone = isProduct ? productPalette : reactantPalette;
          const shape = isProduct ? productShape : reactantShape;
          const motionScale = isProduct ? productMotionScale : 1;
          const normalizedY = vesselHeight <= 0 ? 0.5 : particle.y / vesselHeight;
          const dockedY =
            isProduct && productDock === "bottom"
              ? vesselY +
                vesselHeight * 0.62 +
                normalizedY * Math.max(vesselHeight * 0.28 - particle.radius * 1.2, 12)
              : vesselY + particle.y;
          const renderedY = Math.min(
            vesselY + vesselHeight - particle.radius - 8,
            dockedY,
          );
          const renderedX = vesselX + particle.x;
          const streakOpacity = isProduct ? 0.34 : 0.44;
          const streakX = particle.streakX * motionScale;
          const streakY = particle.streakY * motionScale;
          const particleFill = muted ? `${tone.line}55` : `${tone.line}dd`;
          const coreFill = muted ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.78)";

          return (
            <g
              key={particle.id}
              data-chemistry-particle={particle.species}
              data-chemistry-shape={shape}
            >
              {showMotionCue ? (
                <line
                  x1={renderedX - streakX}
                  y1={renderedY - streakY}
                  x2={renderedX}
                  y2={renderedY}
                  stroke={tone.line}
                  strokeOpacity={muted ? streakOpacity * 0.55 : streakOpacity}
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeDasharray={dashed ? "4 4" : undefined}
                />
              ) : null}
              {renderParticleShape(
                shape,
                renderedX,
                renderedY,
                particle.radius,
                particleFill,
                dashed ? "4 3" : undefined,
              )}
              {renderParticleCore(
                shape,
                renderedX,
                renderedY,
                particle.radius * 0.42,
                coreFill,
              )}
            </g>
          );
        })}
        {bondedPairs.map((pair) =>
          renderBondedPair(pair, vesselX, vesselY, productPalette, {
            showMotionCue,
            muted,
            dashed,
          }),
        )}
      </g>

      {chips?.length ? (
        <g>
          {chips.map((chip, index) =>
            drawChip(vesselX + 80 + (index % 2) * 130, vesselY + vesselHeight - 18 - Math.floor(index / 2) * 28, chip),
          )}
        </g>
      ) : null}

      {showBalanceBars && forwardRate !== undefined && reverseRate !== undefined ? (
        <g opacity={overlayOpacity(focusedOverlayId, balanceOverlayId)}>
          <text
            x={vesselX + vesselWidth + 22}
            y={vesselY + 8}
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            {balanceTitle}
          </text>
          <text
            x={vesselX + vesselWidth + 22}
            y={vesselY + 34}
            className="fill-sky-700 text-[11px] font-semibold"
          >
            {forwardLabel}
          </text>
          <rect
            x={vesselX + vesselWidth + 22}
            y={vesselY + 42}
            width="92"
            height="10"
            rx="5"
            fill="rgba(15,28,36,0.06)"
          />
          <rect
            x={vesselX + vesselWidth + 22}
            y={vesselY + 42}
            width={92 * (forwardRate / balanceMax)}
            height="10"
            rx="5"
            fill="rgba(78,166,223,0.6)"
          />
          <text
            x={vesselX + vesselWidth + 22}
            y={vesselY + 70}
            className="fill-amber-700 text-[11px] font-semibold"
          >
            {reverseLabel}
          </text>
          <rect
            x={vesselX + vesselWidth + 22}
            y={vesselY + 78}
            width="92"
            height="10"
            rx="5"
            fill="rgba(15,28,36,0.06)"
          />
          <rect
            x={vesselX + vesselWidth + 22}
            y={vesselY + 78}
            width={92 * (reverseRate / balanceMax)}
            height="10"
            rx="5"
            fill="rgba(240,171,60,0.62)"
          />
          {drawChip(vesselX + vesselWidth + 68, vesselY + 112, {
            label: `fwd ${formatNumber(forwardRate)}`,
            tone: "sky",
            dashed,
          })}
          {drawChip(vesselX + vesselWidth + 68, vesselY + 140, {
            label: `rev ${formatNumber(reverseRate)}`,
            tone: "amber",
            dashed,
          })}
        </g>
      ) : null}

      {footerText ? (
        <text x="18" y={height - 18} className="fill-ink-600 text-[12px]">
          {footerText}
        </text>
      ) : null}
    </g>
  );
}
