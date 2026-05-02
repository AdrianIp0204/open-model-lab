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

export type LearningVisualOverlay = "assessment" | "challenge";

export type LearningVisualMotif =
  | "acid-base"
  | "atomic-spectra"
  | "binary-search"
  | "calculus-slope"
  | "chemistry-reaction"
  | "complex-plane"
  | "circuit"
  | "collisions"
  | "electric-field"
  | "escape-velocity"
  | "fluid-buoyancy"
  | "fluid-bernoulli"
  | "fluid-continuity"
  | "fluid-drag"
  | "fluid-pressure"
  | "graph-transformations"
  | "gravitational-field"
  | "gravitational-potential"
  | "gravity-orbits"
  | "kepler-period"
  | "limit-approach"
  | "momentum-carts"
  | "optimization"
  | "orbital-speed"
  | "optics-ray"
  | "polar-coordinates"
  | "projectile-motion"
  | "radioactivity"
  | "rotational-inertia"
  | "simple-harmonic-motion"
  | "damping-resonance"
  | "oscillation-energy"
  | "sound-beats"
  | "sound-doppler"
  | "sound-pitch"
  | "standing-wave"
  | "thermal-energy"
  | "torque"
  | "unit-circle"
  | "uniform-circular-motion"
  | "vectors-components"
  | "wave-motion";

