-- DispatchOS driver compensation + earnings ledger
-- Additive migration: safe for existing companies/jobs/drivers.

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

CREATE INDEX IF NOT EXISTS idx_driver_compensation_company
  ON driver_compensation_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_company
  ON driver_earnings(company_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_company_driver
  ON driver_earnings(company_id, driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_company_completed
  ON driver_earnings(company_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_company_status
  ON driver_earnings(company_id, status);
