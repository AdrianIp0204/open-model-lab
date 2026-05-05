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
const shadowFill = "rgba(15,28,36,0.12)";
const glassFill = "#eef7fa";

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
      <rect x="-38" y="-24" width="78" height="54" rx="13" fill={shadowFill} transform="translate(3 4)" />
      <rect x="-40" y="-28" width="78" height="54" rx="13" fill="#f8faf4" stroke={stroke} strokeWidth="3" />
      <rect x="38" y="-10" width="7" height="20" rx="3" fill="#d9e4dd" stroke={stroke} strokeWidth="2" />
      <rect x="-28" y="-18" width="18" height="34" rx="5" fill={tealFill} opacity="0.92" />
      <rect x="-4" y="-18" width="10" height="34" rx="4" fill="#d9e4dd" />
      <rect x="13" y="-18" width="18" height="34" rx="5" fill={warmFill} opacity="0.95" />
      <path d="M -34 -19 H 30" stroke="rgba(255,255,255,0.82)" strokeWidth="2" strokeLinecap="round" />
      <text x="-25" y="-32" textAnchor="middle" fontSize="16" fontWeight="800" fill={inkStroke}>+</text>
      <text x="26" y="-32" textAnchor="middle" fontSize="18" fontWeight="800" fill={inkStroke}>-</text>
    </>
  );
}

function renderResistor(stroke: string) {
  return (
    <>
      <LeadLines stroke={stroke} />
      <rect x="-38" y="-14" width="78" height="34" rx="15" fill={shadowFill} transform="translate(3 4)" />
      <rect x="-40" y="-18" width="78" height="34" rx="15" fill="#f7e3b1" stroke={stroke} strokeWidth="3" />
      <path d="M -30 -11 H 28" stroke="rgba(255,253,248,0.72)" strokeWidth="3" strokeLinecap="round" />
      <rect x="-24" y="-18" width="6" height="34" fill="#8f5a2b" opacity="0.82" />
      <rect x="-7" y="-18" width="6" height="34" fill={coralFill} opacity="0.82" />
      <rect x="11" y="-18" width="6" height="34" fill={tealFill} opacity="0.82" />
    </>
  );
}

function renderLightBulb(stroke: string, glow?: CircuitLightBulbGlow) {
  const glowIntensity = glow?.active ? glow.intensity : 0;
  const glowOpacity = glowIntensity > 0 ? 0.22 + glowIntensity * 0.68 : 0;
  const glowRadius = 40 + glowIntensity * 20;
  const rayOpacity = glowIntensity > 0.25 ? glowIntensity * 0.72 : 0;
  const filamentStroke = 3.2 + glowIntensity * 1.8;

  return (
    <g
      data-circuit-light-bulb-glow={glow ? (glow.active ? "on" : "off") : undefined}
      data-circuit-light-bulb-glow-intensity={glow ? glowIntensity.toFixed(2) : undefined}
    >
      <LeadLines stroke={stroke} />
      {glowIntensity > 0 ? (
        <>
          <circle cx="0" cy="-7" r={glowRadius} fill="#f7c948" opacity={glowOpacity * 0.34} aria-hidden="true" />
          <circle cx="0" cy="-7" r={glowRadius * 0.58} fill="#ffdd72" opacity={glowOpacity * 0.46} aria-hidden="true" />
          <g stroke="#f0ab3c" strokeWidth="3" strokeLinecap="round" opacity={rayOpacity} aria-hidden="true">
            <line x1="0" y1="-54" x2="0" y2="-43" />
            <line x1="-29" y1="-43" x2="-22" y2="-35" />
            <line x1="29" y1="-43" x2="22" y2="-35" />
            <line x1="-43" y1="-9" x2="-34" y2="-9" />
            <line x1="43" y1="-9" x2="34" y2="-9" />
          </g>
        </>
      ) : null}
      <circle cx="0" cy="-8" r="30" fill={shadowFill} transform="translate(3 4)" />
      <circle cx="0" cy="-8" r="30" fill={glowIntensity > 0 ? "#ffe9a6" : "#f5fbff"} stroke={stroke} strokeWidth="3" />
      <path d="M -11 -27 C -2 -33, 11 -31, 18 -20" fill="none" stroke="rgba(255,255,255,0.82)" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M -17 -5 C -10 -21, 10 -21, 17 -5"
        fill="none"
        stroke={glowIntensity > 0 ? "#c45d00" : "#8a6d3b"}
        strokeWidth={filamentStroke}
        strokeLinecap="round"
      />
      <rect x="-17" y="18" width="34" height="17" rx="5" fill="#d9e4dd" stroke={stroke} strokeWidth="3" />
      <line x1="-12" y1="24" x2="12" y2="24" stroke={stroke} strokeWidth="2" />
      <line x1="-10" y1="30" x2="10" y2="30" stroke={stroke} strokeWidth="2" />
    </g>
  );
}

