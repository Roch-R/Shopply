"use client";

import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/PublicChrome";

export default function AboutPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", color: "#111827", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style suppressHydrationWarning>{`
        .ab-hero {
          background: #F7F7F5;
          border-bottom: 1px solid #E5E7EB;
          padding: 64px 24px;
        }
        .ab-wrap {
          max-width: 1120px;
          margin: 0 auto;
        }
        .ab-eyebrow {
          display: inline-block;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #0D6847;
          margin-bottom: 12px;
        }
        .ab-title {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: clamp(32px, 4vw, 44px);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.12;
          color: #111827;
          margin-bottom: 16px;
          max-width: 720px;
        }
        .ab-lead {
          font-size: 16.5px;
          line-height: 1.65;
          color: #4B5563;
          max-width: 680px;
        }
        .ab-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-top: 40px;
        }
        .ab-stat {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 22px 20px;
        }
        .ab-stat-num {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.025em;
          font-variant-numeric: tabular-nums;
          margin-bottom: 4px;
        }
        .ab-stat-label {
          font-size: 13px;
          color: #6B7280;
          font-weight: 500;
        }
        .ab-body {
          max-width: 1120px;
          margin: 0 auto;
          padding: 64px 24px 80px;
        }
        .ab-story {
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: 48px;
          padding-bottom: 64px;
          border-bottom: 1px solid #E5E7EB;
          margin-bottom: 64px;
        }
        .ab-story h2,
        .ab-pillars-head h2 {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 26px;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.025em;
          line-height: 1.2;
        }
        .ab-story p {
          font-size: 15px;
          line-height: 1.75;
          color: #4B5563;
          margin-bottom: 16px;
        }
        .ab-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 28px;
          margin-bottom: 64px;
        }
        .ab-card {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 26px 24px;
        }
        .ab-card-icon {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          background: #F7F7F5;
          color: #111827;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .ab-card h3 {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 8px;
        }
        .ab-card p {
          font-size: 13.5px;
          color: #4B5563;
          line-height: 1.6;
        }
        .ab-cta {
          background: #111827;
          border-radius: 16px;
          padding: 40px 44px;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
        }
        .ab-cta h2 {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .ab-cta p {
          font-size: 14px;
          color: #D1D5DB;
        }
        @media (max-width: 900px) {
          .ab-stats { grid-template-columns: repeat(2, 1fr); }
          .ab-story { grid-template-columns: 1fr; gap: 20px; }
          .ab-grid { grid-template-columns: 1fr; }
          .ab-cta { padding: 28px 24px; }
        }
      `}</style>

      <PublicHeader activePath="/about" />

      <section className="ab-hero">
        <div className="ab-wrap">
          <span className="ab-eyebrow">About Shopply</span>
          <h1 className="ab-title">Built for honest, everyday commerce across the Philippines.</h1>
          <p className="ab-lead">
            Shopply connects everyday Filipino shoppers with verified independent merchants — combining transparent peso pricing, direct buyer-seller messaging, and reliable nationwide delivery.
          </p>

          <div className="ab-stats">
            <div className="ab-stat">
              <div className="ab-stat-num">17</div>
              <div className="ab-stat-label">Regions served nationwide</div>
            </div>
            <div className="ab-stat">
              <div className="ab-stat-num">24–48h</div>
              <div className="ab-stat-label">Typical seller dispatch window</div>
            </div>
            <div className="ab-stat">
              <div className="ab-stat-num">100%</div>
              <div className="ab-stat-label">Email-verified accounts</div>
            </div>
            <div className="ab-stat">
              <div className="ab-stat-num">₱0</div>
              <div className="ab-stat-label">Monthly listing fee for sellers</div>
            </div>
          </div>
        </div>
      </section>

      <main className="ab-body">
        <section className="ab-story">
          <div>
            <span className="ab-eyebrow">Our Mission</span>
            <h2>Giving local sellers and buyers a cleaner place to trade.</h2>
          </div>
          <div>
            <p>
              Online shopping shouldn&apos;t feel cluttered, confusing, or uncertain. We started Shopply so independent stores in Metro Manila, Cebu, Davao, and across the provinces can present their products clearly without competing against noisy pop-ups or hidden fees.
            </p>
            <p>
              Every Shopply account works seamlessly for both buying and selling. Shoppers can check real variant stock, ask sellers questions directly in real-time chat, and confirm parcel receipt when an order arrives. Sellers get straightforward tools for inventory, discounts, order fulfillment, and customer reviews.
            </p>
          </div>
        </section>

        <section>
          <div className="ab-pillars-head">
            <span className="ab-eyebrow">How We Operate</span>
            <h2>Core marketplace standards</h2>
          </div>

          <div className="ab-grid">
            <div className="ab-card">
              <div className="ab-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3>Verified accounts</h3>
              <p>Every shopper and seller completes email verification, keeping conversations and orders accountable.</p>
            </div>

            <div className="ab-card">
              <div className="ab-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <h3>Nationwide delivery &amp; COD</h3>
              <p>Support for Cash on Delivery, e-wallets, and local meetup coordination across Luzon, Visayas, and Mindanao.</p>
            </div>

            <div className="ab-card">
              <div className="ab-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3>Direct merchant chat</h3>
              <p>Built-in messaging lets buyers verify measurements, availability, and dispatch timelines directly with store owners.</p>
            </div>
          </div>
        </section>

        <section className="ab-cta">
          <div>
            <h2>Join Shopply Philippines</h2>
            <p>Sign in to shop verified listings or open your own seller store in minutes.</p>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link
              href="/register"
              style={{
                background: "#FFFFFF",
                color: "#111827",
                padding: "11px 20px",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              Create account
            </Link>
            <Link
              href="/contact"
              style={{
                background: "transparent",
                color: "#FFFFFF",
                border: "1px solid rgba(255,255,255,0.28)",
                padding: "11px 20px",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              Contact us
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
