import type { AppLocale } from "@/i18n/routing";
import type {
  ReviewQueueActionKind,
  ReviewQueueReasonKind,
  ReviewRemediationSuggestionKind,
  StarterTrackPrimaryAction,
  StarterTrackRecapFocusKind,
} from "@/lib/progress";

export type ProgressConceptActionStatus =
  | "not-started"
  | "started"
  | "practiced"
  | "completed";

export type ProgressCopyActionKey =
  | "actions.openConcept"
  | "actions.continueConcept"
  | "actions.reviewConcept"
  | "actions.retryQuickTest"
  | "actions.openChallenge"
  | "actions.replayWorkedExamples"
  | "actions.openTrackRecap"
  | "actions.openCheckpoint";

export type ProgressCopyTrackActionKey =
  | "trackActions.openTrack"
  | "trackActions.startTrack"
  | "trackActions.continueTrack"
  | "actions.openCheckpoint";

export type ProgressCopyReasonKey =
  | "reviewReasons.missedChecks"
  | "reviewReasons.challenge"
  | "reviewReasons.checkpoint"
  | "reviewReasons.diagnostic"
  | "reviewReasons.confidence"
  | "reviewReasons.unfinished"
  | "reviewReasons.stale";

export type ProgressCopyFocusLabelKey =
  | "focusLabels.priority"
  | "focusLabels.next"
  | "focusLabels.active"
  | "focusLabels.solid"
  | "focusLabels.ahead"
  | "focusLabels.checkpoint";

export type ProgressRemediationKindLabelKey =
  | "kindLabels.prerequisiteConcept"
  | "kindLabels.prerequisiteTrack"
  | "kindLabels.trackRecap"
  | "kindLabels.guidedCollectionBundle"
  | "kindLabels.guidedCollection"
  | "kindLabels.savedCompareSetup";

export type ProgressRemediationTitleKey =
  | "titles.prerequisiteConcept"
  | "titles.prerequisiteTrack"
  | "titles.trackRecap"
  | "titles.guidedCollectionBundle"
  | "titles.guidedCollection"
  | "titles.savedCompareSetup";

export type ProgressRemediationDescriptionKey =
  | "descriptions.prerequisiteConcept"
  | "descriptions.prerequisiteTrack"
  | "descriptions.trackRecap"
  | "descriptions.guidedCollectionBundle"
  | "descriptions.guidedCollection"
  | "descriptions.savedCompareSetup";

export type ProgressRemediationActionKey =
  | "actions.prerequisiteConcept"
  | "actions.prerequisiteTrack"
  | "actions.trackRecap"
  | "actions.guidedCollectionBundle"
  | "actions.guidedCollection"
  | "actions.savedCompareSetup";

export function shouldUseGenericProgressCopy(locale: AppLocale) {
  return locale !== "en";
}

export function getProgressConceptActionVariant(status: ProgressConceptActionStatus) {
  if (status === "completed") {
    return "review";
  }

  if (status === "started" || status === "practiced") {
    return "continue";
  }

  return "open";
}

export function getProgressActionKey(
  actionKind: ReviewQueueActionKind,
  options?: {
    conceptStatus?: ProgressConceptActionStatus;
  },
): ProgressCopyActionKey {
  switch (actionKind) {
    case "concept": {
      const variant = getProgressConceptActionVariant(
        options?.conceptStatus ?? "not-started",
      );

      if (variant === "review") {
        return "actions.reviewConcept";
      }

      if (variant === "continue") {
        return "actions.continueConcept";
      }

      return "actions.openConcept";
    }
    case "quick-test":
      return "actions.retryQuickTest";
    case "challenge":
      return "actions.openChallenge";
    case "worked-examples":
      return "actions.replayWorkedExamples";
    case "track-recap":
      return "actions.openTrackRecap";
    case "checkpoint":
    default:
      return "actions.openCheckpoint";
  }
}

