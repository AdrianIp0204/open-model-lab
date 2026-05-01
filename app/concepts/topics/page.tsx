import { resolveServerLocaleFallback } from "@/i18n/server";
import TopicDirectoryRoute, {
  buildTopicDirectoryMetadata,
} from "./TopicDirectoryRoute";

export async function generateMetadata() {
  return buildTopicDirectoryMetadata(await resolveServerLocaleFallback());
}

export default async function TopicDirectoryPage() {
  return <TopicDirectoryRoute />;
}
