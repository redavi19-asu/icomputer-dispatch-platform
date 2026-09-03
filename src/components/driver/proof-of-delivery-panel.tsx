"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, RotateCcw, Signature } from "lucide-react";
import {
  getMissingProofRequirements,
  readProofOfDelivery,
  updateProofOfDelivery,
  type ProofOfDeliveryRecord,
  type ProofRequirements,
} from "@/lib/platform/proof-of-delivery";

type Props = {
  companySlug: string;
  jobId: string;
  requirements: ProofRequirements;
  onChange?: (record: ProofOfDeliveryRecord) => void;
};

export function ProofOfDeliveryPanel({
  companySlug,
  jobId,
  requirements,
  onChange,
}: Props) {
  const [record, setRecord] = useState<ProofOfDeliveryRecord>(() =>
    readProofOfDelivery(companySlug, jobId)
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    setRecord(readProofOfDelivery(companySlug, jobId));
  }, [companySlug, jobId]);

  const save = (patch: Partial<ProofOfDeliveryRecord>) => {
    const next = updateProofOfDelivery(companySlug, jobId, patch);
    setRecord(next);
    onChange?.(next);
    return next;
  };

  const handlePhoto = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      window.alert("Photo must be 5 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        save({ photoDataUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startSignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const point = getPoint(event);
    if (!canvas || !point) return;
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const drawSignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const point = getPoint(event);
    if (!canvas || !point) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const finishSignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !drawingRef.current) return;
    drawingRef.current = false;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    save({ signatureDataUrl: canvas.toDataURL("image/png") });
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    save({ signatureDataUrl: null });
  };

  const missing = getMissingProofRequirements(record, requirements);

  if (!requirements.proofOfDeliveryEnabled) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Proof of delivery</p>
          <p className="mt-1 text-xs text-white/55">
            Required proof must be captured before this job can be completed.
          </p>
        </div>
        {missing.length === 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" /> Ready
          </span>
        ) : null}
      </div>

      <label className="mt-4 block space-y-2">
        <span className="text-xs font-medium text-white/75">Recipient name</span>
        <input
          value={record.recipientName}
          onChange={(event) => save({ recipientName: event.target.value })}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50"
          placeholder="Name of person receiving service or delivery"
        />
      </label>

      {requirements.photoProofEnabled ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-white/85">
            <Camera className="h-4 w-4" /> Photo proof
          </div>
          {record.photoDataUrl ? (
            <img
              src={record.photoDataUrl}
              alt="Captured proof"
              className="mt-3 max-h-52 w-full rounded-lg object-cover"
            />
          ) : null}
          <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100">
            {record.photoDataUrl ? "Replace photo" : "Take or choose photo"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(event) => handlePhoto(event.target.files?.[0])}
            />
          </label>
        </div>
      ) : null}

      {requirements.signatureConfirmationEnabled ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-white/85">
              <Signature className="h-4 w-4" /> Recipient signature
            </div>
            <button
              type="button"
              onClick={clearSignature}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-white/10 px-3 text-xs text-white/70 hover:bg-white/5"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={640}
            height={220}
            aria-label="Signature pad"
            onPointerDown={startSignature}
            onPointerMove={drawSignature}
            onPointerUp={finishSignature}
            onPointerCancel={finishSignature}
            className="mt-3 h-36 w-full touch-none rounded-lg border border-white/15 bg-slate-900"
          />
          {record.signatureDataUrl ? (
            <p className="mt-2 text-xs text-emerald-300">Signature captured.</p>
          ) : (
            <p className="mt-2 text-xs text-white/45">Sign inside the box above.</p>
          )}
        </div>
      ) : null}

      {missing.length > 0 ? (
        <p className="mt-4 text-xs font-medium text-amber-300">
          Still required: {missing.join(", ")}.
        </p>
      ) : null}
    </section>
  );
}
