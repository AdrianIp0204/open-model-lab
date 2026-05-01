"use client";

import { useLocale, useTranslations } from "next-intl";
import type { SubjectDiscoverySummary } from "@/lib/content";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  getConceptDisplayShortTitle,
  getConceptDisplayTitle,
  getStarterTrackDisplayTitle,
  getSubjectDisplayTitle,
  getTopicDisplayTitle,
} from "@/lib/i18n/content";
import {
  buildFreeTierProgressRecapSummary,
  getConceptProgressSummary,
  getConceptResurfacingCue,
  getStarterTrackPrimaryAction,
  resolveAccountProgressSnapshot,
  selectAdaptiveReviewQueue,
  selectContinueLearning,
  selectCurrentTrack,
  useProgressSnapshot,
  type ProgressSnapshot,
} from "@/lib/progress";
import { MasteryStateBadge } from "@/components/progress/MasteryStateBadge";
import { ProgressStatusBadge } from "@/components/progress/ProgressStatusBadge";
import { formatProgressMonthDay } from "@/components/progress/dateFormatting";

type SubjectLandingProgressPanelProps = {
  subject: SubjectDiscoverySummary;
  initialSyncedSnapshot?: ProgressSnapshot | null;
};

type SubjectAction = {
  href: string;
  label: string;
  note: string;
};

function dedupeTracks(subject: SubjectDiscoverySummary) {
  const merged = [
    ...subject.featuredStarterTracks,
    ...subject.starterTracks,
    ...subject.bridgeStarterTracks,
  ];

  return merged.filter(
    (track, index) =>
      merged.findIndex((candidate) => candidate.slug === track.slug) === index,
  );
}

function getSubjectConceptBrowsePath(subject: SubjectDiscoverySummary) {
  return `/concepts?subject=${encodeURIComponent(subject.title)}`;
}

