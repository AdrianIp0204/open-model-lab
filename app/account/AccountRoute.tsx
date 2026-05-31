import type { Metadata } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { AccountPagePanel } from "@/components/account/AccountPagePanel";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/layout/SectionHeading";
import type { AppLocale } from "@/i18n/routing";
import { getLocaleMessages, getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { resolveDevAccountHarnessSession } from "@/lib/account/dev-harness";
import type { AccountAuthMode, AccountSession } from "@/lib/account/model";
import { getAccountSessionForCookieHeader } from "@/lib/account/supabase";
import { parseBillingReturnQueryState } from "@/lib/billing/ui";
import { buildPageMetadata } from "@/lib/metadata";
import { getAccountRouteMetadataCopy } from "@/lib/metadata/account-routes";

type SearchParamsInput = Record<string, string | string[] | undefined>;
type AccountLeadInState = "signed-out" | "signed-in-free" | "signed-in-premium";

function getSearchParamValue(
  searchParams: SearchParamsInput | undefined,
  key: string,
) {
  const value = searchParams?.[key];

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function toSearchParamString(searchParams: SearchParamsInput | undefined) {
  if (!searchParams) {
    return "";
  }

  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
      continue;
    }

    if (value !== undefined) {
      query.append(key, value);
    }
  }

  return query.toString();
}

function resolveAccountLeadInState(
  session: AccountSession | null,
): AccountLeadInState {
  if (!session?.user) {
    return "signed-out";
  }

  return session.entitlement?.tier === "premium" ? "signed-in-premium" : "signed-in-free";
}

function getAccountLeadInCopy(
  t: Awaited<ReturnType<typeof getScopedTranslator>>,
  state: AccountLeadInState,
  session: AccountSession | null,
) {
  if (state === "signed-in-premium") {
    return {
      eyebrow: t("hero.signedInPremium.eyebrow"),
      title: t("hero.signedInPremium.title"),
      description: t("hero.signedInPremium.description", {
        email: session?.user?.email ?? t("hero.accountFallback"),
      }),
    };
  }

  if (state === "signed-in-free") {
    return {
      eyebrow: t("hero.signedInFree.eyebrow"),
      title: t("hero.signedInFree.title"),
      description: t("hero.signedInFree.description", {
        email: session?.user?.email ?? t("hero.accountFallback"),
      }),
    };
  }

  return {
    eyebrow: t("hero.eyebrow"),
    title: t("hero.title"),
    description: t("hero.description"),
  };
}

export async function buildAccountMetadata(locale: AppLocale): Promise<Metadata> {
  const t = await getScopedTranslator(locale, "AccountPage");
  const metadataCopy = getAccountRouteMetadataCopy(locale, "account");

  return {
    ...buildPageMetadata({
      title: t("metadata.title"),
      description: t("metadata.description"),
      pathname: "/account",
      locale,
      keywords: metadataCopy.keywords,
      category: metadataCopy.category,
    }),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function AccountPage({
  localeOverride,
  searchParams,
}: {
  localeOverride?: AppLocale;
  searchParams?: Promise<SearchParamsInput>;
} = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const messages = await getLocaleMessages(locale);
  const t = await getScopedTranslator(locale, "AccountPage");
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const authState = getSearchParamValue(resolvedSearchParams, "auth");
  const nextPath = getSearchParamValue(resolvedSearchParams, "next");
  const billingReturnQueryState = parseBillingReturnQueryState(
    toSearchParamString(resolvedSearchParams),
  );
  const initialAuthMode: AccountAuthMode = resolveDevAccountHarnessSession(cookieHeader).active
    ? "dev-harness"
    : "supabase";
  let initialSession: AccountSession | null = null;

  try {
    initialSession = await getAccountSessionForCookieHeader(cookieHeader);
  } catch (error) {
    console.warn("[account] route failed to preload initial session", {
      message: error instanceof Error ? error.message : null,
      name: error instanceof Error ? error.name : null,
    });
  }

  const leadInCopy = getAccountLeadInCopy(
    t,
    resolveAccountLeadInState(initialSession),
    initialSession,
  );

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <PageShell
        layoutMode="section-shell"
        feedbackContext={{
          pageType: "other",
          pagePath: "/account",
          pageTitle: t("feedbackContext.pageTitle"),
        }}
        showFeedbackWidget={false}
      >
        <AccountPagePanel
          authState={authState}
          nextPath={nextPath}
          billingReturnQueryState={billingReturnQueryState}
          initialSession={initialSession}
          initialAuthMode={initialAuthMode}
          leadIn={
            <SectionHeading
              level={1}
              eyebrow={leadInCopy.eyebrow}
              title={leadInCopy.title}
              description={leadInCopy.description}
            />
          }
        />
      </PageShell>
    </NextIntlClientProvider>
  );
}
