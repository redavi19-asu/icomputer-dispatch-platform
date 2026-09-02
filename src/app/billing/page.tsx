"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  ReceiptText,
  ShieldAlert,
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
    message: "Payment is past due. Once Stripe is connected, payment recovery here will restore access automatically.",
    operating: false,
  },
  unpaid: {
    label: "Unpaid",
    message: "The subscription is unpaid and operational access is suspended until billing is restored.",
    operating: false,
  },
  suspended: {
    label: "Suspended",
    message: "Operational access is suspended. The company owner will use billing recovery here when Stripe is connected.",
    operating: false,
  },
  canceled: {
    label: "Canceled",
    message: "The subscription has ended. Choose a plan again when you are ready to reactivate DispatchOS.",
    operating: false,
  },
  cancelled: {
    label: "Canceled",
    message: "The subscription has ended. Choose a plan again when you are ready to reactivate DispatchOS.",
    operating: false,
  },
  pending: {
    label: "Pending Activation",
    message: "Your company account exists, but paid subscription activation has not been completed yet.",
    operating: false,
  },
};

export default function BillingPage() {
  const session = useMemo(() => getStoredSession(), []);
  const companyName = session?.company.name ?? "Your company";
  const plan = session?.subscription?.plan ?? "Not active";
  const rawStatus = (session?.subscription?.status ?? "pending").toLowerCase();
  const currentStatus = statusCopy[rawStatus] ?? {
    label: rawStatus.replaceAll("_", " "),
    message: "Subscription status needs attention before operational access can continue.",
    operating: false,
  };

  const showPlanButton = rawStatus === "pending" || rawStatus === "canceled" || rawStatus === "cancelled";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <AppShellNav />
      <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">{companyName} Billing</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Billing & subscription</h1>
            <p className="mt-3 max-w-2xl text-sm text-white/70">
              This page will be the billing control center for plan status, payment recovery, invoices, upgrades, and cancellation once Stripe is connected.
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
                {!currentStatus.operating && !showPlanButton ? (
                  <p className="mt-3 text-xs text-amber-100/65">
                    Payment recovery is not live yet. Stripe will add the secure payment/update button here and automatically reopen access after a successful payment.
                  </p>
                ) : null}
              </div>
            </div>

            {showPlanButton ? (
              <Link
                href="/plans"
                className="inline-flex shrink-0 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_8px_28px_rgba(34,211,238,.18)] hover:bg-cyan-300"
              >
                View Plans
              </Link>
            ) : null}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-3xl border border-white/10 bg-white/5 text-white shadow-none">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center gap-3 text-cyan-300">
                <CreditCard className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Current plan</h2>
              </div>
              <p className="mt-5 text-2xl font-semibold capitalize">{plan}</p>
              <p className="mt-2 text-sm text-white/65">
                Plan price, renewal date, payment method, invoices, upgrades, and cancellation controls will populate here from Stripe after checkout is connected.
              </p>
              <Link
                href="/plans"
                className="mt-6 inline-flex rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/85 hover:bg-white/10"
              >
                View DispatchOS Plans
              </Link>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-white/10 bg-white/5 text-white shadow-none">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center gap-3 text-cyan-300">
                <ReceiptText className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Automatic access control</h2>
              </div>
              <div className="mt-5 space-y-3 text-sm leading-6 text-white/65">
                <p><span className="font-semibold text-white">Paid / Active:</span> Dispatcher and Driver apps operate normally.</p>
                <p><span className="font-semibold text-white">Trial:</span> Admin-granted trial access operates normally until the trial is ended.</p>
                <p><span className="font-semibold text-white">Grace period:</span> Operations stay available while the account owner is warned to fix payment.</p>
                <p><span className="font-semibold text-white">Past due / Unpaid / Suspended:</span> Operational apps are blocked until billing is restored.</p>
                <p><span className="font-semibold text-white">Canceled:</span> Access ends when the paid-through subscription period ends.</p>
                <p><span className="font-semibold text-white">Payment restored:</span> Stripe webhook activation will automatically reopen access without manual support.</p>
              </div>
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-300/15 bg-amber-400/[0.05] p-4 text-sm text-amber-100/80">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Stripe checkout and webhook processing are still the next backend step. No fake payment button is shown here until that connection is real.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
