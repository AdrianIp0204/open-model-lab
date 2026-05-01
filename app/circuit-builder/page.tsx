import { resolveServerLocaleFallback } from "@/i18n/server";
import {
  buildCircuitBuilderMetadata,
  CircuitBuilderRoute,
} from "./CircuitBuilderRoute";

export async function generateMetadata() {
  return buildCircuitBuilderMetadata(await resolveServerLocaleFallback());
}

export default async function CircuitBuilderPageRoute() {
  return CircuitBuilderRoute();
}
