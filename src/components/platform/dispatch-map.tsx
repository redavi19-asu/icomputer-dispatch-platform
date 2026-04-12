"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { Driver } from "@/lib/platform/types";

type DispatchMapProps = {
  companyName?: string;
  themeMode?: "dark" | "light";
  drivers?: Driver[];
};

const zoneToCoordinate = (zone: string | undefined, index: number): [number, number] => {
  const normalized = (zone ?? "").toLowerCase();

  if (normalized.includes("north")) return [-77.0588, 38.9049];
  if (normalized.includes("central")) return [-77.0441, 38.8965];
  if (normalized.includes("south")) return [-77.0317, 38.888];
  if (normalized.includes("east")) return [-77.0215, 38.8938];
  if (normalized.includes("west")) return [-77.066, 38.8929];

  const fallbackOffsets: Array<[number, number]> = [
    [-77.0588, 38.9049],
    [-77.0441, 38.8965],
    [-77.0317, 38.888],
    [-77.0224, 38.901],
    [-77.0522, 38.8858],
  ];

  return fallbackOffsets[index % fallbackOffsets.length];
};

export function DispatchMap({
  companyName = "Company",
  themeMode = "dark",
  drivers = [],
}: DispatchMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const hasPublicMapboxToken = Boolean(
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim().startsWith("pk.")
  );

  useEffect(() => {
    // Mapbox GL JS runs in the browser and must use a publishable token (pk.*).
    // Never pass secret tokens (sk.*) through NEXT_PUBLIC_ variables.
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();

    if (token?.startsWith("sk.")) {
      if (process.env.NODE_ENV !== "production") {
        console.error(
          "Invalid Mapbox token exposure: NEXT_PUBLIC_MAPBOX_TOKEN must be a publishable pk.* token, not sk.*."
        );
      }
      return;
    }

    const hasValidPublicToken = Boolean(token?.startsWith("pk."));

    if (!hasValidPublicToken) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "Mapbox map disabled: set NEXT_PUBLIC_MAPBOX_TOKEN to a valid publishable pk.* token."
        );
      }
      return;
    }

    if (!mapContainerRef.current || mapRef.current) {
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

    const driverCoordinates =
      drivers.length > 0
        ? drivers.map((driver, index) => ({
            driver,
            coordinate: zoneToCoordinate(driver.zone, index),
          }))
        : [
            {
              driver: { name: "Driver 1", status: "available", zone: "North Zone" } as Driver,
              coordinate: [-77.0588, 38.9049] as [number, number],
            },
            {
              driver: { name: "Driver 2", status: "en-route", zone: "Central Zone" } as Driver,
              coordinate: [-77.0441, 38.8965] as [number, number],
            },
            {
              driver: { name: "Driver 3", status: "busy", zone: "South Zone" } as Driver,
              coordinate: [-77.0317, 38.888] as [number, number],
            },
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
      driverCoordinates.forEach(({ driver, coordinate }) => {
        const driverPopup = new mapboxgl.Popup({ offset: 18 }).setHTML(`
          <div style="color:#0f172a;font-weight:600;">${driver.name}</div>
          <div style="color:#475569;font-size:12px;">${driver.status} • ${driver.zone ?? "Service zone"}</div>
        `);

        new mapboxgl.Marker({ color: "#22d3ee", scale: 1.05 })
          .setLngLat(coordinate)
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
      driverCoordinates.forEach(({ coordinate }) => bounds.extend(coordinate));
      jobCoordinates.forEach((coord) => bounds.extend(coord));
      bounds.extend([-77.045, 38.892]);
      map.fitBounds(bounds, { padding: 70, duration: 0 });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [companyName, themeMode, drivers]);

  return (
    <div className="relative h-[620px] w-full overflow-hidden bg-slate-950">
      {hasPublicMapboxToken ? (
        <div ref={mapContainerRef} className="h-full w-full" />
      ) : (
        <iframe
          title={`${companyName} dispatch map fallback`}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src="https://www.openstreetmap.org/export/embed.html?bbox=-77.12%2C38.84%2C-76.97%2C38.95&layer=mapnik"
        />
      )}
      <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white/80 backdrop-blur">
        Live dispatch map
      </div>
    </div>
  );
}
