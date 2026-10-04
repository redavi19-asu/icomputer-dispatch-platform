"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
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

const assetPath = (path: string) => {
  const base = process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "";
  const normalized = path.startsWith("/") ? path : "/" + path;
  return base + normalized;
};

const workflowStages = [
  { icon: Wand2, title: "Booking Engine", text: "Optional custom integration for companies that want website forms or booking requests connected directly into Urban Carrier OS.", tone: "orange", custom: true },
  { icon: LayoutDashboard, title: "Dispatch Command", text: "Dispatchers manage waiting jobs, assignments, maps, active work, and operating status.", tone: "blue" },
  { icon: Smartphone, title: "Driver Mission", text: "Drivers and field staff receive the active job, directions, mission details, and status controls on mobile.", tone: "sky" },
  { icon: MessageSquare, title: "Customer Updates", text: "Keep customers connected as assignments move from request to dispatch, field work, and completion.", tone: "amber" },
];

const modules = [
  { icon: LayoutDashboard, title: "Dispatcher App", text: "Installable command center for owners and dispatch staff.", className: "border-sky-300/25 bg-sky-400/[0.08]", iconClass: "text-sky-200" },
  { icon: Smartphone, title: "Driver App", text: "Mobile-first mission workflow for drivers and field teams.", className: "border-orange-300/25 bg-orange-400/[0.08]", iconClass: "text-orange-200" },
  { icon: WalletCards, title: "Driver Pay + Mileage", text: "Track mission mileage and calculate completed-job driver pay from company-defined rates.", className: "border-amber-300/25 bg-amber-400/[0.08]", iconClass: "text-amber-200" },
  { icon: Wand2, title: "Booking Integration", text: "Optional custom build that connects your website or intake flow directly into Urban Carrier OS.", className: "border-rose-300/25 bg-rose-400/[0.08]", iconClass: "text-rose-200", custom: true },
  { icon: Users, title: "Team Management", text: "Invite and organize drivers and field staff from one workspace.", className: "border-blue-300/25 bg-blue-400/[0.08]", iconClass: "text-blue-200" },
  { icon: CreditCard, title: "Billing", text: "Subscription and account billing controls.", className: "border-cyan-300/25 bg-cyan-400/[0.08]", iconClass: "text-cyan-200" },
  { icon: Building2, title: "Company Workspace", text: "Company settings, drivers, billing, downloads, and account configuration.", className: "border-indigo-300/25 bg-indigo-400/[0.08]", iconClass: "text-indigo-200" },
];

const businessTypes = [
  { title: "Service & repair", examples: "Electricians, plumbers, HVAC, repair, maintenance and mobile technicians", icon: Zap },
  { title: "Delivery & fleet", examples: "Carrier, roadside, charging, delivery, route-based and mobile operations", icon: MapPinned },
  { title: "Field teams & outreach", examples: "Contractors, inspections, event crews, canvassing, nonprofit outreach and mobile staff", icon: Users },
];

const toneClasses: Record<string, string> = {
  orange: "border-orange-300/25 bg-orange-400/[0.08] text-orange-200",
  blue: "border-blue-300/25 bg-blue-400/[0.08] text-blue-200",
  sky: "border-sky-300/25 bg-sky-400/[0.08] text-sky-200",
  amber: "border-amber-300/25 bg-amber-400/[0.08] text-amber-200",
};

