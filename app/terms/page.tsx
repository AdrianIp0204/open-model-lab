import { Link } from "@/i18n/navigation";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { buildPageMetadata } from "@/lib/metadata";
import { getTrustLastUpdatedLabel, trustConfig } from "@/lib/trust";
import { PageSection } from "@/components/layout/PageSection";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/layout/SectionHeading";
import type { AppLocale } from "@/i18n/routing";

export async function buildTermsMetadata(locale: AppLocale) {
  const t = await getScopedTranslator(locale, "TermsPage");

  return buildPageMetadata({
    title: t("metadata.title"),
    description: t("metadata.description"),
    pathname: "/terms",
    locale,
    keywords: ["terms of use", "Open Model Lab", "education", "accounts", "feedback"],
    category: "terms",
  });
}

export async function generateMetadata() {
  return buildTermsMetadata(await resolveServerLocaleFallback());
}

export default async function TermsPage({
  localeOverride,
}: {
  localeOverride?: AppLocale;
} = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const t = await getScopedTranslator(locale, "TermsPage");
  const termsSections = [
    {
      title: t("sections.responsible.title"),
      paragraphs: [
        t("sections.responsible.paragraph1", { siteName: trustConfig.siteName }),
        t("sections.responsible.paragraph2"),
      ],
    },
    {
      title: t("sections.educational.title"),
      paragraphs: [
        t("sections.educational.paragraph1"),
        t("sections.educational.paragraph2"),
      ],
    },
    {
      title: t("sections.accounts.title"),
      paragraphs: [
        t("sections.accounts.paragraph1"),
        t("sections.accounts.paragraph2", {
          planName: trustConfig.premiumPlan.shortName,
        }),
      ],
    },
    {
      title: t("sections.misuse.title"),
      paragraphs: [
        t("sections.misuse.paragraph1"),
        t("sections.misuse.paragraph2"),
      ],
    },
    {
      title: t("sections.ownership.title"),
      paragraphs: [
        t("sections.ownership.paragraph1"),
        t("sections.ownership.paragraph2"),
      ],
    },
    {
      title: t("sections.access.title"),
      paragraphs: [
        t("sections.access.paragraph1"),
        t("sections.access.paragraph2"),
      ],
    },
    {
      title: t("sections.availability.title"),
      paragraphs: [
        t("sections.availability.paragraph1"),
        t("sections.availability.paragraph2"),
      ],
    },
  ] as const;
  const termsSectionNav = {
    label: t("sectionNav.label"),
    title: t("sectionNav.title"),
    mobileLabel: t("sectionNav.mobileLabel"),
    items: [
      {
        id: "terms-overview",
        label: t("sectionNav.items.overview.label"),
        compactLabel: t("sectionNav.items.overview.compactLabel"),
      },
      {
        id: "terms-policy",
        label: t("sectionNav.items.policy.label"),
        compactLabel: t("sectionNav.items.policy.compactLabel"),
      },
      {
        id: "terms-third-party",
        label: t("sectionNav.items.thirdParty.label"),
        compactLabel: t("sectionNav.items.thirdParty.compactLabel"),
      },
      {
        id: "terms-contact",
        label: t("sectionNav.items.contact.label"),
        compactLabel: t("sectionNav.items.contact.compactLabel"),
      },
    ],
  } as const;

  return (
    <PageShell
      feedbackContext={{
        pageType: "other",
        pagePath: "/terms",
        pageTitle: t("feedbackTitle"),
      }}
      sectionNav={termsSectionNav}
    >
      <section className="space-y-6 sm:space-y-8">
        <PageSection id="terms-overview" as="div" className="space-y-6">
          <SectionHeading
            eyebrow={t("hero.eyebrow")}
            title={t("hero.title")}
            description={t("hero.description")}
          />

          <section className="rounded-3xl border border-line bg-paper-strong px-5 py-4 text-sm text-ink-700">
            <span className="lab-label">{t("overview.lastUpdated")}</span>
            <p className="mt-2">{getTrustLastUpdatedLabel("terms")}</p>
          </section>
        </PageSection>

        <PageSection id="terms-policy" as="div" className="grid gap-4 md:grid-cols-2">
          {termsSections.map((section) => (
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

        <PageSection id="terms-third-party" as="section" className="lab-panel p-6">
          <p className="lab-label">{t("thirdParty.label")}</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-ink-700">
            <p>{t("thirdParty.paragraph1", { siteName: trustConfig.siteName })}</p>
            <p>{t("thirdParty.paragraph2")}</p>
            <p>
              {t("thirdParty.billingPrefix")}
              <Link
                href="/billing"
                className="font-medium text-ink-950 underline underline-offset-4"
              >
                {t("thirdParty.links.billing")}
              </Link>
              .
            </p>
            <p>
              {t("thirdParty.adsPrefix")}
              <Link
                href="/ads"
                className="font-medium text-ink-950 underline underline-offset-4"
              >
                {t("thirdParty.links.ads")}
              </Link>
              {t("thirdParty.adsMiddle")}
              <Link
                href="/privacy"
                className="font-medium text-ink-950 underline underline-offset-4"
              >
                {t("thirdParty.links.privacy")}
              </Link>
              {t("thirdParty.adsSuffix")}
            </p>
          </div>
        </PageSection>

        <PageSection
          id="terms-contact"
          as="section"
          className="lab-panel flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="space-y-2">
            <p className="lab-label">{t("contact.label")}</p>
            <p className="text-sm leading-6 text-ink-700">
              {t("contact.descriptionPrefix")}
              <a
                href={`mailto:${trustConfig.supportEmail}`}
                className="font-medium text-ink-950 underline underline-offset-4"
              >
                {trustConfig.supportEmail}
              </a>
              {t("contact.descriptionSuffix")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/billing"
              className="inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-3 text-sm font-medium text-ink-950 transition-colors hover:border-ink-950/25"
            >
              {t("contact.actions.billing")}
            </Link>
            <Link
              href={trustConfig.supportPath}
              className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5"
              style={{ color: "var(--paper-strong)" }}
            >
              {t("contact.actions.contact")}
            </Link>
          </div>
        </PageSection>
      </section>
    </PageShell>
  );
}
