"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, CircleDollarSign, Clock3, Route, ShieldCheck, WalletCards } from "lucide-react";

import { authRequest, getStoredSession } from "@/lib/dispatchos-auth";
import { readDriverEarnings, type DriverEarningRecord } from "@/lib/platform/driver-compensation";

const basePath = () => (process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "");
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);

const statusClass = (status: DriverEarningRecord["status"]) => {
  if (status === "paid") return "border-emerald-400/35 bg-emerald-500/10 text-emerald-200";
  if (status === "approved") return "border-cyan-400/35 bg-cyan-500/10 text-cyan-200";
  if (status === "needs-review") return "border-amber-400/35 bg-amber-500/10 text-amber-200";
  return "border-white/15 bg-white/5 text-white/65";
};

export default function DriverEarningsPage() {
  const [earnings, setEarnings] = useState<DriverEarningRecord[]>([]);
  const [companyName, setCompanyName] = useState("DispatchOS");
  const [loading, setLoading] = useState(true);
  const [sourceLabel, setSourceLabel] = useState("Secure earnings ledger");

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      window.location.href = `${basePath()}/auth?mode=login`;
      return;
    }

    setCompanyName(session.company.name);

    const load = async () => {
      try {
        const data = await authRequest("/api/driver-pay/earnings", { method: "GET" });
        const remote = Array.isArray(data?.earnings) ? (data.earnings as DriverEarningRecord[]) : [];
        setEarnings(remote);
        setSourceLabel("Company earnings ledger");
      } catch {
        setEarnings(readDriverEarnings(session.company.slug));
        setSourceLabel("Device earnings history");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const today = useMemo(() => {
    const key = new Date().toLocaleDateString("en-CA");
    return earnings.filter((record) => new Date(record.completedAt).toLocaleDateString("en-CA") === key);
  }, [earnings]);

  const totals = useMemo(() => today.reduce((acc, record) => {
    acc.jobs += 1;
    acc.miles += record.miles || 0;
    acc.total += record.totalPay || 0;
    if (record.status === "paid") acc.paid += record.totalPay || 0;
    return acc;
  }, { jobs: 0, miles: 0, total: 0, paid: 0 }), [today]);

  return (
    <main className="min-h-dvh bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-xl px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/driver" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75 hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" /> Driver App
          </Link>
          <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[.14em] text-cyan-200">{sourceLabel}</span>
        </div>

        <section className="mt-7 rounded-[28px] border border-cyan-400/20 bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,.18),transparent_38%),rgba(15,23,42,.72)] p-6">
          <p className="text-xs uppercase tracking-[.22em] text-cyan-300">{companyName}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">My Earnings</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">See what completed jobs earned, how many route miles were counted, and whether the business has approved or paid each amount.</p>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><CheckCircle2 className="h-4 w-4 text-cyan-300" /><p className="mt-3 text-[10px] uppercase tracking-[.14em] text-white/40">Jobs Today</p><p className="mt-1 text-xl font-semibold">{totals.jobs}</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><Route className="h-4 w-4 text-cyan-300" /><p className="mt-3 text-[10px] uppercase tracking-[.14em] text-white/40">Miles Today</p><p className="mt-1 text-xl font-semibold">{totals.miles.toFixed(1)}</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><CircleDollarSign className="h-4 w-4 text-cyan-300" /><p className="mt-3 text-[10px] uppercase tracking-[.14em] text-white/40">Earned Today</p><p className="mt-1 text-xl font-semibold">{money(totals.total)}</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><WalletCards className="h-4 w-4 text-emerald-300" /><p className="mt-3 text-[10px] uppercase tracking-[.14em] text-white/40">Paid Today</p><p className="mt-1 text-xl font-semibold">{money(totals.paid)}</p></div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-cyan-300" /><h2 className="font-semibold">Recent completed jobs</h2></div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-white/50">Loading earnings...</div>
          ) : earnings.length === 0 ? (
            <div className="p-8 text-center"><CircleDollarSign className="mx-auto h-8 w-8 text-white/20" /><p className="mt-3 font-semibold">No earnings recorded yet.</p><p className="mt-2 text-sm leading-6 text-white/45">Completed-job earnings will appear here after the company begins using Driver Pay.</p></div>
          ) : (
            <div className="divide-y divide-white/10">
              {earnings.slice(0, 25).map((record) => (
                <div key={record.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div><p className="font-semibold">{record.service || "Completed job"}</p><p className="mt-1 text-xs text-white/45">{record.jobId} • {new Date(record.completedAt).toLocaleString()}</p></div>
                    <p className="text-lg font-semibold text-cyan-100">{money(record.totalPay)}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/65">{record.miles.toFixed(1)} miles</span>
                    <span className={`rounded-full border px-3 py-1 font-semibold capitalize ${statusClass(record.status)}`}>{record.status.replace("-", " ")}</span>
                  </div>
                  {record.note ? <p className="mt-3 text-xs leading-5 text-amber-100/65">{record.note}</p> : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /><p className="text-xs leading-5 text-white/50">This screen shows the company&apos;s DispatchOS earnings ledger. “Calculated” is an estimate based on company pay rules, “Approved” means the business approved it for payout, and “Paid” should only be shown after the company records or confirms actual payment.</p></div>
        </section>
      </div>
    </main>
  );
}
