import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import Stripe from 'stripe';
import { handleOperationsRequest } from '../src/operations.ts';
import { handleCarrierBilling } from '../src/stripe-billing.ts';

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  sqlite.exec(`INSERT INTO users(id,name,email,password_hash,password_salt) VALUES ('owner','Owner','owner@example.com','',''),('driver','Driver','driver@example.com','','');
    INSERT INTO companies(id,name,slug) VALUES ('c1','Company One','one'),('c2','Company Two','two');
    INSERT INTO memberships(id,user_id,company_id,role) VALUES ('m1','owner','c1','owner'),('m2','driver','c1','driver');
    INSERT INTO subscriptions(id,company_id,plan,status,stripe_customer_id) VALUES ('s1','c1','basic','pending','cus_one'),('s2','c2','business','pending','cus_two');`);
  for (const user of ['owner', 'driver']) sqlite.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES (?,?,?,datetime('now','+1 day'))")
    .run(user, user, Buffer.from(awaitHashSync(user)).toString('hex'));
  const wrap = (sql, values = []) => ({ bind: (...args) => wrap(sql, args), first: async () => sqlite.prepare(sql).get(...values),
    all: async () => ({ results: sqlite.prepare(sql).all(...values) }), run: async () => ({ meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } }) });
  const env = { DB: { prepare: sql => wrap(sql), batch: async statements => Promise.all(statements.map(s => s.run())) },
    ALLOWED_ORIGINS: 'https://carrier.example.com', BILLING_APP_URL: 'https://carrier.example.com/app', STRIPE_SECRET_KEY: 'sk_test_fixture',
    STRIPE_WEBHOOK_SECRET: 'whsec_fixture', STRIPE_BASIC_PRICE_ID: 'price_basic', STRIPE_BUSINESS_PRICE_ID: 'price_business', STRIPE_PORTAL_CONFIGURATION_ID: 'bpc_carrier' };
  const stripe = new Stripe('sk_test_fixture');
  const calls = [], sessions = new Map();
  let subscriptions = [];
  let current = subscription('active');
  stripe.prices.retrieve = async id => ({ id, active: true, currency: 'usd', unit_amount: id === 'price_basic' ? 4999 : 14900, recurring: { interval: 'month', interval_count: 1 } });
  stripe.subscriptions.list = async () => ({ data: subscriptions });
  stripe.subscriptions.retrieve = async () => { calls.push('retrieve'); return current; };
  stripe.checkout.sessions.list = async () => ({ data: [] });
  stripe.checkout.sessions.create = async (params, options) => { calls.push({ params, options }); if (!sessions.has(options.idempotencyKey)) sessions.set(options.idempotencyKey, { url: `https://checkout.stripe.com/c/pay/test${sessions.size + 1}` }); return sessions.get(options.idempotencyKey); };
  stripe.billingPortal.sessions.create = async params => { calls.push(params); return { url: 'https://billing.stripe.com/p/session/test' }; };
  const send = (path, { user = 'owner', companyId = 'c1', plan = 'basic', origin = 'https://carrier.example.com', method = 'POST' } = {}) => handleCarrierBilling(new Request(`https://api.example.com/api/billing/stripe/${path}`, {
    method, headers: { Origin: origin, ...(user ? { Authorization: `Bearer ${user}` } : {}) }, body: method === 'POST' ? JSON.stringify({ companyId, plan, returnUrl: 'https://evil.example.com' }) : undefined
  }), env, stripe);
  const event = async (id, type = 'customer.subscription.updated', overrides = {}) => {
    const payload = JSON.stringify({ id, type, livemode: false, data: { object: { id: 'sub_one', ...overrides } } });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: env.STRIPE_WEBHOOK_SECRET });
    return handleCarrierBilling(new Request('https://api.example.com/api/billing/stripe/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': signature } }), env, stripe);
  };
  return { sqlite, env, stripe, calls, send, event, setSubscriptions: value => { subscriptions = value; }, setCurrent: value => { current = value; } };
}
import { createHash } from 'node:crypto';
function awaitHashSync(value) { return createHash('sha256').update(value).digest(); }
function subscription(status, id = 'sub_one', customer = 'cus_one') { return { id, status, customer, items: { data: [{ quantity: 1, current_period_end: Math.floor(Date.now()/1000)+86400, price: { id: 'price_basic', currency: 'usd', unit_amount: 4999, recurring: { interval: 'month', interval_count: 1 } } }] } }; }

