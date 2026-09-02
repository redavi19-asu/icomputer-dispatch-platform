interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  ADMIN_EMAIL?: string;
}

type RegisterBody = {
  name?: string;
  companyName?: string;
  email?: string;
  password?: string;
  plan?: string;
};

type LoginBody = {
  email?: string;
  password?: string;
};

const encoder = new TextEncoder();
const SESSION_DAYS = 7;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      if (url.pathname === "/health" && request.method === "GET") {
        return json({ ok: true, service: "dispatchos-auth" }, 200, cors);
      }

      if (url.pathname === "/auth/register" && request.method === "POST") {
        return await register(request, env, cors);
      }

      if (url.pathname === "/auth/login" && request.method === "POST") {
        return await login(request, env, cors);
      }

      if (url.pathname === "/auth/me" && request.method === "GET") {
        return await me(request, env, cors);
      }

      if (url.pathname === "/auth/logout" && request.method === "POST") {
        return await logout(request, env, cors);
      }

      return json({ error: "Not found." }, 404, cors);
    } catch (error) {
      console.error(error);
      return json({ error: "DispatchOS account service error." }, 500, cors);
    }
  },
};

async function register(request: Request, env: Env, cors: HeadersInit) {
  const body = (await request.json()) as RegisterBody;
  const name = clean(body.name);
  const companyName = clean(body.companyName);
  const email = clean(body.email).toLowerCase();
  const password = body.password || "";
  const plan = body.plan === "business" ? "business" : "basic";

  if (!name || !companyName || !email || !email.includes("@")) {
    return json({ error: "Name, company, and a valid email are required." }, 400, cors);
  }
  if (password.length < 10) {
    return json({ error: "Password must be at least 10 characters." }, 400, cors);
  }

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) {
    return json({ error: "An account already exists for that email." }, 409, cors);
  }

  const userId = crypto.randomUUID();
  const companyId = crypto.randomUUID();
  const membershipId = crypto.randomUUID();
  const subscriptionId = crypto.randomUUID();
  const salt = randomHex(16);
  const passwordHash = await hashPassword(password, salt);
  const slug = await uniqueCompanySlug(env.DB, companyName);
  const adminEmail = clean(env.ADMIN_EMAIL).toLowerCase();
  const role = adminEmail && email === adminEmail ? "admin" : "owner";
  const subscriptionStatus = role === "admin" ? "active" : "pending";

  await env.DB.batch([
    env.DB.prepare("INSERT INTO users (id, name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?, ?)").bind(userId, name, email, passwordHash, salt, role),
    env.DB.prepare("INSERT INTO companies (id, name, slug) VALUES (?, ?, ?)").bind(companyId, companyName, slug),
    env.DB.prepare("INSERT INTO memberships (id, user_id, company_id, role) VALUES (?, ?, ?, ?)").bind(membershipId, userId, companyId, "owner"),
    env.DB.prepare("INSERT INTO subscriptions (id, company_id, plan, status) VALUES (?, ?, ?, ?)").bind(subscriptionId, companyId, plan, subscriptionStatus),
  ]);

  const session = await createSession(env.DB, userId);
  return json(await sessionPayload(env.DB, userId, session.token), 201, cors);
}

async function login(request: Request, env: Env, cors: HeadersInit) {
  const body = (await request.json()) as LoginBody;
  const email = clean(body.email).toLowerCase();
  const password = body.password || "";

  const user = await env.DB.prepare(
    "SELECT id, password_hash, password_salt FROM users WHERE email = ?"
  ).bind(email).first<{ id: string; password_hash: string; password_salt: string }>();

  if (!user) {
    return json({ error: "Email or password is incorrect." }, 401, cors);
  }

  const suppliedHash = await hashPassword(password, user.password_salt);
  if (!constantTimeEqual(suppliedHash, user.password_hash)) {
    return json({ error: "Email or password is incorrect." }, 401, cors);
  }

  const session = await createSession(env.DB, user.id);
  return json(await sessionPayload(env.DB, user.id, session.token), 200, cors);
}

async function me(request: Request, env: Env, cors: HeadersInit) {
  const userId = await authenticatedUserId(request, env.DB);
  if (!userId) return json({ error: "Unauthorized." }, 401, cors);
  return json(await sessionPayload(env.DB, userId), 200, cors);
}

async function logout(request: Request, env: Env, cors: HeadersInit) {
  const token = bearerToken(request);
  if (token) {
    const tokenHash = await sha256(token);
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
  }
  return json({ ok: true }, 200, cors);
}

async function authenticatedUserId(request: Request, db: D1Database) {
  const token = bearerToken(request);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await db.prepare(
    "SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > datetime('now')"
  ).bind(tokenHash).first<{ user_id: string }>();
  return row?.user_id || null;
}

async function sessionPayload(db: D1Database, userId: string, token?: string) {
  const row = await db.prepare(`
    SELECT
      u.id AS user_id,
      u.name AS user_name,
      u.email AS user_email,
      u.role AS user_role,
      c.id AS company_id,
      c.name AS company_name,
      c.slug AS company_slug,
      s.plan AS subscription_plan,
      s.status AS subscription_status
    FROM users u
    JOIN memberships m ON m.user_id = u.id
    JOIN companies c ON c.id = m.company_id
    LEFT JOIN subscriptions s ON s.company_id = c.id
    WHERE u.id = ?
    ORDER BY m.created_at ASC
    LIMIT 1
  `).bind(userId).first<Record<string, string | null>>();

  if (!row) throw new Error("Account membership not found.");

  return {
    ...(token ? { token } : {}),
    user: {
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      role: row.user_role,
    },
    company: {
      id: row.company_id,
      name: row.company_name,
      slug: row.company_slug,
    },
    subscription: row.subscription_plan ? {
      plan: row.subscription_plan,
      status: row.subscription_status,
    } : null,
  };
}

async function createSession(db: D1Database, userId: string) {
  const token = randomHex(32);
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await db.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)")
    .bind(crypto.randomUUID(), userId, tokenHash, expiresAt)
    .run();
  return { token, expiresAt };
}

async function hashPassword(password: string, saltHex: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations: 210000 },
    key,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function bearerToken(request: Request) {
  const header = request.headers.get("Authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function clean(value?: string) {
  return (value || "").trim();
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "company";
}

async function uniqueCompanySlug(db: D1Database, name: string) {
  const base = slugify(name);
  let slug = base;
  for (let i = 0; i < 20; i += 1) {
    const exists = await db.prepare("SELECT id FROM companies WHERE slug = ?").bind(slug).first();
    if (!exists) return slug;
    slug = `${base}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function randomHex(bytes: number) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return bytesToHex(data);
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function corsHeaders(origin: string, allowedOrigins: string) {
  const allowed = allowedOrigins.split(",").map((item) => item.trim()).filter(Boolean);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(data: unknown, status = 200, extraHeaders: HeadersInit = {}) {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { status, headers });
}
