"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import DispatchPreviewMap from "@/components/marketing/dispatch-preview-map";
import CustomVersionModal from "@/components/marketing/custom-version-modal";
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
  WalletCards,
  Wand2,
  Zap,
} from "lucide-react";

const workflowStages = [
  { icon: Wand2, title: "Booking Engine", text: "Optional custom integration for companies that want website forms or booking requests connected directly into DispatchOS.", tone: "emerald", custom: true },
  { icon: LayoutDashboard, title: "Dispatch Command", text: "Dispatchers manage waiting jobs, assignments, maps, active work, and operating status.", tone: "cyan" },
  { icon: Smartphone, title: "Driver Mission", text: "Drivers and field staff receive the active job, directions, mission details, and status controls on mobile.", tone: "rose" },
  { icon: MessageSquare, title: "Field Updates", text: "The office stays informed as assignments move from request to dispatch, field work, and completion.", tone: "amber" },
];

const modules = [
  { icon: LayoutDashboard, title: "Dispatcher App", text: "Installable command center for owners and dispatch staff.", className: "border-cyan-400/20 bg-cyan-500/[0.06]", iconClass: "text-cyan-300" },
  { icon: Smartphone, title: "Driver App", text: "Mobile-first mission workflow for drivers and field teams.", className: "border-emerald-400/20 bg-emerald-500/[0.06]", iconClass: "text-emerald-300" },
  { icon: WalletCards, title: "Driver Pay + Mileage Calculator", text: "Track mission mileage and calculate completed-job driver pay from company-defined rates. Payroll and payout connections are optional integrations.", className: "border-fuchsia-400/20 bg-fuchsia-500/[0.06]", iconClass: "text-fuchsia-300" },
  { icon: Wand2, title: "Booking Page", text: "Optional custom build that connects your website or intake flow directly into DispatchOS.", className: "border-amber-400/20 bg-amber-500/[0.06]", iconClass: "text-amber-300", custom: true },
  { icon: Users, title: "Team Management", text: "Invite and organize drivers and field staff from one workspace.", className: "border-violet-400/20 bg-violet-500/[0.06]", iconClass: "text-violet-300" },
  { icon: CreditCard, title: "Billing", text: "Subscription and account billing controls.", className: "border-rose-400/20 bg-rose-500/[0.06]", iconClass: "text-rose-300" },
  { icon: Building2, title: "Company Workspace", text: "Company settings, drivers, billing, downloads, and account configuration.", className: "border-sky-400/20 bg-sky-500/[0.06]", iconClass: "text-sky-300" },
];

const businessTypes = [
  { title: "Service & repair", examples: "Electricians, plumbers, HVAC, repair, maintenance and mobile technicians", icon: Zap },
  { title: "Delivery & fleet", examples: "Courier, roadside, charging, delivery, route-based and mobile operations", icon: MapPinned },
  { title: "Field teams & outreach", examples: "Contractors, inspections, event crews, canvassing, nonprofit outreach and mobile staff", icon: Users },
];

const toneClasses: Record<string, string> = {
  emerald: "border-emerald-400/20 bg-emerald-500/[0.06] text-emerald-300",
  cyan: "border-cyan-400/20 bg-cyan-500/[0.06] text-cyan-300",
  rose: "border-rose-400/20 bg-rose-500/[0.06] text-rose-300",
  amber: "border-amber-400/20 bg-amber-500/[0.06] text-amber-300",
};

type SystemHealth = "checking" | "online" | "issue";