export function getTrackPrimaryActionKey(
  kind: StarterTrackPrimaryAction["kind"],
): ProgressCopyTrackActionKey {
  switch (kind) {
    case "start":
      return "trackActions.startTrack";
    case "continue":
      return "trackActions.continueTrack";
    case "review":
      return "trackActions.openTrack";
    case "checkpoint":
    default:
      return "actions.openCheckpoint";
  }
}

export function getProgressReasonKey(
  reasonKind: ReviewQueueReasonKind,
): ProgressCopyReasonKey {
  switch (reasonKind) {
    case "missed-checks":
      return "reviewReasons.missedChecks";
    case "challenge":
      return "reviewReasons.challenge";
    case "checkpoint":
      return "reviewReasons.checkpoint";
    case "diagnostic":
      return "reviewReasons.diagnostic";
    case "confidence":
      return "reviewReasons.confidence";
    case "unfinished":
      return "reviewReasons.unfinished";
    case "stale":
    default:
      return "reviewReasons.stale";
  }
}

export function getProgressFocusLabelKey(
  focusKind: StarterTrackRecapFocusKind | "checkpoint",
): ProgressCopyFocusLabelKey {
  switch (focusKind) {
    case "priority":
      return "focusLabels.priority";
    case "next":
      return "focusLabels.next";
    case "active":
      return "focusLabels.active";
    case "solid":
      return "focusLabels.solid";
    case "ahead":
      return "focusLabels.ahead";
    case "checkpoint":
    default:
      return "focusLabels.checkpoint";
  }
}

export function getProgressRemediationKindLabelKey(
  kind: ReviewRemediationSuggestionKind,
): ProgressRemediationKindLabelKey {
  switch (kind) {
    case "prerequisite-concept":
      return "kindLabels.prerequisiteConcept";
    case "prerequisite-track":
      return "kindLabels.prerequisiteTrack";
    case "track-recap":
      return "kindLabels.trackRecap";
    case "guided-collection-bundle":
      return "kindLabels.guidedCollectionBundle";
    case "guided-collection":
      return "kindLabels.guidedCollection";
    case "saved-compare-setup":
    default:
      return "kindLabels.savedCompareSetup";
  }
}

export function getProgressRemediationTitleKey(
  kind: ReviewRemediationSuggestionKind,
): ProgressRemediationTitleKey {
  switch (kind) {
    case "prerequisite-concept":
      return "titles.prerequisiteConcept";
    case "prerequisite-track":
      return "titles.prerequisiteTrack";
    case "track-recap":
      return "titles.trackRecap";
    case "guided-collection-bundle":
      return "titles.guidedCollectionBundle";
    case "guided-collection":
      return "titles.guidedCollection";
    case "saved-compare-setup":
    default:
      return "titles.savedCompareSetup";
  }
}

export function getProgressRemediationDescriptionKey(
  kind: ReviewRemediationSuggestionKind,
): ProgressRemediationDescriptionKey {
  switch (kind) {
    case "prerequisite-concept":
      return "descriptions.prerequisiteConcept";
    case "prerequisite-track":
      return "descriptions.prerequisiteTrack";
    case "track-recap":
      return "descriptions.trackRecap";
    case "guided-collection-bundle":
      return "descriptions.guidedCollectionBundle";
    case "guided-collection":
      return "descriptions.guidedCollection";
    case "saved-compare-setup":
    default:
      return "descriptions.savedCompareSetup";
  }
}

export function getProgressRemediationActionKey(
  kind: ReviewRemediationSuggestionKind,
): ProgressRemediationActionKey {
  switch (kind) {
    case "prerequisite-concept":
      return "actions.prerequisiteConcept";
    case "prerequisite-track":
      return "actions.prerequisiteTrack";
    case "track-recap":
      return "actions.trackRecap";
    case "guided-collection-bundle":
      return "actions.guidedCollectionBundle";
    case "guided-collection":
      return "actions.guidedCollection";
    case "saved-compare-setup":
    default:
      return "actions.savedCompareSetup";
  }
}

