const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://192.168.160.98:8888/api";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T = unknown> {
  success?: boolean;
  message?: string;
  token?: string;
  user?: T;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (!raw || !token) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    const firstError =
      data?.message ||
      (data?.errors ? Object.values(data.errors).flat()[0] : null) ||
      "An error occurred.";
    throw new Error(firstError as string);
  }
  return data;
}

export async function apiRegister(payload: {
  name: string;
  email: string;
  password: string;
}) {
  return request<AuthUser>("/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiLogin(payload: {
  email: string;
  password: string;
}) {
  return request<AuthUser>("/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiMe() {
  return request<AuthUser>("/me");
}

export async function apiLogout(): Promise<void> {
  await request("/logout", { method: "POST" });
  clearAuth();
}