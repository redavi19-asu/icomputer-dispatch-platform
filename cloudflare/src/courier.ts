interface CourierEnv {
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

type CourierStopInput = {
  trackingCode?: string;
  customerName?: string;
  phone?: string;
  address?: string;
  lat?: number;
  lon?: number;
  packageLocation?: string;
  priority?: number;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  instructions?: string;
  stopType?: "pickup" | "delivery";
  pairKey?: string;
};

const encoder = new TextEncoder();
const OPERATING_STATUSES = new Set(["active", "trialing", "grace_period", "comped"]);
const MANAGER_ROLES = new Set(["admin", "owner", "dispatcher"]);
const ROUTE_STATUSES = new Set(["Draft", "Ready", "Dispatched", "In Progress", "Completed", "Cancelled"]);
const STOP_STATUSES = new Set(["Pending", "En Route", "Arrived", "Delivered", "Failed", "Skipped"]);
const PROOF_TYPES = new Set(["scan", "photo", "signature", "note"]);

export async function handleCourierRequest(
  request: Request,
  env: CourierEnv
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/courier/")) return null;

  const cors = corsHeaders(request.headers.get("Origin") || "", env.ALLOWED_ORIGINS || "");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  try {
    await ensureCourierTables(env.DB);

    const tenant = await resolveTenant(request, env.DB);
    if (!tenant) return json({ error: "Unauthorized." }, 401, cors);
    if (tenant.userRole !== "admin" && !OPERATING_STATUSES.has(tenant.subscriptionStatus.toLowerCase())) {
      return json({ error: "This company does not currently have operating access." }, 403, cors);
    }

    if (url.pathname === "/api/courier/routes") {
      if (request.method === "GET") return await getRoutes(url, tenant, env.DB, cors);
      if (request.method === "POST") return await createRoute(request, tenant, env.DB, cors);
      if (request.method === "PATCH") return await updateRoute(request, tenant, env.DB, cors);
    }

    if (url.pathname === "/api/courier/stops" && request.method === "PATCH") {
      return await updateStop(request, tenant, env.DB, cors);
    }

    if (url.pathname === "/api/courier/proofs" && request.method === "POST") {
      return await createProof(request, tenant, env.DB, cors);
    }

    return json({ error: "Courier endpoint not found." }, 404, cors);
  } catch (error) {
    console.error("Urban Courier OS courier service error", error);
    return json({ error: "Urban Courier OS courier service error." }, 500, cors);
  }
}

async function ensureCourierTables(db: D1Database) {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS courier_routes (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        driver_id TEXT,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Draft',
        start_address TEXT,
        start_lat REAL,
        start_lon REAL,
        total_distance_miles REAL,
        estimated_minutes INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY(driver_id) REFERENCES drivers(id) ON DELETE SET NULL
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS courier_stops (
        id TEXT PRIMARY KEY,
        route_id TEXT NOT NULL,
        company_id TEXT NOT NULL,
        job_id TEXT,
        sequence INTEGER NOT NULL,
        tracking_code TEXT,
        customer_name TEXT,
        phone TEXT,
        address TEXT NOT NULL,
        lat REAL,
        lon REAL,
        package_location TEXT,
        priority INTEGER NOT NULL DEFAULT 0,
        time_window_start TEXT,
        time_window_end TEXT,
        instructions TEXT,
        stop_type TEXT NOT NULL DEFAULT 'delivery',
        pair_key TEXT,
        status TEXT NOT NULL DEFAULT 'Pending',
        failed_reason TEXT,
        driver_note TEXT,
        delivered_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(route_id) REFERENCES courier_routes(id) ON DELETE CASCADE,
        FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE SET NULL
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS courier_proofs (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        route_id TEXT NOT NULL,
        stop_id TEXT NOT NULL,
        job_id TEXT,
        proof_type TEXT NOT NULL,
        proof_value TEXT,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY(route_id) REFERENCES courier_routes(id) ON DELETE CASCADE,
        FOREIGN KEY(stop_id) REFERENCES courier_stops(id) ON DELETE CASCADE,
        FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE SET NULL
      )
    `),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_courier_routes_company ON courier_routes(company_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_courier_routes_driver ON courier_routes(company_id, driver_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_courier_stops_route ON courier_stops(route_id, sequence)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_courier_stops_tracking ON courier_stops(company_id, tracking_code)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_courier_proofs_stop ON courier_proofs(stop_id, created_at)")
  ]);
}

async function getRoutes(url: URL, tenant: TenantContext, db: D1Database, cors: HeadersInit) {
  const routeId = clean(url.searchParams.get("id"));
  const activeOnly = url.searchParams.get("active") === "1";
  const driverOnly = effectiveRole(tenant) === "driver";

  if (driverOnly && !tenant.driverId) return json({ success: true, routes: [] }, 200, cors);

  const where = ["r.company_id = ?"];
  const args: unknown[] = [tenant.companyId];
  if (routeId) {
    where.push("r.id = ?");
    args.push(routeId);
  }
  if (activeOnly) {
    where.push("r.status NOT IN ('Completed','Cancelled')");
  }
  if (driverOnly) {
    where.push("r.driver_id = ?");
    args.push(tenant.driverId);
  }

  const routeRows = await db.prepare(`
    SELECT r.*, d.name AS driver_name
    FROM courier_routes r
    LEFT JOIN drivers d ON d.id = r.driver_id AND d.company_id = r.company_id
    WHERE ${where.join(" AND ")}
    ORDER BY datetime(r.created_at) DESC
  `).bind(...args).all<Record<string, unknown>>();

  const routes = [];
  for (const route of routeRows.results || []) {
    const stops = await db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM courier_proofs p WHERE p.stop_id = s.id AND p.company_id = s.company_id) AS proof_count
      FROM courier_stops s
      WHERE s.route_id = ? AND s.company_id = ?
      ORDER BY s.sequence ASC
    `).bind(route.id, tenant.companyId).all<Record<string, unknown>>();

    routes.push({
      id: route.id,
      name: route.name,
      status: route.status,
      driverId: route.driver_id,
      driverName: route.driver_name,
      startAddress: route.start_address,
      startLat: route.start_lat,
      startLon: route.start_lon,
      totalDistanceMiles: route.total_distance_miles,
      estimatedMinutes: route.estimated_minutes,
      createdAt: route.created_at,
      updatedAt: route.updated_at,
      stops: (stops.results || []).map(toApiStop),
    });
  }

  if (routeId) {
    return routes[0]
      ? json({ success: true, route: routes[0] }, 200, cors)
      : json({ error: "Courier route not found." }, 404, cors);
  }
  return json({ success: true, routes }, 200, cors);
}

async function createRoute(request: Request, tenant: TenantContext, db: D1Database, cors: HeadersInit) {
  if (!canManage(tenant)) return json({ error: "Dispatcher access required." }, 403, cors);

  const body = await request.json<Record<string, unknown>>();
  const rawStops = Array.isArray(body.stops) ? (body.stops as CourierStopInput[]) : [];
  if (!rawStops.length) return json({ error: "At least one courier stop is required." }, 400, cors);
  if (rawStops.length > 250) return json({ error: "A route can contain up to 250 stops." }, 400, cors);

  const name = cleanString(body.name) || "Courier Route";
  const startAddress = cleanString(body.startAddress);
  const startLat = numberOrNull(body.startLat);
  const startLon = numberOrNull(body.startLon);
  const totalDistanceMiles = numberOrNull(body.totalDistanceMiles);
  const estimatedMinutes = integerOrNull(body.estimatedMinutes);
  const autoAssign = body.autoAssign === true;
  let driverId = cleanString(body.driverId) || null;

  if (driverId) {
    const driver = await db.prepare("SELECT id FROM drivers WHERE id = ? AND company_id = ?")
      .bind(driverId, tenant.companyId)
      .first<{ id: string }>();
    if (!driver) return json({ error: "Driver does not belong to this company." }, 400, cors);
  } else if (autoAssign) {
    const recommended = await db.prepare(`
      SELECT d.id
      FROM drivers d
      LEFT JOIN jobs j
        ON j.driver_id = d.id
       AND j.company_id = d.company_id
       AND lower(j.status) NOT IN ('completed','cancelled','canceled')
      WHERE d.company_id = ?
        AND lower(COALESCE(d.status, '')) IN ('available','online','active')
      GROUP BY d.id
      ORDER BY COUNT(j.id) ASC, datetime(d.updated_at) ASC
      LIMIT 1
    `).bind(tenant.companyId).first<{ id: string }>();
    driverId = recommended?.id || null;
  }

  const routeId = crypto.randomUUID();
  const now = new Date().toISOString();
  const routeStatus = driverId ? "Dispatched" : "Ready";

  await db.prepare(`
    INSERT INTO courier_routes (
      id, company_id, driver_id, name, status, start_address, start_lat, start_lon,
      total_distance_miles, estimated_minutes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    routeId,
    tenant.companyId,
    driverId,
    name,
    routeStatus,
    startAddress || null,
    startLat,
    startLon,
    totalDistanceMiles,
    estimatedMinutes,
    now,
    now
  ).run();

  for (let index = 0; index < rawStops.length; index += 1) {
    const stop = rawStops[index] || {};
    const address = cleanString(stop.address);
    if (!address) continue;

    const stopId = crypto.randomUUID();
    const customerId = crypto.randomUUID();
    const jobId = crypto.randomUUID();
    const customerName = cleanString(stop.customerName) || "Courier Customer";
    const phone = cleanString(stop.phone);
    const trackingCode = cleanString(stop.trackingCode);
    const packageLocation = cleanString(stop.packageLocation);
    const instructions = cleanString(stop.instructions);
    const timeWindowStart = cleanString(stop.timeWindowStart);
    const timeWindowEnd = cleanString(stop.timeWindowEnd);
    const stopType = stop.stopType === "pickup" ? "pickup" : "delivery";
    const pairKey = cleanString(stop.pairKey);
    const priority = Math.max(0, Math.min(9, Number(stop.priority) || 0));
    const sequence = index + 1;
    const jobStatus = driverId ? "Assigned" : "Awaiting Dispatch";
    const detailsParts = [
      "Urban Courier route " + name,
      "Stop " + sequence + " of " + rawStops.length,
      trackingCode ? "Tracking: " + trackingCode : "",
      packageLocation ? "Vehicle: " + packageLocation : "",
      instructions ? "Instructions: " + instructions : "",
    ].filter(Boolean);
    const history = JSON.stringify([{
      type: "status",
      at: now,
      label: driverId ? "Courier stop assigned" : "Courier stop created",
      detail: "Created from Urban Courier route " + name,
      status: jobStatus,
    }]);

    await db.batch([
      db.prepare(`
        INSERT INTO customers (id, company_id, name, phone, address, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(customerId, tenant.companyId, customerName, phone || null, address, now, now),
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
        jobStatus,
        stopType === "pickup" ? "Courier Pickup" : "Courier Delivery",
        address,
        detailsParts.join(" • "),
        null,
        history,
        verificationToken(jobId),
        "P-" + verificationToken(jobId + "-pickup"),
        "D-" + verificationToken(jobId + "-delivery"),
        now,
        now
      ),
      db.prepare(`
        INSERT INTO courier_stops (
          id, route_id, company_id, job_id, sequence, tracking_code, customer_name, phone,
          address, lat, lon, package_location, priority, time_window_start, time_window_end,
          instructions, stop_type, pair_key, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)
      `).bind(
        stopId,
        routeId,
        tenant.companyId,
        jobId,
        sequence,
        trackingCode || null,
        customerName,
        phone || null,
        address,
        numberOrNull(stop.lat),
        numberOrNull(stop.lon),
        packageLocation || null,
        priority,
        timeWindowStart || null,
        timeWindowEnd || null,
        instructions || null,
        stopType,
        pairKey || null,
        now,
        now
      )
    ]);
  }

  return await getRoutes(
    new URL(new URL(request.url).origin + "/api/courier/routes?id=" + encodeURIComponent(routeId)),
    tenant,
    db,
    cors
  );
}

