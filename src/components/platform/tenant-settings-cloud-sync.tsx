"use client";

import { useEffect, useRef } from "react";
import { authRequest, getApiBase, getStoredSession } from "@/lib/dispatchos-auth";
import {
  readWorkspaceSettings,
  writeWorkspaceSettings,
  type WorkspaceSettingsState,
} from "@/lib/platform/workspace-preferences";

const SETTINGS_UPDATED_EVENT = "dispatch:workspace-settings-updated";

type SettingsResponse = {
  success?: boolean;
  companySlug?: string;
  settings?: Partial<WorkspaceSettingsState> | null;
  updatedAt?: string | null;
};

const isOperationalPath = () => {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname.replace(/^\/icomputer-dispatch-platform/, "");
  return /^\/(workspace|dashboard|driver|download|billing)(\/|$)/.test(path);
};

export function TenantSettingsCloudSync() {
  const busyRef = useRef(false);
  const lastRemoteRef = useRef("");

  useEffect(() => {
    if (!isOperationalPath() || !getApiBase()) return;

    const session = getStoredSession();
    if (!session?.token || !session.company?.slug) return;

    const companySlug = session.company.slug;
    const canManage = session.user.role !== "driver";
    let cancelled = false;

    const serialize = (settings: WorkspaceSettingsState) =>
      JSON.stringify({ ...settings, companySlug });

    const pull = async () => {
      if (busyRef.current || cancelled) return;
      busyRef.current = true;

      try {
        const response = (await authRequest(
          "/api/workspace-settings",
          { method: "GET", cache: "no-store" }
        )) as SettingsResponse;

        if (cancelled || response.companySlug !== companySlug) return;

        const local = readWorkspaceSettings(companySlug);

        if (response.settings) {
          const remote = {
            ...local,
            ...response.settings,
            companySlug,
          } as WorkspaceSettingsState;
          const remoteSerialized = serialize(remote);
          lastRemoteRef.current = remoteSerialized;

          if (serialize(local) !== remoteSerialized) {
            writeWorkspaceSettings(remote);
          }
        } else if (canManage && local.setupComplete) {
          const localSerialized = serialize(local);
          await authRequest("/api/workspace-settings", {
            method: "PUT",
            body: JSON.stringify({ settings: local }),
          });
          lastRemoteRef.current = localSerialized;
        }
      } catch {
        // Keep the company-scoped local configuration available while offline.
      } finally {
        busyRef.current = false;
      }
    };

    const push = async () => {
      if (!canManage || busyRef.current || cancelled) return;

      const currentSession = getStoredSession();
      if (currentSession?.company?.slug !== companySlug) return;

      const settings = readWorkspaceSettings(companySlug);
      if (!settings.setupComplete) return;

      const serialized = serialize(settings);
      if (serialized === lastRemoteRef.current) return;

      busyRef.current = true;
      try {
        const response = (await authRequest("/api/workspace-settings", {
          method: "PUT",
          body: JSON.stringify({ settings }),
        })) as SettingsResponse;

        if (response.companySlug === companySlug) {
          lastRemoteRef.current = serialized;
        }
      } catch {
        // A later settings event or polling cycle will retry.
      } finally {
        busyRef.current = false;
      }
    };

    const onSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ companySlug?: string }>).detail;
      if (detail?.companySlug && detail.companySlug !== companySlug) return;
      void push();
    };

    void pull();
    const poll = window.setInterval(() => void pull(), 10_000);
    window.addEventListener(
      SETTINGS_UPDATED_EVENT,
      onSettingsUpdated as EventListener
    );

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.removeEventListener(
        SETTINGS_UPDATED_EVENT,
        onSettingsUpdated as EventListener
      );
    };
  }, []);

  return null;
}
