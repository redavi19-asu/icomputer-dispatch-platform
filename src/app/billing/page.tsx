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
    message: "Payment is past due. Restore billing to resume operational access.",
    operating: false,
  },
  unpaid: {
    label: "Unpaid",
    message: "The subscription is unpaid and operational access is suspended.",
    operating: false,
  },
  suspended: {
    label: "Suspended",
    message: "Operational access is suspended until billing is restored.",
    operating: false,
  },
  canceled: {
    label: "Canceled",
    message: "The subscription has ended. Reactivate a plan to restore operational access.",
    operating: false,
  },
  cancelled: {
    label: "Canceled",
    message: "The subscription has ended. Reactivate a plan to restore operational access.",
    operating: false,
  },
  pending: {
    label: "Pending Activation",
    message: "Your account exists, but subscription activation has not completed yet.",
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

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <AppShellNav />
      <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">{companyName} Billing</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Billing & subscription</h1>
            <p className="mt-3 max-w-2xl text-sm text-white/70">
              Stripe will control subscription activation, payment recovery, cancellation, and automatic restoration of DispatchOS access.
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

        <Card className={`mb-6 rounded-3xl border text-white shadow-none ${currentStatus.operating ? "border-emerald-400/25 bg-emerald-500/[0.06]" : "border-amber-400/25 bg-amber-500/[0.06]"}`}>
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="flex items-start gap-4">
              {currentStatus.operating ? (
                <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-emerald-300" />
              ) : (
                <ShieldAlert className="mt-1 h-6 w-6 shrink-0 text-amber-300" />
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Subscription status</p>
                <h2 className="mt-1 text-2xl font-semibold">{currentStatus.label}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">{currentStatus.message}</p>
              </div>
            </div>
            {!currentStatus.operating ? (
              <Link
                href="/plans"
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Restore Access
              </Link>
            ) : null}
          </CardContent>
        </Card>

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
                <p><span className="font-semibold text-white">Grace period:</span> Operations stay available while the account owner is warned to fix payment.</p>
                <p><span className="font-semibold text-white">Past due / Unpaid / Suspended:</span> Operational apps are blocked until billing is restored.</p>
                <p><span className="font-semibold text-white">Canceled:</span> Access ends when the paid-through subscription period ends.</p>
                <p><span className="font-semibold text-white">Payment restored:</span> Stripe webhook activation will automatically reopen access without manual support.</p>
              </div>
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-300/15 bg-amber-400/[0.05] p-4 text-sm text-amber-100/80">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Stripe checkout and webhook processing are the next backend step. This page is now ready to reflect those real subscription states instead of fake invoice data.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
