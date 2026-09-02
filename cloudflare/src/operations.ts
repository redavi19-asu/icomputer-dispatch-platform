interface OperationsEnv {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
}

type TenantContext = {
  userId: string;
  userRole: string;
  membershipRole: string;
  companyId: string;
  companySlug: string;
  subscriptionStatus: string;
  driverId: string | null;
};

type JobRow = Record<string, string | number | null>;
type DriverRow = Record<string, string | number | null>;

const encoder = new TextEncoder();
const OPERATING_STATUSES = new Set(["active", "trialing", "grace_period", "comped"]);
const MANAGER_ROLES = new Set(["admin", "owner", "dispatcher"]);
const JOB_STATUSES = new Set([
  "Awaiting Dispatch",
  "Assigned",
  "En Route",
  "Arrived",
  "In Progress",
  "Completed",
  "Cancelled",
]);

export async function handleOperationsRequest(
  request: Request,
  env: OperationsEnv
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;

  const cors = corsHeaders(request.headers.get("Origin") || "", env.ALLOWED_ORIGINS || "");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  try {
    await ensureOperationalTables(env.DB);

    if (url.pathname === "/api/driver-invites/accept" && request.method === "POST") {
      return await acceptDriverInvite(request, env, cors);
    }

    const tenant = await resolveTenant(request, env.DB);
    if (!tenant) return json({ error: "Unauthorized." }, 401, cors);

    const access = requireOperatingAccess(tenant, cors);
    if (access) return access;

    if (url.pathname === "/api/jobs") {
      if (request.method === "GET") return await getJobs(url, tenant, env.DB, cors);
      if (request.method === "POST") return await createJob(request, tenant, env.DB, cors);
      if (request.method === "PATCH") return await updateJob(request, tenant, env.DB, cors);
      if (request.method === "DELETE") return await deleteJob(url, tenant, env.DB, cors);
    }

    if (url.pathname === "/api/drivers") {
      if (request.method === "GET") return await getDrivers(tenant, env.DB, cors);
      if (request.method === "POST") return await createDriver(request, tenant, env.DB, cors);
      if (request.method === "PATCH") return await updateDriver(request, tenant, env.DB, cors);
      if (request.method === "DELETE") return await deleteDriver(url, tenant, env.DB, cors);
    }

    if (url.pathname === "/api/driver-invites") {
      if (request.method === "GET") return await getDriverInvites(tenant, env.DB, cors);
      if (request.method === "POST") return await createDriverInvite(request, tenant, env.DB, cors);
      if (request.method === "DELETE") return await revokeDriverInvite(url, tenant, env.DB, cors);
    }

    return json({ error: "Operational endpoint not found." }, 404, cors);
  } catch (error) {
    console.error("DispatchOS operations error", error);
    return json({ error: "DispatchOS operations service error." }, 500, cors);
  }
}

async function resolveTenant(request: Request, db: D1Database): Promise<TenantContext | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const tokenHash = await sha256(token);

  const row = await db.prepare(`
    SELECT
      s.user_id AS user_id,
      u.role AS user_role,
      m.role AS membership_role,
      c.id AS company_id,
      c.slug AS company_slug,
      COALESCE(sub.status, 'pending') AS subscription_status,
      d.id AS driver_id
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    JOIN memberships m ON m.user_id = u.id
    JOIN companies c ON c.id = m.company_id
    LEFT JOIN subscriptions sub ON sub.company_id = c.id
    LEFT JOIN drivers d ON d.company_id = c.id AND d.user_id = u.id
    WHERE s.token_hash = ?
      AND s.expires_at > datetime('now')
    ORDER BY m.created_at ASC
    LIMIT 1
  `).bind(tokenHash).first<Record<string, string | null>>();

  if (!row?.user_id || !row.company_id || !row.company_slug) return null;

  return {
    userId: row.user_id,
    userRole: row.user_role || "",
    membershipRole: row.membership_role || "",
    companyId: row.company_id,
    companySlug: row.company_slug,
    subscriptionStatus: row.subscription_status || "pending",
    driverId: row.driver_id || null,
  };
}

function requireOperatingAccess(tenant: TenantContext, cors: HeadersInit) {
  if (tenant.userRole === "admin") return null;
  if (OPERATING_STATUSES.has(tenant.subscriptionStatus.toLowerCase())) return null;
  return json(
    { error: "This company does not currently have operating access." },
    403,
    cors
  );
}

