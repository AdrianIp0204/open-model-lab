import type { Metadata } from "next";
import { PageSection } from "@/components/layout/PageSection";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { resolveServerLocaleFallback } from "@/i18n/server";
import { copyText } from "@/lib/i18n/copy-text";
import { buildPageMetadata } from "@/lib/metadata";
import { getTrustLastUpdatedLabel, trustConfig } from "@/lib/trust";

function getBillingPageCopy(locale: AppLocale) {
  const achievementDiscountLabel = copyText(
    locale,
    trustConfig.premiumPlan.achievementDiscountLabel,
    "首月 25% 折扣",
  );
  const premiumIncludes = [
    copyText(locale, "Saved exact-state setups", "已儲存完整狀態設定"),
    copyText(locale, "Saved compare setups", "已儲存比較設定"),
    copyText(locale, "Exact-state sharing and public experiment cards", "精確狀態分享與公開實驗卡"),
    copyText(locale, "Advanced study tools and deeper review support", "進階學習工具與更深入的複習支援"),
    copyText(locale, "Ad-free browsing", "無廣告瀏覽"),
  ] as const;

  const billingSections = [
    {
      title: copyText(locale, "How checkout works", "結帳如何運作"),
      paragraphs: [
        copyText(
          locale,
          `${trustConfig.premiumPlan.displayName} is the current optional Supporter plan. It helps fund hosting, maintenance, and development while core learning stays free. It is offered as one ${trustConfig.premiumPlan.billingIntervalLabel.toLowerCase()} Stripe subscription at ${trustConfig.premiumPlan.priceLabel}.`,
          `${trustConfig.premiumPlan.displayName} 是目前可選的支持者方案，用來支持託管、維護和持續開發；核心學習內容會保持免費。它以 Stripe 按${trustConfig.premiumPlan.billingIntervalLabel === "Monthly" ? "月" : "期"}訂閱形式提供，價格為 ${trustConfig.premiumPlan.priceLabel}。`,
        ),
        copyText(
          locale,
          "Checkout starts from the existing pricing or account surfaces. You need to be signed in first so the Stripe session can attach to the correct Open Model Lab account.",
          "結帳會從現有的價格頁或帳戶頁開始。你需要先登入，讓 Stripe 工作階段能綁定到正確的 Open Model Lab 帳戶。",
        ),
      ],
    },
    {
      title: copyText(locale, "How billing is managed", "如何管理收費"),
      paragraphs: [
        copyText(
          locale,
          "Billing management lives on the account side of the product. When an account already has a Stripe-managed subscription, the Manage subscription path opens Stripe Billing Portal from the account page.",
          "收費管理集中在帳戶一側。當帳戶已經有 Stripe 管理中的訂閱時，帳戶頁上的「管理訂閱」流程會直接打開 Stripe 的訂閱管理入口。",
        ),
        copyText(
          locale,
          "If Stripe billing is unavailable or not configured on a deployment, the app keeps that state visible instead of pretending management is available.",
          "如果某個部署尚未提供 Stripe 收費功能或尚未完成設定，系統會直接顯示該狀態，而不會假裝管理功能可用。",
        ),
      ],
    },
    {
      title: copyText(locale, "How cancellation works", "取消如何運作"),
      paragraphs: [
        copyText(
          locale,
          "If you cancel through Stripe and the subscription is marked to end at the period boundary, Supporter stays active until the current billed period ends.",
          "如果你透過 Stripe 取消，且訂閱被標記為在本期結束時終止，支持者方案會一直保持有效，直到目前已收費週期結束。",
        ),
        copyText(
          locale,
          "After that Stripe-managed period ends, the account falls back to the free tier and Supporter convenience features stop applying.",
          "當這個 Stripe 管理的收費週期結束後，帳戶便會回到免費層，支持者方案便利功能也會停止生效。",
        ),
      ],
    },
    {
      title: copyText(locale, "Payment issues", "付款問題"),
      paragraphs: [
        copyText(
          locale,
          "If Stripe reports a payment or setup problem, the app treats that subscription as needing recovery rather than silently restoring Supporter.",
          "如果 Stripe 回報付款或設定問題，系統會把該訂閱視為需要修復，而不會默默恢復支持者方案。",
        ),
        copyText(
          locale,
          "The next step is to update payment details or finish recovery in Stripe, then return to the account page to confirm the latest status.",
          "下一步通常是到 Stripe 更新付款資料或完成修復流程，然後回到帳戶頁確認最新狀態。",
        ),
      ],
    },
    {
      title: copyText(locale, "Refunds", "退款"),
      paragraphs: [
        copyText(locale, trustConfig.refundPolicy.summary, "退款處理會依照目前公開的政策逐案審視，而不會自動承諾退款。"),
        copyText(
          locale,
          `That means refunds are not promised automatically. If you need help, contact billing support at ${trustConfig.billingSupportEmail} with the account email and the issue you hit.`,
          `這表示退款並非自動保證。如果你需要協助，請用帳戶電郵和遇到的問題聯絡 ${trustConfig.billingSupportEmail}。`,
        ),
      ],
    },
    {
      title: copyText(locale, "Achievement discount reward", "成就折扣獎勵"),
      paragraphs: [
        copyText(
          locale,
          `Some eligible signed-in free accounts may unlock ${achievementDiscountLabel} through the existing in-product achievement path.`,
          `部分符合資格、已登入的免費帳戶，可能會透過現有產品內的成就路徑解鎖 ${achievementDiscountLabel}。`,
        ),
        copyText(
          locale,
          "That reward is applied automatically at checkout for the eligible account. There is no public promo-code entry flow, and not every account will see the reward.",
          "只要帳戶符合資格，該獎勵會在結帳時自動套用。產品沒有公開的優惠碼輸入流程，而且不是每個帳戶都會看到這個獎勵。",
        ),
      ],
    },
  ] as const;

  return {
    metadata: {
      title: copyText(locale, "Billing, cancellation, and refunds", "收費、取消與退款"),
      description: copyText(
        locale,
        "Plain-English billing details for the optional Open Model Lab Supporter plan, including what Supporter includes, how Stripe-hosted checkout and cancellation work, discount limits, refunds, and support.",
        "以清楚文字說明可選的 Open Model Lab 支持者方案收費安排，包括支持者方案內容、Stripe 託管結帳與取消方式、折扣限制、退款政策與支援途徑。",
      ),
      keywords:
        locale === "zh-HK"
          ? ["Open Model Lab 收費", "支持者方案收費", "訂閱取消", "退款政策"]
          : ["Open Model Lab billing", "supporter billing", "subscription cancellation", "refund policy"],
      category: copyText(locale, "billing", "收費"),
    },
    feedbackTitle: copyText(locale, "Billing", "收費"),
    sectionNav: {
      label: copyText(locale, "Billing page sections", "收費頁段落"),
      title: copyText(locale, "Jump within billing", "快速跳到收費段落"),
      mobileLabel: copyText(locale, "Billing sections", "收費段落"),
      items: [
        {
          id: "billing-overview",
          label: copyText(locale, "Billing overview", "收費總覽"),
          compactLabel: copyText(locale, "Overview", "總覽"),
        },
        {
          id: "billing-plan",
          label: copyText(locale, "Supporter plan snapshot", "支持者方案摘要"),
          compactLabel: copyText(locale, "Plan", "方案"),
        },
        {
          id: "billing-policy",
          label: copyText(locale, "Billing policies", "收費政策"),
          compactLabel: copyText(locale, "Policy", "政策"),
        },
        {
          id: "billing-support",
          label: copyText(locale, "Billing support", "收費支援"),
          compactLabel: copyText(locale, "Support", "支援"),
        },
      ],
    },
    hero: {
      eyebrow: copyText(locale, "Billing", "收費"),
      title: copyText(
        locale,
        "Plain-English details for Supporter billing, cancellations, refunds, and help.",
        "用清楚文字說明支持者方案的收費、取消、退款與支援。",
      ),
      description: copyText(
        locale,
        "This page explains the current optional Supporter billing model as it actually exists in the product today: one monthly Stripe subscription, bounded account management, period-end cancellation behavior, conservative refund handling, and direct support contact.",
        "這頁只描述產品今天真正存在的可選支持者方案收費模式：一個按月收費的 Stripe 訂閱、有限度的帳戶管理、期末取消行為、保守的退款處理，以及直接支援聯絡方式。",
      ),
    },
    labels: {
      lastUpdated: copyText(locale, "Last updated", "最後更新"),
      planSnapshot: copyText(locale, "Plan snapshot", "方案摘要"),
      recurringSubscription: copyText(
        locale,
        `Recurring ${trustConfig.premiumPlan.billingIntervalLabel.toLowerCase()} subscription through Stripe-hosted checkout.`,
        `透過 Stripe 託管結帳的定期${trustConfig.premiumPlan.billingIntervalLabel === "Monthly" ? "月" : "期"}費訂閱。`,
      ),
      signInRequired: copyText(
        locale,
        "Signing in is required for Supporter checkout. Signing in alone does not change the account plan.",
        "支持者方案結帳需要先登入；單純登入本身不會改變帳戶方案。",
      ),
      premiumIncludes: copyText(locale, "Supporter includes", "支持者方案包括"),
      beforeYouBuy: copyText(locale, "Before you buy", "購買前先看"),
      billingSupport: copyText(locale, "Billing support", "收費支援"),
    },
    beforeYouBuyLinks: [
      {
        href: "/pricing#compare",
        label: copyText(locale, "Compare free core learning and the Supporter plan on Pricing.", "先在價格頁比較免費核心學習與支持者方案。"),
      },
      {
        href: "/account",
        label: copyText(locale, "Use Account to sign in first and manage billing later.", "先到帳戶頁登入，之後再回來管理收費。"),
      },
      {
        href: "/about",
        label: copyText(locale, "Read the founder-led product context on About.", "先到關於頁了解這個產品目前的背景與定位。"),
      },
      {
        href: "/concepts",
        label: copyText(locale, "Browse the free concepts before deciding.", "決定前先瀏覽免費概念。"),
      },
    ] as const,
    supportBody: {
      prefix: copyText(
        locale,
        "Email ",
        "如有收費、取消、退款或結帳問題，請電郵 ",
      ),
      suffix: copyText(
        locale,
        " for billing, cancellation, refund, or checkout questions, or use the existing support path if you need product help first.",
        "；如果你想先問產品使用問題，也可以先走現有支援路徑。",
      ),
    },
    supportActions: {
      contact: copyText(locale, "Contact", "聯絡我們"),
      pricing: copyText(locale, "Pricing", "價格"),
    },
    premiumIncludes,
    billingSections,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  return buildBillingMetadata(await resolveServerLocaleFallback());
}

export async function buildBillingMetadata(locale: AppLocale): Promise<Metadata> {
  const copy = getBillingPageCopy(locale);

  return buildPageMetadata({
    title: copy.metadata.title,
    description: copy.metadata.description,
    pathname: "/billing",
    locale,
    keywords: copy.metadata.keywords,
    category: copy.metadata.category,
  });
}

export default async function BillingPage({
  localeOverride,
}: {
  localeOverride?: AppLocale;
} = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const copy = getBillingPageCopy(locale);

  return (
    <PageShell
      feedbackContext={{
        pageType: "other",
        pagePath: "/billing",
        pageTitle: copy.feedbackTitle,
      }}
      sectionNav={copy.sectionNav}
    >
      <section className="space-y-6 sm:space-y-8">
        <PageSection id="billing-overview" as="div" className="space-y-6">
          <SectionHeading
            eyebrow={copy.hero.eyebrow}
            title={copy.hero.title}
            description={copy.hero.description}
          />

          <section className="rounded-3xl border border-line bg-paper-strong px-5 py-4 text-sm text-ink-700">
            <span className="lab-label">{copy.labels.lastUpdated}</span>
            <p className="mt-2">{getTrustLastUpdatedLabel("billing")}</p>
          </section>
        </PageSection>

        <PageSection
          id="billing-plan"
          as="section"
          className="grid gap-4 lg:grid-cols-[0.94fr_1.06fr]"
        >
          <article className="lab-panel p-6">
            <p className="lab-label">{copy.labels.planSnapshot}</p>
            <h2 className="mt-3 text-2xl font-semibold text-ink-950">
              {trustConfig.premiumPlan.displayName}
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-ink-700">
              <p>{trustConfig.premiumPlan.priceLabel}</p>
              <p>{copy.labels.recurringSubscription}</p>
              <p>{copy.labels.signInRequired}</p>
            </div>
          </article>

          <article className="lab-panel p-6">
            <p className="lab-label">{copy.labels.premiumIncludes}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {copy.premiumIncludes.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-line bg-paper-strong px-4 py-3 text-sm text-ink-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </article>
        </PageSection>

        <PageSection id="billing-policy" as="div" className="grid gap-4 md:grid-cols-2">
          {copy.billingSections.map((section) => (
            <article key={section.title} className="lab-panel p-6">
              <h2 className="text-xl font-semibold text-ink-950">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-6 text-ink-700">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </PageSection>

        <section className="lab-panel p-6">
          <p className="lab-label">{copy.labels.beforeYouBuy}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {copy.beforeYouBuyLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-line bg-paper-strong px-4 py-3 text-sm text-ink-700 transition-colors hover:border-ink-950/25"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        <PageSection
          id="billing-support"
          as="section"
          className="lab-panel flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="space-y-2">
            <p className="lab-label">{copy.labels.billingSupport}</p>
            <p className="text-sm leading-6 text-ink-700">
              {copy.supportBody.prefix}
              <a
                href={`mailto:${trustConfig.billingSupportEmail}`}
                className="font-medium text-ink-950 underline underline-offset-4"
              >
                {trustConfig.billingSupportEmail}
              </a>
              {copy.supportBody.suffix}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={trustConfig.supportPath}
              className="inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-3 text-sm font-medium text-ink-950 transition-colors hover:border-ink-950/25"
            >
              {copy.supportActions.contact}
            </Link>
            <Link
              href="/pricing#compare"
              className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5"
              style={{ color: "var(--paper-strong)" }}
            >
              {copy.supportActions.pricing}
            </Link>
          </div>
        </PageSection>
      </section>
    </PageShell>
  );
}