function UrbanCarrierSplash({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <main className="fixed inset-0 z-[9999] grid min-h-screen place-items-center overflow-hidden bg-[#061a33] px-6 text-white" role="status" aria-live="polite" aria-label="Urban Carrier OS loading">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(59,130,246,.42),transparent_34%),radial-gradient(circle_at_25%_75%,rgba(249,115,22,.18),transparent_30%),linear-gradient(180deg,#061a33_0%,#08274f_55%,#041326_100%)]" />
      <div className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
        <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.48em] text-sky-100/70">I Computer Anything</p>
        <motion.div
          className="relative h-28 w-28 overflow-hidden rounded-[2rem] border border-white/50 bg-white p-1.5 shadow-[0_24px_70px_rgba(0,0,0,.38)] sm:h-32 sm:w-32"
          animate={reduceMotion ? undefined : { scale: [1, 1.035, 1] }}
          transition={{ duration: 1.35, repeat: reduceMotion ? 0 : Infinity, ease: "easeInOut" }}
        >
          <img src={assetPath("/urban-carrier-icon.svg")} alt="" className="h-full w-full rounded-[1.65rem] object-cover" />
          <motion.span
            className="absolute right-3 top-3 h-3.5 w-3.5 rounded-full bg-orange-400 shadow-[0_0_20px_rgba(251,146,60,.95)]"
            animate={reduceMotion ? undefined : { opacity: [0.45, 1, 0.45], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.05, repeat: reduceMotion ? 0 : Infinity, ease: "easeInOut" }}
          />
        </motion.div>
        <h1 className="mt-7 text-3xl font-black uppercase tracking-[0.1em] text-white sm:text-5xl">Urban Carrier OS</h1>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.27em] text-orange-200 sm:text-xs">Dispatch • Route • Track • Deliver</p>
        <div className="mt-9 flex w-full max-w-md items-center gap-3" aria-hidden="true">
          {["BUSINESS", "DRIVER", "CUSTOMER"].map((label, index) => (
            <Fragment key={label}>
              <motion.div
                className="grid h-9 min-w-0 flex-1 place-items-center rounded-xl border border-white/15 bg-white/[0.06] px-2 text-[8px] font-black tracking-[0.16em] text-white/75 sm:text-[9px]"
                animate={reduceMotion ? undefined : { borderColor: ["rgba(255,255,255,.15)", "rgba(251,146,60,.7)", "rgba(255,255,255,.15)"] }}
                transition={{ duration: 1.25, delay: index * 0.18, repeat: reduceMotion ? 0 : Infinity, ease: "easeInOut" }}
              >{label}</motion.div>
              {index < 2 && <ArrowRight className="h-4 w-4 shrink-0 text-orange-300/80" />}
            </Fragment>
          ))}
        </div>
      </div>
    </main>
  );
}

type SystemHealth = "checking" | "online" | "issue";

