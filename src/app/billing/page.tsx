"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  CreditCard,
  Crown,
  ReceiptText,
  ShieldAlert,
  Zap,
} from "lucide-react";

import { AppShellNav } from "@/components/platform/app-shell-nav";
import { Card, CardContent } from "@/components/ui/card";
import { getStoredSession } from "@/lib/dispatchos-auth";

const statusCopy: Record<string, { label: string; message: string; operating: boolean }> = {
  active: {
    label: "Active",
    message: "Your subscription is active and DispatchOS operational apps are available.",
    operating: true,
  },
  trialing: {
    label: "Trial Active",
    message: "Your trial is active and DispatchOS operational apps are available.",
    operating: true,
  },
  grace_period: {
    label: "Payment Grace Period",
    message: "A payment needs attention. Operations remain available during the grace period.",
    operating: true,
  },
  past_due: {
    label: "Past Due",
    message: "Payment is past due. Stripe payment recovery will restore access automatically once billing is connected.",
    operating: false,
  },
  unpaid: {
    label: "Unpaid",
    message: "The subscription is unpaid and operational access is suspended until billing is restored.",
    operating: false,
  },
  suspended: {
    label: "Suspended",
    message: "Operational access is suspended. Billing recovery will be handled directly from this page when Stripe is connected.",
    operating: false,
  },
  canceled: {
    label: "Canceled",
    message: "The subscription has ended. You can choose a plan directly below when you are ready to reactivate DispatchOS.",
    operating: false,
  },
  cancelled: {
    label: "Canceled",
    message: "The subscription has ended. You can choose a plan directly below when you are ready to reactivate DispatchOS.",
    operating: false,
  },
  pending: {
    label: "Pending Activation",
    message: "Your company account exists, but paid subscription activation has not been completed yet. Choose the plan you want below.",
    operating: false,
  },
};

const planOptions = [
  {
    id: "basic",
    name: "DispatchOS Basic",
    price: "$49.99",
    cadence: "/month",
    icon: Zap,
    summary: "Core business-to-driver-to-customer workflow for small teams.",
    features: [
      "Up to 10 drivers / field users",
      "1 dispatcher / admin seat",
      "Dispatcher and Driver apps",
      "Manual job assignment",
    ],
  },
  {
    id: "business",
    name: "DispatchOS Business",
    price: "$149",
    cadence: "/month",
    icon: Crown,
    summary: "More capacity, automation, and operating tools for growing teams.",
    features: [
      "Up to 30 drivers / field users",
      "Up to 5 dispatcher / admin seats",
      "Assisted and Auto Dispatch",
      "Advanced reporting and priority support",
    ],
  },
] as const;

function normalizePlanId(plan: string) {
  const normalized = plan.toLowerCase();
  if (normalized.includes("business")) return "business";
  if (normalized.includes("basic")) return "basic";
  return null;
}

