import { expect, test } from "@playwright/test";

/**
 * Landing page (public, standalone chrome — no app sidebar).
 * Covers hero content, section structure, skip-link behavior, the mobile
 * menu disclosure, and page console hygiene.
 */

test.describe("Landing page", () => {
  test("hero renders the h1 and both CTAs", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "The intelligence graph for life-science markets.",
        level: 1,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open demo workspace" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Explore the docs" }),
    ).toBeVisible();

    // Exactly one h1 on the page.
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  });

  test("navbar CTA navigates to the demo workspace", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Landing" });
    await nav.getByRole("link", { name: "Open demo workspace" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Dashboard", level: 1 }),
    ).toBeVisible();
  });

  test("all major sections are present by accessible heading", async ({
    page,
  }) => {
    await page.goto("/");

    const headings = [
      "Market knowledge lives in spreadsheets",
      "Four layers, structurally separated",
      "Six workflows in the demo workspace",
      "Derived intelligence, labeled as derived",
      "Nothing is presented as fact without evidence",
      "One factual substrate, three products",
      "Tenancy and data governance",
      "Explore the demo workspace",
    ];
    for (const name of headings) {
      await expect(
        page.getByRole("heading", { name }),
        `section heading "${name}"`,
      ).toBeVisible();
    }

    // Semantic landmarks.
    await expect(page.locator("main#main-content")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
  });

  test("skip link is the first tab stop and targets the main content", async ({
    page,
  }) => {
    await page.goto("/");
    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toHaveAttribute("href", "#main-content");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main-content$/);
    await expect(page.locator("main#main-content")).toBeVisible();
  });

  test("mobile menu disclosure opens at small viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto("/");

    const toggle = page.getByRole("button", { name: "Open menu" });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();

    const menuButton = page.getByRole("button", { name: "Close menu" });
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    const menu = page.locator("#landing-mobile-menu");
    await expect(menu).toBeVisible();
    await expect(
      menu.getByRole("link", { name: "Platform" }),
    ).toBeVisible();
    await expect(
      menu.getByRole("link", { name: "Open demo workspace" }),
    ).toBeVisible();

    // Selecting a link closes the disclosure.
    await menu.getByRole("link", { name: "Platform" }).click();
    await expect(menu).toBeHidden();
  });

  test("page loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/");
    // Give async effects a chance to fire.
    await page.waitForLoadState("networkidle");

    expect(errors, "landing page emitted console errors").toEqual([]);
  });
});
