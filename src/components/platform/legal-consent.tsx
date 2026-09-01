"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "dispatchos-cookie-consent";

type LegalView = "privacy" | "terms" | null;

export function LegalConsent() {
  const [showCookies, setShowCookies] = useState(false);
  const [legalView, setLegalView] = useState<LegalView>(null);

  useEffect(() => {
    try {
      setShowCookies(!window.localStorage.getItem(STORAGE_KEY));
    } catch {
      setShowCookies(true);
    }
  }, []);

  const choose = (value: "accepted" | "essential-only") => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {}
    setShowCookies(false);
  };

  const reopenCookies = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setShowCookies(true);
  };

  const isPrivacy = legalView === "privacy";

  return (
    <>
      {showCookies && (
        <div className="fixed inset-x-4 bottom-4 z-[9999] mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-950/95 px-5 py-4 text-white shadow-2xl backdrop-blur-xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold">DispatchOS privacy & cookies</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              DispatchOS uses essential browser storage and session technologies for account sign-in, security, preferences, and core platform functionality. Optional technologies may be used to improve the product experience.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => choose("essential-only")} className="rounded-lg border border-slate-500 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:border-emerald-400/50 hover:bg-emerald-500/10">
              Essential Only
            </button>
            <button type="button" onClick={() => choose("accepted")} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 hover:shadow-[0_0_22px_rgba(52,211,153,0.35)]">
              Accept
            </button>
          </div>
        </div>
      )}

      <div className={`fixed right-4 z-[9998] flex flex-wrap justify-end gap-2 text-[11px] ${showCookies ? "bottom-32 sm:bottom-24" : "bottom-4"}`}>
        <button type="button" onClick={() => setLegalView("privacy")} className="rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-slate-200 shadow-lg backdrop-blur transition hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-emerald-100">Privacy</button>
        <button type="button" onClick={() => setLegalView("terms")} className="rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-slate-200 shadow-lg backdrop-blur transition hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-emerald-100">Terms</button>
        <button type="button" onClick={reopenCookies} className="rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-slate-200 shadow-lg backdrop-blur transition hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-emerald-100">Cookies</button>
      </div>

      {legalView && (
        <div className="fixed inset-0 z-[10000] grid place-items-center bg-black/75 p-5 backdrop-blur-sm" onClick={() => setLegalView(null)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-6 text-slate-100 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-xl font-bold">{isPrivacy ? "DispatchOS Privacy Notice" : "DispatchOS Terms & Disclaimer"}</h2>
            {isPrivacy ? (
              <div className="mt-4 space-y-4 text-sm leading-6 text-slate-300">
                <p>DispatchOS uses information you provide to operate accounts, company workspaces, booking and dispatch workflows, driver access, customer updates, support, security, and billing-related functionality.</p>
                <p>Essential browser storage, session identifiers, and similar technologies may be required to keep users signed in, protect accounts, remember platform preferences, and provide core service features.</p>
                <p>DispatchOS may rely on third-party infrastructure, payment, mapping, communications, analytics, hosting, and security providers. Those providers may process limited information according to their own terms and privacy practices.</p>
                <p>When Cloudflare Turnstile is enabled, it will be used as a security measure to help distinguish legitimate users from automated traffic on protected forms such as registration or login.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-4 text-sm leading-6 text-slate-300">
                <p>DispatchOS is software for coordinating field-service operations. Features, pricing, availability, integrations, and service limits may change as the platform is developed and updated.</p>
                <p>Companies using DispatchOS remain responsible for their own drivers, customers, scheduling decisions, regulatory obligations, business operations, and the accuracy of information entered into the platform.</p>
                <p>Routing, mapping, estimated arrival times, automated dispatch suggestions, notifications, and other generated operational information should be reviewed by the company using the platform before relying on it for critical decisions.</p>
              </div>
            )}
            <button type="button" onClick={() => setLegalView(null)} className="mt-6 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 hover:shadow-[0_0_22px_rgba(52,211,153,0.35)]">Close</button>
          </div>
        </div>
      )}
    </>
  );
}