test('Billing rejects signed-out users, drivers, foreign companies and foreign origins', async () => {
  const f = fixture();
  for (const [options, status] of [[{ user: '' }, 401], [{ user: 'driver' }, 403], [{ companyId: 'c2' }, 403], [{ origin: 'https://evil.example.com' }, 403]]) assert.equal((await f.send('checkout', options)).status, status);
  assert.equal(f.calls.length, 0); f.sqlite.close();
});
test('Checkout pricing and return URL are server-controlled, and retries are stable', async () => {
  const f = fixture();
  const first = await (await f.send('checkout')).json();
  assert.deepEqual(await (await f.send('checkout')).json(), first);
  assert.equal(f.calls[0].params.line_items[0].price, 'price_basic');
  assert.equal(f.calls[0].params.success_url, 'https://carrier.example.com/app/billing/?checkout=success');
  f.setSubscriptions([subscription('canceled')]);
  assert.notEqual((await (await f.send('checkout')).json()).url, first.url);
  f.setSubscriptions([subscription('past_due')]);
  assert.equal((await f.send('checkout')).status, 409); f.sqlite.close();
});
test('Incorrect prices and administrator-granted access cannot create a checkout', async () => {
  const f = fixture(); f.stripe.prices.retrieve = async () => ({ active: true, currency: 'usd', unit_amount: 1 });
  assert.equal((await f.send('checkout')).status, 503);
  f.sqlite.exec("UPDATE subscriptions SET status='active' WHERE company_id='c1'");
  assert.equal((await f.send('checkout')).status, 409); assert.equal(f.calls.length, 0); f.sqlite.close();
});
test('The billing portal uses the authenticated company and its dedicated configuration', async () => {
  const f = fixture(); assert.equal((await f.send('portal')).status, 200);
  assert.deepEqual(f.calls[0], { customer: 'cus_one', configuration: 'bpc_carrier', return_url: 'https://carrier.example.com/app/billing/' }); f.sqlite.close();
});
test('Signed webhooks apply current state once and delayed events cannot revive canceled access', async () => {
  const f = fixture(); assert.equal((await f.event('evt1')).status, 200);
  assert.equal(f.sqlite.prepare("SELECT status FROM subscriptions WHERE company_id='c1'").get().status, 'active');
  await f.event('evt1'); assert.equal(f.calls.filter(x => x === 'retrieve').length, 1);
  f.setCurrent(subscription('canceled')); await f.event('evt2');
  assert.equal(f.sqlite.prepare("SELECT status FROM subscriptions WHERE company_id='c1'").get().status, 'canceled');
  f.setCurrent(subscription('trialing', 'sub_new')); await f.event('evt3', 'customer.subscription.created');
  f.setCurrent(subscription('canceled')); await f.event('evt4', 'customer.subscription.deleted');
  assert.equal(f.sqlite.prepare("SELECT stripe_subscription_id FROM subscriptions WHERE company_id='c1'").get().stripe_subscription_id, 'sub_new'); f.sqlite.close();
});
test('Webhooks cannot replace custom access or another company using untrusted metadata', async () => {
  const f = fixture(); f.sqlite.exec("UPDATE subscriptions SET plan='custom',status='comped' WHERE company_id='c1'");
  await f.event('evt1', 'customer.subscription.created', { metadata: { carrier_company_id: 'c2' } });
  assert.equal(f.sqlite.prepare("SELECT status FROM subscriptions WHERE company_id='c1'").get().status, 'comped');
  assert.equal(f.sqlite.prepare("SELECT status FROM subscriptions WHERE company_id='c2'").get().status, 'pending'); f.sqlite.close();
});
test('Unsigned events and the wrong payment environment are rejected', async () => {
  const f = fixture(); const request = new Request('https://api.example.com/api/billing/stripe/webhook', { method: 'POST', body: '{}' });
  assert.equal((await handleCarrierBilling(request, f.env, f.stripe)).status, 400);
  const payload = JSON.stringify({ id: 'evt_live', type: 'customer.subscription.created', livemode: true, data: { object: { id: 'sub_one' } } });
  const signature = f.stripe.webhooks.generateTestHeaderString({ payload, secret: f.env.STRIPE_WEBHOOK_SECRET });
  assert.equal((await handleCarrierBilling(new Request('https://api.example.com/api/billing/stripe/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': signature } }), f.env, f.stripe)).status, 400); assert.equal(f.calls.length, 0); f.sqlite.close();
});


