import type { Metadata, Viewport } from "next";
import ProtectedRoute from "@/components/auth/protected-route";

export const metadata: Metadata = {
  title: "Urban Carrier OS Dispatcher",
  description: "Desktop dispatch dashboard for Urban Carrier OS operations.",
  applicationName: "Urban Carrier OS Dispatcher",
  manifest: process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform/dispatch.webmanifest" : "/dispatch.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a4a91",
  colorScheme: "dark",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ProtectedRoute requireActiveSubscription>{children}</ProtectedRoute>;
}