export function SubjectLandingProgressPanel({
  subject,
  initialSyncedSnapshot = null,
}: SubjectLandingProgressPanelProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("SubjectLandingProgressPanel");
  const localSnapshot = useProgressSnapshot();
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const snapshot = progressDisplay.snapshot;
  const usingSyncedSnapshot = progressDisplay.source !== "local";
  const progressSource: "local" | "synced" =
    progressDisplay.source === "local" ? "local" : "synced";
  const relevantTracks = dedupeTracks(subject);
  const continueLearning = selectContinueLearning(snapshot, subject.concepts, 2);
  const reviewQueue = selectAdaptiveReviewQueue(snapshot, subject.concepts, relevantTracks, 2, {
    locale,
  });
  const primaryReviewCandidate =
    reviewQueue.find((item) => item.concept.slug !== continueLearning.primary?.concept.slug) ??
    reviewQueue[0] ??
    null;
  const currentTrack = selectCurrentTrack(snapshot, relevantTracks, locale);
  const currentTrackAction = currentTrack
    ? getStarterTrackPrimaryAction(currentTrack.track, currentTrack.progress, locale)
    : null;
  const conceptProgressEntries = subject.concepts.map((concept) => ({
    concept,
    progress: getConceptProgressSummary(snapshot, concept),
  }));
  const touchedCount = conceptProgressEntries.filter(
    (entry) => entry.progress.status !== "not-started",
  ).length;
  const completedCount = conceptProgressEntries.filter(
    (entry) => entry.progress.status === "completed",
  ).length;
  const primaryConceptCue = continueLearning.primary
    ? getConceptResurfacingCue(continueLearning.primary)
    : null;
  const subjectRecap = buildFreeTierProgressRecapSummary({
    snapshot,
    concepts: subject.concepts,
    starterTracks: relevantTracks,
    subjectTitle: subject.title,
    locale,
  });
  const subjectTitle = getSubjectDisplayTitle(subject, locale);
  const firstTopic = subject.featuredTopics[0] ?? subject.topics[0] ?? null;
  const firstTrack = subject.featuredStarterTracks[0] ?? subject.starterTracks[0] ?? null;
  const firstConcept = subject.featuredConcepts[0] ?? subject.concepts[0] ?? null;
  const defaultConceptBrowsePath = getSubjectConceptBrowsePath(subject);
  const savedProgressLabel = usingSyncedSnapshot
    ? t("labels.savedSyncedProgress", { subject: subjectTitle })
    : t("labels.savedLocalProgress", { subject: subjectTitle });

  let primaryAction: SubjectAction;

  if (continueLearning.primary) {
    primaryAction = {
      href: `/concepts/${continueLearning.primary.concept.slug}`,
      label: t("actions.continueConcept"),
      note: primaryConceptCue?.reason ?? continueLearning.primary.mastery.note,
    };
  } else if (
    currentTrack &&
    currentTrack.progress.status === "in-progress" &&
    currentTrackAction
  ) {
    primaryAction = {
      href: `/tracks/${currentTrack.track.slug}`,
      label: t("actions.continueTrack"),
      note: currentTrackAction.note,
    };
  } else if (primaryReviewCandidate) {
    primaryAction = {
      href: primaryReviewCandidate.primaryAction.href,
      label: primaryReviewCandidate.primaryAction.label,
      note: primaryReviewCandidate.reason,
    };
  } else if (firstTrack) {
    primaryAction = {
      href: `/tracks/${firstTrack.slug}`,
      label: t("actions.startTrack", {
        title: getStarterTrackDisplayTitle(firstTrack, locale),
      }),
      note: t("notes.firstTrack", {
        track: getStarterTrackDisplayTitle(firstTrack, locale),
        subject: subjectTitle,
      }),
    };
  } else if (firstConcept) {
    primaryAction = {
      href: `/concepts/${firstConcept.slug}`,
      label: t("actions.startConcept", {
        title: getConceptDisplayShortTitle(firstConcept, locale),
      }),
      note: t("notes.firstConcept", {
        subject: subjectTitle,
      }),
    };
  } else {
    primaryAction = {
      href: defaultConceptBrowsePath,
      label: t("actions.browseSubjectConcepts"),
      note: t("notes.browseSubjectConcepts", { subject: subjectTitle }),
    };
  }

  let secondaryAction: SubjectAction;

  if (continueLearning.primary && currentTrack && currentTrackAction) {
    secondaryAction = {
      href:
        currentTrack.progress.status === "completed"
          ? `/tracks/${currentTrack.track.slug}/complete`
          : `/tracks/${currentTrack.track.slug}`,
      label:
        currentTrack.progress.status === "completed"
          ? t("actions.openTrackCompletion")
          : t("actions.continueTrack"),
      note: currentTrackAction.note,
    };
  } else if (primaryReviewCandidate && firstTopic) {
    secondaryAction = {
      href: `/concepts/topics/${firstTopic.slug}`,
      label: t("actions.openTopic", {
        title: getTopicDisplayTitle(firstTopic, locale),
      }),
      note: t("notes.topicRoute", {
        topic: getTopicDisplayTitle(firstTopic, locale),
        subject: subjectTitle,
      }),
    };
  } else if (firstTopic) {
    secondaryAction = {
      href: `/concepts/topics/${firstTopic.slug}`,
      label: t("actions.openTopic", {
        title: getTopicDisplayTitle(firstTopic, locale),
      }),
      note: t("notes.topicEntry", {
        topic: getTopicDisplayTitle(firstTopic, locale),
      }),
    };
  } else {
    secondaryAction = {
      href: defaultConceptBrowsePath,
      label: t("actions.browseSubjectConcepts"),
      note: t("notes.browseSubjectConceptsLibrary", { subject: subjectTitle }),
    };
  }

  return (
    <aside className="grid gap-4">
      <section className="lab-panel p-5">
        <div className="space-y-2">
          <p className="lab-label">{savedProgressLabel}</p>
          <h2 className="text-2xl font-semibold text-ink-950">
            {touchedCount
              ? t("titles.nextMove", { subject: subjectTitle })
              : t("titles.noProgress", { subject: subjectTitle })}
          </h2>
          <p className="text-sm leading-6 text-ink-700">
            {touchedCount
              ? usingSyncedSnapshot
                ? t("descriptions.savedCuesSynced")
                : t("descriptions.savedCuesLocal")
              : t("descriptions.noProgress")}
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[20px] border border-line bg-paper-strong p-4">
            <p className="text-lg font-semibold text-ink-950">{touchedCount}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
              {t("stats.conceptsTouched")}
            </p>
          </div>
          <div className="rounded-[20px] border border-line bg-paper-strong p-4">
            <p className="text-lg font-semibold text-ink-950">{completedCount}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
              {t("stats.conceptsComplete")}
            </p>
          </div>
          <div className="rounded-[20px] border border-line bg-paper-strong p-4">
            <p className="text-lg font-semibold text-ink-950">
              {subjectRecap.completedChallengeCount}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
              {t("stats.challengeSolves")}
            </p>
          </div>
          <div className="rounded-[20px] border border-line bg-paper-strong p-4">
            <p className="text-lg font-semibold text-ink-950">{reviewQueue.length}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
              {t("stats.reviewCues")}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <article className="rounded-[24px] border border-line bg-paper-strong p-4">
            <p className="text-sm font-semibold text-ink-950">{t("sections.primaryNextStep")}</p>
            <p className="mt-2 text-sm leading-6 text-ink-700">{primaryAction.note}</p>
            <Link
              href={primaryAction.href}
              className="motion-button-solid mt-4 inline-flex items-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold"
              style={{ color: "var(--paper-strong)" }}
            >
              {primaryAction.label}
            </Link>
          </article>

          <article className="rounded-[24px] border border-line bg-paper-strong p-4">
            <p className="text-sm font-semibold text-ink-950">{t("sections.secondaryPath")}</p>
            <p className="mt-2 text-sm leading-6 text-ink-700">{secondaryAction.note}</p>
            <Link
              href={secondaryAction.href}
              className="motion-button-outline mt-4 inline-flex items-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink-950 hover:border-ink-950/20"
            >
              {secondaryAction.label}
            </Link>
          </article>

          <article className="rounded-[24px] border border-line bg-paper-strong p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-ink-950">{t("sections.recentClears")}</p>
              <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                {t("meta.completedCheckpoints", {
                  count: subjectRecap.completedCheckpointCount,
                })}
              </span>
            </div>
            {subjectRecap.recentCompletions.length ? (
              <div className="mt-3 grid gap-3">
                {subjectRecap.recentCompletions.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[20px] border border-line bg-paper px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                          item.kind === "checkpoint"
                            ? "border-amber-500/25 bg-amber-500/10 text-amber-700"
                            : "border-teal-500/25 bg-teal-500/10 text-teal-700",
                        ].join(" ")}
                      >
                        {item.kind === "checkpoint"
                          ? t("badges.checkpoint")
                          : t("badges.challenge")}
                      </span>
                      {item.trackTitle ? (
                        <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                          {item.trackTitle}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-ink-950">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-ink-700">{item.note}</p>
                    <Link
                      href={item.href}
                      className="motion-button-outline mt-3 inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-semibold text-ink-950 hover:border-ink-950/20"
                    >
                      {item.kind === "checkpoint"
                        ? t("actions.reopenCheckpoint")
                        : t("actions.reopenChallenge")}
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm leading-6 text-ink-700">
                {t("empty.recentClears", { subject: subjectTitle })}
              </p>
            )}
          </article>
        </div>
      </section>

      {continueLearning.primary ? (
        <section className="lab-panel-compact">
          <div className="flex flex-wrap items-center gap-2">
            <ProgressStatusBadge status={continueLearning.primary.status} compact />
            <MasteryStateBadge state={continueLearning.primary.mastery.state} compact />
            {continueLearning.primary.lastActivityAt ? (
              <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                {formatProgressMonthDay(continueLearning.primary.lastActivityAt, progressSource)}
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-lg font-semibold text-ink-950">
            {getConceptDisplayTitle(
              {
                ...continueLearning.primary.concept,
                title:
                  continueLearning.primary.concept.title ??
                  continueLearning.primary.concept.slug,
              },
              locale,
            )}
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-700">
            {primaryConceptCue?.reason ?? continueLearning.primary.mastery.note}
          </p>
          <Link
            href={`/concepts/${continueLearning.primary.concept.slug}`}
            className="motion-button-outline mt-4 inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 hover:border-ink-950/20"
          >
            {t("actions.continueConcept")}
          </Link>
        </section>
      ) : null}

      {currentTrack ? (
        <section className="lab-panel-compact">
          <div className="flex flex-wrap items-center gap-2">
            <span className="lab-label">{t("labels.currentTrack")}</span>
            <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
              {t("meta.currentTrackProgress", {
                completed: currentTrack.progress.completedFlowCount,
                total: currentTrack.progress.totalFlowCount,
              })}
            </span>
          </div>
          <p className="mt-3 text-lg font-semibold text-ink-950">
            {getStarterTrackDisplayTitle(currentTrack.track, locale)}
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-700">
            {currentTrackAction?.note ?? t("notes.currentTrackFallback")}
          </p>
          <Link
            href={
              currentTrack.progress.status === "completed"
                ? `/tracks/${currentTrack.track.slug}/complete`
                : `/tracks/${currentTrack.track.slug}`
            }
            className="motion-button-outline mt-4 inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 hover:border-ink-950/20"
          >
            {currentTrack.progress.status === "completed"
              ? t("actions.openCompletion")
              : t("actions.continueTrack")}
          </Link>
        </section>
      ) : null}
    </aside>
  );
}
