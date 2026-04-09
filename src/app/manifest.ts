import type { MetadataRoute } from "next";

export const dynamic = "force-static";
export const revalidate = false;

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/driver",
    name: "DispatchOS Driver",
    short_name: "DriverOS",
    description: "Installable DispatchOS driver mission app for mobile operations.",
    start_url: "/driver",
    scope: "/driver",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#020617",
    theme_color: "#020617",
    orientation: "portrait",
    prefer_related_applications: false,
    categories: ["business", "productivity", "navigation"],
    icons: [
      {
        src: "/driver-app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/driver-app-icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Open Driver Missions",
        short_name: "Missions",
        description: "Launch the active driver mission screen",
        url: "/driver",
      },
      {
        name: "Open Driver Queue",
        short_name: "Queue",
        description: "Open driver app queue view",
        url: "/driver?view=queue",
      },
    ],
  };
}
