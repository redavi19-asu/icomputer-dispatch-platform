"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import DispatchPreviewMap from "@/components/marketing/dispatch-preview-map";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  MapPinned,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Users,
  Wand2,
  Zap,
} from "lucide-react";

const workflowStages = [
  { icon: Wand2, title: "Booking Engine", text: "Customers submit a branded service request with structured details and address information.", tone: "emerald" },
  { icon: LayoutDashboard, title: "Dispatch Command", text: "Dispatchers manage waiting jobs, assignments, maps, active work, and operating status.", tone: "cyan" },
  { icon: Smartphone, title: "Driver Mission", text: "Drivers receive the active job, directions, mission details, and status controls on mobile.", tone: "rose" },
  { icon: MessageSquare, title: "Customer Updates", text: "Customers stay informed as the job moves from request to assignment and completion.", tone: "amber" },
];

const modules = [
  { icon: LayoutDashboard, title: "Dispatcher App", text: "Installable command center for dispatch staff.", className: "border-cyan-400/20 bg-cyan-500/[0.06]", iconClass: "text-cyan-300" },
  { icon: Smartphone, title: "Driver App", text: "Mobile-first mission workflow for field teams.", className: "border-emerald-400/20 bg-emerald-500/[0.06]", iconClass: "text-emerald-300" },
  { icon: Wand2, title: "Booking Page", text: "Company-branded customer request intake.", className: "border-amber-400/20 bg-amber-500/[0.06]", iconClass: "text-amber-300" },
  { icon: Users, title: "Driver Management", text: "Invite and organize drivers from one workspace.", className: "border-violet-400/20 bg-violet-500/[0.06]", iconClass: "text-violet-300" },
  { icon: CreditCard, title: "Billing", text: "Subscription and account billing controls.", className: "border-rose-400/20 bg-rose-500/[0.06]", iconClass: "text-rose-300" },
  { icon: Building2, title: "Company Workspace", text: "Settings, apps, operations, and company configuration.", className: "border-sky-400/20 bg-sky-500/[0.06]", iconClass: "text-sky-300" },
];

const businessTypes = [
  { title: "Home & field services", examples: "Electricians, plumbers, HVAC, repair and maintenance crews", icon: Zap },
  { title: "Delivery & mobile operations", examples: "Courier, fleet, charging, roadside and route-based businesses", icon: MapPinned },
  { title: "Custom service workflows", examples: "Companies that need booking, assignment, field status and customer communication", icon: Building2 },
];

const toneClasses: Record<string, string> = {
  emerald: "border-emerald-400/20 bg-emerald-500/[0.06] text-emerald-300",
  cyan: "border-cyan-400/20 bg-cyan-500/[0.06] text-cyan-300",
  rose: "border-rose-400/20 bg-rose-500/[0.06] text-rose-300",
  amber: "border-amber-400/20 bg-amber-500/[0.06] text-amber-300",
};

