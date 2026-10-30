"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiGoogleAuth } from "@/lib/api";
import { getApiCache } from "@/lib/apiCache";
import { grantMarketplaceAccess } from "@/lib/marketplaceAccess";
import { ShopplyWordmark } from "@/components/PublicChrome";

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const oauthError = searchParams.get("error");
    const code = searchParams.get("code");
    const simulated_email = searchParams.get("simulated_email");
    const simulated_name = searchParams.get("simulated_name");
    const simulated_avatar = searchParams.get("simulated_avatar");

    if (oauthError) {
      setError(`Google authorization failed or was cancelled (${oauthError}).`);
      return;
    }

    if (!code && !simulated_email) {
      const existingToken = localStorage.getItem("token");
      const rawUser = localStorage.getItem("user") || localStorage.getItem("shopply_user");
      if (existingToken && rawUser) {
        try {
          const parsed = JSON.parse(rawUser);
          if (parsed?.id && parsed?.email_verified_at) {
            grantMarketplaceAccess(existingToken);
            window.location.replace("/dashboard?notice=already_authenticated");
            return;
          }
        } catch {}
      }
      setError("No authorization code or account provided.");
      return;
    }

    async function authenticate() {
      try {
        const redirect_uri = window.location.origin + "/auth/google/callback";
        const data = await apiGoogleAuth({
          code,
          redirect_uri,
          simulated_email,
          simulated_name,
          simulated_avatar,
        });

        getApiCache().invalidateAll();

        localStorage.setItem("token", data.token!);
        localStorage.setItem("user", JSON.stringify(data.user));
        if (data.token) grantMarketplaceAccess(data.token);
        localStorage.removeItem("shopply_on_landing");
        sessionStorage.removeItem("shopply_on_landing");
        localStorage.setItem("shopply_dashboard_access", "true");
        sessionStorage.setItem("shopply_dashboard_access", "true");
        localStorage.removeItem("shopply_landing_lock");
        window.location.replace("/dashboard");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Authentication failed.");
      }
    }

    authenticate();
  }, [searchParams, router]);

  return (
    <>
      <style suppressHydrationWarning>{`
        .cb-container {
          min-height: 100vh;
          background: #F7F7F5;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #111827;
        }
        .cb-card {
          background: #FFFFFF;
          width: 100%;
          max-width: 420px;
          padding: 40px 36px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          border: 1px solid #E5E7EB;
          box-shadow: 0 12px 32px rgba(17, 24, 39, 0.05);
          margin-top: 24px;
        }
        .cb-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid #E5E7EB;
          border-top-color: #111827;
          border-radius: 50%;
          animation: cbSpin 0.8s linear infinite;
          margin-bottom: 20px;
        }
        @keyframes cbSpin {
          to { transform: rotate(360deg); }
        }
        .cb-title {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }
        .cb-subtitle {
          font-size: 14px;
          color: #6B7280;
          line-height: 1.5;
        }
        .cb-err {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 8px;
          padding: 14px;
          color: #B91C1C;
          font-size: 13.5px;
          margin-bottom: 20px;
          width: 100%;
          text-align: left;
          line-height: 1.5;
        }
        .cb-btn {
          background: #111827;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          padding: 11px 22px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
        }
        .cb-btn:hover {
          background: #1F2937;
        }
      `}</style>
      <div className="cb-container">
        <ShopplyWordmark href="/" />
        <div className="cb-card">
          {!error ? (
            <>
              <div className="cb-spinner" />
              <h1 className="cb-title">Signing you in...</h1>
              <p className="cb-subtitle">Completing secure Google authentication with Shopply</p>
            </>
          ) : (
            <>
              <div className="cb-err">
                <strong>Authentication error</strong>
                <br />
                {error}
              </div>
              <Link href="/login" className="cb-btn">
                Return to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            background: "#F7F7F5",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              border: "3px solid #E5E7EB",
              borderTopColor: "#111827",
              borderRadius: "50%",
            }}
          />
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
