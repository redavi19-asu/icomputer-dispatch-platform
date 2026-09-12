"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  FileUp,
  Loader2,
  MapPinned,
  PackageCheck,
  Plus,
  Route,
  ScanLine,
  Trash2,
  Truck,
} from "lucide-react";
import { authRequest } from "@/lib/dispatchos-auth";

type DraftStop = {
  id: string;
  trackingCode: string;
  customerName: string;
  phone: string;
  address: string;
  lat: number | null;
  lon: number | null;
  packageLocation: string;
  priority: number;
  timeWindowStart: string;
  timeWindowEnd: string;
  instructions: string;
  stopType: "pickup" | "delivery";
  pairKey: string;
};

type Driver = { id: string; name: string; status?: string | null };

type CourierRoute = {
  id: string;
  name: string;
  status: string;
  driverName?: string | null;
  stops: Array<{ id: string; status: string }>;
};

type ManifestRow = Partial<DraftStop>;

const newStop = (): DraftStop => ({
  id: crypto.randomUUID(),
  trackingCode: "",
  customerName: "",
  phone: "",
  address: "",
  lat: null,
  lon: null,
  packageLocation: "",
  priority: 0,
  timeWindowStart: "",
  timeWindowEnd: "",
  instructions: "",
  stopType: "delivery",
  pairKey: "",
});

const normalizeCode = (value: string) => value.trim().replace(/\s+/g, "").toUpperCase();
const toRad = (value: number) => (value * Math.PI) / 180;

const haversineMiles = (a: [number, number], b: [number, number]) => {
  const earthMiles = 3958.8;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthMiles * Math.asin(Math.sqrt(h));
};

const parseCsvLine = (line: string) => {
  const output: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      output.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  output.push(current.trim());
  return output;
};

const pick = (row: Record<string, string>, names: string[]) => {
  for (const name of names) {
    const value = row[name];
    if (value) return value;
  }
  return "";
};

const parseManifestCsv = (text: string): ManifestRow[] => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((header) =>
    header.toLowerCase().replace(/[^a-z0-9]/g, "")
  );

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    const type = pick(row, ["stoptype", "type"]).toLowerCase();
    return {
      trackingCode: pick(row, ["tracking", "trackingcode", "barcode", "packageid", "id"]),
      customerName: pick(row, ["customer", "customername", "name", "recipient"]),
      phone: pick(row, ["phone", "telephone", "mobile"]),
      address: pick(row, ["address", "deliveryaddress", "dropoffaddress", "streetaddress"]),
      packageLocation: pick(row, ["packagelocation", "vehiclelocation", "bin", "shelf"]),
      priority: Number(pick(row, ["priority"])) || 0,
      timeWindowStart: pick(row, ["timewindowstart", "windowstart", "starttime"]),
      timeWindowEnd: pick(row, ["timewindowend", "windowend", "endtime"]),
      instructions: pick(row, ["instructions", "notes", "deliveryinstructions"]),
      stopType: type === "pickup" ? "pickup" : "delivery",
      pairKey: pick(row, ["pairkey", "orderid", "shipmentid"]),
    };
  });
};

const extractAddressFromText = (text: string) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\d{1,6}\s+[A-Za-z0-9.'# -]{3,}/.test(line)) {
      const next = lines[index + 1] || "";
      if (/[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/i.test(next)) return line + ", " + next;
      return line;
    }
  }

  const match = text.match(
    /\b\d{1,6}\s+[A-Za-z0-9.'# -]+(?:Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Place|Pl|Highway|Hwy)\b[^\n,]*(?:,?\s+[A-Za-z .'-]+,?\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?)?/i
  );
  return match?.[0]?.replace(/\s+/g, " ").trim() || "";
};

const geocode = async (address: string): Promise<[number, number]> => {
  const response = await fetch(
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=" +
      encodeURIComponent(address),
    { headers: { Accept: "application/json" } }
  );
  if (!response.ok) throw new Error("Address lookup failed");
  const data = await response.json();
  if (!data?.[0]?.lat || !data?.[0]?.lon) throw new Error("Address not found: " + address);
  return [Number(data[0].lat), Number(data[0].lon)];
};

const compressImage = async (file: File, maxWidth = 1280, quality = 0.72) => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing unavailable");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
};

