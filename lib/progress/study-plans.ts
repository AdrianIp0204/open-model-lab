import type {
  ResolvedSavedStudyPlan,
  ResolvedSavedStudyPlanConceptEntry,
  ResolvedSavedStudyPlanEntry,
  ResolvedSavedStudyPlanGoalPathEntry,
  ResolvedSavedStudyPlanGuidedCollectionEntry,
  ResolvedSavedStudyPlanTrackEntry,
} from "@/lib/account/study-plans";
import type { AppLocale } from "@/i18n/routing";
import { localizeShareHref } from "@/lib/share-links";
import {
  buildRecommendedGoalPathProgressSummary,
  type RecommendedGoalPathProgressSummary,
} from "./recommended-goal-paths";
import {
  getGuidedCollectionProgressSummary,
  type GuidedCollectionProgressSummary,
} from "./guided-collections";
import {
  getStarterTrackPrimaryAction,
  getStarterTrackProgressSummary,
  type StarterTrackProgressSummary,
} from "./tracks";
import {
  getConceptProgressSummary,
  type ConceptProgressSummary,
  type ProgressSnapshot,
} from "./model";

export type SavedStudyPlanProgressStatus = "not-started" | "in-progress" | "completed";

export type SavedStudyPlanAction = {
  href: string;
  label: string;
};

export type SavedStudyPlanEntryProgress = {
  entry: ResolvedSavedStudyPlanEntry;
  status: SavedStudyPlanProgressStatus;
  note: string;
  primaryAction: SavedStudyPlanAction;
  secondaryAction: SavedStudyPlanAction | null;
  lastActivityAt: string | null;
  completedConceptCount: number;
  totalConceptCount: number;
  conceptProgress: ConceptProgressSummary | null;
  trackProgress: StarterTrackProgressSummary | null;
  collectionProgress: GuidedCollectionProgressSummary | null;
  goalPathProgress: RecommendedGoalPathProgressSummary | null;
};

export type SavedStudyPlanProgressSummary = {
  plan: ResolvedSavedStudyPlan;
  status: SavedStudyPlanProgressStatus;
  entryProgress: SavedStudyPlanEntryProgress[];
  nextEntry: SavedStudyPlanEntryProgress | null;
  completedEntryCount: number;
  startedEntryCount: number;
  totalEntries: number;
  completedConceptCount: number;
  totalConceptCount: number;
  lastActivityAt: string | null;
  primaryAction: SavedStudyPlanAction;
  primaryActionNote: string;
};

function getLatestTimestamp(values: Array<string | null>) {
  const timestamps = values.filter((value): value is string => Boolean(value));

  if (!timestamps.length) {
    return null;
  }

  return timestamps.reduce((latest, value) => (value > latest ? value : latest), timestamps[0]);
}

function toProgressStatus(
  value: "not-started" | "started" | "practiced" | "completed",
): SavedStudyPlanProgressStatus {
  if (value === "completed") {
    return "completed";
  }

  if (value === "not-started") {
    return "not-started";
  }

  return "in-progress";
}

function buildConceptEntryProgress(
  snapshot: ProgressSnapshot,
  entry: ResolvedSavedStudyPlanConceptEntry,
  locale: AppLocale,
): SavedStudyPlanEntryProgress {
  const conceptProgress = getConceptProgressSummary(snapshot, entry.concept);
  const status = toProgressStatus(conceptProgress.status);

  return {
    entry,
    status,
    note:
      conceptProgress.status === "not-started"
        ? `No saved progress yet for ${entry.concept.title}.`
        : conceptProgress.mastery.note,
    primaryAction: {
      href: localizeShareHref(entry.href, locale),
      label:
        status === "completed"
          ? "Review concept"
          : status === "in-progress"
            ? "Continue concept"
            : "Start concept",
    },
    secondaryAction: null,
    lastActivityAt: conceptProgress.lastActivityAt,
    completedConceptCount: conceptProgress.status === "completed" ? 1 : 0,
    totalConceptCount: 1,
    conceptProgress,
    trackProgress: null,
    collectionProgress: null,
    goalPathProgress: null,
  };
}

function buildTrackEntryProgress(
  snapshot: ProgressSnapshot,
  entry: ResolvedSavedStudyPlanTrackEntry,
  locale: AppLocale,
): SavedStudyPlanEntryProgress {
  const trackProgress = getStarterTrackProgressSummary(snapshot, entry.track, locale);
  const trackPrimaryAction = getStarterTrackPrimaryAction(entry.track, trackProgress, locale);
  const status: SavedStudyPlanProgressStatus =
    trackProgress.status === "completed"
      ? "completed"
      : trackProgress.status === "in-progress"
        ? "in-progress"
        : "not-started";

  return {
    entry,
    status,
    note:
      status === "completed"
        ? entry.track.checkpoints.length
          ? "All concepts and checkpoints in this track are already complete."
          : "All concepts in this track are already complete."
        : trackPrimaryAction.note,
    primaryAction:
      status === "completed"
        ? {
            href: localizeShareHref(`/tracks/${entry.track.slug}/complete`, locale),
            label: "Open completion page",
          }
        : {
            href: trackPrimaryAction.href,
            label: trackPrimaryAction.label,
          },
    secondaryAction:
      trackPrimaryAction.href === localizeShareHref(entry.href, locale)
        ? null
        : {
            href: localizeShareHref(entry.href, locale),
            label: "Open track page",
          },
    lastActivityAt: trackProgress.lastActivityAt,
    completedConceptCount: trackProgress.completedCount,
    totalConceptCount: trackProgress.totalConcepts,
    conceptProgress: null,
    trackProgress,
    collectionProgress: null,
    goalPathProgress: null,
  };
}

