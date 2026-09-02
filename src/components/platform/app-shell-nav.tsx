"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { getStoredSession } from "@/lib/dispatchos-auth";

const navItems = [
  { label: "Overview", href: "/workspace" },
  { label: "Company Settings", href: "/workspace/settings" },
  { label: "Drivers", href: "/workspace/drivers" },
  { label: "Billing", href: "/billing" },
  { label: "Downloads", href: "/download" },
] as const;

const isActivePath = (pathname: string, href: string) => {
  if (href === "/workspace") return pathname === "/workspace";
  return pathname === href || pathname.startsWith(`${href}/`);
};

export function AppShellNav() {
  const pathname = usePathname();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  useEffect(() => {
    setIsPlatformAdmin(getStoredSession()?.user.role === "admin");
  }, []);

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

        {isPlatformAdmin ? (
          <Link
            href="/admin"
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/15"
          >
            <Crown className="h-4 w-4" /> Platform Admin
          </Link>
        ) : null}
      </div>
    </div>
  );
}
