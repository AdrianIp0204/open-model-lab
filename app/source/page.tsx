import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { PageSection } from "@/components/layout/PageSection";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { buildPageMetadata } from "@/lib/metadata";

const sourceCopyKeys = {
  posture: ["p1", "p2", "p3"],
  lanes: ["conceptFix", "accessibility", "learnerCopy", "regressionTest"],
  boundaries: ["privateSupport", "ownerReview", "deploymentSecrets"],
} as const;

async function getSourcePageCopy(locale: AppLocale) {
  const t = await getScopedTranslator(locale, "SourcePage");

  return {
    metadata: {
      title: t("metadata.title"),
      description: t("metadata.description"),
      keywords: [
        t("metadata.keywords.productName"),
        t("metadata.keywords.source"),
        t("metadata.keywords.contribute"),
        t("metadata.keywords.scienceLearning"),
        t("metadata.keywords.publicGood"),
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
          id: "source-overview",
          label: t("sectionNav.items.posture.label"),
          compactLabel: t("sectionNav.items.posture.compactLabel"),
        },
        {
          id: "source-contribution-lanes",
          label: t("sectionNav.items.lanes.label"),
          compactLabel: t("sectionNav.items.lanes.compactLabel"),
        },
        {
          id: "source-boundaries",
          label: t("sectionNav.items.boundaries.label"),
          compactLabel: t("sectionNav.items.boundaries.compactLabel"),
        },
        {
          id: "source-next",
          label: t("sectionNav.items.help.label"),
          compactLabel: t("sectionNav.items.help.compactLabel"),
        },
      ],
    },
    hero: {
      eyebrow: t("hero.eyebrow"),
      title: t("hero.title"),
      description: t("hero.description"),
      action: t("hero.action"),
    },
    posture: {
      label: t("posture.label"),
      title: t("posture.title"),
      body: sourceCopyKeys.posture.map((key) => t(`posture.body.${key}`)),
    },
    lanes: {
      label: t("lanes.label"),
      items: sourceCopyKeys.lanes.map((key) => t(`lanes.items.${key}`)),
    },
    boundaries: {
      label: t("boundaries.label"),
      items: sourceCopyKeys.boundaries.map((key) =>
        t(`boundaries.items.${key}`),
      ),
    },
    next: {
      label: t("next.label"),
      body: t("next.body"),
      primaryAction: t("next.primaryAction"),
      secondaryAction: t("next.secondaryAction"),
    },
  };
}

export async function buildSourceMetadata(locale: AppLocale): Promise<Metadata> {
  const copy = await getSourcePageCopy(locale);

  return buildPageMetadata({
    title: copy.metadata.title,
    description: copy.metadata.description,
    pathname: "/source",
    locale,
    keywords: copy.metadata.keywords,
    category: copy.metadata.category,
  });
}

export async function generateMetadata(): Promise<Metadata> {
  return buildSourceMetadata(await resolveServerLocaleFallback());
}

export default async function SourcePage({
  localeOverride,
}: {
  localeOverride?: AppLocale;
} = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const copy = await getSourcePageCopy(locale);

  return (
    <PageShell
      feedbackContext={{
        pageType: "other",
        pagePath: "/source",
        pageTitle: copy.feedbackTitle,
      }}
      sectionNav={copy.sectionNav}
    >
      <section className="space-y-6 sm:space-y-8">
        <PageSection id="source-overview" as="section" className="space-y-6">
          <SectionHeading
            level={1}
            eyebrow={copy.hero.eyebrow}
            title={copy.hero.title}
            description={copy.hero.description}
            action={
              <Link
                href="/contact"
                data-testid="source-primary-cta"
                className="motion-button-solid inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-medium"
                style={{ color: "var(--paper-strong)" }}
              >
                {copy.hero.action}
              </Link>
            }
          />

          <article className="lab-panel p-6 sm:p-8">
            <p className="lab-label">{copy.posture.label}</p>
            <h2 className="mt-3 text-2xl font-semibold text-ink-950">
              {copy.posture.title}
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-ink-700 sm:text-base">
              {copy.posture.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>
        </PageSection>

        <PageSection
          id="source-contribution-lanes"
          as="section"
          className="lab-panel p-6 sm:p-8"
        >
          <p className="lab-label">{copy.lanes.label}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {copy.lanes.items.map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-line bg-paper-strong px-4 py-4 text-sm leading-6 text-ink-700"
              >
                {item}
              </div>
            ))}
          </div>
        </PageSection>

        <PageSection id="source-boundaries" as="section" className="lab-panel p-6 sm:p-8">
          <p className="lab-label">{copy.boundaries.label}</p>
          <div className="mt-5 space-y-3">
            {copy.boundaries.items.map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-line bg-paper-strong px-4 py-4 text-sm leading-6 text-ink-700"
              >
                {item}
              </div>
            ))}
          </div>
        </PageSection>

        <PageSection id="source-next" as="section" className="lab-panel p-6 sm:p-8">
          <p className="lab-label">{copy.next.label}</p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-ink-700 sm:text-base">
            {copy.next.body}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="motion-button-solid inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-medium"
              style={{ color: "var(--paper-strong)" }}
            >
              {copy.next.primaryAction}
            </Link>
            <Link
              href="/about"
              className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-medium text-ink-950 hover:border-ink-950/25"
            >
              {copy.next.secondaryAction}
            </Link>
          </div>
        </PageSection>
      </section>
    </PageShell>
  );
}
