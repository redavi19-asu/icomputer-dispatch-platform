interface DriverPayEnv {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
}

type DriverPayAccount = {
  userId: string;
  userRole: string;
  membershipRole: string;
  companyId: string;
  companySlug: string;
  driverId: string | null;
};

type PayMethod = "per-job" | "job-plus-mile" | "per-mile" | "percentage";

type PayProfile = {
  driverId: string;
  method: PayMethod;
  baseJobPay: number;
  perMileRate: number;
  percentageRate: number;
  minimumJobPay: number;
  autoPayEligible: boolean;
};

const encoder = new TextEncoder();
const VALID_METHODS = new Set<PayMethod>(["per-job", "job-plus-mile", "per-mile", "percentage"]);
const VALID_SCHEDULES = new Set(["after-approval", "daily", "weekly"]);
const VALID_PROVIDERS = new Set(["not-connected", "stripe-connect", "payroll-export"]);
const VALID_EARNING_STATUSES = new Set(["calculated", "approved", "paid", "needs-review"]);

export async function handleDriverPayRequest(
  request: Request,
  env: DriverPayEnv
): Promise<Response | null> {
  const url = new URL(request.url);
  const isSettings = url.pathname === "/api/driver-pay/settings";
  const isEarnings = url.pathname === "/api/driver-pay/earnings";
  const earningMatch = url.pathname.match(/^\/api\/driver-pay\/earnings\/([^/]+)$/);

  if (!isSettings && !isEarnings && !earningMatch) return null;

  const cors = corsHeaders(request.headers.get("Origin") || "", env.ALLOWED_ORIGINS || "");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const account = await resolveAccount(request, env.DB);
  if (!account) return json({ error: "Unauthorized." }, 401, cors);

  if (isSettings) {
    if (request.method === "GET") return getSettings(env.DB, account, cors);
    if (request.method === "PUT") {
      if (!canManagePay(account)) return json({ error: "Owner or dispatcher access required." }, 403, cors);
      return putSettings(request, env.DB, account, cors);
    }
    return json({ error: "Method not allowed." }, 405, cors);
  }

  if (isEarnings) {
    if (request.method === "GET") return getEarnings(url, env.DB, account, cors);
    if (request.method === "POST") return createEarning(request, env.DB, account, cors);
    return json({ error: "Method not allowed." }, 405, cors);
  }

  if (earningMatch) {
    if (request.method !== "PATCH") return json({ error: "Method not allowed." }, 405, cors);
    if (!canManagePay(account)) return json({ error: "Owner or dispatcher access required." }, 403, cors);
    return patchEarning(decodeURIComponent(earningMatch[1]), request, env.DB, account, cors);
  }

  return null;
}

async function getSettings(db: D1Database, account: DriverPayAccount, cors: HeadersInit) {
  const row = await db.prepare(`
    SELECT * FROM driver_pay_settings WHERE company_id = ? LIMIT 1
  `).bind(account.companyId).first<Record<string, string | number | null>>();

  const profiles = await db.prepare(`
    SELECT * FROM driver_compensation_profiles
    WHERE company_id = ?
    ORDER BY driver_id ASC
  `).bind(account.companyId).all<Record<string, string | number | null>>();

  return json({
    success: true,
    company: { id: account.companyId, slug: account.companySlug },
    settings: mapSettings(account.companySlug, row),
    driverProfiles: Object.fromEntries(
      (profiles.results || []).map((profile) => {
        const mapped = mapProfile(profile);
        return [mapped.driverId, mapped];
      })
    ),
  }, 200, cors);
}

