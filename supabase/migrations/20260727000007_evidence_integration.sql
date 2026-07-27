-- 20260727000007_evidence_integration.sql
-- Evidence spine (sources, claims, reviews, audit), integration layer
-- (external references, sync events, errors, handoffs), derived intelligence
-- (opportunity_signals, equivalence_records), entity resolution
-- (duplicate_candidates), and ingestion staging (import_batches,
-- import_staging_rows).
-- Column names are snake_case mirrors of src/lib/domain/types.ts.
-- Idempotent: safe to re-run.
--
-- This migration also adds the deferred source_id foreign keys for tables
-- created in earlier migrations (sources did not exist yet), and attaches the
-- touch_audit_log() trigger to the audited tables now that audit_log exists.

-- ---------------------------------------------------------------------------
-- sources / source_documents / source_snapshots
-- ---------------------------------------------------------------------------

-- A piece of evidence: a document, page, conversation or observation.
create table if not exists public.sources (
  id           uuid primary key default gen_random_uuid(),
  type         text not null check (type in (
                 'manufacturer_catalogue', 'manufacturer_website', 'regulatory_document',
                 'standard', 'tender_document', 'public_company_document',
                 'distributor_quotation', 'customer_quotation', 'import_record',
                 'customer_conversation', 'field_observation', 'internal_note',
                 'user_uploaded_document', 'public_web_source')),
  title        text not null,
  publisher    text,
  url          text,
  published_at date,                            -- when the source itself was published
  captured_at  timestamptz not null default now(),  -- when evidence entered Nexus
  document_id  uuid,                            -- FK added after source_documents is created (below)
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id),
  updated_by   uuid references auth.users (id),
  visibility   text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo      boolean not null default false,
  archived_at  timestamptz,
  tenant_id    uuid references public.tenants (id),
  constraint sources_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.sources is 'Evidence source (document, page, conversation, observation); the root of all claims.';
create or replace trigger trg_sources_set_updated_at before update on public.sources for each row execute function public.set_updated_at();

