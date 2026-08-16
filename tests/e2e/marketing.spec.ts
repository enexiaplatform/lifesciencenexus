import { expect, test } from "@playwright/test";

/**
 * Marketing surface: /pricing, /contact, legal pages, and the updated
 * landing navbar/footer chrome.
 */

test.describe("Pricing page", () => {
  test("shows the three tiers and the comparison table", async ({ page }) => {
    await page.goto("/pricing");

    await expect(
      page.getByRole("heading", {
        name: "Priced per deployment, not per seat count",
        level: 1,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Demo" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Professional" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Enterprise" }),
    ).toBeVisible();
    await expect(page.getByText("Most popular")).toBeVisible();

    // Comparison table headers are column-scoped.
    const headers = page.locator("table th");
    const count = await headers.count();
    expect(count).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < count; i += 1) {
      await expect(headers.nth(i)).toHaveAttribute("scope", "col");
    }
  });
});

test.describe("Contact page", () => {
  test("empty submit shows validation errors", async ({ page }) => {
    await page.goto("/contact");

    await page.getByRole("button", { name: "Submit request" }).click();

    await expect(
      page.getByText("Enter your full name (at least 2 characters)."),
    ).toBeVisible();
    await expect(
      page.getByText("Enter a valid work email address."),
    ).toBeVisible();
    await expect(
      page.getByText("Select the role that describes you best."),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Name" }),
    ).toHaveAttribute("aria-invalid", "true");
  });

  test("valid submit shows the success state", async ({ page }) => {
    await page.goto("/contact");

    await page.getByRole("textbox", { name: "Name" }).fill("Lan Nguyen");
    await page
      .getByRole("textbox", { name: "Work email" })
      .fill("lan.nguyen@example.com");
    await page
      .getByRole("textbox", { name: "Company" })
      .fill("Delta Pharma QC");
    await page
      .getByRole("combobox", { name: "Role" })
      .selectOption("procurement");
    await page
      .getByRole("textbox", { name: "Message" })
      .fill("We want to evaluate Nexus for our QC sourcing workflow.");
    await page.getByRole("button", { name: "Submit request" }).click();

    const status = page.getByRole("status");
    await expect(
      status.getByRole("heading", { name: "Request received" }),
    ).toBeVisible();
    // Demo mode appends an honest note about the missing lead store.
    await expect(
      status.getByText(/running in demo mode/),
    ).toBeVisible();
  });
});

test.describe("Legal pages", () => {
  test("privacy page renders its heading and TOC", async ({ page }) => {
    await page.goto("/legal/privacy");

    await expect(
      page.getByRole("heading", { name: "Privacy notice", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Table of contents" }),
    ).toBeVisible();
    await expect(page.getByText("Last updated: 2026-08-16")).toBeVisible();
  });

  test("terms page renders its heading and TOC", async ({ page }) => {
    await page.goto("/legal/terms");

    await expect(
      page.getByRole("heading", { name: "Terms of service", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Table of contents" }),
    ).toBeVisible();
  });
});

test.describe("Landing chrome", () => {
  test("navbar shows Pricing, Sign in, and Request access", async ({
    page,
  }) => {
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: "Landing" });
    await expect(nav.getByRole("link", { name: "Pricing" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(
      nav.getByRole("link", { name: "Request access" }),
    ).toBeVisible();
    await expect(nav.getByRole("link", { name: "Open demo" })).toBeVisible();

    // Section anchors resolve from any page (rooted at /).
    await expect(nav.getByRole("link", { name: "Platform" })).toHaveAttribute(
      "href",
      "/#platform",
    );
  });

  test("footer Company column links resolve to real pages", async ({
    page,
  }) => {
    await page.goto("/");

    const company = page.getByRole("navigation", { name: "Company" });
    const links = company.getByRole("link");
    const hrefs = await links.evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute("href") ?? ""),
    );
    expect(hrefs.sort()).toEqual(
      ["/contact", "/legal/privacy", "/legal/terms", "/pricing"].sort(),
    );

    const expectedHeadings: Record<string, string> = {
      "/pricing": "Priced per deployment, not per seat count",
      "/contact": "Request access",
      "/legal/privacy": "Privacy notice",
      "/legal/terms": "Terms of service",
    };
    for (const href of hrefs) {
      await page.goto(href);
      await expect(
        page.getByRole("heading", { name: expectedHeadings[href], level: 1 }),
        `${href} renders its h1 (not a 404)`,
      ).toBeVisible();
    }
  });
});