export type LocalizedProgressCopyDescriptor = {
  key: string;
  values?: Record<string, number | string>;
};

export function getLocalizedConceptMasteryNote(
  note: string,
): LocalizedProgressCopyDescriptor | null {
  switch (note.trim()) {
    case "At least two stronger checks are saved on this browser.":
      return { key: "masteryNotes.solid" };
    case "One stronger check is saved so far. Another check would firm this up.":
      return { key: "masteryNotes.shaky" };
    case "Practice activity is saved, but no finished checks are stored yet.":
      return { key: "masteryNotes.practiced" };
    case "No finished quick test, solved challenge, or completion mark is saved yet.":
      return { key: "masteryNotes.new" };
    default:
      return null;
  }
}

export function getLocalizedProgressEvidence(
  evidence: string,
): LocalizedProgressCopyDescriptor | null {
  const normalized = evidence.trim();
  const countMatch = normalized.match(/^(\d+) challenges? (solved|started)$/i);

  if (countMatch) {
    const count = Number(countMatch[1] ?? "0");
    return countMatch[2] === "solved"
      ? { key: "evidence.challengesSolved", values: { count } }
      : { key: "evidence.challengesStarted", values: { count } };
  }

  switch (normalized) {
    case "Quick test finished":
      return { key: "evidence.quickTestFinished" };
    case "Marked complete":
      return { key: "evidence.markedComplete" };
    case "Prediction used":
      return { key: "evidence.predictionUsed" };
    case "Compare used":
      return { key: "evidence.compareUsed" };
    case "Worked example used":
      return { key: "evidence.workedExampleUsed" };
    case "Challenge mode opened":
      return { key: "evidence.challengeModeOpened" };
    default:
      return null;
  }
}

