-- scripts/verify-data-isolation.sql
-- Proves cross-tenant data isolation on a LIVE database (migrations +
-- supabase/seed.sql applied, and the two demo auth users created — see the
-- header of seed.sql; without the auth.users rows the demo memberships do
-- not exist and these checks will fail visibly, which is what you want).
--
-- Run (Git Bash / any POSIX shell), connected as a role allowed to
-- SET ROLE authenticated (the Supabase postgres role works):
--   psql "$DATABASE_URL" -f scripts/verify-data-isolation.sql
--
-- HOW IT WORKS: Supabase derives auth.uid() from the request.jwt.claims GUC
-- (JSON containing a "sub" claim); older deployments read request.jwt.claim.sub.
-- We set both GUCs to simulate each tenant's user, then run plain SELECTs
-- whose expected results are stated per check. Every check prints
-- check_case | rows_visible | pass — scan the pass column: any row showing
-- "f" is an isolation breach.
--
-- Fixture recap (from seed.sql):
--   tenant_demo  00000000-0000-4000-8000-000000000001  (user A: 11111111-1111-4111-8111-111111111111, owner)
--   tenant_other 00000000-0000-4000-8000-000000000002  (user B: 22222222-2222-4222-8222-222222222222, owner)
--   tenant_demo owns: 1 people row, 1 organization_contacts row,
--                     1 tenant_private source, 1 tenant_private price_observation.

\echo '=== Context A: Demo Admin (member of tenant_demo) ==='

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

-- EXPECT pass = t (A sees their own tenant's person rows)
select 'A reads own people' as check_case, count(*) as rows_visible, (count(*) >= 1) as pass
from public.people;

-- EXPECT pass = t (A sees their own tenant's contacts)
select 'A reads own contacts' as check_case, count(*) as rows_visible, (count(*) >= 1) as pass
from public.organization_contacts;

-- EXPECT pass = t (A sees their own tenant's private price)
select 'A reads own private prices' as check_case, count(*) as rows_visible, (count(*) >= 1) as pass
from public.price_observations
where visibility = 'tenant_private';

-- EXPECT pass = t (canonical demo organizations visible to any authenticated user)
select 'A reads canonical organizations' as check_case, count(*) as rows_visible, (count(*) >= 2) as pass
from public.organizations
where visibility = 'canonical';

-- EXPECT pass = t (is_tenant_member agrees for tenant_demo)
select public.is_tenant_member('00000000-0000-4000-8000-000000000001') as "A is member of tenant_demo (expect t)";

-- EXPECT pass = f (A is NOT a member of tenant_other)
select (not public.is_tenant_member('00000000-0000-4000-8000-000000000002')) as "A is not member of tenant_other (expect t)";

commit;

\echo '=== Context B: Demo Other (member of tenant_other, NOT of tenant_demo) ==='

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

-- EXPECT rows_visible = 0, pass = t (tenant A's people invisible to B)
select 'B cannot read A people' as check_case, count(*) as rows_visible, (count(*) = 0) as pass
from public.people
where tenant_id = '00000000-0000-4000-8000-000000000001';

-- EXPECT rows_visible = 0, pass = t (tenant A's contacts invisible to B)
select 'B cannot read A contacts' as check_case, count(*) as rows_visible, (count(*) = 0) as pass
from public.organization_contacts
where tenant_id = '00000000-0000-4000-8000-000000000001';

-- EXPECT rows_visible = 0, pass = t (tenant A's private prices invisible to B)
select 'B cannot read A private prices' as check_case, count(*) as rows_visible, (count(*) = 0) as pass
from public.price_observations
where visibility = 'tenant_private'
  and tenant_id = '00000000-0000-4000-8000-000000000001';

-- EXPECT rows_visible = 0, pass = t (tenant A's private sources invisible to B)
select 'B cannot read A private sources' as check_case, count(*) as rows_visible, (count(*) = 0) as pass
from public.sources
where visibility = 'tenant_private'
  and tenant_id = '00000000-0000-4000-8000-000000000001';

-- EXPECT pass = t (canonical layer still readable for B — isolation must not hide the shared graph)
select 'B still reads canonical organizations' as check_case, count(*) as rows_visible, (count(*) >= 2) as pass
from public.organizations
where visibility = 'canonical';

-- EXPECT NOTICE "PASS: cross-tenant insert blocked" (RLS rejects the insert
-- with SQLSTATE 42501 insufficient_privilege). If the NOTICE says FAIL,
-- tenant isolation on writes is broken.
do $$
begin
  begin
    insert into public.people (tenant_id, full_name, visibility)
    values ('00000000-0000-4000-8000-000000000001', 'Cross Tenant Intruder (Demo)', 'tenant_private');
    raise notice 'FAIL: B inserted a row into tenant_demo people — isolation breach';
  exception
    when insufficient_privilege then
      raise notice 'PASS: cross-tenant insert into people blocked by RLS';
  end;
end $$;

commit;

\echo '=== Manual review: every "pass" column above must be t, and the insert check must print PASS ==='
