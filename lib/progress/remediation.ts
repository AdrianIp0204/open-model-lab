import type { GuidedCollectionSummary, StarterTrackSummary } from "@/lib/content";
import type { AppLocale } from "@/i18n/routing";
import {
  getDefaultGuidedCollectionConceptBundleDraft,
  resolveGuidedCollectionConceptBundle,
} from "@/lib/guided/concept-bundles";
import {
  buildGuidedCollectionBundleHref,
  buildTrackRecapHref,
  localizeShareHref,
} from "@/lib/share-links";
import type { ProgressSnapshot, ReviewQueueReasonKind, ConceptProgressSummary } from "./model";
import { getConceptProgressSummary } from "./model";
import { getGuidedCollectionProgressSummary } from "./guided-collections";
import { buildPrerequisiteTrackRecommendations } from "./track-recommendations";
import { getStarterTrackProgressSummary, getStarterTrackRecapSummary } from "./tracks";

export type ReviewRemediationActionKind =
  | "concept"
  | "quick-test"
  | "challenge"
  | "worked-examples"
  | "saved-compare-setup"
  | "guided-collection-bundle"
  | "track-recap"
  | "checkpoint"
  | "starter-track"
  | "guided-collection";

export type ReviewRemediationAction = {
  href: string;
  label: string;
  kind: ReviewRemediationActionKind;
  note: string | null;
};

export type ReviewRemediationSuggestionKind =
  | "prerequisite-concept"
  | "prerequisite-track"
  | "track-recap"
  | "guided-collection-bundle"
  | "guided-collection"
  | "saved-compare-setup";

export type ReviewRemediationSuggestion = {
  id: string;
  kind: ReviewRemediationSuggestionKind;
  title: string;
  note: string;
  action: ReviewRemediationAction;
};

export type SavedCompareSetupRecoveryAction = {
  id: string;
  conceptSlug: string;
  name: string;
  updatedAt: string;
  setupALabel: string;
  setupBLabel: string;
  href: string;
};

export type ReviewRemediationConcept = {
  slug: string;
  title: string;
  shortTitle?: string;
  prerequisites?: string[];
};

export type ReviewRemediationContext = {
  concept: {
    slug: string;
    title: string;
  };
  progress: ConceptProgressSummary;
  reasonKind: ReviewQueueReasonKind;
  primaryAction: ReviewRemediationAction;
  secondaryAction: ReviewRemediationAction | null;
  trackContext: {
    trackSlug: string;
    trackTitle: string;
    note: string;
  } | null;
};

type ReviewRemediationOptions = {
  allConcepts?: ReviewRemediationConcept[];
  starterTracks: StarterTrackSummary[];
  guidedCollections?: GuidedCollectionSummary[];
  locale?: AppLocale;
  limit?: number;
};

type GuidedCollectionRemediationCandidate = {
  collection: GuidedCollectionSummary;
  progress: ReturnType<typeof getGuidedCollectionProgressSummary>;
  targetsConceptDirectly: boolean;
  probesConceptDirectly: boolean;
};

function isStableCompleted(progress: ConceptProgressSummary) {
  return progress.status === "completed" && progress.mastery.state === "solid";
}

function buildConceptActionLabel(
  concept: Pick<ReviewRemediationConcept, "shortTitle" | "title">,
  progress: ConceptProgressSummary,
) {
  const label = concept.shortTitle ?? concept.title;

  if (progress.status === "not-started") {
    return `Start ${label}`;
  }

  return `Review ${label}`;
}

function actionKey(action: Pick<ReviewRemediationAction, "href" | "kind">) {
  return `${action.kind}:${action.href}`;
}

