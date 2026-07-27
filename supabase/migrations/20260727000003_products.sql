-- 20260727000003_products.sql
-- Product domain: brands, families, products, SKUs, packs, formats, documents;
-- scientific/regulatory reference entities (applications, methods, standards,
-- organisms, …); and the evidence-carrying product<->domain edge tables.
-- Column names are snake_case mirrors of src/lib/domain/types.ts.
-- Idempotent: safe to re-run.
--
-- Every edge table (product_applications … product_test_types) carries the
-- flattened EdgeEvidence set: source_id, confidence (0-1), valid_from,
-- valid_to, reviewer_id, notes, evidence_state. source_id FKs to
-- public.sources are added in 20260727000007 (sources is created there).

-- ---------------------------------------------------------------------------
-- brands / product_families / products
-- ---------------------------------------------------------------------------

-- A brand owned by an organization.
create table if not exists public.brands (
  id                     uuid primary key default gen_random_uuid(),
  owner_organization_id  uuid not null references public.organizations (id),
  name                   text not null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  created_by             uuid references auth.users (id),
  updated_by             uuid references auth.users (id),
  visibility             text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo                boolean not null default false,
  archived_at            timestamptz,
  tenant_id              uuid references public.tenants (id),
  constraint brands_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.brands is 'Brand owned by an organization.';
create or replace trigger trg_brands_set_updated_at before update on public.brands for each row execute function public.set_updated_at();

-- A product family inside a brand, classified into the category verticals.
create table if not exists public.product_families (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid not null references public.brands (id),
  name        text not null,
  category    text not null check (category in (
                'dehydrated_culture_media', 'ready_prepared_media',
                'microbial_reference_materials', 'sterility_testing_consumables',
                'environmental_monitoring_consumables', 'biological_indicators',
                'air_samplers', 'particle_counters', 'sterility_testing_equipment',
                'microbiology_lab_accessories', 'other')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  constraint product_families_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.product_families is 'Product family within a brand; category constrained to PRODUCT_CATEGORIES.';
create or replace trigger trg_product_families_set_updated_at before update on public.product_families for each row execute function public.set_updated_at();

-- Canonical product node.
create table if not exists public.products (
  id                            uuid primary key default gen_random_uuid(),
  slug                          text unique,    -- human-readable secondary identifier
  family_id                     uuid not null references public.product_families (id),
  manufacturer_organization_id  uuid not null references public.organizations (id),
  name                          text not null,
  category                      text not null check (category in (
                                  'dehydrated_culture_media', 'ready_prepared_media',
                                  'microbial_reference_materials', 'sterility_testing_consumables',
                                  'environmental_monitoring_consumables', 'biological_indicators',
                                  'air_samplers', 'particle_counters', 'sterility_testing_equipment',
                                  'microbiology_lab_accessories', 'other')),
  description                   text,
  status                        text not null default 'unknown' check (status in ('active', 'discontinued', 'unknown')),
  successor_product_id          uuid references public.products (id),
  predecessor_product_id        uuid references public.products (id),
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  created_by                    uuid references auth.users (id),
  updated_by                    uuid references auth.users (id),
  visibility                    text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo                       boolean not null default false,
  archived_at                   timestamptz,
  tenant_id                     uuid references public.tenants (id),
  constraint products_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.products is 'Canonical product node with lifecycle status and successor/predecessor links.';
create or replace trigger trg_products_set_updated_at before update on public.products for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- product_status_history
-- ---------------------------------------------------------------------------

-- Append-only trail of product status transitions (active/discontinued).
create table if not exists public.product_status_history (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id),
  from_status text check (from_status in ('active', 'discontinued', 'unknown')),
  to_status   text not null check (to_status in ('active', 'discontinued', 'unknown')),
  changed_at  timestamptz not null default now(),
  reason      text,
  source_id   uuid,                             -- FK to public.sources added in 20260727000007
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  constraint product_status_history_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.product_status_history is 'Append-only product status transition trail.';
create or replace trigger trg_product_status_history_set_updated_at before update on public.product_status_history for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- product_relationships
-- ---------------------------------------------------------------------------

-- Evidence-carrying product-to-product edge (successor, variant, accessory…).
create table if not exists public.product_relationships (
  id              uuid primary key default gen_random_uuid(),
  from_product_id uuid not null references public.products (id),
  to_product_id   uuid not null references public.products (id),
  type            text not null check (type in ('successor', 'variant', 'accessory_for', 'competes_with', 'equivalent_candidate')),
  source_id       uuid,                         -- FK to public.sources added in 20260727000007
  confidence      numeric not null check (confidence between 0 and 1),
  valid_from      date,
  valid_to        date,
  reviewer_id     uuid references auth.users (id),
  notes           text,
  evidence_state  text not null default 'unverified' check (evidence_state in (
                    'unverified', 'source_captured', 'structurally_validated',
                    'analyst_reviewed', 'domain_expert_reviewed', 'superseded',
                    'disputed', 'expired')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id),
  updated_by      uuid references auth.users (id),
  visibility      text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo         boolean not null default false,
  archived_at     timestamptz,
  tenant_id       uuid references public.tenants (id),
  constraint product_relationships_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  ),
  constraint product_relationships_no_self_loop check (from_product_id <> to_product_id)
);
comment on table public.product_relationships is 'Evidence-carrying product-to-product edges.';
create or replace trigger trg_product_relationships_set_updated_at before update on public.product_relationships for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- product_formats / skus / pack_configurations / product_documents
-- ---------------------------------------------------------------------------

-- Physical form factor of a SKU (powder, ready plate, instrument…).
create table if not exists public.product_formats (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  form        text not null check (form in ('powder', 'granulated', 'ready_plate', 'ready_broth', 'instrument', 'consumable', 'other')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  constraint product_formats_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.product_formats is 'Physical form factor reference (powder, ready_plate, instrument…).';
create or replace trigger trg_product_formats_set_updated_at before update on public.product_formats for each row execute function public.set_updated_at();

-- Stock-keeping unit: the purchasable unit of a product.
create table if not exists public.skus (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text unique,             -- human-readable secondary identifier
  product_id           uuid not null references public.products (id),
  catalogue_number     text,
  manufacturer_code    text,
  gtin                 text,
  name                 text not null,
  alternate_names      text[] not null default '{}',
  format_id            uuid references public.product_formats (id),
  shelf_life_months    integer check (shelf_life_months is null or shelf_life_months > 0),
  storage_condition    text,                    -- free text, e.g. '2–8 °C'
  country_availability text[] not null default '{}',
  status               text not null default 'unknown' check (status in ('active', 'discontinued', 'unknown')),
  successor_sku_id     uuid references public.skus (id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid references auth.users (id),
  updated_by           uuid references auth.users (id),
  visibility           text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo              boolean not null default false,
  archived_at          timestamptz,
  tenant_id            uuid references public.tenants (id),
  constraint skus_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.skus is 'Sellable SKU of a product (catalogue number, GTIN, pack-independent attributes).';
create or replace trigger trg_skus_set_updated_at before update on public.skus for each row execute function public.set_updated_at();

-- One sellable pack size of a SKU (e.g. '500 g bottle', '20 plates/pack').
create table if not exists public.pack_configurations (
  id             uuid primary key default gen_random_uuid(),
  sku_id         uuid not null references public.skus (id),
  quantity       numeric not null check (quantity > 0),
  unit           text not null,
  units_per_pack integer check (units_per_pack is null or units_per_pack > 0),
  description    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id),
  updated_by     uuid references auth.users (id),
  visibility     text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo        boolean not null default false,
  archived_at    timestamptz,
  tenant_id      uuid references public.tenants (id),
  constraint pack_configurations_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.pack_configurations is 'Sellable pack size of a SKU; quantity+unit of content, units_per_pack for multi-packs.';
create or replace trigger trg_pack_configurations_set_updated_at before update on public.pack_configurations for each row execute function public.set_updated_at();

-- Document attached to a product or SKU (TDS, CoA, MSDS…), backed by a source.
create table if not exists public.product_documents (
  id          uuid primary key default gen_random_uuid(),
  sku_id      uuid references public.skus (id),
  product_id  uuid references public.products (id),
  doc_type    text not null check (doc_type in ('tds', 'coa', 'msds', 'certificate', 'instruction', 'other')),
  title       text not null,
  source_id   uuid not null,                    -- FK to public.sources added in 20260727000007
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  constraint product_documents_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  ),
  constraint product_documents_target_check check (sku_id is not null or product_id is not null)
);
comment on table public.product_documents is 'Product/SKU documents (tds, coa, msds, certificate, instruction, other).';
create or replace trigger trg_product_documents_set_updated_at before update on public.product_documents for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Scientific / regulatory reference entities
-- ---------------------------------------------------------------------------

-- Intended-use application area (e.g. 'water testing').
create table if not exists public.applications (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text,
  industry_codes text[],
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id),
  updated_by     uuid references auth.users (id),
  visibility     text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo        boolean not null default false,
  archived_at    timestamptz,
  tenant_id      uuid references public.tenants (id),
  constraint applications_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.applications is 'Intended-use application reference.';
create or replace trigger trg_applications_set_updated_at before update on public.applications for each row execute function public.set_updated_at();

-- Test method (e.g. 'membrane filtration'), optionally tied to standards.
create table if not exists public.methods (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  standard_ids uuid[],
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id),
  updated_by   uuid references auth.users (id),
  visibility   text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo      boolean not null default false,
  archived_at  timestamptz,
  tenant_id    uuid references public.tenants (id),
  constraint methods_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.methods is 'Test method reference.';
create or replace trigger trg_methods_set_updated_at before update on public.methods for each row execute function public.set_updated_at();

-- Standard issued by a standards body (ISO 11133, USP <71>…).
create table if not exists public.standards (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique,                      -- human-readable secondary identifier, e.g. 'iso-11133'
  body        text not null check (body in ('ISO', 'USP', 'EP', 'JP', 'AOAC', 'TCVN', 'other')),
  code        text not null,                    -- e.g. '11133', '71', '11137-1'
  title       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  unique (body, code),
  constraint standards_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.standards is 'Standards reference (ISO, USP, EP, JP, AOAC, TCVN); unique per body+code.';
create or replace trigger trg_standards_set_updated_at before update on public.standards for each row execute function public.set_updated_at();

-- A specific version/edition of a standard (e.g. ISO 11133:2014).
create table if not exists public.standard_versions (
  id          uuid primary key default gen_random_uuid(),
  standard_id uuid not null references public.standards (id),
  version     text not null,                    -- e.g. '2014', '2014/Amd 1:2018'
  year        integer check (year is null or year between 1900 and 2100),
  status      text not null default 'unknown' check (status in ('current', 'superseded', 'withdrawn', 'unknown')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  unique (standard_id, version),
  constraint standard_versions_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.standard_versions is 'Versioned edition of a standard with lifecycle status.';
create or replace trigger trg_standard_versions_set_updated_at before update on public.standard_versions for each row execute function public.set_updated_at();

-- Microbial reference organism (genus/species/strain).
create table if not exists public.organisms (
  id            uuid primary key default gen_random_uuid(),
  genus         text not null,
  species       text not null,
  strain_code   text,                           -- culture-collection code, e.g. 'ATCC 25922'
  gram_reaction text check (gram_reaction in ('positive', 'negative', 'variable', 'unknown')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id),
  updated_by    uuid references auth.users (id),
  visibility    text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo       boolean not null default false,
  archived_at   timestamptz,
  tenant_id     uuid references public.tenants (id),
  constraint organisms_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.organisms is 'Microbial reference organism (genus, species, culture-collection strain code).';
create or replace trigger trg_organisms_set_updated_at before update on public.organisms for each row execute function public.set_updated_at();

-- Sample matrix type (e.g. 'water', 'food swab').
create table if not exists public.sample_types (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  constraint sample_types_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.sample_types is 'Sample matrix reference.';
create or replace trigger trg_sample_types_set_updated_at before update on public.sample_types for each row execute function public.set_updated_at();

-- Industry vertical reference (code + name).
create table if not exists public.industries (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  constraint industries_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.industries is 'Industry vertical reference.';
create or replace trigger trg_industries_set_updated_at before update on public.industries for each row execute function public.set_updated_at();

-- Detection/measurement technology reference.
create table if not exists public.technologies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  constraint technologies_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.technologies is 'Technology reference.';
create or replace trigger trg_technologies_set_updated_at before update on public.technologies for each row execute function public.set_updated_at();

-- Test type reference (e.g. 'growth promotion', 'sterility').
create table if not exists public.test_types (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  constraint test_types_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.test_types is 'Test type reference.';
create or replace trigger trg_test_types_set_updated_at before update on public.test_types for each row execute function public.set_updated_at();

-- Incubation parameters (temperature/duration/atmosphere).
create table if not exists public.incubation_conditions (
  id                 uuid primary key default gen_random_uuid(),
  temperature_celsius numeric,
  duration_hours     numeric,
  atmosphere         text,                      -- 'aerobic', 'anaerobic', 'microaerophilic'
  description        text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users (id),
  updated_by         uuid references auth.users (id),
  visibility         text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo            boolean not null default false,
  archived_at        timestamptz,
  tenant_id          uuid references public.tenants (id),
  constraint incubation_conditions_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.incubation_conditions is 'Incubation parameter set (temperature, duration, atmosphere).';
create or replace trigger trg_incubation_conditions_set_updated_at before update on public.incubation_conditions for each row execute function public.set_updated_at();

-- Media/sample preparation method reference.
create table if not exists public.preparation_methods (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  constraint preparation_methods_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.preparation_methods is 'Preparation method reference.';
create or replace trigger trg_preparation_methods_set_updated_at before update on public.preparation_methods for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Evidence-carrying product<->domain edge tables
-- ---------------------------------------------------------------------------
-- All eight share the same shape: product_id + target id + optional role +
-- the flattened EdgeEvidence columns. Each pair is unique per product/target.
-- source_id FKs to public.sources are added in 20260727000007.

-- "Product P is intended for application A".
create table if not exists public.product_applications (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id),
  application_id uuid not null references public.applications (id),
  role           text,                          -- e.g. 'intended_use'
  source_id      uuid,                          -- FK to public.sources added in 20260727000007
  confidence     numeric not null check (confidence between 0 and 1),
  valid_from     date,
  valid_to       date,
  reviewer_id    uuid references auth.users (id),
  notes          text,
  evidence_state text not null default 'unverified' check (evidence_state in (
                   'unverified', 'source_captured', 'structurally_validated',
                   'analyst_reviewed', 'domain_expert_reviewed', 'superseded',
                   'disputed', 'expired')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id),
  updated_by     uuid references auth.users (id),
  visibility     text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo        boolean not null default false,
  archived_at    timestamptz,
  tenant_id      uuid references public.tenants (id),
  unique (product_id, application_id),
  constraint product_applications_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.product_applications is 'Evidence edge: product intended for an application.';
create or replace trigger trg_product_applications_set_updated_at before update on public.product_applications for each row execute function public.set_updated_at();

-- "Product P is used with method M".
create table if not exists public.product_methods (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id),
  method_id      uuid not null references public.methods (id),
  role           text,
  source_id      uuid,                          -- FK to public.sources added in 20260727000007
  confidence     numeric not null check (confidence between 0 and 1),
  valid_from     date,
  valid_to       date,
  reviewer_id    uuid references auth.users (id),
  notes          text,
  evidence_state text not null default 'unverified' check (evidence_state in (
                   'unverified', 'source_captured', 'structurally_validated',
                   'analyst_reviewed', 'domain_expert_reviewed', 'superseded',
                   'disputed', 'expired')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id),
  updated_by     uuid references auth.users (id),
  visibility     text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo        boolean not null default false,
  archived_at    timestamptz,
  tenant_id      uuid references public.tenants (id),
  unique (product_id, method_id),
  constraint product_methods_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.product_methods is 'Evidence edge: product used with a method.';
create or replace trigger trg_product_methods_set_updated_at before update on public.product_methods for each row execute function public.set_updated_at();

-- "Product P conforms to standard S".
create table if not exists public.product_standards (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id),
  standard_id    uuid not null references public.standards (id),
  role           text,                          -- e.g. 'conforms_to', 'tested_according_to'
  source_id      uuid,                          -- FK to public.sources added in 20260727000007
  confidence     numeric not null check (confidence between 0 and 1),
  valid_from     date,
  valid_to       date,
  reviewer_id    uuid references auth.users (id),
  notes          text,
  evidence_state text not null default 'unverified' check (evidence_state in (
                   'unverified', 'source_captured', 'structurally_validated',
                   'analyst_reviewed', 'domain_expert_reviewed', 'superseded',
                   'disputed', 'expired')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id),
  updated_by     uuid references auth.users (id),
  visibility     text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo        boolean not null default false,
  archived_at    timestamptz,
  tenant_id      uuid references public.tenants (id),
  unique (product_id, standard_id),
  constraint product_standards_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.product_standards is 'Evidence edge: product conforms to / tested per a standard.';
create or replace trigger trg_product_standards_set_updated_at before update on public.product_standards for each row execute function public.set_updated_at();

-- "Product P detects/grows organism O" (QC strain, growth promotion…).
create table if not exists public.product_organisms (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id),
  organism_id    uuid not null references public.organisms (id),
  role           text,                          -- e.g. 'qc_test_strain', 'growth_promotion'
  source_id      uuid,                          -- FK to public.sources added in 20260727000007
  confidence     numeric not null check (confidence between 0 and 1),
  valid_from     date,
  valid_to       date,
  reviewer_id    uuid references auth.users (id),
  notes          text,
  evidence_state text not null default 'unverified' check (evidence_state in (
                   'unverified', 'source_captured', 'structurally_validated',
                   'analyst_reviewed', 'domain_expert_reviewed', 'superseded',
                   'disputed', 'expired')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id),
  updated_by     uuid references auth.users (id),
  visibility     text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo        boolean not null default false,
  archived_at    timestamptz,
  tenant_id      uuid references public.tenants (id),
  unique (product_id, organism_id, role),
  constraint product_organisms_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.product_organisms is 'Evidence edge: product detects/grows an organism (role-qualified).';
create or replace trigger trg_product_organisms_set_updated_at before update on public.product_organisms for each row execute function public.set_updated_at();

-- "Product P is used for sample type S".
create table if not exists public.product_sample_types (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id),
  sample_type_id uuid not null references public.sample_types (id),
  role           text,
  source_id      uuid,                          -- FK to public.sources added in 20260727000007
  confidence     numeric not null check (confidence between 0 and 1),
  valid_from     date,
  valid_to       date,
  reviewer_id    uuid references auth.users (id),
  notes          text,
  evidence_state text not null default 'unverified' check (evidence_state in (
                   'unverified', 'source_captured', 'structurally_validated',
                   'analyst_reviewed', 'domain_expert_reviewed', 'superseded',
                   'disputed', 'expired')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id),
  updated_by     uuid references auth.users (id),
  visibility     text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo        boolean not null default false,
  archived_at    timestamptz,
  tenant_id      uuid references public.tenants (id),
  unique (product_id, sample_type_id),
  constraint product_sample_types_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.product_sample_types is 'Evidence edge: product used for a sample type.';
create or replace trigger trg_product_sample_types_set_updated_at before update on public.product_sample_types for each row execute function public.set_updated_at();

-- "Product P is used in industry I".
create table if not exists public.product_industries (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id),
  industry_id    uuid not null references public.industries (id),
  role           text,
  source_id      uuid,                          -- FK to public.sources added in 20260727000007
  confidence     numeric not null check (confidence between 0 and 1),
  valid_from     date,
  valid_to       date,
  reviewer_id    uuid references auth.users (id),
  notes          text,
  evidence_state text not null default 'unverified' check (evidence_state in (
                   'unverified', 'source_captured', 'structurally_validated',
                   'analyst_reviewed', 'domain_expert_reviewed', 'superseded',
                   'disputed', 'expired')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id),
  updated_by     uuid references auth.users (id),
  visibility     text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo        boolean not null default false,
  archived_at    timestamptz,
  tenant_id      uuid references public.tenants (id),
  unique (product_id, industry_id),
  constraint product_industries_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.product_industries is 'Evidence edge: product used in an industry vertical.';
create or replace trigger trg_product_industries_set_updated_at before update on public.product_industries for each row execute function public.set_updated_at();

-- "Product P implements technology T".
create table if not exists public.product_technologies (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id),
  technology_id  uuid not null references public.technologies (id),
  role           text,
  source_id      uuid,                          -- FK to public.sources added in 20260727000007
  confidence     numeric not null check (confidence between 0 and 1),
  valid_from     date,
  valid_to       date,
  reviewer_id    uuid references auth.users (id),
  notes          text,
  evidence_state text not null default 'unverified' check (evidence_state in (
                   'unverified', 'source_captured', 'structurally_validated',
                   'analyst_reviewed', 'domain_expert_reviewed', 'superseded',
                   'disputed', 'expired')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id),
  updated_by     uuid references auth.users (id),
  visibility     text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo        boolean not null default false,
  archived_at    timestamptz,
  tenant_id      uuid references public.tenants (id),
  unique (product_id, technology_id),
  constraint product_technologies_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.product_technologies is 'Evidence edge: product implements a technology.';
create or replace trigger trg_product_technologies_set_updated_at before update on public.product_technologies for each row execute function public.set_updated_at();

-- "Product P is used for test type T".
create table if not exists public.product_test_types (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id),
  test_type_id   uuid not null references public.test_types (id),
  role           text,
  source_id      uuid,                          -- FK to public.sources added in 20260727000007
  confidence     numeric not null check (confidence between 0 and 1),
  valid_from     date,
  valid_to       date,
  reviewer_id    uuid references auth.users (id),
  notes          text,
  evidence_state text not null default 'unverified' check (evidence_state in (
                   'unverified', 'source_captured', 'structurally_validated',
                   'analyst_reviewed', 'domain_expert_reviewed', 'superseded',
                   'disputed', 'expired')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id),
  updated_by     uuid references auth.users (id),
  visibility     text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo        boolean not null default false,
  archived_at    timestamptz,
  tenant_id      uuid references public.tenants (id),
  unique (product_id, test_type_id),
  constraint product_test_types_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.product_test_types is 'Evidence edge: product used for a test type.';
create or replace trigger trg_product_test_types_set_updated_at before update on public.product_test_types for each row execute function public.set_updated_at();
