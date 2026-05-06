import { expect, test, type Locator } from "@playwright/test";
import {
  gotoAndExpectOk,
  installBrowserGuards,
  setHarnessSession,
} from "./helpers";

type Box = NonNullable<Awaited<ReturnType<Locator["boundingBox"]>>>;

function boxesOverlap(left: Box, right: Box) {
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  );
}

test("floating AI coach stays clear of desktop bench controls and feedback", async ({
  page,
}) => {
  const browserGuard = await installBrowserGuards(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/ai/coach", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        action: "Try increasing radius once while keeping speed fixed.",
        observe: "Watch whether the acceleration readout changes.",
        question: "What do you predict will happen to the acceleration arrow?",
        citations: [{ type: "simulation", label: "radius control" }],
      }),
    });
  });

  await setHarnessSession(page, "signed-in-premium");
  await gotoAndExpectOk(page, "/en/concepts/uniform-circular-motion");

  const aiTrigger = page.getByTestId("ai-learning-coach-trigger");
  const feedbackTrigger = page.getByRole("button", { name: "Feedback" });

  await expect(aiTrigger).toBeVisible();
  await expect(feedbackTrigger).toBeVisible();

  const aiTriggerBox = await aiTrigger.boundingBox();
  const feedbackTriggerBox = await feedbackTrigger.boundingBox();

  expect(aiTriggerBox).not.toBeNull();
  expect(feedbackTriggerBox).not.toBeNull();
  expect(boxesOverlap(aiTriggerBox!, feedbackTriggerBox!)).toBe(false);

  await aiTrigger.click();

  const panel = page.getByTestId("ai-learning-coach-panel");
  const controls = page.getByTestId("simulation-shell-controls");

  await expect(panel).toBeVisible();
  await expect(controls).toBeVisible();

  const panelBox = await panel.boundingBox();
  const controlsBox = await controls.boundingBox();

  expect(panelBox).not.toBeNull();
  expect(controlsBox).not.toBeNull();
  expect(boxesOverlap(panelBox!, controlsBox!)).toBe(false);

  browserGuard.assertNoActionableIssues();
});
