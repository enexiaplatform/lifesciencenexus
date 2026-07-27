#!/usr/bin/env node
/**
 * scripts/verify-migrations.mjs
 *
 * Offline structural gate for the Supabase migrations of Life Science Nexus.
 * No database required — it parses the SQL files and asserts the schema
 * discipline defined in docs/ADR/0002 and docs/ADR/0004:
 *
 *   1. Migration filenames follow YYYYMMDDHHMMSS_name.sql, are strictly
 *      ordered, and start at 20260727000000.
 *   2. BEGIN/COMMIT are balanced in every file that uses them.
 *   3. Every CREATE TABLE carries the common column set (id/created_at/
 *      updated_at/created_by/updated_by/visibility/is_demo/archived_at),
 *      a gen_random_uuid() default PK, and the ADR 0002 layer CHECK
 *      (canonical <=> tenant_id IS NULL). Tenant-scoped tables must have
 *      tenant_id NOT NULL; canonical-capable tables a nullable tenant_id.
 *   4. Every table has a matching `enable row level security` and at least
 *      one `create policy` in the RLS migration, and an updated_at trigger
 *      somewhere in the migrations.
 *   5. No auth.users foreign key from a canonical-capable table without a
 *      tenant guard (only audit-style actor columns are allowed there).
 *   6. anon is revoked on all public tables in the RLS migration.
 *
 * With --demo-checks it additionally asserts the ADR 0004 demo policy:
 * seed.sql labels demo rows, demo emails are fictional, and the PII tables
 * (people/organization_contacts/contact_observations) carry the
 * visibility='tenant_private' CHECK.
 *
 * Usage:
 *   node scripts/verify-migrations.mjs [--demo-checks]
 * Exit code 0 on PASS, 1 on FAIL.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = join(repoRoot, 'supabase', 'migrations');
const seedPath = join(repoRoot, 'supabase', 'seed.sql');
const demoChecks = process.argv.includes('--demo-checks');

let failures = 0;
const pass = (msg) => console.log(`PASS: ${msg}`);
const fail = (msg) => {
  console.log(`FAIL: ${msg}`);
  failures += 1;
};

// Tables that must carry tenant_id NOT NULL (TenantEntity set + tenancy tables).
const TENANT_SCOPED = new Set([
  'tenant_memberships', 'api_clients', 'integration_connections',
  'people', 'person_aliases', 'employment_relationships', 'professional_roles',
  'organization_contacts', 'contact_observations',
  'stock_observations', 'lead_time_observations', 'commercial_terms',
  'installed_assets', 'asset_locations', 'asset_lifecycle_events',
  'maintenance_events', 'qualification_events', 'consumption_models',
  'replacement_assumptions', 'vendor_approvals', 'product_validations',
  'method_validations', 'trial_events', 'qualification_statuses', 'validation_evidence',
  'research_projects', 'research_questions', 'research_collections', 'saved_views',
  'research_notes', 'research_findings', 'research_exports', 'research_project_entities',
  'cost_per_test_scenarios', 'opportunity_signals', 'outbound_handoff_records',
  'integration_sync_events', 'integration_errors', 'import_batches', 'import_staging_rows',
]);

// Platform tables without a tenant_id column (and therefore without the
// layer CHECK). Everything else must have the layer CHECK.
const NO_LAYER_CHECK = new Set(['tenants', 'profiles']);

// Tables where arbitrary user FK columns are acceptable (tenant-guarded).
const TENANT_GUARDED = new Set([...TENANT_SCOPED, 'profiles', 'tenants']);

// auth.users FK columns allowed on canonical-capable tables (audit actors).
const ALLOWED_USER_FK_COLUMNS = new Set([
  'created_by', 'updated_by', 'reviewer_id', 'reviewed_by', 'resolved_by',
  'requested_by', 'assigned_by', 'assignee_id', 'owner_id', 'actor_id',
]);

const PII_TABLES = ['people', 'organization_contacts', 'contact_observations'];

// ---------------------------------------------------------------------------
// Load migration files
// ---------------------------------------------------------------------------

if (!existsSync(migrationsDir)) {
  fail(`migrations directory not found: ${migrationsDir}`);
  finish();
}

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  fail('no migration files found');
  finish();
}

// Check 1: filename convention + strict ordering.
const namePattern = /^(\d{14})_[a-z0-9_]+\.sql$/;
let previousTs = '';
for (const file of files) {
  const m = file.match(namePattern);
  if (!m) {
    fail(`migration filename does not match YYYYMMDDHHMMSS_name.sql: ${file}`);
    continue;
  }
  if (m[1] <= previousTs) {
    fail(`migration timestamps not strictly increasing at ${file}`);
  }
  previousTs = m[1];
}
if (files[0] && !files[0].startsWith('20260727000000')) {
  fail(`first migration must start at 20260727000000, got ${files[0]}`);
}
if (failures === 0) pass(`check 1 — ${files.length} migrations correctly named and ordered`);

// Check 2: balanced BEGIN/COMMIT per file.
const contents = new Map(files.map((f) => [f, readFileSync(join(migrationsDir, f), 'utf8')]));
{
  let bad = 0;
  for (const [file, sql] of contents) {
    const begins = (sql.match(/\bbegin\s*;/gi) || []).length;
    const commits = (sql.match(/\bcommit\s*;/gi) || []).length;
    if (begins !== commits) {
      fail(`${file}: unbalanced BEGIN (${begins}) / COMMIT (${commits})`);
      bad += 1;
    }
  }
  if (bad === 0) pass('check 2 — BEGIN/COMMIT balanced in all files');
}

// ---------------------------------------------------------------------------
// Parse CREATE TABLE blocks
// ---------------------------------------------------------------------------

const tableRe = /create\s+table\s+if\s+not\s+exists\s+public\.([a-z0-9_]+)\s*\(/gi;
/** @type {Map<string, {file: string, block: string}>} */
const tables = new Map();

