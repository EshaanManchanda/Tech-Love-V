export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// The access cookie expires after 15 minutes. On a 401, renew it once with the
// 7-day refresh cookie and retry, so a page left open doesn't silently log out.
// Concurrent 401s share one refresh call. Login/register/refresh are excluded:
// a 401 there means wrong credentials, and a failing refresh must not loop.
const NO_RETRY = ["/api/auth/login", "/api/auth/register", "/api/auth/refresh", "/api/auth/logout"];
let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(`${API_URL}/api/auth/refresh`, { method: "POST", credentials: "include" })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function fetchWithRefresh(path: string, init: RequestInit): Promise<Response> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (res.status !== 401 || NO_RETRY.some((p) => path.startsWith(p))) return res;
  return (await refreshSession()) ? fetch(`${API_URL}${path}`, init) : res;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetchWithRefresh(path, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.error?.message ?? "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Separate from api() because a multipart body must NOT get a manual
// Content-Type — fetch has to set it itself (with the multipart boundary).
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetchWithRefresh(path, { method: "POST", credentials: "include", body: formData });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.error?.message ?? "Request failed");
  }
  return res.json();
}
