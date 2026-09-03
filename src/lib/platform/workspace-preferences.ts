import { resolveTenantSlug } from "@/lib/platform/tenant-context";

export type JobIntakeSource = "booking" | "dashboard" | "both";
export type DispatchMode = "Manual" | "Assisted" | "Auto";
export type DriverAcceptanceMode = "manual" | "auto";
export type OperationalMode =
  | "Direct Service"
  | "Pickup Then Deliver"
  | "Chain of Custody";
export type JobStructureMode = "One-stop job" | "Two-stop job" | "Multi-stop route";

export type WorkspaceSettingsState = {
  setupComplete: boolean;
  industry: string;
  bookingPageEnabled: boolean;
  driverAppEnabled: boolean;
  customerUpdatesEnabled: boolean;
  operationalMode: OperationalMode;
  customerTrackingEnabled: boolean;
  pickupVerificationEnabled: boolean;
  deliveryVerificationEnabled: boolean;
  proofOfDeliveryEnabled: boolean;
  qrHandoffEnabled: boolean;
  photoProofEnabled: boolean;
  signatureConfirmationEnabled: boolean;
  dispatcherCanConfirmHandoff: boolean;
  driverMustConfirmHandoff: boolean;
  jobStructureMode: JobStructureMode;
  baseRequiredBeforeFinalStop: boolean;
  returnToBaseAfterCompletion: boolean;
  baseAddress: string;
  jobIntakeSource: JobIntakeSource;
  dispatchMode: DispatchMode;
  driverAcceptanceMode: DriverAcceptanceMode;
  companyName: string;
  companySlug: string;
};

const SETTINGS_KEY_PREFIX = "dispatch.workspace.settings.";
const WORKSPACE_SETTINGS_UPDATED_EVENT = "dispatch:workspace-settings-updated";

