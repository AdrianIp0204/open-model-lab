import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getLocaleMessages, getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import {
  buildExpandedSubjectSpotlights,
  getGuidedCollectionCatalogMetrics,
  getGuidedCollections,
  getPublishedConceptMetadata,
  getConceptSummaries,
  getRecommendedGoalPaths,
  getSubjectDiscoverySummaries,
  getStarterTracks,
  getTopicDiscoverySummaries,
} from "@/lib/content";
import { getOptionalStoredProgressForCookieHeader } from "@/lib/account/server-store";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildItemListJsonLd,
  buildPageMetadata,
  getLocaleAbsoluteUrl,
  serializeJsonLd,
} from "@/lib/metadata";
import {
  getConceptDisplaySummary,
  getConceptDisplayTitle,
  getGuidedCollectionDisplaySummary,
  getGuidedCollectionDisplayTitle,
  getStarterTrackDisplaySummary,
  getStarterTrackDisplayTitle,
  getSubjectDisplayDescription,
  getSubjectDisplayTitle,
  getTopicDisplayDescription,
  getTopicDisplayTitle,
} from "@/lib/i18n/content";
import { PageShell } from "@/components/layout/PageShell";
import { PageSection } from "@/components/layout/PageSection";
import { DisclosurePanel } from "@/components/layout/DisclosurePanel";
import { ConceptLibraryBrowser } from "@/components/concepts/ConceptLibraryBrowser";
import {
  decorateConceptSummaries,
  getQuickStartConcept,
} from "@/components/concepts/concept-catalog";
import { StarterTrackCard } from "@/components/concepts/StarterTrackCard";
import { SubjectDiscoveryCard } from "@/components/concepts/SubjectDiscoveryCard";
import { TopicDiscoveryCard } from "@/components/concepts/TopicDiscoveryCard";
import { ExpandedSubjectSpotlightGrid } from "@/components/concepts/ExpandedSubjectSpotlightGrid";
import { ContinueLearningSection } from "@/components/progress/ContinueLearningSection";
import { ReviewQueueSection } from "@/components/progress/ReviewQueueSection";
import { GuidedCollectionCard } from "@/components/guided/GuidedCollectionCard";
import { DisplayAd, MultiplexAd } from "@/components/ads/AdSlot";
import { MotionStaggerGroup } from "@/components/motion";

export async function buildConceptsMetadata(locale: AppLocale) {
  const t = await getScopedTranslator(locale, "ConceptsPage");
  const conceptLibraryTopicKeywords = getTopicDiscoverySummaries().map((topic) =>
    getTopicDisplayTitle(topic, locale),
  );

  return buildPageMetadata({
    title: t("metadata.title"),
    description: t("metadata.description"),
    pathname: "/concepts",
    locale,
    keywords: [
      t("metadata.keywords.conceptLibrary"),
      t("metadata.keywords.starterTracks"),
      ...conceptLibraryTopicKeywords,
    ],
    category: "education",
  });
}

