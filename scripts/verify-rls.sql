-- scripts/verify-rls.sql
-- RLS verification for a LIVE database (migrations must already be applied).
--
-- Run (Git Bash / any POSIX shell):
--   psql "$DATABASE_URL" -f scripts/verify-rls.sql
-- $DATABASE_URL should point at the target database with enough privileges to
-- read system catalogs (the postgres role of the Supabase project works).
--
-- Prints PASS/FAIL per check via NOTICE and aborts (exit code 3, because
-- ON_ERROR_STOP is set) at the first failing section.

\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------------
-- Check 1: every expected table exists and has row level security enabled
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  failures int := 0;
  expected text[] := array[
    -- tenancy (5)
    'tenants', 'profiles', 'tenant_memberships', 'api_clients', 'integration_connections',
    -- organizations (18)
    'geographies', 'addresses', 'organizations', 'organization_aliases',
    'organization_identifiers', 'organization_relationships', 'organization_classifications',
    'sites', 'site_aliases', 'facility_units', 'laboratories', 'production_lines',
    'people', 'person_aliases', 'employment_relationships', 'professional_roles',
    'organization_contacts', 'contact_observations',
    -- products (28)
    'brands', 'product_families', 'products', 'product_status_history',
    'product_relationships', 'product_formats', 'skus', 'pack_configurations',
    'product_documents', 'applications', 'methods', 'standards', 'standard_versions',
    'organisms', 'sample_types', 'industries', 'technologies', 'test_types',
    'incubation_conditions', 'preparation_methods',
    'product_applications', 'product_methods', 'product_standards', 'product_organisms',
    'product_sample_types', 'product_industries', 'product_technologies', 'product_test_types',
    -- suppliers & prices (15)
    'supplier_profiles', 'distribution_agreements', 'supplier_listings',
    'availability_observations', 'stock_observations', 'lead_time_observations',
    'commercial_terms', 'service_capabilities', 'country_authorizations',
    'price_observations', 'price_components', 'exchange_rate_snapshots',
    'price_normalizations', 'price_benchmarks', 'price_review_events',
    -- tenders & assets (17)
    'tenders', 'tender_buyers', 'tender_lots', 'tender_items', 'tender_bidders',
    'tender_awards', 'tender_documents', 'tender_events',
    'asset_models', 'installed_assets', 'asset_locations', 'asset_lifecycle_events',
    'maintenance_events', 'qualification_events', 'consumable_compatibilities',
    'consumption_models', 'replacement_assumptions',
    -- validation & research (15)
    'vendor_approvals', 'product_validations', 'method_validations', 'trial_events',
    'qualification_statuses', 'validation_evidence',
    'research_projects', 'research_questions', 'research_collections', 'saved_views',
    'research_notes', 'research_findings', 'research_exports', 'research_project_entities',
    'cost_per_test_scenarios',
    -- evidence & integration (20)
    'sources', 'source_documents', 'source_snapshots', 'claims', 'claim_evidence_links',
    'evidence_reviews', 'review_assignments', 'data_quality_issues', 'change_requests',
    'entity_merge_events', 'audit_log',
    'external_entity_references', 'integration_sync_events', 'integration_errors',
    'outbound_handoff_records', 'opportunity_signals', 'equivalence_records',
    'duplicate_candidates', 'import_batches', 'import_staging_rows'
  ];
begin
  foreach t in array expected loop
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                   where n.nspname = 'public' and c.relname = t) then
      raise notice 'FAIL: table public.% is missing', t;
      failures := failures + 1;
    elsif not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                      where n.nspname = 'public' and c.relname = t and c.relrowsecurity) then
      raise notice 'FAIL: RLS not enabled on public.%', t;
      failures := failures + 1;
    end if;
  end loop;
  if failures > 0 then
    raise exception 'check 1 failed: % table(s) missing or without RLS', failures;
  end if;
  raise notice 'PASS: check 1 — all % expected tables exist with RLS enabled', array_length(expected, 1);
end $$;

-- ---------------------------------------------------------------------------
-- Check 2: anon role holds no privileges on any public table
-- ---------------------------------------------------------------------------
do $$
declare
  n int;
begin
  select count(*) into n
  from information_schema.role_table_grants
  where grantee = 'anon' and table_schema = 'public';
  if n > 0 then
    raise exception 'check 2 failed: anon holds % privilege row(s) on public tables', n;
  end if;
  raise notice 'PASS: check 2 — anon has no privileges on public tables';
end $$;

