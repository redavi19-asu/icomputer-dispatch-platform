"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  authRequest,
  getStoredSession,
  getApiBase,
} from "@/lib/dispatchos-auth";
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
  const [keys, setKeys] = useState<Key[]>([]),
    [hooks, setHooks] = useState<Hook[]>([]),
    [message, setMessage] = useState(""),
    [secret, setSecret] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const [k, h] = await Promise.all([
      authRequest("/api/integrations/keys"),
      authRequest("/api/integrations/webhooks"),
    ]);
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
            disabled={busy}
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
