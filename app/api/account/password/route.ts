import { NextResponse } from "next/server";
import { resolveDevAccountHarnessSession } from "@/lib/account/dev-harness";
import { isSupabaseConfigError } from "@/lib/account/config-errors";
import { accountPasswordUpdateRequestSchema } from "@/lib/account/model";
import { updateAccountPassword } from "@/lib/account/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEV_HARNESS_AUTH_ERROR = {
  code: "dev_harness_active",
  error:
    "The dev account harness is overriding auth for this browser. Open /dev/account-harness and use Reset to real auth before testing password changes or recovery.",
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

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        code: "invalid_json",
        error: "Password update request must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = accountPasswordUpdateRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "invalid_payload",
        error: "Password update request did not pass validation.",
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

  const response = NextResponse.json({
    ok: true,
    message: "Password updated. You can use it the next time you sign in on this site.",
  });

  try {
    await updateAccountPassword({
      cookieHeader: request.headers.get("cookie"),
      response,
      password: parsed.data.password,
    });

    return response;
  } catch (error) {
    if (isSupabaseConfigError(error)) {
      return NextResponse.json(
        {
          code: "auth_unavailable",
          error: "Password updates are not configured on this deployment yet.",
        },
        { status: 503 },
      );
    }

    if (
      hasErrorCode(error, "session_not_found", "session_expired") ||
      hasErrorMessage(error, "auth session missing", "session missing")
    ) {
      return NextResponse.json(
        {
          code: "not_authenticated",
          error: "Open the recovery link again or sign in before setting a password.",
        },
        { status: 401 },
      );
    }

    if (hasErrorCode(error, "weak_password") || hasErrorMessage(error, "weak password")) {
      return NextResponse.json(
        {
          code: "weak_password",
          error:
            "Choose a stronger password with at least 8 characters before saving it here.",
        },
        { status: 400 },
      );
    }

    if (hasErrorCode(error, "same_password")) {
      return NextResponse.json(
        {
          code: "same_password",
          error: "Choose a new password instead of reusing the current one.",
        },
        { status: 400 },
      );
    }

    if (hasErrorCode(error, "reauthentication_needed", "reauthentication_not_valid")) {
      return NextResponse.json(
        {
          code: "reauthentication_needed",
          error:
            "This project currently requires recent authentication before password changes. Send yourself a password-reset email and finish the new-password step from that link.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        code: "password_update_failed",
        error: "Password could not be updated right now.",
      },
      { status: 500 },
    );
  }
}
