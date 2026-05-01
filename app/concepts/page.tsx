import { resolveServerLocaleFallback } from "@/i18n/server";
import ConceptsPage, { buildConceptsMetadata } from "./ConceptsRoute";

export async function generateMetadata() {
  return buildConceptsMetadata(await resolveServerLocaleFallback());
}

export default async function ConceptsPageRoute() {
  return <ConceptsPage />;
}
