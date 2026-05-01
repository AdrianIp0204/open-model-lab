import { NextIntlClientProvider } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  getLocaleMessages,
  getScopedTranslator,
  resolveServerLocaleFallback,
} from "@/i18n/server";
import { DisplayAd, MultiplexAd } from "@/components/ads/AdSlot";
import { SubjectDiscoveryCard } from "@/components/concepts/SubjectDiscoveryCard";
import { TopicDiscoveryCard } from "@/components/concepts/TopicDiscoveryCard";
import { PageShell } from "@/components/layout/PageShell";
import { PageSection } from "@/components/layout/PageSection";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { MotionStaggerGroup } from "@/components/motion";
import {
  getConceptCatalogMetrics,
  getSubjectDiscoverySummaries,
  getTopicDiscoverySummaries,
} from "@/lib/content";
import {
  getSubjectDisplayTitle,
  getTopicDisplayDescription,
  getTopicDisplayTitle,
} from "@/lib/i18n/content";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildItemListJsonLd,
  buildPageMetadata,
  getLocaleAbsoluteUrl,
  serializeJsonLd,
} from "@/lib/metadata";

export async function buildTopicDirectoryMetadata(locale: AppLocale) {
  const t = await getScopedTranslator(locale, "TopicDirectoryPage");
  const topicDirectoryKeywords = getTopicDiscoverySummaries().map((topic) =>
    getTopicDisplayTitle(topic, locale),
  );

  return buildPageMetadata({
    title: t("metadata.title"),
    description: t("metadata.description"),
    pathname: "/concepts/topics",
    locale,
    keywords: [
      t("metadata.title"),
      "topic landing pages",
      ...topicDirectoryKeywords,
    ],
    category: "education",
  });
}

export async function generateMetadata() {
  return buildTopicDirectoryMetadata(await resolveServerLocaleFallback());
}

