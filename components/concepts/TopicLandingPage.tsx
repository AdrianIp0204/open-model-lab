"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { RecommendedGoalPathSummary, TopicDiscoverySummary } from "@/lib/content";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  getConceptDisplaySubtopic,
  getConceptDisplayShortTitle,
  getConceptDisplaySummary,
  getConceptDisplayTitle,
  getStarterTrackDisplayTitle,
  getSubjectDisplayTitleFromValue,
  getTopicDisplayDescription,
  getTopicDisplayGroups,
  getTopicDisplayIntroduction,
  getTopicDisplayTitle,
  getTopicDisplayTitleFromValue,
} from "@/lib/i18n/content";
import {
  buildTopicStarterTrackRecommendations,
  getConceptProgressSummary,
  getConceptResurfacingCue,
  resolveAccountProgressSnapshot,
  selectAdaptiveReviewQueue,
  selectContinueLearning,
  useProgressSnapshot,
  type ProgressSnapshot,
} from "@/lib/progress";
import { formatProgressMonthDay } from "@/components/progress/dateFormatting";
import { StarterTrackRecommendationList } from "@/components/tracks/StarterTrackRecommendationList";
import { MasteryStateBadge } from "@/components/progress/MasteryStateBadge";
import { ProgressStatusBadge } from "@/components/progress/ProgressStatusBadge";
import { RecommendedGoalPathList } from "@/components/guided/RecommendedGoalPathList";
import { DisplayAd, MultiplexAd } from "@/components/ads/AdSlot";
import { PageSection } from "@/components/layout/PageSection";
import { LearningVisual } from "@/components/visuals/LearningVisual";
import {
  getConceptVisualDescriptor,
  getTopicVisualDescriptor,
} from "@/components/visuals/learningVisualDescriptors";
import { ConceptTile } from "./ConceptTile";
import { StarterTrackCard } from "./StarterTrackCard";

type TopicLandingPageProps = {
  topic: TopicDiscoverySummary;
  goalPaths?: RecommendedGoalPathSummary[];
  initialSyncedSnapshot?: ProgressSnapshot | null;
  leadIn?: ReactNode;
};

type ConceptTrackMembership = {
  trackSlug: string;
  trackTitle: string;
  stepIndex: number;
  totalSteps: number;
};

type TopicLandingCue = {
  label: string;
  note?: string;
  tone?: "teal" | "amber" | "coral" | "sky";
};

type TopicAction = {
  href: string;
  label: string;
  note: string;
};

function getWeakAreaCueLabel(
  candidate: Pick<
    ReturnType<typeof selectAdaptiveReviewQueue>[number],
    "reasonKind" | "primaryAction"
  >,
  t: (key: string, values?: Record<string, unknown>) => string,
) {
  switch (candidate.reasonKind) {
    case "missed-checks":
      return {
        label: t("cues.quickTestFollowUp"),
        tone: "coral" as const,
      };
    case "challenge":
      return {
        label: t("cues.challengeFollowUp"),
        tone: "amber" as const,
      };
    case "checkpoint":
      return {
        label: t("cues.checkpointRecovery"),
        tone: "amber" as const,
      };
    case "diagnostic":
      return {
        label: t("cues.entryDiagnostic"),
        tone: "sky" as const,
      };
    case "confidence":
      return {
        label: t("cues.needsConfidence"),
        tone: "amber" as const,
      };
    case "unfinished":
      return {
        label: t("cues.returnToFinish"),
        tone: "coral" as const,
      };
    default:
      return {
        label: t("cues.staleRevisit"),
        tone: "sky" as const,
      };
  }
}

const accentTopClasses: Record<TopicDiscoverySummary["accent"], string> = {
  teal: "from-teal-500/60 via-teal-500/14 to-transparent",
  amber: "from-amber-500/60 via-amber-500/14 to-transparent",
  coral: "from-coral-500/60 via-coral-500/14 to-transparent",
  sky: "from-sky-500/60 via-sky-500/14 to-transparent",
  ink: "from-ink-950/45 via-ink-950/10 to-transparent",
};

const accentPanelClasses: Record<TopicDiscoverySummary["accent"], string> = {
  teal: "border-teal-500/20 bg-teal-500/10",
  amber: "border-amber-500/20 bg-amber-500/10",
  coral: "border-coral-500/20 bg-coral-500/10",
  sky: "border-sky-500/20 bg-sky-500/10",
  ink: "border-ink-950/15 bg-ink-950/5",
};