export default async function ConceptsPage({
  localeOverride,
}: {
  localeOverride?: AppLocale;
} = {}) {
  console.info("[concepts] route render started");

  try {
    const locale = localeOverride ?? (await resolveServerLocaleFallback());
    const messages = await getLocaleMessages(locale);
    const tConcepts = await getScopedTranslator(locale, "ConceptsPage");
    const tCommon = await getScopedTranslator(locale, "Common");
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    const {
      storedProgress: syncedProgress,
      unavailable: syncedProgressUnavailable,
    } = await getOptionalStoredProgressForCookieHeader({
      cookieHeader,
      routePath: "/concepts",
    });
    const starterTracks = getStarterTracks();
    const guidedCollections = getGuidedCollections();
    const recommendedGoalPaths = getRecommendedGoalPaths();
    const guidedCollectionMetrics = getGuidedCollectionCatalogMetrics();
    const conceptCatalog = decorateConceptSummaries(getConceptSummaries(), {
      conceptMetadata: getPublishedConceptMetadata(),
    });
    const topicSummaries = getTopicDiscoverySummaries();
    const subjectSummaries = getSubjectDiscoverySummaries();
    const expandedSubjectSpotlights = buildExpandedSubjectSpotlights({
      subjects: subjectSummaries,
      guidedCollections,
      recommendedGoalPaths,
    });
    const quickStartConcept = getQuickStartConcept(conceptCatalog);
    const primaryTrack =
      starterTracks.find((track) => track.heroTrack) ?? starterTracks[0] ?? null;
    const conceptsJsonLd = serializeJsonLd([
      buildCollectionPageJsonLd({
        name: tConcepts("structuredData.collectionName"),
        description: tConcepts("metadata.description"),
        url: getLocaleAbsoluteUrl("/concepts", locale),
        locale,
      }),
      buildBreadcrumbJsonLd([
        { name: tCommon("home"), url: getLocaleAbsoluteUrl("/", locale) },
        { name: tCommon("concepts"), url: getLocaleAbsoluteUrl("/concepts", locale) },
      ]),
      buildItemListJsonLd({
        name: tConcepts("structuredData.publishedConcepts"),
        url: getLocaleAbsoluteUrl("/concepts", locale),
        items: conceptCatalog.map((concept) => ({
          name: getConceptDisplayTitle(concept, locale),
          url: getLocaleAbsoluteUrl(`/concepts/${concept.slug}`, locale),
          description: getConceptDisplaySummary(concept, locale),
        })),
      }),
      buildItemListJsonLd({
        name: tConcepts("structuredData.topicDirectories"),
        url: getLocaleAbsoluteUrl("/concepts/topics", locale),
        items: topicSummaries.map((topic) => ({
          name: getTopicDisplayTitle(topic, locale),
          url: getLocaleAbsoluteUrl(`/concepts/topics/${topic.slug}`, locale),
          description: getTopicDisplayDescription(topic, locale),
        })),
      }),
      buildItemListJsonLd({
        name: tConcepts("structuredData.subjectEntryPages"),
        url: getLocaleAbsoluteUrl("/concepts/subjects", locale),
        items: subjectSummaries.map((subject) => ({
          name: getSubjectDisplayTitle(subject, locale),
          url: getLocaleAbsoluteUrl(subject.path, locale),
          description: getSubjectDisplayDescription(subject, locale),
        })),
      }),
      buildItemListJsonLd({
        name: tConcepts("structuredData.starterTracks"),
        url: getLocaleAbsoluteUrl("/concepts", locale),
        items: starterTracks.map((track) => ({
          name: getStarterTrackDisplayTitle(track, locale),
          url: getLocaleAbsoluteUrl(`/tracks/${track.slug}`, locale),
          description: getStarterTrackDisplaySummary(track, locale),
        })),
      }),
      buildItemListJsonLd({
        name: tConcepts("structuredData.guidedCollections"),
        url: getLocaleAbsoluteUrl("/guided", locale),
        items: guidedCollections.map((collection) => ({
          name: getGuidedCollectionDisplayTitle(collection, locale),
          url: getLocaleAbsoluteUrl(collection.path, locale),
          description: getGuidedCollectionDisplaySummary(collection, locale),
        })),
      }),
    ]);
    console.info("[concepts] route render completed", {
      totalConcepts: conceptCatalog.length,
      syncedProgressUnavailable,
    });

    return (
      <NextIntlClientProvider locale={locale} messages={messages}>
        <PageShell
          layoutMode="section-shell"
          feedbackContext={{
            pageType: "concepts",
            pagePath: "/concepts",
            pageTitle: tConcepts("feedbackTitle"),
          }}
        >
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: conceptsJsonLd }}
          />

          <section className="space-y-6 sm:space-y-7">
            <ConceptLibraryBrowser
              concepts={conceptCatalog}
              subjects={subjectSummaries}
              topics={topicSummaries}
              quickStartConcept={quickStartConcept}
              guidedTrack={primaryTrack}
              starterTracks={starterTracks}
              initialSyncedSnapshot={syncedProgress?.snapshot ?? null}
            />

            <DisplayAd placement="library.browserDisplay" />

            <PageSection id="library-progress" as="section">
              <DisclosurePanel
                eyebrow={tConcepts("progress.eyebrow")}
                title={tConcepts("progress.title")}
                summary={tConcepts("progress.summary")}
              >
                <div className="space-y-6">
                  <ContinueLearningSection concepts={conceptCatalog} />

                  <ReviewQueueSection
                    concepts={conceptCatalog}
                    starterTracks={starterTracks}
                    guidedCollections={guidedCollections}
                    initialSyncedContinueLearningState={
                      syncedProgress?.continueLearningState ?? null
                    }
                    initialSyncedSnapshot={syncedProgress?.snapshot ?? null}
                  />
                </div>
              </DisclosurePanel>
            </PageSection>

            <PageSection id="library-support" as="section" className="space-y-4">
              <div className="space-y-1">
                <p className="lab-label">{tConcepts("support.eyebrow")}</p>
                <h2 className="text-2xl font-semibold text-ink-950">
                  {tConcepts("support.title")}
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-ink-700">
                  {tConcepts("support.description")}
                </p>
              </div>

              <div className="space-y-4">
                <DisclosurePanel
                  eyebrow={tConcepts("subjects.eyebrow")}
                  title={tConcepts("subjects.title")}
                  summary={tConcepts("subjects.summary")}
                >
                  <div className="space-y-5">
                    {expandedSubjectSpotlights.length ? (
                      <ExpandedSubjectSpotlightGrid
                        spotlights={expandedSubjectSpotlights}
                        variant="compact"
                      />
                    ) : null}

                    <div className="flex items-center justify-between gap-3">
                      <p className="lab-label">{tConcepts("subjects.directoryLabel")}</p>
                      <Link
                        href="/concepts/subjects"
                        className="text-sm font-medium text-ink-700 underline decoration-ink-300 underline-offset-4 transition-colors hover:text-ink-950"
                      >
                        {tConcepts("subjects.openDirectory")}
                      </Link>
                    </div>
                    <MotionStaggerGroup
                      className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4"
                      baseDelay={105}
                    >
                      {subjectSummaries.map((subject) => (
                        <SubjectDiscoveryCard
                          key={subject.slug}
                          subject={subject}
                          variant="compact"
                        />
                      ))}
                    </MotionStaggerGroup>
                  </div>
                </DisclosurePanel>

                <DisclosurePanel
                  eyebrow={tConcepts("guidedStarts.eyebrow")}
                  title={tConcepts("guidedStarts.title")}
                  summary={tConcepts("guidedStarts.summary", {
                    trackCount: starterTracks.length,
                    collectionCount: guidedCollectionMetrics.totalCollections,
                  })}
                >
                  <div className="grid gap-6 xl:grid-cols-2">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="lab-label">{tConcepts("guidedStarts.tracksLabel")}</p>
                        <Link
                          href="/concepts"
                          className="text-sm font-medium text-ink-700 underline decoration-ink-300 underline-offset-4 transition-colors hover:text-ink-950"
                        >
                          {tConcepts("guidedStarts.stayInLibrary")}
                        </Link>
                      </div>
                      <MotionStaggerGroup className="grid gap-4" baseDelay={115}>
                        {starterTracks.map((track) => (
                          <StarterTrackCard
                            key={track.slug}
                            track={track}
                            variant="compact"
                            initialSyncedSnapshot={syncedProgress?.snapshot ?? null}
                          />
                        ))}
                      </MotionStaggerGroup>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="lab-label">{tConcepts("guidedStarts.collectionsLabel")}</p>
                        <Link
                          href="/guided"
                          className="text-sm font-medium text-ink-700 underline decoration-ink-300 underline-offset-4 transition-colors hover:text-ink-950"
                        >
                          {tConcepts("guidedStarts.openCollections")}
                        </Link>
                      </div>
                      <MotionStaggerGroup className="grid gap-4" baseDelay={120}>
                        {guidedCollections.map((collection) => (
                          <GuidedCollectionCard
                            key={collection.slug}
                            collection={collection}
                            variant="compact"
                          />
                        ))}
                      </MotionStaggerGroup>
                    </div>
                  </div>
                </DisclosurePanel>

                <DisclosurePanel
                  eyebrow={tConcepts("topics.eyebrow")}
                  title={tConcepts("topics.title")}
                  summary={tConcepts("topics.summary")}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="lab-label">{tConcepts("topics.directoryLabel")}</p>
                      <Link
                        href="/concepts/topics"
                        className="text-sm font-medium text-ink-700 underline decoration-ink-300 underline-offset-4 transition-colors hover:text-ink-950"
                      >
                        {tConcepts("topics.openDirectory")}
                      </Link>
                    </div>
                    <MotionStaggerGroup className="grid gap-4 xl:grid-cols-3" baseDelay={120}>
                      {topicSummaries.map((topic) => (
                        <TopicDiscoveryCard key={topic.slug} topic={topic} variant="compact" />
                      ))}
                    </MotionStaggerGroup>
                  </div>
                </DisclosurePanel>
              </div>
            </PageSection>

            <MultiplexAd placement="library.footerMultiplex" />
          </section>
        </PageShell>
      </NextIntlClientProvider>
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Dynamic server usage")
    ) {
      throw error;
    }

    console.error("[concepts] route render failed", {
      message: error instanceof Error ? error.message : null,
      name: error instanceof Error ? error.name : null,
    });
    throw error;
  }
}
