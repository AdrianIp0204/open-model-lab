import type { Metadata } from "next";
import {
  generateConceptMetadata,
  renderConceptPage,
} from "../../../concepts/[slug]/page-content";
import { generateStaticParams } from "../../../concepts/[slug]/page";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

type LocalizedConceptPageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamicParams = false;

export { generateStaticParams };

export async function generateMetadata({
  params,
}: LocalizedConceptPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return generateConceptMetadata({ params: Promise.resolve({ slug }), locale: resolvedLocale });
}

export default async function LocalizedConceptPage({
  params,
  searchParams,
}: LocalizedConceptPageProps) {
  const { locale, slug } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return renderConceptPage({
    params: Promise.resolve({ slug }),
    searchParams,
    locale: resolvedLocale,
  });
}
