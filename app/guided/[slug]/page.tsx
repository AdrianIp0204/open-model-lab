import type { Metadata } from "next";
import { resolveServerLocaleFallback } from "@/i18n/server";
import GuidedCollectionPage, {
  buildGuidedCollectionPageMetadata,
  generateStaticParams,
} from "./GuidedCollectionRoute";

export { generateStaticParams };

type GuidedCollectionPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: GuidedCollectionPageProps): Promise<Metadata> {
  return buildGuidedCollectionPageMetadata({
    params,
    locale: await resolveServerLocaleFallback(),
  });
}

export default async function GuidedCollectionPageRoute({
  params,
  searchParams,
}: GuidedCollectionPageProps) {
  return <GuidedCollectionPage params={params} searchParams={searchParams} />;
}
