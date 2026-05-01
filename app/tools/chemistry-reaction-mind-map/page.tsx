import type { AppLocale } from "@/i18n/routing";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { buildPageMetadata } from "@/lib/metadata";
import { PageShell } from "@/components/layout/PageShell";
import { ChemistryReactionMindMapPage } from "@/components/tools/chemistry/ChemistryReactionMindMapPage";

const chemistryReactionMindMapPath = "/tools/chemistry-reaction-mind-map";

type ChemistryReactionMindMapRouteProps = {
  localeOverride?: AppLocale;
};

export async function buildChemistryReactionMindMapMetadata(locale: AppLocale) {
  const t = await getScopedTranslator(locale, "ChemistryReactionMindMapPage");

  return buildPageMetadata({
    title: t("metadata.title"),
    description: t("metadata.description"),
    pathname: chemistryReactionMindMapPath,
    locale,
    keywords: [
      t("metadata.keywords.organicChemistry"),
      t("metadata.keywords.functionalGroups"),
      t("metadata.keywords.reactionPathways"),
    ],
    category: "education",
  });
}

export async function generateMetadata() {
  return buildChemistryReactionMindMapMetadata(await resolveServerLocaleFallback());
}

export default async function ChemistryReactionMindMapRoute({
  localeOverride,
}: ChemistryReactionMindMapRouteProps = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const t = await getScopedTranslator(locale, "ChemistryReactionMindMapPage");

  return (
    <PageShell
      feedbackContext={{
        pageType: "other",
        pagePath: chemistryReactionMindMapPath,
        pageTitle: t("feedbackTitle"),
      }}
      className="mx-auto w-full max-w-[96rem] px-4 pb-16 pt-4 sm:px-6 sm:pt-5 lg:px-8"
    >
      <ChemistryReactionMindMapPage key={locale} />
    </PageShell>
  );
}
