"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Building2, CheckCircle2, SlidersHorizontal } from "lucide-react";
import { getStoredSession } from "@/lib/dispatchos-auth";
import {
  readWorkspaceSettings,
  writeWorkspaceSettings,
  type WorkspaceSettingsState,
} from "@/lib/platform/workspace-preferences";

const basePath = () => (process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "");

export default function CompanySetupPage() {
  const [settings, setSettings] = useState<WorkspaceSettingsState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      window.location.href = `${basePath()}/auth?mode=login`;
      return;
    }

    const current = readWorkspaceSettings(session.company.slug);
    setSettings({
      ...current,
      companySlug: session.company.slug,
      companyName: current.companyName || session.company.name || "",
    });
  }, []);

  function update<K extends keyof WorkspaceSettingsState>(key: K, value: WorkspaceSettingsState[K]) {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings?.companyName.trim()) return;
    setSaving(true);
    writeWorkspaceSettings({
      ...settings,
      companyName: settings.companyName.trim(),
      setupComplete: true,
      bookingPageEnabled: false,
      jobIntakeSource: "dashboard",
    });
    window.location.href = `${basePath()}/workspace`;
  }

  if (!settings) return <main className="min-h-screen bg-[#05070b]" />;

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,.16),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,.11),transparent_30%)]">
        <div className="mx-auto max-w-5xl px-6 py-14 md:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[.2em] text-cyan-200">
            <Building2 className="h-4 w-4" /> Company Setup
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">Set up your company before you install the apps.</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-white/60 md:text-lg">
            These preferences become the starting configuration for your DispatchOS workspace, Dispatcher app, and Driver app.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-10 md:py-14">
        <form onSubmit={submit} className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-7 md:p-9">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-6 w-6 text-cyan-300" />
            <div>
              <h2 className="text-xl font-semibold">Company identity and operating preferences</h2>
              <p className="mt-1 text-sm text-white/48">You can change these later from Company Settings.</p>
            </div>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-white/75">Company name</span>
              <input required value={settings.companyName} onChange={(e) => update("companyName", e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 outline-none focus:border-cyan-300/50" placeholder="Your company name" />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-white/75">Industry / use case</span>
              <input value={settings.industry} onChange={(e) => update("industry", e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 outline-none focus:border-cyan-300/50" placeholder="Field service, delivery, maintenance..." />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-white/75">Dispatch mode</span>
              <select value={settings.dispatchMode} onChange={(e) => update("dispatchMode", e.target.value as WorkspaceSettingsState["dispatchMode"])} className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3">
                <option value="Manual">Manual</option>
                <option value="Assisted">Assisted</option>
                <option value="Auto">Auto</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-white/75">Driver acceptance</span>
              <select value={settings.driverAcceptanceMode} onChange={(e) => update("driverAcceptanceMode", e.target.value as WorkspaceSettingsState["driverAcceptanceMode"])} className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3">
                <option value="auto">Automatic</option>
                <option value="manual">Manual</option>
              </select>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-white/75">Typical job structure</span>
              <select value={settings.jobStructureMode} onChange={(e) => update("jobStructureMode", e.target.value as WorkspaceSettingsState["jobStructureMode"])} className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3">
                <option value="One-stop job">One-stop job</option>
                <option value="Two-stop job">Two-stop job</option>
                <option value="Multi-stop route">Multi-stop route</option>
              </select>
            </label>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/62"><CheckCircle2 className="mb-3 h-5 w-5 text-emerald-300" /> Company settings first</div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/62"><CheckCircle2 className="mb-3 h-5 w-5 text-emerald-300" /> Add and manage drivers</div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/62"><CheckCircle2 className="mb-3 h-5 w-5 text-emerald-300" /> Download apps after setup</div>
          </div>

          <button disabled={saving} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 py-4 font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-60">
            {saving ? "Saving..." : "Finish Company Setup"} <ArrowRight className="h-5 w-5" />
          </button>
        </form>
      </section>
    </main>
  );
}
