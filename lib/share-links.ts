import type {
  ConceptPageFeaturedSetup,
  ConceptPageSectionId,
  ResolvedConceptPageSection,
} from "@/lib/content";
import { addLocalePrefix, type AppLocale } from "@/i18n/routing";
import type { ResolvedGuidedCollectionAssignment } from "@/lib/guided/assignments";
import {
  resolveGuidedCollectionConceptBundle,
  type ResolvedGuidedCollectionConceptBundle,
} from "@/lib/guided/concept-bundles";
import type { ConceptSimulationSource, ControlValue } from "@/lib/physics";

export type ShareLinkTarget = {
  id: string;
  label: string;
  href: string;
  ariaLabel?: string;
  buttonLabel?: string;
  shareLabel?: string;
  shareTitle?: string;
  preferWebShare?: boolean;
  copiedText?: string;
  sharedText?: string;
};

export type ConceptFeaturedSetupLinkTarget = {
  id: string;
  label: string;
  description: string;
  href: string;
};

export type ConceptSimulationSharePayload = {
  href: string;
  stateParam: string | null;
  publicExperimentParam: string | null;
};

type ShareUrlOptions = {
  hash?: string | null;
  query?: Record<string, string | null | undefined>;
};

const RELATIVE_URL_BASE = "https://openmodellab.local";

const CONCEPT_SIMULATION_STATE_VERSION = "v1";
const CONCEPT_SIMULATION_STATE_MAX_PARAM_LENGTH = 1800;
const PUBLIC_EXPERIMENT_CARD_VERSION = "v1";
const PUBLIC_EXPERIMENT_CARD_MAX_PARAM_LENGTH = 480;
const GUIDED_COLLECTION_CONCEPT_BUNDLE_VERSION = "v1";
const GUIDED_COLLECTION_CONCEPT_BUNDLE_MAX_PARAM_LENGTH = 960;

export const conceptSimulationStateQueryParam = "state";
export const publicExperimentCardQueryParam = "experiment";
export const guidedCollectionConceptBundleQueryParam = "bundle";
export const DEFAULT_COMPARE_SETUP_LABELS = {
  a: "Baseline",
  b: "Variant",
} as const;

type CompareSetupLabelKey = keyof typeof DEFAULT_COMPARE_SETUP_LABELS;

export type PublicExperimentCardKind =
  | "guided-setup"
  | "live-setup"
  | "compare-setup"
  | "saved-compare";

export type ShareablePublicExperimentCard = {
  conceptSlug: string;
  title: string;
  prompt?: string | null;
  kind?: PublicExperimentCardKind;
};

export type ResolvedPublicExperimentCard = {
  title: string;
  prompt: string | null;
  kind: PublicExperimentCardKind;
};

export type ShareableCompareSetupState = {
  label: string;
  params: Record<string, ControlValue>;
  activePresetId: string | null;
};

export type ShareableConceptCompareState = {
  activeTarget: "a" | "b";
  setupA: ShareableCompareSetupState;
  setupB: ShareableCompareSetupState;
};

export type ShareableConceptSimulationState = {
  params: Record<string, ControlValue>;
  activePresetId: string | null;
  activeGraphId: string | null;
  overlayValues: Record<string, boolean>;
  focusedOverlayId: string | null;
  time: number;
  timeSource: "live" | "inspect" | "preview";
  compare: ShareableConceptCompareState | null;
};

export type ResolvedConceptSimulationState = {
  params: Record<string, ControlValue>;
  activePresetId: string | null;
  activeGraphId: string | null;
  overlayValues: Record<string, boolean>;
  focusedOverlayId: string | null;
  inspectTime: number | null;
  compare: ShareableConceptCompareState | null;
};

export type ConceptSimulationStateSummary = {
  kind: "default" | "preset" | "modified" | "compare";
  label: string;
  description: string;
};

export type ConceptSimulationStateSource = Pick<ConceptSimulationSource, "slug"> & {
  simulation: Pick<
    ConceptSimulationSource["simulation"],
    "defaults" | "presets" | "graphs" | "overlays"
  >;
};

type EncodedCompareSetupState = {
  p?: Record<string, ControlValue>;
  pr?: string;
  l?: string;
};

type EncodedConceptSimulationState = {
  p?: Record<string, ControlValue>;
  pr?: string;
  g?: string;
  o?: string[];
  f?: string;
  t?: number;
  c?: {
    at: "a" | "b";
    a: EncodedCompareSetupState;
    b: EncodedCompareSetupState;
  };
};

type EncodedPublicExperimentCard = {
  c: string;
  t: string;
  p?: string;
  k?: PublicExperimentCardKind;
};

type EncodedGuidedCollectionConceptBundle = {
  c: string;
  i: string;
  t: string;
  s: string;
  st: string[];
  l?: string;
};

export const conceptShareAnchorIds = {
  interactiveLab: "interactive-lab",
  liveBench: "live-bench",
  challengeMode: "challenge-mode",
  workedExamples: "worked-examples",
  quickTest: "quick-test",
  readNext: "read-next",
} as const;

export const trackShareAnchorIds = {
  guidedPath: "guided-path",
} as const;

export const guidedCollectionShareAnchorIds = {
  bundle: "concept-bundle",
  steps: "guided-steps",
} as const;

export const assignmentShareAnchorIds = {
  steps: "assignment-steps",
} as const;

const shareableConceptSectionLabels: Partial<Record<ConceptPageSectionId, string>> = {
  workedExamples: "Worked examples",
  quickTest: "Quick test",
  readNext: "Read next",
};

function cloneParams(params: Record<string, ControlValue>) {
  return { ...params };
}

function normalizeCompareLabel(label: string, fallbackKey: CompareSetupLabelKey) {
  const normalized = label.replace(/\s+/g, " ").trim().slice(0, 48);
  return normalized || DEFAULT_COMPARE_SETUP_LABELS[fallbackKey];
}

function sanitizePublicExperimentCardText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim().slice(0, maxLength);
  return normalized || null;
}

