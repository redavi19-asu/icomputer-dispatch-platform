import { getTrackingStagesForMode } from "@/lib/platform/job-lifecycle";
import type { WorkspaceSettingsState } from "@/lib/platform/workspace-preferences";

type IntakeField = {
  key: "serviceAddress" | "pickupAddress" | "dropoffAddress" | "intermediateStops";
  label: string;
  placeholder: string;
  required: boolean;
};

type BookingSurfaceConfig = {
  enabled: boolean;
  modeLabel: string;
  routeTemplateLabel: string;
  flowLabel: string;
  verificationLanguage: string | null;
  intakeFields: IntakeField[];
};

type DashboardSurfaceConfig = {
  modeLabel: string;
  routeTemplateLabel: string;
  assignActionLabel: string;
  workflowStatuses: string[];
  showsVerificationColumn: boolean;
};

type DriverSurfaceConfig = {
  enabled: boolean;
  modeLabel: string;
  routeTemplateLabel: string;
  workflowStatuses: string[];
  showsHandoffControls: boolean;
  showsVerificationChecklist: boolean;
};

type TrackingSurfaceConfig = {
  enabled: boolean;
  workflowStatuses: string[];
  showTimeline: boolean;
  showProofSection: boolean;
  showVerificationSection: boolean;
};

const getBookingFlowLabel = (settings: WorkspaceSettingsState) => {
  if (settings.operationalMode === "Pickup Then Deliver") {
    return "Pickup + dropoff booking flow";
  }

  if (settings.operationalMode === "Chain of Custody") {
    return "Pickup/dropoff flow with chain-of-custody verification";
  }

  return "Service address booking flow";
};

const getBookingIntakeFields = (settings: WorkspaceSettingsState): IntakeField[] => {
  const fields: IntakeField[] = [];

  if (settings.operationalMode === "Direct Service") {
    fields.push({
      key: "serviceAddress",
      label: "Service Address",
      placeholder: "Street address or landmark",
      required: true,
    });
  } else {
    fields.push(
      {
        key: "pickupAddress",
        label: "Pickup Address",
        placeholder: "Pickup location",
        required: true,
      },
      {
        key: "dropoffAddress",
        label: "Dropoff Address",
        placeholder: "Dropoff location",
        required: true,
      }
    );

    if (settings.jobStructureMode === "Multi-stop route") {
      fields.push({
        key: "intermediateStops",
        label: "Intermediate Stops",
        placeholder: "Optional stops, one per line",
        required: false,
      });
    }
  }

  return fields;
};

export const getBookingSurfaceConfig = (
  settings: WorkspaceSettingsState
): BookingSurfaceConfig => {
  return {
    enabled: settings.bookingPageEnabled,
    modeLabel: settings.operationalMode,
    routeTemplateLabel: settings.jobStructureMode,
    flowLabel: getBookingFlowLabel(settings),
    verificationLanguage:
      settings.operationalMode === "Chain of Custody"
        ? "Chain-of-custody verification checkpoints will be required during pickup and dropoff."
        : null,
    intakeFields: getBookingIntakeFields(settings),
  };
};

export const getDashboardSurfaceConfig = (
  settings: WorkspaceSettingsState
): DashboardSurfaceConfig => {
  const workflowStatuses = getTrackingStagesForMode(settings.operationalMode).map(
    (stage) => stage.label
  );

  const assignActionLabel =
    settings.operationalMode === "Pickup Then Deliver"
      ? "Assign Route"
      : settings.operationalMode === "Chain of Custody"
      ? "Assign Custody Run"
      : "Assign";

  return {
    modeLabel: settings.operationalMode,
    routeTemplateLabel: settings.jobStructureMode,
    assignActionLabel,
    workflowStatuses,
    showsVerificationColumn:
      settings.operationalMode === "Chain of Custody" ||
      settings.pickupVerificationEnabled ||
      settings.deliveryVerificationEnabled,
  };
};

export const getDriverSurfaceConfig = (
  settings: WorkspaceSettingsState
): DriverSurfaceConfig => {
  return {
    enabled: settings.driverAppEnabled,
    modeLabel: settings.operationalMode,
    routeTemplateLabel: settings.jobStructureMode,
    workflowStatuses: getTrackingStagesForMode(settings.operationalMode).map(
      (stage) => stage.label
    ),
    showsHandoffControls:
      settings.driverMustConfirmHandoff && settings.qrHandoffEnabled,
    showsVerificationChecklist:
      settings.pickupVerificationEnabled || settings.deliveryVerificationEnabled,
  };
};

export const getTrackingSurfaceConfig = (
  settings: WorkspaceSettingsState
): TrackingSurfaceConfig => {
  return {
    enabled: settings.customerTrackingEnabled,
    workflowStatuses: getTrackingStagesForMode(settings.operationalMode).map(
      (stage) => stage.label
    ),
    showTimeline: settings.customerUpdatesEnabled,
    // Proof-of-delivery/photo/signature capture are reserved in the settings schema,
    // but are not surfaced until a real capture + storage workflow exists.
    showProofSection: false,
    showVerificationSection:
      settings.qrHandoffEnabled ||
      settings.pickupVerificationEnabled ||
      settings.deliveryVerificationEnabled,
  };
};
