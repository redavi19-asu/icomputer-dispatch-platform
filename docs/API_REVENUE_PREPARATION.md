# Separate API revenue preparation

A separate monthly API subscription and company-wide request allowance are prepared, alongside the operating software subscription. The API plan is not active yet: the owner delegated pricing on October 12, 2026. The launch offer is $49/month with 50,000 requests per company per billing period. The matching live Stripe price is configured; sandbox end-to-end validation is still required before activation. API_PAID_ACCESS_REQUIRED remains false. No automatic overage charges are supported; exhausted allowance blocks requests with 429.

Owners/admins use Integrations to see company-wide usage, start a separate subscription once enabled and cancel API renewal without cancelling software. Active software access is required before selling an API plan. Existing API subscription prices and allowances are preserved during renewal; changing an offer does not rewrite existing contracts.

Key and webhook creation, API calls and outbound webhook delivery require an active unexpired API plan once paid enforcement is enabled. Authenticated requests passing permission/software/rate checks count across all keys; retries and client errors count, server errors are released. Webhook sends are included in API plan access and do not consume inbound-request allowance. Usage windows follow the API subscription billing period; preparation uses UTC calendar months. No request bodies or customer API keys are stored in the usage ledger.

Required configuration: STRIPE_API_PRICE_ID, API_MONTHLY_AMOUNT_CENTS, API_MONTHLY_REQUEST_ALLOWANCE and existing Stripe key/webhook credentials. Validate the configured price as an active USD monthly recurring price with the approved amount. Use a sandbox and fixture accounts before activating live billing. The software billing webhook also reconciles API subscriptions via verified signatures/current provider state, keeping the two products separate. Do not grant access from success redirects.

Publishing pricing, the migration notice for existing integration users and enabling enforcement are separate launch steps. No real customers, charges, emails or installer builds were used during preparation.