function sanitizeGuidedCollectionConceptBundleText(value: unknown, maxLength: number) {
  return sanitizePublicExperimentCardText(value, maxLength);
}

function sanitizePublicExperimentCardKind(value: unknown): PublicExperimentCardKind {
  switch (value) {
    case "guided-setup":
    case "compare-setup":
    case "saved-compare":
      return value;
    default:
      return "live-setup";
  }
}

function deriveOverlayDefaults(
  overlays: ConceptSimulationStateSource["simulation"]["overlays"],
) {
  return Object.fromEntries((overlays ?? []).map((overlay) => [overlay.id, overlay.defaultOn]));
}

function resolveFocusedOverlayId(
  overlays: ConceptSimulationStateSource["simulation"]["overlays"],
  overlayValues: Record<string, boolean>,
  focusedOverlayId: string | null,
) {
  const availableOverlays = overlays ?? [];

  if (!availableOverlays.length) {
    return null;
  }

  if (focusedOverlayId && availableOverlays.some((overlay) => overlay.id === focusedOverlayId)) {
    return focusedOverlayId;
  }

  const enabledOverlay = availableOverlays.find((overlay) => overlayValues[overlay.id]);
  return enabledOverlay?.id ?? availableOverlays[0]?.id ?? null;
}

function arraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function sortUniqueStrings(values: Iterable<string>) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortJsonValue(nestedValue)]),
    );
  }

  return value;
}

function canUseNodeBuffer() {
  return typeof window === "undefined" && typeof Buffer !== "undefined";
}

function encodeBase64Url(value: string) {
  if (canUseNodeBuffer()) {
    return Buffer.from(value, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/u, "");
  }

  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const padded = `${normalized}${padding}`;

  if (canUseNodeBuffer()) {
    return Buffer.from(padded, "base64").toString("utf8");
  }

  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizeControlValue(
  value: unknown,
  fallback: ControlValue,
): ControlValue | null {
  if (typeof fallback === "number") {
    return isFiniteNumber(value) ? value : null;
  }

  if (typeof fallback === "boolean") {
    return typeof value === "boolean" ? value : null;
  }

  if (typeof fallback === "string") {
    return typeof value === "string" ? value : null;
  }

  return null;
}

function restoreParamPatch(
  defaults: Record<string, ControlValue>,
  patch: unknown,
) {
  const nextParams = cloneParams(defaults);

  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return nextParams;
  }

  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (!(key in defaults)) {
      continue;
    }

    const normalizedValue = sanitizeControlValue(value, defaults[key]);

    if (normalizedValue !== null) {
      nextParams[key] = normalizedValue;
    }
  }

  return nextParams;
}

function diffParams(
  defaults: Record<string, ControlValue>,
  params: Record<string, ControlValue>,
) {
  const entries = Object.keys(defaults)
    .sort((left, right) => left.localeCompare(right))
    .flatMap((key) => {
      if (!(key in params) || params[key] === defaults[key]) {
        return [];
      }

      return [[key, params[key]] as const];
    });

  return entries.length ? Object.fromEntries(entries) : undefined;
}

function areControlValueMapsEqual(
  left: Record<string, ControlValue>,
  right: Record<string, ControlValue>,
) {
  const leftKeys = Object.keys(left).sort((a, b) => a.localeCompare(b));
  const rightKeys = Object.keys(right).sort((a, b) => a.localeCompare(b));

  if (!arraysEqual(leftKeys, rightKeys)) {
    return false;
  }

  return leftKeys.every((key) => left[key] === right[key]);
}

function normalizePresetId(
  value: unknown,
  presetIds: ReadonlySet<string>,
) {
  return typeof value === "string" && presetIds.has(value) ? value : null;
}

function encodeCompareSetup(
  defaults: Record<string, ControlValue>,
  setup: ShareableCompareSetupState,
  fallbackKey: CompareSetupLabelKey,
) {
  const encoded: EncodedCompareSetupState = {};
  const patch = diffParams(defaults, setup.params);

  if (patch) {
    encoded.p = patch;
  }

  if (setup.activePresetId) {
    encoded.pr = setup.activePresetId;
  }

  const normalizedLabel = normalizeCompareLabel(setup.label, fallbackKey);

  if (normalizedLabel !== DEFAULT_COMPARE_SETUP_LABELS[fallbackKey]) {
    encoded.l = normalizedLabel;
  }

  return encoded;
}

function resolveOverlayValues(
  source: ConceptSimulationStateSource,
  enabledOverlayIds: unknown,
) {
  const nextOverlayValues = deriveOverlayDefaults(source.simulation.overlays);

  if (!Array.isArray(enabledOverlayIds)) {
    return nextOverlayValues;
  }

  const overlayIds = new Set((source.simulation.overlays ?? []).map((overlay) => overlay.id));

  for (const overlayId of Object.keys(nextOverlayValues)) {
    nextOverlayValues[overlayId] = false;
  }

  for (const overlayId of enabledOverlayIds) {
    if (typeof overlayId === "string" && overlayIds.has(overlayId)) {
      nextOverlayValues[overlayId] = true;
    }
  }

  return nextOverlayValues;
}

function resolveCompareSetup(
  defaults: Record<string, ControlValue>,
  presetIds: ReadonlySet<string>,
  setup: unknown,
  fallbackKey: CompareSetupLabelKey,
): ShareableCompareSetupState {
  const encodedSetup =
    setup && typeof setup === "object" && !Array.isArray(setup)
      ? (setup as EncodedCompareSetupState)
      : {};

  return {
    label: normalizeCompareLabel(encodedSetup.l ?? "", fallbackKey),
    params: restoreParamPatch(defaults, encodedSetup.p),
    activePresetId: normalizePresetId(encodedSetup.pr, presetIds),
  };
}

