import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { analyticsEnabled } from "@/lib/analytics";
import { getConceptCatalogMetrics } from "@/lib/content";
import { trustConfig } from "@/lib/trust";
import { footerTrustNavItems, footerUtilityNavItems, primaryNavItems } from "./site-nav";

export function SiteFooter() {
  const t = useTranslations("Layout");
  const catalogMetrics = getConceptCatalogMetrics();
  const productFacts = [
    {
      label: t("footer.productFacts.progress.label"),
      description: t("footer.productFacts.progress.description"),
    },
    {
      label: t("footer.productFacts.advertising.label"),
      description: t("footer.productFacts.advertising.description"),
    },
    {
      label: t("footer.productFacts.analytics.label"),
      description: analyticsEnabled
        ? t("footer.productFacts.analytics.enabled")
        : t("footer.productFacts.analytics.disabled"),
    },
    {
      label: t("footer.productFacts.feedback.label"),
      description: t("footer.productFacts.feedback.description", {
        email: trustConfig.supportEmail,
      }),
    },
  ] as const;

  return (
    <footer className="border-t border-line bg-paper/80">
      <div className="mx-auto grid min-w-0 w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.25fr_0.9fr] lg:px-8">
        <div className="min-w-0 space-y-4">
          <p className="lab-label">{t("productName")}</p>
          <p className="max-w-xl text-sm leading-6 text-ink-700">
            {t("footer.description")}
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-ink-500">
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1">
              {t("footer.badges.staticFirst")}
            </span>
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1">
              {t("footer.badges.localFirstProgress")}
            </span>
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1">
              {t("footer.badges.modules", {count: catalogMetrics.totalConcepts})}
            </span>
          </div>
        </div>

        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-3">
            <p className="lab-label">{t("footer.navigate")}</p>
            <ul className="space-y-2 text-sm text-ink-700">
              {primaryNavItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="motion-link inline-flex transition-colors hover:text-ink-950">
                    {t(`nav.${item.labelKey}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 space-y-3">
            <p className="lab-label">{t("footer.howItWorks")}</p>
            <dl className="space-y-3">
              {productFacts.map((item) => (
                <div
                  key={item.label}
                  className="motion-card min-w-0 rounded-3xl border border-line bg-paper-strong px-4 py-3"
                >
                  <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-700">
                    {item.label}
                  </dt>
                  <dd className="mt-2 min-w-0 wrap-anywhere text-sm leading-6 text-ink-700">{item.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="min-w-0 space-y-3 border-t border-line/80 pt-6 lg:col-span-2">
          <div className="flex flex-wrap gap-3 text-sm text-ink-700">
            <div
              role="group"
              aria-label={t("footer.trust")}
              data-testid="footer-trust-group"
              className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-[20px] border border-line bg-paper-strong/90 px-4 py-3"
            >
              <span className="lab-label">{t("footer.trust")}</span>
              {footerTrustNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="motion-link inline-flex transition-colors hover:text-ink-950"
                >
                  {t(`nav.${item.labelKey}`)}
                </Link>
              ))}
            </div>
            <div
              role="group"
              aria-label={t("footer.more")}
              data-testid="footer-more-group"
              className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-[20px] border border-line bg-paper-strong/90 px-4 py-3"
            >
              <span className="lab-label">{t("footer.more")}</span>
              {footerUtilityNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="motion-link inline-flex transition-colors hover:text-ink-950"
                >
                  {t(`nav.${item.labelKey}`)}
                </Link>
              ))}
            </div>
          </div>
          <p className="max-w-3xl wrap-anywhere text-sm leading-6 text-ink-700">
            {t.rich("footer.support", {
              email: () => (
                <a
                  key="footer-support-email"
                  href={`mailto:${trustConfig.billingSupportEmail}`}
                  className="font-medium text-ink-950 underline underline-offset-4"
                >
                  {trustConfig.billingSupportEmail}
                </a>
              ),
              contact: () => (
                <Link
                  key="footer-support-contact"
                  href={trustConfig.supportPath}
                  className="font-medium text-ink-950 underline underline-offset-4"
                >
                  {t("nav.contact")}
                </Link>
              ),
            })}
          </p>
          <p className="max-w-3xl wrap-anywhere text-sm leading-6 text-ink-700">
            {t("footer.adsNote")}
          </p>
        </div>
      </div>
    </footer>
  );
}