export default function Home() {
  const [globeVideoFailed, setGlobeVideoFailed] = useState(false);

  const withBasePath = (path: string) => {
    const base = process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "";
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalized}`;
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#05070b] text-white">
      <section className="relative min-h-[92vh] overflow-hidden border-b border-white/10 bg-black">
        <div className="absolute inset-0">
          {!globeVideoFailed ? (
            <video autoPlay muted playsInline loop preload="metadata" poster={withBasePath("/globe.svg")} onError={() => setGlobeVideoFailed(true)} className="absolute inset-0 h-full w-full object-cover opacity-60">
              <source src={withBasePath("/earthbg.mp4")} type="video/mp4" />
            </video>
          ) : (
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${withBasePath("/globe.svg")}')` }} />
          )}
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.93)_0%,rgba(0,0,0,.72)_48%,rgba(0,0,0,.42)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_50%,rgba(34,211,238,.16),transparent_25%)]" />

        <div className="relative z-10 mx-auto grid min-h-[92vh] max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <a href="https://redavi19-asu.github.io/icomuteranythingV3/" className="inline-flex rounded-full border border-cyan-300/25 bg-black/35 px-4 py-2 text-xs font-medium tracking-wide text-cyan-100 backdrop-blur">Built by I Computer Anything</a>
            <p className="mt-8 text-xs uppercase tracking-[0.28em] text-cyan-300">DispatchOS</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-7xl">Run field operations from one command system.</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">Booking, dispatch, driver missions, customer updates, company controls, and installable apps—built as one connected platform.</p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/subscribe" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-7 py-4 font-bold text-white transition hover:bg-emerald-400">View Plans & Subscribe <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/demo" className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/[0.06] px-7 py-4 font-semibold text-white backdrop-blur transition hover:bg-white/[0.1]">Product Tour</Link>
            </div>

            <div className="mt-7 inline-flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              <ShieldCheck className="h-5 w-5" /> Public site = product information. Operational tools = activated customers.
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute -inset-10 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/15 bg-slate-950/80 p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div><p className="text-xs uppercase tracking-[.2em] text-white/40">Live Operations</p><p className="mt-1 text-lg font-semibold">Dispatch Command</p></div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">System Online</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[['12','Waiting'],['7','Assigned'],['5','Active']].map(([value,label]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-2xl font-bold">{value}</p><p className="text-xs text-white/45">{label}</p></div>)}
              </div>
              <div className="mt-4 h-52 overflow-hidden rounded-2xl border border-cyan-400/20 bg-slate-900 p-1 shadow-[0_0_30px_rgba(34,211,238,.08)]">
                <DispatchPreviewMap />
              </div>
              <div className="mt-4 space-y-2">
                {['Emergency service request assigned','Driver en route • ETA 14 min','Customer status updated'].map((item, i) => <div key={item} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/70"><span className={`h-2 w-2 rounded-full ${i === 0 ? 'bg-rose-400' : i === 1 ? 'bg-amber-400' : 'bg-emerald-400'}`} />{item}</div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="max-w-3xl"><p className="text-xs uppercase tracking-[0.24em] text-emerald-300">One operating flow</p><h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">From customer request to completed job</h2><p className="mt-4 text-white/60">No hopping between disconnected tools. Each part of the job hands off to the next.</p></div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {workflowStages.map((stage, index) => (
            <motion.article key={stage.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.35, delay: index * 0.05 }} className={`rounded-3xl border p-6 ${toneClasses[stage.tone]}`}>
              <stage.icon className="h-8 w-8" /><p className="mt-6 text-xs font-semibold tracking-[.22em] text-white/35">0{index + 1}</p><h3 className="mt-2 text-xl font-semibold text-white">{stage.title}</h3><p className="mt-3 text-sm leading-6 text-white/62">{stage.text}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:py-24 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div><p className="text-xs uppercase tracking-[0.24em] text-rose-300">Built for real service companies</p><h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">Not another generic dashboard.</h2><p className="mt-5 text-white/62 leading-7">DispatchOS is designed around the actual handoff between the customer, dispatcher, driver, and company owner. Your public website can stay exactly where it is while DispatchOS handles operations behind it.</p>
            <div className="mt-7 space-y-3">{['Keep your existing company website','Use a branded booking page or subdomain','Add drivers and dispatch staff as your team grows','Install the driver and dispatcher experiences after activation'].map(item => <div key={item} className="flex items-start gap-3 text-sm text-white/75"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />{item}</div>)}</div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {businessTypes.map(({title,examples,icon:Icon}) => <div key={title} className="rounded-3xl border border-white/10 bg-slate-900/70 p-6"><Icon className="h-8 w-8 text-amber-300"/><h3 className="mt-5 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-white/55">{examples}</p></div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div className="max-w-3xl"><p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Included after activation</p><h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">Your company operating kit</h2></div><p className="max-w-md text-sm leading-6 text-white/50">Public visitors can see what DispatchOS does. Company controls and app installation belong to activated accounts.</p></div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {modules.map(({icon: Icon,title,text,className,iconClass}) => <div key={title} className={`rounded-3xl border p-6 ${className}`}><Icon className={`h-8 w-8 ${iconClass}`}/><h3 className="mt-5 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-white/60">{text}</p><div className="mt-6 border-t border-white/8 pt-4 text-xs uppercase tracking-[.18em] text-white/30">Customer access</div></div>)}
        </div>
      </section>

      <section className="px-6 pb-20 md:pb-28">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,.16),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(190,24,93,.12),transparent_40%),linear-gradient(135deg,#111827,#020617)] p-8 md:p-12">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">Ready when your company is</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">Choose a plan first. Then activate your company workspace.</h2>
          <p className="mt-5 max-w-2xl text-white/62 leading-7">The public page stops here. Dispatcher controls, driver tools, booking management, company settings, billing, and app installation belong on the customer side.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/subscribe" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-7 py-4 font-bold text-white transition hover:bg-emerald-400">View Plans & Subscribe <ArrowRight className="h-4 w-4" /></Link>
            <a href="https://redavi19-asu.github.io/icomuteranythingV3/" className="inline-flex items-center justify-center rounded-xl border border-rose-300/20 bg-rose-500/10 px-7 py-4 font-semibold text-rose-100 transition hover:bg-rose-500/15">Need a Custom Version?</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black/60"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-8 text-sm text-white/60 md:flex-row md:items-center md:justify-between"><a href="https://redavi19-asu.github.io/icomuteranythingV3/" className="font-medium text-cyan-200">Built by I Computer Anything</a><p className="text-xs">DispatchOS — field service operations software</p></div></footer>
    </main>
  );
}