function encodeConceptSimulationStatePayload(
  source: ConceptSimulationStateSource,
  state: ShareableConceptSimulationState,
) {
  const encoded: EncodedConceptSimulationState = {};
  const defaultGraphId = source.simulation.graphs[0]?.id ?? null;
  const defaultOverlayValues = deriveOverlayDefaults(source.simulation.overlays);
  const defaultEnabledOverlayIds = sortUniqueStrings(
    Object.entries(defaultOverlayValues)
      .filter(([, enabled]) => enabled)
      .map(([overlayId]) => overlayId),
  );
  const currentEnabledOverlayIds = sortUniqueStrings(
    Object.entries(state.overlayValues)
      .filter(([, enabled]) => enabled)
      .map(([overlayId]) => overlayId),
  );

  if (state.compare) {
    encoded.c = {
      at: state.compare.activeTarget,
      a: encodeCompareSetup(source.simulation.defaults, state.compare.setupA, "a"),
      b: encodeCompareSetup(source.simulation.defaults, state.compare.setupB, "b"),
    };
  } else {
    const paramPatch = diffParams(source.simulation.defaults, state.params);

    if (paramPatch) {
      encoded.p = paramPatch;
    }

    if (state.activePresetId) {
      encoded.pr = state.activePresetId;
    }
  }

  if (state.activeGraphId && state.activeGraphId !== defaultGraphId) {
    encoded.g = state.activeGraphId;
  }

  if (!arraysEqual(currentEnabledOverlayIds, defaultEnabledOverlayIds)) {
    encoded.o = currentEnabledOverlayIds;
  }

  const resolvedFocusedOverlayId = resolveFocusedOverlayId(
    source.simulation.overlays,
    state.overlayValues,
    state.focusedOverlayId,
  );
  const defaultFocusedOverlayId = resolveFocusedOverlayId(
    source.simulation.overlays,
    defaultOverlayValues,
    null,
  );

  if (resolvedFocusedOverlayId && resolvedFocusedOverlayId !== defaultFocusedOverlayId) {
    encoded.f = resolvedFocusedOverlayId;
  }

  if (state.timeSource === "inspect" && isFiniteNumber(state.time) && state.time >= 0) {
    encoded.t = state.time;
  }

  return Object.keys(encoded).length ? encoded : null;
}

function decodeConceptSimulationStatePayload(value: string) {
  const [version, encodedPayload] = value.split(".", 2);

  if (version !== CONCEPT_SIMULATION_STATE_VERSION || !encodedPayload) {
    return null;
  }

  try {
    const decodedValue = JSON.parse(decodeBase64Url(encodedPayload)) as unknown;

    if (!decodedValue || typeof decodedValue !== "object" || Array.isArray(decodedValue)) {
      return null;
    }

    return decodedValue as EncodedConceptSimulationState;
  } catch {
    return null;
  }
}

export function buildRelativeShareUrl(pathname: string, options: ShareUrlOptions = {}) {
  const url = new URL(pathname, RELATIVE_URL_BASE);

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (!value) {
      continue;
    }

    url.searchParams.set(key, value);
  }

  const search = url.searchParams.toString();
  const normalizedHash = options.hash?.replace(/^#/, "") ?? "";

  return `${url.pathname}${search ? `?${search}` : ""}${normalizedHash ? `#${normalizedHash}` : ""}`;
}

export function localizeShareHref(href: string, locale?: AppLocale) {
  if (!locale || locale === "en" || href.startsWith("#") || href.startsWith("?")) {
    return href;
  }

  const url = new URL(href, RELATIVE_URL_BASE);
  return `${addLocalePrefix(url.pathname, locale)}${url.search}${url.hash}`;
}

export function buildConceptLabHref(
  conceptSlug: string,
  options: {
    hash?: string | null;
    challengeId?: string | null;
    stateParam?: string | null;
    publicExperimentParam?: string | null;
    locale?: AppLocale;
  } = {},
) {
  return localizeShareHref(
    buildRelativeShareUrl(`/concepts/${conceptSlug}`, {
      hash: options.hash ?? null,
      query: {
        challenge: options.challengeId ?? null,
        [conceptSimulationStateQueryParam]: options.stateParam ?? null,
        [publicExperimentCardQueryParam]: options.publicExperimentParam ?? null,
      },
    }),
    options.locale,
  );
}

export function encodePublicExperimentCard(
  card: ShareablePublicExperimentCard | null | undefined,
) {
  if (!card) {
    return null;
  }

  const conceptSlug = sanitizePublicExperimentCardText(card.conceptSlug, 160);
  const title = sanitizePublicExperimentCardText(card.title, 96);

  if (!conceptSlug || !title) {
    return null;
  }

  const payload: EncodedPublicExperimentCard = {
    c: conceptSlug,
    t: title,
    k: sanitizePublicExperimentCardKind(card.kind),
  };
  const prompt = sanitizePublicExperimentCardText(card.prompt ?? null, 220);

  if (prompt) {
    payload.p = prompt;
  }

  const encodedValue = `${PUBLIC_EXPERIMENT_CARD_VERSION}.${encodeBase64Url(
    JSON.stringify(sortJsonValue(payload)),
  )}`;

  return encodedValue.length <= PUBLIC_EXPERIMENT_CARD_MAX_PARAM_LENGTH
    ? encodedValue
    : null;
}

export function encodeGuidedCollectionConceptBundle(
  bundle: Pick<
    ResolvedGuidedCollectionConceptBundle,
    "collectionSlug" | "id" | "title" | "summary" | "stepIds" | "launchStep"
  > | null | undefined,
) {
  if (!bundle) {
    return null;
  }

  const collectionSlug = sanitizeGuidedCollectionConceptBundleText(bundle.collectionSlug, 160);
  const id = sanitizeGuidedCollectionConceptBundleText(bundle.id, 120);
  const title = sanitizeGuidedCollectionConceptBundleText(bundle.title, 96);
  const summary = sanitizeGuidedCollectionConceptBundleText(bundle.summary, 260);
  const stepIds = Array.isArray(bundle.stepIds)
    ? bundle.stepIds.filter(
        (stepId): stepId is string =>
          typeof stepId === "string" && stepId.trim().length > 0,
      )
    : [];

  if (!collectionSlug || !id || !title || !summary || !stepIds.length) {
    return null;
  }

  const payload: EncodedGuidedCollectionConceptBundle = {
    c: collectionSlug,
    i: id,
    t: title,
    s: summary,
    st: stepIds,
  };
  const launchStepId = sanitizeGuidedCollectionConceptBundleText(bundle.launchStep.id, 160);

  if (launchStepId) {
    payload.l = launchStepId;
  }

  const encodedValue = `${GUIDED_COLLECTION_CONCEPT_BUNDLE_VERSION}.${encodeBase64Url(
    JSON.stringify(sortJsonValue(payload)),
  )}`;

  return encodedValue.length <= GUIDED_COLLECTION_CONCEPT_BUNDLE_MAX_PARAM_LENGTH
    ? encodedValue
    : null;
}

