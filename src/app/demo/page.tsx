import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CarFront,
  CreditCard,
  LayoutDashboard,
  Settings2,
  Wand2,
} from "lucide-react";

import { AppShellNav } from "@/components/platform/app-shell-nav";
import { Card, CardContent } from "@/components/ui/card";

const demoEntries = [
  {
    title: "Settings",
    description:
      "Configure company intake, dispatch behavior, and platform controls before going live.",
    href: "/workspace/settings",
    cta: "Open Settings",
    icon: Settings2,
  },
  {
    title: "Billing",
    description:
      "Review company subscription status, payment details, and invoice activity.",
    href: "/billing",
    cta: "Open Billing",
    icon: CreditCard,
  },
  {
    title: "Drivers",
    description:
      "Manage your driver roster, activity status, and invite lifecycle in one place.",
    href: "/workspace/drivers",
    cta: "Open Drivers",
    icon: CarFront,
  },
  {
    title: "Booking",
    description:
      "Branded customer booking flow with service selection, address verification, and request submission.",
    href: "/build-electric/booking",
    cta: "Open Booking",
    icon: Wand2,
  },
  {
    title: "Dispatch",
    description:
      "Map-first operations board for dispatch mode, assignment workflows, and active job management.",
    href: "/dashboard",
    cta: "Open Dispatch",
    icon: LayoutDashboard,
  },
  {
    title: "Workspace",
    description:
      "Company control center for dispatch preferences, drivers, billing, and operational settings.",
    href: "/workspace",
    cta: "Open Workspace",
    icon: Building2,
  },
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <AppShellNav />
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_82%_65%,rgba(59,130,246,0.16),transparent_38%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-24">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">DispatchOS Platform Hub</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
            Navigate the complete dispatch platform
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-white/70 md:text-lg">
            Launch booking, dispatch, driver operations, and workspace controls from one connected
            hub.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-12 md:grid-cols-2 xl:grid-cols-3 md:py-16">
        {demoEntries.map((entry) => (
          <Card
            key={entry.title}
            className="h-full rounded-3xl border border-white/10 bg-white/5 text-white shadow-none"
          >
            <CardContent className="flex h-full flex-col p-6">
              <entry.icon className="h-8 w-8 text-cyan-300" />
              <h2 className="mt-5 text-2xl font-semibold">{entry.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-6 text-white/70">{entry.description}</p>

              <Link
                href={entry.href}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
              >
                {entry.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
