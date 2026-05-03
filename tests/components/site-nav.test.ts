import { describe, expect, it } from "vitest";
import { footerUtilityNavItems, primaryNavItems } from "@/components/layout/site-nav";

describe("site navigation", () => {
  it("keeps Search off the crowded primary bar while preserving a secondary route link", () => {
    expect(primaryNavItems.map((item) => item.href)).toEqual([
      "/start",
      "/concepts",
      "/guided",
      "/challenges",
      "/tests",
      "/tools",
    ]);
    expect(footerUtilityNavItems.map((item) => item.href)).toContain("/search");
  });
});