async function putSettings(
  request: Request,
  db: D1Database,
  account: DriverPayAccount,
  cors: HeadersInit
) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const defaultProfile = asRecord(body.defaultProfile);
  const driverProfiles = asRecord(body.driverProfiles);

  const method = normalizeMethod(defaultProfile.method, "job-plus-mile");
  const payoutSchedule = normalizeString(body.payoutSchedule, VALID_SCHEDULES, "after-approval");
  const payoutProvider = normalizeString(body.payoutProvider, VALID_PROVIDERS, "not-connected");
  const autoPayEnabled = Boolean(body.autoPayEnabled) && payoutProvider !== "not-connected";

  await db.prepare(`
    INSERT INTO driver_pay_settings (
      company_id, auto_pay_enabled, payout_schedule, payout_provider,
      default_pay_method, default_base_job_pay_cents, default_per_mile_cents,
      default_percentage_basis_points, default_minimum_job_pay_cents, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(company_id) DO UPDATE SET
      auto_pay_enabled = excluded.auto_pay_enabled,
      payout_schedule = excluded.payout_schedule,
      payout_provider = excluded.payout_provider,
      default_pay_method = excluded.default_pay_method,
      default_base_job_pay_cents = excluded.default_base_job_pay_cents,
      default_per_mile_cents = excluded.default_per_mile_cents,
      default_percentage_basis_points = excluded.default_percentage_basis_points,
      default_minimum_job_pay_cents = excluded.default_minimum_job_pay_cents,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    account.companyId,
    autoPayEnabled ? 1 : 0,
    payoutSchedule,
    payoutProvider,
    method,
    toCents(defaultProfile.baseJobPay, 20),
    toCents(defaultProfile.perMileRate, 0.65),
    toBasisPoints(defaultProfile.percentageRate, 0),
    toCents(defaultProfile.minimumJobPay, 20)
  ).run();

  const driverIds = Object.keys(driverProfiles);
  for (const driverId of driverIds) {
    const profileValue = asRecord(driverProfiles[driverId]);
    const driver = await db.prepare(
      "SELECT id FROM drivers WHERE id = ? AND company_id = ? LIMIT 1"
    ).bind(driverId, account.companyId).first<{ id: string }>();
    if (!driver?.id) continue;

    await db.prepare(`
      INSERT INTO driver_compensation_profiles (
        company_id, driver_id, pay_method, base_job_pay_cents, per_mile_cents,
        percentage_basis_points, minimum_job_pay_cents, auto_pay_eligible, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(company_id, driver_id) DO UPDATE SET
        pay_method = excluded.pay_method,
        base_job_pay_cents = excluded.base_job_pay_cents,
        per_mile_cents = excluded.per_mile_cents,
        percentage_basis_points = excluded.percentage_basis_points,
        minimum_job_pay_cents = excluded.minimum_job_pay_cents,
        auto_pay_eligible = excluded.auto_pay_eligible,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      account.companyId,
      driverId,
      normalizeMethod(profileValue.method, method),
      toCents(profileValue.baseJobPay, fromCents(toCents(defaultProfile.baseJobPay, 20))),
      toCents(profileValue.perMileRate, fromCents(toCents(defaultProfile.perMileRate, 0.65))),
      toBasisPoints(profileValue.percentageRate, fromBasisPoints(toBasisPoints(defaultProfile.percentageRate, 0))),
      toCents(profileValue.minimumJobPay, fromCents(toCents(defaultProfile.minimumJobPay, 20))),
      profileValue.autoPayEligible === false ? 0 : 1
    ).run();
  }

  return getSettings(db, account, cors);
}

async function getEarnings(url: URL, db: D1Database, account: DriverPayAccount, cors: HeadersInit) {
  const requestedDriverId = url.searchParams.get("driverId")?.trim() || "";
  const date = url.searchParams.get("date")?.trim() || "";

  let sql = `
    SELECT e.*, d.name AS driver_name, j.service AS service
    FROM driver_earnings e
    JOIN drivers d ON d.id = e.driver_id AND d.company_id = e.company_id
    LEFT JOIN jobs j ON j.id = e.job_id AND j.company_id = e.company_id
    WHERE e.company_id = ?
  `;
  const binds: Array<string> = [account.companyId];

  if (isDriverAccount(account)) {
    if (!account.driverId) return json({ success: true, earnings: [] }, 200, cors);
    sql += " AND e.driver_id = ?";
    binds.push(account.driverId);
  } else if (requestedDriverId) {
    sql += " AND e.driver_id = ?";
    binds.push(requestedDriverId);
  }

  if (date) {
    sql += " AND date(e.completed_at) = date(?)";
    binds.push(date);
  }

  sql += " ORDER BY datetime(e.completed_at) DESC LIMIT 500";
  const rows = await db.prepare(sql).bind(...binds).all<Record<string, string | number | null>>();

  return json({
    success: true,
    earnings: (rows.results || []).map(mapEarning),
  }, 200, cors);
}

