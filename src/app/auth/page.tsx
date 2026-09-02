"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Building2, LockKeyhole, LogIn, UserPlus } from "lucide-react";
import { authRequest, saveSession, type DispatchOSSession } from "@/lib/dispatchos-auth";

type Mode = "login" | "register";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [plan, setPlan] = useState("basic");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get("mode");
    const requestedPlan = params.get("plan");
    if (requestedMode === "register" || requestedMode === "login") setMode(requestedMode);
    if (requestedPlan === "business" || requestedPlan === "basic") setPlan(requestedPlan);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = mode === "register"
        ? await authRequest("/auth/register", {
            method: "POST",
            body: JSON.stringify({ name, companyName, email, password, plan }),
          })
        : await authRequest("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
          });

      const session = data as DispatchOSSession;
      saveSession(session);
      const base = process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "";
      const destination = session.user.role === "admin"
        ? "/workspace"
        : mode === "register"
          ? "/subscribe"
          : "/workspace";
      window.location.href = `${base}${destination}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_30%_0%,rgba(34,211,238,.16),transparent_38%),radial-gradient(circle_at_75%_10%,rgba(16,185,129,.11),transparent_28%)]">
        <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <Link href="/plans" className="inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100">
            <ArrowLeft className="h-4 w-4" /> Back to Plans
          </Link>
          <div className="mt-10 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.26em] text-cyan-300">DispatchOS Account</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
              {mode === "register" ? "Create your company account." : "Welcome back to DispatchOS."}
            </h1>
            <p className="mt-5 text-base leading-7 text-white/62 md:text-lg">
              Your login connects your company, selected plan, billing status, workspace, and team access.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:py-16 lg:grid-cols-[.9fr_1.1fr]">
        <aside className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-7 md:p-9">
          <Building2 className="h-9 w-9 text-emerald-300" />
          <h2 className="mt-6 text-2xl font-semibold">One account. One company workspace.</h2>
          <p className="mt-4 text-sm leading-6 text-white/58">
            Company owners create the first account. Drivers and dispatch staff can be invited into that company later without creating separate company subscriptions.
          </p>
          <div className="mt-7 rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.05] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Selected plan</p>
            <p className="mt-2 text-xl font-semibold">{plan === "business" ? "DispatchOS Business — $149/mo" : "DispatchOS Basic — $49.99/mo"}</p>
            <p className="mt-2 text-xs leading-5 text-white/45">Payment activation is the next step after account creation.</p>
          </div>
        </aside>

        <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-7 shadow-2xl md:p-9">
          <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-black/25 p-1">
            <button type="button" onClick={() => { setMode("login"); setError(""); }} className={`rounded-lg px-4 py-3 text-sm font-semibold ${mode === "login" ? "bg-cyan-400 text-slate-950" : "text-white/55"}`}>
              Log In
            </button>
            <button type="button" onClick={() => { setMode("register"); setError(""); }} className={`rounded-lg px-4 py-3 text-sm font-semibold ${mode === "register" ? "bg-emerald-500 text-white" : "text-white/55"}`}>
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            {mode === "register" && (
              <>
                <label className="block">
                  <span className="text-sm text-white/70">Your name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 outline-none focus:border-cyan-300/50" placeholder="Company owner name" />
                </label>
                <label className="block">
                  <span className="text-sm text-white/70">Company name</span>
                  <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 outline-none focus:border-cyan-300/50" placeholder="Your company" />
                </label>
              </>
            )}

            <label className="block">
              <span className="text-sm text-white/70">Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 outline-none focus:border-cyan-300/50" placeholder="you@company.com" />
            </label>

            <label className="block">
              <span className="text-sm text-white/70">Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} autoComplete={mode === "register" ? "new-password" : "current-password"} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 outline-none focus:border-cyan-300/50" placeholder="10+ characters" />
            </label>

            {error && <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

            <button disabled={loading} className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 font-bold transition disabled:cursor-wait disabled:opacity-60 ${mode === "register" ? "bg-emerald-500 hover:bg-emerald-400" : "bg-cyan-400 text-slate-950 hover:bg-cyan-300"}`}>
              {mode === "register" ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
              {loading ? "Connecting..." : mode === "register" ? "Create Company Account" : "Log In"}
            </button>
          </form>

          <div className="mt-6 flex items-start gap-3 text-xs leading-5 text-white/42">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            Passwords are sent only to the DispatchOS account API and are stored as one-way password hashes, not readable passwords.
          </div>
        </div>
      </section>
    </main>
  );
}