export default function BillingPage() {
  const session = useMemo(() => getStoredSession(), []);
  const companyName = session?.company.name ?? "Your company";
  const plan = session?.subscription?.plan ?? "Not assigned";
  const currentPlanId = normalizePlanId(plan);
  const rawStatus = (session?.subscription?.status ?? "pending").toLowerCase();
  const currentStatus = statusCopy[rawStatus] ?? {
    label: rawStatus.replaceAll("_", " "),
    message: "Subscription status needs attention before operational access can continue.",
    operating: false,
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <AppShellNav />
      <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">{companyName} Billing</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Billing & subscription</h1>
            <p className="mt-3 max-w-2xl text-sm text-white/70">
              Manage your current DispatchOS plan here without leaving your company workspace. Plan changes, payment recovery, invoices, and payment methods will stay on this page as Stripe is connected.
            </p>
          </div>
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Workspace
          </Link>
        </div>

        <section
          className={`relative mb-6 overflow-hidden rounded-[2rem] border p-6 md:p-8 ${
            currentStatus.operating
              ? "border-emerald-400/25 bg-[linear-gradient(145deg,rgba(6,78,59,.35),rgba(2,6,23,.94)_60%)]"
              : "border-amber-400/25 bg-[linear-gradient(145deg,rgba(120,53,15,.28),rgba(2,6,23,.96)_62%)]"
          }`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(34,211,238,.12),transparent_30%)]" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${currentStatus.operating ? "border-emerald-300/25 bg-emerald-400/10" : "border-amber-300/25 bg-amber-400/10"}`}>
                {currentStatus.operating ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                ) : (
                  <ShieldAlert className="h-6 w-6 text-amber-300" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Subscription status</p>
                <h2 className="mt-1 text-2xl font-semibold">{currentStatus.label}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">{currentStatus.message}</p>
              </div>
            </div>

            <div className="shrink-0 rounded-2xl border border-white/10 bg-black/20 px-5 py-4 md:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">Current plan</p>
              <p className="mt-1 text-lg font-semibold capitalize text-cyan-100">{plan}</p>
            </div>
          </div>
        </section>

        <div className="mb-6">
          <div className="flex items-center gap-3 text-cyan-300">
            <CreditCard className="h-5 w-5" />
            <h2 className="text-xl font-semibold text-white">Your plan options</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
            Your current plan stays highlighted here. If you want the other plan, the switch will start securely from this Billing page once Stripe checkout is connected—no trip back to the public plans page and no second login.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {planOptions.map((option) => {
            const Icon = option.icon;
            const isCurrent = currentPlanId === option.id;
            const isBusiness = option.id === "business";
            const actionLabel = currentPlanId
              ? isBusiness
                ? "Upgrade to Business"
                : "Switch to Basic"
              : `Choose ${option.name.replace("DispatchOS ", "")}`;

            return (
              <Card
                key={option.id}
                className={`relative overflow-hidden rounded-3xl text-white shadow-none ${
                  isCurrent
                    ? "border border-emerald-300/40 bg-[linear-gradient(145deg,rgba(6,78,59,.28),rgba(2,6,23,.94))] shadow-[0_0_45px_rgba(16,185,129,.09)]"
                    : isBusiness
                      ? "border border-cyan-300/25 bg-cyan-500/[0.055]"
                      : "border border-white/10 bg-white/5"
                }`}
              >
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${isCurrent ? "border-emerald-300/25 bg-emerald-400/10" : "border-cyan-300/20 bg-cyan-400/10"}`}>
                      <Icon className={`h-6 w-6 ${isCurrent ? "text-emerald-300" : "text-cyan-300"}`} />
                    </div>
                    {isCurrent ? (
                      <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                        Current Plan
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-5 text-2xl font-semibold">{option.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/60">{option.summary}</p>

                  <div className="mt-5 flex items-end gap-2">
                    <span className="text-4xl font-semibold tracking-tight">{option.price}</span>
                    <span className="pb-1 text-sm text-white/45">{option.cadence}</span>
                  </div>

                  <div className="mt-6 space-y-3">
                    {option.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3 text-sm text-white/72">
                        <Check className={`mt-0.5 h-4 w-4 shrink-0 ${isCurrent ? "text-emerald-300" : "text-cyan-300"}`} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {isCurrent ? (
                    <div className="mt-7 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] px-4 py-3 text-sm font-semibold text-emerald-100/85">
                      This plan is active for {companyName}.
                    </div>
                  ) : (
                    <div className="mt-7">
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        title="Stripe plan switching is being connected"
                        className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/15 px-5 py-3 text-sm font-bold text-cyan-100/70"
                      >
                        {actionLabel} — Coming Soon
                      </button>
                      <p className="mt-2 text-center text-xs text-white/40">
                        This button will launch secure Stripe plan switching here inside Billing.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-6 rounded-3xl border border-white/10 bg-white/5 text-white shadow-none">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center gap-3 text-cyan-300">
              <ReceiptText className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Automatic access control</h2>
            </div>
            <div className="mt-5 grid gap-3 text-sm leading-6 text-white/65 md:grid-cols-2">
              <p><span className="font-semibold text-white">Paid / Active:</span> Dispatcher and Driver apps operate normally.</p>
              <p><span className="font-semibold text-white">Trial:</span> Admin-granted trial access operates normally until the trial is ended.</p>
              <p><span className="font-semibold text-white">Grace period:</span> Operations stay available while the account owner is warned to fix payment.</p>
              <p><span className="font-semibold text-white">Past due / Unpaid:</span> Operational apps are blocked until billing is restored.</p>
              <p><span className="font-semibold text-white">Canceled:</span> Access ends when the paid-through subscription period ends.</p>
              <p><span className="font-semibold text-white">Payment restored:</span> Stripe webhooks will automatically reopen access without manual support.</p>
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-300/15 bg-amber-400/[0.05] p-4 text-sm text-amber-100/80">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Stripe checkout and webhook processing are still the next backend step. Plan switching is shown here now, but it stays disabled until the real payment connection is ready.</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
