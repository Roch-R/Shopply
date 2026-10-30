"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { apiLogin } from "@/lib/api";
import { getApiCache } from "@/lib/apiCache";
import { grantMarketplaceAccess } from "@/lib/marketplaceAccess";
import { useGuestOnlyGuard } from "@/lib/useGuestOnlyGuard";
import LogoDrawPreloader from "@/components/LogoDrawPreloader";
import { ShopplyWordmark } from "@/components/PublicChrome";

const EyeOpen = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOff = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.81-2.4 3.66v3.04h3.88c2.27-2.09 3.565-5.17 3.565-8.84Z"/>
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.11 0-5.74-2.11-6.68-4.96H1.21v3.15C3.18 21.88 7.27 24 12 24Z"/>
    <path fill="#FBBC05" d="M5.32 14.25a7.16 7.16 0 0 1 0-4.5V6.6H1.21a12 12 0 0 0 0 10.8l4.11-3.15Z"/>
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.27 0 3.18 2.12 1.21 5.85l4.11 3.15c.94-2.85 3.57-4.25 6.68-4.25Z"/>
  </svg>
);

export default function LoginPage() {
  const { checking } = useGuestOnlyGuard();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const redirectIfAlreadySignedIn = (): boolean => {
    const existingToken = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user") || localStorage.getItem("shopply_user");
    if (existingToken && rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        if (parsed?.id && parsed?.email_verified_at) {
          grantMarketplaceAccess(existingToken);
          window.location.replace("/dashboard?notice=already_authenticated");
          return true;
        }
      } catch {}
    }
    return false;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleGoogleLogin = () => {
    if (redirectIfAlreadySignedIn()) return;
    const clientId = "10342567270-6b7rfni3mbil5anjo1fk1u9c9eo4mp6l.apps.googleusercontent.com" as string;
    if (!clientId || clientId === "your_google_client_id_here") {
      setShowGoogleModal(true);
      return;
    }
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid email profile&prompt=select_account`;
    window.location.href = authUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (redirectIfAlreadySignedIn()) return;
    if (!form.username || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await apiLogin(form);
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
      const msg = err instanceof Error ? err.message : "";
      if (msg === "requires_verify") {
        window.location.replace("/verify");
        return;
      }
      setError(msg || "Login failed. Check your credentials.");
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#F7F7F5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            color: "#4B5563",
            fontSize: "13.5px",
            fontWeight: 500,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              border: "2.5px solid #E5E7EB",
              borderTopColor: "#111827",
              borderRadius: "50%",
              animation: "shopplyAuthGateSpin 0.7s linear infinite",
            }}
          />
          <style suppressHydrationWarning>{`@keyframes shopplyAuthGateSpin { to { transform: rotate(360deg); } }`}</style>
          <span>Checking session security...</span>
        </div>
      </main>
    );
  }

  return (
    <>
      <LogoDrawPreloader />
      <style suppressHydrationWarning>{`
        .auth-page {
          min-height: 100vh;
          background: #F7F7F5;
          display: flex;
          flex-direction: column;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #111827;
        }
        .auth-topbar {
          max-width: 960px;
          width: 100%;
          margin: 0 auto;
          padding: 20px 24px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .auth-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13.5px;
          font-weight: 500;
          color: #4B5563;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .auth-back:hover {
          color: #111827;
        }
        .auth-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .auth-shell {
          width: 100%;
          max-width: 920px;
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          overflow: hidden;
          display: grid;
          grid-template-columns: 1fr 440px;
          box-shadow: 0 12px 32px rgba(17, 24, 39, 0.05);
        }
        .auth-aside {
          background: #111827;
          color: #FFFFFF;
          padding: 48px 44px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 36px;
        }
        .auth-aside-eyebrow {
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #34D399;
          margin-bottom: 12px;
        }
        .auth-aside h2 {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 30px;
          font-weight: 700;
          letter-spacing: -0.025em;
          line-height: 1.18;
          color: #FFFFFF;
          margin-bottom: 14px;
        }
        .auth-aside p {
          font-size: 14px;
          color: #D1D5DB;
          line-height: 1.65;
          max-width: 320px;
        }
        .auth-checklist {
          list-style: none;
          padding: 24px 0 0;
          margin: 24px 0 0;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .auth-checklist li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #E5E7EB;
        }
        .auth-check-dot {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.18);
          color: #34D399;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .auth-form-col {
          padding: 48px 42px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #FFFFFF;
        }
        .auth-head {
          margin-bottom: 28px;
        }
        .auth-head h1 {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.025em;
          margin-bottom: 6px;
        }
        .auth-head p {
          font-size: 14px;
          color: #6B7280;
          line-height: 1.5;
        }
        .auth-field {
          margin-bottom: 18px;
        }
        .auth-field label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
        }
        .auth-field input {
          width: 100%;
          height: 44px;
          background: #FFFFFF;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          padding: 0 14px;
          font-size: 14px;
          color: #111827;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .auth-field input::placeholder {
          color: #9CA3AF;
        }
        .auth-field input:focus {
          border-color: #111827;
          box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
        }
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
        .auth-err {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          color: #B91C1C;
          margin-bottom: 18px;
          line-height: 1.45;
        }
        .auth-btn-primary {
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
          gap: 8px;
          transition: background 0.15s ease;
          margin-top: 4px;
        }
        .auth-btn-primary:hover:not(:disabled) {
          background: #1F2937;
        }
        .auth-btn-primary:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .auth-btn-google {
          width: 100%;
          height: 44px;
          background: #FFFFFF;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          color: #111827;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .auth-btn-google:hover {
          background: #F9FAFB;
          border-color: #9CA3AF;
        }
        .auth-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
        }
        .auth-divider span {
          font-size: 12px;
          color: #9CA3AF;
          white-space: nowrap;
        }
        .auth-div-line {
          flex: 1;
          height: 1px;
          background: #E5E7EB;
        }
        .auth-foot {
          text-align: center;
          font-size: 13.5px;
          color: #6B7280;
          margin-top: 22px;
        }
        .auth-foot a {
          color: #111827;
          font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .auth-foot a:hover {
          color: #0D6847;
        }
        .auth-spin {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-top-color: #FFFFFF;
          border-radius: 50%;
          animation: authSpin 0.6s linear infinite;
        }
        @keyframes authSpin {
          to { transform: rotate(360deg); }
        }

        /* Google setup modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(17, 24, 39, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 24px;
        }
        .modal-card {
          background: #FFFFFF;
          width: 100%;
          max-width: 540px;
          border-radius: 16px;
          border: 1px solid #E5E7EB;
          padding: 32px;
          box-shadow: 0 24px 48px rgba(17, 24, 39, 0.18);
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-head {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }
        .modal-head h3 {
          font-size: 19px;
          font-weight: 700;
          color: #111827;
        }
        .modal-body {
          font-size: 14px;
          color: #4B5563;
          line-height: 1.6;
        }
        .modal-body p {
          margin-bottom: 14px;
        }
        .step-box {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 14px;
        }
        .step-title {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .step-num {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          background: #111827;
          color: #FFFFFF;
          font-size: 12px;
          font-weight: 700;
          display: grid;
          place-items: center;
        }
        .code-block {
          background: #111827;
          color: #F9FAFB;
          padding: 12px 14px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 12.5px;
          margin: 8px 0;
          position: relative;
          overflow-x: auto;
        }
        .copy-btn {
          position: absolute;
          right: 10px;
          top: 10px;
          background: rgba(255, 255, 255, 0.14);
          border: none;
          color: #FFFFFF;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        }
        .modal-foot {
          display: flex;
          justify-content: flex-end;
          margin-top: 20px;
        }
        .btn-close {
          background: #111827;
          color: #FFFFFF;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        @media (max-width: 780px) {
          .auth-shell {
            grid-template-columns: 1fr;
            max-width: 440px;
          }
          .auth-aside {
            padding: 28px 28px 24px;
          }
          .auth-checklist {
            display: none;
          }
          .auth-aside h2 {
            font-size: 22px;
            margin-bottom: 6px;
          }
          .auth-form-col {
            padding: 32px 28px;
          }
        }
      `}</style>

      <div className="auth-page">
        <div className="auth-topbar">
          <Link href="/" className="auth-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to storefront</span>
          </Link>
        </div>

        <div className="auth-main">
          <div className="auth-shell">
            <div className="auth-aside">
              <ShopplyWordmark href="/" inverted />
              <div>
                <p className="auth-aside-eyebrow">Shopply Account</p>
                <h2>Welcome back to your storefront &amp; orders.</h2>
                <p>
                  Sign in to browse the complete marketplace, message verified sellers, and manage your store inventory.
                </p>
                <ul className="auth-checklist">
                  <li>
                    <span className="auth-check-dot">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span>Real-time order &amp; delivery tracking</span>
                  </li>
                  <li>
                    <span className="auth-check-dot">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span>Direct buyer-seller messaging &amp; meetups</span>
                  </li>
                  <li>
                    <span className="auth-check-dot">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span>Cash on Delivery, GCash &amp; Maya checkout</span>
                  </li>
                </ul>
              </div>
              <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
                Protected with 256-bit SSL encryption
              </div>
            </div>

            <div className="auth-form-col">
              <div className="auth-head">
                <h1>Sign in</h1>
                <p>Enter your account details to continue</p>
              </div>

              {error && <div className="auth-err">{error}</div>}

              <form onSubmit={handleSubmit} method="POST">
                <div className="auth-field">
                  <label htmlFor="login-username">Username</label>
                  <input
                    id="login-username"
                    type="text"
                    name="username"
                    placeholder="Enter your username"
                    value={form.username}
                    onChange={handleChange}
                    required
                    autoComplete="username"
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="login-password">Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="login-password"
                      type={showPass ? "text" : "password"}
                      name="password"
                      placeholder="Enter your password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      autoComplete="current-password"
                      style={{ paddingRight: "42px" }}
                    />
                    <button
                      type="button"
                      aria-label={showPass ? "Hide password" : "Show password"}
                      onClick={() => setShowPass(!showPass)}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#6B7280",
                        padding: "6px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {showPass ? <EyeOpen /> : <EyeOff />}
                    </button>
                  </div>
                </div>

                <button className="auth-btn-primary" type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="auth-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>

              <div className="auth-divider">
                <div className="auth-div-line" />
                <span>or continue with</span>
                <div className="auth-div-line" />
              </div>

              <button type="button" className="auth-btn-google" onClick={handleGoogleLogin}>
                <GoogleIcon />
                <span>Sign in with Google</span>
              </button>

              <p className="auth-foot">
                New to Shopply? <Link href="/register">Create a free account</Link>
              </p>
            </div>
          </div>
        </div>

        {showGoogleModal && (
          <div className="modal-overlay" onClick={() => setShowGoogleModal(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <GoogleIcon />
                <h3>Configure Google Sign-In</h3>
              </div>
              <div className="modal-body">
                <p>
                  To enable production <strong>Sign in with Google</strong>, add your Google OAuth Client credentials to your environment configuration.
                </p>
                <div className="step-box">
                  <div className="step-title">
                    <div className="step-num">1</div> Create Google Cloud Project
                  </div>
                  <p style={{ marginBottom: 0, fontSize: "13px" }}>
                    Open{" "}
                    <a
                      href="https://console.cloud.google.com"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#111827", fontWeight: 600 }}
                    >
                      console.cloud.google.com
                    </a>{" "}
                    and configure your OAuth Consent Screen.
                  </p>
                </div>
                <div className="step-box">
                  <div className="step-title">
                    <div className="step-num">2</div> Authorized Redirect URI
                  </div>
                  <div className="code-block">
                    {`${origin}/auth/google/callback`}
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(`${origin}/auth/google/callback`);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      {copied ? "Copied" : "Copy URI"}
                    </button>
                  </div>
                </div>
                <div className="step-box">
                  <div className="step-title">
                    <div className="step-num">3</div> Environment Variables
                  </div>
                  <div className="code-block">
                    NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
                  </div>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn-close" onClick={() => setShowGoogleModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