const cueToneClasses = {
  teal: "border-teal-500/25 bg-teal-500/10 text-teal-700",
  amber: "border-amber-500/25 bg-amber-500/10 text-amber-700",
  coral: "border-coral-500/25 bg-coral-500/10 text-coral-700",
  sky: "border-sky-500/25 bg-sky-500/10 text-sky-700",
} as const;

function buildTrackMemberships(topic: TopicDiscoverySummary) {
  const memberships = new Map<string, ConceptTrackMembership[]>();

  for (const track of topic.starterTracks) {
    track.concepts.forEach((concept, index) => {
      const currentMemberships = memberships.get(concept.slug) ?? [];

      currentMemberships.push({
        trackSlug: track.slug,
        trackTitle: track.title,
        stepIndex: index,
        totalSteps: track.concepts.length,
      });

      memberships.set(concept.slug, currentMemberships);
    });
  }

  return memberships;
}

export function TopicLandingPage({
  topic,
  goalPaths = [],
  initialSyncedSnapshot = null,
  leadIn = null,
}: TopicLandingPageProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("TopicLandingPage");
  const tLoose = t as unknown as (key: string, values?: Record<string, unknown>) => string;
  const localSnapshot = useProgressSnapshot();
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const snapshot = progressDisplay.snapshot;
  const usingSyncedSnapshot = progressDisplay.source !== "local";
  const progressSource: "local" | "synced" =
    progressDisplay.source === "local" ? "local" : "synced";
  const topicTitle = getTopicDisplayTitle(topic, locale);
  const topicDescription = getTopicDisplayDescription(topic, locale);
  const topicIntroduction = getTopicDisplayIntroduction(topic, locale);
  const topicSubjectTitle = getSubjectDisplayTitleFromValue(topic.subject, locale);
  const topicVisual = getTopicVisualDescriptor({
    slug: topic.slug,
    title: topicTitle,
    subject: topicSubjectTitle,
    description: topicDescription,
    accent: topic.accent,
  });
  const displayStarterTracks = topic.starterTracks;
  const displayGroups = getTopicDisplayGroups(topic, locale);
  const topicTrackRecommendations = buildTopicStarterTrackRecommendations(
    snapshot,
    topic,
    {},
    locale,
  );
  const progressEntries = topic.concepts.map((concept) => ({
    concept,
    progress: getConceptProgressSummary(snapshot, concept),
  }));
  const progressBySlug = new Map(
    progressEntries.map((entry) => [entry.concept.slug, entry.progress]),
  );
  const touchedCount = progressEntries.filter(
    (entry) => entry.progress.status !== "not-started",
  ).length;
  const inProgressCount = progressEntries.filter(
    (entry) => entry.progress.status === "started" || entry.progress.status === "practiced",
  ).length;
  const completedCount = progressEntries.filter(
    (entry) => entry.progress.status === "completed",
  ).length;
  const continueLearning = selectContinueLearning(snapshot, topic.concepts, 2);
  const reviewQueue = selectAdaptiveReviewQueue(
    snapshot,
    topic.concepts,
    topic.starterTracks,
    2,
    {
      locale,
    },
  );
  const primaryReviewCandidate =
    reviewQueue.find((item) => item.concept.slug !== continueLearning.primary?.concept.slug) ??
    reviewQueue[0] ??
    null;
  const trackMembershipsBySlug = buildTrackMemberships(topic);
  const primaryResurfacingCue = continueLearning.primary
    ? getConceptResurfacingCue(continueLearning.primary)
    : null;
  const cueBySlug = new Map<string, TopicLandingCue>();

  if (continueLearning.primary) {
    cueBySlug.set(continueLearning.primary.concept.slug, {
      label: t("cues.continueHere"),
      tone: "teal",
      note: primaryResurfacingCue
        ? t("cueNotes.continueHereWithReason", {
            reason: primaryResurfacingCue.reason,
            progressLocation: usingSyncedSnapshot
              ? t("progressLocations.savedProgress")
              : t("progressLocations.thisBrowser"),
          })
        : t("cueNotes.continueHereWithoutReason", {
            progressLocation: usingSyncedSnapshot
              ? t("progressLocations.savedProgress")
              : t("progressLocations.thisBrowser"),
          }),
    });
  }

  if (primaryReviewCandidate && !cueBySlug.has(primaryReviewCandidate.concept.slug)) {
    const weakAreaCue = getWeakAreaCueLabel(primaryReviewCandidate, tLoose);
    cueBySlug.set(primaryReviewCandidate.concept.slug, {
      label: weakAreaCue.label,
      tone: weakAreaCue.tone,
      note: primaryReviewCandidate.reason,
    });
  }

  if (touchedCount === 0) {
    for (const concept of topic.featuredConcepts) {
      if (cueBySlug.has(concept.slug)) {
        continue;
      }

      cueBySlug.set(concept.slug, {
        label: t("cues.bestFirst"),
        tone: "teal",
        note: t("cueNotes.bestFirst"),
      });
    }
  }

  let primaryAction: TopicAction;

  if (continueLearning.primary) {
    primaryAction = {
      href: `/concepts/${continueLearning.primary.concept.slug}`,
      label: t("actions.continueConcept"),
      note: primaryResurfacingCue?.reason ?? continueLearning.primary.mastery.note,
    };
  } else if (primaryReviewCandidate) {
    primaryAction = {
      href: primaryReviewCandidate.primaryAction.href,
      label: primaryReviewCandidate.primaryAction.label,
      note: primaryReviewCandidate.reason,
    };
  } else if (topic.featuredConcepts[0]) {
    primaryAction = {
      href: `/concepts/${topic.featuredConcepts[0].slug}`,
      label: t("actions.startWithConcept", {
        title: getConceptDisplayShortTitle(topic.featuredConcepts[0], locale),
      }),
      note: t("notes.primaryFirstConcept"),
    };
  } else {
    primaryAction = {
      href: `/concepts/${topic.concepts[0]?.slug ?? ""}`,
      label: t("actions.openFirstConcept"),
      note: t("notes.primaryFallback"),
    };
  }

  let secondaryAction: TopicAction;

  if (continueLearning.primary && primaryReviewCandidate) {
    secondaryAction = {
      href: primaryReviewCandidate.primaryAction.href,
      label: primaryReviewCandidate.primaryAction.label,
      note: primaryReviewCandidate.reason,
    };
  } else if (!continueLearning.primary && displayStarterTracks[0]) {
    secondaryAction = {
      href: `/tracks/${displayStarterTracks[0].slug}`,
      label: t("actions.openStarterTrack"),
      note: t("notes.secondaryStarterTrack", {
        title: getStarterTrackDisplayTitle(displayStarterTracks[0], locale),
      }),
    };
  } else {
    secondaryAction = {
      href: "/concepts",
      label: t("actions.browseLibrary"),
      note: t("notes.secondaryBrowseLibrary"),
    };
  }

  return (
    <>
      {leadIn ? <div className="mb-6 space-y-3 sm:mb-8">{leadIn}</div> : null}
      <section className="space-y-5 sm:space-y-6">
        <PageSection
          id="topic-overview"
          as="section"
          className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(19rem,0.88fr)]"
        >
          <div className="page-hero-surface relative overflow-hidden p-6 sm:p-8">
            <div
              className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[topic.accent]}`}
            />
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="lab-label">{t("labels.topicLandingPage")}</span>
                <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {topicSubjectTitle}
                </span>
                <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {t("meta.concepts", { count: topic.conceptCount })}
                </span>
                <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {t("meta.minutes", { count: topic.estimatedStudyMinutes })}
                </span>
              </div>

              <div className="space-y-3">
                <h1 className="max-w-4xl text-[2.2rem] font-semibold leading-[1.02] text-ink-950 sm:text-[2.7rem]">
                  {topicTitle}
                </h1>
                <p className="line-clamp-2 max-w-3xl text-base leading-6 text-ink-700">
                  {topicDescription}
                </p>
                <p className="hidden max-w-3xl text-sm leading-6 text-ink-700 sm:block">
                  {topicIntroduction}
                </p>
              </div>
              <LearningVisual
                kind={topicVisual.kind}
                motif={topicVisual.motif}
                isFallback={topicVisual.isFallback}
                tone={topicVisual.tone ?? topic.accent}
                compact
                className="h-28"
              />

              <div className="flex flex-wrap gap-3">
                <Link
                  href={primaryAction.href}
                  className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                  data-testid="topic-primary-cta"
                  style={{ color: "var(--paper-strong)" }}
                >
                  {primaryAction.label}
                </Link>
                <Link
                  href={secondaryAction.href}
                  className="hidden items-center rounded-full border border-line bg-paper-strong px-5 py-3 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-950/20 sm:inline-flex"
                >
                  {secondaryAction.label}
                </Link>
              </div>
              <div className="hidden flex-wrap gap-3 sm:flex">
                {topic.sourceTopics.map((sourceTopic) => (
                  <span
                    key={sourceTopic}
                    className="progress-pill text-sm"
                  >
                    {t("labels.canonicalTopic", {
                      topic: getTopicDisplayTitleFromValue(sourceTopic, locale),
                    })}
                  </span>
                ))}
                <Link
                  href="/concepts"
                  className="motion-link inline-flex items-center text-sm font-medium text-ink-600 underline decoration-ink-300 underline-offset-4 hover:text-ink-950"
                >
                  {t("actions.browseLibrary")}
                </Link>
              </div>
            </div>
          </div>

          <aside className="grid gap-4">
            <div className="lab-panel p-5">
              <div className="space-y-2">
                <p className="lab-label">
                  {usingSyncedSnapshot
                    ? t("labels.savedTopicProgress")
                    : t("labels.localTopicProgress")}
                </p>
                <h2 className="text-2xl font-semibold text-ink-950">
                  {touchedCount
                    ? t("titles.savedCues", {
                        progressLocation: usingSyncedSnapshot
                          ? t("progressLocations.savedProgress")
                          : t("progressLocations.thisBrowser"),
                      })
                    : t("titles.noSavedProgress")}
                </h2>
                <p className="text-sm leading-6 text-ink-700">
                  {touchedCount
                    ? usingSyncedSnapshot
                      ? t("descriptions.savedCuesSynced")
                      : t("descriptions.savedCuesLocal")
                    : t("descriptions.noSavedProgress")}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-3">
                <div className="rounded-[20px] border border-line bg-paper-strong p-4">
                  <p className="text-sm font-semibold text-ink-950">{touchedCount}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
                    {t("stats.touchedHere")}
                  </p>
                </div>
                <div className="rounded-[20px] border border-line bg-paper-strong p-4">
                  <p className="text-sm font-semibold text-ink-950">{inProgressCount}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
                    {t("stats.inProgress")}
                  </p>
                </div>
                <div className="rounded-[20px] border border-line bg-paper-strong p-4">
                  <p className="text-sm font-semibold text-ink-950">{completedCount}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
                    {t("stats.completed")}
                  </p>
                </div>
              </div>
            </div>

            <div className={`rounded-[24px] border p-4 ${accentPanelClasses[topic.accent]}`}>
              <p className="lab-label">{t("labels.primaryAction")}</p>
              <p className="mt-3 text-lg font-semibold text-ink-950">{primaryAction.label}</p>
              <p className="mt-2 text-sm leading-6 text-ink-700">{primaryAction.note}</p>
              <p className="mt-3 text-sm leading-6 text-ink-600">
                {secondaryAction.note}
              </p>
            </div>

            {topic.relatedTopics.length || topicTrackRecommendations.length ? (
              <div className="rounded-[24px] border border-line bg-paper-strong p-4">
                <p className="lab-label">{t("labels.catalogContext")}</p>
                <p className="mt-3 text-lg font-semibold text-ink-950">
                  {t("catalogContext.title")}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-700">
                  {t("catalogContext.description")}
                </p>

                {topic.relatedTopics.length ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                      {t("catalogContext.relatedTopicPages")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {topic.relatedTopics.map((relatedTopic) => (
                        <Link
                          key={relatedTopic.slug}
                          href={relatedTopic.path}
                          className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold text-ink-800 transition-colors hover:border-ink-950/20 hover:text-ink-950"
                        >
                          {getTopicDisplayTitle(relatedTopic, locale)}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                {topicTrackRecommendations.length ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                      {t("catalogContext.recommendedPrerequisiteTracks")}
                    </p>
                    <StarterTrackRecommendationList
                      recommendations={topicTrackRecommendations}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </aside>
        </PageSection>

        <DisplayAd placement="topic.headerDisplay" />

        <PageSection id="topic-best-first-concepts" as="section" className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-2">
              <p className="lab-label">{t("labels.bestFirstConcepts")}</p>
              <h2 className="text-2xl font-semibold text-ink-950">
                {t("bestFirstConcepts.title")}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-ink-700">
                {t("bestFirstConcepts.description")}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {topic.featuredConcepts.map((concept) => {
              const progress = progressBySlug.get(concept.slug);
              const cue = cueBySlug.get(concept.slug);
              const visual = getConceptVisualDescriptor(concept);
              const lastActiveLabel = formatProgressMonthDay(
                progress?.lastActivityAt ?? null,
                progressSource,
              );

              return (
                <article
                  key={concept.slug}
                  className={`rounded-[24px] border p-4 ${accentPanelClasses[topic.accent]}`}
                >
                  <Link
                    href={`/concepts/${concept.slug}`}
                    aria-label={t("actions.openConcept")}
                    className="block rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                  >
                    <LearningVisual
                      kind={visual.kind}
                      motif={visual.motif}
                      isFallback={visual.isFallback}
                      tone={visual.tone ?? concept.accent}
                      compact
                      className="mb-4 h-24"
                    />
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    {cue ? (
                      <span
                        className={[
                          "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                          cueToneClasses[cue.tone ?? "sky"],
                        ].join(" ")}
                      >
                        {cue.label}
                      </span>
                    ) : null}
                    {progress ? <ProgressStatusBadge status={progress.status} compact /> : null}
                    {progress ? (
                      <MasteryStateBadge state={progress.mastery.state} compact />
                    ) : null}
                    {lastActiveLabel ? (
                      <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                        {lastActiveLabel}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-ink-950">
                    {getConceptDisplayTitle(concept, locale)}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-700">
                    {getConceptDisplaySummary(concept, locale)}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-ink-500">
                    {concept.subtopic
                      ? getConceptDisplaySubtopic(concept, locale)
                      : getTopicDisplayTitleFromValue(concept.topic, locale)}
                  </p>
                  {cue?.note ? (
                    <p className="mt-2 text-sm leading-6 text-ink-600">{cue.note}</p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {concept.highlights.slice(0, 3).map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-700"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/concepts/${concept.slug}`}
                    className="mt-4 inline-flex items-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                    style={{ color: "var(--paper-strong)" }}
                  >
                    {t("actions.openConcept")}
                  </Link>
                </article>
              );
            })}
          </div>
        </PageSection>

        {displayStarterTracks.length ? (
          <PageSection id="topic-related-tracks" as="section" className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-2">
                <p className="lab-label">{t("labels.relatedGuidedTracks")}</p>
                <h2 className="text-2xl font-semibold text-ink-950">
                  {t("relatedTracks.title")}
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-ink-700">
                  {t("relatedTracks.description")}
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {displayStarterTracks.map((track) => (
                <StarterTrackCard
                  key={track.slug}
                  track={track}
                  variant="compact"
                  initialSyncedSnapshot={initialSyncedSnapshot}
                />
              ))}
            </div>
          </PageSection>
        ) : null}

        {goalPaths.length ? (
          <PageSection id="topic-learning-goals" as="section" className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-2">
                <p className="lab-label">{t("labels.learningGoals")}</p>
                <h2 className="text-2xl font-semibold text-ink-950">
                  {t("learningGoals.title")}
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-ink-700">
                  {t("learningGoals.description")}
                </p>
              </div>
              <Link
                href="/guided"
                className="inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-3 text-sm font-medium text-ink-950 transition-colors hover:border-ink-950/25"
              >
                {t("actions.viewAllGuidedGoals")}
              </Link>
            </div>

            <RecommendedGoalPathList
              goalPaths={goalPaths}
              variant="compact"
              initialSyncedSnapshot={initialSyncedSnapshot}
            />
          </PageSection>
        ) : null}

        <PageSection id="topic-grouped-overview" as="section" className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-2">
              <p className="lab-label">{t("labels.groupedOverview")}</p>
              <h2 className="text-2xl font-semibold text-ink-950">
                {t("groupedOverview.title")}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-ink-700">
                {t("groupedOverview.description")}
              </p>
            </div>
            <Link
              href="/concepts"
              className="inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-3 text-sm font-medium text-ink-950 transition-colors hover:border-ink-950/25"
            >
              {t("actions.backToConceptLibrary")}
            </Link>
          </div>

          <div className="grid gap-5">
            {displayGroups.map((group, index) => (
              <section key={group.id} className="lab-panel p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="lab-label">
                      {t("groupedOverview.groupLabel", {
                        number: String(index + 1).padStart(2, "0"),
                      })}
                    </p>
                    <h3 className="text-xl font-semibold text-ink-950">{group.title}</h3>
                    {group.description ? (
                      <p className="max-w-3xl text-sm leading-6 text-ink-700">
                        {group.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-600">
                      {t("meta.concepts", { count: group.conceptCount })}
                    </span>
                    <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-600">
                      {t("meta.minutes", { count: group.estimatedStudyMinutes })}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  {group.concepts.map((concept) => (
                    <ConceptTile
                      key={concept.slug}
                      concept={concept}
                      layout="list"
                      trackMemberships={trackMembershipsBySlug.get(concept.slug) ?? []}
                      libraryCue={cueBySlug.get(concept.slug) ?? null}
                      progressSummary={progressBySlug.get(concept.slug) ?? null}
                      progressSource={progressSource}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </PageSection>

        <MultiplexAd placement="topic.footerMultiplex" />
      </section>
    </>
  );
}
