import type {
  ConceptSummary,
  GuidedCollectionSummary,
  StarterTrackSummary,
  SubjectDiscoverySummary,
} from "@/lib/content";
import type { AppLocale } from "@/i18n/routing";
import { getConceptDisplayTitle } from "@/lib/i18n/content";
import { buildChallengeEntryHref, localizeShareHref } from "@/lib/share-links";
import type { GuidedCollectionProgressSummary } from "./guided-collections";
import { getGuidedCollectionProgressSummary } from "./guided-collections";
import {
  getCompletedChallengeCount,
  getConceptProgressLastActivityAt,
  selectContinueLearning,
  type ProgressSnapshot,
} from "./model";
import { selectAdaptiveReviewQueue } from "./review-queue";
import { selectCurrentTrack } from "./continue-learning-state";
import { getStarterTrackPrimaryAction } from "./tracks";

type FreeTierRecapConcept = Pick<ConceptSummary, "id" | "slug" | "title" | "subject">;
type FreeTierRecapSubject = Pick<SubjectDiscoverySummary, "slug" | "title" | "path">;

export type FreeTierProgressCompletionKind = "challenge" | "checkpoint";
export type FreeTierProgressPromptKind = "concept" | "track" | "checkpoint" | "guided";

export type FreeTierProgressCompletion = {
  id: string;
  kind: FreeTierProgressCompletionKind;
  title: string;
  note: string;
  conceptSlug: string;
  conceptTitle: string;
  subjectTitle: string | null;
  trackTitle: string | null;
  completedAt: string;
  href: string;
};

export type FreeTierSubjectMomentum = {
  subjectSlug: string | null;
  subjectTitle: string;
  path: string | null;
  touchedConceptCount: number;
  completedConceptCount: number;
  solvedChallengeCount: number;
  clearedCheckpointCount: number;
  lastActivityAt: string | null;
};

export type FreeTierProgressPrompt = {
  id: string;
  kind: FreeTierProgressPromptKind;
  title: string;
  note: string;
  href: string;
  actionLabel: string;
  subjectTitle: string | null;
};

export type FreeTierProgressRecapSummary = {
  hasRecordedProgress: boolean;
  recentCompletions: FreeTierProgressCompletion[];
  subjectMomentum: FreeTierSubjectMomentum[];
  nextPrompts: FreeTierProgressPrompt[];
  completedChallengeCount: number;
  completedCheckpointCount: number;
};

type FreeTierProgressRecapOptions = {
  snapshot: ProgressSnapshot;
  concepts: FreeTierRecapConcept[];
  starterTracks: StarterTrackSummary[];
  guidedCollections?: GuidedCollectionSummary[];
  subjects?: FreeTierRecapSubject[];
  subjectTitle?: string | null;
  locale?: AppLocale;
  recentCompletionLimit?: number;
  subjectMomentumLimit?: number;
  nextPromptLimit?: number;
};

type CheckpointLookupEntry = {
  track: StarterTrackSummary;
  checkpoint: StarterTrackSummary["checkpoints"][number];
};

function getCompletionKey(conceptSlug: string, challengeId: string) {
  return `${conceptSlug}::${challengeId}`;
}

function getTrackSubjectTitle(track: StarterTrackSummary) {
  const trackSubjects = Array.from(
    new Set(track.concepts.map((concept) => concept.subject)),
  );

  return trackSubjects.length === 1 ? trackSubjects[0] : null;
}

function buildCheckpointLookup(starterTracks: StarterTrackSummary[]) {
  const checkpointLookup = new Map<string, CheckpointLookupEntry>();

  for (const track of starterTracks) {
    for (const checkpoint of track.checkpoints) {
      const key = getCompletionKey(
        checkpoint.challenge.concept.slug,
        checkpoint.challenge.challengeId,
      );

      if (!checkpointLookup.has(key)) {
        checkpointLookup.set(key, {
          track,
          checkpoint,
        });
      }
    }
  }

  return checkpointLookup;
}

function resolveChallengeTitle(
  conceptTitle: string,
) {
  return `${conceptTitle} challenge`;
}

