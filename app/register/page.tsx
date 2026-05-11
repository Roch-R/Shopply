"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRegister } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength =
    password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthColor = ["transparent", "#ef4444", "#f59e0b", "#10b981"][strength];
  const strengthWidth = ["0%", "25%", "60%", "100%"][strength];

  const handleSubmit = async () => {
    setError("");
    if (!name.trim()) { setError("Full name is required."); return; }
    if (!email.trim()) { setError("Email is required."); return; }
    if (!password) { setError("Password is required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (!confirm) { setError("Please confirm your password."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const data = await apiRegister({ name: name.trim(), email: email.trim(), password });
      localStorage.setItem("token", data.token!);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
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
        .row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .bar{height:3px;border-radius:2px;background:#f1f5f9;margin-top:6px;overflow:hidden}
        .fill{height:100%;border-radius:2px;transition:width .3s,background .3s}
        .err{background:#fef2f2;border:1.5px solid #fecaca;border-radius:10px;
          padding:10px 14px;font-size:13px;color:#ef4444;margin-bottom:16px;display:flex;align-items:center;gap:8px}
        .btn{width:100%;padding:13px;background:linear-gradient(135deg,#2563eb 0%,#7c3aed 100%);
          border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:600;
          font-family:'Inter',sans-serif;cursor:pointer;transition:all .2s;margin-top:4px;
          box-shadow:0 4px 14px rgba(79,70,229,.3)}
        .btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(79,70,229,.4)}
        .btn:disabled{opacity:.7;cursor:not-allowed}
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
        @media(max-width:750px){
          .wrap{flex-direction:column;max-width:440px}
          .left{padding:28px;min-height:200px}
          .left h2,.left p{display:none}
          .right{width:100%;padding:32px 28px}
          .row{grid-template-columns:1fr}
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
              <label>Full Name</label>
              <input
                type="text" placeholder="Juan dela Cruz"
                value={name}
                onChange={e => { setName(e.target.value); setError(""); }}
                autoComplete="name"
              />
            </div>

            <div className="field">
              <label>Email Address</label>
              <input
                type="email" placeholder="you@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                autoComplete="email"
              />
            </div>

            <div className="row">
              <div className="field">
                <label>Password</label>
                <input
                  type="password" placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  autoComplete="new-password"
                />
                <div className="bar">
                  <div className="fill" style={{ width: strengthWidth, background: strengthColor }}/>
                </div>
                <p className="hint">Min. 6 characters</p>
              </div>
              <div className="field">
                <label>Confirm</label>
                <input
                  type="password" placeholder="••••••••"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(""); }}
                  autoComplete="new-password"
                  className={confirm.length > 0 ? (confirm === password ? "match" : "nomatch") : ""}
                />
              </div>
            </div>

            <button className="btn" disabled={loading} onClick={handleSubmit}>
              {loading && <span className="spin"/>}
              {loading ? "Creating account…" : "Create Account →"}
            </button>

            <div className="divider"><div className="div-line"/><span>Already have an account?</span><div className="div-line"/></div>
            <p className="foot"><Link href="/login">Sign in instead →</Link></p>
          </div>
        </div>
      </div>
    </>
  );
}