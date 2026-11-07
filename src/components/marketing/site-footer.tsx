"use client";

import Link from "next/link";
import { UrbanCarrierMark } from "@/components/branding/urban-carrier-mark";
import { openCarrierLegalPanel } from "@/components/platform/legal-consent";

const groups = [
  { title: "Platform", links: [["Features", "/#features"], ["Dispatch", "/#operations"], ["Driver & desktop apps", "/download"], ["Plans & pricing", "/plans"]] },
  { title: "Developers", links: [["Developer guide", "/developers"], ["API keys & webhooks", "/workspace/integrations"], ["Integration options", "/developers#integrations"]] },
  { title: "Your account", links: [["Customer login", "/auth?mode=login"], ["Company workspace", "/workspace"], ["Billing", "/billing"], ["Product tour", "/demo"]] },
];

export function SiteFooter() {
  return <footer className="border-t border-white/10 bg-[#041326] text-sky-100/70">
    <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
      <div className="space-y-4">
        <UrbanCarrierMark href="/" size="sm" showText />
        <p className="max-w-sm text-sm leading-6">One connected workspace for your business, dispatchers, drivers, and customers.</p>
        <a href="https://icomputeranything.com/" className="block text-sm font-semibold text-white hover:text-orange-200">Built by I Computer Anything ↗</a>
        <a href="mailto:ryanedavis@gmail.com?subject=Urban%20Carrier%20OS%20Support" className="inline-block text-sm text-sky-200 underline underline-offset-4">Contact support</a>
      </div>
      {groups.map(group => <nav key={group.title} aria-label={`Footer ${group.title}`}>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-white">{group.title}</h2>
        <ul className="space-y-3 text-sm">{group.links.map(([label, href]) => <li key={label}><Link href={href} className="inline-block py-1 hover:text-white hover:underline underline-offset-4">{label}</Link></li>)}</ul>
      </nav>)}
    </div>
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 border-t border-white/10 px-6 py-6 text-xs">
      <p>© {new Date().getFullYear()} I Computer Anything · Urban Carrier OS</p>
      <nav aria-label="Footer legal and cookie settings" className="flex flex-wrap gap-5">
        <button type="button" onClick={() => openCarrierLegalPanel("privacy")} className="py-2 hover:text-white underline underline-offset-4">Privacy</button>
        <button type="button" onClick={() => openCarrierLegalPanel("terms")} className="py-2 hover:text-white underline underline-offset-4">Terms</button>
        <button type="button" onClick={() => openCarrierLegalPanel("cookies")} className="py-2 hover:text-white underline underline-offset-4">Cookie settings</button>
      </nav>
      <p className="w-full leading-6 text-sky-100/50">Map data © <a href="https://www.openstreetmap.org/copyright" className="underline">OpenStreetMap contributors</a>. 3D assets by <a href="https://kenney.nl/assets" className="underline">Kenney</a> (CC0).</p>
    </div>
  </footer>;
}
