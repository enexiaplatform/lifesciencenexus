-- 20260727000008_indexes_search.sql
-- Search & performance indexes: pg_trgm GIN on name/alias/catalogue columns,
-- FTS tsvector generated columns on the main searchable tables, supporting
-- btree indexes on hot query paths, and the federated search_entities()
-- function skeleton. Idempotent: safe to re-run.
--
-- Note: trigram operators (% / similarity()) and gin_trgm_ops come from
-- pg_trgm (installed in 20260727000000). On Supabase the extension lives in
-- the `extensions` schema, which is on the default search_path.

-- ---------------------------------------------------------------------------
-- Trigram GIN indexes (fuzzy name / alias / catalogue-number matching)
-- ---------------------------------------------------------------------------

create index if not exists idx_organizations_name_trgm on public.organizations using gin (name gin_trgm_ops);
create index if not exists idx_organization_aliases_alias_trgm on public.organization_aliases using gin (alias gin_trgm_ops);
create index if not exists idx_sites_name_trgm on public.sites using gin (name gin_trgm_ops);
create index if not exists idx_site_aliases_alias_trgm on public.site_aliases using gin (alias gin_trgm_ops);
create index if not exists idx_people_full_name_trgm on public.people using gin (full_name gin_trgm_ops);
create index if not exists idx_person_aliases_alias_trgm on public.person_aliases using gin (alias gin_trgm_ops);
create index if not exists idx_brands_name_trgm on public.brands using gin (name gin_trgm_ops);
create index if not exists idx_product_families_name_trgm on public.product_families using gin (name gin_trgm_ops);
create index if not exists idx_products_name_trgm on public.products using gin (name gin_trgm_ops);
create index if not exists idx_skus_name_trgm on public.skus using gin (name gin_trgm_ops);
create index if not exists idx_skus_catalogue_number_trgm on public.skus using gin (catalogue_number gin_trgm_ops);
create index if not exists idx_standards_title_trgm on public.standards using gin (title gin_trgm_ops);
create index if not exists idx_sources_title_trgm on public.sources using gin (title gin_trgm_ops);
create index if not exists idx_organisms_species_trgm on public.organisms using gin ((genus || ' ' || species) gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Full-text search: generated tsvector columns + GIN indexes
-- ---------------------------------------------------------------------------

alter table public.organizations
  add column if not exists search_vector tsvector
  generated always as (to_tsvector('english', coalesce(name, ''))) stored;
create index if not exists idx_organizations_search on public.organizations using gin (search_vector);

alter table public.products
  add column if not exists search_vector tsvector
  generated always as (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))) stored;
create index if not exists idx_products_search on public.products using gin (search_vector);

alter table public.skus
  add column if not exists search_vector tsvector
  generated always as (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(catalogue_number, ''))) stored;
create index if not exists idx_skus_search on public.skus using gin (search_vector);

alter table public.sources
  add column if not exists search_vector tsvector
  generated always as (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(publisher, '') || ' ' || coalesce(notes, ''))) stored;
create index if not exists idx_sources_search on public.sources using gin (search_vector);

-- ---------------------------------------------------------------------------
-- Uniqueness helpers (partial, NULL-tolerant natural keys)
-- ---------------------------------------------------------------------------

create unique index if not exists idx_skus_product_catalogue_number
  on public.skus (product_id, catalogue_number)
  where catalogue_number is not null;

create unique index if not exists idx_organisms_strain
  on public.organisms (genus, species, strain_code)
  where strain_code is not null;

-- ---------------------------------------------------------------------------
-- Supporting btree indexes on hot query paths
-- ---------------------------------------------------------------------------