function decodePublicExperimentCard(value: string) {
  const [version, encodedPayload] = value.split(".", 2);

  if (version !== PUBLIC_EXPERIMENT_CARD_VERSION || !encodedPayload) {
    return null;
  }

  try {
    const decodedValue = JSON.parse(decodeBase64Url(encodedPayload)) as unknown;

    if (!decodedValue || typeof decodedValue !== "object" || Array.isArray(decodedValue)) {
      return null;
    }

    return decodedValue as EncodedPublicExperimentCard;
  } catch {
    return null;
  }
}

function decodeGuidedCollectionConceptBundle(value: string) {
  const [version, encodedPayload] = value.split(".", 2);

  if (version !== GUIDED_COLLECTION_CONCEPT_BUNDLE_VERSION || !encodedPayload) {
    return null;
  }

  try {
    const decodedValue = JSON.parse(decodeBase64Url(encodedPayload)) as unknown;

    if (!decodedValue || typeof decodedValue !== "object" || Array.isArray(decodedValue)) {
      return null;
    }

    return decodedValue as EncodedGuidedCollectionConceptBundle;
  } catch {
    return null;
  }
}

export function encodeConceptSimulationState(
  source: ConceptSimulationStateSource,
  state: ShareableConceptSimulationState,
) {
  const payload = encodeConceptSimulationStatePayload(source, state);

  if (!payload) {
    return null;
  }

  const encodedValue = `${CONCEPT_SIMULATION_STATE_VERSION}.${encodeBase64Url(
    JSON.stringify(sortJsonValue(payload)),
  )}`;

  return encodedValue.length <= CONCEPT_SIMULATION_STATE_MAX_PARAM_LENGTH
    ? encodedValue
    : null;
}

export function buildConceptSimulationStateHref({
  source,
  conceptSlug,
  state,
  hash = conceptShareAnchorIds.interactiveLab,
  challengeId = null,
  publicExperimentCard = null,
  locale,
}: {
  source: ConceptSimulationStateSource;
  conceptSlug: string;
  state: ShareableConceptSimulationState;
  hash?: string | null;
  challengeId?: string | null;
  publicExperimentCard?: ShareablePublicExperimentCard | null;
  locale?: AppLocale;
}) {
  return buildConceptSimulationStateLinkPayload({
    source,
    conceptSlug,
    state,
    hash,
    challengeId,
    publicExperimentCard,
    locale,
  }).href;
}

export function buildConceptSimulationStateLinkPayload({
  source,
  conceptSlug,
  state,
  hash = conceptShareAnchorIds.interactiveLab,
  challengeId = null,
  publicExperimentCard = null,
  locale,
}: {
  source: ConceptSimulationStateSource;
  conceptSlug: string;
  state: ShareableConceptSimulationState;
  hash?: string | null;
  challengeId?: string | null;
  publicExperimentCard?: ShareablePublicExperimentCard | null;
  locale?: AppLocale;
}): ConceptSimulationSharePayload {
  const stateParam = encodeConceptSimulationState(source, state);
  const publicExperimentParam = encodePublicExperimentCard(publicExperimentCard);

  return {
    href: buildConceptLabHref(conceptSlug, {
      hash,
      challengeId,
      stateParam,
      publicExperimentParam,
      locale,
    }),
    stateParam,
    publicExperimentParam,
  };
}

export function resolveConceptSimulationSharePayloadFromHref(
  href: string,
): Pick<ConceptSimulationSharePayload, "stateParam" | "publicExperimentParam"> {
  try {
    const url = new URL(href, RELATIVE_URL_BASE);

    return {
      stateParam: url.searchParams.get(conceptSimulationStateQueryParam),
      publicExperimentParam: url.searchParams.get(publicExperimentCardQueryParam),
    };
  } catch {
    return {
      stateParam: null,
      publicExperimentParam: null,
    };
  }
}

export function buildConceptSimulationShareTarget({
  id,
  label,
  conceptSlug,
  conceptTitle,
  source,
  state,
  ariaLabel,
  buttonLabel,
  shareLabel,
  shareTitle,
  preferWebShare = true,
  copiedText,
  sharedText,
  hash = conceptShareAnchorIds.interactiveLab,
  challengeId = null,
  publicExperimentCard = null,
  locale,
}: {
  id: string;
  label: string;
  conceptSlug: string;
  conceptTitle: string;
  source: ConceptSimulationStateSource;
  state: ShareableConceptSimulationState;
  ariaLabel: string;
  buttonLabel?: string;
  shareLabel?: string;
  shareTitle?: string;
  preferWebShare?: boolean;
  copiedText?: string;
  sharedText?: string;
  hash?: string | null;
  challengeId?: string | null;
  publicExperimentCard?: ShareablePublicExperimentCard | null;
  locale?: AppLocale;
}): ShareLinkTarget {
  return {
    id,
    label,
    href: buildConceptSimulationStateHref({
      source,
      conceptSlug,
      state,
      hash,
      challengeId,
      publicExperimentCard,
      locale,
    }),
    ariaLabel,
    buttonLabel,
    shareLabel,
    shareTitle: shareTitle ?? conceptTitle,
    preferWebShare,
    copiedText,
    sharedText,
  };
}

