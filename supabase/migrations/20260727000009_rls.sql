-- 20260727000009_rls.sql
-- Row-level security for every public table. Idempotent: every policy is
-- dropped (IF EXISTS) before being created.
--
-- POLICY MODEL (ADR 0002 four layers, ADR 0004 demo policy)
-- ---------------------------------------------------------------------------
-- Deny by default: the anon role gets NO privileges on any public table
-- (revoked below, including future default privileges). The authenticated
-- role receives table grants, but row access is governed entirely by RLS:
--
--   1. Canonical-capable tables (visibility column + nullable tenant_id):
--      SELECT: visibility='canonical' rows are readable by every authenticated
--              user; visibility='tenant_private' rows only via
--              is_tenant_member(tenant_id).
--      WRITE : only tenant-private rows, and only for members holding
--              owner/admin/analyst in that tenant. Canonical rows (tenant_id
--              IS NULL) fail has_tenant_role(NULL, ...), so canonical writes
--              happen ONLY via service_role through the publish pipeline.
--   2. Review/publish tables (evidence_reviews, review_assignments,
--      change_requests, entity_merge_events, price_review_events): same read
--      rule; writes require owner/admin/reviewer.
--   3. Tenant-scoped tables (tenant_id NOT NULL): all operations require
--      is_tenant_member(tenant_id). people, organization_contacts and
--      contact_observations are additionally locked to
--      visibility='tenant_private' by CHECK (PII — never canonical).
--   4. Special: tenants/profiles/tenant_memberships/api_clients/
--      integration_connections/audit_log — see their per-table comments.
--
-- service_role bypass: Supabase's service_role has the BYPASSRLS attribute
-- and therefore bypasses every policy below. Server-side code using the
-- service key is the only path that can write canonical rows, insert into
-- audit_log (together with the SECURITY DEFINER touch_audit_log() trigger),
-- or read across tenants. Never expose the service key to the client.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Role grants (defense in depth beneath RLS)
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- audit_log is insert-only via the security-definer trigger: authenticated
-- roles may SELECT (per policy) but never write directly.
revoke insert, update, delete on public.audit_log from authenticated;

-- ===========================================================================
-- GROUP 1 — canonical-capable tables (70)
-- SELECT: canonical or member-of-tenant; WRITE: tenant-private +
-- has_tenant_role('{owner,admin,analyst}').
-- ===========================================================================