function buildPrerequisiteConceptSuggestion(
  snapshot: ProgressSnapshot,
  context: ReviewRemediationContext,
  allConcepts: ReviewRemediationConcept[],
  locale?: AppLocale,
) {
  const conceptsBySlug = new Map(allConcepts.map((concept) => [concept.slug, concept] as const));
  const currentConcept = conceptsBySlug.get(context.concept.slug);

  if (!currentConcept?.prerequisites?.length) {
    return null;
  }

  for (const prerequisiteSlug of currentConcept.prerequisites) {
    const prerequisiteConcept = conceptsBySlug.get(prerequisiteSlug);

    if (!prerequisiteConcept) {
      continue;
    }

    const prerequisiteProgress = getConceptProgressSummary(snapshot, {
      id: prerequisiteSlug,
      slug: prerequisiteConcept.slug,
      title: prerequisiteConcept.title,
    });

    if (isStableCompleted(prerequisiteProgress)) {
      continue;
    }

    const title = prerequisiteConcept.title;
    const actionLabel = buildConceptActionLabel(prerequisiteConcept, prerequisiteProgress);

    return {
      id: `prerequisite-concept-${context.concept.slug}-${prerequisiteConcept.slug}`,
      kind: "prerequisite-concept",
      title: actionLabel,
      note:
        prerequisiteProgress.status === "not-started"
          ? `${title} is the authored prerequisite underneath ${context.concept.title}. Starting there keeps the current review cue on firmer footing.`
          : `${title} is the authored prerequisite underneath ${context.concept.title}. Refresh it first if the current review cue still feels slippery.`,
      action: {
        href: localizeShareHref(`/concepts/${prerequisiteConcept.slug}`, locale),
        label: actionLabel,
        kind: "concept",
        note: `${title} is the prerequisite concept for ${context.concept.title}.`,
      },
    } satisfies ReviewRemediationSuggestion;
  }

  return null;
}

function buildPrerequisiteTrackSuggestion(
  snapshot: ProgressSnapshot,
  context: ReviewRemediationContext,
  starterTracks: StarterTrackSummary[],
  locale?: AppLocale,
) {
  const containingTracks = starterTracks.filter((track) =>
    track.concepts.some((concept) => concept.slug === context.concept.slug),
  );
  const prioritizedTracks = context.trackContext
    ? [
        ...containingTracks.filter((track) => track.slug === context.trackContext?.trackSlug),
        ...containingTracks.filter((track) => track.slug !== context.trackContext?.trackSlug),
      ]
    : containingTracks;
  const starterTracksBySlug = new Map(starterTracks.map((track) => [track.slug, track] as const));

  for (const track of prioritizedTracks) {
    const prerequisiteTracks = (track.prerequisiteTrackSlugs ?? [])
      .map((slug) => starterTracksBySlug.get(slug) ?? null)
      .filter((candidate): candidate is StarterTrackSummary => Boolean(candidate));
    const recommendation = buildPrerequisiteTrackRecommendations(
      snapshot,
      track,
      prerequisiteTracks,
      locale,
    ).find((candidate) => candidate.progress.status !== "completed");

    if (!recommendation) {
      continue;
    }

    return {
      id: `prerequisite-track-${context.concept.slug}-${recommendation.track.slug}`,
      kind: "prerequisite-track",
      title: recommendation.actionLabel,
      note: recommendation.note,
      action: {
        href: recommendation.href,
        label: recommendation.actionLabel,
        kind: "starter-track",
        note: recommendation.note,
      },
    } satisfies ReviewRemediationSuggestion;
  }

  return null;
}

function buildTrackRecapSuggestion(
  snapshot: ProgressSnapshot,
  context: ReviewRemediationContext,
  starterTracks: StarterTrackSummary[],
  locale?: AppLocale,
) {
  const currentTrack =
    starterTracks.find((track) => track.slug === context.trackContext?.trackSlug) ??
    starterTracks.find((track) => track.concepts.some((concept) => concept.slug === context.concept.slug)) ??
    null;

  if (!currentTrack) {
    return null;
  }

  const progress = getStarterTrackProgressSummary(snapshot, currentTrack);
  const recap = getStarterTrackRecapSummary(currentTrack, progress);
  const recapStep = recap.steps.find((step) => step.concept.slug === context.concept.slug) ?? null;
  const note =
    recapStep?.note ??
    context.trackContext?.note ??
    `${currentTrack.title} recap keeps ${context.concept.title} inside the authored review order without reopening the whole track from scratch.`;

  return {
    id: `track-recap-${context.concept.slug}-${currentTrack.slug}`,
    kind: "track-recap",
    title: `Use ${currentTrack.title} recap`,
    note,
    action: {
      href: buildTrackRecapHref(currentTrack.slug, locale),
      label: "Open recap",
      kind: "track-recap",
      note,
    },
  } satisfies ReviewRemediationSuggestion;
}