const recognizeText = async (file: File) => {
  const bitmap = await createImageBitmap(file);
  try {
    const TextDetectorCtor = (window as any).TextDetector;
    if (TextDetectorCtor) {
      const detector = new TextDetectorCtor();
      const blocks = await detector.detect(bitmap);
      const text = blocks.map((block: any) => block.rawValue || "").join("\n").trim();
      if (text) return text;
    }
  } finally {
    bitmap.close();
  }

  const existing = (window as any).Tesseract;
  if (!existing) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("OCR engine could not load"));
      document.head.appendChild(script);
    });
  }
  const tesseract = (window as any).Tesseract;
  if (!tesseract?.recognize) throw new Error("OCR is unavailable on this device");
  const result = await tesseract.recognize(file, "eng");
  return String(result?.data?.text || "");
};

export function CourierIntakeConsole() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  const [manifest, setManifest] = useState<ManifestRow[]>([]);
  const [stops, setStops] = useState<DraftStop[]>([]);
  const [draft, setDraft] = useState<DraftStop>(() => newStop());
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<CourierRoute[]>([]);
  const [routeName, setRouteName] = useState("Morning Courier Load");
  const [startAddress, setStartAddress] = useState("");
  const [driverId, setDriverId] = useState("");
  const [autoAssign, setAutoAssign] = useState(true);
  const [status, setStatus] = useState("Ready to scan packages or import a manifest.");
  const [busy, setBusy] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [lastDistanceMiles, setLastDistanceMiles] = useState<number | null>(null);

  const completedAddressCount = useMemo(
    () => stops.filter((stop) => stop.address.trim()).length,
    [stops]
  );

  const stopCamera = () => {
    if (scanTimerRef.current != null) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  useEffect(() => stopCamera, []);

  const refreshOperations = async () => {
    try {
      const [driverData, routeData] = await Promise.all([
        authRequest("/api/drivers", { method: "GET", cache: "no-store" }),
        authRequest("/api/courier/routes?active=1", { method: "GET", cache: "no-store" }),
      ]);
      setDrivers(Array.isArray(driverData.drivers) ? driverData.drivers : []);
      setRoutes(Array.isArray(routeData.routes) ? routeData.routes : []);
    } catch {
      // Keep the load builder usable even when the cloud API is temporarily unavailable.
    }
  };

  useEffect(() => {
    void refreshOperations();
    const timer = window.setInterval(refreshOperations, 8000);
    return () => window.clearInterval(timer);
  }, []);

  const addStop = (source: DraftStop) => {
    if (!source.address.trim() && !source.trackingCode.trim()) {
      setStatus("Add an address or tracking code first.");
      return;
    }
    setStops((current) => [...current, { ...source, id: crypto.randomUUID() }]);
    setDraft(newStop());
    setStatus("Stop added to the load.");
  };

  const addTrackingCode = (rawCode: string) => {
    const code = normalizeCode(rawCode);
    if (!code) return;
    const existing = stops.find((stop) => normalizeCode(stop.trackingCode) === code);
    if (existing) {
      setStatus("That package is already in this load.");
      return;
    }

    const manifestMatch = manifest.find(
      (row) => normalizeCode(String(row.trackingCode || "")) === code
    );
    const next: DraftStop = {
      ...newStop(),
      ...manifestMatch,
      id: crypto.randomUUID(),
      trackingCode: rawCode.trim(),
      lat: null,
      lon: null,
      priority: Number(manifestMatch?.priority || 0),
      stopType: manifestMatch?.stopType === "pickup" ? "pickup" : "delivery",
    };
    setStops((current) => [...current, next]);
    setStatus(
      manifestMatch?.address
        ? "Package matched to manifest and added."
        : "Package scanned. Address still needs to be captured."
    );
  };

  const startScanner = async () => {
    const Detector = (window as any).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setStatus("Live barcode scanning is not supported here. Use the tracking field or label photo.");
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
      scanTimerRef.current = window.setInterval(async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return;
        try {
          const results = await detector.detect(video);
          const value = results?.[0]?.rawValue?.trim();
          if (value) addTrackingCode(value);
        } catch {
          // transient camera frame errors are safe to ignore
        }
      }, 650);
      setStatus("Scanner active. Keep feeding package labels into the camera.");
    } catch {
      setStatus("Camera permission was denied or the scanner could not start.");
      stopCamera();
    }
  };

  const handleManifestFile = async (file: File) => {
    const rows = parseManifestCsv(await file.text());
    setManifest(rows);
    setStatus("Manifest loaded: " + rows.length + " package records ready for barcode matching.");
  };

  const handleLabelPhoto = async (file: File) => {
    setOcrBusy(true);
    setStatus("Reading the printed label...");
    try {
      const Detector = (window as any).BarcodeDetector;
      if (Detector) {
        const bitmap = await createImageBitmap(file);
        try {
          const detector = new Detector({
            formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e"],
          });
          const codes = await detector.detect(bitmap);
          const code = codes?.[0]?.rawValue?.trim();
          if (code) addTrackingCode(code);
        } finally {
          bitmap.close();
        }
      }

      const text = await recognizeText(file);
      const address = extractAddressFromText(text);
      if (!address) {
        setStatus("I read the label, but could not confidently isolate the address. Enter it manually.");
        return;
      }

      setDraft((current) => ({ ...current, address }));
      setStatus("Address captured from the label: " + address);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The label could not be read.");
    } finally {
      setOcrBusy(false);
    }
  };

  const optimizeRoute = async () => {
    if (!stops.length) return;
    const missingAddress = stops.find((stop) => !stop.address.trim());
    if (missingAddress) {
      setStatus("Every scanned package needs an address before route optimization.");
      return;
    }

    setBusy(true);
    setStatus("Geocoding stops and building the best road sequence...");
    try {
      const located: DraftStop[] = [];
      for (const stop of stops) {
        if (stop.lat != null && stop.lon != null) {
          located.push(stop);
          continue;
        }
        const [lat, lon] = await geocode(stop.address);
        located.push({ ...stop, lat, lon });
        await new Promise((resolve) => window.setTimeout(resolve, 180));
      }

      let origin: [number, number] | null = null;
      if (startAddress.trim()) {
        origin = await geocode(startAddress.trim());
      } else if (navigator.geolocation) {
        origin = await new Promise<[number, number] | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => resolve([position.coords.latitude, position.coords.longitude]),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
          );
        });
      }
      origin = origin || [located[0].lat!, located[0].lon!];

      let matrix: number[][] | null = null;
      if (located.length <= 25) {
        try {
          const coords = [origin, ...located.map((stop) => [stop.lat!, stop.lon!] as [number, number])]
            .map(([lat, lon]) => lon + "," + lat)
            .join(";");
          const response = await fetch(
            "https://router.project-osrm.org/table/v1/driving/" + coords + "?annotations=duration,distance"
          );
          const data = response.ok ? await response.json() : null;
          matrix = Array.isArray(data?.durations) ? data.durations : null;
        } catch {
          matrix = null;
        }
      }

      const remaining = new Set(located.map((_, index) => index));
      const ordered: DraftStop[] = [];
      let currentIndex = -1;
      let totalMiles = 0;

      while (remaining.size) {
        const deliveredPairs = new Set(
          ordered.filter((stop) => stop.stopType === "pickup" && stop.pairKey).map((stop) => stop.pairKey)
        );
        const eligible = [...remaining].filter((index) => {
          const stop = located[index];
          if (stop.stopType !== "delivery" || !stop.pairKey) return true;
          const hasPickup = located.some(
            (candidate) => candidate.stopType === "pickup" && candidate.pairKey === stop.pairKey
          );
          return !hasPickup || deliveredPairs.has(stop.pairKey);
        });
        const candidates = eligible.length ? eligible : [...remaining];

        let bestIndex = candidates[0];
        let bestScore = Number.POSITIVE_INFINITY;
        for (const index of candidates) {
          const stop = located[index];
          const from = currentIndex < 0 ? origin : [located[currentIndex].lat!, located[currentIndex].lon!] as [number, number];
          const miles = haversineMiles(from, [stop.lat!, stop.lon!]);
          const roadSeconds =
            matrix && located.length <= 25
              ? matrix[currentIndex < 0 ? 0 : currentIndex + 1]?.[index + 1]
              : null;
          const travelScore = Number.isFinite(roadSeconds) ? Number(roadSeconds) / 60 : miles * 2.2;
          const priorityBonus = Math.max(0, stop.priority) * 18;
          const windowBonus = stop.timeWindowStart ? 8 : 0;
          const score = travelScore - priorityBonus - windowBonus;
          if (score < bestScore) {
            bestScore = score;
            bestIndex = index;
          }
        }

        const from = currentIndex < 0 ? origin : [located[currentIndex].lat!, located[currentIndex].lon!] as [number, number];
        totalMiles += haversineMiles(from, [located[bestIndex].lat!, located[bestIndex].lon!]);
        ordered.push(located[bestIndex]);
        remaining.delete(bestIndex);
        currentIndex = bestIndex;
      }

      setStops(ordered);
      setLastDistanceMiles(totalMiles);
      setStatus(
        "Route optimized: " +
          ordered.length +
          " stops. Pickup dependencies, priority, time windows and road travel are included."
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Route optimization failed.");
    } finally {
      setBusy(false);
    }
  };

  const dispatchRoute = async () => {
    if (!stops.length || stops.some((stop) => !stop.address.trim())) {
      setStatus("Every package needs a delivery address before dispatch.");
      return;
    }
    setBusy(true);
    setStatus("Creating courier jobs and dispatching the route...");
    try {
      const data = await authRequest("/api/courier/routes", {
        method: "POST",
        body: JSON.stringify({
          name: routeName,
          startAddress,
          driverId: autoAssign ? null : driverId || null,
          autoAssign,
          totalDistanceMiles: lastDistanceMiles,
          estimatedMinutes: lastDistanceMiles ? Math.round(lastDistanceMiles * 2.1 + stops.length * 4) : null,
          stops: stops.map(({ id, ...stop }) => stop),
        }),
      });
      const route = data.route;
      setStatus(
        "Route dispatched" +
          (route?.driverName ? " to " + route.driverName : "") +
          ". " +
          stops.length +
          " normal dispatch jobs were created and linked to the route."
      );
      await refreshOperations();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Route dispatch failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <section className="space-y-5">
        <div className="rounded-3xl border border-cyan-400/20 bg-slate-950/75 p-5 shadow-2xl backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Scan → Route → Deliver</p>
              <h2 className="mt-2 text-2xl font-black text-white">Courier Load Builder</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                Scan package codes, match a manifest, read printed addresses, optimize the stop order, then dispatch the entire load into the existing job system.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
              <p className="text-3xl font-black text-white">{stops.length}</p>
              <p className="text-xs uppercase tracking-[0.15em] text-white/40">Packages</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <label className="cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-4 text-white hover:bg-white/10">
              <FileUp className="h-5 w-5 text-cyan-300" />
              <span className="mt-2 block text-sm font-bold">Import Manifest CSV</span>
              <span className="mt-1 block text-xs text-white/45">Tracking, address, recipient, bin, priority, windows.</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleManifestFile(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>

            <button
              type="button"
              onClick={() => (cameraActive ? stopCamera() : void startScanner())}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-white hover:bg-white/10"
            >
              <ScanLine className="h-5 w-5 text-emerald-300" />
              <span className="mt-2 block text-sm font-bold">{cameraActive ? "Stop Bulk Scanner" : "Start Bulk Scanner"}</span>
              <span className="mt-1 block text-xs text-white/45">Continuously add QR, Code 128, UPC/EAN and common barcodes.</span>
            </button>

            <label className="cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-4 text-white hover:bg-white/10">
              {ocrBusy ? <Loader2 className="h-5 w-5 animate-spin text-amber-300" /> : <Camera className="h-5 w-5 text-amber-300" />}
              <span className="mt-2 block text-sm font-bold">Scan Printed Address</span>
              <span className="mt-1 block text-xs text-white/45">Camera OCR reads an address from a shipping label.</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={ocrBusy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleLabelPhoto(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>

          {cameraActive ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-400/25 bg-black">
              <video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" />
            </div>
          ) : (
            <video ref={videoRef} muted playsInline className="hidden" />
          )}

          <p className="mt-4 rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-100" aria-live="polite">
            {status}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Manual / OCR correction</p>
              <h3 className="mt-1 text-xl font-bold">Add Stop</h3>
            </div>
            <Plus className="h-5 w-5 text-cyan-300" />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input value={draft.trackingCode} onChange={(e) => setDraft({ ...draft, trackingCode: e.target.value })} placeholder="Tracking / barcode" className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none focus:border-cyan-400/50" />
            <input value={draft.customerName} onChange={(e) => setDraft({ ...draft, customerName: e.target.value })} placeholder="Recipient name" className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none focus:border-cyan-400/50" />
            <input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value, lat: null, lon: null })} placeholder="Delivery / pickup address" className="md:col-span-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none focus:border-cyan-400/50" />
            <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="Phone" className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none focus:border-cyan-400/50" />
            <input value={draft.packageLocation} onChange={(e) => setDraft({ ...draft, packageLocation: e.target.value })} placeholder="Vehicle location (Bin 4 / rear-left)" className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none focus:border-cyan-400/50" />
            <select value={draft.stopType} onChange={(e) => setDraft({ ...draft, stopType: e.target.value as "pickup" | "delivery" })} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3">
              <option value="delivery">Delivery</option>
              <option value="pickup">Pickup</option>
            </select>
            <input value={draft.pairKey} onChange={(e) => setDraft({ ...draft, pairKey: e.target.value })} placeholder="Pickup/delivery pair ID (optional)" className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none focus:border-cyan-400/50" />
            <input type="number" min="0" max="9" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) || 0 })} placeholder="Priority 0-9" className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none" />
            <input value={draft.timeWindowStart} onChange={(e) => setDraft({ ...draft, timeWindowStart: e.target.value })} placeholder="Window start (e.g. 9:00 AM)" className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none" />
            <input value={draft.timeWindowEnd} onChange={(e) => setDraft({ ...draft, timeWindowEnd: e.target.value })} placeholder="Window end (e.g. 12:00 PM)" className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none" />
            <textarea value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} placeholder="Customer / delivery instructions" rows={2} className="md:col-span-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none" />
          </div>

          <button type="button" onClick={() => addStop(draft)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950">
            <Plus className="h-4 w-4" /> Add Stop
          </button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-5 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Load sequence</p>
              <h3 className="mt-1 text-xl font-bold">{completedAddressCount}/{stops.length} addressed</h3>
            </div>
            <button type="button" disabled={busy || !stops.length} onClick={() => void optimizeRoute()} className="inline-flex items-center gap-2 rounded-xl border border-violet-300/25 bg-violet-500/15 px-4 py-3 text-sm font-bold text-violet-100 disabled:opacity-40">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Route className="h-4 w-4" />} Optimize Route
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {stops.map((stop, index) => (
              <div key={stop.id} className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 md:grid-cols-[3rem_1fr_auto] md:items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400/15 text-sm font-black text-cyan-200">{index + 1}</div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{stop.address || "Address needed"}</p>
                  <p className="mt-1 text-xs text-white/45">
                    {stop.trackingCode || "No barcode"}{stop.packageLocation ? " • " + stop.packageLocation : ""}{stop.stopType === "pickup" ? " • PICKUP" : ""}
                  </p>
                </div>
                <button type="button" onClick={() => setStops((current) => current.filter((item) => item.id !== stop.id))} className="rounded-lg p-2 text-white/45 hover:bg-rose-500/10 hover:text-rose-300" aria-label="Remove stop">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {!stops.length ? <p className="py-8 text-center text-sm text-white/35">No packages in this load yet.</p> : null}
          </div>
        </div>
      </section>

      <aside className="space-y-5">
        <div className="rounded-3xl border border-emerald-400/20 bg-slate-950/80 p-5 text-white">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-emerald-300" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Dispatch</p>
              <h3 className="text-xl font-black">Send This Load</h3>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <input value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="Route name" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none" />
            <input value={startAddress} onChange={(e) => setStartAddress(e.target.value)} placeholder="Start address (optional; GPS used if blank)" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none" />
            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm">
              <span>Auto-assign best available driver</span>
              <input type="checkbox" checked={autoAssign} onChange={(e) => setAutoAssign(e.target.checked)} className="h-4 w-4" />
            </label>
            {!autoAssign ? (
              <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3">
                <option value="">Choose driver</option>
                {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name} {driver.status ? "• " + driver.status : ""}</option>)}
              </select>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-white/5 p-3"><p className="text-2xl font-black">{stops.length}</p><p className="text-[10px] uppercase tracking-[0.15em] text-white/35">Stops</p></div>
            <div className="rounded-xl bg-white/5 p-3"><p className="text-2xl font-black">{lastDistanceMiles == null ? "—" : lastDistanceMiles.toFixed(1)}</p><p className="text-[10px] uppercase tracking-[0.15em] text-white/35">Approx mi</p></div>
          </div>

          <button type="button" disabled={busy || !stops.length} onClick={() => void dispatchRoute()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950 disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />} Dispatch Route
          </button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-5 text-white">
          <div className="flex items-center gap-2">
            <MapPinned className="h-5 w-5 text-cyan-300" />
            <h3 className="font-bold">Active Courier Routes</h3>
          </div>
          <div className="mt-4 space-y-2">
            {routes.map((route) => {
              const delivered = route.stops.filter((stop) => stop.status === "Delivered").length;
              return (
                <div key={route.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{route.name}</p>
                    <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] font-bold uppercase text-cyan-200">{route.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/45">{route.driverName || "Unassigned"} • {delivered}/{route.stops.length} delivered</p>
                  {delivered === route.stops.length && route.stops.length > 0 ? <p className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Route complete</p> : null}
                </div>
              );
            })}
            {!routes.length ? <p className="py-5 text-center text-sm text-white/35">No active courier routes.</p> : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
