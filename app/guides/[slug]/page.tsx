"use client";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { guidesData } from "../../../lib/guidesData";
import { useEffect, useState } from "react";

export default function GuidePage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : (Array.isArray(params?.slug) ? params.slug[0] : '');
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const guide = guidesData.find(g => g.slug === slug);

  if (mounted && !guide) {
    return (
      <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', background:'#f5f7ff', fontFamily:'sans-serif'}}>
        <h1 style={{fontSize:'48px', color:'#0f172a', marginBottom:'16px'}}>404</h1>
        <p style={{color:'#64748b', marginBottom:'24px'}}>Guide not found.</p>
        <Link href="/guides" style={{color:'#7c3aed', textDecoration:'none', fontWeight:600}}>← Back to Guides</Link>
      </div>
    );
  }

  if (!guide) {
    return null;
  }

  return (
    <>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#fff;font-family:'Inter',sans-serif;}
        .nav{position:sticky;top:0;z-index:100;padding:0 48px;height:68px;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.9);backdrop-filter:blur(20px);border-bottom:1px solid rgba(124,58,237,.08);box-shadow:0 1px 20px rgba(0,0,0,.02)}
        .nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
        .nav-logo-text{font-size:17px;font-weight:700;color:#0f172a;letter-spacing:-.3px}
        .nav-right{display:flex;align-items:center;gap:24px}
        .nav-link{font-size:13px;font-weight:500;color:#64748b;text-decoration:none;padding:6px 12px;border-radius:8px;transition:all .2s}
        .nav-link:hover{color:#7c3aed;background:rgba(124,58,237,.06)}
        
        .guide-container{max-width:760px;margin:0 auto;padding:80px 32px 120px;}
        .back-link{display:inline-flex;align-items:center;color:#64748b;text-decoration:none;font-weight:500;font-size:14px;margin-bottom:40px;transition:color .2s;}
        .back-link:hover{color:#7c3aed;}
        
        .guide-header{text-align:center;margin-bottom:64px;display:flex;flex-direction:column;align-items:center;}
        .icon-wrapper{width:96px;height:96px;border-radius:24px;background:linear-gradient(135deg, #f8fafc, #f1f5f9);display:flex;align-items:center;justify-content:center;margin-bottom:32px;border:1px solid #e2e8f0;box-shadow:0 10px 30px rgba(0,0,0,.03);}
        .icon-wrapper svg{width:48px;height:48px;}
        .guide-cat{color:#7c3aed;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;}
        .guide-title{font-family:'Playfair Display',serif;font-size:48px;font-weight:800;color:#0f172a;line-height:1.2;letter-spacing:-1px}
        
        .guide-content{font-size:18px;line-height:1.8;color:#334155;}
        .guide-content h2{font-size:28px;color:#0f172a;margin:56px 0 24px;font-weight:800;letter-spacing:-0.5px;}
        .guide-content h3{font-size:20px;color:#0f172a;margin:40px 0 16px;font-weight:700;}
        .guide-content p{margin-bottom:24px;}
        .guide-content ul, .guide-content ol{margin-bottom:24px;padding-left:24px;}
        .guide-content li{margin-bottom:12px;}
        .guide-content strong{color:#0f172a;font-weight:700;}
      `}</style>

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

      <div className="guide-container">
        <Link href="/guides" className="back-link">← Back to Guides</Link>
        
        <header className="guide-header">
          <div className="icon-wrapper">
            {guide.icon}
          </div>
          <div className="guide-cat">{guide.cat}</div>
          <h1 className="guide-title">{guide.title}</h1>
        </header>

        <div className="guide-content" dangerouslySetInnerHTML={{ __html: guide.content }} />
      </div>
    </>
  );
}