-- geographies: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.geographies enable row level security;
drop policy if exists geographies_select on public.geographies; drop policy if exists geographies_insert on public.geographies; drop policy if exists geographies_update on public.geographies; drop policy if exists geographies_delete on public.geographies;
create policy geographies_select on public.geographies for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy geographies_insert on public.geographies for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy geographies_update on public.geographies for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy geographies_delete on public.geographies for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- addresses: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.addresses enable row level security;
drop policy if exists addresses_select on public.addresses; drop policy if exists addresses_insert on public.addresses; drop policy if exists addresses_update on public.addresses; drop policy if exists addresses_delete on public.addresses;
create policy addresses_select on public.addresses for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy addresses_insert on public.addresses for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy addresses_update on public.addresses for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy addresses_delete on public.addresses for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- organizations: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.organizations enable row level security;
drop policy if exists organizations_select on public.organizations; drop policy if exists organizations_insert on public.organizations; drop policy if exists organizations_update on public.organizations; drop policy if exists organizations_delete on public.organizations;
create policy organizations_select on public.organizations for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy organizations_insert on public.organizations for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy organizations_update on public.organizations for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy organizations_delete on public.organizations for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- organization_aliases: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.organization_aliases enable row level security;
drop policy if exists organization_aliases_select on public.organization_aliases; drop policy if exists organization_aliases_insert on public.organization_aliases; drop policy if exists organization_aliases_update on public.organization_aliases; drop policy if exists organization_aliases_delete on public.organization_aliases;
create policy organization_aliases_select on public.organization_aliases for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy organization_aliases_insert on public.organization_aliases for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy organization_aliases_update on public.organization_aliases for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy organization_aliases_delete on public.organization_aliases for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- organization_identifiers: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.organization_identifiers enable row level security;
drop policy if exists organization_identifiers_select on public.organization_identifiers; drop policy if exists organization_identifiers_insert on public.organization_identifiers; drop policy if exists organization_identifiers_update on public.organization_identifiers; drop policy if exists organization_identifiers_delete on public.organization_identifiers;
create policy organization_identifiers_select on public.organization_identifiers for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy organization_identifiers_insert on public.organization_identifiers for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy organization_identifiers_update on public.organization_identifiers for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy organization_identifiers_delete on public.organization_identifiers for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- organization_relationships: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.organization_relationships enable row level security;
drop policy if exists organization_relationships_select on public.organization_relationships; drop policy if exists organization_relationships_insert on public.organization_relationships; drop policy if exists organization_relationships_update on public.organization_relationships; drop policy if exists organization_relationships_delete on public.organization_relationships;
create policy organization_relationships_select on public.organization_relationships for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy organization_relationships_insert on public.organization_relationships for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy organization_relationships_update on public.organization_relationships for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy organization_relationships_delete on public.organization_relationships for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- organization_classifications: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.organization_classifications enable row level security;
drop policy if exists organization_classifications_select on public.organization_classifications; drop policy if exists organization_classifications_insert on public.organization_classifications; drop policy if exists organization_classifications_update on public.organization_classifications; drop policy if exists organization_classifications_delete on public.organization_classifications;
create policy organization_classifications_select on public.organization_classifications for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy organization_classifications_insert on public.organization_classifications for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy organization_classifications_update on public.organization_classifications for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy organization_classifications_delete on public.organization_classifications for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- sites: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.sites enable row level security;
drop policy if exists sites_select on public.sites; drop policy if exists sites_insert on public.sites; drop policy if exists sites_update on public.sites; drop policy if exists sites_delete on public.sites;
create policy sites_select on public.sites for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy sites_insert on public.sites for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy sites_update on public.sites for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy sites_delete on public.sites for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- site_aliases: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.site_aliases enable row level security;
drop policy if exists site_aliases_select on public.site_aliases; drop policy if exists site_aliases_insert on public.site_aliases; drop policy if exists site_aliases_update on public.site_aliases; drop policy if exists site_aliases_delete on public.site_aliases;
create policy site_aliases_select on public.site_aliases for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy site_aliases_insert on public.site_aliases for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy site_aliases_update on public.site_aliases for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy site_aliases_delete on public.site_aliases for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- facility_units: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.facility_units enable row level security;
drop policy if exists facility_units_select on public.facility_units; drop policy if exists facility_units_insert on public.facility_units; drop policy if exists facility_units_update on public.facility_units; drop policy if exists facility_units_delete on public.facility_units;
create policy facility_units_select on public.facility_units for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy facility_units_insert on public.facility_units for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy facility_units_update on public.facility_units for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy facility_units_delete on public.facility_units for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- laboratories: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.laboratories enable row level security;
drop policy if exists laboratories_select on public.laboratories; drop policy if exists laboratories_insert on public.laboratories; drop policy if exists laboratories_update on public.laboratories; drop policy if exists laboratories_delete on public.laboratories;
create policy laboratories_select on public.laboratories for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy laboratories_insert on public.laboratories for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy laboratories_update on public.laboratories for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy laboratories_delete on public.laboratories for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- production_lines: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.production_lines enable row level security;
drop policy if exists production_lines_select on public.production_lines; drop policy if exists production_lines_insert on public.production_lines; drop policy if exists production_lines_update on public.production_lines; drop policy if exists production_lines_delete on public.production_lines;
create policy production_lines_select on public.production_lines for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy production_lines_insert on public.production_lines for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy production_lines_update on public.production_lines for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy production_lines_delete on public.production_lines for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- brands: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.brands enable row level security;
drop policy if exists brands_select on public.brands; drop policy if exists brands_insert on public.brands; drop policy if exists brands_update on public.brands; drop policy if exists brands_delete on public.brands;
create policy brands_select on public.brands for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy brands_insert on public.brands for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy brands_update on public.brands for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy brands_delete on public.brands for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- product_families: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.product_families enable row level security;
drop policy if exists product_families_select on public.product_families; drop policy if exists product_families_insert on public.product_families; drop policy if exists product_families_update on public.product_families; drop policy if exists product_families_delete on public.product_families;
create policy product_families_select on public.product_families for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy product_families_insert on public.product_families for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_families_update on public.product_families for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_families_delete on public.product_families for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- products: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.products enable row level security;
drop policy if exists products_select on public.products; drop policy if exists products_insert on public.products; drop policy if exists products_update on public.products; drop policy if exists products_delete on public.products;
create policy products_select on public.products for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy products_insert on public.products for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy products_update on public.products for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy products_delete on public.products for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- product_status_history: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.product_status_history enable row level security;
drop policy if exists product_status_history_select on public.product_status_history; drop policy if exists product_status_history_insert on public.product_status_history; drop policy if exists product_status_history_update on public.product_status_history; drop policy if exists product_status_history_delete on public.product_status_history;
create policy product_status_history_select on public.product_status_history for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy product_status_history_insert on public.product_status_history for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_status_history_update on public.product_status_history for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_status_history_delete on public.product_status_history for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- product_relationships: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.product_relationships enable row level security;
drop policy if exists product_relationships_select on public.product_relationships; drop policy if exists product_relationships_insert on public.product_relationships; drop policy if exists product_relationships_update on public.product_relationships; drop policy if exists product_relationships_delete on public.product_relationships;
create policy product_relationships_select on public.product_relationships for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy product_relationships_insert on public.product_relationships for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_relationships_update on public.product_relationships for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_relationships_delete on public.product_relationships for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- product_formats: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.product_formats enable row level security;
drop policy if exists product_formats_select on public.product_formats; drop policy if exists product_formats_insert on public.product_formats; drop policy if exists product_formats_update on public.product_formats; drop policy if exists product_formats_delete on public.product_formats;
create policy product_formats_select on public.product_formats for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy product_formats_insert on public.product_formats for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_formats_update on public.product_formats for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_formats_delete on public.product_formats for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- skus: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.skus enable row level security;
drop policy if exists skus_select on public.skus; drop policy if exists skus_insert on public.skus; drop policy if exists skus_update on public.skus; drop policy if exists skus_delete on public.skus;
create policy skus_select on public.skus for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy skus_insert on public.skus for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy skus_update on public.skus for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy skus_delete on public.skus for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- pack_configurations: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.pack_configurations enable row level security;
drop policy if exists pack_configurations_select on public.pack_configurations; drop policy if exists pack_configurations_insert on public.pack_configurations; drop policy if exists pack_configurations_update on public.pack_configurations; drop policy if exists pack_configurations_delete on public.pack_configurations;
create policy pack_configurations_select on public.pack_configurations for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy pack_configurations_insert on public.pack_configurations for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy pack_configurations_update on public.pack_configurations for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy pack_configurations_delete on public.pack_configurations for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- product_documents: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.product_documents enable row level security;
drop policy if exists product_documents_select on public.product_documents; drop policy if exists product_documents_insert on public.product_documents; drop policy if exists product_documents_update on public.product_documents; drop policy if exists product_documents_delete on public.product_documents;
create policy product_documents_select on public.product_documents for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy product_documents_insert on public.product_documents for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_documents_update on public.product_documents for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_documents_delete on public.product_documents for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- applications: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.applications enable row level security;
drop policy if exists applications_select on public.applications; drop policy if exists applications_insert on public.applications; drop policy if exists applications_update on public.applications; drop policy if exists applications_delete on public.applications;
create policy applications_select on public.applications for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy applications_insert on public.applications for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy applications_update on public.applications for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy applications_delete on public.applications for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- methods: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.methods enable row level security;
drop policy if exists methods_select on public.methods; drop policy if exists methods_insert on public.methods; drop policy if exists methods_update on public.methods; drop policy if exists methods_delete on public.methods;
create policy methods_select on public.methods for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy methods_insert on public.methods for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy methods_update on public.methods for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy methods_delete on public.methods for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- standards: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.standards enable row level security;
drop policy if exists standards_select on public.standards; drop policy if exists standards_insert on public.standards; drop policy if exists standards_update on public.standards; drop policy if exists standards_delete on public.standards;
create policy standards_select on public.standards for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy standards_insert on public.standards for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy standards_update on public.standards for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy standards_delete on public.standards for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- standard_versions: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.standard_versions enable row level security;
drop policy if exists standard_versions_select on public.standard_versions; drop policy if exists standard_versions_insert on public.standard_versions; drop policy if exists standard_versions_update on public.standard_versions; drop policy if exists standard_versions_delete on public.standard_versions;
create policy standard_versions_select on public.standard_versions for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy standard_versions_insert on public.standard_versions for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy standard_versions_update on public.standard_versions for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy standard_versions_delete on public.standard_versions for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- organisms: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.organisms enable row level security;
drop policy if exists organisms_select on public.organisms; drop policy if exists organisms_insert on public.organisms; drop policy if exists organisms_update on public.organisms; drop policy if exists organisms_delete on public.organisms;
create policy organisms_select on public.organisms for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy organisms_insert on public.organisms for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy organisms_update on public.organisms for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy organisms_delete on public.organisms for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- sample_types: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.sample_types enable row level security;
drop policy if exists sample_types_select on public.sample_types; drop policy if exists sample_types_insert on public.sample_types; drop policy if exists sample_types_update on public.sample_types; drop policy if exists sample_types_delete on public.sample_types;
create policy sample_types_select on public.sample_types for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy sample_types_insert on public.sample_types for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy sample_types_update on public.sample_types for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy sample_types_delete on public.sample_types for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- industries: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.industries enable row level security;
drop policy if exists industries_select on public.industries; drop policy if exists industries_insert on public.industries; drop policy if exists industries_update on public.industries; drop policy if exists industries_delete on public.industries;
create policy industries_select on public.industries for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy industries_insert on public.industries for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy industries_update on public.industries for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy industries_delete on public.industries for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- technologies: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.technologies enable row level security;
drop policy if exists technologies_select on public.technologies; drop policy if exists technologies_insert on public.technologies; drop policy if exists technologies_update on public.technologies; drop policy if exists technologies_delete on public.technologies;
create policy technologies_select on public.technologies for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy technologies_insert on public.technologies for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy technologies_update on public.technologies for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy technologies_delete on public.technologies for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- test_types: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.test_types enable row level security;
drop policy if exists test_types_select on public.test_types; drop policy if exists test_types_insert on public.test_types; drop policy if exists test_types_update on public.test_types; drop policy if exists test_types_delete on public.test_types;
create policy test_types_select on public.test_types for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy test_types_insert on public.test_types for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy test_types_update on public.test_types for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy test_types_delete on public.test_types for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- incubation_conditions: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.incubation_conditions enable row level security;
drop policy if exists incubation_conditions_select on public.incubation_conditions; drop policy if exists incubation_conditions_insert on public.incubation_conditions; drop policy if exists incubation_conditions_update on public.incubation_conditions; drop policy if exists incubation_conditions_delete on public.incubation_conditions;
create policy incubation_conditions_select on public.incubation_conditions for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy incubation_conditions_insert on public.incubation_conditions for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy incubation_conditions_update on public.incubation_conditions for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy incubation_conditions_delete on public.incubation_conditions for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- preparation_methods: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.preparation_methods enable row level security;
drop policy if exists preparation_methods_select on public.preparation_methods; drop policy if exists preparation_methods_insert on public.preparation_methods; drop policy if exists preparation_methods_update on public.preparation_methods; drop policy if exists preparation_methods_delete on public.preparation_methods;
create policy preparation_methods_select on public.preparation_methods for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy preparation_methods_insert on public.preparation_methods for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy preparation_methods_update on public.preparation_methods for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy preparation_methods_delete on public.preparation_methods for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- product_applications: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.product_applications enable row level security;
drop policy if exists product_applications_select on public.product_applications; drop policy if exists product_applications_insert on public.product_applications; drop policy if exists product_applications_update on public.product_applications; drop policy if exists product_applications_delete on public.product_applications;
create policy product_applications_select on public.product_applications for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy product_applications_insert on public.product_applications for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_applications_update on public.product_applications for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_applications_delete on public.product_applications for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- product_methods: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.product_methods enable row level security;
drop policy if exists product_methods_select on public.product_methods; drop policy if exists product_methods_insert on public.product_methods; drop policy if exists product_methods_update on public.product_methods; drop policy if exists product_methods_delete on public.product_methods;
create policy product_methods_select on public.product_methods for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy product_methods_insert on public.product_methods for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_methods_update on public.product_methods for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_methods_delete on public.product_methods for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- product_standards: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.product_standards enable row level security;
drop policy if exists product_standards_select on public.product_standards; drop policy if exists product_standards_insert on public.product_standards; drop policy if exists product_standards_update on public.product_standards; drop policy if exists product_standards_delete on public.product_standards;
create policy product_standards_select on public.product_standards for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy product_standards_insert on public.product_standards for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_standards_update on public.product_standards for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_standards_delete on public.product_standards for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- product_organisms: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.product_organisms enable row level security;
drop policy if exists product_organisms_select on public.product_organisms; drop policy if exists product_organisms_insert on public.product_organisms; drop policy if exists product_organisms_update on public.product_organisms; drop policy if exists product_organisms_delete on public.product_organisms;
create policy product_organisms_select on public.product_organisms for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy product_organisms_insert on public.product_organisms for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_organisms_update on public.product_organisms for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_organisms_delete on public.product_organisms for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- product_sample_types: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.product_sample_types enable row level security;
drop policy if exists product_sample_types_select on public.product_sample_types; drop policy if exists product_sample_types_insert on public.product_sample_types; drop policy if exists product_sample_types_update on public.product_sample_types; drop policy if exists product_sample_types_delete on public.product_sample_types;
create policy product_sample_types_select on public.product_sample_types for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy product_sample_types_insert on public.product_sample_types for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_sample_types_update on public.product_sample_types for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_sample_types_delete on public.product_sample_types for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- product_industries: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.product_industries enable row level security;
drop policy if exists product_industries_select on public.product_industries; drop policy if exists product_industries_insert on public.product_industries; drop policy if exists product_industries_update on public.product_industries; drop policy if exists product_industries_delete on public.product_industries;
create policy product_industries_select on public.product_industries for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy product_industries_insert on public.product_industries for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_industries_update on public.product_industries for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_industries_delete on public.product_industries for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- product_technologies: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.product_technologies enable row level security;
drop policy if exists product_technologies_select on public.product_technologies; drop policy if exists product_technologies_insert on public.product_technologies; drop policy if exists product_technologies_update on public.product_technologies; drop policy if exists product_technologies_delete on public.product_technologies;
create policy product_technologies_select on public.product_technologies for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy product_technologies_insert on public.product_technologies for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_technologies_update on public.product_technologies for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_technologies_delete on public.product_technologies for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- product_test_types: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.product_test_types enable row level security;
drop policy if exists product_test_types_select on public.product_test_types; drop policy if exists product_test_types_insert on public.product_test_types; drop policy if exists product_test_types_update on public.product_test_types; drop policy if exists product_test_types_delete on public.product_test_types;
create policy product_test_types_select on public.product_test_types for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy product_test_types_insert on public.product_test_types for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_test_types_update on public.product_test_types for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy product_test_types_delete on public.product_test_types for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- supplier_profiles: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.supplier_profiles enable row level security;
drop policy if exists supplier_profiles_select on public.supplier_profiles; drop policy if exists supplier_profiles_insert on public.supplier_profiles; drop policy if exists supplier_profiles_update on public.supplier_profiles; drop policy if exists supplier_profiles_delete on public.supplier_profiles;
create policy supplier_profiles_select on public.supplier_profiles for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy supplier_profiles_insert on public.supplier_profiles for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy supplier_profiles_update on public.supplier_profiles for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy supplier_profiles_delete on public.supplier_profiles for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- distribution_agreements: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.distribution_agreements enable row level security;
drop policy if exists distribution_agreements_select on public.distribution_agreements; drop policy if exists distribution_agreements_insert on public.distribution_agreements; drop policy if exists distribution_agreements_update on public.distribution_agreements; drop policy if exists distribution_agreements_delete on public.distribution_agreements;
create policy distribution_agreements_select on public.distribution_agreements for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy distribution_agreements_insert on public.distribution_agreements for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy distribution_agreements_update on public.distribution_agreements for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy distribution_agreements_delete on public.distribution_agreements for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- supplier_listings: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.supplier_listings enable row level security;
drop policy if exists supplier_listings_select on public.supplier_listings; drop policy if exists supplier_listings_insert on public.supplier_listings; drop policy if exists supplier_listings_update on public.supplier_listings; drop policy if exists supplier_listings_delete on public.supplier_listings;
create policy supplier_listings_select on public.supplier_listings for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy supplier_listings_insert on public.supplier_listings for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy supplier_listings_update on public.supplier_listings for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy supplier_listings_delete on public.supplier_listings for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- availability_observations: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.availability_observations enable row level security;
drop policy if exists availability_observations_select on public.availability_observations; drop policy if exists availability_observations_insert on public.availability_observations; drop policy if exists availability_observations_update on public.availability_observations; drop policy if exists availability_observations_delete on public.availability_observations;
create policy availability_observations_select on public.availability_observations for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy availability_observations_insert on public.availability_observations for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy availability_observations_update on public.availability_observations for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy availability_observations_delete on public.availability_observations for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- service_capabilities: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.service_capabilities enable row level security;
drop policy if exists service_capabilities_select on public.service_capabilities; drop policy if exists service_capabilities_insert on public.service_capabilities; drop policy if exists service_capabilities_update on public.service_capabilities; drop policy if exists service_capabilities_delete on public.service_capabilities;
create policy service_capabilities_select on public.service_capabilities for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy service_capabilities_insert on public.service_capabilities for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy service_capabilities_update on public.service_capabilities for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy service_capabilities_delete on public.service_capabilities for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- country_authorizations: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.country_authorizations enable row level security;
drop policy if exists country_authorizations_select on public.country_authorizations; drop policy if exists country_authorizations_insert on public.country_authorizations; drop policy if exists country_authorizations_update on public.country_authorizations; drop policy if exists country_authorizations_delete on public.country_authorizations;
create policy country_authorizations_select on public.country_authorizations for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy country_authorizations_insert on public.country_authorizations for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy country_authorizations_update on public.country_authorizations for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy country_authorizations_delete on public.country_authorizations for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- price_observations: canonical read; tenant-private (quoted) prices visible to their tenant only; writes need owner/admin/analyst; UPDATE additionally constrained by the immutability trigger; no DELETE policy for authenticated (ledger is append-only).
alter table public.price_observations enable row level security;
drop policy if exists price_observations_select on public.price_observations; drop policy if exists price_observations_insert on public.price_observations; drop policy if exists price_observations_update on public.price_observations; drop policy if exists price_observations_delete on public.price_observations;
create policy price_observations_select on public.price_observations for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy price_observations_insert on public.price_observations for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy price_observations_update on public.price_observations for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- price_components: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.price_components enable row level security;
drop policy if exists price_components_select on public.price_components; drop policy if exists price_components_insert on public.price_components; drop policy if exists price_components_update on public.price_components; drop policy if exists price_components_delete on public.price_components;
create policy price_components_select on public.price_components for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy price_components_insert on public.price_components for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy price_components_update on public.price_components for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy price_components_delete on public.price_components for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- exchange_rate_snapshots: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.exchange_rate_snapshots enable row level security;
drop policy if exists exchange_rate_snapshots_select on public.exchange_rate_snapshots; drop policy if exists exchange_rate_snapshots_insert on public.exchange_rate_snapshots; drop policy if exists exchange_rate_snapshots_update on public.exchange_rate_snapshots; drop policy if exists exchange_rate_snapshots_delete on public.exchange_rate_snapshots;
create policy exchange_rate_snapshots_select on public.exchange_rate_snapshots for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy exchange_rate_snapshots_insert on public.exchange_rate_snapshots for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy exchange_rate_snapshots_update on public.exchange_rate_snapshots for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy exchange_rate_snapshots_delete on public.exchange_rate_snapshots for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- price_normalizations: canonical read; derived rows written by service_role; tenant-private writes need owner/admin/analyst.
alter table public.price_normalizations enable row level security;
drop policy if exists price_normalizations_select on public.price_normalizations; drop policy if exists price_normalizations_insert on public.price_normalizations; drop policy if exists price_normalizations_update on public.price_normalizations; drop policy if exists price_normalizations_delete on public.price_normalizations;
create policy price_normalizations_select on public.price_normalizations for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy price_normalizations_insert on public.price_normalizations for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy price_normalizations_update on public.price_normalizations for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy price_normalizations_delete on public.price_normalizations for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- price_benchmarks: canonical read; derived rows written by service_role; tenant-private writes need owner/admin/analyst.
alter table public.price_benchmarks enable row level security;
drop policy if exists price_benchmarks_select on public.price_benchmarks; drop policy if exists price_benchmarks_insert on public.price_benchmarks; drop policy if exists price_benchmarks_update on public.price_benchmarks; drop policy if exists price_benchmarks_delete on public.price_benchmarks;
create policy price_benchmarks_select on public.price_benchmarks for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy price_benchmarks_insert on public.price_benchmarks for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy price_benchmarks_update on public.price_benchmarks for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy price_benchmarks_delete on public.price_benchmarks for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- tenders: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.tenders enable row level security;
drop policy if exists tenders_select on public.tenders; drop policy if exists tenders_insert on public.tenders; drop policy if exists tenders_update on public.tenders; drop policy if exists tenders_delete on public.tenders;
create policy tenders_select on public.tenders for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy tenders_insert on public.tenders for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy tenders_update on public.tenders for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy tenders_delete on public.tenders for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- tender_buyers: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.tender_buyers enable row level security;
drop policy if exists tender_buyers_select on public.tender_buyers; drop policy if exists tender_buyers_insert on public.tender_buyers; drop policy if exists tender_buyers_update on public.tender_buyers; drop policy if exists tender_buyers_delete on public.tender_buyers;
create policy tender_buyers_select on public.tender_buyers for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy tender_buyers_insert on public.tender_buyers for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy tender_buyers_update on public.tender_buyers for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy tender_buyers_delete on public.tender_buyers for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- tender_lots: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.tender_lots enable row level security;
drop policy if exists tender_lots_select on public.tender_lots; drop policy if exists tender_lots_insert on public.tender_lots; drop policy if exists tender_lots_update on public.tender_lots; drop policy if exists tender_lots_delete on public.tender_lots;
create policy tender_lots_select on public.tender_lots for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy tender_lots_insert on public.tender_lots for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy tender_lots_update on public.tender_lots for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy tender_lots_delete on public.tender_lots for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- tender_items: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.tender_items enable row level security;
drop policy if exists tender_items_select on public.tender_items; drop policy if exists tender_items_insert on public.tender_items; drop policy if exists tender_items_update on public.tender_items; drop policy if exists tender_items_delete on public.tender_items;
create policy tender_items_select on public.tender_items for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy tender_items_insert on public.tender_items for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy tender_items_update on public.tender_items for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy tender_items_delete on public.tender_items for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- tender_bidders: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.tender_bidders enable row level security;
drop policy if exists tender_bidders_select on public.tender_bidders; drop policy if exists tender_bidders_insert on public.tender_bidders; drop policy if exists tender_bidders_update on public.tender_bidders; drop policy if exists tender_bidders_delete on public.tender_bidders;
create policy tender_bidders_select on public.tender_bidders for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy tender_bidders_insert on public.tender_bidders for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy tender_bidders_update on public.tender_bidders for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy tender_bidders_delete on public.tender_bidders for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- tender_awards: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.tender_awards enable row level security;
drop policy if exists tender_awards_select on public.tender_awards; drop policy if exists tender_awards_insert on public.tender_awards; drop policy if exists tender_awards_update on public.tender_awards; drop policy if exists tender_awards_delete on public.tender_awards;
create policy tender_awards_select on public.tender_awards for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy tender_awards_insert on public.tender_awards for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy tender_awards_update on public.tender_awards for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy tender_awards_delete on public.tender_awards for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- tender_documents: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.tender_documents enable row level security;
drop policy if exists tender_documents_select on public.tender_documents; drop policy if exists tender_documents_insert on public.tender_documents; drop policy if exists tender_documents_update on public.tender_documents; drop policy if exists tender_documents_delete on public.tender_documents;
create policy tender_documents_select on public.tender_documents for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy tender_documents_insert on public.tender_documents for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy tender_documents_update on public.tender_documents for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy tender_documents_delete on public.tender_documents for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- tender_events: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.tender_events enable row level security;
drop policy if exists tender_events_select on public.tender_events; drop policy if exists tender_events_insert on public.tender_events; drop policy if exists tender_events_update on public.tender_events; drop policy if exists tender_events_delete on public.tender_events;
create policy tender_events_select on public.tender_events for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy tender_events_insert on public.tender_events for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy tender_events_update on public.tender_events for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy tender_events_delete on public.tender_events for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- asset_models: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.asset_models enable row level security;
drop policy if exists asset_models_select on public.asset_models; drop policy if exists asset_models_insert on public.asset_models; drop policy if exists asset_models_update on public.asset_models; drop policy if exists asset_models_delete on public.asset_models;
create policy asset_models_select on public.asset_models for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy asset_models_insert on public.asset_models for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy asset_models_update on public.asset_models for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy asset_models_delete on public.asset_models for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- consumable_compatibilities: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.consumable_compatibilities enable row level security;
drop policy if exists consumable_compatibilities_select on public.consumable_compatibilities; drop policy if exists consumable_compatibilities_insert on public.consumable_compatibilities; drop policy if exists consumable_compatibilities_update on public.consumable_compatibilities; drop policy if exists consumable_compatibilities_delete on public.consumable_compatibilities;
create policy consumable_compatibilities_select on public.consumable_compatibilities for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy consumable_compatibilities_insert on public.consumable_compatibilities for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy consumable_compatibilities_update on public.consumable_compatibilities for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy consumable_compatibilities_delete on public.consumable_compatibilities for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- sources: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.sources enable row level security;
drop policy if exists sources_select on public.sources; drop policy if exists sources_insert on public.sources; drop policy if exists sources_update on public.sources; drop policy if exists sources_delete on public.sources;
create policy sources_select on public.sources for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy sources_insert on public.sources for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy sources_update on public.sources for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy sources_delete on public.sources for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- source_documents: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.source_documents enable row level security;
drop policy if exists source_documents_select on public.source_documents; drop policy if exists source_documents_insert on public.source_documents; drop policy if exists source_documents_update on public.source_documents; drop policy if exists source_documents_delete on public.source_documents;
create policy source_documents_select on public.source_documents for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy source_documents_insert on public.source_documents for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy source_documents_update on public.source_documents for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy source_documents_delete on public.source_documents for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- source_snapshots: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.source_snapshots enable row level security;
drop policy if exists source_snapshots_select on public.source_snapshots; drop policy if exists source_snapshots_insert on public.source_snapshots; drop policy if exists source_snapshots_update on public.source_snapshots; drop policy if exists source_snapshots_delete on public.source_snapshots;
create policy source_snapshots_select on public.source_snapshots for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy source_snapshots_insert on public.source_snapshots for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy source_snapshots_update on public.source_snapshots for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy source_snapshots_delete on public.source_snapshots for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- claims: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.claims enable row level security;
drop policy if exists claims_select on public.claims; drop policy if exists claims_insert on public.claims; drop policy if exists claims_update on public.claims; drop policy if exists claims_delete on public.claims;
create policy claims_select on public.claims for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy claims_insert on public.claims for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy claims_update on public.claims for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy claims_delete on public.claims for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- claim_evidence_links: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.claim_evidence_links enable row level security;
drop policy if exists claim_evidence_links_select on public.claim_evidence_links; drop policy if exists claim_evidence_links_insert on public.claim_evidence_links; drop policy if exists claim_evidence_links_update on public.claim_evidence_links; drop policy if exists claim_evidence_links_delete on public.claim_evidence_links;
create policy claim_evidence_links_select on public.claim_evidence_links for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy claim_evidence_links_insert on public.claim_evidence_links for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy claim_evidence_links_update on public.claim_evidence_links for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy claim_evidence_links_delete on public.claim_evidence_links for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- data_quality_issues: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.data_quality_issues enable row level security;
drop policy if exists data_quality_issues_select on public.data_quality_issues; drop policy if exists data_quality_issues_insert on public.data_quality_issues; drop policy if exists data_quality_issues_update on public.data_quality_issues; drop policy if exists data_quality_issues_delete on public.data_quality_issues;
create policy data_quality_issues_select on public.data_quality_issues for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy data_quality_issues_insert on public.data_quality_issues for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy data_quality_issues_update on public.data_quality_issues for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy data_quality_issues_delete on public.data_quality_issues for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- duplicate_candidates: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.duplicate_candidates enable row level security;
drop policy if exists duplicate_candidates_select on public.duplicate_candidates; drop policy if exists duplicate_candidates_insert on public.duplicate_candidates; drop policy if exists duplicate_candidates_update on public.duplicate_candidates; drop policy if exists duplicate_candidates_delete on public.duplicate_candidates;
create policy duplicate_candidates_select on public.duplicate_candidates for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy duplicate_candidates_insert on public.duplicate_candidates for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy duplicate_candidates_update on public.duplicate_candidates for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy duplicate_candidates_delete on public.duplicate_candidates for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- external_entity_references: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.external_entity_references enable row level security;
drop policy if exists external_entity_references_select on public.external_entity_references; drop policy if exists external_entity_references_insert on public.external_entity_references; drop policy if exists external_entity_references_update on public.external_entity_references; drop policy if exists external_entity_references_delete on public.external_entity_references;
create policy external_entity_references_select on public.external_entity_references for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy external_entity_references_insert on public.external_entity_references for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy external_entity_references_update on public.external_entity_references for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy external_entity_references_delete on public.external_entity_references for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- equivalence_records: canonical read; tenant-private writes need owner/admin/analyst.
alter table public.equivalence_records enable row level security;
drop policy if exists equivalence_records_select on public.equivalence_records; drop policy if exists equivalence_records_insert on public.equivalence_records; drop policy if exists equivalence_records_update on public.equivalence_records; drop policy if exists equivalence_records_delete on public.equivalence_records;
create policy equivalence_records_select on public.equivalence_records for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy equivalence_records_insert on public.equivalence_records for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy equivalence_records_update on public.equivalence_records for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));
create policy equivalence_records_delete on public.equivalence_records for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,analyst}'));

