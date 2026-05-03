import type { ReactNode } from "react";
import { DisplayAd, MultiplexAd } from "@/components/ads/AdSlot";
import { PageSection } from "@/components/layout/PageSection";
import { LearningVisual } from "@/components/visuals/LearningVisual";
import { getSubjectVisualDescriptor } from "@/components/visuals/learningVisualDescriptors";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { getScopedTranslator } from "@/i18n/server";
import type { SubjectDiscoverySummary } from "@/lib/content";
import {
  getConceptDisplayShortTitle,
  getStarterTrackDisplayTitle,
  getSubjectDisplayDescription,
  getSubjectDisplayIntroduction,
  getSubjectDisplayTitle,
  getTopicDisplayTitle,
} from "@/lib/i18n/content";
import type { ProgressSnapshot } from "@/lib/progress";
import { ConceptTile } from "./ConceptTile";
import { StarterTrackCard } from "./StarterTrackCard";
import { SubjectLandingProgressPanel } from "./SubjectLandingProgressPanel";
import { TopicDiscoveryCard } from "./TopicDiscoveryCard";

type SubjectLandingPageProps = {
  subject: SubjectDiscoverySummary;
  initialSyncedSnapshot?: ProgressSnapshot | null;
  leadIn?: ReactNode;
  locale?: AppLocale;
};

const accentTopClasses: Record<SubjectDiscoverySummary["accent"], string> = {
  teal: "from-teal-500/60 via-teal-500/14 to-transparent",
  amber: "from-amber-500/60 via-amber-500/14 to-transparent",
  coral: "from-coral-500/60 via-coral-500/14 to-transparent",
  sky: "from-sky-500/60 via-sky-500/14 to-transparent",
  ink: "from-ink-950/45 via-ink-950/10 to-transparent",
};

function getSubjectConceptBrowsePath(subject: SubjectDiscoverySummary) {
  return `/concepts?subject=${encodeURIComponent(subject.title)}`;
}