function buildSingleSetupShareState(
  state: ShareableConceptSimulationState,
  target: "a" | "b",
): ShareableConceptSimulationState {
  const setup = target === "a" ? state.compare?.setupA : state.compare?.setupB;

  if (!setup) {
    return state;
  }

  return {
    params: cloneParams(setup.params),
    activePresetId: setup.activePresetId,
    activeGraphId: state.activeGraphId,
    overlayValues: { ...state.overlayValues },
    focusedOverlayId: state.focusedOverlayId,
    time: state.time,
    timeSource: state.timeSource,
    compare: null,
  };
}

function buildPublicExperimentCard({
  conceptSlug,
  title,
  prompt,
  kind,
}: {
  conceptSlug: string;
  title: string;
  prompt?: string | null;
  kind: PublicExperimentCardKind;
}): ShareablePublicExperimentCard {
  return {
    conceptSlug,
    title,
    prompt: prompt ?? null,
    kind,
  };
}

export function summarizeConceptSimulationState(
  source: ConceptSimulationStateSource,
  state: ShareableConceptSimulationState,
): ConceptSimulationStateSummary {
  if (state.compare) {
    const setupALabel = normalizeCompareLabel(state.compare.setupA.label, "a");
    const setupBLabel = normalizeCompareLabel(state.compare.setupB.label, "b");

    return {
      kind: "compare",
      label: `${setupALabel} vs ${setupBLabel}`,
      description:
        "Compare mode is active, so the bench keeps both setups, their labels, and the shared graph context together.",
    };
  }

  const defaultGraphId = source.simulation.graphs[0]?.id ?? null;
  const defaultOverlays = deriveOverlayDefaults(source.simulation.overlays);
  const defaultLikeState =
    areControlValueMapsEqual(source.simulation.defaults, state.params) &&
    state.activePresetId === null &&
    state.activeGraphId === defaultGraphId &&
    areControlValueMapsEqual(defaultOverlays, state.overlayValues) &&
    state.timeSource === "live";

  if (defaultLikeState) {
    return {
      kind: "default",
      label: "Default live bench",
      description:
        "This bench still matches the default concept setup, so the copied link will reopen the standard live lab.",
    };
  }

  const activePreset = state.activePresetId
    ? source.simulation.presets.find((preset) => preset.id === state.activePresetId) ?? null
    : null;
  const expectedPresetParams = activePreset
    ? {
        ...source.simulation.defaults,
        ...activePreset.values,
      }
    : null;
  const presetLikeState =
    Boolean(activePreset) &&
    areControlValueMapsEqual(expectedPresetParams ?? {}, state.params);

  if (activePreset && presetLikeState) {
    return {
      kind: "preset",
      label: `${activePreset.label} preset`,
      description:
        "This bench still matches one named preset, so the copied link will reopen that same starting point along with the current graph, overlays, and inspect context.",
    };
  }

  return {
    kind: "modified",
    label: "Custom setup",
    description:
      "This bench has live changes beyond the default setup, so the copied link will reopen the exact controls, graph, overlays, and inspect state you see now.",
  };
}

export function buildConceptSimulationStateFromSetup(
  source: ConceptSimulationStateSource,
  setup: ConceptPageFeaturedSetup["setup"],
): ShareableConceptSimulationState {
  let params = cloneParams(source.simulation.defaults);
  let activePresetId: string | null = null;

  if (setup.presetId) {
    const preset = source.simulation.presets.find((entry) => entry.id === setup.presetId) ?? null;

    if (preset) {
      params = {
        ...params,
        ...preset.values,
      };
      activePresetId = preset.id;
    }
  }

  if (setup.patch) {
    params = restoreParamPatch(params, setup.patch);
  }

  const overlayValues = deriveOverlayDefaults(source.simulation.overlays);

  for (const overlayId of setup.overlayIds ?? []) {
    if (overlayId in overlayValues) {
      overlayValues[overlayId] = true;
    }
  }

  const activeGraphId =
    typeof setup.graphId === "string" &&
    source.simulation.graphs.some((graph) => graph.id === setup.graphId)
      ? setup.graphId
      : (source.simulation.graphs[0]?.id ?? null);
  const inspectTime = setup.inspectTime ?? null;
  const compare =
    setup.interactionMode === "compare"
      ? {
          activeTarget: "b" as const,
          setupA: {
            label: DEFAULT_COMPARE_SETUP_LABELS.a,
            params: cloneParams(params),
            activePresetId,
          },
          setupB: {
            label: DEFAULT_COMPARE_SETUP_LABELS.b,
            params: cloneParams(params),
            activePresetId,
          },
        }
      : null;

  return {
    params: cloneParams(params),
    activePresetId,
    activeGraphId,
    overlayValues,
    focusedOverlayId: resolveFocusedOverlayId(
      source.simulation.overlays,
      overlayValues,
      setup.overlayIds?.[0] ?? null,
    ),
    time: inspectTime ?? 0,
    timeSource: inspectTime !== null ? "inspect" : "live",
    compare,
  };
}

export function buildConceptFeaturedSetupTargets({
  source,
  conceptSlug,
  setups,
}: {
  source: ConceptSimulationStateSource;
  conceptSlug: string;
  setups: readonly ConceptPageFeaturedSetup[];
}): ConceptFeaturedSetupLinkTarget[] {
  return setups.map((setup) => {
    const state = buildConceptSimulationStateFromSetup(source, setup.setup);

    return {
      id: setup.id,
      label: setup.label,
      description: setup.description,
      href: buildConceptSimulationStateHref({
        source,
        conceptSlug,
        state,
        publicExperimentCard: buildPublicExperimentCard({
          conceptSlug,
          title: setup.label,
          prompt: setup.description,
          kind: "guided-setup",
        }),
      }),
    };
  });
}

