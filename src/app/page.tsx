"use client";

import { motion } from "framer-motion";
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  Map,
  MessageSquare,
  Smartphone,
  Users,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: LayoutDashboard,
    title: "Dispatcher dashboard",
    text: "Run jobs, assign drivers, monitor activity, and manage operations from one control center.",
  },
  {
    icon: Smartphone,
    title: "Driver mobile web app",
    text: "Give drivers an installable mobile experience for jobs, navigation, status updates, and customer info.",
  },
  {
    icon: Map,
    title: "Live map + table views",
    text: "Switch between a map-first dispatch workflow and structured list views for fast operations.",
  },
  {
    icon: MessageSquare,
    title: "SMS-ready workflows",
    text: "Support customer updates, ETA messaging, and operational notifications through your platform.",
  },
  {
    icon: Wand2,
    title: "Branded booking pages",
    text: "Each company can have a customer-facing request page with its own logo, colors, and service options.",
  },
  {
    icon: CreditCard,
    title: "Subscription billing",
    text: "Automate company signup, subscription payments, and account access through the platform.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "$99/mo",
    text: "For small mobile service companies getting started with dispatch software.",
    bullets: [
      "Dispatcher dashboard",
      "Driver mobile app",
      "Customer tracking page",
      "Branded booking page",
      "Map + table views",
      "Core dispatch workflows",
    ],
  },
  {
    name: "Growth",
    price: "Coming soon",
    text: "For teams that need more automation, reporting, and operational controls.",
    bullets: [
      "Everything in Starter",
      "Advanced workflows",
      "More company controls",
      "Expanded automation",
      "Enhanced reporting",
    ],
  },
  {
    name: "Pro",
    price: "Coming soon",
    text: "For larger operations that want deeper white-labeling and premium platform controls.",
    bullets: [
      "Everything in Growth",
      "Advanced branding",
      "Custom operational options",
      "Priority support",
      "Future premium modules",
    ],
  },
];

export default function Home() {
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
              Dispatch software for mobile service companies
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
              Run drivers, jobs, maps, booking pages, and live operations from one platform.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button className="rounded-xl px-6 py-6 text-base font-semibold">
                Start Platform Build
              </Button>
              <Button
                className="rounded-xl border border-white/20 bg-black/35 px-6 py-6 text-base font-semibold text-white backdrop-blur-md hover:bg-black/50"
              >
                View Product Structure
              </Button>
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
            Core platform bundle
          </h2>
          <p className="mt-3 text-white/65">
            This platform is being built as one software product with multiple interfaces for
            operations, drivers, and customer-facing workflows.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <Card className="h-full rounded-2xl border border-white/10 bg-white/5 text-white shadow-none">
                <CardContent className="p-6">
                  <feature.icon className="h-8 w-8 text-cyan-300" />
                  <h3 className="mt-4 text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/65">{feature.text}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              What each company gets
            </h2>
            <p className="mt-3 text-white/65">
              Every company account will eventually receive a private workspace with operations,
              driver tools, and customer-facing flows.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <Card className="rounded-2xl border border-white/10 bg-slate-900 text-white shadow-none">
              <CardContent className="p-6">
                <LayoutDashboard className="h-8 w-8 text-cyan-300" />
                <h3 className="mt-4 text-xl font-semibold">Dispatcher dashboard</h3>
                <p className="mt-3 text-sm leading-6 text-white/65">
                  The company control center for maps, jobs, dispatching, filters, and operations.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-white/10 bg-slate-900 text-white shadow-none">
              <CardContent className="p-6">
                <Users className="h-8 w-8 text-cyan-300" />
                <h3 className="mt-4 text-xl font-semibold">Driver workspace</h3>
                <p className="mt-3 text-sm leading-6 text-white/65">
                  A mobile-friendly job interface for drivers with status updates, routing, and job details.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-white/10 bg-slate-900 text-white shadow-none">
              <CardContent className="p-6">
                <Building2 className="h-8 w-8 text-cyan-300" />
                <h3 className="mt-4 text-xl font-semibold">Branded booking page</h3>
                <p className="mt-3 text-sm leading-6 text-white/65">
                  A customer-facing page companies can share to accept requests, present services, and support sales.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Pricing direction
          </h2>
          <p className="mt-3 text-white/65">
            Starter launches strong. Higher tiers can expand control, automation, and platform depth later.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <Card className="h-full rounded-2xl border border-white/10 bg-white/5 text-white shadow-none">
                <CardContent className="flex h-full flex-col p-6">
                  <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">{plan.name}</p>
                  <h3 className="mt-4 text-3xl font-semibold">{plan.price}</h3>
                  <p className="mt-4 text-sm leading-6 text-white/65">{plan.text}</p>

                  <ul className="mt-6 space-y-3 text-sm text-white/75">
                    {plan.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3">
                        <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <Button className="w-full rounded-xl py-6 text-base font-semibold">
                      {plan.name === "Starter" ? "Focus Plan" : "Planned Tier"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}