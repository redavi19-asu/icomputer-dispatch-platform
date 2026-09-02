import authWorker from "./index";
import { handleDriverInviteAcceptance } from "./invite-accept";
import { handleOperationsRequest } from "./operations";
import { handlePlanLimitRequest } from "./plan-limits";

interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  ADMIN_EMAIL?: string;
  TURNSTILE_SECRET_KEY?: string;
  PUBLIC_REGISTRATION_ENABLED?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const inviteAcceptanceResponse = await handleDriverInviteAcceptance(request, env);
    if (inviteAcceptanceResponse) return inviteAcceptanceResponse;

    const planLimitResponse = await handlePlanLimitRequest(request, env);
    if (planLimitResponse) return planLimitResponse;

    const operationsResponse = await handleOperationsRequest(request, env);
    if (operationsResponse) return operationsResponse;

    return authWorker.fetch(request, env);
  },
};
