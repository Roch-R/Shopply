"use client";

import React, { useState } from "react";
import Link from "next/link";
import SiteLockSeal from "@/components/SiteLockSeal";

export function ShopplyLogoMark({
  size = 24,
  inverted = false,
}: {
  size?: number;
  inverted?: boolean;
}) {
  const bagFill = inverted ? "#FFFFFF" : "#111827";
  const handleStroke = inverted ? "#FFFFFF" : "#111827";
  const smileStroke = inverted ? "#0D6847" : "#FFFFFF";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0, display: "block" }}
    >
      <rect x="4" y="9" width="20" height="15" rx="3.5" fill={bagFill} />
      <path
        d="M9.5 9V7.5a4.5 4.5 0 0 1 9 0V9"
        stroke={handleStroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10.5 15.2a3.5 3.5 0 0 0 7 0"
        stroke={smileStroke}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ShopplyWordmark({
  href = "/",
  inverted = false,
  className = "",
}: {
  href?: string;
  inverted?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "9px",
        textDecoration: "none",
        color: inverted ? "#FFFFFF" : "#111827",
      }}
    >
      <ShopplyLogoMark size={25} inverted={inverted} />
      <span
        style={{
          fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
          fontSize: "20px",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          color: inverted ? "#FFFFFF" : "#111827",
        }}
      >
        Shopply
      </span>
    </Link>
  );
}

interface PublicHeaderProps {
  onLoginClick?: () => void;
  activePath?: string;
}

