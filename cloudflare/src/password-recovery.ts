interface PasswordRecoveryEnv {
  DB: D1Database;
  ALLOWED_ORIGINS?: string;
  PUBLIC_APP_ORIGIN?: string;
  RESEND_API_KEY?: string;
  ICA_AUTH_FROM_EMAIL?: string;
}

const encoder = new TextEncoder();

function clean(value?: string) {
  return (value || "").trim();
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomHex(bytes: number) {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
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

function appOrigin(env: PasswordRecoveryEnv) {
  const configured = clean(env.PUBLIC_APP_ORIGIN);
  if (configured) return configured.replace(/\/$/, "");
  const origins = clean(env.ALLOWED_ORIGINS).split(",").map((value) => value.trim()).filter(Boolean);
  const preferred = origins.find((value) => value.startsWith("https://")) || origins[0] || "";
  return preferred === "https://redavi19-asu.github.io"
    ? preferred + "/icomputer-dispatch-platform"
    : preferred.replace(/\/$/, "");
}

function emailConfigured(env: PasswordRecoveryEnv) {
  return Boolean(clean(env.RESEND_API_KEY) && clean(env.ICA_AUTH_FROM_EMAIL));
}

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  const output = new Headers(headers);
  output.set("Content-Type", "application/json; charset=utf-8");
  output.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { status, headers: output });
}

async function ensureTable(db: D1Database) {
  await db.prepare(
    "CREATE TABLE IF NOT EXISTS password_reset_tokens (" +
    "token_hash TEXT PRIMARY KEY," +
    "user_id TEXT NOT NULL," +
    "expires_at TEXT NOT NULL," +
    "used_at TEXT," +
    "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP," +
    "FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)"
  ).run();
  await db.prepare(
    "CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id, expires_at)"
  ).run();
}

async function sendResetEmail(env: PasswordRecoveryEnv, to: string, name: string, resetUrl: string) {
  if (!emailConfigured(env)) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + clean(env.RESEND_API_KEY),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: clean(env.ICA_AUTH_FROM_EMAIL),
      to: [to],
      subject: "Reset your Urban Carrier OS password",
      text:
        "Hello " + name + ",\n\n" +
        "Reset your Urban Carrier OS password:\n\n" +
        resetUrl + "\n\n" +
        "This link expires in 1 hour. If you did not request it, ignore this email.",
    }),
  });
  return response.ok;
}

async function requestReset(request: Request, env: PasswordRecoveryEnv, cors: HeadersInit) {
  if (!emailConfigured(env)) {
    return json({ error: "Password recovery email is not configured yet." }, 503, cors);
  }

  const body = await request.json().catch(() => ({})) as { email?: string };
  const email = clean(body.email).toLowerCase();
  const generic = { ok: true, message: "If that account exists, a password reset link will be sent." };
  if (!email || !email.includes("@")) return json(generic, 200, cors);

  const user = await env.DB.prepare("SELECT id,email,name,role FROM users WHERE email=? LIMIT 1")
    .bind(email)
    .first<{ id: string; email: string; name: string; role: string }>();

  // Platform admin authentication remains tied to ICA master credentials.
  if (!user || user.role === "admin") return json(generic, 200, cors);

  const rawToken = randomHex(32);
  const tokenHash = await sha256(rawToken);

  await env.DB.batch([
    env.DB.prepare(
      "UPDATE password_reset_tokens SET used_at=COALESCE(used_at,CURRENT_TIMESTAMP) " +
      "WHERE user_id=? AND used_at IS NULL"
    ).bind(user.id),
    env.DB.prepare(
      "INSERT INTO password_reset_tokens (token_hash,user_id,expires_at) " +
      "VALUES (?,?,datetime('now','+1 hour'))"
    ).bind(tokenHash, user.id),
  ]);

  const origin = appOrigin(env);
  if (origin) {
    await sendResetEmail(
      env,
      user.email,
      user.name,
      origin + "/auth?reset_token=" + encodeURIComponent(rawToken)
    );
  }

  return json(generic, 200, cors);
}

async function confirmReset(request: Request, env: PasswordRecoveryEnv, cors: HeadersInit) {
  const body = await request.json().catch(() => ({})) as { token?: string; password?: string };
  const token = clean(body.token);
  const password = String(body.password || "");
  if (!token) return json({ error: "Password reset token is required." }, 400, cors);
  if (password.length < 10) return json({ error: "Password must be at least 10 characters." }, 400, cors);

  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    "SELECT r.user_id,u.role FROM password_reset_tokens r JOIN users u ON u.id=r.user_id " +
    "WHERE r.token_hash=? AND r.used_at IS NULL AND r.expires_at>CURRENT_TIMESTAMP LIMIT 1"
  ).bind(tokenHash).first<{ user_id: string; role: string }>();

  if (!row || row.role === "admin") {
    return json({ error: "This password reset link is invalid, expired, or already used." }, 400, cors);
  }

  const salt = randomHex(16);
  const passwordHash = await hashPassword(password, salt);

  await env.DB.batch([
    env.DB.prepare(
      "UPDATE users SET password_hash=?,password_salt=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(passwordHash, salt, row.user_id),
    env.DB.prepare(
      "UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE token_hash=?"
    ).bind(tokenHash),
    env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(row.user_id),
  ]);

  return json({ ok: true, message: "Password updated. Sign in with your new password." }, 200, cors);
}

export async function handlePasswordRecovery(
  request: Request,
  env: PasswordRecoveryEnv,
  cors: HeadersInit
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/auth/password-reset/")) return null;

  await ensureTable(env.DB);

  if (url.pathname === "/auth/password-reset/request" && request.method === "POST") {
    return requestReset(request, env, cors);
  }
  if (url.pathname === "/auth/password-reset/confirm" && request.method === "POST") {
    return confirmReset(request, env, cors);
  }
  if (url.pathname === "/auth/password-reset/status" && request.method === "GET") {
    return json({ configured: emailConfigured(env) }, 200, cors);
  }
  return json({ error: "Method not allowed." }, 405, cors);
}
