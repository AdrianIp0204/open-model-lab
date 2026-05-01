import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import {
  getTopicDiscoverySummaries,
} from "@/lib/content";
import { getOptionalStoredProgressForCookieHeader } from "@/lib/account/server-store";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildItemListJsonLd,
  buildPageMetadata,
  getLocaleAbsoluteUrl,
  serializeJsonLd,
} from "@/lib/metadata";
import type { AppLocale } from "@/i18n/routing";
import { getTopicDisplayTitle } from "@/lib/i18n/content";
import { getLocalizedChallengeDiscoveryIndex } from "@/lib/i18n/challenge-discovery";
import { getLocaleMessages, getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { PageShell } from "@/components/layout/PageShell";
import { ChallengeDiscoveryHub } from "@/components/challenges/ChallengeDiscoveryHub";

function getChallengeKeywords(
  locale: AppLocale,
  challengeIndex: ReturnType<typeof getLocalizedChallengeDiscoveryIndex>,
) {
  return [
    locale === "zh-HK" ? "互動挑戰" : "interactive challenges",
    locale === "zh-HK" ? "科學挑戰" : "science challenges",
    locale === "zh-HK" ? "數學挑戰" : "math challenges",
    locale === "zh-HK" ? "挑戰模式" : "challenge mode",
    locale === "zh-HK" ? "互動概念任務" : "interactive concept tasks",
    ...challengeIndex.topics.map((topic) => topic.title),
    ...challengeIndex.tracks.map((track) => track.title),
    ...getTopicDiscoverySummaries().map((topic) => getTopicDisplayTitle(topic, locale)),
  ];
}

export async function buildChallengesMetadata(locale: AppLocale) {
  const t = await getScopedTranslator(locale, "ChallengesPage");
  const challengeIndex = getLocalizedChallengeDiscoveryIndex(locale);

  return buildPageMetadata({
    title: t("metadata.title"),
    description: t("metadata.description"),
    pathname: "/challenges",
    locale,
    keywords: getChallengeKeywords(locale, challengeIndex),
    category: "education",
  });
}

type ChallengeHubPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata() {
  return buildChallengesMetadata(await resolveServerLocaleFallback());
}

export default async function ChallengeHubPage({
  searchParams,
  localeOverride,
}: ChallengeHubPageProps & { localeOverride?: AppLocale }) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const messages = await getLocaleMessages(locale);
  const t = await getScopedTranslator(locale, "ChallengesPage");
  const challengeIndex = getLocalizedChallengeDiscoveryIndex(locale);
  console.info("[challenges] route render started");

  try {
    const cookieStore = await cookies();
    const {
      storedProgress: syncedProgress,
      unavailable: syncedProgressUnavailable,
    } = await getOptionalStoredProgressForCookieHeader({
      cookieHeader: cookieStore.toString(),
      routePath: "/challenges",
    });
    const resolvedSearchParams = searchParams ? await searchParams : {};
    const initialFilters = {
      search: getSingleSearchParam(resolvedSearchParams, "search"),
      topic: getSingleSearchParam(resolvedSearchParams, "topic"),
      track: getSingleSearchParam(resolvedSearchParams, "track"),
      depth: getSingleSearchParam(resolvedSearchParams, "depth") as
        | "all"
        | "warm-up"
        | "core"
        | "stretch"
        | undefined,
      progress: getSingleSearchParam(resolvedSearchParams, "progress") as
        | "all"
        | "to-try"
        | "started"
        | "solved"
        | undefined,
    } as const;
    const challengeHubStateKey = [
      initialFilters.search ?? "",
      initialFilters.topic ?? "",
      initialFilters.track ?? "",
      initialFilters.depth ?? "",
      initialFilters.progress ?? "",
    ].join("|");
    const challengeJsonLd = serializeJsonLd([
      buildCollectionPageJsonLd({
        name: t("structuredData.collectionName"),
        description: t("metadata.description"),
        url: getLocaleAbsoluteUrl("/challenges", locale),
      }),
      buildBreadcrumbJsonLd([
        { name: t("breadcrumbs.home"), url: getLocaleAbsoluteUrl("/", locale) },
        {
          name: t("breadcrumbs.challenges"),
          url: getLocaleAbsoluteUrl("/challenges", locale),
        },
      ]),
      buildItemListJsonLd({
        name: t("structuredData.entries"),
        url: getLocaleAbsoluteUrl("/challenges", locale),
        items: challengeIndex.entries.map((entry) => ({
          name: `${entry.title} - ${entry.concept.title}`,
          url: getLocaleAbsoluteUrl(entry.href, locale),
          description: entry.prompt,
        })),
      }),
      buildItemListJsonLd({
        name: t("structuredData.paths"),
        url: getLocaleAbsoluteUrl("/challenges", locale),
        items: challengeIndex.tracks.map((track) => ({
          name: track.title,
          url: getLocaleAbsoluteUrl(track.path, locale),
          description: track.summary,
        })),
      }),
    ]);

    console.info("[challenges] route render completed", {
      totalChallenges: challengeIndex.entries.length,
      syncedProgressUnavailable,
    });

    return (
      <NextIntlClientProvider locale={locale} messages={messages}>
        <PageShell
          layoutMode="section-shell"
          feedbackContext={{
            pageType: "challenge",
            pagePath: "/challenges",
            pageTitle: t("feedbackTitle"),
          }}
        >
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: challengeJsonLd }}
          />
          <ChallengeDiscoveryHub
            key={challengeHubStateKey}
            index={challengeIndex}
            initialSyncedSnapshot={syncedProgress?.snapshot ?? null}
            initialFilters={initialFilters}
          />
        </PageShell>
      </NextIntlClientProvider>
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Dynamic server usage")
    ) {
      throw error;
    }

    console.error("[challenges] route render failed", {
      message: error instanceof Error ? error.message : null,
      name: error instanceof Error ? error.name : null,
    });
    throw error;
  }
}
