"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ScanLine, X } from "lucide-react";
import { ScanVerificationPanel } from "@/components/driver/scan-verification-panel";
import { readWorkspaceSettings } from "@/lib/platform/workspace-preferences";

type ApiJob = {
  id: string;
  createdAt?: string;
  status: string;
  companySlug?: string | null;
  verificationToken?: string | null;
  pickupVerificationToken?: string | null;
  deliveryVerificationToken?: string | null;
  pickupVerifiedAt?: string | null;
  deliveryVerifiedAt?: string | null;
  handoffVerifiedAt?: string | null;
};

type VerificationAction = "confirm-pickup" | "confirm-delivery" | "confirm-handoff";

const LOCAL_JOBS_KEY = "dispatch_jobs";
const COMPANY_SLUG = "build-electric";

const withBasePath = (path: string) => {
  const base = process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
};

const loadLocalJobs = (): ApiJob[] => {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_JOBS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLocalVerification = (jobId: string, action: VerificationAction) => {
  const jobs = loadLocalJobs();
  const index = jobs.findIndex((job) => job.id === jobId);
  if (index < 0) return null;
  const now = new Date().toISOString();
  const job = { ...jobs[index] };
  if (action === "confirm-pickup") job.pickupVerifiedAt = now;
  if (action === "confirm-delivery") job.deliveryVerifiedAt = now;
  if (action === "confirm-handoff") job.handoffVerifiedAt = now;
  jobs[index] = job;
  window.localStorage.setItem(LOCAL_JOBS_KEY, JSON.stringify(jobs));
  window.dispatchEvent(new Event("storage"));
  return job;
};

const fetchJobs = async (): Promise<ApiJob[]> => {
  if (typeof window === "undefined") return [];
  if (window.location.hostname.includes("github.io")) return loadLocalJobs();
  try {
    const response = await fetch(withBasePath(`/api/jobs?company=${encodeURIComponent(COMPANY_SLUG)}`), { cache: "no-store" });
    if (!response.ok) throw new Error("jobs unavailable");
    const data = await response.json();
    return Array.isArray(data.jobs) ? data.jobs : [];
  } catch {
    return loadLocalJobs();
  }
};

export function DriverScanLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const settings = useMemo(() => readWorkspaceSettings(COMPANY_SLUG), [refreshKey]);

  useEffect(() => {
    if (!pathname?.includes("/driver")) return;
    let cancelled = false;
    const sync = async () => {
      const next = await fetchJobs();
      if (!cancelled) setJobs(next);
    };
    void sync();
    const timer = window.setInterval(sync, 3000);
    const onStorage = () => { setRefreshKey((value) => value + 1); void sync(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener("dispatch:workspace-settings-updated", onStorage as EventListener);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("dispatch:workspace-settings-updated", onStorage as EventListener);
    };
  }, [pathname]);

  const activeJob = useMemo(() => {
    return jobs
      .filter((job) => job.status !== "Completed" && job.status !== "Cancelled")
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0] ?? null;
  }, [jobs]);

  const checkpoint = useMemo(() => {
    if (!activeJob || !settings.qrHandoffEnabled) return null;

    const pickupPending = settings.pickupVerificationEnabled && activeJob.pickupVerificationToken && !activeJob.pickupVerifiedAt;
    if (pickupPending && ["Arrived at Pickup", "Pickup Required", "Pickup Verified"].includes(activeJob.status)) {
      return { action: "confirm-pickup" as const, token: activeJob.pickupVerificationToken!, label: "Pickup verification" };
    }

    const deliveryPending = settings.deliveryVerificationEnabled && activeJob.deliveryVerificationToken && !activeJob.deliveryVerifiedAt;
    if (deliveryPending && ["Delivered", "Dropoff Required", "Delivery Verified", "In Progress"].includes(activeJob.status)) {
      return { action: "confirm-delivery" as const, token: activeJob.deliveryVerificationToken!, label: "Delivery verification" };
    }

    if (activeJob.verificationToken && !activeJob.handoffVerifiedAt) {
      return { action: "confirm-handoff" as const, token: activeJob.verificationToken, label: "Handoff verification" };
    }

    return null;
  }, [activeJob, settings]);

  const recordVerification = async (token: string) => {
    if (!activeJob || !checkpoint || token !== checkpoint.token) throw new Error("Invalid code");

    if (window.location.hostname.includes("github.io")) {
      const updated = saveLocalVerification(activeJob.id, checkpoint.action);
      if (!updated) throw new Error("Job not found");
      setJobs((current) => current.map((job) => job.id === updated.id ? updated : job));
      return;
    }

    try {
      const response = await fetch(withBasePath("/api/jobs"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeJob.id, verificationAction: checkpoint.action, verificationToken: token }),
      });
      if (!response.ok) throw new Error("Verification failed");
      const data = await response.json();
      const updated = data.job as ApiJob | undefined;
      if (!updated) throw new Error("Verification failed");
      setJobs((current) => current.map((job) => job.id === updated.id ? updated : job));
    } catch {
      const updated = saveLocalVerification(activeJob.id, checkpoint.action);
      if (!updated) throw new Error("Verification failed");
      setJobs((current) => current.map((job) => job.id === updated.id ? updated : job));
    }
  };

  if (!pathname?.includes("/driver") || !settings.qrHandoffEnabled || !activeJob) return null;

  return (
    <div className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[80] w-[min(24rem,calc(100vw-2rem))]">
      {!open ? (
        <button
          type="button"
          disabled={!checkpoint}
          onClick={() => setOpen(true)}
          className="pointer-events-auto ml-auto flex min-h-12 items-center gap-2 rounded-full border border-cyan-300/40 bg-slate-950/95 px-4 py-3 text-sm font-bold text-cyan-100 shadow-xl backdrop-blur disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ScanLine className="h-5 w-5" /> {checkpoint ? "Scan QR / Barcode" : "No scan required"}
        </button>
      ) : (
        <div className="pointer-events-auto rounded-3xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between px-1 pb-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Job scanner</p>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-white/70 hover:bg-white/10" aria-label="Close job scanner"><X className="h-4 w-4" /></button>
          </div>
          {checkpoint ? (
            <ScanVerificationPanel expectedToken={checkpoint.token} label={checkpoint.label} onVerified={recordVerification} />
          ) : (
            <p className="p-3 text-sm text-white/65">This job has no pending QR/barcode verification checkpoint.</p>
          )}
        </div>
      )}
    </div>
  );
}
