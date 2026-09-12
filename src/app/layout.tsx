import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/platform/service-worker-register";
import { TenantStorageIsolation } from "@/components/platform/tenant-storage-isolation";
import { TenantOperationsSyncV2 } from "@/components/platform/tenant-operations-sync-v2";
import { TenantSettingsCloudSync } from "@/components/platform/tenant-settings-cloud-sync";
import { SecureDriverInviteGuard } from "@/components/platform/secure-driver-invite-guard";
import { OperationalTenantGuard } from "@/components/platform/operational-tenant-guard";
import { LegalConsent } from "@/components/platform/legal-consent";
import { DriverScanLauncher } from "@/components/driver/driver-scan-launcher";
import { DriverCompletionRequirementsGuard } from "@/components/driver/driver-completion-requirements-guard";
import { DriverReturnToBasePrompt } from "@/components/driver/driver-return-to-base-prompt";
import { CourierNextStopLauncher } from "@/components/driver/courier-next-stop-launcher";
import { CourierDriverLoadLauncher } from "@/components/driver/courier-driver-load-launcher";
import { CourierConsoleLauncher } from "@/components/platform/courier-console-launcher";

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
  title: "Urban Courier OS | Business • Driver • Customer Logistics Software",
  description:
    "Urban Courier OS connects dispatchers, drivers, packages, routes and customers in one scan-to-route-to-deliver logistics workflow.",
  applicationName: "Urban Courier OS",
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
        <OperationalTenantGuard />
        <TenantSettingsCloudSync />
        <TenantOperationsSyncV2 />
        <SecureDriverInviteGuard />
        <ServiceWorkerRegister />
        {children}
        <DriverScanLauncher />
        <DriverCompletionRequirementsGuard />
        <DriverReturnToBasePrompt />
        <CourierDriverLoadLauncher />
        <CourierNextStopLauncher />
        <CourierConsoleLauncher />
        <LegalConsent />
      </body>
    </html>
  );
}
