"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Route } from "lucide-react";

export function CourierConsoleLauncher() {
  const pathname = usePathname();
  if (!pathname?.includes("/dashboard")) return null;

  return (
    <Link
      href="/courier"
      className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-[70] inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-slate-950/90 px-4 py-3 text-sm font-bold text-cyan-100 shadow-2xl backdrop-blur transition hover:bg-slate-900"
    >
      <span className="relative">
        <Boxes className="h-5 w-5" />
        <Route className="absolute -bottom-1 -right-1 h-3 w-3 text-emerald-300" />
      </span>
      Courier Loads
    </Link>
  );
}
