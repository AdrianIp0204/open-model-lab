import { execFileSync } from "node:child_process";
import { getConceptBySlug } from "@/lib/content";
import { localizeConceptContent } from "@/lib/i18n/concept-content";

export type DisclosureRepresentativeCase = {
  slug: string;
  heading: string;
  activeGraphId: string;
  primaryControlIds: string[];
  primaryGraphIds: string[];
  primaryPresetIds: string[];
  visibleControls: Array<{ name: string; role: "slider" | "checkbox" }>;
  hiddenControls: Array<{ name: string; role: "slider" | "checkbox" }>;
  visibleGraphTabs: string[];
  hiddenGraphTabs: string[];
  firstTaskSubstring: string;
  categories: string[];
};

type RolloutReport = {
  publishedConceptCount: number;
  fullyConfiguredCount: number;
  effectiveEnFullyConfiguredCount: number;
  remainingCount: number;
  missingBothCount: number;
  missingPrimaryControlsOnlyCount: number;
  missingPrimaryGraphsOnlyCount: number;
  alignedInitialGraphCount: number;
  effectiveEnAlignedInitialGraphCount: number;
  effectiveEnDisclosureMismatchCount: number;
  initialGraphAlignmentIssueCount: number;
  remaining: Array<{ slug: string }>;
};

export const DISCLOSURE_REPRESENTATIVE_CASES = [
  {
    slug: "bohr-model",
    heading: "Bohr Model",
    activeGraphId: "series-spectrum",
    primaryControlIds: ["upperLevel", "lowerLevel", "excitationMode"],
    primaryGraphIds: ["series-spectrum"],
    primaryPresetIds: ["balmer-alpha", "high-n-balmer", "balmer-reverse-excitation"],
    visibleControls: [{ name: "Upper level", role: "slider" }],
    hiddenControls: [
      { name: "Lower level", role: "slider" },
      { name: "Show reverse excitation", role: "checkbox" },
    ],
    visibleGraphTabs: ["series-spectrum"],
    hiddenGraphTabs: [],
    firstTaskSubstring: "Only certain hydrogen gaps exist",
    categories: ["single-control-single-graph", "optimized-overlay"],
  },
  {
    slug: "acid-base-ph-intuition",
    heading: "Acid-Base / pH Intuition",
    activeGraphId: "ph-vs-base",
    primaryControlIds: ["base-amount", "acid-amount", "water-volume"],
    primaryGraphIds: ["ph-vs-base", "ph-vs-acid"],
    primaryPresetIds: ["acidic-mix", "near-neutral", "basic-mix"],
    visibleControls: [
      { name: "Base amount", role: "slider" },
      { name: "Acid amount", role: "slider" },
      { name: "Water volume", role: "slider" },
    ],
    hiddenControls: [],
    visibleGraphTabs: ["ph-vs-base", "ph-vs-acid"],
    hiddenGraphTabs: [],
    firstTaskSubstring: "acid character is stronger than base character",
    categories: ["dual-control", "optimized-overlay"],
  },
  {
    slug: "de-broglie-matter-waves",
    heading: "de Broglie Matter Waves",
    activeGraphId: "loop-fit",
    primaryControlIds: ["speedMms"],
    primaryGraphIds: ["loop-fit", "wavelength-momentum"],
    primaryPresetIds: [],
    visibleControls: [{ name: "Speed", role: "slider" }],
    hiddenControls: [{ name: "Particle mass", role: "slider" }],
    visibleGraphTabs: ["loop-fit", "wavelength-momentum"],
    hiddenGraphTabs: [],
    firstTaskSubstring: "fit count on the loop rises automatically",
    categories: ["dual-graph", "optimized-overlay", "compare-sample", "mobile-sample"],
  },
  {
    slug: "escape-velocity",
    heading: "Escape Velocity",
    activeGraphId: "specific-energy",
    primaryControlIds: ["speedFactor"],
    primaryGraphIds: ["specific-energy"],
    primaryPresetIds: [],
    visibleControls: [{ name: "Speed factor", role: "slider" }],
    hiddenControls: [
      { name: "Source mass", role: "slider" },
      { name: "Launch radius", role: "slider" },
    ],
    visibleGraphTabs: ["specific-energy"],
    hiddenGraphTabs: ["radius-history", "speed-thresholds"],
    firstTaskSubstring: "total-energy line is the real escape verdict",
    categories: ["initial-graph-matters"],
  },
  {
    slug: "total-internal-reflection",
    heading: "Total Internal Reflection",
    activeGraphId: "transition-map",
    primaryControlIds: ["incidentAngle", "n1", "n2"],
    primaryGraphIds: ["transition-map"],
    primaryPresetIds: [
      "glass-to-air-near-critical",
      "glass-to-air-above-critical",
      "glass-to-water",
    ],
    visibleControls: [
      { name: "Incident angle", role: "slider" },
      { name: "Incident-medium index n1", role: "slider" },
      { name: "Transmitted-medium index n2", role: "slider" },
    ],
    hiddenControls: [],
    visibleGraphTabs: ["transition-map"],
    hiddenGraphTabs: ["refraction-map"],
    firstTaskSubstring: "threshold disappears",
    categories: ["math-guided-start", "dual-control"],
  },
  {
    slug: "integral-as-accumulation-area",
    heading: "Integral as Accumulation / Area",
    activeGraphId: "source-function",
    primaryControlIds: ["upper-bound"],
    primaryGraphIds: ["source-function", "accumulation-function"],
    primaryPresetIds: [],
    visibleControls: [{ name: "Upper bound", role: "slider" }],
    hiddenControls: [],
    visibleGraphTabs: ["source-function", "accumulation-function"],
    hiddenGraphTabs: [],
    firstTaskSubstring: "source curve stays above the axis",
    categories: ["single-control-dual-graph"],
  },
] as const satisfies readonly DisclosureRepresentativeCase[];

