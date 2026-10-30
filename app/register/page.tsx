"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { apiRegister } from "@/lib/api";
import { getApiCache } from "@/lib/apiCache";
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

const CheckMark = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XMark = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
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

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [touched, setTouched] = useState({
    username: false,
    email: false,
    password: false,
    confirm: false,
  });

  useEffect(() => {
    setOrigin(window.location.origin);

    (window as unknown as Record<string, unknown>).onRecaptchaSuccess = (token: string) => {
      setRecaptchaToken(token);
      setError("");
    };
    (window as unknown as Record<string, unknown>).onRecaptchaExpired = () => {
      setRecaptchaToken(null);
    };

    if (!document.getElementById("google-recaptcha-script")) {
      const script = document.createElement("script");
      script.id = "google-recaptcha-script";
      script.src = "https://www.google.com/recaptcha/api.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  const passRules = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "Contains a letter", ok: /[a-zA-Z]/.test(password) },
    { label: "Contains a number", ok: /\d/.test(password) },
  ];
  const passScore = passRules.filter((r) => r.ok).length;
  const passwordOk = passScore === 3;
  const confirmOk = password === confirm && confirm.length > 0;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const strengthLabel = ["", "Weak", "Fair", "Strong"][passScore];
  const strengthColor = ["transparent", "#DC2626", "#D97706", "#059669"][passScore];
  const strengthWidth = ["0%", "33%", "66%", "100%"][passScore];

  const handleGoogleLogin = () => {
    const clientId = "10342567270-6b7rfni3mbil5anjo1fk1u9c9eo4mp6l.apps.googleusercontent.com" as string;
    if (!clientId || clientId === "your_google_client_id_here") {
      setShowGoogleModal(true);
      return;
    }
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid email profile&prompt=select_account`;
    window.location.href = authUrl;
  };

  const handleSubmit = async () => {
    setError("");
    setTouched({ username: true, email: true, password: true, confirm: true });

    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!isEmailValid) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!passwordOk) {
      setError("Password must be at least 8 characters with a letter and a number.");
      return;
    }
    if (!confirmOk) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }
    if (!recaptchaToken) {
      setError("Please complete the reCAPTCHA verification.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiRegister({
        name: username.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        recaptchaToken,
      });
      getApiCache().invalidateAll();
      localStorage.setItem("token", data.token!);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "requires_verify") {
        window.location.href = "/verify";
        return;
      }
      setError(msg || "Registration failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <style suppressHydrationWarning>{`
        .reg-page {
          min-height: 100vh;
          background: #F7F7F5;
          display: flex;
          flex-direction: column;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #111827;
        }
        .reg-topbar {
          max-width: 980px;
          width: 100%;
          margin: 0 auto;
          padding: 20px 24px 0;
        }
        .reg-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13.5px;
          font-weight: 500;
          color: #4B5563;
          text-decoration: none;
        }
        .reg-back:hover {
          color: #111827;
        }
        .reg-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .reg-shell {
          width: 100%;
          max-width: 960px;
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          overflow: hidden;
          display: grid;
          grid-template-columns: 1fr 500px;
          box-shadow: 0 12px 32px rgba(17, 24, 39, 0.05);
        }
        .reg-aside {
          background: #111827;
          color: #FFFFFF;
          padding: 48px 42px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 32px;
        }
        .reg-eyebrow {
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #34D399;
          margin-bottom: 12px;
        }
        .reg-aside h2 {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 29px;
          font-weight: 700;
          letter-spacing: -0.025em;
          line-height: 1.18;
          margin-bottom: 14px;
        }
        .reg-aside p {
          font-size: 14px;
          color: #D1D5DB;
          line-height: 1.65;
          max-width: 310px;
        }
        .reg-points {
          list-style: none;
          padding: 24px 0 0;
          margin: 24px 0 0;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .reg-points li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #E5E7EB;
        }
        .reg-point-dot {
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
        .reg-form {
          padding: 40px 42px;
          background: #FFFFFF;
        }
        .reg-head {
          margin-bottom: 22px;
        }
        .reg-head h1 {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.025em;
          margin-bottom: 4px;
        }
        .reg-head p {
          font-size: 13.5px;
          color: #6B7280;
        }
        .field {
          margin-bottom: 14px;
        }
        .field label {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
        }
        .field input {
          width: 100%;
          height: 42px;
          background: #FFFFFF;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          padding: 0 13px;
          font-size: 14px;
          color: #111827;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .field input::placeholder {
          color: #9CA3AF;
        }
        .field input:focus {
          border-color: #111827;
          box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
        }
        .field input.valid {
          border-color: #059669;
        }
        .field input.invalid {
          border-color: #DC2626;
        }
        .field input.has-icon {
          padding-right: 40px;
        }
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
        .eye-btn {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #6B7280;
          padding: 5px;
          display: flex;
          align-items: center;
        }
        .field-err {
          font-size: 11.5px;
          color: #DC2626;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 500;
        }
        .field-ok {
          font-size: 11.5px;
          color: #059669;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 500;
        }
        .row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .strength-bar {
          height: 3px;
          border-radius: 2px;
          background: #E5E7EB;
          margin-top: 7px;
          overflow: hidden;
        }
        .strength-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.25s ease, background 0.25s ease;
        }
        .strength-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 4px;
        }
        .strength-text {
          font-size: 11px;
          font-weight: 600;
        }
        .hint {
          font-size: 11px;
          color: #6B7280;
        }
        .rules {
          margin-top: 6px;
          margin-bottom: 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          background: #F9FAFB;
          border-radius: 8px;
          padding: 9px 12px;
          border: 1px solid #E5E7EB;
        }
        .rule {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 500;
        }
        .rule.ok {
          color: #059669;
        }
        .rule.fail {
          color: #6B7280;
        }
        .rule-dot {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .rule.ok .rule-dot {
          background: #ECFDF5;
        }
        .rule.fail .rule-dot {
          background: #F3F4F6;
        }
        .email-note {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          color: #4B5563;
          margin-top: 6px;
        }
        .terms-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 12px 0 14px;
        }
        .terms-checkbox {
          width: 18px;
          height: 18px;
          border-radius: 4px;
          border: 1.5px solid #9CA3AF;
          background: #FFFFFF;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
          color: #FFFFFF;
        }
        .terms-checkbox.checked {
          background: #111827;
          border-color: #111827;
        }
        .terms-text {
          font-size: 12.5px;
          color: #4B5563;
          line-height: 1.55;
        }
        .terms-text a {
          color: #111827;
          font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .err {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          color: #B91C1C;
          margin-bottom: 14px;
          line-height: 1.45;
        }
        .btn {
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
        }
        .btn:hover:not(:disabled) {
          background: #1F2937;
        }
        .btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .spin {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-top-color: #FFFFFF;
          border-radius: 50%;
          animation: sp 0.65s linear infinite;
        }
        @keyframes sp {
          to { transform: rotate(360deg); }
        }
        .btn-google {
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
          margin-top: 12px;
          transition: background 0.15s ease;
        }
        .btn-google:hover {
          background: #F9FAFB;
        }
        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 16px 0 0;
        }
        .divider span {
          font-size: 12px;
          color: #9CA3AF;
        }
        .div-line {
          flex: 1;
          height: 1px;
          background: #E5E7EB;
        }
        .foot {
          text-align: center;
          font-size: 13.5px;
          color: #6B7280;
          margin-top: 16px;
        }
        .foot a {
          color: #111827;
          font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .recaptcha-wrap {
          display: flex;
          justify-content: center;
          margin: 12px 0 4px;
        }
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
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-head {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
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
          background: rgba(255, 255, 255, 0.15);
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

        @media (max-width: 820px) {
          .reg-shell {
            grid-template-columns: 1fr;
            max-width: 480px;
          }
          .reg-aside {
            padding: 28px;
          }
          .reg-points {
            display: none;
          }
          .reg-aside h2 {
            font-size: 22px;
            margin-bottom: 6px;
          }
          .reg-form {
            padding: 32px 24px;
          }
          .row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="reg-page">
        <div className="reg-topbar">
          <Link href="/" className="reg-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to storefront</span>
          </Link>
        </div>

        <div className="reg-main">
          <div className="reg-shell">
            <div className="reg-aside">
              <ShopplyWordmark href="/" inverted />
              <div>
                <p className="reg-eyebrow">Free Account</p>
                <h2>Shop local stores or launch your own storefront.</h2>
                <p>
                  One verified Shopply account lets you buy nationwide and list products for sale with zero monthly subscription fees.
                </p>
                <ul className="reg-points">
                  <li>
                    <span className="reg-point-dot">
                      <CheckMark />
                    </span>
                    <span>Instant buyer &amp; seller dashboard access</span>
                  </li>
                  <li>
                    <span className="reg-point-dot">
                      <CheckMark />
                    </span>
                    <span>Email OTP verification keeps accounts genuine</span>
                  </li>
                  <li>
                    <span className="reg-point-dot">
                      <CheckMark />
                    </span>
                    <span>Nationwide COD, e-wallet &amp; meetup support</span>
                  </li>
                </ul>
              </div>
              <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
                Already registered?{" "}
                <Link href="/login" style={{ color: "#FFFFFF", fontWeight: 600 }}>
                  Sign in here
                </Link>
              </div>
            </div>

            <div className="reg-form">
              <div className="reg-head">
                <h1>Create your account</h1>
                <p>Complete your details below to get started</p>
              </div>

              {error && <div className="err">{error}</div>}

              <div className="field">
                <label>Username</label>
                <input
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  className={touched.username ? (username.trim().length >= 3 ? "valid" : "invalid") : ""}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError("");
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                  autoComplete="off"
                />
                {touched.username && username.trim().length < 3 && username.length > 0 && (
                  <div className="field-err">
                    <XMark /> At least 3 characters required
                  </div>
                )}
                {touched.username && username.trim().length >= 3 && (
                  <div className="field-ok">
                    <CheckMark /> Username available format
                  </div>
                )}
              </div>

              <div className="field">
                <label>Email address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  className={touched.email && email.trim() ? (isEmailValid ? "valid" : "invalid") : ""}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  autoComplete="email"
                />
                {touched.email && email.trim() && !isEmailValid && (
                  <div className="field-err">
                    <XMark /> Please enter a valid email address
                  </div>
                )}
                <div className="email-note">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <span>We&apos;ll send a 6-digit verification code to this address</span>
                </div>
              </div>

              <div className="row">
                <div className="field">
                  <label>Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="Create password"
                      value={password}
                      className={`has-icon${touched.password && password ? (passwordOk ? " valid" : " invalid") : ""}`}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="eye-btn"
                      aria-label={showPass ? "Hide password" : "Show password"}
                      onClick={() => setShowPass(!showPass)}
                    >
                      {showPass ? <EyeOpen /> : <EyeOff />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <>
                      <div className="strength-bar">
                        <div className="strength-fill" style={{ width: strengthWidth, background: strengthColor }} />
                      </div>
                      <div className="strength-label">
                        <span className="hint">Password strength</span>
                        <span className="strength-text" style={{ color: strengthColor }}>
                          {strengthLabel}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="field">
                  <label>Confirm password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Repeat password"
                      value={confirm}
                      className={`has-icon${touched.confirm && confirm ? (confirmOk ? " valid" : " invalid") : ""}`}
                      onChange={(e) => {
                        setConfirm(e.target.value);
                        setError("");
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="eye-btn"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                      onClick={() => setShowConfirm(!showConfirm)}
                    >
                      {showConfirm ? <EyeOpen /> : <EyeOff />}
                    </button>
                  </div>
                  {touched.confirm && confirm.length > 0 && !confirmOk && (
                    <div className="field-err">
                      <XMark /> Passwords don&apos;t match
                    </div>
                  )}
                  {touched.confirm && confirmOk && (
                    <div className="field-ok">
                      <CheckMark /> Passwords match
                    </div>
                  )}
                </div>
              </div>

              {password.length > 0 && (
                <div className="rules">
                  {passRules.map((r) => (
                    <div key={r.label} className={`rule ${r.ok ? "ok" : "fail"}`}>
                      <div className="rule-dot">{r.ok ? <CheckMark /> : <XMark />}</div>
                      {r.label}
                    </div>
                  ))}
                </div>
              )}

              <div className="recaptcha-wrap">
                <div
                  className="g-recaptcha"
                  data-sitekey={
                    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "6Lc0RV4tAAAAAFG8MkXdmNJ0Bs9pX8_ML7dwtcpM"
                  }
                  data-callback="onRecaptchaSuccess"
                  data-expired-callback="onRecaptchaExpired"
                />
              </div>

              <div className="terms-row">
                <div
                  className={`terms-checkbox${agreedToTerms ? " checked" : ""}`}
                  onClick={() => setAgreedToTerms(!agreedToTerms)}
                  role="checkbox"
                  aria-checked={agreedToTerms}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === " " && setAgreedToTerms(!agreedToTerms)}
                >
                  {agreedToTerms && <CheckMark />}
                </div>
                <p className="terms-text">
                  I agree to the <Link href="/terms">Terms of Service</Link> and{" "}
                  <Link href="/privacy">Privacy Policy</Link>.
                </p>
              </div>

              <button className="btn" disabled={loading} onClick={handleSubmit}>
                {loading ? (
                  <>
                    <div className="spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  "Create account"
                )}
              </button>

              <div className="divider">
                <div className="div-line" />
                <span>or</span>
                <div className="div-line" />
              </div>

              <button type="button" className="btn-google" onClick={handleGoogleLogin}>
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>

              <p className="foot">
                Already have an account? <Link href="/login">Sign in</Link>
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
                <p style={{ marginBottom: "14px" }}>
                  To enable Google OAuth registration, add your Client ID and Authorized Redirect URI in Google Cloud Console.
                </p>
                <div className="step-box">
                  <div className="step-title">
                    <div className="step-num">1</div> Authorized Redirect URI
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
