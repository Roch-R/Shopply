"use client";

import Link from "next/link";
import SiteLockSeal from "@/components/SiteLockSeal";

export default function AboutPage() {
  return (
    <>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f5f7ff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #0f172a; }
        .page { min-height: 100vh; background: linear-gradient(160deg, #f0f4ff 0%, #faf5ff 45%, #f0f9ff 100%); position: relative; overflow-x: hidden; }
        
        /* Sticky Glass Navigation */
        .nav { position: sticky; top: 0; z-index: 100; padding: 0 48px; height: 68px; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,.82); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(124,58,237,.08); box-shadow: 0 1px 20px rgba(0,0,0,.04); }
        .nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .nav-logo-text { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -.4px; }
        .nav-right { display: flex; align-items: center; gap: 16px; }
        .nav-link { font-size: 13px; font-weight: 600; color: #64748b; text-decoration: none; padding: 7px 14px; border-radius: 10px; transition: all .2s; }
        .nav-link:hover { color: #7c3aed; background: rgba(124,58,237,.06); }
        .nav-link.active { color: #7c3aed; background: rgba(124,58,237,.1); font-weight: 700; }
        .nav-btn { display: inline-flex; align-items: center; gap: 6px; background: #7c3aed; color: #fff; text-decoration: none; padding: 8px 18px; border-radius: 12px; font-size: 13px; font-weight: 700; transition: all .2s; box-shadow: 0 4px 14px rgba(124,58,237,.25); }
        .nav-btn:hover { background: #6d28d9; transform: translateY(-1px); }

        /* Container & Typography */
        .container { max-width: 1140px; margin: 0 auto; padding: 60px 24px 100px; }
        .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 999px; background: rgba(124,58,237,.08); color: #7c3aed; font-size: 12px; font-weight: 700; letter-spacing: .5px; margin-bottom: 20px; border: 1px solid rgba(124,58,237,.15); }
        h1 { font-family: 'Playfair Display', serif; font-size: 48px; font-weight: 800; color: #0f172a; line-height: 1.15; letter-spacing: -.02em; margin-bottom: 20px; }
        .hero-subtitle { font-size: 18px; color: #475569; line-height: 1.65; max-width: 760px; margin-bottom: 40px; font-weight: 400; }

        /* Key Metrics Grid */
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 56px; }
        .stat-card { background: #fff; border-radius: 18px; padding: 24px 20px; border: 1px solid #e2e8f0; text-align: center; box-shadow: 0 4px 16px rgba(15,23,42,.03); }
        .stat-number { font-size: 32px; font-weight: 800; color: #7c3aed; line-height: 1.1; margin-bottom: 6px; letter-spacing: -.5px; }
        .stat-label { font-size: 13px; font-weight: 600; color: #64748b; }

        /* Story Section */
        .story-section { background: #fff; border-radius: 24px; padding: 48px; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(15,23,42,.04); margin-bottom: 56px; }
        .section-tag { font-size: 12px; font-weight: 800; color: #7c3aed; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 10px; }
        .section-title { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 800; color: #0f172a; margin-bottom: 18px; }
        .story-p { font-size: 15px; color: #475569; line-height: 1.8; margin-bottom: 16px; }

        /* Core Pillars Grid */
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; margin-bottom: 60px; }
        .card { background: #fff; border-radius: 20px; padding: 32px; box-shadow: 0 8px 24px rgba(15,23,42,.03); border: 1px solid #e2e8f0; transition: all .3s; }
        .card:hover { transform: translateY(-4px); box-shadow: 0 16px 36px rgba(124,58,237,.08); border-color: rgba(124,58,237,.25); }
        .card-icon { width: 48px; height: 48px; border-radius: 14px; background: rgba(124,58,237,.08); color: #7c3aed; display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 18px; }
        .card h3 { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 10px; }
        .card p { font-size: 14px; color: #64748b; line-height: 1.6; }

        /* CTA Banner */
        .cta-banner { background: linear-gradient(135deg, #7c3aed 0%, #4338ca 100%); border-radius: 24px; padding: 48px 36px; color: #fff; text-align: center; margin-bottom: 60px; box-shadow: 0 16px 40px rgba(124,58,237,.25); }
        .cta-title { font-size: 28px; font-weight: 800; margin-bottom: 12px; }
        .cta-desc { font-size: 15px; opacity: .9; max-width: 600px; margin: 0 auto 28px; line-height: 1.6; }
        .cta-btns { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; }
        .btn-white { background: #fff; color: #7c3aed; padding: 12px 26px; border-radius: 12px; font-weight: 700; font-size: 14px; text-decoration: none; transition: all .2s; }
        .btn-white:hover { background: #f8fafc; transform: translateY(-1px); }
        .btn-ghost { background: rgba(255,255,255,.15); color: #fff; padding: 12px 26px; border-radius: 12px; font-weight: 700; font-size: 14px; text-decoration: none; transition: all .2s; backdrop-filter: blur(10px); }
        .btn-ghost:hover { background: rgba(255,255,255,.25); transform: translateY(-1px); }

        /* Footer */
        .footer { background: #fff; border-top: 1px solid #e2e8f0; padding: 48px 24px 28px; color: #475569; }
        .footer-grid { max-width: 1140px; margin: 0 auto; display: grid; grid-templateColumns: repeat(auto-fit, minmax(220px, 1fr)); gap: 32px; margin-bottom: 40px; }
        .footer-col h4 { fontSize: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 14px; }
        .footer-links { display: flex; flex-direction: column; gap: 8px; font-size: 13px; }
        .footer-links a { color: #64748b; text-decoration: none; transition: color .2s; }
        .footer-links a:hover { color: #7c3aed; }

        @media (max-width: 768px) {
          .nav { padding: 0 16px; }
          .nav-logo-text { font-size: 16px; }
          .container { padding: 40px 16px 60px; }
          h1 { font-size: 34px; }
          .hero-subtitle { font-size: 15px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .story-section { padding: 28px 20px; }
          .cta-banner { padding: 36px 20px; }
          .cta-title { font-size: 22px; }
        }
      `}</style>

      <div className="page">
        {/* Navigation */}
        <nav className="nav">
          <Link href="/dashboard" className="nav-logo">
            <svg width="32" height="32" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="68" width="184" height="176" rx="24" fill="none" stroke="url(#ng)" strokeWidth="14" />
              <path d="M56 70 Q56 18 100 18 Q144 18 144 70" fill="none" stroke="url(#ng)" strokeWidth="14" strokeLinecap="round" />
              <circle cx="68" cy="70" r="7" fill="#7c3aed" />
              <circle cx="132" cy="70" r="7" fill="#7c3aed" />
              <path d="M24 192 Q36 150 70 145 Q104 140 110 170 Q116 198 150 192 Q170 187 176 162" fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M161 145 L176 162 L157 175" fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="ng" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
            </svg>
            <span className="nav-logo-text">Shopply</span>
          </Link>

          <div className="nav-right">
            <Link href="/about" className="nav-link active">About</Link>
            <Link href="/shop" className="nav-link">Marketplace</Link>
            <Link href="/features" className="nav-link">Features</Link>
            <Link href="/dashboard" className="nav-btn">
              <span>Dashboard</span> →
            </Link>
          </div>
        </nav>

        {/* Main Content */}
        <main className="container">
          <div className="badge">
            <span>🇵🇭</span> Official Philippine E-Commerce Marketplace
          </div>

          <h1>About Shopply Philippines</h1>
          <p className="hero-subtitle">
            Connecting everyday Filipino consumers with verified local merchants, transparent pricing, and rapid door-to-door nationwide delivery across Luzon, Visayas, and Mindanao.
          </p>

          {/* Key Metrics */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">17</div>
              <div className="stat-label">Regions Nationwide</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">24–48h</div>
              <div className="stat-label">Fast SPX Courier Dispatch</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">100%</div>
              <div className="stat-label">Verified Merchant Network</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">₱0</div>
              <div className="stat-label">Zero Hidden Platform Fees</div>
            </div>
          </div>

          {/* Our Story */}
          <section className="story-section">
            <div className="section-tag">Our Story & Mission</div>
            <h2 className="section-title">Built for Trust, Speed, and Filipino MSMEs</h2>
            <p className="story-p">
              Shopply was built with a single goal: to make online commerce in the Philippines honest, personal, and dependable. Too many online shoppers have experienced fake items, unresponsive sellers, and unpredictable shipping.
            </p>
            <p className="story-p">
              We reimagined the marketplace from the ground up. Every seller on Shopply is identity-verified, all shipments are integrated directly with Shopply Express (SPX) couriers, and payments remain safeguarded in Shopply Buyer Escrow until you inspect your parcel.
            </p>
            <p className="story-p">
              Whether you are an artisan in Cebu, an electronics merchant in Metro Manila, or a shopper in Davao, Shopply provides enterprise-grade reliability with the warmth of local Filipino community.
            </p>
          </section>

          {/* Core Platform Pillars */}
          <div className="section-tag" style={{ textAlign: "center", marginBottom: 8 }}>Platform Guarantees</div>
          <h2 className="section-title" style={{ textAlign: "center", marginBottom: 36 }}>Why Shoppers & Sellers Choose Shopply</h2>

          <div className="grid">
            <div className="card">
              <div className="card-icon">🛡️</div>
              <h3>100% Verified Merchants</h3>
              <p>Strict identity and BIR compliance checks ensure you purchase only authentic products with legitimate receipts and warranties.</p>
            </div>

            <div className="card">
              <div className="card-icon">🚚</div>
              <h3>SPX Express Logistics</h3>
              <p>Nationwide parcel tracking with live rider telemetry, fast 24–48 hour dispatch, and doorstep Cash on Delivery (COD) service.</p>
            </div>

            <div className="card">
              <div className="card-icon">💬</div>
              <h3>Live In-App Chat</h3>
              <p>Direct real-time communication between buyers and merchants. Ask product questions, request live photos, and track inquiries instantly.</p>
            </div>

            <div className="card">
              <div className="card-icon">🔒</div>
              <h3>256-Bit SSL & Buyer Protection</h3>
              <p>Certified SiteLock malware scanning, BIR-compliant sales invoices, and escrow protection holding funds until order acceptance.</p>
            </div>

            <div className="card">
              <div className="card-icon">🔄</div>
              <h3>7-Day Hassle-Free Returns</h3>
              <p>Prompt resolution with fair buyer refund guarantees if an item arrives damaged, incomplete, or different from described.</p>
            </div>

            <div className="card">
              <div className="card-icon">🇵🇭</div>
              <h3>Supporting Local MSMEs</h3>
              <p>Empowering homegrown Philippine small businesses with low commission rates, automated inventory tracking, and seller tools.</p>
            </div>
          </div>

          {/* Call to Action */}
          <section className="cta-banner">
            <h2 className="cta-title">Ready to Experience Modern Filipino Commerce?</h2>
            <p className="cta-desc">
              Join thousands of satisfied shoppers and verified sellers across the Philippines today.
            </p>
            <div className="cta-btns">
              <Link href="/shop" className="btn-white">Browse Marketplace</Link>
              <Link href="/dashboard" className="btn-ghost">Go to Dashboard</Link>
              <Link href="/contact" className="btn-ghost">Contact Support</Link>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-grid">
            <div className="footer-col">
              <h4>Customer Care</h4>
              <div className="footer-links">
                <Link href="/guides">Help Centre & FAQs</Link>
                <Link href="/guides">How to Buy on Shopply</Link>
                <Link href="/dashboard">Track SPX Delivery</Link>
                <Link href="/terms">7-Day Free Returns</Link>
                <Link href="/contact">Shopply Guarantee & COD</Link>
              </div>
            </div>

            <div className="footer-col">
              <h4>About Shopply</h4>
              <div className="footer-links">
                <Link href="/about" style={{ color: "#7c3aed", fontWeight: 700 }}>About Shopply Philippines</Link>
                <Link href="/careers">Careers</Link>
                <Link href="/privacy">Privacy Policy</Link>
                <Link href="/terms">Terms of Service</Link>
                <Link href="/cookies">Cookie Policy</Link>
              </div>
            </div>

            <div className="footer-col">
              <h4>Payment & Logistics</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 6, background: "#f1f5f9", color: "#334155" }}>💵 Cash on Delivery</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 6, background: "#f1f5f9", color: "#0284c7" }}>GCash</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 6, background: "#f1f5f9", color: "#16a34a" }}>Maya</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 6, background: "#f1f5f9", color: "#7c3aed" }}>🚚 SPX Express</span>
              </div>
              <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
                100% Authentic Products • Secure Philippine Peso (₱) Checkout
              </p>
            </div>

            <div className="footer-col">
              <h4>Verified Security</h4>
              <div style={{ background: "#f8fafc", padding: 14, borderRadius: 14, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 10 }}>
                <SiteLockSeal size="md" showText={true} />
                <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4, borderTop: "1px solid #f1f5f9", paddingTop: 8 }}>
                  🛡️ <strong>100% Shopply Protected:</strong> Real-time malware scanning, encrypted transactions, and official BIR electronic invoicing.
                </div>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: 1140, margin: "0 auto", paddingTop: 20, borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, fontSize: 12, color: "#94a3b8" }}>
            <div>© {new Date().getFullYear()} Shopply Inc. All Rights Reserved. • Philippines' Premier E-Commerce Marketplace</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#10b981", fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
              All Systems Operational • Country: PH Philippines
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
