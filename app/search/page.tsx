import { cookies } from "next/headers";
import type { AppLocale } from "@/i18n/routing";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { getOptionalStoredProgressForCookieHeader } from "@/lib/account/server-store";
import {
  buildExpandedSubjectSpotlights,
  buildConceptSearchMetadataBySlug,
  buildSiteSearchIndex,
  getConceptSummaries,
  getGuidedCollections,
  getPublishedConceptMetadata,
  getRecommendedGoalPaths,
  getStarterTracks,
  getSubjectDiscoverySummaries,
  getTopicDiscoverySummaries,
} from "@/lib/content";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildPageMetadata,
  getLocaleAbsoluteUrl,
  serializeJsonLd,
} from "@/lib/metadata";
import { PageShell } from "@/components/layout/PageShell";
import { SearchPage } from "@/components/search/SearchPage";

type SearchPageRouteProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  localeOverride?: AppLocale;
};

export async function buildSearchMetadata(locale: AppLocale) {
  const t = await getScopedTranslator(locale, "SearchRoute");

  return buildPageMetadata({
    title: t("metadata.title"),
    description: t("metadata.description"),
    pathname: "/search",
    locale,
    keywords: [
      t("metadata.keywords.siteSearch"),
      t("metadata.keywords.conceptSearch"),
      t("metadata.keywords.subjectSearch"),
      t("metadata.keywords.starterTrackSearch"),
      t("metadata.keywords.topicSearch"),
    ],
    category: "education",
  });
}

export async function generateMetadata() {
  return buildSearchMetadata(await resolveServerLocaleFallback());
}

function getSingleSearchParam(
  value: string | string[] | undefined,
): string | null {
  if (typeof value === "string" && value) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.find((entry) => typeof entry === "string" && Boolean(entry)) ?? null;
  }

  return null;
}

export default async function SearchPageRoute({
  searchParams,
  localeOverride,
}: SearchPageRouteProps) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const tSearch = await getScopedTranslator(locale, "SearchRoute");
  const tCommon = await getScopedTranslator(locale, "Common");
  const cookieStore = await cookies();
  const { storedProgress: syncedProgress } =
    await getOptionalStoredProgressForCookieHeader({
      cookieHeader: cookieStore.toString(),
      routePath: "/search",
    });
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialQuery = getSingleSearchParam(resolvedSearchParams.q);
  const initialSubjectSlug = getSingleSearchParam(resolvedSearchParams.subject);
  const initialTopic = getSingleSearchParam(resolvedSearchParams.topic);
  const searchPageStateKey = `${initialSubjectSlug ?? "all"}::${initialTopic ?? "All"}::${initialQuery ?? ""}`;
  const subjects = getSubjectDiscoverySummaries();
  const topics = getTopicDiscoverySummaries();
  const starterTracks = getStarterTracks();
  const guidedCollections = getGuidedCollections();
  const recommendedGoalPaths = getRecommendedGoalPaths();
  const concepts = getConceptSummaries();
  const conceptMetadataBySlug = buildConceptSearchMetadataBySlug(
    getPublishedConceptMetadata(),
  );
  const searchIndex = buildSiteSearchIndex({
    subjects,
    topics,
    starterTracks,
    guidedCollections,
    recommendedGoalPaths,
    concepts,
    conceptMetadataBySlug,
  });
  const expandedSubjectSpotlights = buildExpandedSubjectSpotlights({
    subjects,
    guidedCollections,
    recommendedGoalPaths,
  });
  const searchJsonLd = serializeJsonLd([
    buildCollectionPageJsonLd({
      name: tSearch("structuredData.collectionName"),
      description: tSearch("metadata.description"),
      url: getLocaleAbsoluteUrl("/search", locale),
      locale,
    }),
    buildBreadcrumbJsonLd([
      { name: tCommon("home"), url: getLocaleAbsoluteUrl("/", locale) },
      { name: tCommon("search"), url: getLocaleAbsoluteUrl("/search", locale) },
    ]),
  ]);

  return (
    <PageShell
        feedbackContext={{
          pageType: "concepts",
          pagePath: "/search",
          pageTitle: tCommon("search"),
        }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: searchJsonLd }}
      />
      <SearchPage
        key={searchPageStateKey}
        index={searchIndex}
        initialQuery={initialQuery}
        initialSubjectSlug={initialSubjectSlug}
        initialTopic={initialTopic}
        initialSyncedSnapshot={syncedProgress?.snapshot ?? null}
        expandedSubjectSpotlights={expandedSubjectSpotlights}
      />
    </PageShell>
  );
}
