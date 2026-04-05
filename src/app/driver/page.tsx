"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CarFront, Clock3, MapPin, Menu, Phone, User } from "lucide-react";

import {
  getBroadcastAlerts,
  persistBroadcastAlerts,
  clearBroadcastAlert,
} from "@/lib/utils";
import type { BroadcastAlert } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { getDriversByCompany, getCompanyBySlug } from "@/lib/platform/selectors";
import { DriverLeafletMap } from "@/components/driver/driver-leaflet-map";
import type { RouteData } from "@/components/driver/driver-leaflet-map";
import {
  resolveDriverAcceptanceMode,
  type DriverAcceptanceMode,
} from "@/lib/platform/driver-acceptance-mode";
import {
  readWorkspaceSettings,
  type WorkspaceSettingsState,
} from "@/lib/platform/workspace-preferences";
import {
  getDisplayStatusLabel,
  getStatusFlowForMode,
  getTrackingStagesForMode,
  type JobTimelineEvent,
} from "@/lib/platform/job-lifecycle";

const WORKSPACE_SETTINGS_UPDATED_EVENT = "dispatch:workspace-settings-updated";

type ApiJob = {
  id: string;
  createdAt: string;
  status: string;
  companySlug?: string | null;
  name?: string | null;
  phone?: string | null;
  service?: string | null;
  address?: string | null;
  details?: string | null;
  driverId?: string | null;
  etaMinutes?: number | null;
  statusHistory?: JobTimelineEvent[];
  verificationToken?: string | null;
  pickupVerificationToken?: string | null;
  deliveryVerificationToken?: string | null;
  pickupVerifiedAt?: string | null;
  deliveryVerifiedAt?: string | null;
  handoffVerifiedAt?: string | null;
};

type DrawerSection = "profile" | "queue" | "settings";

const NEW_JOB_QUEUE_COUNTDOWN_SECONDS = 15;

