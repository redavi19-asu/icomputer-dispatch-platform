import Stripe from "stripe";

type BillingEnv = Pick<CarrierWorkerEnv, "DB" | "ALLOWED_ORIGINS"> & Partial<Pick<CarrierWorkerEnv,
  "BILLING_APP_URL" | "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET" | "STRIPE_BASIC_PRICE_ID" |
  "STRIPE_BUSINESS_PRICE_ID" | "STRIPE_PORTAL_CONFIGURATION_ID">>;
type BillingRow = { company_id: string; plan: string; status: string; stripe_customer_id: string | null; stripe_subscription_id: string | null };
const blockedDuplicates = new Set(["active", "trialing", "past_due", "unpaid", "incomplete", "paused"]);
const amounts = { basic: 4999, business: 14900 } as const;

function configured(env: BillingEnv) {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.STRIPE_BASIC_PRICE_ID && env.STRIPE_BUSINESS_PRICE_ID && env.BILLING_APP_URL);
}
function json(data: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
async function limitedBody(request: Request, limit = 262144) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let bytes = 0, value = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) return value + decoder.decode();
    bytes += chunk.value.byteLength;
    if (bytes > limit) { await reader.cancel(); throw new Error("Request too large"); }
    value += decoder.decode(chunk.value, { stream: true });
  }
}
function pricePlan(env: BillingEnv, subscription: Stripe.Subscription) {
  if (subscription.items.data.length !== 1 || subscription.items.data[0].quantity !== 1) return null;
  const price = subscription.items.data[0].price;
  const plan = price.id === env.STRIPE_BASIC_PRICE_ID ? "basic" : price.id === env.STRIPE_BUSINESS_PRICE_ID ? "business" : null;
  if (!plan || price.currency !== "usd" || price.unit_amount !== amounts[plan] || price.recurring?.interval !== "month" || price.recurring.interval_count !== 1) return null;
  return plan;
}
async function webhook(request: Request, env: BillingEnv, stripe: Stripe, cors: Record<string, string>) {
  if (Number(request.headers.get("Content-Length") || 0) > 262144) return json({ error: "Webhook too large." }, 413, cors);
  let raw: string;
  try { raw = await limitedBody(request); } catch { return json({ error: "Webhook too large." }, 413, cors); }
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, request.headers.get("stripe-signature") || "", env.STRIPE_WEBHOOK_SECRET!, undefined, Stripe.createSubtleCryptoProvider());
  } catch { return json({ error: "Invalid Stripe signature." }, 400, cors); }
  if (event.livemode !== env.STRIPE_SECRET_KEY!.includes("_live_")) return json({ error: "Wrong payment environment." }, 400, cors);
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS carrier_stripe_events (id TEXT PRIMARY KEY, processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
  if (await env.DB.prepare("SELECT id FROM carrier_stripe_events WHERE id=?").bind(event.id).first()) return json({ received: true }, 200, cors);
  let subscriptionId: string | undefined;
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    if (session.mode === "subscription" && ["paid", "no_payment_required"].includes(session.payment_status)) subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  } else if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") subscriptionId = event.data.object.id;
  else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const subscription = event.data.object.parent?.subscription_details?.subscription;
    subscriptionId = typeof subscription === "string" ? subscription : subscription?.id;
  }
  if (subscriptionId) {
    // Read current provider state so delayed events cannot restore stale access.
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const plan = pricePlan(env, subscription);
    const customer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    const row = await env.DB.prepare("SELECT company_id,plan,status,stripe_customer_id,stripe_subscription_id FROM subscriptions WHERE stripe_customer_id=?").bind(customer).first<BillingRow>();
    const sameSubscription = !row?.stripe_subscription_id || row.stripe_subscription_id === subscription.id;
    const restarting = row && ["canceled", "cancelled", "incomplete_expired"].includes(row.status) && ["active", "trialing"].includes(subscription.status);
    const manuallyGranted = row && !row.stripe_subscription_id && ["active", "trialing", "comped", "grace_period"].includes(row.status);
    if (row && plan && row.plan !== "custom" && !manuallyGranted && (sameSubscription || restarting)) {
      const periodEnd = subscription.items.data[0].current_period_end;
      await env.DB.prepare("UPDATE subscriptions SET plan=?,status=?,stripe_subscription_id=?,current_period_end=?,updated_at=CURRENT_TIMESTAMP WHERE company_id=? AND stripe_customer_id=? AND plan<>'custom' AND stripe_subscription_id IS ?")
        .bind(plan, subscription.status, subscription.id, new Date(periodEnd * 1000).toISOString(), row.company_id, customer, row.stripe_subscription_id).run();
    }
  }
  await env.DB.prepare("INSERT OR IGNORE INTO carrier_stripe_events(id) VALUES (?)").bind(event.id).run();
  return json({ received: true }, 200, cors);
}