function renderSwitch(stroke: string, openSwitch: boolean) {
  return (
    <>
      <LeadLines stroke={stroke} />
      <rect x="-42" y="-20" width="84" height="42" rx="15" fill={shadowFill} transform="translate(3 4)" />
      <rect x="-43" y="-24" width="84" height="42" rx="15" fill="#f8fbf8" stroke={stroke} strokeWidth="3" />
      <path d="M -31 -15 H 29" stroke="rgba(255,255,255,0.78)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="-28" cy="0" r="8" fill={shellFill} stroke={stroke} strokeWidth="3" />
      <circle cx="28" cy="0" r="8" fill={openSwitch ? shellFill : "#d5f0e8"} stroke={stroke} strokeWidth="3" />
      <line
        x1="-28"
        y1="-3"
        x2={openSwitch ? "18" : "28"}
        y2={openSwitch ? "-24" : "-3"}
        stroke={openSwitch ? coralFill : tealFill}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx={openSwitch ? "18" : "28"} cy={openSwitch ? "-24" : "-3"} r="4" fill={warmFill} stroke={stroke} strokeWidth="1.5" />
      <path
        d={openSwitch ? "M 14 -30 L 23 -38 M 27 -20 L 38 -25" : "M 15 -16 H 34"}
        stroke={openSwitch ? coralFill : tealFill}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.78"
      />
    </>
  );
}

function renderMeter(stroke: string, label: "A" | "V") {
  return (
    <>
      <LeadLines stroke={stroke} />
      <circle cx="0" cy="0" r="36" fill={shadowFill} transform="translate(3 4)" />
      <circle cx="0" cy="0" r="36" fill="#ecf8fb" stroke={stroke} strokeWidth="3" />
      <circle cx="0" cy="1" r="27" fill={glassFill} stroke="rgba(49,80,99,0.28)" strokeWidth="2" />
      <path d="M -19 11 A 24 24 0 0 1 19 11" fill="none" stroke="#aac2ce" strokeWidth="4" strokeLinecap="round" />
      <path d="M -23 11 L -18 6 M 0 -13 V -6 M 23 11 L 18 6" stroke={stroke} strokeWidth="2" strokeLinecap="round" opacity="0.72" />
      <line x1="0" y1="7" x2="16" y2="-13" stroke={coralFill} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="0" cy="7" r="4.5" fill={stroke} />
      <text x="0" y="29" textAnchor="middle" fontSize="20" fontWeight="800" fill={inkStroke}>{label}</text>
    </>
  );
}

function renderCapacitor(stroke: string) {
  return (
    <>
      <line x1="-64" y1="0" x2="-18" y2="0" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
      <line x1="18" y1="0" x2="64" y2="0" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
      <rect x="-21" y="-34" width="14" height="68" rx="5" fill={shadowFill} transform="translate(3 4)" />
      <rect x="7" y="-34" width="14" height="68" rx="5" fill={shadowFill} transform="translate(3 4)" />
      <rect x="-22" y="-36" width="13" height="68" rx="5" fill={skyFill} stroke={stroke} strokeWidth="3" />
      <rect x="9" y="-36" width="13" height="68" rx="5" fill={warmFill} stroke={stroke} strokeWidth="3" />
      <path d="M -16 -28 V 25 M 15 -28 V 25" stroke="rgba(255,255,255,0.64)" strokeWidth="2" strokeLinecap="round" />
      <path d="M -39 -31 Q 0 -47 39 -31" fill="none" stroke="#aac2ce" strokeWidth="3" strokeLinecap="round" />
      <path d="M -35 31 Q 0 45 35 31" fill="none" stroke="#d9e4dd" strokeWidth="2.5" strokeLinecap="round" />
    </>
  );
}

