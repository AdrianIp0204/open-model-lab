import { resolveServerLocaleFallback } from "@/i18n/server";
import DashboardAnalyticsPage, {
  buildDashboardAnalyticsMetadata,
} from "./DashboardAnalyticsRoute";

export async function generateMetadata() {
  return buildDashboardAnalyticsMetadata(await resolveServerLocaleFallback());
}

export default async function DashboardAnalyticsPageRoute() {
  return <DashboardAnalyticsPage />;
}
