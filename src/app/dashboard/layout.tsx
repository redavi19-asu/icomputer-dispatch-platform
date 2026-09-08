import type { Metadata, Viewport } from "next";
import ProtectedRoute from "@/components/auth/protected-route";

export const metadata: Metadata = {
  title: "Urban Carrier OS Dispatcher",
  description: "Desktop dispatch dashboard for Urban Carrier OS operations.",
  applicationName: "Urban Carrier OS Dispatcher",
  manifest: "/dispatch.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#020617",
  colorScheme: "dark",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ProtectedRoute requireActiveSubscription>{children}</ProtectedRoute>;
}
