import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { getOptionalStoredProgressForCookieHeader } from "@/lib/account/server-store";
import {
  getStarterTrackBySlug,
  getStarterTracks,
  getSubjectDiscoverySummaryByTitle,
} from "@/lib/content";
import { getStarterTrackCompletionContentContext } from "@/lib/content/track-completion";
import { getSubjectDisplayTitle, localizeStarterTrack } from "@/lib/i18n/content";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildItemListJsonLd,
  buildStarterTrackCompletionMetadata,
  getLocaleAbsoluteUrl,
  serializeJsonLd,
} from "@/lib/metadata";
import { PageShell } from "@/components/layout/PageShell";
import { StarterTrackCompletionPage } from "@/components/tracks/StarterTrackCompletionPage";

type StarterTrackCompletionRouteProps = {
  params: Promise<{ slug: string }>;
  localeOverride?: AppLocale;
};

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
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

export async function buildStarterTrackCompletionPageMetadata({
  params,
  locale,
}: {
  params: Promise<{ slug: string }>;
  locale: AppLocale;
}): Promise<Metadata> {
  const track = localizeStarterTrack(await getPageTrack(params), locale);
  return buildStarterTrackCompletionMetadata(track, locale);
}

export async function generateMetadata({
  params,
}: StarterTrackCompletionRouteProps): Promise<Metadata> {
  return buildStarterTrackCompletionPageMetadata({
    params,
    locale: await resolveServerLocaleFallback(),
  });
}

export default async function StarterTrackCompletionRoute({
  params,
  localeOverride,
}: StarterTrackCompletionRouteProps) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const t = await getScopedTranslator(locale, "StarterTrackDetailPage");
  const cookieStore = await cookies();
  const { storedProgress: syncedProgress } = await getOptionalStoredProgressForCookieHeader({
    cookieHeader: cookieStore.toString(),
    routePath: "/tracks/[slug]/complete",
  });
  const canonicalTrack = await getPageTrack(params);
  const track = localizeStarterTrack(canonicalTrack, locale);
  const subjectPages = getTrackSubjectPages(canonicalTrack, locale);
  const primarySubjectPage = subjectPages.length === 1 ? subjectPages[0] : null;
  const completionContext = getStarterTrackCompletionContentContext(canonicalTrack);
  const completionPath = `/tracks/${track.slug}/complete`;
  const trackPath = `/tracks/${track.slug}`;
  const jsonLd = serializeJsonLd([
    buildCollectionPageJsonLd({
      name: copyText(locale, `${track.title} track completion`, `${track.title} 路徑完成`),
      description: copyText(locale, `Completion reflection for ${track.title}.`, `${track.title} 的完成回顧。`),
      url: getLocaleAbsoluteUrl(completionPath, locale),
      locale,
    }),
    buildBreadcrumbJsonLd([
      { name: t("breadcrumbs.home"), url: getLocaleAbsoluteUrl("/", locale) },
      {
        name: t("breadcrumbs.concepts"),
        url: getLocaleAbsoluteUrl("/concepts", locale),
      },
      ...(primarySubjectPage
        ? [{ name: primarySubjectPage.title, url: getLocaleAbsoluteUrl(primarySubjectPage.path, locale) }]
        : []),
      { name: track.title, url: getLocaleAbsoluteUrl(trackPath, locale) },
      {
        name: copyText(locale, "Completion", "完成"),
        url: getLocaleAbsoluteUrl(completionPath, locale),
      },
    ]),
    buildItemListJsonLd({
      name: copyText(locale, `${track.title} completed concepts`, `${track.title} 已完成概念`),
      url: getLocaleAbsoluteUrl(completionPath, locale),
      items: track.concepts.map((concept) => ({
        name: concept.title,
        url: getLocaleAbsoluteUrl(`/concepts/${concept.slug}`, locale),
        description: concept.summary,
      })),
    }),
  ]);

  return (
    <PageShell
      className="space-y-4"
      feedbackContext={{
        pageType: "track",
        pagePath: completionPath,
        pageTitle: copyText(locale, `${track.title} completion`, `${track.title} 完成頁面`),
        trackSlug: track.slug,
        trackTitle: track.title,
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <StarterTrackCompletionPage
        track={track}
        completionContext={completionContext}
        subjectPages={subjectPages}
        initialSyncedSnapshot={syncedProgress?.snapshot ?? null}
      />
    </PageShell>
  );
}
