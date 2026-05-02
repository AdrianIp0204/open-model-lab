import type { CSSProperties } from "react";
import type {
  LearningVisualFallbackKind,
  LearningVisualKind,
  LearningVisualMotif,
  LearningVisualTone,
} from "./learningVisualDescriptors";

export type {
  LearningVisualDescriptor,
  LearningVisualFallbackKind,
  LearningVisualKind,
  LearningVisualMotif,
  LearningVisualTone,
} from "./learningVisualDescriptors";

type LearningVisualProps = {
  kind: LearningVisualKind;
  motif?: LearningVisualMotif;
  isFallback?: boolean;
  fallbackKind?: LearningVisualFallbackKind;
  tone?: LearningVisualTone;
  className?: string;
  ariaLabel?: string;
  compact?: boolean;
};

const toneClasses: Record<LearningVisualTone, string> = {
  amber: "border-amber-500/24 bg-amber-500/10 text-amber-700",
  coral: "border-coral-500/24 bg-coral-500/10 text-coral-700",
  ink: "border-ink-950/15 bg-ink-950/5 text-ink-800",
  sky: "border-sky-500/24 bg-sky-500/10 text-sky-700",
  teal: "border-teal-500/24 bg-teal-500/10 text-teal-700",
};

const accentStyles: Record<LearningVisualTone, CSSProperties> = {
  amber: { "--visual-accent": "var(--amber-500)" } as CSSProperties,
  coral: { "--visual-accent": "var(--coral-500)" } as CSSProperties,
  ink: { "--visual-accent": "var(--ink-950)" } as CSSProperties,
  sky: { "--visual-accent": "var(--sky-500)" } as CSSProperties,
  teal: { "--visual-accent": "var(--teal-500)" } as CSSProperties,
};

function SimulationGlyph() {
  return (
    <>
      <path d="M18 68H108" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
      <path d="M24 72C36 35 48 35 60 54C72 73 82 72 99 30" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <rect x="20" y="82" width="74" height="9" rx="4.5" fill="currentColor" opacity="0.14" />
      <circle cx="69" cy="86.5" r="8" fill="var(--visual-accent)" />
      <rect x="22" y="17" width="42" height="24" rx="8" fill="currentColor" opacity="0.12" />
      <path d="M31 29H55" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
    </>
  );
}

function UniformCircularMotionGlyph() {
  return (
    <>
      <circle cx="63" cy="61" r="36" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.22" />
      <circle cx="63" cy="61" r="5" fill="currentColor" opacity="0.36" />
      <path d="M63 61L91 39" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.44" />
      <circle cx="91" cy="39" r="9" fill="var(--visual-accent)" />
      <path d="M91 39C99 47 103 53 104 62" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M104 62L108 52L96 56" fill="var(--visual-accent)" />
      <path d="M88 42L69 57" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.45" />
      <path d="M70 57L80 58L76 49" fill="currentColor" opacity="0.45" />
    </>
  );
}

function SimpleHarmonicGlyph() {
  return (
    <>
      <path d="M15 58H111" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.22" />
      <path d="M21 73C32 33 43 33 54 73S76 113 87 73S98 33 109 73" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M22 40H34L42 76L50 40L58 76L66 40" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" opacity="0.35" />
      <rect x="69" y="50" width="28" height="22" rx="6" fill="currentColor" opacity="0.16" />
      <circle cx="83" cy="61" r="7" fill="var(--visual-accent)" />
    </>
  );
}

function VectorsComponentsGlyph() {
  return (
    <>
      <path d="M25 91H103M25 91V23" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.28" />
      <path d="M31 84L91 33" stroke="var(--visual-accent)" strokeWidth="7" strokeLinecap="round" />
      <path d="M91 33L85 48L76 37" fill="var(--visual-accent)" />
      <path d="M31 84H91V33" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="6 6" opacity="0.38" />
      <circle cx="91" cy="84" r="6" fill="currentColor" opacity="0.24" />
    </>
  );
}

