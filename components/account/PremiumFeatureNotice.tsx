"use client";

import { useTranslations } from "next-intl";
import { useAccountSession } from "@/lib/account/client";
import { Link } from "@/i18n/navigation";

export const PREMIUM_PRICING_HREF = "/pricing#compare";
export const PREMIUM_SIGN_IN_HREF = "/account";

type PremiumFeatureNoticeProps = {
  title?: string;
  description: string;
  freeDescription?: string;
  className?: string;
  pricingHref?: string;
  showSignInCta?: boolean;
  signInHref?: string;
};

export function PremiumFeatureNotice({
  title,
  description,
  freeDescription,
  className,
  pricingHref = PREMIUM_PRICING_HREF,
  showSignInCta = true,
  signInHref = PREMIUM_SIGN_IN_HREF,
}: PremiumFeatureNoticeProps) {
  const t = useTranslations("PremiumFeatureNotice");
  const session = useAccountSession();
  const resolvedTitle = title ?? t("title");
  const signedInFree = session.status === "signed-in";
  const isPremium =
    session.status === "signed-in" && session.entitlement.tier === "premium";
  const showSignInLink = !signedInFree && showSignInCta;
  const audienceMessage = signedInFree
    ? t("audience.signedInFree")
    : t("audience.signedOut");

  if (isPremium) {
    return null;
  }

  return (
    <div
      className={[
        "rounded-[20px] border border-amber-500/25 bg-amber-500/10 px-4 py-3",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex flex-col gap-3">
        <div className="space-y-1.5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-amber-800">
            {t("label")}
          </p>
          <p className="text-sm font-semibold text-ink-950">{resolvedTitle}</p>
          <p className="text-sm leading-6 text-ink-800">
            {[freeDescription, description].filter(Boolean).join(" ")}
          </p>
          <p className="text-xs leading-5 text-ink-700">{audienceMessage}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={pricingHref}
            className="inline-flex items-center justify-center rounded-full bg-ink-950 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition hover:opacity-90"
            style={{ color: "var(--paper-strong)" }}
          >
            {t("actions.viewPlans")}
          </Link>
          {showSignInLink ? (
            <Link
              href={signInHref}
              className="inline-flex items-center justify-center rounded-full border border-amber-700/20 bg-white/85 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-900 transition hover:border-amber-700/35 hover:bg-white"
            >
              {t("actions.signIn")}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
