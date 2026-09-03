"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, MapPin, X } from "lucide-react";
import { getStoredSession } from "@/lib/dispatchos-auth";
import {
  markReturnedToBase,
  readProofOfDelivery,
} from "@/lib/platform/proof-of-delivery";
import { readWorkspaceSettings } from "@/lib/platform/workspace-preferences";

type ApiJob = {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  status: string;
  companySlug?: string | null;
  name?: string | null;
};

const LOCAL_JOBS_KEY = "dispatch_jobs";

const loadJobs = (): ApiJob[] => {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_JOBS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizedPath = () =>
  typeof window === "undefined"
    ? ""
    : window.location.pathname.replace(/^\/icomputer-dispatch-platform/, "");

export function DriverReturnToBasePrompt() {
  const [job, setJob] = useState<ApiJob | null>(null);
  const [dismissedJobId, setDismissedJobId] = useState<string | null>(null);
  const [returned, setReturned] = useState(false);

  const session = typeof window !== "undefined" ? getStoredSession() : null;
  const companySlug = session?.company?.slug ?? "";
  const settings = useMemo(
    () => (companySlug ? readWorkspaceSettings(companySlug) : null),
    [companySlug, job?.id]
  );

  useEffect(() => {
    if (normalizedPath() !== "/driver" || !companySlug) return;

    const sync = () => {
      const currentSettings = readWorkspaceSettings(companySlug);
      if (!currentSettings.returnToBaseAfterCompletion || !currentSettings.baseAddress) {
        setJob(null);
        return;
      }

      const candidate = loadJobs()
        .filter(
          (item) =>
            item.status === "Completed" &&
            (!item.companySlug || item.companySlug === companySlug)
        )
        .sort(
          (a, b) =>
            new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
            new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()
        )[0] ?? null;

      if (!candidate || candidate.id === dismissedJobId) {
        setJob(null);
        return;
      }

      const proof = readProofOfDelivery(companySlug, candidate.id);
      if (proof.returnedToBaseAt) {
        setJob(null);
        return;
      }

      const timestamp = new Date(candidate.updatedAt ?? candidate.createdAt ?? 0).getTime();
      const recentEnough = Number.isFinite(timestamp) && Date.now() - timestamp < 6 * 60 * 60 * 1000;
      setJob(recentEnough ? candidate : null);
    };

    sync();
    const timer = window.setInterval(sync, 2500);
    window.addEventListener("storage", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", sync);
    };
  }, [companySlug, dismissedJobId]);

  if (!job || !settings?.returnToBaseAfterCompletion || !settings.baseAddress) return null;

  return (
    <div className="fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[115] mx-auto max-w-md rounded-[1.75rem] border border-violet-300/25 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-violet-400/10 p-2 text-violet-200">
            {returned ? <CheckCircle2 className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
              Return to Base
            </p>
            <p className="mt-1 font-semibold">
              {returned ? "Return recorded" : `${job.name ?? "Job"} is complete`}
            </p>
            <p className="mt-1 text-sm text-white/60">{settings.baseAddress}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setDismissedJobId(job.id);
            setJob(null);
          }}
          className="rounded-lg p-2 text-white/55 hover:bg-white/10"
          aria-label="Dismiss return to base prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!returned ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.baseAddress)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-violet-300/25 bg-violet-400/10 px-3 py-3 text-center text-sm font-semibold text-violet-100"
          >
            Directions to Base
          </a>
          <button
            type="button"
            onClick={() => {
              markReturnedToBase(companySlug, job.id);
              setReturned(true);
              window.setTimeout(() => {
                setDismissedJobId(job.id);
                setJob(null);
                setReturned(false);
              }, 1400);
            }}
            className="rounded-xl bg-violet-300 px-3 py-3 text-sm font-bold text-slate-950"
          >
            Returned to Base
          </button>
        </div>
      ) : null}
    </div>
  );
}