function buildRecentCompletions({
  snapshot,
  conceptBySlug,
  checkpointLookup,
  subjectTitle,
  locale,
}: {
  snapshot: ProgressSnapshot;
  conceptBySlug: Map<string, FreeTierRecapConcept>;
  checkpointLookup: Map<string, CheckpointLookupEntry>;
  subjectTitle?: string | null;
  locale?: AppLocale;
}) {
  const completions: FreeTierProgressCompletion[] = [];

  for (const record of Object.values(snapshot.concepts)) {
    const concept = conceptBySlug.get(record.slug);

    if (!concept) {
      continue;
    }

    if (subjectTitle && concept.subject !== subjectTitle) {
      continue;
    }

    for (const [challengeId, completedAt] of Object.entries(
      record.completedChallenges ?? {},
    )) {
      const checkpointEntry = checkpointLookup.get(
        getCompletionKey(record.slug, challengeId),
      );

      if (checkpointEntry) {
        completions.push({
          id: `checkpoint:${record.slug}:${challengeId}`,
          kind: "checkpoint",
          title: checkpointEntry.checkpoint.title,
          note: `${checkpointEntry.track.title} checkpoint cleared through ${checkpointEntry.checkpoint.challenge.title}.`,
          conceptSlug: concept.slug,
          conceptTitle: concept.title,
          subjectTitle: concept.subject,
          trackTitle: checkpointEntry.track.title,
          completedAt,
          href: buildChallengeEntryHref(record.slug, challengeId, locale),
        });
        continue;
      }

      completions.push({
        id: `challenge:${record.slug}:${challengeId}`,
        kind: "challenge",
        title: resolveChallengeTitle(concept.title),
        note: `${concept.title} challenge solved in saved progress.`,
        conceptSlug: concept.slug,
        conceptTitle: concept.title,
        subjectTitle: concept.subject,
        trackTitle: null,
        completedAt,
        href: buildChallengeEntryHref(record.slug, challengeId, locale),
      });
    }
  }

  return completions.sort((left, right) => right.completedAt.localeCompare(left.completedAt));
}

function buildSubjectMomentum({
  snapshot,
  concepts,
  checkpointLookup,
  subjectsByTitle,
  subjectTitle,
}: {
  snapshot: ProgressSnapshot;
  concepts: FreeTierRecapConcept[];
  checkpointLookup: Map<string, CheckpointLookupEntry>;
  subjectsByTitle: Map<string, FreeTierRecapSubject>;
  subjectTitle?: string | null;
}) {
  const momentumBySubject = new Map<string, FreeTierSubjectMomentum>();

  for (const concept of concepts) {
    if (subjectTitle && concept.subject !== subjectTitle) {
      continue;
    }

    const record = snapshot.concepts[concept.slug];

    if (!record) {
      continue;
    }

    const lastActivityAt = getConceptProgressLastActivityAt(record);

    if (!lastActivityAt) {
      continue;
    }

    const checkpointCount = Object.keys(record.completedChallenges ?? {}).filter((challengeId) =>
      checkpointLookup.has(getCompletionKey(concept.slug, challengeId)),
    ).length;
    const subject = subjectsByTitle.get(concept.subject);
    const existing = momentumBySubject.get(concept.subject);

    if (existing) {
      existing.touchedConceptCount += 1;
      existing.completedConceptCount += record.manualCompletedAt ? 1 : 0;
      existing.solvedChallengeCount += getCompletedChallengeCount(record);
      existing.clearedCheckpointCount += checkpointCount;

      if (!existing.lastActivityAt || lastActivityAt > existing.lastActivityAt) {
        existing.lastActivityAt = lastActivityAt;
      }

      continue;
    }

    momentumBySubject.set(concept.subject, {
      subjectSlug: subject?.slug ?? null,
      subjectTitle: concept.subject,
      path: subject?.path ?? null,
      touchedConceptCount: 1,
      completedConceptCount: record.manualCompletedAt ? 1 : 0,
      solvedChallengeCount: getCompletedChallengeCount(record),
      clearedCheckpointCount: checkpointCount,
      lastActivityAt,
    });
  }

  return [...momentumBySubject.values()].sort((left, right) => {
    const leftActivity = left.lastActivityAt ?? "";
    const rightActivity = right.lastActivityAt ?? "";

    if (leftActivity !== rightActivity) {
      return rightActivity.localeCompare(leftActivity);
    }

    if (left.solvedChallengeCount !== right.solvedChallengeCount) {
      return right.solvedChallengeCount - left.solvedChallengeCount;
    }

    if (left.completedConceptCount !== right.completedConceptCount) {
      return right.completedConceptCount - left.completedConceptCount;
    }

    return left.subjectTitle.localeCompare(right.subjectTitle);
  });
}

