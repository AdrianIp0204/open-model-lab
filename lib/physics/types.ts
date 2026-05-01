import type { ConceptChallengeMode } from "@/lib/content/schema";

export type SimulationKind =
  | "reaction-rate-collision-theory"
  | "dynamic-equilibrium"
  | "graph-transformations"
  | "rational-functions"
  | "matrix-transformations"
  | "exponential-change"
  | "derivative-as-slope"
  | "optimization-constraints"
  | "limits-continuity"
  | "integral-accumulation"
  | "complex-numbers-plane"
  | "unit-circle-rotation"
  | "polar-coordinates"
  | "parametric-curves-motion"
  | "sorting-algorithmic-trade-offs"
  | "binary-search-halving"
  | "graph-traversal"
  | "solubility-saturation"
  | "buffers-neutralization"
  | "stoichiometry-recipe"
  | "shm"
  | "ucm"
  | "damping-resonance"
  | "projectile"
  | "drag-terminal-velocity"
  | "vectors-components"
  | "dot-product-projection"
  | "vectors-2d"
  | "torque"
  | "static-equilibrium-centre-of-mass"
  | "rotational-inertia"
  | "rolling-motion"
  | "angular-momentum"
  | "momentum-impulse"
  | "conservation-of-momentum"
  | "collisions"
  | "basic-circuits"
  | "series-parallel-circuits"
  | "equivalent-resistance"
  | "power-energy-circuits"
  | "rc-charging-discharging"
  | "internal-resistance-terminal-voltage"
  | "electric-fields"
  | "gravitational-fields"
  | "gravitational-potential"
  | "circular-orbits"
  | "escape-velocity"
  | "electric-potential"
  | "capacitance-electric-energy"
  | "magnetic-fields"
  | "electromagnetic-induction"
  | "maxwell-equations-synthesis"
  | "electromagnetic-waves"
  | "light-spectrum-linkage"
  | "dispersion-refractive-index-color"
  | "polarization"
  | "diffraction"
  | "optical-resolution"
  | "double-slit-interference"
  | "photoelectric-effect"
  | "atomic-spectra"
  | "de-broglie-matter-waves"
  | "bohr-model"
  | "radioactivity-half-life"
  | "magnetic-force"
  | "refraction-snells-law"
  | "mirrors"
  | "lens-imaging"
  | "beats"
  | "sound-waves-longitudinal"
  | "doppler-effect"
  | "wave-speed-wavelength"
  | "wave-interference"
  | "standing-waves"
  | "air-column-resonance"
  | "temperature-internal-energy"
  | "ideal-gas-kinetic-theory"
  | "pressure-hydrostatic"
  | "continuity-equation"
  | "bernoulli-principle"
  | "buoyancy-archimedes"
  | "heat-transfer"
  | "specific-heat-phase-change"
  | "concentration-dilution"
  | "acid-base-ph";

export type ControlValue = number | boolean | string;

export type SimulationControlSpec = {
  id: string;
  kind: "slider" | "toggle";
  label: string;
  param: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  description?: string;
  ariaLabel?: string;
  displayValueLabels?: Array<{
    value: ControlValue;
    label: string;
  }>;
};

export type SimulationPreset = {
  id: string;
  label: string;
  description?: string;
  values: Record<string, ControlValue>;
};

export type SimulationOverlay = {
  id: string;
  label: string;
  shortDescription: string;
  whatToNotice: string[];
  whyItMatters?: string;
  relatedControls?: string[];
  relatedGraphTabs?: string[];
  relatedEquationVariables?: string[];
  defaultOn: boolean;
};

export type NoticePromptType =
  | "observation"
  | "compare"
  | "graph-reading"
  | "misconception"
  | "try-this";

export type NoticePromptCondition = {
  graphTabs?: string[];
  modes?: Array<"explore" | "predict" | "compare">;
  overlayIds?: string[];
  responseMode?: boolean;
  inspectState?: "live" | "inspect" | "preview";
  controlRanges?: Array<{
    param: string;
    min?: number;
    max?: number;
  }>;
  lastChangedControls?: string[];
};

export type NoticePrompt = {
  id: string;
  text: string;
  type: NoticePromptType;
  priority?: number;
  conditions?: NoticePromptCondition;
  tryThis?: string;
  whyItMatters?: string;
  relatedControls?: string[];
  relatedGraphTabs?: string[];
  relatedOverlays?: string[];
  relatedEquationVariables?: string[];
};

export type NoticePromptConfig = {
  title?: string;
  intro?: string;
  items: NoticePrompt[];
};

export type PredictionChoice = {
  id: string;
  label: string;
};

