"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  readWorkspaceSettings,
  type WorkspaceSettingsState,
} from "@/lib/platform/workspace-preferences";

const WORKSPACE_SETTINGS_UPDATED_EVENT = "dispatch:workspace-settings-updated";

const navItems = [
  { label: "Settings", href: "/workspace/settings", key: "settings" },
  { label: "Billing", href: "/billing", key: "billing" },
  { label: "Drivers", href: "/workspace/drivers", key: "drivers" },
  { label: "Booking", href: "/build-electric/booking", key: "booking" },
  { label: "Dispatch", href: "/dashboard", key: "dispatch" },
  { label: "Workspace", href: "/workspace", key: "workspace" },
] as const;

const isActivePath = (pathname: string, href: string) => {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
};

export function AppShellNav() {
  const pathname = usePathname();
  const [settings, setSettings] = useState<WorkspaceSettingsState>(() =>
    readWorkspaceSettings("build-electric")
  );

  useEffect(() => {
    const sync = () => {
      setSettings(readWorkspaceSettings("build-electric"));
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(WORKSPACE_SETTINGS_UPDATED_EVENT, sync as EventListener);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(WORKSPACE_SETTINGS_UPDATED_EVENT, sync as EventListener);
    };
  }, []);

  const disabledBySettings = useMemo(() => {
    const disableBooking =
      !settings.bookingPageEnabled || settings.jobIntakeSource === "dashboard";
    const disableDrivers = !settings.driverAppEnabled;

    return {
      booking: disableBooking,
      drivers: disableDrivers,
    };
  }, [settings.bookingPageEnabled, settings.driverAppEnabled, settings.jobIntakeSource]);

  return (
    <div className="border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-6 py-3">
        {navItems.map((item) => {
          const disabled =
            item.key === "booking"
              ? disabledBySettings.booking
              : item.key === "drivers"
              ? disabledBySettings.drivers
              : false;
          const active = isActivePath(pathname, item.href);

          if (disabled) {
            return (
              <span
                key={item.href}
                className="inline-flex cursor-not-allowed items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/40"
                title="Disabled in workspace settings"
              >
                {item.label}
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center rounded-lg border px-3 py-2 text-sm transition ${
                active
                  ? "border-cyan-400/45 bg-cyan-500/15 text-cyan-100"
                  : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/10"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
