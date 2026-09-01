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

export function saveSession(session: DispatchOSSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getStoredSession(): DispatchOSSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DispatchOSSession;
  } catch {
    return null;
  }
}

export function getStoredToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
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