export function buildConceptTryThisShareTargets({
  source,
  conceptSlug,
  conceptTitle,
  state,
  locale,
}: {
  source: ConceptSimulationStateSource;
  conceptSlug: string;
  conceptTitle: string;
  state: ShareableConceptSimulationState;
  locale?: AppLocale;
}): ShareLinkTarget[] {
  if (state.compare) {
    const setupALabel = normalizeCompareLabel(state.compare.setupA.label, "a");
    const setupBLabel = normalizeCompareLabel(state.compare.setupB.label, "b");

    return [
      buildConceptSimulationShareTarget({
        id: "try-this-compare",
        label: `${setupALabel} vs ${setupBLabel}`,
        conceptSlug,
        conceptTitle,
        source,
        state,
        ariaLabel: "Copy compare setup link",
        buttonLabel: "Copy compare setup",
        shareLabel: "Share compare setup",
        shareTitle: `${conceptTitle}: ${setupALabel} vs ${setupBLabel}`,
        copiedText: "Copied compare setup link",
        sharedText: "Shared compare setup",
        locale,
        publicExperimentCard: buildPublicExperimentCard({
          conceptSlug,
          title: `${setupALabel} vs ${setupBLabel}`,
          prompt: "Open this shared compare bench and start changing either setup in the live lab.",
          kind: "compare-setup",
        }),
      }),
      buildConceptSimulationShareTarget({
        id: "try-this-setup-a",
        label: `A: ${setupALabel}`,
        conceptSlug,
        conceptTitle,
        source,
        state: buildSingleSetupShareState(state, "a"),
        ariaLabel: "Copy setup A link",
        shareLabel: "Share setup A",
        shareTitle: `${conceptTitle}: ${setupALabel}`,
        copiedText: "Copied setup A link",
        sharedText: "Shared setup A",
        locale,
        publicExperimentCard: buildPublicExperimentCard({
          conceptSlug,
          title: setupALabel,
          prompt: "Open this shared setup from the compare bench and start manipulating it in the live lab.",
          kind: "live-setup",
        }),
      }),
      buildConceptSimulationShareTarget({
        id: "try-this-setup-b",
        label: `B: ${setupBLabel}`,
        conceptSlug,
        conceptTitle,
        source,
        state: buildSingleSetupShareState(state, "b"),
        ariaLabel: "Copy setup B link",
        shareLabel: "Share setup B",
        shareTitle: `${conceptTitle}: ${setupBLabel}`,
        copiedText: "Copied setup B link",
        sharedText: "Shared setup B",
        locale,
        publicExperimentCard: buildPublicExperimentCard({
          conceptSlug,
          title: setupBLabel,
          prompt: "Open this shared setup from the compare bench and start manipulating it in the live lab.",
          kind: "live-setup",
        }),
      }),
    ];
  }

  const summary = summarizeConceptSimulationState(source, state);
  const activePresetLabel = state.activePresetId
    ? source.simulation.presets.find((preset) => preset.id === state.activePresetId)?.label ?? null
    : null;

  const singleSetupTitle =
    summary.kind === "default"
      ? `${conceptTitle}: default live bench`
      : activePresetLabel
        ? `${conceptTitle}: ${activePresetLabel}`
        : `${conceptTitle}: current setup`;
  const singleSetupPrompt =
    summary.kind === "default"
      ? "Reopen the default live bench for this concept and start changing the controls immediately."
      : summary.kind === "preset"
        ? "Reopen this named preset setup and start adjusting the live controls immediately."
        : "Reopen this shared bench state and start changing the live controls immediately.";
  const singleSetupLabel =
    summary.kind === "default"
      ? "Default live bench"
      : activePresetLabel
        ? `Preset: ${activePresetLabel}`
        : "Current setup";
  const singleSetupButtonLabel =
    summary.kind === "default"
      ? "Copy default setup"
      : summary.kind === "preset"
        ? "Copy preset setup"
        : "Copy current setup";

  return [
    buildConceptSimulationShareTarget({
      id: "try-this-setup",
      label: singleSetupLabel,
      conceptSlug,
      conceptTitle,
      source,
      state,
      ariaLabel:
        summary.kind === "default"
          ? "Copy default setup link"
          : summary.kind === "preset"
            ? "Copy preset setup link"
            : "Copy current setup link",
      buttonLabel: singleSetupButtonLabel,
      shareLabel:
        summary.kind === "default"
          ? "Share default setup"
          : summary.kind === "preset"
            ? "Share preset setup"
            : "Share current setup",
      shareTitle: singleSetupTitle,
      copiedText:
        summary.kind === "default"
          ? "Copied default setup link"
          : summary.kind === "preset"
            ? "Copied preset setup link"
            : "Copied current setup link",
      sharedText:
        summary.kind === "default"
          ? "Shared default setup"
          : summary.kind === "preset"
            ? "Shared preset setup"
            : "Shared current setup",
      locale,
      publicExperimentCard: buildPublicExperimentCard({
        conceptSlug,
        title: summary.kind === "default" ? "Default live bench" : activePresetLabel ?? "Current setup",
        prompt: singleSetupPrompt,
        kind: "live-setup",
      }),
    }),
  ];
}

export function resolveConceptSimulationState(
  value: string | string[] | undefined,
  source: ConceptSimulationStateSource,
): ResolvedConceptSimulationState | null {
  const requestedValue = Array.isArray(value) ? value[0] : value;

  if (!requestedValue) {
    return null;
  }

  const payload = decodeConceptSimulationStatePayload(requestedValue);

  if (!payload) {
    return null;
  }

  const presetIds = new Set(source.simulation.presets.map((preset) => preset.id));
  const graphIds = new Set(source.simulation.graphs.map((graph) => graph.id));
  const compare: ShareableConceptCompareState | null = payload.c
    ? {
        activeTarget: payload.c.at === "a" ? "a" : "b",
        setupA: resolveCompareSetup(source.simulation.defaults, presetIds, payload.c.a, "a"),
        setupB: resolveCompareSetup(source.simulation.defaults, presetIds, payload.c.b, "b"),
      }
    : null;
  const overlayValues = resolveOverlayValues(source, payload.o);
  const focusedOverlayId = resolveFocusedOverlayId(
    source.simulation.overlays,
    overlayValues,
    typeof payload.f === "string" ? payload.f : null,
  );
  const activeGraphId =
    typeof payload.g === "string" && graphIds.has(payload.g)
      ? payload.g
      : (source.simulation.graphs[0]?.id ?? null);
  const inspectTime = isFiniteNumber(payload.t) && payload.t >= 0 ? payload.t : null;

  if (compare) {
    const activeSetup = compare.activeTarget === "a" ? compare.setupA : compare.setupB;

    return {
      params: cloneParams(activeSetup.params),
      activePresetId: activeSetup.activePresetId,
      activeGraphId,
      overlayValues,
      focusedOverlayId,
      inspectTime,
      compare,
    };
  }

  return {
    params: restoreParamPatch(source.simulation.defaults, payload.p),
    activePresetId: normalizePresetId(payload.pr, presetIds),
    activeGraphId,
    overlayValues,
    focusedOverlayId,
    inspectTime,
    compare: null,
  };
}

