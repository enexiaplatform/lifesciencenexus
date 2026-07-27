-- 20260727000004_suppliers_prices.sql
-- Supplier/commercial overlay and the immutable price-observation ledger.
-- Column names are snake_case mirrors of src/lib/domain/types.ts.
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- supplier_profiles / distribution_agreements / supplier_listings
-- ---------------------------------------------------------------------------

-- Commercial profile of a supplier organization.
create table if not exists public.supplier_profiles (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations (id),
  relationship_type text not null check (relationship_type in (
                      'authorized_distributor', 'non_exclusive_distributor', 'dealer',
                      'reseller', 'importer', 'service_provider', 'unknown_unverified')),
  manufacturers     uuid[] not null default '{}',   -- organization ids carried
  countries         text[] not null default '{}',   -- ISO alpha-2 served
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references auth.users (id),
  updated_by        uuid references auth.users (id),
  visibility        text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo           boolean not null default false,
  archived_at       timestamptz,
  tenant_id         uuid references public.tenants (id),
  unique (organization_id),
  constraint supplier_profiles_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.supplier_profiles is 'Supplier profile: relationship type, manufacturers carried, countries served.';
create or replace trigger trg_supplier_profiles_set_updated_at before update on public.supplier_profiles for each row execute function public.set_updated_at();

-- Evidence-backed distribution agreement between manufacturer and distributor.
create table if not exists public.distribution_agreements (
  id                  uuid primary key default gen_random_uuid(),
  manufacturer_org_id uuid not null references public.organizations (id),
  distributor_org_id  uuid not null references public.organizations (id),
  relationship_type   text not null check (relationship_type in (
                        'authorized_distributor', 'non_exclusive_distributor', 'dealer',
                        'reseller', 'importer', 'service_provider', 'unknown_unverified')),
  countries           text[] not null default '{}',
  valid_from          date,
  valid_to            date,
  source_id           uuid,                       -- FK to public.sources added in 20260727000007
  confidence          numeric not null check (confidence between 0 and 1),
  reviewer_id         uuid references auth.users (id),
  notes               text,
  evidence_state      text not null default 'unverified' check (evidence_state in (
                        'unverified', 'source_captured', 'structurally_validated',
                        'analyst_reviewed', 'domain_expert_reviewed', 'superseded',
                        'disputed', 'expired')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references auth.users (id),
  updated_by          uuid references auth.users (id),
  visibility          text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo             boolean not null default false,
  archived_at         timestamptz,
  tenant_id           uuid references public.tenants (id),
  constraint distribution_agreements_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.distribution_agreements is 'Evidence-backed manufacturer<->distributor agreement per country set.';
create or replace trigger trg_distribution_agreements_set_updated_at before update on public.distribution_agreements for each row execute function public.set_updated_at();

-- "Supplier S lists/sells SKU X" with its own evidence.
create table if not exists public.supplier_listings (
  id                uuid primary key default gen_random_uuid(),
  supplier_org_id   uuid not null references public.organizations (id),
  sku_id            uuid not null references public.skus (id),
  relationship_type text not null check (relationship_type in (
                      'authorized_distributor', 'non_exclusive_distributor', 'dealer',
                      'reseller', 'importer', 'service_provider', 'unknown_unverified')),
  source_id         uuid,                         -- FK to public.sources added in 20260727000007
  confidence        numeric not null check (confidence between 0 and 1),
  valid_from        date,
  valid_to          date,
  reviewer_id       uuid references auth.users (id),
  notes             text,
  evidence_state    text not null default 'unverified' check (evidence_state in (
                      'unverified', 'source_captured', 'structurally_validated',
                      'analyst_reviewed', 'domain_expert_reviewed', 'superseded',
                      'disputed', 'expired')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references auth.users (id),
  updated_by        uuid references auth.users (id),
  visibility        text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo           boolean not null default false,
  archived_at       timestamptz,
  tenant_id         uuid references public.tenants (id),
  unique (supplier_org_id, sku_id, relationship_type),
  constraint supplier_listings_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.supplier_listings is 'Evidence edge: supplier lists/sells a SKU.';
create or replace trigger trg_supplier_listings_set_updated_at before update on public.supplier_listings for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- availability / stock / lead-time observations
-- ---------------------------------------------------------------------------

-- Point-in-time availability observation at one supplier (canonical shareable).
create table if not exists public.availability_observations (
  id              uuid primary key default gen_random_uuid(),
  supplier_org_id uuid not null references public.organizations (id),
  sku_id          uuid not null references public.skus (id),
  country         text not null,                  -- ISO alpha-2
  observed_at     timestamptz not null,
  status          text not null check (status in ('in_stock', 'limited', 'out_of_stock', 'unknown')),
  lead_time_days  integer check (lead_time_days is null or lead_time_days >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id),
  updated_by      uuid references auth.users (id),
  visibility      text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo         boolean not null default false,
  archived_at     timestamptz,
  tenant_id       uuid references public.tenants (id),
  constraint availability_observations_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.availability_observations is 'Point-in-time supplier stock status observation (immutable once recorded).';
create or replace trigger trg_availability_observations_set_updated_at before update on public.availability_observations for each row execute function public.set_updated_at();

-- Tenant-private field stock sighting (what a rep saw at a customer/supplier).
create table if not exists public.stock_observations (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id),
  supplier_org_id uuid references public.organizations (id),
  sku_id          uuid references public.skus (id),
  country         text,
  observed_at     timestamptz not null,
  status          text not null check (status in ('in_stock', 'limited', 'out_of_stock', 'unknown')),
  quantity_on_hand numeric check (quantity_on_hand is null or quantity_on_hand >= 0),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id),
  updated_by      uuid references auth.users (id),
  visibility      text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo         boolean not null default false,
  archived_at     timestamptz,
  constraint stock_observations_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.stock_observations is 'Tenant-private field stock sighting.';
create or replace trigger trg_stock_observations_set_updated_at before update on public.stock_observations for each row execute function public.set_updated_at();

-- Tenant-private lead-time observation for a supplier/SKU lane.
create table if not exists public.lead_time_observations (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id),
  supplier_org_id uuid references public.organizations (id),
  sku_id          uuid references public.skus (id),
  country         text,
  observed_at     timestamptz not null,
  min_days        integer check (min_days is null or min_days >= 0),
  max_days        integer check (max_days is null or max_days >= 0),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id),
  updated_by      uuid references auth.users (id),
  visibility      text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo         boolean not null default false,
  archived_at     timestamptz,
  constraint lead_time_observations_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  ),
  constraint lead_time_observations_range_check check (max_days is null or min_days is null or max_days >= min_days)
);
comment on table public.lead_time_observations is 'Tenant-private supplier lead-time observation (min/max days).';
create or replace trigger trg_lead_time_observations_set_updated_at before update on public.lead_time_observations for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- commercial_terms (tenant-private overlay)
-- ---------------------------------------------------------------------------

-- Negotiated commercial terms with a supplier.
create table if not exists public.commercial_terms (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id),
  supplier_org_id uuid not null references public.organizations (id),
  sku_id          uuid references public.skus (id),
  moq             numeric check (moq is null or moq >= 0),   -- minimum order quantity
  moq_unit        text,
  payment_terms   text,                         -- e.g. 'Net 30', '50% advance'
  incoterm        text,                         -- Incoterms 2020 code, e.g. 'EXW', 'CIF', 'DAP'
  currency        text,                         -- ISO 4217
  valid_from      date,
  valid_to        date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id),
  updated_by      uuid references auth.users (id),
  visibility      text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo         boolean not null default false,
  archived_at     timestamptz,
  constraint commercial_terms_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.commercial_terms is 'Tenant-private negotiated terms (MOQ, payment terms, incoterm) with a supplier.';
create or replace trigger trg_commercial_terms_set_updated_at before update on public.commercial_terms for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- service_capabilities / country_authorizations
-- ---------------------------------------------------------------------------

-- Service capability of an organization (calibration, IQ/OQ/PQ, repair…).
create table if not exists public.service_capabilities (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  service_type    text not null,                -- e.g. 'calibration', 'iq_oq_pq', 'repair', 'training'
  description     text,
  countries       text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id),
  updated_by      uuid references auth.users (id),
  visibility      text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo         boolean not null default false,
  archived_at     timestamptz,
  tenant_id       uuid references public.tenants (id),
  unique (organization_id, service_type),
  constraint service_capabilities_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.service_capabilities is 'Declared service capability of an organization per country set.';
create or replace trigger trg_service_capabilities_set_updated_at before update on public.service_capabilities for each row execute function public.set_updated_at();

-- Evidence-backed authorization of a supplier in a country.
create table if not exists public.country_authorizations (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations (id),   -- the authorized party
  manufacturer_org_id uuid references public.organizations (id),           -- authorizing manufacturer, when applicable
  country            text not null,                 -- ISO alpha-2
  authorization_type text not null check (authorization_type in (
                       'authorized_distributor', 'registered_importer', 'service_partner', 'other')),
  valid_from         date,
  valid_to           date,
  source_id          uuid,                          -- FK to public.sources added in 20260727000007
  confidence         numeric not null check (confidence between 0 and 1),
  reviewer_id        uuid references auth.users (id),
  notes              text,
  evidence_state     text not null default 'unverified' check (evidence_state in (
                       'unverified', 'source_captured', 'structurally_validated',
                       'analyst_reviewed', 'domain_expert_reviewed', 'superseded',
                       'disputed', 'expired')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users (id),
  updated_by         uuid references auth.users (id),
  visibility         text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo            boolean not null default false,
  archived_at        timestamptz,
  tenant_id          uuid references public.tenants (id),
  unique (organization_id, country, authorization_type),
  constraint country_authorizations_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.country_authorizations is 'Evidence-backed per-country authorization of a supplier.';
create or replace trigger trg_country_authorizations_set_updated_at before update on public.country_authorizations for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- price_observations (immutable ledger)
-- ---------------------------------------------------------------------------

-- One observed price for a SKU at a point in time.
--
-- IMMUTABILITY CONTRACT: original_amount, original_currency and
-- observation_date may never be changed after insert (enforced by the
-- trg_price_observations_immutable trigger below). Corrections are made by
-- inserting a new observation with supersedes_id pointing at the row it
-- replaces; the superseded row keeps evidence_state='superseded'. DELETE is
-- not granted to authenticated roles (see the RLS migration).
create table if not exists public.price_observations (
  id                         uuid primary key default gen_random_uuid(),
  sku_id                     uuid not null references public.skus (id),
  pack_configuration_id      uuid references public.pack_configurations (id),
  supplier_org_id            uuid references public.organizations (id),
  original_amount            numeric not null check (original_amount >= 0),
  original_currency          text not null,           -- ISO 4217, e.g. 'VND', 'USD'
  observation_date           date not null,
  valid_from                 date,
  valid_to                   date,
  tax_included               boolean not null default false,
  vat_rate                   numeric check (vat_rate is null or vat_rate between 0 and 1),
  incoterm                   text,
  geography                  text not null,           -- geography code or ISO alpha-2
  customer_segment           text,
  quantity                   numeric not null default 1 check (quantity > 0),
  source_id                  uuid not null,           -- FK to public.sources added in 20260727000007
  confidence                 jsonb not null,          -- ConfidenceDimensions (7 keys, each 0-1)
  evidence_state             text not null default 'unverified' check (evidence_state in (
                               'unverified', 'source_captured', 'structurally_validated',
                               'analyst_reviewed', 'domain_expert_reviewed', 'superseded',
                               'disputed', 'expired')),
  normalized_per_unit_amount numeric,                 -- derived; null when normalization impossible
  normalized_per_unit_currency text,
  normalized_per_unit        text,                    -- base unit, e.g. 'g', 'mL', 'plate'
  normalized_per_test_amount numeric,
  is_synthetic               boolean not null default false,  -- derived/synthetic: never shown as fact
  supersedes_id              uuid references public.price_observations (id),
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  created_by                 uuid references auth.users (id),
  updated_by                 uuid references auth.users (id),
  visibility                 text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo                    boolean not null default false,
  archived_at                timestamptz,
  tenant_id                  uuid references public.tenants (id),
  constraint price_observations_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  ),
  constraint price_observations_no_self_supersede check (supersedes_id is null or supersedes_id <> id)
);
comment on table public.price_observations is 'Immutable price observation ledger; corrections via supersedes_id revision rows.';
create or replace trigger trg_price_observations_set_updated_at before update on public.price_observations for each row execute function public.set_updated_at();

-- Forbids UPDATE of the immutable identity columns of a price observation.
create or replace function public.price_observation_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.original_amount is distinct from old.original_amount
     or new.original_currency is distinct from old.original_currency
     or new.observation_date is distinct from old.observation_date then
    raise exception 'price_observations: original_amount/original_currency/observation_date are immutable; insert a correcting row with supersedes_id instead';
  end if;
  return new;
end;
$$;

comment on function public.price_observation_immutable() is
  'BEFORE UPDATE trigger: forbids changing a price observation''s amount, currency or observation date.';

create or replace trigger trg_price_observations_immutable
  before update on public.price_observations
  for each row execute function public.price_observation_immutable();

-- ---------------------------------------------------------------------------
-- price_components / exchange_rate_snapshots / price_normalizations
-- ---------------------------------------------------------------------------

-- Itemized add-on attached to a price observation (freight, duty, tax…).
create table if not exists public.price_components (
  id                   uuid primary key default gen_random_uuid(),
  price_observation_id uuid not null references public.price_observations (id),
  kind                 text not null check (kind in ('freight', 'import_duty', 'tax', 'cold_chain', 'other')),
  amount               numeric not null check (amount >= 0),
  currency             text not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid references auth.users (id),
  updated_by           uuid references auth.users (id),
  visibility           text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo              boolean not null default false,
  archived_at          timestamptz,
  tenant_id            uuid references public.tenants (id),
  constraint price_components_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.price_components is 'Itemized add-on (freight, import_duty, tax, cold_chain) on a price observation.';
create or replace trigger trg_price_components_set_updated_at before update on public.price_components for each row execute function public.set_updated_at();

-- Explicit FX snapshot; engines refuse currency conversion without one.
create table if not exists public.exchange_rate_snapshots (
  id            uuid primary key default gen_random_uuid(),
  from_currency text not null,
  to_currency   text not null,
  rate          numeric not null check (rate > 0),   -- multiply from-amount by rate
  rate_date     date not null,
  source        text not null,                       -- e.g. 'SBV', 'ECB', manual entry id
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id),
  updated_by    uuid references auth.users (id),
  visibility    text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo       boolean not null default false,
  archived_at   timestamptz,
  tenant_id     uuid references public.tenants (id),
  unique (from_currency, to_currency, rate_date, source),
  constraint exchange_rate_snapshots_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.exchange_rate_snapshots is 'Explicit FX rate snapshot (pair, date, source); required for any currency conversion.';
create or replace trigger trg_exchange_rate_snapshots_set_updated_at before update on public.exchange_rate_snapshots for each row execute function public.set_updated_at();

-- Derived (layer C) normalization of a price observation, with full lineage.
create table if not exists public.price_normalizations (
  id                   uuid primary key default gen_random_uuid(),
  price_observation_id uuid not null references public.price_observations (id),
  method               text not null,               -- e.g. 'per_unit', 'per_test'
  normalized_amount    numeric not null,
  normalized_currency  text not null,
  normalized_per_unit  text,                        -- base unit, e.g. 'g', 'mL', 'plate'
  exchange_rate        jsonb,                       -- the ExchangeRateSnapshot used, if any
  computed_at          timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid references auth.users (id),
  updated_by           uuid references auth.users (id),
  visibility           text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo              boolean not null default false,
  archived_at          timestamptz,
  tenant_id            uuid references public.tenants (id),
  constraint price_normalizations_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.price_normalizations is 'Layer C: derived price normalization with FX lineage; recomputed, never hand-edited.';
create or replace trigger trg_price_normalizations_set_updated_at before update on public.price_normalizations for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- price_benchmarks / price_review_events
-- ---------------------------------------------------------------------------

-- Derived (layer C) benchmark over a cluster of comparable SKUs.
create table if not exists public.price_benchmarks (
  id              uuid primary key default gen_random_uuid(),
  sku_cluster_key text not null,                    -- e.g. normalized product name + pack size bucket
  statistic       text not null check (statistic in ('median', 'p25', 'p75')),
  amount          numeric not null check (amount >= 0),
  currency        text not null,
  computed_from   uuid[] not null default '{}',     -- price_observation ids: full lineage
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id),
  updated_by      uuid references auth.users (id),
  visibility      text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo         boolean not null default false,
  archived_at     timestamptz,
  tenant_id       uuid references public.tenants (id),
  unique (sku_cluster_key, statistic, currency),
  constraint price_benchmarks_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.price_benchmarks is 'Layer C: price statistic (median/p25/p75) over a SKU cluster with lineage.';
create or replace trigger trg_price_benchmarks_set_updated_at before update on public.price_benchmarks for each row execute function public.set_updated_at();

-- Review action on a price observation (state transition with comment).
create table if not exists public.price_review_events (
  id                   uuid primary key default gen_random_uuid(),
  price_observation_id uuid not null references public.price_observations (id),
  reviewer_id          uuid not null references auth.users (id),
  from_state           text not null check (from_state in (
                         'unverified', 'source_captured', 'structurally_validated',
                         'analyst_reviewed', 'domain_expert_reviewed', 'superseded',
                         'disputed', 'expired')),
  to_state             text not null check (to_state in (
                         'unverified', 'source_captured', 'structurally_validated',
                         'analyst_reviewed', 'domain_expert_reviewed', 'superseded',
                         'disputed', 'expired')),
  comment              text,
  reviewed_at          timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid references auth.users (id),
  updated_by           uuid references auth.users (id),
  visibility           text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo              boolean not null default false,
  archived_at          timestamptz,
  tenant_id            uuid references public.tenants (id),
  constraint price_review_events_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.price_review_events is 'Review action on a price observation; writes require owner/admin/reviewer (RLS).';
create or replace trigger trg_price_review_events_set_updated_at before update on public.price_review_events for each row execute function public.set_updated_at();
