"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  Building2,
  CheckCircle2,
  CreditCard,
  Gift,
  Plus,
  RefreshCw,
  ShieldCheck,
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
};

const basePath = () => (process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "");

export default function AdminPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [plan, setPlan] = useState("basic");
  const [accessStatus, setAccessStatus] = useState("comped");
  const [creating, setCreating] = useState(false);

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
    const active = companies.filter((c) => c.status === "active" || c.status === "comped").length;
    const comped = companies.filter((c) => c.status === "comped").length;
    const suspended = companies.filter((c) => c.status === "suspended" || c.status === "canceled").length;
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

  async function createCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      await authRequest("/admin/companies", {
        method: "POST",
        body: JSON.stringify({
          companyName,
          ownerName,
          ownerEmail,
          temporaryPassword,
          plan,
          accessStatus,
        }),
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
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-cyan-300">
                <ShieldCheck className="h-4 w-4" /> Platform Administrator
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">DispatchOS Command Center</h1>
              <p className="mt-4 max-w-3xl text-white/60">
                Platform-level control over company access, plans, complimentary accounts, and onboarding. This console is not available to company users.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => void loadCompanies()} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
              <button onClick={() => setShowCreate((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300">
                <Plus className="h-4 w-4" /> Onboard Company
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Companies", stats.total, Building2],
            ["Active access", stats.active, CheckCircle2],
            ["Comped accounts", stats.comped, Gift],
            ["Suspended", stats.suspended, Ban],
          ].map(([label, value, Icon]) => {
            const IconComponent = Icon as typeof Building2;
            return (
              <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <IconComponent className="h-5 w-5 text-cyan-300" />
                <p className="mt-4 text-3xl font-semibold">{String(value)}</p>
                <p className="mt-1 text-sm text-white/45">{String(label)}</p>
              </div>
            );
          })}
        </div>

        {showCreate && (
          <form onSubmit={createCompany} className="mt-8 rounded-3xl border border-cyan-400/20 bg-cyan-500/[0.04] p-6 md:p-8">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-cyan-300" />
              <div>
                <h2 className="text-xl font-semibold">Administrator onboarding</h2>
                <p className="text-sm text-white/50">Create a private company workspace even while public registration is closed.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required placeholder="Company name" className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-cyan-300/50" />
              <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required placeholder="Owner name" className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-cyan-300/50" />
              <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} required placeholder="Owner email" className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-cyan-300/50" />
              <input type="password" minLength={10} value={temporaryPassword} onChange={(e) => setTemporaryPassword(e.target.value)} required placeholder="Temporary password (10+ characters)" className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-cyan-300/50" />
              <select value={plan} onChange={(e) => setPlan(e.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                <option value="basic">Basic</option>
                <option value="business">Business</option>
                <option value="custom">Custom</option>
              </select>
              <select value={accessStatus} onChange={(e) => setAccessStatus(e.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                <option value="comped">Complimentary / Free</option>
                <option value="active">Active / Paid externally</option>
              </select>
            </div>
            <button disabled={creating} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-bold hover:bg-emerald-400 disabled:opacity-50">
              <Plus className="h-4 w-4" /> {creating ? "Creating..." : "Create Company Workspace"}
            </button>
          </form>
        )}

        {error && <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{error}</div>}

        <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold">Company control</h2>
              <p className="mt-1 text-sm text-white/45">Suspend access, restore companies, comp service, or change plans.</p>
            </div>
            <Users className="h-5 w-5 text-white/35" />
          </div>

          {loading ? (
            <div className="p-8 text-sm text-white/50">Loading platform companies...</div>
          ) : companies.length === 0 ? (
            <div className="p-8 text-sm text-white/50">No companies found.</div>
          ) : (
            <div className="divide-y divide-white/10">
              {companies.map((company) => {
                const protectedCompany = Boolean(company.protected_admin_company);
                const disabled = savingId === company.id;
                return (
                  <div key={company.id} className="p-6">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold">{company.name}</h3>
                          {protectedCompany && <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200">ADMIN COMPANY</span>}
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/55">{company.status || "pending"}</span>
                        </div>
                        <p className="mt-2 text-sm text-white/48">{company.owner_name || "No owner"} · {company.owner_email || "No owner email"}</p>
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/38">
                          <span>Plan: {company.plan || "none"}</span>
                          <span>Members: {company.member_count || 0}</span>
                          <span>Slug: {company.slug}</span>
                          <span>Created: {new Date(company.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button disabled={disabled} onClick={() => void updateCompany(company.id, { status: "comped" })} className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-40">
                          <Gift className="h-4 w-4" /> Comp
                        </button>
                        <button disabled={disabled} onClick={() => void updateCompany(company.id, { status: "active" })} className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 disabled:opacity-40">
                          <CheckCircle2 className="h-4 w-4" /> Activate
                        </button>
                        <button disabled={disabled} onClick={() => void updateCompany(company.id, { plan: company.plan === "business" ? "basic" : "business" })} className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 disabled:opacity-40">
                          <CreditCard className="h-4 w-4" /> {company.plan === "business" ? "Set Basic" : "Set Business"}
                        </button>
                        <button disabled={disabled || protectedCompany} onClick={() => void updateCompany(company.id, { status: "suspended" })} className="inline-flex items-center gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 disabled:opacity-35">
                          <Ban className="h-4 w-4" /> Suspend
                        </button>
                      </div>
                    </div>
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
