# DispatchOS Cloudflare backend

This folder contains the production-style account and tenant operations backend for DispatchOS.

## What it provides

- Company owner registration
- Login/logout and `/auth/me`
- One-way PBKDF2 password hashing
- D1-backed users, companies, memberships, subscriptions, and sessions
- Basic and Business plan selection stored with the company
- Admin role assignment when the registering email matches `ADMIN_EMAIL`
- CORS limited to configured front-end origins
- Tenant-secure jobs API at `/api/jobs`
- Tenant-secure drivers API at `/api/drivers`
- Company-bound driver invite API at `/api/driver-invites`
- One-time, expiring invite acceptance at `/api/driver-invites/accept`

## Tenant isolation rule

Operational endpoints do not trust a company slug or company id supplied by the browser. The Worker resolves the signed-in user from the bearer session, resolves that user's company membership, and derives `company_id` on the server. Every operational query is scoped with that `company_id`.

Driver-role sessions are restricted further: they can only read jobs assigned to their linked driver record and cannot reassign jobs. Company owners, dispatchers, and platform admins can manage company operational data.

## Cloudflare setup

1. Create a D1 database named `dispatchos`.
2. Apply `schema.sql` to the D1 database. The operations router also creates missing operational tables/indexes defensively with `CREATE TABLE IF NOT EXISTS`.
3. Copy `wrangler.toml.example` to `wrangler.toml`.
4. Put the real D1 database ID in `wrangler.toml`.
5. Set `ADMIN_EMAIL` to the owner/admin email that should receive the DispatchOS admin role when that account is created.
6. Keep `ALLOWED_ORIGINS` limited to the GitHub Pages site, localhost during development, and later the real DispatchOS domain.
7. Deploy the Worker. `wrangler.toml` uses `src/router.ts` as the entry point. The router sends operational `/api/*` calls through the tenant security layer and delegates the existing auth/admin routes to `src/index.ts`.
8. Set the front end build variable `NEXT_PUBLIC_DISPATCHOS_API_URL` to the deployed Worker URL, for example `https://dispatchos-auth-api.<account>.workers.dev`.

## Worker validation

The repository includes `.github/workflows/validate-cloudflare.yml`. It performs a Wrangler dry-run build whenever Cloudflare files change, so Worker TypeScript/routing errors are caught before a real deployment.

## Current activation behavior

Creating an account creates a subscription record with `status = pending`. Active operations require an operating status such as `active`, `trialing`, `grace_period`, or `comped` (platform admin access is exempt). Stripe Checkout/webhook activation can change subscription status when billing is connected.

Do not put Cloudflare API tokens, D1 credentials, Stripe secrets, passwords, or admin passwords in this repository.
