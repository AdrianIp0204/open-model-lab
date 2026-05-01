import { resolveServerLocaleFallback } from "@/i18n/server";
import AccountPage, { buildAccountMetadata } from "./AccountRoute";

type SearchParamsInput = Record<string, string | string[] | undefined>;

export async function generateMetadata() {
  return buildAccountMetadata(await resolveServerLocaleFallback());
}

export default async function AccountPageRoute({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsInput>;
}) {
  return <AccountPage searchParams={searchParams} />;
}
