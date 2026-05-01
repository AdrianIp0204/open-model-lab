import { NextResponse } from "next/server";
import { type AppLocale, isAppLocale } from "@/i18n/routing";
import { isDevAccountHarnessFixtureUserId } from "@/lib/account/dev-harness";
import { getAccountSessionForCookieHeader } from "@/lib/account/supabase";
import {
  describeStripeBillingPortalConfigIssues,
  getStripeBillingPortalConfigDiagnostics,
  getStripeBillingConfig,
} from "@/lib/billing/env";
import { createStripeBillingPortalSession } from "@/lib/billing/stripe";
import { getStoredBillingProfileForUser } from "@/lib/billing/store";

export const runtime = "nodejs";

async function readRequestedBillingLocale(request: Request): Promise<AppLocale | null> {
  try {
    const payload = (await request.json()) as { locale?: unknown } | null;
    return typeof payload?.locale === "string" && isAppLocale(payload.locale)
      ? payload.locale
      : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const requestedLocale = await readRequestedBillingLocale(request);
  const session = await getAccountSessionForCookieHeader(request.headers.get("cookie"));

  if (!session?.user) {
    return NextResponse.json(
      {
        code: "sign_in_required",
        error: "Sign in before managing a Supporter subscription.",
      },
      { status: 401 },
    );
  }

  const config = getStripeBillingConfig();
  const diagnostics = getStripeBillingPortalConfigDiagnostics(config);

  if (!diagnostics.configured) {
    return NextResponse.json(
      {
        code: "billing_unavailable",
        error: describeStripeBillingPortalConfigIssues(diagnostics.issues),
        configIssues: diagnostics.issues,
      },
      { status: 503 },
    );
  }

  if (!session.billing.canManageSubscription) {
    return NextResponse.json(
      {
        code: "billing_management_unavailable",
        error: "This account does not currently have a Stripe subscription to manage.",
      },
      { status: 409 },
    );
  }

  if (isDevAccountHarnessFixtureUserId(session.user.id)) {
    return NextResponse.json(
      {
        code: "billing_requires_real_account",
        error:
          "The dev account harness is for local entitlement QA only. Use a real signed-in staging account to verify Stripe Billing Portal access.",
      },
      { status: 409 },
    );
  }

  const billingProfile = await getStoredBillingProfileForUser(session.user.id);
  const customerId = billingProfile?.stripe_customer_id ?? null;

  if (!customerId) {
    return NextResponse.json(
      {
        code: "billing_management_unavailable",
        error: "This account does not currently have a Stripe customer to manage.",
      },
      { status: 409 },
    );
  }

  try {
    const portalSession = await createStripeBillingPortalSession({
      customerId,
      ...(requestedLocale
        ? {
            locale: requestedLocale,
          }
        : {}),
    });

    return NextResponse.json({
      ok: true,
      url: portalSession.url,
    });
  } catch (error) {
    return NextResponse.json(
      {
        code: "billing_portal_failed",
        error:
          error instanceof Error
            ? error.message
            : "Stripe billing portal session could not be created.",
      },
      { status: 502 },
    );
  }
}
