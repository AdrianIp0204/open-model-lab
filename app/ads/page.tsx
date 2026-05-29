import type { Metadata } from "next";
import { PageSection } from "@/components/layout/PageSection";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { buildPageMetadata } from "@/lib/metadata";

const adsCopyKeys = {
  allowedSurfaces: [
    "home",
    "concepts",
    "subjectDirectory",
    "topicDirectory",
    "topicPages",
    "guidedCollections",
    "searchResults",
    "conceptPageZones",
  ],
  protectedSurfaces: [
    "simulationStage",
    "interactiveLab",
    "learningModes",
    "challengePages",
    "accountSurfaces",
    "trustPages",
  ],
} as const;

async function getAdsPageCopy(locale: AppLocale) {
  const t = await getScopedTranslator(locale, "AdsPage");
  const allowedSurfaces = adsCopyKeys.allowedSurfaces.map((key) =>
    t(`allowedSurfaces.${key}`),
  );
  const protectedSurfaces = adsCopyKeys.protectedSurfaces.map((key) =>
    t(`protectedSurfaces.${key}`),
  );

  return {
    metadata: {
      title: t("metadata.title"),
      description: t("metadata.description"),
      keywords: [
        t("metadata.keywords.ads"),
        t("metadata.keywords.advertising"),
        t("metadata.keywords.adsense"),
        t("metadata.keywords.supporterAdFree"),
        t("metadata.keywords.productName"),
      ],
      category: t("metadata.category"),
    },
    feedbackTitle: t("feedbackTitle"),
    sectionNav: {
      label: t("sectionNav.label"),
      title: t("sectionNav.title"),
      mobileLabel: t("sectionNav.mobileLabel"),
      items: [
        {
          id: "ads-overview",
          label: t("sectionNav.items.overview.label"),
          compactLabel: t("sectionNav.items.overview.compactLabel"),
        },
        {
          id: "ads-placements",
          label: t("sectionNav.items.allowed.label"),
          compactLabel: t("sectionNav.items.allowed.compactLabel"),
        },
        {
          id: "ads-protected",
          label: t("sectionNav.items.protected.label"),
          compactLabel: t("sectionNav.items.protected.compactLabel"),
        },
        {
          id: "ads-provider",
          label: t("sectionNav.items.provider.label"),
          compactLabel: t("sectionNav.items.provider.compactLabel"),
        },
      ],
    },
    hero: {
      eyebrow: t("hero.eyebrow"),
      title: t("hero.title"),
      description: t("hero.description"),
    },
    labels: {
      currentModel: t("labels.currentModel"),
      allowedPlacements: t("labels.allowedPlacements"),
      protectedLearningSurfaces: t("labels.protectedLearningSurfaces"),
      providerNote: t("labels.providerNote"),
    },
    paragraphs: {
      model: {
        prefix: t("paragraphs.model.prefix"),
        linkLabel: t("paragraphs.model.linkLabel"),
        suffix: t("paragraphs.model.suffix"),
      },
      body: [
        t("paragraphs.body.p1"),
        t("paragraphs.body.p2"),
      ],
      provider: [
        t("paragraphs.provider.p1"),
        t("paragraphs.provider.p2"),
      ],
      providerLinks: {
        privacyPrefix: t("paragraphs.providerLinks.privacyPrefix"),
        privacyLabel: t("paragraphs.providerLinks.privacyLabel"),
        privacySuffix: t("paragraphs.providerLinks.privacySuffix"),
        contactLabel: t("paragraphs.providerLinks.contactLabel"),
        contactSuffix: t("paragraphs.providerLinks.contactSuffix"),
      },
    },
    pricingLabel: t("pricingLabel"),
    allowedSurfaces,
    protectedSurfaces,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  return buildAdsMetadata(await resolveServerLocaleFallback());
}

export async function buildAdsMetadata(locale: AppLocale): Promise<Metadata> {
  const copy = await getAdsPageCopy(locale);

  return buildPageMetadata({
    title: copy.metadata.title,
    description: copy.metadata.description,
    pathname: "/ads",
    locale,
    keywords: copy.metadata.keywords,
    category: copy.metadata.category,
  });
}

export default async function AdsPage({
  localeOverride,
}: {
  localeOverride?: AppLocale;
} = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const copy = await getAdsPageCopy(locale);

  return (
    <PageShell
      feedbackContext={{
        pageType: "other",
        pagePath: "/ads",
        pageTitle: copy.feedbackTitle,
      }}
      sectionNav={copy.sectionNav}
    >
      <section className="space-y-6 sm:space-y-8">
        <PageSection id="ads-overview" as="div" className="space-y-6">
          <SectionHeading
            level={1}
            eyebrow={copy.hero.eyebrow}
            title={copy.hero.title}
            description={copy.hero.description}
          />
        </PageSection>

        <PageSection
          id="ads-placements"
          as="section"
          className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]"
        >
          <article className="lab-panel p-6">
            <p className="lab-label">{copy.labels.currentModel}</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-ink-700">
              <p>
                {copy.paragraphs.model.prefix}
                <Link
                  href="/pricing"
                  className="font-medium text-ink-950 underline underline-offset-4"
                >
                  {copy.paragraphs.model.linkLabel}
                </Link>
                {copy.paragraphs.model.suffix}
              </p>
              <p>{copy.paragraphs.body[0]}</p>
              <p>{copy.paragraphs.body[1]}</p>
            </div>
          </article>

          <article className="lab-panel p-6">
            <p className="lab-label">{copy.labels.allowedPlacements}</p>
            <div className="mt-4 grid gap-3">
              {copy.allowedSurfaces.map((surface) => (
                <div
                  key={surface}
                  className="rounded-2xl border border-line bg-paper-strong px-4 py-3 text-sm text-ink-700"
                >
                  {surface}
                </div>
              ))}
            </div>
          </article>
        </PageSection>

        <PageSection id="ads-protected" as="section" className="lab-panel p-6">
          <p className="lab-label">{copy.labels.protectedLearningSurfaces}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {copy.protectedSurfaces.map((surface) => (
              <div
                key={surface}
                className="rounded-2xl border border-line bg-paper-strong px-4 py-3 text-sm text-ink-700"
              >
                {surface}
              </div>
            ))}
          </div>
        </PageSection>

        <PageSection id="ads-provider" as="section" className="lab-panel p-6">
          <p className="lab-label">{copy.labels.providerNote}</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-ink-700">
            <p>{copy.paragraphs.provider[0]}</p>
            <p>{copy.paragraphs.provider[1]}</p>
            <p>
              {copy.paragraphs.providerLinks.privacyPrefix}
              <Link
                href="/privacy"
                className="font-medium text-ink-950 underline underline-offset-4"
              >
                {copy.paragraphs.providerLinks.privacyLabel}
              </Link>
              {copy.paragraphs.providerLinks.privacySuffix}
              <Link
                href="/contact"
                className="font-medium text-ink-950 underline underline-offset-4"
              >
                {copy.paragraphs.providerLinks.contactLabel}
              </Link>
              {copy.paragraphs.providerLinks.contactSuffix}
            </p>
          </div>
        </PageSection>
      </section>
    </PageShell>
  );
}
