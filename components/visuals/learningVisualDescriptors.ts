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

export type LearningVisualFallbackKind =
  | "category-specific"
  | "generic"
  | "topic-specific";

export type LearningVisualMotif =
  | "acid-base"
  | "binary-search"
  | "calculus-slope"
  | "chemistry-reaction"
  | "complex-plane"
  | "circuit"
  | "electric-field"
  | "graph-transformations"
  | "limit-approach"
  | "optimization"
  | "polar-coordinates"
  | "projectile-motion"
  | "simple-harmonic-motion"
  | "torque"
  | "unit-circle"
  | "uniform-circular-motion"
  | "vectors-components"
  | "wave-motion";

export type LearningVisualDescriptor = {
  kind: LearningVisualKind;
  motif?: LearningVisualMotif;
  tone?: LearningVisualTone;
  isFallback: boolean;
  fallbackKind: LearningVisualFallbackKind;
  label: string;
};

type ConceptVisualInput = {
  slug: string;
  title: string;
  subject?: string;
  topic?: string;
  subtopic?: string | null;
  tags?: readonly string[];
  accent?: LearningVisualTone;
};

type ToolVisualInput = {
  title: string;
  href: string;
  visualKind?: LearningVisualKind;
  accent?: LearningVisualTone;
};

type TopicVisualInput = {
  slug: string;
  title: string;
  subject?: string;
  description?: string;
  accent?: LearningVisualTone;
};

const exactConceptMotifs: Record<string, LearningVisualMotif> = {
  "acid-base-ph-intuition": "acid-base",
  "binary-search-halving-the-search-space": "binary-search",
  "complex-numbers-on-the-plane": "complex-plane",
  "derivative-as-slope-local-rate-of-change": "calculus-slope",
  "graph-transformations": "graph-transformations",
  "integral-as-accumulation-area": "calculus-slope",
  "inverse-trig-angle-from-ratio": "unit-circle",
  "limits-and-continuity-approaching-a-value": "limit-approach",
  "optimization-maxima-minima-and-constraints": "optimization",
  "parametric-curves-motion-from-equations": "polar-coordinates",
  "polar-coordinates-radius-and-angle": "polar-coordinates",
  "projectile-motion": "projectile-motion",
  "simple-harmonic-motion": "simple-harmonic-motion",
  torque: "torque",
  "trig-identities-from-unit-circle-geometry": "unit-circle",
  "unit-circle-sine-cosine-from-rotation": "unit-circle",
  "uniform-circular-motion": "uniform-circular-motion",
  "vectors-components": "vectors-components",
  "vectors-in-2d": "vectors-components",
  "wave-interference": "wave-motion",
  "wave-speed-wavelength": "wave-motion",
  waves: "wave-motion",
};

const exactTopicMotifs: Record<string, LearningVisualMotif> = {
  "algorithms-and-search": "binary-search",
  calculus: "calculus-slope",
  circuits: "circuit",
  "complex-numbers-and-parametric-motion": "complex-plane",
  electricity: "electric-field",
  electromagnetism: "electric-field",
  functions: "graph-transformations",
  "gravity-and-orbits": "uniform-circular-motion",
  magnetism: "electric-field",
  mechanics: "projectile-motion",
  optics: "wave-motion",
  "rates-and-equilibrium": "chemistry-reaction",
  "solutions-and-ph": "acid-base",
  "stoichiometry-and-yield": "chemistry-reaction",
  waves: "wave-motion",
};

