import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clearDevAccountHarnessStateCookie,
  devAccountHarnessRewardStateSchema,
  devAccountHarnessStateSchema,
  isDevAccountHarnessEnabled,
  resetDevAccountHarnessAchievementsForCookieHeader,
  seedDevAccountHarnessAchievementsForCookieHeader,
  setDevAccountHarnessStateCookie,
} from "@/lib/account/dev-harness";

export const runtime = "nodejs";

const nonNegativeIntegerFieldSchema = z.coerce.number().int().min(0);
const nonNegativeHourFieldSchema = z.coerce.number().min(0);

function getSafeReturnTo(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "/dev/account-harness";
  }

  const trimmedValue = value.trim();

  if (!trimmedValue.startsWith("/") || trimmedValue.startsWith("//")) {
    return "/dev/account-harness";
  }

  return trimmedValue;
}

function parseListField(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  if (!isDevAccountHarnessEnabled()) {
    return NextResponse.json(
      {
        code: "not_found",
        error: "Dev account harness is disabled.",
      },
      { status: 404 },
    );
  }

  const formData = await request.formData();
  const returnTo = getSafeReturnTo(formData.get("returnTo"));
  const action = typeof formData.get("action") === "string" ? formData.get("action") : null;
  const response = NextResponse.redirect(new URL(returnTo, request.url), {
    status: 303,
  });

  if (!action || action === "set-session") {
    const nextState = formData.get("state");

    if (nextState === "clear") {
      clearDevAccountHarnessStateCookie(response);
      return response;
    }

    const parsedState = devAccountHarnessStateSchema.safeParse(nextState);

    if (!parsedState.success) {
      return NextResponse.json(
        {
          code: "invalid_state",
          error: "Dev account harness state did not pass validation.",
        },
        { status: 400 },
      );
    }

    setDevAccountHarnessStateCookie(response, parsedState.data);
    return response;
  }

  if (action === "reset-achievements") {
    await resetDevAccountHarnessAchievementsForCookieHeader(request.headers.get("cookie"));
    return response;
  }

  if (action === "seed-achievements") {
    const rewardState = devAccountHarnessRewardStateSchema.safeParse(
      formData.get("rewardState"),
    );
    const conceptVisitCount = nonNegativeIntegerFieldSchema.safeParse(
      formData.get("conceptVisitCount") ?? "0",
    );
    const questionAnswerCount = nonNegativeIntegerFieldSchema.safeParse(
      formData.get("questionAnswerCount") ?? "0",
    );
    const distinctChallengeCompletionCount = nonNegativeIntegerFieldSchema.safeParse(
      formData.get("distinctChallengeCompletionCount") ?? "0",
    );
    const distinctTrackCompletionCount = nonNegativeIntegerFieldSchema.safeParse(
      formData.get("distinctTrackCompletionCount") ?? "0",
    );
    const activeStudyHours = nonNegativeHourFieldSchema.safeParse(
      formData.get("activeStudyHours") ?? "0",
    );

    if (
      !rewardState.success ||
      !conceptVisitCount.success ||
      !questionAnswerCount.success ||
      !distinctChallengeCompletionCount.success ||
      !distinctTrackCompletionCount.success ||
      !activeStudyHours.success
    ) {
      return NextResponse.json(
        {
          code: "invalid_seed",
          error: "Dev account harness achievement seed values did not pass validation.",
        },
        { status: 400 },
      );
    }

    try {
      await seedDevAccountHarnessAchievementsForCookieHeader({
        cookieHeader: request.headers.get("cookie"),
        seed: {
          conceptVisitCount: conceptVisitCount.data,
          questionAnswerCount: questionAnswerCount.data,
          distinctChallengeCompletionCount: distinctChallengeCompletionCount.data,
          distinctTrackCompletionCount: distinctTrackCompletionCount.data,
          activeStudyHours: activeStudyHours.data,
          challengeCompletionKeys: parseListField(formData.get("challengeCompletionKeys")),
          trackSlugs: parseListField(formData.get("trackSlugs")),
          rewardState: rewardState.data,
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          code: "invalid_seed",
          error:
            error instanceof Error
              ? error.message
              : "Dev account harness achievement seed could not be applied.",
        },
        { status: 400 },
      );
    }

    return response;
  }

  return NextResponse.json(
    {
      code: "invalid_action",
      error: "Dev account harness action is not supported.",
    },
    { status: 400 },
  );
}
