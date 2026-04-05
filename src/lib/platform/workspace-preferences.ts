export type JobIntakeSource = "booking" | "dashboard" | "both";
export type DispatchMode = "Manual" | "Assisted" | "Auto";
export type DriverAcceptanceMode = "manual" | "auto";

export type WorkspaceSettingsState = {
  bookingPageEnabled: boolean;
  driverAppEnabled: boolean;
  customerUpdatesEnabled: boolean;
  customerTrackingEnabled: boolean;
  proofOfDeliveryEnabled: boolean;
  qrHandoffEnabled: boolean;
  jobIntakeSource: JobIntakeSource;
  dispatchMode: DispatchMode;
  driverAcceptanceMode: DriverAcceptanceMode;
  companyName: string;
  companySlug: string;
};

const SETTINGS_KEY_PREFIX = "dispatch.workspace.settings.";
const WORKSPACE_SETTINGS_UPDATED_EVENT = "dispatch:workspace-settings-updated";

export const defaultWorkspaceSettings: WorkspaceSettingsState = {
  bookingPageEnabled: true,
  driverAppEnabled: true,
  customerUpdatesEnabled: true,
  customerTrackingEnabled: true,
  proofOfDeliveryEnabled: true,
  qrHandoffEnabled: true,
  jobIntakeSource: "both",
  dispatchMode: "Manual",
  driverAcceptanceMode: "auto",
  companyName: "Build & Electric",
  companySlug: "build-electric",
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isJobIntakeSource = (value: unknown): value is JobIntakeSource => {
  return value === "booking" || value === "dashboard" || value === "both";
};

const isDispatchMode = (value: unknown): value is DispatchMode => {
  return value === "Manual" || value === "Assisted" || value === "Auto";
};

const isDriverAcceptanceMode = (value: unknown): value is DriverAcceptanceMode => {
  return value === "manual" || value === "auto";
};

const getKey = (companySlug: string) => `${SETTINGS_KEY_PREFIX}${companySlug}`;

export const normalizeWorkspaceSettings = (
  value: unknown,
  companySlugFallback: string
): WorkspaceSettingsState => {
  if (!isObject(value)) {
    return { ...defaultWorkspaceSettings, companySlug: companySlugFallback };
  }

  const companySlug =
    typeof value.companySlug === "string" && value.companySlug.trim().length > 0
      ? value.companySlug.trim()
      : companySlugFallback;

  return {
    bookingPageEnabled:
      typeof value.bookingPageEnabled === "boolean"
        ? value.bookingPageEnabled
        : defaultWorkspaceSettings.bookingPageEnabled,
    driverAppEnabled:
      typeof value.driverAppEnabled === "boolean"
        ? value.driverAppEnabled
        : defaultWorkspaceSettings.driverAppEnabled,
    customerUpdatesEnabled:
      typeof value.customerUpdatesEnabled === "boolean"
        ? value.customerUpdatesEnabled
        : defaultWorkspaceSettings.customerUpdatesEnabled,
    customerTrackingEnabled:
      typeof value.customerTrackingEnabled === "boolean"
        ? value.customerTrackingEnabled
        : defaultWorkspaceSettings.customerTrackingEnabled,
    proofOfDeliveryEnabled:
      typeof value.proofOfDeliveryEnabled === "boolean"
        ? value.proofOfDeliveryEnabled
        : defaultWorkspaceSettings.proofOfDeliveryEnabled,
    qrHandoffEnabled:
      typeof value.qrHandoffEnabled === "boolean"
        ? value.qrHandoffEnabled
        : defaultWorkspaceSettings.qrHandoffEnabled,
    jobIntakeSource: isJobIntakeSource(value.jobIntakeSource)
      ? value.jobIntakeSource
      : defaultWorkspaceSettings.jobIntakeSource,
    dispatchMode: isDispatchMode(value.dispatchMode)
      ? value.dispatchMode
      : defaultWorkspaceSettings.dispatchMode,
    driverAcceptanceMode: isDriverAcceptanceMode(value.driverAcceptanceMode)
      ? value.driverAcceptanceMode
      : defaultWorkspaceSettings.driverAcceptanceMode,
    companyName:
      typeof value.companyName === "string" && value.companyName.trim().length > 0
        ? value.companyName.trim()
        : defaultWorkspaceSettings.companyName,
    companySlug,
  };
};

export const readWorkspaceSettings = (companySlug = "build-electric"): WorkspaceSettingsState => {
  if (typeof window === "undefined") {
    return { ...defaultWorkspaceSettings, companySlug };
  }

  const raw = window.localStorage.getItem(getKey(companySlug));
  if (!raw) {
    return { ...defaultWorkspaceSettings, companySlug };
  }

  try {
    const parsed = JSON.parse(raw);
    return normalizeWorkspaceSettings(parsed, companySlug);
  } catch {
    return { ...defaultWorkspaceSettings, companySlug };
  }
};

export const writeWorkspaceSettings = (settings: WorkspaceSettingsState): WorkspaceSettingsState => {
  const normalized = normalizeWorkspaceSettings(settings, settings.companySlug || "build-electric");

  if (typeof window !== "undefined") {
    window.localStorage.setItem(getKey(normalized.companySlug), JSON.stringify(normalized));
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_SETTINGS_UPDATED_EVENT, {
        detail: { companySlug: normalized.companySlug },
      })
    );
  }

  return normalized;
};
