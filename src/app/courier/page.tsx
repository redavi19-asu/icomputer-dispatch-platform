"use client";

import Link from "next/link";
import { ArrowLeft, Boxes, ScanLine, ShieldCheck, Truck } from "lucide-react";
import { CourierIntakeConsole } from "@/components/courier/courier-intake-console";

export default function CourierOperationsPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#0f172a_0%,#020617_45%,#000_100%)] px-4 py-6 text-white md:px-6 lg:px-8">
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
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10">
                <Truck className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
                  Urban Courier OS
                </p>
                <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                  Courier Operations
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55 md:text-base">
              Intake packages by barcode, manifest or address OCR; build an ordered multi-stop route; dispatch it to a driver; and keep every delivery connected to the existing job, tracking and proof system.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              [ScanLine, "Scan"],
              [Boxes, "Route"],
              [ShieldCheck, "Proof"],
            ].map(([Icon, label]) => {
              const ItemIcon = Icon as typeof ScanLine;
              return (
                <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <ItemIcon className="mx-auto h-5 w-5 text-cyan-300" />
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">
                    {String(label)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <CourierIntakeConsole />
      </div>
    </main>
  );
}
