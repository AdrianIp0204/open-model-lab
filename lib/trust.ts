import { previewFeedbackEmail } from "@/lib/feedback";
import { siteConfig } from "@/lib/metadata/site";

export type TrustPageId = "privacy" | "terms" | "billing";

type PublicTrustConfig = {
  siteName: string;
  supportEmail: string;
  billingSupportEmail: string;
  supportPath: string;
  trustPageLastUpdated: Record<TrustPageId, string>;
  premiumPlan: {
    displayName: string;
    shortName: string;
    priceLabel: string;
    billingIntervalLabel: string;
    achievementDiscountLabel: string;
  };
  refundPolicy: {
    summary: string;
  };
};

function readPublicEmail(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function formatPublicDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export const trustConfig = {
  siteName: siteConfig.name,
  supportEmail: previewFeedbackEmail,
  billingSupportEmail:
    readPublicEmail("NEXT_PUBLIC_BILLING_SUPPORT_EMAIL") ||
    readPublicEmail("BILLING_SUPPORT_EMAIL") ||
    previewFeedbackEmail,
  supportPath: "/contact",
  trustPageLastUpdated: {
    privacy: "2026-04-04",
    terms: "2026-04-04",
    billing: "2026-04-04",
  },
  premiumPlan: {
    displayName: `${siteConfig.name} Supporter`,
    shortName: "Supporter",
    priceLabel: "USD $5/month",
    billingIntervalLabel: "Monthly",
    achievementDiscountLabel: "25% off the first month",
  },
  refundPolicy: {
    summary: "Refund requests are reviewed case by case through billing support.",
  },
} satisfies PublicTrustConfig;

export function getTrustLastUpdatedLabel(pageId: TrustPageId) {
  return formatPublicDate(trustConfig.trustPageLastUpdated[pageId]);
}
