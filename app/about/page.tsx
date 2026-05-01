import { resolveServerLocaleFallback } from "@/i18n/server";
import AboutPage, { buildAboutMetadata } from "./AboutRoute";

export async function generateMetadata() {
  return buildAboutMetadata(await resolveServerLocaleFallback());
}

export default async function AboutPageRoute() {
  return <AboutPage />;
}
