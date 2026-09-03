import { resolveTenantSlug } from "@/lib/platform/tenant-context";
import { readWorkspaceSettings } from "@/lib/platform/workspace-preferences";

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
  // Workspace settings are the source of truth. The legacy per-driver-mode key
  // remains only as a fallback for older saved sessions.
  if (typeof window !== "undefined" && companySlug) {
    const workspaceMode = readWorkspaceSettings(companySlug).driverAcceptanceMode;
    if (workspaceMode === "manual" || workspaceMode === "auto") {
      return workspaceMode;
    }
  }

  return getStoredDriverAcceptanceMode(companySlug) ?? defaultMode;
}
