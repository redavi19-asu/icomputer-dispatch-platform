import Stripe from "stripe";

// Developer subscriptions are separate from operating subscriptions and Stripe customers.
// The feature is opt-in, disabled until operator-provided price IDs and live webhook QA.
export type DeveloperBillingEnv = {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  BILLING_APP_URL?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PORTAL_CONFIGURATION_ID?: string;
  DEVELOPER_BILLING_ENABLED?: string;
  DEVELOPER_BILLING_ENFORCE_FROM?: string;
  STRIPE_DEVELOPER_STARTER_PRICE_ID?: string;
  STRIPE_DEVELOPER_PRO_PRICE_ID?: string;
};

const plans = {
  starter: { amount: 2900, included: 25000 },
  pro: { amount: 9900, included: 150000 },
} as const;
type DeveloperPlan = keyof typeof plans;
type DevRow = {
  company_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string | null;
  status: string;
  period_start: number;
  period_end: number;
};
const entitled = new Set(["active", "trialing"]);
const reply = (value: unknown, status = 200, headers: HeadersInit = {}) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store", ...headers } });

export function carrierDeveloperBillingReady(env: DeveloperBillingEnv) {
  return env.DEVELOPER_BILLING_ENABLED === "true" &&
    Boolean(env.DEVELOPER_BILLING_ENFORCE_FROM && Number.isFinite(Date.parse(env.DEVELOPER_BILLING_ENFORCE_FROM))) &&
    Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET &&
      env.BILLING_APP_URL && env.STRIPE_DEVELOPER_STARTER_PRICE_ID &&
      env.STRIPE_DEVELOPER_PRO_PRICE_ID);
}

export async function ensureCarrierDeveloperBillingTables(db: D1Database) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS carrier_developer_subscriptions(company_id TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,stripe_customer_id TEXT UNIQUE,stripe_subscription_id TEXT UNIQUE,plan TEXT,status TEXT NOT NULL DEFAULT 'pending',period_start INTEGER NOT NULL DEFAULT 0,period_end INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS carrier_developer_usage(company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,period_start INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(company_id,period_start))"),
  ]);
}

async function account(request: Request, env: DeveloperBillingEnv, companyId: string) {
  const token = /^Bearer (.+)$/i.exec(request.headers.get("Authorization") || "")?.[1];
  if (!token) return false;
  const dig = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const hash = Array.from(new Uint8Array(dig), value => value.toString(16).padStart(2, "0")).join("");
  const user = await env.DB.prepare("SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>datetime('now')")
    .bind(hash).first<{ user_id: string }>();
  if (!user) return false;
  const member = await env.DB.prepare("SELECT role FROM memberships WHERE user_id=? AND company_id=?")
    .bind(user.user_id, companyId).first<{ role: string }>();
  return Boolean(member && ["owner", "admin"].includes(member.role));
}

function stripeFor(env: DeveloperBillingEnv) {
  return new Stripe(env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-08-26.dahlia",
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 2,
  });
}

function idFor(env: DeveloperBillingEnv, plan: DeveloperPlan) {
  return plan === "starter" ? env.STRIPE_DEVELOPER_STARTER_PRICE_ID : env.STRIPE_DEVELOPER_PRO_PRICE_ID;
}

