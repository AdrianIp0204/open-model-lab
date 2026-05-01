"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { refreshAccountSession, useAccountSession } from "@/lib/account/client";
import type { AccountSession } from "@/lib/account/model";
import type { AppLocale } from "@/i18n/routing";
import type { StripeBillingConfigIssue } from "@/lib/billing/env";
import {
  deriveBillingLifecycleStatus,
  deriveBillingReturnStatus,
  isCheckoutReturnResolved,
  parseBillingReturnQueryState,
  type BillingLifecycleStatus,
  type BillingReturnQueryState,
  type BillingReturnPhase,
} from "@/lib/billing/ui";
import {
  reconcileStripeCheckoutReturn,
  startStripeHostedBillingAction,
} from "@/lib/billing/client";
import { localizeShareHref } from "@/lib/share-links";

type PremiumSubscriptionActionsProps = {
  context: "pricing" | "account";
  className?: string;
  initialSession?: AccountSession | null;
  billingUnavailable?: boolean;
  billingNotConfigured?: boolean;
};

type BillingAction = "checkout" | "portal" | "refresh" | null;
type Translator = (key: string, values?: Record<string, unknown>) => string;

const BILLING_RETURN_POLL_INTERVAL_MS = 1_000;
const BILLING_CHECKOUT_RETURN_MAX_ATTEMPTS = 5;
const BILLING_PORTAL_RETURN_MAX_ATTEMPTS = 10;
const BILLING_PORTAL_RETURN_BASELINE_STORAGE_KEY =
  "open-model-lab.billing.portal-return-baseline.v1";

function getBillingReturnMaxAttempts(queryState: BillingReturnQueryState) {
  return queryState === "portal-returned"
    ? BILLING_PORTAL_RETURN_MAX_ATTEMPTS
    : BILLING_CHECKOUT_RETURN_MAX_ATTEMPTS;
}

