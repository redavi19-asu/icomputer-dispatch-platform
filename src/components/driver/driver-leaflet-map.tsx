"use client";

import "leaflet/dist/leaflet.css";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

type DriverLeafletMapProps = {
  customerName?: string;
  addressLabel?: string;
  missionAddress?: string | null;
  onRouteSummaryChange?: (distanceMiles: number | null) => void;
  onRouteDataChange?: (routeData: RouteData | null) => void;
  navigationActive?: boolean;
  directionsActive?: boolean;
  missionStatus?: string | null;
};

export type RouteStep = {
  instruction: string;
  distanceMiles: number;
};

export type RouteData = {
  distanceMiles: number;
  durationMinutes: number;
  nextInstruction: string;
  steps: RouteStep[];
  offRoute?: boolean;
};

type InternalRouteStep = RouteStep & {
  maneuverPosition: [number, number] | null;
};

const MapContainer: any = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer: any = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker: any = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const Popup: any = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

const Polyline: any = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);

const FALLBACK_DRIVER_POSITION: [number, number] = [39.0336, -77.0478];
const DEFAULT_LOCAL_REGION_SUFFIX = "Silver Spring, MD";
const REGION_VIEWBOX = "-79.8,40.2,-75.0,36.5";
const MAX_REASONABLE_DISTANCE_KM = 120;
const KM_TO_MILES = 0.621371;
const METERS_TO_MILES = 0.000621371;
const OFF_ROUTE_THRESHOLD_MILES = 0.08;
const MANEUVER_REACHED_THRESHOLD_MILES = 0.03;