create index if not exists idx_tenant_memberships_user on public.tenant_memberships (user_id);
create index if not exists idx_people_tenant on public.people (tenant_id);
create index if not exists idx_organization_contacts_tenant on public.organization_contacts (tenant_id);
create index if not exists idx_sites_organization on public.sites (organization_id);
create index if not exists idx_products_family on public.products (family_id);
create index if not exists idx_skus_product on public.skus (product_id);
create index if not exists idx_price_observations_sku on public.price_observations (sku_id);
create index if not exists idx_price_observations_tenant on public.price_observations (tenant_id);
create index if not exists idx_price_observations_date on public.price_observations (observation_date);
create index if not exists idx_supplier_listings_sku on public.supplier_listings (sku_id);
create index if not exists idx_tender_items_lot on public.tender_items (lot_id);
create index if not exists idx_tender_lots_tender on public.tender_lots (tender_id);
create index if not exists idx_installed_assets_tenant on public.installed_assets (tenant_id);
create index if not exists idx_claims_subject on public.claims (subject_entity_type, subject_entity_id);
create index if not exists idx_claims_review_status on public.claims (review_status) where archived_at is null;
create index if not exists idx_audit_log_tenant_at on public.audit_log (tenant_id, at);
create index if not exists idx_external_entity_references_nexus on public.external_entity_references (nexus_entity_type, nexus_entity_id);
create index if not exists idx_research_project_entities_project on public.research_project_entities (project_id);
create index if not exists idx_opportunity_signals_tenant_status on public.opportunity_signals (tenant_id, status);
create index if not exists idx_import_staging_rows_batch on public.import_staging_rows (batch_id);

-- ---------------------------------------------------------------------------
-- Federated search skeleton
-- ---------------------------------------------------------------------------

-- Simple federated LIKE/trigram search across the main canonical tables.
-- Canonical rows only (visibility='canonical'): the function runs as the
-- caller (SECURITY INVOKER), so RLS still applies, and tenant-private rows
-- are additionally excluded by the explicit visibility filter — federated
-- search is a canonical-layer feature. Deeper semantic search is deferred
-- (pgvector decision pending a proven use case).
create or replace function public.search_entities(query text, result_limit integer default 20)
returns table (entity_type text, id uuid, title text, subtitle text, similarity real)
language sql
stable
security invoker
set search_path = public
as $$
  select s.entity_type, s.id, s.title, s.subtitle, s.sim
  from (
    select 'organization'::text as entity_type, o.id, o.name as title,
           o.country as subtitle, similarity(o.name, query) as sim
    from public.organizations o
    where o.archived_at is null and o.visibility = 'canonical'
      and (o.name % query or o.name ilike '%' || query || '%')
    union all
    select 'product', p.id, p.name, p.category, similarity(p.name, query)
    from public.products p
    where p.archived_at is null and p.visibility = 'canonical'
      and (p.name % query or p.name ilike '%' || query || '%')
    union all
    select 'sku', k.id, k.name, k.catalogue_number,
           greatest(similarity(k.name, query),
                    similarity(coalesce(k.catalogue_number, ''), query))
    from public.skus k
    where k.archived_at is null and k.visibility = 'canonical'
      and (k.name % query or k.catalogue_number % query
           or k.name ilike '%' || query || '%'
           or k.catalogue_number ilike '%' || query || '%')
    union all
    select 'brand', b.id, b.name, null::text, similarity(b.name, query)
    from public.brands b
    where b.archived_at is null and b.visibility = 'canonical'
      and (b.name % query or b.name ilike '%' || query || '%')
    union all
    select 'standard', st.id, st.body || ' ' || st.code, st.title,
           greatest(similarity(st.code, query), similarity(st.title, query))
    from public.standards st
    where st.archived_at is null and st.visibility = 'canonical'
      and (st.code % query or st.title % query
           or st.code ilike '%' || query || '%'
           or st.title ilike '%' || query || '%')
    union all
    select 'source', so.id, so.title, so.publisher, similarity(so.title, query)
    from public.sources so
    where so.archived_at is null and so.visibility = 'canonical'
      and (so.title % query or so.title ilike '%' || query || '%')
  ) s
  order by s.sim desc
  limit result_limit;
$$;

comment on function public.search_entities(text, integer) is
  'Federated trigram/ILIKE search over canonical organizations, products, skus, brands, standards, sources. Returns (entity_type, id, title, subtitle, similarity).';
