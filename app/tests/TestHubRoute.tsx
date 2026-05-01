import { cookies } from "next/headers";
import type { AppLocale } from "@/i18n/routing";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { getOptionalStoredProgressForCookieHeader } from "@/lib/account/server-store";
import { buildCollectionPageJsonLd, buildItemListJsonLd, buildPageMetadata, getLocaleAbsoluteUrl, serializeJsonLd } from "@/lib/metadata";
import {
  getPublishedConceptTestCatalog,
  getPublishedPackTestCatalog,
  getPublishedTopicTestCatalog,
} from "@/lib/test-hub";
import { PageShell } from "@/components/layout/PageShell";
import { TestHubPage } from "@/components/tests/TestHubPage";

type TestHubRouteProps = {
  localeOverride?: AppLocale;
};

export async function buildTestHubMetadata(locale: AppLocale) {
  const t = await getScopedTranslator(locale, "TestHubPage");

  return buildPageMetadata({
    title: t("metadata.title"),
    description: t("metadata.description"),
    pathname: "/tests",
    locale,
    keywords: [
      t("metadata.keywords.tests"),
      t("metadata.keywords.quizzes"),
      t("metadata.keywords.conceptChecks"),
      t("metadata.keywords.review"),
    ],
    category: "education",
  });
}

export async function generateMetadata() {
  return buildTestHubMetadata(await resolveServerLocaleFallback());
}

export default async function TestHubRoute({
  localeOverride,
}: TestHubRouteProps = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const t = await getScopedTranslator(locale, "TestHubPage");
  const cookieStore = await cookies();
  const { storedProgress: syncedProgress } =
    await getOptionalStoredProgressForCookieHeader({
      cookieHeader: cookieStore.toString(),
      routePath: "/tests",
    });
  const packCatalog = getPublishedPackTestCatalog();
  const conceptCatalog = getPublishedConceptTestCatalog();
  const topicCatalog = getPublishedTopicTestCatalog();
  const testHubJsonLd = serializeJsonLd([
    buildCollectionPageJsonLd({
      name: t("structuredData.collectionName"),
      description: t("metadata.description"),
      url: getLocaleAbsoluteUrl("/tests", locale),
      locale,
    }),
    buildItemListJsonLd({
      name: t("structuredData.entries"),
      url: getLocaleAbsoluteUrl("/tests", locale),
      items: [...packCatalog.entries, ...topicCatalog.entries, ...conceptCatalog.entries].map((entry) => ({
        name: entry.title,
        url: getLocaleAbsoluteUrl(entry.testHref, locale),
        description: entry.summary,
      })),
    }),
  ]);

  return (
    <PageShell
      feedbackContext={{
        pageType: "concepts",
        pagePath: "/tests",
        pageTitle: t("feedbackTitle"),
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: testHubJsonLd }}
      />
      <TestHubPage
        packEntries={packCatalog.entries}
        conceptEntries={conceptCatalog.entries}
        topicEntries={topicCatalog.entries}
        initialSyncedSnapshot={syncedProgress?.snapshot ?? null}
      />
    </PageShell>
  );
}
