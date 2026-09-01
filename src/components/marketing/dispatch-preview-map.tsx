"use client";

import "leaflet/dist/leaflet.css";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const MapContainer: any = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer: any = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const CircleMarker: any = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Polyline: any = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);

const center: [number, number] = [38.9818, -77.0456];
const route: Array<[number, number]> = [
  [39.0336, -77.0478],
  [39.0218, -77.0422],
  [39.0104, -77.0357],
  [38.9968, -77.0415],
  [38.9818, -77.0456],
];

export default function DispatchPreviewMap() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-full w-full animate-pulse bg-slate-900" />;
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl">
      <MapContainer
        center={center}
        zoom={11}
        zoomControl={false}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={route} pathOptions={{ color: "#06b6d4", weight: 5, opacity: 0.9 }} />
        <CircleMarker center={route[0]} radius={8} pathOptions={{ color: "#ffffff", fillColor: "#06b6d4", fillOpacity: 1, weight: 3 }} />
        <CircleMarker center={route[route.length - 1]} radius={8} pathOptions={{ color: "#ffffff", fillColor: "#f59e0b", fillOpacity: 1, weight: 3 }} />
      </MapContainer>

      <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75 backdrop-blur">
        Live route preview
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 z-[500] rounded-lg border border-emerald-400/20 bg-slate-950/85 px-3 py-2 text-xs text-emerald-200 backdrop-blur">
        Driver en route • 14 min
      </div>
      <div className="pointer-events-none absolute bottom-2 left-3 z-[500] text-[9px] text-slate-700/70">
        © OpenStreetMap contributors
      </div>
    </div>
  );
}