function formatPeriodEnd(locale: string, value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

function buildBillingReturnFingerprint(input: {
  entitlement: AccountSession["entitlement"];
  billing: AccountSession["billing"] | null;
}) {
  return JSON.stringify({
    entitlementTier: input.entitlement.tier,
    entitlementSource: input.entitlement.source,
    entitlementUpdatedAt: input.entitlement.updatedAt ?? null,
    billingSource: input.billing?.source ?? null,
    billingStatus: input.billing?.status ?? null,
    billingCancelAtPeriodEnd: input.billing?.cancelAtPeriodEnd ?? null,
    billingCurrentPeriodEnd: input.billing?.currentPeriodEnd ?? null,
    canStartCheckout: input.billing?.canStartCheckout ?? null,
    canManageSubscription: input.billing?.canManageSubscription ?? null,
  });
}

const billingIssueLabelKeys: Record<StripeBillingConfigIssue, string> = {
  missing_secret_key: "billingIssues.missingSecretKey",
  missing_webhook_secret: "billingIssues.missingWebhookSecret",
  missing_price_id: "billingIssues.missingPriceId",
  invalid_checkout_success_url: "billingIssues.invalidCheckoutSuccessUrl",
  invalid_checkout_cancel_url: "billingIssues.invalidCheckoutCancelUrl",
  invalid_portal_return_url: "billingIssues.invalidPortalReturnUrl",
};

function formatBillingIssueList(
  issues: StripeBillingConfigIssue[],
  t: Translator,
  locale: string,
) {
  const reasons = issues.map((issue) => t(billingIssueLabelKeys[issue]));

  try {
    return new Intl.ListFormat(locale, {
      style: "long",
      type: "conjunction",
    }).format(reasons);
  } catch {
    return reasons.join(", ");
  }
}

function getLifecycleDescription(
  input: {
    lifecycleStatus: BillingLifecycleStatus;
    periodEndLabel: string | null;
  },
  t: Translator,
) {
  switch (input.lifecycleStatus) {
    case "active_canceling_at_period_end":
      return input.periodEndLabel
        ? t("messages.activeCancelingAtPeriodEnd", {
            periodEnd: input.periodEndLabel,
          })
        : t("messages.activeUntilPeriodEnd");
    case "payment_issue":
      return t("messages.paymentIssue");
    case "ended":
      return t("messages.ended");
    case "manual_premium":
      return t("messages.manualPremium");
    case "active":
      return t("messages.active");
    default:
      return t("messages.default");
  }
}

function getReturnNotice(
  input: {
    returnStatus: ReturnType<typeof deriveBillingReturnStatus>;
    lifecycleStatus: BillingLifecycleStatus;
    periodEndLabel: string | null;
  },
  t: Translator,
) {
  switch (input.returnStatus) {
    case "checkout_canceled":
      return {
        tone: "amber",
        message: t("notices.checkoutCanceled"),
      } as const;
    case "checkout_return_pending":
      return {
        tone: "teal",
        message: t("notices.checkoutReturnPending"),
      } as const;
    case "checkout_return_confirmed":
      return {
        tone: "teal",
        message:
          input.lifecycleStatus === "active_canceling_at_period_end" &&
          input.periodEndLabel
            ? t("notices.checkoutReturnConfirmedEndingSoon", {
                periodEnd: input.periodEndLabel,
              })
            : t("notices.checkoutReturnConfirmed"),
      } as const;
    case "checkout_return_incomplete":
      return {
        tone: "amber",
        message: t("notices.checkoutReturnIncomplete"),
      } as const;
    case "checkout_return_still_processing":
      return {
        tone: "amber",
        message: t("notices.checkoutReturnProcessing"),
      } as const;
    case "portal_return_pending":
      return {
        tone: "teal",
        message: t("notices.portalReturnPending"),
      } as const;
    case "portal_return_updated":
      return {
        tone: "teal",
        message:
          input.lifecycleStatus === "active_canceling_at_period_end" &&
          input.periodEndLabel
            ? t("notices.portalReturnUpdatedEndingSoon", {
                periodEnd: input.periodEndLabel,
              })
            : input.lifecycleStatus === "payment_issue"
              ? t("notices.portalReturnUpdatedPaymentIssue")
              : input.lifecycleStatus === "ended"
                ? t("notices.portalReturnUpdatedEnded")
                : t("notices.portalReturnUpdated"),
      } as const;
    case "portal_return_still_processing":
      return {
        tone: "amber",
        message: t("notices.portalReturnProcessing"),
      } as const;
    default:
      return null;
  }
}

function getSignedOutReturnNotice(
  queryState: BillingReturnQueryState | null,
  t: Translator,
) {
  switch (queryState) {
    case "checkout-returned":
      return {
        tone: "amber",
        message: t("notices.signedOutCheckoutReturned"),
      } as const;
    case "portal-returned":
      return {
        tone: "amber",
        message: t("notices.signedOutPortalReturned"),
      } as const;
    default:
      return null;
  }
}

function getBillingNotConfiguredMessage(
  input: {
    billingConfigIssues: StripeBillingConfigIssue[];
    canManageSubscription: boolean;
  },
  t: Translator,
  locale: string,
) {
  if (input.billingConfigIssues.length === 0) {
    return t("messages.billingNotConfiguredGeneric");
  }

  const reasons = formatBillingIssueList(input.billingConfigIssues, t, locale);

  return input.canManageSubscription
    ? t("messages.billingPortalNotConfigured", { reasons })
    : t("messages.billingCheckoutNotConfigured", { reasons });
}

function readStoredPortalReturnBaseline() {
  if (typeof window === "undefined") {
    return null;
  }

  const storedValue = window.sessionStorage.getItem(
    BILLING_PORTAL_RETURN_BASELINE_STORAGE_KEY,
  );

  return storedValue?.trim() ? storedValue : null;
}

function writeStoredPortalReturnBaseline(value: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    BILLING_PORTAL_RETURN_BASELINE_STORAGE_KEY,
    value,
  );
}

