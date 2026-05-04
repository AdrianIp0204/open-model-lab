import { describe, expect, it } from "vitest";
import { footerUtilityNavItems, primaryNavItems } from "@/components/layout/site-nav";

describe("site navigation", () => {
  it("keeps Start and Search off the crowded primary bar while preserving secondary route links", () => {
    expect(primaryNavItems.map((item) => item.href)).toEqual([
      "/concepts",
      "/guided",
      "/challenges",
      "/tests",
      "/tools",
    ]);
    expect(footerUtilityNavItems.map((item) => item.href)).toContain("/search");
  });
});
