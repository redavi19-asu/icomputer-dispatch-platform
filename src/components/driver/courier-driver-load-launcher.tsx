"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  Loader2,
  PackagePlus,
  Route,
  ScanLine,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { authRequest } from "@/lib/dispatchos-auth";

type CourierStop = {
  id: string;
  sequence: number;
  trackingCode?: string | null;
  address: string;
  customerName?: string | null;
  packageLocation?: string | null;
  loadedAt?: string | null;
  status: string;
};

type CourierRoute = {
  id: string;
  name: string;
  status: string;
  stops: CourierStop[];
};

type DraftStop = {
  id: string;
  trackingCode: string;
  address: string;
  customerName: string;
  packageLocation: string;
  lat: number | null;
  lon: number | null;
};

const normalizeCode = (value: string) =>
  value.trim().replace(/\s+/g, "").toUpperCase();

const newDraftStop = (): DraftStop => ({
  id: crypto.randomUUID(),
  trackingCode: "",
  address: "",
  customerName: "",
  packageLocation: "",
  lat: null,
  lon: null,
});

const extractAddressFromText = (text: string) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\d{1,6}\s+[A-Za-z0-9.'# -]{3,}/.test(line)) {
      const next = lines[index + 1] || "";
      if (/[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/i.test(next)) {
        return line + ", " + next;
      }
      return line;
    }
  }

  const match = text.match(
    /\b\d{1,6}\s+[A-Za-z0-9.'# -]+(?:Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Place|Pl|Highway|Hwy)\b[^\n,]*(?:,?\s+[A-Za-z .'-]+,?\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?)?/i
  );
  return match?.[0]?.replace(/\s+/g, " ").trim() || "";
};

const recognizeText = async (file: File) => {
  const bitmap = await createImageBitmap(file);
  try {
    const Detector = (window as any).TextDetector;
    if (Detector) {
      const detector = new Detector();
      const blocks = await detector.detect(bitmap);
      const text = blocks.map((block: any) => block.rawValue || "").join("\n").trim();
      if (text) return text;
    }
  } finally {
    bitmap.close();
  }

  if (!(window as any).Tesseract) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("OCR engine could not load."));
      document.head.appendChild(script);
    });
  }

  const engine = (window as any).Tesseract;
  if (!engine?.recognize) throw new Error("OCR is unavailable on this device.");
  const result = await engine.recognize(file, "eng");
  return String(result?.data?.text || "");
};

const detectBarcodeFromFile = async (file: File) => {
  const Detector = (window as any).BarcodeDetector;
  if (!Detector) return "";
  const bitmap = await createImageBitmap(file);
  try {
    const detector = new Detector({
      formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e"],
    });
    const results = await detector.detect(bitmap);
    return String(results?.[0]?.rawValue || "").trim();
  } finally {
    bitmap.close();
  }
};

const geocode = async (address: string): Promise<[number, number]> => {
  const response = await fetch(
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=" +
      encodeURIComponent(address),
    { headers: { Accept: "application/json" } }
  );
  if (!response.ok) throw new Error("Address lookup failed.");
  const data = await response.json();
  if (!data?.[0]?.lat || !data?.[0]?.lon) {
    throw new Error("Address not found: " + address);
  }
  return [Number(data[0].lat), Number(data[0].lon)];
};

const toRad = (value: number) => (value * Math.PI) / 180;
const haversineMiles = (a: [number, number], b: [number, number]) => {
  const radius = 3958.8;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
};