async function createEarning(
  request: Request,
  db: D1Database,
  account: DriverPayAccount,
  cors: HeadersInit
) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
  const requestedDriverId = typeof body.driverId === "string" ? body.driverId.trim() : "";
  const milesValue = typeof body.miles === "number" ? body.miles : body.miles == null ? null : Number(body.miles);
  const customerCharge = numberOrNull(body.customerCharge);

  if (!jobId) return json({ error: "jobId is required." }, 400, cors);

  const job = await db.prepare(`
    SELECT id, driver_id, status, service, updated_at
    FROM jobs
    WHERE id = ? AND company_id = ?
    LIMIT 1
  `).bind(jobId, account.companyId).first<Record<string, string | null>>();

  if (!job?.id) return json({ error: "Job not found." }, 404, cors);
  if ((job.status || "").toLowerCase() !== "completed") {
    return json({ error: "Driver earnings can only be recorded for completed jobs." }, 409, cors);
  }

  const driverId = isDriverAccount(account)
    ? account.driverId || ""
    : requestedDriverId || job.driver_id || "";

  if (!driverId) return json({ error: "Completed job has no driver assigned." }, 400, cors);
  if (job.driver_id && job.driver_id !== driverId) return json({ error: "Driver does not match completed job." }, 409, cors);

  const driver = await db.prepare(
    "SELECT id, name FROM drivers WHERE id = ? AND company_id = ? LIMIT 1"
  ).bind(driverId, account.companyId).first<{ id: string; name: string }>();
  if (!driver?.id) return json({ error: "Driver not found." }, 404, cors);

  const existing = await db.prepare(`
    SELECT e.*, d.name AS driver_name, j.service AS service
    FROM driver_earnings e
    JOIN drivers d ON d.id = e.driver_id
    LEFT JOIN jobs j ON j.id = e.job_id
    WHERE e.company_id = ? AND e.job_id = ? AND e.driver_id = ?
    LIMIT 1
  `).bind(account.companyId, jobId, driverId).first<Record<string, string | number | null>>();
  if (existing) return json({ success: true, earning: mapEarning(existing), duplicate: true }, 200, cors);

  const { settings, profile } = await resolvePayProfile(db, account.companyId, account.companySlug, driverId);
  const miles = Number.isFinite(milesValue) && (milesValue as number) >= 0 ? Number(milesValue) : 0;
  const calculated = calculatePay(profile, miles, customerCharge, 0);
  const needsReview = milesValue == null || !Number.isFinite(milesValue);
  const status = needsReview
    ? "needs-review"
    : settings.autoPayEnabled && settings.payoutProvider !== "not-connected" && profile.autoPayEligible
    ? "approved"
    : "calculated";
  const id = `earn_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
  const completedAt = job.updated_at || new Date().toISOString();

  await db.prepare(`
    INSERT INTO driver_earnings (
      id, company_id, job_id, driver_id, completed_at, miles, customer_charge_cents,
      base_pay_cents, mileage_pay_cents, percentage_pay_cents, adjustment_cents,
      total_pay_cents, status, note, approved_at, payout_provider, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    id,
    account.companyId,
    jobId,
    driverId,
    completedAt,
    miles,
    customerCharge == null ? null : toCents(customerCharge, 0),
    toCents(calculated.basePay, 0),
    toCents(calculated.mileagePay, 0),
    toCents(calculated.percentagePay, 0),
    toCents(calculated.totalPay, 0),
    status,
    needsReview ? "Mileage was unavailable at completion and should be reviewed before payout." : null,
    status === "approved" ? new Date().toISOString() : null,
    settings.payoutProvider
  ).run();

  const created = await db.prepare(`
    SELECT e.*, d.name AS driver_name, j.service AS service
    FROM driver_earnings e
    JOIN drivers d ON d.id = e.driver_id
    LEFT JOIN jobs j ON j.id = e.job_id
    WHERE e.id = ? AND e.company_id = ?
    LIMIT 1
  `).bind(id, account.companyId).first<Record<string, string | number | null>>();

  return json({ success: true, earning: created ? mapEarning(created) : null }, 201, cors);
}