function getRelevantGuidedCollections(
  guidedCollections: GuidedCollectionSummary[],
  subjectTitle?: string | null,
) {
  if (!subjectTitle) {
    return guidedCollections;
  }

  return guidedCollections.filter((collection) =>
    collection.concepts.some((concept) => concept.subject === subjectTitle),
  );
}

function chooseGuidedPrompt(
  snapshot: ProgressSnapshot,
  guidedCollections: GuidedCollectionSummary[],
) {
  const summaries = guidedCollections
    .map((collection) => getGuidedCollectionProgressSummary(snapshot, collection))
    .filter((summary) => summary.status !== "completed" && summary.nextStep)
    .sort(compareGuidedCollectionProgressSummaries);

  return summaries[0] ?? null;
}

function compareGuidedCollectionProgressSummaries(
  left: GuidedCollectionProgressSummary,
  right: GuidedCollectionProgressSummary,
) {
  if (left.status !== right.status) {
    if (left.status === "in-progress") {
      return -1;
    }

    if (right.status === "in-progress") {
      return 1;
    }
  }

  const leftActivity = left.lastActivityAt ?? "";
  const rightActivity = right.lastActivityAt ?? "";

  if (leftActivity !== rightActivity) {
    return rightActivity.localeCompare(leftActivity);
  }

  return left.collection.title.localeCompare(right.collection.title);
}

function uniquePromptKey(prompt: Pick<FreeTierProgressPrompt, "href" | "actionLabel">) {
  return `${prompt.href}::${prompt.actionLabel}`;
}

function pushPrompt(
  prompts: FreeTierProgressPrompt[],
  seenPromptKeys: Set<string>,
  prompt: FreeTierProgressPrompt | null,
) {
  if (!prompt) {
    return;
  }

  const key = uniquePromptKey(prompt);

  if (seenPromptKeys.has(key)) {
    return;
  }

  seenPromptKeys.add(key);
  prompts.push(prompt);
}

function buildNextPrompts({
  snapshot,
  concepts,
  starterTracks,
  guidedCollections,
  subjectTitle,
  locale,
}: {
  snapshot: ProgressSnapshot;
  concepts: FreeTierRecapConcept[];
  starterTracks: StarterTrackSummary[];
  guidedCollections: GuidedCollectionSummary[];
  subjectTitle?: string | null;
  locale?: AppLocale;
}) {
  const relevantConcepts = subjectTitle
    ? concepts.filter((concept) => concept.subject === subjectTitle)
    : concepts;
  const relevantTracks = subjectTitle
    ? starterTracks.filter((track) =>
        track.concepts.some((concept) => concept.subject === subjectTitle),
      )
    : starterTracks;
  const prompts: FreeTierProgressPrompt[] = [];
  const seenPromptKeys = new Set<string>();
  const currentTrack = selectCurrentTrack(snapshot, relevantTracks, locale);
  const reviewCandidate = selectAdaptiveReviewQueue(snapshot, relevantConcepts, relevantTracks, 1, {
    allConcepts: relevantConcepts,
    guidedCollections,
    locale,
  })[0] ?? null;
  const continueLearning = selectContinueLearning(snapshot, relevantConcepts, 1);
  const guidedPrompt = chooseGuidedPrompt(
    snapshot,
    getRelevantGuidedCollections(guidedCollections, subjectTitle),
  );

  if (currentTrack) {
    const primaryAction = getStarterTrackPrimaryAction(
      currentTrack.track,
      currentTrack.progress,
      locale,
    );

    pushPrompt(prompts, seenPromptKeys, {
      id: `track:${currentTrack.track.slug}:${primaryAction.kind}`,
      kind: primaryAction.kind === "checkpoint" ? "checkpoint" : "track",
      title:
        primaryAction.kind === "checkpoint"
          ? primaryAction.targetCheckpoint?.title ?? currentTrack.track.title
          : currentTrack.track.title,
      note: primaryAction.note,
      href: primaryAction.href,
      actionLabel: primaryAction.label,
      subjectTitle: getTrackSubjectTitle(currentTrack.track),
    });
  }

  if (reviewCandidate) {
    pushPrompt(prompts, seenPromptKeys, {
      id: `review:${reviewCandidate.concept.slug}:${reviewCandidate.primaryAction.kind}`,
      kind:
        reviewCandidate.reasonKind === "checkpoint" ||
        reviewCandidate.primaryAction.kind === "checkpoint"
          ? "checkpoint"
          : "concept",
      title: reviewCandidate.concept.title,
      note: reviewCandidate.reason,
      href: reviewCandidate.primaryAction.href,
      actionLabel: reviewCandidate.primaryAction.label,
      subjectTitle:
        concepts.find((concept) => concept.slug === reviewCandidate.concept.slug)?.subject ?? null,
    });
  }

  if (guidedPrompt?.nextStep) {
    const collectionSubjects = Array.from(
      new Set(guidedPrompt.collection.concepts.map((concept) => concept.subject)),
    );

    pushPrompt(prompts, seenPromptKeys, {
      id: `guided:${guidedPrompt.collection.slug}:${guidedPrompt.nextStep.step.id}`,
      kind: "guided",
      title: guidedPrompt.collection.title,
      note: guidedPrompt.nextStep.note,
      href: guidedPrompt.nextStep.primaryAction.href,
      actionLabel: guidedPrompt.nextStep.primaryAction.label,
      subjectTitle: collectionSubjects.length === 1 ? collectionSubjects[0] : null,
    });
  }

  if (continueLearning.primary) {
    pushPrompt(prompts, seenPromptKeys, {
      id: `concept:${continueLearning.primary.concept.slug}`,
      kind: "concept",
      title: getConceptDisplayTitle(
        {
          ...continueLearning.primary.concept,
          title: continueLearning.primary.concept.title ?? continueLearning.primary.concept.slug,
        },
        locale ?? "en",
      ),
      note: continueLearning.primary.mastery.note,
      href: localizeShareHref(`/concepts/${continueLearning.primary.concept.slug}`, locale),
      actionLabel:
        continueLearning.primary.status === "completed"
          ? locale === "zh-HK"
            ? "重溫概念"
            : "Review concept"
          : locale === "zh-HK"
            ? "繼續概念"
            : "Continue concept",
      subjectTitle:
        concepts.find((concept) => concept.slug === continueLearning.primary?.concept.slug)
          ?.subject ?? null,
    });
  }

  return prompts;
}

