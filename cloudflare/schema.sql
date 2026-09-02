PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, company_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL CHECK(plan IN ('basic', 'business', 'custom')),
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Operational data is tenant-owned. Every row below carries company_id so
-- the API can scope all reads/writes to the company derived from the session.
CREATE TABLE IF NOT EXISTS drivers (
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
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jobs (
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
);

CREATE TABLE IF NOT EXISTS driver_invites (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'driver',
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS company_settings (
  company_id TEXT PRIMARY KEY,
  dispatch_mode TEXT NOT NULL DEFAULT 'Manual',
  driver_acceptance_mode TEXT NOT NULL DEFAULT 'manual',
  booking_enabled INTEGER NOT NULL DEFAULT 1,
  driver_app_enabled INTEGER NOT NULL DEFAULT 1,
  customer_updates_enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Driver compensation is intentionally separate from subscription billing.
-- DispatchOS calculates/approves earnings here; a connected payout or payroll
-- provider remains the authority for real money movement.
CREATE TABLE IF NOT EXISTS driver_pay_settings (
  company_id TEXT PRIMARY KEY,
  auto_pay_enabled INTEGER NOT NULL DEFAULT 0,
  payout_schedule TEXT NOT NULL DEFAULT 'after-approval' CHECK(payout_schedule IN ('after-approval', 'daily', 'weekly')),
  payout_provider TEXT NOT NULL DEFAULT 'not-connected' CHECK(payout_provider IN ('not-connected', 'stripe-connect', 'payroll-export')),
  default_pay_method TEXT NOT NULL DEFAULT 'job-plus-mile' CHECK(default_pay_method IN ('per-job', 'job-plus-mile', 'per-mile', 'percentage')),
  default_base_job_pay_cents INTEGER NOT NULL DEFAULT 2000,
  default_per_mile_cents INTEGER NOT NULL DEFAULT 65,
  default_percentage_basis_points INTEGER NOT NULL DEFAULT 0,
  default_minimum_job_pay_cents INTEGER NOT NULL DEFAULT 2000,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS driver_compensation_profiles (
  company_id TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  pay_method TEXT NOT NULL DEFAULT 'job-plus-mile' CHECK(pay_method IN ('per-job', 'job-plus-mile', 'per-mile', 'percentage')),
  base_job_pay_cents INTEGER NOT NULL DEFAULT 2000,
  per_mile_cents INTEGER NOT NULL DEFAULT 65,
  percentage_basis_points INTEGER NOT NULL DEFAULT 0,
  minimum_job_pay_cents INTEGER NOT NULL DEFAULT 2000,
  auto_pay_eligible INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(company_id, driver_id),
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS driver_earnings (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  miles REAL NOT NULL DEFAULT 0,
  customer_charge_cents INTEGER,
  base_pay_cents INTEGER NOT NULL DEFAULT 0,
  mileage_pay_cents INTEGER NOT NULL DEFAULT 0,
  percentage_pay_cents INTEGER NOT NULL DEFAULT 0,
  adjustment_cents INTEGER NOT NULL DEFAULT 0,
  total_pay_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'calculated' CHECK(status IN ('calculated', 'approved', 'paid', 'needs-review')),
  note TEXT,
  approved_at TEXT,
  paid_at TEXT,
  payout_provider TEXT,
  provider_transfer_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, job_id, driver_id),
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY(driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_company ON memberships(company_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_drivers_company ON drivers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_company_status ON jobs(company_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_company_driver ON jobs(company_id, driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_invites_company ON driver_invites(company_id);
CREATE INDEX IF NOT EXISTS idx_driver_compensation_company ON driver_compensation_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_company ON driver_earnings(company_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_company_driver ON driver_earnings(company_id, driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_company_completed ON driver_earnings(company_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_company_status ON driver_earnings(company_id, status);
