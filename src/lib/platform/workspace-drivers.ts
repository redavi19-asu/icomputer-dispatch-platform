import { getDriversByCompany } from "@/lib/platform/selectors";
import { resolveTenantSlug } from "@/lib/platform/tenant-context";
import type { Driver, DriverStatus } from "@/lib/platform/types";

export type DriverAccountStatus = "enabled" | "disabled";
export type DriverLiveWorkStatus =
  | "available"
  | "assigned"
  | "on-route"
  | "at-pickup"
  | "at-stop"
  | "completed"
  | "offline";
export type DriverInviteStatus =
  | "not-sent"
  | "invite-sent"
  | "invite-resent"
  | "joined";

export type WorkspaceDriver = {
  id: string;
  name: string;
  phone: string;
  zone: string;
  accountStatus: DriverAccountStatus;
  inviteStatus: DriverInviteStatus;
  liveWorkStatus: DriverLiveWorkStatus;
};

const DRIVERS_KEY_PREFIX = "dispatch.workspace.drivers.";
export const WORKSPACE_DRIVERS_UPDATED_EVENT = "dispatch:workspace-drivers-updated";

const getKey = (companySlug: string) => `${DRIVERS_KEY_PREFIX}${companySlug}`;

const toLiveWorkStatus = (status: DriverStatus): DriverLiveWorkStatus => {
  if (status === "offline") return "offline";
  if (status === "en-route") return "on-route";
  if (status === "busy") return "at-stop";
  return "available";
};

const asDispatchStatus = (status: DriverLiveWorkStatus, accountStatus: DriverAccountStatus): DriverStatus => {
  if (accountStatus === "disabled") return "offline";

  if (status === "on-route") return "en-route";
  if (status === "assigned" || status === "at-pickup" || status === "at-stop") return "busy";
  if (status === "completed") return "available";
  if (status === "offline") return "offline";
  return "available";
};

export const seedWorkspaceDrivers = (companyId: string): WorkspaceDriver[] => {
  return getDriversByCompany(companyId).map((driver, index) => ({
    id: driver.id,
    name: driver.name,
    phone: driver.phone ?? "",
    zone: driver.zone ?? "Unassigned",
    accountStatus: driver.status === "offline" ? "disabled" : "enabled",
    inviteStatus: index === 0 ? "joined" : "invite-sent",
    liveWorkStatus: toLiveWorkStatus(driver.status),
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

      const legacyIsActive = typeof item.isActive === "boolean" ? item.isActive : null;
      const accountStatus =
        item.accountStatus === "enabled" || item.accountStatus === "disabled"
          ? item.accountStatus
          : legacyIsActive === false
          ? "disabled"
          : "enabled";

      const inviteStatus =
        item.inviteStatus === "not-sent" ||
        item.inviteStatus === "invite-sent" ||
        item.inviteStatus === "invite-resent" ||
        item.inviteStatus === "joined"
          ? item.inviteStatus
          : item.inviteStatus === "pending"
          ? "not-sent"
          : item.inviteStatus === "invited"
          ? "invite-sent"
          : "joined";

      const legacyStatus =
        item.status === "available" ||
        item.status === "en-route" ||
        item.status === "busy" ||
        item.status === "offline"
          ? toLiveWorkStatus(item.status)
          : "available";

      const liveWorkStatus =
        item.liveWorkStatus === "available" ||
        item.liveWorkStatus === "assigned" ||
        item.liveWorkStatus === "on-route" ||
        item.liveWorkStatus === "at-pickup" ||
        item.liveWorkStatus === "at-stop" ||
        item.liveWorkStatus === "completed" ||
        item.liveWorkStatus === "offline"
          ? item.liveWorkStatus
          : accountStatus === "disabled"
          ? "offline"
          : legacyStatus;

      return {
        id,
        name,
        phone,
        zone,
        accountStatus,
        inviteStatus,
        liveWorkStatus,
      };
    });
};

export const readWorkspaceDrivers = (
  companyId: string,
  companySlug = "build-electric"
): WorkspaceDriver[] => {
  const resolvedSlug = resolveTenantSlug(companySlug);
  const fallback = seedWorkspaceDrivers(companyId);

  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(getKey(resolvedSlug));
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
  const resolvedSlug = resolveTenantSlug(companySlug);
  const normalized = normalizeWorkspaceDrivers(drivers);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(getKey(resolvedSlug), JSON.stringify(normalized));
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_DRIVERS_UPDATED_EVENT, {
        detail: { companySlug: resolvedSlug },
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
    status: asDispatchStatus(driver.liveWorkStatus, driver.accountStatus),
    zone: driver.zone,
  }));
};

export const getDriverInviteLabel = (status: DriverInviteStatus) => {
  if (status === "not-sent") return "Not Sent";
  if (status === "invite-sent") return "Invite Sent";
  if (status === "invite-resent") return "Invite Resent";
  return "Joined";
};

export const getDriverLiveWorkLabel = (status: DriverLiveWorkStatus) => {
  if (status === "available") return "Available";
  if (status === "assigned") return "Assigned";
  if (status === "on-route") return "On Route";
  if (status === "at-pickup") return "At Pickup";
  if (status === "at-stop") return "At Stop";
  if (status === "completed") return "Completed";
  return "Offline";
};