export async function handleCarrierDeveloperBilling(request: Request, env: DeveloperBillingEnv, override?: Stripe): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (!path.startsWith("/api/billing/stripe/developer/")) return null;
  const origin = request.headers.get("Origin") || "";
  const trusted = env.ALLOWED_ORIGINS.split(",").map(x => x.trim()).filter(Boolean);
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
  if (trusted.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  if (request.method === "OPTIONS") return new Response(null, { status: trusted.includes(origin) ? 204 : 403, headers });
  if (!trusted.includes(origin)) return reply({ error: "Open Developer Billing from the Carrier website." }, 403, headers);
  if (!(path.endsWith("/status") || path.endsWith("/checkout") || path.endsWith("/portal"))) return reply({ error: "Not found." }, 404, headers);
  if ((path.endsWith("/status") && request.method !== "GET") ||
      (!path.endsWith("/status") && request.method !== "POST")) return reply({ error: "Method not allowed." }, 405, headers);
  let companyId = "";
  let plan: DeveloperPlan | undefined;
  try {
    if (request.method === "GET") {
      companyId = new URL(request.url).searchParams.get("companyId") || "";
    } else {
      const raw = await request.text();
      if (raw.length > 4096) return reply({ error: "Request too large." }, 413, headers);
      const body = JSON.parse(raw);
      companyId = typeof body.companyId === "string" ? body.companyId : "";
      if (typeof body.plan === "string" && (body.plan === "starter" || body.plan === "pro")) plan = body.plan;
    }
  } catch { return reply({ error: "Invalid request." }, 400, headers); }
  if (!companyId || !(await account(request, env, companyId))) return reply({ error: "Company owner/admin sign-in required." }, 403, headers);
  try {
    await ensureCarrierDeveloperBillingTables(env.DB);
    const row = await env.DB.prepare("SELECT * FROM carrier_developer_subscriptions WHERE company_id=?").bind(companyId).first<DevRow>();
    const active = row && entitled.has(row.status) && row.period_end > Math.floor(Date.now() / 1000);
    if (path.endsWith("/status")) {
      const used = row && row.period_start ? await env.DB.prepare("SELECT used FROM carrier_developer_usage WHERE company_id=? AND period_start=?")
        .bind(companyId, row.period_start).first<{ used: number }>() : null;
      return reply({
        enabled: carrierDeveloperBillingReady(env),
        plans,
        subscription: row ? { plan: row.plan, status: row.status, active: Boolean(active), periodEnd: row.period_end } : null,
        usage: { used: Number(used?.used || 0), included: active && row?.plan && row.plan in plans ? plans[row.plan as DeveloperPlan].included : null },
        note: "No API usage overages are charged. Developer prices require activation by the site owner.",
      }, 200, headers);
    }
    if (!carrierDeveloperBillingReady(env)) return reply({ error: "Developer checkout is not activated yet." }, 503, headers);
    const stripe = override || stripeFor(env);
    const app = env.BILLING_APP_URL!.replace(/\/$/, "");
    const returnUrl = app + "/workspace/integrations";
    if (path.endsWith("/portal")) {
      if (!row?.stripe_customer_id || !env.STRIPE_PORTAL_CONFIGURATION_ID) return reply({ error: "Developer billing portal unavailable." }, 404, headers);
      const portal = await stripe.billingPortal.sessions.create({ customer: row.stripe_customer_id, configuration: env.STRIPE_PORTAL_CONFIGURATION_ID, return_url: returnUrl });
      return reply({ url: portal.url }, 200, headers);
    }
    if (!plan) return reply({ error: "Choose a developer plan." }, 400, headers);
    if (row && ["active", "trialing", "past_due", "unpaid", "incomplete", "paused"].includes(row.status)) return reply({ error: "A developer subscription already exists. Use Manage Developer Billing." }, 409, headers);
    const priceId = idFor(env, plan)!;
    const price = await stripe.prices.retrieve(priceId);
    if (!price.active || price.currency !== "usd" || price.unit_amount !== plans[plan].amount ||
        price.recurring?.interval !== "month" || price.recurring.interval_count !== 1)
      return reply({ error: "Developer price needs administrator verification." }, 503, headers);
    let customerId = row?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ metadata: { carrier_developer_company_id: companyId } }, { idempotencyKey: "carrier-dev-customer-" + companyId });
      await env.DB.prepare("INSERT INTO carrier_developer_subscriptions(company_id,stripe_customer_id) VALUES(?,?) ON CONFLICT(company_id) DO NOTHING").bind(companyId, customer.id).run();
      customerId = (await env.DB.prepare("SELECT stripe_customer_id FROM carrier_developer_subscriptions WHERE company_id=?").bind(companyId).first<DevRow>())?.stripe_customer_id;
    }
    if (!customerId) return reply({ error: "Developer billing setup failed." }, 502, headers);
    const existing = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
    if (existing.data.some(s => ["active", "trialing", "past_due", "unpaid", "incomplete", "paused"].includes(s.status)))
      return reply({ error: "An existing developer subscription must be managed first." }, 409, headers);
    const checkout = await stripe.checkout.sessions.create({
      customer: customerId, mode: "subscription", line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: companyId,
      metadata: { carrier_developer_company_id: companyId, developer_plan: plan },
      subscription_data: { metadata: { carrier_developer_company_id: companyId, developer_plan: plan } },
      success_url: returnUrl + "?developer_checkout=success", cancel_url: returnUrl + "?developer_checkout=cancelled",
    });
    return reply({ url: checkout.url }, 200, headers);
  } catch {
    return reply({ error: "Developer billing is temporarily unavailable." }, 502, headers);
  }
}