-- ===========================================================================
-- GROUP 2 — review / publish workflow tables (5)
-- SELECT: canonical or member-of-tenant; WRITE: tenant-private +
-- has_tenant_role('{owner,admin,reviewer}').
-- ===========================================================================

-- evidence_reviews: canonical read; review actions require owner/admin/reviewer.
alter table public.evidence_reviews enable row level security;
drop policy if exists evidence_reviews_select on public.evidence_reviews; drop policy if exists evidence_reviews_insert on public.evidence_reviews; drop policy if exists evidence_reviews_update on public.evidence_reviews; drop policy if exists evidence_reviews_delete on public.evidence_reviews;
create policy evidence_reviews_select on public.evidence_reviews for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy evidence_reviews_insert on public.evidence_reviews for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,reviewer}'));
create policy evidence_reviews_update on public.evidence_reviews for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,reviewer}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,reviewer}'));
create policy evidence_reviews_delete on public.evidence_reviews for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,reviewer}'));

-- review_assignments: canonical read; assignment actions require owner/admin/reviewer.
alter table public.review_assignments enable row level security;
drop policy if exists review_assignments_select on public.review_assignments; drop policy if exists review_assignments_insert on public.review_assignments; drop policy if exists review_assignments_update on public.review_assignments; drop policy if exists review_assignments_delete on public.review_assignments;
create policy review_assignments_select on public.review_assignments for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy review_assignments_insert on public.review_assignments for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,reviewer}'));
create policy review_assignments_update on public.review_assignments for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,reviewer}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,reviewer}'));
create policy review_assignments_delete on public.review_assignments for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,reviewer}'));

