import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getOptionalStoredProgressForCookieHeader } from "@/lib/account/server-store";
import {
  getGuidedCollectionBySlug,
  getGuidedCollections,
} from "@/lib/content";
import { type AppLocale } from "@/i18n/routing";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildGuidedCollectionMetadata,
  buildItemListJsonLd,
  getLocaleAbsoluteUrl,
  serializeJsonLd,
} from "@/lib/metadata";
import { localizeGuidedCollection } from "@/lib/i18n/content";
import { resolveGuidedCollectionBundle } from "@/lib/share-links";
import { PageShell } from "@/components/layout/PageShell";
import { GuidedCollectionDetailPage } from "@/components/guided/GuidedCollectionDetailPage";

type GuidedCollectionPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  localeOverride?: AppLocale;
};

async function getPageCollection(params: Promise<{ slug: string }>) {
  const { slug } = await params;

  try {
    return getGuidedCollectionBySlug(slug);
  } catch {
    notFound();
  }
}

export const dynamicParams = false;

export function generateStaticParams() {
  return getGuidedCollections().map((collection) => ({ slug: collection.slug }));
}

export async function buildGuidedCollectionPageMetadata({
  params,
  locale,
}: {
  params: Promise<{ slug: string }>;
  locale: AppLocale;
}): Promise<Metadata> {
  const collection = await getPageCollection(params);
  return buildGuidedCollectionMetadata(localizeGuidedCollection(collection, locale), locale);
}

export async function generateMetadata({
  params,
}: GuidedCollectionPageProps): Promise<Metadata> {
  return buildGuidedCollectionPageMetadata({
    params,
    locale: await resolveServerLocaleFallback(),
  });
}

export default async function GuidedCollectionPage({
  params,
  searchParams,
  localeOverride,
}: GuidedCollectionPageProps) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const t = await getScopedTranslator(locale, "GuidedCollectionDetailPage");
  const cookieStore = await cookies();
  const { storedProgress: syncedProgress } = await getOptionalStoredProgressForCookieHeader({
    cookieHeader: cookieStore.toString(),
    routePath: "/guided/[slug]",
  });
  const collection = localizeGuidedCollection(await getPageCollection(params), locale);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeBundle = resolveGuidedCollectionBundle(
    resolvedSearchParams.bundle,
    collection,
  );
  const jsonLd = serializeJsonLd([
    buildCollectionPageJsonLd({
      name: collection.title,
      description: collection.summary,
      url: getLocaleAbsoluteUrl(collection.path, locale),
    }),
    buildBreadcrumbJsonLd([
      { name: t("breadcrumbs.home"), url: getLocaleAbsoluteUrl("/", locale) },
      {
        name: t("breadcrumbs.guidedCollections"),
        url: getLocaleAbsoluteUrl("/guided", locale),
      },
      { name: collection.title, url: getLocaleAbsoluteUrl(collection.path, locale) },
    ]),
    buildItemListJsonLd({
      name: t("structuredData.stepsName", { title: collection.title }),
      url: getLocaleAbsoluteUrl(collection.path, locale),
      items: collection.steps.map((step) => ({
        name: step.title,
        url: getLocaleAbsoluteUrl(step.href, locale),
        description: step.summary,
      })),
    }),
  ]);

  return (
    <PageShell
      layoutMode="section-shell"
      className="space-y-4"
      feedbackContext={{
        pageType: "other",
        pagePath: collection.path,
        pageTitle: collection.title,
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <GuidedCollectionDetailPage
        locale={locale}
        collection={collection}
        initialSyncedSnapshot={syncedProgress?.snapshot ?? null}
        activeBundle={activeBundle}
      />
    </PageShell>
  );
}
