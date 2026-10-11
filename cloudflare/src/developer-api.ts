// Customer credentials are separate from account sessions and Stripe credentials.
type Env = { DB: D1Database; ALLOWED_ORIGINS: string };
const enc = new TextEncoder();
const scopes = ["jobs:read", "jobs:write", "events:read"];
const operating = ["active", "trialing", "grace_period", "comped"];
const hex = (b: ArrayBuffer) =>
  Array.from(new Uint8Array(b), (n) => n.toString(16).padStart(2, "0")).join(
    "",
  );
const hash = async (s: string) =>
  hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });

export async function ensureDeveloperTables(db: D1Database) {
  await db.batch([
    db.prepare(
      `CREATE TABLE IF NOT EXISTS carrier_api_keys(id TEXT PRIMARY KEY,company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,name TEXT NOT NULL,prefix TEXT NOT NULL,key_hash TEXT UNIQUE NOT NULL,scopes TEXT NOT NULL,expires_at INTEGER NOT NULL,active INTEGER NOT NULL DEFAULT 1,created_at TEXT DEFAULT CURRENT_TIMESTAMP,last_used_at TEXT)`,
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS carrier_api_limits(key_id TEXT NOT NULL REFERENCES carrier_api_keys(id) ON DELETE CASCADE,slot INTEGER NOT NULL,used INTEGER NOT NULL,PRIMARY KEY(key_id,slot))`,
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS carrier_api_requests(company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,request_id TEXT NOT NULL,body_hash TEXT NOT NULL,job_id TEXT NOT NULL,PRIMARY KEY(company_id,request_id))`,
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS carrier_events(id TEXT PRIMARY KEY,company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,event TEXT NOT NULL,data TEXT NOT NULL,created_at TEXT NOT NULL)`,
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS carrier_webhooks(id TEXT PRIMARY KEY,company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,url TEXT NOT NULL,secret TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,last_status INTEGER,last_delivery_at TEXT)`,
    ),
  ]);
}

export async function recordCarrierEvent(
  db: D1Database,
  companyId: string,
  event: string,
  data: unknown,
) {
  await ensureDeveloperTables(db);
  const item = {
    id: crypto.randomUUID(),
    event,
    createdAt: new Date().toISOString(),
    data,
  };
  await db
    .prepare(
      "INSERT INTO carrier_events(id,company_id,event,data,created_at) VALUES (?,?,?,?,?)",
    )
    .bind(item.id, companyId, event, JSON.stringify(data), item.createdAt)
    .run();
  return item;
}

export function publicWebhookUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const u = new URL(value);
    const h = u.hostname.toLowerCase();
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.hash ||
      (u.port && u.port !== "443") ||
      !h.includes(".") ||
      /[\[\]:]/.test(h) ||
      /^[\d.]+$/.test(h) ||
      /(?:^|\.)(localhost|local|internal|test|invalid|example)$/.test(h)
    )
      return null;
    return u.toString();
  } catch {
    return null;
  }
}

// DNS preflight rejects private/reserved destinations before each delivery.
// Redirects are forbidden and no receiver response body is read.
async function receiverIsPublic(url: string) {
  const target = publicWebhookUrl(url);
  if (!target) return false;
  const host = new URL(target).hostname;
  const response = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`,
    {
      headers: { Accept: "application/dns-json" },
      signal: AbortSignal.timeout(3000),
    },
  );
  if (!response.ok) return false;
  const dns = (await response.json()) as {
    Answer?: { type: number; data: string }[];
  };
  const addresses = (dns.Answer || [])
    .filter((a) => a.type === 1)
    .map((a) => a.data);
  const ipv6Response = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=AAAA`,
    {
      headers: { Accept: "application/dns-json" },
      signal: AbortSignal.timeout(3000),
    },
  );
  if (!ipv6Response.ok) return false;
  const ipv6Dns = (await ipv6Response.json()) as {
    Answer?: { type: number; data: string }[];
  };
  const ipv6 = (ipv6Dns.Answer || [])
    .filter((a) => a.type === 28)
    .map((a) => a.data.toLowerCase());
  if (
    ipv6.some(
      (ip) =>
        !/^2[0-9a-f]{3}:|^3[0-9a-f]{3}:/.test(ip) ||
        ip.startsWith("2001:db8:") ||
        ip.startsWith("2002:") ||
        ip.includes("."),
    )
  )
    return false;
  return (
    addresses.length > 0 &&
    addresses.every((ip) => {
      const n = ip.split(".").map(Number);
      return (
        n.length === 4 &&
        n.every((x) => Number.isInteger(x) && x >= 0 && x <= 255) &&
        ![0, 10, 127].includes(n[0]) &&
        n[0] < 224 &&
        !(n[0] === 169 && n[1] === 254) &&
        !(n[0] === 172 && n[1] >= 16 && n[1] <= 31) &&
        !(n[0] === 192 && (n[1] === 168 || n[1] === 0 || n[1] === 2)) &&
        !(n[0] === 100 && n[1] >= 64 && n[1] <= 127) &&
        !(n[0] === 198 && (n[1] === 18 || n[1] === 19 || n[1] === 51)) &&
        !(n[0] === 203 && n[1] === 0)
      );
    })
  );
}

