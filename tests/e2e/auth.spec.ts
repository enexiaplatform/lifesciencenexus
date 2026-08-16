import { expect, test } from "@playwright/test";

/**
 * Auth pages in demo mode (no Supabase env vars configured in this
 * environment): each auth route renders the "Demo deployment" notice instead
 * of a form, and the workspace stays open without a login redirect.
 */

const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password"];

test.describe("Auth pages (demo mode)", () => {
  for (const path of AUTH_PAGES) {
    test(`${path} renders the demo deployment notice`, async ({ page }) => {
      await page.goto(path);

      await expect(
        page.getByRole("heading", { name: "Demo deployment", level: 1 }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Open demo workspace" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Back to home" }),
      ).toBeVisible();
    });
  }

  test("demo notice links to the workspace", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Open demo workspace" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Dashboard", level: 1 }),
    ).toBeVisible();
  });

  test("workspace routes render without a login redirect in demo mode", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Dashboard", level: 1 }),
    ).toBeVisible();
  });
});
