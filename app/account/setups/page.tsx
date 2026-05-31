import type { Metadata } from "next";
import { SavedSetupsLibraryPage } from "@/components/account/SavedSetupsLibraryPage";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { resolveServerLocaleFallback, getScopedTranslator } from "@/i18n/server";
import { getConceptSummaries } from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";
import { getAccountRouteMetadataCopy } from "@/lib/metadata/account-routes";

export async function buildSavedSetupsMetadata(locale: AppLocale): Promise<Metadata> {
  const t = await getScopedTranslator(locale, "AccountSavedSetupsPage");
  const metadataCopy = getAccountRouteMetadataCopy(locale, "savedSetups");

  return {
    ...buildPageMetadata({
      title: t("feedbackTitle"),
      description: t("hero.description"),
      pathname: "/account/setups",
      locale,
      keywords: [t("feedbackTitle"), ...metadataCopy.keywords],
      category: t("hero.eyebrow"),
    }),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export async function generateMetadata(): Promise<Metadata> {
  return buildSavedSetupsMetadata(await resolveServerLocaleFallback());
}

export default async function AccountSavedSetupsPage({
  localeOverride,
}: {
  localeOverride?: AppLocale;
} = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const t = await getScopedTranslator(locale, "AccountSavedSetupsPage");
  const concepts = getConceptSummaries();

  return (
    <PageShell
      feedbackContext={{
        pageType: "other",
        pagePath: "/account/setups",
        pageTitle: t("feedbackTitle"),
      }}
      showFeedbackWidget={false}
    >
      <section className="space-y-6 sm:space-y-8">
        <SectionHeading
          level={1}
          eyebrow={t("hero.eyebrow")}
          title={t("hero.title")}
          description={t("hero.description")}
        />

        <div className="flex flex-wrap gap-3">
          <Link
            href="/concepts"
            className="inline-flex items-center rounded-full bg-ink-950 px-4 py-2 text-sm font-semibold transition hover:opacity-90"
            style={{ color: "var(--paper-strong)" }}
          >
            {t("actions.findLiveBench")}
          </Link>
          <Link
            href="/start"
            className="inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
          >
            {t("actions.startHere")}
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
          >
            {t("actions.searchLibrary")}
          </Link>
        </div>

        <SavedSetupsLibraryPage concepts={concepts} />
      </section>
    </PageShell>
  );
}
