import { Link } from "@/i18n/navigation";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { buildPageMetadata } from "@/lib/metadata";
import { getTrustLastUpdatedLabel, trustConfig } from "@/lib/trust";
import { PageSection } from "@/components/layout/PageSection";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/layout/SectionHeading";
import type { AppLocale } from "@/i18n/routing";

export async function buildPrivacyMetadata(locale: AppLocale) {
  const t = await getScopedTranslator(locale, "PrivacyPage");

  return buildPageMetadata({
    title: t("metadata.title"),
    description: t("metadata.description"),
    pathname: "/privacy",
    locale,
    keywords: ["privacy policy", "browser storage", "account sync", "billing privacy", "analytics disclosure"],
    category: "privacy",
  });
}

export async function generateMetadata() {
  return buildPrivacyMetadata(await resolveServerLocaleFallback());
}

export default async function PrivacyPage({
  localeOverride,
}: {
  localeOverride?: AppLocale;
} = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const t = await getScopedTranslator(locale, "PrivacyPage");
  const privacySections = [
    {
      title: t("sections.browser.title"),
      paragraphs: [
        t("sections.browser.paragraph1", { siteName: trustConfig.siteName }),
        t("sections.browser.paragraph2"),
      ],
    },
    {
      title: t("sections.accounts.title"),
      paragraphs: [
        t("sections.accounts.paragraph1"),
        t("sections.accounts.paragraph2"),
      ],
    },
    {
      title: t("sections.feedback.title"),
      paragraphs: [
        t("sections.feedback.paragraph1"),
        t("sections.feedback.paragraph2"),
      ],
    },
    {
      title: t("sections.billing.title"),
      paragraphs: [
        t("sections.billing.paragraph1"),
        t("sections.billing.paragraph2"),
      ],
    },
    {
      title: t("sections.ads.title"),
      paragraphs: [
        t("sections.ads.paragraph1"),
        t("sections.ads.paragraph2"),
      ],
    },
    {
      title: t("sections.choices.title"),
      paragraphs: [
        t("sections.choices.paragraph1"),
        t("sections.choices.paragraph2"),
      ],
    },
  ] as const;
  const privacySectionNav = {
    label: t("sectionNav.label"),
    title: t("sectionNav.title"),
    mobileLabel: t("sectionNav.mobileLabel"),
    items: [
      {
        id: "privacy-overview",
        label: t("sectionNav.items.overview.label"),
        compactLabel: t("sectionNav.items.overview.compactLabel"),
      },
      {
        id: "privacy-policy",
        label: t("sectionNav.items.policy.label"),
        compactLabel: t("sectionNav.items.policy.compactLabel"),
      },
      {
        id: "privacy-ads",
        label: t("sectionNav.items.ads.label"),
        compactLabel: t("sectionNav.items.ads.compactLabel"),
      },
      {
        id: "privacy-support",
        label: t("sectionNav.items.support.label"),
        compactLabel: t("sectionNav.items.support.compactLabel"),
      },
    ],
  } as const;

  return (
    <PageShell
      feedbackContext={{
        pageType: "other",
        pagePath: "/privacy",
        pageTitle: t("feedbackTitle"),
      }}
      sectionNav={privacySectionNav}
    >
      <section className="space-y-6 sm:space-y-8">
        <PageSection id="privacy-overview" as="div" className="space-y-6">
          <SectionHeading
            eyebrow={t("hero.eyebrow")}
            title={t("hero.title")}
            description={t("hero.description")}
          />

          <section className="rounded-3xl border border-line bg-paper-strong px-5 py-4 text-sm text-ink-700">
            <span className="lab-label">{t("overview.lastUpdated")}</span>
            <p className="mt-2">{getTrustLastUpdatedLabel("privacy")}</p>
          </section>
        </PageSection>

        <PageSection id="privacy-policy" as="div" className="grid gap-4 md:grid-cols-2">
          {privacySections.map((section) => (
            <article key={section.title} className="lab-panel p-6">
              <h2 className="text-xl font-semibold text-ink-950">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-6 text-ink-700">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </PageSection>

        <PageSection id="privacy-ads" as="section" className="lab-panel p-6">
          <p className="lab-label">{t("adsBlock.label")}</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-ink-700">
            <p>{t("adsBlock.paragraph1", { siteName: trustConfig.siteName })}</p>
            <p>{t("adsBlock.paragraph2")}</p>
            <p>
              {t("adsBlock.paragraph3Prefix")}
              {" "}
              <Link
                href="/ads"
                className="font-medium text-ink-950 underline underline-offset-4"
              >
                {t("adsBlock.links.ads")}
              </Link>
              {t("adsBlock.paragraph3Middle")}
              {" "}
              <Link
                href={trustConfig.supportPath}
                className="font-medium text-ink-950 underline underline-offset-4"
              >
                {t("adsBlock.links.contact")}
              </Link>
              {t("adsBlock.paragraph3Suffix")}
            </p>
          </div>
        </PageSection>

        <PageSection
          id="privacy-support"
          as="section"
          className="lab-panel flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="space-y-2">
            <p className="lab-label">{t("support.label")}</p>
            <p className="text-sm leading-6 text-ink-700">
              {t("support.descriptionPrefix")}
              <a
                href={`mailto:${trustConfig.supportEmail}`}
                className="font-medium text-ink-950 underline underline-offset-4"
              >
                {trustConfig.supportEmail}
              </a>
              {t("support.descriptionSuffix")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/billing"
              className="inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-3 text-sm font-medium text-ink-950 transition-colors hover:border-ink-950/25"
            >
              {t("support.actions.billing")}
            </Link>
            <Link
              href="/ads"
              className="inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-3 text-sm font-medium text-ink-950 transition-colors hover:border-ink-950/25"
            >
              {t("support.actions.ads")}
            </Link>
            <Link
              href={trustConfig.supportPath}
              className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5"
              style={{ color: "var(--paper-strong)" }}
            >
              {t("support.actions.contact")}
            </Link>
          </div>
        </PageSection>
      </section>
    </PageShell>
  );
}