for (const [file, sql] of contents) {
  for (const match of sql.matchAll(tableRe)) {
    const name = match[1];
    if (tables.has(name)) {
      fail(`duplicate CREATE TABLE for public.${name} (also in ${tables.get(name).file})`);
      continue;
    }
    // Balance-scan parentheses from the opening paren of the column list.
    let depth = 0;
    let end = -1;
    for (let i = match.index + match[0].length - 1; i < sql.length; i += 1) {
      const ch = sql[i];
      if (ch === '(') depth += 1;
      else if (ch === ')') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) {
      fail(`${file}: unbalanced parentheses in CREATE TABLE public.${name}`);
      continue;
    }
    tables.set(name, { file, block: sql.slice(match.index, end + 1) });
  }
}

if (tables.size === 0) {
  fail('no CREATE TABLE statements parsed');
  finish();
}

// Check 3: common columns + layer discipline per table.
const COMMON_COLUMNS = ['created_at', 'updated_at', 'created_by', 'updated_by', 'visibility', 'is_demo', 'archived_at'];
{
  let bad = 0;
  for (const [name, { block }] of tables) {
    for (const col of COMMON_COLUMNS) {
      if (!new RegExp(`\\b${col}\\b`).test(block)) {
        fail(`public.${name}: missing common column ${col}`);
        bad += 1;
      }
    }
    if (!/gen_random_uuid\(\)/.test(block)) {
      fail(`public.${name}: primary key must default to gen_random_uuid()`);
      bad += 1;
    }
    if (!/visibility\s+in\s*\(\s*'canonical'\s*,\s*'tenant_private'\s*\)/i.test(block)) {
      fail(`public.${name}: missing visibility CHECK ('canonical','tenant_private')`);
      bad += 1;
    }
    if (NO_LAYER_CHECK.has(name)) {
      if (/\btenant_id\b/.test(block)) {
        fail(`public.${name}: platform table must not carry tenant_id`);
        bad += 1;
      }
    } else {
      if (!/visibility\s*=\s*'canonical'\s+and\s+tenant_id\s+is\s+null/i.test(block)) {
        fail(`public.${name}: missing ADR 0002 layer CHECK (canonical <=> tenant_id IS NULL)`);
        bad += 1;
      }
      if (TENANT_SCOPED.has(name)) {
        if (!/tenant_id\s+uuid\s+not\s+null/i.test(block)) {
          fail(`public.${name}: tenant-scoped table must have tenant_id NOT NULL`);
          bad += 1;
        }
      } else if (!/tenant_id\s+uuid\s+references\s+public\.tenants/i.test(block)) {
        fail(`public.${name}: canonical-capable table must have a nullable tenant_id FK`);
        bad += 1;
      }
    }
  }
  if (bad === 0) pass(`check 3 — common columns + layer discipline on all ${tables.size} tables`);
}

