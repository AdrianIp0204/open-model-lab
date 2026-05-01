import { Link } from "@/i18n/navigation";
import { cookies } from "next/headers";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { buildPageMetadata } from "@/lib/metadata";
import { PageShell } from "@/components/layout/PageShell";
import { PageSection } from "@/components/layout/PageSection";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { PremiumSubscriptionActions } from "@/components/account/PremiumSubscriptionActions";
import { MotionSection, MotionStaggerGroup } from "@/components/motion";
import type { AccountSession } from "@/lib/account/model";
import { getAccountSessionForCookieHeader } from "@/lib/account/supabase";
import type { AppLocale } from "@/i18n/routing";

export async function buildPricingMetadata(locale: AppLocale) {
  const t = await getScopedTranslator(locale, "PricingPage");

  return buildPageMetadata({
    title: t("metadata.title"),
    description: t("metadata.description"),
    pathname: "/pricing",
    locale,
    keywords: ["pricing", "free core learning", "Supporter plan", "Open Model Lab"],
    category: "pricing",
  });
}

export default async function PricingPage({
  localeOverride,
}: {
  localeOverride?: AppLocale;
} = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const t = await getScopedTranslator(locale, "PricingPage");
  let initialSession: AccountSession | null = null;

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    initialSession = await getAccountSessionForCookieHeader(cookieHeader);
  } catch (error) {
    console.warn("[pricing] route failed to preload initial session", {
      message: error instanceof Error ? error.message : null,
      name: error instanceof Error ? error.name : null,
    });
  }

  const billingUnavailable = Boolean(initialSession?.warnings?.billingUnavailable);
  const billingNotConfigured = Boolean(initialSession?.warnings?.billingNotConfigured);
  const pricingSectionNav = {
    label: t("sectionNav.label"),
    title: t("sectionNav.title"),
    mobileLabel: t("sectionNav.mobileLabel"),
    items: [
      {
        id: "pricing-compare",
        label: t("sectionNav.items.compare.label"),
        compactLabel: t("sectionNav.items.compare.compactLabel"),
      },
      {
        id: "pricing-access-model",
        label: t("sectionNav.items.access.label"),
        compactLabel: t("sectionNav.items.access.compactLabel"),
      },
      {
        id: "pricing-ad-model",
        label: t("sectionNav.items.ads.label"),
        compactLabel: t("sectionNav.items.ads.compactLabel"),
      },
      {
        id: "pricing-subscription-actions",
        label: t("sectionNav.items.plan.label"),
        compactLabel: t("sectionNav.items.plan.compactLabel"),
      },
      {
        id: "pricing-billing-details",
        label: t("sectionNav.items.billing.label"),
        compactLabel: t("sectionNav.items.billing.compactLabel"),
      },
    ],
  } as const;
  const freeFeatures = [
    t("free.features.conceptPages"),
    t("free.features.simulations"),
    t("free.features.guidedPaths"),
    t("free.features.challengesAndPractice"),
    t("free.features.tools"),
    t("free.features.progress"),
    t("free.features.accountSync"),
  ];
  const supporterFeatures = [
    t("premium.features.adFree"),
    t("premium.features.savedSetups"),
    t("premium.features.savedCompareSetups"),
    t("premium.features.exactStateSharing"),
    t("premium.features.advancedReview"),
    t("premium.features.accountBackedStudyTools"),
    t("premium.features.roadmap"),
  ];

  return (
    <PageShell
      feedbackContext={{
        pageType: "pricing",
        pagePath: "/pricing",
        pageTitle: t("feedbackTitle"),
      }}
      sectionNav={pricingSectionNav}
    >
      <section className="space-y-6 sm:space-y-8">
        <SectionHeading
          eyebrow={t("hero.eyebrow")}
          title={t("hero.title")}
          description={t("hero.description")}
          action={
            <Link
              href="#pricing-subscription-actions"
              data-testid="pricing-primary-cta"
              className="motion-button-solid inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-medium"
              style={{ color: "var(--paper-strong)" }}
            >
              {t("hero.action")}
            </Link>
          }
        />

        <PageSection id="pricing-compare" as="section">
          <section id="compare" className="scroll-mt-24">
            <MotionStaggerGroup
              as="div"
              className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]"
              baseDelay={80}
            >
              <article className="motion-enter motion-card lab-panel p-6">
                <p className="lab-label">{t("free.label")}</p>
                <h3 className="mt-3 text-2xl font-semibold text-ink-950">
                  {t("free.title")}
                </h3>
                <p className="mt-3 text-sm leading-6 text-ink-700">
                  {t("free.description")}
                </p>
                <div className="mt-5 grid gap-3">
                  {freeFeatures.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-line bg-paper-strong px-4 py-3 text-sm text-ink-700"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </article>

              <article className="motion-enter motion-card lab-panel p-6">
                <p className="lab-label">{t("premium.label")}</p>
                <h3 className="mt-3 text-2xl font-semibold text-ink-950">
                  {t("premium.title")}
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {supporterFeatures.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-line bg-paper-strong px-4 py-3 text-sm text-ink-700"
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-6 text-ink-700">
                  {t("premium.description")}
                </p>
              </article>
            </MotionStaggerGroup>
          </section>
        </PageSection>

        <PageSection id="pricing-access-model" as="div">
          <MotionSection className="motion-card lab-panel p-6" delay={110}>
            <p className="lab-label">{t("access.label")}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-line bg-paper-strong px-4 py-3 text-sm leading-6 text-ink-700">
                {t("access.cards.signedOut")}
              </div>
              <div className="rounded-2xl border border-line bg-paper-strong px-4 py-3 text-sm leading-6 text-ink-700">
                {t("access.cards.signedInFree")}
              </div>
              <div className="rounded-2xl border border-line bg-paper-strong px-4 py-3 text-sm leading-6 text-ink-700">
                {t("access.cards.premium")}
              </div>
            </div>
          </MotionSection>
        </PageSection>

        <PageSection id="pricing-ad-model" as="div">
          <MotionSection className="motion-card lab-panel p-6" delay={130}>
            <p className="lab-label">{t("ads.label")}</p>
            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <p className="max-w-3xl text-sm leading-6 text-ink-700">
                {t("ads.description")}
              </p>
              <Link
                href="/ads"
                className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-3 text-sm font-medium text-ink-950 hover:border-ink-950/25"
              >
                {t("ads.action")}
              </Link>
            </div>
          </MotionSection>
        </PageSection>

        <PageSection id="pricing-subscription-actions" as="div">
          <MotionSection className="motion-card" delay={150}>
            <PremiumSubscriptionActions
              context="pricing"
              initialSession={initialSession}
              billingUnavailable={billingUnavailable}
              billingNotConfigured={billingNotConfigured}
            />
          </MotionSection>
        </PageSection>

        <PageSection id="pricing-billing-details" as="div">
          <MotionSection className="motion-card lab-panel p-6" delay={170}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <p className="max-w-3xl text-sm leading-6 text-ink-700">
                {t("billing.description")}
              </p>
              <Link
                href="/billing"
                className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-3 text-sm font-medium text-ink-950 hover:border-ink-950/25"
              >
                {t("billing.action")}
              </Link>
            </div>
          </MotionSection>
        </PageSection>
      </section>
    </PageShell>
  );
}