export default function DriverPage() {
  const company = getCompanyBySlug("build-electric");
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettingsState>(() =>
    readWorkspaceSettings("build-electric")
  );
  const defaultDriverAcceptanceMode = company?.driverAcceptanceMode ?? "manual";

  const [driverAcceptanceMode, setDriverAcceptanceMode] =
    useState<DriverAcceptanceMode>(defaultDriverAcceptanceMode);

  const requiresManualAcceptance = driverAcceptanceMode === "manual";

  const companyDrivers = company ? getDriversByCompany(company.id) : [];
  const activeDriver = companyDrivers[1] ?? companyDrivers[0] ?? null;

  const [broadcastAlerts, setBroadcastAlertsState] = useState<BroadcastAlert[]>([]);
  const [showBroadcastAlert, setShowBroadcastAlert] = useState(false);
  const [alertPanelOpen, setAlertPanelOpen] = useState(false);
  const [driverVisualState, setDriverVisualState] =
    useState<"searching" | "alert" | "active">("searching");

  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeDrawerSection, setActiveDrawerSection] =
    useState<DrawerSection>("queue");
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [pendingCompletionJob, setPendingCompletionJob] =
    useState<ApiJob | null>(null);
  const [distanceMiles, setDistanceMiles] = useState<number | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [autoNavigateEnabled, setAutoNavigateEnabled] = useState(false);
  const [focusedJobId, setFocusedJobId] = useState<string | null>(null);
  const [incomingJobId, setIncomingJobId] = useState<string | null>(null);
  const [incomingQueueDeadlineMs, setIncomingQueueDeadlineMs] =
    useState<number | null>(null);
  const [incomingCountdownSeconds, setIncomingCountdownSeconds] = useState(
    NEW_JOB_QUEUE_COUNTDOWN_SECONDS
  );
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(true);
  const [externalMapsFallbackEnabled, setExternalMapsFallbackEnabled] =
    useState(true);

  const seenJobIdsRef = useRef<Set<string>>(new Set());
  const newJobAudioRef = useRef<HTMLAudioElement | null>(null);
  const broadcastAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedIncomingJobIdRef = useRef<string | null>(null);
  const lastPlayedBroadcastTsRef = useRef<number | null>(null);
  const broadcastLoopStartedRef = useRef<number | null>(null);

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/jobs?company=build-electric", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch jobs");
      }

      const data = await res.json();
      setJobs(data.jobs ?? []);
      setIsLoading(false);
    } catch (error) {
      console.error("Driver fetch failed:", error);
      setIsLoading(false);
    }
  };

  const stopNewJobAudio = () => {
    if (newJobAudioRef.current) {
      newJobAudioRef.current.pause();
      newJobAudioRef.current.currentTime = 0;
    }
  };

  const stopBroadcastAudio = () => {
    if (broadcastAudioRef.current) {
      broadcastAudioRef.current.pause();
      broadcastAudioRef.current.currentTime = 0;
    }
  };

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
    setDriverAcceptanceMode(
      resolveDriverAcceptanceMode(defaultDriverAcceptanceMode, company?.slug)
    );

    if (typeof window === "undefined") return;

    const onStorage = () => {
      setDriverAcceptanceMode(
        resolveDriverAcceptanceMode(defaultDriverAcceptanceMode, company?.slug)
      );
    };

    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, [defaultDriverAcceptanceMode, company?.slug]);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkAlert = () => {
      const alerts = getBroadcastAlerts();

      if (alerts.length > 0) {
        setBroadcastAlertsState(alerts);
        setShowBroadcastAlert(true);
      } else {
        setBroadcastAlertsState([]);
        setShowBroadcastAlert(false);
        setAlertPanelOpen(false);
      }
    };

    checkAlert();
    const interval = setInterval(checkAlert, 2000);
    window.addEventListener("storage", checkAlert);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", checkAlert);
    };
  }, []);

  const myJobs = useMemo(() => {
    if (!activeDriver) return [];
    return jobs.filter(
      (job) =>
        job.driverId === activeDriver.id &&
        job.status !== "Completed" &&
        job.status !== "Cancelled"
    );
  }, [jobs, activeDriver]);

  const activeJob = useMemo(() => {
    if (myJobs.length === 0) return null;
    if (!focusedJobId) return myJobs[0];
    return myJobs.find((job) => job.id === focusedJobId) ?? myJobs[0];
  }, [myJobs, focusedJobId]);

  const incomingJob = useMemo(() => {
    if (!incomingJobId) return null;
    return myJobs.find((job) => job.id === incomingJobId) ?? null;
  }, [myJobs, incomingJobId]);

  const queuedJobs = useMemo(() => {
    return myJobs.filter(
      (job) => job.id !== activeJob?.id && job.id !== incomingJob?.id
    );
  }, [myJobs, activeJob?.id, incomingJob?.id]);

  useEffect(() => {
    const hasFreshJobSignal =
      Boolean(incomingJobId) ||
      activeJob?.status === "Assigned" ||
      activeJob?.status === "Accepted";

    if (showBroadcastAlert || hasFreshJobSignal) {
      setDriverVisualState("alert");
      return;
    }

    if (myJobs.length === 0) {
      setDriverVisualState("searching");
      return;
    }

    setDriverVisualState("active");
  }, [showBroadcastAlert, incomingJobId, activeJob?.status, myJobs.length]);

  useEffect(() => {
    if (!soundAlertsEnabled) {
      stopNewJobAudio();
      return;
    }

    const jobIdToLoop =
      incomingJobId ||
      (activeJob && activeJob.status === "Assigned" ? activeJob.id : null);

    if (!jobIdToLoop) {
      stopNewJobAudio();
      return;
    }

    if (lastPlayedIncomingJobIdRef.current === jobIdToLoop) return;

    lastPlayedIncomingJobIdRef.current = jobIdToLoop;

    if (newJobAudioRef.current) {
      newJobAudioRef.current.loop = true;
      newJobAudioRef.current.currentTime = 0;
      newJobAudioRef.current.play().catch(() => {});
    }
  }, [incomingJobId, activeJob?.id, activeJob?.status, soundAlertsEnabled]);

  useEffect(() => {
    const shouldStopJobLoop =
      !soundAlertsEnabled ||
      !activeJob ||
      activeJob.status === "Accepted" ||
      activeJob.status === "En Route" ||
      activeJob.status === "Arrived" ||
      activeJob.status === "In Progress" ||
      activeJob.status === "Completed";

    if (shouldStopJobLoop) {
      stopNewJobAudio();

      if (
        !activeJob ||
        activeJob.status === "Accepted" ||
        activeJob.status === "En Route" ||
        activeJob.status === "Arrived" ||
        activeJob.status === "In Progress" ||
        activeJob.status === "Completed"
      ) {
        lastPlayedIncomingJobIdRef.current = null;
      }
    }
  }, [activeJob?.id, activeJob?.status, soundAlertsEnabled]);

  useEffect(() => {
    if (!soundAlertsEnabled) {
      stopBroadcastAudio();
      return;
    }

    if (!showBroadcastAlert || !broadcastAlerts.length) {
      stopBroadcastAudio();
      return;
    }

    const latestTs = broadcastAlerts[broadcastAlerts.length - 1]?.timestamp ?? null;
    if (!latestTs) return;
    if (broadcastLoopStartedRef.current === latestTs) return;

    broadcastLoopStartedRef.current = latestTs;
    lastPlayedBroadcastTsRef.current = latestTs;

    if (broadcastAudioRef.current) {
      broadcastAudioRef.current.loop = true;
      broadcastAudioRef.current.currentTime = 0;
      broadcastAudioRef.current.play().catch(() => {});
    }
  }, [broadcastAlerts, showBroadcastAlert, soundAlertsEnabled]);

  const handleAlertInteraction = () => {
    stopBroadcastAudio();
    broadcastLoopStartedRef.current = null;
  };

  const handleDismissBroadcast = () => {
    handleAlertInteraction();
    setShowBroadcastAlert(false);
    setBroadcastAlertsState([]);
    setAlertPanelOpen(false);
    clearBroadcastAlert();
  };

  const handleDismissSingleAlert = (idx: number) => {
    handleAlertInteraction();
    const newAlerts = broadcastAlerts.filter((_, i) => i !== idx);
    setBroadcastAlertsState(newAlerts);

    if (newAlerts.length === 0) {
      setShowBroadcastAlert(false);
      setAlertPanelOpen(false);
      clearBroadcastAlert();
    } else {
      persistBroadcastAlerts(newAlerts);
    }
  };

  const queueCount = queuedJobs.length;

  const isNavigationActive =
    activeJob?.status === "En Route" ||
    activeJob?.status === "Arrived" ||
    activeJob?.status === "In Progress" ||
    activeJob?.status === "Go to Pickup" ||
    activeJob?.status === "En Route to Customer" ||
    activeJob?.status === "In Transit";

  const statusFlow = useMemo(() => {
    return getStatusFlowForMode(workspaceSettings.operationalMode, requiresManualAcceptance);
  }, [workspaceSettings.operationalMode, requiresManualAcceptance]);

  const workflowStages = useMemo(() => {
    return getTrackingStagesForMode(workspaceSettings.operationalMode);
  }, [workspaceSettings.operationalMode]);

  const clearIncomingJobBanner = () => {
    setIncomingJobId(null);
    setIncomingQueueDeadlineMs(null);
    setIncomingCountdownSeconds(NEW_JOB_QUEUE_COUNTDOWN_SECONDS);
  };

  const startIncomingJobCountdown = (jobId: string) => {
    setIncomingJobId(jobId);
    setIncomingQueueDeadlineMs(
      Date.now() + NEW_JOB_QUEUE_COUNTDOWN_SECONDS * 1000
    );
    setIncomingCountdownSeconds(NEW_JOB_QUEUE_COUNTDOWN_SECONDS);
  };

  const getShortAddress = (address?: string | null) => {
    if (!address) return "—";
    const short = address.split(",")[0]?.trim() ?? address.trim();
    return short.length > 34 ? `${short.slice(0, 34)}…` : short;
  };

  const distanceEstimateLabel = useMemo(() => {
    if (distanceMiles == null || Number.isNaN(distanceMiles)) return "Estimating...";
    if (distanceMiles < 1) return "< 1 mi";
    return `${distanceMiles.toFixed(1)} mi`;
  }, [distanceMiles]);

  useEffect(() => {
    if (!activeJob) {
      setPanelExpanded(false);
      setDistanceMiles(null);
      setRouteData(null);
      setDirectionsOpen(false);
      setAutoNavigateEnabled(false);
      return;
    }

    const compactByDefault =
      activeJob.status === "Assigned" ||
      activeJob.status === "Accepted" ||
      activeJob.status === "En Route";

    setPanelExpanded(!compactByDefault);
  }, [activeJob?.id, activeJob?.status]);

  useEffect(() => {
    if (myJobs.length === 0) {
      setFocusedJobId(null);
      clearIncomingJobBanner();
      seenJobIdsRef.current = new Set();
      return;
    }

    if (!focusedJobId || !myJobs.some((job) => job.id === focusedJobId)) {
      setFocusedJobId(myJobs[0].id);
    }
  }, [myJobs, focusedJobId]);

  useEffect(() => {
    if (myJobs.length === 0) return;

    const currentIds = myJobs.map((job) => job.id);
    const currentIdSet = new Set(currentIds);

    if (seenJobIdsRef.current.size === 0) {
      seenJobIdsRef.current = currentIdSet;
      return;
    }

    const hasActiveMission = Boolean(activeJob);

    if (hasActiveMission && !incomingJobId) {
      const newestUnseenJob = myJobs.find(
        (job) => !seenJobIdsRef.current.has(job.id) && job.id !== activeJob?.id
      );

      if (newestUnseenJob) {
        startIncomingJobCountdown(newestUnseenJob.id);
      }
    }

    seenJobIdsRef.current = currentIdSet;
  }, [myJobs, activeJob, incomingJobId]);

  useEffect(() => {
    if (!incomingJobId || !incomingQueueDeadlineMs) return;

    const tick = () => {
      const remainingMs = incomingQueueDeadlineMs - Date.now();

      if (remainingMs <= 0) {
        clearIncomingJobBanner();
        return;
      }

      setIncomingCountdownSeconds(Math.max(1, Math.ceil(remainingMs / 1000)));
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [incomingJobId, incomingQueueDeadlineMs]);

  useEffect(() => {
    if (incomingJobId && !incomingJob) {
      clearIncomingJobBanner();
    }
  }, [incomingJobId, incomingJob]);

  const getNextStatus = (status: string) => {
    return statusFlow.next[status] ?? null;
  };

  const getPreviousStatus = (status: string) => {
    return statusFlow.previous[status] ?? null;
  };

  const getPrimaryMissionLabel = (job: ApiJob) => {
    if (job.status === "Assigned" && workspaceSettings.operationalMode === "Direct Service") {
      return requiresManualAcceptance ? "Mission pending acceptance" : "Driver assigned";
    }

    return getDisplayStatusLabel(job.status);
  };

  const getAdvanceActionLabel = (job: ApiJob) => {
    const nextStatus = getNextStatus(job.status);
    if (!nextStatus) return "Completed";

    if (job.status === "Assigned" && requiresManualAcceptance) {
      return "Accept Job";
    }

    return `Mark ${getDisplayStatusLabel(nextStatus)}`;
  };

  const updateJobStatus = async (job: ApiJob, nextStatus: string) => {
    try {
      const res = await fetch("/api/jobs", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: job.id,
          status: nextStatus,
          driverId: job.driverId ?? activeDriver?.id ?? null,
          etaMinutes:
            nextStatus === "Accepted"
              ? job.etaMinutes ?? 12
              : nextStatus === "En Route"
              ? 12
              : nextStatus === "Arrived"
              ? 2
              : nextStatus === "In Progress"
              ? 0
              : nextStatus === "Completed"
              ? 0
              : job.etaMinutes ?? null,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      const data = await res.json();
      const updatedJob = data.job;

      setJobs((prev) =>
        prev.map((item) => (item.id === updatedJob.id ? updatedJob : item))
      );
    } catch (error) {
      console.error("Status update failed:", error);
      alert("Could not update job status.");
    }
  };

  const handleUpdateStatus = async (job: ApiJob) => {
    const nextStatus = getNextStatus(job.status);
    if (!nextStatus) return;

    if (nextStatus === "Completed") {
      setPendingCompletionJob(job);
      return;
    }

    await updateJobStatus(job, nextStatus);
  };

  const confirmCompletion = async () => {
    if (!pendingCompletionJob) return;
    const job = pendingCompletionJob;
    setPendingCompletionJob(null);
    await updateJobStatus(job, "Completed");
  };

  const openDirections = (address?: string | null) => {
    if (!address) return;

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <main className="flex h-dvh flex-col bg-slate-950 text-white">
        <div className="mx-auto max-w-md px-4 py-10">Loading driver console...</div>
      </main>
    );
  }

  return (
    <>
      <audio ref={newJobAudioRef} preload="auto">
        <source src="/sounds/new-job-alert.wav" type="audio/wav" />
      </audio>

      <audio ref={broadcastAudioRef} preload="auto">
        <source src="/sounds/broadcast-alert.wav" type="audio/wav" />
      </audio>

      <main className="flex h-dvh flex-col bg-slate-950 text-white">
        {showBroadcastAlert && broadcastAlerts.length > 0 ? (
          <div className="fixed inset-x-0 top-24 z-50 flex justify-center">
            <div className="max-w-xs w-full rounded-xl border border-yellow-400/30 bg-yellow-900/90 px-3 py-2 shadow-md backdrop-blur flex items-center gap-2">
              <span className="inline-block rounded-full bg-yellow-400/20 px-2 py-0.5 text-[11px] font-semibold text-yellow-300">
                ALERT
              </span>

              {broadcastAlerts.length > 1 ? (
                <span className="ml-1 rounded-full bg-yellow-400/30 px-2 py-0.5 text-[11px] font-semibold text-yellow-200">
                  {broadcastAlerts.length} Alerts
                </span>
              ) : null}

              <span
                className="truncate text-xs font-medium text-yellow-100 flex-1 mx-2"
                style={{ maxWidth: "10em" }}
              >
                {broadcastAlerts[0].message.length > 60
                  ? `${broadcastAlerts[0].message.slice(0, 60)}…`
                  : broadcastAlerts[0].message}
              </span>

              <button
                onClick={() => {
                  handleAlertInteraction();
                  setAlertPanelOpen((v) => !v);
                }}
                className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400/80 text-slate-900 hover:bg-yellow-300 focus:outline-none"
                aria-label="Expand alerts"
                style={{ fontSize: "1rem", padding: 0 }}
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                >
                  <path
                    d="M10 6v8M6 10h8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <button
                onClick={handleDismissBroadcast}
                className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400/80 text-slate-900 hover:bg-yellow-300 focus:outline-none"
                aria-label="Dismiss all alerts"
                style={{ fontSize: "1rem", padding: 0 }}
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                >
                  <path
                    d="M6 6l8 8M14 6l-8 8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {alertPanelOpen ? (
              <div
                className="absolute top-12 left-1/2 -translate-x-1/2 w-[320px] max-w-xs rounded-xl border border-yellow-400/30 bg-yellow-900/95 px-3 py-3 shadow-lg backdrop-blur z-50"
                style={{ maxHeight: "260px", overflowY: "auto" }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-yellow-200">
                    Broadcast Alerts
                  </span>
                  <button
                    onClick={handleDismissBroadcast}
                    className="rounded-full bg-yellow-400/80 px-2 py-1 text-xs text-slate-900 hover:bg-yellow-300"
                  >
                    Dismiss All
                  </button>
                </div>

                <ul className="space-y-2">
                  {broadcastAlerts.map((alert, idx) => (
                    <li
                      key={`${alert.timestamp}-${idx}`}
                      className="rounded-lg border border-yellow-400/20 bg-yellow-900/80 px-3 py-2 flex flex-col"
                    >
                      <span
                        className="text-xs font-medium text-yellow-100 break-words"
                        style={{ wordBreak: "break-word" }}
                      >
                        {alert.message}
                      </span>

                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[10px] text-yellow-200">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                        <button
                          onClick={() => handleDismissSingleAlert(idx)}
                          className="rounded-full bg-yellow-400/80 px-2 py-0.5 text-xs text-slate-900 hover:bg-yellow-300"
                        >
                          Dismiss
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="sticky top-0 z-30 shrink-0 border-b border-white/10 bg-slate-950/95 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
            <button
              onClick={() => setDrawerOpen((v) => !v)}
              className="rounded-2xl border border-white/10 bg-white/5 p-3"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
                Mission Screen
              </p>
              <h1 className="text-xl font-semibold">
                {workspaceSettings.companyName || company?.name || "Driver"}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
                Online
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 text-sm text-cyan-300">
                {queueCount}
              </span>
            </div>
          </div>
        </div>

        {drawerOpen ? (
          <div className="mx-auto max-w-md shrink-0 px-4 pt-3">
            <div className="rounded-3xl border border-white/10 bg-slate-900/95 p-4">
              <p className="text-lg font-semibold">{activeDriver?.name ?? "Driver"}</p>
              <p className="mt-1 text-sm text-white/60">
                {workspaceSettings.companyName || company?.name || "Dispatch Platform"}
              </p>
              <p className="mt-3 text-sm text-white/70">Queue: {queueCount}</p>

              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                {([
                  { key: "profile", label: "Profile" },
                  { key: "queue", label: "Queue" },
                  { key: "settings", label: "Settings" },
                ] as const).map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setActiveDrawerSection(section.key)}
                    className={`rounded-xl border px-3 py-2 text-center transition ${
                      activeDrawerSection === section.key
                        ? "border-cyan-500/35 bg-cyan-500/15 text-cyan-100"
                        : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    {section.label}
                  </button>
                ))}
              </div>

              {activeDrawerSection === "profile" ? (
                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                      Status
                    </p>
                    <p className="mt-2 text-white">Online</p>
                    <p className="mt-1 text-white/70">Assigned jobs: {myJobs.length}</p>
                    <p className="text-white/70">Queue waiting: {queueCount}</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                      Current Mission
                    </p>
                    <p className="mt-2 font-medium text-white">
                      {activeJob?.name ?? "No active mission"}
                    </p>
                    <p className="text-white/70">
                      {activeJob?.service ?? "Waiting for dispatch"}
                    </p>
                    <p className="text-white/60">{activeJob?.status ?? "Idle"}</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                      Queued Jobs
                    </p>
                    {queuedJobs.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {queuedJobs.slice(0, 2).map((job) => (
                          <p key={job.id} className="truncate text-white/75">
                            {job.name ?? "Customer"} • {job.service ?? "Service Request"}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-white/65">No queued jobs waiting.</p>
                    )}
                  </div>
                </div>
              ) : null}

              {activeDrawerSection === "queue" ? (
                queuedJobs.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {queuedJobs.map((job) => (
                      <div
                        key={job.id}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <p className="font-semibold">{job.name ?? "Customer"}</p>
                        <p className="mt-1 text-xs text-white/50">{job.id}</p>
                        <p className="mt-2 text-sm text-white/70">
                          {job.service ?? "Service Request"}
                        </p>
                        <p className="text-sm text-white/60">{job.address ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/65">
                    No queued jobs waiting.
                  </div>
                )
              ) : null}

              {activeDrawerSection === "settings" ? (
                <div className="mt-4 space-y-3 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setAutoNavigateEnabled((prev) => {
                        const next = !prev;
                        if (next) setDirectionsOpen(true);
                        return next;
                      });
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/85 transition hover:bg-white/10"
                  >
                    <span>Auto Navigate</span>
                    <span className="text-cyan-200">
                      {autoNavigateEnabled ? "On" : "Off"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSoundAlertsEnabled((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/85 transition hover:bg-white/10"
                  >
                    <span>Sound Alerts</span>
                    <span className="text-cyan-200">
                      {soundAlertsEnabled ? "On" : "Off"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExternalMapsFallbackEnabled((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/85 transition hover:bg-white/10"
                  >
                    <span>External Maps fallback</span>
                    <span className="text-cyan-200">
                      {externalMapsFallbackEnabled ? "On" : "Off"}
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mx-auto flex w-full max-w-md flex-1 min-h-0 px-4 pt-4 pb-0">
          <div
            className={`relative h-full w-full overflow-hidden rounded-[28px] border bg-slate-900 shadow-[0_0_0_1px_rgba(34,211,238,0.08)] ${
              driverVisualState === "alert"
                ? "animate-driver-amber-glow border-amber-400/40"
                : driverVisualState === "searching"
                ? "animate-driver-cyan-glow border-cyan-400/40"
                : "animate-driver-cyan-subtle border-cyan-500/25"
            }`}
          >
            {activeJob && incomingJob ? (
              <div className="pointer-events-none absolute inset-x-3 top-3 z-30">
                <div className="pointer-events-auto rounded-2xl border border-cyan-500/35 bg-slate-900/95 p-3 shadow-[0_10px_30px_rgba(8,47,73,0.5)] backdrop-blur">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300">
                    New job assigned
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-white">
                    {incomingJob.name ?? "Customer"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-cyan-100/90">
                    {incomingJob.service ?? "Service Request"}
                  </p>
                  <p className="truncate text-xs text-white/65">
                    {getShortAddress(incomingJob.address)}
                  </p>
                  <p className="mt-1 text-xs text-cyan-200/85">
                    Going to queue in {incomingCountdownSeconds}...
                  </p>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFocusedJobId(incomingJob.id);
                        clearIncomingJobBanner();
                      }}
                      className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-white/85 transition hover:bg-white/10 hover:text-white"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={clearIncomingJobBanner}
                      className="rounded-full border border-cyan-500/35 bg-cyan-500/15 px-3 py-1 text-xs text-cyan-100 transition hover:bg-cyan-500/25"
                    >
                      Queue Now
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="h-full [&>*]:h-full [&_*]:!rounded-none [&_.leaflet-container]:!h-full">
              <DriverLeafletMap
                customerName={activeJob?.name ?? "Waiting for jobs"}
                addressLabel={activeJob?.address ?? "Live map"}
                missionAddress={activeJob?.address ?? null}
                onRouteSummaryChange={setDistanceMiles}
                onRouteDataChange={setRouteData}
                navigationActive={Boolean(activeJob && isNavigationActive)}
                directionsActive={Boolean(
                  activeJob &&
                    (isNavigationActive || autoNavigateEnabled || directionsOpen)
                )}
                missionStatus={activeJob?.status ?? null}
              />
            </div>

            {activeJob ? (
              <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-[28px] border-t border-white/10 bg-slate-900/95 backdrop-blur-md">
                <div className="flex justify-center pb-1 pt-2">
                  <div className="h-1 w-10 rounded-full bg-white/20" />
                </div>

                <div className="px-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                        Active Mission
                      </p>
                      <h2 className="truncate text-lg font-semibold text-white">
                        {activeJob.name ?? "Customer"}
                      </h2>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {queueCount > 0 ? (
                        <span className="rounded-full border border-fuchsia-400/35 bg-fuchsia-500/10 px-2.5 py-1 text-xs text-fuchsia-200">
                          Queue {queueCount}
                        </span>
                      ) : null}
                      <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
                        {getDisplayStatusLabel(activeJob.status)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setPanelExpanded((value) => !value)}
                    className="mt-2 text-sm text-white/70 underline underline-offset-2"
                    type="button"
                  >
                    {panelExpanded ? "Hide mission details" : "Show mission details"}
                  </button>

                  {panelExpanded ? (
                    <div className="mt-3 rounded-3xl bg-slate-700 p-4 text-white">
                      <div className="space-y-3 text-base">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-white/80" />
                          <span>{activeJob.address ?? "—"}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-white/80" />
                          <span>{activeJob.phone ?? "—"}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-white/80" />
                          <span>{activeJob.service ?? "Service Request"}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock3 className="h-4 w-4 text-white/80" />
                          <span>
                            ETA:{" "}
                            {activeJob.etaMinutes != null
                              ? `${activeJob.etaMinutes} min`
                              : "—"}
                          </span>
                        </div>
                      </div>

                      {(workspaceSettings.qrHandoffEnabled || workspaceSettings.proofOfDeliveryEnabled) ? (
                        <div className="mt-3 rounded-2xl border border-cyan-500/25 bg-slate-800/80 p-3 text-sm text-cyan-100">
                          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Handoff</p>
                          <p className="mt-1 text-cyan-100/95">
                            {activeJob.handoffVerifiedAt
                              ? `Verified at ${new Date(activeJob.handoffVerifiedAt).toLocaleTimeString([], {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}`
                              : "Pending customer confirmation"}
                          </p>
                          {workspaceSettings.qrHandoffEnabled && activeJob.verificationToken ? (
                            <p className="mt-1 text-xs text-cyan-200/80">
                              QR token: {activeJob.verificationToken}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="mt-3 rounded-2xl border border-cyan-500/25 bg-slate-800/80 p-3 text-sm text-cyan-100">
                        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Mission Steps</p>
                        <div className="mt-2 space-y-1.5">
                          {workflowStages.map((stage) => {
                            const reached =
                              activeJob.status === stage.status ||
                              Boolean(
                                activeJob.statusHistory?.some(
                                  (event) => event.status === stage.status
                                )
                              );
                            return (
                              <div key={stage.status} className="flex items-center gap-2">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    reached ? "bg-emerald-300" : "bg-white/30"
                                  }`}
                                />
                                <span className={reached ? "text-white" : "text-cyan-200/70"}>
                                  {stage.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {workspaceSettings.driverMustConfirmHandoff ? (
                          <p className="mt-2 text-xs text-cyan-200/80">
                            Driver confirmation is required for verification checkpoints.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
                    <p className="font-medium">{getPrimaryMissionLabel(activeJob)}</p>
                    <p className="text-cyan-200/90">
                      Distance estimate: {distanceEstimateLabel}
                    </p>
                  </div>

                  {directionsOpen ? (
                    <div className="mt-2 max-h-40 overflow-y-auto rounded-2xl border border-cyan-500/30 bg-slate-800/95 p-3 text-xs text-cyan-100 backdrop-blur">
                      <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                        In-App Directions
                      </p>
                      <p className="mt-1 font-medium">
                        Route status: {getDisplayStatusLabel(activeJob.status)}
                      </p>
                      {routeData?.offRoute ? (
                        <p className="mt-1 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-rose-200">
                          Off route — preparing reroute
                        </p>
                      ) : null}
                      <p className="mt-1 text-cyan-200/90">
                        Total distance:{" "}
                        {routeData
                          ? `${routeData.distanceMiles.toFixed(1)} mi`
                          : distanceEstimateLabel}
                      </p>
                      <p className="text-cyan-200/90">
                        Estimated travel time:{" "}
                        {routeData
                          ? `${Math.max(1, Math.round(routeData.durationMinutes))} min`
                          : "Estimating..."}
                      </p>
                      <p className="mt-1 font-medium">
                        Next step:{" "}
                        {routeData?.nextInstruction ?? "Continue to destination"}
                      </p>

                      {routeData?.steps?.length ? (
                        <div className="mt-1 space-y-1">
                          {routeData.steps.slice(0, 3).map((step, index) => (
                            <p
                              key={`${step.instruction}-${index}`}
                              className="text-cyan-200/80"
                            >
                              {index + 1}. {step.instruction}
                              {step.distanceMiles > 0
                                ? ` (${step.distanceMiles.toFixed(1)} mi)`
                                : ""}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-3 grid gap-2">
                    {activeJob.status !== "Assigned" || !requiresManualAcceptance ? (
                      <Button
                        onClick={() => setDirectionsOpen((open) => !open)}
                        disabled={autoNavigateEnabled && !directionsOpen}
                        variant="secondary"
                        className="rounded-2xl border border-white/15 bg-white/5 text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {directionsOpen ? "Hide Directions" : "Get Directions"}
                      </Button>
                    ) : null}

                    {activeJob.status !== "Assigned" || !requiresManualAcceptance ? (
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => openDirections(activeJob.address)}
                          className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[11px] text-white/80 transition hover:bg-white/10 hover:text-white sm:px-3 sm:text-xs"
                        >
                          Open in Google Maps
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAutoNavigateEnabled((prev) => {
                              const next = !prev;
                              if (next) setDirectionsOpen(true);
                              return next;
                            });
                          }}
                          className="rounded-full border border-cyan-500/35 bg-cyan-500/15 px-2.5 py-1 text-[11px] text-cyan-100 transition hover:bg-cyan-500/25 sm:px-3 sm:text-xs"
                        >
                          {autoNavigateEnabled ? "Auto Navigate On" : "Auto Navigate"}
                        </button>
                      </div>
                    ) : null}

                    <Button
                      onClick={() => handleUpdateStatus(activeJob)}
                      disabled={!getNextStatus(activeJob.status)}
                      className="rounded-2xl bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-50"
                    >
                      <CarFront className="mr-2 h-4 w-4" />
                      {getAdvanceActionLabel(activeJob)}
                    </Button>

                    {panelExpanded ? (
                      <Button
                        onClick={() => {
                          const previousStatus = getPreviousStatus(activeJob.status);
                          if (previousStatus) void updateJobStatus(activeJob, previousStatus);
                        }}
                        disabled={!getPreviousStatus(activeJob.status)}
                        variant="secondary"
                        className="rounded-2xl border border-white/15 bg-white/5 text-white hover:bg-white/10 disabled:opacity-50"
                      >
                        Go Back
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t border-white/10 bg-slate-950/95 px-4 py-4">
                <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">
                  Finding Jobs
                </p>
                <p className="mt-2 text-white/70">Waiting for assignment...</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Modal
        isOpen={Boolean(pendingCompletionJob)}
        onClose={() => setPendingCompletionJob(null)}
        title="Complete this job?"
      >
        <div className="space-y-4 text-slate-800">
          <div className="rounded-2xl bg-slate-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Mission
            </p>
            <p className="mt-2 text-base font-semibold">
              {pendingCompletionJob?.name ?? "Customer"}
            </p>
            <p className="text-sm text-slate-600">
              {pendingCompletionJob?.service ?? "Service Request"}
            </p>
            <p className="text-sm text-slate-600">{pendingCompletionJob?.id ?? "—"}</p>
          </div>

          <p className="text-sm text-slate-600">
            Confirming completion will move this mission out of the active slot.
          </p>

          <div className="flex gap-3">
            <Button
              onClick={() => setPendingCompletionJob(null)}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void confirmCompletion()}
              className="flex-1 bg-slate-900 text-white hover:bg-slate-800"
            >
              Confirm Completion
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}