# DispatchOS Cloudflare account backend

This folder contains the first production-style account backend for DispatchOS.

## What it provides

- Company owner registration
- Login/logout
- One-way PBKDF2 password hashing
- D1-backed users, companies, memberships, subscriptions, and sessions
- Basic and Business plan selection stored with the company
- Admin role assignment when the registering email matches `ADMIN_EMAIL`
- `/auth/me` session/account lookup
- CORS limited to configured front-end origins

## Cloudflare setup

1. Create a D1 database named `dispatchos`.
2. Apply `schema.sql` to the D1 database.
3. Copy `wrangler.toml.example` to `wrangler.toml`.
4. Put the real D1 database ID in `wrangler.toml`.
5. Set `ADMIN_EMAIL` to the owner/admin email that should receive the DispatchOS admin role when that account is created.
6. Keep `ALLOWED_ORIGINS` limited to the GitHub Pages site, localhost during development, and later the real DispatchOS domain.
7. Deploy the Worker.
8. Set the front end build variable `NEXT_PUBLIC_DISPATCHOS_API_URL` to the deployed Worker URL, for example `https://dispatchos-auth-api.<account>.workers.dev`.

## Current activation behavior

Creating an account creates a subscription record with `status = pending`. That is intentional. The next backend phase is Stripe Checkout + webhook activation. The webhook will change the subscription to `active` after a successful payment.

Do not put Cloudflare API tokens, D1 credentials, Stripe secrets, passwords, or admin passwords in this repository.
