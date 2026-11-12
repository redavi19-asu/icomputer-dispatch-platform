import { handleDeveloperRequest } from './developer-api';
import authWorker from "./index";
import { handleDriverInviteAcceptance } from "./invite-accept";
import { handleCourierRequest } from "./courier";
import { handleDriverInviteSeatLimit } from "./invite-seat-limit";
import { handleDriverPayRequest } from "./driver-pay";
import { handleOperationsRequest } from "./operations";
import { handlePlanLimitRequest } from "./plan-limits";
import { handleWorkspaceSettingsRequest } from "./workspace-settings";
import { handleCarrierBilling } from "./stripe-billing";

interface Env {
  DB: D1Database;
  ICA_DB: D1Database;
  ALLOWED_ORIGINS: string;
  ADMIN_EMAIL?: string;
  TURNSTILE_SECRET_KEY?: string;
  PUBLIC_REGISTRATION_ENABLED?: string;
  BILLING_APP_URL?: string;
  API_PAID_ACCESS_REQUIRED?:string;
  STRIPE_API_PRICE_ID?:string;
  API_MONTHLY_AMOUNT_CENTS?:string;
  API_MONTHLY_REQUEST_ALLOWANCE?:string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_BASIC_PRICE_ID?: string;
  STRIPE_BUSINESS_PRICE_ID?: string;
  STRIPE_PORTAL_CONFIGURATION_ID?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const developerResponse = await handleDeveloperRequest(request, env);
    if (developerResponse) return developerResponse;
    const billingResponse = await handleCarrierBilling(request, env);
    if (billingResponse) return billingResponse;
    if (new URL(request.url).pathname === "/api/auth/social/google/callback") {
      return authWorker.fetch(request, env);
    }

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

    const courierResponse = await handleCourierRequest(request.clone(), env);
    if (courierResponse) return courierResponse;

    const operationsResponse = await handleOperationsRequest(request, env);
    if (operationsResponse) return operationsResponse;

    return authWorker.fetch(request, env);
  },
};
