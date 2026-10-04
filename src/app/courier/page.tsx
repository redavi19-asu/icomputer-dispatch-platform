"use client";

import Link from "next/link";
import { ArrowLeft, ClipboardList, MapPinned, ShieldCheck, Truck } from "lucide-react";
import { CourierDispatchConsole } from "@/components/courier/courier-dispatch-console";
import { UrbanCarrierMark } from "@/components/branding/urban-carrier-mark";

export default function CourierOperationsPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#0a4a91_0%,#08274f_38%,#061a33_100%)] px-4 py-6 text-white md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/55 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Dispatch
            </Link>
            <div className="mt-4 flex items-center gap-3">
              <UrbanCarrierMark href="/" size="md" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-300">
                  Urban Carrier OS
                </p>
                <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                  Carrier Operations
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55 md:text-base">
              Prepare manifests, optimize routes, assign drivers and monitor delivery progress here. Physical package scanning and address capture happen on the driver phone.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              [ClipboardList, "Manifest"],
              [MapPinned, "Route"],
              [ShieldCheck, "Monitor"],
            ].map(([Icon, label]) => {
              const ItemIcon = Icon as typeof ClipboardList;
              return (
                <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <ItemIcon className="mx-auto h-5 w-5 text-sky-300" />
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">
                    {String(label)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <CourierDispatchConsole />
      </div>
    </main>
  );
}