function extractDayCount(reason: string) {
  const match = reason.match(/(\d+)\s+day/i);
  return match ? Number(match[1] ?? "0") : null;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function getLocalizedProgressSupportReason(
  reason: string,
): LocalizedProgressCopyDescriptor | null {
  const normalized = normalizeWhitespace(reason);

  let match = normalized.match(
    /^Quick test has ended with missed questions (\d+) (?:runs?|times?) in a row\.$/i,
  );
  if (match) {
    return {
      key: "supportReasons.quickTestMissStreak",
      values: { count: Number(match[1] ?? "0") },
    };
  }

  match = normalized.match(/^Latest quick test still missed (\d+) question(?:s)?\.$/i);
  if (match) {
    return {
      key: "supportReasons.quickTestMissedCount",
      values: { count: Number(match[1] ?? "0") },
    };
  }

  match = normalized.match(
    /^(\d+) challenge starts are still open without a saved solve\.$/i,
  );
  if (match) {
    return {
      key: "supportReasons.challengeStartsOpen",
      values: { count: Number(match[1] ?? "0") },
    };
  }

  if (normalized === "1 challenge start is still open without a saved solve.") {
    return { key: "supportReasons.challengeStartOpen" };
  }

  if (normalized === "A challenge run is already started here, but no solve is saved yet.") {
    return { key: "supportReasons.challengeRunStartedNoSolve" };
  }

  if (normalized === "Challenge mode was opened here, but no solved challenge is saved yet.") {
    return { key: "supportReasons.challengeModeOpenedHereNoSolve" };
  }

  if (normalized === "Challenge mode was opened, but no solved challenge is saved yet.") {
    return { key: "supportReasons.challengeModeOpenedNoSolve" };
  }

  if (normalized === "Challenge mode was opened, but no solved challenge is stored yet.") {
    return { key: "supportReasons.challengeModeOpenedStoredNoSolve" };
  }

  if (normalized === "No finished quick test is saved yet.") {
    return { key: "supportReasons.noQuickTest" };
  }

  if (normalized === "No solved challenge is saved yet.") {
    return { key: "supportReasons.noSolvedChallenge" };
  }

  if (normalized === "Marked complete here, but no finished quick test or solved challenge is saved yet.") {
    return { key: "supportReasons.completedWithoutStrongChecks" };
  }

  if (normalized === "Practice is saved, but the concept was completed without a stronger check.") {
    return { key: "supportReasons.practicedCompletedWithoutStrongCheck" };
  }

  if (normalized === "Completed here, but only one stronger check is saved so far.") {
    return { key: "supportReasons.completedWithOneStrongCheck" };
  }

  if (normalized === "The live lab was already touched here, but no stronger check is saved yet.") {
    return { key: "supportReasons.liveLabTouchedNoCheck" };
  }

  if (normalized === "Only an opening visit is saved here so far.") {
    return { key: "supportReasons.openingVisitOnly" };
  }

  if (normalized === "Challenge mode is open in local progress, but no solve is saved yet.") {
    return { key: "supportReasons.challengeOpenNoSolve" };
  }

  if (normalized === "A worked example was used here, but no stronger check followed.") {
    return { key: "supportReasons.workedExampleWithoutCheck" };
  }

  if (normalized === "Prediction or compare work is saved here, but no stronger check followed.") {
    return { key: "supportReasons.predictionCompareWithoutCheck" };
  }

  if (normalized.startsWith("The live lab was started here, then left idle for ")) {
    return {
      key: "supportReasons.startedThenIdle",
      values: { days: extractDayCount(normalized) ?? 0 },
    };
  }

  if (normalized.startsWith("Last active ") && normalized.endsWith(" ago and still unfinished.")) {
    return {
      key: "supportReasons.lastActiveUnfinished",
      values: { days: extractDayCount(normalized) ?? 0 },
    };
  }

  if (normalized.startsWith("A worked example was opened here, but the concept has been idle for ")) {
    return {
      key: "supportReasons.workedExampleIdle",
      values: { days: extractDayCount(normalized) ?? 0 },
    };
  }

  if (normalized.startsWith("Prediction or compare work is saved here, but the concept has been idle for ")) {
    return {
      key: "supportReasons.predictionCompareIdle",
      values: { days: extractDayCount(normalized) ?? 0 },
    };
  }

  if (normalized.startsWith("Practice is saved, but the concept has been idle for ")) {
    return {
      key: "supportReasons.practiceIdle",
      values: { days: extractDayCount(normalized) ?? 0 },
    };
  }

  if (normalized.startsWith("Completed confidently before, but it has been ")) {
    return {
      key: "supportReasons.staleCompleted",
      values: { days: extractDayCount(normalized) ?? 0 },
    };
  }

  const checkpointStartedSuffix = " is already started but still needs a clean finish.";
  if (normalized.endsWith(checkpointStartedSuffix)) {
    return {
      key: "supportReasons.checkpointStartedNeedsFinish",
      values: {
        title: normalized.slice(0, -checkpointStartedSuffix.length),
      },
    };
  }

  const laterTrackSeparator = " is still open even though later ";
  const laterTrackSuffix = " work has already started.";
  if (
    normalized.includes(laterTrackSeparator) &&
    normalized.endsWith(laterTrackSuffix)
  ) {
    const [title, trackTitle] = normalized
      .slice(0, -laterTrackSuffix.length)
      .split(laterTrackSeparator, 2);

    if (title && trackTitle) {
      return {
        key: "supportReasons.checkpointStillOpenLaterTrackStarted",
        values: {
          title,
          trackTitle,
        },
      };
    }
  }

  match = normalized.match(
    /^(.+?) has been ready for (\d+) days? and is still the next track handoff\.$/,
  );
  if (match) {
    return {
      key: "supportReasons.checkpointReadyStillNextTrackHandoff",
      values: {
        title: match[1] ?? "",
        days: Number(match[2] ?? "0"),
      },
    };
  }

  return null;
}
