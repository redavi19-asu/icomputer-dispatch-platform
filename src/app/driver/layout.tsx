import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { CircleDollarSign } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { DriverAppShell } from "@/components/driver/driver-app-shell";
import { DriverPayRecorder } from "@/components/driver/driver-pay-recorder";

export const metadata: Metadata = {
  title: "DispatchOS Driver",
  description: "Mobile-first driver mission app for DispatchOS.",
  applicationName: "DispatchOS Driver",
  manifest: "/driver.webmanifest",
  appleWebApp: {
    capable: true,
    title: "DispatchOS Driver",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#020617",
  colorScheme: "dark",
};

export default function DriverLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute requireActiveSubscription>
      <DriverAppShell>
        <DriverPayRecorder />
        {children}
        <Link
          href="/driver/earnings"
          aria-label="Open my driver earnings"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+18px)] right-4 z-[70] inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-slate-950/95 px-3.5 py-2.5 text-xs font-semibold text-emerald-100 shadow-[0_10px_30px_rgba(16,185,129,.22)] backdrop-blur transition hover:border-emerald-300/55 hover:bg-emerald-500/15 sm:right-6"
        >
          <CircleDollarSign className="h-4 w-4 text-emerald-300" />
          Earnings
        </Link>
      </DriverAppShell>
    </ProtectedRoute>
  );
}
