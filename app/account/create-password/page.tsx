import type { Metadata } from "next";
import { Suspense } from "react";
import type { AppLocale } from "@/i18n/routing";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { PostConfirmationPasswordSetupPanel } from "@/components/account/PostConfirmationPasswordSetupPanel";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { buildPageMetadata } from "@/lib/metadata";
import { getAccountRouteMetadataCopy } from "@/lib/metadata/account-routes";

export async function buildCreatePasswordMetadata(locale: AppLocale): Promise<Metadata> {
  const t = await getScopedTranslator(locale, "CreatePasswordPage");
  const metadataCopy = getAccountRouteMetadataCopy(locale, "createPassword");

  return {
    ...buildPageMetadata({
      title: t("metadata.title"),
      description: t("metadata.description"),
      pathname: "/account/create-password",
      locale,
      keywords: metadataCopy.keywords,
      category: metadataCopy.category,
    }),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export async function generateMetadata() {
  return buildCreatePasswordMetadata(await resolveServerLocaleFallback());
}

export default async function CreatePasswordPage({
  localeOverride,
}: {
  localeOverride?: AppLocale;
} = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const t = await getScopedTranslator(locale, "CreatePasswordPage");

  return (
    <PageShell
      feedbackContext={{
        pageType: "other",
        pagePath: "/account/create-password",
        pageTitle: t("feedbackContext.pageTitle"),
      }}
      showFeedbackWidget={false}
    >
      <section className="space-y-6 sm:space-y-8">
        <SectionHeading
          eyebrow={t("hero.eyebrow")}
          title={t("hero.title")}
          description={t("hero.description")}
        />

        <Suspense
          fallback={
            <div className="lab-panel p-6">
              <p className="lab-label">{t("fallback.label")}</p>
              <p className="mt-3 text-sm leading-6 text-ink-700">{t("fallback.description")}</p>
            </div>
          }
        >
          <PostConfirmationPasswordSetupPanel />
        </Suspense>
      </section>
    </PageShell>
  );
}
