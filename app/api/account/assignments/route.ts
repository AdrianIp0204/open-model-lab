import { NextResponse } from "next/server";
import {
  MAX_SAVED_ASSIGNMENTS_PER_COLLECTION,
  savedAssignmentDeleteSchema,
  savedAssignmentDraftSchema,
} from "@/lib/account/assignments";
import {
  deleteStoredAssignmentForSession,
  getStoredAssignmentsForSession,
  saveStoredAssignmentForSession,
} from "@/lib/account/server-store";

export const runtime = "nodejs";

function buildAssignmentErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message === "unknown_collection") {
    return NextResponse.json(
      {
        code: "unknown_collection",
        error: "Assignments must target a published guided collection.",
      },
      { status: 400 },
    );
  }

  if (message === "invalid_assignment") {
    return NextResponse.json(
      {
        code: "invalid_assignment",
        error: "Assignment selections must stay inside the chosen guided collection.",
      },
      { status: 400 },
    );
  }

  if (message === "assignment_not_found") {
    return NextResponse.json(
      {
        code: "assignment_not_found",
        error: "That saved assignment could not be found for this account.",
      },
      { status: 404 },
    );
  }

  if (message === "assignment_limit_reached") {
    return NextResponse.json(
      {
        code: "assignment_limit_reached",
        error: `Save up to ${MAX_SAVED_ASSIGNMENTS_PER_COLLECTION} assignments per guided collection before deleting one.`,
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
        error: "Assignments require a guided collection slug.",
      },
      { status: 400 },
    );
  }

  try {
    const items = await getStoredAssignmentsForSession(request, collectionSlug);

    if (!items) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to read saved assignments.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({ items });
  } catch (error) {
    return buildAssignmentErrorResponse(error);
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
        error: "Assignment payload must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = savedAssignmentDraftSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "invalid_payload",
        error: "Assignment payload did not pass validation.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await saveStoredAssignmentForSession(request, {
      id: parsed.data.id ?? null,
      collectionSlug: parsed.data.collectionSlug,
      title: parsed.data.title,
      summary: parsed.data.summary,
      stepIds: parsed.data.stepIds,
      launchStepId: parsed.data.launchStepId ?? null,
      teacherNote: parsed.data.teacherNote ?? null,
    });

    if (!result) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to save assignments.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return buildAssignmentErrorResponse(error);
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
        error: "Assignment delete payload must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = savedAssignmentDeleteSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "invalid_payload",
        error: "Assignment delete payload did not pass validation.",
      },
      { status: 400 },
    );
  }

  try {
    const items = await deleteStoredAssignmentForSession(request, parsed.data);

    if (!items) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to delete saved assignments.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({ items });
  } catch (error) {
    return buildAssignmentErrorResponse(error);
  }
}
