"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

type DispatchMapProps = {
  companyName?: string;
  themeMode?: "dark" | "light";
};

export function DispatchMap({
  companyName = "Company",
  themeMode = "dark",
}: DispatchMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!token || !mapContainerRef.current || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style:
        themeMode === "light"
          ? "mapbox://styles/mapbox/light-v11"
          : "mapbox://styles/mapbox/dark-v11",
      center: [-77.045, 38.892],
      zoom: 11.8,
      attributionControl: false,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    const driverCoordinates: [number, number][] = [
      [-77.0588, 38.9049],
      [-77.0441, 38.8965],
      [-77.0317, 38.888],
    ];

    const jobCoordinates: [number, number][] = [
      [-77.0522, 38.9003],
      [-77.036, 38.8923],
    ];

    const dispatchCenter = new mapboxgl.Popup({ offset: 18 }).setHTML(`
      <div style="color:#0f172a;font-weight:600;">Dispatch Center</div>
      <div style="color:#475569;font-size:12px;">${companyName} operations</div>
    `);

    new mapboxgl.Marker({ color: "#06b6d4", scale: 1.1 })
      .setLngLat([-77.045, 38.892])
      .setPopup(dispatchCenter)
      .addTo(map);

    map.on("load", () => {
      driverCoordinates.forEach((coord, index) => {
        const driverPopup = new mapboxgl.Popup({ offset: 18 }).setHTML(`
          <div style="color:#0f172a;font-weight:600;">Driver ${index + 1}</div>
          <div style="color:#475569;font-size:12px;">Active in service zone</div>
        `);

        new mapboxgl.Marker({ color: "#22d3ee", scale: 1.05 })
          .setLngLat(coord)
          .setPopup(driverPopup)
          .addTo(map);
      });

      jobCoordinates.forEach((coord, index) => {
        const jobPopup = new mapboxgl.Popup({ offset: 18 }).setHTML(`
          <div style="color:#0f172a;font-weight:600;">Open Job ${index + 1}</div>
          <div style="color:#475569;font-size:12px;">Awaiting dispatch • ${companyName}</div>
        `);

        new mapboxgl.Marker({ color: "#f59e0b", scale: 1.1 })
          .setLngLat(coord)
          .setPopup(jobPopup)
          .addTo(map);
      });

      const bounds = new mapboxgl.LngLatBounds();
      driverCoordinates.forEach((coord) => bounds.extend(coord));
      jobCoordinates.forEach((coord) => bounds.extend(coord));
      bounds.extend([-77.045, 38.892]);
      map.fitBounds(bounds, { padding: 70, duration: 0 });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [companyName, themeMode]);

  return (
    <div className="relative h-[620px] w-full overflow-hidden bg-slate-950">
      <div ref={mapContainerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white/80 backdrop-blur">
        Live dispatch map
      </div>
    </div>
  );
}
