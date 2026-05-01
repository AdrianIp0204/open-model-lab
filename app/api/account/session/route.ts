import { NextResponse } from "next/server";
import { getAnonymousAccountEntitlement } from "@/lib/account/entitlements";
import {
  accountSessionActionRequestSchema,
} from "@/lib/account/model";
import { resolveDevAccountHarnessSession } from "@/lib/account/dev-harness";
import {
  isSupabaseConfigError,
  isSupabaseEmailDeliveryConfigError,
  isSupabaseRedirectConfigError,
} from "@/lib/account/config-errors";
import {
  getAccountSessionForCookieHeader,
  sendPasswordResetEmail,
  sendMagicLink,
  signInWithAccountPassword,
  signOutAccountSession,
} from "@/lib/account/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCOUNT_SESSION_RESPONSE_HEADERS = {
  "cache-control": "private, no-store, max-age=0, must-revalidate",
  vary: "cookie",
} as const;

const DEV_HARNESS_AUTH_ERROR = {
  code: "dev_harness_active",
  error:
    "The dev account harness is overriding auth for this browser. Open /dev/account-harness and use Reset to real auth before testing password or email auth.",
} as const;

function readErrorCode(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && code ? code : null;
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

function hasErrorCode(error: unknown, ...codes: string[]) {
  const code = readErrorCode(error);
  return Boolean(code && codes.includes(code));
}

function hasErrorMessage(error: unknown, ...fragments: string[]) {
  const message = readErrorMessage(error)?.toLowerCase();

  if (!message) {
    return false;
  }

  return fragments.some((fragment) => message.includes(fragment.toLowerCase()));
}

function describeMagicLinkFailure(error: unknown) {
  if (isSupabaseConfigError(error)) {
    return {
      status: 503,
      payload: {
        code: "auth_unavailable",
        error: "Email sign-in is not configured on this deployment yet.",
      },
    };
  }

  if (isSupabaseRedirectConfigError(error)) {
    return {
      status: 503,
      payload: {
        code: "auth_redirect_unavailable",
        error:
          "Email sign-in is blocked by the current Supabase redirect settings. Add this deployment origin and /auth/confirm to the Supabase Auth Site URL and allowed redirect URLs.",
      },
    };
  }

  if (isSupabaseEmailDeliveryConfigError(error)) {
    return {
      status: 503,
      payload: {
        code: "auth_email_delivery_unavailable",
        error:
          "Email sign-in could not be sent because Supabase email delivery is not configured correctly for this project yet.",
      },
    };
  }

  if (hasErrorCode(error, "over_email_send_rate_limit")) {
    return {
      status: 429,
      payload: {
        code: "rate_limited",
        error: "Magic links are rate-limited. Wait a moment, then try again.",
      },
    };
  }

  const message = readErrorMessage(error);

  return {
    status: 500,
    payload: {
      code: "magic_link_failed",
      error: message ? `Magic link could not be sent right now. ${message}` : "Magic link could not be sent.",
    },
  };
}

function describePasswordResetFailure(error: unknown) {
  if (isSupabaseConfigError(error)) {
    return {
      status: 503,
      payload: {
        code: "auth_unavailable",
        error:
          "Password-reset email is not configured on this deployment yet.",
      },
    };
  }

  if (isSupabaseRedirectConfigError(error)) {
    return {
      status: 503,
      payload: {
        code: "auth_redirect_unavailable",
        error:
          "Password-reset email is blocked by the current Supabase redirect settings. Add this deployment origin and /auth/confirm to the Supabase Auth Site URL and allowed redirect URLs.",
      },
    };
  }

  if (isSupabaseEmailDeliveryConfigError(error)) {
    return {
      status: 503,
      payload: {
        code: "auth_email_delivery_unavailable",
        error:
          "Password-reset email could not be sent because Supabase email delivery is not configured correctly for this project yet.",
      },
    };
  }

  if (hasErrorCode(error, "user_not_found")) {
    return {
      status: 200,
      payload: {
        ok: true,
        message:
          "If that email matches an existing account, a password-reset email has been sent. Check your inbox and spam for the link.",
      },
    };
  }

  if (hasErrorCode(error, "over_email_send_rate_limit")) {
    return {
      status: 429,
      payload: {
        code: "rate_limited",
        error:
          "Password-reset emails are rate-limited. Wait a moment, then try again.",
      },
    };
  }

  const message = readErrorMessage(error);

  return {
    status: 500,
    payload: {
      code: "password_reset_failed",
      error: message
        ? `Password-reset email could not be sent right now. ${message}`
        : "Password-reset email could not be sent right now.",
    },
  };
}

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const authMode = resolveDevAccountHarnessSession(cookieHeader).active
    ? "dev-harness"
    : "supabase";

  console.info("[account] session route started", {
    hasCookieHeader: Boolean(cookieHeader?.trim()),
  });

  try {
    const session = await getAccountSessionForCookieHeader(cookieHeader);

    console.info("[account] session route completed", {
      signedIn: Boolean(session?.user),
      userId: session?.user.id ?? null,
      entitlementTier: session?.entitlement.tier ?? "free",
      warningKeys: Object.keys(session?.warnings ?? {}),
    });

    return NextResponse.json({
      session,
      entitlement: session?.entitlement ?? getAnonymousAccountEntitlement(),
      authMode,
    }, {
      headers: ACCOUNT_SESSION_RESPONSE_HEADERS,
    });
  } catch (error) {
    console.error("[account] session route failed", {
      hasCookieHeader: Boolean(cookieHeader?.trim()),
      code: readErrorCode(error),
      message: readErrorMessage(error),
      name: readErrorName(error),
    });

    return NextResponse.json(
      {
        code: "account_session_failed",
        error: "Account session could not be loaded.",
      },
      {
        status: 500,
        headers: ACCOUNT_SESSION_RESPONSE_HEADERS,
      },
    );
  }
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        code: "invalid_json",
        error: "Account request must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = accountSessionActionRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "invalid_payload",
        error: "Account auth request did not pass validation.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  if (resolveDevAccountHarnessSession(request.headers.get("cookie")).active) {
    return NextResponse.json(DEV_HARNESS_AUTH_ERROR, {
      status: 409,
    });
  }

  switch (parsed.data.action) {
    case "magic-link":
      try {
        await sendMagicLink(parsed.data.email, "next" in parsed.data ? parsed.data.next : null);

        return NextResponse.json({
          ok: true,
          message: "Check your inbox and spam for a sign-in link.",
        });
      } catch (error) {
        const failure = describeMagicLinkFailure(error);

        return NextResponse.json(failure.payload, { status: failure.status });
      }
    case "password-sign-in": {
      const response = NextResponse.json({ ok: true });

      try {
        await signInWithAccountPassword({
          cookieHeader: request.headers.get("cookie"),
          response,
          email: parsed.data.email,
          password: parsed.data.password,
        });

        return response;
      } catch (error) {
        if (isSupabaseConfigError(error)) {
          return NextResponse.json(
            {
              code: "auth_unavailable",
              error: "Sign-in is unavailable right now.",
            },
            { status: 503 },
          );
        }

        if (
          hasErrorCode(error, "user_not_found") ||
          hasErrorMessage(error, "user not found", "no user found")
        ) {
          return NextResponse.json(
            {
              code: "email_not_registered",
              error:
                "No account was found for that email. Use the email-link path below to create or confirm it first.",
            },
            { status: 404 },
          );
        }

        if (
          hasErrorCode(error, "email_not_confirmed") ||
          hasErrorMessage(error, "email not confirmed")
        ) {
          return NextResponse.json(
            {
              code: "email_not_confirmed",
              error:
                "Confirm the account from the email link first, then sign in with a password.",
            },
            { status: 403 },
          );
        }

        if (
          hasErrorCode(error, "invalid_credentials") ||
          hasErrorMessage(
            error,
            "invalid login credentials",
            "invalid credentials",
          )
        ) {
          return NextResponse.json(
            {
              code: "invalid_credentials",
              error: "Incorrect email or password",
            },
            { status: 401 },
          );
        }

        return NextResponse.json(
          {
            code: "password_sign_in_failed",
            error: "Sign-in could not be completed right now. Try again.",
          },
          { status: 500 },
        );
      }
    }
    case "password-reset":
      try {
        await sendPasswordResetEmail(
          parsed.data.email,
          "next" in parsed.data ? parsed.data.next : null,
        );

        return NextResponse.json({
          ok: true,
          message:
            "If that email matches an existing account, a password-reset email has been sent. Check your inbox and spam for the link.",
        });
      } catch (error) {
        const failure = describePasswordResetFailure(error);

        return NextResponse.json(failure.payload, { status: failure.status });
      }
  }
}

export async function DELETE(request: Request) {
  const response = NextResponse.json({ ok: true });

  await signOutAccountSession(request.headers.get("cookie"), response);

  return response;
}
