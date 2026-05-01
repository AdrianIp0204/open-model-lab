import type { AppLocale } from "@/i18n/routing";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { buildPageMetadata } from "@/lib/metadata";
import { PageShell } from "@/components/layout/PageShell";
import { CircuitBuilderPage } from "@/components/circuit-builder/CircuitBuilderPage";

export async function buildCircuitBuilderMetadata(locale: AppLocale) {
  const t = await getScopedTranslator(locale, "CircuitBuilderRoute");

  return buildPageMetadata({
    title: t("metadata.title"),
    description: t("metadata.description"),
    pathname: "/circuit-builder",
    locale,
    keywords: [
      "circuit builder",
      "dc circuit simulator",
      "electrical circuits",
      "Open Model Lab",
    ],
    category: "education",
  });
}

type CircuitBuilderRouteProps = {
  localeOverride?: AppLocale;
};

export async function CircuitBuilderRoute({
  localeOverride,
}: CircuitBuilderRouteProps = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const t = await getScopedTranslator(locale, "CircuitBuilderRoute");

  return (
    <PageShell
      feedbackContext={{
        pageType: "other",
        pagePath: "/circuit-builder",
        pageTitle: t("feedbackContext.pageTitle"),
      }}
      className="mx-auto w-full max-w-[96rem] px-4 pb-16 pt-4 sm:px-6 sm:pt-5 lg:px-8"
    >
      <CircuitBuilderPage key={locale} />
    </PageShell>
  );
}
