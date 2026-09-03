import authWorker from "./index";
import { handleDriverInviteAcceptance } from "./invite-accept";
import { handleDriverInviteSeatLimit } from "./invite-seat-limit";
import { handleDriverPayRequest } from "./driver-pay";
import { handleOperationsRequest } from "./operations";
import { handlePlanLimitRequest } from "./plan-limits";
import { handleWorkspaceSettingsRequest } from "./workspace-settings";

interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  ADMIN_EMAIL?: string;
  TURNSTILE_SECRET_KEY?: string;
  PUBLIC_REGISTRATION_ENABLED?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const inviteSeatLimitResponse = await handleDriverInviteSeatLimit(request.clone(), env);
    if (inviteSeatLimitResponse) return inviteSeatLimitResponse;

    const inviteAcceptanceResponse = await handleDriverInviteAcceptance(request, env);
    if (inviteAcceptanceResponse) return inviteAcceptanceResponse;

    const planLimitResponse = await handlePlanLimitRequest(request.clone(), env);
    if (planLimitResponse) return planLimitResponse;

    const driverPayResponse = await handleDriverPayRequest(request.clone(), env);
    if (driverPayResponse) return driverPayResponse;

    const workspaceSettingsResponse = await handleWorkspaceSettingsRequest(request.clone(), env);
    if (workspaceSettingsResponse) return workspaceSettingsResponse;

    const operationsResponse = await handleOperationsRequest(request, env);
    if (operationsResponse) return operationsResponse;

    return authWorker.fetch(request, env);
  },
};