// Check 4: RLS enable + policy + updated_at trigger coverage.
const rlsFile = files.find((f) => f.endsWith('_rls.sql'));
if (!rlsFile) {
  fail('no *_rls.sql migration found');
} else {
  const rlsSql = contents.get(rlsFile);
  const allSql = [...contents.values()].join('\n');
  let bad = 0;
  for (const name of tables.keys()) {
    const enableRe = new RegExp(`alter\\s+table\\s+public\\.${name}\\s+enable\\s+row\\s+level\\s+security`, 'i');
    if (!enableRe.test(rlsSql)) {
      fail(`public.${name}: no "enable row level security" in ${rlsFile}`);
      bad += 1;
    }
    const policyRe = new RegExp(`create\\s+policy\\s+${name}_`, 'i');
    if (!policyRe.test(rlsSql)) {
      fail(`public.${name}: no "create policy ${name}_…" in ${rlsFile}`);
      bad += 1;
    }
    const triggerRe = new RegExp(`create\\s+or\\s+replace\\s+trigger\\s+\\w+\\s+before\\s+update\\s+on\\s+public\\.${name}\\b`, 'i');
    if (!triggerRe.test(allSql)) {
      fail(`public.${name}: no updated_at trigger coverage`);
      bad += 1;
    }
  }
  if (bad === 0) pass(`check 4 — RLS enable + policies + updated_at triggers cover all ${tables.size} tables`);
}

// Check 5: no auth.users FK from canonical-capable tables without tenant guard.
{
  let bad = 0;
  const userFkRe = /(\w+)\s+uuid[^,\n()]*?references\s+auth\.users/gi;
  for (const [name, { block }] of tables) {
    for (const m of block.matchAll(userFkRe)) {
      const col = m[1];
      if (ALLOWED_USER_FK_COLUMNS.has(col)) continue;
      if (TENANT_GUARDED.has(name)) continue;
      fail(`public.${name}.${col}: auth.users FK on canonical-capable table without tenant guard`);
      bad += 1;
    }
  }
  if (bad === 0) pass('check 5 — no unguarded auth.users FKs on canonical-capable tables');
}

// Check 6: anon revoked on all public tables in the RLS migration.
{
  const rlsSql = rlsFile ? contents.get(rlsFile) : '';
  if (/revoke\s+all\s+on\s+all\s+tables\s+in\s+schema\s+public\s+from\s+anon/i.test(rlsSql)) {
    pass('check 6 — anon revoked on all public tables');
  } else {
    fail('RLS migration must revoke all on all tables in schema public from anon');
  }
}

// ---------------------------------------------------------------------------
// Demo-policy checks (--demo-checks / verify:demo-separation)
// ---------------------------------------------------------------------------

if (demoChecks) {
  if (!existsSync(seedPath)) {
    fail('supabase/seed.sql not found');
  } else {
    const seed = readFileSync(seedPath, 'utf8');
    if (seed.includes('tenant_demo') && seed.includes('tenant_other')) {
      pass('demo check — seed defines tenant_demo and tenant_other');
    } else {
      fail('seed.sql must define tenant_demo and tenant_other');
    }
    const demoLabels = (seed.match(/\(Demo\)/g) || []).length;
    if (demoLabels >= 8 && /\bis_demo\b/.test(seed)) {
      pass(`demo check — seed labels ${demoLabels} synthetic rows "(Demo)" with is_demo markers`);
    } else {
      fail(`seed.sql must label synthetic rows "(Demo)" (found ${demoLabels}) and set is_demo`);
    }
    const emails = seed.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g) || [];
    const badEmails = emails.filter(
      (e) => !/@example\.(com|org|net)$/i.test(e) && !/\.demo$/i.test(e),
    );
    if (badEmails.length === 0) {
      pass(`demo check — all ${emails.length} seed emails are fictional (example.com/.demo)`);
    } else {
      fail(`seed.sql contains non-fictional emails: ${badEmails.join(', ')}`);
    }
  }

  let piiBad = 0;
  for (const name of PII_TABLES) {
    const entry = tables.get(name);
    if (!entry) {
      fail(`PII table public.${name} not found in migrations`);
      piiBad += 1;
      continue;
    }
    if (!/check\s*\(\s*visibility\s*=\s*'tenant_private'\s*\)/i.test(entry.block)) {
      fail(`public.${name}: missing CHECK (visibility = 'tenant_private') — PII must never be canonical`);
      piiBad += 1;
    }
  }
  if (piiBad === 0) pass('demo check — PII tables locked to tenant_private visibility');

  const isDemoMissing = [...tables.keys()].filter((n) => !/\bis_demo\b/.test(tables.get(n).block));
  if (isDemoMissing.length === 0) {
    pass(`demo check — every table carries is_demo (${tables.size} tables)`);
  } else {
    fail(`tables missing is_demo: ${isDemoMissing.join(', ')}`);
  }
}

// ---------------------------------------------------------------------------

function finish() {
  if (failures > 0) {
    console.log(`\nRESULT: FAIL (${failures} failure${failures === 1 ? '' : 's'})`);
    process.exit(1);
  }
  console.log(`\nRESULT: PASS (${tables.size} tables verified${demoChecks ? ', demo checks included' : ''})`);
  process.exit(0);
}

finish();
