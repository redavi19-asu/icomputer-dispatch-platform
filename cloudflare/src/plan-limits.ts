interface PlanEnv {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
}

export type DispatchPlanLimits = {
  plan: string;
  maxDrivers: number | null;
  maxDispatcherSeats: number | null;
};

type PlanAccount = {
  userId: string;
  userRole: string;
  companyId: string;
  companySlug: string;
  plan: string;
};

const encoder = new TextEncoder();

const PLAN_LIMITS: Record<string, Omit<DispatchPlanLimits, "plan">> = {
  basic: { maxDrivers: 10, maxDispatcherSeats: 1 },
  business: { maxDrivers: 30, maxDispatcherSeats: 5 },
  // Custom is reserved for platform-admin negotiated accounts.
  custom: { maxDrivers: null, maxDispatcherSeats: null },
};

export function limitsForPlan(planValue: string | null | undefined): DispatchPlanLimits {
  const plan = (planValue || "basic").trim().toLowerCase();
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.basic;
  return { plan, ...limits };
}

export async function companyPlanLimits(db: D1Database, companyId: string) {
  const subscription = await db.prepare(
    "SELECT plan FROM subscriptions WHERE company_id = ? LIMIT 1"
  ).bind(companyId).first<{ plan: string | null }>();
  return limitsForPlan(subscription?.plan || "basic");
}

export async function companyDriverCount(db: D1Database, companyId: string) {
  const row = await db.prepare(
    "SELECT COUNT(*) AS total FROM drivers WHERE company_id = ?"
  ).bind(companyId).first<{ total: number | string | null }>();
  return Number(row?.total || 0);
}

export async function companyDispatcherSeatCount(db: D1Database, companyId: string) {
  const row = await db.prepare(`
    SELECT COUNT(*) AS total
    FROM memberships
    WHERE company_id = ?
      AND role IN ('owner', 'dispatcher')
  `).bind(companyId).first<{ total: number | string | null }>();
  return Number(row?.total || 0);
}

export async function companyPendingDriverInviteCount(db: D1Database, companyId: string) {
  const row = await db.prepare(`
    SELECT COUNT(*) AS total
    FROM driver_invites
    WHERE company_id = ?
      AND accepted_at IS NULL
      AND datetime(expires_at) > datetime('now')
  `).bind(companyId).first<{ total: number | string | null }>();
  return Number(row?.total || 0);
}

export async function ensureDriverSeatAvailable(
  db: D1Database,
  companyId: string
): Promise<{ ok: true; limits: DispatchPlanLimits; used: number } | { ok: false; limits: DispatchPlanLimits; used: number }> {
  const [limits, used] = await Promise.all([
    companyPlanLimits(db, companyId),
    companyDriverCount(db, companyId),
  ]);
  if (limits.maxDrivers === null) return { ok: true, limits, used };
  return { ok: used < limits.maxDrivers, limits, used };
}

export async function ensureDispatcherSeatAvailable(
  db: D1Database,
  companyId: string
): Promise<{ ok: true; limits: DispatchPlanLimits; used: number } | { ok: false; limits: DispatchPlanLimits; used: number }> {
  const [limits, used] = await Promise.all([
    companyPlanLimits(db, companyId),
    companyDispatcherSeatCount(db, companyId),
  ]);
  if (limits.maxDispatcherSeats === null) return { ok: true, limits, used };
  return { ok: used < limits.maxDispatcherSeats, limits, used };
}

