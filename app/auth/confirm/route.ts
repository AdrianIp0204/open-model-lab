import { NextResponse } from "next/server";
import type { EmailOtpType, User } from "@supabase/supabase-js";
import { addLocalePrefix, getPathLocale, stripLocalePrefix, type AppLocale } from "@/i18n/routing";
import { exchangeAuthCode, verifyMagicLink } from "@/lib/account/supabase";
import {
  classifyAccountAuthFailure,
  classifyAccountAuthFailureFromRequest,
  type AccountAuthFailureState,
} from "@/lib/account/auth-return";

export const runtime = "nodejs";

const validEmailOtpTypes = new Set<EmailOtpType>([
  "email",
  "magiclink",
  "signup",
  "recovery",
  "invite",
  "email_change",
]);

function sanitizeNextPath(nextPath: string | null) {
  if (nextPath && nextPath.startsWith("/")) {
    return nextPath;
  }

  return null;
}

function localizeAuthPath(path: string, locale: AppLocale | null) {
  return locale ? addLocalePrefix(path, locale) : path;
}

function resolveContinuePath(nextPath: string | null, type: string | null, locale: AppLocale | null) {
  const sanitizedNextPath = sanitizeNextPath(nextPath);

  if (type === "recovery") {
    return sanitizedNextPath ?? localizeAuthPath("/account/reset-password", locale);
  }

  return sanitizedNextPath ?? localizeAuthPath("/dashboard", locale);
}

function parseIsoTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function shouldOfferPostConfirmationPasswordSetup(input: {
  type: string | null;
  continuePath: string;
  user: User | null;
}) {
  if (input.type === "signup") {
    return true;
  }

  if (stripLocalePrefix(input.continuePath) === "/account/reset-password" || !input.user) {
    return false;
  }

  const createdAtMs = parseIsoTime(input.user.created_at);
  const lastSignedInAtMs = parseIsoTime(input.user.last_sign_in_at ?? null);

  if (createdAtMs === null || lastSignedInAtMs === null) {
    return false;
  }

  return Math.abs(lastSignedInAtMs - createdAtMs) <= 60_000;
}

function buildSuccessUrl(input: {
  requestUrl: URL;
  continuePath: string;
  shouldOfferPasswordSetup: boolean;
}) {
  const locale = getPathLocale(input.continuePath) ?? getPathLocale(input.requestUrl.pathname);

  if (input.shouldOfferPasswordSetup) {
    const passwordSetupUrl = new URL(
      localizeAuthPath("/account/create-password", locale),
      input.requestUrl.origin,
    );
    passwordSetupUrl.searchParams.set(
      "next",
      stripLocalePrefix(input.continuePath) === "/account/create-password"
        ? localizeAuthPath("/dashboard", locale)
        : input.continuePath,
    );

    return passwordSetupUrl;
  }

  return new URL(input.continuePath, input.requestUrl.origin);
}

function resolveFailurePath(nextPath: string, type: string | null, locale: AppLocale | null) {
  if (stripLocalePrefix(nextPath) === "/account/reset-password" || type === "recovery") {
    return localizeAuthPath("/account/reset-password", locale);
  }

  return localizeAuthPath("/account", locale);
}

function readErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (!error || typeof error !== "object") {
    return null;
  }

  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message ? message : null;
}

function readErrorName(error: unknown) {
  if (error instanceof Error) {
    return error.name;
  }

  if (!error || typeof error !== "object") {
    return null;
  }

  const name = (error as { name?: unknown }).name;
  return typeof name === "string" && name ? name : null;
}

function readErrorCode(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && code ? code : null;
}

function buildFailureUrl(input: {
  requestUrl: URL;
  nextPath: string;
  type: string | null;
  authFailureState: AccountAuthFailureState;
}) {
  const locale = getPathLocale(input.nextPath) ?? getPathLocale(input.requestUrl.pathname);
  const failurePath = resolveFailurePath(input.nextPath, input.type, locale);
  const failureUrl = new URL(failurePath, input.requestUrl.origin);
  failureUrl.searchParams.set("auth", input.authFailureState);

  return failureUrl;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const requestLocale = getPathLocale(requestUrl.pathname);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const continuePath = resolveContinuePath(requestUrl.searchParams.get("next"), type, requestLocale);
  const successUrl = buildSuccessUrl({
    requestUrl,
    continuePath,
    shouldOfferPasswordSetup: shouldOfferPostConfirmationPasswordSetup({
      type,
      continuePath,
      user: null,
    }),
  });
  const response = NextResponse.redirect(successUrl);

  console.info("[auth] confirm route started", {
    hasCode: Boolean(code),
    hasTokenHash: Boolean(tokenHash),
    type: type ?? null,
    continuePath,
    successPath: `${successUrl.pathname}${successUrl.search}`,
  });

  if (code) {
    try {
      const user = await exchangeAuthCode({
        cookieHeader: request.headers.get("cookie"),
        response,
        code,
      });
      const resolvedSuccessUrl = buildSuccessUrl({
        requestUrl,
        continuePath,
        shouldOfferPasswordSetup: shouldOfferPostConfirmationPasswordSetup({
          type,
          continuePath,
          user,
        }),
      });
      response.headers.set("location", resolvedSuccessUrl.toString());

      console.info("[auth] confirm route completed", {
        method: "exchange_code",
        continuePath,
        successPath: `${resolvedSuccessUrl.pathname}${resolvedSuccessUrl.search}`,
      });

      return response;
    } catch (error) {
      console.error("[auth] confirm route failed", {
        method: "exchange_code",
        continuePath,
        code: readErrorCode(error),
        message: readErrorMessage(error),
        name: readErrorName(error),
      });
      return NextResponse.redirect(
        buildFailureUrl({
          requestUrl,
          nextPath: continuePath,
          type,
          authFailureState: classifyAccountAuthFailure(error),
        }),
      );
    }
  }

  if (!tokenHash || !type || !validEmailOtpTypes.has(type as EmailOtpType)) {
    console.warn("[auth] confirm route rejected invalid payload", {
      hasTokenHash: Boolean(tokenHash),
      type: type ?? null,
      continuePath,
    });
    return NextResponse.redirect(
      buildFailureUrl({
        requestUrl,
        nextPath: continuePath,
        type,
        authFailureState: classifyAccountAuthFailureFromRequest({
          code,
          tokenHash,
          type,
        }),
      }),
    );
  }

  try {
    const user = await verifyMagicLink({
      cookieHeader: request.headers.get("cookie"),
      response,
      tokenHash,
      type: type as EmailOtpType,
    });
    const resolvedSuccessUrl = buildSuccessUrl({
      requestUrl,
      continuePath,
      shouldOfferPasswordSetup: shouldOfferPostConfirmationPasswordSetup({
        type,
        continuePath,
        user,
      }),
    });
    response.headers.set("location", resolvedSuccessUrl.toString());

    console.info("[auth] confirm route completed", {
      method: "verify_otp",
      continuePath,
      successPath: `${resolvedSuccessUrl.pathname}${resolvedSuccessUrl.search}`,
      type,
    });

    return response;
  } catch (error) {
    console.error("[auth] confirm route failed", {
      method: "verify_otp",
      continuePath,
      type,
      code: readErrorCode(error),
      message: readErrorMessage(error),
      name: readErrorName(error),
    });
    return NextResponse.redirect(
      buildFailureUrl({
        requestUrl,
        nextPath: continuePath,
        type,
        authFailureState: classifyAccountAuthFailure(error),
      }),
    );
  }
}