export async function handleCarrierBilling(request: Request, env: BillingEnv, override?: Stripe): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (!path.startsWith("/api/billing/stripe/")) return null;
  const origin = request.headers.get("Origin") || "";
  const allowed = env.ALLOWED_ORIGINS.split(",").map(value => value.trim()).filter(Boolean);
  const cors: Record<string, string> = { Vary: "Origin", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
  if (allowed.includes(origin)) cors["Access-Control-Allow-Origin"] = origin;
  if (request.method === "OPTIONS") return new Response(null, { status: allowed.includes(origin) ? 204 : 403, headers: cors });
  if (path.endsWith("/config") && request.method === "GET") return json({ ready: configured(env), portalReady: configured(env) && Boolean(env.STRIPE_PORTAL_CONFIGURATION_ID) }, 200, cors);
  if (!configured(env)) return json({ error: "Online billing is being configured. Please contact support." }, 503, cors);
  const stripe = override || new Stripe(env.STRIPE_SECRET_KEY!, { apiVersion: "2026-08-26.dahlia", httpClient: Stripe.createFetchHttpClient(), maxNetworkRetries: 2 });
  try {
    if (path.endsWith("/webhook") && request.method === "POST") return await webhook(request, env, stripe, cors);
    if (!["/api/billing/stripe/checkout", "/api/billing/stripe/portal", "/api/billing/stripe/status"].includes(path)) return json({ error: "Not found." }, 404, cors);
    if (!allowed.includes(origin)) return json({ error: "Open billing from the Carrier website." }, 403, cors);
    const token = /^Bearer (.+)$/i.exec(request.headers.get("Authorization") || "")?.[1];
    if (!token) return json({ error: "Sign in to manage billing." }, 401, cors);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const hash = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
    const session = await env.DB.prepare("SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>datetime('now')").bind(hash).first<{ user_id: string }>();
    if (!session) return json({ error: "Sign in again to manage billing." }, 401, cors);
    const body = request.method === "POST" ? JSON.parse(await limitedBody(request, 8192)) as { companyId?: string; plan?: string } : { companyId: new URL(request.url).searchParams.get("companyId") || "" };
    if (!body.companyId) return json({ error: "Select your company." }, 400, cors);
    const membership = await env.DB.prepare("SELECT role FROM memberships WHERE user_id=? AND company_id=?").bind(session.user_id, body.companyId).first<{ role: string }>();
    if (!membership || !["owner", "admin"].includes(membership.role)) return json({ error: "Only company owners and admins can manage billing." }, 403, cors);
    const row = await env.DB.prepare("SELECT company_id,plan,status,stripe_customer_id,stripe_subscription_id FROM subscriptions WHERE company_id=?").bind(body.companyId).first<BillingRow>();
    if (!row) return json({ error: "Company subscription not found." }, 404, cors);
    if (path.endsWith("/status") && request.method === "GET") return json({ plan: row.plan, status: row.status, hasCustomer: Boolean(row.stripe_customer_id) }, 200, cors);
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, cors);
    const returnUrl = `${env.BILLING_APP_URL!.replace(/\/$/, "")}/billing`;
    if (path.endsWith("/portal")) {
      if (!row.stripe_customer_id) return json({ error: "No Stripe subscription is linked to this company." }, 404, cors);
      if (!env.STRIPE_PORTAL_CONFIGURATION_ID) return json({ error: "Billing portal is being configured." }, 503, cors);
      const portal = await stripe.billingPortal.sessions.create({ customer: row.stripe_customer_id, configuration: env.STRIPE_PORTAL_CONFIGURATION_ID, return_url: returnUrl });
      return json({ url: portal.url }, 200, cors);
    }
    if (row.plan === "custom" || (!row.stripe_subscription_id && ["active", "trialing", "comped", "grace_period"].includes(row.status))) return json({ error: "This company already has administrator-granted access. Contact support to change billing." }, 409, cors);
    if (body.plan !== "basic" && body.plan !== "business") return json({ error: "Choose Basic or Business." }, 400, cors);
    const priceId = body.plan === "basic" ? env.STRIPE_BASIC_PRICE_ID! : env.STRIPE_BUSINESS_PRICE_ID!;
    const price = await stripe.prices.retrieve(priceId);
    if (!price.active || price.unit_amount !== amounts[body.plan] || price.currency !== "usd" || price.recurring?.interval !== "month" || price.recurring.interval_count !== 1) return json({ error: "The selected price needs administrator attention." }, 503, cors);
    let customerId = row.stripe_customer_id;
    if (!customerId) {
      const company = await env.DB.prepare("SELECT name FROM companies WHERE id=?").bind(body.companyId).first<{ name: string }>();
      const customer = await stripe.customers.create({ name: company?.name, metadata: { carrier_company_id: body.companyId } }, { idempotencyKey: `carrier-customer-${body.companyId}` });
      await env.DB.prepare("UPDATE subscriptions SET stripe_customer_id=? WHERE company_id=? AND stripe_customer_id IS NULL").bind(customer.id, body.companyId).run();
      customerId = (await env.DB.prepare("SELECT stripe_customer_id FROM subscriptions WHERE company_id=?").bind(body.companyId).first<{ stripe_customer_id: string }>())!.stripe_customer_id;
    }
    const existing = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
    if (existing.data.some(subscription => blockedDuplicates.has(subscription.status))) return json({ error: "A subscription already exists. Use Manage Billing to change it." }, 409, cors);
    const checkouts = await stripe.checkout.sessions.list({ customer: customerId, limit: 100 });
    const companyCheckouts = checkouts.data.filter(session => session.mode === "subscription" && session.client_reference_id === body.companyId);
    const open = companyCheckouts.find(session => session.status === "open");
    if (open) {
      if (open.metadata?.carrier_plan !== body.plan || !open.url) return json({ error: "An unfinished checkout already exists. Finish it or wait for it to expire before choosing another plan." }, 409, cors);
      return json({ url: open.url }, 200, cors);
    }
    const checkout = await stripe.checkout.sessions.create({ customer: customerId, mode: "subscription", line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: body.companyId, metadata: { carrier_plan: body.plan }, subscription_data: { metadata: { carrier_company_id: body.companyId } },
      success_url: `${returnUrl}?checkout=success`, cancel_url: `${returnUrl}?checkout=cancelled` },
      { idempotencyKey: `carrier-checkout-${body.companyId}-${body.plan}-${existing.data[0]?.id || "initial"}-${companyCheckouts[0]?.id || "initial"}` });
    return json({ url: checkout.url }, 200, cors);
  } catch {
    return json({ error: "Billing could not complete. Please retry or contact support." }, 502, cors);
  }
}
