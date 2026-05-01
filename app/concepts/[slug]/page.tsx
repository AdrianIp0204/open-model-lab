import { getLocale } from "next-intl/server";
import { getConceptSlugs } from "@/lib/content";
import type { AppLocale } from "@/i18n/routing";
import {
  type ConceptPageProps,
  generateConceptMetadata,
  renderConceptPage,
} from "./page-content";

export const dynamicParams = false;

export function generateStaticParams() {
  return getConceptSlugs({ includeAliases: true }).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ConceptPageProps) {
  return generateConceptMetadata({
    params,
    locale: (await getLocale()) as AppLocale,
  });
}

export default async function ConceptPage(props: ConceptPageProps) {
  return renderConceptPage({
    ...props,
    locale: (await getLocale()) as AppLocale,
  });
}
