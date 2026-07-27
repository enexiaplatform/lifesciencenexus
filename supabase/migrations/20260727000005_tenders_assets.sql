-- 20260727000005_tenders_assets.sql
-- Public tender records and the installed-base asset model: canonical asset
-- catalog (asset_models, consumable_compatibilities) plus the tenant-private
-- installed-base overlay (installed_assets and their event streams).
-- Column names are snake_case mirrors of src/lib/domain/types.ts.
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- tenders
-- ---------------------------------------------------------------------------

-- A published tender (canonical public record).
create table if not exists public.tenders (
  id                     uuid primary key default gen_random_uuid(),
  code                   text not null,             -- buyer-side tender reference code
  title                  text not null,
  buyer_organization_id  uuid not null references public.organizations (id),
  site_id                uuid references public.sites (id),
  publication_date       date,
  submission_deadline    timestamptz,
  award_date             date,
  contract_period_months integer check (contract_period_months is null or contract_period_months > 0),
  country                text not null,             -- ISO alpha-2
  status                 text not null default 'unknown' check (status in ('published', 'closed', 'awarded', 'cancelled', 'unknown')),
  source_id              uuid not null,             -- FK to public.sources added in 20260727000007
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  created_by             uuid references auth.users (id),
  updated_by             uuid references auth.users (id),
  visibility             text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo                boolean not null default false,
  archived_at            timestamptz,
  tenant_id              uuid references public.tenants (id),
  unique (code, country),
  constraint tenders_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.tenders is 'Published tender record with lifecycle status.';
create or replace trigger trg_tenders_set_updated_at before update on public.tenders for each row execute function public.set_updated_at();

-- Buyer parties attached to a tender (procuring entity, funder…).
create table if not exists public.tender_buyers (
  id              uuid primary key default gen_random_uuid(),
  tender_id       uuid not null references public.tenders (id),
  organization_id uuid not null references public.organizations (id),
  role            text not null default 'buyer' check (role in ('buyer', 'procuring_entity', 'funder')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id),
  updated_by      uuid references auth.users (id),
  visibility      text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo         boolean not null default false,
  archived_at     timestamptz,
  tenant_id       uuid references public.tenants (id),
  unique (tender_id, organization_id, role),
  constraint tender_buyers_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.tender_buyers is 'Buyer-side parties of a tender with role.';
create or replace trigger trg_tender_buyers_set_updated_at before update on public.tender_buyers for each row execute function public.set_updated_at();

-- A lot inside a tender.
create table if not exists public.tender_lots (
  id          uuid primary key default gen_random_uuid(),
  tender_id   uuid not null references public.tenders (id),
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
  constraint tender_lots_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.tender_lots is 'Lot within a tender.';
create or replace trigger trg_tender_lots_set_updated_at before update on public.tender_lots for each row execute function public.set_updated_at();

-- A line item inside a tender lot, optionally mapped to a product/SKU.
create table if not exists public.tender_items (
  id                     uuid primary key default gen_random_uuid(),
  lot_id                 uuid not null references public.tender_lots (id),
  description            text not null,
  required_specification text,
  quantity               numeric check (quantity is null or quantity > 0),
  unit                   text,
  mapped_product_id      uuid references public.products (id),
  mapped_sku_id          uuid references public.skus (id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  created_by             uuid references auth.users (id),
  updated_by             uuid references auth.users (id),
  visibility             text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo                boolean not null default false,
  archived_at            timestamptz,
  tenant_id              uuid references public.tenants (id),
  constraint tender_items_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.tender_items is 'Tender lot line item, optionally mapped to a canonical product/SKU.';
create or replace trigger trg_tender_items_set_updated_at before update on public.tender_items for each row execute function public.set_updated_at();

-- A bidder on a tender or on a specific lot (exactly one scope set).
create table if not exists public.tender_bidders (
  id              uuid primary key default gen_random_uuid(),
  tender_id       uuid references public.tenders (id),
  lot_id          uuid references public.tender_lots (id),
  organization_id uuid not null references public.organizations (id),
  bid_amount      numeric check (bid_amount is null or bid_amount >= 0),
  currency        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id),
  updated_by      uuid references auth.users (id),
  visibility      text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo         boolean not null default false,
  archived_at     timestamptz,
  tenant_id       uuid references public.tenants (id),
  constraint tender_bidders_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  ),
  constraint tender_bidders_scope_check check ((tender_id is not null) <> (lot_id is not null))
);
comment on table public.tender_bidders is 'Bidder on a tender or lot (exactly one scope).';
create or replace trigger trg_tender_bidders_set_updated_at before update on public.tender_bidders for each row execute function public.set_updated_at();

-- An award on a lot or a specific tender item (exactly one scope set), with evidence.
create table if not exists public.tender_awards (
  id                        uuid primary key default gen_random_uuid(),
  lot_id                    uuid references public.tender_lots (id),
  tender_item_id            uuid references public.tender_items (id),
  awarded_supplier_org_id   uuid not null references public.organizations (id),
  awarded_manufacturer_org_id uuid references public.organizations (id),
  awarded_product_id        uuid references public.products (id),
  amount                    numeric not null check (amount >= 0),
  currency                  text not null,
  award_date                date,
  source_id                 uuid,                 -- FK to public.sources added in 20260727000007
  confidence                numeric not null check (confidence between 0 and 1),
  valid_from                date,
  valid_to                  date,
  reviewer_id               uuid references auth.users (id),
  notes                     text,
  evidence_state            text not null default 'unverified' check (evidence_state in (
                              'unverified', 'source_captured', 'structurally_validated',
                              'analyst_reviewed', 'domain_expert_reviewed', 'superseded',
                              'disputed', 'expired')),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  created_by                uuid references auth.users (id),
  updated_by                uuid references auth.users (id),
  visibility                text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo                   boolean not null default false,
  archived_at               timestamptz,
  tenant_id                 uuid references public.tenants (id),
  constraint tender_awards_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  ),
  constraint tender_awards_scope_check check ((lot_id is not null) <> (tender_item_id is not null))
);
comment on table public.tender_awards is 'Evidence-backed tender award on a lot or item (exactly one scope).';
create or replace trigger trg_tender_awards_set_updated_at before update on public.tender_awards for each row execute function public.set_updated_at();

-- Document attached to a tender (notice, clarification, award decision…).
create table if not exists public.tender_documents (
  id          uuid primary key default gen_random_uuid(),
  tender_id   uuid not null references public.tenders (id),
  doc_type    text not null default 'notice',     -- e.g. 'notice', 'clarification', 'award_decision'
  title       text not null,
  url         text,
  source_id   uuid,                               -- FK to public.sources added in 20260727000007
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  constraint tender_documents_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.tender_documents is 'Document attached to a tender.';
create or replace trigger trg_tender_documents_set_updated_at before update on public.tender_documents for each row execute function public.set_updated_at();

-- Lifecycle event of a tender (published, clarification, deadline_extended…).
create table if not exists public.tender_events (
  id          uuid primary key default gen_random_uuid(),
  tender_id   uuid not null references public.tenders (id),
  type        text not null check (type in ('published', 'clarification', 'deadline_extended', 'closed', 'awarded', 'cancelled', 'other')),
  at          timestamptz not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  constraint tender_events_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.tender_events is 'Tender lifecycle event stream.';
create or replace trigger trg_tender_events_set_updated_at before update on public.tender_events for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- asset_models / consumable_compatibilities (canonical catalog)
-- ---------------------------------------------------------------------------

-- Canonical instrument model (air sampler, particle counter…).
create table if not exists public.asset_models (
  id                  uuid primary key default gen_random_uuid(),
  manufacturer_org_id uuid not null references public.organizations (id),
  brand_id            uuid references public.brands (id),
  model               text not null,
  category            text not null check (category in ('air_sampler', 'particle_counter', 'sterility_testing', 'incubator', 'autoclave', 'other')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references auth.users (id),
  updated_by          uuid references auth.users (id),
  visibility          text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo             boolean not null default false,
  archived_at         timestamptz,
  tenant_id           uuid references public.tenants (id),
  unique (manufacturer_org_id, model),
  constraint asset_models_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.asset_models is 'Canonical instrument asset model.';
create or replace trigger trg_asset_models_set_updated_at before update on public.asset_models for each row execute function public.set_updated_at();

-- "Consumable SKU X fits / is used with asset model Y", with evidence.
create table if not exists public.consumable_compatibilities (
  id             uuid primary key default gen_random_uuid(),
  asset_model_id uuid not null references public.asset_models (id),
  sku_id         uuid not null references public.skus (id),
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
  unique (asset_model_id, sku_id),
  constraint consumable_compatibilities_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.consumable_compatibilities is 'Evidence edge: consumable SKU compatible with an asset model.';
create or replace trigger trg_consumable_compatibilities_set_updated_at before update on public.consumable_compatibilities for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- installed-base overlay (tenant-private)
-- ---------------------------------------------------------------------------

-- One physical instrument observed at a customer site (tenant-private; serial
-- numbers never leave the tenant).
create table if not exists public.installed_assets (
  id                            uuid primary key default gen_random_uuid(),
  tenant_id                     uuid not null references public.tenants (id),
  asset_model_id                uuid not null references public.asset_models (id),
  site_id                       uuid not null references public.sites (id),
  laboratory_id                 uuid references public.laboratories (id),
  serial_number                 text,             -- tenant-private: never synced to canonical
  installation_date             date,
  status                        text not null default 'unknown' check (status in ('operational', 'under_maintenance', 'retired', 'unknown')),
  qualification_status          text not null default 'unknown' check (qualification_status in ('iq_oq_pq_complete', 'partial', 'none', 'unknown')),
  service_provider_org_id       uuid references public.organizations (id),
  expected_replacement_date     date,
  estimated_annual_consumption  numeric check (estimated_annual_consumption is null or estimated_annual_consumption >= 0),
  confidence                    numeric not null check (confidence between 0 and 1),
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  created_by                    uuid references auth.users (id),
  updated_by                    uuid references auth.users (id),
  visibility                    text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo                       boolean not null default false,
  archived_at                   timestamptz,
  constraint installed_assets_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.installed_assets is 'Tenant-private installed instrument at a customer site.';
create or replace trigger trg_installed_assets_set_updated_at before update on public.installed_assets for each row execute function public.set_updated_at();

-- Location history of an installed asset (site/lab moves over time).
create table if not exists public.asset_locations (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants (id),
  installed_asset_id uuid not null references public.installed_assets (id),
  site_id            uuid not null references public.sites (id),
  laboratory_id      uuid references public.laboratories (id),
  valid_from         date not null,
  valid_to           date,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users (id),
  updated_by         uuid references auth.users (id),
  visibility         text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo            boolean not null default false,
  archived_at        timestamptz,
  constraint asset_locations_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.asset_locations is 'Tenant-private location history of an installed asset.';
create or replace trigger trg_asset_locations_set_updated_at before update on public.asset_locations for each row execute function public.set_updated_at();

-- Lifecycle event of an installed asset (installed, moved, retired…).
create table if not exists public.asset_lifecycle_events (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants (id),
  installed_asset_id uuid not null references public.installed_assets (id),
  type               text not null check (type in ('installed', 'moved', 'status_change', 'returned_to_service', 'retired', 'other')),
  at                 timestamptz not null,
  description        text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users (id),
  updated_by         uuid references auth.users (id),
  visibility         text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo            boolean not null default false,
  archived_at        timestamptz,
  constraint asset_lifecycle_events_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.asset_lifecycle_events is 'Tenant-private lifecycle event stream of an installed asset.';
create or replace trigger trg_asset_lifecycle_events_set_updated_at before update on public.asset_lifecycle_events for each row execute function public.set_updated_at();

-- Maintenance event on an installed asset.
create table if not exists public.maintenance_events (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants (id),
  installed_asset_id uuid not null references public.installed_assets (id),
  type               text not null check (type in ('preventive', 'corrective', 'calibration', 'other')),
  at                 timestamptz not null,
  provider_org_id    uuid references public.organizations (id),
  description        text,
  next_due_date      date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users (id),
  updated_by         uuid references auth.users (id),
  visibility         text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo            boolean not null default false,
  archived_at        timestamptz,
  constraint maintenance_events_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.maintenance_events is 'Tenant-private maintenance/calibration event on an installed asset.';
create or replace trigger trg_maintenance_events_set_updated_at before update on public.maintenance_events for each row execute function public.set_updated_at();

-- Qualification event (IQ/OQ/PQ) on an installed asset.
create table if not exists public.qualification_events (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants (id),
  installed_asset_id uuid not null references public.installed_assets (id),
  kind               text not null check (kind in ('IQ', 'OQ', 'PQ', 'requalification', 'other')),
  at                 timestamptz not null,
  passed             boolean,
  document_source_id uuid,                        -- FK to public.sources added in 20260727000007
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users (id),
  updated_by         uuid references auth.users (id),
  visibility         text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo            boolean not null default false,
  archived_at        timestamptz,
  constraint qualification_events_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.qualification_events is 'Tenant-private IQ/OQ/PQ qualification event on an installed asset.';
create or replace trigger trg_qualification_events_set_updated_at before update on public.qualification_events for each row execute function public.set_updated_at();

-- Estimated recurring consumable usage for one asset or asset model
-- (exactly one of installed_asset_id / asset_model_id set).
create table if not exists public.consumption_models (
  id                        uuid primary key default gen_random_uuid(),
  tenant_id                 uuid not null references public.tenants (id),
  installed_asset_id        uuid references public.installed_assets (id),
  asset_model_id            uuid references public.asset_models (id),
  sku_id                    uuid not null references public.skus (id),
  estimated_annual_quantity numeric not null check (estimated_annual_quantity > 0),
  basis                     text,                 -- e.g. '3 tests/week × 52'
  confidence                numeric not null check (confidence between 0 and 1),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  created_by                uuid references auth.users (id),
  updated_by                uuid references auth.users (id),
  visibility                text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo                   boolean not null default false,
  archived_at               timestamptz,
  constraint consumption_models_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  ),
  constraint consumption_models_scope_check check ((installed_asset_id is not null) <> (asset_model_id is not null))
);
comment on table public.consumption_models is 'Tenant-private recurring consumable usage estimate per asset or model.';
create or replace trigger trg_consumption_models_set_updated_at before update on public.consumption_models for each row execute function public.set_updated_at();

-- Rule-of-thumb replacement cycle used to forecast replacement signals.
create table if not exists public.replacement_assumptions (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null references public.tenants (id),
  asset_category         text not null check (asset_category in ('air_sampler', 'particle_counter', 'sterility_testing', 'incubator', 'autoclave', 'other')),
  typical_lifetime_years numeric not null check (typical_lifetime_years > 0),
  geography_code         text,
  basis                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  created_by             uuid references auth.users (id),
  updated_by             uuid references auth.users (id),
  visibility             text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo                boolean not null default false,
  archived_at            timestamptz,
  constraint replacement_assumptions_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.replacement_assumptions is 'Tenant-private replacement-cycle assumption per asset category.';
create or replace trigger trg_replacement_assumptions_set_updated_at before update on public.replacement_assumptions for each row execute function public.set_updated_at();