-- Uploaded file backing a source; storage_path never a public URL for
-- tenant-private files.
create table if not exists public.source_documents (
  id           uuid primary key default gen_random_uuid(),
  source_id    uuid references public.sources (id),
  file_name    text not null,
  mime_type    text not null,
  storage_path text not null,                   -- storage bucket path
  sha256       text,
  page_count   integer check (page_count is null or page_count > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id),
  updated_by   uuid references auth.users (id),
  visibility   text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo      boolean not null default false,
  archived_at  timestamptz,
  tenant_id    uuid references public.tenants (id),
  constraint source_documents_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.source_documents is 'Uploaded file backing a source (bucket path, sha256).';
create or replace trigger trg_source_documents_set_updated_at before update on public.source_documents for each row execute function public.set_updated_at();

-- Deferred self-referential FK: sources.document_id -> source_documents.id.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sources_document_id_fkey') then
    alter table public.sources
      add constraint sources_document_id_fkey
      foreign key (document_id) references public.source_documents (id);
  end if;
end $$;

-- Point-in-time capture of a source's content (for web sources that change).
create table if not exists public.source_snapshots (
  id           uuid primary key default gen_random_uuid(),
  source_id    uuid not null references public.sources (id),
  captured_at  timestamptz not null default now(),
  storage_path text,                            -- archived copy in storage
  sha256       text,
  excerpt      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id),
  updated_by   uuid references auth.users (id),
  visibility   text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo      boolean not null default false,
  archived_at  timestamptz,
  tenant_id    uuid references public.tenants (id),
  constraint source_snapshots_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.source_snapshots is 'Point-in-time capture of a source (content hash + archived copy).';
create or replace trigger trg_source_snapshots_set_updated_at before update on public.source_snapshots for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- claims / claim_evidence_links / evidence_reviews / review_assignments
-- ---------------------------------------------------------------------------

-- Atomic, evidence-backed statement about one entity. Everything the app
-- presents as fact should trace back to claims.
create table if not exists public.claims (
  id                       uuid primary key default gen_random_uuid(),
  subject_entity_type      text not null,
  subject_entity_id        uuid not null,
  predicate                text not null,       -- e.g. 'distributed_by', 'conforms_to_standard', 'has_price'
  object_value             jsonb not null,
  source_id                uuid not null references public.sources (id),
  effective_date           date,                -- from when the claim is true in the real world
  review_by_date           date,                -- past due -> review queue
  confidence               jsonb not null,      -- ConfidenceDimensions (7 keys, each 0-1)
  review_status            text not null default 'unverified' check (review_status in (
                             'unverified', 'source_captured', 'structurally_validated',
                             'analyst_reviewed', 'domain_expert_reviewed', 'superseded',
                             'disputed', 'expired')),
  reviewer_id              uuid references auth.users (id),
  contradicting_claim_ids  uuid[] not null default '{}',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid references auth.users (id),
  updated_by               uuid references auth.users (id),
  visibility               text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo                  boolean not null default false,
  archived_at              timestamptz,
  tenant_id                uuid references public.tenants (id),
  constraint claims_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.claims is 'Atomic evidence-backed statement about one entity, with dimensional confidence.';
create or replace trigger trg_claims_set_updated_at before update on public.claims for each row execute function public.set_updated_at();

-- Additional evidence links for a claim beyond its primary source.
create table if not exists public.claim_evidence_links (
  id          uuid primary key default gen_random_uuid(),
  claim_id    uuid not null references public.claims (id),
  source_id   uuid not null references public.sources (id),
  link_type   text not null check (link_type in ('supports', 'contradicts', 'context')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  unique (claim_id, source_id, link_type),
  constraint claim_evidence_links_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.claim_evidence_links is 'Extra source links per claim (supports/contradicts/context).';
create or replace trigger trg_claim_evidence_links_set_updated_at before update on public.claim_evidence_links for each row execute function public.set_updated_at();

-- Review action on a claim (evidence-state transition with comment). Writes
-- require owner/admin/reviewer (RLS, see 20260727000009_rls.sql).
create table if not exists public.evidence_reviews (
  id          uuid primary key default gen_random_uuid(),
  claim_id    uuid not null references public.claims (id),
  reviewer_id uuid not null references auth.users (id),
  from_state  text not null check (from_state in (
                'unverified', 'source_captured', 'structurally_validated',
                'analyst_reviewed', 'domain_expert_reviewed', 'superseded',
                'disputed', 'expired')),
  to_state    text not null check (to_state in (
                'unverified', 'source_captured', 'structurally_validated',
                'analyst_reviewed', 'domain_expert_reviewed', 'superseded',
                'disputed', 'expired')),
  comment     text,
  reviewed_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  constraint evidence_reviews_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.evidence_reviews is 'Review action on a claim; writes require owner/admin/reviewer (RLS).';
create or replace trigger trg_evidence_reviews_set_updated_at before update on public.evidence_reviews for each row execute function public.set_updated_at();

-- Review-queue assignment (a claim or entity assigned to a reviewer).
create table if not exists public.review_assignments (
  id          uuid primary key default gen_random_uuid(),
  claim_id    uuid references public.claims (id),
  entity_type text,
  entity_id   uuid,
  assignee_id uuid not null references auth.users (id),
  assigned_by uuid references auth.users (id),
  status      text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'cancelled')),
  due_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  constraint review_assignments_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.review_assignments is 'Review-queue assignment; writes require owner/admin/reviewer (RLS).';
create or replace trigger trg_review_assignments_set_updated_at before update on public.review_assignments for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- data_quality_issues / change_requests / entity_merge_events / audit_log
-- ---------------------------------------------------------------------------

-- A detected data-quality problem on an entity.
create table if not exists public.data_quality_issues (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in (
                'missing_field', 'inconsistent_value', 'stale_evidence',
                'possible_duplicate', 'contradicting_claims',
                'normalization_warning', 'other')),
  entity_type text not null,
  entity_id   uuid not null,
  field       text,
  description text not null,
  severity    text not null check (severity in ('low', 'medium', 'high')),
  status      text not null default 'open' check (status in ('open', 'acknowledged', 'resolved', 'wont_fix')),
  resolved_by uuid references auth.users (id),
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  constraint data_quality_issues_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.data_quality_issues is 'Data-quality issue on an entity with severity and workflow status.';
create or replace trigger trg_data_quality_issues_set_updated_at before update on public.data_quality_issues for each row execute function public.set_updated_at();

-- Request to change canonical data (the only door into layer A — ADR 0002
-- publish workflow). tenant_id = requesting tenant; approval applies the
-- change via service role.
create table if not exists public.change_requests (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null,
  entity_id    uuid,
  request_type text not null check (request_type in ('create', 'update', 'merge', 'publish', 'delete')),
  payload      jsonb not null default '{}',
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'applied')),
  requested_by uuid references auth.users (id),
  reviewed_by  uuid references auth.users (id),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id),
  updated_by   uuid references auth.users (id),
  visibility   text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo      boolean not null default false,
  archived_at  timestamptz,
  tenant_id    uuid references public.tenants (id),
  constraint change_requests_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.change_requests is 'Publish/change request into the canonical layer; writes require owner/admin/reviewer (RLS).';
create or replace trigger trg_change_requests_set_updated_at before update on public.change_requests for each row execute function public.set_updated_at();

-- Record of a completed entity merge (never silent: aliases preserved,
-- redirect kept).
create table if not exists public.entity_merge_events (
  id                 uuid primary key default gen_random_uuid(),
  entity_type        text not null,
  survivor_id        uuid not null,
  merged_id          uuid not null,
  field_resolutions  jsonb not null default '{}',
  alias_preservation boolean not null default true,
  redirect_created   boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users (id),
  updated_by         uuid references auth.users (id),
  visibility         text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo            boolean not null default false,
  archived_at        timestamptz,
  tenant_id          uuid references public.tenants (id),
  constraint entity_merge_events_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.entity_merge_events is 'Completed entity merge record; writes require owner/admin/reviewer (RLS).';
create or replace trigger trg_entity_merge_events_set_updated_at before update on public.entity_merge_events for each row execute function public.set_updated_at();

-- Append-only audit record. INSERTs happen only through the SECURITY DEFINER
-- touch_audit_log() trigger; authenticated roles have no INSERT/UPDATE/DELETE
-- grants (see the RLS migration).
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references public.tenants (id),  -- null for platform-level entries
  actor_id    uuid references auth.users (id),      -- null for system/service actions
  action      text not null,                        -- e.g. 'organizations.create', 'claims.review'
  entity_type text not null,
  entity_id   uuid,
  at          timestamptz not null default now(),
  before      jsonb,
  after       jsonb,
  metadata    jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  constraint audit_log_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.audit_log is 'Append-only audit trail; insert-only via touch_audit_log() trigger, select by members.';
create or replace trigger trg_audit_log_set_updated_at before update on public.audit_log for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- integration layer (layer D + tenant sync plumbing)
-- ---------------------------------------------------------------------------

-- Link between a Nexus entity and its counterpart in Atlas or Memoire.
-- Content-free, one-hop, dangling-tolerant (docs/INTEGRATION_CONTRACTS.md).
create table if not exists public.external_entity_references (
  id                uuid primary key default gen_random_uuid(),
  nexus_entity_type text not null,
  nexus_entity_id   uuid not null,
  system            text not null check (system in ('life_science_atlas', 'memoire')),
  external_id       text not null,
  external_url      text,
  synced_at         timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references auth.users (id),
  updated_by        uuid references auth.users (id),
  visibility        text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo           boolean not null default false,
  archived_at       timestamptz,
  tenant_id         uuid references public.tenants (id),
  unique (nexus_entity_type, nexus_entity_id, system, external_id),
  constraint external_entity_references_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.external_entity_references is 'Layer D link from a Nexus entity to an Atlas/Memoire record.';
create or replace trigger trg_external_entity_references_set_updated_at before update on public.external_entity_references for each row execute function public.set_updated_at();

-- One run of an integration sync (inbound or outbound).
create table if not exists public.integration_sync_events (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references public.tenants (id),
  integration_connection_id uuid references public.integration_connections (id),
  system                   text not null check (system in ('life_science_atlas', 'memoire')),
  direction                text not null check (direction in ('inbound', 'outbound')),
  status                   text not null default 'started' check (status in ('started', 'succeeded', 'failed')),
  started_at               timestamptz not null default now(),
  finished_at              timestamptz,
  records_processed        integer check (records_processed is null or records_processed >= 0),
  summary                  jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid references auth.users (id),
  updated_by               uuid references auth.users (id),
  visibility               text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo                  boolean not null default false,
  archived_at              timestamptz,
  constraint integration_sync_events_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.integration_sync_events is 'Tenant-private integration sync run record.';
create or replace trigger trg_integration_sync_events_set_updated_at before update on public.integration_sync_events for each row execute function public.set_updated_at();

-- Error captured during an integration sync or handoff.
create table if not exists public.integration_errors (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references public.tenants (id),
  integration_connection_id uuid references public.integration_connections (id),
  sync_event_id            uuid references public.integration_sync_events (id),
  entity_type              text,
  entity_id                uuid,
  error_code               text,
  message                  text not null,
  payload                  jsonb,
  occurred_at              timestamptz not null default now(),
  resolved_at              timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid references auth.users (id),
  updated_by               uuid references auth.users (id),
  visibility               text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo                  boolean not null default false,
  archived_at              timestamptz,
  constraint integration_errors_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.integration_errors is 'Tenant-private integration error record.';
create or replace trigger trg_integration_errors_set_updated_at before update on public.integration_errors for each row execute function public.set_updated_at();

-- Audit record of a handoff payload prepared for Memoire
-- (contract: nexus-handoff/v1).
create table if not exists public.outbound_handoff_records (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id),
  target_system text not null default 'memoire' check (target_system in ('memoire')),
  payload       jsonb not null,                 -- the exact payload handed off
  sent_at       timestamptz,
  status        text not null default 'prepared' check (status in ('prepared', 'copied', 'downloaded', 'sent', 'acknowledged')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id),
  updated_by    uuid references auth.users (id),
  visibility    text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo       boolean not null default false,
  archived_at   timestamptz,
  constraint outbound_handoff_records_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.outbound_handoff_records is 'Tenant-private audit of Nexus->Memoire handoff payloads (nexus-handoff/v1).';
create or replace trigger trg_outbound_handoff_records_set_updated_at before update on public.outbound_handoff_records for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- derived intelligence (layer C)
-- ---------------------------------------------------------------------------

-- Derived, explainable commercial signal. Always carries the records that
-- triggered it and a human-readable reason.
create table if not exists public.opportunity_signals (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenants (id),
  type                  text not null check (type in (
                          'equipment_replacement_due', 'consumable_pullthrough',
                          'tender_renewal_expected', 'supplier_agreement_expired',
                          'price_stale', 'competitor_product_discontinued',
                          'new_factory_or_lab', 'facility_expansion',
                          'new_production_line', 'regulatory_change',
                          'missing_local_supplier', 'portfolio_whitespace',
                          'cross_sell_gap', 'vendor_approval_gap',
                          'validation_pending', 'repeated_stock_issue',
                          'unusual_price_increase', 'asset_without_consumables',
                          'incomplete_product_coverage')),
  related_entities      jsonb not null default '[]',   -- EntityRef[]
  triggering_record_ids uuid[] not null default '{}',
  reason                text not null,
  confidence            numeric not null check (confidence between 0 and 1),
  commercial_relevance  text not null check (commercial_relevance in ('low', 'medium', 'high')),
  generated_at          timestamptz not null default now(),
  expires_at            timestamptz,
  recommended_action    text not null,
  status                text not null default 'new' check (status in ('new', 'acknowledged', 'sent_to_memoire', 'dismissed')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references auth.users (id),
  updated_by            uuid references auth.users (id),
  visibility            text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo               boolean not null default false,
  archived_at           timestamptz,
  constraint opportunity_signals_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.opportunity_signals is 'Layer C: derived commercial signal with triggering-record lineage (tenant-scoped).';
create or replace trigger trg_opportunity_signals_set_updated_at before update on public.opportunity_signals for each row execute function public.set_updated_at();

-- Assessed equivalence between two SKUs (decision support only — never a
-- regulatory approval).
create table if not exists public.equivalence_records (
  id                        uuid primary key default gen_random_uuid(),
  source_sku_id             uuid not null references public.skus (id),
  candidate_sku_id          uuid not null references public.skus (id),
  classification            text not null check (classification in (
                              'exact_equivalent', 'functional_equivalent',
                              'closest_alternative', 'not_recommended_substitute')),
  overall_score             numeric not null check (overall_score between 0 and 100),
  dimension_scores          jsonb not null,         -- Record<EquivalenceDimension, DimensionScore>
  rationale                 text not null,
  differences               jsonb not null default '[]',
  validation_considerations jsonb not null default '[]',
  evidence_claim_ids        uuid[] not null default '{}',
  reviewer_id               uuid references auth.users (id),
  review_state              text not null default 'unverified' check (review_state in (
                              'unverified', 'source_captured', 'structurally_validated',
                              'analyst_reviewed', 'domain_expert_reviewed', 'superseded',
                              'disputed', 'expired')),
  last_reviewed_at          timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  created_by                uuid references auth.users (id),
  updated_by                uuid references auth.users (id),
  visibility                text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo                   boolean not null default false,
  archived_at               timestamptz,
  tenant_id                 uuid references public.tenants (id),
  unique (source_sku_id, candidate_sku_id),
  constraint equivalence_records_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  ),
  constraint equivalence_records_no_self_pair check (source_sku_id <> candidate_sku_id)
);
comment on table public.equivalence_records is 'Layer C: assessed SKU equivalence with per-dimension scores and rationale.';
create or replace trigger trg_equivalence_records_set_updated_at before update on public.equivalence_records for each row execute function public.set_updated_at();

-- Candidate duplicate pair flagged by the entity-resolution engine.
create table if not exists public.duplicate_candidates (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null,
  left_id     uuid not null,
  right_id    uuid not null,
  score       numeric not null check (score between 0 and 1),
  matched_on  text[] not null default '{}',     -- e.g. 'name token overlap 0.80'
  status      text not null default 'pending' check (status in ('pending', 'merged', 'dismissed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  tenant_id   uuid references public.tenants (id),
  constraint duplicate_candidates_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  ),
  constraint duplicate_candidates_no_self_pair check (left_id <> right_id)
);
comment on table public.duplicate_candidates is 'Entity-resolution candidate pair with similarity score.';
create or replace trigger trg_duplicate_candidates_set_updated_at before update on public.duplicate_candidates for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ingestion staging
-- ---------------------------------------------------------------------------

-- One batch import run (dry-run by default; enters canonical only via the
-- review queue — ADR 0002).
create table if not exists public.import_batches (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id),
  label        text not null,
  source_type  text,                            -- e.g. 'csv', 'xlsx', 'partner_feed'
  status       text not null default 'uploaded' check (status in ('uploaded', 'mapping', 'validated', 'imported', 'failed', 'rolled_back')),
  dry_run      boolean not null default true,
  row_count    integer check (row_count is null or row_count >= 0),
  error_count  integer check (error_count is null or error_count >= 0),
  mapping      jsonb,                           -- column/field mapping used
  stats        jsonb not null default '{}',
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id),
  updated_by   uuid references auth.users (id),
  visibility   text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo      boolean not null default false,
  archived_at  timestamptz,
  constraint import_batches_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.import_batches is 'Tenant-private ingestion batch (dry-run default; canonical only via review).';
create or replace trigger trg_import_batches_set_updated_at before update on public.import_batches for each row execute function public.set_updated_at();

-- One staged row of an import batch, with raw and normalized payloads.
create table if not exists public.import_staging_rows (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id),
  batch_id    uuid not null references public.import_batches (id),
  row_number  integer not null check (row_number > 0),
  raw         jsonb not null,
  normalized  jsonb,
  status      text not null default 'pending' check (status in ('pending', 'valid', 'invalid', 'imported', 'skipped')),
  errors      jsonb,
  entity_type text,
  entity_id   uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  unique (batch_id, row_number),
  constraint import_staging_rows_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.import_staging_rows is 'Staged import row with raw/normalized payloads and validation status.';
create or replace trigger trg_import_staging_rows_set_updated_at before update on public.import_staging_rows for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Deferred source_id foreign keys for tables created before public.sources
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'organization_relationships', 'organization_classifications',
    'product_relationships', 'product_status_history', 'product_documents',
    'product_applications', 'product_methods', 'product_standards',
    'product_organisms', 'product_sample_types', 'product_industries',
    'product_technologies', 'product_test_types',
    'distribution_agreements', 'supplier_listings', 'country_authorizations',
    'price_observations', 'tenders', 'tender_awards', 'tender_documents',
    'consumable_compatibilities', 'vendor_approvals', 'validation_evidence',
    'contact_observations'
  ] loop
    if not exists (select 1
                   from pg_constraint c
                   join pg_class r on r.oid = c.conrelid
                   join pg_namespace n on n.oid = r.relnamespace
                   where n.nspname = 'public'
                     and r.relname = t
                     and c.conname = t || '_source_id_fkey') then
      execute format(
        'alter table public.%I add constraint %I foreign key (source_id) references public.sources (id)',
        t, t || '_source_id_fkey');
    end if;
  end loop;
end $$;

-- document_source_id FK on qualification_events (different column name).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'qualification_events_document_source_id_fkey') then
    alter table public.qualification_events
      add constraint qualification_events_document_source_id_fkey
      foreign key (document_source_id) references public.sources (id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Audit triggers (touch_audit_log) on the audited tables
-- ---------------------------------------------------------------------------
-- Curated set: canonical core entities, tenant-private sensitive overlays and
-- governance records. Append-only entries land in public.audit_log.

create or replace trigger trg_audit_tenants after insert or update or delete on public.tenants for each row execute function public.touch_audit_log();
create or replace trigger trg_audit_tenant_memberships after insert or update or delete on public.tenant_memberships for each row execute function public.touch_audit_log();
create or replace trigger trg_audit_organizations after insert or update or delete on public.organizations for each row execute function public.touch_audit_log();
create or replace trigger trg_audit_brands after insert or update or delete on public.brands for each row execute function public.touch_audit_log();
create or replace trigger trg_audit_products after insert or update or delete on public.products for each row execute function public.touch_audit_log();
create or replace trigger trg_audit_skus after insert or update or delete on public.skus for each row execute function public.touch_audit_log();
create or replace trigger trg_audit_standards after insert or update or delete on public.standards for each row execute function public.touch_audit_log();
create or replace trigger trg_audit_price_observations after insert or update or delete on public.price_observations for each row execute function public.touch_audit_log();
create or replace trigger trg_audit_claims after insert or update or delete on public.claims for each row execute function public.touch_audit_log();
create or replace trigger trg_audit_evidence_reviews after insert or update or delete on public.evidence_reviews for each row execute function public.touch_audit_log();
create or replace trigger trg_audit_change_requests after insert or update or delete on public.change_requests for each row execute function public.touch_audit_log();
create or replace trigger trg_audit_entity_merge_events after insert or update or delete on public.entity_merge_events for each row execute function public.touch_audit_log();
create or replace trigger trg_audit_vendor_approvals after insert or update or delete on public.vendor_approvals for each row execute function public.touch_audit_log();
create or replace trigger trg_audit_product_validations after insert or update or delete on public.product_validations for each row execute function public.touch_audit_log();
create or replace trigger trg_audit_research_projects after insert or update or delete on public.research_projects for each row execute function public.touch_audit_log();
create or replace trigger trg_audit_opportunity_signals after insert or update or delete on public.opportunity_signals for each row execute function public.touch_audit_log();
create or replace trigger trg_audit_outbound_handoff_records after insert or update or delete on public.outbound_handoff_records for each row execute function public.touch_audit_log();
create or replace trigger trg_audit_import_batches after insert or update or delete on public.import_batches for each row execute function public.touch_audit_log();
