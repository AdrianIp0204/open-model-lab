import { resolveServerLocaleFallback } from "@/i18n/server";
import ToolsDirectoryRoute, {
  buildToolsDirectoryMetadata,
} from "./ToolsDirectoryRoute";

export async function generateMetadata() {
  return buildToolsDirectoryMetadata(await resolveServerLocaleFallback());
}

export default async function ToolsDirectoryPageRoute() {
  return <ToolsDirectoryRoute />;
}
