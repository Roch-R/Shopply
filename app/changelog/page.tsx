
"use client";
import Link from "next/link";

export default function ChangelogPage() {
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
            <span style={{color:'#7c3aed',fontWeight:700,fontSize:'13px',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'16px',display:'block'}}>What's New</span>
            <h1>Product Updates</h1>
            <p className="subtitle">Keep track of the latest features, improvements, and bug fixes to Shopply.</p>
          </div>
          <div style={{maxWidth:'700px',margin:'0 auto'}}>
            {[
              {version: 'v2.4.0', date: 'May 20, 2026', title: 'The UI/UX Overhaul', items: ['Completely redesigned the shop experience', 'Added beautiful new category filters', 'Upgraded Legal pages with real policies']},
              {version: 'v2.3.0', date: 'May 10, 2026', title: 'Real-time Chat Integration', items: ['Buyers and sellers can now chat instantly', 'Added chat notification badges', 'Optimized image sharing in messages']},
              {version: 'v2.2.0', date: 'April 28, 2026', title: 'Advanced Vendor Dashboard', items: ['New beautiful graphs and metrics', 'Order management overhaul', 'Follower tracking functionality']},
            ].map((log, i) => (
              <div key={i} style={{display:'flex',gap:'24px',marginBottom:'48px',position:'relative'}}>
                <div style={{width:'150px',flexShrink:0,textAlign:'right'}}>
                  <span style={{display:'block',fontWeight:700,color:'#0f172a',fontSize:'16px'}}>{log.version}</span>
                  <span style={{fontSize:'13px',color:'#64748b'}}>{log.date}</span>
                </div>
                <div style={{width:'2px',background:'#e2e8f0',position:'relative'}}>
                  <div style={{position:'absolute',top:0,left:'-5px',width:'12px',height:'12px',borderRadius:'50%',background:'#7c3aed',border:'2px solid #fff'}}></div>
                </div>
                <div style={{paddingBottom:'32px'}}>
                  <h3 style={{fontSize:'20px',fontWeight:700,color:'#0f172a',marginBottom:'16px'}}>{log.title}</h3>
                  <ul style={{listStyle:'none',padding:0,margin:0}}>
                    {log.items.map((item, j) => (
                      <li key={j} style={{position:'relative',paddingLeft:'20px',marginBottom:'12px',color:'#475569',fontSize:'15px'}}>
                        <span style={{position:'absolute',left:0,top:'8px',width:'6px',height:'6px',borderRadius:'50%',background:'#cbd5e1'}}></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}