-- change_requests: canonical read; publish requests/decisions require owner/admin/reviewer.
alter table public.change_requests enable row level security;
drop policy if exists change_requests_select on public.change_requests; drop policy if exists change_requests_insert on public.change_requests; drop policy if exists change_requests_update on public.change_requests; drop policy if exists change_requests_delete on public.change_requests;
create policy change_requests_select on public.change_requests for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy change_requests_insert on public.change_requests for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,reviewer}'));
create policy change_requests_update on public.change_requests for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,reviewer}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,reviewer}'));
create policy change_requests_delete on public.change_requests for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,reviewer}'));

-- entity_merge_events: canonical read; merge actions require owner/admin/reviewer.
alter table public.entity_merge_events enable row level security;
drop policy if exists entity_merge_events_select on public.entity_merge_events; drop policy if exists entity_merge_events_insert on public.entity_merge_events; drop policy if exists entity_merge_events_update on public.entity_merge_events; drop policy if exists entity_merge_events_delete on public.entity_merge_events;
create policy entity_merge_events_select on public.entity_merge_events for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy entity_merge_events_insert on public.entity_merge_events for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,reviewer}'));
create policy entity_merge_events_update on public.entity_merge_events for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,reviewer}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,reviewer}'));
create policy entity_merge_events_delete on public.entity_merge_events for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,reviewer}'));

