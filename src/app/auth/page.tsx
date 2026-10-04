"use client";

import Link from "next/link";
import Script from "next/script";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, Building2, LockKeyhole, LogIn, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { authRequest, getApiBase, saveSession, type DispatchOSSession } from "@/lib/dispatchos-auth";
import { UrbanCarrierMark } from "@/components/branding/urban-carrier-mark";

type Mode = "login" | "register";
type RecoveryMode = "none" | "request" | "reset";

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
  const [mode, setMode] = useState<Mode>("login");
  const [plan, setPlan] = useState("basic");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState<RecoveryMode>("none");
  const [resetToken, setResetToken] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [socialProviders, setSocialProviders] = useState<Record<string, boolean>>({});
  const [socialOnboardingTicket, setSocialOnboardingTicket] = useState("");
  const [socialProvider, setSocialProvider] = useState("");
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
  const turnstileEnabled = Boolean(turnstileSiteKey);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get("mode");
    const requestedPlan = params.get("plan");
    const incomingReset = params.get("reset_token") || "";
    const socialTicket = params.get("social_ticket") || "";
    const onboardingTicket = params.get("social_onboarding_ticket") || "";
    const socialError = params.get("social_error") || "";

    if (requestedMode === "register") setMode("register");
    if (requestedMode === "login") setMode("login");
    if (requestedPlan === "business" || requestedPlan === "basic") setPlan(requestedPlan);
    if (incomingReset) {
      setResetToken(incomingReset);
      setRecoveryMode("reset");
    }
    if (socialError) setError(socialError);

    authRequest("/auth/social/status")
      .then((result) => setSocialProviders(result.providers || {}))
      .catch(() => setSocialProviders({}));

    if (socialTicket) {
      setLoading(true);
      authRequest("/auth/social/exchange", {
        method: "POST",
        body: JSON.stringify({ ticket: socialTicket }),
      })
        .then((result) => {
          const session = result as DispatchOSSession;
          saveSession(session, true);
          const base = process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "";
          const subscriptionStatus = session.subscription?.status?.toLowerCase() || "pending";
          const needsActivation = session.user.role !== "admin" && !["active", "trialing", "grace_period", "comped"].includes(subscriptionStatus);
          const destination = needsActivation
            ? "/subscribe"
            : session.user.role === "driver"
              ? "/driver"
              : "/workspace";
          window.location.href = base + destination;
        })
        .catch((cause) => setError(cause instanceof Error ? cause.message : "Social sign-in failed."))
        .finally(() => setLoading(false));
    }

    if (onboardingTicket) {
      setMode("register");
      setSocialOnboardingTicket(onboardingTicket);
      authRequest("/auth/social/profile", {
        method: "POST",
        body: JSON.stringify({ ticket: onboardingTicket }),
      })
        .then((result) => {
          setName(String(result.displayName || ""));
          setEmail(String(result.email || ""));
          setSocialProvider(String(result.provider || ""));
        })
        .catch((cause) => setError(cause instanceof Error ? cause.message : "Social onboarding expired."));
    }
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

  function beginSocial(provider: string) {
    const api = getApiBase();
    if (!api) {
      setError("Urban Carrier OS account service is not connected yet.");
      return;
    }
    const url = new URL(api + "/auth/social/" + provider + "/start");
    url.searchParams.set("purpose", mode === "register" ? "register" : "login");
    window.location.assign(url.toString());
  }

  async function requestRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await authRequest("/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setError(result.message || "If that account exists, a reset link will be sent.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Password recovery is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  async function finishRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await authRequest("/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token: resetToken, password }),
      });
      setRecoveryMode("none");
      setMode("login");
      setPassword("");
      setConfirmPassword("");
      setError(result.message || "Password updated. Sign in with your new password.");
      window.history.replaceState(null, "", window.location.pathname + "?mode=login");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Password reset failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!socialOnboardingTicket && turnstileEnabled && !turnstileToken) {
      setError("Please complete the security check before continuing.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "register"
        ? (socialOnboardingTicket ? "/auth/social/register" : "/auth/register")
        : "/auth/login";
      const body = mode === "register"
        ? (socialOnboardingTicket
            ? { ticket: socialOnboardingTicket, companyName, plan }
            : { name, companyName, email, password, plan, turnstileToken })
        : { email, password, turnstileToken };

      const data = await authRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      const session = data as DispatchOSSession;
      saveSession(session, rememberDevice);
      const base = process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "";
      const subscriptionStatus = session.subscription?.status?.toLowerCase() || "pending";
      const needsActivation = session.user.role !== "admin" && !["active", "trialing", "grace_period", "comped"].includes(subscriptionStatus);
      const destination = needsActivation
        ? "/subscribe"
        : session.user.role === "admin"
          ? "/admin"
          : session.user.role === "driver"
            ? "/driver"
            : "/workspace";
      window.location.href = `${base}${destination}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue.");
      if (turnstileEnabled) resetTurnstile();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#061a33] text-white">
      {turnstileEnabled && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => setTurnstileReady(true)} />
      )}

      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_30%_0%,rgba(56,189,248,.22),transparent_38%),radial-gradient(circle_at_75%_10%,rgba(249,115,22,.16),transparent_28%),linear-gradient(135deg,#061a33,#0a4a91)]">
        <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <Link href="/plans" className="inline-flex items-center gap-2 text-sm text-sky-200 hover:text-cyan-100"><ArrowLeft className="h-4 w-4" /> Back to Plans</Link>
          <div className="mt-8 max-w-3xl"><div className="mb-6"><UrbanCarrierMark href="/" size="lg" /></div>
            <p className="text-xs uppercase tracking-[0.26em] text-sky-300">Urban Carrier OS Account</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">{mode === "register" ? "Create your Urban Carrier OS account." : "Welcome back to Urban Carrier OS."}</h1>
            <p className="mt-5 text-base leading-7 text-white/62 md:text-lg">{mode === "register" ? "Create the company owner account for your selected plan, then continue into your company workspace." : "Sign in to manage your company account, settings, drivers, billing, and application downloads."}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 pt-8">
        <a
          href="https://icomputeranything.com/master"
          className="inline-flex items-center rounded-xl border border-cyan-300/20 bg-cyan-400/[0.06] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100 hover:bg-cyan-400/[0.1]"
        >
          ICA Master Owner → Open Super Platform
        </a>
      </div>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:py-16 lg:grid-cols-[.9fr_1.1fr]">
        <aside className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-7 md:p-9">
          <Building2 className="h-9 w-9 text-emerald-300" />
          <h2 className="mt-6 text-2xl font-semibold">One account. One company portal.</h2>
          <p className="mt-4 text-sm leading-6 text-white/58">After sign-in, first-time companies complete Company Setup. Then the account portal provides settings, driver management, billing, downloads, and custom integration access.</p>
          <div className="mt-7 rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.05] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-sky-300">Selected plan</p>
            <p className="mt-2 text-xl font-semibold">{plan === "business" ? "Urban Carrier OS Business — $149/mo" : "Urban Carrier OS Basic — $49.99/mo"}</p>
            <p className="mt-2 text-xs leading-5 text-white/45">Your account is created as pending. Secure Stripe checkout is required before operational access is activated.</p>
          </div>
        </aside>

        <div className="rounded-[2rem] border border-white/10 bg-[#08274f]/88 p-7 shadow-2xl md:p-9">
          <div className="mb-7 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.07] p-5">
            <div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /><div><p className="font-semibold text-emerald-100">Your company portal is separate from the working apps.</p><p className="mt-2 text-sm leading-6 text-white/58">Use the portal to configure the company and install Urban Carrier OS. Daily dispatching happens inside Dispatcher; field work happens inside Driver.</p></div></div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/20 p-1">
            <button type="button" onClick={() => { setMode("register"); setError(""); }} className={`rounded-lg px-4 py-3 text-sm font-semibold transition ${mode === "register" ? "bg-orange-500 text-white" : "text-white/55 hover:bg-white/[0.05]"}`}>Create Account</button>
            <button type="button" onClick={() => { setMode("login"); setError(""); }} className={`rounded-lg px-4 py-3 text-sm font-semibold transition ${mode === "login" ? "bg-sky-400 text-[#061a33]" : "text-white/55 hover:bg-white/[0.05]"}`}>Log In</button>
          </div>

          {recoveryMode === "request" ? (
            <form onSubmit={requestRecovery} className="space-y-5">
              <label className="block">
                <span className="text-sm text-white/70">Account email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 outline-none focus:border-orange-300/60" placeholder="you@company.com" />
              </label>
              {error && <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">{error}</div>}
              <button disabled={loading} className="w-full rounded-xl bg-orange-500 px-6 py-4 font-bold text-white">{loading ? "Sending..." : "Send Reset Link"}</button>
              <button type="button" onClick={() => { setRecoveryMode("none"); setError(""); }} className="w-full text-sm text-white/55 hover:text-white">Back to sign in</button>
            </form>
          ) : recoveryMode === "reset" ? (
            <form onSubmit={finishRecovery} className="space-y-5">
              <label className="block">
                <span className="text-sm text-white/70">New password</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 outline-none focus:border-orange-300/60" placeholder="10+ characters" />
              </label>
              <label className="block">
                <span className="text-sm text-white/70">Confirm password</span>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={10} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 outline-none focus:border-orange-300/60" />
              </label>
              {error && <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
              <button disabled={loading || password.length < 10 || confirmPassword.length < 10} className="w-full rounded-xl bg-orange-500 px-6 py-4 font-bold text-white">{loading ? "Resetting..." : "Reset Password"}</button>
            </form>
          ) : (
            <>
              {Object.values(socialProviders).some(Boolean) && (
                <div className="mb-5 grid gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">{mode === "register" ? "Create with" : "Continue with"}</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {socialProviders.google && <button type="button" onClick={() => beginSocial("google")} className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold hover:bg-white/[0.08]">Google</button>}
                    {socialProviders.apple && <button type="button" onClick={() => beginSocial("apple")} className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold hover:bg-white/[0.08]">Apple</button>}
                    {socialProviders.microsoft && <button type="button" onClick={() => beginSocial("microsoft")} className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold hover:bg-white/[0.08]">Microsoft</button>}
                  </div>
                </div>
              )}

              {socialProvider && (
                <div className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  {socialProvider.toUpperCase()} VERIFIED · {email}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {mode === "register" && (
                  <>
                    {!socialOnboardingTicket && <label className="block"><span className="text-sm text-white/70">Your name</span><input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 outline-none focus:border-orange-300/60" placeholder="Your name" /></label>}
                    <label className="block"><span className="text-sm text-white/70">Company</span><input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required autoComplete="organization" className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 outline-none focus:border-orange-300/60" placeholder="Company name" /></label>
                  </>
                )}

                <label className="block"><span className="text-sm text-white/70">Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} readOnly={Boolean(socialOnboardingTicket)} required autoComplete="email" className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 outline-none focus:border-orange-300/60" placeholder="you@company.com" /></label>

                {!socialOnboardingTicket && (
                  <label className="block"><span className="text-sm text-white/70">Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} autoComplete={mode === "register" ? "new-password" : "current-password"} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 outline-none focus:border-orange-300/60" placeholder="10+ characters" /></label>
                )}

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-cyan-400/15 bg-cyan-500/[0.05] px-4 py-3">
                  <input type="checkbox" checked={rememberDevice} onChange={(e) => setRememberDevice(e.target.checked)} className="mt-1 h-4 w-4 accent-orange-500" />
                  <span><span className="block text-sm font-medium text-cyan-100">Keep me signed in on this device for up to 7 days</span><span className="mt-1 block text-xs leading-5 text-white/45">Uncheck this on a shared device. Closing the installed app will not sign you out while this is enabled.</span></span>
                </label>

                {turnstileEnabled && !socialOnboardingTicket && <div className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="mb-3 flex items-center gap-2 text-xs text-white/55"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Security verification</div><div ref={turnstileContainerRef} className="min-h-[65px]" /></div>}
                {error && <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

                <button disabled={loading || (!socialOnboardingTicket && turnstileEnabled && !turnstileToken)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-4 font-bold text-white transition hover:bg-orange-400 disabled:cursor-wait disabled:opacity-60">{mode === "register" ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}{loading ? "Connecting..." : mode === "register" ? "Create Account" : "Log In"}</button>
                {mode === "login" && <button type="button" onClick={() => { setRecoveryMode("request"); setError(""); }} className="w-full text-sm text-sky-200 hover:text-cyan-100">Forgot password?</button>}
              </form>
            </>
          )}

          <div className="mt-6 flex items-start gap-3 text-xs leading-5 text-white/42"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />Passwords are stored as one-way hashes. Social sign-in never grants platform-admin access.</div>
        </div>
      </section>
    </main>
  );
}
