import { expect, test, type Locator } from "@playwright/test";

/**
 * Accessibility smoke suite — what Playwright can verify automatically:
 * keyboard reachability (skip link, primary nav), dialog focus management
 * (trap, initial focus, Escape), accessible names on form controls, and
 * table header semantics. Contrast checking stays manual (out of scope).
 */

/** True when the currently focused element is inside `locator`. */
async function focusIsInside(locator: Locator): Promise<boolean> {
  return locator.evaluate((root) => root.contains(document.activeElement));
}

test.describe("Keyboard navigation", () => {
  test("skip link is the first tab stop and targets the main content", async ({ page }) => {
    await page.goto("/dashboard");
    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible(); // becomes visible on focus
    await expect(skipLink).toHaveAttribute("href", "#main-content");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main-content$/);
    await expect(page.locator("main#main-content")).toBeVisible();
  });

  test("primary nav is keyboard reachable and every link has an accessible name", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    const nav = page.getByRole("navigation", { name: "Primary" });

    // Tab from the top of the page until focus lands inside the primary nav.
    let reached = false;
    for (let i = 0; i < 30 && !reached; i += 1) {
      await page.keyboard.press("Tab");
      reached = await focusIsInside(nav);
    }
    expect(reached, "primary nav should be reachable by keyboard").toBe(true);

    // Every nav link exposes a non-empty accessible name.
    const links = nav.getByRole("link");
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      const name = await links.nth(i).getAttribute("aria-label") ?? (await links.nth(i).textContent());
      expect((name ?? "").trim().length, `nav link ${i} needs an accessible name`).toBeGreaterThan(0);
    }
  });
});

test.describe("Dialog focus management", () => {
  const dialogs: Array<{
    name: string;
    path: string;
    trigger: string;
    title: string;
  }> = [
    {
      name: "create organization",
      path: "/organizations",
      trigger: "Create organization",
      title: "Create organization",
    },
    { name: "add source", path: "/sources", trigger: "Add source", title: "Add source" },
    {
      name: "record price",
      path: "/prices",
      trigger: "Record price",
      title: "Record a price observation",
    },
    {
      name: "add to research project",
      path: "/skus/sku-tsa-500",
      trigger: "Add to research project",
      title: "Add to research project",
    },
    {
      name: "memoire handoff",
      path: "/skus/sku-tsa-500",
      trigger: "Send to Memoire",
      title: "Send to Memoire",
    },
  ];

  for (const { name, path, trigger, title } of dialogs) {
    test(`${name} dialog traps focus and closes on Escape`, async ({ page }) => {
      await page.goto(path);
      await page.getByRole("button", { name: trigger }).first().click();
      const dialog = page.getByRole("dialog", { name: title });
      await expect(dialog).toBeVisible();

      // Focus starts inside the dialog.
      expect(await focusIsInside(dialog), "initial focus should be inside the dialog").toBe(true);

      // Tab cycling never leaves the dialog.
      for (let i = 0; i < 12; i += 1) {
        await page.keyboard.press("Tab");
        expect(await focusIsInside(dialog), `Tab ${i + 1} escaped the dialog`).toBe(true);
      }
      for (let i = 0; i < 6; i += 1) {
        await page.keyboard.press("Shift+Tab");
        expect(await focusIsInside(dialog), `Shift+Tab ${i + 1} escaped the dialog`).toBe(true);
      }

      // Escape closes it.
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    });
  }
});

test.describe("Form control accessible names", () => {
  /** Every visible input/select/textarea must have a label, aria-label or wrapping <label>. */
  async function expectAllControlsNamed(region: Locator) {
    const nameless = await region
      .locator("input, select, textarea")
      .evaluateAll((elements) =>
        elements
          .filter((el) => {
            const input = el as HTMLInputElement;
            if (input.type === "hidden") return false;
            // Off-screen, aria-hidden controls (e.g. Radix Select's native
            // <select> used for form submission) are hidden from AT by design.
            if (el.getAttribute("aria-hidden") === "true") return false;
            if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return false;
            if (el.id && document.querySelector(`label[for="${el.id}"]`)) return false;
            if (el.closest("label")) return false;
            return true;
          })
          .map((el) => el.outerHTML.slice(0, 120)),
      );
    expect(nameless, "controls without an accessible name").toEqual([]);
  }

  test("create organization dialog inputs are named", async ({ page }) => {
    await page.goto("/organizations");
    await page.getByRole("button", { name: "Create organization" }).click();
    const dialog = page.getByRole("dialog", { name: "Create organization" });
    await expect(dialog.getByRole("textbox", { name: "Name" })).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: /Country/ })).toBeVisible();
    await expect(dialog.getByRole("checkbox", { name: "Distributor" })).toBeVisible();
    await expectAllControlsNamed(dialog);
  });

  test("add source dialog inputs are named", async ({ page }) => {
    await page.goto("/sources");
    await page.getByRole("button", { name: "Add source" }).click();
    const dialog = page.getByRole("dialog", { name: "Add source" });
    await expect(dialog.getByLabel("Title")).toBeVisible();
    await expect(dialog.getByLabel("Source type")).toBeVisible();
    await expectAllControlsNamed(dialog);
  });

  test("record price dialog inputs are named", async ({ page }) => {
    await page.goto("/prices");
    await page.getByRole("button", { name: "Record price" }).click();
    const dialog = page.getByRole("dialog", { name: "Record a price observation" });
    await expect(dialog.getByRole("spinbutton", { name: "Amount *" })).toBeVisible();
    await expect(dialog.getByLabel(/Observation date/)).toBeVisible();
    await expectAllControlsNamed(dialog);
  });
});

test.describe("Table semantics", () => {
  const pages = [
    "/organizations",
    "/skus/sku-tsa-500",
    "/equivalence",
    "/tenders/tender-rrh-2025-014",
    "/sources",
  ];

  for (const path of pages) {
    test(`${path} tables have th elements with scope`, async ({ page }) => {
      await page.goto(path);
      const tables = page.locator("table");
      const tableCount = await tables.count();
      expect(tableCount, `${path} should render at least one table`).toBeGreaterThan(0);
      for (let i = 0; i < tableCount; i += 1) {
        const headers = tables.nth(i).locator("th");
        const headerCount = await headers.count();
        expect(headerCount, `table ${i} on ${path} has no th`).toBeGreaterThan(0);
        for (let j = 0; j < headerCount; j += 1) {
          await expect(
            headers.nth(j),
            `th ${j} of table ${i} on ${path} is missing scope`,
          ).toHaveAttribute("scope", /^(col|row|colgroup|rowgroup)$/);
        }
      }
    });
  }
});