export function resolvePublicExperimentCard(
  value: string | string[] | undefined,
  conceptSlug: string,
): ResolvedPublicExperimentCard | null {
  const requestedValue = Array.isArray(value) ? value[0] : value;

  if (!requestedValue) {
    return null;
  }

  const payload = decodePublicExperimentCard(requestedValue);

  if (!payload) {
    return null;
  }

  const payloadConceptSlug = sanitizePublicExperimentCardText(payload.c, 160);
  const title = sanitizePublicExperimentCardText(payload.t, 96);

  if (!payloadConceptSlug || !title || payloadConceptSlug !== conceptSlug) {
    return null;
  }

  return {
    title,
    prompt: sanitizePublicExperimentCardText(payload.p ?? null, 220),
    kind: sanitizePublicExperimentCardKind(payload.k),
  };
}

export function getConceptSectionAnchorId(sectionId: ConceptPageSectionId) {
  switch (sectionId) {
    case "explanation":
      return "short-explanation";
    case "keyIdeas":
      return "key-ideas";
    case "workedExamples":
      return conceptShareAnchorIds.workedExamples;
    case "commonMisconception":
      return "common-misconception";
    case "miniChallenge":
      return "mini-challenge";
    case "quickTest":
      return conceptShareAnchorIds.quickTest;
    case "accessibility":
      return "accessibility";
    case "readNext":
      return conceptShareAnchorIds.readNext;
    default:
      return null;
  }
}

function buildCopyAriaLabel(label: string) {
  return `Copy ${label.toLowerCase()} link`;
}

export function buildConceptShareTargets({
  slug,
  hasChallengeMode,
  sections,
  locale,
}: {
  slug: string;
  hasChallengeMode: boolean;
  sections: ResolvedConceptPageSection[];
  locale?: AppLocale;
}): ShareLinkTarget[] {
  const pagePath = `/concepts/${slug}`;
  const targets: ShareLinkTarget[] = [
    {
      id: "concept-page",
      label: "Concept page",
      href: localizeShareHref(buildRelativeShareUrl(pagePath), locale),
      ariaLabel: "Copy concept page link",
    },
    {
      id: "interactive-lab",
      label: "Interactive lab",
      href: localizeShareHref(
        buildRelativeShareUrl(pagePath, {
          hash: conceptShareAnchorIds.interactiveLab,
        }),
        locale,
      ),
      ariaLabel: buildCopyAriaLabel("interactive lab"),
    },
  ];

  if (hasChallengeMode) {
    targets.push({
      id: "challenge-mode",
      label: "Challenge mode",
      href: localizeShareHref(
        buildRelativeShareUrl(pagePath, {
          hash: conceptShareAnchorIds.challengeMode,
        }),
        locale,
      ),
      ariaLabel: buildCopyAriaLabel("challenge mode"),
    });
  }

  const addedIds = new Set(targets.map((target) => target.id));

  for (const section of sections) {
    const label = shareableConceptSectionLabels[section.id];
    const anchorId = getConceptSectionAnchorId(section.id);

    if (!label || !anchorId || addedIds.has(section.id)) {
      continue;
    }

    targets.push({
      id: section.id,
      label,
      href: localizeShareHref(buildRelativeShareUrl(pagePath, { hash: anchorId }), locale),
      ariaLabel: buildCopyAriaLabel(label),
    });
    addedIds.add(section.id);
  }

  return targets;
}

export function buildTrackShareTargets(trackSlug: string, locale?: AppLocale): ShareLinkTarget[] {
  const pagePath = `/tracks/${trackSlug}`;

  return [
    {
      id: "track-page",
      label: "Track page",
      href: localizeShareHref(buildRelativeShareUrl(pagePath), locale),
      ariaLabel: "Copy track page link",
    },
    {
      id: "guided-path",
      label: "Guided path",
      href: localizeShareHref(
        buildRelativeShareUrl(pagePath, { hash: trackShareAnchorIds.guidedPath }),
        locale,
      ),
      ariaLabel: "Copy guided path link",
    },
    {
      id: "track-recap",
      label: "Recap mode",
      href: buildTrackRecapHref(trackSlug, locale),
      ariaLabel: "Copy recap mode link",
    },
  ];
}

export function buildGuidedCollectionBundleHref(
  bundle: Pick<
    ResolvedGuidedCollectionConceptBundle,
    "collectionSlug" | "id" | "title" | "summary" | "stepIds" | "launchStep"
  >,
  hash: string | null = guidedCollectionShareAnchorIds.bundle,
  locale?: AppLocale,
) {
  return localizeShareHref(
    buildRelativeShareUrl(`/guided/${bundle.collectionSlug}`, {
      hash,
      query: {
        [guidedCollectionConceptBundleQueryParam]: encodeGuidedCollectionConceptBundle(bundle),
      },
    }),
    locale,
  );
}