export function buildFreeTierProgressRecapSummary({
  snapshot,
  concepts,
  starterTracks,
  guidedCollections = [],
  subjects = [],
  subjectTitle = null,
  locale = "en",
  recentCompletionLimit = 3,
  subjectMomentumLimit = 3,
  nextPromptLimit = 3,
}: FreeTierProgressRecapOptions): FreeTierProgressRecapSummary {
  const conceptBySlug = new Map(concepts.map((concept) => [concept.slug, concept] as const));
  const checkpointLookup = buildCheckpointLookup(starterTracks);
  const subjectsByTitle = new Map(
    subjects.map((subject) => [subject.title, subject] as const),
  );
  const recentCompletions = buildRecentCompletions({
    snapshot,
    conceptBySlug,
    checkpointLookup,
    subjectTitle,
    locale,
  });
  const subjectMomentum = buildSubjectMomentum({
    snapshot,
    concepts,
    checkpointLookup,
    subjectsByTitle,
    subjectTitle,
  });
  const nextPrompts = buildNextPrompts({
    snapshot,
    concepts,
    starterTracks,
    guidedCollections,
    subjectTitle,
    locale,
  });
  const relevantConcepts = subjectTitle
    ? concepts.filter((concept) => concept.subject === subjectTitle)
    : concepts;
  const completedChallengeCount = relevantConcepts.reduce((sum, concept) => {
    const record = snapshot.concepts[concept.slug];
    return sum + getCompletedChallengeCount(record);
  }, 0);
  const completedCheckpointCount = recentCompletions.filter(
    (item) => item.kind === "checkpoint",
  ).length;
  const hasRecordedProgress = relevantConcepts.some((concept) => {
    const record = snapshot.concepts[concept.slug];
    return Boolean(record && getConceptProgressLastActivityAt(record));
  });

  return {
    hasRecordedProgress,
    recentCompletions: recentCompletions.slice(0, recentCompletionLimit),
    subjectMomentum: subjectMomentum.slice(0, subjectMomentumLimit),
    nextPrompts: nextPrompts.slice(0, nextPromptLimit),
    completedChallengeCount,
    completedCheckpointCount,
  };
}
