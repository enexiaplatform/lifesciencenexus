-- supabase/seed.sql
-- Demo seed for Life Science Nexus (ADR 0004 demo policy).
--
-- What this seeds:
--   * two demo tenants (tenant_demo, tenant_other) for isolation testing;
--   * demo profiles + memberships — GUARDED: only inserted when matching
--     auth.users rows exist (on a real Supabase project create the two demo
--     users in the Auth dashboard or via the Admin API with the fixed UUIDs
--     below, then re-run this seed; the DO block skips them with a NOTICE
--     otherwise);
--   * fictional demo organizations/products/SKUs, all labeled "(Demo)" and
--     is_demo=true — never presented as verified;
--   * a few canonical REFERENCE rows (geographies VN + provinces, ISO
--     11133:2014, ATCC reference strains): real-but-public reference data,
--     marked is_demo=true so they can be purged wholesale before production.
--
-- The rich demo dataset lives in the app layer (src/demo/); this seed only
-- bootstraps the database for local dev and RLS verification.
-- Idempotent: every insert uses ON CONFLICT DO NOTHING; safe to re-run.

-- ---------------------------------------------------------------------------
-- Demo tenants
-- ---------------------------------------------------------------------------

insert into public.tenants (id, slug, name, visibility, is_demo)
values
  ('00000000-0000-4000-8000-000000000001', 'tenant_demo',  'Demo Tenant (Demo)',  'canonical', true),
  ('00000000-0000-4000-8000-000000000002', 'tenant_other', 'Other Tenant (Demo)', 'canonical', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Demo users: profiles + memberships (requires matching auth.users rows)
-- ---------------------------------------------------------------------------
-- Fixed demo user UUIDs:
--   11111111-1111-4111-8111-111111111111  Demo Admin  (owner of tenant_demo)
--   22222222-2222-4222-8222-222222222222  Demo Other  (owner of tenant_other)
-- Create them in Supabase Auth (Dashboard > Authentication > Add user, or
-- `supabase auth admin create-user` / Admin API) with these exact UUIDs.
-- Until then the block below skips profile/membership inserts with a NOTICE.

do $$
begin
  if to_regclass('auth.users') is null then
    raise notice 'auth.users not found (not a Supabase database) — skipping demo profiles/memberships';
    return;
  end if;

  if exists (select 1 from auth.users where id = '11111111-1111-4111-8111-111111111111') then
    insert into public.profiles (user_id, full_name, email, default_tenant_id, visibility, is_demo)
    values ('11111111-1111-4111-8111-111111111111', 'Demo Admin (Demo)', 'demo-admin@example.com',
            '00000000-0000-4000-8000-000000000001', 'canonical', true)
    on conflict (user_id) do nothing;
    insert into public.tenant_memberships (tenant_id, user_id, role, visibility, is_demo)
    values ('00000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'owner', 'tenant_private', true)
    on conflict do nothing;
  else
    raise notice 'demo auth user 11111111-1111-4111-8111-111111111111 missing — profile/membership skipped (see header comment)';
  end if;

  if exists (select 1 from auth.users where id = '22222222-2222-4222-8222-222222222222') then
    insert into public.profiles (user_id, full_name, email, default_tenant_id, visibility, is_demo)
    values ('22222222-2222-4222-8222-222222222222', 'Demo Other (Demo)', 'demo-other@example.com',
            '00000000-0000-4000-8000-000000000002', 'canonical', true)
    on conflict (user_id) do nothing;
    insert into public.tenant_memberships (tenant_id, user_id, role, visibility, is_demo)
    values ('00000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'owner', 'tenant_private', true)
    on conflict do nothing;
  else
    raise notice 'demo auth user 22222222-2222-4222-8222-222222222222 missing — profile/membership skipped (see header comment)';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Canonical reference data: geographies (VN + provinces)
-- ---------------------------------------------------------------------------

insert into public.geographies (id, code, name, level, parent_code, visibility, is_demo)
values
  ('c0000000-0000-4000-8000-000000000001', 'VN',    'Vietnam',                'country',  null, 'canonical', true),
  ('c0000000-0000-4000-8000-000000000002', 'VN-SG', 'Ho Chi Minh City',      'province', 'VN', 'canonical', true),
  ('c0000000-0000-4000-8000-000000000003', 'VN-HN', 'Hanoi',                 'province', 'VN', 'canonical', true),
  ('c0000000-0000-4000-8000-000000000004', 'VN-DN', 'Da Nang',               'province', 'VN', 'canonical', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Canonical reference data: ISO 11133:2014
-- ---------------------------------------------------------------------------

insert into public.standards (id, slug, body, code, title, visibility, is_demo)
values ('c0000000-0000-4000-8000-000000000010', 'iso-11133', 'ISO', '11133',
        'Microbiology of food, animal feed and water — Preparation, production, storage and performance testing of culture media',
        'canonical', true)
on conflict (id) do nothing;

insert into public.standard_versions (id, standard_id, version, year, status, visibility, is_demo)
values ('c0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-000000000010', '2014', 2014, 'current', 'canonical', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Canonical reference data: ATCC reference strains (per ISO 11133 Annex)
-- ---------------------------------------------------------------------------

insert into public.organisms (id, genus, species, strain_code, gram_reaction, visibility, is_demo)
values
  ('c0000000-0000-4000-8000-000000000020', 'Escherichia',  'coli',      'ATCC 25922', 'negative', 'canonical', true),
  ('c0000000-0000-4000-8000-000000000021', 'Staphylococcus','aureus',   'ATCC 6538',  'positive', 'canonical', true),
  ('c0000000-0000-4000-8000-000000000022', 'Pseudomonas',  'aeruginosa','ATCC 9027',  'negative', 'canonical', true),
  ('c0000000-0000-4000-8000-000000000023', 'Salmonella',   'enterica',  'ATCC 14028', 'negative', 'canonical', true),
  ('c0000000-0000-4000-8000-000000000024', 'Bacillus',     'subtilis',  'ATCC 6633',  'positive', 'canonical', true),
  ('c0000000-0000-4000-8000-000000000025', 'Candida',      'albicans',  'ATCC 10231', 'unknown',  'canonical', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Fictional demo organizations / brand / family / product / SKU
-- (All invented; labeled "(Demo)"; is_demo=true.)
-- ---------------------------------------------------------------------------

insert into public.organizations (id, slug, name, types, country, website, visibility, is_demo)
values
  ('d0000000-0000-4000-8000-000000000001', 'demo-abc-pharma', 'Công ty CP Dược phẩm ABC (Demo)',
   array['manufacturer', 'pharmaceutical_company'], 'VN', 'https://abc-pharma.example.com', 'canonical', true),
  ('d0000000-0000-4000-8000-000000000002', 'demo-xyz-scientific', 'Công ty TNHH Thiết bị Khoa học XYZ (Demo)',
   array['distributor'], 'VN', 'https://xyz-scientific.example.com', 'canonical', true)
on conflict (id) do nothing;

insert into public.brands (id, owner_organization_id, name, visibility, is_demo)
values ('d0000000-0000-4000-8000-000000000010', 'd0000000-0000-4000-8000-000000000001', 'ABC Media (Demo)', 'canonical', true)
on conflict (id) do nothing;

insert into public.product_families (id, brand_id, name, category, visibility, is_demo)
values ('d0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000010',
        'ABC Dehydrated Culture Media (Demo)', 'dehydrated_culture_media', 'canonical', true)
on conflict (id) do nothing;

insert into public.products (id, slug, family_id, manufacturer_organization_id, name, category, description, status, visibility, is_demo)
values ('d0000000-0000-4000-8000-000000000012', 'demo-abc-tryptic-soy-agar',
        'd0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000001',
        'ABC Tryptic Soy Agar (Demo)', 'dehydrated_culture_media',
        'Fictional general-purpose growth medium for demo purposes only.', 'active', 'canonical', true)
on conflict (id) do nothing;

insert into public.skus (id, slug, product_id, catalogue_number, name, shelf_life_months, storage_condition, country_availability, status, visibility, is_demo)
values ('d0000000-0000-4000-8000-000000000013', 'demo-abc-tsa-500',
        'd0000000-0000-4000-8000-000000000012', 'DEMO-TSA-500',
        'ABC Tryptic Soy Agar 500 g (Demo)', 36, 'ambient, dry', array['VN'], 'active', 'canonical', true)
on conflict (id) do nothing;

insert into public.pack_configurations (id, sku_id, quantity, unit, description, visibility, is_demo)
values ('d0000000-0000-4000-8000-000000000014', 'd0000000-0000-4000-8000-000000000013',
        500, 'g', '500 g bottle', 'canonical', true)
on conflict (id) do nothing;

-- Demo evidence edges: UNVERIFIED at best (demo data is never presented as
-- verified — ADR 0004 synthetic record policy).
insert into public.product_standards (id, product_id, standard_id, role, confidence, notes, evidence_state, visibility, is_demo)
values ('d0000000-0000-4000-8000-000000000020', 'd0000000-0000-4000-8000-000000000012',
        'c0000000-0000-4000-8000-000000000010', 'conforms_to', 0.3,
        'Demo-only illustrative edge; not a verified claim.', 'unverified', 'canonical', true)
on conflict (id) do nothing;

insert into public.product_organisms (id, product_id, organism_id, role, confidence, notes, evidence_state, visibility, is_demo)
values ('d0000000-0000-4000-8000-000000000021', 'd0000000-0000-4000-8000-000000000012',
        'c0000000-0000-4000-8000-000000000020', 'growth_promotion', 0.3,
        'Demo-only illustrative edge; not a verified claim.', 'unverified', 'canonical', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Tenant-private demo rows (tenant_demo): person, contact, source, price
-- Used by scripts/verify-data-isolation.sql to prove cross-tenant isolation.
-- ---------------------------------------------------------------------------

insert into public.people (id, tenant_id, full_name, title, email, visibility, is_demo)
values ('d0000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000000001',
        'Nguyen Van An (Demo)', 'QA Manager (fictional)', 'an.nguyen.demo@example.com', 'tenant_private', true)
on conflict (id) do nothing;

insert into public.organization_contacts (id, tenant_id, person_id, organization_id, decision_roles, is_primary, visibility, is_demo)
values ('d0000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-000000000001',
        'd0000000-0000-4000-8000-000000000030', 'd0000000-0000-4000-8000-000000000002',
        array['qa_approver', 'technical_evaluator'], true, 'tenant_private', true)
on conflict (id) do nothing;

insert into public.sources (id, type, title, publisher, captured_at, visibility, is_demo, tenant_id)
values ('d0000000-0000-4000-8000-000000000040', 'distributor_quotation',
        'Demo quotation Q-2026-001 (Demo)', 'Công ty TNHH Thiết bị Khoa học XYZ (Demo)',
        now(), 'tenant_private', true, '00000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

-- Synthetic demo price: is_synthetic=true, evidence_state='unverified' —
-- never shown as a verified price (ADR 0004).
insert into public.price_observations (id, sku_id, pack_configuration_id, supplier_org_id,
       original_amount, original_currency, observation_date, tax_included, geography,
       quantity, source_id, confidence, evidence_state, is_synthetic, visibility, is_demo, tenant_id)
values ('d0000000-0000-4000-8000-000000000041',
        'd0000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000014',
        'd0000000-0000-4000-8000-000000000002',
        1850000, 'VND', '2026-07-01', false, 'VN', 1,
        'd0000000-0000-4000-8000-000000000040',
        '{"sourceAuthority":0.2,"sourceRecency":0.8,"entityMatch":0.9,"extraction":0.9,"technicalEquivalence":0.0,"geographicRelevance":0.9,"commercialRelevance":0.5}',
        'unverified', true, 'tenant_private', true, '00000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;
