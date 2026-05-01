import { resolveServerLocaleFallback } from "@/i18n/server";
import { getPublishedPackTestDefinitionBySlug } from "@/lib/test-hub";
import PackTestRoute, {
  buildPackTestMetadata,
  generateStaticParams,
} from "./PackTestRoute";

export { generateStaticParams };

type PackTestPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export async function generateMetadata({ params }: PackTestPageProps) {
  const { slug } = await params;
  const locale = await resolveServerLocaleFallback();

  try {
    getPublishedPackTestDefinitionBySlug(slug);
  } catch {
    return {};
  }

  return buildPackTestMetadata(slug, locale);
}

export default async function PackTestPageRoute({ params }: PackTestPageProps) {
  return <PackTestRoute params={params} />;
}
