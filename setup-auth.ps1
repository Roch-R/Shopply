# ============================================================
# AUTH SETUP SCRIPT - Run this inside myproduct folder
# PS D:\CODE FOR STUDENTS\myproduct> .\setup-auth.ps1
# ============================================================

Write-Host "Writing lib/api.ts..." -ForegroundColor Cyan
@'
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  token?: string;
  user?: T;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    const firstError =
      data?.message ||
      (data?.errors ? Object.values(data.errors).flat()[0] : null) ||
      "An error occurred.";
    throw new Error(firstError as string);
  }
  return data;
}

export async function apiRegister(payload: { name: string; email: string; password: string }) {
  return request<AuthUser>("/register", { method: "POST", body: JSON.stringify(payload) });
}

export async function apiLogin(payload: { email: string; password: string }) {
  return request<AuthUser>("/login", { method: "POST", body: JSON.stringify(payload) });
}

export async function apiMe() {
  return request<AuthUser>("/me");
}

export async function apiLogout(): Promise<void> {
  await request("/logout", { method: "POST" });
  clearAuth();
}
'@ | Set-Content -Path "lib\api.ts" -Encoding UTF8

Write-Host "Writing app/login/page.tsx..." -ForegroundColor Cyan
@'
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
    setLoading(true);
    setError("");
    try {
      const data = await apiLogin(form);
      localStorage.setItem("token", data.token!);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .root{min-height:100vh;background:#050507;display:flex;align-items:center;justify-content:center;
          font-family:'DM Sans',sans-serif;position:relative;overflow:hidden}
        .blob{position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none}
        .b1{width:500px;height:500px;opacity:.32;background:radial-gradient(circle,#6c3bff 0%,transparent 70%);
          top:-120px;left:-100px;animation:d1 12s ease-in-out infinite alternate}
        .b2{width:400px;height:400px;opacity:.28;background:radial-gradient(circle,#0ea5e9 0%,transparent 70%);
          bottom:-100px;right:-80px;animation:d2 15s ease-in-out infinite alternate}
        @keyframes d1{from{transform:translate(0,0)}to{transform:translate(40px,30px)}}
        @keyframes d2{from{transform:translate(0,0)}to{transform:translate(-30px,-40px)}}
        .grid{position:absolute;inset:0;pointer-events:none;
          background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);
          background-size:40px 40px}
        .card{position:relative;z-index:10;width:100%;max-width:420px;margin:24px;
          background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);
          border-radius:20px;padding:44px 40px;backdrop-filter:blur(24px);
          box-shadow:0 0 0 1px rgba(255,255,255,.04) inset,0 32px 80px rgba(0,0,0,.6),0 0 80px rgba(108,59,255,.08);
          animation:up .5s cubic-bezier(.16,1,.3,1) both}
        @keyframes up{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        .brand{display:flex;align-items:center;gap:10px;margin-bottom:32px}
        .dot{width:34px;height:34px;background:linear-gradient(135deg,#7c4dff,#0ea5e9);border-radius:10px;
          display:grid;place-items:center;font-size:16px;font-weight:800;color:#fff;font-family:'Syne',sans-serif}
        .brand-name{font-family:'Syne',sans-serif;font-size:17px;font-weight:700;color:rgba(255,255,255,.85);letter-spacing:-.3px}
        h1{font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:#fff;letter-spacing:-.5px;margin-bottom:6px}
        .sub{font-size:14px;color:rgba(255,255,255,.4);margin-bottom:30px;line-height:1.5}
        .field{margin-bottom:18px}
        .field label{display:block;font-size:12px;font-weight:500;color:rgba(255,255,255,.45);
          letter-spacing:.6px;text-transform:uppercase;margin-bottom:8px}
        .field input{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
          border-radius:10px;padding:13px 16px;font-size:14.5px;color:#fff;font-family:'DM Sans',sans-serif;
          outline:none;transition:border-color .2s,background .2s,box-shadow .2s}
        .field input::placeholder{color:rgba(255,255,255,.2)}
        .field input:focus{border-color:rgba(124,77,255,.6);background:rgba(124,77,255,.08);box-shadow:0 0 0 3px rgba(124,77,255,.15)}
        .err{background:rgba(244,63,94,.12);border:1px solid rgba(244,63,94,.3);border-radius:8px;
          padding:10px 14px;font-size:13px;color:#fb7185;margin-bottom:18px;display:flex;align-items:center;gap:8px}
        .btn{width:100%;padding:14px;background:linear-gradient(135deg,#7c4dff 0%,#0ea5e9 100%);
          border:none;border-radius:10px;color:#fff;font-size:15px;font-weight:600;
          font-family:'DM Sans',sans-serif;cursor:pointer;transition:opacity .2s,transform .15s;margin-top:8px}
        .btn:hover{opacity:.9;transform:translateY(-1px)}
        .btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
        .spin{display:inline-block;width:15px;height:15px;border:2px solid rgba(255,255,255,.4);
          border-top-color:#fff;border-radius:50%;animation:sp .6s linear infinite;vertical-align:middle;margin-right:8px}
        @keyframes sp{to{transform:rotate(360deg)}}
        .div-row{display:flex;align-items:center;gap:12px;margin:24px 0}
        .div-row span{font-size:12px;color:rgba(255,255,255,.25);white-space:nowrap}
        .div-line{flex:1;height:1px;background:rgba(255,255,255,.08)}
        .foot{text-align:center;font-size:13.5px;color:rgba(255,255,255,.35)}
        .foot a{color:#a78bfa;text-decoration:none;font-weight:500}
        .foot a:hover{color:#c4b5fd}
      `}</style>
      <div className="root">
        <div className="blob b1"/><div className="blob b2"/><div className="grid"/>
        <div className="card">
          <div className="brand"><div className="dot">M</div><span className="brand-name">MyProduct</span></div>
          <h1>Welcome back</h1>
          <p className="sub">Sign in to your account to continue.</p>
          {error && <div className="err"><span>⚠</span>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Email</label>
              <input type="email" name="email" placeholder="you@example.com"
                value={form.email} onChange={handleChange} required autoComplete="email"/>
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" name="password" placeholder="••••••••"
                value={form.password} onChange={handleChange} required autoComplete="current-password"/>
            </div>
            <button className="btn" disabled={loading}>
              {loading && <span className="spin"/>}{loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
          <div className="div-row"><div className="div-line"/><span>No account?</span><div className="div-line"/></div>
          <p className="foot"><Link href="/register">Create a free account →</Link></p>
        </div>
      </div>
    </>
  );
}
'@ | Set-Content -Path "app\login\page.tsx" -Encoding UTF8

Write-Host "Writing app/register/page.tsx..." -ForegroundColor Cyan
@'
"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRegister } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const data = await apiRegister({ name: form.name, email: form.email, password: form.password });
      localStorage.setItem("token", data.token!);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .root{min-height:100vh;background:#050507;display:flex;align-items:center;justify-content:center;
          font-family:'DM Sans',sans-serif;position:relative;overflow:hidden}
        .blob{position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none}
        .b1{width:500px;height:500px;opacity:.28;background:radial-gradient(circle,#0ea5e9 0%,transparent 70%);
          top:-100px;right:-80px;animation:d1 14s ease-in-out infinite alternate}
        .b2{width:420px;height:420px;opacity:.26;background:radial-gradient(circle,#7c4dff 0%,transparent 70%);
          bottom:-120px;left:-60px;animation:d2 11s ease-in-out infinite alternate}
        @keyframes d1{from{transform:translate(0,0)}to{transform:translate(-30px,40px)}}
        @keyframes d2{from{transform:translate(0,0)}to{transform:translate(40px,-30px)}}
        .grid{position:absolute;inset:0;pointer-events:none;
          background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);
          background-size:40px 40px}
        .card{position:relative;z-index:10;width:100%;max-width:440px;margin:24px;
          background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);
          border-radius:20px;padding:44px 40px;backdrop-filter:blur(24px);
          box-shadow:0 0 0 1px rgba(255,255,255,.04) inset,0 32px 80px rgba(0,0,0,.6);
          animation:up .5s cubic-bezier(.16,1,.3,1) both}
        @keyframes up{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        .brand{display:flex;align-items:center;gap:10px;margin-bottom:32px}
        .dot{width:34px;height:34px;background:linear-gradient(135deg,#0ea5e9,#7c4dff);border-radius:10px;
          display:grid;place-items:center;font-size:16px;font-weight:800;color:#fff;font-family:'Syne',sans-serif}
        .brand-name{font-family:'Syne',sans-serif;font-size:17px;font-weight:700;color:rgba(255,255,255,.85);letter-spacing:-.3px}
        h1{font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:#fff;letter-spacing:-.5px;margin-bottom:6px}
        .sub{font-size:14px;color:rgba(255,255,255,.4);margin-bottom:30px;line-height:1.5}
        .row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .field{margin-bottom:18px}
        .field label{display:block;font-size:12px;font-weight:500;color:rgba(255,255,255,.45);
          letter-spacing:.6px;text-transform:uppercase;margin-bottom:8px}
        .field input{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
          border-radius:10px;padding:13px 16px;font-size:14.5px;color:#fff;font-family:'DM Sans',sans-serif;
          outline:none;transition:border-color .2s,background .2s,box-shadow .2s}
        .field input::placeholder{color:rgba(255,255,255,.2)}
        .field input:focus{border-color:rgba(14,165,233,.6);background:rgba(14,165,233,.07);box-shadow:0 0 0 3px rgba(14,165,233,.13)}
        .field input.ok{border-color:rgba(16,185,129,.5)}
        .field input.no{border-color:rgba(244,63,94,.5)}
        .bar{height:3px;border-radius:2px;background:rgba(255,255,255,.08);margin-top:6px;overflow:hidden}
        .fill{height:100%;border-radius:2px;transition:width .3s,background .3s}
        .err{background:rgba(244,63,94,.12);border:1px solid rgba(244,63,94,.3);border-radius:8px;
          padding:10px 14px;font-size:13px;color:#fb7185;margin-bottom:18px;display:flex;align-items:center;gap:8px}
        .btn{width:100%;padding:14px;background:linear-gradient(135deg,#0ea5e9 0%,#7c4dff 100%);
          border:none;border-radius:10px;color:#fff;font-size:15px;font-weight:600;
          font-family:'DM Sans',sans-serif;cursor:pointer;transition:opacity .2s,transform .15s;margin-top:8px}
        .btn:hover{opacity:.9;transform:translateY(-1px)}
        .btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
        .spin{display:inline-block;width:15px;height:15px;border:2px solid rgba(255,255,255,.4);
          border-top-color:#fff;border-radius:50%;animation:sp .6s linear infinite;vertical-align:middle;margin-right:8px}
        @keyframes sp{to{transform:rotate(360deg)}}
        .div-row{display:flex;align-items:center;gap:12px;margin:24px 0}
        .div-row span{font-size:12px;color:rgba(255,255,255,.25);white-space:nowrap}
        .div-line{flex:1;height:1px;background:rgba(255,255,255,.08)}
        .foot{text-align:center;font-size:13.5px;color:rgba(255,255,255,.35)}
        .foot a{color:#38bdf8;text-decoration:none;font-weight:500}
        .foot a:hover{color:#7dd3fc}
      `}</style>
      <div className="root">
        <div className="blob b1"/><div className="blob b2"/><div className="grid"/>
        <div className="card">
          <div className="brand"><div className="dot">M</div><span className="brand-name">MyProduct</span></div>
          <h1>Create account</h1>
          <p className="sub">Join us — it only takes a minute.</p>
          {error && <div className="err"><span>⚠</span>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Full Name</label>
              <input type="text" name="name" placeholder="Juan dela Cruz"
                value={form.name} onChange={handleChange} required autoComplete="name"/>
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" name="email" placeholder="you@example.com"
                value={form.email} onChange={handleChange} required autoComplete="email"/>
            </div>
            <div className="row">
              <div className="field">
                <label>Password</label>
                <input type="password" name="password" placeholder="••••••••"
                  value={form.password} onChange={handleChange} required autoComplete="new-password"/>
                <div className="bar">
                  <div className="fill" style={{
                    width:form.password.length===0?"0%":form.password.length<6?"25%":form.password.length<10?"60%":"100%",
                    background:form.password.length===0?"transparent":form.password.length<6?"#f43f5e":form.password.length<10?"#f59e0b":"#10b981"
                  }}/>
                </div>
              </div>
              <div className="field">
                <label>Confirm</label>
                <input type="password" name="confirm" placeholder="••••••••"
                  value={form.confirm} onChange={handleChange} required autoComplete="new-password"
                  className={form.confirm.length>0?(form.confirm===form.password?"ok":"no"):""}/>
              </div>
            </div>
            <button className="btn" disabled={loading}>
              {loading && <span className="spin"/>}{loading ? "Creating…" : "Create Account"}
            </button>
          </form>
          <div className="div-row"><div className="div-line"/><span>Already registered?</span><div className="div-line"/></div>
          <p className="foot"><Link href="/login">Sign in instead →</Link></p>
        </div>
      </div>
    </>
  );
}
'@ | Set-Content -Path "app\register\page.tsx" -Encoding UTF8

Write-Host "Writing app/dashboard/page.tsx..." -ForegroundColor Cyan
@'
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiLogout, getStoredUser, type AuthUser } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { router.replace("/login"); } else { setUser(stored); }
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await apiLogout(); } catch {
      localStorage.removeItem("token"); localStorage.removeItem("user");
    }
    router.replace("/login");
  };

  if (!user) return null;

  const initials = user.name.split(" ").map((n:string) => n[0]).slice(0,2).join("").toUpperCase();
  const joined = new Date(user.created_at).toLocaleDateString("en-PH", { year:"numeric", month:"long", day:"numeric" });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#050507}
        .root{min-height:100vh;background:#050507;font-family:'DM Sans',sans-serif;position:relative;overflow:hidden;display:flex;flex-direction:column}
        .blob{position:absolute;border-radius:50%;filter:blur(100px);pointer-events:none}
        .b1{width:600px;height:600px;opacity:.2;background:radial-gradient(circle,#6c3bff 0%,transparent 70%);top:-200px;right:-100px;animation:d1 18s ease-in-out infinite alternate}
        .b2{width:500px;height:500px;opacity:.18;background:radial-gradient(circle,#0ea5e9 0%,transparent 70%);bottom:-150px;left:-100px;animation:d2 14s ease-in-out infinite alternate}
        @keyframes d1{from{transform:translate(0,0)}to{transform:translate(-40px,40px)}}
        @keyframes d2{from{transform:translate(0,0)}to{transform:translate(30px,-30px)}}
        .grid{position:absolute;inset:0;pointer-events:none;
          background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);
          background-size:40px 40px}
        nav{position:relative;z-index:20;display:flex;align-items:center;justify-content:space-between;
          padding:20px 40px;border-bottom:1px solid rgba(255,255,255,.07);background:rgba(5,5,7,.6);backdrop-filter:blur(16px)}
        .nav-brand{display:flex;align-items:center;gap:10px}
        .nav-dot{width:30px;height:30px;background:linear-gradient(135deg,#7c4dff,#0ea5e9);border-radius:8px;
          display:grid;place-items:center;font-size:14px;font-weight:800;color:#fff;font-family:'Syne',sans-serif}
        .nav-name{font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:rgba(255,255,255,.8);letter-spacing:-.3px}
        .logout-btn{padding:8px 18px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
          border-radius:8px;color:rgba(255,255,255,.6);font-size:13px;font-family:'DM Sans',sans-serif;
          cursor:pointer;transition:background .2s,color .2s}
        .logout-btn:hover{background:rgba(244,63,94,.15);border-color:rgba(244,63,94,.3);color:#fb7185}
        .logout-btn:disabled{opacity:.5;cursor:not-allowed}
        .content{position:relative;z-index:10;flex:1;max-width:900px;width:100%;margin:0 auto;padding:48px 24px}
        .welcome{margin-bottom:40px;animation:up .5s cubic-bezier(.16,1,.3,1) both}
        @keyframes up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .welcome-label{font-size:12px;font-weight:500;letter-spacing:.8px;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:8px}
        .welcome h1{font-family:'Syne',sans-serif;font-size:36px;font-weight:800;color:#fff;letter-spacing:-.8px;line-height:1.1}
        .welcome h1 span{background:linear-gradient(90deg,#a78bfa,#38bdf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .welcome p{margin-top:10px;font-size:15px;color:rgba(255,255,255,.4);line-height:1.6}
        .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin-bottom:32px}
        .card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:24px;animation:up .5s cubic-bezier(.16,1,.3,1) both}
        .card:nth-child(2){animation-delay:.08s}
        .card:nth-child(3){animation-delay:.16s}
        .card-icon{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;font-size:18px;margin-bottom:16px}
        .icon-purple{background:rgba(124,77,255,.15);border:1px solid rgba(124,77,255,.2)}
        .icon-blue{background:rgba(14,165,233,.15);border:1px solid rgba(14,165,233,.2)}
        .icon-green{background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.2)}
        .card-label{font-size:11px;font-weight:500;letter-spacing:.6px;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:6px}
        .card-value{font-family:'Syne',sans-serif;font-size:20px;font-weight:700;color:#fff;letter-spacing:-.3px;word-break:break-all}
        .profile{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:28px;
          display:flex;align-items:center;gap:20px;animation:up .5s .24s cubic-bezier(.16,1,.3,1) both}
        .avatar{width:64px;height:64px;border-radius:16px;flex-shrink:0;background:linear-gradient(135deg,#7c4dff,#0ea5e9);
          display:grid;place-items:center;font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#fff}
        .profile-info{flex:1;min-width:0}
        .profile-name{font-family:'Syne',sans-serif;font-size:20px;font-weight:700;color:#fff;letter-spacing:-.3px;margin-bottom:4px}
        .profile-email{font-size:14px;color:rgba(255,255,255,.4)}
        .badge{display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:4px 10px;border-radius:20px;
          background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.25);font-size:11px;font-weight:500;color:#34d399;letter-spacing:.4px}
        .badge::before{content:'';width:6px;height:6px;background:#34d399;border-radius:50%;animation:pulse 2s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      `}</style>
      <div className="root">
        <div className="blob b1"/><div className="blob b2"/><div className="grid"/>
        <nav>
          <div className="nav-brand"><div className="nav-dot">M</div><span className="nav-name">MyProduct</span></div>
          <button className="logout-btn" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? "Logging out…" : "Log Out"}
          </button>
        </nav>
        <div className="content">
          <div className="welcome">
            <p className="welcome-label">Dashboard</p>
            <h1>Hello, <span>{user.name.split(" ")[0]}</span> 👋</h1>
            <p>You are successfully logged in. Here&apos;s your account overview.</p>
          </div>
          <div className="cards">
            <div className="card"><div className="card-icon icon-purple">👤</div><p className="card-label">Full Name</p><p className="card-value">{user.name}</p></div>
            <div className="card"><div className="card-icon icon-blue">✉️</div><p className="card-label">Email</p><p className="card-value" style={{fontSize:"15px"}}>{user.email}</p></div>
            <div className="card"><div className="card-icon icon-green">📅</div><p className="card-label">Member Since</p><p className="card-value" style={{fontSize:"16px"}}>{joined}</p></div>
          </div>
          <div className="profile">
            <div className="avatar">{initials}</div>
            <div className="profile-info">
              <p className="profile-name">{user.name}</p>
              <p className="profile-email">{user.email}</p>
              <span className="badge">Active Account</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
'@ | Set-Content -Path "app\dashboard\page.tsx" -Encoding UTF8

Write-Host ""
Write-Host "✅ All files written successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Now run: npm run dev" -ForegroundColor Yellow