import { resolveServerLocaleFallback } from "@/i18n/server";
import ContactPage, { buildContactMetadata } from "./ContactRoute";

export async function generateMetadata() {
  return buildContactMetadata(await resolveServerLocaleFallback());
}

export default async function ContactPageRoute() {
  return <ContactPage />;
}
