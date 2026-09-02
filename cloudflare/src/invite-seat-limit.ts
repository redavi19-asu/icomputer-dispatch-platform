import { companyDriverCount, companyPlanLimits } from "./plan-limits";

interface InviteSeatEnv {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
}

const encoder = new TextEncoder();

export async function handleDriverInviteSeatLimit(
  request: Request,
  env: InviteSeatEnv
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/driver-invites/accept" || request.method !== "POST") return null;

  const cors = corsHeaders(request.headers.get("Origin") || "", env.ALLOWED_ORIGINS || "");

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const token = stringValue(body.token);
    const name = stringValue(body.name);
    const phone = stringValue(body.phone);
    if (!token) return null;

    const tokenHash = await sha256(token);
    const invite = await env.DB.prepare(`
      SELECT i.company_id, i.email, i.accepted_at, i.expires_at, COALESCE(s.plan, 'basic') AS plan
      FROM driver_invites i
      LEFT JOIN subscriptions s ON s.company_id = i.company_id
      WHERE i.token_hash = ?
      LIMIT 1
    `).bind(tokenHash).first<Record<string, string | null>>();

    if (!invite?.company_id || invite.accepted_at) return null;
    if (new Date(invite.expires_at || 0).getTime() <= Date.now()) return null;

    const email = invite.email || "";
    let existingDriver = await env.DB.prepare(`
      SELECT id FROM drivers
      WHERE company_id = ?
        AND lower(COALESCE(email, '')) = lower(?)
      LIMIT 1
    `).bind(invite.company_id, email).first<{ id: string }>();

    if (!existingDriver && phone) {
      existingDriver = await env.DB.prepare(`
        SELECT id FROM drivers
        WHERE company_id = ? AND user_id IS NULL AND phone = ?
        ORDER BY created_at ASC LIMIT 1
      `).bind(invite.company_id, phone).first<{ id: string }>();
    }

    if (!existingDriver && name) {
      existingDriver = await env.DB.prepare(`
        SELECT id FROM drivers
        WHERE company_id = ? AND user_id IS NULL AND lower(name) = lower(?)
        ORDER BY created_at ASC LIMIT 1
      `).bind(invite.company_id, name).first<{ id: string }>();
    }

    // Inviting a person who is already occupying one of the company's roster
    // seats is allowed because acceptance simply attaches login access to that seat.
    if (existingDriver) return null;

    const [limits, used] = await Promise.all([
      companyPlanLimits(env.DB, invite.company_id),
      companyDriverCount(env.DB, invite.company_id),
    ]);

    if (limits.maxDrivers !== null && used >= limits.maxDrivers) {
      return json({
        error: `${planLabel(limits.plan)} is already using all ${limits.maxDrivers} driver seats. Upgrade the company plan before activating another driver.`,
        code: "PLAN_DRIVER_LIMIT",
        plan: limits.plan,
        used,
        limit: limits.maxDrivers,
      }, 403, cors);
    }

    return null;
  } catch {
    // The normal invite handler remains responsible for malformed/invalid invites.
    return null;
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function planLabel(plan: string) {
  if (plan === "business") return "DispatchOS Business";
  if (plan === "custom") return "DispatchOS Custom";
  return "DispatchOS Basic";
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
