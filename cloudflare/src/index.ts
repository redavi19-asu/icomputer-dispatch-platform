interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  ADMIN_EMAIL?: string;
  TURNSTILE_SECRET_KEY?: string;
  PUBLIC_REGISTRATION_ENABLED?: string;
}

type RegisterBody = {
  name?: string;
  companyName?: string;
  email?: string;
  password?: string;
  plan?: string;
  turnstileToken?: string;
};

type LoginBody = {
  email?: string;
  password?: string;
  turnstileToken?: string;
};

type AdminCreateCompanyBody = {
  companyName?: string;
  ownerName?: string;
  ownerEmail?: string;
  temporaryPassword?: string;
  plan?: string;
  accessStatus?: string;
};

type AdminUpdateCompanyBody = {
  plan?: string;
  status?: string;
};

type TurnstileResult = {
  success: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
};

const encoder = new TextEncoder();
const SESSION_DAYS = 7;
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VALID_PLANS = new Set(["basic", "business", "custom"]);
const VALID_ACCESS_STATUSES = new Set(["pending", "active", "comped", "suspended", "canceled"]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS || "");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      if (url.pathname === "/health" && request.method === "GET") {
        try {
          await env.DB.prepare("SELECT COUNT(*) AS count FROM companies").first();

          return json({
            ok: true,
            service: "dispatchos-auth",
            database: "connected",
            turnstile: Boolean(clean(env.TURNSTILE_SECRET_KEY)),
            publicRegistration: clean(env.PUBLIC_REGISTRATION_ENABLED).toLowerCase() === "true",
            adminConsole: true,
            companyAnalytics: true,
            companyRemoval: true,
          }, 200, cors);
        } catch (error) {
          console.error("DISPATCHOS_HEALTH_DB_ERROR", error);

          return json({
            ok: false,
            service: "dispatchos-auth",
            database: "unavailable",
          }, 503, cors);
        }
      }

      if (url.pathname === "/auth/register" && request.method === "POST") {
        if (clean(env.PUBLIC_REGISTRATION_ENABLED).toLowerCase() !== "true") {
          return json({ error: "Public company onboarding is not open yet." }, 403, cors);
        }
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

      if (url.pathname === "/admin/companies" && request.method === "GET") {
        return await adminListCompanies(request, env, cors);
      }

      if (url.pathname === "/admin/companies" && request.method === "POST") {
        return await adminCreateCompany(request, env, cors);
      }

      if (url.pathname.startsWith("/admin/companies/") && url.pathname.endsWith("/analytics") && request.method === "GET") {
        const companyId = decodeURIComponent(
          url.pathname.slice("/admin/companies/".length, -"/analytics".length)
        );
        return await adminCompanyAnalytics(request, env, cors, companyId);
      }

      if (url.pathname.startsWith("/admin/companies/") && request.method === "PATCH") {
        const companyId = decodeURIComponent(url.pathname.slice("/admin/companies/".length));
        return await adminUpdateCompany(request, env, cors, companyId);
      }

      if (url.pathname.startsWith("/admin/companies/") && request.method === "DELETE") {
        const companyId = decodeURIComponent(url.pathname.slice("/admin/companies/".length));
        return await adminRemoveCompany(request, env, cors, companyId);
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
  const turnstileError = await turnstileGuard(request, env, body.turnstileToken, cors);
  if (turnstileError) return turnstileError;

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
    env.DB.prepare("INSERT INTO users (id, name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(userId, name, email, passwordHash, salt, role),
    env.DB.prepare("INSERT INTO companies (id, name, slug) VALUES (?, ?, ?)")
      .bind(companyId, companyName, slug),
    env.DB.prepare("INSERT INTO memberships (id, user_id, company_id, role) VALUES (?, ?, ?, ?)")
      .bind(membershipId, userId, companyId, "owner"),
    env.DB.prepare("INSERT INTO subscriptions (id, company_id, plan, status) VALUES (?, ?, ?, ?)")
      .bind(subscriptionId, companyId, plan, subscriptionStatus),
  ]);

  const session = await createSession(env.DB, userId);
  return json(await sessionPayload(env.DB, userId, session.token), 201, cors);
}

