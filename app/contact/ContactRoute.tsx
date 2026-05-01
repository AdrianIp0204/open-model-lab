import { NextIntlClientProvider } from "next-intl";
import { previewFeedbackEmail } from "@/lib/feedback";
import type { AppLocale } from "@/i18n/routing";
import { getLocaleMessages, getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { buildPageMetadata } from "@/lib/metadata";
import { PageShell } from "@/components/layout/PageShell";
import { PageSection } from "@/components/layout/PageSection";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { ContactForm } from "@/components/concepts/ContactForm";
import { MotionSection } from "@/components/motion";

export async function buildContactMetadata(locale: AppLocale) {
  const t = await getScopedTranslator(locale, "ContactPage");

  return buildPageMetadata({
    title: t("metadata.title"),
    description: t("metadata.description"),
    pathname: "/contact",
    locale,
    keywords: ["contact", "feedback", "Open Model Lab support"],
    category: "contact",
  });
}

export default async function ContactPage({
  localeOverride,
}: {
  localeOverride?: AppLocale;
} = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const messages = await getLocaleMessages(locale);
  const t = await getScopedTranslator(locale, "ContactPage");
  const contactSectionNav = {
    label: t("sectionNav.label"),
    title: t("sectionNav.title"),
    mobileLabel: t("sectionNav.mobileLabel"),
    items: [
      {
        id: "contact-form",
        label: t("sectionNav.items.form.label"),
        compactLabel: t("sectionNav.items.form.compactLabel"),
      },
      {
        id: "contact-guidance",
        label: t("sectionNav.items.guidance.label"),
        compactLabel: t("sectionNav.items.guidance.compactLabel"),
      },
    ],
  } as const;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <PageShell
        showFeedbackWidget={false}
        feedbackContext={{
          pageType: "contact",
          pagePath: "/contact",
          pageTitle: t("feedbackContext.pageTitle"),
        }}
        sectionNav={contactSectionNav}
      >
        <section className="space-y-6 sm:space-y-8">
        <SectionHeading
          eyebrow={t("hero.eyebrow")}
          title={t("hero.title")}
          description={t("hero.description")}
        />

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <PageSection id="contact-form" as="div">
            <ContactForm
              context={{
                pageType: "contact",
                pagePath: "/contact",
                pageTitle: t("feedbackContext.pageTitle"),
              }}
              fallbackEmail={previewFeedbackEmail}
            />
          </PageSection>

          <PageSection id="contact-guidance" as="div">
            <MotionSection
              as="aside"
              className="motion-card lab-panel space-y-4 p-6"
              delay={100}
            >
              <p className="lab-label">{t("guidance.label")}</p>
              <div className="space-y-3 text-sm leading-6 text-ink-700">
                <p>{t("guidance.items.clarity")}</p>
                <p>{t("guidance.items.controls")}</p>
                <p>{t("guidance.items.requests")}</p>
              </div>

              <div className="rounded-3xl border border-line bg-paper-strong p-4 text-sm leading-6 text-ink-700">
                {t("guidance.note")}
              </div>
            </MotionSection>
          </PageSection>
        </div>
        </section>
      </PageShell>
    </NextIntlClientProvider>
  );
}
