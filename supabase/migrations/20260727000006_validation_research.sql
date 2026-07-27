-- 20260727000006_validation_research.sql
-- Validation / vendor-status overlay and the tenant research workspace.
-- Every table here is tenant-scoped (tenant_id NOT NULL); the layer CHECK
-- forces visibility='tenant_private'.
-- Column names are snake_case mirrors of src/lib/domain/types.ts.
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- vendor_approvals / product_validations / method_validations
-- ---------------------------------------------------------------------------

-- Customer's approved-vendor-list entry for one supplier.
create table if not exists public.vendor_approvals (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id),
  organization_id uuid not null references public.organizations (id),  -- the customer holding the AVL
  supplier_org_id uuid not null references public.organizations (id),
  status          text not null check (status in ('approved', 'pending', 'rejected', 'expired')),
  valid_to        date,
  source_id       uuid,                         -- FK to public.sources added in 20260727000007
  confidence      numeric not null check (confidence between 0 and 1),
  valid_from      date,
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
  unique (tenant_id, organization_id, supplier_org_id),
  constraint vendor_approvals_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.vendor_approvals is 'Tenant-private approved-vendor-list entry with evidence.';
create or replace trigger trg_vendor_approvals_set_updated_at before update on public.vendor_approvals for each row execute function public.set_updated_at();

-- A customer's validation of one SKU for use in their processes.
create table if not exists public.product_validations (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id),
  organization_id uuid not null references public.organizations (id),
  sku_id          uuid not null references public.skus (id),
  status          text not null default 'not_started' check (status in ('not_started', 'planned', 'in_progress', 'passed', 'failed')),
  method          text,                         -- validation method/protocol reference
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id),
  updated_by      uuid references auth.users (id),
  visibility      text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo         boolean not null default false,
  archived_at     timestamptz,
  unique (tenant_id, organization_id, sku_id),
  constraint product_validations_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.product_validations is 'Tenant-private customer validation of a SKU.';
create or replace trigger trg_product_validations_set_updated_at before update on public.product_validations for each row execute function public.set_updated_at();

-- A customer's validation of a method (protocol) for their processes.
create table if not exists public.method_validations (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants (id),
  organization_id    uuid not null references public.organizations (id),
  method_id          uuid not null references public.methods (id),
  status             text not null default 'not_started' check (status in ('not_started', 'planned', 'in_progress', 'passed', 'failed')),
  protocol_reference text,
  completed_at       timestamptz,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users (id),
  updated_by         uuid references auth.users (id),
  visibility         text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo            boolean not null default false,
  archived_at        timestamptz,
  unique (tenant_id, organization_id, method_id),
  constraint method_validations_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.method_validations is 'Tenant-private customer validation of a method.';
create or replace trigger trg_method_validations_set_updated_at before update on public.method_validations for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- trial_events / qualification_statuses / validation_evidence
-- ---------------------------------------------------------------------------

-- Commercial/technical trial milestone at a customer.
create table if not exists public.trial_events (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenants (id),
  organization_id       uuid not null references public.organizations (id),
  sku_id                uuid references public.skus (id),
  product_validation_id uuid references public.product_validations (id),
  type                  text not null check (type in ('sample_sent', 'trial_started', 'trial_completed', 'feedback_received', 'other')),
  at                    timestamptz not null,
  outcome               text,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references auth.users (id),
  updated_by            uuid references auth.users (id),
  visibility            text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo               boolean not null default false,
  archived_at           timestamptz,
  constraint trial_events_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.trial_events is 'Tenant-private trial milestone (sample sent, trial started/completed, feedback).';
create or replace trigger trg_trial_events_set_updated_at before update on public.trial_events for each row execute function public.set_updated_at();

-- Customer-side qualification registry entry (a SKU or supplier is qualified
-- for use at a customer organization).
create table if not exists public.qualification_statuses (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id),
  organization_id uuid not null references public.organizations (id),
  sku_id          uuid references public.skus (id),
  supplier_org_id uuid references public.organizations (id),
  status          text not null check (status in ('qualified', 'conditionally_qualified', 'not_qualified', 'expired', 'unknown')),
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
  constraint qualification_statuses_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  ),
  constraint qualification_statuses_target_check check ((sku_id is not null) <> (supplier_org_id is not null))
);
comment on table public.qualification_statuses is 'Tenant-private qualification registry per customer organization.';
create or replace trigger trg_qualification_statuses_set_updated_at before update on public.qualification_statuses for each row execute function public.set_updated_at();

-- Evidence document attached to a validation/qualification record
-- (polymorphic subject, constrained by subject_type).
create table if not exists public.validation_evidence (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id),
  subject_type   text not null check (subject_type in ('product_validation', 'method_validation', 'vendor_approval', 'qualification_status', 'trial_event')),
  subject_id     uuid not null,                 -- row id of the subject_type table
  source_id      uuid,                          -- FK to public.sources added in 20260727000007
  summary        text,
  confidence     numeric check (confidence is null or confidence between 0 and 1),
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
  constraint validation_evidence_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.validation_evidence is 'Tenant-private evidence attached to validation/qualification records.';
create or replace trigger trg_validation_evidence_set_updated_at before update on public.validation_evidence for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- research workspace
-- ---------------------------------------------------------------------------

