
"use client";
import Link from "next/link";
import { useState, FormEvent } from "react";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        throw new Error('Failed to send message');
      }

      setIsSuccess(true);
      setFormData({ name: '', email: '', message: '' });
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

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
        .contact-card{display:flex;gap:48px;background:#fff;padding:48px;border-radius:24px;box-shadow:0 10px 40px rgba(0,0,0,.03);border:1px solid #f1f5f9;text-align:left}
        .contact-info-side{width:300px;flex-shrink:0}
        @media(max-width:768px){
          .nav{padding:0 12px; gap:8px}
          .nav-logo-text{display:none}
          .nav-right{gap:8px}
          .nav-link{padding:6px 8px; font-size:12px}
          .container{padding:0 16px; margin:40px auto}
          h1{font-size:32px}
          .subtitle{font-size:15px}
          .contact-card{flex-direction:column; padding:24px; gap:32px}
          .contact-info-side{width:100%}
        }
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
            <span style={{color:'#7c3aed',fontWeight:700,fontSize:'13px',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'16px',display:'block'}}>Get in Touch</span>
            <h1>Contact Us</h1>
            <p className="subtitle">Have a question or need support? Our team is here to help you succeed.</p>
          </div>
          <div className="contact-card">
            <div style={{flex:1}}>
              <h2 style={{fontSize:'24px',fontWeight:800,color:'#0f172a',marginBottom:'24px'}}>Send us a message</h2>
              {isSuccess ? (
                <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'16px',padding:'32px',textAlign:'center'}}>
                  <div style={{width:'48px',height:'48px',borderRadius:'50%',background:'#16a34a',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <h3 style={{fontSize:'20px',fontWeight:700,color:'#166534',marginBottom:'8px'}}>Message Sent!</h3>
                  <p style={{color:'#15803d',fontSize:'15px',marginBottom:'24px'}}>Thanks for reaching out. Our team will get back to you shortly.</p>
                  <button onClick={() => setIsSuccess(false)} style={{padding:'10px 20px',background:'#fff',color:'#166534',borderRadius:'8px',fontWeight:600,border:'1px solid #bbf7d0',cursor:'pointer'}}>Send Another</button>
                </div>
              ) : (
                <form style={{display:'flex',flexDirection:'column',gap:'16px'}} onSubmit={handleSubmit}>
                  {error && <div style={{color:'#ef4444',fontSize:'14px',fontWeight:500}}>{error}</div>}
                  <div>
                    <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#475569',marginBottom:'8px'}}>Your Name</label>
                    <input type="text" placeholder="John Doe" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} style={{width:'100%',padding:'12px 16px',borderRadius:'8px',border:'1px solid #cbd5e1',background:'#f8fafc',color:'#0f172a',outline:'none'}} />
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#475569',marginBottom:'8px'}}>Email Address</label>
                    <input type="email" placeholder="john@example.com" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} style={{width:'100%',padding:'12px 16px',borderRadius:'8px',border:'1px solid #cbd5e1',background:'#f8fafc',color:'#0f172a',outline:'none'}} />
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#475569',marginBottom:'8px'}}>Message</label>
                    <textarea placeholder="How can we help?" required rows={4} value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} style={{width:'100%',padding:'12px 16px',borderRadius:'8px',border:'1px solid #cbd5e1',background:'#f8fafc',color:'#0f172a',outline:'none',resize:'vertical'}}></textarea>
                  </div>
                  <button disabled={isSubmitting} style={{padding:'14px',background:isSubmitting ? '#cbd5e1' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'#fff',borderRadius:'8px',fontWeight:600,border:'none',cursor:isSubmitting ? 'not-allowed' : 'pointer',marginTop:'8px',boxShadow:isSubmitting ? 'none' : '0 4px 12px rgba(124,58,237,.3)'}}>
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
            <div className="contact-info-side">
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

        </div>
      </div>
    </>
  );
}