-- price_review_events: canonical read; review actions require owner/admin/reviewer.
alter table public.price_review_events enable row level security;
drop policy if exists price_review_events_select on public.price_review_events; drop policy if exists price_review_events_insert on public.price_review_events; drop policy if exists price_review_events_update on public.price_review_events; drop policy if exists price_review_events_delete on public.price_review_events;
create policy price_review_events_select on public.price_review_events for select to authenticated using (visibility = 'canonical' or (visibility = 'tenant_private' and public.is_tenant_member(tenant_id)));
create policy price_review_events_insert on public.price_review_events for insert to authenticated with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,reviewer}'));
create policy price_review_events_update on public.price_review_events for update to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,reviewer}')) with check (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,reviewer}'));
create policy price_review_events_delete on public.price_review_events for delete to authenticated using (visibility = 'tenant_private' and public.has_tenant_role(tenant_id, '{owner,admin,reviewer}'));

-- ===========================================================================
-- GROUP 3 — tenant-scoped tables (37)
-- All operations require is_tenant_member(tenant_id). One FOR ALL policy per
-- table (members read and write their own tenant's rows; the publish
-- pipeline moves data to canonical via service_role).
-- ===========================================================================

-- people: tenant members only (PII; CHECK locks visibility='tenant_private').
alter table public.people enable row level security;
drop policy if exists people_member_all on public.people;
create policy people_member_all on public.people for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- person_aliases: tenant members only.
alter table public.person_aliases enable row level security;
drop policy if exists person_aliases_member_all on public.person_aliases;
create policy person_aliases_member_all on public.person_aliases for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- employment_relationships: tenant members only.
alter table public.employment_relationships enable row level security;
drop policy if exists employment_relationships_member_all on public.employment_relationships;
create policy employment_relationships_member_all on public.employment_relationships for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- professional_roles: tenant members only.
alter table public.professional_roles enable row level security;
drop policy if exists professional_roles_member_all on public.professional_roles;
create policy professional_roles_member_all on public.professional_roles for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- organization_contacts: tenant members only (PII; CHECK locks visibility='tenant_private').
alter table public.organization_contacts enable row level security;
drop policy if exists organization_contacts_member_all on public.organization_contacts;
create policy organization_contacts_member_all on public.organization_contacts for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- contact_observations: tenant members only (PII; CHECK locks visibility='tenant_private').
alter table public.contact_observations enable row level security;
drop policy if exists contact_observations_member_all on public.contact_observations;
create policy contact_observations_member_all on public.contact_observations for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- stock_observations: tenant members only.
alter table public.stock_observations enable row level security;
drop policy if exists stock_observations_member_all on public.stock_observations;
create policy stock_observations_member_all on public.stock_observations for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- lead_time_observations: tenant members only.
alter table public.lead_time_observations enable row level security;
drop policy if exists lead_time_observations_member_all on public.lead_time_observations;
create policy lead_time_observations_member_all on public.lead_time_observations for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- commercial_terms: tenant members only.
alter table public.commercial_terms enable row level security;
drop policy if exists commercial_terms_member_all on public.commercial_terms;
create policy commercial_terms_member_all on public.commercial_terms for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- installed_assets: tenant members only.
alter table public.installed_assets enable row level security;
drop policy if exists installed_assets_member_all on public.installed_assets;
create policy installed_assets_member_all on public.installed_assets for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- asset_locations: tenant members only.
alter table public.asset_locations enable row level security;
drop policy if exists asset_locations_member_all on public.asset_locations;
create policy asset_locations_member_all on public.asset_locations for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- asset_lifecycle_events: tenant members only.
alter table public.asset_lifecycle_events enable row level security;
drop policy if exists asset_lifecycle_events_member_all on public.asset_lifecycle_events;
create policy asset_lifecycle_events_member_all on public.asset_lifecycle_events for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- maintenance_events: tenant members only.
alter table public.maintenance_events enable row level security;
drop policy if exists maintenance_events_member_all on public.maintenance_events;
create policy maintenance_events_member_all on public.maintenance_events for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- qualification_events: tenant members only.
alter table public.qualification_events enable row level security;
drop policy if exists qualification_events_member_all on public.qualification_events;
create policy qualification_events_member_all on public.qualification_events for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- consumption_models: tenant members only.
alter table public.consumption_models enable row level security;
drop policy if exists consumption_models_member_all on public.consumption_models;
create policy consumption_models_member_all on public.consumption_models for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- replacement_assumptions: tenant members only.
alter table public.replacement_assumptions enable row level security;
drop policy if exists replacement_assumptions_member_all on public.replacement_assumptions;
create policy replacement_assumptions_member_all on public.replacement_assumptions for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- vendor_approvals: tenant members only.
alter table public.vendor_approvals enable row level security;
drop policy if exists vendor_approvals_member_all on public.vendor_approvals;
create policy vendor_approvals_member_all on public.vendor_approvals for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- product_validations: tenant members only.
alter table public.product_validations enable row level security;
drop policy if exists product_validations_member_all on public.product_validations;
create policy product_validations_member_all on public.product_validations for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- method_validations: tenant members only.
alter table public.method_validations enable row level security;
drop policy if exists method_validations_member_all on public.method_validations;
create policy method_validations_member_all on public.method_validations for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- trial_events: tenant members only.
alter table public.trial_events enable row level security;
drop policy if exists trial_events_member_all on public.trial_events;
create policy trial_events_member_all on public.trial_events for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- qualification_statuses: tenant members only.
alter table public.qualification_statuses enable row level security;
drop policy if exists qualification_statuses_member_all on public.qualification_statuses;
create policy qualification_statuses_member_all on public.qualification_statuses for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- validation_evidence: tenant members only.
alter table public.validation_evidence enable row level security;
drop policy if exists validation_evidence_member_all on public.validation_evidence;
create policy validation_evidence_member_all on public.validation_evidence for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- research_projects: tenant members only.
alter table public.research_projects enable row level security;
drop policy if exists research_projects_member_all on public.research_projects;
create policy research_projects_member_all on public.research_projects for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- research_questions: tenant members only.
alter table public.research_questions enable row level security;
drop policy if exists research_questions_member_all on public.research_questions;
create policy research_questions_member_all on public.research_questions for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- research_collections: tenant members only.
alter table public.research_collections enable row level security;
drop policy if exists research_collections_member_all on public.research_collections;
create policy research_collections_member_all on public.research_collections for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- saved_views: tenant members only.
alter table public.saved_views enable row level security;
drop policy if exists saved_views_member_all on public.saved_views;
create policy saved_views_member_all on public.saved_views for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- research_notes: tenant members only.
alter table public.research_notes enable row level security;
drop policy if exists research_notes_member_all on public.research_notes;
create policy research_notes_member_all on public.research_notes for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- research_findings: tenant members only.
alter table public.research_findings enable row level security;
drop policy if exists research_findings_member_all on public.research_findings;
create policy research_findings_member_all on public.research_findings for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- research_exports: tenant members only.
alter table public.research_exports enable row level security;
drop policy if exists research_exports_member_all on public.research_exports;
create policy research_exports_member_all on public.research_exports for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- research_project_entities: tenant members only.
alter table public.research_project_entities enable row level security;
drop policy if exists research_project_entities_member_all on public.research_project_entities;
create policy research_project_entities_member_all on public.research_project_entities for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- cost_per_test_scenarios: tenant members only.
alter table public.cost_per_test_scenarios enable row level security;
drop policy if exists cost_per_test_scenarios_member_all on public.cost_per_test_scenarios;
create policy cost_per_test_scenarios_member_all on public.cost_per_test_scenarios for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- opportunity_signals: tenant members only.
alter table public.opportunity_signals enable row level security;
drop policy if exists opportunity_signals_member_all on public.opportunity_signals;
create policy opportunity_signals_member_all on public.opportunity_signals for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- outbound_handoff_records: tenant members only.
alter table public.outbound_handoff_records enable row level security;
drop policy if exists outbound_handoff_records_member_all on public.outbound_handoff_records;
create policy outbound_handoff_records_member_all on public.outbound_handoff_records for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- integration_sync_events: tenant members only.
alter table public.integration_sync_events enable row level security;
drop policy if exists integration_sync_events_member_all on public.integration_sync_events;
create policy integration_sync_events_member_all on public.integration_sync_events for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- integration_errors: tenant members only.
alter table public.integration_errors enable row level security;
drop policy if exists integration_errors_member_all on public.integration_errors;
create policy integration_errors_member_all on public.integration_errors for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- import_batches: tenant members only.
alter table public.import_batches enable row level security;
drop policy if exists import_batches_member_all on public.import_batches;
create policy import_batches_member_all on public.import_batches for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- import_staging_rows: tenant members only.
alter table public.import_staging_rows enable row level security;
drop policy if exists import_staging_rows_member_all on public.import_staging_rows;
create policy import_staging_rows_member_all on public.import_staging_rows for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- ===========================================================================
-- GROUP 4 — special tables (6)
-- ===========================================================================

