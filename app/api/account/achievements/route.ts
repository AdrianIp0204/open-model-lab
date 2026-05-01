import { NextResponse } from "next/server";
import { z } from "zod";
import {
  isAppLocale,
  localeCookieName,
  resolveLocalePreference,
} from "@/i18n/routing";
import {
  describeOptionalAccountDependencyFailure,
  getAccountSessionForCookieHeader,
  shouldLogOptionalAccountDependencyFailureAsError,
} from "@/lib/account/supabase";
import { isDevAccountHarnessFixtureUserId } from "@/lib/account/dev-harness";
import { getOptionalStoredProgressForCookieHeader } from "@/lib/account/server-store";
import {
  assertAchievementWritePathAvailable,
  getAccountAchievementOverviewForAuthenticatedUser,
  reconcileAchievementStatsFromSource,
  recordAccountAchievementEvent,
  syncAchievementsFromTrustedProgressSnapshot,
} from "@/lib/achievements/service";
import {
  localizeAchievementOverview,
  localizeAchievementToasts,
} from "@/lib/achievements/localize";
import { getStripeBillingConfig } from "@/lib/billing/env";

export const runtime = "nodejs";

const achievementEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("concept_engagement"),
    conceptSlug: z.string().trim().min(1),
    sessionId: z.string().trim().min(1),
    interactionCount: z.number().int().min(0),
    heartbeatSlot: z.number().int().min(0).nullable(),
    sessionActiveStudySeconds: z.number().int().min(0).nullable().optional(),
  }),
  z.object({
    type: z.literal("question_answered"),
    conceptSlug: z.string().trim().min(1),
    questionId: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal("challenge_completed"),
    conceptSlug: z.string().trim().min(1),
    challengeId: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal("track_completed"),
    trackSlug: z.string().trim().min(1),
  }),
]);

function buildUnauthorizedResponse() {
  return NextResponse.json(
    {
      code: "unauthorized",
      error: "Sign in to load account achievements.",
    },
    { status: 401 },
  );
}

function readCookieValue(cookieHeader: string | null, cookieName: string) {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const trimmedPart = part.trim();

    if (!trimmedPart) {
      continue;
    }

    const separatorIndex = trimmedPart.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedPart.slice(0, separatorIndex).trim();

    if (key !== cookieName) {
      continue;
    }

    return decodeURIComponent(trimmedPart.slice(separatorIndex + 1).trim());
  }

  return null;
}

function resolveAchievementRouteLocale(request: Request, cookieHeader: string | null) {
  const requestLocaleHeader = request.headers.get("x-open-model-lab-locale");

  if (isAppLocale(requestLocaleHeader)) {
    return requestLocaleHeader;
  }

  return resolveLocalePreference({
    localeCookie: readCookieValue(cookieHeader, localeCookieName),
    acceptLanguage: request.headers.get("accept-language"),
  });
}

function isCheckoutRewardConfigured() {
  return Boolean(getStripeBillingConfig().achievementRewardCouponId);
}

function getAchievementAvailabilityCode(
  failure: ReturnType<typeof describeOptionalAccountDependencyFailure>,
  scope: "overview" | "event",
) {
  if (failure.kind === "not_configured") {
    return "achievements_not_configured";
  }

  if (failure.kind === "missing_relation" || failure.kind === "missing_column") {
    return "achievements_store_incomplete";
  }

  return scope === "event" ? "achievement_event_unavailable" : "achievements_unavailable";
}

type AuthenticatedAchievementOverview = Awaited<
  ReturnType<typeof getAccountAchievementOverviewForAuthenticatedUser>
>;

function overviewLooksLikeHealthyZero(
  overview: AuthenticatedAchievementOverview,
) {
  const hasAnyStats =
    overview.stats.conceptVisitCount > 0 ||
    overview.stats.questionAnswerCount > 0 ||
    overview.stats.distinctChallengeCompletionCount > 0 ||
    overview.stats.distinctTrackCompletionCount > 0 ||
    overview.stats.activeStudySeconds > 0;

  if (hasAnyStats) {
    return false;
  }

  return ![...overview.milestoneGroups, ...overview.namedGroups].some((group) =>
    group.items.some((item) => item.earned),
  );
}

