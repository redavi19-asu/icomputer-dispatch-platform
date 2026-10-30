import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import {
  carrierDeveloperBillingReady,
  consumeCarrierDeveloperQuota,
  ensureCarrierDeveloperBillingTables,
} from "../src/developer-billing.ts";

function fixture() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  sqlite.exec("INSERT INTO companies(id,name,slug) VALUES ('one','One','one'),('two','Two','two')");
  const wrap = (sql, args = []) => ({
    sql, args,
    bind: (...values) => wrap(sql, values),
    first: async () => sqlite.prepare(sql).get(...args) || null,
    run: async () => sqlite.prepare(sql).run(...args),
  });
  const db = {
    prepare: (sql) => wrap(sql),
    batch: async (queries) => {
      sqlite.exec("BEGIN");
      try {
        for (const query of queries) sqlite.prepare(query.sql).run(...query.args);
        sqlite.exec("COMMIT");
      } catch (e) { sqlite.exec("ROLLBACK"); throw e; }
    },
  };
  return { sqlite, db };
}

test("developer billing requires explicit activation and configured Stripe prices", () => {
  assert.equal(carrierDeveloperBillingReady({
    DEVELOPER_BILLING_ENABLED: "false",
    STRIPE_SECRET_KEY: "sk_test_demo",
    STRIPE_WEBHOOK_SECRET: "whsec_demo",
    DEVELOPER_BILLING_ENFORCE_FROM: "2026-11-01T00:00:00Z",
    STRIPE_DEVELOPER_STARTER_PRICE_ID: "price_a",
    STRIPE_DEVELOPER_PRO_PRICE_ID: "price_b",
    BILLING_APP_URL: "https://example.test",
  }), false);
});

test("developer quotas use atomic limits, preserve legacy access and block expired subscriptions", async () => {
  const { sqlite, db } = fixture();
  try {
    await ensureCarrierDeveloperBillingTables(db);
    assert.deepEqual(await consumeCarrierDeveloperQuota(db, "one", true), { allowed: true });
    assert.deepEqual(await consumeCarrierDeveloperQuota(db, "one", true, false), { allowed: false });
    const now = Math.floor(Date.now() / 1000);
    sqlite.prepare("INSERT INTO carrier_developer_subscriptions(company_id,stripe_customer_id,stripe_subscription_id,plan,status,period_start,period_end) VALUES ('one','cus_dev','sub_dev','starter','active',?,?)").run(now - 100, now + 1000);
    sqlite.prepare("INSERT INTO carrier_developer_usage(company_id,period_start,used) VALUES ('one',?,24999)").run(now - 100);
    const allowed = await consumeCarrierDeveloperQuota(db, "one", true, false);
    assert.equal(allowed.allowed, true);
    assert.equal(allowed.used, 25000);
    assert.equal((await consumeCarrierDeveloperQuota(db, "one", true, false)).allowed, false);
    assert.equal((await consumeCarrierDeveloperQuota(db, "two", true, false)).allowed, false);
    sqlite.exec("UPDATE carrier_developer_subscriptions SET status='canceled' WHERE company_id='one'");
    assert.equal((await consumeCarrierDeveloperQuota(db, "one", true)).allowed, false);
    assert.equal((await consumeCarrierDeveloperQuota(db, "one", false, false)).allowed, true);
  } finally { sqlite.close(); }
});
