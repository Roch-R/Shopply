
"use client";
import Link from "next/link";
import { useState } from "react";
import { docsData } from "../../lib/docsData";

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('introduction');
  const activeDoc = docsData[activeSection];
  return (
    <>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f5f7ff;font-family:'Inter',sans-serif;}
        .page{min-height:100vh;background:linear-gradient(160deg,#f0f4ff 0%,#faf5ff 45%,#f0f9ff 100%);position:relative;overflow-x:hidden;padding-bottom:100px}
        .nav{position:sticky;top:0;z-index:100;padding:0 48px;height:68px;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.75);backdrop-filter:blur(20px);border-bottom:1px solid rgba(124,58,237,.08);box-shadow:0 1px 20px rgba(0,0,0,.04)}
        .nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
        .nav-logo-text{font-size:17px;font-weight:700;color:#0f172a;letter-spacing:-.3px}
        .nav-right{display:flex;align-items:center;gap:24px}
        .nav-link{font-size:13px;font-weight:500;color:#64748b;text-decoration:none;padding:6px 12px;border-radius:8px;transition:all .2s}
        .nav-link:hover{color:#7c3aed;background:rgba(124,58,237,.06)}
        .container{max-width:1000px;margin:80px auto;padding:0 48px;}
        .header-section{text-align:center;margin-bottom:60px;}
        h1{font-family:'Playfair Display',serif;font-size:52px;font-weight:800;color:#0f172a;margin-bottom:20px;letter-spacing:-1px}
        .subtitle{font-size:18px;color:#64748b;line-height:1.6;max-width:600px;margin:0 auto;}
        
        /* Premium Cards */
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px;}
        .card{background:#fff;border-radius:20px;padding:32px;box-shadow:0 10px 40px rgba(0,0,0,.03);border:1px solid #f1f5f9;transition:all .3s;}
        .card:hover{transform:translateY(-5px);box-shadow:0 20px 40px rgba(124,58,237,.08);border-color:rgba(124,58,237,.2)}
        .card-icon{width:48px;height:48px;border-radius:12px;background:rgba(124,58,237,.1);color:#7c3aed;display:flex;align-items:center;justify-content:center;margin-bottom:20px;font-size:24px;}
        .card h3{font-size:18px;font-weight:700;color:#0f172a;margin-bottom:12px;}
        .card p{font-size:14px;color:#64748b;line-height:1.6;}
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
        
        <div className="container">

          <div className="header-section">
            <h1>Documentation</h1>
            <p className="subtitle">Everything you need to set up, manage, and customize your Shopply experience.</p>
          </div>
          <div style={{display:'flex',gap:'48px',alignItems:'flex-start'}}>
            <div style={{width:'250px',flexShrink:0,background:'#fff',padding:'24px',borderRadius:'16px',border:'1px solid #f1f5f9'}}>
              <h4 style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'16px'}}>Getting Started</h4>
              <ul style={{listStyle:'none',margin:0,padding:0,display:'flex',flexDirection:'column',gap:'12px'}}>
                <li onClick={() => setActiveSection('introduction')} style={{color:activeSection === 'introduction' ? '#7c3aed' : '#64748b',fontWeight:activeSection === 'introduction' ? 600 : 400,fontSize:'14px',cursor:'pointer',transition:'color .2s'}}>Introduction</li>
                <li onClick={() => setActiveSection('creating-an-account')} style={{color:activeSection === 'creating-an-account' ? '#7c3aed' : '#64748b',fontWeight:activeSection === 'creating-an-account' ? 600 : 400,fontSize:'14px',cursor:'pointer',transition:'color .2s'}}>Creating an Account</li>
                <li onClick={() => setActiveSection('setting-up-your-store')} style={{color:activeSection === 'setting-up-your-store' ? '#7c3aed' : '#64748b',fontWeight:activeSection === 'setting-up-your-store' ? 600 : 400,fontSize:'14px',cursor:'pointer',transition:'color .2s'}}>Setting up your Store</li>
              </ul>
              <h4 style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'16px',marginTop:'32px'}}>Store Management</h4>
              <ul style={{listStyle:'none',margin:0,padding:0,display:'flex',flexDirection:'column',gap:'12px'}}>
                <li onClick={() => setActiveSection('adding-products')} style={{color:activeSection === 'adding-products' ? '#7c3aed' : '#64748b',fontWeight:activeSection === 'adding-products' ? 600 : 400,fontSize:'14px',cursor:'pointer',transition:'color .2s'}}>Adding Products</li>
                <li onClick={() => setActiveSection('managing-orders')} style={{color:activeSection === 'managing-orders' ? '#7c3aed' : '#64748b',fontWeight:activeSection === 'managing-orders' ? 600 : 400,fontSize:'14px',cursor:'pointer',transition:'color .2s'}}>Managing Orders</li>
                <li onClick={() => setActiveSection('payments-and-payouts')} style={{color:activeSection === 'payments-and-payouts' ? '#7c3aed' : '#64748b',fontWeight:activeSection === 'payments-and-payouts' ? 600 : 400,fontSize:'14px',cursor:'pointer',transition:'color .2s'}}>Payments & Payouts</li>
              </ul>
            </div>
            <div style={{flex:1,background:'#fff',padding:'48px',borderRadius:'24px',border:'1px solid #f1f5f9',boxShadow:'0 10px 40px rgba(0,0,0,.03)'}}>
              <h2 style={{fontSize:'32px',fontWeight:800,color:'#0f172a',marginBottom:'24px'}}>{activeDoc.title}</h2>
              <div dangerouslySetInnerHTML={{ __html: activeDoc.content }} />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
