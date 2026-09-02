"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  CarFront,
  CreditCard,
  Download,
  LifeBuoy,
  Settings2,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { AppShellNav } from "@/components/platform/app-shell-nav";
import { getStoredSession, type DispatchOSSession } from "@/lib/dispatchos-auth";
import {
  readWorkspaceSettings,
  type WorkspaceSettingsState,
} from "@/lib/platform/workspace-preferences";

const basePath = () => (process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "");

const portalCards = [
  {
    title: "Company Settings",
    description: "Update company identity, dispatch preferences, driver workflow, verification, and operating rules.",
    href: "/workspace/settings",
    cta: "Open Company Settings",
    icon: Settings2,
  },
  {
    title: "Driver Management",
    description: "Add drivers, manage access, review invite status, and prepare your field team for the Driver app.",
    href: "/workspace/drivers",
    cta: "Manage Drivers",
    icon: CarFront,
  },
  {
    title: "Billing",
    description: "Review your DispatchOS subscription, billing status, plan information, and future invoice activity.",
    href: "/billing",
    cta: "Open Billing",
    icon: CreditCard,
  },
  {
    title: "Downloads",
    description: "Install the Dispatcher app on office devices and the Driver app on authorized field devices.",
    href: "/download",
    cta: "Open Download Center",
    icon: Download,
    featured: true,
  },
  {
    title: "Custom Integration",
    description: "Need your website, forms, intake flow, branding, or company systems connected to DispatchOS? Custom setup is handled separately.",
    href: "/download#custom-integration",
    cta: "View Integration Options",
    icon: LifeBuoy,
  },
];

export default function WorkspacePage() {
  const [session, setSession] = useState<DispatchOSSession | null>(null);
  const [settings, setSettings] = useState<WorkspaceSettingsState | null>(null);

  useEffect(() => {
    const stored = getStoredSession();
    if (!stored) {
      window.location.href = `${basePath()}/auth?mode=login`;
      return;
    }

    const current = readWorkspaceSettings(stored.company.slug);
    if (!current.setupComplete) {
      window.location.href = `${basePath()}/workspace/setup`;
      return;
    }

    setSession(stored);
    setSettings(current);
  }, []);

  if (!session || !settings) return <main className="min-h-screen bg-slate-950" />;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <AppShellNav />

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.2),transparent_30%),radial-gradient(circle_at_80%_60%,rgba(14,165,233,0.16),transparent_36%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-cyan-300">
            <Building2 className="h-4 w-4" /> Company Account Portal
          </div>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
            {settings.companyName} workspace
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-white/70 md:text-lg">
            Manage the company account here. Configure preferences, manage drivers, review billing, and install DispatchOS on the devices your team actually uses.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-cyan-100/70">
            Daily dispatch work happens inside the installed Dispatcher app. Drivers work from the installed Driver app. This portal is for company administration.
          </p>

          <div className="mt-7 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-cyan-200">Plan: {session.subscription?.plan || "Not assigned"}</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-white/75">Dispatch: {settings.dispatchMode}</span>
            {settings.industry ? <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-white/75">{settings.industry}</span> : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <div className="mb-7">
          <p className="text-xs uppercase tracking-[.2em] text-cyan-300">Account controls</p>
          <h2 className="mt-2 text-2xl font-semibold md:text-3xl">Everything you need before your team starts working</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {portalCards.map((entry) => (
            <Card
              key={entry.title}
              className={`h-full rounded-3xl text-white shadow-none ${
                entry.featured
                  ? "border border-cyan-400/30 bg-cyan-500/10"
                  : "border border-white/10 bg-white/5"
              }`}
            >
              <CardContent className="flex h-full flex-col p-6">
                <entry.icon className={`h-8 w-8 ${entry.featured ? "text-cyan-200" : "text-cyan-300"}`} />
                <h3 className="mt-5 text-2xl font-semibold">{entry.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-white/68">{entry.description}</p>
                <Link
                  href={entry.href}
                  className={`mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    entry.featured
                      ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                      : "border border-cyan-400/35 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
                  }`}
                >
                  {entry.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
