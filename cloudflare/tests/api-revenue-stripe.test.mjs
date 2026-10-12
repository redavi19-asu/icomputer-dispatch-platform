import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import {
  createApiCheckout,
  handleApiRevenueEvent,
  cancelApiRenewal,
  apiPlanConfiguration,
} from "../src/api-revenue-stripe.ts";
import { apiRevenueDatabase } from "../src/api-revenue-database.ts";
import { apiRevenueStatus } from "../src/api-revenue.ts";
test("Carrier API subscription, canonical webhook state and cancellation do not alter software access", async () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  sqlite.exec(
    "INSERT INTO companies(id,name,slug) VALUES ('one','One','one'),('two','Two','two');INSERT INTO subscriptions(id,company_id,plan,status,stripe_customer_id,stripe_subscription_id) VALUES ('main-one','one','basic','active','cus_fixture','sub_base_fixture')",
  );
  const wrap = (sql, values = []) => ({
    sql,
    values,
    bind: (...args) => wrap(sql, args),
    async all() {
      return { results: sqlite.prepare(sql).all(...values) };
    },
    async first() {
      return sqlite.prepare(sql).get(...values);
    },
    async run() {
      return {
        meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) },
      };
    },
  });
  const env = {
    DB: {
      prepare: (sql) => wrap(sql),
      async batch(statements) {
        sqlite.exec("BEGIN");
        try {
          const result = statements.map((s) => {
            const results = sqlite.prepare(s.sql).all(...s.values);
            return {
              results,
              meta: {
                changes: Number(sqlite.prepare("SELECT changes() n").get().n),
              },
            };
          });
          sqlite.exec("COMMIT");
          return result;
        } catch (error) {
          sqlite.exec("ROLLBACK");
          throw error;
        }
      },
    },
    ALLOWED_ORIGINS: "https://carrier.example",
    API_PAID_ACCESS_REQUIRED: "true",
    STRIPE_SECRET_KEY: "rk_test_fixture_only",
    STRIPE_WEBHOOK_SECRET: "whsec_fixture_only",
    STRIPE_API_PRICE_ID: "price_api_fixture",
    API_MONTHLY_AMOUNT_CENTS: "12345",
    API_MONTHLY_REQUEST_ALLOWANCE: "5",
  };
  const original = globalThis.fetch,
    now = Math.floor(Date.now() / 1000);
  const price = {
    id: "price_api_fixture",
    active: true,
    currency: "usd",
    unit_amount: 12345,
    recurring: { interval: "month", interval_count: 1 },
  };
  let state = {
    id: "sub_api_fixture",
    customer: "cus_fixture",
    status: "active",
    metadata: { product: "urban-carrier-api" },
    items: {
      data: [
        {
          quantity: 1,
          price,
          current_period_start: now - 100,
          current_period_end: now + 30000,
        },
      ],
    },
  };
  let checkoutBody,
    paid = false,
    cancelled = false;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    let body = {};
    if (url.includes("/v1/prices/")) body = price;
    else if (url.includes("/v1/subscriptions/sub_api_fixture")) {
      body = state;
      if (init?.method === "POST") cancelled = true;
    } else if (url.includes("/v1/subscriptions"))
      body = {
        data: paid
          ? [state]
          : [
              {
                status: "active",
                metadata: {},
                items: { data: [{ price: { id: "price_basic" } }] },
              },
            ],
        has_more: false,
      };
    else if (url.includes("/v1/checkout/sessions")) {
      if (init?.method === "POST") {
        checkoutBody = new URLSearchParams(String(init.body));
        body = { id: "cs_fixture", url: "https://checkout.stripe.com/fixture" };
      } else body = { data: [], has_more: false };
    } else throw new Error("Unexpected fixture request");
    return Response.json(body);
  };
  try {
    assert.equal(apiPlanConfiguration(env).ready, true);
    await createApiCheckout(
      {
        organizationId: "one",
        organizationName: "One",
        email: "fixture@example.com",
        origin: "https://carrier.example",
      },
      env,
    );
    assert.equal(checkoutBody.get("line_items[0][price]"), "price_api_fixture");
    assert.equal(checkoutBody.get("metadata[product]"), "urban-carrier-api");
    assert.equal(
      (await apiRevenueStatus(apiRevenueDatabase(env.DB), "one", true))
        .entitled,
      false,
    );
    paid = true;
    await handleApiRevenueEvent(
      { type: "customer.subscription.created", data: { object: state } },
      env,
    );
    assert.equal(
      (await apiRevenueStatus(apiRevenueDatabase(env.DB), "one", true))
        .entitled,
      true,
    );
    await assert.rejects(
      () =>
        createApiCheckout(
          {
            organizationId: "one",
            organizationName: "One",
            email: "fixture@example.com",
            origin: "https://carrier.example",
          },
          env,
        ),
      /API_SUBSCRIPTION_EXISTS/,
    );
    state = { ...state, status: "past_due" };
    await handleApiRevenueEvent(
      {
        type: "customer.subscription.updated",
        data: { object: { ...state, status: "active" } },
      },
      env,
    );
    assert.equal(
      (await apiRevenueStatus(apiRevenueDatabase(env.DB), "one", true))
        .entitled,
      false,
    );
    assert.equal(
      sqlite
        .prepare("SELECT status FROM subscriptions WHERE company_id='one'")
        .get().status,
      "active",
    );
    assert.equal(
      (await apiRevenueStatus(apiRevenueDatabase(env.DB), "two", true))
        .entitled,
      false,
    );
    state = { ...state, status: "active" };
    await handleApiRevenueEvent(
      {
        type: "invoice.paid",
        data: {
          object: {
            parent: {
              subscription_details: { subscription: "sub_api_fixture" },
            },
          },
        },
      },
      env,
    );
    env.API_MONTHLY_REQUEST_ALLOWANCE = "999";
    await handleApiRevenueEvent(
      { type: "customer.subscription.updated", data: { object: state } },
      env,
    );
    assert.equal(
      (await apiRevenueStatus(apiRevenueDatabase(env.DB), "one", true))
        .allowance,
      5,
    );
    env.API_PAID_ACCESS_REQUIRED = "false";
    await cancelApiRenewal("one", env);
    assert.ok(cancelled);
    state = { ...state, status: "canceled" };
    await handleApiRevenueEvent(
      { type: "customer.subscription.deleted", data: { object: state } },
      env,
    );
    assert.equal(
      (await apiRevenueStatus(apiRevenueDatabase(env.DB), "one", true))
        .entitled,
      false,
    );
    assert.equal(
      sqlite
        .prepare("SELECT status FROM subscriptions WHERE company_id='one'")
        .get().status,
      "active",
    );
  } finally {
    globalThis.fetch = original;
    sqlite.close();
  }
});
