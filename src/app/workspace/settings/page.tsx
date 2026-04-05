"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";

import { AppShellNav } from "@/components/platform/app-shell-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  readWorkspaceSettings,
  writeWorkspaceSettings,
  type WorkspaceSettingsState,
} from "@/lib/platform/workspace-preferences";

export default function WorkspaceSettingsPage() {
  const [settings, setSettings] = useState<WorkspaceSettingsState>(() =>
    readWorkspaceSettings("build-electric")
  );
  const [showSavedState, setShowSavedState] = useState(false);

  const bookingPathPreview = useMemo(
    () => `/${settings.companySlug || "company"}/booking`,
    [settings.companySlug]
  );

  const updateSetting = <K extends keyof WorkspaceSettingsState>(
    key: K,
    value: WorkspaceSettingsState[K]
  ) => {
    setShowSavedState(false);
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      return writeWorkspaceSettings(next);
    });
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <AppShellNav />
      <section className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Workspace Settings</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              Company preferences
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/70">
              Configure your workspace behavior for booking intake, dispatch operations, and
              driver workflow. This state is local for now and ready to connect to persistence.
            </p>
          </div>
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Workspace
          </Link>
        </div>

        <Card className="rounded-3xl border border-white/10 bg-white/5 text-white shadow-none">
          <CardContent className="p-6 md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-white/80">Company Name</span>
                <input
                  value={settings.companyName}
                  onChange={(event) => updateSetting("companyName", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-white/25"
                  placeholder="Company name"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-white/80">Company Slug</span>
                <input
                  value={settings.companySlug}
                  onChange={(event) => updateSetting("companySlug", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-white/25"
                  placeholder="company-slug"
                />
              </label>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/70 p-4 text-sm text-white/70">
              Booking route preview: <span className="font-semibold text-cyan-200">{bookingPathPreview}</span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <ToggleCard
                label="Booking Page Enabled"
                enabled={settings.bookingPageEnabled}
                onToggle={(next) => updateSetting("bookingPageEnabled", next)}
              />
              <ToggleCard
                label="Driver App Enabled"
                enabled={settings.driverAppEnabled}
                onToggle={(next) => updateSetting("driverAppEnabled", next)}
              />
              <ToggleCard
                label="Customer Updates Enabled"
                enabled={settings.customerUpdatesEnabled}
                onToggle={(next) => updateSetting("customerUpdatesEnabled", next)}
              />
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Operational Mode</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm text-white/80">Workflow profile</span>
                  <select
                    value={settings.operationalMode}
                    onChange={(event) =>
                      updateSetting(
                        "operationalMode",
                        event.target.value as WorkspaceSettingsState["operationalMode"]
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-white/25"
                  >
                    <option value="Direct Service">Direct Service</option>
                    <option value="Pickup Then Deliver">Pickup Then Deliver</option>
                    <option value="Chain of Custody">Chain of Custody</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Verification & Handoff</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
              <ToggleCard
                label="Customer Tracking Enabled"
                enabled={settings.customerTrackingEnabled}
                onToggle={(next) => updateSetting("customerTrackingEnabled", next)}
              />
              <ToggleCard
                label="Pickup Verification Enabled"
                enabled={settings.pickupVerificationEnabled}
                onToggle={(next) => updateSetting("pickupVerificationEnabled", next)}
              />
              <ToggleCard
                label="Delivery Verification Enabled"
                enabled={settings.deliveryVerificationEnabled}
                onToggle={(next) => updateSetting("deliveryVerificationEnabled", next)}
              />
              <ToggleCard
                label="Proof of Delivery Enabled"
                enabled={settings.proofOfDeliveryEnabled}
                onToggle={(next) => updateSetting("proofOfDeliveryEnabled", next)}
              />
              <ToggleCard
                label="QR Handoff Enabled"
                enabled={settings.qrHandoffEnabled}
                onToggle={(next) => updateSetting("qrHandoffEnabled", next)}
              />
              <ToggleCard
                label="Photo Proof Enabled"
                enabled={settings.photoProofEnabled}
                onToggle={(next) => updateSetting("photoProofEnabled", next)}
              />
              <ToggleCard
                label="Signature Confirmation Enabled"
                enabled={settings.signatureConfirmationEnabled}
                onToggle={(next) => updateSetting("signatureConfirmationEnabled", next)}
              />
              <ToggleCard
                label="Dispatcher Can Confirm Handoff"
                enabled={settings.dispatcherCanConfirmHandoff}
                onToggle={(next) => updateSetting("dispatcherCanConfirmHandoff", next)}
              />
              <ToggleCard
                label="Driver Must Confirm Handoff"
                enabled={settings.driverMustConfirmHandoff}
                onToggle={(next) => updateSetting("driverMustConfirmHandoff", next)}
              />
            </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Job Structure</p>
              <div className="mt-4 grid gap-5 md:grid-cols-3">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm text-white/80">Route template</span>
                  <select
                    value={settings.jobStructureMode}
                    onChange={(event) =>
                      updateSetting(
                        "jobStructureMode",
                        event.target.value as WorkspaceSettingsState["jobStructureMode"]
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-white/25"
                  >
                    <option value="One-stop job">One-stop job</option>
                    <option value="Two-stop job">Two-stop job</option>
                    <option value="Multi-stop route">Multi-stop route</option>
                  </select>
                </label>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <ToggleCard
                  label="Base required before final stop"
                  enabled={settings.baseRequiredBeforeFinalStop}
                  onToggle={(next) => updateSetting("baseRequiredBeforeFinalStop", next)}
                />
                <ToggleCard
                  label="Return to base after completion"
                  enabled={settings.returnToBaseAfterCompletion}
                  onToggle={(next) => updateSetting("returnToBaseAfterCompletion", next)}
                />
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm text-white/80">Job Intake Source</span>
                <select
                  value={settings.jobIntakeSource}
                  onChange={(event) =>
                    updateSetting(
                      "jobIntakeSource",
                      event.target.value as WorkspaceSettingsState["jobIntakeSource"]
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-white/25"
                >
                  <option value="booking">booking</option>
                  <option value="dashboard">dashboard</option>
                  <option value="both">both</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-white/80">Dispatch Mode</span>
                <select
                  value={settings.dispatchMode}
                  onChange={(event) =>
                    updateSetting(
                      "dispatchMode",
                      event.target.value as WorkspaceSettingsState["dispatchMode"]
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-white/25"
                >
                  <option value="Manual">Manual</option>
                  <option value="Assisted">Assisted</option>
                  <option value="Auto">Auto</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-white/80">Driver Acceptance Mode</span>
                <select
                  value={settings.driverAcceptanceMode}
                  onChange={(event) =>
                    updateSetting(
                      "driverAcceptanceMode",
                      event.target.value as WorkspaceSettingsState["driverAcceptanceMode"]
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-white/25"
                >
                  <option value="manual">manual</option>
                  <option value="auto">auto</option>
                </select>
              </label>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <Button
                onClick={() => {
                  writeWorkspaceSettings(settings);
                  setShowSavedState(true);
                }}
                className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
              >
                <Save className="h-4 w-4" />
                Save Preferences
              </Button>
              {showSavedState ? (
                <p className="text-sm text-emerald-300">Preferences saved (local state).</p>
              ) : (
                <p className="text-sm text-white/55">No persistence yet; wiring is ready.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

type ToggleCardProps = {
  label: string;
  enabled: boolean;
  onToggle: (next: boolean) => void;
};

function ToggleCard({ label, enabled, onToggle }: ToggleCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <p className="text-sm font-medium text-white/90">{label}</p>
      <button
        onClick={() => onToggle(!enabled)}
        className={`mt-3 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition ${
          enabled
            ? "border-emerald-400/45 bg-emerald-500/15 text-emerald-200"
            : "border-white/20 bg-white/5 text-white/70"
        }`}
      >
        {enabled ? "Enabled" : "Disabled"}
      </button>
    </div>
  );
}