-- tenants: members see their own tenant; any authenticated user may create a
-- tenant (onboarding); only owner/admin may rename/modify; deletion is
-- service-role only (no delete policy).
alter table public.tenants enable row level security;
drop policy if exists tenants_select on public.tenants; drop policy if exists tenants_insert on public.tenants; drop policy if exists tenants_update on public.tenants; drop policy if exists tenants_delete on public.tenants;
create policy tenants_select on public.tenants for select to authenticated using (public.is_tenant_member(id));
create policy tenants_insert on public.tenants for insert to authenticated with check (true);
create policy tenants_update on public.tenants for update to authenticated using (public.has_tenant_role(id, '{owner,admin}')) with check (public.has_tenant_role(id, '{owner,admin}'));

-- profiles: a user sees/edits their own profile, and sees profiles of users
-- who share any tenant (for member pickers). No delete policy: profile
-- removal happens via auth.users cascade (service role).
alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles; drop policy if exists profiles_insert on public.profiles; drop policy if exists profiles_update on public.profiles; drop policy if exists profiles_delete on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (
  user_id = auth.uid()
  or exists (select 1
             from public.tenant_memberships mine
             join public.tenant_memberships theirs on theirs.tenant_id = mine.tenant_id
             where mine.user_id = auth.uid()
               and theirs.user_id = profiles.user_id));
