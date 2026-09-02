"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Copy, Mail, Send, ShieldCheck } from "lucide-react";

import { AppShellNav } from "@/components/platform/app-shell-nav";
import { authRequest, getStoredSession } from "@/lib/dispatchos-auth";

type InviteResponse = {
  success?: boolean;
  invite?: {
    id: string;
    email: string;
    companySlug: string;
    expiresAt: string;
    token: string;
  };
};

const basePath = () => (process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "");

export default function SecureDriverInvitePage() {
  const [email, setEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [companyName, setCompanyName] = useState("Your company");

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      window.location.replace(`${basePath()}/auth?mode=login`);
      return;
    }
    if (session.user.role === "driver") {
      window.location.replace(`${basePath()}/driver`);
      return;
    }
    setCompanyName(session.company.name || "Your company");
  }, []);

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInviteLink("");
    setCopied(false);
    setIsCreating(true);

    try {
      const data = (await authRequest("/api/driver-invites", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), expiresInHours: 72 }),
      })) as InviteResponse;

      if (!data.invite?.token) throw new Error("Driver invite was not created.");

      const link = `${window.location.origin}${basePath()}/driver-invite?token=${encodeURIComponent(data.invite.token)}`;
      setInviteLink(link);
      setExpiresAt(data.invite.expiresAt);
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Unable to create driver invite.");
    } finally {
      setIsCreating(false);
    }
  }

  async function copyInvite() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Copy failed. Select and copy the link manually.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <AppShellNav />
      <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <Link
          href="/workspace/drivers"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Drivers
        </Link>

        <div className="mt-7 rounded-[2rem] border border-cyan-400/20 bg-[linear-gradient(145deg,rgba(8,47,73,.42),rgba(2,6,23,.96)_68%)] p-7 md:p-9">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3">
              <ShieldCheck className="h-7 w-7 text-cyan-300" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Secure Driver Access</p>
              <h1 className="mt-2 text-3xl font-semibold">Invite a driver to {companyName}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
                Each link is created for this signed-in company, expires after 72 hours, and can only be accepted once. The driver creates their own password and receives a company-bound Driver session.
              </p>
            </div>
          </div>

          <form onSubmit={createInvite} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/75">Driver email</span>
              <div className="flex items-center gap-3 rounded-xl border border-white/12 bg-black/25 px-4 py-3 focus-within:border-cyan-400/50">
                <Mail className="h-5 w-5 text-cyan-300" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="driver@company.com"
                  className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3.5 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {isCreating ? "Creating secure invite…" : "Create Secure Driver Invite"}
            </button>
          </form>

          {error ? (
            <div className="mt-5 rounded-xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          {inviteLink ? (
            <div className="mt-7 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.07] p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-emerald-100">Company-bound invite created.</p>
                  <p className="mt-1 text-sm text-emerald-100/60">
                    Send this link only to the intended driver. It expires {expiresAt ? new Date(expiresAt).toLocaleString() : "in 72 hours"}.
                  </p>
                  <div className="mt-4 break-all rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-white/70">
                    {inviteLink}
                  </div>
                  <button
                    type="button"
                    onClick={copyInvite}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 hover:bg-emerald-400/15"
                  >
                    <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy Invite Link"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
