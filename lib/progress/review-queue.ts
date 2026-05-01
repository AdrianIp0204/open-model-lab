import type { ConceptSummary, GuidedCollectionSummary, StarterTrackSummary } from "@/lib/content";
import type { AppLocale } from "@/i18n/routing";
import { buildStarterTrackEntryDiagnostic } from "./entry-diagnostics";
import {
  buildChallengeEntryHref,
  buildRelativeShareUrl,
  buildTrackRecapHref,
  conceptShareAnchorIds,
  localizeShareHref,
} from "@/lib/share-links";
import {
  buildReviewRemediationSuggestions,
  type ReviewRemediationConcept,
  type ReviewRemediationSuggestion,
} from "./remediation";
import {
  getChallengeProgressState,
  getCompletedChallengeCount,
  getConceptProgressLastActivityAt,
  getConceptProgressRecord,
  getConceptProgressSummary,
  selectContinueLearning,
  selectReviewQueue,
  type ConceptProgressSummary,
  type ProgressSnapshot,
  type ReviewQueueItem,
} from "./model";
import {
  getStarterTrackStatusPriority,
  getStarterTrackProgressSummary,
  getStarterTrackRecapSummary,
  type StarterTrackProgressSummary,
  type StarterTrackRecapFocusKind,
} from "./tracks";

export type ReviewQueueActionKind =
  | "concept"
  | "quick-test"
  | "challenge"
  | "worked-examples"
  | "track-recap"
  | "checkpoint";

export type ReviewQueueAction = {
  href: string;
  label: string;
  kind: ReviewQueueActionKind;
  note: string | null;
};

export type ReviewQueueTrackContext = {
  trackSlug: string;
  trackTitle: string;
  focusKind: StarterTrackRecapFocusKind | "checkpoint";
  focusLabel: string;
  note: string;
  action: ReviewQueueAction;
  isPrimary: boolean;
};

type ReviewQueueCandidate = Omit<ReviewQueueItem, "supportReasons"> & {
  supportReasons: string[];
  explicitPrimaryAction?: ReviewQueueAction | null;
  explicitSecondaryAction?: ReviewQueueAction | null;
};

export type AdaptiveReviewQueueItem = Omit<ReviewQueueCandidate, "explicitPrimaryAction" | "explicitSecondaryAction"> & {
  primaryAction: ReviewQueueAction;
  secondaryAction: ReviewQueueAction | null;
  trackContext: ReviewQueueTrackContext | null;
  remediationSuggestions: ReviewRemediationSuggestion[];
};

type TrackContextCandidate = ReviewQueueTrackContext & {
  priorityBoost: number;
  hasIncompleteEarlierStep: boolean;
  stepIndex: number;
  trackSequence: number;
  progress: Pick<
    StarterTrackProgressSummary,
    | "status"
    | "lastActivityAt"
    | "completedCount"
    | "startedCount"
    | "completedFlowCount"
    | "totalFlowCount"
  >;
};

function buildConceptHref(slug: string, hash?: string, locale?: AppLocale) {
  return localizeShareHref(
    buildRelativeShareUrl(`/concepts/${slug}`, {
      hash,
    }),
    locale,
  );
}

function getElapsedDays(value: string | null, now: Date) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return null;
  }

  const diff = now.getTime() - timestamp;

  if (diff <= 0) {
    return 0;
  }

  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatDayCountLabel(staleDays: number) {
  return `${staleDays} day${staleDays === 1 ? "" : "s"}`;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return values.filter((value, index, allValues): value is string => {
    return Boolean(value) && allValues.indexOf(value) === index;
  });
}

