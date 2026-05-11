"use client";
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function getAuth() {
  if (typeof window === "undefined") return { token: null, user: null };
  const token = localStorage.getItem("token");
  let user: { name: string; email: string } | null = null;
  try { user = JSON.parse(localStorage.getItem("user") ?? "null"); } catch {}
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
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  }

  if (!ready) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
      background:"linear-gradient(135deg,#f0f4ff,#faf5ff,#f0f9ff)",fontFamily:"Inter,sans-serif"}}>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
        <div style={{width:40,height:40,borderRadius:"50%",border:"3px solid #e2e8f0",
          borderTopColor:"#7c3aed",animation:"sp .7s linear infinite"}}/>
        <p style={{color:"#94a3b8",fontSize:14,fontFamily:"Inter,sans-serif"}}>Loading…</p>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
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
        .footer{position:relative;z-index:1;padding:32px 48px;text-align:center;
          border-top:1px solid #f1f5f9;margin-top:40px}
        .footer p{font-size:13px;color:#cbd5e1}
        .footer a{color:#7c3aed;text-decoration:none;font-weight:500}
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
        <div className="blob b1"/><div className="blob b2"/><div className="blob b3"/>

        {/* NAV */}
        <nav className="nav">
          <Link href="/dashboard" className="nav-logo">
            <svg width="32" height="32" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="68" width="184" height="176" rx="24" fill="none" stroke="url(#ng)" strokeWidth="14"/>
              <path d="M56 70 Q56 18 100 18 Q144 18 144 70" fill="none" stroke="url(#ng)" strokeWidth="14" strokeLinecap="round"/>
              <circle cx="68" cy="70" r="7" fill="#7c3aed"/>
              <circle cx="132" cy="70" r="7" fill="#7c3aed"/>
              <path d="M24 192 Q36 150 70 145 Q104 140 110 170 Q116 198 150 192 Q170 187 176 162"
                fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M161 145 L176 162 L157 175" fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/>
              <defs><linearGradient id="ng" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#2563eb"/>
              </linearGradient></defs>
            </svg>
            <span className="nav-logo-text">Shopply</span>
          </Link>
          <div className="nav-right">
            {user && <span className="nav-user">Hi, <strong>{user.name.split(" ")[0]}</strong> 👋</span>}
            <Link href="/dashboard" className="nav-link">Dashboard</Link>
            <button className="nav-btn" onClick={handleLogout}>Sign Out</button>
          </div>
        </nav>

        {/* HERO */}
        <div className="hero">
          <div className="hero-badge">
            <div className="hero-badge-dot"/>
            <span>About Shopply</span>
          </div>
          <h1>The smarter way to<br/><em>run your shop.</em></h1>
          <p>Shopply is your all-in-one commerce workspace — built for modern merchants who want to move fast, sell smart, and grow without the complexity.</p>
          <div className="hero-cta">
            <Link href="/dashboard" className="cta-primary">Go to Dashboard →</Link>
            <a href="#features" className="cta-secondary">Explore Features</a>
          </div>
        </div>

        {/* STATS */}
        <div className="stats">
          {[
            {num:"10K+", label:"Merchants Trust Us"},
            {num:"99.9%", label:"Uptime SLA"},
            {num:"2M+", label:"Orders Processed"},
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* FEATURES */}
        <div className="section" id="features">
          <div className="section-head">
            <p className="section-tag">What We Offer</p>
            <h2 className="section-title">Everything you need,<br/>nothing you don&apos;t.</h2>
          </div>
          <div className="features">
            {[
              {icon:"🛍️",bg:"linear-gradient(135deg,#ede9fe,#ddd6fe)",title:"Smart Inventory",text:"Track stock levels in real-time with automated low-stock alerts and reorder suggestions."},
              {icon:"📊",bg:"linear-gradient(135deg,#dbeafe,#bfdbfe)",title:"Analytics & Insights",text:"Beautiful dashboards that turn raw sales data into clear, actionable insights."},
              {icon:"🔒",bg:"linear-gradient(135deg,#d1fae5,#a7f3d0)",title:"Secure Auth",text:"Enterprise-grade authentication with Laravel Sanctum tokens. Data always safe."},
              {icon:"⚡",bg:"linear-gradient(135deg,#fef3c7,#fde68a)",title:"Lightning Fast",text:"Built on Next.js with React Server Components. Pages load in milliseconds."},
              {icon:"📦",bg:"linear-gradient(135deg,#fce7f3,#fbcfe8)",title:"Order Management",text:"Manage every order from placement to delivery — statuses, notifications, history."},
              {icon:"🤝",bg:"linear-gradient(135deg,#e0e7ff,#c7d2fe)",title:"Team Collaboration",text:"Invite your team, assign roles, and work together without stepping on each other."},
            ].map(f => (
              <div className="feat" key={f.title}>
                <div className="feat-icon" style={{background:f.bg}}>{f.icon}</div>
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
              {n:"1",title:"Create Your Account",text:"Sign up for free in under 60 seconds. No credit card required."},
              {n:"2",title:"Set Up Your Shop",text:"Add your products, configure pricing, and customize your storefront."},
              {n:"3",title:"Start Selling",text:"Go live and start receiving orders. Track everything from your dashboard."},
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
            <h2 className="section-title">Built by people who<br/>love great products.</h2>
          </div>
          <div className="team-grid">
            {[
              {initials:"AJ",bg:"linear-gradient(135deg,#7c3aed,#4f46e5)",name:"Alex Johnson",role:"Founder & CEO",bio:"10 years in e-commerce. Passionate about making commerce accessible for every merchant."},
              {initials:"SM",bg:"linear-gradient(135deg,#2563eb,#0ea5e9)",name:"Sara Martinez",role:"Head of Product",bio:"Former Shopify engineer. Obsessed with removing friction from everyday workflows."},
              {initials:"KL",bg:"linear-gradient(135deg,#059669,#10b981)",name:"Kevin Li",role:"Lead Engineer",bio:"Full-stack wizard. Built Shopply's infrastructure to scale — Laravel, Next.js, and beyond."},
            ].map(t => (
              <div className="team-card" key={t.name}>
                <div className="avatar" style={{background:t.bg}}>{t.initials}</div>
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
          <p>© 2026 <a href="#">Shopply</a>. Built with ❤️ for modern merchants.</p>
        </footer>
      </div>
    </>
  );
}