"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Crown,
  Download,
  LayoutDashboard,
  MapPin,
  Settings2,
  Smartphone,
  Users,
  Wand2,
} from "lucide-react";
import DispatchPreviewMap from "@/components/marketing/dispatch-preview-map";
import CustomVersionModal from "@/components/marketing/custom-version-modal";

const flow = [
  { number: "01", title: "Set up your company", text: "Name your operation, choose your workflow preferences, and configure how your team works.", icon: Settings2 },
  { number: "02", title: "Build your team", text: "Add drivers, technicians, field workers, and dispatcher access based on your subscription.", icon: Users },
  { number: "03", title: "Install the apps", text: "Put the Dispatcher app on office devices and the Driver app on the phones and tablets used in the field.", icon: Download },
  { number: "04", title: "Start operating", text: "Create assignments, dispatch your team, follow field status, and keep the operation moving from one command system.", icon: MapPin },
];

const standardFeatures = [
  "Company workspace and operating preferences",
  "Driver and field-team management",
  "Installable Dispatcher app",
  "Installable Driver app",
  "Job assignment and live status workflow",
  "Maps, routing context, and field visibility",
];

export default function DemoPage() {
  const [customModalOpen, setCustomModalOpen] = useState(false);

  return (
    <main className="min-h-screen overflow-hidden bg-[#05070b] text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_28%,rgba(34,211,238,.18),transparent_28%),radial-gradient(circle_at_18%_72%,rgba(16,185,129,.11),transparent_32%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-10 md:py-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100"><ArrowLeft className="h-4 w-4" /> Back to DispatchOS</Link>
            <Link href="/plans" className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/15">View Plans <ArrowRight className="h-4 w-4" /></Link>
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">DispatchOS Product Tour</p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">See how your operation runs before you install.</h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/65 md:text-lg">DispatchOS gives your office a command center and your field team a connected mobile workflow. Set up the company once, install the apps on the devices you use, and start dispatching.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/plans" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-4 font-bold text-white hover:bg-emerald-400">Choose a Plan <ArrowRight className="h-4 w-4" /></Link>
                <button type="button" onClick={() => setCustomModalOpen(true)} className="rounded-xl border border-white/15 bg-white/[0.05] px-6 py-4 font-semibold text-white hover:bg-white/[0.09]">Need Custom Integration?</button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/15 bg-slate-950/80 p-4 shadow-2xl sm:p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div><p className="text-[10px] uppercase tracking-[.2em] text-white/35">Dispatcher App Preview</p><p className="mt-1 text-lg font-semibold">Company Command Center</p></div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">Live</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[["8","Waiting"],["12","Team"],["5","Active"]].map(([value,label]) => <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3"><p className="text-xl font-bold">{value}</p><p className="text-[10px] text-white/40 sm:text-xs">{label}</p></div>)}
              </div>
              <div className="mt-4 h-64 overflow-hidden rounded-2xl border border-cyan-400/20 bg-slate-900 p-1"><DispatchPreviewMap /></div>
              <div className="mt-3 flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs text-white/65"><span>Field assignment #1048</span><span className="text-amber-300">En route • 14 min</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="max-w-3xl"><p className="text-xs uppercase tracking-[0.24em] text-emerald-300">How it works</p><h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">From company setup to live field operations.</h2><p className="mt-4 text-white/55">The website manages your account. The installed apps run the operation.</p></div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {flow.map(({number,title,text,icon:Icon}) => <article key={number} className="rounded-3xl border border-white/10 bg-white/[0.035] p-6"><div className="flex items-center justify-between"><Icon className="h-8 w-8 text-cyan-300"/><span className="text-xs font-bold tracking-[.22em] text-white/25">{number}</span></div><h3 className="mt-6 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-white/55">{text}</p></article>)}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:py-24 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-cyan-400/20 bg-cyan-500/[0.055] p-7 md:p-9">
            <div className="flex items-center gap-3"><LayoutDashboard className="h-9 w-9 text-cyan-300"/><div><p className="text-xs uppercase tracking-[.2em] text-cyan-300">Office</p><h2 className="mt-1 text-2xl font-semibold">Dispatcher App</h2></div></div>
            <p className="mt-5 text-sm leading-7 text-white/62">Your dispatchers work from the installed command center—not from the account website. Manage assignments, maps, drivers, active jobs, status, and the daily operation from the devices your office actually uses.</p>
            <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-5"><div className="grid grid-cols-3 gap-3">{[["24","Jobs"],["18","Drivers"],["6","Active"]].map(([v,l]) => <div key={l}><p className="text-2xl font-bold text-cyan-100">{v}</p><p className="text-xs text-white/35">{l}</p></div>)}</div><div className="mt-5 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 className="h-4 w-4"/> Connected to your company workspace</div></div>
          </div>

          <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-500/[0.055] p-7 md:p-9">
            <div className="flex items-center gap-3"><Smartphone className="h-9 w-9 text-emerald-300"/><div><p className="text-xs uppercase tracking-[.2em] text-emerald-300">Field</p><h2 className="mt-1 text-2xl font-semibold">Driver App</h2></div></div>
            <p className="mt-5 text-sm leading-7 text-white/62">Drivers and field workers install their mobile experience on the phone or tablet they carry. Their company connection, assignments, directions, mission details, and status controls travel with them.</p>
            <div className="mx-auto mt-7 max-w-sm rounded-[2rem] border border-white/10 bg-black/35 p-5"><p className="text-xs uppercase tracking-[.18em] text-white/35">Current Assignment</p><p className="mt-2 font-semibold">Service Call #1048</p><div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-500/10 p-4 text-sm text-emerald-100"><MapPin className="mb-2 h-5 w-5"/> 4.8 miles away<br/><span className="text-xs text-emerald-200/60">Navigation ready • Status: En route</span></div></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr]">
          <div><p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Standard DispatchOS</p><h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">The operating tools your team needs.</h2><div className="mt-7 grid gap-3 sm:grid-cols-2">{standardFeatures.map(item => <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400"/>{item}</div>)}</div></div>
          <div className="rounded-[2rem] border border-violet-400/20 bg-violet-500/[0.055] p-7 md:p-9"><Wand2 className="h-9 w-9 text-violet-300"/><p className="mt-6 text-xs uppercase tracking-[.2em] text-violet-300">Custom Integration</p><h2 className="mt-2 text-2xl font-semibold">Want DispatchOS connected to your existing business?</h2><p className="mt-4 text-sm leading-7 text-white/60">Website booking or request pages, branded customer intake, APIs, existing systems, special workflows, and company-specific integrations are custom professional services—not part of the standard subscription.</p><button type="button" onClick={() => setCustomModalOpen(true)} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-violet-300/25 bg-violet-500/15 px-5 py-3 font-semibold text-violet-100 hover:bg-violet-500/20">Request Custom Integration <ArrowRight className="h-4 w-4"/></button></div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20 md:pb-28">
        <div className="overflow-hidden rounded-[2rem] border border-emerald-400/25 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,.18),transparent_35%),linear-gradient(135deg,#111827,#020617)] p-8 text-center md:p-12">
          <Crown className="mx-auto h-9 w-9 text-emerald-300"/>
          <p className="mt-5 text-xs uppercase tracking-[0.22em] text-emerald-300">Ready to get operating?</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">Set up your company. Install your apps. Put your team in motion.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/55">Choose the DispatchOS plan that fits your team size and operating needs.</p>
          <Link href="/plans" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-7 py-4 font-bold text-white transition hover:bg-emerald-400">View Plans <ArrowRight className="h-4 w-4"/></Link>
        </div>
      </section>

      <CustomVersionModal open={customModalOpen} onClose={() => setCustomModalOpen(false)} />
    </main>
  );
}
