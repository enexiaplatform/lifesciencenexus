import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-end coverage of the six mandatory demo-mode workflows.
 * Runs against the in-memory demo repository (no Supabase env needed).
 * Demo ids come from src/lib/demo/ids.ts.
 */

const TSA_SKU_ID = "sku-tsa-500";
const TSA_SKU_NAME = "TSA dehydrated medium 500 g (Demo)";
const TSA_CATALOGUE = "ACM-1058.0500";
const EQUIV_RECORD_ID = "equiv-tsa-delta-vs-acme";
const DELTA_PHARMA_ID = "org-delta-pharma-hcmc";
const TENDER_ID = "tender-rrh-2025-014";

const EQUIVALENCE_DIMENSIONS = [
  "formula_composition",
  "intended_use_application",
  "method_standard_compatibility",
  "organism_performance",
  "preparation_conditions",
  "regulatory_documents",
  "format_pack",
  "local_availability",
] as const;

async function expectDownload(page: Page, trigger: () => Promise<void>, filename: string | RegExp) {
  const [download] = await Promise.all([page.waitForEvent("download"), trigger()]);
  if (typeof filename === "string") {
    expect(download.suggestedFilename()).toBe(filename);
  } else {
    expect(download.suggestedFilename()).toMatch(filename);
  }
}

