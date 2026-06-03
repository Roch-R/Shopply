"use client";
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/Skeleton";
import { getApiCache } from "@/lib/apiCache";

function getAuth() {
  if (typeof window === "undefined") return { token: null, user: null };
  const token = localStorage.getItem("token");
  let user: { name: string; email: string } | null = null;
  try { user = JSON.parse(localStorage.getItem("user") ?? "null"); } catch { }
  return { token, user };
}

export default function AboutPage() {
  const router = useRouter();
  const pushed = useRef(false);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(function checkAuth() {
    const { token, user: u } = getAuth();
    if (!token && !pushed.current) {
      pushed.current = true;
      router.replace("/login");
    } else {
      setUser(u);
      setReady(true);
    }
  }, []); // intentional empty deps — runs once on mount

  function handleLogout() {
    const token = localStorage.getItem("token");
    if (token) {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      fetch(`${API}/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }).catch(err => console.error("Logout failed:", err));
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    getApiCache().invalidateAll();
    router.push("/login");
  }

  if (!ready) return (
    <div style={{ minHeight: "100vh", background: "#f5f7ff", padding: "40px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 32 }}>
        <Skeleton style={{ width: 240, height: "calc(100vh - 80px)", borderRadius: 24 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
          <Skeleton style={{ width: "100%", height: 140, borderRadius: 24 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            <Skeleton style={{ height: 120, borderRadius: 16 }} />
            <Skeleton style={{ height: 120, borderRadius: 16 }} />
            <Skeleton style={{ height: 120, borderRadius: 16 }} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f5f7ff}
        .page{min-height:100vh;background:linear-gradient(160deg,#f0f4ff 0%,#faf5ff 45%,#f0f9ff 100%);
          font-family:'Inter',sans-serif;position:relative;overflow-x:hidden}
        .blob{position:fixed;border-radius:50%;pointer-events:none;z-index:0}
        .b1{width:600px;height:600px;background:radial-gradient(circle,rgba(124,58,237,.08) 0%,transparent 70%);top:-200px;right:-150px}
        .b2{width:500px;height:500px;background:radial-gradient(circle,rgba(37,99,235,.07) 0%,transparent 70%);bottom:-150px;left:-120px}
        .b3{width:300px;height:300px;background:radial-gradient(circle,rgba(16,185,129,.05) 0%,transparent 70%);top:40%;left:40%}
        .nav{position:sticky;top:0;z-index:100;padding:0 48px;height:68px;
          display:flex;align-items:center;justify-content:space-between;
          background:rgba(255,255,255,.75);backdrop-filter:blur(20px);
          border-bottom:1px solid rgba(124,58,237,.08);box-shadow:0 1px 20px rgba(0,0,0,.04)}
        .nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
        .nav-logo-text{font-size:17px;font-weight:700;color:#0f172a;letter-spacing:-.3px}
        .nav-right{display:flex;align-items:center;gap:24px}
        .nav-user{font-size:13px;color:#64748b}
        .nav-user strong{color:#0f172a;font-weight:600}
        .nav-btn{padding:8px 20px;background:linear-gradient(135deg,#7c3aed,#2563eb);
          border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:600;
          font-family:'Inter',sans-serif;cursor:pointer;transition:all .2s;
          box-shadow:0 2px 10px rgba(124,58,237,.25)}
        .nav-btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(124,58,237,.35)}
        .nav-link{font-size:13px;font-weight:500;color:#64748b;text-decoration:none;
          padding:6px 12px;border-radius:8px;transition:all .2s}
        .nav-link:hover{color:#7c3aed;background:rgba(124,58,237,.06)}
        .hero{position:relative;z-index:1;padding:100px 48px 80px;text-align:center;max-width:860px;margin:0 auto}
        .hero-badge{display:inline-flex;align-items:center;gap:8px;
          background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.15);
          border-radius:100px;padding:6px 16px 6px 10px;margin-bottom:28px;animation:fadeUp .6s ease both}
        .hero-badge-dot{width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#2563eb)}
        .hero-badge span{font-size:12px;font-weight:600;color:#7c3aed;letter-spacing:.3px}
        .hero h1{font-family:'Playfair Display',serif;font-size:clamp(42px,6vw,72px);font-weight:800;
          color:#0f172a;letter-spacing:-2px;line-height:1.05;margin-bottom:22px;animation:fadeUp .6s .1s ease both}
        .hero h1 em{font-style:normal;background:linear-gradient(135deg,#7c3aed,#4f46e5,#2563eb);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .hero p{font-size:18px;color:#64748b;line-height:1.75;max-width:600px;margin:0 auto 40px;animation:fadeUp .6s .2s ease both}
        .hero-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;animation:fadeUp .6s .3s ease both}
        .cta-primary{padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#2563eb);
          border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:600;
          font-family:'Inter',sans-serif;cursor:pointer;text-decoration:none;
          box-shadow:0 6px 24px rgba(124,58,237,.3);transition:all .25s;display:inline-flex;align-items:center;gap:8px}
        .cta-primary:hover{transform:translateY(-2px);box-shadow:0 10px 32px rgba(124,58,237,.4)}
        .cta-secondary{padding:14px 32px;background:#fff;border:1.5px solid #e2e8f0;
          border-radius:14px;color:#0f172a;font-size:15px;font-weight:600;
          font-family:'Inter',sans-serif;cursor:pointer;text-decoration:none;
          box-shadow:0 2px 10px rgba(0,0,0,.05);transition:all .25s;display:inline-flex;align-items:center;gap:8px}
        .cta-secondary:hover{border-color:#c4b5fd;transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,0,0,.08)}
        .stats{position:relative;z-index:1;max-width:860px;margin:0 auto 80px;
          display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:0 48px;animation:fadeUp .6s .35s ease both}
        .stat-card{background:#fff;border:1px solid #f1f5f9;border-radius:20px;padding:28px 24px;text-align:center;
          box-shadow:0 4px 16px rgba(0,0,0,.04);transition:all .25s}
        .stat-card:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(0,0,0,.08);border-color:#e0d7ff}
        .stat-num{font-family:'Playfair Display',serif;font-size:40px;font-weight:800;
          background:linear-gradient(135deg,#7c3aed,#2563eb);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .stat-label{font-size:13px;color:#94a3b8;font-weight:500;margin-top:4px}
        .section{position:relative;z-index:1;max-width:960px;margin:0 auto 80px;padding:0 48px}
        .section-head{text-align:center;margin-bottom:48px}
        .section-tag{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#7c3aed;margin-bottom:12px}
        .section-title{font-family:'Playfair Display',serif;font-size:clamp(28px,4vw,40px);
          font-weight:800;color:#0f172a;letter-spacing:-1px;line-height:1.2}
        .features{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        .feat{background:#fff;border:1px solid #f1f5f9;border-radius:20px;padding:32px 28px;
          transition:all .25s;box-shadow:0 2px 12px rgba(0,0,0,.04)}
        .feat:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,.08);border-color:#ddd6fe}
        .feat-icon{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;
          justify-content:center;margin-bottom:20px;font-size:22px}
        .feat h3{font-size:16px;font-weight:700;color:#0f172a;margin-bottom:8px;letter-spacing:-.2px}
        .feat p{font-size:14px;color:#64748b;line-height:1.7}
        .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:0;position:relative}
        .steps::before{content:'';position:absolute;top:28px;left:calc(16.66% + 16px);
          right:calc(16.66% + 16px);height:2px;
          background:linear-gradient(90deg,#7c3aed,#4f46e5,#2563eb);border-radius:1px}
        .step{text-align:center;padding:0 20px}
        .step-num{width:56px;height:56px;border-radius:50%;
          background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;font-size:18px;font-weight:700;
          display:flex;align-items:center;justify-content:center;margin:0 auto 20px;
          position:relative;z-index:1;box-shadow:0 6px 20px rgba(124,58,237,.3)}
        .step h3{font-size:15px;font-weight:700;color:#0f172a;margin-bottom:8px}
        .step p{font-size:13px;color:#94a3b8;line-height:1.6}
        .team-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        .team-card{background:#fff;border:1px solid #f1f5f9;border-radius:20px;
          padding:32px 24px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.04);transition:all .25s}
        .team-card:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,.08)}
        .avatar{width:68px;height:68px;border-radius:50%;margin:0 auto 16px;
          display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#fff}
        .team-card h4{font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px}
        .team-card .role{font-size:12px;font-weight:600;color:#7c3aed;margin-bottom:8px}
        .team-card p{font-size:13px;color:#94a3b8;line-height:1.6}
        .cta-banner{position:relative;z-index:1;max-width:860px;margin:0 auto 80px;padding:0 48px}
        .cta-inner{background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 50%,#2563eb 100%);
          border-radius:28px;padding:56px 48px;text-align:center;overflow:hidden;position:relative}
        .cta-inner::before{content:'';position:absolute;width:350px;height:350px;border-radius:50%;
          background:rgba(255,255,255,.07);top:-120px;right:-80px}
        .cta-inner::after{content:'';position:absolute;width:250px;height:250px;border-radius:50%;
          background:rgba(255,255,255,.05);bottom:-80px;left:-60px}
        .cta-inner h2{font-family:'Playfair Display',serif;font-size:36px;font-weight:800;
          color:#fff;letter-spacing:-1px;margin-bottom:14px;position:relative;z-index:1}
        .cta-inner p{font-size:15px;color:rgba(255,255,255,.75);margin-bottom:32px;position:relative;z-index:1}
        .cta-white{padding:14px 36px;background:#fff;border:none;border-radius:14px;
          color:#7c3aed;font-size:15px;font-weight:700;font-family:'Inter',sans-serif;
          cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:8px;
          box-shadow:0 6px 24px rgba(0,0,0,.15);transition:all .25s;position:relative;z-index:1}
        .cta-white:hover{transform:translateY(-2px);box-shadow:0 10px 32px rgba(0,0,0,.2)}
        .footer {position:relative;z-index:1;padding:80px 48px 40px;border-top:1px solid #e2e8f0;margin-top:40px;background:#fff;}
        .footer-grid {display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px;max-width:1100px;margin:0 auto;margin-bottom:64px;}
        @media(max-width: 900px) { .footer-grid { grid-template-columns:1fr 1fr; gap:32px; } }
        @media(max-width: 500px) { .footer-grid { grid-template-columns:1fr; } }
        .f-col-logo {display:flex;flex-direction:column;gap:16px;}
        .f-col-title {font-size:15px;font-weight:700;color:#0f172a;margin-bottom:16px;}
        .f-col-links {display:flex;flex-direction:column;gap:12px;}
        .f-col-links a {color:#64748b;font-size:14px;text-decoration:none;transition:color .2s;font-weight:500;}
        .f-col-links a:hover {color:#7c3aed;}
        .f-logo {display:flex;align-items:center;gap:10px;text-decoration:none;}
        .f-logo-text {font-size:18px;font-weight:800;color:#0f172a;letter-spacing:-.5px;}
        .f-desc {font-size:14px;color:#64748b;line-height:1.6;max-width:280px;}
        .f-socials {display:flex;gap:12px;margin-top:8px;}
        .f-socials a {width:36px;height:36px;border-radius:50%;background:#f1f5f9;color:#475569;display:flex;align-items:center;justify-content:center;transition:all .2s;}
        .f-socials a:hover {background:#7c3aed;color:#fff;transform:translateY(-2px);}
        .footer-bottom {max-width:1100px;margin:0 auto;padding-top:32px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;}
        @media(max-width: 600px) { .footer-bottom { flex-direction:column; gap:16px; text-align:center; } }
        .footer-bottom p {font-size:13px;color:#94a3b8;}
        .footer-bottom-links {display:flex;gap:20px;}
        .footer-bottom-links a {font-size:13px;color:#94a3b8;text-decoration:none;transition:color .2s;}
        .footer-bottom-links a:hover {color:#7c3aed;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:700px){
          .nav{padding:0 20px}
          .hero,.stats,.section,.cta-banner{padding-left:20px;padding-right:20px}
          .hero{padding-top:60px}
          .features,.stats,.team-grid{grid-template-columns:1fr}
          .steps{grid-template-columns:1fr;gap:32px}
          .steps::before{display:none}
          .cta-inner{padding:36px 24px}
          .footer{padding:24px 20px}
        }
      `}</style>

      <div className="page">
        <div className="blob b1" /><div className="blob b2" /><div className="blob b3" />

        {/* NAV */}
        <nav className="nav">
          <Link href="/dashboard" className="nav-logo">
            <svg width="32" height="32" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="68" width="184" height="176" rx="24" fill="none" stroke="url(#ng)" strokeWidth="14" />
              <path d="M56 70 Q56 18 100 18 Q144 18 144 70" fill="none" stroke="url(#ng)" strokeWidth="14" strokeLinecap="round" />
              <circle cx="68" cy="70" r="7" fill="#7c3aed" />
              <circle cx="132" cy="70" r="7" fill="#7c3aed" />
              <path d="M24 192 Q36 150 70 145 Q104 140 110 170 Q116 198 150 192 Q170 187 176 162"
                fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M161 145 L176 162 L157 175" fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
              <defs><linearGradient id="ng" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#2563eb" />
              </linearGradient></defs>
            </svg>
            <span className="nav-logo-text">Shopply</span>
          </Link>
          <div className="nav-right">
            {user && <span className="nav-user">Hi, <strong>{user.name.split(" ")[0]}</strong> 👋</span>}
            <Link href="/shop" className="nav-link" style={{color:'#7c3aed',background:'rgba(124,58,237,.1)',fontWeight:600}}>🛍️ Shop</Link>
            <Link href="/dashboard" className="nav-link">Dashboard</Link>
            <button className="nav-btn" onClick={handleLogout}>Logout</button>
          </div>
        </nav>

        {/* HERO */}
        <div className="hero">
          <div className="hero-badge">
            <div className="hero-badge-dot" />
            <span>About Shopply</span>
          </div>
          <h1>The smarter way to<br /><em>run your shop.</em></h1>
          <p>Shopply is your all-in-one commerce workspace — built for modern merchants who want to move fast, sell smart, and grow without the complexity.</p>
          <div className="hero-cta">
            <Link href="/dashboard" className="cta-primary">Go to Dashboard →</Link>
            <a href="#features" className="cta-secondary">Explore Features</a>
          </div>
        </div>

        {/* Removed fake stats section */}

        {/* FEATURES */}
        <div className="section" id="features">
          <div className="section-head">
            <p className="section-tag">What We Offer</p>
            <h2 className="section-title">Everything you need,<br />nothing you don&apos;t.</h2>
          </div>
          <div className="features">
            {[
              { 
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>, 
                bg: "linear-gradient(135deg,#ede9fe,#ddd6fe)", 
                title: "Smart Inventory", 
                text: "Track stock levels in real-time with automated low-stock alerts and reorder suggestions." 
              },
              { 
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, 
                bg: "linear-gradient(135deg,#dbeafe,#bfdbfe)", 
                title: "Analytics & Insights", 
                text: "Beautiful dashboards that turn raw sales data into clear, actionable insights." 
              },
              { 
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, 
                bg: "linear-gradient(135deg,#d1fae5,#a7f3d0)", 
                title: "Secure Auth", 
                text: "Enterprise-grade authentication with Laravel Sanctum tokens. Data always safe." 
              },
              { 
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>, 
                bg: "linear-gradient(135deg,#fef3c7,#fde68a)", 
                title: "Lightning Fast", 
                text: "Built on Next.js with React Server Components. Pages load in milliseconds." 
              },
              { 
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>, 
                bg: "linear-gradient(135deg,#fce7f3,#fbcfe8)", 
                title: "Order Management", 
                text: "Manage every order from placement to delivery — statuses, notifications, history." 
              },
              { 
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, 
                bg: "linear-gradient(135deg,#e0e7ff,#c7d2fe)", 
                title: "Team Collaboration", 
                text: "Invite your team, assign roles, and work together without stepping on each other." 
              },
            ].map(f => (
              <div className="feat" key={f.title}>
                <div className="feat-icon" style={{ background: f.bg }}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div className="section">
          <div className="section-head">
            <p className="section-tag">How It Works</p>
            <h2 className="section-title">Up and running in minutes.</h2>
          </div>
          <div className="steps">
            {[
              { n: "1", title: "Create Your Account", text: "Sign up for free in under 60 seconds. No credit card required." },
              { n: "2", title: "Set Up Your Shop", text: "Add your products, configure pricing, and customize your storefront." },
              { n: "3", title: "Start Selling", text: "Go live and start receiving orders. Track everything from your dashboard." },
            ].map(s => (
              <div className="step" key={s.n}>
                <div className="step-num">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* TEAM */}
        <div className="section">
          <div className="section-head">
            <p className="section-tag">Meet The Team</p>
            <h2 className="section-title">Built by people who<br />love great products.</h2>
          </div>
          <div className="team-grid">
            {[
              { initials: "RR", bg: "linear-gradient(135deg,#7c3aed,#4f46e5)", name: "Rochell Reponte", role: "Founder & CEO", bio: "10 years in e-commerce. Passionate about making commerce accessible for every merchant." },
              { initials: "DA", bg: "linear-gradient(135deg,#2563eb,#0ea5e9)", name: "Denmar Aces", role: "Head of Product", bio: "Former Shopify engineer. Obsessed with removing friction from everyday workflows." },
              { initials: "DJ", bg: "linear-gradient(135deg,#059669,#10b981)", name: "Dayoja Joemil", role: "Lead Engineer", bio: "Full-stack wizard. Built Shopply's infrastructure to scale — Laravel, Next.js, and beyond." },
            ].map(t => (
              <div className="team-card" key={t.name}>
                <div className="avatar" style={{ background: t.bg }}>{t.initials}</div>
                <h4>{t.name}</h4>
                <p className="role">{t.role}</p>
                <p>{t.bio}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA BANNER */}
        <div className="cta-banner">
          <div className="cta-inner">
            <h2>Ready to grow your shop?</h2>
            <p>Everything you need to run a successful online store is waiting for you.</p>
            <Link href="/dashboard" className="cta-white">Open Dashboard →</Link>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="footer">
          <div className="footer-grid">
            <div className="f-col-logo">
              <Link href="/" className="f-logo">
                <svg width="24" height="24" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
                  <rect x="8" y="68" width="184" height="176" rx="24" fill="none" stroke="#7c3aed" strokeWidth="14" />
                  <path d="M56 70 Q56 18 100 18 Q144 18 144 70" fill="none" stroke="#7c3aed" strokeWidth="14" strokeLinecap="round" />
                  <circle cx="68" cy="70" r="7" fill="#7c3aed" />
                  <circle cx="132" cy="70" r="7" fill="#7c3aed" />
                  <path d="M24 192 Q36 150 70 145 Q104 140 110 170 Q116 198 150 192 Q170 187 176 162" fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M161 145 L176 162 L157 175" fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="f-logo-text">Shopply</span>
              </Link>
              <p className="f-desc">The modern commerce workspace. Built to help ambitious merchants launch, manage, and scale their businesses faster.</p>
              <div className="f-socials">
                <a href="#" aria-label="Twitter"><svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.436.118-.9.18-1.378.18-.335 0-.663-.032-.981-.091.604 1.942 2.425 3.359 4.566 3.398-2.063 1.616-4.665 2.302-7.158 2.01 2.166 1.388 4.739 2.197 7.494 2.197 9.141 0 14.316-7.736 13.992-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg></a>
                <a href="#" aria-label="GitHub"><svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg></a>
                <a href="#" aria-label="LinkedIn"><svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></a>
              </div>
            </div>
            
            <div>
              <h4 className="f-col-title">Product</h4>
              <div className="f-col-links">
                <Link href="/features">Features</Link>
                <Link href="/shop">Marketplace</Link>
                <Link href="/integrations">Integrations</Link>
                <Link href="/changelog">Changelog</Link>
              </div>
            </div>

            <div>
              <h4 className="f-col-title">Resources</h4>
              <div className="f-col-links">
                <Link href="/docs">Documentation</Link>
                <Link href="/guides">Merchant Guides</Link>
                <Link href="/api-reference">API Reference</Link>
                <Link href="/blog">Blog</Link>
              </div>
            </div>

            <div>
              <h4 className="f-col-title">Company</h4>
              <div className="f-col-links">
                <Link href="/about">About Us</Link>
                <Link href="/careers">Careers</Link>
                <Link href="/contact">Contact</Link>
                <Link href="/legal">Legal & Privacy</Link>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} Shopply Inc. All rights reserved.</p>
            <div className="footer-bottom-links">
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/cookies">Cookie Policy</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}