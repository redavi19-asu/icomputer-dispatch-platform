interface SocialAuthEnv {
  DB: D1Database;
  ALLOWED_ORIGINS?: string;
  ADMIN_EMAIL?: string;
  PUBLIC_APP_ORIGIN?: string;
  SOCIAL_GOOGLE_CLIENT_ID?: string;
  SOCIAL_GOOGLE_CLIENT_SECRET?: string;
  SOCIAL_APPLE_CLIENT_ID?: string;
  SOCIAL_APPLE_CLIENT_SECRET?: string;
  SOCIAL_MICROSOFT_CLIENT_ID?: string;
  SOCIAL_MICROSOFT_CLIENT_SECRET?: string;
}

type SocialProvider = "google" | "apple" | "microsoft";

const encoder = new TextEncoder();
const SESSION_DAYS = 7;

const PROVIDERS = {
  google: {
    label: "Google",
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    jwks: "https://www.googleapis.com/oauth2/v3/certs",
    scope: "openid email profile",
  },
  apple: {
    label: "Apple",
    authorize: "https://appleid.apple.com/auth/authorize",
    token: "https://appleid.apple.com/auth/token",
    jwks: "https://appleid.apple.com/auth/keys",
    scope: "name email",
  },
  microsoft: {
    label: "Microsoft",
    authorize: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    jwks: "https://login.microsoftonline.com/common/discovery/v2.0/keys",
    scope: "openid email profile",
  },
} as const;

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

function b64url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function decodeB64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJwtPart(value: string) {
  return JSON.parse(new TextDecoder().decode(decodeB64Url(value))) as Record<string, unknown>;
}

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  const output = new Headers(headers);
  output.set("Content-Type", "application/json; charset=utf-8");
  output.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { status, headers: output });
}

function appOrigin(env: SocialAuthEnv) {
  const configured = clean(env.PUBLIC_APP_ORIGIN);
  if (configured) return configured.replace(/\/$/, "");
  const origins = clean(env.ALLOWED_ORIGINS).split(",").map((value) => value.trim()).filter(Boolean);
  const preferred = origins.find((value) => value.startsWith("https://")) || origins[0] || "";
  return preferred === "https://redavi19-asu.github.io"
    ? preferred + "/icomputer-dispatch-platform"
    : preferred.replace(/\/$/, "");
}

function providerConfig(env: SocialAuthEnv, provider: SocialProvider) {
  const upper = provider.toUpperCase();
  const source = env as unknown as Record<string, unknown>;
  const clientId = clean(String(source["SOCIAL_" + upper + "_CLIENT_ID"] || ""));
  const clientSecret = clean(String(source["SOCIAL_" + upper + "_CLIENT_SECRET"] || ""));
  return { ...PROVIDERS[provider], provider, clientId, clientSecret, ready: Boolean(clientId && clientSecret) };
}

async function ensureTables(db: D1Database) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS social_auth_states (state_hash TEXT PRIMARY KEY,provider TEXT NOT NULL,purpose TEXT NOT NULL,code_verifier TEXT NOT NULL,nonce TEXT NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS social_identities (provider TEXT NOT NULL,provider_subject TEXT NOT NULL,user_id TEXT NOT NULL,email TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(provider,provider_subject),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)"),
    db.prepare("CREATE TABLE IF NOT EXISTS social_login_tickets (ticket_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,provider TEXT NOT NULL,expires_at TEXT NOT NULL,used_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)"),
    db.prepare("CREATE TABLE IF NOT EXISTS social_onboarding_tickets (ticket_hash TEXT PRIMARY KEY,provider TEXT NOT NULL,provider_subject TEXT NOT NULL,email TEXT NOT NULL,display_name TEXT NOT NULL,expires_at TEXT NOT NULL,used_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
  ]);
}

