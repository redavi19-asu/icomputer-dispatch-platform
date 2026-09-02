"use client";

import { ReactNode, useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import {
  authRequest,
  clearSession,
  getApiBase,
  getStoredSession,
  saveSession,
  type DispatchOSSession,
} from "@/lib/dispatchos-auth";

type ProtectedRouteProps = {
  children: ReactNode;
  requireActiveSubscription?: boolean;
};

const OPERATING_STATUSES = new Set(["active", "trialing", "grace_period"]);
const BILLING_RECOVERY_STATUSES = new Set([
  "past_due",
  "unpaid",
  "suspended",
  "canceled",
  "cancelled",
  "incomplete",
  "incomplete_expired",
]);

export default function ProtectedRoute({
  children,
  requireActiveSubscription = false,
}: ProtectedRouteProps) {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      const stored = getStoredSession();
      if (!stored?.token) {
        redirectToLogin();
        return;
      }

      let session: DispatchOSSession = stored;
      if (getApiBase()) {
        try {
          const fresh = (await authRequest("/auth/me")) as Omit<DispatchOSSession, "token">;
          session = { ...fresh, token: stored.token };
          saveSession(session);
        } catch {
          clearSession();
          redirectToLogin();
          return;
        }
      }

      const isAdmin = session.user.role === "admin";
      const subscriptionStatus = (session.subscription?.status || "pending").toLowerCase();
      const canOperate = OPERATING_STATUSES.has(subscriptionStatus);

      if (requireActiveSubscription && !canOperate && !isAdmin) {
        if (BILLING_RECOVERY_STATUSES.has(subscriptionStatus)) {
          redirectToBilling(subscriptionStatus);
        } else {
          redirectToSubscribe(subscriptionStatus);
        }
        return;
      }

      if (!cancelled) {
        setAllowed(true);
        setReady(true);
      }
    }

    checkAccess();
    return () => {
      cancelled = true;
    };
  }, [requireActiveSubscription]);

  if (!ready || !allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="max-w-md rounded-3xl border border-cyan-400/15 bg-cyan-500/[0.05] p-8 text-center">
          <LockKeyhole className="mx-auto h-9 w-9 text-cyan-300" />
          <p className="mt-5 text-lg font-semibold">Checking DispatchOS access…</p>
          <p className="mt-2 text-sm text-white/50">
            Company tools require a signed-in account with operating access.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

function appBase() {
  return process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "";
}

function redirectToLogin() {
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace(`${appBase()}/auth?mode=login&next=${next}`);
}

function redirectToSubscribe(status: string) {
  window.location.replace(`${appBase()}/subscribe?state=${encodeURIComponent(status)}`);
}

function redirectToBilling(status: string) {
  window.location.replace(`${appBase()}/billing?state=${encodeURIComponent(status)}`);
}
