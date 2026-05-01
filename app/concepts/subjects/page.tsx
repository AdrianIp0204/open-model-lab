import { NextIntlClientProvider } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  getLocaleMessages,
  getScopedTranslator,
  resolveServerLocaleFallback,
} from "@/i18n/server";
import { DisplayAd } from "@/components/ads/AdSlot";
import { SubjectDiscoveryCard } from "@/components/concepts/SubjectDiscoveryCard";
import { PageShell } from "@/components/layout/PageShell";
import { PageSection } from "@/components/layout/PageSection";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { MotionStaggerGroup } from "@/components/motion";
import {
  getConceptCatalogMetrics,
  getSubjectDiscoverySummaries,
} from "@/lib/content";
import { getSubjectDisplayDescription, getSubjectDisplayTitle } from "@/lib/i18n/content";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildItemListJsonLd,
  buildPageMetadata,
  getLocaleAbsoluteUrl,
  serializeJsonLd,
} from "@/lib/metadata";

export async function buildSubjectDirectoryMetadata(locale: AppLocale) {
  const t = await getScopedTranslator(locale, "SubjectDirectoryPage");
  const subjectDirectoryKeywords = getSubjectDiscoverySummaries().map((subject) =>
    getSubjectDisplayTitle(subject, locale),
  );

  return buildPageMetadata({
    title: t("metadata.title"),
    description: t("metadata.description"),
    pathname: "/concepts/subjects",
    locale,
    keywords: [
      t("metadata.title"),
      "subject directory",
      ...subjectDirectoryKeywords,
    ],
    category: "education",
  });
}

export async function generateMetadata() {
  return buildSubjectDirectoryMetadata(await resolveServerLocaleFallback());
}

export default async function SubjectDirectoryPage({
  localeOverride,
}: {
  localeOverride?: AppLocale;
} = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const messages = await getLocaleMessages(locale);
  const t = await getScopedTranslator(locale, "SubjectDirectoryPage");
  const tConceptPage = await getScopedTranslator(locale, "ConceptPage");
  const subjects = getSubjectDiscoverySummaries();
  const catalogMetrics = getConceptCatalogMetrics();

  const subjectDirectorySectionNav = {
    label: t("sectionNav.label"),
    title: t("sectionNav.title"),
    mobileLabel: t("sectionNav.mobileLabel"),
    items: [
      {
        id: "subject-directory-overview",
        label: t("sectionNav.overview"),
        compactLabel: t("sectionNav.overviewCompact"),
      },
      {
        id: "subject-directory-metrics",
        label: t("sectionNav.metrics"),
        compactLabel: t("sectionNav.metricsCompact"),
      },
      {
        id: "subject-directory-browser",
        label: t("sectionNav.browse"),
        compactLabel: t("sectionNav.browseCompact"),
      },
    ],
  } as const;

  const subjectsJsonLd = serializeJsonLd([
    buildCollectionPageJsonLd({
      name: t("structuredData.collectionName"),
      description: t("metadata.description"),
      url: getLocaleAbsoluteUrl("/concepts/subjects", locale),
      locale,
    }),
    buildBreadcrumbJsonLd([
      { name: tConceptPage("breadcrumbs.home"), url: getLocaleAbsoluteUrl("/", locale) },
      {
        name: tConceptPage("breadcrumbs.conceptLibrary"),
        url: getLocaleAbsoluteUrl("/concepts", locale),
      },
      {
        name: t("breadcrumbs.subjects"),
        url: getLocaleAbsoluteUrl("/concepts/subjects", locale),
      },
    ]),
    buildItemListJsonLd({
      name: t("structuredData.collectionName"),
      url: getLocaleAbsoluteUrl("/concepts/subjects", locale),
      items: subjects.map((subject) => ({
        name: getSubjectDisplayTitle(subject, locale),
        url: getLocaleAbsoluteUrl(subject.path, locale),
        description: getSubjectDisplayDescription(subject, locale),
      })),
    }),
  ]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <PageShell
        feedbackContext={{
          pageType: "concepts",
          pagePath: "/concepts/subjects",
          pageTitle: t("feedbackTitle"),
        }}
        sectionNav={subjectDirectorySectionNav}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: subjectsJsonLd }}
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
              {t("breadcrumbs.subjects")}
            </span>
          </div>

          <PageSection id="subject-directory-overview" as="div">
            <SectionHeading
              density="dense"
              eyebrow={t("overview.eyebrow")}
              title={t("overview.title")}
              description={t("overview.description")}
              action={
                <Link
                  href="/concepts"
                  className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-3 text-sm font-medium text-ink-950 hover:border-ink-950/25"
                >
                  {t("overview.action")}
                </Link>
              }
            />
          </PageSection>

          <PageSection id="subject-directory-metrics" as="div">
            <MotionStaggerGroup className="grid gap-4 md:grid-cols-3" baseDelay={90}>
              <div className="motion-enter motion-card lab-panel-compact">
                <p className="text-sm font-semibold text-ink-950">
                  {t("metrics.subjects", { count: subjects.length })}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-700">
                  {t("metrics.subjectsDescription")}
                </p>
              </div>
              <div className="motion-enter motion-card lab-panel-compact">
                <p className="text-sm font-semibold text-ink-950">
                  {t("metrics.topics", { count: catalogMetrics.totalTopics })}
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
            </MotionStaggerGroup>
          </PageSection>

          <DisplayAd placement="subjectDirectory.headerDisplay" />

          <PageSection id="subject-directory-browser" as="div">
            <MotionStaggerGroup
              className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4"
              baseDelay={120}
            >
              {subjects.map((subject) => (
                <SubjectDiscoveryCard key={subject.slug} subject={subject} />
              ))}
            </MotionStaggerGroup>
          </PageSection>
        </section>
      </PageShell>
    </NextIntlClientProvider>
  );
}