export const DISCLOSURE_COMPARE_CASES = [
  {
    slug: "de-broglie-matter-waves",
    activeGraphId: "loop-fit",
    categories: ["overlay-backed-compare", "dual-graph"],
  },
  {
    slug: "angular-momentum",
    activeGraphId: "conserved-spin-map",
    categories: ["dual-control-compare"],
  },
] as const;

export const DISCLOSURE_RESTORE_CASE = {
  slug: "inverse-trig-angle-from-ratio",
  activeGraphId: "coordinate-sweep",
  hiddenControl: { name: "Angle", role: "slider" as const },
  patch: { angleDeg: 120 },
} as const;

let cachedReport: RolloutReport | null = null;

export function getSimulationUiRolloutReportCached() {
  if (cachedReport) {
    return cachedReport;
  }

  const raw = execFileSync(process.execPath, ["scripts/report-simulation-ui-rollout.mjs", "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  cachedReport = JSON.parse(raw) as RolloutReport;
  return cachedReport;
}

function getControlRole(kind: string) {
  if (kind === "slider") {
    return "slider" as const;
  }
  if (kind === "toggle") {
    return "checkbox" as const;
  }
  return null;
}

export function getDynamicFallbackLegacyCase() {
  const report = getSimulationUiRolloutReportCached();
  const fallbackRow = report.remaining[0];

  if (!fallbackRow) {
    return null;
  }

  const concept = localizeConceptContent(getConceptBySlug(fallbackRow.slug), "en");
  const visibleControls =
    concept.simulation.controls
      ?.flatMap((control) => {
        const role = getControlRole(control.kind);
        return role ? [{ name: control.label, role }] : [];
      }) ?? [];

  return {
    slug: fallbackRow.slug,
    path: `/concepts/${fallbackRow.slug}`,
    heading: concept.title,
    visibleControls,
    visibleGraphTabs: concept.graphs.map((graph) => graph.id),
    activeGraphId: concept.graphs[0]?.id ?? null,
  };
}

export function getRepresentativeCasesByCategory() {
  return DISCLOSURE_REPRESENTATIVE_CASES.reduce<Record<string, DisclosureRepresentativeCase>>(
    (accumulator, fixture) => {
      for (const category of fixture.categories) {
        accumulator[category] = fixture;
      }
      return accumulator;
    },
    {},
  );
}
