import type { Metadata } from "next";
import { PageSection } from "@/components/layout/PageSection";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { resolveServerLocaleFallback } from "@/i18n/server";
import { copyText } from "@/lib/i18n/copy-text";
import { buildPageMetadata } from "@/lib/metadata";

function getAdsPageCopy(locale: AppLocale) {
  const allowedSurfaces = [
    copyText(locale, "Home page", "首頁"),
    copyText(locale, "Concepts", "概念庫"),
    copyText(locale, "Subject directory and subject pages", "科目目錄與科目頁"),
    copyText(locale, "Topic directory", "主題目錄"),
    copyText(locale, "Topic pages", "主題頁"),
    copyText(locale, "Guided collections landing page", "引導式合集總覽頁"),
    copyText(locale, "Search results page", "搜尋結果頁"),
    copyText(
      locale,
      "Concept pages only in clearly separated non-interactive zones",
      "概念頁中僅限清楚分隔的非互動區域",
    ),
  ] as const;

  const protectedSurfaces = [
    copyText(locale, "Simulation stage, controls, graphs, equations, and time rails", "模擬舞台、控制項、圖表、方程式與時間軸"),
    copyText(locale, "Interactive concept lab container and post-bench study cards", "互動概念實驗台容器與實驗台後方的學習卡片"),
    copyText(locale, "Compare mode, prediction mode, and worked-example flows", "比較模式、預測模式與解題示範流程"),
    copyText(locale, "Challenge pages and challenge interactions", "挑戰頁與挑戰互動區"),
    copyText(locale, "Share tools, pricing, account, auth, and developer harness pages", "分享工具、價格頁、帳戶頁、登入流程與開發用 harness 頁面"),
    copyText(locale, "About, billing, privacy, terms, contact, support, and other sensitive trust pages", "關於、收費、私隱、條款、聯絡、支援與其他敏感信任頁面"),
  ] as const;

  return {
    metadata: {
      title: copyText(locale, "Ads and sponsorship", "廣告與贊助"),
      description: copyText(
        locale,
        "How Open Model Lab currently uses ads on selected eligible free pages, keeps Supporter ad-free, and protects the core interactive learning experience.",
        "說明 Open Model Lab 目前如何在指定、符合資格的免費頁面放置廣告、如何保持支持者方案無廣告，以及如何保護核心互動學習體驗。",
      ),
      keywords:
        locale === "zh-HK"
          ? ["廣告", "贊助", "AdSense", "支持者方案無廣告", "Open Model Lab"]
          : ["ads", "advertising", "AdSense", "supporter ad-free", "Open Model Lab"],
      category: copyText(locale, "advertising", "廣告"),
    },
    feedbackTitle: copyText(locale, "Ads and sponsorship", "廣告與贊助"),
    sectionNav: {
      label: copyText(locale, "Ads page sections", "廣告頁段落"),
      title: copyText(locale, "Jump within ads policy", "快速跳到廣告政策段落"),
      mobileLabel: copyText(locale, "Ads sections", "廣告段落"),
      items: [
        {
          id: "ads-overview",
          label: copyText(locale, "Ads overview", "廣告總覽"),
          compactLabel: copyText(locale, "Overview", "總覽"),
        },
        {
          id: "ads-placements",
          label: copyText(locale, "Allowed placements", "可放置位置"),
          compactLabel: copyText(locale, "Allowed", "可用"),
        },
        {
          id: "ads-protected",
          label: copyText(locale, "Protected learning surfaces", "受保護學習區域"),
          compactLabel: copyText(locale, "Protected", "保護"),
        },
        {
          id: "ads-provider",
          label: copyText(locale, "Ad provider details", "廣告供應商說明"),
          compactLabel: copyText(locale, "Provider", "供應商"),
        },
      ],
    },
    hero: {
      eyebrow: copyText(locale, "Ads and sponsorship", "廣告與贊助"),
      title: copyText(
        locale,
        "Ads stay manual, route-limited, and dormant until the product is explicitly ready.",
        "廣告維持手動投放、路由受限，而且在產品明確準備好之前保持休眠。",
      ),
      description: copyText(
        locale,
        "This page explains the current placement policy as the product exists today. Open Model Lab uses a manual-first AdSense path, keeps Supporter browsing ad-free on eligible routes, and fails closed until ads are explicitly enabled.",
        "這頁說明產品現階段真正採用的廣告政策。Open Model Lab 走手動優先的 AdSense 路徑，支持者方案在符合資格的路由保持無廣告，而且在未明確啟用之前會採取預設關閉。",
      ),
    },
    labels: {
      currentModel: copyText(locale, "Current model", "目前模式"),
      allowedPlacements: copyText(locale, "Allowed placements", "可放置位置"),
      protectedLearningSurfaces: copyText(locale, "Protected learning surfaces", "受保護學習區域"),
      providerNote: copyText(locale, "Provider note", "供應商說明"),
    },
    paragraphs: {
      model: {
        prefix: copyText(
          locale,
          "Free browsing may show ads on selected browse, search, and safe concept-page surfaces when ads are explicitly enabled. Supporter removes ads where ads are eligible and adds the convenience features described on the ",
          "只有在明確啟用廣告時，免費瀏覽才可能在部分瀏覽、搜尋與安全的概念頁區域顯示廣告。支持者方案會在符合資格的廣告路由移除廣告，並加入",
        ),
        linkLabel: copyText(locale, "Pricing", "價格頁"),
        suffix: copyText(
          locale,
          " page.",
          "所描述的現有便利功能。",
        ),
      },
      body: [
        copyText(
          locale,
          "When advertising is enabled, Open Model Lab uses manually placed Google AdSense units only. The current architecture is manual-first and does not rely on Auto ads as the primary mode.",
          "當廣告啟用時，Open Model Lab 目前只使用手動放置的 Google AdSense 單元。現有架構以手動為主，並不把自動廣告模式當作主要做法。",
        ),
        copyText(
          locale,
          "The intent is simple: ads can support public browsing without interrupting the live science-learning interaction. Before approval and explicit activation, the ad system stays dormant and renders nothing.",
          "目標很簡單：讓廣告支援公開瀏覽，但不打斷即時的科學學習互動。在取得批准並完成明確啟用之前，廣告系統會保持休眠，不會渲染任何內容。",
        ),
      ] as const,
      provider: [
        copyText(
          locale,
          "Google AdSense is the current provider path when ads are turned on. Local testing may show only a provider request without a filled creative, and missing config keeps each placement collapsed instead of rendering a broken shell.",
          "Google AdSense 是目前啟用廣告時的供應商路徑。當地測試時，有時只會看到供應商請求而沒有實際廣告內容；若缺少設定，每個位置都會保持收合，而不是渲染一個壞掉的外殼。",
        ),
        copyText(
          locale,
          "If advertising is disabled, unapproved, or unconfigured, Open Model Lab renders no live ad unit and does not load the AdSense bootstrap on ineligible pages. The free tier still keeps access to core concepts, simulations, tracks, and standard challenge mode.",
          "如果廣告被停用、尚未批准或尚未設定，Open Model Lab 就不會渲染任何實際廣告單元，也不會在不合資格的頁面載入 AdSense 啟動腳本。免費層仍然可以使用核心概念、模擬、路徑與標準挑戰模式。",
        ),
      ],
      providerLinks: {
        privacyPrefix: copyText(locale, "Read ", "如想了解相關資料說明，可先看 "),
        privacyLabel: copyText(locale, "Privacy", "私隱政策"),
        privacySuffix: copyText(locale, " for the related data note, or use ", "；如果想直接詢問目前的廣告政策，也可以使用 "),
        contactLabel: copyText(locale, "Contact", "聯絡我們"),
        contactSuffix: copyText(locale, ".", "。"),
      },
    },
    pricingLabel: copyText(locale, "Pricing", "價格"),
    allowedSurfaces,
    protectedSurfaces,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  return buildAdsMetadata(await resolveServerLocaleFallback());
}

export async function buildAdsMetadata(locale: AppLocale): Promise<Metadata> {
  const copy = getAdsPageCopy(locale);

  return buildPageMetadata({
    title: copy.metadata.title,
    description: copy.metadata.description,
    pathname: "/ads",
    locale,
    keywords: copy.metadata.keywords,
    category: copy.metadata.category,
  });
}

export default async function AdsPage({
  localeOverride,
}: {
  localeOverride?: AppLocale;
} = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const copy = getAdsPageCopy(locale);

  return (
    <PageShell
      feedbackContext={{
        pageType: "other",
        pagePath: "/ads",
        pageTitle: copy.feedbackTitle,
      }}
      sectionNav={copy.sectionNav}
    >
      <section className="space-y-6 sm:space-y-8">
        <PageSection id="ads-overview" as="div" className="space-y-6">
          <SectionHeading
            eyebrow={copy.hero.eyebrow}
            title={copy.hero.title}
            description={copy.hero.description}
          />
        </PageSection>

        <PageSection
          id="ads-placements"
          as="section"
          className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]"
        >
          <article className="lab-panel p-6">
            <p className="lab-label">{copy.labels.currentModel}</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-ink-700">
              <p>
                {copy.paragraphs.model.prefix}
                <Link
                  href="/pricing"
                  className="font-medium text-ink-950 underline underline-offset-4"
                >
                  {copy.paragraphs.model.linkLabel}
                </Link>
                {copy.paragraphs.model.suffix}
              </p>
              <p>{copy.paragraphs.body[0]}</p>
              <p>{copy.paragraphs.body[1]}</p>
            </div>
          </article>

          <article className="lab-panel p-6">
            <p className="lab-label">{copy.labels.allowedPlacements}</p>
            <div className="mt-4 grid gap-3">
              {copy.allowedSurfaces.map((surface) => (
                <div
                  key={surface}
                  className="rounded-2xl border border-line bg-paper-strong px-4 py-3 text-sm text-ink-700"
                >
                  {surface}
                </div>
              ))}
            </div>
          </article>
        </PageSection>

        <PageSection id="ads-protected" as="section" className="lab-panel p-6">
          <p className="lab-label">{copy.labels.protectedLearningSurfaces}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {copy.protectedSurfaces.map((surface) => (
              <div
                key={surface}
                className="rounded-2xl border border-line bg-paper-strong px-4 py-3 text-sm text-ink-700"
              >
                {surface}
              </div>
            ))}
          </div>
        </PageSection>

        <PageSection id="ads-provider" as="section" className="lab-panel p-6">
          <p className="lab-label">{copy.labels.providerNote}</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-ink-700">
            <p>{copy.paragraphs.provider[0]}</p>
            <p>{copy.paragraphs.provider[1]}</p>
            <p>
              {copy.paragraphs.providerLinks.privacyPrefix}
              <Link
                href="/privacy"
                className="font-medium text-ink-950 underline underline-offset-4"
              >
                {copy.paragraphs.providerLinks.privacyLabel}
              </Link>
              {copy.paragraphs.providerLinks.privacySuffix}
              <Link
                href="/contact"
                className="font-medium text-ink-950 underline underline-offset-4"
              >
                {copy.paragraphs.providerLinks.contactLabel}
              </Link>
              {copy.paragraphs.providerLinks.contactSuffix}
            </p>
          </div>
        </PageSection>
      </section>
    </PageShell>
  );
}