test('Open checkout is reused, another plan is blocked, and expired checkout gets a new key', async () => {
  const f = fixture();
  const first = await (await f.send('checkout')).json();
  f.stripe.checkout.sessions.list = async () => ({ data: [{ id: 'cs_old', mode: 'subscription', client_reference_id: 'c1', status: 'open', metadata: { carrier_plan: 'basic' }, url: first.url }] });
  assert.deepEqual(await (await f.send('checkout')).json(), first);
  assert.equal((await f.send('checkout', { plan: 'business' })).status, 409);
  f.stripe.checkout.sessions.list = async () => ({ data: [{ id: 'cs_old', mode: 'subscription', client_reference_id: 'c1', status: 'expired' }] });
  assert.notEqual((await (await f.send('checkout')).json()).url, first.url);
  f.sqlite.close();
});


test('Deleting a job reports actual D1 changes and cannot delete a foreign company job', async () => {
  const f = fixture();
  f.sqlite.exec("UPDATE subscriptions SET status='active' WHERE company_id='c1'; INSERT INTO jobs(id,company_id,status) VALUES ('job-one','c1','Completed'),('job-two','c2','Completed')");
  const send = id => handleOperationsRequest(new Request(`https://api.example.com/api/jobs?id=${id}`, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } }), f.env);
  assert.equal((await send('job-two')).status, 404);
  const result = await send('job-one');
  assert.equal(result.status, 200); assert.equal((await result.json()).cleared, 1);
  assert.equal(f.sqlite.prepare("SELECT count(*) AS n FROM jobs WHERE id='job-two'").get().n, 1);
  f.sqlite.close();
});

test('Failed renewal removes operating access and payment recovery restores it', async () => {
  const f = fixture();
  await f.event('evt_active');
  f.setCurrent(subscription('past_due'));
  await f.event('evt_failed', 'invoice.payment_failed', { parent: { subscription_details: { subscription: 'sub_one' } } });
  const request = () => new Request('https://api.example.com/api/jobs', { headers: { Authorization: 'Bearer owner' } });
  assert.equal((await handleOperationsRequest(request(), f.env)).status, 403);
  f.setCurrent(subscription('active'));
  await f.event('evt_paid', 'invoice.paid', { parent: { subscription_details: { subscription: 'sub_one' } } });
  assert.equal((await handleOperationsRequest(request(), f.env)).status, 200);
  f.sqlite.close();
});

test('Webhook preserves administrator-granted access without a linked subscription', async () => {
  const f = fixture(); f.sqlite.exec("UPDATE subscriptions SET status='active' WHERE company_id='c1'");
  f.setCurrent(subscription('canceled'));
  await f.event('evt_canceled');
  assert.equal(f.sqlite.prepare("SELECT status FROM subscriptions WHERE company_id='c1'").get().status, 'active');
  f.sqlite.close();
});
