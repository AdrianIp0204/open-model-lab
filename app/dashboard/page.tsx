import { resolveServerLocaleFallback } from "@/i18n/server";
import DashboardPage, { buildDashboardMetadata } from "./DashboardRoute";

export async function generateMetadata() {
  return buildDashboardMetadata(await resolveServerLocaleFallback());
}

export default async function DashboardPageRoute() {
  return <DashboardPage />;
}
