# Import Guide — CSV/XLSX Ingestion

| | |
|---|---|
| **Status** | Implemented end-to-end (wizard + pure pipeline + server actions) against the demo backend |
| **Date** | 2026-07-28 |
| **Sources of truth** | `src/lib/imports/templates.ts` · `mapping.ts` · `parse.ts` · `validate.ts` · `run.ts` · `src/components/ops/import-wizard.tsx` |

The `/imports` wizard bulk-loads entity families from CSV/XLSX (or pasted
tables) with template-driven mapping, validation, duplicate review, and an
audited commit. All parsing/mapping/validation is client-side pure code
(`src/lib/imports/`); duplicate scoring and the commit run as server actions.

## The 9 wizard steps

1. **Template** — pick one of the 10 templates; download its CSV (header row
   + one example row, via `templateCsv()`).
2. **Upload** — file (papaparse for CSV, SheetJS `xlsx` for spreadsheets) or
   pasted table.
3. **Preview** — first 50 rows as parsed.
4. **Mapping** — map file headers to template fields; auto-mapping pre-fills
   (below).
5. **Validation** — per-row zod pipelines; errors listed per row/cell.
   `importValidOnly` (default on) imports valid rows and skips invalid ones;
   off ⇒ any invalid row aborts the whole import with no writes.
6. **Duplicates** — shown for `organizations` and `skus`; pairs scoring ≥
   `IMPORT_DUPLICATE_THRESHOLD` (0.45) against existing records are listed
   and the user ticks rows to skip.
7. **Visibility** — choose `tenant_private` (default) or `canonical`.
   Choosing canonical does **not** publish directly: rows still land subject
   to the review gate (canonical writes require the publish pipeline —
   `docs/EVIDENCE_MODEL.md`); the safe default is tenant-private.
8. **Import** — commit via server action against the repository.
9. **Report** — per-row results and batch summary (below).

## Templates (10)

Required columns in **bold**. Reference columns accept an existing record id
or an exact display name; unresolved references are reported as row errors at
commit time. Enum columns list accepted values in the template descriptions.

| Template (`kind`) | Creates | Columns |
|---|---|---|
| `organizations` | `organization` | **Name**, **Types** (semicolon-separated org types), **Country** (ISO alpha-2), Website, Identifiers (`scheme:value` pairs: tax_code, duns, gmp_certificate, iso_certificate, domain, other) |
| `sites` | `site` | **Organization** (ref), **Site Name**, **Site Type** (factory / warehouse / office / laboratory_site) |
| `products` | `product` | **Product Family** (ref), **Manufacturer** (ref), **Product Name**, **Category**, Description, Status (active/discontinued/unknown) |
| `skus` | `sku` | **Product** (ref), **SKU Name**, Catalogue Number, Manufacturer Code, GTIN, Format (ref), Shelf Life (months), Storage Condition, Country Availability (ISO codes, `;`), Status |
| `prices` | `price_observation` | **SKU** (id / catalogue number / exact name), **Amount** (number, no thousand separators), **Currency** (ISO 4217), **Observation Date**, **Geography**, Supplier (ref), Tax Included, VAT Rate (0–1), Quantity |
| `suppliers` | `supplier_profile` | **Supplier Organization** (ref), **Relationship Type** (authorized_distributor … unknown_unverified), **Countries**, Manufacturers (refs, `;`) |
| `tenders` | `tender` | **Tender Code**, **Title**, **Buyer Organization** (ref), **Country**, Publication Date, Submission Deadline, Award Date, Contract Period (months), Status |
| `installed-assets` | `installed_asset` (tenant-private) | **Asset Model**, **Site** (ref), Laboratory (ref), Serial Number, Installation Date, Status, Qualification Status, Confidence (0–1, default 0.5) |
| `contacts` | `person` + `organization_contact` (always tenant-private) | **Full Name**, **Organization** (ref), Job Title, Email, Phone, Decision Roles (`;`), Primary Contact |
| `equivalence-candidates` | `equivalence_record` (candidate for review — never auto-asserted) | **Source SKU**, **Candidate SKU**, **Classification** (exact_equivalent / functional_equivalent / closest_alternative / not_recommended_substitute), **Overall Score** (0–100), **Rationale**, Review State (default `unverified`) |

## Auto-mapping

`autoMapColumns()` matches file headers against each column's machine key,
label, and curated synonyms — **exact normalized matches only** (no fuzzy
guessing; a wrong guess is worse than none). Normalization is case- and
diacritic-insensitive (`normalizeForMatch`; Vietnamese `đ/Đ` mapped
explicitly since they don't NFD-decompose). One file header maps to at most
one template field.

Vietnamese synonyms are built in, e.g. `giá` / `đơn giá` / `thành tiền` →
`amount`, `mã hàng` / `ma catalogue` → `catalogueNumber`, `tên công ty` /
`cong ty` → `name`, `mã số thuế` / `mst` → `identifiers`, `hạn sử dụng` /
`hsd` → `shelfLifeMonths`, `nhà cung cấp` → `supplier`, `mã gói thầu` →
`code`, `số serial` → `serialNumber`. Unmapped headers stay selectable in the
mapping step.

## Validation rules

Per-kind zod pipelines (`validate.ts`): required strings non-empty; numbers
coerced (empty → undefined); integers for shelf life; fractions 0–1 for VAT
rate and confidence; ISO dates for date columns; semicolon lists parsed into
arrays; booleans accept `true/false/yes/no`; enums validated against the
domain const arrays. Cell-level errors are reported as
`{rowIndex, field, message}` and shown per row.

## Duplicate review & idempotency

Two distinct mechanisms:

- **Duplicate review (step 6)** — fuzzy: `scoreDuplicatePair`
  (entity-resolution engine) against existing records, threshold
  `IMPORT_DUPLICATE_THRESHOLD = 0.45` in `run.ts` (the standalone
  entity-resolution queue at `/admin/entity-resolution` uses the stricter
  `DEFAULT_DUPLICATE_THRESHOLD = 0.65`). Hits are advisory; the user decides
  per row.
- **Idempotent commit** — deterministic: before creating, every row gets a
  per-kind dedup key (normalized name + country for organizations, normalized
  catalogue number for SKUs, SKU+amount+date for prices, …). A row whose key
  already exists — in the graph **or earlier in the same batch** — is skipped
  as "exact duplicate". Re-importing the same file with the same mapping
  creates nothing twice.

## Import report & audit

`ImportReport`: `{batchId, kind, fileName, visibility, total, created,
skipped, failed, rows[], createdEntityIds, sourceRecordId, startedAt,
finishedAt}` — per-row status `created | skipped | error` with messages.
Every batch also creates a `source` record (`sourceRecordId`, type
`user_uploaded_document`) so imported facts carry provenance, and the batch
is attributed to `{tenantId, actorId}`.

## Example

```csv
Name,Types,Country,Website,Identifiers
Mekong Lab Supply Co., Ltd,distributor;importer,VN,https://mekonglab.example.vn,tax_code:0312345678
```

```csv
SKU,Amount,Currency,Observation Date,Geography,Supplier,Tax Included,VAT Rate
ACM-1101,1850000,VND,2026-06-30,VN,org-mekong-lab-supply,false,0.1
```

Notes: prices append **immutable observations** — re-importing a corrected
price creates a new observation (supersede semantics), it never edits the old
row. Contacts and installed assets are always tenant-private regardless of
the visibility step; equivalence candidates always enter as
`unverified` review candidates, never as asserted equivalence.
