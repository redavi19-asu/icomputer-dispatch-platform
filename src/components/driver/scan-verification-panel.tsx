"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Keyboard, QrCode, ScanLine, X } from "lucide-react";

type ScanVerificationPanelProps = {
  expectedToken: string;
  label: string;
  disabled?: boolean;
  onVerified: (token: string) => Promise<void> | void;
};

type DetectedBarcode = { rawValue?: string };
type BarcodeDetectorInstance = {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

const SUPPORTED_FORMATS = [
  "qr_code",
  "code_128",
  "code_39",
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
];

export function ScanVerificationPanel({
  expectedToken,
  label,
  disabled = false,
  onVerified,
}: ScanVerificationPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const stopCamera = () => {
    if (scanTimerRef.current !== null) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  useEffect(() => stopCamera, []);

  const verifyValue = async (value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      setStatus("Scan or enter a code first.");
      return;
    }
    if (normalized !== expectedToken) {
      setStatus("That code does not match this job.");
      return;
    }

    setBusy(true);
    setStatus("Code matched. Recording verification...");
    try {
      await onVerified(normalized);
      setStatus(`${label} verified.`);
      stopCamera();
    } catch {
      setStatus("The code matched, but verification could not be saved. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const startCamera = async () => {
    setStatus(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Camera scanning is not available in this browser. Use manual code entry below.");
      return;
    }
    if (!window.BarcodeDetector) {
      setStatus("Live barcode detection is not supported here. Use manual code entry below.");
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

      const detector = new window.BarcodeDetector({ formats: SUPPORTED_FORMATS });
      scanTimerRef.current = window.setInterval(async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || busy) return;
        try {
          const results = await detector.detect(video);
          const value = results[0]?.rawValue?.trim();
          if (value) {
            setManualValue(value);
            await verifyValue(value);
          }
        } catch {
          // Keep scanning. Some browsers can throw transient frame errors.
        }
      }, 550);
    } catch {
      setStatus("Camera permission was denied or the camera could not start. Use manual entry below.");
      stopCamera();
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-500/35 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ScanLine className="h-4 w-4" /> Scan QR / Barcode
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-white">
            <QrCode className="h-4 w-4 text-cyan-300" /> {label}
          </p>
          <p className="mt-1 text-xs text-white/55">QR, Code 128, Code 39, EAN and UPC supported when the device browser provides BarcodeDetector.</p>
        </div>
        <button type="button" onClick={() => { stopCamera(); setOpen(false); }} className="rounded-lg p-2 text-white/70 hover:bg-white/10" aria-label="Close scanner">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/30">
        <video ref={videoRef} muted playsInline className={`aspect-video w-full object-cover ${cameraActive ? "block" : "hidden"}`} />
        {!cameraActive ? (
          <div className="flex aspect-video items-center justify-center p-6 text-center text-sm text-white/55">
            Camera preview appears here after you press Start Camera.
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => void startCamera()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">
          <Camera className="h-4 w-4" /> {cameraActive ? "Restart Camera" : "Start Camera"}
        </button>
        {cameraActive ? (
          <button type="button" onClick={stopCamera} className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80">Stop Camera</button>
        ) : null}
      </div>

      <div className="mt-3">
        <label className="text-xs uppercase tracking-[0.16em] text-white/50">Manual code fallback</label>
        <div className="mt-1 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Keyboard className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-white/35" />
            <input
              value={manualValue}
              onChange={(event) => setManualValue(event.target.value)}
              placeholder="Enter scanned code"
              className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 pl-9 pr-3 text-base text-white outline-none focus:border-cyan-400/60"
            />
          </div>
          <button type="button" disabled={busy} onClick={() => void verifyValue(manualValue)} className="min-h-11 rounded-xl border border-cyan-500/35 bg-cyan-500/15 px-4 text-sm font-semibold text-cyan-100 disabled:opacity-50">Verify</button>
        </div>
      </div>

      {status ? <p className="mt-3 text-sm text-cyan-100" aria-live="polite">{status}</p> : null}
    </div>
  );
}
