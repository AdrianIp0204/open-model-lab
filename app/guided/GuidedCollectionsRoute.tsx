import { cookies } from "next/headers";
import type { AppLocale } from "@/i18n/routing";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { getOptionalStoredProgressForCookieHeader } from "@/lib/account/server-store";
import {
  getGuidedCollectionCatalogMetrics,
  getGuidedCollections,
  getRecommendedGoalPaths,
} from "@/lib/content";
import {
  getGoalPathDisplayTitle,
  getGuidedCollectionDisplaySummary,
  getGuidedCollectionDisplayTitle,
} from "@/lib/i18n/content";
import {
  buildCollectionPageJsonLd,
  buildItemListJsonLd,
  buildPageMetadata,
  getLocaleAbsoluteUrl,
  serializeJsonLd,
} from "@/lib/metadata";
import { PageShell } from "@/components/layout/PageShell";
import { GuidedCollectionsHub } from "@/components/guided/GuidedCollectionsHub";
import { DisplayAd, MultiplexAd } from "@/components/ads/AdSlot";

type GuidedCollectionsPageProps = {
  localeOverride?: AppLocale;
};

export async function buildGuidedCollectionsMetadata(locale: AppLocale) {
  const t = await getScopedTranslator(locale, "GuidedCollectionsPage");
  const guidedCollections = getGuidedCollections();
  const recommendedGoalPaths = getRecommendedGoalPaths();

  return buildPageMetadata({
    title: t("metadata.title"),
    description: t("metadata.description"),
    pathname: "/guided",
    locale,
    keywords: [
      t("metadata.keywords.guidedCollections"),
      t("metadata.keywords.lessonSets"),
      t("metadata.keywords.playlists"),
      ...guidedCollections.map((collection) =>
        getGuidedCollectionDisplayTitle(collection, locale),
      ),
      ...recommendedGoalPaths.map((goalPath) =>
        getGoalPathDisplayTitle(goalPath, locale),
      ),
    ],
    category: "education",
  });
}

export default async function GuidedCollectionsPage({
  localeOverride,
}: GuidedCollectionsPageProps = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const t = await getScopedTranslator(locale, "GuidedCollectionsPage");
  const guidedCollections = getGuidedCollections();
  const recommendedGoalPaths = getRecommendedGoalPaths();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const { storedProgress: syncedProgress } =
    await getOptionalStoredProgressForCookieHeader({
      cookieHeader,
      routePath: "/guided",
    });
  const metrics = getGuidedCollectionCatalogMetrics();
  const guidedCollectionsJsonLd = serializeJsonLd([
    buildCollectionPageJsonLd({
      name: t("structuredData.collectionName"),
      description: t("metadata.description"),
      url: getLocaleAbsoluteUrl("/guided", locale),
    }),
    buildItemListJsonLd({
      name: t("structuredData.collectionName"),
      url: getLocaleAbsoluteUrl("/guided", locale),
      items: guidedCollections.map((collection) => ({
        name: getGuidedCollectionDisplayTitle(collection, locale),
        url: getLocaleAbsoluteUrl(collection.path, locale),
        description: getGuidedCollectionDisplaySummary(collection, locale),
      })),
    }),
  ]);

  return (
    <PageShell
      feedbackContext={{
        pageType: "other",
        pagePath: "/guided",
        pageTitle: t("feedbackTitle"),
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: guidedCollectionsJsonLd }}
      />

      <section className="space-y-6 sm:space-y-7">
        <GuidedCollectionsHub
          guidedCollections={guidedCollections}
          goalPaths={recommendedGoalPaths}
          initialSyncedSnapshot={syncedProgress?.snapshot ?? null}
        />
        <DisplayAd placement="guided.headerDisplay" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="lab-panel-compact p-4">
            <p className="text-sm font-semibold text-ink-950">
              {t("metrics.collections", { count: metrics.totalCollections })}
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-700">
              {t("metrics.collectionsDescription")}
            </p>
          </div>
          <div className="lab-panel-compact p-4">
            <p className="text-sm font-semibold text-ink-950">
              {t("metrics.steps", { count: metrics.totalSteps })}
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-700">
              {t("metrics.stepsDescription")}
            </p>
          </div>
          <div className="lab-panel-compact p-4">
            <p className="text-sm font-semibold text-ink-950">
              {t("metrics.concepts", { count: metrics.totalCoveredConcepts })}
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-700">
              {t("metrics.conceptsDescription")}
            </p>
          </div>
          <div className="lab-panel-compact p-4">
            <p className="text-sm font-semibold text-ink-950">
              {t("metrics.minutes", {
                count: metrics.totalEstimatedStudyMinutes,
              })}
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-700">
              {t("metrics.minutesDescription")}
            </p>
          </div>
        </div>
        <MultiplexAd placement="guided.footerMultiplex" />
      </section>
    </PageShell>
  );
}
