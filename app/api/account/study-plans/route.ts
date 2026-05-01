import { NextResponse } from "next/server";
import {
  MAX_SAVED_STUDY_PLANS_PER_USER,
  savedStudyPlanDeleteSchema,
  savedStudyPlanDraftSchema,
} from "@/lib/account/study-plans";
import {
  deleteStoredStudyPlanForSession,
  getStoredStudyPlansIndexForSession,
  saveStoredStudyPlanForSession,
} from "@/lib/account/server-store";

export const runtime = "nodejs";

function buildStudyPlanErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message === "premium_required") {
    return NextResponse.json(
      {
        code: "premium_required",
        error:
          "Supporter unlocks saved study plans. The core concept, track, guided, and goal-path surfaces still stay open without account-backed custom plans.",
      },
      { status: 403 },
    );
  }

  if (message === "invalid_study_plan") {
    return NextResponse.json(
      {
        code: "invalid_study_plan",
        error:
          "Saved study plans must use published concepts, starter tracks, guided collections, and recommended goal paths.",
      },
      { status: 400 },
    );
  }

  if (message === "study_plan_limit_reached") {
    return NextResponse.json(
      {
        code: "study_plan_limit_reached",
        error: `Save up to ${MAX_SAVED_STUDY_PLANS_PER_USER} study plans before replacing or deleting one.`,
      },
      { status: 409 },
    );
  }

  if (message === "study_plan_not_found") {
    return NextResponse.json(
      {
        code: "study_plan_not_found",
        error: "That saved study plan could not be found.",
      },
      { status: 404 },
    );
  }

  throw error;
}

export async function GET(request: Request) {
  try {
    const items = await getStoredStudyPlansIndexForSession(request);

    if (!items) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to read saved study plans.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({ items });
  } catch (error) {
    return buildStudyPlanErrorResponse(error);
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
        error: "Saved study plan payload must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = savedStudyPlanDraftSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "invalid_payload",
        error: "Saved study plan payload did not pass validation.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await saveStoredStudyPlanForSession(request, {
      id: parsed.data.id ?? null,
      title: parsed.data.title,
      summary: parsed.data.summary?.trim() ? parsed.data.summary : null,
      entries: parsed.data.entries.map((entry) => ({
        kind: entry.kind,
        slug: entry.slug,
      })),
    });

    if (!result) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to save study plans.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return buildStudyPlanErrorResponse(error);
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
        error: "Saved study plan delete payload must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = savedStudyPlanDeleteSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "invalid_payload",
        error: "Saved study plan delete payload did not pass validation.",
      },
      { status: 400 },
    );
  }

  try {
    const items = await deleteStoredStudyPlanForSession(request, parsed.data.id);

    if (!items) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to delete saved study plans.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({ items });
  } catch (error) {
    return buildStudyPlanErrorResponse(error);
  }
}