async function buildAchievementOverviewForRequest(cookieHeader: string | null) {
  const session = await getAccountSessionForCookieHeader(cookieHeader);

  if (!session?.user) {
    return null;
  }

  const isDevFixtureUser = isDevAccountHarnessFixtureUserId(session.user.id);
  const storedProgress = await getOptionalStoredProgressForCookieHeader({
    cookieHeader,
    routePath: "/api/account/achievements",
  });

  if (!isDevFixtureUser && storedProgress.storedProgress?.snapshot) {
    try {
      await syncAchievementsFromTrustedProgressSnapshot({
        userId: session.user.id,
        entitlementTier: session.entitlement.tier,
        snapshot: storedProgress.storedProgress.snapshot,
      });
    } catch (error) {
      const failure = describeOptionalAccountDependencyFailure(error);
      const log = shouldLogOptionalAccountDependencyFailureAsError(failure)
        ? console.error
        : console.warn;

      log("[account] achievement sync unavailable during achievements route render", {
        userId: session.user.id,
        failureKind: failure.kind,
        relationName: failure.relationName,
        code: failure.code,
        message: failure.message,
        fallback: "read_only_achievement_overview",
      });
    }
  }

  let statsReconciliationError: unknown = null;

  if (!isDevFixtureUser) {
    try {
      await reconcileAchievementStatsFromSource(session.user.id);
    } catch (error) {
      statsReconciliationError = error;
      const failure = describeOptionalAccountDependencyFailure(error);
      const log = shouldLogOptionalAccountDependencyFailureAsError(failure)
        ? console.error
        : console.warn;

      log("[account] achievement stats reconciliation unavailable during achievements route render", {
        userId: session.user.id,
        failureKind: failure.kind,
        relationName: failure.relationName,
        code: failure.code,
        message: failure.message,
        fallback: "authenticated_read_only_achievement_overview",
      });
    }
  }

  const overview = await getAccountAchievementOverviewForAuthenticatedUser({
    userId: session.user.id,
    cookieHeader,
    entitlementTier: session.entitlement.tier,
    checkoutRewardConfigured: isCheckoutRewardConfigured(),
  });

  if (overviewLooksLikeHealthyZero(overview)) {
    if (statsReconciliationError) {
      throw statsReconciliationError;
    }

    await assertAchievementWritePathAvailable({
      userId: session.user.id,
    });
  }

  return {
    session,
    overview,
  };
}

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const locale = resolveAchievementRouteLocale(request, cookieHeader);
    const result = await buildAchievementOverviewForRequest(cookieHeader);

    if (!result) {
      return buildUnauthorizedResponse();
    }

    return NextResponse.json({
      overview: localizeAchievementOverview(result.overview, locale),
    });
  } catch (error) {
    const failure = describeOptionalAccountDependencyFailure(error);
    const log = shouldLogOptionalAccountDependencyFailureAsError(failure)
      ? console.error
      : console.warn;

    log("[account] achievements route failed", {
      hasCookieHeader: Boolean(request.headers.get("cookie")),
      failureKind: failure.kind,
      relationName: failure.relationName,
      code: failure.code,
      message: failure.message,
    });

    return NextResponse.json(
      {
        code: getAchievementAvailabilityCode(failure, "overview"),
        error: "Account achievements could not be loaded right now.",
      },
      { status: 503 },
    );
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
        error: "Achievement event payload must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = achievementEventSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "invalid_payload",
        error: "Achievement event payload did not pass validation.",
      },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const locale = resolveAchievementRouteLocale(request, cookieHeader);
  const session = await getAccountSessionForCookieHeader(cookieHeader);

  if (!session?.user) {
    return buildUnauthorizedResponse();
  }

  try {
    const result = await recordAccountAchievementEvent({
      userId: session.user.id,
      entitlementTier: session.entitlement.tier,
      event: parsed.data,
    });
    const overview = await getAccountAchievementOverviewForAuthenticatedUser({
      userId: session.user.id,
      cookieHeader,
      entitlementTier: session.entitlement.tier,
      checkoutRewardConfigured: isCheckoutRewardConfigured(),
    });

    return NextResponse.json({
      ok: true,
      newlyEarnedAchievements: localizeAchievementToasts(
        result.newlyEarnedAchievements,
        locale,
      ),
      reward: overview.reward,
    });
  } catch (error) {
    const failure = describeOptionalAccountDependencyFailure(error);
    const log = shouldLogOptionalAccountDependencyFailureAsError(failure)
      ? console.error
      : console.warn;

    log("[account] achievement event failed", {
      userId: session.user.id,
      eventType: parsed.data.type,
      failureKind: failure.kind,
      relationName: failure.relationName,
      code: failure.code,
      message: failure.message,
    });

    return NextResponse.json(
      {
        code: getAchievementAvailabilityCode(failure, "event"),
        error: "Achievement progress could not be recorded right now.",
      },
      { status: 503 },
    );
  }
}
