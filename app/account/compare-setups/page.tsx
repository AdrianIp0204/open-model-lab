import type { Metadata } from "next";
import { SavedCompareSetupsLibraryPage } from "@/components/account/SavedCompareSetupsLibraryPage";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { resolveServerLocaleFallback, getScopedTranslator } from "@/i18n/server";
import { getConceptSummaries } from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";
import { getAccountRouteMetadataCopy } from "@/lib/metadata/account-routes";

export async function buildSavedCompareSetupsMetadata(
  locale: AppLocale,
): Promise<Metadata> {
  const t = await getScopedTranslator(locale, "AccountSavedCompareSetupsPage");
  const metadataCopy = getAccountRouteMetadataCopy(locale, "savedCompareSetups");

  return {
    ...buildPageMetadata({
      title: t("feedbackTitle"),
      description: t("hero.description"),
      pathname: "/account/compare-setups",
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
  return buildSavedCompareSetupsMetadata(await resolveServerLocaleFallback());
}

export default async function AccountSavedCompareSetupsPage({
  localeOverride,
}: {
  localeOverride?: AppLocale;
} = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const t = await getScopedTranslator(locale, "AccountSavedCompareSetupsPage");
  const concepts = getConceptSummaries();

  return (
    <PageShell
      feedbackContext={{
        pageType: "other",
        pagePath: "/account/compare-setups",
        pageTitle: t("feedbackTitle"),
      }}
      showFeedbackWidget={false}
    >
      <section className="space-y-6 sm:space-y-8">
        <SectionHeading
          eyebrow={t("hero.eyebrow")}
          title={t("hero.title")}
          description={t("hero.description")}
        />

        <div className="flex flex-wrap gap-3">
          <Link
            href="/account/setups"
            className="inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
          >
            {t("actions.openSavedSetups")}
          </Link>
        </div>

        <SavedCompareSetupsLibraryPage concepts={concepts} />
      </section>
    </PageShell>
  );
}
