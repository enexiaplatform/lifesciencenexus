import { expect, test } from "@playwright/test";

test("dashboard renders the app shell and heading", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(
    page.getByRole("navigation", { name: "Primary" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Dashboard", level: 1 }),
  ).toBeVisible();
});
