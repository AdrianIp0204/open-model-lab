import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getOptionalStoredProgressForCookieHeader } from "@/lib/account/server-store";
import {
  getStarterTrackBySlug,
  getStarterTracks,
  getSubjectDiscoverySummaryByTitle,
} from "@/lib/content";
import { type AppLocale } from "@/i18n/routing";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { getSubjectDisplayTitle } from "@/lib/i18n/content";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildItemListJsonLd,
  buildStarterTrackMetadata,
  getLocaleAbsoluteUrl,
  serializeJsonLd,
} from "@/lib/metadata";
import { localizeStarterTrack } from "@/lib/i18n/content";
import { PageShell } from "@/components/layout/PageShell";
import { StarterTrackDetailPage } from "@/components/tracks/StarterTrackDetailPage";

type StarterTrackPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  localeOverride?: AppLocale;
};

function resolveTrackPageMode(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const requestedMode = Array.isArray(searchParams.mode)
    ? searchParams.mode[0]
    : searchParams.mode;

  return requestedMode === "recap" ? "recap" : "guided";
}

async function getPageTrack(params: Promise<{ slug: string }>) {
  const { slug } = await params;

  try {
    return getStarterTrackBySlug(slug);
  } catch {
    notFound();
  }
}

function getTrackSubjectPages(
  track: Awaited<ReturnType<typeof getStarterTrackBySlug>>,
  locale: AppLocale,
) {
  return Array.from(new Set(track.concepts.map((concept) => concept.subject))).map((subject) => {
    const summary = getSubjectDiscoverySummaryByTitle(subject);
    return {
      title: getSubjectDisplayTitle(summary, locale),
      path: summary.path,
    };
  });
}

export const dynamicParams = false;

export function generateStaticParams() {
  return getStarterTracks().map((track) => ({ slug: track.slug }));
}

export async function buildStarterTrackPageMetadata({
  params,
  locale,
}: {
  params: Promise<{ slug: string }>;
  locale: AppLocale;
}): Promise<Metadata> {
  const track = await getPageTrack(params);
  return buildStarterTrackMetadata(localizeStarterTrack(track, locale), locale);
}

export async function generateMetadata({
  params,
}: StarterTrackPageProps): Promise<Metadata> {
  return buildStarterTrackPageMetadata({
    params,
    locale: await resolveServerLocaleFallback(),
  });
}

export default async function StarterTrackPage({
  params,
  searchParams,
  localeOverride,
}: StarterTrackPageProps) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const t = await getScopedTranslator(locale, "StarterTrackDetailPage");
  const cookieStore = await cookies();
  const { storedProgress: syncedProgress } = await getOptionalStoredProgressForCookieHeader({
    cookieHeader: cookieStore.toString(),
    routePath: "/tracks/[slug]",
  });
  const canonicalTrack = await getPageTrack(params);
  const track = localizeStarterTrack(canonicalTrack, locale);
  const subjectPages = getTrackSubjectPages(canonicalTrack, locale);
  const primarySubjectPage = subjectPages.length === 1 ? subjectPages[0] : null;
  const prerequisiteTracks = (track.prerequisiteTrackSlugs ?? []).map((trackSlug) =>
    localizeStarterTrack(getStarterTrackBySlug(trackSlug), locale),
  );
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const trackPath = `/tracks/${track.slug}`;
  const jsonLd = serializeJsonLd([
    buildCollectionPageJsonLd({
      name: t("structuredData.collectionName", { title: track.title }),
      description: track.summary,
      url: getLocaleAbsoluteUrl(trackPath, locale),
    }),
    buildBreadcrumbJsonLd([
      { name: t("breadcrumbs.home"), url: getLocaleAbsoluteUrl("/", locale) },
      {
        name: t("breadcrumbs.concepts"),
        url: getLocaleAbsoluteUrl("/concepts", locale),
      },
      ...(primarySubjectPage
        ? [
            {
              name: primarySubjectPage.title,
              url: getLocaleAbsoluteUrl(primarySubjectPage.path, locale),
            },
          ]
        : []),
      { name: track.title, url: getLocaleAbsoluteUrl(trackPath, locale) },
    ]),
    buildItemListJsonLd({
      name: t("structuredData.conceptsName", { title: track.title }),
      url: getLocaleAbsoluteUrl(trackPath, locale),
      items: track.concepts.map((concept) => ({
        name: concept.title,
        url: getLocaleAbsoluteUrl(`/concepts/${concept.slug}`, locale),
        description: concept.summary,
      })),
    }),
  ]);

  return (
    <PageShell
      layoutMode="section-shell"
      className="space-y-4"
      feedbackContext={{
        pageType: "track",
        pagePath: `/tracks/${track.slug}`,
        pageTitle: track.title,
        trackSlug: track.slug,
        trackTitle: track.title,
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <StarterTrackDetailPage
        locale={locale}
        track={track}
        prerequisiteTracks={prerequisiteTracks}
        subjectPages={subjectPages}
        initialMode={resolveTrackPageMode(resolvedSearchParams)}
        initialSyncedSnapshot={syncedProgress?.snapshot ?? null}
      />
    </PageShell>
  );
}