create policy profiles_insert on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- tenant_memberships: members see their tenant's roster; a user may add
-- themselves (accepting an invite / bootstrapping a new tenant), otherwise
-- membership changes require owner/admin.
alter table public.tenant_memberships enable row level security;
drop policy if exists tenant_memberships_select on public.tenant_memberships; drop policy if exists tenant_memberships_insert on public.tenant_memberships; drop policy if exists tenant_memberships_update on public.tenant_memberships; drop policy if exists tenant_memberships_delete on public.tenant_memberships;
create policy tenant_memberships_select on public.tenant_memberships for select to authenticated using (public.is_tenant_member(tenant_id));
create policy tenant_memberships_insert on public.tenant_memberships for insert to authenticated with check (user_id = auth.uid() or public.has_tenant_role(tenant_id, '{owner,admin}'));
create policy tenant_memberships_update on public.tenant_memberships for update to authenticated using (public.has_tenant_role(tenant_id, '{owner,admin}')) with check (public.has_tenant_role(tenant_id, '{owner,admin}'));
create policy tenant_memberships_delete on public.tenant_memberships for delete to authenticated using (public.has_tenant_role(tenant_id, '{owner,admin}'));

-- api_clients: members may list their tenant's API clients; create/rotate/
-- revoke requires owner/admin.
alter table public.api_clients enable row level security;
drop policy if exists api_clients_select on public.api_clients; drop policy if exists api_clients_insert on public.api_clients; drop policy if exists api_clients_update on public.api_clients; drop policy if exists api_clients_delete on public.api_clients;
create policy api_clients_select on public.api_clients for select to authenticated using (public.is_tenant_member(tenant_id));
create policy api_clients_insert on public.api_clients for insert to authenticated with check (public.has_tenant_role(tenant_id, '{owner,admin}'));
create policy api_clients_update on public.api_clients for update to authenticated using (public.has_tenant_role(tenant_id, '{owner,admin}')) with check (public.has_tenant_role(tenant_id, '{owner,admin}'));
create policy api_clients_delete on public.api_clients for delete to authenticated using (public.has_tenant_role(tenant_id, '{owner,admin}'));

