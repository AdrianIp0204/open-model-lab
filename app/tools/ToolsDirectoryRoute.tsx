import type { AppLocale } from "@/i18n/routing";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import {
  buildCollectionPageJsonLd,
  buildItemListJsonLd,
  buildPageMetadata,
  getLocaleAbsoluteUrl,
  serializeJsonLd,
} from "@/lib/metadata";
import {
  learningToolDefinitions,
  learningToolsHubPath,
} from "@/lib/tools/learning-tools";
import { PageShell } from "@/components/layout/PageShell";
import { ToolsDirectoryPage } from "@/components/tools/ToolsDirectoryPage";

type ToolsDirectoryRouteProps = {
  localeOverride?: AppLocale;
};

export async function buildToolsDirectoryMetadata(locale: AppLocale) {
  const t = await getScopedTranslator(locale, "ToolsDirectoryPage");

  return buildPageMetadata({
    title: t("metadata.title"),
    description: t("metadata.description"),
    pathname: learningToolsHubPath,
    locale,
    keywords: [
      t("metadata.keywords.learningTools"),
      ...learningToolDefinitions.map((tool) => t(`tools.${tool.messageKey}.title`)),
    ],
    category: "education",
  });
}

export default async function ToolsDirectoryRoute({
  localeOverride,
}: ToolsDirectoryRouteProps = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const t = await getScopedTranslator(locale, "ToolsDirectoryPage");
  const toolsJsonLd = serializeJsonLd([
    buildCollectionPageJsonLd({
      name: t("structuredData.collectionName"),
      description: t("metadata.description"),
      url: getLocaleAbsoluteUrl(learningToolsHubPath, locale),
      locale,
    }),
    buildItemListJsonLd({
      name: t("structuredData.entries"),
      url: getLocaleAbsoluteUrl(learningToolsHubPath, locale),
      items: learningToolDefinitions.map((tool) => ({
        name: t(`tools.${tool.messageKey}.title`),
        url: getLocaleAbsoluteUrl(tool.href, locale),
        description: t(`tools.${tool.messageKey}.description`),
      })),
    }),
  ]);

  return (
    <PageShell
      feedbackContext={{
        pageType: "other",
        pagePath: learningToolsHubPath,
        pageTitle: t("feedbackTitle"),
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toolsJsonLd }}
      />
      <ToolsDirectoryPage />
    </PageShell>
  );
}