async function updateRoute(request: Request, tenant: TenantContext, db: D1Database, cors: HeadersInit) {
  if (!canManage(tenant)) return json({ error: "Dispatcher access required." }, 403, cors);

  const body = await request.json<Record<string, unknown>>();
  const id = cleanString(body.id);
  if (!id) return json({ error: "Route id is required." }, 400, cors);

  const current = await db.prepare("SELECT id, driver_id, status FROM courier_routes WHERE id = ? AND company_id = ?")
    .bind(id, tenant.companyId)
    .first<Record<string, string | null>>();
  if (!current) return json({ error: "Courier route not found." }, 404, cors);

  let driverId = current.driver_id || null;
  if (body.driverId !== undefined) {
    const requested = cleanString(body.driverId);
    if (requested) {
      const driver = await db.prepare("SELECT id FROM drivers WHERE id = ? AND company_id = ?")
        .bind(requested, tenant.companyId)
        .first<{ id: string }>();
      if (!driver) return json({ error: "Driver does not belong to this company." }, 400, cors);
      driverId = driver.id;
    } else {
      driverId = null;
    }
  }

  const status = cleanString(body.status) || current.status || "Ready";
  if (!ROUTE_STATUSES.has(status)) return json({ error: "Invalid courier route status." }, 400, cors);
  const now = new Date().toISOString();

  await db.prepare(`
    UPDATE courier_routes
    SET driver_id = ?, status = ?, updated_at = ?
    WHERE id = ? AND company_id = ?
  `).bind(driverId, status, now, id, tenant.companyId).run();

  await db.prepare(`
    UPDATE jobs
    SET driver_id = ?,
        status = CASE
          WHEN lower(status) IN ('completed','cancelled','canceled') THEN status
          WHEN ? IS NULL THEN 'Awaiting Dispatch'
          ELSE 'Assigned'
        END,
        updated_at = ?
    WHERE company_id = ?
      AND id IN (SELECT job_id FROM courier_stops WHERE route_id = ? AND company_id = ?)
  `).bind(driverId, driverId, now, tenant.companyId, id, tenant.companyId).run();

  return await getRoutes(
    new URL(new URL(request.url).origin + "/api/courier/routes?id=" + encodeURIComponent(id)),
    tenant,
    db,
    cors
  );
}

