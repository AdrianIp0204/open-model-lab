"use client";

import type { AppLocale } from "@/i18n/routing";

export async function startStripeHostedBillingAction(
  path: string,
  locale?: AppLocale,
) {
  const requestBody = locale ? JSON.stringify({ locale }) : null;
  const response = await fetch(path, {
    method: "POST",
    headers: {
      accept: "application/json",
      ...(requestBody
        ? {
            "content-type": "application/json",
          }
        : {}),
    },
    ...(requestBody
      ? {
          body: requestBody,
        }
      : {}),
  });
  const payload = (await response.json().catch(() => null)) as
    | {
        ok?: boolean;
        url?: string;
        error?: string;
      }
    | null;

  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error ?? "Billing request failed.");
  }

  window.location.assign(payload.url);
}

export async function reconcileStripeCheckoutReturn(sessionId: string) {
  const response = await fetch("/api/billing/reconcile", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sessionId,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        ok?: boolean;
        status?: "reconciled" | "already_synced";
        premiumGranted?: boolean;
        entitlementTier?: "free" | "premium";
        syncSource?: "webhook" | "return_reconciliation";
        code?: string;
        error?: string;
      }
    | null;

  return {
    ok: response.ok,
    status: payload?.status ?? null,
    premiumGranted: payload?.premiumGranted ?? false,
    entitlementTier: payload?.entitlementTier ?? null,
    syncSource: payload?.syncSource ?? null,
    code: payload?.code ?? null,
    error: payload?.error ?? null,
  };
}
