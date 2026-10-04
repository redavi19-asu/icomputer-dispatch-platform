"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { LogOut, Power, Radio, ShieldCheck } from "lucide-react";

import { getStoredSession, logoutSession } from "@/lib/dispatchos-auth";
import { UrbanCarrierMark } from "@/components/branding/urban-carrier-mark";

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
  const [signingOut, setSigningOut] = useState(false);

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

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setAvailability(false);
    await logoutSession();
    window.location.replace(`${appBase()}/auth?mode=login&app=driver`);
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-[#061a33] text-white">
      <div className="sticky top-0 z-[80] border-b border-sky-300/15 bg-[linear-gradient(90deg,rgba(6,26,51,.98),rgba(8,39,79,.96),rgba(10,74,145,.90))] px-3 py-3 shadow-[0_8px_26px_rgba(0,20,60,.16)] backdrop-blur md:px-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <UrbanCarrierMark href="/" size="sm" />
            <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-300" />
              <p className="truncate text-sm font-semibold">
                {session?.company.name ?? "Urban Carrier OS"} Driver
              </p>
            </div>
            <p className="mt-0.5 truncate text-xs text-white/50">
              Signed in as {session?.user.name ?? "Driver"}
            </p>
            </div>
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
              disabled={signingOut}
              aria-label="Sign out"
              title="Log out"
              className="inline-flex items-center gap-2 rounded-full border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-wait disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{signingOut ? "Logging out…" : "Log Out"}</span>
            </button>
          </div>
        </div>
      </div>

      {online ? (
        children
      ) : (
        <main className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6 py-12">
          <section className="w-full max-w-lg rounded-3xl border border-sky-300/15 bg-[linear-gradient(160deg,rgba(8,39,79,.92),rgba(6,26,51,.96))] p-7 text-center shadow-2xl md:p-9">
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
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 font-semibold text-white transition hover:bg-orange-400"
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
