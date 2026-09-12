"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  MapPin,
  Navigation,
  PackageCheck,
  PenLine,
  ScanLine,
  TriangleAlert,
  X,
} from "lucide-react";
import { authRequest, getStoredSession } from "@/lib/dispatchos-auth";
import { readWorkspaceSettings } from "@/lib/platform/workspace-preferences";
import { ScanVerificationPanel } from "@/components/driver/scan-verification-panel";

type CourierStop = {
  id: string;
  routeId: string;
  jobId?: string | null;
  sequence: number;
  trackingCode?: string | null;
  customerName?: string | null;
  phone?: string | null;
  address: string;
  packageLocation?: string | null;
  priority?: number;
  timeWindowStart?: string | null;
  timeWindowEnd?: string | null;
  instructions?: string | null;
  stopType?: string | null;
  status: string;
  failedReason?: string | null;
  driverNote?: string | null;
  proofCount?: number;
  proofTypes?: string[];
  loadedAt?: string | null;
};

type CourierRoute = {
  id: string;
  name: string;
  status: string;
  driverId?: string | null;
  driverName?: string | null;
  stops: CourierStop[];
};

const TERMINAL = new Set(["Delivered", "Failed", "Skipped"]);

const compressImage = async (file: File, maxWidth = 1000, quality = 0.65) => {
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

export function CourierNextStopLauncher() {
  const pathname = usePathname();
  const session = getStoredSession();
  const companySlug = session?.company?.slug || "";
  const settings = useMemo(
    () => (companySlug ? readWorkspaceSettings(companySlug) : null),
    [companySlug]
  );

  const [routes, setRoutes] = useState<CourierRoute[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [failedReason, setFailedReason] = useState("");
  const [driverNote, setDriverNote] = useState("");
  const [signatureOpen, setSignatureOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const refresh = async () => {
    if (!pathname?.includes("/driver")) return;
    try {
      const data = await authRequest("/api/courier/routes?active=1", {
        method: "GET",
        cache: "no-store",
      });
      setRoutes(Array.isArray(data.routes) ? data.routes : []);
    } catch {
      // Driver page remains usable when no courier route is assigned.
    }
  };

  useEffect(() => {
    if (!pathname?.includes("/driver")) return;
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [pathname]);

  const activeRoute = useMemo(
    () =>
      routes.find((route) => {
        const hasOpenStops = route.stops.some((stop) => !TERMINAL.has(stop.status));
        const trackedStops = route.stops.filter((stop) => Boolean(stop.trackingCode));
        const loadReady =
          trackedStops.length === 0 ||
          trackedStops.every((stop) => Boolean(stop.loadedAt));
        return hasOpenStops && loadReady;
      }) || null,
    [routes]
  );

  const nextStop = useMemo(() => {
    if (!activeRoute) return null;
    return (
      [...activeRoute.stops]
        .sort((a, b) => a.sequence - b.sequence)
        .find((stop) => !TERMINAL.has(stop.status)) || null
    );
  }, [activeRoute]);

  const completedCount = useMemo(
    () =>
      activeRoute?.stops.filter((stop) => TERMINAL.has(stop.status)).length || 0,
    [activeRoute]
  );

  const proofTypes = new Set(nextStop?.proofTypes || []);
  const scanRequired = Boolean(nextStop?.trackingCode);
  const photoRequired = Boolean(settings?.photoProofEnabled);
  const signatureRequired = Boolean(settings?.signatureConfirmationEnabled);
  const scanReady = !scanRequired || proofTypes.has("scan");
  const photoReady = !photoRequired || proofTypes.has("photo");
  const signatureReady = !signatureRequired || proofTypes.has("signature");
  const canComplete = scanReady && photoReady && signatureReady;

  const saveProof = async (
    proofType: "scan" | "photo" | "signature" | "note",
    proofValue: string,
    note = ""
  ) => {
    if (!nextStop) return;
    setBusy(true);
    setStatusText("Saving proof...");
    try {
      await authRequest("/api/courier/proofs", {
        method: "POST",
        body: JSON.stringify({
          stopId: nextStop.id,
          proofType,
          proofValue,
          note,
        }),
      });
      setStatusText(
        proofType === "scan"
          ? "Package scan verified."
          : proofType === "photo"
          ? "Delivery photo saved."
          : proofType === "signature"
          ? "Signature saved."
          : "Delivery note saved."
      );
      await refresh();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Proof could not be saved.");
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const updateStop = async (
    stopStatus: "En Route" | "Arrived" | "Delivered" | "Failed"
  ) => {
    if (!nextStop) return;
    setBusy(true);
    setStatusText("Updating stop...");
    try {
      await authRequest("/api/courier/stops", {
        method: "PATCH",
        body: JSON.stringify({
          id: nextStop.id,
          status: stopStatus,
          failedReason: stopStatus === "Failed" ? failedReason : "",
          driverNote,
        }),
      });
      if (driverNote.trim()) {
        await saveProof("note", driverNote.trim(), "Driver delivery note").catch(() => {});
      }
      setStatusText(
        stopStatus === "Delivered"
          ? "Delivery completed. Loading the next stop..."
          : stopStatus === "Failed"
          ? "Failed delivery recorded. Loading the next stop..."
          : "Stop updated to " + stopStatus + "."
      );
      setFailedReason("");
      setDriverNote("");
      await refresh();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Stop update failed.");
    } finally {
      setBusy(false);
    }
  };

  const openDirections = () => {
    if (!nextStop?.address) return;
    const destination = encodeURIComponent(nextStop.address);
    const isApple =
      typeof navigator !== "undefined" &&
      /iPhone|iPad|Macintosh/i.test(navigator.userAgent);
    window.open(
      isApple
        ? "https://maps.apple.com/?daddr=" + destination
        : "https://www.google.com/maps/dir/?api=1&destination=" + destination,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const beginSignature = () => {
    setSignatureOpen(true);
    window.requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(180 * ratio);
      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(ratio, ratio);
      context.lineWidth = 2.25;
      context.lineCap = "round";
      context.strokeStyle = "#0f172a";
    });
  };

  const pointForEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top] as const;
  };

  const startDraw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const [x, y] = pointForEvent(event);
    drawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(x, y);
  };

  const continueDraw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const [x, y] = pointForEvent(event);
    context.lineTo(x, y);
    context.stroke();
  };

  const endDraw = () => {
    drawingRef.current = false;
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const value = canvas.toDataURL("image/png");
    await saveProof("signature", value);
    setSignatureOpen(false);
  };

  if (!pathname?.includes("/driver") || !activeRoute || !nextStop) return null;

  return (
    <div className="pointer-events-none fixed bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] right-4 z-[79] w-[min(25rem,calc(100vw-2rem))]">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pointer-events-auto ml-auto flex items-center gap-3 rounded-full bg-slate-950 px-4 py-3 text-left text-white shadow-2xl"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
            <Navigation className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
              Next Stop
            </p>
            <p className="max-w-[15rem] truncate text-sm font-bold">
              {nextStop.address}
            </p>
            <p className="text-[11px] text-slate-500">
              {completedCount + 1} of {activeRoute.stops.length} • {activeRoute.name}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </button>
      ) : (
        <div className="pointer-events-auto max-h-[78vh] overflow-y-auto rounded-3xl border border-black/5 bg-white/98 p-4 text-slate-950 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">
                NEXT STOP • {completedCount + 1}/{activeRoute.stops.length}
              </p>
              <h3 className="mt-1 text-xl font-black">
                {nextStop.customerName || "Courier Customer"}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Close courier next stop"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-black/10 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
              <div className="min-w-0">
                <p className="font-semibold">{nextStop.address}</p>
                {nextStop.timeWindowStart || nextStop.timeWindowEnd ? (
                  <p className="mt-1 text-xs text-amber-700">
                    Window: {nextStop.timeWindowStart || "open"} – {nextStop.timeWindowEnd || "open"}
                  </p>
                ) : null}
              </div>
            </div>
            {nextStop.packageLocation ? (
              <p className="mt-3 rounded-xl bg-slate-950/10 px-3 py-2 text-sm text-slate-800">
                Package location: <strong>{nextStop.packageLocation}</strong>
              </p>
            ) : null}
            {nextStop.instructions ? (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {nextStop.instructions}
              </p>
            ) : null}
            {nextStop.trackingCode ? (
              <p className="mt-2 text-xs text-slate-400">
                Tracking: {nextStop.trackingCode}
              </p>
            ) : null}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={openDirections}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white"
            >
              <Navigation className="h-4 w-4" /> Directions
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void updateStop(nextStop.status === "En Route" ? "Arrived" : "En Route")
              }
              className="min-h-11 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40"
            >
              {nextStop.status === "En Route" ? "I’m Here" : "Start Stop"}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-black/10 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="inline-flex items-center gap-2 text-sm font-bold">
                  <ScanLine className="h-4 w-4 text-emerald-600" /> Package Scan
                </p>
                {proofTypes.has("scan") || !scanRequired ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                  </span>
                ) : (
                  <span className="text-xs text-amber-700">Required</span>
                )}
              </div>
              {nextStop.trackingCode && !proofTypes.has("scan") ? (
                <ScanVerificationPanel
                  expectedToken={nextStop.trackingCode}
                  label="Scan package at delivery"
                  onVerified={async (token) => {
                    await saveProof("scan", token);
                  }}
                />
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="cursor-pointer rounded-2xl border border-black/10 bg-slate-50 p-3 text-sm">
                <Camera className="h-4 w-4 text-white" />
                <span className="mt-2 block font-bold">
                  {proofTypes.has("photo") ? "Photo Saved" : "Delivery Photo"}
                </span>
                <span className="mt-1 block text-xs text-slate-400">
                  {photoRequired ? "Required by company policy" : "Optional proof"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void compressImage(file)
                        .then((value) => saveProof("photo", value))
                        .catch((error) =>
                          setStatusText(
                            error instanceof Error ? error.message : "Photo could not be saved."
                          )
                        );
                    }
                    event.currentTarget.value = "";
                  }}
                />
              </label>

              <button
                type="button"
                onClick={beginSignature}
                className="rounded-2xl border border-black/10 bg-slate-50 p-3 text-left text-sm"
              >
                <PenLine className="h-4 w-4 text-violet-300" />
                <span className="mt-2 block font-bold">
                  {proofTypes.has("signature") ? "Signature Saved" : "Signature"}
                </span>
                <span className="mt-1 block text-xs text-slate-400">
                  {signatureRequired ? "Required by company policy" : "Optional proof"}
                </span>
              </button>
            </div>

            {signatureOpen ? (
              <div className="rounded-2xl border border-violet-300/20 bg-violet-500/5 p-3">
                <p className="text-sm font-bold">Customer signature</p>
                <canvas
                  ref={canvasRef}
                  onPointerDown={startDraw}
                  onPointerMove={continueDraw}
                  onPointerUp={endDraw}
                  onPointerCancel={endDraw}
                  className="mt-2 h-[180px] w-full touch-none rounded-xl border border-black/10 bg-white"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const canvas = canvasRef.current;
                      const context = canvas?.getContext("2d");
                      if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
                    }}
                    className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveSignature()}
                    className="flex-1 rounded-xl bg-violet-400 px-3 py-2 text-sm font-black text-white disabled:opacity-40"
                  >
                    Save Signature
                  </button>
                </div>
              </div>
            ) : null}

            <textarea
              value={driverNote}
              onChange={(event) => setDriverNote(event.target.value)}
              rows={2}
              placeholder="Driver note (gate code, left with front desk, etc.)"
              className="w-full rounded-xl border border-black/10 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-cyan-400/40"
            />

            <button
              type="button"
              disabled={busy || !canComplete}
              onClick={() => void updateStop("Delivered")}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              <PackageCheck className="h-5 w-5" /> Complete Delivery
            </button>

            {!canComplete ? (
              <p className="text-center text-xs text-amber-700">
                Finish required proof first:
                {!scanReady ? " package scan" : ""}
                {!photoReady ? " photo" : ""}
                {!signatureReady ? " signature" : ""}.
              </p>
            ) : null}

            <div className="rounded-2xl border border-rose-400/15 bg-rose-500/5 p-3">
              <p className="inline-flex items-center gap-2 text-sm font-bold text-rose-700">
                <TriangleAlert className="h-4 w-4" /> Failed Delivery
              </p>
              <select
                value={failedReason}
                onChange={(event) => setFailedReason(event.target.value)}
                className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm"
              >
                <option value="">Choose reason</option>
                <option>Customer unavailable</option>
                <option>Bad / incomplete address</option>
                <option>Business closed</option>
                <option>Access blocked</option>
                <option>Package refused</option>
                <option>Unsafe delivery location</option>
                <option>Other</option>
              </select>
              <button
                type="button"
                disabled={busy || !failedReason}
                onClick={() => void updateStop("Failed")}
                className="mt-2 w-full rounded-xl border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-sm font-bold text-rose-700 disabled:opacity-35"
              >
                Record Failed Attempt
              </button>
            </div>
          </div>

          {statusText ? (
            <p className="mt-3 rounded-xl border border-cyan-400/15 bg-slate-950/5 px-3 py-2 text-sm text-slate-800" aria-live="polite">
              {statusText}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
