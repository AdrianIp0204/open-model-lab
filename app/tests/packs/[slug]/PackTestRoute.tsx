import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { getOptionalStoredProgressForCookieHeader } from "@/lib/account/server-store";
import {
  getSubjectDiscoverySummaryBySlug,
  getTopicDiscoverySummaryBySlug,
} from "@/lib/content";
import {
  getPublishedPackTestCatalog,
  getPublishedPackTestDefinitionBySlug,
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
import { PackTestPage } from "@/components/tests/PackTestPage";

type PackTestRouteProps = {
  params: Promise<{ slug: string }>;
  localeOverride?: AppLocale;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getPublishedPackTestCatalog().entries.map((entry) => ({
    slug: entry.packSlug,
  }));
}

export async function buildPackTestMetadata(
  packSlug: string,
  locale: AppLocale,
) {
  const t = await getScopedTranslator(locale, "PackTestPage");
  const definition = getPublishedPackTestDefinitionBySlug(packSlug);

  return buildPageMetadata({
    title: t("metadata.title", { title: definition.title }),
    description: t("metadata.description", { title: definition.title }),
    pathname: `/tests/packs/${packSlug}`,
    locale,
    category: definition.subjectTitle,
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
    getPublishedPackTestDefinitionBySlug(slug);
  } catch {
    return {};
  }

  return buildPackTestMetadata(slug, locale);
}

export default async function PackTestRoute({
  params,
  localeOverride,
}: PackTestRouteProps) {
  const { slug } = await params;
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  let definition;

  try {
    definition = getPublishedPackTestDefinitionBySlug(slug);
  } catch {
    notFound();
  }

  const entry = getPublishedPackTestCatalog().entries.find(
    (catalogEntry) => catalogEntry.packSlug === definition.packSlug,
  );

  if (!entry) {
    notFound();
  }

  const subject = getSubjectDiscoverySummaryBySlug(definition.subjectSlug);
  const includedTopics = definition.includedTopicSlugs.map((topicSlug) =>
    getTopicDiscoverySummaryBySlug(topicSlug),
  );
  const t = await getScopedTranslator(locale, "PackTestPage");
  const cookieStore = await cookies();
  const { storedProgress: syncedProgress } =
    await getOptionalStoredProgressForCookieHeader({
      cookieHeader: cookieStore.toString(),
      routePath: "/tests/packs/[slug]",
    });
  const packTestJsonLd = serializeJsonLd([
    buildCollectionPageJsonLd({
      name: t("structuredData.collectionName", { title: entry.title }),
      description: t("metadata.description", { title: entry.title }),
      url: getLocaleAbsoluteUrl(entry.testHref, locale),
      locale,
    }),
    buildBreadcrumbJsonLd([
      { name: t("breadcrumbs.home"), url: getLocaleAbsoluteUrl("/", locale) },
      { name: t("breadcrumbs.tests"), url: getLocaleAbsoluteUrl("/tests", locale) },
      { name: t("breadcrumbs.packs"), url: getLocaleAbsoluteUrl("/tests", locale) },
      {
        name: t("breadcrumbs.currentPack", { title: entry.title }),
        url: getLocaleAbsoluteUrl(entry.testHref, locale),
      },
    ]),
    buildItemListJsonLd({
      name: t("structuredData.includedTopics", { title: entry.title }),
      url: getLocaleAbsoluteUrl(entry.testHref, locale),
      items: includedTopics.map((topic) => ({
        name: topic.title,
        url: getLocaleAbsoluteUrl(`/concepts/topics/${topic.slug}`, locale),
        description: topic.description,
      })),
    }),
  ]);

  return (
    <PageShell
      feedbackContext={{
        pageType: "concepts",
        pagePath: entry.testHref,
        pageTitle: t("feedbackTitle", { title: entry.title }),
      }}
      showFeedbackWidget={false}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: packTestJsonLd }}
      />
      <PackTestPage
        entry={entry}
        subject={subject}
        includedTopics={includedTopics}
        initialSyncedSnapshot={syncedProgress?.snapshot ?? null}
      />
    </PageShell>
  );
}
