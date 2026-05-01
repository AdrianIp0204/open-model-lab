import { expect, test } from "@playwright/test";
import { getPublishedConceptTestCatalog } from "@/lib/test-hub";
import { baseURL, gotoAndExpectOk, installBrowserGuards, setHarnessSession } from "./helpers";

test.describe.configure({ timeout: 600000 });

test("serves the standalone concept-test entry route across all published concept quizzes", async ({
  page,
}) => {
  test.slow();
  const catalog = getPublishedConceptTestCatalog();
  await installBrowserGuards(page);
  await setHarnessSession(page, "signed-out");

  for (const entry of catalog.entries) {
    await test.step(entry.conceptSlug, async () => {
      const response = await page.context().request.get(`${baseURL}${entry.testHref}`);
      expect(response.ok(), `${entry.testHref} returned ${response.status()}.`).toBeTruthy();
      const html = await response.text();
      expect(html).toContain(entry.title);
      expect(html).toContain("Saved on this device");
    });
  }
});

test("keeps the inline concept-page quick-test deep link stable when check phase is requested directly", async ({
  page,
}) => {
  const browserGuard = await installBrowserGuards(page);
  await setHarnessSession(page, "signed-out");

  await gotoAndExpectOk(page, "/concepts/oscillation-energy?phase=check#quick-test");
  await expect(
    page.getByRole("heading", { name: "Oscillation Energy", level: 1 }),
  ).toBeVisible();
  await expect(page.locator("#quick-test")).toBeVisible();
  await expect(page.getByTestId("quiz-question-stage")).toBeVisible();
  await expect(page.getByTestId("challenge-mode-floating-anchor")).toHaveCount(0);

  browserGuard.assertNoActionableIssues();
});
