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

const SUPABASE_CONFIG_ERROR_FRAGMENTS = [
  "NEXT_PUBLIC_SUPABASE_URL is not set",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set",
  "SUPABASE_SERVICE_ROLE_KEY is not set",
  "NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL is not set",
  "OPEN_MODEL_LAB_SITE_URL is not set",
  "NEXT_PUBLIC_SITE_URL is not set",
  "SITE_URL is not set",
  "supabase url is required",
  "supabase key is required",
];

const SUPABASE_REDIRECT_CONFIG_ERROR_FRAGMENTS = [
  "redirect url",
  "redirect_to",
  "redirect uri",
  "email redirect",
  "emailredirectto",
];

const SUPABASE_EMAIL_DELIVERY_ERROR_FRAGMENTS = [
  "smtp",
  "mailer",
  "email provider",
  "email delivery",
  "error sending email",
  "send email",
  "email logins are disabled",
];

export function isSupabaseConfigError(error: unknown) {
  const message = readErrorMessage(error)?.toLowerCase();

  if (!message) {
    return false;
  }

  return SUPABASE_CONFIG_ERROR_FRAGMENTS.some((fragment) =>
    message.includes(fragment.toLowerCase()),
  );
}

export function isSupabaseRedirectConfigError(error: unknown) {
  const message = readErrorMessage(error)?.toLowerCase();

  if (!message) {
    return false;
  }

  const mentionsRedirect = SUPABASE_REDIRECT_CONFIG_ERROR_FRAGMENTS.some((fragment) =>
    message.includes(fragment),
  );

  if (!mentionsRedirect) {
    return false;
  }

  return [
    "not allowed",
    "not valid",
    "invalid",
    "allow list",
    "allowlist",
    "whitelist",
    "mismatch",
  ].some((fragment) => message.includes(fragment));
}

export function isSupabaseEmailDeliveryConfigError(error: unknown) {
  const message = readErrorMessage(error)?.toLowerCase();

  if (!message) {
    return false;
  }

  return SUPABASE_EMAIL_DELIVERY_ERROR_FRAGMENTS.some((fragment) =>
    message.includes(fragment),
  );
}
