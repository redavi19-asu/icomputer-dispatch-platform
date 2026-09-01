import Link from "next/link";
import {
  ArrowLeft,
  CarFront,
  CreditCard,
  LayoutDashboard,
  Settings2,
  Wand2,
  MessageSquare,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const demoEntries = [
  {
    title: "Company Controls",
    description:
      "Configure company intake, dispatch behavior, service definitions, branding, and operating preferences.",
    detail: "Available after account activation",
    icon: Settings2,
  },
  {
    title: "Billing & Subscription",
    description:
      "Manage the DispatchOS subscription, invoices, company plan, and platform billing settings.",
    detail: "Customer workspace feature",
    icon: CreditCard,
  },
  {
    title: "Driver Operations",
    description:
      "Manage the driver roster, invitations, assignment status, active missions, and field workflow.",
    detail: "Mobile-ready driver experience",
    icon: CarFront,
  },
  {
    title: "Booking Engine",
    description:
      "Give customers a branded booking flow with service selection, location details, and request submission.",
    detail: "Company-branded booking surface",
    icon: Wand2,
  },
  {
    title: "Dispatch Command",
    description:
      "Run map-first dispatch operations with job queues, assignments, driver status, and active service management.",
    detail: "Dispatcher desktop experience",
    icon: LayoutDashboard,
  },
  {
    title: "Customer Updates",
    description:
      "Keep customers informed as a request moves from intake through assignment, travel, and completion.",
    detail: "Connected customer workflow",
    icon: MessageSquare,
  },
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_82%_65%,rgba(59,130,246,0.16),transparent_38%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-24">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100">
            <ArrowLeft className="h-4 w-4" />
            Back to DispatchOS
          </Link>
          <p className="mt-10 text-xs uppercase tracking-[0.25em] text-cyan-300">DispatchOS Product Tour</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
            See what the platform includes without entering a customer workspace
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-white/70 md:text-lg">
            This public tour explains the DispatchOS modules. Operational dashboards, driver tools,
            company settings, booking controls, and billing are activated for customers after signup.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-12 md:grid-cols-2 xl:grid-cols-3 md:py-16">
        {demoEntries.map((entry) => (
          <Card
            key={entry.title}
            className="h-full rounded-3xl border border-white/10 bg-white/5 text-white shadow-none"
          >
            <CardContent className="flex h-full flex-col p-6">
              <entry.icon className="h-8 w-8 text-cyan-300" />
              <h2 className="mt-5 text-2xl font-semibold">{entry.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-6 text-white/70">{entry.description}</p>
              <div className="mt-6 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/55">
                {entry.detail}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="rounded-3xl border border-cyan-400/25 bg-cyan-500/10 p-8 text-center">
          <p className="text-sm uppercase tracking-[0.22em] text-cyan-300">Ready for your company?</p>
          <h2 className="mt-3 text-3xl font-semibold">Choose a plan and activate your workspace.</h2>
          <Link
            href="/subscribe"
            className="mt-7 inline-flex rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            View Plans
          </Link>
        </div>
      </section>
    </main>
  );
}
