export type JobStatusLabel =
  | "Awaiting Dispatch"
  | "Assigned"
  | "Accepted"
  | "En Route"
  | "Arrived"
  | "In Progress"
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
  Completed: "Delivered / completed",
  Cancelled: "Cancelled",
};

export const getDisplayStatusLabel = (status: string) => {
  return STATUS_LABELS[status] ?? status;
};

export const TRACKING_STAGES: Array<{ status: JobStatusLabel; label: string }> = [
  { status: "Assigned", label: "Assigned" },
  { status: "En Route", label: "En route" },
  { status: "Arrived", label: "Arrived" },
  { status: "In Progress", label: "Service started" },
  { status: "Completed", label: "Delivered / completed" },
];

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
  detail: string
) => {
  return [
    ...timeline,
    {
      type: "verification" as const,
      label: "Handoff verified",
      detail,
      at,
    },
  ];
};