async function sessionPayload(db: D1Database, userId: string, token?: string) {
  const row = await db.prepare(
    "SELECT u.id AS user_id,u.name AS user_name,u.email AS user_email,u.role AS user_role," +
    "c.id AS company_id,c.name AS company_name,c.slug AS company_slug," +
    "s.plan AS subscription_plan,s.status AS subscription_status " +
    "FROM users u JOIN memberships m ON m.user_id=u.id JOIN companies c ON c.id=m.company_id " +
    "LEFT JOIN subscriptions s ON s.company_id=c.id WHERE u.id=? ORDER BY m.created_at ASC LIMIT 1"
  ).bind(userId).first<Record<string, string | null>>();

  if (!row) throw new Error("Account membership not found.");

  return {
    ...(token ? { token } : {}),
    user: { id: row.user_id, name: row.user_name, email: row.user_email, role: row.user_role },
    company: { id: row.company_id, name: row.company_name, slug: row.company_slug },
    subscription: row.subscription_plan ? { plan: row.subscription_plan, status: row.subscription_status } : null,
  };
}

async function createSession(db: D1Database, userId: string) {
  const token = randomHex(32);
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await db.prepare("INSERT INTO sessions (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)")
    .bind(crypto.randomUUID(), userId, tokenHash, expiresAt)
    .run();
  return { token, expiresAt };
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "company";
}

async function uniqueCompanySlug(db: D1Database, name: string) {
  const base = slugify(name);
  let slug = base;
  for (let i = 0; i < 20; i += 1) {
    const exists = await db.prepare("SELECT id FROM companies WHERE slug=?").bind(slug).first();
    if (!exists) return slug;
    slug = base + "-" + String(Math.floor(1000 + Math.random() * 9000));
  }
  return base + "-" + crypto.randomUUID().slice(0, 8);
}

async function verifyIdToken(idToken: string, env: SocialAuthEnv, provider: SocialProvider, nonce: string) {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Identity provider returned an invalid token.");
  const header = decodeJwtPart(parts[0]);
  const claims = decodeJwtPart(parts[1]);
  const config = providerConfig(env, provider);

  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported identity token signature.");

  const keysResponse = await fetch(config.jwks, { headers: { Accept: "application/json" } });
  if (!keysResponse.ok) throw new Error("Identity provider signing keys are unavailable.");
  const keys = await keysResponse.json() as { keys?: Array<JsonWebKey & { kid?: string }> };
  const jwk = keys.keys?.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Identity provider signing key was not found.");

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const valid = await crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    decodeB64Url(parts[2]),
    encoder.encode(parts[0] + "." + parts[1])
  );
  if (!valid) throw new Error("Identity token signature validation failed.");

  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audience.includes(config.clientId)) throw new Error("Identity token audience mismatch.");
  if (Number(claims.exp || 0) <= Math.floor(Date.now() / 1000) - 30) throw new Error("Identity token expired.");
  if (nonce && claims.nonce !== nonce) throw new Error("Identity token nonce mismatch.");

  const issuer = String(claims.iss || "");
  if (provider === "google" && !["https://accounts.google.com", "accounts.google.com"].includes(issuer)) {
    throw new Error("Unexpected Google issuer.");
  }
  if (provider === "apple" && issuer !== "https://appleid.apple.com") {
    throw new Error("Unexpected Apple issuer.");
  }
  if (provider === "microsoft" && !/^https:\/\/login\.microsoftonline\.com\/[0-9a-f-]+\/v2\.0$/i.test(issuer)) {
    throw new Error("Unexpected Microsoft issuer.");
  }

  return claims;
}

async function callbackParams(request: Request) {
  if (request.method.toUpperCase() === "POST") {
    const form = await request.formData();
    return Object.fromEntries(form.entries()) as Record<string, string>;
  }
  return Object.fromEntries(new URL(request.url).searchParams.entries());
}

