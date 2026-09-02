"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, KeyRound, LockKeyhole, ShieldCheck, Smartphone, UserRound } from "lucide-react";

import { getApiBase, saveSession, type DispatchOSSession } from "@/lib/dispatchos-auth";

const basePath = () => (process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "");

type AcceptInviteResponse = {
  success?: boolean;
  token?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  company?: {
    id: string;
    name: string;
    slug: string;
  };
  subscription?: {
    status?: string;
  };
  error?: string;
};

export default function DriverInviteAcceptancePage() {
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
  }, []);

  async function acceptInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("This driver invite link is missing its secure token.");
      return;
    }
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const apiBase = getApiBase();
    if (!apiBase) {
      setError("DispatchOS account service is not connected.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiBase}/api/driver-invites/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: name.trim(), phone: phone.trim(), password }),
      });
      const data = (await response.json().catch(() => ({}))) as AcceptInviteResponse;
      if (!response.ok || !data.token || !data.user || !data.company) {
        throw new Error(data.error || "Unable to accept this driver invite.");
      }

      const session: DispatchOSSession = {
        token: data.token,
        user: data.user,
        company: data.company,
        subscription: {
          plan: "company",
          status: data.subscription?.status || "active",
        },
      };

      saveSession(session);
      setCompanyName(data.company.name);
      setComplete(true);
      window.setTimeout(() => {
        window.location.replace(`${basePath()}/driver`);
      }, 850);
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Unable to accept this driver invite.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (complete) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="w-full max-w-lg rounded-[2rem] border border-emerald-400/20 bg-emerald-500/[0.07] p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-300" />
          <h1 className="mt-5 text-2xl font-semibold">Driver access activated.</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Your account is bound to {companyName || "this company"}. Opening your Driver app now.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white md:py-20">
      <section className="mx-auto max-w-xl rounded-[2rem] border border-cyan-400/20 bg-[linear-gradient(145deg,rgba(8,47,73,.38),rgba(2,6,23,.98)_70%)] p-7 shadow-2xl md:p-9">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3">
            <Smartphone className="h-7 w-7 text-cyan-300" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">DispatchOS Driver</p>
            <h1 className="mt-2 text-3xl font-semibold">Activate your secure driver access</h1>
            <p className="mt-3 text-sm leading-6 text-white/60">
              This invitation can only be used once. Your account will be attached to the company that issued the invite, not to any other DispatchOS workspace.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.055] p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
          <p className="text-sm leading-6 text-emerald-100/70">
            Company identity comes from the signed invite token on the server. You cannot switch companies by editing this page or the URL.
          </p>
        </div>

        <form onSubmit={acceptInvite} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white/75">Your name</span>
            <div className="flex items-center gap-3 rounded-xl border border-white/12 bg-black/25 px-4 py-3 focus-within:border-cyan-400/50">
              <UserRound className="h-5 w-5 text-cyan-300" />
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full bg-transparent outline-none placeholder:text-white/30"
                placeholder="Full name"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white/75">Phone</span>
            <div className="flex items-center gap-3 rounded-xl border border-white/12 bg-black/25 px-4 py-3 focus-within:border-cyan-400/50">
              <Smartphone className="h-5 w-5 text-cyan-300" />
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full bg-transparent outline-none placeholder:text-white/30"
                placeholder="(555) 555-5555"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white/75">Create password</span>
            <div className="flex items-center gap-3 rounded-xl border border-white/12 bg-black/25 px-4 py-3 focus-within:border-cyan-400/50">
              <KeyRound className="h-5 w-5 text-cyan-300" />
              <input
                type="password"
                required
                minLength={10}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent outline-none placeholder:text-white/30"
                placeholder="At least 10 characters"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white/75">Confirm password</span>
            <div className="flex items-center gap-3 rounded-xl border border-white/12 bg-black/25 px-4 py-3 focus-within:border-cyan-400/50">
              <LockKeyhole className="h-5 w-5 text-cyan-300" />
              <input
                type="password"
                required
                minLength={10}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full bg-transparent outline-none placeholder:text-white/30"
                placeholder="Repeat password"
              />
            </div>
          </label>

          {error ? (
            <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3.5 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShieldCheck className="h-5 w-5" />
            {isSubmitting ? "Activating secure access…" : "Activate Driver Access"}
          </button>
        </form>
      </section>
    </main>
  );
}
