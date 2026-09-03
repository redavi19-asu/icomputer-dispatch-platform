export type DispatchOSSession = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  company: {
    id: string;
    name: string;
    slug: string;
  };
  subscription: {
    plan: string;
    status: string;
  } | null;
};

const TOKEN_KEY = "dispatchos_token";
const SESSION_KEY = "dispatchos_session";

export function getApiBase() {
  return (process.env.NEXT_PUBLIC_DISPATCHOS_API_URL || "").replace(/\/$/, "");
}

export function saveSession(session: DispatchOSSession, rememberDevice?: boolean) {
  if (typeof window === "undefined") return;

  // When callers refresh an existing session without specifying a preference,
  // preserve the storage type that session already uses. A brand-new session
  // defaults to remembered-device behavior for backward compatibility.
  const shouldRemember =
    typeof rememberDevice === "boolean"
      ? rememberDevice
      : sessionStorage.getItem(TOKEN_KEY)
        ? false
        : true;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(SESSION_KEY);

  const store = shouldRemember ? localStorage : sessionStorage;
  store.setItem(TOKEN_KEY, session.token);
  store.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getStoredSession(): DispatchOSSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DispatchOSSession;
  } catch {
    return null;
  }
}

export function getStoredToken() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || "";
}

function clearTenantOperationalCache(companySlug?: string | null) {
  if (typeof window === "undefined" || !companySlug) return;

  const slug = companySlug.trim();
  if (!slug) return;

  const exactKeys = new Set([
    `dispatch_jobs::${slug}`,
    `dispatch.workspace.settings.${slug}`,
    `dispatch.workspace.drivers.${slug}`,
    `dispatch.sync.driver-alias.${slug}`,
    `dispatch.sync.job-alias.${slug}`,
  ]);
  const proofPrefix = `dispatch.proof-of-delivery.${slug}.`;

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (!key) continue;
    if (exactKeys.has(key) || key.startsWith(proofPrefix)) {
      localStorage.removeItem(key);
    }
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;

  const currentSession = getStoredSession();
  clearTenantOperationalCache(currentSession?.company?.slug);

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(SESSION_KEY);

  delete document.documentElement.dataset.dispatchCompanyId;
  delete document.documentElement.dataset.dispatchCompanySlug;
  delete document.documentElement.dataset.dispatchUserRole;
}

export async function logoutSession() {
  try {
    if (getStoredToken() && getApiBase()) {
      await authRequest("/auth/logout", { method: "POST" });
    }
  } catch {
    // Local sign-out still completes if the API is temporarily unavailable.
  } finally {
    clearSession();
  }
}

export async function authRequest(path: string, init: RequestInit = {}) {
  const apiBase = getApiBase();
  if (!apiBase) {
    throw new Error("DispatchOS account service is not connected yet.");
  }

  const token = getStoredToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "Request failed.");
  }
  return data;
}
