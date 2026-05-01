import { redirect } from "next/navigation";
import { AuthCallbackClient } from "./AuthCallbackClient";
import { stripLocalePrefix, type AppLocale } from "@/i18n/routing";
import { resolveServerLocaleFallback } from "@/i18n/server";
import { classifyAccountAuthFailure } from "@/lib/account/auth-return";
import { localizeShareHref } from "@/lib/share-links";

function resolveRedirectPath(nextPath: string | undefined, locale: AppLocale) {
  if (!nextPath || !nextPath.startsWith("/")) {
    return localizeShareHref("/dashboard", locale);
  }

  return localizeShareHref(nextPath, locale);
}

function getSearchParamValue(
  value: string | string[] | undefined,
) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveFailurePath(nextPath: string, type: string | undefined, locale: AppLocale) {
  if (stripLocalePrefix(nextPath) === "/account/reset-password" || type === "recovery") {
    return localizeShareHref("/account/reset-password", locale);
  }

  return localizeShareHref("/account", locale);
}

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await resolveServerLocaleFallback();
  const resolvedSearchParams = await searchParams;
  const nextPath = resolveRedirectPath(getSearchParamValue(resolvedSearchParams.next), locale);
  const code = getSearchParamValue(resolvedSearchParams.code);
  const tokenHash = getSearchParamValue(resolvedSearchParams.token_hash);
  const type = getSearchParamValue(resolvedSearchParams.type);
  const providerErrorCode =
    getSearchParamValue(resolvedSearchParams.error_code) ??
    getSearchParamValue(resolvedSearchParams.error);
  const providerErrorDescription = getSearchParamValue(
    resolvedSearchParams.error_description,
  );

  if (providerErrorCode || providerErrorDescription) {
    const failurePath = resolveFailurePath(nextPath, type, locale);
    const authState = classifyAccountAuthFailure({
      code: providerErrorCode,
      message: providerErrorDescription ?? providerErrorCode,
    });

    redirect(`${failurePath}?auth=${encodeURIComponent(authState)}`);
  }

  if (code || tokenHash || type) {
    const confirmSearchParams = new URLSearchParams({
      next: nextPath,
    });

    if (code) {
      confirmSearchParams.set("code", code);
    }

    if (tokenHash) {
      confirmSearchParams.set("token_hash", tokenHash);
    }

    if (type) {
      confirmSearchParams.set("type", type);
    }

    redirect(localizeShareHref(`/auth/confirm?${confirmSearchParams.toString()}`, locale));
  }

  return <AuthCallbackClient nextPath={nextPath} />;
}