async function start(request: Request, env: SocialAuthEnv, provider: SocialProvider) {
  const config = providerConfig(env, provider);
  if (!config.ready) return json({ error: config.label + " sign-in is not configured yet." }, 503);

  const url = new URL(request.url);
  const purpose = url.searchParams.get("purpose") === "register" ? "register" : "login";
  const state = randomHex(32);
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const nonce = randomHex(24);

  await env.DB.prepare("DELETE FROM social_auth_states WHERE expires_at<=CURRENT_TIMESTAMP").run();
  await env.DB.prepare(
    "INSERT INTO social_auth_states (state_hash,provider,purpose,code_verifier,nonce,expires_at) " +
    "VALUES (?,?,?,?,?,datetime('now','+10 minutes'))"
  ).bind(await sha256(state), provider, purpose, verifier, nonce).run();

  const target = new URL(config.authorize);
  target.searchParams.set("client_id", config.clientId);
  target.searchParams.set("redirect_uri", new URL(request.url).origin + "/auth/social/" + provider + "/callback");
  target.searchParams.set("response_type", "code");
  target.searchParams.set("scope", config.scope);
  target.searchParams.set("state", state);
  target.searchParams.set("nonce", nonce);

  const challenge = await crypto.subtle.digest("SHA-256", encoder.encode(verifier));
  target.searchParams.set("code_challenge", b64url(new Uint8Array(challenge)));
  target.searchParams.set("code_challenge_method", "S256");

  if (provider === "google") {
    target.searchParams.set("access_type", "online");
    target.searchParams.set("prompt", "select_account");
  }
  if (provider === "microsoft") target.searchParams.set("response_mode", "query");
  if (provider === "apple") target.searchParams.set("response_mode", "form_post");

  return Response.redirect(target.toString(), 302);
}

async function callback(request: Request, env: SocialAuthEnv, provider: SocialProvider) {
  const params = await callbackParams(request);
  if (params.error) throw new Error(params.error_description || params.error);

  const stateHash = await sha256(String(params.state || ""));
  const state = await env.DB.prepare(
    "SELECT * FROM social_auth_states WHERE state_hash=? AND provider=? AND expires_at>CURRENT_TIMESTAMP LIMIT 1"
  ).bind(stateHash, provider).first<Record<string, string>>();

  if (!state) throw new Error("Social sign-in expired. Start again.");
  await env.DB.prepare("DELETE FROM social_auth_states WHERE state_hash=?").bind(stateHash).run();

  const config = providerConfig(env, provider);
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    code: String(params.code || ""),
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: new URL(request.url).origin + "/auth/social/" + provider + "/callback",
    code_verifier: state.code_verifier,
  });

  const exchange = await fetch(config.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: form,
  });
  const exchanged = await exchange.json().catch(() => ({})) as Record<string, string>;
  if (!exchange.ok || !exchanged.id_token) {
    throw new Error(exchanged.error_description || exchanged.error || "Identity token exchange failed.");
  }

  const claims = await verifyIdToken(exchanged.id_token, env, provider, state.nonce);
  const subject = String(claims.sub || "").trim();
  let email = String(claims.email || claims.preferred_username || "").trim().toLowerCase();
  let displayName = String(claims.name || "").trim();

  if (provider === "apple" && params.user) {
    try {
      const user = JSON.parse(params.user);
      if (!email) email = String(user?.email || "").trim().toLowerCase();
      if (!displayName) displayName = [user?.name?.firstName, user?.name?.lastName].filter(Boolean).join(" ");
    } catch {}
  }

  if (!subject || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error("Identity provider did not return a usable email.");
  }
  if (provider === "google" && claims.email_verified !== true) {
    throw new Error("Google did not verify this email.");
  }

  displayName = (displayName || email.split("@")[0]).slice(0, 100);
  const publicOrigin = appOrigin(env);
  if (!publicOrigin) throw new Error("PUBLIC_APP_ORIGIN is not configured.");

  if (state.purpose === "register") {
    const adminEmail = clean(env.ADMIN_EMAIL).toLowerCase();
    if (adminEmail && email === adminEmail) {
      throw new Error("Platform administrator onboarding must use the ICA master sign-in.");
    }

    const existing = await env.DB.prepare("SELECT id FROM users WHERE email=? LIMIT 1").bind(email).first();
    if (existing) throw new Error("That email already has an Urban Carrier OS account. Use social sign-in instead.");

    const rawTicket = randomHex(32);
    await env.DB.prepare(
      "INSERT INTO social_onboarding_tickets " +
      "(ticket_hash,provider,provider_subject,email,display_name,expires_at) " +
      "VALUES (?,?,?,?,?,datetime('now','+10 minutes'))"
    ).bind(await sha256(rawTicket), provider, subject, email, displayName).run();

    return Response.redirect(
      publicOrigin + "/auth?mode=register&social_onboarding_ticket=" + encodeURIComponent(rawTicket),
      302
    );
  }

  const user = await env.DB.prepare("SELECT id,email,role FROM users WHERE email=? LIMIT 1")
    .bind(email)
    .first<{ id: string; email: string; role: string }>();

  if (!user) throw new Error("No Urban Carrier OS account is connected to this identity yet.");
  if (user.role === "admin") {
    const adminEmail = clean(env.ADMIN_EMAIL).toLowerCase();
    if (provider !== "google" || !adminEmail || email !== adminEmail) {
      throw new Error("Urban Carrier platform-admin social sign-in requires the verified Google account assigned to ICA Master.");
    }
  }

  await env.DB.prepare(
    "INSERT INTO social_identities " +
    "(provider,provider_subject,user_id,email,created_at,updated_at) " +
    "VALUES (?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) " +
    "ON CONFLICT(provider,provider_subject) DO UPDATE SET " +
    "user_id=excluded.user_id,email=excluded.email,updated_at=CURRENT_TIMESTAMP"
  ).bind(provider, subject, user.id, email).run();

  const rawTicket = randomHex(32);
  await env.DB.prepare(
    "INSERT INTO social_login_tickets (ticket_hash,user_id,provider,expires_at) " +
    "VALUES (?,?,?,datetime('now','+5 minutes'))"
  ).bind(await sha256(rawTicket), user.id, provider).run();

  return Response.redirect(publicOrigin + "/auth?social_ticket=" + encodeURIComponent(rawTicket), 302);
}

