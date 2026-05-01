"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useAccountSession } from "@/lib/account/client";
import { getLocalizedAccountDisplayName } from "@/lib/i18n/account";
import { dispatchOpenOnboardingHelp } from "@/lib/onboarding/events";
import { useProgressSnapshot, useProgressSyncState } from "@/lib/progress";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { primaryNavItems } from "./site-nav";

function isActivePath(
  pathname: string,
  item: (typeof primaryNavItems)[number],
) {
  const prefixes = item.matchPrefixes ?? [item.href];

  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function getRouteFamilyLabel(pathname: string) {
  if (pathname.startsWith("/start")) {
    return "start";
  }
  if (pathname.startsWith("/search")) {
    return "search";
  }
  if (pathname.startsWith("/tests")) {
    return "tests";
  }
  if (pathname.startsWith("/concepts/topics")) {
    return "topicRoutes";
  }
  if (pathname.startsWith("/concepts/")) {
    return "interactiveConcept";
  }
  if (pathname.startsWith("/concepts")) {
    return "conceptLibrary";
  }
  if (pathname.startsWith("/tools") || pathname.startsWith("/circuit-builder")) {
    return "learningTools";
  }
  if (pathname.startsWith("/tracks")) {
    return "starterTracks";
  }
  if (pathname.startsWith("/guided")) {
    return "guidedCollections";
  }
  if (pathname.startsWith("/challenges")) {
    return "challengeHub";
  }
  if (pathname.startsWith("/dashboard")) {
    return "dashboard";
  }
  if (pathname.startsWith("/account")) {
    return "accountAndSync";
  }
  if (pathname.startsWith("/contact")) {
    return "feedback";
  }
  return "default";
}

function getAccountStatusLabel(input: {
  sessionStatus: ReturnType<typeof useAccountSession>["status"];
  entitlementTier: ReturnType<typeof useAccountSession>["entitlement"]["tier"];
  syncMode: ReturnType<typeof useProgressSyncState>["mode"];
}) {
  if (input.sessionStatus !== "signed-in") {
    return "optionalSync";
  }

  if (input.entitlementTier !== "premium") {
    return "freeTier";
  }

  return "premium";
}

export function SiteHeader() {
  const pathname = usePathname();
  const routePath = pathname ?? "/";
  const t = useTranslations("Layout");
  const tAccountIdentity = useTranslations("AccountIdentity");
  const session = useAccountSession();
  const syncState = useProgressSyncState();
  const progressSnapshot = useProgressSnapshot();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const helpButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstMobileLinkRef = useRef<HTMLAnchorElement | null>(null);
  const routeFamilyLabelKey = getRouteFamilyLabel(routePath);
  const hasRecordedProgress =
    Object.keys(progressSnapshot.concepts).length > 0 ||
    Object.keys(progressSnapshot.topicTests ?? {}).length > 0 ||
    Object.keys(progressSnapshot.packTests ?? {}).length > 0;
  const continueHref = "/start";
  const continueLabel = hasRecordedProgress
    ? t("common.continueLearning")
    : t("common.startLearning");
  const accountHref = session.status === "signed-in" ? "/dashboard" : "/account";
  const localizedAccountDisplayName = session.user
    ? getLocalizedAccountDisplayName(session.user.displayName, tAccountIdentity)
    : null;
  const accountLabel =
    localizedAccountDisplayName ??
    (session.initialized ? t("common.signIn") : t("common.account"));
  const accountStatusLabel = session.initialized
    ? t(
        `accountStatus.${getAccountStatusLabel({
          sessionStatus: session.status,
          entitlementTier: session.entitlement.tier,
          syncMode: syncState.mode,
        })}`,
      )
    : t("common.loading");

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    firstMobileLinkRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      setMobileOpen(false);
      menuButtonRef.current?.focus();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/92 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[88rem] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          data-onboarding-target="site-brand"
          className="group inline-flex min-w-0 items-center gap-3 sm:gap-4"
        >
          <Image
            src="/branding/open-model-lab-mark.svg"
            alt=""
            aria-hidden="true"
            width={32}
            height={32}
            sizes="(max-width: 640px) 28px, 32px"
            priority
            className="h-7 w-7 shrink-0 sm:h-8 sm:w-8"
          />
          <span className="min-w-0">
            <span className="block truncate whitespace-nowrap text-[0.95rem] font-semibold leading-none tracking-[-0.01em] text-ink-950 sm:text-base">
              {t("productName")}
            </span>
            <span aria-hidden="true" className="section-kicker mt-1 hidden truncate sm:block">
              {t(`routeFamily.${routeFamilyLabelKey}`)}
            </span>
          </span>
        </Link>

        <nav
          aria-label="Primary"
          data-onboarding-target="main-navigation"
          className="hidden items-center gap-2 xl:flex"
        >
          {primaryNavItems.map((item) => {
            const active = isActivePath(routePath, item);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "motion-nav-pill inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-medium",
                  active
                    ? "border border-ink-950 bg-ink-950 text-paper-strong shadow-sm"
                    : "text-ink-700 hover:bg-paper-strong hover:text-ink-950",
                ].join(" ")}
              >
                {t(`nav.${item.labelKey}`)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            ref={helpButtonRef}
            type="button"
            aria-label={t("help.openAriaLabel")}
            aria-haspopup="dialog"
            data-onboarding-target="help-entry"
            onClick={() => dispatchOpenOnboardingHelp(helpButtonRef.current)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-paper-strong px-3 py-2 text-sm font-semibold text-ink-950 transition hover:border-ink-950/20 hover:bg-white"
          >
            <span
              aria-hidden="true"
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink-950 text-xs font-semibold text-paper-strong"
            >
              ?
            </span>
            <span className="hidden sm:inline">{t("help.label")}</span>
          </button>
          <div className="hidden md:block">
            <LocaleSwitcher />
          </div>
          <div className="hidden md:block">
            <Link
              href={continueHref}
              data-onboarding-target="continue-learning"
              className="cta-primary"
            >
              {continueLabel}
            </Link>
          </div>
          <div className="hidden xl:block">
            <Link
              href={accountHref}
              data-onboarding-target="account-sync"
              className="cta-secondary items-center gap-2"
            >
              <span>{accountLabel}</span>
              <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-500">
                {accountStatusLabel}
              </span>
            </Link>
          </div>
          <div className="xl:hidden">
            <button
              ref={menuButtonRef}
              type="button"
              aria-expanded={mobileOpen}
              aria-controls="mobile-primary-nav"
              aria-label={
                mobileOpen ? t("closeNavigationMenu") : t("openNavigationMenu")
              }
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-semibold text-ink-950"
              onClick={() => setMobileOpen((current) => !current)}
            >
              {mobileOpen ? t("common.close") : t("common.menu")}
            </button>
          </div>
        </div>
      </div>

      <div
        id="mobile-primary-nav"
        hidden={!mobileOpen}
        className="max-h-[calc(100dvh-4.25rem)] overflow-y-auto overscroll-contain border-t border-line bg-paper/96 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] lg:hidden"
      >
        <div className="page-band space-y-3 p-3">
          <LocaleSwitcher className="flex" />
          <nav aria-label="Mobile primary" className="grid gap-2">
            {primaryNavItems.map((item, index) => {
              const active = isActivePath(routePath, item);
              const descriptionId = `mobile-primary-nav-description-${item.labelKey}`;

              return (
                <Link
                  key={item.href}
                  ref={index === 0 ? firstMobileLinkRef : undefined}
                  href={item.href}
                  aria-label={t(`nav.${item.labelKey}`)}
                  aria-describedby={descriptionId}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={[
                    "list-row-card flex items-start justify-between gap-3 px-4 py-3",
                    active
                      ? "border-ink-950 bg-ink-950 text-paper-strong"
                      : "text-ink-800",
                  ].join(" ")}
                >
                  <span className="min-w-0 space-y-1.5">
                    <span className="block text-base font-medium">
                      {t(`nav.${item.labelKey}`)}
                    </span>
                    <span
                      id={descriptionId}
                      className={[
                        "block text-sm leading-6",
                        active ? "text-paper-strong/80" : "text-ink-600",
                      ].join(" ")}
                    >
                      {t(`navDescriptions.${item.labelKey}`)}
                    </span>
                  </span>
                  <span className="section-kicker shrink-0 self-center">
                    {active ? t(`routeFamily.${routeFamilyLabelKey}`) : ""}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href={continueHref}
              onClick={() => setMobileOpen(false)}
              className="cta-primary"
            >
              {continueLabel}
            </Link>
            <Link
              href={accountHref}
              onClick={() => setMobileOpen(false)}
              className="cta-secondary justify-between"
            >
              <span>{accountLabel}</span>
              <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-500">
                {accountStatusLabel}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
