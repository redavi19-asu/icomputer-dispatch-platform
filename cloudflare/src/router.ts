import authWorker from "./index";
import { handleOperationsRequest } from "./operations";

interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  ADMIN_EMAIL?: string;
  TURNSTILE_SECRET_KEY?: string;
  PUBLIC_REGISTRATION_ENABLED?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const operationsResponse = await handleOperationsRequest(request, env);
    if (operationsResponse) return operationsResponse;
    return authWorker.fetch(request, env);
  },
};
