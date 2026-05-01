import { NextResponse } from "next/server";
import { buildSavedCompareSetupRecoveryAction } from "@/lib/account/compare-setup-recovery";
import { isAppLocale } from "@/i18n/routing";
import { getStoredCompareSetupsForSession } from "@/lib/account/server-store";
import { getConceptBySlug } from "@/lib/content";

export const runtime = "nodejs";

function buildRecoveryErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message === "premium_required") {
    return NextResponse.json(
      {
        code: "premium_required",
        error:
          "Supporter unlocks saved-setup recovery inside the review layer. Core concept review still stays free and local-first.",
      },
      { status: 403 },
    );
  }

  if (message === "unknown_concept") {
    return NextResponse.json(
      {
        code: "unknown_concept",
        error: "Saved compare setup recovery must target a published concept.",
      },
      { status: 400 },
    );
  }

  throw error;
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const conceptSlug = searchParams.get("concept")?.trim();
  const requestedLocale = searchParams.get("locale")?.trim() ?? null;
  const locale = isAppLocale(requestedLocale) ? requestedLocale : undefined;

  if (!conceptSlug) {
    return NextResponse.json(
      {
        code: "missing_concept",
        error: "Saved compare setup recovery requires a concept slug.",
      },
      { status: 400 },
    );
  }

  try {
    const items = await getStoredCompareSetupsForSession(request, conceptSlug);

    if (!items) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to reopen saved compare setups.",
        },
        { status: 401 },
      );
    }

    getConceptBySlug(conceptSlug);

    return NextResponse.json({
      items: items.map((savedSetup) =>
        buildSavedCompareSetupRecoveryAction({
          savedSetup,
          locale,
        }),
      ),
    });
  } catch (error) {
    return buildRecoveryErrorResponse(error);
  }
}
