import type { AppLocale } from "@/i18n/routing";

export type AccountRouteMetadataKey =
  | "account"
  | "createPassword"
  | "resetPassword"
  | "dashboard"
  | "dashboardAnalytics"
  | "savedSetups"
  | "savedCompareSetups"
  | "savedStudyPlans";

type AccountRouteMetadataCopy = {
  keywords: string[];
  category: string;
};

const accountRouteMetadataCopy: Record<
  AppLocale,
  Record<AccountRouteMetadataKey, AccountRouteMetadataCopy>
> = {
  en: {
    account: {
      keywords: ["account", "progress sync", "cross-device progress", "supporter"],
      category: "Account",
    },
    createPassword: {
      keywords: ["account", "password setup", "email confirmation"],
      category: "Account",
    },
    resetPassword: {
      keywords: ["account", "password reset", "sign in"],
      category: "Account",
    },
    dashboard: {
      keywords: ["dashboard", "account", "supporter", "progress"],
      category: "Dashboard",
    },
    dashboardAnalytics: {
      keywords: ["analytics", "dashboard", "supporter", "progress"],
      category: "Supporter analytics",
    },
    savedSetups: {
      keywords: ["saved setups", "study setups", "exact-state links", "account"],
      category: "Account",
    },
    savedCompareSetups: {
      keywords: ["compare library", "A/B study scenes", "account"],
      category: "Account",
    },
    savedStudyPlans: {
      keywords: ["saved study plans", "custom learning paths", "account"],
      category: "Account",
    },
  },
  "zh-HK": {
    account: {
      keywords: ["帳戶", "進度同步", "跨裝置進度", "支持者方案"],
      category: "帳戶",
    },
    createPassword: {
      keywords: ["帳戶", "設定密碼", "電郵確認"],
      category: "帳戶",
    },
    resetPassword: {
      keywords: ["帳戶", "重設密碼", "登入"],
      category: "帳戶",
    },
    dashboard: {
      keywords: ["控制台", "帳戶", "支持者方案", "進度"],
      category: "控制台",
    },
    dashboardAnalytics: {
      keywords: ["學習分析", "控制台", "支持者方案", "進度"],
      category: "支持者分析",
    },
    savedSetups: {
      keywords: ["已儲存設定", "學習設定", "精確狀態連結", "帳戶"],
      category: "帳戶",
    },
    savedCompareSetups: {
      keywords: ["對比資料庫", "A/B 學習場景", "帳戶"],
      category: "帳戶",
    },
    savedStudyPlans: {
      keywords: ["已儲存學習計劃", "自訂學習路線", "帳戶"],
      category: "帳戶",
    },
  },
};

export function getAccountRouteMetadataCopy(
  locale: AppLocale,
  key: AccountRouteMetadataKey,
): AccountRouteMetadataCopy {
  return accountRouteMetadataCopy[locale]?.[key] ?? accountRouteMetadataCopy.en[key];
}
