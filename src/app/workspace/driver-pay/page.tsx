"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeDollarSign,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Gauge,
  Route,
  Save,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";

import { AppShellNav } from "@/components/platform/app-shell-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getStoredSession, type DispatchOSSession } from "@/lib/dispatchos-auth";
import {
  DRIVER_PAY_UPDATED_EVENT,
  formatDriverPayMethod,
  getDriverPayProfile,
  readDriverEarnings,
  readDriverPaySettings,
  updateDriverEarningStatus,
  writeDriverPaySettings,
  type CompanyDriverPaySettings,
  type DriverEarningRecord,
  type DriverPayMethod,
} from "@/lib/platform/driver-compensation";
import { readWorkspaceDrivers, type WorkspaceDriver } from "@/lib/platform/workspace-drivers";

const basePath = () => (process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "");
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
const todayKey = () => new Date().toLocaleDateString("en-CA");

const statusStyle = (status: DriverEarningRecord["status"]) => {
  if (status === "paid") return "border-emerald-400/35 bg-emerald-500/10 text-emerald-200";
  if (status === "approved") return "border-cyan-400/35 bg-cyan-500/10 text-cyan-200";
  if (status === "needs-review") return "border-amber-400/35 bg-amber-500/10 text-amber-200";
  return "border-white/15 bg-white/5 text-white/65";
};