function effectiveRole(tenant: TenantContext) {
  return tenant.userRole === "admin" ? "admin" : tenant.membershipRole;
}

function canManage(tenant: TenantContext) {
  return MANAGER_ROLES.has(effectiveRole(tenant));
}

async function getJobs(url: URL, tenant: TenantContext, db: D1Database, cors: HeadersInit) {
  const jobId = clean(url.searchParams.get("id"));
  const driverOnly = effectiveRole(tenant) === "driver";

  if (driverOnly && !tenant.driverId) return json({ success: true, jobs: [] }, 200, cors);

  const where = ["j.company_id = ?"];
  const args: unknown[] = [tenant.companyId];
  if (jobId) {
    where.push("j.id = ?");
    args.push(jobId);
  }
  if (driverOnly) {
    where.push("j.driver_id = ?");
    args.push(tenant.driverId);
  }

  const result = await db.prepare(`
    SELECT
      j.id,
      j.created_at,
      j.updated_at,
      j.status,
      j.service,
      j.address,
      j.details,
      j.driver_id,
      j.eta_minutes,
      j.status_history,
      j.verification_token,
      j.pickup_verification_token,
      j.delivery_verification_token,
      j.pickup_verified_at,
      j.delivery_verified_at,
      j.handoff_verified_at,
      c.slug AS company_slug,
      cu.name AS customer_name,
      cu.phone AS customer_phone,
      cu.email AS customer_email
    FROM jobs j
    JOIN companies c ON c.id = j.company_id
    LEFT JOIN customers cu ON cu.id = j.customer_id AND cu.company_id = j.company_id
    WHERE ${where.join(" AND ")}
    ORDER BY datetime(j.created_at) DESC
  `).bind(...args).all<JobRow>();

  const jobs = (result.results || []).map(toApiJob);
  if (jobId) {
    const job = jobs[0] || null;
    return job
      ? json({ success: true, job }, 200, cors)
      : json({ success: false, error: "Job not found." }, 404, cors);
  }
  return json({ success: true, jobs }, 200, cors);
}