export const defaultWorkspaceSettings: WorkspaceSettingsState = {
  setupComplete: false,
  industry: "",
  bookingPageEnabled: false,
  driverAppEnabled: true,
  customerUpdatesEnabled: true,
  operationalMode: "Direct Service",
  customerTrackingEnabled: true,
  pickupVerificationEnabled: false,
  deliveryVerificationEnabled: true,
  proofOfDeliveryEnabled: true,
  qrHandoffEnabled: true,
  photoProofEnabled: false,
  signatureConfirmationEnabled: false,
  dispatcherCanConfirmHandoff: true,
  driverMustConfirmHandoff: false,
  jobStructureMode: "One-stop job",
  baseRequiredBeforeFinalStop: false,
  returnToBaseAfterCompletion: false,
  baseAddress: "",
  jobIntakeSource: "dashboard",
  dispatchMode: "Manual",
  driverAcceptanceMode: "auto",
  companyName: "",
  companySlug: "company",
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isJobIntakeSource = (value: unknown): value is JobIntakeSource =>
  value === "booking" || value === "dashboard" || value === "both";

const isDispatchMode = (value: unknown): value is DispatchMode =>
  value === "Manual" || value === "Assisted" || value === "Auto";

const isDriverAcceptanceMode = (value: unknown): value is DriverAcceptanceMode =>
  value === "manual" || value === "auto";

const isOperationalMode = (value: unknown): value is OperationalMode =>
  value === "Direct Service" || value === "Pickup Then Deliver" || value === "Chain of Custody";

const isJobStructureMode = (value: unknown): value is JobStructureMode =>
  value === "One-stop job" || value === "Two-stop job" || value === "Multi-stop route";

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
    setupComplete: typeof value.setupComplete === "boolean" ? value.setupComplete : false,
    industry: typeof value.industry === "string" ? value.industry : "",
    bookingPageEnabled:
      typeof value.bookingPageEnabled === "boolean" ? value.bookingPageEnabled : false,
    driverAppEnabled:
      typeof value.driverAppEnabled === "boolean" ? value.driverAppEnabled : true,
    customerUpdatesEnabled:
      typeof value.customerUpdatesEnabled === "boolean" ? value.customerUpdatesEnabled : true,
    operationalMode: isOperationalMode(value.operationalMode)
      ? value.operationalMode
      : defaultWorkspaceSettings.operationalMode,
    customerTrackingEnabled:
      typeof value.customerTrackingEnabled === "boolean" ? value.customerTrackingEnabled : true,
    pickupVerificationEnabled:
      typeof value.pickupVerificationEnabled === "boolean" ? value.pickupVerificationEnabled : false,
    deliveryVerificationEnabled:
      typeof value.deliveryVerificationEnabled === "boolean" ? value.deliveryVerificationEnabled : true,
    proofOfDeliveryEnabled:
      typeof value.proofOfDeliveryEnabled === "boolean" ? value.proofOfDeliveryEnabled : true,
    qrHandoffEnabled:
      typeof value.qrHandoffEnabled === "boolean" ? value.qrHandoffEnabled : true,
    photoProofEnabled:
      typeof value.photoProofEnabled === "boolean" ? value.photoProofEnabled : false,
    signatureConfirmationEnabled:
      typeof value.signatureConfirmationEnabled === "boolean" ? value.signatureConfirmationEnabled : false,
    dispatcherCanConfirmHandoff:
      typeof value.dispatcherCanConfirmHandoff === "boolean" ? value.dispatcherCanConfirmHandoff : true,
    driverMustConfirmHandoff:
      typeof value.driverMustConfirmHandoff === "boolean" ? value.driverMustConfirmHandoff : false,
    jobStructureMode: isJobStructureMode(value.jobStructureMode)
      ? value.jobStructureMode
      : defaultWorkspaceSettings.jobStructureMode,
    baseRequiredBeforeFinalStop:
      typeof value.baseRequiredBeforeFinalStop === "boolean" ? value.baseRequiredBeforeFinalStop : false,
    returnToBaseAfterCompletion:
      typeof value.returnToBaseAfterCompletion === "boolean" ? value.returnToBaseAfterCompletion : false,
    baseAddress: typeof value.baseAddress === "string" ? value.baseAddress.trim() : "",
    jobIntakeSource: isJobIntakeSource(value.jobIntakeSource) ? value.jobIntakeSource : "dashboard",
    dispatchMode: isDispatchMode(value.dispatchMode) ? value.dispatchMode : "Manual",
    driverAcceptanceMode: isDriverAcceptanceMode(value.driverAcceptanceMode)
      ? value.driverAcceptanceMode
      : "auto",
    companyName: typeof value.companyName === "string" ? value.companyName.trim() : "",
    companySlug,
  };
};

export const readWorkspaceSettings = (companySlug = "company"): WorkspaceSettingsState => {
  const resolvedSlug = resolveTenantSlug(companySlug);

  if (typeof window === "undefined") {
    return { ...defaultWorkspaceSettings, companySlug: resolvedSlug };
  }

  const raw = window.localStorage.getItem(getKey(resolvedSlug));
  if (!raw) {
    return { ...defaultWorkspaceSettings, companySlug: resolvedSlug };
  }

  try {
    const normalized = normalizeWorkspaceSettings(JSON.parse(raw), resolvedSlug);
    return { ...normalized, companySlug: resolvedSlug };
  } catch {
    return { ...defaultWorkspaceSettings, companySlug: resolvedSlug };
  }
};

export const writeWorkspaceSettings = (settings: WorkspaceSettingsState): WorkspaceSettingsState => {
  const resolvedSlug = resolveTenantSlug(settings.companySlug || "company");
  const normalized = normalizeWorkspaceSettings(
    { ...settings, companySlug: resolvedSlug },
    resolvedSlug
  );

  if (typeof window !== "undefined") {
    window.localStorage.setItem(getKey(resolvedSlug), JSON.stringify(normalized));
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_SETTINGS_UPDATED_EVENT, {
        detail: { companySlug: resolvedSlug },
      })
    );
  }

  return normalized;
};
