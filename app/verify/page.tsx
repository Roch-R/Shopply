"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/Skeleton";
import { getApiCache } from "@/lib/apiCache";

export default function VerifyPage() {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300);

  const API = "/api";
  const getToken = () => typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    const token = localStorage.getItem("token");
    const raw = localStorage.getItem("user");
    const storedPendingEmail = localStorage.getItem("pending_email");

    // Initialize expiration timer from localStorage
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

    console.log("[verify] Initial check. Token:", !!token, "Pending Email:", !!storedPendingEmail);

    if (!token && !storedPendingEmail) {
      console.log("[verify] Missing credentials, redirecting to login");
      window.location.href = "/login";
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
      console.log("[verify] Email already verified, redirecting to dashboard");
      setRedirecting(true);
      window.location.href = "/dashboard";
      return;
    }

    const targetEmail = storedPendingEmail || userEmail;
    if (targetEmail) {
      setPendingEmail(targetEmail);
      setSuccess("Verification code sent! Please check your email inbox and enter the 6-digit OTP code below.");
    }
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setError("Your verification code has expired. Please request a new one.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const forceLogin = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("pending_email");
    localStorage.removeItem("otp_expires_at");
    getApiCache().invalidateAll();
    window.location.href = "/login";
  };

  const handleVerify = async () => {
    if (otp.length !== 6) { setError("Please enter the 6-digit OTP."); return; }
    
    setLoading(true); setError(""); setSuccess("");
    try {
      const token = getToken();
      const storedPendingEmail = typeof window !== "undefined" ? localStorage.getItem("pending_email") : null;
      
      if (!token && !storedPendingEmail) { forceLogin(); return; }

      let res;
      if (storedPendingEmail) {
        res = await fetch(`${API}/verify-registration`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email: storedPendingEmail, otp: otp }),
        });
      } else {
        res = await fetch(`${API}/verify-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ otp: otp }),
        });
      }

      const data = await res.json();
      console.log("[verify] Backend validation response:", res.status, data);

      if (res.status === 401) {
        setError("Session expired — please log in again.");
        setTimeout(forceLogin, 2000);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.message || "Failed to complete account activation.");
        setLoading(false);
        return;
      }

      if (data.token) localStorage.setItem("token", data.token);
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.removeItem("pending_email");
      localStorage.removeItem("otp_expires_at");

      setSuccess("✓ Email verified successfully! Redirecting...");
      setRedirecting(true);
      window.location.href = "/dashboard";

    } catch (err: any) {
      console.error("[verify] Verification error:", err);
      setError(err?.message || "Invalid verification code. Please check and try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) { setError("No email to resend to."); return; }
    setResending(true); setError(""); setSuccess("");
    
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

      const expiresAt = Date.now() + 300 * 1000;
      localStorage.setItem("otp_expires_at", expiresAt.toString());
      setTimeLeft(300);
      setSuccess("✓ A new verification code has been sent to your email!");
    } catch (e: any) {
      setError(e?.message || "Resend failed.");
    }
    setResending(false);
  };

  if (redirecting) return (
    <div style={{ minHeight: "100vh", background: "#f5f7ff", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <Skeleton style={{ width: "100%", maxWidth: 440, height: 400, borderRadius: 24 }} />
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .root{min-height:100vh;background:linear-gradient(135deg,#f0f4ff,#faf5ff,#f0f9ff);
          display:flex;align-items:center;justify-content:center;font-family:'Inter',sans-serif;padding:24px}
        .card{background:#fff;border-radius:24px;padding:48px 40px;width:100%;max-width:440px;
          box-shadow:0 20px 60px rgba(0,0,0,.08);text-align:center;animation:fadeUp .5s ease}
        .icon-wrap{width:72px;height:72px;background:linear-gradient(135deg,#e0f2fe,#bae6fd);
          border-radius:50%;display:flex;align-items:center;justify-content:center;
          color:#0284c7;margin:0 auto 24px}
        h1{font-size:26px;font-weight:700;color:#0f172a;letter-spacing:-.4px;margin-bottom:8px}
        .sub{font-size:14px;color:#94a3b8;line-height:1.6;margin-bottom:28px}
        .otp-input{width:100%;text-align:center;font-size:36px;font-weight:800;
          letter-spacing:18px;padding:18px 8px;border:3px solid #7c3aed;border-radius:14px;
          outline:none;font-family:'Inter',sans-serif;color:#0f172a;transition:all .2s;
          background:#faf5ff;margin-bottom:20px;animation:pulseBorder 2s infinite;cursor:text}
        .otp-input:focus{border-color:#2563eb;background:#eff6ff;box-shadow:0 0 0 4px rgba(37,99,235,.15);animation:none}
        @keyframes pulseBorder{0%,100%{border-color:#7c3aed;box-shadow:0 0 0 0 rgba(124,58,237,.3)}50%{border-color:#2563eb;box-shadow:0 0 0 6px rgba(124,58,237,0)}}
        .btn{width:100%;padding:14px;background:linear-gradient(135deg,#7c3aed,#2563eb);
          border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:600;
          font-family:'Inter',sans-serif;cursor:pointer;transition:all .2s;
          box-shadow:0 4px 14px rgba(124,58,237,.3);
          position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;height:48px;}
        .btn:hover:not(:disabled){transform:translateY(-1px)}
        .btn:disabled{opacity:.7;cursor:not-allowed}
        .resend-btn{background:none;border:none;color:#7c3aed;font-size:13px;font-weight:600;
          cursor:pointer;font-family:'Inter',sans-serif;margin-top:16px;padding:4px 8px;border-radius:6px}
        .resend-btn:disabled{opacity:.5;cursor:not-allowed}
        .err{background:#fef2f2;border:1.5px solid #fecaca;border-radius:10px;
          padding:12px 14px;font-size:13px;color:#ef4444;margin-bottom:16px;text-align:left;font-weight:500}
        .ok{background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;
          padding:12px 14px;font-size:13px;color:#16a34a;margin-bottom:16px;text-align:left;font-weight:500}
        .divider{display:flex;align-items:center;gap:12px;margin:20px 0}
        .div-line{flex:1;height:1px;background:#f1f5f9}
        .divider span{font-size:12px;color:#cbd5e1}
        @keyframes sp{to{transform:rotate(360deg)}}
        .spin{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.4);
          border-top-color:#fff;border-radius:50%;animation:sp .6s linear infinite;
          vertical-align:middle;margin-right:8px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
      `}</style>
      <div className="root">
        <div className="card">
           <div className="icon-wrap">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <polyline points="22,4 12,13 2,4" />
            </svg>
          </div>
          <h1>Verify your email</h1>
          <p className="sub">
            We sent a 6-digit verification code to your email ({pendingEmail || "loading..."}).<br/>
            Please check your inbox (and spam folder) and enter the code below.
          </p>

          <div style={{ margin: "0 auto 24px", display: "inline-flex", alignItems: "center", gap: "8px", background: timeLeft > 60 ? "#f0fdf4" : "#fef2f2", border: timeLeft > 60 ? "1px solid #bbf7d0" : "1px solid #fecaca", borderRadius: "100px", padding: "6px 16px", color: timeLeft > 60 ? "#16a34a" : "#ef4444", fontSize: "13px", fontWeight: 600 }}>
            <span>⏳</span>
            <span>
              {timeLeft > 0 ? (
                `Expires in ${Math.floor(timeLeft / 60).toString().padStart(2, "0")}:${(timeLeft % 60).toString().padStart(2, "0")}`
              ) : (
                "Code Expired"
              )}
            </span>
          </div>

          {error && <div className="err">⚠ {error}</div>}
          {success && <div className="ok">{success}</div>}

          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
            👆 Click below and type the 6-digit verification code
          </label>
          <input
            className="otp-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="------"
            value={otp}
            autoFocus
            onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); setSuccess(""); }}
            onKeyDown={e => { if (e.key === "Enter" && timeLeft > 0) handleVerify(); }}
            disabled={timeLeft === 0}
            style={{ opacity: timeLeft === 0 ? 0.6 : 1 }}
          />

          <button className="btn" onClick={handleVerify} disabled={loading || timeLeft === 0}>
            {loading ? (
              <div className="animate-pulse bg-white/40 rounded" style={{ height: 16, width: 100 }}></div>
            ) : "Verify Email →"}
          </button>

          <div className="divider">
            <div className="div-line"/>
            <span>Didn&apos;t receive it?</span>
            <div className="div-line"/>
          </div>

          <button className="resend-btn" onClick={handleResend} disabled={resending}>
            {resending ? "Sending…" : "Resend OTP"}
          </button>
        </div>
      </div>
    </>
  );
}