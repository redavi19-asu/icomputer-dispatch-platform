"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { LogOut, Power, Radio, ShieldCheck } from "lucide-react";

import { clearSession, getStoredSession } from "@/lib/dispatchos-auth";

type DriverAppShellProps = {
  children: ReactNode;
};

const appBase = () =>
  process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "";

export function DriverAppShell({ children }: DriverAppShellProps) {
  const session = useMemo(() => getStoredSession(), []);
  const storageKey = session
    ? `dispatch.driver.online.${session.company.id}.${session.user.id}`
    : "dispatch.driver.online";
  const [online, setOnline] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOnline(window.localStorage.getItem(storageKey) === "1");
    setReady(true);
  }, [storageKey]);

  const setAvailability = (nextOnline: boolean) => {
    setOnline(nextOnline);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, nextOnline ? "1" : "0");
      window.dispatchEvent(
        new CustomEvent("dispatch:driver-availability", {
          detail: { online: nextOnline },
        })
      );
    }
  };

  const signOut = () => {
    setAvailability(false);
    clearSession();
    window.location.replace(`${appBase()}/auth?mode=login&app=driver`);
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="sticky top-0 z-[80] border-b border-white/10 bg-slate-950/95 px-3 py-3 backdrop-blur md:px-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-300" />
              <p className="truncate text-sm font-semibold">
                {session?.company.name ?? "DispatchOS"} Driver
              </p>
            </div>
            <p className="mt-0.5 truncate text-xs text-white/50">
              Signed in as {session?.user.name ?? "Driver"}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setAvailability(!online)}
              aria-pressed={online}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition md:px-4 md:text-sm ${
                online
                  ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                  : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              <Power className="h-4 w-4" />
              {online ? "ONLINE" : "GO ONLINE"}
            </button>
            <button
              type="button"
              onClick={signOut}
              aria-label="Sign out"
              className="rounded-full border border-white/10 bg-white/5 p-2 text-white/55 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {online ? (
        children
      ) : (
        <main className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6 py-12">
          <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center shadow-2xl md:p-9">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/45">
              <Radio className="h-7 w-7" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-white/40">
              Driver availability
            </p>
            <h1 className="mt-2 text-3xl font-semibold">You are offline</h1>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Go online when you are ready to work. While offline, the Driver app stays out of the active assignment workflow.
            </p>
            <button
              type="button"
              onClick={() => setAvailability(true)}
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3.5 font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              <Power className="h-5 w-5" />
              Go Online
            </button>
            <p className="mt-4 text-xs text-white/35">
              Your availability is remembered on this device until you change it or sign out.
            </p>
          </section>
        </main>
      )}
    </div>
  );
}