const topicMotifs: Array<{
  pattern: RegExp;
  motif: LearningVisualMotif;
  label: string;
}> = [
  { pattern: /circular|centripetal|orbit/, motif: "uniform-circular-motion", label: "circular motion" },
  { pattern: /harmonic|oscillation|oscillator|spring/, motif: "simple-harmonic-motion", label: "oscillator" },
  { pattern: /vector|component|projection/, motif: "vectors-components", label: "vector projections" },
  { pattern: /torque|rotation|lever|moment/, motif: "torque", label: "torque" },
  { pattern: /projectile|trajectory|parabola/, motif: "projectile-motion", label: "projectile motion" },
  { pattern: /wave|wavelength|interference|standing/, motif: "wave-motion", label: "wave motion" },
  { pattern: /circuit|resistor|battery|capacitor|voltage/, motif: "circuit", label: "circuit workspace" },
  { pattern: /electric|field|charge|current|magnetic/, motif: "electric-field", label: "field vectors" },
  { pattern: /graph|transform|function|curve/, motif: "graph-transformations", label: "transformed graph" },
  { pattern: /derivative|slope|tangent|secant|calculus|rate of change/, motif: "calculus-slope", label: "slope and tangent" },
  { pattern: /limit|continuity|approaching|epsilon|delta/, motif: "limit-approach", label: "limit approach" },
  { pattern: /optimization|maxima|minima|constraint|area/, motif: "optimization", label: "optimization" },
  { pattern: /complex|imaginary|real plane/, motif: "complex-plane", label: "complex plane" },
  { pattern: /polar|radius|angle|parametric/, motif: "polar-coordinates", label: "polar coordinates" },
  { pattern: /trig|unit circle|sine|cosine|inverse trig/, motif: "unit-circle", label: "unit circle" },
  { pattern: /reaction|equilibrium|stoichiometry|yield|reagent|collision/, motif: "chemistry-reaction", label: "reaction graph" },
  { pattern: /acid|base|ph|buffer|chemistry|solution/, motif: "acid-base", label: "solution chemistry" },
  { pattern: /binary|search|algorithm|halving|frontier|visited|sorting/, motif: "binary-search", label: "binary search" },
];

function compactSearchText(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function getConceptVisualDescriptor(
  concept: ConceptVisualInput,
): LearningVisualDescriptor {
  const exactMotif = exactConceptMotifs[concept.slug];

  if (exactMotif) {
    return {
      kind: "concept",
      motif: exactMotif,
      tone: concept.accent,
      isFallback: false,
      fallbackKind: "topic-specific",
      label: exactMotif,
    };
  }

  const searchText = compactSearchText([
    concept.slug,
    concept.title,
    concept.subject,
    concept.topic,
    concept.subtopic,
    ...(concept.tags ?? []),
  ]);
  const match = topicMotifs.find((candidate) => candidate.pattern.test(searchText));

  if (match) {
    return {
      kind: "concept",
      motif: match.motif,
      tone: concept.accent,
      isFallback: false,
      fallbackKind: "topic-specific",
      label: match.label,
    };
  }

  return {
    kind: "concept",
    tone: concept.accent,
    isFallback: true,
    fallbackKind: "generic",
    label: "generic concept model",
  };
}

export function getToolVisualDescriptor(tool: ToolVisualInput): LearningVisualDescriptor {
  const searchText = compactSearchText([tool.href, tool.title, tool.visualKind]);

  if (searchText.includes("circuit")) {
    return {
      kind: "circuit",
      motif: "circuit",
      tone: tool.accent,
      isFallback: false,
      fallbackKind: "topic-specific",
      label: "circuit workspace",
    };
  }

  if (searchText.includes("chemistry") || searchText.includes("reaction")) {
    return {
      kind: "chemistry",
      motif: "chemistry-reaction",
      tone: tool.accent,
      isFallback: false,
      fallbackKind: "topic-specific",
      label: "chemistry reaction graph",
    };
  }

  return {
    kind: tool.visualKind ?? "tool",
    tone: tool.accent,
    isFallback: true,
    fallbackKind: "category-specific",
    label: "learning tool",
  };
}

export function getTopicVisualDescriptor(topic: TopicVisualInput): LearningVisualDescriptor {
  const exactMotif = exactTopicMotifs[topic.slug];

  if (exactMotif) {
    return {
      kind: "topic",
      motif: exactMotif,
      tone: topic.accent,
      isFallback: false,
      fallbackKind: "topic-specific",
      label: exactMotif,
    };
  }

  const searchText = compactSearchText([
    topic.slug,
    topic.title,
    topic.subject,
    topic.description,
  ]);
  const match = topicMotifs.find((candidate) => candidate.pattern.test(searchText));

  if (match) {
    return {
      kind: "topic",
      motif: match.motif,
      tone: topic.accent,
      isFallback: false,
      fallbackKind: "topic-specific",
      label: match.label,
    };
  }

  return {
    kind: "topic",
    tone: topic.accent,
    isFallback: true,
    fallbackKind: "category-specific",
    label: "topic map",
  };
}
