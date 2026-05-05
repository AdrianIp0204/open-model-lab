"use client";

import type {
  CircuitLightBulbGlow,
  CircuitPaletteItemType,
} from "@/lib/circuit-builder";

type CircuitPartVisualProps = {
  type: CircuitPaletteItemType;
  className?: string;
  active?: boolean;
  openSwitch?: boolean;
  blown?: boolean;
  embedded?: boolean;
  glow?: CircuitLightBulbGlow;
};

const leadStroke = "#315063";
const activeStroke = "#178c91";
const inkStroke = "#0f1c24";
const shellFill = "#fffdf8";
const warmFill = "#f0ab3c";
const tealFill = "#178c91";
const skyFill = "#4ea6df";
const coralFill = "#f16659";

function LeadLines({ stroke }: { stroke: string }) {
  return (
    <>
      <line x1="-64" y1="0" x2="-42" y2="0" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
      <line x1="42" y1="0" x2="64" y2="0" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
    </>
  );
}

function renderBattery(stroke: string) {
  return (
    <>
      <LeadLines stroke={stroke} />
      <rect x="-38" y="-28" width="76" height="56" rx="12" fill="#f8faf4" stroke={stroke} strokeWidth="3" />
      <rect x="-26" y="-18" width="18" height="36" rx="5" fill={tealFill} opacity="0.88" />
      <rect x="-4" y="-18" width="10" height="36" rx="4" fill="#d9e4dd" />
      <rect x="12" y="-18" width="18" height="36" rx="5" fill={warmFill} opacity="0.9" />
      <text x="-24" y="-31" textAnchor="middle" fontSize="16" fontWeight="800" fill={inkStroke}>+</text>
      <text x="25" y="-31" textAnchor="middle" fontSize="18" fontWeight="800" fill={inkStroke}>-</text>
    </>
  );
}

function renderResistor(stroke: string) {
  return (
    <>
      <LeadLines stroke={stroke} />
      <rect x="-38" y="-18" width="76" height="36" rx="14" fill="#f7e3b1" stroke={stroke} strokeWidth="3" />
      <rect x="-22" y="-18" width="6" height="36" fill="#8f5a2b" opacity="0.75" />
      <rect x="-6" y="-18" width="6" height="36" fill={coralFill} opacity="0.75" />
      <rect x="12" y="-18" width="6" height="36" fill={tealFill} opacity="0.75" />
    </>
  );
}

function renderLightBulb(stroke: string, glow?: CircuitLightBulbGlow) {
  const glowIntensity = glow?.active ? glow.intensity : 0;
  const glowOpacity = glowIntensity > 0 ? 0.15 + glowIntensity * 0.65 : 0;
  const glowRadius = 34 + glowIntensity * 18;

  return (
    <g
      data-circuit-light-bulb-glow={glow ? (glow.active ? "on" : "off") : undefined}
      data-circuit-light-bulb-glow-intensity={glow ? glowIntensity.toFixed(2) : undefined}
    >
      <LeadLines stroke={stroke} />
      {glowIntensity > 0 ? (
        <>
          <circle cx="0" cy="-6" r={glowRadius} fill="#f7c948" opacity={glowOpacity * 0.32} aria-hidden="true" />
          <circle cx="0" cy="-6" r={glowRadius * 0.66} fill="#ffdd72" opacity={glowOpacity * 0.38} aria-hidden="true" />
        </>
      ) : null}
      <circle cx="0" cy="-8" r="27" fill={glowIntensity > 0 ? "#fff2ba" : "#f5fbff"} stroke={stroke} strokeWidth="3" />
      <path
        d="M -16 -4 C -8 -20, 8 -20, 16 -4"
        fill="none"
        stroke={glowIntensity > 0 ? "#d97706" : "#8a6d3b"}
        strokeWidth={glowIntensity > 0 ? 4 : 3}
        strokeLinecap="round"
      />
      <rect x="-16" y="18" width="32" height="15" rx="5" fill="#d9e4dd" stroke={stroke} strokeWidth="3" />
      <line x1="-12" y1="23" x2="12" y2="23" stroke={stroke} strokeWidth="2" />
      <line x1="-10" y1="29" x2="10" y2="29" stroke={stroke} strokeWidth="2" />
    </g>
  );
}

function renderSwitch(stroke: string, openSwitch: boolean) {
  return (
    <>
      <LeadLines stroke={stroke} />
      <circle cx="-28" cy="0" r="7" fill={shellFill} stroke={stroke} strokeWidth="3" />
      <circle cx="28" cy="0" r="7" fill={shellFill} stroke={stroke} strokeWidth="3" />
      <line
        x1="-28"
        y1="-3"
        x2={openSwitch ? "18" : "28"}
        y2={openSwitch ? "-24" : "-3"}
        stroke={stroke}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M -42 24 H 42" stroke={stroke} strokeWidth="3" strokeLinecap="round" opacity="0.45" />
    </>
  );
}

function renderMeter(stroke: string, label: "A" | "V") {
  return (
    <>
      <LeadLines stroke={stroke} />
      <circle cx="0" cy="0" r="33" fill="#f7fbfd" stroke={stroke} strokeWidth="3" />
      <path d="M -19 10 A 23 23 0 0 1 19 10" fill="none" stroke="#aac2ce" strokeWidth="4" strokeLinecap="round" />
      <line x1="0" y1="6" x2="16" y2="-12" stroke={coralFill} strokeWidth="3" strokeLinecap="round" />
      <circle cx="0" cy="6" r="4" fill={stroke} />
      <text x="0" y="27" textAnchor="middle" fontSize="20" fontWeight="800" fill={inkStroke}>{label}</text>
    </>
  );
}

