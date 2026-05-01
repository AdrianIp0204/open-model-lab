import { NextIntlClientProvider } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getLocaleMessages, getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { buildPageMetadata } from "@/lib/metadata";
import { getBuyMeACoffeeUrl } from "@/lib/support";
import { trustConfig } from "@/lib/trust";
import { PageShell } from "@/components/layout/PageShell";
import { PageSection } from "@/components/layout/PageSection";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { MotionSection, MotionStaggerGroup } from "@/components/motion";

const paragraphKeys = {
  origin: ["p1", "p2", "p3", "p4", "p5"] as const,
  mission: ["p1", "p2", "p3", "p4"] as const,
  horizon: ["p1", "p2", "p3"] as const,
  support: ["p1", "p2", "p3"] as const,
  principles: ["p1", "p2", "p3"] as const,
  supportWays: ["subscribe", "donate", "feedback"] as const,
};

export async function buildAboutMetadata(locale: AppLocale) {
  const t = await getScopedTranslator(locale, "AboutPage");

  return buildPageMetadata({
    title: t("metadata.title"),
    description: t("metadata.description"),
    pathname: "/about",
    locale,
    keywords: ["about Open Model Lab", "founder story", "interactive learning"],
    category: "about",
  });
}

export default async function AboutPage({
  localeOverride,
}: {
  localeOverride?: AppLocale;
} = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const messages = await getLocaleMessages(locale);
  const t = await getScopedTranslator(locale, "AboutPage");
  const buyMeACoffeeUrl = getBuyMeACoffeeUrl();

  const originParagraphs = paragraphKeys.origin.map((key) => t(`story.origin.${key}`));
  const missionParagraphs = paragraphKeys.mission.map((key) => t(`story.mission.${key}`));
  const horizonParagraphs = paragraphKeys.horizon.map((key) => t(`story.horizon.${key}`));
  const supportParagraphs = paragraphKeys.support.map((key) =>
    key === "p2"
      ? t("support.paragraphs.p2", { priceLabel: trustConfig.premiumPlan.priceLabel })
      : t(`support.paragraphs.${key}`),
  );
  const supportWays = paragraphKeys.supportWays.map((key) => t(`support.ways.${key}`));
  const projectPrinciples = paragraphKeys.principles.map((key) =>
    t(`principles.items.${key}`),
  );

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <PageShell
        feedbackContext={{
          pageType: "about",
          pagePath: "/about",
          pageTitle: t("feedbackContext.pageTitle"),
        }}
      >
        <section className="space-y-6 sm:space-y-8">
        <SectionHeading
          eyebrow={t("hero.eyebrow")}
          title={t("hero.title")}
          description={t("hero.description")}
          action={
            <Link
              href="/concepts"
              data-testid="about-primary-cta"
              className="motion-button-solid inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-medium"
              style={{ color: "var(--paper-strong)" }}
            >
              {t("hero.action")}
            </Link>
          }
        />

        <MotionStaggerGroup
          as="div"
          className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
          baseDelay={80}
        >
          <PageSection
            id="about-story"
            as="article"
            className="motion-enter motion-card lab-panel p-6 sm:p-8"
          >
            <p className="lab-label">{t("story.label")}</p>

            <div className="mt-5 space-y-6">
              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-ink-950">
                  {t("story.origin.title")}
                </h2>
                <div className="space-y-4 text-sm leading-7 text-ink-700 sm:text-base">
                  {originParagraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>

              <section className="space-y-4 border-t border-line pt-6">
                <h2 className="text-2xl font-semibold text-ink-950">
                  {t("story.mission.title")}
                </h2>
                <div className="space-y-4 text-sm leading-7 text-ink-700 sm:text-base">
                  {missionParagraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
              <section className="space-y-4 border-t border-line pt-6">
                <h2 className="text-2xl font-semibold text-ink-950">
                  {t("story.horizon.title")}
                </h2>
                <div className="space-y-4 text-sm leading-7 text-ink-700 sm:text-base">
                  {horizonParagraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            </div>
          </PageSection>

          <PageSection
            id="about-principles"
            as="aside"
            className="motion-enter motion-card lab-panel p-6 sm:p-8"
          >
            <p className="lab-label">{t("principles.label")}</p>
            <div className="mt-5 space-y-3">
              {projectPrinciples.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-line bg-paper-strong px-4 py-4 text-sm leading-6 text-ink-700"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-line bg-paper-strong p-5">
              <p className="lab-label">{t("principles.rightNow.label")}</p>
              <p className="mt-3 text-sm leading-6 text-ink-700">
                {t("principles.rightNow.body")}
              </p>
            </div>

            <div className="mt-6 rounded-3xl border border-line bg-paper-strong p-5">
              <p className="lab-label">{t("principles.whyNow.label")}</p>
              <p className="mt-3 text-sm leading-6 text-ink-700">
                {t("principles.whyNow.body")}
              </p>
            </div>
          </PageSection>
        </MotionStaggerGroup>

        <PageSection id="about-support" as="div">
          <MotionSection as="section" className="motion-card lab-panel p-6 sm:p-8" delay={140}>
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-4">
                <div className="space-y-3">
                  <p className="lab-label">{t("support.label")}</p>
                  <h2 className="text-2xl font-semibold text-ink-950 sm:text-[1.95rem]">
                    {t("support.title")}
                  </h2>
                </div>

                <div className="space-y-4 text-sm leading-7 text-ink-700 sm:text-base">
                  {supportParagraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>

                <ul className="space-y-3 text-sm leading-6 text-ink-700">
                  {supportWays.map((item) => (
                    <li
                      key={item}
                      className="rounded-3xl border border-line bg-paper-strong px-4 py-3"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid gap-3">
                <article className="rounded-3xl border border-line bg-paper-strong p-5">
                  <p className="lab-label">{t("support.cards.subscribe.label")}</p>
                  <p className="mt-3 text-sm leading-6 text-ink-700">
                    {t("support.cards.subscribe.body")}
                  </p>
                  <Link
                    href="/pricing#compare"
                    className="motion-button-solid mt-5 inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-medium"
                    style={{ color: "var(--paper-strong)" }}
                  >
                    {t("support.cards.subscribe.primaryAction")}
                  </Link>
                  <Link
                    href="/billing"
                    className="motion-link mt-3 inline-flex text-sm font-medium text-ink-700 underline underline-offset-4 transition-colors hover:text-ink-950"
                  >
                    {t("support.cards.subscribe.secondaryAction")}
                  </Link>
                </article>

                <article className="rounded-3xl border border-line bg-paper-strong p-5">
                  <p className="lab-label">{t("support.cards.donate.label")}</p>
                  <p className="mt-3 text-sm leading-6 text-ink-700">
                    {t("support.cards.donate.body")}
                  </p>
                  <a
                    href={buyMeACoffeeUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="motion-button-outline mt-5 inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-medium text-ink-950 hover:border-ink-950/25"
                  >
                    {t("support.cards.donate.action")}
                  </a>
                </article>

                <article className="rounded-3xl border border-line bg-paper-strong p-5">
                  <p className="lab-label">{t("support.cards.openSource.label")}</p>
                  <p className="mt-3 text-sm leading-6 text-ink-700">
                    {t("support.cards.openSource.body")}
                  </p>
                </article>

                <article className="rounded-3xl border border-line bg-paper-strong p-5">
                  <p className="lab-label">{t("support.cards.feedback.label")}</p>
                  <p className="mt-3 text-sm leading-6 text-ink-700">
                    {t("support.cards.feedback.body")}
                  </p>
                  <Link
                    href="/contact"
                    className="motion-button-outline mt-5 inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-medium text-ink-950 hover:border-ink-950/25"
                  >
                    {t("support.cards.feedback.action")}
                  </Link>
                </article>
              </div>
            </div>
          </MotionSection>
        </PageSection>
        </section>
      </PageShell>
    </NextIntlClientProvider>
  );
}