function joinConceptLabels(concepts: Array<Pick<ConceptSummary, "shortTitle" | "title">>) {
  const labels = concepts.map((concept) => concept.shortTitle ?? concept.title);

  if (labels.length <= 1) {
    return labels[0] ?? "";
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

function buildDefaultConceptAction(
  progress: ConceptProgressSummary,
  locale?: AppLocale,
): ReviewQueueAction {
  const href = buildConceptHref(progress.concept.slug, undefined, locale);

  if (progress.status === "completed") {
    return {
      href,
      label: "Review concept",
      kind: "concept",
      note: progress.mastery.note,
    };
  }

  if (progress.status === "started" || progress.status === "practiced") {
    return {
      href,
      label: "Resume concept",
      kind: "concept",
      note: progress.mastery.note,
    };
  }

  return {
    href,
    label: "Open concept",
    kind: "concept",
    note: progress.mastery.note,
  };
}

function buildQuickTestAction(
  progress: ConceptProgressSummary,
  label = "Retry quick test",
  locale?: AppLocale,
) {
  return {
    href: buildConceptHref(progress.concept.slug, conceptShareAnchorIds.quickTest, locale),
    label,
    kind: "quick-test",
    note: progress.record?.quickTestLastIncorrectCount
      ? `Jump back into the quick test where ${progress.record.quickTestLastIncorrectCount} question${
          progress.record.quickTestLastIncorrectCount === 1 ? "" : "s"
        } were last missed.`
      : progress.mastery.note,
  } satisfies ReviewQueueAction;
}

function getMostRecentStartedChallengeId(progress: ConceptProgressSummary) {
  const completedChallengeSet = new Set(Object.keys(progress.record?.completedChallenges ?? {}));

  return Object.entries(progress.record?.startedChallenges ?? {})
    .filter(([challengeId]) => !completedChallengeSet.has(challengeId))
    .sort((left, right) => right[1].localeCompare(left[1]))[0]?.[0] ?? null;
}

function buildChallengeAction(
  progress: ConceptProgressSummary,
  label = "Continue challenge",
  locale?: AppLocale,
) {
  const startedChallengeId = getMostRecentStartedChallengeId(progress);

  return {
    href: startedChallengeId
      ? buildChallengeEntryHref(progress.concept.slug, startedChallengeId, locale)
      : buildConceptHref(progress.concept.slug, conceptShareAnchorIds.challengeMode, locale),
    label,
    kind: "challenge",
    note: startedChallengeId
      ? "Jump back into the saved challenge run that still does not have a solve."
      : "Reopen challenge mode for the unfinished checks on this concept.",
  } satisfies ReviewQueueAction;
}

function buildWorkedExamplesAction(progress: ConceptProgressSummary, locale?: AppLocale) {
  return {
    href: buildConceptHref(progress.concept.slug, conceptShareAnchorIds.workedExamples, locale),
    label: "Replay worked example",
    kind: "worked-examples",
    note: "Use the worked example again before you retry the stronger checks.",
  } satisfies ReviewQueueAction;
}

function getTrackContextPriorityBoost(candidate: {
  focusKind: ReviewQueueTrackContext["focusKind"];
  isPrimary: boolean;
}) {
  const base =
    candidate.focusKind === "checkpoint"
      ? 16
      : candidate.focusKind === "priority"
        ? 10
        : candidate.focusKind === "next"
          ? 7
          : candidate.focusKind === "active"
            ? 5
            : candidate.focusKind === "solid"
              ? 2
              : 1;

  return candidate.isPrimary ? base + 4 : base;
}

function getTrackRecapContextMap(
  snapshot: ProgressSnapshot,
  starterTracks: StarterTrackSummary[],
  locale?: AppLocale,
) {
  const contexts = new Map<string, TrackContextCandidate[]>();

  for (const track of starterTracks) {
    const progress = getStarterTrackProgressSummary(snapshot, track, locale);
    const recap = getStarterTrackRecapSummary(track, progress, locale);

      for (const [stepIndex, step] of recap.steps.entries()) {
        const hasIncompleteEarlierStep = progress.conceptProgress
          .slice(0, stepIndex)
          .some((item) => item.status !== "completed");
        const readyCheckpoint =
          progress.checkpointProgress.find(
            (item) =>
              item.checkpoint.afterConcept.slug === step.concept.slug &&
            item.status === "ready",
        ) ?? null;
      const isPrimary = recap.primaryStep?.concept.slug === step.concept.slug;
      const trackContext = readyCheckpoint
        ? {
            trackSlug: track.slug,
            trackTitle: track.title,
            focusKind: "checkpoint" as const,
            focusLabel: "Checkpoint ready",
            note: readyCheckpoint.note,
            action: {
              href: readyCheckpoint.action.href,
              label: readyCheckpoint.action.label,
              kind: "checkpoint" as const,
              note: readyCheckpoint.note,
            },
            isPrimary,
          }
        : {
            trackSlug: track.slug,
            trackTitle: track.title,
            focusKind: step.focusKind,
            focusLabel: step.focusLabel,
            note:
              isPrimary || step.focusKind === "priority"
                ? `${track.title} recap keeps ${step.concept.title} as a high-priority revisit step.`
                : step.focusKind === "next"
                  ? `${step.concept.title} is still the next guided concept in ${track.title}.`
                  : `Open ${track.title} recap when you want this review concept back in the authored order.`,
            action: {
              href: buildTrackRecapHref(track.slug, locale),
              label: isPrimary || step.focusKind === "priority" ? "Open track recap" : "Open recap",
              kind: "track-recap" as const,
              note:
                isPrimary || step.focusKind === "priority"
                  ? `${track.title} recap already flags this concept for review.`
                  : `Use ${track.title} recap for the bounded review order around this concept.`,
            },
            isPrimary,
          };

        const candidate = {
          ...trackContext,
          priorityBoost: getTrackContextPriorityBoost(trackContext),
          hasIncompleteEarlierStep,
          stepIndex,
          trackSequence: track.sequence ?? Number.MAX_SAFE_INTEGER,
          progress: {
            status: progress.status,
            lastActivityAt: progress.lastActivityAt,
            completedCount: progress.completedCount,
          startedCount: progress.startedCount,
          completedFlowCount: progress.completedFlowCount,
          totalFlowCount: progress.totalFlowCount,
        },
      } satisfies TrackContextCandidate;
      const currentCandidates = contexts.get(step.concept.slug) ?? [];
      currentCandidates.push(candidate);
      contexts.set(step.concept.slug, currentCandidates);
    }
  }

  return new Map(
    [...contexts.entries()].map(([conceptSlug, items]) => [
      conceptSlug,
      [...items].sort((left, right) => {
        if (left.priorityBoost !== right.priorityBoost) {
          return right.priorityBoost - left.priorityBoost;
        }

        if (left.hasIncompleteEarlierStep !== right.hasIncompleteEarlierStep) {
          return left.hasIncompleteEarlierStep ? 1 : -1;
        }

        const statusDelta =
          getStarterTrackStatusPriority(right.progress.status) -
          getStarterTrackStatusPriority(left.progress.status);

        if (statusDelta !== 0) {
          return statusDelta;
        }

        const leftActivity = left.progress.lastActivityAt ?? "";
        const rightActivity = right.progress.lastActivityAt ?? "";

        if (leftActivity !== rightActivity) {
          return rightActivity.localeCompare(leftActivity);
        }

        const leftCoverage =
          left.progress.totalFlowCount > 0
            ? left.progress.completedFlowCount / left.progress.totalFlowCount
            : 0;
        const rightCoverage =
          right.progress.totalFlowCount > 0
            ? right.progress.completedFlowCount / right.progress.totalFlowCount
            : 0;

        if (leftCoverage !== rightCoverage) {
          return rightCoverage - leftCoverage;
        }

        if (left.progress.completedFlowCount !== right.progress.completedFlowCount) {
          return right.progress.completedFlowCount - left.progress.completedFlowCount;
        }

        if (left.progress.startedCount !== right.progress.startedCount) {
          return right.progress.startedCount - left.progress.startedCount;
        }

        if (left.progress.totalFlowCount !== right.progress.totalFlowCount) {
          return left.progress.totalFlowCount - right.progress.totalFlowCount;
        }

        if (left.stepIndex !== right.stepIndex) {
          return right.stepIndex - left.stepIndex;
        }

        if (left.trackSequence !== right.trackSequence) {
          return left.trackSequence - right.trackSequence;
        }

        return left.trackTitle.localeCompare(right.trackTitle);
      })[0] ?? null,
    ]),
  );
}

function getActionFallbackKind(href: string): ReviewQueueActionKind {
  return href.includes("/tracks/") ? "track-recap" : "concept";
}

function buildReviewAction(
  href: string,
  label: string,
  note: string | null,
  kind: ReviewQueueActionKind,
) {
  return {
    href,
    label,
    note,
    kind,
  } satisfies ReviewQueueAction;
}

function areSameAction(left: ReviewQueueAction | null, right: ReviewQueueAction | null) {
  if (!left || !right) {
    return false;
  }

  return left.href === right.href && left.label === right.label && left.kind === right.kind;
}

function mergeCandidates(left: ReviewQueueCandidate, right: ReviewQueueCandidate) {
  const winner = right.priority > left.priority ? right : left;
  const loser = winner === right ? left : right;
  const explicitPrimaryAction = winner.explicitPrimaryAction ?? null;
  const explicitSecondaryAction =
    [
      winner.explicitSecondaryAction ?? null,
      loser.explicitPrimaryAction ?? null,
      loser.explicitSecondaryAction ?? null,
    ].find((candidate) => !areSameAction(candidate, explicitPrimaryAction)) ?? null;

  return {
    ...winner,
    staleDays: winner.staleDays ?? loser.staleDays,
    supportReasons: uniqueStrings([
      ...winner.supportReasons,
      loser.reason !== winner.reason ? loser.reason : null,
      ...loser.supportReasons,
    ]),
    explicitPrimaryAction,
    explicitSecondaryAction,
  } satisfies ReviewQueueCandidate;
}

function addCandidate(
  candidateMap: Map<string, ReviewQueueCandidate>,
  candidate: ReviewQueueCandidate | null,
) {
  if (!candidate) {
    return;
  }

  const existing = candidateMap.get(candidate.concept.slug);

  if (!existing) {
    candidateMap.set(candidate.concept.slug, candidate);
    return;
  }

  candidateMap.set(candidate.concept.slug, mergeCandidates(existing, candidate));
}

function getCheckpointRecoveryCandidates(
  snapshot: ProgressSnapshot,
  conceptsBySlug: Map<string, Pick<ConceptSummary, "id" | "slug" | "title">>,
  starterTracks: StarterTrackSummary[],
  continueSlug: string | null,
  now: Date,
  locale?: AppLocale,
) {
  const candidates = new Map<string, ReviewQueueCandidate>();

  for (const track of starterTracks) {
    const progress = getStarterTrackProgressSummary(snapshot, track, locale);

    for (const checkpointProgress of progress.checkpointProgress) {
      if (checkpointProgress.status === "completed") {
        continue;
      }

      const checkpointConcept = conceptsBySlug.get(checkpointProgress.checkpoint.challenge.concept.slug);

      if (!checkpointConcept || checkpointConcept.slug === continueSlug) {
        continue;
      }

      const checkpointConceptProgress = getConceptProgressSummary(snapshot, checkpointConcept);
      const challengeRecord = getConceptProgressRecord(
        snapshot,
        checkpointProgress.checkpoint.challenge.concept,
      );
      const challengeState = getChallengeProgressState(
        challengeRecord,
        checkpointProgress.checkpoint.challenge.challengeId,
      );
      const afterConceptProgress = progress.conceptProgress[checkpointProgress.checkpoint.stepIndex] ?? null;
      const laterConcept = track.concepts
        .slice(checkpointProgress.checkpoint.stepIndex + 1)
        .find((concept, index) => {
          return progress.conceptProgress[checkpointProgress.checkpoint.stepIndex + 1 + index]?.status !== "not-started";
        }) ?? null;
      const anchorAt =
        challengeRecord?.startedChallenges?.[checkpointProgress.checkpoint.challenge.challengeId] ??
        getConceptProgressLastActivityAt(afterConceptProgress?.record) ??
        getConceptProgressLastActivityAt(checkpointConceptProgress.record);
      const staleDays = getElapsedDays(anchorAt, now);

      if (challengeState === "started") {
        addCandidate(candidates, {
          concept: checkpointConcept,
          progress: checkpointConceptProgress,
          reasonKind: "checkpoint",
          reason: `${checkpointProgress.checkpoint.title} is already started but still needs a clean finish.`,
          actionLabel: `Resume ${checkpointProgress.checkpoint.title}`,
          staleDays,
          priority: 136 + Math.min(staleDays ?? 0, 10),
          supportReasons: uniqueStrings([
            checkpointProgress.note,
            `This checkpoint is meant to tie together ${joinConceptLabels(checkpointProgress.checkpoint.concepts)}.`,
            "The checkpoint challenge already has a saved start without a solve.",
          ]),
          explicitPrimaryAction: buildReviewAction(
            checkpointProgress.action.href,
            `Resume ${checkpointProgress.checkpoint.title}`,
            checkpointProgress.note,
            "checkpoint",
          ),
        });
        continue;
      }

      if (checkpointProgress.status === "ready" && laterConcept) {
        addCandidate(candidates, {
          concept: checkpointConcept,
          progress: checkpointConceptProgress,
          reasonKind: "checkpoint",
          reason: `${checkpointProgress.checkpoint.title} is still open even though later ${track.title} work has already started.`,
          actionLabel: checkpointProgress.action.label,
          staleDays,
          priority: 132 + Math.min(staleDays ?? 0, 12),
          supportReasons: uniqueStrings([
            checkpointProgress.note,
            `${laterConcept.title} already has saved progress later in the same track.`,
            `This checkpoint is meant to tie together ${joinConceptLabels(checkpointProgress.checkpoint.concepts)}.`,
          ]),
          explicitPrimaryAction: buildReviewAction(
            checkpointProgress.action.href,
            checkpointProgress.action.label,
            checkpointProgress.note,
            "checkpoint",
          ),
        });
        continue;
      }

      if (checkpointProgress.status === "ready" && (staleDays ?? 0) >= 5) {
        addCandidate(candidates, {
          concept: checkpointConcept,
          progress: checkpointConceptProgress,
          reasonKind: "checkpoint",
          reason: `${checkpointProgress.checkpoint.title} has been ready for ${formatDayCountLabel(staleDays ?? 0)} and is still the next track handoff.`,
          actionLabel: checkpointProgress.action.label,
          staleDays,
          priority: 118 + Math.min(staleDays ?? 0, 12),
          supportReasons: uniqueStrings([
            checkpointProgress.note,
            `This checkpoint is meant to tie together ${joinConceptLabels(checkpointProgress.checkpoint.concepts)}.`,
          ]),
          explicitPrimaryAction: buildReviewAction(
            checkpointProgress.action.href,
            checkpointProgress.action.label,
            checkpointProgress.note,
            "checkpoint",
          ),
        });
      }
    }
  }

  return candidates;
}

function getDiagnosticRecoveryCandidates(
  snapshot: ProgressSnapshot,
  conceptsBySlug: Map<string, Pick<ConceptSummary, "id" | "slug" | "title">>,
  starterTracks: StarterTrackSummary[],
  continueSlug: string | null,
  locale: AppLocale = "en",
) {
  const candidates = new Map<string, ReviewQueueCandidate>();
  const starterTracksBySlug = new Map(starterTracks.map((track) => [track.slug, track]));

  for (const track of starterTracks) {
    if (!track.entryDiagnostic) {
      continue;
    }

    const prerequisiteTracks = (track.prerequisiteTrackSlugs ?? [])
      .map((slug) => starterTracksBySlug.get(slug) ?? null)
      .filter((candidate): candidate is StarterTrackSummary => Boolean(candidate));
    const diagnostic = buildStarterTrackEntryDiagnostic(
      snapshot,
      track,
      prerequisiteTracks,
      locale,
    );

    if (!diagnostic) {
      continue;
    }

    for (const probe of diagnostic.probes) {
      if (probe.status !== "review" && probe.status !== "in-progress") {
        continue;
      }

      const concept = conceptsBySlug.get(probe.concept.slug);

      if (!concept || concept.slug === continueSlug) {
        continue;
      }

      const progress = getConceptProgressSummary(snapshot, concept);
      const isSolidCompleted =
        progress.status === "completed" && progress.mastery.state === "solid";

      if (probe.status === "review" && isSolidCompleted) {
        continue;
      }

      const isChallengeProbe = probe.kind === "challenge";
      const reason =
        probe.status === "review"
          ? isChallengeProbe
            ? `${track.title} entry diagnostic still needs ${probe.challengeTitle} before the opening bridge is honest.`
            : `${track.title} entry diagnostic still needs a cleaner quick-test pass in ${probe.concept.title}.`
          : isChallengeProbe
            ? `${track.title} entry diagnostic has an open checkpoint run in ${probe.concept.title}, but the bridge is not settled yet.`
            : `${track.title} entry diagnostic has progress in ${probe.concept.title}, but the quick-test bridge is not settled yet.`;
      const note = `${track.title} entry diagnostic: ${probe.note}`;

      addCandidate(candidates, {
        concept,
        progress,
        reasonKind: "diagnostic",
        reason,
        actionLabel: probe.primaryAction.label,
        staleDays: null,
        priority:
          (probe.status === "review" ? 126 : 116) +
          (isChallengeProbe ? 2 : 0),
        supportReasons: uniqueStrings([
          diagnostic.note,
          note,
          diagnostic.summary,
        ]),
        explicitPrimaryAction: buildReviewAction(
          probe.primaryAction.href,
          probe.primaryAction.label,
          note,
          isChallengeProbe ? "challenge" : "quick-test",
        ),
        explicitSecondaryAction:
          diagnostic.primaryAction.href !== probe.primaryAction.href
            ? buildReviewAction(
                diagnostic.primaryAction.href,
                diagnostic.primaryAction.label,
                diagnostic.note,
                getActionFallbackKind(diagnostic.primaryAction.href),
              )
            : null,
      });
    }
  }

  return candidates;
}

function buildPrimaryReviewAction(
  item: ReviewQueueCandidate,
  trackContext: TrackContextCandidate | null,
  locale?: AppLocale,
) {
  if (item.explicitPrimaryAction) {
    return item.explicitPrimaryAction;
  }

  const progress = item.progress;
  const completedChallengeCount = getCompletedChallengeCount(progress.record);
  const hasWorkedExampleOnly =
    Boolean(progress.record?.engagedWorkedExampleAt) &&
    !progress.record?.completedQuickTestAt &&
    completedChallengeCount === 0 &&
    !progress.record?.usedChallengeModeAt;

  if (item.reasonKind === "missed-checks") {
    return buildQuickTestAction(progress, item.actionLabel, locale);
  }

  if (item.reasonKind === "challenge") {
    return buildChallengeAction(progress, item.actionLabel, locale);
  }

  if (
    trackContext?.action.kind === "track-recap" &&
    trackContext.isPrimary &&
    item.reasonKind === "stale" &&
    progress.status === "completed"
  ) {
    return trackContext.action;
  }

  if (hasWorkedExampleOnly && item.reasonKind !== "stale") {
    return buildWorkedExamplesAction(progress, locale);
  }

  if (item.actionLabel === "Retry quick test") {
    return buildQuickTestAction(progress, item.actionLabel, locale);
  }

  if (item.actionLabel === "Retry challenge" || item.actionLabel === "Continue challenge") {
    return buildChallengeAction(progress, item.actionLabel, locale);
  }

  return buildDefaultConceptAction(progress, locale);
}

function buildSecondaryReviewAction(
  item: ReviewQueueCandidate,
  primaryAction: ReviewQueueAction,
  trackContext: TrackContextCandidate | null,
  locale?: AppLocale,
) {
  if (item.explicitSecondaryAction && !areSameAction(item.explicitSecondaryAction, primaryAction)) {
    return item.explicitSecondaryAction;
  }

  const fallbackConceptAction = buildDefaultConceptAction(item.progress, locale);
  const candidates = [
    primaryAction.kind === "concept" ? trackContext?.action ?? null : fallbackConceptAction,
    primaryAction.kind === "track-recap" || primaryAction.kind === "checkpoint"
      ? fallbackConceptAction
      : trackContext?.action ?? null,
  ].filter((candidate): candidate is ReviewQueueAction => Boolean(candidate));

  return candidates.find((candidate) => !areSameAction(candidate, primaryAction)) ?? null;
}

function sortAdaptiveReviewQueueItems(left: AdaptiveReviewQueueItem, right: AdaptiveReviewQueueItem) {
  if (left.priority !== right.priority) {
    return right.priority - left.priority;
  }

  const leftActivity = left.progress.lastActivityAt ?? "";
  const rightActivity = right.progress.lastActivityAt ?? "";

  if (leftActivity !== rightActivity) {
    return leftActivity.localeCompare(rightActivity);
  }

  return left.concept.title.localeCompare(right.concept.title);
}

export function selectAdaptiveReviewQueue(
  snapshot: ProgressSnapshot,
  concepts: Array<Pick<ConceptSummary, "id" | "slug" | "title">>,
  starterTracks: StarterTrackSummary[],
  limit = 3,
  options: {
    now?: Date;
    allConcepts?: ReviewRemediationConcept[];
    guidedCollections?: GuidedCollectionSummary[];
    locale?: AppLocale;
  } = {},
) {
  const now = options.now ?? new Date();
  const continueLearning = selectContinueLearning(snapshot, concepts, 1);
  const continueSlug = continueLearning.primary?.concept.slug ?? null;
  const conceptsBySlug = new Map(concepts.map((concept) => [concept.slug, concept] as const));
  const candidateMap = new Map<string, ReviewQueueCandidate>();
  const trackContextByConceptSlug = getTrackRecapContextMap(
    snapshot,
    starterTracks,
    options.locale,
  );
  const baseQueue = selectReviewQueue(snapshot, concepts, concepts.length, { now });
  const checkpointCandidates = getCheckpointRecoveryCandidates(
    snapshot,
    conceptsBySlug,
    starterTracks,
    continueSlug,
    now,
    options.locale,
  );
  const diagnosticCandidates = getDiagnosticRecoveryCandidates(
    snapshot,
    conceptsBySlug,
    starterTracks,
    continueSlug,
    options.locale,
  );

  for (const item of baseQueue) {
    addCandidate(candidateMap, {
      ...item,
      supportReasons: [...item.supportReasons],
    });
  }

  for (const candidate of checkpointCandidates.values()) {
    addCandidate(candidateMap, candidate);
  }

  for (const candidate of diagnosticCandidates.values()) {
    addCandidate(candidateMap, candidate);
  }

  return [...candidateMap.values()]
    .map((item) => {
      const trackContext = trackContextByConceptSlug.get(item.concept.slug) ?? null;
      const primaryAction = buildPrimaryReviewAction(item, trackContext, options.locale);
      const secondaryAction = buildSecondaryReviewAction(
        item,
        primaryAction,
        trackContext,
        options.locale,
      );
      const supportReasons = uniqueStrings([
        ...item.supportReasons,
        trackContext?.note ?? null,
      ]);
      const remediationSuggestions = buildReviewRemediationSuggestions(
        snapshot,
        {
          concept: {
            slug: item.concept.slug,
            title: item.concept.title ?? item.concept.slug,
          },
          progress: item.progress,
          reasonKind: item.reasonKind,
          primaryAction,
          secondaryAction,
          trackContext: trackContext
            ? {
                trackSlug: trackContext.trackSlug,
                trackTitle: trackContext.trackTitle,
                note: trackContext.note,
              }
            : null,
        },
        {
          allConcepts: options.allConcepts,
          starterTracks,
          guidedCollections: options.guidedCollections,
          locale: options.locale,
        },
      );

      return {
        concept: item.concept,
        progress: item.progress,
        reasonKind: item.reasonKind,
        reason: item.reason,
        actionLabel: item.actionLabel,
        staleDays: item.staleDays,
        priority: item.priority + (trackContext?.priorityBoost ?? 0),
        supportReasons,
        primaryAction,
        secondaryAction,
        trackContext,
        remediationSuggestions,
      } satisfies AdaptiveReviewQueueItem;
    })
    .sort(sortAdaptiveReviewQueueItems)
    .slice(0, Math.max(0, limit));
}