async function patchEarning(
  earningId: string,
  request: Request,
  db: D1Database,
  account: DriverPayAccount,
  cors: HeadersInit
) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const status = typeof body.status === "string" ? body.status.trim() : "";
  const adjustment = numberOrNull(body.adjustment);
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : null;

  const existing = await db.prepare(`
    SELECT * FROM driver_earnings WHERE id = ? AND company_id = ? LIMIT 1
  `).bind(earningId, account.companyId).first<Record<string, string | number | null>>();
  if (!existing) return json({ error: "Earning not found." }, 404, cors);

  let nextTotalCents = Number(existing.total_pay_cents || 0);
  let nextAdjustmentCents = Number(existing.adjustment_cents || 0);

  if (adjustment != null) {
    const resolved = await resolvePayProfile(db, account.companyId, account.companySlug, String(existing.driver_id || ""));
    const calculated = calculatePay(
      resolved.profile,
      Number(existing.miles || 0),
      existing.customer_charge_cents == null ? null : fromCents(Number(existing.customer_charge_cents)),
      adjustment
    );
    nextAdjustmentCents = toCents(adjustment, 0);
    nextTotalCents = toCents(calculated.totalPay, 0);
  }

  const nextStatus = status && VALID_EARNING_STATUSES.has(status) ? status : String(existing.status || "calculated");
  const now = new Date().toISOString();

  await db.prepare(`
    UPDATE driver_earnings
    SET status = ?, adjustment_cents = ?, total_pay_cents = ?,
        note = COALESCE(?, note),
        approved_at = CASE WHEN ? = 'approved' AND approved_at IS NULL THEN ? ELSE approved_at END,
        paid_at = CASE WHEN ? = 'paid' THEN ? ELSE paid_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND company_id = ?
  `).bind(
    nextStatus,
    nextAdjustmentCents,
    nextTotalCents,
    note,
    nextStatus,
    now,
    nextStatus,
    now,
    earningId,
    account.companyId
  ).run();

  const updated = await db.prepare(`
    SELECT e.*, d.name AS driver_name, j.service AS service
    FROM driver_earnings e
    JOIN drivers d ON d.id = e.driver_id
    LEFT JOIN jobs j ON j.id = e.job_id
    WHERE e.id = ? AND e.company_id = ? LIMIT 1
  `).bind(earningId, account.companyId).first<Record<string, string | number | null>>();

  return json({ success: true, earning: updated ? mapEarning(updated) : null }, 200, cors);
}

async function resolvePayProfile(
  db: D1Database,
  companyId: string,
  companySlug: string,
  driverId: string
) {
  const settingsRow = await db.prepare(
    "SELECT * FROM driver_pay_settings WHERE company_id = ? LIMIT 1"
  ).bind(companyId).first<Record<string, string | number | null>>();
  const settings = mapSettings(companySlug, settingsRow);

  const profileRow = await db.prepare(`
    SELECT * FROM driver_compensation_profiles
    WHERE company_id = ? AND driver_id = ? LIMIT 1
  `).bind(companyId, driverId).first<Record<string, string | number | null>>();

  const profile: PayProfile = profileRow
    ? mapProfile(profileRow)
    : { driverId, ...settings.defaultProfile };

  return { settings, profile };
}

function calculatePay(profile: PayProfile, miles: number, customerCharge: number | null, adjustment: number) {
  const safeMiles = Math.max(0, Number.isFinite(miles) ? miles : 0);
  const safeCharge = Math.max(0, customerCharge || 0);
  const basePay = profile.method === "per-mile" || profile.method === "percentage" ? 0 : profile.baseJobPay;
  const mileagePay = profile.method === "job-plus-mile" || profile.method === "per-mile" ? safeMiles * profile.perMileRate : 0;
  const percentagePay = profile.method === "percentage" ? safeCharge * (profile.percentageRate / 100) : 0;
  const totalPay = Math.max(profile.minimumJobPay, basePay + mileagePay + percentagePay + adjustment);
  return {
    basePay: roundMoney(basePay),
    mileagePay: roundMoney(mileagePay),
    percentagePay: roundMoney(percentagePay),
    adjustment: roundMoney(adjustment),
    totalPay: roundMoney(totalPay),
  };
}