export async function SubjectLandingPage({
  subject,
  initialSyncedSnapshot = null,
  leadIn = null,
  locale = routing.defaultLocale,
}: SubjectLandingPageProps) {
  const t = await getScopedTranslator(locale, "SubjectLandingPage");
  const subjectTitle = getSubjectDisplayTitle(subject, locale);
  const subjectDescription = getSubjectDisplayDescription(subject, locale);
  const subjectIntroduction = getSubjectDisplayIntroduction(subject, locale);
  const firstTrack = subject.featuredStarterTracks[0] ?? subject.starterTracks[0] ?? null;
  const firstTopic = subject.featuredTopics[0] ?? subject.topics[0] ?? null;
  const firstConcept = subject.featuredConcepts[0] ?? subject.concepts[0] ?? null;
  const subjectVisual = getSubjectVisualDescriptor(subject);
  return (
    <>
      {leadIn ? <div className="mb-6 space-y-3 sm:mb-8">{leadIn}</div> : null}
      <section className="space-y-5 sm:space-y-6">
        <PageSection
          id="subject-overview"
          as="section"
          className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(19rem,0.88fr)]"
        >
          <div className="page-hero-surface relative overflow-hidden p-6 sm:p-8">
            <div
              className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[subject.accent]}`}
            />
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="lab-label">{t("labels.subjectEntry")}</span>
                <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {t("meta.topics", { count: subject.topicCount })}
                </span>
                <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {t("meta.concepts", { count: subject.conceptCount })}
                </span>
                <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {t("meta.minutes", { count: subject.estimatedStudyMinutes })}
                </span>
              </div>

              <div className="space-y-3">
                <h1 className="max-w-4xl text-[2.2rem] font-semibold leading-[1.02] text-ink-950 sm:text-[2.7rem]">
                  {subjectTitle}
                </h1>
                <p className="max-w-3xl text-base leading-6 text-ink-700">
                  {subjectDescription}
                </p>
                <p className="max-w-3xl text-sm leading-6 text-ink-700">
                  {subjectIntroduction}
                </p>
              </div>
              <LearningVisual
                kind={subjectVisual.kind}
                motif={subjectVisual.motif}
                overlay={subjectVisual.overlay}
                isFallback={subjectVisual.isFallback}
                fallbackKind={subjectVisual.fallbackKind}
                tone={subjectVisual.tone ?? subject.accent}
                compact
                className="h-28"
              />

              <div className="flex flex-wrap gap-3">
                {firstTrack ? (
                  <Link
                    href={`/tracks/${firstTrack.slug}`}
                    className="motion-button-solid inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold"
                    data-testid="subject-primary-cta"
                    style={{ color: "var(--paper-strong)" }}
                  >
                    {t("actions.startTrack", {
                      title: getStarterTrackDisplayTitle(firstTrack, locale),
                    })}
                  </Link>
                ) : firstConcept ? (
                  <Link
                    href={`/concepts/${firstConcept.slug}`}
                    className="motion-button-solid inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold"
                    data-testid="subject-primary-cta"
                    style={{ color: "var(--paper-strong)" }}
                  >
                    {t("actions.startConcept", {
                      title: getConceptDisplayShortTitle(firstConcept, locale),
                    })}
                  </Link>
                ) : null}
                {firstTopic ? (
                  <Link
                    href={`/concepts/topics/${firstTopic.slug}`}
                    className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-3 text-sm font-semibold text-ink-950 hover:border-ink-950/20"
                  >
                    {t("actions.openTopic", {
                      title: getTopicDisplayTitle(firstTopic, locale),
                    })}
                  </Link>
                ) : null}
                <Link
                  href={`/start?subject=${encodeURIComponent(subject.slug)}`}
                  className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-3 text-sm font-semibold text-ink-950 hover:border-ink-950/20"
                >
                  {t("actions.newHereStartHere")}
                </Link>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/search?subject=${encodeURIComponent(subject.slug)}`}
                  className="motion-link inline-flex items-center text-sm font-medium text-ink-600 underline decoration-ink-300 underline-offset-4 hover:text-ink-950"
                >
                  {t("actions.searchSubject", { subject: subjectTitle })}
                </Link>
                <Link
                  href={getSubjectConceptBrowsePath(subject)}
                  className="motion-link inline-flex items-center text-sm font-medium text-ink-600 underline decoration-ink-300 underline-offset-4 hover:text-ink-950"
                >
                  {t("actions.browseSubjectConcepts", { subject: subjectTitle })}
                </Link>
              </div>
            </div>
          </div>

          <SubjectLandingProgressPanel
            subject={subject}
            initialSyncedSnapshot={initialSyncedSnapshot}
          />
        </PageSection>

        <DisplayAd placement="subject.headerDisplay" />

        <PageSection id="subject-starter-tracks" as="section" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <p className="lab-label">{t("labels.starterTracks")}</p>
              <h2 className="text-2xl font-semibold text-ink-950">
                {t("descriptions.starterTracks")}
              </h2>
            </div>
            <Link
              href="/concepts"
              className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 hover:border-ink-950/20"
            >
              {t("actions.openConceptLibrary")}
            </Link>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {subject.featuredStarterTracks.map((track) => (
              <StarterTrackCard
                key={track.slug}
                track={track}
                variant="compact"
                initialSyncedSnapshot={initialSyncedSnapshot}
              />
            ))}
          </div>
        </PageSection>

        {subject.bridgeStarterTracks.length ? (
          <PageSection id="subject-bridge-tracks" as="section" className="space-y-3">
            <div className="space-y-1">
              <p className="lab-label">{t("labels.bridgeTracks")}</p>
              <h2 className="text-2xl font-semibold text-ink-950">
                {t("descriptions.bridgeTracks")}
              </h2>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {subject.bridgeStarterTracks.map((track) => (
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

        <PageSection id="subject-featured-topics" as="section" className="space-y-3">
          <div className="space-y-1">
            <p className="lab-label">{t("labels.featuredTopics")}</p>
            <h2 className="text-2xl font-semibold text-ink-950">
              {t("descriptions.featuredTopics")}
            </h2>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {subject.featuredTopics.map((topic) => (
              <TopicDiscoveryCard key={topic.slug} topic={topic} variant="compact" />
            ))}
          </div>
        </PageSection>

        <PageSection id="subject-best-first-concepts" as="section" className="space-y-3">
          <div className="space-y-1">
            <p className="lab-label">{t("labels.bestFirstConcepts")}</p>
            <h2 className="text-2xl font-semibold text-ink-950">
              {t("descriptions.bestFirstConcepts")}
            </h2>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {subject.featuredConcepts.map((concept) => (
              <ConceptTile key={concept.slug} concept={concept} layout="list" />
            ))}
          </div>
        </PageSection>

        <MultiplexAd placement="subject.footerMultiplex" />
      </section>
    </>
  );
}
