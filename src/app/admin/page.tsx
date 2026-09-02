"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Ban,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  CreditCard,
  Gift,
  LayoutDashboard,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Truck,
  UserCog,
  Users,
} from "lucide-react";
import { authRequest, getStoredSession } from "@/lib/dispatchos-auth";

type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  plan: string | null;
  status: string | null;
  member_count: number;
  owner_name: string | null;
  owner_email: string | null;
  protected_admin_company: number;
  owner_count?: number;
  admin_count?: number;
  dispatcher_count?: number;
  driver_member_count?: number;
};

type CompanyAnalytics = {
  companyId: string;
  operationalDataReady: boolean;
  drivers: { total: number; active: number; offline: number };
  jobs: {
    total: number;
    active: number;
    completed: number;
    canceled: number;
    today: number;
    thisMonth: number;
    completionRate: number;
  };
  settings: {
    dispatchMode: string | null;
    driverAcceptanceMode: string | null;
    bookingEnabled: boolean | null;
    driverAppEnabled: boolean | null;
    customerUpdatesEnabled: boolean | null;
  };
};

const basePath = () =>
  process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "";

export default function AdminPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showTrial, setShowTrial] = useState(false);
  const [trialCompanyId, setTrialCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [plan, setPlan] = useState("basic");
  const [accessStatus, setAccessStatus] = useState("comped");
  const [creating, setCreating] = useState(false);
  const [expandedCompanyId, setExpandedCompanyId] = useState("");
  const [analyticsLoadingId, setAnalyticsLoadingId] = useState("");
  const [analyticsByCompany, setAnalyticsByCompany] = useState<Record<string, CompanyAnalytics>>({});

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const session = getStoredSession();
      if (!session) {
        window.location.href = `${basePath()}/auth?mode=login`;
        return;
      }
      if (session.user.role !== "admin") {
        window.location.href = `${basePath()}/workspace`;
        return;
      }
      const data = await authRequest("/admin/companies");
      setCompanies((data.companies || []) as CompanyRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load companies.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  const stats = useMemo(() => {
    const total = companies.length;
    const active = companies.filter((c) =>
      ["active", "comped", "trialing", "grace_period"].includes((c.status || "").toLowerCase())
    ).length;
    const comped = companies.filter((c) => c.status === "comped").length;
    const suspended = companies.filter((c) =>
      ["suspended", "canceled", "unpaid", "past_due"].includes((c.status || "").toLowerCase())
    ).length;
    return { total, active, comped, suspended };
  }, [companies]);

  async function updateCompany(id: string, update: { plan?: string; status?: string }) {
    setSavingId(id);
    setError("");
    try {
      await authRequest(`/admin/companies/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(update),
      });
      await loadCompanies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update company.");
    } finally {
      setSavingId("");
    }
  }

  async function grantTrialAccess() {
    if (!trialCompanyId) return;
    await updateCompany(trialCompanyId, { status: "comped" });
    setShowTrial(false);
    setTrialCompanyId("");
  }

  async function toggleAnalytics(companyId: string) {
    if (expandedCompanyId === companyId) {
      setExpandedCompanyId("");
      return;
    }

    setExpandedCompanyId(companyId);
    if (analyticsByCompany[companyId]) return;

    setAnalyticsLoadingId(companyId);
    setError("");
    try {
      const data = await authRequest(`/admin/companies/${encodeURIComponent(companyId)}/analytics`);
      setAnalyticsByCompany((current) => ({
        ...current,
        [companyId]: data.analytics as CompanyAnalytics,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load company analytics.");
    } finally {
      setAnalyticsLoadingId("");
    }
  }

  async function removeCompany(company: CompanyRow) {
    if (company.protected_admin_company) return;
    const confirmed = window.confirm(
      `Remove ${company.name} from DispatchOS?\n\nThis permanently removes the company workspace, access, memberships, and company-owned operational data. This cannot be undone.`
    );
    if (!confirmed) return;

    setSavingId(company.id);
    setError("");
    try {
      await authRequest(`/admin/companies/${encodeURIComponent(company.id)}`, { method: "DELETE" });
      setExpandedCompanyId((current) => (current === company.id ? "" : current));
      setAnalyticsByCompany((current) => {
        const next = { ...current };
        delete next[company.id];
        return next;
      });
      await loadCompanies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove company.");
    } finally {
      setSavingId("");
    }
  }

  async function createCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      await authRequest("/admin/companies", {
        method: "POST",
        body: JSON.stringify({ companyName, ownerName, ownerEmail, temporaryPassword, plan, accessStatus }),
      });
      setCompanyName("");
      setOwnerName("");
      setOwnerEmail("");
      setTemporaryPassword("");
      setPlan("basic");
      setAccessStatus("comped");
      setShowCreate(false);
      await loadCompanies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create company.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,.15),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,.12),transparent_30%)]">
        <div className="mx-auto max-w-7xl px-6 py-8 md:py-12">
          <div className="flex flex-wrap items-center justify-end gap-3 border-b border-white/10 pb-6">
            <button onClick={() => (window.location.href = `${basePath()}/workspace`)} className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/15">
              <LayoutDashboard className="h-4 w-4" /> My Company Platform
            </button>
            <button onClick={() => setShowTrial((value) => !value)} className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/15 px-4 py-3 text-sm font-semibold text-violet-100 hover:bg-violet-500/25">
              <Sparkles className="h-4 w-4" /> Trial Access
            </button>
            <button onClick={() => void loadCompanies()} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button onClick={() => setShowCreate((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300">
              <Plus className="h-4 w-4" /> Onboard Company
            </button>
          </div>

          <div className="pt-8 md:pt-10">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-cyan-300">
              <ShieldCheck className="h-4 w-4" /> Platform Administrator
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">DispatchOS Command Center</h1>
            <p className="mt-4 max-w-3xl text-white/60">
              Control company access, plans, trials, complimentary accounts, onboarding, and company-level analytics from one place.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {showTrial && (
          <div className="mb-8 rounded-3xl border border-violet-400/25 bg-[linear-gradient(135deg,rgba(139,92,246,.14),rgba(34,211,238,.06))] p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-violet-200"><Sparkles className="h-5 w-5" /><h2 className="text-xl font-semibold">Grant Trial Access</h2></div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
                  Choose one of the companies already onboarded below. You do not type a company name here. The list is populated automatically from your DispatchOS company accounts.
                </p>
              </div>
              <span className="rounded-full border border-violet-300/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-100">ADMIN CONTROLLED</span>
            </div>
            <div className="mt-5 flex flex-col gap-3 md:flex-row">
              <select value={trialCompanyId} onChange={(e) => setTrialCompanyId(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white">
                <option value="">Choose a company</option>
                {companies.filter((company) => !company.protected_admin_company).map((company) => (
                  <option key={company.id} value={company.id}>{company.name} — {company.owner_email || "no owner email"}</option>
                ))}
              </select>
              <button type="button" disabled={!trialCompanyId || savingId === trialCompanyId} onClick={() => void grantTrialAccess()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-400 px-5 py-3 font-bold text-slate-950 hover:bg-violet-300 disabled:opacity-40">
                <Sparkles className="h-4 w-4" /> Start Free Trial
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[["Companies", stats.total, Building2],["Operating access", stats.active, CheckCircle2],["Trial / Comped", stats.comped, Gift],["Billing locked", stats.suspended, Ban]].map(([label, value, Icon]) => {
            const IconComponent = Icon as typeof Building2;
            return <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><IconComponent className="h-5 w-5 text-cyan-300" /><p className="mt-4 text-3xl font-semibold">{String(value)}</p><p className="mt-1 text-sm text-white/45">{String(label)}</p></div>;
          })}
        </div>

        {showCreate && (
          <form onSubmit={createCompany} className="mt-8 rounded-3xl border border-cyan-400/20 bg-cyan-500/[0.04] p-6 md:p-8">
            <div className="flex items-center gap-3"><Building2 className="h-6 w-6 text-cyan-300" /><div><h2 className="text-xl font-semibold">Administrator onboarding</h2><p className="text-sm text-white/50">Create a private company workspace even while public registration is closed.</p></div></div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required placeholder="Company name" className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-cyan-300/50" />
              <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required placeholder="Owner name" className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-cyan-300/50" />
              <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} required placeholder="Owner email" className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-cyan-300/50" />
              <input type="password" minLength={10} value={temporaryPassword} onChange={(e) => setTemporaryPassword(e.target.value)} required placeholder="Temporary password (10+ characters)" className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-cyan-300/50" />
              <select value={plan} onChange={(e) => setPlan(e.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3"><option value="basic">Basic</option><option value="business">Business</option><option value="custom">Custom</option></select>
              <select value={accessStatus} onChange={(e) => setAccessStatus(e.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3"><option value="comped">Trial / Complimentary</option><option value="active">Active / Paid externally</option><option value="pending">Pending payment</option></select>
            </div>
            <button disabled={creating} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-bold hover:bg-emerald-400 disabled:opacity-50"><Plus className="h-4 w-4" /> {creating ? "Creating..." : "Create Company Workspace"}</button>
          </form>
        )}

        {error && <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{error}</div>}

        <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5"><div><h2 className="text-xl font-semibold">Company control</h2><p className="mt-1 text-sm text-white/45">Access controls, trial controls, and company-level operational analytics.</p></div><Users className="h-5 w-5 text-white/35" /></div>

          {loading ? <div className="p-8 text-sm text-white/50">Loading platform companies...</div> : companies.length === 0 ? <div className="p-8 text-sm text-white/50">No companies found.</div> : (
            <div className="divide-y divide-white/10">
              {companies.map((company) => {
                const protectedCompany = Boolean(company.protected_admin_company);
                const disabled = savingId === company.id;
                const expanded = expandedCompanyId === company.id;
                const analytics = analyticsByCompany[company.id];
                return (
                  <div key={company.id} className="p-6">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold">{company.name}</h3>{protectedCompany && <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200">ADMIN COMPANY</span>}<span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase text-white/55">{company.status || "pending"}</span></div>
                        <p className="mt-2 text-sm text-white/48">{company.owner_name || "No owner"} · {company.owner_email || "No owner email"}</p>
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/38"><span>Plan: {company.plan || "none"}</span><span>Members: {company.member_count || 0}</span><span>Admins: {company.admin_count || 0}</span><span>Dispatchers: {company.dispatcher_count || 0}</span><span>Driver users: {company.driver_member_count || 0}</span><span>Created: {new Date(company.created_at).toLocaleDateString()}</span></div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => void toggleAnalytics(company.id)} className="inline-flex items-center gap-2 rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-200"><BarChart3 className="h-4 w-4" /> Analytics {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</button>
                        {!protectedCompany && <button disabled={disabled} onClick={() => void updateCompany(company.id, { status: "comped" })} className="inline-flex items-center gap-2 rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-200 disabled:opacity-40"><Sparkles className="h-4 w-4" /> Trial</button>}
                        <button disabled={disabled} onClick={() => void updateCompany(company.id, { status: "active" })} className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 disabled:opacity-40"><CheckCircle2 className="h-4 w-4" /> Activate</button>
                        <button disabled={disabled} onClick={() => void updateCompany(company.id, { plan: company.plan === "business" ? "basic" : "business" })} className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 disabled:opacity-40"><CreditCard className="h-4 w-4" /> {company.plan === "business" ? "Set Basic" : "Set Business"}</button>
                        <button disabled={disabled || protectedCompany} onClick={() => void updateCompany(company.id, { status: "suspended" })} className="inline-flex items-center gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 disabled:opacity-35"><Ban className="h-4 w-4" /> Suspend</button>
                        <button disabled={disabled || protectedCompany} onClick={() => void removeCompany(company)} className="inline-flex items-center gap-2 rounded-lg border border-rose-400/15 bg-rose-500/[0.04] px-3 py-2 text-xs font-semibold text-rose-200/60 hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-100 disabled:opacity-25"><Trash2 className="h-4 w-4" /> Remove</button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                        {analyticsLoadingId === company.id ? (
                          <div className="flex items-center gap-2 text-sm text-white/50"><RefreshCw className="h-4 w-4 animate-spin" /> Loading company analytics...</div>
                        ) : analytics ? (
                          <>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                              {[["Drivers", analytics.drivers.total, Truck],["Active drivers", analytics.drivers.active, Activity],["Jobs today", analytics.jobs.today, Clock3],["Jobs this month", analytics.jobs.thisMonth, BarChart3],["Active jobs", analytics.jobs.active, Smartphone],["Completion", `${analytics.jobs.completionRate}%`, CheckCircle2]].map(([label, value, Icon]) => {
                                const MetricIcon = Icon as typeof Truck;
                                return <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.035] p-4"><MetricIcon className="h-4 w-4 text-cyan-300" /><p className="mt-3 text-xl font-semibold">{String(value)}</p><p className="mt-1 text-[11px] text-white/40">{String(label)}</p></div>;
                              })}
                            </div>
                            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4"><div className="flex items-center gap-2 text-sm font-semibold"><UserCog className="h-4 w-4 text-violet-300" /> Team footprint</div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/55"><span>Company admins: {company.admin_count || 0}</span><span>Owners: {company.owner_count || 0}</span><span>Dispatchers: {company.dispatcher_count || 0}</span><span>Driver accounts: {company.driver_member_count || 0}</span></div></div>
                              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4"><div className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-emerald-300" /> Feature usage</div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/55"><span>Dispatch mode: {analytics.settings.dispatchMode || "Not configured"}</span><span>Driver acceptance: {analytics.settings.driverAcceptanceMode || "Not configured"}</span><span>Booking page: {analytics.settings.bookingEnabled === null ? "Not connected" : analytics.settings.bookingEnabled ? "On" : "Off"}</span><span>Driver app: {analytics.settings.driverAppEnabled === null ? "Not connected" : analytics.settings.driverAppEnabled ? "On" : "Off"}</span><span>Customer updates: {analytics.settings.customerUpdatesEnabled === null ? "Not connected" : analytics.settings.customerUpdatesEnabled ? "On" : "Off"}</span></div></div>
                            </div>
                            {!analytics.operationalDataReady && <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100/80">Team/account analytics are live. Driver and job metrics will populate automatically as the production operational tables come online for this company.</p>}
                          </>
                        ) : <p className="text-sm text-white/45">Analytics are not available yet.</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
