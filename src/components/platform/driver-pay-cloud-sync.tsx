"use client";

import { useEffect, useRef } from "react";

import { authRequest, getStoredSession } from "@/lib/dispatchos-auth";
import {
  DRIVER_PAY_UPDATED_EVENT,
  readDriverEarnings,
  readDriverPaySettings,
  writeDriverEarnings,
  writeDriverPaySettings,
  type CompanyDriverPaySettings,
  type DriverEarningRecord,
} from "@/lib/platform/driver-compensation";

export function DriverPayCloudSync() {
  const applyingRemoteRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) return;
    const companySlug = session.company.slug;

    const applyRemote = async () => {
      try {
        const [settingsData, earningsData] = await Promise.all([
          authRequest("/api/driver-pay/settings", { method: "GET", cache: "no-store" }),
          authRequest("/api/driver-pay/earnings", { method: "GET", cache: "no-store" }),
        ]);

        applyingRemoteRef.current = true;
        const remoteSettings = settingsData?.settings as CompanyDriverPaySettings | undefined;
        const remoteProfiles =
          settingsData?.driverProfiles && typeof settingsData.driverProfiles === "object"
            ? settingsData.driverProfiles
            : {};

        if (remoteSettings) {
          writeDriverPaySettings(companySlug, {
            ...remoteSettings,
            companySlug,
            driverProfiles: remoteProfiles,
          });
        }

        if (Array.isArray(earningsData?.earnings)) {
          writeDriverEarnings(companySlug, earningsData.earnings as DriverEarningRecord[]);
        }
      } catch {
        // Static/demo mode intentionally keeps using the local compensation store.
      } finally {
        window.setTimeout(() => {
          applyingRemoteRef.current = false;
        }, 0);
      }
    };

    const pushLocal = async () => {
      if (applyingRemoteRef.current) return;

      const settings = readDriverPaySettings(companySlug);
      const localEarnings = readDriverEarnings(companySlug);

      try {
        await authRequest("/api/driver-pay/settings", {
          method: "PUT",
          body: JSON.stringify(settings),
        });

        for (const earning of localEarnings) {
          let canonicalEarningId = earning.id;

          try {
            const created = await authRequest("/api/driver-pay/earnings", {
              method: "POST",
              body: JSON.stringify({
                jobId: earning.jobId,
                driverId: earning.driverId,
                miles: earning.miles,
                customerCharge: earning.customerCharge ?? null,
              }),
            });
            if (created?.earning?.id) canonicalEarningId = String(created.earning.id);
          } catch {
            // The job may only exist in static/demo mode; keep the local ledger intact.
          }

          try {
            await authRequest(
              `/api/driver-pay/earnings/${encodeURIComponent(canonicalEarningId)}`,
              {
                method: "PATCH",
                body: JSON.stringify({
                  status: earning.status,
                  adjustment: earning.adjustment,
                  note: earning.note,
                }),
              }
            );
          } catch {
            // Backend unavailable or this is a local-only demo earning.
          }
        }

        await applyRemote();
      } catch {
        // Backend unavailable: retain the local workspace data and retry on a future edit/reload.
      }
    };

    const queuePush = () => {
      if (applyingRemoteRef.current) return;
      if (syncTimerRef.current != null) window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = window.setTimeout(() => void pushLocal(), 450);
    };

    void applyRemote();
    window.addEventListener(DRIVER_PAY_UPDATED_EVENT, queuePush as EventListener);

    return () => {
      window.removeEventListener(DRIVER_PAY_UPDATED_EVENT, queuePush as EventListener);
      if (syncTimerRef.current != null) window.clearTimeout(syncTimerRef.current);
    };
  }, []);

  return null;
}
