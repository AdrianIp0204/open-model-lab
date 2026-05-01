// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";
import { generateMetadata as generateLocalizedBillingMetadata } from "@/app/[locale]/billing/page";
import { generateMetadata as generateBillingMetadata } from "@/app/billing/page";

describe("billing route i18n metadata", () => {
  beforeEach(() => {
    globalThis.__TEST_LOCALE__ = undefined;
  });

  it("keeps English billing metadata on locale-prefixed canonicals", async () => {
    globalThis.__TEST_LOCALE__ = "en";

    const metadata = await generateBillingMetadata();

    expect(metadata.title).toBe("Billing, cancellation, and refunds");
    expect(metadata.description).toBe(
      "Plain-English billing details for the optional Open Model Lab Supporter plan, including what Supporter includes, how Stripe-hosted checkout and cancellation work, discount limits, refunds, and support.",
    );
    expect(metadata.category).toBe("billing");
    expect(metadata.keywords).toEqual(
      expect.arrayContaining([
        "Open Model Lab billing",
        "supporter billing",
        "subscription cancellation",
        "refund policy",
      ]),
    );
    expect(metadata.alternates?.canonical).toContain("/en/billing");
  });

  it("localizes billing metadata in zh-HK", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    const metadata = await generateBillingMetadata();

    expect(metadata.title).toBe("收費、取消與退款");
    expect(metadata.description).toBe(
      "以清楚文字說明可選的 Open Model Lab 支持者方案收費安排，包括支持者方案內容、Stripe 託管結帳與取消方式、折扣限制、退款政策與支援途徑。",
    );
    expect(metadata.category).toBe("收費");
    expect(metadata.keywords).toEqual(
      expect.arrayContaining([
        "Open Model Lab 收費",
        "支持者方案收費",
        "訂閱取消",
        "退款政策",
      ]),
    );
    expect(metadata.alternates?.canonical).toContain("/zh-HK/billing");
    expect(metadata.openGraph?.locale).toBe("zh_HK");
  });

  it("uses locale params for locale-prefixed billing metadata", async () => {
    globalThis.__TEST_LOCALE__ = "en";

    const metadata = await generateLocalizedBillingMetadata({
      params: Promise.resolve({ locale: "zh-HK" }),
    });

    expect(metadata.title).toBe("收費、取消與退款");
    expect(metadata.category).toBe("收費");
    expect(metadata.alternates?.canonical).toContain("/zh-HK/billing");
    expect(metadata.alternates?.languages?.en).toContain("/en/billing");
    expect(metadata.alternates?.languages?.["zh-HK"]).toContain("/zh-HK/billing");
  });
});
