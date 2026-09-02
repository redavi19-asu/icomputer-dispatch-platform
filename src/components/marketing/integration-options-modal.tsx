"use client";

import { ArrowRight, CheckCircle2, X } from "lucide-react";

type IntegrationOptionsModalProps = {
  open: boolean;
  onClose: () => void;
  onRequest: () => void;
};

const options = [
  "Website request and intake forms connected to DispatchOS",
  "Customer booking or appointment workflows",
  "Company-specific status flows, job rules, and operating steps",
  "Branding and customer-facing experience customization",
  "API connections and links to existing business systems",
  "Special reporting, automation, or workflow configuration",
];

export default function IntegrationOptionsModal({
  open,
  onClose,
  onRequest,
}: IntegrationOptionsModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="relative w-full max-w-2xl rounded-3xl border border-violet-400/25 bg-[radial-gradient(circle_at_15%_0%,rgba(139,92,246,.18),transparent_32%),#070b14] p-7 text-white shadow-2xl md:p-10">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close integration options"
          className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70 transition hover:bg-white/[0.1] hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-300">
          Custom Company Integration
        </p>
        <h2 className="mt-3 pr-10 text-3xl font-semibold">What can we connect for your company?</h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-white/60">
          DispatchOS works as a standard Dispatcher and Driver platform. Custom integration is for companies that want DispatchOS connected to their own website, intake process, software, branding, or special operating workflow.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {options.map((option) => (
            <div key={option} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              <p className="text-sm leading-6 text-white/72">{option}</p>
            </div>
          ))}
        </div>

        <div className="mt-7 rounded-2xl border border-amber-300/15 bg-amber-500/[0.05] p-4 text-sm leading-6 text-amber-100/80">
          Custom integration is separate from the Basic and Business subscription and is quoted based on the work your company needs.
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onRequest}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-3.5 font-semibold text-white transition hover:bg-violet-400"
          >
            Request Custom Integration <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3.5 font-semibold text-white/75 transition hover:bg-white/[0.08]"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
