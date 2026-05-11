"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const stored = localStorage.getItem("user");
    if (!token || !stored) {
      router.replace("/login");
      return;
    }
    try {
      setUser(JSON.parse(stored) as User);
    } catch {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (!ready || !user) {
    return (
      <div style={{
        minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        background:"linear-gradient(135deg,#f0f4ff,#faf5ff,#f0f9ff)", fontFamily:"Inter,sans-serif"
      }}>
        <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
          <div style={{
            width:40, height:40, borderRadius:"50%",
            border:"3px solid #e2e8f0", borderTopColor:"#7c3aed",
            animation:"sp .7s linear infinite"
          }}/>
          <p style={{ color:"#94a3b8", fontSize:14, fontFamily:"Inter,sans-serif" }}>Loading…</p>
        </div>
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const memberSince = new Date(user.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric"
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f5f7ff;font-family:'Inter',sans-serif}
        .root{min-height:100vh;background:linear-gradient(135deg,#f0f4ff 0%,#faf5ff 50%,#f0f9ff 100%)}
        .nav{background:#fff;border-bottom:1px solid #e2e8f0;padding:0 32px;height:64px;
          display:flex;align-items:center;justify-content:space-between;
          box-shadow:0 1px 8px rgba(0,0,0,.04);position:sticky;top:0;z-index:50}
        .nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
        .logo-text{font-size:17px;font-weight:700;color:#0f172a;letter-spacing:-.3px}
        .nav-right{display:flex;align-items:center;gap:16px}
        .nav-name{font-size:14px;color:#64748b;font-weight:500}
        .nav-about{font-size:13px;font-weight:500;color:#64748b;text-decoration:none;
          padding:6px 12px;border-radius:8px;transition:all .2s}
        .nav-about:hover{color:#7c3aed;background:rgba(124,58,237,.06)}
        .logout-btn{padding:8px 16px;background:linear-gradient(135deg,#7c3aed,#2563eb);
          border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:600;
          font-family:'Inter',sans-serif;cursor:pointer;transition:all .2s}
        .logout-btn:hover{opacity:.85;transform:translateY(-1px)}
        .main{max-width:960px;margin:0 auto;padding:40px 24px}
        .banner{background:linear-gradient(145deg,#7c3aed 0%,#4f46e5 50%,#2563eb 100%);
          border-radius:20px;padding:36px 40px;display:flex;align-items:center;
          justify-content:space-between;margin-bottom:32px;position:relative;overflow:hidden}
        .banner::before{content:'';position:absolute;width:260px;height:260px;border-radius:50%;
          background:rgba(255,255,255,.07);top:-80px;right:-60px}
        .banner-left{position:relative;z-index:1}
        .banner-tag{font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;
          color:rgba(255,255,255,.6);margin-bottom:8px}
        .banner-title{font-size:28px;font-weight:700;color:#fff;letter-spacing:-.5px;margin-bottom:6px}
        .banner-sub{font-size:14px;color:rgba(255,255,255,.7)}
        .avatar{width:64px;height:64px;border-radius:50%;
          background:rgba(255,255,255,.2);border:2px solid rgba(255,255,255,.4);
          display:flex;align-items:center;justify-content:center;
          font-size:22px;font-weight:700;color:#fff;flex-shrink:0;position:relative;z-index:1}
        .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}
        .card{background:#fff;border-radius:16px;padding:24px;
          box-shadow:0 2px 12px rgba(0,0,0,.05);border:1px solid #f1f5f9;
          transition:all .2s}
        .card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.08)}
        .card-label{font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;
          color:#94a3b8;margin-bottom:8px}
        .card-value{font-size:16px;font-weight:600;color:#0f172a;word-break:break-all}
        .card-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;
          justify-content:center;font-size:18px;margin-bottom:14px}
        .icon-blue{background:#eff6ff}
        .icon-purple{background:#f5f3ff}
        .icon-green{background:#f0fdf4}
        .badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;
          border-radius:20px;font-size:12px;font-weight:600}
        .badge-green{background:#dcfce7;color:#16a34a}
        .badge-gray{background:#f1f5f9;color:#64748b}
        .dot-live{width:6px;height:6px;border-radius:50%;background:#16a34a;
          animation:pulse 1.5s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @media(max-width:600px){
          .nav{padding:0 16px}
          .main{padding:24px 16px}
          .banner{padding:24px 20px;flex-direction:column;gap:20px;align-items:flex-start}
          .banner-title{font-size:22px}
        }
      `}</style>

      <div className="root">
        <nav className="nav">
          <Link href="/dashboard" className="nav-logo">
            <svg width="30" height="30" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="68" width="184" height="176" rx="24" fill="none" stroke="#7c3aed" strokeWidth="14"/>
              <path d="M56 70 Q56 18 100 18 Q144 18 144 70" fill="none" stroke="#7c3aed" strokeWidth="14" strokeLinecap="round"/>
              <circle cx="68" cy="70" r="7" fill="#7c3aed"/>
              <circle cx="132" cy="70" r="7" fill="#7c3aed"/>
              <path d="M24 192 Q36 150 70 145 Q104 140 110 170 Q116 198 150 192 Q170 187 176 162"
                fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M161 145 L176 162 L157 175" fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="logo-text">Shopply</span>
          </Link>
          <div className="nav-right">
            <span className="nav-name">Hi, {user.name.split(" ")[0]} 👋</span>
            <Link href="/about" className="nav-about">About</Link>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </nav>

        <main className="main">
          <div className="banner">
            <div className="banner-left">
              <p className="banner-tag">Dashboard</p>
              <h1 className="banner-title">Welcome back, {user.name.split(" ")[0]}!</h1>
              <p className="banner-sub">You are successfully logged in to Shopply.</p>
            </div>
            <div className="avatar">{initials}</div>
          </div>

          <div className="cards">
            <div className="card">
              <div className="card-icon icon-purple">👤</div>
              <div className="card-label">Full Name</div>
              <div className="card-value">{user.name}</div>
            </div>
            <div className="card">
              <div className="card-icon icon-blue">✉️</div>
              <div className="card-label">Email Address</div>
              <div className="card-value">{user.email}</div>
            </div>
            <div className="card">
              <div className="card-icon icon-green">🆔</div>
              <div className="card-label">User ID</div>
              <div className="card-value">#{user.id}</div>
            </div>
            <div className="card">
              <div className="card-icon icon-blue">✅</div>
              <div className="card-label">Email Verified</div>
              <div className="card-value">
                {user.email_verified_at
                  ? <span className="badge badge-green"><span className="dot-live"/>Verified</span>
                  : <span className="badge badge-gray">Not Verified</span>}
              </div>
            </div>
            <div className="card">
              <div className="card-icon icon-purple">📅</div>
              <div className="card-label">Member Since</div>
              <div className="card-value">{memberSince}</div>
            </div>
            <div className="card">
              <div className="card-icon icon-green">🟢</div>
              <div className="card-label">Status</div>
              <div className="card-value">
                <span className="badge badge-green"><span className="dot-live"/>Active</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}