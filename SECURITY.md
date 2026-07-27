# Security Policy

## Reporting a vulnerability

Do not open a public issue for security reports. Email the maintainers at
**security@lifesciencenexus.example** with a description, reproduction steps,
and affected scope. We aim to acknowledge reports within 3 business days and
to provide a remediation timeline within 10.

## Commitments

- **Row Level Security everywhere.** All tenant data in Supabase is protected
  by RLS policies. Client-side access uses the anon key only; authorization is
  enforced by the database, not by application code.
- **No service-role key in the browser.** `SUPABASE_SERVICE_ROLE_KEY` is used
  only in server-side code, is never imported by client components, and never
  appears in `NEXT_PUBLIC_*` variables. It must not be committed to the
  repository.
- **Safe demo mode.** Without Supabase configuration the app serves only
  synthetic demo data; no credentials are required and none are read.
- **Security headers.** The app sends `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, and `Permissions-Policy` on all
  routes (see `next.config.ts`).
- **Dependency hygiene.** Versions are pinned in `package.json` and locked in
  `package-lock.json`; CI installs with `npm ci`.

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |
