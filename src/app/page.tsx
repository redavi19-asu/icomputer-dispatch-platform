"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  Link2,
  MessageSquare,
  Settings2,
  Smartphone,
  Users,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const liveStatus = [
  { label: "Bookings live", value: "24" },
  { label: "Dispatch active", value: "8" },
  { label: "Drivers online", value: "31" },
  { label: "Routes updating", value: "Real-time" },
];

const workflowStages = [
  {
    icon: Wand2,
    title: "Booking Page",
    text: "Customer request intake with services, address verification, and branded conversion flow.",
    labels: ["Request Created", "Address Verified"],
  },
  {
    icon: LayoutDashboard,
    title: "Dispatch Dashboard",
    text: "Map-first operations center for triage, assignment, queue control, and service execution.",
    labels: ["Driver Assigned", "Queue Synced"],
  },
  {
    icon: Smartphone,
    title: "Driver Mission Screen",
    text: "Live mission context, route visibility, status progression, and customer-facing handoff updates.",
    labels: ["Route Live", "Customer Updated"],
  },
];

const companyTypes = [
  {
    title: "New service businesses",
    text: "Launch fast with booking, dispatch, driver workflow, and customer-facing pages in one system.",
    bullets: [
      "Booking page ready from day one",
      "Dispatch dashboard + live operations",
      "Driver console with mission workflow",
      "Customer-facing updates and status",
    ],
  },
  {
    title: "Existing service businesses",
    text: "Keep your current website and payment stack while adding DispatchOS behind your operations.",
    bullets: [
      "Keep your existing .com",
      "Add DispatchOS under a subdomain",
      "Keep your current payment processor",
      "Upgrade in phases without a full rebuild",
    ],
  },
];

const integrationCards = [
  {
    icon: Building2,
    title: "Keep your existing .com",
    text: "Maintain your current marketing site while DispatchOS powers operations behind the scenes.",
  },
  {
    icon: Link2,
    title: "Subdomain support",
    text: "Run on dispatch.yourcompany.com or book.yourcompany.com with a seamless branded transition.",
  },
  {
    icon: Users,
    title: "Hosted tenant option",
    text: "Launch quickly with yourcompany.dispatchos.com when you want speed without domain work.",
  },
  {
    icon: CreditCard,
    title: "Payment flexibility",
    text: "Keep your current payment processor now, then move to built-in platform billing later.",
  },
];