async function exchangeTicket(request: Request, env: SocialAuthEnv, cors: HeadersInit) {
  const body = await request.json().catch(() => ({})) as { ticket?: string };
  const tokenHash = await sha256(clean(body.ticket));

  const row = await env.DB.prepare(
    "SELECT t.user_id,t.provider,u.role,u.email FROM social_login_tickets t JOIN users u ON u.id=t.user_id " +
    "WHERE t.ticket_hash=? AND t.used_at IS NULL AND t.expires_at>CURRENT_TIMESTAMP LIMIT 1"
  ).bind(tokenHash).first<{ user_id: string; provider: string; role: string; email: string }>();

  if (!row) {
    return json({ error: "Social sign-in ticket is invalid or expired." }, 401, cors);
  }
  if (row.role === "admin") {
    const adminEmail = clean(env.ADMIN_EMAIL).toLowerCase();
    if (row.provider !== "google" || !adminEmail || clean(row.email).toLowerCase() !== adminEmail) {
      return json({ error: "Platform-admin Google sign-in is unavailable for this account." }, 403, cors);
    }
  }

  const consumed = await env.DB.prepare(
    "UPDATE social_login_tickets SET used_at=CURRENT_TIMESTAMP WHERE ticket_hash=? AND used_at IS NULL"
  ).bind(tokenHash).run();

  if (!Number(consumed.meta?.changes || 0)) {
    return json({ error: "Social sign-in ticket was already used." }, 401, cors);
  }

  const session = await createSession(env.DB, row.user_id);
  return json(await sessionPayload(env.DB, row.user_id, session.token), 201, cors);
}

async function profile(request: Request, env: SocialAuthEnv, cors: HeadersInit) {
  const body = await request.json().catch(() => ({})) as { ticket?: string };
  const row = await env.DB.prepare(
    "SELECT provider,email,display_name,expires_at FROM social_onboarding_tickets " +
    "WHERE ticket_hash=? AND used_at IS NULL AND expires_at>CURRENT_TIMESTAMP LIMIT 1"
  ).bind(await sha256(clean(body.ticket))).first<Record<string, string>>();

  if (!row) return json({ error: "Social onboarding expired. Start again." }, 401, cors);

  return json({
    provider: row.provider,
    email: row.email,
    displayName: row.display_name,
    expiresAt: row.expires_at,
  }, 200, cors);
}