function renderDiode(stroke: string) {
  return (
    <>
      <LeadLines stroke={stroke} />
      <rect x="-36" y="-20" width="72" height="40" rx="13" fill={shadowFill} transform="translate(3 4)" />
      <rect x="-38" y="-23" width="72" height="40" rx="13" fill="#f7fbfd" stroke={stroke} strokeWidth="3" />
      <path d="M -29 -15 H 23" stroke="rgba(255,255,255,0.72)" strokeWidth="3" strokeLinecap="round" />
      <path d="M -16 -17 L 14 0 L -16 17 Z" fill={tealFill} opacity="0.9" stroke={stroke} strokeWidth="2" />
      <line x1="18" y1="-18" x2="18" y2="18" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <path d="M -24 26 H 22 M 22 26 L 14 20 M 22 26 L 14 32" stroke={tealFill} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function renderFuse(stroke: string, blown: boolean) {
  return (
    <>
      <LeadLines stroke={stroke} />
      <rect x="-43" y="-17" width="86" height="34" rx="17" fill={shadowFill} transform="translate(3 4)" />
      <rect x="-43" y="-19" width="86" height="36" rx="18" fill={glassFill} stroke={stroke} strokeWidth="3" opacity="0.94" />
      <path d="M -32 -11 H 33" stroke="rgba(255,255,255,0.84)" strokeWidth="3" strokeLinecap="round" />
      {blown ? (
        <>
          <path d="M -27 0 L -10 -8 M 9 9 L 27 0" stroke={coralFill} strokeWidth="5" strokeLinecap="round" />
          <path d="M -2 -3 L 4 -13 M 2 5 L -4 14" stroke={warmFill} strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : (
        <path d="M -28 0 C -12 -11, 12 11, 28 0" fill="none" stroke={warmFill} strokeWidth="4" strokeLinecap="round" />
      )}
      <rect x="-50" y="-10" width="12" height="20" rx="4" fill="#d9e4dd" stroke={stroke} strokeWidth="2" />
      <rect x="38" y="-10" width="12" height="20" rx="4" fill="#d9e4dd" stroke={stroke} strokeWidth="2" />
    </>
  );
}

function renderThermistor(stroke: string) {
  return (
    <>
      {renderResistor(stroke)}
      <path d="M 25 -36 V 16" stroke={coralFill} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="25" cy="24" r="8" fill="#ffe1d8" stroke={stroke} strokeWidth="2.5" />
      <path d="M 25 -26 V 20" stroke={coralFill} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="25" cy="24" r="4" fill={coralFill} />
      <path d="M 35 -24 H 46 M 35 -12 H 43" stroke={coralFill} strokeWidth="2.3" strokeLinecap="round" />
    </>
  );
}

function renderLdr(stroke: string) {
  return (
    <>
      {renderResistor(stroke)}
      <path d="M 24 -35 L 41 -51 M 38 -29 L 56 -46" stroke={warmFill} strokeWidth="4" strokeLinecap="round" />
      <path d="M 41 -51 L 37 -40 M 41 -51 L 30 -47 M 56 -46 L 52 -35 M 56 -46 L 45 -42" stroke={warmFill} strokeWidth="3" strokeLinecap="round" />
      <circle cx="0" cy="0" r="43" fill="rgba(78,166,223,0.08)" stroke="#aac2ce" strokeWidth="2" strokeDasharray="5 5" opacity="0.88" />
      <circle cx="-32" cy="-28" r="4" fill={warmFill} opacity="0.72" />
    </>
  );
}

function renderWireTool(stroke: string) {
  return (
    <>
      <path d="M -58 12 C -31 -24, 11 38, 58 -8" fill="none" stroke="rgba(240,171,60,0.42)" strokeWidth="12" strokeLinecap="round" />
      <path d="M -58 12 C -31 -24, 11 38, 58 -8" fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
      <circle cx="-22" cy="-5" r="6" fill={tealFill} stroke="#fffdf8" strokeWidth="2" />
      <circle cx="12" cy="17" r="6" fill={warmFill} stroke="#fffdf8" strokeWidth="2" />
      <circle cx="42" cy="-1" r="5.5" fill={tealFill} stroke="#fffdf8" strokeWidth="2" />
      <g transform="translate(14 -18)">
        <rect x="-12" y="-9" width="27" height="17" rx="8.5" fill={shellFill} stroke="rgba(15,28,36,0.22)" />
        <text x="1.5" y="4" textAnchor="middle" fontSize="12" fontWeight="800" fill={inkStroke}>e-</text>
      </g>
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
