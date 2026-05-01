import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { getOptionalStoredProgressForCookieHeader } from "@/lib/account/server-store";
import { getTopicDiscoverySummaryBySlug } from "@/lib/content";
import {
  getPublishedTopicTestCatalog,
  getPublishedTopicTestDefinitionBySlug,
} from "@/lib/test-hub";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildItemListJsonLd,
  buildPageMetadata,
  getLocaleAbsoluteUrl,
  serializeJsonLd,
} from "@/lib/metadata";
import { PageShell } from "@/components/layout/PageShell";
import { TopicTestPage } from "@/components/tests/TopicTestPage";

type TopicTestRouteProps = {
  params: Promise<{ slug: string }>;
  localeOverride?: AppLocale;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getPublishedTopicTestCatalog().entries.map((entry) => ({
    slug: entry.topicSlug,
  }));
}

export async function buildTopicTestMetadata(
  topicSlug: string,
  locale: AppLocale,
) {
  const t = await getScopedTranslator(locale, "TopicTestPage");
  getPublishedTopicTestDefinitionBySlug(topicSlug);
  const topic = getTopicDiscoverySummaryBySlug(topicSlug);

  return buildPageMetadata({
    title: t("metadata.title", { topic: topic.title }),
    description: t("metadata.description", { topic: topic.title }),
    pathname: `/tests/topics/${topicSlug}`,
    locale,
    category: topic.subject,
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await resolveServerLocaleFallback();

  try {
    getPublishedTopicTestDefinitionBySlug(slug);
  } catch {
    return {};
  }

  return buildTopicTestMetadata(slug, locale);
}

export default async function TopicTestRoute({
  params,
  localeOverride,
}: TopicTestRouteProps) {
  const { slug } = await params;
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  let definition;

  try {
    definition = getPublishedTopicTestDefinitionBySlug(slug);
  } catch {
    notFound();
  }

  const topic = getTopicDiscoverySummaryBySlug(definition.topicSlug);
  const entry = getPublishedTopicTestCatalog().entries.find(
    (catalogEntry) => catalogEntry.topicSlug === definition.topicSlug,
  );

  if (!entry) {
    notFound();
  }

  const t = await getScopedTranslator(locale, "TopicTestPage");
  const cookieStore = await cookies();
  const { storedProgress: syncedProgress } =
    await getOptionalStoredProgressForCookieHeader({
      cookieHeader: cookieStore.toString(),
      routePath: "/tests/topics/[slug]",
    });
  const topicTestJsonLd = serializeJsonLd([
    buildCollectionPageJsonLd({
      name: t("structuredData.collectionName", { topic: topic.title }),
      description: t("metadata.description", { topic: topic.title }),
      url: getLocaleAbsoluteUrl(entry.testHref, locale),
      locale,
    }),
    buildBreadcrumbJsonLd([
      { name: t("breadcrumbs.home"), url: getLocaleAbsoluteUrl("/", locale) },
      { name: t("breadcrumbs.tests"), url: getLocaleAbsoluteUrl("/tests", locale) },
      {
        name: t("breadcrumbs.topicTests"),
        url: getLocaleAbsoluteUrl("/tests", locale),
      },
      {
        name: t("breadcrumbs.currentTopicTest", { topic: topic.title }),
        url: getLocaleAbsoluteUrl(entry.testHref, locale),
      },
    ]),
    buildItemListJsonLd({
      name: t("structuredData.includedConcepts", { topic: topic.title }),
      url: getLocaleAbsoluteUrl(entry.testHref, locale),
      items: topic.concepts.map((concept) => ({
        name: concept.title,
        url: getLocaleAbsoluteUrl(`/concepts/${concept.slug}`, locale),
        description: concept.summary,
      })),
    }),
  ]);

  return (
    <PageShell
      feedbackContext={{
        pageType: "topic",
        pagePath: entry.testHref,
        pageTitle: t("feedbackTitle", { topic: topic.title }),
        topicSlug: topic.slug,
        topicTitle: topic.title,
      }}
      showFeedbackWidget={false}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: topicTestJsonLd }}
      />
      <TopicTestPage
        entry={entry}
        topic={topic}
        initialSyncedSnapshot={syncedProgress?.snapshot ?? null}
      />
    </PageShell>
  );
}
