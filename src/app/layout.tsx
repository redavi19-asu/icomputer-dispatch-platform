import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/platform/service-worker-register";
import { TenantStorageIsolation } from "@/components/platform/tenant-storage-isolation";
import { TenantOperationsSyncV2 } from "@/components/platform/tenant-operations-sync-v2";
import { SecureDriverInviteGuard } from "@/components/platform/secure-driver-invite-guard";
import { LegalConsent } from "@/components/platform/legal-consent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "DispatchOS | Business • Driver • Customer Logistics Software",
  description: "DispatchOS connects businesses, drivers and field teams, and customers in one logistics workflow from request and assignment through completion.",
  applicationName: "DispatchOS",
  icons: {
    icon: [{ url: "/driver-app-icon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/driver-app-icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} bg-white text-slate-900 antialiased`}
      >
        <TenantStorageIsolation />
        <TenantOperationsSyncV2 />
        <SecureDriverInviteGuard />
        <ServiceWorkerRegister />
        {children}
        <LegalConsent />
      </body>
    </html>
  );
}