-- A research project: the question it sets out to answer plus scope.
create table if not exists public.research_projects (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id),
  title           text not null,
  question        text not null,
  scope           text,
  geography_codes text[] not null default '{}',
  industry_codes  text[] not null default '{}',
  status          text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id),
  updated_by      uuid references auth.users (id),
  visibility      text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo         boolean not null default false,
  archived_at     timestamptz,
  constraint research_projects_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.research_projects is 'Tenant research project (question, scope, geography/industry filter).';
create or replace trigger trg_research_projects_set_updated_at before update on public.research_projects for each row execute function public.set_updated_at();

-- A tracked sub-question inside a research project.
create table if not exists public.research_questions (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id),
  project_id  uuid not null references public.research_projects (id),
  question    text not null,
  status      text not null default 'open' check (status in ('open', 'answered', 'parked')),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  constraint research_questions_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.research_questions is 'Sub-question tracked inside a research project.';
create or replace trigger trg_research_questions_set_updated_at before update on public.research_questions for each row execute function public.set_updated_at();

-- A named curated collection inside (or outside) a research project.
create table if not exists public.research_collections (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id),
  project_id  uuid references public.research_projects (id),
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  constraint research_collections_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.research_collections is 'Named curated collection of entities.';
create or replace trigger trg_research_collections_set_updated_at before update on public.research_collections for each row execute function public.set_updated_at();

-- Persisted list-view configuration (filters/sort/columns).
create table if not exists public.saved_views (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id),
  name        text not null,
  entity_type text not null,
  params      jsonb not null default '{}',      -- serialized filters/sort/visible columns
  owner_id    uuid not null references auth.users (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  constraint saved_views_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.saved_views is 'Persisted list-view configuration owned by a user.';
create or replace trigger trg_saved_views_set_updated_at before update on public.saved_views for each row execute function public.set_updated_at();

-- Free-text note inside a research project, optionally pinned to an entity.
create table if not exists public.research_notes (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id),
  project_id  uuid not null references public.research_projects (id),
  text        text not null,
  entity_type text,
  entity_id   uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  constraint research_notes_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.research_notes is 'Research note, optionally pinned to an entity.';
create or replace trigger trg_research_notes_set_updated_at before update on public.research_notes for each row execute function public.set_updated_at();

-- Research output with an explicit epistemic kind; verified_fact findings
-- must list supporting claims in evidence_claim_ids.
create table if not exists public.research_findings (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants (id),
  project_id         uuid not null references public.research_projects (id),
  kind               text not null check (kind in ('verified_fact', 'analyst_interpretation', 'assumption', 'unknown', 'recommendation')),
  text               text not null,
  evidence_claim_ids uuid[] not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users (id),
  updated_by         uuid references auth.users (id),
  visibility         text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo            boolean not null default false,
  archived_at        timestamptz,
  constraint research_findings_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  ),
  constraint research_findings_fact_needs_evidence check (
    kind <> 'verified_fact' or array_length(evidence_claim_ids, 1) is not null
  )
);
comment on table public.research_findings is 'Research finding with epistemic kind; verified_fact requires evidence claims.';
create or replace trigger trg_research_findings_set_updated_at before update on public.research_findings for each row execute function public.set_updated_at();

-- An exported artifact of a project (or standalone) in a given format.
create table if not exists public.research_exports (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id),
  project_id   uuid references public.research_projects (id),
  format       text not null check (format in ('pdf', 'csv', 'xlsx', 'json', 'web_report')),
  file_name    text,
  storage_path text,                            -- storage bucket path, never a public URL
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id),
  updated_by   uuid references auth.users (id),
  visibility   text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo      boolean not null default false,
  archived_at  timestamptz,
  constraint research_exports_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.research_exports is 'Export artifact metadata (pdf/csv/xlsx/json/web_report).';
create or replace trigger trg_research_exports_set_updated_at before update on public.research_exports for each row execute function public.set_updated_at();

-- Loose link from a research project to any entity in the graph.
create table if not exists public.research_project_entities (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id),
  project_id  uuid not null references public.research_projects (id),
  entity_type text not null,
  entity_id   uuid not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  unique (project_id, entity_type, entity_id),
  constraint research_project_entities_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.research_project_entities is 'Link from a research project to any graph entity.';
create or replace trigger trg_research_project_entities_set_updated_at before update on public.research_project_entities for each row execute function public.set_updated_at();

-- Saved, named cost-per-test scenario (tenant-private analysis artifact).
-- The input payload mirrors CostPerTestInput in src/lib/domain/types.ts.
create table if not exists public.cost_per_test_scenarios (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants (id),
  name                 text not null,
  sku_id               uuid references public.skus (id),
  price_observation_id uuid references public.price_observations (id),
  input                jsonb not null,          -- CostPerTestInput
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid references auth.users (id),
  updated_by           uuid references auth.users (id),
  visibility           text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo              boolean not null default false,
  archived_at          timestamptz,
  constraint cost_per_test_scenarios_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.cost_per_test_scenarios is 'Tenant-private saved cost-per-test scenario (input mirrors CostPerTestInput).';
create or replace trigger trg_cost_per_test_scenarios_set_updated_at before update on public.cost_per_test_scenarios for each row execute function public.set_updated_at();
