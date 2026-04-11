"use client";
import { addBroadcastAlert } from "@/lib/utils";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  LayoutDashboard,
  MapPinned,
  Settings2,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { AppShellNav } from "@/components/platform/app-shell-nav";
import { DispatchMap } from "@/components/platform/dispatch-map";
import { getCompanyBySlug } from "@/lib/platform/selectors";
import {
  WORKSPACE_DRIVERS_UPDATED_EVENT,
  readWorkspaceDrivers,
  toPlatformDrivers,
  type WorkspaceDriver,
} from "@/lib/platform/workspace-drivers";
import {
  resolveDriverAcceptanceMode,
  setStoredDriverAcceptanceMode,
  type DriverAcceptanceMode,
} from "@/lib/platform/driver-acceptance-mode";
import {
  defaultWorkspaceSettings,
  readWorkspaceSettings,
  writeWorkspaceSettings,
  type WorkspaceSettingsState,
} from "@/lib/platform/workspace-preferences";
import { getDisplayStatusLabel, type JobTimelineEvent } from "@/lib/platform/job-lifecycle";
import { getDashboardSurfaceConfig } from "@/lib/platform/surface-preferences";

const WORKSPACE_SETTINGS_UPDATED_EVENT = "dispatch:workspace-settings-updated";

