"use client";

import { useEffect, useState } from "react";
import { authRequest, getStoredSession } from "@/lib/dispatchos-auth";

type Status = {
  enabled: boolean;
  plans: { starter: { amount: number; included: number }; pro: { amount: number; included: number } };
  subscription: { plan: string | null; status: string; active: boolean; periodEnd: number } | null;
  usage: { used: number; included: number | null };
};

export default function CarrierDeveloperBilling() {
  const [data, setData] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const session = getStoredSession();
  const companyId = session?.company?.id;

  useEffect(() => {
    if (!companyId) return;
    let alive = true;
    authRequest("/api/billing/stripe/developer/status?companyId=" + encodeURIComponent(companyId))
      .then((result: Status) => { if (alive) setData(result); })
      .catch(() => { if (alive) setError("Developer billing status is temporarily unavailable."); });
    return () => { alive = false; };
  }, [companyId]);

  async function open(kind: "checkout" | "portal", plan?: "starter" | "pro") {
    if (!companyId || busy || !data?.enabled) return;
    setBusy(true); setError("");
    try {
      const result = await authRequest("/api/billing/stripe/developer/" + kind, {
        method: "POST", body: JSON.stringify({ companyId, plan }),
      });
      const destination = new URL(result.url);
      if (destination.protocol !== "https:" || !["checkout.stripe.com", "billing.stripe.com"].includes(destination.hostname))
        throw new Error("Invalid secure checkout destination.");
      window.location.assign(destination.toString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open developer billing.");
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="developer-billing-heading" className="space-y-4 rounded-2xl border border-sky-300/25 bg-white/5 p-5 sm:p-6">
      <div>
        <h2 id="developer-billing-heading" className="text-xl font-semibold">Developer API billing</h2>
        <p className="mt-2 text-sm text-sky-100/75">Separate from your company's operating subscription. No automatic overage charges.</p>
      </div>
      {error && <p role="alert" className="text-sm text-amber-200">{error}</p>}
      {data?.subscription && (
        <p className="rounded-xl bg-black/20 p-3 text-sm">
          Developer plan: {data.subscription.plan || "Unassigned"} · {data.subscription.status} ·
          {" "}{data.usage.used.toLocaleString()} calls this billing period
          {data.usage.included !== null && " / " + data.usage.included.toLocaleString() + " included"}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {(["starter", "pro"] as const).map((plan) => {
          const item = data?.plans[plan];
          return <div key={plan} className="rounded-xl border border-white/15 bg-black/15 p-4">
            <p className="text-sm font-bold capitalize">{plan === "pro" ? "Developer Pro" : "Developer Starter"}</p>
            <p className="mt-1 text-2xl font-bold">{item ? "$" + (item.amount / 100).toFixed(2) : "—"}<span className="text-xs font-normal">/month</span></p>
            <p className="mt-1 text-sm text-sky-100/70">{item?.included.toLocaleString() || "—"} API requests included / billing period</p>
            <button type="button" disabled={!data?.enabled || busy || Boolean(data?.subscription?.active)}
              onClick={() => void open("checkout", plan)}
              className="mt-4 min-h-11 w-full rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40">
              {!data?.enabled ? "Not accepting purchases yet" : data?.subscription?.active ? "Already subscribed" : "Subscribe securely"}
            </button>
          </div>;
        })}
      </div>
      {data?.subscription && (
        <button type="button" disabled={!data.enabled || busy} onClick={() => void open("portal")}
          className="min-h-11 rounded-xl border border-sky-300/40 px-4 py-2 text-sm font-semibold disabled:opacity-40">
          Manage Developer Billing
        </button>
      )}
      {!data?.enabled && <p className="text-xs text-sky-100/60">Proposed launch prices. Checkout remains off until Stripe prices, signing and production billing verification are completed. Your current API access is unchanged.</p>}
    </section>
  );
}
