-- 20260727000002_organizations.sql
-- Organization & places domain: geographies, addresses, organizations and
-- their aliases/identifiers/relationships/classifications, sites and their
-- sub-units, plus the tenant-private people/contacts overlay.
-- Column names are snake_case mirrors of src/lib/domain/types.ts.
-- Idempotent: safe to re-run.
--
-- Edge-evidence column set (flattened EdgeEvidence, used on relationship and
-- classification rows): source_id, confidence (0-1), valid_from, valid_to,
-- reviewer_id, notes, evidence_state. source_id FKs to public.sources are
-- added in 20260727000007 (sources is created there).

-- ---------------------------------------------------------------------------
-- geographies
-- ---------------------------------------------------------------------------

-- Reference geography tree: country -> region -> province -> city.
create table if not exists public.geographies (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,             -- 'VN', 'VN-SG' (Ho Chi Minh City), 'APAC'
  name        text not null,
  level       text not null check (level in ('country', 'region', 'province', 'city')),
  parent_code text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  constraint geographies_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.geographies is 'Geography reference tree keyed by stable codes (ISO-derived).';
create or replace trigger trg_geographies_set_updated_at before update on public.geographies for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- addresses
-- ---------------------------------------------------------------------------

-- Postal address; referenced by sites and other place-bearing entities.
create table if not exists public.addresses (
  id          uuid primary key default gen_random_uuid(),
  line1       text not null,
  line2       text,
  city        text not null,
  province    text,
  district    text,
  postal_code text,
  country     text not null,                    -- ISO 3166-1 alpha-2
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  constraint addresses_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.addresses is 'Postal addresses (ISO alpha-2 country codes).';
create or replace trigger trg_addresses_set_updated_at before update on public.addresses for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------

-- Canonical organization node. `types` is constrained to the domain taxonomy;
-- `identifiers` mirrors the TS embedded array (the queryable relational form
-- lives in organization_identifiers).
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique,                      -- human-readable secondary identifier
  name        text not null,
  types       text[] not null check (types <@ array[
                'manufacturer', 'brand_owner', 'distributor', 'dealer', 'importer',
                'service_provider', 'pharmaceutical_company', 'food_manufacturer',
                'testing_laboratory', 'cro', 'cdmo', 'government_laboratory',
                'university', 'hospital', 'consultant'
              ]::text[]),
  country     text not null,                    -- ISO 3166-1 alpha-2
  website     text,
  identifiers jsonb not null default '[]',      -- [{scheme, value}]
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  constraint organizations_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.organizations is 'Canonical organization graph node (layer A); types constrained to ORGANIZATION_TYPES.';
create or replace trigger trg_organizations_set_updated_at before update on public.organizations for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- organization_aliases
-- ---------------------------------------------------------------------------

-- Alternate names for an organization (from merges, users, imports); drives
-- dedupe and trigram search.
create table if not exists public.organization_aliases (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  alias           text not null,
  source          text check (source in ('merge', 'user', 'import')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id),
  updated_by      uuid references auth.users (id),
  visibility      text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo         boolean not null default false,
  archived_at     timestamptz,
  tenant_id       uuid references public.tenants (id),
  unique (organization_id, alias),
  constraint organization_aliases_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.organization_aliases is 'Alias names per organization (merge/user/import provenance).';
create or replace trigger trg_organization_aliases_set_updated_at before update on public.organization_aliases for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- organization_identifiers
-- ---------------------------------------------------------------------------

-- Relational form of organization identifiers (tax code, DUNS, certificates).
create table if not exists public.organization_identifiers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  scheme          text not null check (scheme in ('tax_code', 'duns', 'gmp_certificate', 'iso_certificate', 'domain', 'other')),
  value           text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id),
  updated_by      uuid references auth.users (id),
  visibility      text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo         boolean not null default false,
  archived_at     timestamptz,
  tenant_id       uuid references public.tenants (id),
  unique (scheme, value),
  constraint organization_identifiers_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.organization_identifiers is 'External identifiers per organization, unique per scheme+value.';
create or replace trigger trg_organization_identifiers_set_updated_at before update on public.organization_identifiers for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- organization_relationships
-- ---------------------------------------------------------------------------

-- Evidence-carrying edge between two organizations (owns_brand, distributes_for…).
create table if not exists public.organization_relationships (
  id             uuid primary key default gen_random_uuid(),
  from_org_id    uuid not null references public.organizations (id),
  to_org_id      uuid not null references public.organizations (id),
  type           text not null check (type in ('owns_brand', 'manufactures', 'distributes_for', 'subsidiary_of', 'partner_of')),
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
  constraint organization_relationships_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  ),
  constraint organization_relationships_no_self_loop check (from_org_id <> to_org_id)
);
comment on table public.organization_relationships is 'Evidence-carrying org-to-org edges (owns_brand, manufactures, distributes_for, subsidiary_of, partner_of).';
create or replace trigger trg_organization_relationships_set_updated_at before update on public.organization_relationships for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- organization_classifications
-- ---------------------------------------------------------------------------

-- Free-scheme classification tags on organizations (industry codes, custom
-- segmentations), with evidence.
create table if not exists public.organization_classifications (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations (id),
  classification_type text not null,            -- e.g. 'industry', 'segment', 'custom'
  value               text not null,
  source_id           uuid,                     -- FK to public.sources added in 20260727000007
  confidence          numeric not null check (confidence between 0 and 1),
  valid_from          date,
  valid_to            date,
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
  unique (organization_id, classification_type, value),
  constraint organization_classifications_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.organization_classifications is 'Evidence-backed classification tags per organization.';
create or replace trigger trg_organization_classifications_set_updated_at before update on public.organization_classifications for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- sites
-- ---------------------------------------------------------------------------

-- Physical site of an organization (factory, warehouse, office, laboratory_site).
create table if not exists public.sites (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name            text not null,
  site_type       text not null check (site_type in ('factory', 'warehouse', 'office', 'laboratory_site')),
  address_id      uuid references public.addresses (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id),
  updated_by      uuid references auth.users (id),
  visibility      text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo         boolean not null default false,
  archived_at     timestamptz,
  tenant_id       uuid references public.tenants (id),
  constraint sites_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.sites is 'Physical sites belonging to organizations.';
create or replace trigger trg_sites_set_updated_at before update on public.sites for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- site_aliases
-- ---------------------------------------------------------------------------

-- Alternate names for a site (local nicknames, legacy codes).
create table if not exists public.site_aliases (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites (id),
  alias       text not null,
  source      text check (source in ('merge', 'user', 'import')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  unique (site_id, alias),
  constraint site_aliases_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.site_aliases is 'Alias names per site (merge/user/import provenance).';
create or replace trigger trg_site_aliases_set_updated_at before update on public.site_aliases for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- facility_units / laboratories / production_lines
-- ---------------------------------------------------------------------------

-- Subdivision of a site (building, wing, cleanroom block).
create table if not exists public.facility_units (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites (id),
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
  constraint facility_units_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.facility_units is 'Named subdivision of a site.';
create or replace trigger trg_facility_units_set_updated_at before update on public.facility_units for each row execute function public.set_updated_at();

-- Laboratory inside a site, typed by discipline.
create table if not exists public.laboratories (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites (id),
  name        text not null,
  lab_type    text not null check (lab_type in ('microbiology', 'qc', 'sterility', 'r_and_d', 'other')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  constraint laboratories_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.laboratories is 'Typed laboratory inside a site.';
create or replace trigger trg_laboratories_set_updated_at before update on public.laboratories for each row execute function public.set_updated_at();

-- Production line inside a site.
create table if not exists public.production_lines (
  id                  uuid primary key default gen_random_uuid(),
  site_id             uuid not null references public.sites (id),
  name                text not null,
  product_description text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references auth.users (id),
  updated_by          uuid references auth.users (id),
  visibility          text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo             boolean not null default false,
  archived_at         timestamptz,
  tenant_id           uuid references public.tenants (id),
  constraint production_lines_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.production_lines is 'Production line inside a site; feeds new_production_line signals.';
create or replace trigger trg_production_lines_set_updated_at before update on public.production_lines for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- people (ALWAYS tenant-private)
-- ---------------------------------------------------------------------------

-- A person known to one tenant (market actor, contact). Never canonical:
-- enforced by the CHECK below and by RLS.
create table if not exists public.people (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id),
  full_name   text not null,
  title       text,
  email       text,
  phone       text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  constraint people_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  ),
  constraint people_always_private_check check (visibility = 'tenant_private')
);
comment on table public.people is 'Tenant-private person records; ALWAYS visibility=tenant_private (PII).';
create or replace trigger trg_people_set_updated_at before update on public.people for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- person_aliases
-- ---------------------------------------------------------------------------

-- Alternate names/spellings for a person.
create table if not exists public.person_aliases (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id),
  person_id   uuid not null references public.people (id),
  alias       text not null,
  source      text check (source in ('merge', 'user', 'import')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  unique (person_id, alias),
  constraint person_aliases_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.person_aliases is 'Alias names per person (tenant-private).';
create or replace trigger trg_person_aliases_set_updated_at before update on public.person_aliases for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- employment_relationships
-- ---------------------------------------------------------------------------

-- Person works/worked at an organization, with a free-text role.
create table if not exists public.employment_relationships (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id),
  person_id       uuid not null references public.people (id),
  organization_id uuid not null references public.organizations (id),
  role            text,
  current         boolean not null default true,
  started_at      timestamptz,
  ended_at        timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id),
  updated_by      uuid references auth.users (id),
  visibility      text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo         boolean not null default false,
  archived_at     timestamptz,
  constraint employment_relationships_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.employment_relationships is 'Tenant-private employment link between a person and an organization.';
create or replace trigger trg_employment_relationships_set_updated_at before update on public.employment_relationships for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- professional_roles
-- ---------------------------------------------------------------------------

-- Typed professional role history of a person (e.g. 'QA manager'), distinct
-- from employment rows which record the employer link itself.
create table if not exists public.professional_roles (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id),
  person_id       uuid not null references public.people (id),
  organization_id uuid references public.organizations (id),
  role_name       text not null,
  is_current      boolean not null default true,
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
  constraint professional_roles_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.professional_roles is 'Tenant-private typed role history for a person.';
create or replace trigger trg_professional_roles_set_updated_at before update on public.professional_roles for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- organization_contacts (ALWAYS tenant-private)
-- ---------------------------------------------------------------------------

-- Buying-committee view of a person at an organization. Never canonical.
create table if not exists public.organization_contacts (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id),
  person_id       uuid not null references public.people (id),
  organization_id uuid not null references public.organizations (id),
  site_id         uuid references public.sites (id),
  decision_roles  text[] not null default '{}' check (decision_roles <@ array[
                    'user', 'technical_evaluator', 'qa_approver', 'procurement',
                    'economic_buyer', 'influencer', 'blocker', 'champion', 'service_owner'
                  ]::text[]),
  is_primary      boolean not null default false,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id),
  updated_by      uuid references auth.users (id),
  visibility      text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo         boolean not null default false,
  archived_at     timestamptz,
  constraint organization_contacts_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  ),
  constraint organization_contacts_always_private_check check (visibility = 'tenant_private')
);
comment on table public.organization_contacts is 'Tenant-private buying-committee contacts; ALWAYS visibility=tenant_private (PII).';
create or replace trigger trg_organization_contacts_set_updated_at before update on public.organization_contacts for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- contact_observations (ALWAYS tenant-private)
-- ---------------------------------------------------------------------------

-- One observed interaction/sighting of a contact (call, visit, email). Never
-- canonical; the raw material of relationship intelligence.
create table if not exists public.contact_observations (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references public.tenants (id),
  organization_contact_id uuid not null references public.organization_contacts (id),
  observed_at             timestamptz not null,
  channel                 text,                 -- e.g. 'phone', 'visit', 'email', 'tender'
  summary                 text not null,
  source_id               uuid,                 -- FK to public.sources added in 20260727000007
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  created_by              uuid references auth.users (id),
  updated_by              uuid references auth.users (id),
  visibility              text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo                 boolean not null default false,
  archived_at             timestamptz,
  constraint contact_observations_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  ),
  constraint contact_observations_always_private_check check (visibility = 'tenant_private')
);
comment on table public.contact_observations is 'Tenant-private interaction log per contact; ALWAYS visibility=tenant_private (PII).';
create or replace trigger trg_contact_observations_set_updated_at before update on public.contact_observations for each row execute function public.set_updated_at();