const isVagueAddress = (value: string) => {
  const trimmed = value.trim();
  const hasStateHint = /\b(MD|DC|VA|Maryland|Virginia|District of Columbia|Washington,?\s*DC)\b/i.test(
    trimmed
  );
  const hasZip = /\b\d{5}(?:-\d{4})?\b/.test(trimmed);
  const tokenCount = trimmed.split(/\s+/).filter(Boolean).length;

  return !hasStateHint && !hasZip && tokenCount <= 4;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const haversineDistanceKm = (
  from: [number, number],
  to: [number, number]
) => {
  const [lat1, lon1] = from;
  const [lat2, lon2] = to;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return 6371 * c;
};

const formatManeuverInstruction = (step: any) => {
  const maneuverType = step?.maneuver?.type ?? "continue";
  const modifier = step?.maneuver?.modifier;
  const streetName = step?.name ? ` onto ${step.name}` : "";

  if (maneuverType === "arrive") return "Arrive at destination";
  if (maneuverType === "depart") return `Depart${streetName}`.trim();
  if (maneuverType === "turn") {
    const turnDirection = modifier ? ` ${modifier}` : "";
    return `Turn${turnDirection}${streetName}`.trim();
  }
  if (maneuverType === "roundabout") return `Enter roundabout${streetName}`.trim();
  return `Continue${streetName}`.trim();
};

export function DriverLeafletMap({
  customerName = "Customer",
  addressLabel = "Job location",
  missionAddress,
  onRouteSummaryChange,
  onRouteDataChange,
  navigationActive = false,
  directionsActive = false,
  missionStatus,
}: DriverLeafletMapProps) {
  const mapRef = useRef<any>(null);
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [leaflet, setLeaflet] = useState<any>(null);
  const [driverIcon, setDriverIcon] = useState<any>(null);
  const [jobIcon, setJobIcon] = useState<any>(null);
  const [driverPosition, setDriverPosition] = useState<[number, number] | null>(null);
  const [destinationPosition, setDestinationPosition] = useState<[number, number] | null>(
    null
  );
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const [routePath, setRoutePath] = useState<Array<[number, number]> | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeDistanceMiles, setRouteDistanceMiles] = useState<number | null>(null);
  const [routeDurationMinutes, setRouteDurationMinutes] = useState<number | null>(null);
  const [routeStepsDetailed, setRouteStepsDetailed] = useState<InternalRouteStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const lastRouteKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const invalidateMapSize = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const container =
      typeof map.getContainer === "function" ? map.getContainer() : map._container;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;

    if (resizeFrameRef.current != null) {
      window.cancelAnimationFrame(resizeFrameRef.current);
    }

    resizeFrameRef.current = window.requestAnimationFrame(() => {
      if (!mapRef.current) return;
      mapRef.current.invalidateSize(false);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (resizeFrameRef.current != null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
      }
      const map = mapRef.current;
      if (map) {
        try {
          const container =
            typeof map.getContainer === "function" ? map.getContainer() : map._container;
          if (typeof map.off === "function") {
            map.off();
          }
          if (typeof map.remove === "function") {
            map.remove();
          }
          if (container && "_leaflet_id" in container) {
            delete container._leaflet_id;
          }
        } catch {
          // no-op: defensive cleanup for HMR/StrictMode remount paths
        }
      }
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isMapReady || typeof window === "undefined") return;

    const map = mapRef.current;
    if (!map) return;

    const container =
      typeof map.getContainer === "function" ? map.getContainer() : map._container;
    if (!container) return;

    const handleResize = () => {
      invalidateMapSize();
    };

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(handleResize) : null;
    observer?.observe(container);
    if (mapHostRef.current) {
      observer?.observe(mapHostRef.current);
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [isMapReady, invalidateMapSize]);

  useEffect(() => {
    if (!isMapReady || typeof window === "undefined") return;

    const timeoutId = window.setTimeout(() => {
      invalidateMapSize();
    }, 80);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isMapReady, missionStatus, navigationActive, directionsActive, invalidateMapSize]);

  useEffect(() => {
    let mounted = true;

    import("leaflet").then((L) => {
      if (!mounted) return;

      setLeaflet(L);

      setDriverIcon(
        L.divIcon({
          html: `<div style="background:#06b6d4;width:18px;height:18px;border-radius:9999px;border:3px solid white;box-shadow:0 0 0 4px rgba(6,182,212,0.18);"></div>`,
          className: "",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        })
      );

      setJobIcon(
        L.divIcon({
          html: `<div style="background:#f59e0b;width:18px;height:18px;border-radius:9999px;border:3px solid white;box-shadow:0 0 0 4px rgba(245,158,11,0.18);"></div>`,
          className: "",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        })
      );
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setDriverPosition(FALLBACK_DRIVER_POSITION);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setDriverPosition([position.coords.latitude, position.coords.longitude]);
      },
      () => {
        setDriverPosition(FALLBACK_DRIVER_POSITION);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const geocodeQuery = async (query: string): Promise<[number, number] | null> => {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&bounded=1&viewbox=${encodeURIComponent(
          REGION_VIEWBOX
        )}&q=${encodeURIComponent(query)}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Geocoding failed");
      }

      const results = await response.json();
      const topResult = results?.[0];

      if (!topResult?.lat || !topResult?.lon) {
        return null;
      }

      return [Number(topResult.lat), Number(topResult.lon)];
    };

    const geocodeMission = async () => {
      if (!missionAddress?.trim()) {
        setDestinationPosition(null);
        setDestinationError(null);
        return;
      }

      try {
        const trimmed = missionAddress.trim();
        const queryCandidates = [trimmed];

        if (isVagueAddress(trimmed)) {
          queryCandidates.push(`${trimmed}, ${DEFAULT_LOCAL_REGION_SUFFIX}`);
        }

        let resolvedDestination: [number, number] | null = null;

        for (const query of queryCandidates) {
          const result = await geocodeQuery(query);
          if (result) {
            resolvedDestination = result;
            break;
          }
        }

        if (!resolvedDestination) {
          throw new Error("No geocode match");
        }

        const originForValidation = driverPosition ?? FALLBACK_DRIVER_POSITION;
        const distanceKm = haversineDistanceKm(originForValidation, resolvedDestination);

        if (distanceKm > MAX_REASONABLE_DISTANCE_KM) {
          if (!cancelled) {
            setDestinationPosition(null);
            setDestinationError("Destination could not be verified");
          }
          return;
        }

        if (!cancelled) {
          setDestinationPosition(resolvedDestination);
          setDestinationError(null);
        }
      } catch {
        if (!cancelled) {
          setDestinationPosition(null);
          setDestinationError("Please enter a more complete address");
        }
      }
    };

    geocodeMission();

    return () => {
      cancelled = true;
    };
  }, [missionAddress]);

  const resolvedDriverPosition = driverPosition ?? FALLBACK_DRIVER_POSITION;
  const hasVerifiedDestination = Boolean(destinationPosition);
  const resolvedDestinationPosition = destinationPosition;
  const isAssignedState = missionStatus === "Assigned";
  const isAcceptedState = missionStatus === "Accepted";
  const shouldFollowNavigation = navigationActive || directionsActive;
  const shouldShowMissionRoute =
    (isAcceptedState || navigationActive) &&
    Boolean(resolvedDestinationPosition) &&
    !isAssignedState;

  useEffect(() => {
    if (!onRouteDataChange) return;

    if (!shouldShowMissionRoute || !resolvedDestinationPosition) {
      onRouteDataChange(null);
    }
  }, [onRouteDataChange, shouldShowMissionRoute, resolvedDestinationPosition]);

  useEffect(() => {
    if (!shouldShowMissionRoute || !resolvedDestinationPosition) {
      setRoutePath(null);
      setRouteError(null);
      setRouteDistanceMiles(null);
      setRouteDurationMinutes(null);
      setRouteStepsDetailed([]);
      setCurrentStepIndex(0);
      setIsOffRoute(false);
      lastRouteKeyRef.current = null;
      return;
    }

    const [driverLat, driverLon] = resolvedDriverPosition;
    const [destLat, destLon] = resolvedDestinationPosition;

    const routeKey = `${driverLat.toFixed(5)}:${driverLon.toFixed(5)}:${destLat.toFixed(
      5
    )}:${destLon.toFixed(5)}`;

    if (lastRouteKeyRef.current === routeKey) {
      return;
    }

    lastRouteKeyRef.current = routeKey;

    const controller = new AbortController();

    const fetchRoute = async () => {
      try {
        setRouteError(null);

        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${driverLon},${driverLat};${destLon},${destLat}?overview=full&geometries=geojson&steps=true`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Route request failed");
        }

        const data = await response.json();
        const route = data?.routes?.[0];
        const coordinates = route?.geometry?.coordinates as
          | Array<[number, number]>
          | undefined;

        if (!coordinates || coordinates.length < 2) {
          throw new Error("No route path");
        }

        setRoutePath(coordinates.map(([lon, lat]) => [lat, lon]));

        const distanceMiles = Number(route?.distance ?? 0) * METERS_TO_MILES;
        const durationMinutes = Number(route?.duration ?? 0) / 60;
        setRouteDistanceMiles(distanceMiles);
        setRouteDurationMinutes(durationMinutes);

        const stepsRaw = (route?.legs ?? []).flatMap((leg: any) => leg?.steps ?? []).slice(0, 6);
        const steps = stepsRaw.map((step: any) => ({
          instruction: formatManeuverInstruction(step),
          distanceMiles: Number(step?.distance ?? 0) * METERS_TO_MILES,
          maneuverPosition:
            step?.maneuver?.location && Array.isArray(step.maneuver.location)
              ? [Number(step.maneuver.location[1]), Number(step.maneuver.location[0])]
              : null,
        }));
        setRouteStepsDetailed(steps);
        setCurrentStepIndex(0);
        setIsOffRoute(false);

        onRouteDataChange?.({
          distanceMiles,
          durationMinutes,
          nextInstruction: steps[0]?.instruction ?? "Continue to destination",
          steps: steps.map((step: InternalRouteStep) => ({
            instruction: step.instruction,
            distanceMiles: step.distanceMiles,
          })),
          offRoute: false,
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setRoutePath(null);
        setRouteError("Route unavailable. Showing direct path.");
        setRouteDistanceMiles(null);
        setRouteDurationMinutes(null);
        setRouteStepsDetailed([]);
        setCurrentStepIndex(0);
        setIsOffRoute(false);
        onRouteDataChange?.(null);
      }
    };

    void fetchRoute();

    return () => {
      controller.abort();
    };
  }, [
    shouldShowMissionRoute,
    resolvedDriverPosition[0],
    resolvedDriverPosition[1],
    resolvedDestinationPosition?.[0] ?? null,
    resolvedDestinationPosition?.[1] ?? null,
  ]);

  useEffect(() => {
    if (!shouldFollowNavigation || !shouldShowMissionRoute || !driverPosition) {
      setIsOffRoute(false);
      return;
    }

    const minDistanceToRoute = (routePath ?? []).reduce((minDistance, routePoint) => {
      const pointDistance =
        haversineDistanceKm([driverPosition[0], driverPosition[1]], routePoint) * KM_TO_MILES;
      return Math.min(minDistance, pointDistance);
    }, Number.POSITIVE_INFINITY);

    const currentlyOffRoute =
      Number.isFinite(minDistanceToRoute) && minDistanceToRoute > OFF_ROUTE_THRESHOLD_MILES;
    setIsOffRoute(currentlyOffRoute);

    if (!routeStepsDetailed.length) return;

    let nextIndex = currentStepIndex;

    for (let index = currentStepIndex; index < routeStepsDetailed.length; index += 1) {
      const maneuverPosition = routeStepsDetailed[index].maneuverPosition;
      if (!maneuverPosition) continue;

      const distanceToManeuverMiles =
        haversineDistanceKm([driverPosition[0], driverPosition[1]], maneuverPosition) *
        KM_TO_MILES;

      if (distanceToManeuverMiles <= MANEUVER_REACHED_THRESHOLD_MILES) {
        nextIndex = Math.min(index + 1, routeStepsDetailed.length - 1);
      } else {
        break;
      }
    }

    if (nextIndex !== currentStepIndex) {
      setCurrentStepIndex(nextIndex);
    }
  }, [
    shouldFollowNavigation,
    shouldShowMissionRoute,
    driverPosition?.[0] ?? null,
    driverPosition?.[1] ?? null,
    routePath,
    routeStepsDetailed,
    currentStepIndex,
  ]);

  useEffect(() => {
    if (!onRouteDataChange || !shouldShowMissionRoute) return;

    if (!routeStepsDetailed.length || routeDistanceMiles == null || routeDurationMinutes == null) {
      return;
    }

    const visibleSteps = routeStepsDetailed
      .slice(currentStepIndex, currentStepIndex + 6)
      .map(({ instruction, distanceMiles }) => ({ instruction, distanceMiles }));

    onRouteDataChange({
      distanceMiles: routeDistanceMiles,
      durationMinutes: routeDurationMinutes,
      nextInstruction: isOffRoute
        ? "Off route — preparing reroute"
        : visibleSteps[0]?.instruction ?? "Continue to destination",
      steps: visibleSteps,
      offRoute: isOffRoute,
    });
  }, [
    onRouteDataChange,
    shouldShowMissionRoute,
    routeStepsDetailed,
    currentStepIndex,
    routeDistanceMiles,
    routeDurationMinutes,
    isOffRoute,
  ]);

  useEffect(() => {
    if (!onRouteSummaryChange) return;

    if (!resolvedDestinationPosition) {
      onRouteSummaryChange(null);
      return;
    }

    onRouteSummaryChange(
      haversineDistanceKm(
        resolvedDriverPosition,
        resolvedDestinationPosition
      ) * KM_TO_MILES
    );
  }, [onRouteSummaryChange, resolvedDriverPosition, resolvedDestinationPosition]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map._container) return;

    const frame = window.requestAnimationFrame(() => {
      if (!mapRef.current || !mapRef.current._container) return;

      mapRef.current.invalidateSize();

      if (shouldFollowNavigation && resolvedDriverPosition) {
        mapRef.current.setView(resolvedDriverPosition, 16);
        return;
      }

      if (navigationActive && resolvedDriverPosition && resolvedDestinationPosition) {
        mapRef.current.fitBounds([resolvedDriverPosition, resolvedDestinationPosition], {
          paddingTopLeft: [24, 24],
          paddingBottomRight: [24, 200],
          maxZoom: 15,
        });
        return;
      }

      if (isAcceptedState && resolvedDriverPosition && resolvedDestinationPosition) {
        mapRef.current.fitBounds([resolvedDriverPosition, resolvedDestinationPosition], {
          paddingTopLeft: [32, 32],
          paddingBottomRight: [32, 170],
          maxZoom: 14,
        });
        return;
      }

      if (isAssignedState && resolvedDestinationPosition) {
        mapRef.current.setView(resolvedDestinationPosition, 14);
        return;
      }

      if (resolvedDriverPosition) {
        mapRef.current.setView(resolvedDriverPosition, 13);
        return;
      }

      if (resolvedDestinationPosition) {
        mapRef.current.setView(resolvedDestinationPosition, 13);
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [
    resolvedDriverPosition[0],
    resolvedDriverPosition[1],
    resolvedDestinationPosition?.[0] ?? null,
    resolvedDestinationPosition?.[1] ?? null,
    navigationActive,
    directionsActive,
    shouldFollowNavigation,
    missionStatus,
  ]);

  const mapDependenciesReady = hasMounted && leaflet && driverIcon && jobIcon;

  const center: [number, number] =
    isAssignedState && resolvedDestinationPosition
      ? resolvedDestinationPosition
      : isAcceptedState && resolvedDestinationPosition
      ? [
          (resolvedDriverPosition[0] + resolvedDestinationPosition[0]) / 2,
          (resolvedDriverPosition[1] + resolvedDestinationPosition[1]) / 2,
        ]
      : resolvedDriverPosition;

  return (
    <div
      ref={mapHostRef}
      className="relative z-0 h-full min-h-[320px] overflow-hidden rounded-2xl border border-white/10"
    >
      {destinationError ? (
        <div className="absolute left-3 right-3 top-3 z-30 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 backdrop-blur-sm">
          {destinationError}
        </div>
      ) : null}

      {!destinationError && routeError && shouldShowMissionRoute ? (
        <div className="absolute left-3 right-3 top-3 z-30 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 backdrop-blur-sm">
          {routeError}
        </div>
      ) : null}

      {shouldFollowNavigation && shouldShowMissionRoute ? (
        <div
          className={`absolute left-3 right-3 z-30 rounded-xl border px-3 py-2 text-xs backdrop-blur-sm ${
            isOffRoute
              ? "top-14 border-rose-400/30 bg-rose-500/10 text-rose-100"
              : "top-14 border-cyan-400/30 bg-slate-900/85 text-cyan-100"
          }`}
        >
          <p className="uppercase tracking-[0.2em] text-[10px] opacity-80">Live Navigation</p>
          <p className="mt-1 font-medium">
            {isOffRoute
              ? "Off route — preparing reroute"
              : routeStepsDetailed[currentStepIndex]?.instruction ?? "Continue to destination"}
          </p>
          {!isOffRoute && routeStepsDetailed[currentStepIndex] ? (
            <p className="mt-1 text-cyan-200/85">
              Next step in {Math.max(0.1, routeStepsDetailed[currentStepIndex].distanceMiles).toFixed(1)} mi
              {routeDurationMinutes != null
                ? ` • ETA ${Math.max(1, Math.round(routeDurationMinutes))} min`
                : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {hasMounted && mapDependenciesReady ? (
        <MapContainer
          center={center}
          zoom={12}
          scrollWheelZoom={true}
          zoomControl={false}
          attributionControl={false}
          whenReady={(event: any) => {
            mapRef.current = event.target;
            setIsMapReady(true);
            invalidateMapSize();
          }}
          style={{ height: "100%", width: "100%", zIndex: 0 }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {!isAssignedState ? (
            <Marker position={resolvedDriverPosition} icon={driverIcon}>
              <Popup>
                <div className="text-sm">
                  <strong>Driver</strong>
                  <div>Current position</div>
                </div>
              </Popup>
            </Marker>
          ) : null}

          {hasVerifiedDestination && resolvedDestinationPosition ? (
            <>
              <Marker position={resolvedDestinationPosition} icon={jobIcon}>
                <Popup>
                  <div className="text-sm">
                    <strong>{customerName}</strong>
                    <div>{addressLabel}</div>
                  </div>
                </Popup>
              </Marker>

              {shouldShowMissionRoute ? (
                routePath && routePath.length > 1 ? (
                  <Polyline
                    positions={routePath}
                    pathOptions={{ color: "#22d3ee", weight: 4, opacity: 0.9 }}
                  />
                ) : (
                  <Polyline
                    positions={[resolvedDriverPosition, resolvedDestinationPosition]}
                    pathOptions={{ color: "#22d3ee", weight: 3, opacity: 0.55, dashArray: "6 6" }}
                  />
                )
              ) : null}
            </>
          ) : null}
        </MapContainer>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-900/70 p-4 text-sm text-white/60">
          Loading map...
        </div>
      )}
    </div>
  );
}
