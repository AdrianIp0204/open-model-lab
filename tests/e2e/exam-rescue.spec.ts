import { expect, test } from "@playwright/test";

test("exam rescue flow diagnoses a weak topic and reaches save step", async ({ page }) => {
  await page.goto("/rescue/edexcel-ial-physics-unit-5");

  await expect(page.getByRole("heading", { name: "Unit 5 Physics Rescue" })).toBeVisible();
  await expect(page.getByText(/WPH15\/01 · Thermodynamics/)).toBeVisible();
  await page.getByRole("button", { name: "Start diagnostic" }).click();

  await expect(page.getByRole("heading", { name: "Rapid diagnosis" })).toBeVisible();
  await page.getByRole("button", { name: /Acceleration is zero because the mass has stopped/i }).click();
  await expect(page.getByText("Rescue point found")).toBeVisible();
  await expect(page.getByText(/restoring force is largest/i)).toBeVisible();
  await page.getByRole("button", { name: "Next diagnostic" }).click();

  await page.getByRole("button", { name: /It makes the peak lower and broader/i }).click();
  await page.getByRole("button", { name: "Next diagnostic" }).click();
  await page.getByRole("button", { name: /Pressure increases/i }).click();
  await page.getByRole("button", { name: "Next diagnostic" }).click();
  await page.getByRole("button", { name: /One quarter remains/i }).click();
  await page.getByRole("button", { name: "Next diagnostic" }).click();
  await page.getByRole("button", { name: /supporting expansion of the universe/i }).click();
  await page.getByRole("button", { name: "Build rescue plan" }).click();

  await expect(page.getByRole("heading", { name: "Simple harmonic motion" })).toBeVisible();
  await expect(page.getByText("Common failure")).toBeVisible();
  await page.getByRole("button", { name: "Drill this topic" }).click();

  await expect(page.getByRole("heading", { name: "Exam-style drill" })).toBeVisible();
  await page.getByRole("button", { name: "T = 2π / 4.0" }).click();
  await page.getByRole("button", { name: "Save rescue state" }).click();

  await expect(page.getByRole("heading", { name: "Keep the rescue plan." })).toBeVisible();
  await page.getByRole("button", { name: "Save locally" }).click();
  await expect(page.getByRole("button", { name: "Saved locally" })).toBeVisible();
});
