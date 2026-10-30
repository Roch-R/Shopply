"use client";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/Skeleton";
import { getApiCache } from "@/lib/apiCache";
import { grantMarketplaceAccess, revokeMarketplaceAccess } from "@/lib/marketplaceAccess";
import { useGuestOnlyGuard } from "@/lib/useGuestOnlyGuard";
import { ShopplyWordmark } from "@/components/PublicChrome";

export default function VerifyPage() {
  const { checking } = useGuestOnlyGuard({ allowUnverified: true });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300);

  const API = "/api";
  const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  useEffect(() => {
    if (checking) return;

    const token = localStorage.getItem("token");
    const raw = localStorage.getItem("user");
    const storedPendingEmail = localStorage.getItem("pending_email");

    if (!token && !storedPendingEmail) {
      setRedirecting(true);
      window.location.replace("/login?logged_out=1");
      return;
    }

    let isVerified = false;
    let userEmail = "";

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.email_verified_at) {
          isVerified = true;
        }
        userEmail = parsed?.email || "";
      } catch (e) {
        console.error("[verify] Parse error:", e);
      }
    }

    if (isVerified) {
      setRedirecting(true);
      if (token) grantMarketplaceAccess(token);
      window.location.replace("/dashboard?notice=already_authenticated");
      return;
    }

    const expiresAt = localStorage.getItem("otp_expires_at");
    if (expiresAt) {
      const remaining = Math.round((parseInt(expiresAt, 10) - Date.now()) / 1000);
      if (remaining > 0) {
        setTimeLeft(remaining);
      } else {
        setTimeLeft(0);
        setError("Your verification code has expired. Please request a new one.");
      }
    } else {
      const fallbackExpires = Date.now() + 300 * 1000;
      localStorage.setItem("otp_expires_at", fallbackExpires.toString());
      setTimeLeft(300);
    }

    const targetEmail = storedPendingEmail || userEmail;
    if (targetEmail) {
      setPendingEmail(targetEmail);
      setSuccess("Verification code sent. Enter the 6-digit code from your inbox below.");
    }
  }, [checking]);

  useEffect(() => {
    if (checking || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError("Your verification code has expired. Please request a new one.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [checking, timeLeft]);

  const forceLogin = () => {
    revokeMarketplaceAccess();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("shopply_user");
    localStorage.removeItem("pending_email");
    localStorage.removeItem("otp_expires_at");
    getApiCache().invalidateAll();
    fetch("/api/logout", { method: "POST", keepalive: true }).catch(() => {});
    window.location.replace("/login?logged_out=1");
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const token = getToken();
      const storedPendingEmail = typeof window !== "undefined" ? localStorage.getItem("pending_email") : null;

      if (!token && !storedPendingEmail) {
        forceLogin();
        return;
      }

      let res;
      if (storedPendingEmail) {
        res = await fetch(`${API}/verify-registration`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email: storedPendingEmail, otp }),
        });
      } else {
        res = await fetch(`${API}/verify-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ otp }),
        });
      }

      const data = await res.json();

      if (res.status === 401) {
        setError("Session expired — please sign in again.");
        setTimeout(forceLogin, 2000);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.message || "Failed to complete account verification.");
        setLoading(false);
        return;
      }

      getApiCache().invalidateAll();
      const finalToken = data.token || token;
      if (finalToken) {
        localStorage.setItem("token", finalToken);
        grantMarketplaceAccess(finalToken);
      }
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.removeItem("pending_email");
      localStorage.removeItem("otp_expires_at");
      localStorage.removeItem("shopply_on_landing");
      sessionStorage.removeItem("shopply_on_landing");
      localStorage.setItem("shopply_dashboard_access", "true");
      sessionStorage.setItem("shopply_dashboard_access", "true");
      localStorage.removeItem("shopply_landing_lock");

      setSuccess("Email verified. Opening your account...");
      setRedirecting(true);
      window.location.replace("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      setError(message || "Invalid verification code. Please check and try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) {
      setError("No email address available to resend to.");
      return;
    }
    setResending(true);
    setError("");
    setSuccess("");

    try {
      const token = getToken();
      const storedPendingEmail = typeof window !== "undefined" ? localStorage.getItem("pending_email") : null;

      let res;
      if (storedPendingEmail) {
        res = await fetch(`${API}/resend-registration-otp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email: storedPendingEmail }),
        });
      } else if (token) {
        res = await fetch(`${API}/resend-otp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }

      let data: { message?: string } = {};
      if (res) {
        data = await res.json();
      }

      if (res && !res.ok) {
        setError(data?.message || "Failed to resend verification code.");
        setResending(false);
        return;
      }

      const expiresAt = Date.now() + 300 * 1000;
      localStorage.setItem("otp_expires_at", expiresAt.toString());
      setTimeLeft(300);
      setSuccess(data?.message || "A new verification code has been sent to your email.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "";
      setError(message || "Resend failed.");
    }
    setResending(false);
  };

  if (checking || redirecting) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#F7F7F5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <Skeleton style={{ width: "100%", maxWidth: 440, height: 380, borderRadius: 16 }} />
      </div>
    );
  }

  return (
    <>
      <style suppressHydrationWarning>{`
        .verify-root {
          min-height: 100vh;
          background: #F7F7F5;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 24px;
          color: #111827;
        }
        .verify-brand {
          margin-bottom: 24px;
        }
        .verify-card {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 40px 36px;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 12px 32px rgba(17, 24, 39, 0.05);
          text-align: center;
        }
        .verify-icon {
          width: 52px;
          height: 52px;
          background: #F3F4F6;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #111827;
          margin: 0 auto 20px;
        }
        .verify-card h1 {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.025em;
          margin-bottom: 8px;
        }
        .verify-sub {
          font-size: 14px;
          color: #4B5563;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .verify-timer {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          margin-bottom: 20px;
        }
        .verify-otp {
          width: 100%;
          text-align: center;
          font-size: 30px;
          font-weight: 700;
          letter-spacing: 14px;
          padding: 14px 8px;
          border: 1.5px solid #D1D5DB;
          border-radius: 10px;
          outline: none;
          font-family: 'Inter', monospace;
          font-variant-numeric: tabular-nums;
          color: #111827;
          background: #F9FAFB;
          margin-bottom: 18px;
          transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
        }
        .verify-otp:focus {
          border-color: #111827;
          background: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
        }
        .verify-btn {
          width: 100%;
          height: 44px;
          background: #111827;
          border: 1px solid #111827;
          border-radius: 8px;
          color: #FFFFFF;
          font-size: 14.5px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease;
        }
        .verify-btn:hover:not(:disabled) {
          background: #1F2937;
        }
        .verify-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .verify-err {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          color: #B91C1C;
          margin-bottom: 16px;
          text-align: left;
        }
        .verify-ok {
          background: #ECFDF5;
          border: 1px solid #A7F3D0;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          color: #065F46;
          margin-bottom: 16px;
          text-align: left;
        }
        .verify-footer {
          margin-top: 20px;
          padding-top: 18px;
          border-top: 1px solid #E5E7EB;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
        }
        .verify-link-btn {
          background: none;
          border: none;
          color: #111827;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .verify-link-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .verify-muted-btn {
          background: none;
          border: none;
          color: #6B7280;
          font-size: 13px;
          cursor: pointer;
          font-family: inherit;
        }
        .verify-muted-btn:hover {
          color: #111827;
        }
      `}</style>

      <div className="verify-root">
        <div className="verify-brand">
          <ShopplyWordmark href="/" />
        </div>

        <div className="verify-card">
          <div className="verify-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>

          <h1>Verify your email</h1>
          <p className="verify-sub">
            Enter the 6-digit security code sent to{" "}
            <strong style={{ color: "#111827" }}>{pendingEmail || "your email"}</strong>.
          </p>

          <div
            className="verify-timer"
            style={{
              background: timeLeft > 60 ? "#ECFDF5" : "#FEF2F2",
              border: timeLeft > 60 ? "1px solid #A7F3D0" : "1px solid #FECACA",
              color: timeLeft > 60 ? "#065F46" : "#B91C1C",
            }}
          >
            {timeLeft > 0
              ? `Code expires in ${Math.floor(timeLeft / 60)
                  .toString()
                  .padStart(2, "0")}:${(timeLeft % 60).toString().padStart(2, "0")}`
              : "Verification code expired"}
          </div>

          {error && <div className="verify-err">{error}</div>}
          {success && <div className="verify-ok">{success}</div>}

          <label
            htmlFor="otp-code"
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              color: "#4B5563",
              marginBottom: "8px",
              textAlign: "left",
            }}
          >
            6-digit verification code
          </label>
          <input
            id="otp-code"
            className="verify-otp"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={otp}
            autoFocus
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, ""));
              setError("");
              setSuccess("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && timeLeft > 0) handleVerify();
            }}
            disabled={timeLeft === 0}
            style={{ opacity: timeLeft === 0 ? 0.6 : 1 }}
          />

          <button className="verify-btn" onClick={handleVerify} disabled={loading || timeLeft === 0}>
            {loading ? "Verifying..." : "Verify email"}
          </button>

          <div className="verify-footer">
            <button type="button" className="verify-muted-btn" onClick={forceLogin}>
              Use different account
            </button>
            <button type="button" className="verify-link-btn" onClick={handleResend} disabled={resending}>
              {resending ? "Sending..." : "Resend code"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
