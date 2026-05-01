import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { localeCookieName } from "@/i18n/routing";
import { resolveRequestLocale } from "@/i18n/request";

type RootLocaleRedirectPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

function buildSearchString(searchParams: Record<string, string | string[] | undefined>) {
  const nextSearchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        nextSearchParams.append(key, entry);
      }
      continue;
    }

    if (typeof value === "string") {
      nextSearchParams.set(key, value);
    }
  }

  const serialized = nextSearchParams.toString();
  return serialized.length > 0 ? `?${serialized}` : "";
}

export default async function RootLocaleRedirectPage({
  searchParams,
}: RootLocaleRedirectPageProps) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = resolveRequestLocale({
    localeCookie: cookieStore.get(localeCookieName)?.value ?? null,
    acceptLanguage: headerStore.get("accept-language"),
  });
  const resolvedSearchParams = searchParams ? await searchParams : {};

  redirect(`/${locale}${buildSearchString(resolvedSearchParams)}`);
}