export function PublicHeader({ onLoginClick, activePath = "" }: PublicHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: "Shop", href: "/#catalog" },
    { label: "Departments", href: "/#departments" },
    { label: "Features", href: "/features" },
    { label: "About", href: "/about" },
    { label: "Guides", href: "/guides" },
    { label: "Contact", href: "/contact" },
  ];

  const handleLogin = (e: React.MouseEvent) => {
    if (onLoginClick) {
      e.preventDefault();
      setMobileOpen(false);
      onLoginClick();
    }
  };

  return (
    <>
      <style suppressHydrationWarning>{`
        .sp-topbar {
          background: #111827;
          color: #E5E7EB;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          border-bottom: 1px solid #1F2937;
        }
        .sp-topbar-inner {
          max-width: 1240px;
          margin: 0 auto;
          padding: 8px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .sp-topbar-links {
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .sp-topbar-links a {
          color: #D1D5DB;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .sp-topbar-links a:hover {
          color: #FFFFFF;
        }
        .sp-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #E5E7EB;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .sp-header-inner {
          max-width: 1240px;
          margin: 0 auto;
          height: 68px;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .sp-nav {
          display: flex;
          align-items: center;
          gap: 28px;
        }
        .sp-nav-link {
          font-size: 14px;
          font-weight: 500;
          color: #4B5563;
          text-decoration: none;
          transition: color 0.15s ease;
          padding: 6px 0;
        }
        .sp-nav-link:hover,
        .sp-nav-link.active {
          color: #111827;
        }
        .sp-nav-link.active {
          font-weight: 600;
        }
        .sp-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sp-btn-login {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 38px;
          padding: 0 16px;
          border-radius: 8px;
          border: 1px solid #D1D5DB;
          background: #FFFFFF;
          color: #111827;
          font-size: 13.5px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .sp-btn-login:hover {
          background: #F9FAFB;
          border-color: #9CA3AF;
        }
        .sp-btn-signup {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 38px;
          padding: 0 16px;
          border-radius: 8px;
          border: 1px solid #111827;
          background: #111827;
          color: #FFFFFF;
          font-size: 13.5px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .sp-btn-signup:hover {
          background: #1F2937;
        }
        .sp-mobile-toggle {
          display: none;
          width: 38px;
          height: 38px;
          border-radius: 8px;
          border: 1px solid #E5E7EB;
          background: #FFFFFF;
          color: #111827;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .sp-mobile-drawer {
          display: none;
          background: #FFFFFF;
          border-bottom: 1px solid #E5E7EB;
          padding: 16px 24px 20px;
        }
        .sp-mobile-drawer.open {
          display: block;
        }
        .sp-mobile-links {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 16px;
        }
        .sp-mobile-links a {
          padding: 10px 8px;
          font-size: 15px;
          font-weight: 500;
          color: #111827;
          text-decoration: none;
          border-radius: 8px;
        }
        .sp-mobile-links a:hover {
          background: #F7F7F5;
        }
        .sp-mobile-btns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        @media (max-width: 900px) {
          .sp-topbar-links {
            display: none;
          }
          .sp-nav,
          .sp-actions {
            display: none;
          }
          .sp-mobile-toggle {
            display: inline-flex;
          }
          .sp-topbar-inner {
            justify-content: center;
            text-align: center;
            padding: 7px 16px;
          }
          .sp-header-inner {
            padding: 0 16px;
            height: 60px;
          }
        }
      `}</style>

      <div className="sp-topbar">
        <div className="sp-topbar-inner">
          <span>Nationwide delivery across Luzon, Visayas &amp; Mindanao · Cash on Delivery supported</span>
          <div className="sp-topbar-links">
            <Link href="/register">Sell on Shopply</Link>
            <Link href="/guides">Buyer Protection</Link>
            <Link href="/contact">Help Center</Link>
          </div>
        </div>
      </div>

      <header className="sp-header">
        <div className="sp-header-inner">
          <ShopplyWordmark href="/" className="nav-logo" />

          <nav className="sp-nav" aria-label="Primary">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sp-nav-link nav-link${activePath === item.href ? " active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="sp-actions">
            <Link href="/login" onClick={handleLogin} className="sp-btn-login">
              Log in
            </Link>
            <Link href="/register" className="sp-btn-signup">
              Create account
            </Link>
          </div>

          <button
            type="button"
            className="sp-mobile-toggle"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
        </div>

        <div className={`sp-mobile-drawer${mobileOpen ? " open" : ""}`}>
          <div className="sp-mobile-links">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="sp-mobile-btns">
            <Link href="/login" onClick={handleLogin} className="sp-btn-login">
              Log in
            </Link>
            <Link href="/register" onClick={() => setMobileOpen(false)} className="sp-btn-signup">
              Create account
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

export function PublicFooter({ onLoginClick }: { onLoginClick?: () => void }) {
  const handleLogin = (e: React.MouseEvent) => {
    if (onLoginClick) {
      e.preventDefault();
      onLoginClick();
    }
  };

  return (
    <>
      <style suppressHydrationWarning>{`
        .sp-footer {
          background: #F7F7F5;
          border-top: 1px solid #E5E7EB;
          color: #4B5563;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .sp-footer-inner {
          max-width: 1240px;
          margin: 0 auto;
          padding: 64px 24px 40px;
        }
        .sp-footer-grid {
          display: grid;
          grid-template-columns: 1.8fr repeat(4, 1fr);
          gap: 36px;
          padding-bottom: 48px;
          border-bottom: 1px solid #E5E7EB;
        }
        .sp-footer-desc {
          font-size: 13.5px;
          line-height: 1.65;
          color: #4B5563;
          margin: 14px 0 18px;
          max-width: 300px;
        }
        .sp-payment-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 18px;
        }
        .sp-pay-pill {
          font-size: 11px;
          font-weight: 600;
          color: #374151;
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 6px;
          padding: 4px 8px;
        }
        .sp-footer-col h4 {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 14px;
          letter-spacing: -0.01em;
        }
        .sp-footer-col ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .sp-footer-col a {
          font-size: 13.5px;
          color: #4B5563;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .sp-footer-col a:hover {
          color: #111827;
        }
        .sp-footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding-top: 24px;
          font-size: 12.5px;
          color: #6B7280;
          flex-wrap: wrap;
        }
        @media (max-width: 960px) {
          .sp-footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 28px;
          }
        }
        @media (max-width: 560px) {
          .sp-footer-grid {
            grid-template-columns: 1fr;
          }
          .sp-footer-inner {
            padding: 48px 16px 32px;
          }
        }
      `}</style>

      <footer className="sp-footer">
        <div className="sp-footer-inner">
          <div className="sp-footer-grid">
            <div>
              <ShopplyWordmark href="/" />
              <p className="sp-footer-desc">
                Everyday Philippine marketplace connecting verified local sellers and shoppers with transparent peso pricing and direct chat.
              </p>
              <div className="sp-payment-pills" aria-label="Supported payment and delivery methods">
                <span className="sp-pay-pill">Cash on Delivery</span>
                <span className="sp-pay-pill">GCash</span>
                <span className="sp-pay-pill">Maya</span>
                <span className="sp-pay-pill">Bank Transfer</span>
              </div>
              <SiteLockSeal size="sm" showText />
            </div>

            <div className="sp-footer-col">
              <h4>Shop</h4>
              <ul>
                <li><Link href="/#catalog">New Arrivals</Link></li>
                <li><Link href="/#departments">Electronics &amp; Audio</Link></li>
                <li><Link href="/#departments">Footwear &amp; Apparel</Link></li>
                <li><Link href="/#departments">Home &amp; Living</Link></li>
                <li><Link href="/login" onClick={handleLogin}>Sign in to Shop</Link></li>
              </ul>
            </div>

            <div className="sp-footer-col">
              <h4>Company</h4>
              <ul>
                <li><Link href="/about">About Shopply</Link></li>
                <li><Link href="/features">Platform Features</Link></li>
                <li><Link href="/careers">Careers</Link></li>
                <li><Link href="/blog">Journal &amp; Updates</Link></li>
                <li><Link href="/contact">Contact Support</Link></li>
              </ul>
            </div>

            <div className="sp-footer-col">
              <h4>Sellers &amp; Docs</h4>
              <ul>
                <li><Link href="/register">Open a Seller Store</Link></li>
                <li><Link href="/guides">Seller &amp; Buyer Guides</Link></li>
                <li><Link href="/docs">Documentation</Link></li>
                <li><Link href="/integrations">Integrations</Link></li>
                <li><Link href="/api-reference">API Reference</Link></li>
                <li><Link href="/changelog">Changelog</Link></li>
              </ul>
            </div>

            <div className="sp-footer-col">
              <h4>Legal</h4>
              <ul>
                <li><Link href="/terms">Terms of Service</Link></li>
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><Link href="/cookies">Cookie Policy</Link></li>
                <li><Link href="/legal">Legal Notice</Link></li>
              </ul>
            </div>
          </div>

          <div className="sp-footer-bottom">
            <span>© {new Date().getFullYear()} Shopply Philippines. All rights reserved.</span>
            <span>Serving Metro Manila · Cebu · Davao · Nationwide</span>
          </div>
        </div>
      </footer>
    </>
  );
}
