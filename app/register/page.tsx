"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRegister } from "@/lib/api";
import { getApiCache } from "@/lib/apiCache";

const EyeOpen = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOff = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.81-2.4 3.66v3.04h3.88c2.27-2.09 3.565-5.17 3.565-8.84Z"/>
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.11 0-5.74-2.11-6.68-4.96H1.21v3.15C3.18 21.88 7.27 24 12 24Z"/>
    <path fill="#FBBC05" d="M5.32 14.25a7.16 7.16 0 0 1 0-4.5V6.6H1.21a12 12 0 0 0 0 10.8l4.11-3.15Z"/>
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.27 0 3.18 2.12 1.21 5.85l4.11 3.15c.94-2.85 3.57-4.25 6.68-4.25Z"/>
  </svg>
);

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  let strength = 0;
  if (password.length > 0) {
    strength = 1;
    const hasLength = password.length >= 8;
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    
    const score = [hasLength, hasLower, hasDigit].filter(Boolean).length;
    if (score >= 3) {
      strength = 3;
    } else if (score >= 2) {
      strength = 2;
    }
  }
  const strengthColor = ["transparent", "#ef4444", "#f59e0b", "#10b981"][strength];
  const strengthWidth = ["0%", "25%", "60%", "100%"][strength];

  const handleGoogleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
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
    if (!username.trim()) { setError("Username is required."); return; }
    if (!phone.trim()) { setError("Phone number is required."); return; }
    if (phone.length !== 11) { setError("Phone number must be exactly 11 digits (e.g. 09XXXXXXXXX)."); return; }
    if (!phone.startsWith("09")) { setError("Phone number must start with 09."); return; }
    if (!password) { setError("Password is required."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!/[a-z]/.test(password)) { setError("Password must contain at least one letter."); return; }
    if (!/\d/.test(password)) { setError("Password must contain at least one number."); return; }
    if (!confirm) { setError("Please confirm your password."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const data = await apiRegister({ name: username.trim(), username: username.trim(), phone: phone.trim(), password });
      getApiCache().invalidateAll();
      localStorage.setItem("token", data.token!);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "requires_verify") {
        // Token & user already saved by apiRegister — go to OTP page
        window.location.href = "/verify";
        return;
      }
      setError(msg || "Registration failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f5f7ff}
        .root{min-height:100vh;background:linear-gradient(135deg,#f0f4ff 0%,#faf5ff 50%,#f0f9ff 100%);
          display:flex;align-items:center;justify-content:center;font-family:'Inter',sans-serif;
          position:relative;overflow:hidden;padding:24px 0}
        .circle{position:absolute;border-radius:50%;pointer-events:none}
        .c1{width:400px;height:400px;background:radial-gradient(circle,rgba(59,130,246,.12) 0%,transparent 70%);top:-80px;right:-60px}
        .c2{width:350px;height:350px;background:radial-gradient(circle,rgba(139,92,246,.1) 0%,transparent 70%);bottom:-80px;left:-60px}
        .wrap{position:relative;z-index:10;display:flex;width:100%;max-width:960px;margin:24px;
          border-radius:24px;overflow:hidden;
          box-shadow:0 20px 60px rgba(0,0,0,.08),0 4px 20px rgba(0,0,0,.04)}
        .left{flex:1;background:linear-gradient(145deg,#2563eb 0%,#4f46e5 50%,#7c3aed 100%);
          padding:48px 44px;display:flex;flex-direction:column;justify-content:center;gap:48px;
          position:relative;overflow:hidden}
        .left::before{content:'';position:absolute;width:320px;height:320px;border-radius:50%;
          background:rgba(255,255,255,.07);top:-100px;right:-100px;animation:float1 8s ease-in-out infinite alternate}
        .left::after{content:'';position:absolute;width:220px;height:220px;border-radius:50%;
          background:rgba(255,255,255,.05);bottom:-60px;left:-60px;animation:float2 10s ease-in-out infinite alternate}
        @keyframes float1{from{transform:translate(0,0)}to{transform:translate(20px,20px)}}
        @keyframes float2{from{transform:translate(0,0)}to{transform:translate(-15px,-15px)}}
        .left-logo{display:flex;align-items:center;gap:12px}
        .logo-svg{width:36px;height:36px;flex-shrink:0}
        .logo-text{font-size:18px;font-weight:700;color:#fff;letter-spacing:-.3px}
        .left-content{position:relative;z-index:1}
        .left-tag{font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;
          color:rgba(255,255,255,.5);margin-bottom:14px}
        .left h2{font-size:34px;font-weight:700;color:#fff;letter-spacing:-.8px;line-height:1.15;margin-bottom:16px}
        .left p{font-size:14px;color:rgba(255,255,255,.65);line-height:1.8;max-width:280px}
        .dots{display:flex;gap:8px;margin-top:36px;align-items:center}
        .dots a{display:flex;align-items:center}
        .dot{height:8px;border-radius:4px;transition:opacity .2s,transform .2s}
        .dot.d1{width:8px;background:rgba(255,255,255,.4);cursor:pointer}
        .dot.d1:hover{opacity:.7;transform:scale(1.2)}
        .dot.d2{width:28px;background:#fff;opacity:.9;cursor:default}
        .right{width:460px;background:#fff;padding:48px 44px;display:flex;flex-direction:column;justify-content:center}
        .right-head{margin-bottom:24px}
        .right-head h1{font-size:24px;font-weight:700;color:#0f172a;letter-spacing:-.4px;margin-bottom:6px}
        .right-head p{font-size:14px;color:#94a3b8;line-height:1.5}
        .field{margin-bottom:16px}
        .field label{display:block;font-size:11px;font-weight:600;color:#64748b;letter-spacing:.5px;text-transform:uppercase;margin-bottom:7px}
        .field input{width:100%;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;
          padding:12px 16px;font-size:14px;color:#0f172a;font-family:'Inter',sans-serif;
          outline:none;transition:all .2s}
        .field input::placeholder{color:#cbd5e1}
        .field input:focus{border-color:#4f46e5;background:#f5f3ff;box-shadow:0 0 0 3px rgba(79,70,229,.08)}
        .field input.match{border-color:#10b981}
        .field input.nomatch{border-color:#ef4444}
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear{display:none}
        .row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .bar{height:3px;border-radius:2px;background:#f1f5f9;margin-top:6px;overflow:hidden}
        .fill{height:100%;border-radius:2px;transition:width .3s,background .3s}
        .err{background:#fef2f2;border:1.5px solid #fecaca;border-radius:10px;
          padding:10px 14px;font-size:13px;color:#ef4444;margin-bottom:16px;display:flex;align-items:center;gap:8px}
        .btn{width:100%;padding:13px;background:linear-gradient(135deg,#2563eb 0%,#7c3aed 100%);
          border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:600;
          font-family:'Inter',sans-serif;cursor:pointer;transition:all .2s;margin-top:4px;
          box-shadow:0 4px 14px rgba(79,70,229,.3);
          position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;height:48px;}
        .btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(79,70,229,.4)}
        .btn:disabled{opacity:.7;cursor:not-allowed}
        .btn-google{width:100%;padding:13px;background:#fff;border:1.5px solid #cbd5e1;border-radius:100px;
          color:#0f172a;font-size:15px;font-weight:600;font-family:'Inter',sans-serif;cursor:pointer;
          display:flex;align-items:center;justify-content:center;gap:12px;transition:all .2s;margin-top:8px}
        .btn-google:hover{background:#f8fafc;border-color:#94a3b8;transform:translateY(-1px)}
        .spin{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.4);
          border-top-color:#fff;border-radius:50%;animation:sp .6s linear infinite;vertical-align:middle;margin-right:8px}
        @keyframes sp{to{transform:rotate(360deg)}}
        .divider{display:flex;align-items:center;gap:12px;margin:20px 0}
        .divider span{font-size:12px;color:#cbd5e1;white-space:nowrap}
        .div-line{flex:1;height:1px;background:#f1f5f9}
        .foot{text-align:center;font-size:13px;color:#94a3b8}
        .foot a{color:#4f46e5;text-decoration:none;font-weight:600}
        .foot a:hover{color:#4338ca}
        .hint{font-size:11px;color:#94a3b8;margin-top:4px}


        /* Modal Styles */
        .modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.6);backdrop-filter:blur(8px);
          display:flex;align-items:center;justify-content:center;z-index:100;padding:24px;
          animation:fadeIn .2s ease-out}
        .modal-card{background:#fff;width:100%;max-width:540px;border-radius:24px;padding:40px;
          box-shadow:0 24px 64px rgba(0,0,0,.2);animation:scaleUp .2s ease-out;max-height:90vh;overflow-y:auto}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes scaleUp{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        .modal-head{display:flex;align-items:center;gap:14px;margin-bottom:24px}
        .modal-head h3{font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-.4px}
        .modal-body{font-size:14.5px;color:#475569;line-height:1.6}
        .modal-body p{margin-bottom:16px}
        .step-box{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:16px;padding:20px;margin-bottom:20px}
        .step-title{font-size:15px;font-weight:700;color:#1e293b;margin-bottom:8px;display:flex;align-items:center;gap:8px}
        .step-num{width:24px;height:24px;border-radius:12px;background:#7c3aed;color:#fff;font-size:13px;font-weight:700;display:grid;place-items:center}
        .code-block{background:#0f172a;color:#f8fafc;padding:14px 18px;border-radius:12px;font-family:monospace;font-size:13px;margin:10px 0;position:relative;overflow-x:auto}
        .copy-btn{position:absolute;right:12px;top:12px;background:rgba(255,255,255,.15);border:none;color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;transition:background .2s}
        .copy-btn:hover{background:rgba(255,255,255,.25)}
        .modal-foot{display:flex;justify-content:flex-end;margin-top:28px}
        .btn-close{background:#7c3aed;color:#fff;border:none;padding:12px 28px;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;transition:background .2s}
        .btn-close:hover{background:#6d28d9}

        @media(max-width:750px){
          .wrap{flex-direction:column;max-width:440px}
          .left{padding:28px;min-height:200px}
          .left h2,.left p{display:none}
          .right{width:100%;padding:32px 28px}
          .row{grid-template-columns:1fr}
          .modal-card{padding:28px}
        }
      `}</style>
      <div className="root">
        <div className="circle c1"/><div className="circle c2"/>
        <div className="wrap">
          <div className="left">
            <div className="left-logo">
              <svg className="logo-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 260">
                <rect x="8" y="68" width="184" height="176" rx="24" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="14"/>
                <path d="M56 70 Q56 18 100 18 Q144 18 144 70" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="14" strokeLinecap="round"/>
                <circle cx="68" cy="70" r="7" fill="rgba(255,255,255,0.92)"/>
                <circle cx="132" cy="70" r="7" fill="rgba(255,255,255,0.92)"/>
                <path d="M24 192 Q36 150 70 145 Q104 140 110 170 Q116 198 150 192 Q170 187 176 162"
                  fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M161 145 L176 162 L157 175" fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="logo-text">Shopply</span>
            </div>
            <div className="left-content">
              <p className="left-tag">Get started for free</p>
              <h2>Create your account.<br/>It only takes a minute.</h2>
              <p>Join and get instant access to your dashboard and everything Shopply has to offer.</p>
              <div className="dots">
                <Link href="/login"><div className="dot d1"/></Link>
                <div className="dot d2"/>
              </div>
            </div>
          </div>

          <div className="right">
            <div className="right-head">
              <h1>Create Account</h1>
              <p>Fill in your details to get started</p>
            </div>
            {error && <div className="err"><span>⚠</span>{error}</div>}

            <div className="field">
              <label>Username</label>
              <input
                type="text" placeholder="Username"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                autoComplete="off"
              />
            </div>


            <div className="field">
              <label>Phone Number</label>
              <input
                type="tel" placeholder="09xxxxxxxxx"
                value={phone}
                maxLength={11}
                onChange={e => {
                  // Only allow digits, max 11 characters
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                  setPhone(digits);
                  setError("");
                }}
                autoComplete="tel"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
                  <span style={{ fontSize: '12px' }}>📱</span>
                  <span>SMS OTP will be sent to verify your number</span>
                </div>
                {phone.length > 0 && phone.length < 11 && (
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, marginTop: 4 }}>
                    {phone.length}/11 digits
                  </span>
                )}
              </div>
            </div>


            <div className="row">
              <div className="field">
                <label>Password</label>
                <div style={{position:"relative"}}>
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(""); }}
                    autoComplete="new-password"
                    style={{paddingRight:"44px"}}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",
                      background:"none",border:"none",cursor:"pointer",color:"#94a3b8",padding:0,display:"flex"}}>
                    {showPass ? <EyeOpen/> : <EyeOff/>}
                  </button>
                </div>
                <div className="bar">
                  <div className="fill" style={{ width: strengthWidth, background: strengthColor }}/>
                </div>
                <p className="hint">Min. 8 chars (letters and numbers)</p>
              </div>
              <div className="field">
                <label>Confirm</label>
                <div style={{position:"relative"}}>
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError(""); }}
                    autoComplete="new-password"
                    className={confirm.length > 0 ? (confirm === password ? "match" : "nomatch") : ""}
                    style={{paddingRight:"44px"}}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",
                      background:"none",border:"none",cursor:"pointer",color:"#94a3b8",padding:0,display:"flex"}}>
                    {showConfirm ? <EyeOpen/> : <EyeOff/>}
                  </button>
                </div>
              </div>
            </div>

            <button className="btn" disabled={loading} onClick={handleSubmit}>
              {loading ? (
                <div className="animate-pulse bg-white/40 rounded" style={{ height: 16, width: 120 }}></div>
              ) : "Create Account →"}
            </button>

            <div className="divider"><div className="div-line" /><span>or</span><div className="div-line" /></div>

            <button type="button" className="btn-google" onClick={handleGoogleLogin}>
              <GoogleIcon />
              <span>Sign in with Google</span>
            </button>

            <div className="divider"><div className="div-line"/><span>Already have an account?</span><div className="div-line"/></div>
            <p className="foot"><Link href="/login">Sign in instead →</Link></p>
          </div>
        </div>

        {showGoogleModal && (
          <div className="modal-overlay" onClick={() => setShowGoogleModal(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-head">
                <GoogleIcon />
                <h3>Configure Real Google Sign-In</h3>
              </div>
              <div className="modal-body">
                <p>
                  To enable production-ready <strong>Sign in with Google</strong>, you need to provide your Google API credentials. We have removed all simulated logins so your application uses 100% real Google OAuth.
                </p>
                <div className="step-box">
                  <div className="step-title"><div className="step-num">1</div> Create Google Cloud Project</div>
                  <p style={{marginBottom:0,fontSize:"13.5px"}}>
                    Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{color:"#7c3aed",fontWeight:600}}>console.cloud.google.com</a>, create a new project, and configure the OAuth Consent Screen.
                  </p>
                </div>
                <div className="step-box">
                  <div className="step-title"><div className="step-num">2</div> Create OAuth Client ID</div>
                  <p style={{marginBottom:"8px",fontSize:"13.5px"}}>
                    Create an OAuth Client ID (Web application) and add the following Authorized Redirect URI exactly as shown:
                  </p>
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
                      {copied ? "Copied!" : "Copy URI"}
                    </button>
                  </div>
                </div>
                <div className="step-box">
                  <div className="step-title"><div className="step-num">3</div> Add Credentials to Your .env Files</div>
                  <p style={{marginBottom:"8px",fontSize:"13.5px"}}>
                    Open your project files and add your Client ID and Client Secret:
                  </p>
                  <div className="code-block" style={{marginBottom:"12px"}}>
                    <div style={{color:"#94a3b8",marginBottom:"4px"}}># Frontend (.env.local):</div>
                    NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
                  </div>
                  <div className="code-block">
                    <div style={{color:"#94a3b8",marginBottom:"4px"}}># Backend (myproduct-backend/.env):</div>
                    GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com<br />
                    GOOGLE_CLIENT_SECRET=your_client_secret
                  </div>
                </div>
                <p style={{marginBottom:0,fontSize:"13.5px",color:"#64748b"}}>
                  Once added, restart your frontend and backend servers. Click the button again, and real Google Sign-In will function perfectly!
                </p>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn-close" onClick={() => setShowGoogleModal(false)}>
                  Got it, close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}