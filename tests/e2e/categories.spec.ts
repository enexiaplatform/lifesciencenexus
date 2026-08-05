import { expect, test } from "@playwright/test";

/**
 * Category browse flow: a buyer who knows the product TYPE ("closed sterility
 * testing system") but not a brand lands on the category shelf, sees brands
 * and models side by side, and gets selection guidance.
 */

const CATEGORY_ID = "sterility_testing_equipment";

test.describe("G. Browse a category to choose a model", () => {
  test("search → category card → shelf with brands, models and consumables", async ({ page }) => {
    test.setTimeout(60_000); // cold dev-server compiles of /search and /categories

    // 1. Search with a buyer phrase (no brand, no catalogue number).
    await page.goto("/search");
    const searchBox = page.getByRole("combobox", { name: "Search the Nexus graph" });
    await searchBox.fill("closed sterility testing system");
    await expect(
      page.getByText(/results? for “closed sterility testing system”/),
    ).toBeVisible({ timeout: 20_000 });

    // 2. A category match card appears above the entity results.
    const categories = page.locator('section[aria-label="Matching categories"]');
    await expect(categories).toBeVisible();
    const categoryLink = categories.getByRole("link", { name: /Sterility testing equipment/ });
    await expect(categoryLink).toBeVisible();
    await expect(categoryLink.getByText(/category match: closed sterility testing system/)).toBeVisible();
    await categoryLink.click();

    // 3. The shelf page renders both brands with their models.
    await page.waitForURL(`**/categories/${CATEGORY_ID}`);
    await expect(
      page.getByRole("heading", { name: "Sterility testing equipment" }),
    ).toBeVisible();
    await expect(page.getByText("How to choose in this category")).toBeVisible();

    const condorSection = page.locator('section[aria-label="Condor Steri (Demo)"]');
    await expect(condorSection).toBeVisible();
    await expect(
      condorSection.getByRole("link", { name: "SteriTest ST-200 closed sterility testing system (Demo)" }),
    ).toBeVisible();
    await expect(condorSection.getByText("CLW-ST200")).toBeVisible();
    await expect(condorSection.getByText("185,000,000")).toBeVisible();

    const meridianSection = page.locator('section[aria-label="SteriPump (Demo)"]');
    await expect(meridianSection).toBeVisible();
    await expect(
      meridianSection.getByRole("link", { name: "SteriPump SP-3000 closed sterility testing system (Demo)" }),
    ).toBeVisible();
    await expect(meridianSection.getByText("MLS-SP3000")).toBeVisible();

    // Standards coverage helps the shortlist decision.
    await expect(condorSection.getByText("USP 71").first()).toBeVisible();

    // Compatible consumables anchor the closed-system choice.
    const consumables = page.getByText("Compatible consumables");
    await expect(consumables.first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: "SteriCan canisters 10/box (Demo)" }).first(),
    ).toBeVisible();

    // 4. Deep link into the comparison workspace is offered.
    await expect(
      page.getByRole("link", { name: "Open the side-by-side comparison" }),
    ).toBeVisible();
  });

  test("categories index lists shelves with product and brand counts", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.getByRole("heading", { name: "Product categories" })).toBeVisible();
    const shelf = page.getByRole("link", { name: /Sterility testing equipment/ });
    await expect(shelf).toBeVisible();
    await expect(shelf.getByText(/2 products · 2 brands/)).toBeVisible();
    // The biological indicators shelf was empty before this data wave.
    await expect(
      page.getByRole("link", { name: /Biological indicators/ }).getByText(/2 products · 2 brands/),
    ).toBeVisible();
    // The shelf-completion wave: every previously single-brand or empty shelf
    // now offers a two-brand choice.
    for (const name of [
      /Sterility testing consumables/,
      /Environmental monitoring consumables/,
      /Microbial reference materials/,
      /Microbiology lab accessories/,
    ]) {
      await expect(
        page.getByRole("link", { name }).getByText(/2 products · 2 brands/),
      ).toBeVisible();
    }
    await shelf.click();
    await page.waitForURL(`**/categories/${CATEGORY_ID}`);
  });

  test("air samplers shelf contrasts two brands and their plate ecosystems", async ({ page }) => {
    await page.goto("/categories/air_samplers");

    await expect(page.getByRole("heading", { name: "Air samplers" })).toBeVisible();
    await expect(page.getByText("How to choose in this category")).toBeVisible();

    // Condor AS-100 (proprietary contact plates) vs Meridian AG-90 (open 90 mm).
    const condorSection = page.locator('section[aria-label="Condor Air (Demo)"]');
    await expect(condorSection).toBeVisible();
    await expect(
      condorSection.getByRole("link", { name: "Condor AirSampler AS-100 (Demo)" }),
    ).toBeVisible();
    await expect(
      condorSection.getByRole("link", { name: "AS-100 contact plates ready 20/pack (Demo)" }),
    ).toBeVisible();

    const meridianSection = page.locator('section[aria-label="Meridian Air (Demo)"]');
    await expect(meridianSection).toBeVisible();
    await expect(
      meridianSection.getByRole("link", { name: "AirGuard AG-90 microbial air sampler (Demo)" }),
    ).toBeVisible();
    await expect(meridianSection.getByText("78,000,000")).toBeVisible();
    // Open system: compatible with standard 90 mm plates from other brands.
    await expect(
      meridianSection.getByRole("link", { name: "TSA ready plates 90 mm 20/pack (Demo)" }),
    ).toBeVisible();
  });

  test("biological indicators shelf shows both indicator types with ISO 11138 coverage", async ({ page }) => {
    await page.goto("/categories/biological_indicators");

    await expect(page.getByRole("heading", { name: "Biological indicators" })).toBeVisible();
    const deltaSection = page.locator('section[aria-label="DeltaBio (Demo)"]');
    await expect(
      deltaSection.getByRole("link", { name: "DeltaSeed G. stearothermophilus spore strips (Demo)" }),
    ).toBeVisible();
    await expect(deltaSection.getByText("ISO 11138-1").first()).toBeVisible();

    const steriSureSection = page.locator('section[aria-label="SteriSure (Demo)"]');
    await expect(
      steriSureSection.getByRole("link", { name: "SteriSure self-contained BI ampoules (Demo)" }),
    ).toBeVisible();
  });

  test("searching 'LAL' leads to the endotoxin shelf with rFC vs LAL choice", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/search");
    const searchBox = page.getByRole("combobox", { name: "Search the Nexus graph" });
    await searchBox.fill("LAL endotoxin");
    await expect(page.getByText(/results? for “LAL endotoxin”/)).toBeVisible({ timeout: 20_000 });

    const categories = page.locator('section[aria-label="Matching categories"]');
    await expect(categories.getByRole("link", { name: /Endotoxin testing/ })).toBeVisible();
    await categories.getByRole("link", { name: /Endotoxin testing/ }).click();

    await page.waitForURL("**/categories/endotoxin_testing");
    await expect(page.getByRole("heading", { name: "Endotoxin testing" })).toBeVisible();

    const orizonSection = page.locator('section[aria-label="OrizonEndo (Demo)"]');
    await expect(
      orizonSection.getByRole("link", { name: "EndoZyme rFC kinetic assay kit (Demo)" }),
    ).toBeVisible();
    const deltaSection = page.locator('section[aria-label="DeltaBio (Demo)"]');
    await expect(
      deltaSection.getByRole("link", { name: "DeltaTest LAL gel-clot cartridges (Demo)" }),
    ).toBeVisible();
    // Both assays reference USP <85> — the compendial anchor for the choice.
    await expect(page.getByText("USP 85").first()).toBeVisible();
  });

  test("upstream and downstream shelves complete the biopharma portfolio", async ({ page }) => {
    // Upstream: cell culture media.
    await page.goto("/categories/cell_culture_media");
    await expect(page.getByRole("heading", { name: "Cell culture media" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "CHO-Max basal medium (Demo)" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "DeltaGrow CHO feed supplement (Demo)" }),
    ).toBeVisible();

    // Downstream: chromatography + filtration.
    await page.goto("/categories/purification_chromatography");
    await expect(page.getByRole("heading", { name: "Purification chromatography" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "AuriSelect Protein A resin (Demo)" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "KestrelFlow Q membrane chromatography capsules (Demo)" }),
    ).toBeVisible();

    await page.goto("/categories/process_filtration");
    await expect(page.getByRole("heading", { name: "Process filtration" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "SteriFlow 0.22 um sterilizing-grade cartridges (Demo)" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "AuriFlow TFF cassette 30 kDa (Demo)" }),
    ).toBeVisible();

    // Upstream chemicals for API work.
    await page.goto("/categories/process_chemicals");
    await expect(page.getByRole("heading", { name: "Process chemicals" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "VestaPure ethanol 96% USP grade (Demo)" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "NovaraCell PBS concentrate 10x (Demo)" }),
    ).toBeVisible();
  });

  test("consumable shelves now offer a two-brand choice with compatibility anchors", async ({ page }) => {
    // Sterility consumables: SteriCan (Condor) vs SteriPump canisters (Meridian).
    await page.goto("/categories/sterility_testing_consumables");
    await expect(page.getByRole("heading", { name: "Sterility testing consumables" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "SteriCan sterility test canisters (Demo)" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "SteriPump closed sterility canisters (Demo)" }),
    ).toBeVisible();

    // Reference materials: DeltaSeed vs OrizonQC pellets.
    await page.goto("/categories/microbial_reference_materials");
    await expect(page.getByRole("heading", { name: "Microbial reference materials" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Bacillus subtilis ATCC 6633 QC pellets (Demo)" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "OrizonQC E. coli ATCC 8739 QC pellets (Demo)" }),
    ).toBeVisible();

    // Accessories shelf was empty before this wave.
    await page.goto("/categories/microbiology_lab_accessories");
    await expect(page.getByRole("heading", { name: "Microbiology lab accessories" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Condor PetriTurn plate turntable (Demo)" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "SteriPump inoculating loops 10 uL sterile (Demo)" }),
    ).toBeVisible();
  });
});