function TorqueGlyph() {
  return (
    <>
      <circle cx="42" cy="72" r="11" fill="currentColor" opacity="0.24" />
      <path d="M42 72L94 42" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path d="M82 49L96 73" stroke="var(--visual-accent)" strokeWidth="7" strokeLinecap="round" />
      <path d="M96 73L97 58L84 65" fill="var(--visual-accent)" />
      <path d="M30 72C29 47 47 27 72 27" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
      <path d="M72 27L61 22L64 35" fill="var(--visual-accent)" />
    </>
  );
}

function ProjectileMotionGlyph() {
  return (
    <>
      <path d="M18 90H108" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.24" />
      <path d="M27 84C44 35 70 28 98 76" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      {[27, 45, 66, 87, 98].map((cx, index) => (
        <circle key={cx} cx={cx} cy={[84, 54, 41, 57, 76][index]} r={index === 2 ? 7 : 5} fill={index === 2 ? "var(--visual-accent)" : "currentColor"} opacity={index === 2 ? 1 : 0.28} />
      ))}
      <path d="M32 80L45 67" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.4" />
      <path d="M45 67L42 78L35 70" fill="currentColor" opacity="0.4" />
    </>
  );
}

function WaveMotionGlyph() {
  return (
    <>
      <path d="M17 61C29 37 40 37 52 61S75 85 87 61S99 37 109 57" fill="none" stroke="var(--visual-accent)" strokeWidth="6" strokeLinecap="round" />
      <path d="M29 36V86M64 36V86M99 36V86" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.24" />
      <path d="M28 91H99" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.24" />
      <path d="M50 93H79" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
    </>
  );
}

function ElectricFieldGlyph() {
  return (
    <>
      <circle cx="47" cy="61" r="12" fill="var(--visual-accent)" />
      <circle cx="83" cy="61" r="12" fill="currentColor" opacity="0.18" />
      {[30, 46, 62, 78, 94].map((y) => (
        <path key={y} d={`M55 ${y}C67 ${y - 10} 75 ${y - 10} 94 ${y}`} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.24" />
      ))}
      <path d="M26 28L47 51M26 94L47 71M104 28L85 51M104 94L85 71" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" opacity="0.75" />
    </>
  );
}

function GraphTransformationsGlyph() {
  return (
    <>
      <path d="M25 94V24M25 94H105" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
      <path d="M27 76C42 50 52 49 65 67C76 83 86 73 100 37" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
      <path d="M35 61C50 35 60 34 73 52C84 68 94 58 108 22" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M54 51L69 38" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      <path d="M69 38L57 40L65 50" fill="var(--visual-accent)" />
    </>
  );
}

function CalculusSlopeGlyph() {
  return (
    <>
      <path d="M24 94V24M24 94H106" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
      <path d="M30 82C45 37 68 35 101 72" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.26" />
      <path d="M50 62L96 45" stroke="var(--visual-accent)" strokeWidth="6" strokeLinecap="round" />
      <path d="M96 45L84 55L81 44" fill="var(--visual-accent)" />
      <circle cx="63" cy="57" r="7" fill="var(--visual-accent)" />
      <path d="M62 26V88" stroke="currentColor" strokeWidth="3" strokeDasharray="5 7" strokeLinecap="round" opacity="0.24" />
    </>
  );
}

function LimitApproachGlyph() {
  return (
    <>
      <path d="M22 92H106M64 28V94" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.26" />
      <circle cx="64" cy="60" r="13" fill="none" stroke="var(--visual-accent)" strokeWidth="5" />
      <circle cx="64" cy="60" r="4" fill="var(--visual-accent)" />
      <path d="M25 60H48M103 60H80" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.34" />
      <path d="M48 60L38 51M48 60L38 69M80 60L90 51M80 60L90 69" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M36 82C50 72 78 72 92 82" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.2" />
    </>
  );
}

function OptimizationGlyph() {
  return (
    <>
      <path d="M24 94V24M24 94H106" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
      <path d="M31 84C49 35 78 32 101 82" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="66" cy="48" r="8" fill="var(--visual-accent)" />
      <path d="M66 48V88" stroke="currentColor" strokeWidth="3" strokeDasharray="5 6" strokeLinecap="round" opacity="0.3" />
      <rect x="42" y="67" width="48" height="21" rx="6" fill="currentColor" opacity="0.13" />
      <path d="M42 67H90V88H42Z" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.22" />
    </>
  );
}

