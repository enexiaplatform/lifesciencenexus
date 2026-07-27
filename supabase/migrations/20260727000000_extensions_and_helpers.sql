-- 20260727000000_extensions_and_helpers.sql
-- Extensions and shared helper functions for Life Science Nexus.
-- Target: PostgreSQL 15+ (Supabase). Idempotent: safe to re-run.
--
-- Column discipline (ADR 0002) applied by every later migration:
--   - every entity table carries visibility ('canonical' | 'tenant_private'),
--     is_demo, archived_at, created_/updated_ audit columns;
--   - canonical-capable tables carry a nullable tenant_id with a layer CHECK
--     ((visibility='canonical' and tenant_id is null) or
--      (visibility='tenant_private' and tenant_id is not null));
--   - tenant-scoped tables carry tenant_id NOT NULL (visibility is thereby
--     forced to 'tenant_private' by the same layer CHECK).

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

-- Trigram similarity for fuzzy name/alias/catalogue-number search.
create extension if not exists pg_trgm;

-- Hashing/encryption primitives (api key hashes, sha256 helpers).
create extension if not exists pgcrypto;

-- pgvector is intentionally NOT installed: no proven embedding use case yet.
-- Deferred until a concrete semantic-search / similarity feature lands; adding
-- it earlier would carry index and storage costs for zero product value.

-- ---------------------------------------------------------------------------
-- RLS helper functions
-- ---------------------------------------------------------------------------
-- Both helpers are SECURITY DEFINER so policies on tenant_memberships can call
-- them without infinite RLS recursion, and STABLE so the planner can cache
-- them within a statement. search_path is pinned for safety.

-- True when the current user (auth.uid()) holds any membership in `tenant`.
create or replace function public.is_tenant_member(tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships m
    where m.tenant_id = tenant
      and m.user_id = auth.uid()
  );
$$;

comment on function public.is_tenant_member(uuid) is
  'RLS helper: current user is a member (any role) of the given tenant.';

-- True when the current user holds one of `roles` in `tenant`.
create or replace function public.has_tenant_role(tenant uuid, roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships m
    where m.tenant_id = tenant
      and m.user_id = auth.uid()
      and m.role = any (roles)
  );
$$;

comment on function public.has_tenant_role(uuid, text[]) is
  'RLS helper: current user holds one of the given roles in the given tenant.';

-- ---------------------------------------------------------------------------
-- Trigger functions
-- ---------------------------------------------------------------------------

-- Keeps updated_at fresh on every UPDATE. updated_by follows auth.uid() when
-- present; a service-role write (auth.uid() is null) leaves the previous value.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'BEFORE UPDATE trigger: stamps updated_at (and updated_by when a user is present).';

-- Append-only audit writer. Attached AFTER INSERT/UPDATE/DELETE on selected
-- tables (see 20260727000007_evidence_integration.sql). SECURITY DEFINER so it
-- can insert into audit_log regardless of the caller's table privileges;
-- audit_log has no INSERT policy for authenticated by design.
create or replace function public.touch_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_id uuid;
  v_tenant_id uuid;
  v_before    jsonb;
  v_after     jsonb;
begin
  if TG_OP = 'DELETE' then
    v_entity_id := old.id;
    v_before    := to_jsonb(old);
    v_after     := null;
  elsif TG_OP = 'UPDATE' then
    v_entity_id := new.id;
    v_before    := to_jsonb(old);
    v_after     := to_jsonb(new);
  else
    v_entity_id := new.id;
    v_before    := null;
    v_after     := to_jsonb(new);
  end if;

  v_tenant_id := coalesce((v_after ->> 'tenant_id')::uuid,
                          (v_before ->> 'tenant_id')::uuid);

  insert into public.audit_log (
    tenant_id, actor_id, action, entity_type, entity_id, at,
    before, after, metadata, visibility, is_demo
  ) values (
    v_tenant_id,
    auth.uid(),
    TG_TABLE_NAME || '.' || lower(TG_OP),
    TG_TABLE_NAME,
    v_entity_id,
    now(),
    v_before,
    v_after,
    jsonb_build_object('trigger', TG_NAME, 'txid', txid_current()),
    case when v_tenant_id is null then 'canonical' else 'tenant_private' end,
    coalesce((v_after ->> 'is_demo')::boolean, (v_before ->> 'is_demo')::boolean, false)
  );

  return coalesce(new, old);
end;
$$;

comment on function public.touch_audit_log() is
  'AFTER INSERT/UPDATE/DELETE trigger: appends a row to public.audit_log.';

-- Provisions a profiles row when a Supabase auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, email, visibility)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name',
             split_part(coalesce(new.email, 'user'), '@', 1)),
    new.email,
    -- visibility is not used by profile policies (they key off user_id);
    -- 'canonical' satisfies the NOT NULL layer discipline.
    'canonical'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'AFTER INSERT on auth.users: creates the matching public.profiles row.';

-- Attached in 20260727000001_tenancy.sql once profiles exists; the trigger on
-- auth.users is created there so this migration stays independent of table
-- creation order.
