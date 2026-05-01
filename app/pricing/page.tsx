import { resolveServerLocaleFallback } from "@/i18n/server";
import PricingPage, { buildPricingMetadata } from "./PricingRoute";

export async function generateMetadata() {
  return buildPricingMetadata(await resolveServerLocaleFallback());
}

export default async function PricingPageRoute() {
  return <PricingPage />;
}