function ComplexPlaneGlyph() {
  return (
    <>
      <path d="M25 92H104M64 24V101" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.28" />
      <path d="M64 82L89 45" stroke="var(--visual-accent)" strokeWidth="6" strokeLinecap="round" />
      <path d="M89 45L84 60L75 50" fill="var(--visual-accent)" />
      <path d="M64 82L41 62" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.34" />
      <circle cx="89" cy="45" r="7" fill="var(--visual-accent)" />
      <circle cx="41" cy="62" r="6" fill="currentColor" opacity="0.24" />
      <path d="M75 77C78 67 85 58 94 52" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.26" />
    </>
  );
}

function PolarCoordinatesGlyph() {
  return (
    <>
      <circle cx="63" cy="63" r="38" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.18" />
      <path d="M25 63H103M63 25V101" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.24" />
      <path d="M63 63L91 39" stroke="var(--visual-accent)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="91" cy="39" r="8" fill="var(--visual-accent)" />
      <path d="M81 63C81 55 77 50 72 46" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.34" />
      <path d="M72 46L83 47L78 56" fill="currentColor" opacity="0.34" />
    </>
  );
}

function UnitCircleGlyph() {
  return (
    <>
      <circle cx="63" cy="62" r="36" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.24" />
      <path d="M24 62H102M63 23V101" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.22" />
      <path d="M63 62L90 39" stroke="var(--visual-accent)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="90" cy="39" r="7" fill="var(--visual-accent)" />
      <path d="M90 39V62H63" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="6 6" opacity="0.35" />
      <path d="M77 62C77 55 73 50 68 47" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
    </>
  );
}

function AcidBaseGlyph() {
  return (
    <>
      <path d="M45 22H81M53 22V54L34 92H92L73 54V22" fill="currentColor" opacity="0.08" />
      <path d="M53 22V54L34 92H92L73 54V22" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" opacity="0.34" />
      <path d="M42 78H84" stroke="var(--visual-accent)" strokeWidth="7" strokeLinecap="round" />
      <path d="M28 103H98" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.18" />
      {[38, 48, 58, 68, 78, 88].map((x, index) => (
        <rect key={x} x={x} y="100" width="9" height="8" rx="3" fill={index < 2 ? "var(--visual-accent)" : "currentColor"} opacity={index < 2 ? 0.9 : 0.18} />
      ))}
      <circle cx="55" cy="68" r="5" fill="var(--visual-accent)" />
      <circle cx="73" cy="69" r="4" fill="currentColor" opacity="0.28" />
    </>
  );
}

function BinarySearchGlyph() {
  return (
    <>
      {[18, 34, 50, 66, 82, 98].map((x, index) => (
        <rect key={x} x={x} y="55" width="14" height="24" rx="4" fill={index === 2 ? "var(--visual-accent)" : "currentColor"} opacity={index === 2 ? 0.95 : index < 5 ? 0.18 : 0.08} />
      ))}
      <path d="M57 45V28" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M57 28L49 39H65Z" fill="var(--visual-accent)" />
      <path d="M35 88H79" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.28" />
      <path d="M81 88H103" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.1" />
      <path d="M35 91L45 97M35 91L45 85" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.28" />
    </>
  );
}

function GuidedGlyph() {
  return (
    <>
      <path d="M31 28H94" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.2" />
      <path d="M31 58H94" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.2" />
      <path d="M31 88H94" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.2" />
      {[28, 58, 88].map((cy, index) => (
        <g key={cy}>
          <circle cx="31" cy={cy} r="12" fill={index === 0 ? "var(--visual-accent)" : "currentColor"} opacity={index === 0 ? "1" : "0.18"} />
          <path d="M50 28H91" stroke={index === 0 ? "var(--visual-accent)" : "currentColor"} strokeWidth="5" strokeLinecap="round" opacity={index === 0 ? "0.82" : "0.28"} transform={`translate(0 ${cy - 28})`} />
        </g>
      ))}
    </>
  );
}

