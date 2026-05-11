"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiLogin } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await apiLogin(form);
      localStorage.setItem("token", data.token!);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Check your credentials.");
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
          position:relative;overflow:hidden}
        .circle{position:absolute;border-radius:50%;pointer-events:none}
        .c1{width:400px;height:400px;background:radial-gradient(circle,rgba(139,92,246,.12) 0%,transparent 70%);top:-80px;right:-60px}
        .c2{width:350px;height:350px;background:radial-gradient(circle,rgba(59,130,246,.1) 0%,transparent 70%);bottom:-80px;left:-60px}
        .wrap{position:relative;z-index:10;display:flex;width:100%;max-width:960px;margin:24px;
          min-height:580px;border-radius:24px;overflow:hidden;
          box-shadow:0 20px 60px rgba(0,0,0,.08),0 4px 20px rgba(0,0,0,.04)}
        .left{flex:1;background:linear-gradient(145deg,#7c3aed 0%,#4f46e5 50%,#2563eb 100%);
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
        .dot.d1{width:28px;background:#fff;opacity:.9;cursor:default}
        .dot.d2{width:8px;background:rgba(255,255,255,.4);cursor:pointer}
        .dot.d2:hover{opacity:.7;transform:scale(1.2)}
        .right{width:420px;background:#fff;padding:52px 44px;display:flex;flex-direction:column;justify-content:center}
        .right-head{margin-bottom:32px}
        .right-head h1{font-size:26px;font-weight:700;color:#0f172a;letter-spacing:-.4px;margin-bottom:6px}
        .right-head p{font-size:14px;color:#94a3b8;line-height:1.5}
        .field{margin-bottom:18px}
        .field label{display:block;font-size:11px;font-weight:600;color:#64748b;letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px}
        .field input{width:100%;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;
          padding:13px 16px;font-size:14px;color:#0f172a;font-family:'Inter',sans-serif;
          outline:none;transition:all .2s}
        .field input::placeholder{color:#cbd5e1}
        .field input:focus{border-color:#7c3aed;background:#faf5ff;box-shadow:0 0 0 3px rgba(124,58,237,.08)}
        .err{background:#fef2f2;border:1.5px solid #fecaca;border-radius:10px;
          padding:10px 14px;font-size:13px;color:#ef4444;margin-bottom:18px;display:flex;align-items:center;gap:8px}
        .btn{width:100%;padding:14px;background:linear-gradient(135deg,#7c3aed 0%,#2563eb 100%);
          border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:600;
          font-family:'Inter',sans-serif;cursor:pointer;transition:all .2s;margin-top:4px;
          box-shadow:0 4px 14px rgba(124,58,237,.3)}
        .btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(124,58,237,.4)}
        .btn:disabled{opacity:.7;cursor:not-allowed}
        .spin{display:inline-block;width:15px;height:15px;border:2px solid rgba(255,255,255,.4);
          border-top-color:#fff;border-radius:50%;animation:sp .6s linear infinite;vertical-align:middle;margin-right:8px}
        @keyframes sp{to{transform:rotate(360deg)}}
        .divider{display:flex;align-items:center;gap:12px;margin:24px 0}
        .divider span{font-size:12px;color:#cbd5e1;white-space:nowrap}
        .div-line{flex:1;height:1px;background:#f1f5f9}
        .foot{text-align:center;font-size:13.5px;color:#94a3b8}
        .foot a{color:#7c3aed;text-decoration:none;font-weight:600}
        .foot a:hover{color:#6d28d9}
        @media(max-width:700px){
          .wrap{flex-direction:column;max-width:420px}
          .left{padding:32px 28px;min-height:200px}
          .left h2{font-size:22px}
          .left p{display:none}
          .right{width:100%;padding:36px 28px}
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
              <p className="left-tag">Your workspace awaits</p>
              <h2>Welcome back.<br/>Sign in to continue.</h2>
              <p>Access your dashboard, manage your account, and pick up right where you left off.</p>
              <div className="dots">
                <div className="dot d1"/>
                <Link href="/register"><div className="dot d2"/></Link>
              </div>
            </div>
          </div>

          <div className="right">
            <div className="right-head">
              <h1>Sign In</h1>
              <p>Enter your credentials to continue</p>
            </div>
            {error && <div className="err"><span>⚠</span>{error}</div>}
            <form onSubmit={handleSubmit} method="POST">
              <div className="field">
                <label>Email</label>
                <input
                  type="email" name="email" placeholder="you@example.com"
                  value={form.email} onChange={handleChange}
                  required autoComplete="email"
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  type="password" name="password" placeholder="••••••••"
                  value={form.password} onChange={handleChange}
                  required autoComplete="current-password"
                />
              </div>
              <button className="btn" type="submit" disabled={loading}>
                {loading && <span className="spin"/>}
                {loading ? "Signing in…" : "Sign In →"}
              </button>
            </form>
            <div className="divider"><div className="div-line"/><span>No account yet?</span><div className="div-line"/></div>
            <p className="foot"><Link href="/register">Create a free account →</Link></p>
          </div>
        </div>
      </div>
    </>
  );
}