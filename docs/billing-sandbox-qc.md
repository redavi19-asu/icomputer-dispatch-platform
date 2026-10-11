# Carrier billing sandbox QC — 2026-10-11

Online billing uses company ownership from the authenticated session, fixed monthly Basic ($49.99) and Business ($149) prices, and a dedicated customer portal configuration. Drivers and members of other companies cannot open checkout or billing portals. Active, trialing, past-due, unpaid, incomplete and paused subscriptions block another purchase. Open checkouts are reused for the same plan and block a different plan; expired checkouts can restart.

Stripe webhooks verify their signature and environment, resolve the company through its persisted customer mapping, retrieve current subscription state, and record processed event IDs. Current provider state prevents delayed events from restoring canceled access. Custom and administrator-granted access are preserved. Updates conditionally match the previously linked subscription to avoid overwriting a concurrent replacement.

## Verified

- Isolated Worker `carrier-billing-sandbox` and isolated D1 database; no production data or shared ICA database binding.
- Hosted checkout line items: Basic 4999 USD cents monthly; Business 14900 USD cents monthly.
- Same checkout retry reuses its URL; another plan is blocked; expired checkout restarts.
- Hosted driver, foreign-company and foreign-origin requests return 403; unsigned webhooks return 400.
- API-created synthetic two-day trial (no card payment) activates Basic via an actual Stripe webhook.
- Billing portal opens for the mapped customer; existing subscription blocks checkout.
- Actual sandbox cancellation webhook sets canceled status and `/api/jobs` rejects operating access with 403.
- All created checkouts expired and synthetic subscription canceled without invoicing or proration.
- Local tests cover signed webhook replay, delayed old-subscription events, failed-renewal denial and recovery, administrator access preservation, and D1 deletion results with tenant isolation.

## Deployment and remaining checks

Production code keeps billing disabled until required Stripe secret, webhook secret and both price IDs are configured. Portal additionally requires its dedicated configuration. Test credentials belong only to the sandbox. The sandbox has API endpoints, not a separate deployed billing frontend.

A real hosted card-payment checkout, real failed renewal and recovery, simultaneous-request stress testing, and live Stripe account readiness have not been verified. These sandbox checks do not certify live payments or legal/business verification. Customer portal plan changes must use a production configuration scoped to Carrier products. Production configuration must use live prices and secrets together.
