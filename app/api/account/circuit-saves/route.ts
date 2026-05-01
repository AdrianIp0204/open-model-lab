import { NextResponse } from "next/server";
import {
  accountSavedCircuitDeleteSchema,
  accountSavedCircuitDraftSchema,
  accountSavedCircuitRenameSchema,
  MAX_ACCOUNT_SAVED_CIRCUITS_PER_USER,
  normalizeAccountSavedCircuitDraft,
} from "@/lib/account/circuit-saves";
import {
  deleteStoredCircuitSaveForSession,
  getStoredCircuitSavesForSession,
  renameStoredCircuitSaveForSession,
  saveStoredCircuitSaveForSession,
} from "@/lib/account/server-store";

export const runtime = "nodejs";

function buildCircuitSavesErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message === "premium_required") {
    return NextResponse.json(
      {
        code: "premium_required",
        error:
          "Supporter unlocks account-backed saved circuits across devices. Local saved circuits, autosave recovery, and JSON export/import still stay available without account sync.",
      },
      { status: 403 },
    );
  }

  if (message === "saved_circuit_limit_reached") {
    return NextResponse.json(
      {
        code: "saved_circuit_limit_reached",
        error: `Save up to ${MAX_ACCOUNT_SAVED_CIRCUITS_PER_USER} account-backed circuits before updating or deleting one.`,
      },
      { status: 409 },
    );
  }

  if (message === "saved_circuit_not_found") {
    return NextResponse.json(
      {
        code: "saved_circuit_not_found",
        error: "That account-saved circuit could not be found.",
      },
      { status: 404 },
    );
  }

  throw error;
}

export async function GET(request: Request) {
  try {
    const items = await getStoredCircuitSavesForSession(request);

    if (!items) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to read account-saved circuits.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({ items });
  } catch (error) {
    return buildCircuitSavesErrorResponse(error);
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
        error: "Saved circuit payload must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = accountSavedCircuitDraftSchema.safeParse(payload);
  const normalizedDraft = normalizeAccountSavedCircuitDraft(payload);

  if (!parsed.success || !normalizedDraft) {
    return NextResponse.json(
      {
        code: "invalid_payload",
        error: "Saved circuit payload did not pass validation.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await saveStoredCircuitSaveForSession(request, normalizedDraft);

    if (!result) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to save account-backed circuits.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return buildCircuitSavesErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        code: "invalid_json",
        error: "Saved circuit rename payload must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = accountSavedCircuitRenameSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "invalid_payload",
        error: "Saved circuit rename payload did not pass validation.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await renameStoredCircuitSaveForSession(request, parsed.data);

    if (!result) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to rename account-saved circuits.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return buildCircuitSavesErrorResponse(error);
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
        error: "Saved circuit delete payload must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = accountSavedCircuitDeleteSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "invalid_payload",
        error: "Saved circuit delete payload did not pass validation.",
      },
      { status: 400 },
    );
  }

  try {
    const items = await deleteStoredCircuitSaveForSession(request, parsed.data.id);

    if (!items) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to delete account-saved circuits.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({ items });
  } catch (error) {
    return buildCircuitSavesErrorResponse(error);
  }
}