export async function deliverCarrierEvent(
  db: D1Database,
  companyId: string,
  item: unknown,
) {
  const hooks = await db
    .prepare(
      "SELECT id,url,secret FROM carrier_webhooks WHERE company_id=? AND active=1 LIMIT 10",
    )
    .bind(companyId)
    .all<{ id: string; url: string; secret: string }>();
  return Promise.all(
    (hooks.results || []).map(async (hook) => {
      let status = 0;
      try {
        if (!(await receiverIsPublic(hook.url)))
          throw new Error("Receiver unavailable");
        const body = JSON.stringify(item);
        const key = await crypto.subtle.importKey(
          "raw",
          enc.encode(hook.secret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );
        const signature = hex(
          await crypto.subtle.sign("HMAC", key, enc.encode(body)),
        );
        const response = await fetch(hook.url, {
          method: "POST",
          redirect: "error",
          headers: {
            "Content-Type": "application/json",
            "X-ICA-Signature": `sha256=${signature}`,
          },
          body,
          signal: AbortSignal.timeout(8000),
        });
        status = response.status;
        await response.body?.cancel();
      } catch {
        status = 0;
      }
      await db
        .prepare(
          "UPDATE carrier_webhooks SET last_status=?,last_delivery_at=? WHERE id=? AND company_id=?",
        )
        .bind(status, new Date().toISOString(), hook.id, companyId)
        .run();
      return { id: hook.id, status, success: status >= 200 && status < 300 };
    }),
  );
}

async function manager(request: Request, db: D1Database) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return null;
  const user = await db
    .prepare(
      `SELECT c.id AS company_id,u.role AS user_role,m.role AS member_role FROM sessions s JOIN users u ON u.id=s.user_id JOIN memberships m ON m.user_id=u.id JOIN companies c ON c.id=m.company_id WHERE s.token_hash=? AND s.expires_at>datetime('now') ORDER BY m.created_at LIMIT 1`,
    )
    .bind(await hash(token))
    .first<{ company_id: string; user_role: string; member_role: string }>();
  return user &&
    (user.user_role === "admin" ||
      ["owner", "admin"].includes(user.member_role))
    ? user
    : null;
}

async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Invalid input");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 16384) {
      await reader.cancel();
      throw new Error("Payload too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let i = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, i);
    i += chunk.length;
  }
  const body = JSON.parse(new TextDecoder().decode(bytes));
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Error("Invalid input");
  return body as Record<string, unknown>;
}