export async function handlePlanLimitRequest(
  request: Request,
  env: PlanEnv
): Promise<Response | null> {
  const url = new URL(request.url);
  const isUsage = url.pathname === "/api/plan-usage";
  const isDriverCreate = url.pathname === "/api/drivers" && request.method === "POST";
  const isInviteCreate = url.pathname === "/api/driver-invites" && request.method === "POST";
  const isAdminPlanChange =
    request.method === "PATCH" && /^\/admin\/companies\/[^/]+$/.test(url.pathname);

  if (!isUsage && !isDriverCreate && !isInviteCreate && !isAdminPlanChange) return null;

  const cors = corsHeaders(request.headers.get("Origin") || "", env.ALLOWED_ORIGINS || "");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const account = await resolvePlanAccount(request, env.DB);
  if (!account) return json({ error: "Unauthorized." }, 401, cors);

  if (isAdminPlanChange) {
    // The normal admin handler still owns authentication/errors. This guard only
    // blocks a plan change that would leave the company over its paid limits.
    if (account.userRole !== "admin") return null;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const requestedPlan = typeof body.plan === "string" ? body.plan.trim().toLowerCase() : "";
    if (!requestedPlan || !PLAN_LIMITS[requestedPlan]) return null;

    const targetCompanyId = decodeURIComponent(url.pathname.slice("/admin/companies/".length));
    if (!targetCompanyId) return null;

    const targetLimits = limitsForPlan(requestedPlan);
    const [drivers, dispatcherSeats] = await Promise.all([
      companyDriverCount(env.DB, targetCompanyId),
      companyDispatcherSeatCount(env.DB, targetCompanyId),
    ]);

    const driverOverflow =
      targetLimits.maxDrivers !== null && drivers > targetLimits.maxDrivers;
    const dispatcherOverflow =
      targetLimits.maxDispatcherSeats !== null && dispatcherSeats > targetLimits.maxDispatcherSeats;

    if (driverOverflow || dispatcherOverflow) {
      return json({
        error: `This company cannot switch to ${planLabel(targetLimits.plan)} until its usage is within the plan limits.`,
        code: "PLAN_DOWNGRADE_USAGE_EXCEEDS_LIMIT",
        requestedPlan: targetLimits.plan,
        usage: { drivers, dispatcherSeats },
        limits: {
          drivers: targetLimits.maxDrivers,
          dispatcherSeats: targetLimits.maxDispatcherSeats,
        },
      }, 409, cors);
    }

    return null;
  }

  const limits = limitsForPlan(account.plan);

  if (isUsage) {
    if (request.method !== "GET") return json({ error: "Method not allowed." }, 405, cors);
    const [drivers, dispatcherSeats, pendingDriverInvites] = await Promise.all([
      companyDriverCount(env.DB, account.companyId),
      companyDispatcherSeatCount(env.DB, account.companyId),
      companyPendingDriverInviteCount(env.DB, account.companyId),
    ]);

    return json({
      success: true,
      company: { id: account.companyId, slug: account.companySlug },
      plan: limits.plan,
      limits: {
        drivers: limits.maxDrivers,
        dispatcherSeats: limits.maxDispatcherSeats,
      },
      usage: {
        drivers,
        dispatcherSeats,
        pendingDriverInvites,
      },
    }, 200, cors);
  }

  if (isDriverCreate) {
    const used = await companyDriverCount(env.DB, account.companyId);
    if (limits.maxDrivers !== null && used >= limits.maxDrivers) {
      return json({
        error: `${planLabel(limits.plan)} allows up to ${limits.maxDrivers} driver seats. Upgrade the company plan before adding another driver.`,
        code: "PLAN_DRIVER_LIMIT",
        plan: limits.plan,
        used,
        limit: limits.maxDrivers,
      }, 403, cors);
    }
  }

  if (isInviteCreate) {
    const pending = await companyPendingDriverInviteCount(env.DB, account.companyId);
    if (limits.maxDrivers !== null && pending >= limits.maxDrivers) {
      return json({
        error: `${planLabel(limits.plan)} allows up to ${limits.maxDrivers} active driver invitations at a time. Revoke or use an existing invite before creating another.`,
        code: "PLAN_DRIVER_INVITE_LIMIT",
        plan: limits.plan,
        used: pending,
        limit: limits.maxDrivers,
      }, 403, cors);
    }
  }

  return null;
}

async function resolvePlanAccount(request: Request, db: D1Database): Promise<PlanAccount | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const tokenHash = await sha256(token);

  const row = await db.prepare(`
    SELECT
      s.user_id AS user_id,
      u.role AS user_role,
      c.id AS company_id,
      c.slug AS company_slug,
      COALESCE(sub.plan, 'basic') AS subscription_plan
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    JOIN memberships m ON m.user_id = u.id
    JOIN companies c ON c.id = m.company_id
    LEFT JOIN subscriptions sub ON sub.company_id = c.id
    WHERE s.token_hash = ?
      AND s.expires_at > datetime('now')
    ORDER BY m.created_at ASC
    LIMIT 1
  `).bind(tokenHash).first<Record<string, string | null>>();

  if (!row?.user_id || !row.company_id || !row.company_slug) return null;
  return {
    userId: row.user_id,
    userRole: row.user_role || "",
    companyId: row.company_id,
    companySlug: row.company_slug,
    plan: row.subscription_plan || "basic",
  };
}

function planLabel(plan: string) {
  if (plan === "business") return "DispatchOS Business";
  if (plan === "custom") return "DispatchOS Custom";
  return "DispatchOS Basic";
}

function bearerToken(request: Request) {
  const header = request.headers.get("Authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
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