-- integration_connections: members may view connection status; configuration
-- changes require owner/admin.
alter table public.integration_connections enable row level security;
drop policy if exists integration_connections_select on public.integration_connections; drop policy if exists integration_connections_insert on public.integration_connections; drop policy if exists integration_connections_update on public.integration_connections; drop policy if exists integration_connections_delete on public.integration_connections;
create policy integration_connections_select on public.integration_connections for select to authenticated using (public.is_tenant_member(tenant_id));
create policy integration_connections_insert on public.integration_connections for insert to authenticated with check (public.has_tenant_role(tenant_id, '{owner,admin}'));
create policy integration_connections_update on public.integration_connections for update to authenticated using (public.has_tenant_role(tenant_id, '{owner,admin}')) with check (public.has_tenant_role(tenant_id, '{owner,admin}'));
create policy integration_connections_delete on public.integration_connections for delete to authenticated using (public.has_tenant_role(tenant_id, '{owner,admin}'));

-- audit_log: SELECT only (insert/update/delete grants revoked above; writes
-- happen exclusively through the SECURITY DEFINER touch_audit_log() trigger).
-- Platform-level entries (tenant_id IS NULL) are readable by all
-- authenticated users; tenant entries by that tenant's members.
alter table public.audit_log enable row level security;
drop policy if exists audit_log_select on public.audit_log; drop policy if exists audit_log_insert on public.audit_log; drop policy if exists audit_log_update on public.audit_log; drop policy if exists audit_log_delete on public.audit_log;
create policy audit_log_select on public.audit_log for select to authenticated using (tenant_id is null or public.is_tenant_member(tenant_id));
