import { expect, type Page, test } from "@playwright/test";
import { getConceptBySlug } from "@/lib/content";
import { buildConceptSimulationStateHref } from "@/lib/share-links";
import { DISCLOSURE_COMPARE_CASES } from "../helpers/concept-disclosure-fixtures";
import { gotoAndExpectOk } from "./helpers";

async function expectExploreCompareOnly(page: Page) {
  const interactionTabs = page.getByRole("tablist", { name: "Concept interaction modes" });

  await expect(interactionTabs.getByRole("tab", { name: "Explore" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(interactionTabs.getByRole("tab", { name: "Compare" })).toHaveAttribute(
    "aria-selected",
    "false",
  );
  await expect(interactionTabs.getByRole("tab", { name: "Predict" })).toHaveCount(0);
  await expect(page.getByTestId("control-panel-compare-tools")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Compare mode$/i })).toHaveCount(0);

  return interactionTabs;
}

async function enterCompareFromBench(page: Page) {
  const interactionTabs = await expectExploreCompareOnly(page);

  await interactionTabs.getByRole("tab", { name: "Compare" }).click();
  await expect(interactionTabs.getByRole("tab", { name: "Explore" })).toHaveAttribute(
    "aria-selected",
    "false",
  );
  await expect(interactionTabs.getByRole("tab", { name: "Compare" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  const compareTools = page.getByTestId("control-panel-compare-tools");
  await expect(compareTools).toContainText("Editing Setup");
  await expect(page.getByRole("button", { name: /^Compare mode$/i })).toHaveCount(0);

  return compareTools;
}

test.describe("concept compare controls", () => {
  test("graph-transformations keeps compare tools bench-local with no lower preview", async ({
    page,
  }) => {
    await gotoAndExpectOk(page, "/concepts/graph-transformations");
    await expect(page.getByRole("heading", { name: "Graph Transformations" })).toBeVisible();

    const compareTools = await enterCompareFromBench(page);

    await expect(compareTools).toContainText("Editing Setup");
    await expect(compareTools.getByRole("tab", { name: /Setup.*A/i })).toBeVisible();
    await expect(compareTools.getByRole("tab", { name: /Setup.*B/i })).toBeVisible();
    await expect(compareTools.getByRole("button", { name: "Reset variant" })).toBeVisible();
    await expect(compareTools.getByRole("button", { name: "Swap setups" })).toBeVisible();
    await expect(compareTools.getByRole("button", { name: "Exit compare mode" })).toBeVisible();

    await expect(page.getByTestId("compare-observation-panel")).toHaveCount(0);
    await expect(page.getByTestId("compare-support-panel")).toContainText("Saved compare setups");
    await expect(page.locator('[data-testid="simulation-shell-guides"] > *')).toHaveCount(0);
  });

  test("bench-side compare controls edit the active setup on simple harmonic motion", async ({
    page,
  }) => {
    await gotoAndExpectOk(page, "/concepts/simple-harmonic-motion");

    const controls = page.getByTestId("simulation-shell-controls");
    const amplitudeSlider = controls.getByRole("slider", { name: "Amplitude" });
    const initialAmplitude = await amplitudeSlider.inputValue();

    const compareTools = await enterCompareFromBench(page);

    await amplitudeSlider.fill("2");
    await expect(amplitudeSlider).toHaveValue("2");

    await compareTools.getByRole("tab", { name: /Setup.*A/i }).click();
    await expect(amplitudeSlider).toHaveValue(initialAmplitude);

    await compareTools.getByRole("tab", { name: /Setup.*B/i }).click();
    await expect(amplitudeSlider).toHaveValue("2");

    await compareTools.getByRole("button", { name: "Exit compare mode" }).click();
    await expect(page.getByTestId("control-panel-compare-tools")).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Explore" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  for (const sample of DISCLOSURE_COMPARE_CASES) {
    test(`keeps compare mode anchored on the main bench for ${sample.slug}`, async ({ page }) => {
      await gotoAndExpectOk(page, `/concepts/${sample.slug}`);

      const compareTools = await enterCompareFromBench(page);

      await expect(compareTools).toContainText("Editing Setup");
      await expect(page.getByTestId("compare-support-panel")).toContainText("Saved compare setups");
      await expect(page.getByTestId("compare-observation-panel")).toHaveCount(0);
    });
  }

  test("bench-side compare controls stay usable on mobile without the old lower preview", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();

    try {
      await gotoAndExpectOk(page, "/concepts/graph-transformations");
      const compareTools = await enterCompareFromBench(page);

      await expect(compareTools).toContainText("Editing Setup");
      const box = await compareTools.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeLessThan(844 * 2.25);
      await expect(
        page.getByTestId("simulation-shell-controls").getByTestId("control-panel-compare-tools"),
      ).toContainText("Editing Setup");
      await expect(page.getByTestId("compare-observation-panel")).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test("restored compare state selects the correct bench-local setup and keeps the lower preview removed", async ({
    page,
  }) => {
    const concept = getConceptBySlug("graph-transformations");
    const href = buildConceptSimulationStateHref({
      source: {
        slug: concept.slug,
        simulation: {
          defaults: concept.simulation.defaults,
          presets: concept.simulation.presets,
          graphs: concept.graphs,
          overlays: concept.simulation.overlays,
        },
      },
      conceptSlug: concept.slug,
      state: {
        params: {
          ...concept.simulation.defaults,
          verticalScale: -1.6,
        },
        activePresetId: null,
        activeGraphId: "vertex-height-map",
        overlayValues: {
          referenceCurve: true,
          vertexMarkers: true,
          shiftGuide: true,
        },
        focusedOverlayId: "shiftGuide",
        time: 0,
        timeSource: "live",
        compare: {
          activeTarget: "b",
          setupA: {
            label: "Baseline",
            params: { ...concept.simulation.defaults },
            activePresetId: null,
          },
          setupB: {
            label: "Variant",
            params: {
              ...concept.simulation.defaults,
              verticalScale: -1.6,
            },
            activePresetId: null,
          },
        },
      },
    });

    await gotoAndExpectOk(page, href);
    await expect(page.getByRole("tab", { name: "Compare" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const compareTools = page.getByTestId("control-panel-compare-tools");

    await expect(compareTools.getByRole("tab", { name: /Setup.*B/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByTestId("compare-observation-panel")).toHaveCount(0);
  });
});