async function createJob(request: Request, tenant: TenantContext, db: D1Database, cors: HeadersInit) {
  if (!canManage(tenant)) return json({ error: "Dispatcher access required." }, 403, cors);

  const body = await request.json<Record<string, unknown>>();
  const name = cleanString(body.name) || "Customer";
  const phone = cleanString(body.phone);
  const email = cleanString(body.email).toLowerCase();
  const service = cleanString(body.service);
  const address = cleanString(body.address);
  const details = cleanString(body.details);
  const requestedDriverId = cleanString(body.driverId);

  let driverId: string | null = null;
  if (requestedDriverId) {
    const driver = await db.prepare("SELECT id FROM drivers WHERE id = ? AND company_id = ?")
      .bind(requestedDriverId, tenant.companyId)
      .first<{ id: string }>();
    if (!driver) return json({ error: "Driver does not belong to this company." }, 400, cors);
    driverId = driver.id;
  }

  const customerId = crypto.randomUUID();
  const jobId = crypto.randomUUID();
  const now = new Date().toISOString();
  const status = driverId ? "Assigned" : "Awaiting Dispatch";
  const history = JSON.stringify([
    {
      type: "status",
      at: now,
      label: driverId ? "Job assigned" : "Request created",
      detail: driverId ? "Job created and assigned" : "Customer request entered dispatch queue",
      status,
    },
  ]);

  await db.batch([
    db.prepare(`
      INSERT INTO customers (id, company_id, name, email, phone, address, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(customerId, tenant.companyId, name, email || null, phone || null, address || null, now, now),
    db.prepare(`
      INSERT INTO jobs (
        id, company_id, customer_id, driver_id, status, service, address, details,
        eta_minutes, status_history, verification_token, pickup_verification_token,
        delivery_verification_token, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      jobId,
      tenant.companyId,
      customerId,
      driverId,
      status,
      service || null,
      address || null,
      details || null,
      null,
      history,
      verificationToken(jobId),
      `P-${verificationToken(`${jobId}-pickup`)}`,
      `D-${verificationToken(`${jobId}-delivery`)}`,
      now,
      now
    ),
  ]);

  return await getJobs(new URL(`${new URL(request.url).origin}/api/jobs?id=${encodeURIComponent(jobId)}`), tenant, db, cors);
}

async function updateJob(request: Request, tenant: TenantContext, db: D1Database, cors: HeadersInit) {
  const body = await request.json<Record<string, unknown>>();
  const id = cleanString(body.id);
  if (!id) return json({ error: "Job id is required." }, 400, cors);

  const current = await db.prepare(`
    SELECT id, driver_id, status, status_history, verification_token,
           pickup_verification_token, delivery_verification_token
    FROM jobs
    WHERE id = ? AND company_id = ?
  `).bind(id, tenant.companyId).first<Record<string, string | null>>();
  if (!current) return json({ error: "Job not found." }, 404, cors);

  const role = effectiveRole(tenant);
  if (role === "driver") {
    if (!tenant.driverId || current.driver_id !== tenant.driverId) {
      return json({ error: "This job is not assigned to this driver." }, 403, cors);
    }
    if (body.driverId !== undefined) {
      return json({ error: "Drivers cannot reassign jobs." }, 403, cors);
    }
  } else if (!canManage(tenant)) {
    return json({ error: "Dispatcher access required." }, 403, cors);
  }

  let driverId = current.driver_id || null;
  if (body.driverId !== undefined && role !== "driver") {
    const requestedDriverId = cleanString(body.driverId);
    if (!requestedDriverId) {
      driverId = null;
    } else {
      const driver = await db.prepare("SELECT id FROM drivers WHERE id = ? AND company_id = ?")
        .bind(requestedDriverId, tenant.companyId)
        .first<{ id: string }>();
      if (!driver) return json({ error: "Driver does not belong to this company." }, 400, cors);
      driverId = driver.id;
    }
  }

  let status = cleanString(body.status) || current.status || "Awaiting Dispatch";
  if (!JOB_STATUSES.has(status)) return json({ error: "Invalid job status." }, 400, cors);
  const etaMinutes = numberOrNull(body.etaMinutes);
  const now = new Date().toISOString();
  let history = parseHistory(current.status_history);

  if (status !== current.status) {
    history.push({
      type: "status",
      at: now,
      label: status,
      detail: role === "driver" ? "Status updated by driver" : "Status updated by operations",
      status,
    });
  }

  let pickupVerifiedAt: string | null | undefined = undefined;
  let deliveryVerifiedAt: string | null | undefined = undefined;
  let handoffVerifiedAt: string | null | undefined = undefined;
  const verificationAction = cleanString(body.verificationAction);
  const suppliedToken = cleanString(body.verificationToken);

  if (verificationAction === "confirm-handoff") {
    if (!suppliedToken || suppliedToken !== current.verification_token) return json({ error: "Invalid handoff token." }, 403, cors);
    handoffVerifiedAt = now;
  }
  if (verificationAction === "confirm-pickup") {
    if (!suppliedToken || suppliedToken !== current.pickup_verification_token) return json({ error: "Invalid pickup token." }, 403, cors);
    pickupVerifiedAt = now;
  }
  if (verificationAction === "confirm-delivery") {
    if (!suppliedToken || suppliedToken !== current.delivery_verification_token) return json({ error: "Invalid delivery token." }, 403, cors);
    deliveryVerifiedAt = now;
  }

  await db.prepare(`
    UPDATE jobs
    SET status = ?,
        driver_id = ?,
        eta_minutes = COALESCE(?, eta_minutes),
        status_history = ?,
        pickup_verified_at = COALESCE(?, pickup_verified_at),
        delivery_verified_at = COALESCE(?, delivery_verified_at),
        handoff_verified_at = COALESCE(?, handoff_verified_at),
        updated_at = ?
    WHERE id = ? AND company_id = ?
  `).bind(
    status,
    driverId,
    etaMinutes,
    JSON.stringify(history),
    pickupVerifiedAt,
    deliveryVerifiedAt,
    handoffVerifiedAt,
    now,
    id,
    tenant.companyId
  ).run();

  return await getJobs(new URL(`${new URL(request.url).origin}/api/jobs?id=${encodeURIComponent(id)}`), tenant, db, cors);
}

async function deleteJob(url: URL, tenant: TenantContext, db: D1Database, cors: HeadersInit) {
  if (!canManage(tenant)) return json({ error: "Dispatcher access required." }, 403, cors);

  const id = clean(url.searchParams.get("id"));
  const clearCompleted = url.searchParams.get("clearCompleted") === "1";

  if (id) {
    const result = await db.prepare("DELETE FROM jobs WHERE id = ? AND company_id = ?")
      .bind(id, tenant.companyId)
      .run();
    return result.changes
      ? json({ success: true, cleared: result.changes }, 200, cors)
      : json({ error: "Job not found." }, 404, cors);
  }

  if (clearCompleted) {
    const result = await db.prepare(`
      DELETE FROM jobs
      WHERE company_id = ? AND lower(status) IN ('completed','cancelled','canceled')
    `).bind(tenant.companyId).run();
    return json({ success: true, cleared: result.changes }, 200, cors);
  }

  return json({ error: "Provide id or clearCompleted=1." }, 400, cors);
}

async function getDrivers(tenant: TenantContext, db: D1Database, cors: HeadersInit) {
  const role = effectiveRole(tenant);
  if (role === "driver" && !tenant.driverId) return json({ success: true, drivers: [] }, 200, cors);

  const query = role === "driver"
    ? `SELECT id, user_id, name, email, phone, status, created_at, updated_at FROM drivers WHERE company_id = ? AND id = ? ORDER BY name`
    : `SELECT id, user_id, name, email, phone, status, created_at, updated_at FROM drivers WHERE company_id = ? ORDER BY name`;
  const result = role === "driver"
    ? await db.prepare(query).bind(tenant.companyId, tenant.driverId).all<DriverRow>()
    : await db.prepare(query).bind(tenant.companyId).all<DriverRow>();

  return json({ success: true, drivers: (result.results || []).map(toApiDriver) }, 200, cors);
}

async function createDriver(request: Request, tenant: TenantContext, db: D1Database, cors: HeadersInit) {
  if (!canManage(tenant)) return json({ error: "Dispatcher access required." }, 403, cors);
  const body = await request.json<Record<string, unknown>>();
  const name = cleanString(body.name);
  const email = cleanString(body.email).toLowerCase();
  const phone = cleanString(body.phone);
  const status = cleanString(body.status) || "offline";
  if (!name) return json({ error: "Driver name is required." }, 400, cors);

  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO drivers (id, company_id, name, email, phone, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, tenant.companyId, name, email || null, phone || null, status).run();

  const driver = await db.prepare(`
    SELECT id, user_id, name, email, phone, status, created_at, updated_at
    FROM drivers WHERE id = ? AND company_id = ?
  `).bind(id, tenant.companyId).first<DriverRow>();
  return json({ success: true, driver: driver ? toApiDriver(driver) : null }, 201, cors);
}

async function updateDriver(request: Request, tenant: TenantContext, db: D1Database, cors: HeadersInit) {
  const body = await request.json<Record<string, unknown>>();
  const id = cleanString(body.id);
  if (!id) return json({ error: "Driver id is required." }, 400, cors);

  const role = effectiveRole(tenant);
  if (role === "driver" && tenant.driverId !== id) return json({ error: "Drivers may only update their own profile." }, 403, cors);
  if (role !== "driver" && !canManage(tenant)) return json({ error: "Dispatcher access required." }, 403, cors);

  const current = await db.prepare("SELECT id, name, email, phone, status FROM drivers WHERE id = ? AND company_id = ?")
    .bind(id, tenant.companyId)
    .first<Record<string, string | null>>();
  if (!current) return json({ error: "Driver not found." }, 404, cors);

  const name = role === "driver" ? current.name : cleanString(body.name) || current.name;
  const email = role === "driver" ? current.email : cleanString(body.email).toLowerCase() || current.email;
  const phone = role === "driver" ? cleanString(body.phone) || current.phone : cleanString(body.phone) || current.phone;
  const status = cleanString(body.status) || current.status || "offline";

  await db.prepare(`
    UPDATE drivers SET name = ?, email = ?, phone = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND company_id = ?
  `).bind(name, email, phone, status, id, tenant.companyId).run();

  const driver = await db.prepare(`
    SELECT id, user_id, name, email, phone, status, created_at, updated_at
    FROM drivers WHERE id = ? AND company_id = ?
  `).bind(id, tenant.companyId).first<DriverRow>();
  return json({ success: true, driver: driver ? toApiDriver(driver) : null }, 200, cors);
}

async function deleteDriver(url: URL, tenant: TenantContext, db: D1Database, cors: HeadersInit) {
  if (!canManage(tenant)) return json({ error: "Dispatcher access required." }, 403, cors);
  const id = clean(url.searchParams.get("id"));
  if (!id) return json({ error: "Driver id is required." }, 400, cors);
  const result = await db.prepare("DELETE FROM drivers WHERE id = ? AND company_id = ?")
    .bind(id, tenant.companyId)
    .run();
  return result.changes
    ? json({ success: true }, 200, cors)
    : json({ error: "Driver not found." }, 404, cors);
}

async function getDriverInvites(tenant: TenantContext, db: D1Database, cors: HeadersInit) {
  if (!canManage(tenant)) return json({ error: "Dispatcher access required." }, 403, cors);
  const result = await db.prepare(`
    SELECT id, email, role, expires_at, accepted_at, created_at
    FROM driver_invites
    WHERE company_id = ?
    ORDER BY datetime(created_at) DESC
  `).bind(tenant.companyId).all();
  return json({ success: true, invites: result.results || [] }, 200, cors);
}

async function createDriverInvite(request: Request, tenant: TenantContext, db: D1Database, cors: HeadersInit) {
  if (!canManage(tenant)) return json({ error: "Dispatcher access required." }, 403, cors);
  const body = await request.json<Record<string, unknown>>();
  const email = cleanString(body.email).toLowerCase();
  if (!email || !email.includes("@")) return json({ error: "A valid driver email is required." }, 400, cors);

  const hours = Math.min(Math.max(Number(body.expiresInHours) || 72, 1), 168);
  const expiresAt = new Date(Date.now() + hours * 3600000).toISOString();
  const token = randomHex(32);
  const tokenHash = await sha256(token);
  const id = crypto.randomUUID();

  await db.prepare(`
    INSERT INTO driver_invites (id, company_id, email, role, token_hash, expires_at)
    VALUES (?, ?, ?, 'driver', ?, ?)
  `).bind(id, tenant.companyId, email, tokenHash, expiresAt).run();

  return json({
    success: true,
    invite: {
      id,
      email,
      companySlug: tenant.companySlug,
      expiresAt,
      token,
    },
  }, 201, cors);
}

async function revokeDriverInvite(url: URL, tenant: TenantContext, db: D1Database, cors: HeadersInit) {
  if (!canManage(tenant)) return json({ error: "Dispatcher access required." }, 403, cors);
  const id = clean(url.searchParams.get("id"));
  if (!id) return json({ error: "Invite id is required." }, 400, cors);
  const result = await db.prepare("DELETE FROM driver_invites WHERE id = ? AND company_id = ?")
    .bind(id, tenant.companyId)
    .run();
  return result.changes
    ? json({ success: true }, 200, cors)
    : json({ error: "Invite not found." }, 404, cors);
}

async function acceptDriverInvite(request: Request, env: OperationsEnv, cors: HeadersInit) {
  const body = await request.json<Record<string, unknown>>();
  const token = cleanString(body.token);
  const name = cleanString(body.name);
  const phone = cleanString(body.phone);
  const password = typeof body.password === "string" ? body.password : "";
  if (!token || !name) return json({ error: "Invite token and driver name are required." }, 400, cors);
  if (password.length < 10) return json({ error: "Password must be at least 10 characters." }, 400, cors);

  const tokenHash = await sha256(token);
  const invite = await env.DB.prepare(`
    SELECT i.id, i.company_id, i.email, i.expires_at, i.accepted_at,
           c.name AS company_name, c.slug AS company_slug,
           COALESCE(s.status, 'pending') AS subscription_status
    FROM driver_invites i
    JOIN companies c ON c.id = i.company_id
    LEFT JOIN subscriptions s ON s.company_id = c.id
    WHERE i.token_hash = ?
    LIMIT 1
  `).bind(tokenHash).first<Record<string, string | null>>();

  if (!invite || invite.accepted_at) return json({ error: "This driver invite is invalid or has already been used." }, 400, cors);
  if (new Date(invite.expires_at || 0).getTime() <= Date.now()) return json({ error: "This driver invite has expired." }, 410, cors);
  if (!OPERATING_STATUSES.has((invite.subscription_status || "pending").toLowerCase())) {
    return json({ error: "This company is not currently accepting driver access." }, 403, cors);
  }

  const email = invite.email || "";
  const existingUser = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first<{ id: string }>();
  if (existingUser) {
    return json({ error: "That email already has a DispatchOS account. Sign in instead or ask the company to use another driver email." }, 409, cors);
  }

  const userId = crypto.randomUUID();
  const salt = randomHex(16);
  const passwordHash = await hashPassword(password, salt);
  const driverId = crypto.randomUUID();
  const now = new Date().toISOString();

  const existingDriver = await env.DB.prepare("SELECT id FROM drivers WHERE company_id = ? AND lower(email) = lower(?) LIMIT 1")
    .bind(invite.company_id, email)
    .first<{ id: string }>();

  await env.DB.batch([
    env.DB.prepare("INSERT INTO users (id, name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?, 'driver')")
      .bind(userId, name, email, passwordHash, salt),
    env.DB.prepare("INSERT INTO memberships (id, user_id, company_id, role) VALUES (?, ?, ?, 'driver')")
      .bind(crypto.randomUUID(), userId, invite.company_id),
    existingDriver
      ? env.DB.prepare("UPDATE drivers SET user_id = ?, name = ?, phone = ?, status = 'available', updated_at = ? WHERE id = ? AND company_id = ?")
          .bind(userId, name, phone || null, now, existingDriver.id, invite.company_id)
      : env.DB.prepare("INSERT INTO drivers (id, company_id, user_id, name, email, phone, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'available', ?, ?)")
          .bind(driverId, invite.company_id, userId, name, email, phone || null, now, now),
    env.DB.prepare("UPDATE driver_invites SET accepted_at = ? WHERE id = ? AND company_id = ? AND accepted_at IS NULL")
      .bind(now, invite.id, invite.company_id),
  ]);

  const session = await createSession(env.DB, userId);
  return json({
    success: true,
    token: session.token,
    user: { id: userId, name, email, role: "driver" },
    company: { id: invite.company_id, name: invite.company_name, slug: invite.company_slug },
    subscription: { status: invite.subscription_status },
  }, 201, cors);
}

function toApiJob(row: JobRow) {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    companySlug: row.company_slug,
    name: row.customer_name,
    phone: row.customer_phone,
    email: row.customer_email,
    service: row.service,
    address: row.address,
    details: row.details,
    driverId: row.driver_id,
    etaMinutes: row.eta_minutes,
    statusHistory: parseHistory(row.status_history),
    verificationToken: row.verification_token,
    pickupVerificationToken: row.pickup_verification_token,
    deliveryVerificationToken: row.delivery_verification_token,
    pickupVerifiedAt: row.pickup_verified_at,
    deliveryVerifiedAt: row.delivery_verified_at,
    handoffVerifiedAt: row.handoff_verified_at,
  };
}

function toApiDriver(row: DriverRow) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseHistory(value: unknown): Array<Record<string, unknown>> {
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function ensureOperationalTables(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      user_id TEXT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      status TEXT NOT NULL DEFAULT 'offline',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(company_id, email),
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      customer_id TEXT,
      driver_id TEXT,
      status TEXT NOT NULL DEFAULT 'Awaiting Dispatch',
      service TEXT,
      address TEXT,
      details TEXT,
      eta_minutes INTEGER,
      status_history TEXT,
      verification_token TEXT,
      pickup_verification_token TEXT,
      delivery_verification_token TEXT,
      pickup_verified_at TEXT,
      delivery_verified_at TEXT,
      handoff_verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      FOREIGN KEY(driver_id) REFERENCES drivers(id) ON DELETE SET NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS driver_invites (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'driver',
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      accepted_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_drivers_company ON drivers(company_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_jobs_company_driver ON jobs(company_id, driver_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_driver_invites_company ON driver_invites(company_id)"),
  ]);
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

function verificationToken(id: string) {
  return id.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(-8);
}

function bearerToken(request: Request) {
  const header = request.headers.get("Authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function clean(value: string | null | undefined) {
  return (value || "").trim();
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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
