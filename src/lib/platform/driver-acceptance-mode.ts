export type DriverAcceptanceMode = "manual" | "auto";

const storageKeyForCompany = (companySlug: string) =>
  `dispatchos:driverAcceptanceMode:${companySlug}`;

export function getStoredDriverAcceptanceMode(
  companySlug?: string | null
): DriverAcceptanceMode | null {
  if (typeof window === "undefined" || !companySlug) return null;

  const raw = window.localStorage.getItem(storageKeyForCompany(companySlug));
  if (raw === "manual" || raw === "auto") return raw;

  return null;
}

export function setStoredDriverAcceptanceMode(
  companySlug: string,
  mode: DriverAcceptanceMode
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKeyForCompany(companySlug), mode);
}

export function resolveDriverAcceptanceMode(
  defaultMode: DriverAcceptanceMode,
  companySlug?: string | null
): DriverAcceptanceMode {
  return getStoredDriverAcceptanceMode(companySlug) ?? defaultMode;
}
