import { resolveTenantSlug } from "@/lib/platform/tenant-context";

export type DriverPayMethod = "per-job" | "job-plus-mile" | "per-mile" | "percentage";
export type DriverPayoutSchedule = "after-approval" | "daily" | "weekly";
export type DriverPayoutProvider = "not-connected" | "stripe-connect" | "payroll-export";
export type DriverEarningStatus = "calculated" | "approved" | "paid" | "needs-review";

export type DriverPayProfile = {
  driverId: string;
  method: DriverPayMethod;
  baseJobPay: number;
  perMileRate: number;
  percentageRate: number;
  minimumJobPay: number;
  autoPayEligible: boolean;
};

export type CompanyDriverPaySettings = {
  companySlug: string;
  autoPayEnabled: boolean;
  payoutSchedule: DriverPayoutSchedule;
  payoutProvider: DriverPayoutProvider;
  defaultProfile: Omit<DriverPayProfile, "driverId">;
  driverProfiles: Record<string, DriverPayProfile>;
  updatedAt: string;
};

export type DriverEarningRecord = {
  id: string;
  companySlug: string;
  jobId: string;
  driverId: string;
  driverName?: string;
  service?: string;
  completedAt: string;
  miles: number;
  customerCharge?: number | null;
  basePay: number;
  mileagePay: number;
  percentagePay: number;
  adjustment: number;
  totalPay: number;
  status: DriverEarningStatus;
  note?: string;
};

const SETTINGS_KEY_PREFIX = "dispatch.driver-pay.settings.";
const EARNINGS_KEY_PREFIX = "dispatch.driver-pay.earnings.";

export const DRIVER_PAY_UPDATED_EVENT = "dispatch:driver-pay-updated";

const money = (value: number) => Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
const positive = (value: unknown, fallback = 0) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const settingsKey = (slug: string) => `${SETTINGS_KEY_PREFIX}${resolveTenantSlug(slug)}`;
const earningsKey = (slug: string) => `${EARNINGS_KEY_PREFIX}${resolveTenantSlug(slug)}`;

export const defaultDriverPaySettings = (companySlug: string): CompanyDriverPaySettings => ({
  companySlug: resolveTenantSlug(companySlug),
  autoPayEnabled: false,
  payoutSchedule: "after-approval",
  payoutProvider: "not-connected",
  defaultProfile: {
    method: "job-plus-mile",
    baseJobPay: 20,
    perMileRate: 0.65,
    percentageRate: 0,
    minimumJobPay: 20,
    autoPayEligible: true,
  },
  driverProfiles: {},
  updatedAt: new Date().toISOString(),
});

export const readDriverPaySettings = (companySlug: string): CompanyDriverPaySettings => {
  const fallback = defaultDriverPaySettings(companySlug);
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(settingsKey(companySlug));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<CompanyDriverPaySettings>;
    const defaultProfile = parsed.defaultProfile ?? fallback.defaultProfile;
    const driverProfiles = parsed.driverProfiles && typeof parsed.driverProfiles === "object" ? parsed.driverProfiles : {};

    return {
      ...fallback,
      ...parsed,
      companySlug: resolveTenantSlug(companySlug),
      defaultProfile: {
        ...fallback.defaultProfile,
        ...defaultProfile,
        baseJobPay: positive(defaultProfile.baseJobPay, fallback.defaultProfile.baseJobPay),
        perMileRate: positive(defaultProfile.perMileRate, fallback.defaultProfile.perMileRate),
        percentageRate: positive(defaultProfile.percentageRate, fallback.defaultProfile.percentageRate),
        minimumJobPay: positive(defaultProfile.minimumJobPay, fallback.defaultProfile.minimumJobPay),
      },
      driverProfiles: driverProfiles as Record<string, DriverPayProfile>,
    };
  } catch {
    return fallback;
  }
};

export const writeDriverPaySettings = (
  companySlug: string,
  settings: CompanyDriverPaySettings
): CompanyDriverPaySettings => {
  const next = {
    ...settings,
    companySlug: resolveTenantSlug(companySlug),
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(settingsKey(companySlug), JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(DRIVER_PAY_UPDATED_EVENT, { detail: { companySlug: next.companySlug } }));
  }
  return next;
};

export const getDriverPayProfile = (
  settings: CompanyDriverPaySettings,
  driverId: string
): DriverPayProfile => ({
  driverId,
  ...settings.defaultProfile,
  ...(settings.driverProfiles[driverId] ?? {}),
});

