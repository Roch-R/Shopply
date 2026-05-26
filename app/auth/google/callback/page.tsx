"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiGoogleAuth } from "@/lib/api";
import { getApiCache } from "@/lib/apiCache";

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
      setError("No authorization code or account provided.");
      return;
    }

    async function authenticate() {
      try {
        const data = await apiGoogleAuth({
          code,
          simulated_email,
          simulated_name,
          simulated_avatar,
        });
        
        // Invalidate API cache to prevent stale user profile /me loading
        getApiCache().invalidateAll();
        
        localStorage.setItem("token", data.token!);
        localStorage.setItem("user", JSON.stringify(data.user));
        router.replace("/dashboard");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Authentication failed.");
      }
    }

    authenticate();
  }, [searchParams, router]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#202124;font-family:'Roboto',sans-serif}
        .container{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
        .card{background:#202124;width:100%;max-width:440px;padding:48px 40px;border-radius:28px;
          display:flex;flex-direction:column;align-items:center;text-align:center;
          border:1px solid #3c4043;box-shadow:0 24px 64px rgba(0,0,0,0.4)}
        .spinner{width:48px;height:48px;border:4px solid #3c4043;border-top-color:#4285F4;
          border-radius:50%;animation:spin 1s linear infinite;margin-bottom:24px}
        @keyframes spin{to{transform:rotate(360deg)}}
        .title{font-size:22px;font-weight:500;color:#e8eaed;margin-bottom:12px}
        .subtitle{font-size:15px;color:#9aa0a6;line-height:1.5}
        .err-box{background:#3c1618;border:1px solid #f28b82;border-radius:12px;padding:16px;
          color:#f28b82;font-size:14px;margin-bottom:24px;width:100%;text-align:left}
        .btn-return{background:#8ab4f8;color:#202124;border:none;border-radius:6px;padding:12px 24px;
          font-size:15px;font-weight:500;cursor:pointer;text-decoration:none;display:inline-block;transition:background 0.2s}
        .btn-return:hover{background:#aecbfa}
      `}</style>
      <div className="container">
        <div className="card">
          {!error ? (
            <>
              <div className="spinner" />
              <h1 className="title">Authenticating with Google...</h1>
              <p className="subtitle">Securely logging you into Shopply</p>
            </>
          ) : (
            <>
              <div className="err-box">
                <strong>Authentication Error:</strong><br />{error}
              </div>
              <Link href="/login" className="btn-return">
                Return to Login
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
    <Suspense fallback={
      <div style={{ background: '#202124', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          .spinner{width:48px;height:48px;border:4px solid #3c4043;border-top-color:#4285F4;
          border-radius:50%;animation:spin 1s linear infinite}
          @keyframes spin{to{transform:rotate(360deg)}}
        `}</style>
        <div className="spinner" />
      </div>
    }>
      <GoogleCallbackContent />
    </Suspense>
  );
}
