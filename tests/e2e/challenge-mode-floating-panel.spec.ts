import { expect, test } from "@playwright/test";
import { gotoAndExpectOk, installBrowserGuards } from "./helpers";

function boxesOverlap(
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number },
) {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

test("keeps the full challenge section in-flow and only shows the reminder when it scrolls out of view", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  const browserGuard = await installBrowserGuards(page);

  try {
    await gotoAndExpectOk(
      page,
      "/concepts/projectile-motion?challenge=pm-ch-flat-far-shot&phase=check#challenge-mode",
    );

    const fullPanel = page.getByTestId("challenge-mode-full-panel");
    const reminder = page.getByTestId("challenge-mode-floating-panel");

    await expect(fullPanel).toBeVisible();
    await page.evaluate(() => {
      document.getElementById("challenge-mode")?.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
    });
    await expect(
      fullPanel.getByRole("button", { name: "Apply suggested start" }),
    ).toBeVisible();
    await expect(reminder).toBeHidden();

    await page.evaluate(() => {
      document.getElementById("live-bench")?.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
    });

    await expect(reminder).toBeVisible();
    await expect(reminder.getByText(/^Requirements$/)).toBeVisible();
    await expect(reminder.getByTestId("challenge-mode-reminder-item").first()).toBeVisible();
    await expect(
      reminder.getByRole("button", { name: "Apply suggested start" }),
    ).toBeHidden();
    await expect(reminder.getByRole("button", { name: "Back to setup" })).toBeHidden();
    await expect(reminder.getByText(/reach the target range\./i)).toBeHidden();

    const layout = await page.evaluate(() => {
      const reminderEl = document.querySelector('[data-testid="challenge-mode-floating-panel"]');
      const feedbackEl = Array.from(document.querySelectorAll("button")).find((el) =>
        /feedback|send feedback/i.test(el.textContent || ""),
      );
      function box(el: Element | null) {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
        };
      }
      return {
        reminder: box(reminderEl),
        feedback: box(feedbackEl ?? null),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      };
    });

    expect(layout.reminder).not.toBeNull();
    expect(layout.feedback).not.toBeNull();
    const leftGap = layout.reminder!.left;
    const rightGap = layout.viewport.width - layout.reminder!.right;
    expect(leftGap).toBeLessThan(rightGap);
    expect(boxesOverlap(layout.reminder!, layout.feedback!)).toBe(false);

    await page.evaluate(() => {
      document.getElementById("challenge-mode")?.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
    });

    await expect(fullPanel).toBeVisible();
    await expect(reminder).toBeHidden();

    await fullPanel.getByRole("button", { name: "Apply suggested start" }).click();

    await expect
      .poll(() =>
        page.evaluate(() => {
          const url = new URL(window.location.href);
          return {
            phase: url.searchParams.get("phase"),
            hash: url.hash,
          };
        }),
      )
      .toEqual({
        phase: "explore",
        hash: "#live-bench",
      });
    await expect(
      page.getByTestId("concept-learning-phase-explore"),
    ).toHaveAttribute("aria-selected", "true");

    browserGuard.assertNoActionableIssues();
  } finally {
    await context.close();
  }
});

test("keeps the floating reminder compact, bottom-anchored, and collapsible on mobile", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  const browserGuard = await installBrowserGuards(page);

  try {
    await gotoAndExpectOk(
      page,
      "/concepts/projectile-motion?challenge=pm-ch-flat-far-shot&phase=check#challenge-mode",
    );

    await page.evaluate(() => {
      document.getElementById("live-bench")?.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
    });

    const panel = page.getByTestId("challenge-mode-floating-panel");
    const anchor = page.getByTestId("challenge-mode-floating-anchor");
    const expandedToggle = page.getByRole("button", { name: "Hide tasks" });

    await expect(panel).toBeVisible();
    await expect(anchor).toHaveAttribute("style", /safe-area-inset-bottom/);
    await expect(expandedToggle).toHaveAttribute("aria-expanded", "true");
    await expect(panel.getByText(/^Requirements$/)).toBeVisible();
    await expect(panel.getByTestId("challenge-mode-reminder-item").first()).toBeVisible();
    await expect(
      panel.getByRole("button", { name: "Apply suggested start" }),
    ).toBeHidden();
    await expect(panel.getByRole("button", { name: "Back to setup" })).toBeHidden();
    await expect(panel.getByText(/reach the target range\./i)).toBeHidden();

    const expandedBox = await panel.boundingBox();
    const viewport = page.viewportSize();

    expect(expandedBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect((expandedBox?.width ?? 0)).toBeLessThan((viewport?.width ?? 0) - 8);
    expect((expandedBox?.height ?? 0)).toBeLessThan((viewport?.height ?? 0) * 0.45);
    expect((expandedBox?.y ?? 0)).toBeGreaterThan((viewport?.height ?? 0) * 0.45);
    expect((expandedBox?.y ?? 0) + (expandedBox?.height ?? 0)).toBeLessThanOrEqual(
      (viewport?.height ?? 0) + 1,
    );

    const mobileLayout = await page.evaluate(() => {
      const reminderEl = document.querySelector('[data-testid="challenge-mode-floating-panel"]');
      const feedbackEl = Array.from(document.querySelectorAll("button")).find((el) =>
        /feedback|send feedback/i.test(el.textContent || ""),
      );
      function box(el: Element | null) {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
        };
      }
      return {
        reminder: box(reminderEl),
        feedback: box(feedbackEl ?? null),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      };
    });

    expect(mobileLayout.reminder).not.toBeNull();
    expect(mobileLayout.feedback).not.toBeNull();
    const mobileLeftGap = mobileLayout.reminder!.left;
    const mobileRightGap = mobileLayout.viewport.width - mobileLayout.reminder!.right;
    expect(mobileLeftGap).toBeLessThan(mobileRightGap);
    expect(boxesOverlap(mobileLayout.reminder!, mobileLayout.feedback!)).toBe(false);

    await expandedToggle.click();

    const collapsedToggle = page.getByRole("button", { name: "Show tasks" });
    await expect(collapsedToggle).toHaveAttribute("aria-expanded", "false");
    await expect(panel.getByTestId("challenge-mode-reminder-body")).toBeHidden();

    const collapsedBox = await panel.boundingBox();
    expect((collapsedBox?.height ?? 0)).toBeLessThan((expandedBox?.height ?? 0));

    browserGuard.assertNoActionableIssues();
  } finally {
    await context.close();
  }
});
