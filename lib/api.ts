const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
import { getApiCache } from "./apiCache";

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  phone: string | null;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T = unknown> {
  success?: boolean;
  message?: string;
  token?: string;
  user?: T;
  requires_verify?: boolean;
  otp?: string;
  pending_email?: string;
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
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("pending_email");
    getApiCache().invalidateAll();
  }
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

  // Handle requires_verify on BOTH error (403 login) and success (201 register)
  if (data.requires_verify) {
    if (typeof window !== "undefined") {
      if (data.token) localStorage.setItem("token", data.token);
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
      if (data.pending_email) localStorage.setItem("pending_email", data.pending_email);
      // Always reset the OTP timer to fresh 5 minutes when a new OTP is sent
      localStorage.setItem("otp_expires_at", (Date.now() + 300 * 1000).toString());
      // Save otp_hint so verify page can show the code directly on-screen
      if (data.otp_hint) localStorage.setItem("otp_hint", data.otp_hint);
      else localStorage.removeItem("otp_hint");
    }
    throw new Error("requires_verify");
  }

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
  username: string;
  phone: string;
  password: string;
}) {
  return request<AuthUser>("/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiLogin(payload: {
  username: string;
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

export async function apiGoogleAuth(payload: {
  code?: string | null;
  simulated_email?: string | null;
  simulated_name?: string | null;
  simulated_avatar?: string | null;
}) {
  return request<AuthUser>("/auth/google/callback", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}