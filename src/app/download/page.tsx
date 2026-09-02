"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Laptop2,
  MonitorSmartphone,
  ShieldCheck,
  Smartphone,
  Wrench,
} from "lucide-react";
import { AppShellNav } from "@/components/platform/app-shell-nav";
import { getStoredSession, type DispatchOSSession } from "@/lib/dispatchos-auth";
import { readWorkspaceSettings, type WorkspaceSettingsState } from "@/lib/platform/workspace-preferences";

const basePath = () => (process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "");

export default function DownloadCenterPage() {
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

  if (!session || !settings) return <main className="min-h-screen bg-[#05070b]" />;

  const companyName = settings.companyName || session.company.name;

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <AppShellNav />
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,.17),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(16,185,129,.13),transparent_28%)]">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-cyan-300"><Download className="h-4 w-4" /> DispatchOS Download Center</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">Install the tools your team actually works from.</h1>
            <p className="mt-5 text-base leading-7 text-white/60 md:text-lg"><span className="font-semibold text-white">{companyName}</span> is configured. Install Dispatcher on office devices and Driver on authorized field devices.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-cyan-400/20 bg-cyan-500/[0.055] p-7 md:p-9">
            <div className="flex items-center justify-between gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950"><Laptop2 className="h-7 w-7" /></div><span className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">OFFICE / DISPATCH</span></div>
            <h2 className="mt-7 text-2xl font-semibold md:text-3xl">{companyName} Dispatcher</h2>
            <p className="mt-3 leading-7 text-white/58">The working command center for maps, assignments, job queues, driver status, and live operations. This is where dispatch staff spend their workday.</p>
            <div className="mt-6 space-y-3 text-sm text-white/65"><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Company identity and preferences already configured</p><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Best for desktop, laptop, or office tablet</p><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Launches as an app-style experience</p></div>
            <Link href="/dashboard/install" className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-4 font-bold text-slate-950 hover:bg-cyan-300"><Download className="h-5 w-5" /> Install Dispatcher <ArrowRight className="h-4 w-4" /></Link>
          </article>

          <article className="rounded-[2rem] border border-emerald-400/20 bg-emerald-500/[0.05] p-7 md:p-9">
            <div className="flex items-center justify-between gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950"><Smartphone className="h-7 w-7" /></div><span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">DRIVER / FIELD</span></div>
            <h2 className="mt-7 text-2xl font-semibold md:text-3xl">{companyName} Driver</h2>
            <p className="mt-3 leading-7 text-white/58">The field app for assigned work, navigation, mission details, job status, and driver workflow. Install it only on devices used by authorized field staff.</p>
            <div className="mt-6 space-y-3 text-sm text-white/65"><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Connected to the same company workspace</p><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Designed for iPhone, Android, and tablets</p><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Driver access is managed from your portal</p></div>
            <Link href="/driver/install" className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-4 font-bold text-slate-950 hover:bg-emerald-300"><Download className="h-5 w-5" /> Install Driver App <ArrowRight className="h-4 w-4" /></Link>
          </article>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 md:p-8">
            <div className="flex items-center gap-3"><MonitorSmartphone className="h-6 w-6 text-cyan-300" /><h2 className="text-xl font-semibold">Install instructions</h2></div>
            <div className="mt-6 grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-black/20 p-5"><p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">iPhone / iPad</p><p className="mt-3 text-sm leading-6 text-white/55">Open in Safari, tap Share, then <strong className="text-white/80">Add to Home Screen</strong>.</p></div><div className="rounded-2xl border border-white/10 bg-black/20 p-5"><p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">Android</p><p className="mt-3 text-sm leading-6 text-white/55">Open in Chrome and choose <strong className="text-white/80">Install app</strong> or <strong className="text-white/80">Add to Home screen</strong>.</p></div><div className="rounded-2xl border border-white/10 bg-black/20 p-5"><p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">Windows / Mac</p><p className="mt-3 text-sm leading-6 text-white/55">Open Dispatcher in Chrome or Edge and use the browser&apos;s <strong className="text-white/80">Install</strong> option.</p></div></div>
          </section>

          <section className="rounded-3xl border border-emerald-400/15 bg-emerald-500/[0.045] p-7 md:p-8"><ShieldCheck className="h-7 w-7 text-emerald-300" /><h2 className="mt-5 text-xl font-semibold">Portal and apps stay separate.</h2><p className="mt-3 text-sm leading-6 text-white/55">Use the web portal for company administration. Use Dispatcher and Driver for day-to-day operations.</p><Link href="/workspace" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-200 hover:text-emerald-100">Back to company portal <ArrowRight className="h-4 w-4" /></Link></section>
        </div>

        <section id="custom-integration" className="mt-8 rounded-[2rem] border border-violet-400/20 bg-violet-500/[0.05] p-7 md:p-9">
          <Wrench className="h-7 w-7 text-violet-300" />
          <h2 className="mt-5 text-2xl font-semibold">Custom company integration</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/58">Website request forms, customer intake, booking systems, custom branding, special workflow rules, and existing company systems are optional integrations. They are not part of the standard company portal and can be connected separately through I Computer Anything.</p>
          <a href="https://redavi19-asu.github.io/icomuteranythingV3/" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-violet-300/25 bg-violet-500/10 px-5 py-3 text-sm font-semibold text-violet-100 hover:bg-violet-500/15">Contact for Custom Setup <ArrowRight className="h-4 w-4" /></a>
        </section>
      </section>
    </main>
  );
}
