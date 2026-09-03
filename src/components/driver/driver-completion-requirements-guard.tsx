"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, MapPin, ShieldCheck, X } from "lucide-react";
import { ProofOfDeliveryPanel } from "@/components/driver/proof-of-delivery-panel";
import { getStoredSession } from "@/lib/dispatchos-auth";
import {
  getMissingProofRequirements,
  markBaseStopComplete,
  readProofOfDelivery,
  type ProofOfDeliveryRecord,
} from "@/lib/platform/proof-of-delivery";
import { readWorkspaceSettings } from "@/lib/platform/workspace-preferences";

type ApiJob = {
  id: string;
  createdAt?: string;
  status: string;
  companySlug?: string | null;
  deliveryVerifiedAt?: string | null;
  handoffVerifiedAt?: string | null;
};

const LOCAL_JOBS_KEY = "dispatch_jobs";

const operationalPath = () => {
  if (typeof window === "undefined") return "";
  return window.location.pathname.replace(/^\/icomputer-dispatch-platform/, "");
};

const loadJobs = (): ApiJob[] => {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(LOCAL_JOBS_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export function DriverCompletionRequirementsGuard() {
  const [job, setJob] = useState<ApiJob | null>(null);
  const [open, setOpen] = useState(false);
  const [proof, setProof] = useState<ProofOfDeliveryRecord | null>(null);
  const [message, setMessage] = useState("");

  const session = typeof window !== "undefined" ? getStoredSession() : null;
  const companySlug = session?.company?.slug ?? "";
  const settings = useMemo(
    () => (companySlug ? readWorkspaceSettings(companySlug) : null),
    [companySlug, open]
  );

  const refreshJob = () => {
    if (!companySlug) return null;
    const current = loadJobs()
      .filter(
        (item) =>
          item.status !== "Completed" &&
          item.status !== "Cancelled" &&
          (!item.companySlug || item.companySlug === companySlug)
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      )[0] ?? null;
    setJob(current);
    if (current) setProof(readProofOfDelivery(companySlug, current.id));
    return current;
  };

  useEffect(() => {
    if (operationalPath() !== "/driver" || !companySlug) return;

    refreshJob();
    const timer = window.setInterval(refreshJob, 2500);

    const intercept = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      if (!button) return;
      const label = (button.textContent || "").replace(/\s+/g, " ").trim();
      if (label !== "Confirm Completion") return;

      const currentJob = refreshJob();
      if (!currentJob) return;
      const currentSettings = readWorkspaceSettings(companySlug);
      const currentProof = readProofOfDelivery(companySlug, currentJob.id);

      const missing = getMissingProofRequirements(currentProof, {
        proofOfDeliveryEnabled: currentSettings.proofOfDeliveryEnabled,
        photoProofEnabled: currentSettings.photoProofEnabled,
        signatureConfirmationEnabled: currentSettings.signatureConfirmationEnabled,
      });

      const needsDeliveryVerification =
        currentSettings.deliveryVerificationEnabled && !currentJob.deliveryVerifiedAt;
      const needsHandoff =
        currentSettings.driverMustConfirmHandoff &&
        currentSettings.qrHandoffEnabled &&
        !currentJob.handoffVerifiedAt;
      const needsBaseStop =
        currentSettings.baseRequiredBeforeFinalStop && !currentProof.baseStopCompletedAt;

      if (!missing.length && !needsDeliveryVerification && !needsHandoff && !needsBaseStop) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const requirements = [
        ...missing,
        ...(needsDeliveryVerification ? ["delivery verification"] : []),
        ...(needsHandoff ? ["QR/barcode handoff verification"] : []),
        ...(needsBaseStop ? ["required base stop"] : []),
      ];

      setJob(currentJob);
      setProof(currentProof);
      setMessage(`Complete these first: ${requirements.join(", ")}.`);
      setOpen(true);
    };

    document.addEventListener("click", intercept, true);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("click", intercept, true);
    };
  }, [companySlug]);

  if (!open || !job || !settings || !companySlug) return null;

  const currentProof = proof ?? readProofOfDelivery(companySlug, job.id);
  const missingProof = getMissingProofRequirements(currentProof, {
    proofOfDeliveryEnabled: settings.proofOfDeliveryEnabled,
    photoProofEnabled: settings.photoProofEnabled,
    signatureConfirmationEnabled: settings.signatureConfirmationEnabled,
  });
  const needsDeliveryVerification = settings.deliveryVerificationEnabled && !job.deliveryVerifiedAt;
  const needsHandoff =
    settings.driverMustConfirmHandoff && settings.qrHandoffEnabled && !job.handoffVerifiedAt;
  const needsBaseStop = settings.baseRequiredBeforeFinalStop && !currentProof.baseStopCompletedAt;

  const allReady =
    missingProof.length === 0 && !needsDeliveryVerification && !needsHandoff && !needsBaseStop;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/65 p-3 backdrop-blur-sm sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-cyan-400/25 bg-slate-950 p-5 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Completion Requirements
            </p>
            <h2 className="mt-2 text-xl font-semibold">Finish verification for this job</h2>
            <p className="mt-2 text-sm text-white/60">{message}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 hover:bg-white/10"
            aria-label="Close completion requirements"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {settings.proofOfDeliveryEnabled ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <ProofOfDeliveryPanel
              companySlug={companySlug}
              jobId={job.id}
              enabled={settings.proofOfDeliveryEnabled}
              photoRequired={settings.photoProofEnabled}
              signatureRequired={settings.signatureConfirmationEnabled}
              onChange={(next) => setProof(next)}
            />
          </div>
        ) : null}

        {needsDeliveryVerification || needsHandoff ? (
          <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Scan verification still required</p>
                <p className="mt-1 text-amber-100/75">
                  {needsDeliveryVerification && needsHandoff
                    ? "Complete the delivery verification and the QR/barcode handoff scan before finishing the job."
                    : needsDeliveryVerification
                    ? "Complete the delivery verification before finishing the job."
                    : "Use the QR / Barcode scanner to verify the handoff before finishing the job."}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {needsBaseStop ? (
          <div className="mt-4 rounded-2xl border border-violet-400/25 bg-violet-500/10 p-4">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-violet-200" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-violet-100">Required base stop</p>
                <p className="mt-1 text-sm text-violet-100/70">
                  {settings.baseAddress || "Company base address is not configured."}
                </p>
                {settings.baseAddress ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.baseAddress)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-violet-300/25 bg-violet-400/10 px-3 py-2 text-sm font-semibold text-violet-100"
                    >
                      Directions to Base
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const next = markBaseStopComplete(companySlug, job.id);
                        setProof(next);
                        setMessage("Base stop recorded. Finish any remaining requirements, then confirm completion again.");
                      }}
                      className="rounded-xl bg-violet-300 px-3 py-2 text-sm font-bold text-slate-950"
                    >
                      Confirm Base Stop
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {allReady ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-emerald-100">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">All completion requirements are ready.</p>
              <p className="mt-1 text-sm text-emerald-100/70">
                Close this panel and press Confirm Completion again.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
