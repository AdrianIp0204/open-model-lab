// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";
import { generateMetadata as generateLocalizedAccountMetadata } from "@/app/[locale]/account/page";
import { generateMetadata as generateLocalizedCompareSetupsMetadata } from "@/app/[locale]/account/compare-setups/page";
import { generateMetadata as generateLocalizedCreatePasswordMetadata } from "@/app/[locale]/account/create-password/page";
import { generateMetadata as generateLocalizedResetPasswordMetadata } from "@/app/[locale]/account/reset-password/page";
import { generateMetadata as generateLocalizedSetupsMetadata } from "@/app/[locale]/account/setups/page";
import { generateMetadata as generateLocalizedStudyPlansMetadata } from "@/app/[locale]/account/study-plans/page";
import { generateMetadata as generateLocalizedDashboardMetadata } from "@/app/[locale]/dashboard/page";
import { generateMetadata as generateLocalizedDashboardAnalyticsMetadata } from "@/app/[locale]/dashboard/analytics/page";
import { generateMetadata as generateAccountMetadata } from "@/app/account/page";
import { generateMetadata as generateCompareSetupsMetadata } from "@/app/account/compare-setups/page";
import { generateMetadata as generateCreatePasswordMetadata } from "@/app/account/create-password/page";
import { generateMetadata as generateResetPasswordMetadata } from "@/app/account/reset-password/page";
import { generateMetadata as generateSetupsMetadata } from "@/app/account/setups/page";
import { generateMetadata as generateStudyPlansMetadata } from "@/app/account/study-plans/page";
import { generateMetadata as generateDashboardMetadata } from "@/app/dashboard/page";
import { generateMetadata as generateDashboardAnalyticsMetadata } from "@/app/dashboard/analytics/page";
import zhHkMessages from "@/messages/zh-HK.json";

