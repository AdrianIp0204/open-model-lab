import { resolveServerLocaleFallback } from "@/i18n/server";
import TestHubRoute, { buildTestHubMetadata } from "./TestHubRoute";

export async function generateMetadata() {
  return buildTestHubMetadata(await resolveServerLocaleFallback());
}

export default async function TestHubPageRoute() {
  return <TestHubRoute />;
}