function TestGlyph() {
  return (
    <>
      <rect x="24" y="18" width="78" height="84" rx="18" fill="currentColor" opacity="0.1" />
      <path d="M42 43L52 53L72 31" fill="none" stroke="var(--visual-accent)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M42 68H86" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.34" />
      <path d="M42 84H75" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.24" />
      <circle cx="90" cy="88" r="12" fill="var(--visual-accent)" opacity="0.86" />
    </>
  );
}

function ToolGlyph() {
  return (
    <>
      <rect x="18" y="23" width="90" height="64" rx="18" fill="currentColor" opacity="0.1" />
      <path d="M35 70L55 50L69 64L91 42" fill="none" stroke="var(--visual-accent)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35 40H55" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.34" />
      <circle cx="37" cy="70" r="8" fill="currentColor" opacity="0.18" />
      <circle cx="91" cy="42" r="8" fill="var(--visual-accent)" />
    </>
  );
}

function CircuitGlyph() {
  return (
    <>
      <path d="M28 34H54V82H82V48H102" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.36" />
      <circle cx="28" cy="34" r="9" fill="var(--visual-accent)" />
      <circle cx="54" cy="82" r="8" fill="currentColor" opacity="0.22" />
      <circle cx="82" cy="48" r="8" fill="currentColor" opacity="0.22" />
      <circle cx="102" cy="48" r="9" fill="var(--visual-accent)" opacity="0.82" />
      <path d="M39 53H57" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M70 65H92" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
    </>
  );
}

function ChemistryGlyph() {
  return (
    <>
      <path d="M63 18L95 36V72L63 90L31 72V36L63 18Z" fill="currentColor" opacity="0.1" />
      <path d="M63 18L95 36V72L63 90L31 72V36L63 18Z" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinejoin="round" />
      <circle cx="63" cy="54" r="10" fill="var(--visual-accent)" opacity="0.9" />
      <circle cx="31" cy="72" r="7" fill="currentColor" opacity="0.28" />
      <circle cx="95" cy="36" r="7" fill="currentColor" opacity="0.28" />
      <path d="M44 54H82" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
    </>
  );
}

function ProgressGlyph() {
  return (
    <>
      <path d="M25 83C40 50 54 70 67 42C77 20 91 26 104 18" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.24" />
      <circle cx="28" cy="82" r="9" fill="currentColor" opacity="0.2" />
      <circle cx="62" cy="51" r="9" fill="currentColor" opacity="0.2" />
      <circle cx="102" cy="19" r="10" fill="var(--visual-accent)" />
      <rect x="25" y="88" width="68" height="8" rx="4" fill="var(--visual-accent)" opacity="0.78" />
    </>
  );
}

function SubjectGlyph() {
  return (
    <>
      <circle cx="63" cy="59" r="15" fill="var(--visual-accent)" />
      <path d="M63 44V24M63 74V96M48 59H28M78 59H98" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.28" />
      {[24, 96, 28, 98].map((value, index) => (
        <circle key={`${value}-${index}`} cx={index < 2 ? 63 : value} cy={index === 0 ? 24 : index === 1 ? 96 : 59} r="9" fill="currentColor" opacity="0.16" />
      ))}
    </>
  );
}

function TopicGlyph() {
  return (
    <>
      <rect x="23" y="23" width="32" height="32" rx="10" fill="var(--visual-accent)" opacity="0.9" />
      <rect x="70" y="23" width="32" height="32" rx="10" fill="currentColor" opacity="0.14" />
      <rect x="23" y="70" width="32" height="32" rx="10" fill="currentColor" opacity="0.14" />
      <rect x="70" y="70" width="32" height="32" rx="10" fill="currentColor" opacity="0.14" />
      <path d="M55 39H70M39 55V70M86 55V70" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
    </>
  );
}

function ChallengeGlyph() {
  return (
    <>
      <circle cx="63" cy="60" r="39" fill="currentColor" opacity="0.08" />
      <circle cx="63" cy="60" r="27" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.22" />
      <circle cx="63" cy="60" r="13" fill="var(--visual-accent)" />
      <path d="M84 38L101 21M92 21H101V30" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.36" />
    </>
  );
}

