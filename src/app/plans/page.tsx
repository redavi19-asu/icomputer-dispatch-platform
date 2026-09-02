"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Crown, ShieldCheck, Sparkles, Zap } from "lucide-react";
import CustomVersionModal from "@/components/marketing/custom-version-modal";

const plans = [
  {
    id: "basic",
    name: "DispatchOS Basic",
    price: "$49.99",
    cadence: "/month",
    description: "A complete dispatch system for small teams that need the core workflow without enterprise-sized capacity.",
    icon: Zap,
    accent: "cyan",
    features: [
      "Up to 10 drivers / field users",
      "1 dispatcher / admin seat",
      "Dispatcher app",
      "Driver mobile app",
      "Manual job assignment",
      "Job and field status updates",
      "Company settings and preferences",
      "Driver management",
      "App installation on supported devices",
      "Standard operations view",
    ],
  },
  {
    id: "business",
    name: "DispatchOS Business",
    price: "$149",
    cadence: "/month",
    description: "More team capacity, more dispatcher access, and deeper operating tools for growing businesses.",
    icon: Crown,
    accent: "emerald",
    featured: true,
    features: [
      "Everything in Basic",
      "Up to 30 drivers / field users",
      "Up to 5 dispatcher / admin seats",
      "Assisted and Auto Dispatch",
      "Advanced driver management",
      "Advanced reporting and analytics",
      "Expanded company controls",
      "Operations and performance tools",
      "Priority support",
      "Business-scale team access",
    ],
  },
];

export default function PlansPage() {
  const [customModalOpen, setCustomModalOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.17),transparent_40%),radial-gradient(circle_at_82%_14%,rgba(16,185,129,0.12),transparent_28%)]">
        <div className="mx-auto max-w-7xl px-6 py-14 md:py-20">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100">
              <ArrowLeft className="h-4 w-4" /> Back to DispatchOS
            </Link>
            <Link href="/auth?mode=login" className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white hover:bg-white/[0.09]">
              Log In
            </Link>
          </div>

          <div className="mx-auto mt-14 max-w-3xl text-center">
            <p className="text-xs uppercase tracking-[0.26em] text-cyan-300">DispatchOS Plans</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">Pick the operating level your company needs.</h1>
            <p className="mt-5 text-base leading-7 text-white/62 md:text-lg">
              Both plans include the Dispatcher and Driver apps. Upgrade when your team needs more drivers, more dispatcher seats, automation, and deeper reporting.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 md:py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const featured = Boolean(plan.featured);
            return (
              <article
                key={plan.id}
                className={`relative overflow-hidden rounded-[2rem] border p-7 md:p-9 ${featured ? "border-emerald-400/35 bg-emerald-500/[0.07] shadow-[0_0_60px_rgba(16,185,129,.10)]" : "border-cyan-400/20 bg-cyan-500/[0.045]"}`}
              >
                {featured && (
                  <div className="absolute right-5 top-5 rounded-full border border-emerald-300/25 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">
                    Most Popular
                  </div>
                )}

                <Icon className={`h-9 w-9 ${featured ? "text-emerald-300" : "text-cyan-300"}`} />
                <h2 className="mt-6 text-2xl font-semibold md:text-3xl">{plan.name}</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/58">{plan.description}</p>

                <div className="mt-7 flex items-end gap-2">
                  <span className="text-5xl font-semibold tracking-tight">{plan.price}</span>
                  <span className="pb-1 text-sm text-white/45">{plan.cadence}</span>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 rounded-xl border border-white/8 bg-black/20 p-3">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? "text-emerald-300" : "text-cyan-300"}`} />
                      <span className="text-sm text-white/78">{feature}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href={`/auth?mode=register&plan=${plan.id}`}
                  className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 font-bold transition ${featured ? "bg-emerald-500 text-white hover:bg-emerald-400" : "bg-cyan-400 text-slate-950 hover:bg-cyan-300"}`}
                >
                  Choose {plan.name.replace("DispatchOS ", "")} <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="mt-3 text-center text-xs text-white/40">Create your account next. Checkout activation is coming soon.</p>
              </article>
            );
          })}
        </div>

        <div className="mt-7 rounded-[2rem] border border-violet-400/20 bg-violet-500/[0.055] p-7 md:p-9">
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-violet-300" />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-violet-300">Custom DispatchOS Integration</p>
                  <h2 className="mt-1 text-2xl font-semibold">Need DispatchOS connected to your business?</h2>
                </div>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-white/60">
                Website intake, booking pages, company-specific workflows, branding, API connections, existing business systems, and custom configuration are separate professional services from I Computer Anything. Custom integration is not included in Basic or Business and is quoted based on the work required.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCustomModalOpen(true)}
              className="inline-flex items-center justify-center rounded-xl border border-violet-300/25 bg-violet-500/15 px-6 py-4 font-semibold text-violet-100 hover:bg-violet-500/20"
            >
              Request Custom Quote
            </button>
          </div>
        </div>

        <div className="mt-10 flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.05] p-5 text-sm text-emerald-100/80">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
          Your subscription controls your company capacity and platform access. Custom website, booking, and system integration is always scoped and quoted separately.
        </div>
      </section>

      <CustomVersionModal open={customModalOpen} onClose={() => setCustomModalOpen(false)} />
    </main>
  );
}
