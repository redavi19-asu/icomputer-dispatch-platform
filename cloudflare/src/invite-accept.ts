interface InviteEnv {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
}

const encoder = new TextEncoder();
const OPERATING_STATUSES = new Set(["active", "trialing", "grace_period", "comped"]);

export async function handleDriverInviteAcceptance(
  request: Request,
  env: InviteEnv
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/driver-invites/accept") return null;

  const cors = corsHeaders(request.headers.get("Origin") || "", env.ALLOWED_ORIGINS || "");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, cors);

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const token = stringValue(body.token);
    const name = stringValue(body.name);
    const phone = stringValue(body.phone);
    const password = typeof body.password === "string" ? body.password : "";

    if (!token || !name) return json({ error: "Invite token and driver name are required." }, 400, cors);
    if (password.length < 10) return json({ error: "Password must be at least 10 characters." }, 400, cors);

    const tokenHash = await sha256(token);
    const invite = await env.DB.prepare(`
      SELECT
        i.id,
        i.company_id,
        i.email,
        i.expires_at,
        i.accepted_at,
        c.name AS company_name,
        c.slug AS company_slug,
        sub.plan AS subscription_plan,
        COALESCE(sub.status, 'pending') AS subscription_status
      FROM driver_invites i
      JOIN companies c ON c.id = i.company_id
      LEFT JOIN subscriptions sub ON sub.company_id = c.id
      WHERE i.token_hash = ?
      LIMIT 1
    `).bind(tokenHash).first<Record<string, string | null>>();

    if (!invite || invite.accepted_at) {
      return json({ error: "This driver invite is invalid or has already been used." }, 400, cors);
    }
    if (new Date(invite.expires_at || 0).getTime() <= Date.now()) {
      return json({ error: "This driver invite has expired." }, 410, cors);
    }
    if (!OPERATING_STATUSES.has((invite.subscription_status || "pending").toLowerCase())) {
      return json({ error: "This company is not currently accepting driver access." }, 403, cors);
    }

    const email = invite.email || "";
    const existingUser = await env.DB.prepare("SELECT id FROM users WHERE lower(email) = lower(?) LIMIT 1")
      .bind(email)
      .first<{ id: string }>();
    if (existingUser) {
      return json({ error: "That email already has a DispatchOS account. Sign in instead or ask the company to use another driver email." }, 409, cors);
    }

    let driver = await env.DB.prepare(`
      SELECT id
      FROM drivers
      WHERE company_id = ? AND lower(COALESCE(email, '')) = lower(?)
      LIMIT 1
    `).bind(invite.company_id, email).first<{ id: string }>();

    if (!driver && phone) {
      driver = await env.DB.prepare(`
        SELECT id
        FROM drivers
        WHERE company_id = ?
          AND user_id IS NULL
          AND phone = ?
        ORDER BY created_at ASC
        LIMIT 1
      `).bind(invite.company_id, phone).first<{ id: string }>();
    }

    if (!driver) {
      driver = await env.DB.prepare(`
        SELECT id
        FROM drivers
        WHERE company_id = ?
          AND user_id IS NULL
          AND lower(name) = lower(?)
        ORDER BY created_at ASC
        LIMIT 1
      `).bind(invite.company_id, name).first<{ id: string }>();
    }

    const userId = crypto.randomUUID();
    const driverId = driver?.id || crypto.randomUUID();
    const salt = randomHex(16);
    const passwordHash = await hashPassword(password, salt);
    const now = new Date().toISOString();

    const statements: D1PreparedStatement[] = [
      env.DB.prepare("INSERT INTO users (id, name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?, 'driver')")
        .bind(userId, name, email, passwordHash, salt),
      env.DB.prepare("INSERT INTO memberships (id, user_id, company_id, role) VALUES (?, ?, ?, 'driver')")
        .bind(crypto.randomUUID(), userId, invite.company_id),
    ];

    if (driver) {
      statements.push(
        env.DB.prepare(`
          UPDATE drivers
          SET user_id = ?, name = ?, email = ?, phone = ?, status = 'available', updated_at = ?
          WHERE id = ? AND company_id = ? AND user_id IS NULL
        `).bind(userId, name, email, phone || null, now, driverId, invite.company_id)
      );
    } else {
      statements.push(
        env.DB.prepare(`
          INSERT INTO drivers (id, company_id, user_id, name, email, phone, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 'available', ?, ?)
        `).bind(driverId, invite.company_id, userId, name, email, phone || null, now, now)
      );
    }

    statements.push(
      env.DB.prepare("UPDATE driver_invites SET accepted_at = ? WHERE id = ? AND company_id = ? AND accepted_at IS NULL")
        .bind(now, invite.id, invite.company_id)
    );

    await env.DB.batch(statements);

    const session = await createSession(env.DB, userId);
    return json({
      success: true,
      token: session.token,
      user: { id: userId, name, email, role: "driver" },
      company: {
        id: invite.company_id,
        name: invite.company_name,
        slug: invite.company_slug,
      },
      driver: { id: driverId },
      subscription: {
        plan: invite.subscription_plan || "company",
        status: invite.subscription_status,
      },
    }, 201, cors);
  } catch (error) {
    console.error("Driver invite acceptance error", error);
    return json({ error: "Unable to activate driver access." }, 500, cors);
  }
}

async function createSession(db: D1Database, userId: string) {
  const token = randomHex(32);
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
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

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
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