// ---------------------------------------------------------------------------
// A. Research a product
// ---------------------------------------------------------------------------
test.describe("A. Research a product", () => {
  test("search → SKU detail → project link → JSON export", async ({ page }) => {
    test.setTimeout(60_000); // cold dev-server compiles of /search and /skus/[id]
    // Search by product name through the search UI.
    await page.goto("/search");
    const searchBox = page.getByRole("combobox", { name: "Search the Nexus graph" });
    await searchBox.fill("Tryptic Soy Agar");
    // Wait for the debounced ?q= navigation and the server-rendered results.
    await expect(page.getByText(/results? for “Tryptic Soy Agar”/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("link", { name: TSA_SKU_NAME })).toBeVisible();

    // Search by catalogue number.
    await searchBox.fill(TSA_CATALOGUE);
    await expect(page.getByText(new RegExp(`results? for “${TSA_CATALOGUE}”`))).toBeVisible({
      timeout: 20_000,
    });
    const skuLink = page.getByRole("link", { name: TSA_SKU_NAME });
    await expect(skuLink).toBeVisible();
    await skuLink.click();
    await page.waitForURL(`**/skus/${TSA_SKU_ID}`);

    // Identity sections: manufacturer, brand (breadcrumb), catalogue number.
    await expect(page.getByRole("heading", { name: TSA_SKU_NAME })).toBeVisible();
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb.getByText("Acme Media (Demo)")).toBeVisible();
    await expect(breadcrumb.getByText("Tryptic Soy Agar (TSA) (Demo)")).toBeVisible();
    await expect(page.getByText("Identifiers & lifecycle")).toBeVisible();
    await expect(page.getByRole("link", { name: "Acme MicroMedia (Demo)" })).toBeVisible();
    await expect(page.getByText(TSA_CATALOGUE).first()).toBeVisible();
    await expect(page.getByText("Shelf life")).toBeVisible();

    // Pack + specs.
    await expect(page.getByText("Pack configurations (1)")).toBeVisible();

    // Evidence sections: applications / standards / organisms.
    const evidence = page.locator('section[aria-label="Evidence-backed links"]');
    await expect(evidence.getByText("Applications")).toBeVisible();
    await expect(evidence.getByText("Standards")).toBeVisible();

    // Supplier availability + price observations.
    await expect(page.getByText("Supplier listings (1)")).toBeVisible();
    await expect(page.getByRole("link", { name: "Mekong Lab Supply (Demo)" }).first()).toBeVisible();
    await expect(page.getByText("Availability observations (1)")).toBeVisible();
    await expect(page.getByText(/in stock/i).first()).toBeVisible();
    await expect(page.getByText("Price observations (2)")).toBeVisible();

    // Equivalence section.
    await expect(page.getByText("Equivalence records (1)")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open workspace" })).toBeVisible();

    // Add to research project (dialog → server action round trip).
    await page.getByRole("button", { name: "Add to research project" }).click();
    const dialog = page.getByRole("dialog", { name: "Add to research project" });
    await expect(dialog).toBeVisible();
    await dialog
      .locator("#project-select")
      .selectOption({ label: "Vietnam ready-prepared media market (Demo)" });
    await dialog.getByRole("button", { name: "Add to project" }).click();
    // First run links the SKU; re-runs against the same dev server report the
    // existing link — both prove the server-action round trip.
    await expect(
      dialog.getByText(/SKU linked to the project\.|already linked/),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // Export: Memoire handoff JSON download fires.
    await page.getByRole("button", { name: "Send to Memoire" }).click();
    const handoff = page.getByRole("dialog", { name: "Send to Memoire" });
    await expect(handoff).toBeVisible();
    await expect(handoff.getByLabel("Handoff payload preview")).toContainText(TSA_SKU_ID);
    await expectDownload(
      page,
      () => handoff.getByRole("button", { name: "Download .json" }).click(),
      `nexus-handoff-${TSA_SKU_ID}.json`,
    );
  });
});

// ---------------------------------------------------------------------------
// B. Compare equivalents
// ---------------------------------------------------------------------------
test.describe("B. Compare equivalents", () => {
  test("workspace live scoring, unknown guard, save, CSV export", async ({ page }) => {
    await page.goto("/equivalence");
    await expect(page.getByText(/decision support only/)).toBeVisible();

    // Open the record whose candidate is the Acme TSA SKU.
    const row = page.getByRole("row").filter({ hasText: TSA_SKU_NAME });
    await row.getByRole("link", { name: "Open workspace" }).click();
    await page.waitForURL(`**/equivalence/${EQUIV_RECORD_ID}`);

    // Workspace renders all 8 dimensions.
    await expect(page.getByRole("checkbox", { name: "Unknown" })).toHaveCount(8);
    await expect(page.getByText("Dimension editor")).toBeVisible();

    // Live overall recomputes when a score changes. Compute the expected
    // value from the inputs so the assertion is robust across re-runs
    // (the demo record is mutated by saving).
    const overall = page
      .locator('div:has(> p:text-is("Overall score")) span.font-semibold')
      .first();
    const readOverall = async () => Number.parseFloat((await overall.textContent()) ?? "NaN");
    const initial = await readOverall();
    expect(Number.isFinite(initial)).toBe(true);

    const scoreInput = page.locator("#score-formula_composition");
    // Fill a value different from the current one so the live overall must move.
    const nextScore = (await scoreInput.inputValue()) === "10" ? "90" : "10";
    await scoreInput.fill(nextScore);
    let expected = 0;
    for (const dimension of EQUIVALENCE_DIMENSIONS) {
      const weight = Number(await page.locator(`#weight-${dimension}`).inputValue());
      const raw = await page.locator(`#score-${dimension}`).inputValue();
      expected += weight * Number(raw === "" ? 0 : raw);
    }
    expected /= 100;
    const updated = await readOverall();
    expect(updated).not.toBe(initial);
    expect(Math.abs(updated - expected)).toBeLessThan(0.01);

    // Classification guard text appears while a dimension is unknown.
    const unknownToggle = page.locator("#unknown-regulatory_documents");
    await unknownToggle.check();
    await expect(
      page.getByText("An exact equivalence can never be classified while dimensions are unknown."),
    ).toBeVisible();
    await expect(
      page.getByText("Exact equivalent is disabled: every dimension must be scored to claim it."),
    ).toBeVisible();
    await unknownToggle.uncheck();

    // Disclaimer visible on the workspace page too.
    await expect(page.getByText(/decision support only/)).toBeVisible();

    // Save → server recomputes.
    await page.getByRole("button", { name: "Save assessment" }).click();
    await expect(
      page.getByText("Assessment saved — overall score recomputed server-side."),
    ).toBeVisible();

    // Export CSV fires.
    await expectDownload(
      page,
      () => page.getByRole("button", { name: "Export comparison CSV" }).click(),
      `equivalence-${EQUIV_RECORD_ID}.csv`,
    );
  });
});

// ---------------------------------------------------------------------------
// C. Cost per test
// ---------------------------------------------------------------------------
test.describe("C. Cost per test", () => {
  test("two prefilled SKU cards → calculate → breakdown, sensitivity, export", async ({ page }) => {
    await page.goto("/cost-per-test");

    const addSku = async (query: string, optionName: string | RegExp) => {
      const combo = page.getByRole("combobox", { name: "Add SKU" });
      await combo.click();
      await combo.fill(query);
      await page.getByRole("option", { name: optionName }).click();
    };

    // Two SKU cards, prefilled from latest price observations and packs.
    await addSku(TSA_CATALOGUE, new RegExp(`^${TSA_SKU_NAME.replace(/[()]/g, (c) => `\\${c}`)}`));
    await addSku("ACM-P2001", /^TSA ready plates 90 mm 20\/pack \(Demo\)/);

    const prices = page.getByLabel("Purchase price / pack");
    await expect(prices).toHaveCount(2);
    await expect(prices.nth(0)).not.toHaveValue("");
    await expect(prices.nth(1)).not.toHaveValue("");
    const packQuantities = page.getByLabel("Pack quantity");
    await expect(packQuantities.nth(0)).not.toHaveValue("");
    await expect(packQuantities.nth(1)).not.toHaveValue("");

    // Adjust required inputs (yield is not derivable from the pack).
    await page.getByLabel("Yield (tests / unit)").nth(0).fill("10");
    await page.getByLabel("Yield (tests / unit)").nth(1).fill("1");

    await page.getByRole("button", { name: "Calculate" }).click();

    // Results: effective cost per test + breakdown tables + assumptions.
    const results = page.locator('section[aria-label="Results"]');
    await expect(results.getByText("Effective cost per test (VND)")).toBeVisible();
    await expect(results.getByText("/ test").first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Component" })).toHaveCount(2);
    await expect(results.getByText("Assumptions (always visible)")).toHaveCount(2);

    // Sensitivity table renders once a scenario is chosen.
    await page.locator("#sens-card").selectOption({ index: 1 });
    await expect(page.getByRole("columnheader", { name: "vs base" })).toBeVisible();

    // Export fires.
    await expectDownload(
      page,
      () => page.getByRole("button", { name: "Export CSV" }).click(),
      /^cost-per-test-\d{4}-\d{2}-\d{2}\.csv$/,
    );
  });
});

// ---------------------------------------------------------------------------
// D. Map a market account
// ---------------------------------------------------------------------------
test.describe("D. Map a market account", () => {
  test("create org → account 360 → installed base gaps → signal handoff", async ({ page }) => {
    test.setTimeout(60_000); // cold dev-server compiles
    // Create an organization through the dialog.
    await page.goto("/organizations");
    await page.getByRole("button", { name: "Create organization" }).click();
    const createDialog = page.getByRole("dialog", { name: "Create organization" });
    await expect(createDialog).toBeVisible();
    await createDialog.getByRole("textbox", { name: "Name" }).fill("QA Market Account (E2E)");
    await createDialog.getByRole("checkbox", { name: "Distributor" }).check();
    await createDialog.getByRole("textbox", { name: /Country/ }).fill("VN");
    await createDialog.getByRole("button", { name: "Create organization" }).click();
    // Success navigates to the new record (server-generated id).
    await expect(page.getByRole("heading", { name: "QA Market Account (E2E)" })).toBeVisible({
      timeout: 15_000,
    });

    // A mapped account renders sites, labs and contacts.
    await page.goto(`/organizations/${DELTA_PHARMA_ID}`);
    await expect(page.getByRole("heading", { name: "Delta Pharma Plant HCMC (Demo)" })).toBeVisible();
    await page.getByRole("tab", { name: /Sites & laboratories/ }).click();
    await expect(page.getByRole("link", { name: "Binh Chanh Plant (Demo)" })).toBeVisible();
    await expect(page.getByText("Laboratories (1)", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: /Contacts/ }).click();
    await expect(page.getByText(/tenant-private relationship intelligence/)).toBeVisible();

    // Installed base: replacement-due highlight + consumables gap.
    await page.goto("/installed-base");
    const as100Row = page.getByRole("row", { name: /AirSampler AS-100/ });
    await expect(as100Row.getByText(/in \d+ d/)).toBeVisible();
    const pc50Row = page.getByRole("row", { name: /CondorCount PC-50/ });
    await expect(pc50Row.getByText("No — gap")).toBeVisible();

    // Related signal on /signals + Memoire handoff dialog on it.
    await page.goto("/signals");
    const signalCard = page
      .locator("div.p-4")
      .filter({ hasText: "due for replacement" })
      .first();
    await expect(signalCard.getByText(/equipment replacement due/i)).toBeVisible();
    await expect(signalCard.getByText("AirSampler AS-100 (Demo)")).toBeVisible();
    await signalCard.getByRole("button", { name: "Send to Memoire" }).click();
    const handoff = page.getByRole("dialog", { name: "Send to Memoire" });
    await expect(handoff).toBeVisible();
    await expect(handoff.getByLabel("Handoff payload preview")).toContainText(
      "equipment_replacement_due",
    );
    await expect(handoff.getByRole("button", { name: "Copy JSON" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(handoff).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// E. Record tender intelligence
// ---------------------------------------------------------------------------
test.describe("E. Record tender intelligence", () => {
  test("tender 360 renders structure; add a lot via inline form", async ({ page }) => {
    await page.goto("/tenders");
    await page.getByRole("link", { name: "RRH-2025-014" }).click();
    await page.waitForURL(`**/tenders/${TENDER_ID}`);

    await expect(page.getByRole("heading", { name: /RRH-2025-014/ })).toBeVisible();

    // Renewal banner (awarded contract inside the 120-day renewal window).
    await expect(page.getByText(/120-day renewal window/)).toBeVisible();

    // Lots & items.
    await expect(page.getByText(/Lots & items \(\d+\)/)).toBeVisible();
    await expect(
      page.locator('section[aria-label="Lot 1 — Dehydrated and ready-prepared culture media (Demo)"]'),
    ).toBeVisible();
    await expect(
      page.locator('section[aria-label="Lot 2 — Microbial reference materials (Demo)"]'),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Tryptic Soy Agar dehydrated medium, 500 g bottles (Demo)" }),
    ).toBeVisible();

    // Bidders, award, documents, events.
    await expect(page.getByText(/Bidders \(2\)/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Mekong Lab Supply (Demo)" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Saigon Scientific (Demo)" }).first()).toBeVisible();
    await expect(page.getByText(/Awards \(1\)/)).toBeVisible();
    await expect(page.getByText("rrh-2025-014-demo.pdf", { exact: true })).toBeVisible();
    await expect(page.getByText("Events timeline")).toBeVisible();
    await expect(page.getByText("Tender dossier published (Demo).").first()).toBeVisible();

    // Related renewal signal.
    await expect(page.getByText(/tender renewal expected/i).first()).toBeVisible();

    // Add a lot via the inline form (server action round trip). The name is
    // unique per run so re-runs against the same dev server stay strict.
    const lotName = `Lot 3 — Air monitoring equipment (E2E ${Date.now()})`;
    await page.locator("#lot-name").fill(lotName);
    await page.getByRole("button", { name: "Add lot" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await expect(page.locator(`section[aria-label="${lotName}"]`)).toBeVisible();
  });

  test("closed tender RRH-2026-003 shows evaluation-stage structure", async ({ page }) => {
    await page.goto("/tenders");
    await page.getByRole("link", { name: "RRH-2026-003" }).click();
    await page.waitForURL("**/tenders/tender-rrh-2026-003");

    await expect(page.getByRole("heading", { name: /RRH-2026-003/ })).toBeVisible();
    // Endotoxin/BET scope: rFC and LAL items mapped to SKUs.
    await expect(
      page.getByRole("cell", { name: "Recombinant Factor C endotoxin assay kits (Demo)", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "LAL gel-clot cartridges (Demo)", exact: true }),
    ).toBeVisible();
    // Two competing bids, no award yet, and the deadline-extension event.
    await expect(page.getByText(/Bidders \(2\)/)).toBeVisible();
    await expect(page.getByText(/Awards \(0\)/)).toBeVisible();
    await expect(page.getByText("Submission deadline extended by 10 days (Demo).").first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// F. Ingest a spreadsheet
// ---------------------------------------------------------------------------
test.describe("F. Ingest a spreadsheet", () => {
  test("organizations template → paste TSV → map → validate → dedupe → commit", async ({ page }) => {
    await page.goto("/imports");

    // Step 1: pick the organizations template (default, selected explicitly).
    await page.locator("#import-kind").click();
    await page.getByRole("option", { name: "Organizations" }).click();
    await expectDownload(
      page,
      () => page.getByRole("button", { name: "Download template (CSV)" }).click(),
      "nexus-import-template-organizations.csv",
    );
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 2: paste a small table — one new org, one exact duplicate.
    const orgName = `QA Import Org ${Date.now()} (E2E)`;
    await page.locator("#import-paste").fill(
      `Name\tTypes\tCountry\n${orgName}\tdistributor\tVN\nMekong Lab Supply (Demo)\tdistributor\tVN`,
    );
    await page.getByRole("button", { name: "Use pasted table" }).click();
    await expect(page.getByText("Parsed 2 rows × 3 columns.")).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 3: preview renders.
    await expect(page.getByText("Preview of the first 2 of 2 rows.")).toBeVisible();
    await expect(page.getByRole("cell", { name: orgName })).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 4: columns auto-mapped.
    await expect(page.locator("#map-name")).toContainText("Name");
    await expect(page.locator("#map-types")).toContainText("Types");
    await expect(page.locator("#map-country")).toContainText("Country");
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 5: validation passes.
    await expect(page.getByText("All 2 rows are valid.")).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 6: duplicate step renders (hit or clean bill, both are valid outcomes).
    await expect(
      page.getByText(/No duplicate candidates found|look similar to existing records/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 7: visibility → step 8: confirm → run import.
    await expect(page.getByText("Tenant-private (default)")).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByText(/Skipped after duplicate review/)).toBeVisible();
    await page.getByRole("button", { name: "Run import" }).click();

    // Step 9: report — the new org is created, the duplicate skipped.
    await expect(page.getByText("rows created (1 records)")).toBeVisible();
    await expect(page.getByRole("cell", { name: "created" }).first()).toBeVisible();
  });
});
