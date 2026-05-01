import { cookies } from "next/headers";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { getOptionalStoredProgressForCookieHeader } from "@/lib/account/server-store";
import {
  buildExpandedSubjectSpotlights,
  getConceptSummaries,
  getGuidedCollections,
  getRecommendedGoalPaths,
  getStarterTracks,
  getSubjectDiscoverySummaries,
} from "@/lib/content";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildItemListJsonLd,
  buildPageMetadata,
  getLocaleAbsoluteUrl,
  serializeJsonLd,
} from "@/lib/metadata";
import {
  getSubjectDisplayDescription,
  getSubjectDisplayTitle,
} from "@/lib/i18n/content";
import { PageShell } from "@/components/layout/PageShell";
import { StartLearningPage } from "@/components/start/StartLearningPage";

type StartPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  localeOverride?: AppLocale;
};

export async function buildStartPageMetadata(locale: AppLocale) {
  const t = await getScopedTranslator(locale, "StartLearningPage");

  return buildPageMetadata({
    title: t("metadata.title"),
    description: t("metadata.description"),
    pathname: "/start",
    locale,
    keywords: [
      t("metadata.keywords.start"),
      t("metadata.keywords.beginnerPath"),
      t("metadata.keywords.starterTrack"),
      t("metadata.keywords.resumeLearning"),
      t("metadata.keywords.firstSession"),
    ],
    category: "education",
  });
}

export async function generateMetadata() {
  return buildStartPageMetadata(await resolveServerLocaleFallback());
}

function getFirstSearchParamValue(
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

export default async function StartPageRoute({
  searchParams,
  localeOverride,
}: StartPageProps) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const t = await getScopedTranslator(locale, "StartLearningPage");
  const cookieStore = await cookies();
  const { storedProgress: syncedProgress } =
    await getOptionalStoredProgressForCookieHeader({
      cookieHeader: cookieStore.toString(),
      routePath: "/start",
    });
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedSubjectSlug = getFirstSearchParamValue(
    resolvedSearchParams.subject,
  );
  const subjects = getSubjectDiscoverySummaries();
  const guidedCollections = getGuidedCollections();
  const recommendedGoalPaths = getRecommendedGoalPaths();
  const starterTracks = getStarterTracks();
  const concepts = getConceptSummaries();
  const expandedSubjectSpotlights = buildExpandedSubjectSpotlights({
    subjects,
    guidedCollections,
    recommendedGoalPaths,
  });
  const subjectSlugSet = new Set(subjects.map((subject) => subject.slug));
  const initialSubjectSlug =
    requestedSubjectSlug && subjectSlugSet.has(requestedSubjectSlug)
      ? requestedSubjectSlug
      : null;
  const startJsonLd = serializeJsonLd([
    buildCollectionPageJsonLd({
      name: t("structuredData.collectionName"),
      description: t("metadata.description"),
      url: getLocaleAbsoluteUrl("/start", locale),
    }),
    buildBreadcrumbJsonLd([
      { name: t("breadcrumbs.home"), url: getLocaleAbsoluteUrl("/", locale) },
      {
        name: t("breadcrumbs.startLearning"),
        url: getLocaleAbsoluteUrl("/start", locale),
      },
    ]),
    buildItemListJsonLd({
      name: t("structuredData.subjectStartPages"),
      url: getLocaleAbsoluteUrl("/start", locale),
      items: subjects.map((subject) => ({
        name: getSubjectDisplayTitle(subject, locale),
        url: getLocaleAbsoluteUrl(subject.path, locale),
        description: getSubjectDisplayDescription(subject, locale),
      })),
    }),
  ]);

  return (
    <PageShell
      layoutMode="section-shell"
      feedbackContext={{
        pageType: "concepts",
        pagePath: "/start",
        pageTitle: t("feedbackTitle"),
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: startJsonLd }}
      />
      <StartLearningPage
        locale={locale}
        subjects={subjects}
        concepts={concepts}
        starterTracks={starterTracks}
        guidedCollections={guidedCollections}
        initialSyncedSnapshot={syncedProgress?.snapshot ?? null}
        initialSubjectSlug={initialSubjectSlug}
        expandedSubjectSpotlights={expandedSubjectSpotlights}
        leadIn={
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-600">
            <Link
              href="/"
              className="rounded-full border border-line bg-paper-strong px-3 py-1 transition-colors hover:border-ink-950/20 hover:text-ink-950"
            >
              {t("breadcrumbs.home")}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-ink-950">
              {t("breadcrumbs.startLearning")}
            </span>
          </div>
        }
      />
    </PageShell>
  );
}