async function login(request: Request, env: Env, cors: HeadersInit) {
  const body = (await request.json()) as LoginBody;
  const turnstileError = await turnstileGuard(request, env, body.turnstileToken, cors);
  if (turnstileError) return turnstileError;

  const email = clean(body.email).toLowerCase();
  const password = body.password || "";

  const user = await env.DB.prepare(
    "SELECT id, email, password_hash, password_salt, role FROM users WHERE email = ?"
  ).bind(email).first<{ id: string; email: string; password_hash: string; password_salt: string; role: string }>();

  if (!user) {
    return json({ error: "Email or password is incorrect." }, 401, cors);
  }

  const suppliedHash = await hashPassword(password, user.password_salt);
  if (!constantTimeEqual(suppliedHash, user.password_hash)) {
    return json({ error: "Email or password is incorrect." }, 401, cors);
  }

  const configuredAdminEmail = clean(env.ADMIN_EMAIL).toLowerCase();
  if (configuredAdminEmail && email === configuredAdminEmail && user.role !== "admin") {
    await env.DB.prepare("UPDATE users SET role = 'admin', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(user.id)
      .run();
    user.role = "admin";
  }

  if (user.role !== "admin") {
    const access = await env.DB.prepare(`
      SELECT s.status
      FROM memberships m
      LEFT JOIN subscriptions s ON s.company_id = m.company_id
      WHERE m.user_id = ?
      ORDER BY m.created_at ASC
      LIMIT 1
    `).bind(user.id).first<{ status: string | null }>();

    if (access?.status === "suspended" || access?.status === "canceled") {
      return json({ error: "This company workspace is currently disabled. Contact DispatchOS support." }, 403, cors);
    }
  }

  const session = await createSession(env.DB, user.id);
  return json(await sessionPayload(env.DB, user.id, session.token), 200, cors);
}

async function adminListCompanies(request: Request, env: Env, cors: HeadersInit) {
  const adminId = await authenticatedAdminUserId(request, env.DB);
  if (!adminId) return json({ error: "Administrator access required." }, 403, cors);

  const result = await env.DB.prepare(`
    SELECT
      c.id,
      c.name,
      c.slug,
      c.created_at,
      s.plan,
      s.status,
      (SELECT COUNT(*) FROM memberships mc WHERE mc.company_id = c.id) AS member_count,
      (SELECT COUNT(*) FROM memberships mc WHERE mc.company_id = c.id AND mc.role = 'owner') AS owner_count,
      (SELECT COUNT(*) FROM memberships mc WHERE mc.company_id = c.id AND mc.role = 'admin') AS admin_count,
      (SELECT COUNT(*) FROM memberships mc WHERE mc.company_id = c.id AND mc.role = 'dispatcher') AS dispatcher_count,
      (SELECT COUNT(*) FROM memberships mc WHERE mc.company_id = c.id AND mc.role = 'driver') AS driver_member_count,
      (SELECT u.name
         FROM memberships mo
         JOIN users u ON u.id = mo.user_id
        WHERE mo.company_id = c.id
        ORDER BY CASE WHEN mo.role = 'owner' THEN 0 ELSE 1 END, mo.created_at ASC
        LIMIT 1) AS owner_name,
      (SELECT u.email
         FROM memberships mo
         JOIN users u ON u.id = mo.user_id
        WHERE mo.company_id = c.id
        ORDER BY CASE WHEN mo.role = 'owner' THEN 0 ELSE 1 END, mo.created_at ASC
        LIMIT 1) AS owner_email,
      EXISTS(
        SELECT 1
        FROM memberships ma
        JOIN users ua ON ua.id = ma.user_id
        WHERE ma.company_id = c.id AND ua.role = 'admin'
      ) AS protected_admin_company
    FROM companies c
    LEFT JOIN subscriptions s ON s.company_id = c.id
    ORDER BY datetime(c.created_at) DESC
  `).all();

  return json({ ok: true, companies: result.results || [] }, 200, cors);
}

async function adminCompanyAnalytics(request: Request, env: Env, cors: HeadersInit, companyId: string) {
  const adminId = await authenticatedAdminUserId(request, env.DB);
  if (!adminId) return json({ error: "Administrator access required." }, 403, cors);
  if (!companyId) return json({ error: "Company id is required." }, 400, cors);

  const company = await env.DB.prepare("SELECT id FROM companies WHERE id = ?").bind(companyId).first();
  if (!company) return json({ error: "Company not found." }, 404, cors);

  const hasDrivers = await tableExists(env.DB, "drivers");
  const hasJobs = await tableExists(env.DB, "jobs");
  const hasSettings = await tableExists(env.DB, "company_settings");

  let drivers = { total: 0, active: 0, offline: 0 };
  if (hasDrivers) {
    const row = await env.DB.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN lower(status) IN ('active','available','online','en route','on job') THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN lower(status) IN ('offline','inactive') THEN 1 ELSE 0 END) AS offline
      FROM drivers
      WHERE company_id = ?
    `).bind(companyId).first<Record<string, number | null>>();
    drivers = {
      total: Number(row?.total || 0),
      active: Number(row?.active || 0),
      offline: Number(row?.offline || 0),
    };
  }

  let jobs = {
    total: 0,
    active: 0,
    completed: 0,
    canceled: 0,
    today: 0,
    thisMonth: 0,
    completionRate: 0,
  };

  if (hasJobs) {
    const row = await env.DB.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN lower(status) NOT IN ('completed','cancelled','canceled') THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN lower(status) = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN lower(status) IN ('cancelled','canceled') THEN 1 ELSE 0 END) AS canceled,
        SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) AS today,
        SUM(CASE WHEN strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') THEN 1 ELSE 0 END) AS this_month
      FROM jobs
      WHERE company_id = ?
    `).bind(companyId).first<Record<string, number | null>>();

    const total = Number(row?.total || 0);
    const completed = Number(row?.completed || 0);
    jobs = {
      total,
      active: Number(row?.active || 0),
      completed,
      canceled: Number(row?.canceled || 0),
      today: Number(row?.today || 0),
      thisMonth: Number(row?.this_month || 0),
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  let settings = {
    dispatchMode: null as string | null,
    driverAcceptanceMode: null as string | null,
    bookingEnabled: null as boolean | null,
    driverAppEnabled: null as boolean | null,
    customerUpdatesEnabled: null as boolean | null,
  };

  if (hasSettings) {
    const row = await env.DB.prepare(`
      SELECT dispatch_mode, driver_acceptance_mode, booking_enabled, driver_app_enabled, customer_updates_enabled
      FROM company_settings
      WHERE company_id = ?
    `).bind(companyId).first<Record<string, string | number | null>>();

    if (row) {
      settings = {
        dispatchMode: String(row.dispatch_mode || ""),
        driverAcceptanceMode: String(row.driver_acceptance_mode || ""),
        bookingEnabled: Boolean(row.booking_enabled),
        driverAppEnabled: Boolean(row.driver_app_enabled),
        customerUpdatesEnabled: Boolean(row.customer_updates_enabled),
      };
    }
  }

  return json({
    ok: true,
    analytics: {
      companyId,
      operationalDataReady: hasDrivers && hasJobs,
      drivers,
      jobs,
      settings,
    },
  }, 200, cors);
}

async function adminCreateCompany(request: Request, env: Env, cors: HeadersInit) {
  const adminId = await authenticatedAdminUserId(request, env.DB);
  if (!adminId) return json({ error: "Administrator access required." }, 403, cors);

  const body = (await request.json()) as AdminCreateCompanyBody;
  const companyName = clean(body.companyName);
  const ownerName = clean(body.ownerName);
  const ownerEmail = clean(body.ownerEmail).toLowerCase();
  const temporaryPassword = body.temporaryPassword || "";
  const plan = VALID_PLANS.has(clean(body.plan)) ? clean(body.plan) : "basic";
  const accessStatus = body.accessStatus === "active" ? "active" : "comped";

  if (!companyName || !ownerName || !ownerEmail || !ownerEmail.includes("@")) {
    return json({ error: "Company name, owner name, and owner email are required." }, 400, cors);
  }
  if (temporaryPassword.length < 10) {
    return json({ error: "Temporary password must be at least 10 characters." }, 400, cors);
  }

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(ownerEmail).first();
  if (existing) return json({ error: "That owner email already has a DispatchOS account." }, 409, cors);

  const userId = crypto.randomUUID();
  const companyId = crypto.randomUUID();
  const salt = randomHex(16);
  const passwordHash = await hashPassword(temporaryPassword, salt);
  const slug = await uniqueCompanySlug(env.DB, companyName);

  await env.DB.batch([
    env.DB.prepare("INSERT INTO users (id, name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?, 'owner')")
      .bind(userId, ownerName, ownerEmail, passwordHash, salt),
    env.DB.prepare("INSERT INTO companies (id, name, slug) VALUES (?, ?, ?)")
      .bind(companyId, companyName, slug),
    env.DB.prepare("INSERT INTO memberships (id, user_id, company_id, role) VALUES (?, ?, ?, 'owner')")
      .bind(crypto.randomUUID(), userId, companyId),
    env.DB.prepare("INSERT INTO subscriptions (id, company_id, plan, status) VALUES (?, ?, ?, ?)")
      .bind(crypto.randomUUID(), companyId, plan, accessStatus),
  ]);

  return json({
    ok: true,
    company: { id: companyId, name: companyName, slug, plan, status: accessStatus },
    owner: { id: userId, name: ownerName, email: ownerEmail },
  }, 201, cors);
}

async function adminUpdateCompany(request: Request, env: Env, cors: HeadersInit, companyId: string) {
  const adminId = await authenticatedAdminUserId(request, env.DB);
  if (!adminId) return json({ error: "Administrator access required." }, 403, cors);
  if (!companyId) return json({ error: "Company id is required." }, 400, cors);

  const body = (await request.json()) as AdminUpdateCompanyBody;
  const plan = clean(body.plan);
  const status = clean(body.status);

  if (plan && !VALID_PLANS.has(plan)) return json({ error: "Invalid plan." }, 400, cors);
  if (status && !VALID_ACCESS_STATUSES.has(status)) return json({ error: "Invalid account status." }, 400, cors);
  if (!plan && !status) return json({ error: "Provide a plan or status change." }, 400, cors);

  const company = await env.DB.prepare("SELECT id FROM companies WHERE id = ?").bind(companyId).first();
  if (!company) return json({ error: "Company not found." }, 404, cors);

  if (status === "suspended" || status === "canceled") {
    const protectedCompany = await env.DB.prepare(`
      SELECT 1 AS found
      FROM memberships m
      JOIN users u ON u.id = m.user_id
      WHERE m.company_id = ? AND u.role = 'admin'
      LIMIT 1
    `).bind(companyId).first();
    if (protectedCompany) {
      return json({ error: "The platform administrator company cannot be suspended." }, 400, cors);
    }
  }

  const statements: D1PreparedStatement[] = [];
  if (plan) {
    statements.push(env.DB.prepare("UPDATE subscriptions SET plan = ?, updated_at = CURRENT_TIMESTAMP WHERE company_id = ?").bind(plan, companyId));
  }
  if (status) {
    statements.push(env.DB.prepare("UPDATE subscriptions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE company_id = ?").bind(status, companyId));
  }
  if (statements.length) await env.DB.batch(statements);

  if (status === "suspended" || status === "canceled") {
    await env.DB.prepare(`
      DELETE FROM sessions
      WHERE user_id IN (
        SELECT m.user_id
        FROM memberships m
        JOIN users u ON u.id = m.user_id
        WHERE m.company_id = ? AND u.role <> 'admin'
      )
    `).bind(companyId).run();
  }

  return json({ ok: true, companyId, ...(plan ? { plan } : {}), ...(status ? { status } : {}) }, 200, cors);
}

async function adminRemoveCompany(request: Request, env: Env, cors: HeadersInit, companyId: string) {
  const adminId = await authenticatedAdminUserId(request, env.DB);
  if (!adminId) return json({ error: "Administrator access required." }, 403, cors);
  if (!companyId) return json({ error: "Company id is required." }, 400, cors);

  const company = await env.DB.prepare("SELECT id, name FROM companies WHERE id = ?")
    .bind(companyId)
    .first<{ id: string; name: string }>();
  if (!company) return json({ error: "Company not found." }, 404, cors);

  const protectedCompany = await env.DB.prepare(`
    SELECT 1 AS found
    FROM memberships m
    JOIN users u ON u.id = m.user_id
    WHERE m.company_id = ? AND u.role = 'admin'
    LIMIT 1
  `).bind(companyId).first();

  if (protectedCompany) {
    return json({ error: "The platform administrator company cannot be removed." }, 400, cors);
  }

  const members = await env.DB.prepare("SELECT user_id FROM memberships WHERE company_id = ?")
    .bind(companyId)
    .all<{ user_id: string }>();
  const memberIds = (members.results || []).map((row) => row.user_id);

  await env.DB.prepare(`
    DELETE FROM sessions
    WHERE user_id IN (SELECT user_id FROM memberships WHERE company_id = ?)
  `).bind(companyId).run();

  const tenantTables = ["jobs", "driver_invites", "company_settings", "drivers", "customers"];
  for (const table of tenantTables) {
    if (await tableExists(env.DB, table)) {
      await env.DB.prepare(`DELETE FROM ${table} WHERE company_id = ?`).bind(companyId).run();
    }
  }

  await env.DB.prepare("DELETE FROM subscriptions WHERE company_id = ?").bind(companyId).run();
  await env.DB.prepare("DELETE FROM memberships WHERE company_id = ?").bind(companyId).run();
  await env.DB.prepare("DELETE FROM companies WHERE id = ?").bind(companyId).run();

  for (const userId of memberIds) {
    await env.DB.prepare(`
      DELETE FROM users
      WHERE id = ?
        AND role <> 'admin'
        AND NOT EXISTS (SELECT 1 FROM memberships WHERE user_id = ?)
    `).bind(userId, userId).run();
  }

  return json({ ok: true, companyId, removed: company.name }, 200, cors);
}

async function turnstileGuard(request: Request, env: Env, token: string | undefined, cors: HeadersInit) {
  const secret = clean(env.TURNSTILE_SECRET_KEY);
  if (!secret) return null;

  const responseToken = clean(token);
  if (!responseToken) {
    return json({ error: "Please complete the security check." }, 400, cors);
  }

  try {
    const verification = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        response: responseToken,
        remoteip: request.headers.get("CF-Connecting-IP") || undefined,
      }),
    });

    if (!verification.ok) {
      console.error("Turnstile Siteverify HTTP error", verification.status);
      return json({ error: "Security verification is temporarily unavailable. Please try again." }, 503, cors);
    }

    const result = (await verification.json()) as TurnstileResult;
    if (!result.success) {
      console.warn("Turnstile verification failed", result["error-codes"] || []);
      return json({ error: "Security verification failed. Please try again." }, 403, cors);
    }

    return null;
  } catch (error) {
    console.error("Turnstile verification error", error);
    return json({ error: "Security verification is temporarily unavailable. Please try again." }, 503, cors);
  }
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

async function authenticatedAdminUserId(request: Request, db: D1Database) {
  const userId = await authenticatedUserId(request, db);
  if (!userId) return null;
  const user = await db.prepare("SELECT role FROM users WHERE id = ?").bind(userId).first<{ role: string }>();
  return user?.role === "admin" ? userId : null;
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
    { name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations: 100000 },
    key,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function tableExists(db: D1Database, tableName: string) {
  const row = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1"
  ).bind(tableName).first<{ name: string }>();
  return Boolean(row?.name);
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
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
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
