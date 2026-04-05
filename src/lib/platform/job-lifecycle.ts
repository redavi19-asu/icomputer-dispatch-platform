import type { OperationalMode } from "@/lib/platform/workspace-preferences";

export type JobStatusLabel =
  | "Awaiting Dispatch"
  | "Assigned"
  | "Accepted"
  | "En Route"
  | "Arrived"
  | "In Progress"
  | "Go to Pickup"
  | "Arrived at Pickup"
  | "Pickup Confirmed"
  | "En Route to Customer"
  | "Delivered"
  | "Pickup Required"
  | "Pickup Verified"
  | "In Transit"
  | "Dropoff Required"
  | "Delivery Verified"
  | "Completed"
  | "Cancelled";

export type JobTimelineEvent = {
  type: "status" | "verification" | "system";
  label: string;
  detail?: string;
  at: string;
  status?: JobStatusLabel;
};

const STATUS_LABELS: Record<string, string> = {
  "Awaiting Dispatch": "Awaiting dispatch",
  Assigned: "Assigned",
  Accepted: "Accepted",
  "En Route": "En route",
  Arrived: "Arrived",
  "In Progress": "Service started",
  "Go to Pickup": "Go to pickup",
  "Arrived at Pickup": "Arrived at pickup",
  "Pickup Confirmed": "Pickup confirmed",
  "En Route to Customer": "En route to customer",
  Delivered: "Delivered",
  "Pickup Required": "Pickup required",
  "Pickup Verified": "Pickup verified",
  "In Transit": "In transit",
  "Dropoff Required": "Dropoff required",
  "Delivery Verified": "Delivery verified",
  Completed: "Delivered / completed",
  Cancelled: "Cancelled",
};

export const getDisplayStatusLabel = (status: string) => {
  return STATUS_LABELS[status] ?? status;
};

const DIRECT_SERVICE_STAGES: Array<{ status: JobStatusLabel; label: string }> = [
  { status: "Assigned", label: "Assigned" },
  { status: "En Route", label: "En route" },
  { status: "Arrived", label: "Arrived" },
  { status: "In Progress", label: "Service started" },
  { status: "Completed", label: "Delivered / completed" },
];

const PICKUP_DELIVER_STAGES: Array<{ status: JobStatusLabel; label: string }> = [
  { status: "Assigned", label: "Assigned" },
  { status: "Go to Pickup", label: "Go to pickup" },
  { status: "Arrived at Pickup", label: "Arrived at pickup" },
  { status: "Pickup Confirmed", label: "Pickup confirmed" },
  { status: "En Route to Customer", label: "En route to customer" },
  { status: "Delivered", label: "Delivered" },
  { status: "Completed", label: "Completed" },
];

const CHAIN_OF_CUSTODY_STAGES: Array<{ status: JobStatusLabel; label: string }> = [
  { status: "Assigned", label: "Assigned" },
  { status: "Pickup Required", label: "Pickup required" },
  { status: "Pickup Verified", label: "Pickup verified" },
  { status: "In Transit", label: "In transit" },
  { status: "Dropoff Required", label: "Dropoff required" },
  { status: "Delivery Verified", label: "Delivery verified" },
  { status: "Completed", label: "Completed" },
];

export const getTrackingStagesForMode = (mode: OperationalMode) => {
  if (mode === "Pickup Then Deliver") {
    return PICKUP_DELIVER_STAGES;
  }

  if (mode === "Chain of Custody") {
    return CHAIN_OF_CUSTODY_STAGES;
  }

  return DIRECT_SERVICE_STAGES;
};

const reverseStatusFlow = (flow: JobStatusLabel[]) => {
  return flow.reduce<Record<string, JobStatusLabel | null>>((acc, status, index) => {
    acc[status] = index > 0 ? flow[index - 1] : null;
    return acc;
  }, {});
};

export const getStatusFlowForMode = (
  mode: OperationalMode,
  requiresManualAcceptance = false
) => {
  if (mode === "Pickup Then Deliver") {
    const flow: JobStatusLabel[] = [
      "Assigned",
      "Go to Pickup",
      "Arrived at Pickup",
      "Pickup Confirmed",
      "En Route to Customer",
      "Delivered",
      "Completed",
    ];
    return {
      next: flow.reduce<Record<string, JobStatusLabel | null>>((acc, status, index) => {
        acc[status] = flow[index + 1] ?? null;
        return acc;
      }, {}),
      previous: reverseStatusFlow(flow),
    };
  }

  if (mode === "Chain of Custody") {
    const flow: JobStatusLabel[] = [
      "Assigned",
      "Pickup Required",
      "Pickup Verified",
      "In Transit",
      "Dropoff Required",
      "Delivery Verified",
      "Completed",
    ];
    return {
      next: flow.reduce<Record<string, JobStatusLabel | null>>((acc, status, index) => {
        acc[status] = flow[index + 1] ?? null;
        return acc;
      }, {}),
      previous: reverseStatusFlow(flow),
    };
  }

  const flow: JobStatusLabel[] = requiresManualAcceptance
    ? ["Assigned", "Accepted", "En Route", "Arrived", "In Progress", "Completed"]
    : ["Assigned", "En Route", "Arrived", "In Progress", "Completed"];

  return {
    next: flow.reduce<Record<string, JobStatusLabel | null>>((acc, status, index) => {
      acc[status] = flow[index + 1] ?? null;
      return acc;
    }, {}),
    previous: reverseStatusFlow(flow),
  };
};

export const createInitialStatusHistory = (createdAt: string): JobTimelineEvent[] => {
  return [
    {
      type: "status",
      label: "Request created",
      detail: "Customer request entered dispatch queue",
      at: createdAt,
      status: "Awaiting Dispatch",
    },
  ];
};

export const normalizeTimeline = (value: unknown, fallbackCreatedAt: string): JobTimelineEvent[] => {
  if (!Array.isArray(value)) {
    return createInitialStatusHistory(fallbackCreatedAt);
  }

  const parsed = value
    .filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
    .map((entry) => {
      const at = typeof entry.at === "string" && entry.at.trim().length > 0 ? entry.at : fallbackCreatedAt;
      const eventType: JobTimelineEvent["type"] =
        entry.type === "verification" || entry.type === "system"
          ? entry.type
          : "status";
      return {
        type: eventType,
        label:
          typeof entry.label === "string" && entry.label.trim().length > 0
            ? entry.label
            : "Status updated",
        detail: typeof entry.detail === "string" ? entry.detail : undefined,
        at,
        status: typeof entry.status === "string" ? (entry.status as JobStatusLabel) : undefined,
      };
    });

  return parsed.length > 0 ? parsed : createInitialStatusHistory(fallbackCreatedAt);
};

export const appendStatusEvent = (
  timeline: JobTimelineEvent[],
  status: string,
  at: string,
  detail?: string
) => {
  return [
    ...timeline,
    {
      type: "status" as const,
      label: getDisplayStatusLabel(status),
      detail,
      at,
      status: status as JobStatusLabel,
    },
  ];
};

export const appendVerificationEvent = (
  timeline: JobTimelineEvent[],
  at: string,
  detail: string,
  label = "Handoff verified"
) => {
  return [
    ...timeline,
    {
      type: "verification" as const,
      label,
      detail,
      at,
    },
  ];
};
