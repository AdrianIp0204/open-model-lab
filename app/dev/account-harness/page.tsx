import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { resolveServerLocaleFallback } from "@/i18n/server";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/layout/SectionHeading";
import {
  describeDevAccountHarnessState,
  getDevAccountHarnessStateFromCookieHeader,
  isDevAccountHarnessEnabled,
  resolveDevAccountHarnessSession,
} from "@/lib/account/dev-harness";
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
    label: "Account",
  },
  {
    href: "/pricing",
    label: "Pricing",
  },
  {
    href: "/concepts/projectile-motion",
    label: "Projectile motion",
  },
  {
    href: "/",
    label: "Home",
  },
];

export default async function DevAccountHarnessPage() {
  assertDevAccountHarnessEnabled();

  const locale = await resolveServerLocaleFallback();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const harnessState = getDevAccountHarnessStateFromCookieHeader(cookieHeader);
  const sessionResolution = resolveDevAccountHarnessSession(cookieHeader);
  const session = sessionResolution.session;
  const effectiveLabel = describeDevAccountHarnessState(harnessState);
  const entitlementTier = session?.entitlement.tier ?? "free";
  const localizedHarnessHref = localizeShareHref("/dev/account-harness", locale);
  const localizedQaLinks = qaLinks.map((link) => ({
    ...link,
    href: localizeShareHref(link.href, locale),
  }));

  return (
    <PageShell
      showFeedbackWidget={false}
      feedbackContext={{
        pageType: "other",
        pagePath: "/dev/account-harness",
        pageTitle: "Dev account harness",
      }}
      className="space-y-6 sm:space-y-8"
    >
      <section className="space-y-6 sm:space-y-8">
        <SectionHeading
          eyebrow="Developer-only"
          title="Local account harness"
          description="Use this route to switch the real app into signed-out, signed-in free, or signed-in premium fixture states without browser API stubs or manual SQL. The harness only runs when ENABLE_DEV_ACCOUNT_HARNESS=true and stays disabled in production."
        />

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <article className="lab-panel p-6">
            <p className="lab-label">Current mode</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink-950">{effectiveLabel}</h2>
            <p className="mt-3 text-sm leading-6 text-ink-700">
              {session ? (
                <>
                  This fixture signs the app in as <strong>{session.user.displayName}</strong> on
                  the <strong>{session.entitlement.tier}</strong> tier. Capability checks still
                  flow through the canonical entitlement helpers.
                </>
              ) : harnessState === "signed-out" ? (
                "This fixture forces the app into a signed-out state, even if a real local auth session exists."
              ) : (
                "No harness override is active. The app falls back to real auth if one exists."
              )}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-line bg-paper-strong p-4">
                <p className="text-lg font-semibold text-ink-950">
                  {session ? session.user.displayName : "Signed out"}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
                  effective account
                </p>
              </div>
              <div className="rounded-[22px] border border-line bg-paper-strong p-4">
                <p className="text-lg font-semibold capitalize text-ink-950">{entitlementTier}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
                  entitlement tier
                </p>
              </div>
              <div className="rounded-[22px] border border-line bg-paper-strong p-4">
                <p className="text-lg font-semibold text-ink-950">
                  {session?.entitlement.capabilities.canSyncProgress ? "Enabled" : "Off"}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
                  cross-device sync
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                {
                  value: "signed-out",
                  label: "Use signed-out fixture",
                  description: "Exercise free browsing with no account session.",
                },
                {
                  value: "signed-in-free",
                  label: "Use signed-in free fixture",
                  description:
                    "Exercise signed-in account sync while keeping premium-only saved/share surfaces locked.",
                },
                {
                  value: "signed-in-premium",
                  label: "Use signed-in premium fixture",
                  description:
                    "Exercise the same core sync path plus premium saved/share tools through the real app.",
                },
              ].map((option) => (
                <form
                  key={option.value}
                  method="post"
                  action="/api/dev/account-harness"
                  className="rounded-[24px] border border-line bg-paper-strong p-4"
                >
                  <input type="hidden" name="state" value={option.value} />
                  <input type="hidden" name="returnTo" value={localizedHarnessHref} />
                  <p className="text-sm font-semibold text-ink-950">{option.label}</p>
                  <p className="mt-2 text-sm leading-6 text-ink-700">{option.description}</p>
                  <button
                    type="submit"
                    className="mt-4 inline-flex items-center rounded-full bg-ink-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition hover:opacity-90"
                    style={{ color: "var(--paper-strong)" }}
                  >
                    Switch
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
                <p className="text-sm font-semibold text-ink-950">Reset to real auth</p>
                <p className="mt-2 text-sm leading-6 text-ink-700">
                  Clear the dev harness cookie and fall back to any real Supabase session already
                  present in this browser.
                </p>
                <button
                  type="submit"
                  className="mt-4 inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-950 transition hover:border-ink-950/20"
                >
                  Clear override
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
                  <p className="text-sm font-semibold text-ink-950">Reset achievements</p>
                  <p className="mt-2 text-sm leading-6 text-ink-700">
                    Clear all server-backed achievement counters, named completions, and reward
                    state for the active fixture user.
                  </p>
                  <button
                    type="submit"
                    className="mt-4 inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-950 transition hover:border-ink-950/20"
                  >
                    Reset fixture achievements
                  </button>
                </form>

                <form
                  method="post"
                  action="/api/dev/account-harness"
                  className="rounded-[24px] border border-line bg-paper-strong p-4"
                >
                  <input type="hidden" name="action" value="seed-achievements" />
                  <input type="hidden" name="returnTo" value={localizedHarnessHref} />
                  <p className="text-sm font-semibold text-ink-950">Seed achievements and reward</p>
                  <p className="mt-2 text-sm leading-6 text-ink-700">
                    Use direct fixture values for account-page QA. This stays dev-only and writes
                    the same backing achievement records the product reads elsewhere.
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                        Concepts visited
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
                        Questions answered
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
                        Challenge completions
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
                        Track completions
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
                        Active study hours
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
                        Reward state
                      </span>
                      <select
                        name="rewardState"
                        defaultValue="locked"
                        className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
                      >
                        {["locked", "unlocked", "claimed", "expired"].map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                        Challenge badges
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
                        Track badges
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
                    Challenge badge entries use <strong>concept-slug:challenge-id</strong>. If the
                    selected values would normally qualify the reward, choosing locked here still
                    pins the fixture reward to the locked state.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-full bg-ink-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition hover:opacity-90"
                      style={{ color: "var(--paper-strong)" }}
                    >
                      Apply achievement seed
                    </button>
                  </div>
                </form>
              </div>
            ) : null}
          </article>

          <aside className="grid gap-4">
            <section className="lab-panel p-5">
              <p className="lab-label">QA checklist</p>
              <div className="mt-4 grid gap-3">
                {[
                  "Use signed-out to confirm the free core product still works without an account.",
                  "Use signed-in free to confirm core learning progress syncs while premium-required routes stay honest.",
                  "Use signed-in premium to confirm the same core sync path plus saved/share surfaces run without browser request interception.",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[20px] border border-line bg-paper-strong px-4 py-3 text-sm leading-6 text-ink-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="lab-panel p-5">
              <p className="lab-label">Jump to surfaces</p>
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
                Harness sign-out is deterministic and overrides real auth. Use{" "}
                <strong>Reset to real auth</strong> when you want to return to ordinary local
                Supabase testing.
              </p>
            </section>
          </aside>
        </section>
      </section>
    </PageShell>
  );
}