export async function handleDeveloperRequest(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const url = new URL(request.url),
    path = url.pathname;
  if (!path.startsWith("/api/integrations/") && !path.startsWith("/api/v1/"))
    return null;
  const origin = request.headers.get("origin") || "";
  const headers: Record<string, string> = { Vary: "Origin" };
  if (
    env.ALLOWED_ORIGINS.split(",")
      .map((s) => s.trim())
      .includes(origin)
  )
    headers["Access-Control-Allow-Origin"] = origin;
  if (request.method === "OPTIONS")
    return new Response(null, {
      status: 204,
      headers: {
        ...headers,
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Authorization, Content-Type, Idempotency-Key",
      },
    });
  try {
    await ensureDeveloperTables(env.DB);
    if (path.startsWith("/api/integrations/")) {
      const account = await manager(request, env.DB);
      if (!account)
        return json(
          { error: "Owner or admin session required." },
          403,
          headers,
        );
      const company = account.company_id;
      if (path === "/api/integrations/keys") {
        if (request.method === "GET") {
          const keys = await env.DB.prepare(
            "SELECT id,name,prefix,scopes,expires_at,active,created_at,last_used_at FROM carrier_api_keys WHERE company_id=? ORDER BY created_at DESC",
          )
            .bind(company)
            .all();
          return json({ keys: keys.results }, 200, headers);
        }
        if (request.method === "DELETE") {
          await env.DB.prepare(
            "UPDATE carrier_api_keys SET active=0 WHERE id=? AND company_id=?",
          )
            .bind(url.searchParams.get("id") || "", company)
            .run();
          return json({ ok: true }, 200, headers);
        }
        if (request.method === "POST") {
          const body = await readBody(request);
          const name = String(body.name || "").trim();
          const selected = body.scopes;
          const days = Number(body.expiresInDays ?? 90);
          if (
            name.length < 2 ||
            name.length > 80 ||
            !Array.isArray(selected) ||
            !selected.length ||
            selected.some((s) => !scopes.includes(s)) ||
            !Number.isInteger(days) ||
            days < 1 ||
            days > 365
          )
            return json(
              {
                error:
                  "Choose a name, valid scopes, and an expiry from 1 to 365 days.",
              },
              400,
              headers,
            );
          const count = await env.DB.prepare(
            "SELECT COUNT(*) AS n FROM carrier_api_keys WHERE company_id=? AND active=1 AND expires_at>?",
          )
            .bind(company, Date.now())
            .first<{ n: number }>();
          if (Number(count?.n) >= 20)
            return json(
              { error: "Revoke an unused key first (20 active keys maximum)." },
              409,
              headers,
            );
          const value = `carrier_live_${random()}`,
            id = crypto.randomUUID(),
            expiresAt = Date.now() + days * 86400000;
          await env.DB.prepare(
            "INSERT INTO carrier_api_keys(id,company_id,name,prefix,key_hash,scopes,expires_at) VALUES (?,?,?,?,?,?,?)",
          )
            .bind(
              id,
              company,
              name,
              value.slice(0, 20),
              await hash(value),
              JSON.stringify([...new Set(selected)]),
              expiresAt,
            )
            .run();
          return json(
            {
              key: { id, value, expiresAt },
              warning: "Copy once. Store on your server; never in client code.",
            },
            201,
            headers,
          );
        }
      }
      if (path === "/api/integrations/webhooks") {
        if (request.method === "GET") {
          const r = await env.DB.prepare(
            "SELECT id,url,active,last_status,last_delivery_at FROM carrier_webhooks WHERE company_id=?",
          )
            .bind(company)
            .all();
          return json({ webhooks: r.results }, 200, headers);
        }
        if (request.method === "DELETE") {
          await env.DB.prepare(
            "UPDATE carrier_webhooks SET active=0 WHERE id=? AND company_id=?",
          )
            .bind(url.searchParams.get("id") || "", company)
            .run();
          return json({ ok: true }, 200, headers);
        }
        if (request.method === "POST") {
          const body = await readBody(request);
          if (body.action === "TEST") {
            const item = await recordCarrierEvent(
              env.DB,
              company,
              "integration.test",
              { test: true },
            );
            return json(
              { deliveries: await deliverCarrierEvent(env.DB, company, item) },
              200,
              headers,
            );
          }
          const target = publicWebhookUrl(body.url);
          if (!target)
            return json(
              {
                error:
                  "Use a public HTTPS receiver with no credentials, fragment, or custom port.",
              },
              400,
              headers,
            );
          const count = await env.DB.prepare(
            "SELECT COUNT(*) AS n FROM carrier_webhooks WHERE company_id=? AND active=1",
          )
            .bind(company)
            .first<{ n: number }>();
          if (Number(count?.n) >= 10)
            return json(
              { error: "Remove an unused webhook first." },
              409,
              headers,
            );
          const id = crypto.randomUUID(),
            secret = `carrier_whsec_${random()}`;
          await env.DB.prepare(
            "INSERT INTO carrier_webhooks(id,company_id,url,secret) VALUES (?,?,?,?)",
          )
            .bind(id, company, target, secret)
            .run();
          return json({ webhook: { id, url: target, secret } }, 201, headers);
        }
      }
      return json({ error: "Method or endpoint not supported." }, 405, headers);
    }
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer (carrier_live_\w+)$/)?.[1];
    if (!token)
      return json({ error: "Customer API key required." }, 401, headers);
    const credential = await env.DB.prepare(
      `SELECT k.*,COALESCE(s.status,'pending') AS status FROM carrier_api_keys k JOIN companies c ON c.id=k.company_id LEFT JOIN subscriptions s ON s.company_id=c.id WHERE key_hash=? AND active=1 AND expires_at>?`,
    )
      .bind(await hash(token), Date.now())
      .first<{
        id: string;
        company_id: string;
        scopes: string;
        status: string;
      }>();
    if (!credential)
      return json({ error: "Invalid, expired, or revoked key." }, 401, headers);
    if (!operating.includes(credential.status.toLowerCase()))
      return json(
        { error: "Active Carrier subscription required." },
        402,
        headers,
      );
    const required =
      path === "/api/v1/events"
        ? "events:read"
        : request.method === "GET"
          ? "jobs:read"
          : "jobs:write";
    if (!JSON.parse(credential.scopes).includes(required))
      return json({ error: "Required scope missing." }, 403, headers);
    const slot = Math.floor(Date.now() / 60000);
    const limit = await env.DB.prepare(
      `INSERT INTO carrier_api_limits(key_id,slot,used) VALUES (?,?,1) ON CONFLICT(key_id,slot) DO UPDATE SET used=used+1 WHERE used<120 RETURNING used`,
    )
      .bind(credential.id, slot)
      .first();
    if (!limit)
      return json({ error: "Rate limit reached." }, 429, {
        ...headers,
        "Retry-After": "60",
      });
    await env.DB.prepare("DELETE FROM carrier_api_limits WHERE slot<?")
      .bind(slot - 60)
      .run();
    await env.DB.prepare(
      "UPDATE carrier_api_keys SET last_used_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(credential.id)
      .run();
    if (path === "/api/v1/jobs" && request.method === "GET") {
      const cursor = url.searchParams.get("after") || "";
      const result = await env.DB.prepare(
        "SELECT id,status,service,address,details,created_at,updated_at FROM jobs WHERE company_id=? AND id>? ORDER BY id LIMIT 100",
      )
        .bind(credential.company_id, cursor)
        .all();
      return json(
        {
          data: result.results,
          nextCursor:
            result.results?.length === 100 ? result.results[99].id : null,
        },
        200,
        headers,
      );
    }
    if (path === "/api/v1/events" && request.method === "GET") {
      const cursor = url.searchParams.get("after") || "";
      const result = await env.DB.prepare(
        "SELECT id,event,data,created_at FROM carrier_events WHERE company_id=? AND (created_at||id)>? ORDER BY created_at,id LIMIT 100",
      )
        .bind(credential.company_id, cursor)
        .all<{ id: string; event: string; data: string; created_at: string }>();
      const rows = result.results || [];
      return json(
        {
          data: rows.map((r) => ({
            id: r.id,
            event: r.event,
            createdAt: r.created_at,
            data: JSON.parse(r.data),
          })),
          nextCursor: rows.length
            ? rows.at(-1)!.created_at + rows.at(-1)!.id
            : cursor,
        },
        200,
        headers,
      );
    }
    if (path === "/api/v1/jobs" && request.method === "POST") {
      const body = await readBody(request);
      const requestId = request.headers.get("Idempotency-Key") || "";
      if (!/^[A-Za-z0-9_-]{8,100}$/.test(requestId))
        return json(
          {
            error:
              "Provide an Idempotency-Key of 8–100 letters, numbers, underscores, or hyphens.",
          },
          400,
          headers,
        );
      for (const field of ["name", "address", "service"])
        if (
          typeof body[field] !== "string" ||
          !(body[field] as string).trim() ||
          (body[field] as string).length > 500
        )
          return json(
            {
              error:
                "Name, service, and address are required (maximum 500 characters each).",
            },
            400,
            headers,
          );
      if (
        Object.keys(body).some(
          (k) =>
            ![
              "name",
              "address",
              "service",
              "details",
              "email",
              "phone",
            ].includes(k),
        ) ||
        ["details", "email", "phone"].some(
          (k) =>
            body[k] !== undefined &&
            (typeof body[k] !== "string" || String(body[k]).length > 2000),
        )
      )
        return json(
          { error: "Unsupported field or invalid optional value." },
          400,
          headers,
        );
      const bodyHash = await hash(
        JSON.stringify(
          Object.fromEntries(
            Object.entries(body).sort(([a], [b]) => a.localeCompare(b)),
          ),
        ),
      );
      const id = crypto.randomUUID(),
        customer = crypto.randomUUID(),
        now = new Date().toISOString(),
        company = credential.company_id;
      const verification = random().slice(0, 12).toUpperCase();
      await env.DB.batch([
        env.DB.prepare(
          "INSERT OR IGNORE INTO carrier_api_requests(company_id,request_id,body_hash,job_id) VALUES (?,?,?,?)",
        ).bind(company, requestId, bodyHash, id),
        env.DB.prepare(
          `INSERT INTO customers(id,company_id,name,email,phone,address) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM carrier_api_requests WHERE company_id=? AND request_id=? AND job_id=?)`,
        ).bind(
          customer,
          company,
          body.name,
          body.email || null,
          body.phone || null,
          body.address,
          company,
          requestId,
          id,
        ),
        env.DB.prepare(
          `INSERT INTO jobs(id,company_id,customer_id,status,service,address,details,status_history,verification_token,pickup_verification_token,delivery_verification_token,created_at,updated_at) SELECT ?,?,?,'Awaiting Dispatch',?,?,?,'[]',?,?,?,?,? WHERE EXISTS (SELECT 1 FROM carrier_api_requests WHERE company_id=? AND request_id=? AND job_id=?)`,
        ).bind(
          id,
          company,
          customer,
          body.service,
          body.address,
          body.details || null,
          verification,
          `P-${verification}`,
          `D-${verification}`,
          now,
          now,
          company,
          requestId,
          id,
        ),
        env.DB.prepare(
          `INSERT INTO carrier_events(id,company_id,event,data,created_at) SELECT ?,?,'job.created',?,? WHERE EXISTS (SELECT 1 FROM carrier_api_requests WHERE company_id=? AND request_id=? AND job_id=?)`,
        ).bind(
          crypto.randomUUID(),
          company,
          JSON.stringify({ jobId: id, status: "Awaiting Dispatch" }),
          now,
          company,
          requestId,
          id,
        ),
      ]);
      const saved = await env.DB.prepare(
        "SELECT body_hash,job_id FROM carrier_api_requests WHERE company_id=? AND request_id=?",
      )
        .bind(company, requestId)
        .first<{ body_hash: string; job_id: string }>();
      if (saved?.body_hash !== bodyHash)
        return json(
          { error: "That Idempotency-Key was used with different input." },
          409,
          headers,
        );
      if (saved.job_id === id) {
        const event = await env.DB.prepare(
          "SELECT id,event,data,created_at FROM carrier_events WHERE company_id=? AND data=? ORDER BY created_at DESC LIMIT 1",
        )
          .bind(
            company,
            JSON.stringify({ jobId: id, status: "Awaiting Dispatch" }),
          )
          .first<{
            id: string;
            event: string;
            data: string;
            created_at: string;
          }>();
        if (event)
          await deliverCarrierEvent(env.DB, company, {
            id: event.id,
            event: event.event,
            data: JSON.parse(event.data),
            createdAt: event.created_at,
          });
      }
      const job = await env.DB.prepare(
        "SELECT id,status FROM jobs WHERE id=? AND company_id=?",
      )
        .bind(saved.job_id, company)
        .first();
      if (!job)
        return json(
          {
            error:
              "The original booking was removed. Use a new Idempotency-Key for a new booking.",
          },
          410,
          headers,
        );
      return json(
        { data: job, replayed: saved.job_id !== id },
        saved.job_id === id ? 201 : 200,
        headers,
      );
    }
    return json({ error: "Endpoint or method not supported." }, 404, headers);
  } catch (error) {
    const invalid =
      error instanceof SyntaxError ||
      (error instanceof Error &&
        ["Invalid input", "Payload too large"].includes(error.message));
    return json(
      {
        error: invalid
          ? "Invalid input."
          : "Integration temporarily unavailable.",
      },
      invalid ? 400 : 503,
      headers,
    );
  }
}
