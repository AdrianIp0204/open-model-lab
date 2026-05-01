import { NextResponse } from "next/server";
import {
  accountProgressRequestSchema,
} from "@/lib/account/model";
import {
  describeOptionalAccountDependencyFailure,
  getAccountSessionForCookieHeader,
  shouldLogOptionalAccountDependencyFailureAsError,
} from "@/lib/account/supabase";
import { syncAchievementsFromTrustedProgressSnapshot } from "@/lib/achievements/service";
import {
  getStoredProgressForSession,
  mergeStoredProgressForSession,
} from "@/lib/account/server-store";
import { normalizeProgressSnapshot } from "@/lib/progress/model";

export const runtime = "nodejs";

function buildProgressErrorResponse(
  action: "read" | "sync",
  error: unknown,
) {
  console.error("[account] progress route failed", {
    action,
    message: error instanceof Error ? error.message : null,
    name: error instanceof Error ? error.name : null,
  });

  return NextResponse.json(
    {
      code: action === "read" ? "progress_load_failed" : "progress_sync_failed",
      error:
        action === "read"
          ? "Account progress could not be loaded right now. Local progress in this browser still works."
          : "Account progress could not be synced right now. Local progress in this browser still works, and you can retry in a moment.",
    },
    { status: 500 },
  );
}

async function runBestEffortPostMergeProgressWork(
  cookieHeader: string | null,
  mergedProgress: NonNullable<Awaited<ReturnType<typeof mergeStoredProgressForSession>>>,
) {
  let session: Awaited<ReturnType<typeof getAccountSessionForCookieHeader>> | null = null;

  try {
    session = await getAccountSessionForCookieHeader(cookieHeader);
  } catch (error) {
    const failure = describeOptionalAccountDependencyFailure(error);
    const log = shouldLogOptionalAccountDependencyFailureAsError(failure)
      ? console.error
      : console.warn;

    log("[account] progress route optional post-merge work unavailable", {
      stage: "session_lookup",
      failureKind: failure.kind,
      relationName: failure.relationName,
      code: failure.code,
      message: failure.message,
      fallback: "progress_sync_success_without_achievement_sync",
    });

    return;
  }

  if (!session?.user) {
    console.warn("[account] progress route skipped post-merge side effects after successful sync", {
      stage: "session_lookup",
      fallback: "progress_sync_success_without_achievement_sync",
      reason: "no_authenticated_session_after_merge",
    });
    return;
  }

  try {
    await syncAchievementsFromTrustedProgressSnapshot({
      userId: session.user.id,
      entitlementTier: session.entitlement.tier,
      snapshot: mergedProgress.snapshot,
    });
  } catch (error) {
    const failure = describeOptionalAccountDependencyFailure(error);
    const log = shouldLogOptionalAccountDependencyFailureAsError(failure)
      ? console.error
      : console.warn;

    log("[account] progress route optional post-merge work unavailable", {
      stage: "achievement_sync",
      userId: session.user.id,
      failureKind: failure.kind,
      relationName: failure.relationName,
      code: failure.code,
      message: failure.message,
      fallback: "progress_sync_success_without_achievement_sync",
    });
  }
}

export async function GET(request: Request) {
  try {
    const progress = await getStoredProgressForSession(request);

    if (!progress) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to read account-linked progress.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(progress);
  } catch (error) {
    return buildProgressErrorResponse("read", error);
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
        error: "Progress sync payload must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = accountProgressRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "invalid_payload",
        error: "Progress sync payload did not pass validation.",
      },
      { status: 400 },
    );
  }

  try {
    const mergedProgress = await mergeStoredProgressForSession(
      request,
      normalizeProgressSnapshot(parsed.data.snapshot),
    );

    if (!mergedProgress) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to sync account-linked progress.",
        },
        { status: 401 },
      );
    }

    await runBestEffortPostMergeProgressWork(request.headers.get("cookie"), mergedProgress);

    return NextResponse.json(mergedProgress);
  } catch (error) {
    return buildProgressErrorResponse("sync", error);
  }
}
