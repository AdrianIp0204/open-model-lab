"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type {
  ConceptSummary,
  ExpandedSubjectSpotlight,
  GuidedCollectionSummary,
  TopicDiscoverySummary,
  StartLearningCommitment,
  StartLearningConfidence,
  StartLearningInterest,
  StartLearningRecommendation,
  StarterTrackSummary,
  SubjectDiscoverySummary,
} from "@/lib/content";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import {
  buildStartLearningSubjectChoices,
  getStartLearningRecommendationSet,
  startLearningCommitmentOptions,
  startLearningConfidenceOptions,
  startLearningInterestNotSure,
} from "@/lib/content";
import {
  getConceptDisplayHighlights,
  getConceptDisplayShortTitle,
  getConceptDisplayTitle,
  getStarterTrackDisplayHighlights,
  getStarterTrackDisplaySummary,
  getStarterTrackDisplayTitle,
  getSubjectDisplayTitle,
  getTopicDisplayTitle,
} from "@/lib/i18n/content";
import {
  buildFreeTierProgressRecapSummary,
  buildStartLearningResumeSummary,
  resolveAccountProgressSnapshot,
  useProgressSnapshot,
  type ProgressSnapshot,
} from "@/lib/progress";
import { MasteryStateBadge } from "@/components/progress/MasteryStateBadge";
import { FreeTierProgressRecapPanel } from "@/components/progress/FreeTierProgressRecapPanel";
import { ProgressStatusBadge } from "@/components/progress/ProgressStatusBadge";
import { formatProgressMonthDay } from "@/components/progress/dateFormatting";
import { ExpandedSubjectSpotlightGrid } from "@/components/concepts/ExpandedSubjectSpotlightGrid";
import { DisclosurePanel } from "@/components/layout/DisclosurePanel";
import { PageSection } from "@/components/layout/PageSection";
import {
  LearningVisual,
  type LearningVisualKind,
} from "@/components/visuals/LearningVisual";

type StartLearningPageProps = {
  locale?: AppLocale;
  subjects: SubjectDiscoverySummary[];
  concepts: Array<
    Pick<ConceptSummary, "id" | "slug" | "title" | "subject" | "shortTitle">
  >;
  starterTracks: StarterTrackSummary[];
  guidedCollections?: GuidedCollectionSummary[];
  initialSyncedSnapshot?: ProgressSnapshot | null;
  initialSubjectSlug?: string | null;
  expandedSubjectSpotlights?: ExpandedSubjectSpotlight[];
  leadIn?: ReactNode;
};

function getInterestButtonLabel(
  subject: SubjectDiscoverySummary | null,
  interest: StartLearningInterest,
  t: ReturnType<typeof useTranslations<"StartLearningPage">>,
  locale: AppLocale,
) {
  if (interest === startLearningInterestNotSure || !subject) {
    return t("filters.interest.notSure");
  }

  return getSubjectDisplayTitle(subject, locale);
}

function getSubjectSummaryByInterest(
  subjects: SubjectDiscoverySummary[],
  interest: StartLearningInterest,
) {
  if (interest === startLearningInterestNotSure) {
    return null;
  }

  return subjects.find((subject) => subject.slug === interest) ?? null;
}

function getRecommendationPanelTone(
  emphasis: "primary" | "secondary" | "browse",
  accent: StartLearningRecommendation["accent"],
) {
  if (emphasis === "primary") {
    return "border-ink-950/15 bg-paper-strong";
  }

  const accentClasses = {
    teal: "border-teal-500/20 bg-teal-500/10",
    amber: "border-amber-500/20 bg-amber-500/10",
    coral: "border-coral-500/20 bg-coral-500/10",
    sky: "border-sky-500/20 bg-sky-500/10",
    ink: "border-line bg-paper",
  } as const;

  return accentClasses[accent];
}

function InterestButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "filter-option min-h-11 px-4 py-2.5 text-sm font-semibold",
        active
          ? "border-ink-950 bg-ink-950 text-paper-strong"
          : "bg-paper-strong text-ink-900 hover:border-ink-950/25",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function RecommendationCard({
  recommendation,
  emphasis,
  locale,
  subjects,
  concepts,
  starterTracks,
  t,
}: {
  recommendation: StartLearningRecommendation;
  emphasis: "primary" | "secondary" | "browse";
  locale: AppLocale;
  subjects: SubjectDiscoverySummary[];
  concepts: Array<
    Pick<ConceptSummary, "id" | "slug" | "title" | "subject" | "shortTitle">
  >;
  starterTracks: StarterTrackSummary[];
  t: ReturnType<typeof useTranslations<"StartLearningPage">>;
}) {
  const conceptBySlug = useMemo(
    () => new Map(concepts.map((concept) => [concept.slug, concept])),
    [concepts],
  );
  const subjectBySlug = useMemo(
    () => new Map(subjects.map((subject) => [subject.slug, subject])),
    [subjects],
  );
  const topicBySlug = useMemo(() => {
    const entries: Array<[string, TopicDiscoverySummary]> = [];

    for (const subject of subjects) {
      for (const topic of subject.topics) {
        entries.push([topic.slug, topic]);
      }
    }

    return new Map(entries);
  }, [subjects]);
  const trackBySlug = useMemo(() => {
    const entries = new Map<string, StarterTrackSummary>();

    for (const subject of subjects) {
      for (const track of [...subject.starterTracks, ...subject.bridgeStarterTracks]) {
        entries.set(track.slug, track);
      }
    }

    for (const track of starterTracks) {
      entries.set(track.slug, track);
    }

    return entries;
  }, [starterTracks, subjects]);
  const localizedSubject = recommendation.subjectSlug
    ? subjectBySlug.get(recommendation.subjectSlug) ?? null
    : null;
  const localizedSubjectTitle = localizedSubject
    ? getSubjectDisplayTitle(localizedSubject, locale)
    : recommendation.subjectTitle;
  const display = useMemo(() => {
    if (recommendation.kind === "concept" && recommendation.entitySlug) {
      const concept = conceptBySlug.get(recommendation.entitySlug);
      const title = concept
        ? getConceptDisplayTitle(concept, locale)
        : recommendation.title;
      const shortTitle = concept
        ? getConceptDisplayShortTitle(concept, locale)
        : title;
      const highlights = concept
        ? getConceptDisplayHighlights({ slug: concept.slug, highlights: recommendation.highlights }, locale)
        : recommendation.highlights;

      return {
        title,
        note: localizedSubjectTitle
          ? t("recommendations.notes.conceptSubject", {
              subject: localizedSubjectTitle,
            })
          : t("recommendations.notes.concept"),
        actionLabel: t("recommendations.actions.startConcept", {
          title: shortTitle,
        }),
        kindLabel: t("recommendations.kinds.concept"),
        subjectTitle: localizedSubjectTitle,
        highlights,
      };
    }

    if (recommendation.kind === "topic" && recommendation.entitySlug) {
      const topic = topicBySlug.get(recommendation.entitySlug);
      const title = topic ? getTopicDisplayTitle(topic, locale) : recommendation.title;

      return {
        title,
        note: localizedSubjectTitle
          ? t("recommendations.notes.topicSubject", {
              subject: localizedSubjectTitle,
            })
          : t("recommendations.notes.topic"),
        actionLabel: t("recommendations.actions.openTopic", { title }),
        kindLabel: t("recommendations.kinds.topic"),
        subjectTitle: localizedSubjectTitle,
        highlights: recommendation.highlights,
      };
    }

    if (recommendation.kind === "track" && recommendation.entitySlug) {
      const track = trackBySlug.get(recommendation.entitySlug);
      const title = track ? getStarterTrackDisplayTitle(track, locale) : recommendation.title;
      const highlights = track
        ? getStarterTrackDisplayHighlights(track, locale)
        : recommendation.highlights;

      return {
        title,
        note: localizedSubjectTitle
          ? t("recommendations.notes.trackSubject", {
              subject: localizedSubjectTitle,
            })
          : t("recommendations.notes.track"),
        actionLabel: t("recommendations.actions.startTrack", { title }),
        kindLabel: t("recommendations.kinds.track"),
        subjectTitle: localizedSubjectTitle,
        highlights,
      };
    }

    if (recommendation.subjectSlug && localizedSubject) {
      const subjectTitle = getSubjectDisplayTitle(localizedSubject, locale);

      return {
        title: t("recommendations.titles.subjectPage", { subject: subjectTitle }),
        note: t("recommendations.notes.subjectDirectorySubject", {
          subject: subjectTitle,
        }),
        actionLabel: t("recommendations.actions.openSubject", { subject: subjectTitle }),
        kindLabel: t("recommendations.kinds.subjectDirectory"),
        subjectTitle,
        highlights: localizedSubject.featuredTopics
          .slice(0, 3)
          .map((topic) => getTopicDisplayTitle(topic, locale)),
      };
    }

    return {
      title: t("recommendations.titles.browseAllSubjects"),
      note: t("recommendations.notes.subjectDirectoryAll"),
      actionLabel: t("recommendations.actions.browseAllSubjects"),
      kindLabel: t("recommendations.kinds.subjectDirectory"),
      subjectTitle: null,
      highlights: [
        t("recommendations.highlights.subjectMaps"),
        t("recommendations.highlights.starterTracks"),
        t("recommendations.highlights.bestFirstConcepts"),
      ],
    };
  }, [
    conceptBySlug,
    locale,
    localizedSubject,
    localizedSubjectTitle,
    recommendation,
    t,
    topicBySlug,
    trackBySlug,
  ]);
  const visualKind: LearningVisualKind =
    recommendation.kind === "concept"
      ? "simulation"
      : recommendation.kind === "topic"
        ? "topic"
        : recommendation.kind === "track"
          ? "guided"
          : "subject";

  return (
    <article
      className={[
        emphasis === "primary" ? "feature-card p-5 sm:p-6" : "page-band p-5",
        getRecommendationPanelTone(emphasis, recommendation.accent),
      ].join(" ")}
    >
      <Link
        href={recommendation.href}
        aria-label={display.actionLabel}
        className="mb-4 block rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        <LearningVisual
          kind={visualKind}
          tone={recommendation.accent}
          compact
          className="h-24"
        />
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <span className="lab-label">
          {emphasis === "primary"
            ? t("recommendations.emphasis.primary")
            : emphasis === "secondary"
              ? t("recommendations.emphasis.secondary")
              : t("recommendations.emphasis.browse")}
        </span>
        <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
          {display.kindLabel}
        </span>
        {display.subjectTitle ? (
          <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
            {display.subjectTitle}
          </span>
        ) : null}
      </div>
      <h2 className="mt-3 text-xl font-semibold text-ink-950">
        {display.title}
      </h2>
      <p className="mt-2 text-base leading-7 text-ink-700">
        {display.note}
      </p>
      {display.highlights.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {display.highlights.map((item) => (
            <span
              key={item}
              className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-700"
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}
      <Link
        href={recommendation.href}
        className={[
          "mt-5 inline-flex items-center",
          emphasis === "primary" ? "cta-primary" : "cta-secondary",
        ].join(" ")}
      >
        {display.actionLabel}
      </Link>
    </article>
  );
}

export function StartLearningPage({
  locale = "en",
  subjects,
  concepts,
  starterTracks,
  guidedCollections = [],
  initialSyncedSnapshot = null,
  initialSubjectSlug = null,
  expandedSubjectSpotlights = [],
  leadIn = null,
}: StartLearningPageProps) {
  const t = useTranslations("StartLearningPage");
  const localSnapshot = useProgressSnapshot();
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const resumeSummary = buildStartLearningResumeSummary(
    progressDisplay.snapshot,
    concepts,
    starterTracks,
    subjects,
    locale,
  );
  const subjectChoices = buildStartLearningSubjectChoices(subjects);
  const initialInterest =
    (initialSubjectSlug &&
    subjectChoices.some((choice) => choice.subject.slug === initialSubjectSlug)
      ? initialSubjectSlug
      : resumeSummary.activeSubject?.slug) ?? startLearningInterestNotSure;
  const defaultCommitment: StartLearningCommitment =
    resumeSummary.hasRecordedProgress || initialSubjectSlug
      ? "deeper-path"
      : "quick-start";
  const [interest, setInterest] = useState<StartLearningInterest>(initialInterest);
  const [confidence, setConfidence] = useState<StartLearningConfidence>(
    resumeSummary.hasRecordedProgress ? "know-some-basics" : "brand-new",
  );
  const [commitment, setCommitment] = useState<StartLearningCommitment>(
    defaultCommitment,
  );
  const activeSubject = getSubjectSummaryByInterest(subjects, interest);
  const recommendations = getStartLearningRecommendationSet(subjectChoices, {
    interest,
    confidence,
    commitment,
  });
  const conceptBySlug = useMemo(
    () => new Map(concepts.map((concept) => [concept.slug, concept])),
    [concepts],
  );
  const trackBySlug = useMemo(
    () => new Map(starterTracks.map((track) => [track.slug, track])),
    [starterTracks],
  );
  const freeTierRecap = buildFreeTierProgressRecapSummary({
    snapshot: progressDisplay.snapshot,
    concepts,
    starterTracks,
    guidedCollections,
    subjects,
    locale,
  });
  const progressSourceLabel =
    progressDisplay.source === "merged"
      ? t("progressSource.merged")
      : progressDisplay.source === "synced"
        ? t("progressSource.synced")
        : t("progressSource.local");
  const primaryConceptLastActive = formatProgressMonthDay(
    resumeSummary.primaryConcept?.lastActivityAt ?? null,
    progressDisplay.source === "local" ? "local" : "synced",
  );
  const currentTrackLastActive = formatProgressMonthDay(
    resumeSummary.currentTrack?.progress.lastActivityAt ?? null,
    progressDisplay.source === "local" ? "local" : "synced",
  );
  const activeSubjectTitle = activeSubject
    ? getSubjectDisplayTitle(activeSubject, locale)
    : t("chooser.selected");
  const primaryConceptSummary = resumeSummary.primaryConcept
    ? conceptBySlug.get(resumeSummary.primaryConcept.slug) ?? resumeSummary.primaryConcept
    : null;
  const primaryConceptTitle = primaryConceptSummary
    ? getConceptDisplayTitle(primaryConceptSummary, locale)
    : null;
  const currentTrackSummary =
    resumeSummary.currentTrack?.track
      ? trackBySlug.get(resumeSummary.currentTrack.track.slug) ??
        resumeSummary.currentTrack.track
      : null;
  const currentTrackTitle = currentTrackSummary
    ? getStarterTrackDisplayTitle(currentTrackSummary, locale)
    : null;
  const currentTrackBody = currentTrackSummary
    ? getStarterTrackDisplaySummary(currentTrackSummary, locale)
    : null;
  return (
    <>
    {leadIn ? <div className="mb-6 space-y-3 sm:mb-8">{leadIn}</div> : null}
    <section className="space-y-5 sm:space-y-6">
      <PageSection
        id="start-overview"
        as="section"
        className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(19rem,0.92fr)]"
      >
        <article className="page-hero-surface p-6 sm:p-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="lab-label">
                {resumeSummary.hasRecordedProgress ? progressSourceLabel : t("overview.startHere")}
              </span>
              {resumeSummary.activeSubject ? (
                <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {getSubjectDisplayTitle(resumeSummary.activeSubject, locale)}
                </span>
              ) : null}
            </div>

            {resumeSummary.primaryConcept ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <ProgressStatusBadge
                    status={resumeSummary.primaryConcept.status}
                    compact
                  />
                  <MasteryStateBadge
                    state={resumeSummary.primaryConcept.masteryState}
                    compact
                  />
                  {primaryConceptLastActive ? (
                    <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {primaryConceptLastActive}
                    </span>
                  ) : null}
                </div>
                <h1 className="text-[2.2rem] font-semibold leading-[1.02] text-ink-950 sm:text-[2.7rem]">
                  {t("overview.resumeConceptTitle")}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-ink-700">
                  {resumeSummary.primaryConcept.resumeReason ??
                    t("overview.resumeConceptFallback")}{" "}
                  {resumeSummary.primaryConcept.masteryNote}
                </p>
                <div className="page-band p-5">
                  <p className="text-sm font-semibold text-ink-950">
                    {primaryConceptTitle ?? resumeSummary.primaryConcept.title}
                  </p>
                  <p className="mt-2 text-base leading-7 text-ink-700">
                    {t("overview.resumeConceptCard")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/concepts/${resumeSummary.primaryConcept.slug}`}
                      className="cta-primary"
                      data-testid="start-primary-cta"
                    >
                      {t("actions.continueConcept")}
                    </Link>
                    {resumeSummary.activeSubject ? (
                      <Link
                        href={resumeSummary.activeSubject.path}
                        className="cta-secondary"
                      >
                        {t("actions.continueSubject")}
                      </Link>
                    ) : null}
                    <Link
                      href="#start-new"
                      className="cta-secondary"
                    >
                      {t("actions.startSomethingNew")}
                    </Link>
                  </div>
                </div>
              </>
            ) : resumeSummary.currentTrack ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                    {t("overview.trackProgress", {
                      completed: resumeSummary.currentTrack.progress.completedFlowCount,
                      total: resumeSummary.currentTrack.progress.totalFlowCount,
                    })}
                  </span>
                  {currentTrackLastActive ? (
                    <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {currentTrackLastActive}
                    </span>
                  ) : null}
                </div>
                <h1 className="text-[2.2rem] font-semibold leading-[1.02] text-ink-950 sm:text-[2.7rem]">
                  {t("overview.resumeTrackTitle")}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-ink-700">
                  {resumeSummary.currentTrack.primaryAction?.note ??
                    t("overview.resumeTrackFallback", {
                      title: currentTrackTitle ?? resumeSummary.currentTrack.track.title,
                    })}
                </p>
                <div className="page-band p-5">
                  <p className="text-sm font-semibold text-ink-950">
                    {currentTrackTitle ?? resumeSummary.currentTrack.track.title}
                  </p>
                  <p className="mt-2 text-base leading-7 text-ink-700">
                    {currentTrackBody ?? resumeSummary.currentTrack.track.summary}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={
                        resumeSummary.currentTrack.primaryAction?.href ??
                        `/tracks/${resumeSummary.currentTrack.track.slug}`
                      }
                      className="cta-primary"
                      data-testid="start-primary-cta"
                    >
                      {resumeSummary.currentTrack.primaryAction?.label ??
                        t("actions.continueTrack", {
                          title: currentTrackTitle ?? resumeSummary.currentTrack.track.title,
                        })}
                    </Link>
                    <Link
                      href="#start-new"
                      className="cta-secondary"
                    >
                      {t("actions.startSomethingNew")}
                    </Link>
                  </div>
                </div>
              </>
            ) : resumeSummary.reviewAction ? (
              <>
                <h1 className="text-[2.2rem] font-semibold leading-[1.02] text-ink-950 sm:text-[2.7rem]">
                  {t("overview.resumeReviewTitle")}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-ink-700">
                  {t("overview.resumeReviewDescription")}
                </p>
                <div className="page-band p-5">
                  <p className="text-sm font-semibold text-ink-950">
                    {resumeSummary.reviewAction.note}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={resumeSummary.reviewAction.href}
                      className="cta-primary"
                      data-testid="start-primary-cta"
                    >
                      {resumeSummary.reviewAction.label}
                    </Link>
                    <Link
                      href="#start-new"
                      className="cta-secondary"
                    >
                      {t("actions.startSomethingNew")}
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-[2.2rem] font-semibold leading-[1.02] text-ink-950 sm:text-[2.7rem]">
                  {t("overview.freshStartTitle")}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-ink-700">
                  {t("overview.freshStartDescription")}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={recommendations.primary.href}
                    className="cta-primary"
                    data-testid="start-primary-cta"
                  >
                    {recommendations.primary.actionLabel}
                  </Link>
                  <Link
                    href="#start-new"
                    className="cta-secondary"
                  >
                    {t("actions.choosePath")}
                  </Link>
                </div>
              </>
            )}
          </div>
        </article>

        <aside className="grid gap-4">
          <article className="page-band p-5">
            <div className="space-y-3">
              <p className="lab-label">{t("chooser.currentLabel")}</p>
              <h2 className="text-xl font-semibold text-ink-950">
                {getInterestButtonLabel(activeSubject, interest, t, locale)}
              </h2>
              <div className="flex flex-wrap gap-2 text-sm text-ink-700">
                <span className="rounded-full border border-line bg-paper-strong px-3 py-1.5 font-medium">
                  {t("filters.interest.label")}: {getInterestButtonLabel(activeSubject, interest, t, locale)}
                </span>
                <span className="rounded-full border border-line bg-paper-strong px-3 py-1.5 font-medium">
                  {t("filters.confidence.label")}: {t(`filters.confidence.${confidence}`)}
                </span>
                <span className="rounded-full border border-line bg-paper-strong px-3 py-1.5 font-medium">
                  {t("filters.commitment.label")}: {t(`filters.commitment.${commitment}`)}
                </span>
              </div>
              <p className="text-base leading-7 text-ink-700">
                {interest === startLearningInterestNotSure
                  ? t("chooser.notSureDescription")
                  : t("chooser.subjectDescription", {
                      subject: activeSubjectTitle,
                    })}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={recommendations.primary.href}
                className="cta-primary"
                  >
                {recommendations.primary.actionLabel}
              </Link>
              <Link
                href={recommendations.browse.href}
                className="cta-secondary"
              >
                {recommendations.browse.actionLabel}
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={
                  activeSubject
                    ? `/search?subject=${encodeURIComponent(activeSubject.slug)}`
                    : "/search"
                }
                className="motion-link inline-flex items-center text-sm font-medium text-ink-600 underline decoration-ink-300 underline-offset-4 hover:text-ink-950"
              >
                {t("actions.searchDirectly")}
              </Link>
              <Link
                href="/concepts/subjects"
                className="motion-link inline-flex items-center text-sm font-medium text-ink-600 underline decoration-ink-300 underline-offset-4 hover:text-ink-950"
              >
                {t("actions.browseAllSubjects")}
              </Link>
            </div>
          </article>
        </aside>
      </PageSection>

      {freeTierRecap.hasRecordedProgress ? (
        <FreeTierProgressRecapPanel
          summary={freeTierRecap}
          progressDateSource={
            progressDisplay.source === "local" ? "local" : "synced"
          }
          progressSourceLabel={progressSourceLabel}
          eyebrow={t("savedTraction.eyebrow")}
          title={t("savedTraction.title")}
          description={t("savedTraction.description")}
          browseHref="/challenges"
          browseLabel={t("savedTraction.browseLabel")}
        />
      ) : null}

      <PageSection id="start-new" as="section" className="space-y-5">
        <div className="space-y-2">
          <p className="section-kicker">{t("chooser.eyebrow")}</p>
          <h2 className="text-2xl font-semibold text-ink-950">
            {t("chooser.title")}
          </h2>
          <p className="max-w-3xl text-base leading-7 text-ink-700">
            {t("chooser.description")}
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <article className="filter-panel p-5" data-onboarding-target="start-chooser">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-ink-950">{t("filters.interest.label")}</p>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <InterestButton
                    active={interest === startLearningInterestNotSure}
                    label={t("filters.interest.notSure")}
                    onClick={() => setInterest(startLearningInterestNotSure)}
                  />
                  {subjects.map((subject) => (
                    <InterestButton
                      key={subject.slug}
                      active={interest === subject.slug}
                      label={getSubjectDisplayTitle(subject, locale)}
                      onClick={() => setInterest(subject.slug)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-ink-950">{t("filters.confidence.label")}</p>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {startLearningConfidenceOptions.map((value) => (
                    <InterestButton
                      key={value}
                      active={confidence === value}
                      label={t(`filters.confidence.${value}`)}
                      onClick={() => setConfidence(value)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-ink-950">{t("filters.commitment.label")}</p>
                <p className="text-sm leading-6 text-ink-600">
                  {t("filters.commitment.helper")}
                </p>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {startLearningCommitmentOptions.map((value) => (
                    <InterestButton
                      key={value}
                      active={commitment === value}
                      label={t(`filters.commitment.${value}`)}
                      onClick={() => setCommitment(value)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </article>

          <div className="grid gap-4" data-onboarding-target="start-recommendations">
            <RecommendationCard
              recommendation={recommendations.primary}
              emphasis="primary"
              locale={locale}
              subjects={subjects}
              concepts={concepts}
              starterTracks={starterTracks}
              t={t}
            />
            <div className="grid gap-4 lg:grid-cols-2">
              {recommendations.alternate ? (
                <RecommendationCard
                  recommendation={recommendations.alternate}
                  emphasis="secondary"
                  locale={locale}
                  subjects={subjects}
                  concepts={concepts}
                  starterTracks={starterTracks}
                  t={t}
                />
              ) : null}
              <RecommendationCard
                recommendation={recommendations.browse}
                emphasis="browse"
                locale={locale}
                subjects={subjects}
                concepts={concepts}
                starterTracks={starterTracks}
                t={t}
              />
            </div>
          </div>
        </div>
      </PageSection>

      {expandedSubjectSpotlights.length ? (
        <PageSection id="start-subject-spotlights" as="section">
          <DisclosurePanel
            eyebrow={t("spotlights.eyebrow")}
            title={t("spotlights.title")}
            summary={t("spotlights.description")}
          >
            <ExpandedSubjectSpotlightGrid
              spotlights={expandedSubjectSpotlights}
              variant="compact"
            />
          </DisclosurePanel>
        </PageSection>
      ) : null}

      <DisclosurePanel
        eyebrow={t("howItWorks.label")}
        title={t("howItWorks.title")}
        summary={t("howItWorks.description")}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[20px] border border-line bg-paper-strong p-4">
            <p className="text-sm font-semibold text-ink-950">{t("howItWorks.cards.resume.title")}</p>
            <p className="mt-1.5 text-sm leading-5 text-ink-700">
              {t("howItWorks.cards.resume.body")}
            </p>
          </div>
          <div className="rounded-[20px] border border-line bg-paper-strong p-4">
            <p className="text-sm font-semibold text-ink-950">{t("howItWorks.cards.tracks.title")}</p>
            <p className="mt-1.5 text-sm leading-5 text-ink-700">
              {t("howItWorks.cards.tracks.body")}
            </p>
          </div>
          <div className="rounded-[20px] border border-line bg-paper-strong p-4">
            <p className="text-sm font-semibold text-ink-950">{t("howItWorks.cards.scoring.title")}</p>
            <p className="mt-1.5 text-sm leading-5 text-ink-700">
              {t("howItWorks.cards.scoring.body")}
            </p>
          </div>
        </div>
      </DisclosurePanel>
    </section>
    </>
  );
}