// Called only after the existing Stripe webhook signature and environment are verified.
// Developer subscriptions never change the company's operating subscription.
export async function applyCarrierDeveloperStripeSubscription(
  subscription: Stripe.Subscription, env: DeveloperBillingEnv,
): Promise<boolean> {
  const companyId = subscription.metadata?.carrier_developer_company_id;
  if (!companyId) return false;
  if (!carrierDeveloperBillingReady(env)) return true; // fail closed until configured
  await ensureCarrierDeveloperBillingTables(env.DB);
  const customer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const row = await env.DB.prepare("SELECT * FROM carrier_developer_subscriptions WHERE company_id=? AND stripe_customer_id=?")
    .bind(companyId, customer).first<DevRow>();
  if (!row) return true; // foreign or unexpected developer subscription: do not grant access
  const item = subscription.items.data[0];
  const plan: DeveloperPlan | null = subscription.items.data.length === 1 && item.quantity === 1
    ? (item.price.id === env.STRIPE_DEVELOPER_STARTER_PRICE_ID ? "starter" :
      item.price.id === env.STRIPE_DEVELOPER_PRO_PRICE_ID ? "pro" : null) : null;
  const valid = plan && item.price.currency === "usd" && item.price.unit_amount === plans[plan].amount &&
    item.price.recurring?.interval === "month" && item.price.recurring.interval_count === 1;
  const status = valid ? subscription.status : "invalid";
  await env.DB.prepare("UPDATE carrier_developer_subscriptions SET stripe_subscription_id=?,plan=?,status=?,period_start=?,period_end=?,updated_at=CURRENT_TIMESTAMP WHERE company_id=? AND stripe_customer_id=?")
    .bind(subscription.id, valid ? plan : null, status, valid ? item.current_period_start : 0, valid ? item.current_period_end : 0, companyId, customer).run();
  return true;
}

// Existing customers remain on legacy terms until explicitly migrated.
// Paid developer accounts are metered atomically, with no excess-charge path.
export async function consumeCarrierDeveloperQuota(db: D1Database, companyId: string, enabled: boolean, grandfathered = true):
  Promise<{ allowed: boolean; limit?: number; used?: number }> {
  if (!enabled || grandfathered) return { allowed: true };
  await ensureCarrierDeveloperBillingTables(db);
  const row = await db.prepare("SELECT * FROM carrier_developer_subscriptions WHERE company_id=?").bind(companyId).first<DevRow>();
  if (!row?.stripe_subscription_id) return { allowed: false }; // Paid terms apply only to newly created credentials.
  if (!entitled.has(row.status) || row.period_end <= Math.floor(Date.now() / 1000)) return { allowed: false };
  if (!row.plan || !(row.plan in plans)) return { allowed: false };
  const max = plans[row.plan as DeveloperPlan].included;
  const usage = await db.prepare("INSERT INTO carrier_developer_usage(company_id,period_start,used) VALUES(?,?,1) ON CONFLICT(company_id,period_start) DO UPDATE SET used=used+1 WHERE used<? RETURNING used")
    .bind(companyId, row.period_start, max).first<{ used: number }>();
  return { allowed: Boolean(usage), limit: max, used: usage?.used };
}
