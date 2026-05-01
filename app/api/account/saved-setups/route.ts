import { NextResponse } from "next/server";
import { accountSavedSetupsRequestSchema } from "@/lib/account/model";
import {
  getStoredSavedSetupsForSession,
  mergeStoredSavedSetupsForSession,
} from "@/lib/account/server-store";
import { normalizeSavedSetupsSnapshot } from "@/lib/saved-setups";

export const runtime = "nodejs";

function buildSavedSetupsErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message === "premium_required") {
    return NextResponse.json(
      {
        code: "premium_required",
        error:
          "Supporter keeps named exact-state setups synced across devices. Local setup changes on this browser stay untouched until sync is available.",
      },
      { status: 403 },
    );
  }

  throw error;
}

export async function GET(request: Request) {
  try {
    const savedSetups = await getStoredSavedSetupsForSession(request);

    if (!savedSetups) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to read synced saved setups.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(savedSetups);
  } catch (error) {
    return buildSavedSetupsErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        code: "invalid_json",
        error: "Saved setup sync payload must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = accountSavedSetupsRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "invalid_payload",
        error: "Saved setup sync payload did not pass validation.",
      },
      { status: 400 },
    );
  }

  const snapshot = normalizeSavedSetupsSnapshot(parsed.data.snapshot);

  try {
    const mergedSavedSetups = await mergeStoredSavedSetupsForSession(request, snapshot);

    if (!mergedSavedSetups) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to sync saved setups.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(mergedSavedSetups);
  } catch (error) {
    return buildSavedSetupsErrorResponse(error);
  }
}
