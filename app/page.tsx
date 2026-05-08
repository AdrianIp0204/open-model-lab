import { permanentRedirect } from "next/navigation";
import { addLocalePrefix, routing } from "@/i18n/routing";

type RootLocaleRedirectPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

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
  const resolvedSearchParams = searchParams ? await searchParams : {};

  permanentRedirect(
    `${addLocalePrefix("/", routing.defaultLocale)}${buildSearchString(resolvedSearchParams)}`,
  );
}