const modules = [
  {
    icon: LayoutDashboard,
    title: "Dispatch Command",
    text: "Command-center controls for assignment logic, queues, map operations, and service orchestration.",
  },
  {
    icon: Smartphone,
    title: "Driver Mission",
    text: "Mission-first mobile workflow for active jobs, route awareness, and status progression.",
  },
  {
    icon: Wand2,
    title: "Booking Engine",
    text: "Branded lead intake and request creation layer with verified service addresses and structured fields.",
  },
  {
    icon: MessageSquare,
    title: "Customer Updates",
    text: "Automated customer visibility and messaging moments tied to real dispatch and driver state.",
  },
  {
    icon: CreditCard,
    title: "Billing Layer",
    text: "Company billing and platform subscription controls that can coexist with existing payment tools.",
  },
  {
    icon: Settings2,
    title: "Company Controls",
    text: "Service definitions, dispatch preferences, branding options, and operational governance in one place.",
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative min-h-screen overflow-hidden border-b border-white/10 bg-black">
        <div className="absolute inset-0">
          <video
            autoPlay
            muted
            playsInline
            loop
            className="absolute inset-0 h-full w-full object-cover animate-[videoFadeA_12s_linear_infinite]"
          >
            <source src="/earthbg.mp4" type="video/mp4" />
          </video>

          <video
            autoPlay
            muted
            playsInline
            loop
            className="absolute inset-0 h-full w-full object-cover animate-[videoFadeB_12s_linear_infinite]"
          >
            <source src="/earthbg.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_45%,rgba(255,255,255,0.08),transparent_22%),radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.12),rgba(0,0,0,0.58)_75%)]" />

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 42 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-[-15%] font-mono text-white/20"
              style={{
                left: `${(i / 42) * 100}%`,
                fontSize: `${14 + (i % 4) * 4}px`,
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                animation: `dispatch-binary-fall ${8 + (i % 6)}s linear ${(i % 5) * 0.7}s infinite`,
                textShadow: "0 0 8px rgba(255,255,255,0.12)",
              }}
            >
              {Array.from({ length: 24 }, (_, j) => (((i + j) % 2) === 0 ? "0" : "1")).join(" ")}
            </div>
          ))}
        </div>

        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-6 py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-4 py-2 text-sm text-white/85 backdrop-blur">
              DispatchOS
            </div>

            <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white md:text-7xl">
              DispatchOS turns service operations into a live command system
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
              Booking intake, dispatch command, driver missions, and customer updates—run together
              in one premium platform.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => router.push("/demo")}
                className="rounded-xl border border-white/20 bg-black/35 px-6 py-6 text-base font-semibold text-white backdrop-blur-md hover:bg-black/50"
              >
                Request Demo
              </Button>
              <Button
                onClick={() => router.push("/chargenext/booking")}
                className="rounded-xl px-6 py-6 text-base font-semibold"
              >
                Start Platform Build
              </Button>
              <Button
                onClick={() => router.push("/demo")}
                className="rounded-xl border border-white/20 bg-black/35 px-6 py-6 text-base font-semibold text-white backdrop-blur-md hover:bg-black/50"
              >
                View Product Structure
              </Button>
            </div>

            <div className="mt-6 grid max-w-2xl grid-cols-2 gap-2 rounded-2xl border border-white/15 bg-black/35 p-2 backdrop-blur md:grid-cols-4">
              {liveStatus.map((item) => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <p className="text-xs text-white/55">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-cyan-200">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes dispatch-binary-fall {
            0% {
              transform: translateY(-10%);
            }
            100% {
              transform: translateY(120%);
            }
          }

          @keyframes heroZoom {
            0% {
              transform: scale(1);
            }
            100% {
              transform: scale(1.15);
            }
          }

          @keyframes videoFadeA {
            0% { opacity: 1; }
            45% { opacity: 1; }
            50% { opacity: 0; }
            95% { opacity: 0; }
            100% { opacity: 1; }
          }

          @keyframes videoFadeB {
            0% { opacity: 0; }
            45% { opacity: 0; }
            50% { opacity: 1; }
            95% { opacity: 1; }
            100% { opacity: 0; }
          }
        `}</style>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            One live workflow across every surface
          </h2>
          <p className="mt-3 text-white/65">
            DispatchOS links intake, decisioning, and field execution into one continuous operating
            loop.
          </p>
        </div>

        <div className="relative mt-10 grid gap-6 lg:grid-cols-3">
          {workflowStages.map((stage, index) => (
            <motion.div
              key={stage.title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="relative"
            >
              <Card className="h-full rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.09] to-white/[0.03] text-white shadow-[0_0_0_1px_rgba(56,189,248,0.08)]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <stage.icon className="h-8 w-8 text-cyan-300" />
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-cyan-200">
                      Live
                    </span>
                  </div>

                  <h3 className="mt-4 text-2xl font-semibold">{stage.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/70">{stage.text}</p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {stage.labels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {index < workflowStages.length - 1 ? (
                <div className="pointer-events-none absolute -right-4 top-1/2 hidden h-px w-8 -translate-y-1/2 bg-gradient-to-r from-cyan-300/30 to-cyan-300 lg:block" />
              ) : null}
            </motion.div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Built for two kinds of companies
            </h2>
            <p className="mt-3 text-white/65">
              Adopt as a full launch stack or as an operational upgrade behind your existing brand.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {companyTypes.map((type, index) => (
              <motion.div
                key={type.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
              >
                <Card className="h-full rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.08] to-white/[0.03] text-white shadow-[0_0_0_1px_rgba(56,189,248,0.08)]">
                  <CardContent className="p-6">
                    <h3 className="text-2xl font-semibold">{type.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/65">{type.text}</p>

                    <ul className="mt-5 space-y-3 text-sm text-white/80">
                      {type.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3">
                          <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Works with your current setup
          </h2>
          <p className="mt-3 text-white/65">
            Domain, deployment, and billing options that fit your existing business stack.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {integrationCards.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <Card className="h-full rounded-2xl border border-white/10 bg-white/5 text-white shadow-none">
                <CardContent className="p-6">
                  <item.icon className="h-7 w-7 text-cyan-300" />
                  <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/70">{item.text}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Software modules</h2>
            <p className="mt-3 text-white/65">
              Productized modules that feel like one integrated operating system, not disconnected tools.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module, index) => (
              <motion.div
                key={module.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Card className="h-full rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-[0_0_0_1px_rgba(56,189,248,0.08)]">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <module.icon className="h-8 w-8 text-cyan-300" />
                      <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/75">
                        Module
                      </span>
                    </div>
                    <h3 className="mt-4 text-xl font-semibold">{module.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/70">{module.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <Card className="relative overflow-hidden rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white shadow-[0_0_0_1px_rgba(56,189,248,0.18)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_80%_65%,rgba(14,165,233,0.12),transparent_40%)]" />
          <CardContent className="p-8 md:p-12">
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">DispatchOS Platform</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
              Launch your dispatch platform
            </h2>
            <p className="mt-4 max-w-2xl text-white/70">
              Keep your current website or launch on a custom subdomain while your operations run
              on DispatchOS.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => router.push("/demo")} className="rounded-xl px-6 py-6 text-base font-semibold">Request Demo</Button>
              <Button onClick={() => router.push("/chargenext/booking")} className="rounded-xl px-6 py-6 text-base font-semibold">Start Platform Build</Button>
              <Button
                onClick={() => router.push("/demo")}
                className="rounded-xl border border-white/20 bg-black/35 px-6 py-6 text-base font-semibold text-white backdrop-blur-md hover:bg-black/50"
              >
                View Product Structure
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}