type ApiJob = {
  id: string;
  createdAt: string;
  updatedAt?: string;
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

type PendingAssistedAssign = {
  jobId: string;
  driverId: string;
  driverName: string;
};

const isClearableJob = (job: ApiJob) =>
  job.status === "Completed" || job.status === "Cancelled";

export default function DashboardPage() {
    // Broadcast Alert panel state
    const [broadcastMessage, setBroadcastMessage] = useState("");

    // Handler for sending broadcast alert
    const handleSendBroadcast = () => {
      if (!broadcastMessage.trim()) return;

      addBroadcastAlert({
        message: broadcastMessage.trim(),
        timestamp: Date.now(),
      });

      setBroadcastMessage("");
    };
  const company = getCompanyBySlug("build-electric");
  const defaultDriverAcceptanceMode = company?.driverAcceptanceMode ?? "manual";
  const [workspaceDrivers, setWorkspaceDrivers] = useState<WorkspaceDriver[]>([]);
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettingsState>({
    ...defaultWorkspaceSettings,
    companySlug: company?.slug ?? "build-electric",
  });
  const companyDrivers = useMemo(
    () => (company ? toPlatformDrivers(workspaceDrivers, company.id) : []),
    [workspaceDrivers, company]
  );
  const [driverAcceptanceMode, setDriverAcceptanceMode] =
    useState<DriverAcceptanceMode>(defaultDriverAcceptanceMode);

  const [companyJobs, setCompanyJobs] = useState<ApiJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [selectedJob, setSelectedJob] = useState<ApiJob | null>(null);
  const [pendingAssistedAssign, setPendingAssistedAssign] =
    useState<PendingAssistedAssign | null>(null);
  const [showNoDriversModal, setShowNoDriversModal] = useState(false);
  const [showAssignErrorModal, setShowAssignErrorModal] = useState(false);
  const [pendingClearJob, setPendingClearJob] = useState<ApiJob | null>(null);
  const [showClearCompletedModal, setShowClearCompletedModal] = useState(false);
  const [dispatchMode, setDispatchMode] = useState<"Manual" | "Assisted" | "Auto">("Manual");
  const [activeView, setActiveView] = useState<
    "map" | "grid" | "table" | "drivers" | "analytics"
  >(
    "map"
  );
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [isClearingJobs, setIsClearingJobs] = useState(false);
  const [isConfirmingHandoff, setIsConfirmingHandoff] = useState(false);
  const [handoffConfirmError, setHandoffConfirmError] = useState<string | null>(null);
  const [handoffConfirmSuccess, setHandoffConfirmSuccess] = useState<string | null>(null);
  const [showDashboardControlsModal, setShowDashboardControlsModal] = useState(false);
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const dashboardSurface = useMemo(
    () => getDashboardSurfaceConfig(workspaceSettings),
    [workspaceSettings]
  );

  useEffect(() => {
    setDriverAcceptanceMode(
      resolveDriverAcceptanceMode(defaultDriverAcceptanceMode, company?.slug)
    );
  }, [defaultDriverAcceptanceMode, company?.slug]);

  useEffect(() => {
    if (!company) return;

    const syncSettings = () => {
      const next = readWorkspaceSettings(company.slug);
      setWorkspaceSettings(next);
      setDispatchMode(next.dispatchMode);
      setDriverAcceptanceMode(next.driverAcceptanceMode);
      setStoredDriverAcceptanceMode(company.slug, next.driverAcceptanceMode);
    };

    const syncDrivers = () => {
      setWorkspaceDrivers(readWorkspaceDrivers(company.id, company.slug));
    };

    syncSettings();
    syncDrivers();

    window.addEventListener("storage", syncSettings);
    window.addEventListener("storage", syncDrivers);
    window.addEventListener(WORKSPACE_SETTINGS_UPDATED_EVENT, syncSettings as EventListener);
    window.addEventListener(WORKSPACE_DRIVERS_UPDATED_EVENT, syncDrivers as EventListener);

    return () => {
      window.removeEventListener("storage", syncSettings);
      window.removeEventListener("storage", syncDrivers);
      window.removeEventListener(WORKSPACE_SETTINGS_UPDATED_EVENT, syncSettings as EventListener);
      window.removeEventListener(WORKSPACE_DRIVERS_UPDATED_EVENT, syncDrivers as EventListener);
    };
  }, [company]);

  const assignJobToDriver = async (jobId: string, driverId: string) => {
    const assignStatus =
      workspaceSettings.operationalMode === "Direct Service" &&
      driverAcceptanceMode === "auto"
        ? "En Route"
        : "Assigned";

    try {
      const res = await fetch("/api/jobs", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: jobId,
          status: assignStatus,
          driverId,
          etaMinutes: 15,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to assign job");
      }

      const data = await res.json();
      const updatedJob = data.job;

      setCompanyJobs((prev) =>
        prev.map((job) => (job.id === updatedJob.id ? updatedJob : job))
      );
    } catch (error) {
      console.error("Assign failed:", error);
      setShowAssignErrorModal(true);
    }
  };

  const handleAssign = async (jobId: string) => {
    const recommendedDriver = getRecommendedDriver();

    if (!recommendedDriver) {
      setShowNoDriversModal(true);
      return;
    }

    if (dispatchMode === "Assisted") {
      setPendingAssistedAssign({
        jobId,
        driverId: recommendedDriver.id,
        driverName: recommendedDriver.name,
      });
      return;
    }

    await assignJobToDriver(jobId, recommendedDriver.id);
  };

  const confirmAssistedAssign = async () => {
    if (!pendingAssistedAssign) return;

    const pending = pendingAssistedAssign;
    setPendingAssistedAssign(null);
    await assignJobToDriver(pending.jobId, pending.driverId);
  };

  const getDriverName = (driverId?: string | null) => {
    if (!driverId) return "Unassigned";
    return companyDrivers.find((driver) => driver.id === driverId)?.name ?? "Assigned Driver";
  };

  const getRecommendedDriver = () => {
    return (
      companyDrivers.find((driver) => driver.status === "available") ??
      companyDrivers.find((driver) => driver.status === "en-route") ??
      companyDrivers[0] ??
      null
    );
  };

  const autoAssignJob = async (job: ApiJob) => {
    const recommendedDriver = getRecommendedDriver();
    const assignStatus =
      workspaceSettings.operationalMode === "Direct Service" &&
      driverAcceptanceMode === "auto"
        ? "En Route"
        : "Assigned";

    if (!recommendedDriver || job.driverId || job.status !== "Awaiting Dispatch") {
      return;
    }

    try {
      const res = await fetch("/api/jobs", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: job.id,
          status: assignStatus,
          driverId: recommendedDriver.id,
          etaMinutes: 15,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to auto-assign job");
      }

      const data = await res.json();
      const updatedJob = data.job;

      setCompanyJobs((prev) =>
        prev.map((item) => (item.id === updatedJob.id ? updatedJob : item))
      );
    } catch (error) {
      console.error("Auto-assign failed:", error);
    }
  };

  const clearJob = async (job: ApiJob) => {
    if (!isClearableJob(job)) return;

    setIsClearingJobs(true);

    try {
      const res = await fetch(`/api/jobs?id=${encodeURIComponent(job.id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to clear job");
      }

      setCompanyJobs((prev) => prev.filter((item) => item.id !== job.id));
      setSelectedJob((prev) => (prev?.id === job.id ? null : prev));
    } catch (error) {
      console.error("Clear job failed:", error);
    } finally {
      setIsClearingJobs(false);
    }
  };

  const clearCompletedJobs = async () => {
    const clearableJobsCount = companyJobs.filter(isClearableJob).length;
    if (clearableJobsCount === 0) return;

    setIsClearingJobs(true);

    try {
      const res = await fetch("/api/jobs?company=build-electric&clearCompleted=1", {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to clear completed jobs");
      }

      setCompanyJobs((prev) => prev.filter((job) => !isClearableJob(job)));
      setSelectedJob((prev) => (prev && isClearableJob(prev) ? null : prev));
    } catch (error) {
      console.error("Clear completed jobs failed:", error);
    } finally {
      setIsClearingJobs(false);
    }
  };

  const requestClearJob = (job: ApiJob) => {
    if (!isClearableJob(job)) return;
    setPendingClearJob(job);
  };

  const createManualJob = async (formData: FormData) => {
    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const service = String(formData.get("service") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const pickupAddress = String(formData.get("pickupAddress") ?? "").trim();
    const dropoffAddress = String(formData.get("dropoffAddress") ?? "").trim();
    const intermediateStops = String(formData.get("intermediateStops") ?? "").trim();
    const details = String(formData.get("details") ?? "").trim();
    const modeAddress =
      workspaceSettings.operationalMode === "Direct Service"
        ? address
        : [pickupAddress, dropoffAddress].filter(Boolean).join(" -> ");

    if (!name || !phone || !service || !modeAddress) {
      return;
    }

    if (workspaceSettings.jobIntakeSource === "booking") {
      return;
    }

    setIsCreatingJob(true);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companySlug: company?.slug ?? "build-electric",
          name,
          phone,
          service,
          address: modeAddress,
          details: [
            details,
            intermediateStops ? `Intermediate stops: ${intermediateStops}` : "",
            `Route template: ${workspaceSettings.jobStructureMode}`,
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create manual job");
      }

      const data = await res.json();
      const createdJob = data.job as ApiJob;

      setCompanyJobs((prev) => [createdJob, ...prev]);
      setShowCreateJobModal(false);
    } catch (error) {
      console.error("Manual job creation failed:", error);
    } finally {
      setIsCreatingJob(false);
    }
  };

  const confirmClearJob = async () => {
    if (!pendingClearJob) return;
    const job = pendingClearJob;
    setPendingClearJob(null);
    await clearJob(job);
  };

  const requestClearCompletedJobs = () => {
    if (clearableJobsCount === 0) return;
    setShowClearCompletedModal(true);
  };

  const confirmClearCompletedJobs = async () => {
    setShowClearCompletedModal(false);
    await clearCompletedJobs();
  };

  const openJobsCount = useMemo(() => {
    return companyJobs.filter((job) => job.status !== "Completed").length;
  }, [companyJobs]);

  const awaitingDispatchCount = useMemo(() => {
    return companyJobs.filter((job) => job.status === "Awaiting Dispatch").length;
  }, [companyJobs]);

  const assignedCount = useMemo(() => {
    return companyJobs.filter((job) => job.status === "Assigned").length;
  }, [companyJobs]);

  const completedCount = useMemo(() => {
    return companyJobs.filter((job) => job.status === "Completed").length;
  }, [companyJobs]);

  const clearableJobsCount = useMemo(() => {
    return companyJobs.filter(isClearableJob).length;
  }, [companyJobs]);

  const getAssignedJobsCountByDriver = (driverId: string) => {
    return companyJobs.filter((job) => job.driverId === driverId).length;
  };

  const getJobTimeline = (job: ApiJob): JobTimelineEvent[] => {
    const rawTimeline = Array.isArray(job.statusHistory) ? job.statusHistory : [];
    if (rawTimeline.length > 0) {
      return [...rawTimeline].sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
      );
    }

    return [
      {
        type: "system",
        label: "Request created",
        detail: "Customer request entered dispatch queue",
        at: job.createdAt,
        status: "Awaiting Dispatch",
      },
    ];
  };

  const formatTimelineAt = (value?: string) => {
    if (!value) return "Unknown time";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const confirmSelectedJobVerification = async (
    action: "confirm-handoff" | "confirm-pickup" | "confirm-delivery",
    token?: string | null
  ) => {
    if (!selectedJob || !token) return;

    setIsConfirmingHandoff(true);
    setHandoffConfirmError(null);
    setHandoffConfirmSuccess(null);

    try {
      const res = await fetch("/api/jobs", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedJob.id,
          verificationAction: action,
          verificationToken: token,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to confirm handoff");
      }

      const data = await res.json();
      const updatedJob = data.job as ApiJob;

      setCompanyJobs((prev) =>
        prev.map((job) => (job.id === updatedJob.id ? updatedJob : job))
      );
      setSelectedJob(updatedJob);
      setHandoffConfirmSuccess(
        action === "confirm-pickup"
          ? "Pickup verification recorded."
          : action === "confirm-delivery"
          ? "Delivery verification recorded."
          : "Handoff verified successfully."
      );
    } catch (error) {
      console.error("Handoff confirmation failed:", error);
      setHandoffConfirmError("Could not confirm handoff right now. Please retry.");
    } finally {
      setIsConfirmingHandoff(false);
    }
  };

  useEffect(() => {
    setHandoffConfirmError(null);
    setHandoffConfirmSuccess(null);
  }, [selectedJob?.id]);

  useEffect(() => {
    if (!handoffConfirmSuccess) return;

    const timeout = window.setTimeout(() => {
      setHandoffConfirmSuccess(null);
    }, 2500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [handoffConfirmSuccess]);

  const recentActivityJobs = companyJobs.slice(0, 5);

  useEffect(() => {
    let isMounted = true;

    const fetchJobs = async () => {
      try {
        const res = await fetch("/api/jobs?company=build-electric", {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch jobs");
        }

        const data = await res.json();

        if (isMounted) {
          setCompanyJobs(data.jobs ?? []);
          setIsLoadingJobs(false);
        }
      } catch (error) {
        console.error("Dashboard job fetch failed:", error);
        if (isMounted) {
          setIsLoadingJobs(false);
        }
      }
    };

    fetchJobs();

    const interval = setInterval(fetchJobs, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (dispatchMode !== "Auto" || companyJobs.length === 0) return;

    const pendingJobs = companyJobs.filter(
      (job) => job.status === "Awaiting Dispatch" && !job.driverId
    );

    pendingJobs.forEach((job) => {
      void autoAssignJob(job);
    });
  }, [dispatchMode, companyJobs, driverAcceptanceMode, workspaceSettings.operationalMode]);

  const isDark = themeMode === "dark";

  const pageBg = isDark ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-950";
  const topBarBg = isDark
    ? "border-white/10 bg-slate-950/90"
    : "border-slate-300 bg-white/90";
  const cardBg = isDark
    ? "border-white/10 bg-white/5 text-white shadow-none"
    : "border-slate-300 bg-white text-slate-900 shadow-sm";
  const mutedText = isDark ? "text-white/60" : "text-slate-500";
  const secondaryBtn = isDark
    ? "border border-white/10 bg-white/5 text-white hover:bg-white/10"
    : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100";
  const panelBg = isDark
    ? "border-white/10 bg-slate-900/70"
    : "border-slate-200 bg-slate-50";
  const toolbarGroup = isDark
    ? "flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1 text-xs"
    : "flex items-center gap-1 rounded-lg border border-slate-300 bg-white p-1 text-xs";

  return (
    <main className={`min-h-screen ${pageBg}`}>
      <AppShellNav />
      <div className={`border-b ${topBarBg} backdrop-blur`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
              Dispatch Platform
            </p>
            <h1 className="mt-1 text-2xl font-semibold">
              {workspaceSettings.companyName} Dispatch Dashboard
            </h1>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-cyan-200">
                Intake: {workspaceSettings.jobIntakeSource}
              </span>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-cyan-200">
                Driver Acceptance: {driverAcceptanceMode}
              </span>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-cyan-200">
                Dispatch Mode: {dispatchMode}
              </span>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-cyan-200">
                Workflow: {dashboardSurface.modeLabel}
              </span>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-cyan-200">
                Route: {dashboardSurface.routeTemplateLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowCreateJobModal(true)}
              disabled={workspaceSettings.jobIntakeSource === "booking"}
              className="h-9 rounded-lg bg-cyan-500 px-3 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Create Job
            </Button>

            <div className={toolbarGroup}>
              <span className="mr-2 text-[11px] font-semibold uppercase tracking-widest text-cyan-300/80">
                Dispatch Mode
              </span>
              {(["Manual", "Assisted", "Auto"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setDispatchMode(mode);
                    const next = writeWorkspaceSettings({
                      ...workspaceSettings,
                      dispatchMode: mode,
                    });
                    setWorkspaceSettings(next);
                  }}
                  className={`rounded-md px-2.5 py-1.5 transition ${
                    dispatchMode === mode
                      ? "bg-cyan-500 text-slate-950"
                      : isDark
                      ? "text-white/70 hover:bg-white/10 hover:text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <Button
              variant="secondary"
              onClick={() => setShowDashboardControlsModal(true)}
              className={`${secondaryBtn} h-9 rounded-lg px-3 text-xs`}
            >
              <Settings2 className="mr-2 h-4 w-4" />
              Dashboard Controls
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[280px_minmax(0,1fr)_340px]">
        <aside className="space-y-6">
          <Card className={`rounded-2xl ${cardBg}`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-cyan-300">
                <LayoutDashboard className="h-5 w-5" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em]">
                  Views
                </h2>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                {([
                  { key: "map", label: "Map View" },
                  { key: "grid", label: "Grid View" },
                  { key: "table", label: "Table View" },
                  { key: "drivers", label: "Driver View" },
                  { key: "analytics", label: "Analytics" },
                ] as const).map((view) => (
                  <button
                    key={view.key}
                    onClick={() => setActiveView(view.key)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      activeView === view.key
                        ? "border-cyan-400/30 bg-cyan-400/10"
                        : isDark
                        ? "border-white/10 bg-white/5 hover:bg-white/10"
                        : "border-slate-300 bg-white hover:bg-slate-100"
                    }`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className={`rounded-2xl ${cardBg}`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-cyan-300">
                <Users className="h-5 w-5" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em]">
                  Drivers
                </h2>
              </div>

              <div className="mt-4 space-y-3">
                {companyDrivers.map((driver) => (
                  <div
                    key={driver.name}
                    className={`rounded-xl border ${panelBg} p-4`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{driver.name}</p>
                      <span className="text-xs text-cyan-300">{driver.status}</span>
                    </div>
                    <p className={`mt-2 text-sm ${mutedText}`}>{driver.zone}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>

        <section>
          {activeView === "map" ? (
            <Card className={`overflow-hidden rounded-2xl ${cardBg}`}>
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div>
                    <h2 className="text-lg font-semibold">Live Dispatch Map</h2>
                    <p className={`text-sm ${mutedText}`}>
                      Main operational map for jobs, routes, and drivers
                    </p>
                  </div>
                  <div className={`text-xs font-semibold uppercase tracking-widest ${mutedText}`}>
                    {dispatchMode} Mode
                  </div>
                </div>

                <div className="relative">
                  <DispatchMap
                    companyName={workspaceSettings.companyName || "Dispatch Platform"}
                    themeMode={themeMode}
                  />
                  <div
                    className={`pointer-events-none absolute right-4 top-4 rounded-xl border px-4 py-3 text-sm backdrop-blur ${
                      isDark
                        ? "border-white/10 bg-slate-900/80 text-white/80"
                        : "border-slate-300 bg-white/85 text-slate-700"
                    }`}
                  >
                    {openJobsCount > 0 ? `${openJobsCount} Open Jobs` : "No Open Jobs"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeView === "table" ? (
            <Card className={`rounded-2xl ${cardBg}`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-cyan-300">
                  <MapPinned className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Jobs Table View</h2>
                </div>
                <p className={`mt-1 text-sm ${mutedText}`}>
                  Job list and actions shaped by operational mode and route template.
                </p>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  {dashboardSurface.workflowStatuses.map((status) => (
                    <span
                      key={status}
                      className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-white/75"
                    >
                      {status}
                    </span>
                  ))}
                </div>

                <div className="mt-4 space-y-3">
                  {!isLoadingJobs && companyJobs.length === 0 ? (
                    <div className={`rounded-xl border ${panelBg} p-4 text-sm ${mutedText}`}>
                      No jobs yet.
                    </div>
                  ) : (
                    companyJobs.map((job) => (
                      <div key={job.id} className={`rounded-xl border ${panelBg} p-4`}>
                        <div className="grid gap-2 text-sm md:grid-cols-2">
                          <p>ID: <span className="font-semibold">{job.id}</span></p>
                          <p>Status: <span className="font-semibold">{getDisplayStatusLabel(job.status)}</span></p>
                          <p>Service: <span className="font-semibold">{job.service ?? "—"}</span></p>
                          <p>Customer: <span className="font-semibold">{job.name ?? "—"}</span></p>
                          <p>Phone: <span className="font-semibold">{job.phone ?? "—"}</span></p>
                          <p>Address: <span className="font-semibold">{job.address ?? "—"}</span></p>
                          <p>Driver: <span className="font-semibold">{getDriverName(job.driverId)}</span></p>
                          <p>ETA: <span className="font-semibold">{job.etaMinutes != null ? `${job.etaMinutes} min` : "—"}</span></p>
                          {dashboardSurface.showsVerificationColumn ? (
                            <p>
                              Verification: <span className="font-semibold">
                                {job.handoffVerifiedAt ? "Completed" : "Pending"}
                              </span>
                            </p>
                          ) : null}
                        </div>

                        {isClearableJob(job) ? (
                          <div className="mt-3 flex justify-end">
                            <Button
                              onClick={() => requestClearJob(job)}
                              variant="secondary"
                              disabled={isClearingJobs}
                              className={secondaryBtn}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Clear
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeView === "grid" ? (
            <Card className={`rounded-2xl ${cardBg}`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-cyan-300">
                  <LayoutDashboard className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Jobs Grid View</h2>
                </div>
                <p className={`mt-1 text-sm ${mutedText}`}>
                  Mode-specific card structure for active dispatch jobs.
                </p>

                {!isLoadingJobs && companyJobs.length === 0 ? (
                  <div className={`mt-4 rounded-xl border ${panelBg} p-4 text-sm ${mutedText}`}>
                    No jobs yet.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {companyJobs.map((job) => (
                      <div key={job.id} className={`rounded-xl border ${panelBg} p-4`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{job.id}</p>
                            <p className="mt-1 text-sm text-white/65">{job.name ?? "—"}</p>
                          </div>
                          <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[11px] text-cyan-300">
                            {getDisplayStatusLabel(job.status)}
                          </span>
                        </div>

                        <div className="mt-4 space-y-1 text-sm text-white/70">
                          <p>Service: {job.service ?? "—"}</p>
                          <p>
                            {workspaceSettings.operationalMode === "Direct Service"
                              ? "Address"
                              : "Route"}
                            : {job.address ?? "—"}
                          </p>
                          <p>Driver: {getDriverName(job.driverId)}</p>
                          <p>ETA: {job.etaMinutes != null ? `${job.etaMinutes} min` : "—"}</p>
                        </div>

                        <div className="mt-4 flex gap-2">
                          {!isClearableJob(job) ? (
                            <Button
                              onClick={() => handleAssign(job.id)}
                              className="flex-1 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                            >
                              {dashboardSurface.assignActionLabel}
                            </Button>
                          ) : (
                            <Button
                              onClick={() => requestClearJob(job)}
                              variant="secondary"
                              disabled={isClearingJobs}
                              className={`flex-1 ${secondaryBtn} disabled:opacity-50`}
                            >
                              Clear
                            </Button>
                          )}
                          <Button
                            onClick={() => setSelectedJob(job)}
                            variant="secondary"
                            className={`flex-1 ${secondaryBtn}`}
                          >
                            Open
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {activeView === "drivers" ? (
            <Card className={`rounded-2xl ${cardBg}`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-cyan-300">
                  <Users className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Driver Operations</h2>
                </div>
                <p className={`mt-1 text-sm ${mutedText}`}>
                  Current driver status and assigned workload.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {companyDrivers.map((driver) => (
                    <div key={driver.id} className={`rounded-xl border ${panelBg} p-4`}>
                      <p className="font-semibold">{driver.name}</p>
                      <p className={`mt-2 text-sm ${mutedText}`}>Status: {driver.status}</p>
                      <p className={`mt-1 text-sm ${mutedText}`}>Zone: {driver.zone ?? "—"}</p>
                      <p className="mt-1 text-sm">
                        Assigned Jobs: <span className="font-semibold">{getAssignedJobsCountByDriver(driver.id)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeView === "analytics" ? (
            <Card className={`rounded-2xl ${cardBg}`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-cyan-300">
                  <LayoutDashboard className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Analytics</h2>
                </div>
                <p className={`mt-1 text-sm ${mutedText}`}>
                  Job and driver summary with recent activity.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className={`rounded-xl border ${panelBg} p-4`}>
                    <p className={`text-xs uppercase tracking-[0.2em] ${mutedText}`}>Total Jobs</p>
                    <p className="mt-2 text-2xl font-semibold">{companyJobs.length}</p>
                  </div>
                  <div className={`rounded-xl border ${panelBg} p-4`}>
                    <p className={`text-xs uppercase tracking-[0.2em] ${mutedText}`}>Awaiting Dispatch</p>
                    <p className="mt-2 text-2xl font-semibold">{awaitingDispatchCount}</p>
                  </div>
                  <div className={`rounded-xl border ${panelBg} p-4`}>
                    <p className={`text-xs uppercase tracking-[0.2em] ${mutedText}`}>Assigned</p>
                    <p className="mt-2 text-2xl font-semibold">{assignedCount}</p>
                  </div>
                  <div className={`rounded-xl border ${panelBg} p-4`}>
                    <p className={`text-xs uppercase tracking-[0.2em] ${mutedText}`}>Completed</p>
                    <p className="mt-2 text-2xl font-semibold">{completedCount}</p>
                  </div>
                  <div className={`rounded-xl border ${panelBg} p-4`}>
                    <p className={`text-xs uppercase tracking-[0.2em] ${mutedText}`}>Total Drivers</p>
                    <p className="mt-2 text-2xl font-semibold">{companyDrivers.length}</p>
                  </div>
                </div>

                <div className="mt-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                    Recent Activity
                  </h3>
                  <div className="mt-3 space-y-2">
                    {recentActivityJobs.length === 0 ? (
                      <div className={`rounded-xl border ${panelBg} p-4 text-sm ${mutedText}`}>
                        No recent activity.
                      </div>
                    ) : (
                      recentActivityJobs.map((job) => (
                        <div key={job.id} className={`rounded-xl border ${panelBg} p-3 text-sm`}>
                          <p className="font-semibold">{job.id}</p>
                          <p className={`mt-1 ${mutedText}`}>
                            {getDisplayStatusLabel(job.status)} • {job.service ?? "Service Request"} • {job.name ?? "—"}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </section>

        <aside>
          {workspaceSettings.jobIntakeSource === "booking" ? (
            <Card className={`mb-6 rounded-2xl ${cardBg}`}>
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  Intake Policy
                </p>
                <p className="mt-2 text-sm text-white/75">
                  Booking-first intake is enabled. New jobs should enter through the booking flow.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* Broadcast Alert Panel */}
          <Card className={`rounded-2xl ${cardBg}`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-yellow-300">
                <Bell className="h-5 w-5" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em]">Broadcast Alert</h2>
              </div>
              <p className="mt-2 text-xs text-white/70">Send a live alert to all drivers. In-app only.</p>
              <textarea
                className="mt-4 w-full rounded-lg border border-yellow-400/20 bg-slate-900/80 p-3 text-sm text-yellow-200 focus:border-yellow-400 focus:outline-none"
                rows={3}
                placeholder="Type your alert message..."
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
              />
              <Button
                className="mt-3 w-full bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 disabled:opacity-60"
                onClick={handleSendBroadcast}
                disabled={!broadcastMessage.trim()}
              >
                Send Broadcast Alert
              </Button>
            </CardContent>
          </Card>
          {/* Existing Open Jobs panel below... */}
          <Card className={`rounded-2xl ${cardBg}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  Open Jobs
                </h2>
                <span className="text-xs text-white/50">
                  {isLoadingJobs ? "Loading..." : `${companyJobs.length} total`}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {!isLoadingJobs && companyJobs.length === 0 ? (
                  <div className={`rounded-xl border ${panelBg} p-4 text-sm ${mutedText}`}>
                    No jobs yet.
                  </div>
                ) : (
                  companyJobs.map((job) => (
                    <div
                      key={job.id}
                      className={`rounded-xl border ${panelBg} p-4`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{job.id}</p>
                          <p className="mt-1 text-sm text-white/65">
                            {job.service ?? "Service Request"}
                          </p>
                        </div>
                        <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[11px] text-cyan-300">
                          {getDisplayStatusLabel(job.status)}
                        </span>
                      </div>

                      <div className="mt-4 space-y-1 text-sm text-white/70">
                        <p>Customer: {job.name ?? "—"}</p>
                        <p>Phone: {job.phone ?? "—"}</p>
                        <p>
                          {workspaceSettings.operationalMode === "Direct Service"
                            ? "Address"
                            : "Route"}
                          : {job.address ?? "—"}
                        </p>
                        <p>Driver: {getDriverName(job.driverId)}</p>
                        <p>ETA: {job.etaMinutes != null ? `${job.etaMinutes} min` : "—"}</p>
                      </div>

                      {job.details ? (
                        <p className={`mt-3 text-sm ${mutedText}`}>{job.details}</p>
                      ) : null}

                      <div className="mt-4 flex gap-2">
                        {!isClearableJob(job) ? (
                          <Button
                            onClick={() => handleAssign(job.id)}
                            className="flex-1 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                          >
                            {dashboardSurface.assignActionLabel}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => requestClearJob(job)}
                            variant="secondary"
                            disabled={isClearingJobs}
                            className={`flex-1 ${secondaryBtn} disabled:opacity-50`}
                          >
                            Clear
                          </Button>
                        )}
                        <Button
                          onClick={() => setSelectedJob(job)}
                          variant="secondary"
                          className={`flex-1 ${secondaryBtn}`}
                        >
                          Open
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <Modal
        isOpen={!!selectedJob}
        onClose={() => {
          setSelectedJob(null);
          setHandoffConfirmError(null);
          setHandoffConfirmSuccess(null);
        }}
        title={selectedJob ? `Job ${selectedJob.id}` : "Job Details"}
      >
        {selectedJob ? (
          <div className="space-y-4 text-slate-800">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Status
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {getDisplayStatusLabel(selectedJob.status)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Service
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {selectedJob.service ?? "Service Request"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Customer
              </p>
              <p className="mt-2 text-base font-medium">{selectedJob.name ?? "—"}</p>
              <p className="text-sm text-slate-600">{selectedJob.phone ?? "—"}</p>
            </div>

            <div className="rounded-2xl bg-slate-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Address
              </p>
              <p className="mt-2 text-base font-medium">{selectedJob.address ?? "—"}</p>
            </div>

            <div className="rounded-2xl bg-slate-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Driver
              </p>
              <p className="mt-2 text-base font-medium">
                {getDriverName(selectedJob.driverId)}
              </p>
              <p className="text-sm text-slate-600">
                ETA: {selectedJob.etaMinutes != null ? `${selectedJob.etaMinutes} min` : "—"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Customer Tracking
              </p>
              {workspaceSettings.customerTrackingEnabled ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <Link
                    href={`/track/${selectedJob.id}`}
                    className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Open tracking page
                  </Link>
                  <p className="text-xs text-slate-500">
                    Last update: {formatTimelineAt(selectedJob.updatedAt ?? selectedJob.createdAt)}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-600">
                  Customer tracking is disabled in workspace settings.
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-slate-100 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Handoff Verification
                </p>
                {selectedJob.handoffVerifiedAt ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified
                  </span>
                ) : (
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    Pending
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-700">
                {!workspaceSettings.proofOfDeliveryEnabled && !workspaceSettings.qrHandoffEnabled
                  ? "Verification controls are disabled in workspace settings."
                  : selectedJob.handoffVerifiedAt
                  ? `Verified at ${formatTimelineAt(selectedJob.handoffVerifiedAt)}`
                  : "Customer confirmation not yet recorded."}
              </p>
              {workspaceSettings.qrHandoffEnabled && selectedJob.verificationToken ? (
                <p className="mt-1 text-xs text-slate-500">
                  Verification token: {selectedJob.verificationToken}
                </p>
              ) : null}
              {(workspaceSettings.proofOfDeliveryEnabled || workspaceSettings.qrHandoffEnabled) &&
              selectedJob.verificationToken &&
              !selectedJob.handoffVerifiedAt ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {workspaceSettings.dispatcherCanConfirmHandoff ? (
                    <Button
                      onClick={() =>
                        void confirmSelectedJobVerification(
                          "confirm-handoff",
                          selectedJob.verificationToken
                        )
                      }
                      disabled={isConfirmingHandoff}
                      className="h-8 rounded-lg bg-slate-900 px-3 text-xs text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {isConfirmingHandoff ? "Confirming..." : "Confirm Handoff"}
                    </Button>
                  ) : (
                    <p className="text-xs text-slate-500">Driver confirmation required by policy.</p>
                  )}
                  {workspaceSettings.pickupVerificationEnabled && selectedJob.pickupVerificationToken ? (
                    <Button
                      onClick={() =>
                        void confirmSelectedJobVerification(
                          "confirm-pickup",
                          selectedJob.pickupVerificationToken
                        )
                      }
                      disabled={isConfirmingHandoff}
                      variant="secondary"
                      className="h-8 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Confirm Pickup
                    </Button>
                  ) : null}
                  {workspaceSettings.deliveryVerificationEnabled && selectedJob.deliveryVerificationToken ? (
                    <Button
                      onClick={() =>
                        void confirmSelectedJobVerification(
                          "confirm-delivery",
                          selectedJob.deliveryVerificationToken
                        )
                      }
                      disabled={isConfirmingHandoff}
                      variant="secondary"
                      className="h-8 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Confirm Delivery
                    </Button>
                  ) : null}
                  {handoffConfirmError ? (
                    <p className="text-xs text-rose-600">{handoffConfirmError}</p>
                  ) : null}
                  {handoffConfirmSuccess ? (
                    <p className="text-xs text-emerald-700">{handoffConfirmSuccess}</p>
                  ) : null}
                </div>
              ) : null}

              {(workspaceSettings.pickupVerificationEnabled ||
                workspaceSettings.deliveryVerificationEnabled) &&
              (selectedJob.pickupVerificationToken || selectedJob.deliveryVerificationToken) ? (
                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  {workspaceSettings.pickupVerificationEnabled && selectedJob.pickupVerificationToken ? (
                    <p>
                      Pickup token: {selectedJob.pickupVerificationToken}
                      {selectedJob.pickupVerifiedAt
                        ? ` • verified ${formatTimelineAt(selectedJob.pickupVerifiedAt)}`
                        : " • pending"}
                    </p>
                  ) : null}
                  {workspaceSettings.deliveryVerificationEnabled && selectedJob.deliveryVerificationToken ? (
                    <p>
                      Delivery token: {selectedJob.deliveryVerificationToken}
                      {selectedJob.deliveryVerifiedAt
                        ? ` • verified ${formatTimelineAt(selectedJob.deliveryVerifiedAt)}`
                        : " • pending"}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl bg-slate-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Timeline & Audit Trail
              </p>
              <div className="mt-3 space-y-2">
                {getJobTimeline(selectedJob).map((event, index) => (
                  <div key={`${event.at}-${event.label}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{event.label}</p>
                      <p className="text-xs text-slate-500">{formatTimelineAt(event.at)}</p>
                    </div>
                    {event.status ? (
                      <p className="mt-1 text-xs font-medium text-cyan-700">
                        Status: {getDisplayStatusLabel(event.status)}
                      </p>
                    ) : null}
                    {event.detail ? (
                      <p className="mt-1 text-sm text-slate-600">{event.detail}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Details
              </p>
              <p className="mt-2 text-base text-slate-700">
                {selectedJob.details ?? "No extra details provided."}
              </p>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(pendingClearJob)}
        onClose={() => setPendingClearJob(null)}
        title="Clear job from dispatch board?"
      >
        <div className="space-y-4 text-slate-800">
          <div className="rounded-2xl bg-slate-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Job ID
            </p>
            <p className="mt-2 text-base font-semibold">{pendingClearJob?.id ?? "—"}</p>
          </div>

          <p className="text-sm text-slate-600">
            This job will be removed from the active dispatch board.
          </p>

          <div className="flex gap-3">
            <Button
              onClick={() => setPendingClearJob(null)}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void confirmClearJob()}
              disabled={isClearingJobs}
              className="flex-1 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Confirm Clear
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showClearCompletedModal}
        onClose={() => setShowClearCompletedModal(false)}
        title="Clear completed jobs from dispatch board?"
      >
        <div className="space-y-4 text-slate-800">
          <p className="text-sm text-slate-600">
            {clearableJobsCount} completed/cancelled job{clearableJobsCount === 1 ? "" : "s"} will be removed from the active dispatch board.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowClearCompletedModal(false)}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void confirmClearCompletedJobs()}
              disabled={isClearingJobs}
              className="flex-1 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Confirm Clear
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showCreateJobModal}
        onClose={() => setShowCreateJobModal(false)}
        title="Create Manual Job"
      >
        <form
          className="space-y-4 text-slate-800"
          onSubmit={async (event) => {
            event.preventDefault();
            await createManualJob(new FormData(event.currentTarget));
          }}
        >
          <label className="block">
            <span className="mb-2 block text-sm text-slate-600">Customer Name</span>
            <input
              name="name"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
              placeholder="Customer full name"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-600">Phone</span>
            <input
              name="phone"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
              placeholder="(555) 555-5555"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-600">Service / Job Type</span>
            <input
              name="service"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
              placeholder="Emergency Service"
            />
          </label>

          {workspaceSettings.operationalMode === "Direct Service" ? (
            <label className="block">
              <span className="mb-2 block text-sm text-slate-600">Address</span>
              <input
                name="address"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                placeholder="Street address"
              />
            </label>
          ) : (
            <>
              <label className="block">
                <span className="mb-2 block text-sm text-slate-600">Pickup Address</span>
                <input
                  name="pickupAddress"
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                  placeholder="Pickup location"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-slate-600">Dropoff Address</span>
                <input
                  name="dropoffAddress"
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                  placeholder="Dropoff location"
                />
              </label>

              {workspaceSettings.jobStructureMode === "Multi-stop route" ? (
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-600">Intermediate Stops</span>
                  <textarea
                    name="intermediateStops"
                    rows={3}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                    placeholder="Optional stops, one per line"
                  />
                </label>
              ) : null}
            </>
          )}

          <label className="block">
            <span className="mb-2 block text-sm text-slate-600">Notes</span>
            <textarea
              name="details"
              rows={4}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
              placeholder="Additional dispatch notes"
            />
          </label>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => setShowCreateJobModal(false)}
              type="button"
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreatingJob || workspaceSettings.jobIntakeSource === "booking"}
              className="flex-1 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {workspaceSettings.jobIntakeSource === "booking"
                ? "Manual Intake Disabled"
                : isCreatingJob
                ? "Creating..."
                : "Create Job"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showDashboardControlsModal}
        onClose={() => setShowDashboardControlsModal(false)}
        title="Dashboard Controls"
      >
        <div className="space-y-6 text-slate-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Driver Acceptance
            </p>
            <div className="mt-3 flex gap-2">
              {([
                { value: "manual", label: "Manual" },
                { value: "auto", label: "Auto-Accept" },
              ] as const).map((mode) => (
                <Button
                  key={mode.value}
                  variant={driverAcceptanceMode === mode.value ? "default" : "secondary"}
                  onClick={() => {
                    setDriverAcceptanceMode(mode.value);
                    if (company?.slug) {
                      setStoredDriverAcceptanceMode(company.slug, mode.value);
                      const next = writeWorkspaceSettings({
                        ...workspaceSettings,
                        driverAcceptanceMode: mode.value,
                      });
                      setWorkspaceSettings(next);
                    }
                  }}
                >
                  {mode.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Theme
            </p>
            <div className="mt-3 flex gap-2">
              {(["dark", "light"] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={themeMode === mode ? "default" : "secondary"}
                  onClick={() => setThemeMode(mode)}
                  className="capitalize"
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Dispatch Board Maintenance
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Remove completed and cancelled jobs from the active board.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setShowDashboardControlsModal(false);
                requestClearCompletedJobs();
              }}
              disabled={isClearingJobs || clearableJobsCount === 0}
              className="mt-4"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Completed Jobs
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showNoDriversModal}
        onClose={() => setShowNoDriversModal(false)}
        title="No Drivers Available"
      >
        <div className="space-y-4 text-slate-800">
          <p className="text-sm text-slate-600">
            There are no available drivers to assign this job right now.
          </p>
          <Button
            onClick={() => setShowNoDriversModal(false)}
            className="w-full bg-slate-900 text-white hover:bg-slate-800"
          >
            Close
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(pendingAssistedAssign)}
        onClose={() => setPendingAssistedAssign(null)}
        title="Confirm Assignment"
      >
        <div className="space-y-4 text-slate-800">
          <p className="text-sm text-slate-600">
            Recommended driver: {pendingAssistedAssign?.driverName ?? "—"}
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => setPendingAssistedAssign(null)}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void confirmAssistedAssign()}
              className="flex-1 bg-slate-900 text-white hover:bg-slate-800"
            >
              Assign
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAssignErrorModal}
        onClose={() => setShowAssignErrorModal(false)}
        title="Assignment Failed"
      >
        <div className="space-y-4 text-slate-800">
          <p className="text-sm text-slate-600">
            Could not assign job. Please try again.
          </p>
          <Button
            onClick={() => setShowAssignErrorModal(false)}
            className="w-full bg-slate-900 text-white hover:bg-slate-800"
          >
            Close
          </Button>
        </div>
      </Modal>
    </main>
  );
}
