import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { resolveServerLocaleFallback } from "@/i18n/server";
import { PageSection } from "@/components/layout/PageSection";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { copyText } from "@/lib/i18n/copy-text";
import { buildPageMetadata } from "@/lib/metadata";

function getSourcePageCopy(locale: AppLocale) {
  return {
    metadata: {
      title: copyText(locale, "Source and contribution", "原始碼與參與"),
      description: copyText(
        locale,
        "How Open Model Lab is preparing its public-source contribution path while keeping core learning free and official deployment details private.",
        "說明 Open Model Lab 如何準備公開原始碼參與路徑，同時保持核心學習免費，並保護官方部署細節。",
      ),
      keywords:
        locale === "zh-HK"
          ? ["Open Model Lab", "原始碼", "參與", "科學學習", "公共學習資源"]
          : ["Open Model Lab", "source", "contribute", "science learning", "public good"],
      category: copyText(locale, "source", "原始碼"),
    },
    feedbackTitle: copyText(locale, "Source and contribution", "原始碼與參與"),
    sectionNav: {
      label: copyText(locale, "Source page sections", "原始碼頁段落"),
      title: copyText(locale, "Jump within source posture", "快速跳到原始碼說明段落"),
      mobileLabel: copyText(locale, "Source sections", "原始碼段落"),
      items: [
        {
          id: "source-overview",
          label: copyText(locale, "Project posture", "項目定位"),
          compactLabel: copyText(locale, "Posture", "定位"),
        },
        {
          id: "source-contribution-lanes",
          label: copyText(locale, "Contribution lanes", "參與方向"),
          compactLabel: copyText(locale, "Lanes", "方向"),
        },
        {
          id: "source-boundaries",
          label: copyText(locale, "Protected boundaries", "受保護邊界"),
          compactLabel: copyText(locale, "Boundaries", "邊界"),
        },
        {
          id: "source-next",
          label: copyText(locale, "How to help now", "現在怎樣幫忙"),
          compactLabel: copyText(locale, "Help", "幫忙"),
        },
      ],
    },
    hero: {
      eyebrow: copyText(locale, "Source and contribution", "原始碼與參與"),
      title: copyText(
        locale,
        "Open Model Lab is being prepared as a public-source learning project, not a clone-and-deploy kit.",
        "Open Model Lab 正準備成為公開原始碼學習項目，而不是一套可直接複製部署的套件。",
      ),
      description: copyText(
        locale,
        "The goal is to make the learning model easier to inspect, improve, and learn from while keeping official domains, deployment config, vendor accounts, and private learner data out of the public tree.",
        "目標是讓學習模型更容易被檢視、改善和學習，同時把官方網域、部署設定、供應商帳戶與私人學習者資料留在公開樹之外。",
      ),
      action: copyText(locale, "Share a contribution idea", "分享參與建議"),
    },
    posture: {
      label: copyText(locale, "Current posture", "目前定位"),
      title: copyText(
        locale,
        "Public-good learning first; optional Supporter features only fund sustainability.",
        "先以公共學習價值為核心；可選支持者功能只用來支持持續營運。",
      ),
      body: [
        copyText(
          locale,
          "Core concept pages, simulations, tools, guided paths, challenges, and basic practice stay free and useful without sign-in.",
          "核心概念頁、模擬、工具、引導路徑、挑戰和基本練習會保持免費，而且不登入也有用。",
        ),
        copyText(
          locale,
          "Source readiness work focuses on trustworthy intake: clear licenses, contribution docs, issue templates, safety checks, and no-vendor local setup.",
          "原始碼準備工作聚焦於可信的參與入口：清楚授權、參與文件、議題模板、安全檢查，以及不需要供應商帳戶的本機設定。",
        ),
        copyText(
          locale,
          "When the repository is public, small corrections and verifiable student-facing improvements should be easier to review than broad rewrites.",
          "當儲存庫公開後，小型修正和可驗證的學生面改善，應該比大規模重寫更容易被審核。",
        ),
      ],
    },
    lanes: {
      label: copyText(locale, "Good first contribution lanes", "適合入門的參與方向"),
      items: [
        copyText(
          locale,
          "Correct a concept definition, unit, graph label, worked example, or misconception note.",
          "修正概念定義、單位、圖表標籤、例題，或容易誤解的提示。",
        ),
        copyText(
          locale,
          "Improve keyboard access, contrast, touch targets, or screen-reader wording on a simulation surface.",
          "改善模擬介面的鍵盤操作、對比度、觸控目標或螢幕閱讀器文字。",
        ),
        copyText(
          locale,
          "Make learner-facing copy more direct: predict, change one variable, observe, explain, then check.",
          "把面向學習者的文字改得更直接：先預測、改一個變量、觀察、解釋，再檢查。",
        ),
        copyText(
          locale,
          "Add a focused regression test for a route, content schema, or simulation control.",
          "為某個路由、內容 schema 或模擬控制項加入聚焦的回歸測試。",
        ),
      ],
    },
    boundaries: {
      label: copyText(locale, "Protected boundaries", "受保護邊界"),
      items: [
        copyText(
          locale,
          "Security reports, account support, billing support, and private user-data questions should not be handled in public issues.",
          "安全回報、帳戶支援、收費支援和私人用戶資料問題，不應在公開議題中處理。",
        ),
        copyText(
          locale,
          "Billing, auth, database migrations, ads policy, AI-cost features, license, brand, and governance changes need owner review first.",
          "收費、登入、資料庫遷移、廣告政策、需要 API 成本的 AI 功能、授權、品牌與治理變更，都需要先由擁有人審核。",
        ),
        copyText(
          locale,
          "Official deployment secrets, real Wrangler config, real ads.txt, vendor dashboards, and private operator history stay outside the public source tree.",
          "官方部署密鑰、真實 Wrangler 設定、真實 ads.txt、供應商後台與私人營運歷史，都會留在公開原始碼樹之外。",
        ),
      ],
    },
    next: {
      label: copyText(locale, "How to help now", "現在可以怎樣幫忙"),
      body: copyText(
        locale,
        "Until public issue intake is opened, the safest way to help is to report confusing concepts, broken routes, accessibility problems, or concrete improvement ideas through the contact form.",
        "在公開議題入口正式開放前，最安全的幫忙方式是透過聯絡表單回報令人困惑的概念、壞掉的路由、無障礙問題，或具體改善建議。",
      ),
      primaryAction: copyText(locale, "Send feedback", "提供回饋"),
      secondaryAction: copyText(locale, "Read about the project", "閱讀項目故事"),
    },
  };
}

