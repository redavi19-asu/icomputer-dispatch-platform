"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Crown, LogOut } from "lucide-react";
import { getStoredSession, logoutSession } from "@/lib/dispatchos-auth";

const navItems = [
  { label: "Workspace", href: "/workspace" },
  { label: "Company Settings", href: "/workspace/settings" },
  { label: "Drivers", href: "/workspace/drivers" },
  { label: "Driver Pay", href: "/workspace/driver-pay" },
  { label: "Invite Driver", href: "/workspace/driver-invite" },
  { label: "Billing", href: "/billing" },
  { label: "Downloads", href: "/download" },
] as const;

const isActivePath = (pathname: string, href: string) => {
  if (href === "/workspace") return pathname === "/workspace";
  return pathname === href || pathname.startsWith(`${href}/`);
};

const appBase = () =>
  process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "";

export function AppShellNav() {
  const pathname = usePathname();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setIsPlatformAdmin(getStoredSession()?.user.role === "admin");
  }, []);

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await logoutSession();
    window.location.replace(`${appBase()}/auth?mode=login`);
  };

  return (
    <div className="border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-6 py-3">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href);
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

        <div className="ml-auto flex items-center gap-2">
          {isPlatformAdmin ? (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/15"
            >
              <Crown className="h-4 w-4" /> Platform Admin
            </Link>
          ) : null}

          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-wait disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" /> {signingOut ? "Logging out…" : "Log Out"}
          </button>
        </div>
      </div>
    </div>
  );
}
