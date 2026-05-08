import { expect, test } from "@playwright/test";

test("SHM arena lets a learner answer, reveal feedback, and clear level 1", async ({
  page,
}) => {
  await page.goto("/arena/shm");

  await expect(page.getByRole("heading", { name: "SHM Arena" })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "The amplitude stays fixed, but angular frequency increases. What changes first?",
    }),
  ).toBeVisible();

  await expect(page.getByRole("button", { name: "Choose an answer" })).toBeDisabled();

  const correctAnswers = [
    /cycles faster while the turning points stay put/i,
    /wider turning points, but the period stays the same/i,
    /velocity is zero, acceleration points inward/i,
    /speed is maximum/i,
    /Graph B/i,
  ];

  for (const [index, answerName] of correctAnswers.entries()) {
    await page.getByRole("button", { name: answerName }).click();
    await expect(page.getByText("Correct", { exact: true })).toBeVisible();

    if (index < correctAnswers.length - 1) {
      await page.getByRole("button", { name: "Next card" }).click();
    } else {
      await page.getByRole("button", { name: "Finish level" }).click();
    }
  }

  await expect(page.getByRole("heading", { name: "Level 1 cleared" })).toBeVisible();
  await expect(page.getByText("+10")).toBeVisible();
  await expect(page.getByRole("button", { name: "Unlock next level" })).toBeVisible();
});
