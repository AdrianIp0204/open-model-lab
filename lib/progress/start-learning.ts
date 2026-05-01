import type {
  ConceptSummary,
  StarterTrackSummary,
  SubjectDiscoverySummary,
} from "@/lib/content";
import type { AppLocale } from "@/i18n/routing";
import { getConceptDisplayTitle } from "@/lib/i18n/content";
import { getStarterTrackPrimaryAction, type StarterTrackPrimaryAction, type StarterTrackProgressSummary } from "./tracks";
import { getConceptResurfacingCue, selectContinueLearning, type ConceptMasteryState, type ConceptProgressStatus, type ProgressSnapshot } from "./model";
import { selectAdaptiveReviewQueue } from "./review-queue";
import { selectCurrentTrack } from "./continue-learning-state";

export type StartLearningResumePrimaryConcept = {
  slug: string;
  title: string;
  subjectTitle: string;
  status: ConceptProgressStatus;
  masteryState: ConceptMasteryState;
  lastActivityAt: string | null;
  resumeReason: string | null;
  masteryNote: string;
};

export type StartLearningResumeTrack = {
  track: StarterTrackSummary;
  progress: StarterTrackProgressSummary;
  primaryAction: StarterTrackPrimaryAction | null;
  subject: SubjectDiscoverySummary | null;
};

export type StartLearningReviewAction = {
  href: string;
  label: string;
  note: string;
  subject: SubjectDiscoverySummary | null;
};

export type StartLearningResumeSummary = {
  hasRecordedProgress: boolean;
  primaryConcept: StartLearningResumePrimaryConcept | null;
  currentTrack: StartLearningResumeTrack | null;
  reviewAction: StartLearningReviewAction | null;
  activeSubject: SubjectDiscoverySummary | null;
};

function getTrackSubject(
  track: StarterTrackSummary,
  subjectsByTitle: Map<string, SubjectDiscoverySummary>,
) {
  const trackSubjects = Array.from(
    new Set(track.concepts.map((concept) => concept.subject)),
  );

  if (trackSubjects.length !== 1) {
    return null;
  }

  return subjectsByTitle.get(trackSubjects[0]) ?? null;
}

export function buildStartLearningResumeSummary(
  snapshot: ProgressSnapshot,
  concepts: Array<Pick<ConceptSummary, "id" | "slug" | "title" | "subject">>,
  starterTracks: StarterTrackSummary[],
  subjects: SubjectDiscoverySummary[],
  locale: AppLocale = "en",
): StartLearningResumeSummary {
  const hasRecordedProgress = Object.keys(snapshot.concepts).length > 0;
  const conceptsBySlug = new Map(
    concepts.map((concept) => [concept.slug, concept] as const),
  );
  const subjectsByTitle = new Map(
    subjects.map((subject) => [subject.title, subject] as const),
  );
  const continueLearning = selectContinueLearning(snapshot, concepts, 2);
  const primaryCue = continueLearning.primary
    ? getConceptResurfacingCue(continueLearning.primary)
    : null;
  const currentTrackCandidate = selectCurrentTrack(snapshot, starterTracks, locale);
  const reviewQueue = selectAdaptiveReviewQueue(snapshot, concepts, starterTracks, 2, {
    locale,
  });
  const reviewCandidate =
    reviewQueue.find(
      (item) => item.concept.slug !== continueLearning.primary?.concept.slug,
    ) ??
    reviewQueue[0] ??
    null;
  const primaryConceptSubjectTitle =
    continueLearning.primary
      ? conceptsBySlug.get(continueLearning.primary.concept.slug)?.subject ?? null
      : null;
  const primaryConceptSubject = primaryConceptSubjectTitle
    ? subjectsByTitle.get(primaryConceptSubjectTitle) ?? null
    : null;
  const currentTrackSubject = currentTrackCandidate
    ? getTrackSubject(currentTrackCandidate.track, subjectsByTitle)
    : null;
  const reviewActionSubjectTitle = reviewCandidate
    ? conceptsBySlug.get(reviewCandidate.concept.slug)?.subject ?? null
    : null;
  const reviewActionSubject = reviewActionSubjectTitle
    ? subjectsByTitle.get(reviewActionSubjectTitle) ?? null
    : null;

  return {
    hasRecordedProgress,
    primaryConcept: continueLearning.primary
      ? {
          slug: continueLearning.primary.concept.slug,
          title: getConceptDisplayTitle(
            conceptsBySlug.get(continueLearning.primary.concept.slug) ?? {
              slug: continueLearning.primary.concept.slug,
              title:
                continueLearning.primary.concept.title ??
                continueLearning.primary.concept.slug,
            },
            locale,
          ),
          subjectTitle: primaryConceptSubjectTitle ?? "Unknown subject",
          status: continueLearning.primary.status,
          masteryState: continueLearning.primary.mastery.state,
          lastActivityAt: continueLearning.primary.lastActivityAt,
          resumeReason: primaryCue?.reason ?? null,
          masteryNote: continueLearning.primary.mastery.note,
        }
      : null,
    currentTrack: currentTrackCandidate
      ? {
          track: currentTrackCandidate.track,
          progress: currentTrackCandidate.progress,
          primaryAction: getStarterTrackPrimaryAction(
            currentTrackCandidate.track,
            currentTrackCandidate.progress,
            locale,
          ),
          subject: currentTrackSubject,
        }
      : null,
    reviewAction: reviewCandidate
      ? {
          href: reviewCandidate.primaryAction.href,
          label: reviewCandidate.primaryAction.label,
          note: reviewCandidate.reason,
          subject: reviewActionSubject,
        }
      : null,
    activeSubject:
      primaryConceptSubject ?? currentTrackSubject ?? reviewActionSubject ?? null,
  };
}
