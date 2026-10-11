import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createHash, createHmac } from "node:crypto";
import {
  handleDeveloperRequest,
  publicWebhookUrl,
} from "../src/developer-api.ts";
function fixture() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  sqlite.exec(
    `INSERT INTO users(id,name,email,password_hash,password_salt,role) VALUES ('owner','Owner','owner@qc.example','','','owner'),('driver','Driver','driver@qc.example','','','driver'); INSERT INTO companies(id,name,slug) VALUES ('one','One','one'),('two','Two','two'); INSERT INTO memberships(id,user_id,company_id,role) VALUES ('m1','owner','one','owner'),('m2','driver','one','driver'); INSERT INTO subscriptions(id,company_id,plan,status) VALUES ('s1','one','basic','active'),('s2','two','basic','active');`,
  );
  for (const user of ["owner", "driver"])
    sqlite
      .prepare(
        "INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES (?,?,?,datetime('now','+1 day'))",
      )
      .run(user, user, createHash("sha256").update(user).digest("hex"));
  const wrap = (sql, values = []) => ({
    sql,
    values,
    bind: (...args) => wrap(sql, args),
    first: async () => sqlite.prepare(sql).get(...values) || null,
    all: async () => ({ results: sqlite.prepare(sql).all(...values) }),
    run: async () => ({
      meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) },
    }),
  });
  const env = {
    ALLOWED_ORIGINS: "https://app.example.com",
    DB: {
      prepare: (sql) => wrap(sql),
      async batch(statements) {
        sqlite.exec("BEGIN");
        try {
          const results = [];
          for (const s of statements)
            results.push({
              meta: {
                changes: Number(sqlite.prepare(s.sql).run(...s.values).changes),
              },
            });
          sqlite.exec("COMMIT");
          return results;
        } catch (e) {
          sqlite.exec("ROLLBACK");
          throw e;
        }
      },
    },
  };
  const send = (path, method = "GET", body, token = "owner", extra = {}) =>
    handleDeveloperRequest(
      new Request(`https://api.example.com${path}`, {
        method,
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          ...extra,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      env,
    );
  return { sqlite, send };
}
test("customer key isolation, subscription, scopes, expiry, and revocation", async () => {
  const f = fixture();
  try {
    assert.equal(
      (
        await f.send(
          "/api/integrations/keys",
          "POST",
          { name: "Driver", scopes: ["jobs:read"] },
          "driver",
        )
      ).status,
      403,
    );
    const { key } = await (
      await f.send("/api/integrations/keys", "POST", {
        name: "Readonly",
        scopes: ["jobs:read"],
        expiresInDays: 1,
      })
    ).json();
    assert.ok(key);
    assert.equal(
      (await f.send("/api/integrations/keys", "GET", undefined, key.value))
        .status,
      403,
    );
    f.sqlite.exec(
      "INSERT INTO jobs(id,company_id,status) VALUES ('a','one','Awaiting Dispatch'),('b','two','Completed')",
    );
    assert.deepEqual(
      (
        await (await f.send("/api/v1/jobs", "GET", undefined, key.value)).json()
      ).data.map((j) => j.id),
      ["a"],
    );
    assert.equal(
      (
        await f.send(
          "/api/v1/jobs",
          "POST",
          { name: "X", service: "Delivery", address: "Test" },
          key.value,
          { "Idempotency-Key": "request-123" },
        )
      ).status,
      403,
    );
    const listed = await (await f.send("/api/integrations/keys")).json();
    assert.ok(!JSON.stringify(listed).includes(key.value));
    assert.ok(!JSON.stringify(listed).includes("key_hash"));
    f.sqlite.exec(
      "UPDATE subscriptions SET status='suspended' WHERE company_id='one'",
    );
    assert.equal(
      (await f.send("/api/v1/jobs", "GET", undefined, key.value)).status,
      402,
    );
    f.sqlite.exec(
      "UPDATE subscriptions SET status='active' WHERE company_id='one'",
    );
    f.sqlite
      .prepare("UPDATE carrier_api_keys SET expires_at=0 WHERE id=?")
      .run(key.id);
    assert.equal(
      (await f.send("/api/v1/jobs", "GET", undefined, key.value)).status,
      401,
    );
    f.sqlite
      .prepare("UPDATE carrier_api_keys SET expires_at=? WHERE id=?")
      .run(Date.now() + 60000, key.id);
    await f.send(`/api/integrations/keys?id=${key.id}`, "DELETE");
    assert.equal(
      (await f.send("/api/v1/jobs", "GET", undefined, key.value)).status,
      401,
    );
  } finally {
    f.sqlite.close();
  }
});
test("concurrent booking retries create one job and durable event; polling and rate limit work", async () => {
  const f = fixture();
  try {
    const { key } = await (
      await f.send("/api/integrations/keys", "POST", {
        name: "Bookings",
        scopes: ["jobs:read", "jobs:write", "events:read"],
      })
    ).json();
    const body = {
      name: "QC Customer",
      address: "QC Address",
      service: "Delivery",
    };
    const responses = await Promise.all([
      f.send("/api/v1/jobs", "POST", body, key.value, {
        "Idempotency-Key": "booking-001",
      }),
      f.send("/api/v1/jobs", "POST", body, key.value, {
        "Idempotency-Key": "booking-001",
      }),
    ]);
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 201]);
    for (const table of ["jobs", "customers", "carrier_events"])
      assert.equal(
        f.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n,
        1,
      );
    assert.ok(
      f.sqlite.prepare("SELECT verification_token FROM jobs").get()
        .verification_token,
    );
    assert.equal(
      (
        await f.send(
          "/api/v1/jobs",
          "POST",
          { ...body, address: "Changed" },
          key.value,
          { "Idempotency-Key": "booking-001" },
        )
      ).status,
      409,
    );
    const data = await (
      await f.send("/api/v1/events", "GET", undefined, key.value)
    ).json();
    assert.equal(data.data[0].event, "job.created");
    assert.equal(
      (
        await (
          await f.send(
            `/api/v1/events?after=${encodeURIComponent(data.nextCursor)}`,
            "GET",
            undefined,
            key.value,
          )
        ).json()
      ).data.length,
      0,
    );
    f.sqlite.prepare("UPDATE carrier_api_limits SET used=120").run();
    assert.equal(
      (await f.send("/api/v1/jobs", "GET", undefined, key.value)).status,
      429,
    );
  } finally {
    f.sqlite.close();
  }
});
test("webhook destinations, secret privacy, signatures, and private DNS rejection", async () => {
  for (const url of [
    "http://receiver.com",
    "https://127.0.0.1",
    "https://[::1]",
    "https://u:p@receiver.com",
    "https://a.internal",
    "https://a.local",
    "https://receiver.com:8443",
  ])
    assert.equal(publicWebhookUrl(url), null);
  const f = fixture(),
    original = globalThis.fetch;
  try {
    const { webhook } = await (
      await f.send("/api/integrations/webhooks", "POST", {
        url: "https://receiver.company.com/hooks",
      })
    ).json();
    assert.ok(webhook);
    assert.ok(
      !JSON.stringify(
        await (await f.send("/api/integrations/webhooks")).json(),
      ).includes(webhook.secret),
    );
    let deliveries = 0;
    globalThis.fetch = async (url, init) => {
      if (String(url).includes("dns-query"))
        return Response.json({
          Answer: String(url).includes("type=AAAA")
            ? []
            : [{ type: 1, data: "93.184.216.34" }],
        });
      deliveries++;
      assert.equal(init.redirect, "error");
      assert.equal(
        new Headers(init.headers).get("X-ICA-Signature"),
        `sha256=${createHmac("sha256", webhook.secret).update(init.body).digest("hex")}`,
      );
      return new Response(null, { status: 204 });
    };
    const r = await f.send("/api/integrations/webhooks", "POST", {
      action: "TEST",
    });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).deliveries[0].success, true);
    assert.equal(deliveries, 1);
    globalThis.fetch = async () =>
      Response.json({ Answer: [{ type: 1, data: "10.0.0.1" }] });
    assert.equal(
      (
        await (
          await f.send("/api/integrations/webhooks", "POST", { action: "TEST" })
        ).json()
      ).deliveries[0].success,
      false,
    );
  } finally {
    globalThis.fetch = original;
    f.sqlite.close();
  }
});
