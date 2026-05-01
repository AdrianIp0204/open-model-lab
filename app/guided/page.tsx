import { resolveServerLocaleFallback } from "@/i18n/server";
import GuidedCollectionsPage, {
  buildGuidedCollectionsMetadata,
} from "./GuidedCollectionsRoute";

export async function generateMetadata() {
  return buildGuidedCollectionsMetadata(await resolveServerLocaleFallback());
}

export default async function GuidedCollectionsPageRoute() {
  return <GuidedCollectionsPage />;
}
