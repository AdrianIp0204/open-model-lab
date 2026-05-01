import type { ResolvedAccountEntitlement } from "@/lib/account/entitlements";
import type { AccountBillingSummary } from "./model";

export type BillingLifecycleStatus =
  | "not_started"
  | "active"
  | "active_canceling_at_period_end"
  | "payment_issue"
  | "ended"
  | "manual_premium";

export type BillingReturnQueryState =
  | "checkout-returned"
  | "checkout-canceled"
  | "portal-returned";

export type BillingReturnPhase = "idle" | "pending" | "resolved" | "timed_out";

export type BillingReturnStatus =
  | "none"
  | "checkout_canceled"
  | "checkout_return_pending"
  | "checkout_return_confirmed"
  | "checkout_return_still_processing"
  | "checkout_return_incomplete"
  | "portal_return_pending"
  | "portal_return_updated"
  | "portal_return_still_processing";

export function deriveBillingLifecycleStatus(input: {
  entitlement: ResolvedAccountEntitlement;
  billing: AccountBillingSummary | null;
}): BillingLifecycleStatus {
  if (input.entitlement.tier === "premium" && input.billing?.source === "manual") {
    return "manual_premium";
  }

  if (!input.billing || input.billing.source === "none" || input.billing.status === "none") {
    return input.entitlement.tier === "premium" ? "manual_premium" : "not_started";
  }

  switch (input.billing.status) {
    case "active":
      return "active";
    case "canceling":
      return "active_canceling_at_period_end";
    case "past_due":
    case "incomplete":
      return "payment_issue";
    case "ended":
      return "ended";
    default:
      return input.entitlement.tier === "premium" ? "manual_premium" : "not_started";
  }
}

export function getBillingLifecycleLabel(status: BillingLifecycleStatus) {
  return getBillingLifecycleLabelWithDate(status, null);
}

function formatBillingLifecycleDate(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

export function getBillingLifecycleLabelWithDate(
  status: BillingLifecycleStatus,
  currentPeriodEnd: string | null,
) {
  const formattedPeriodEnd = formatBillingLifecycleDate(currentPeriodEnd);

  switch (status) {
    case "active":
      return "Active";
    case "active_canceling_at_period_end":
      return formattedPeriodEnd
        ? `Active, cancels on ${formattedPeriodEnd}`
        : "Active until period end";
    case "payment_issue":
      return "Payment issue";
    case "ended":
      return "Ended";
    case "manual_premium":
      return "Manual Supporter";
    default:
      return "Not started";
  }
}

export function parseBillingReturnQueryState(
  search: string | URLSearchParams | null | undefined,
) {
  const searchParams =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search ?? null;
  const value = searchParams?.get("billing");

  switch (value) {
    case "checkout-returned":
    case "checkout-canceled":
    case "portal-returned":
      return value satisfies BillingReturnQueryState;
    default:
      return null;
  }
}

export function isCheckoutReturnResolved(status: BillingLifecycleStatus) {
  return (
    status === "active" ||
    status === "active_canceling_at_period_end" ||
    status === "payment_issue" ||
    status === "ended" ||
    status === "manual_premium"
  );
}

export function deriveBillingReturnStatus(input: {
  queryState: BillingReturnQueryState | null;
  lifecycleStatus: BillingLifecycleStatus;
  phase: BillingReturnPhase;
}): BillingReturnStatus {
  if (!input.queryState) {
    return "none";
  }

  if (input.queryState === "checkout-canceled") {
    return "checkout_canceled";
  }

  if (input.queryState === "checkout-returned") {
    if (
      input.lifecycleStatus === "active" ||
      input.lifecycleStatus === "active_canceling_at_period_end" ||
      input.lifecycleStatus === "manual_premium"
    ) {
      return "checkout_return_confirmed";
    }

    if (
      input.lifecycleStatus === "payment_issue" ||
      input.lifecycleStatus === "ended"
    ) {
      return "checkout_return_incomplete";
    }

    return input.phase === "timed_out"
      ? "checkout_return_still_processing"
      : "checkout_return_pending";
  }

  return input.phase === "timed_out"
    ? "portal_return_still_processing"
    : input.phase === "resolved"
      ? "portal_return_updated"
      : "portal_return_pending";
}
