import type { Metadata, Viewport } from "next";

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
  return children;
}