function mapSettings(companySlug: string, row?: Record<string, string | number | null> | null) {
  return {
    companySlug,
    autoPayEnabled: Number(row?.auto_pay_enabled || 0) === 1,
    payoutSchedule: String(row?.payout_schedule || "after-approval"),
    payoutProvider: String(row?.payout_provider || "not-connected"),
    defaultProfile: {
      method: normalizeMethod(row?.default_pay_method, "job-plus-mile"),
      baseJobPay: fromCents(Number(row?.default_base_job_pay_cents ?? 2000)),
      perMileRate: fromCents(Number(row?.default_per_mile_cents ?? 65)),
      percentageRate: fromBasisPoints(Number(row?.default_percentage_basis_points ?? 0)),
      minimumJobPay: fromCents(Number(row?.default_minimum_job_pay_cents ?? 2000)),
      autoPayEligible: true,
    },
    updatedAt: String(row?.updated_at || new Date().toISOString()),
  };
}

function mapProfile(row: Record<string, string | number | null>): PayProfile {
  return {
    driverId: String(row.driver_id || ""),
    method: normalizeMethod(row.pay_method, "job-plus-mile"),
    baseJobPay: fromCents(Number(row.base_job_pay_cents || 0)),
    perMileRate: fromCents(Number(row.per_mile_cents || 0)),
    percentageRate: fromBasisPoints(Number(row.percentage_basis_points || 0)),
    minimumJobPay: fromCents(Number(row.minimum_job_pay_cents || 0)),
    autoPayEligible: Number(row.auto_pay_eligible ?? 1) === 1,
  };
}

function mapEarning(row: Record<string, string | number | null>) {
  return {
    id: String(row.id || ""),
    companySlug: "",
    jobId: String(row.job_id || ""),
    driverId: String(row.driver_id || ""),
    driverName: String(row.driver_name || ""),
    service: String(row.service || ""),
    completedAt: String(row.completed_at || ""),
    miles: Number(row.miles || 0),
    customerCharge: row.customer_charge_cents == null ? null : fromCents(Number(row.customer_charge_cents)),
    basePay: fromCents(Number(row.base_pay_cents || 0)),
    mileagePay: fromCents(Number(row.mileage_pay_cents || 0)),
    percentagePay: fromCents(Number(row.percentage_pay_cents || 0)),
    adjustment: fromCents(Number(row.adjustment_cents || 0)),
    totalPay: fromCents(Number(row.total_pay_cents || 0)),
    status: String(row.status || "calculated"),
    note: row.note ? String(row.note) : undefined,
  };
}

async function resolveAccount(request: Request, db: D1Database): Promise<DriverPayAccount | null> {
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
      d.id AS driver_id
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    JOIN memberships m ON m.user_id = u.id
    JOIN companies c ON c.id = m.company_id
    LEFT JOIN drivers d ON d.user_id = u.id AND d.company_id = c.id
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
    driverId: row.driver_id || null,
  };
}

function canManagePay(account: DriverPayAccount) {
  return ["owner", "dispatcher", "admin"].includes(account.membershipRole) || account.userRole === "admin";
}

function isDriverAccount(account: DriverPayAccount) {
  return account.membershipRole === "driver" || account.userRole === "driver";
}

function normalizeMethod(value: unknown, fallback: PayMethod): PayMethod {
  const normalized = String(value || "") as PayMethod;
  return VALID_METHODS.has(normalized) ? normalized : fallback;
}

function normalizeString(value: unknown, allowed: Set<string>, fallback: string) {
  const normalized = String(value || "");
  return allowed.has(normalized) ? normalized : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toCents(value: unknown, fallbackDollars: number) {
  const parsed = numberOrNull(value);
  return Math.round(Math.max(0, parsed == null ? fallbackDollars : parsed) * 100);
}

function fromCents(value: number) {
  return Math.round(value) / 100;
}

function toBasisPoints(value: unknown, fallbackPercent: number) {
  const parsed = numberOrNull(value);
  return Math.round(Math.max(0, parsed == null ? fallbackPercent : parsed) * 100);
}

function fromBasisPoints(value: number) {
  return value / 100;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
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
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
    Vary: "Origin",
  });
  if (origin && allowed.includes(origin)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

function json(data: unknown, status: number, headers: HeadersInit) {
  return new Response(JSON.stringify(data), { status, headers });
}
