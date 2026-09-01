"use client";

import Link from "next/link";
import { Check, ShieldCheck, Smartphone, MonitorUp, ArrowLeft } from "lucide-react";

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
  const checkoutUrl = process.env.NEXT_PUBLIC_DISPATCHOS_CHECKOUT_URL || "";

  const startCheckout = () => {
    if (checkoutUrl) {
      window.location.assign(checkoutUrl);
      return;
    }

    window.location.assign(
      "https://redavi19-asu.github.io/icomuteranythingV3/#contact"
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.16),transparent_38%)]">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100">
            <ArrowLeft className="h-4 w-4" />
            Back to DispatchOS
          </Link>

          <div className="mt-12 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.26em] text-cyan-300">DispatchOS Subscription</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
              Activate DispatchOS for your company
            </h1>
            <p className="mt-5 text-lg leading-8 text-white/70">
              The public site shows the product. Your operational workspace, dispatcher tools,
              driver app, booking controls, and company settings are customer-only features.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-14 lg:grid-cols-[1.1fr_.9fr] md:py-20">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 md:p-9">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-cyan-300">DispatchOS Business</p>
              <h2 className="mt-2 text-3xl font-semibold">Complete dispatch platform</h2>
            </div>
            <ShieldCheck className="h-10 w-10 text-cyan-300" />
          </div>

          <p className="mt-5 text-white/65">
            Subscription pricing and billing details are confirmed in the secure checkout before purchase.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature} className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span className="text-sm text-white/80">{feature}</span>
              </div>
            ))}
          </div>

          <button
            onClick={startCheckout}
            className="mt-9 w-full rounded-xl bg-cyan-400 px-6 py-4 text-base font-bold text-slate-950 transition hover:bg-cyan-300"
          >
            Start Subscription
          </button>

          <p className="mt-4 text-center text-xs text-white/45">
            After successful payment, the customer workspace is provisioned and app access is activated.
          </p>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7">
            <MonitorUp className="h-8 w-8 text-cyan-300" />
            <h3 className="mt-4 text-xl font-semibold">Dispatcher App</h3>
            <p className="mt-3 text-sm leading-6 text-white/65">
              Install the dispatcher experience on the office computer after your company workspace is activated.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7">
            <Smartphone className="h-8 w-8 text-cyan-300" />
            <h3 className="mt-4 text-xl font-semibold">Driver App</h3>
            <p className="mt-3 text-sm leading-6 text-white/65">
              Drivers receive access to the mobile mission experience through the company account.
            </p>
          </div>

          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-500/[0.06] p-7">
            <p className="text-sm font-semibold text-cyan-200">Need a custom deployment?</p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              I Computer Anything can tailor DispatchOS to a company-specific workflow, branding, or integration stack.
            </p>
            <a
              href="https://redavi19-asu.github.io/icomuteranythingV3/"
              className="mt-5 inline-flex text-sm font-semibold text-cyan-200 hover:text-cyan-100"
            >
              Contact I Computer Anything →
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
