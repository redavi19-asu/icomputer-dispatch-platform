# Urban Carrier customer integrations — 2026-10-11

Public guide: `/developers`. Company settings links to `/workspace/integrations` for owner/admin management. Keys are not interchangeable with user sessions or Stripe credentials.

## Contract

- Owner/admin session: GET/POST/DELETE `/api/integrations/keys`, GET/POST/DELETE `/api/integrations/webhooks`.
- Customer bearer key: GET/POST `/api/v1/jobs`, GET `/api/v1/events`.
- Explicit scopes: `jobs:read`, `jobs:write`, `events:read`; expiry 1–365 days; 256-bit random key stored only as SHA-256; one-time full-key display; company-scoped revocation.
- API operating access follows active/trialing/grace_period/comped subscription status. Global admin privilege does not transfer to an API key.
- Atomic per-key minute bucket caps 120 requests; 429 includes Retry-After. Jobs/events pages are bounded to 100 records.
- Booking requires Idempotency-Key (8–100 letters, digits, underscore, hyphen). Customer/job/event records are inserted atomically, guarded by the unique company/request mapping. Identical retries return the original job; changed input returns 409. Removed originals return 410 rather than creating a replacement silently.
- Allowed input: name, address, service, optional details/email/phone. Tenant IDs, drivers, roles, and billing fields cannot be supplied. Dispatchers assign jobs through the normal workspace. Verification tokens are generated for existing handoff flows.
- Webhooks send job.created/job.updated/integration.test with an event ID, timestamp, and HMAC-SHA256 signature of the exact raw body. Latest delivery status is displayed. Public HTTPS DNS preflight rejects private address records, literal IPs, credentials, fragments, and custom ports; redirects and receiver body reads are disabled. DNS validation is a preflight, not DNS pinning; receiver owners must control their endpoints.
- Current delivery is one attempt (8-second receiver timeout). Events API and job reads reconcile missed updates. Automatic retries, billing per API call, SDKs, and general-purpose job modification are not implemented.

## Storage and deployment

The backend idempotently creates carrier_api_keys, carrier_api_limits, carrier_api_requests, carrier_events, and carrier_webhooks tables. Company-owned rows use company foreign keys where applicable. Deployment does not automatically issue keys or change customer subscriptions. Webhook signing secrets remain server-side and are returned only on creation.

Deploy both the Worker and static website for management links to function. The Worker build includes this module in the router before legacy operational routing. Normal job creation/update also records scoped notifications. Local D1/SQLite tests cover tenant isolation, scopes, subscription gating, expiry/revocation, one-time secret visibility, concurrent idempotency, verification token creation, event polling, rate limiting, webhook signature checks, and private DNS rejection. Actual receiver delivery and production customer journeys remain separate from mocked-network verification.

Live secret-name inspection confirmed neither STRIPE_SECRET_KEY nor STRIPE_WEBHOOK_SECRET nor the Stripe price/portal bindings are configured in the Carrier Worker. This change does not enable live checkout. Customer API access is included with existing operating subscription access; no new API price was invented.
