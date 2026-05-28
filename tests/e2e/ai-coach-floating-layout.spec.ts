import { expect, test, type Locator } from "@playwright/test";
import {
  gotoAndExpectOk,
  installBrowserGuards,
  setHarnessSession,
} from "./helpers";

type Box = NonNullable<Awaited<ReturnType<Locator["boundingBox"]>>>;

type ConceptHelperLayoutCase = {
  name: string;
  path: string;
  viewport: {
    width: number;
    height: number;
  };
};

const conceptHelperLayoutCases: ConceptHelperLayoutCase[] = [
  {
    name: "desktop SHM",
    path: "/en/concepts/simple-harmonic-motion",
    viewport: { width: 1440, height: 900 },
  },
  {
    name: "tablet SHM",
    path: "/en/concepts/simple-harmonic-motion",
    viewport: { width: 1024, height: 768 },
  },
  {
    name: "phone SHM",
    path: "/en/concepts/simple-harmonic-motion",
    viewport: { width: 390, height: 844 },
  },
  {
    name: "phone electric fields",
    path: "/en/concepts/electric-fields",
    viewport: { width: 390, height: 844 },
  },
];

function boxesOverlap(left: Box, right: Box) {
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  );
}

async function expectLocatorClearOfProtectedZone(
  protectedZone: Locator,
  locator: Locator,
) {
  const protectedBox = await protectedZone.boundingBox();
  const locatorBox = await locator.boundingBox();

  expect(protectedBox).not.toBeNull();
  expect(locatorBox).not.toBeNull();
  expect(boxesOverlap(protectedBox!, locatorBox!)).toBe(false);
}

for (const layoutCase of conceptHelperLayoutCases) {
  test(`concept helper controls stay clear of protected live lab on ${layoutCase.name}`, async ({
    page,
  }) => {
    const browserGuard = await installBrowserGuards(page);

    await page.setViewportSize(layoutCase.viewport);
    await setHarnessSession(page, "signed-in-premium");
    await gotoAndExpectOk(page, layoutCase.path);

    const protectedZone = page.locator(
      '[data-protected-learning-zone="concept-live-lab"]',
    );
    const aiTrigger = page.getByTestId("ai-learning-coach-trigger");
    const feedbackTrigger = page.getByTestId("feedback-widget-trigger");

    await expect(protectedZone).toBeVisible();
    await expect(aiTrigger).toBeVisible();
    await expect(feedbackTrigger).toBeVisible();

    await expectLocatorClearOfProtectedZone(protectedZone, aiTrigger);
    await expectLocatorClearOfProtectedZone(protectedZone, feedbackTrigger);

    await aiTrigger.click();
    await expect(page.getByTestId("ai-learning-coach-panel")).toBeVisible();
    await expectLocatorClearOfProtectedZone(
      protectedZone,
      page.getByTestId("ai-learning-coach-panel"),
    );

    browserGuard.assertNoActionableIssues();
  });
}
