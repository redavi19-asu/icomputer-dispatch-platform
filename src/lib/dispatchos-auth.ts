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

export function saveSession(session: DispatchOSSession, rememberDevice = true) {
  if (typeof window === "undefined") return;

  // Keep only one browser copy of the session. Trusted devices use localStorage
  // so the login survives app/browser restarts; temporary sessions use
  // sessionStorage and disappear when that browser/app session ends.
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(SESSION_KEY);

  const store = rememberDevice ? localStorage : sessionStorage;
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

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(SESSION_KEY);
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
