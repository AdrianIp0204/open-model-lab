"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import type { AppLocale } from "@/i18n/routing";
import { useAccountAchievementOverview } from "@/lib/achievements/client";
import type {
  AccountAchievementOverview,
  AccountAchievementItemSummary,
  AchievementMilestoneGroupSummary,
  AchievementRewardSummary,
  AchievementStatKey,
} from "@/lib/achievements";
import {
  ACHIEVEMENT_MIN_VISIBLE_HOURS_PROGRESS,
  ACHIEVEMENT_REWARD_CHALLENGE_TARGET,
  ACHIEVEMENT_REWARD_DISCOUNT_PERCENT,
  ACHIEVEMENT_REWARD_STUDY_HOURS_TARGET,
} from "@/lib/achievements/constants";
import { startStripeHostedBillingAction } from "@/lib/billing/client";

const REWARD_RELEVANT_MILESTONE_STAT_KEYS = new Set<
  AchievementMilestoneGroupSummary["statKey"]
>(["challenge-completions", "active-study-hours"]);

function formatAchievementDate(value: string | null, locale: string) {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

function formatAchievementHoursValue(
  value: number,
  t: ReturnType<typeof useTranslations<"AchievementsSection">>,
  options: { includeUnit?: boolean } = {},
) {
  const suffix = options.includeUnit ? ` ${t("units.hours")}` : "";

  if (value <= 0) {
    return `0${suffix}`;
  }

  if (value < ACHIEVEMENT_MIN_VISIBLE_HOURS_PROGRESS) {
    return `<0.1${suffix}`;
  }

  return `${value.toFixed(Number.isInteger(value) || value >= 10 ? 0 : 1)}${suffix}`;
}

function formatGroupValue(
  group: AchievementMilestoneGroupSummary,
  t: ReturnType<typeof useTranslations<"AchievementsSection">>,
) {
  if (group.statKey === "active-study-hours") {
    return formatAchievementHoursValue(group.currentValue, t, {
      includeUnit: true,
    });
  }

  return `${Math.floor(group.currentValue)}`;
}

function getMilestoneStatKey(statKey: AchievementStatKey) {
  switch (statKey) {
    case "concept-visits":
      return "conceptVisits";
    case "question-answers":
      return "questionAnswers";
    case "challenge-completions":
      return "challengeCompletions";
    case "track-completions":
      return "trackCompletions";
    case "active-study-hours":
    default:
      return "activeStudyHours";
  }
}

function parseMilestoneItemKey(key: string) {
  const match = key.match(/^milestone:([^:]+):(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    statKey: match[1] as AchievementStatKey,
    target: Number(match[2] ?? "0"),
  };
}

function getLocalizedMilestoneGroupTitle(
  group: AchievementMilestoneGroupSummary,
  t: ReturnType<typeof useTranslations<"AchievementsSection">>,
) {
  return t(`milestones.groups.${getMilestoneStatKey(group.statKey)}.title`);
}

function getLocalizedMilestoneGroupDescription(
  group: AchievementMilestoneGroupSummary,
  t: ReturnType<typeof useTranslations<"AchievementsSection">>,
) {
  return t(`milestones.groups.${getMilestoneStatKey(group.statKey)}.description`);
}

function getLocalizedMilestoneItemTitle(
  item: AccountAchievementItemSummary,
  t: ReturnType<typeof useTranslations<"AchievementsSection">>,
) {
  const parsed = parseMilestoneItemKey(item.key);
  if (!parsed) {
    return item.title;
  }

  return t("milestones.badges.title", {
    target: parsed.target,
    unit: t(`milestones.groups.${getMilestoneStatKey(parsed.statKey)}.unit`),
  });
}

function getLocalizedMilestoneItemDescription(
  item: AccountAchievementItemSummary,
  t: ReturnType<typeof useTranslations<"AchievementsSection">>,
) {
  const parsed = parseMilestoneItemKey(item.key);
  if (!parsed) {
    return item.description;
  }

  return t("milestones.badges.description", {
    target: parsed.target,
    subject: t(`milestones.groups.${getMilestoneStatKey(parsed.statKey)}.subject`),
  });
}

function formatNextTarget(
  group: AchievementMilestoneGroupSummary,
  t: ReturnType<typeof useTranslations<"AchievementsSection">>,
) {
  if (group.nextMilestone.nextTarget === null) {
    return t("milestones.nextTarget.allEarned");
  }

  const current =
    group.statKey === "active-study-hours"
      ? formatAchievementHoursValue(group.currentValue, t)
      : `${Math.floor(group.currentValue)}`;

  return t("milestones.nextTarget.progress", {
    current,
    target: group.nextMilestone.nextTarget,
    unit: t(`milestones.groups.${getMilestoneStatKey(group.statKey)}.unit`),
  });
}

function getProgressPercent(group: AchievementMilestoneGroupSummary) {
  return Math.max(0, Math.min(100, Math.round(group.nextMilestone.progressRatio * 100)));
}

function formatRewardStudyHours(
  value: number,
  t: ReturnType<typeof useTranslations<"AchievementsSection">>,
) {
  return formatAchievementHoursValue(value, t);
}

function getRewardRouteProgress(stats: AccountAchievementOverview["stats"]) {
  return {
    challengeCompletions: stats.distinctChallengeCompletionCount,
    studyHours: stats.activeStudySeconds / 3600,
    studyHoursTarget: ACHIEVEMENT_REWARD_STUDY_HOURS_TARGET,
  };
}

function AchievementBadgeCard({
  item,
  t,
  locale,
}: {
  item: AccountAchievementItemSummary;
  t: ReturnType<typeof useTranslations<"AchievementsSection">>;
  locale: AppLocale;
}) {
  const earnedAtLabel = formatAchievementDate(item.earnedAt, locale);
  const title =
    item.kind === "milestone" ? getLocalizedMilestoneItemTitle(item, t) : item.title;
  const description =
    item.kind === "milestone" ? getLocalizedMilestoneItemDescription(item, t) : item.description;

  return (
    <article
      className={[
        "rounded-[22px] border p-4",
        item.earned
          ? "border-teal-500/25 bg-teal-500/10"
          : "border-line bg-paper-strong",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink-950">{title}</p>
        <span
          className={[
            "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]",
            item.earned
              ? "border-teal-500/25 bg-white/85 text-teal-700"
              : "border-line bg-paper text-ink-500",
          ].join(" ")}
        >
          {item.earned ? t("badge.status.earned") : t("badge.status.locked")}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-ink-700">{description}</p>
      {earnedAtLabel ? (
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
          {t("badge.earnedAt", { date: earnedAtLabel })}
        </p>
      ) : null}
    </article>
  );
}

function RewardCard({
  reward,
  stats,
  t,
  locale,
}: {
  reward: AchievementRewardSummary;
  stats: AccountAchievementOverview["stats"];
  t: ReturnType<typeof useTranslations<"AchievementsSection">>;
  locale: AppLocale;
}) {
  const titleId = useId();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const unlockedAtLabel = formatAchievementDate(reward.unlockedAt, locale);
  const expiresAtLabel = formatAchievementDate(reward.expiresAt, locale);
  const claimedAtLabel = formatAchievementDate(reward.claimedAt, locale);
  const usedAtLabel = formatAchievementDate(reward.usedAt, locale);
  const rewardRouteProgress = getRewardRouteProgress(stats);
  const showUnlockRoutes = !["used", "already-used", "temporarily-unavailable"].includes(
    reward.status,
  );

  async function handleClaim() {
    setPending(true);
    setErrorMessage(null);

    try {
      await startStripeHostedBillingAction("/api/billing/checkout", locale);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("reward.errors.checkoutStartFailed"),
      );
      setPending(false);
    }
  }

  let statusLabel = t("reward.status.locked");
  let tone = "border-line bg-paper-strong";
  let body = t("reward.body.locked");

  switch (reward.status) {
    case "unlocked":
      statusLabel = t("reward.status.unlocked");
      tone = "border-teal-500/25 bg-teal-500/10";
      body = expiresAtLabel
        ? t("reward.body.unlockedWithExpiry", {
            date: expiresAtLabel,
            percent: ACHIEVEMENT_REWARD_DISCOUNT_PERCENT,
          })
        : t("reward.body.unlocked");
      break;
    case "claimed":
      statusLabel = t("reward.status.claimed");
      tone = "border-sky-500/25 bg-sky-500/10";
      body = claimedAtLabel
        ? t("reward.body.claimedWithDate", { date: claimedAtLabel })
        : t("reward.body.claimed");
      break;
    case "expired":
      statusLabel = t("reward.status.expired");
      tone = "border-amber-500/25 bg-amber-500/10";
      body = expiresAtLabel
        ? t("reward.body.expiredWithDate", { date: expiresAtLabel })
        : t("reward.body.expired");
      break;
    case "used":
      statusLabel = t("reward.status.used");
      tone = "border-teal-500/25 bg-teal-500/10";
      body = usedAtLabel
        ? t("reward.body.usedWithDate", { date: usedAtLabel })
        : t("reward.body.used");
      break;
    case "premium-ineligible":
      statusLabel = t("reward.status.premiumIneligible");
      tone = "border-line bg-paper";
      body = t("reward.body.premiumIneligible");
      break;
    case "already-used":
      statusLabel = t("reward.status.alreadyUsed");
      tone = "border-line bg-paper";
      body = t("reward.body.alreadyUsed");
      break;
    case "unavailable":
      statusLabel = t("reward.status.unavailable");
      tone = "border-amber-500/25 bg-amber-500/10";
      body = t("reward.body.unavailable");
      break;
    case "temporarily-unavailable":
      statusLabel = t("reward.status.temporarilyUnavailable");
      tone = "border-amber-500/25 bg-amber-500/10";
      body = t("reward.body.temporarilyUnavailable");
      break;
    default:
      statusLabel = t("reward.status.locked");
      tone = "border-line bg-paper-strong";
      body = t("reward.body.locked");
      break;
  }

  const secondaryReasonLabel =
    locale.startsWith("en") && reward.reasonLabel && reward.reasonLabel !== body
      ? reward.reasonLabel
      : null;

  return (
    <section className={`rounded-[24px] border p-5 ${tone}`} aria-labelledby={titleId}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="lab-label">{t("reward.label")}</p>
          <h2 id={titleId} className="mt-2 text-2xl font-semibold text-ink-950">
            {t("reward.title")}
          </h2>
        </div>
        <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-700">
          {statusLabel}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-700">{body}</p>
      {showUnlockRoutes ? (
        <div className="mt-4 rounded-[20px] border border-white/70 bg-white/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-600">
            {t("reward.unlockRoutes.label")}
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-700">
            {t("reward.unlockRoutes.description", {
              percent: ACHIEVEMENT_REWARD_DISCOUNT_PERCENT,
              challengeTarget: ACHIEVEMENT_REWARD_CHALLENGE_TARGET,
              studyHoursTarget: rewardRouteProgress.studyHoursTarget,
            })}
          </p>
          <dl className="mt-3 space-y-3">
            <div className="rounded-[18px] border border-line bg-paper/80 px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-sm font-semibold text-ink-950">
                  {t("reward.unlockRoutes.challengeModes")}
                </dt>
                <dd className="text-sm font-semibold text-ink-950">
                  {rewardRouteProgress.challengeCompletions} /{" "}
                  {ACHIEVEMENT_REWARD_CHALLENGE_TARGET}
                </dd>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80">
                <div
                  className="h-full rounded-full bg-teal-500 transition-[width]"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        100,
                        Math.round(
                          (rewardRouteProgress.challengeCompletions /
                            ACHIEVEMENT_REWARD_CHALLENGE_TARGET) *
                            100,
                        ),
                      ),
                    )}%`,
                  }}
                  aria-hidden="true"
                />
              </div>
            </div>
            <div className="rounded-[18px] border border-line bg-paper/80 px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-sm font-semibold text-ink-950">
                  {t("reward.unlockRoutes.activeStudyHours")}
                </dt>
                <dd className="text-sm font-semibold text-ink-950">
                  {formatRewardStudyHours(rewardRouteProgress.studyHours, t)} /{" "}
                  {rewardRouteProgress.studyHoursTarget}
                </dd>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80">
                <div
                  className="h-full rounded-full bg-teal-500 transition-[width]"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        100,
                        Math.round(
                          (rewardRouteProgress.studyHours /
                            rewardRouteProgress.studyHoursTarget) *
                            100,
                        ),
                      ),
                    )}%`,
                  }}
                  aria-hidden="true"
                />
              </div>
            </div>
          </dl>
        </div>
      ) : null}
      {secondaryReasonLabel ? (
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
          {secondaryReasonLabel}
        </p>
      ) : null}
      {unlockedAtLabel ? (
        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-ink-500">
          {t("reward.unlockedAt", { date: unlockedAtLabel })}
        </p>
      ) : null}
      {reward.claimable || reward.resumable ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleClaim()}
            disabled={pending}
            className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ color: "var(--paper-strong)" }}
          >
            {pending
              ? t("reward.actions.openingStripe")
              : reward.resumable
                ? t("reward.actions.resume")
                : t("reward.actions.claim")}
          </button>
        </div>
      ) : null}
      {errorMessage ? (
        <p className="mt-3 text-sm text-coral-700" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}

function NamedAchievementGroupCard({
  sectionKey,
  title,
  description,
  items,
  t,
  locale,
}: {
  sectionKey: string;
  title: string;
  description: string;
  items: AccountAchievementItemSummary[];
  t: ReturnType<typeof useTranslations<"AchievementsSection">>;
  locale: AppLocale;
}) {
  const titleId = `achievement-named-group-${sectionKey}`;
  const [expanded, setExpanded] = useState(false);
  const defaultVisibleCount = 6;
  const visibleItems = expanded ? items : items.slice(0, defaultVisibleCount);
  const hiddenCount = Math.max(0, items.length - defaultVisibleCount);

  return (
    <section
      className="rounded-[24px] border border-line bg-paper-strong p-4"
      aria-labelledby={titleId}
    >
      <h3 id={titleId} className="text-lg font-semibold text-ink-950">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-ink-700">{description}</p>
      {items.length ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {visibleItems.map((item) => (
            <AchievementBadgeCard key={item.key} item={item} t={t} locale={locale} />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-ink-700">
          {t("namedGroups.empty")}
        </p>
      )}
      {items.length > defaultVisibleCount ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-4 inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-700 transition hover:border-ink-950/20 hover:bg-white"
          aria-expanded={expanded}
        >
          {expanded
            ? t("namedGroups.actions.showFewer")
            : t("namedGroups.actions.showMore", { count: hiddenCount })}
        </button>
      ) : null}
    </section>
  );
}

export function AchievementsSection() {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("AchievementsSection");
  const { initialized, loading, overview, errorMessage } = useAccountAchievementOverview();

  if (!initialized || (loading && !overview)) {
    return (
      <section className="lab-panel p-5" aria-live="polite">
        <p className="lab-label">{t("loading.label")}</p>
        <h2 className="mt-3 text-2xl font-semibold text-ink-950">
          {t("loading.title")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-700">
          {t("loading.description")}
        </p>
      </section>
    );
  }

  if (errorMessage || !overview) {
    return (
      <section className="lab-panel p-5" aria-live="polite">
        <p className="lab-label">{t("error.label")}</p>
        <h2 className="mt-3 text-2xl font-semibold text-ink-950">
          {t("error.title")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-700">
          {errorMessage ?? t("error.description")}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <RewardCard reward={overview.reward} stats={overview.stats} t={t} locale={locale} />

      <section className="lab-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{t("section.label")}</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-950">
              {t("section.title")}
            </h2>
          </div>
          <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-600">
            {t("section.serverBacked")}
          </span>
        </div>

        <div className="mt-5 grid gap-4">
          {overview.milestoneGroups.map((group) => (
            <section
              key={group.statKey}
              className="rounded-[24px] border border-line bg-paper-strong p-4"
              aria-labelledby={`achievement-milestone-group-${group.statKey}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      id={`achievement-milestone-group-${group.statKey}`}
                      className="text-lg font-semibold text-ink-950"
                    >
                      {getLocalizedMilestoneGroupTitle(group, t)}
                    </h3>
                    {REWARD_RELEVANT_MILESTONE_STAT_KEYS.has(group.statKey) ? (
                      <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-teal-700">
                        {t("section.rewardUnlocks")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink-700">
                    {getLocalizedMilestoneGroupDescription(group, t)}
                  </p>
                </div>
                <div className="rounded-[18px] border border-line bg-paper px-4 py-3 text-right">
                  <p className="text-lg font-semibold text-ink-950">{formatGroupValue(group, t)}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
                    {formatNextTarget(group, t)}
                  </p>
                </div>
              </div>
              <div
                data-achievement-progress-rail={group.statKey}
                className="mt-4 h-2 overflow-hidden rounded-full border border-line/80 bg-paper shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
              >
                <div
                  className="h-full rounded-full bg-teal-500 transition-[width]"
                  style={{ width: `${getProgressPercent(group)}%` }}
                  aria-hidden="true"
                />
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {group.items.map((item) => (
                  <AchievementBadgeCard key={item.key} item={item} t={t} locale={locale} />
                ))}
              </div>
            </section>
          ))}

          {overview.namedGroups.map((group) => (
            <NamedAchievementGroupCard
              key={group.key}
              sectionKey={group.key}
              title={t(`namedGroups.groups.${group.key}.title`)}
              description={t(`namedGroups.groups.${group.key}.description`)}
              items={group.items}
              t={t}
              locale={locale}
            />
          ))}
        </div>
      </section>
    </section>
  );
}