export function buildGuidedCollectionShareTargets(
  collectionSlug: string,
  locale?: AppLocale,
): ShareLinkTarget[] {
  const pagePath = `/guided/${collectionSlug}`;

  return [
    {
      id: "guided-collection-page",
      label: "Collection page",
      href: localizeShareHref(buildRelativeShareUrl(pagePath), locale),
      ariaLabel: "Copy collection page link",
    },
    {
      id: "guided-collection-steps",
      label: "Ordered steps",
      href: localizeShareHref(
        buildRelativeShareUrl(pagePath, {
          hash: guidedCollectionShareAnchorIds.steps,
        }),
        locale,
      ),
      ariaLabel: "Copy ordered steps link",
    },
  ];
}

export function buildGuidedCollectionBundleShareTargets(
  bundle: ResolvedGuidedCollectionConceptBundle,
  locale?: AppLocale,
): ShareLinkTarget[] {
  return [
    {
      id: "guided-collection-bundle",
      label: "Bundle page",
      href: buildGuidedCollectionBundleHref(
        bundle,
        guidedCollectionShareAnchorIds.bundle,
        locale,
      ),
      ariaLabel: "Copy concept bundle link",
      buttonLabel: "Copy bundle link",
      shareLabel: "Share bundle",
      shareTitle: bundle.title,
      copiedText: "Copied bundle link",
      sharedText: "Shared bundle",
    },
    {
      id: "guided-collection-bundle-launch",
      label: "Launch step",
      href: localizeShareHref(bundle.launchStep.href, locale),
      ariaLabel: "Copy bundle launch step link",
    },
  ];
}

export function buildGuidedCollectionAssignmentHref(
  assignmentId: string,
  hash?: string | null,
  locale?: AppLocale,
) {
  return localizeShareHref(
    buildRelativeShareUrl(`/assignments/${assignmentId}`, {
      hash: hash ?? null,
    }),
    locale,
  );
}

export function buildGuidedCollectionAssignmentShareTargets(
  assignment: Pick<ResolvedGuidedCollectionAssignment, "id" | "title" | "launchStep">,
  locale?: AppLocale,
): ShareLinkTarget[] {
  return [
    {
      id: "guided-collection-assignment",
      label: "Assignment page",
      href: buildGuidedCollectionAssignmentHref(assignment.id, null, locale),
      ariaLabel: "Copy assignment page link",
      buttonLabel: "Copy assignment link",
      shareLabel: "Share assignment",
      shareTitle: assignment.title,
      copiedText: "Copied assignment link",
      sharedText: "Shared assignment",
    },
    {
      id: "guided-collection-assignment-steps",
      label: "Assigned steps",
      href: buildGuidedCollectionAssignmentHref(
        assignment.id,
        assignmentShareAnchorIds.steps,
        locale,
      ),
      ariaLabel: "Copy assigned steps link",
    },
    {
      id: "guided-collection-assignment-launch",
      label: "Launch step",
      href: localizeShareHref(assignment.launchStep.href, locale),
      ariaLabel: "Copy assignment launch step link",
    },
  ];
}

export function buildTrackCompletionShareTargets(
  trackSlug: string,
  locale?: AppLocale,
): ShareLinkTarget[] {
  return [
    {
      id: "track-completion",
      label: "Completion page",
      href: buildTrackCompletionHref(trackSlug, locale),
      ariaLabel: "Copy completion page link",
    },
    {
      id: "track-page",
      label: "Full track",
      href: localizeShareHref(buildRelativeShareUrl(`/tracks/${trackSlug}`), locale),
      ariaLabel: "Copy full track link",
    },
    {
      id: "track-recap",
      label: "Recap mode",
      href: buildTrackRecapHref(trackSlug, locale),
      ariaLabel: "Copy recap mode link",
    },
  ];
}

export function buildTrackRecapHref(trackSlug: string, locale?: AppLocale) {
  return localizeShareHref(
    buildRelativeShareUrl(`/tracks/${trackSlug}`, {
      query: {
        mode: "recap",
      },
    }),
    locale,
  );
}

export function buildTrackCompletionHref(trackSlug: string, locale?: AppLocale) {
  return localizeShareHref(buildRelativeShareUrl(`/tracks/${trackSlug}/complete`), locale);
}

export function buildChallengeEntryHref(
  conceptSlug: string,
  challengeId: string,
  locale?: AppLocale,
) {
  return buildConceptLabHref(conceptSlug, {
    challengeId,
    hash: conceptShareAnchorIds.challengeMode,
    locale,
  });
}

export function resolveInitialChallengeItemId(
  value: string | string[] | undefined,
  availableItemIds: readonly string[],
) {
  const requestedId = Array.isArray(value) ? value[0] : value;

  if (!requestedId || !availableItemIds.includes(requestedId)) {
    return null;
  }

  return requestedId;
}

export function resolveGuidedCollectionBundle(
  value: string | string[] | undefined,
  collection: Parameters<typeof resolveGuidedCollectionConceptBundle>[0],
) {
  const requestedValue = Array.isArray(value) ? value[0] : value;

  if (!requestedValue) {
    return null;
  }

  const payload = decodeGuidedCollectionConceptBundle(requestedValue);

  if (!payload) {
    return null;
  }

  const collectionSlug = sanitizeGuidedCollectionConceptBundleText(payload.c, 160);
  const id = sanitizeGuidedCollectionConceptBundleText(payload.i, 120);
  const title = sanitizeGuidedCollectionConceptBundleText(payload.t, 96);
  const summary = sanitizeGuidedCollectionConceptBundleText(payload.s, 260);
  const stepIds = Array.isArray(payload.st)
    ? payload.st.filter(
        (stepId): stepId is string =>
          typeof stepId === "string" && stepId.trim().length > 0,
      )
    : [];

  if (
    !collectionSlug ||
    collectionSlug !== collection.slug ||
    !id ||
    !title ||
    !summary ||
    !stepIds.length
  ) {
    return null;
  }

  return resolveGuidedCollectionConceptBundle(collection, {
    id,
    title,
    summary,
    stepIds,
    launchStepId:
      sanitizeGuidedCollectionConceptBundleText(payload.l ?? null, 160) ?? null,
  });
}
