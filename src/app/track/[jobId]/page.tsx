"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Clock3, MapPin, ShieldCheck, UserRound } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  TRACKING_STAGES,
  getDisplayStatusLabel,
  type JobTimelineEvent,
} from "@/lib/platform/job-lifecycle";
import {
  readWorkspaceSettings,
  type WorkspaceSettingsState,
} from "@/lib/platform/workspace-preferences";
import { getCompanyBySlug, getDriversByCompany } from "@/lib/platform/selectors";

type TrackJob = {
  id: string;
  status: string;
  createdAt: string;
  etaMinutes?: number | null;
  driverId?: string | null;
  service?: string | null;
  address?: string | null;
  companySlug?: string | null;
  statusHistory?: JobTimelineEvent[];
  handoffVerifiedAt?: string | null;
};

const WORKSPACE_SETTINGS_UPDATED_EVENT = "dispatch:workspace-settings-updated";

export default function TrackJobPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = Array.isArray(params.jobId) ? params.jobId[0] : params.jobId;

  const [job, setJob] = useState<TrackJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettingsState>(() =>
    readWorkspaceSettings("build-electric")
  );

  useEffect(() => {
    const syncSettings = () => {
      setWorkspaceSettings(readWorkspaceSettings("build-electric"));
    };

    syncSettings();
    window.addEventListener("storage", syncSettings);
    window.addEventListener(WORKSPACE_SETTINGS_UPDATED_EVENT, syncSettings as EventListener);

    return () => {
      window.removeEventListener("storage", syncSettings);
      window.removeEventListener(WORKSPACE_SETTINGS_UPDATED_EVENT, syncSettings as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!jobId) return;

    let isMounted = true;

    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/jobs?id=${encodeURIComponent(jobId)}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Job not found");
        }

        const data = await res.json();

        if (isMounted) {
          setJob(data.job ?? null);
          setError(null);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setError("We could not find this tracking record.");
          setIsLoading(false);
        }
      }
    };

    fetchJob();
    const interval = setInterval(fetchJob, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [jobId]);

  const driverName = useMemo(() => {
    if (!job?.driverId || !job.companySlug) return "Driver pending";
    const company = getCompanyBySlug(job.companySlug);
    if (!company) return "Driver assigned";
    const drivers = getDriversByCompany(company.id);
    return drivers.find((driver) => driver.id === job.driverId)?.name ?? "Driver assigned";
  }, [job?.driverId, job?.companySlug]);

  const timeline = useMemo(() => {
    return Array.isArray(job?.statusHistory) ? [...job.statusHistory].reverse() : [];
  }, [job?.statusHistory]);

  const reachedStageSet = useMemo(() => {
    const set = new Set<string>();
    if (!job?.statusHistory) return set;

    job.statusHistory.forEach((event) => {
      if (event.status) {
        set.add(event.status);
      }
    });

    return set;
  }, [job?.statusHistory]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-xl">Loading tracking...</div>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-semibold">Tracking unavailable</h1>
          <p className="mt-2 text-white/70">{error ?? "Tracking record not found."}</p>
          <Link
            href="/booking"
            className="mt-4 inline-flex rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/85 hover:bg-white/15"
          >
            Back to booking
          </Link>
        </div>
      </main>
    );
  }

  if (!workspaceSettings.customerTrackingEnabled) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-semibold">Tracking disabled</h1>
          <p className="mt-2 text-white/70">
            Customer tracking is currently disabled by workspace settings.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
          {workspaceSettings.companyName} Tracking
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Job {job.id}</h1>
        <p className="mt-2 text-sm text-white/65">Live tracking and service progress updates.</p>

        <Card className="mt-5 rounded-2xl border border-white/10 bg-white/5 text-white shadow-none">
          <CardContent className="p-5">
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Status</span>
                <span className="rounded-full border border-cyan-400/35 bg-cyan-500/15 px-3 py-1 text-cyan-100">
                  {getDisplayStatusLabel(job.status)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Driver</span>
                <span className="text-white">{driverName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">ETA</span>
                <span className="text-white">
                  {job.etaMinutes != null ? `${job.etaMinutes} min` : "Estimating..."}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-white/60">Address</span>
                <span className="text-right text-white/85">{job.address ?? "Pending"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4 rounded-2xl border border-white/10 bg-white/5 text-white shadow-none">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-cyan-200">Progress</p>
            <div className="mt-3 space-y-2">
              {TRACKING_STAGES.map((stage) => {
                const reached = reachedStageSet.has(stage.status);
                return (
                  <div key={stage.status} className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        reached ? "bg-emerald-300" : "bg-white/25"
                      }`}
                    />
                    <span className={reached ? "text-white" : "text-white/60"}>{stage.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4 rounded-2xl border border-white/10 bg-white/5 text-white shadow-none">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-cyan-200">Timeline</p>
            <div className="mt-3 space-y-3">
              {timeline.map((event, index) => (
                <div key={`${event.at}-${index}`} className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">{event.label}</p>
                    <p className="text-[11px] text-white/50">
                      {new Date(event.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {event.detail ? <p className="mt-1 text-xs text-white/65">{event.detail}</p> : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {workspaceSettings.proofOfDeliveryEnabled || workspaceSettings.qrHandoffEnabled ? (
          <Card className="mt-4 rounded-2xl border border-white/10 bg-white/5 text-white shadow-none">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-cyan-300" />
                <div>
                  <p className="text-sm font-semibold text-white">Handoff verification</p>
                  <p className="mt-1 text-xs text-white/65">
                    QR handoff foundation is active. Full scanner rollout can be connected next.
                  </p>
                  <p className="mt-2 text-xs text-cyan-200">
                    {job.handoffVerifiedAt
                      ? `Verified at ${new Date(job.handoffVerifiedAt).toLocaleString()}`
                      : "Pending final verification"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="mt-4 flex items-center gap-3 text-xs text-white/55">
          <MapPin className="h-4 w-4" />
          <Clock3 className="h-4 w-4" />
          <UserRound className="h-4 w-4" />
          Updates refresh automatically.
        </div>
      </section>
    </main>
  );
}
