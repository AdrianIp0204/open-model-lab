import { NextResponse } from "next/server";
import { resolveDeploymentIdentity } from "@/lib/deployment/buildIdentity";

export const dynamic = "force-dynamic";

export async function GET() {
  const identity = resolveDeploymentIdentity();

  return NextResponse.json(
    {
      ok: true,
      identity,
      markerPresent: Boolean(identity.commit || identity.deploymentId),
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