function SearchGlyph() {
  return (
    <>
      <circle cx="55" cy="52" r="25" fill="currentColor" opacity="0.08" stroke="var(--visual-accent)" strokeWidth="6" />
      <path d="M73 70L97 94" stroke="var(--visual-accent)" strokeWidth="7" strokeLinecap="round" />
      <path d="M38 45H64M38 58H57" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.28" />
      <rect x="79" y="24" width="24" height="17" rx="7" fill="currentColor" opacity="0.14" />
    </>
  );
}

function renderMotif(motif: LearningVisualMotif) {
  switch (motif) {
    case "acid-base":
      return <AcidBaseGlyph />;
    case "binary-search":
      return <BinarySearchGlyph />;
    case "calculus-slope":
      return <CalculusSlopeGlyph />;
    case "chemistry-reaction":
      return <ChemistryGlyph />;
    case "complex-plane":
      return <ComplexPlaneGlyph />;
    case "circuit":
      return <CircuitGlyph />;
    case "electric-field":
      return <ElectricFieldGlyph />;
    case "graph-transformations":
      return <GraphTransformationsGlyph />;
    case "limit-approach":
      return <LimitApproachGlyph />;
    case "optimization":
      return <OptimizationGlyph />;
    case "polar-coordinates":
      return <PolarCoordinatesGlyph />;
    case "projectile-motion":
      return <ProjectileMotionGlyph />;
    case "simple-harmonic-motion":
      return <SimpleHarmonicGlyph />;
    case "torque":
      return <TorqueGlyph />;
    case "unit-circle":
      return <UnitCircleGlyph />;
    case "uniform-circular-motion":
      return <UniformCircularMotionGlyph />;
    case "vectors-components":
      return <VectorsComponentsGlyph />;
    case "wave-motion":
      return <WaveMotionGlyph />;
  }

  return <SimulationGlyph />;
}

function renderGlyph(kind: LearningVisualKind, motif?: LearningVisualMotif) {
  if (motif) {
    return renderMotif(motif);
  }

  switch (kind) {
    case "challenge":
      return <ChallengeGlyph />;
    case "chemistry":
      return <ChemistryGlyph />;
    case "circuit":
      return <CircuitGlyph />;
    case "guided":
      return <GuidedGlyph />;
    case "progress":
      return <ProgressGlyph />;
    case "search":
      return <SearchGlyph />;
    case "subject":
      return <SubjectGlyph />;
    case "test":
      return <TestGlyph />;
    case "tool":
      return <ToolGlyph />;
    case "topic":
      return <TopicGlyph />;
    case "concept":
    case "simulation":
    default:
      return <SimulationGlyph />;
  }
}

function resolveFallbackKind(input: {
  fallbackKind?: LearningVisualFallbackKind;
  isFallback: boolean;
  kind: LearningVisualKind;
  motif?: LearningVisualMotif;
}): LearningVisualFallbackKind {
  if (input.fallbackKind) {
    return input.fallbackKind;
  }

  if (input.motif) {
    return "topic-specific";
  }

  if (input.isFallback && (input.kind === "concept" || input.kind === "simulation")) {
    return "generic";
  }

  return "category-specific";
}

export function LearningVisual({
  kind,
  motif,
  isFallback = false,
  fallbackKind,
  tone = "teal",
  className,
  ariaLabel,
  compact = false,
}: LearningVisualProps) {
  const resolvedFallbackKind = resolveFallbackKind({
    fallbackKind,
    isFallback,
    kind,
    motif,
  });

  return (
    <div
      className={[
        "relative overflow-hidden rounded-[22px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
        compact ? "h-24" : "h-32",
        toneClasses[tone],
        className ?? "",
      ].join(" ")}
      style={accentStyles[tone]}
      data-testid="learning-visual"
      data-visual-kind={kind}
      data-visual-motif={motif ?? "generic"}
      data-visual-fallback={isFallback ? "true" : "false"}
      data-visual-fallback-kind={resolvedFallbackKind}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),transparent_58%)]" />
      <svg
        viewBox="0 0 126 120"
        className="absolute inset-0 h-full w-full"
        focusable="false"
      >
        {renderGlyph(kind, motif)}
      </svg>
    </div>
  );
}
