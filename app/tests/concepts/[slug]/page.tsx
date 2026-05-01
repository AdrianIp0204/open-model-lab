import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { getOptionalStoredProgressForCookieHeader } from "@/lib/account/server-store";
import { getConceptBySlug } from "@/lib/content";
import { resolveConceptContentBySlug } from "@/lib/i18n/concept-content";
import { getPublishedConceptTestCatalog } from "@/lib/test-hub";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildPageMetadata,
  getLocaleAbsoluteUrl,
  serializeJsonLd,
} from "@/lib/metadata";
import { PageShell } from "@/components/layout/PageShell";
import { ConceptTestPage } from "@/components/tests/ConceptTestPage";

type ConceptTestRouteProps = {
  params: Promise<{ slug: string }>;
  localeOverride?: AppLocale;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getPublishedConceptTestCatalog().entries.map((entry) => ({
    slug: entry.conceptSlug,
  }));
}

export async function buildConceptTestMetadata(
  conceptSlug: string,
  locale: AppLocale,
) {
  const t = await getScopedTranslator(locale, "ConceptTestPage");
  const concept = getConceptBySlug(conceptSlug);

  return buildPageMetadata({
    title: t("metadata.title", { concept: concept.title }),
    description: t("metadata.description", { concept: concept.title }),
    pathname: `/tests/concepts/${conceptSlug}`,
    locale,
    category: concept.subject,
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await resolveServerLocaleFallback();
  const entry = getPublishedConceptTestCatalog().entries.find(
    (catalogEntry) => catalogEntry.conceptSlug === slug,
  );

  if (!entry) {
    return {};
  }

  return buildConceptTestMetadata(slug, locale);
}

export default async function ConceptTestRoute({
  params,
  localeOverride,
}: ConceptTestRouteProps) {
  const { slug } = await params;
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const entry = getPublishedConceptTestCatalog().entries.find(
    (catalogEntry) => catalogEntry.conceptSlug === slug,
  );

  if (!entry) {
    notFound();
  }

  const { content: concept } = resolveConceptContentBySlug(entry.conceptSlug, locale);
  const t = await getScopedTranslator(locale, "ConceptTestPage");
  const cookieStore = await cookies();
  const { storedProgress: syncedProgress } =
    await getOptionalStoredProgressForCookieHeader({
      cookieHeader: cookieStore.toString(),
      routePath: "/tests/concepts/[slug]",
    });
  const conceptTestJsonLd = serializeJsonLd([
    buildCollectionPageJsonLd({
      name: t("structuredData.collectionName", { concept: concept.title }),
      description: t("metadata.description", { concept: concept.title }),
      url: getLocaleAbsoluteUrl(entry.testHref, locale),
      locale,
    }),
    buildBreadcrumbJsonLd([
      { name: t("breadcrumbs.home"), url: getLocaleAbsoluteUrl("/", locale) },
      { name: t("breadcrumbs.tests"), url: getLocaleAbsoluteUrl("/tests", locale) },
      {
        name: t("breadcrumbs.conceptTests"),
        url: getLocaleAbsoluteUrl("/tests", locale),
      },
      {
        name: t("breadcrumbs.currentConceptTest", { concept: concept.title }),
        url: getLocaleAbsoluteUrl(entry.testHref, locale),
      },
    ]),
  ]);

  return (
    <PageShell
      feedbackContext={{
        pageType: "concept",
        pagePath: entry.testHref,
        pageTitle: t("feedbackTitle", { concept: concept.title }),
        conceptId: concept.id,
        conceptSlug: concept.slug,
        conceptTitle: concept.title,
      }}
      showFeedbackWidget={false}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: conceptTestJsonLd }}
      />
      <ConceptTestPage
        concept={concept}
        entry={entry}
        initialSyncedSnapshot={syncedProgress?.snapshot ?? null}
      />
    </PageShell>
  );
}
