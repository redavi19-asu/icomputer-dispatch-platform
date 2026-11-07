"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { UrbanCarrierMark } from "@/components/branding/urban-carrier-mark";

const STORAGE_KEY = "dispatchos-cookie-consent";

export function openCarrierLegalPanel(view: "privacy" | "terms" | "cookies") {
  window.dispatchEvent(new CustomEvent("carrier:legal", { detail: view }));
}

function subscribeToConsent(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("carrier:consent-updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("carrier:consent-updated", callback);
  };
}
function consentIsMissing() {
  try { return !window.localStorage.getItem(STORAGE_KEY); }
  catch { return true; }
}

type LegalView = "privacy" | "terms" | null;

export function LegalConsent() {
  const pathname = usePathname();
  const missingConsent = useSyncExternalStore(subscribeToConsent, consentIsMissing, () => false);
  const [cookiePanelOpen, setCookiePanelOpen] = useState(false);
  const [dismissedThisSession, setDismissedThisSession] = useState(false);
  const showCookies = cookiePanelOpen || (missingConsent && !dismissedThisSession);
  const [legalView, setLegalView] = useState<LegalView>(null);

  const choose = (value: "accepted" | "essential-only") => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {}
    setDismissedThisSession(true);
    setCookiePanelOpen(false);
    window.dispatchEvent(new Event("carrier:consent-updated"));
  };

  const reopenCookies = () => setCookiePanelOpen(true);

  useEffect(() => {
    const open = (event: Event) => {
      const view = (event as CustomEvent).detail;
      if (view === "privacy" || view === "terms") setLegalView(view);
      if (view === "cookies") setCookiePanelOpen(true);
    };
    window.addEventListener("carrier:legal", open);
    return () => window.removeEventListener("carrier:legal", open);
  }, []);

  const isPrivacy = legalView === "privacy";

  if (pathname?.includes("/visual/city")) return null;

  return (
    <>
      {showCookies && (
        <section aria-label="Privacy and cookie preferences" className="fixed inset-x-4 bottom-4 z-[9999] mx-auto flex max-h-[calc(100dvh-2rem)] max-w-5xl flex-wrap items-center justify-between gap-4 overflow-y-auto rounded-2xl border border-sky-100 bg-white px-5 py-4 text-slate-900 shadow-[0_18px_55px_rgba(6,26,51,.16)] backdrop-blur-xl">
          <div className="flex max-w-3xl items-start gap-3">
            <UrbanCarrierMark href="" size="sm" />
            <div><p className="text-sm font-semibold text-[#061a33]">Urban Carrier OS privacy & cookies</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Urban Carrier OS uses essential browser storage and session technologies for account sign-in, security, preferences, and core platform functionality. Optional technologies may be used to improve the product experience.
            </p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => choose("essential-only")} className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-[#08274f] transition hover:border-sky-300 hover:bg-sky-100">
              Essential Only
            </button>
            <button type="button" onClick={() => choose("accepted")} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400 hover:shadow-[0_10px_28px_rgba(249,115,22,.28)]">
              Accept
            </button>
          </div>
          <nav aria-label="Cookie notice legal links" className="flex w-full flex-wrap gap-4 border-t border-sky-100 pt-3 text-xs font-semibold">
        <button type="button" onClick={() => setLegalView("privacy")} className="rounded-lg px-2 py-2 text-[#08274f] underline underline-offset-4 hover:bg-sky-50">Privacy</button>
        <button type="button" onClick={() => setLegalView("terms")} className="rounded-lg px-2 py-2 text-[#08274f] underline underline-offset-4 hover:bg-sky-50">Terms</button>
        <button type="button" onClick={reopenCookies} className="rounded-lg px-2 py-2 text-[#08274f] underline underline-offset-4 hover:bg-sky-50">Cookies</button>
          </nav>
        </section>
      )}

      {!showCookies && <button type="button" onClick={() => setCookiePanelOpen(true)} className="fixed bottom-4 left-4 z-[9998] rounded-xl border border-sky-200 bg-white px-4 py-3 text-xs font-semibold text-[#08274f] shadow-lg">Privacy & cookie settings</button>}

      {legalView && (
        <div className="fixed inset-0 z-[10000] grid place-items-center bg-black/75 p-5 backdrop-blur-sm" onClick={() => setLegalView(null)}>
          <div role="dialog" aria-modal="true" aria-label={isPrivacy ? "Privacy notice" : "Terms and disclaimer"} className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-sky-200 bg-white p-6 text-slate-900 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-xl font-bold">{isPrivacy ? "Urban Carrier OS Privacy Notice" : "Urban Carrier OS Terms & Disclaimer"}</h2>
            {isPrivacy ? (
              <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
                <p>Urban Carrier OS uses information you provide to operate accounts, company workspaces, booking and dispatch workflows, driver access, customer updates, support, security, and billing-related functionality.</p>
                <p>Essential browser storage, session identifiers, and similar technologies may be required to keep users signed in, protect accounts, remember platform preferences, and provide core service features.</p>
                <p>Urban Carrier OS may rely on third-party infrastructure, payment, mapping, communications, analytics, hosting, and security providers. Those providers may process limited information according to their own terms and privacy practices.</p>
                <p>When Cloudflare Turnstile is enabled, it will be used as a security measure to help distinguish legitimate users from automated traffic on protected forms such as registration or login.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
                <p>Urban Carrier OS is software for coordinating field-service operations. Features, pricing, availability, integrations, and service limits may change as the platform is developed and updated.</p>
                <p>Companies using Urban Carrier OS remain responsible for their own drivers, customers, scheduling decisions, regulatory obligations, business operations, and the accuracy of information entered into the platform.</p>
                <p>Routing, mapping, estimated arrival times, automated dispatch suggestions, notifications, and other generated operational information should be reviewed by the company using the platform before relying on it for critical decisions.</p>
              </div>
            )}
            <button type="button" onClick={() => setLegalView(null)} className="mt-6 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400 hover:shadow-[0_10px_28px_rgba(249,115,22,.28)]">Close</button>
          </div>
        </div>
      )}
    </>
  );
}