function buildGuidedCollectionSuggestion(
  snapshot: ProgressSnapshot,
  context: ReviewRemediationContext,
  guidedCollections: GuidedCollectionSummary[],
  locale?: AppLocale,
) {
  const chosen = selectGuidedCollectionCandidate(snapshot, context, guidedCollections);

  if (!chosen) {
    return null;
  }

  const title =
    chosen.progress.status === "in-progress"
      ? `Resume ${chosen.collection.title}`
      : chosen.progress.status === "completed"
        ? `Review ${chosen.collection.title}`
        : `Enter ${chosen.collection.title}`;
  const note =
    chosen.progress.status === "in-progress" && chosen.progress.nextStep
      ? `${chosen.collection.title} already keeps ${context.concept.title} inside a compact authored path. Next up: ${chosen.progress.nextStep.step.title}.`
      : chosen.progress.status === "completed"
        ? `${chosen.collection.title} is already complete in saved progress, but it still provides a bounded review route around ${context.concept.title}.`
        : `${chosen.collection.title} keeps ${context.concept.title} inside a compact authored sequence that reuses the existing topic, track, and challenge surfaces.`;

  return {
    id: `guided-collection-${context.concept.slug}-${chosen.collection.slug}`,
    kind: "guided-collection",
    title,
    note,
    action: {
      href: localizeShareHref(chosen.collection.path, locale),
      label: title,
      kind: "guided-collection",
      note,
    },
  } satisfies ReviewRemediationSuggestion;
}

function selectGuidedCollectionCandidate(
  snapshot: ProgressSnapshot,
  context: ReviewRemediationContext,
  guidedCollections: GuidedCollectionSummary[],
) {
  const candidates = guidedCollections
    .filter((collection) => collection.conceptSlugs.includes(context.concept.slug))
    .map((collection) => {
      const progress = getGuidedCollectionProgressSummary(snapshot, collection);
      const targetsConceptDirectly = collection.steps.some((step) => {
        return (
          (step.kind === "concept" || step.kind === "challenge") &&
          step.concept.slug === context.concept.slug
        );
      });
      const probesConceptDirectly = collection.entryDiagnostic?.probes.some(
        (probe) => probe.concept.slug === context.concept.slug,
      );

      return {
        collection,
        progress,
        targetsConceptDirectly,
        probesConceptDirectly: probesConceptDirectly === true,
      } satisfies GuidedCollectionRemediationCandidate;
    })
    .sort((left, right) => {
      const leftStatus =
        left.progress.status === "in-progress"
          ? 0
          : left.progress.status === "not-started"
            ? 1
            : 2;
      const rightStatus =
        right.progress.status === "in-progress"
          ? 0
          : right.progress.status === "not-started"
            ? 1
            : 2;

      if (leftStatus !== rightStatus) {
        return leftStatus - rightStatus;
      }

      if (left.probesConceptDirectly !== right.probesConceptDirectly) {
        return left.probesConceptDirectly ? -1 : 1;
      }

      if (left.targetsConceptDirectly !== right.targetsConceptDirectly) {
        return left.targetsConceptDirectly ? -1 : 1;
      }

      const leftSequence = left.collection.sequence ?? Number.MAX_SAFE_INTEGER;
      const rightSequence = right.collection.sequence ?? Number.MAX_SAFE_INTEGER;

      if (leftSequence !== rightSequence) {
        return leftSequence - rightSequence;
      }

      return left.collection.title.localeCompare(right.collection.title);
    });

  return candidates[0] ?? null;
}

function buildGuidedCollectionBundle(
  collection: GuidedCollectionSummary,
  concept: ReviewRemediationContext["concept"],
) {
  const focusedStepIds = collection.steps
    .filter((step) => {
      switch (step.kind) {
        case "concept":
        case "challenge":
          return step.concept.slug === concept.slug;
        case "track":
          return step.track.concepts.some((candidate) => candidate.slug === concept.slug);
        case "surface":
          return (
            step.surfaceKind === "topic" &&
            step.relatedConcepts.some((candidate) => candidate.slug === concept.slug)
          );
        default:
          return false;
      }
    })
    .map((step) => step.id);

  const stepIds = Array.from(new Set(focusedStepIds));

  if (stepIds.length < 2 || stepIds.length >= collection.steps.length) {
    return null;
  }

  const defaultDraft = getDefaultGuidedCollectionConceptBundleDraft(collection);
  const launchStepId =
    collection.steps.find((step) => {
      return (
        (step.kind === "concept" || step.kind === "challenge") &&
        step.concept.slug === concept.slug &&
        stepIds.includes(step.id)
      );
    })?.id ??
    defaultDraft.launchStepId ??
    stepIds[0] ??
    null;

  return resolveGuidedCollectionConceptBundle(collection, {
    id: `review-bundle-${collection.slug}-${concept.slug}`,
    title: `${concept.title} focus bundle`,
    summary: `Keep ${collection.title} focused on the steps that reset ${concept.title} without reopening every collection step.`,
    stepIds,
    launchStepId,
  });
}

