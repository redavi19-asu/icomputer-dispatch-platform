import clsx, { type ClassValue } from "clsx";
import { resolveTenantSlug } from "@/lib/platform/tenant-context";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export type BroadcastAlert = {
  message: string;
  timestamp: number;
};

const BROADCAST_ALERT_KEY_PREFIX = "dispatch_broadcast_alert";
export const BROADCAST_ALERT_UPDATED_EVENT = "dispatch:broadcast-alert-updated";

function broadcastAlertKey() {
  return `${BROADCAST_ALERT_KEY_PREFIX}:${resolveTenantSlug()}`;
}

function notifyBroadcastAlertUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(BROADCAST_ALERT_UPDATED_EVENT));
}

export function getBroadcastAlerts(): BroadcastAlert[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(broadcastAlertKey());
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item) =>
          item &&
          typeof item.message === "string" &&
          typeof item.timestamp === "number"
      );
    }

    if (
      parsed &&
      typeof parsed.message === "string" &&
      typeof parsed.timestamp === "number"
    ) {
      return [parsed];
    }

    return [];
  } catch {
    return [];
  }
}

export function addBroadcastAlert(alert: BroadcastAlert) {
  if (typeof window === "undefined") return;

  const current = getBroadcastAlerts();
  localStorage.setItem(
    broadcastAlertKey(),
    JSON.stringify([...current, alert])
  );
  notifyBroadcastAlertUpdated();
}

export function persistBroadcastAlerts(alerts: BroadcastAlert[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(broadcastAlertKey(), JSON.stringify(alerts));
  notifyBroadcastAlertUpdated();
}

export function clearBroadcastAlert() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(broadcastAlertKey());
  notifyBroadcastAlertUpdated();
}
