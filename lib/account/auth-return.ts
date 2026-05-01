import { isSupabaseConfigError } from "./config-errors";

export type AccountAuthFailureState =
  | "missing"
  | "invalid"
  | "expired"
  | "used"
  | "unavailable";

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

export function classifyAccountAuthFailure(error: unknown): AccountAuthFailureState {
  if (isSupabaseConfigError(error)) {
    return "unavailable";
  }

  const code = readErrorCode(error)?.toLowerCase() ?? "";
  const message = readErrorMessage(error)?.toLowerCase() ?? "";

  if (
    code.includes("expired") ||
    message.includes("expired") ||
    message.includes("has timed out")
  ) {
    return "expired";
  }

  if (
    code.includes("used") ||
    message.includes("already used") ||
    message.includes("already been used") ||
    message.includes("already consumed") ||
    message.includes("already verified")
  ) {
    return "used";
  }

  if (
    code.includes("missing") ||
    message.includes("missing") ||
    message.includes("token_hash") ||
    message.includes("no token")
  ) {
    return "missing";
  }

  return "invalid";
}

export function classifyAccountAuthFailureFromRequest(input: {
  code: string | null;
  tokenHash: string | null;
  type: string | null;
}) {
  if (!input.code && !input.tokenHash) {
    return "missing" satisfies AccountAuthFailureState;
  }

  if (!input.type) {
    return "missing" satisfies AccountAuthFailureState;
  }

  return "invalid" satisfies AccountAuthFailureState;
}
