import { expect, test } from "@playwright/test";
import { gotoAndExpectOk, installBrowserGuards } from "./helpers";

test("redirects legacy physics topic slugs to canonical topic routes", async ({ page }) => {
  const browserGuard = await installBrowserGuards(page);

  const cases = [
    {
      legacyPath: "/en/concepts/topics/oscillations-and-waves",
      canonicalPath: "/en/concepts/topics/waves",
      heading: "Waves",
    },
    {
      legacyPath: "/en/concepts/topics/resonance",
      canonicalPath: "/en/concepts/topics/oscillations",
      heading: "Oscillations",
    },
  ] as const;

  for (const routeCase of cases) {
    await gotoAndExpectOk(page, routeCase.legacyPath);
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain(routeCase.canonicalPath);
    await expect(
      page.getByRole("heading", { name: routeCase.heading, level: 1 }),
    ).toBeVisible();
  }

  browserGuard.assertNoActionableIssues();
});