export type PredictionScenario = {
  id: string;
  label: string;
  presetId?: string;
  patch?: Record<string, ControlValue>;
  highlightedControlIds?: string[];
  highlightedGraphIds?: string[];
  highlightedOverlayIds?: string[];
};

export type PredictionModeItem = {
  id: string;
  prompt: string;
  changeLabel?: string;
  choices: PredictionChoice[];
  correctChoiceId: string;
  explanation: string;
  observationHint: string;
  scenario: PredictionScenario;
};

export type PredictionModeConfig = {
  title?: string;
  intro?: string;
  items: PredictionModeItem[];
};

export type PredictionModeApi = {
  mode: "explore" | "predict";
  activeItemId: string | null;
  activeItem: PredictionModeItem | null;
  selectedChoiceId: string | null;
  answered: boolean;
  tested: boolean;
  completed: boolean;
  isCorrect: boolean | null;
  highlightedControlIds: string[];
  highlightedGraphIds: string[];
  highlightedOverlayIds: string[];
  setMode: (mode: "explore" | "predict") => void;
  setActiveItemId: (itemId: string) => void;
  selectChoice: (choiceId: string) => void;
  testScenario: () => void;
  nextItem: () => void;
  restart: () => void;
  exit: () => void;
};

export type SimulationVariableTone = "teal" | "amber" | "coral" | "sky" | "ink";

export type SimulationVariableLink = {
  id: string;
  symbol: string;
  label: string;
  param: string;
  tone: SimulationVariableTone;
  description: string;
  equationIds: string[];
  graphIds?: string[];
  overlayIds?: string[];
};

export type SimulationEquation = {
  id: string;
  latex: string;
  label: string;
  meaning: string;
  notes?: string[];
};

export type GraphTabSpec = {
  id: string;
  label: string;
  xLabel: string;
  yLabel: string;
  series: string[];
  description?: string;
};

export type SimulationAccessibility = {
  simulationDescription: string;
  graphSummary: string;
};

export type SimulationUiHints = {
  // Optional Explore-first authoring hints. Leave these undefined to keep legacy defaults.
  initialGraphId?: string;
  primaryGraphIds?: string[];
  primaryControlIds?: string[];
  primaryPresetIds?: string[];
  starterExploreTasks?: string[];
};

export type SimulationConfig = {
  kind: SimulationKind;
  defaults: Record<string, ControlValue>;
  controls: SimulationControlSpec[];
  presets: SimulationPreset[];
  overlays?: SimulationOverlay[];
  ui?: SimulationUiHints;
  graphs: GraphTabSpec[];
  accessibility: SimulationAccessibility;
};

export type ConceptSimulationSource = {
  id?: string;
  title: string;
  summary: string;
  slug?: string;
  topic?: string;
  equations: SimulationEquation[];
  variableLinks: SimulationVariableLink[];
  simulation: SimulationConfig;
  noticePrompts?: NoticePromptConfig;
  predictionMode?: PredictionModeConfig;
  challengeMode?: ConceptChallengeMode;
  featureAvailability?: {
    prediction?: boolean;
    compare?: boolean;
    challenge?: boolean;
    guidedOverlays?: boolean;
    noticePrompts?: boolean;
    workedExamples?: boolean;
    quickTest?: boolean;
  };
  accessibility?: SimulationAccessibility;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
};

export type GraphPoint = {
  x: number;
  y: number;
};

export type GraphSeriesSetupId = "a" | "b";

export type GraphSeriesMeta = {
  setup?: GraphSeriesSetupId;
  sourceSeriesId?: string;
};

export type GraphSeries = {
  id: string;
  label: string;
  points: GraphPoint[];
  color?: string;
  dashed?: boolean;
  meta?: GraphSeriesMeta;
};

export type GraphSeriesMap = Record<string, GraphSeries[]>;

export type GraphPreviewSample = {
  seriesId: string;
  seriesLabel: string;
  point: GraphPoint;
  pointIndex: number;
  pointCount: number;
  color?: string;
  dashed?: boolean;
  setup?: GraphSeriesSetupId;
};

export type GraphStagePreview =
  | {
      kind: "time";
      graphId: string;
      time: number;
      setup?: GraphSeriesSetupId;
      seriesId: string;
      seriesLabel: string;
      point: GraphPoint;
      pointIndex: number;
      pointCount: number;
    }
  | {
      kind: "trajectory";
      graphId: string;
      time: number;
      setup?: GraphSeriesSetupId;
      seriesId: string;
      seriesLabel: string;
      point: GraphPoint;
      pointIndex: number;
      pointCount: number;
    }
  | {
      kind: "response";
      graphId: string;
      setup?: GraphSeriesSetupId;
      seriesId: string;
      seriesLabel: string;
      point: GraphPoint;
      pointIndex: number;
      pointCount: number;
    };