function clearStoredPortalReturnBaseline() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(BILLING_PORTAL_RETURN_BASELINE_STORAGE_KEY);
}

export function PremiumSubscriptionActions({
  context,
  className,
  initialSession = null,
  billingUnavailable = false,
  billingNotConfigured = false,
}: PremiumSubscriptionActionsProps) {
  const t = useTranslations("PremiumSubscriptionActions");
  const tUnsafe = t as unknown as Translator;
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const session = useAccountSession();
  const [queryState, setQueryState] = useState<ReturnType<
    typeof parseBillingReturnQueryState
  >>(null);
  const [pendingAction, setPendingAction] = useState<BillingAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [returnPhase, setReturnPhase] = useState<BillingReturnPhase>("idle");
  const [returnPollAttemptCount, setReturnPollAttemptCount] = useState(0);
  const activeReturnQueryStateRef = useRef<BillingReturnQueryState | null>(null);
  const returnBaselineFingerprintRef = useRef<string | null>(null);
  const checkoutReturnSessionIdRef = useRef<string | null>(null);
  const checkoutReturnReconciliationAttemptRef = useRef<string | null>(null);
  const previousShouldShowAdsRef = useRef<boolean | null>(null);
  const premiumAdCleanupAppliedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    setQueryState(parseBillingReturnQueryState(searchParams));
    checkoutReturnSessionIdRef.current = searchParams.get("session_id")?.trim() ?? null;
  }, []);

  const fallbackSession = !session.initialized ? initialSession : null;
  const effectiveUser =
    session.status === "signed-in" && session.user
      ? session.user
      : fallbackSession?.user ?? null;
  const effectiveEntitlement =
    session.status === "signed-in"
      ? session.entitlement
      : fallbackSession?.entitlement ?? session.entitlement;
  const billing =
    session.status === "signed-in"
      ? session.billing
      : fallbackSession?.billing ?? session.billing;
  const isSignedIn = Boolean(effectiveUser);
  const isPremium = isSignedIn && effectiveEntitlement.tier === "premium";
  const effectiveQueryState =
    !isSignedIn && queryState !== "checkout-canceled" ? null : queryState;
  const signedOutReturnNotice = !isSignedIn
    ? getSignedOutReturnNotice(queryState, tUnsafe)
    : null;
  const periodEndLabel = formatPeriodEnd(locale, billing?.currentPeriodEnd ?? null);
  const lifecycleStatus = useMemo(
    () =>
      deriveBillingLifecycleStatus({
        entitlement: effectiveEntitlement,
        billing,
      }),
    [billing, effectiveEntitlement],
  );
  const billingFingerprint = useMemo(
    () =>
      buildBillingReturnFingerprint({
        entitlement: effectiveEntitlement,
        billing,
      }),
    [billing, effectiveEntitlement],
  );
  const portalReturnHasFreshBillingState =
    effectiveQueryState === "portal-returned" &&
    returnBaselineFingerprintRef.current !== null &&
    billingFingerprint !== returnBaselineFingerprintRef.current;
  const portalReturnShowsResolvedLifecycle =
    effectiveQueryState === "portal-returned" &&
    (lifecycleStatus === "active_canceling_at_period_end" ||
      lifecycleStatus === "payment_issue" ||
      lifecycleStatus === "ended");
  const returnStatus = deriveBillingReturnStatus({
    queryState: effectiveQueryState,
    lifecycleStatus,
    phase: returnPhase,
  });
  const billingConfigIssues =
    (session.status === "signed-in"
      ? session.warnings?.billingConfigIssues
      : fallbackSession?.warnings?.billingConfigIssues) ?? [];
  const billingNotConfiguredMessage = getBillingNotConfiguredMessage(
    {
      billingConfigIssues,
      canManageSubscription: Boolean(billing?.canManageSubscription),
    },
    tUnsafe,
    locale,
  );
  const shouldShowAds = effectiveEntitlement.capabilities.shouldShowAds;
  const lifecycleLabel = useMemo(() => {
    switch (lifecycleStatus) {
      case "active":
        return t("status.active");
      case "active_canceling_at_period_end":
        return periodEndLabel
          ? t("status.activeCancelingAtPeriodEnd", { periodEnd: periodEndLabel })
          : t("status.activeUntilPeriodEnd");
      case "payment_issue":
        return t("status.paymentIssue");
      case "ended":
        return t("status.ended");
      case "manual_premium":
        return t("status.manualPremium");
      default:
        return t("status.notStarted");
    }
  }, [lifecycleStatus, periodEndLabel, t]);

  useEffect(() => {
    if (
      !effectiveQueryState ||
      effectiveQueryState === "checkout-canceled" ||
      !session.initialized ||
      !isSignedIn
    ) {
      clearStoredPortalReturnBaseline();
      activeReturnQueryStateRef.current = null;
      returnBaselineFingerprintRef.current = null;
      checkoutReturnReconciliationAttemptRef.current = null;
      setReturnPollAttemptCount(0);
      setReturnPhase("idle");
      return;
    }

    if (activeReturnQueryStateRef.current === effectiveQueryState) {
      return;
    }

    activeReturnQueryStateRef.current = effectiveQueryState;
    returnBaselineFingerprintRef.current =
      effectiveQueryState === "portal-returned"
        ? readStoredPortalReturnBaseline() ?? billingFingerprint
        : billingFingerprint;
    setReturnPollAttemptCount(0);
    setReturnPhase("pending");
    premiumAdCleanupAppliedRef.current = false;
    void refreshAccountSession().catch(() => undefined);
  }, [billingFingerprint, effectiveQueryState, isSignedIn, session.initialized]);

  useEffect(() => {
    if (
      effectiveQueryState !== "checkout-returned" ||
      !session.initialized ||
      !isSignedIn ||
      isPremium
    ) {
      return;
    }

    const checkoutReturnSessionId = checkoutReturnSessionIdRef.current;

    if (
      !checkoutReturnSessionId ||
      checkoutReturnReconciliationAttemptRef.current === checkoutReturnSessionId
    ) {
      return;
    }

    checkoutReturnReconciliationAttemptRef.current = checkoutReturnSessionId;

    void (async () => {
      try {
        const result = await reconcileStripeCheckoutReturn(checkoutReturnSessionId);

        if (result.ok) {
          await refreshAccountSession();
          return;
        }

        if (result.error) {
          setErrorMessage(result.error);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : t("errors.checkoutReconcileFailed"),
        );
      }

      setReturnPollAttemptCount(getBillingReturnMaxAttempts("checkout-returned"));
      setReturnPhase("timed_out");
    })();
  }, [effectiveQueryState, isPremium, isSignedIn, session.initialized, t]);

  useEffect(() => {
    if (
      effectiveQueryState === "portal-returned" &&
      (returnPhase === "resolved" || returnPhase === "timed_out")
    ) {
      clearStoredPortalReturnBaseline();
    }
  }, [effectiveQueryState, returnPhase]);

  useEffect(() => {
    if (
      !effectiveQueryState ||
      effectiveQueryState === "checkout-canceled" ||
      !session.initialized ||
      !isSignedIn
    ) {
      return;
    }

    if (
      effectiveQueryState === "checkout-returned" &&
      isCheckoutReturnResolved(lifecycleStatus)
    ) {
      setReturnPhase("resolved");
      return;
    }

    if (portalReturnHasFreshBillingState || portalReturnShowsResolvedLifecycle) {
      setReturnPhase("resolved");
      return;
    }

    if (returnPollAttemptCount >= getBillingReturnMaxAttempts(effectiveQueryState)) {
      setReturnPhase("timed_out");
      return;
    }

    const timer = window.setTimeout(() => {
      setReturnPollAttemptCount((current) => current + 1);
      void refreshAccountSession().catch(() => undefined);
    }, BILLING_RETURN_POLL_INTERVAL_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    effectiveQueryState,
    isSignedIn,
    lifecycleStatus,
    portalReturnHasFreshBillingState,
    portalReturnShowsResolvedLifecycle,
    returnPollAttemptCount,
    session.initialized,
  ]);

  const returnNotice = getReturnNotice(
    {
      returnStatus,
      lifecycleStatus,
      periodEndLabel,
    },
    tUnsafe,
  );

  useEffect(() => {
    const previousShouldShowAds = previousShouldShowAdsRef.current;
    previousShouldShowAdsRef.current = shouldShowAds;

    const shouldRefreshPremiumRouteAfterUpgrade =
      session.initialized &&
      isSignedIn &&
      effectiveEntitlement.tier === "premium" &&
      previousShouldShowAds === true &&
      !shouldShowAds &&
      !premiumAdCleanupAppliedRef.current &&
      (returnStatus === "checkout_return_confirmed" ||
        returnStatus === "portal_return_updated");

    if (!shouldRefreshPremiumRouteAfterUpgrade) {
      return;
    }

    premiumAdCleanupAppliedRef.current = true;
    router.refresh();
  }, [
    effectiveEntitlement.tier,
    isSignedIn,
    returnStatus,
    router,
    session.initialized,
    shouldShowAds,
  ]);

  const shouldOfferCheckoutAction =
    Boolean(billing?.canStartCheckout) &&
    returnStatus !== "checkout_return_pending" &&
    returnStatus !== "checkout_return_incomplete" &&
    returnStatus !== "checkout_return_still_processing";

  async function handleCheckout() {
    setPendingAction("checkout");
    setErrorMessage(null);

    try {
      await startStripeHostedBillingAction("/api/billing/checkout", locale);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("errors.checkoutFailed"));
      setPendingAction(null);
    }
  }

  async function handlePortal() {
    setPendingAction("portal");
    setErrorMessage(null);

    try {
      writeStoredPortalReturnBaseline(billingFingerprint);
      await startStripeHostedBillingAction("/api/billing/portal", locale);
    } catch (error) {
      clearStoredPortalReturnBaseline();
      setErrorMessage(
        error instanceof Error ? error.message : t("errors.portalFailed"),
      );
      setPendingAction(null);
    }
  }

  async function handleRefresh() {
    setPendingAction("refresh");
    setErrorMessage(null);

    try {
      await refreshAccountSession();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("errors.refreshFailed"),
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div
      className={[
        "rounded-[24px] border border-line bg-paper-strong p-5",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="lab-label">{t("labels.premiumBilling")}</p>
        {isSignedIn ? (
          <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
            {lifecycleLabel}
          </span>
        ) : null}
      </div>

      {signedOutReturnNotice ? (
        <div
          className={[
            "mt-4 rounded-[18px] border px-4 py-3 text-sm leading-6",
            "border-amber-500/25 bg-amber-500/10 text-amber-900",
          ].join(" ")}
        >
          {signedOutReturnNotice.message}
        </div>
      ) : null}

      {returnNotice ? (
        <div
          className={[
            "mt-4 rounded-[18px] border px-4 py-3 text-sm leading-6",
            returnNotice.tone === "amber"
              ? "border-amber-500/25 bg-amber-500/10 text-amber-900"
              : "border-teal-500/25 bg-teal-500/10 text-teal-900",
          ].join(" ")}
        >
          {returnNotice.message}
        </div>
      ) : null}

      {!isSignedIn ? (
        <>
          <p className="mt-4 text-sm leading-6 text-ink-700">
            {t("messages.signedOut.body")}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={localizeShareHref("/account", locale)}
              className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition hover:opacity-90"
              style={{ color: "var(--paper-strong)" }}
            >
              {t("actions.signInFirst")}
            </Link>
            {context === "pricing" ? (
              <Link
                href={localizeShareHref("/concepts", locale)}
                className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
              >
                {t("actions.browseConcepts")}
              </Link>
            ) : null}
            {queryState === "portal-returned" ? (
              <Link
                href={localizeShareHref("/billing", locale)}
                className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
              >
                {t("actions.billingPolicy")}
              </Link>
            ) : null}
          </div>
        </>
      ) : billingUnavailable ? (
        <>
          <p className="mt-4 text-sm leading-6 text-ink-700">
            {t("messages.billingUnavailable", {
              tier:
                effectiveEntitlement.tier === "premium"
                  ? t("tiers.premium")
                  : t("tiers.free"),
            })}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={pendingAction !== null}
              className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingAction === "refresh"
                ? t("actions.checking")
                : t("actions.checkStatusAgain")}
            </button>
          </div>
        </>
      ) : billingNotConfigured ? (
        <>
          <p className="mt-4 text-sm leading-6 text-ink-700">
            {billingNotConfiguredMessage} {t("messages.billingNotConfiguredTier", {
              tier:
                effectiveEntitlement.tier === "premium"
                  ? t("tiers.premium")
                  : t("tiers.free"),
            })}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={pendingAction !== null}
              className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingAction === "refresh"
                ? t("actions.checking")
                : t("actions.checkStatusAgain")}
            </button>
          </div>
        </>
      ) : isPremium ? (
        <>
          <p className="mt-4 text-sm leading-6 text-ink-700">
            {getLifecycleDescription(
              {
                lifecycleStatus,
                periodEndLabel,
              },
              tUnsafe,
            )}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {billing?.canManageSubscription ? (
              <button
                type="button"
                onClick={() => void handlePortal()}
                disabled={pendingAction !== null}
                className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ color: "var(--paper-strong)" }}
              >
                {pendingAction === "portal"
                  ? t("actions.openingStripe")
                  : t("actions.manageSubscription")}
              </button>
            ) : null}
            {returnStatus === "portal_return_still_processing" ? (
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={pendingAction !== null}
                className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingAction === "refresh"
                  ? t("actions.checking")
                  : t("actions.checkStatusAgain")}
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <p className="mt-4 text-sm leading-6 text-ink-700">
            {lifecycleStatus === "payment_issue"
              ? t("messages.paymentIssueNotActive")
              : lifecycleStatus === "ended"
                ? t("messages.endedNotActive")
                : billing?.canManageSubscription
                  ? t("messages.manageExistingBilling")
                  : t("messages.defaultNotPremium")}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {shouldOfferCheckoutAction ? (
              <button
                type="button"
                onClick={() => void handleCheckout()}
                disabled={pendingAction !== null}
                className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ color: "var(--paper-strong)" }}
              >
                {pendingAction === "checkout"
                  ? t("actions.openingStripe")
                  : t("actions.startPremiumCheckout")}
              </button>
            ) : null}
            {billing?.canManageSubscription ? (
              <button
                type="button"
                onClick={() => void handlePortal()}
                disabled={pendingAction !== null}
                className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingAction === "portal"
                  ? t("actions.openingStripe")
                  : t("actions.manageBilling")}
              </button>
            ) : null}
            {returnStatus === "checkout_return_still_processing" ||
            returnStatus === "checkout_return_incomplete" ? (
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={pendingAction !== null}
                className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingAction === "refresh"
                  ? t("actions.checking")
                  : t("actions.checkStatusAgain")}
              </button>
            ) : null}
          </div>
        </>
      )}

      {errorMessage ? <p className="mt-4 text-sm text-coral-700">{errorMessage}</p> : null}
      <p className="mt-4 text-xs leading-5 text-ink-500">
        {t("footer.needPublicPolicyFirst")}{" "}
        <Link
          href={localizeShareHref("/billing", locale)}
          className="font-medium text-ink-700 underline underline-offset-4 hover:text-ink-950"
        >
          {t("actions.billingPolicy")}
        </Link>
      </p>
    </div>
  );
}
