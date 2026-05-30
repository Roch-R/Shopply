"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/Skeleton";
import { getApiCache } from "@/lib/apiCache";
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";

export default function VerifyPage() {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
  const getToken = () => typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const hasSent = useRef(false);

  const formatE164 = (num: string) => {
    let clean = num.replace(/\D/g, "");
    if (clean.startsWith("09") && clean.length === 11) {
      return "+63" + clean.slice(1);
    }
    if (clean.startsWith("9") && clean.length === 10) {
      return "+63" + clean;
    }
    if (clean.startsWith("639") && clean.length === 12) {
      return "+" + clean;
    }
    return "+" + clean;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const raw = localStorage.getItem("user");
    const pendingEmail = localStorage.getItem("pending_email");

    console.log("[verify] Initial check. Token:", !!token, "Pending Email:", !!pendingEmail);

    if (!token && !pendingEmail) {
      console.log("[verify] Missing credentials, redirecting to login");
      window.location.href = "/login";
      return;
    }
    
    let targetPhone = "";
    if (token && raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.email_verified_at) {
          console.log("[verify] Email already verified, redirecting to dashboard");
          setRedirecting(true);
          window.location.href = "/dashboard";
          return;
        }
        targetPhone = parsed.phone || "";
      } catch (e) {
        console.error("[verify] Parse error:", e);
        window.location.href = "/login";
        return;
      }
    } else if (pendingEmail) {
      targetPhone = pendingEmail;
    }

    if (targetPhone) {
      setPendingPhone(targetPhone);
      // Wait for DOM layout
      const timer = setTimeout(() => {
        initAndSend(targetPhone);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const initAndSend = async (phoneNumber: string) => {
    if (hasSent.current) return;
    hasSent.current = true;

    if (typeof window !== "undefined") {
      try {
        const container = document.getElementById("recaptcha-container");
        if (!container) {
          console.error("[verify] recaptcha-container not found in DOM");
          hasSent.current = false;
          return;
        }
        
        console.log("[verify] Initializing invisible RecaptchaVerifier...");
        const gWindow = window as any;
        if (!gWindow.recaptchaVerifier) {
          gWindow.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
            callback: () => {
              console.log("[verify] Recaptcha solved");
            }
          });
        }

        const formatted = formatE164(phoneNumber);
        console.log("[verify] Triggering Firebase signInWithPhoneNumber for:", formatted);
        
        const confirmation = await signInWithPhoneNumber(auth, formatted, gWindow.recaptchaVerifier);
        setConfirmationResult(confirmation);
        setSuccess("SMS verification code sent successfully via Google Firebase!");
        setError("");
      } catch (err: any) {
        console.error("[verify] Firebase send SMS error:", err);
        setError("Failed to send verification SMS: " + (err?.message || "Internal error"));
        hasSent.current = false;
      }
    }
  };

  const forceLogin = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("pending_email");
    getApiCache().invalidateAll();
    window.location.href = "/login";
  };

  const handleVerify = async () => {
    if (otp.length !== 6) { setError("Please enter the 6-digit OTP."); return; }
    if (!confirmationResult) { setError("Verification code was not sent yet or expired. Please click Resend."); return; }
    
    const token = getToken();
    const pendingEmail = typeof window !== "undefined" ? localStorage.getItem("pending_email") : null;
    
    if (!token && !pendingEmail) { forceLogin(); return; }

    setLoading(true); setError(""); setSuccess("");
    try {
      console.log("[verify] Verifying OTP code with Firebase...");
      const result = await confirmationResult.confirm(otp);
      const idToken = await result.user.getIdToken();
      console.log("[verify] Firebase OTP matches! ID Token retrieved.");

      let res;
      if (pendingEmail) {
        res = await fetch(`${API}/verify-registration`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email: pendingEmail, firebase_token: idToken }),
        });
      } else {
        res = await fetch(`${API}/verify-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ firebase_token: idToken }),
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
        setError(data.message || "Failed to complete account activation with backend.");
        setLoading(false);
        return;
      }

      if (data.token) localStorage.setItem("token", data.token);
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.removeItem("pending_email");

      setSuccess("✓ Phone verified successfully! Redirecting...");
      setRedirecting(true);
      window.location.href = "/dashboard";

    } catch (err: any) {
      console.error("[verify] Firebase verification error:", err);
      setError(err?.message || "Invalid verification code. Please check and try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingPhone) { setError("No phone number to resend to."); return; }
    setResending(true); setError(""); setSuccess("");
    
    hasSent.current = false;
    
    try {
      await initAndSend(pendingPhone);
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
        .icon-wrap{width:72px;height:72px;background:linear-gradient(135deg,#ede9fe,#ddd6fe);
          border-radius:50%;display:flex;align-items:center;justify-content:center;
          font-size:32px;margin:0 auto 24px}
        h1{font-size:26px;font-weight:700;color:#0f172a;letter-spacing:-.4px;margin-bottom:8px}
        .sub{font-size:14px;color:#94a3b8;line-height:1.6;margin-bottom:28px}
        .otp-input{width:100%;text-align:center;font-size:32px;font-weight:700;
          letter-spacing:16px;padding:16px 8px;border:2px solid #e2e8f0;border-radius:14px;
          outline:none;font-family:'Inter',sans-serif;color:#0f172a;transition:all .2s;
          background:#f8fafc;margin-bottom:20px}
        .otp-input:focus{border-color:#7c3aed;background:#faf5ff;box-shadow:0 0 0 3px rgba(124,58,237,.08)}
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
          <div className="icon-wrap">💬</div>
          <h1>Verify your phone</h1>
          <p className="sub">
            We sent a 6-digit SMS OTP to your phone number ({pendingPhone || "loading..."}).<br/>
            Enter it below to activate your account.
          </p>

          {error && <div className="err">⚠ {error}</div>}
          {success && <div className="ok">{success}</div>}

          <input
            className="otp-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); setSuccess(""); }}
            onKeyDown={e => { if (e.key === "Enter") handleVerify(); }}
          />

          <button className="btn" onClick={handleVerify} disabled={loading || !confirmationResult}>
            {loading ? (
              <div className="animate-pulse bg-white/40 rounded" style={{ height: 16, width: 100 }}></div>
            ) : "Verify Phone →"}
          </button>

          <div className="divider">
            <div className="div-line"/>
            <span>Didn&apos;t receive it?</span>
            <div className="div-line"/>
          </div>

          <button className="resend-btn" onClick={handleResend} disabled={resending}>
            {resending ? "Sending…" : "Resend OTP"}
          </button>

          {/* Invisible Recaptcha Mount Point */}
          <div id="recaptcha-container"></div>
        </div>
      </div>
    </>
  );
}