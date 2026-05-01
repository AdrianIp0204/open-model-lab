import type { CSSProperties } from "react";

export type LearningVisualKind =
  | "challenge"
  | "chemistry"
  | "circuit"
  | "concept"
  | "guided"
  | "progress"
  | "search"
  | "simulation"
  | "subject"
  | "test"
  | "tool"
  | "topic";

export type LearningVisualTone = "amber" | "coral" | "ink" | "sky" | "teal";

type LearningVisualProps = {
  kind: LearningVisualKind;
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

function renderGlyph(kind: LearningVisualKind) {
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

export function LearningVisual({
  kind,
  tone = "teal",
  className,
  ariaLabel,
  compact = false,
}: LearningVisualProps) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-[22px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
        compact ? "h-24" : "h-32",
        toneClasses[tone],
        className ?? "",
      ].join(" ")}
      style={accentStyles[tone]}
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
        {renderGlyph(kind)}
      </svg>
    </div>
  );
}
