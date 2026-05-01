import type { Metadata } from "next";
import { resolveServerLocaleFallback } from "@/i18n/server";
import StarterTrackPage, {
  buildStarterTrackPageMetadata,
  generateStaticParams,
} from "./StarterTrackRoute";

export { generateStaticParams };

type StarterTrackPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: StarterTrackPageProps): Promise<Metadata> {
  return buildStarterTrackPageMetadata({
    params,
    locale: await resolveServerLocaleFallback(),
  });
}

export default async function StarterTrackPageRoute({
  params,
  searchParams,
}: StarterTrackPageProps) {
  return <StarterTrackPage params={params} searchParams={searchParams} />;
}
