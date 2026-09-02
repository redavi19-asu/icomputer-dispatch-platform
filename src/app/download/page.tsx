"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Laptop2,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { clearSession, getStoredSession, type DispatchOSSession } from "@/lib/dispatchos-auth";

const basePath = () => (process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "");

export default function DownloadCenterPage() {
  const [session, setSession] = useState<DispatchOSSession | null>(null);

  useEffect(() => {
    const stored = getStoredSession();
    if (!stored) {
      window.location.href = `${basePath()}/auth?mode=login`;
      return;
    }
    if (stored.user.role === "admin") {
      window.location.href = `${basePath()}/admin`;
      return;
    }
    setSession(stored);
  }, []);

  function signOut() {
    clearSession();
    window.location.href = `${basePath()}/auth?mode=login`;
  }

  if (!session) {
    return <main className="min-h-screen bg-[#05070b]" />;
  }

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,.17),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(16,185,129,.13),transparent_28%)]">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-cyan-300">
                <Download className="h-4 w-4" /> DispatchOS Download Center
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">Install DispatchOS and get to work.</h1>
              <p className="mt-5 text-base leading-7 text-white/60 md:text-lg">
                Your workspace is ready for <span className="font-semibold text-white">{session.company.name}</span>. Install the dispatcher experience on the office device and the driver experience on field phones, then sign in with company credentials.
              </p>
            </div>
            <button onClick={signOut} className="inline-flex items-center gap-2 self-start rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/70 hover:bg-white/10">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-cyan-400/20 bg-cyan-500/[0.055] p-7 md:p-9">
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950">
                <Laptop2 className="h-7 w-7" />
              </div>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">OFFICE / DISPATCH</span>
            </div>
            <h2 className="mt-7 text-2xl font-semibold md:text-3xl">DispatchOS Dispatcher</h2>
            <p className="mt-3 leading-7 text-white/58">
              The operations side for owners, dispatchers, maps, assignments, queues, company settings, and live job control. Best on desktop, laptop, or iPad.
            </p>
            <div className="mt-6 space-y-3 text-sm text-white/65">
              <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Installable app-style window and home-screen icon</p>
              <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Connects directly to your private company workspace</p>
              <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Updates come from DispatchOS automatically</p>
            </div>
            <Link href="/dashboard/install" className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-4 font-bold text-slate-950 hover:bg-cyan-300">
              <Download className="h-5 w-5" /> Install Dispatcher <ArrowRight className="h-4 w-4" />
            </Link>
          </article>

          <article className="rounded-[2rem] border border-emerald-400/20 bg-emerald-500/[0.05] p-7 md:p-9">
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
                <Smartphone className="h-7 w-7" />
              </div>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">DRIVER / FIELD</span>
            </div>
            <h2 className="mt-7 text-2xl font-semibold md:text-3xl">DispatchOS Driver</h2>
            <p className="mt-3 leading-7 text-white/58">
              The field app for assigned jobs, mission status, navigation, queue updates, and driver workflow. Install it on each authorized driver phone or tablet.
            </p>
            <div className="mt-6 space-y-3 text-sm text-white/65">
              <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Phone icon launches straight into DispatchOS Driver</p>
              <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Driver access stays tied to the company workspace</p>
              <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Designed for iPhone, Android, and tablets</p>
            </div>
            <Link href="/driver/install" className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-4 font-bold text-slate-950 hover:bg-emerald-300">
              <Download className="h-5 w-5" /> Install Driver App <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 md:p-8">
            <div className="flex items-center gap-3">
              <MonitorSmartphone className="h-6 w-6 text-cyan-300" />
              <h2 className="text-xl font-semibold">Simple install instructions</h2>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">iPhone / iPad</p>
                <p className="mt-3 text-sm leading-6 text-white/55">Open the install page in Safari, tap Share, then choose <strong className="text-white/80">Add to Home Screen</strong>.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">Android</p>
                <p className="mt-3 text-sm leading-6 text-white/55">Open in Chrome and choose <strong className="text-white/80">Install app</strong> or <strong className="text-white/80">Add to Home screen</strong>.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">Windows / Mac</p>
                <p className="mt-3 text-sm leading-6 text-white/55">Open the dispatcher install page in Chrome or Edge and use the browser&apos;s <strong className="text-white/80">Install</strong> option.</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-emerald-400/15 bg-emerald-500/[0.045] p-7 md:p-8">
            <ShieldCheck className="h-7 w-7 text-emerald-300" />
            <h2 className="mt-5 text-xl font-semibold">Cloud connected, company isolated.</h2>
            <p className="mt-3 text-sm leading-6 text-white/55">
              The installed icon is your doorway into DispatchOS. Company data remains in the secured DispatchOS backend rather than being copied into a separate local database on every device.
            </p>
            <Link href="/workspace" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-200 hover:text-emerald-100">
              Continue in browser instead <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </section>
    </main>
  );
}
