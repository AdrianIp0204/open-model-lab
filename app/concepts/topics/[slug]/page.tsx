import { cookies } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import {
  getLegacyTopicDiscoverySlugs,
  getRecommendedGoalPathsForTopic,
  getTopicSlug,
  getSubjectDiscoverySummaryForTopicSlug,
  getTopicDiscoverySlugs,
  getTopicDiscoverySummaryBySlug,
  type TopicDiscoverySummary,
} from "@/lib/content";
import { Link } from "@/i18n/navigation";
import { addLocalePrefix, type AppLocale } from "@/i18n/routing";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { getOptionalStoredProgressForCookieHeader } from "@/lib/account/server-store";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildItemListJsonLd,
  buildTopicMetadata,
  getLocaleAbsoluteUrl,
  serializeJsonLd,
} from "@/lib/metadata";
import {
  getStarterTrackDisplaySummary,
  getStarterTrackDisplayTitle,
  getConceptDisplaySummary,
  getConceptDisplayTitle,
  getSubjectDisplayTitle,
  getTopicDisplayDescription,
  getTopicDisplayTitle,
} from "@/lib/i18n/content";
import { PageShell } from "@/components/layout/PageShell";
import { TopicLandingPage } from "@/components/concepts/TopicLandingPage";

type TopicPageProps = {
  params: Promise<{ slug: string }>;
};

async function getPageTopicForLocale(
  params: Promise<{ slug: string }>,
  locale: AppLocale,
): Promise<TopicDiscoverySummary> {
  const { slug } = await params;
  const canonicalSlug = getTopicSlug(slug);

  if (canonicalSlug !== slug) {
    permanentRedirect(addLocalePrefix(`/concepts/topics/${canonicalSlug}`, locale));
  }

  try {
    return getTopicDiscoverySummaryBySlug(canonicalSlug);
  } catch {
    notFound();
  }
}

export const dynamicParams = false;

export function generateStaticParams() {
  return [...getTopicDiscoverySlugs(), ...getLegacyTopicDiscoverySlugs()].map((slug) => ({
    slug,
  }));
}

export async function buildTopicPageMetadata({
  params,
  locale,
}: {
  params: Promise<{ slug: string }>;
  locale: AppLocale;
}) {
  const topic = await getPageTopicForLocale(params, locale);
  const displayTitle = getTopicDisplayTitle(topic, locale);
  const displayDescription = getTopicDisplayDescription(topic, locale);

  return buildTopicMetadata(
    {
      ...topic,
      title: displayTitle,
      description: displayDescription,
    },
    locale,
  );
}

export async function generateMetadata({ params }: TopicPageProps) {
  return buildTopicPageMetadata({
    params,
    locale: await resolveServerLocaleFallback(),
  });
}

export default async function TopicPage({
  params,
  localeOverride,
}: TopicPageProps & { localeOverride?: AppLocale }) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const tTopic = await getScopedTranslator(locale, "TopicLandingPage");
  const tConceptPage = await getScopedTranslator(locale, "ConceptPage");
  const cookieStore = await cookies();
  const { storedProgress: syncedProgress } = await getOptionalStoredProgressForCookieHeader({
    cookieHeader: cookieStore.toString(),
    routePath: "/concepts/topics/[slug]",
  });
  const topic = await getPageTopicForLocale(params, locale);
  const subjectPage = getSubjectDiscoverySummaryForTopicSlug(topic.slug);
  const goalPaths = getRecommendedGoalPathsForTopic(topic.slug);
  const topicPath = `/concepts/topics/${topic.slug}`;
  const topicTitle = getTopicDisplayTitle(topic, locale);
  const topicDescription = getTopicDisplayDescription(topic, locale);
  const subjectTitle = getSubjectDisplayTitle(subjectPage, locale);
  const topicJsonLd = serializeJsonLd([
    buildCollectionPageJsonLd({
      name: `${topicTitle} topic landing page`,
      description: topicDescription,
      url: getLocaleAbsoluteUrl(topicPath, locale),
    }),
    buildBreadcrumbJsonLd([
      { name: tConceptPage("breadcrumbs.home"), url: getLocaleAbsoluteUrl("/", locale) },
      { name: tConceptPage("breadcrumbs.conceptLibrary"), url: getLocaleAbsoluteUrl("/concepts", locale) },
      { name: subjectTitle, url: getLocaleAbsoluteUrl(subjectPage.path, locale) },
      { name: tTopic("breadcrumbs.topics"), url: getLocaleAbsoluteUrl("/concepts/topics", locale) },
      { name: topicTitle, url: getLocaleAbsoluteUrl(topicPath, locale) },
    ]),
    buildItemListJsonLd({
      name: tTopic("structuredData.concepts", { topic: topicTitle }),
      url: getLocaleAbsoluteUrl(topicPath, locale),
      items: topic.concepts.map((concept) => ({
        name: getConceptDisplayTitle(concept, locale),
        url: getLocaleAbsoluteUrl(`/concepts/${concept.slug}`, locale),
        description: getConceptDisplaySummary(concept, locale),
      })),
    }),
    ...(topic.starterTracks.length
      ? [
          buildItemListJsonLd({
            name: tTopic("structuredData.starterTracks", { topic: topicTitle }),
            url: getLocaleAbsoluteUrl(topicPath, locale),
            items: topic.starterTracks.map((track) => ({
              name: getStarterTrackDisplayTitle(track, locale),
              url: getLocaleAbsoluteUrl(`/tracks/${track.slug}`, locale),
              description: getStarterTrackDisplaySummary(track, locale),
            })),
          }),
        ]
      : []),
  ]);

  return (
    <PageShell
      layoutMode="section-shell"
      feedbackContext={{
        pageType: "topic",
        pagePath: topicPath,
        pageTitle: `${topicTitle} topic`,
        topicSlug: topic.slug,
        topicTitle,
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: topicJsonLd }}
      />
      <TopicLandingPage
        topic={topic}
        goalPaths={goalPaths}
        initialSyncedSnapshot={syncedProgress?.snapshot ?? null}
        leadIn={
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-600">
            <Link
              href="/"
              className="rounded-full border border-line bg-paper-strong px-3 py-1 transition-colors hover:border-ink-950/20 hover:text-ink-950"
            >
              {tConceptPage("breadcrumbs.home")}
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/concepts"
              className="rounded-full border border-line bg-paper-strong px-3 py-1 transition-colors hover:border-ink-950/20 hover:text-ink-950"
            >
              {tConceptPage("breadcrumbs.conceptLibrary")}
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href={subjectPage.path}
              className="rounded-full border border-line bg-paper-strong px-3 py-1 transition-colors hover:border-ink-950/20 hover:text-ink-950"
            >
              {subjectTitle}
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/concepts/topics"
              className="rounded-full border border-line bg-paper-strong px-3 py-1 transition-colors hover:border-ink-950/20 hover:text-ink-950"
            >
              {tTopic("breadcrumbs.topics")}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-ink-950">
              {topicTitle}
            </span>
          </div>
        }
      />
    </PageShell>
  );
}
