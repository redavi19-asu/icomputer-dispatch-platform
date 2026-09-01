import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "DispatchOS Dispatcher",
  description: "Desktop dispatch dashboard for DispatchOS operations.",
  applicationName: "DispatchOS Dispatcher",
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
  return children;
}
