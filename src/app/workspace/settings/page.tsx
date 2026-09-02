"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, Wrench } from "lucide-react";
import { AppShellNav } from "@/components/platform/app-shell-nav";
import { getStoredSession } from "@/lib/dispatchos-auth";
import {
  readWorkspaceSettings,
  writeWorkspaceSettings,
  type WorkspaceSettingsState,
} from "@/lib/platform/workspace-preferences";

const basePath = () => (process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "");

export default function WorkspaceSettingsPage() {
  const [settings, setSettings] = useState<WorkspaceSettingsState | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      window.location.href = `${basePath()}/auth?mode=login`;
      return;
    }
    const current = readWorkspaceSettings(session.company.slug);
    if (!current.setupComplete) {
      window.location.href = `${basePath()}/workspace/setup`;
      return;
    }
    setSettings({ ...current, companyName: current.companyName || session.company.name, companySlug: session.company.slug });
  }, []);

  function update<K extends keyof WorkspaceSettingsState>(key: K, value: WorkspaceSettingsState[K]) {
    setSaved(false);
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  }

  function save() {
    if (!settings) return;
    writeWorkspaceSettings({ ...settings, setupComplete: true, bookingPageEnabled: false, jobIntakeSource: "dashboard" });
    setSaved(true);
  }

  if (!settings) return <main className="min-h-screen bg-slate-950" />;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <AppShellNav />
      <section className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Company Settings</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Company and operating preferences</h1>
            <p className="mt-3 max-w-2xl text-sm text-white/70">These settings define how your company appears and how the Dispatcher and Driver experiences behave.</p>
          </div>
          <Link href="/workspace" className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"><ArrowLeft className="h-4 w-4" /> Back to Portal</Link>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
            <h2 className="text-xl font-semibold">Company identity</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="space-y-2"><span className="text-sm text-white/80">Company Name</span><input value={settings.companyName} onChange={(e) => update("companyName", e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none focus:border-cyan-300/50" /></label>
              <label className="space-y-2"><span className="text-sm text-white/80">Industry / use case</span><input value={settings.industry} onChange={(e) => update("industry", e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none focus:border-cyan-300/50" placeholder="Field service, delivery, maintenance..." /></label>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
            <h2 className="text-xl font-semibold">Dispatch and driver workflow</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <label className="space-y-2"><span className="text-sm text-white/80">Dispatch Mode</span><select value={settings.dispatchMode} onChange={(e) => update("dispatchMode", e.target.value as WorkspaceSettingsState["dispatchMode"])} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3"><option value="Manual">Manual</option><option value="Assisted">Assisted</option><option value="Auto">Auto</option></select></label>
              <label className="space-y-2"><span className="text-sm text-white/80">Driver Acceptance</span><select value={settings.driverAcceptanceMode} onChange={(e) => update("driverAcceptanceMode", e.target.value as WorkspaceSettingsState["driverAcceptanceMode"])} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3"><option value="manual">Manual</option><option value="auto">Automatic</option></select></label>
              <label className="space-y-2"><span className="text-sm text-white/80">Job Structure</span><select value={settings.jobStructureMode} onChange={(e) => update("jobStructureMode", e.target.value as WorkspaceSettingsState["jobStructureMode"])} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3"><option value="One-stop job">One-stop job</option><option value="Two-stop job">Two-stop job</option><option value="Multi-stop route">Multi-stop route</option></select></label>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
            <h2 className="text-xl font-semibold">Field controls</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Toggle label="Customer tracking" enabled={settings.customerTrackingEnabled} onToggle={(v) => update("customerTrackingEnabled", v)} />
              <Toggle label="Delivery verification" enabled={settings.deliveryVerificationEnabled} onToggle={(v) => update("deliveryVerificationEnabled", v)} />
              <Toggle label="Proof of delivery" enabled={settings.proofOfDeliveryEnabled} onToggle={(v) => update("proofOfDeliveryEnabled", v)} />
              <Toggle label="QR handoff" enabled={settings.qrHandoffEnabled} onToggle={(v) => update("qrHandoffEnabled", v)} />
              <Toggle label="Photo proof" enabled={settings.photoProofEnabled} onToggle={(v) => update("photoProofEnabled", v)} />
              <Toggle label="Signature confirmation" enabled={settings.signatureConfirmationEnabled} onToggle={(v) => update("signatureConfirmationEnabled", v)} />
              <Toggle label="Customer updates" enabled={settings.customerUpdatesEnabled} onToggle={(v) => update("customerUpdatesEnabled", v)} />
              <Toggle label="Return to base after completion" enabled={settings.returnToBaseAfterCompletion} onToggle={(v) => update("returnToBaseAfterCompletion", v)} />
              <Toggle label="Driver must confirm handoff" enabled={settings.driverMustConfirmHandoff} onToggle={(v) => update("driverMustConfirmHandoff", v)} />
            </div>
          </section>

          <section className="rounded-3xl border border-violet-400/20 bg-violet-500/[0.05] p-6 md:p-8">
            <div className="flex items-center gap-3"><Wrench className="h-6 w-6 text-violet-300" /><h2 className="text-xl font-semibold">Website booking and customer intake</h2></div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/58">Booking is no longer a standard portal feature. If you want your website, request form, booking system, or another business system feeding jobs into DispatchOS, that is configured as a custom integration.</p>
            <a href="https://redavi19-asu.github.io/icomuteranythingV3/" className="mt-5 inline-flex text-sm font-semibold text-violet-200 hover:text-violet-100">Contact I Computer Anything for integration →</a>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-300"><Save className="h-4 w-4" /> Save Preferences</button>
            {saved ? <span className="text-sm text-emerald-300">Preferences saved.</span> : <span className="text-sm text-white/45">Changes are applied to this company configuration.</span>}
          </div>
        </div>
      </section>
    </main>
  );
}

function Toggle({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: (next: boolean) => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <p className="text-sm font-medium text-white/90">{label}</p>
      <button type="button" onClick={() => onToggle(!enabled)} className={`mt-3 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition ${enabled ? "border-emerald-400/45 bg-emerald-500/15 text-emerald-200" : "border-white/20 bg-white/5 text-white/70"}`}>{enabled ? "Enabled" : "Disabled"}</button>
    </div>
  );
}
