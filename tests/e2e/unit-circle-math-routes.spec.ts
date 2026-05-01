import { expect, test } from "@playwright/test";
import {
  gotoAndExpectOk,
  installBrowserGuards,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

let browserGuard: BrowserGuard;

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("renders the unit-circle bench with projections and linked traces, and resolves the adjacent math routes", async ({
  page,
}) => {
  await setHarnessSession(page, "signed-out");

  await gotoAndExpectOk(page, "/concepts/unit-circle-sine-cosine-from-rotation");
  await expect(
    page.getByRole("heading", { name: "Unit Circle / Sine and Cosine from Rotation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", {
      name: "Unit Circle / Sine and Cosine from Rotation interactive lab and controls",
    }),
  ).toBeVisible();
  await expect(page.getByText("Unit circle rotation")).toBeVisible();
  await expect(page.getByText("Drag the point or use the phase slider")).toBeVisible();
  await expect(page.getByText("Projection link")).toBeVisible();
  await expect(
    page.getByText(
      "One graph shows cosine and sine changing together over time, and a second graph shows the same angle increasing over time.",
    ),
  ).toBeVisible();
  await expect(page.locator("[aria-label='Draggable unit circle point']")).toBeVisible();

  await gotoAndExpectOk(page, "/concepts/polar-coordinates-radius-and-angle");
  await expect(
    page.getByRole("heading", { name: "Polar Coordinates / Radius and Angle" }),
  ).toBeVisible();
  await expect(page.getByText("Polar coordinates on the plane")).toBeVisible();

  await gotoAndExpectOk(page, "/concepts/limits-and-continuity-approaching-a-value");
  await expect(
    page.getByRole("heading", { name: "Limits and Continuity / Approaching a Value" }),
  ).toBeVisible();
  await expect(page.getByText("Limits and continuity")).toBeVisible();

  await gotoAndExpectOk(page, "/concepts/optimization-maxima-minima-and-constraints");
  await expect(
    page.getByRole("heading", { name: "Optimization / Maxima, Minima, and Constraints" }),
  ).toBeVisible();
  await expect(page.getByText("Optimization under constraints")).toBeVisible();
  await expect(page.getByText("best square")).toBeVisible();
});
