"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ShieldCheck, Smartphone, MonitorUp, ArrowLeft, Copy, CreditCard, Crown, Zap } from "lucide-react";
import CustomVersionModal from "@/components/marketing/custom-version-modal";
import { getStoredSession } from "@/lib/dispatchos-auth";

const features = [
  "Dispatcher command dashboard",
  "Driver mobile app experience",
  "Branded customer booking page",
  "Driver management and invitations",
  "Company settings and dispatch controls",
  "Customer status and update workflow",
  "App Install Center for dispatcher and driver",
  "Ongoing platform updates",
];

export default function SubscribePage() {
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const session = useMemo(() => getStoredSession(), []);
  const selectedPlan = session?.subscription?.plan === "business" ? "business" : "basic";
  const companyId = session?.company?.slug || "";
  const email = session?.user?.email || "";

  const checkoutLinks = {
    basic: "https://buy.stripe.com/bJecN574Ze3Lgoucq2frW00",
    business: "https://buy.stripe.com/4gM5kD60V0cVegm4XAfrW01",
  };

  function checkoutUrl(plan: "basic" | "business") {
    const url = checkoutLinks[plan];
    return email ? url + "?prefilled_email=" + encodeURIComponent(email) : url;
  }

  async function copyCompanyId() {
    if (!companyId) return;
    await navigator.clipboard.writeText(companyId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const plans = [
    { id: "basic" as const, name: "Urban Carrier OS Basic", price: "$49.99", icon: Zap, summary: "Core Urban Carrier OS access for smaller teams." },
    { id: "business" as const, name: "Urban Carrier OS Business", price: "$149", icon: Crown, summary: "Higher team capacity plus assisted and automatic dispatch tools." },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.16),transparent_38%)]">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100">
            <ArrowLeft className="h-4 w-4" />
            Back to Urban Carrier OS
          </Link>

          <div className="mt-12 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.26em] text-cyan-300">Urban Carrier OS Subscription</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">Activate Urban Carrier OS for your company</h1>
            <p className="mt-5 text-lg leading-8 text-white/70">
              Your company account is reserved, but operational access stays locked until a paid Urban Carrier OS subscription is activated through Stripe.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 md:py-20">
        <div className="mb-8 rounded-3xl border border-amber-300/20 bg-amber-400/[0.06] p-6">
          <div className="flex items-start gap-4">
            <ShieldCheck className="mt-0.5 h-7 w-7 shrink-0 text-amber-200" />
            <div className="min-w-0">
              <p className="font-semibold text-amber-100">Workspace access is locked until billing is active.</p>
              <p className="mt-2 text-sm leading-6 text-white/65">Stripe checkout will ask for your ICA Company ID so the payment can be matched to the company account you just created.</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-cyan-100">{companyId || "Sign in first to load your Company ID"}</code>
                <button type="button" onClick={copyCompanyId} disabled={!companyId} className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 disabled:opacity-40">
                  <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy Company ID"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const selected = selectedPlan === plan.id;
            return (
              <article key={plan.id} className={`rounded-3xl border p-7 md:p-9 ${selected ? "border-emerald-300/35 bg-emerald-500/[0.07]" : "border-white/10 bg-white/[0.04]"}`}>
                <div className="flex items-start justify-between gap-4">
                  <Icon className={`h-9 w-9 ${plan.id === "business" ? "text-emerald-300" : "text-cyan-300"}`} />
                  {selected && <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-200">Selected Plan</span>}
                </div>
                <h2 className="mt-6 text-2xl font-semibold">{plan.name}</h2>
                <p className="mt-2 text-sm leading-6 text-white/60">{plan.summary}</p>
                <div className="mt-6 flex items-end gap-2"><strong className="text-4xl font-semibold">{plan.price}</strong><span className="pb-1 text-sm text-white/45">/month</span></div>
                <a href={checkoutUrl(plan.id)} className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 font-bold transition ${plan.id === "business" ? "bg-emerald-500 text-white hover:bg-emerald-400" : "bg-cyan-400 text-slate-950 hover:bg-cyan-300"}`}>
                  <CreditCard className="h-5 w-5" /> Subscribe with Stripe
                </a>
                <p className="mt-3 text-center text-xs text-white/42">Secure recurring card checkout handled by Stripe. Operational access remains blocked until subscription activation.</p>
              </article>
            );
          })}
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7"><MonitorUp className="h-8 w-8 text-cyan-300" /><h3 className="mt-4 text-xl font-semibold">Dispatcher App</h3><p className="mt-3 text-sm leading-6 text-white/65">Available after paid activation for owners and authorized dispatch staff.</p></div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7"><Smartphone className="h-8 w-8 text-cyan-300" /><h3 className="mt-4 text-xl font-semibold">Driver App</h3><p className="mt-3 text-sm leading-6 text-white/65">Drivers receive mobile mission access through an activated company subscription.</p></div>
        </div>

        <div className="mt-6 rounded-3xl border border-cyan-400/20 bg-cyan-500/[0.06] p-7">
          <p className="text-sm font-semibold text-cyan-200">Need a custom deployment?</p>
          <p className="mt-2 text-sm leading-6 text-white/65">I Computer Anything can tailor Urban Carrier OS to a company-specific workflow, branding, or integration stack.</p>
          <button type="button" onClick={() => setCustomModalOpen(true)} className="mt-5 inline-flex text-sm font-semibold text-cyan-200 hover:text-cyan-100">Request a Custom Version →</button>
        </div>
      </section>

      <CustomVersionModal open={customModalOpen} onClose={() => setCustomModalOpen(false)} />
    </main>
  );
}