export default function Home() {
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>("checking");
  const [showStartupSplash, setShowStartupSplash] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = window.setTimeout(() => setShowStartupSplash(false), reduceMotion ? 650 : 1500);
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

  useEffect(() => {
    let mounted = true;
    const apiBase = process.env.NEXT_PUBLIC_DISPATCHOS_API_URL?.replace(/\/+$/, "") || "https://dispatchos-auth-api.ryanedavis.workers.dev";
    async function checkSystemHealth() {
      try {
        const response = await fetch(apiBase + "/health", { cache: "no-store", headers: { Accept: "application/json" } });
        const data = await response.json().catch(() => null);
        const healthy = response.ok && data?.ok === true && data?.databaseReady === true && data?.centralDatabaseReady === true;
        if (mounted) setSystemHealth(healthy ? "online" : "issue");
      } catch {
        if (mounted) setSystemHealth("issue");
      }
    }
    checkSystemHealth();
    const timer = window.setInterval(checkSystemHealth, 60000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  const healthLabel = systemHealth === "online" ? "System Online" : systemHealth === "checking" ? "Checking System" : "Service Issue";
  const healthBadgeClass = systemHealth === "online" ? "bg-emerald-500/15 text-emerald-200" : systemHealth === "checking" ? "bg-amber-500/15 text-amber-100" : "bg-rose-500/15 text-rose-200";
  const healthDotClass = systemHealth === "online" ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.95)] animate-pulse" : systemHealth === "checking" ? "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,.7)] animate-pulse" : "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,.75)]";

  if (showStartupSplash) return <UrbanCarrierSplash reduceMotion={Boolean(reduceMotion)} />;

  return (
    <main className="min-h-screen overflow-hidden bg-[#061a33] text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(135deg,#061a33_0%,#0a4a91_52%,#2da7ef_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_14%,rgba(255,255,255,.28),transparent_25%),radial-gradient(circle_at_18%_78%,rgba(249,115,22,.20),transparent_28%)]" />
        <svg className="pointer-events-none absolute bottom-0 right-[-10%] h-[58%] w-[72%] opacity-85" viewBox="0 0 900 400" fill="none" aria-hidden="true">
          <path d="M860 38C670 66 808 150 610 180C425 208 510 314 282 334C184 342 94 350 10 390" stroke="white" strokeWidth="15" strokeLinecap="round" />
          <circle cx="842" cy="42" r="30" fill="#ff5a2a" stroke="white" strokeWidth="10" />
        </svg>

        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-6">
          <nav className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/15 bg-[#061a33]/55 px-4 py-3 backdrop-blur-xl sm:px-5">
            <a href="https://redavi19-asu.github.io/icomuteranythingV3/" className="inline-flex items-center gap-3 font-bold text-white">
              <span className="h-9 w-9 overflow-hidden rounded-xl border border-white/35 bg-white p-0.5"><img src={assetPath("/urban-carrier-icon.svg")} alt="" className="h-full w-full rounded-[10px] object-cover" /></span>
              <span><span className="block text-[10px] uppercase tracking-[0.22em] text-sky-100/65">I Computer Anything</span>Urban Carrier OS</span>
            </a>
            <div className="hidden items-center gap-5 text-sm font-semibold text-white/80 md:flex">
              <a href="#features" className="hover:text-white">Features</a>
              <a href="#operations" className="hover:text-white">Dispatch</a>
              <a href="#apps" className="hover:text-white">Driver App</a>
              <Link href="/plans" className="hover:text-white">Pricing</Link>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/auth?mode=login" className="rounded-xl px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10">Log In</Link>
              <Link href="/plans" className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-black text-white shadow-lg shadow-orange-950/20 transition hover:bg-orange-400">Get Started</Link>
            </div>
          </nav>
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 pb-14 pt-12 lg:grid-cols-[1.02fr_.98fr] lg:pb-20 lg:pt-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/30 bg-orange-400/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-100">
              <MapPinned className="h-4 w-4" /> Built for businesses that move
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-[-0.04em] sm:text-6xl md:text-7xl">Urban Carrier <span className="text-orange-400">OS</span></h1>
            <h2 className="mt-4 max-w-3xl text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Dispatch. Route. Track. Run modern carrier operations.</h2>
            <p className="mt-6 max-w-2xl text-base leading-7 text-sky-50/85 sm:text-lg">One connected operating system for your business, drivers or field teams, and customers — from request and assignment through live progress, routing, updates, mileage, and completion.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/plans" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-7 py-4 font-black text-white shadow-xl shadow-orange-950/25 transition hover:bg-orange-400">View Plans <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/demo" className="inline-flex items-center justify-center rounded-2xl border border-white/35 bg-white/10 px-7 py-4 font-bold text-white backdrop-blur transition hover:bg-white/15">Watch Product Tour</Link>
              <Link href="/auth?mode=register&plan=basic" className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-[#061a33]/35 px-7 py-4 font-bold text-white transition hover:bg-[#061a33]/50">Create Account</Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-sky-50/80">
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-300" /> Business workspace</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-300" /> Driver workflow</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-300" /> Customer connection</span>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative">
            <div className="absolute -inset-8 rounded-full bg-white/15 blur-3xl" />
            <div className="relative mx-auto max-w-[520px] overflow-hidden rounded-[2.6rem] border border-white/55 bg-white p-2 shadow-[0_38px_90px_rgba(0,20,60,.38)]">
              <img src={assetPath("/urban-carrier-icon.svg")} alt="Urban Carrier OS courier icon" className="block aspect-square w-full rounded-[2.2rem] object-cover" />
            </div>
          </motion.div>
        </div>

        <div id="operations" className="relative z-10 mx-auto max-w-7xl px-6 pb-20">
          <div className="overflow-hidden rounded-[2rem] border border-sky-200/40 bg-white shadow-[0_35px_90px_rgba(0,21,55,.35)]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 text-slate-900 sm:px-7">
              <div className="flex items-center gap-3">
                <img src={assetPath("/urban-carrier-icon.svg")} alt="" className="h-11 w-11 rounded-xl object-cover shadow-sm" />
                <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Urban Carrier OS</p><p className="font-black">Dispatch Command</p></div>
              </div>
              <span className={"inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold " + healthBadgeClass} aria-live="polite">
                <span className={"h-2 w-2 rounded-full " + healthDotClass} aria-hidden="true" />{healthLabel}
              </span>
            </div>
            <div className="grid gap-0 bg-slate-50 lg:grid-cols-[.72fr_1.28fr]">
              <aside className="bg-[#061a33] p-5 sm:p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">Live operation</p>
                <div className="mt-5 grid grid-cols-3 gap-2 lg:grid-cols-1">
                  {[["12","Waiting"],["7","Assigned"],["5","Active"]].map(([value,label]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><p className="text-2xl font-black text-white">{value}</p><p className="text-xs text-sky-100/55">{label}</p></div>)}
                </div>
                <div className="mt-5 space-y-2 text-sm">
                  {["Jobs","Dispatch","Drivers","Customers","Analytics","Settings"].map((item,index) => <div key={item} className={"rounded-xl px-3 py-2.5 font-semibold " + (index === 1 ? "bg-orange-500 text-white" : "text-sky-50/65")}>{item}</div>)}
                </div>
              </aside>
              <div className="p-4 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-4">
                  {[["128","Total Jobs"],["24","In Progress"],["96","Delivered"],["98%","On-Time"]].map(([value,label],index) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className={"text-2xl font-black " + (index === 0 ? "text-blue-600" : index === 1 ? "text-orange-500" : "text-emerald-600")}>{value}</p><p className="mt-1 text-xs font-semibold text-slate-500">{label}</p></div>)}
                </div>
                <div className="mt-4 h-72 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-1 shadow-inner sm:h-80">
                  <DispatchPreviewMap />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {["Package delivery • In progress","Documents • Picked up","Retail package • Delivered"].map((item,index) => <div key={item} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 shadow-sm"><span className={"mr-2 inline-block h-2 w-2 rounded-full " + (index === 0 ? "bg-blue-500" : index === 1 ? "bg-orange-500" : "bg-emerald-500")} />{item}</div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative bg-[#061a33] px-6 py-16 md:py-24">
        <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_10%_10%,rgba(45,167,239,.18),transparent_30%),radial-gradient(circle_at_90%_80%,rgba(249,115,22,.13),transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center"><p className="text-xs font-black uppercase tracking-[0.26em] text-orange-300">Everything in one flow</p><h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Everything you need to move your operation forward</h2><p className="mt-4 text-sky-100/60">Dispatch, track, route, communicate, and manage the field from one connected platform.</p></div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {workflowStages.map((stage,index) => (
              <motion.article key={stage.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.35, delay: index * 0.05 }} className={"rounded-3xl border p-6 backdrop-blur " + toneClasses[stage.tone]}>
                <stage.icon className="h-8 w-8" /><p className="mt-6 text-xs font-black tracking-[.22em] text-white/35">0{index + 1}</p><h3 className="mt-2 text-xl font-black text-white">{stage.title}</h3><p className="mt-3 text-sm leading-6 text-sky-50/65">{stage.text}</p>
                {stage.custom ? <button type="button" onClick={() => setCustomModalOpen(true)} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-orange-200 hover:text-orange-100">Custom integration <ArrowRight className="h-4 w-4" /></button> : null}
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f5f9ff] px-6 py-16 text-slate-900 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-500">Built for teams that move</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Your company decides what a “job” means.</h2>
            <p className="mt-5 leading-7 text-slate-600">Urban Carrier OS is the operating layer connecting your business, the people you send into the field, and the customer waiting on the work. Use it for service calls, deliveries, inspections, mobile crews, outreach, events, route work, and more.</p>
            <div className="mt-7 space-y-3">
              {["Set up your company workflow and operating preferences","Add drivers, technicians, staff, or field teams","Install Dispatcher for office operations and Driver for field work","Track mileage and calculate completed-job pay","Connect your website, payroll, payouts, or forms through custom integrations"].map(item => <div key={item} className="flex items-start gap-3 text-sm font-medium text-slate-700"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />{item}</div>)}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {businessTypes.map(({title,examples,icon:Icon}) => <div key={title} className="rounded-3xl border border-blue-100 bg-white p-6 shadow-[0_18px_45px_rgba(12,72,130,.10)]"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50"><Icon className="h-6 w-6 text-blue-600"/></div><h3 className="mt-5 text-lg font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-500">{examples}</p></div>)}
          </div>
        </div>
      </section>

      <section id="apps" className="bg-[#08274f] px-6 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">Included after activation</p><h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Your company operating kit</h2></div><p className="max-w-md text-sm leading-6 text-sky-100/55">Core access brings your workspace, Dispatcher, Driver, team controls, mileage tracking, pay calculations, billing, and account access together.</p></div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {modules.map(({icon:Icon,title,text,className,iconClass,custom}) => <div key={title} className={"rounded-3xl border p-6 " + className}><Icon className={"h-8 w-8 " + iconClass}/><h3 className="mt-5 text-xl font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-sky-50/60">{text}</p><div className="mt-6 border-t border-white/10 pt-4 text-xs font-bold uppercase tracking-[.18em] text-white/30">{custom ? "Custom build" : "Customer access"}</div>{custom ? <button type="button" onClick={() => setCustomModalOpen(true)} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-orange-200 hover:text-orange-100">Need this connected? <ArrowRight className="h-4 w-4" /></button> : null}</div>)}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#1594dd_0%,#0870c4_50%,#061a33_100%)] px-6 py-16 md:py-24">
        <svg className="pointer-events-none absolute bottom-[-40px] left-[-40px] h-64 w-[70%] opacity-70" viewBox="0 0 800 240" fill="none" aria-hidden="true"><path d="M20 200C170 80 250 210 390 105C520 8 610 145 780 38" stroke="white" strokeWidth="12" strokeLinecap="round"/><circle cx="778" cy="39" r="24" fill="#ff5a2a" stroke="white" strokeWidth="8"/></svg>
        <div className="relative mx-auto grid max-w-6xl gap-8 rounded-[2.2rem] border border-white/25 bg-[#061a33]/78 p-8 shadow-2xl backdrop-blur md:grid-cols-[1fr_auto] md:items-center md:p-12">
          <div><p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">Ready when your company is</p><h2 className="mt-4 max-w-3xl text-3xl font-black tracking-tight md:text-5xl">Activate. Dispatch. Move. Deliver.</h2><p className="mt-5 max-w-3xl leading-7 text-sky-50/65">Urban Carrier OS connects your workspace, Dispatcher, Driver app, team management, mileage, pay calculations, billing, and account access. Need deeper integrations? I Computer Anything can connect it to the systems your company already uses.</p></div>
          <div className="flex min-w-[220px] flex-col gap-3"><Link href="/plans" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-7 py-4 font-black text-white transition hover:bg-orange-400">View Plans <ArrowRight className="h-4 w-4" /></Link><Link href="/auth?mode=login" className="inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-7 py-4 font-bold text-white">Customer Log In</Link><button type="button" onClick={() => setCustomModalOpen(true)} className="inline-flex items-center justify-center rounded-2xl border border-sky-200/25 bg-sky-300/10 px-7 py-4 font-bold text-sky-100">Custom Integration</button></div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#041326]"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-sky-100/55 md:flex-row md:items-center md:justify-between"><a href="https://redavi19-asu.github.io/icomuteranythingV3/" className="inline-flex items-center gap-2 font-bold text-white"><img src={assetPath("/urban-carrier-icon.svg")} alt="" className="h-8 w-8 rounded-lg object-cover" /> Built by I Computer Anything</a><p className="text-xs">Urban Carrier OS — Business • Driver • Customer Logistics Software</p></div></footer>

      <CustomVersionModal open={customModalOpen} onClose={() => setCustomModalOpen(false)} />
    </main>
  );
}