export async function buildSourceMetadata(locale: AppLocale): Promise<Metadata> {
  const copy = getSourcePageCopy(locale);

  return buildPageMetadata({
    title: copy.metadata.title,
    description: copy.metadata.description,
    pathname: "/source",
    locale,
    keywords: copy.metadata.keywords,
    category: copy.metadata.category,
  });
}

export async function generateMetadata(): Promise<Metadata> {
  return buildSourceMetadata(await resolveServerLocaleFallback());
}

export default async function SourcePage({
  localeOverride,
}: {
  localeOverride?: AppLocale;
} = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const copy = getSourcePageCopy(locale);

  return (
    <PageShell
      feedbackContext={{
        pageType: "other",
        pagePath: "/source",
        pageTitle: copy.feedbackTitle,
      }}
      sectionNav={copy.sectionNav}
    >
      <section className="space-y-6 sm:space-y-8">
        <PageSection id="source-overview" as="section" className="space-y-6">
          <SectionHeading
            eyebrow={copy.hero.eyebrow}
            title={copy.hero.title}
            description={copy.hero.description}
            action={
              <Link
                href="/contact"
                data-testid="source-primary-cta"
                className="motion-button-solid inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-medium"
                style={{ color: "var(--paper-strong)" }}
              >
                {copy.hero.action}
              </Link>
            }
          />

          <article className="lab-panel p-6 sm:p-8">
            <p className="lab-label">{copy.posture.label}</p>
            <h2 className="mt-3 text-2xl font-semibold text-ink-950">
              {copy.posture.title}
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-ink-700 sm:text-base">
              {copy.posture.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>
        </PageSection>

        <PageSection
          id="source-contribution-lanes"
          as="section"
          className="lab-panel p-6 sm:p-8"
        >
          <p className="lab-label">{copy.lanes.label}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {copy.lanes.items.map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-line bg-paper-strong px-4 py-4 text-sm leading-6 text-ink-700"
              >
                {item}
              </div>
            ))}
          </div>
        </PageSection>

        <PageSection id="source-boundaries" as="section" className="lab-panel p-6 sm:p-8">
          <p className="lab-label">{copy.boundaries.label}</p>
          <div className="mt-5 space-y-3">
            {copy.boundaries.items.map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-line bg-paper-strong px-4 py-4 text-sm leading-6 text-ink-700"
              >
                {item}
              </div>
            ))}
          </div>
        </PageSection>

        <PageSection id="source-next" as="section" className="lab-panel p-6 sm:p-8">
          <p className="lab-label">{copy.next.label}</p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-ink-700 sm:text-base">
            {copy.next.body}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="motion-button-solid inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-medium"
              style={{ color: "var(--paper-strong)" }}
            >
              {copy.next.primaryAction}
            </Link>
            <Link
              href="/about"
              className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-medium text-ink-950 hover:border-ink-950/25"
            >
              {copy.next.secondaryAction}
            </Link>
          </div>
        </PageSection>
      </section>
    </PageShell>
  );
}