export function CourierDriverLoadLauncher() {
  const pathname = usePathname();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastScanRef = useRef("");

  const [routes, setRoutes] = useState<CourierRoute[]>([]);
  const [draftStops, setDraftStops] = useState<DraftStop[]>([]);
  const [open, setOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [routeName, setRouteName] = useState("Driver Courier Load");

  const refresh = async () => {
    if (!pathname?.includes("/driver")) return;
    try {
      const data = await authRequest("/api/courier/routes?active=1", {
        method: "GET",
        cache: "no-store",
      });
      setRoutes(Array.isArray(data.routes) ? data.routes : []);
    } catch {
      // Standard driver missions remain usable when courier APIs are unavailable.
    }
  };

  useEffect(() => {
    if (!pathname?.includes("/driver")) return;
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [pathname]);

  const activeRoute = useMemo(
    () => routes.find((route) => route.status !== "Completed" && route.status !== "Cancelled") || null,
    [routes]
  );

  const trackedStops = activeRoute?.stops.filter((stop) => Boolean(stop.trackingCode)) || [];
  const loadedTrackedStops = trackedStops.filter((stop) => Boolean(stop.loadedAt));
  const needsAssignedLoadScan =
    Boolean(activeRoute) && trackedStops.length > loadedTrackedStops.length;

  const stopCamera = () => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    lastScanRef.current = "";
  };

  useEffect(() => stopCamera, []);

  const handleDetectedCode = async (rawValue: string) => {
    const code = normalizeCode(rawValue);
    if (!code || code === lastScanRef.current) return;
    lastScanRef.current = code;
    window.setTimeout(() => {
      if (lastScanRef.current === code) lastScanRef.current = "";
    }, 1400);

    if (activeRoute && needsAssignedLoadScan) {
      setBusy(true);
      setStatusText("Checking package against assigned route...");
      try {
        const data = await authRequest("/api/courier/load-scan", {
          method: "POST",
          body: JSON.stringify({ routeId: activeRoute.id, trackingCode: rawValue }),
        });
        if (data.route) {
          setRoutes((current) =>
            current.map((route) => (route.id === data.route.id ? data.route : route))
          );
        }
        setStatusText("Package loaded and matched to this route.");
      } catch (error) {
        setStatusText(error instanceof Error ? error.message : "Package was not accepted.");
      } finally {
        setBusy(false);
      }
      return;
    }

    setDraftStops((current) => {
      if (current.some((stop) => normalizeCode(stop.trackingCode) === code)) return current;
      return [...current, { ...newDraftStop(), trackingCode: rawValue.trim() }];
    });
    setStatusText("Package scanned. Capture the printed address next.");
  };

  const startScanner = async () => {
    const Detector = (window as any).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setStatusText("Live barcode scanning is not supported here. Use Scan Label Photo.");
      return;
    }

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraActive(true);

      const detector = new Detector({
        formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e"],
      });
      timerRef.current = window.setInterval(async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || busy) return;
        try {
          const results = await detector.detect(video);
          const value = results?.[0]?.rawValue?.trim();
          if (value) await handleDetectedCode(value);
        } catch {
          // Keep scanning through transient camera-frame errors.
        }
      }, 600);
      setStatusText(
        activeRoute && needsAssignedLoadScan
          ? "Scan every package as it goes into the vehicle."
          : "Bulk scanner active. Scan package barcodes, then capture addresses."
      );
    } catch {
      setStatusText("Camera permission was denied or the scanner could not start.");
      stopCamera();
    }
  };

  const handleLabelPhoto = async (file: File) => {
    if (activeRoute && needsAssignedLoadScan) {
      const code = await detectBarcodeFromFile(file);
      if (!code) {
        setStatusText("No readable barcode was found on that label.");
        return;
      }
      await handleDetectedCode(code);
      return;
    }

    setOcrBusy(true);
    setStatusText("Reading barcode and printed address...");
    try {
      const [code, text] = await Promise.all([
        detectBarcodeFromFile(file),
        recognizeText(file),
      ]);
      const address = extractAddressFromText(text);

      if (!address) {
        setStatusText("I could not confidently isolate the printed address. Enter it manually.");
        if (code) await handleDetectedCode(code);
        return;
      }

      setDraftStops((current) => {
        const normalized = normalizeCode(code);
        const existingIndex = code
          ? current.findIndex((stop) => normalizeCode(stop.trackingCode) === normalized)
          : -1;

        if (existingIndex >= 0) {
          return current.map((stop, index) =>
            index === existingIndex
              ? { ...stop, address, lat: null, lon: null }
              : stop
          );
        }

        return [
          ...current,
          {
            ...newDraftStop(),
            trackingCode: code,
            address,
          },
        ];
      });
      setStatusText("Package and address captured from the label.");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "The label could not be read.");
    } finally {
      setOcrBusy(false);
    }
  };

  const optimizeAndStart = async () => {
    if (!draftStops.length) {
      setStatusText("Scan at least one package first.");
      return;
    }
    if (draftStops.some((stop) => !stop.address.trim())) {
      setStatusText("Every scanned package needs an address before starting the route.");
      return;
    }

    setBusy(true);
    setStatusText("Building your optimized route...");
    try {
      const located: DraftStop[] = [];
      for (const stop of draftStops) {
        const [lat, lon] =
          stop.lat != null && stop.lon != null
            ? [stop.lat, stop.lon]
            : await geocode(stop.address);
        located.push({ ...stop, lat, lon });
        await new Promise((resolve) => window.setTimeout(resolve, 160));
      }

      const origin = await new Promise<[number, number] | null>((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => resolve([position.coords.latitude, position.coords.longitude]),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 7000, maximumAge: 30000 }
        );
      });

      let currentPosition: [number, number] =
        origin || [located[0].lat!, located[0].lon!];
      const remaining = [...located];
      const ordered: DraftStop[] = [];
      let totalMiles = 0;

      while (remaining.length) {
        let bestIndex = 0;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (let index = 0; index < remaining.length; index += 1) {
          const candidate = remaining[index];
          const distance = haversineMiles(currentPosition, [
            candidate.lat!,
            candidate.lon!,
          ]);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
          }
        }
        const [next] = remaining.splice(bestIndex, 1);
        totalMiles += bestDistance;
        ordered.push(next);
        currentPosition = [next.lat!, next.lon!];
      }

      setDraftStops(ordered);
      const data = await authRequest("/api/courier/routes", {
        method: "POST",
        body: JSON.stringify({
          name: routeName,
          totalDistanceMiles: totalMiles,
          estimatedMinutes: Math.round(totalMiles * 2.1 + ordered.length * 4),
          stops: ordered.map(({ id, ...stop }) => ({
            ...stop,
            stopType: "delivery",
            priority: 0,
          })),
        }),
      });

      setStatusText("Route built and assigned to you. NEXT STOP is ready.");
      setDraftStops([]);
      stopCamera();
      await refresh();
      if (data.route) setOpen(false);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Route could not be created.");
    } finally {
      setBusy(false);
    }
  };

  if (!pathname?.includes("/driver")) return null;

  const assignedProgress =
    trackedStops.length > 0
      ? loadedTrackedStops.length + "/" + trackedStops.length
      : "0/0";

  return (
    <div className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-[80] w-[min(25rem,calc(100vw-2rem))]">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pointer-events-auto flex items-center gap-3 rounded-full border border-cyan-300/35 bg-slate-950/95 px-4 py-3 text-left text-white shadow-2xl backdrop-blur"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400/15">
            {needsAssignedLoadScan ? (
              <ScanLine className="h-5 w-5 text-cyan-300" />
            ) : (
              <PackagePlus className="h-5 w-5 text-cyan-300" />
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
              {needsAssignedLoadScan ? "Load Packages" : "Courier Load"}
            </p>
            <p className="text-sm font-bold">
              {needsAssignedLoadScan
                ? assignedProgress + " scanned into vehicle"
                : activeRoute
                ? "Current route is ready"
                : "Scan a new delivery load"}
            </p>
          </div>
        </button>
      ) : (
        <div className="pointer-events-auto max-h-[82vh] overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/97 p-4 text-white shadow-2xl backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                Driver Courier Load
              </p>
              <h3 className="mt-1 text-xl font-black">
                {needsAssignedLoadScan
                  ? "Scan Assigned Packages"
                  : activeRoute
                  ? "Route Ready"
                  : "Build a New Route"}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setOpen(false);
              }}
              className="rounded-xl p-2 text-white/60 hover:bg-white/10"
              aria-label="Close courier load"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {activeRoute && !needsAssignedLoadScan ? (
            <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4">
              <p className="inline-flex items-center gap-2 font-bold text-emerald-200">
                <CheckCircle2 className="h-5 w-5" /> Packages ready
              </p>
              <p className="mt-2 text-sm text-white/60">
                {activeRoute.name} is loaded. Close this panel and use NEXT STOP.
              </p>
            </div>
          ) : (
            <>
              {needsAssignedLoadScan ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-3xl font-black">{assignedProgress}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/40">
                    Assigned packages loaded
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <input
                    value={routeName}
                    onChange={(event) => setRouteName(event.target.value)}
                    placeholder="Route name"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:border-cyan-400/50"
                  />
                  <p className="text-sm leading-6 text-white/55">
                    Scan each package on the phone. A label photo can capture both the barcode and printed address.
                  </p>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => (cameraActive ? stopCamera() : void startScanner())}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3 text-left disabled:opacity-40"
                >
                  <ScanLine className="h-5 w-5 text-cyan-300" />
                  <span className="mt-2 block text-sm font-bold">
                    {cameraActive ? "Stop Scanner" : "Bulk Barcode Scan"}
                  </span>
                </button>

                <label className="cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-3">
                  {ocrBusy ? (
                    <Loader2 className="h-5 w-5 animate-spin text-amber-300" />
                  ) : (
                    <Camera className="h-5 w-5 text-amber-300" />
                  )}
                  <span className="mt-2 block text-sm font-bold">
                    Scan Label Photo
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    disabled={busy || ocrBusy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleLabelPhoto(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>

              {cameraActive ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-cyan-300/20 bg-black">
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="aspect-video w-full object-cover"
                  />
                </div>
              ) : (
                <video ref={videoRef} muted playsInline className="hidden" />
              )}

              {!needsAssignedLoadScan ? (
                <div className="mt-4 space-y-2">
                  {draftStops.map((stop, index) => (
                    <div
                      key={stop.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold uppercase tracking-[0.15em] text-cyan-300">
                            Package {index + 1}
                          </p>
                          <input
                            value={stop.trackingCode}
                            onChange={(event) =>
                              setDraftStops((current) =>
                                current.map((item) =>
                                  item.id === stop.id
                                    ? { ...item, trackingCode: event.target.value }
                                    : item
                                )
                              )
                            }
                            placeholder="Tracking / barcode"
                            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
                          />
                          <input
                            value={stop.address}
                            onChange={(event) =>
                              setDraftStops((current) =>
                                current.map((item) =>
                                  item.id === stop.id
                                    ? {
                                        ...item,
                                        address: event.target.value,
                                        lat: null,
                                        lon: null,
                                      }
                                    : item
                                )
                              )
                            }
                            placeholder="Delivery address"
                            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
                          />
                          <input
                            value={stop.packageLocation}
                            onChange={(event) =>
                              setDraftStops((current) =>
                                current.map((item) =>
                                  item.id === stop.id
                                    ? { ...item, packageLocation: event.target.value }
                                    : item
                                )
                              )
                            }
                            placeholder="Vehicle location: Bin 2 / rear-left"
                            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setDraftStops((current) =>
                              current.filter((item) => item.id !== stop.id)
                            )
                          }
                          className="rounded-lg p-2 text-white/40 hover:bg-rose-500/10 hover:text-rose-300"
                          aria-label="Remove package"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setDraftStops((current) => [...current, newDraftStop()])
                    }
                    className="w-full rounded-xl border border-dashed border-white/15 px-3 py-3 text-sm text-white/55"
                  >
                    + Add package manually
                  </button>

                  <button
                    type="button"
                    disabled={busy || !draftStops.length}
                    onClick={() => void optimizeAndStart()}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950 disabled:opacity-35"
                  >
                    {busy ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Route className="h-5 w-5" />
                    )}
                    Build Route & Start
                  </button>
                </div>
              ) : null}
            </>
          )}

          {statusText ? (
            <p className="mt-3 rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-3 py-2 text-sm text-cyan-100" aria-live="polite">
              {statusText}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
