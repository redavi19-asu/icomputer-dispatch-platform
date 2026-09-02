import type { Metadata, Viewport } from "next";
import ProtectedRoute from "@/components/auth/protected-route";
import { DriverAppShell } from "@/components/driver/driver-app-shell";

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
      <DriverAppShell>{children}</DriverAppShell>
    </ProtectedRoute>
  );
}
