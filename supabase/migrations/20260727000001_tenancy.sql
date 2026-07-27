-- 20260727000001_tenancy.sql
-- Tenancy core: tenants, profiles, tenant_memberships, api_clients,
-- integration_connections. Idempotent: safe to re-run.
--
-- profiles/tenants are platform records: they carry the common audit columns
-- and the visibility CHECK for uniformity, but no tenant_id (a tenant does not
-- belong to a tenant). Every other table in later migrations carries either a
-- nullable tenant_id + layer CHECK (canonical-capable) or tenant_id NOT NULL
-- (tenant-scoped).

-- ---------------------------------------------------------------------------
-- tenants
-- ---------------------------------------------------------------------------

-- A customer organisation's isolated workspace (layer B boundary).
create table if not exists public.tenants (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz
);
comment on table public.tenants is 'Tenant workspaces; row visibility limited to members via RLS.';
create or replace trigger trg_tenants_set_updated_at before update on public.tenants for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- One row per auth user; extends auth.users (created by handle_new_user).
create table if not exists public.profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users (id) on delete cascade,
  full_name         text not null,
  email             text,
  default_tenant_id uuid references public.tenants (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references auth.users (id),
  updated_by        uuid references auth.users (id),
  visibility        text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo           boolean not null default false,
  archived_at       timestamptz
);
comment on table public.profiles is 'App profile per auth user; RLS restricts rows to self and co-members.';
create or replace trigger trg_profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- Create the auth.users -> profiles provisioning trigger (idempotent).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- tenant_memberships
-- ---------------------------------------------------------------------------

-- User <-> tenant join with the tenant-scoped role (owner/admin/analyst/
-- contributor/reviewer/viewer). Tenant-scoped: tenant_id NOT NULL forces
-- visibility='tenant_private' via the layer CHECK.
create table if not exists public.tenant_memberships (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id),
  user_id     uuid not null references auth.users (id),
  role        text not null check (role in ('owner', 'admin', 'analyst', 'contributor', 'reviewer', 'viewer')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id),
  visibility  text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  unique (tenant_id, user_id),
  constraint tenant_memberships_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.tenant_memberships is 'Membership + role of a user in a tenant; the root of all RLS checks.';
create or replace trigger trg_tenant_memberships_set_updated_at before update on public.tenant_memberships for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- api_clients
-- ---------------------------------------------------------------------------

-- Server-to-server API credentials owned by a tenant (keys stored hashed).
create table if not exists public.api_clients (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id),
  name         text not null,
  key_hash     text not null,
  scopes       text[] not null default '{}',
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id),
  updated_by   uuid references auth.users (id),
  visibility   text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo      boolean not null default false,
  archived_at  timestamptz,
  constraint api_clients_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.api_clients is 'Tenant-owned API client credentials (hashed keys); admin-managed.';
create or replace trigger trg_api_clients_set_updated_at before update on public.api_clients for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- integration_connections
-- ---------------------------------------------------------------------------

-- Connection state to sister products (Atlas / Memoire) per tenant.
create table if not exists public.integration_connections (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id),
  system         text not null check (system in ('life_science_atlas', 'memoire')),
  status         text not null default 'active' check (status in ('active', 'paused', 'error', 'disabled')),
  config         jsonb not null default '{}',
  last_synced_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id),
  updated_by     uuid references auth.users (id),
  visibility     text not null check (visibility in ('canonical', 'tenant_private')),
  is_demo        boolean not null default false,
  archived_at    timestamptz,
  unique (tenant_id, system),
  constraint integration_connections_layer_check check (
    (visibility = 'canonical' and tenant_id is null)
    or (visibility = 'tenant_private' and tenant_id is not null)
  )
);
comment on table public.integration_connections is 'Per-tenant connection config for Atlas/Memoire integrations (layer D).';
create or replace trigger trg_integration_connections_set_updated_at before update on public.integration_connections for each row execute function public.set_updated_at();
