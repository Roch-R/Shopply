"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { policies } from "../../lib/legalData";

export default function LegalPage() {
  const [activePolicy, setActivePolicy] = useState<keyof typeof policies>('terms');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activePolicy]);
  return (
    <>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#fff;font-family:'Inter',sans-serif;}
        .page{min-height:100vh;}
        .nav{position:sticky;top:0;z-index:100;padding:0 48px;height:68px;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.9);backdrop-filter:blur(20px);border-bottom:1px solid rgba(124,58,237,.08);box-shadow:0 1px 20px rgba(0,0,0,.02)}
        .nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
        .nav-logo-text{font-size:17px;font-weight:700;color:#0f172a;letter-spacing:-.3px}
        .nav-right{display:flex;align-items:center;gap:24px}
        .nav-link{font-size:13px;font-weight:500;color:#64748b;text-decoration:none;padding:6px 12px;border-radius:8px;transition:all .2s}
        .nav-link:hover{color:#7c3aed;background:rgba(124,58,237,.06)}
        
        .layout{display:flex;max-width:1200px;margin:0 auto;padding:60px 48px;gap:64px;align-items:flex-start;}
        .sidebar{width:240px;flex-shrink:0;position:sticky;top:100px;max-height:calc(100vh - 140px);overflow-y:auto;padding-right:8px;}
        .sidebar::-webkit-scrollbar{width:4px;}
        .sidebar::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px;}
        .sidebar h3{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:16px;}
        .sidebar-item{display:block;width:100%;text-align:left;background:none;border:none;padding:10px 16px;font-size:14px;font-weight:500;color:#64748b;border-radius:8px;cursor:pointer;transition:all .2s;margin-bottom:4px;}
        .sidebar-item:hover{background:#f8fafc;color:#0f172a;}
        .sidebar-item.active{background:rgba(124,58,237,.1);color:#7c3aed;font-weight:600;}
        
        .content-area{flex:1;max-width:720px;}
        .content-area h1{font-family:'Playfair Display',serif;font-size:48px;font-weight:800;color:#0f172a;margin-bottom:48px;letter-spacing:-1px}
        
        .legal-content{font-size:16px;line-height:1.8;color:#475569;}
        .legal-content h2{font-size:20px;color:#0f172a;margin:40px 0 16px;font-weight:700;}
        .legal-content p{margin-bottom:20px;}
      `}</style>
      <div className="page">
        <nav className="nav">
          <Link href="/dashboard" className="nav-logo">
            <svg width="32" height="32" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="68" width="184" height="176" rx="24" fill="none" stroke="url(#ng)" strokeWidth="14" />
              <path d="M56 70 Q56 18 100 18 Q144 18 144 70" fill="none" stroke="url(#ng)" strokeWidth="14" strokeLinecap="round" />
              <circle cx="68" cy="70" r="7" fill="#7c3aed" />
              <circle cx="132" cy="70" r="7" fill="#7c3aed" />
              <path d="M24 192 Q36 150 70 145 Q104 140 110 170 Q116 198 150 192 Q170 187 176 162" fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M161 145 L176 162 L157 175" fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
              <defs><linearGradient id="ng" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#2563eb" />
              </linearGradient></defs>
            </svg>
            <span className="nav-logo-text">Shopply</span>
          </Link>
          <div className="nav-right">
            <Link href="/about" className="nav-link">About</Link>
            <Link href="/shop" className="nav-link">Marketplace</Link>
            <Link href="/dashboard" className="nav-link">Dashboard</Link>
          </div>
        </nav>
        
        <div className="layout">
          <div className="sidebar">
            <h3>Legal Documents</h3>
            {Object.entries(policies).map(([key, policy]) => (
              <button 
                key={key} 
                className={`sidebar-item ${activePolicy === key ? 'active' : ''}`} 
                onClick={() => setActivePolicy(key as keyof typeof policies)}
              >
                {policy.title}
              </button>
            ))}
          </div>
          
          <div className="content-area">
            <h1>{policies[activePolicy].title}</h1>
            <div className="legal-content" dangerouslySetInnerHTML={{ __html: policies[activePolicy].content }} />
          </div>
        </div>
      </div>
    </>
  );
}
