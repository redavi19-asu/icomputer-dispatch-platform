"use client";

import Link from "next/link";
import Script from "next/script";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, Building2, LockKeyhole, LogIn, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { authRequest, saveSession, type DispatchOSSession } from "@/lib/dispatchos-auth";

type Mode = "login" | "register";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    }
  ) => string;
  reset: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export default function AuthPage() {
  const registrationClosed = true;
  const [mode, setMode] = useState<Mode>("login");
  const [plan, setPlan] = useState("basic");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
  const turnstileEnabled = Boolean(turnstileSiteKey);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get("mode");
    const requestedPlan = params.get("plan");
    if (!registrationClosed && requestedMode === "register") setMode("register");
    if (requestedMode === "login") setMode("login");
    if (requestedPlan === "business" || requestedPlan === "basic") setPlan(requestedPlan);
  }, []);

  useEffect(() => {
    if (!turnstileEnabled || !turnstileReady || !window.turnstile || !turnstileContainerRef.current) return;
    if (turnstileWidgetIdRef.current) return;

    turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
      sitekey: turnstileSiteKey,
      theme: "dark",
      callback: (token) => {
        setTurnstileToken(token);
        setError("");
      },
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => {
        setTurnstileToken("");
        setError("Security check could not load. Please try again.");
      },
    });
  }, [turnstileEnabled, turnstileReady, turnstileSiteKey]);

  function resetTurnstile() {
    setTurnstileToken("");
    if (turnstileWidgetIdRef.current && window.turnstile) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
    }
  }

  function changeMode(nextMode: Mode) {
    if (registrationClosed && nextMode === "register") return;
    setMode(nextMode);
    setError("");
    if (turnstileEnabled) resetTurnstile();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (registrationClosed && mode === "register") {
      setMode("login");
      setError("Public account creation is not open yet.");
      return;
    }

    if (turnstileEnabled && !turnstileToken) {
      setError("Please complete the security check before continuing.");
      return;
    }

    setLoading(true);

    try {
      const data = mode === "register"
        ? await authRequest("/auth/register", {
            method: "POST",
            body: JSON.stringify({ name, companyName, email, password, plan, turnstileToken }),
          })
        : await authRequest("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password, turnstileToken }),
          });

      const session = data as DispatchOSSession;
      saveSession(session);
      const base = process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "";
      const destination = session.user.role === "admin"
        ? "/admin"
        : mode === "register"
          ? "/subscribe"
          : "/download";
      window.location.href = `${base}${destination}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue.");
      if (turnstileEnabled) resetTurnstile();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      {turnstileEnabled && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={() => setTurnstileReady(true)}
        />
      )}

      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_30%_0%,rgba(34,211,238,.16),transparent_38%),radial-gradient(circle_at_75%_10%,rgba(16,185,129,.11),transparent_28%)]">
        <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <Link href="/plans" className="inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100">
            <ArrowLeft className="h-4 w-4" /> Back to Plans
          </Link>
          <div className="mt-10 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.26em] text-cyan-300">DispatchOS Account</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">Welcome back to DispatchOS.</h1>
            <p className="mt-5 text-base leading-7 text-white/62 md:text-lg">
              Existing access remains available while we finish the final production systems for public launch.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:py-16 lg:grid-cols-[.9fr_1.1fr]">
        <aside className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-7 md:p-9">
          <Building2 className="h-9 w-9 text-emerald-300" />
          <h2 className="mt-6 text-2xl font-semibold">One account. One company workspace.</h2>
          <p className="mt-4 text-sm leading-6 text-white/58">
            DispatchOS is being prepared for public onboarding. Existing authorized users can still sign in while new company registration stays closed until launch.
          </p>
          <div className="mt-7 rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.05] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Selected plan</p>
            <p className="mt-2 text-xl font-semibold">{plan === "business" ? "DispatchOS Business — $149/mo" : "DispatchOS Basic — $49.99/mo"}</p>
            <p className="mt-2 text-xs leading-5 text-white/45">Plan activation will open with public onboarding.</p>
          </div>
        </aside>

        <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-7 shadow-2xl md:p-9">
          <div className="mb-7 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.07] p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              <div>
                <p className="font-semibold text-emerald-100">We’re almost ready to put DispatchOS to work.</p>
                <p className="mt-2 text-sm leading-6 text-white/58">
                  Final production systems are being locked in now. Public account creation will open when the platform is ready for real companies, real drivers, and real dispatch operations — not before.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-black/25 p-1">
            <button type="button" onClick={() => changeMode("login")} className={`rounded-lg px-4 py-3 text-sm font-semibold ${mode === "login" ? "bg-cyan-400 text-slate-950" : "text-white/55"}`}>
              Log In
            </button>
            <button type="button" disabled className="cursor-not-allowed rounded-lg px-4 py-3 text-sm font-semibold text-white/30">
              Access Opening Soon
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
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} autoComplete="current-password" className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 outline-none focus:border-cyan-300/50" placeholder="10+ characters" />
            </label>

            {turnstileEnabled && (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs text-white/55">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  Security verification
                </div>
                <div ref={turnstileContainerRef} className="min-h-[65px]" />
              </div>
            )}

            {error && <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

            <button disabled={loading || (turnstileEnabled && !turnstileToken)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 py-4 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60">
              <LogIn className="h-5 w-5" />
              {loading ? "Connecting..." : "Log In"}
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
