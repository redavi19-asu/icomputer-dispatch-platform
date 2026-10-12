"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  authRequest,
  getStoredSession,
  getApiBase,
} from "@/lib/dispatchos-auth";
type ApiPlan = {
  companyName: string;
  mode: string;
  entitled: boolean;
  subscriptionStatus: string;
  periodEnd: number;
  used: number;
  allowance: number | null;
  pricing: { ready: boolean; amount: number | null; allowance: number | null };
};
type Key = {
  id: string;
  name: string;
  prefix: string;
  active: number;
  expires_at: number;
  scopes: string;
};
type Hook = { id: string; url: string; last_status: number | null };
export default function Integrations() {
  const [plan, setPlan] = useState<ApiPlan | null>(null);
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const [keys, setKeys] = useState<Key[]>([]),
    [hooks, setHooks] = useState<Hook[]>([]),
    [message, setMessage] = useState(""),
    [secret, setSecret] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const [k, h, p] = await Promise.all([
      authRequest("/api/integrations/keys"),
      authRequest("/api/integrations/webhooks"),
      authRequest("/api/integrations/api-plan").catch(()=>null),
    ]);
    if(p)setPlan(p);
    setKeys(k.keys || []);
    setHooks((h.webhooks || []).filter((x: { active: number }) => x.active));
  }
  useEffect(() => {
    if (!getStoredSession()) {
      setMessage("Sign in as a company owner or admin to manage integrations.");
      return;
    }
    load().catch((e) => setMessage(e.message));
  }, []);
  async function act(operation: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await operation();
      await load();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to complete request.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-screen bg-[#061a33] p-8 text-white">
      <section className="mx-auto max-w-4xl space-y-6">
        <Link href="/workspace">← Workspace</Link>
        <h1 className="text-3xl font-bold">Developer integrations</h1>
        <Link href="/developers" className="text-sky-300 underline">
          Read the developer guide
        </Link>
        <p>
          API origin:{" "}
          <code>{getApiBase() || "Service connection unavailable"}</code>
        </p>
        <p role="status">{message}</p>
        {secret && (
          <div className="rounded-xl border border-orange-300 p-4">
            <p>
              Copy this secret now. It is shown once. Store it on your server.
            </p>
            <textarea
              readOnly
              aria-label="New integration secret"
              className="mt-3 w-full bg-black p-3 text-white"
              value={secret}
            />
            <button onClick={() => setSecret("")}>I saved it — hide</button>
          </div>
        )}
        {plan && (
          <section
            aria-label="API plan and usage"
            className="space-y-3 rounded-xl border border-sky-700 p-5"
          >
            <h2 className="text-2xl">API plan and usage</h2>
            <p>Company: {plan.companyName}</p>
            <p>
              {plan.mode === "PREPARATION"
                ? "Separate API billing is being prepared. No API fee is active yet."
                : `Separate API subscription: ${plan.subscriptionStatus}. Software billing is separate.`}
            </p>
            <p>
              {plan.used.toLocaleString()} requests across all company keys
              {plan.allowance !== null
                ? ` / ${plan.allowance.toLocaleString()} included`
                : ""}
              . Period ends {new Date(plan.periodEnd).toLocaleDateString()}.
            </p>
            <p>
              Requests that pass key, permission, subscription and rate checks
              count, including retries and invalid payloads. Server failures are
              released. No automatic overage charges are enabled.
            </p>
            {plan.pricing.ready && (
              <p>
                ${((plan.pricing.amount || 0) / 100).toFixed(2)}/month for{" "}
                {plan.pricing.allowance?.toLocaleString()} requests.
              </p>
            )}
            <button
              disabled={busy || !plan.pricing.ready || plan.entitled}
              onClick={() =>
                void act(async () => {
                  const result = await authRequest(
                    "/api/integrations/api-plan",
                    {
                      method: "POST",
                      body: JSON.stringify({ action: "CHECKOUT" }),
                    },
                  );
                  if (result.checkoutUrl)
                    window.location.assign(result.checkoutUrl);
                })
              }
            >
              Start separate API subscription
            </button>
            {plan.entitled && (
              <div>
                <label>
                  <input
                    type="checkbox"
                    checked={cancelConfirmed}
                    onChange={(e) => setCancelConfirmed(e.target.checked)}
                  />{" "}
                  Cancel only API renewal; keep software subscription.
                </label>
                <button
                  disabled={busy || !cancelConfirmed}
                  onClick={() =>
                    void act(async () => {
                      const result = await authRequest(
                        "/api/integrations/api-plan",
                        {
                          method: "POST",
                          body: JSON.stringify({
                            action: "CANCEL_API_RENEWAL",
                            confirmation: "CANCEL API",
                          }),
                        },
                      );
                      setMessage(
                        `API access ends ${new Date(result.endsAt).toLocaleDateString()}. Software subscription unchanged.`,
                      );
                    })
                  }
                >
                  Cancel API renewal
                </button>
              </div>
            )}
          </section>
        )}
        <h2 className="text-2xl">API keys</h2>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            act(async () => {
              const r = await authRequest("/api/integrations/keys", {
                method: "POST",
                body: JSON.stringify({
                  name: f.get("name"),
                  scopes: f.getAll("scope"),
                  expiresInDays: Number(f.get("days")),
                }),
              });
              setSecret(r.key.value);
            });
          }}
        >
          <label className="block">
            Key name{" "}
            <input
              className="bg-white p-2 text-black"
              name="name"
              required
              minLength={2}
              maxLength={80}
            />
          </label>
          <label className="block">
            Expires in days{" "}
            <input
              className="bg-white p-2 text-black"
              name="days"
              type="number"
              min="1"
              max="365"
              defaultValue="90"
              required
            />
          </label>
          {["jobs:read", "jobs:write", "events:read"].map((scope) => (
            <label className="mr-4 inline-block" key={scope}>
              <input
                type="checkbox"
                name="scope"
                value={scope}
                defaultChecked={scope !== "jobs:write"}
              />
              {scope}
            </label>
          ))}
          <button
            disabled={
              busy || (plan?.mode === "PAID_API_REQUIRED" && !plan.entitled)
            }
            className="block rounded bg-sky-500 px-5 py-2"
          >
            Create key
          </button>
        </form>
        {keys.map((k) => (
          <article className="rounded border border-white/20 p-4" key={k.id}>
            <strong>{k.name}</strong>
            <p>
              {k.prefix}… ·{" "}
              {!k.active
                ? "Revoked"
                : k.expires_at <= Date.now()
                  ? "Expired"
                  : "Active"}{" "}
              · Expires {new Date(k.expires_at).toLocaleDateString()}
            </p>
            <p>{JSON.parse(k.scopes).join(", ")}</p>
            {!!k.active && (
              <button
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    await authRequest(
                      `/api/integrations/keys?id=${encodeURIComponent(k.id)}`,
                      { method: "DELETE" },
                    );
                  })
                }
              >
                Revoke key
              </button>
            )}
          </article>
        ))}
        <h2 className="text-2xl">Webhooks</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            act(async () => {
              const r = await authRequest("/api/integrations/webhooks", {
                method: "POST",
                body: JSON.stringify({ url: f.get("url") }),
              });
              setSecret(r.webhook.secret);
            });
          }}
        >
          <label>
            HTTPS receiver{" "}
            <input
              className="m-3 bg-white p-2 text-black"
              type="url"
              name="url"
              required
              placeholder="https://your-company.com/hooks"
            />
          </label>
          <button disabled={busy}>Add webhook</button>
        </form>
        <button
          disabled={busy || !hooks.length}
          onClick={() =>
            act(async () => {
              const r = await authRequest("/api/integrations/webhooks", {
                method: "POST",
                body: JSON.stringify({ action: "TEST" }),
              });
              setMessage(
                r.deliveries.every((d: { success: boolean }) => d.success)
                  ? "Test delivered successfully."
                  : "A receiver did not accept the test. Check delivery status below.",
              );
            })
          }
        >
          Send test event
        </button>
        {hooks.map((h) => (
          <article className="rounded border border-white/20 p-4" key={h.id}>
            <p>
              {h.url} · Last status: {h.last_status ?? "Not delivered yet"}
            </p>
            <button
              disabled={busy}
              onClick={() =>
                act(async () => {
                  await authRequest(
                    `/api/integrations/webhooks?id=${encodeURIComponent(h.id)}`,
                    { method: "DELETE" },
                  );
                })
              }
            >
              Disable webhook
            </button>
          </article>
        ))}
        <p>
          Delivery currently makes one attempt. Reconcile missed notifications
          with the events API. API usage follows company subscription access.
        </p>
      </section>
    </main>
  );
}
