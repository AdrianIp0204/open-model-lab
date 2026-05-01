import { resolveServerLocaleFallback } from "@/i18n/server";
import { getPublishedTopicTestDefinitionBySlug } from "@/lib/test-hub";
import TopicTestRoute, {
  buildTopicTestMetadata,
  generateStaticParams,
} from "./TopicTestRoute";

export { generateStaticParams };

type TopicTestPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export async function generateMetadata({ params }: TopicTestPageProps) {
  const { slug } = await params;
  const locale = await resolveServerLocaleFallback();

  try {
    getPublishedTopicTestDefinitionBySlug(slug);
  } catch {
    return {};
  }

  return buildTopicTestMetadata(slug, locale);
}

export default async function TopicTestPageRoute({ params }: TopicTestPageProps) {
  return <TopicTestRoute params={params} />;
}
