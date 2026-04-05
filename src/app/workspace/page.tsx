"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CarFront,
  CreditCard,
  LayoutDashboard,
  Settings2,
  Wand2,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { AppShellNav } from "@/components/platform/app-shell-nav";
import {
  readWorkspaceSettings,
  type WorkspaceSettingsState,
} from "@/lib/platform/workspace-preferences";

const WORKSPACE_SETTINGS_UPDATED_EVENT = "dispatch:workspace-settings-updated";

const workspaceCards = [
  {
    key: "settings",
    title: "Settings",
    description: "Configure company-level preferences for intake, dispatching, and driver app usage.",
    href: "/workspace/settings",
    cta: "Open Settings",
    icon: Settings2,
  },
  {
    key: "billing",
    title: "Billing",
    description: "Review subscription plan details, payment status, and invoice activity.",
    href: "/billing",
    cta: "Open Billing",
    icon: CreditCard,
  },
  {
    key: "drivers",
    title: "Driver Management",
    description: "Manage driver roster, invitation state, and account access readiness.",
    href: "/workspace/drivers",
    cta: "Manage Drivers",
    icon: CarFront,
  },
  {
    key: "booking",
    title: "Booking Page",
    description: "Customer-facing booking flow for request intake and dispatch handoff.",
    href: "/build-electric/booking",
    cta: "Open Booking",
    icon: Wand2,
  },
  {
    key: "dispatch",
    title: "Dispatch Dashboard",
    description: "Operate live jobs, assignment flow, queue management, and map visibility.",
    href: "/dashboard",
    cta: "Open Dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "workspace",
    title: "Workspace",
    description: "Workspace overview and launch point for company operations.",
    href: "/workspace",
    cta: "Open Workspace",
    icon: Building2,
  },
];

export default function WorkspacePage() {
  const [settings, setSettings] = useState<WorkspaceSettingsState>(() =>
    readWorkspaceSettings("build-electric")
  );

  useEffect(() => {
    const syncSettings = () => {
      setSettings(readWorkspaceSettings("build-electric"));
    };

    syncSettings();
    window.addEventListener("storage", syncSettings);
    window.addEventListener(WORKSPACE_SETTINGS_UPDATED_EVENT, syncSettings as EventListener);

    return () => {
      window.removeEventListener("storage", syncSettings);
      window.removeEventListener(WORKSPACE_SETTINGS_UPDATED_EVENT, syncSettings as EventListener);
    };
  }, []);

  const cardStates = useMemo(() => {
    const bookingEnabled =
      settings.bookingPageEnabled && settings.jobIntakeSource !== "dashboard";
    const driversEnabled = settings.driverAppEnabled;

    return {
      bookingEnabled,
      driversEnabled,
    };
  }, [settings.bookingPageEnabled, settings.driverAppEnabled, settings.jobIntakeSource]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <AppShellNav />
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.2),transparent_30%),radial-gradient(circle_at_80%_60%,rgba(14,165,233,0.16),transparent_36%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-24">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Company Workspace</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
            {settings.companyName} control center
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-white/70 md:text-lg">
            Centralize dispatch operations, booking access, driver management, billing, and platform
            settings from one workspace hub.
          </p>
          <p className="mt-3 max-w-3xl text-sm text-cyan-200/85">
            Start with Settings to configure how your company uses DispatchOS.
          </p>

          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-cyan-200">
              Dispatch Mode: {settings.dispatchMode}
            </span>
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-cyan-200">
              Driver Acceptance: {settings.driverAcceptanceMode}
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-white/75">
              Intake: {settings.jobIntakeSource}
            </span>
          </div>

          {settings.jobIntakeSource === "booking" ? (
            <p className="mt-4 max-w-2xl rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              Booking-first intake is enabled. Dashboard manual intake actions are reduced.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {workspaceCards.map((entry) => {
            const isDisabled =
              (entry.key === "booking" && !cardStates.bookingEnabled) ||
              (entry.key === "drivers" && !cardStates.driversEnabled);

            return (
            <Card
              key={entry.title}
              className="h-full rounded-3xl border border-white/10 bg-white/5 text-white shadow-none"
            >
              <CardContent className="flex h-full flex-col p-6">
                <entry.icon className="h-8 w-8 text-cyan-300" />
                <h2 className="mt-5 text-2xl font-semibold">{entry.title}</h2>
                <p className="mt-3 flex-1 text-sm leading-6 text-white/70">
                  {entry.description}
                </p>

                {isDisabled ? (
                  <div className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/45">
                    {entry.key === "booking"
                      ? "Disabled by intake settings"
                      : "Disabled in workspace settings"}
                  </div>
                ) : (
                  <Link
                    href={entry.href}
                    className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
                  >
                    {entry.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </CardContent>
            </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}
