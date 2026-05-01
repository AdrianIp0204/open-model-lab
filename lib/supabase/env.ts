function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not set.`);
  }

  return value;
}

function normalizeUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function getRequiredSiteUrl() {
  const value =
    process.env.NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL?.trim() ||
    process.env.OPEN_MODEL_LAB_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim();

  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL is not set.",
    );
  }

  return value;
}

export function getSupabaseUrl() {
  return normalizeUrl(getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"));
}

export function getSupabasePublishableKey() {
  return getRequiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}

export function getSupabaseServiceRoleKey() {
  return getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function getSiteUrl() {
  return normalizeUrl(getRequiredSiteUrl());
}

export function buildSiteUrl(pathname: string) {
  return new URL(pathname, `${getSiteUrl()}/`).toString();
}
