import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { CircleDollarSign } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { DriverAppShell } from "@/components/driver/driver-app-shell";
import { DriverPayRecorder } from "@/components/driver/driver-pay-recorder";

export const metadata: Metadata = {
  title: "Urban Carrier OS Driver",
  description: "Mobile-first driver mission app for Urban Carrier OS.",
  applicationName: "Urban Carrier OS Driver",
  manifest: process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform/driver.webmanifest" : "/driver.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Urban Carrier OS Driver",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a4a91",
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
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+18px)] right-4 z-[70] inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-[#08274f]/95 px-3.5 py-2.5 text-xs font-semibold text-orange-100 shadow-[0_10px_30px_rgba(249,115,22,.18)] backdrop-blur transition hover:border-orange-300/55 hover:bg-orange-500/15 sm:right-6"
        >
          <CircleDollarSign className="h-4 w-4 text-orange-300" />
          Earnings
        </Link>
      </DriverAppShell>
    </ProtectedRoute>
  );
}
