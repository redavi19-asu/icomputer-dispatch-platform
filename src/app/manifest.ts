import type { MetadataRoute } from "next";
import { URBAN_CARRIER_ICON_DATA_URI } from "@/lib/urban-carrier-brand";

export const dynamic = "force-static";
export const revalidate = false;

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "./driver",
    name: "Urban Carrier OS Driver",
    short_name: "Carrier Driver",
    description: "Installable Urban Carrier OS driver mission app for mobile operations.",
    start_url: "./driver",
    scope: "./driver",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#061a33",
    theme_color: "#061a33",
    orientation: "portrait",
    prefer_related_applications: false,
    categories: ["business", "productivity", "navigation"],
    icons: [
      {
        src: URBAN_CARRIER_ICON_DATA_URI,
        sizes: "256x256",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: URBAN_CARRIER_ICON_DATA_URI,
        sizes: "256x256",
        type: "image/jpeg",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Open Driver Missions",
        short_name: "Missions",
        description: "Launch the active driver mission screen",
        url: "./driver",
      },
      {
        name: "Open Driver Queue",
        short_name: "Queue",
        description: "Open driver app queue view",
        url: "./driver?view=queue",
      },
    ],
  };
}
