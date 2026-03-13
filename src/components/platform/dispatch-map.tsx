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

    const routeCoordinates: [number, number][] = [
      [-77.0705, 38.9008],
      [-77.0652, 38.8992],
      [-77.0601, 38.8973],
      [-77.0553, 38.8954],
      [-77.0508, 38.8934],
      [-77.0461, 38.8917],
      [-77.0418, 38.8899],
      [-77.0374, 38.8882],
      [-77.0333, 38.8868],
      [-77.0291, 38.8852],
    ];

    const driverPopup = new mapboxgl.Popup({ offset: 18 }).setHTML(`
      <div style="color:#0f172a;font-weight:600;">Driver A</div>
      <div style="color:#475569;font-size:12px;">En Route • Live dispatch</div>
    `);

    const jobPopup = new mapboxgl.Popup({ offset: 18 }).setHTML(`
      <div style="color:#0f172a;font-weight:600;">Open Job</div>
      <div style="color:#475569;font-size:12px;">Awaiting service • ${companyName}</div>
    `);

    let routeIndex = 0;

    const driverMarker = new mapboxgl.Marker({
      color: "#22d3ee",
      scale: 1.15,
    })
      .setLngLat(routeCoordinates[routeIndex])
      .setPopup(driverPopup)
      .addTo(map);

    new mapboxgl.Marker({
      color: "#fbbf24",
      scale: 1.15,
    })
      .setLngLat(routeCoordinates[routeCoordinates.length - 1])
      .setPopup(jobPopup)
      .addTo(map);

    let intervalId: number | undefined;

    map.on("load", () => {
      map.addSource("dispatch-route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: routeCoordinates,
          },
        },
      });

      map.addLayer({
        id: "dispatch-route-line",
        type: "line",
        source: "dispatch-route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#22d3ee",
          "line-width": 5,
          "line-opacity": 0.9,
        },
      });

      const bounds = new mapboxgl.LngLatBounds();
      routeCoordinates.forEach((coord) => bounds.extend(coord));
      map.fitBounds(bounds, { padding: 70, duration: 0 });

      intervalId = window.setInterval(() => {
        routeIndex += 1;

        if (routeIndex >= routeCoordinates.length) {
          routeIndex = 0;
        }

        driverMarker.setLngLat(routeCoordinates[routeIndex]);
      }, 1200);
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
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
