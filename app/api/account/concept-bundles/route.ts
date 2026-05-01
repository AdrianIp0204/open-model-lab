import { NextResponse } from "next/server";
import {
  MAX_SAVED_CONCEPT_BUNDLES_PER_COLLECTION,
  savedConceptBundleDeleteSchema,
  savedConceptBundleDraftSchema,
} from "@/lib/account/concept-bundles";
import {
  deleteStoredConceptBundleForSession,
  getStoredConceptBundlesForSession,
  saveStoredConceptBundleForSession,
} from "@/lib/account/server-store";

export const runtime = "nodejs";

function buildConceptBundleErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message === "unknown_collection") {
    return NextResponse.json(
      {
        code: "unknown_collection",
        error: "Concept bundles must target a published guided collection.",
      },
      { status: 400 },
    );
  }

  if (message === "invalid_concept_bundle") {
    return NextResponse.json(
      {
        code: "invalid_concept_bundle",
        error: "Concept bundle selections must stay inside the chosen guided collection.",
      },
      { status: 400 },
    );
  }

  if (message === "concept_bundle_limit_reached") {
    return NextResponse.json(
      {
        code: "concept_bundle_limit_reached",
        error: `Save up to ${MAX_SAVED_CONCEPT_BUNDLES_PER_COLLECTION} concept bundles per guided collection before replacing or deleting one.`,
      },
      { status: 409 },
    );
  }

  throw error;
}

export async function GET(request: Request) {
  const collectionSlug = new URL(request.url).searchParams.get("collection")?.trim();

  if (!collectionSlug) {
    return NextResponse.json(
      {
        code: "missing_collection",
        error: "Concept bundles require a guided collection slug.",
      },
      { status: 400 },
    );
  }

  try {
    const items = await getStoredConceptBundlesForSession(request, collectionSlug);

    if (!items) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to read saved concept bundles.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({ items });
  } catch (error) {
    return buildConceptBundleErrorResponse(error);
  }
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        code: "invalid_json",
        error: "Concept bundle payload must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = savedConceptBundleDraftSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "invalid_payload",
        error: "Concept bundle payload did not pass validation.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await saveStoredConceptBundleForSession(request, {
      collectionSlug: parsed.data.collectionSlug,
      title: parsed.data.title,
      summary: parsed.data.summary,
      stepIds: parsed.data.stepIds,
      launchStepId: parsed.data.launchStepId ?? null,
    });

    if (!result) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to save concept bundles.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return buildConceptBundleErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        code: "invalid_json",
        error: "Concept bundle delete payload must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = savedConceptBundleDeleteSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "invalid_payload",
        error: "Concept bundle delete payload did not pass validation.",
      },
      { status: 400 },
    );
  }

  try {
    const items = await deleteStoredConceptBundleForSession(request, parsed.data);

    if (!items) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to delete saved concept bundles.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({ items });
  } catch (error) {
    return buildConceptBundleErrorResponse(error);
  }
}
