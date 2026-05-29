import type { Metadata } from "next";
import { PageSection } from "@/components/layout/PageSection";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { buildPageMetadata } from "@/lib/metadata";
import { getTrustLastUpdatedLabel, trustConfig } from "@/lib/trust";

const billingCopyKeys = {
  premiumIncludes: [
    "savedExactStateSetups",
    "savedCompareSetups",
    "exactStateSharing",
    "advancedStudyTools",
    "adFreeBrowsing",
  ],
  sections: [
    "checkout",
    "management",
    "cancellation",
    "paymentIssues",
    "refunds",
    "achievementDiscount",
  ],
  beforeYouBuy: ["pricing", "account", "about", "concepts"],
} as const;

async function getBillingPageCopy(locale: AppLocale) {
  const t = await getScopedTranslator(locale, "BillingPage");
  const premiumPlanDisplayName = t("premiumPlan.displayName");
  const achievementDiscountLabel = t("premiumPlan.achievementDiscountLabel");
  const billingInterval = t("premiumPlan.billingInterval", {
    interval: trustConfig.premiumPlan.billingIntervalLabel.toLowerCase(),
  });
  const premiumIncludes = billingCopyKeys.premiumIncludes.map((key) =>
    t(`premiumIncludes.${key}`),
  );
  const billingSections = billingCopyKeys.sections.map((key) => ({
    title: t(`sections.${key}.title`),
    paragraphs: [
      t(`sections.${key}.paragraphs.p1`, {
        planName: premiumPlanDisplayName,
        englishPlanName: trustConfig.premiumPlan.displayName,
        billingInterval,
        priceLabel: trustConfig.premiumPlan.priceLabel,
        supportEmail: trustConfig.billingSupportEmail,
        achievementDiscountLabel,
      }),
      t(`sections.${key}.paragraphs.p2`, {
        supportEmail: trustConfig.billingSupportEmail,
        achievementDiscountLabel,
      }),
    ],
  }));

  return {
    premiumPlanDisplayName,
    metadata: {
      title: t("metadata.title"),
      description: t("metadata.description"),
      keywords: [
        t("metadata.keywords.billing"),
        t("metadata.keywords.supporterBilling"),
        t("metadata.keywords.subscriptionCancellation"),
        t("metadata.keywords.refundPolicy"),
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
          id: "billing-overview",
          label: t("sectionNav.items.overview.label"),
          compactLabel: t("sectionNav.items.overview.compactLabel"),
        },
        {
          id: "billing-plan",
          label: t("sectionNav.items.plan.label"),
          compactLabel: t("sectionNav.items.plan.compactLabel"),
        },
        {
          id: "billing-policy",
          label: t("sectionNav.items.policy.label"),
          compactLabel: t("sectionNav.items.policy.compactLabel"),
        },
        {
          id: "billing-support",
          label: t("sectionNav.items.support.label"),
          compactLabel: t("sectionNav.items.support.compactLabel"),
        },
      ],
    },
    hero: {
      eyebrow: t("hero.eyebrow"),
      title: t("hero.title"),
      description: t("hero.description"),
    },
    labels: {
      lastUpdated: t("labels.lastUpdated"),
      planSnapshot: t("labels.planSnapshot"),
      recurringSubscription: t("labels.recurringSubscription", { billingInterval }),
      signInRequired: t("labels.signInRequired"),
      premiumIncludes: t("labels.premiumIncludes"),
      beforeYouBuy: t("labels.beforeYouBuy"),
      billingSupport: t("labels.billingSupport"),
    },
    beforeYouBuyLinks: billingCopyKeys.beforeYouBuy.map((key) => ({
      href:
        key === "pricing"
          ? "/pricing#compare"
          : key === "account"
            ? "/account"
            : key === "about"
              ? "/about"
              : "/concepts",
      label: t(`beforeYouBuy.${key}`),
    })),
    supportBody: {
      prefix: t("supportBody.prefix"),
      suffix: t("supportBody.suffix"),
    },
    supportActions: {
      contact: t("supportActions.contact"),
      pricing: t("supportActions.pricing"),
    },
    premiumIncludes,
    billingSections,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  return buildBillingMetadata(await resolveServerLocaleFallback());
}

export async function buildBillingMetadata(locale: AppLocale): Promise<Metadata> {
  const copy = await getBillingPageCopy(locale);

  return buildPageMetadata({
    title: copy.metadata.title,
    description: copy.metadata.description,
    pathname: "/billing",
    locale,
    keywords: copy.metadata.keywords,
    category: copy.metadata.category,
  });
}

export default async function BillingPage({
  localeOverride,
}: {
  localeOverride?: AppLocale;
} = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const copy = await getBillingPageCopy(locale);

  return (
    <PageShell
      feedbackContext={{
        pageType: "other",
        pagePath: "/billing",
        pageTitle: copy.feedbackTitle,
      }}
      sectionNav={copy.sectionNav}
    >
      <section className="space-y-6 sm:space-y-8">
        <PageSection id="billing-overview" as="div" className="space-y-6">
          <SectionHeading
            level={1}
            eyebrow={copy.hero.eyebrow}
            title={copy.hero.title}
            description={copy.hero.description}
          />

          <section className="rounded-3xl border border-line bg-paper-strong px-5 py-4 text-sm text-ink-700">
            <span className="lab-label">{copy.labels.lastUpdated}</span>
            <p className="mt-2">{getTrustLastUpdatedLabel("billing")}</p>
          </section>
        </PageSection>

        <PageSection
          id="billing-plan"
          as="section"
          className="grid gap-4 lg:grid-cols-[0.94fr_1.06fr]"
        >
          <article className="lab-panel p-6">
            <p className="lab-label">{copy.labels.planSnapshot}</p>
            <h2 className="mt-3 text-2xl font-semibold text-ink-950">
              {copy.premiumPlanDisplayName}
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-ink-700">
              <p>{trustConfig.premiumPlan.priceLabel}</p>
              <p>{copy.labels.recurringSubscription}</p>
              <p>{copy.labels.signInRequired}</p>
            </div>
          </article>

          <article className="lab-panel p-6">
            <p className="lab-label">{copy.labels.premiumIncludes}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {copy.premiumIncludes.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-line bg-paper-strong px-4 py-3 text-sm text-ink-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </article>
        </PageSection>

        <PageSection id="billing-policy" as="div" className="grid gap-4 md:grid-cols-2">
          {copy.billingSections.map((section) => (
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

        <section className="lab-panel p-6">
          <p className="lab-label">{copy.labels.beforeYouBuy}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {copy.beforeYouBuyLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-line bg-paper-strong px-4 py-3 text-sm text-ink-700 transition-colors hover:border-ink-950/25"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        <PageSection
          id="billing-support"
          as="section"
          className="lab-panel flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="space-y-2">
            <p className="lab-label">{copy.labels.billingSupport}</p>
            <p className="text-sm leading-6 text-ink-700">
              {copy.supportBody.prefix}
              <a
                href={`mailto:${trustConfig.billingSupportEmail}`}
                className="font-medium text-ink-950 underline underline-offset-4"
              >
                {trustConfig.billingSupportEmail}
              </a>
              {copy.supportBody.suffix}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={trustConfig.supportPath}
              className="inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-3 text-sm font-medium text-ink-950 transition-colors hover:border-ink-950/25"
            >
              {copy.supportActions.contact}
            </Link>
            <Link
              href="/pricing#compare"
              className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5"
              style={{ color: "var(--paper-strong)" }}
            >
              {copy.supportActions.pricing}
            </Link>
          </div>
        </PageSection>
      </section>
    </PageShell>
  );
}