async function updateStop(request: Request, tenant: TenantContext, db: D1Database, cors: HeadersInit) {
  const body = await request.json<Record<string, unknown>>();
  const id = cleanString(body.id);
  if (!id) return json({ error: "Stop id is required." }, 400, cors);

  const stop = await db.prepare(`
    SELECT s.*, r.driver_id AS route_driver_id
    FROM courier_stops s
    JOIN courier_routes r ON r.id = s.route_id AND r.company_id = s.company_id
    WHERE s.id = ? AND s.company_id = ?
  `).bind(id, tenant.companyId).first<Record<string, unknown>>();
  if (!stop) return json({ error: "Courier stop not found." }, 404, cors);

  const role = effectiveRole(tenant);
  if (role === "driver") {
    if (!tenant.driverId || stop.route_driver_id !== tenant.driverId) {
      return json({ error: "This courier stop is not assigned to this driver." }, 403, cors);
    }
  } else if (!canManage(tenant)) {
    return json({ error: "Dispatcher access required." }, 403, cors);
  }

  const status = cleanString(body.status) || String(stop.status || "Pending");
  if (!STOP_STATUSES.has(status)) return json({ error: "Invalid courier stop status." }, 400, cors);
  const failedReason = cleanString(body.failedReason);
  const driverNote = cleanString(body.driverNote);
  const now = new Date().toISOString();
  const deliveredAt = status === "Delivered" ? now : null;

  await db.prepare(`
    UPDATE courier_stops
    SET status = ?,
        failed_reason = ?,
        driver_note = ?,
        delivered_at = COALESCE(?, delivered_at),
        updated_at = ?
    WHERE id = ? AND company_id = ?
  `).bind(
    status,
    failedReason || null,
    driverNote || null,
    deliveredAt,
    now,
    id,
    tenant.companyId
  ).run();

  if (stop.job_id) {
    let jobStatus = "In Progress";
    if (status === "Delivered") jobStatus = "Completed";
    if (status === "En Route") jobStatus = "En Route";
    if (status === "Arrived") jobStatus = "Arrived";
    await db.prepare("UPDATE jobs SET status = ?, updated_at = ? WHERE id = ? AND company_id = ?")
      .bind(jobStatus, now, stop.job_id, tenant.companyId)
      .run();
  }

  const counts = await db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) AS delivered,
      SUM(CASE WHEN status IN ('En Route','Arrived') THEN 1 ELSE 0 END) AS active
    FROM courier_stops
    WHERE route_id = ? AND company_id = ?
  `).bind(stop.route_id, tenant.companyId).first<Record<string, number>>();

  const total = Number(counts?.total || 0);
  const delivered = Number(counts?.delivered || 0);
  const active = Number(counts?.active || 0);
  const routeStatus = total > 0 && delivered === total ? "Completed" : active > 0 || delivered > 0 ? "In Progress" : "Dispatched";
  await db.prepare("UPDATE courier_routes SET status = ?, updated_at = ? WHERE id = ? AND company_id = ?")
    .bind(routeStatus, now, stop.route_id, tenant.companyId)
    .run();

  return await getRoutes(
    new URL(new URL(request.url).origin + "/api/courier/routes?id=" + encodeURIComponent(String(stop.route_id))),
    tenant,
    db,
    cors
  );
}

async function createProof(request: Request, tenant: TenantContext, db: D1Database, cors: HeadersInit) {
  const body = await request.json<Record<string, unknown>>();
  const stopId = cleanString(body.stopId);
  const proofType = cleanString(body.proofType).toLowerCase();
  const proofValue = cleanString(body.proofValue);
  const note = cleanString(body.note);
  if (!stopId || !PROOF_TYPES.has(proofType)) {
    return json({ error: "A valid stop id and proof type are required." }, 400, cors);
  }

  const stop = await db.prepare(`
    SELECT s.*, r.driver_id AS route_driver_id
    FROM courier_stops s
    JOIN courier_routes r ON r.id = s.route_id AND r.company_id = s.company_id
    WHERE s.id = ? AND s.company_id = ?
  `).bind(stopId, tenant.companyId).first<Record<string, unknown>>();
  if (!stop) return json({ error: "Courier stop not found." }, 404, cors);

  const role = effectiveRole(tenant);
  if (role === "driver" && (!tenant.driverId || stop.route_driver_id !== tenant.driverId)) {
    return json({ error: "This courier stop is not assigned to this driver." }, 403, cors);
  }
  if (role !== "driver" && !canManage(tenant)) {
    return json({ error: "Dispatcher access required." }, 403, cors);
  }

  if (proofType === "scan" && stop.tracking_code) {
    if (normalizeCode(proofValue) !== normalizeCode(String(stop.tracking_code))) {
      return json({ error: "Scanned package code does not match this stop." }, 403, cors);
    }
  }

  if ((proofType === "photo" || proofType === "signature") && proofValue.length > 400000) {
    return json({ error: "Proof image is too large. Capture a smaller image." }, 413, cors);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO courier_proofs (
      id, company_id, route_id, stop_id, job_id, proof_type, proof_value, note, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    tenant.companyId,
    stop.route_id,
    stopId,
    stop.job_id || null,
    proofType,
    proofValue || null,
    note || null,
    now
  ).run();

  return json({ success: true, proof: { id, stopId, proofType, createdAt: now } }, 201, cors);
}

function toApiStop(row: Record<string, unknown>) {
  return {
    id: row.id,
    routeId: row.route_id,
    jobId: row.job_id,
    sequence: Number(row.sequence || 0),
    trackingCode: row.tracking_code,
    customerName: row.customer_name,
    phone: row.phone,
    address: row.address,
    lat: row.lat == null ? null : Number(row.lat),
    lon: row.lon == null ? null : Number(row.lon),
    packageLocation: row.package_location,
    priority: Number(row.priority || 0),
    timeWindowStart: row.time_window_start,
    timeWindowEnd: row.time_window_end,
    instructions: row.instructions,
    stopType: row.stop_type,
    pairKey: row.pair_key,
    status: row.status,
    failedReason: row.failed_reason,
    driverNote: row.driver_note,
    deliveredAt: row.delivered_at,
    proofCount: Number(row.proof_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function effectiveRole(tenant: TenantContext) {
  return tenant.userRole === "admin" ? "admin" : tenant.membershipRole;
}

function canManage(tenant: TenantContext) {
  return MANAGER_ROLES.has(effectiveRole(tenant));
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

function bearerToken(request: Request) {
  const auth = request.headers.get("Authorization") || "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function verificationToken(seed: string) {
  return seed.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase().padStart(8, "0");
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanString(value: unknown) {
  return clean(value).slice(0, 2000);
}

function normalizeCode(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function numberOrNull(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function integerOrNull(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function json(body: unknown, status: number, cors: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function corsHeaders(origin: string, allowedOrigins: string): HeadersInit {
  const allowed = allowedOrigins.split(",").map((item) => item.trim()).filter(Boolean);
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Vary": "Origin",
  };
}