function renderCapacitor(stroke: string) {
  return (
    <>
      <line x1="-64" y1="0" x2="-18" y2="0" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
      <line x1="18" y1="0" x2="64" y2="0" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
      <rect x="-18" y="-32" width="10" height="64" rx="4" fill={skyFill} stroke={stroke} strokeWidth="3" />
      <rect x="8" y="-32" width="10" height="64" rx="4" fill={warmFill} stroke={stroke} strokeWidth="3" />
      <path d="M -34 -30 Q 0 -44 34 -30" fill="none" stroke="#aac2ce" strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function renderDiode(stroke: string) {
  return (
    <>
      <LeadLines stroke={stroke} />
      <rect x="-34" y="-19" width="68" height="38" rx="12" fill="#f7fbfd" stroke={stroke} strokeWidth="3" />
      <path d="M -16 -17 L 14 0 L -16 17 Z" fill={tealFill} opacity="0.82" stroke={stroke} strokeWidth="2" />
      <line x1="18" y1="-18" x2="18" y2="18" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
    </>
  );
}

function renderFuse(stroke: string, blown: boolean) {
  return (
    <>
      <LeadLines stroke={stroke} />
      <rect x="-42" y="-17" width="84" height="34" rx="17" fill="#eef7fa" stroke={stroke} strokeWidth="3" opacity="0.92" />
      {blown ? (
        <path d="M -25 0 L -8 -8 M 8 8 L 25 0" stroke={coralFill} strokeWidth="5" strokeLinecap="round" />
      ) : (
        <path d="M -28 0 C -12 -11, 12 11, 28 0" fill="none" stroke={warmFill} strokeWidth="4" strokeLinecap="round" />
      )}
      <rect x="-48" y="-9" width="9" height="18" rx="3" fill="#d9e4dd" stroke={stroke} strokeWidth="2" />
      <rect x="39" y="-9" width="9" height="18" rx="3" fill="#d9e4dd" stroke={stroke} strokeWidth="2" />
    </>
  );
}

function renderThermistor(stroke: string) {
  return (
    <>
      {renderResistor(stroke)}
      <path d="M 22 -34 V 18" stroke={coralFill} strokeWidth="3" strokeLinecap="round" />
      <circle cx="22" cy="24" r="7" fill={coralFill} stroke={stroke} strokeWidth="2" />
      <path d="M 31 -24 H 42 M 31 -12 H 39" stroke={coralFill} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function renderLdr(stroke: string) {
  return (
    <>
      {renderResistor(stroke)}
      <path d="M 24 -34 L 39 -48 M 38 -30 L 53 -44" stroke={warmFill} strokeWidth="4" strokeLinecap="round" />
      <path d="M 39 -48 L 36 -38 M 39 -48 L 29 -45 M 53 -44 L 50 -34 M 53 -44 L 43 -41" stroke={warmFill} strokeWidth="3" strokeLinecap="round" />
      <circle cx="0" cy="0" r="43" fill="none" stroke="#aac2ce" strokeWidth="2" strokeDasharray="5 5" opacity="0.8" />
    </>
  );
}

function renderWireTool(stroke: string) {
  return (
    <>
      <path d="M -58 12 C -30 -22, 12 38, 58 -8" fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
      <circle cx="-22" cy="-5" r="5" fill={tealFill} />
      <circle cx="12" cy="17" r="4.5" fill={warmFill} />
      <circle cx="42" cy="-1" r="4" fill={tealFill} />
      <text x="15" y="-17" textAnchor="middle" fontSize="13" fontWeight="800" fill={inkStroke}>e-</text>
    </>
  );
}

function renderVisualContent(
  type: CircuitPaletteItemType,
  stroke: string,
  openSwitch: boolean,
  blown: boolean,
  glow?: CircuitLightBulbGlow,
) {
  switch (type) {
    case "ammeter":
      return renderMeter(stroke, "A");
    case "battery":
      return renderBattery(stroke);
    case "capacitor":
      return renderCapacitor(stroke);
    case "diode":
      return renderDiode(stroke);
    case "fuse":
      return renderFuse(stroke, blown);
    case "ldr":
      return renderLdr(stroke);
    case "lightBulb":
      return renderLightBulb(stroke, glow);
    case "resistor":
      return renderResistor(stroke);
    case "switch":
      return renderSwitch(stroke, openSwitch);
    case "thermistor":
      return renderThermistor(stroke);
    case "voltmeter":
      return renderMeter(stroke, "V");
    case "wire":
      return renderWireTool(stroke);
    default:
      return null;
  }
}

export function CircuitPartVisual({
  type,
  className = "h-12 w-full",
  active = false,
  openSwitch = false,
  blown = false,
  embedded = false,
  glow,
}: CircuitPartVisualProps) {
  const stroke = active ? activeStroke : leadStroke;
  const content = renderVisualContent(type, stroke, openSwitch, blown, glow);

  if (embedded) {
    return (
      <g data-circuit-modern-component={type} aria-hidden="true">
        {content}
      </g>
    );
  }

  return (
    <svg
      viewBox="-72 -54 144 108"
      aria-hidden="true"
      focusable="false"
      className={className}
      data-circuit-modern-palette-thumbnail={type}
    >
      {content}
    </svg>
  );
}
