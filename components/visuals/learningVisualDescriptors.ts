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

export type LearningVisualMotif =
  | "acid-base"
  | "binary-search"
  | "chemistry-reaction"
  | "circuit"
  | "electric-field"
  | "graph-transformations"
  | "projectile-motion"
  | "simple-harmonic-motion"
  | "torque"
  | "uniform-circular-motion"
  | "vectors-components"
  | "wave-motion";

export type LearningVisualDescriptor = {
  kind: LearningVisualKind;
  motif?: LearningVisualMotif;
  tone?: LearningVisualTone;
  isFallback: boolean;
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
  "graph-transformations": "graph-transformations",
  "projectile-motion": "projectile-motion",
  "simple-harmonic-motion": "simple-harmonic-motion",
  torque: "torque",
  "uniform-circular-motion": "uniform-circular-motion",
  "vectors-components": "vectors-components",
  "vectors-in-2d": "vectors-components",
  "wave-interference": "wave-motion",
  "wave-speed-wavelength": "wave-motion",
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
  { pattern: /electric|field|charge|current|magnetic/, motif: "electric-field", label: "field vectors" },
  { pattern: /graph|transform|function|curve/, motif: "graph-transformations", label: "transformed graph" },
  { pattern: /acid|base|ph|buffer|chemistry|solution/, motif: "acid-base", label: "solution chemistry" },
  { pattern: /binary|search|algorithm|halving/, motif: "binary-search", label: "binary search" },
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
      label: match.label,
    };
  }

  return {
    kind: "concept",
    tone: concept.accent,
    isFallback: true,
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
      label: "circuit workspace",
    };
  }

  if (searchText.includes("chemistry") || searchText.includes("reaction")) {
    return {
      kind: "chemistry",
      motif: "chemistry-reaction",
      tone: tool.accent,
      isFallback: false,
      label: "chemistry reaction graph",
    };
  }

  return {
    kind: tool.visualKind ?? "tool",
    tone: tool.accent,
    isFallback: true,
    label: "learning tool",
  };
}

export function getTopicVisualDescriptor(topic: TopicVisualInput): LearningVisualDescriptor {
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
      label: match.label,
    };
  }

  return {
    kind: "topic",
    tone: topic.accent,
    isFallback: true,
    label: "topic map",
  };
}