export type LearningVisualDescriptor = {
  kind: LearningVisualKind;
  motif?: LearningVisualMotif;
  tone?: LearningVisualTone;
  overlay?: LearningVisualOverlay;
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

type ChallengeVisualInput = {
  id?: string;
  title: string;
  prompt?: string;
  style?: string;
  concept: ConceptVisualInput;
  topic?: TopicVisualInput;
  cueLabels?: readonly string[];
  requirementLabels?: readonly string[];
  targetLabels?: readonly string[];
  targetMetrics?: readonly string[];
  targetParams?: readonly string[];
  accent?: LearningVisualTone;
};

type PackAssessmentVisualInput = {
  slug: string;
  title: string;
  subject?: string;
  summary?: string;
  includedTopicSlugs?: readonly string[];
  includedTopicTitles?: readonly string[];
  accent?: LearningVisualTone;
};

const exactConceptMotifs: Record<string, LearningVisualMotif> = {
  "acid-base-ph-intuition": "acid-base",
  "angular-momentum": "rotational-inertia",
  "atomic-spectra": "atomic-spectra",
  "binary-search-halving-the-search-space": "binary-search",
  "bohr-model": "atomic-spectra",
  "buoyancy-and-archimedes-principle": "fluid-buoyancy",
  "capacitance-and-stored-electric-energy": "circuit",
  "bernoullis-principle": "fluid-bernoulli",
  "circular-orbits-orbital-speed": "orbital-speed",
  collisions: "collisions",
  "complex-numbers-on-the-plane": "complex-plane",
  "conservation-of-momentum": "momentum-carts",
  "continuity-equation": "fluid-continuity",
  "damping-resonance": "damping-resonance",
  "de-broglie-matter-waves": "atomic-spectra",
  "derivative-as-slope-local-rate-of-change": "calculus-slope",
  "dispersion-refractive-index-color": "optics-ray",
  "doppler-effect": "sound-pitch",
  "electric-potential": "electric-field",
  "drag-and-terminal-velocity": "fluid-drag",
  "escape-velocity": "escape-velocity",
  "geometric-optics-lenses": "optics-ray",
  "gravitational-fields": "gravitational-field",
  "gravitational-potential-energy": "gravitational-potential",
  "graph-transformations": "graph-transformations",
  "integral-as-accumulation-area": "calculus-slope",
  "interference-diffraction": "standing-wave",
  "inverse-trig-angle-from-ratio": "unit-circle",
  "kinetic-energy-work": "projectile-motion",
  "keplers-third-law-orbital-periods": "kepler-period",
  "lens-imaging": "optics-ray",
  "limits-and-continuity-approaching-a-value": "limit-approach",
  "momentum-impulse": "momentum-carts",
  "optical-resolution-imaging-limits": "optics-ray",
  "optimization-maxima-minima-and-constraints": "optimization",
  "parametric-curves-motion-from-equations": "polar-coordinates",
  "photoelectric-effect": "atomic-spectra",
  "pitch-frequency-loudness-intensity": "sound-pitch",
  "polar-coordinates-radius-and-angle": "polar-coordinates",
  "projectile-motion": "projectile-motion",
  "radioactivity-half-life": "radioactivity",
  "reflection-and-mirrors": "optics-ray",
  "refraction-snells-law": "optics-ray",
  "resonance-air-columns-open-closed-pipes": "standing-wave",
  "oscillation-energy": "oscillation-energy",
  "pressure-and-hydrostatic-pressure": "fluid-pressure",
  "rotational-inertia": "rotational-inertia",
  "specific-heat-and-phase-change": "thermal-energy",
  "simple-harmonic-motion": "simple-harmonic-motion",
  "sound-intensity-levels": "sound-pitch",
  "standing-waves": "standing-wave",
  "static-equilibrium-centre-of-mass": "torque",
  "temperature-and-internal-energy": "thermal-energy",
  torque: "torque",
  "total-internal-reflection": "optics-ray",
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
  "gravity-and-orbits": "gravity-orbits",
  magnetism: "electric-field",
  mechanics: "projectile-motion",
  optics: "optics-ray",
  oscillations: "simple-harmonic-motion",
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
  { pattern: /escape/, motif: "escape-velocity", label: "escape threshold" },
  { pattern: /kepler|orbital period/, motif: "kepler-period", label: "orbital period" },
  { pattern: /potential energy|gravity well|gravitational potential/, motif: "gravitational-potential", label: "gravity potential" },
  { pattern: /gravitational field|inverse square|test mass/, motif: "gravitational-field", label: "gravity field" },
  { pattern: /orbital speed|circular orbit/, motif: "orbital-speed", label: "orbital speed" },
  { pattern: /gravity|gravitational|orbit/, motif: "gravity-orbits", label: "gravity and orbits" },
  { pattern: /circular|centripetal/, motif: "uniform-circular-motion", label: "circular motion" },
  { pattern: /damping|resonance|driving force|response curve/, motif: "damping-resonance", label: "damped response" },
  { pattern: /oscillation energy|kinetic energy|turning points/, motif: "oscillation-energy", label: "oscillator energy" },
  { pattern: /harmonic|oscillation|oscillator|spring/, motif: "simple-harmonic-motion", label: "oscillator" },
  { pattern: /rotational inertia|angular momentum|moment of inertia|flywheel|rotor/, motif: "rotational-inertia", label: "rotational inertia" },
  { pattern: /momentum|impulse/, motif: "momentum-carts", label: "momentum transfer" },
  { pattern: /collision|elastic|inelastic|rebound/, motif: "collisions", label: "collisions" },
  { pattern: /vector|component|projection/, motif: "vectors-components", label: "vector projections" },
  { pattern: /torque|rotation|lever|moment/, motif: "torque", label: "torque" },
  { pattern: /projectile|trajectory|parabola/, motif: "projectile-motion", label: "projectile motion" },
  { pattern: /standing|node|antinode|harmonic pipe|resonance/, motif: "standing-wave", label: "standing wave" },
  { pattern: /sound|pitch|doppler|beat|loudness|frequency/, motif: "sound-pitch", label: "sound frequency" },
  { pattern: /wave|wavelength|interference|fringe|diffraction/, motif: "wave-motion", label: "wave motion" },
  { pattern: /optic|lens|mirror|refraction|reflection|ray|snell|image|prism|dispersion/, motif: "optics-ray", label: "light ray optics" },
  { pattern: /circuit|resistor|battery|capacitor|voltage/, motif: "circuit", label: "circuit workspace" },
  { pattern: /electric|field|charge|current|magnetic/, motif: "electric-field", label: "field vectors" },
  { pattern: /heat|temperature|thermal|specific heat|phase change|internal energy/, motif: "thermal-energy", label: "thermal energy" },
  { pattern: /bernoulli|venturi|height term/, motif: "fluid-bernoulli", label: "Bernoulli flow" },
  { pattern: /continuity|flow rate|cross-sectional area/, motif: "fluid-continuity", label: "flow continuity" },
  { pattern: /drag|terminal velocity|fluid resistance/, motif: "fluid-drag", label: "drag balance" },
  { pattern: /hydrostatic|pressure|fluid statics/, motif: "fluid-pressure", label: "fluid pressure" },
  { pattern: /fluid|buoyancy|archimedes|flow/, motif: "fluid-buoyancy", label: "fluid forces" },
  { pattern: /graph|transform|function|curve/, motif: "graph-transformations", label: "transformed graph" },
  { pattern: /derivative|slope|tangent|secant|calculus|rate of change/, motif: "calculus-slope", label: "slope and tangent" },
  { pattern: /limit|continuity|approaching|epsilon|delta/, motif: "limit-approach", label: "limit approach" },
  { pattern: /optimization|maxima|minima|constraint|area/, motif: "optimization", label: "optimization" },
  { pattern: /complex|imaginary|real plane/, motif: "complex-plane", label: "complex plane" },
  { pattern: /polar|radius|angle|parametric/, motif: "polar-coordinates", label: "polar coordinates" },
  { pattern: /trig|unit circle|sine|cosine|inverse trig/, motif: "unit-circle", label: "unit circle" },
  { pattern: /quantum|atom|atomic|spectra|bohr|photoelectric|matter wave|de broglie/, motif: "atomic-spectra", label: "atomic spectra" },
  { pattern: /radioactivity|half-life|decay|nuclear/, motif: "radioactivity", label: "radioactive decay" },
  { pattern: /reaction|equilibrium|stoichiometry|yield|reagent|collision/, motif: "chemistry-reaction", label: "reaction graph" },
  { pattern: /acid|base|ph|buffer|chemistry|solution/, motif: "acid-base", label: "solution chemistry" },
  { pattern: /binary|search|algorithm|halving|frontier|visited|sorting/, motif: "binary-search", label: "binary search" },
];

const challengeMotifs: Array<{
  pattern: RegExp;
  motif: LearningVisualMotif;
  label: string;
}> = [
  { pattern: /beat|pulse/, motif: "sound-beats", label: "beat and pulse challenge" },
  { pattern: /doppler|higher ahead|lower behind|source|observer/, motif: "sound-doppler", label: "Doppler challenge" },
  { pattern: /pitch|frequency|loudness|sound|carrier/, motif: "sound-pitch", label: "sound frequency challenge" },
  { pattern: /standing|node|antinode|resonance|harmonic|pipe/, motif: "standing-wave", label: "standing wave challenge" },
  { pattern: /period|centripetal|circular|orbit|radius/, motif: "uniform-circular-motion", label: "circular motion challenge" },
  { pattern: /damping|resonance|driving force|response/, motif: "damping-resonance", label: "damped response challenge" },
  { pattern: /joule|energy|spring|oscillat|amplitude/, motif: "oscillation-energy", label: "oscillator energy challenge" },
  { pattern: /collision|rebound|cart|elastic|inelastic/, motif: "collisions", label: "collision challenge" },
  { pattern: /momentum|impulse|force pulse/, motif: "momentum-carts", label: "momentum challenge" },
  { pattern: /angular momentum|rotational inertia|moment of inertia|mass radius|spin/, motif: "rotational-inertia", label: "rotational inertia challenge" },
  { pattern: /lens|mirror|ray|refraction|snell|image|fringe|slit/, motif: "optics-ray", label: "optics challenge" },
  { pattern: /battery|resistor|circuit|voltage|current|power|watt|ohm|capacitor|load/, motif: "circuit", label: "circuit challenge" },
  { pattern: /temperature|thermal|phase|heat|heater/, motif: "thermal-energy", label: "thermal energy challenge" },
  { pattern: /bernoulli|venturi|height term/, motif: "fluid-bernoulli", label: "Bernoulli challenge" },
  { pattern: /continuity|flow rate|cross-sectional area/, motif: "fluid-continuity", label: "flow continuity challenge" },
  { pattern: /drag|terminal velocity|fluid resistance/, motif: "fluid-drag", label: "drag balance challenge" },
  { pattern: /hydrostatic|pressure/, motif: "fluid-pressure", label: "fluid pressure challenge" },
  { pattern: /fluid|buoyant|flow/, motif: "fluid-buoyancy", label: "fluid challenge" },
];

function compactSearchText(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function withOverlay(
  descriptor: LearningVisualDescriptor,
  input: {
    kind: LearningVisualKind;
    labelSuffix: string;
    overlay: LearningVisualOverlay;
    tone?: LearningVisualTone;
  },
): LearningVisualDescriptor {
  return {
    ...descriptor,
    kind: input.kind,
    tone: input.tone ?? descriptor.tone,
    overlay: input.overlay,
    label: `${descriptor.label} ${input.labelSuffix}`,
  };
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

export function getChallengeVisualDescriptor(
  challenge: ChallengeVisualInput,
): LearningVisualDescriptor {
  const searchText = compactSearchText([
    challenge.id,
    challenge.title,
    challenge.prompt,
    challenge.style,
    ...(challenge.cueLabels ?? []),
    ...(challenge.requirementLabels ?? []),
    ...(challenge.targetLabels ?? []),
    ...(challenge.targetMetrics ?? []),
    ...(challenge.targetParams ?? []),
    challenge.concept.slug,
    challenge.concept.title,
    challenge.concept.subject,
    challenge.concept.topic,
    challenge.concept.subtopic,
    ...(challenge.concept.tags ?? []),
  ]);
  const challengeMatch = challengeMotifs.find((candidate) =>
    candidate.pattern.test(searchText),
  );

  if (challengeMatch) {
    return {
      kind: "challenge",
      motif: challengeMatch.motif,
      tone: challenge.accent ?? challenge.concept.accent,
      overlay: "challenge",
      isFallback: false,
      fallbackKind: "topic-specific",
      label: challengeMatch.label,
    };
  }

  const conceptVisual = getConceptVisualDescriptor(challenge.concept);

  if (!conceptVisual.isFallback || conceptVisual.motif) {
    return withOverlay(conceptVisual, {
      kind: "challenge",
      labelSuffix: "challenge",
      overlay: "challenge",
      tone: challenge.accent ?? challenge.concept.accent,
    });
  }

  if (challenge.topic) {
    const topicVisual = getTopicVisualDescriptor(challenge.topic);

    if (!topicVisual.isFallback || topicVisual.motif) {
      return withOverlay(topicVisual, {
        kind: "challenge",
        labelSuffix: "challenge",
        overlay: "challenge",
        tone: challenge.accent ?? challenge.topic.accent,
      });
    }
  }

  return {
    kind: "challenge",
    tone: challenge.accent ?? challenge.concept.accent,
    overlay: "challenge",
    isFallback: true,
    fallbackKind: "category-specific",
    label: "challenge target",
  };
}

export function getConceptAssessmentVisualDescriptor(
  concept: ConceptVisualInput,
): LearningVisualDescriptor {
  return withOverlay(getConceptVisualDescriptor(concept), {
    kind: "test",
    labelSuffix: "assessment",
    overlay: "assessment",
    tone: concept.accent,
  });
}

export function getTopicAssessmentVisualDescriptor(
  topic: TopicVisualInput,
): LearningVisualDescriptor {
  return withOverlay(getTopicVisualDescriptor(topic), {
    kind: "test",
    labelSuffix: "assessment",
    overlay: "assessment",
    tone: topic.accent,
  });
}

export function getPackAssessmentVisualDescriptor(
  pack: PackAssessmentVisualInput,
): LearningVisualDescriptor {
  for (const topicSlug of pack.includedTopicSlugs ?? []) {
    const exactMotif = exactTopicMotifs[topicSlug];

    if (exactMotif) {
      return {
        kind: "test",
        motif: exactMotif,
        tone: pack.accent,
        overlay: "assessment",
        isFallback: false,
        fallbackKind: "topic-specific",
        label: `${exactMotif} assessment`,
      };
    }
  }

  const searchText = compactSearchText([
    pack.slug,
    pack.title,
    pack.subject,
    pack.summary,
    ...(pack.includedTopicSlugs ?? []),
    ...(pack.includedTopicTitles ?? []),
  ]);
  const match = topicMotifs.find((candidate) => candidate.pattern.test(searchText));

  if (match) {
    return {
      kind: "test",
      motif: match.motif,
      tone: pack.accent,
      overlay: "assessment",
      isFallback: false,
      fallbackKind: "topic-specific",
      label: `${match.label} assessment`,
    };
  }

  return {
    kind: "test",
    tone: pack.accent,
    overlay: "assessment",
    isFallback: true,
    fallbackKind: "category-specific",
    label: "assessment pack",
  };
}