-- ---------------------------------------------------------------------------
-- Check 3: every expected table has at least one RLS policy
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  failures int := 0;
  expected text[] := array[
    'tenants', 'profiles', 'tenant_memberships', 'api_clients', 'integration_connections',
    'geographies', 'addresses', 'organizations', 'organization_aliases',
    'organization_identifiers', 'organization_relationships', 'organization_classifications',
    'sites', 'site_aliases', 'facility_units', 'laboratories', 'production_lines',
    'people', 'person_aliases', 'employment_relationships', 'professional_roles',
    'organization_contacts', 'contact_observations',
    'brands', 'product_families', 'products', 'product_status_history',
    'product_relationships', 'product_formats', 'skus', 'pack_configurations',
    'product_documents', 'applications', 'methods', 'standards', 'standard_versions',
    'organisms', 'sample_types', 'industries', 'technologies', 'test_types',
    'incubation_conditions', 'preparation_methods',
    'product_applications', 'product_methods', 'product_standards', 'product_organisms',
    'product_sample_types', 'product_industries', 'product_technologies', 'product_test_types',
    'supplier_profiles', 'distribution_agreements', 'supplier_listings',
    'availability_observations', 'stock_observations', 'lead_time_observations',
    'commercial_terms', 'service_capabilities', 'country_authorizations',
    'price_observations', 'price_components', 'exchange_rate_snapshots',
    'price_normalizations', 'price_benchmarks', 'price_review_events',
    'tenders', 'tender_buyers', 'tender_lots', 'tender_items', 'tender_bidders',
    'tender_awards', 'tender_documents', 'tender_events',
    'asset_models', 'installed_assets', 'asset_locations', 'asset_lifecycle_events',
    'maintenance_events', 'qualification_events', 'consumable_compatibilities',
    'consumption_models', 'replacement_assumptions',
    'vendor_approvals', 'product_validations', 'method_validations', 'trial_events',
    'qualification_statuses', 'validation_evidence',
    'research_projects', 'research_questions', 'research_collections', 'saved_views',
    'research_notes', 'research_findings', 'research_exports', 'research_project_entities',
    'cost_per_test_scenarios',
    'sources', 'source_documents', 'source_snapshots', 'claims', 'claim_evidence_links',
    'evidence_reviews', 'review_assignments', 'data_quality_issues', 'change_requests',
    'entity_merge_events', 'audit_log',
    'external_entity_references', 'integration_sync_events', 'integration_errors',
    'outbound_handoff_records', 'opportunity_signals', 'equivalence_records',
    'duplicate_candidates', 'import_batches', 'import_staging_rows'
  ];
begin
  foreach t in array expected loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t) then
      raise notice 'FAIL: no RLS policy on public.%', t;
      failures := failures + 1;
    end if;
  end loop;
  if failures > 0 then
    raise exception 'check 3 failed: % table(s) without any policy', failures;
  end if;
  raise notice 'PASS: check 3 — every table has at least one policy';
end $$;

-- ---------------------------------------------------------------------------
-- Check 4: policy spot-checks per table group
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  failures int := 0;
  -- tenant-scoped group: must have an is_tenant_member policy
  tenant_tables text[] := array[
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
    'integration_sync_events', 'integration_errors', 'import_batches', 'import_staging_rows'
  ];
  -- canonical-capable group: must have a canonical-visibility select policy
  canonical_tables text[] := array[
    'geographies', 'organizations', 'products', 'skus', 'brands', 'standards',
    'sources', 'claims', 'price_observations', 'tenders', 'equivalence_records'
  ];
  -- review group: must have a reviewer-role write policy
  review_tables text[] := array[
    'evidence_reviews', 'review_assignments', 'change_requests',
    'entity_merge_events', 'price_review_events'
  ];
  -- PII group: must have an always-private CHECK constraint
  pii_tables text[] := array['people', 'organization_contacts', 'contact_observations'];
begin
  foreach t in array tenant_tables loop
    if not exists (select 1 from pg_policies
                   where schemaname = 'public' and tablename = t
                     and (coalesce(qual, '') like '%is_tenant_member%'
                          or coalesce(with_check, '') like '%is_tenant_member%')) then
      raise notice 'FAIL: tenant table public.% lacks an is_tenant_member policy', t;
      failures := failures + 1;
    end if;
  end loop;

  foreach t in array canonical_tables loop
    if not exists (select 1 from pg_policies
                   where schemaname = 'public' and tablename = t and cmd = 'SELECT'
                     and coalesce(qual, '') like '%canonical%') then
      raise notice 'FAIL: canonical table public.% lacks a canonical SELECT policy', t;
      failures := failures + 1;
    end if;
  end loop;

  foreach t in array review_tables loop
    if not exists (select 1 from pg_policies
                   where schemaname = 'public' and tablename = t
                     and (coalesce(qual, '') like '%reviewer%'
                          or coalesce(with_check, '') like '%reviewer%')) then
      raise notice 'FAIL: review table public.% lacks a reviewer-role policy', t;
      failures := failures + 1;
    end if;
  end loop;

  foreach t in array pii_tables loop
    if not exists (select 1 from pg_constraint c
                   join pg_class r on r.oid = c.conrelid
                   join pg_namespace n on n.oid = r.relnamespace
                   where n.nspname = 'public' and r.relname = t
                     and c.contype = 'c'
                     and pg_get_constraintdef(c.oid) like '%tenant_private%') then
      raise notice 'FAIL: PII table public.% lacks the always-private CHECK', t;
      failures := failures + 1;
    end if;
  end loop;

  -- audit_log: select-only for authenticated (no insert/update/delete policy)
  if exists (select 1 from pg_policies
             where schemaname = 'public' and tablename = 'audit_log' and cmd <> 'SELECT') then
    raise notice 'FAIL: audit_log has a non-SELECT policy';
    failures := failures + 1;
  end if;

  -- price_observations: no DELETE policy (append-only ledger)
  if exists (select 1 from pg_policies
             where schemaname = 'public' and tablename = 'price_observations' and cmd = 'DELETE') then
    raise notice 'FAIL: price_observations has a DELETE policy';
    failures := failures + 1;
  end if;

  if failures > 0 then
    raise exception 'check 4 failed: % policy spot-check failure(s)', failures;
  end if;
  raise notice 'PASS: check 4 — policy spot-checks per table group';
end $$;

raise notice 'ALL RLS CHECKS PASSED';