export const calculateDriverPay = ({
  profile,
  miles,
  customerCharge,
  adjustment = 0,
}: {
  profile: DriverPayProfile;
  miles: number;
  customerCharge?: number | null;
  adjustment?: number;
}) => {
  const safeMiles = positive(miles);
  const safeCharge = positive(customerCharge);

  const basePay = profile.method === "per-mile" || profile.method === "percentage" ? 0 : positive(profile.baseJobPay);
  const mileagePay = profile.method === "job-plus-mile" || profile.method === "per-mile" ? safeMiles * positive(profile.perMileRate) : 0;
  const percentagePay = profile.method === "percentage" ? safeCharge * (positive(profile.percentageRate) / 100) : 0;
  const computed = basePay + mileagePay + percentagePay + adjustment;
  const totalPay = Math.max(positive(profile.minimumJobPay), computed);

  return {
    basePay: money(basePay),
    mileagePay: money(mileagePay),
    percentagePay: money(percentagePay),
    adjustment: money(adjustment),
    totalPay: money(totalPay),
  };
};

export const readDriverEarnings = (companySlug: string): DriverEarningRecord[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(earningsKey(companySlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DriverEarningRecord[]) : [];
  } catch {
    return [];
  }
};

export const writeDriverEarnings = (
  companySlug: string,
  records: DriverEarningRecord[]
): DriverEarningRecord[] => {
  const normalized = [...records]
    .filter((record) => record && record.jobId && record.driverId)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  if (typeof window !== "undefined") {
    window.localStorage.setItem(earningsKey(companySlug), JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(DRIVER_PAY_UPDATED_EVENT, { detail: { companySlug: resolveTenantSlug(companySlug) } }));
  }
  return normalized;
};

export const recordCompletedJobEarning = ({
  companySlug,
  jobId,
  driverId,
  driverName,
  service,
  miles,
  customerCharge,
  completedAt = new Date().toISOString(),
}: {
  companySlug: string;
  jobId: string;
  driverId: string;
  driverName?: string;
  service?: string;
  miles?: number | null;
  customerCharge?: number | null;
  completedAt?: string;
}) => {
  const settings = readDriverPaySettings(companySlug);
  const profile = getDriverPayProfile(settings, driverId);
  const calculated = calculateDriverPay({ profile, miles: positive(miles), customerCharge });
  const records = readDriverEarnings(companySlug);
  const existing = records.find((record) => record.jobId === jobId && record.driverId === driverId);
  if (existing) return existing;

  const record: DriverEarningRecord = {
    id: `earn_${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 12) : Date.now()}`,
    companySlug: resolveTenantSlug(companySlug),
    jobId,
    driverId,
    driverName,
    service,
    completedAt,
    miles: money(positive(miles)),
    customerCharge: customerCharge == null ? null : money(positive(customerCharge)),
    ...calculated,
    status: miles == null ? "needs-review" : settings.autoPayEnabled && settings.payoutProvider !== "not-connected" && profile.autoPayEligible ? "approved" : "calculated",
    note: miles == null ? "Mileage was unavailable at completion and should be reviewed before payout." : undefined,
  };

  writeDriverEarnings(companySlug, [record, ...records]);
  return record;
};

export const updateDriverEarningStatus = (
  companySlug: string,
  earningId: string,
  status: DriverEarningStatus
) => {
  const records = readDriverEarnings(companySlug).map((record) =>
    record.id === earningId ? { ...record, status } : record
  );
  return writeDriverEarnings(companySlug, records);
};

export const updateDriverEarningAdjustment = (
  companySlug: string,
  earningId: string,
  adjustment: number,
  note?: string
) => {
  const settings = readDriverPaySettings(companySlug);
  const records = readDriverEarnings(companySlug).map((record) => {
    if (record.id !== earningId) return record;
    const profile = getDriverPayProfile(settings, record.driverId);
    const calculated = calculateDriverPay({
      profile,
      miles: record.miles,
      customerCharge: record.customerCharge,
      adjustment,
    });
    return {
      ...record,
      ...calculated,
      note: note?.trim() || record.note,
      status: "calculated" as const,
    };
  });
  return writeDriverEarnings(companySlug, records);
};

export const formatDriverPayMethod = (method: DriverPayMethod) => {
  if (method === "per-job") return "Flat per job";
  if (method === "job-plus-mile") return "Job + mileage";
  if (method === "per-mile") return "Mileage only";
  return "Percentage of job";
};