export default function DriverPayPage() {
  const [session, setSession] = useState<DispatchOSSession | null>(null);
  const [drivers, setDrivers] = useState<WorkspaceDriver[]>([]);
  const [settings, setSettings] = useState<CompanyDriverPaySettings | null>(null);
  const [earnings, setEarnings] = useState<DriverEarningRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredSession();
    if (!stored) {
      window.location.href = `${basePath()}/auth?mode=login`;
      return;
    }

    const slug = stored.company.slug;
    setSession(stored);
    setDrivers(readWorkspaceDrivers(stored.company.id, slug));
    setSettings(readDriverPaySettings(slug));
    setEarnings(readDriverEarnings(slug));

    const syncPayData = () => {
      setSettings(readDriverPaySettings(slug));
      setEarnings(readDriverEarnings(slug));
      setDrivers(readWorkspaceDrivers(stored.company.id, slug));
    };

    window.addEventListener("storage", syncPayData);
    window.addEventListener(DRIVER_PAY_UPDATED_EVENT, syncPayData as EventListener);
    return () => {
      window.removeEventListener("storage", syncPayData);
      window.removeEventListener(DRIVER_PAY_UPDATED_EVENT, syncPayData as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const slug = session?.company.slug ?? "build-electric";

  const todayEarnings = useMemo(() => {
    const key = todayKey();
    return earnings.filter((record) => new Date(record.completedAt).toLocaleDateString("en-CA") === key);
  }, [earnings]);

  const summary = useMemo(() => {
    return todayEarnings.reduce(
      (acc, record) => {
        acc.jobs += 1;
        acc.miles += record.miles || 0;
        acc.calculated += record.totalPay || 0;
        if (record.status === "paid") acc.paid += record.totalPay || 0;
        else acc.unpaid += record.totalPay || 0;
        return acc;
      },
      { jobs: 0, miles: 0, calculated: 0, paid: 0, unpaid: 0 }
    );
  }, [todayEarnings]);

  const saveSettings = () => {
    if (!settings) return;
    writeDriverPaySettings(slug, settings);
    setMessage("Driver pay settings saved.");
  };

  const updateDefault = (patch: Partial<CompanyDriverPaySettings["defaultProfile"]>) => {
    setSettings((current) =>
      current
        ? {
            ...current,
            defaultProfile: { ...current.defaultProfile, ...patch },
          }
        : current
    );
  };

  const updateDriverProfile = (
    driverId: string,
    patch: Partial<ReturnType<typeof getDriverPayProfile>>
  ) => {
    setSettings((current) => {
      if (!current) return current;
      const profile = getDriverPayProfile(current, driverId);
      return {
        ...current,
        driverProfiles: {
          ...current.driverProfiles,
          [driverId]: { ...profile, ...patch, driverId },
        },
      };
    });
  };

  const setStatus = (record: DriverEarningRecord, status: DriverEarningRecord["status"]) => {
    setEarnings(updateDriverEarningStatus(slug, record.id, status));
    setMessage(status === "paid" ? "Earning marked paid." : "Earning approved for payout.");
  };

  if (!session || !settings) return <main className="min-h-screen bg-slate-950" />;

  const providerConnected = settings.payoutProvider !== "not-connected";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <AppShellNav />

      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_10%_20%,rgba(34,211,238,.16),transparent_32%),radial-gradient(circle_at_86%_35%,rgba(16,185,129,.12),transparent_34%)]">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link href="/workspace" className="inline-flex items-center gap-2 text-sm text-white/65 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to Workspace
          </Link>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Business Operations</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">Driver Pay & Earnings</h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-white/68 md:text-base">
                Calculate what each driver earned from completed jobs, route mileage, and company-defined rates. Approve earnings here, then pay manually or through a connected payout/payroll provider.
              </p>
            </div>
            <Button onClick={saveSettings} className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300">
              <Save className="h-4 w-4" /> Save Pay Settings
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-8 px-6 py-10 md:py-14">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Jobs Today", value: String(summary.jobs), icon: CheckCircle2 },
            { label: "Miles Today", value: `${summary.miles.toFixed(1)} mi`, icon: Route },
            { label: "Calculated Pay", value: money(summary.calculated), icon: CircleDollarSign },
            { label: "Unpaid", value: money(summary.unpaid), icon: Clock3 },
            { label: "Paid Today", value: money(summary.paid), icon: WalletCards },
          ].map((item) => (
            <Card key={item.label} className="rounded-3xl border border-white/10 bg-white/5 text-white shadow-none">
              <CardContent className="p-5">
                <item.icon className="h-5 w-5 text-cyan-300" />
                <p className="mt-4 text-xs uppercase tracking-[0.16em] text-white/45">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <Card className="rounded-3xl border border-white/10 bg-white/5 text-white shadow-none">
            <CardContent className="p-6 md:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10">
                  <Gauge className="h-5 w-5 text-cyan-300" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Company Default Pay Rule</p>
                  <h2 className="mt-2 text-2xl font-semibold">How new driver earnings are calculated</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-white/45">Pay Method</span>
                  <select value={settings.defaultProfile.method} onChange={(event) => updateDefault({ method: event.target.value as DriverPayMethod })} className="w-full rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400/50">
                    <option value="job-plus-mile">Job + mileage</option>
                    <option value="per-job">Flat per job</option>
                    <option value="per-mile">Mileage only</option>
                    <option value="percentage">Percentage of job</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-white/45">Base Pay / Job</span>
                  <input type="number" min="0" step="0.01" value={settings.defaultProfile.baseJobPay} onChange={(event) => updateDefault({ baseJobPay: Number(event.target.value) })} className="w-full rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400/50" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-white/45">Per-Mile Rate</span>
                  <input type="number" min="0" step="0.01" value={settings.defaultProfile.perMileRate} onChange={(event) => updateDefault({ perMileRate: Number(event.target.value) })} className="w-full rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400/50" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-white/45">Percentage of Job</span>
                  <input type="number" min="0" max="100" step="0.1" value={settings.defaultProfile.percentageRate} onChange={(event) => updateDefault({ percentageRate: Number(event.target.value) })} className="w-full rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400/50" />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-white/45">Minimum Pay / Completed Job</span>
                  <input type="number" min="0" step="0.01" value={settings.defaultProfile.minimumJobPay} onChange={(event) => updateDefault({ minimumJobPay: Number(event.target.value) })} className="w-full rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400/50" />
                </label>
              </div>

              <p className="mt-4 text-xs leading-5 text-white/45">
                These are company-controlled compensation rules, not payroll or tax advice. Individual drivers can override the default below.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-cyan-400/20 bg-[linear-gradient(145deg,rgba(8,47,73,.38),rgba(2,6,23,.92)_70%)] text-white shadow-none">
            <CardContent className="p-6 md:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10">
                  <ShieldCheck className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Payout Control</p>
                  <h2 className="mt-2 text-2xl font-semibold">Manual approval or automatic payout</h2>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">Automatic Pay</p>
                      <p className="mt-1 text-xs leading-5 text-white/50">Automatically release approved driver earnings according to the payout schedule.</p>
                    </div>
                    <button type="button" onClick={() => {
                      if (!providerConnected) {
                        setMessage("Connect a payout or payroll provider before turning on Automatic Pay.");
                        return;
                      }
                      setSettings((current) => current ? { ...current, autoPayEnabled: !current.autoPayEnabled } : current);
                    }} className={`rounded-full border px-4 py-2 text-sm font-semibold ${settings.autoPayEnabled ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-200" : "border-white/15 bg-white/5 text-white/65"}`}>
                      {settings.autoPayEnabled ? "On" : "Off"}
                    </button>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-white/45">Payout Schedule</span>
                  <select value={settings.payoutSchedule} onChange={(event) => setSettings((current) => current ? { ...current, payoutSchedule: event.target.value as CompanyDriverPaySettings["payoutSchedule"] } : current)} className="w-full rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-white outline-none">
                    <option value="after-approval">After approval</option>
                    <option value="daily">End of day</option>
                    <option value="weekly">Weekly batch</option>
                  </select>
                </label>

                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                  <p className="text-sm font-semibold text-amber-100">Payout provider: Not connected</p>
                  <p className="mt-2 text-xs leading-5 text-amber-100/65">
                    Dispatch OS can calculate and approve earnings now. Money movement stays disabled until the business connects a real payout/payroll provider. Contractor payouts can later use a connected payment rail; W-2 employee wages should sync/export to the company&apos;s payroll system.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border border-white/10 bg-white/5 text-white shadow-none">
          <CardContent className="p-0">
            <div className="border-b border-white/10 p-6">
              <div className="flex items-start gap-3">
                <Users className="mt-1 h-5 w-5 text-cyan-300" />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Individual Driver Rates</p>
                  <h2 className="mt-2 text-2xl font-semibold">Set different pay for different drivers</h2>
                  <p className="mt-2 text-sm text-white/55">Each driver starts with the company default. Change any field below to create a driver-specific pay profile.</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-white/10">
              {drivers.length === 0 ? (
                <div className="p-8 text-center text-sm text-white/55">Add drivers in Driver Management before assigning pay rules.</div>
              ) : drivers.map((driver) => {
                const profile = getDriverPayProfile(settings, driver.id);
                const driverToday = todayEarnings.filter((record) => record.driverId === driver.id);
                const driverMiles = driverToday.reduce((sum, record) => sum + record.miles, 0);
                const driverPay = driverToday.reduce((sum, record) => sum + record.totalPay, 0);
                return (
                  <div key={driver.id} className="p-5 md:p-6">
                    <div className="grid gap-5 xl:grid-cols-[1fr_1.6fr] xl:items-end">
                      <div>
                        <p className="text-lg font-semibold">{driver.name}</p>
                        <p className="mt-1 text-sm text-white/50">{driver.zone} • {driverToday.length} jobs today • {driverMiles.toFixed(1)} mi • {money(driverPay)}</p>
                        <p className="mt-2 text-xs text-cyan-200/70">{formatDriverPayMethod(profile.method)}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <label><span className="mb-1 block text-[10px] uppercase tracking-[.12em] text-white/40">Method</span><select value={profile.method} onChange={(event) => updateDriverProfile(driver.id, { method: event.target.value as DriverPayMethod })} className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"><option value="job-plus-mile">Job + mi</option><option value="per-job">Per job</option><option value="per-mile">Per mile</option><option value="percentage">Percentage</option></select></label>
                        <label><span className="mb-1 block text-[10px] uppercase tracking-[.12em] text-white/40">Base / Job</span><input type="number" min="0" step="0.01" value={profile.baseJobPay} onChange={(event) => updateDriverProfile(driver.id, { baseJobPay: Number(event.target.value) })} className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white" /></label>
                        <label><span className="mb-1 block text-[10px] uppercase tracking-[.12em] text-white/40">Per Mile</span><input type="number" min="0" step="0.01" value={profile.perMileRate} onChange={(event) => updateDriverProfile(driver.id, { perMileRate: Number(event.target.value) })} className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white" /></label>
                        <label><span className="mb-1 block text-[10px] uppercase tracking-[.12em] text-white/40">Percent</span><input type="number" min="0" max="100" step="0.1" value={profile.percentageRate} onChange={(event) => updateDriverProfile(driver.id, { percentageRate: Number(event.target.value) })} className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white" /></label>
                        <label><span className="mb-1 block text-[10px] uppercase tracking-[.12em] text-white/40">Minimum</span><input type="number" min="0" step="0.01" value={profile.minimumJobPay} onChange={(event) => updateDriverProfile(driver.id, { minimumJobPay: Number(event.target.value) })} className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white" /></label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-white/10 bg-white/5 text-white shadow-none">
          <CardContent className="p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Earnings Ledger</p>
                <h2 className="mt-2 text-2xl font-semibold">Completed job pay history</h2>
              </div>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/60">{earnings.length} records</span>
            </div>

            {earnings.length === 0 ? (
              <div className="p-10 text-center">
                <BadgeDollarSign className="mx-auto h-9 w-9 text-white/25" />
                <p className="mt-4 font-semibold">No driver earnings recorded yet.</p>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/50">When completed jobs begin sending route miles and driver IDs into the earnings ledger, this screen will calculate the payout and group it by driver and day.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {earnings.map((record) => (
                  <div key={record.id} className="grid gap-4 p-5 lg:grid-cols-[1.2fr_.8fr_.8fr_.8fr_auto] lg:items-center">
                    <div><p className="font-semibold">{record.driverName || record.driverId}</p><p className="mt-1 text-xs text-white/45">{record.jobId} • {record.service || "Completed job"} • {new Date(record.completedAt).toLocaleString()}</p></div>
                    <div><p className="text-xs uppercase tracking-[.14em] text-white/40">Miles</p><p className="mt-1">{record.miles.toFixed(1)}</p></div>
                    <div><p className="text-xs uppercase tracking-[.14em] text-white/40">Calculated</p><p className="mt-1 font-semibold">{money(record.totalPay)}</p></div>
                    <div><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(record.status)}`}>{record.status.replace("-", " ")}</span></div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {record.status !== "paid" ? <Button variant="secondary" onClick={() => setStatus(record, "approved")} className="border border-cyan-400/25 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20">Approve</Button> : null}
                      {record.status !== "paid" ? <Button onClick={() => setStatus(record, "paid")} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">Mark Paid</Button> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
          <div className="flex items-start gap-3">
            <CircleDollarSign className="mt-0.5 h-5 w-5 text-cyan-300" />
            <div>
              <p className="font-semibold">How the automatic flow will work</p>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-white/58">
                Driver completes the job → Dispatch OS records route mileage → the company&apos;s driver-specific pay rule calculates the earning → the business can approve or auto-approve it → a connected payout/payroll provider moves the money → the ledger changes to Paid. The payment provider, not the browser, will be the authority for actual money movement.
              </p>
            </div>
          </div>
        </div>

        {message ? <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-cyan-400/30 bg-slate-900/95 px-5 py-3 text-sm text-cyan-100 shadow-xl">{message}</div> : null}
      </section>
    </main>
  );
}