async function register(request: Request, env: SocialAuthEnv, cors: HeadersInit) {
  const body = await request.json().catch(() => ({})) as {
    ticket?: string;
    companyName?: string;
    plan?: string;
  };

  const ticketHash = await sha256(clean(body.ticket));
  const ticket = await env.DB.prepare(
    "SELECT * FROM social_onboarding_tickets " +
    "WHERE ticket_hash=? AND used_at IS NULL AND expires_at>CURRENT_TIMESTAMP LIMIT 1"
  ).bind(ticketHash).first<Record<string, string>>();

  if (!ticket) return json({ error: "Social onboarding expired. Start again." }, 401, cors);

  const companyName = clean(body.companyName);
  const plan = body.plan === "business" ? "business" : "basic";
  if (!companyName) return json({ error: "Company name is required." }, 400, cors);

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email=? LIMIT 1").bind(ticket.email).first();
  if (existing) return json({ error: "That email already has an Urban Carrier OS account." }, 409, cors);

  const userId = crypto.randomUUID();
  const companyId = crypto.randomUUID();
  const salt = randomHex(16);
  const passwordHash = await hashPassword(randomHex(48), salt);
  const slug = await uniqueCompanySlug(env.DB, companyName);

  await env.DB.batch([
    env.DB.prepare("INSERT INTO users (id,name,email,password_hash,password_salt,role) VALUES (?,?,?,?,?,'owner')")
      .bind(userId, ticket.display_name, ticket.email, passwordHash, salt),
    env.DB.prepare("INSERT INTO companies (id,name,slug) VALUES (?,?,?)")
      .bind(companyId, companyName, slug),
    env.DB.prepare("INSERT INTO memberships (id,user_id,company_id,role) VALUES (?,?,?,'owner')")
      .bind(crypto.randomUUID(), userId, companyId),
    env.DB.prepare("INSERT INTO subscriptions (id,company_id,plan,status) VALUES (?,?,?,'pending')")
      .bind(crypto.randomUUID(), companyId, plan),
    env.DB.prepare(
      "INSERT INTO social_identities " +
      "(provider,provider_subject,user_id,email,created_at,updated_at) " +
      "VALUES (?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)"
    ).bind(ticket.provider, ticket.provider_subject, userId, ticket.email),
    env.DB.prepare("UPDATE social_onboarding_tickets SET used_at=CURRENT_TIMESTAMP WHERE ticket_hash=?")
      .bind(ticketHash),
  ]);

  const session = await createSession(env.DB, userId);
  return json(await sessionPayload(env.DB, userId, session.token), 201, cors);
}

export async function handleSocialAuth(
  request: Request,
  env: SocialAuthEnv,
  cors: HeadersInit
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/auth/social/") && url.pathname !== "/auth/social/status") return null;

  await ensureTables(env.DB);

  if (url.pathname === "/auth/social/status" && request.method === "GET") {
    return json({
      providers: {
        google: providerConfig(env, "google").ready,
        apple: providerConfig(env, "apple").ready,
        microsoft: providerConfig(env, "microsoft").ready,
      },
    }, 200, cors);
  }

  if (url.pathname === "/auth/social/exchange" && request.method === "POST") {
    return exchangeTicket(request, env, cors);
  }
  if (url.pathname === "/auth/social/profile" && request.method === "POST") {
    return profile(request, env, cors);
  }
  if (url.pathname === "/auth/social/register" && request.method === "POST") {
    return register(request, env, cors);
  }

  const match = url.pathname.match(/^\/auth\/social\/(google|apple|microsoft)\/(start|callback)$/);
  if (!match) return null;

  const provider = match[1] as SocialProvider;
  const action = match[2];

  try {
    if (action === "start" && request.method === "GET") {
      return start(request, env, provider);
    }
    if (action === "callback" && (request.method === "GET" || request.method === "POST")) {
      return callback(request, env, provider);
    }
  } catch (error) {
    const publicOrigin = appOrigin(env);
    const message = encodeURIComponent(error instanceof Error ? error.message : "Social sign-in failed.");
    if (publicOrigin) return Response.redirect(publicOrigin + "/auth?social_error=" + message, 302);
    return json({ error: error instanceof Error ? error.message : "Social sign-in failed." }, 400, cors);
  }

  return json({ error: "Method not allowed." }, 405, cors);
}
