// @vitest-environment node

import type { Metadata } from "next";
import { beforeEach, describe, expect, it } from "vitest";
import { generateMetadata as generateAuthorPreviewMetadata } from "@/app/author-preview/page";
import { generateMetadata as generateAuthorPreviewConceptMetadata } from "@/app/author-preview/concepts/[slug]/page";
import { buildAccountMetadata } from "@/app/account/AccountRoute";
import { buildCreatePasswordMetadata } from "@/app/account/create-password/page";
import { buildResetPasswordMetadata } from "@/app/account/reset-password/page";
import { buildSavedSetupsMetadata } from "@/app/account/setups/page";
import { buildSavedCompareSetupsMetadata } from "@/app/account/compare-setups/page";
import { buildSavedStudyPlansMetadata } from "@/app/account/study-plans/page";
import { buildDashboardMetadata } from "@/app/dashboard/DashboardRoute";
import { buildDashboardAnalyticsMetadata } from "@/app/dashboard/analytics/DashboardAnalyticsRoute";
import { metadata as authCallbackMetadata } from "@/app/auth/callback/page";
import { metadata as debugMetadata } from "@/app/debug/page";
import { metadata as devAccountHarnessMetadata } from "@/app/dev/account-harness/page";

function expectNoIndex(metadata: Metadata) {
  expect(metadata.robots).toEqual({
    index: false,
    follow: false,
  });
}

describe("private route metadata", () => {
  beforeEach(() => {
    globalThis.__TEST_LOCALE__ = undefined;
  });

  it("keeps account and dashboard HTML routes out of search indexes", async () => {
    expectNoIndex(await buildAccountMetadata("en"));
    expectNoIndex(await buildCreatePasswordMetadata("en"));
    expectNoIndex(await buildResetPasswordMetadata("en"));
    expectNoIndex(await buildSavedSetupsMetadata("en"));
    expectNoIndex(await buildSavedCompareSetupsMetadata("en"));
    expectNoIndex(await buildSavedStudyPlansMetadata("en"));
    expectNoIndex(await buildDashboardMetadata("en"));
    expectNoIndex(await buildDashboardAnalyticsMetadata("en"));
  });

  it("keeps HTML-only auth and dev routes out of search indexes", async () => {
    expectNoIndex(authCallbackMetadata);
    expectNoIndex(devAccountHarnessMetadata);
    expectNoIndex(debugMetadata);
    expectNoIndex(await generateAuthorPreviewMetadata());
    expectNoIndex(await generateAuthorPreviewConceptMetadata());
  });

  it("keeps locale-prefixed private wrappers on shared noindex metadata", async () => {
    const { generateMetadata: generateLocalizedAccountMetadata } = await import(
      "@/app/[locale]/account/page"
    );
    const { generateMetadata: generateLocalizedCreatePasswordMetadata } = await import(
      "@/app/[locale]/account/create-password/page"
    );
    const { generateMetadata: generateLocalizedResetPasswordMetadata } = await import(
      "@/app/[locale]/account/reset-password/page"
    );
    const { generateMetadata: generateLocalizedSavedSetupsMetadata } = await import(
      "@/app/[locale]/account/setups/page"
    );
    const { generateMetadata: generateLocalizedSavedCompareSetupsMetadata } = await import(
      "@/app/[locale]/account/compare-setups/page"
    );
    const { generateMetadata: generateLocalizedSavedStudyPlansMetadata } = await import(
      "@/app/[locale]/account/study-plans/page"
    );
    const { generateMetadata: generateLocalizedDashboardMetadata } = await import(
      "@/app/[locale]/dashboard/page"
    );
    const { generateMetadata: generateLocalizedDashboardAnalyticsMetadata } = await import(
      "@/app/[locale]/dashboard/analytics/page"
    );
    const { metadata: localizedDevHarnessMetadata } = await import(
      "@/app/[locale]/dev/account-harness/page"
    );

    const localeParams = () => Promise.resolve({ locale: "zh-HK" });

    expectNoIndex(await generateLocalizedAccountMetadata({ params: localeParams() }));
    expectNoIndex(await generateLocalizedCreatePasswordMetadata({ params: localeParams() }));
    expectNoIndex(await generateLocalizedResetPasswordMetadata({ params: localeParams() }));
    expectNoIndex(await generateLocalizedSavedSetupsMetadata({ params: localeParams() }));
    expectNoIndex(await generateLocalizedSavedCompareSetupsMetadata({ params: localeParams() }));
    expectNoIndex(await generateLocalizedSavedStudyPlansMetadata({ params: localeParams() }));
    expectNoIndex(await generateLocalizedDashboardMetadata({ params: localeParams() }));
    expectNoIndex(await generateLocalizedDashboardAnalyticsMetadata({ params: localeParams() }));
    expectNoIndex(localizedDevHarnessMetadata);
  });
});