function buildGuidedCollectionEntryProgress(
  snapshot: ProgressSnapshot,
  entry: ResolvedSavedStudyPlanGuidedCollectionEntry,
  locale: AppLocale,
): SavedStudyPlanEntryProgress {
  const collectionProgress = getGuidedCollectionProgressSummary(snapshot, entry.collection, locale);
  const nextAction = collectionProgress.nextStep?.primaryAction ?? {
    href: localizeShareHref(entry.href, locale),
    label: "Open collection",
  };

  return {
    entry,
    status: collectionProgress.status,
    note:
      collectionProgress.status === "completed"
        ? `All ${collectionProgress.totalSteps} steps in ${entry.collection.title} are already complete.`
        : collectionProgress.nextStep
          ? `${collectionProgress.nextStep.step.title} is the next guided collection step.`
          : entry.summary,
    primaryAction:
      collectionProgress.status === "completed"
        ? {
            href: localizeShareHref(entry.collection.path, locale),
            label: "Review collection",
          }
        : {
            href: nextAction.href,
            label: nextAction.label,
          },
    secondaryAction: null,
    lastActivityAt: collectionProgress.lastActivityAt,
    completedConceptCount: collectionProgress.completedConceptCount,
    totalConceptCount: collectionProgress.totalConcepts,
    conceptProgress: null,
    trackProgress: null,
    collectionProgress,
    goalPathProgress: null,
  };
}

function buildGoalPathEntryProgress(
  snapshot: ProgressSnapshot,
  entry: ResolvedSavedStudyPlanGoalPathEntry,
  locale: AppLocale,
): SavedStudyPlanEntryProgress {
  const goalPathProgress = buildRecommendedGoalPathProgressSummary(snapshot, entry.goalPath, locale);

  return {
    entry,
    status: goalPathProgress.status,
    note: goalPathProgress.primaryActionNote,
    primaryAction: goalPathProgress.primaryAction,
    secondaryAction: goalPathProgress.bundleAction,
    lastActivityAt: goalPathProgress.lastActivityAt,
    completedConceptCount: entry.goalPath.concepts.filter(
      (concept) => getConceptProgressSummary(snapshot, concept).status === "completed",
    ).length,
    totalConceptCount: goalPathProgress.goalPath.conceptCount,
    conceptProgress: null,
    trackProgress: null,
    collectionProgress: null,
    goalPathProgress,
  };
}

function buildEntryProgress(
  snapshot: ProgressSnapshot,
  entry: ResolvedSavedStudyPlanEntry,
  locale: AppLocale,
): SavedStudyPlanEntryProgress {
  switch (entry.kind) {
    case "concept":
      return buildConceptEntryProgress(snapshot, entry, locale);
    case "track":
      return buildTrackEntryProgress(snapshot, entry, locale);
    case "guided-collection":
      return buildGuidedCollectionEntryProgress(snapshot, entry, locale);
    case "goal-path":
      return buildGoalPathEntryProgress(snapshot, entry, locale);
    default:
      throw new Error(
        `Unsupported saved study plan entry kind: ${(entry as { kind: string }).kind}`,
      );
  }
}

export function buildSavedStudyPlanProgressSummary(
  snapshot: ProgressSnapshot,
  plan: ResolvedSavedStudyPlan,
  locale: AppLocale = "en",
): SavedStudyPlanProgressSummary {
  const entryProgress = plan.entries.map((entry) => buildEntryProgress(snapshot, entry, locale));
  const completedEntryCount = entryProgress.filter((entry) => entry.status === "completed").length;
  const startedEntryCount = entryProgress.filter((entry) => entry.status !== "not-started").length;
  const totalEntries = entryProgress.length;
  const status: SavedStudyPlanProgressStatus =
    completedEntryCount === totalEntries
      ? "completed"
      : startedEntryCount > 0
        ? "in-progress"
        : "not-started";
  const nextEntry =
    status === "completed"
      ? entryProgress[0] ?? null
      : entryProgress.find((entry) => entry.status !== "completed") ?? entryProgress[0] ?? null;

  return {
    plan,
    status,
    entryProgress,
    nextEntry,
    completedEntryCount,
    startedEntryCount,
    totalEntries,
    completedConceptCount: plan.concepts.filter((concept) =>
      getConceptProgressSummary(snapshot, concept).status === "completed",
    ).length,
    totalConceptCount: plan.conceptCount,
    lastActivityAt: getLatestTimestamp(entryProgress.map((entry) => entry.lastActivityAt)),
    primaryAction:
      nextEntry?.primaryAction ?? {
        href: localizeShareHref("/account/study-plans", locale),
        label: "Open study plans",
      },
    primaryActionNote:
      nextEntry?.note ?? "This study plan does not have an actionable entry right now.",
  };
}