export default async function TopicDirectoryPage({
  localeOverride,
}: {
  localeOverride?: AppLocale;
} = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const messages = await getLocaleMessages(locale);
  const t = await getScopedTranslator(locale, "TopicDirectoryPage");
  const tConceptPage = await getScopedTranslator(locale, "ConceptPage");
  const topicSummaries = getTopicDiscoverySummaries();
  const catalogMetrics = getConceptCatalogMetrics();
  const subjectSummaries = getSubjectDiscoverySummaries();
  const topicsBySubject = subjectSummaries.map((subject) => ({
    subject,
    topics: topicSummaries.filter((topic) => topic.subject === subject.title),
  }));

  const topicDirectorySectionNav = {
    label: t("sectionNav.label"),
    title: t("sectionNav.title"),
    mobileLabel: t("sectionNav.mobileLabel"),
    items: [
      {
        id: "topic-directory-overview",
        label: t("sectionNav.overview"),
        compactLabel: t("sectionNav.overviewCompact"),
      },
      {
        id: "topic-directory-subjects",
        label: t("sectionNav.subjects"),
        compactLabel: t("sectionNav.subjectsCompact"),
      },
      {
        id: "topic-directory-metrics",
        label: t("sectionNav.metrics"),
        compactLabel: t("sectionNav.metricsCompact"),
      },
      {
        id: "topic-directory-browser",
        label: t("sectionNav.browse"),
        compactLabel: t("sectionNav.browseCompact"),
      },
    ],
  } as const;

  const topicsJsonLd = serializeJsonLd([
    buildCollectionPageJsonLd({
      name: t("structuredData.collectionName"),
      description: t("metadata.description"),
      url: getLocaleAbsoluteUrl("/concepts/topics", locale),
      locale,
    }),
    buildBreadcrumbJsonLd([
      { name: tConceptPage("breadcrumbs.home"), url: getLocaleAbsoluteUrl("/", locale) },
      {
        name: tConceptPage("breadcrumbs.conceptLibrary"),
        url: getLocaleAbsoluteUrl("/concepts", locale),
      },
      { name: t("breadcrumbs.topics"), url: getLocaleAbsoluteUrl("/concepts/topics", locale) },
    ]),
    buildItemListJsonLd({
      name: t("structuredData.itemsName"),
      url: getLocaleAbsoluteUrl("/concepts/topics", locale),
      items: topicSummaries.map((topic) => ({
        name: getTopicDisplayTitle(topic, locale),
        url: getLocaleAbsoluteUrl(`/concepts/topics/${topic.slug}`, locale),
        description: getTopicDisplayDescription(topic, locale),
      })),
    }),
  ]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <PageShell
        feedbackContext={{
          pageType: "topic",
          pagePath: "/concepts/topics",
          pageTitle: t("feedbackTitle"),
        }}
        sectionNav={topicDirectorySectionNav}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: topicsJsonLd }}
        />

        <section className="space-y-5 sm:space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-600">
            <Link
              href="/"
              className="motion-chip rounded-full border border-line bg-paper-strong px-3 py-1 hover:border-ink-950/20 hover:text-ink-950"
            >
              {tConceptPage("breadcrumbs.home")}
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/concepts"
              className="motion-chip rounded-full border border-line bg-paper-strong px-3 py-1 hover:border-ink-950/20 hover:text-ink-950"
            >
              {tConceptPage("breadcrumbs.conceptLibrary")}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-ink-950">
              {t("breadcrumbs.topics")}
            </span>
          </div>

          <PageSection id="topic-directory-overview" as="div">
            <SectionHeading
              density="dense"
              eyebrow={t("overview.eyebrow")}
              title={t("overview.title")}
              description={t("overview.description")}
              action={
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/concepts/subjects"
                    className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-3 text-sm font-medium text-ink-950 hover:border-ink-950/25"
                  >
                    {t("overview.browseSubjects")}
                  </Link>
                  <Link
                    href="/concepts"
                    className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-3 text-sm font-medium text-ink-950 hover:border-ink-950/25"
                  >
                    {t("overview.backToLibrary")}
                  </Link>
                </div>
              }
            />
          </PageSection>

          <PageSection id="topic-directory-subjects" as="section" className="space-y-3">
            <div className="space-y-1">
              <p className="lab-label">{t("subjectEntry.label")}</p>
              <h2 className="text-2xl font-semibold text-ink-950">
                {t("subjectEntry.title")}
              </h2>
            </div>
            <MotionStaggerGroup
              className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4"
              baseDelay={105}
            >
              {subjectSummaries.map((subject) => (
                <SubjectDiscoveryCard key={subject.slug} subject={subject} variant="compact" />
              ))}
            </MotionStaggerGroup>
          </PageSection>

          <PageSection id="topic-directory-metrics" as="div">
            <MotionStaggerGroup className="grid gap-4 md:grid-cols-3" baseDelay={90}>
              <div className="motion-enter motion-card lab-panel-compact">
                <p className="text-sm font-semibold text-ink-950">
                  {t("metrics.topics", { count: topicSummaries.length })}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-700">
                  {t("metrics.topicsDescription")}
                </p>
              </div>
              <div className="motion-enter motion-card lab-panel-compact">
                <p className="text-sm font-semibold text-ink-950">
                  {t("metrics.concepts", { count: catalogMetrics.totalConcepts })}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-700">
                  {t("metrics.conceptsDescription")}
                </p>
              </div>
              <div className="motion-enter motion-card lab-panel-compact">
                <p className="text-sm font-semibold text-ink-950">
                  {t("metrics.subjects", { count: catalogMetrics.totalSubjects })}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-700">
                  {t("metrics.subjectsDescription")}
                </p>
              </div>
            </MotionStaggerGroup>
          </PageSection>

          <DisplayAd placement="topicDirectory.headerDisplay" />

          <PageSection id="topic-directory-browser" as="div" className="space-y-5">
            {topicsBySubject.map(({ subject, topics }) => {
              const displaySubjectTitle = getSubjectDisplayTitle(subject, locale);

              return (
                <section key={subject.slug} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <Link
                        href={subject.path}
                        className="lab-label transition-colors hover:text-ink-950"
                      >
                        {displaySubjectTitle}
                      </Link>
                      <p className="text-sm text-ink-600">
                        {t("browse.subjectTopicCount", { count: topics.length })}
                      </p>
                    </div>
                    <Link
                      href={subject.path}
                      className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 hover:border-ink-950/25"
                    >
                      {t("browse.openSubject", { subject: displaySubjectTitle })}
                    </Link>
                  </div>
                  <MotionStaggerGroup className="grid gap-4 xl:grid-cols-3" baseDelay={120}>
                    {topics.map((topic) => (
                      <TopicDiscoveryCard key={topic.slug} topic={topic} variant="compact" />
                    ))}
                  </MotionStaggerGroup>
                </section>
              );
            })}
          </PageSection>

          <MultiplexAd placement="topicDirectory.footerMultiplex" />
        </section>
      </PageShell>
    </NextIntlClientProvider>
  );
}