export default function Home() {
  const [globeVideoFailed, setGlobeVideoFailed] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>("checking");

  useEffect(() => {
    let mounted = true;
    const apiBase =
      process.env.NEXT_PUBLIC_DISPATCHOS_API_URL?.replace(/\/+$/, "") ||
      "https://dispatchos-auth-api.ryanedavis.workers.dev";

    async function checkSystemHealth() {
      try {
        const response = await fetch(`${apiBase}/health`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const data = await response.json().catch(() => null);
        const healthy =
          response.ok &&
          data?.ok === true &&
          data?.database === "connected";

        if (mounted) setSystemHealth(healthy ? "online" : "issue");
      } catch {
        if (mounted) setSystemHealth("issue");
      }
    }

    checkSystemHealth();
    const timer = window.setInterval(checkSystemHealth, 60000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const healthLabel =
    systemHealth === "online"
      ? "System Online"
      : systemHealth === "checking"
        ? "Checking System"
        : "Service Issue";

  const healthBadgeClass =
    systemHealth === "online"
      ? "bg-emerald-500/15 text-emerald-300"
      : systemHealth === "checking"
        ? "bg-amber-500/15 text-amber-200"
        : "bg-rose-500/15 text-rose-300";

  const healthDotClass =
    systemHealth === "online"
      ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.95)] animate-pulse"
      : systemHealth === "checking"
        ? "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,.7)] animate-pulse"
        : "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,.75)]";

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
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300 sm:text-sm">Business • Driver • Customer Logistics Software</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-7xl">Run the whole job from one command system.</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">DispatchOS connects the business, the driver or field team, and the customer in one operating flow — from request and assignment through field progress, updates, and completion.</p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/plans" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-7 py-4 font-bold text-white transition hover:bg-emerald-400">View Plans <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/demo" className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/[0.06] px-7 py-4 font-semibold text-white backdrop-blur transition hover:bg-white/[0.1]">Product Tour</Link>
              <Link href="/auth?mode=login" className="inline-flex items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-500/[0.08] px-7 py-4 font-semibold text-cyan-100 transition hover:bg-cyan-500/[0.13]">Log In</Link>
            </div>

            <div className="mt-7 inline-flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              <ShieldCheck className="h-5 w-5" /> Business workspace. Driver workflow. Customer connection. One system.
            </div>
          </div>

          <div className="relative mt-2 block lg:mt-0">
            <div className="absolute -inset-10 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/15 bg-slate-950/80 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div><p className="text-xs uppercase tracking-[.2em] text-white/40">Live Operations</p><p className="mt-1 text-lg font-semibold">Dispatch Command</p></div>
                <span
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-[11px] sm:text-xs ${healthBadgeClass}`}
                  aria-live="polite"
                  title="Live DispatchOS Worker and database health"
                >
                  <span className={`h-2 w-2 rounded-full ${healthDotClass}`} aria-hidden="true" />
                  {healthLabel}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
                {[["12","Waiting"],["7","Assigned"],["5","Active"]].map(([value,label]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4"><p className="text-xl font-bold sm:text-2xl">{value}</p><p className="text-[10px] text-white/45 sm:text-xs">{label}</p></div>)}
              </div>
              <div className="mt-4 h-56 overflow-hidden rounded-2xl border border-cyan-400/20 bg-slate-900 p-1 shadow-[0_0_30px_rgba(34,211,238,.08)] sm:h-60 lg:h-52">
                <DispatchPreviewMap />
              </div>
              <div className="mt-4 space-y-2">
                {["New field assignment created","Team member en route • ETA 14 min","Assignment status updated"].map((item, i) => <div key={item} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-xs text-white/70 sm:px-4 sm:text-sm"><span className={`h-2 w-2 shrink-0 rounded-full ${i === 0 ? "bg-rose-400" : i === 1 ? "bg-amber-400" : "bg-emerald-400"}`} />{item}</div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="max-w-3xl"><p className="text-xs uppercase tracking-[0.24em] text-emerald-300">Business • Driver • Customer</p><h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">One operating flow from request to completion</h2><p className="mt-4 text-white/60">The business receives and manages the work, the driver or field team executes it, and the customer stays connected to the job as it moves forward.</p></div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {workflowStages.map((stage, index) => (
            <motion.article key={stage.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.35, delay: index * 0.05 }} className={`rounded-3xl border p-6 ${toneClasses[stage.tone]}`}>
              <stage.icon className="h-8 w-8" /><p className="mt-6 text-xs font-semibold tracking-[.22em] text-white/35">0{index + 1}</p><h3 className="mt-2 text-xl font-semibold text-white">{stage.title}</h3><p className="mt-3 text-sm leading-6 text-white/62">{stage.text}</p>
              {stage.custom ? <button type="button" onClick={() => setCustomModalOpen(true)} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-200 hover:text-emerald-100">Need this connected? Custom integration <ArrowRight className="h-4 w-4" /></button> : null}
            </motion.article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:py-24 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div><p className="text-xs uppercase tracking-[0.24em] text-rose-300">Built for teams that move</p><h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">Your company decides what a “job” means.</h2><p className="mt-5 text-white/62 leading-7">DispatchOS is the logistics middle layer connecting your business, the drivers or people you send into the field, and the customer waiting on the work. Use it for service calls, deliveries, inspections, mobile crews, outreach, events, route work, or another operation that needs assignments, location awareness, and status updates.</p>
            <div className="mt-7 space-y-3">{["Set up your company preferences and operating workflow","Add drivers, technicians, staff, or field teams as your operation grows","Install the Dispatcher app for office operations and the Driver app for field work","Track driver mileage and calculate completed-job pay from company-defined rates","Request a custom integration when you want DispatchOS connected to payroll, payouts, your website, forms, or existing systems"].map(item => <div key={item} className="flex items-start gap-3 text-sm text-white/75"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />{item}</div>)}</div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {businessTypes.map(({title,examples,icon:Icon}) => <div key={title} className="rounded-3xl border border-white/10 bg-slate-900/70 p-6"><Icon className="h-8 w-8 text-amber-300"/><h3 className="mt-5 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-white/55">{examples}</p></div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div className="max-w-3xl"><p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Included after activation</p><h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">Your company operating kit</h2></div><p className="max-w-md text-sm leading-6 text-white/50">The standard subscription gives your company the account portal, team controls, downloadable Dispatcher and Driver apps, plus driver mileage tracking and the completed-job pay calculator. Payroll, automatic payouts, website, and intake integrations are separate custom services.</p></div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {modules.map(({icon: Icon,title,text,className,iconClass,custom}) => <div key={title} className={`rounded-3xl border p-6 ${className}`}><Icon className={`h-8 w-8 ${iconClass}`}/><h3 className="mt-5 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-white/60">{text}</p><div className="mt-6 border-t border-white/8 pt-4 text-xs uppercase tracking-[.18em] text-white/30">{custom ? "Custom build" : "Customer access"}</div>{custom ? <button type="button" onClick={() => setCustomModalOpen(true)} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-200 hover:text-amber-100">Need Custom Company Integration? <ArrowRight className="h-4 w-4" /></button> : null}</div>)}
        </div>
      </section>

      <section className="px-6 pb-20 md:pb-28">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,.16),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(190,24,93,.12),transparent_40%),linear-gradient(135deg,#111827,#020617)] p-8 md:p-12">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">Ready when your company is</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">Activate. Set up your company. Connect your drivers. Serve your customers.</h2>
          <p className="mt-5 max-w-3xl text-white/62 leading-7">Your subscription connects your company workspace, Dispatcher app, Driver app, team management, driver mileage tracking, completed-job pay calculator, billing, and account access. If you want DispatchOS wired into payroll, automatic driver payouts, your existing website, forms, booking process, internal systems, or an industry-specific workflow, I Computer Anything handles that as a custom integration.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/plans" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-7 py-4 font-bold text-white transition hover:bg-emerald-400">View Plans <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/auth?mode=login" className="inline-flex items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-7 py-4 font-semibold text-cyan-100 transition hover:bg-cyan-500/15">Customer Log In</Link>
            <button type="button" onClick={() => setCustomModalOpen(true)} className="inline-flex items-center justify-center rounded-xl border border-rose-300/20 bg-rose-500/10 px-7 py-4 font-semibold text-rose-100 transition hover:bg-rose-500/15">Need Custom Company Integration?</button>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black/60"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-8 text-sm text-white/60 md:flex-row md:items-center md:justify-between"><a href="https://redavi19-asu.github.io/icomuteranythingV3/" className="font-medium text-cyan-200">Built by I Computer Anything</a><p className="text-xs">DispatchOS — Business • Driver • Customer Logistics Software</p></div></footer>

      <CustomVersionModal open={customModalOpen} onClose={() => setCustomModalOpen(false)} />
    </main>
  );
}