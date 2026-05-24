
"use client";
import Link from "next/link";

export default function ApiReferencePage() {
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
            <span style={{color:'#7c3aed',fontWeight:700,fontSize:'13px',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'16px',display:'block'}}>Developers</span>
            <h1>API Reference</h1>
            <p className="subtitle">Build custom integrations and automate your workflows with the Shopply REST API.</p>
          </div>
          <div style={{background:'#0f172a',borderRadius:'24px',overflow:'hidden',boxShadow:'0 20px 40px rgba(0,0,0,.2)',textAlign:'left'}}>
            <div style={{display:'flex',background:'#1e293b',padding:'16px 24px',borderBottom:'1px solid #334155',gap:'16px'}}>
              <div style={{display:'flex',gap:'8px'}}>
                <div style={{width:'12px',height:'12px',borderRadius:'50%',background:'#ef4444'}}></div>
                <div style={{width:'12px',height:'12px',borderRadius:'50%',background:'#f59e0b'}}></div>
                <div style={{width:'12px',height:'12px',borderRadius:'50%',background:'#10b981'}}></div>
              </div>
            </div>
            <div style={{padding:'40px',color:'#e2e8f0',fontFamily:'monospace',fontSize:'14px',lineHeight:1.8}}>
              <p style={{color:'#94a3b8'}}>// Authenticate with your Bearer token</p>
              <p><span style={{color:'#c084fc'}}>const</span> response = <span style={{color:'#c084fc'}}>await</span> <span style={{color:'#38bdf8'}}>fetch</span>(<span style={{color:'#a3e635'}}>'https://api.shopply.com/v1/products'</span>, {"{"} </p>
              <p style={{paddingLeft:'24px'}}>method: <span style={{color:'#a3e635'}}>'GET'</span>,</p>
              <p style={{paddingLeft:'24px'}}>headers: {"{"}</p>
              <p style={{paddingLeft:'48px'}}><span style={{color:'#a3e635'}}>'Authorization'</span>: <span style={{color:'#a3e635'}}>'Bearer sk_test_12345'</span></p>
              <p style={{paddingLeft:'24px'}}>{"}"}</p>
              <p>{"});"}</p>
              <br/>
              <p style={{color:'#94a3b8'}}>// Response</p>
              <p>{"{"}</p>
              <p style={{paddingLeft:'24px'}}>"status": <span style={{color:'#fcd34d'}}>200</span>,</p>
              <p style={{paddingLeft:'24px'}}>"data": [</p>
              <p style={{paddingLeft:'48px'}}>{"{"} "id": <span style={{color:'#a3e635'}}>"prod_987"</span>, "name": <span style={{color:'#a3e635'}}>"Premium Widget"</span>, "price": <span style={{color:'#fcd34d'}}>49.99</span> {"}"}</p>
              <p style={{paddingLeft:'24px'}}>]</p>
              <p>{"}"}</p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
