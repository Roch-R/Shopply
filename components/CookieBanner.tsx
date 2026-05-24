"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if the real cookie exists
    const value = "; " + document.cookie;
    const parts = value.split("; cookie_consent=");
    const consent = parts.length === 2 ? parts.pop()?.split(";").shift() : null;
    
    if (!consent) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const setRealCookie = (value: string) => {
    const date = new Date();
    date.setTime(date.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year expiration
    document.cookie = "cookie_consent=" + value + ";expires=" + date.toUTCString() + ";path=/";
  };

  const acceptCookies = () => {
    setRealCookie("accepted");
    setShow(false);
  };

  const declineCookies = () => {
    setRealCookie("declined");
    setShow(false);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '24px',
      maxWidth: '400px',
      background: '#fff',
      padding: '24px',
      borderRadius: '20px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      border: '1px solid #f1f5f9',
      zIndex: 99999,
      fontFamily: "'Inter', sans-serif",
      animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(50px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(37, 99, 235, 0.1))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#7c3aed',
          flexShrink: 0
        }}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path>
            <path d="M8.5 8.5v.01"></path>
            <path d="M16 12.5v.01"></path>
            <path d="M12 16v.01"></path>
            <path d="M11 11v.01"></path>
            <path d="M15 17v.01"></path>
          </svg>
        </div>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '6px', letterSpacing: '-0.3px' }}>We use cookies 🍪</h3>
          <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, marginBottom: '20px' }}>
            Shopply uses cookies to improve your experience, personalize content, and analyze our traffic. 
            By continuing, you agree to our <Link href="/cookies" style={{ color: '#7c3aed', textDecoration: 'underline', fontWeight: 500 }}>Cookie Policy</Link>.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={acceptCookies}
              style={{ flex: 1, padding: '12px 16px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)', transition: 'all 0.2s' }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'none'}
            >
              Accept All
            </button>
            <button 
              onClick={declineCookies}
              style={{ flex: 1, padding: '12px 16px', background: '#fff', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
