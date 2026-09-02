import { resolveTenantSlug } from "@/lib/platform/tenant-context";

export type DriverAcceptanceMode = "manual" | "auto";

const storageKeyForCompany = (companySlug: string) =>
  `dispatchos:driverAcceptanceMode:${companySlug}`;

export function getStoredDriverAcceptanceMode(
  companySlug?: string | null
): DriverAcceptanceMode | null {
  if (typeof window === "undefined" || !companySlug) return null;

  const resolvedSlug = resolveTenantSlug(companySlug);
  const raw = window.localStorage.getItem(storageKeyForCompany(resolvedSlug));
  if (raw === "manual" || raw === "auto") return raw;

  return null;
}

export function setStoredDriverAcceptanceMode(
  companySlug: string,
  mode: DriverAcceptanceMode
) {
  if (typeof window === "undefined") return;
  const resolvedSlug = resolveTenantSlug(companySlug);
  window.localStorage.setItem(storageKeyForCompany(resolvedSlug), mode);
}

export function resolveDriverAcceptanceMode(
  defaultMode: DriverAcceptanceMode,
  companySlug?: string | null
): DriverAcceptanceMode {
  return getStoredDriverAcceptanceMode(companySlug) ?? defaultMode;
}
