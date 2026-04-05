import { getDriversByCompany } from "@/lib/platform/selectors";
import type { Driver, DriverStatus } from "@/lib/platform/types";

export type WorkspaceDriver = {
  id: string;
  name: string;
  phone: string;
  zone: string;
  isActive: boolean;
  inviteStatus: "invited" | "active" | "pending";
  status: DriverStatus;
};

const DRIVERS_KEY_PREFIX = "dispatch.workspace.drivers.";
export const WORKSPACE_DRIVERS_UPDATED_EVENT = "dispatch:workspace-drivers-updated";

const getKey = (companySlug: string) => `${DRIVERS_KEY_PREFIX}${companySlug}`;

const asDispatchStatus = (status: DriverStatus, isActive: boolean): DriverStatus => {
  if (!isActive) return "offline";
  return status === "offline" ? "available" : status;
};

export const seedWorkspaceDrivers = (companyId: string): WorkspaceDriver[] => {
  return getDriversByCompany(companyId).map((driver, index) => ({
    id: driver.id,
    name: driver.name,
    phone: driver.phone ?? "",
    zone: driver.zone ?? "Unassigned",
    isActive: driver.status !== "offline",
    inviteStatus: index === 0 ? "active" : "invited",
    status: driver.status,
  }));
};

export const normalizeWorkspaceDrivers = (value: unknown): WorkspaceDriver[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => {
      const id = typeof item.id === "string" ? item.id : `drv_${crypto.randomUUID().slice(0, 8)}`;
      const name = typeof item.name === "string" ? item.name : "Unnamed Driver";
      const phone = typeof item.phone === "string" ? item.phone : "";
      const zone = typeof item.zone === "string" && item.zone.trim().length > 0 ? item.zone : "Unassigned";
      const isActive = typeof item.isActive === "boolean" ? item.isActive : true;
      const inviteStatus =
        item.inviteStatus === "active" || item.inviteStatus === "pending" || item.inviteStatus === "invited"
          ? item.inviteStatus
          : "invited";
      const status =
        item.status === "available" || item.status === "en-route" || item.status === "busy" || item.status === "offline"
          ? asDispatchStatus(item.status, isActive)
          : asDispatchStatus("available", isActive);

      return {
        id,
        name,
        phone,
        zone,
        isActive,
        inviteStatus,
        status,
      };
    });
};

export const readWorkspaceDrivers = (
  companyId: string,
  companySlug = "build-electric"
): WorkspaceDriver[] => {
  const fallback = seedWorkspaceDrivers(companyId);

  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(getKey(companySlug));
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    const normalized = normalizeWorkspaceDrivers(parsed);
    return normalized.length > 0 ? normalized : fallback;
  } catch {
    return fallback;
  }
};

export const writeWorkspaceDrivers = (
  companySlug: string,
  drivers: WorkspaceDriver[]
): WorkspaceDriver[] => {
  const normalized = normalizeWorkspaceDrivers(drivers);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(getKey(companySlug), JSON.stringify(normalized));
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_DRIVERS_UPDATED_EVENT, {
        detail: { companySlug },
      })
    );
  }

  return normalized;
};

export const toPlatformDrivers = (
  drivers: WorkspaceDriver[],
  companyId: string
): Driver[] => {
  return drivers.map((driver) => ({
    id: driver.id,
    companyId,
    name: driver.name,
    phone: driver.phone,
    status: asDispatchStatus(driver.status, driver.isActive),
    zone: driver.zone,
  }));
};