function buildGuidedCollectionBundleSuggestion(
  snapshot: ProgressSnapshot,
  context: ReviewRemediationContext,
  guidedCollections: GuidedCollectionSummary[],
  locale?: AppLocale,
) {
  const chosen = selectGuidedCollectionCandidate(snapshot, context, guidedCollections);

  if (!chosen) {
    return null;
  }

  const bundle = buildGuidedCollectionBundle(chosen.collection, context.concept);

  if (!bundle) {
    return null;
  }

  const note =
    chosen.progress.status === "completed"
      ? `${chosen.collection.title} is already complete in saved progress, but this concept bundle keeps the recovery path around ${context.concept.title} smaller and more explicit than reopening the full collection.`
      : chosen.progress.status === "in-progress"
        ? `${chosen.collection.title} already has progress saved, but this concept bundle trims the reopen path down to the steps around ${context.concept.title} instead of sending you back through the whole collection.`
      : `${chosen.collection.title} already contains a compact path around ${context.concept.title}. This bundle keeps the reset bounded to the steps that matter right now.`;

  return {
    id: `guided-collection-bundle-${context.concept.slug}-${chosen.collection.slug}`,
    kind: "guided-collection-bundle",
    title: `Open ${context.concept.title} focus bundle`,
    note,
    action: {
      href: buildGuidedCollectionBundleHref(bundle, undefined, locale),
      label: "Open focus bundle",
      kind: "guided-collection-bundle",
      note,
    },
  } satisfies ReviewRemediationSuggestion;
}

function getSuggestionOrder(reasonKind: ReviewQueueReasonKind) {
  switch (reasonKind) {
    case "diagnostic":
      return [
        "track-recap",
        "guided-collection-bundle",
        "prerequisite-concept",
        "guided-collection",
        "prerequisite-track",
      ] as const;
    case "checkpoint":
      return [
        "track-recap",
        "guided-collection-bundle",
        "guided-collection",
        "prerequisite-concept",
        "prerequisite-track",
      ] as const;
    case "missed-checks":
    case "confidence":
      return [
        "prerequisite-concept",
        "guided-collection-bundle",
        "track-recap",
        "guided-collection",
        "prerequisite-track",
      ] as const;
    case "challenge":
      return [
        "track-recap",
        "guided-collection-bundle",
        "prerequisite-concept",
        "guided-collection",
        "prerequisite-track",
      ] as const;
    case "unfinished":
      return [
        "track-recap",
        "guided-collection-bundle",
        "guided-collection",
        "prerequisite-concept",
        "prerequisite-track",
      ] as const;
    default:
      return [
        "track-recap",
        "guided-collection",
        "prerequisite-concept",
        "prerequisite-track",
      ] as const;
  }
}

function shouldOfferSavedCompareSetupRecovery(reasonKind: ReviewQueueReasonKind) {
  return reasonKind !== "stale";
}

function buildSavedCompareSetupSuggestion(
  context: Pick<
    ReviewRemediationContext,
    "concept" | "reasonKind" | "primaryAction" | "secondaryAction"
  >,
  recoveryActions: SavedCompareSetupRecoveryAction[],
) {
  const chosen = recoveryActions[0];

  if (!chosen || !shouldOfferSavedCompareSetupRecovery(context.reasonKind)) {
    return null;
  }

  const setupPair = `${chosen.setupALabel} vs ${chosen.setupBLabel}`;
  const note =
    context.reasonKind === "missed-checks"
      ? `${setupPair} is already saved for ${context.concept.title}. Reopen that compare bench to test the missed quick-test idea without rebuilding it by hand.`
      : context.reasonKind === "confidence"
        ? `${setupPair} is already saved for ${context.concept.title}. Reopen that compare bench when the concept needs one cleaner contrast before the next stronger check.`
        : context.reasonKind === "diagnostic"
          ? `${setupPair} is already saved for ${context.concept.title}. Reopen that compare bench before you retry the entry bridge so both cases stay visible.`
          : context.reasonKind === "checkpoint"
            ? `${setupPair} is already saved for ${context.concept.title}. Reopen that compare bench before you retry the checkpoint handoff.`
            : context.reasonKind === "challenge"
              ? `${setupPair} is already saved for ${context.concept.title}. Reopen that compare bench before you retry the current challenge cue.`
              : `${setupPair} is already saved for ${context.concept.title}. Reopen that compare bench instead of rebuilding the lab state from scratch.`;

  return {
    id: `saved-compare-setup-${context.concept.slug}-${chosen.id}`,
    kind: "saved-compare-setup",
    title: `Reopen ${chosen.name}`,
    note,
    action: {
      href: chosen.href,
      label: "Open saved setup",
      kind: "saved-compare-setup",
      note,
    },
  } satisfies ReviewRemediationSuggestion;
}

