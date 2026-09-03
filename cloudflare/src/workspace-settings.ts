interface WorkspaceSettingsEnv {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
}

type TenantContext = {
  userId: string;
  userRole: string;
  membershipRole: string;
  companyId: string;
  companySlug: string;
};

const encoder = new TextEncoder();
const MANAGER_ROLES = new Set(["admin", "owner", "dispatcher"]);

export async function handleWorkspaceSettingsRequest(
  request: Request,
  env: WorkspaceSettingsEnv
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/workspace-settings") return null;

  const cors = corsHeaders(
    request.headers.get("Origin") || "",
    env.ALLOWED_ORIGINS || ""
  );

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  await ensureTable(env.DB);
  const tenant = await resolveTenant(request, env.DB);
  if (!tenant) return json({ error: "Unauthorized." }, 401, cors);

  if (request.method === "GET") {
    const row = await env.DB.prepare(
      "SELECT settings_json, updated_at FROM workspace_settings WHERE company_id = ? LIMIT 1"
    )
      .bind(tenant.companyId)
      .first<{ settings_json: string; updated_at: string }>();

    if (!row?.settings_json) {
      return json(
        {
          success: true,
          companySlug: tenant.companySlug,
          settings: null,
          updatedAt: null,
        },
        200,
        cors
      );
    }

    let settings: Record<string, unknown> | null = null;
    try {
      const parsed = JSON.parse(row.settings_json);
      settings = parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      settings = null;
    }

    return json(
      {
        success: true,
        companySlug: tenant.companySlug,
        settings,
        updatedAt: row.updated_at,
      },
      200,
      cors
    );
  }

  if (request.method === "PUT" || request.method === "PATCH") {
    if (!canManage(tenant)) {
      return json({ error: "Company manager access required." }, 403, cors);
    }

    const body = await request.json<Record<string, unknown>>();
    const supplied = body.settings;
    if (!supplied || typeof supplied !== "object" || Array.isArray(supplied)) {
      return json({ error: "A settings object is required." }, 400, cors);
    }

    const settings = {
      ...(supplied as Record<string, unknown>),
      companySlug: tenant.companySlug,
    };

    const serialized = JSON.stringify(settings);
    if (serialized.length > 100_000) {
      return json({ error: "Workspace settings payload is too large." }, 413, cors);
    }

    const now = new Date().toISOString();
    await env.DB.prepare(`
      INSERT INTO workspace_settings (company_id, settings_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(company_id) DO UPDATE SET
        settings_json = excluded.settings_json,
        updated_at = excluded.updated_at
    `)
      .bind(tenant.companyId, serialized, now)
      .run();

    return json(
      {
        success: true,
        companySlug: tenant.companySlug,
        settings,
        updatedAt: now,
      },
      200,
      cors
    );
  }

  return json({ error: "Method not allowed." }, 405, cors);
}

async function ensureTable(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS workspace_settings (
      company_id TEXT PRIMARY KEY,
      settings_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

async function resolveTenant(
  request: Request,
  db: D1Database
): Promise<TenantContext | null> {
  const token = bearerToken(request);
  if (!token) return null;

  const tokenHash = await sha256(token);
  const row = await db.prepare(`
    SELECT
      s.user_id AS user_id,
      u.role AS user_role,
      m.role AS membership_role,
      c.id AS company_id,
      c.slug AS company_slug
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    JOIN memberships m ON m.user_id = u.id
    JOIN companies c ON c.id = m.company_id
    WHERE s.token_hash = ?
      AND s.expires_at > datetime('now')
    ORDER BY m.created_at ASC
    LIMIT 1
  `)
    .bind(tokenHash)
    .first<Record<string, string | null>>();

  if (!row?.user_id || !row.company_id || !row.company_slug) return null;

  return {
    userId: row.user_id,
    userRole: row.user_role || "",
    membershipRole: row.membership_role || "",
    companyId: row.company_id,
    companySlug: row.company_slug,
  };
}

function canManage(tenant: TenantContext) {
  const role = tenant.userRole === "admin" ? "admin" : tenant.membershipRole;
  return MANAGER_ROLES.has(role);
}

function bearerToken(request: Request) {
  const auth = request.headers.get("Authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function corsHeaders(origin: string, allowedOrigins: string): HeadersInit {
  const allowed = allowedOrigins
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const allowOrigin = allowed.includes(origin)
    ? origin
    : allowed.includes("*")
    ? "*"
    : allowed[0] || "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, PUT, PATCH, OPTIONS",
    Vary: "Origin",
  };
}

function json(data: unknown, status: number, cors: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...cors,
    },
  });
}