describe("account route i18n metadata", () => {
  beforeEach(() => {
    globalThis.__TEST_LOCALE__ = undefined;
  });

  it("keeps English account-route metadata on locale-prefixed canonicals", async () => {
    globalThis.__TEST_LOCALE__ = "en";

    const [accountMetadata, createPasswordMetadata, resetPasswordMetadata, setupsMetadata, compareSetupsMetadata, studyPlansMetadata, dashboardMetadata, dashboardAnalyticsMetadata] =
      await Promise.all([
        generateAccountMetadata(),
        generateCreatePasswordMetadata(),
        generateResetPasswordMetadata(),
        generateSetupsMetadata(),
        generateCompareSetupsMetadata(),
        generateStudyPlansMetadata(),
        generateDashboardMetadata(),
        generateDashboardAnalyticsMetadata(),
      ]);

    expect(accountMetadata.alternates?.canonical).toContain("/en/account");
    expect(createPasswordMetadata.alternates?.canonical).toContain("/en/account/create-password");
    expect(resetPasswordMetadata.alternates?.canonical).toContain("/en/account/reset-password");
    expect(setupsMetadata.alternates?.canonical).toContain("/en/account/setups");
    expect(compareSetupsMetadata.alternates?.canonical).toContain("/en/account/compare-setups");
    expect(studyPlansMetadata.alternates?.canonical).toContain("/en/account/study-plans");
    expect(dashboardMetadata.alternates?.canonical).toContain("/en/dashboard");
    expect(dashboardAnalyticsMetadata.alternates?.canonical).toContain(
      "/en/dashboard/analytics",
    );
    expect(accountMetadata.category).toBe("Account");
    expect(dashboardMetadata.category).toBe("Dashboard");
    expect(dashboardAnalyticsMetadata.category).toBe("Supporter analytics");
  });

  it("localizes account-route metadata in zh-HK", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    const [accountMetadata, createPasswordMetadata, resetPasswordMetadata, setupsMetadata, compareSetupsMetadata, studyPlansMetadata, dashboardMetadata, dashboardAnalyticsMetadata] =
      await Promise.all([
        generateAccountMetadata(),
        generateCreatePasswordMetadata(),
        generateResetPasswordMetadata(),
        generateSetupsMetadata(),
        generateCompareSetupsMetadata(),
        generateStudyPlansMetadata(),
        generateDashboardMetadata(),
        generateDashboardAnalyticsMetadata(),
      ]);

    expect(accountMetadata.title).toBe(zhHkMessages.AccountPage.metadata.title);
    expect(accountMetadata.description).toBe(zhHkMessages.AccountPage.metadata.description);
    expect(accountMetadata.category).toBe("帳戶");
    expect(accountMetadata.keywords).toEqual(
      expect.arrayContaining(["帳戶", "進度同步", "跨裝置進度"]),
    );
    expect(accountMetadata.alternates?.canonical).toContain("/zh-HK/account");
    expect(accountMetadata.openGraph?.locale).toBe("zh_HK");

    expect(createPasswordMetadata.title).toBe(zhHkMessages.CreatePasswordPage.metadata.title);
    expect(createPasswordMetadata.description).toBe(
      zhHkMessages.CreatePasswordPage.metadata.description,
    );
    expect(createPasswordMetadata.category).toBe("帳戶");
    expect(createPasswordMetadata.keywords).toEqual(
      expect.arrayContaining(["帳戶", "設定密碼", "電郵確認"]),
    );

    expect(resetPasswordMetadata.title).toBe(zhHkMessages.ResetPasswordPage.metadata.title);
    expect(resetPasswordMetadata.description).toBe(
      zhHkMessages.ResetPasswordPage.metadata.description,
    );
    expect(resetPasswordMetadata.category).toBe("帳戶");
    expect(resetPasswordMetadata.keywords).toEqual(
      expect.arrayContaining(["帳戶", "重設密碼", "登入"]),
    );

    expect(setupsMetadata.title).toBe(zhHkMessages.AccountSavedSetupsPage.feedbackTitle);
    expect(setupsMetadata.description).toBe(zhHkMessages.AccountSavedSetupsPage.hero.description);
    expect(setupsMetadata.category).toBe(zhHkMessages.AccountSavedSetupsPage.hero.eyebrow);
    expect(setupsMetadata.keywords).toEqual(
      expect.arrayContaining(["已儲存設定", "學習設定", "精確狀態連結"]),
    );

    expect(compareSetupsMetadata.title).toBe(
      zhHkMessages.AccountSavedCompareSetupsPage.feedbackTitle,
    );
    expect(compareSetupsMetadata.description).toBe(
      zhHkMessages.AccountSavedCompareSetupsPage.hero.description,
    );
    expect(compareSetupsMetadata.category).toBe(
      zhHkMessages.AccountSavedCompareSetupsPage.hero.eyebrow,
    );
    expect(compareSetupsMetadata.keywords).toEqual(
      expect.arrayContaining(["對比資料庫", "A/B 學習場景", "帳戶"]),
    );

    expect(studyPlansMetadata.title).toBe(zhHkMessages.AccountSavedStudyPlansPage.feedbackTitle);
    expect(studyPlansMetadata.description).toBe(
      zhHkMessages.AccountSavedStudyPlansPage.hero.description,
    );
    expect(studyPlansMetadata.category).toBe(zhHkMessages.AccountSavedStudyPlansPage.hero.eyebrow);
    expect(studyPlansMetadata.keywords).toEqual(
      expect.arrayContaining(["已儲存學習計劃", "自訂學習路線", "帳戶"]),
    );

    expect(dashboardMetadata.title).toBe(zhHkMessages.DashboardPage.metadata.title);
    expect(dashboardMetadata.description).toBe(zhHkMessages.DashboardPage.metadata.description);
    expect(dashboardMetadata.category).toBe("控制台");
    expect(dashboardMetadata.keywords).toEqual(
      expect.arrayContaining(["控制台", "帳戶", "進度"]),
    );

    expect(dashboardAnalyticsMetadata.title).toBe(
      zhHkMessages.DashboardAnalyticsPage.metadata.title,
    );
    expect(dashboardAnalyticsMetadata.description).toBe(
      zhHkMessages.DashboardAnalyticsPage.metadata.description,
    );
    expect(dashboardAnalyticsMetadata.category).toBe("支持者分析");
    expect(dashboardAnalyticsMetadata.keywords).toEqual(
      expect.arrayContaining(["學習分析", "控制台", "進度"]),
    );
  });

  it("uses locale params for locale-prefixed account wrappers", async () => {
    globalThis.__TEST_LOCALE__ = "en";

    const [accountMetadata, createPasswordMetadata, resetPasswordMetadata, setupsMetadata, compareSetupsMetadata, studyPlansMetadata, dashboardMetadata, dashboardAnalyticsMetadata] =
      await Promise.all([
        generateLocalizedAccountMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedCreatePasswordMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedResetPasswordMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedSetupsMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedCompareSetupsMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedStudyPlansMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedDashboardMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedDashboardAnalyticsMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
      ]);

    expect(accountMetadata.title).toBe(zhHkMessages.AccountPage.metadata.title);
    expect(accountMetadata.alternates?.canonical).toContain("/zh-HK/account");
    expect(accountMetadata.alternates?.languages?.en).toContain("/en/account");
    expect(accountMetadata.alternates?.languages?.["zh-HK"]).toContain("/zh-HK/account");

    expect(createPasswordMetadata.title).toBe(zhHkMessages.CreatePasswordPage.metadata.title);
    expect(createPasswordMetadata.alternates?.canonical).toContain(
      "/zh-HK/account/create-password",
    );
    expect(createPasswordMetadata.alternates?.languages?.en).toContain(
      "/en/account/create-password",
    );

    expect(resetPasswordMetadata.title).toBe(zhHkMessages.ResetPasswordPage.metadata.title);
    expect(resetPasswordMetadata.alternates?.canonical).toContain(
      "/zh-HK/account/reset-password",
    );
    expect(resetPasswordMetadata.alternates?.languages?.en).toContain(
      "/en/account/reset-password",
    );

    expect(setupsMetadata.title).toBe(zhHkMessages.AccountSavedSetupsPage.feedbackTitle);
    expect(setupsMetadata.alternates?.canonical).toContain("/zh-HK/account/setups");
    expect(setupsMetadata.alternates?.languages?.en).toContain("/en/account/setups");

    expect(compareSetupsMetadata.title).toBe(
      zhHkMessages.AccountSavedCompareSetupsPage.feedbackTitle,
    );
    expect(compareSetupsMetadata.alternates?.canonical).toContain(
      "/zh-HK/account/compare-setups",
    );
    expect(compareSetupsMetadata.alternates?.languages?.en).toContain(
      "/en/account/compare-setups",
    );

    expect(studyPlansMetadata.title).toBe(zhHkMessages.AccountSavedStudyPlansPage.feedbackTitle);
    expect(studyPlansMetadata.alternates?.canonical).toContain(
      "/zh-HK/account/study-plans",
    );
    expect(studyPlansMetadata.alternates?.languages?.en).toContain(
      "/en/account/study-plans",
    );

    expect(dashboardMetadata.title).toBe(zhHkMessages.DashboardPage.metadata.title);
    expect(dashboardMetadata.alternates?.canonical).toContain("/zh-HK/dashboard");
    expect(dashboardMetadata.alternates?.languages?.en).toContain("/en/dashboard");

    expect(dashboardAnalyticsMetadata.title).toBe(
      zhHkMessages.DashboardAnalyticsPage.metadata.title,
    );
    expect(dashboardAnalyticsMetadata.alternates?.canonical).toContain(
      "/zh-HK/dashboard/analytics",
    );
    expect(dashboardAnalyticsMetadata.alternates?.languages?.en).toContain(
      "/en/dashboard/analytics",
    );
  });
});
