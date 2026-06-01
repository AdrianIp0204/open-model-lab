import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { previewFeedbackEmail, type FeedbackContext } from "@/lib/feedback";
import type { AppLocale } from "@/i18n/routing";
import { AnalyticsPageView } from "@/components/analytics/AnalyticsPageView";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import { OnboardingExperience } from "@/components/onboarding/OnboardingExperience";
import { PageSectionFrame } from "./PageSectionFrame";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import type { PageSectionNavConfig } from "./page-section-nav";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  feedbackContext?: FeedbackContext;
  feedbackWidgetPlacement?: "floating" | "inline";
  showFeedbackWidget?: boolean;
  sectionNav?: PageSectionNavConfig | null;
  layoutMode?: "contained" | "section-shell";
  locale?: AppLocale;
};

const defaultFeedbackContext: FeedbackContext = {
  pageType: "other",
  pagePath: "/",
  pageTitle: "Open Model Lab",
};

export function PageShell({
  children,
  className = "",
  feedbackContext = defaultFeedbackContext,
  feedbackWidgetPlacement,
  showFeedbackWidget = true,
  sectionNav = null,
  layoutMode = "contained",
  locale,
}: PageShellProps) {
  const t = useTranslations("Layout");
  const usesSectionShell = layoutMode === "section-shell" || Boolean(sectionNav);
  const bottomSafeSpaceClass = "pb-16";
  const mainClassName = usesSectionShell
    ? `page-enter w-full ${bottomSafeSpaceClass} ${className}`.trim()
    : `page-enter mx-auto w-full max-w-[88rem] px-4 ${bottomSafeSpaceClass} pt-4 sm:px-6 sm:pt-5 lg:px-8 ${className}`.trim();

  return (
    <div className="min-h-screen">
      <a
        href="#content"
        className="pointer-events-none fixed left-4 top-4 z-[60] -translate-y-24 rounded-full bg-ink-950 px-4 py-2 text-sm font-medium opacity-0 shadow-lg transition focus:pointer-events-auto focus:translate-y-0 focus:opacity-100"
        style={{ color: "#fffdf7" }}
      >
        {t("skipToContent")}
      </a>
      <SiteHeader />
      <main
        id="content"
        tabIndex={-1}
        data-onboarding-target="page-content"
        data-has-page-section-nav={sectionNav ? "" : undefined}
        data-page-shell-mode={usesSectionShell ? "section-shell" : "contained"}
        className={mainClassName}
      >
        <AnalyticsPageView context={feedbackContext} />
        {sectionNav ? (
          <PageSectionFrame sectionNav={sectionNav}>{children}</PageSectionFrame>
        ) : (
          children
        )}
      </main>
      <OnboardingExperience />
      {showFeedbackWidget ? (
        <FeedbackWidget
          context={feedbackContext}
          fallbackEmail={previewFeedbackEmail}
          mobileHidden={false}
          placement={
            feedbackWidgetPlacement ??
            (feedbackContext.pageType === "concept" ? "inline" : "floating")
          }
        />
      ) : null}
      <SiteFooter locale={locale} />
    </div>
  );
}
