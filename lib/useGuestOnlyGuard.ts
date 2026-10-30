"use client";

import { useEffect, useState } from "react";
import { getApiCache } from "@/lib/apiCache";
import { grantMarketplaceAccess, revokeMarketplaceAccess } from "@/lib/marketplaceAccess";

interface GuestGuardOptions {
  /**
   * Set true on `/verify` so users who have a token or `pending_email`
   * but have NOT verified `email_verified_at` yet can complete OTP verification,
   * while already-verified logged-in users are still blocked and redirected to `/dashboard`.
   */
  allowUnverified?: boolean;
}

/**
 * Blocks guest-only auth pages (`/login`, `/register`, `/verify`) whenever
 * the browser already holds an active, verified Shopply session.
 *
 * Returns `checking = true` until guest status is confirmed so auth forms
 * never flash or trigger browser password autofill while signed in.
 */
export function useGuestOnlyGuard(options: GuestGuardOptions = {}) {
  const { allowUnverified = false } = options;
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Strip helper query flag (`?logged_out=1`) cleanly from address bar
    if (typeof window !== "undefined" && window.location.search.includes("logged_out=1")) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("logged_out");
      const nextUrl = cleanUrl.pathname + (cleanUrl.search ? cleanUrl.search : "") + cleanUrl.hash;
      window.history.replaceState({}, "", nextUrl);
    }

    const redirectAuthenticatedUser = (token: string) => {
      grantMarketplaceAccess(token);
      localStorage.removeItem("shopply_on_landing");
      sessionStorage.removeItem("shopply_on_landing");
      localStorage.setItem("shopply_dashboard_access", "true");
      sessionStorage.setItem("shopply_dashboard_access", "true");
      localStorage.removeItem("shopply_landing_lock");
      window.location.replace("/dashboard?notice=already_authenticated");
    };

    const verifyGuestStatus = async () => {
      const token = localStorage.getItem("token");
      const pendingEmail = localStorage.getItem("pending_email");

      if (!token) {
        if (!cancelled) setChecking(false);
        return;
      }

      // Keep form hidden while verifying existing token
      if (!cancelled) setChecking(true);

      try {
        const res = await fetch("/api/me", {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        if (cancelled) return;

        if (res.status === 401 || res.status === 403) {
          // Expired or suspended token — purge stale credentials and allow guest form
          revokeMarketplaceAccess();
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("shopply_user");
          localStorage.removeItem("shopply_dashboard_access");
          sessionStorage.removeItem("shopply_dashboard_access");
          getApiCache().invalidateAll();
          if (!cancelled) setChecking(false);
          return;
        }

        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          if (data?.user?.id) {
            localStorage.setItem("user", JSON.stringify(data.user));
            if (data.user.email_verified_at) {
              // User is already logged in & verified -> block auth page immediately
              redirectAuthenticatedUser(token);
              return;
            }
            // Account exists but still awaiting email OTP verification
            if (allowUnverified) {
              setChecking(false);
              return;
            }
            window.location.replace("/verify");
            return;
          }
        }

        // Fallback on unexpected response: check cached user state
        const rawUser = localStorage.getItem("user") || localStorage.getItem("shopply_user");
        if (rawUser) {
          try {
            const parsed = JSON.parse(rawUser);
            if (parsed?.id && parsed?.email_verified_at) {
              redirectAuthenticatedUser(token);
              return;
            }
          } catch {}
        }

        if (allowUnverified && pendingEmail) {
          setChecking(false);
          return;
        }
        setChecking(false);
      } catch {
        if (cancelled) return;
        // Offline / network fallback: never expose login form if a verified user session is stored
        const rawUser = localStorage.getItem("user") || localStorage.getItem("shopply_user");
        if (rawUser) {
          try {
            const parsed = JSON.parse(rawUser);
            if (parsed?.id && parsed?.email_verified_at) {
              redirectAuthenticatedUser(token);
              return;
            }
          } catch {}
        }
        setChecking(false);
      }
    };

    verifyGuestStatus();

    const handlePageShow = () => {
      verifyGuestStatus();
    };
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "token" || e.key === "user") {
        verifyGuestStatus();
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        verifyGuestStatus();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [allowUnverified]);

  return { checking };
}
