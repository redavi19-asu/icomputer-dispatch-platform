"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { Driver } from "@/lib/platform/types";

type DispatchMapProps = {
  companyName?: string;
  themeMode?: "dark" | "light";
  drivers?: Driver[];
};

const zoneToCoordinate = (zone: string | undefined, index: number): [number, number] => {
  const normalized = (zone ?? "").toLowerCase();

  if (normalized.includes("north")) return [38.9049, -77.0588];
  if (normalized.includes("central")) return [38.8965, -77.0441];
  if (normalized.includes("south")) return [38.888, -77.0317];
  if (normalized.includes("east")) return [38.8938, -77.0215];
  if (normalized.includes("west")) return [38.8929, -77.066];

  const fallbackOffsets: Array<[number, number]> = [
    [38.9049, -77.0588],
    [38.8965, -77.0441],
    [38.888, -77.0317],
    [38.901, -77.0224],
    [38.8858, -77.0522],
  ];

  return fallbackOffsets[index % fallbackOffsets.length];
};

export function DispatchMap({
  companyName = "Company",
  themeMode = "dark",
  drivers = [],
}: DispatchMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let cancelled = false;
    let resizeTimerOne: ReturnType<typeof setTimeout> | undefined;
    let resizeTimerTwo: ReturnType<typeof setTimeout> | undefined;

    const setupMap = async () => {
      const L = await import("leaflet");
      if (cancelled || !mapContainerRef.current || mapRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [38.892, -77.045],
        zoom: 11.8,
        zoomControl: true,
        attributionControl: true,
      });

      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const driverCoordinates =
        drivers.length > 0
          ? drivers.map((driver, index) => ({
              driver,
              coordinate: zoneToCoordinate(driver.zone, index),
            }))
          : [
              {
                driver: { name: "Driver 1", status: "available", zone: "North Zone" } as Driver,
                coordinate: [38.9049, -77.0588] as [number, number],
              },
              {
                driver: { name: "Driver 2", status: "en-route", zone: "Central Zone" } as Driver,
                coordinate: [38.8965, -77.0441] as [number, number],
              },
              {
                driver: { name: "Driver 3", status: "busy", zone: "South Zone" } as Driver,
                coordinate: [38.888, -77.0317] as [number, number],
              },
            ];

      const jobCoordinates: [number, number][] = [
        [38.9003, -77.0522],
        [38.8923, -77.036],
      ];

      L.circleMarker([38.892, -77.045], {
        radius: 9,
        color: "#0891b2",
        fillColor: "#06b6d4",
        fillOpacity: 1,
        weight: 2,
      })
        .bindPopup(`<strong>Dispatch Center</strong><br/><span>${companyName} operations</span>`)
        .addTo(map);

      driverCoordinates.forEach(({ driver, coordinate }) => {
        L.circleMarker(coordinate, {
          radius: 8,
          color: "#0891b2",
          fillColor: "#22d3ee",
          fillOpacity: 1,
          weight: 2,
        })
          .bindPopup(
            `<strong>${driver.name}</strong><br/><span>${driver.status} • ${driver.zone ?? "Service zone"}</span>`
          )
          .addTo(map);
      });

      jobCoordinates.forEach((coordinate, index) => {
        L.circleMarker(coordinate, {
          radius: 8,
          color: "#d97706",
          fillColor: "#f59e0b",
          fillOpacity: 1,
          weight: 2,
        })
          .bindPopup(
            `<strong>Open Job ${index + 1}</strong><br/><span>Awaiting dispatch • ${companyName}</span>`
          )
          .addTo(map);
      });

      const bounds = L.latLngBounds([
        [38.892, -77.045],
        ...driverCoordinates.map(({ coordinate }) => coordinate),
        ...jobCoordinates,
      ]);

      map.fitBounds(bounds, {
        padding: [42, 42],
        maxZoom: 13,
        animate: false,
      });

      const resizeMap = () => map.invalidateSize({ animate: false });
      resizeTimerOne = setTimeout(resizeMap, 120);
      resizeTimerTwo = setTimeout(resizeMap, 500);
      window.addEventListener("resize", resizeMap);
      window.addEventListener("orientationchange", resizeMap);

      map.once("unload", () => {
        window.removeEventListener("resize", resizeMap);
        window.removeEventListener("orientationchange", resizeMap);
      });
    };

    void setupMap();

    return () => {
      cancelled = true;
      if (resizeTimerOne) clearTimeout(resizeTimerOne);
      if (resizeTimerTwo) clearTimeout(resizeTimerTwo);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [companyName, drivers]);

  return (
    <div
      className={`relative h-[460px] w-full overflow-hidden md:h-[620px] ${
        themeMode === "light" ? "bg-slate-100" : "bg-slate-950"
      }`}
    >
      <div ref={mapContainerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-4 top-4 z-[500] rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white/80 backdrop-blur">
        Live dispatch map · OpenStreetMap
      </div>
    </div>
  );
}
