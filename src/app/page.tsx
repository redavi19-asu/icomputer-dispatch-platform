"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Users,
  Wand2,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const workflowStages = [
  {
    icon: Wand2,
    title: "Booking Engine",
    text: "Customers submit a structured service request through a branded booking experience.",
  },
  {
    icon: LayoutDashboard,
    title: "Dispatch Command",
    text: "Dispatchers manage waiting jobs, assignments, active work, maps, and operating status.",
  },
  {
    icon: Smartphone,
    title: "Driver Mission",
    text: "Drivers receive the active job, directions, mission details, and status controls on mobile.",
  },
  {
    icon: MessageSquare,
    title: "Customer Updates",
    text: "Customers stay informed as the job moves from request through assignment and completion.",
  },
];

const modules = [
  [LayoutDashboard, "Dispatcher App", "Installable command-center experience for office and dispatch staff."],
  [Smartphone, "Driver App", "Mobile-first mission workflow for drivers and field technicians."],
  [Wand2, "Booking Page", "Company-branded request intake for customers."],
  [Users, "Driver Management", "Invite, organize, and manage company drivers from one workspace."],
  [CreditCard, "Billing", "Company subscription and billing controls live inside the customer workspace."],
  [Building2, "Company Workspace", "Central control area for settings, apps, operations, and company configuration."],
];

export default function Home() {
  const [globeVideoFailed, setGlobeVideoFailed] = useState(false);

  const withBasePath = (path: string) => {
    const base = process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "";
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalized}`;
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative min-h-screen overflow-hidden border-b border-white/10 bg-black">
        <div className="absolute inset-0">
          {!globeVideoFailed ? (
            <video
              autoPlay
              muted
              playsInline
              loop
              preload="metadata"
              poster={withBasePath("/globe.svg")}
              onError={() => setGlobeVideoFailed(true)}
              className="absolute inset-0 h-full w-full object-cover opacity-75"
            >
              <source src={withBasePath("/earthbg.mp4")} type="video/mp4" />
            </video>
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${withBasePath("/globe.svg")}')` }}
            />
          )}
        </div>

        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_45%,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_50%_50%,transparent,rgba(0,0,0,0.75)_78%)]" />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-6 py-20">
          <div className="max-w-4xl">
            <a
              href="https://redavi19-asu.github.io/icomuteranythingV3/"
              className="inline-flex rounded-full border border-cyan-300/30 bg-black/35 px-4 py-2 text-xs font-medium tracking-wide text-cyan-100 backdrop-blur"
            >
              Built by I Computer Anything
            </a>

            <p className="mt-7 text-xs uppercase tracking-[0.28em] text-cyan-300">DispatchOS</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl md:text-7xl">
              Dispatch software built for companies that move work through the field.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
              Booking, dispatch, driver operations, customer updates, company controls, and installable app experiences in one connected platform.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/subscribe"
                className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-7 py-4 font-bold text-slate-950 transition hover:bg-cyan-300"
              >
                View Plans & Subscribe
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-black/35 px-7 py-4 font-semibold text-white backdrop-blur transition hover:bg-black/50"
              >
                Product Tour
              </Link>
            </div>

            <div className="mt-8 inline-flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              <ShieldCheck className="h-5 w-5" />
              Operational tools are customer-only after activation.
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">One operating flow</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
            From customer request to completed job
          </h2>
          <p className="mt-4 text-white/65">
            DispatchOS connects the surfaces a service business normally has to stitch together manually.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {workflowStages.map((stage, index) => (
            <motion.div
              key={stage.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <Card className="h-full rounded-3xl border border-white/10 bg-white/[0.04] text-white">
                <CardContent className="p-6">
                  <stage.icon className="h-8 w-8 text-cyan-300" />
                  <h3 className="mt-5 text-xl font-semibold">{stage.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/65">{stage.text}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Included platform surfaces</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
              Everything your company gets after activation
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {modules.map(([Icon, title, text], index) => {
              const ModuleIcon = Icon as typeof LayoutDashboard;
              return (
                <motion.div
                  key={title as string}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.35, delay: index * 0.04 }}
                >
                  <Card className="h-full rounded-3xl border border-white/10 bg-slate-900/70 text-white">
                    <CardContent className="p-6">
                      <ModuleIcon className="h-8 w-8 text-cyan-300" />
                      <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                      <p className="mt-3 text-sm leading-6 text-white/65">{text}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="rounded-[2rem] border border-cyan-400/25 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.14),transparent_36%),linear-gradient(to_bottom_right,#0f172a,#020617)] p-8 md:p-12">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Customer access</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
            Subscribe first. Then activate the workspace and install the apps.
          </h2>
          <p className="mt-5 max-w-2xl text-white/65">
            The public DispatchOS site is for learning about the product and choosing a plan. Dispatcher, driver, booking-management, billing, and workspace controls belong to activated company accounts.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/subscribe"
              className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-7 py-4 font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              Start Subscription
            </Link>
            <a
              href="https://redavi19-asu.github.io/icomuteranythingV3/"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-7 py-4 font-semibold text-white transition hover:bg-white/5"
            >
              Need a Custom Version?
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-8 text-sm text-white/60 md:flex-row md:items-center md:justify-between">
          <a href="https://redavi19-asu.github.io/icomuteranythingV3/" className="font-medium text-cyan-200">
            Built by I Computer Anything
          </a>
          <p className="text-xs">DispatchOS — field service operations software</p>
        </div>
      </footer>
    </main>
  );
}