function getSavedCompareInsertionIndex(
  currentSuggestions: ReviewRemediationSuggestion[],
  reasonKind: ReviewQueueReasonKind,
) {
  const anchorKind =
    reasonKind === "missed-checks" || reasonKind === "confidence"
      ? "prerequisite-concept"
      : reasonKind === "diagnostic" ||
          reasonKind === "checkpoint" ||
          reasonKind === "challenge" ||
          reasonKind === "unfinished"
        ? "track-recap"
        : null;

  if (!anchorKind) {
    return 0;
  }

  const anchorIndex = currentSuggestions.findIndex((suggestion) => suggestion.kind === anchorKind);

  return anchorIndex >= 0 ? anchorIndex + 1 : 0;
}

export function mergeSavedCompareSetupRemediationSuggestions(
  currentSuggestions: ReviewRemediationSuggestion[],
  context: Pick<
    ReviewRemediationContext,
    "concept" | "reasonKind" | "primaryAction" | "secondaryAction"
  >,
  recoveryActions: SavedCompareSetupRecoveryAction[],
  limit = 2,
) {
  const nextSuggestions = currentSuggestions
    .filter((suggestion) => suggestion.kind !== "saved-compare-setup")
    .slice(0, Math.max(0, limit));
  const savedCompareSuggestion = buildSavedCompareSetupSuggestion(context, recoveryActions);

  if (!savedCompareSuggestion) {
    return nextSuggestions;
  }

  const seenActions = new Set(
    [context.primaryAction, context.secondaryAction, ...nextSuggestions.map((suggestion) => suggestion.action)]
      .filter((action): action is ReviewRemediationAction => Boolean(action))
      .map((action) => actionKey(action)),
  );

  if (seenActions.has(actionKey(savedCompareSuggestion.action))) {
    return nextSuggestions;
  }

  const insertionIndex = getSavedCompareInsertionIndex(nextSuggestions, context.reasonKind);
  const mergedSuggestions = [...nextSuggestions];
  mergedSuggestions.splice(insertionIndex, 0, savedCompareSuggestion);

  return mergedSuggestions.slice(0, Math.max(0, limit));
}

export function buildReviewRemediationSuggestions(
  snapshot: ProgressSnapshot,
  context: ReviewRemediationContext,
  options: ReviewRemediationOptions,
) {
  const seenActions = new Set(
    [context.primaryAction, context.secondaryAction]
      .filter((action): action is ReviewRemediationAction => Boolean(action))
      .map((action) => actionKey(action)),
  );
  const allConcepts = options.allConcepts ?? [];
  const guidedCollections = options.guidedCollections ?? [];
  const suggestions: ReviewRemediationSuggestion[] = [];

  const builders = {
    "prerequisite-concept": () =>
      buildPrerequisiteConceptSuggestion(snapshot, context, allConcepts, options.locale),
    "prerequisite-track": () =>
      buildPrerequisiteTrackSuggestion(
        snapshot,
        context,
        options.starterTracks,
        options.locale,
      ),
    "track-recap": () =>
      buildTrackRecapSuggestion(snapshot, context, options.starterTracks, options.locale),
    "guided-collection-bundle": () =>
      buildGuidedCollectionBundleSuggestion(
        snapshot,
        context,
        guidedCollections,
        options.locale,
      ),
    "guided-collection": () =>
      buildGuidedCollectionSuggestion(snapshot, context, guidedCollections, options.locale),
  } as const;

  for (const key of getSuggestionOrder(context.reasonKind)) {
    const suggestion = builders[key]();

    if (!suggestion) {
      continue;
    }

    const keyForAction = actionKey(suggestion.action);

    if (seenActions.has(keyForAction)) {
      continue;
    }

    seenActions.add(keyForAction);
    suggestions.push(suggestion);

    if (suggestions.length >= Math.max(0, options.limit ?? 2)) {
      break;
    }
  }

  return suggestions;
}
