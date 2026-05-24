const fs = require('fs');
const path = require('path');

const b = String.fromCharCode(96); // backtick

const layoutTop = `
"use client";
import Link from "next/link";

export default function PAGE_NAME() {
  return (
    <>
      <style suppressHydrationWarning>{${b}
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
      ${b}}</style>
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
`;

const layoutBottom = `
        </div>
      </div>
    </>
  );
}
`;

const pages = {
  features: {
    name: 'FeaturesPage',
    content: `
          <div className="header-section">
            <span style={{color:'#7c3aed',fontWeight:700,fontSize:'13px',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'16px',display:'block'}}>Why Shopply?</span>
            <h1>Powerful Features for Modern Sellers</h1>
            <p className="subtitle">Everything you need to launch, manage, and scale your online business in one beautiful platform.</p>
          </div>
          <div className="grid">
            <div className="card">
              <div className="card-icon">🚀</div>
              <h3>Instant Storefront</h3>
              <p>Launch your fully functional, beautifully designed storefront in seconds. No coding required.</p>
            </div>
            <div className="card">
              <div className="card-icon">📊</div>
              <h3>Real-time Analytics</h3>
              <p>Track your sales, visitor traffic, and top-performing products with our beautiful dashboard.</p>
            </div>
            <div className="card">
              <div className="card-icon">💳</div>
              <h3>Secure Payments</h3>
              <p>Accept credit cards, PayPal, and crypto securely. Payouts are blazing fast and reliable.</p>
            </div>
            <div className="card">
              <div className="card-icon">📱</div>
              <h3>Mobile Optimized</h3>
              <p>Your shop looks perfect on any device, ensuring you never miss a sale from mobile users.</p>
            </div>
            <div className="card">
              <div className="card-icon">🌍</div>
              <h3>Global Reach</h3>
              <p>Sell to customers anywhere in the world with automatic currency conversion and localized experiences.</p>
            </div>
            <div className="card">
              <div className="card-icon">🔒</div>
              <h3>Enterprise Security</h3>
              <p>Your data and your customers' data is protected by bank-level encryption and security standards.</p>
            </div>
          </div>
`
  },
  integrations: {
    name: 'IntegrationsPage',
    content: `
          <div className="header-section">
            <span style={{color:'#7c3aed',fontWeight:700,fontSize:'13px',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'16px',display:'block'}}>Connect Your Tools</span>
            <h1>Seamless Integrations</h1>
            <p className="subtitle">Connect Shopply with the tools you already use to supercharge your workflow.</p>
          </div>
          <div className="grid">
            {[
              {name: 'Stripe', desc: 'Accept payments globally with zero friction.', color: '#635BFF'},
              {name: 'PayPal', desc: 'Allow customers to pay with their PayPal balances.', color: '#00457C'},
              {name: 'Mailchimp', desc: 'Sync your customers for automated email marketing.', color: '#FFE01B', textColor: '#241C15'},
              {name: 'Google Analytics', desc: 'Deep dive into your store traffic and conversions.', color: '#F4B400'},
              {name: 'Zapier', desc: 'Connect Shopply to 3000+ other apps automatically.', color: '#FF4A00'},
              {name: 'Slack', desc: 'Get real-time notifications for new orders.', color: '#4A154B'},
            ].map((app, i) => (
              <div key={i} className="card" style={{display:'flex',flexDirection:'column',alignItems:'flex-start'}}>
                <div style={{width:'48px',height:'48px',borderRadius:'12px',background:app.color,display:'flex',alignItems:'center',justifyContent:'center',color:app.textColor || '#fff',fontWeight:800,fontSize:'24px',marginBottom:'16px'}}>
                  {app.name[0]}
                </div>
                <h3 style={{marginBottom:'12px'}}>{app.name}</h3>
                <p style={{marginBottom:'24px',flex:1}}>{app.desc}</p>
                <button style={{padding:'8px 16px',background:'#f1f5f9',color:'#0f172a',border:'none',borderRadius:'8px',fontWeight:600,cursor:'pointer',width:'100%'}}>Connect</button>
              </div>
            ))}
          </div>
`
  },
  changelog: {
    name: 'ChangelogPage',
    content: `
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
`
  },
  docs: {
    name: 'DocsPage',
    content: `
          <div className="header-section">
            <h1>Documentation</h1>
            <p className="subtitle">Everything you need to set up, manage, and customize your Shopply experience.</p>
          </div>
          <div style={{display:'flex',gap:'48px',alignItems:'flex-start'}}>
            <div style={{width:'250px',flexShrink:0,background:'#fff',padding:'24px',borderRadius:'16px',border:'1px solid #f1f5f9'}}>
              <h4 style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'16px'}}>Getting Started</h4>
              <ul style={{listStyle:'none',margin:0,padding:0,display:'flex',flexDirection:'column',gap:'12px'}}>
                <li style={{color:'#7c3aed',fontWeight:600,fontSize:'14px',cursor:'pointer'}}>Introduction</li>
                <li style={{color:'#64748b',fontSize:'14px',cursor:'pointer'}}>Creating an Account</li>
                <li style={{color:'#64748b',fontSize:'14px',cursor:'pointer'}}>Setting up your Store</li>
              </ul>
              <h4 style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'16px',marginTop:'32px'}}>Store Management</h4>
              <ul style={{listStyle:'none',margin:0,padding:0,display:'flex',flexDirection:'column',gap:'12px'}}>
                <li style={{color:'#64748b',fontSize:'14px',cursor:'pointer'}}>Adding Products</li>
                <li style={{color:'#64748b',fontSize:'14px',cursor:'pointer'}}>Managing Orders</li>
                <li style={{color:'#64748b',fontSize:'14px',cursor:'pointer'}}>Payments & Payouts</li>
              </ul>
            </div>
            <div style={{flex:1,background:'#fff',padding:'48px',borderRadius:'24px',border:'1px solid #f1f5f9',boxShadow:'0 10px 40px rgba(0,0,0,.03)'}}>
              <h2 style={{fontSize:'32px',fontWeight:800,color:'#0f172a',marginBottom:'24px'}}>Introduction to Shopply</h2>
              <p style={{fontSize:'16px',color:'#475569',lineHeight:1.7,marginBottom:'24px'}}>
                Welcome to Shopply! We are thrilled to have you here. Shopply is the world's most beautiful and easy-to-use e-commerce platform designed specifically for modern creators and independent businesses.
              </p>
              <h3 style={{fontSize:'20px',fontWeight:700,color:'#0f172a',marginBottom:'16px',marginTop:'32px'}}>Quick Start</h3>
              <p style={{fontSize:'16px',color:'#475569',lineHeight:1.7,marginBottom:'24px'}}>
                To get started, head over to your Dashboard. From there, you can configure your store profile, upload your very first product, and start accepting payments instantly.
              </p>
              <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'12px',padding:'24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <h4 style={{fontWeight:600,color:'#0f172a',marginBottom:'4px'}}>Ready to dive in?</h4>
                  <p style={{fontSize:'14px',color:'#64748b'}}>Go to your dashboard and create your first product.</p>
                </div>
                <Link href="/dashboard" style={{padding:'10px 20px',background:'#7c3aed',color:'#fff',borderRadius:'8px',fontWeight:600,textDecoration:'none',fontSize:'14px'}}>Open Dashboard</Link>
              </div>
            </div>
          </div>
`
  },
  guides: {
    name: 'GuidesPage',
    content: `
          <div className="header-section">
            <span style={{color:'#7c3aed',fontWeight:700,fontSize:'13px',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'16px',display:'block'}}>Resources</span>
            <h1>Merchant Guides</h1>
            <p className="subtitle">Learn how to grow your business, increase sales, and master the art of e-commerce.</p>
          </div>
          <div className="grid">
            {[
              {title: '10 Tips to Increase Conversion Rates', img: '📈', cat: 'Growth'},
              {title: 'How to Take Beautiful Product Photos', img: '📸', cat: 'Marketing'},
              {title: 'Writing Descriptions That Actually Sell', img: '✍️', cat: 'Sales'},
              {title: 'Managing Inventory Like a Pro', img: '📦', cat: 'Operations'},
              {title: 'Building Customer Loyalty', img: '❤️', cat: 'Retention'},
              {title: 'Understanding Your Analytics Dashboard', img: '📊', cat: 'Data'},
            ].map((guide, i) => (
              <div key={i} className="card" style={{padding:0,overflow:'hidden',cursor:'pointer',border:'1px solid #f1f5f9'}}>
                <div style={{height:'160px',background:'linear-gradient(135deg, #f1f5f9, #e2e8f0)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'48px'}}>
                  {guide.img}
                </div>
                <div style={{padding:'24px'}}>
                  <span style={{color:'#7c3aed',fontSize:'12px',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px',display:'block'}}>{guide.cat}</span>
                  <h3 style={{fontSize:'18px',fontWeight:700,color:'#0f172a',marginBottom:'12px'}}>{guide.title}</h3>
                  <span style={{color:'#64748b',fontSize:'14px',fontWeight:500}}>Read Guide →</span>
                </div>
              </div>
            ))}
          </div>
`
  },
  'api-reference': {
    name: 'ApiReferencePage',
    content: `
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
              <p><span style={{color:'#c084fc'}}>const</span> response = <span style={{color:'#c084fc'}}>await</span> <span style={{color:'#38bdf8'}}>fetch</span>(<span style={{color:'#a3e635'}}>'https://api.shopply.com/v1/products'</span>, { </p>
              <p style={{paddingLeft:'24px'}}>method: <span style={{color:'#a3e635'}}>'GET'</span>,</p>
              <p style={{paddingLeft:'24px'}}>headers: {</p>
              <p style={{paddingLeft:'48px'}}><span style={{color:'#a3e635'}}>'Authorization'</span>: <span style={{color:'#a3e635'}}>'Bearer sk_test_12345'</span></p>
              <p style={{paddingLeft:'24px'}}>}</p>
              <p>});</p>
              <br/>
              <p style={{color:'#94a3b8'}}>// Response</p>
              <p>{</p>
              <p style={{paddingLeft:'24px'}}>"status": <span style={{color:'#fcd34d'}}>200</span>,</p>
              <p style={{paddingLeft:'24px'}}>"data": [</p>
              <p style={{paddingLeft:'48px'}}>{ "id": <span style={{color:'#a3e635'}}>"prod_987"</span>, "name": <span style={{color:'#a3e635'}}>"Premium Widget"</span>, "price": <span style={{color:'#fcd34d'}}>49.99</span> }</p>
              <p style={{paddingLeft:'24px'}}>]</p>
              <p>}</p>
            </div>
          </div>
`
  },
  blog: {
    name: 'BlogPage',
    content: `
          <div className="header-section">
            <span style={{color:'#7c3aed',fontWeight:700,fontSize:'13px',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'16px',display:'block'}}>Shopply News</span>
            <h1>The Shopply Blog</h1>
            <p className="subtitle">Insights, announcements, and stories from the Shopply team and community.</p>
          </div>
          <div className="grid" style={{textAlign:'left'}}>
            {[
              {title: 'Announcing Shopply v2.0: A New Era for E-commerce', date: 'May 23, 2026', img: 'linear-gradient(135deg, #7c3aed, #2563eb)'},
              {title: 'How Jane Doe Made $10k in Her First Month', date: 'May 15, 2026', img: 'linear-gradient(135deg, #f59e0b, #ef4444)'},
              {title: 'The Future of Social Commerce', date: 'May 02, 2026', img: 'linear-gradient(135deg, #10b981, #3b82f6)'},
            ].map((post, i) => (
              <div key={i} className="card" style={{padding:0,overflow:'hidden',cursor:'pointer'}}>
                <div style={{height:'200px',background:post.img}}></div>
                <div style={{padding:'24px'}}>
                  <span style={{color:'#94a3b8',fontSize:'13px',marginBottom:'8px',display:'block'}}>{post.date}</span>
                  <h3 style={{fontSize:'20px',fontWeight:800,color:'#0f172a',marginBottom:'12px',lineHeight:1.4}}>{post.title}</h3>
                  <p style={{color:'#64748b',fontSize:'15px',marginBottom:'20px'}}>Read the full story to learn more about what this means for your business on Shopply...</p>
                  <span style={{color:'#7c3aed',fontSize:'14px',fontWeight:600}}>Read Article →</span>
                </div>
              </div>
            ))}
          </div>
`
  },
  careers: {
    name: 'CareersPage',
    content: `
          <div className="header-section">
            <span style={{color:'#7c3aed',fontWeight:700,fontSize:'13px',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'16px',display:'block'}}>Join the team</span>
            <h1>Help us build the future of commerce</h1>
            <p className="subtitle">We're always looking for talented individuals who are passionate about empowering creators and independent businesses.</p>
          </div>
          <div style={{textAlign:'left'}}>
            <div style={{background:'#fff',borderRadius:'24px',border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:'40px',boxShadow:'0 10px 40px rgba(0,0,0,.03)'}}>
              <div style={{padding:'24px 32px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <h3 style={{margin:0,fontSize:'18px',color:'#0f172a'}}>Engineering</h3>
                <span style={{background:'#e0e7ff',color:'#4f46e5',padding:'4px 12px',borderRadius:'100px',fontSize:'12px',fontWeight:600}}>2 Openings</span>
              </div>
              <div style={{padding:'24px 32px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <h4 style={{fontSize:'16px',fontWeight:700,color:'#0f172a',marginBottom:'4px'}}>Senior Frontend Engineer</h4>
                  <p style={{fontSize:'14px',color:'#64748b',margin:0}}>Remote (US/Canada) • Full-time</p>
                </div>
                <button style={{padding:'8px 20px',background:'#0f172a',color:'#fff',borderRadius:'8px',fontWeight:600,border:'none',cursor:'pointer'}}>Apply</button>
              </div>
              <div style={{padding:'24px 32px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <h4 style={{fontSize:'16px',fontWeight:700,color:'#0f172a',marginBottom:'4px'}}>Backend Engineer (Node.js)</h4>
                  <p style={{fontSize:'14px',color:'#64748b',margin:0}}>San Francisco, CA • Full-time</p>
                </div>
                <button style={{padding:'8px 20px',background:'#0f172a',color:'#fff',borderRadius:'8px',fontWeight:600,border:'none',cursor:'pointer'}}>Apply</button>
              </div>
            </div>
            
            <div style={{background:'#fff',borderRadius:'24px',border:'1px solid #e2e8f0',overflow:'hidden',boxShadow:'0 10px 40px rgba(0,0,0,.03)'}}>
              <div style={{padding:'24px 32px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <h3 style={{margin:0,fontSize:'18px',color:'#0f172a'}}>Marketing</h3>
                <span style={{background:'#e0e7ff',color:'#4f46e5',padding:'4px 12px',borderRadius:'100px',fontSize:'12px',fontWeight:600}}>1 Opening</span>
              </div>
              <div style={{padding:'24px 32px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <h4 style={{fontSize:'16px',fontWeight:700,color:'#0f172a',marginBottom:'4px'}}>Product Marketing Manager</h4>
                  <p style={{fontSize:'14px',color:'#64748b',margin:0}}>Remote (Global) • Full-time</p>
                </div>
                <button style={{padding:'8px 20px',background:'#0f172a',color:'#fff',borderRadius:'8px',fontWeight:600,border:'none',cursor:'pointer'}}>Apply</button>
              </div>
            </div>
          </div>
`
  },
  contact: {
    name: 'ContactPage',
    content: `
          <div className="header-section">
            <span style={{color:'#7c3aed',fontWeight:700,fontSize:'13px',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'16px',display:'block'}}>Get in Touch</span>
            <h1>Contact Us</h1>
            <p className="subtitle">Have a question or need support? Our team is here to help you succeed.</p>
          </div>
          <div style={{display:'flex',gap:'48px',background:'#fff',padding:'48px',borderRadius:'24px',boxShadow:'0 10px 40px rgba(0,0,0,.03)',border:'1px solid #f1f5f9',textAlign:'left'}}>
            <div style={{flex:1}}>
              <h2 style={{fontSize:'24px',fontWeight:800,color:'#0f172a',marginBottom:'24px'}}>Send us a message</h2>
              <form style={{display:'flex',flexDirection:'column',gap:'16px'}} onSubmit={e => e.preventDefault()}>
                <div>
                  <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#475569',marginBottom:'8px'}}>Your Name</label>
                  <input type="text" placeholder="John Doe" style={{width:'100%',padding:'12px 16px',borderRadius:'8px',border:'1px solid #cbd5e1',background:'#f8fafc',outline:'none'}} />
                </div>
                <div>
                  <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#475569',marginBottom:'8px'}}>Email Address</label>
                  <input type="email" placeholder="john@example.com" style={{width:'100%',padding:'12px 16px',borderRadius:'8px',border:'1px solid #cbd5e1',background:'#f8fafc',outline:'none'}} />
                </div>
                <div>
                  <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#475569',marginBottom:'8px'}}>Message</label>
                  <textarea placeholder="How can we help?" rows={4} style={{width:'100%',padding:'12px 16px',borderRadius:'8px',border:'1px solid #cbd5e1',background:'#f8fafc',outline:'none',resize:'vertical'}}></textarea>
                </div>
                <button style={{padding:'14px',background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'#fff',borderRadius:'8px',fontWeight:600,border:'none',cursor:'pointer',marginTop:'8px',boxShadow:'0 4px 12px rgba(124,58,237,.3)'}}>Send Message</button>
              </form>
            </div>
            <div style={{width:'300px',flexShrink:0}}>
              <h3 style={{fontSize:'18px',fontWeight:700,color:'#0f172a',marginBottom:'24px'}}>Other ways to connect</h3>
              <div style={{marginBottom:'24px'}}>
                <h4 style={{fontSize:'14px',fontWeight:700,color:'#475569',marginBottom:'4px'}}>Support Email</h4>
                <p style={{color:'#7c3aed',fontSize:'15px',fontWeight:500}}>support@shopply.com</p>
              </div>
              <div style={{marginBottom:'24px'}}>
                <h4 style={{fontSize:'14px',fontWeight:700,color:'#475569',marginBottom:'4px'}}>Partnerships</h4>
                <p style={{color:'#7c3aed',fontSize:'15px',fontWeight:500}}>partners@shopply.com</p>
              </div>
              <div style={{padding:'24px',background:'#f8fafc',borderRadius:'16px',border:'1px solid #e2e8f0',marginTop:'48px'}}>
                <h4 style={{fontSize:'14px',fontWeight:700,color:'#0f172a',marginBottom:'8px'}}>Office Hours</h4>
                <p style={{color:'#64748b',fontSize:'14px',margin:0,lineHeight:1.6}}>Monday - Friday<br/>9:00 AM - 6:00 PM PST</p>
              </div>
            </div>
          </div>
`
  }
};

for (const [folder, data] of Object.entries(pages)) {
  const fileContent = layoutTop.replace('PAGE_NAME', data.name) + data.content + layoutBottom;
  const filePath = path.join('D:\\\\CODE FOR STUDENTS\\\\myproduct\\\\app', folder, 'page.tsx');
  fs.writeFileSync(filePath, fileContent);
  console.log(`Created ${filePath}`);
}
