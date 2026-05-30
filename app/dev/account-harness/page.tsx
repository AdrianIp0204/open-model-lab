import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/layout/SectionHeading";
import {
  describeDevAccountHarnessState,
  type DevAccountHarnessState,
  getDevAccountHarnessStateFromCookieHeader,
  isDevAccountHarnessEnabled,
  resolveDevAccountHarnessSession,
} from "@/lib/account/dev-harness";
import { getLocalizedAccountDisplayName } from "@/lib/i18n/account";
import { localizeShareHref } from "@/lib/share-links";

export const metadata: Metadata = {
  title: "Dev account harness | Open Model Lab",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

function assertDevAccountHarnessEnabled() {
  if (!isDevAccountHarnessEnabled()) {
    notFound();
  }
}

const qaLinks = [
  {
    href: "/account",
    labelKey: "account",
  },
  {
    href: "/pricing",
    labelKey: "pricing",
  },
  {
    href: "/concepts/projectile-motion",
    labelKey: "projectileMotion",
  },
  {
    href: "/",
    labelKey: "home",
  },
];

const harnessOptions = [
  {
    value: "signed-out",
    messageKey: "signedOut",
  },
  {
    value: "signed-in-free",
    messageKey: "signedInFree",
  },
  {
    value: "signed-in-premium",
    messageKey: "signedInPremium",
  },
] as const satisfies ReadonlyArray<{
  value: DevAccountHarnessState;
  messageKey: string;
}>;

const rewardStates = ["locked", "unlocked", "claimed", "expired"] as const;

function getHarnessStateLabel(
  state: DevAccountHarnessState | null,
  t: (key: string) => string,
) {
  switch (state) {
    case "signed-out":
      return t("states.signedOut");
    case "signed-in-free":
      return t("states.signedInFree");
    case "signed-in-premium":
      return t("states.signedInPremium");
    default:
      return t("states.realAuth");
  }
}

export default async function DevAccountHarnessPage() {
  assertDevAccountHarnessEnabled();

  const locale = await resolveServerLocaleFallback();
  const t = await getScopedTranslator(locale, "DevAccountHarnessPage");
  const tAccountIdentity = await getScopedTranslator(locale, "AccountIdentity");
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const harnessState = getDevAccountHarnessStateFromCookieHeader(cookieHeader);
  const sessionResolution = resolveDevAccountHarnessSession(cookieHeader);
  const session = sessionResolution.session;
  const effectiveLabel =
    locale === "en"
      ? describeDevAccountHarnessState(harnessState)
      : getHarnessStateLabel(harnessState, t);
  const entitlementTier = session?.entitlement.tier ?? "free";
  const entitlementTierLabel =
    entitlementTier === "premium" ? t("tiers.premium") : t("tiers.free");
  const localizedAccountName = session
    ? getLocalizedAccountDisplayName(session.user.displayName, tAccountIdentity)
    : t("values.signedOut");
  const localizedHarnessHref = localizeShareHref("/dev/account-harness", locale);
  const localizedQaLinks = qaLinks.map((link) => ({
    ...link,
    href: localizeShareHref(link.href, locale),
    label: t(`links.${link.labelKey}`),
  }));

  return (
    <PageShell
      showFeedbackWidget={false}
      feedbackContext={{
        pageType: "other",
        pagePath: "/dev/account-harness",
        pageTitle: t("feedbackContext.pageTitle"),
      }}
      className="space-y-6 sm:space-y-8"
    >
      <section className="space-y-6 sm:space-y-8">
        <SectionHeading
          level={1}
          eyebrow={t("hero.eyebrow")}
          title={t("hero.title")}
          description={t("hero.description", {
            flag: "ENABLE_DEV_ACCOUNT_HARNESS=true",
          })}
        />

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <article className="lab-panel p-6">
            <p className="lab-label">{t("mode.label")}</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink-950">{effectiveLabel}</h2>
            <p className="mt-3 text-sm leading-6 text-ink-700">
              {session
                ? t("mode.description.signedIn", {
                    name: localizedAccountName,
                    tier: entitlementTierLabel,
                  })
                : harnessState === "signed-out"
                  ? t("mode.description.signedOut")
                  : t("mode.description.realAuth")}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-line bg-paper-strong p-4">
                <p className="text-lg font-semibold text-ink-950">
                  {localizedAccountName}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
                  {t("stats.account")}
                </p>
              </div>
              <div className="rounded-[22px] border border-line bg-paper-strong p-4">
                <p className="text-lg font-semibold capitalize text-ink-950">
                  {entitlementTierLabel}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
                  {t("stats.tier")}
                </p>
              </div>
              <div className="rounded-[22px] border border-line bg-paper-strong p-4">
                <p className="text-lg font-semibold text-ink-950">
                  {session?.entitlement.capabilities.canSyncProgress
                    ? t("values.enabled")
                    : t("values.off")}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
                  {t("stats.sync")}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {harnessOptions.map((option) => (
                <form
                  key={option.value}
                  method="post"
                  action="/api/dev/account-harness"
                  className="rounded-[24px] border border-line bg-paper-strong p-4"
                >
                  <input type="hidden" name="state" value={option.value} />
                  <input type="hidden" name="returnTo" value={localizedHarnessHref} />
                  <p className="text-sm font-semibold text-ink-950">
                    {t(`options.${option.messageKey}.label`)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-700">
                    {t(`options.${option.messageKey}.description`)}
                  </p>
                  <button
                    type="submit"
                    className="mt-4 inline-flex items-center rounded-full bg-ink-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition hover:opacity-90"
                    style={{ color: "var(--paper-strong)" }}
                  >
                    {t("actions.switch")}
                  </button>
                </form>
              ))}
              <form
                method="post"
                action="/api/dev/account-harness"
                className="rounded-[24px] border border-dashed border-line bg-paper p-4"
              >
                <input type="hidden" name="action" value="set-session" />
                <input type="hidden" name="state" value="clear" />
                <input type="hidden" name="returnTo" value={localizedHarnessHref} />
                <p className="text-sm font-semibold text-ink-950">
                  {t("reset.label")}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-700">
                  {t("reset.description")}
                </p>
                <button
                  type="submit"
                  className="mt-4 inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-950 transition hover:border-ink-950/20"
                >
                  {t("reset.action")}
                </button>
              </form>
            </div>

            {session ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
                <form
                  method="post"
                  action="/api/dev/account-harness"
                  className="rounded-[24px] border border-line bg-paper-strong p-4"
                >
                  <input type="hidden" name="action" value="reset-achievements" />
                  <input type="hidden" name="returnTo" value={localizedHarnessHref} />
                  <p className="text-sm font-semibold text-ink-950">
                    {t("achievements.reset.label")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-700">
                    {t("achievements.reset.description")}
                  </p>
                  <button
                    type="submit"
                    className="mt-4 inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-950 transition hover:border-ink-950/20"
                  >
                    {t("achievements.reset.action")}
                  </button>
                </form>

                <form
                  method="post"
                  action="/api/dev/account-harness"
                  className="rounded-[24px] border border-line bg-paper-strong p-4"
                >
                  <input type="hidden" name="action" value="seed-achievements" />
                  <input type="hidden" name="returnTo" value={localizedHarnessHref} />
                  <p className="text-sm font-semibold text-ink-950">
                    {t("achievements.seed.label")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-700">
                    {t("achievements.seed.description")}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                        {t("achievements.fields.conceptsVisited")}
                      </span>
                      <input
                        type="number"
                        name="conceptVisitCount"
                        min="0"
                        defaultValue="0"
                        className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                        {t("achievements.fields.questionsAnswered")}
                      </span>
                      <input
                        type="number"
                        name="questionAnswerCount"
                        min="0"
                        defaultValue="0"
                        className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                        {t("achievements.fields.challengeCompletions")}
                      </span>
                      <input
                        type="number"
                        name="distinctChallengeCompletionCount"
                        min="0"
                        defaultValue="0"
                        className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                        {t("achievements.fields.trackCompletions")}
                      </span>
                      <input
                        type="number"
                        name="distinctTrackCompletionCount"
                        min="0"
                        defaultValue="0"
                        className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                        {t("achievements.fields.activeStudyHours")}
                      </span>
                      <input
                        type="number"
                        name="activeStudyHours"
                        min="0"
                        step="0.5"
                        defaultValue="0"
                        className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                        {t("achievements.fields.rewardState")}
                      </span>
                      <select
                        name="rewardState"
                        defaultValue="locked"
                        className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
                      >
                        {rewardStates.map((option) => (
                          <option key={option} value={option}>
                            {t(`achievements.rewardStates.${option}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                        {t("achievements.fields.challengeBadges")}
                      </span>
                      <textarea
                        name="challengeCompletionKeys"
                        rows={5}
                        placeholder="projectile-motion:pm-ch-flat-far-shot&#10;uniform-circular-motion:ucm-ch-match-period-change-pull"
                        className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                        {t("achievements.fields.trackBadges")}
                      </span>
                      <textarea
                        name="trackSlugs"
                        rows={5}
                        placeholder="motion-and-circular-motion"
                        className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
                      />
                    </label>
                  </div>

                  <p className="mt-4 text-xs leading-6 text-ink-500">
                    {t("achievements.seed.note")}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-full bg-ink-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition hover:opacity-90"
                      style={{ color: "var(--paper-strong)" }}
                    >
                      {t("achievements.seed.action")}
                    </button>
                  </div>
                </form>
              </div>
            ) : null}
          </article>

          <aside className="grid gap-4">
            <section className="lab-panel p-5">
              <p className="lab-label">{t("checklist.label")}</p>
              <div className="mt-4 grid gap-3">
                {["signedOut", "signedInFree", "signedInPremium"].map((key) => (
                  <div
                    key={key}
                    className="rounded-[20px] border border-line bg-paper-strong px-4 py-3 text-sm leading-6 text-ink-700"
                  >
                    {t(`checklist.items.${key}`)}
                  </div>
                ))}
              </div>
            </section>

            <section className="lab-panel p-5">
              <p className="lab-label">{t("surfaces.label")}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {localizedQaLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-medium text-ink-950 transition hover:border-ink-950/20"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-ink-700">
                {t("surfaces.description", { resetAction: t("reset.label") })}
              </p>
            </section>
          </aside>
        </section>
      </section>
    </PageShell>
  );
}
