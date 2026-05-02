import type { CSSProperties } from "react";
import type {
  LearningVisualFallbackKind,
  LearningVisualKind,
  LearningVisualMotif,
  LearningVisualOverlay,
  LearningVisualTone,
} from "./learningVisualDescriptors";

export type {
  LearningVisualDescriptor,
  LearningVisualFallbackKind,
  LearningVisualKind,
  LearningVisualMotif,
  LearningVisualOverlay,
  LearningVisualTone,
} from "./learningVisualDescriptors";

type LearningVisualProps = {
  kind: LearningVisualKind;
  motif?: LearningVisualMotif;
  isFallback?: boolean;
  fallbackKind?: LearningVisualFallbackKind;
  tone?: LearningVisualTone;
  overlay?: LearningVisualOverlay;
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

function OscillationEnergyGlyph() {
  return (
    <>
      <path d="M16 67H110" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.22" />
      <path d="M24 68C34 34 45 34 55 68S76 102 86 68S100 34 108 68" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <rect x="28" y="82" width="22" height="14" rx="5" fill="currentColor" opacity="0.16" />
      <rect x="54" y="72" width="22" height="24" rx="5" fill="var(--visual-accent)" opacity="0.82" />
      <rect x="80" y="58" width="22" height="38" rx="5" fill="currentColor" opacity="0.2" />
      <path d="M34 45H76" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
      <path d="M76 45L65 37M76 45L65 53" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function DampingResonanceGlyph() {
  return (
    <>
      <path d="M18 77C30 34 43 34 55 65S78 91 91 61S103 41 109 55" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M19 87C36 82 55 78 78 78C91 78 101 80 108 84" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.28" />
      <path d="M27 36C45 24 77 24 96 42" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.28" />
      <path d="M96 42L84 39L91 29" fill="currentColor" opacity="0.3" />
      <circle cx="72" cy="50" r="7" fill="var(--visual-accent)" />
      <path d="M32 99H99" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.22" />
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

function MomentumCartsGlyph() {
  return (
    <>
      <path d="M17 83H109" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.24" />
      <rect x="25" y="56" width="28" height="20" rx="6" fill="currentColor" opacity="0.18" />
      <rect x="72" y="56" width="28" height="20" rx="6" fill="var(--visual-accent)" opacity="0.88" />
      <circle cx="33" cy="78" r="5" fill="currentColor" opacity="0.28" />
      <circle cx="45" cy="78" r="5" fill="currentColor" opacity="0.28" />
      <circle cx="80" cy="78" r="5" fill="currentColor" opacity="0.28" />
      <circle cx="92" cy="78" r="5" fill="currentColor" opacity="0.28" />
      <path d="M27 42H55M72 42H102" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M55 42L44 34M55 42L44 50M72 42L83 34M72 42L83 50" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M57 65H69" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.24" />
    </>
  );
}

function CollisionsGlyph() {
  return (
    <>
      <path d="M17 84H109" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.22" />
      <rect x="28" y="58" width="27" height="20" rx="6" fill="var(--visual-accent)" opacity="0.88" />
      <rect x="72" y="58" width="27" height="20" rx="6" fill="currentColor" opacity="0.18" />
      <circle cx="36" cy="80" r="5" fill="currentColor" opacity="0.28" />
      <circle cx="48" cy="80" r="5" fill="currentColor" opacity="0.28" />
      <circle cx="80" cy="80" r="5" fill="currentColor" opacity="0.28" />
      <circle cx="92" cy="80" r="5" fill="currentColor" opacity="0.28" />
      <path d="M22 43H50M104 43H76" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.34" />
      <path d="M50 43L39 35M50 43L39 51M76 43L87 35M76 43L87 51" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M58 53L64 45L70 53M58 45L64 53L70 45" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
    </>
  );
}

function RotationalInertiaGlyph() {
  return (
    <>
      <circle cx="63" cy="61" r="7" fill="var(--visual-accent)" />
      <path d="M31 61H95" stroke="currentColor" strokeWidth="7" strokeLinecap="round" opacity="0.34" />
      <circle cx="34" cy="61" r="11" fill="currentColor" opacity="0.18" />
      <circle cx="92" cy="61" r="11" fill="currentColor" opacity="0.18" />
      <path d="M37 32C52 18 78 20 91 38" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M91 38L78 34L86 26" fill="var(--visual-accent)" />
      <path d="M89 88C74 102 48 100 35 82" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.32" />
      <path d="M35 82L48 86L40 94" fill="currentColor" opacity="0.32" />
    </>
  );
}

function GravityOrbitsGlyph() {
  return (
    <>
      <circle cx="63" cy="61" r="13" fill="var(--visual-accent)" />
      <ellipse cx="63" cy="61" rx="45" ry="24" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.22" transform="rotate(-18 63 61)" />
      <ellipse cx="63" cy="61" rx="31" ry="44" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.14" transform="rotate(18 63 61)" />
      <circle cx="97" cy="45" r="7" fill="currentColor" opacity="0.32" />
      <path d="M97 45C94 56 87 65 77 70" fill="none" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" />
      <path d="M77 70L90 71L84 60" fill="var(--visual-accent)" />
      <path d="M63 61L84 53" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.28" />
    </>
  );
}

function OrbitalSpeedGlyph() {
  return (
    <>
      <circle cx="62" cy="61" r="12" fill="var(--visual-accent)" />
      <ellipse cx="62" cy="61" rx="43" ry="26" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.22" transform="rotate(-14 62 61)" />
      <circle cx="98" cy="49" r="7" fill="currentColor" opacity="0.34" />
      <path d="M98 49H111" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M111 49L101 41M111 49L101 57" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M62 61L98 49" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.25" />
      <path d="M30 78C42 91 65 98 88 88" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.18" />
    </>
  );
}

function GravitationalFieldGlyph() {
  return (
    <>
      <circle cx="63" cy="61" r="13" fill="var(--visual-accent)" />
      {[28, 44, 62, 80, 98].map((x, index) => (
        <path
          key={x}
          d={`M${x} ${[31, 42, 24, 42, 31][index]}L${63 + (x < 63 ? -10 : x > 63 ? 10 : 0)} ${54}`}
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.3"
        />
      ))}
      <path d="M31 91L53 71M95 91L73 71" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
      <circle cx="92" cy="41" r="7" fill="currentColor" opacity="0.22" />
      <path d="M89 44L73 55" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M73 55L84 56L79 47" fill="var(--visual-accent)" />
    </>
  );
}

function GravitationalPotentialGlyph() {
  return (
    <>
      <path d="M23 91H105M23 91V28" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.28" />
      <path d="M30 46C45 48 53 70 63 83C75 64 89 53 104 48" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="63" cy="81" r="7" fill="var(--visual-accent)" />
      <path d="M47 55L35 64M78 70L94 59" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
      <path d="M94 59L88 70L82 61" fill="currentColor" opacity="0.3" />
      <path d="M55 26H93" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.2" />
    </>
  );
}

function KeplerPeriodGlyph() {
  return (
    <>
      <circle cx="61" cy="61" r="10" fill="var(--visual-accent)" />
      <ellipse cx="61" cy="61" rx="24" ry="16" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.24" />
      <ellipse cx="61" cy="61" rx="47" ry="31" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.16" />
      <circle cx="85" cy="61" r="5" fill="currentColor" opacity="0.32" />
      <circle cx="106" cy="61" r="7" fill="currentColor" opacity="0.24" />
      <path d="M75 36C87 27 104 31 111 44" fill="none" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" />
      <path d="M111 44L99 40L107 33" fill="var(--visual-accent)" />
      <path d="M28 93H91" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.22" />
      <path d="M34 93V84M57 93V78M84 93V70" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" opacity="0.75" />
    </>
  );
}

function EscapeVelocityGlyph() {
  return (
    <>
      <circle cx="45" cy="75" r="13" fill="var(--visual-accent)" />
      <path d="M45 75C58 48 76 31 105 21" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M105 21L94 32L91 20" fill="var(--visual-accent)" />
      <path d="M32 91C48 105 75 101 91 83" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.22" />
      <path d="M20 75C35 51 63 38 92 39" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="6 7" strokeLinecap="round" opacity="0.25" />
      <circle cx="87" cy="48" r="5" fill="currentColor" opacity="0.26" />
    </>
  );
}

function OpticsRayGlyph() {
  return (
    <>
      <path d="M63 22C76 38 76 84 63 100C50 84 50 38 63 22Z" fill="currentColor" opacity="0.1" stroke="var(--visual-accent)" strokeWidth="4" />
      <path d="M17 43H56M17 61H56M17 79H56" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.32" />
      <path d="M70 45L108 31M70 61H109M70 77L108 91" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="63" cy="61" r="5" fill="var(--visual-accent)" />
    </>
  );
}

function RefractionSnellGlyph() {
  return (
    <>
      <path d="M20 62H106" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.22" />
      <path d="M64 25V99" stroke="currentColor" strokeWidth="3" strokeDasharray="6 7" strokeLinecap="round" opacity="0.22" />
      <path d="M28 31L64 62L96 84" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M96 84L83 81M96 84L88 73" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M27 75C45 69 82 69 101 75" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.16" />
      <circle cx="64" cy="62" r="6" fill="var(--visual-accent)" />
    </>
  );
}

function DispersionPrismGlyph() {
  return (
    <>
      <path d="M57 28L88 91H26Z" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <path d="M15 58H49" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.32" />
      <path d="M68 53L108 37M70 63L111 63M68 73L108 91" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" />
      <path d="M38 91H96" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.18" />
      <circle cx="57" cy="61" r="5" fill="var(--visual-accent)" />
    </>
  );
}

function TotalInternalReflectionGlyph() {
  return (
    <>
      <path d="M20 63H106" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.22" />
      <path d="M24 88H102" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.16" />
      <path d="M35 91L64 63L96 36" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M96 36L83 39M96 36L88 48" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M64 25V99" stroke="currentColor" strokeWidth="3" strokeDasharray="6 7" strokeLinecap="round" opacity="0.2" />
      <path d="M78 49C88 58 96 63 106 64" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.18" />
      <circle cx="64" cy="63" r="6" fill="var(--visual-accent)" />
    </>
  );
}

function MirrorReflectionGlyph() {
  return (
    <>
      <path d="M82 25V99" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity="0.28" />
      <path d="M88 34L99 28M88 50L99 44M88 66L99 60M88 82L99 76" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.22" />
      <path d="M26 40L82 62L31 86" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M31 86L42 75M31 86L46 90" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 62H82" stroke="currentColor" strokeWidth="3" strokeDasharray="5 7" strokeLinecap="round" opacity="0.22" />
      <circle cx="82" cy="62" r="5" fill="var(--visual-accent)" />
    </>
  );
}

function LensImagingGlyph() {
  return (
    <>
      <path d="M63 23C76 39 76 85 63 101C50 85 50 39 63 23Z" fill="currentColor" opacity="0.1" stroke="var(--visual-accent)" strokeWidth="4" />
      <path d="M22 36H57M22 63H57M22 90H57" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.28" />
      <path d="M69 42L101 31M69 63H104M69 84L101 95" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" />
      <path d="M100 39V87" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.2" />
      <circle cx="100" cy="63" r="6" fill="var(--visual-accent)" />
    </>
  );
}

function OpticalResolutionGlyph() {
  return (
    <>
      <path d="M24 35V91M36 35V91" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.26" />
      <path d="M36 51C52 45 65 43 82 43M36 75C52 81 65 83 82 83" fill="none" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="88" cy="63" r="24" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.18" />
      <circle cx="88" cy="63" r="11" fill="none" stroke="var(--visual-accent)" strokeWidth="5" />
      <circle cx="88" cy="63" r="4" fill="var(--visual-accent)" />
      <path d="M57 98H107" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.18" />
    </>
  );
}

function StandingWaveGlyph() {
  return (
    <>
      <path d="M18 62H108" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.22" />
      <path d="M20 62C34 32 48 32 63 62S92 92 106 62" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M20 62C34 92 48 92 63 62S92 32 106 62" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.28" />
      {[20, 63, 106].map((cx) => (
        <circle key={cx} cx={cx} cy="62" r="5" fill="currentColor" opacity="0.3" />
      ))}
      <path d="M20 35V89M63 35V89M106 35V89" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.18" />
    </>
  );
}

function SoundPitchGlyph() {
  return (
    <>
      <path d="M24 51L40 41V81L24 71Z" fill="var(--visual-accent)" />
      <path d="M44 47C51 54 51 68 44 75M55 39C67 51 67 71 55 83" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
      <path d="M70 37C76 51 76 73 70 87M84 37C90 51 90 73 84 87M98 37C104 51 104 73 98 87" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M69 94H101" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.22" />
    </>
  );
}

function SoundBeatsGlyph() {
  return (
    <>
      <path d="M18 61C27 43 36 43 45 61S63 79 72 61S90 43 108 61" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.28" />
      <path d="M18 61C30 30 43 30 55 61S80 92 108 61" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M30 93C44 83 55 83 70 93S94 103 104 92" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.22" />
      <path d="M35 33V89M72 33V89M101 33V89" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.18" />
      <circle cx="72" cy="61" r="6" fill="var(--visual-accent)" />
    </>
  );
}

function SoundDopplerGlyph() {
  return (
    <>
      <path d="M31 52L46 43V81L31 72Z" fill="var(--visual-accent)" />
      <path d="M51 61H82" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M82 61L71 53M82 61L71 69" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M87 36C94 50 94 73 87 88M100 41C105 53 105 70 100 82" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.34" />
      <path d="M20 42C14 53 14 70 20 82M10 50C6 57 6 66 10 74" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.2" />
      <circle cx="93" cy="61" r="6" fill="currentColor" opacity="0.2" />
    </>
  );
}

function ThermalEnergyGlyph() {
  return (
    <>
      <path d="M43 86C36 74 45 66 49 57C54 66 64 69 60 84C70 76 76 65 73 49C88 61 94 75 86 91C78 105 51 106 43 86Z" fill="var(--visual-accent)" opacity="0.88" />
      <path d="M82 24V77" stroke="currentColor" strokeWidth="7" strokeLinecap="round" opacity="0.24" />
      <circle cx="82" cy="86" r="13" fill="currentColor" opacity="0.2" />
      <path d="M82 72V42" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      {[29, 42, 96].map((cx, index) => (
        <circle key={cx} cx={cx} cy={[43, 25, 55][index]} r="5" fill="currentColor" opacity="0.22" />
      ))}
    </>
  );
}

function AtomicSpectraGlyph() {
  return (
    <>
      <circle cx="44" cy="60" r="10" fill="var(--visual-accent)" />
      <ellipse cx="44" cy="60" rx="27" ry="13" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.24" transform="rotate(-24 44 60)" />
      <ellipse cx="44" cy="60" rx="27" ry="13" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.18" transform="rotate(45 44 60)" />
      <path d="M75 31V92M88 31V92M101 31V92" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity="0.18" />
      <path d="M82 31V92M96 31V92" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="64" cy="47" r="5" fill="currentColor" opacity="0.28" />
    </>
  );
}

function RadioactivityGlyph() {
  return (
    <>
      <circle cx="46" cy="60" r="20" fill="currentColor" opacity="0.12" />
      <circle cx="46" cy="60" r="7" fill="var(--visual-accent)" />
      <path d="M46 39V23M46 97V81M25 60H9M83 60H67" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
      <path d="M72 92C82 82 86 68 87 49" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.28" />
      <path d="M87 49L77 59L89 63" fill="currentColor" opacity="0.28" />
      <path d="M77 34L92 19M77 86L96 101" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.22" />
    </>
  );
}

function FluidBuoyancyGlyph() {
  return (
    <>
      <path d="M18 76C33 66 47 86 63 76S92 66 108 76V100H18Z" fill="currentColor" opacity="0.12" />
      <path d="M18 76C33 66 47 86 63 76S92 66 108 76" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <rect x="46" y="52" width="34" height="30" rx="7" fill="var(--visual-accent)" opacity="0.88" />
      <path d="M63 54V28" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.35" />
      <path d="M63 28L54 41H72Z" fill="currentColor" opacity="0.35" />
      <path d="M32 92H96" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.24" />
    </>
  );
}

function FluidPressureGlyph() {
  return (
    <>
      <rect x="31" y="28" width="65" height="68" rx="5" fill="currentColor" opacity="0.1" />
      <path d="M31 28H96V96H31Z" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.18" />
      <path d="M34 55H93V96H34Z" fill="var(--visual-accent)" opacity="0.22" />
      <circle cx="63" cy="72" r="7" fill="var(--visual-accent)" />
      <path d="M63 42V67M45 72H58M68 72H82M63 78V92" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.34" />
      <path d="M63 67L55 57H71Z" fill="currentColor" opacity="0.34" />
      <path d="M28 96H99" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.22" />
    </>
  );
}

function FluidContinuityGlyph() {
  return (
    <>
      <path d="M18 52C38 42 48 43 59 53C68 62 82 63 108 50V72C82 84 68 83 58 73C47 63 38 62 18 73Z" fill="currentColor" opacity="0.12" />
      <path d="M21 62H50M75 62H108" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M50 62L40 54M50 62L40 70M108 62L98 54M108 62L98 70" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M55 43V82M72 48V76" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.28" />
      <path d="M30 91H97" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.22" />
    </>
  );
}

function FluidBernoulliGlyph() {
  return (
    <>
      <path d="M18 58C36 45 48 45 61 57C73 69 88 68 108 51V76C88 91 73 91 61 78C48 65 36 66 18 78Z" fill="currentColor" opacity="0.12" />
      <path d="M26 48H42M77 39H101" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.24" />
      <path d="M34 83H54M79 76H104" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.24" />
      <path d="M42 63H71" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M71 63L61 55M71 63L61 71" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="85" cy="56" r="6" fill="var(--visual-accent)" />
      <path d="M83 56V35" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
    </>
  );
}

function FluidDragGlyph() {
  return (
    <>
      <path d="M63 25V83" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M63 83L53 71M63 83L73 71" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="63" cy="62" r="12" fill="currentColor" opacity="0.2" />
      <path d="M45 44C33 52 33 70 45 78M81 44C93 52 93 70 81 78" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.28" />
      <path d="M37 31H89M37 94H89" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.2" />
      <path d="M42 88H84" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.24" />
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

function RationalAsymptoteGlyph() {
  return (
    <>
      <path d="M25 94V24M25 94H105" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
      <path d="M64 29V96M28 56H104" stroke="currentColor" strokeWidth="3" strokeDasharray="6 7" strokeLinecap="round" opacity="0.24" />
      <path d="M31 38C45 39 55 45 61 53M68 62C77 76 87 84 101 86" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="64" cy="56" r="5" fill="currentColor" opacity="0.22" />
      <path d="M42 73H55M78 40H94" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.22" />
    </>
  );
}

function ExponentialChangeGlyph() {
  return (
    <>
      <path d="M24 94V27M24 94H106" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
      <path d="M31 87C48 86 57 79 66 65C75 51 84 36 101 31" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      {[44, 62, 82].map((cx, index) => (
        <circle key={cx} cx={cx} cy={[83, 70, 44][index]} r="5" fill={index === 2 ? "var(--visual-accent)" : "currentColor"} opacity={index === 2 ? 0.9 : 0.24} />
      ))}
      <path d="M37 59H50M37 46H56M37 33H66" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.22" />
      <path d="M96 31L83 29M96 31L87 42" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function GraphNetworkGlyph() {
  const nodes = [
    [39, 42],
    [76, 34],
    [91, 69],
    [55, 83],
    [30, 70],
  ];

  return (
    <>
      <path d="M39 42L76 34L91 69L55 83L30 70L39 42M39 42L55 83M76 34L55 83" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.26" />
      <rect x="70" y="72" width="30" height="24" rx="6" fill="currentColor" opacity="0.1" />
      <path d="M76 80H94M76 88H89" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
      {nodes.map(([cx, cy], index) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="8" fill={index === 1 ? "var(--visual-accent)" : "currentColor"} opacity={index === 1 ? 0.9 : 0.2} />
      ))}
    </>
  );
}

function BreadthFirstLayersGlyph() {
  return (
    <>
      <circle cx="63" cy="33" r="9" fill="var(--visual-accent)" />
      <path d="M63 42L42 63M63 42L84 63M42 72L31 91M42 72L53 91M84 72L73 91M84 72L95 91" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.28" />
      {[42, 84].map((cx) => (
        <circle key={cx} cx={cx} cy="66" r="8" fill="currentColor" opacity="0.22" />
      ))}
      {[31, 53, 73, 95].map((cx) => (
        <circle key={cx} cx={cx} cy="94" r="7" fill="currentColor" opacity="0.16" />
      ))}
      <path d="M24 66H102M21 94H105" stroke="var(--visual-accent)" strokeWidth="4" strokeDasharray="6 7" strokeLinecap="round" opacity="0.62" />
    </>
  );
}

function DepthFirstBacktrackingGlyph() {
  return (
    <>
      <path d="M40 32L76 47L54 66L88 84" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M76 47L98 38M54 66L33 82" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.24" />
      <path d="M88 84C67 91 47 83 33 82" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="6 7" strokeLinecap="round" opacity="0.28" />
      {[40, 76, 54, 88, 98, 33].map((cx, index) => (
        <circle key={`${cx}-${index}`} cx={cx} cy={[32, 47, 66, 84, 38, 82][index]} r="7" fill={index < 4 ? "var(--visual-accent)" : "currentColor"} opacity={index < 4 ? 0.88 : 0.18} />
      ))}
      <path d="M88 84L75 78M88 84L77 92" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function FrontierVisitedGlyph() {
  return (
    <>
      <path d="M34 40L62 34L90 47L83 79L50 86L34 40M62 34L50 86M90 47L50 86" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />
      <circle cx="34" cy="40" r="8" fill="currentColor" opacity="0.2" />
      <circle cx="62" cy="34" r="8" fill="currentColor" opacity="0.2" />
      <circle cx="50" cy="86" r="8" fill="currentColor" opacity="0.2" />
      <circle cx="90" cy="47" r="10" fill="none" stroke="var(--visual-accent)" strokeWidth="5" />
      <circle cx="83" cy="79" r="10" fill="none" stroke="var(--visual-accent)" strokeWidth="5" />
      <path d="M26 101H58M71 101H102" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.18" />
      <path d="M90 47L83 79" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" opacity="0.62" />
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

function SeriesParallelCircuitGlyph() {
  return (
    <>
      <path d="M24 62H38M88 62H104" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.34" />
      <path d="M38 62V36H88V62M38 62V88H88V62" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.28" />
      <path d="M50 36H76M50 88H76" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M54 36L60 27L68 45L76 36M54 88L60 79L68 97L76 88" fill="none" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="62" r="8" fill="var(--visual-accent)" />
      <circle cx="104" cy="62" r="8" fill="currentColor" opacity="0.22" />
    </>
  );
}

function KirchhoffRulesGlyph() {
  return (
    <>
      <path d="M33 30H93V92H33Z" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" opacity="0.26" />
      <path d="M33 30H93M93 30V92M93 92H33M33 92V30" fill="none" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" strokeDasharray="9 8" opacity="0.82" />
      <circle cx="63" cy="61" r="9" fill="var(--visual-accent)" />
      <path d="M63 61H33M63 61H93M63 61V30M63 61V92" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.32" />
      <path d="M87 30L76 23M87 30L76 37M39 92L50 85M39 92L50 99" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="33" cy="61" r="5" fill="currentColor" opacity="0.22" />
      <circle cx="93" cy="61" r="5" fill="currentColor" opacity="0.22" />
    </>
  );
}

function EquivalentResistanceGlyph() {
  return (
    <>
      <path d="M18 42H35M18 78H35M91 60H108" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.28" />
      <path d="M35 42L45 32L55 52L65 32L75 52L85 42M35 78L45 68L55 88L65 68L75 88L85 78" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.34" />
      <path d="M85 42C96 46 98 54 91 60C98 66 96 74 85 78" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.28" />
      <path d="M34 60H58L65 49L76 71L84 60H96" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M48 101H80" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
    </>
  );
}

function CircuitPowerGlyph() {
  return (
    <>
      <path d="M27 74H42V38H84V74H100" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.28" />
      <circle cx="63" cy="38" r="15" fill="currentColor" opacity="0.12" stroke="var(--visual-accent)" strokeWidth="5" />
      <path d="M54 39L62 25L60 38H73L61 55L64 42H54Z" fill="var(--visual-accent)" />
      <rect x="35" y="80" width="11" height="18" rx="5" fill="currentColor" opacity="0.18" />
      <rect x="55" y="72" width="11" height="26" rx="5" fill="var(--visual-accent)" opacity="0.88" />
      <rect x="75" y="62" width="11" height="36" rx="5" fill="currentColor" opacity="0.22" />
      <path d="M29 100H95" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.2" />
    </>
  );
}

function CapacitanceStorageGlyph() {
  return (
    <>
      <path d="M26 62H47M79 62H100" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.28" />
      <path d="M49 32V92M77 32V92" stroke="var(--visual-accent)" strokeWidth="7" strokeLinecap="round" />
      <path d="M56 41H70M56 57H70M56 73H70" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.24" />
      <path d="M30 62V91H96V62" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.22" />
      {[36, 44, 82, 90].map((cx, index) => (
        <circle key={cx} cx={cx} cy={index < 2 ? 48 : 78} r="5" fill={index < 2 ? "var(--visual-accent)" : "currentColor"} opacity={index < 2 ? 0.9 : 0.22} />
      ))}
      <path d="M36 91H52M74 91H91" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" />
    </>
  );
}

function RcTimeConstantGlyph() {
  return (
    <>
      <path d="M24 77H43V42H74V77H93" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.28" />
      <path d="M43 42L50 33L57 51L64 33L71 42" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.36" />
      <path d="M84 48V76M96 48V76" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M23 97H104M32 91C45 70 55 59 70 54C84 49 94 48 104 48" fill="none" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M32 34V97" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.22" />
      <circle cx="70" cy="54" r="5" fill="var(--visual-accent)" />
    </>
  );
}

function InternalResistanceGlyph() {
  return (
    <>
      <path d="M25 63H44M82 63H103" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.3" />
      <path d="M45 36V90M58 46V80" stroke="var(--visual-accent)" strokeWidth="6" strokeLinecap="round" />
      <path d="M63 63H71L76 53L82 73L88 63H101" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.36" />
      <path d="M33 93H94" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.22" />
      <path d="M36 28H90" stroke="var(--visual-accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M90 28L78 20M90 28L78 36" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M72 39C82 45 90 53 96 64" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.24" />
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
    case "atomic-spectra":
      return <AtomicSpectraGlyph />;
    case "binary-search":
      return <BinarySearchGlyph />;
    case "breadth-first-layers":
      return <BreadthFirstLayersGlyph />;
    case "calculus-slope":
      return <CalculusSlopeGlyph />;
    case "capacitance-storage":
      return <CapacitanceStorageGlyph />;
    case "chemistry-reaction":
      return <ChemistryGlyph />;
    case "complex-plane":
      return <ComplexPlaneGlyph />;
    case "circuit":
      return <CircuitGlyph />;
    case "circuit-power":
      return <CircuitPowerGlyph />;
    case "collisions":
      return <CollisionsGlyph />;
    case "damping-resonance":
      return <DampingResonanceGlyph />;
    case "depth-first-backtracking":
      return <DepthFirstBacktrackingGlyph />;
    case "dispersion-prism":
      return <DispersionPrismGlyph />;
    case "electric-field":
      return <ElectricFieldGlyph />;
    case "escape-velocity":
      return <EscapeVelocityGlyph />;
    case "equivalent-resistance":
      return <EquivalentResistanceGlyph />;
    case "exponential-change":
      return <ExponentialChangeGlyph />;
    case "fluid-bernoulli":
      return <FluidBernoulliGlyph />;
    case "fluid-buoyancy":
      return <FluidBuoyancyGlyph />;
    case "fluid-continuity":
      return <FluidContinuityGlyph />;
    case "fluid-drag":
      return <FluidDragGlyph />;
    case "fluid-pressure":
      return <FluidPressureGlyph />;
    case "frontier-visited":
      return <FrontierVisitedGlyph />;
    case "graph-network":
      return <GraphNetworkGlyph />;
    case "graph-transformations":
      return <GraphTransformationsGlyph />;
    case "gravitational-field":
      return <GravitationalFieldGlyph />;
    case "gravitational-potential":
      return <GravitationalPotentialGlyph />;
    case "gravity-orbits":
      return <GravityOrbitsGlyph />;
    case "internal-resistance":
      return <InternalResistanceGlyph />;
    case "kepler-period":
      return <KeplerPeriodGlyph />;
    case "kirchhoff-rules":
      return <KirchhoffRulesGlyph />;
    case "lens-imaging":
      return <LensImagingGlyph />;
    case "limit-approach":
      return <LimitApproachGlyph />;
    case "mirror-reflection":
      return <MirrorReflectionGlyph />;
    case "momentum-carts":
      return <MomentumCartsGlyph />;
    case "optimization":
      return <OptimizationGlyph />;
    case "optical-resolution":
      return <OpticalResolutionGlyph />;
    case "orbital-speed":
      return <OrbitalSpeedGlyph />;
    case "optics-ray":
      return <OpticsRayGlyph />;
    case "polar-coordinates":
      return <PolarCoordinatesGlyph />;
    case "projectile-motion":
      return <ProjectileMotionGlyph />;
    case "radioactivity":
      return <RadioactivityGlyph />;
    case "rational-asymptote":
      return <RationalAsymptoteGlyph />;
    case "refraction-snell":
      return <RefractionSnellGlyph />;
    case "rc-time-constant":
      return <RcTimeConstantGlyph />;
    case "rotational-inertia":
      return <RotationalInertiaGlyph />;
    case "series-parallel-circuit":
      return <SeriesParallelCircuitGlyph />;
    case "simple-harmonic-motion":
      return <SimpleHarmonicGlyph />;
    case "oscillation-energy":
      return <OscillationEnergyGlyph />;
    case "sound-beats":
      return <SoundBeatsGlyph />;
    case "sound-doppler":
      return <SoundDopplerGlyph />;
    case "sound-pitch":
      return <SoundPitchGlyph />;
    case "standing-wave":
      return <StandingWaveGlyph />;
    case "thermal-energy":
      return <ThermalEnergyGlyph />;
    case "torque":
      return <TorqueGlyph />;
    case "total-internal-reflection":
      return <TotalInternalReflectionGlyph />;
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

function renderOverlay(overlay?: LearningVisualOverlay) {
  if (overlay === "assessment") {
    return (
      <g transform="translate(82 75)">
        <rect width="31" height="26" rx="9" fill="white" opacity="0.78" />
        <rect x="4" y="4" width="23" height="18" rx="6" fill="currentColor" opacity="0.16" />
        <path d="M9 13L14 18L23 8" fill="none" stroke="var(--visual-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  }

  if (overlay === "challenge") {
    return (
      <g transform="translate(82 74)">
        <circle cx="16" cy="14" r="15" fill="white" opacity="0.78" />
        <circle cx="16" cy="14" r="11" fill="currentColor" opacity="0.14" />
        <circle cx="16" cy="14" r="6" fill="none" stroke="var(--visual-accent)" strokeWidth="3" />
        <circle cx="16" cy="14" r="2.5" fill="var(--visual-accent)" />
      </g>
    );
  }

  return null;
}

export function LearningVisual({
  kind,
  motif,
  isFallback = false,
  fallbackKind,
  tone = "teal",
  overlay,
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
      data-visual-overlay={overlay ?? "none"}
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
        {renderOverlay(overlay)}
      </svg>
    </div>
  );
}
